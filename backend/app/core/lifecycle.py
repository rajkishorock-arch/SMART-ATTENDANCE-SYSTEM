"""
core/lifecycle.py — Database Lifecycle and Application Startup/Shutdown Management

Centralizes:
1. Application startup orchestration (background threads, model warmup, dispute sync).
2. Application shutdown handling (graceful scheduler shutdown).
3. Database multi-tenant seed and embedding migrations.
4. Legacy startup schema update helpers (transitional, maintained for non-destructive
   compatibility alongside Alembic migration infrastructure).
"""

import os
import sys
import threading
from typing import Optional
from sqlalchemy import text, inspect
from sqlalchemy.orm import Session

from app.database import engine, Base, SessionLocal
from app.core.config import ENV, DATABASE_URL, SEED_DEFAULT_USERS


def is_testing() -> bool:
    """Detect whether the application is running inside a pytest test environment."""
    return "pytest" in sys.modules or os.getenv("TESTING", "").lower() in ("1", "true")


def create_db_and_tables():
    """
    Development/test helper to create tables.
    For production environments, Alembic migrations should be used.
    """
    try:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("Tables created.")
    except Exception as e:
        print("Warning: create_db_and_tables error:", e)


def update_schema():
    """
    Legacy startup schema synchronizer.
    Maintained for transitional backward compatibility during Phase 3B.
    Alembic migrations are the authoritative schema modification tool.
    """
    db = SessionLocal()
    try:
        inspector = inspect(engine)

        def safe_add_column(table_name, column_name, col_def):
            try:
                fresh_inspector = inspect(engine)
                if table_name not in fresh_inspector.get_table_names():
                    return
                cols = [c['name'].lower() for c in fresh_inspector.get_columns(table_name)]
                if column_name.lower() not in cols:
                    print(f"Adding {column_name} column to {table_name} table...")
                    db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {col_def}"))
                    db.commit()
                    print(f"Column {column_name} added successfully to {table_name} table.")
            except Exception as ex:
                db.rollback()
                err_msg = str(ex).lower()
                if "already exists" in err_msg or "duplicate column" in err_msg or "duplicate key" in err_msg:
                    pass
                else:
                    print(f"Skip {table_name}.{column_name}: {ex}")

        def safe_execute(sql, description=""):
            try:
                db.execute(text(sql))
                db.commit()
                if description:
                    print(description)
            except Exception as ex:
                db.rollback()
                err_msg = str(ex).lower()
                if description:
                    if "already exists" in err_msg or "duplicate" in err_msg:
                        print(f"Skip ({description}): already exists")
                    else:
                        print(f"Skip ({description}): {ex}")

        def constraint_exists(constraint_name):
            try:
                if db_dialect == 'postgresql':
                    row = db.execute(
                        text("SELECT 1 FROM pg_constraint WHERE conname = :name"),
                        {"name": constraint_name},
                    ).fetchone()
                    return row is not None
                if db_dialect == 'sqlite':
                    idx = db.execute(text("PRAGMA index_list(users)")).fetchall()
                    return any(r[1] == constraint_name for r in idx if len(r) > 1)
            except Exception:
                db.rollback()
            return False

        # Sync existing tables — add institution_id
        for tbl in ['users', 'student', 'subjects', 'schedules', 'attendence', 'audit_logs', 'system_settings', 'feedbacks', 'calendar_events', 'attendance_disputes', 'low_confidence_reviews', 'attendance_devices', 'device_heartbeat_logs', 'face_enrollment_samples', 're_enrollment_requests', 'attendance_interventions', 'attendance_fallback_sessions', 'lms_integration_configs', 'lms_sync_job_logs', 'staff_attendance', 'staff_payroll_records']:
            safe_add_column(tbl, 'institution_id', 'INT NULL')

        # Student table columns
        safe_add_column('student', 'password_hash', 'VARCHAR(255) NULL')
        safe_add_column('student', 'face_embedding', 'TEXT NULL')

        # Attendance table columns
        safe_add_column('attendence', 'subject_id', 'INT NULL')
        safe_add_column('attendence', 'verification_method', "VARCHAR(30) DEFAULT 'FACE_SCAN'")
        safe_add_column('attendence', 'fallback_reason', 'VARCHAR(255) NULL')
        safe_add_column('attendence', 'session_key', 'VARCHAR(255) NULL')

        # Phase 1B: Backfill session_key & Deduplicate legacy rows
        try:
            from app import models
            from app.period_utils import generate_session_key
            all_attendance = db.query(models.AttendanceModel).all()
            key_groups = {}
            for rec in all_attendance:
                s_key = generate_session_key(rec.institution_id, rec.id, rec.date, rec.time, rec.subject_id)
                if not rec.session_key or rec.session_key != s_key:
                    rec.session_key = s_key
                key_groups.setdefault(s_key, []).append(rec)
            db.commit()

            # Stage C: Clean up legacy duplicate rows if any exist
            deleted_dups_count = 0
            for s_key, rec_list in key_groups.items():
                if len(rec_list) > 1:
                    rec_list.sort(key=lambda r: (r.date or "", r.time or ""))
                    for dup_rec in rec_list[1:]:
                        db.delete(dup_rec)
                        deleted_dups_count += 1
            if deleted_dups_count > 0:
                db.commit()
                print(f"Phase 1B Migration: Cleaned up {deleted_dups_count} duplicate legacy attendance rows.")
        except Exception as bfk_err:
            db.rollback()
            print("Phase 1B Backfill warning:", bfk_err)

        # Feedbacks table columns
        safe_add_column('feedbacks', 'user_id', 'INT NULL')

        # Institution branding columns
        safe_add_column('institutions', 'logo_url', 'VARCHAR(255) NULL')
        safe_add_column('institutions', 'primary_color', 'VARCHAR(50) NULL')
        safe_add_column('institutions', 'secondary_color', 'VARCHAR(50) NULL')
        safe_add_column('institutions', 'master_key', 'VARCHAR(100) NULL')

        # Leave requests table columns
        safe_add_column('leave_requests', 'user_email', 'VARCHAR(100) NULL')
        safe_add_column('leave_requests', 'applicant_name', 'VARCHAR(100) NULL')
        safe_add_column('leave_requests', 'role', "VARCHAR(30) DEFAULT 'student'")
        safe_add_column('leave_requests', 'subject_id', 'INT NULL')
        safe_add_column('leave_requests', 'reviewed_by', 'INT NULL')
        safe_add_column('leave_requests', 'approved_by', 'VARCHAR(100) NULL')
        safe_add_column('leave_requests', 'substitute_assigned', 'VARCHAR(100) NULL')
        safe_add_column('leave_requests', 'document_url', 'VARCHAR(255) NULL')
        safe_add_column('leave_requests', 'reviewed_at', 'DATETIME NULL')

        # Detect database dialect to run correct SQL syntax
        db_dialect = engine.dialect.name
        print(f"Database dialect: {db_dialect}")

        # Attendance disputes session_time column expansion
        if db_dialect == 'postgresql':
            safe_execute("ALTER TABLE attendance_disputes ALTER COLUMN session_time TYPE VARCHAR(100)", "Expanded session_time to VARCHAR(100)")
            safe_execute("ALTER TABLE attendance_disputes ALTER COLUMN date TYPE VARCHAR(50)", "Expanded date to VARCHAR(50)")
        elif db_dialect == 'mysql':
            safe_execute("ALTER TABLE attendance_disputes MODIFY session_time VARCHAR(100)", "Expanded session_time to VARCHAR(100)")
            safe_execute("ALTER TABLE attendance_disputes MODIFY date VARCHAR(50)", "Expanded date to VARCHAR(50)")

        # Update unique index constraints on users table for multi-tenancy
        if db_dialect == 'mysql':
            safe_execute("ALTER TABLE users DROP INDEX ix_users_email", "Dropped ix_users_email index")
            safe_execute("ALTER TABLE users DROP INDEX email", "Dropped email index")
            safe_execute(
                "ALTER TABLE users ADD UNIQUE KEY uq_institution_email (institution_id, email)",
                "Added composite unique key"
            )
        else:
            safe_execute("DROP INDEX IF EXISTS ix_users_email", "Dropped ix_users_email index")
            safe_execute("DROP INDEX IF EXISTS email", "Dropped email index")
            if not constraint_exists("uq_institution_email"):
                safe_execute(
                    "ALTER TABLE users ADD CONSTRAINT uq_institution_email UNIQUE (institution_id, email)",
                    "Added composite unique constraint"
                )
            else:
                print("Constraint uq_institution_email already exists — skipped.")

        # --- Advanced feature columns (idempotent migrations) ---
        safe_add_column('system_settings', 'latest_version', 'VARCHAR(50) NULL')
        safe_add_column('system_settings', 'update_download_url', 'TEXT NULL')
        safe_add_column('system_settings', 'update_active', 'BOOLEAN DEFAULT FALSE')
        safe_add_column('system_settings', 'update_beta_active', 'BOOLEAN DEFAULT FALSE')
        safe_add_column('system_settings', 'build_status', 'VARCHAR(50) NULL')
        safe_add_column('system_settings', 'build_version', 'VARCHAR(50) NULL')
        safe_add_column('system_settings', 'build_error', 'TEXT NULL')
        safe_add_column('system_settings', 'update_rollout', "VARCHAR(30) DEFAULT 'public'")
        safe_add_column('system_settings', 'owner_preview_version', 'VARCHAR(50) NULL')
        safe_add_column('system_settings', 'owner_preview_download_url', 'TEXT NULL')
        safe_add_column('users', 'premium_access', 'BOOLEAN DEFAULT FALSE')
        safe_add_column('institutions', 'app_name', 'VARCHAR(100) NULL')
        safe_add_column('institutions', 'custom_domain', 'VARCHAR(200) NULL')
        safe_add_column('institutions', 'faq_json', 'TEXT NULL')
        safe_add_column('institutions', 'subscription_plan', "VARCHAR(50) DEFAULT 'free'")
        safe_add_column('institutions', 'subscription_status', "VARCHAR(50) DEFAULT 'active'")
        safe_add_column('institutions', 'razorpay_key_id', 'VARCHAR(100) NULL')
        safe_add_column('institutions', 'student_limit', 'INT DEFAULT 500')
        safe_add_column('users', 'department', 'VARCHAR(100) NULL')
        safe_add_column('users', 'is_department_head', 'BOOLEAN DEFAULT FALSE')

        # Audit logs production columns
        safe_add_column('audit_logs', 'role', 'VARCHAR(50) NULL')
        safe_add_column('audit_logs', 'entity_type', 'VARCHAR(50) NULL')
        safe_add_column('audit_logs', 'entity_id', 'VARCHAR(100) NULL')
        safe_add_column('audit_logs', 'previous_value', 'TEXT NULL')
        safe_add_column('audit_logs', 'new_value', 'TEXT NULL')
        safe_add_column('audit_logs', 'reason', 'TEXT NULL')
        safe_add_column('audit_logs', 'ip_address', 'VARCHAR(45) NULL')

        # System settings policy & security columns
        safe_add_column('system_settings', 'liveness_strict_mode', 'BOOLEAN DEFAULT FALSE')
        safe_add_column('system_settings', 'dispute_window_hours', 'INT DEFAULT 72')
        safe_add_column('system_settings', 'dispute_require_hod_approval', 'BOOLEAN DEFAULT FALSE')
        safe_add_column('system_settings', 'exam_attendance_policy', "VARCHAR(30) DEFAULT 'count'")
        safe_add_column('system_settings', 'min_attendance_threshold', 'FLOAT DEFAULT 75.0')
        safe_add_column('system_settings', 'warning_threshold', 'FLOAT DEFAULT 75.0')
        safe_add_column('system_settings', 'critical_threshold', 'FLOAT DEFAULT 70.0')
        safe_add_column('system_settings', 'intervention_threshold', 'FLOAT DEFAULT 60.0')
        safe_add_column('system_settings', 'device_offline_timeout_minutes', 'INT DEFAULT 5')

        # Ensure geofencing_enabled is False by default for all institutions (only active when manually enabled)
        safe_execute("UPDATE system_settings SET geofencing_enabled = FALSE WHERE geofencing_enabled IS NOT FALSE", "Ensured geofencing_enabled is OFF by default")
        safe_add_column('users', 'sso_provider', 'VARCHAR(50) NULL')
        safe_add_column('users', 'sso_subject', 'VARCHAR(200) NULL')
        safe_add_column('student', 'face_enrolled_at', 'TIMESTAMP NULL')
        safe_add_column('student', 'parent_name', 'VARCHAR(100) NULL')
        safe_add_column('student', 'parent_email', 'VARCHAR(100) NULL')
        safe_add_column('student', 'parent_phone', 'VARCHAR(45) NULL')
        safe_add_column('student', 'consent_given', 'BOOLEAN DEFAULT FALSE')
        safe_add_column('student', 'consent_at', 'TIMESTAMP NULL')

        # --- leave_requests schema updates ---
        safe_add_column('leave_requests', 'leave_type', "VARCHAR(50) DEFAULT 'Medical'")
        safe_add_column('leave_requests', 'reviewed_by', 'INT NULL')
        safe_add_column('leave_requests', 'reviewed_at', 'TIMESTAMP NULL')
        safe_add_column('leave_requests', 'subject_id', 'INT NULL')

        # Convert start_date and end_date to VARCHAR(50) if they were created as DateTime
        try:
            if db_dialect == 'postgresql':
                safe_execute("ALTER TABLE leave_requests ALTER COLUMN start_date TYPE VARCHAR(50)", "Altered start_date type to VARCHAR")
                safe_execute("ALTER TABLE leave_requests ALTER COLUMN end_date TYPE VARCHAR(50)", "Altered end_date type to VARCHAR")
            elif db_dialect == 'mysql':
                safe_execute("ALTER TABLE leave_requests MODIFY COLUMN start_date VARCHAR(50) NOT NULL", "Altered start_date type to VARCHAR")
                safe_execute("ALTER TABLE leave_requests MODIFY COLUMN end_date VARCHAR(50) NOT NULL", "Altered end_date type to VARCHAR")
        except Exception as e:
            print("Skipped start_date/end_date column type modification:", e)

        # Emotion Detection
        safe_add_column('attendence', 'emotion', "VARCHAR(30) NULL")
        safe_add_column('attendence', 'emotion_confidence', "FLOAT NULL")

        # Wellness Score
        safe_add_column('student', 'wellness_score', "FLOAT DEFAULT 100.0")
        safe_add_column('student', 'wellness_updated_at', "TIMESTAMP NULL")

        # Gamification
        safe_add_column('student', 'attendance_points', "INT DEFAULT 0")
        safe_add_column('student', 'streak_days', "INT DEFAULT 0")
        safe_add_column('student', 'longest_streak', "INT DEFAULT 0")
        safe_add_column('student', 'last_present_date', "VARCHAR(20) NULL")
        safe_add_column('student', 'badges_json', "TEXT NULL")

        # Age estimation
        safe_add_column('student', 'estimated_age', "INT NULL")

        # MFA
        safe_add_column('users', 'mfa_enabled', "BOOLEAN DEFAULT FALSE")
        safe_add_column('users', 'mfa_secret', "VARCHAR(64) NULL")
        safe_add_column('users', 'mfa_backup_codes', "TEXT NULL")

        # Staff face attendance
        safe_add_column('users', 'face_embedding', "TEXT NULL")
        safe_add_column('users', 'face_enrolled_at', "TIMESTAMP NULL")

        # Multi-campus
        safe_add_column('institutions', 'parent_institution_id', "INT NULL")
        safe_add_column('institutions', 'campus_name', "VARCHAR(100) NULL")
        safe_add_column('institutions', 'campus_address', "VARCHAR(255) NULL")
        
        # Wellness checkin resolution tracking
        safe_add_column('wellness_checkins', 'resolved', "BOOLEAN DEFAULT FALSE")
        safe_add_column('wellness_checkins', 'counselor_notes', "TEXT NULL")
        safe_add_column('wellness_checkins', 'resolved_at', "TIMESTAMP NULL")
        safe_add_column('wellness_checkins', 'resolved_by', "VARCHAR(100) NULL")

        # Create new tables for advanced features
        Base.metadata.create_all(bind=engine)

        # Stage D & E: Unique Index idx_attendence_session_key Creation & Verification
        if db_dialect == 'mysql':
            try:
                idx_rows = db.execute(text("SHOW INDEX FROM attendence WHERE Key_name = 'idx_attendence_session_key'")).fetchall()
                if not idx_rows:
                    db.execute(text("CREATE UNIQUE INDEX idx_attendence_session_key ON attendence (session_key)"))
                    db.commit()
                    print("Created unique index idx_attendence_session_key on attendence table (MySQL)")
            except Exception as my_ex:
                db.rollback()
                print(f"MySQL index creation notice: {my_ex}")
        else:
            safe_execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_attendence_session_key ON attendence (session_key)", "Created unique index idx_attendence_session_key")

        # Stage E: Verify UNIQUE Index Existence
        index_verified = False
        try:
            insp = inspect(engine)
            indexes = [idx['name'] for idx in insp.get_indexes('attendence')]
            index_verified = 'idx_attendence_session_key' in indexes
            if not index_verified:
                if db_dialect == 'sqlite':
                    idx_check = db.execute(text("PRAGMA index_list(attendence)")).fetchall()
                    index_verified = any(row[1] == 'idx_attendence_session_key' for row in idx_check)
                elif db_dialect == 'postgresql':
                    idx_check = db.execute(text("SELECT 1 FROM pg_indexes WHERE indexname = 'idx_attendence_session_key'")).fetchone()
                    index_verified = idx_check is not None
                elif db_dialect == 'mysql':
                    idx_check = db.execute(text("SHOW INDEX FROM attendence WHERE Key_name = 'idx_attendence_session_key'")).fetchone()
                    index_verified = idx_check is not None
        except Exception as v_err:
            db.rollback()
            print(f"Notice during index verification: {v_err}")

        if index_verified:
            print("Phase 1B Migration Verified: UNIQUE index 'idx_attendence_session_key' is active on table 'attendence'.")
        else:
            print("Warning: UNIQUE index 'idx_attendence_session_key' creation could not be verified automatically.")

        # Phase 2B: QR Replay Prevention & Fallback Claims Migration & Cleanup
        try:
            from app import models
            # Expand verification_method column size to 50 if needed
            if db_dialect == 'postgresql':
                safe_execute("ALTER TABLE attendence ALTER COLUMN verification_method TYPE VARCHAR(50)", "Expanded verification_method to VARCHAR(50)")
            elif db_dialect == 'mysql':
                safe_execute("ALTER TABLE attendence MODIFY verification_method VARCHAR(50)", "Expanded verification_method to VARCHAR(50)")

            # Create Phase 2B tables if not present
            models.ConsumedQrToken.__table__.create(bind=engine, checkfirst=True)
            models.AttendanceFallbackClaim.__table__.create(bind=engine, checkfirst=True)

            # Ensure unique constraints/indexes
            if db_dialect == 'mysql':
                safe_execute(
                    "ALTER TABLE used_qr_tokens ADD UNIQUE KEY _institution_qr_jti_uc (institution_id, jti)",
                    "Added composite unique key _institution_qr_jti_uc"
                )
                safe_execute(
                    "ALTER TABLE attendance_fallback_claims ADD UNIQUE KEY _session_student_claim_uc (session_id, student_id)",
                    "Added composite unique key _session_student_claim_uc"
                )
            else:
                safe_execute("CREATE UNIQUE INDEX IF NOT EXISTS _institution_qr_jti_uc ON used_qr_tokens (institution_id, jti)", "Created unique index _institution_qr_jti_uc")
                safe_execute("CREATE UNIQUE INDEX IF NOT EXISTS _session_student_claim_uc ON attendance_fallback_claims (session_id, student_id)", "Created unique index _session_student_claim_uc")

            # Purge expired consumed QR records older than ~1 hour
            from datetime import datetime, timezone, timedelta
            one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
            deleted_tokens = db.query(models.ConsumedQrToken).filter(
                models.ConsumedQrToken.expires_at < one_hour_ago
            ).delete(synchronize_session=False)
            if deleted_tokens > 0:
                db.commit()
                print(f"Phase 2B Cleanup: Purged {deleted_tokens} expired consumed QR records older than 1 hour.")
        except Exception as p2b_mig_err:
            db.rollback()
            print("Phase 2B migration/cleanup notice:", p2b_mig_err)
    except Exception as e:
        db.rollback()
        print("Schema update check failed:", e)
    finally:
        db.close()


