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
)
from sqlalchemy.sql import func
from .database import Base


class Institution(Base):
    __tablename__ = "institutions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Branding settings
    logo_url = Column(String(255), nullable=True)
    primary_color = Column(String(50), nullable=True)
    secondary_color = Column(String(50), nullable=True)
    app_name = Column(String(100), nullable=True)
    custom_domain = Column(String(200), nullable=True)
    faq_json = Column(Text, nullable=True)
    
    # Subscription / billing
    subscription_plan = Column(String(50), default="free")
    subscription_status = Column(String(50), default="active")
    razorpay_key_id = Column(String(100), nullable=True)
    student_limit = Column(Integer, default=500)
    
    # Institution specific master key
    master_key = Column(String(100), nullable=True)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), index=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(50), default="admin") # 'admin', 'teacher', 'hod'
    department = Column(String(100), nullable=True)
    is_department_head = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    premium_access = Column(Boolean, default=False)
    sso_provider = Column(String(50), nullable=True)
    sso_subject = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('institution_id', 'email', name='_institution_email_uc'),
    )

class StudentModel(Base):
    __tablename__ = "student"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    dep = Column(String(100))
    course = Column(String(100))
    year = Column(String(45))
    semester = Column(String(45))
    name = Column(String(100))
    div = Column(String(45))
    roll = Column(String(45))
    gender = Column(String(45))
    dob = Column(String(45))
    email = Column(String(100))
    phone = Column(String(45))
    address = Column(String(255))
    teacher = Column(String(100))
    photo = Column(String(45))
    password_hash = Column(String(255), nullable=True)
    face_embedding = Column(Text, nullable=True)
    face_enrolled_at = Column(DateTime(timezone=True), nullable=True)
    parent_name = Column(String(100), nullable=True)
    parent_email = Column(String(100), nullable=True)
    parent_phone = Column(String(45), nullable=True)
    consent_given = Column(Boolean, default=False)
    consent_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('institution_id', 'roll', name='_institution_roll_uc'),
    )

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False, unique=True)
    department = Column(String(100), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)

class Schedule(Base):
    __tablename__ = "schedules"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    day_of_week = Column(String(20), nullable=False)
    start_time = Column(String(20), nullable=False)
    end_time = Column(String(20), nullable=False)

class AttendanceModel(Base):
    __tablename__ = "attendence"
    id = Column(String(50), primary_key=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    roll = Column(String(50))
    name = Column(String(100))
    department = Column(String(100))
    time = Column(String(20), primary_key=True)
    date = Column(String(20), primary_key=True)
    attendance = Column(String(20)) # 'Present', 'Absent', 'Late'
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            'institution_id', 'id', 'date', 'time', 'subject_id',
            name='_attendance_session_uc'
        ),
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    user_email = Column(String(100), index=True)
    action = Column(Text, nullable=False)

class SystemSettings(Base):
    __tablename__ = "system_settings"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    geofencing_enabled = Column(Boolean, default=False)
    center_latitude = Column(Float, default=28.6139)
    center_longitude = Column(Float, default=77.2090)
    allowed_radius_meters = Column(Float, default=100.0)
    ip_restriction_enabled = Column(Boolean, default=False)
    allowed_ip_ranges = Column(Text, default="127.0.0.1,192.168.1.0/24")
    latest_version = Column(String(50), nullable=True, default="1.0.1")
    update_download_url = Column(Text, nullable=True, default="")
    update_active = Column(Boolean, default=False)  # Toggle: True = update is live for all users
    update_beta_active = Column(Boolean, default=False)  # Owner-only beta channel for testing
    build_status = Column(String(50), nullable=True, default="idle")
    build_version = Column(String(50), nullable=True)
    build_error = Column(Text, nullable=True)
    update_rollout = Column(String(30), nullable=True, default="public")
    owner_preview_version = Column(String(50), nullable=True)
    owner_preview_download_url = Column(Text, nullable=True)


class Feedback(Base):
    __tablename__ = "feedbacks"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(100), index=True)
    role = Column(String(50))
    type = Column(String(50)) # 'bug', 'suggestion', 'general'
    message = Column(Text, nullable=False)
    rating = Column(Integer, default=5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=True)

    __table_args__ = (
        UniqueConstraint('institution_id', 'name', name='_institution_dept_name_uc'),
    )


class ParentAccount(Base):
    __tablename__ = "parent_accounts"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    phone = Column(String(45), nullable=True)
    password_hash = Column(String(200), nullable=False)
    notify_email = Column(Boolean, default=True)
    notify_sms = Column(Boolean, default=False)
    notify_whatsapp = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('institution_id', 'email', name='_parent_email_uc'),
    )


