from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import os
from . import models, schemas, security
from .database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.InstitutionBrandingResponse])
def list_institutions(db: Session = Depends(get_db)):
    """
    List all active institutions for the login dropdown selector.
    """
    return db.query(models.Institution).filter(models.Institution.is_active == True).order_by(models.Institution.id.asc()).all()

@router.get("/branding/{slug}", response_model=schemas.InstitutionBrandingResponse)
def get_branding(slug: str, db: Session = Depends(get_db)):
    """
    Fetch branding settings (name, slug, logo_url, colors) for a given institution slug.
    """
    inst = db.query(models.Institution).filter(models.Institution.slug == slug).first()
    if not inst:
        # Fallback to default branding if slug is unknown
        inst = db.query(models.Institution).filter(models.Institution.id == 1).first()
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution branding config not found"
        )
    return inst

@router.post("/", response_model=schemas.InstitutionBrandingResponse, status_code=status.HTTP_201_CREATED)
def create_institution(
    payload: schemas.InstitutionCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Create a new institution with branding settings and a default admin user.
    Only accessible by the admin of the Default Institution (id=1).
    """
    if current_user.role != "admin" or current_user.institution_id != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Default System Administrator can manage institutions."
        )

    # Verify master password header
    master_header = request.headers.get("x-master-password")
    expected_key = os.getenv("DEVELOPER_MASTER_KEY", "dev_master_raj_9211_secure")
    if master_header != expected_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Master Password! Master key verification is required to add a new institution/college."
        )

    slug_clean = payload.slug.strip().lower()
    existing_slug = db.query(models.Institution).filter(models.Institution.slug == slug_clean).first()
    if existing_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An institution with slug '{slug_clean}' already exists."
        )

    existing_name = db.query(models.Institution).filter(models.Institution.name == payload.name.strip()).first()
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An institution named '{payload.name}' already exists."
        )

    # 1. Create the Institution
    new_inst = models.Institution(
        name=payload.name.strip(),
        slug=slug_clean,
        primary_color=payload.primary_color,
        secondary_color=payload.secondary_color,
        logo_url=payload.logo_url,
        is_active=True
    )
    db.add(new_inst)
    db.commit()
    db.refresh(new_inst)

    # 2. Create the default Admin User for this institution
    hashed_pw = security.get_password_hash(payload.admin_password)
    new_admin = models.User(
        institution_id=new_inst.id,
        name=payload.admin_name.strip(),
        email=payload.admin_email.strip().lower(),
        password_hash=hashed_pw,
        role="admin",
        is_active=True
    )
    db.add(new_admin)

    # 3. Create default System Settings for this institution
    new_settings = models.SystemSettings(
        institution_id=new_inst.id,
        geofencing_enabled=False,
        center_latitude=28.6139,
        center_longitude=77.2090,
        allowed_radius_meters=100.0,
        ip_restriction_enabled=False,
        allowed_ip_ranges="127.0.0.1,192.168.1.0/24"
    )
    db.add(new_settings)
    db.commit()
    db.refresh(new_inst)

    # Queue welcome email to be sent in background
    from . import email_service
    background_tasks.add_task(
        email_service.send_welcome_email,
        admin_email=payload.admin_email.strip().lower(),
        admin_name=payload.admin_name.strip(),
        institution_name=payload.name.strip(),
        slug=slug_clean,
        raw_password=payload.admin_password
    )

    return new_inst

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_institution(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Delete an institution. All child records (users, students, logs, attendance) cascade delete automatically.
    Only accessible by the admin of the Default Institution (id=1).
    """
    if current_user.role != "admin" or current_user.institution_id != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Default System Administrator can manage institutions."
        )

    if id == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The Default Institution (ID: 1) cannot be deleted."
        )

    inst = db.query(models.Institution).filter(models.Institution.id == id).first()
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found."
        )

    db.delete(inst)
    db.commit()
    return {"message": "Institution deleted successfully."}

