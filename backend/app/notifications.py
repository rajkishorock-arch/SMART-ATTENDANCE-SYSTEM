"""
Real-Time & Push Notification Dispatcher Module
Handles role-filtered in-app notifications, device token registration,
notification category preferences, quiet hours, and FCM push notifications.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from datetime import date
from .models.notification import BroadcastEntry, NotificationReceipt
import logging
import re

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


        deliver_notification(db, notif)
        return notif
    except Exception as err:
        db.rollback()
        logger.error(f"Failed to create notification: {err}")
        return None


def deliver_notification(db, notif):
    institution_id, recipient_email, recipient_role = notif.institution_id, notif.recipient_email, notif.recipient_role
    category, title, message, action_url = notif.category, notif.title, notif.message, notif.action_url
    if notif.recipient_id is not None and not recipient_email:
        return
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


def push_saved_notification(notification_id):
    from .database import SessionLocal
    with SessionLocal() as db:
        notif = db.get(models.NotificationModel, notification_id)
        if notif:
            deliver_notification(db, notif)


def _is_future_scheduled_calendar_notice(title: Optional[str], message: Optional[str]) -> bool:
    """Helper to detect notifications for calendar events scheduled > 1 day in future."""
    if not title and not message:
        return False
    text = f"{title or ''} {message or ''}"
    m = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})', text)
    if not m:
        return False
    ds = m.group(1).replace('/', '-')
    today = datetime.now().date()
    for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime(ds, fmt).date()
            if (parsed - today).days > 1:
                return True
        except ValueError:
            pass
    return False


def inbox(db, identity):
    n = models.NotificationModel
    receipt = NotificationReceipt
    roles = {identity.role, identity.role + "s", "all"}
    if identity.role in ("admin", "teacher", "hod"):
        roles.add("staff")
    return db.query(n, receipt).outerjoin(receipt, and_(receipt.notification_id == n.id,
        receipt.identity_role == identity.role, receipt.identity_id == identity.id)).filter(
        n.institution_id == identity.institution_id, n.recipient_role.in_(roles),
        or_(and_(n.recipient_id.is_(None), n.recipient_email.is_(None)),
            and_(n.recipient_id == identity.id, n.recipient_role == identity.role),
            n.recipient_email == identity.email if identity.email else False),
        or_(receipt.notification_id.is_(None), receipt.dismissed.is_(False)))


def receipt_for(notice, receipt, identity):
    return receipt or NotificationReceipt(notification_id=notice.id, identity_role=identity.role,
                                          identity_id=identity.id, dismissed=False)


@router.get("/my-notifications")
def get_my_notifications(
    limit: int = 40,
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Fetch role-filtered real-time notifications for the logged in user."""
    notifications = inbox(db, current_identity).order_by(models.NotificationModel.created_at.desc()).limit(limit * 2).all()

    output = []
    for n, receipt in notifications:
        # Suppress future scheduled calendar notices (> 1 day ahead) from today's real-time list
        is_calendar = n.category == "ACADEMIC_CALENDAR" or "holiday" in (n.title or "").lower() or "exam" in (n.title or "").lower()
        if is_calendar and _is_future_scheduled_calendar_notice(n.title, n.message):
            continue

        dt = n.created_at
        iso_str = None
        if dt:
            if isinstance(dt, str):
                iso_str = dt if (dt.endswith('Z') or '+' in dt or '-' in dt[10:]) else f"{dt.replace(' ', 'T')}Z"
            elif dt.tzinfo is None:
                iso_str = dt.replace(tzinfo=timezone.utc).isoformat()
            else:
                iso_str = dt.astimezone(timezone.utc).isoformat()
        output.append({
            "id": n.id,
            "category": n.category,
            "title": n.title,
            "message": n.message,
            "action_url": n.action_url,
            "is_read": bool(receipt or n.is_read),
            "created_at": iso_str
        })
        if len(output) >= limit:
            break

    return output


@router.get("/unread-count")
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Get total unread notification count for the current user's header badge."""
    notifications = inbox(db, current_identity).filter(NotificationReceipt.notification_id.is_(None),
        models.NotificationModel.is_read.is_(False)).all()
    valid_unread = sum(1 for n, _ in notifications if not (
        (n.category == "ACADEMIC_CALENDAR" or "holiday" in n.title.lower() or "exam" in n.title.lower()) and
        _is_future_scheduled_calendar_notice(n.title, n.message)))
    return {"unread_count": valid_unread}


