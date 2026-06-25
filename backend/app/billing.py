import os
import hmac
import hashlib
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
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
    inst = db.query(models.Institution).filter(
        models.Institution.id == current_user.institution_id
    ).first()
    student_count = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id
    ).count()
    plan_info = PLANS.get(inst.subscription_plan or "free", PLANS["free"])
    return {
        "plan": inst.subscription_plan,
        "status": inst.subscription_status,
        "student_count": student_count,
        "student_limit": inst.student_limit or plan_info["student_limit"],
        "plan_details": plan_info,
    }


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


# ==============================================================================
# OWNER-ONLY: Grant / Revoke Premium Access Without Payment
# ==============================================================================

from .core import config
from .security_utils import verify_master_key_for_system_action

class OwnerPremiumGrantPayload(BaseModel):
    master_password: str
    institution_id: int
    plan: Optional[str] = "enterprise"
    student_limit: Optional[int] = 10000

class OwnerPremiumRevokePayload(BaseModel):
    master_password: str
    institution_id: int


@router.post("/owner-grant-premium")
def owner_grant_premium(
    payload: OwnerPremiumGrantPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    [OWNER ONLY] Grant premium plan to any institution without payment.
    Requires master password verification. Visible only in Owner Dashboard.
    """
    if current_user.email.strip().lower() != config.SYSTEM_OWNER_EMAIL:
        raise HTTPException(
            status_code=403,
            detail=f"Only the System Owner ({config.SYSTEM_OWNER_EMAIL}) can grant premium access."
        )

    # Verify master password
    is_verified = verify_master_key_for_system_action(db, payload.master_password.strip(), current_user.institution_id)
    if not is_verified:
        raise HTTPException(
            status_code=400,
            detail="Incorrect master password. Premium grant requires master key verification."
        )

    valid_plans = list(PLANS.keys()) + ["enterprise"]
    if payload.plan not in valid_plans:
        raise HTTPException(status_code=400, detail=f"Invalid plan. Choose from: {', '.join(valid_plans)}")

    # Find the target institution
    inst = db.query(models.Institution).filter(models.Institution.id == payload.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail=f"Institution ID {payload.institution_id} not found.")

    # Grant premium plan
    inst.subscription_plan = payload.plan
    inst.subscription_status = "active"
    inst.student_limit = payload.student_limit
    db.commit()
    db.refresh(inst)

    from . import schemas
    from . import crud
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Owner granted '{payload.plan}' plan to institution '{inst.name}' (ID: {payload.institution_id}) with student limit {payload.student_limit}. No payment required."
        ),
        institution_id=current_user.institution_id
    )

    return {
        "status": "success",
        "message": f"✅ '{payload.plan}' plan granted to '{inst.name}' (ID: {payload.institution_id}). Student limit: {payload.student_limit}.",
        "institution_name": inst.name,
        "plan": payload.plan,
        "student_limit": payload.student_limit
    }


@router.post("/owner-revoke-premium")
def owner_revoke_premium(
    payload: OwnerPremiumRevokePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    [OWNER ONLY] Revoke premium plan from an institution, downgrade to free.
    Requires master password verification.
    """
    if current_user.email.strip().lower() != config.SYSTEM_OWNER_EMAIL:
        raise HTTPException(
            status_code=403,
            detail=f"Only the System Owner ({config.SYSTEM_OWNER_EMAIL}) can revoke premium access."
        )

    is_verified = verify_master_key_for_system_action(db, payload.master_password.strip(), current_user.institution_id)
    if not is_verified:
        raise HTTPException(
            status_code=400,
            detail="Incorrect master password. Premium revoke requires master key verification."
        )

    inst = db.query(models.Institution).filter(models.Institution.id == payload.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail=f"Institution ID {payload.institution_id} not found.")

    # Downgrade to free
    inst.subscription_plan = "free"
    inst.subscription_status = "active"
    inst.student_limit = PLANS["free"]["student_limit"]
    db.commit()
    db.refresh(inst)

    from . import schemas
    from . import crud
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Owner REVOKED premium from institution '{inst.name}' (ID: {payload.institution_id}). Downgraded to free plan."
        ),
        institution_id=current_user.institution_id
    )

    return {
        "status": "success",
        "message": f"⚠️ Premium access revoked from '{inst.name}'. Downgraded to free plan.",
        "institution_name": inst.name,
        "plan": "free"
    }
