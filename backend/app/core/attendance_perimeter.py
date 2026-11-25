from fastapi import HTTPException
from app import security_utils
from app.core import config


def enforce_attendance_perimeter(request, settings, latitude, longitude):

    if settings.ip_restriction_enabled:
        client_ip = security_utils.get_client_ip(request, config.TRUST_PROXY_HEADERS)
        if not security_utils.verify_client_ip(
            client_ip,
            settings.allowed_ip_ranges,
            restriction_enabled=True,
        ):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: IP restriction is active. Your IP ({client_ip}) is not authorized."
            )


    if settings.geofencing_enabled:
        if (not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)) or
                not -90 <= latitude <= 90 or not -180 <= longitude <= 180):
            raise HTTPException(
                status_code=403,
                detail="Access denied: Geofencing is active, but your location coordinates were not provided."
            )
        if not security_utils.verify_geofence(latitude, longitude, settings.center_latitude, settings.center_longitude, settings.allowed_radius_meters):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: You are outside the allowed campus coordinates. Check-ins are restricted to the campus boundaries."
            )
