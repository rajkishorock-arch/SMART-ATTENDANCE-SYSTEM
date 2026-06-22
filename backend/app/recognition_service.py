import cv2
import numpy as np
import os
from sqlalchemy.orm import Session

class RecognitionService:
    def __init__(self):
        self.detector = None
        self.recognizer = None
        self.student_records = {}
        self._load_models()

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

    def load_student_records(self, db: Session, force: bool = False):
        """Loads all registered student profiles and their face embeddings from DB into memory.
        Uses in-memory cache if force=False and cache is already populated.
        """
        if not force and self.student_records:
            return
            
        from . import models
        import json
        
        try:
            students = db.query(models.StudentModel).filter(models.StudentModel.face_embedding != None).all()
            self.student_records = {}
            for s in students:
                try:
                    emb = json.loads(s.face_embedding)
                    emb_np = np.array(emb, dtype=np.float32).reshape(1, -1)
                    self.student_records[s.id] = {
                        "name": s.name,
                        "roll": s.roll,
                        "dep": s.dep,
                        "embedding": emb_np,
                        "institution_id": s.institution_id
                    }
                except Exception as parse_err:
                    print(f"Failed to parse embedding for student ID {s.id}: {parse_err}")
            print(f"Loaded/Refreshed {len(self.student_records)} student embeddings for recognition.")
        except Exception as db_err:
            print(f"Database query failed in load_student_records: {db_err}")

    def recognize_faces_in_frame(self, image: np.ndarray, institution_id: int = None):
        """Detects and recognizes faces in a single video frame using SFace and YuNet.

        Optimizations:
        - Downscale high-resolution frames (max dimension 640px) to run real-time on CPU
        - Remove heavy CLAHE preprocessing and two-pass detection for speed
        - Match cosine similarity with threshold 0.43 (same as desktop app)
        - Scale face box coordinates back to the original image coordinate space
        """
        if self.detector is None or self.recognizer is None:
            self._load_models()
            if self.detector is None or self.recognizer is None:
                raise Exception("Models are not loaded. Cannot recognize faces.")

        if image is None or image.size == 0:
            return []

        # --- Step 1: Downscale frame if too large for fast CPU detection/recognition ---
        orig_h, orig_w = image.shape[:2]
        max_dim = 640
        
        if orig_w > max_dim or orig_h > max_dim:
            if orig_w > orig_h:
                new_w = max_dim
                new_h = int(orig_h * (max_dim / orig_w))
            else:
                new_h = max_dim
                new_w = int(orig_w * (max_dim / orig_h))
            
            resized_image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
            scale_x = orig_w / new_w
            scale_y = orig_h / new_h
        else:
            resized_image = image
            scale_x = 1.0
            scale_y = 1.0

        h, w = resized_image.shape[:2]
        self.detector.setInputSize((w, h))

        retval, faces = self.detector.detect(resized_image)

        if not retval or faces is None or len(faces) == 0:
            return []

        recognized_faces = []
        for face in faces:
            x, y, box_w, box_h = face[0:4]

            # Skip tiny / distant faces in resized image
            if box_w < 20 or box_h < 20:
                continue

            try:
                # Align and crop the face using YuNet landmarks on the resized image
                aligned = self.recognizer.alignCrop(resized_image, face)
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

            # Threshold 0.43 (same as desktop app)
            if best_id is not None and best_score >= 0.43:
                student = self.student_records[best_id]
                
                # Scale coordinates back to original image space
                orig_x = int(x * scale_x)
                orig_y = int(y * scale_y)
                orig_box_w = int(box_w * scale_x)
                orig_box_h = int(box_h * scale_y)

                recognized_faces.append({
                    "user_id": best_id,
                    "name": student["name"],
                    "roll": student["roll"],
                    "dep": student["dep"],
                    "box": [orig_x, orig_y, orig_box_w, orig_box_h],
                    "confidence": round(min(100.0, max(0.0, best_score * 100)), 2)
                })

        return recognized_faces

# Singleton instance
recognition_service = RecognitionService()
