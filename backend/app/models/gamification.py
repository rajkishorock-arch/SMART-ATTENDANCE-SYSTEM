"""models/gamification.py — Gamification domain models"""
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

class GamificationBadge(Base):
    """Badge definitions for the gamification system."""
    __tablename__ = "gamification_badges"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    badge_key = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    icon_emoji = Column(String(10), nullable=True)
    points_required = Column(Integer, default=0)
    streak_required = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)


class StudentBadge(Base):
    """Records which badges a student has earned."""
    __tablename__ = "student_badges"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_key = Column(String(50), nullable=False)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('student_id', 'badge_key', name='_student_badge_uc'),
    )


class RewardRedemption(Base):
    """Student reward redemption records."""
    __tablename__ = "reward_redemptions"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    reward_name = Column(String(100), nullable=False)
    points_spent = Column(Integer, nullable=False)
    status = Column(String(20), default="pending")         # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PeerStudyGroup(Base):
    __tablename__ = "peer_study_groups"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    members_json = Column(Text, default="[]")
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InteractivePoll(Base):
    __tablename__ = "interactive_polls"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(String(500), nullable=False)
    options_json = Column(Text, nullable=False)  # JSON array of option strings
    votes_json = Column(Text, default="{}")  # JSON map option_index -> count
    created_by = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BotConversationLog(Base):
    __tablename__ = "bot_conversation_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String(30), default="whatsapp")  # whatsapp, telegram, web
    sender_phone_or_id = Column(String(50), nullable=False)
    user_query = Column(Text, nullable=False)
    bot_response = Column(Text, nullable=False)
    intent_detected = Column(String(50), default="general_query")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ExamSession(Base):
    __tablename__ = "exam_sessions"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    hall_name = Column(String(120), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    start_time = Column(String(20), nullable=True)
    end_time = Column(String(20), nullable=True)
    geofence_strict = Column(Boolean, default=True)
    is_active = Column(Boolean, default=False)
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ExamProctorLog(Base):
    """Exam proctoring session logs — face checks, violations, alerts."""
    __tablename__ = "exam_proctor_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)        # "verified", "face_mismatch", "multiple_faces", "no_face", "gaze_away"
    severity = Column(String(20), default="info")          # info, warning, critical
    details = Column(Text, nullable=True)
    snapshot_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GeneratedTimetable(Base):
    """AI-generated timetable entries."""
    __tablename__ = "generated_timetables"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    version_label = Column(String(50), nullable=False)
    timetable_json = Column(Text, nullable=False)          # Full timetable as JSON
    is_active = Column(Boolean, default=False)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CrowdSnapshot(Base):
    """Crowd density readings per classroom session."""
    __tablename__ = "crowd_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    room_name = Column(String(100), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    person_count = Column(Integer, default=0)
    density_level = Column(String(20), default="normal")   # low, normal, high, overcrowded
    heatmap_data_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FeeAttendanceFlag(Base):
    """Fee-attendance link flags for students below threshold."""
    __tablename__ = "fee_attendance_flags"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    attendance_percentage = Column(Float, default=0.0)
    threshold = Column(Float, default=75.0)
    flag_type = Column(String(30), default="warning")      # warning, block, scholarship_risk
    is_resolved = Column(Boolean, default=False)
    flagged_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('institution_id', 'student_id', name='_fee_flag_student_uc'),
    )


class BlockchainBlock(Base):
    """Immutable attendance blockchain ledger blocks."""
    __tablename__ = "blockchain_blocks"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    block_index = Column(Integer, nullable=False)
    block_hash = Column(String(64), nullable=False, unique=True)
    prev_hash = Column(String(64), nullable=False)
    merkle_root = Column(String(64), nullable=True)
    payload_json = Column(Text, nullable=False)            # attendance records in this block
    nonce = Column(Integer, default=0)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ExtremeFeatureRecord(Base):
    __tablename__ = "extreme_feature_records"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_key = Column(String(80), nullable=False, index=True)
    data_json = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


__all__ = ['GamificationBadge', 'StudentBadge', 'RewardRedemption', 'PeerStudyGroup', 'InteractivePoll', 'BotConversationLog', 'ExamSession', 'ExamProctorLog', 'GeneratedTimetable', 'CrowdSnapshot', 'FeeAttendanceFlag', 'BlockchainBlock', 'ExtremeFeatureRecord']
