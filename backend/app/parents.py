import csv
import io
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from . import models, schemas, security, crud
from .database import get_db
from .notification_service import notify_parent_absent

router = APIRouter()
IST = timezone(timedelta(hours=5, minutes=30))


class ParentRegister(BaseModel):
    student_id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    notify_email: bool = True
    notify_sms: bool = False
    notify_whatsapp: bool = False


class ParentLogin(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
def register_parent(
    payload: ParentRegister,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Only staff can register parents")
    student = crud.get_student_by_id(db, payload.student_id, current_user.institution_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    existing = db.query(models.ParentAccount).filter(
        models.ParentAccount.institution_id == current_user.institution_id,
        models.ParentAccount.email == payload.email,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Parent email already registered")
    parent = models.ParentAccount(
        institution_id=current_user.institution_id,
        student_id=payload.student_id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        password_hash=security.get_password_hash(payload.password),
        notify_email=payload.notify_email,
        notify_sms=payload.notify_sms,
        notify_whatsapp=payload.notify_whatsapp,
    )
    db.add(parent)
    student.parent_name = payload.name
    student.parent_email = payload.email
    student.parent_phone = payload.phone
    db.commit()
    return {"message": "Parent registered", "parent_id": parent.id}


@router.post("/login")
def parent_login(payload: ParentLogin, db: Session = Depends(get_db)):
    from .security import verify_password, create_access_token
    parent = db.query(models.ParentAccount).filter(models.ParentAccount.email == payload.email).first()
    if not parent or not verify_password(payload.password, parent.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    student = db.query(models.StudentModel).filter(models.StudentModel.id == parent.student_id).first()
    token = create_access_token({
        "sub": parent.email,
        "role": "parent",
        "institution_id": parent.institution_id,
        "student_id": parent.student_id,
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "student_name": student.name if student else None,
        "student_roll": student.roll if student else None,
    }


@router.get("/child-attendance")
def get_child_attendance(
    db: Session = Depends(get_db),
    token: str = Depends(security.oauth2_scheme),
):
    from jose import jwt, JWTError
    from .core import config
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
        if payload.get("role") != "parent":
            raise HTTPException(status_code=403, detail="Parent access only")
        student_id = payload.get("student_id")
        institution_id = payload.get("institution_id")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    logs = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.id == str(student_id),
        models.AttendanceModel.institution_id == institution_id,
    ).order_by(models.AttendanceModel.date.desc()).limit(100).all()
    return [{"date": l.date, "time": l.time, "status": l.attendance} for l in logs]


@router.post("/notify-absent/{student_id}")
def notify_parent_of_absence(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff only")
    student = crud.get_student_by_id(db, student_id, current_user.institution_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    today = datetime.now(IST).strftime("%d/%m/%Y")
    parent = db.query(models.ParentAccount).filter(
        models.ParentAccount.student_id == student_id,
        models.ParentAccount.institution_id == current_user.institution_id,
    ).first()
    phone = student.parent_phone or (parent.phone if parent else None)
    result = notify_parent_absent(
        phone,
        student.parent_email,
        student.name or "Student",
        today,
        notify_sms=parent.notify_sms if parent else False,
        notify_whatsapp=parent.notify_whatsapp if parent else False,
    )
    return {"message": "Notification sent", "channels": result}