def migrate_multi_tenant_seed(db: Session):
    """Seed initial institutions and ensure foreign keys for multi-tenancy are populated."""
    from app import models
    # 1. Check if default institution exists, create if not
    try:
        default_inst = db.query(models.Institution).filter(models.Institution.id == 1).first()
        if not default_inst:
            print("Migration: Creating Default Institution (ID: 1)...")
            default_inst = models.Institution(
                id=1,
                name="Default Institution",
                slug="default",
                primary_color="#4F46E5",
                secondary_color="#06B6D4",
                logo_url="",
                master_key="master"
            )
            db.add(default_inst)
            db.commit()
            print("Migration: Default Institution created.")
        else:
            updated = False
            if not default_inst.primary_color:
                default_inst.primary_color = "#4F46E5"
                updated = True
            if not default_inst.secondary_color:
                default_inst.secondary_color = "#06B6D4"
                updated = True
            if not default_inst.master_key:
                default_inst.master_key = "master"
                updated = True
            if updated:
                db.commit()
    except Exception as inst_err:
        db.rollback()
        print(f"Migration: Error checking/creating default institution: {inst_err}")

    # Create additional institutions for testing subdomain layout routing
    try:
        du_inst = db.query(models.Institution).filter(models.Institution.slug == "du").first()
        if not du_inst:
            print("Migration: Creating DU Institution (ID: 2)...")
            du_inst = models.Institution(
                id=2,
                name="Delhi University",
                slug="du",
                primary_color="#800020",
                secondary_color="#DAA520",
                logo_url=""
            )
            db.add(du_inst)
            db.commit()
            print("Migration: DU Institution created.")
    except Exception as du_err:
        db.rollback()
        print(f"Migration: Error checking/creating DU institution: {du_err}")

    try:
        iitd_inst = db.query(models.Institution).filter(models.Institution.slug == "iitd").first()
        if not iitd_inst:
            print("Migration: Creating IIT Delhi Institution (ID: 3)...")
            iitd_inst = models.Institution(
                id=3,
                name="IIT Delhi",
                slug="iitd",
                primary_color="#0D9488",
                secondary_color="#F59E0B",
                logo_url=""
            )
            db.add(iitd_inst)
            db.commit()
            print("Migration: IIT Delhi Institution created.")
    except Exception as iitd_err:
        db.rollback()
        print(f"Migration: Error checking/creating IITD institution: {iitd_err}")

    # 2. Back-fill null institution_ids
    tables_to_migrate = [
        ('users', models.User),
        ('student', models.StudentModel),
        ('subjects', models.Subject),
        ('schedules', models.Schedule),
        ('attendence', models.AttendanceModel),
        ('audit_logs', models.AuditLog),
        ('system_settings', models.SystemSettings),
        ('feedbacks', models.Feedback)
    ]

    for table_name, model_class in tables_to_migrate:
        try:
            null_items_count = db.query(model_class).filter(model_class.institution_id == None).count()
            if null_items_count > 0:
                print(f"Migration: Scoped {null_items_count} record(s) in {table_name} to Default Institution.")
                db.query(model_class).filter(model_class.institution_id == None).update(
                    {model_class.institution_id: 1}, synchronize_session=False
                )
                db.commit()
        except Exception as e:
            db.rollback()
            print(f"Migration error for table {table_name}: {e}")


