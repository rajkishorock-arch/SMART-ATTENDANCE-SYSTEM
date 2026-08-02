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

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()
QR_VALID_SECONDS = 120  # QR valid for 2 minutes


@router.get("/my-token")
def get_student_qr_token(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """
    Generate a short-lived JWT token for QR attendance.
    Student uses this to generate a QR code on their phone.
    """
    from jose import jwt
    exp = int(time.time()) + QR_VALID_SECONDS
    payload = {
        "student_id": current_student.id,
        "roll": current_student.roll,
        "name": current_student.name,
        "institution_id": current_student.institution_id,
        "exp": exp,
        "type": "qr_checkin",
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
    Validates token and registers attendance.
    """
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    token = payload.get("token")
    subject_id = payload.get("subject_id")

    if not token:
        raise HTTPException(status_code=400, detail="QR token is required.")

    from jose import jwt, JWTError
    try:
        data = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired QR code. Ask student to refresh.")

    if data.get("type") != "qr_checkin":
        raise HTTPException(status_code=400, detail="Invalid token type.")

    exp = data.get("exp", 0)
    if int(time.time()) > exp:
        raise HTTPException(status_code=400, detail="QR code has expired. Ask student to generate a new one.")

    student_id = data.get("student_id")
    institution_id = data.get("institution_id")

    if institution_id != current_user.institution_id:
        raise HTTPException(status_code=403, detail="Student belongs to a different institution.")

    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id,
        models.StudentModel.institution_id == institution_id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Mark attendance
    db_att, newly_marked = crud.mark_student_attendance(
        db,
        student_id=student_id,
        name=student.name,
        roll=student.roll or "",
        dep=student.dep or "",
        subject_id=subject_id,
        institution_id=institution_id,
    )

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"QR scan: {'Marked' if newly_marked else 'Already marked'} attendance for {student.name} (Roll: {student.roll})."
        ),
        institution_id=current_user.institution_id,
    )

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
    exp = int(time.time()) + QR_VALID_SECONDS
    payload = {
        "student_id": current_student.id,
        "roll": current_student.roll,
        "name": current_student.name,
        "institution_id": current_student.institution_id,
        "exp": exp,
        "type": "qr_checkin",
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
