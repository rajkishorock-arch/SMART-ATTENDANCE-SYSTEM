"""
Smart 75% Attendance Planner & What-If Projection Engine (Phase 4)
Computes mathematically sound attendance recovery plans, surplus bunk allowances,
and dynamic multi-session what-if simulations.
"""
import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from . import models, schemas, security
from .database import get_db

router = APIRouter()


def _get_status(pct: float, target: float = 75.0) -> str:
    if pct >= target:
        return "SAFE"
    elif pct >= 70.0:
        return "WARNING"
    return "CRITICAL"


def _calculate_plan(attended: int, conducted: int, target_pct: float = 75.0):
    """
    Computes required classes to reach target, or bunk allowance while staying above target.
    Formulae:
      Target Ratio T = target_pct / 100.0
      If attended / conducted < T:
        (attended + x) / (conducted + x) >= T
        => x >= (T * conducted - attended) / (1 - T)
        classes_needed = ceil(max(0, (T * conducted - attended) / (1 - T)))
        bunk_allowance = 0
      If attended / conducted >= T:
        classes_needed = 0
        attended / (conducted + y) >= T
        => y <= (attended - T * conducted) / T
        bunk_allowance = floor(max(0, (attended - T * conducted) / T))
    """
    if conducted == 0:
        return {
            "percentage": 100.0,
            "status": "SAFE",
            "classes_needed": 0,
            "bunk_allowance": 0,
            "projection_attend_next_3": 100.0,
            "projection_miss_next_3": 100.0
        }

    pct = round((attended / conducted) * 100, 2)
    t = target_pct / 100.0
    status = _get_status(pct, target_pct)

    if pct < target_pct:
        denom = 1.0 - t
        if denom > 0:
            raw_needed = (t * conducted - attended) / denom
            classes_needed = math.ceil(max(0.0, raw_needed))
        else:
            classes_needed = 0
        bunk_allowance = 0
    else:
        classes_needed = 0
        if t > 0:
            raw_bunk = (attended - t * conducted) / t
            bunk_allowance = math.floor(max(0.0, raw_bunk))
        else:
            bunk_allowance = 999

    # Projections over next 3 classes
    proj_attend_3 = round(((attended + 3) / (conducted + 3)) * 100, 2)
    proj_miss_3 = round((attended / (conducted + 3)) * 100, 2)

    return {
        "percentage": pct,
        "status": status,
        "classes_needed": classes_needed,
        "bunk_allowance": bunk_allowance,
        "projection_attend_next_3": proj_attend_3,
        "projection_miss_next_3": proj_miss_3
    }


