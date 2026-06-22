"""Redis-backed cache with in-memory fallback for recognition embeddings and sessions."""
import json
import time
from typing import Any, Optional

try:
    import redis
    _redis_client = None
    _REDIS_URL = __import__("os").getenv("REDIS_URL", "")
    if _REDIS_URL:
        _redis_client = redis.from_url(_REDIS_URL, decode_responses=True)
        _redis_client.ping()
except Exception:
    _redis_client = None

_memory_store: dict[str, tuple[Any, float]] = {}
_DEFAULT_TTL = 3600


def _mem_get(key: str) -> Optional[Any]:
    entry = _memory_store.get(key)
    if not entry:
        return None
    value, expires = entry
    if expires and time.time() > expires:
        del _memory_store[key]
        return None
    return value


def _mem_set(key: str, value: Any, ttl: int = _DEFAULT_TTL) -> None:
    _memory_store[key] = (value, time.time() + ttl if ttl else 0)


def cache_get(key: str) -> Optional[Any]:
    if _redis_client:
        try:
            raw = _redis_client.get(key)
            return json.loads(raw) if raw else None
        except Exception:
            pass
    return _mem_get(key)


def cache_set(key: str, value: Any, ttl: int = _DEFAULT_TTL) -> None:
    if _redis_client:
        try:
            _redis_client.setex(key, ttl, json.dumps(value))
            return
        except Exception:
            pass
    _mem_set(key, value, ttl)


def cache_delete(key: str) -> None:
    if _redis_client:
        try:
            _redis_client.delete(key)
        except Exception:
            pass
    _memory_store.pop(key, None)


def cache_delete_pattern(prefix: str) -> None:
    if _redis_client:
        try:
            for k in _redis_client.scan_iter(f"{prefix}*"):
                _redis_client.delete(k)
        except Exception:
            pass
    to_del = [k for k in _memory_store if k.startswith(prefix)]
    for k in to_del:
        del _memory_store[k]


def recognition_cache_key(institution_id: int) -> str:
    return f"recognition:embeddings:{institution_id}"


def bump_recognition_version(institution_id: int) -> int:
    key = f"recognition:version:{institution_id}"
    if _redis_client:
        try:
            return int(_redis_client.incr(key))
        except Exception:
            pass
    current = _mem_get(key) or 0
    new_val = int(current) + 1
    _mem_set(key, new_val, ttl=0)
    return new_val


def get_recognition_version(institution_id: int) -> int:
    key = f"recognition:version:{institution_id}"
    if _redis_client:
        try:
            v = _redis_client.get(key)
            return int(v) if v else 0
        except Exception:
            pass
    return int(_mem_get(key) or 0)
