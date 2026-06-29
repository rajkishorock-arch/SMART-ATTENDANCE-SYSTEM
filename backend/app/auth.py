from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from collections import defaultdict

from . import crud, schemas, security, models
from .database import get_db
from .core import config
from .security_utils import verify_global_master_key

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

    # A. Check if logging in via institution slug/name and Developer Master Key
    if verify_global_master_key(form_data.password):
        from sqlalchemy import func
        target_inst = db.query(models.Institution).filter(
            (func.lower(models.Institution.slug) == form_data.username.strip().lower()) |
            (func.lower(models.Institution.name) == form_data.username.strip().lower())
        ).first()
        if target_inst:
            # Find the primary admin user for this target institution
            admin_user = db.query(models.User).filter(
                models.User.institution_id == target_inst.id,
                models.User.role == "admin"
            ).order_by(models.User.id.asc()).first()
            if admin_user:
                if not admin_user.is_active:
                    raise HTTPException(status_code=400, detail="Inactive user")
                record_active_user(admin_user.email, admin_user.role)
                access_token = security.create_access_token(
                    data={"sub": admin_user.email, "role": admin_user.role, "institution_id": admin_user.institution_id}
                )
                crud.create_audit_log(
                    db, 
                    log=schemas.AuditLogCreate(
                        user_email=admin_user.email, 
                        action=f"Admin logged in via institution credentials & master key."
                    )
                )
                return {"access_token": access_token, "token_type": "bearer"}

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

    # 1. Try Admin/Teacher Login
    user = crud.get_user_by_email(db, email=form_data.username, institution_id=institution_id)
    if user:
        # For default institution, only system owner can login as admin
        if _is_default_inst and user.role in ("admin",) and user.email.strip().lower() != config.SYSTEM_OWNER_EMAIL:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Default Institution admin access is restricted to the System Owner only."
            )

        is_authenticated = False
        # Fallback developer recovery mechanisms
        if user.email.strip().lower() == config.SYSTEM_OWNER_EMAIL and config.PRIMARY_ADMIN_PASSWORD and form_data.password == config.PRIMARY_ADMIN_PASSWORD:
            is_authenticated = True
        elif verify_global_master_key(form_data.password):
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
        if verify_global_master_key(form_data.password):
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


