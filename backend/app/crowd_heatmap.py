"""
Feature 15: Crowd Density Heatmap
Detects number of people in a classroom frame and records density snapshots.
Provides heatmap data for classroom usage analytics.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import cv2, numpy as np, json

from . import models, security
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


def _count_people(img: np.ndarray) -> dict:
    """Count faces in image as a proxy for people count."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, 1.05, 3, minSize=(30, 30))
    count = len(faces)

    if count <= 5:
        density = "low"
    elif count <= 15:
        density = "normal"
    elif count <= 25:
        density = "high"
    else:
        density = "overcrowded"

    # Build grid heatmap data (5x5 grid)
    h, w = img.shape[:2]
    grid_rows, grid_cols = 5, 5
    cell_h, cell_w = h // grid_rows, w // grid_cols
    heatmap = [[0]*grid_cols for _ in range(grid_rows)]
    for (fx, fy, fw, fh) in faces:
        cx, cy = fx + fw//2, fy + fh//2
        row = min(int(cy / cell_h), grid_rows - 1)
        col = min(int(cx / cell_w), grid_cols - 1)
        heatmap[row][col] += 1

    return {"count": count, "density": density, "heatmap_grid": heatmap, "face_boxes": [
        {"x": int(fx), "y": int(fy), "w": int(fw), "h": int(fh)} for (fx, fy, fw, fh) in faces
    ]}


@router.post("/snapshot")
async def take_crowd_snapshot(
    file: UploadFile = File(...),
    room_name: str = "Main Hall",
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Analyze a frame for crowd density and save snapshot record."""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image.")

    result = _count_people(img)

    snap = models.CrowdSnapshot(
        institution_id=current_user.institution_id,
        room_name=room_name,
        subject_id=subject_id,
        person_count=result["count"],
        density_level=result["density"],
        heatmap_data_json=json.dumps(result["heatmap_grid"]),
    )
    db.add(snap)
    db.commit()

    return {
        "room": room_name,
        "person_count": result["count"],
        "density_level": result["density"],
        "heatmap_grid": result["heatmap_grid"],
        "face_locations": result["face_boxes"],
    }


@router.get("/history")
def get_crowd_history(
    room_name: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get crowd snapshot history for a room."""
    query = db.query(models.CrowdSnapshot).filter(
        models.CrowdSnapshot.institution_id == current_user.institution_id
    )
    if room_name:
        query = query.filter(models.CrowdSnapshot.room_name == room_name)
    snaps = query.order_by(models.CrowdSnapshot.created_at.desc()).limit(limit).all()
    return [
        {
            "id": s.id, "room": s.room_name, "count": s.person_count,
            "density": s.density_level,
            "heatmap": json.loads(s.heatmap_data_json) if s.heatmap_data_json else [],
            "created_at": s.created_at,
        }
        for s in snaps
    ]


@router.get("/peak-hours")
def get_peak_hours(
    room_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Analyze when each room is most occupied."""
    query = db.query(models.CrowdSnapshot).filter(
        models.CrowdSnapshot.institution_id == current_user.institution_id
    )
    if room_name:
        query = query.filter(models.CrowdSnapshot.room_name == room_name)

    snaps = query.all()
    hour_map = {}
    for s in snaps:
        if s.created_at:
            h = s.created_at.hour
            if h not in hour_map:
                hour_map[h] = []
            hour_map[h].append(s.person_count)

    peak_data = []
    for h, counts in sorted(hour_map.items()):
        avg = sum(counts) / len(counts)
        peak_data.append({"hour": h, "label": f"{h:02d}:00", "avg_count": round(avg, 1)})

    return {"room": room_name or "all", "peak_hours": peak_data}
