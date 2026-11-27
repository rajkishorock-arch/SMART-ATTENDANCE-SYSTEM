"""
Academic Calendar Engine Router (Phase 3)
Provides calendar-aware attendance logic, class cancellation adjustments,
substitute teacher tracking, and institutional event scheduling.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from . import models, schemas, security, crud, cache_service
from .database import get_db
from .period_utils import normalize_date_str

router = APIRouter()
IST = timezone(timedelta(hours=5, minutes=30))


def _invalidate_calendar_caches(inst_id: Optional[int]):
    if not inst_id:
        return
    try:
        cache_service.cache_delete_pattern(f"stats:inst_{inst_id}")
        cache_service.cache_delete_pattern(f"sessions:inst_{inst_id}")
        cache_service.cache_delete_pattern(f"logs:inst_{inst_id}")
        cache_service.cache_delete_pattern(f"report:inst_{inst_id}")
    except Exception:
        pass


def _parse_flexible_event_date(date_str: Optional[str]):
    if not date_str:
        return None
    s = str(date_str).strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def _date_variants(date_str: Optional[str]) -> set:
    if not date_str:
        return set()
    clean = str(date_str).strip()
    norm = normalize_date_str(clean)
    variants = {clean, norm}
    parsed = _parse_flexible_event_date(clean)
    if parsed:
        variants.add(parsed.strftime("%d/%m/%Y"))
        variants.add(parsed.strftime("%Y-%m-%d"))
    return {v for v in variants if v}


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

    inst_id = current_user.institution_id or 1

    # If teacher is creating, associate teacher_id if unassigned
    teacher_id = event_in.teacher_id
    if current_user.role == "teacher" and not teacher_id:
        teacher_id = current_user.id

    new_event = models.CalendarEvent(
        institution_id=inst_id,
        title=event_in.title,
        description=event_in.description,
        event_type=event_in.event_type.upper(),
        start_date=normalize_date_str(event_in.start_date.strip()),
        end_date=normalize_date_str(event_in.end_date.strip()) if event_in.end_date else None,
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

    # Real-time Broadcast: Notify all students and parents in this institution only if the event is today or tomorrow!
    # Future events (> 1 day away) live in the Academic Calendar and should not trigger premature real-time alerts.
    try:
        from .notifications import create_notification
        today = datetime.now().date()
        evt_date = _parse_flexible_event_date(new_event.start_date)

        should_notify = False
        prefix = ""
        if evt_date:
            diff_days = (evt_date - today).days
            if diff_days == 0:
                should_notify = True
                prefix = "Today's Notice: "
            elif diff_days == 1:
                should_notify = True
                prefix = "Tomorrow's Notice: "
            else:
                # Event is scheduled for a future day (> 1 day away) or in the past: do not dispatch premature notification!
                should_notify = False
        else:
            should_notify = True
            prefix = "Academic Notice: "

        if should_notify:
            event_label = "Holiday" if new_event.event_type in ["HOLIDAY", "INSTITUTION_CLOSED"] else (
                "Exam Session" if new_event.event_type == "EXAM" else new_event.event_type.replace('_', ' ').title()
            )
            notif_title = f"{prefix}{event_label} - {new_event.title} ({new_event.start_date})"
            notif_msg = new_event.description or f"Official academic notice for {new_event.start_date}."
            create_notification(
                db=db,
                institution_id=inst_id,
                recipient_role="student",
                title=notif_title,
                message=notif_msg,
                category="ACADEMIC_CALENDAR",
                action_url="/#/calendar"
            )
            create_notification(
                db=db,
                institution_id=inst_id,
                recipient_role="parent",
                title=notif_title,
                message=notif_msg,
                category="ACADEMIC_CALENDAR",
                action_url="/#/calendar"
            )
    except Exception as notif_err:
        pass

    _invalidate_calendar_caches(inst_id)
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
    inst_id = identity.institution_id or 1

    query = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.institution_id == inst_id
    )

    if status and status != "ALL":
        query = query.filter(models.CalendarEvent.status == status.upper())
    if event_type and event_type != "ALL":
        up = event_type.upper()
        if up in ("SUBSTITUTE_CLASS", "TEACHER_SUBSTITUTION"):
            query = query.filter(models.CalendarEvent.event_type.in_(["SUBSTITUTE_CLASS", "TEACHER_SUBSTITUTION"]))
        else:
            query = query.filter(models.CalendarEvent.event_type == up)
    if department:
        query = query.filter(
            (models.CalendarEvent.department == department) | 
            (models.CalendarEvent.department == None) | 
            (models.CalendarEvent.department == "")
        )
    if subject_id:
        query = query.filter(models.CalendarEvent.subject_id == subject_id)

    events = query.order_by(models.CalendarEvent.id.desc()).all()
    return [_format_event(e, db) for e in events]


@router.get("/events/{event_id}", response_model=schemas.CalendarEventResponse)
def get_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Retrieve single calendar event details."""
    inst_ids = {1}
    if identity.institution_id:
        inst_ids.add(identity.institution_id)
    if not identity.institution_id or identity.institution_id == 1:
        try:
            active_ids = [r[0] for r in db.query(models.Institution.id).filter(models.Institution.is_active == True).all()]
            inst_ids.update(active_ids)
        except Exception:
            pass

    event = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.id == event_id,
        models.CalendarEvent.institution_id.in_(list(inst_ids))
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

    inst_ids = {1}
    if current_user.institution_id:
        inst_ids.add(current_user.institution_id)
    if not current_user.institution_id or current_user.institution_id == 1:
        try:
            active_ids = [r[0] for r in db.query(models.Institution.id).filter(models.Institution.is_active == True).all()]
            inst_ids.update(active_ids)
        except Exception:
            pass

    event = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.id == event_id,
        models.CalendarEvent.institution_id.in_(list(inst_ids))
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    update_data = event_in.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        if k == "event_type" and v:
            setattr(event, k, v.upper())
        elif k in ["start_date", "end_date"] and v:
            setattr(event, k, normalize_date_str(v.strip()))
        else:
            setattr(event, k, v)

    db.commit()
    db.refresh(event)
    _invalidate_calendar_caches(event.institution_id)

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            role=current_user.role,
            action=f"Updated calendar event #{event.id} ('{event.title}')",
            entity_type="calendar_event",
            entity_id=str(event.id)
        ),
        institution_id=event.institution_id
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
        models.CalendarEvent.institution_id == (current_user.institution_id or 1)
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")
    if (
        current_user.role == "teacher"
        and event.teacher_id
        and event.teacher_id != current_user.id
        and event.substitute_teacher_id != current_user.id
        and event.created_by != current_user.email
    ):
        raise HTTPException(status_code=403, detail="You can only delete events you created or manage.")

    title = event.title
    inst_id = event.institution_id
    if event.event_type in ("TEACHER_SUBSTITUTION", "SUBSTITUTE_CLASS") and event.subject_id:
        sub_q = db.query(models.SubstituteAssignment).filter(
            models.SubstituteAssignment.institution_id == inst_id,
            models.SubstituteAssignment.subject_id == event.subject_id,
            models.SubstituteAssignment.is_active == True,
        )
        variants = _date_variants(event.start_date)
        if variants:
            sub_q = sub_q.filter(models.SubstituteAssignment.date_str.in_(list(variants)))
        sub_q.update({models.SubstituteAssignment.is_active: False}, synchronize_session=False)

    db.delete(event)
    db.commit()
    _invalidate_calendar_caches(inst_id)

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            role=current_user.role,
            action=f"Deleted calendar event #{event_id} ('{title}')",
            entity_type="calendar_event",
            entity_id=str(event_id)
        ),
        institution_id=event.institution_id
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

    clean_date = normalize_date_str(payload.date.strip())
    if current_user.role == "teacher" and not crud.teacher_can_access_subject(db, current_user, subject, target_date=clean_date):
        raise HTTPException(status_code=403, detail="Unauthorized: You can only cancel sessions for your assigned subject.")

    date_opts = list(_date_variants(payload.date) | _date_variants(clean_date))

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
        models.AttendanceModel.date.in_(date_opts)
    ).update(
        {models.AttendanceModel.attendance: "CLASS_CANCELLED"},
        synchronize_session=False
    )
    db.commit()
    db.refresh(event)
    _invalidate_calendar_caches(current_user.institution_id)

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

    # Real-time Broadcast: Notify all students and parents about class cancellation
    try:
        from .notifications import create_notification
        cancel_title = f"🚫 Class Cancelled: {subject.name} ({clean_date})"
        cancel_msg = f"Session at {payload.session_time} was cancelled by {current_user.name}. Reason: {payload.reason or 'Faculty schedule update'}. Attendance is automatically safeguarded."
        create_notification(
            db=db,
            institution_id=current_user.institution_id,
            recipient_role="student",
            title=cancel_title,
            message=cancel_msg,
            category="ACADEMIC_CALENDAR",
            action_url="/#/calendar"
        )
        create_notification(
            db=db,
            institution_id=current_user.institution_id,
            recipient_role="parent",
            title=cancel_title,
            message=cancel_msg,
            category="ACADEMIC_CALENDAR",
            action_url="/#/calendar"
        )

        # Broadcast WhatsApp alert to enrolled parents and students
        from .notification_service import send_whatsapp
        target_students = db.query(models.StudentModel).filter(
            models.StudentModel.institution_id == current_user.institution_id
        ).limit(50).all()
        for s in target_students:
            dest_phone = s.parent_phone or s.phone
            if dest_phone:
                wa_text = f"📢 *Class Cancellation - {subject.name}*\nDear Parent/Student, lecture on {clean_date} ({payload.session_time}) has been cancelled by Prof. {current_user.name}.\nReason: {payload.reason or 'Faculty schedule update'}.\n✅ Attendance is safely protected."
                send_whatsapp(dest_phone, wa_text)
    except Exception:
        pass

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

    clean_date = normalize_date_str(payload.date.strip())
    if current_user.role == "teacher" and not crud.teacher_can_access_subject(db, current_user, subject, target_date=clean_date):
        raise HTTPException(status_code=403, detail="Unauthorized: You can only delegate subjects assigned to your account.")

    # Deactivate any prior active substitution on same subject & date so latest delegation wins cleanly
    db.query(models.SubstituteAssignment).filter(
        models.SubstituteAssignment.institution_id == current_user.institution_id,
        models.SubstituteAssignment.subject_id == subject.id,
        models.SubstituteAssignment.date_str.in_(list(_date_variants(clean_date))),
        models.SubstituteAssignment.is_active == True,
    ).update({models.SubstituteAssignment.is_active: False}, synchronize_session=False)

    # 1. Create Calendar Event
    event = models.CalendarEvent(
        institution_id=current_user.institution_id,
        title=f"Substitute: {substitute.name} for {subject.name}",
        description=f"Assigned by {current_user.name}. Reason: {payload.reason}",
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

    # 2. Record in substitute_assignments for real-time access delegation
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

    # Notify substitute teacher and students in real time
    try:
        from .notifications import create_notification
        create_notification(
            db=db,
            institution_id=current_user.institution_id,
            recipient_role="teacher",
            recipient_id=substitute.id,
            title=f"Substitute Assignment: {subject.name} ({clean_date})",
            message=f"You have been delegated temporary attendance & class authority for {subject.name} on {clean_date}. Reason: {payload.reason}",
            category="ACADEMIC_CALENDAR",
            action_url="/#/calendar"
        )
        create_notification(
            db=db,
            institution_id=current_user.institution_id,
            recipient_role="student",
            title=f"Substitute Faculty: {subject.name} ({clean_date})",
            message=f"Prof. {substitute.name} will conduct {subject.name} on {clean_date}.",
            category="ACADEMIC_CALENDAR",
            action_url="/#/calendar"
        )
    except Exception:
        pass

    _invalidate_calendar_caches(current_user.institution_id)

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
    Computes real calendar-aware attendance statistics for Student, Teacher, or Admin.
    Conducted Classes = Scheduled Classes - Approved Cancelled Classes
    """
    inst_id = identity.institution_id or 1

    # Active students in institution (excludes deleted student orphans)
    active_students = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == inst_id
    ).all()
    active_ids = {str(s.id) for s in active_students}
    active_rolls = {str(s.roll).strip().casefold() for s in active_students if s.roll and str(s.roll).strip()}

    att_query = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == inst_id
    )
    cal_query = db.query(models.CalendarEvent).filter(
        models.CalendarEvent.institution_id == inst_id,
        models.CalendarEvent.event_type == "CLASS_CANCELLED",
        models.CalendarEvent.status == "ACTIVE"
    )

    if identity.role == "student":
        student = next((s for s in active_students if s.id == identity.id), None)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")
        att_query = att_query.filter(models.AttendanceModel.roll == student.roll)
        if subject_id:
            att_query = att_query.filter(models.AttendanceModel.subject_id == subject_id)
            cal_query = cal_query.filter(models.CalendarEvent.subject_id == subject_id)
        elif student.dep:
            cal_query = cal_query.filter(
                (models.CalendarEvent.department == student.dep) | (models.CalendarEvent.department == None) | (models.CalendarEvent.department == "")
            )
    elif student_id:
        student = next((s for s in active_students if s.id == student_id), None)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")
        att_query = att_query.filter(models.AttendanceModel.roll == student.roll)
        if subject_id:
            att_query = att_query.filter(models.AttendanceModel.subject_id == subject_id)
            cal_query = cal_query.filter(models.CalendarEvent.subject_id == subject_id)
        elif student.dep:
            cal_query = cal_query.filter(
                (models.CalendarEvent.department == student.dep) | (models.CalendarEvent.department == None) | (models.CalendarEvent.department == "")
            )
    else:
        # Admin or Teacher institutional / subject aggregate
        if identity.role == "teacher":
            teacher_user = db.query(models.User).filter(models.User.id == identity.id).first()
            teacher_subs = crud.get_teacher_accessible_subjects(db, teacher_user) if teacher_user else []
            allowed_ids = [s.id for s in teacher_subs]
            if subject_id:
                if allowed_ids and subject_id not in allowed_ids:
                    raise HTTPException(status_code=403, detail="Unauthorized access to subject metrics.")
                att_query = att_query.filter(models.AttendanceModel.subject_id == subject_id)
                cal_query = cal_query.filter(models.CalendarEvent.subject_id == subject_id)
            elif allowed_ids:
                att_query = att_query.filter(models.AttendanceModel.subject_id.in_(allowed_ids))
                cal_query = cal_query.filter(
                    (models.CalendarEvent.subject_id.in_(allowed_ids)) | (models.CalendarEvent.subject_id == None)
                )
        elif subject_id:
            att_query = att_query.filter(models.AttendanceModel.subject_id == subject_id)
            cal_query = cal_query.filter(models.CalendarEvent.subject_id == subject_id)

    raw_records = att_query.all()
    # Keep only active students (excluding orphans)
    records = []
    for r in raw_records:
        raw_id = str(r.id or "").strip()
        base_id = raw_id.split("_", 1)[0]
        roll_cf = str(r.roll or "").strip().casefold()
        if identity.role == "student" or student_id:
            records.append(r)
        elif raw_id in active_ids or base_id in active_ids or (roll_cf and roll_cf in active_rolls):
            records.append(r)

    cancelled_events = cal_query.all()
    cancelled_keys = {
        (e.subject_id, normalize_date_str(e.start_date))
        for e in cancelled_events
    }
    cancelled_global_dates = {
        normalize_date_str(e.start_date)
        for e in cancelled_events
        if e.subject_id is None
    }

    # Compute Metrics
    scheduled_count = 0
    cancelled_count = 0
    attended_count = 0

    for r in records:
        scheduled_count += 1
        r_date = normalize_date_str(r.date)
        is_cancelled_event = (r.subject_id, r_date) in cancelled_keys or r_date in cancelled_global_dates
        if r.attendance == "CLASS_CANCELLED" or is_cancelled_event:
            cancelled_count += 1
        elif r.attendance in ["Present", "Late", "Excused"]:
            attended_count += 1

    # Also account for cancelled classes where no attendance rows were logged yet
    if not records and cancelled_events and (identity.role != "student" and not student_id):
        cancelled_count = len(cancelled_events)
        scheduled_count = len(cancelled_events)

    conducted_count = max(0, scheduled_count - cancelled_count)
    if conducted_count > 0:
        pct = round((attended_count / conducted_count) * 100, 2)
    else:
        pct = 100.0

    return schemas.CalendarAttendanceMetrics(
        scheduled_classes=scheduled_count,
        cancelled_classes=cancelled_count,
        conducted_classes=conducted_count,
        attended_classes=attended_count,
        attendance_percentage=pct,
        is_at_risk=pct < 75.0
    )
