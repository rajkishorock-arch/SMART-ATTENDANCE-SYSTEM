"""
Wellness Service: business logic for computing student wellness scores and alerts.
Preserves multi-tenant isolation across attendance, emotion logs, and checkins.
"""
from typing import Dict, Any
from sqlalchemy.orm import Session

from app import models


class WellnessService:
    """Encapsulates student wellness score calculation and alert evaluation."""

    @staticmethod
    def compute_wellness_score(db: Session, student_id: int, institution_id: int) -> Dict[str, Any]:
        """Compute wellness score from attendance, mood history, streaks, and checkins."""
        student = db.query(models.StudentModel).filter(
            models.StudentModel.id == student_id,
            models.StudentModel.institution_id == institution_id,
        ).first()
        if not student:
            return {"score": 0, "components": {}}

        # 1. Attendance component (40 pts max)
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

        # 2. Mood component (30 pts max) — from last 10 emotion logs
        emotion_map = {
            "happy": 1.0,
            "surprised": 0.7,
            "neutral": 0.5,
            "sad": -0.3,
            "fearful": -0.4,
            "angry": -0.5,
            "disgusted": -0.6
        }
        recent_emotions = db.query(models.EmotionLog).filter(
            models.EmotionLog.student_id == student_id,
            models.EmotionLog.institution_id == institution_id,
        ).order_by(models.EmotionLog.created_at.desc()).limit(10).all()

        mood_score = 15.0  # neutral baseline
        if recent_emotions:
            avg_mood = sum(emotion_map.get(e.emotion, 0.0) for e in recent_emotions) / len(recent_emotions)
            mood_score = max(0.0, min(30.0, 15.0 + avg_mood * 15.0))

        # 3. Streak component (20 pts max)
        streak = getattr(student, "streak_days", 0) or 0
        streak_score = min(20.0, streak * 1.5)

        # 4. Wellness checkins (10 pts max)
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
