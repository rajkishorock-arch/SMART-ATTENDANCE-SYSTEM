"""
Feature 16: QR Code Backup Attendance
Student shows dynamic QR code on phone as fallback when face recognition fails.
Teacher scans it to mark attendance instantly.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import time, json

from . import models, security, crud, schemas
from .database import get_db
from .core import config

from sqlalchemy.exc import IntegrityError
import uuid
import threading

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()
QR_VALID_SECONDS = 45  # QR valid for 45 seconds


_qr_scan_lock = threading.Lock()


@router.get("/my-token")
def get_student_qr_token(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """
    Generate a single-use short-lived JWT token for QR attendance.
    Student uses this to generate a QR code on their phone.
    """
    from jose import jwt
    now = int(time.time())
    exp = now + QR_VALID_SECONDS
    payload = {
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": exp,
        "student_id": current_student.id,
        "roll": current_student.roll,
        "name": current_student.name,
        "institution_id": current_student.institution_id,
        "type": "qr_checkin",
        "purpose": "qr_checkin",
    }
    token = jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.ALGORITHM)
    return {
        "token": token,
        "expires_in": QR_VALID_SECONDS,
        "valid_until": datetime.fromtimestamp(exp, tz=IST).strftime("%H:%M:%S"),
        "student_name": current_student.name,
        "roll": current_student.roll,
    }


@router.post("/scan")
def scan_student_qr(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Teacher scans student QR code to mark attendance.
    Validates token, atomically consumes jti to prevent replay, and registers attendance.
    """
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    token = payload.get("token")
    subject_id = payload.get("subject_id")

    if not token:
        raise HTTPException(status_code=400, detail="QR token is required.")

    # 1. Validate JWT signature
    from jose import jwt, JWTError
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

    # 4. Validate current tenant/institution
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
        consumed = db.query(models.ConsumedQrToken).filter(
            models.ConsumedQrToken.institution_id == current_user.institution_id,
            models.ConsumedQrToken.jti == jti
        ).first()
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
                db,
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
            already_used = db.query(models.ConsumedQrToken).filter(
                models.ConsumedQrToken.institution_id == current_user.institution_id,
                models.ConsumedQrToken.jti == jti
            ).first()
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


@router.get("/qr-image")
def generate_qr_image_data(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """
    Generate QR code as base64 image for display on student's phone.
    Requires 'qrcode' package (pip install qrcode[pil]).
    """
    from jose import jwt
    now = int(time.time())
    exp = now + QR_VALID_SECONDS
    payload = {
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": exp,
        "student_id": current_student.id,
        "roll": current_student.roll,
        "name": current_student.name,
        "institution_id": current_student.institution_id,
        "type": "qr_checkin",
        "purpose": "qr_checkin",
    }
    token = jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.ALGORITHM)

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
        # Fallback: return token only
        return {
            "qr_image_base64": None,
            "token": token,
            "expires_in": QR_VALID_SECONDS,
            "note": "Install qrcode[pil] for QR image generation",
        }
