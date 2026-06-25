from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
import os

from . import crud, schemas, models, security
from .database import get_db
from .core import config
from .security_utils import verify_master_key_for_system_action

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
    if current_user.email.strip().lower() != config.SYSTEM_OWNER_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only the System Owner ({config.SYSTEM_OWNER_EMAIL}) can publish release updates."
        )
        
    input_key = payload.master_password.strip()
    is_verified = verify_master_key_for_system_action(db, input_key, current_user.institution_id)
    
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


@router.post("/toggle-update-active")
def toggle_update_active(
    payload: schemas.ToggleUpdatePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Toggle the system-wide update banner ON or OFF.
    - When active=True: All users see the update notification banner.
    - When active=False: Update banner is hidden for all users.
    Requires Master Password verification. (System Owner only)
    """
    if current_user.email.strip().lower() != config.SYSTEM_OWNER_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only the System Owner ({config.SYSTEM_OWNER_EMAIL}) can toggle release updates."
        )

    input_key = payload.master_password.strip()
    is_verified = verify_master_key_for_system_action(db, input_key, current_user.institution_id)

    if not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect master password. Verification failed."
        )

    # Update update_active flag on institution 1 (global settings)
    settings = crud.get_system_settings(db, institution_id=1)
    settings.update_active = payload.active
    db.commit()
    db.refresh(settings)

    action_word = "ENABLED" if payload.active else "DISABLED"
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"System Update Toggle {action_word}: update_active={payload.active}"
        ),
        institution_id=current_user.institution_id
    )

    msg = (
        f"✅ Update banner is now LIVE for all users! Version: {settings.latest_version}"
        if payload.active
        else "🔕 Update banner has been deactivated. Users will no longer see the update notification."
    )
    return {"status": "success", "message": msg, "update_active": payload.active}


@router.post("/trigger-build")
def trigger_build(
    payload: schemas.TriggerBuildPayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Trigger the automated APK build on GitHub Actions (System Owner only).
    """
    if current_user.email.strip().lower() != config.SYSTEM_OWNER_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only the System Owner ({config.SYSTEM_OWNER_EMAIL}) can trigger builds."
        )

    input_key = payload.master_password.strip()
    is_verified = verify_master_key_for_system_action(db, input_key, current_user.institution_id)
    
    if not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect master password. Verification failed."
        )

    # Fetch configuration settings from environment
    github_pat = os.getenv("GITHUB_PAT")
    github_repo = os.getenv("GITHUB_REPO", "rajkishorock-arch/SMART-ATTENDANCE-SYSTEM")
    github_branch = os.getenv("GITHUB_BRANCH", "master")
    callback_token = config.BUILD_CALLBACK_TOKEN

    if not github_pat:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub PAT token (GITHUB_PAT) is not configured in backend .env."
        )

    # Determine callback URL dynamically from request base_url
    base_url = str(request.base_url)
    if not base_url.endswith("/"):
        base_url += "/"
    
    # If a public URL override is specified in env (e.g. Render url), use it
    public_url_override = os.getenv("PUBLIC_BACKEND_URL")
    if public_url_override:
        if not public_url_override.endswith("/"):
            public_url_override += "/"
        callback_url = f"{public_url_override}api/v1/settings/github-build-callback"
    else:
        callback_url = f"{base_url}api/v1/settings/github-build-callback"

    # Trigger GitHub Workflow Dispatch
    url = f"https://api.github.com/repos/{github_repo}/actions/workflows/build-apk.yml/dispatches"
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {github_pat}",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
    }
    body = {
        "ref": github_branch,
        "inputs": {
            "version": payload.version.strip(),
            "callback_url": callback_url,
            "callback_token": callback_token
        }
    }

    # Update database state to "building"
    settings = crud.get_system_settings(db, institution_id=1)
    settings.build_status = "building"
    settings.build_version = payload.version.strip()
    settings.build_error = None
    db.commit()
    db.refresh(settings)

    # Make request to GitHub Actions API
    try:
        import requests
        resp = requests.post(url, headers=headers, json=body, timeout=15.0)
        
        if resp.status_code not in (200, 201, 204):
            error_detail = resp.text
            # Revert DB status to failed
            settings.build_status = "failed"
            settings.build_error = f"GitHub API error ({resp.status_code}): {error_detail}"
            db.commit()
            db.refresh(settings)
            
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to trigger GitHub Actions. API responded with {resp.status_code}: {error_detail}"
            )
    except Exception as e:
        settings.build_status = "failed"
        settings.build_error = f"Error sending request to GitHub: {str(e)}"
        db.commit()
        db.refresh(settings)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Network error triggering workflow: {str(e)}"
        )

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Triggered automated APK build for version {payload.version.strip()} via GitHub Actions."
        ),
        institution_id=current_user.institution_id
    )

    return {
        "status": "success",
        "message": f"Successfully triggered automated build for version {payload.version.strip()}! Check GitHub Actions tab for progress.",
        "callback_url": callback_url
    }


