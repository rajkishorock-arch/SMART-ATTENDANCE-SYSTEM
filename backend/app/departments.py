from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from . import models, schemas, security
from .database import get_db
from .users import verify_master_password

router = APIRouter()

@router.get("/", response_model=List[schemas.Department])
def list_departments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    List all departments registered for the current admin's institution.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view the department list."
        )
    return db.query(models.Department).filter(
        models.Department.institution_id == current_user.institution_id
    ).order_by(models.Department.name.asc()).all()

@router.post("/", response_model=schemas.Department, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: schemas.DepartmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Add a new department. Requires master password verification.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage departments."
        )
        
    # Verify master password (matches college master password or developer key)
    if not verify_master_password(db, request, current_user.institution_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Master Password! Verification is required to add departments."
        )
        
    name_clean = payload.name.strip()
    if not name_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department name cannot be empty."
        )
        
    # Check for duplicate name
    existing = db.query(models.Department).filter(
        models.Department.institution_id == current_user.institution_id,
        models.Department.name.ilike(name_clean)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department '{name_clean}' already exists."
        )
        
    new_dept = models.Department(
        institution_id=current_user.institution_id,
        name=name_clean,
        code=payload.code.strip() if payload.code else None
    )
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return new_dept

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_department(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Remove a department. Requires master password verification.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can manage departments."
        )
        
    # Verify master password
    if not verify_master_password(db, request, current_user.institution_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Master Password! Verification is required to delete departments."
        )
        
    dept = db.query(models.Department).filter(
        models.Department.id == id,
        models.Department.institution_id == current_user.institution_id
    ).first()
    
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found."
        )
        
    db.delete(dept)
    db.commit()
    return {"message": "Department deleted successfully."}
