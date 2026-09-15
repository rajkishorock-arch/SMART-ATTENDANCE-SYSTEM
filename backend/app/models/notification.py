"""models/notification.py — Notification domain models"""
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

class NotificationModel(Base):
    """Real-time in-app and push notification system repository."""
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_id = Column(Integer, nullable=True, index=True)  # Student/User ID or None for broadcast
    recipient_email = Column(String(120), nullable=True, index=True)
    recipient_role = Column(String(30), nullable=False, index=True)  # student, teacher, admin, hod
    category = Column(String(30), default="SYSTEM", index=True)  # DISPUTE, LEAVE, ATTENDANCE, SYSTEM
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    action_url = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class DeviceTokenModel(Base):
    """FCM / Mobile Push Notification token register."""
    __tablename__ = "device_push_tokens"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_email = Column(String(120), nullable=False, index=True)
    role = Column(String(30), nullable=False, index=True)
    push_token = Column(String(255), nullable=False, index=True)
    device_platform = Column(String(30), default="android")
    is_active = Column(Boolean, default=True, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class NotificationPreferenceModel(Base):
    """User-specific category toggles & quiet hours for notifications."""
    __tablename__ = "notification_preferences"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_email = Column(String(120), nullable=False, index=True)
    attendance_enabled = Column(Boolean, default=True)
    leave_dispute_enabled = Column(Boolean, default=True)
    class_reminders_enabled = Column(Boolean, default=True)
    security_enabled = Column(Boolean, default=True)
    promotional_enabled = Column(Boolean, default=False)
    quiet_hours_enabled = Column(Boolean, default=False)
    quiet_start_time = Column(String(5), default="22:00")
    quiet_end_time = Column(String(5), default="07:00")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


__all__ = ['NotificationModel', 'DeviceTokenModel', 'NotificationPreferenceModel']
