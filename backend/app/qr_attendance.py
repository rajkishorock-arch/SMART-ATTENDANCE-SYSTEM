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
from app.services.qr_service import QRService, QR_VALID_SECONDS, _qr_scan_lock, IST

router = APIRouter()


@router.get("/my-token")
def get_student_qr_token(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """
    Generate a single-use short-lived JWT token for QR attendance.
    Student uses this to generate a QR code on their phone.
    """
    return QRService.generate_student_qr_payload(current_student)


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
    return QRService.consume_and_mark_attendance(
        db=db,
        token=payload.get("token"),
        current_user=current_user,
        subject_id=payload.get("subject_id")
    )


@router.get("/qr-image")
def generate_qr_image_data(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """
    Generate QR code as base64 image for display on student's phone.
    Requires 'qrcode' package (pip install qrcode[pil]).
    """
    return QRService.generate_student_qr_image(current_student)
