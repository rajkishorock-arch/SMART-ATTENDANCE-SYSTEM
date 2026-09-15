"""
Attendance Service: canonical business logic for marking and managing attendance.
Preserves session_key generation, concurrency locks, transaction boundaries,
and IntegrityError race recovery.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, List, Dict, Any
import threading
import csv
import os
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app import models
from app.repositories.attendance_repository import AttendanceRepository
from app.period_utils import resolve_period_name, normalize_date_str, generate_session_key

IST = timezone(timedelta(hours=5, minutes=30))
_attendance_lock = threading.Lock()


class AttendanceService:
    """Encapsulates core business workflows for student attendance."""

    @staticmethod
    def mark_attendance(
        db: Session,
        student_id: int,
        name: str,
        roll: str,
        dep: str,
        subject_id: Optional[int] = None,
        custom_date: Optional[str] = None,
        custom_time: Optional[str] = None,
        institution_id: Optional[int] = None,
        commit: bool = True,
        verification_method: Optional[str] = None,
        fallback_reason: Optional[str] = None
    ) -> Tuple[models.AttendanceModel, bool]:
        """
        Canonical attendance creation workflow.
        Returns: (AttendanceModel, newly_marked_boolean)
        Thread-safe, idempotent, and handles concurrent race conditions gracefully.
        """
        today_str = normalize_date_str(custom_date)
        actual_clock_time = custom_time if custom_time else datetime.now(IST).strftime("%H:%M:%S")
        period_name = resolve_period_name(actual_clock_time)
        s_key = generate_session_key(institution_id, student_id, today_str, actual_clock_time, subject_id)

        with _attendance_lock:
            # 1. Query candidates for duplicate detection
            existing_candidates = AttendanceRepository.get_existing_candidates(
                db=db,
                student_id=student_id,
                roll=roll,
                date_str=today_str,
                institution_id=institution_id,
                subject_id=subject_id,
            )
            for cand in existing_candidates:
                if (cand.session_key and cand.session_key == s_key) or cand.time == actual_clock_time or resolve_period_name(cand.time) == period_name:
                    return cand, False

            # 2. Construct new attendance record
            db_attendance = models.AttendanceModel(
                id=str(student_id),
                roll=roll,
                name=name,
                department=dep,
                time=actual_clock_time,
                date=today_str,
                attendance="Present",
                subject_id=subject_id,
                institution_id=institution_id,
                fallback_reason=fallback_reason or f"Scan at {actual_clock_time}",
                session_key=s_key,
                verification_method=verification_method
            )
            db.add(db_attendance)

            if commit:
                try:
                    db.commit()
                    db.refresh(db_attendance)
                except IntegrityError:
                    db.rollback()
                    # Concurrency recovery via session_key
                    existing = AttendanceRepository.get_by_session_key(db, s_key)
                    if existing:
                        return existing, False

                    existing_candidates = AttendanceRepository.get_existing_candidates(
                        db=db,
                        student_id=student_id,
                        roll=roll,
                        date_str=today_str,
                        institution_id=institution_id,
                        subject_id=subject_id,
                    )
                    for cand in existing_candidates:
                        if cand.time == actual_clock_time or resolve_period_name(cand.time) == period_name:
                            return cand, False
                    if existing_candidates:
                        return existing_candidates[0], False
                    raise
            else:
                sp = db.begin_nested()
                try:
                    db.flush()
                except IntegrityError:
                    sp.rollback()
                    existing = AttendanceRepository.get_by_session_key(db, s_key)
                    if existing:
                        return existing, False

                    existing_candidates = AttendanceRepository.get_existing_candidates(
                        db=db,
                        student_id=student_id,
                        roll=roll,
                        date_str=today_str,
                        institution_id=institution_id,
                        subject_id=subject_id,
                    )
                    for cand in existing_candidates:
                        if cand.time == actual_clock_time or resolve_period_name(cand.time) == period_name:
                            return cand, False
                    if existing_candidates:
                        return existing_candidates[0], False
                    raise

        # 3. CSV write for local logging
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            attendance_path = os.path.join(base_dir, "attendance.csv")
            required_columns = ["ID", "Roll", "Name", "Department", "Time", "Date", "Status", "SubjectID", "InstitutionID"]
            file_exists = os.path.exists(attendance_path)

            with open(attendance_path, "a", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                if not file_exists or os.path.getsize(attendance_path) == 0:
                    writer.writerow(required_columns)
                writer.writerow([student_id, roll, name, dep, actual_clock_time, today_str, "Present", subject_id or "", institution_id or ""])
        except Exception as csv_err:
            print(f"Failed to write attendance to CSV: {csv_err}")

        return db_attendance, True
