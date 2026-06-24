import csv
import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from . import models, schemas, security, crud
from .database import get_db
from .billing import ensure_student_capacity

router = APIRouter()


@router.post("/students")
async def bulk_import_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    created, skipped, errors = 0, 0, []
    for i, row in enumerate(reader, start=2):
        try:
            email = (row.get("email") or "").strip()
            roll = (row.get("roll") or "").strip()
            if not email or not roll:
                errors.append(f"Row {i}: email and roll required")
                continue
            existing = db.query(models.StudentModel).filter(
                models.StudentModel.institution_id == current_user.institution_id,
                models.StudentModel.roll == roll,
            ).first()
            if existing:
                skipped += 1
                continue
            ensure_student_capacity(db, current_user.institution_id, incoming=1)
            student = schemas.StudentCreate(
                id=0,
                name=row.get("name", "").strip() or roll,
                roll=roll,
                dep=row.get("dep", row.get("department", "")).strip() or "General",
                course=row.get("course", "").strip() or "B.Tech",
                year=row.get("year", "").strip() or "1",
                semester=row.get("semester", "").strip() or "1",
                email=email,
                phone=row.get("phone", "").strip() or None,
            )
            crud.create_student(db, student, institution_id=current_user.institution_id)
            created += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")
    crud.create_audit_log(
        db,
        schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Bulk imported students: {created} created, {skipped} skipped",
        ),
        institution_id=current_user.institution_id,
    )
    return {"created": created, "skipped": skipped, "errors": errors[:20]}


@router.post("/subjects")
async def bulk_import_subjects(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    created, skipped = 0, 0
    for row in reader:
        code = (row.get("code") or "").strip()
        if not code:
            continue
        existing = db.query(models.Subject).filter(models.Subject.code == code).first()
        if existing:
            skipped += 1
            continue
        crud.create_subject(
            db,
            schemas.SubjectCreate(
                name=row.get("name", code).strip(),
                code=code,
                department=row.get("department", "General").strip(),
            ),
            institution_id=current_user.institution_id,
        )
        created += 1
    return {"created": created, "skipped": skipped}


@router.post("/schedules")
async def bulk_import_schedules(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))
    created = 0
    for row in reader:
        code = (row.get("subject_code") or "").strip()
        subject = db.query(models.Subject).filter(
            models.Subject.code == code,
            models.Subject.institution_id == current_user.institution_id,
        ).first()
        if not subject:
            continue
        crud.create_schedule(
            db,
            schemas.ScheduleCreate(
                subject_id=subject.id,
                day_of_week=row.get("day_of_week", "Monday").strip(),
                start_time=row.get("start_time", "09:00").strip(),
                end_time=row.get("end_time", "10:00").strip(),
            ),
            institution_id=current_user.institution_id,
        )
        created += 1
    return {"created": created}


@router.get("/templates/{entity}")
def get_csv_template(entity: str):
    templates = {
        "students": "name,roll,email,dep,course,year,semester,phone\nJohn Doe,CS001,john@college.edu,CS,B.Tech,2,3,9876543210",
        "subjects": "name,code,department\nData Structures,CS201,CS",
        "schedules": "subject_code,day_of_week,start_time,end_time\nCS201,Monday,09:00,10:00",
    }
    if entity not in templates:
        raise HTTPException(status_code=404, detail="Unknown template")
    return {"entity": entity, "csv": templates[entity]}
