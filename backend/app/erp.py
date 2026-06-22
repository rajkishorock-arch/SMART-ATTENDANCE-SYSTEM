import secrets
import hashlib
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from . import models, security, crud
from .database import get_db

router = APIRouter()


class ApiKeyCreate(BaseModel):
    name: str
    scopes: str = "attendance:read"


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


def verify_api_key(db: Session, raw_key: str) -> Optional[models.ApiKey]:
    prefix = raw_key[:8]
    keys = db.query(models.ApiKey).filter(
        models.ApiKey.key_prefix == prefix,
        models.ApiKey.is_active == True,
    ).all()
    for k in keys:
        if _hash_key(raw_key) == k.key_hash:
            k.last_used_at = datetime.now(timezone.utc)
            db.commit()
            return k
    return None


@router.post("/keys")
def create_api_key(
    payload: ApiKeyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    raw_key = f"sa_{secrets.token_urlsafe(32)}"
    api_key = models.ApiKey(
        institution_id=current_user.institution_id,
        name=payload.name,
        key_hash=_hash_key(raw_key),
        key_prefix=raw_key[:8],
        scopes=payload.scopes,
        created_by=current_user.email,
    )
    db.add(api_key)
    db.commit()
    return {
        "id": api_key.id,
        "name": api_key.name,
        "key": raw_key,
        "message": "Store this key securely. It won't be shown again.",
    }


@router.get("/keys")
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    keys = db.query(models.ApiKey).filter(
        models.ApiKey.institution_id == current_user.institution_id
    ).all()
    return [{
        "id": k.id,
        "name": k.name,
        "key_prefix": k.key_prefix,
        "scopes": k.scopes,
        "is_active": k.is_active,
        "last_used_at": k.last_used_at,
        "created_at": k.created_at,
    } for k in keys]


@router.delete("/keys/{key_id}")
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    key = db.query(models.ApiKey).filter(
        models.ApiKey.id == key_id,
        models.ApiKey.institution_id == current_user.institution_id,
    ).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    key.is_active = False
    db.commit()
    return {"message": "API key revoked"}


@router.get("/attendance/export")
def erp_attendance_export(
    date: Optional[str] = None,
    x_api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db),
):
    key = verify_api_key(db, x_api_key)
    if not key or "attendance:read" not in key.scopes:
        raise HTTPException(status_code=401, detail="Invalid API key")
    logs = crud.get_attendance_logs(
        db, date_str=date, institution_id=key.institution_id, limit=5000
    )
    return [{
        "student_id": l.id,
        "roll": l.roll,
        "name": l.name,
        "department": l.department,
        "date": l.date,
        "time": l.time,
        "status": l.attendance,
        "subject_id": l.subject_id,
    } for l in logs]
