"""
Feature 11: WhatsApp Bot — Attendance Query via Chat
Parents/students send "ATTENDANCE" or "REPORT" to a Twilio WhatsApp number
and receive instant attendance summary replies.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Form
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import json

from . import models, security, crud, schemas
from .database import get_db
from .core import config

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


def _format_attendance_reply(student: models.StudentModel, db: Session, institution_id: int) -> str:
    """Build a WhatsApp-friendly attendance summary message."""
    today_str = datetime.now(IST).strftime("%d/%m/%Y")

    # Today's status
    today_log = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.id == str(student.id),
        models.AttendanceModel.institution_id == institution_id,
        models.AttendanceModel.date == today_str,
        models.AttendanceModel.attendance == "Present",
    ).first()

    # Last 7 days
    logs = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.id == str(student.id),
        models.AttendanceModel.institution_id == institution_id,
        models.AttendanceModel.attendance == "Present",
    ).all()

    all_dates = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == institution_id,
    ).all()
    total_days = len(set(l.date for l in all_dates))
    present_days = len(set(l.date for l in logs))
    pct = round((present_days / total_days * 100), 1) if total_days > 0 else 0.0

    today_status = "✅ PRESENT" if today_log else "❌ ABSENT"

    msg = (
        f"📊 *Attendance Report*\n"
        f"👤 Student: {student.name}\n"
        f"🎓 Roll: {student.roll} | Dept: {student.dep}\n"
        f"📅 Today ({today_str}): {today_status}\n"
        f"📈 Overall: {present_days}/{total_days} days ({pct}%)\n"
    )
    if pct < 75:
        msg += "⚠️ *WARNING: Attendance below 75%!*\n"
    msg += "\nReply REPORT for detailed report or HELP for commands."
    return msg


def _process_bot_message(
    db: Session, sender: str, message: str, institution_id: int = 1
) -> str:
    """Process incoming WhatsApp message and return reply text."""
    msg = message.strip().upper()

    # Log conversation
    try:
        log = models.BotConversationLog(
            institution_id=institution_id,
            platform="whatsapp",
            sender_phone_or_id=sender,
            user_query=message,
            bot_response="",
            intent_detected="general_query",
        )
        db.add(log)
    except Exception:
        pass

    # Find student or parent by phone
    phone_clean = sender.replace("whatsapp:", "").replace("+", "").strip()

    student = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == institution_id,
        models.StudentModel.phone.contains(phone_clean[-10:]) if len(phone_clean) >= 10 else False,
    ).first()

    parent = None
    if not student:
        parent = db.query(models.ParentAccount).filter(
            models.ParentAccount.institution_id == institution_id,
            models.ParentAccount.phone.contains(phone_clean[-10:]) if len(phone_clean) >= 10 else False,
        ).first()
        if parent:
            student = db.query(models.StudentModel).filter(
                models.StudentModel.id == parent.student_id
            ).first()

    if not student:
        reply = (
            "👋 Welcome to Smart Attendance Bot!\n\n"
            "Your phone number is not registered. Please contact your institution admin.\n"
            "Reply HELP for available commands."
        )
    elif msg in ("ATTENDANCE", "ATT", "STATUS"):
        reply = _format_attendance_reply(student, db, institution_id)
        if log:
            log.intent_detected = "attendance_query"
    elif msg in ("REPORT", "REP"):
        reply = _format_attendance_reply(student, db, institution_id)
        if log:
            log.intent_detected = "report_query"
    elif msg == "HELP":
        reply = (
            "📱 *WhatsApp Attendance Bot Commands:*\n\n"
            "• ATTENDANCE — Today's status + overall %\n"
            "• REPORT — Detailed attendance summary\n"
            "• HELP — Show this help menu\n\n"
            "Powered by Smart Attendance System 🎓"
        )
        if log:
            log.intent_detected = "help"
    else:
        reply = (
            "🤖 I didn't understand that. Reply:\n"
            "• ATTENDANCE — for your attendance\n"
            "• HELP — for all commands"
        )

    if log:
        log.bot_response = reply
        db.commit()

    return reply


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Twilio WhatsApp webhook endpoint.
    Twilio sends POST with Form data: From, Body.
    Returns TwiML XML response.
    """
    try:
        form = await request.form()
        sender = form.get("From", "")
        body = form.get("Body", "")
        # Try to find institution from sender's area or default to 1
        institution_id = 1

        reply = _process_bot_message(db, sender, body, institution_id)

        # Return TwiML
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{reply}</Message>
</Response>"""
        from fastapi.responses import Response
        return Response(content=twiml, media_type="application/xml")
    except Exception as e:
        print(f"WhatsApp webhook error: {e}")
        from fastapi.responses import Response
        return Response(
            content='<?xml version="1.0"?><Response><Message>Error processing request.</Message></Response>',
            media_type="application/xml"
        )


@router.post("/test-message")
def test_whatsapp_message(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Test WhatsApp message sending (admin only).
    Sends a test message to a phone number via Twilio.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only.")

    to_phone = payload.get("phone", "")
    message = payload.get("message", "Test from Smart Attendance System!")

    if not to_phone:
        raise HTTPException(status_code=400, detail="phone is required.")
    if not config.TWILIO_ACCOUNT_SID:
        raise HTTPException(status_code=400, detail="Twilio not configured. Set TWILIO_ACCOUNT_SID in .env")

    try:
        from twilio.rest import Client
        twilio_client = Client(config.TWILIO_ACCOUNT_SID, os.getenv("TWILIO_AUTH_TOKEN", ""))
        msg = twilio_client.messages.create(
            body=message,
            from_=f"whatsapp:{os.getenv('TWILIO_WHATSAPP_NUMBER', '')}",
            to=f"whatsapp:{to_phone}",
        )
        return {"message": "Sent.", "sid": msg.sid}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Twilio send failed: {str(e)}")


@router.get("/conversation-logs")
def get_bot_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """View WhatsApp bot conversation history."""
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=403, detail="Admin only.")

    logs = db.query(models.BotConversationLog).filter(
        models.BotConversationLog.institution_id == current_user.institution_id
    ).order_by(models.BotConversationLog.created_at.desc()).limit(limit).all()

    return [
        {
            "id": l.id,
            "sender": l.sender_phone_or_id,
            "query": l.user_query,
            "response": l.bot_response,
            "intent": l.intent_detected,
            "created_at": l.created_at,
        }
        for l in logs
    ]


import os