@router.post("/mark-read/{notification_id}")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Mark a specific notification as read."""
    for n, receipt in inbox(db, current_identity).filter(models.NotificationModel.id == notification_id):
        db.merge(receipt_for(n, receipt, current_identity))
    db.commit()
    return {"status": "ok", "id": notification_id}


@router.post("/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Mark all notifications for the current user as read."""
    for n, receipt in inbox(db, current_identity).filter(NotificationReceipt.notification_id.is_(None)):
        db.merge(receipt_for(n, receipt, current_identity))
    db.commit()
    return {"status": "ok", "message": "All notifications marked as read."}


@router.post("/delete/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Delete a specific notification."""
    for n, receipt in inbox(db, current_identity).filter(models.NotificationModel.id == notification_id):
        entry = receipt_for(n, receipt, current_identity)
        entry.dismissed = True
        db.merge(entry)
    db.commit()
    return {"status": "ok", "id": notification_id}


@router.post("/clear-all")
def clear_all_notifications(
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Clear/delete all notifications for the current user."""
    for n, receipt in inbox(db, current_identity):
        entry = receipt_for(n, receipt, current_identity)
        entry.dismissed = True
        db.merge(entry)
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


class BroadcastPayload(BaseModel):
    effective_date: Optional[date] = None
    title: str
    message: str
    target_roles: Optional[List[str]] = ["student", "teacher", "parent"]
    category: Optional[str] = "ANNOUNCEMENT"
    action_url: Optional[str] = None


@router.post("/broadcast")
@router.post("/broadcast/")
def broadcast_announcement(
    payload: BroadcastPayload,
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity),
    background_tasks: BackgroundTasks = None
):
    """Dispatches institution-wide broadcast announcement across selected roles (students, teachers, parents)."""
    if current_identity.role.lower() not in ("admin", "principal"):
        raise HTTPException(status_code=403, detail="Administrators only can broadcast announcements.")

    title = payload.title.strip()
    msg = payload.message.strip()
    if not title or not msg:
        raise HTTPException(status_code=400, detail="Title and message cannot be empty.")

    inst_id = current_identity.institution_id
    created_count = 0
    roles = payload.target_roles or ["student", "teacher", "parent"]

    group_id = str(uuid4())
    notice_ids = []
    for role in dict.fromkeys(roles):
        audience = {"students": "student", "parents": "parent", "teachers": "teacher"}.get(role, role)
        if audience not in ("student", "parent", "teacher", "staff", "hod", "admin", "all"):
            raise HTTPException(422, "Unsupported notice audience.")
        notice = models.NotificationModel(institution_id=inst_id, recipient_role=audience, title=title, message=msg,
            category=(payload.category or "ANNOUNCEMENT").upper(), action_url=payload.action_url)
        db.add(notice)
        db.flush()
        db.add(BroadcastEntry(notification_id=notice.id, group_id=group_id,
                              effective_date=payload.effective_date.isoformat() if payload.effective_date else None))
        notice_ids.append(notice.id)
    db.commit()
    created_count = len(notice_ids)
    if background_tasks is not None:
        for notice_id in notice_ids:
            background_tasks.add_task(push_saved_notification, notice_id)

    return {
        "status": "ok",
        "message": f"Broadcast announcement successfully dispatched across {created_count} role channels.",
        "target_roles": roles
    }


@router.get("/broadcasts")
@router.get("/broadcasts/")
def get_broadcast_history(
    limit: int = 50,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Returns full history of institution broadcasts and official notices.
    Accessible to all authenticated roles (Admin, Teacher, Student, Parent).
    """
    inst_id = current_identity.institution_id
    role = current_identity.role.lower()

    query = db.query(models.NotificationModel).filter(
        models.NotificationModel.institution_id == inst_id,
        models.NotificationModel.recipient_email.is_(None), models.NotificationModel.recipient_id.is_(None),
        models.NotificationModel.category.in_(["ANNOUNCEMENT", "NOTICE", "HOLIDAY", "URGENT", "CIRCULAR", "EVENT", "EXAM"])
    )

    # Role visibility check: non-admins only see broadcasts targeted to their role, plural form, or all
    if role not in ("admin", "principal"):
        allowed_roles = [role, f"{role}s", "all"]
        if role in ("teacher", "hod"):
            allowed_roles.extend(["staff", "teachers", "faculty"])
        query = query.filter(
            or_(
                models.NotificationModel.recipient_role.in_(allowed_roles),
                models.NotificationModel.recipient_role.is_(None)
            )
        )

    if category:
        query = query.filter(models.NotificationModel.category == category.upper())

    records = query.order_by(models.NotificationModel.created_at.desc()).limit(limit * 3).all()

    entries = {x.notification_id: x for x in db.query(BroadcastEntry).filter(BroadcastEntry.notification_id.in_([r.id for r in records])).all()}
    # Group records by (title, message, created_at date minute)
    grouped = {}
    for r in records:
        dt = r.created_at
        dt_str = "recent"
        iso_str = datetime.now(timezone.utc).isoformat()
        if dt:
            if isinstance(dt, str):
                dt_str = dt[:16]
                iso_str = dt if (dt.endswith('Z') or '+' in dt or '-' in dt[10:]) else f"{dt.replace(' ', 'T')}Z"
            elif hasattr(dt, "strftime"):
                dt_str = dt.strftime("%Y-%m-%d %H:%M")
                iso_str = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
        
        entry = entries.get(r.id)
        key = entry.group_id if entry else (r.title, r.message, r.category, dt_str)
        if key not in grouped:
            grouped[key] = {
                "id": r.id,
                "title": r.title,
                "message": r.message,
                "category": r.category,
                "created_at": iso_str,
                "effective_date": entry.effective_date if entry else None,
                "action_url": r.action_url,
                "target_roles": [r.recipient_role] if r.recipient_role else ["all"]
            }
        else:
            if r.recipient_role and r.recipient_role not in grouped[key]["target_roles"]:
                grouped[key]["target_roles"].append(r.recipient_role)

    result_list = list(grouped.values())[:limit]

    return result_list


def editable_notice_rows(db, identity, notice_id):
    if identity.role.lower() not in ("admin", "principal"):
        raise HTTPException(403, "Administrator access required.")
    query = db.query(models.NotificationModel).filter_by(institution_id=identity.institution_id,
        recipient_email=None, recipient_id=None).filter(models.NotificationModel.category.in_(
        ["ANNOUNCEMENT", "NOTICE", "HOLIDAY", "URGENT", "CIRCULAR", "EVENT", "EXAM"]))
    notice = query.filter_by(id=notice_id).first()
    if notice is None:
        raise HTTPException(404, "Notice not found.")
    entry = db.get(BroadcastEntry, notice.id)
    if entry:
        return query.join(BroadcastEntry, BroadcastEntry.notification_id == models.NotificationModel.id).filter(
            BroadcastEntry.group_id == entry.group_id).all()
    start = notice.created_at.replace(second=0, microsecond=0)
    return query.outerjoin(BroadcastEntry, BroadcastEntry.notification_id == models.NotificationModel.id).filter(
        BroadcastEntry.notification_id.is_(None), models.NotificationModel.title == notice.title,
        models.NotificationModel.message == notice.message, models.NotificationModel.category == notice.category,
        models.NotificationModel.created_at >= start, models.NotificationModel.created_at < start + timedelta(minutes=1)).all()


class NoticeRevision(BaseModel):
    category: Optional[str] = None
    title: str
    message: str
    effective_date: date


@router.put("/broadcasts/{notice_id}")
def republish_notice(notice_id: int, payload: NoticeRevision, db: Session = Depends(get_db),
                     identity: security.AuthIdentity = Depends(security.get_current_identity)):
    if not payload.title.strip() or len(payload.title.strip()) > 200 or not payload.message.strip():
        raise HTTPException(422, "A title and message are required.")
    if payload.category and payload.category not in ("ANNOUNCEMENT", "NOTICE", "HOLIDAY", "URGENT", "CIRCULAR", "EVENT", "EXAM"):
        raise HTTPException(422, "Unsupported notice category.")
    group_id = str(uuid4())
    for row in editable_notice_rows(db, identity, notice_id):
        entry = db.get(BroadcastEntry, row.id) or BroadcastEntry(notification_id=row.id, group_id=group_id)
        entry.effective_date = payload.effective_date.isoformat()
        db.add(entry)
        db.query(NotificationReceipt).filter_by(notification_id=row.id).delete(synchronize_session=False)
        if payload.category:
            row.category = payload.category
        row.title, row.message = payload.title.strip(), payload.message.strip()
        row.created_at, row.is_read = datetime.now(timezone.utc), False
    db.commit()
    return {"status": "published"}


@router.delete("/broadcasts/{notice_id}")
def withdraw_notice(notice_id: int, db: Session = Depends(get_db),
                    identity: security.AuthIdentity = Depends(security.get_current_identity)):
    for row in editable_notice_rows(db, identity, notice_id):
        entry = db.get(BroadcastEntry, row.id)
        if entry:
            db.delete(entry)
        db.delete(row)
    db.commit()
    return {"status": "withdrawn"}
