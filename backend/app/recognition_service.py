import cv2
import numpy as np
import os
import json
import time
from sqlalchemy.orm import Session
from .vector_index import vector_index_service

class RecognitionService:
    def __init__(self):
        self.detector = None
        self.recognizer = None
        self.student_records = {}
        self._institution_matrices = {}
        self._cache_version = {}
        self._load_models()

    def invalidate_cache(self, institution_id: int = None):
        """Invalidate recognition cache for an institution or globally."""
        from .cache_service import bump_recognition_version, cache_delete_pattern
        vector_index_service.invalidate(institution_id)
        if institution_id is not None:
            bump_recognition_version(institution_id)
            self._cache_version.pop(institution_id, None)
            self._institution_matrices.pop(institution_id, None)
            cache_delete_pattern(f"recognition:embeddings:{institution_id}")
        else:
            self.student_records = {}
            self._institution_matrices = {}
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

    def warmup(self):
        """Warm up YuNet detector and SFace recognizer with a dummy frame to eliminate first-request cold JIT latency."""
        try:
            if self.detector is not None and self.recognizer is not None:
                dummy = np.zeros((112, 112, 3), dtype=np.uint8)
                self.detector.setInputSize((112, 112))
                self.detector.detect(dummy)
                # AlignCrop dummy test with standard landmark array
                mock_face = np.array([10, 10, 80, 80, 25, 30, 65, 30, 45, 50, 30, 70, 60, 70, 0.95], dtype=np.float32)
                try:
                    aligned = self.recognizer.alignCrop(dummy, mock_face)
                    self.recognizer.feature(aligned)
                except Exception:
                    pass
                print("RecognitionService: YuNet and SFace models warmed up successfully.")
        except Exception as e:
            print(f"RecognitionService warmup warning: {e}")

    def load_student_records(self, db: Session, institution_id: int = None):
        """Loads student embeddings, scoped by institution with version-based cache and pre-computed normalized matrices."""
        from . import models
        from .cache_service import get_recognition_version
        
        if institution_id is not None:
            version = get_recognition_version(institution_id)
            if self._cache_version.get(institution_id) == version and institution_id in self._institution_matrices:
                return
        
        try:
            query = db.query(models.StudentModel).filter(models.StudentModel.face_embedding != None)
            if institution_id is not None:
                query = query.filter(models.StudentModel.institution_id == institution_id)
            students = query.all()
            records = {}
            for s in students:
                try:
                    from .encryption_service import decrypt_embedding
                    decrypted = decrypt_embedding(s.face_embedding)
                    emb = json.loads(decrypted)
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

            # Build high-speed vectorized NumPy matrix per institution (BLAS-accelerated dot product)
            grouped = {}
            for s_id, rec in records.items():
                inst = rec.get("institution_id")
                if inst not in grouped:
                    grouped[inst] = {"vectors": [], "students": []}
                vec = rec["embedding"].reshape(128,)
                norm = float(np.linalg.norm(vec))
                if norm > 1e-9:
                    vec = vec / norm
                grouped[inst]["vectors"].append(vec)
                grouped[inst]["students"].append({
                    "user_id": s_id,
                    "name": rec["name"],
                    "roll": rec["roll"],
                    "dep": rec["dep"],
                    "institution_id": inst
                })

            for inst, data in grouped.items():
                if data["vectors"]:
                    self._institution_matrices[inst] = {
                        "matrix": np.vstack(data["vectors"]).astype(np.float32),
                        "students": data["students"]
                    }
                    vector_index_service.get_or_create(inst).build(data["vectors"], data["students"])

            if institution_id is not None:
                self._cache_version[institution_id] = get_recognition_version(institution_id)
            print(f"Loaded {len(self.student_records)} student embeddings into vectorized matrix for recognition.")
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

    def recognize_faces_in_frame(self, image: np.ndarray, institution_id: int = None, return_metrics: bool = False):
        """Detects and recognizes faces in a single video frame using SFace and YuNet with vectorized BLAS matching.

        Returns:
            List[dict] if return_metrics is False, or
            Tuple[List[dict], dict] containing results and performance timing metrics if return_metrics is True.
        """
        t_start = time.perf_counter()
        metrics = {
            "detect_ms": 0.0,
            "embed_ms": 0.0,
            "match_ms": 0.0,
            "total_ms": 0.0
        }

        if self.detector is None or self.recognizer is None:
            self._load_models()
            if self.detector is None or self.recognizer is None:
                raise Exception("Models are not loaded. Cannot recognize faces.")

        # --- Step 1: Pre-process frame for better detection ---
        enhanced = self._enhance_image(image)

        h, w = enhanced.shape[:2]
        self.detector.setInputSize((w, h))

        t_detect_start = time.perf_counter()
        retval, faces = self.detector.detect(enhanced)

        # Two-pass: if enhanced image yields no face, retry with original
        if not retval or faces is None or len(faces) == 0:
            self.detector.setInputSize((image.shape[1], image.shape[0]))
            retval, faces = self.detector.detect(image)
            enhanced = image  # use original for alignment if fallback

        metrics["detect_ms"] = round((time.perf_counter() - t_detect_start) * 1000, 2)

        if not retval or faces is None or len(faces) == 0:
            metrics["total_ms"] = round((time.perf_counter() - t_start) * 1000, 2)
            return ([], metrics) if return_metrics else []

        recognized_faces = []
        total_embed_time = 0.0
        total_match_time = 0.0

        for face in faces:
            x, y, box_w, box_h = face[0:4]

            # Skip tiny / distant faces (too blurry to match reliably)
            if box_w < 40 or box_h < 40:
                continue

            t_embed_start = time.perf_counter()
            try:
                # Align and crop the face using YuNet landmarks
                aligned = self.recognizer.alignCrop(enhanced, face)
                # Extract the 128-D SFace feature vector
                feat = self.recognizer.feature(aligned)
            except Exception as extract_err:
                print(f"Failed SFace feature extraction: {extract_err}")
                continue
            total_embed_time += (time.perf_counter() - t_embed_start)

            # Ultra-fast vectorized cosine matching (Matrix dot product via VectorIndexService)
            t_match_start = time.perf_counter()
            best_id = None
            best_score = -1.0
            best_student = None

            idx_service = vector_index_service.get_or_create(institution_id) if institution_id is not None else None
            if idx_service and idx_service.is_built and len(idx_service.students) > 0:
                matches = idx_service.query(feat, top_k=1)
                if matches:
                    best_student, best_score = matches[0]
                    best_id = best_student["user_id"]
            else:
                inst_cache = self._institution_matrices.get(institution_id)
                if inst_cache and len(inst_cache["students"]) > 0:
                    matrix = inst_cache["matrix"]
                    students_list = inst_cache["students"]
                    feat_flat = feat.flatten()
                    norm = float(np.linalg.norm(feat_flat))
                    feat_norm = (feat_flat / norm) if norm > 1e-9 else feat_flat
                    scores = np.dot(matrix, feat_norm)
                    best_idx = int(np.argmax(scores))
                    best_score = float(scores[best_idx])
                    best_student = students_list[best_idx]
                    best_id = best_student["user_id"]
                else:
                    # Fallback: single comparison loop
                    for student_id, record in self.student_records.items():
                        if institution_id is not None and record.get("institution_id") != institution_id:
                            continue
                        ref_emb = record["embedding"]
                        score = self.recognizer.match(feat, ref_emb, cv2.FaceRecognizerSF_FR_COSINE)
                        if score > best_score:
                            best_score = score
                            best_id = student_id
                    if best_id is not None:
                        best_student = self.student_records[best_id]

            total_match_time += (time.perf_counter() - t_match_start)

            # Two-tier confidence threshold (Phase 5):
            # >= 0.50: High confidence auto-attendance
            # 0.35 <= score < 0.50: Borderline staged for human review
            if best_id is not None and best_score >= 0.35 and best_student is not None:
                match_quality = "HIGH" if best_score >= 0.50 else "BORDERLINE"
                recognized_faces.append({
                    "user_id": best_id,
                    "name": best_student["name"],
                    "roll": best_student["roll"],
                    "dep": best_student["dep"],
                    "box": [int(x), int(y), int(box_w), int(box_h)],
                    "confidence": round(min(100.0, max(0.0, best_score * 100)), 2),
                    "raw_score": round(float(best_score), 4),
                    "match_quality": match_quality
                })

        metrics["embed_ms"] = round(total_embed_time * 1000, 2)
        metrics["match_ms"] = round(total_match_time * 1000, 2)
        metrics["total_ms"] = round((time.perf_counter() - t_start) * 1000, 2)

        return (recognized_faces, metrics) if return_metrics else recognized_faces

# Singleton instance
recognition_service = RecognitionService()
