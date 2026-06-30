import base64
import hashlib
from cryptography.fernet import Fernet
from app.core import config

# Fetch key from environment or config
encryption_key = getattr(config, "BIOMETRIC_ENCRYPTION_KEY", "")
if not encryption_key:
    # Use config.JWT_SECRET_KEY to derive a stable base64 url-safe 32-byte key
    jwt_secret = getattr(config, "JWT_SECRET_KEY", "local-dev-secret-key-change-before-production-use")
    digest = hashlib.sha256(jwt_secret.encode()).digest()
    encryption_key = base64.urlsafe_b64encode(digest).decode()

try:
    cipher_suite = Fernet(encryption_key.encode())
except Exception as e:
    # If the key was invalid, fall back to a derived key from JWT_SECRET_KEY
    print(f"Provided BIOMETRIC_ENCRYPTION_KEY was invalid: {e}. Falling back to derived key.")
    jwt_secret = getattr(config, "JWT_SECRET_KEY", "local-dev-secret-key-change-before-production-use")
    digest = hashlib.sha256(jwt_secret.encode()).digest()
    encryption_key = base64.urlsafe_b64encode(digest).decode()
    cipher_suite = Fernet(encryption_key.encode())

def encrypt_embedding(embedding_json: str) -> str:
    """Encrypt a face embedding JSON string."""
    if not embedding_json:
        return None
    try:
        encrypted_bytes = cipher_suite.encrypt(embedding_json.encode())
        return encrypted_bytes.decode()
    except Exception as e:
        print(f"Encryption failed: {e}")
        return embedding_json

def decrypt_embedding(encrypted_str: str) -> str:
    """Decrypt a face embedding JSON string.
    If decryption fails, returns original string (backward compatibility fallback).
    """
    if not encrypted_str:
        return None
    try:
        # Fernet tokens usually start with gAAAA
        if encrypted_str.startswith("gAAAA"):
            decrypted_bytes = cipher_suite.decrypt(encrypted_str.encode())
            return decrypted_bytes.decode()
        return encrypted_str
    except Exception as e:
        print(f"Decryption failed: {e}. Returning raw embedding data.")
        return encrypted_str
