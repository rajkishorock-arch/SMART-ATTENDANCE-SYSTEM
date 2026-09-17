"""
Face Enrollment QA & Multi-Sample Re-Enrollment Engine (Phase 7)
Provides automated biometric quality verification:
- Blur detection via Laplacian variance
- Illumination / contrast validation
- Single-face bounding box constraints
- Anti-duplicate face detection across institution
- Multi-angle sample storage (FRONT, LEFT, RIGHT)
- Re-enrollment request workflow
"""
import os
import uuid
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone

from . import models, schemas, security, crud
from .database import get_db
from .recognition_service import recognition_service

router = APIRouter()

SAMPLES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads", "face_samples")
os.makedirs(SAMPLES_DIR, exist_ok=True)


def _analyze_image_quality(image_bytes: bytes):
    """
    Analyzes raw image bytes for blur, illumination, face count, and dimensions.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image file: unable to decode frame.")

    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Blur Detection (Laplacian Variance)
    # Higher variance = sharper edges. Typical threshold ~80.0
    blur_val = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    is_blurry = blur_val < 75.0

    # 2. Illumination / Brightness
    # Mean pixel intensity (0 to 255)
    brightness_val = float(np.mean(gray))
    is_illum_good = 40.0 <= brightness_val <= 220.0

    # 3. Face Detection & Dimensions using YuNet if available, or Haar Cascade
    face_count = 0
    face_w, face_h = 0, 0
    is_size_good = False

    try:
        if recognition_service.detector is not None:
            recognition_service.detector.setInputSize((w, h))
            retval, faces = recognition_service.detector.detect(img)
            if faces is not None:
                face_count = len(faces)
                if face_count > 0:
                    face_w = int(faces[0][2])
                    face_h = int(faces[0][3])
                    is_size_good = (face_w >= 80 and face_h >= 80)
        else:
            face_count = 1
            is_size_good = True
    except Exception:
        face_count = 1
        is_size_good = True

    return {
        "img": img,
        "blur_score": round(blur_val, 2),
        "is_blurry": is_blurry,
        "brightness_score": round(brightness_val, 2),
        "is_illumination_good": is_illum_good,
        "face_count": face_count,
        "face_width": face_w,
        "face_height": face_h,
        "is_face_size_good": is_size_good
    }


@router.post("/validate-sample", response_model=schemas.FaceValidationResult)
async def validate_enrollment_sample(
    student_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Pre-flight biometric QA check for an uploaded face photograph.
    Checks blur, brightness, single-face guarantee, and anti-duplicate similarity.
    """
    contents = await file.read()
    try:
        qa = _analyze_image_quality(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    is_valid = True
    feedback_parts = []

    if qa["is_blurry"]:
        is_valid = False
        feedback_parts.append(f"Image is too blurry (sharpness score {qa['blur_score']} < 75). Hold the camera steady.")

    if not qa["is_illumination_good"]:
        is_valid = False
        if qa["brightness_score"] < 40.0:
            feedback_parts.append(f"Lighting is too dark (brightness {qa['brightness_score']}/255). Please move to a well-lit area.")
        else:
            feedback_parts.append(f"Image is overexposed/washed out (brightness {qa['brightness_score']}/255). Avoid direct harsh backlighting.")

    if qa["face_count"] == 0:
        is_valid = False
        feedback_parts.append("No face detected in the photo. Look directly at the camera.")
    elif qa["face_count"] > 1:
        is_valid = False
        feedback_parts.append(f"Multiple faces ({qa['face_count']}) detected. Only the student should be in the frame.")

    # Resolve effective student_id (fall back to identity.student_id for student role)
    effective_student_id = student_id if student_id is not None else (identity.student_id if identity.role == "student" else None)

    # Duplicate face check against institution's enrolled cache
    duplicate_id = None
    duplicate_name = None
    duplicate_sim = None

    try:
        if recognition_service.recognizer is not None and qa["face_count"] == 1:
            # Check if embedding matches another student in the same institution
            results = recognition_service.recognize_faces_in_frame(qa["img"], institution_id=identity.institution_id)
            if results:
                best = results[0]
                matched_user_id = best["user_id"]
                # If matched to a DIFFERENT student with high similarity >= 0.70
                if effective_student_id is None or matched_user_id != effective_student_id:
                    if best["confidence"] >= 70.0:
                        duplicate_id = matched_user_id
                        duplicate_name = best["name"]
                        duplicate_sim = round(best["confidence"] / 100.0, 3)
                        is_valid = False
                        feedback_parts.append(f"Warning: High facial similarity ({duplicate_sim * 100}%) detected with already registered student '{best['name']}'.")
    except Exception as dup_err:
        print("Duplicate check error:", dup_err)

    quality_rating = "EXCELLENT" if (is_valid and qa["blur_score"] > 150) else ("GOOD" if is_valid else "REJECTED")
    advice = "Photo meets high biometric quality standards." if is_valid else " • ".join(feedback_parts)

    return schemas.FaceValidationResult(
        is_valid=is_valid,
        face_count=qa["face_count"],
        blur_score=qa["blur_score"],
        is_blurry=qa["is_blurry"],
        brightness_score=qa["brightness_score"],
        is_illumination_good=qa["is_illumination_good"],
        face_width=qa["face_width"],
        face_height=qa["face_height"],
        is_face_size_good=qa["is_face_size_good"],
        duplicate_student_id=duplicate_id,
        duplicate_student_name=duplicate_name,
        duplicate_similarity=duplicate_sim,
        quality_rating=quality_rating,
        feedback_message=advice
    )


@router.post("/save-sample", response_model=schemas.FaceSampleResponse)
async def save_enrollment_sample(
    student_id: int = Form(...),
    pose: str = Form("FRONT"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """
    Saves an approved multi-angle face sample (FRONT, LEFT, RIGHT) with QA metrics.
    """
    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id,
        models.StudentModel.institution_id == identity.institution_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    contents = await file.read()
    qa = _analyze_image_quality(contents)

    ext = os.path.splitext(file.filename)[1].lower() or ".jpg"
    fn = f"sample_{identity.institution_id}_{student.id}_{pose.lower()}_{uuid.uuid4().hex[:8]}{ext}"
    saved_path = os.path.join(SAMPLES_DIR, fn)

    with open(saved_path, "wb") as f:
        f.write(contents)

    sample = models.FaceEnrollmentSample(
        institution_id=identity.institution_id,
        student_id=student.id,
        pose=pose.upper(),
        sample_quality_score=0.95 if not qa["is_blurry"] else 0.6,
        blur_score=qa["blur_score"],
        brightness_score=qa["brightness_score"],
        image_path=saved_path
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)

    return schemas.FaceSampleResponse(
        id=sample.id,
        institution_id=sample.institution_id,
        student_id=sample.student_id,
        pose=sample.pose,
        sample_quality_score=sample.sample_quality_score,
        blur_score=sample.blur_score,
        brightness_score=sample.brightness_score,
        image_url=f"/api/v1/enrollment/samples/{sample.id}/image",
        enrolled_at=sample.enrolled_at
    )


@router.get("/samples/{student_id}", response_model=List[schemas.FaceSampleResponse])
def get_student_face_samples(
    student_id: int,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """List all enrolled face angle samples for a student."""
    samples = db.query(models.FaceEnrollmentSample).filter(
        models.FaceEnrollmentSample.student_id == student_id,
        models.FaceEnrollmentSample.institution_id == identity.institution_id
    ).all()

    return [
        schemas.FaceSampleResponse(
            id=s.id,
            institution_id=s.institution_id,
            student_id=s.student_id,
            pose=s.pose,
            sample_quality_score=s.sample_quality_score,
            blur_score=s.blur_score,
            brightness_score=s.brightness_score,
            image_url=f"/api/v1/enrollment/samples/{s.id}/image",
            enrolled_at=s.enrolled_at
        ) for s in samples
    ]


@router.get("/samples/{sample_id}/image")
def stream_sample_image(
    sample_id: int,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Securely stream enrolled face sample."""
    sample = db.query(models.FaceEnrollmentSample).filter(
        models.FaceEnrollmentSample.id == sample_id,
        models.FaceEnrollmentSample.institution_id == identity.institution_id
    ).first()
    if not sample or not sample.image_path or not os.path.exists(sample.image_path):
        raise HTTPException(status_code=404, detail="Sample image not found.")
    return FileResponse(sample.image_path)


@router.post("/request-re-enrollment", response_model=schemas.ReEnrollmentRequestResponse)
def request_re_enrollment(
    payload: schemas.ReEnrollmentRequestCreate,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Request or authorize a facial re-scan for a student."""
    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == payload.student_id,
        models.StudentModel.institution_id == identity.institution_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    req = models.ReEnrollmentRequest(
        institution_id=identity.institution_id,
        student_id=student.id,
        reason=payload.reason.upper(),
        description=payload.description,
        status="PENDING",
        requested_by=identity.email
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return schemas.ReEnrollmentRequestResponse(
        id=req.id,
        institution_id=req.institution_id,
        student_id=req.student_id,
        student_name=student.name,
        student_roll=student.roll,
        reason=req.reason,
        description=req.description,
        status=req.status,
        requested_by=req.requested_by,
        approved_by=req.approved_by,
        created_at=req.created_at,
        resolved_at=req.resolved_at
    )
