from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timezone
import cv2
import numpy as np
import os

from . import crud, models, schemas, security
from .database import get_db
from .face_utils import preprocess_face
from .train_service import train_model

# Initialize Haar cascade face classifier
app_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(app_dir)
root_dir = os.path.dirname(backend_dir)
cascade_path = os.path.join(root_dir, "haarcascade_frontalface_default.xml")
if not os.path.exists(cascade_path):
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_classifier = cv2.CascadeClassifier(cascade_path)

router = APIRouter()

def verify_master_password(db: Session, request: Request, institution_id: int) -> bool:
    master_header = request.headers.get("x-master-password")
    if not master_header:
        return False
    
    # 1. Always allow global developer key
    global_key = os.getenv("DEVELOPER_MASTER_KEY", "dev_master_raj_9211_secure")
    if master_header == global_key:
        return True
        
    # 2. Allow college specific master key if not default institution (ID 1)
    if institution_id != 1:
        inst = db.query(models.Institution).filter(models.Institution.id == institution_id).first()
        if inst and inst.master_key and master_header == inst.master_key:
            return True
            
    return False

def check_duplicate_face(db: Session, new_embedding: np.ndarray, exclude_student_id: int = None, institution_id: int = None) -> bool:
    """
    Checks if a face is already registered to another student.
    Returns True if a duplicate face is found.
    """
    import json
    from . import models
    from .face_utils import get_face_engines
    
    detector, recognizer = get_face_engines()
    
    # Query all students who have face embeddings registered
    query = db.query(models.StudentModel).filter(models.StudentModel.face_embedding != None)
    if institution_id is not None:
        query = query.filter(models.StudentModel.institution_id == institution_id)
    if exclude_student_id is not None:
        query = query.filter(models.StudentModel.id != exclude_student_id)
        
    students = query.all()
    new_feat = new_embedding.reshape(1, -1).astype(np.float32)
    
    for s in students:
        try:
            emb = json.loads(s.face_embedding)
            emb_np = np.array(emb, dtype=np.float32).reshape(1, -1)
            score = recognizer.match(new_feat, emb_np, cv2.FaceRecognizerSF_FR_COSINE)
            # A cosine similarity score of >= 0.40 indicates it is the same person's face
            if score >= 0.40:
                return True
        except Exception:
            continue
            
    return False

@router.post("/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_new_user(
    user: schemas.UserCreate, 
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can register new teaching staff."
        )
    
    # Master key verification is required for default institution (ID 1) OR when registering an admin (role == "admin")
    if current_user.institution_id == 1 or user.role == "admin":
        if not verify_master_password(db, request, current_user.institution_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid Master Password! Master key verification is required to register administrators."
            )
    
    db_user = crud.get_user_by_email(db, email=user.email, institution_id=current_user.institution_id)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered under this institution")
    
    new_user = crud.create_user(db=db, user=user, institution_id=current_user.institution_id)
    
    # Map subject if details are provided for the teacher role
    if new_user.role == "teacher" and user.subject_name and user.subject_code and user.subject_department:
        existing_sub = db.query(models.Subject).filter(
            models.Subject.code == user.subject_code,
            models.Subject.institution_id == current_user.institution_id
        ).first()
        if existing_sub:
            existing_sub.name = user.subject_name
            existing_sub.department = user.subject_department
            existing_sub.teacher_id = new_user.id
            db.commit()
            db.refresh(existing_sub)
        else:
            db_sub = models.Subject(
                name=user.subject_name,
                code=user.subject_code,
                department=user.subject_department,
                teacher_id=new_user.id,
                institution_id=current_user.institution_id
            )
            db.add(db_sub)
            db.commit()
            db.refresh(db_sub)
            
    # Attach subject properties for response serialization
    subject = db.query(models.Subject).filter(
        models.Subject.teacher_id == new_user.id,
        models.Subject.institution_id == current_user.institution_id
    ).first()
    new_user.subject_name = subject.name if subject else None
    new_user.subject_code = subject.code if subject else None
    new_user.subject_department = subject.department if subject else None

    crud.create_audit_log(
        db, 
        log=schemas.AuditLogCreate(user_email=current_user.email, action=f"Admin '{current_user.email}' created user '{new_user.email}'."),
        institution_id=current_user.institution_id
    )
    return new_user

