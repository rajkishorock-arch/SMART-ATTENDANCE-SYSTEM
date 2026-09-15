"""
Biometric Fallback System Router (Phase 9)
Provides time-bound rolling dynamic QR tokens (HMAC-SHA256 rotating every 30s)
and emergency classroom session PINs for camera malfunction or physical occlusion.
Enforces immutable audit logging and explicit verification_method recording.
"""
import time
import hmac
import hashlib
import secrets
import threading
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from . import models, schemas, security, crud
from .database import get_db

router = APIRouter()

from app.services.fallback_service import (
    FallbackService,
    ROTATION_WINDOW_SECONDS,
    _fallback_service_lock,
)

# Re-export helper functions for backward compatibility with existing tests/modules
_generate_rolling_token = FallbackService.generate_rolling_token
_verify_rolling_token = FallbackService.verify_rolling_token


@router.post("/generate-session", response_model=schemas.FallbackSessionResponse)
def generate_fallback_session(
    payload: schemas.FallbackSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Teacher generates a time-bound fallback session for a lecture.
    Produces a 64-char HMAC secret and 6-digit session PIN.
    """
    return FallbackService.create_fallback_session(
        db=db,
        payload=payload,
        current_user=current_user
    )


@router.get("/active-token/{session_id}", response_model=schemas.ActiveRollingTokenResponse)
def get_active_rolling_token(
    session_id: int,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Teacher presentation screen requests the current 30s rolling QR token.
    Token rotates continuously to prevent replay screenshots.
    """
    return FallbackService.get_active_rolling_token(
        db=db,
        session_id=session_id,
        identity=identity
    )


@router.post("/claim-qr", response_model=schemas.FallbackClaimResult)
def claim_attendance_via_qr(
    payload: schemas.ClaimQrPayload,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Student scans the dynamic rolling QR code from the teacher's screen.
    Validates cryptographic HMAC against current 30s bucket, enforces per-student
    single-claim protection, verifies tenant geofence if enabled, and logs audit.
    """
    return FallbackService.claim_attendance_via_qr(
        db=db,
        payload=payload,
        identity=identity
    )


@router.post("/claim-pin", response_model=schemas.FallbackClaimResult)
def claim_attendance_via_pin(
    payload: schemas.ClaimPinPayload,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Student submits the emergency 6-digit session PIN with a mandatory reason.
    Marks attendance with verification_method = SESSION_PIN.
    """
    return FallbackService.claim_attendance_via_pin(
        db=db,
        payload=payload,
        identity=identity
    )
