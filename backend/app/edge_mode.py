"""
Feature 33: Edge Computing Mode (Raspberry Pi / Local Device)
Registers edge nodes, provides offline sync, and processes attendance at the door.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import hashlib, secrets, json

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


@router.post("/register-node")
def register_edge_node(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Register a new edge node (Raspberry Pi / local device)."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only.")

    name = payload.get("name", "Edge Node 1")
    location = payload.get("location", "Main Gate")

    # Generate unique node_id and API key
    node_id = secrets.token_hex(16)
    api_key = secrets.token_urlsafe(32)
    api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    node = models.EdgeNode(
        institution_id=current_user.institution_id,
        node_id=node_id,
        name=name,
        location=location,
        api_key_hash=api_key_hash,
        is_active=True,
    )
    db.add(node)
    db.commit()
    db.refresh(node)

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Registered edge node '{name}' at '{location}' (ID: {node.id})."
        ),
        institution_id=current_user.institution_id,
    )

    return {
        "message": "Edge node registered. Save the API key — it won't be shown again.",
        "node_id": node_id,
        "node_db_id": node.id,
        "api_key": api_key,
        "name": name,
        "location": location,
    }


def _authenticate_edge_node(db: Session, node_id: str, api_key: str) -> Optional[models.EdgeNode]:
    """Verify edge node API key."""
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    return db.query(models.EdgeNode).filter(
        models.EdgeNode.node_id == node_id,
        models.EdgeNode.api_key_hash == key_hash,
        models.EdgeNode.is_active == True,
    ).first()


@router.post("/sync-attendance")
def edge_node_sync_attendance(
    request: Request,
    payload: dict,
    db: Session = Depends(get_db),
):
    """
    Edge node (Raspberry Pi) POSTs attendance records for syncing to main DB.
    Authenticated via node_id + api_key in payload.
    """
    node_id = payload.get("node_id")
    api_key = payload.get("api_key")
    records = payload.get("records", [])

    if not node_id or not api_key:
        raise HTTPException(status_code=401, detail="node_id and api_key required.")

    node = _authenticate_edge_node(db, node_id, api_key)
    if not node:
        raise HTTPException(status_code=401, detail="Invalid node credentials.")

    # Update last sync time
    node.last_sync_at = datetime.now(IST)
    db.commit()

    synced = 0
    failed = 0
    for rec in records:
        try:
            student_id = rec.get("student_id")
            student = db.query(models.StudentModel).filter(
                models.StudentModel.id == student_id,
                models.StudentModel.institution_id == node.institution_id,
            ).first()
            if not student:
                failed += 1
                continue

            _, newly = crud.mark_student_attendance(
                db,
                student_id=student_id,
                name=student.name,
                roll=student.roll or "",
                dep=student.dep or "",
                subject_id=rec.get("subject_id"),
                custom_date=rec.get("date"),
                custom_time=rec.get("time"),
                institution_id=node.institution_id,
            )
            synced += 1
        except Exception as e:
            failed += 1
            print(f"[EdgeSync] Failed record: {e}")

    return {
        "synced": synced,
        "failed": failed,
        "node_name": node.name,
        "institution_id": node.institution_id,
    }


@router.get("/nodes")
def list_edge_nodes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """List all registered edge nodes for the institution."""
    nodes = db.query(models.EdgeNode).filter(
        models.EdgeNode.institution_id == current_user.institution_id
    ).all()
    return [
        {
            "id": n.id, "node_id": n.node_id, "name": n.name,
            "location": n.location, "is_active": n.is_active,
            "last_sync_at": n.last_sync_at, "created_at": n.created_at,
        }
        for n in nodes
    ]


@router.get("/download-embeddings")
def download_face_embeddings_for_edge(
    node_id: str,
    api_key: str,
    db: Session = Depends(get_db),
):
    """
    Edge node downloads all face embeddings to local cache for offline recognition.
    Returns encrypted embeddings for all enrolled students.
    """
    node = _authenticate_edge_node(db, node_id, api_key)
    if not node:
        raise HTTPException(status_code=401, detail="Invalid node credentials.")

    students = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == node.institution_id,
        models.StudentModel.face_embedding != None,
    ).all()

    return {
        "institution_id": node.institution_id,
        "total_students": len(students),
        "students": [
            {
                "id": s.id,
                "name": s.name,
                "roll": s.roll,
                "dep": s.dep,
                "face_embedding": s.face_embedding,  # Encrypted
            }
            for s in students
        ],
        "downloaded_at": datetime.now(IST).isoformat(),
    }
