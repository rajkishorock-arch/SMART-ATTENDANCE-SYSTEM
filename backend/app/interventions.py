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
