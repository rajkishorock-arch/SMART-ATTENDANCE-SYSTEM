from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from . import crud, schemas, models, security, database
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
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None or role is None:
            raise credentials_exception
        return {"email": email, "role": role}
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
        
    return crud.create_feedback(
        db=db,
        feedback=feedback,
        user_email=user_info["email"],
        role=user_info["role"]
    )

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
    return db.query(models.Feedback).order_by(models.Feedback.created_at.desc()).all()