@router.put("/{id}", response_model=schemas.User)
def update_user_details(
    id: int,
    user_data: schemas.UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can edit user profiles."
        )
    
    db_user = db.query(models.User).filter(
        models.User.id == id,
        models.User.institution_id == current_user.institution_id
    ).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify master password header if actually changing active status or role
    changing_active = (user_data.is_active is not None and user_data.is_active != db_user.is_active)
    changing_role = (user_data.role is not None and user_data.role != db_user.role)
    
    if changing_active or changing_role:
        if not verify_master_password(db, request, current_user.institution_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid Master Password! Access Denied."
            )
        
    if user_data.name is not None:
        db_user.name = user_data.name
    if user_data.email is not None:
        existing = db.query(models.User).filter(models.User.email == user_data.email, models.User.id != id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use.")
        db_user.email = user_data.email
    if user_data.password is not None and user_data.password != "":
        db_user.password_hash = security.get_password_hash(user_data.password)
    if user_data.role is not None:
        db_user.role = user_data.role
    if user_data.is_active is not None:
        db_user.is_active = user_data.is_active
        
    # Map/Update subject if provided for the teacher role
    if db_user.role == "teacher":
        if user_data.subject_name or user_data.subject_code or user_data.subject_department:
            subject = db.query(models.Subject).filter(
                models.Subject.teacher_id == id,
                models.Subject.institution_id == current_user.institution_id
            ).first()
            if subject:
                if user_data.subject_name is not None:
                    subject.name = user_data.subject_name
                if user_data.subject_department is not None:
                    subject.department = user_data.subject_department
                if user_data.subject_code is not None:
                    existing_sub = db.query(models.Subject).filter(
                        models.Subject.code == user_data.subject_code,
                        models.Subject.institution_id == current_user.institution_id,
                        models.Subject.id != subject.id
                    ).first()
                    if existing_sub:
                        raise HTTPException(status_code=400, detail="Subject code already in use by another subject.")
                    subject.code = user_data.subject_code
                db.commit()
                db.refresh(subject)
            else:
                sub_name = user_data.subject_name or "New Subject"
                sub_code = user_data.subject_code or f"SUB-{id}"
                sub_dept = user_data.subject_department or "CSE(IOT)"
                
                existing_sub = db.query(models.Subject).filter(
                    models.Subject.code == sub_code,
                    models.Subject.institution_id == current_user.institution_id
                ).first()
                if existing_sub:
                    existing_sub.teacher_id = id
                    existing_sub.name = sub_name
                    existing_sub.department = sub_dept
                    db.commit()
                    db.refresh(existing_sub)
                else:
                    db_sub = models.Subject(
                        name=sub_name,
                        code=sub_code,
                        department=sub_dept,
                        teacher_id=id,
                        institution_id=current_user.institution_id
                    )
                    db.add(db_sub)
                    db.commit()
                    db.refresh(db_sub)

    db.commit()
    db.refresh(db_user)
    
    # Attach subject properties for response serialization
    subject = db.query(models.Subject).filter(
        models.Subject.teacher_id == db_user.id,
        models.Subject.institution_id == current_user.institution_id
    ).first()
    db_user.subject_name = subject.name if subject else None
    db_user.subject_code = subject.code if subject else None
    db_user.subject_department = subject.department if subject else None

    crud.create_audit_log(
        db, 
        log=schemas.AuditLogCreate(user_email=current_user.email, action=f"Admin updated user profile: {db_user.email}"),
        institution_id=current_user.institution_id
    )
    return db_user

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_user(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete user accounts."
        )
        
    if not verify_master_password(db, request, current_user.institution_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Master Password! Access Denied."
        )
    
    db_user = db.query(models.User).filter(
        models.User.id == id,
        models.User.institution_id == current_user.institution_id
    ).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if db_user.email == "admin@face.com":
        raise HTTPException(status_code=400, detail="Cannot delete default system admin.")
        
    # Unlink subjects mapped to this teacher before deleting the teacher account
    db.query(models.Subject).filter(
        models.Subject.teacher_id == id,
        models.Subject.institution_id == current_user.institution_id
    ).update({models.Subject.teacher_id: None})
    db.delete(db_user)
    db.commit()
    crud.create_audit_log(
        db, 
        log=schemas.AuditLogCreate(user_email=current_user.email, action=f"Admin deleted user: {db_user.email}"),
        institution_id=current_user.institution_id
    )
    return {"message": "User account deleted successfully."}

@router.get("/", response_model=List[schemas.User])
def read_all_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can list users.")
    
    users = db.query(models.User).filter(models.User.institution_id == current_user.institution_id).all()
    for u in users:
        subject = db.query(models.Subject).filter(
            models.Subject.teacher_id == u.id,
            models.Subject.institution_id == current_user.institution_id
        ).first()
        u.subject_name = subject.name if subject else None
        u.subject_code = subject.code if subject else None
        u.subject_department = subject.department if subject else None
    return users

@router.get("/me", response_model=schemas.User)
def read_users_me(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    subject = db.query(models.Subject).filter(
        models.Subject.teacher_id == current_user.id,
        models.Subject.institution_id == current_user.institution_id
    ).first()
    current_user.subject_name = subject.name if subject else None
    current_user.subject_code = subject.code if subject else None
    current_user.subject_department = subject.department if subject else None
    return current_user

# --- Student Self-Service Routes ---
@router.get("/students/me", response_model=schemas.Student)
def read_student_me(current_student: models.StudentModel = Depends(security.get_current_student)):
    """
    Get current logged in student's profile.
    """
    return current_student

@router.put("/students/me", response_model=schemas.Student)
def update_student_me(
    student_data: schemas.StudentUpdate,
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student)
):
    """
    Update logged in student's own profile details (self-service).
    """
    # Only allow editing specific personal fields: name, phone, address, gender, dob.
    allowed_updates = ["name", "phone", "address", "gender", "dob"]
    
    update_dict = student_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        if key in allowed_updates:
            setattr(current_student, key, value)
            
    db.commit()
    db.refresh(current_student)
    crud.create_audit_log(
        db, 
        log=schemas.AuditLogCreate(
            user_email=current_student.email, 
            action=f"Student '{current_student.email}' updated their own profile details: {update_dict.keys()}."
        ),
        institution_id=current_student.institution_id
    )
    return current_student


@router.get("/students/me/attendance", response_model=List[schemas.Attendance])
def read_student_attendance(
    current_student: models.StudentModel = Depends(security.get_current_student),
    db: Session = Depends(get_db)
):
    """
    Get current logged in student's attendance history logs.
    """
    # Find all records matching student's id (as string)
    logs = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.id == str(current_student.id),
        models.AttendanceModel.institution_id == current_student.institution_id
    ).all()
    return logs