def migrate_existing_student_embeddings(db: Session):
    """Scan and migrate legacy face embeddings from the data directory into encrypted DB storage."""
    import json
    from app import models
    from app.face_utils import get_face_embedding
    import cv2

    core_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.dirname(core_dir)
    backend_dir = os.path.dirname(app_dir)
    root_dir = os.path.dirname(backend_dir)
    data_dir = os.path.join(root_dir, "data")

    try:
        db.query(models.StudentModel).filter(models.StudentModel.face_embedding == 'None').update(
            {models.StudentModel.face_embedding: None}, synchronize_session=False
        )
        db.commit()
    except Exception as cleanup_err:
        print(f"Migration: Error cleaning up 'None' strings: {cleanup_err}")

    if not os.path.exists(data_dir):
        print(f"Migration: Data directory not found at {data_dir}. Skipping.")
        return

    try:
        students_to_migrate = db.query(models.StudentModel).filter(
            (models.StudentModel.face_embedding == None) | (models.StudentModel.face_embedding == "")
        ).all()

        if not students_to_migrate:
            print("Migration: No students found with missing face embeddings.")
            return

        print(f"Migration: Found {len(students_to_migrate)} students with missing face embeddings. Scanning data directory...")
        migrated_count = 0

        for student in students_to_migrate:
            for file_name in os.listdir(data_dir):
                if file_name.startswith(f"user.{student.id}.") and file_name.endswith(".jpg"):
                    file_path = os.path.join(data_dir, file_name)
                    img = cv2.imread(file_path)
                    if img is not None:
                        emb = get_face_embedding(img)
                        if emb is not None:
                            from app.encryption_service import encrypt_embedding
                            student.face_embedding = encrypt_embedding(json.dumps(emb.tolist()))
                            student.photo = "yes"
                            db.commit()
                            migrated_count += 1
                            print(f"Migration: Successfully generated SFace embedding for student {student.id} using {file_name}")
                            break
        print(f"Migration: Successfully migrated {migrated_count} student(s) face embeddings.")
    except Exception as e:
        db.rollback()
        print(f"Migration: Error migrating embeddings: {e}")


