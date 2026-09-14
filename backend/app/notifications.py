"""
Real-Time & Push Notification Dispatcher Module
Handles role-filtered in-app notifications, device token registration,
notification category preferences, quiet hours, and FCM push notifications.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import logging

from . import models, security
from .database import get_db
from .fcm_service import send_fcm_push_notification

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
    Creates an in-app notification record and dispatches background FCM push alert.
    """
    try:
        # Idempotency Protection: Check if identical notification was created within last 10 seconds
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(seconds=10)
            recent_existing = db.query(models.NotificationModel).filter(
                models.NotificationModel.institution_id == institution_id,
                models.NotificationModel.recipient_role == recipient_role,
                models.NotificationModel.recipient_id == recipient_id,
                models.NotificationModel.recipient_email == recipient_email,
                models.NotificationModel.category == category,
                models.NotificationModel.title == title,
                models.NotificationModel.created_at >= cutoff
            ).first()

            if recent_existing:
                logger.info(f"[Idempotency] Duplicate notification skipped: {title}")
                return recent_existing
        except Exception as idemp_err:
            logger.warn(f"Idempotency check error: {idemp_err}")

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


        # Check notification category preferences & quiet hours if recipient_email provided
        send_push = True
        if recipient_email:
            pref = db.query(models.NotificationPreferenceModel).filter(
                models.NotificationPreferenceModel.institution_id == institution_id,
                models.NotificationPreferenceModel.user_email == recipient_email
            ).first()

            if pref:
                cat_upper = category.upper()
                if cat_upper == "ATTENDANCE" and not pref.attendance_enabled:
                    send_push = False
                elif cat_upper in ["LEAVE", "DISPUTE"] and not pref.leave_dispute_enabled:
                    send_push = False
                elif cat_upper == "CLASS_REMINDER" and not pref.class_reminders_enabled:
                    send_push = False
                elif cat_upper in ["SECURITY", "SYSTEM"] and not pref.security_enabled:
                    send_push = False
                elif cat_upper == "PROMOTIONAL" and not pref.promotional_enabled:
                    send_push = False

                # Quiet Hours Check
                if send_push and pref.quiet_hours_enabled and pref.quiet_start_time and pref.quiet_end_time:
                    try:
                        now_hm = datetime.now().strftime("%H:%M")
                        start = pref.quiet_start_time
                        end = pref.quiet_end_time
                        if start <= end:
                            if start <= now_hm <= end:
                                send_push = False
                        else: # Spans midnight
                            if now_hm >= start or now_hm <= end:
                                send_push = False
                    except Exception as quiet_err:
                        logger.warn(f"Error checking quiet hours: {quiet_err}")

        # Dispatch FCM Push Notification
        if send_push:
            query = db.query(models.DeviceTokenModel).filter(
                models.DeviceTokenModel.institution_id == institution_id,
                models.DeviceTokenModel.is_active == True
            )
            if recipient_email:
                query = query.filter(models.DeviceTokenModel.user_email == recipient_email)
            else:
                query = query.filter(models.DeviceTokenModel.role == recipient_role)

            active_tokens = query.all()
            if active_tokens:
                token_strings = [t.push_token for t in active_tokens]
                res = send_fcm_push_notification(
                    tokens=token_strings,
                    title=title,
                    body=message,
                    category=category,
                    action_url=action_url,
                    data_payload={
                        "notification_id": str(notif.id),
                        "institution_id": str(institution_id),
                        "action_url": action_url or ""
                    }
                )

                # Inactivate expired/invalid tokens
                if res and res.get("invalid_tokens"):
                    for inv_token in res["invalid_tokens"]:
                        db.query(models.DeviceTokenModel).filter(
                            models.DeviceTokenModel.push_token == inv_token
                        ).update({"is_active": False}, synchronize_session=False)
                    db.commit()

        return notif
    except Exception as err:
        db.rollback()
        logger.error(f"Failed to create notification: {err}")
        return None


