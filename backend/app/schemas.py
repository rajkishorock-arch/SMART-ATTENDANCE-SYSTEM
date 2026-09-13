"""
Pydantic v2 schemas — all Config classes use from_attributes=True only.
"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# ── Shared base config ────────────────────────────────────────────────────────
class _OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── Token ─────────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


# ── User (Admins / Teachers) ──────────────────────────────────────────────────
class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str
    role: Optional[str] = "admin"
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_department: Optional[str] = None


class User(_OrmBase, UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_department: Optional[str] = None


# ── Student ───────────────────────────────────────────────────────────────────
class StudentBase(BaseModel):
    id: int
    name: str
    roll: str
    dep: str
    course: str
    year: str
    semester: str
    gender: Optional[str] = None
    dob: Optional[str] = None
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    teacher: Optional[str] = None
    photo: Optional[str] = None


class StudentCreate(StudentBase):
    pass


class Student(_OrmBase, StudentBase):
    pass


# ── Attendance ────────────────────────────────────────────────────────────────
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


# ── Audit Log ─────────────────────────────────────────────────────────────────
class AuditLogCreate(BaseModel):
    user_email: str
    action: str
    role: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    ip_address: Optional[str] = None


class AuditLogResponse(_OrmBase):
    id: int
    institution_id: Optional[int] = None
    timestamp: Optional[datetime] = None
    user_email: str
    role: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    ip_address: Optional[str] = None


# ── Dashboard Stats ───────────────────────────────────────────────────────────
class DashboardStats(BaseModel):
    total_students: int
    total_present_today: int
    total_absent_today: int
    average_attendance_rate: float
    department_stats: Dict[str, int]
    weekly_trends: List[Dict[str, Any]]


# ── Student Self Service ──────────────────────────────────────────────────────
class StudentChangePassword(BaseModel):
    old_password: str
    new_password: str


# ── System Settings ───────────────────────────────────────────────────────────
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


# ── Manual Attendance ─────────────────────────────────────────────────────────
class ManualAttendanceCreate(BaseModel):
    student_id: int
    attendance_status: str          # 'Present', 'Absent', 'Late'
    subject_id: Optional[int] = None
    custom_date: Optional[str] = None
    custom_time: Optional[str] = None
    remarks: Optional[str] = None


# ── Premium Payloads ──────────────────────────────────────────────────────────
class OwnerPremiumGrantPayload(BaseModel):
    master_password: str
    institution_id: int
    plan: Optional[str] = "enterprise"
    student_limit: Optional[int] = 10000


class OwnerPremiumRevokePayload(BaseModel):
    master_password: str
    institution_id: int


# ── Subject ───────────────────────────────────────────────────────────────────
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


# ── Schedule ──────────────────────────────────────────────────────────────────
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


# ── User Update ───────────────────────────────────────────────────────────────
class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_department: Optional[str] = None


# ── Student Update ────────────────────────────────────────────────────────────
class StudentUpdate(BaseModel):
    name: Optional[str] = None
    roll: Optional[str] = None
    dep: Optional[str] = None
    course: Optional[str] = None
    year: Optional[str] = None
    semester: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    teacher: Optional[str] = None
    password: Optional[str] = None


# ── Feedback ──────────────────────────────────────────────────────────────────
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


# ── User Password Change ──────────────────────────────────────────────────────
class UserChangePassword(BaseModel):
    old_password: str
    new_password: str


# ── Institution ───────────────────────────────────────────────────────────────
class InstitutionBrandingResponse(_OrmBase):
    id: int
    name: str
    slug: str
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    app_name: Optional[str] = None
    custom_domain: Optional[str] = None
    subscription_plan: Optional[str] = None
    subscription_status: Optional[str] = None
    student_limit: Optional[int] = None


class InstitutionCreate(BaseModel):
    name: str
    slug: str
    primary_color: Optional[str] = "#4F46E5"
    secondary_color: Optional[str] = "#06B6D4"
    logo_url: Optional[str] = ""
    app_name: Optional[str] = None
    custom_domain: Optional[str] = None
    subscription_plan: Optional[str] = "free"
    student_limit: Optional[int] = None
    admin_email: EmailStr
    admin_name: str
    admin_password: str


class InstitutionMasterKeyUpdate(BaseModel):
    current_master_key: str
    new_master_key: str


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    logo_url: Optional[str] = None
    app_name: Optional[str] = None
    custom_domain: Optional[str] = None
    subscription_plan: Optional[str] = None
    subscription_status: Optional[str] = None
    student_limit: Optional[int] = None


# ── Department ────────────────────────────────────────────────────────────────
class DepartmentBase(BaseModel):
    name: str
    code: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    pass


class Department(_OrmBase, DepartmentBase):
    id: int
    institution_id: int


# ── Leave Management ──────────────────────────────────────────────────────────
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
    start_date: str
    end_date: str
    leave_type: str
    reason: str
    status: str
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime


class LeaveStatusUpdate(BaseModel):
    status: str     # "Approved" or "Rejected"


# ── Public Registration ───────────────────────────────────────────────────────
class StudentPublicRegister(BaseModel):
    name: str
    email: EmailStr
    roll: str
    password: str
    institution_code: str
    dep: str
    course: str
    year: str
    semester: str
    gender: Optional[str] = None
    dob: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_email: Optional[str] = None
    parent_phone: Optional[str] = None


class TeacherPublicRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    institution_code: str
    department: str


# ── Attendance Dispute & Correction (Phase 2) ─────────────────────────────────
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


# ── Academic Calendar Engine (Phase 3) ─────────────────────────────────────────
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


# ── Smart 75% Attendance Planner Schemas (Phase 4) ───────────────────────────

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


# ── Low-Confidence Review Queue Schemas (Phase 5) ─────────────────────────────

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


# ── Device & Kiosk Health Monitoring Schemas (Phase 6) ───────────────────────

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


# ── Face Enrollment QA & Multi-Sample Re-Enrollment Schemas (Phase 7) ────────

class FaceValidationResult(BaseModel):
    is_valid: bool
    face_count: int
    blur_score: float
    is_blurry: bool
    brightness_score: float
    is_illumination_good: bool
    face_width: Optional[int] = None
    face_height: Optional[int] = None
    is_face_size_good: bool
    duplicate_student_id: Optional[int] = None
    duplicate_student_name: Optional[str] = None
    duplicate_similarity: Optional[float] = None
    quality_rating: str  # EXCELLENT, GOOD, POOR, REJECTED
    feedback_message: str


class FaceSampleResponse(_OrmBase):
    id: int
    institution_id: int
    student_id: int
    pose: str
    sample_quality_score: float
    blur_score: Optional[float] = None
    brightness_score: Optional[float] = None
    image_url: Optional[str] = None
    enrolled_at: datetime


class ReEnrollmentRequestCreate(BaseModel):
    student_id: int
    reason: str  # FACIAL_CHANGE, LOW_QUALITY, SURGERY_GLASSES, ROUTINE_EXPIRY
    description: Optional[str] = None


class ReEnrollmentRequestResponse(_OrmBase):
    id: int
    institution_id: int
    student_id: int
    student_name: Optional[str] = None
    student_roll: Optional[str] = None
    reason: str
    description: Optional[str] = None
    status: str
    requested_by: str
    approved_by: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


# ── Counselor & Parent Intervention Schemas (Phase 8) ────────────────────────

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


# ── Biometric Fallback System Schemas (Phase 9) ───────────────────────────────

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


class ClaimPinPayload(BaseModel):
    session_id: int
    session_pin: str
    fallback_reason: str


class FallbackClaimResult(BaseModel):
    success: bool
    message: str
    verification_method: str
    attendance_record_id: str


# ── SIS & LMS Integration Schemas (Phase 10) ─────────────────────────────────

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


# ── Staff Attendance & Payroll Schemas (Phase 11) ────────────────────────────

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


