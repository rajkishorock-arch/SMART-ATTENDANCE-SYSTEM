from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import os
from . import models, schemas, security
from .billing import PLANS, get_student_usage
from .database import get_db
from .security_utils import verify_global_master_key, verify_master_key_for_institution

router = APIRouter()


class InstitutionFaqUpdate(BaseModel):
    faq_json: str
    app_name: Optional[str] = None


def normalize_custom_domain(domain: Optional[str]) -> Optional[str]:
    if domain is None:
        return None
    cleaned = domain.strip().lower()
    cleaned = cleaned.replace("https://", "").replace("http://", "").strip("/")
    return cleaned or None


def validate_plan(plan: Optional[str]) -> str:
    plan_name = (plan or "free").strip().lower()
    if plan_name not in PLANS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid subscription plan '{plan_name}'.",
        )
    return plan_name

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
    if not verify_global_master_key(master_header):
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

    custom_domain = normalize_custom_domain(payload.custom_domain)
    if custom_domain:
        existing_domain = db.query(models.Institution).filter(
            models.Institution.custom_domain == custom_domain
        ).first()
        if existing_domain:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Custom domain '{custom_domain}' is already assigned to another institution."
            )

    plan_name = validate_plan(payload.subscription_plan)
    plan_limit = PLANS[plan_name]["student_limit"]
    student_limit = payload.student_limit or plan_limit
    if student_limit < 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student limit must be at least 1.")

    # Generate college-specific master password
    import secrets
    import string
    alphabet = string.ascii_uppercase + string.digits
    part1 = ''.join(secrets.choice(alphabet) for _ in range(4))
    part2 = ''.join(secrets.choice(alphabet) for _ in range(4))
    generated_master_key = f"MK-{part1}-{part2}"

    # 1. Create the Institution
    new_inst = models.Institution(
        name=payload.name.strip(),
        slug=slug_clean,
        primary_color=payload.primary_color,
        secondary_color=payload.secondary_color,
        logo_url=payload.logo_url,
        app_name=payload.app_name,
        custom_domain=custom_domain,
        subscription_plan=plan_name,
        subscription_status="active",
        student_limit=student_limit,
        is_active=True,
        master_key=generated_master_key
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
        raw_password=payload.admin_password,
        master_key=generated_master_key
    )

    return new_inst