def ensure_primary_admin(db: Session):
    """Ensure the primary admin account and test students exist for multi-tenancy testing."""
    from app.crud import get_user_by_email, create_user
    from app.schemas import UserCreate
    from app.security import get_password_hash
    from app import models

    primary_email = "rajkishorock@gmail.com"
    primary_password = "raj@9211"

    institutions_admin = [
        {"id": 1, "name": "Raj Kishor"},
        {"id": 2, "name": "Raj Kishor (DU Admin)"},
        {"id": 3, "name": "Raj Kishor (IITD Admin)"}
    ]

    for inst_admin in institutions_admin:
        inst_id = inst_admin["id"]
        admin_name = inst_admin["name"]

        try:
            inst_exists = db.query(models.Institution).filter(models.Institution.id == inst_id).first()
            if not inst_exists:
                continue

            admin = get_user_by_email(db, email=primary_email, institution_id=inst_id)
            if not admin:
                create_user(
                    db,
                    user=UserCreate(
                        email=primary_email,
                        name=admin_name,
                        password=primary_password,
                        role="admin",
                    ),
                    institution_id=inst_id
                )
                print(f"Primary admin account created for institution {inst_id}.")
            else:
                admin.password_hash = get_password_hash(primary_password)
                admin.name = admin_name
                admin.role = "admin"
                admin.is_active = True
                db.commit()
                print(f"Primary admin account synced for institution {inst_id}.")
        except Exception as admin_err:
            db.rollback()
            print(f"Error seeding admin for institution {inst_id}: {admin_err}")

    test_students = [
        {
            "id": 10001,
            "name": "Default Student",
            "roll": "student123",
            "email": "student@face.com",
            "inst_id": 1,
            "dep": "CSE(IOT)",
            "course": "B.Tech"
        },
        {
            "id": 20001,
            "name": "DU Student (Rahul Kumar)",
            "roll": "du123",
            "email": "student_du@face.com",
            "inst_id": 2,
            "dep": "Physics",
            "course": "B.Sc"
        },
        {
            "id": 30001,
            "name": "IIT Delhi Student (Aditya Birla)",
            "roll": "iitd123",
            "email": "student_iitd@face.com",
            "inst_id": 3,
            "dep": "Computer Science",
            "course": "B.Tech"
        }
    ]

    for s_info in test_students:
        inst_id = s_info["inst_id"]
        try:
            inst_exists = db.query(models.Institution).filter(models.Institution.id == inst_id).first()
            if not inst_exists:
                continue

            s_exists = db.query(models.StudentModel).filter(
                models.StudentModel.email == s_info["email"],
                models.StudentModel.institution_id == inst_id
            ).first()

            if not s_exists:
                new_s = models.StudentModel(
                    id=s_info["id"],
                    name=s_info["name"],
                    roll=s_info["roll"],
                    dep=s_info["dep"],
                    course=s_info["course"],
                    year="2026",
                    semester="1st",
                    email=s_info["email"],
                    password_hash=get_password_hash("student123"),
                    photo="no",
                    institution_id=inst_id
                )
                db.add(new_s)
                db.commit()
                print(f"Test student '{s_info['name']}' seeded for institution {inst_id}.")
        except Exception as student_err:
            db.rollback()
            print(f"Error seeding student '{s_info['name']}': {student_err}")


