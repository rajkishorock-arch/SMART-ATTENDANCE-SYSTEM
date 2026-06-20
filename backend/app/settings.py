from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from . import crud, schemas, models, security
from .database import get_db

router = APIRouter()

@router.get("/", response_model=schemas.SystemSettingsResponse)
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Fetch current security and system settings (Admins only).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view security settings."
        )
    return crud.get_system_settings(db)

@router.put("/", response_model=schemas.SystemSettingsResponse)
def update_system_settings(
    settings_update: schemas.SystemSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Update system settings (Admins only).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can modify security settings."
        )
        
    updated = crud.update_system_settings(db, settings_update)
    
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Updated security settings: {settings_update.dict(exclude_unset=True)}"
        )
    )
    return updated