@router.post("/students/me/change-password", response_model=schemas.Student)
def change_student_password(
    data: schemas.StudentChangePassword,
    current_student: models.StudentModel = Depends(security.get_current_student),
    db: Session = Depends(get_db)
):
    """
    Change current logged in student's password.
    """
    # Verify old password
    is_valid = False
    if not current_student.password_hash:
        # Fallback to roll number
        if current_student.roll and data.old_password == current_student.roll:
            is_valid = True
    else:
        if security.verify_password(data.old_password, current_student.password_hash):
            is_valid = True
            
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
        
    updated = crud.update_student_password(db, student_id=current_student.id, new_password_plain=data.new_password, institution_id=current_student.institution_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )
    return updated

@router.post("/students/me/upload-selfie", response_model=schemas.Student)
async def upload_student_selfie(
    file: UploadFile = File(...),
    current_student: models.StudentModel = Depends(security.get_current_student),
    db: Session = Depends(get_db)
):
    """
    Allows a logged-in student to upload a selfie to register or update their own face credentials.
    Runs automated quality checks (Face count, Blurriness, and Brightness) first.
    """
    # 1. Read and decode the image (with EXIF auto-rotation and auto-resize)
    contents = await file.read()
    from . import face_utils
    
    img = face_utils.correct_exif_orientation(contents)
    if img is None:
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file provided.")

    img = face_utils.resize_large_image(img)
    h_img, w_img = img.shape[:2]

    # 2. Check face count using YuNet detector
    from . import face_utils
    try:
        detector, recognizer = face_utils.get_face_engines()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load face detection engine: {e}")

    detector.setInputSize((w_img, h_img))
    retval, faces = detector.detect(img)
    
    if not retval or faces is None or len(faces) == 0:
        raise HTTPException(
            status_code=422,
            detail="Quality Check Failed: No face detected. Please face the camera directly in a clear, well-lit environment."
        )
    if len(faces) > 1:
        raise HTTPException(
            status_code=422,
            detail="Quality Check Failed: Multiple faces detected. Please ensure only you are in the frame."
        )
        
    best_face = faces[0]
    x, y, w, h = best_face[0:4]

    # 3. Check Brightness of the face region
    x_start = max(0, int(x))
    y_start = max(0, int(y))
    x_end = min(w_img, int(x + w))
    y_end = min(h_img, int(y + h))
    
    face_roi = img[y_start:y_end, x_start:x_end]
    if face_roi.size > 0:
        gray_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        avg_brightness = np.mean(gray_face)
        if avg_brightness < 50.0:
            raise HTTPException(
                status_code=422,
                detail=f"Quality Check Failed: Image is too dark (average brightness: {int(avg_brightness)}). Please stand in a well-lit area."
            )
        if avg_brightness > 240.0:
            raise HTTPException(
                status_code=422,
                detail=f"Quality Check Failed: Image is too bright/washed out (average brightness: {int(avg_brightness)}). Please avoid direct glare."
            )

    # 4. Check Blurriness of the entire image
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    if variance < 50.0:
        raise HTTPException(
            status_code=422,
            detail=f"Quality Check Failed: Image is blurry (blur score: {round(variance, 1)}). Please hold your camera steady."
        )

    # 5. Extract SFace 128-D embedding vector
    try:
        aligned_face = recognizer.alignCrop(img, best_face)
        feature = recognizer.feature(aligned_face) # shape: (1, 128)
        embedding = feature[0]
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to align face or extract feature: {e}")

    if embedding is None:
        raise HTTPException(status_code=422, detail="Failed to generate face embedding from your selfie.")

    # 5b. Check if this face is already registered to someone else
    if check_duplicate_face(db, embedding, exclude_student_id=current_student.id, institution_id=current_student.institution_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This face is already registered to another student's account. Please register using your actual face."
        )

    # Convert embedding numpy array to serializable Python list
    import json
    embedding_json = json.dumps(embedding.tolist())

    # 6. Save face embedding & update photo flag
    current_student.face_embedding = embedding_json
    current_student.photo = "yes"
    current_student.face_enrolled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_student)

    try:
        from .recognition_service import recognition_service
        recognition_service.invalidate_cache(current_student.institution_id)
        recognition_service.load_student_records(db, institution_id=current_student.institution_id)
    except Exception as e:
        print(f"Failed to refresh recognition cache: {e}")

    # 8. Save a copy of the face image for reference
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(base_dir, "data", f"tenant_{current_student.institution_id}")
        os.makedirs(data_dir, exist_ok=True)
        file_name = f"user.{current_student.id}.1.jpg"
        file_path = os.path.join(data_dir, file_name)
        cv2.imwrite(file_path, aligned_face)
    except Exception as img_err:
        print(f"Failed to save reference face image to disk: {img_err}")

    # Log the selfie update event
    crud.create_audit_log(
        db, 
        log=schemas.AuditLogCreate(
            user_email=current_student.email, 
            action=f"Student '{current_student.name}' (ID: {current_student.id}) successfully updated their face selfie profile."
        ),
        institution_id=current_student.institution_id
    )

    return current_student

