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

ROTATION_WINDOW_SECONDS = 30


def _generate_rolling_token(secret: str, session_id: int, time_step: int) -> str:
    """Generates an HMAC-SHA256 rolling token for a specific 30s time bucket."""
    msg = f"{session_id}:{time_step}".encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    return f"FALLBACK:{session_id}:{time_step}:{sig[:16]}"


def _verify_rolling_token(secret: str, session_id: int, token: str) -> bool:
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

        expected = _generate_rolling_token(secret, session_id, token_time_step)
        return hmac.compare_digest(token, expected)
    except Exception:
        return False


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
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Faculty or staff access only.")

    subject = db.query(models.Subject).filter(
        models.Subject.id == payload.subject_id,
        models.Subject.institution_id == current_user.institution_id
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")

    now_utc = datetime.now(timezone.utc)
    expires_at = now_utc + timedelta(minutes=payload.duration_minutes or 60)
    session_date = payload.session_date or now_utc.strftime("%d/%m/%Y")

    # Cryptographic seed and PIN
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

    token = _generate_rolling_token(session.session_secret, session.id, current_step)

    return schemas.ActiveRollingTokenResponse(
        session_id=session.id,
        token=token,
        seconds_remaining=seconds_remaining,
        expires_in=ROTATION_WINDOW_SECONDS
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
    from sqlalchemy.exc import IntegrityError
    from .security_utils import verify_geofence

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

    if not _verify_rolling_token(session.session_secret, session.id, payload.token):
        raise HTTPException(status_code=400, detail="QR token has expired or signature is invalid. Rescan new QR.")

    student = db.query(models.StudentModel).filter(
        models.StudentModel.email == identity.email,
        models.StudentModel.institution_id == identity.institution_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    # 1. Per-student single claim protection (session_id, student_id)
    existing_claim = db.query(models.AttendanceFallbackClaim).filter(
        models.AttendanceFallbackClaim.session_id == session.id,
        models.AttendanceFallbackClaim.student_id == student.id
    ).first()
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
        # Geofence disabled: QR attendance continues without GPS, but explicitly unverified
        geofence_verified = False
        verification_method = "DYNAMIC_QR_UNVERIFIED_LOCATION"
        audit_reason = "Geofence disabled: No proximity attestation"

    _fallback_lock = getattr(claim_attendance_via_qr, "_lock", None)
    if _fallback_lock is None:
        _fallback_lock = threading.Lock()
        claim_attendance_via_qr._lock = _fallback_lock

    with _fallback_lock:
        # 3. Atomically register claim in database
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
            already_claimed = db.query(models.AttendanceFallbackClaim).filter(
                models.AttendanceFallbackClaim.session_id == session.id,
                models.AttendanceFallbackClaim.student_id == student.id
            ).first()
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

    time_str = now_utc.strftime("%H:%M")
    date_str = session.session_date
    rec_id = f"{student.roll}_{session.subject_id}_{date_str}_{time_str}".replace("/", "-").replace(":", "-")

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

    return schemas.FallbackClaimResult(
        success=True,
        message="Attendance recorded successfully via Emergency Session PIN.",
        verification_method="SESSION_PIN",
        attendance_record_id=rec_id
    )
