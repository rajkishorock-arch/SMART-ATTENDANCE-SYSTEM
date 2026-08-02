"""
Feature 29: Attendance Points & Rewards System
Students redeem points for canteen discounts, library priority, etc.
Admins define rewards and approve redemptions.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import json

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()

# Default rewards catalog (institution can customize)
DEFAULT_REWARDS = [
    {"id": "canteen_10", "name": "Canteen 10% Discount",    "points": 50,  "category": "food"},
    {"id": "canteen_20", "name": "Canteen 20% Discount",    "points": 100, "category": "food"},
    {"id": "library_p1", "name": "Library Priority Booking","points": 80,  "category": "academic"},
    {"id": "merch_tshirt","name": "College T-Shirt",        "points": 500, "category": "merchandise"},
    {"id": "cert_excel", "name": "Excellence Certificate",  "points": 300, "category": "academic"},
    {"id": "leave_pass",  "name": "1-Day Leave Pass",       "points": 200, "category": "privilege"},
]


@router.get("/catalog")
def get_rewards_catalog(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get available rewards for the institution."""
    return {"rewards": DEFAULT_REWARDS}


@router.post("/redeem")
def redeem_reward(
    payload: dict,
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """Student redeems points for a reward."""
    reward_id = payload.get("reward_id", "")
    reward = next((r for r in DEFAULT_REWARDS if r["id"] == reward_id), None)
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found.")

    current_points = current_student.attendance_points or 0
    if current_points < reward["points"]:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient points. You have {current_points} pts, need {reward['points']} pts."
        )

    # Deduct points
    current_student.attendance_points -= reward["points"]
    db.commit()

    # Create redemption record
    redemption = models.RewardRedemption(
        institution_id=current_student.institution_id,
        student_id=current_student.id,
        reward_name=reward["name"],
        points_spent=reward["points"],
        status="pending",
    )
    db.add(redemption)
    db.commit()
    db.refresh(redemption)

    return {
        "message": f"Redemption request submitted for '{reward['name']}'.",
        "redemption_id": redemption.id,
        "points_spent": reward["points"],
        "remaining_points": current_student.attendance_points,
        "status": "pending",
    }


@router.get("/my-redemptions")
def get_my_redemptions(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """Student views their redemption history."""
    redemptions = db.query(models.RewardRedemption).filter(
        models.RewardRedemption.student_id == current_student.id,
        models.RewardRedemption.institution_id == current_student.institution_id,
    ).order_by(models.RewardRedemption.created_at.desc()).all()

    return [
        {
            "id": r.id,
            "reward": r.reward_name,
            "points": r.points_spent,
            "status": r.status,
            "created_at": r.created_at,
        }
        for r in redemptions
    ]


@router.get("/pending-approvals")
def get_pending_redemptions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Admin views pending reward redemptions."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    redemptions = db.query(models.RewardRedemption).filter(
        models.RewardRedemption.institution_id == current_user.institution_id,
        models.RewardRedemption.status == "pending",
    ).order_by(models.RewardRedemption.created_at.asc()).all()

    results = []
    for r in redemptions:
        student = db.query(models.StudentModel).filter(
            models.StudentModel.id == r.student_id
        ).first()
        results.append({
            "id": r.id,
            "student_name": student.name if student else "Unknown",
            "roll": student.roll if student else "",
            "dep": student.dep if student else "",
            "reward": r.reward_name,
            "points": r.points_spent,
            "created_at": r.created_at,
        })
    return results


@router.put("/approve/{redemption_id}")
def approve_redemption(
    redemption_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Admin approves or rejects a reward redemption."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    new_status = payload.get("status", "approved")
    if new_status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="status must be 'approved' or 'rejected'.")

    r = db.query(models.RewardRedemption).filter(
        models.RewardRedemption.id == redemption_id,
        models.RewardRedemption.institution_id == current_user.institution_id,
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Redemption not found.")

    # If rejected, refund points
    if new_status == "rejected":
        student = db.query(models.StudentModel).filter(
            models.StudentModel.id == r.student_id
        ).first()
        if student:
            student.attendance_points = (student.attendance_points or 0) + r.points_spent

    r.status = new_status
    db.commit()

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"{new_status.capitalize()} reward redemption #{redemption_id} for '{r.reward_name}'."
        ),
        institution_id=current_user.institution_id,
    )
    return {"message": f"Redemption {new_status}.", "redemption_id": redemption_id}
