"""
Device & Kiosk Health Monitoring Router (Phase 6)
Tracks physical attendance kiosks, cameras, mobile checkpoints, and edge devices.
Provides real-time heartbeat ingestion, offline detection, and telemetry analytics.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from . import models, schemas, security, crud
from .database import get_db

router = APIRouter()

DEFAULT_OFFLINE_TIMEOUT_MINUTES = 5


def _format_device(d: models.AttendanceDevice, timeout_min: int = DEFAULT_OFFLINE_TIMEOUT_MINUTES) -> schemas.AttendanceDeviceResponse:
    now = datetime.now(timezone.utc)
    hb = d.last_heartbeat
    if hb.tzinfo is None:
        hb = hb.replace(tzinfo=timezone.utc)

    delta = (now - hb).total_seconds()
    minutes_ago = max(0.0, round(delta / 60.0, 1))

    # Auto-detect offline status if heartbeat timed out
    effective_status = d.status
    if minutes_ago > timeout_min and effective_status != "MAINTENANCE":
        effective_status = "OFFLINE"

    is_online = effective_status == "ONLINE"

    return schemas.AttendanceDeviceResponse(
        id=d.id,
        institution_id=d.institution_id,
        device_identifier=d.device_identifier,
        name=d.name,
        location=d.location,
        device_type=d.device_type,
        ip_address=d.ip_address,
        app_version=d.app_version,
        status=effective_status,
        camera_status=d.camera_status,
        battery_level=d.battery_level,
        network_latency_ms=d.network_latency_ms,
        pending_sync_count=d.pending_sync_count or 0,
        last_heartbeat=d.last_heartbeat,
        is_online=is_online,
        minutes_since_heartbeat=minutes_ago
    )


@router.get("", response_model=List[schemas.AttendanceDeviceResponse])
def list_attendance_devices(
    device_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """List all registered kiosks & scanners for the active institution."""
    query = db.query(models.AttendanceDevice).filter(
        models.AttendanceDevice.institution_id == identity.institution_id
    )

    if device_type and device_type != "ALL":
        query = query.filter(models.AttendanceDevice.device_type == device_type.upper())

    # Get timeout from settings if configured
    settings = db.query(models.SystemSettings).filter(
        models.SystemSettings.institution_id == identity.institution_id
    ).first()
    timeout_min = getattr(settings, "device_offline_timeout_minutes", DEFAULT_OFFLINE_TIMEOUT_MINUTES) or DEFAULT_OFFLINE_TIMEOUT_MINUTES

    devices = query.order_by(models.AttendanceDevice.name.asc()).all()
    formatted = [_format_device(d, timeout_min) for d in devices]

    if status and status != "ALL":
        formatted = [f for f in formatted if f.status == status.upper()]

    return formatted


@router.get("/summary", response_model=schemas.DeviceFleetSummary)
def get_fleet_summary(
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Aggregate health telemetry across all institutional kiosks."""
    devices = db.query(models.AttendanceDevice).filter(
        models.AttendanceDevice.institution_id == identity.institution_id
    ).all()

    settings = db.query(models.SystemSettings).filter(
        models.SystemSettings.institution_id == identity.institution_id
    ).first()
    timeout_min = getattr(settings, "device_offline_timeout_minutes", DEFAULT_OFFLINE_TIMEOUT_MINUTES) or DEFAULT_OFFLINE_TIMEOUT_MINUTES

    total = len(devices)
    online_count = 0
    offline_count = 0
    degraded_count = 0
    healthy_cameras = 0
    alerts_count = 0

    for d in devices:
        f = _format_device(d, timeout_min)
        if f.status == "ONLINE":
            online_count += 1
        elif f.status == "OFFLINE":
            offline_count += 1
            alerts_count += 1
        elif f.status == "DEGRADED":
            degraded_count += 1
            alerts_count += 1

        if f.camera_status == "OK":
            healthy_cameras += 1
        else:
            alerts_count += 1

    return schemas.DeviceFleetSummary(
        total_devices=total,
        online_count=online_count,
        offline_count=offline_count,
        degraded_count=degraded_count,
        healthy_cameras=healthy_cameras,
        alerts_count=alerts_count
    )


