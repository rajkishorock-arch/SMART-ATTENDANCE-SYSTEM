"""Abstract file storage: local disk or S3-compatible cloud."""
import os
import uuid
from typing import Optional

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")
S3_BUCKET = os.getenv("S3_BUCKET", "")
S3_REGION = os.getenv("S3_REGION", "ap-south-1")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "")
S3_ENDPOINT = os.getenv("S3_ENDPOINT", "")

LOCAL_DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "..",
    "data",
)


def _ensure_local_dir() -> str:
    path = os.path.abspath(LOCAL_DATA_DIR)
    os.makedirs(path, exist_ok=True)
    return path


def save_face_image(data: bytes, prefix: str = "face") -> str:
    """Save face image bytes and return storage path or URL."""
    filename = f"{prefix}_{uuid.uuid4().hex[:12]}.jpg"

    if STORAGE_BACKEND == "s3" and S3_BUCKET and S3_ACCESS_KEY:
        try:
            import boto3
            client = boto3.client(
                "s3",
                region_name=S3_REGION,
                aws_access_key_id=S3_ACCESS_KEY,
                aws_secret_access_key=S3_SECRET_KEY,
                endpoint_url=S3_ENDPOINT or None,
            )
            key = f"faces/{filename}"
            client.put_object(Bucket=S3_BUCKET, Key=key, Body=data, ContentType="image/jpeg")
            if S3_ENDPOINT:
                return f"{S3_ENDPOINT}/{S3_BUCKET}/{key}"
            return f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{key}"
        except Exception as e:
            print(f"S3 upload failed, falling back to local: {e}")

    local_dir = _ensure_local_dir()
    filepath = os.path.join(local_dir, filename)
    with open(filepath, "wb") as f:
        f.write(data)
    return filepath


def delete_file(path_or_url: str) -> bool:
    if not path_or_url:
        return False
    if path_or_url.startswith("http"):
        return False
    try:
        if os.path.exists(path_or_url):
            os.remove(path_or_url)
            return True
    except Exception:
        pass
    return False


def get_public_url(path_or_url: str) -> Optional[str]:
    if path_or_url.startswith("http"):
        return path_or_url
    return None
