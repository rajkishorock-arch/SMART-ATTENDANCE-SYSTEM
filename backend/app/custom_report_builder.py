"""
Feature 20: Custom Report Builder
Drag-and-drop style report configuration. Save presets and export to PDF/CSV/Excel.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import json, io

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()

AVAILABLE_COLUMNS = [
    {"key": "roll", "label": "Roll No"},
    {"key": "name", "label": "Student Name"},
    {"key": "dep", "label": "Department"},
    {"key": "course", "label": "Course"},
    {"key": "year", "label": "Year"},
    {"key": "semester", "label": "Semester"},
    {"key": "email", "label": "Email"},
    {"key": "phone", "label": "Phone"},
    {"key": "present_days", "label": "Present Days"},
    {"key": "total_days", "label": "Total Days"},
    {"key": "percentage", "label": "Attendance %"},
    {"key": "streak_days", "label": "Streak Days"},
    {"key": "attendance_points", "label": "Points"},
    {"key": "estimated_age", "label": "Est. Age"},
    {"key": "wellness_score", "label": "Wellness Score"},
]


@router.get("/columns")
def get_available_columns():
    """List all available report columns."""
    return {"columns": AVAILABLE_COLUMNS}


@router.post("/save")
def save_report_config(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Save a custom report configuration preset."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    name = payload.get("name", "Custom Report")
    columns = payload.get("columns", [])
    filters = payload.get("filters", {})
    chart_type = payload.get("chart_type")

    if not columns:
        raise HTTPException(status_code=400, detail="At least one column is required.")

    config_entry = models.CustomReportConfig(
        institution_id=current_user.institution_id,
        name=name,
        columns_json=json.dumps(columns),
        filters_json=json.dumps(filters),
        chart_type=chart_type,
        created_by=current_user.email,
    )
    db.add(config_entry)
    db.commit()
    db.refresh(config_entry)
    return {"message": "Report config saved.", "config_id": config_entry.id}


@router.get("/saved")
def list_saved_configs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """List saved report configurations."""
    configs = db.query(models.CustomReportConfig).filter(
        models.CustomReportConfig.institution_id == current_user.institution_id
    ).order_by(models.CustomReportConfig.created_at.desc()).all()
    return [
        {
            "id": c.id, "name": c.name,
            "columns": json.loads(c.columns_json),
            "filters": json.loads(c.filters_json) if c.filters_json else {},
            "chart_type": c.chart_type,
            "created_by": c.created_by,
            "created_at": c.created_at,
        }
        for c in configs
    ]


@router.post("/export")
def export_custom_report(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Generate and export a custom report.
    Supports format: csv, json.
    """
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    columns = payload.get("columns", ["roll", "name", "dep", "percentage"])
    filters = payload.get("filters", {})
    fmt = payload.get("format", "csv").lower()
    department = filters.get("department")
    start_date = filters.get("start_date")
    end_date = filters.get("end_date")

    # Get attendance report
    report = crud.get_attendance_report(
        db,
        start_date_str=start_date,
        end_date_str=end_date,
        department=department,
        institution_id=current_user.institution_id,
    )
    students_data = report["students"]

    # Enrich with student model data
    col_keys = [c if isinstance(c, str) else c.get("key") for c in columns]
    rows = []
    for s_report in students_data:
        student = db.query(models.StudentModel).filter(
            models.StudentModel.id == s_report["id"]
        ).first()
        row = {}
        for key in col_keys:
            if key in s_report:
                row[key] = s_report[key]
            elif student and hasattr(student, key):
                row[key] = getattr(student, key)
            else:
                row[key] = ""
        rows.append(row)

    if fmt == "json":
        return {"columns": col_keys, "rows": rows, "total": len(rows)}

    # CSV export
    import csv
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=col_keys, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)
    buf.seek(0)

    filename = f"custom_report_{datetime.now(IST).strftime('%Y%m%d_%H%M')}.csv"
    return StreamingResponse(
        io.BytesIO(buf.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.delete("/saved/{config_id}")
def delete_report_config(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    config = db.query(models.CustomReportConfig).filter(
        models.CustomReportConfig.id == config_id,
        models.CustomReportConfig.institution_id == current_user.institution_id,
    ).first()
    if not config:
        raise HTTPException(status_code=404, detail="Config not found.")
    db.delete(config)
    db.commit()
    return {"message": "Report config deleted."}
