"""models/leave.py — Leave domain models"""
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


__all__ = ['LeaveRequest', 'SubstituteAssignment', 'EscalationCase']
