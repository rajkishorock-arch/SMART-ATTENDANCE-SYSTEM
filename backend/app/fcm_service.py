"""
Firebase Cloud Messaging (FCM) Service Module
Handles lazy initialization of Firebase Admin SDK, FCM HTTP v1 push notifications,
token validation, and error reporting.
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

_firebase_initialized = False

def _init_firebase_app():
    global _firebase_initialized
    if _firebase_initialized:
        return True

    try:
        import firebase_admin
        from firebase_admin import credentials

        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        project_id = os.getenv("FIREBASE_PROJECT_ID")

        if service_account_json:
            try:
                cred_dict = json.loads(service_account_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                _firebase_initialized = True
                logger.info("[FCM Service] Firebase Admin SDK initialized with service account JSON.")
                return True
            except Exception as e:
                logger.error(f"[FCM Service] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
        
        elif project_id:
            try:
                firebase_admin.initialize_app(options={'projectId': project_id})
                _firebase_initialized = True
                logger.info(f"[FCM Service] Firebase Admin SDK initialized with project_id: {project_id}")
                return True
            except Exception as e:
                logger.error(f"[FCM Service] Failed to initialize with project_id: {e}")

        logger.info("[FCM Service] FIREBASE_SERVICE_ACCOUNT_JSON not configured. Operating in logging-only mode.")
        return False
    except ImportError:
        logger.warning("[FCM Service] firebase_admin package not installed. Skipping FCM push dispatch.")
        return False
    except Exception as err:
        logger.error(f"[FCM Service] Unexpected initialization error: {err}")
        return False


def send_fcm_push_notification(
    tokens: List[str],
    title: str,
    body: str,
    category: str = "SYSTEM",
    action_url: Optional[str] = None,
    data_payload: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Sends FCM Push Notifications to registered device tokens.
    Returns status breakdown (success_count, failure_count, invalid_tokens).
    """
    if not tokens:
        return {"success_count": 0, "failure_count": 0, "invalid_tokens": []}

    initialized = _init_firebase_app()
    if not initialized:
        logger.info(f"[FCM Push Dispatch (Log Only)] Title: '{title}' | Body: '{body}' | Target Tokens: {len(tokens)}")
        return {"success_count": len(tokens), "failure_count": 0, "invalid_tokens": []}

    invalid_tokens = []
    success_count = 0
    failure_count = 0

    try:
        from firebase_admin import messaging

        data = data_payload or {}
        data.update({
            "title": title,
            "body": body,
            "category": category,
            "action_url": action_url or "",
            "click_action": "FLUTTER_NOTIFICATION_CLICK"
        })

        # Channel mapping based on category
        channel_id = "system_and_security"
        cat_upper = category.upper()
        if cat_upper == "ATTENDANCE":
            channel_id = "attendance"
        elif cat_upper in ["LEAVE", "DISPUTE"]:
            channel_id = "leave_and_disputes"
        elif cat_upper == "CLASS_REMINDER":
            channel_id = "class_reminders"
        elif cat_upper == "LOW_ATTENDANCE":
            channel_id = "low_attendance"

        android_config = messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                title=title,
                body=body,
                channel_id=channel_id,
                sound='default'
            )
        )

        for token in tokens:
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data,
                android=android_config,
                token=token
            )
            try:
                response = messaging.send(message)
                success_count += 1
                logger.info(f"[FCM Push Sent] MsgId: {response} | Token: {token[:12]}...")
            except messaging.UnregisteredError:
                logger.warn(f"[FCM Token Expired] Unregistered token: {token[:12]}...")
                invalid_tokens.append(token)
                failure_count += 1
            except messaging.SenderIdMismatchError:
                logger.warn(f"[FCM Token Mismatch] Sender ID mismatch for token: {token[:12]}...")
                invalid_tokens.append(token)
                failure_count += 1
            except Exception as send_err:
                logger.error(f"[FCM Send Failure] Token {token[:12]}... Error: {send_err}")
                failure_count += 1

    except Exception as err:
        logger.error(f"[FCM Bulk Send Error]: {err}")
        failure_count = len(tokens)

    return {
        "success_count": success_count,
        "failure_count": failure_count,
        "invalid_tokens": invalid_tokens
    }
