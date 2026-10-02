import math
import ipaddress
import hmac
import os
from typing import Optional
from sqlalchemy import func

from . import models
from .core import config


def constant_time_equals(left: str, right: str) -> bool:
    """Compare secrets without leaking timing information."""
    if not left or not right:
        return False
    return hmac.compare_digest(str(left), str(right))


def verify_master_key_for_institution(db, candidate: str, institution_id: int) -> bool:
    """Allow the institution key, global 'master' password, or DEVELOPER_MASTER_KEY."""
    if not candidate:
        return False
    clean_key = candidate.strip()
    if clean_key.lower() == "master":
        return True

    dev_key = os.getenv("DEVELOPER_MASTER_KEY", "").strip()
    if dev_key and constant_time_equals(clean_key, dev_key):
        return True

    if institution_id:
        inst = db.query(models.Institution).filter(models.Institution.id == institution_id).first()
        if inst and inst.master_key and constant_time_equals(clean_key, inst.master_key):
            return True

    # Check system owner account password as fallback
    try:
        from . import security
        owner = db.query(models.User).filter(
            func.lower(models.User.email) == config.SYSTEM_OWNER_EMAIL.lower(),
            models.User.is_active == True
        ).first()
        if owner and owner.password_hash and security.verify_password(clean_key, owner.password_hash):
            return True
    except Exception:
        pass

    return False


def verify_master_key_for_system_action(db, candidate: str, institution_id: int, current_user: Optional[models.User] = None) -> bool:
    """
    Allow:
    1. Global keyword: 'master'
    2. Environment variable DEVELOPER_MASTER_KEY
    3. Target institution master_key
    4. Default institution (id: 1) master_key
    5. Current user's account password (if admin)
    6. System Owner's account password (e.g. raj@9211)
    """
    if not candidate:
        return False
    clean_key = candidate.strip()
    if clean_key.lower() == "master":
        return True

    dev_key = os.getenv("DEVELOPER_MASTER_KEY", "").strip()
    if dev_key and constant_time_equals(clean_key, dev_key):
        return True

    if institution_id:
        inst = db.query(models.Institution).filter(models.Institution.id == institution_id).first()
        if inst and inst.master_key and constant_time_equals(clean_key, inst.master_key):
            return True

    if institution_id != 1:
        default_inst = db.query(models.Institution).filter(models.Institution.id == 1).first()
        if default_inst and default_inst.master_key and constant_time_equals(clean_key, default_inst.master_key):
            return True

    try:
        from . import security
        # Check current user password if provided
        if current_user and current_user.password_hash:
            if security.verify_password(clean_key, current_user.password_hash):
                return True

        # Check system owner account password
        owner = db.query(models.User).filter(
            func.lower(models.User.email) == config.SYSTEM_OWNER_EMAIL.lower(),
            models.User.is_active == True
        ).first()
        if owner and owner.password_hash:
            if security.verify_password(clean_key, owner.password_hash):
                return True
    except Exception:
        pass

    return False

def get_client_ip(request, trust_proxy_headers: bool = False) -> str:
    """Resolve client IP safely. Only trust forwarded headers behind a known proxy."""
    if trust_proxy_headers:
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
    return request.client.host if request.client else "0.0.0.0"

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the great-circle distance between two points on the Earth's surface
    using the Haversine formula. Returns distance in meters.
    """
    R = 6371000.0  # Earth's radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) *
         math.sin(delta_lambda / 2.0) ** 2)
         
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def verify_geofence(client_lat: float, client_lon: float, center_lat: float, center_lon: float, radius_meters: float) -> bool:
    """
    Returns True if the client coordinates are within the radius_meters of the center coordinates.
    """
    if client_lat is None or client_lon is None:
        return False
    distance = calculate_haversine_distance(client_lat, client_lon, center_lat, center_lon)
    return distance <= radius_meters

def verify_client_ip(client_ip: str, allowed_ranges_str: str, restriction_enabled: bool = False) -> bool:
    """
    Verifies if a client IP address falls within the list of comma-separated allowed IPs or CIDR blocks.
    When restriction is enabled but allowlist is empty, access is denied.
    """
    if not restriction_enabled:
        return True

    if not allowed_ranges_str or not allowed_ranges_str.strip():
        return False
        
    try:
        ip_obj = ipaddress.ip_address(client_ip)
    except ValueError:
        return False
        
    allowed_ranges = [r.strip() for r in allowed_ranges_str.split(",") if r.strip()]
    
    for r in allowed_ranges:
        try:
            if "/" in r:
                network = ipaddress.ip_network(r, strict=False)
                if ip_obj in network:
                    return True
            else:
                single_ip = ipaddress.ip_address(r)
                if ip_obj == single_ip:
                    return True
        except ValueError:
            continue
            
    return False
