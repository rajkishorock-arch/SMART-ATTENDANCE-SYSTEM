from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from . import models, security, crud
from .database import get_db

router = APIRouter()
IST = timezone(timedelta(hours=5, minutes=30))


class OfflineMarkItem(BaseModel):
    client_id: str
    student_id: int
    subject_id: Optional[int] = None
    custom_date: Optional[str] = None
    custom_time: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class OfflineSyncRequest(BaseModel):
    items: List[OfflineMarkItem]


@router.post("/sync")
def sync_offline_attendance(
    payload: OfflineSyncRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff only")
    synced, skipped, errors = 0, 0, []
    for item in payload.items:
        existing_queue = db.query(models.OfflineAttendanceQueue).filter(
            models.OfflineAttendanceQueue.institution_id == current_user.institution_id,
            models.OfflineAttendanceQueue.client_id == item.client_id,
        ).first()
        if existing_queue:
            skipped += 1
            continue
        student = crud.get_student_by_id(db, item.student_id, current_user.institution_id)
        if not student:
            errors.append(f"Student {item.student_id} not found")
            continue
        try:
            _, newly_marked = crud.mark_student_attendance(
                db,
                student_id=item.student_id,
                name=student.name,
                roll=student.roll,
                dep=student.dep,
                subject_id=item.subject_id,
                custom_date=item.custom_date,
                custom_time=item.custom_time,
                institution_id=current_user.institution_id,
            )
            queue_entry = models.OfflineAttendanceQueue(
                institution_id=current_user.institution_id,
                client_id=item.client_id,
                student_id=item.student_id,
                subject_id=item.subject_id,
                marked_by=current_user.email,
                latitude=item.latitude,
                longitude=item.longitude,
                custom_date=item.custom_date,
                custom_time=item.custom_time,
                synced=True,
            )
            db.add(queue_entry)
            db.commit()
            if newly_marked:
                synced += 1
            else:
                skipped += 1
        except IntegrityError:
            db.rollback()
            skipped += 1
        except Exception as e:
            db.rollback()
            errors.append(str(e))
    return {"synced": synced, "skipped": skipped, "errors": errors[:10]}


@router.get("/status")
def offline_sync_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    count = db.query(models.OfflineAttendanceQueue).filter(
        models.OfflineAttendanceQueue.institution_id == current_user.institution_id,
        models.OfflineAttendanceQueue.synced == True,
    ).count()
    return {"total_synced_records": count}