@router.get("/summary", response_model=schemas.AttendancePlannerResponse)
def get_attendance_planner_summary(
    student_id: Optional[int] = None,
    target_percentage: float = Query(75.0, ge=50.0, le=100.0),
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Generates full attendance plan for all enrolled subjects for a student.
    Students see their own plan. Staff can view any student by ID.
    """
    target_student_id = student_id if (identity.role != "student") else identity.id
    if not target_student_id:
        target_student_id = identity.id

    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == target_student_id,
        models.StudentModel.institution_id == identity.institution_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # 1. Fetch student's attendance records
    att_records = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == identity.institution_id,
        models.AttendanceModel.roll == student.roll
    ).all()

    # 2. Fetch cancelled dates from academic calendar
    cancelled_events = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.institution_id == identity.institution_id,
        models.CalendarEvent.event_type == "CLASS_CANCELLED",
        models.CalendarEvent.status == "ACTIVE"
    ).all()
    cancelled_dates = {e.start_date for e in cancelled_events}

    # 3. Group attendance by subject
    subjects_db = db.query(models.Subject).filter(
        models.Subject.institution_id == identity.institution_id
    )
    if student.dep:
        subjects_db = subjects_db.filter(models.Subject.department == student.dep)
    all_subjects = subjects_db.all()
    subject_map = {s.id: s for s in all_subjects}

    # Bucket records by subject_id
    subject_stats = {}
    overall_attended = 0
    overall_conducted = 0

    for r in att_records:
        sub_id = r.subject_id or 0
        if sub_id not in subject_stats:
            subject_stats[sub_id] = {"attended": 0, "conducted": 0}

        # Exclude cancelled sessions
        if r.attendance == "CLASS_CANCELLED" or r.date in cancelled_dates:
            continue

        subject_stats[sub_id]["conducted"] += 1
        overall_conducted += 1

        if r.attendance in ["Present", "Late", "Excused"]:
            subject_stats[sub_id]["attended"] += 1
            overall_attended += 1

    # 4. Build per-subject plans
    subject_plans: List[schemas.SubjectAttendancePlan] = []

    for sub_id, stats in subject_stats.items():
        if sub_id == 0:
            name = "General Sessions"
            code = "GEN"
            teacher_name = None
        else:
            sub = subject_map.get(sub_id)
            name = sub.name if sub else f"Subject #{sub_id}"
            code = sub.code if sub else None
            teacher = db.query(models.User).filter(models.User.id == sub.teacher_id).first() if sub and sub.teacher_id else None
            teacher_name = teacher.name if teacher else None

        plan = _calculate_plan(stats["attended"], stats["conducted"], target_percentage)

        subject_plans.append(schemas.SubjectAttendancePlan(
            subject_id=sub_id,
            subject_name=name,
            subject_code=code,
            teacher_name=teacher_name,
            total_conducted=stats["conducted"],
            total_attended=stats["attended"],
            current_percentage=plan["percentage"],
            status=plan["status"],
            target_percentage=target_percentage,
            classes_needed=plan["classes_needed"],
            bunk_allowance=plan["bunk_allowance"],
            projection_attend_next_3=plan["projection_attend_next_3"],
            projection_miss_next_3=plan["projection_miss_next_3"]
        ))

    # Overall calculation
    overall_plan = _calculate_plan(overall_attended, overall_conducted, target_percentage)

    # Contextual advice message
    if overall_plan["status"] == "SAFE":
        advice = f"Great work! Your attendance is healthy at {overall_plan['percentage']}%. You can afford to miss up to {overall_plan['bunk_allowance']} class(es) while staying safely at or above {target_percentage}%."
    elif overall_plan["status"] == "WARNING":
        advice = f"Caution! You are close to the threshold at {overall_plan['percentage']}%. Attend the next {overall_plan['classes_needed']} consecutive class(es) to get securely above {target_percentage}%."
    else:
        advice = f"Critical Alert! Attendance is currently {overall_plan['percentage']}%. You must attend the next {overall_plan['classes_needed']} consecutive class(es) without absence to recover above {target_percentage}%."

    return schemas.AttendancePlannerResponse(
        student_id=student.id,
        student_name=student.name,
        roll=student.roll,
        department=student.dep or "General",
        overall_conducted=overall_conducted,
        overall_attended=overall_attended,
        overall_percentage=overall_plan["percentage"],
        overall_status=overall_plan["status"],
        target_percentage=target_percentage,
        overall_classes_needed=overall_plan["classes_needed"],
        overall_bunk_allowance=overall_plan["bunk_allowance"],
        subjects=subject_plans,
        advice_message=advice
    )


@router.post("/what-if", response_model=schemas.WhatIfSimulationResult)
def simulate_what_if(
    payload: schemas.WhatIfSimulationRequest,
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Interactive what-if simulator:
    Forecasts future attendance standing based on user-chosen upcoming class count
    and planned attendance count.
    """
    target_student_id = student_id if (identity.role != "student") else identity.id
    if not target_student_id:
        target_student_id = identity.id

    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == target_student_id,
        models.StudentModel.institution_id == identity.institution_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Fetch attendance
    att_query = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == identity.institution_id,
        models.AttendanceModel.roll == student.roll
    )
    if payload.subject_id:
        att_query = att_query.filter(models.AttendanceModel.subject_id == payload.subject_id)
    records = att_query.all()

    conducted_before = 0
    attended_before = 0
    for r in records:
        if r.attendance == "CLASS_CANCELLED":
            continue
        conducted_before += 1
        if r.attendance in ["Present", "Late", "Excused"]:
            attended_before += 1

    current_pct = round((attended_before / conducted_before * 100), 2) if conducted_before > 0 else 100.0

    # Simulation parameters
    upcoming = max(0, payload.upcoming_classes)
    planned = min(upcoming, max(0, payload.planned_attend))

    conducted_after = conducted_before + upcoming
    attended_after = attended_before + planned
    simulated_pct = round((attended_after / conducted_after * 100), 2) if conducted_after > 0 else 100.0

    return schemas.WhatIfSimulationResult(
        current_percentage=current_pct,
        simulated_percentage=simulated_pct,
        current_status=_get_status(current_pct, payload.target_percentage),
        simulated_status=_get_status(simulated_pct, payload.target_percentage),
        target_percentage=payload.target_percentage,
        target_achieved=simulated_pct >= payload.target_percentage,
        conducted_before=conducted_before,
        conducted_after=conducted_after,
        attended_before=attended_before,
        attended_after=attended_after,
        difference_percentage=round(simulated_pct - current_pct, 2)
    )
