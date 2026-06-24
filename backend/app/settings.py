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
    return crud.get_system_settings(db, institution_id=current_user.institution_id)

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
        
    updated = crud.update_system_settings(db, settings_update, institution_id=current_user.institution_id)
    
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Updated security settings: {settings_update.dict(exclude_unset=True)}"
        ),
        institution_id=current_user.institution_id
    )
    return updated

@router.post("/release-update")
def publish_system_update(
    payload: schemas.ReleaseUpdatePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Publish a new system-wide release update. (System Owner only, master password verified).
    """
    if current_user.email.strip().lower() != "rajkishorock@gmail.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the System Owner (rajkishorock@gmail.com) can publish release updates."
        )
        
    import os
    global_key = os.getenv("DEVELOPER_MASTER_KEY", "dev_master_raj_9211_secure")
    
    # Also resolve college specific master key
    college_key = None
    if current_user.institution_id:
        inst = db.query(models.Institution).filter(models.Institution.id == current_user.institution_id).first()
        if inst:
            college_key = inst.master_key
            
    # Verify input master password
    input_key = payload.master_password.strip()
    is_verified = (input_key == global_key) or (college_key and input_key == college_key)
    
    if not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect master password. Verification failed."
        )
        
    # Fetch Default Institution system settings
    settings = crud.get_system_settings(db, institution_id=1)
    settings.latest_version = payload.latest_version.strip()
    settings.update_download_url = payload.update_download_url.strip()
    db.commit()
    db.refresh(settings)
    
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"System Update Released: Version {payload.latest_version.strip()} ({payload.update_download_url.strip()})"
        ),
        institution_id=current_user.institution_id
    )
    return {"status": "success", "message": f"Version {payload.latest_version} successfully released!"}
