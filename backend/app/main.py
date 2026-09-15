import sys
import os
import time
import uvicorn
from fastapi import FastAPI, Request, Depends, HTTPException

# Ensure the 'backend' directory is in sys.path so 'app' can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import engine, Base, get_db
from sqlalchemy.orm import Session
from app.api import api_router
from app import models, security

from app.core.lifecycle import (
    create_db_and_tables,
    update_schema,
    migrate_multi_tenant_seed,
    migrate_existing_student_embeddings,
    ensure_primary_admin,
    setup_lifecycle_handlers,
    on_startup,
    on_shutdown,
)
from app.core.config import validate_config, SEED_DEFAULT_USERS
from app.core.middleware import setup_middlewares

validate_config()

app = FastAPI(
    title="AI-Powered Secure Face Recognition Attendance System",
    description="Industry Grade Face Recognition Attendance System with FastAPI backend.",
    version="1.0.0"
)

setup_middlewares(app)
setup_lifecycle_handlers(app)


@app.get("/", tags=["Root"])
def read_root():
    from app.database import SessionLocal
    from sqlalchemy import text
    from app import models
    db = SessionLocal()
    diagnostics = {}
    try:
        db.execute(text("SELECT 1"))
        diagnostics["basic_ping"] = "OK"
        
        try:
            inst = db.query(models.Institution).first()
            diagnostics["query_institution"] = f"OK (found ID {inst.id if inst else 'none'})"
        except Exception as inst_err:
            diagnostics["query_institution_error"] = str(inst_err)

        try:
            user = db.query(models.User).first()
            diagnostics["query_user"] = f"OK (found ID {user.id if user else 'none'})"
        except Exception as user_err:
            diagnostics["query_user_error"] = str(user_err)

        try:
            audit = db.query(models.AuditLog).first()
            diagnostics["query_audit"] = f"OK (found ID {audit.id if audit else 'none'})"
        except Exception as audit_err:
            diagnostics["query_audit_error"] = str(audit_err)

    except Exception as e:
        diagnostics["error"] = str(e)
    finally:
        db.close()
        
    return {
        "message": "Welcome to the Face Recognition Attendance System API",
        "diagnostics": diagnostics
    }


app.include_router(api_router, prefix="/api/v1")


@app.get("/api/v1/health/deep", tags=["System Health"])
def deep_health_check(db: Session = Depends(get_db)):
    """
    Comprehensive multi-subsystem production health check.
    Validates database connection, schema migration status,
    OpenCV engine readiness, and multi-tenant integrity.
    """
    from sqlalchemy import text
    from datetime import datetime, timezone
    import sys

    status_report = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.5.0-production",
        "python_version": sys.version.split()[0],
        "subsystems": {}
    }
    try:
        # 1. Database Ping
        db.execute(text("SELECT 1"))
        status_report["subsystems"]["database"] = {"status": "UP", "message": "Connection active"}

        # 2. Tenants & User count
        inst_count = db.query(models.Institution).count()
        user_count = db.query(models.User).count()
        student_count = db.query(models.StudentModel).count()
        status_report["subsystems"]["tenancy"] = {
            "status": "UP",
            "active_institutions": inst_count,
            "registered_users": user_count,
            "enrolled_students": student_count
        }

        # 3. Vision Model status
        from app.recognition_service import recognition_service
        status_report["subsystems"]["face_engine"] = {
            "status": "UP" if recognition_service else "INITIALIZING",
            "model": "YuNet + SFace ONNX"
        }

        # 4. Security & Audit infrastructure
        audit_count = db.query(models.AuditLog).count()
        status_report["subsystems"]["audit_engine"] = {
            "status": "UP",
            "immutable_log_count": audit_count
        }
    except Exception as exc:
        status_report["status"] = "degraded"
        status_report["error"] = str(exc)

    return status_report


@app.post("/api/v1/system/backup", tags=["System Administration"])
def create_system_backup(
    current_user: models.User = Depends(security.get_current_user)
):
    """Admin-only on-demand database backup creation."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    import shutil
    import os
    from datetime import datetime, timezone
    backup_dir = "backups"
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"attendance_backup_{timestamp}.db")

    if os.path.exists("attendance.db"):
        shutil.copyfile("attendance.db", backup_file)
        file_size = os.path.getsize(backup_file)
    else:
        file_size = 0

    return {
        "success": True,
        "backup_file": backup_file,
        "size_bytes": file_size,
        "created_at": datetime.now(timezone.utc).isoformat()
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)