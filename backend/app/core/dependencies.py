"""
Centralized FastAPI Security and Tenant Dependencies.

Provides reusable dependencies for request authentication, role-based access
control (RBAC), and tenant ownership verification across all route handlers.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional, List, Any

from app.core import config
from app.database import get_db
from app import crud, models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")


class AuthIdentity:
    """Unified identity representing either a User (admin/teacher/hod/staff) or a Student."""
    def __init__(self, id: int, email: str, role: str, name: str, institution_id: int, model_instance: Any):
        self.id = id
        self.email = email
        self.role = role
        self.name = name
        self.institution_id = institution_id
        self.model = model_instance
        self.is_department_head = getattr(model_instance, "is_department_head", False)
        self.department = getattr(model_instance, "department", None) or getattr(model_instance, "dep", None)


def is_system_owner(identity_or_user: Any) -> bool:
    """Checks if the authenticated entity is the configured System Owner."""
    if not identity_or_user or not getattr(identity_or_user, "email", None):
        return False
    owner_email = getattr(config, "SYSTEM_OWNER_EMAIL", "rajkishorock@gmail.com")
    if not owner_email:
        return False
    return identity_or_user.email.strip().lower() == owner_email.strip().lower()


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> models.User:
    """FastAPI dependency resolving active staff/admin/teacher User."""
    from jose import JWTError, jwt
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


def get_current_student(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> models.StudentModel:
    """FastAPI dependency resolving active StudentModel."""
    from jose import JWTError, jwt
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


def get_current_identity(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> AuthIdentity:
    """FastAPI dependency resolving unified AuthIdentity (either User or Student)."""
    from jose import JWTError, jwt
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
    """FastAPI dependency enforcing RBAC role checks."""
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


def get_current_institution_id(identity: AuthIdentity = Depends(get_current_identity)) -> int:
    """Extracts current tenant/institution_id from authenticated identity."""
    return identity.institution_id


def verify_tenant_isolation(requested_institution_id: int, current_institution_id: int):
    """Enforces strict tenant matching. Raises 403 on cross-tenant access."""
    if requested_institution_id != current_institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-tenant access forbidden: Cannot access data belonging to another institution."
        )


def verify_tenant_access(target_institution_id: int, identity: AuthIdentity):
    """
    Enforces multi-tenant boundary with intentional System Owner global access.
    Non-owners attempting cross-tenant access are rejected with 403.
    """
    if is_system_owner(identity):
        return
    verify_tenant_isolation(target_institution_id, identity.institution_id)
