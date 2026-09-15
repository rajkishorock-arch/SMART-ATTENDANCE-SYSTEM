"""
User & Student Repository: encapsulates database access for User and Student entities
with strict multi-tenant isolation.
"""
from sqlalchemy.orm import Session
from typing import Optional, List

from app import models


class UserRepository:
    """Encapsulates raw database queries for User and Student models."""

    @staticmethod
    def get_user_by_email(
        db: Session,
        email: str,
        institution_id: Optional[int] = None
    ) -> Optional[models.User]:
        """Finds user by email (case-insensitive), optionally scoped by institution_id."""
        from sqlalchemy import func
        clean_email = email.strip() if email else ""
        query = db.query(models.User).filter(func.lower(models.User.email) == func.lower(clean_email))
        if institution_id is not None:
            query = query.filter(models.User.institution_id == institution_id)
        return query.first()


    @staticmethod
    def get_student_by_email(
        db: Session,
        email: str,
        institution_id: Optional[int] = None
    ) -> Optional[models.StudentModel]:
        """Finds student by email (case-insensitive), optionally scoped by institution_id."""
        from sqlalchemy import func
        clean_email = email.strip() if email else ""
        query = db.query(models.StudentModel).filter(func.lower(models.StudentModel.email) == func.lower(clean_email))
        if institution_id is not None:
            query = query.filter(models.StudentModel.institution_id == institution_id)
        return query.first()


    @staticmethod
    def get_student_by_id(
        db: Session,
        student_id: int,
        institution_id: Optional[int] = None
    ) -> Optional[models.StudentModel]:
        """Finds student by primary ID, optionally scoped by institution_id."""
        query = db.query(models.StudentModel).filter(models.StudentModel.id == student_id)
        if institution_id is not None:
            query = query.filter(models.StudentModel.institution_id == institution_id)
        return query.first()

    @staticmethod
    def get_students(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        institution_id: Optional[int] = None,
        department: Optional[str] = None
    ) -> List[models.StudentModel]:
        """Retrieves list of students filtered by tenant institution and optional department."""
        query = db.query(models.StudentModel)
        if institution_id is not None:
            query = query.filter(models.StudentModel.institution_id == institution_id)
        if department:
            query = query.filter(models.StudentModel.dep == department)
        return query.offset(skip).limit(limit).all()
