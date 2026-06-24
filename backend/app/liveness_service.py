"""Server-side liveness challenge: blink sequence validation."""
import secrets
import time
from typing import Dict, List, Optional

from .cache_service import cache_get, cache_set, cache_delete

CHALLENGE_TTL = 120


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
    }, ttl=CHALLENGE_TTL)
    return {
        "challenge_id": challenge_id,
        "instructions": "Perform the blink pattern shown",
        "sequence_labels": sequence,
        "expires_in_seconds": CHALLENGE_TTL,
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
    if step != expected:
        cache_delete(f"liveness:{challenge_id}")
        return {"valid": False, "error": f"Wrong step. Expected {expected}, got {step}"}

    if step == "blink" and ear_value > 0.22:
        return {"valid": False, "error": "Eyes not closed enough for blink"}
    if step == "open" and ear_value < 0.18:
        return {"valid": False, "error": "Eyes not open enough"}

    data["completed_steps"].append(step)
    cache_set(f"liveness:{challenge_id}", data, ttl=CHALLENGE_TTL)

    if len(data["completed_steps"]) == len(sequence):
        token = secrets.token_hex(24)
        cache_set(f"liveness:token:{token}", {
            "user_email": data["user_email"],
            "verified_at": time.time(),
        }, ttl=60)
        cache_delete(f"liveness:{challenge_id}")
        return {"valid": True, "completed": True, "liveness_token": token}

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
