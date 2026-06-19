import sys
import os

# Put backend in system path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app.database import SessionLocal, engine, Base
from app.crud import get_user_by_email, create_user
from app.schemas import UserCreate

def seed():
    print("Creating tables if they don't exist...")
    Base.metadata.create_all(bind=engine)
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
            print("Default admin user created successfully: admin@face.com / admin123")
        else:
            print("Admin user already exists.")
    except Exception as e:
        print("Error seeding admin:", e)
    finally:
        db.close()

if __name__ == "__main__":
    seed()
