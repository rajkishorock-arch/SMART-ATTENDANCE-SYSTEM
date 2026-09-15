"""models/audit.py — Audit domain models"""
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

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    user_email = Column(String(100), index=True)
    role = Column(String(50), nullable=True)
    action = Column(Text, nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(100), nullable=True)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)


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


__all__ = ['AuditLog', 'VisitorLog', 'ReportCard']
