from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from . import models, security
from .database import get_db

router = APIRouter()
IST = timezone(timedelta(hours=5, minutes=30))

DAY_MAP = {
    0: "Monday", 1: "Tuesday", 2: "Wednesday",
    3: "Thursday", 4: "Friday", 5: "Saturday", 6: "Sunday",
}


def _parse_time(t: str) -> tuple:
    parts = t.replace(".", ":").split(":")
    h = int(parts[0]) if parts else 0
    m = int(parts[1]) if len(parts) > 1 else 0
    return h, m


@router.get("/current-session")
def get_current_session(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Auto-select subject/period based on today's timetable."""
    now = datetime.now(IST)
    today = DAY_MAP[now.weekday()]
    current_minutes = now.hour * 60 + now.minute

    query = db.query(models.Schedule).filter(
        models.Schedule.institution_id == current_user.institution_id,
        models.Schedule.day_of_week == today,
    )
    schedules = query.all()
    if not schedules:
        return {"active": False, "message": f"No schedules for {today}"}

    best = None
    for sched in schedules:
        sh, sm = _parse_time(sched.start_time)
        eh, em = _parse_time(sched.end_time)
        start_m = sh * 60 + sm
        end_m = eh * 60 + em
        if start_m <= current_minutes <= end_m:
            subject = db.query(models.Subject).filter(models.Subject.id == sched.subject_id).first()
            if current_user.role == "teacher":
                if subject and subject.teacher_id != current_user.id:
                    continue
            best = {
                "subject_id": sched.subject_id,
                "subject_name": subject.name if subject else None,
                "subject_code": subject.code if subject else None,
                "period": f"{sched.start_time}-{sched.end_time}",
                "start_time": sched.start_time,
                "end_time": sched.end_time,
                "day_of_week": today,
            }
            break

    if not best:
        upcoming = []
        for sched in schedules:
            sh, sm = _parse_time(sched.start_time)
            if sh * 60 + sm > current_minutes:
                subject = db.query(models.Subject).filter(models.Subject.id == sched.subject_id).first()
                upcoming.append({
                    "subject_id": sched.subject_id,
                    "subject_name": subject.name if subject else None,
                    "start_time": sched.start_time,
                })
        return {
            "active": False,
            "message": "No class in progress right now",
            "upcoming": sorted(upcoming, key=lambda x: x["start_time"])[:3],
        }
    return {"active": True, "session": best}
