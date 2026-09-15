"""models/attendance.py — Attendance domain models"""
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

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False, unique=True)
    department = Column(String(100), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class Schedule(Base):
    __tablename__ = "schedules"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    day_of_week = Column(String(20), nullable=False)
    start_time = Column(String(20), nullable=False)
    end_time = Column(String(20), nullable=False)


class AttendanceModel(Base):
    __tablename__ = "attendence"
    id = Column(String(50), primary_key=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    roll = Column(String(50))
    name = Column(String(100))
    department = Column(String(100))
    time = Column(String(20), primary_key=True)
    date = Column(String(20), primary_key=True)
    attendance = Column(String(20)) # 'Present', 'Absent', 'Late'
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    verification_method = Column(String(50), default="FACE_SCAN")  # FACE_SCAN, DYNAMIC_QR, DYNAMIC_QR_UNVERIFIED_LOCATION, SESSION_PIN, MANUAL_STAFF
    fallback_reason = Column(String(255), nullable=True)
    session_key = Column(String(255), unique=True, index=True, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            'institution_id', 'id', 'date', 'time', 'subject_id',
            name='_attendance_session_uc'
        ),
    )


class OfflineAttendanceQueue(Base):
    __tablename__ = "offline_attendance_queue"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(String(64), nullable=False, index=True)
    student_id = Column(Integer, nullable=False)
    subject_id = Column(Integer, nullable=True)
    marked_by = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    custom_date = Column(String(20), nullable=True)
    custom_time = Column(String(20), nullable=True)
    synced = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('institution_id', 'client_id', name='_offline_client_uc'),
    )


class AttendanceRule(Base):
    __tablename__ = "attendance_rules"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    rule_type = Column(String(50), nullable=False)  # min_percent, consecutive_absent, late_limit
    threshold = Column(Float, default=75.0)
    action = Column(String(80), default="alert")  # alert, block, notify_parent, escalate
    notify_roles = Column(String(200), default="admin,teacher")
    is_active = Column(Boolean, default=True)
    config_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AttendanceChainHash(Base):
    __tablename__ = "attendance_chain_hashes"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    block_hash = Column(String(64), nullable=False)
    prev_hash = Column(String(64), nullable=True)
    payload_json = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OfflineSyncLog(Base):
    """Logs for offline face recognition sync operations."""
    __tablename__ = "offline_sync_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(String(100), nullable=False, index=True)
    sync_type = Column(String(20), nullable=False)         # "download", "upload"
    records_count = Column(Integer, default=0)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    sync_metadata = Column(Text, nullable=True)             # JSON with errors, skipped records, etc.


class AttendanceDispute(Base):
    """
    Student-submitted attendance dispute / correction record.
    Preserves original recorded attendance and maintains complete audit trail.
    """
    __tablename__ = "attendance_disputes"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    attendance_id = Column(String(50), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    date = Column(String(20), nullable=False, index=True)
    session_time = Column(String(100), nullable=True)
    original_status = Column(String(20), nullable=False)
    requested_status = Column(String(20), nullable=False, default="Present")
    reason = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    proof_filename = Column(String(255), nullable=True)
    proof_content_type = Column(String(100), nullable=True)
    status = Column(String(30), default="SUBMITTED", index=True)
    reviewed_by = Column(String(100), nullable=True)
    reviewer_role = Column(String(50), nullable=True)
    reviewer_comments = Column(Text, nullable=True)
    escalated_to_hod = Column(Boolean, default=False)
    hod_reviewed_by = Column(String(100), nullable=True)
    hod_comments = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)


class DisputeComment(Base):
    """Communication thread and reviewer updates on a dispute."""
    __tablename__ = "dispute_comments"
    id = Column(Integer, primary_key=True, index=True)
    dispute_id = Column(Integer, ForeignKey("attendance_disputes.id", ondelete="CASCADE"), nullable=False, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    author_email = Column(String(100), nullable=False)
    author_role = Column(String(50), nullable=False)
    author_name = Column(String(100), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LowConfidenceReview(Base):
    """
    Staging entity for borderline/medium-confidence face recognitions (0.35 <= score < 0.50).
    Requires staff/teacher review before converting into verified attendance records.
    """
    __tablename__ = "low_confidence_reviews"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_roll = Column(String(45), nullable=False)
    candidate_name = Column(String(100), nullable=False)
    similarity_score = Column(Float, nullable=False)
    snapshot_path = Column(String(255), nullable=True)
    date = Column(String(20), nullable=False, index=True)
    session_time = Column(String(20), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    device_id = Column(String(100), nullable=True)
    status = Column(String(30), default="PENDING", index=True)  # PENDING, CONFIRMED, REJECTED, REASSIGNED
    reviewed_by = Column(String(100), nullable=True)
    reassigned_student_id = Column(Integer, nullable=True)
    reviewer_comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)


class AttendanceIntervention(Base):
    """
    Tiered academic attendance intervention record:
    - Tier 1 (70% - 74.9%): Academic Warning
    - Tier 2 (60% - 69.9%): Parent Notification & Counselor Alert
    - Tier 3 (< 60%): Critical / Exam Debarment Risk
    """
    __tablename__ = "attendance_interventions"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    tier = Column(String(30), nullable=False, index=True)  # WARNING, PARENT_ALERT, DEBARMENT_RISK
    attendance_percentage = Column(Float, nullable=False)
    status = Column(String(40), default="TRIGGERED", index=True)
    # TRIGGERED, PARENT_NOTIFIED, COUNSELOR_MEETING_SCHEDULED, RESOLVED
    counselor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)
    parent_contacted_at = Column(DateTime(timezone=True), nullable=True)
    meeting_date = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)


__all__ = ['Subject', 'Schedule', 'AttendanceModel', 'OfflineAttendanceQueue', 'AttendanceRule', 'AttendanceChainHash', 'OfflineSyncLog', 'AttendanceDispute', 'DisputeComment', 'LowConfidenceReview', 'AttendanceIntervention']
