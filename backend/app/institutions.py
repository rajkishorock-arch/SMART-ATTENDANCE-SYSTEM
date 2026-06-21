from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from . import models, schemas
from .database import get_db

router = APIRouter()

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
