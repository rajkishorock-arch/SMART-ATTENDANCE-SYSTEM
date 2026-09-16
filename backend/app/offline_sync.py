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


import re

def validate_offline_item_date(custom_date: Optional[str]) -> Optional[str]:
    """
    Validates custom_date for offline attendance submission.
    Returns error string if invalid, or None if valid.
    Enforces format check (DD/MM/YYYY or YYYY-MM-DD), future date rejection,
    and 30-day bounded historical window.
    """
    if not custom_date:
        return None

    d_clean = str(custom_date).strip()
    parsed_date = None
    if "-" in d_clean:
        try:
            parsed_date = datetime.strptime(d_clean, "%Y-%m-%d").date()
        except ValueError:
            pass
    else:
        try:
            parsed_date = datetime.strptime(d_clean, "%d/%m/%Y").date()
        except ValueError:
            pass

    if parsed_date is None:
        return "Invalid date format. Expected DD/MM/YYYY or YYYY-MM-DD"

    today = datetime.now(IST).date()
    if parsed_date > today:
        return "Future attendance date is not allowed"

    min_allowed = today - timedelta(days=30)
    if parsed_date < min_allowed:
        return "Attendance date cannot be older than 30 days"

    return None


def validate_offline_item_time(custom_time: Optional[str]) -> Optional[str]:
    """
    Validates custom_time for offline attendance submission.
    Returns error string if invalid, or None if valid.
    Allows None/empty (which defaults to current server time).
    """
    if not custom_time:
        return None

    t_clean = str(custom_time).strip()

    # Check standard period label format (e.g. "Period 1", "Period 2 (10:00 - 11:00 AM)")
    if re.match(r"^Period\s*\d+", t_clean, re.IGNORECASE):
        return None

    # Check numeric period (1-8)
    if t_clean.isdigit() and 1 <= int(t_clean) <= 8:
        return None

    # Check timestamp formats
    for fmt in ("%H:%M:%S", "%H:%M", "%I:%M:%S %p", "%I:%M %p", "%H:%M:%S.%f"):
        try:
            datetime.strptime(t_clean, fmt)
            return None
        except ValueError:
            continue

    return "Invalid time format. Expected HH:MM:SS, HH:MM, or Period label"


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
        date_err = validate_offline_item_date(item.custom_date)
        if date_err:
            errors.append(f"Student {item.student_id}: {date_err}")
            continue
        time_err = validate_offline_item_time(item.custom_time)
        if time_err:
            errors.append(f"Student {item.student_id}: {time_err}")
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