# --- Student Management ---

@router.get("/students", response_model=List[schemas.Student])
def list_students(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    List all students registered in the system (Admins & Teachers only).
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can view the student list."
        )
    if current_user.role == "teacher":
        teacher_subjects = db.query(models.Subject).filter(
            models.Subject.teacher_id == current_user.id,
            models.Subject.institution_id == current_user.institution_id
        ).all()
        if not teacher_subjects:
            # No subject assigned to teacher yet - return all students as fallback
            return crud.get_students(db, institution_id=current_user.institution_id)
        teacher_departments = [s.department for s in teacher_subjects]
        
        # Primary: filter by department name
        students = db.query(models.StudentModel).filter(
            models.StudentModel.dep.in_(teacher_departments),
            models.StudentModel.institution_id == current_user.institution_id
        ).all()
        
        # Fallback: if no students found by dept (mismatch), return students who attended teacher's sessions
        if not students:
            subject_ids = [s.id for s in teacher_subjects]
            from sqlalchemy import or_
            attended_ids_raw = db.query(models.AttendanceModel.id).filter(
                models.AttendanceModel.subject_id.in_(subject_ids),
                models.AttendanceModel.institution_id == current_user.institution_id
            ).distinct().all()
            attended_ids = [int(r[0]) for r in attended_ids_raw if r[0] and r[0].isdigit()]
            if attended_ids:
                students = db.query(models.StudentModel).filter(
                    models.StudentModel.id.in_(attended_ids),
                    models.StudentModel.institution_id == current_user.institution_id
                ).all()
        
        # Last resort fallback: return all students if still empty
        if not students:
            return crud.get_students(db, institution_id=current_user.institution_id)
            
        return students
        
    return crud.get_students(db, institution_id=current_user.institution_id)


