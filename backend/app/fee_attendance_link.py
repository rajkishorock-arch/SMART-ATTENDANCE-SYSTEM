"""
Feature 22: Fee + Attendance Link
Students with attendance below threshold are flagged.
Integrates with fee portal to show warnings and block scholarship eligibility.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()
DEFAULT_THRESHOLD = 75.0


@router.post("/scan-and-flag")
def scan_and_flag_students(
    background_tasks: BackgroundTasks,
    threshold: float = DEFAULT_THRESHOLD,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Scan all students and flag those with attendance below threshold.
    Runs in background for large institutions.
    """
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    background_tasks.add_task(
        _do_scan_and_flag, db, current_user.institution_id, threshold, department
    )
    return {"message": f"Scanning started. Students below {threshold}% will be flagged."}


def _do_scan_and_flag(db: Session, institution_id: int, threshold: float, department: Optional[str]):
    try:
        report = crud.get_attendance_report(db, department=department, institution_id=institution_id)
        flagged = 0
        resolved = 0

        for s_data in report["students"]:
            pct = s_data["percentage"]
            student_id = s_data["id"]

            existing = db.query(models.FeeAttendanceFlag).filter(
                models.FeeAttendanceFlag.student_id == student_id,
                models.FeeAttendanceFlag.institution_id == institution_id,
            ).first()

            if pct < threshold:
                if not existing:
                    flag = models.FeeAttendanceFlag(
                        institution_id=institution_id,
                        student_id=student_id,
                        attendance_percentage=pct,
                        threshold=threshold,
                        flag_type="warning" if pct >= 60 else "block",
                        is_resolved=False,
                    )
                    db.add(flag)
                    flagged += 1
                else:
                    existing.attendance_percentage = pct
                    existing.is_resolved = False
            else:
                if existing and not existing.is_resolved:
                    existing.is_resolved = True
                    existing.resolved_at = datetime.now(IST)
                    resolved += 1

        db.commit()
        print(f"[FeeLink] Flagged: {flagged}, Resolved: {resolved} for institution {institution_id}")
    except Exception as e:
        db.rollback()
        print(f"[FeeLink] Scan failed: {e}")


@router.get("/flagged")
def get_flagged_students(
    flag_type: Optional[str] = None,
    department: Optional[str] = None,
    include_resolved: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get all flagged students with attendance issues."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    query = db.query(models.FeeAttendanceFlag).filter(
        models.FeeAttendanceFlag.institution_id == current_user.institution_id
    )
    if flag_type:
        query = query.filter(models.FeeAttendanceFlag.flag_type == flag_type)
    if not include_resolved:
        query = query.filter(models.FeeAttendanceFlag.is_resolved == False)

    flags = query.order_by(models.FeeAttendanceFlag.attendance_percentage.asc()).all()

    results = []
    for f in flags:
        student = db.query(models.StudentModel).filter(
            models.StudentModel.id == f.student_id
        ).first()
        if not student:
            continue
        if department and student.dep != department:
            continue
        results.append({
            "flag_id": f.id,
            "student_id": f.student_id,
            "name": student.name,
            "roll": student.roll,
            "dep": student.dep,
            "email": student.email,
            "attendance_pct": f.attendance_percentage,
            "threshold": f.threshold,
            "flag_type": f.flag_type,
            "is_resolved": f.is_resolved,
            "flagged_at": f.flagged_at,
            "resolved_at": f.resolved_at,
        })
    return {"total_flagged": len(results), "flags": results}


@router.put("/resolve/{flag_id}")
def resolve_flag(
    flag_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Mark a fee attendance flag as resolved."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    flag = db.query(models.FeeAttendanceFlag).filter(
        models.FeeAttendanceFlag.id == flag_id,
        models.FeeAttendanceFlag.institution_id == current_user.institution_id,
    ).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found.")
    flag.is_resolved = True
    flag.resolved_at = datetime.now(IST)
    db.commit()
    return {"message": "Flag resolved."}


@router.get("/stats")
def get_flag_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Statistics for fee-attendance flags."""
    total = db.query(models.FeeAttendanceFlag).filter(
        models.FeeAttendanceFlag.institution_id == current_user.institution_id,
        models.FeeAttendanceFlag.is_resolved == False,
    ).count()
    warnings = db.query(models.FeeAttendanceFlag).filter(
        models.FeeAttendanceFlag.institution_id == current_user.institution_id,
        models.FeeAttendanceFlag.flag_type == "warning",
        models.FeeAttendanceFlag.is_resolved == False,
    ).count()
    blocked = db.query(models.FeeAttendanceFlag).filter(
        models.FeeAttendanceFlag.institution_id == current_user.institution_id,
        models.FeeAttendanceFlag.flag_type == "block",
        models.FeeAttendanceFlag.is_resolved == False,
    ).count()
    return {"total_active_flags": total, "warnings": warnings, "blocked": blocked}
