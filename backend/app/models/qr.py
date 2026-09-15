"""models/qr.py — Qr domain models"""
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

class ConsumedQrToken(Base):
    """
    Tracks consumed student-presented QR tokens to prevent replay attacks.
    Enforces atomic one-time consumption per tenant and JTI.
    """
    __tablename__ = "used_qr_tokens"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    jti = Column(String(64), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=True, index=True)
    token_type = Column(String(30), default="student_qr")
    consumed_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)

    __table_args__ = (
        UniqueConstraint('institution_id', 'jti', name='_institution_qr_jti_uc'),
    )


class AttendanceFallbackSession(Base):
    """
    Time-bound biometric fallback authorization session.
    Generates rotating TOTP/HMAC QR codes (every 30s) and emergency PINs.
    """
    __tablename__ = "attendance_fallback_sessions"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_date = Column(String(20), nullable=False)
    session_secret = Column(String(64), nullable=False)  # Cryptographic seed for HMAC-SHA256
    session_pin = Column(String(10), nullable=False)     # 6-digit emergency PIN
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AttendanceFallbackClaim(Base):
    """
    Per-student claim tracking for teacher rolling dynamic QR fallback sessions.
    Guarantees each student can claim a session at most once.
    """
    __tablename__ = "attendance_fallback_claims"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_fallback_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    claimed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('session_id', 'student_id', name='_session_student_claim_uc'),
    )


__all__ = ['ConsumedQrToken', 'AttendanceFallbackSession', 'AttendanceFallbackClaim']
