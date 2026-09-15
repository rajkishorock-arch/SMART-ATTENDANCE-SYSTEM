"""
Domain and Application Exceptions for SMART-ATTENDANCE-SYSTEM.
Provides standardized exception types that map cleanly to HTTP status codes.
"""
from typing import Optional, Any


class AppException(Exception):
    """Base application exception."""
    def __init__(self, message: str, status_code: int = 500, details: Optional[Any] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details


class TenantAccessDenied(AppException):
    """Cross-tenant boundary violation (HTTP 403)."""
    def __init__(self, message: str = "Cross-tenant access forbidden: Cannot access data belonging to another institution."):
        super().__init__(message=message, status_code=403)


class ResourceNotFound(AppException):
    """Requested resource does not exist (HTTP 404)."""
    def __init__(self, message: str = "Requested resource not found."):
        super().__init__(message=message, status_code=404)


class ResourceConflict(AppException):
    """Duplicate or concurrent conflict (HTTP 409)."""
    def __init__(self, message: str = "Conflict detected."):
        super().__init__(message=message, status_code=409)


class InvalidTokenError(AppException):
    """Malformed, invalid, or expired security token (HTTP 400)."""
    def __init__(self, message: str = "Invalid or expired token."):
        super().__init__(message=message, status_code=400)


class GeofenceBreachError(AppException):
    """Presence verification failed outside trusted geofence (HTTP 403)."""
    def __init__(self, message: str = "Physical classroom presence verification failed: Out of geofence bounds."):
        super().__init__(message=message, status_code=403)
