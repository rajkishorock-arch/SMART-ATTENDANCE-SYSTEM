"""
Feature 27: Multi-Factor Authentication (MFA) for Admins
TOTP-based 2FA using Google Authenticator compatible tokens.
Admins can enable/disable MFA, generate backup codes.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import secrets, hashlib, base64

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


def _generate_totp_secret() -> str:
    """Generate a base32 TOTP secret."""
    import base64
    raw = secrets.token_bytes(20)
    return base64.b32encode(raw).decode().rstrip("=")


def _verify_totp(secret: str, token: str) -> bool:
    """Verify a TOTP token using pyotp if available."""
    try:
        import pyotp
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)
    except ImportError:
        pass
    # Fallback: accept any 6-digit token in dev mode
    from .core import config
    if config.ENV == "development":
        return len(token) == 6 and token.isdigit()
    return False


def _generate_backup_codes() -> list:
    """Generate 10 single-use backup codes."""
    return [secrets.token_hex(4).upper() for _ in range(10)]


@router.post("/setup")
def setup_mfa(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Generate a TOTP secret for the current admin.
    Returns secret + QR code URL for Google Authenticator.
    """
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    secret = _generate_totp_secret()
    backup_codes = _generate_backup_codes()

    # Store secret + backup codes
    current_user.mfa_secret = secret
    current_user.mfa_backup_codes = ",".join(backup_codes)
    current_user.mfa_enabled = False  # Not enabled until verified
    db.commit()

    # TOTP QR URI
    label = f"SmartAttendance:{current_user.email}"
    try:
        import pyotp
        totp = pyotp.TOTP(secret)
        qr_uri = totp.provisioning_uri(name=current_user.email, issuer_name="Smart Attendance")
    except ImportError:
        qr_uri = f"otpauth://totp/{label}?secret={secret}&issuer=SmartAttendance"

    return {
        "secret": secret,
        "qr_uri": qr_uri,
        "backup_codes": backup_codes,
        "message": "Scan the QR code with Google Authenticator. Then call /mfa/verify-setup to activate.",
    }


@router.post("/verify-setup")
def verify_mfa_setup(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Verify first TOTP token to activate MFA."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    token = payload.get("token", "")
    if not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="Run /mfa/setup first.")

    if not _verify_totp(current_user.mfa_secret, token):
        raise HTTPException(status_code=401, detail="Invalid TOTP token. Try again.")

    current_user.mfa_enabled = True
    db.commit()

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action="MFA enabled via TOTP setup."
        ),
        institution_id=current_user.institution_id,
    )
    return {"message": "MFA enabled. Your account is now protected with 2FA."}


@router.post("/verify")
def verify_mfa_token(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Verify a TOTP token for a sensitive action (e.g. bulk delete, settings change)."""
    token = payload.get("token", "")
    backup = payload.get("backup_code", "")

    if not current_user.mfa_enabled:
        return {"verified": True, "method": "mfa_disabled"}

    if not current_user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA secret not configured.")

    # Check TOTP
    if token and _verify_totp(current_user.mfa_secret, token):
        return {"verified": True, "method": "totp"}

    # Check backup code
    if backup:
        codes = (current_user.mfa_backup_codes or "").split(",")
        backup_upper = backup.upper().strip()
        if backup_upper in codes:
            # Remove used backup code
            codes.remove(backup_upper)
            current_user.mfa_backup_codes = ",".join(codes)
            db.commit()
            return {"verified": True, "method": "backup_code", "remaining_backup_codes": len(codes)}

    raise HTTPException(status_code=401, detail="Invalid MFA token or backup code.")


@router.post("/disable")
def disable_mfa(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Disable MFA (requires current TOTP or backup code)."""
    token = payload.get("token", "")
    backup = payload.get("backup_code", "")

    verified = False
    if token and current_user.mfa_secret and _verify_totp(current_user.mfa_secret, token):
        verified = True
    if backup:
        codes = (current_user.mfa_backup_codes or "").split(",")
        if backup.upper().strip() in codes:
            verified = True

    if not verified:
        raise HTTPException(status_code=401, detail="Verification failed. Cannot disable MFA.")

    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    current_user.mfa_backup_codes = None
    db.commit()

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(user_email=current_user.email, action="MFA disabled by user."),
        institution_id=current_user.institution_id,
    )
    return {"message": "MFA disabled."}


@router.get("/status")
def get_mfa_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get MFA status for the current user."""
    backup_count = len((current_user.mfa_backup_codes or "").split(",")) if current_user.mfa_backup_codes else 0
    return {
        "mfa_enabled": current_user.mfa_enabled or False,
        "secret_configured": bool(current_user.mfa_secret),
        "backup_codes_remaining": backup_count,
    }
