"""schemas/settings.py — Settings domain schemas"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.common import _OrmBase

class SystemSettingsBase(BaseModel):
    geofencing_enabled: bool
    center_latitude: float
    center_longitude: float
    allowed_radius_meters: float
    ip_restriction_enabled: bool
    allowed_ip_ranges: str
    latest_version: Optional[str] = "1.0.1"
    update_download_url: Optional[str] = ""
    update_active: Optional[bool] = False
    update_beta_active: Optional[bool] = False
    build_status: Optional[str] = "idle"
    build_version: Optional[str] = None
    build_error: Optional[str] = None
    liveness_strict_mode: Optional[bool] = False
    dispute_window_hours: Optional[int] = 72
    dispute_require_hod_approval: Optional[bool] = False
    exam_attendance_policy: Optional[str] = "count"
    min_attendance_threshold: Optional[float] = 75.0
    warning_threshold: Optional[float] = 75.0
    critical_threshold: Optional[float] = 70.0
    intervention_threshold: Optional[float] = 60.0
    device_offline_timeout_minutes: Optional[int] = 5


class SystemSettingsUpdate(BaseModel):
    geofencing_enabled: Optional[bool] = None
    center_latitude: Optional[float] = None
    center_longitude: Optional[float] = None
    allowed_radius_meters: Optional[float] = None
    ip_restriction_enabled: Optional[bool] = None
    allowed_ip_ranges: Optional[str] = None
    latest_version: Optional[str] = None
    update_download_url: Optional[str] = None
    update_active: Optional[bool] = None
    update_beta_active: Optional[bool] = None
    build_status: Optional[str] = None
    build_version: Optional[str] = None
    build_error: Optional[str] = None
    liveness_strict_mode: Optional[bool] = None
    dispute_window_hours: Optional[int] = None
    dispute_require_hod_approval: Optional[bool] = None
    exam_attendance_policy: Optional[str] = None
    min_attendance_threshold: Optional[float] = None
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None
    intervention_threshold: Optional[float] = None
    device_offline_timeout_minutes: Optional[int] = None


class SystemSettingsResponse(_OrmBase, SystemSettingsBase):
    id: int


class ReleaseUpdatePayload(BaseModel):
    master_password: str
    latest_version: str
    update_download_url: str
    release_notes: Optional[str] = ""


class ToggleUpdatePayload(BaseModel):
    master_password: str
    active: bool


class ToggleBetaPayload(BaseModel):
    master_password: str
    active: bool


class TriggerBuildPayload(BaseModel):
    master_password: str
    version: str


class BuildCallbackPayload(BaseModel):
    status: str
    version: str
    download_url: Optional[str] = None
    error: Optional[str] = None
    token: str


class FeedbackCreate(BaseModel):
    type: str
    message: str
    rating: int


class FeedbackResponse(_OrmBase):
    id: int
    user_id: Optional[int] = None
    user_email: str
    role: str
    type: str
    message: str
    rating: int
    created_at: datetime


__all__ = ['SystemSettingsBase', 'SystemSettingsUpdate', 'SystemSettingsResponse', 'ReleaseUpdatePayload', 'ToggleUpdatePayload', 'ToggleBetaPayload', 'TriggerBuildPayload', 'BuildCallbackPayload', 'FeedbackCreate', 'FeedbackResponse']
