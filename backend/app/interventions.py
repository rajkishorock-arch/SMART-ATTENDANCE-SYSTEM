"""
Counselor & Parent Intervention System Router (Phase 8)
Automated escalation workflow for students below attendance thresholds:
- Tier 1: Academic Warning (70% <= P < 75%)
- Tier 2: Parent Notification & Counselor Alert (60% <= P < 70%)
- Tier 3: Critical Debarment Risk (P < 60%)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone

from . import models, schemas, security, crud
from .database import get_db

router = APIRouter()


def _format_intervention(item: models.AttendanceIntervention, db: Session) -> schemas.AttendanceInterventionResponse:
    student = db.query(models.StudentModel).filter(models.StudentModel.id == item.student_id).first()
    counselor = db.query(models.User).filter(models.User.id == item.counselor_id).first() if item.counselor_id else None

    return schemas.AttendanceInterventionResponse(
        id=item.id,
        institution_id=item.institution_id,
        student_id=item.student_id,
        student_name=student.name if student else "Unknown Student",
        student_roll=student.roll if student else "N/A",
        department=student.dep if student else "N/A",
        tier=item.tier,
        attendance_percentage=round(item.attendance_percentage, 1),
        status=item.status,
        counselor_id=item.counselor_id,
        counselor_name=counselor.name if counselor else None,
        notes=item.notes,
        parent_contacted_at=item.parent_contacted_at,
        meeting_date=item.meeting_date,
        created_at=item.created_at,
        resolved_at=item.resolved_at
    )


@router.get("", response_model=List[schemas.AttendanceInterventionResponse])
def list_interventions(
    tier: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """List attendance interventions filtered by tier or resolution status."""
    query = db.query(models.AttendanceIntervention).filter(
        models.AttendanceIntervention.institution_id == identity.institution_id
    )

    if tier and tier != "ALL":
        query = query.filter(models.AttendanceIntervention.tier == tier.upper())

    if status and status != "ALL":
        query = query.filter(models.AttendanceIntervention.status == status.upper())

    items = query.order_by(models.AttendanceIntervention.attendance_percentage.asc()).all()
    return [_format_intervention(i, db) for i in items]


@router.get("/summary", response_model=schemas.InterventionSummary)
def get_intervention_summary(
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Aggregate KPI counts across warning tiers."""
    all_items = db.query(models.AttendanceIntervention).filter(
        models.AttendanceIntervention.institution_id == identity.institution_id
    ).all()

    total = len(all_items)
    t1 = sum(1 for i in all_items if i.tier == "WARNING" and i.status != "RESOLVED")
    t2 = sum(1 for i in all_items if i.tier == "PARENT_ALERT" and i.status != "RESOLVED")
    t3 = sum(1 for i in all_items if i.tier == "DEBARMENT_RISK" and i.status != "RESOLVED")
    resolved = sum(1 for i in all_items if i.status == "RESOLVED")

    return schemas.InterventionSummary(
        total_interventions=total,
        tier1_warning_count=t1,
        tier2_parent_alert_count=t2,
        tier3_debarment_risk_count=t3,
        resolved_count=resolved
    )


