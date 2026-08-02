"""
Feature 34 & 35: Multi-Language Support (i18n) + Voice Commands in Regional Languages
Supports Hindi, Tamil, Telugu, Marathi, Bengali, English.
Custom translations per institution. Auto-detect browser locale.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict
from datetime import datetime, timezone, timedelta
import json

from . import models, security
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()

# Built-in base translations
BASE_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "en": {
        "welcome": "Welcome",
        "attendance": "Attendance",
        "present": "Present",
        "absent": "Absent",
        "mark_attendance": "Mark Attendance",
        "students": "Students",
        "teacher": "Teacher",
        "report": "Report",
        "dashboard": "Dashboard",
        "logout": "Logout",
        "hello": "Hello",
        "total_present": "Total Present Today",
        "scan_face": "Scan Face",
        "voice_command": "Voice Command",
    },
    "hi": {
        "welcome": "स्वागत है",
        "attendance": "उपस्थिति",
        "present": "उपस्थित",
        "absent": "अनुपस्थित",
        "mark_attendance": "उपस्थिति दर्ज करें",
        "students": "छात्र",
        "teacher": "शिक्षक",
        "report": "रिपोर्ट",
        "dashboard": "डैशबोर्ड",
        "logout": "लॉग आउट",
        "hello": "नमस्ते",
        "total_present": "आज कुल उपस्थित",
        "scan_face": "चेहरा स्कैन करें",
        "voice_command": "आवाज़ कमांड",
    },
    "ta": {
        "welcome": "வரவேற்பு",
        "attendance": "வருகை",
        "present": "இருக்கிறார்",
        "absent": "இல்லை",
        "mark_attendance": "வருகை குறிக்கவும்",
        "students": "மாணவர்கள்",
        "teacher": "ஆசிரியர்",
        "report": "அறிக்கை",
        "dashboard": "டாஷ்போர்டு",
        "logout": "வெளியேறு",
        "hello": "வணக்கம்",
        "total_present": "இன்று மொத்த வருகை",
        "scan_face": "முகம் ஸ்கேன் செய்யுங்கள்",
        "voice_command": "குரல் கட்டளை",
    },
    "te": {
        "welcome": "స్వాగతం",
        "attendance": "హాజరు",
        "present": "హాజరు",
        "absent": "గైర్హాజరు",
        "mark_attendance": "హాజరు నమోదు చేయండి",
        "students": "విద్యార్థులు",
        "teacher": "ఉపాధ్యాయుడు",
        "report": "నివేదిక",
        "dashboard": "డాష్‌బోర్డ్",
        "logout": "నిష్క్రమించు",
        "hello": "నమస్కారం",
        "total_present": "ఈరోజు మొత్తం హాజరు",
        "scan_face": "ముఖాన్ని స్కాన్ చేయండి",
        "voice_command": "వాయిస్ కమాండ్",
    },
    "mr": {
        "welcome": "स्वागत आहे",
        "attendance": "उपस्थिती",
        "present": "उपस्थित",
        "absent": "अनुपस्थित",
        "mark_attendance": "उपस्थिती नोंदवा",
        "students": "विद्यार्थी",
        "teacher": "शिक्षक",
        "report": "अहवाल",
        "dashboard": "डॅशबोर्ड",
        "logout": "लॉग आउट",
        "hello": "नमस्कार",
        "total_present": "आज एकूण उपस्थित",
        "scan_face": "चेहरा स्कॅन करा",
        "voice_command": "व्हॉइस कमांड",
    },
    "bn": {
        "welcome": "স্বাগতম",
        "attendance": "উপস্থিতি",
        "present": "উপস্থিত",
        "absent": "অনুপস্থিত",
        "mark_attendance": "উপস্থিতি চিহ্নিত করুন",
        "students": "শিক্ষার্থী",
        "teacher": "শিক্ষক",
        "report": "প্রতিবেদন",
        "dashboard": "ড্যাশবোর্ড",
        "logout": "লগ আউট",
        "hello": "নমস্কার",
        "total_present": "আজ মোট উপস্থিত",
        "scan_face": "মুখ স্ক্যান করুন",
        "voice_command": "ভয়েস কমান্ড",
    },
}

# Voice commands mapping per language
VOICE_COMMANDS: Dict[str, Dict[str, str]] = {
    "en": {
        "show attendance": "show_attendance",
        "mark attendance": "mark_attendance",
        "open dashboard": "open_dashboard",
        "show report": "show_report",
        "logout": "logout",
    },
    "hi": {
        "उपस्थिति दिखाओ": "show_attendance",
        "उपस्थिति लो": "mark_attendance",
        "डैशबोर्ड खोलो": "open_dashboard",
        "रिपोर्ट दिखाओ": "show_report",
        "लॉग आउट": "logout",
        "बाहर निकलो": "logout",
        "हाजिरी दिखाओ": "show_attendance",
    },
    "ta": {
        "வருகை காட்டு": "show_attendance",
        "வருகை குறிக்கவும்": "mark_attendance",
        "வெளியேறு": "logout",
    },
}


@router.get("/translations/{locale}")
def get_translations(
    locale: str,
    db: Session = Depends(get_db),
    institution_id: Optional[int] = None,
):
    """Get all UI translations for a locale. Merges base + custom institution translations."""
    base = BASE_TRANSLATIONS.get(locale, BASE_TRANSLATIONS["en"]).copy()

    # Merge custom institution translations
    if institution_id:
        custom = db.query(models.I18nTranslation).filter(
            models.I18nTranslation.institution_id == institution_id,
            models.I18nTranslation.locale == locale,
        ).all()
        for c in custom:
            base[c.key] = c.value

    return {"locale": locale, "translations": base}


@router.post("/custom-translation")
def add_custom_translation(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Add or update a custom translation for the institution."""
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=403, detail="Admin only.")

    locale = payload.get("locale", "hi")
    key = payload.get("key", "")
    value = payload.get("value", "")

    if not key or not value:
        raise HTTPException(status_code=400, detail="key and value are required.")

    existing = db.query(models.I18nTranslation).filter(
        models.I18nTranslation.institution_id == current_user.institution_id,
        models.I18nTranslation.locale == locale,
        models.I18nTranslation.key == key,
    ).first()

    if existing:
        existing.value = value
    else:
        t = models.I18nTranslation(
            institution_id=current_user.institution_id,
            locale=locale,
            key=key,
            value=value,
        )
        db.add(t)
    db.commit()
    return {"message": f"Translation saved: [{locale}] {key} = {value}"}


