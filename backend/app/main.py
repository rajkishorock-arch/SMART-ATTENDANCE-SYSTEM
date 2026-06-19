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
    from sqlalchemy import text
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        # Check if password_hash column exists in student table
        result = db.execute(text("SHOW COLUMNS FROM student LIKE 'password_hash'")).fetchone()
        if not result:
            print("Adding password_hash column to student table...")
            db.execute(text("ALTER TABLE student ADD COLUMN password_hash VARCHAR(255) NULL"))
            db.commit()
            print("Column password_hash added successfully.")
        else:
            print("Column password_hash already exists in student table.")

        # Check if face_embedding column exists in student table
        result_emb = db.execute(text("SHOW COLUMNS FROM student LIKE 'face_embedding'")).fetchone()
        if not result_emb:
            print("Adding face_embedding column to student table...")
            db.execute(text("ALTER TABLE student ADD COLUMN face_embedding TEXT NULL"))
            db.commit()
            print("Column face_embedding added successfully.")
        else:
            print("Column face_embedding already exists in student table.")

        # Check if subject_id column exists in attendence table
        result_sub = db.execute(text("SHOW COLUMNS FROM attendence LIKE 'subject_id'")).fetchone()
        if not result_sub:
            print("Adding subject_id column to attendence table...")
            db.execute(text("ALTER TABLE attendence ADD COLUMN subject_id INT NULL"))
            db.commit()
            print("Column subject_id added successfully.")
        else:
            print("Column subject_id already exists in attendence table.")
    except Exception as e:
        print("Schema update check failed or column already exists:", e)
    finally:
        db.close()


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AI-Powered Secure Face Recognition Attendance System",
    description="Industry Grade Face Recognition Attendance System with FastAPI backend.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    update_schema()
    
    # Auto-download YuNet & SFace models
    try:
        from app.face_utils import download_onnx_models
        download_onnx_models()
    except Exception as e:
        print("Error downloading ONNX weights at startup:", e)
        
    # Seed default admin user if not exists
    from app.database import SessionLocal
    from app.crud import get_user_by_email, create_user
    from app.schemas import UserCreate
    from app import models
    db = SessionLocal()
    try:
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
            print("Default admin user created: admin@face.com / admin123")
        
        # Seed default teacher user
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
            print("Default teacher user created: teacher@face.com / teacher123")

        # Seed default student
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
            print("Default student created: student@face.com / student123")

        # Seed default security settings
        from app.crud import get_system_settings
        get_system_settings(db)
        
        # Run SFace embedding migration for existing student photos
        migrate_existing_student_embeddings(db)
        
        # Start background reports scheduler
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