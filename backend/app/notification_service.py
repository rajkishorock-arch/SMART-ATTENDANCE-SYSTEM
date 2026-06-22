"""SMS and WhatsApp notifications via Twilio (optional)."""
import os
import requests
from typing import Optional

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_SMS_FROM = os.getenv("TWILIO_SMS_FROM", "")
TWILIO_WHATSAPP_FROM = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")


def send_sms(to_phone: str, message: str) -> bool:
    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM]):
        print(f"[SMS stub] To {to_phone}: {message[:80]}...")
        return False
    try:
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        resp = requests.post(
            url,
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={"From": TWILIO_SMS_FROM, "To": to_phone, "Body": message},
            timeout=15,
        )
        return resp.status_code in (200, 201)
    except Exception as e:
        print(f"SMS send failed: {e}")
        return False


def send_whatsapp(to_phone: str, message: str) -> bool:
    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN]):
        print(f"[WhatsApp stub] To {to_phone}: {message[:80]}...")
        return False
    try:
        to = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"
        url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
        resp = requests.post(
            url,
            auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
            data={"From": TWILIO_WHATSAPP_FROM, "To": to, "Body": message},
            timeout=15,
        )
        return resp.status_code in (200, 201)
    except Exception as e:
        print(f"WhatsApp send failed: {e}")
        return False


def notify_parent_absent(
    parent_phone: Optional[str],
    parent_email: Optional[str],
    student_name: str,
    date_str: str,
    notify_sms: bool = False,
    notify_whatsapp: bool = False,
) -> dict:
    message = f"Alert: {student_name} was marked ABSENT on {date_str}. - Smart Attendance"
    result = {"sms": False, "whatsapp": False}
    if notify_sms and parent_phone:
        result["sms"] = send_sms(parent_phone, message)
    if notify_whatsapp and parent_phone:
        result["whatsapp"] = send_whatsapp(parent_phone, message)
    return result
