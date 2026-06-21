import sys
import os
import uvicorn
from fastapi import FastAPI

# Ensure the 'backend' directory is in sys.path so 'app' can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import engine, Base
from app.api import api_router

def create_db_and_tables():
    # This is for development only. For production, use Alembic migrations.
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created.")

def update_schema():
    from sqlalchemy import text, inspect
    from app.database import SessionLocal, engine
    db = SessionLocal()
    try:
        inspector = inspect(engine)
        
        # Helper to safely add institution_id column if missing
        def add_institution_id_if_missing(table_name):
            if table_name in inspector.get_table_names():
                columns = [col['name'] for col in inspector.get_columns(table_name)]
                if 'institution_id' not in columns:
                    print(f"Adding institution_id column to {table_name} table...")
                    db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN institution_id INT NULL"))
                    db.commit()
                    print(f"Column institution_id added successfully to {table_name} table.")
                else:
                    print(f"Column institution_id already exists in {table_name} table.")

        # Sync existing tables
        add_institution_id_if_missing('users')
        add_institution_id_if_missing('student')
        add_institution_id_if_missing('subjects')
        add_institution_id_if_missing('schedules')
        add_institution_id_if_missing('attendence')
        add_institution_id_if_missing('audit_logs')
        add_institution_id_if_missing('system_settings')
        add_institution_id_if_missing('feedbacks')

        # Check columns in student table
        student_columns = [col['name'] for col in inspector.get_columns('student')]
        if 'password_hash' not in student_columns:
            print("Adding password_hash column to student table...")
            db.execute(text("ALTER TABLE student ADD COLUMN password_hash VARCHAR(255) NULL"))
            db.commit()
            print("Column password_hash added successfully.")
        else:
            print("Column password_hash already exists in student table.")

        if 'face_embedding' not in student_columns:
            print("Adding face_embedding column to student table...")
            db.execute(text("ALTER TABLE student ADD COLUMN face_embedding TEXT NULL"))
            db.commit()
            print("Column face_embedding added successfully.")
        else:
            print("Column face_embedding already exists in student table.")

        # Check columns in attendence table
        attendance_columns = [col['name'] for col in inspector.get_columns('attendence')]
        if 'subject_id' not in attendance_columns:
            print("Adding subject_id column to attendence table...")
            db.execute(text("ALTER TABLE attendence ADD COLUMN subject_id INT NULL"))
            db.commit()
            print("Column subject_id added successfully.")
        else:
            print("Column subject_id already exists in attendence table.")

        # Check columns in feedbacks table
        if 'feedbacks' in inspector.get_table_names():
            feedback_columns = [col['name'] for col in inspector.get_columns('feedbacks')]
            if 'user_id' not in feedback_columns:
                print("Adding user_id column to feedbacks table...")
                db.execute(text("ALTER TABLE feedbacks ADD COLUMN user_id INT NULL"))
                db.commit()
                print("Column user_id added successfully to feedbacks table.")

        # Check branding columns in institutions table
        if 'institutions' in inspector.get_table_names():
            inst_columns = [col['name'] for col in inspector.get_columns('institutions')]
            if 'logo_url' not in inst_columns:
                print("Adding logo_url column to institutions table...")
                db.execute(text("ALTER TABLE institutions ADD COLUMN logo_url VARCHAR(255) NULL"))
                db.commit()
            if 'primary_color' not in inst_columns:
                print("Adding primary_color column to institutions table...")
                db.execute(text("ALTER TABLE institutions ADD COLUMN primary_color VARCHAR(50) NULL"))
                db.commit()
            if 'secondary_color' not in inst_columns:
                print("Adding secondary_color column to institutions table...")
                db.execute(text("ALTER TABLE institutions ADD COLUMN secondary_color VARCHAR(50) NULL"))
                db.commit()

        # Update unique index constraints on users table for multi-tenancy
        # Drop old single-column unique constraints/indexes on email
        # PostgreSQL / SQLite syntax
        try:
            db.execute(text("DROP INDEX ix_users_email"))
            db.commit()
            print("Dropped ix_users_email index (PostgreSQL/SQLite syntax)")
        except Exception:
            pass

        try:
            db.execute(text("DROP INDEX email"))
            db.commit()
            print("Dropped email index (PostgreSQL/SQLite syntax)")
        except Exception:
            pass

        # MySQL syntax
        try:
            db.execute(text("ALTER TABLE users DROP INDEX ix_users_email"))
            db.commit()
            print("Dropped ix_users_email index (MySQL syntax)")
        except Exception:
            pass

        try:
            db.execute(text("ALTER TABLE users DROP INDEX email"))
            db.commit()
            print("Dropped email index (MySQL syntax)")
        except Exception:
            pass

        # Add composite unique constraint for multi-tenancy (institution_id, email)
        # PostgreSQL syntax
        try:
            db.execute(text("ALTER TABLE users ADD CONSTRAINT uq_institution_email UNIQUE (institution_id, email)"))
            db.commit()
            print("Added composite unique constraint (PostgreSQL syntax)")
        except Exception:
            pass

        # MySQL syntax
        try:
            db.execute(text("ALTER TABLE users ADD UNIQUE KEY uq_institution_email (institution_id, email)"))
            db.commit()
            print("Added composite unique key (MySQL syntax)")
        except Exception:
            pass
    except Exception as e:
        print("Schema update check failed:", e)
    finally:
        db.close()


