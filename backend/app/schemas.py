from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Token ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- User (Admins/Teachers) ---
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "admin"
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_department: Optional[str] = None

class User(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_department: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True

# --- Student ---
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

class Student(StudentBase):
    class Config:
        from_attributes = True
        orm_mode = True

# --- Attendance ---
class AttendanceBase(BaseModel):
    id: str
    roll: str
    name: str
    department: str
    time: str
    date: str
    attendance: str
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    pass

class Attendance(AttendanceBase):
    class Config:
        from_attributes = True
        orm_mode = True

# --- Audit Log ---
class AuditLogCreate(BaseModel):
    user_email: str
    action: str

# --- Stats Schema ---
class DashboardStats(BaseModel):
    total_students: int
    total_present_today: int
    total_absent_today: int
    average_attendance_rate: float
    department_stats: Dict[str, int]
    weekly_trends: List[Dict[str, Any]]

# --- Student Self Service ---
class StudentChangePassword(BaseModel):
    old_password: str
    new_password: str

# --- System Settings ---
class SystemSettingsBase(BaseModel):
    geofencing_enabled: bool
    center_latitude: float
    center_longitude: float
    allowed_radius_meters: float
    ip_restriction_enabled: bool
    allowed_ip_ranges: str

class SystemSettingsUpdate(BaseModel):
    geofencing_enabled: Optional[bool] = None
    center_latitude: Optional[float] = None
    center_longitude: Optional[float] = None
    allowed_radius_meters: Optional[float] = None
    ip_restriction_enabled: Optional[bool] = None
    allowed_ip_ranges: Optional[str] = None

class SystemSettingsResponse(SystemSettingsBase):
    id: int

    class Config:
        from_attributes = True
        orm_mode = True

# --- Subject ---
class SubjectBase(BaseModel):
    name: str
    code: str
    department: str
    teacher_id: Optional[int] = None

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int
    teacher_name: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True

# --- Schedule ---
class ScheduleBase(BaseModel):
    subject_id: int
    day_of_week: str
    start_time: str
    end_time: str

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleResponse(ScheduleBase):
    id: int
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True

# --- User Update ---
class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    subject_department: Optional[str] = None

# --- Student Update ---
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

# --- Feedback ---
class FeedbackCreate(BaseModel):
    type: str
    message: str
    rating: int

class FeedbackResponse(BaseModel):
    id: int
    user_email: str
    role: str
    type: str
    message: str
    rating: int
    created_at: datetime

    class Config:
        from_attributes = True
        orm_mode = True