import math
import ipaddress

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