@router.post("/evaluate")
def evaluate_campus_attendance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Evaluates attendance for all students in the institution and creates/updates
    intervention records when attendance falls below 75%.
    """
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    students = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id
    ).all()

    flagged_count = 0

    for s in students:
        # Calculate student percentage
        logs = db.query(models.AttendanceModel).filter(
            models.AttendanceModel.institution_id == current_user.institution_id,
            models.AttendanceModel.roll == s.roll
        ).all()

        conducted = len([l for l in logs if l.attendance != "CLASS_CANCELLED"])
        if conducted == 0:
            continue

        attended = len([l for l in logs if l.attendance in ["Present", "LATE"]])
        pct = (attended / conducted) * 100.0

        if pct < 75.0:
            # Determine Tier
            if pct < 60.0:
                tier = "DEBARMENT_RISK"
            elif pct < 70.0:
                tier = "PARENT_ALERT"
            else:
                tier = "WARNING"

            # Check if active intervention exists
            existing = db.query(models.AttendanceIntervention).filter(
                models.AttendanceIntervention.institution_id == current_user.institution_id,
                models.AttendanceIntervention.student_id == s.id,
                models.AttendanceIntervention.status != "RESOLVED"
            ).first()

            if existing:
                existing.tier = tier
                existing.attendance_percentage = pct
            else:
                new_intervention = models.AttendanceIntervention(
                    institution_id=current_user.institution_id,
                    student_id=s.id,
                    tier=tier,
                    attendance_percentage=pct,
                    status="TRIGGERED"
                )
                db.add(new_intervention)
            flagged_count += 1

    db.commit()
    return {"message": f"Campus scan completed. {flagged_count} student interventions flagged."}


@router.post("/{intervention_id}/notify-parent", response_model=schemas.AttendanceInterventionResponse)
def notify_parent(
    intervention_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Sends parent notification for attendance shortfall and updates record."""
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    item = db.query(models.AttendanceIntervention).filter(
        models.AttendanceIntervention.id == intervention_id,
        models.AttendanceIntervention.institution_id == current_user.institution_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Intervention not found.")

    student = db.query(models.StudentModel).filter(models.StudentModel.id == item.student_id).first()
    now_utc = datetime.now(timezone.utc)

    item.parent_contacted_at = now_utc
    if item.status == "TRIGGERED":
        item.status = "PARENT_NOTIFIED"

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            role=current_user.role,
            action=f"Dispatched parent attendance notice for {student.name if student else 'Student'} ({item.attendance_percentage}%)",
            entity_type="attendance_intervention",
            entity_id=str(item.id),
            reason=f"Attendance shortfall under {item.tier}"
        ),
        institution_id=current_user.institution_id
    )

    db.commit()
    db.refresh(item)
    return _format_intervention(item, db)


@router.post("/{intervention_id}/assign-counselor", response_model=schemas.AttendanceInterventionResponse)
def assign_counselor(
    intervention_id: int,
    payload: schemas.AssignCounselorPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Assign counselor and schedule meeting."""
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    item = db.query(models.AttendanceIntervention).filter(
        models.AttendanceIntervention.id == intervention_id,
        models.AttendanceIntervention.institution_id == current_user.institution_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Intervention not found.")

    item.counselor_id = payload.counselor_id
    if payload.meeting_date:
        item.meeting_date = payload.meeting_date
    if payload.notes:
        item.notes = payload.notes
    item.status = "COUNSELOR_MEETING_SCHEDULED"

    db.commit()
    db.refresh(item)
    return _format_intervention(item, db)


@router.post("/{intervention_id}/resolve", response_model=schemas.AttendanceInterventionResponse)
def resolve_intervention(
    intervention_id: int,
    payload: schemas.ResolveInterventionPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Mark an intervention as resolved with counseling notes."""
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    item = db.query(models.AttendanceIntervention).filter(
        models.AttendanceIntervention.id == intervention_id,
        models.AttendanceIntervention.institution_id == current_user.institution_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Intervention not found.")

    item.status = "RESOLVED"
    item.resolved_at = datetime.now(timezone.utc)
    item.notes = f"{item.notes or ''}\nResolution note: {payload.notes}".strip()

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            role=current_user.role,
            action=f"Resolved attendance intervention #{item.id}",
            entity_type="attendance_intervention",
            entity_id=str(item.id),
            reason=payload.notes
        ),
        institution_id=current_user.institution_id
    )

    db.commit()
    db.refresh(item)
    return _format_intervention(item, db)


import math
from pydantic import BaseModel

class CounselorRequestPayload(BaseModel):
    reason: Optional[str] = "Student requested attendance recovery counseling."
    preferred_date: Optional[str] = None