@router.get("/my-notifications")
def get_my_notifications(
    limit: int = 40,
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


@router.post("/delete/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Delete a specific notification."""
    notif = db.query(models.NotificationModel).filter(
        models.NotificationModel.id == notification_id,
        models.NotificationModel.institution_id == current_identity.institution_id
    ).first()
    if notif:
        db.delete(notif)
        db.commit()
    return {"status": "ok", "id": notification_id}


@router.post("/clear-all")
def clear_all_notifications(
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Clear/delete all notifications for the current user."""
    inst_id = current_identity.institution_id
    email = current_identity.email

    db.query(models.NotificationModel).filter(
        models.NotificationModel.institution_id == inst_id,
        models.NotificationModel.recipient_email == email
    ).delete(synchronize_session=False)
    db.commit()
    return {"status": "ok", "message": "All notifications cleared."}


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
        existing.is_active = True
    else:
        new_token = models.DeviceTokenModel(
            institution_id=current_identity.institution_id,
            user_email=current_identity.email,
            role=current_identity.role,
            push_token=token_str,
            device_platform=platform,
            is_active=True
        )
        db.add(new_token)

    db.commit()
    return {"status": "ok", "message": "Device token registered successfully."}


@router.get("/preferences")
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Get category notification settings & quiet hours for logged in user."""
    pref = db.query(models.NotificationPreferenceModel).filter(
        models.NotificationPreferenceModel.institution_id == current_identity.institution_id,
        models.NotificationPreferenceModel.user_email == current_identity.email
    ).first()

    if not pref:
        return {
            "attendance_enabled": True,
            "leave_dispute_enabled": True,
            "class_reminders_enabled": True,
            "security_enabled": True,
            "promotional_enabled": False,
            "quiet_hours_enabled": False,
            "quiet_start_time": "22:00",
            "quiet_end_time": "07:00"
        }

    return {
        "attendance_enabled": bool(pref.attendance_enabled),
        "leave_dispute_enabled": bool(pref.leave_dispute_enabled),
        "class_reminders_enabled": bool(pref.class_reminders_enabled),
        "security_enabled": bool(pref.security_enabled),
        "promotional_enabled": bool(pref.promotional_enabled),
        "quiet_hours_enabled": bool(pref.quiet_hours_enabled),
        "quiet_start_time": pref.quiet_start_time or "22:00",
        "quiet_end_time": pref.quiet_end_time or "07:00"
    }


@router.post("/preferences")
def update_notification_preferences(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Update notification category settings & quiet hours."""
    pref = db.query(models.NotificationPreferenceModel).filter(
        models.NotificationPreferenceModel.institution_id == current_identity.institution_id,
        models.NotificationPreferenceModel.user_email == current_identity.email
    ).first()

    if not pref:
        pref = models.NotificationPreferenceModel(
            institution_id=current_identity.institution_id,
            user_email=current_identity.email
        )
        db.add(pref)

    if "attendance_enabled" in payload:
        pref.attendance_enabled = bool(payload["attendance_enabled"])
    if "leave_dispute_enabled" in payload:
        pref.leave_dispute_enabled = bool(payload["leave_dispute_enabled"])
    if "class_reminders_enabled" in payload:
        pref.class_reminders_enabled = bool(payload["class_reminders_enabled"])
    if "security_enabled" in payload:
        pref.security_enabled = bool(payload["security_enabled"])
    if "promotional_enabled" in payload:
        pref.promotional_enabled = bool(payload["promotional_enabled"])
    if "quiet_hours_enabled" in payload:
        pref.quiet_hours_enabled = bool(payload["quiet_hours_enabled"])
    if "quiet_start_time" in payload:
        pref.quiet_start_time = str(payload["quiet_start_time"])
    if "quiet_end_time" in payload:
        pref.quiet_end_time = str(payload["quiet_end_time"])

    db.commit()
    return {"status": "ok", "message": "Notification preferences updated successfully."}
