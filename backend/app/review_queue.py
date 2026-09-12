"""
Low-Confidence Face Match Review Queue Router (Phase 5)
Manages borderline facial recognition candidates (0.35 <= similarity < 0.50),
allowing staff/teachers to review candidate photos, snapshots, and either
confirm, reassign, or reject with complete audit traceability.
"""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone

from . import models, schemas, security, crud
from .database import get_db

router = APIRouter()

SNAPSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "review_snapshots")
os.makedirs(SNAPSHOT_DIR, exist_ok=True)


def _format_review(r: models.LowConfidenceReview, db: Session) -> schemas.LowConfidenceReviewResponse:
    sub = db.query(models.Subject).filter(models.Subject.id == r.subject_id).first() if r.subject_id else None
    return schemas.LowConfidenceReviewResponse(
        id=r.id,
        institution_id=r.institution_id,
        candidate_student_id=r.candidate_student_id,
        candidate_roll=r.candidate_roll,
        candidate_name=r.candidate_name,
        similarity_score=round(r.similarity_score, 4),
        snapshot_path=f"/api/v1/review-queue/{r.id}/snapshot" if r.snapshot_path else None,
        date=r.date,
        session_time=r.session_time,
        subject_id=r.subject_id,
        subject_name=sub.name if sub else None,
        device_id=r.device_id,
        status=r.status,
        reviewed_by=r.reviewed_by,
        reassigned_student_id=r.reassigned_student_id,
        reviewer_comment=r.reviewer_comment,
        created_at=r.created_at,
        reviewed_at=r.reviewed_at
    )


