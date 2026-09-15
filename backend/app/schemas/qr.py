"""schemas/qr.py — Qr domain schemas"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.common import _OrmBase

class FallbackSessionCreate(BaseModel):
    subject_id: int
    session_date: Optional[str] = None
    duration_minutes: Optional[int] = 60


class FallbackSessionResponse(_OrmBase):
    id: int
    institution_id: int
    subject_id: int
    teacher_id: int
    session_date: str
    session_pin: str
    expires_at: datetime
    is_active: bool
    created_at: datetime


class ActiveRollingTokenResponse(BaseModel):
    session_id: int
    token: str
    seconds_remaining: int
    expires_in: int = 30


class ClaimQrPayload(BaseModel):
    token: str
    fallback_reason: Optional[str] = "Camera failure / optical occlusion"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ClaimPinPayload(BaseModel):
    session_id: int
    session_pin: str
    fallback_reason: str


class FallbackClaimResult(BaseModel):
    success: bool
    message: str
    verification_method: str
    attendance_record_id: str
    geofence_verified: Optional[bool] = False


__all__ = ['FallbackSessionCreate', 'FallbackSessionResponse', 'ActiveRollingTokenResponse', 'ClaimQrPayload', 'ClaimPinPayload', 'FallbackClaimResult']
