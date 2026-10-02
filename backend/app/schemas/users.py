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


class ProfileUpdatePayload(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    department: Optional[str] = None
    profile_pic: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None


class TeacherPublicRegister(BaseModel):
    institution_code: str
    name: str
    email: EmailStr
    password: str
    department: str


__all__ = [
    'UserBase',
    'UserCreate',
    'User',
    'UserUpdate',
    'UserChangePassword',
    'ProfileUpdatePayload',
    'OwnerPremiumGrantPayload',
    'OwnerPremiumRevokePayload',
    'TeacherPublicRegister'
]
