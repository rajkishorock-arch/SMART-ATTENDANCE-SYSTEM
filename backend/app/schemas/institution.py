"""schemas/institution.py — Institution domain schemas"""
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.common import _OrmBase

class InstitutionBrandingResponse(_OrmBase):
    id: int
    name: str
    slug: str
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    app_name: Optional[str] = None
    custom_domain: Optional[str] = None
    subscription_plan: Optional[str] = None
    subscription_status: Optional[str] = None
    student_limit: Optional[int] = None


class InstitutionCreate(BaseModel):
    name: str
    slug: str
    primary_color: Optional[str] = "#4F46E5"
    secondary_color: Optional[str] = "#06B6D4"
    logo_url: Optional[str] = ""
    app_name: Optional[str] = None
    custom_domain: Optional[str] = None
    subscription_plan: Optional[str] = "free"
    student_limit: Optional[int] = None
    admin_email: EmailStr
    admin_name: str
    admin_password: str


class InstitutionMasterKeyUpdate(BaseModel):
    current_master_key: str
    new_master_key: str


class InstitutionUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    logo_url: Optional[str] = None
    app_name: Optional[str] = None
    custom_domain: Optional[str] = None
    subscription_plan: Optional[str] = None
    subscription_status: Optional[str] = None
    student_limit: Optional[int] = None


class DepartmentBase(BaseModel):
    name: str
    code: Optional[str] = None


class DepartmentCreate(DepartmentBase):
    pass


class Department(_OrmBase, DepartmentBase):
    id: int
    institution_id: int


__all__ = ['InstitutionBrandingResponse', 'InstitutionCreate', 'InstitutionMasterKeyUpdate', 'InstitutionUpdate', 'DepartmentBase', 'DepartmentCreate', 'Department']
