from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
import hashlib
import hmac
import os

from .core import config
from . import crud, models, database

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")

PBKDF2_ITERATIONS = 600000

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against stored hash (supports legacy and upgraded formats)."""
    if not plain_password or not hashed_password:
        return False
    try:
        if hashed_password.startswith("pbkdf2_sha256$"):
            parts = hashed_password.split("$")
            if len(parts) != 4:
                return False
            iterations = int(parts[1])
            salt = bytes.fromhex(parts[2])
            key = bytes.fromhex(parts[3])
            new_key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, iterations)
            return hmac.compare_digest(new_key, key)
        elif ":" in hashed_password:
            # Legacy 20,000 iteration PBKDF2 hash format
            salt_hex, key_hex = hashed_password.split(":")
            salt = bytes.fromhex(salt_hex)
            key = bytes.fromhex(key_hex)
            new_key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 20000)
            return hmac.compare_digest(new_key, key)
        return False
    except Exception as ex:
        print(f"VERIFY_PASSWORD EXCEPTION: {type(ex).__name__}: {ex}")
        return False

def needs_rehash(hashed_password: str) -> bool:
    """Returns True if the hashed password uses legacy format and should be upgraded."""
    if not hashed_password:
        return False
    if not hashed_password.startswith("pbkdf2_sha256$"):
        return True
    return False

def get_password_hash(password: str) -> str:
    """Generates strong PBKDF2-HMAC-SHA256 password hash using 600,000 iterations."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${key.hex()}"

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, config.JWT_SECRET_KEY, algorithm=config.ALGORITHM)
    return encoded_jwt

# Centralized FastAPI Security & Tenant Dependencies (re-exported for backward compatibility)
from app.core.dependencies import (
    oauth2_scheme,
    AuthIdentity,
    get_current_user,
    get_current_student,
    get_current_identity,
    require_roles,
    get_current_institution_id,
    verify_tenant_isolation,
    verify_tenant_access,
    is_system_owner,
)
