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
        allow_headers=["*"],
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