@router.post("/students", response_model=schemas.Student, status_code=status.HTTP_201_CREATED)
def add_student(
    student: schemas.StudentCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Register a new student (Admins & Teachers only).
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can register new students."
        )
    db_student = crud.get_student_by_id(db, student_id=student.id, institution_id=current_user.institution_id)
    if db_student:
        raise HTTPException(status_code=400, detail="Student with this ID already exists")
    new_s = crud.create_student(db, student=student, institution_id=current_user.institution_id)
    crud.create_audit_log(
        db, 
        log=schemas.AuditLogCreate(user_email=current_user.email, action=f"Student '{new_s.name}' registered by {current_user.email}."),
        institution_id=current_user.institution_id
    )
    return new_s

@router.put("/students/{id}", response_model=schemas.Student)
def update_student_details(
    id: int,
    student_data: schemas.StudentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Update a student's profile details (Admins & Teachers only).
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can edit student records."
        )
        
    db_student = crud.get_student_by_id(db, student_id=id, institution_id=current_user.institution_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Update fields
    for key, value in student_data.dict(exclude_unset=True).items():
        if key == "password":
            if value and value != "":
                db_student.password_hash = security.get_password_hash(value)
        else:
            setattr(db_student, key, value)
            
    db.commit()
    db.refresh(db_student)
    crud.create_audit_log(
        db, 
        log=schemas.AuditLogCreate(user_email=current_user.email, action=f"Student ID {id} details updated by {current_user.email}."),
        institution_id=current_user.institution_id
    )
    return db_student

@router.delete("/students/{id}", status_code=status.HTTP_200_OK)
def remove_student(
    id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Delete a student and their attendance logs (Admins & Teachers only).
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can delete student records."
        )
    success = crud.delete_student(db, student_id=id, institution_id=current_user.institution_id)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")
    crud.create_audit_log(
        db, 
        log=schemas.AuditLogCreate(user_email=current_user.email, action=f"Student ID {id} deleted by {current_user.email}."),
        institution_id=current_user.institution_id
    )
    return {"message": f"Student with ID {id} has been deleted successfully."}

@router.post("/students/{id}/upload-sample", status_code=status.HTTP_200_OK)
async def upload_student_face_sample(
    id: int,
    sample_num: int = Query(1, ge=1, le=100),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Receives a single student face image, runs SFace to extract the 128D embedding,
    and saves it in the database for instant, training-free face recognition (Admins & Teachers only).
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can register student face photos."
        )

    # 1. Read and decode the uploaded image file (with EXIF auto-rotation)
    contents = await file.read()
    from . import face_utils
    
    img = face_utils.correct_exif_orientation(contents)
    if img is None:
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file provided.")

    # 2. Extract 128D Face Embedding using SFace
    from . import face_utils
    embedding = face_utils.get_face_embedding(img)
    if embedding is None:
        raise HTTPException(
            status_code=422, 
            detail="No face detected or face image is unclear. Please look straight at the camera and try again."
        )

    # 2b. Check if this face is already registered to someone else
    if check_duplicate_face(db, embedding, exclude_student_id=id, institution_id=current_user.institution_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This face is already registered to another student's account. Please register using your actual face."
        )

    # Convert embedding numpy array to a serializable Python list
    embedding_list = embedding.tolist()
    import json
    embedding_json = json.dumps(embedding_list)

    # 3. Save the serialized embedding in DB
    db_student = crud.get_student_by_id(db, student_id=id, institution_id=current_user.institution_id)
    if not db_student:
        raise HTTPException(status_code=404, detail="Student not found.")

    db_student.face_embedding = embedding_json
    db_student.photo = "yes"
    db_student.face_enrolled_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_student)

    # 4. Refresh recognition service cache instantly
    try:
        from .recognition_service import recognition_service
        recognition_service.invalidate_cache(current_user.institution_id)
        recognition_service.load_student_records(db, institution_id=current_user.institution_id)
    except Exception as e:
        print(f"Failed to refresh recognition cache: {e}")

    # Optional: Save a copy of the face image for reference
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(base_dir, "data", f"tenant_{current_user.institution_id}")
        os.makedirs(data_dir, exist_ok=True)
        file_name = f"user.{id}.1.jpg"
        file_path = os.path.join(data_dir, file_name)
        
        # Detect and crop aligned face to save a clear reference photo
        detector, recognizer = face_utils.get_face_engines()
        h, w = img.shape[:2]
        detector.setInputSize((w, h))
        retval, faces = detector.detect(img)
        if retval and faces is not None and len(faces) > 0:
            best_face = faces[np.argmax(faces[:, 14])] if len(faces) > 1 else faces[0]
            aligned_face = recognizer.alignCrop(img, best_face)
            cv2.imwrite(file_path, aligned_face)
    except Exception as img_err:
        print(f"Failed to save reference face image to disk: {img_err}")

    crud.create_audit_log(
        db, 
        log=schemas.AuditLogCreate(user_email=current_user.email, action=f"Face registered for student ID {id} by {current_user.email}."),
        institution_id=current_user.institution_id
    )
    return {"message": "Face registered successfully.", "filename": f"user.{id}.1.jpg"}

