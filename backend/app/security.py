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

def get_current_user(db: Session = Depends(database.get_db), token: str = Depends(oauth2_scheme)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
        email: str = payload.get("sub")
        institution_id: Optional[int] = payload.get("institution_id")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = crud.get_user_by_email(db, email=email, institution_id=institution_id)
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def get_current_student(db: Session = Depends(database.get_db), token: str = Depends(oauth2_scheme)) -> models.StudentModel:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        institution_id: Optional[int] = payload.get("institution_id")
        if email is None or role != "student":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    student = crud.get_student_by_email(db, email=email, institution_id=institution_id)
    if student is None:
        raise credentials_exception
    return student

class AuthIdentity:
    """Unified identity representing either a User (admin/teacher/hod) or a Student."""
    def __init__(self, id: int, email: str, role: str, name: str, institution_id: int, model_instance: Any):
        self.id = id
        self.email = email
        self.role = role
        self.name = name
        self.institution_id = institution_id
        self.model = model_instance
        self.is_department_head = getattr(model_instance, "is_department_head", False)
        self.department = getattr(model_instance, "department", None) or getattr(model_instance, "dep", None)

def get_current_identity(db: Session = Depends(database.get_db), token: str = Depends(oauth2_scheme)) -> AuthIdentity:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        institution_id: Optional[int] = payload.get("institution_id")
        if email is None or not role or institution_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    if role == "student":
        student = crud.get_student_by_email(db, email=email, institution_id=institution_id)
        if not student:
            raise credentials_exception
        return AuthIdentity(
            id=student.id,
            email=student.email,
            role="student",
            name=student.name or "Student",
            institution_id=student.institution_id,
            model_instance=student
        )
    else:
        user = crud.get_user_by_email(db, email=email, institution_id=institution_id)
        if not user or not user.is_active:
            raise credentials_exception
        return AuthIdentity(
            id=user.id,
            email=user.email,
            role=user.role,
            name=user.name or "Staff",
            institution_id=user.institution_id,
            model_instance=user
        )

def require_roles(allowed_roles: List[str]):
    """FastAPI dependency to enforce role-based access control (RBAC)."""
    def _role_checker(identity: AuthIdentity = Depends(get_current_identity)) -> AuthIdentity:
        effective_roles = [identity.role]
        if identity.is_department_head:
            effective_roles.append("hod")
        if identity.role == "admin":
            effective_roles.extend(["hod", "teacher", "counselor", "staff"])

        has_access = any(r in allowed_roles for r in effective_roles)
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles}, your role is '{identity.role}'"
            )
        return identity
    return _role_checker

def verify_tenant_isolation(requested_institution_id: int, current_institution_id: int):
    """Enforces strict multi-tenant boundary checks."""
    if requested_institution_id != current_institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-tenant access forbidden: Cannot access data belonging to another institution."
        )
