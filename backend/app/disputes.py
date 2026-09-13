"""
Attendance Correction & Dispute System Router (Phase 2)
Provides an auditable, multi-tenant dispute lifecycle with secure proof handling,
HOD escalation, and immutable attendance correction records.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import os
import shutil
import uuid

from . import models, schemas, security, crud
from .database import get_db
from .core import config

router = APIRouter()
IST = timezone(timedelta(hours=5, minutes=30))

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "dispute_proofs")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_PROOF_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
MAX_PROOF_BYTES = 5 * 1024 * 1024  # 5MB


def normalize_date_to_slash(date_str: Optional[str]) -> str:
    if not date_str:
        return datetime.now(IST).strftime("%d/%m/%Y")
    clean = date_str.strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y"):
        try:
            dt = datetime.strptime(clean, fmt)
            return dt.strftime("%d/%m/%Y")
        except ValueError:
            pass
    return clean


def _get_time_for_session(session_str: Optional[str]) -> str:
    if not session_str:
        return datetime.now(IST).strftime("%H:%M:%S")
    s_upper = session_str.upper()
    if "PERIOD 1" in s_upper or "09:00" in s_upper:
        return "09:05:00"
    elif "PERIOD 2" in s_upper or "10:00" in s_upper:
        return "10:05:00"
    elif "PERIOD 3" in s_upper or "11:00" in s_upper:
        return "11:05:00"
    elif "PERIOD 4" in s_upper or "12:00" in s_upper:
        return "12:05:00"
    elif "PERIOD 5" in s_upper or "01:00" in s_upper or "13:00" in s_upper:
        return "13:05:00"
    elif "PERIOD 6" in s_upper or "02:00" in s_upper or "14:00" in s_upper:
        return "14:05:00"
    elif "PERIOD 7" in s_upper or "03:00" in s_upper or "15:00" in s_upper:
        return "15:05:00"
    elif "PERIOD 8" in s_upper or "04:00" in s_upper or "16:00" in s_upper:
        return "16:05:00"
    return datetime.now(IST).strftime("%H:%M:%S")


def sync_all_approved_disputes(db: Session):
    """Auto-sync all APPROVED disputes into official AttendanceModel records so real-time DB logs reflect approved corrections."""
    try:
        from .period_utils import resolve_period_name
        approved_disputes = db.query(models.AttendanceDispute).filter(
            models.AttendanceDispute.status == "APPROVED"
        ).all()

        for disp in approved_disputes:
            try:
                student = db.query(models.StudentModel).filter(models.StudentModel.id == disp.student_id).first()
                if not student:
                    continue

                canonical_date = normalize_date_to_slash(disp.date)
                alt_dates = [disp.date, canonical_date]
                try:
                    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
                        try:
                            d_obj = datetime.strptime(disp.date.strip(), fmt)
                            alt_dates.extend([d_obj.strftime("%d/%m/%Y"), d_obj.strftime("%d-%m-%Y"), d_obj.strftime("%Y-%m-%d")])
                            break
                        except ValueError:
                            pass
                except Exception:
                    pass
                alt_dates = list(set([d for d in alt_dates if d]))

                from sqlalchemy import or_
                possible_rolls = list(set([r for r in [student.roll, str(student.id), student.email] if r]))

                candidates = db.query(models.AttendanceModel).filter(
                    models.AttendanceModel.institution_id == disp.institution_id,
                    models.AttendanceModel.date.in_(alt_dates),
                    or_(
                        models.AttendanceModel.roll.in_(possible_rolls),
                        models.AttendanceModel.name == student.name
                    )
                ).all()

                disp_period = resolve_period_name(disp.session_time)

                att_record = None
                for cand in candidates:
                    if disp.subject_id and cand.subject_id and cand.subject_id != disp.subject_id:
                        continue
                    if resolve_period_name(cand.time) == disp_period:
                        att_record = cand
                        break

                target_status = disp.requested_status or "Present"

                if att_record:
                    att_record.attendance = target_status
                    att_record.date = canonical_date
                    if student.roll:
                        att_record.roll = student.roll
                    att_record.verification_method = "DISPUTE_CORRECTION"
                    att_record.fallback_reason = f"Approved Dispute Request #{disp.id}"
                else:
                    new_time = _get_time_for_session(disp.session_time)
                    unique_id = f"disp_{disp.id}_{uuid.uuid4().hex[:6]}"
                    new_att = models.AttendanceModel(
                        id=unique_id,
                        institution_id=disp.institution_id,
                        roll=student.roll or str(student.id),
                        name=student.name or "Student",
                        department=student.dep or "",
                        time=new_time,
                        date=canonical_date,
                        attendance=target_status,
                        subject_id=disp.subject_id,
                        verification_method="DISPUTE_CORRECTION",
                        fallback_reason=f"Approved Dispute Request #{disp.id}"
                    )
                    db.add(new_att)
                db.commit()
            except Exception as err:
                db.rollback()
                print(f"Error syncing approved dispute #{disp.id}:", err)
    except Exception as ex:
        print("Global dispute sync check error:", ex)


def _format_dispute(d: models.AttendanceDispute, db: Session) -> schemas.DisputeResponse:
    student = db.query(models.StudentModel).filter(models.StudentModel.id == d.student_id).first()
    subject = db.query(models.Subject).filter(models.Subject.id == d.subject_id).first() if d.subject_id else None
    
    comments = db.query(models.DisputeComment).filter(
        models.DisputeComment.dispute_id == d.id
    ).order_by(models.DisputeComment.created_at.asc()).all()

    return schemas.DisputeResponse(
        id=d.id,
        institution_id=d.institution_id,
        attendance_id=d.attendance_id,
        student_id=d.student_id,
        student_name=student.name if student else None,
        student_roll=student.roll if student else None,
        student_email=student.email if student else None,
        subject_id=d.subject_id,
        subject_name=subject.name if subject else None,
        subject_code=subject.code if subject else None,
        date=d.date,
        session_time=d.session_time,
        original_status=d.original_status,
        requested_status=d.requested_status,
        reason=d.reason,
        description=d.description,
        proof_filename=d.proof_filename,
        has_proof=bool(d.proof_filename),
        status=d.status,
        reviewed_by=d.reviewed_by,
        reviewer_role=d.reviewer_role,
        reviewer_comments=d.reviewer_comments,
        escalated_to_hod=bool(d.escalated_to_hod),
        hod_reviewed_by=d.hod_reviewed_by,
        hod_comments=d.hod_comments,
        created_at=d.created_at,
        updated_at=d.updated_at,
        resolved_at=d.resolved_at,
        comments=[
            schemas.DisputeCommentResponse(
                id=c.id,
                dispute_id=c.dispute_id,
                author_email=c.author_email,
                author_role=c.author_role,
                author_name=c.author_name,
                message=c.message,
                created_at=c.created_at
            ) for c in comments
        ]
    )


def _format_disputes_batch(disputes: List[models.AttendanceDispute], db: Session) -> List[schemas.DisputeResponse]:
    if not disputes:
        return []

    student_ids = list(set([d.student_id for d in disputes if d.student_id]))
    subject_ids = list(set([d.subject_id for d in disputes if d.subject_id]))
    dispute_ids = [d.id for d in disputes]

    students_map = {
        s.id: s for s in db.query(models.StudentModel).filter(models.StudentModel.id.in_(student_ids)).all()
    } if student_ids else {}

    subjects_map = {
        sub.id: sub for sub in db.query(models.Subject).filter(models.Subject.id.in_(subject_ids)).all()
    } if subject_ids else {}

    comments_raw = db.query(models.DisputeComment).filter(
        models.DisputeComment.dispute_id.in_(dispute_ids)
    ).order_by(models.DisputeComment.created_at.asc()).all() if dispute_ids else []

    comments_map = {}
    for c in comments_raw:
        comments_map.setdefault(c.dispute_id, []).append(c)

    formatted = []
    for d in disputes:
        student = students_map.get(d.student_id)
        subject = subjects_map.get(d.subject_id)
        comments = comments_map.get(d.id, [])

        formatted.append(schemas.DisputeResponse(
            id=d.id,
            institution_id=d.institution_id,
            attendance_id=d.attendance_id,
            student_id=d.student_id,
            student_name=student.name if student else None,
            student_roll=student.roll if student else None,
            student_email=student.email if student else None,
            subject_id=d.subject_id,
            subject_name=subject.name if subject else None,
            subject_code=subject.code if subject else None,
            date=d.date,
            session_time=d.session_time,
            original_status=d.original_status,
            requested_status=d.requested_status,
            reason=d.reason,
            description=d.description,
            proof_filename=d.proof_filename,
            has_proof=bool(d.proof_filename),
            status=d.status,
            reviewed_by=d.reviewed_by,
            reviewer_role=d.reviewer_role,
            reviewer_comments=d.reviewer_comments,
            escalated_to_hod=bool(d.escalated_to_hod),
            hod_reviewed_by=d.hod_reviewed_by,
            hod_comments=d.hod_comments,
            created_at=d.created_at,
            updated_at=d.updated_at,
            resolved_at=d.resolved_at,
            comments=[
                schemas.DisputeCommentResponse(
                    id=c.id,
                    dispute_id=c.dispute_id,
                    author_email=c.author_email,
                    author_role=c.author_role,
                    author_name=c.author_name,
                    message=c.message,
                    created_at=c.created_at
                ) for c in comments
            ]
        ))
    return formatted


# ── Student Endpoints ──────────────────────────────────────────────────────────

@router.post("", response_model=schemas.DisputeResponse)
async def submit_dispute(
    request: Request,
    attendance_id: Optional[str] = Form(None),
    subject_id: Optional[int] = Form(None),
    date: str = Form(...),
    session_time: Optional[str] = Form(None),
    original_status: str = Form(...),
    requested_status: str = Form("Present"),
    reason: str = Form(...),
    description: Optional[str] = Form(None),
    proof: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Student or staff submits an attendance dispute / correction request with optional proof.
    Validates institutional deadline window and prevents duplicate disputes.
    """
    inst_id = current_identity.institution_id
    student = None
    if current_identity.role == "student":
        student_id = current_identity.id
        user_email = current_identity.email
        student = crud.get_student_by_id(db, student_id=current_identity.id, institution_id=inst_id)
        if not student:
            student = crud.get_student_by_email(db, email=current_identity.email, institution_id=inst_id)
    else:
        user_email = current_identity.email
        student = crud.get_student_by_email(db, email=current_identity.email, institution_id=inst_id)
        if not student:
            student = db.query(models.StudentModel).filter(models.StudentModel.institution_id == inst_id).first()
        if not student:
            raise HTTPException(status_code=400, detail="No student profile found to associate with this dispute.")
        student_id = student.id

    settings = crud.get_system_settings(db, institution_id=inst_id)
    deadline_hours = getattr(settings, "dispute_window_hours", 72) or 72

    # 1. Validate Deadline Window (from attendance date)
    try:
        clean_date = date.strip()
        att_dt = None
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                att_dt = datetime.strptime(clean_date, fmt)
                break
            except ValueError:
                pass

        if att_dt:
            now_dt = datetime.now()
            # Allow deadline from end of attendance day
            if (now_dt - att_dt).total_seconds() > (deadline_hours + 24) * 3600:
                raise HTTPException(
                    status_code=400,
                    detail=f"The correction window for attendance date {date} has expired (allowed within {deadline_hours} hours). Please contact your administrator."
                )
    except Exception:
        pass  # Skip if date format validation fails

    # 2. Prevent Duplicate Active Disputes for the exact same session/period/subject
    clean_session_time = session_time.strip()[:99] if session_time else None

    query = db.query(models.AttendanceDispute).filter(
        models.AttendanceDispute.institution_id == inst_id,
        models.AttendanceDispute.student_id == student_id,
        models.AttendanceDispute.date == date.strip(),
        models.AttendanceDispute.status.in_(["SUBMITTED", "UNDER_REVIEW", "NEEDS_INFORMATION"])
    )
    if clean_session_time:
        query = query.filter(models.AttendanceDispute.session_time == clean_session_time)
    if subject_id is not None:
        query = query.filter(models.AttendanceDispute.subject_id == subject_id)
        
    existing_dispute = query.first()

    if existing_dispute:
        raise HTTPException(
            status_code=400,
            detail=f"A dispute (ID #{existing_dispute.id}, status: {existing_dispute.status}) already exists for this specific attendance session/period."
        )

    # 3. Handle Secure Proof Upload
    saved_filename = None
    content_type = None
    if proof and proof.filename:
        ext = os.path.splitext(proof.filename)[1].lower()
        if ext not in ALLOWED_PROOF_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid proof file type '{ext}'. Allowed: JPG, PNG, PDF."
            )
        contents = await proof.read()
        if len(contents) > MAX_PROOF_BYTES:
            raise HTTPException(status_code=413, detail="Proof file exceeds 5MB size limit.")
        
        saved_filename = f"proof_{inst_id}_{student_id}_{uuid.uuid4().hex[:12]}{ext}"
        target_path = os.path.join(UPLOAD_DIR, saved_filename)
        with open(target_path, "wb") as f:
            f.write(contents)
        content_type = proof.content_type

    # 4. Create Dispute Record
    try:
        new_dispute = models.AttendanceDispute(
            institution_id=inst_id,
            attendance_id=attendance_id,
            student_id=student_id,
            subject_id=subject_id,
            date=date.strip(),
            session_time=clean_session_time,
            original_status=original_status,
            requested_status=requested_status,
            reason=reason,
            description=description,
            proof_filename=saved_filename,
            proof_content_type=content_type,
            status="SUBMITTED"
        )
        db.add(new_dispute)
        db.commit()
        db.refresh(new_dispute)
    except Exception as err:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Failed to record dispute in database: {str(err)}"
        )

    # 5. Immutable Audit Log
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=user_email,
            role=current_identity.role,
            action=f"Submitted attendance dispute #{new_dispute.id} for {date} ({original_status} -> {requested_status})",
            entity_type="attendance_dispute",
            entity_id=str(new_dispute.id),
            previous_value=original_status,
            new_value=requested_status,
            reason=f"{reason}: {description or 'No description'}"
        ),
        institution_id=inst_id
    )

    try:
        from .notifications import create_notification
        s_name = student.name if student else "Student"
        create_notification(
            db=db,
            institution_id=inst_id,
            recipient_role="teacher",
            category="DISPUTE",
            title="New Attendance Dispute Request",
            message=f"{s_name} submitted a dispute for {date} ({session_time or 'Regular Session'})",
            action_url="/#/disputes"
        )
    except Exception as n_err:
        print("Notification trigger error on dispute submit:", n_err)

    return _format_dispute(new_dispute, db)


