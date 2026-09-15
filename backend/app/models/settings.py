"""models/settings.py — Settings domain models"""
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

class SystemSettings(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    geofencing_enabled = Column(Boolean, default=False)
    center_latitude = Column(Float, default=28.6139)
    center_longitude = Column(Float, default=77.2090)
    allowed_radius_meters = Column(Float, default=100.0)
    ip_restriction_enabled = Column(Boolean, default=False)
    allowed_ip_ranges = Column(Text, default="127.0.0.1,192.168.1.0/24")
    latest_version = Column(String(50), nullable=True, default="1.0.1")
    update_download_url = Column(Text, nullable=True, default="")
    update_active = Column(Boolean, default=False)  # Toggle: True = update is live for all users
    update_beta_active = Column(Boolean, default=False)  # Owner-only beta channel for testing
    build_status = Column(String(50), nullable=True, default="idle")
    build_version = Column(String(50), nullable=True)
    build_error = Column(Text, nullable=True)
    update_rollout = Column(String(30), nullable=True, default="public")
    owner_preview_version = Column(String(50), nullable=True)
    owner_preview_download_url = Column(Text, nullable=True)
    # Production security & policy additions
    liveness_strict_mode = Column(Boolean, default=False)
    dispute_window_hours = Column(Integer, default=72)
    dispute_require_hod_approval = Column(Boolean, default=False)
    exam_attendance_policy = Column(String(30), default="count")  # 'count', 'exclude', 'separate'
    min_attendance_threshold = Column(Float, default=75.0)
    warning_threshold = Column(Float, default=75.0)
    critical_threshold = Column(Float, default=70.0)
    intervention_threshold = Column(Float, default=60.0)
    device_offline_timeout_minutes = Column(Integer, default=5)


class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(100), index=True)
    role = Column(String(50))
    type = Column(String(50)) # 'bug', 'suggestion', 'general'
    message = Column(Text, nullable=False)
    rating = Column(Integer, default=5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CustomReportConfig(Base):
    """User-saved custom report configurations."""
    __tablename__ = "custom_report_configs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    columns_json = Column(Text, nullable=False)            # Selected columns
    filters_json = Column(Text, nullable=True)             # Applied filters
    chart_type = Column(String(30), nullable=True)
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SavedReport(Base):
    __tablename__ = "saved_reports"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    config_json = Column(Text, nullable=False)
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class I18nTranslation(Base):
    """Custom institution-level translations for UI strings."""
    __tablename__ = "i18n_translations"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    locale = Column(String(10), nullable=False)            # hi, ta, te, mr, bn, en
    key = Column(String(200), nullable=False)
    value = Column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint('institution_id', 'locale', 'key', name='_i18n_key_uc'),
    )


class TaskQueue(Base):
    """Background task queue for heavy operations (face recognition batches etc.)."""
    __tablename__ = "task_queue"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    task_type = Column(String(80), nullable=False)         # "batch_recognition", "report_gen", "email_blast"
    payload_json = Column(Text, nullable=True)
    status = Column(String(20), default="pending")         # pending, running, done, failed
    result_json = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    retries = Column(Integer, default=0)
    created_by = Column(String(100), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LmsIntegrationConfig(Base):
    """Configuration for external LMS/SIS provider (Canvas, Moodle, Blackboard, ERP)."""
    __tablename__ = "lms_integration_configs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    provider = Column(String(50), default="CUSTOM_REST")  # CANVAS, MOODLE, BLACKBOARD, CUSTOM_REST
    api_endpoint = Column(String(255), nullable=False)
    api_token = Column(String(255), nullable=True)
    sync_schedule_cron = Column(String(50), default="0 23 * * *")
    auto_sync_enabled = Column(Boolean, default=False)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class LmsSyncJobLog(Base):
    """Historical telemetry log for inbound/outbound LMS synchronization cycles."""
    __tablename__ = "lms_sync_job_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    job_type = Column(String(50), nullable=False)  # OUTBOUND_ATTENDANCE, INBOUND_ROSTER
    status = Column(String(30), default="SUCCESS")  # SUCCESS, FAILED, PARTIAL
    records_processed = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


__all__ = ['SystemSettings', 'Feedback', 'CustomReportConfig', 'SavedReport', 'I18nTranslation', 'TaskQueue', 'LmsIntegrationConfig', 'LmsSyncJobLog']