def migrate_multi_tenant_seed(db):
    from app import models
    # 1. Check if default institution exists, create if not
    default_inst = db.query(models.Institution).filter(models.Institution.id == 1).first()
    if not default_inst:
        print("Migration: Creating Default Institution (ID: 1)...")
        default_inst = models.Institution(
            id=1,
            name="Default Institution",
            slug="default",
            primary_color="#4F46E5",
            secondary_color="#06B6D4",
            logo_url=""
        )
        db.add(default_inst)
        db.commit()
        print("Migration: Default Institution created.")
    else:
        # Update default institution branding if it's unset
        updated = False
        if not default_inst.primary_color:
            default_inst.primary_color = "#4F46E5"
            updated = True
        if not default_inst.secondary_color:
            default_inst.secondary_color = "#06B6D4"
            updated = True
        if updated:
            db.commit()

    # Create additional institutions for testing subdomain layout routing
    du_inst = db.query(models.Institution).filter(models.Institution.slug == "du").first()
    if not du_inst:
        print("Migration: Creating DU Institution (ID: 2)...")
        du_inst = models.Institution(
            id=2,
            name="Delhi University",
            slug="du",
            primary_color="#800020",      # Maroon/Burgundy
            secondary_color="#DAA520",    # Goldenrod
            logo_url=""
        )
        db.add(du_inst)
        db.commit()
        print("Migration: DU Institution created.")

    iitd_inst = db.query(models.Institution).filter(models.Institution.slug == "iitd").first()
    if not iitd_inst:
        print("Migration: Creating IIT Delhi Institution (ID: 3)...")
        iitd_inst = models.Institution(
            id=3,
            name="IIT Delhi",
            slug="iitd",
            primary_color="#0D9488",      # Teal-600
            secondary_color="#F59E0B",    # Amber-500
            logo_url=""
        )
        db.add(iitd_inst)
        db.commit()
        print("Migration: IIT Delhi Institution created.")

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
            print(f"Migration error for table {table_name}: {e}")


from fastapi.middleware.cors import CORSMiddleware
from app.core.config import CORS_ORIGINS, validate_config, SEED_DEFAULT_USERS

validate_config()

app = FastAPI(
    title="AI-Powered Secure Face Recognition Attendance System",
    description="Industry Grade Face Recognition Attendance System with FastAPI backend.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://([^/]+\.)?smart-attendance-system-olive-ten\.vercel\.app|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Master-Password", "X-Tenant-Slug"],
)