class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(100), nullable=True)
    applicant_name = Column(String(100), nullable=True)
    role = Column(String(30), default="student")  # 'student' or 'teacher'
    start_date = Column(String(50), nullable=False)
    end_date = Column(String(50), nullable=False)
    leave_type = Column(String(50), nullable=True, default="Medical") # 'Medical', 'Personal', 'Official'
    reason = Column(Text, nullable=False)
    status = Column(String(30), default="Pending") # 'Pending', 'Approved', 'Rejected'
    reviewed_by = Column(Integer, nullable=True)
    approved_by = Column(String(100), nullable=True)
    substitute_assigned = Column(String(100), nullable=True)
    document_url = Column(String(255), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    key_hash = Column(String(200), nullable=False)
    key_prefix = Column(String(12), nullable=False)
    scopes = Column(String(255), default="attendance:read")
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(String(100), nullable=True)


class SubscriptionPayment(Base):
    __tablename__ = "subscription_payments"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    plan = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    status = Column(String(50), default="pending")
    razorpay_order_id = Column(String(100), nullable=True)
    razorpay_payment_id = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OfflineAttendanceQueue(Base):
    __tablename__ = "offline_attendance_queue"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = Column(String(64), nullable=False, index=True)
    student_id = Column(Integer, nullable=False)
    subject_id = Column(Integer, nullable=True)
    marked_by = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    custom_date = Column(String(20), nullable=True)
    custom_time = Column(String(20), nullable=True)
    synced = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('institution_id', 'client_id', name='_offline_client_uc'),
    )


