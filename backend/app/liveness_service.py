"""Server-side liveness challenge: blink sequence validation."""
import secrets
import time
from typing import Dict, List, Optional

from .cache_service import cache_get, cache_set, cache_delete

CHALLENGE_TTL = 120
MIN_STEP_INTERVAL_SECONDS = 0.25
MAX_STEP_INTERVAL_SECONDS = 8.0


def create_liveness_challenge(user_email: str) -> Dict:
    """Create a random blink challenge sequence for the client to perform."""
    sequence = secrets.choice([
        ["blink", "open", "blink"],
        ["open", "blink", "blink", "open"],
        ["blink", "open", "open", "blink"],
    ])
    challenge_id = secrets.token_hex(16)
    cache_set(f"liveness:{challenge_id}", {
        "user_email": user_email,
        "sequence": sequence,
        "completed_steps": [],
        "created_at": time.time(),
        "last_step_at": None,
        "quality_scores": [],
    }, ttl=CHALLENGE_TTL)
    return {
        "challenge_id": challenge_id,
        "instructions": "Perform the blink pattern shown",
        "sequence_labels": sequence,
        "expires_in_seconds": CHALLENGE_TTL,
        "min_step_interval_seconds": MIN_STEP_INTERVAL_SECONDS,
        "max_step_interval_seconds": MAX_STEP_INTERVAL_SECONDS,
    }


def report_liveness_step(challenge_id: str, step: str, ear_value: float) -> Dict:
    """Client reports each liveness step with EAR measurement."""
    data = cache_get(f"liveness:{challenge_id}")
    if not data:
        return {"valid": False, "error": "Challenge expired or not found"}

    expected_idx = len(data.get("completed_steps", []))
    sequence: List[str] = data["sequence"]
    if expected_idx >= len(sequence):
        return {"valid": False, "error": "Challenge already completed"}

    expected = sequence[expected_idx]
    now = time.time()
    last_step_at = data.get("last_step_at") or data.get("created_at") or now
    elapsed = now - last_step_at
    if elapsed < MIN_STEP_INTERVAL_SECONDS:
        cache_delete(f"liveness:{challenge_id}")
        return {"valid": False, "error": "Challenge steps were reported too quickly. Please retry live."}
    if elapsed > MAX_STEP_INTERVAL_SECONDS:
        cache_delete(f"liveness:{challenge_id}")
        return {"valid": False, "error": "Challenge step timed out. Please retry."}

    if step != expected:
        cache_delete(f"liveness:{challenge_id}")
        return {"valid": False, "error": f"Wrong step. Expected {expected}, got {step}"}

    if step == "blink" and ear_value > 0.22:
        return {"valid": False, "error": "Eyes not closed enough for blink"}
    if step == "open" and ear_value < 0.18:
        return {"valid": False, "error": "Eyes not open enough"}

    data["completed_steps"].append(step)
    data["last_step_at"] = now
    if step == "blink":
        data["quality_scores"].append(max(0.0, min(1.0, (0.22 - ear_value) / 0.22)))
    else:
        data["quality_scores"].append(max(0.0, min(1.0, (ear_value - 0.18) / 0.18)))
    cache_set(f"liveness:{challenge_id}", data, ttl=CHALLENGE_TTL)

    if len(data["completed_steps"]) == len(sequence):
        token = secrets.token_hex(24)
        quality_scores = data.get("quality_scores") or []
        quality_score = round(sum(quality_scores) / len(quality_scores), 3) if quality_scores else 0.0
        cache_set(f"liveness:token:{token}", {
            "user_email": data["user_email"],
            "verified_at": time.time(),
            "quality_score": quality_score,
            "steps": len(sequence),
        }, ttl=60)
        cache_delete(f"liveness:{challenge_id}")
        return {"valid": True, "completed": True, "liveness_token": token, "quality_score": quality_score}

    return {
        "valid": True,
        "completed": False,
        "next_step": sequence[expected_idx + 1],
        "progress": f"{len(data['completed_steps'])}/{len(sequence)}",
    }


def verify_liveness_token(token: str, user_email: str) -> bool:
    data = cache_get(f"liveness:token:{token}")
    if not data:
        return False
    if data.get("user_email") != user_email:
        return False
    cache_delete(f"liveness:token:{token}")
    return True
