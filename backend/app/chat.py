import os
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from .core.config import GEMINI_API_KEY
from .database import get_db
from .core import config
from . import security, models, database

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
        if email is None or role is None:
            raise credentials_exception
        return {"email": email, "role": role}
    except JWTError:
        raise credentials_exception

# Fallback responder function
def get_fallback_response(query: str) -> str:
    q = query.lower()
    if "hello" in q or "hi" in q or "hey" in q:
        return "Hi there! I am the **Smart Attendance System Assistant**. I can help you answer questions about how this application works, such as registering, marking attendance, and checking logs. How can I help you today?"
    elif "attendance" in q or "scan" in q:
        return "To mark attendance, go to the **Live Scanner** tab (from the bottom navigation or sidebar). Grant camera access, stand in front of the camera, and wait for the system to detect and recognize your face. Once verified, your present status will be saved in real time."
    elif "geofencing" in q or "location" in q:
        return "**Geofencing** is a security feature that restricts attendance marking to the campus boundary. The admin configures the allowed latitude, longitude, and radius. If you try to mark attendance from outside this boundary, the scanner will block you."
    elif "ip restriction" in q or "subnet" in q:
        return "**IP Restriction** ensures that you can only log attendance while connected to the institution's official network or Wi-Fi subnets. Attempts from external internet connections or unknown networks will be blocked for security."
    elif "password" in q or "change password" in q:
        return "Students can change their password under their **Academic Profile** view. Teachers and Admins can update their credentials in the **Settings** tab. For security, make sure to choose a strong password."
    elif "roll" in q or "student default password" in q:
        return "By default, when a student is registered, their initial password is set to their **Roll Number**. They can log in using their roll number as the password and then manually change it in their Profile tab."
    elif "admin" in q:
        return "Admins have full privileges to manage students, teachers, subjects, schedules, geofencing coordinates, and view all feedback logs and system metrics."
    else:
        return (
            "I am the Smart Attendance System AI Assistant!\n\n"
            "To unlock my full Generative AI capabilities (which allow me to answer any doubt, write code, or explain complex educational concepts), "
            "please ask the administrator to configure the `GEMINI_API_KEY` in the system environment variables.\n\n"
            "Currently, I can answer queries related to: \n"
            "- How to mark attendance\n"
            "- What is geofencing & IP restriction\n"
            "- Changing password\n"
            "- Default student login credentials"
        )

@router.post("/")
def chat_response(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user_info: dict = Depends(get_current_any_user)
):
    user_query = payload.message
    
    # If no API key is configured, return the fallback response
    if not GEMINI_API_KEY:
        if payload.image_base64:
            return {"response": "An image was uploaded, but the Gemini AI API Key is not configured by the system administrator. Therefore, I cannot analyze this file. " + get_fallback_response(user_query)}
        return {"response": get_fallback_response(user_query)}
        
    # Prepare payload for Gemini API
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    # Map history to Gemini role format ('user' and 'model')
    contents = []
    for h in payload.history:
        contents.append({
            "role": "user" if h.role == "user" else "model",
            "parts": [{"text": h.content}]
        })
        
    # Append the new user query (handling multimodal parts)
    parts = [{"text": user_query}]
    if payload.image_base64 and payload.image_mime_type:
        parts.append({
            "inlineData": {
                "mimeType": payload.image_mime_type,
                "data": payload.image_base64
            }
        })

    contents.append({
        "role": "user",
        "parts": parts
    })
    
    system_instruction = (
        "You are a helpful AI assistant for the 'SMART ATTENDANCE SYSTEM', an industry-grade secure facial recognition attendance system. "
        "You help students, teachers, and admins solve their academic doubts, understand how the attendance system works, troubleshoot facial recognition, "
        "geofencing, and network-related issues, and answer any general educational or system-related questions. "
        "Be friendly, interactive, and keep responses concise and formatted in clean markdown."
    )
    if payload.personality == "futuristic":
        system_instruction += " Adopt a highly futuristic, sci-fi robotic tone with cybernetic terminology, glowing holographic responses, and technological metaphors."
    elif payload.personality == "casual":
        system_instruction += " Adopt a very friendly, casual, informal, and conversational tone, like a helpful study group classmate."
    elif payload.personality == "tutor":
        system_instruction += " Adopt a patient academic tutor personality. Explain concepts step-by-step with clear definitions, educational context, and analogies."
    elif payload.personality == "robotic":
        system_instruction += " Adopt a logical, systematic, direct machine-like tone. Give concise, highly structured data outputs without conversational fluff."
    
    body = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        }
    }
    
    try:
        res = requests.post(api_url, json=body, timeout=10)
        if res.status_code == 200:
            data = res.json()
            # Extract text from response
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return {"response": parts[0].get("text", "")}
            return {"response": "I processed your request but could not generate a reply. Please try again."}
        else:
            print("Gemini API Error:", res.status_code, res.text)
            # Fail silently to fallback
            return {"response": get_fallback_response(user_query)}
    except Exception as e:
        print("Failed to contact Gemini API:", e)
        # Fail silently to fallback
        return {"response": get_fallback_response(user_query)}