class InteractivePoll(Base):
    __tablename__ = "interactive_polls"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(String(500), nullable=False)
    options_json = Column(Text, nullable=False)  # JSON array of option strings
    votes_json = Column(Text, default="{}")  # JSON map option_index -> count
    created_by = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AttendanceRule(Base):
    __tablename__ = "attendance_rules"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    rule_type = Column(String(50), nullable=False)  # min_percent, consecutive_absent, late_limit
    threshold = Column(Float, default=75.0)
    action = Column(String(80), default="alert")  # alert, block, notify_parent, escalate
    notify_roles = Column(String(200), default="admin,teacher")
    is_active = Column(Boolean, default=True)
    config_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ExamSession(Base):
    __tablename__ = "exam_sessions"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    hall_name = Column(String(120), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    start_time = Column(String(20), nullable=True)
    end_time = Column(String(20), nullable=True)
    geofence_strict = Column(Boolean, default=True)
    is_active = Column(Boolean, default=False)
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SavedReport(Base):
    __tablename__ = "saved_reports"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    config_json = Column(Text, nullable=False)
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EscalationCase(Base):
    __tablename__ = "escalation_cases"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, nullable=False)
    student_name = Column(String(100), nullable=True)
    student_roll = Column(String(50), nullable=True)
    tier = Column(Integer, default=1)  # 1=teacher, 2=HOD, 3=principal
    status = Column(String(30), default="open")  # open, acknowledged, resolved
    reason = Column(Text, nullable=True)
    last_action_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SubstituteAssignment(Base):
    __tablename__ = "substitute_assignments"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    original_teacher_email = Column(String(100), nullable=False)
    substitute_email = Column(String(100), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    date_str = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ExtremeFeatureRecord(Base):
    __tablename__ = "extreme_feature_records"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_key = Column(String(80), nullable=False, index=True)
    data_json = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AttendanceChainHash(Base):
    __tablename__ = "attendance_chain_hashes"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    block_hash = Column(String(64), nullable=False)
    prev_hash = Column(String(64), nullable=True)
    payload_json = Column(Text, nullable=True)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PeerStudyGroup(Base):
    __tablename__ = "peer_study_groups"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    members_json = Column(Text, default="[]")
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MentalHealthCheckin(Base):
    __tablename__ = "mental_health_checkins"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_email = Column(String(100), nullable=False)
    mood = Column(String(30), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MarketplacePlugin(Base):
    __tablename__ = "marketplace_plugins"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(80), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    price_inr = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PayrollRecord(Base):
    __tablename__ = "payroll_records"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    staff_email = Column(String(100), nullable=False)
    staff_name = Column(String(100), nullable=True)
    month_year = Column(String(20), nullable=False)  # e.g., "2026-07"
    base_salary_inr = Column(Float, default=30000.0)
    working_days = Column(Integer, default=22)
    present_days = Column(Integer, default=20)
    absent_days = Column(Integer, default=2)
    late_arrivals = Column(Integer, default=0)
    late_penalty_inr = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    overtime_pay_inr = Column(Float, default=0.0)
    net_salary_inr = Column(Float, default=30000.0)
    status = Column(String(30), default="processed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


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


class BotConversationLog(Base):
    __tablename__ = "bot_conversation_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String(30), default="whatsapp")  # whatsapp, telegram, web
    sender_phone_or_id = Column(String(50), nullable=False)
    user_query = Column(Text, nullable=False)
    bot_response = Column(Text, nullable=False)
    intent_detected = Column(String(50), default="general_query")
    created_at = Column(DateTime(timezone=True), server_default=func.now())




# ═══════════════════════════════════════════════════════════════════════════
# NEW 40-FEATURE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class EmotionLog(Base):
    """Stores per-attendance emotion reading captured during face scan."""
    __tablename__ = "emotion_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    emotion = Column(String(30), nullable=False)          # happy, sad, angry, neutral, surprised, fearful, disgusted
    confidence = Column(Float, default=0.0)
    context = Column(String(50), nullable=True)            # "attendance", "proctoring"
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PredictedRisk(Base):
    """ML-predicted attendance risk per student, refreshed periodically."""
    __tablename__ = "predicted_risks"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_level = Column(String(20), nullable=False)        # "low", "medium", "high", "critical"
    risk_score = Column(Float, default=0.0)                # 0-100
    predicted_absence_days = Column(Integer, default=0)
    factors_json = Column(Text, nullable=True)             # JSON list of contributing factors
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('institution_id', 'student_id', name='_risk_student_inst_uc'),
    )


class VisitorLog(Base):
    """Visitor entry/exit log with optional face snapshot."""
    __tablename__ = "visitor_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    visitor_name = Column(String(100), nullable=False)
    visitor_phone = Column(String(45), nullable=True)
    visitor_email = Column(String(100), nullable=True)
    purpose = Column(String(200), nullable=True)
    host_name = Column(String(100), nullable=True)
    face_snapshot_url = Column(String(255), nullable=True)
    check_in = Column(DateTime(timezone=True), server_default=func.now())
    check_out = Column(DateTime(timezone=True), nullable=True)
    badge_number = Column(String(30), nullable=True)
    status = Column(String(20), default="inside")          # inside, exited


class StaffAttendanceLog(Base):
    """Teacher/admin face-based check-in/check-out log."""
    __tablename__ = "staff_attendance_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_email = Column(String(100), nullable=False)
    user_name = Column(String(100), nullable=True)
    check_in_time = Column(String(20), nullable=True)
    check_out_time = Column(String(20), nullable=True)
    date = Column(String(20), nullable=False)
    status = Column(String(20), default="Present")         # Present, Absent, Late, Half-Day
    late_minutes = Column(Integer, default=0)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('institution_id', 'user_id', 'date', name='_staff_att_date_uc'),
    )


class ReportCard(Base):
    """Generated student report cards with attendance + performance summary."""
    __tablename__ = "report_cards"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    period_label = Column(String(50), nullable=False)      # e.g. "Semester 1 — 2026"
    start_date = Column(String(20), nullable=False)
    end_date = Column(String(20), nullable=False)
    attendance_percentage = Column(Float, default=0.0)
    total_present = Column(Integer, default=0)
    total_days = Column(Integer, default=0)
    subject_wise_json = Column(Text, nullable=True)        # {subject_id: {present, total, pct}}
    remarks = Column(Text, nullable=True)
    pdf_url = Column(String(255), nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    generated_by = Column(String(100), nullable=True)


class GamificationBadge(Base):
    """Badge definitions for the gamification system."""
    __tablename__ = "gamification_badges"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    badge_key = Column(String(50), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    icon_emoji = Column(String(10), nullable=True)
    points_required = Column(Integer, default=0)
    streak_required = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)


class StudentBadge(Base):
    """Records which badges a student has earned."""
    __tablename__ = "student_badges"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_key = Column(String(50), nullable=False)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('student_id', 'badge_key', name='_student_badge_uc'),
    )


class RewardRedemption(Base):
    """Student reward redemption records."""
    __tablename__ = "reward_redemptions"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    reward_name = Column(String(100), nullable=False)
    points_spent = Column(Integer, nullable=False)
    status = Column(String(20), default="pending")         # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ExamProctorLog(Base):
    """Exam proctoring session logs — face checks, violations, alerts."""
    __tablename__ = "exam_proctor_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=True, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)        # "verified", "face_mismatch", "multiple_faces", "no_face", "gaze_away"
    severity = Column(String(20), default="info")          # info, warning, critical
    details = Column(Text, nullable=True)
    snapshot_url = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FatigueLog(Base):
    """Drowsiness/fatigue detection readings during class."""
    __tablename__ = "fatigue_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    ear_value = Column(Float, nullable=True)               # Eye Aspect Ratio
    is_drowsy = Column(Boolean, default=False)
    alert_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AttentionLog(Base):
    """Attention tracking — gaze direction and phone usage events."""
    __tablename__ = "attention_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    gaze_direction = Column(String(30), nullable=True)     # "forward", "left", "right", "down"
    phone_detected = Column(Boolean, default=False)
    attention_score = Column(Float, default=100.0)         # 0-100
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GeneratedTimetable(Base):
    """AI-generated timetable entries."""
    __tablename__ = "generated_timetables"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    version_label = Column(String(50), nullable=False)
    timetable_json = Column(Text, nullable=False)          # Full timetable as JSON
    is_active = Column(Boolean, default=False)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CrowdSnapshot(Base):
    """Crowd density readings per classroom session."""
    __tablename__ = "crowd_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    room_name = Column(String(100), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    person_count = Column(Integer, default=0)
    density_level = Column(String(20), default="normal")   # low, normal, high, overcrowded
    heatmap_data_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CustomReportConfig(Base):
    """User-saved custom report configurations."""
    __tablename__ = "custom_report_configs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    columns_json = Column(Text, nullable=False)            # Selected columns
    filters_json = Column(Text, nullable=True)             # Applied filters
    chart_type = Column(String(30), nullable=True)
    created_by = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FeeAttendanceFlag(Base):
    """Fee-attendance link flags for students below threshold."""
    __tablename__ = "fee_attendance_flags"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    attendance_percentage = Column(Float, default=0.0)
    threshold = Column(Float, default=75.0)
    flag_type = Column(String(30), default="warning")      # warning, block, scholarship_risk
    is_resolved = Column(Boolean, default=False)
    flagged_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('institution_id', 'student_id', name='_fee_flag_student_uc'),
    )


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


