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

class LeaveRequest(Base):
    __tablename__ = "leave_requests"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student.id"), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="pending") # pending, approved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
