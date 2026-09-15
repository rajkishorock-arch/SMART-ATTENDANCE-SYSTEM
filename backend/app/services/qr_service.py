"""
Student QR Service: handles generation, cryptographic validation, and atomic replay-protected
consumption of short-lived student QR check-in tokens.
"""
import uuid
import time
import threading
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from jose import jwt, JWTError

from app import models, crud, schemas
from app.core import config
from app.repositories.attendance_repository import AttendanceRepository
from app.services.attendance_service import AttendanceService

QR_VALID_SECONDS = 45
IST = timezone(timedelta(hours=5, minutes=30))
_qr_scan_lock = threading.Lock()


class QRService:
    """Encapsulates student QR generation and atomic replay-protected verification."""

    @staticmethod
    def generate_student_qr_payload(student: models.StudentModel) -> Dict[str, Any]:
        """Generates short-lived 45s JWT payload and encoded token for student QR check-in."""
        now = int(time.time())
        exp = now + QR_VALID_SECONDS
        payload = {
            "jti": str(uuid.uuid4()),
            "iat": now,
            "exp": exp,
            "student_id": student.id,
            "roll": student.roll,
            "name": student.name,
            "institution_id": student.institution_id,
            "type": "qr_checkin",
            "purpose": "qr_checkin",
        }
        token = jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.ALGORITHM)
        return {
            "token": token,
            "expires_in": QR_VALID_SECONDS,
            "valid_until": datetime.fromtimestamp(exp, tz=IST).strftime("%H:%M:%S"),
            "student_name": student.name,
            "roll": student.roll,
        }

    @staticmethod
    def generate_student_qr_image(student: models.StudentModel) -> Dict[str, Any]:
        """Generates QR code as base64 PNG image data with token fallback."""
        payload_data = QRService.generate_student_qr_payload(student)
        token = payload_data["token"]
        try:
            import qrcode
            import io, base64
            qr = qrcode.QRCode(version=1, box_size=8, border=4)
            qr.add_data(token)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            buf.seek(0)
            b64 = base64.b64encode(buf.read()).decode()
            return {
                "qr_image_base64": f"data:image/png;base64,{b64}",
                "token": token,
                "expires_in": QR_VALID_SECONDS,
            }
        except ImportError:
            return {
                "qr_image_base64": None,
                "token": token,
                "expires_in": QR_VALID_SECONDS,
                "note": "Install qrcode[pil] for QR image generation",
            }

    @staticmethod
    def consume_and_mark_attendance(
        db: Session,
        token: str,
        current_user: models.User,
        subject_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Validates token signature, expiration, tenant isolation, and atomically consumes jti
        in the database to prevent replay attacks transactionally linked with attendance marking.
        """
        if current_user.role not in ("admin", "teacher"):
            raise HTTPException(status_code=403, detail="Staff access only.")

        if not token:
            raise HTTPException(status_code=400, detail="QR token is required.")

        # 1. Validate JWT signature
        try:
            data = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
        except JWTError:
            raise HTTPException(status_code=400, detail="Invalid or expired QR code. Ask student to refresh.")

        # 2. Validate expiration
        exp = data.get("exp", 0)
        if int(time.time()) > exp:
            raise HTTPException(status_code=400, detail="QR code has expired. Ask student to generate a new one.")

        # 3. Validate required claims
        token_type = data.get("type") or data.get("purpose")
        if token_type != "qr_checkin":
            raise HTTPException(status_code=400, detail="Invalid token type.")

        jti = data.get("jti")
        if not jti:
            raise HTTPException(status_code=400, detail="Malformed QR token: missing jti claim.")

        student_id = data.get("student_id")
        institution_id = data.get("institution_id")
        if not student_id or not institution_id:
            raise HTTPException(status_code=400, detail="Malformed QR token: missing student or tenant claims.")

        # 4. Tenant isolation check
        if institution_id != current_user.institution_id:
            raise HTTPException(status_code=403, detail="Student belongs to a different institution.")

        student = db.query(models.StudentModel).filter(
            models.StudentModel.id == student_id,
            models.StudentModel.institution_id == institution_id,
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")

        with _qr_scan_lock:
            # 5. Atomically consume jti in database (Replay Protection)
            consumed = AttendanceRepository.get_consumed_qr_token(
                db=db,
                institution_id=current_user.institution_id,
                jti=jti
            )
            if consumed:
                raise HTTPException(status_code=409, detail="QR token has already been used.")

            exp_dt = datetime.fromtimestamp(exp, tz=timezone.utc)
            token_record = models.ConsumedQrToken(
                institution_id=current_user.institution_id,
                jti=jti,
                student_id=student.id,
                token_type="student_qr",
                expires_at=exp_dt
            )
            db.add(token_record)
            try:
                db.flush()
            except IntegrityError:
                db.rollback()
                raise HTTPException(status_code=409, detail="QR token has already been used.")

            # 6 & 7. Perform attendance creation/update transactionally coordinated with token consumption
            try:
                db_att, newly_marked = crud.mark_student_attendance(
                    db=db,
                    student_id=student_id,
                    name=student.name,
                    roll=student.roll or "",
                    dep=student.dep or "",
                    subject_id=subject_id,
                    institution_id=institution_id,
                    commit=False
                )


                crud.create_audit_log(
                    db,
                    log=schemas.AuditLogCreate(
                        user_email=current_user.email,
                        action=f"QR scan: {'Marked' if newly_marked else 'Already marked'} attendance for {student.name} (Roll: {student.roll})."
                    ),
                    institution_id=current_user.institution_id,
                )

                db.commit()
            except IntegrityError:
                db.rollback()
                already_used = AttendanceRepository.get_consumed_qr_token(
                    db=db,
                    institution_id=current_user.institution_id,
                    jti=jti
                )
                if already_used:
                    raise HTTPException(status_code=409, detail="QR token has already been used.")
                raise HTTPException(status_code=409, detail="Concurrent conflict: QR token already consumed.")
            except HTTPException:
                db.rollback()
                raise
            except Exception:
                db.rollback()
                raise HTTPException(status_code=500, detail="Failed to record attendance.")

        return {
            "status": "success",
            "newly_marked": newly_marked,
            "student_name": student.name,
            "roll": student.roll,
            "dep": student.dep,
            "message": f"{'Attendance marked' if newly_marked else 'Already marked today'} for {student.name}",
        }
