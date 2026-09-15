"""schemas/calendar.py — Calendar domain schemas"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.common import _OrmBase

class CalendarEventBase(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str # HOLIDAY, EXAM, CLASS_CANCELLED, SUBSTITUTE_CLASS, INSTITUTION_CLOSED, SPECIAL_CLASS, EVENT, WORKING_DAY, TEACHER_SUBSTITUTION
    start_date: str
    end_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    semester: Optional[str] = None
    section: Optional[str] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    substitute_teacher_id: Optional[int] = None
    substitute_reason: Optional[str] = None
    status: Optional[str] = "ACTIVE"


class CalendarEventCreate(CalendarEventBase):
    pass


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    semester: Optional[str] = None
    section: Optional[str] = None
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    substitute_teacher_id: Optional[int] = None
    substitute_reason: Optional[str] = None
    status: Optional[str] = None


class CalendarEventResponse(_OrmBase, CalendarEventBase):
    id: int
    institution_id: int
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_name: Optional[str] = None
    substitute_teacher_name: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime


class ClassCancellationPayload(BaseModel):
    subject_id: int
    date: str
    session_time: Optional[str] = None
    reason: str


class SubstituteTeacherPayload(BaseModel):
    subject_id: int
    date: str
    substitute_teacher_id: int
    reason: str


class CalendarAttendanceMetrics(BaseModel):
    scheduled_classes: int
    cancelled_classes: int
    conducted_classes: int
    attended_classes: int
    attendance_percentage: float
    is_at_risk: bool


__all__ = ['CalendarEventBase', 'CalendarEventCreate', 'CalendarEventUpdate', 'CalendarEventResponse', 'ClassCancellationPayload', 'SubstituteTeacherPayload', 'CalendarAttendanceMetrics']
