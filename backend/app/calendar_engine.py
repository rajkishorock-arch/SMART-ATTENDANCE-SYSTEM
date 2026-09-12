"""
Academic Calendar Engine Router (Phase 3)
Provides calendar-aware attendance logic, class cancellation adjustments,
substitute teacher tracking, and institutional event scheduling.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from . import models, schemas, security, crud
from .database import get_db

router = APIRouter()
IST = timezone(timedelta(hours=5, minutes=30))


def _format_event(e: models.CalendarEvent, db: Session) -> schemas.CalendarEventResponse:
    subject = db.query(models.Subject).filter(models.Subject.id == e.subject_id).first() if e.subject_id else None
    teacher = db.query(models.User).filter(models.User.id == e.teacher_id).first() if e.teacher_id else None
    substitute = db.query(models.User).filter(models.User.id == e.substitute_teacher_id).first() if e.substitute_teacher_id else None

    return schemas.CalendarEventResponse(
        id=e.id,
        institution_id=e.institution_id,
        title=e.title,
        description=e.description,
        event_type=e.event_type,
        start_date=e.start_date,
        end_date=e.end_date,
        start_time=e.start_time,
        end_time=e.end_time,
        department=e.department,
        course=e.course,
        semester=e.semester,
        section=e.section,
        subject_id=e.subject_id,
        subject_name=subject.name if subject else None,
        subject_code=subject.code if subject else None,
        teacher_id=e.teacher_id,
        teacher_name=teacher.name if teacher else None,
        substitute_teacher_id=e.substitute_teacher_id,
        substitute_teacher_name=substitute.name if substitute else None,
        substitute_reason=e.substitute_reason,
        status=e.status,
        created_by=e.created_by,
        created_at=e.created_at
    )


# ── Calendar Events CRUD ───────────────────────────────────────────────────────

@router.post("/events", response_model=schemas.CalendarEventResponse)
def create_calendar_event(
    event_in: schemas.CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Create an academic calendar event (Staff only)."""
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    inst_id = current_user.institution_id

    # If teacher is creating, associate teacher_id if unassigned
    teacher_id = event_in.teacher_id
    if current_user.role == "teacher" and not teacher_id:
        teacher_id = current_user.id

    new_event = models.CalendarEvent(
        institution_id=inst_id,
        title=event_in.title,
        description=event_in.description,
        event_type=event_in.event_type.upper(),
        start_date=event_in.start_date.strip(),
        end_date=event_in.end_date.strip() if event_in.end_date else None,
        start_time=event_in.start_time,
        end_time=event_in.end_time,
        department=event_in.department,
        course=event_in.course,
        semester=event_in.semester,
        section=event_in.section,
        subject_id=event_in.subject_id,
        teacher_id=teacher_id,
        substitute_teacher_id=event_in.substitute_teacher_id,
        substitute_reason=event_in.substitute_reason,
        status=event_in.status or "ACTIVE",
        created_by=current_user.email
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            role=current_user.role,
            action=f"Created academic calendar event: '{new_event.title}' ({new_event.event_type}) on {new_event.start_date}",
            entity_type="calendar_event",
            entity_id=str(new_event.id),
            reason="Academic schedule management"
        ),
        institution_id=inst_id
    )

    return _format_event(new_event, db)


@router.get("/events", response_model=List[schemas.CalendarEventResponse])
def list_calendar_events(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    event_type: Optional[str] = None,
    department: Optional[str] = None,
    subject_id: Optional[int] = None,
    status: Optional[str] = "ACTIVE",
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """List calendar events for the active institution with optional filters."""
    query = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.institution_id == identity.institution_id
    )

    if status and status != "ALL":
        query = query.filter(models.CalendarEvent.status == status.upper())
    if event_type:
        query = query.filter(models.CalendarEvent.event_type == event_type.upper())
    if start_date:
        query = query.filter(models.CalendarEvent.start_date >= start_date.strip())
    if end_date:
        query = query.filter(models.CalendarEvent.start_date <= end_date.strip())
    if department:
        query = query.filter(models.CalendarEvent.department == department)
    if subject_id:
        query = query.filter(models.CalendarEvent.subject_id == subject_id)

    events = query.order_by(models.CalendarEvent.start_date.asc()).all()
    return [_format_event(e, db) for e in events]


