import os
import json
import urllib.request
import urllib.error
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from .core.config import GEMINI_API_KEY
from .database import get_db
from .core import config
from . import security, models

router = APIRouter()

# Schema for chat request
class ChatMessage(BaseModel):
    role: str # 'user' or 'model'
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    image_base64: Optional[str] = None
    image_mime_type: Optional[str] = None
    personality: Optional[str] = "default"
    user_context: Optional[str] = None

def get_current_any_user(db: Session = Depends(get_db), token: str = Depends(security.oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        institution_id: int = payload.get("institution_id")
        if email is None or role is None:
            raise credentials_exception
        return {"email": email, "role": role, "institution_id": institution_id}
    except JWTError:
        raise credentials_exception

def build_system_instruction(personality: str, user_context: Optional[str] = None) -> str:
    instruction = (
        "You are an omniscient, ultra-intelligent, helpful, and friendly AI assistant powered by the highest level intelligence (like ChatGPT-4o and Google Gemini Pro). "
        "You are integrated into the Smart Attendance System portal developed by Rajkishor. "
        "\n\nYOUR CAPABILITIES & BOUNDARIES:"
        "\n1. You can answer ABSOLUTELY ANYTHING: computer science, software engineering, programming/coding in any language, mathematics, physics, chemistry, biology, history, literature, general knowledge, daily queries, exam preparation, and creative writing."
        "\n2. You are also the expert authority on the Smart Attendance System: explaining face recognition scanning (FaceNet & MTCNN), real-time anti-spoofing EAR liveness verification, GPS geofencing radius (100m campus boundary), IP subnet security restrictions, student leave requests, manual attendance registers, academic calendar schedules, and role permissions (Admin, Teacher, Student)."
        "\n3. NEVER refuse to answer a question or claim it is outside your operational scope. Answer fully, clearly, and thoughtfully."
        "\n4. Format your output in clean, readable, professional GitHub Markdown with bold headings, lists, bullet points, and syntax-highlighted code blocks where appropriate."
        "\n5. Answer in the language the user speaks: if they write in English, answer in English; if they write in Hindi or Hinglish, respond warmly in fluent Hindi or Hinglish."
    )
    
    if personality == "futuristic":
        instruction += "\nPersonality Style: Adopt a sleek futuristic cybernetic tone with advanced technological metaphors."
    elif personality == "casual":
        instruction += "\nPersonality Style: Adopt a very friendly, supportive, casual tone like an expert study buddy."
    elif personality == "tutor":
        instruction += "\nPersonality Style: Adopt a patient, encouraging academic tutor style that breaks complex concepts down step-by-step with intuitive examples."
    elif personality == "robotic":
        instruction += "\nPersonality Style: Adopt a direct, logical, structured, and factual style with high precision."

    if user_context:
        instruction += f"\n\n[USER PROFILE & REAL-TIME CONTEXT]\n{user_context}\nUse this context directly when the user asks about their own attendance, subjects, mentors, or records."

    return instruction

def call_pollinations_ai(system_instruction: str, history: List[ChatMessage], user_query: str) -> Optional[str]:
    """Universal high-intelligence fallback engine using GPT-4o / Gemini models with zero API key requirement."""
    try:
        messages = [{"role": "system", "content": system_instruction}]
        
        # Add history (last 12 turns for speed and context)
        for h in history[-12:]:
            role = "assistant" if h.role == "model" else "user"
            messages.append({"role": role, "content": h.content})
            
        messages.append({"role": "user", "content": user_query})
        
        payload = json.dumps({
            "messages": messages,
            "model": "openai",
            "temperature": 0.7
        }).encode("utf-8")
        
        req = urllib.request.Request(
            "https://text.pollinations.ai/",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "SmartAttendanceAI/2.5"
            }
        )
        
        with urllib.request.urlopen(req, timeout=14) as response:
            text = response.read().decode("utf-8")
            if text and len(text.strip()) > 0:
                return text.strip()
    except Exception as e:
        print(f"Pollinations AI fallback error: {e}")
    return None

def call_gemini_ai(system_instruction: str, history: List[ChatMessage], user_query: str, image_base64: Optional[str] = None, image_mime_type: Optional[str] = None) -> Optional[str]:
    """Call Google Gemini API if GEMINI_API_KEY is configured."""
    if not GEMINI_API_KEY:
        return None
    try:
        # Try new google.genai SDK
        try:
            import google.genai as genai_new
            client = genai_new.Client(api_key=GEMINI_API_KEY)
            contents = []
            for h in history[-10:]:
                contents.append(h.content)
            contents.append(user_query)
            res = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=contents,
                config={"system_instruction": system_instruction}
            )
            if res and res.text:
                return res.text
        except Exception:
            pass

        # Try legacy google.generativeai SDK
        try:
            import google.generativeai as genai_legacy
            genai_legacy.configure(api_key=GEMINI_API_KEY)
            model = genai_legacy.GenerativeModel("gemini-1.5-flash", system_instruction=system_instruction)
            
            chat_hist = []
            for h in history[-10:]:
                chat_hist.append({"role": h.role, "parts": [h.content]})
            chat = model.start_chat(history=chat_hist)
            
            content_parts = [user_query]
            if image_base64 and image_mime_type:
                content_parts.append({
                    "mime_type": image_mime_type,
                    "data": image_base64
                })
            res = chat.send_message(content_parts)
            if res and res.text:
                return res.text
        except Exception:
            pass
    except Exception as e:
        print(f"Gemini API invocation error: {e}")
    return None

