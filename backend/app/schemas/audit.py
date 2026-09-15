"""schemas/audit.py — Audit domain schemas"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.common import _OrmBase

class AuditLogCreate(BaseModel):
    user_email: str
    action: str
    role: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    ip_address: Optional[str] = None


class AuditLogResponse(_OrmBase):
    id: int
    institution_id: Optional[int] = None
    timestamp: Optional[datetime] = None
    user_email: str
    role: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    ip_address: Optional[str] = None


__all__ = ['AuditLogCreate', 'AuditLogResponse']
