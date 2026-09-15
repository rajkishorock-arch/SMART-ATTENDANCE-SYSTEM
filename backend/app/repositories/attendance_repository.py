"""
Attendance Repository: encapsulates database queries and persistence for attendance records,
consumed QR tokens, and fallback claims.
"""
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from datetime import datetime

from app import models


class AttendanceRepository:
    """Encapsulates raw database queries for attendance-related entities."""

    @staticmethod
    def get_existing_candidates(
        db: Session,
        student_id: int,
        roll: str,
        date_str: str,
        institution_id: Optional[int] = None,
        subject_id: Optional[int] = None,
    ) -> List[models.AttendanceModel]:
        """Queries potential duplicate attendance candidates for the student on date_str."""
        query = db.query(models.AttendanceModel).filter(
            or_(
                models.AttendanceModel.id == str(student_id),
                models.AttendanceModel.roll == roll
            ),
            models.AttendanceModel.date == date_str
        )
        if institution_id is not None:
            query = query.filter(models.AttendanceModel.institution_id == institution_id)

        if subject_id is not None:
            query = query.filter(models.AttendanceModel.subject_id == subject_id)
        else:
            query = query.filter(models.AttendanceModel.subject_id == None)

        return query.all()

    @staticmethod
    def get_by_session_key(db: Session, session_key: str) -> Optional[models.AttendanceModel]:
        """Finds attendance record by deterministic session_key."""
        if not session_key:
            return None
        return db.query(models.AttendanceModel).filter(
            models.AttendanceModel.session_key == session_key
        ).first()

    @staticmethod
    def get_by_id_and_institution(
        db: Session,
        attendance_id: str,
        institution_id: int
    ) -> Optional[models.AttendanceModel]:
        """Finds attendance record by ID within a tenant institution."""
        return db.query(models.AttendanceModel).filter(
            models.AttendanceModel.id == attendance_id,
            models.AttendanceModel.institution_id == institution_id
        ).first()

    @staticmethod
    def get_by_student_date_period_subject(
        db: Session,
        student_id: int,
        date_str: str,
        period: str,
        subject_id: Optional[int],
        institution_id: int
    ) -> Optional[models.AttendanceModel]:
        """Finds attendance record matching student, date, period slot, subject, and institution."""
        return db.query(models.AttendanceModel).filter(
            models.AttendanceModel.id == student_id,
            models.AttendanceModel.date == date_str,
            models.AttendanceModel.time == period,
            models.AttendanceModel.subject_id == subject_id,
            models.AttendanceModel.institution_id == institution_id
        ).first()

    @staticmethod
    def get_consumed_qr_token(
        db: Session,
        institution_id: int,
        jti: str
    ) -> Optional[models.ConsumedQrToken]:
        """Finds consumed QR token record by JTI within tenant."""
        return db.query(models.ConsumedQrToken).filter(
            models.ConsumedQrToken.institution_id == institution_id,
            models.ConsumedQrToken.jti == jti
        ).first()

    @staticmethod
    def get_fallback_claim(
        db: Session,
        session_id: int,
        student_id: int
    ) -> Optional[models.AttendanceFallbackClaim]:
        """Finds student claim for a biometric fallback session."""
        return db.query(models.AttendanceFallbackClaim).filter(
            models.AttendanceFallbackClaim.session_id == session_id,
            models.AttendanceFallbackClaim.student_id == student_id
        ).first()