@router.get("", response_model=List[schemas.LowConfidenceReviewResponse])
def get_low_confidence_queue(
    status: Optional[str] = "PENDING",
    subject_id: Optional[int] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Staff / Teacher review queue for low-confidence face recognitions.
    """
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    query = db.query(models.LowConfidenceReview).filter(
        models.LowConfidenceReview.institution_id == current_user.institution_id
    )

    if status and status != "ALL":
        query = query.filter(models.LowConfidenceReview.status == status.upper())

    if subject_id:
        query = query.filter(models.LowConfidenceReview.subject_id == subject_id)

    if date:
        query = query.filter(models.LowConfidenceReview.date == date.strip())

    # If regular teacher, filter to their assigned subjects
    if current_user.role == "teacher" and not current_user.is_department_head:
        teacher_subject_ids = [s.id for s in db.query(models.Subject.id).filter(
            models.Subject.institution_id == current_user.institution_id,
            models.Subject.teacher_id == current_user.id
        ).all()]
        if teacher_subject_ids:
            query = query.filter(
                (models.LowConfidenceReview.subject_id.in_(teacher_subject_ids)) |
                (models.LowConfidenceReview.subject_id == None)
            )

    items = query.order_by(models.LowConfidenceReview.created_at.desc()).all()
    return [_format_review(i, db) for i in items]


@router.post("/stage", response_model=schemas.LowConfidenceReviewResponse)
async def stage_low_confidence_match(
    candidate_student_id: int = Form(...),
    similarity_score: float = Form(...),
    date: str = Form(...),
    session_time: Optional[str] = Form(None),
    subject_id: Optional[int] = Form(None),
    device_id: Optional[str] = Form("web-kiosk-1"),
    snapshot: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Stage a borderline face match into the review queue.
    Typically called by recognition pipeline when 0.35 <= similarity < 0.50.
    """
    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == candidate_student_id,
        models.StudentModel.institution_id == identity.institution_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Candidate student not found.")

    saved_path = None
    if snapshot and snapshot.filename:
        ext = os.path.splitext(snapshot.filename)[1].lower() or ".jpg"
        fn = f"stage_{identity.institution_id}_{student.id}_{uuid.uuid4().hex[:10]}{ext}"
        saved_path = os.path.join(SNAPSHOT_DIR, fn)
        contents = await snapshot.read()
        with open(saved_path, "wb") as f:
            f.write(contents)

    new_review = models.LowConfidenceReview(
        institution_id=identity.institution_id,
        candidate_student_id=student.id,
        candidate_roll=student.roll,
        candidate_name=student.name,
        similarity_score=similarity_score,
        snapshot_path=saved_path,
        date=date.strip(),
        session_time=session_time,
        subject_id=subject_id,
        device_id=device_id,
        status="PENDING"
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    return _format_review(new_review, db)


@router.post("/{review_id}/resolve", response_model=schemas.LowConfidenceReviewResponse)
def resolve_low_confidence_match(
    review_id: int,
    payload: schemas.LowConfidenceResolvePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Resolves a low-confidence match:
    - CONFIRM: Verified as candidate student; logs attendance record as Present with audit trail.
    - REJECT: False match; leaves attendance untouched, marks review as REJECTED.
    - REASSIGN: Face belongs to a different student; assigns Present to specified roll.
    """
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    review = db.query(models.LowConfidenceReview).filter(
        models.LowConfidenceReview.id == review_id,
        models.LowConfidenceReview.institution_id == current_user.institution_id
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review record not found.")

    if review.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Review is already resolved ({review.status}).")

    action = payload.action.upper()
    now_utc = datetime.now(timezone.utc)
    review.reviewed_by = current_user.email
    review.reviewed_at = now_utc
    review.reviewer_comment = payload.comment

    if action == "CONFIRM":
        review.status = "CONFIRMED"
        # Record attendance for candidate student
        att_record = models.AttendanceModel(
            id=f"lc_{review.id}_{review.candidate_student_id}",
            institution_id=current_user.institution_id,
            roll=review.candidate_roll,
            name=review.candidate_name,
            time=review.session_time or "12:00:00 PM",
            date=review.date,
            attendance="Present",
            subject_id=review.subject_id
        )
        db.add(att_record)

        crud.create_audit_log(
            db,
            log=schemas.AuditLogCreate(
                user_email=current_user.email,
                role=current_user.role,
                action=f"Confirmed low-confidence face match ({round(review.similarity_score, 3)}) for {review.candidate_name} ({review.candidate_roll})",
                entity_type="attendance",
                entity_id=str(review.id),
                previous_value="Unverified",
                new_value="Present",
                reason=payload.comment or "Confirmed by staff after visual review"
            ),
            institution_id=current_user.institution_id
        )

    elif action == "REJECT":
        review.status = "REJECTED"
        crud.create_audit_log(
            db,
            log=schemas.AuditLogCreate(
                user_email=current_user.email,
                role=current_user.role,
                action=f"Rejected low-confidence face match for candidate {review.candidate_name} ({review.candidate_roll})",
                entity_type="low_confidence_review",
                entity_id=str(review.id),
                previous_value="PENDING",
                new_value="REJECTED",
                reason=payload.comment or "False face detection rejected by staff"
            ),
            institution_id=current_user.institution_id
        )

    elif action == "REASSIGN":
        if not payload.reassign_to_roll:
            raise HTTPException(status_code=400, detail="reassign_to_roll is required for REASSIGN action.")

        target_student = db.query(models.StudentModel).filter(
            models.StudentModel.roll == payload.reassign_to_roll.strip(),
            models.StudentModel.institution_id == current_user.institution_id
        ).first()
        if not target_student:
            raise HTTPException(status_code=404, detail=f"Target student roll '{payload.reassign_to_roll}' not found.")

        review.status = "REASSIGNED"
        review.reassigned_student_id = target_student.id

        att_record = models.AttendanceModel(
            id=f"lc_{review.id}_{target_student.id}",
            institution_id=current_user.institution_id,
            roll=target_student.roll,
            name=target_student.name,
            time=review.session_time or "12:00:00 PM",
            date=review.date,
            attendance="Present",
            subject_id=review.subject_id
        )
        db.add(att_record)

        crud.create_audit_log(
            db,
            log=schemas.AuditLogCreate(
                user_email=current_user.email,
                role=current_user.role,
                action=f"Reassigned low-confidence match from {review.candidate_name} to {target_student.name} ({target_student.roll})",
                entity_type="attendance",
                entity_id=str(review.id),
                previous_value=review.candidate_roll,
                new_value=target_student.roll,
                reason=payload.comment or "Reassigned after manual facial inspection"
            ),
            institution_id=current_user.institution_id
        )
    else:
        raise HTTPException(status_code=400, detail=f"Invalid resolution action '{payload.action}'.")

    db.commit()
    db.refresh(review)
    return _format_review(review, db)


@router.get("/{review_id}/snapshot")
def get_review_snapshot(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Securely stream captured snapshot file."""
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    review = db.query(models.LowConfidenceReview).filter(
        models.LowConfidenceReview.id == review_id,
        models.LowConfidenceReview.institution_id == current_user.institution_id
    ).first()
    if not review or not review.snapshot_path or not os.path.exists(review.snapshot_path):
        raise HTTPException(status_code=404, detail="Snapshot not found or unavailable.")

    return FileResponse(review.snapshot_path)
