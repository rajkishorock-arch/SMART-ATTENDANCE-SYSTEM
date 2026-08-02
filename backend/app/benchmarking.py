"""
Feature 21: Comparative Institution Benchmarking
Anonymously compares institution attendance metrics vs national/regional averages.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from . import models, security, crud
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()

# Simulated national benchmark data (replace with real aggregated data in production)
NATIONAL_BENCHMARKS = {
    "avg_attendance_pct": 78.5,
    "avg_streak_days": 4.2,
    "low_attendance_rate": 0.18,    # 18% students below 75%
    "avg_points_per_student": 320,
    "source": "Smart Attendance System Aggregated Data (Anonymized)",
}


@router.get("/compare")
def compare_with_benchmarks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Compare current institution metrics against national benchmarks."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    # Compute institution metrics
    report = crud.get_attendance_report(db, institution_id=current_user.institution_id)
    students = report["students"]
    total = len(students)
    if total == 0:
        raise HTTPException(status_code=400, detail="No student data available for benchmarking.")

    avg_pct = sum(s["percentage"] for s in students) / total
    low_att = sum(1 for s in students if s["low_attendance"]) / total
    avg_streak = (
        db.query(models.StudentModel)
        .filter(models.StudentModel.institution_id == current_user.institution_id)
        .with_entities(models.StudentModel.streak_days)
        .all()
    )
    avg_streak_val = sum((s[0] or 0) for s in avg_streak) / len(avg_streak) if avg_streak else 0

    def delta(mine, benchmark):
        diff = round(mine - benchmark, 2)
        status = "above" if diff > 0 else "below" if diff < 0 else "equal"
        return {"value": mine, "benchmark": benchmark, "delta": diff, "status": status}

    return {
        "institution": {
            "id": current_user.institution_id,
            "total_students": total,
        },
        "comparisons": {
            "avg_attendance_pct": delta(round(avg_pct, 2), NATIONAL_BENCHMARKS["avg_attendance_pct"]),
            "low_attendance_rate": delta(round(low_att, 4), NATIONAL_BENCHMARKS["low_attendance_rate"]),
            "avg_streak_days": delta(round(avg_streak_val, 2), NATIONAL_BENCHMARKS["avg_streak_days"]),
        },
        "benchmark_source": NATIONAL_BENCHMARKS["source"],
        "insights": _generate_insights(avg_pct, low_att, avg_streak_val),
    }


def _generate_insights(avg_pct: float, low_att_rate: float, avg_streak: float) -> list:
    insights = []
    if avg_pct < NATIONAL_BENCHMARKS["avg_attendance_pct"]:
        gap = NATIONAL_BENCHMARKS["avg_attendance_pct"] - avg_pct
        insights.append(f"Your attendance rate is {gap:.1f}% below the national average. Consider sending more reminders.")
    else:
        insights.append("Great! Your attendance rate is above the national average.")

    if low_att_rate > NATIONAL_BENCHMARKS["low_attendance_rate"]:
        pct = round(low_att_rate * 100, 1)
        insights.append(f"{pct}% of your students have low attendance — higher than the national average of {NATIONAL_BENCHMARKS['low_attendance_rate']*100:.1f}%.")

    if avg_streak < NATIONAL_BENCHMARKS["avg_streak_days"]:
        insights.append("Enable gamification streaks to improve consecutive attendance habits.")

    return insights


@router.get("/rankings")
def get_department_rankings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Rank departments by attendance percentage within the institution."""
    from sqlalchemy import func as sqlfunc

    today_str = datetime.now(IST).strftime("%d/%m/%Y")

    dept_totals = {}
    students = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id
    ).all()

    for s in students:
        if s.dep not in dept_totals:
            dept_totals[s.dep] = {"total": 0, "present": 0}
        dept_totals[s.dep]["total"] += 1

    present_logs = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == current_user.institution_id,
        models.AttendanceModel.date == today_str,
        models.AttendanceModel.attendance == "Present",
    ).all()

    for l in present_logs:
        if l.department in dept_totals:
            dept_totals[l.department]["present"] += 1

    rankings = []
    for dep, data in dept_totals.items():
        pct = round((data["present"] / data["total"] * 100), 1) if data["total"] > 0 else 0
        rankings.append({
            "department": dep,
            "total_students": data["total"],
            "present_today": data["present"],
            "attendance_pct": pct,
        })

    rankings.sort(key=lambda x: x["attendance_pct"], reverse=True)
    for i, r in enumerate(rankings):
        r["rank"] = i + 1

    return {"date": today_str, "rankings": rankings}
