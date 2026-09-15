"""models package — Modular domain models with backward-compatible re-exports"""
from app.models.base import Base
from app.models.institution import Institution, Department, ApiKey, SubscriptionPayment, MarketplacePlugin
from app.models.user import User, ParentAccount, StaffAttendance, StaffPayrollRecord, StaffAttendanceLog, PayrollRecord, MfaChallenge
from app.models.student import StudentModel, FaceEnrollmentSample, ReEnrollmentRequest
from app.models.attendance import Subject, Schedule, AttendanceModel, OfflineAttendanceQueue, AttendanceRule, AttendanceChainHash, OfflineSyncLog, AttendanceDispute, DisputeComment, LowConfidenceReview, AttendanceIntervention
from app.models.qr import ConsumedQrToken, AttendanceFallbackSession, AttendanceFallbackClaim
from app.models.leave import LeaveRequest, SubstituteAssignment, EscalationCase
from app.models.wellness import MentalHealthCheckin, EmotionLog, PredictedRisk, FatigueLog, AttentionLog, WellnessCheckin
from app.models.audit import AuditLog, VisitorLog, ReportCard
from app.models.settings import SystemSettings, Feedback, CustomReportConfig, SavedReport, I18nTranslation, TaskQueue, LmsIntegrationConfig, LmsSyncJobLog
from app.models.device import AttendanceDevice, DeviceHeartbeatLog, HardwareGateNode, HardwareGateLog, EdgeNode, CctvStream, WearableCheckIn, ProxyAlert, SeatingChart
from app.models.notification import NotificationModel, DeviceTokenModel, NotificationPreferenceModel
from app.models.calendar import CalendarEvent
from app.models.gamification import GamificationBadge, StudentBadge, RewardRedemption, PeerStudyGroup, InteractivePoll, BotConversationLog, ExamSession, ExamProctorLog, GeneratedTimetable, CrowdSnapshot, FeeAttendanceFlag, BlockchainBlock, ExtremeFeatureRecord

__all__ = ['Base', 'Institution', 'Department', 'ApiKey', 'SubscriptionPayment', 'MarketplacePlugin', 'User', 'ParentAccount', 'StaffAttendance', 'StaffPayrollRecord', 'StaffAttendanceLog', 'PayrollRecord', 'MfaChallenge', 'StudentModel', 'FaceEnrollmentSample', 'ReEnrollmentRequest', 'Subject', 'Schedule', 'AttendanceModel', 'OfflineAttendanceQueue', 'AttendanceRule', 'AttendanceChainHash', 'OfflineSyncLog', 'AttendanceDispute', 'DisputeComment', 'LowConfidenceReview', 'AttendanceIntervention', 'ConsumedQrToken', 'AttendanceFallbackSession', 'AttendanceFallbackClaim', 'LeaveRequest', 'SubstituteAssignment', 'EscalationCase', 'MentalHealthCheckin', 'EmotionLog', 'PredictedRisk', 'FatigueLog', 'AttentionLog', 'WellnessCheckin', 'AuditLog', 'VisitorLog', 'ReportCard', 'SystemSettings', 'Feedback', 'CustomReportConfig', 'SavedReport', 'I18nTranslation', 'TaskQueue', 'LmsIntegrationConfig', 'LmsSyncJobLog', 'AttendanceDevice', 'DeviceHeartbeatLog', 'HardwareGateNode', 'HardwareGateLog', 'EdgeNode', 'CctvStream', 'WearableCheckIn', 'ProxyAlert', 'SeatingChart', 'NotificationModel', 'DeviceTokenModel', 'NotificationPreferenceModel', 'CalendarEvent', 'GamificationBadge', 'StudentBadge', 'RewardRedemption', 'PeerStudyGroup', 'InteractivePoll', 'BotConversationLog', 'ExamSession', 'ExamProctorLog', 'GeneratedTimetable', 'CrowdSnapshot', 'FeeAttendanceFlag', 'BlockchainBlock', 'ExtremeFeatureRecord']
