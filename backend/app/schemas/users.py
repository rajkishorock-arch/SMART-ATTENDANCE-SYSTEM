"""schemas/users.py — Users domain schemas"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.common import _OrmBase

class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str
    role: Optional[str] = "admin"
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_department: Optional[str] = None


class User(_OrmBase, UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_department: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_department: Optional[str] = None


class UserChangePassword(BaseModel):
    old_password: str
    new_password: str


class OwnerPremiumGrantPayload(BaseModel):
    master_password: str
    institution_id: int
    plan: Optional[str] = "enterprise"
    student_limit: Optional[int] = 10000


class OwnerPremiumRevokePayload(BaseModel):
    master_password: str
    institution_id: int


class TeacherPublicRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    institution_code: str
    department: str


__all__ = ['UserBase', 'UserCreate', 'User', 'UserUpdate', 'UserChangePassword', 'OwnerPremiumGrantPayload', 'OwnerPremiumRevokePayload', 'TeacherPublicRegister']