def get_offline_smart_response(query: str, user_context: Optional[str] = None) -> str:
    """Smart local knowledge base when completely disconnected from the internet."""
    q = query.lower()
    
    if user_context and any(k in q for k in ["my attendance", "my profile", "my roll", "who is my mentor", "my percent", "apna attendance", "meri attendance"]):
        lines = [l.strip() for l in user_context.split('\n') if l.strip() and not l.startswith('[')]
        bullet_points = "\n".join([f"- **{l}**" for l in lines])
        return f"Here are your verified student details from your active profile:\n\n{bullet_points}"
        
    if any(k in q for k in ["hello", "hi", "hey", "namaste", "kaise ho"]):
        return (
            "Hello! I am your **Smart Attendance AI Assistant**.\n\n"
            "I can help you with anything — from answering study doubts, coding algorithms, mathematics, and science concepts, "
            "to marking face attendance, understanding GPS geofencing, and navigating your student portal.\n\n"
            "How can I assist you right now?"
        )
    elif "attendance" in q or "scan" in q or "mark" in q:
        return (
            "### How to Mark Attendance:\n"
            "1. Open the **Live Scanner** tab from the bottom navigation dock or sidebar.\n"
            "2. Allow camera permissions when prompted by your browser or Android app.\n"
            "3. Align your face inside the bounding box on screen. The system uses **FaceNet Biometric Embeddings** with real-time **EAR Liveness detection** to prevent photo spoofing.\n"
            "4. Make sure you are inside the institution's geofenced perimeter. Your attendance will be marked in milliseconds!"
        )
    elif "geofenc" in q or "location" in q or "radius" in q:
        return (
            "### GPS Geofencing Perimeter:\n"
            "- The institution is protected by an enforced GPS boundary (typically a 100m radius around campus coordinates).\n"
            "- When scanning your face, your device's high-accuracy GPS coordinates are validated against this perimeter.\n"
            "- Attendance scans made from outside the campus boundary will be flagged and rejected for compliance."
        )
    elif "password" in q or "change password" in q:
        return (
            "### Password Management:\n"
            "- **Students**: You can change your password anytime by clicking your **Academic Profile** in the top navigation or sidebar.\n"
            "- **Initial Student Password**: Set to your registered **Roll Number** by default upon admission.\n"
            "- **Teachers / Admins**: Update credentials directly under the **Settings** menu."
        )
    elif "leave" in q or "chhutti" in q:
        return (
            "### Leave Requests:\n"
            "- Students can submit leave applications with dates and reason directly from their dashboard.\n"
            "- Teachers and Admins review these requests in the Leave Management queue with instant notifications upon approval or rejection."
        )
    elif "diagram" in q:
        return "Here is the interactive biometric scanning architecture diagram for you:\n\n[ShowDiagram: face_recognition]"
    else:
        return (
            f"### Response to: *\"{query}\"*\n\n"
            "I understand your query! I can explain theoretical concepts, write algorithms, debug software, solve math problems, "
            "or guide you through any feature in the Smart Attendance System.\n\n"
            "Feel free to ask follow-up questions or request code examples, diagrams, or step-by-step solutions!"
        )

@router.post("/")
def chat_response(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user_info: dict = Depends(get_current_any_user)
):
    user_query = payload.message.strip()
    if not user_query:
        return {"response": "Please enter a message or question!"}

    system_instruction = build_system_instruction(
        personality=payload.personality or "default",
        user_context=payload.user_context
    )

    # Tier 1: Try Gemini API if key is present
    if GEMINI_API_KEY:
        gemini_res = call_gemini_ai(
            system_instruction=system_instruction,
            history=payload.history,
            user_query=user_query,
            image_base64=payload.image_base64,
            image_mime_type=payload.image_mime_type
        )
        if gemini_res:
            return {"response": gemini_res}

    # Tier 2: Universal High-Intelligence LLM Engine (Pollinations AI GPT-4o)
    llm_res = call_pollinations_ai(
        system_instruction=system_instruction,
        history=payload.history,
        user_query=user_query
    )
    if llm_res:
        return {"response": llm_res}

    # Tier 3: Resilient offline knowledge base
    offline_res = get_offline_smart_response(user_query, payload.user_context)
    return {"response": offline_res}
