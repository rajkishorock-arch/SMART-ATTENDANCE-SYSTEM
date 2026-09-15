"""schemas/common.py — Common domain schemas"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class _OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class DashboardStats(BaseModel):
    total_students: int
    total_present_today: int
    total_absent_today: int
    average_attendance_rate: float
    department_stats: Dict[str, int]
    weekly_trends: List[Dict[str, Any]]


__all__ = ['_OrmBase', 'Token', 'TokenData', 'DashboardStats']
