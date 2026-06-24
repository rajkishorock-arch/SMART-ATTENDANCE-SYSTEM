import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app.database import SessionLocal, engine
from app.models import StudentModel

def check_faces():
    db = SessionLocal()
    try:
        total = db.query(StudentModel).count()
        registered = db.query(StudentModel).filter(StudentModel.face_embedding != None).count()
        print(f"Total students in database: {total}")
        print(f"Students with registered face embeddings: {registered}")
        
        students = db.query(StudentModel).filter(StudentModel.face_embedding != None).all()
        for s in students:
            print(f"ID: {s.id}, Name: {s.name}, Roll: {s.roll}, Photo status: {s.photo}")
    except Exception as e:
        print("Error checking faces:", e)
    finally:
        db.close()

if __name__ == "__main__":
    check_faces()
