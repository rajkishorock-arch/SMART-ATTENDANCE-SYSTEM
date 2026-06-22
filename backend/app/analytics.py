from datetime import datetime, timezone, timedelta
from typing import Optional, List
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from . import models, security, crud
from .database import get_db

router = APIRouter()
IST = timezone(timedelta(hours=5, minutes=30))
AT_RISK_THRESHOLD = 75.0


@router.get("/at-risk")
def get_at_risk_students(
    department: Optional[str] = None,
    threshold: float = AT_RISK_THRESHOLD,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff only")
    report = crud.get_attendance_report(
        db, department=department, institution_id=current_user.institution_id
    )
    at_risk = [s for s in report["students"] if s["percentage"] < threshold and s["total_days"] > 0]
    return {
        "threshold": threshold,
        "count": len(at_risk),
        "students": at_risk,
    }


@router.get("/predictions")
def get_attendance_predictions(
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Rule-based prediction: students likely absent next week based on trend."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff only")
    report = crud.get_attendance_report(
        db, department=department, institution_id=current_user.institution_id
    )
    predictions = []
    for s in report["students"]:
        if s["total_days"] < 3:
            continue
        rate = s["percentage"]
        risk_score = max(0, min(100, 100 - rate))
        if rate < 60:
            risk_level = "high"
        elif rate < 75:
            risk_level = "medium"
        else:
            risk_level = "low"
        predictions.append({
            "id": s["id"],
            "name": s["name"],
            "roll": s["roll"],
            "current_percentage": rate,
            "risk_score": round(risk_score, 1),
            "risk_level": risk_level,
            "predicted_absences_next_week": round((100 - rate) / 100 * 5, 1),
        })
    predictions.sort(key=lambda x: x["risk_score"], reverse=True)
    return {"predictions": predictions[:50]}


@router.get("/department/{department}")
def get_department_dashboard(
    department: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """HOD dashboard: department-scoped stats."""
    if current_user.role == "teacher" and not getattr(current_user, "is_department_head", False):
        raise HTTPException(status_code=403, detail="Department head access required")
    stats = crud.get_dashboard_stats(db, institution_id=current_user.institution_id)
    students = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id,
        models.StudentModel.dep == department,
    ).count()
    report = crud.get_attendance_report(
        db, department=department, institution_id=current_user.institution_id
    )
    avg_pct = 0.0
    if report["students"]:
        avg_pct = sum(s["percentage"] for s in report["students"]) / len(report["students"])
    return {
        "department": department,
        "total_students": students,
        "average_attendance": round(avg_pct, 2),
        "at_risk_count": len([s for s in report["students"] if s.get("low_attendance")]),
        "weekly_trends": stats.get("weekly_trends", []),
        "top_performers": sorted(report["students"], key=lambda x: x["percentage"], reverse=True)[:5],
        "needs_attention": [s for s in report["students"] if s.get("low_attendance")][:10],
    }
