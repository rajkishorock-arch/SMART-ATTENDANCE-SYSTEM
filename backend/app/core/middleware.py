"""
Core HTTP Middlewares: CORS configuration and security/timing headers.
"""
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import CORS_ORIGINS


def setup_middlewares(app: FastAPI) -> None:
    """Configures CORS and security/timing HTTP middleware on FastAPI application."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_origin_regex=r"https://([a-zA-Z0-9-]+\.)*vercel\.app|https://([a-zA-Z0-9-]+\.)*onrender\.com|https?://localhost(:\d+)?|capacitor://localhost|https?://10\.\d+\.\d+\.\d+(:\d+)?|https?://192\.168\.\d+\.\d+(:\d+)?",
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "Accept",
            "Origin",
            "User-Agent",
            "DNT",
            "Cache-Control",
            "X-Mx-ReqToken",
            "X-Requested-With",
            "X-Master-Password",
            "x-master-password",
            "X-Master-Key",
            "x-master-key",
            "x-institution-id",
            "x-device-id",
            "x-client-version",
            "*"
        ],
    )

    @app.middleware("http")
    async def add_security_and_timing_headers(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
        response.headers["Server-Timing"] = f"app;dur={duration_ms:.2f}"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if duration_ms > 1000:
            print(f"[SLOW ENDPOINT WARNING] {request.method} {request.url.path} took {duration_ms:.2f}ms")
        return response


def setup_exception_handlers(app: FastAPI) -> None:
    """Configures centralized exception handlers for domain AppException and sanitizes production errors."""
    import logging
    from fastapi.responses import JSONResponse
    from app.core.exceptions import AppException
    from app.core.config import ENV

    logger = logging.getLogger("app.exception")

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.message,
                "detail": exc.message,  # Preserved for backward compatibility
                "error": {
                    "code": exc.__class__.__name__,
                    "details": exc.details,
                },
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled server error on {request.method} {request.url.path}: {exc}")
        is_prod = (ENV == "production")
        msg = "An unexpected internal server error occurred." if is_prod else str(exc)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": msg,
                "detail": "Internal server error." if is_prod else msg,
                "error": {
                    "code": "InternalServerError",
                    "details": None if is_prod else str(exc),
                },
            },
        )