@router.get("/my-status")
def get_my_intervention_status(
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Returns real-time attendance intervention status, threshold analytics,
    and assigned counselor data for the authenticated student or parent.
    """
    student_id = None
    if identity.role == "student":
        student_id = identity.id
    elif identity.role == "parent":
        student_id = getattr(identity.model, "id", None)

    if not student_id:
        first_s = db.query(models.StudentModel).filter(
            models.StudentModel.institution_id == identity.institution_id
        ).first()
        if not first_s:
            return {
                "has_intervention": False,
                "attendance_percentage": 100.0,
                "tier": "GOOD_STANDING",
                "status": "NORMAL",
                "total_classes": 0,
                "attended_classes": 0,
                "needed_classes_to_75": 0,
                "buffer_classes_above_75": 0,
                "action_plan": ["No attendance data found."]
            }
        student_id = first_s.id

    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id,
        models.StudentModel.institution_id == identity.institution_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    logs = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == identity.institution_id,
        models.AttendanceModel.roll == student.roll
    ).all()

    conducted = len([l for l in logs if l.attendance != "CLASS_CANCELLED"])
    attended = len([l for l in logs if l.attendance in ["Present", "LATE"]])
    pct = round((attended / conducted * 100.0), 1) if conducted > 0 else 100.0

    if pct < 60.0:
        tier = "DEBARMENT_RISK"
    elif pct < 70.0:
        tier = "PARENT_ALERT"
    elif pct < 75.0:
        tier = "WARNING"
    else:
        tier = "GOOD_STANDING"

    needed_classes = 0
    buffer_classes = 0
    if pct < 75.0 and conducted > 0:
        needed_classes = max(1, math.ceil((0.75 * conducted - attended) / 0.25))
    elif conducted > 0:
        buffer_classes = max(0, math.floor((attended - 0.75 * conducted) / 0.75))

    intervention = db.query(models.AttendanceIntervention).filter(
        models.AttendanceIntervention.institution_id == identity.institution_id,
        models.AttendanceIntervention.student_id == student.id,
        models.AttendanceIntervention.status != "RESOLVED"
    ).order_by(models.AttendanceIntervention.id.desc()).first()

    if pct < 75.0 and not intervention and conducted > 0:
        intervention = models.AttendanceIntervention(
            institution_id=identity.institution_id,
            student_id=student.id,
            tier=tier,
            attendance_percentage=pct,
            status="TRIGGERED"
        )
        db.add(intervention)
        db.commit()
        db.refresh(intervention)

    counselor = None
    if intervention and intervention.counselor_id:
        counselor = db.query(models.User).filter(models.User.id == intervention.counselor_id).first()

    action_plan = []
    if tier == "GOOD_STANDING":
        action_plan.append("Your attendance is within the safe regulatory threshold (>= 75%).")
        if buffer_classes > 0:
            action_plan.append(f"Safe buffer: You can miss up to {buffer_classes} lecture(s) without dropping below 75%.")
        else:
            action_plan.append("Maintain consistent daily attendance to preserve your academic standing.")
    elif tier == "WARNING":
        action_plan.append(f"Crucial Recovery: Attend the next {needed_classes} consecutive classes to cross 75%.")
        action_plan.append("Verify all past attendance disputes or medical leaves with your department.")
        action_plan.append("Consult your subject teacher for syllabus alignment and make-up assignments.")
    elif tier == "PARENT_ALERT":
        action_plan.append(f"Formal Notice: Attend the next {needed_classes} consecutive classes to restore safe standing.")
        action_plan.append("Official parent notification has been generated per university bylaws.")
        action_plan.append("Schedule an academic counseling session to formulate an attendance recovery contract.")
    elif tier == "DEBARMENT_RISK":
        action_plan.append("CRITICAL: Severe risk of semester exam debarment (< 60%).")
        action_plan.append(f"Mandatory requirement: Attend at least {needed_classes} consecutive classes immediately.")
        action_plan.append("Urgent Dean/HOD counseling appointment required to review medical or extenuating appeals.")

    return {
        "student_name": student.name,
        "student_roll": student.roll,
        "department": student.dep,
        "has_intervention": pct < 75.0,
        "attendance_percentage": pct,
        "tier": tier,
        "status": intervention.status if intervention else ("GOOD_STANDING" if pct >= 75.0 else "TRIGGERED"),
        "total_classes": conducted,
        "attended_classes": attended,
        "needed_classes_to_75": needed_classes,
        "buffer_classes_above_75": buffer_classes,
        "counselor_name": counselor.name if counselor else None,
        "counselor_email": counselor.email if counselor else None,
        "meeting_date": intervention.meeting_date if intervention else None,
        "notes": intervention.notes if intervention else None,
        "intervention_id": intervention.id if intervention else None,
        "parent_contacted_at": intervention.parent_contacted_at if intervention else None,
        "action_plan": action_plan
    }


@router.post("/request-counselor")
def request_counseling_session(
    payload: CounselorRequestPayload,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Enables a student to proactively request an academic counseling meeting
    with their department counselor or teacher to recover attendance.
    """
    student_id = None
    if identity.role == "student":
        student_id = identity.id
    elif identity.role == "parent":
        student_id = getattr(identity.model, "id", None)

    if not student_id:
        raise HTTPException(status_code=400, detail="Only students or parents can request counseling.")

    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id,
        models.StudentModel.institution_id == identity.institution_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    intervention = db.query(models.AttendanceIntervention).filter(
        models.AttendanceIntervention.institution_id == identity.institution_id,
        models.AttendanceIntervention.student_id == student.id,
        models.AttendanceIntervention.status != "RESOLVED"
    ).order_by(models.AttendanceIntervention.id.desc()).first()

    logs = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == identity.institution_id,
        models.AttendanceModel.roll == student.roll
    ).all()
    conducted = len([l for l in logs if l.attendance != "CLASS_CANCELLED"])
    attended = len([l for l in logs if l.attendance in ["Present", "LATE"]])
    pct = round((attended / conducted * 100.0), 1) if conducted > 0 else 100.0

    note_text = f"Student Request ({datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}): {payload.reason or 'Assistance requested.'}"
    if payload.preferred_date:
        note_text += f" | Preferred time: {payload.preferred_date}"

    if not intervention:
        intervention = models.AttendanceIntervention(
            institution_id=identity.institution_id,
            student_id=student.id,
            tier="WARNING" if pct < 75.0 else "ACADEMIC_GUIDANCE",
            attendance_percentage=pct,
            status="COUNSELOR_REQUESTED",
            notes=note_text
        )
        db.add(intervention)
    else:
        intervention.status = "COUNSELOR_REQUESTED"
        intervention.notes = f"{intervention.notes or ''}\n{note_text}".strip()

    db.commit()
    db.refresh(intervention)

    try:
        from .notifications import create_notification
        create_notification(
            db=db,
            institution_id=identity.institution_id,
            recipient_role="teacher",
            title="Counseling Meeting Requested",
            message=f"Student {student.name} ({student.roll}) has requested an attendance counseling session. (Attendance: {pct}%).",
            category="INTERVENTION",
            action_url="/interventions"
        )
        create_notification(
            db=db,
            institution_id=identity.institution_id,
            recipient_role="admin",
            title="Counseling Meeting Requested",
            message=f"Student {student.name} ({student.roll}) requested attendance counseling.",
            category="INTERVENTION",
            action_url="/interventions"
        )
    except Exception:
        pass

    return {
        "message": "Counseling session request dispatched successfully. Your department mentors have been notified.",
        "status": "COUNSELOR_REQUESTED",
        "intervention_id": intervention.id
    }