def migrate_existing_student_embeddings(db):
    import json
    from app import models
    from app.face_utils import get_face_embedding
    import cv2
    
    app_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(app_dir)
    root_dir = os.path.dirname(backend_dir)
    data_dir = os.path.join(root_dir, "data")
    
    try:
        # First, clean up any literal 'None' strings to SQL NULL
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
        # Get all students without a face embedding
        students_to_migrate = db.query(models.StudentModel).filter(
            (models.StudentModel.face_embedding == None) | (models.StudentModel.face_embedding == "")
        ).all()
        
        if not students_to_migrate:
            print("Migration: No students found with missing face embeddings.")
            return
            
        print(f"Migration: Found {len(students_to_migrate)} students with missing face embeddings. Scanning data directory...")
        migrated_count = 0
        
        for student in students_to_migrate:
            # Look for any user.{student.id}.*.jpg files in data_dir
            for file_name in os.listdir(data_dir):
                if file_name.startswith(f"user.{student.id}.") and file_name.endswith(".jpg"):
                    file_path = os.path.join(data_dir, file_name)
                    img = cv2.imread(file_path)
                    if img is not None:
                        # Extract the embedding
                        emb = get_face_embedding(img)
                        if emb is not None:
                            student.face_embedding = json.dumps(emb.tolist())
                            student.photo = "yes"
                            db.commit()
                            migrated_count += 1
                            print(f"Migration: Successfully generated SFace embedding for student {student.id} using {file_name}")
                            break # Move to next student
        print(f"Migration: Successfully migrated {migrated_count} student(s) face embeddings.")
    except Exception as e:
        print(f"Migration: Error migrating embeddings: {e}")


def ensure_primary_admin(db):
    """Ensure the primary admin account and test students exist for multi-tenancy testing."""
    from app.crud import get_user_by_email, create_user
    from app.schemas import UserCreate
    from app.security import get_password_hash
    from app import models

    primary_email = "rajkishorock@gmail.com"
    primary_password = "raj@9211"
    
    # 1. Ensure primary admin exists for all 3 institutions (Default, DU, IITD)
    institutions_admin = [
        {"id": 1, "name": "Raj Kishor"},
        {"id": 2, "name": "Raj Kishor (DU Admin)"},
        {"id": 3, "name": "Raj Kishor (IITD Admin)"}
    ]
    
    for inst_admin in institutions_admin:
        inst_id = inst_admin["id"]
        admin_name = inst_admin["name"]
        
        # Check if institution actually exists before seeding
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

    # 2. Ensure distinct test students exist for each institution
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
        # Check if institution exists
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


@app.on_event("startup")
def on_startup():
    from app.core.config import ENV, DATABASE_URL
    if DATABASE_URL and DATABASE_URL.startswith("sqlite") and ENV != "development":
        print("=" * 80)
        print(" WARNING: SQLite is being used in a non-development environment! ".center(80, "*"))
        print(" All data will be WIPED when this container restarts (ephemeral disk)! ".center(80, "*"))
        print(" Please configure a persistent cloud database via DATABASE_URL. ".center(80, "*"))
        print("=" * 80)

    create_db_and_tables()
    update_schema()
    
    # Auto-download YuNet & SFace models
    try:
        from app.face_utils import download_onnx_models
        download_onnx_models()
    except Exception as e:
        print("Error downloading ONNX weights at startup:", e)
        
    from app.database import SessionLocal
    from app.crud import get_user_by_email, create_user, get_system_settings
    from app.schemas import UserCreate
    from app import models
    db = SessionLocal()
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
        print("Error seeding admin user/settings, migrating embeddings or starting scheduler:", e)
    finally:
        db.close()


@app.on_event("shutdown")
def on_shutdown():
    from app import scheduler
    try:
        scheduler.shutdown()
    except Exception as e:
        print("Error during scheduler shutdown:", e)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Face Recognition Attendance System API"}

app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)