@router.get("/events/{event_id}", response_model=schemas.CalendarEventResponse)
def get_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Retrieve single calendar event details."""
    event = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.id == event_id,
        models.CalendarEvent.institution_id == identity.institution_id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    return _format_event(event, db)


@router.put("/events/{event_id}", response_model=schemas.CalendarEventResponse)
def update_calendar_event(
    event_id: int,
    event_in: schemas.CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Update an existing calendar event (Staff only)."""
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    event = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.id == event_id,
        models.CalendarEvent.institution_id == current_user.institution_id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    update_data = event_in.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        if k == "event_type" and v:
            setattr(event, k, v.upper())
        else:
            setattr(event, k, v)

    db.commit()
    db.refresh(event)

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            role=current_user.role,
            action=f"Updated calendar event #{event.id} ('{event.title}')",
            entity_type="calendar_event",
            entity_id=str(event.id)
        ),
        institution_id=current_user.institution_id
    )

    return _format_event(event, db)


@router.delete("/events/{event_id}")
def delete_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Delete or cancel an academic calendar event."""
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    event = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.id == event_id,
        models.CalendarEvent.institution_id == current_user.institution_id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    title = event.title
    db.delete(event)
    db.commit()

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            role=current_user.role,
            action=f"Deleted calendar event #{event_id} ('{title}')",
            entity_type="calendar_event",
            entity_id=str(event_id)
        ),
        institution_id=current_user.institution_id
    )

    return {"message": f"Calendar event '{title}' deleted successfully."}


# ── Cancelled Class Workflow ───────────────────────────────────────────────────

@router.post("/cancel-class", response_model=schemas.CalendarEventResponse)
def cancel_class_session(
    payload: schemas.ClassCancellationPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Cancel an academic class session.
    Guarantees that students will NOT be penalized with an absence.
    Existing attendance rows on this date/subject are converted to CLASS_CANCELLED.
    """
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    subject = db.query(models.Subject).filter(
        models.Subject.id == payload.subject_id,
        models.Subject.institution_id == current_user.institution_id
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")

    clean_date = payload.date.strip()

    # 1. Create Calendar Event for Cancellation
    event = models.CalendarEvent(
        institution_id=current_user.institution_id,
        title=f"Class Cancelled: {subject.name}",
        description=f"Cancelled by {current_user.name}: {payload.reason}",
        event_type="CLASS_CANCELLED",
        start_date=clean_date,
        start_time=payload.session_time,
        department=subject.department,
        subject_id=subject.id,
        teacher_id=current_user.id,
        status="ACTIVE",
        created_by=current_user.email
    )
    db.add(event)

    # 2. Update existing attendance records for this class to CLASS_CANCELLED
    # so they do not register as absences
    db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == current_user.institution_id,
        models.AttendanceModel.subject_id == subject.id,
        models.AttendanceModel.date == clean_date
    ).update(
        {models.AttendanceModel.attendance: "CLASS_CANCELLED"},
        synchronize_session=False
    )
    db.commit()
    db.refresh(event)

    # 3. Immutable Audit Log
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            role=current_user.role,
            action=f"Marked class cancelled for '{subject.name}' ({subject.code}) on {clean_date}",
            entity_type="calendar_event",
            entity_id=str(event.id),
            previous_value="Scheduled",
            new_value="CLASS_CANCELLED",
            reason=payload.reason
        ),
        institution_id=current_user.institution_id
    )

    return _format_event(event, db)


# ── Substitute Teacher Assignment Workflow ─────────────────────────────────────

