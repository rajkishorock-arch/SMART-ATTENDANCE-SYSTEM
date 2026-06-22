import os
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from . import models, security, crud, schemas
from .database import get_db

router = APIRouter()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID", "")


class SsoLoginRequest(BaseModel):
    provider: str  # google, microsoft
    id_token: str
    institution_slug: Optional[str] = "default"


@router.get("/providers")
def list_sso_providers():
    providers = []
    if GOOGLE_CLIENT_ID:
        providers.append({"id": "google", "name": "Google Workspace", "client_id": GOOGLE_CLIENT_ID})
    if MICROSOFT_CLIENT_ID:
        providers.append({"id": "microsoft", "name": "Microsoft Azure AD", "client_id": MICROSOFT_CLIENT_ID})
    if not providers:
        providers.append({
            "id": "demo",
            "name": "Demo SSO (dev only)",
            "note": "Set GOOGLE_CLIENT_ID or MICROSOFT_CLIENT_ID for production SSO",
        })
    return {"providers": providers}


@router.post("/login")
def sso_login(payload: SsoLoginRequest, db: Session = Depends(get_db)):
    """SSO login: validates ID token and issues JWT. Demo mode accepts token as email."""
    email = None
    name = "SSO User"

    if payload.provider == "google" and GOOGLE_CLIENT_ID:
        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests
            idinfo = google_id_token.verify_oauth2_token(
                payload.id_token, google_requests.Request(), GOOGLE_CLIENT_ID
            )
            email = idinfo.get("email")
            name = idinfo.get("name", name)
        except ImportError:
            raise HTTPException(status_code=501, detail="google-auth library not installed")
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")
    elif payload.provider == "demo" or not GOOGLE_CLIENT_ID:
        if "@" in payload.id_token:
            email = payload.id_token.strip().lower()
            name = email.split("@")[0]
        else:
            raise HTTPException(status_code=400, detail="Demo SSO: pass email as id_token")
    else:
        raise HTTPException(status_code=400, detail="Unsupported SSO provider")

    inst = db.query(models.Institution).filter(
        models.Institution.slug == (payload.institution_slug or "default")
    ).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")

    user = crud.get_user_by_email(db, email, institution_id=inst.id)
    if not user:
        temp_pass = secrets.token_urlsafe(16)
        user = crud.create_user(
            db,
            schemas.UserCreate(email=email, name=name, password=temp_pass, role="teacher"),
            institution_id=inst.id,
        )
        user.sso_provider = payload.provider
        user.sso_subject = email
        db.commit()

    from .security import create_access_token
    token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "institution_id": user.institution_id,
    })
    return {"access_token": token, "token_type": "bearer", "role": user.role}
