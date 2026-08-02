"""
Feature 28 & 39: Student Wellness Score + Counselor Alert System
Combines attendance %, mood history, and activity to compute wellness score.
Automatically alerts counselor when score drops critically.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


def _compute_wellness(db: Session, student_id: int, institution_id: int) -> dict:
    """Compute wellness score from attendance + mood + streak."""
    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id,
        models.StudentModel.institution_id == institution_id,
    ).first()
    if not student:
        return {"score": 0, "components": {}}

    # Attendance component (40 pts max)
    logs = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == institution_id
    ).all()
    total_days = len(set(l.date for l in logs)) or 1
    s_logs = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.id == str(student_id),
        models.AttendanceModel.institution_id == institution_id,
        models.AttendanceModel.attendance == "Present",
    ).all()
    att_pct = len(set(l.date for l in s_logs)) / total_days * 100.0
    att_score = min(40.0, att_pct * 0.4)

    # Mood component (30 pts max) — from last 10 emotion logs
    emotion_map = {"happy": 1.0, "surprised": 0.7, "neutral": 0.5, "sad": -0.3, "fearful": -0.4, "angry": -0.5, "disgusted": -0.6}
    recent_emotions = db.query(models.EmotionLog).filter(
        models.EmotionLog.student_id == student_id,
        models.EmotionLog.institution_id == institution_id,
    ).order_by(models.EmotionLog.created_at.desc()).limit(10).all()

    mood_score = 15.0  # neutral baseline
    if recent_emotions:
        avg_mood = sum(emotion_map.get(e.emotion, 0.0) for e in recent_emotions) / len(recent_emotions)
        mood_score = max(0.0, min(30.0, 15.0 + avg_mood * 15.0))

    # Streak component (20 pts max)
    streak = student.streak_days or 0
    streak_score = min(20.0, streak * 1.5)

    # Wellness checkins (10 pts max)
    recent_checkins = db.query(models.WellnessCheckin).filter(
        models.WellnessCheckin.student_id == student_id,
        models.WellnessCheckin.institution_id == institution_id,
    ).order_by(models.WellnessCheckin.created_at.desc()).limit(5).all()

    checkin_score = 5.0
    if recent_checkins:
        avg_mood_score = sum(c.mood_score or 5 for c in recent_checkins) / len(recent_checkins)
        checkin_score = min(10.0, avg_mood_score)

    total = round(att_score + mood_score + streak_score + checkin_score, 1)
    level = "excellent" if total >= 80 else "good" if total >= 60 else "fair" if total >= 40 else "at_risk"

    return {
        "student_id": student_id,
        "name": student.name,
        "roll": student.roll,
        "score": total,
        "level": level,
        "components": {
            "attendance": round(att_score, 1),
            "mood": round(mood_score, 1),
            "streak": round(streak_score, 1),
            "wellness_checkins": round(checkin_score, 1),
        },
        "attendance_pct": round(att_pct, 1),
    }


@router.get("/score/{student_id}")
def get_wellness_score(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get wellness score for a specific student."""
    result = _compute_wellness(db, student_id, current_user.institution_id)
    if not result["score"] and not result["name"]:
        raise HTTPException(status_code=404, detail="Student not found.")
    return result


@router.get("/my-score")
def get_my_wellness_score(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """Student views their own wellness score."""
    return _compute_wellness(db, current_student.id, current_student.institution_id)


@router.post("/checkin")
def student_wellness_checkin(
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """Student submits daily wellness check-in."""
    mood = payload.get("mood", "neutral")
    mood_score = int(payload.get("mood_score", 5))
    note = payload.get("note", "")

    valid_moods = ["great", "good", "neutral", "sad", "stressed", "anxious"]
    if mood not in valid_moods:
        raise HTTPException(status_code=400, detail=f"Mood must be one of: {valid_moods}")

    checkin = models.WellnessCheckin(
        institution_id=current_student.institution_id,
        student_id=current_student.id,
        mood=mood,
        mood_score=min(10, max(1, mood_score)),
        note=note,
        counselor_alerted=False,
    )
    db.add(checkin)
    db.commit()

    # Counselor alert if mood is very low
    if mood in ("stressed", "anxious") or mood_score <= 3:
        checkin.counselor_alerted = True
        db.commit()
        background_tasks.add_task(
            _alert_counselor, db, current_student.id, current_student.institution_id,
            current_student.name, mood, mood_score
        )

    return {
        "message": "Wellness check-in recorded.",
        "mood": mood,
        "score": mood_score,
        "counselor_alerted": checkin.counselor_alerted,
    }


async def _alert_counselor(db: Session, student_id: int, institution_id: int,
                            name: str, mood: str, score: int):
    """Create audit log and WebSocket alert for counselor."""
    try:
        crud.create_audit_log(
            db,
            log=schemas.AuditLogCreate(
                user_email="system@wellness",
                action=f"[COUNSELOR ALERT] Student '{name}' checked in with mood '{mood}' (score: {score}/10). Counselor review recommended.",
            ),
            institution_id=institution_id,
        )
        from .websocket_sync import push_alert
        await push_alert(
            institution_id,
            alert_type="wellness_alert",
            message=f"Wellness alert: {name} checked in with mood '{mood}' (score: {score}/10). Consider counselor outreach.",
            severity="warning",
        )
    except Exception as e:
        print(f"Counselor alert failed: {e}")


@router.get("/at-risk")
def get_at_risk_students(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get students with lowest wellness scores."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    students = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id
    ).all()

    scores = []
    for s in students:
        result = _compute_wellness(db, s.id, current_user.institution_id)
        scores.append(result)

    scores.sort(key=lambda x: x["score"])
    return {"at_risk_students": scores[:limit]}


@router.get("/dashboard")
def get_wellness_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Wellness dashboard summary for admin."""
    recent_checkins = db.query(models.WellnessCheckin).filter(
        models.WellnessCheckin.institution_id == current_user.institution_id
    ).order_by(models.WellnessCheckin.created_at.desc()).limit(100).all()

    mood_dist = {}
    for c in recent_checkins:
        mood_dist[c.mood] = mood_dist.get(c.mood, 0) + 1

    counselor_alerts = db.query(models.WellnessCheckin).filter(
        models.WellnessCheckin.institution_id == current_user.institution_id,
        models.WellnessCheckin.counselor_alerted == True,
    ).count()

    return {
        "recent_checkins": len(recent_checkins),
        "mood_distribution": mood_dist,
        "counselor_alerts": counselor_alerts,
    }
