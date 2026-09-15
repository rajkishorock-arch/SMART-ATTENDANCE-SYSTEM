"""models/student.py — Student domain models"""
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

class StudentModel(Base):
    __tablename__ = "student"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    dep = Column(String(100))
    course = Column(String(100))
    year = Column(String(45))
    semester = Column(String(45))
    name = Column(String(100))
    div = Column(String(45))
    roll = Column(String(45))
    gender = Column(String(45))
    dob = Column(String(45))
    email = Column(String(100))
    phone = Column(String(45))
    address = Column(String(255))
    teacher = Column(String(100))
    photo = Column(String(45))
    password_hash = Column(String(255), nullable=True)
    face_embedding = Column(Text, nullable=True)
    face_enrolled_at = Column(DateTime(timezone=True), nullable=True)
    parent_name = Column(String(100), nullable=True)
    parent_email = Column(String(100), nullable=True)
    parent_phone = Column(String(45), nullable=True)
    consent_given = Column(Boolean, default=False)
    consent_at = Column(DateTime(timezone=True), nullable=True)
    attendance_points = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_present_date = Column(String(20), nullable=True)
    badges_json = Column(Text, nullable=True)
    estimated_age = Column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint('institution_id', 'roll', name='_institution_roll_uc'),
    )


class FaceEnrollmentSample(Base):
    """
    Multi-angle facial enrollment sample with biometric quality telemetry
    (blur variance, illumination range, face size, and pose angle).
    """
    __tablename__ = "face_enrollment_samples"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    pose = Column(String(20), default="FRONT")  # FRONT, LEFT, RIGHT
    sample_quality_score = Column(Float, default=1.0)
    blur_score = Column(Float, nullable=True)
    brightness_score = Column(Float, nullable=True)
    image_path = Column(String(255), nullable=True)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())


class ReEnrollmentRequest(Base):
    """Workflow record requesting or authorizing a student biometric re-scan."""
    __tablename__ = "re_enrollment_requests"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String(50), nullable=False)  # FACIAL_CHANGE, LOW_QUALITY, SURGERY_GLASSES, ROUTINE_EXPIRY
    description = Column(Text, nullable=True)
    status = Column(String(30), default="PENDING", index=True)  # PENDING, APPROVED, REJECTED, COMPLETED
    requested_by = Column(String(100), nullable=False)
    approved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)


__all__ = ['StudentModel', 'FaceEnrollmentSample', 'ReEnrollmentRequest']
