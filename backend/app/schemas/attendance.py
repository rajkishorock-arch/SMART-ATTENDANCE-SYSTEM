"""schemas/attendance.py — Attendance domain schemas"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.common import _OrmBase

class AttendanceBase(BaseModel):
    id: str
    roll: str
    name: str
    department: str
    time: str
    date: str
    attendance: str
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    period: Optional[str] = None
    period_label: Optional[str] = None
    remarks: Optional[str] = None
    marked_by: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    pass


class Attendance(_OrmBase, AttendanceBase):
    pass


class ManualAttendanceCreate(BaseModel):
    student_id: int
    attendance_status: str          # 'Present', 'Absent', 'Late'
    subject_id: Optional[int] = None
    custom_date: Optional[str] = None
    custom_time: Optional[str] = None
    remarks: Optional[str] = None


class SubjectBase(BaseModel):
    name: str
    code: str
    department: str
    teacher_id: Optional[int] = None


class SubjectCreate(SubjectBase):
    pass


class SubjectResponse(_OrmBase, SubjectBase):
    id: int
    teacher_name: Optional[str] = None


class ScheduleBase(BaseModel):
    subject_id: int
    day_of_week: str
    start_time: str
    end_time: str


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleResponse(_OrmBase, ScheduleBase):
    id: int
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None


class SubjectAttendancePlan(BaseModel):
    subject_id: int
    subject_name: str
    subject_code: Optional[str] = None
    teacher_name: Optional[str] = None
    total_conducted: int
    total_attended: int
    current_percentage: float
    status: str  # SAFE, WARNING, CRITICAL
    target_percentage: float = 75.0
    classes_needed: int
    bunk_allowance: int
    projection_attend_next_3: float
    projection_miss_next_3: float


class WhatIfSimulationRequest(BaseModel):
    subject_id: Optional[int] = None
    target_percentage: float = 75.0
    upcoming_classes: int = 10
    planned_attend: int = 8


class WhatIfSimulationResult(BaseModel):
    current_percentage: float
    simulated_percentage: float
    current_status: str
    simulated_status: str
    target_percentage: float
    target_achieved: bool
    conducted_before: int
    conducted_after: int
    attended_before: int
    attended_after: int
    difference_percentage: float


class AttendancePlannerResponse(BaseModel):
    student_id: int
    student_name: str
    roll: str
    department: str
    overall_conducted: int
    overall_attended: int
    overall_percentage: float
    overall_status: str  # SAFE, WARNING, CRITICAL
    target_percentage: float = 75.0
    overall_classes_needed: int
    overall_bunk_allowance: int
    subjects: List[SubjectAttendancePlan]
    advice_message: str


class LowConfidenceReviewResponse(_OrmBase):
    id: int
    institution_id: int
    candidate_student_id: int
    candidate_roll: str
    candidate_name: str
    similarity_score: float
    snapshot_path: Optional[str] = None
    date: str
    session_time: Optional[str] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    device_id: Optional[str] = None
    status: str
    reviewed_by: Optional[str] = None
    reassigned_student_id: Optional[int] = None
    reviewer_comment: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None


class LowConfidenceResolvePayload(BaseModel):
    action: str  # CONFIRM, REJECT, REASSIGN
    reassign_to_roll: Optional[str] = None
    comment: Optional[str] = None


class AttendanceInterventionResponse(_OrmBase):
    id: int
    institution_id: int
    student_id: int
    student_name: str
    student_roll: str
    department: str
    tier: str  # WARNING, PARENT_ALERT, DEBARMENT_RISK
    attendance_percentage: float
    status: str
    counselor_id: Optional[int] = None
    counselor_name: Optional[str] = None
    notes: Optional[str] = None
    parent_contacted_at: Optional[datetime] = None
    meeting_date: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


class AssignCounselorPayload(BaseModel):
    counselor_id: int
    meeting_date: Optional[str] = None
    notes: Optional[str] = None


class ResolveInterventionPayload(BaseModel):
    notes: str


class InterventionSummary(BaseModel):
    total_interventions: int
    tier1_warning_count: int
    tier2_parent_alert_count: int
    tier3_debarment_risk_count: int
    resolved_count: int


class DisputeCreate(BaseModel):
    attendance_id: Optional[str] = None
    subject_id: Optional[int] = None
    date: str
    session_time: Optional[str] = None
    original_status: str
    requested_status: Optional[str] = "Present"
    reason: str
    description: Optional[str] = None


class DisputeReviewPayload(BaseModel):
    action: str # "APPROVE", "REJECT", "NEEDS_INFORMATION"
    comment: Optional[str] = None


class DisputeEscalatePayload(BaseModel):
    reason: Optional[str] = None


class DisputeCommentCreate(BaseModel):
    message: str


class DisputeCommentResponse(_OrmBase):
    id: int
    dispute_id: int
    author_email: str
    author_role: str
    author_name: Optional[str] = None
    message: str
    created_at: datetime


class DisputeResponse(_OrmBase):
    id: int
    institution_id: int
    attendance_id: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    student_roll: Optional[str] = None
    student_email: Optional[str] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    date: str
    session_time: Optional[str] = None
    original_status: str
    requested_status: str
    reason: str
    description: Optional[str] = None
    proof_filename: Optional[str] = None
    has_proof: bool = False
    status: str
    reviewed_by: Optional[str] = None
    reviewer_role: Optional[str] = None
    reviewer_comments: Optional[str] = None
    escalated_to_hod: bool = False
    hod_reviewed_by: Optional[str] = None
    hod_comments: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    comments: List[DisputeCommentResponse] = []


__all__ = ['AttendanceBase', 'AttendanceCreate', 'Attendance', 'ManualAttendanceCreate', 'SubjectBase', 'SubjectCreate', 'SubjectResponse', 'ScheduleBase', 'ScheduleCreate', 'ScheduleResponse', 'SubjectAttendancePlan', 'WhatIfSimulationRequest', 'WhatIfSimulationResult', 'AttendancePlannerResponse', 'LowConfidenceReviewResponse', 'LowConfidenceResolvePayload', 'AttendanceInterventionResponse', 'AssignCounselorPayload', 'ResolveInterventionPayload', 'InterventionSummary', 'DisputeCreate', 'DisputeReviewPayload', 'DisputeEscalatePayload', 'DisputeCommentCreate', 'DisputeCommentResponse', 'DisputeResponse']
