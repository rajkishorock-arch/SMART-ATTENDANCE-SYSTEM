from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from collections import defaultdict

from . import crud, schemas, security, models, security_utils, cache_service
from .database import get_db
from .core import config

router = APIRouter()

import time
from typing import Dict, Optional

# Dictionary to store active user heartbeats
# Key: email (str), Value: {"role": role, "last_seen": timestamp}
active_sessions: Dict[str, dict] = {}

def record_active_user(email: str, role: str):
    active_sessions[email] = {
        "role": role,
        "last_seen": time.time()
    }

MAX_LOGIN_ATTEMPTS = 8
LOGIN_WINDOW_SECONDS = 300
MAX_IP_LOGIN_ATTEMPTS = 30
IP_LOGIN_WINDOW_SECONDS = 60


def _check_rate_limit(rate_key: str, client_ip: Optional[str] = None):
    if client_ip:
        # B. Per client IP check (30 attempts / 60 seconds)
        ip_attempts = cache_service.rate_limit_get_attempts(f"auth:ip:{client_ip}", ttl=IP_LOGIN_WINDOW_SECONDS)
        if ip_attempts >= MAX_IP_LOGIN_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts from this IP address. Please try again later.",
            )

        # A. Per username + client IP check (8 attempts / 300 seconds)
        user_ip_key = f"auth:user_ip:{rate_key}:{client_ip}"
        user_ip_attempts = cache_service.rate_limit_get_attempts(user_ip_key, ttl=LOGIN_WINDOW_SECONDS)
        if user_ip_attempts >= MAX_LOGIN_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later.",
            )
    else:
        attempts = cache_service.rate_limit_get_attempts(rate_key, ttl=LOGIN_WINDOW_SECONDS)
        if attempts >= MAX_LOGIN_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later.",
            )


def _record_failed_login(rate_key: str, client_ip: Optional[str] = None):
    cache_service.rate_limit_record_attempt(rate_key, ttl=LOGIN_WINDOW_SECONDS)
    if client_ip:
        user_ip_key = f"auth:user_ip:{rate_key}:{client_ip}"
        cache_service.rate_limit_record_attempt(user_ip_key, ttl=LOGIN_WINDOW_SECONDS)
        cache_service.rate_limit_record_attempt(f"auth:ip:{client_ip}", ttl=IP_LOGIN_WINDOW_SECONDS)


def _reset_login_attempts(rate_key: str, client_ip: Optional[str] = None):
    cache_service.rate_limit_reset(rate_key)
    if client_ip:
        user_ip_key = f"auth:user_ip:{rate_key}:{client_ip}"
        cache_service.rate_limit_reset(user_ip_key)


@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    rate_key = form_data.username.strip().lower()
    client_ip = security_utils.get_client_ip(request, config.TRUST_PROXY_HEADERS)
    user_ip_key = f"auth:user_ip:{rate_key}:{client_ip}"

    try:
        with cache_service.rate_limit_user_lock(user_ip_key):
            _check_rate_limit(rate_key, client_ip=client_ip)

            tenant_slug = request.headers.get("X-Tenant-Slug", "default")
            # Resolve active institution from tenant_slug header
            inst = db.query(models.Institution).filter(models.Institution.slug == tenant_slug).first()
            if not inst:
                # Fallback to default institution if not found
                inst = db.query(models.Institution).filter(models.Institution.id == 1).first()
            institution_id = inst.id if inst else 1

            # For Default/System institution (id==1):
            # - ADMIN logins are restricted to System Owner only
            # - TEACHERS and STUDENTS of this institution CAN login normally
            _is_default_inst = (institution_id == 1)

            # 2. Try Admin/Teacher Login
            user = crud.get_user_by_email(db, email=form_data.username, institution_id=institution_id)
            if user:
                # For default institution, only system owner can login as admin
                if _is_default_inst and user.role in ("admin",) and user.email.strip().lower() != config.SYSTEM_OWNER_EMAIL:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Default Institution admin access is restricted to the System Owner only."
                    )

                is_authenticated = False
                print(f"DEBUG AUTH USER: email={user.email}, inst_id={user.institution_id}, hash={user.password_hash}")
                res = security.verify_password(form_data.password, user.password_hash)
                print(f"DEBUG VERIFY RESULT: {res} for input password={form_data.password}")
                if res:
                    is_authenticated = True

                if not is_authenticated:
                    _record_failed_login(rate_key, client_ip=client_ip)
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Incorrect email or password",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
                if not user.is_active:
                    raise HTTPException(status_code=400, detail="Inactive user account.")

                # Transparent password hash upgrade if legacy format detected
                if security.needs_rehash(user.password_hash):
                    try:
                        user.password_hash = security.get_password_hash(form_data.password)
                        db.commit()
                    except Exception:
                        db.rollback()

                _reset_login_attempts(rate_key, client_ip=client_ip)
                record_active_user(user.email, user.role)
                access_token = security.create_access_token(
                    data={"sub": user.email, "role": user.role, "institution_id": user.institution_id}
                )
                crud.create_audit_log(db, log=schemas.AuditLogCreate(user_email=user.email, action="Admin/User logged in."))
                return {"access_token": access_token, "token_type": "bearer"}

            # 3. Try Student Login
            student = crud.get_student_by_email(db, email=form_data.username, institution_id=institution_id)
            if student:
                is_valid = False
                if not student.password_hash:
                    if config.ALLOW_ROLL_PASSWORD and student.roll and form_data.password == student.roll:
                        is_valid = True
                        # Set initial password hash for roll password
                        student.password_hash = security.get_password_hash(form_data.password)
                        db.commit()
                elif security.verify_password(form_data.password, student.password_hash):
                    is_valid = True

                if not is_valid:
                    _record_failed_login(rate_key, client_ip=client_ip)
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Incorrect email or password",
                        headers={"WWW-Authenticate": "Bearer"},
                    )

                # Transparent password hash upgrade if legacy format detected
                if student.password_hash and security.needs_rehash(student.password_hash):
                    try:
                        student.password_hash = security.get_password_hash(form_data.password)
                        db.commit()
                    except Exception:
                        db.rollback()

                _reset_login_attempts(rate_key, client_ip=client_ip)
                record_active_user(student.email, "student")
                access_token = security.create_access_token(
                    data={"sub": student.email, "role": "student", "institution_id": student.institution_id}
                )
                crud.create_audit_log(db, log=schemas.AuditLogCreate(user_email=student.email, action="Student logged in."))
                return {"access_token": access_token, "token_type": "bearer"}

            _record_failed_login(rate_key, client_ip=client_ip)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except cache_service.LockAcquisitionError as err:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(err) or "Account login is currently processing another request. Please try again.",
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
            "institution_id": student.institution_id,
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
        "institution_id": user.institution_id,
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


