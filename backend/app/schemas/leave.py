"""schemas/leave.py — Leave domain schemas"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.common import _OrmBase

class LeaveRequestBase(BaseModel):
    start_date: str
    end_date: str
    leave_type: str
    reason: str
    subject_id: Optional[int] = None


class LeaveRequestCreate(LeaveRequestBase):
    pass


class LeaveRequestResponse(_OrmBase):
    id: int
    student_id: Optional[int] = None
    student_name: Optional[str] = None
    student_roll: Optional[str] = None
    student_dep: Optional[str] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    start_date: Optional[str] = ""
    end_date: Optional[str] = ""
    leave_type: Optional[str] = "Medical"
    reason: Optional[str] = ""
    status: Optional[str] = "Pending"
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class LeaveStatusUpdate(BaseModel):
    status: str     # "Approved" or "Rejected"


__all__ = ['LeaveRequestBase', 'LeaveRequestCreate', 'LeaveRequestResponse', 'LeaveStatusUpdate']
