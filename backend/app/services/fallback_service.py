"""
Biometric Fallback Service: business logic for time-bound dynamic QR tokens,
emergency session PINs, trusted geofence verification, and fallback claims.
"""
import time
import hmac
import hashlib
import secrets
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

from app import models, schemas, crud
from app.repositories.attendance_repository import AttendanceRepository
from app.security_utils import verify_geofence

ROTATION_WINDOW_SECONDS = 30
_fallback_service_lock = threading.Lock()


class FallbackService:
    """Encapsulates biometric fallback tokens, sessions, geofence checks, and claims."""

    @staticmethod
    def generate_rolling_token(secret: str, session_id: int, time_step: int) -> str:
        """Generates an HMAC-SHA256 rolling token for a specific 30s time bucket."""
        msg = f"{session_id}:{time_step}".encode("utf-8")
        sig = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()
        return f"FALLBACK:{session_id}:{time_step}:{sig[:16]}"

    @staticmethod
    def verify_rolling_token(secret: str, session_id: int, token: str) -> bool:
        """Verifies candidate token strictly against the CURRENT 30s time bucket."""
        try:
            parts = token.split(":")
            if len(parts) != 4 or parts[0] != "FALLBACK":
                return False
            token_session_id = int(parts[1])
            token_time_step = int(parts[2])
            if token_session_id != session_id:
                return False

            current_step = int(time.time() // ROTATION_WINDOW_SECONDS)
            # Strict current bucket only: previous and future buckets are rejected
            if token_time_step != current_step:
                return False

            expected = FallbackService.generate_rolling_token(secret, session_id, token_time_step)
            return hmac.compare_digest(token, expected)
        except Exception:
            return False

    @staticmethod
    def create_fallback_session(
        db: Session,
        payload: schemas.FallbackSessionCreate,
        current_user: models.User
    ) -> models.AttendanceFallbackSession:
        """Teacher generates a time-bound fallback session for a lecture."""
        if current_user.role not in ["admin", "teacher", "hod"]:
            raise HTTPException(status_code=403, detail="Faculty or staff access only.")

        subject = db.query(models.Subject).filter(
            models.Subject.id == payload.subject_id,
            models.Subject.institution_id == current_user.institution_id
        ).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found.")

        if current_user.role == "teacher" and subject.teacher_id is not None and subject.teacher_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: You can only create fallback sessions for your assigned subject."
            )

        now_utc = datetime.now(timezone.utc)
        expires_at = now_utc + timedelta(minutes=payload.duration_minutes or 60)
        session_date = payload.session_date or now_utc.strftime("%d/%m/%Y")

        secret = secrets.token_hex(32)
        pin = str(secrets.randbelow(900000) + 100000)

        # Deactivate previous active fallback sessions for same subject today
        db.query(models.AttendanceFallbackSession).filter(
            models.AttendanceFallbackSession.institution_id == current_user.institution_id,
            models.AttendanceFallbackSession.subject_id == subject.id,
            models.AttendanceFallbackSession.is_active == True
        ).update({"is_active": False})

        session = models.AttendanceFallbackSession(
            institution_id=current_user.institution_id,
            subject_id=subject.id,
            teacher_id=current_user.id,
            session_date=session_date,
            session_secret=secret,
            session_pin=pin,
            expires_at=expires_at,
            is_active=True
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        crud.create_audit_log(
            db,
            log=schemas.AuditLogCreate(
                user_email=current_user.email,
                role=current_user.role,
                action=f"Generated Biometric Fallback Session for {subject.name} (PIN: {pin})",
                entity_type="fallback_session",
                entity_id=str(session.id),
                reason="Biometric fallback authorization"
            ),
            institution_id=current_user.institution_id
        )
        return session

    @staticmethod
    def get_active_rolling_token(
        db: Session,
        session_id: int,
        identity: Any
    ) -> schemas.ActiveRollingTokenResponse:
        """Retrieves current 30s rolling QR token for an active teacher session."""
        session = db.query(models.AttendanceFallbackSession).filter(
            models.AttendanceFallbackSession.id == session_id,
            models.AttendanceFallbackSession.institution_id == identity.institution_id,
            models.AttendanceFallbackSession.is_active == True
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Active fallback session not found.")

        now = time.time()
        current_step = int(now // ROTATION_WINDOW_SECONDS)
        seconds_remaining = int(ROTATION_WINDOW_SECONDS - (now % ROTATION_WINDOW_SECONDS))

        token = FallbackService.generate_rolling_token(session.session_secret, session.id, current_step)
        return schemas.ActiveRollingTokenResponse(
            session_id=session.id,
            token=token,
            seconds_remaining=seconds_remaining,
            expires_in=ROTATION_WINDOW_SECONDS
        )

    @staticmethod
    def claim_attendance_via_qr(
        db: Session,
        payload: schemas.ClaimQrPayload,
        identity: Any
    ) -> schemas.FallbackClaimResult:
        """
        Student scans dynamic rolling QR code from teacher's screen.
        Validates HMAC against current 30s bucket, enforces single claim,
        verifies trusted institution geofence from SystemSettings, and records attendance.
        """
        try:
            parts = payload.token.split(":")
            session_id = int(parts[1])
        except Exception:
            raise HTTPException(status_code=400, detail="Malformed QR token format.")

        session = db.query(models.AttendanceFallbackSession).filter(
            models.AttendanceFallbackSession.id == session_id,
            models.AttendanceFallbackSession.institution_id == identity.institution_id,
            models.AttendanceFallbackSession.is_active == True
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Fallback session is inactive or expired.")

        now_utc = datetime.now(timezone.utc)
        exp = session.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now_utc > exp:
            raise HTTPException(status_code=400, detail="Fallback session window has closed.")

        if not FallbackService.verify_rolling_token(session.session_secret, session.id, payload.token):
            raise HTTPException(status_code=400, detail="QR token has expired or signature is invalid. Rescan new QR.")

        student = db.query(models.StudentModel).filter(
            models.StudentModel.email == identity.email,
            models.StudentModel.institution_id == identity.institution_id
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found.")

        # 1. Per-student single claim protection
        existing_claim = AttendanceRepository.get_fallback_claim(db, session.id, student.id)
        if existing_claim:
            raise HTTPException(
                status_code=409,
                detail="Student has already claimed attendance for this fallback session."
            )

        # 2. Trusted Geofence Verification via SystemSettings
        settings = crud.get_system_settings(db, institution_id=identity.institution_id)
        geofence_verified = False
        verification_method = "DYNAMIC_QR"
        audit_reason = payload.fallback_reason or "Biometric fallback claim"

        if (
            settings
            and settings.geofencing_enabled
            and settings.center_latitude is not None
            and settings.center_longitude is not None
            and settings.allowed_radius_meters is not None
        ):
            if payload.latitude is None or payload.longitude is None:
                raise HTTPException(
                    status_code=400,
                    detail="Geolocation coordinates required for classroom attendance verification."
                )
            is_inside = verify_geofence(
                payload.latitude,
                payload.longitude,
                settings.center_latitude,
                settings.center_longitude,
                settings.allowed_radius_meters
            )
            if not is_inside:
                raise HTTPException(
                    status_code=403,
                    detail="Physical classroom presence verification failed: Out of geofence bounds."
                )
            geofence_verified = True
            verification_method = "DYNAMIC_QR"
        else:
            geofence_verified = False
            verification_method = "DYNAMIC_QR_UNVERIFIED_LOCATION"
            audit_reason = "Geofence disabled: No proximity attestation"

        with _fallback_service_lock:
            # 3. Register claim atomically in DB
            claim_rec = models.AttendanceFallbackClaim(
                session_id=session.id,
                student_id=student.id,
                institution_id=identity.institution_id
            )
            db.add(claim_rec)
            try:
                db.flush()
            except IntegrityError:
                db.rollback()
                raise HTTPException(
                    status_code=409,
                    detail="Student has already claimed attendance for this fallback session."
                )

            # 4. Record attendance transactionally coordinated with claim
            time_str = now_utc.strftime("%H:%M")
            date_str = session.session_date
            rec_id = f"{student.roll}_{session.subject_id}_{date_str}_{time_str}".replace("/", "-").replace(":", "-")

            try:
                existing = db.query(models.AttendanceModel).filter(
                    models.AttendanceModel.institution_id == identity.institution_id,
                    models.AttendanceModel.roll == student.roll,
                    models.AttendanceModel.date == date_str,
                    models.AttendanceModel.subject_id == session.subject_id
                ).first()

                if existing:
                    existing.attendance = "Present"
                    existing.verification_method = verification_method
                    existing.fallback_reason = audit_reason
                else:
                    new_rec = models.AttendanceModel(
                        id=rec_id,
                        institution_id=identity.institution_id,
                        roll=student.roll,
                        name=student.name,
                        department=student.dep,
                        time=time_str,
                        date=date_str,
                        attendance="Present",
                        subject_id=session.subject_id,
                        verification_method=verification_method,
                        fallback_reason=audit_reason
                    )
                    db.add(new_rec)

                crud.create_audit_log(
                    db,
                    log=schemas.AuditLogCreate(
                        user_email=identity.email,
                        role=identity.role,
                        action=f"Attendance logged via {verification_method} fallback for {student.name} ({student.roll})",
                        entity_type="attendance",
                        entity_id=rec_id,
                        reason=audit_reason
                    ),
                    institution_id=identity.institution_id
                )

                db.commit()
            except IntegrityError:
                db.rollback()
                already_claimed = AttendanceRepository.get_fallback_claim(db, session.id, student.id)
                if already_claimed:
                    raise HTTPException(status_code=409, detail="Student has already claimed attendance for this fallback session.")
                raise HTTPException(status_code=409, detail="Concurrent conflict: Session already claimed.")
            except HTTPException:
                db.rollback()
                raise
            except Exception:
                db.rollback()
                raise HTTPException(status_code=500, detail="Failed to record fallback attendance.")

        return schemas.FallbackClaimResult(
            success=True,
            message="Attendance recorded successfully via Time-Bound Dynamic QR.",
            verification_method=verification_method,
            attendance_record_id=rec_id,
            geofence_verified=geofence_verified
        )

    @staticmethod
    def claim_attendance_via_pin(
        db: Session,
        payload: schemas.ClaimPinPayload,
        identity: Any
    ) -> schemas.FallbackClaimResult:
        """Student submits emergency 6-digit session PIN with mandatory reason."""
        if not payload.fallback_reason.strip():
            raise HTTPException(status_code=400, detail="A valid reason for biometric fallback is mandatory.")

        session = db.query(models.AttendanceFallbackSession).filter(
            models.AttendanceFallbackSession.id == payload.session_id,
            models.AttendanceFallbackSession.institution_id == identity.institution_id,
            models.AttendanceFallbackSession.is_active == True
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Fallback session not found or inactive.")

        now_utc = datetime.now(timezone.utc)
        exp = session.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now_utc > exp:
            raise HTTPException(status_code=400, detail="Session window has expired.")

        if not hmac.compare_digest(session.session_pin.strip(), payload.session_pin.strip()):
            raise HTTPException(status_code=400, detail="Invalid session PIN.")

        student = db.query(models.StudentModel).filter(
            models.StudentModel.email == identity.email,
            models.StudentModel.institution_id == identity.institution_id
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student profile not found.")

        # 1. Per-student single claim protection
        existing_claim = AttendanceRepository.get_fallback_claim(db, session.id, student.id)
        if existing_claim:
            raise HTTPException(
                status_code=409,
                detail="Student has already claimed attendance for this fallback session."
            )

        with _fallback_service_lock:
            # 2. Register claim atomically in DB
            claim_rec = models.AttendanceFallbackClaim(
                session_id=session.id,
                student_id=student.id,
                institution_id=identity.institution_id
            )
            db.add(claim_rec)
            try:
                db.flush()
            except IntegrityError:
                db.rollback()
                raise HTTPException(
                    status_code=409,
                    detail="Student has already claimed attendance for this fallback session."
                )

            time_str = now_utc.strftime("%H:%M")
            date_str = session.session_date
            rec_id = f"{student.roll}_{session.subject_id}_{date_str}_{time_str}".replace("/", "-").replace(":", "-")

            try:
                existing = db.query(models.AttendanceModel).filter(
                    models.AttendanceModel.institution_id == identity.institution_id,
                    models.AttendanceModel.roll == student.roll,
                    models.AttendanceModel.date == date_str,
                    models.AttendanceModel.subject_id == session.subject_id
                ).first()

                if existing:
                    existing.attendance = "Present"
                    existing.verification_method = "SESSION_PIN"
                    existing.fallback_reason = payload.fallback_reason.strip()
                else:
                    new_rec = models.AttendanceModel(
                        id=rec_id,
                        institution_id=identity.institution_id,
                        roll=student.roll,
                        name=student.name,
                        department=student.dep,
                        time=time_str,
                        date=date_str,
                        attendance="Present",
                        subject_id=session.subject_id,
                        verification_method="SESSION_PIN",
                        fallback_reason=payload.fallback_reason.strip()
                    )
                    db.add(new_rec)

                crud.create_audit_log(
                    db,
                    log=schemas.AuditLogCreate(
                        user_email=identity.email,
                        role=identity.role,
                        action=f"Attendance logged via emergency SESSION_PIN for {student.name} ({student.roll})",
                        entity_type="attendance",
                        entity_id=rec_id,
                        reason=payload.fallback_reason.strip()
                    ),
                    institution_id=identity.institution_id
                )

                db.commit()
            except IntegrityError:
                db.rollback()
                already_claimed = AttendanceRepository.get_fallback_claim(db, session.id, student.id)
                if already_claimed:
                    raise HTTPException(status_code=409, detail="Student has already claimed attendance for this fallback session.")
                raise HTTPException(status_code=409, detail="Concurrent conflict: Session already claimed.")
            except HTTPException:
                db.rollback()
                raise
            except Exception:
                db.rollback()
                raise HTTPException(status_code=500, detail="Failed to record fallback attendance.")

        return schemas.FallbackClaimResult(
            success=True,
            message="Attendance recorded successfully via Emergency Session PIN.",
            verification_method="SESSION_PIN",
            attendance_record_id=rec_id
        )