@router.get("/{id}/saas-summary")
def get_institution_saas_summary(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    if current_user.institution_id != 1 and current_user.institution_id != id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view another institution")

    inst = db.query(models.Institution).filter(models.Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Institution not found")

    usage = get_student_usage(db, id)
    admin_count = db.query(models.User).filter(
        models.User.institution_id == id,
        models.User.role == "admin",
    ).count()
    teacher_count = db.query(models.User).filter(
        models.User.institution_id == id,
        models.User.role == "teacher",
    ).count()
    department_count = db.query(models.Department).filter(models.Department.institution_id == id).count()
    subject_count = db.query(models.Subject).filter(models.Subject.institution_id == id).count()

    setup_steps = [
        {
            "id": "branding",
            "label": "Branding configured",
            "complete": bool(inst.app_name or inst.logo_url or (inst.primary_color and inst.secondary_color)),
        },
        {
            "id": "admins",
            "label": "At least one admin exists",
            "complete": admin_count > 0,
        },
        {
            "id": "academics",
            "label": "Departments or subjects configured",
            "complete": department_count > 0 or subject_count > 0,
        },
        {
            "id": "students",
            "label": "Students imported or registered",
            "complete": usage["student_count"] > 0,
        },
        {
            "id": "subscription",
            "label": "Subscription active",
            "complete": usage["status"] == "active",
        },
    ]

    return {
        "institution": {
            "id": inst.id,
            "name": inst.name,
            "slug": inst.slug,
            "app_name": inst.app_name,
            "custom_domain": inst.custom_domain,
            "is_active": inst.is_active,
        },
        "usage": usage,
        "counts": {
            "admins": admin_count,
            "teachers": teacher_count,
            "departments": department_count,
            "subjects": subject_count,
        },
        "setup_steps": setup_steps,
        "setup_complete": all(step["complete"] for step in setup_steps),
    }

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_institution(
    id: int,
    request: Request,
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

    # Verify master password header
    master_header = request.headers.get("x-master-password")
    if not verify_global_master_key(master_header):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Master Password! Master key verification is required to delete an institution."
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

@router.put("/master-key", status_code=status.HTTP_200_OK)
def update_college_master_key(
    payload: schemas.InstitutionMasterKeyUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can change the college master key."
        )
        
    inst_id = current_user.institution_id
    if inst_id == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The Default Institution master key is system-wide and cannot be modified here."
        )
        
    inst = db.query(models.Institution).filter(models.Institution.id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    current_key_input = payload.current_master_key.strip()
    is_valid = verify_master_key_for_institution(db, current_key_input, inst_id)
        
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Incorrect current master password! Verification failed."
        )
        
    new_key = payload.new_master_key.strip()
    if len(new_key) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New master key must be at least 6 characters long."
        )
        
    inst.master_key = new_key
    db.commit()
    
    return {"message": "Master key updated successfully."}

@router.put("/{id}", response_model=schemas.InstitutionBrandingResponse)
def update_institution(
    id: int,
    payload: schemas.InstitutionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Update an institution's branding and naming details.
    Only accessible by the admin of the Default Institution (id=1).
    """
    if current_user.role != "admin" or current_user.institution_id != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the Default System Administrator can manage institutions."
        )

    # Verify master password header
    master_header = request.headers.get("x-master-password")
    if not verify_global_master_key(master_header):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Master Password! Master key verification is required to update an institution."
        )

    inst = db.query(models.Institution).filter(models.Institution.id == id).first()
    if not inst:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found."
        )

    if id == 1 and payload.slug and payload.slug.strip().lower() != "default":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The Default Institution slug cannot be changed from 'default'."
        )

    if payload.name is not None:
        name_clean = payload.name.strip()
        if name_clean:
            # Check for name uniqueness
            existing_name = db.query(models.Institution).filter(
                models.Institution.name == name_clean,
                models.Institution.id != id
            ).first()
            if existing_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"An institution named '{name_clean}' already exists."
                )
            inst.name = name_clean

    if payload.slug is not None:
        slug_clean = payload.slug.strip().lower()
        if slug_clean:
            # Check for slug uniqueness
            existing_slug = db.query(models.Institution).filter(
                models.Institution.slug == slug_clean,
                models.Institution.id != id
            ).first()
            if existing_slug:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"An institution with slug '{slug_clean}' already exists."
                )
            inst.slug = slug_clean

    if payload.primary_color is not None:
        inst.primary_color = payload.primary_color
    if payload.secondary_color is not None:
        inst.secondary_color = payload.secondary_color
    if payload.logo_url is not None:
        inst.logo_url = payload.logo_url
    if payload.app_name is not None:
        inst.app_name = payload.app_name.strip() or None
    if payload.custom_domain is not None:
        custom_domain = normalize_custom_domain(payload.custom_domain)
        if custom_domain:
            existing_domain = db.query(models.Institution).filter(
                models.Institution.custom_domain == custom_domain,
                models.Institution.id != id
            ).first()
            if existing_domain:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Custom domain '{custom_domain}' is already assigned to another institution."
                )
        inst.custom_domain = custom_domain
    if payload.subscription_plan is not None:
        plan_name = validate_plan(payload.subscription_plan)
        inst.subscription_plan = plan_name
        if not payload.student_limit:
            inst.student_limit = PLANS[plan_name]["student_limit"]
    if payload.subscription_status is not None:
        status_clean = payload.subscription_status.strip().lower()
        if status_clean not in {"active", "trialing", "past_due", "cancelled", "suspended"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid subscription status.")
        inst.subscription_status = status_clean
    if payload.student_limit is not None:
        if payload.student_limit < 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student limit must be at least 1.")
        inst.student_limit = payload.student_limit

    db.commit()
    db.refresh(inst)
    return inst


@router.put("/{id}/faq")
def update_institution_faq(
    id: int,
    payload: InstitutionFaqUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if current_user.institution_id != id and current_user.institution_id != 1:
        raise HTTPException(status_code=403, detail="Cannot update another institution")
    inst = db.query(models.Institution).filter(models.Institution.id == id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
    inst.faq_json = payload.faq_json
    if payload.app_name:
        inst.app_name = payload.app_name
    db.commit()
    return {"message": "FAQ updated", "institution_id": id}
