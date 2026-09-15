"""models/wellness.py — Wellness domain models"""
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    Boolean,
    Float,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.sql import func
from app.models.base import Base

class MentalHealthCheckin(Base):
    __tablename__ = "mental_health_checkins"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_email = Column(String(100), nullable=False)
    mood = Column(String(30), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EmotionLog(Base):
    """Stores per-attendance emotion reading captured during face scan."""
    __tablename__ = "emotion_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    emotion = Column(String(30), nullable=False)          # happy, sad, angry, neutral, surprised, fearful, disgusted
    confidence = Column(Float, default=0.0)
    context = Column(String(50), nullable=True)            # "attendance", "proctoring"
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PredictedRisk(Base):
    """ML-predicted attendance risk per student, refreshed periodically."""
    __tablename__ = "predicted_risks"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_level = Column(String(20), nullable=False)        # "low", "medium", "high", "critical"
    risk_score = Column(Float, default=0.0)                # 0-100
    predicted_absence_days = Column(Integer, default=0)
    factors_json = Column(Text, nullable=True)             # JSON list of contributing factors
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('institution_id', 'student_id', name='_risk_student_inst_uc'),
    )


class FatigueLog(Base):
    """Drowsiness/fatigue detection readings during class."""
    __tablename__ = "fatigue_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    ear_value = Column(Float, nullable=True)               # Eye Aspect Ratio
    is_drowsy = Column(Boolean, default=False)
    alert_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AttentionLog(Base):
    """Attention tracking — gaze direction and phone usage events."""
    __tablename__ = "attention_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    gaze_direction = Column(String(30), nullable=True)     # "forward", "left", "right", "down"
    phone_detected = Column(Boolean, default=False)
    attention_score = Column(Float, default=100.0)         # 0-100
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WellnessCheckin(Base):
    """Student wellness check-in records (mood + notes)."""
    __tablename__ = "wellness_checkins"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    mood = Column(String(30), nullable=False)              # great, good, neutral, sad, stressed, anxious
    mood_score = Column(Integer, default=5)                # 1-10
    note = Column(Text, nullable=True)
    counselor_alerted = Column(Boolean, default=False)
    resolved = Column(Boolean, default=False)
    counselor_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


__all__ = ['MentalHealthCheckin', 'EmotionLog', 'PredictedRisk', 'FatigueLog', 'AttentionLog', 'WellnessCheckin']