@router.get("/supported-locales")
def get_supported_locales():
    """List all supported locale codes."""
    return {
        "locales": [
            {"code": "en", "name": "English", "native": "English"},
            {"code": "hi", "name": "Hindi",   "native": "हिंदी"},
            {"code": "ta", "name": "Tamil",   "native": "தமிழ்"},
            {"code": "te", "name": "Telugu",  "native": "తెలుగు"},
            {"code": "mr", "name": "Marathi", "native": "मराठी"},
            {"code": "bn", "name": "Bengali", "native": "বাংলা"},
        ]
    }


@router.get("/voice-commands/{locale}")
def get_voice_commands(locale: str):
    """Get voice command mappings for a locale."""
    commands = VOICE_COMMANDS.get(locale, VOICE_COMMANDS.get("en", {}))
    return {
        "locale": locale,
        "commands": [
            {"phrase": phrase, "action": action}
            for phrase, action in commands.items()
        ]
    }


@router.post("/parse-voice-command")
def parse_voice_command(payload: dict):
    """
    Parse a spoken phrase and return the matching action.
    Used by frontend voice recognition to map spoken words to actions.
    """
    phrase = payload.get("phrase", "").lower().strip()
    locale = payload.get("locale", "en")

    commands = VOICE_COMMANDS.get(locale, VOICE_COMMANDS.get("en", {}))
    # Try exact match first
    for cmd, action in commands.items():
        if cmd.lower() in phrase:
            return {"matched": True, "action": action, "phrase": phrase, "matched_command": cmd}

    # Try English fallback
    for cmd, action in VOICE_COMMANDS["en"].items():
        if cmd.lower() in phrase:
            return {"matched": True, "action": action, "phrase": phrase, "matched_command": cmd}

    return {"matched": False, "action": None, "phrase": phrase}
