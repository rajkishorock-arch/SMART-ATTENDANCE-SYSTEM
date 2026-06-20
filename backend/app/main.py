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
    except Exception as e:
        print("Schema update check failed:", e)
    finally:
        db.close()


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
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
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
    """Ensure the primary admin account exists with configured credentials."""
    from app.crud import get_user_by_email, create_user
    from app.schemas import UserCreate
    from app.security import get_password_hash

    primary_email = "rajkishorock@gmail.com"
    primary_password = "raj@9211"
    primary_name = "Raj Kishor"

    admin = get_user_by_email(db, email=primary_email)
    if not admin:
        create_user(
            db,
            user=UserCreate(
                email=primary_email,
                name=primary_name,
                password=primary_password,
                role="admin",
            ),
        )
        print("Primary admin account created.")
    else:
        admin.password_hash = get_password_hash(primary_password)
        admin.name = primary_name
        admin.role = "admin"
        admin.is_active = True
        db.commit()
        print("Primary admin account synced.")


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
        if SEED_DEFAULT_USERS:
            admin_email = "admin@face.com"
            db_user = get_user_by_email(db, email=admin_email)
            if not db_user:
                print("Seeding default admin user...")
                create_user(
                    db,
                    user=UserCreate(
                        email=admin_email,
                        name="System Admin",
                        password="admin123",
                        role="admin"
                    )
                )
                print("Default admin user created.")

            teacher_email = "teacher@face.com"
            db_teacher = get_user_by_email(db, email=teacher_email)
            if not db_teacher:
                print("Seeding default teacher user...")
                create_user(
                    db,
                    user=UserCreate(
                        email=teacher_email,
                        name="Default Teacher",
                        password="teacher123",
                        role="teacher"
                    )
                )
                print("Default teacher user created.")

            student_email = "student@face.com"
            db_student = db.query(models.StudentModel).filter(models.StudentModel.email == student_email).first()
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
                    photo="no"
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