class BlockchainBlock(Base):
    """Immutable attendance blockchain ledger blocks."""
    __tablename__ = "blockchain_blocks"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    block_index = Column(Integer, nullable=False)
    block_hash = Column(String(64), nullable=False, unique=True)
    prev_hash = Column(String(64), nullable=False)
    merkle_root = Column(String(64), nullable=True)
    payload_json = Column(Text, nullable=False)            # attendance records in this block
    nonce = Column(Integer, default=0)
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MfaChallenge(Base):
    """TOTP MFA challenge tracking for admins."""
    __tablename__ = "mfa_challenges"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_token = Column(String(64), nullable=False, unique=True)
    is_verified = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WellnessCheckin(Base):
    """Student wellness check-in records (mood + notes)."""
    __tablename__ = "wellness_checkins"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id", ondelete="CASCADE"), nullable=False, index=True)
    mood = Column(String(30), nullable=False)              # great, good, neutral, sad, stressed, anxious
    mood_score = Column(Integer, default=5)                # 1-10
    note = Column(Text, nullable=True)
    counselor_alerted = Column(Boolean, default=False)
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


class I18nTranslation(Base):
    """Custom institution-level translations for UI strings."""
    __tablename__ = "i18n_translations"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    locale = Column(String(10), nullable=False)            # hi, ta, te, mr, bn, en
    key = Column(String(200), nullable=False)
    value = Column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint('institution_id', 'locale', 'key', name='_i18n_key_uc'),
    )


class TaskQueue(Base):
    """Background task queue for heavy operations (face recognition batches etc.)."""
    __tablename__ = "task_queue"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    task_type = Column(String(80), nullable=False)         # "batch_recognition", "report_gen", "email_blast"
    payload_json = Column(Text, nullable=True)
    status = Column(String(20), default="pending")         # pending, running, done, failed
    result_json = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    retries = Column(Integer, default=0)
    created_by = Column(String(100), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OfflineSyncLog(Base):
    """Logs for offline face recognition sync operations."""
    __tablename__ = "offline_sync_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(String(100), nullable=False, index=True)
    sync_type = Column(String(20), nullable=False)         # "download", "upload"
    records_count = Column(Integer, default=0)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    sync_metadata = Column(Text, nullable=True)             # JSON with errors, skipped records, etc.
