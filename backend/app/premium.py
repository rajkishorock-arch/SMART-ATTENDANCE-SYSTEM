from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Body
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


def institution_has_premium(db: Session, institution_id: int) -> bool:
    """Check if an institution (as a whole) has been granted premium access."""
    inst = db.query(models.Institution).filter(models.Institution.id == institution_id).first()
    if not inst:
        return False
    # If any admin in that institution has premium_granted, consider institution premium
    # OR if the institution has a paid subscription
    if inst.subscription_plan and inst.subscription_plan not in ("free", None, ""):
        return True
    # Check if any admin in this institution was explicitly granted premium
    admin_with_premium = db.query(models.User).filter(
        models.User.institution_id == institution_id,
        models.User.role == "admin",
        models.User.premium_access == True,
    ).first()
    return admin_with_premium is not None


@router.get("/status")
def premium_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    inst = db.query(models.Institution).filter(
        models.Institution.id == current_user.institution_id
    ).first()
    paid_plan = inst and (inst.subscription_plan or "free") != "free"
    # If the institution itself has premium (any admin granted), all users get it
    inst_premium = institution_has_premium(db, current_user.institution_id)
    return {
        "premium": user_has_premium(current_user) or paid_plan or inst_premium,
        "premium_access": user_has_premium(current_user) or inst_premium,
        "is_owner": current_user.email.strip().lower() == config.SYSTEM_OWNER_EMAIL,
        "subscription_plan": inst.subscription_plan if inst else "free",
        "institution_premium": inst_premium,
    }


class PremiumGrantPayload(BaseModel):
    master_password: str
    user_email: str
    grant: bool = True


class PremiumGrantByIdPayload(BaseModel):
    """Grant premium to an admin by their email — works across ALL institutions."""
    master_password: str
    admin_email: str          # email of the admin to grant premium to
    grant: bool = True
    note: Optional[str] = None  # optional reason/note


def _can_manage_institution_premium(user: models.User) -> bool:
    if user.email.strip().lower() == config.SYSTEM_OWNER_EMAIL:
        return True
    return user.role == "admin"


@router.post("/grant")
def grant_or_revoke_premium(
    payload: PremiumGrantPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if not _can_manage_institution_premium(current_user):
        raise HTTPException(status_code=403, detail="Only admins or the system owner can manage premium access.")

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


@router.post("/grant-by-id")
def grant_premium_by_admin_email(
    payload: PremiumGrantByIdPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Grant/Revoke premium to an admin across ANY institution by their email.
    When an admin is granted premium, ALL users in their institution get premium access.
    Only callable by system owner with master password.
    """
    if current_user.email.strip().lower() != config.SYSTEM_OWNER_EMAIL:
        raise HTTPException(status_code=403, detail="Only the system owner can grant cross-institution premium.")

    if not verify_master_key_for_system_action(db, payload.master_password.strip(), current_user.institution_id):
        raise HTTPException(status_code=400, detail="Incorrect master password.")

    admin_email = payload.admin_email.strip().lower()
    if not admin_email:
        raise HTTPException(status_code=400, detail="Admin email cannot be empty.")

    # Find admin user anywhere in the system
    target_admin = db.query(models.User).filter(
        models.User.email.ilike(admin_email),
        models.User.role.in_(["admin", "teacher"]),
    ).first()

    if not target_admin:
        raise HTTPException(status_code=404, detail=f"No admin or teacher found with email: {admin_email}")

    if target_admin.email.strip().lower() == config.SYSTEM_OWNER_EMAIL:
        raise HTTPException(status_code=400, detail="Owner always has premium — no need to grant.")

    # Grant premium to the target admin
    target_admin.premium_access = payload.grant
    db.commit()

    action = "GRANTED" if payload.grant else "REVOKED"
    institution_id = target_admin.institution_id

    # Get institution name for the response
    inst = db.query(models.Institution).filter(models.Institution.id == institution_id).first()
    inst_name = inst.name if inst else f"Institution #{institution_id}"

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Cross-institution premium {action} for admin {target_admin.email} (Institution: {inst_name}). Note: {payload.note or 'N/A'}",
        ),
        institution_id=current_user.institution_id,
    )

    # Count how many users benefit (students + teachers in the institution)
    user_count = db.query(models.User).filter(
        models.User.institution_id == institution_id,
        models.User.is_active == True,
    ).count()
    student_count = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == institution_id,
    ).count() if hasattr(models, 'StudentModel') else 0

    return {
        "status": "success",
        "message": f"Premium access {action.lower()} for admin '{target_admin.email}' ({inst_name}). All {user_count} users + {student_count} students in this institution now {'have' if payload.grant else 'lost'} premium access.",
        "admin_email": target_admin.email,
        "institution_name": inst_name,
        "institution_id": institution_id,
        "users_affected": user_count + student_count,
        "premium_access": payload.grant,
    }


@router.get("/grants")
def list_premium_grants(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if not _can_manage_institution_premium(current_user):
        raise HTTPException(status_code=403, detail="Admin or owner only.")

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


@router.get("/all-grants")
def list_all_premium_grants_across_institutions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    List all admins across ALL institutions who have been manually granted premium.
    Owner-only endpoint.
    """
    if current_user.email.strip().lower() != config.SYSTEM_OWNER_EMAIL:
        raise HTTPException(status_code=403, detail="Owner only.")

    # Get all admins with premium_access == True across all institutions
    admins = db.query(models.User).filter(
        models.User.role.in_(["admin", "teacher"]),
        models.User.premium_access == True,
    ).all()

    result = []
    for a in admins:
        if a.email.strip().lower() == config.SYSTEM_OWNER_EMAIL:
            continue
        inst = db.query(models.Institution).filter(models.Institution.id == a.institution_id).first()
        user_count = db.query(models.User).filter(
            models.User.institution_id == a.institution_id,
            models.User.is_active == True,
        ).count()
        result.append({
            "id": a.id,
            "email": a.email,
            "name": a.name,
            "role": a.role,
            "institution_id": a.institution_id,
            "institution_name": inst.name if inst else f"Institution #{a.institution_id}",
            "users_in_institution": user_count,
            "premium_access": True,
        })

    return result
