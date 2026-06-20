from fastapi import APIRouter
from . import auth, users, attendance, settings, subjects, health, feedback

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(subjects.router, prefix="", tags=["Subjects & Schedules"])
api_router.include_router(health.router, prefix="/health", tags=["Health Check"])
api_router.include_router(feedback.router, prefix="/feedbacks", tags=["Feedback"])


