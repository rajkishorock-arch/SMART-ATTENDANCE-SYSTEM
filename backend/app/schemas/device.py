"""schemas/device.py — Device domain schemas"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.common import _OrmBase

class AttendanceDeviceBase(BaseModel):
    device_identifier: str
    name: str
    location: Optional[str] = None
    device_type: str = "KIOSK"
    app_version: Optional[str] = None


class AttendanceDeviceCreate(AttendanceDeviceBase):
    pass


class AttendanceDeviceUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    camera_status: Optional[str] = None


class AttendanceDeviceResponse(_OrmBase, AttendanceDeviceBase):
    id: int
    institution_id: int
    status: str
    camera_status: str
    battery_level: Optional[float] = None
    network_latency_ms: Optional[float] = None
    pending_sync_count: int
    last_heartbeat: datetime
    is_online: bool
    minutes_since_heartbeat: float


class DeviceHeartbeatPayload(BaseModel):
    device_identifier: str
    status: Optional[str] = "ONLINE"
    battery_level: Optional[float] = None
    camera_status: Optional[str] = "OK"
    network_latency_ms: Optional[float] = None
    pending_sync_count: Optional[int] = 0
    app_version: Optional[str] = None


class DeviceFleetSummary(BaseModel):
    total_devices: int
    online_count: int
    offline_count: int
    degraded_count: int
    healthy_cameras: int
    alerts_count: int


__all__ = ['AttendanceDeviceBase', 'AttendanceDeviceCreate', 'AttendanceDeviceUpdate', 'AttendanceDeviceResponse', 'DeviceHeartbeatPayload', 'DeviceFleetSummary']
