"""schemas/lms_staff.py — Lms_staff domain schemas"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.common import _OrmBase

class LmsConfigPayload(BaseModel):
    provider: str = "CUSTOM_REST"  # CANVAS, MOODLE, BLACKBOARD, CUSTOM_REST
    api_endpoint: str
    api_token: Optional[str] = None
    sync_schedule_cron: Optional[str] = "0 23 * * *"
    auto_sync_enabled: Optional[bool] = False


class LmsConfigResponse(_OrmBase):
    id: int
    institution_id: int
    provider: str
    api_endpoint: str
    sync_schedule_cron: str
    auto_sync_enabled: bool
    last_sync_at: Optional[datetime] = None
    created_at: datetime


class LmsSyncTriggerResponse(BaseModel):
    job_id: int
    job_type: str
    status: str
    records_processed: int
    records_failed: int
    message: str


class LmsSyncLogResponse(_OrmBase):
    id: int
    institution_id: int
    job_type: str
    status: str
    records_processed: int
    records_failed: int
    error_message: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None


class StaffAttendanceResponse(_OrmBase):
    id: int
    institution_id: int
    user_id: int
    staff_name: Optional[str] = None
    staff_email: Optional[str] = None
    date: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    hours_worked: float
    overtime_hours: float
    status: str
    created_at: datetime


class StaffPayrollCalculatePayload(BaseModel):
    month_year: str  # MM/YYYY
    working_days: Optional[int] = 26
    default_base_salary: Optional[float] = 50000.0


class StaffPayrollResponse(_OrmBase):
    id: int
    institution_id: int
    user_id: int
    staff_name: Optional[str] = None
    staff_email: Optional[str] = None
    month_year: str
    base_salary: float
    working_days: int
    days_present: int
    days_half: int
    days_absent: int
    gross_salary: float
    deductions: float
    net_salary: float
    status: str
    generated_at: datetime


__all__ = ['LmsConfigPayload', 'LmsConfigResponse', 'LmsSyncTriggerResponse', 'LmsSyncLogResponse', 'StaffAttendanceResponse', 'StaffPayrollCalculatePayload', 'StaffPayrollResponse']