@router.post("/register", response_model=schemas.AttendanceDeviceResponse)
def register_device(
    payload: schemas.AttendanceDeviceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Register a new attendance scanning device or kiosk (Staff only)."""
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    existing = db.query(models.AttendanceDevice).filter(
        models.AttendanceDevice.institution_id == current_user.institution_id,
        models.AttendanceDevice.device_identifier == payload.device_identifier.strip()
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Device identifier '{payload.device_identifier}' is already registered."
        )

    device = models.AttendanceDevice(
        institution_id=current_user.institution_id,
        device_identifier=payload.device_identifier.strip(),
        name=payload.name.strip(),
        location=payload.location,
        device_type=payload.device_type.upper(),
        app_version=payload.app_version,
        status="ONLINE",
        camera_status="OK",
        last_heartbeat=datetime.now(timezone.utc)
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            role=current_user.role,
            action=f"Registered attendance kiosk/device: '{device.name}' ({device.device_identifier})",
            entity_type="device",
            entity_id=str(device.id),
            reason="Fleet device onboarding"
        ),
        institution_id=current_user.institution_id
    )

    return _format_device(device)


@router.post("/heartbeat", response_model=schemas.AttendanceDeviceResponse)
def record_heartbeat(
    payload: schemas.DeviceHeartbeatPayload,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Ingest regular telemetry heartbeat from kiosk device.
    Updates uptime, camera condition, battery, and sync backlog.
    """
    device = db.query(models.AttendanceDevice).filter(
        models.AttendanceDevice.institution_id == identity.institution_id,
        models.AttendanceDevice.device_identifier == payload.device_identifier.strip()
    ).first()

    now_utc = datetime.now(timezone.utc)

    # Auto-register device if not found
    if not device:
        device = models.AttendanceDevice(
            institution_id=identity.institution_id,
            device_identifier=payload.device_identifier.strip(),
            name=f"Device {payload.device_identifier.strip()}",
            device_type="KIOSK",
            status="ONLINE",
            camera_status=payload.camera_status or "OK",
            battery_level=payload.battery_level,
            network_latency_ms=payload.network_latency_ms,
            pending_sync_count=payload.pending_sync_count or 0,
            app_version=payload.app_version,
            last_heartbeat=now_utc
        )
        db.add(device)
    else:
        device.status = payload.status or "ONLINE"
        device.camera_status = payload.camera_status or "OK"
        if payload.battery_level is not None:
            device.battery_level = payload.battery_level
        if payload.network_latency_ms is not None:
            device.network_latency_ms = payload.network_latency_ms
        if payload.pending_sync_count is not None:
            device.pending_sync_count = payload.pending_sync_count
        if payload.app_version:
            device.app_version = payload.app_version
        device.last_heartbeat = now_utc

    # Log telemetry entry
    hb_log = models.DeviceHeartbeatLog(
        institution_id=identity.institution_id,
        device_id=device.id,
        status=device.status,
        battery_level=device.battery_level,
        camera_status=device.camera_status,
        network_latency_ms=device.network_latency_ms
    )
    db.add(hb_log)
    db.commit()
    db.refresh(device)

    return _format_device(device)


@router.put("/{device_id}", response_model=schemas.AttendanceDeviceResponse)
def update_device(
    device_id: int,
    payload: schemas.AttendanceDeviceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Update device metadata or status (Staff only)."""
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(status_code=403, detail="Staff access only.")

    device = db.query(models.AttendanceDevice).filter(
        models.AttendanceDevice.id == device_id,
        models.AttendanceDevice.institution_id == current_user.institution_id
    ).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(device, k, v)

    db.commit()
    db.refresh(device)
    return _format_device(device)


@router.delete("/{device_id}")
def delete_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Decommission an attendance scanning device."""
    if current_user.role not in ["admin", "hod"]:
        raise HTTPException(status_code=403, detail="Admin access only.")

    device = db.query(models.AttendanceDevice).filter(
        models.AttendanceDevice.id == device_id,
        models.AttendanceDevice.institution_id == current_user.institution_id
    ).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")

    name = device.name
    db.delete(device)
    db.commit()

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            role=current_user.role,
            action=f"Decommissioned attendance kiosk: '{name}' (ID #{device_id})",
            entity_type="device",
            entity_id=str(device_id),
            reason="Device decommissioning"
        ),
        institution_id=current_user.institution_id
    )

    return {"message": f"Device '{name}' decommissioned successfully."}
