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


# ── Standard Response & Error Schemas (Phase 3C) ──────────────────────────────
from typing import Generic, TypeVar

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standardized generic API response wrapper for new and migratable endpoints."""
    success: bool = True
    message: str = "Operation successful"
    data: Optional[T] = None


class ApiErrorDetail(BaseModel):
    """Structured error descriptor."""
    code: str
    details: Optional[Any] = None


class ApiErrorResponse(BaseModel):
    """Standardized API error response with backward-compatible detail field."""
    success: bool = False
    message: str
    detail: Optional[str] = None
    error: ApiErrorDetail


class PaginationParams(BaseModel):
    """Standard pagination query parameters."""
    skip: int = 0
    limit: int = 100


class PaginationMeta(BaseModel):
    """Pagination metadata container."""
    total: int
    skip: int
    limit: int
    page: int
    page_size: int
    total_pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated collection response."""
    success: bool = True
    message: str = "Operation successful"
    data: List[T]
    pagination: PaginationMeta


def api_response(data: Any = None, message: str = "Operation successful", success: bool = True) -> Dict[str, Any]:
    """Helper factory for standardized JSON response dictionaries."""
    return {
        "success": success,
        "message": message,
        "data": data,
    }


__all__ = [
    '_OrmBase',
    'Token',
    'TokenData',
    'DashboardStats',
    'ApiResponse',
    'ApiErrorDetail',
    'ApiErrorResponse',
    'PaginationParams',
    'PaginationMeta',
    'PaginatedResponse',
    'api_response',
]
