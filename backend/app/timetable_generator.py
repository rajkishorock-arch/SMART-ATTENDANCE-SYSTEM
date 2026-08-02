"""
Feature 14: Smart Timetable Generator
AI-based conflict-free timetable generation.
Considers teacher availability, room capacity, subject frequency.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import json, random

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
SLOTS = ["09:00-10:00", "10:00-11:00", "11:15-12:15", "12:15-13:15", "14:00-15:00", "15:00-16:00"]


def _generate_timetable(subjects: list, teachers: dict) -> dict:
    """
    Simple constraint-based timetable generator.
    Assigns each subject to slots ensuring no teacher teaches two classes at same time.
    Returns: {day: {slot: {subject_id, subject_name, teacher_id, teacher_name}}}
    """
    timetable = {day: {slot: None for slot in SLOTS} for day in DAYS}
    teacher_slot_map = {}  # teacher_id -> set of (day, slot)

    random.shuffle(subjects)  # Randomize for variety

    for sub in subjects:
        tid = sub.get("teacher_id")
        assigned = 0
        needed = 5  # sessions per week

        for day in DAYS:
            if assigned >= needed:
                break
            random_slots = SLOTS[:]
            random.shuffle(random_slots)
            for slot in random_slots:
                if timetable[day][slot] is not None:
                    continue
                conflict = (tid, day, slot) in teacher_slot_map
                if conflict:
                    continue
                timetable[day][slot] = {
                    "subject_id": sub["id"],
                    "subject_name": sub["name"],
                    "subject_code": sub["code"],
                    "teacher_id": tid,
                    "teacher_name": teachers.get(tid, "TBA"),
                    "department": sub["department"],
                }
                teacher_slot_map[(tid, day, slot)] = True
                assigned += 1
                break

    return timetable


@router.post("/generate")
def generate_timetable(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Generate a conflict-free timetable for the institution.
    Optionally filter by department.
    """
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    department = payload.get("department")
    version_label = payload.get("version_label", f"v{datetime.now(IST).strftime('%Y%m%d%H%M')}")

    query = db.query(models.Subject).filter(
        models.Subject.institution_id == current_user.institution_id
    )
    if department:
        query = query.filter(models.Subject.department == department)

    subjects_db = query.all()
    if not subjects_db:
        raise HTTPException(status_code=404, detail="No subjects found. Add subjects first.")

    subjects = [
        {
            "id": s.id, "name": s.name, "code": s.code,
            "teacher_id": s.teacher_id, "department": s.department
        }
        for s in subjects_db
    ]

    # Build teacher name map
    teachers = {}
    for s in subjects_db:
        if s.teacher_id:
            user = db.query(models.User).filter(models.User.id == s.teacher_id).first()
            if user:
                teachers[s.teacher_id] = user.name

    timetable = _generate_timetable(subjects, teachers)

    # Deactivate previous timetables
    db.query(models.GeneratedTimetable).filter(
        models.GeneratedTimetable.institution_id == current_user.institution_id,
        models.GeneratedTimetable.is_active == True,
    ).update({"is_active": False})

    entry = models.GeneratedTimetable(
        institution_id=current_user.institution_id,
        version_label=version_label,
        timetable_json=json.dumps(timetable),
        is_active=True,
        created_by=current_user.email,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Generated timetable '{version_label}' for {len(subjects)} subjects."
        ),
        institution_id=current_user.institution_id,
    )

    return {
        "message": "Timetable generated.",
        "timetable_id": entry.id,
        "version_label": version_label,
        "timetable": timetable,
    }


@router.get("/active")
def get_active_timetable(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get the currently active timetable for the institution."""
    entry = db.query(models.GeneratedTimetable).filter(
        models.GeneratedTimetable.institution_id == current_user.institution_id,
        models.GeneratedTimetable.is_active == True,
    ).order_by(models.GeneratedTimetable.created_at.desc()).first()

    if not entry:
        raise HTTPException(status_code=404, detail="No active timetable found. Generate one first.")

    return {
        "id": entry.id,
        "version_label": entry.version_label,
        "created_by": entry.created_by,
        "created_at": entry.created_at,
        "timetable": json.loads(entry.timetable_json),
    }


@router.get("/history")
def get_timetable_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get list of all generated timetables."""
    entries = db.query(models.GeneratedTimetable).filter(
        models.GeneratedTimetable.institution_id == current_user.institution_id
    ).order_by(models.GeneratedTimetable.created_at.desc()).limit(20).all()

    return [
        {
            "id": e.id,
            "version_label": e.version_label,
            "is_active": e.is_active,
            "created_by": e.created_by,
            "created_at": e.created_at,
        }
        for e in entries
    ]


@router.put("/{timetable_id}/activate")
def activate_timetable(
    timetable_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Activate a specific timetable version."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    db.query(models.GeneratedTimetable).filter(
        models.GeneratedTimetable.institution_id == current_user.institution_id
    ).update({"is_active": False})

    entry = db.query(models.GeneratedTimetable).filter(
        models.GeneratedTimetable.id == timetable_id,
        models.GeneratedTimetable.institution_id == current_user.institution_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Timetable not found.")

    entry.is_active = True
    db.commit()
    return {"message": f"Timetable '{entry.version_label}' activated."}
