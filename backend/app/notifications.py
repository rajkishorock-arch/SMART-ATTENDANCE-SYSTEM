"""
Real-Time & Push Notification Dispatcher Module (Phase 10)
Handles role-filtered in-app notifications, device token registration,
and background FCM / mobile push notification payloads.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging

from . import models, security
from .database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


def create_notification(
    db: Session,
    institution_id: int,
    recipient_role: str,
    title: str,
    message: str,
    category: str = "SYSTEM",
    action_url: Optional[str] = None,
    recipient_id: Optional[int] = None,
    recipient_email: Optional[str] = None
) -> models.NotificationModel:
    """
    Creates an in-app notification record and dispatches background push alert.
    """
    try:
        notif = models.NotificationModel(
            institution_id=institution_id,
            recipient_id=recipient_id,
            recipient_email=recipient_email,
            recipient_role=recipient_role,
            category=category,
            title=title,
            message=message,
            action_url=action_url,
            is_read=False
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)

        # Dispatch FCM Push Notification (if token registered)
        if recipient_email:
            tokens = db.query(models.DeviceTokenModel).filter(
                models.DeviceTokenModel.institution_id == institution_id,
                models.DeviceTokenModel.user_email == recipient_email
            ).all()
            for t in tokens:
                logger.info(f"[Push Dispatch] Sending FCM alert to token {t.push_token[:12]}...: {title}")

        return notif
    except Exception as err:
        db.rollback()
        logger.error(f"Failed to create notification: {err}")
        return None


@router.get("/my-notifications")
def get_my_notifications(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Fetch role-filtered real-time notifications for the logged in user."""
    inst_id = current_identity.institution_id
    role = current_identity.role.lower()
    email = current_identity.email
    user_id = current_identity.id

    query = db.query(models.NotificationModel).filter(
        models.NotificationModel.institution_id == inst_id
    )

    if role == "student":
        query = query.filter(
            models.NotificationModel.recipient_role == "student",
            or_(
                models.NotificationModel.recipient_id == user_id,
                models.NotificationModel.recipient_email == email,
                models.NotificationModel.recipient_email.is_(None)
            )
        )
    elif role in ["teacher", "hod"]:
        query = query.filter(
            or_(
                models.NotificationModel.recipient_role.in_(["teacher", "hod", "staff"]),
                models.NotificationModel.recipient_email == email
            )
        )
    else:  # admin
        query = query.filter(
            or_(
                models.NotificationModel.recipient_role.in_(["admin", "staff"]),
                models.NotificationModel.recipient_email == email
            )
        )

    notifications = query.order_by(models.NotificationModel.created_at.desc()).limit(limit).all()

    output = []
    for n in notifications:
        output.append({
            "id": n.id,
            "category": n.category,
            "title": n.title,
            "message": n.message,
            "action_url": n.action_url,
            "is_read": bool(n.is_read),
            "created_at": n.created_at.isoformat() if n.created_at else None
        })

    return output


@router.get("/unread-count")
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Get total unread notification count for the current user's header badge."""
    inst_id = current_identity.institution_id
    role = current_identity.role.lower()
    email = current_identity.email
    user_id = current_identity.id

    query = db.query(models.NotificationModel).filter(
        models.NotificationModel.institution_id == inst_id,
        models.NotificationModel.is_read == False
    )

    if role == "student":
        query = query.filter(
            models.NotificationModel.recipient_role == "student",
            or_(
                models.NotificationModel.recipient_id == user_id,
                models.NotificationModel.recipient_email == email,
                models.NotificationModel.recipient_email.is_(None)
            )
        )
    elif role in ["teacher", "hod"]:
        query = query.filter(
            or_(
                models.NotificationModel.recipient_role.in_(["teacher", "hod", "staff"]),
                models.NotificationModel.recipient_email == email
            )
        )
    else:
        query = query.filter(
            or_(
                models.NotificationModel.recipient_role.in_(["admin", "staff"]),
                models.NotificationModel.recipient_email == email
            )
        )

    unread_count = query.count()
    return {"unread_count": unread_count}


@router.post("/mark-read/{notification_id}")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Mark a specific notification as read."""
    notif = db.query(models.NotificationModel).filter(
        models.NotificationModel.id == notification_id,
        models.NotificationModel.institution_id == current_identity.institution_id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"status": "ok", "id": notification_id}


@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Mark all notifications for the current user as read."""
    inst_id = current_identity.institution_id
    role = current_identity.role.lower()
    email = current_identity.email
    user_id = current_identity.id

    query = db.query(models.NotificationModel).filter(
        models.NotificationModel.institution_id == inst_id,
        models.NotificationModel.is_read == False
    )

    if role == "student":
        query = query.filter(
            models.NotificationModel.recipient_role == "student",
            or_(
                models.NotificationModel.recipient_id == user_id,
                models.NotificationModel.recipient_email == email
            )
        )
    else:
        query = query.filter(models.NotificationModel.recipient_role.in_([role, "staff"]))

    query.update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"status": "ok", "message": "All notifications marked as read."}


@router.post("/register-device-token")
def register_device_push_token(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Register or update FCM / Capacitor mobile push token for background notifications."""
    token_str = payload.get("push_token") or payload.get("token")
    platform = payload.get("platform", "android")
    if not token_str:
        raise HTTPException(status_code=400, detail="push_token is required")

    existing = db.query(models.DeviceTokenModel).filter(
        models.DeviceTokenModel.institution_id == current_identity.institution_id,
        models.DeviceTokenModel.push_token == token_str
    ).first()

    if existing:
        existing.user_email = current_identity.email
        existing.role = current_identity.role
        existing.device_platform = platform
    else:
        new_token = models.DeviceTokenModel(
            institution_id=current_identity.institution_id,
            user_email=current_identity.email,
            role=current_identity.role,
            push_token=token_str,
            device_platform=platform
        )
        db.add(new_token)

    db.commit()
    return {"status": "ok", "message": "Device token registered successfully."}
