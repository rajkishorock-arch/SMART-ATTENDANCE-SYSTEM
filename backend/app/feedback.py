from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from . import crud, schemas, models, security
from .database import get_db
from .core import config

router = APIRouter()


def get_current_any_user(db: Session = Depends(get_db), token: str = Depends(security.oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
        email: Optional[str] = payload.get("sub")
        role: Optional[str] = payload.get("role")
        institution_id: Optional[int] = payload.get("institution_id")
        if email is None or role is None:
            raise credentials_exception

        user_id = None
        if role == "student":
            student = crud.get_student_by_email(db, email=email, institution_id=institution_id)
            if student:
                user_id = student.id
        else:
            user = crud.get_user_by_email(db, email=email, institution_id=institution_id)
            if user:
                user_id = user.id

        return {"email": email, "role": role, "id": user_id, "institution_id": institution_id}
    except JWTError:
        raise credentials_exception


@router.post("/", response_model=schemas.FeedbackResponse, status_code=status.HTTP_201_CREATED)
def post_feedback(
    feedback: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    user_info: dict = Depends(get_current_any_user)
):
    """
    Submit feedback. Available for students, teachers, and admins.
    """
    if feedback.rating < 1 or feedback.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    if feedback.type not in ["bug", "suggestion", "general"]:
        raise HTTPException(status_code=400, detail="Type must be bug, suggestion, or general")
    clean_message = (feedback.message or "").strip()
    if not clean_message:
        raise HTTPException(status_code=400, detail="Feedback message cannot be empty")
    sanitized = schemas.FeedbackCreate(type=feedback.type, message=clean_message, rating=feedback.rating)

    return crud.create_feedback(
        db=db,
        feedback=sanitized,
        user_email=user_info["email"],
        role=user_info["role"],
        user_id=user_info.get("id"),
        institution_id=user_info.get("institution_id")
    )


@router.get("/mine", response_model=list[schemas.FeedbackResponse])
def get_my_feedbacks(
    db: Session = Depends(get_db),
    user_info: dict = Depends(get_current_any_user)
):
    """
    Get feedback entries submitted by the currently authenticated user along with admin review replies.
    """
    return db.query(models.Feedback).filter(
        models.Feedback.user_email == user_info["email"],
        models.Feedback.institution_id == user_info.get("institution_id")
    ).order_by(models.Feedback.created_at.desc(), models.Feedback.id.desc()).all()


@router.get("/", response_model=list[schemas.FeedbackResponse])
def get_all_feedbacks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Get all feedback entries (Admins only).
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view all feedback entries.")
    return db.query(models.Feedback).filter(
        models.Feedback.institution_id == current_user.institution_id
    ).order_by(models.Feedback.created_at.desc(), models.Feedback.id.desc()).all()


@router.put("/{feedback_id}/review", response_model=schemas.FeedbackResponse)
@router.patch("/{feedback_id}/review", response_model=schemas.FeedbackResponse)
def review_feedback(
    feedback_id: int,
    payload: schemas.FeedbackReviewUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Review feedback and optionally leave an admin reply (Admins only, tenant-isolated).
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can review feedback entries.")

    status_val = (payload.status or "").strip().lower()
    if status_val not in ("pending", "reviewed", "resolved"):
        raise HTTPException(status_code=400, detail="Status must be pending, reviewed, or resolved")

    clean_reply = (payload.admin_reply or "").strip() or None
    if clean_reply and len(clean_reply) > 2000:
        raise HTTPException(status_code=400, detail="Admin reply must be 2000 characters or fewer")

    fb = db.query(models.Feedback).filter(
        models.Feedback.id == feedback_id,
        models.Feedback.institution_id == current_user.institution_id
    ).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback entry not found")

    prev_status = fb.status or "pending"
    fb.status = status_val
    fb.admin_reply = clean_reply
    fb.reviewed_by = current_user.name or current_user.email
    fb.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(fb)

    try:
        crud.create_audit_log(
            db,
            log=schemas.AuditLogCreate(
                user_email=current_user.email,
                action=f"Reviewed Feedback #{fb.id} ({prev_status} -> {fb.status})",
                role=current_user.role,
                entity_type="feedback",
                entity_id=str(fb.id),
                previous_value=prev_status,
                new_value=fb.status,
                reason=clean_reply or fb.status,
            ),
            institution_id=current_user.institution_id,
        )
    except Exception:
        db.rollback()

    if fb.institution_id is not None and fb.user_email:
        try:
            reply_suffix = f" Reply: {clean_reply}" if clean_reply else ""
            notif = models.NotificationModel(
                institution_id=fb.institution_id,
                recipient_id=fb.user_id,
                recipient_email=fb.user_email,
                recipient_role=fb.role or "student",
                category="SYSTEM",
                title=f"Feedback {fb.status.title()}",
                message=f"Admin ({fb.reviewed_by}) updated your {fb.type} feedback to {fb.status.title()}.{reply_suffix}",
                action_url=None,
            )
            db.add(notif)
            db.commit()
        except Exception:
            db.rollback()

    return fb