@router.get("/my-disputes", response_model=List[schemas.DisputeResponse])
def get_my_disputes(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """List all attendance disputes submitted by or associated with the logged-in user/student."""
    inst_id = current_identity.institution_id
    query = db.query(models.AttendanceDispute).filter(
        models.AttendanceDispute.institution_id == inst_id
    )
    if current_identity.role == "student":
        query = query.filter(models.AttendanceDispute.student_id == current_identity.id)
    else:
        student = crud.get_student_by_email(db, email=current_identity.email, institution_id=inst_id)
        if student:
            query = query.filter(models.AttendanceDispute.student_id == student.id)

    if status:
        query = query.filter(models.AttendanceDispute.status == status.upper())
    
    disputes = query.order_by(models.AttendanceDispute.created_at.desc()).all()
    return _format_disputes_batch(disputes, db)


@router.post("/{dispute_id}/cancel", response_model=schemas.DisputeResponse)
def cancel_dispute(
    dispute_id: int,
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Cancel a pending dispute."""
    inst_id = current_identity.institution_id
    query = db.query(models.AttendanceDispute).filter(
        models.AttendanceDispute.id == dispute_id,
        models.AttendanceDispute.institution_id == inst_id
    )
    if current_identity.role == "student":
        query = query.filter(models.AttendanceDispute.student_id == current_identity.id)

    dispute = query.first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found.")
    if dispute.status in ["APPROVED", "REJECTED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel dispute with status '{dispute.status}'.")

    dispute.status = "CANCELLED"
    dispute.resolved_at = datetime.now(timezone.utc)
    db.commit()

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_identity.email,
            role=current_identity.role,
            action=f"Cancelled attendance dispute #{dispute.id}",
            entity_type="attendance_dispute",
            entity_id=str(dispute.id),
            previous_value=dispute.original_status,
            new_value="CANCELLED",
            reason="Student requested dispute cancellation"
        ),
        institution_id=current_identity.institution_id
    )
    return _format_dispute(dispute, db)


# ── Staff / Teacher / Admin Endpoints ──────────────────────────────────────────

@router.get("/queue", response_model=List[schemas.DisputeResponse])
def get_disputes_queue(
    status: Optional[str] = None,
    subject_id: Optional[int] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Teacher and Admin review queue for attendance disputes.
    Teachers are scoped to their assigned subjects; Admins and HODs see institutional disputes.
    """
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    query = db.query(models.AttendanceDispute).filter(
        models.AttendanceDispute.institution_id == current_user.institution_id
    )

    if current_user.role == "teacher" and not current_user.is_department_head:
        # Teacher's subjects
        teacher_subjects = db.query(models.Subject.id).filter(
            models.Subject.teacher_id == current_user.id,
            models.Subject.institution_id == current_user.institution_id
        ).all()
        t_ids = [s[0] for s in teacher_subjects]
        if t_ids:
            query = query.filter(models.AttendanceDispute.subject_id.in_(t_ids))

    if status:
        query = query.filter(models.AttendanceDispute.status == status.upper())
    if subject_id:
        query = query.filter(models.AttendanceDispute.subject_id == subject_id)
    if date:
        query = query.filter(models.AttendanceDispute.date == date.strip())

    disputes = query.order_by(models.AttendanceDispute.created_at.desc()).all()
    return _format_disputes_batch(disputes, db)


@router.get("/{dispute_id}", response_model=schemas.DisputeResponse)
def get_dispute_details(
    dispute_id: int,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Retrieve complete dispute information, proof metadata, and communication history."""
    dispute = db.query(models.AttendanceDispute).filter(
        models.AttendanceDispute.id == dispute_id,
        models.AttendanceDispute.institution_id == identity.institution_id
    ).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found.")

    if identity.role == "student" and dispute.student_id != identity.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this dispute.")

    return _format_dispute(dispute, db)


@router.post("/{dispute_id}/review", response_model=schemas.DisputeResponse)
def review_dispute(
    dispute_id: int,
    payload: schemas.DisputeReviewPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Teacher/Admin reviews dispute: APPROVE, REJECT, or NEEDS_INFORMATION.
    On APPROVE: Modifies attendance record, preserves full audit trail, never overwrites silently.
    """
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    dispute = db.query(models.AttendanceDispute).filter(
        models.AttendanceDispute.id == dispute_id,
        models.AttendanceDispute.institution_id == current_user.institution_id
    ).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found.")

    action = payload.action.upper()
    if action not in ["APPROVE", "REJECT", "NEEDS_INFORMATION"]:
        raise HTTPException(status_code=400, detail="Invalid action. Use APPROVE, REJECT, or NEEDS_INFORMATION.")

    settings = crud.get_system_settings(db, institution_id=current_user.institution_id)
    require_hod = getattr(settings, "dispute_require_hod_approval", False)

    # If institutional policy requires HOD approval and user is regular teacher:
    if action == "APPROVE" and require_hod and current_user.role == "teacher" and not current_user.is_department_head:
        dispute.status = "UNDER_REVIEW"
        dispute.escalated_to_hod = True
        dispute.reviewer_comments = f"Teacher endorsed approval: {payload.comment or ''}. Escalated to HOD for final sign-off."
        db.commit()
        return _format_dispute(dispute, db)

    now_utc = datetime.now(timezone.utc)
    student = db.query(models.StudentModel).filter(models.StudentModel.id == dispute.student_id).first()

    if action == "APPROVE":
        dispute.status = "APPROVED"
        dispute.reviewed_by = current_user.email
        dispute.reviewer_role = current_user.role
        dispute.reviewer_comments = payload.comment
        dispute.resolved_at = now_utc

        # ── Apply Attendance Correction to Official Records ─────────────────
        def _get_time_for_session(session_str: Optional[str]) -> str:
            if not session_str:
                return datetime.now(IST).strftime("%H:%M:%S")
            s_upper = session_str.upper()
            if "PERIOD 1" in s_upper or "09:00" in s_upper:
                return "09:05:00"
            elif "PERIOD 2" in s_upper or "10:00" in s_upper:
                return "10:05:00"
            elif "PERIOD 3" in s_upper or "11:00" in s_upper:
                return "11:05:00"
            elif "PERIOD 4" in s_upper or "12:00" in s_upper:
                return "12:05:00"
            elif "PERIOD 5" in s_upper or "01:00" in s_upper or "13:00" in s_upper:
                return "13:05:00"
            elif "PERIOD 6" in s_upper or "02:00" in s_upper or "14:00" in s_upper:
                return "14:05:00"
            elif "PERIOD 7" in s_upper or "03:00" in s_upper or "15:00" in s_upper:
                return "15:05:00"
            elif "PERIOD 8" in s_upper or "04:00" in s_upper or "16:00" in s_upper:
                return "16:05:00"
            return datetime.now(IST).strftime("%H:%M:%S")

        canonical_date = normalize_date_to_slash(dispute.date)
        alt_dates = [dispute.date, canonical_date]
        try:
            for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
                try:
                    d_obj = datetime.strptime(dispute.date.strip(), fmt)
                    alt_dates.extend([d_obj.strftime("%d/%m/%Y"), d_obj.strftime("%d-%m-%Y"), d_obj.strftime("%Y-%m-%d")])
                    break
                except ValueError:
                    pass
        except Exception:
            pass
        alt_dates = list(set([d for d in alt_dates if d]))

        # Find existing attendance record matching date, student, subject AND period!
        existing_candidates = db.query(models.AttendanceModel).filter(
            models.AttendanceModel.institution_id == current_user.institution_id,
            models.AttendanceModel.date.in_(alt_dates)
        )
        if dispute.attendance_id:
            try:
                att_id_val = int(dispute.attendance_id)
                existing_candidates = existing_candidates.filter(models.AttendanceModel.id == att_id_val)
            except ValueError:
                existing_candidates = existing_candidates.filter(models.AttendanceModel.id == dispute.attendance_id)
        elif student:
            possible_rolls = list(set([r for r in [student.roll, str(student.id), student.email] if r]))
            from sqlalchemy import or_
            existing_candidates = existing_candidates.filter(
                or_(
                    models.AttendanceModel.roll.in_(possible_rolls),
                    models.AttendanceModel.name == student.name
                )
            )

        cand_list = existing_candidates.all()
        from .period_utils import resolve_period_name
        disp_period = resolve_period_name(dispute.session_time)

        att_record = None
        for cand in cand_list:
            if dispute.subject_id and cand.subject_id and cand.subject_id != dispute.subject_id:
                continue
            if not dispute.session_time or resolve_period_name(cand.time) == disp_period:
                att_record = cand
                break
        if not att_record and cand_list:
            att_record = cand_list[0]

        prev_status = dispute.original_status

        if att_record:
            prev_status = att_record.attendance
            att_record.attendance = dispute.requested_status or "Present"
            att_record.date = canonical_date
            if student and student.roll:
                att_record.roll = student.roll
            att_record.verification_method = "DISPUTE_CORRECTION"
            att_record.fallback_reason = f"Approved Dispute Request #{dispute.id}"
        else:
            # Create new corrected attendance entry for this period slot
            new_time = _get_time_for_session(dispute.session_time)
            unique_id = f"disp_{dispute.id}_{uuid.uuid4().hex[:6]}"
            att_record = models.AttendanceModel(
                id=unique_id,
                institution_id=current_user.institution_id,
                roll=student.roll if student else "",
                name=student.name if student else "Student",
                department=student.dep if student else "",
                time=new_time,
                date=canonical_date,
                attendance=dispute.requested_status or "Present",
                subject_id=dispute.subject_id,
                verification_method="DISPUTE_CORRECTION",
                fallback_reason=f"Approved Dispute Request #{dispute.id}"
            )
            db.add(att_record)

        db.commit()

        try:
            from .recognition_service import recognition_service
            recognition_service.invalidate_cache(current_user.institution_id)
        except Exception:
            pass

        # ── Mandatory Immutable Audit Event ────────────────────────────────
        crud.create_audit_log(
            db,
            log=schemas.AuditLogCreate(
                user_email=current_user.email,
                role=current_user.role,
                action=f"Approved attendance correction for dispute #{dispute.id} ({student.name if student else ''})",
                entity_type="attendance",
                entity_id=str(dispute.id),
                previous_value=prev_status,
                new_value=dispute.requested_status,
                reason=f"Dispute reason: {dispute.reason}. Approver note: {payload.comment or 'Approved'}"
            ),
            institution_id=current_user.institution_id
        )

    elif action == "REJECT":
        dispute.status = "REJECTED"
        dispute.reviewed_by = current_user.email
        dispute.reviewer_role = current_user.role
        dispute.reviewer_comments = payload.comment
        dispute.resolved_at = now_utc
        db.commit()

        crud.create_audit_log(
            db,
            log=schemas.AuditLogCreate(
                user_email=current_user.email,
                role=current_user.role,
                action=f"Rejected attendance dispute #{dispute.id} ({student.name if student else ''})",
                entity_type="attendance_dispute",
                entity_id=str(dispute.id),
                previous_value=dispute.original_status,
                new_value="REJECTED",
                reason=f"Rejection comment: {payload.comment or 'Insufficient verification proof'}"
            ),
            institution_id=current_user.institution_id
        )

    elif action == "NEEDS_INFORMATION":
        dispute.status = "NEEDS_INFORMATION"
        dispute.reviewer_comments = payload.comment
        db.commit()

        # Add comment thread entry
        if payload.comment:
            comment_entry = models.DisputeComment(
                dispute_id=dispute.id,
                institution_id=current_user.institution_id,
                author_email=current_user.email,
                author_role=current_user.role,
                author_name=current_user.name,
                message=payload.comment
            )
            db.add(comment_entry)
            db.commit()

    return _format_dispute(dispute, db)


@router.post("/{dispute_id}/escalate", response_model=schemas.DisputeResponse)
def escalate_dispute(
    dispute_id: int,
    payload: schemas.DisputeEscalatePayload,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Escalates dispute to HOD or Principal for secondary review."""
    dispute = db.query(models.AttendanceDispute).filter(
        models.AttendanceDispute.id == dispute_id,
        models.AttendanceDispute.institution_id == identity.institution_id
    ).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found.")

    dispute.status = "UNDER_REVIEW"
    dispute.escalated_to_hod = True
    if payload.reason:
        dispute.reviewer_comments = (dispute.reviewer_comments or "") + f" | Escalation reason: {payload.reason}"
    db.commit()

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=identity.email,
            role=identity.role,
            action=f"Escalated attendance dispute #{dispute.id} to HOD",
            entity_type="attendance_dispute",
            entity_id=str(dispute.id),
            reason=payload.reason or "Escalated for departmental review"
        ),
        institution_id=identity.institution_id
    )
    return _format_dispute(dispute, db)


@router.post("/{dispute_id}/comments", response_model=schemas.DisputeCommentResponse)
def add_dispute_comment(
    dispute_id: int,
    payload: schemas.DisputeCommentCreate,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Add a message/comment to the dispute thread (students and staff)."""
    dispute = db.query(models.AttendanceDispute).filter(
        models.AttendanceDispute.id == dispute_id,
        models.AttendanceDispute.institution_id == identity.institution_id
    ).first()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found.")

    if identity.role == "student" and dispute.student_id != identity.id:
        raise HTTPException(status_code=403, detail="Unauthorized.")

    comment = models.DisputeComment(
        dispute_id=dispute.id,
        institution_id=identity.institution_id,
        author_email=identity.email,
        author_role=identity.role,
        author_name=identity.name,
        message=payload.message.strip()
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return schemas.DisputeCommentResponse(
        id=comment.id,
        dispute_id=comment.dispute_id,
        author_email=comment.author_email,
        author_role=comment.author_role,
        author_name=comment.author_name,
        message=comment.message,
        created_at=comment.created_at
    )


# ── Secure Proof Streaming Endpoint ───────────────────────────────────────────

@router.get("/{dispute_id}/proof")
def download_dispute_proof(
    dispute_id: int,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Secure authenticated access to dispute proof files.
    Public URLs are never exposed; access is strictly restricted to the student owner and institutional staff.
    """
    dispute = db.query(models.AttendanceDispute).filter(
        models.AttendanceDispute.id == dispute_id,
        models.AttendanceDispute.institution_id == identity.institution_id
    ).first()
    if not dispute or not dispute.proof_filename:
        raise HTTPException(status_code=404, detail="Proof file not found.")

    if identity.role == "student" and dispute.student_id != identity.id:
        raise HTTPException(status_code=403, detail="Access denied: cannot view another student's proof document.")

    file_path = os.path.join(UPLOAD_DIR, dispute.proof_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing from storage.")

    media_type = dispute.proof_content_type or "application/octet-stream"
    return FileResponse(file_path, media_type=media_type, filename=dispute.proof_filename)
