import cv2
import numpy as np
import os
import json
from sqlalchemy.orm import Session

class RecognitionService:
    def __init__(self):
        self.detector = None
        self.recognizer = None
        self.student_records = {}
        self._cache_version = {}
        self._load_models()

    def invalidate_cache(self, institution_id: int = None):
        """Invalidate recognition cache for an institution or globally."""
        from .cache_service import bump_recognition_version, cache_delete_pattern
        if institution_id is not None:
            bump_recognition_version(institution_id)
            self._cache_version.pop(institution_id, None)
            cache_delete_pattern(f"recognition:embeddings:{institution_id}")
        else:
            self.student_records = {}
            self._cache_version = {}
            cache_delete_pattern("recognition:")

    def _load_models(self):
        """Loads the YuNet detector and SFace recognizer via face_utils helper."""
        try:
            from .face_utils import get_face_engines
            self.detector, self.recognizer = get_face_engines()
            print("SFace and YuNet models loaded successfully in RecognitionService.")
        except Exception as e:
            print(f"Error loading SFace/YuNet models: {e}")
            self.detector = None
            self.recognizer = None

    def load_student_records(self, db: Session, institution_id: int = None):
        """Loads student embeddings, scoped by institution with version-based cache."""
        from . import models
        from .cache_service import get_recognition_version
        
        if institution_id is not None:
            version = get_recognition_version(institution_id)
            if self._cache_version.get(institution_id) == version and self.student_records:
                return
        
        try:
            query = db.query(models.StudentModel).filter(models.StudentModel.face_embedding != None)
            if institution_id is not None:
                query = query.filter(models.StudentModel.institution_id == institution_id)
            students = query.all()
            records = {}
            for s in students:
                try:
                    emb = json.loads(s.face_embedding)
                    emb_np = np.array(emb, dtype=np.float32).reshape(1, -1)
                    records[s.id] = {
                        "name": s.name,
                        "roll": s.roll,
                        "dep": s.dep,
                        "embedding": emb_np,
                        "institution_id": s.institution_id
                    }
                except Exception as parse_err:
                    print(f"Failed to parse embedding for student ID {s.id}: {parse_err}")
            self.student_records = records
            if institution_id is not None:
                self._cache_version[institution_id] = get_recognition_version(institution_id)
            print(f"Loaded {len(self.student_records)} student embeddings for recognition.")
        except Exception as db_err:
            print(f"Database query failed in load_student_records: {db_err}")

    def _enhance_image(self, image: np.ndarray) -> np.ndarray:
        """Apply CLAHE contrast enhancement in LAB color space for better detection in varied lighting."""
        try:
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l_channel, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
            cl = clahe.apply(l_channel)
            enhanced_lab = cv2.merge((cl, a, b))
            return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        except Exception:
            return image  # fallback: return original if enhancement fails

    def recognize_faces_in_frame(self, image: np.ndarray, institution_id: int = None):
        """Detects and recognizes faces in a single video frame using SFace and YuNet.

        Improvements over v1:
        - CLAHE preprocessing for robust detection under dim / harsh lighting
        - Minimum face-size guard (40x40 px) to skip distant / blurry faces
        - Two-pass detection: try enhanced image first, fall back to original
        - Cosine threshold raised to 0.43 to cut false positive rate
        """
        if self.detector is None or self.recognizer is None:
            self._load_models()
            if self.detector is None or self.recognizer is None:
                raise Exception("Models are not loaded. Cannot recognize faces.")

        # --- Step 1: Pre-process frame for better detection ---
        enhanced = self._enhance_image(image)

        h, w = enhanced.shape[:2]
        self.detector.setInputSize((w, h))

        retval, faces = self.detector.detect(enhanced)

        # Two-pass: if enhanced image yields no face, retry with original
        if not retval or faces is None or len(faces) == 0:
            self.detector.setInputSize((image.shape[1], image.shape[0]))
            retval, faces = self.detector.detect(image)
            enhanced = image  # use original for alignment if fallback

        if not retval or faces is None or len(faces) == 0:
            return []

        recognized_faces = []
        for face in faces:
            x, y, box_w, box_h = face[0:4]

            # Skip tiny / distant faces (too blurry to match reliably)
            if box_w < 40 or box_h < 40:
                continue

            try:
                # Align and crop the face using YuNet landmarks
                aligned = self.recognizer.alignCrop(enhanced, face)
                # Extract the 128-D SFace feature vector
                feat = self.recognizer.feature(aligned)
            except Exception as extract_err:
                print(f"Failed SFace feature extraction: {extract_err}")
                continue

            # Compare against all cached student embeddings (cosine similarity)
            best_id = None
            best_score = -1.0

            for student_id, record in self.student_records.items():
                if institution_id is not None and record.get("institution_id") != institution_id:
                    continue
                ref_emb = record["embedding"]
                score = self.recognizer.match(feat, ref_emb, cv2.FaceRecognizerSF_FR_COSINE)
                if score > best_score:
                    best_score = score
                    best_id = student_id

            # Threshold 0.43 — stricter than default (0.363) to minimise false matches
            if best_id is not None and best_score >= 0.43:
                student = self.student_records[best_id]
                recognized_faces.append({
                    "user_id": best_id,
                    "name": student["name"],
                    "roll": student["roll"],
                    "dep": student["dep"],
                    "box": [int(x), int(y), int(box_w), int(box_h)],
                    "confidence": round(min(100.0, max(0.0, best_score * 100)), 2)
                })

        return recognized_faces

# Singleton instance
recognition_service = RecognitionService()
