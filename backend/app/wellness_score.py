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


@router.get("/score/{institution_id}/{student_id}")
def get_wellness_score(
    institution_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get wellness score for a specific student."""
    result = _compute_wellness(db, student_id, institution_id)
    if not result.get("name"):
        raise HTTPException(status_code=404, detail="Student not found.")
    
    # Return format matching frontend expectations
    return {
        "score": result["score"],
        "level": result["level"],
        "breakdown": {
            "attendance_score": result["components"]["attendance"],
            "mood_score": result["components"]["mood"],
            "engagement_score": result["components"]["streak"],
            "overall_health": result["components"]["wellness_checkins"]
        },
        "attendance_percentage": result["attendance_pct"]
    }


@router.get("/my-score")
def get_my_wellness_score(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """Student views their own wellness score."""
    return _compute_wellness(db, current_student.id, current_student.institution_id)


@router.post("/checkin/{institution_id}")
def student_wellness_checkin(
    institution_id: int,
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Student submits daily wellness check-in (accessible by admin or student)."""
    student_id = payload.get("student_id")
    mood = payload.get("mood", "neutral")
    notes = payload.get("notes", "")
    
    if not student_id:
        raise HTTPException(status_code=400, detail="student_id is required")

    # Map frontend mood values to backend
    mood_map = {
        "happy": ("great", 8),
        "neutral": ("neutral", 5),
        "sad": ("sad", 3),
        "anxious": ("anxious", 2),
        "stressed": ("stressed", 2),
        "angry": ("sad", 3),
        "tired": ("neutral", 4),
        "excited": ("great", 9)
    }
    
    backend_mood, mood_score = mood_map.get(mood, ("neutral", 5))

    checkin = models.WellnessCheckin(
        institution_id=institution_id,
        student_id=student_id,
        mood=backend_mood,
        mood_score=mood_score,
        note=notes,
        counselor_alerted=False,
    )
    db.add(checkin)
    db.commit()

    # Get student info for alert
    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id,
        models.StudentModel.institution_id == institution_id
    ).first()

    # Counselor alert if mood is very low
    if backend_mood in ("stressed", "anxious", "sad") or mood_score <= 3:
        checkin.counselor_alerted = True
        db.commit()
        if student:
            background_tasks.add_task(
                _alert_counselor, db, student_id, institution_id,
                student.name, backend_mood, mood_score
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


@router.get("/mood-log/{institution_id}/{student_id}")
def get_student_mood_log(
    institution_id: int,
    student_id: int,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get mood check-in history for a student."""
    checkins = db.query(models.WellnessCheckin).filter(
        models.WellnessCheckin.institution_id == institution_id,
        models.WellnessCheckin.student_id == student_id,
    ).order_by(models.WellnessCheckin.created_at.desc()).limit(limit).all()
    
    # Map backend moods to frontend format
    mood_reverse_map = {
        "great": "happy",
        "good": "happy",
        "neutral": "neutral",
        "sad": "sad",
        "stressed": "stressed",
        "anxious": "anxious"
    }
    
    log = []
    for c in checkins:
        log.append({
            "mood": mood_reverse_map.get(c.mood, c.mood),
            "notes": c.note,
            "timestamp": c.created_at.isoformat() if c.created_at else None,
            "mood_score": c.mood_score
        })
    
    return {"log": log}


@router.get("/counselor-alerts/{institution_id}")
def get_counselor_alerts(
    institution_id: int,
    severity: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get wellness alerts for counselor review."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")
    
    # Get recent low-mood check-ins
    query = db.query(models.WellnessCheckin).filter(
        models.WellnessCheckin.institution_id == institution_id,
        models.WellnessCheckin.counselor_alerted == True,
        models.WellnessCheckin.resolved == False,
    )
    
    if severity == "high":
        query = query.filter(models.WellnessCheckin.mood_score <= 3)
    
    checkins = query.order_by(models.WellnessCheckin.created_at.desc()).limit(limit).all()
    
    alerts = []
    for c in checkins:
        student = db.query(models.StudentModel).filter(
            models.StudentModel.id == c.student_id,
            models.StudentModel.institution_id == institution_id
        ).first()
        
        # Compute current wellness score
        wellness = _compute_wellness(db, c.student_id, institution_id)
        
        alerts.append({
            "id": c.id,
            "student_id": c.student_id,
            "student_name": student.name if student else "Unknown",
            "reason": f"Low mood check-in: {c.mood} (score: {c.mood_score}/10)",
            "severity": "high" if c.mood_score <= 3 else "medium",
            "triggered_at": c.created_at.isoformat() if c.created_at else None,
            "resolved": c.resolved,
            "wellness_score": wellness.get("score", 0)
        })
    
    return {"alerts": alerts}


@router.post("/resolve-alert/{institution_id}/{alert_id}")
def resolve_counselor_alert(
    institution_id: int,
    alert_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Mark a counselor alert as resolved."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")
    
    checkin = db.query(models.WellnessCheckin).filter(
        models.WellnessCheckin.id == alert_id,
        models.WellnessCheckin.institution_id == institution_id
    ).first()
    
    if not checkin:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    checkin.resolved = True
    checkin.counselor_notes = payload.get("notes", "")
    checkin.resolved_at = datetime.now(IST)
    checkin.resolved_by = current_user.email
    
    db.commit()
    
    return {
        "success": True,
        "message": "Alert marked as resolved"
    }
