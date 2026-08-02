"""
Feature 1: Real-time WebSocket Live Sync
All clients (web, mobile, desktop) receive live attendance events instantly.
Replaces polling — zero latency dashboard updates.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Set
import json
import asyncio
from datetime import datetime, timezone, timedelta

from . import models, security
from .database import get_db
from .core import config

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()

# ── Connection Manager ────────────────────────────────────────────────────────

class LiveConnectionManager:
    """
    Manages WebSocket connections grouped by institution_id.
    Supports broadcast to all clients in an institution or targeted sends.
    """

    def __init__(self):
        # institution_id -> list of (websocket, role)
        self._connections: Dict[int, List[dict]] = {}

    async def connect(self, websocket: WebSocket, institution_id: int, role: str = "unknown"):
        await websocket.accept()
        if institution_id not in self._connections:
            self._connections[institution_id] = []
        self._connections[institution_id].append({"ws": websocket, "role": role})

    def disconnect(self, websocket: WebSocket, institution_id: int):
        if institution_id in self._connections:
            self._connections[institution_id] = [
                c for c in self._connections[institution_id] if c["ws"] is not websocket
            ]

    async def broadcast(self, institution_id: int, payload: dict):
        """Send event to all connected clients of an institution."""
        if institution_id not in self._connections:
            return
        dead = []
        for conn in self._connections[institution_id]:
            try:
                await conn["ws"].send_json(payload)
            except Exception:
                dead.append(conn)
        for d in dead:
            self._connections[institution_id].remove(d)

    async def broadcast_all(self, payload: dict):
        """Send event to every connected client (system-wide)."""
        for inst_id in list(self._connections.keys()):
            await self.broadcast(inst_id, payload)

    def active_count(self, institution_id: Optional[int] = None) -> int:
        if institution_id is not None:
            return len(self._connections.get(institution_id, []))
        return sum(len(v) for v in self._connections.values())


# Singleton manager — imported by attendance.py for attendance broadcasts
manager = LiveConnectionManager()


# ── WebSocket Endpoint ────────────────────────────────────────────────────────

@router.websocket("/ws")
async def live_ws(websocket: WebSocket, token: Optional[str] = None):
    """
    Main real-time WebSocket endpoint.
    Connect with: ws://<host>/api/v1/live/ws?token=<JWT>
    All attendance events, notifications, and system alerts are pushed here.
    """
    institution_id = None
    role = "unknown"

    if token:
        try:
            from jose import jwt, JWTError
            payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
            institution_id = payload.get("institution_id")
            role = payload.get("role", "unknown")
        except Exception:
            await websocket.close(code=4001)
            return

    if institution_id is None:
        await websocket.close(code=4002)
        return

    await manager.connect(websocket, institution_id, role)

    # Send welcome + current active count
    await websocket.send_json({
        "event": "connected",
        "institution_id": institution_id,
        "role": role,
        "active_connections": manager.active_count(institution_id),
        "timestamp": datetime.now(IST).isoformat(),
    })

    try:
        while True:
            # Receive pings or commands from client
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "ts": datetime.now(IST).isoformat()})
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, institution_id)
    except Exception:
        manager.disconnect(websocket, institution_id)


# ── REST helpers used by other modules ───────────────────────────────────────

async def push_attendance_event(institution_id: int, student_name: str, roll: str,
                                  dep: str, status: str, confidence: float = 0.0):
    """Called from attendance.py when a student is marked present."""
    await manager.broadcast(institution_id, {
        "event": "attendance_marked",
        "name": student_name,
        "roll": roll,
        "dep": dep,
        "status": status,
        "confidence": confidence,
        "timestamp": datetime.now(IST).strftime("%I:%M:%S %p"),
        "date": datetime.now(IST).strftime("%d/%m/%Y"),
    })


async def push_alert(institution_id: int, alert_type: str, message: str, severity: str = "info"):
    """Push a generic alert to all institution clients."""
    await manager.broadcast(institution_id, {
        "event": "alert",
        "alert_type": alert_type,
        "message": message,
        "severity": severity,
        "timestamp": datetime.now(IST).isoformat(),
    })


# ── REST endpoint: active connections count ───────────────────────────────────

@router.get("/active-count")
def get_active_connections(
    current_user: models.User = Depends(security.get_current_user),
):
    """Returns number of active WebSocket connections for this institution."""
    return {
        "institution_id": current_user.institution_id,
        "active_connections": manager.active_count(current_user.institution_id),
    }
