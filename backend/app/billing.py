import os
import hmac
import hashlib
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from . import models, security
from .database import get_db

router = APIRouter()

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

PLANS = {
    "free": {"price": 0, "student_limit": 100, "label": "Free"},
    "starter": {"price": 999, "student_limit": 500, "label": "Starter"},
    "pro": {"price": 2999, "student_limit": 2000, "label": "Professional"},
    "enterprise": {"price": 9999, "student_limit": 10000, "label": "Enterprise"},
}


def get_plan(plan_name: Optional[str]) -> dict:
    return PLANS.get(plan_name or "free", PLANS["free"])


def get_effective_student_limit(inst: models.Institution) -> int:
    plan_info = get_plan(inst.subscription_plan if inst else None)
    if inst and inst.student_limit:
        return inst.student_limit
    return plan_info["student_limit"]


def get_student_usage(db: Session, institution_id: int) -> dict:
    inst = db.query(models.Institution).filter(models.Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    student_count = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == institution_id
    ).count()
    plan_info = get_plan(inst.subscription_plan)
    student_limit = get_effective_student_limit(inst)
    return {
        "plan": inst.subscription_plan or "free",
        "status": inst.subscription_status or "active",
        "student_count": student_count,
        "student_limit": student_limit,
        "remaining_students": max(0, student_limit - student_count),
        "plan_details": plan_info,
    }


def ensure_student_capacity(db: Session, institution_id: int, incoming: int = 1):
    usage = get_student_usage(db, institution_id)
    if usage["status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Institution subscription is not active. Please activate billing before adding students.",
        )
    if usage["student_count"] + incoming > usage["student_limit"]:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Student limit reached for the {usage['plan']} plan "
                f"({usage['student_count']}/{usage['student_limit']}). Upgrade the plan to add more students."
            ),
        )
    return usage


class CreateOrderRequest(BaseModel):
    plan: str = "starter"


@router.get("/plans")
def list_plans():
    return {"plans": PLANS}


@router.get("/status")
def subscription_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return get_student_usage(db, current_user.institution_id)


@router.post("/create-order")
def create_payment_order(
    payload: CreateOrderRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if payload.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")
    plan = PLANS[payload.plan]
    if plan["price"] == 0:
        inst = db.query(models.Institution).filter(
            models.Institution.id == current_user.institution_id
        ).first()
        inst.subscription_plan = "free"
        inst.student_limit = plan["student_limit"]
        db.commit()
        return {"message": "Free plan activated", "plan": "free"}

    order_id = f"order_{secrets.token_hex(8)}"
    payment = models.SubscriptionPayment(
        institution_id=current_user.institution_id,
        plan=payload.plan,
        amount=plan["price"],
        razorpay_order_id=order_id,
        status="created",
    )
    db.add(payment)
    db.commit()
    return {
        "order_id": order_id,
        "amount": plan["price"],
        "currency": "INR",
        "razorpay_key_id": RAZORPAY_KEY_ID or inst_razorpay_key(db, current_user.institution_id),
        "plan": payload.plan,
        "note": "Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for live payments",
    }


def inst_razorpay_key(db: Session, institution_id: int) -> str:
    inst = db.query(models.Institution).filter(models.Institution.id == institution_id).first()
    return (inst.razorpay_key_id if inst else None) or RAZORPAY_KEY_ID


class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str
    plan: str


@router.post("/verify")
def verify_payment(
    payload: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    secret = RAZORPAY_KEY_SECRET
    if secret:
        expected = hmac.new(
            secret.encode(),
            f"{payload.order_id}|{payload.payment_id}".encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, payload.signature):
            raise HTTPException(status_code=400, detail="Invalid payment signature")

    payment = db.query(models.SubscriptionPayment).filter(
        models.SubscriptionPayment.razorpay_order_id == payload.order_id,
        models.SubscriptionPayment.institution_id == current_user.institution_id,
    ).first()
    if payment:
        payment.status = "paid"
        payment.razorpay_payment_id = payload.payment_id

    inst = db.query(models.Institution).filter(
        models.Institution.id == current_user.institution_id
    ).first()
    plan = PLANS.get(payload.plan, PLANS["starter"])
    inst.subscription_plan = payload.plan
    inst.subscription_status = "active"
    inst.student_limit = plan["student_limit"]
    db.commit()
    return {"message": "Subscription activated", "plan": payload.plan}
