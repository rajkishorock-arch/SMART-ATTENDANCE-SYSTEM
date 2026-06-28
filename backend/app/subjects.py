from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from . import crud, schemas, models, security
from .database import get_db

router = APIRouter()

@router.post("/subjects", response_model=schemas.SubjectResponse)
def create_new_subject(
    subject: schemas.SubjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Create a new subject (Admins only).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can register new subjects."
        )
    # Check if subject code already exists within that institution
    existing = db.query(models.Subject).filter(
        models.Subject.code == subject.code,
        models.Subject.institution_id == current_user.institution_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Subject code already registered."
        )
    return crud.create_subject(db, subject, institution_id=current_user.institution_id)

@router.get("/subjects", response_model=List[schemas.SubjectResponse])
def read_subjects(
    db: Session = Depends(get_db),
    token: str = Depends(security.oauth2_scheme)
):
    """
    Fetch subjects. 
    If logged in as student, fetches subjects matching their department.
    If logged in as teacher, fetches subjects mapped to their user ID.
    If admin, fetches all subjects.
    """
    from jose import jwt, JWTError
    from .core import config
    
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        institution_id: Optional[int] = payload.get("institution_id")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
        
    db_subjects = []
    if role == "student":
        student = db.query(models.StudentModel).filter(
            models.StudentModel.email == email,
            models.StudentModel.institution_id == institution_id
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student record not found.")
        db_subjects = db.query(models.Subject).join(
            models.User, models.Subject.teacher_id == models.User.id
        ).filter(
            models.Subject.institution_id == institution_id,
            models.User.role == "teacher"
        ).all()
    else:
        user = db.query(models.User).filter(
            models.User.email == email,
            models.User.institution_id == institution_id
        ).first()
        if not user:
            raise HTTPException(status_code=404, detail="User record not found.")
        if user.role == "teacher":
            db_subjects = crud.get_subjects(db, teacher_id=user.id, institution_id=institution_id)
        else:  # admin
            db_subjects = db.query(models.Subject).join(
                models.User, models.Subject.teacher_id == models.User.id
            ).filter(
                models.Subject.institution_id == institution_id,
                models.User.role == "teacher"
            ).all()
            
    res = []
    for s in db_subjects:
        teacher_name = "Not Assigned"
        if s.teacher_id:
            teacher = db.query(models.User).filter(
                models.User.id == s.teacher_id,
                models.User.institution_id == institution_id
            ).first()
            if teacher:
                teacher_name = teacher.name
        res.append({
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "department": s.department,
            "teacher_id": s.teacher_id,
            "teacher_name": teacher_name
        })
    return res

@router.post("/schedules", response_model=schemas.ScheduleResponse)
def create_new_schedule(
    schedule: schemas.ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Register a weekly timetable slot (Admins only).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage timetables."
        )
    # Check that subject belongs to same institution
    subject = db.query(models.Subject).filter(
        models.Subject.id == schedule.subject_id,
        models.Subject.institution_id == current_user.institution_id
    ).first()
    if not subject:
        raise HTTPException(status_code=400, detail="Invalid subject ID for your institution.")
    return crud.create_schedule(db, schedule, institution_id=current_user.institution_id)

@router.get("/schedules", response_model=List[schemas.ScheduleResponse])
def read_schedules(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Fetch timetable schedules (Admins and Teachers only).
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student scheduling views not authorized here."
        )
    schedules = crud.get_schedules(db, institution_id=current_user.institution_id)
    res = []
    for sc in schedules:
        sub = db.query(models.Subject).filter(
            models.Subject.id == sc.subject_id,
            models.Subject.institution_id == current_user.institution_id
        ).first()
        res.append({
            "id": sc.id,
            "subject_id": sc.subject_id,
            "day_of_week": sc.day_of_week,
            "start_time": sc.start_time,
            "end_time": sc.end_time,
            "subject_name": sub.name if sub else "Unknown",
            "subject_code": sub.code if sub else "Unknown"
        })
    return res