@router.post("/substitute", response_model=schemas.CalendarEventResponse)
def assign_substitute_teacher(
    payload: schemas.SubstituteTeacherPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Assign a substitute teacher for a class session.
    Tracks original teacher and substitute while preserving academic class mapping.
    """
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    subject = db.query(models.Subject).filter(
        models.Subject.id == payload.subject_id,
        models.Subject.institution_id == current_user.institution_id
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")

    substitute = db.query(models.User).filter(
        models.User.id == payload.substitute_teacher_id,
        models.User.institution_id == current_user.institution_id
    ).first()
    if not substitute:
        raise HTTPException(status_code=404, detail="Substitute teacher not found.")

    clean_date = payload.date.strip()

    # 1. Create Calendar Event
    event = models.CalendarEvent(
        institution_id=current_user.institution_id,
        title=f"Substitute: {substitute.name} for {subject.name}",
        description=f"Original teacher: {subject.teacher_id or current_user.email}. Reason: {payload.reason}",
        event_type="TEACHER_SUBSTITUTION",
        start_date=clean_date,
        department=subject.department,
        subject_id=subject.id,
        teacher_id=subject.teacher_id or current_user.id,
        substitute_teacher_id=substitute.id,
        substitute_reason=payload.reason,
        status="ACTIVE",
        created_by=current_user.email
    )
    db.add(event)

    # 2. Record in substitute_assignments for backward compatibility
    sub_record = models.SubstituteAssignment(
        institution_id=current_user.institution_id,
        original_teacher_email=current_user.email,
        substitute_email=substitute.email,
        subject_id=subject.id,
        date_str=clean_date,
        is_active=True
    )
    db.add(sub_record)
    db.commit()
    db.refresh(event)

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            role=current_user.role,
            action=f"Assigned substitute {substitute.name} for subject '{subject.name}' on {clean_date}",
            entity_type="calendar_event",
            entity_id=str(event.id),
            reason=payload.reason
        ),
        institution_id=current_user.institution_id
    )

    return _format_event(event, db)


# ── Calendar-Aware Attendance Calculation Engine ───────────────────────────────

@router.get("/attendance-metrics", response_model=schemas.CalendarAttendanceMetrics)
def get_calendar_attendance_metrics(
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Computes calendar-aware attendance statistics.
    Formula:
    Conducted Classes = Scheduled Classes - Approved Cancelled Classes
    Attendance % = (Attended Classes / Conducted Classes) * 100
    Students are never penalized for approved cancelled classes!
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

    # 1. Fetch attendance records
    att_query = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == identity.institution_id,
        models.AttendanceModel.roll == student.roll
    )
    if subject_id:
        att_query = att_query.filter(models.AttendanceModel.subject_id == subject_id)
    records = att_query.all()

    # 2. Query cancelled classes from Academic Calendar for student's department / subject
    cal_query = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.institution_id == identity.institution_id,
        models.CalendarEvent.event_type == "CLASS_CANCELLED",
        models.CalendarEvent.status == "ACTIVE"
    )
    if subject_id:
        cal_query = cal_query.filter(models.CalendarEvent.subject_id == subject_id)
    elif student.dep:
        cal_query = cal_query.filter(
            (models.CalendarEvent.department == student.dep) | (models.CalendarEvent.department == None)
        )
    cancelled_events = cal_query.all()
    cancelled_dates = {e.start_date for e in cancelled_events}

    # 3. Compute Metrics
    scheduled_count = 0
    cancelled_count = 0
    attended_count = 0

    for r in records:
        scheduled_count += 1
        # If record is explicitly marked CLASS_CANCELLED or occurs on a cancelled date
        if r.attendance == "CLASS_CANCELLED" or r.date in cancelled_dates:
            cancelled_count += 1
        elif r.attendance in ["Present", "Late", "Excused"]:
            attended_count += 1

    # Conducted classes strictly excludes cancelled classes
    conducted_count = max(0, scheduled_count - cancelled_count)
    if conducted_count > 0:
        pct = round((attended_count / conducted_count) * 100, 2)
    else:
        pct = 100.0  # If no classes were conducted, attendance remains 100%

    return schemas.CalendarAttendanceMetrics(
        scheduled_classes=scheduled_count,
        cancelled_classes=cancelled_count,
        conducted_classes=conducted_count,
        attended_classes=attended_count,
        attendance_percentage=pct,
        is_at_risk=pct < 75.0
    )