def _background_startup_init():
    """Background startup task executed on normal application launch."""
    try:
        create_db_and_tables()
        update_schema()
    except Exception as db_err:
        print("Warning: background db/schema init error:", db_err)

    try:
        from app.face_utils import download_onnx_models
        download_onnx_models()
        from app.recognition_service import recognition_service
        recognition_service.warmup()
    except Exception as e:
        print("Error initializing/warming up ONNX models at startup:", e)

    from app.database import SessionLocal
    from app.crud import get_user_by_email, create_user, get_system_settings
    from app.schemas import UserCreate
    from app import models
    db = SessionLocal()
    try:
        from app.disputes import sync_all_approved_disputes
        sync_all_approved_disputes(db)
    except Exception as disp_err:
        print("Dispute startup sync notice:", disp_err)

    try:
        migrate_multi_tenant_seed(db)
        if SEED_DEFAULT_USERS:
            admin_email = "admin@face.com"
            db_user = get_user_by_email(db, email=admin_email, institution_id=1)
            if not db_user:
                print("Seeding default admin user...")
                create_user(
                    db,
                    user=UserCreate(
                        email=admin_email,
                        name="System Admin",
                        password="admin123",
                        role="admin"
                    ),
                    institution_id=1
                )
                print("Default admin user created.")

            teacher_email = "teacher@face.com"
            db_teacher = get_user_by_email(db, email=teacher_email, institution_id=1)
            if not db_teacher:
                print("Seeding default teacher user...")
                create_user(
                    db,
                    user=UserCreate(
                        email=teacher_email,
                        name="Default Teacher",
                        password="teacher123",
                        role="teacher"
                    ),
                    institution_id=1
                )
                print("Default teacher user created.")

            student_email = "student@face.com"
            db_student = db.query(models.StudentModel).filter(models.StudentModel.email == student_email, models.StudentModel.institution_id == 1).first()
            if not db_student:
                print("Seeding default student...")
                from app.security import get_password_hash
                new_s = models.StudentModel(
                    id=10001,
                    name="Default Student",
                    roll="student123",
                    dep="CSE(IOT)",
                    course="B.Tech",
                    year="2026",
                    semester="1st",
                    email=student_email,
                    password_hash=get_password_hash("student123"),
                    photo="no",
                    institution_id=1
                )
                db.add(new_s)
                db.commit()
                print("Default student created.")
        else:
            print("Default user seeding skipped (SEED_DEFAULT_USERS=false).")

        ensure_primary_admin(db)
        get_system_settings(db)
        migrate_existing_student_embeddings(db)

        from app import scheduler
        scheduler.start()
    except Exception as e:
        print("Error during background initialization:", e)
    finally:
        db.close()


def on_startup():
    """Startup event handler."""
    if DATABASE_URL and DATABASE_URL.startswith("sqlite") and ENV != "development":
        print("=" * 80)
        print(" WARNING: SQLite is being used in a non-development environment! ".center(80, "*"))
        print(" All data will be WIPED when this container restarts (ephemeral disk)! ".center(80, "*"))
        print(" Please configure a persistent cloud database via DATABASE_URL. ".center(80, "*"))
        print("=" * 80)

    # CRITICAL: Do NOT run the background initialization thread during automated tests.
    if is_testing():
        print("Test environment detected; skipping background startup initialization thread.")
        return

    threading.Thread(target=_background_startup_init, daemon=True).start()
    print("Application startup initiated in background thread. Listening for HTTP traffic immediately.")


def on_shutdown():
    """Shutdown event handler."""
    from app import scheduler
    try:
        scheduler.shutdown()
    except Exception as e:
        print("Error during scheduler shutdown:", e)


def setup_lifecycle_handlers(app):
    """Register startup and shutdown lifecycle events on the FastAPI app."""
    app.add_event_handler("startup", on_startup)
    app.add_event_handler("shutdown", on_shutdown)