@router.post("/students/train", status_code=status.HTTP_200_OK)
def trigger_training(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Model training is obsolete. Face recognition now runs instantly using Deep Learning SFace.
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized access."
        )
    try:
        crud.create_audit_log(
            db, 
            log=schemas.AuditLogCreate(
                user_email=current_user.email, 
                action=f"Obsolete model training trigger checked by {current_user.email}."
            ),
            institution_id=current_user.institution_id
        )
        return {
            "message": "Deep Learning models are updated instantly on registration. No training required!",
            "total_samples": 1,
            "total_students": 1
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training check failed: {str(e)}")

# --- User Self-Service Profile & Password ---
@router.put("/me", response_model=schemas.User)
def update_user_me(
    user_data: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Update current logged in user's own profile details (Admins/Teachers).
    """
    db_user = current_user
    
    if user_data.name is not None:
        db_user.name = user_data.name
    if user_data.email is not None:
        existing = db.query(models.User).filter(models.User.email == user_data.email, models.User.id != db_user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use.")
        db_user.email = user_data.email
        
    # Map/Update subject if provided for the teacher role
    if db_user.role == "teacher":
        if user_data.subject_name or user_data.subject_code or user_data.subject_department:
            subject = db.query(models.Subject).filter(
                models.Subject.teacher_id == db_user.id,
                models.Subject.institution_id == db_user.institution_id
            ).first()
            if subject:
                if user_data.subject_name is not None:
                    subject.name = user_data.subject_name
                if user_data.subject_department is not None:
                    subject.department = user_data.subject_department
                if user_data.subject_code is not None:
                    existing_sub = db.query(models.Subject).filter(
                        models.Subject.code == user_data.subject_code,
                        models.Subject.institution_id == db_user.institution_id,
                        models.Subject.id != subject.id
                    ).first()
                    if existing_sub:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject code already in use by another subject.")
                    subject.code = user_data.subject_code
                db.commit()
                db.refresh(subject)
            else:
                sub_name = user_data.subject_name or "New Subject"
                sub_code = user_data.subject_code or f"SUB-{db_user.id}"
                sub_dept = user_data.subject_department or "CSE"
                
                existing_sub = db.query(models.Subject).filter(
                    models.Subject.code == sub_code,
                    models.Subject.institution_id == db_user.institution_id
                ).first()
                if existing_sub:
                    existing_sub.teacher_id = db_user.id
                    existing_sub.name = sub_name
                    existing_sub.department = sub_dept
                    db.commit()
                    db.refresh(existing_sub)
                else:
                    db_sub = models.Subject(
                        name=sub_name,
                        code=sub_code,
                        department=sub_dept,
                        teacher_id=db_user.id,
                        institution_id=db_user.institution_id
                    )
                    db.add(db_sub)
                    db.commit()
                    db.refresh(db_sub)

    db.commit()
    db.refresh(db_user)
    
    # Attach subject properties for response serialization
    subject = db.query(models.Subject).filter(
        models.Subject.teacher_id == db_user.id,
        models.Subject.institution_id == db_user.institution_id
    ).first()
    db_user.subject_name = subject.name if subject else None
    db_user.subject_code = subject.code if subject else None
    db_user.subject_department = subject.department if subject else None

    crud.create_audit_log(
        db, 
        log=schemas.AuditLogCreate(user_email=db_user.email, action=f"User updated their own profile: {db_user.email}"),
        institution_id=db_user.institution_id
    )
    return db_user

@router.post("/me/change-password", response_model=schemas.User)
def change_user_password(
    data: schemas.UserChangePassword,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Change current logged in user's (Admin/Teacher) password.
    """
    if not security.verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
        
    current_user.password_hash = security.get_password_hash(data.new_password)
    db.commit()
    db.refresh(current_user)
    
    subject = db.query(models.Subject).filter(
        models.Subject.teacher_id == current_user.id,
        models.Subject.institution_id == current_user.institution_id
    ).first()
    current_user.subject_name = subject.name if subject else None
    current_user.subject_code = subject.code if subject else None
    current_user.subject_department = subject.department if subject else None
    
    crud.create_audit_log(
        db, 
        log=schemas.AuditLogCreate(user_email=current_user.email, action=f"User '{current_user.email}' changed their password."),
        institution_id=current_user.institution_id
    )
    return current_user


@router.post("/students/me/consent")
def record_student_consent(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    current_student.consent_given = True
    current_student.consent_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Consent recorded", "consent_at": current_student.consent_at.isoformat()}
@router.post("/students/me/revoke-consent")
def revoke_student_consent(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """GDPR/DPDP: Revoke biometric consent and delete face registration data, but keep student account."""
    institution_id = current_student.institution_id
    current_student.face_embedding = None
    current_student.photo = "no"
    current_student.consent_given = False
    current_student.consent_at = None
    db.commit()

    # Try to delete face reference image file
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(base_dir, "data", f"tenant_{institution_id}")
        file_name = f"user.{current_student.id}.1.jpg"
        file_path = os.path.join(data_dir, file_name)
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Failed to delete reference face image file: {e}")

    from .recognition_service import recognition_service
    recognition_service.invalidate_cache(institution_id)
    try:
        recognition_service.load_student_records(db, institution_id=institution_id)
    except Exception as cache_err:
        print(f"Failed to reload student records cache: {cache_err}")

    crud.create_audit_log(
        db, 
        log=schemas.AuditLogCreate(
            user_email=current_student.email, 
            action=f"Student '{current_student.name}' (ID: {current_student.id}) revoked biometric consent and deleted their face profile."
        ),
        institution_id=institution_id
    )
    return {"message": "Biometric consent revoked and face data deleted successfully."}


@router.delete("/students/me/account")
def delete_student_account(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """GDPR/DPDP: delete student account and face data."""
    student_id = current_student.id
    institution_id = current_student.institution_id
    db.query(models.AttendanceModel).filter(
        models.AttendanceModel.id == str(student_id),
        models.AttendanceModel.institution_id == institution_id,
    ).delete()
    db.query(models.ParentAccount).filter(
        models.ParentAccount.student_id == student_id,
    ).delete()
    crud.delete_student(db, student_id, institution_id=institution_id)
    from .recognition_service import recognition_service
    recognition_service.invalidate_cache(institution_id)
    return {"message": "Account and biometric data deleted"}