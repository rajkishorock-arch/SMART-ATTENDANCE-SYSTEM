"""
Feature 19: Multi-Campus Support
Manage multiple campuses under one parent institution.
Cross-campus attendance transfer and unified dashboard.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta

from . import models, security, crud, schemas
from .database import get_db
from .security_utils import verify_global_master_key

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


@router.post("/create")
def create_campus(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Create a sub-campus under the current institution."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only.")

    name = payload.get("name", "").strip()
    slug = payload.get("slug", "").strip().lower()
    campus_name = payload.get("campus_name", name)
    campus_address = payload.get("campus_address", "")
    admin_email = payload.get("admin_email", "")
    admin_name = payload.get("admin_name", "Campus Admin")
    admin_password = payload.get("admin_password", "campus123")

    if not name or not slug:
        raise HTTPException(status_code=400, detail="name and slug are required.")

    # Check slug uniqueness
    existing = db.query(models.Institution).filter(models.Institution.slug == slug).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Slug '{slug}' already exists.")

    campus = models.Institution(
        name=name,
        slug=slug,
        campus_name=campus_name,
        campus_address=campus_address,
        parent_institution_id=current_user.institution_id,
        primary_color=payload.get("primary_color", "#4F46E5"),
        secondary_color=payload.get("secondary_color", "#06B6D4"),
        is_active=True,
    )
    db.add(campus)
    db.commit()
    db.refresh(campus)

    # Create admin for campus
    if admin_email:
        hashed = security.get_password_hash(admin_password)
        admin = models.User(
            institution_id=campus.id,
            name=admin_name,
            email=admin_email,
            password_hash=hashed,
            role="admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Created campus '{name}' (slug: {slug}, ID: {campus.id}) under institution {current_user.institution_id}."
        ),
        institution_id=current_user.institution_id,
    )

    return {"message": "Campus created.", "campus_id": campus.id, "slug": slug}


@router.get("/my-campuses")
def get_my_campuses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get all sub-campuses under the current institution."""
    campuses = db.query(models.Institution).filter(
        models.Institution.parent_institution_id == current_user.institution_id
    ).all()

    results = []
    for c in campuses:
        student_count = db.query(models.StudentModel).filter(
            models.StudentModel.institution_id == c.id
        ).count()
        results.append({
            "id": c.id,
            "name": c.name,
            "slug": c.slug,
            "campus_name": c.campus_name,
            "campus_address": c.campus_address,
            "is_active": c.is_active,
            "student_count": student_count,
            "created_at": c.created_at,
        })
    return {"parent_institution_id": current_user.institution_id, "campuses": results}


@router.get("/aggregate-stats")
def get_aggregate_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Aggregated attendance stats across all campuses."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only.")

    campuses = db.query(models.Institution).filter(
        models.Institution.parent_institution_id == current_user.institution_id
    ).all()

    campus_ids = [current_user.institution_id] + [c.id for c in campuses]
    today_str = datetime.now(IST).strftime("%d/%m/%Y")

    stats = []
    for cid in campus_ids:
        inst = db.query(models.Institution).filter(models.Institution.id == cid).first()
        total = db.query(models.StudentModel).filter(models.StudentModel.institution_id == cid).count()
        present_today = db.query(models.AttendanceModel).filter(
            models.AttendanceModel.institution_id == cid,
            models.AttendanceModel.date == today_str,
            models.AttendanceModel.attendance == "Present",
        ).count()
        stats.append({
            "institution_id": cid,
            "name": inst.name if inst else f"Campus {cid}",
            "slug": inst.slug if inst else "",
            "total_students": total,
            "present_today": present_today,
            "absent_today": max(0, total - present_today),
            "pct_today": round((present_today / total * 100), 1) if total > 0 else 0.0,
        })

    grand_total = sum(s["total_students"] for s in stats)
    grand_present = sum(s["present_today"] for s in stats)

    return {
        "grand_total_students": grand_total,
        "grand_present_today": grand_present,
        "campuses": stats,
    }


@router.post("/transfer-student")
def transfer_student(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Transfer a student from current institution to another campus."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only.")

    student_id = payload.get("student_id")
    target_institution_id = payload.get("target_institution_id")

    if not student_id or not target_institution_id:
        raise HTTPException(status_code=400, detail="student_id and target_institution_id required.")

    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id,
        models.StudentModel.institution_id == current_user.institution_id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    target = db.query(models.Institution).filter(
        models.Institution.id == target_institution_id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target institution not found.")

    old_inst_id = student.institution_id
    student.institution_id = target_institution_id
    db.commit()

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Transferred student '{student.name}' (Roll: {student.roll}) from institution {old_inst_id} to {target_institution_id} ({target.name})."
        ),
        institution_id=current_user.institution_id,
    )

    return {
        "message": f"Student '{student.name}' transferred to '{target.name}'.",
        "student_id": student_id,
        "new_institution_id": target_institution_id,
    }
