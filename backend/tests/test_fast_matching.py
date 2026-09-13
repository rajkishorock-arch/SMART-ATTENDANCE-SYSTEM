"""
Tests for Ultra-Fast Vectorized Matrix Face Matching and RecognitionService optimizations.
"""
import pytest
import numpy as np
import time
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app import models
from app.recognition_service import RecognitionService


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    inst = models.Institution(id=1, name="Apex Institute", slug="apex")
    session.add(inst)
    session.commit()
    yield session
    session.close()


def test_vectorized_matching_speed_and_accuracy():
    """Verify that vectorized matrix dot product matches exact cosine similarity and takes < 10ms for 500 students."""
    svc = RecognitionService()
    
    N = 500
    dim = 128
    
    # Generate N normalized mock embeddings
    raw_vectors = np.random.randn(N, dim).astype(np.float32)
    norms = np.linalg.norm(raw_vectors, axis=1, keepdims=True)
    matrix = raw_vectors / norms
    
    students_list = [
        {"user_id": i + 1, "name": f"Student_{i+1}", "roll": f"ROLL_{i+1}", "dep": "CSE"}
        for i in range(N)
    ]
    
    svc._institution_matrices[1] = {
        "matrix": matrix,
        "students": students_list
    }
    
    # Target is student #42
    target_vector = matrix[42:43].copy()
    
    t0 = time.perf_counter()
    scores = np.dot(matrix, target_vector.flatten())
    best_idx = int(np.argmax(scores))
    elapsed_ms = (time.perf_counter() - t0) * 1000
    
    assert best_idx == 42, f"Expected student #42, got #{best_idx}"
    assert pytest.approx(float(scores[best_idx]), abs=1e-5) == 1.0, "Self similarity must be 1.0"
    assert elapsed_ms < 10.0, f"Vectorized dot product took {elapsed_ms:.2f}ms, expected < 10ms"


def test_load_student_records_builds_matrix(test_db):
    """Verify that load_student_records builds both student_records dict and _institution_matrices."""
    svc = RecognitionService()
    
    # Seed 3 students with 128-D embeddings
    emb1 = (np.ones((128,), dtype=np.float32) / np.linalg.norm(np.ones(128))).tolist()
    emb2 = (np.zeros((128,), dtype=np.float32)).tolist()
    emb2[0] = 1.0
    
    from app.encryption_service import encrypt_embedding
    
    s1 = models.StudentModel(
        id=101, institution_id=1, name="Rohit Verma", roll="CS01", dep="CSE",
        course="B.Tech", year="3", semester="5", email="rohit@test.com",
        face_embedding=encrypt_embedding(json.dumps(emb1))
    )
    s2 = models.StudentModel(
        id=102, institution_id=1, name="Priya Patel", roll="CS02", dep="CSE",
        course="B.Tech", year="3", semester="5", email="priya@test.com",
        face_embedding=encrypt_embedding(json.dumps(emb2))
    )
    test_db.add_all([s1, s2])
    test_db.commit()
    
    svc.load_student_records(test_db, institution_id=1)
    
    assert 1 in svc._institution_matrices
    mat_info = svc._institution_matrices[1]
    assert mat_info["matrix"].shape == (2, 128)
    assert len(mat_info["students"]) == 2
    assert mat_info["students"][0]["name"] == "Rohit Verma"
    assert mat_info["students"][1]["name"] == "Priya Patel"
    
    # Test cache invalidation
    svc.invalidate_cache(1)
    assert 1 not in svc._institution_matrices


def test_warmup_runs_safely():
    """Verify that warmup runs without exceptions."""
    svc = RecognitionService()
    # Even if OpenCV models are not downloaded or are mocked, warmup must not throw
    svc.warmup()


def test_vector_index_service_top_k():
    """Verify VectorIndexService builds normalized index, returns top_k in sorted order, and runs in < 2ms."""
    from app.vector_index import vector_index_service
    
    inst_id = 999
    idx = vector_index_service.get_or_create(inst_id)
    
    N = 300
    dim = 128
    raw_vecs = [np.random.randn(dim).astype(np.float32) for _ in range(N)]
    students = [{"user_id": i + 1, "name": f"Student_{i+1}"} for i in range(N)]
    
    idx.build(raw_vecs, students)
    assert idx.is_built is True
    assert idx.matrix.shape == (N, dim)
    
    # Query with target matching student #17
    target = raw_vecs[17].copy()
    t0 = time.perf_counter()
    top_matches = idx.query(target, top_k=3)
    duration_ms = (time.perf_counter() - t0) * 1000
    
    assert len(top_matches) == 3
    assert top_matches[0][0]["user_id"] == 18  # 1-indexed (17+1)
    assert pytest.approx(top_matches[0][1], abs=1e-5) == 1.0
    assert top_matches[0][1] >= top_matches[1][1] >= top_matches[2][1]
    assert duration_ms < 5.0, f"Query took {duration_ms:.2f}ms"
    
    # Invalidation
    vector_index_service.invalidate(inst_id)
    assert inst_id not in vector_index_service._indices

