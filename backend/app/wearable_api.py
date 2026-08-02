"""
Feature 37: Wearable Integration (Smartwatch Attendance)
Students check in via smartwatch using device ID + GPS + heart rate verification.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


@router.post("/checkin")
def wearable_checkin(
    payload: dict,
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """
    Student checks in via wearable device.
    Validates device_id, GPS location (geofence), and optionally heart rate (liveness proof).
    """
    device_id = payload.get("device_id", "")
    device_type = payload.get("device_type", "smartwatch")
    latitude = payload.get("latitude")
    longitude = payload.get("longitude")
    heart_rate = payload.get("heart_rate")
    subject_id = payload.get("subject_id")

    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required.")

    # Geofence check (if enabled)
    settings = crud.get_system_settings(db, institution_id=current_student.institution_id)
    if settings.geofencing_enabled:
        if latitude is None or longitude is None:
            raise HTTPException(status_code=403, detail="Geofencing enabled. GPS coordinates required.")
        from .security_utils import verify_geofence
        in_fence = verify_geofence(
            latitude, longitude,
            settings.center_latitude, settings.center_longitude,
            settings.allowed_radius_meters
        )
        if not in_fence:
            raise HTTPException(status_code=403, detail="You are outside campus boundaries.")

    # Heart rate liveness check (must be 60-120 bpm = normal alive human)
    verified = True
    if heart_rate is not None:
        if not (50 <= int(heart_rate) <= 130):
            verified = False
            raise HTTPException(status_code=403, detail=f"Abnormal heart rate ({heart_rate} bpm). Check-in rejected.")

    # Log wearable check-in
    checkin = models.WearableCheckIn(
        institution_id=current_student.institution_id,
        student_id=current_student.id,
        device_id=device_id,
        device_type=device_type,
        heart_rate=heart_rate,
        latitude=latitude,
        longitude=longitude,
        subject_id=subject_id,
        verified=verified,
    )
    db.add(checkin)
    db.commit()

    # Mark attendance
    db_att, newly_marked = crud.mark_student_attendance(
        db,
        student_id=current_student.id,
        name=current_student.name,
        roll=current_student.roll or "",
        dep=current_student.dep or "",
        subject_id=subject_id,
        institution_id=current_student.institution_id,
    )

    return {
        "message": "Wearable check-in successful." if newly_marked else "Already marked today.",
        "newly_marked": newly_marked,
        "device_id": device_id,
        "device_type": device_type,
        "heart_rate": heart_rate,
        "verified": verified,
        "student_name": current_student.name,
        "roll": current_student.roll,
    }


@router.get("/my-checkins")
def get_my_wearable_checkins(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """Student views their wearable check-in history."""
    checkins = db.query(models.WearableCheckIn).filter(
        models.WearableCheckIn.student_id == current_student.id,
        models.WearableCheckIn.institution_id == current_student.institution_id,
    ).order_by(models.WearableCheckIn.created_at.desc()).limit(limit).all()

    return [
        {
            "device_type": c.device_type,
            "heart_rate": c.heart_rate,
            "verified": c.verified,
            "created_at": c.created_at,
        }
        for c in checkins
    ]


@router.get("/logs")
def get_wearable_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Admin views all wearable check-ins."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    checkins = db.query(models.WearableCheckIn).filter(
        models.WearableCheckIn.institution_id == current_user.institution_id
    ).order_by(models.WearableCheckIn.created_at.desc()).limit(limit).all()

    results = []
    for c in checkins:
        s = db.query(models.StudentModel).filter(models.StudentModel.id == c.student_id).first()
        results.append({
            "id": c.id,
            "student_name": s.name if s else "Unknown",
            "roll": s.roll if s else "",
            "device_id": c.device_id,
            "device_type": c.device_type,
            "heart_rate": c.heart_rate,
            "verified": c.verified,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "created_at": c.created_at,
        })
    return results
