from fastapi import APIRouter
from . import auth, users, attendance, settings, subjects, health, feedback, chat, institutions, departments
from . import liveness, bulk_import, analytics, parents, billing, sso, erp, audit_router, enrollment, offline_sync, schedules_auto, premium, interactive, enterprise, extreme, ideas150, features7_router
from . import leave
# New feature routers
from . import emotion_detection, predicted_risk, websocket_sync, exam_proctoring, gamification
from . import visitor_management, staff_attendance, report_card, whatsapp_bot, fatigue_detection
from . import attention_tracking, timetable_generator, crowd_heatmap, qr_attendance, multi_campus
from . import custom_report_builder, benchmarking, fee_attendance_link, cctv_integration
from . import blockchain_ledger, mfa_admin, wellness_score, rewards_system, proxy_detection
from . import age_estimation, task_queue, edge_mode, i18n_support, seating_chart, wearable_api
from . import offline_face

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(subjects.router, prefix="", tags=["Subjects & Schedules"])
api_router.include_router(health.router, prefix="/health", tags=["Health Check"])
api_router.include_router(feedback.router, prefix="/feedbacks", tags=["Feedback"])
api_router.include_router(chat.router, prefix="/chat", tags=["AI Chatbot"])
api_router.include_router(institutions.router, prefix="/institutions", tags=["Institutions"])
api_router.include_router(departments.router, prefix="/departments", tags=["Departments"])
api_router.include_router(liveness.router, prefix="/liveness", tags=["Liveness"])
api_router.include_router(bulk_import.router, prefix="/bulk-import", tags=["Bulk Import"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(parents.router, prefix="/parents", tags=["Parents"])
api_router.include_router(billing.router, prefix="/billing", tags=["Billing"])
api_router.include_router(sso.router, prefix="/sso", tags=["SSO"])
api_router.include_router(erp.router, prefix="/erp", tags=["ERP API"])
api_router.include_router(audit_router.router, prefix="/audit", tags=["Audit Trail"])
api_router.include_router(enrollment.router, prefix="/enrollment", tags=["Enrollment"])
api_router.include_router(offline_sync.router, prefix="/offline", tags=["Offline Sync"])
api_router.include_router(schedules_auto.router, prefix="/schedules-auto", tags=["Auto Session"])
api_router.include_router(premium.router, prefix="/premium", tags=["Premium Access"])
api_router.include_router(interactive.router, prefix="/interactive", tags=["Interactive Features"])
api_router.include_router(enterprise.router, prefix="/enterprise", tags=["Industry Enterprise"])
api_router.include_router(extreme.router, prefix="/extreme", tags=["Extreme Level 1-8"])
api_router.include_router(ideas150.router, prefix="/ideas150", tags=["Ideas Hub 150"])
api_router.include_router(features7_router.router, prefix="", tags=["7 Enterprise Features Expansion"])

# Fixed leave router (now properly auth-protected & multi-tenant)
api_router.include_router(leave.router, prefix="", tags=["Leave Management"])

# ── New 40 Features ──────────────────────────────────────────────────────────
api_router.include_router(emotion_detection.router,      prefix="/emotion",       tags=["Emotion Detection"])
api_router.include_router(predicted_risk.router,         prefix="/risk",          tags=["Predicted Attendance Risk"])
api_router.include_router(websocket_sync.router,         prefix="/live",          tags=["Live WebSocket Sync"])
api_router.include_router(exam_proctoring.router,        prefix="/proctoring",    tags=["Exam Proctoring"])
api_router.include_router(gamification.router,           prefix="/gamification",  tags=["Gamification"])
api_router.include_router(visitor_management.router,     prefix="/visitors",      tags=["Visitor Management"])
api_router.include_router(staff_attendance.router,       prefix="/staff-attendance", tags=["Staff Attendance"])
api_router.include_router(report_card.router,            prefix="/report-card",   tags=["Report Card"])
api_router.include_router(whatsapp_bot.router,           prefix="/whatsapp-bot",  tags=["WhatsApp Bot"])
api_router.include_router(fatigue_detection.router,      prefix="/fatigue",       tags=["Fatigue Detection"])
api_router.include_router(attention_tracking.router,     prefix="/attention",     tags=["Attention Tracking"])
api_router.include_router(timetable_generator.router,    prefix="/timetable",     tags=["Smart Timetable"])
api_router.include_router(crowd_heatmap.router,          prefix="/heatmap",       tags=["Crowd Heatmap"])
api_router.include_router(qr_attendance.router,          prefix="/qr",            tags=["QR Attendance"])
api_router.include_router(multi_campus.router,           prefix="/campus",        tags=["Multi-Campus"])
api_router.include_router(custom_report_builder.router,  prefix="/report-builder",tags=["Custom Report Builder"])
api_router.include_router(benchmarking.router,           prefix="/benchmark",     tags=["Benchmarking"])
api_router.include_router(fee_attendance_link.router,    prefix="/fee-link",      tags=["Fee Attendance Link"])
api_router.include_router(cctv_integration.router,       prefix="/cctv",          tags=["CCTV Integration"])
api_router.include_router(blockchain_ledger.router,      prefix="/blockchain",    tags=["Blockchain Ledger"])
api_router.include_router(mfa_admin.router,              prefix="/mfa",           tags=["MFA Admin"])
api_router.include_router(wellness_score.router,         prefix="/wellness",      tags=["Wellness Score"])
api_router.include_router(rewards_system.router,         prefix="/rewards",       tags=["Rewards System"])
api_router.include_router(proxy_detection.router,        prefix="/proxy",         tags=["Proxy Detection"])
api_router.include_router(age_estimation.router,         prefix="/age",           tags=["Age Estimation"])
api_router.include_router(task_queue.router,             prefix="/tasks",         tags=["Task Queue"])
api_router.include_router(edge_mode.router,              prefix="/edge",          tags=["Edge Computing"])
api_router.include_router(i18n_support.router,           prefix="/i18n",          tags=["i18n Support"])
api_router.include_router(seating_chart.router,          prefix="/seating",       tags=["Seating Chart"])
api_router.include_router(wearable_api.router,           prefix="/wearable",      tags=["Wearable Integration"])
api_router.include_router(offline_face.router,           prefix="/offline-face",  tags=["Offline Face Recognition"])