from sqlalchemy import func

@router.post("/register/student", status_code=status.HTTP_201_CREATED)
def register_student_self(
    payload: schemas.StudentPublicRegister,
    db: Session = Depends(get_db)
):
    # Resolve institution by slug or master_key
    inst = db.query(models.Institution).filter(
        (func.lower(models.Institution.slug) == payload.institution_code.strip().lower()) |
        (models.Institution.master_key == payload.institution_code.strip())
    ).first()
    
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Institution Code or Slug! Please check the code provided by your college."
        )
        
    # Check if email already registered
    email_clean = payload.email.strip().lower()
    existing_student_email = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == inst.id,
        func.lower(models.StudentModel.email) == email_clean
    ).first()
    
    if existing_student_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A student with this Email is already registered under this institution."
        )
        
    # Check if roll number already registered
    roll_clean = payload.roll.strip().lower()
    existing_student_roll = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == inst.id,
        func.lower(models.StudentModel.roll) == roll_clean
    ).first()
    
    if existing_student_roll:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A student with this Roll Number is already registered under this institution."
        )
        
    hashed_pw = security.get_password_hash(payload.password)
    db_student = models.StudentModel(
        institution_id=inst.id,
        name=payload.name.strip(),
        email=email_clean,
        roll=payload.roll.strip(),
        password_hash=hashed_pw,
        dep=payload.dep.strip(),
        course=payload.course.strip(),
        year=payload.year.strip(),
        semester=payload.semester.strip(),
        gender=payload.gender,
        dob=payload.dob,
        phone=payload.phone,
        address=payload.address,
        parent_name=payload.parent_name,
        parent_email=payload.parent_email,
        parent_phone=payload.parent_phone
    )
    
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    
    # Audit log
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=email_clean,
            action=f"Student registered themselves under institution '{inst.name}'"
        ),
        institution_id=inst.id
    )
    
    return {"message": "Registration successful! You can now log in.", "student_id": db_student.id}


@router.post("/register/teacher", status_code=status.HTTP_201_CREATED)
def register_teacher_self(
    payload: schemas.TeacherPublicRegister,
    db: Session = Depends(get_db)
):
    # Resolve institution by slug or master_key
    inst = db.query(models.Institution).filter(
        (func.lower(models.Institution.slug) == payload.institution_code.strip().lower()) |
        (models.Institution.master_key == payload.institution_code.strip())
    ).first()
    
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Institution Code or Slug! Please check the code provided by your college."
        )
        
    # Check if email already registered
    email_clean = payload.email.strip().lower()
    existing_user_email = db.query(models.User).filter(
        models.User.institution_id == inst.id,
        func.lower(models.User.email) == email_clean
    ).first()
    
    if existing_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this Email is already registered under this institution."
        )
        
    hashed_pw = security.get_password_hash(payload.password)
    db_user = models.User(
        institution_id=inst.id,
        name=payload.name.strip(),
        email=email_clean,
        password_hash=hashed_pw,
        role="teacher",
        department=payload.department.strip(),
        is_active=True
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Audit log
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=email_clean,
            action=f"Teacher registered themselves under institution '{inst.name}'"
        ),
        institution_id=inst.id
    )
    
    return {"message": "Registration successful! You can now log in.", "user_id": db_user.id}


