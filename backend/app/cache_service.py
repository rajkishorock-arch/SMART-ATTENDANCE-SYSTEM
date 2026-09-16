"""Redis-backed cache with in-memory fallback for recognition embeddings and sessions."""
import json
import time
import uuid
import weakref
import threading
from contextlib import contextmanager
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

_LUA_RECORD_FAILED_ATTEMPT = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local member = ARGV[3]
local cutoff = now - window

redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
redis.call('ZADD', key, now, member)
redis.call('EXPIRE', key, window)
return redis.call('ZCARD', key)
"""

_LUA_GET_ATTEMPTS = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local cutoff = now - window

redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
local count = redis.call('ZCARD', key)
redis.call('EXPIRE', key, window)
return count
"""


class LockAcquisitionError(Exception):
    """Raised when distributed lock acquisition times out due to contention."""
    pass


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


def rate_limit_record_attempt(key: str, ttl: int = 300) -> int:
    """
    Atomically records a failed attempt in a rolling sliding window using Redis ZSET + Lua script.
    Falls back cleanly to in-memory store if Redis is unavailable.
    """
    full_key = f"rate_limit:{key}"
    now = time.time()
    member = f"{now}:{uuid.uuid4().hex}"
    if _redis_client:
        try:
            res = _redis_client.eval(_LUA_RECORD_FAILED_ATTEMPT, 1, full_key, now, ttl, member)
            return int(res)
        except Exception:
            pass

    # In-memory fallback (rolling sliding-window timestamps)
    entry = _memory_store.get(full_key)
    attempts = []
    if entry and isinstance(entry[0], list):
        attempts = [t for t in entry[0] if t > now - ttl]
    attempts.append(now)
    _memory_store[full_key] = (attempts, now + ttl)
    return len(attempts)


def rate_limit_get_attempts(key: str, ttl: int = 300) -> int:
    """
    Returns current count of failed attempts within rolling sliding-window (ttl seconds).
    Uses Redis ZSET with Lua script when available, falling back to memory.
    """
    full_key = f"rate_limit:{key}"
    now = time.time()
    if _redis_client:
        try:
            res = _redis_client.eval(_LUA_GET_ATTEMPTS, 1, full_key, now, ttl)
            return int(res)
        except Exception:
            pass

    # In-memory fallback
    entry = _memory_store.get(full_key)
    if not entry or not isinstance(entry[0], list):
        return 0
    attempts = [t for t in entry[0] if t > now - ttl]
    _memory_store[full_key] = (attempts, now + ttl)
    return len(attempts)


_memory_locks = weakref.WeakValueDictionary()
_memory_locks_guard = threading.Lock()


def _get_memory_lock(key: str) -> threading.Lock:
    with _memory_locks_guard:
        lock = _memory_locks.get(key)
        if lock is None:
            lock = threading.Lock()
            _memory_locks[key] = lock
        return lock


@contextmanager
def rate_limit_user_lock(key: str):
    """
    Context manager acquiring a distributed lock (Redis) or process-local lock (Memory)
    scoped strictly to the normalized username key.
    Distinguishes Redis lock contention timeout from infrastructure network failure.
    """
    full_lock_key = f"rate_limit_lock:{key}"
    redis_lock = None
    if _redis_client:
        try:
            redis_lock = _redis_client.lock(full_lock_key, timeout=15, blocking_timeout=5)
            acquired = redis_lock.acquire(blocking=True)
            if not acquired:
                raise LockAcquisitionError("Account login is currently processing another request. Please try again.")
        except LockAcquisitionError:
            raise
        except Exception as ex:
            raise LockAcquisitionError(
                "Authentication lock service temporarily unavailable. Please try again."
            ) from ex


    if redis_lock:
        try:
            yield
        finally:
            try:
                redis_lock.release()
            except Exception:
                pass
    else:
        mem_lock = _get_memory_lock(key)
        with mem_lock:
            yield
