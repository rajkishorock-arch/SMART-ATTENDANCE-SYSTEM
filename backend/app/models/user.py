"""models/user.py — User domain models"""
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
    Index,
)
from sqlalchemy.sql import func
from app.models.base import Base

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


class StaffAttendance(Base):
    """Daily biometric check-in / check-out register for institutional staff & faculty."""
    __tablename__ = "staff_attendance"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(20), nullable=False)
    check_in = Column(String(20), nullable=True)
    check_out = Column(String(20), nullable=True)
    hours_worked = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    status = Column(String(30), default="PRESENT")  # PRESENT, HALF_DAY, ABSENT, ON_LEAVE, OVERTIME
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StaffPayrollRecord(Base):
    """Monthly computed salary payout register based on working days and attendance."""
    __tablename__ = "staff_payroll_records"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    month_year = Column(String(20), nullable=False)  # MM/YYYY
    base_salary = Column(Float, default=0.0)
    working_days = Column(Integer, default=30)
    days_present = Column(Integer, default=0)
    days_half = Column(Integer, default=0)
    days_absent = Column(Integer, default=0)
    gross_salary = Column(Float, default=0.0)
    deductions = Column(Float, default=0.0)
    net_salary = Column(Float, default=0.0)
    status = Column(String(30), default="DRAFT")  # DRAFT, APPROVED, PAID
    generated_at = Column(DateTime(timezone=True), server_default=func.now())


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


class MfaChallenge(Base):
    """TOTP MFA challenge tracking for admins."""
    __tablename__ = "mfa_challenges"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    challenge_token = Column(String(64), nullable=False, unique=True)
    is_verified = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


__all__ = ['User', 'ParentAccount', 'StaffAttendance', 'StaffPayrollRecord', 'StaffAttendanceLog', 'PayrollRecord', 'MfaChallenge']
