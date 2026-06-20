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

    def load_student_records(self, db: Session):
        """Loads all registered student profiles and their face embeddings from DB into memory."""
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
                        "embedding": emb_np
                    }
                except Exception as parse_err:
                    print(f"Failed to parse embedding for student ID {s.id}: {parse_err}")
            print(f"Loaded {len(self.student_records)} student embeddings for recognition.")
        except Exception as db_err:
            print(f"Database query failed in load_student_records: {db_err}")

    def recognize_faces_in_frame(self, image: np.ndarray):
        """Detects and recognizes faces in a single video frame using SFace and YuNet."""
        if self.detector is None or self.recognizer is None:
            self._load_models()
            if self.detector is None or self.recognizer is None:
                raise Exception("Models are not loaded. Cannot recognize faces.")

        h, w = image.shape[:2]
        self.detector.setInputSize((w, h))
        
        retval, faces = self.detector.detect(image)
        if not retval or faces is None or len(faces) == 0:
            return []

        recognized_faces = []
        for face in faces:
            x, y, box_w, box_h = face[0:4]
            
            try:
                # Align and crop the face using YuNet landmarks
                aligned = self.recognizer.alignCrop(image, face)
                # Extract the 128-D feature vector
                feat = self.recognizer.feature(aligned)
            except Exception as extract_err:
                print(f"Failed SFace feature extraction: {extract_err}")
                continue

            # Compare against all cached student embeddings
            best_id = None
            best_score = -1.0
            
            for student_id, record in self.student_records.items():
                ref_emb = record["embedding"]
                score = self.recognizer.match(feat, ref_emb, cv2.FaceRecognizerSF_FR_COSINE)
                if score > best_score:
                    best_score = score
                    best_id = student_id

            # Raised Cosine threshold from 0.36 to 0.42 to prevent false matches (strangers)
            if best_id is not None and best_score >= 0.42:
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
