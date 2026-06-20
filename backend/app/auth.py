from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from collections import defaultdict

from . import crud, schemas, security, models
from .database import get_db
from .core import config

router = APIRouter()

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
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    rate_key = form_data.username.strip().lower()
    _check_rate_limit(rate_key)

    # 1. Try Admin/Teacher Login
    user = crud.get_user_by_email(db, email=form_data.username)
    if user:
        if not security.verify_password(form_data.password, user.password_hash):
            _record_failed_login(rate_key)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")

        access_token = security.create_access_token(data={"sub": user.email, "role": user.role})
        crud.create_audit_log(db, log=schemas.AuditLogCreate(user_email=user.email, action="Admin/User logged in."))
        return {"access_token": access_token, "token_type": "bearer"}

    # 2. Try Student Login
    student = crud.get_student_by_email(db, email=form_data.username)
    if student:
        is_valid = False
        if not student.password_hash:
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

        access_token = security.create_access_token(data={"sub": student.email, "role": "student"})
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
        if email is None or not role:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    if role == "student":
        student = crud.get_student_by_email(db, email=email)
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

    user = crud.get_user_by_email(db, email=email)
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
