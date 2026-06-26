from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from . import models, security, crud, schemas
from .core import config
from .database import get_db
from .security_utils import verify_master_key_for_system_action

router = APIRouter()


def user_has_premium(user: models.User) -> bool:
    if user.email.strip().lower() == config.SYSTEM_OWNER_EMAIL:
        return True
    return bool(getattr(user, "premium_access", False))


@router.get("/status")
def premium_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    inst = db.query(models.Institution).filter(
        models.Institution.id == current_user.institution_id
    ).first()
    paid_plan = inst and (inst.subscription_plan or "free") != "free"
    return {
        "premium": user_has_premium(current_user) or paid_plan,
        "premium_access": user_has_premium(current_user),
        "is_owner": current_user.email.strip().lower() == config.SYSTEM_OWNER_EMAIL,
        "subscription_plan": inst.subscription_plan if inst else "free",
    }


class PremiumGrantPayload(BaseModel):
    master_password: str
    user_email: str
    grant: bool = True


@router.post("/grant")
def grant_or_revoke_premium(
    payload: PremiumGrantPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.email.strip().lower() != config.SYSTEM_OWNER_EMAIL:
        raise HTTPException(status_code=403, detail="Only the system owner can manage premium access.")

    if not verify_master_key_for_system_action(db, payload.master_password.strip(), current_user.institution_id):
        raise HTTPException(status_code=400, detail="Incorrect master password.")

    target = db.query(models.User).filter(
        models.User.email == payload.user_email.strip(),
        models.User.institution_id == current_user.institution_id,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found in your institution.")

    if target.email.strip().lower() == config.SYSTEM_OWNER_EMAIL:
        raise HTTPException(status_code=400, detail="Owner always has premium access.")

    target.premium_access = payload.grant
    db.commit()

    action = "GRANTED" if payload.grant else "REVOKED"
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Premium access {action} for {target.email}",
        ),
        institution_id=current_user.institution_id,
    )

    return {
        "status": "success",
        "message": f"Premium access {action.lower()} for {target.email}.",
        "user_email": target.email,
        "premium_access": target.premium_access,
    }


@router.get("/grants")
def list_premium_grants(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.email.strip().lower() != config.SYSTEM_OWNER_EMAIL:
        raise HTTPException(status_code=403, detail="Owner only.")

    users = db.query(models.User).filter(
        models.User.institution_id == current_user.institution_id,
        models.User.is_active == True,
    ).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "premium_access": user_has_premium(u),
            "premium_granted": bool(getattr(u, "premium_access", False)),
        }
        for u in users
    ]