@router.post("/github-build-callback")
def github_build_callback(
    payload: schemas.BuildCallbackPayload,
    db: Session = Depends(get_db)
):
    """
    Callback endpoint used by GitHub Actions build runner to notify build success/failure.
    """
    expected_token = config.BUILD_CALLBACK_TOKEN
    
    if payload.token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid callback authorization token."
        )

    settings = crud.get_system_settings(db, institution_id=1)
    
    if payload.status == "success":
        settings.build_status = "success"
        settings.latest_version = payload.version.strip()
        if payload.download_url:
            settings.update_download_url = payload.download_url.strip()
        # ✅ Beta channel: only push to owner first, NOT all users yet
        settings.update_beta_active = True
        settings.update_active = False  # Will be set True only after owner approves
        settings.build_error = None
        
        crud.create_audit_log(
            db,
            log=schemas.AuditLogCreate(
                user_email="system@github-actions.internal",
                action=f"Automated build SUCCEEDED for version {payload.version}. APK ready for owner beta testing at: {payload.download_url}. Use toggle-beta-active to release to all users."
            ),
            institution_id=1
        )
    else:
        settings.build_status = "failed"
        settings.build_error = payload.error or "Unknown build error in GitHub Actions pipeline."
        
        crud.create_audit_log(
            db,
            log=schemas.AuditLogCreate(
                user_email="system@github-actions.internal",
                action=f"Automated build FAILED for version {payload.version}. Error: {settings.build_error}"
            ),
            institution_id=1
        )

    db.commit()
    db.refresh(settings)
    return {"status": "ok", "message": "Callback processed successfully."}


@router.get("/build-status")
def get_build_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Fetch current build state and settings (Admins only).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view build settings."
        )
    settings = crud.get_system_settings(db, institution_id=1)
    return {
        "build_status": settings.build_status,
        "build_version": settings.build_version,
        "build_error": settings.build_error,
        "latest_version": settings.latest_version,
        "update_download_url": settings.update_download_url,
        "update_active": settings.update_active,
        "update_beta_active": getattr(settings, "update_beta_active", False)
    }


@router.post("/toggle-beta-active")
def toggle_beta_update_active(
    payload: schemas.ToggleBetaPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Toggle the BETA update channel ON or OFF.
    - When active=True: Only the System Owner's device sees the update (for testing).
    - When active=False: Beta channel disabled.
    - Use toggle-update-active to release to ALL users after owner approves.
    Requires Master Password. (System Owner only)
    """
    if current_user.email.strip().lower() != config.SYSTEM_OWNER_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only the System Owner ({config.SYSTEM_OWNER_EMAIL}) can toggle the beta release channel."
        )

    input_key = payload.master_password.strip()
    is_verified = verify_master_key_for_system_action(db, input_key, current_user.institution_id)

    if not is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect master password. Verification failed."
        )

    settings = crud.get_system_settings(db, institution_id=1)
    settings.update_beta_active = payload.active
    db.commit()
    db.refresh(settings)

    action_word = "ENABLED" if payload.active else "DISABLED"
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Beta Update Channel {action_word}: update_beta_active={payload.active}"
        ),
        institution_id=current_user.institution_id
    )

    msg = (
        f"🧪 Beta update channel is now ACTIVE! Only your device will see the update. Version: {settings.latest_version}"
        if payload.active
        else "🔕 Beta update channel has been deactivated."
    )
    return {"status": "success", "message": msg, "update_beta_active": payload.active}
