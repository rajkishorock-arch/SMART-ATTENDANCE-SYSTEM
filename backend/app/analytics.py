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


def build_risk_distribution(students):
    distribution = {"high": 0, "medium": 0, "low": 0, "excellent": 0}
    for student in students:
        pct = student.get("percentage", 0)
        if pct < 60:
            distribution["high"] += 1
        elif pct < 75:
            distribution["medium"] += 1
        elif pct < 90:
            distribution["low"] += 1
        else:
            distribution["excellent"] += 1
    return distribution


def build_attendance_insights(report):
    students = report.get("students", [])
    total = len(students)
    avg = round(sum(s.get("percentage", 0) for s in students) / total, 2) if total else 0.0
    at_risk = [s for s in students if s.get("percentage", 0) < AT_RISK_THRESHOLD and s.get("total_days", 0) > 0]
    no_data = [s for s in students if s.get("total_days", 0) == 0]
    top = sorted(students, key=lambda x: x.get("percentage", 0), reverse=True)[:5]
    needs_attention = sorted(at_risk, key=lambda x: x.get("percentage", 0))[:10]
    return {
        "total_students": total,
        "average_attendance": avg,
        "working_days": report.get("total_working_days", 0),
        "at_risk_count": len(at_risk),
        "no_data_count": len(no_data),
        "risk_distribution": build_risk_distribution(students),
        "top_performers": top,
        "needs_attention": needs_attention,
        "recommendations": build_recommendations(avg, len(at_risk), len(no_data)),
    }


def build_recommendations(average_attendance, at_risk_count, no_data_count):
    recommendations = []
    if average_attendance < 75:
        recommendations.append("Average attendance is below 75%; schedule mentor follow-ups for low-attendance students.")
    if at_risk_count:
        recommendations.append(f"{at_risk_count} student(s) need attention based on current attendance trends.")
    if no_data_count:
        recommendations.append(f"{no_data_count} student(s) have no attendance data in the selected scope.")
    if not recommendations:
        recommendations.append("Attendance health looks stable; continue monitoring weekly trends.")
    return recommendations


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


@router.get("/insights")
def get_attendance_insights(
    department: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Executive analytics summary with risk distribution and recommended actions."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff only")
    report = crud.get_attendance_report(
        db,
        start_date_str=start_date,
        end_date_str=end_date,
        department=department,
        institution_id=current_user.institution_id,
    )
    insights = build_attendance_insights(report)
    insights["department"] = department
    insights["date_range"] = {"start_date": start_date, "end_date": end_date}
    return insights


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
