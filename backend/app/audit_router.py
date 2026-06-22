from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from . import models, security
from .database import get_db

router = APIRouter()


class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    user_email: str
    action: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AuditLogResponse])
def get_audit_trail(
    skip: int = 0,
    limit: int = 100,
    user_email: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    query = db.query(models.AuditLog).filter(
        models.AuditLog.institution_id == current_user.institution_id
    )
    if user_email:
        query = query.filter(models.AuditLog.user_email == user_email)
    if search:
        query = query.filter(models.AuditLog.action.contains(search))
    logs = query.order_by(models.AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return logs
