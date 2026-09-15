"""models/device.py — Device domain models"""
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

class AttendanceDevice(Base):
    """
    Physical scanning kiosk, mobile checkpoint, or CCTV edge device record.
    Tracks health, camera status, sync backlogs, and heartbeat liveness.
    """
    __tablename__ = "attendance_devices"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    device_identifier = Column(String(100), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    location = Column(String(150), nullable=True)
    device_type = Column(String(50), default="KIOSK")  # KIOSK, MOBILE, CCTV, TABLET
    ip_address = Column(String(45), nullable=True)
    app_version = Column(String(50), nullable=True)
    status = Column(String(30), default="ONLINE", index=True)  # ONLINE, DEGRADED, OFFLINE, MAINTENANCE
    camera_status = Column(String(30), default="OK")  # OK, BLURRED, DISCONNECTED, ERROR
    battery_level = Column(Float, nullable=True)
    network_latency_ms = Column(Float, nullable=True)
    pending_sync_count = Column(Integer, default=0)
    last_heartbeat = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('institution_id', 'device_identifier', name='uq_device_institution_identifier'),
    )


class DeviceHeartbeatLog(Base):
    """Historical telemetry log for device uptime, battery, and camera health."""
    __tablename__ = "device_heartbeat_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(Integer, ForeignKey("attendance_devices.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), nullable=False)
    battery_level = Column(Float, nullable=True)
    camera_status = Column(String(30), nullable=True)
    network_latency_ms = Column(Float, nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())


class HardwareGateNode(Base):
    __tablename__ = "hardware_gate_nodes"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    node_code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    location = Column(String(100), nullable=True)
    secret_token = Column(String(100), nullable=False)
    relay_duration_ms = Column(Integer, default=3000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class HardwareGateLog(Base):
    __tablename__ = "hardware_gate_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    gate_code = Column(String(50), nullable=False)
    person_identifier = Column(String(100), nullable=True)
    status = Column(String(30), default="granted")  # granted, denied
    latency_ms = Column(Integer, default=45)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EdgeNode(Base):
    """Edge computing nodes (Raspberry Pi / local devices) registered for offline recognition."""
    __tablename__ = "edge_nodes"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    node_id = Column(String(64), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    location = Column(String(100), nullable=True)
    api_key_hash = Column(String(100), nullable=False)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CctvStream(Base):
    """CCTV camera stream registrations."""
    __tablename__ = "cctv_streams"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    room_name = Column(String(100), nullable=True)
    stream_url = Column(String(500), nullable=True)        # RTSP / HTTP URL
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WearableCheckIn(Base):
    """Wearable device (smartwatch) attendance check-ins."""
    __tablename__ = "wearable_checkins"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(String(100), nullable=False)
    device_type = Column(String(50), default="smartwatch") # smartwatch, fitbit, garmin
    heart_rate = Column(Integer, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ProxyAlert(Base):
    """Proxy/fake attendance detection alerts."""
    __tablename__ = "proxy_alerts"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    claimed_student_id = Column(Integer, nullable=False)
    detected_student_id = Column(Integer, nullable=True)
    confidence_score = Column(Float, default=0.0)
    alert_type = Column(String(50), default="face_mismatch")   # face_mismatch, location_anomaly, time_anomaly
    is_confirmed = Column(Boolean, default=False)
    reviewed_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SeatingChart(Base):
    """Classroom seating chart configuration."""
    __tablename__ = "seating_charts"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    exam_session_id = Column(Integer, ForeignKey("exam_sessions.id", ondelete="SET NULL"), nullable=True)
    room_name = Column(String(100), nullable=False)
    rows = Column(Integer, default=5)
    cols = Column(Integer, default=6)
    seats_json = Column(Text, nullable=False)              # [{row, col, student_id, student_name, roll}]
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


__all__ = ['AttendanceDevice', 'DeviceHeartbeatLog', 'HardwareGateNode', 'HardwareGateLog', 'EdgeNode', 'CctvStream', 'WearableCheckIn', 'ProxyAlert', 'SeatingChart']
