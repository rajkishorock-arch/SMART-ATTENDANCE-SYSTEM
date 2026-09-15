"""schemas/student.py — Student domain schemas"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.common import _OrmBase

class StudentBase(BaseModel):
    id: int
    name: str
    roll: str
    dep: str
    course: str
    year: str
    semester: str
    gender: Optional[str] = None
    dob: Optional[str] = None
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    teacher: Optional[str] = None
    photo: Optional[str] = None


class StudentCreate(StudentBase):
    pass


class Student(_OrmBase, StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    roll: Optional[str] = None
    dep: Optional[str] = None
    course: Optional[str] = None
    year: Optional[str] = None
    semester: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    teacher: Optional[str] = None
    password: Optional[str] = None


class StudentChangePassword(BaseModel):
    old_password: str
    new_password: str


class StudentPublicRegister(BaseModel):
    name: str
    email: EmailStr
    roll: str
    password: str
    institution_code: str
    dep: str
    course: str
    year: str
    semester: str
    gender: Optional[str] = None
    dob: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_email: Optional[str] = None
    parent_phone: Optional[str] = None


class FaceValidationResult(BaseModel):
    is_valid: bool
    face_count: int
    blur_score: float
    is_blurry: bool
    brightness_score: float
    is_illumination_good: bool
    face_width: Optional[int] = None
    face_height: Optional[int] = None
    is_face_size_good: bool
    duplicate_student_id: Optional[int] = None
    duplicate_student_name: Optional[str] = None
    duplicate_similarity: Optional[float] = None
    quality_rating: str  # EXCELLENT, GOOD, POOR, REJECTED
    feedback_message: str


class FaceSampleResponse(_OrmBase):
    id: int
    institution_id: int
    student_id: int
    pose: str
    sample_quality_score: float
    blur_score: Optional[float] = None
    brightness_score: Optional[float] = None
    image_url: Optional[str] = None
    enrolled_at: datetime


class ReEnrollmentRequestCreate(BaseModel):
    student_id: int
    reason: str  # FACIAL_CHANGE, LOW_QUALITY, SURGERY_GLASSES, ROUTINE_EXPIRY
    description: Optional[str] = None


class ReEnrollmentRequestResponse(_OrmBase):
    id: int
    institution_id: int
    student_id: int
    student_name: Optional[str] = None
    student_roll: Optional[str] = None
    reason: str
    description: Optional[str] = None
    status: str
    requested_by: str
    approved_by: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


__all__ = ['StudentBase', 'StudentCreate', 'Student', 'StudentUpdate', 'StudentChangePassword', 'StudentPublicRegister', 'FaceValidationResult', 'FaceSampleResponse', 'ReEnrollmentRequestCreate', 'ReEnrollmentRequestResponse']
