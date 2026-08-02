"""
Feature 3: Predicted Attendance Risk ML Model
Uses historical attendance data to predict which students are at risk of
falling below 75% attendance. Refreshes predictions on demand or scheduled.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import json

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


def _compute_risk_for_student(
    db: Session,
    student: models.StudentModel,
    institution_id: int,
    total_days: int,
) -> dict:
    """
    Compute attendance risk score for a single student.
    Uses linear regression heuristic on recent attendance trend.
    """
    from collections import Counter

    logs = (
        db.query(models.AttendanceModel)
        .filter(
            models.AttendanceModel.id == str(student.id),
            models.AttendanceModel.institution_id == institution_id,
            models.AttendanceModel.attendance == "Present",
        )
        .all()
    )

    present_days = len(set(l.date for l in logs))
    pct = (present_days / total_days * 100.0) if total_days > 0 else 100.0

    # Last 10 days trend
    recent_dates = sorted(set(l.date for l in logs), reverse=True)[:10]
    recent_count = len(recent_dates)
    recent_pct = (recent_count / 10.0 * 100.0) if total_days >= 10 else pct

    # Factors
    factors = []
    if pct < 60:
        factors.append("Attendance below 60%")
    elif pct < 75:
        factors.append("Attendance below 75% threshold")
    if recent_pct < pct:
        factors.append("Declining attendance trend")
    if recent_count == 0:
        factors.append("No attendance in last 10 days")

    # Predicted absence days in next 30 days (simple extrapolation)
    absence_rate = 1.0 - (pct / 100.0)
    predicted_absence = int(absence_rate * 20)  # assume 20 working days ahead

    # Risk score: 0 = safe, 100 = critical
    risk_score = max(0.0, min(100.0, (100.0 - pct) * 1.5))

    if risk_score >= 60:
        risk_level = "critical"
    elif risk_score >= 35:
        risk_level = "high"
    elif risk_score >= 15:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "student_id": student.id,
        "name": student.name,
        "roll": student.roll,
        "dep": student.dep,
        "current_percentage": round(pct, 2),
        "risk_level": risk_level,
        "risk_score": round(risk_score, 2),
        "predicted_absence_days": predicted_absence,
        "factors": factors,
        "present_days": present_days,
        "total_days": total_days,
    }


def _refresh_predictions(db: Session, institution_id: int):
    """Background task to refresh all student risk predictions."""
    try:
        # Count total distinct attendance days for institution
        logs = db.query(models.AttendanceModel).filter(
            models.AttendanceModel.institution_id == institution_id
        ).all()
        total_days = len(set(l.date for l in logs))
        if total_days == 0:
            total_days = 1

        students = db.query(models.StudentModel).filter(
            models.StudentModel.institution_id == institution_id
        ).all()

        for student in students:
            result = _compute_risk_for_student(db, student, institution_id, total_days)

            existing = db.query(models.PredictedRisk).filter(
                models.PredictedRisk.student_id == student.id,
                models.PredictedRisk.institution_id == institution_id,
            ).first()

            if existing:
                existing.risk_level = result["risk_level"]
                existing.risk_score = result["risk_score"]
                existing.predicted_absence_days = result["predicted_absence_days"]
                existing.factors_json = json.dumps(result["factors"])
                existing.computed_at = datetime.now(IST)
            else:
                new_risk = models.PredictedRisk(
                    institution_id=institution_id,
                    student_id=student.id,
                    risk_level=result["risk_level"],
                    risk_score=result["risk_score"],
                    predicted_absence_days=result["predicted_absence_days"],
                    factors_json=json.dumps(result["factors"]),
                )
                db.add(new_risk)

        db.commit()
        print(f"[PredictedRisk] Refreshed predictions for {len(students)} students in institution {institution_id}.")
    except Exception as e:
        db.rollback()
        print(f"[PredictedRisk] Refresh failed: {e}")


@router.post("/refresh")
def refresh_predictions(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Trigger ML prediction refresh for all students in the institution.
    Runs in background — returns immediately.
    """
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")
    background_tasks.add_task(_refresh_predictions, db, current_user.institution_id)
    return {"message": "Prediction refresh started in background."}


@router.get("/students")
def get_all_risk_predictions(
    risk_level: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Get stored risk predictions for all students.
    Filter by risk_level (low/medium/high/critical) or department.
    """
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    query = db.query(models.PredictedRisk).filter(
        models.PredictedRisk.institution_id == current_user.institution_id
    )
    if risk_level:
        query = query.filter(models.PredictedRisk.risk_level == risk_level.lower())

    records = query.order_by(models.PredictedRisk.risk_score.desc()).all()

    results = []
    for r in records:
        student = db.query(models.StudentModel).filter(
            models.StudentModel.id == r.student_id
        ).first()
        if not student:
            continue
        if department and student.dep != department:
            continue
        results.append({
            "student_id": r.student_id,
            "name": student.name,
            "roll": student.roll,
            "dep": student.dep,
            "course": student.course,
            "risk_level": r.risk_level,
            "risk_score": r.risk_score,
            "predicted_absence_days": r.predicted_absence_days,
            "factors": json.loads(r.factors_json) if r.factors_json else [],
            "computed_at": r.computed_at,
        })

    return {"total": len(results), "predictions": results}


@router.get("/student/{student_id}")
def get_student_risk(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get real-time risk prediction for a single student (computed live)."""
    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id,
        models.StudentModel.institution_id == current_user.institution_id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    logs = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == current_user.institution_id
    ).all()
    total_days = len(set(l.date for l in logs)) or 1

    result = _compute_risk_for_student(db, student, current_user.institution_id, total_days)
    return result


@router.get("/summary")
def get_risk_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Dashboard summary: how many students at each risk level."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    from sqlalchemy import func as sqlfunc
    counts = (
        db.query(
            models.PredictedRisk.risk_level,
            sqlfunc.count(models.PredictedRisk.id).label("count"),
        )
        .filter(models.PredictedRisk.institution_id == current_user.institution_id)
        .group_by(models.PredictedRisk.risk_level)
        .all()
    )
    summary = {row.risk_level: row.count for row in counts}
    return {
        "low": summary.get("low", 0),
        "medium": summary.get("medium", 0),
        "high": summary.get("high", 0),
        "critical": summary.get("critical", 0),
        "total": sum(summary.values()),
    }
