from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from . import crud, schemas, security, models
from .database import get_db
from .core import config

router = APIRouter()

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    # 1. Try Admin/Teacher Login
    user = crud.get_user_by_email(db, email=form_data.username)
    if user:
        if not security.verify_password(form_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")

        access_token = security.create_access_token(data={"sub": user.email, "role": user.role})
        
        # Log the login event
        crud.create_audit_log(db, log=schemas.AuditLogCreate(user_email=user.email, action=f"Admin/User logged in."))
        return {"access_token": access_token, "token_type": "bearer"}

    # 2. Try Student Login
    student = crud.get_student_by_email(db, email=form_data.username)
    if student:
        is_valid = False
        if not student.password_hash:
            if student.roll and form_data.password == student.roll:
                is_valid = True
        else:
            if security.verify_password(form_data.password, student.password_hash):
                is_valid = True

        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token = security.create_access_token(data={"sub": student.email, "role": "student"})
        
        # Log the login event
        crud.create_audit_log(db, log=schemas.AuditLogCreate(user_email=student.email, action=f"Student logged in."))
        return {"access_token": access_token, "token_type": "bearer"}

    # 3. Neither admin nor student found
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
        role: str = payload.get("role", "admin")  # Default to admin for backward compatibility
        if email is None:
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
    else:
        user = crud.get_user_by_email(db, email=email)
        if not user or not user.is_active:
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