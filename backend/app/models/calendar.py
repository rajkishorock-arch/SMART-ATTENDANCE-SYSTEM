"""models/calendar.py — Calendar domain models"""
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

class CalendarEvent(Base):
    """
    Academic Calendar Engine event record.
    Differentiates Working Days, Holidays, Class Cancellations, Exams, Events, and Teacher Substitutions.
    """
    __tablename__ = "academic_calendar_events"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String(50), nullable=False, index=True)
    # HOLIDAY, EXAM, CLASS_CANCELLED, SUBSTITUTE_CLASS, INSTITUTION_CLOSED, SPECIAL_CLASS, EVENT, WORKING_DAY, TEACHER_SUBSTITUTION
    start_date = Column(String(20), nullable=False, index=True)
    end_date = Column(String(20), nullable=True)
    start_time = Column(String(20), nullable=True)
    end_time = Column(String(20), nullable=True)
    department = Column(String(100), nullable=True, index=True)
    course = Column(String(100), nullable=True)
    semester = Column(String(45), nullable=True)
    section = Column(String(45), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    substitute_teacher_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    substitute_reason = Column(String(200), nullable=True)
    status = Column(String(30), default="ACTIVE") # ACTIVE, CANCELLED, COMPLETED
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


__all__ = ['CalendarEvent']
