import { startLivenessChallenge, reportLivenessStep } from './utils/livenessClient';
import { attendanceCoordinates } from './utils/attendanceCoordinates';
import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { isNative, getApiBaseUrl, requestNativePermissions, saveAndShareFile } from './utils/platform';
import { triggerNativeHaptic } from './utils/nativeMobile';
import { initKeepAliveEngine } from './utils/keepAlive';
import { fetchWithDedupe, clearApiClientCache } from './utils/apiClient';
import { studentApi, teacherApi, attendanceApi, systemApi, apiGet } from './api/index.js';
import ScannerBootOverlay from './ScannerBootOverlay';
import BottomNav from './components/BottomNav';
import LoginPortal from './components/LoginPortal';
import { getActiveTenantSlug } from './utils/tenantConfig';
import useAuth from './hooks/useAuth';
import useTenant from './hooks/useTenant';
import useUI from './hooks/useUI';
import MobileControlPanel from './components/MobileControlPanel';
import ConsentModal from './components/ConsentModal';
import CyberBotWidget from './components/CyberBotWidget';
import FeedbackModal from './components/FeedbackModal';
import UpdateNotification from './components/UpdateNotification';
import NotificationBell from './components/NotificationBell';
import { useFeedback, useUpdateChecker, useOnboarding, useOfflineSync, useNotifications } from './hooks/index.js';
import PrivacyPolicy from './components/PrivacyPolicy';
import VirtualIdCardModal from './components/VirtualIdCardModal';
import QrScannerModal from './components/QrScannerModal';
import ClassroomKioskModal from './components/ClassroomKioskModal';
import SmartCardNfcModal from './components/SmartCardNfcModal';
import { addToOfflineQueue, getOfflineQueue } from './utils/offlineQueue';
import CameraAttractHud from './components/animations/CameraAttractHud';
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  LogOut, 
  FileSpreadsheet, 
  BookOpen, 
  Info,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  ScanFace,
  Monitor,
  Calendar,
  Globe,
  DollarSign,
  Lock,
  Camera,
  Video,
  RefreshCw,
  SwitchCamera,
  Eye,
  EyeOff,
  Clock,
  History,
  ArrowLeft,
  Bot,
  Megaphone,
  LayoutGrid,
  ChevronRight,
  X,
} from 'lucide-react';
import { openCameraStream, captureFrameBlob, getCaptureDimensions, loadCameraSettings, getCameraPreset, wakeBackend } from './utils/cameraScanner';
import { createFaceDetector, extractFaceBox, drawFaceBox } from './utils/faceDetectionEngine';
import { APP_VERSION } from './utils/versionManager';
import { loadExplorationSettings, triggerConfettiBurst } from './utils/explorationSettings';
import VersionBadge from './components/VersionBadge';

const safeLazy = (importFn) => lazy(async () => {
  try {
    return await importFn();
  } catch (error) {
    console.warn("Chunk loading error detected (new deployment). Reloading page...", error);
    const reloadKey = 'chunk_reload_attempts';
    const attempts = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
    if (attempts < 2) {
      sessionStorage.setItem(reloadKey, (attempts + 1).toString());
      window.location.reload();
      return new Promise(() => {});
    }
    throw error;
  }
});

const AdvancedFeaturesHub = safeLazy(() => import('./components/AdvancedFeaturesHub'));
const PremiumUpgradeHub = safeLazy(() => import('./components/PremiumUpgradeHub'));
const ExplorationLab = safeLazy(() => import('./components/ExplorationLab'));
import CameraSettingsPanel from './components/CameraSettingsPanel';
const FuturisticFeaturesHub = safeLazy(() => import('./components/FuturisticFeaturesHub'));
const IndustryEnterpriseHub = safeLazy(() => import('./components/IndustryEnterpriseHub'));
const ExtremeLevelHub = safeLazy(() => import('./components/ExtremeLevelHub'));
const Ideas150Hub = safeLazy(() => import('./components/Ideas150Hub'));
const Enterprise7FeaturesHub = safeLazy(() => import('./components/Enterprise7FeaturesHub'));
import UniversalSearch from './components/UniversalSearch';
import AttendanceDisputeModal from './components/AttendanceDisputeModal';
import AttendanceDisputesQueue from './components/AttendanceDisputesQueue';
import AcademicCalendarView from './components/AcademicCalendarView';
import LowConfidenceReviewQueue from './components/LowConfidenceReviewQueue';
import DeviceHealthDashboard from './components/DeviceHealthDashboard';
import FaceEnrollmentModal from './components/FaceEnrollmentModal';
import InterventionsManagementView from './components/InterventionsManagementView';
import BiometricFallbackModal from './components/BiometricFallbackModal';
import LmsSyncIntegrationView from './components/LmsSyncIntegrationView';
import StaffPayrollView from './components/StaffPayrollView';
import InstitutionBroadcastModal from './components/InstitutionBroadcastModal';
import CampusBroadcastCenterView from './components/CampusBroadcastCenterView';
import ControlCenterView from './components/ControlCenterView';
import QuickActionsDock from './components/QuickActionsDock';
import OfflineBanner from './components/OfflineBanner';
import { recordScan, speakScanner, triggerHaptic, checkKonamiCode, applyTheme, loadFuturisticSettings } from './utils/futuristicFeatures';
const NewFeaturesHub = safeLazy(() => import('./components/NewFeaturesHub'));
import { fastFaceEngine } from './services/fastFaceEngine';
import { offlineAttendanceQueue } from './services/offlineAttendanceQueue';
const WellnessCounselorPanel = safeLazy(() => import('./components/WellnessCounselorPanel'));
const ARGamificationPortal = safeLazy(() => import('./components/ARGamificationPortal'));
import { getStoredLanguage } from './utils/i18n';
import { ScannerSuccessReceipt, ScannerFallbackOptions } from './components/ScannerSuccessReceipt';
import AccessibilitySettingsModal from './components/AccessibilitySettingsModal';
import PrivacyTrustCenter from './components/PrivacyTrustCenter';
import NotificationDrawerModal from './components/NotificationDrawerModal';
import GeofenceSettings from './components/settings/GeofenceSettings';
import ReleaseSettings from './components/settings/ReleaseSettings';
import InstitutionManagement from './components/settings/InstitutionManagement';
import AdminProfileSettings from './components/settings/AdminProfileSettings';
import LeaveManagementSettings from './components/settings/LeaveManagementSettings';
import AppVersionSettings from './components/settings/AppVersionSettings';
import DepartmentSettings from './components/settings/DepartmentSettings';
import AdminUserManagement from './components/settings/AdminUserManagement';
import ThemeEqualizerSettings from './components/settings/ThemeEqualizerSettings';
import SettingsDirectoryHub from './components/settings/SettingsDirectoryHub';
import FeaturesDirectoryHub from './components/settings/FeaturesDirectoryHub';
import AdvancedBiometricSettings from './components/settings/AdvancedBiometricSettings';
import AdminTeacherDashboardView from './components/dashboard/AdminTeacherDashboardView';
import StudentsDirectoryView from './components/dashboard/StudentsDirectoryView';
import TeachersDirectoryView from './components/dashboard/TeachersDirectoryView';
import AttendanceRegistersView, { AttendanceRegistersHeaderAction } from './components/dashboard/AttendanceRegistersView';
import AttendanceReportsView, { AttendanceReportsHeaderAction } from './components/dashboard/AttendanceReportsView';
import LiveScannerSessionHubView from './components/dashboard/LiveScannerSessionHubView';
import SessionHistoryView from './components/dashboard/SessionHistoryView';
import StudentAttendanceDashboardView from './components/dashboard/StudentAttendanceDashboardView';
import StudentProfileView from './components/dashboard/StudentProfileView';
import HodDashboardView from './components/HodDashboardView';
import ParentDashboardView from './components/ParentDashboardView';

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftDate = (currentDateStr, days, setter, maxDateStr = null) => {
  if (!currentDateStr) return;
  const parts = currentDateStr.split('-');
  if (parts.length !== 3) return;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(d.getTime())) return;
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const nextStr = `${yyyy}-${mm}-${dd}`;
  if (maxDateStr && days > 0 && nextStr > maxDateStr) {
    return;
  }
  setter(nextStr);
};

const isTodayDate = (dateStr) => {
  if (!dateStr) return true;
  const clean = String(dateStr).trim();
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  const isoToday = `${yyyy}-${mm}-${dd}`;
  const dmyDashToday = `${dd}-${mm}-${yyyy}`;
  const dmySlashToday = `${dd}/${mm}/${yyyy}`;
  const ymdSlashToday = `${yyyy}/${mm}/${dd}`;

  if (clean === isoToday || clean === dmyDashToday || clean === dmySlashToday || clean === ymdSlashToday) {
    return true;
  }

  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    let d, m, y;
    if (parts[0].length === 4) {
      y = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      d = parseInt(parts[2], 10);
    } else {
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      y = parseInt(parts[2], 10);
    }
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return y === now.getFullYear() && (m - 1) === now.getMonth() && d === now.getDate();
    }
  }
  return false;
};

const resolvePeriodName = (timeStr) => {
  if (!timeStr) {
    const h = new Date().getHours();
    if (h < 10) return 'Period 1';
    if (h <= 16) return `Period ${h - 8}`;
    return 'Period 8';
  }
  const clean = String(timeStr).trim();
  const m = clean.match(/Period\s*(\d+)/i);
  if (m) return `Period ${m[1]}`;
  const parts = clean.split(':');
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    if (/pm/i.test(clean) && h < 12) h += 12;
    if (/am/i.test(clean) && h === 12) h = 0;
    if (!isNaN(h)) {
      if (h < 10) return 'Period 1';
      if (h <= 16) return `Period ${h - 8}`;
      return 'Period 8';
    }
  }
  return clean;
};

const getPeriodSlotLabel = (periodOrTime) => {
  const p = resolvePeriodName(periodOrTime);
  const labels = {
    'Period 1': 'Period 1 (09:00 - 10:00 AM)',
    'Period 2': 'Period 2 (10:00 - 11:00 AM)',
    'Period 3': 'Period 3 (11:00 - 12:00 PM)',
    'Period 4': 'Period 4 (12:00 - 01:00 PM)',
    'Period 5': 'Period 5 (01:00 - 02:00 PM)',
    'Period 6': 'Period 6 (02:00 - 03:00 PM)',
    'Period 7': 'Period 7 (03:00 - 04:00 PM)',
    'Period 8': 'Period 8 (04:00 - 05:00 PM)',
  };
  return labels[p] || p;
};

const LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144];

function calculateEAR(landmarks, eyeIndices, width, height) {
  const [outer, upper1, upper2, inner, lower2, lower1] = eyeIndices.map(i => landmarks[i]);
  if (![outer, upper1, upper2, inner, lower2, lower1].every(Boolean)) return NaN;
  const distance = (a, b) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
  const span = distance(outer, inner);
  return span > 0 ? (distance(upper1, lower1) + distance(upper2, lower2)) / (2 * span) : NaN;
}

// =====================================================================
// BLUEPRINT DAY BREAKDOWN MODAL - Inspects all real DB logs for a specific date
// =====================================================================
// =====================================================================
// STUDENT STATS ROW WITH INTERACTIVE MODALS - Real DB Data Sync & Click Details
// =====================================================================
// =====================================================================


// =====================================================================
// AI ATTENDANCE FORECASTER & BUNK SIMULATOR CARD
// =====================================================================
function subjectCacheKey(token) {
  try {
    const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!claims.sub || !claims.role || claims.institution_id == null) return null;
    return 'subjects:v1:' + JSON.stringify([getApiBaseUrl(), claims.institution_id, claims.role, claims.sub]);
  } catch {
    return null;
  }
}

function readSubjectCache(key) {
  try {
    const rows = key && JSON.parse(localStorage.getItem(key));
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}

export default function App() {
  const API_BASE_URL = getApiBaseUrl();
  const [masterKeyPrompt, setMasterKeyPrompt] = useState({
    isOpen: false,
    title: '',
    message: '',
    value: '',
    onConfirm: null,
    onCancel: null
  });

  const requestMasterPassword = (title, message) => {
    return new Promise((resolve) => {
      setMasterKeyPrompt({
        isOpen: true,
        title: title || '🔐 Master Key Verification Required',
        message: message || 'Please enter the Developer Master Password to proceed:',
        value: '',
        onConfirm: (val) => resolve(val),
        onCancel: () => resolve(null)
      });
    });
  };

  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [botWakeWordEnabled, setBotWakeWordEnabled] = useState(false);
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const [isVoiceAssistantMode, setIsVoiceAssistantMode] = useState(false);
  const [botVoiceSelected, setBotVoiceSelected] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [showVoicePulseFlash, setShowVoicePulseFlash] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [botSuggestionCategory, setBotSuggestionCategory] = useState('all');
  const [botAttachedImage, setBotAttachedImage] = useState(null);
  const [botAttachedImageMime, setBotAttachedImageMime] = useState('');
  const [botAttachedImageName, setBotAttachedImageName] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [studentError, setStudentError] = useState('');

  const recognitionRef = useRef(null);
  const wakeWordRecRef = useRef(null);
  const voiceAssistantActiveRef = useRef(false);
  const voiceAssistantErrorCountRef = useRef(0);
  const wakeWordErrorCountRef = useRef(0);
  const chatBottomRef = useRef(null);


  const [neuralMeshCanvas, setNeuralMeshCanvas] = useState(null);
  const neuralMeshCanvasRef = useCallback((node) => {
    if (node !== null) {
      setNeuralMeshCanvas(node);
    }
  }, []);

  // Biometric / Sound / Theme States
  const [hudMetrics, setHudMetrics] = useState({ fps: '30.0', lighting: '92%', quality: 'EXCELLENT' });

  const [diagnosticLogs, setDiagnosticLogs] = useState([
    '[SYS] Bios boot sequence completed.',
    '[SYS] Quantum mesh engine idle.'
  ]);
  const [lockdownActive, setLockdownActive] = useState(false);
  const [scannedStudent, setScannedStudent] = useState(null);
  const [showConsentModal, setShowConsentModal] = useState(
    () => localStorage.getItem('biometric_consent') !== 'true'
  );
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const livenessTokenRef = useRef(null);
  const [autoSessionInfo, setAutoSessionInfo] = useState(null);
  const cardDismissTimerRef = useRef(null);

  const showScannedStudentWithTimeout = useCallback((studentData, durationMs = 4000) => {
    if (cardDismissTimerRef.current) {
      clearTimeout(cardDismissTimerRef.current);
      cardDismissTimerRef.current = null;
    }
    setScannedStudent(studentData);
    if (studentData) {
      cardDismissTimerRef.current = setTimeout(() => {
        setScannedStudent(null);
        cardDismissTimerRef.current = null;
      }, durationMs);
    }
  }, []);

  const dismissScannedStudent = useCallback(() => {
    if (cardDismissTimerRef.current) {
      clearTimeout(cardDismissTimerRef.current);
      cardDismissTimerRef.current = null;
    }
    setScannedStudent(null);
  }, []);

  const addDiagnosticLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setDiagnosticLogs((prev) => {
      const updated = [...prev, `[${time}] ${msg}`];
      if (updated.length > 7) {
        return updated.slice(updated.length - 7);
      }
      return updated;
    });
  };



  useEffect(() => {
    if (isNative) {
      document.documentElement.classList.add('native-app');
    }
    const styleStatusBar = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#080c14' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (err) {
        console.warn('Native status bar styling not active:', err);
      }
    };
    styleStatusBar();
  }, []);



  // Authentication Context
  const {
    token,
    setToken,
    userRole,
    setUserRole,
    currentUser,
    setCurrentUser,
    sessionFetchError,
    setSessionFetchError,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    loginRole,
    setLoginRole,
    loginWorkspaceSlug,
    setLoginWorkspaceSlug,
    authError,
    setAuthError,
    isLoading,
    setIsLoading,
    serverWarmingUp,
    setServerWarmingUp,
    activeTelemetry,
    setActiveTelemetry,
    handleLogin: authHandleLogin,
    handleSsoLogin: authHandleSsoLogin,
    handleLogout: authHandleLogout,
    fetchSessionInfo: authFetchSessionInfo,
    sendHeartbeat: authSendHeartbeat,
    fetchActiveUsers: authFetchActiveUsers,
  } = useAuth();

  // Tenant Context
  const {
    tenantSlug,
    tenantBranding,
    loadTenantBranding,
    switchTenant,
    resetTenant,
  } = useTenant();

  // UI Context
  const {
    activeTheme,
    setActiveTheme,
    audioVolume,
    setAudioVolume,
    soundEnabled,
    setSoundEnabled,
    setSynthModulator,
    setSynthPitchScale,
    playCyberSound,
  } = useUI();

  useOfflineSync(token, API_BASE_URL);

  // Sync tenant context with logged-in user's institution automatically
  useEffect(() => {
    if (currentUser?.institution_slug && currentUser.institution_slug !== tenantSlug) {
      switchTenant(currentUser.institution_slug);
    }
  }, [currentUser?.institution_slug, tenantSlug, switchTenant]);

  const handleConsentAccept = async () => {
    localStorage.setItem('biometric_consent', 'true');
    setShowConsentModal(false);
    if (token && userRole === 'student') {
      try {
        await studentApi.submitConsent(token);
      } catch { /* optional */ }
    }
  };

  // Multi-select States
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [selectedTeacherIds, setSelectedTeacherIds] = useState(new Set());
  const [selectedLogIds, setSelectedLogIds] = useState(new Set());

  // Student Portal States
  const [studentLogs, setStudentLogs] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_student_logs');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoadingStudentLogs, setIsLoadingStudentLogs] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showVirtualId, setShowVirtualId] = useState(false);
  const {
    showOnboardingGuide,
    setShowOnboardingGuide,
    showOnboardingTour,
    setShowOnboardingTour,
  } = useOnboarding(token);
  const [liveFaceGrid, setLiveFaceGrid] = useState([]);
  const konamiRef = useRef([]);
  const [showQrScannerModal, setShowQrScannerModal] = useState(false);
  const [showKioskModal, setShowKioskModal] = useState(false);
  const [showSmartCardModal, setShowSmartCardModal] = useState(false);
  
  useEffect(() => {
    initKeepAliveEngine();
    const fx = loadFuturisticSettings();
    applyTheme(fx.themeId || 'default', fx.customPrimary);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (!e || typeof e.key !== 'string') return;
      konamiRef.current = [...konamiRef.current, e.key].slice(-12);
      if (checkKonamiCode(konamiRef.current)) {
        playCyberSound('success');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [geofenceStatus, setGeofenceStatus] = useState({ checked: false, inside: false, distance: null });
  // Subject-wise Blueprint Calendar States
  const [blueprintData, setBlueprintData] = useState([]); // [{subject_id, subject_name, subject_code, calendar: {date->status}}]
  const [blueprintLoading, setBlueprintLoading] = useState(false);
  const [selectedBlueprintSubject, setSelectedBlueprintSubject] = useState(null); // subject_id
  const [blueprintCalendarDate, setBlueprintCalendarDate] = useState(new Date());
  const [showBlueprintDayModal, setShowBlueprintDayModal] = useState(false);
  const [blueprintDayModalDate, setBlueprintDayModalDate] = useState(null);
  
  // Student Portal Change Password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // App Navigation & Modal State
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      const baseHash = hash.split('/')[0].split('?')[0];
      if (baseHash && !['login', 'signup', ''].includes(baseHash)) {
        return baseHash;
      }
      const savedTab = localStorage.getItem('last_active_tab');
      if (savedTab && !['login', 'signup'].includes(savedTab)) {
        return savedTab;
      }
      const savedRole = localStorage.getItem('userRole');
      if (savedRole === 'student') return 'student-attendance';
    } catch { /* ignore fallback error */ }
    return 'dashboard';
  });

  const [activeSubSetting, setActiveSubSetting] = useState(() => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash.startsWith('settings/')) {
        const sub = hash.replace('settings/', '').split('?')[0].trim();
        if (sub) return sub;
      }
      const savedSub = localStorage.getItem('last_active_sub_setting');
      if (savedSub) return savedSub;
    } catch { /* ignore */ }
    return null;
  });

  const [activeDashboardSubTab, setActiveDashboardSubTab] = useState(() => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash.startsWith('dashboard/')) {
        const sub = hash.replace('dashboard/', '').split('?')[0].trim();
        if (['metrics', 'telemetry', 'trends', 'radar', 'diagnostics', 'feedback'].includes(sub)) {
          return sub;
        }
      }
    } catch { /* ignore */ }
    return null;
  });

  // Lifted Teacher, Subject & Timetable sub-route state (synced with header back, hardware back & URL hash)
  const [teachersSubTab, setTeachersSubTab] = useState(() => {
    try {
      const parts = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
      if (parts[0] === 'teachers') {
        if (parts[1] === 'subjects') return 'subjects';
        if (parts[1] === 'timetable') return 'planner';
      }
    } catch { /* ignore */ }
    return 'directory';
  });
  const [teacherFormView, setTeacherFormView] = useState(() => {
    try {
      const parts = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
      if (parts[0] === 'teachers' && parts[1] === 'register') return 'register';
    } catch { /* ignore */ }
    return 'list';
  });
  const [subjectFormView, setSubjectFormView] = useState(() => {
    try {
      const parts = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
      if (parts[0] === 'teachers' && parts[1] === 'subjects' && parts[2] === 'register') return 'register';
    } catch { /* ignore */ }
    return 'list';
  });
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState(null);
  const [showScheduleForm, setShowScheduleForm] = useState(() => {
    try {
      const parts = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
      if (parts[0] === 'teachers' && parts[1] === 'timetable' && parts[2] === 'new') return true;
    } catch { /* ignore */ }
    return false;
  });
  const [settingsDetailRoute, setSettingsDetailRoute] = useState(() => {
    try {
      const parts = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
      if (parts[0] === 'settings' && ['departments', 'leave_management', 'multitenant', 'admins'].includes(parts[1]) && parts[2]) {
        if (parts[2] === 'register' && parts[1] !== 'leave_management') {
          return { sub: parts[1], mode: 'register' };
        }
        return { sub: parts[1], mode: 'detail', id: parts[2] };
      }
    } catch { /* ignore */ }
    return null;
  });

  // Route Scroll Position Preservation (restores exact scroll position on Back navigation)
  const getRouteScrollKey = (tab, subTab, subSet, subDetail = '') => `${tab || ''}|${subTab || ''}|${subSet || ''}|${subDetail || ''}`;
  const getScrollTop = () => {
    try {
      const mainEl = document.querySelector('.main-content');
      const winTop = Math.max(window.scrollY || 0, document.documentElement?.scrollTop || 0, document.body?.scrollTop || 0);
      const mainTop = mainEl ? mainEl.scrollTop || 0 : 0;
      return Math.max(winTop, mainTop);
    } catch {
      return 0;
    }
  };
  const setScrollTop = (y) => {
    const target = Math.max(0, Number(y) || 0);
    try {
      window.scrollTo({ top: target, left: 0, behavior: 'auto' });
      if (document.documentElement) document.documentElement.scrollTop = target;
      if (document.body) document.body.scrollTop = target;
      const mainEl = document.querySelector('.main-content');
      if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
        mainEl.scrollTop = target;
      }
    } catch { /* ignore */ }
  };

  const scrollPositionsRef = useRef({});
  const currentRouteKeyRef = useRef('');
  const pendingBackActionRef = useRef(false);
  const scrollLockUntilRef = useRef(0);
  const routeNavStackRef = useRef([]);

  const teachersSubTabRef = useRef(teachersSubTab);
  const teacherFormViewRef = useRef(teacherFormView);
  const subjectFormViewRef = useRef(subjectFormView);
  const selectedSubjectDetailRef = useRef(selectedSubjectDetail);
  const showScheduleFormRef = useRef(showScheduleForm);
  const settingsDetailRouteRef = useRef(settingsDetailRoute);
  const scheduleReturnTargetRef = useRef(null);
  const showWebcamModalRef = useRef(false);
  const enrollWebcamBackRef = useRef(null);
  const studentsRef = useRef([]);
  const teachersRef = useRef([]);
  const subjectsRef = useRef([]);
  const pushedHashStackRef = useRef([]);
  const expectedHashRef = useRef('');
  const uiBackPendingRef = useRef(false);
  const suppressTabHistoryPushRef = useRef(false);

  useEffect(() => { teachersSubTabRef.current = teachersSubTab; }, [teachersSubTab]);
  useEffect(() => { teacherFormViewRef.current = teacherFormView; }, [teacherFormView]);
  useEffect(() => { subjectFormViewRef.current = subjectFormView; }, [subjectFormView]);
  useEffect(() => { selectedSubjectDetailRef.current = selectedSubjectDetail; }, [selectedSubjectDetail]);
  useEffect(() => { showScheduleFormRef.current = showScheduleForm; }, [showScheduleForm]);
  useEffect(() => { settingsDetailRouteRef.current = settingsDetailRoute; }, [settingsDetailRoute]);

  // Record user scroll position continuously while settled on the current view
  useEffect(() => {
    const handleScrollCapture = () => {
      if (Date.now() < scrollLockUntilRef.current) return;
      const key = currentRouteKeyRef.current;
      if (!key) return;
      scrollPositionsRef.current[key] = getScrollTop();
    };
    window.addEventListener('scroll', handleScrollCapture, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', handleScrollCapture, { capture: true });
  }, []);

  // Synchronize sub-settings to localStorage and clear mismatched settings detail route
  useEffect(() => {
    try {
      if (activeTab === 'settings') {
        setSettingsDetailRoute(prev => (prev && prev.sub !== activeSubSetting ? null : prev));
        if (activeSubSetting) {
          localStorage.setItem('last_active_sub_setting', activeSubSetting);
        }
      } else {
        localStorage.removeItem('last_active_sub_setting');
        setSettingsDetailRoute(prev => (prev ? null : prev));
      }
    } catch { /* ignore */ }
  }, [activeTab, activeSubSetting]);

  const tabHistoryRef = useRef([]);
  const prevActiveTabRef = useRef(activeTab);
  useEffect(() => {
    if (activeTab && !['login', 'signup'].includes(activeTab)) {
      try {
        localStorage.setItem('last_active_tab', activeTab);
      } catch { /* ignore */ }
    }
    if (prevActiveTabRef.current !== activeTab) {
      if (suppressTabHistoryPushRef.current) {
        suppressTabHistoryPushRef.current = false;
      } else if (prevActiveTabRef.current && !['login', 'signup'].includes(prevActiveTabRef.current)) {
        const historyArr = tabHistoryRef.current;
        if (historyArr[historyArr.length - 1] !== prevActiveTabRef.current) {
          historyArr.push(prevActiveTabRef.current);
          if (historyArr.length > 25) {
            historyArr.shift();
          }
        }
      }
      if (activeTab !== 'settings') {
        setActiveSubSetting(null);
        setSettingsDetailRoute(null);
      }
      if (activeTab !== 'dashboard') {
        setActiveDashboardSubTab(null);
      }
      if (activeTab !== 'students') {
        setShowAddModal(false);
        setShowEditStudentModal(false);
        setEditingStudent(null);
      }
      if (activeTab !== 'teachers') {
        setTeacherFormView('list');
        setSubjectFormView('list');
        setSelectedSubjectDetail(null);
        setShowScheduleForm(false);
        setEditingTeacher(null);
        scheduleReturnTargetRef.current = null;
      }
      prevActiveTabRef.current = activeTab;
    }
  }, [activeTab]);

  const handleNavigateBack = useCallback(() => {
    if (playCyberSound) playCyberSound('click');
    scrollPositionsRef.current[currentRouteKeyRef.current] = getScrollTop();
    pendingBackActionRef.current = true;
    uiBackPendingRef.current = true;

    if (scannerBackRef.current) {
      scannerBackRef.current(false);
      return;
    }
    if (enrollWebcamBackRef.current) {
      enrollWebcamBackRef.current(false);
      return;
    }
    if (activeTabRef.current === 'students' && (showAddModalRef.current || showEditStudentModalRef.current)) {
      setShowAddModal(false);
      setShowEditStudentModal(false);
      setEditingStudent(null);
      setFormError('');
      setStudentError('');
      setEditStudentError('');
      setEditStudentSuccess('');
      return;
    }
    if (activeTabRef.current === 'teachers') {
      const subTab = teachersSubTabRef.current;
      if (subTab === 'directory' && teacherFormViewRef.current !== 'list') {
        setTeacherFormView('list');
        setEditingTeacher(null);
        setTeacherError('');
        return;
      }
      if (subTab === 'subjects' && subjectFormViewRef.current !== 'list') {
        setSubjectFormView('list');
        setSelectedSubjectDetail(null);
        return;
      }
      if (subTab === 'planner' && showScheduleFormRef.current) {
        setShowScheduleForm(false);
        if (scheduleReturnTargetRef.current === 'subject-detail' && selectedSubjectDetailRef.current) {
          scheduleReturnTargetRef.current = null;
          setTeachersSubTab('subjects');
          setSubjectFormView('detail');
        }
        return;
      }
    }
    if (activeTabRef.current === 'settings' && settingsDetailRouteRef.current !== null) {
      setSettingsDetailRoute(null);
      return;
    }
    if (activeSubSettingRef.current !== null) {
      const folderItems = ['enterprise', 'extreme', 'ideas150', 'features7', 'new_features', 'wellness', 'ar_gamification'];
      if (folderItems.includes(activeSubSettingRef.current)) {
        setActiveSubSetting('features_folder');
      } else {
        setActiveSubSetting(null);
      }
      return;
    }
    if (activeDashboardSubTabRef.current !== null) {
      setActiveDashboardSubTab(null);
      return;
    }
    if (tabHistoryRef.current.length > 0) {
      suppressTabHistoryPushRef.current = true;
      const prev = tabHistoryRef.current.pop();
      setActiveTab(prev);
    } else {
      suppressTabHistoryPushRef.current = true;
      const curTab = activeTabRef.current;
      if (['face-review', 'disputes', 'devices', 'calendar', 'interventions', 'lms', 'payroll', 'session-history'].includes(curTab)) {
        setActiveTab('control');
      } else if (curTab === 'broadcast') {
        setActiveTab(userRoleRef.current === 'student' ? 'student-attendance' : 'control');
      } else {
        setActiveTab(userRoleRef.current === 'student' ? 'student-attendance' : 'dashboard');
      }
    }
  }, [playCyberSound]);


  // Real-Time Role Notification System
  const handleNotificationNavigate = useCallback(({ targetTab, targetSubSetting, openScanner }) => {
    if (targetTab) setActiveTab(targetTab);
    if (targetSubSetting !== undefined && targetSubSetting !== null) {
      setActiveSubSetting(targetSubSetting);
    }
    if (openScanner) setShowScannerModal(true);
  }, []);

  const {
    showNotificationDrawer,
    setShowNotificationDrawer,
    unreadCount: realtimeUnreadCount,
    handleNotificationClick,
  } = useNotifications(token, currentUser, userRole, handleNotificationNavigate);


  // Attendance Dispute & Correction Modal States (Phase 2)
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputePrefillSession, setDisputePrefillSession] = useState(null);

  // Multi-Sample Face Enrollment Modal States (Phase 7)
  const [showFaceEnrollModal, setShowFaceEnrollModal] = useState(false);
  const [faceEnrollStudent, setFaceEnrollStudent] = useState(null);

  // Biometric Fallback System Modal States (Phase 9)
  const [showFallbackModal, setShowFallbackModal] = useState(false);

  // Institution Broadcast Announcement Modal State (Part 3)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Feedback Form System
  const feedbackState = useFeedback();
  const {
    showFeedbackModal,
    setShowFeedbackModal,
    feedbacks,
    setFeedbacks,
    isLoadingFeedbacks,
    fetchFeedbacks,
    reviewFeedback,
  } = feedbackState;



  // New Voice State Machine & Resiliency Refs
  const voiceSystemStateRef = useRef('off'); // 'off', 'wake_word', 'active_assistant', 'chatbot_mic'
  const isWakeWordRunningRef = useRef(false);
  const isActiveAssistantRunningRef = useRef(false);
  const isChatbotMicRunningRef = useRef(false);
  const isSpeakingRef = useRef(false);

  // In-App Update Checker
  const {
    updateAvailable,
    setUpdateAvailable,
    updateDismissed,
    setUpdateDismissed,
    updateDownloadedToast,
    setUpdateDownloadedToast,
    serverLatestVersion,
    updateActiveFlag,
    handleManualCheck,
  } = useUpdateChecker(currentUser);
  const [explorationSettings, setExplorationSettings] = useState(() => loadExplorationSettings());
  const [subscriptionPlan, setSubscriptionPlan] = useState('free');
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);


  // Initialize Spring Physics settings on launch
  useEffect(() => {
    try {
      const settings = loadFuturisticSettings();
      if (settings.customSpringEnabled) {
        document.body.classList.add('spring-physics');
      }
    } catch { /* ignore fallback error */ }
  }, []);

  // Navigation State Refs for event handlers without stale closures
  const activeTabRef = useRef(activeTab);
  const activeSubSettingRef = useRef(activeSubSetting);
  const activeDashboardSubTabRef = useRef(activeDashboardSubTab);
  const showAddModalRef = useRef(false);
  const showEditStudentModalRef = useRef(false);
  const showFeedbackModalRef = useRef(showFeedbackModal);
  const showPrivacyPolicyRef = useRef(showPrivacyPolicy);
  const showDisputeModalRef = useRef(showDisputeModal);
  const showFaceEnrollModalRef = useRef(showFaceEnrollModal);
  const showFallbackModalRef = useRef(showFallbackModal);
  const showQrScannerModalRef = useRef(showQrScannerModal);
  const userRoleRef = useRef(userRole);
  const scannerBackRef = useRef(null);
  const isPopStateNavRef = useRef(false);

  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { activeSubSettingRef.current = activeSubSetting; }, [activeSubSetting]);
  useEffect(() => { activeDashboardSubTabRef.current = activeDashboardSubTab; }, [activeDashboardSubTab]);
  useEffect(() => { showFeedbackModalRef.current = showFeedbackModal; }, [showFeedbackModal]);
  useEffect(() => { showPrivacyPolicyRef.current = showPrivacyPolicy; }, [showPrivacyPolicy]);
  useEffect(() => { showDisputeModalRef.current = showDisputeModal; }, [showDisputeModal]);
  useEffect(() => { showFaceEnrollModalRef.current = showFaceEnrollModal; }, [showFaceEnrollModal]);
  useEffect(() => { showFallbackModalRef.current = showFallbackModal; }, [showFallbackModal]);
  useEffect(() => { showQrScannerModalRef.current = showQrScannerModal; }, [showQrScannerModal]);
  useEffect(() => { userRoleRef.current = userRole; }, [userRole]);

  // Handle Mobile Browser Back Button (popstate) & Android Native Hardware Back Button
  useEffect(() => {
    // 1. Mobile Web Browser Back Button / Gesture (popstate) for overlays & modals
    const handlePopState = () => {
      if (scannerBackRef.current) { scannerBackRef.current(true); return; }
      if (enrollWebcamBackRef.current) { enrollWebcamBackRef.current(true); return; }
      if (showQrScannerModalRef.current) { setShowQrScannerModal(false); return; }
      if (showDisputeModalRef.current) { setShowDisputeModal(false); return; }
      if (showFaceEnrollModalRef.current) { setShowFaceEnrollModal(false); return; }
      if (showFallbackModalRef.current) { setShowFallbackModal(false); return; }
      if (showFeedbackModalRef.current) { setShowFeedbackModal(false); return; }
      if (showPrivacyPolicyRef.current) { setShowPrivacyPolicy(false); return; }
      // Route & sub-page transitions (students, teachers, dashboard, settings) are synced by handleHashChange
    };

    window.addEventListener('popstate', handlePopState);

    // 2. Android Native Hardware Back Button (Capacitor App)
    let active = true;
    let handle = null;

    const initBackButton = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        if (!active) return;
        handle = await CapApp.addListener('backButton', () => {
          if (scannerBackRef.current) { scannerBackRef.current(false); return; }
          if (enrollWebcamBackRef.current) { enrollWebcamBackRef.current(false); return; }
          if (showQrScannerModalRef.current) { setShowQrScannerModal(false); return; }
          if (showDisputeModalRef.current) { setShowDisputeModal(false); return; }
          if (showFaceEnrollModalRef.current) { setShowFaceEnrollModal(false); return; }
          if (showFallbackModalRef.current) { setShowFallbackModal(false); return; }
          if (showFeedbackModalRef.current) { setShowFeedbackModal(false); return; }
          if (showPrivacyPolicyRef.current) { setShowPrivacyPolicy(false); return; }

          const curTab = activeTabRef.current;
          const hasSubPageOpen =
            (curTab === 'students' && (showAddModalRef.current || showEditStudentModalRef.current)) ||
            (curTab === 'teachers' && (teacherFormViewRef.current !== 'list' || subjectFormViewRef.current !== 'list' || showScheduleFormRef.current)) ||
            activeSubSettingRef.current !== null ||
            activeDashboardSubTabRef.current !== null ||
            tabHistoryRef.current.length > 0 ||
            (curTab !== 'dashboard' && curTab !== 'student-attendance');

          if (hasSubPageOpen) {
            handleNavigateBack();
          } else {
            CapApp.exitApp();
          }
        });
      } catch {
        // Not running in Capacitor or native plugin unavailable
      }
    };

    initBackButton();

    return () => {
      window.removeEventListener('popstate', handlePopState);
      active = false;
      if (handle) {
        if (typeof handle.then === 'function') {
          handle.then(h => h.remove()).catch(() => {});
        } else if (typeof handle.remove === 'function') {
          handle.remove();
        }
      }
    };
  }, []);



  // Fetch premium + subscription status
  useEffect(() => {
    if (!token || userRole === 'student') return;
    systemApi.fetchPremiumStatus(token)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.premium) setHasPremiumAccess(true);
        if (data?.subscription_plan) setSubscriptionPlan(data.subscription_plan);
      })
      .catch(() => {});
  }, [token, userRole]);

  // Unified Speech Recognition State Machine Coordinator
  const syncVoiceListeners = useCallback(() => {
    if (!token) {
      voiceSystemStateRef.current = 'off';
    }

    let state = voiceSystemStateRef.current;
    
    // If wake word is requested but not enabled, fall back to off
    if (state === 'wake_word' && !botWakeWordEnabled) {
      voiceSystemStateRef.current = 'off';
      state = 'off';
    }

    const isSpeaking = isSpeakingRef.current;

    console.log(`[VoiceSync] State: ${state}, isSpeaking: ${isSpeaking}, running: wake=${isWakeWordRunningRef.current}, active=${isActiveAssistantRunningRef.current}, chatMic=${isChatbotMicRunningRef.current}`);

    // If speaking, we must temporarily abort all recognition instances to prevent feedback loop
    if (isSpeaking || state === 'off') {
      if (wakeWordRecRef.current && isWakeWordRunningRef.current) {
        try { wakeWordRecRef.current.abort(); } catch (err) { /* ignore fallback error */ }
        isWakeWordRunningRef.current = false;
      }
      if (recognitionRef.current && (isActiveAssistantRunningRef.current || isChatbotMicRunningRef.current)) {
        try { recognitionRef.current.abort(); } catch (err) { /* ignore fallback error */ }
        isActiveAssistantRunningRef.current = false;
        isChatbotMicRunningRef.current = false;
      }
      return;
    }

    // 1. WAKE WORD STATE
    if (state === 'wake_word') {
      // Ensure active assistant or chatbot mic are stopped
      if (recognitionRef.current && (isActiveAssistantRunningRef.current || isChatbotMicRunningRef.current)) {
        try { recognitionRef.current.abort(); } catch (err) { /* ignore fallback error */ }
        isActiveAssistantRunningRef.current = false;
        isChatbotMicRunningRef.current = false;
      }

      if (!isWakeWordRunningRef.current) {
        startWakeWordListenerInternal();
      }
    }

    // 2. ACTIVE ASSISTANT STATE
    if (state === 'active_assistant') {
      // Ensure wake word is stopped
      if (wakeWordRecRef.current && isWakeWordRunningRef.current) {
        try { wakeWordRecRef.current.abort(); } catch (err) { /* ignore fallback error */ }
        isWakeWordRunningRef.current = false;
      }

      if (!isActiveAssistantRunningRef.current) {
        startActiveAssistantListenerInternal();
      }
    }

    // 3. CHATBOT MIC STATE
    if (state === 'chatbot_mic') {
      // Ensure wake word is stopped
      if (wakeWordRecRef.current && isWakeWordRunningRef.current) {
        try { wakeWordRecRef.current.abort(); } catch (err) { /* ignore fallback error */ }
        isWakeWordRunningRef.current = false;
      }

      if (!isChatbotMicRunningRef.current) {
        startChatbotMicListenerInternal();
      }
    }
  }, [token]);

  function startWakeWordListenerInternal() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !token) return;

    console.log("[Voice] Starting wake word listener...");
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      isWakeWordRunningRef.current = true;
      wakeWordErrorCountRef.current = 0; // Reset error count on successful start
    };

    recognition.onresult = (event) => {
      if (!event || !event.results || event.results.length === 0) return;
      const lastResultIndex = event.resultIndex;
      if (!event.results[lastResultIndex] || !event.results[lastResultIndex][0]) return;
      const speechText = event.results[lastResultIndex][0].transcript.toLowerCase().trim();
      console.log("[Voice] Wake word listener heard:", speechText);

      const wakeWords = ["hey raj", "he raj", "hai raj", "hi raj", "hello raj", "ok raj", "hey raaz", "he raaz", "hai raaz", "ay raj", "a raj"];
      let matchedWake = false;
      let commandPart = "";

      for (const wake of wakeWords) {
        if (speechText.startsWith(wake) || speechText.includes(" " + wake)) {
          matchedWake = true;
          const idx = speechText.indexOf(wake);
          commandPart = speechText.substring(idx + wake.length).trim();
          break;
        }
      }

      if (!matchedWake && (speechText.startsWith("raj ") || speechText.includes(" raj ") || speechText.endsWith(" raj"))) {
        matchedWake = true;
        const idx = speechText.indexOf("raj");
        commandPart = speechText.substring(idx + 3).trim();
      }

      if (matchedWake) {
        playCyberSound('success');
        
        // Show visual edge pulse
        setShowVoicePulseFlash(true);
        setTimeout(() => {
          setShowVoicePulseFlash(false);
        }, 1000);

        // Transition to active assistant
        voiceSystemStateRef.current = 'active_assistant';
        setIsVoiceAssistantMode(true);
        voiceAssistantActiveRef.current = true;
        
        // One-breath command execution
        if (commandPart) {
          console.log("[Voice] Executed one-breath command:", commandPart);
          setTimeout(() => {
            handleVoiceCommand(commandPart);
          }, 400);
        } else {
          syncVoiceListeners();
        }
      }
    };

    recognition.onerror = (e) => {
      console.warn("[Voice] Wake word listener error:", e.error);
      wakeWordErrorCountRef.current += 1;
      if (e.error === 'not-allowed' || wakeWordErrorCountRef.current > 5) {
        console.warn("[Voice] Disabling wake word listener due to repeated errors.");
        voiceSystemStateRef.current = 'off';
      }
    };

    recognition.onend = () => {
      isWakeWordRunningRef.current = false;
      setTimeout(() => {
        if (voiceSystemStateRef.current === 'wake_word' && !isSpeakingRef.current && token) {
          syncVoiceListeners();
        }
      }, 200);
    };

    wakeWordRecRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.warn("[Voice] Failed to start wake word recognition:", err);
      isWakeWordRunningRef.current = false;
    }
  }

  function startActiveAssistantListenerInternal() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !token) return;

    console.log("[Voice] Starting active assistant listener...");
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      isActiveAssistantRunningRef.current = true;
      setIsListeningSpeech(true);
      voiceAssistantErrorCountRef.current = 0;
    };

    recognition.onresult = (event) => {
      if (!event || !event.results || event.results.length === 0) return;
      const speechText = event.results[0][0].transcript;
      if (!speechText || !speechText.trim()) return;

      console.log("[Voice] Active assistant heard:", speechText);

      // Check if it's a valid navigation/control command
      if (handleVoiceCommand(speechText)) {
        return;
      }

      // If it is NOT a command, ignore silently and keep listening (recycle listener)
      console.log("[Voice] Non-command ignored in voice mode:", speechText);
      setTimeout(() => {
        if (voiceSystemStateRef.current === 'active_assistant' && !isSpeakingRef.current) {
          syncVoiceListeners();
        }
      }, 300);
    };

    recognition.onerror = (e) => {
      console.error("[Voice] Active assistant listener error:", e.error);
      setIsListeningSpeech(false);
      
      voiceAssistantErrorCountRef.current += 1;
      if (voiceAssistantErrorCountRef.current > 5) {
        console.warn("[Voice] Too many errors. Falling back to wake word mode.");
        voiceSystemStateRef.current = botWakeWordEnabled ? 'wake_word' : 'off';
        setIsVoiceAssistantMode(false);
        voiceAssistantActiveRef.current = false;
        voiceAssistantErrorCountRef.current = 0;
        syncVoiceListeners();
        return;
      }
    };

    recognition.onend = () => {
      isActiveAssistantRunningRef.current = false;
      setIsListeningSpeech(false);
      
      setTimeout(() => {
        if (voiceSystemStateRef.current === 'active_assistant' && !isSpeakingRef.current && token) {
          syncVoiceListeners();
        }
      }, 200);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.warn("[Voice] Failed to start active assistant recognition:", err);
      isActiveAssistantRunningRef.current = false;
    }
  }

  function startChatbotMicListenerInternal() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !token) return;

    console.log("[Voice] Starting chatbot mic listener...");
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isChatbotMicRunningRef.current = true;
      setIsListeningSpeech(true);
    };

    recognition.onresult = (event) => {
      if (!event || !event.results || event.results.length === 0) return;
      const speechToText = event.results[0][0].transcript;
      if (!speechToText || !speechToText.trim()) return;

      // Try parsing as a global voice command first
      if (handleVoiceCommand(speechToText)) {
        return;
      }

      setChatInput((prev) => prev ? prev + ' ' + speechToText : speechToText);
      playCyberSound('success');
    };

    recognition.onerror = (event) => {
      console.error("[Voice] Chatbot mic recognition error:", event.error);
      setIsListeningSpeech(false);
      playCyberSound('error');
    };

    recognition.onend = () => {
      isChatbotMicRunningRef.current = false;
      setIsListeningSpeech(false);
      
      setTimeout(() => {
        if (voiceSystemStateRef.current === 'chatbot_mic') {
          voiceSystemStateRef.current = isVoiceAssistantMode ? 'active_assistant' : (botWakeWordEnabled ? 'wake_word' : 'off');
          syncVoiceListeners();
        }
      }, 200);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.warn("[Voice] Failed to start chatbot mic recognition:", err);
      isChatbotMicRunningRef.current = false;
    }
  }

  // Token synchronization effect
  useEffect(() => {
    if (token && botWakeWordEnabled) {
      voiceSystemStateRef.current = 'wake_word';
      syncVoiceListeners();
    } else {
      voiceSystemStateRef.current = 'off';
      syncVoiceListeners();
    }
    return () => {
      voiceSystemStateRef.current = 'off';
      syncVoiceListeners();
    };
  }, [token, botWakeWordEnabled, syncVoiceListeners]);

  // Watchdog timer to automatically heal dead voice listeners
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      const state = voiceSystemStateRef.current;
      const isSpeaking = isSpeakingRef.current;

      if (state === 'off' || isSpeaking) return;

      if (state === 'wake_word' && !isWakeWordRunningRef.current) {
        console.log("[Voice Watchdog] Wake-word listener is dead. Restarting...");
        syncVoiceListeners();
      } else if (state === 'active_assistant' && !isActiveAssistantRunningRef.current) {
        console.log("[Voice Watchdog] Active assistant listener is dead. Restarting...");
        syncVoiceListeners();
      } else if (state === 'chatbot_mic' && !isChatbotMicRunningRef.current) {
        console.log("[Voice Watchdog] Chatbot mic listener is dead. Restarting...");
        syncVoiceListeners();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [token, syncVoiceListeners]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (voices.length > 0 && !botVoiceSelected) {
          const defaultVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
          setBotVoiceSelected(defaultVoice.name);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);





  const handleVoiceCommand = (text) => {
    const lowerSpeech = text.toLowerCase().trim();
    console.log("Voice Command Parser processing:", lowerSpeech);

    if (lowerSpeech === 'over' || lowerSpeech === 'over over' || lowerSpeech === 'stop' || lowerSpeech === 'terminate' || lowerSpeech === 'exit') {
      stopVoiceAssistantMode();
      playCyberSound('success');
      return true;
    }

    // Helper function to change tabs and close active modals/menus
    const changeTab = (tabId) => {
      setActiveTab(tabId);
      try {
        setMobileSidebarOpen(false);
      } catch { /* ignore fallback error */ }
      try {
        setMobileControlOpen(false);
      } catch { /* ignore fallback error */ }
      try {
        setShowScannerModal(false);
      } catch { /* ignore fallback error */ }
      try {
        setShowFeedbackModal(false);
      } catch { /* ignore fallback error */ }
    };

    // 1. Scanner specific helpers
    const triggerStartScanner = () => {
      changeTab('attendance');
      setTimeout(() => {
        try {
          setShowScannerModal(true);
          startAttendanceCam();
        } catch (err) {
          console.error("Failed to start scanner via voice:", err);
        }
      }, 300);
    };

    const triggerStopScanner = () => {
      try {
        stopAttendanceCam();
        setShowScannerModal(false);
      } catch (err) {
        console.error("Failed to stop scanner via voice:", err);
      }
    };

    // 2. DOM Clicker Helper — Smart, tab-aware, nav-deprioritized
    const flashElement = (el) => {
      const orig = { transition: el.style.transition, outline: el.style.outline, boxShadow: el.style.boxShadow };
      el.style.transition = 'all 0.15s ease-in-out';
      el.style.outline = '3px solid #00f0ff';
      el.style.boxShadow = '0 0 20px #00f0ff, inset 0 0 8px rgba(0,242,254,0.2)';
      setTimeout(() => {
        el.style.transition = orig.transition;
        el.style.outline = orig.outline;
        el.style.boxShadow = orig.boxShadow;
      }, 900);
    };

    const isElementVisible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      // Must have real dimensions and be in viewport (or near it)
      return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight + 200 && rect.bottom > -200;
    };

    const isNavElement = (el) => {
      return (
        el.classList.contains('nav-item') ||
        el.closest('.bottom-nav') !== null ||
        el.closest('.sidebar-nav') !== null ||
        el.closest('.nav-bar') !== null ||
        el.closest('[class*="nav-item"]') !== null
      );
    };

    const clickElementByText = (targetText, delay = 0) => {
      const doClick = () => {
        const query = targetText.toLowerCase().trim();
        if (!query || query.length < 2) return false;

        // Select all interactive elements
        const elements = Array.from(document.querySelectorAll(
          'button, a[href], input[type="button"], input[type="submit"], [role="button"], [class*="btn"], [class*="button"]'
        ));

        let bestMatch = null;
        let highestScore = 0;

        for (const el of elements) {
          if (!isElementVisible(el)) continue;

          // Get all text content/attributes
          const rawText = (el.innerText || el.textContent || '').toLowerCase().trim();
          // Strip icons/symbols — keep only alphabetic text
          const elText = rawText.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
          const elTitle = (el.getAttribute('title') || '').toLowerCase().trim();
          const elLabel = (el.getAttribute('aria-label') || '').toLowerCase().trim();
          const elId = (el.id || '').toLowerCase().replace(/-/g, ' ').replace(/_/g, ' ');

          const matchSources = [elText, elTitle, elLabel, elId];

          // Nav elements get a heavy penalty — content buttons should win
          const navPenalty = isNavElement(el) ? 0.25 : 1.0;

          for (const src of matchSources) {
            if (!src) continue;

            // Exact match is highest priority
            if (src === query) {
              const score = 1000 * navPenalty;
              if (score > highestScore) {
                highestScore = score;
                bestMatch = el;
              }
              break;
            }

            // Full phrase contained in element text
            if (src.includes(query)) {
              // Score: how much of el's text the query covers × nav penalty
              const score = (query.length / src.length) * 100 * navPenalty;
              if (score > highestScore) {
                highestScore = score;
                bestMatch = el;
              }
            }
          }

          if (highestScore >= 1000) break; // perfect non-nav match found
        }

        if (bestMatch) {
          console.log("[Voice Clicker] Clicking:", bestMatch.innerText?.trim(), bestMatch);
          flashElement(bestMatch);
          bestMatch.click();
          // Also try dispatching MouseEvent for elements that need it
          bestMatch.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        return false;
      };

      if (delay > 0) {
        setTimeout(doClick, delay);
        return true; // Optimistically return true for delayed clicks
      }
      return doClick();
    };

    // Tab-aware click: switch to tab first, then click after render
    const tabAwareClick = (tabId, buttonText) => {
      changeTab(tabId); // Use changeTab so menus close and state syncs
      setTimeout(() => {
        // Try exact text match first, then partial word matches
        if (!clickElementByText(buttonText, 0)) {
          const words = buttonText.split(' ');
          for (const word of words) {
            if (word.length > 3 && clickElementByText(word, 0)) break;
          }
        }
      }, 600); // 600ms for React to fully re-render the new tab
    };

    // 3. Scroll Helper
    const performScroll = (direction) => {
      const scrollAmt = 500;
      const scrollAllContainers = (top) => {
        document.querySelectorAll('div, section, main, tbody, ul, ol').forEach(el => {
          try {
            const style = window.getComputedStyle(el);
            if (el.scrollHeight > el.clientHeight && (style.overflowY === 'auto' || style.overflowY === 'scroll')) {
              if (top === 'top') el.scrollTo({ top: 0, behavior: 'smooth' });
              else if (top === 'bottom') el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
              else el.scrollBy({ top: top, behavior: 'smooth' });
            }
          } catch { /* ignore fallback error */ }
        });
      };

      if (direction === 'down') {
        window.scrollBy({ top: scrollAmt, behavior: 'smooth' });
        scrollAllContainers(scrollAmt);
      } else if (direction === 'up') {
        window.scrollBy({ top: -scrollAmt, behavior: 'smooth' });
        scrollAllContainers(-scrollAmt);
      } else if (direction === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        scrollAllContainers('top');
      } else if (direction === 'bottom') {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        scrollAllContainers('bottom');
      }
    };

    // 4. Voice Commands Processing

    // A. Navigation Commands (Fuzzy Match & Multi-lingual)
    if (lowerSpeech.includes('dashboard') || lowerSpeech.includes('home') || lowerSpeech.includes('main page') || lowerSpeech.includes('telemetry')) {
      const dest = userRole === 'student' ? 'student-attendance' : 'dashboard';
      changeTab(dest);
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('my profile') || lowerSpeech.includes('my account') || lowerSpeech === 'profile') {
      changeTab('student-profile');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('attendance logs') || lowerSpeech.includes('attendance register') || lowerSpeech.includes('attendance sheet') || lowerSpeech === 'logs') {
      changeTab('logs');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech === 'session history' || lowerSpeech === 'history' || lowerSpeech.includes('session-history') || lowerSpeech.includes('sessions')) {
      changeTab('session-history');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech === 'reports' || lowerSpeech.includes('attendance reports') || lowerSpeech.includes('absentee alerts')) {
      changeTab('reports');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('security settings') || lowerSpeech === 'settings' || lowerSpeech.includes('geofence') || lowerSpeech.includes('ip settings')) {
      if (userRole === 'admin') {
        changeTab('settings');
        playCyberSound('success');
      } else {
        playCyberSound('error');
      }
      return true;
    }
    if (lowerSpeech === 'student directory' || lowerSpeech === 'students' || lowerSpeech === 'student list') {
      changeTab('students');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech === 'teacher directory' || lowerSpeech === 'teachers' || lowerSpeech === 'timetable') {
      changeTab('teachers');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech === 'ai assistant' || lowerSpeech === 'chatbot' || lowerSpeech === 'open chat') {
      changeTab('ai-assistant');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('attendance scanner') || lowerSpeech.includes('face scanner') || lowerSpeech === 'attendance') {
      changeTab('attendance');
      playCyberSound('success');
      return true;
    }

    // B. Direct Action Shortcuts (Tab-aware — switch + click after render)
    if (lowerSpeech.includes('add student') || lowerSpeech.includes('register student') || lowerSpeech.includes('new student')) {
      tabAwareClick('students', 'Register Student');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('add teacher') || lowerSpeech.includes('register teacher') || lowerSpeech.includes('new teacher')) {
      tabAwareClick('teachers', 'Register Teacher');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('start scanner') || lowerSpeech.includes('open scanner') || lowerSpeech.includes('camera on') || lowerSpeech.includes('start camera') || lowerSpeech.includes('scanner chalu') || lowerSpeech.includes('attendance lagao') || lowerSpeech.includes('scan karo')) {
      triggerStartScanner(); // Uses the pre-defined helper that properly starts cam
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('stop scanner') || lowerSpeech.includes('close scanner') || lowerSpeech.includes('camera off') || lowerSpeech.includes('stop camera') || lowerSpeech.includes('scanner band') || lowerSpeech.includes('camera band karo')) {
      triggerStopScanner(); // Uses the pre-defined helper that properly stops cam
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('download report') || lowerSpeech.includes('download pdf') || lowerSpeech.includes('export report')) {
      tabAwareClick('reports', 'Download PDF');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('send alerts') || lowerSpeech.includes('send absentee') || lowerSpeech.includes('alert bhejo')) {
      tabAwareClick('reports', 'Send Absentee Alerts');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('generate report') || lowerSpeech.includes('fetch report') || lowerSpeech.includes('report generate')) {
      tabAwareClick('reports', 'Generate Report');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('download logs') || lowerSpeech.includes('export logs') || lowerSpeech.includes('download attendance')) {
      tabAwareClick('logs', 'Download CSV');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('start session') || lowerSpeech.includes('session chalu') || lowerSpeech.includes('custom session')) {
      tabAwareClick('attendance', 'Start Custom Session');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('stop session') || lowerSpeech.includes('session band') || lowerSpeech.includes('end session')) {
      tabAwareClick('attendance', 'Stop Session');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('train model') || lowerSpeech.includes('train faces') || lowerSpeech.includes('retrain')) {
      tabAwareClick('students', 'Train Recognition');
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('capture face') || lowerSpeech.includes('webcam chalu') || lowerSpeech.includes('open webcam')) {
      setShowWebcamModal(true);
      playCyberSound('success');
      return true;
    }
    if (lowerSpeech.includes('close form') || lowerSpeech.includes('close modal') || lowerSpeech.includes('close popup') || lowerSpeech.includes('close window') || lowerSpeech === 'cancel' || lowerSpeech.includes('band karo modal') || lowerSpeech === 'go back' || lowerSpeech === 'wapas jao') {
      setShowAddModal(false);
      setShowWebcamModal(false);
      setShowEditStudentModal(false);
      setShowEditStudentSelfModal(false);
      setShowScannerModal(false);
      setShowFeedbackModal(false);
      try { stopWebcam(); } catch { /* ignore fallback error */ }
      try { stopAttendanceCam(); } catch { /* ignore fallback error */ }
      playCyberSound('click');
      return true;
    }

    // C. Smart Scroll Controls
    if (lowerSpeech.includes('scroll down') || lowerSpeech.includes('neeche') || lowerSpeech === 'go down' || lowerSpeech === 'page down') {
      performScroll('down'); playCyberSound('success'); return true;
    }
    if (lowerSpeech.includes('scroll up') || lowerSpeech.includes('upar') || lowerSpeech === 'go up' || lowerSpeech === 'page up') {
      performScroll('up'); playCyberSound('success'); return true;
    }
    if (lowerSpeech.includes('scroll to top') || lowerSpeech.includes('sabse upar') || lowerSpeech === 'top') {
      performScroll('top'); playCyberSound('success'); return true;
    }
    if (lowerSpeech.includes('scroll to bottom') || lowerSpeech.includes('sabse neeche') || lowerSpeech === 'bottom') {
      performScroll('bottom'); playCyberSound('success'); return true;
    }

    // D. Smart Search Input Typing
    if (lowerSpeech.startsWith('search ') || lowerSpeech.startsWith('find ') || lowerSpeech.startsWith('filter ') || lowerSpeech.includes(' khojo')) {
      let query = '';
      if (lowerSpeech.startsWith('search ')) query = text.substring(7).trim();
      else if (lowerSpeech.startsWith('find ')) query = text.substring(5).trim();
      else if (lowerSpeech.startsWith('filter ')) query = text.substring(7).trim();
      else if (lowerSpeech.includes(' khojo')) query = text.substring(0, lowerSpeech.lastIndexOf(' khojo')).trim();

      if (query) {
        const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="search"], input[placeholder*="Search" i], input[placeholder*="search" i], input[placeholder*="Filter" i]'));
        const visible = inputs.filter(inp => isElementVisible(inp));
        if (visible.length > 0) {
          const inp = visible[0];
          inp.focus();
          // React-compatible value setting
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(inp, query);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          playCyberSound('success');
          return true;
        }
      }
    }

    // E. General Commands
    if (lowerSpeech === 'refresh' || lowerSpeech === 'reload' || lowerSpeech === 'refresh page') {
      playCyberSound('success');
      setTimeout(() => window.location.reload(), 500);
      return true;
    }
    if (lowerSpeech === 'logout' || lowerSpeech === 'log out' || lowerSpeech === 'sign out') {
      playCyberSound('success');
      setTimeout(() => handleLogout(), 500);
      return true;
    }
    if (lowerSpeech === 'stop' || lowerSpeech === 'sleep' || lowerSpeech === 'stop listening' || lowerSpeech === 'close assistant' || lowerSpeech === 'band ho jao') {
      playCyberSound('click');
      stopVoiceAssistantMode();
      return true;
    }

    // F. Explicit click/press/tap/open commands — use smart clicker
    let clickTarget = "";
    if (lowerSpeech.startsWith('click on ')) clickTarget = text.substring(9).trim();
    else if (lowerSpeech.startsWith('click ')) clickTarget = text.substring(6).trim();
    else if (lowerSpeech.startsWith('press ')) clickTarget = text.substring(6).trim();
    else if (lowerSpeech.startsWith('tap on ')) clickTarget = text.substring(7).trim();
    else if (lowerSpeech.startsWith('tap ')) clickTarget = text.substring(4).trim();
    else if (lowerSpeech.startsWith('select ')) clickTarget = text.substring(7).trim();
    else if (lowerSpeech.startsWith('open ')) clickTarget = text.substring(5).trim();

    if (clickTarget) {
      if (clickElementByText(clickTarget)) { playCyberSound('success'); return true; }
      // Word-by-word fallback
      for (const word of clickTarget.split(' ')) {
        if (word.length > 3 && clickElementByText(word)) { playCyberSound('success'); return true; }
      }
    }

    // G. Last resort — try clicking any visible element matching the full spoken phrase
    if (lowerSpeech.length > 3 && clickElementByText(lowerSpeech)) {
      playCyberSound('success');
      return true;
    }

    return false;
  };

  const handleToggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Google Chrome or MS Edge.");
      return;
    }

    if (voiceSystemStateRef.current === 'chatbot_mic') {
      voiceSystemStateRef.current = isVoiceAssistantMode ? 'active_assistant' : (botWakeWordEnabled ? 'wake_word' : 'off');
      syncVoiceListeners();
    } else {
      voiceSystemStateRef.current = 'chatbot_mic';
      syncVoiceListeners();
    }
  };

  const handleSpeakText = (text, onEndCallback = null) => {
    if (!text) return;
    
    // Play success chime first
    playCyberSound('success');
    
    if (soundEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      
      const cleanText = text.replace(/[*#_`~]/g, ''); // strip markdown formatting for cleaner speech
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Load custom voice config
      if (botVoiceSelected) {
        const voices = window.speechSynthesis.getVoices();
        const selected = voices.find(v => v.name === botVoiceSelected);
        if (selected) utterance.voice = selected;
      }
      
      utterance.rate = voiceSpeed; // rate of speech
      utterance.pitch = voicePitch; // pitch scaling
      utterance.volume = audioVolume; // volume setting
      
      utterance.onstart = () => {
        isSpeakingRef.current = true;
      };
      
      utterance.onend = () => {
        isSpeakingRef.current = false;
        if (onEndCallback) onEndCallback();
      };
      
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        if (onEndCallback) onEndCallback();
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      if (onEndCallback) {
        setTimeout(onEndCallback, 400);
      }
    }
  };

  const startVoiceAssistantMode = () => {
    playCyberSound('success');
    setIsVoiceAssistantMode(true);
    voiceAssistantActiveRef.current = true;
    voiceSystemStateRef.current = 'active_assistant';
    syncVoiceListeners();
  };

  const stopVoiceAssistantMode = () => {
    playCyberSound('click');
    setIsVoiceAssistantMode(false);
    voiceAssistantActiveRef.current = false;
    voiceSystemStateRef.current = botWakeWordEnabled ? 'wake_word' : 'off';
    window.speechSynthesis.cancel();
    syncVoiceListeners();
  };

  // Auto scroll chat to bottom when messages update
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatLoading]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileControlOpen, setMobileControlOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [universalSearchOpen, setUniversalSearchOpen] = useState(false);
  const sessionInitializedRef = useRef(false);
  const loginJustCompletedRef = useRef(false);
  const loginBootstrapDoneRef = useRef(false);

  // Phase 5 States
  const [diagnosticWarnings, setDiagnosticWarnings] = useState({ lighting: '', distance: '' });





  // Manual Attendance States
  const manualReturnTab = useRef('attendance');
  const isManualAttendanceOpen = activeTab === 'manual-register' && ['admin', 'teacher'].includes(userRole);
  const [manualFeedback, setManualFeedback] = useState('');
  const setIsManualAttendanceOpen = (open) => {
    if (open) {
      manualReturnTab.current = activeTab;
      setManualFeedback('');
    }
    setActiveTab(open ? 'manual-register' : manualReturnTab.current);
  };
  const [manualSubjectId, setManualSubjectId] = useState('');
  const [manualDate, setManualDate] = useState(getLocalDateString());
  const [manualPeriod, setManualPeriod] = useState('Period 1');
  const [manualAttendanceData, setManualAttendanceData] = useState({}); // student_id -> { status: 'Present', remarks: '' }
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState('');


  // Student Portal Selfie face upload states
  const [studentWebcamActive, setStudentWebcamActive] = useState(false);
  const [selfieError, setSelfieError] = useState('');
  const [selfieSuccess, setSelfieSuccess] = useState('');
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);
  const studentVideoRef = React.useRef(null);
  const studentCanvasRef = React.useRef(null);
  const studentStreamRef = React.useRef(null);

  // Webcam Face Capture & Training States
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [captureStudent, setCaptureStudent] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState('');
  const [isTraining, setIsTraining] = useState(false);
  const [trainMessage, setTrainMessage] = useState('');

  // Face Attendance Scanner States & Refs
  const [attendanceActive, setAttendanceActive] = useState(false);
  const [recognizedStudents, setRecognizedStudents] = useState([]);
  const [serverRecognizedFaces, setServerRecognizedFaces] = useState(null);
  const serverRecognizedFacesRef = useRef(null);
  const updateServerRecognizedFaces = (val) => {
    setServerRecognizedFaces(val);
    serverRecognizedFacesRef.current = val;
  };
  const [attendanceError, setAttendanceError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('Camera Offline');
  const [wsConnected, setWsConnected] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerBootActive, setScannerBootActive] = useState(false);
  const [webcamBootActive, setWebcamBootActive] = useState(false);
  const [studentWebcamBootActive, setStudentWebcamBootActive] = useState(false);

  // Mobile-First Daily Driver UX States
  const [appLang, setAppLang] = useState(getStoredLanguage);
  const [showAccessibilityModal, setShowAccessibilityModal] = useState(false);
  const [showPrivacyCenterModal, setShowPrivacyCenterModal] = useState(false);

  // Voice Assistant States
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0); // speech rate
  const [voiceAnnounceLiveness, setVoiceAnnounceLiveness] = useState(false);

  // Phase 3 Cyber-Aesthetic States
  const [voicePitch, setVoicePitch] = useState(parseFloat(localStorage.getItem('voicePitch') || '1.0'));
  const [voiceRobotEffect, setVoiceRobotEffect] = useState(localStorage.getItem('voiceRobotEffect') === 'true');

  // Phase 4 Ultra Sci-Fi States
  const [ambientHumActive, setAmbientHumActive] = useState(localStorage.getItem('ambientHumActive') === 'true');
  const [ambientHumVolume, setAmbientHumVolume] = useState(parseFloat(localStorage.getItem('ambientHumVolume') || '0.1'));
  const [thermalHudEnabled, setThermalHudEnabled] = useState(localStorage.getItem('thermalHudEnabled') === 'true');
  const [crtOverlayEnabled, setCrtOverlayEnabled] = useState(localStorage.getItem('crtOverlayEnabled') === 'true');

  // Extreme Control & Security States
  const [biometricMatchThreshold, setBiometricMatchThreshold] = useState(parseFloat(localStorage.getItem('biometricMatchThreshold') || '0.92'));
  const [biometricConfidenceFilterEnabled, setBiometricConfidenceFilterEnabled] = useState(localStorage.getItem('biometricConfidenceFilterEnabled') === 'true');
  const [antiSpoofingThreshold, setAntiSpoofingThreshold] = useState(parseFloat(localStorage.getItem('antiSpoofingThreshold') || '0.20'));
  const antiSpoofingThresholdRef = React.useRef(antiSpoofingThreshold);
  const lastBiometricPolicyRef = React.useRef('');
  const [livenessBypass, setLivenessBypass] = useState(false);
  const livenessBypassRef = React.useRef(livenessBypass);
  const [aiCognitiveLevel, setAiCognitiveLevel] = useState(localStorage.getItem('aiCognitiveLevel') || 'standard');
  const [diagnosticLevel, setDiagnosticLevel] = useState(localStorage.getItem('diagnosticLevel') || 'DEBUG');

  // System Health States
  const [systemHealth, setSystemHealth] = useState(null);
  const [apiLatency, setApiLatency] = useState(0);
  const [serverLatencyMs, setServerLatencyMs] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Logs UI Upgrade States
  const [logsViewMode, setLogsViewMode] = useState('grid'); // 'grid' | 'chrono'
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [quickFilterStatus, setQuickFilterStatus] = useState('all'); // 'all' | 'present' | 'absent'


  useEffect(() => {
    localStorage.setItem('voicePitch', voicePitch);
  }, [voicePitch]);
  useEffect(() => {
    localStorage.setItem('voiceRobotEffect', voiceRobotEffect);
  }, [voiceRobotEffect]);
  useEffect(() => {
    localStorage.setItem('ambientHumActive', ambientHumActive);
  }, [ambientHumActive]);
  useEffect(() => {
    localStorage.setItem('ambientHumVolume', ambientHumVolume);
  }, [ambientHumVolume]);
  useEffect(() => {
    localStorage.setItem('thermalHudEnabled', thermalHudEnabled);
  }, [thermalHudEnabled]);
  useEffect(() => {
    localStorage.setItem('crtOverlayEnabled', crtOverlayEnabled);
  }, [crtOverlayEnabled]);
  useEffect(() => {
    localStorage.setItem('biometricMatchThreshold', biometricMatchThreshold);
  }, [biometricMatchThreshold]);
  useEffect(() => {
    localStorage.setItem('biometricConfidenceFilterEnabled', biometricConfidenceFilterEnabled);
  }, [biometricConfidenceFilterEnabled]);
  useEffect(() => {
    localStorage.setItem('antiSpoofingThreshold', antiSpoofingThreshold);
    antiSpoofingThresholdRef.current = antiSpoofingThreshold;
  }, [antiSpoofingThreshold]);
  useEffect(() => {
    localStorage.setItem('livenessBypass', livenessBypass);
    livenessBypassRef.current = livenessBypass;
  }, [livenessBypass]);
  useEffect(() => {
    localStorage.setItem('aiCognitiveLevel', aiCognitiveLevel);
  }, [aiCognitiveLevel]);
  useEffect(() => {
    localStorage.setItem('diagnosticLevel', diagnosticLevel);
  }, [diagnosticLevel]);
  
  // Liveness check states & refs
  const [livenessStatus, setLivenessStatus] = useState('pending'); // 'pending', 'verifying', 'verified'
  const [livenessMessage, setLivenessMessage] = useState('Camera Offline');
  const eyeStateRef = React.useRef('open');
  const [eyeState, setEyeState] = useState('open');
  const livenessStatusRef = React.useRef('pending');
  const faceLockStartRef = React.useRef(null);
  const faceMeshRef = React.useRef(null);
  const [attendanceFacingMode, setAttendanceFacingMode] = useState('user');
  const attendanceFacingModeRef = React.useRef('user');
  useEffect(() => {
    attendanceFacingModeRef.current = attendanceFacingMode;
  }, [attendanceFacingMode]);
  
  const attendanceVideoRef = React.useRef(null);
  const attendanceImageRef = React.useRef(null);
  const attendanceCanvasRef = React.useRef(null);
  const attendanceStreamRef = React.useRef(null);

  // Attendance Reports States
  const [reportStartDate, setReportStartDate] = useState(
    getLocalDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  );
  const [reportEndDate, setReportEndDate] = useState(
    getLocalDateString()
  );
  const [reportDeptFilter, setReportDeptFilter] = useState('');
  const [reportData, setReportData] = useState({ total_working_days: 0, students: [] });
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isSendingAlerts, setIsSendingAlerts] = useState(false);
  const [reportAlertMsg, setReportAlertMsg] = useState(null);
  const [cameraScanSettings, setCameraScanSettings] = useState(() => loadCameraSettings());
  const meshFrameSkipRef = useRef(0);
  const lastLandmarksRef = useRef(null);
  const lastFaceBoxRef = useRef(null);
  const lastFaceBoxesRef = useRef([]); // To support multiple face boxes
  const lastFaceDetectedRef = useRef(false);
  const faceDetectorRef = useRef(null);
  const recognitionBusyRef = useRef(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [isDemoMode, setIsDemoMode] = React.useState(localStorage.getItem('isDemoMode') === 'true');

  const scannerStateInfo = useMemo(() => {
    if (!attendanceActive && !scannerBootActive) {
      return { type: 'offline', text: 'Camera Offline', icon: <Camera size={14} /> };
    }
    if (scannerBootActive) {
      return { type: 'booting', text: 'Starting camera...', icon: <RefreshCw size={14} className="spin-fast" /> };
    }
    if (attendanceError) {
      return { type: 'failed', text: 'Camera Error', icon: <AlertCircle size={14} /> };
    }
    if (scannedStudent) {
      if (scannedStudent.status === 'Already Marked' || scannedStudent.already_marked || String(scannedStudent.status).toLowerCase().includes('already')) {
        return { type: 'already_marked', text: 'Already Marked Today', icon: <AlertCircle size={14} /> };
      }
      return { type: 'verified', text: 'Attendance Recorded', icon: <CheckCircle2 size={14} /> };
    }
    if (isScanning) {
      return { type: 'recognizing', text: 'Verifying face...', icon: <RefreshCw size={14} className="spin-fast" /> };
    }
    if (['No confirmed match', 'Verification unavailable', 'No enrolled faces', 'No clear face detected'].includes(scanStatus)) return { type: 'failed', text: scanStatus, icon: <AlertCircle size={14} /> };
    if (scanStatus && (scanStatus.toLowerCase().includes('failed') || scanStatus.toLowerCase().includes('low confidence') || scanStatus.toLowerCase().includes('unrecognized'))) {
      return { type: 'failed', text: 'Face Not Recognized', icon: <AlertCircle size={14} /> };
    }
    if (scanStatus && scanStatus.toLowerCase().includes('offline')) {
      return { type: 'offline_queued', text: 'Offline Mode • Queued', icon: <Clock size={14} /> };
    }
    if (livenessStatus === 'verifying' && !livenessBypass) {
      if (eyeState === 'closed') {
        return { type: 'liveness', text: 'Blink detected • Open eyes', icon: <Eye size={14} /> };
      }
      return { type: 'liveness', text: 'Blink check active', icon: <Eye size={14} /> };
    }
    if (faceDetected) {
      return { type: 'detected', text: 'Face detected • Hold steady', icon: <ScanFace size={14} /> };
    }
    return { type: 'searching', text: 'Position face in frame', icon: <ScanFace size={14} /> };
  }, [attendanceActive, scannerBootActive, attendanceError, scannedStudent, isScanning, scanStatus, livenessStatus, livenessBypass, eyeState, faceDetected]);

  // Refs for video, canvas & stream
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);

  // Data States
  const [stats, setStats] = React.useState(() => {
    try {
      const cached = localStorage.getItem('cached_stats');
      const cachedInst = localStorage.getItem('cached_stats_inst_id');
      const cachedDate = localStorage.getItem('cached_stats_date');
      const savedUser = localStorage.getItem('cached_user') || localStorage.getItem('currentUser');
      const userObj = savedUser ? JSON.parse(savedUser) : null;
      const expectedInst = userObj?.institution_id;
      const todayStr = getLocalDateString();
      if (cached && (!expectedInst || !cachedInst || String(cachedInst) === String(expectedInst))) {
        const parsed = JSON.parse(cached);
        // If date has rolled over, preserve total_students, departments & weekly trends so screen never flashes 0
        if (cachedDate !== todayStr) {
          return {
            ...parsed,
            total_present_today: 0,
            total_absent_today: parsed.total_students || 0,
            average_attendance_rate: 0
          };
        }
        return parsed;
      }
      return {
        total_students: 0,
        total_present_today: 0,
        total_absent_today: 0,
        average_attendance_rate: 0,
        department_stats: {},
        weekly_trends: []
      };
    } catch {
      return {
        total_students: 0,
        total_present_today: 0,
        total_absent_today: 0,
        average_attendance_rate: 0,
        department_stats: {},
        weekly_trends: []
      };
    }
  });

  const chartRef1 = React.useRef(null);
  const chartRef2 = React.useRef(null);
  const [chartWidth1, setChartWidth1] = React.useState(350);
  const [chartWidth2, setChartWidth2] = React.useState(350);

  React.useEffect(() => {
    const observers = [];

    const handleObserve = (ref, setWidth) => {
      if (!ref.current) return;
      const observer = new ResizeObserver((entries) => {
        if (!entries || entries.length === 0) return;
        const width = entries[0].contentRect.width;
        if (width > 0) {
          setWidth(width);
        }
      });
      observer.observe(ref.current);
      observers.push(observer);
    };

    // Delay checking slightly to allow transitions to complete, but let ResizeObserver handle updates
    const timer = setTimeout(() => {
      handleObserve(chartRef1, setChartWidth1);
      handleObserve(chartRef2, setChartWidth2);
    }, 100);

    return () => {
      clearTimeout(timer);
      observers.forEach(obs => obs.disconnect());
    };
  }, [activeTab, stats]);
  const [students, setStudents] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_students');
      const cachedInst = localStorage.getItem('cached_students_inst_id');
      const savedUser = localStorage.getItem('cached_user') || localStorage.getItem('currentUser');
      const userObj = savedUser ? JSON.parse(savedUser) : null;
      const expectedInst = userObj?.institution_id;
      if (expectedInst && cachedInst && String(cachedInst) !== String(expectedInst)) {
        return [];
      }
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [logs, setLogs] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_logs');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [departments, setDepartments] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  const departmentsMatch = useCallback((deptA, deptB) => {
    const a = (deptA || '').trim();
    const b = (deptB || '').trim();
    if (!a || !b) return false;
    const norm = (val) => val.toLowerCase().replace(/[\s()_-]/g, '');
    if (a.toLowerCase() === b.toLowerCase() || norm(a) === norm(b)) return true;
    const collectAliases = (val) => {
      const lower = val.toLowerCase();
      const normalized = norm(val);
      const aliases = new Set([lower, normalized]);
      (departmentsList || []).forEach((d) => {
        const name = (d?.name || '').trim();
        const code = (d?.code || '').trim();
        const variants = [name.toLowerCase(), code.toLowerCase(), norm(name), norm(code)].filter(Boolean);
        if (variants.includes(lower) || variants.includes(normalized)) {
          variants.forEach((v) => aliases.add(v));
        }
      });
      return aliases;
    };
    const aliasesA = collectAliases(a);
    const aliasesB = collectAliases(b);
    for (const item of aliasesA) {
      if (aliasesB.has(item)) return true;
    }
    return false;
  }, [departmentsList]);

  // Search & Filter States
  const [studentSearch, setStudentSearch] = useState('');
  const [studentDeptFilter, setStudentDeptFilter] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logDeptFilter, setLogDeptFilter] = useState('');
  const [logDateFilter, setLogDateFilter] = useState('');

  // Form State for Adding Student
  const [newStudent, setNewStudent] = useState({
    id: '',
    name: '',
    roll: '',
    dep: '',
    course: 'B.Tech',
    year: '2026',
    semester: '1st',
    gender: 'Male',
    dob: '',
    email: '',
    phone: '',
    address: '',
    teacher: ''
  });
  const [formError, setFormError] = useState('');

  // Security & System Settings State
  const [settingsGeoEnabled, setSettingsGeoEnabled] = useState(false);
  const [settingsLat, setSettingsLat] = useState(28.6139);
  const [settingsLon, setSettingsLon] = useState(77.2090);
  const [settingsRadius, setSettingsRadius] = useState(100);
  const [settingsIpEnabled, setSettingsIpEnabled] = useState(false);
  const [settingsIpRanges, setSettingsIpRanges] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');



  // Geolocation for attendance check-in scan
  const [userCoords, setUserCoords] = useState(null);
  const [geoTrackingError, setGeoTrackingError] = useState('');

  // Subject & Timetable States
  const subjectScope = subjectCacheKey(token) || token;
  const [rowsScope, setRowsScope] = useState(subjectScope);
  const [subjectRows, setSubjects] = useState(() => readSubjectCache(subjectCacheKey(token)) || []);
  const subjects = isDemoMode || rowsScope === subjectScope ? subjectRows : [];
  const [subjectLoadState, setSubjectLoadState] = useState('loading');
  const subjectRequest = useRef(0);
  const [schedules, setSchedules] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_schedules');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [teachers, setTeachers] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_teachers');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  useEffect(() => {
    if (activeTab !== 'attendance' || !token || userRole === 'student') return;
    systemApi.fetchCurrentAutoSession(token)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.active && data.session) {
          setAutoSessionInfo(data.session);
          if (!selectedSubjectId && data.session.subject_id) {
            setSelectedSubjectId(String(data.session.subject_id));
          }
        }
      })
      .catch(() => {});
  }, [activeTab, token, userRole, selectedSubjectId]);
  const [selectedTeacherSubjectId, setSelectedTeacherSubjectId] = useState('');
  const [selectedReportSubjectId, setSelectedReportSubjectId] = useState('');
  const [selectedTeacherLogSubjectId, setSelectedTeacherLogSubjectId] = useState('');
  
  // Attendance Session Setup States for Teachers
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionDate, setSessionDate] = useState(getLocalDateString());
  const [sessionPeriod, setSessionPeriod] = useState('Period 1');
  const [sessionHistory, setSessionHistory] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_session_history');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Session History Filter States
  const [selectedHistoryDept, setSelectedHistoryDept] = useState('');
  const [historyFilterDate, setHistoryFilterDate] = useState(getLocalDateString());
  const [historyFilterPeriod, setHistoryFilterPeriod] = useState('');
  const [selectedHistorySubjectId, setSelectedHistorySubjectId] = useState('');
  
  // Forms to create subjects/schedules
  const [newSubject, setNewSubject] = useState({ name: '', code: '', department: '', teacher_id: '' });
  const [newSchedule, setNewSchedule] = useState({ subject_id: '', day_of_week: 'Monday', start_time: '', end_time: '' });
  const [subjectError, setSubjectError] = useState('');
  const [subjectSuccess, setSubjectSuccess] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');

  // Teaching Staff States
  const [newTeacher, setNewTeacher] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'teacher',
    subject_name: '',
    subject_code: '',
    subject_department: ''
  });
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [teacherError, setTeacherError] = useState('');
  const [teacherSuccess, setTeacherSuccess] = useState('');
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);

  // Student Edit States
  const [editingStudent, setEditingStudent] = useState(null);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editStudentError, setEditStudentError] = useState('');
  const [editStudentSuccess, setEditStudentSuccess] = useState('');

  useEffect(() => { showAddModalRef.current = showAddModal; }, [showAddModal]);
  useEffect(() => { showEditStudentModalRef.current = showEditStudentModal; }, [showEditStudentModal]);
  useEffect(() => { showWebcamModalRef.current = showWebcamModal; }, [showWebcamModal]);
  useEffect(() => { studentsRef.current = students; }, [students]);
  useEffect(() => { teachersRef.current = teachers; }, [teachers]);
  useEffect(() => { subjectsRef.current = subjects; }, [subjects]);

  const initialStudentDeepLinkRef = useRef(false);
  const initialTeacherDeepLinkRef = useRef(false);
  const initialSubjectDeepLinkRef = useRef(false);

  // Hydrate deep-linked Student / Teacher / Subject detail view from URL hash ONCE on initial data load
  useEffect(() => {
    try {
      const parts = window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
      if (!initialStudentDeepLinkRef.current && students.length > 0) {
        initialStudentDeepLinkRef.current = true;
        if (parts[0] === 'students' && parts[1] && parts[1] !== 'register' && !showEditStudentModalRef.current) {
          const match = students.find(s => String(s.id) === parts[1]);
          if (match) {
            setEditingStudent({
              ...match,
              course: match.course || 'B.Tech',
              year: match.year || '2026',
              semester: match.semester || '1st',
              gender: match.gender || 'Male',
              dob: match.dob || '',
              phone: match.phone || '',
              address: match.address || '',
              teacher: match.teacher || '',
              password: '',
            });
            setShowEditStudentModal(true);
          }
        }
      }
      if (!initialSubjectDeepLinkRef.current && subjects.length > 0) {
        initialSubjectDeepLinkRef.current = true;
        if (parts[0] === 'teachers' && parts[1] === 'subjects' && parts[2] && parts[2] !== 'register' && !selectedSubjectDetailRef.current) {
          const subMatch = subjects.find(s => String(s.id) === parts[2]);
          if (subMatch) {
            setSelectedSubjectDetail(subMatch);
            setSubjectFormView('detail');
          }
        }
      }
      if (!initialTeacherDeepLinkRef.current && teachers.length > 0) {
        initialTeacherDeepLinkRef.current = true;
        if (parts[0] === 'teachers' && parts[1] && !['register', 'subjects', 'timetable'].includes(parts[1]) && teacherFormViewRef.current === 'list') {
          const tMatch = teachers.find(t => String(t.id) === parts[1]);
          if (tMatch) {
            setEditingTeacher({ ...tMatch, password: '' });
            setTeacherFormView('detail');
          }
        }
      }
    } catch { /* ignore */ }
  }, [students, teachers, subjects]);

  // Unified route scroll position preservation across all tabs, settings, students, and teachers sub-views
  const studentSubScrollKey = showAddModal
    ? 'register'
    : (showEditStudentModal && editingStudent?.id ? `edit:${editingStudent.id}` : '');
  const teacherSubScrollKey = teachersSubTab === 'directory'
    ? (teacherFormView === 'detail' && editingTeacher?.id ? `directory:detail:${editingTeacher.id}` : (teacherFormView !== 'list' ? `directory:${teacherFormView}` : 'directory:'))
    : teachersSubTab === 'subjects'
      ? (subjectFormView === 'detail' && selectedSubjectDetail?.id ? `subjects:detail:${selectedSubjectDetail.id}` : (subjectFormView !== 'list' ? `subjects:${subjectFormView}` : 'subjects:'))
      : (showScheduleForm ? 'planner:new-schedule' : 'planner:');
  const settingsDetailScrollKey = activeTab === 'settings' && settingsDetailRoute && settingsDetailRoute.sub === activeSubSetting
    ? `${settingsDetailRoute.sub}:${settingsDetailRoute.mode}:${settingsDetailRoute.id ?? ''}`
    : '';
  const activeSubDetailKey = activeTab === 'students'
    ? studentSubScrollKey
    : activeTab === 'teachers'
      ? teacherSubScrollKey
      : (activeTab === 'settings' ? settingsDetailScrollKey : '');
  const computedRouteKey = getRouteScrollKey(activeTab, activeDashboardSubTab, activeSubSetting, activeSubDetailKey);

  useLayoutEffect(() => {
    if (!currentRouteKeyRef.current) {
      currentRouteKeyRef.current = computedRouteKey;
      routeNavStackRef.current = [computedRouteKey];
      return;
    }
    const nextKey = computedRouteKey;
    const prevKey = currentRouteKeyRef.current;
    if (nextKey === prevKey) return;

    const stack = routeNavStackRef.current;
    const folderItems = ['enterprise', 'extreme', 'ideas150', 'features7', 'new_features', 'wellness', 'ar_gamification'];
    const [pTab, , pSet, pDetail] = prevKey.split('|');
    const [nTab, , nSet, nDetail] = nextKey.split('|');
    const isBackToSettingsSubList =
      pTab === 'settings' && nTab === 'settings' && Boolean(pSet) && pSet === nSet && Boolean(pDetail) && !nDetail;
    const isBackToSubRoot =
      (prevKey.startsWith('dashboard|') && !prevKey.startsWith('dashboard||') && nextKey === 'dashboard|||') ||
      (pTab === 'settings' && Boolean(pSet) && nTab === 'settings' && !nSet) ||
      isBackToSettingsSubList ||
      (prevKey.startsWith('settings||') && folderItems.some(f => prevKey.includes(`|${f}|`)) && nextKey.includes('|features_folder|')) ||
      ((prevKey === 'students|||register' || prevKey.startsWith('students|||edit:')) && nextKey === 'students|||') ||
      (prevKey.startsWith('teachers|||directory:') && !prevKey.endsWith(':') && nextKey === 'teachers|||directory:') ||
      (prevKey.startsWith('teachers|||subjects:') && !prevKey.endsWith(':') && nextKey === 'teachers|||subjects:') ||
      (prevKey === 'teachers|||planner:new-schedule' && (nextKey === 'teachers|||planner:' || nextKey.startsWith('teachers|||subjects:detail:')));
    const isBackInStack = stack.length >= 2 && stack[stack.length - 2] === nextKey;
    const shouldRestore = pendingBackActionRef.current || isBackToSubRoot || isBackInStack;
    pendingBackActionRef.current = false;

    if (!shouldRestore) {
      scrollPositionsRef.current[prevKey] = Math.max(scrollPositionsRef.current[prevKey] || 0, getScrollTop());
    }

    scrollLockUntilRef.current = Date.now() + 180;
    currentRouteKeyRef.current = nextKey;

    const isTeacherSiblingTab =
      prevKey.startsWith('teachers|||') && prevKey.endsWith(':') &&
      nextKey.startsWith('teachers|||') && nextKey.endsWith(':');

    if (isBackInStack) {
      stack.pop();
    } else if (isTeacherSiblingTab && stack.length > 0) {
      stack[stack.length - 1] = nextKey;
    } else if (stack[stack.length - 1] !== nextKey) {
      stack.push(nextKey);
      if (stack.length > 30) stack.shift();
    }

    if (shouldRestore) {
      const targetY = scrollPositionsRef.current[nextKey] || 0;
      const restore = () => setScrollTop(targetY);
      requestAnimationFrame(() => {
        restore();
        requestAnimationFrame(restore);
      });
      const timerId = setTimeout(() => {
        scrollLockUntilRef.current = 0;
        restore();
      }, 100);
      return () => clearTimeout(timerId);
    }

    setScrollTop(0);
    const timerId = setTimeout(() => {
      scrollLockUntilRef.current = 0;
    }, 100);
    return () => clearTimeout(timerId);
  }, [computedRouteKey]);

  // Student Self Edit States
  const [showEditStudentSelfModal, setShowEditStudentSelfModal] = useState(false);
  const [editingStudentSelf, setEditingStudentSelf] = useState({ name: '', phone: '', address: '', gender: 'Male', dob: '' });
  const [editStudentSelfError, setEditStudentSelfError] = useState('');
  const [editStudentSelfSuccess, setEditStudentSelfSuccess] = useState('');

  // Teacher Self Edit States
  const [showEditTeacherSelfModal, setShowEditTeacherSelfModal] = useState(false);
  const [editingTeacherSelf, setEditingTeacherSelf] = useState({ name: '', email: '', subject_name: '', subject_code: '', subject_department: '' });
  const [editTeacherSelfError, setEditTeacherSelfError] = useState('');
  const [editTeacherSelfSuccess, setEditTeacherSelfSuccess] = useState('');



  // Fetch Dashboard Stats
  const fetchStats = async (authToken) => {
    if (isDemoMode) return;
    const usedToken = authToken || token;
    try {
      const res = await attendanceApi.fetchStats(usedToken);
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        localStorage.setItem('cached_stats', JSON.stringify(data));
        localStorage.setItem('cached_stats_inst_id', String(currentUser?.institution_id || ''));
        localStorage.setItem('cached_stats_timestamp', Date.now().toString());
        localStorage.setItem('cached_stats_date', getLocalDateString());
        setServerWarmingUp(false);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };



  // Fetch System Health & Telemetry
  const fetchSystemHealth = async (options = {}) => {
    if (isDemoMode) return;
    const isFresh = Boolean(options && options.fresh);
    try {
      const startTime = performance.now();
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const detailedUrl = isFresh
        ? `${API_BASE_URL}/health/detailed?fresh=true&t=${Date.now()}`
        : `${API_BASE_URL}/health/detailed`;
      const fetchOpts = isFresh
        ? { headers, skipCache: true, skipDedupe: true }
        : { headers };
      let res = await fetchWithDedupe(detailedUrl, fetchOpts);
      if (!res.ok) {
        const basicUrl = isFresh
          ? `${API_BASE_URL}/health/?fresh=true&t=${Date.now()}`
          : `${API_BASE_URL}/health/`;
        res = await fetchWithDedupe(basicUrl, isFresh ? { skipCache: true, skipDedupe: true } : {});
      }
      const endTime = performance.now();
      setApiLatency(Math.round(endTime - startTime));
      const serverTimeHdr = res.headers?.get?.('X-Response-Time');
      if (serverTimeHdr) {
        const parsedMs = parseFloat(String(serverTimeHdr).replace(/[^0-9.]/g, ''));
        if (!Number.isNaN(parsedMs)) {
          setServerLatencyMs(Number(parsedMs.toFixed(1)));
        }
      }
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      } else {
        setSystemHealth(prev => ({
          status: 'DEGRADED',
          database: 'UNKNOWN',
          models: { yunet: 'UNKNOWN', sface: 'UNKNOWN' },
          metrics: { cpu_percent: 0.0, memory_percent: 0.0, uptime_seconds: prev?.metrics?.uptime_seconds || 0 },
          platform: { system: 'UNKNOWN', release: 'UNKNOWN', python_version: 'UNKNOWN' }
        }));
      }
    } catch (err) {
      console.error('Error fetching system health:', err);
      setSystemHealth(prev => ({
        status: 'OFFLINE',
        database: 'OFFLINE',
        models: { yunet: 'OFFLINE', sface: 'OFFLINE' },
        metrics: { cpu_percent: 0.0, memory_percent: 0.0, uptime_seconds: prev?.metrics?.uptime_seconds || 0 },
        platform: { system: 'OFFLINE', release: 'OFFLINE', python_version: 'OFFLINE' }
      }));
      setApiLatency(-1);
      setServerLatencyMs(null);
    }
  };

  // Fetch Custom Departments
  const fetchDepartments = async (authToken) => {
    if (isDemoMode) return;
    const usedToken = authToken || token;
    if (!usedToken) return;
    try {
      const res = await systemApi.fetchDepartments(usedToken);
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setDepartmentsList(data);
        setDepartments(data.map(department => department.name));
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  // Sync form defaults with available departments
  useEffect(() => {
    if (departments && departments.length > 0) {
      const defaultDept = departments[0];
      setNewStudent(prev => ({ ...prev, dep: departments.includes(prev.dep) ? prev.dep : defaultDept }));
      setNewSubject(prev => ({ ...prev, department: departments.includes(prev.department) ? prev.department : defaultDept }));
      setNewTeacher(prev => ({ ...prev, subject_department: departments.includes(prev.subject_department) ? prev.subject_department : defaultDept }));
    }
  }, [departments]);

  // Whenever the active institution changes, wipe tenant-scoped state & caches and re-fetch fresh data
  const prevInstIdRef = useRef(currentUser?.institution_id);
  useEffect(() => {
    if (currentUser?.institution_id !== undefined && prevInstIdRef.current !== undefined && prevInstIdRef.current !== currentUser?.institution_id) {
      console.log(`Institution switched from ${prevInstIdRef.current} to ${currentUser.institution_id}. Purging tenant cache...`);
      localStorage.removeItem('cached_students');
      localStorage.removeItem('cached_students_timestamp');
      localStorage.removeItem('cached_stats');
      localStorage.removeItem('cached_stats_inst_id');
      localStorage.removeItem('cached_stats_timestamp');
      localStorage.removeItem('cached_stats_date');
      localStorage.removeItem('cached_logs');
      localStorage.removeItem('cached_logs_timestamp');
      localStorage.removeItem('cached_departments');
      localStorage.removeItem('cached_departmentsList');
      localStorage.removeItem('cached_teachers');
      localStorage.removeItem('cached_subjects');
      localStorage.removeItem('cached_schedules');
      localStorage.removeItem('cached_students_inst_id');
      
      setStudents([]);
      setLogs([]);
      setDepartments([]);
      setDepartmentsList([]);
      setTeachers([]);
      setSubjects([]);
      setSchedules([]);

      if (token) {
        fetchDepartments(token);
        fetchSubjects(token).then(() => fetchStudents(token));
        fetchTeachers(token);
        fetchStats(token);
        fetchLogs(token);
      }
    }
    prevInstIdRef.current = currentUser?.institution_id;
  }, [currentUser?.institution_id, token]);

  // Sync and purge mismatched tenant cached students whenever currentUser is known
  useEffect(() => {
    if (currentUser?.institution_id) {
      const currentInst = String(currentUser.institution_id);
      const cachedInst = localStorage.getItem('cached_students_inst_id');
      if (cachedInst && cachedInst !== currentInst) {
        console.warn(`[MULTI-TENANT] Invalidation: Cached students belong to inst ${cachedInst}, but current user is in inst ${currentInst}. Purging!`);
        localStorage.removeItem('cached_students');
        localStorage.removeItem('cached_students_inst_id');
        setStudents([]);
        fetchStudents(token);
      }
    }
  }, [currentUser?.institution_id, token]);

  // Fetch Registered Students
  const fetchStudents = async (authToken) => {
    if (isDemoMode) return;
    const usedToken = authToken || token;
    try {
      const res = await studentApi.listStudents(usedToken);
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        // Strict tenant safety filter
        const userInst = Number(currentUser?.institution_id || 1);
        const safeData = Array.isArray(data)
          ? data.filter(s => {
              if (s.institution_id === undefined || s.institution_id === null) return true;
              return Number(s.institution_id) === userInst;
            })
          : [];
        setStudents(safeData);
        // Instant sync with dashboard stats so enrolled count updates with 0ms lag!
        setStats(prev => ({
          ...prev,
          total_students: safeData.length
        }));
        localStorage.setItem('cached_students', JSON.stringify(safeData));
        localStorage.setItem('cached_students_inst_id', String(userInst));
        localStorage.setItem('cached_students_timestamp', Date.now().toString());
      } else {
        console.warn(`fetchStudents returned status ${res.status}, retaining cached students`);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  // Fetch Attendance Logs (Supports options.limit with safe rich history preservation)
  const fetchLogs = async (authToken, options = {}) => {
    if (isDemoMode) return;
    const usedToken = typeof authToken === 'string' ? authToken : token;
    if (userRole === 'student') {
      fetchStudentLogs(usedToken);
    }
    try {
      const limitVal = options && options.limit ? options.limit : 300;
      const res = await attendanceApi.fetchLogs(usedToken, 0, limitVal);
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLogs(prev => {
            if (options.limit && options.limit < 50 && prev && prev.length > data.length) {
              return prev;
            }
            return data;
          });
          if (!options.limit || options.limit >= 50) {
            try {
              localStorage.setItem('cached_logs', JSON.stringify(data));
              localStorage.setItem('cached_logs_timestamp', Date.now().toString());
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error('Error fetching logs, retaining cached data:', err);
    }
  };

  // Fetch subjects
  const fetchSubjects = async (authToken) => {
    if (isDemoMode) return;
    const usedToken = authToken || token;
    if (!usedToken) return;
    const request = ++subjectRequest.current;
    const key = subjectCacheKey(usedToken);
    const saved = readSubjectCache(key);
    const scope = key || usedToken;
    if (!saved && scope !== rowsScope) setSubjects([]);
    setRowsScope(scope);
    if (saved) setSubjects(saved);
    setSubjectLoadState(saved ? 'ready' : 'loading');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await systemApi.fetchSubjects(usedToken, controller.signal);
      if (request !== subjectRequest.current) return;
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error('Subject list unavailable');
      const data = await res.json();
      if (request !== subjectRequest.current) return;
      if (!Array.isArray(data)) throw new Error('Invalid subject list');
      setSubjects(data);
      setSubjectLoadState('ready');
      try { if (key) localStorage.setItem(key, JSON.stringify(data)); } catch { /* Storage can be disabled. */ }
    } catch {
      if (request === subjectRequest.current) setSubjectLoadState('error');
    } finally {
      clearTimeout(timer);
    }
  };

  // Fetch active users counts (Admins only)
  const fetchActiveUsers = async () => {
    if (isDemoMode) return;
    await authFetchActiveUsers();
  };

  // Send heartbeat ping
  const sendHeartbeat = async () => {
    if (isDemoMode) return;
    await authSendHeartbeat();
  };

  // Fetch session history (Instant 0ms retrieval with multi-level local cache)
  const fetchSessionHistory = async (subjId = null, dateVal = null, periodVal = null) => {
    if (isDemoMode) return;
    try {
      const sId = subjId || selectedHistorySubjectId || selectedSubjectId || selectedTeacherSubjectId;
      const dVal = dateVal !== null ? dateVal : historyFilterDate;
      const pVal = periodVal !== null ? periodVal : historyFilterPeriod;

      const data = await attendanceApi.fetchSessionHistory(token, sId, dVal, pVal);
      if (Array.isArray(data)) {
        setSessionHistory(data);
        try {
          localStorage.setItem('cached_session_history', JSON.stringify(data));
          if (sId) {
            localStorage.setItem(`cached_session_history_${sId}`, JSON.stringify(data));
          }
        } catch { /* storage fallback */ }
      }
    } catch (err) {
      if (err.status === 401) {
        handleLogout();
        return;
      }
      console.error('Error fetching session history, retaining cached data:', err);
    }
  };

  // Handle Manual Attendance submission - uses new bulk POST endpoint
  const handleSubmitManualAttendance = async () => {
    const todayStr = getLocalDateString();
    if (manualDate && manualDate > todayStr) {
      setManualFeedback(`Future attendance date (${manualDate}) cannot be marked — this date has not arrived yet.`);
      playCyberSound('error');
      return;
    }
    const targetSubjectId = manualSubjectId || (subjects && subjects.length > 0 ? String(subjects[0].id) : '');
    const parsedSubjectId = parseInt(targetSubjectId, 10);
    if (!targetSubjectId || Number.isNaN(parsedSubjectId)) {
      alert('Please select a subject before submitting manual attendance.');
      return;
    }
    if (!manualSubjectId) {
      setManualSubjectId(targetSubjectId);
    }
    setIsSubmittingManual(true);
    setManualFeedback('');
    playCyberSound('click');

    const selectedSubject = subjects.find(sub => sub.id === parsedSubjectId);
    const subjectDept = selectedSubject ? selectedSubject.department : '';
    const classStudents = students.filter(s => !subjectDept || departmentsMatch(s.dep || s.department, subjectDept));

    if (classStudents.length === 0) {
      setManualFeedback(subjectDept ? `No students enrolled in department: ${subjectDept}.` : 'No students found for this subject.');
      playCyberSound('error');
      setIsSubmittingManual(false);
      return;
    }

    try {
      // Build bulk records array
      const records = classStudents.map(student => {
        const stateData = manualAttendanceData[student.id] || { status: 'Present', remarks: '' };
        return {
          student_id: student.id,
          attendance_status: stateData.status,
          subject_id: parsedSubjectId,
          custom_date: manualDate,
          period: manualPeriod,
          remarks: stateData.remarks || null
        };
      });

      const coordinates = await attendanceCoordinates(settingsGeoEnabled);
      const response = await attendanceApi.submitManualAttendance(token, { records, ...coordinates });
      const result = await response.json().catch(() => null);
      if (!response.ok || !Number.isInteger(result?.success_count)) {
        throw new Error(typeof result?.detail === 'string' ? result.detail : `Register save could not be confirmed (HTTP ${response.status}). Please retry.`);
      }
      const errorDetail = Array.isArray(result.errors) && result.errors.length > 0 ? ` (${result.errors[0]})` : '';
      if (result.success_count === 0) {
        throw new Error(`No attendance records were saved for ${manualDate}, ${manualPeriod}.${errorDetail}`);
      }
      setManualFeedback(`Saved ${result.success_count} of ${records.length} attendance records for ${manualDate}, ${manualPeriod}.${errorDetail}`);
      playCyberSound(result.fail_count ? 'error' : 'success');
      setSelectedHistorySubjectId(String(parsedSubjectId));
      setHistoryFilterDate(manualDate);
      setHistoryFilterPeriod(manualPeriod);
      fetchSessionHistory(parsedSubjectId, manualDate, manualPeriod);
      fetchStats();
      fetchLogs();
    } catch (err) {
      setManualFeedback(err.message || 'Unable to confirm the save. Check your connection and retry.');
      playCyberSound('error');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Toggle student attendance status manually
  const toggleStudentSessionAttendance = async (studentId, currentStatus, dateVal, periodVal) => {
    if (isDemoMode) {
      setSessionHistory(prevHistory => {
        return prevHistory.map(sess => {
          if (sess.date === dateVal && sess.period === periodVal) {
            const nextStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
            const updatedStudents = sess.students.map(st => {
              if (st.id === studentId) {
                return { ...st, status: nextStatus };
              }
              return st;
            });
            const present_count = updatedStudents.filter(st => st.status === 'Present').length;
            const absent_count = updatedStudents.filter(st => st.status === 'Absent').length;
            return {
              ...sess,
              present_count,
              absent_count,
              students: updatedStudents
            };
          }
          return sess;
        });
      });
      playCyberSound('success');
      return;
    }

    try {
      const nextStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
      const sId = selectedHistorySubjectId || selectedSubjectId || selectedTeacherSubjectId;
      await attendanceApi.toggleSessionStatus(token, {
        student_id: studentId,
        attendance_status: nextStatus,
        subject_id: sId ? parseInt(sId) : null,
        custom_date: dateVal,
        custom_time: periodVal
      });

      playCyberSound('success');
      fetchSessionHistory();
    } catch (err) {
      if (err.status === 401) {
        handleLogout();
        return;
      }
      console.error('Error toggling student attendance:', err);
      alert(err.message || 'Failed to connect to backend server.');
    }
  };

  // Fetch schedules
  const fetchSchedules = async (authToken) => {
    if (isDemoMode) return;
    const usedToken = authToken || token;
    try {
      const res = await systemApi.fetchSchedules(usedToken);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
        localStorage.setItem('cached_schedules', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  // Fetch teachers
  const lastTeachersFetchTimeRef = useRef(0);
  const fetchTeachers = async (authToken, force = false) => {
    if (isDemoMode) return;
    const now = Date.now();
    if (!force && !authToken && teachers.length > 0 && now - lastTeachersFetchTimeRef.current < 60000) {
      return;
    }
    lastTeachersFetchTimeRef.current = now;
    const usedToken = authToken || token;
    try {
      const res = await teacherApi.listTeachers(usedToken);
      if (res.ok) {
        const data = await res.json();
        const teacherUsers = data.filter(u => u.role === 'teacher' || u.role === 'admin');
        setTeachers(teacherUsers);
        localStorage.setItem('cached_teachers', JSON.stringify(teacherUsers));
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  // Student subject stats
  const [studentSubjectStats, setStudentSubjectStats] = useState({});
  const [studentLeaveRequests, setStudentLeaveRequests] = useState([]);
  const [adminLeaveRequests, setAdminLeaveRequests] = useState([]);
  const [isFetchingLeaves, setIsFetchingLeaves] = useState(false);

  const fetchStudentLeaves = async (authToken) => {
    if (isDemoMode) return;
    const usedToken = authToken || token;
    try {
      const res = await studentApi.fetchMyLeaves(usedToken);
      if (res.ok) {
        const data = await res.json();
        setStudentLeaveRequests(data);
      }
    } catch (err) {
      console.error('Error fetching student leaves:', err);
    }
  };

  const fetchAdminLeaves = async (authToken) => {
    if (isDemoMode) return;
    const usedToken = authToken || token;
    setIsFetchingLeaves(true);
    try {
      const res = await apiGet('/users/leaves', { token: usedToken });
      if (res.ok) {
        const data = await res.json();
        setAdminLeaveRequests(data);
      }
    } catch (err) {
      console.error('Error fetching admin leaves:', err);
    } finally {
      setIsFetchingLeaves(false);
    }
  };

  const fetchStudentSubjectStats = async (studentDept, studentId, authToken = null) => {
    if (isDemoMode) return;
    if (!studentDept || !studentId) return;
    const activeToken = authToken || token;
    if (!activeToken) return;

    // 0ms instant cached load
    try {
      const cached = localStorage.getItem(`cached_student_subject_stats_${studentId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          setStudentSubjectStats(parsed);
        }
      }
    } catch { /* ignore */ }

    try {
      let subjectsList = await systemApi.fetchSubjects(activeToken);
      if (subjectsList && typeof subjectsList.json === 'function') {
        subjectsList = subjectsList.ok ? await subjectsList.json() : [];
      }
      if (!Array.isArray(subjectsList) || subjectsList.length === 0) return;
      
      const statsMap = {};
      const CHUNK_SIZE = 2;
      for (let i = 0; i < subjectsList.length; i += CHUNK_SIZE) {
        const chunk = subjectsList.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (sub) => {
          try {
            const res = await attendanceApi.fetchMyReport(activeToken, sub.id);
            if (res.ok) {
              const data = await res.json();
              const myRecord = data?.students?.find(s => s.id === studentId);
              if (myRecord) {
                const pDays = myRecord.present_days || 0;
                const tDays = Math.max(myRecord.total_days || 0, pDays);
                const pct = Math.min(100.0, Math.max(0.0, Number(myRecord.percentage) || 0));
                statsMap[sub.id] = {
                  subjectName: sub.name,
                  subjectCode: sub.code,
                  presentDays: pDays,
                  totalDays: tDays,
                  percentage: pct,
                  lowAttendance: pct < 75.0 && tDays > 0
                };
              } else {
                statsMap[sub.id] = {
                  subjectName: sub.name,
                  subjectCode: sub.code,
                  presentDays: 0,
                  totalDays: 0,
                  percentage: 0.0,
                  lowAttendance: false
                };
              }
            }
          } catch (err) {
            console.error(`Error fetching stats for subject ${sub.id}:`, err);
          }
        }));
      }
      setStudentSubjectStats(statsMap);
      try {
        localStorage.setItem(`cached_student_subject_stats_${studentId}`, JSON.stringify(statsMap));
      } catch { /* ignore */ }
    } catch (err) {
      console.error('Error in fetchStudentSubjectStats:', err);
    }
  };

  // WebSocket Client for Real-time Attendance Alerts
  useEffect(() => {
    if (!token || userRole === 'student') return undefined;

    let wsUrl = API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + `/attendance/ws?token=${encodeURIComponent(token)}`;
    let socket;
    let reconnectTimeout;
    let active = true;

    const connect = () => {
      if (import.meta.env?.DEV) console.log('Connecting to WebSocket:', wsUrl);
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        if (import.meta.env?.DEV) console.log('WebSocket connection established.');
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'attendance_marked') {
            // Only trigger if it is for the current institution
            if (currentUser && data.institution_id === currentUser.institution_id) {
              // 1. Play success notification sound
              playCyberSound('success');
              
              // 2. Update scan status message
              setScanStatus(`Live: ${data.name} checked in (${data.status})`);
              addDiagnosticLog(`WS BROADCAST: ${data.name} marked ${data.status} at ${data.time}`);
              
              // 3. Trigger speech if voice enabled
              if (voiceEnabled) {
                handleSpeakText(`Welcome ${data.name}. Attendance registered.`);
              }

              // 4. Reload logs & stats dynamically
              fetchStats();
              fetchLogs();
            }
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      socket.onclose = () => {
        if (import.meta.env?.DEV) console.log('WebSocket disconnected.');
        setWsConnected(false);
        if (active) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };

      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        socket.close();
      };
    };

    connect();

    return () => {
      active = false;
      clearTimeout(reconnectTimeout);
      if (socket) {
        socket.close();
      }
    };
  }, [token, userRole, currentUser, voiceEnabled]);

  const lastSettingsFetchTimeRef = useRef(0);
  const fetchSystemSettings = async (force = false) => {
    if (isDemoMode) return;
    const now = Date.now();
    if (!force && now - lastSettingsFetchTimeRef.current < 60000) {
      return;
    }
    lastSettingsFetchTimeRef.current = now;
    try {
      const response = await systemApi.fetchSettings(token);
      if (!response.ok) throw new Error("Could not load institution settings");
      const data = await response.json();
      if (data) {
        setSettingsGeoEnabled(data.geofencing_enabled);
        setSettingsLat(data.center_latitude);
        setSettingsLon(data.center_longitude);
        setSettingsRadius(data.allowed_radius_meters);
        setSettingsIpEnabled(data.ip_restriction_enabled);
        setSettingsIpRanges(data.allowed_ip_ranges);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const saveSystemSettings = async () => {
    setIsSavingSettings(true);
    setSettingsMessage('');
    setSettingsError('');

    if (isDemoMode) {
      setTimeout(() => {
        setSettingsMessage('SIMULATOR ACTION: System settings updated locally.');
        setIsSavingSettings(false);
        setTimeout(() => setSettingsMessage(''), 3000);
      }, 400);
      return;
    }

    try {
      const payload = {
        geofencing_enabled: settingsGeoEnabled,
        center_latitude: parseFloat(settingsLat),
        center_longitude: parseFloat(settingsLon),
        allowed_radius_meters: parseFloat(settingsRadius),
        ip_restriction_enabled: settingsIpEnabled,
        allowed_ip_ranges: settingsIpRanges
      };
      const response = await systemApi.saveSettings(token, payload);
      if (!response.ok) throw new Error("Institution settings could not be saved.");
      setSettingsMessage('Settings updated successfully!');
      setTimeout(() => setSettingsMessage(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setSettingsError(err.message || 'Failed to update settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSpeak = (textEnglish) => {
    if (!textEnglish) return;
    const lower = textEnglish.toLowerCase();
    
    // Play electronic synth cue first
    if (lower.includes('failed') || lower.includes('error') || lower.includes('denied') || lower.includes('not recognized')) {
      playCyberSound('error');
    } else if (lower.includes('started') || lower.includes('liveness verified')) {
      playCyberSound('scan');
    } else {
      playCyberSound('success');
    }

    // AI Luxury Voice Announcement using Web Speech API
    if (soundEnabled && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        const cleanText = textEnglish.replace(/[*#_`~]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Choose premium sounding voice if possible
        const voices = window.speechSynthesis.getVoices();
        const premiumVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Natural') || v.lang.startsWith('en-'));
        if (premiumVoice) utterance.voice = premiumVoice;

        utterance.rate = voiceSpeed || 1.0;
        utterance.pitch = 1.05; // Slightly higher pitch for futuristic luxury aura
        utterance.volume = audioVolume || 0.6;
        
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis failed:', err);
      }
    }
  };

  // Webcam Capture & Training handlers

  const enrollmentRequest = useRef(0);
  const startWebcam = async () => {
    const request = ++enrollmentRequest.current;
    setWebcamError('');
    setWebcamBootActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: { ideal: 'user' } }
      });
      if (request !== enrollmentRequest.current || !videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
    } catch (err) {
      if (request !== enrollmentRequest.current) return;
      setWebcamBootActive(false);
      setWebcamError(err.name === 'NotAllowedError' ? 'Allow camera access to register your face.' : 'Could not open the camera. Check the device and retry.');
    }
  };

  useEffect(() => {
    if (!showWebcamModal || !captureStudent?.id) return;
    startWebcam();
    return stopWebcam;
  }, [showWebcamModal, captureStudent?.id]);

  const stopWebcam = () => {
    enrollmentRequest.current++;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamBootActive(false);
    setWebcamActive(false);
    setIsCapturing(false);
  };

  const closeWebcamModal = () => {
    stopWebcam();
    setShowWebcamModal(false);
    setCaptureStudent(null);
    setCapturedCount(0);
    setWebcamError('');
  };

  // Start/stop face recognition attendance scanner
  const startAttendanceCam = async () => {
    playCyberSound('click');
    if (lockdownActive) {
      setAttendanceError('SECURITY LOCKDOWN ACTIVE: Camera interface blocked.');
      setScanStatus('Camera Error');
      return;
    }
    setAttendanceError('');
    setGeoTrackingError('');
    setScanStatus('Initializing location & camera...');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          addDiagnosticLog(`GPS Telemetry locked: lat=${position.coords.latitude.toFixed(4)}, lon=${position.coords.longitude.toFixed(4)}`);
        },
        (error) => {
          console.warn("Geolocation access denied/failed:", error);
          setGeoTrackingError("Location access denied. Please enable location permissions.");
          addDiagnosticLog('WARN: Geolocation permissions blocked.');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setGeoTrackingError("Geolocation is not supported by your browser.");
      addDiagnosticLog('WARN: Geolocation not supported by client.');
    }

    setScannerBootActive(true);
    if (cameraScanSettings?.cameraSource === 'external') {
      if (!cameraScanSettings.externalIpUrl) {
        setScannerBootActive(false);
        setAttendanceError('Please configure WiFi Camera IP/URL in Settings first.');
        setScanStatus('Camera Error');
        addDiagnosticLog('ERROR: WiFi Camera URL not configured.');
        return;
      }
      setScanStatus('Connecting to WiFi IP Camera...');
      addDiagnosticLog('Optical feed: WiFi IP Camera (' + cameraScanSettings.externalIpUrl + ')');
      return;
    }

    try {
      await requestNativePermissions();
      const preset = getCameraPreset(cameraScanSettings.preset || 'turbo');
      const stream = await openCameraStream(cameraScanSettings.preset || 'turbo', attendanceFacingModeRef.current);
      if (attendanceVideoRef.current) {
        attendanceVideoRef.current.srcObject = stream;
        attendanceVideoRef.current.setAttribute('playsinline', 'true');
        attendanceVideoRef.current.muted = true;
        const shouldMirror = attendanceFacingModeRef.current === 'user' && cameraScanSettings.mirrorPreview !== false;
        if (shouldMirror) {
          attendanceVideoRef.current.style.transform = 'scaleX(-1)';
        } else {
          attendanceVideoRef.current.style.transform = 'none';
        }
        try {
          await attendanceVideoRef.current.play();
        } catch (playErr) {
          console.warn('Camera play() deferred:', playErr);
        }
      }
      attendanceStreamRef.current = stream;
      handleScannerBootComplete();
    } catch (err) {
      setScannerBootActive(false);
      setAttendanceError("Camera access is blocked. Allow camera access from your browser's address-bar permissions, then try again.");
      setScanStatus('Camera Error');
      addDiagnosticLog('ERROR: Camera interface binding failed.');
    }
  };

  const handleScannerBootComplete = useCallback(() => {
    setScannerBootActive(false);
    setAttendanceActive(true);
    setScanStatus('Scanning...');
    playCyberSound('success');
    addDiagnosticLog('Secure optical feed active: SEC_CAM_01');
    addDiagnosticLog('Initializing FaceMesh coordinate mapping...');
    handleSpeak("Scanner started. Ready for scanning.");
    const activeInstId = currentUser?.institution_id || 1;
    fastFaceEngine.syncEmbeddings(API_BASE_URL, token, activeInstId);
    offlineAttendanceQueue.flushQueue(API_BASE_URL, token, activeInstId);
    const video = attendanceVideoRef.current;
    if (video?.srcObject) {
      video.play().catch((err) => console.warn('Post-boot video play failed:', err));
    }
  }, []);

  const stopAttendanceCam = () => {
    try {
      playCyberSound('click');
      if (attendanceStreamRef.current) {
        try {
          attendanceStreamRef.current.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.warn('Error stopping tracks:', err);
        }
        attendanceStreamRef.current = null;
      }
      if (attendanceVideoRef.current) {
        attendanceVideoRef.current.srcObject = null;
      }
      if (attendanceCanvasRef.current) {
        const canvas = attendanceCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      setScannerBootActive(false);
      setAttendanceActive(false);
      dismissScannedStudent();
      setUserCoords(null);
      setGeoTrackingError('');
      setScanStatus('Camera Offline');
      setDiagnosticWarnings({ lighting: '', distance: '' });
      lastFaceBoxRef.current = null;
      lastFaceDetectedRef.current = false;
      setFaceDetected(false);
      recognitionBusyRef.current = false;
      if (faceDetectorRef.current) {
        try { faceDetectorRef.current.close(); } catch (err) { /* ignore */ }
        faceDetectorRef.current = null;
      }
      addDiagnosticLog('Ocular feed terminated.');
      try {
        handleSpeak("Scanner stopped.");
      } catch (err) {
        console.warn('Speech feedback failed:', err);
      }
    } catch (err) {
      console.error('Error in stopAttendanceCam:', err);
    }
  };

  const toggleAttendanceCameraFacing = async () => {
    playCyberSound('click');
    const newFacingMode = attendanceFacingMode === 'user' ? 'environment' : 'user';
    setAttendanceFacingMode(newFacingMode);
    addDiagnosticLog(`Switching attendance camera feed to: ${newFacingMode}`);

    if (attendanceActive || scannerBootActive) {
      if (attendanceStreamRef.current) {
        try {
          attendanceStreamRef.current.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.warn('Error stopping tracks for switch:', err);
        }
        attendanceStreamRef.current = null;
      }
      if (attendanceVideoRef.current) {
        attendanceVideoRef.current.srcObject = null;
      }

      setScannerBootActive(true);
      setAttendanceActive(false);

      try {
        const stream = await openCameraStream(cameraScanSettings.preset || 'turbo', newFacingMode);
        if (attendanceVideoRef.current) {
          attendanceVideoRef.current.srcObject = stream;
          attendanceVideoRef.current.setAttribute('playsinline', 'true');
          attendanceVideoRef.current.muted = true;
          const shouldMirror = newFacingMode === 'user' && cameraScanSettings.mirrorPreview !== false;
          if (shouldMirror) {
            attendanceVideoRef.current.style.transform = 'scaleX(-1)';
          } else {
            attendanceVideoRef.current.style.transform = 'none';
          }
          try {
            await attendanceVideoRef.current.play();
          } catch (playErr) {
            console.warn('Camera play() deferred:', playErr);
          }
        }
        attendanceStreamRef.current = stream;
        handleScannerBootComplete();
      } catch (err) {
        setScannerBootActive(false);
        setAttendanceActive(false);
        setAttendanceError('Unable to switch camera. Please check permissions.');
        setScanStatus('Camera Error');
        addDiagnosticLog('ERROR: Camera switch interface binding failed.');
      }
    }
  };


   const triggerFaceRecognition = async () => {
    const isExternal = cameraScanSettings?.cameraSource === 'external';
    const video = isExternal ? attendanceImageRef.current : attendanceVideoRef.current;
    if (!video || recognitionBusyRef.current || policySaving.current) return;
    if (!isDemoMode && !livenessBypassRef.current && !livenessTokenRef.current) return;
    if (!lastLandmarksRef.current?.length && !lastFaceDetectedRef.current) {
      setScanStatus('No face detected — look at camera');
      return;
    }
    const preset = getCameraPreset(cameraScanSettings.preset || 'turbo');

    const blob = await captureFrameBlob(
      video,
      preset.captureWidth,
      preset.captureHeight,
      preset.jpegQuality
    );
    if (!blob) {
      livenessTokenRef.current = null;
      livenessStatusRef.current = 'verifying';
      setLivenessStatus('verifying');
      setLivenessMessage('Camera frame unavailable. Hold steady and retry.');
      return;
    }
    if (recognitionBusyRef.current || policySaving.current ||
        (!isDemoMode && !livenessBypassRef.current && !livenessTokenRef.current)) return;
    recognitionBusyRef.current = true;
    let matchSuccess = false;

    if (isDemoMode) {
        setIsScanning(true);
        setScanStatus('Logging presence...');
        addDiagnosticLog('Signature acquisition: Compiling SFace vector locally...');
        
        setTimeout(() => {
          const candidates = students.length > 0 ? students : [
            { id: 101, name: 'Aarav Sharma', roll: '2023CSE01', dep: 'Computer Science' }
          ];
          const matched = candidates[Math.floor(Math.random() * candidates.length)];
          const confidenceVal = parseFloat((88.0 + Math.random() * 11.0).toFixed(1));
          const isMatchPass = !biometricConfidenceFilterEnabled || (confidenceVal / 100) >= biometricMatchThreshold;
          
          if (!isMatchPass) {
            setScanStatus(`Low Confidence: ${confidenceVal}% - Verification Failed`);
            playCyberSound('error');
            addDiagnosticLog(`WARNING: Biometric match rejected due to low confidence (${confidenceVal}% < ${Math.round(biometricMatchThreshold * 100)}%)`);
            setIsScanning(false);
            recognitionBusyRef.current = false;
            
            setTimeout(() => {
              eyeStateRef.current = 'open';
              livenessStatusRef.current = 'verifying';
              setLivenessStatus('verifying');
              setLivenessMessage(livenessBypassRef.current ? 'Scanning...' : 'Please blink your eyes to verify.');
              setScanStatus('Scanning...');
            }, 400);
            return;
          }
          const confidence = confidenceVal.toString();
          const newly_marked = Math.random() > 0.3;
          matchSuccess = true;
          
          setScanStatus(newly_marked ? `Recognized: ${matched.name} (${confidence}%)` : `Recognized: ${matched.name} (Attendance already recorded for this class today.)`);
          playCyberSound('success');
          triggerNativeHaptic('light');
          if (explorationSettings.confettiOnMatch) triggerConfettiBurst();
          
          const now = new Date();
          const timeStr = sessionActive ? sessionPeriod : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const dateStr = sessionActive ? sessionDate.split('-').reverse().join('/') : `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
          
          const matchedSubject = subjects.find(s => String(s.id) === String(effectiveSubId));
          const demoPhoto = matched.photo || matched.profile_pic || matched.details?.profile_pic || (matched.id ? `${API_BASE_URL}/students/${matched.id}/photo` : null);
          showScannedStudentWithTimeout({
            id: matched.id,
            name: matched.name,
            roll: matched.roll,
            dep: matched.dep,
            course: matched.course || null,
            photo: demoPhoto,
            time: timeStr,
            clockTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            date: dateStr,
            period: sessionActive ? sessionPeriod : resolvePeriodName(),
            subject_name: matchedSubject ? `${matchedSubject.name} (${matchedSubject.code})` : (effectiveSubId ? `Subject #${effectiveSubId}` : null),
            confidence: confidence,
            streak_days: matched.streak_days || 1,
            status: newly_marked ? 'Present' : 'Already Marked'
          });
          addDiagnosticLog(`MATCH FOUND: ${matched.name} (Accuracy: ${confidence}%)`);

          const mockFaceBox = lastFaceBoxRef.current ? [
            lastFaceBoxRef.current.x,
            lastFaceBoxRef.current.y,
            lastFaceBoxRef.current.w,
            lastFaceBoxRef.current.h
          ] : [100, 100, 150, 150];
          updateServerRecognizedFaces({
            faces: [{
              name: matched.name,
              confidence: confidenceVal,
              newly_marked: newly_marked,
              box: mockFaceBox
            }],
            timestamp: Date.now(),
            captureWidth: video instanceof HTMLVideoElement ? video.videoWidth || 640 : video.naturalWidth || 640,
            captureHeight: video instanceof HTMLVideoElement ? video.videoHeight || 480 : video.naturalHeight || 480,
          });
          
          if (newly_marked) {
            const newLog = {
              id: Date.now().toString(),
              roll: matched.roll,
              name: matched.name,
              department: matched.dep,
              date: dateStr,
              time: timeStr,
              attendance: 'Present',
              subject_id: selectedSubjectId ? parseInt(selectedSubjectId) : 1
            };
            setLogs(prev => [newLog, ...prev]);
            
            setStats(prev => ({
              ...prev,
              total_present_today: prev.total_present_today + 1,
              total_absent_today: Math.max(0, prev.total_absent_today - 1),
              average_attendance_rate: parseFloat((((prev.total_present_today + 1) / prev.total_students) * 100).toFixed(1))
            }));
            
            handleSpeak(`Attendance marked for ${matched.name}.`);
          } else {
            handleSpeak(`${matched.name}, your attendance is already marked.`);
          }
          
          setIsScanning(false);
          recognitionBusyRef.current = false;
          
          setTimeout(() => {
            // Note: Keep scannedStudent visible on screen until next scan or dismissal!
            updateServerRecognizedFaces(null);
            eyeStateRef.current = 'open';
            livenessStatusRef.current = 'verifying';
            setLivenessStatus('verifying');
            setLivenessMessage(livenessBypassRef.current ? 'Scanning...' : 'Please blink your eyes to verify.');
            setScanStatus('Scanning...');
            if (voiceAnnounceLiveness && !livenessBypassRef.current) {
              handleSpeak("Please blink your eyes to verify.");
            }
          }, 900);
          
        }, 250);
        return;
      }

      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');

      const effectiveSubId = selectedSubjectId || (currentUser?.details?.subject_id) || (subjects && subjects.length > 0 ? subjects[0].id : null);
      const activeInstId = currentUser?.institution_id || 1;

      try {
        setIsScanning(true);
        setScanStatus('Logging presence...');
        addDiagnosticLog('Signature acquisition: Compiling SFace vector...');
        
        const queryParams = new URLSearchParams();
        if (userCoords) {
          queryParams.append('latitude', userCoords.latitude);
          queryParams.append('longitude', userCoords.longitude);
        }
        if (effectiveSubId) {
          queryParams.append('subject_id', effectiveSubId);
        }
        const effectiveDate = (sessionActive && sessionDate) ? sessionDate : getLocalDateString();
        const effectivePeriod = sessionPeriod || resolvePeriodName();
        queryParams.append('custom_date', effectiveDate);
        queryParams.append('custom_time', effectivePeriod);

        if (livenessTokenRef.current) {
          queryParams.append('liveness_token', livenessTokenRef.current);
          livenessTokenRef.current = null;
        }

        const res = await fetch(`${API_BASE_URL}/attendance/recognize-frame?${queryParams.toString()}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const minRawThreshold = biometricMatchThreshold >= 0.80
              ? 0.36 + (biometricMatchThreshold - 0.80) * 0.80
              : biometricMatchThreshold;
            const validMatches = data.results.filter((m) => {
              const confidenceVal = parseFloat(m.confidence);
              const rawScore = m.raw_score !== undefined && m.raw_score !== null ? parseFloat(m.raw_score) : (confidenceVal / 100);
              return !m.staged_for_review && !m.branch_mismatch && (m.newly_marked || m.already_marked) && (!biometricConfidenceFilterEnabled || rawScore >= minRawThreshold);
            });

            if (validMatches.length === 0) {
              const branchMismatch = data.results.find((m) => m.branch_mismatch);
              const stagedMatch = data.results.find((m) => m.staged_for_review);
              if (branchMismatch) {
                const msg = branchMismatch.status || `${branchMismatch.name || 'Student'} belongs to a different department than the selected subject.`;
                setScanStatus(msg);
                setLivenessMessage(msg);
                addDiagnosticLog(`BRANCH MISMATCH: ${msg}`);
              } else if (stagedMatch) {
                const msg = stagedMatch.status || 'Low-confidence face capture staged for admin review.';
                setScanStatus(msg);
                setLivenessMessage(msg);
                addDiagnosticLog(`STAGED FOR REVIEW: ${msg}`);
              } else {
                setScanStatus('Low confidence on all detected faces — adjust position/lighting');
                setLivenessMessage('Move slightly closer or improve lighting, then blink again.');
              }
              playCyberSound('error');
              setIsScanning(false);
              return;
            }

            matchSuccess = true;
            const newlyMarkedList = validMatches.filter((m) => m.newly_marked);
            const count = validMatches.length;
            if (count > 1) {
              setScanStatus(`Classroom scan: ${count} students — ${newlyMarkedList.length} newly marked`);
            } else {
              const m = validMatches[0];
              setScanStatus(m.newly_marked ? `Recognized: ${m.name} (${m.confidence}%)` : `${m.name}: Attendance already recorded today.`);
            }

            const primary = validMatches[0];
            const isSingleAlready = !primary.newly_marked;

            if (newlyMarkedList.length > 0) {
              playCyberSound('success');
              if (explorationSettings.confettiOnMatch) triggerConfettiBurst();
              triggerHaptic([40, 30, 40]);
              triggerNativeHaptic('medium');
              recordScan(newlyMarkedList.length);
            } else {
              playCyberSound('click');
              triggerHaptic(20);
              triggerNativeHaptic('light');
            }

            const now = new Date();
            const timeStr = effectivePeriod;
            const dateStr = (sessionActive && sessionDate) ? sessionDate.split('-').reverse().join('/') : `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

            const matchedSubject = subjects.find(s => String(s.id) === String(effectiveSubId));
            const matchedRecord = students.find(s => 
              (primary.user_id && (s.id === primary.user_id || String(s.id) === String(primary.user_id))) ||
              (primary.roll && s.roll === primary.roll) ||
              (primary.name && s.name && s.name.toLowerCase() === primary.name.toLowerCase())
            );

            // Resolve student photo from API payload, matched student cache, or backend endpoint
            let resolvedPhoto = primary.photo || 
              matchedRecord?.profile_pic || 
              matchedRecord?.details?.profile_pic || 
              null;
            
            if (!resolvedPhoto && primary.user_id) {
              resolvedPhoto = `${API_BASE_URL}/students/${primary.user_id}/photo`;
            }

            showScannedStudentWithTimeout({
              id: primary.user_id,
              name: primary.name,
              roll: primary.roll,
              dep: primary.dep || matchedRecord?.dep || 'Academic',
              course: primary.course || matchedRecord?.course || null,
              semester: primary.semester || matchedRecord?.semester || null,
              photo: resolvedPhoto,
              time: timeStr,
              clockTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              date: dateStr,
              period: effectivePeriod,
              period_label: getPeriodSlotLabel(effectivePeriod),
              subject_name: matchedSubject ? `${matchedSubject.name} (${matchedSubject.code})` : 'Class Session',
              confidence: primary.confidence,
              streak_days: primary.streak_days || matchedRecord?.streak_days || 1,
              status: isSingleAlready ? 'Already Marked' : 'Present',
              already_marked: isSingleAlready,
              isOffline: false,
              sync_status: 'SYNCED'
            });
            
            const capDims = getCaptureDimensions(video, preset.captureWidth, preset.captureHeight);
            updateServerRecognizedFaces({
              faces: validMatches,
              timestamp: Date.now(),
              captureWidth: capDims.width,
              captureHeight: capDims.height,
            });

            if (data.metrics) {
              addDiagnosticLog(`FAST INFERENCE: Detect ${data.metrics.detect_ms || 0}ms | Match ${data.metrics.match_ms || 0}ms | Total ${data.metrics.server_total_ms || 0}ms`);
            }

            validMatches.forEach((matched) => {
              addDiagnosticLog(`MATCH FOUND: ${matched.name} (Accuracy: ${matched.confidence}%)`);
              setRecognizedStudents((prev) => {
                if (prev.some((s) => s.id === matched.user_id)) return prev;
                return [{
                  id: matched.user_id,
                  name: matched.name,
                  roll: matched.roll,
                  dep: matched.dep,
                  time: timeStr,
                  date: dateStr,
                  status: matched.newly_marked ? 'Present' : 'Already Marked',
                }, ...prev];
              });
            });

            fetchStats();
            fetchLogs();

            if (newlyMarkedList.length > 1) {
              handleSpeak(`Attendance marked for ${newlyMarkedList.length} students.`);
              speakScanner(`${newlyMarkedList.length} students marked!`);
            } else if (newlyMarkedList.length === 1) {
              handleSpeak(`Attendance marked for ${newlyMarkedList[0].name}.`);
              speakScanner(`${newlyMarkedList[0].name} marked!`);
            } else if (count === 1) {
              handleSpeak(`${primary.name}, your attendance is already marked.`);
              speakScanner(`${primary.name}, already marked today!`);
            } else {
              handleSpeak(`${count} students recognized. All already marked.`);
              speakScanner("All already marked today!");
            }
          } else {
            playCyberSound('error');
            const reason = data.diagnostic_reason;
            if (reason === 'no_enrolled_faces') {
              setScanStatus('No enrolled faces');
              setLivenessMessage('No student face photos enrolled in this institute yet.');
              addDiagnosticLog('Match failed: 0 enrolled student face templates in institution.');
            } else if (reason === 'no_face_in_frame') {
              setScanStatus('No clear face detected');
              setLivenessMessage('Hold your face steady inside the frame with clear lighting.');
              addDiagnosticLog('Match failed: Detector could not isolate a clear face in frame.');
            } else {
              setScanStatus('No confirmed match');
              setLivenessMessage('Face did not match any enrolled student — check enrollment photo or lighting.');
              addDiagnosticLog('Match failed: Face signature unrecognized');
            }
            handleSpeak("No enrolled match confirmed.");
          }
        } else if (res.status === 403) {
          playCyberSound('error');
          const errData = await res.json();
          const detail = errData.detail || (geofenceStatus?.distance ? `You are outside the campus attendance area (${geofenceStatus.distance}m away).` : 'You are outside the campus attendance area.');
          setScanStatus(detail);
          addDiagnosticLog('SECURITY ALERT: Geofence boundaries breached');
          handleSpeak("Access denied.");
        } else {
          playCyberSound('error');
          const errData = await res.json().catch(() => ({}));
          const detail = typeof errData?.detail === 'string' && errData.detail.trim()
            ? errData.detail.trim()
            : `Scanning failed (HTTP ${res.status}).`;
          setScanStatus(detail);
          setLivenessMessage(detail);
          addDiagnosticLog(`ERROR: Frame matching failed (${res.status}): ${detail}`);
          handleSpeak("Scanning failed.");
        }
      } catch (err) {
        console.error('Error matching face embedding:', err);
        setScanStatus('Verification unavailable');
        setLivenessMessage('Could not confirm attendance. Check the connection and retry.');
      } finally {
        setIsScanning(false);
        recognitionBusyRef.current = false;
        
        // Cooldown configuration (give errors enough time to remain readable)
        const cooldownTime = matchSuccess ? 900 : 2500;
        
        setTimeout(() => {
          // Note: Keep scannedStudent visible on screen until next scan or manual dismissal!
          updateServerRecognizedFaces(null);
          eyeStateRef.current = 'open';
          livenessStatusRef.current = 'verifying';
          setLivenessStatus('verifying');
          setLivenessMessage(livenessBypassRef.current ? 'Scanning...' : 'Please blink your eyes to verify.');
          setScanStatus('Scanning...');
          if (voiceAnnounceLiveness && !matchSuccess && !livenessBypassRef.current) {
            handleSpeak("Please blink your eyes to verify.");
          }
        }, cooldownTime);
      }
  };

  // Apply theme class to body and update localStorage
  useEffect(() => {
    document.body.setAttribute('data-theme', activeTheme);
    localStorage.setItem('theme', activeTheme);
    addDiagnosticLog(`Interface theme set to: ${activeTheme.toUpperCase()}`);
  }, [activeTheme]);

  // Periodic metrics updates for live scanner HUD (only when camera active)
  useEffect(() => {
    const cameraActive = attendanceActive || webcamActive || studentWebcamActive || scannerBootActive;
    if (!cameraActive) return undefined;

    const intervalMs = isMobileView ? 2500 : 1000;
    const interval = setInterval(() => {
      setHudMetrics({
        fps: (29.3 + Math.random() * 1.3).toFixed(1),
        lighting: Math.floor(86 + Math.random() * 10) + '%',
        quality: Math.random() > 0.15 ? 'EXCELLENT' : 'OPTIMAL'
      });
    }, intervalMs);
    return () => clearInterval(interval);
  }, [attendanceActive, webcamActive, studentWebcamActive, scannerBootActive, isMobileView]);

  // Web Audio Cabin Hum Drone Simulation
  useEffect(() => {
    if (!ambientHumActive) return;
    
    let audioCtx;
    let osc1, osc2;
    let filter;
    let gainNode;
    
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audioCtx = new AudioContext();
      
      filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      
      const isActive = isScanning || attendanceActive || webcamActive || studentWebcamActive;
      filter.frequency.setValueAtTime(isActive ? 280 : 130, audioCtx.currentTime);
      
      gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(ambientHumVolume * 0.5, audioCtx.currentTime);
      
      osc1 = audioCtx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(isActive ? 65 : 55, audioCtx.currentTime);
      
      osc2 = audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(isActive ? 65.5 : 55.4, audioCtx.currentTime);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc1.start();
      osc2.start();
      
    } catch (err) {
      console.error("Hum Drone error:", err);
    }
    
    return () => {
      try {
        if (osc1) osc1.stop();
        if (osc2) osc2.stop();
        if (audioCtx) audioCtx.close();
      } catch { /* ignore fallback error */ }
    };
  }, [ambientHumActive, ambientHumVolume, isScanning, attendanceActive, webcamActive, studentWebcamActive]);

  const fpsRef = useRef('30.0');
  useEffect(() => {
    fpsRef.current = hudMetrics.fps;
  }, [hudMetrics.fps]);

  // HTML5 Canvas Neural Mesh Graph Animation
  useEffect(() => {
    if (activeTab !== 'dashboard' || !token || !neuralMeshCanvas) return;
    const canvas = neuralMeshCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    const primaryColor = activeTheme === 'matrix' ? '#047857' :
                          activeTheme === 'obsidian' ? '#b91c1c' :
                          activeTheme === 'violet' ? '#6d28d9' : '#785927';
    
    // Convert hex color to rgb for custom opacity
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 120, g: 89, b: 39 };
    };
    const rgb = hexToRgb(primaryColor);
    
    const particleCount = 28;
    const particles = [];
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth || 300;
      const h = parent.clientHeight || 260;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        // Distribute or reposition particles that are out of bounds or initialized at 0
        particles.forEach(p => {
          if (p.x === 0 || p.x > w) p.x = Math.random() * w;
          if (p.y === 0 || p.y > h) p.y = Math.random() * h;
        });
      }
    };
    
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: 0, // will be set by resizeCanvas
        y: 0,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1.5,
        pulseSpeed: 0.03 + Math.random() * 0.04,
        pulseValue: Math.random(),
        isHub: i % 6 === 0, // Every 6th particle is a hub node
        label: i % 6 === 0 ? `N-${String(i).padStart(2, '0')}` : null,
        status: i % 12 === 0 ? 'ACTIVE' : (i % 18 === 0 ? 'SYNCING' : null)
      });
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    let mouse = { x: null, y: null };
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    let ripples = [];
    const handleCanvasClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      ripples.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        radius: 0,
        maxRadius: 100,
        speed: 2.5,
        opacity: 0.8
      });
      playCyberSound('click');
    };
    canvas.addEventListener('click', handleCanvasClick);
    
    let scanY = 0;
    let rotationAngle = 0;
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      
      // 1. Draw Background Dot Grid
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`;
      const gridSpacing = 30;
      for (let x = 0; x < w; x += gridSpacing) {
        for (let y = 0; y < h; y += gridSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // 2. Draw Horizontal/Vertical Laser Grid Lines (subtle)
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.02)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 0; x < w; x += 60) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += 60) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();
      
      // 3. Update & Draw Scanner Sweep line
      scanY += 0.8;
      if (scanY > h) scanY = 0;
      
      // Scanner sweep line gradient
      const scanGrad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 3);
      scanGrad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      scanGrad.addColorStop(0.8, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`);
      scanGrad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
      
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 15, w, 15);
      
      ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(w, scanY);
      ctx.stroke();
      
      // 4. Update & Draw Click Ripples
      ripples = ripples.filter(r => r.radius < r.maxRadius);
      ripples.forEach(r => {
        r.radius += r.speed;
        r.opacity = 1 - (r.radius / r.maxRadius);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1;
        ctx.globalAlpha = r.opacity;
        
        // Ring 1
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Ring 2 (dashed)
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      });
      ctx.globalAlpha = 1.0;
      
      // 5. Update & Draw Particles (Neural Nodes)
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        
        // Bounce on borders
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        
        // Interaction with mouse cursor
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 80) {
            // Push away gently
            p.x -= (dx / dist) * 0.5;
            p.y -= (dy / dist) * 0.5;
          }
        }
        
        // Interaction with Click Ripples
        ripples.forEach(r => {
          const dx = p.x - r.x;
          const dy = p.y - r.y;
          const dist = Math.hypot(dx, dy);
          if (Math.abs(dist - r.radius) < 6) {
            p.x += (dx / dist) * 2;
            p.y += (dy / dist) * 2;
          }
        });
        
        // Calculate scanning proximity glow
        const distFromScan = Math.abs(p.y - scanY);
        const scanGlow = distFromScan < 25 ? (1 - distFromScan / 25) * 0.6 : 0;
        
        p.pulseValue += p.pulseSpeed;
        const baseGlow = 0.3 + Math.sin(p.pulseValue) * 0.2;
        const totalGlow = Math.min(1.0, baseGlow + scanGlow);
        
        // Draw connection lines
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 80) {
            const lineOpacity = (1 - (dist / 80)) * (p.isHub || p2.isHub ? 0.35 : 0.15);
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${lineOpacity})`;
            ctx.lineWidth = p.isHub && p2.isHub ? 1.2 : 0.8;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            
            // Draw flowing data pulses along active lines
            if (p.isHub || p2.isHub || idx % 4 === 0) {
              const speedFactor = p.isHub ? 1500 : 2500;
              const t = (Date.now() / speedFactor + idx * 0.15) % 1.0;
              const px = p.x + (p2.x - p.x) * t;
              const py = p.y + (p2.y - p.y) * t;
              ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${lineOpacity * 2.5})`;
              ctx.beginPath();
              ctx.arc(px, py, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        
        // Draw Node Graphics
        ctx.globalAlpha = totalGlow;
        if (p.isHub) {
          // Hub Node is a complex square & target crosshair
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 1.2;
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`;
          
          ctx.beginPath();
          ctx.rect(p.x - 4, p.y - 4, 8, 8);
          ctx.fill();
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
          ctx.stroke();
          
          // Draw text label next to hub node
          if (p.label) {
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.7)`;
            ctx.font = '8px monospace';
            ctx.fillText(p.label, p.x + 8, p.y - 3);
            if (p.status) {
              ctx.fillStyle = p.status === 'ACTIVE' ? '#10b981' : '#f59e0b';
              ctx.fillText(p.status, p.x + 8, p.y + 6);
            }
          }
        } else {
          // Regular node is a simple dot with outer glow ring
          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
      });
      
      // 6. Draw Mouse Targeting Reticle & Brackets
      if (mouse.x !== null && mouse.y !== null) {
        rotationAngle += 0.015;
        
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1;
        
        // Rotating outer ring
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Rotating inner tick rings
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 14, rotationAngle, rotationAngle + Math.PI * 0.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 14, rotationAngle + Math.PI, rotationAngle + Math.PI * 1.4);
        ctx.stroke();
        
        // Center cross
        ctx.strokeStyle = primaryColor;
        ctx.beginPath();
        ctx.moveTo(mouse.x - 5, mouse.y);
        ctx.lineTo(mouse.x + 5, mouse.y);
        ctx.moveTo(mouse.x, mouse.y - 5);
        ctx.lineTo(mouse.x, mouse.y + 5);
        ctx.stroke();
        
        // Corner Brackets
        const bs = 25; // bracket offset
        const bl = 5;  // bracket length
        // Top-left
        ctx.beginPath();
        ctx.moveTo(mouse.x - bs, mouse.y - bs + bl);
        ctx.lineTo(mouse.x - bs, mouse.y - bs);
        ctx.lineTo(mouse.x - bs + bl, mouse.y - bs);
        ctx.stroke();
        // Top-right
        ctx.beginPath();
        ctx.moveTo(mouse.x + bs, mouse.y - bs + bl);
        ctx.lineTo(mouse.x + bs, mouse.y - bs);
        ctx.lineTo(mouse.x + bs - bl, mouse.y - bs);
        ctx.stroke();
        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(mouse.x - bs, mouse.y + bs - bl);
        ctx.lineTo(mouse.x - bs, mouse.y + bs);
        ctx.lineTo(mouse.x - bs + bl, mouse.y + bs);
        ctx.stroke();
        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(mouse.x + bs, mouse.y + bs - bl);
        ctx.lineTo(mouse.x + bs, mouse.y + bs);
        ctx.lineTo(mouse.x + bs - bl, mouse.y + bs);
        ctx.stroke();
        
        // Monospace telemetry printout
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`;
        ctx.font = '8px monospace';
        ctx.fillText(`TARGET: LOCK`, mouse.x + bs + 5, mouse.y - 8);
        ctx.fillText(`X:${Math.round(mouse.x)} Y:${Math.round(mouse.y)}`, mouse.x + bs + 5, mouse.y + 4);
        ctx.fillText(`SYNC: 100%`, mouse.x + bs + 5, mouse.y + 16);
        
        // Connect mouse reticle to the 3 nearest particles
        const sorted = [...particles].map(p => ({
          p, dist: Math.hypot(p.x - mouse.x, p.y - mouse.y)
        })).sort((a, b) => a.dist - b.dist);
        
        for (let i = 0; i < Math.min(3, sorted.length); i++) {
          const nearest = sorted[i];
          if (nearest.dist < 120) {
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(1 - nearest.dist / 120) * 0.3})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(nearest.p.x, nearest.p.y);
            ctx.stroke();
          }
        }
      }
      
      // 7. Render HUD Digital Logs overlay on the canvas edges
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.78)`;
      ctx.font = '7.5px monospace';
      ctx.fillText(`[NEURAL_ENGINE: OK]`, 10, 15);
      ctx.fillText(`[LIVENESS: SECURE]`, 10, 27);
      ctx.fillText(`[BANDWIDTH: 10Gbps]`, 10, 39);
      
      const themeLabel = activeTheme === 'matrix' ? 'MATRIX_CORE' :
                         activeTheme === 'obsidian' ? 'OBSIDIAN_CORE' :
                         activeTheme === 'violet' ? 'VIOLET_CORE' : 'GOLDEN_CORE';
      ctx.fillText(`[LINK: ${themeLabel}]`, w - 100, 15);
      ctx.fillText(`[BEACONS: ${particleCount} ACTIVE]`, w - 100, 27);
      ctx.fillText(`[FPS: ${fpsRef.current || '60'} HZ]`, w - 100, 39);
      
      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [activeTab, token, activeTheme, neuralMeshCanvas]);



  const policyVersion = useRef(0);
  const policySaving = useRef(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [scannerPolicyMessage, setScannerPolicyMessage] = useState('');
  const [policyMessage, setPolicyMessage] = useState('');
  useEffect(() => {
    setLockdownActive(false);
    if (!token || isDemoMode) return;
    let active = true;
    const refresh = async () => {
      if (policySaving.current) return;
      const version = ++policyVersion.current;
      try {
        const res = await fetch(`${API_BASE_URL}/settings/campus-policy`, {headers: {Authorization: `Bearer ${token}`}, cache: 'no-store'});
        if (!res.ok) return;
        const policy = await res.json();
        if (!active || version !== policyVersion.current) return;
        setLockdownActive(policy.locked);
        const biometricPolicy = JSON.stringify([policy.similarity, policy.blink_ear, policy.confidence_filter, policy.strict_liveness]);
        if (policy.similarity != null && lastBiometricPolicyRef.current !== biometricPolicy) {
          setAntiSpoofingThreshold(policy.blink_ear);
          setBiometricConfidenceFilterEnabled(policy.confidence_filter);
          setBiometricMatchThreshold(policy.similarity);
          setLivenessBypass(!policy.strict_liveness);
          lastBiometricPolicyRef.current = biometricPolicy;
        }
      } catch { /* Server-side policy continues to apply. */ }
    };
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [token, isDemoMode, API_BASE_URL]);
  const saveCampusPolicy = async (changes) => {
    if (policySaving.current) return;
    if (isDemoMode) {
      setPolicyMessage('Sign in with your institution admin account to change campus policy.');
      return;
    }
    policySaving.current = true;
    ++policyVersion.current;
    setSavingPolicy(true);
    setPolicyMessage('Saving campus policy…');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/campus-policy`, {method: 'PUT', signal: controller.signal,
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'}, body: JSON.stringify(changes)});
      const policy = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof policy?.detail === 'string' ? policy.detail : `Campus policy service returned HTTP ${res.status}.`);
      if (typeof policy?.locked !== 'boolean' || ('locked' in changes && policy.locked !== changes.locked))
        throw new Error('The server did not confirm the requested campus policy.');
      if ('strict_liveness' in changes && policy.strict_liveness !== changes.strict_liveness)
        throw new Error('The server did not confirm the blink setting.');
      setLockdownActive(policy.locked);
      if (policy.similarity != null) {
        lastBiometricPolicyRef.current = JSON.stringify([policy.similarity, policy.blink_ear, policy.confidence_filter, policy.strict_liveness]);
        if ('strict_liveness' in changes) {
          setLivenessBypass(!policy.strict_liveness);
        }
      }
      setPolicyMessage('Campus policy saved.');
      return true;
    } catch (err) {
      setPolicyMessage(err.name === 'AbortError' ? 'Confirmation timed out. Check the current campus status before retrying.' : err.message);
    } finally {
      clearTimeout(timer);
      policySaving.current = false;
      setSavingPolicy(false);
    }
  };

  // Automatic camera shutoff when lockdown is activated
  useEffect(() => {
    if (lockdownActive) {
      stopAttendanceCam();
      stopStudentWebcam();
      addDiagnosticLog('EMERGENCY LOCKDOWN: Terminated camera feeds.');
    }
  }, [lockdownActive]);



  // Auto-start camera when scanner modal opens — removes need for a separate "Start Scanner" click
  useEffect(() => {
    if (!showScannerModal) return undefined;
    setScannerPolicyMessage('');
    if (attendanceActive || scannerBootActive) return undefined;
    // Short delay allows the modal's <video> element to mount in the DOM first
    const autoStartTimer = setTimeout(() => {
      startAttendanceCam();
    }, 220);
    return () => clearTimeout(autoStartTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScannerModal]);

  // Fast client-side face detection (BlazeFace) — runs every frame for instant feedback
  useEffect(() => {
    const isExternal = cameraScanSettings?.cameraSource === 'external';
    const video = isExternal ? attendanceImageRef.current : attendanceVideoRef.current;
    if (!attendanceActive || !video) {
      return undefined;
    }

    let active = true;
    let detectRafId = null;
    let detectTimerId = null;
    const preset = getCameraPreset(cameraScanSettings.preset || 'turbo');

    const runDetector = async () => {
      try {
        const detector = await createFaceDetector({
          minDetectionConfidence: preset.faceDetectionConfidence ?? 0.42,
        });
        if (!active) {
          detector.close();
          return;
        }
        faceDetectorRef.current = detector;

        detector.onResults((results) => {
          if (!attendanceActive) return;

          const hasDetection = results.detections?.length > 0;
          if (hasDetection) {
            const isVideo = video instanceof HTMLVideoElement;
            const w = isVideo ? video.videoWidth : video.naturalWidth;
            const h = isVideo ? video.videoHeight : video.naturalHeight;
            const boxes = results.detections.map(det => extractFaceBox(det, w || 640, h || 480)).filter(Boolean);
            lastFaceBoxesRef.current = boxes;
            lastFaceBoxRef.current = boxes[0] || null;
            lastFaceDetectedRef.current = true;
            setFaceDetected(true);
            setLiveFaceGrid(boxes.map((b, idx) => ({
              id: `face-${idx}`,
              name: idx === 0 ? 'Primary Face' : `Face #${idx + 1}`,
              confidence: b.score || 0.85,
              status: livenessStatusRef.current === 'verified' ? 'Verified' : 'Detecting',
            })));
            if (livenessStatusRef.current === 'verifying') {
              if (livenessBypassRef.current) {
                if (!recognitionBusyRef.current) {
                  livenessStatusRef.current = 'verified';
                  setLivenessStatus('verified');
                  setLivenessMessage('Verifying face...');
                  setScanStatus('Scanning...');
                  triggerFaceRecognition();
                }
              } else {
                const isClosed = eyeStateRef.current === 'closed';
                setScanStatus(isClosed ? 'Blink detected • Now open eyes' : 'Please blink your eyes');
              }
            }
          } else {
            lastFaceBoxesRef.current = [];
            lastFaceBoxRef.current = null;
            lastFaceDetectedRef.current = false;
            setFaceDetected(false);
            setLiveFaceGrid([]);
            if (livenessStatusRef.current === 'verifying' && !lastLandmarksRef.current?.length) {
              setLivenessMessage('Position face in frame');
              setScanStatus('Position face in frame');
            }
          }
        });

        const detectLoop = async () => {
          if (!active || !attendanceActive) return;
          const isVideo = video instanceof HTMLVideoElement;
          const isReady = isVideo ? (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) : (video.complete && video.naturalWidth > 0);
          if (isReady) {
            try {
              await detector.send({ image: video });
            } catch (err) {
              console.error('Face detection frame error:', err);
            }
            if (cameraScanSettings.autoFocusBox !== false && lastFaceBoxesRef.current?.length && !lastLandmarksRef.current?.length) {
              const canvas = attendanceCanvasRef.current;
              if (canvas) {
                const w = isVideo ? video.videoWidth : video.naturalWidth;
                const h = isVideo ? video.videoHeight : video.naturalHeight;
                canvas.width = w;
                canvas.height = h;
                 const ctx = canvas.getContext('2d');
                 if (ctx) {
                   ctx.clearRect(0, 0, canvas.width, canvas.height);
                   const isMobile = window.innerWidth <= 768;
                   if (!isMobile) {
                     const srvFaces = serverRecognizedFacesRef.current;
                     if (srvFaces && srvFaces.faces && srvFaces.faces.length > 0) {
                       srvFaces.faces.forEach((face) => {
                         if (face.box) {
                           const scaledBox = {
                             x: face.box[0] * (canvas.width / srvFaces.captureWidth),
                             y: face.box[1] * (canvas.height / srvFaces.captureHeight),
                             w: face.box[2] * (canvas.width / srvFaces.captureWidth),
                             h: face.box[3] * (canvas.height / srvFaces.captureHeight),
                           };
                           // Only draw green box if newly marked, do not draw yellow box for already marked faces
                           if (face.newly_marked) {
                             drawFaceBox(ctx, scaledBox, {
                               color: '#10b981',
                               label: `${face.name.toUpperCase()} (${face.confidence}%) - PRESENT`,
                             });
                           }
                         }
                       });
                     } else {
                       lastFaceBoxesRef.current.forEach((box, index) => {
                         drawFaceBox(ctx, box, {
                           color: livenessStatusRef.current === 'verified' ? '#10b981' : '#00f2fe',
                           label: index === 0 ? 'PRIMARY FACE' : `FACE #${index + 1}`,
                         });
                       });
                     }
                   }
                 }
              }
            }
          }
          if (active && attendanceActive) {
            detectRafId = requestAnimationFrame(detectLoop);
          }
        };
        detectTimerId = setTimeout(detectLoop, 100);
      } catch (err) {
        console.error('Face detection init failed:', err);
        addDiagnosticLog('WARN: Fast face detector unavailable — using mesh-only mode.');
      }
    };

    runDetector();

    return () => {
      active = false;
      if (detectRafId) cancelAnimationFrame(detectRafId);
      if (detectTimerId) clearTimeout(detectTimerId);
      if (faceDetectorRef.current) {
        try { faceDetectorRef.current.close(); } catch (err) { /* ignore */ }
        faceDetectorRef.current = null;
      }
    };
  }, [attendanceActive, cameraScanSettings.preset, cameraScanSettings.autoFocusBox]);

  const [meshLibraryState, setMeshLibraryState] = useState('idle');
  const needsMeshLibrary = activeTab === 'attendance' || showScannerModal || attendanceActive;
  useEffect(() => {
    if (!needsMeshLibrary) return;
    if (typeof window.FaceMesh === 'function') {
      setMeshLibraryState('ready');
      return;
    }
    const script = document.createElement('script');
    script.src = '/mediapipe/face_mesh.js';
    script.async = true;
    setMeshLibraryState('pending');
    script.onload = () => setMeshLibraryState(typeof window.FaceMesh === 'function' ? 'ready' : 'error');
    script.onerror = () => setMeshLibraryState('error');
    document.head.appendChild(script);
    return () => {
      script.onload = null;
      script.onerror = null;
      script.remove();
    };
  }, [needsMeshLibrary]);

  // Initialize and run FaceMesh liveness detection loop
  useEffect(() => {
    const isExternal = cameraScanSettings?.cameraSource === 'external';
    const video = isExternal ? attendanceImageRef.current : attendanceVideoRef.current;
    if (!attendanceActive || !video) {
      livenessStatusRef.current = 'pending';
      setLivenessStatus('pending');
      setLivenessMessage('Camera Offline');
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }
      return;
    }

    if (meshLibraryState === 'idle' || meshLibraryState === 'pending') {
      setLivenessMessage('Preparing blink check…');
      return;
    }
    const hasFaceMesh = typeof window.FaceMesh === 'function';
    livenessStatusRef.current = 'verifying';
    setLivenessStatus('verifying');
    setLivenessMessage(
      hasFaceMesh
        ? 'Please blink your eyes to verify.'
        : 'Blink detector unavailable. Check network/CDN or enable Liveness Bypass in settings.'
    );
    eyeStateRef.current = 'open';
    addDiagnosticLog('Biometric acquisition initialized: Blink pattern required.');

    if (voiceAnnounceLiveness && hasFaceMesh) {
      handleSpeak("Please blink your eyes to verify.");
    }

    if (!hasFaceMesh) {
      addDiagnosticLog('ERROR: window.FaceMesh script failed to load.');
      return undefined;
    }

    const faceMesh = new window.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    const preset = getCameraPreset(cameraScanSettings.preset || 'turbo');
    faceMesh.setOptions({
      maxNumFaces: 1, // The blink check uses only the primary face.
      refineLandmarks: preset.refineLandmarks,
      minDetectionConfidence: preset.minDetectionConfidence,
      minTrackingConfidence: Math.max(0.5, preset.minDetectionConfidence - 0.05),
    });

    let active = true;
    let challenge = null;
    let stepIndex = 0;
    let requestPending = false;
    let generation = 0;
    let retryAt = 0;
    let openFrames = 0;
    let closedAt = null;
    let closedEar = null;
    let previousFrame = 0;
    let faceLostAt = null;
    const resetGesture = () => {
      openFrames = 0;
      closedAt = null;
      closedEar = null;
      eyeStateRef.current = 'open';
    };
    async function advance(step, measurement) {
      const version = generation;
      requestPending = true;
      try {
        if (!challenge) {
          const next = await startLivenessChallenge(API_BASE_URL, token);
          if (!active || version !== generation || livenessBypassRef.current) return;
          challenge = next;
          stepIndex = 0;
        } else {
          const result = await reportLivenessStep(API_BASE_URL, token, challenge.challenge_id, step, measurement);
          if (!active || version !== generation || livenessBypassRef.current) return;
          if (!result.valid) throw new Error('Please repeat the blink check.');
          stepIndex++;
          if (result.completed && result.liveness_token) {
            challenge = null;
            livenessTokenRef.current = result.liveness_token;
            livenessStatusRef.current = 'verified';
            setLivenessStatus('verified');
            setLivenessMessage('Blink check complete. Matching your face…');
            triggerFaceRecognition();
          }
        }
      } catch {
        if (active && version === generation) {
          challenge = null;
          retryAt = performance.now() + 1500;
          setLivenessMessage('Blink check could not finish. Hold steady to retry.');
        }
      } finally {
        if (active && version === generation) {
          requestPending = false;
          previousFrame = performance.now();
        }
      }
    }
    let lastMode = livenessBypassRef.current;
    faceMesh.onResults((results) => {
      if (!active) return;
      if (lastMode !== livenessBypassRef.current) {
        lastMode = livenessBypassRef.current;
        generation++;
        challenge = null;
        requestPending = false;
        retryAt = 0;
        resetGesture();
      }

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        faceLostAt = null;
        const landmarks = results.multiFaceLandmarks[0];
        lastLandmarksRef.current = landmarks;

        if (livenessBypassRef.current) {
          if (livenessStatusRef.current === 'verifying') {
            livenessStatusRef.current = 'verified';
            setLivenessStatus('verified');
            setLivenessMessage('Verifying face...');
            addDiagnosticLog('Liveness verification: BYPASSED (Instant scan active)');
            triggerFaceRecognition();
          }
        } else {
          const width = video.videoWidth || video.naturalWidth;
          const height = video.videoHeight || video.naturalHeight;
          const leftEAR = calculateEAR(landmarks, LEFT_EYE_INDICES, width, height);
          const rightEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES, width, height);
          const now = performance.now();
          if (livenessStatusRef.current !== 'verifying' || requestPending) {
            previousFrame = now;
            return;
          }
          if (now < retryAt) {
            previousFrame = now;
            return;
          }
          if (!Number.isFinite(leftEAR) || !Number.isFinite(rightEAR) || (previousFrame > 0 && now - previousFrame > 900)) resetGesture();
          previousFrame = now;
          if (!challenge && !isDemoMode) {
            setLivenessMessage('Preparing blink check. Keep your eyes open.');
            advance();
            return;
          }
          const step = challenge?.sequence_labels[stepIndex] || 'blink';
          const effectiveThreshold = Number.isFinite(antiSpoofingThresholdRef.current) ? antiSpoofingThresholdRef.current : 0.20;
          const openThreshold = Math.max(effectiveThreshold + 0.03, 0.22);
          const closeThreshold = Math.min(Math.max(effectiveThreshold, 0.19), 0.23);
          const open = Math.min(leftEAR, rightEAR) >= openThreshold;
          const closed = Math.max(leftEAR, rightEAR) <= closeThreshold;
          if (closedAt !== null && now - closedAt > 900) resetGesture();
          if (open && closedAt !== null) {
            const elapsed = now - closedAt;
            const measurement = closedEar;
            resetGesture();
            setEyeState('open');
            if (elapsed > 0 && elapsed <= 900 && step === 'blink') {
              if (!isDemoMode) advance('blink', measurement);
              else {
                livenessStatusRef.current = 'verified';
                setLivenessStatus('verified');
                triggerFaceRecognition();
              }
            }
          } else if (open) {
            openFrames++;
            if (openFrames >= 2 && step === 'open') {
              advance('open', Math.min(leftEAR, rightEAR));
            }
          } else if (closed && openFrames >= 2 && closedAt === null) {
            closedAt = now;
            closedEar = Math.max(leftEAR, rightEAR);
            eyeStateRef.current = 'closed';
            setEyeState('closed');
          }
          if (livenessStatusRef.current === 'verifying') setLivenessMessage(
            step === 'open' ? 'Look at the camera with both eyes open.' :
            closedAt !== null ? 'Open your eyes to complete blink.' : 'Blink once naturally now.');
        }
      } else {
        const now = performance.now();
        if (faceLostAt === null) faceLostAt = now;
        lastLandmarksRef.current = null;
        faceLockStartRef.current = null;
        if (now - faceLostAt > 1500) {
          resetGesture();
          generation++;
          challenge = null;
          requestPending = false;
        }
      }

    });

    faceMeshRef.current = faceMesh;

    let meshRafId = null;

    const sendFrames = async () => {
      if (!active || !attendanceActive) return;
      
      const isVideo = video instanceof HTMLVideoElement;
      const isReady = isVideo ? (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) : (video.complete && video.naturalWidth > 0);
      if (isReady) {
        const skip = livenessBypassRef.current ? preset.meshSkipFrames || 0 : 0;
        meshFrameSkipRef.current = (meshFrameSkipRef.current + 1) % (skip + 1);
        if (meshFrameSkipRef.current === 0) {
          try {
            await faceMesh.send({ image: video });
          } catch (err) {
            console.error("FaceMesh send frame error:", err);
          }
        }
      }
      
      if (active && attendanceActive) {
        meshRafId = requestAnimationFrame(sendFrames);
      }
    };

    meshRafId = requestAnimationFrame(sendFrames);

    return () => {
      active = false;
      if (meshRafId) cancelAnimationFrame(meshRafId);
      livenessStatusRef.current = 'pending';
      setLivenessStatus('pending');
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }
    };
  }, [attendanceActive, attendanceFacingMode, cameraScanSettings.preset, token, meshLibraryState]);

  // Turn off camera if user switches tabs
  useEffect(() => {
    if (activeTab !== 'attendance' && attendanceActive) {
      stopAttendanceCam();
    }
    if (activeTab !== 'student-profile' && studentWebcamActive) {
      stopStudentWebcam();
    }
  }, [activeTab, attendanceActive, studentWebcamActive]);

  // Assign media stream to student video ref when it becomes active
  useEffect(() => {
    if (studentWebcamActive && studentVideoRef.current && studentStreamRef.current) {
      studentVideoRef.current.srcObject = studentStreamRef.current;
    }
  }, [studentWebcamActive]);

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) return false;
    if (!captureStudent || !captureStudent.id || isNaN(parseInt(captureStudent.id))) {
      setWebcamError('Invalid or missing student ID for face upload.');
      return false;
    }
    const studentId = parseInt(captureStudent.id);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw the current video frame onto the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          resolve(false);
          return;
        }

        if (isDemoMode) {
          setTimeout(() => {
            setStudents(prev => prev.map(s => s.id === captureStudent.id ? { ...s, details: { ...s.details, photo: 'yes' } } : s));
            setWebcamError('');
            resolve(true);
          }, 1000);
          return;
        }

        const formData = new FormData();
        formData.append('file', blob, 'sample.jpg');

        try {
          const res = await fetch(`${API_BASE_URL}/users/students/${studentId}/upload-sample`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          let data = {};
          const rawText = await res.text();
          try {
            data = rawText ? JSON.parse(rawText) : {};
          } catch {
            data = { detail: `Server error (${res.status}). Image may be too large or server restarting.` };
          }

          if (res.ok) {
            setWebcamError(''); // Clear face warnings on success
            resolve(true);
          } else {
            const detailMsg = typeof data.detail === 'string' ? data.detail : (Array.isArray(data.detail) ? data.detail[0]?.msg : null);
            const finalErr = detailMsg || 'Face detection failed. Adjust position.';
            setWebcamError(finalErr);
            alert(`⚠️ BIOMETRIC FACE REGISTRATION REJECTED:\n\n${finalErr}`);
            resolve(false);
          }
        } catch (err) {
          const isFetchErr = err.message && (err.message.includes('fetch') || err.message.includes('NetworkError') || err.message.includes('Failed'));
          const errMsg = isFetchErr ? 'Connection error. The backend server might be starting up or unreachable. Please try again.' : (err.message || 'Connection error during upload.');
          setWebcamError(errMsg);
          alert(`⚠️ BIOMETRIC UPLOAD ERROR:\n\n${errMsg}`);
          resolve(false);
        }
      }, 'image/jpeg', 0.95);
    });
  };

  const startCaptureProcess = async () => {
    playCyberSound('scan');
    setIsCapturing(true);
    setWebcamError('');
    
    const success = await captureFrame();
    
    setIsCapturing(false);
    if (success) {
      playCyberSound('success');
      fetchStudents();
      fetchStats();
      alert(`Success: Face registered instantly for ${captureStudent.name}! SFace embedding is now stored.`);
      closeWebcamModal();
    } else {
      playCyberSound('error');
    }
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainMessage('Training AI Model... Please wait...');
    try {
      const res = await studentApi.trainModel(token);
      const data = await res.json();
      if (res.ok) {
        alert(`Success: Model trained successfully!\nTotal Samples: ${data.total_samples}\nTotal Students: ${data.total_students}`);
      } else {
        alert(`Error: Model training failed. ${data.detail}`);
      }
    } catch (err) {
      alert('Error: Connection failed. Make sure the backend server is running.');
    } finally {
      setIsTraining(false);
      setTrainMessage('');
    }
  };

  const fetchReport = async () => {
    setIsLoadingReport(true);
    try {
      const queryParams = new URLSearchParams({
        start_date: reportStartDate,
        end_date: reportEndDate,
      });
      if (userRole === 'admin') {
        if (reportDeptFilter) {
          queryParams.append('department', reportDeptFilter);
        }
        if (selectedReportSubjectId) {
          queryParams.append('subject_id', selectedReportSubjectId);
        }
      } else if (userRole === 'teacher') {
        if (selectedReportSubjectId) {
          queryParams.append('subject_id', selectedReportSubjectId);
        } else {
          const teacherSubjects = subjects.filter(s => s.teacher_id === currentUser?.details?.id);
          if (teacherSubjects.length > 0) {
            queryParams.append('subject_id', teacherSubjects[0].id.toString());
          }
        }
      }
      const data = await attendanceApi.fetchReport(token, {
        start_date: reportStartDate,
        end_date: reportEndDate,
        department: userRole === 'admin' ? reportDeptFilter : null,
        subject_id: queryParams.get('subject_id')
      });
      if (data && Array.isArray(data.students)) {
        setReportData(data);
      } else {
        setReportData({ total_working_days: (data && data.total_working_days) || 0, students: [] });
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setReportData({ total_working_days: 0, students: [] });
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleSendAbsenteeAlerts = async () => {
    setIsSendingAlerts(true);
    setReportAlertMsg(null);
    try {
      const queryParams = new URLSearchParams();
      if (userRole === 'admin') {
        if (selectedReportSubjectId) {
          queryParams.append('subject_id', selectedReportSubjectId);
        }
      } else if (userRole === 'teacher') {
        if (selectedReportSubjectId) {
          queryParams.append('subject_id', selectedReportSubjectId);
        } else {
          const teacherSubjects = subjects.filter(s => s.teacher_id === currentUser?.details?.id);
          if (teacherSubjects.length > 0) {
            queryParams.append('subject_id', teacherSubjects[0].id.toString());
          }
        }
      }
      const data = await attendanceApi.sendAbsenteeAlerts(token, queryParams.get('subject_id'));
      setReportAlertMsg({ type: 'success', text: data.message || "Absentee warning notification alerts queued successfully!" });
      playCyberSound('success');
      setTimeout(() => setReportAlertMsg(null), 5000);
    } catch (err) {
      setReportAlertMsg({ type: 'error', text: err.message || "Connection failed. Make sure the backend server is running." });
      playCyberSound('error');
      setTimeout(() => setReportAlertMsg(null), 5000);
    } finally {
      setIsSendingAlerts(false);
    }
  };

  // Export report to CSV
  const exportReportToCSV = () => {
    const headers = ['Student ID', 'Roll Number', 'Name', 'Department', 'Attended Days', 'Total Days', 'Attendance Rate (%)', 'Status'];
    const csvRows = [headers.join(',')];
    const students = Array.isArray(reportData?.students) ? reportData.students : [];

    students.forEach(student => {
      const statusText = student.low_attendance ? 'Warning (Low)' : 'Good';
      const row = [
        `"${student.id}"`,
        `"${student.roll}"`,
        `"${student.name}"`,
        `"${student.dep}"`,
        `"${student.present_days}"`,
        `"${student.total_days}"`,
        `"${student.percentage}%"`,
        `"${statusText}"`
      ];
      csvRows.push(row.join(','));
    });

    let downloadName = `Attendance_Report_${reportStartDate}_to_${reportEndDate}.csv`;
    if (selectedReportSubjectId) {
      const subCode = subjects.find(s => s.id === parseInt(selectedReportSubjectId))?.code || 'Subject';
      downloadName = `Attendance_Report_${subCode}_${reportStartDate}_to_${reportEndDate}.csv`;
    } else if (reportDeptFilter) {
      const deptStr = reportDeptFilter.replace(/\s+/g, '_');
      downloadName = `Attendance_Report_${deptStr}_${reportStartDate}_to_${reportEndDate}.csv`;
    }

    saveAndShareFile(csvRows.join('\n'), downloadName, 'text/csv;charset=utf-8;');
  };

  const downloadReportPDF = async () => {
    try {
      const queryParams = new URLSearchParams({
        start_date: reportStartDate,
        end_date: reportEndDate,
      });
      if (userRole === 'admin') {
        if (reportDeptFilter) {
          queryParams.append('department', reportDeptFilter);
        }
        if (selectedReportSubjectId) {
          queryParams.append('subject_id', selectedReportSubjectId);
        }
      } else if (userRole === 'teacher') {
        if (selectedReportSubjectId) {
          queryParams.append('subject_id', selectedReportSubjectId);
        } else {
          const teacherSubjects = subjects.filter(s => s.teacher_id === currentUser?.details?.id);
          if (teacherSubjects.length > 0) {
            queryParams.append('subject_id', teacherSubjects[0].id.toString());
          }
        }
      }
      
      const res = await fetch(`${API_BASE_URL}/attendance/download-report-pdf?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        alert("Failed to download PDF report. Server error.");
        return;
      }
      
      const blob = await res.blob();
      let downloadName = `Attendance_Report_${reportStartDate}_to_${reportEndDate}.pdf`;
      if (userRole === 'admin') {
        if (selectedReportSubjectId) {
          const subCode = subjects.find(s => s.id === parseInt(selectedReportSubjectId))?.code || 'Subject';
          downloadName = `Attendance_Report_${subCode}_${reportStartDate}_to_${reportEndDate}.pdf`;
        } else {
          const deptStr = reportDeptFilter ? reportDeptFilter.replace(/\s+/g, '_') : 'All';
          downloadName = `Attendance_Report_${deptStr}_${reportStartDate}_to_${reportEndDate}.pdf`;
        }
      } else if (userRole === 'teacher') {
        const subjectIdToUse = selectedReportSubjectId || subjects.filter(s => s.teacher_id === currentUser?.details?.id)[0]?.id;
        const subCode = subjects.find(s => s.id === parseInt(subjectIdToUse))?.code || 'Subject';
        downloadName = `Attendance_Report_${subCode}_${reportStartDate}_to_${reportEndDate}.pdf`;
      }
      
      saveAndShareFile(blob, downloadName, 'application/pdf');
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Failed to connect to backend server.");
    }
  };

  // Trigger browser print
  const printReport = () => {
    window.print();
  };

  // Auto fetch report when parameters change
  useEffect(() => {
    if (activeTab === 'reports' && token) {
      fetchReport();
    }
  }, [activeTab, reportStartDate, reportEndDate, reportDeptFilter, selectedReportSubjectId, token]);

  // Fetch session information (role and details) from backend
  const fetchSessionInfo = async (authToken) => {
    if (isDemoMode) return;
    await authFetchSessionInfo(
      authToken,
      (data, tokenVal) => {
        if (data.role !== 'student') {
          fetchStats(tokenVal);
          fetchLogs(tokenVal);
        } else {
          fetchStudentLogs(tokenVal);
          fetchBlueprint(tokenVal);
        }

        if (!sessionInitializedRef.current) {
          sessionInitializedRef.current = true;
          const currentHash = window.location.hash.replace(/^#\/?/, '').trim();
          const isTabValid = (tabId, role) => {
            if (role === 'student') {
              return ['student-attendance', 'student-profile', 'ai-assistant', 'settings', 'calendar', 'leave', 'control', 'all-features', 'broadcast'].includes(tabId);
            } else if (role === 'parent') {
              return ['dashboard', 'student-attendance', 'settings', 'control', 'all-features', 'broadcast'].includes(tabId);
            } else if (role === 'teacher') {
              return ['dashboard', 'students', 'attendance', 'manual-register', 'logs', 'session-history', 'reports', 'disputes', 'face-review', 'calendar', 'interventions', 'payroll', 'settings', 'student-profile', 'ai-assistant', 'control', 'all-features', 'broadcast'].includes(tabId);
            } else if (role === 'hod') {
              return ['dashboard', 'students', 'teachers', 'attendance', 'manual-register', 'logs', 'session-history', 'reports', 'disputes', 'face-review', 'calendar', 'interventions', 'student-profile', 'ai-assistant', 'control', 'all-features', 'broadcast'].includes(tabId);
            } else if (role === 'admin') {
              return ['dashboard', 'students', 'teachers', 'attendance', 'manual-register', 'logs', 'session-history', 'reports', 'disputes', 'face-review', 'calendar', 'devices', 'interventions', 'lms', 'payroll', 'settings', 'student-profile', 'ai-assistant', 'control', 'all-features', 'broadcast'].includes(tabId);
            }
            return false;
          };

          const rawCandidate = currentHash || localStorage.getItem('last_active_tab') || '';
          const baseCandidate = rawCandidate.split('/')[0].split('?')[0].trim();
          const subCandidate = rawCandidate.includes('/') ? rawCandidate.split('/')[1].split('?')[0].trim() : localStorage.getItem('last_active_sub_setting');

          if (baseCandidate && isTabValid(baseCandidate, data.role)) {
            setActiveTab(baseCandidate);
            if (baseCandidate === 'settings' && subCandidate) {
              setActiveSubSetting(subCandidate);
            }
          } else {
            if (data.role === 'student') {
              setActiveTab('student-attendance');
            } else {
              setActiveTab('dashboard');
            }
          }
        }
      },
      () => {
        sessionInitializedRef.current = false;
        setStudentLogs([]);
        setActiveTab('dashboard');
        setIsDemoMode(false);
      }
    );
  };

  // Fetch student personal logs
  const fetchStudentLogs = async (authToken) => {
    setIsLoadingStudentLogs(true);
    try {
      const res = await studentApi.fetchMyAttendance(authToken || token);
      if (res && res.ok) {
        const data = await res.json();
        const logsArray = Array.isArray(data) ? data : [];
        setStudentLogs(logsArray);
        try {
          localStorage.setItem('cached_student_logs', JSON.stringify(logsArray));
        } catch { /* ignore fallback error */ }
      } else {
        console.error("Failed to fetch student attendance logs, retaining cached data");
      }
    } catch (err) {
      console.error("Error fetching student attendance logs, retaining cached data:", err);
    } finally {
      setIsLoadingStudentLogs(false);
    }
  };

  // Fetch blueprint data for student attendance calendar
  const fetchBlueprint = async (authToken) => {
    const activeToken = authToken || token;
    if (!activeToken) return;
    setBlueprintLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${API_BASE_URL}/attendance/my-calendar`, {
        headers: { Authorization: `Bearer ${activeToken}` },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const safeData = Array.isArray(data) ? data : [];
        setBlueprintData(safeData);
        if (safeData.length > 0) {
          setSelectedBlueprintSubject(prev => prev ?? safeData[0].subject_id);
        }
      } else {
        console.warn('Blueprint fetch returned status:', res.status);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Blueprint fetch error:', err);
      }
    } finally {
      setBlueprintLoading(false);
    }
  };

  // Change student password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordChangeSuccess('');
    setPasswordChangeError('');
    
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 4) {
      setPasswordChangeError('Password must be at least 4 characters long');
      return;
    }
    
    setIsChangingPassword(true);
    if (isDemoMode) {
      setTimeout(() => {
        setPasswordChangeSuccess('SIMULATOR ACTION: Password updated successfully (Local Sandbox Mode).');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsChangingPassword(false);
      }, 1000);
      return;
    }

    try {
      const endpoint = userRole === 'student'
        ? `${API_BASE_URL}/users/students/me/change-password`
        : `${API_BASE_URL}/users/me/change-password`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setPasswordChangeSuccess('Password updated successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordChangeError(data.detail || 'Failed to update password');
      }
    } catch (err) {
      setPasswordChangeError('Connection error. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };



  const startStudentWebcam = async () => {
    setSelfieError('');
    setSelfieSuccess('');
    setStudentWebcamBootActive(true);
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } 
        });
      } catch (e1) {
        console.warn("HD camera constraints failed, trying 640x480 fallback", e1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: 'user' } 
          });
        } catch (e2) {
          console.warn("SD camera constraints failed, trying general video fallback", e2);
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
      if (studentVideoRef.current) {
        studentVideoRef.current.srcObject = stream;
      }
      studentStreamRef.current = stream;
    } catch (err) {
      setStudentWebcamBootActive(false);
      setSelfieError("Camera access is blocked. Allow camera access from your browser's address-bar permissions, then try again.");
    }
  };

  const handleStudentWebcamBootComplete = useCallback(() => {
    setStudentWebcamBootActive(false);
    setStudentWebcamActive(true);
    playCyberSound('success');
  }, []);

  const stopStudentWebcam = () => {
    if (studentStreamRef.current) {
      studentStreamRef.current.getTracks().forEach(track => track.stop());
      studentStreamRef.current = null;
    }
    if (studentVideoRef.current) {
      studentVideoRef.current.srcObject = null;
    }
    setStudentWebcamBootActive(false);
    setStudentWebcamActive(false);
  };

  const handleStudentWebcamCapture = async () => {
    playCyberSound('scan');
    if (!studentVideoRef.current || !studentCanvasRef.current || !studentStreamRef.current) return;
    const video = studentVideoRef.current;
    const canvas = studentCanvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      await uploadSelfieBlob(blob, 'captured_selfie.jpg');
    }, 'image/jpeg', 0.95);
  };

  const handleStudentFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadSelfieBlob(file, file.name);
  };

  const uploadSelfieBlob = async (fileOrBlob, filename) => {
    setSelfieError('');
    setSelfieSuccess('');
    setIsUploadingSelfie(true);

    if (isDemoMode) {
      setTimeout(() => {
        setCurrentUser(prev => ({
          ...prev,
          details: { ...prev.details, photo: 'yes' }
        }));
        setSelfieSuccess('SIMULATOR ACTION: Face photo uploaded and vector compiled successfully (Local Demo).');
        setIsUploadingSelfie(false);
        stopStudentWebcam();
      }, 1200);
      return;
    }

    const formData = new FormData();
    formData.append('file', fileOrBlob, filename);

    try {
      const res = await fetch(`${API_BASE_URL}/users/students/me/upload-selfie?master_password=master`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': 'master'
        },
        body: formData
      });

      let data = {};
      const raw = await res.text();
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(`Server returned non-JSON response (${res.status}). If uploading a file, it might be too large (max 5MB).`);
      }

      if (res.ok) {
        playCyberSound('success');
        setSelfieSuccess('Face registered successfully! Embedded SFace vector updated.');
        // Refresh session details to update badge
        fetchSessionInfo(token);
        stopStudentWebcam();
      } else {
        playCyberSound('error');
        setSelfieError(data.detail || `Quality check failed (Error ${res.status}). Please ensure face is clear and well-lit.`);
      }
    } catch (err) {
      playCyberSound('error');
      setSelfieError(err.message || 'Connection failed. Make sure the backend server is running.');
    } finally {
      setIsUploadingSelfie(false);
    }
  };

  // Restore sandbox mode on mount/refresh if saved in localStorage
  useEffect(() => {
    const savedDemo = localStorage.getItem('isDemoMode') === 'true';
    if (savedDemo && token === 'guest-demo-token') {
      const savedRole = localStorage.getItem('userRole') || 'admin';
      
      let name = 'Guest Admin';
      let email = 'guest.admin@smartattendance.io';
      let userDetails = { id: 999, name: 'Guest Admin', email: 'guest.admin@smartattendance.io' };

      if (savedRole === 'student') {
        name = 'Aarav Sharma';
        email = 'aarav@univ.edu';
        userDetails = {
          id: 101,
          name: 'Aarav Sharma',
          roll: '2023CSE01',
          department: 'Computer Science',
          course: 'B.Tech',
          year: '2026',
          semester: '1st',
          gender: 'Male',
          phone: '9876543210',
          email: 'aarav@univ.edu',
          address: 'Delhi, India',
          teacher: 'Dr. R. K. Singh',
          photo: 'yes'
        };
      } else if (savedRole === 'teacher') {
        name = 'Dr. R. K. Singh';
        email = 'rksingh@univ.edu';
        userDetails = {
          id: 1,
          name: 'Dr. R. K. Singh',
          email: 'rksingh@univ.edu',
          role: 'teacher',
          subject_name: 'Internet of Things',
          subject_code: 'IOT-301',
          subject_department: 'Computer Science'
        };
      }

      setCurrentUser({
        id: savedRole === 'student' ? 101 : (savedRole === 'teacher' ? 1 : 999),
        email: email,
        name: name,
        role: savedRole,
        details: userDetails
      });

      setStats({
        total_students: 154,
        total_present_today: 132,
        total_absent_today: 22,
        average_attendance_rate: 85.7,
        department_stats: { 'Computer Science': { total: 80, present: 72 }, 'ECE': { total: 40, present: 36 }, 'Mechanical': { total: 34, present: 24 } },
        weekly_trends: [
          { date: '15/06/2026', day: 'Mon', present: 124 },
          { date: '16/06/2026', day: 'Tue', present: 130 },
          { date: '17/06/2026', day: 'Wed', present: 128 },
          { date: '18/06/2026', day: 'Thu', present: 135 },
          { date: '19/06/2026', day: 'Fri', present: 132 }
        ]
      });

      setStudents([
        { id: 101, name: 'Aarav Sharma', roll: '2023CSE01', dep: 'Computer Science', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Male', phone: '9876543210', email: 'aarav@univ.edu', address: 'Delhi, India', teacher: 'Dr. R. K. Singh' },
        { id: 102, name: 'Ishita Patel', roll: '2023CSE02', dep: 'Computer Science', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Female', phone: '9876543211', email: 'ishita@univ.edu', address: 'Mumbai, India', teacher: 'Dr. R. K. Singh' },
        { id: 103, name: 'Kabir Verma', roll: '2023ECE01', dep: 'ECE', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Male', phone: '9876543212', email: 'kabir@univ.edu', address: 'Bangalore, India', teacher: 'Dr. Priya Sen' },
        { id: 104, name: 'Riya Gupta', roll: '2023CSE08', dep: 'Computer Science', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Female', phone: '9876543213', email: 'riya@univ.edu', address: 'Kolkata, India', teacher: 'Dr. R. K. Singh' },
        { id: 105, name: 'Aditya Rao', roll: '2023ME04', dep: 'Mechanical', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Male', phone: '9876543214', email: 'aditya@univ.edu', address: 'Hyderabad, India', teacher: 'Dr. Anil Mehta' }
      ]);

      setTeachers([
        { id: 1, name: 'Dr. R. K. Singh', email: 'rksingh@univ.edu', role: 'teacher', subject_name: 'Internet of Things', subject_code: 'IOT-301', subject_department: 'Computer Science' },
        { id: 2, name: 'Dr. Priya Sen', email: 'priyasen@univ.edu', role: 'teacher', subject_name: 'Signals & Systems', subject_code: 'ECE-202', subject_department: 'ECE' },
        { id: 3, name: 'Admin Master', email: 'admin@face.com', role: 'admin', subject_name: '', subject_code: '', subject_department: '' }
      ]);

      setSubjects([
        { id: 1, name: 'Internet of Things', code: 'IOT-301', department: 'Computer Science', teacher_id: 1 },
        { id: 2, name: 'Signals & Systems', code: 'ECE-202', department: 'ECE', teacher_id: 2 },
        { id: 3, name: 'Data Structures', code: 'CSE-101', department: 'Computer Science', teacher_id: 1 }
      ]);

      setLogs([
        { id: '1', roll: '2023CSE01', name: 'Aarav Sharma', department: 'Computer Science', date: getLocalDateString().split('-').reverse().join('/'), time: '09:05 AM', attendance: 'Present', subject_id: 1 },
        { id: '2', roll: '2023CSE02', name: 'Ishita Patel', department: 'Computer Science', date: getLocalDateString().split('-').reverse().join('/'), time: '09:12 AM', attendance: 'Present', subject_id: 1 },
        { id: '3', roll: '2023CSE08', name: 'Riya Gupta', department: 'Computer Science', date: getLocalDateString().split('-').reverse().join('/'), time: '09:18 AM', attendance: 'Late', subject_id: 1 },
        { id: '4', roll: '2023ECE01', name: 'Kabir Verma', department: 'ECE', date: getLocalDateString().split('-').reverse().join('/'), time: '10:02 AM', attendance: 'Present', subject_id: 2 }
      ]);

      setSchedules([
        { id: 1, subject_id: 1, day_of_week: 'Monday', start_time: '09:00', end_time: '10:00' },
        { id: 2, subject_id: 2, day_of_week: 'Monday', start_time: '10:00', end_time: '11:00' },
        { id: 3, subject_id: 3, day_of_week: 'Wednesday', start_time: '11:00', end_time: '12:00' }
      ]);

      setFeedbacks([
        {
          id: 1,
          user_id: 101,
          user_email: 'aarav@univ.edu',
          role: 'student',
          type: 'suggestion',
          rating: 5,
          message: 'Robotic scan layout works super smoothly. Loving the new HUD animations!',
          status: 'resolved',
          admin_reply: 'Thanks Aarav! Streamlined Golden OS controls have been enabled across all views.',
          reviewed_by: 'Admin Master',
          reviewed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          user_id: 1,
          user_email: 'rksingh@univ.edu',
          role: 'teacher',
          type: 'bug',
          rating: 4,
          message: 'Geofencing parameters saved successfully. Dim-light accuracy is much improved.',
          status: 'pending',
          admin_reply: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date().toISOString()
        }
      ]);

      setActiveTelemetry({
        total_active: 12,
        students: 9,
        teachers: 2,
        admins: 1
      });

      setSystemHealth({
        status: 'HEALTHY',
        database: 'CONNECTED',
        database_type: 'sqlite',
        models: { yunet: 'READY', sface: 'READY' },
        metrics: { cpu_percent: 18.5, memory_percent: 42.1, uptime_seconds: 7420 },
        platform: { system: 'Windows', release: '10', python_version: '3.11.2' }
      });

      setSettingsGeoEnabled(true);
      setSettingsLat('28.6139');
      setSettingsLon('77.2090');
      setSettingsRadius('150');
      setSettingsIpEnabled(false);
      setSettingsIpRanges('192.168.1.0/24');

      if (savedRole === 'student') {
        setStudentLogs([
          { id: '1', date: getLocalDateString().split('-').reverse().join('/'), time: '09:05 AM', attendance: 'Present', subject_code: 'IOT-301', subject_name: 'Internet of Things' },
          { id: '2', date: getLocalDateString().split('-').reverse().join('/'), time: '09:15 AM', attendance: 'Present', subject_code: 'CSE-101', subject_name: 'Data Structures' },
          { id: '3', date: '20/06/2026', time: '09:12 AM', attendance: 'Present', subject_code: 'IOT-301', subject_name: 'Internet of Things' },
          { id: '4', date: '19/06/2026', time: '09:02 AM', attendance: 'Present', subject_code: 'CSE-101', subject_name: 'Data Structures' }
        ]);
        setStudentSubjectStats({
          1: { subject_name: 'Internet of Things', subject_code: 'IOT-301', total_classes: 10, present_count: 9, percentage: 90 },
          3: { subject_name: 'Data Structures', subject_code: 'CSE-101', total_classes: 10, present_count: 8, percentage: 80 }
        });
      }
    }
  }, []);

  // Restore cached session instantly on app open (stay logged in until logout)
  useEffect(() => {
    if (token && !currentUser) {
      try {
        const cached = localStorage.getItem('cached_user');
        if (cached) setCurrentUser(JSON.parse(cached));
        const role = localStorage.getItem('userRole');
        if (role) setUserRole(role);
      } catch { /* ignore */ }
    }
  }, [token, currentUser]);

  // Initialize session on mount or token change
  useEffect(() => {
    if (token) {
      if (isDemoMode) return;
      if (loginJustCompletedRef.current) {
        loginJustCompletedRef.current = false;
        return;
      }
      fetchSessionInfo(token);
    } else {
      sessionInitializedRef.current = false;
      setUserRole('');
      setCurrentUser(null);
      localStorage.removeItem('userRole');
    }
  }, [token]);

  useEffect(() => {
    const updateViewport = () => {
      const isMobile = window.innerWidth <= 1024;
      setIsMobileView(isMobile);
      if (!isMobile) {
        setMobileSidebarOpen(false);
      }
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Always close mobile sidebar when switching activeTab
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeTab]);

  // ── Screen-wake / tab-visibility refresh fix ──────────────────────────────
  // When the device screen wakes or the tab becomes visible again after being
  // hidden, re-fetch data so the dashboard never appears blank / stale.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && token && userRole && userRole !== 'student') {
        fetchStats(token);
        fetchLogs(token);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [token, userRole]);


  // Synchronize hash changes back to React activeTab state
  useEffect(() => {
    const isTabValidForRole = (tabId, role) => {
      if (role === 'student') {
        return ['student-attendance', 'student-profile', 'ai-assistant', 'settings', 'calendar', 'leave', 'control', 'all-features', 'broadcast'].includes(tabId);
      } else if (role === 'parent') {
        return ['dashboard', 'student-attendance', 'settings', 'control', 'all-features', 'broadcast'].includes(tabId);
      } else if (role === 'teacher') {
        return ['dashboard', 'students', 'attendance', 'manual-register', 'logs', 'session-history', 'reports', 'disputes', 'face-review', 'calendar', 'interventions', 'payroll', 'settings', 'student-profile', 'ai-assistant', 'control', 'all-features', 'broadcast'].includes(tabId);
      } else if (role === 'hod') {
        return ['dashboard', 'students', 'teachers', 'attendance', 'manual-register', 'logs', 'session-history', 'reports', 'disputes', 'face-review', 'calendar', 'interventions', 'student-profile', 'ai-assistant', 'control', 'all-features', 'broadcast'].includes(tabId);
      } else if (role === 'admin') {
        return ['dashboard', 'students', 'teachers', 'attendance', 'manual-register', 'logs', 'session-history', 'reports', 'disputes', 'face-review', 'calendar', 'devices', 'interventions', 'lms', 'payroll', 'settings', 'student-profile', 'ai-assistant', 'control', 'all-features', 'broadcast'].includes(tabId);
      }
      return false;
    };

    const handleHashChange = (evt) => {
      if (!token || !userRole) return;
      const currentFullHash = window.location.hash || '';
      if (currentFullHash === expectedHashRef.current) {
        return;
      }
      const pStack = pushedHashStackRef.current;
      if (pStack.length >= 2 && pStack[pStack.length - 2] === currentFullHash) {
        scrollPositionsRef.current[currentRouteKeyRef.current] = getScrollTop();
        pendingBackActionRef.current = true;
        pStack.pop();
      } else {
        if (evt && evt.type === 'popstate') {
          scrollPositionsRef.current[currentRouteKeyRef.current] = getScrollTop();
          pendingBackActionRef.current = true;
        }
        if (pStack[pStack.length - 1] !== currentFullHash) {
          pStack.push(currentFullHash);
          if (pStack.length > 35) pStack.shift();
        }
      }
      const currentHash = currentFullHash.replace(/^#\/?/, '').split('?')[0].trim();
      const parts = currentHash.split('/').filter(Boolean);
      const baseHash = parts[0] || '';
      const subHash = parts[1] || null;
      const subHash2 = parts[2] || null;
      const validDashSubs = ['metrics', 'telemetry', 'trends', 'radar', 'diagnostics', 'feedback'];

      const clearNonMatchingSections = (activeBase) => {
        if (activeBase !== 'settings') {
          if (activeSubSettingRef.current !== null) setActiveSubSetting(null);
          if (settingsDetailRouteRef.current !== null) setSettingsDetailRoute(null);
        }
        if (activeBase !== 'dashboard' && activeDashboardSubTabRef.current !== null) {
          setActiveDashboardSubTab(null);
        }
        if (activeBase !== 'students') {
          if (showAddModalRef.current) setShowAddModal(false);
          if (showEditStudentModalRef.current) {
            setShowEditStudentModal(false);
            setEditingStudent(null);
          }
        }
        if (activeBase !== 'teachers') {
          if (teacherFormViewRef.current !== 'list') setTeacherFormView('list');
          if (subjectFormViewRef.current !== 'list') setSubjectFormView('list');
          if (selectedSubjectDetailRef.current) setSelectedSubjectDetail(null);
          if (showScheduleFormRef.current) setShowScheduleForm(false);
        }
      };

      if (baseHash && isTabValidForRole(baseHash, userRole)) {
        if (baseHash !== activeTabRef.current) {
          pendingBackActionRef.current = true;
          uiBackPendingRef.current = false;
          suppressTabHistoryPushRef.current = true;
          if (tabHistoryRef.current.length > 0 && tabHistoryRef.current[tabHistoryRef.current.length - 1] === baseHash) {
            tabHistoryRef.current.pop();
          }
          setActiveTab(baseHash);
        }
        clearNonMatchingSections(baseHash);

        if (baseHash === 'settings') {
          const targetSub = subHash || null;
          if (targetSub !== activeSubSettingRef.current) {
            setActiveSubSetting(targetSub);
          }
          if (['departments', 'leave_management', 'multitenant', 'admins'].includes(targetSub) && subHash2) {
            if (subHash2 === 'register' && targetSub !== 'leave_management') {
              setSettingsDetailRoute({ sub: targetSub, mode: 'register' });
            } else {
              setSettingsDetailRoute({ sub: targetSub, mode: 'detail', id: subHash2 });
            }
          } else if (settingsDetailRouteRef.current !== null) {
            setSettingsDetailRoute(null);
          }
        } else if (baseHash === 'dashboard') {
          const targetDashSub = subHash && validDashSubs.includes(subHash) ? subHash : null;
          if (targetDashSub !== activeDashboardSubTabRef.current) {
            setActiveDashboardSubTab(targetDashSub);
          }
        } else if (baseHash === 'students') {
          if (!subHash) {
            if (showAddModalRef.current) setShowAddModal(false);
            if (showEditStudentModalRef.current) {
              setShowEditStudentModal(false);
              setEditingStudent(null);
            }
          } else if (subHash === 'register') {
            setShowEditStudentModal(false);
            setEditingStudent(null);
            setShowAddModal(true);
          } else {
            const match = studentsRef.current.find(s => String(s.id) === subHash);
            if (match) {
              setShowAddModal(false);
              setEditingStudent({
                ...match,
                course: match.course || 'B.Tech',
                year: match.year || '2026',
                semester: match.semester || '1st',
                gender: match.gender || 'Male',
                dob: match.dob || '',
                phone: match.phone || '',
                address: match.address || '',
                teacher: match.teacher || '',
                password: '',
              });
              setShowEditStudentModal(true);
            }
          }
        } else if (baseHash === 'teachers') {
          if (!subHash) {
            setTeachersSubTab('directory');
            setTeacherFormView('list');
            setSubjectFormView('list');
            setSelectedSubjectDetail(null);
            setShowScheduleForm(false);
            setEditingTeacher(null);
          } else if (subHash === 'register') {
            setTeachersSubTab('directory');
            setEditingTeacher(null);
            setTeacherFormView('register');
            setSubjectFormView('list');
            setShowScheduleForm(false);
          } else if (subHash === 'subjects') {
            setTeachersSubTab('subjects');
            setTeacherFormView('list');
            setShowScheduleForm(false);
            if (!subHash2) {
              setSubjectFormView('list');
              setSelectedSubjectDetail(null);
            } else if (subHash2 === 'register') {
              setSelectedSubjectDetail(null);
              setSubjectFormView('register');
            } else {
              const subMatch = subjectsRef.current.find(s => String(s.id) === subHash2);
              if (subMatch) {
                setSelectedSubjectDetail(subMatch);
                setSubjectFormView('detail');
              } else {
                setSubjectFormView('list');
              }
            }
          } else if (subHash === 'timetable') {
            setTeachersSubTab('planner');
            setTeacherFormView('list');
            setSubjectFormView('list');
            setShowScheduleForm(subHash2 === 'new');
          } else {
            const tMatch = teachersRef.current.find(t => String(t.id) === subHash);
            setTeachersSubTab('directory');
            setSubjectFormView('list');
            setShowScheduleForm(false);
            if (tMatch) {
              setEditingTeacher({ ...tMatch, password: '' });
              setTeacherFormView('detail');
            } else {
              setTeacherFormView('list');
            }
          }
        }
        expectedHashRef.current = currentFullHash;
      } else {
        const fallback = userRole === 'student' ? 'student-attendance' : 'dashboard';
        if (fallback !== activeTabRef.current) {
          suppressTabHistoryPushRef.current = true;
          setActiveTab(fallback);
        }
        clearNonMatchingSections(fallback);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [token, userRole]);

  // Synchronize React activeTab, sub-tabs, students, teachers, and settings sub-views cleanly to window.history
  useEffect(() => {
    if (token && userRole && activeTab) {
      const settingsDetailSeg = activeTab === 'settings' && activeSubSetting && settingsDetailRoute?.sub === activeSubSetting
        ? (settingsDetailRoute.mode === 'register'
            ? '/register'
            : (settingsDetailRoute.id != null ? `/${settingsDetailRoute.id}` : ''))
        : '';
      const expectedHash = activeTab === 'settings' && activeSubSetting
        ? `#/${activeTab}/${activeSubSetting}${settingsDetailSeg}`
        : activeTab === 'dashboard' && activeDashboardSubTab
          ? `#/${activeTab}/${activeDashboardSubTab}`
          : activeTab === 'students' && showAddModal
            ? '#/students/register'
            : activeTab === 'students' && showEditStudentModal && editingStudent?.id
              ? `#/students/${editingStudent.id}`
              : activeTab === 'teachers' && teachersSubTab === 'directory' && teacherFormView === 'register'
                ? '#/teachers/register'
                : activeTab === 'teachers' && teachersSubTab === 'directory' && teacherFormView === 'detail' && editingTeacher?.id
                  ? `#/teachers/${editingTeacher.id}`
                  : activeTab === 'teachers' && teachersSubTab === 'subjects' && subjectFormView === 'register'
                    ? '#/teachers/subjects/register'
                    : activeTab === 'teachers' && teachersSubTab === 'subjects' && subjectFormView === 'detail' && selectedSubjectDetail?.id
                      ? `#/teachers/subjects/${selectedSubjectDetail.id}`
                      : activeTab === 'teachers' && teachersSubTab === 'subjects'
                        ? '#/teachers/subjects'
                        : activeTab === 'teachers' && teachersSubTab === 'planner' && showScheduleForm
                          ? '#/teachers/timetable/new'
                          : activeTab === 'teachers' && teachersSubTab === 'planner'
                            ? '#/teachers/timetable'
                            : `#/${activeTab}`;

      if (pushedHashStackRef.current.length === 0) {
        const seedHash = window.location.hash || expectedHash;
        pushedHashStackRef.current = [seedHash];
        expectedHashRef.current = seedHash;
      }

      const wasUiBack = uiBackPendingRef.current;
      uiBackPendingRef.current = false;

      if (window.location.hash !== expectedHash) {
        const stack = pushedHashStackRef.current;
        const isTeacherRootHash = (h) => ['#/teachers', '#/teachers/subjects', '#/teachers/timetable'].includes(h);
        const topHash = stack[stack.length - 1];

        if (wasUiBack && stack.length >= 2 && stack[stack.length - 2] === expectedHash) {
          stack.pop();
          expectedHashRef.current = expectedHash;
          window.history.back();
        } else if (isTeacherRootHash(topHash) && isTeacherRootHash(expectedHash)) {
          stack[stack.length - 1] = expectedHash;
          expectedHashRef.current = expectedHash;
          window.history.replaceState(window.history.state, '', expectedHash);
        } else if (wasUiBack) {
          if (stack.length > 0) stack[stack.length - 1] = expectedHash;
          else stack.push(expectedHash);
          expectedHashRef.current = expectedHash;
          window.history.replaceState(window.history.state, '', expectedHash);
        } else {
          if (topHash !== expectedHash) {
            stack.push(expectedHash);
            if (stack.length > 35) stack.shift();
          }
          expectedHashRef.current = expectedHash;
          window.history.pushState(null, '', expectedHash);
        }
      } else {
        expectedHashRef.current = expectedHash;
      }
    } else if (!token && !localStorage.getItem('token')) {
      // Only clear hash if the user is truly logged out
      pushedHashStackRef.current = [];
      expectedHashRef.current = '';
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [
    activeTab,
    activeDashboardSubTab,
    activeSubSetting,
    showAddModal,
    showEditStudentModal,
    editingStudent?.id,
    teachersSubTab,
    teacherFormView,
    editingTeacher?.id,
    subjectFormView,
    selectedSubjectDetail?.id,
    showScheduleForm,
    settingsDetailRoute?.sub,
    settingsDetailRoute?.mode,
    settingsDetailRoute?.id,
    token,
    userRole,
  ]);

  useEffect(() => {
    if (!showWebcamModal || !captureStudent) return;
    if (!window.history.state?.enrollWebcam) {
      window.history.pushState({ enrollWebcam: true }, '', window.location.hash || '#/students');
    }
    enrollWebcamBackRef.current = (fromHistory) => {
      enrollWebcamBackRef.current = null;
      stopWebcam();
      setShowWebcamModal(false);
      setCaptureStudent(null);
      if (!fromHistory && window.history.state?.enrollWebcam) window.history.back();
    };
    return () => { enrollWebcamBackRef.current = null; };
  }, [showWebcamModal, captureStudent]);

  useEffect(() => {
    if (!showScannerModal || activeTab !== 'attendance') return;
    if (!window.history.state?.attendanceScanner) {
      window.history.pushState({ attendanceScanner: true }, '', '#/attendance');
    }
    scannerBackRef.current = (fromHistory) => {
      scannerBackRef.current = null;
      stopAttendanceCam();
      setShowScannerModal(false);
      setSessionActive(false);
      if (!fromHistory && window.history.state?.attendanceScanner) window.history.back();
    };
    return () => { scannerBackRef.current = null; };
  }, [showScannerModal, activeTab]);

  const setDashboardSubTabPreservingScroll = useCallback((nextSub) => {
    scrollPositionsRef.current[currentRouteKeyRef.current] = getScrollTop();
    setActiveDashboardSubTab(nextSub);
  }, []);

  const setSubSettingPreservingScroll = useCallback((nextSub) => {
    scrollPositionsRef.current[currentRouteKeyRef.current] = getScrollTop();
    setActiveSubSetting(nextSub);
  }, []);

  const navigateToTab = useCallback((tabId) => {
    scrollPositionsRef.current[currentRouteKeyRef.current] = getScrollTop();
    if (activeTab && activeTab !== tabId && !['login', 'signup'].includes(activeTab)) {
      const historyArr = tabHistoryRef.current;
      if (historyArr[historyArr.length - 1] !== activeTab) {
        historyArr.push(activeTab);
        if (historyArr.length > 25) historyArr.shift();
      }
    }
    setActiveTab(tabId);
    setActiveSubSetting(null);
    setMobileSidebarOpen(false);
    setMobileControlOpen(false);
    playCyberSound('click');
    if (tabId === 'attendance' && sessionActive) {
      setShowScannerModal(true);
    }
  }, [activeTab, sessionActive, playCyberSound]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (token) setUniversalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [token]);

  const handleUniversalSearchNavigate = useCallback((action) => {
    playCyberSound('click');
    setUniversalSearchOpen(false);
    if (action === 'attendance') navigateToTab('attendance');
    else if (action === 'students') navigateToTab('students');
    else if (action === 'extreme') {
      setActiveTab('settings');
      setActiveSubSetting('extreme');
      setMobileSidebarOpen(false);
      setMobileControlOpen(false);
    } else if (action === 'settings') {
      setActiveTab('settings');
      setActiveSubSetting(null);
      setMobileSidebarOpen(false);
      setMobileControlOpen(false);
    }
  }, [navigateToTab]);

  const handleBottomScan = useCallback(() => {
    playCyberSound('click');
    triggerNativeHaptic();
    setActiveSubSetting(null);
    setMobileSidebarOpen(false);
    setMobileControlOpen(false);
    if (sessionActive) {
      setActiveTab('attendance');
      setShowScannerModal(true);
    } else {
      navigateToTab('attendance');
    }
  }, [sessionActive, navigateToTab, playCyberSound]);

  const checkServerConnection = async () => {
    try {
      const ok = await wakeBackend(API_BASE_URL);
      if (ok) {
        setServerWarmingUp(false);
        return true;
      }
    } catch (err) {
      console.log("Server health check failed, warming up...", err);
    }
    if (stats) {
      setServerWarmingUp(false);
      return true;
    }
    return false;
  };

  // Eager server warmup on mount (pre-login)
  useEffect(() => {
    let isMounted = true;
    const warmup = async () => {
      const isConnected = await checkServerConnection();
      if (!isConnected) {
        if (!isMounted) return;
        setServerWarmingUp(true);
        // Start polling retry check
        const intervalId = setInterval(async () => {
          const success = await checkServerConnection();
          if (success) {
            clearInterval(intervalId);
            if (isMounted) {
              setServerWarmingUp(false);
            }
          }
        }, 5000);
        return () => clearInterval(intervalId);
      }
    };
    warmup();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load core data once after login (Instant 0ms parallel background hydration)
  useEffect(() => {
    if (!token || !userRole) return;

    if (loginBootstrapDoneRef.current) {
      loginBootstrapDoneRef.current = false;
      return;
    }

    let isMounted = true;
    
    const initializeData = () => {
      if (!isMounted) return;
      
      // Parallel background fetch - UI is already hydrated from cache in 0 milliseconds!
      if (userRole === 'student') {
        Promise.allSettled([
          fetchStudentLogs(token),
          fetchStudentLeaves(),
          fetchBlueprint(token),
          currentUser?.details ? fetchStudentSubjectStats(currentUser.details.dep, currentUser.details.id) : Promise.resolve()
        ]);
      } else {
        // Fetch stats, 100 recent history logs, students, subjects, departments, and history in parallel
        Promise.allSettled([
          fetchStats(token),
          fetchLogs(token, { limit: 100 }),
          fetchStudents(token),
          fetchSubjects(token),
          fetchDepartments(token),
          fetchSessionHistory()
        ]);
      }

      // Silent non-blocking server warmup
      wakeBackend(API_BASE_URL, 3000).then(ok => {
        if (ok && isMounted) {
          setServerWarmingUp(false);
        }
      }).catch(() => {});
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [token, userRole]);

  // Heartbeat ping loop for all logged-in users
  useEffect(() => {
    if (!token) return undefined;
    
    // Send initial heartbeat immediately
    sendHeartbeat();
    
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      sendHeartbeat();
    }, 60000); // every 60 seconds
    
    return () => clearInterval(interval);
  }, [token]);

  // Polling loop for active users (Admins only, on Dashboard tab)
  useEffect(() => {
    if (!token || userRole !== 'admin' || activeTab !== 'dashboard') return undefined;
    
    fetchActiveUsers();
    
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetchActiveUsers();
    }, 30000); // every 30 seconds
    
    return () => clearInterval(interval);
  }, [token, userRole, activeTab]);

  // Refresh data when switching tabs (On-demand fetching per tab)
  useEffect(() => {
    if (!token || !userRole) return;
    if (userRole === 'student' && !['student-attendance', 'student-profile', 'ai-assistant'].includes(activeTab)) return;

    switch (activeTab) {
      case 'dashboard':
        fetchStats();
        fetchLogs(token, { limit: 10 });
        if (userRole === 'admin' || userRole === 'teacher') fetchStudents();
        break;
      case 'students':
        fetchSubjects().then(() => fetchStudents());
        break;
      case 'logs':
        fetchLogs();
        break;
      case 'attendance':
        fetchSubjects();
        fetchStats();
        break;
      case 'manual-register':
        fetchSubjects();
        fetchStudents();
        break;
      case 'reports':
        // Reports are generated on-demand when user clicks "Generate Report"
        break;
      case 'session-history':
        fetchSessionHistory();
        break;
      case 'settings':
        if (userRole === 'admin') {
          fetchSystemSettings();
          fetchTeachers();
        }
        break;
      case 'teachers':
        if (userRole === 'admin') {
          fetchTeachers();
          fetchSchedules();
          fetchSubjects();
        }
        break;
      case 'leaves':
        if (userRole === 'admin' || userRole === 'teacher') {
          fetchAdminLeaves();
        }
        break;
      case 'feedback':
        if (userRole === 'admin') {
          fetchFeedbacks();
        }
        break;
      case 'student-attendance':
        fetchStudentLogs(token);
        fetchSubjects(token);
        fetchBlueprint(token);
        fetchStudentLeaves(token);
        {
          const sDept = currentUser?.details?.dep || currentUser?.department || currentUser?.dep;
          const sId = currentUser?.details?.id || currentUser?.id;
          if (sDept && sId) {
            fetchStudentSubjectStats(sDept, sId, token);
          }
        }
        break;
      default:
        break;
    }
  }, [activeTab, token, userRole]);

  useEffect(() => {
    if (token && activeTab === 'settings' && activeSubSetting === 'leave_management' && ['admin', 'teacher', 'hod'].includes(userRole)) {
      fetchAdminLeaves(token);
    }
  }, [activeTab, activeSubSetting, token, userRole]);

  // Throttled background polling (paused when browser tab is hidden)
  useEffect(() => {
    if (!token || !userRole || userRole === 'student') return;
    if (activeTab !== 'dashboard' && activeTab !== 'logs') return;

    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (activeTab === 'dashboard') {
        fetchStats();
        fetchLogs(token, { limit: 10 });
      } else if (activeTab === 'logs') {
        fetchLogs();
      }
    }, 30000); // 30s background poll
    return () => clearInterval(interval);
  }, [token, userRole, activeTab]);

  // System Health telemetry loop (staggered 900ms on overview load to avoid MySQL connection burst contention; instant on Diagnostics view)
  useEffect(() => {
    if (token && userRole && userRole !== 'student' && activeTab === 'dashboard') {
      const delay = activeDashboardSubTabRef.current === 'diagnostics' ? 0 : 900;
      const bootTimer = setTimeout(() => {
        fetchSystemHealth();
      }, delay);
      const interval = setInterval(() => {
        if (document.visibilityState !== 'visible') return;
        fetchSystemHealth();
      }, 60000);
      return () => {
        clearTimeout(bootTimer);
        clearInterval(interval);
      };
    }
  }, [token, userRole, activeTab]);


  // For teachers, automatically preselect currently active scheduled class if reliably resolved
  useEffect(() => {
    let cancel = false;
    if (userRole === 'teacher' && currentUser && currentUser.details && subjects.length > 0 && token) {
      const teacherSubjects = subjects.filter(s => s.teacher_id === currentUser.details.id);
      if (teacherSubjects.length > 0) {
        const resolveScheduledSubject = async () => {
          let targetSubIdStr = null;
          try {
            const res = await systemApi.fetchCurrentAutoSession(token);
            if (res && res.active && res.session?.subject_id) {
              const scheduledSubId = res.session.subject_id;
              if (teacherSubjects.some(s => s.id === scheduledSubId)) {
                targetSubIdStr = scheduledSubId.toString();
              }
            }
          } catch {
            // API/network lookup failed — preserve existing manual selection state
          }

          if (cancel || !targetSubIdStr) return;

          // Auto-select ONLY if a valid active scheduled class was resolved and current selection is unselected/invalid
          if (!selectedSubjectId || !teacherSubjects.some(s => s.id === parseInt(selectedSubjectId, 10))) {
            setSelectedSubjectId(targetSubIdStr);
          }
          if (!selectedTeacherSubjectId || !teacherSubjects.some(s => s.id === parseInt(selectedTeacherSubjectId, 10))) {
            setSelectedTeacherSubjectId(targetSubIdStr);
          }
          if (!selectedTeacherLogSubjectId || !teacherSubjects.some(s => s.id === parseInt(selectedTeacherLogSubjectId, 10))) {
            setSelectedTeacherLogSubjectId(targetSubIdStr);
          }
          if (!selectedReportSubjectId || !teacherSubjects.some(s => s.id === parseInt(selectedReportSubjectId, 10))) {
            setSelectedReportSubjectId(targetSubIdStr);
          }
        };

        resolveScheduledSubject();
      }
    }
    return () => { cancel = true; };
  }, [userRole, currentUser, subjects, token, selectedSubjectId, selectedTeacherSubjectId, selectedTeacherLogSubjectId, selectedReportSubjectId]);


  // Initialize Session History filters
  useEffect(() => {
    if (subjects.length > 0) {
      if (userRole === 'admin') {
        const uniqueDepts = [...new Set(subjects.map(s => s.department))];
        if (uniqueDepts.length > 0 && !selectedHistoryDept) {
          setSelectedHistoryDept(uniqueDepts[0]);
        }
        
        const dept = selectedHistoryDept || (uniqueDepts.length > 0 ? uniqueDepts[0] : '');
        const deptSubjects = subjects.filter(s => s.department === dept);
        if (deptSubjects.length > 0) {
          const firstSubIdStr = deptSubjects[0].id.toString();
          if (!selectedHistorySubjectId || !deptSubjects.some(s => s.id.toString() === selectedHistorySubjectId)) {
            setSelectedHistorySubjectId(firstSubIdStr);
          }
        } else {
          setSelectedHistorySubjectId('');
        }
      } else if (userRole === 'teacher' && currentUser?.details) {
        const teacherSub = subjects.find(s => s.teacher_id === currentUser.details.id);
        if (teacherSub) {
          setSelectedHistorySubjectId(teacherSub.id.toString());
        }
      }
    }
  }, [userRole, currentUser, subjects, selectedHistoryDept, selectedHistorySubjectId]);

  // Fetch session history when filters change reactively (Hydrates cached history at 0ms first)
  useEffect(() => {
    if (activeTab === 'session-history' && selectedHistorySubjectId) {
      try {
        const cachedSubj = localStorage.getItem(`cached_session_history_${selectedHistorySubjectId}`);
        if (cachedSubj) {
          const parsed = JSON.parse(cachedSubj);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSessionHistory(parsed);
          }
        }
      } catch { /* storage fallback */ }
      fetchSessionHistory(selectedHistorySubjectId, historyFilterDate, historyFilterPeriod);
    }
  }, [activeTab, selectedHistorySubjectId, historyFilterDate, historyFilterPeriod]);


  const getRoleMismatchMessage = (expectedRole, actualRole) => {
    const portalNames = { student: 'Student', teacher: 'Teacher', admin: 'Admin' };
    const expected = portalNames[expectedRole] || expectedRole;
    const actual = portalNames[actualRole] || actualRole;
    return `This is a ${actual} account. Please navigate to the correct "${expected} Portal" to log in.`;
  };

  const handleExploreGuest = (selectedRole = 'admin') => {
    playCyberSound('success');
    setIsDemoMode(true);
    localStorage.setItem('isDemoMode', 'true');
    sessionStorage.setItem('just_logged_in_tour', 'true');
    setToken('guest-demo-token');
    localStorage.setItem('token', 'guest-demo-token');
    setUserRole(selectedRole);
    localStorage.setItem('userRole', selectedRole);

    let name = 'Guest Admin';
    let email = 'guest.admin@smartattendance.io';
    let userDetails = { id: 999, name: 'Guest Admin', email: 'guest.admin@smartattendance.io' };

    if (selectedRole === 'student') {
      name = 'Aarav Sharma';
      email = 'aarav@univ.edu';
      userDetails = {
        id: 101,
        name: 'Aarav Sharma',
        roll: '2023CSE01',
        department: 'Computer Science',
        course: 'B.Tech',
        year: '2026',
        semester: '1st',
        gender: 'Male',
        phone: '9876543210',
        email: 'aarav@univ.edu',
        address: 'Delhi, India',
        teacher: 'Dr. R. K. Singh',
        photo: 'yes'
      };
    } else if (selectedRole === 'teacher') {
      name = 'Dr. R. K. Singh';
      email = 'rksingh@univ.edu';
      userDetails = {
        id: 1,
        name: 'Dr. R. K. Singh',
        email: 'rksingh@univ.edu',
        role: 'teacher',
        subject_name: 'Internet of Things',
        subject_code: 'IOT-301',
        subject_department: 'Computer Science'
      };
    }

    setCurrentUser({
      id: selectedRole === 'student' ? 101 : (selectedRole === 'teacher' ? 1 : 999),
      email: email,
      name: name,
      role: selectedRole,
      details: userDetails
    });

    loadMockDemoData();

    if (selectedRole === 'student') {
      setStudentLogs([
        { id: '1', date: getLocalDateString().split('-').reverse().join('/'), time: '09:05 AM', attendance: 'Present', subject_code: 'IOT-301', subject_name: 'Internet of Things' },
        { id: '2', date: getLocalDateString().split('-').reverse().join('/'), time: '09:15 AM', attendance: 'Present', subject_code: 'CSE-101', subject_name: 'Data Structures' },
        { id: '3', date: '20/06/2026', time: '09:12 AM', attendance: 'Present', subject_code: 'IOT-301', subject_name: 'Internet of Things' },
        { id: '4', date: '19/06/2026', time: '09:02 AM', attendance: 'Present', subject_code: 'CSE-101', subject_name: 'Data Structures' }
      ]);
      setStudentSubjectStats({
        1: { subject_name: 'Internet of Things', subject_code: 'IOT-301', total_classes: 10, present_count: 9, percentage: 90 },
        3: { subject_name: 'Data Structures', subject_code: 'CSE-101', total_classes: 10, present_count: 8, percentage: 80 }
      });
    }
  };

  const loadMockDemoData = () => {
    setStats({
      total_students: 154,
      total_present_today: 132,
      total_absent_today: 22,
      average_attendance_rate: 85.7,
      department_stats: { 'Computer Science': { total: 80, present: 72 }, 'ECE': { total: 40, present: 36 }, 'Mechanical': { total: 34, present: 24 } },
      weekly_trends: [
        { date: '15/06/2026', day: 'Mon', present: 124 },
        { date: '16/06/2026', day: 'Tue', present: 130 },
        { date: '17/06/2026', day: 'Wed', present: 128 },
        { date: '18/06/2026', day: 'Thu', present: 135 },
        { date: '19/06/2026', day: 'Fri', present: 132 }
      ]
    });

    setStudents([
      { id: 101, name: 'Aarav Sharma', roll: '2023CSE01', dep: 'Computer Science', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Male', phone: '9876543210', email: 'aarav@univ.edu', address: 'Delhi, India', teacher: 'Dr. R. K. Singh' },
      { id: 102, name: 'Ishita Patel', roll: '2023CSE02', dep: 'Computer Science', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Female', phone: '9876543211', email: 'ishita@univ.edu', address: 'Mumbai, India', teacher: 'Dr. R. K. Singh' },
      { id: 103, name: 'Kabir Verma', roll: '2023ECE01', dep: 'ECE', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Male', phone: '9876543212', email: 'kabir@univ.edu', address: 'Bangalore, India', teacher: 'Dr. Priya Sen' },
      { id: 104, name: 'Riya Gupta', roll: '2023CSE08', dep: 'Computer Science', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Female', phone: '9876543213', email: 'riya@univ.edu', address: 'Kolkata, India', teacher: 'Dr. R. K. Singh' },
      { id: 105, name: 'Aditya Rao', roll: '2023ME04', dep: 'Mechanical', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Male', phone: '9876543214', email: 'aditya@univ.edu', address: 'Hyderabad, India', teacher: 'Dr. Anil Mehta' }
    ]);

    setTeachers([
      { id: 1, name: 'Dr. R. K. Singh', email: 'rksingh@univ.edu', role: 'teacher', subject_name: 'Internet of Things', subject_code: 'IOT-301', subject_department: 'Computer Science' },
      { id: 2, name: 'Dr. Priya Sen', email: 'priyasen@univ.edu', role: 'teacher', subject_name: 'Signals & Systems', subject_code: 'ECE-202', subject_department: 'ECE' },
      { id: 3, name: 'Admin Master', email: 'admin@face.com', role: 'admin', subject_name: '', subject_code: '', subject_department: '' }
    ]);

    setSubjects([
      { id: 1, name: 'Internet of Things', code: 'IOT-301', department: 'Computer Science', teacher_id: 1 },
      { id: 2, name: 'Signals & Systems', code: 'ECE-202', department: 'ECE', teacher_id: 2 },
      { id: 3, name: 'Data Structures', code: 'CSE-101', department: 'Computer Science', teacher_id: 1 }
    ]);

    setLogs([
      { id: '1', roll: '2023CSE01', name: 'Aarav Sharma', department: 'Computer Science', date: getLocalDateString().split('-').reverse().join('/'), time: '09:05 AM', attendance: 'Present', subject_id: 1 },
      { id: '2', roll: '2023CSE02', name: 'Ishita Patel', department: 'Computer Science', date: getLocalDateString().split('-').reverse().join('/'), time: '09:12 AM', attendance: 'Present', subject_id: 1 },
      { id: '3', roll: '2023CSE08', name: 'Riya Gupta', department: 'Computer Science', date: getLocalDateString().split('-').reverse().join('/'), time: '09:18 AM', attendance: 'Late', subject_id: 1 },
      { id: '4', roll: '2023ECE01', name: 'Kabir Verma', department: 'ECE', date: getLocalDateString().split('-').reverse().join('/'), time: '10:02 AM', attendance: 'Present', subject_id: 2 }
    ]);

    setSchedules([
      { id: 1, subject_id: 1, day_of_week: 'Monday', start_time: '09:00', end_time: '10:00' },
      { id: 2, subject_id: 2, day_of_week: 'Monday', start_time: '10:00', end_time: '11:00' },
      { id: 3, subject_id: 3, day_of_week: 'Wednesday', start_time: '11:00', end_time: '12:00' }
    ]);

    setFeedbacks([
      {
        id: 1,
        user_id: 101,
        user_email: 'aarav@univ.edu',
        role: 'student',
        type: 'suggestion',
        rating: 5,
        message: 'Robotic scan layout works super smoothly. Loving the new HUD animations!',
        status: 'resolved',
        admin_reply: 'Thanks Aarav! Streamlined Golden OS controls have been enabled across all views.',
        reviewed_by: 'Admin Master',
        reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        user_id: 1,
        user_email: 'rksingh@univ.edu',
        role: 'teacher',
        type: 'bug',
        rating: 4,
        message: 'Geofencing parameters saved successfully. Dim-light accuracy is much improved.',
        status: 'pending',
        admin_reply: null,
        reviewed_by: null,
        reviewed_at: null,
        created_at: new Date().toISOString()
      }
    ]);

    setActiveTelemetry({
      total_active: 12,
      students: 9,
      teachers: 2,
      admins: 1
    });

    setSystemHealth({
      status: 'HEALTHY',
      database: 'CONNECTED',
      database_type: 'sqlite',
      models: { yunet: 'READY', sface: 'READY' },
      metrics: { cpu_percent: 18.5, memory_percent: 42.1, uptime_seconds: 7420 },
      platform: { system: 'Windows', release: '10', python_version: '3.11.2' }
    });

    setSettingsGeoEnabled(true);
    setSettingsLat('28.6139');
    setSettingsLon('77.2090');
    setSettingsRadius('150');
    setSettingsIpEnabled(false);
    setSettingsIpRanges('192.168.1.0/24');
  };

  // Handle SSO Login (delegated to AuthContext)
  const handleSsoLogin = async (provider, emailHint) => {
    await authHandleSsoLogin(provider, emailHint, ({ token: newToken, currentUser: meData }) => {
      loginJustCompletedRef.current = true;
      loginBootstrapDoneRef.current = true;
      if (meData.role === 'student') {
        const studentDept = meData.details?.dep || meData.department || meData.dep;
        const studentId = meData.details?.id || meData.id;
        Promise.allSettled([
          fetchStudentLogs(newToken),
          fetchStudentLeaves(newToken),
          fetchBlueprint(newToken),
          fetchSubjects(newToken),
          ...(studentDept && studentId ? [fetchStudentSubjectStats(studentDept, studentId, newToken)] : [])
        ]);
      } else {
        Promise.allSettled([
          fetchDepartments(newToken),
          fetchStats(newToken),
          fetchLogs(newToken),
          fetchSchedules(newToken),
          fetchAdminLeaves(newToken),
          fetchSubjects(newToken),
          fetchStudents(newToken),
          ...(meData.role === 'admin' ? [fetchTeachers(newToken), fetchFeedbacks(newToken, meData.role)] : [])
        ]);
      }
    });
  };

  // Handle Login submission (delegated to AuthContext)
  const handleLogin = async (e) => {
    await authHandleLogin(e, ({ token: newToken, currentUser: meData }) => {
      loginJustCompletedRef.current = true;
      loginBootstrapDoneRef.current = true;
      sessionInitializedRef.current = true;
      clearApiClientCache();
      if (meData.role === 'student') {
        setActiveTab('student-attendance');
        try { window.location.hash = '#/student-attendance'; } catch { /* ignore */ }
      } else {
        setActiveTab('dashboard');
        try { window.location.hash = '#/dashboard'; } catch { /* ignore */ }
      }

      if (meData.role === 'student') {
        const studentDept = meData.details?.dep || meData.department || meData.dep;
        const studentId = meData.details?.id || meData.id;
        Promise.allSettled([
          fetchStudentLogs(newToken),
          fetchStudentLeaves(newToken),
          fetchBlueprint(newToken),
          fetchSubjects(newToken),
          ...(studentDept && studentId ? [fetchStudentSubjectStats(studentDept, studentId, newToken)] : [])
        ]);
      } else {
        Promise.allSettled([
          fetchDepartments(newToken),
          fetchStats(newToken),
          fetchLogs(newToken),
          fetchSchedules(newToken),
          fetchAdminLeaves(newToken),
          fetchSubjects(newToken),
          fetchStudents(newToken),
          ...(meData.role === 'admin' ? [fetchTeachers(newToken), fetchFeedbacks(newToken, meData.role)] : [])
        ]);
      }
    });
  };

  // Handle Logout (delegated to AuthContext) - complete state and cache isolation
  const handleLogout = () => {
    clearApiClientCache();
    authHandleLogout(() => {
      resetTenant();
      sessionInitializedRef.current = false;
      loginBootstrapDoneRef.current = false;
      loginJustCompletedRef.current = false;
      setStats(null);
      setStudents([]);
      setTeachers([]);
      setLogs([]);
      setStudentLogs([]);
      setStudentSubjectStats({});
      setBlueprintData([]);
      setSelectedSubjectId('');
      setManualSubjectId('');
      setSelectedTeacherSubjectId('');
      setSelectedTeacherLogSubjectId('');
      setSelectedHistorySubjectId('');
      setSelectedReportSubjectId('');
      setManualFeedback('');
      setActiveDashboardSubTab(null);
      setActiveSubSetting(null);
      tabHistoryRef.current = [];
      setActiveTab('');
      setIsDemoMode(false);
      try {
        if (typeof window !== 'undefined') {
          window.location.hash = '';
        }
      } catch { /* ignore */ }
    });
  };







  // Delete Student
  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student? All attendance records for this student will also be deleted.')) {
      return;
    }

    if (isDemoMode) {
      setStudents(prev => prev.filter(s => s.id !== id));
      alert('SIMULATOR ACTION: Student profile deleted locally.');
      return;
    }

    // Immediately remove from local state for instant UI response
    setStudents(prev => {
      const next = prev.filter(s => s.id !== id);
      try {
        localStorage.setItem('cached_students', JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });

    try {
      const res = await studentApi.deleteStudent(token, id);
      if (res && !res.ok && res.status !== 404) {
        const errData = await res.json().catch(() => ({}));
        console.warn('Backend returned deletion warning:', errData);
      }
      fetchStudents();
      fetchStats();
      fetchLogs();
    } catch (err) {
      console.error('Error deleting student:', err);
      // Even if network fails, the student is kept removed from local view
    }
  };

  // Bulk Delete Students
  const handleBulkDeleteStudents = async () => {
    if (selectedStudentIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedStudentIds.size} selected students? All attendance records for these students will also be deleted.`)) {
      return;
    }

    if (isDemoMode) {
      const idsToDelete = Array.from(selectedStudentIds);
      setStudents(prev => prev.filter(s => !idsToDelete.includes(s.id)));
      setSelectedStudentIds(new Set());
      alert('SIMULATOR ACTION: Selected student profiles deleted locally.');
      return;
    }

    try {
      setIsLoading(true);
      const idsToDelete = Array.from(selectedStudentIds);
      let successCount = 0;
      let failCount = 0;
      for (const id of idsToDelete) {
        try {
          await studentApi.deleteStudent(token, id);
          successCount++;
        } catch {
          failCount++;
        }
      }
      setSelectedStudentIds(new Set());
      fetchStudents();
      fetchStats();
      fetchLogs();
      alert(`Bulk deletion complete: ${successCount} deleted successfully, ${failCount} failed.`);
    } catch (err) {
      console.error('Error during bulk student delete:', err);
    } finally {
      setIsLoading(false);
    }
  };


  // Add Student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    setFormError('');
    setStudentError('');

    // Quick validation
    if (!newStudent.id || !newStudent.name || !newStudent.roll || !newStudent.email) {
      const msg = 'ID, Name, Roll, and Email are required.';
      setFormError(msg);
      setStudentError(msg);
      return;
    }

    setIsSubmittingStudent(true);

    if (isDemoMode) {
      const added = { ...newStudent, id: parseInt(newStudent.id) };
      setStudents(prev => [...prev, added]);
      setShowAddModal(false);
      // Reset form
      setNewStudent({
        id: '',
        name: '',
        roll: '',
        dep: departments[0] || '',
        course: 'B.Tech',
        year: '2026',
        semester: '1st',
        gender: 'Male',
        dob: '',
        email: '',
        phone: '',
        address: '',
        teacher: ''
      });
      setIsSubmittingStudent(false);
      alert('SIMULATOR ACTION: Student profile registered locally.');
      return;
    }

    try {
      const payload = {
        ...newStudent,
        id: parseInt(newStudent.id)
      };
      const res = await studentApi.createStudent(token, payload);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const detailMsg = typeof errorData.detail === 'string' ? errorData.detail : (Array.isArray(errorData.detail) ? errorData.detail[0]?.msg : null);
        throw new Error(detailMsg || `Student registration failed (HTTP ${res.status}).`);
      }
      const data = await res.json();
      setStudents(prev => Array.isArray(prev) ? [...prev.filter(s => s.id !== data.id), data] : [data]);
      fetchStudents();
      fetchStats();
      setShowAddModal(false);
      // Open webcam capture modal for the newly registered student
      setCaptureStudent(data);
      setShowWebcamModal(true);
      // Reset form
      setNewStudent({
        id: '',
        name: '',
        roll: '',
        dep: departments[0] || '',
        course: 'B.Tech',
        year: '2026',
        semester: '1st',
        gender: 'Male',
        dob: '',
        email: '',
        phone: '',
        address: '',
        teacher: ''
      });
    } catch (err) {
      const errMsg = err.message || 'Failed to register student.';
      setFormError(errMsg);
      setStudentError(errMsg);
      alert(`⚠️ REGISTRATION REJECTED:\n\n${errMsg}`);
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  // Update Student Details
  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    setEditStudentError('');
    setEditStudentSuccess('');

    if (!editingStudent.name || !editingStudent.roll || !editingStudent.email) {
      setEditStudentError('Name, Roll, and Email are required.');
      return;
    }

    if (isDemoMode) {
      setStudents(prev => prev.map(s => s.id === editingStudent.id ? editingStudent : s));
      setShowEditStudentModal(false);
      alert('SIMULATOR ACTION: Student profile details updated locally.');
      return;
    }

    try {
      const payload = {
        name: editingStudent.name,
        roll: editingStudent.roll,
        dep: editingStudent.dep,
        course: editingStudent.course,
        year: editingStudent.year,
        semester: editingStudent.semester,
        gender: editingStudent.gender,
        dob: editingStudent.dob,
        email: editingStudent.email,
        phone: editingStudent.phone,
        address: editingStudent.address,
        teacher: editingStudent.teacher,
        password: editingStudent.password ? editingStudent.password : undefined
      };
      const res = await studentApi.updateStudent(token, editingStudent.id, payload);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const detailMsg = typeof errorData.detail === 'string' ? errorData.detail : (Array.isArray(errorData.detail) ? errorData.detail[0]?.msg : null);
        throw new Error(detailMsg || `Student update failed (HTTP ${res.status}).`);
      }
      setEditStudentSuccess('Student details updated successfully!');
      fetchStudents();
      setTimeout(() => {
        setShowEditStudentModal(false);
        setEditingStudent(null);
        setEditStudentSuccess('');
      }, 1500);
    } catch (err) {
      setEditStudentError(err.message || 'Failed to update student details.');
    }
  };

  const handleUpdateStudentSelf = async (e) => {
    e.preventDefault();
    setEditStudentSelfError('');
    setEditStudentSelfSuccess('');

    if (!editingStudentSelf.name) {
      setEditStudentSelfError('Full Name is required.');
      return;
    }

    try {
      const payload = {
        name: editingStudentSelf.name,
        phone: editingStudentSelf.phone,
        address: editingStudentSelf.address,
        gender: editingStudentSelf.gender,
        dob: editingStudentSelf.dob
      };
      await studentApi.updateSelf(token, payload);
      setEditStudentSelfSuccess('Your profile details updated successfully!');
      fetchSessionInfo(token);
      setTimeout(() => {
        setShowEditStudentSelfModal(false);
        setEditStudentSelfSuccess('');
      }, 1500);
    } catch (err) {
      setEditStudentSelfError(err.message || 'Failed to update profile details.');
    }
  };

  const handleUpdateTeacherSelf = async (e) => {
    e.preventDefault();
    setEditTeacherSelfError('');
    setEditTeacherSelfSuccess('');

    if (!editingTeacherSelf.name) {
      setEditTeacherSelfError('Name is required.');
      return;
    }
    if (!editingTeacherSelf.email) {
      setEditTeacherSelfError('Email is required.');
      return;
    }

    try {
      const payload = {
        name: editingTeacherSelf.name,
        email: editingTeacherSelf.email
      };
      if (userRole === 'teacher') {
        payload.subject_name = editingTeacherSelf.subject_name;
        payload.subject_code = editingTeacherSelf.subject_code;
        payload.subject_department = editingTeacherSelf.subject_department;
      }

      await teacherApi.updateSelf(token, payload);
      setEditTeacherSelfSuccess('Profile details updated successfully!');
      fetchSessionInfo(token);
      setTimeout(() => {
        setShowEditTeacherSelfModal(false);
        setEditTeacherSelfSuccess('');
      }, 1500);
    } catch (err) {
      setEditTeacherSelfError(err.message || 'Failed to update profile details.');
    }
  };

  // Add Teaching Staff Account
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    setTeacherError('');
    setTeacherSuccess('');

    if (!newTeacher.name || !newTeacher.email || !newTeacher.password) {
      setTeacherError('All fields are required.');
      return;
    }

    if (isDemoMode) {
      const added = { ...newTeacher, id: Date.now() };
      setTeachers(prev => [...prev, added]);
      setTeacherSuccess('SIMULATOR ACTION: Teacher registered locally.');
      setNewTeacher({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'teacher',
        subject_name: '',
        subject_code: '',
        subject_department: departments[0] || ''
      });
      return;
    }

    const roleName = newTeacher.role === 'admin' ? 'Admin' : 'Teacher';

    // Master key verification required for registering any new staff in default workspace OR for creating admins in any workspace
    let masterPass = '';
    if (currentUser?.institution_id === 1 || newTeacher.role === 'admin') {
      masterPass = await requestMasterPassword('🔐 Master Key Verification Required', `Enter Master Password to register new ${roleName} "${newTeacher.name}":`);
      if (!masterPass) {
        setTeacherError('Registration cancelled. Master key is required to register new staff.');
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass || ''
        },
        body: JSON.stringify(newTeacher)
      });
      let data = {};
      try {
        data = await res.json();
      } catch {
        data = { detail: `Server responded with status ${res.status}: ${res.statusText || 'Request failed'}` };
      }
      if (res.ok) {
        playCyberSound('success');
        setTeacherSuccess(`${roleName} registered successfully!`);
        fetchTeachers();
        setNewTeacher({ 
          name: '', 
          email: '', 
          password: '', 
          role: 'teacher',
          subject_name: '',
          subject_code: '',
          subject_department: departments[0] || ''
        });
      } else {
        playCyberSound('error');
        setTeacherError(data.detail || `Failed to register ${roleName.toLowerCase()}.`);
      }
    } catch (err) {
      console.error('Teacher registration error:', err);
      setTeacherError(err.message || 'Connection failed. Please check network connectivity.');
    }
  };

  // Update Teaching Staff Account
  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    setTeacherError('');
    setTeacherSuccess('');

    if (!editingTeacher.name || !editingTeacher.email) {
      setTeacherError('Name and Email are required.');
      return;
    }

    if (isDemoMode) {
      setTeachers(prev => prev.map(t => t.id === editingTeacher.id ? editingTeacher : t));
      pendingBackActionRef.current = true;
      uiBackPendingRef.current = true;
      setTeacherFormView('list');
      setEditingTeacher(null);
      setTeacherSuccess('SIMULATOR ACTION: Teacher profile updated locally.');
      return;
    }

    try {
      const payload = {
        name: editingTeacher.name,
        email: editingTeacher.email,
        password: editingTeacher.password ? editingTeacher.password : undefined,
        role: editingTeacher.role,
        subject_name: editingTeacher.subject_name || '',
        subject_code: editingTeacher.subject_code || '',
        subject_department: editingTeacher.subject_department || (departments[0] || '')
      };
      await teacherApi.updateTeacher(token, editingTeacher.id, payload);
      setTeacherSuccess('Teacher details updated successfully!');
      fetchTeachers();
      pendingBackActionRef.current = true;
      uiBackPendingRef.current = true;
      setTeacherFormView('list');
      setEditingTeacher(null);
    } catch (err) {
      setTeacherError(err.message || 'Connection failed.');
    }
  };

  // Delete Teaching Staff Account
  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher account?')) {
      return;
    }

    if (isDemoMode) {
      setTeachers(prev => prev.filter(t => t.id !== id));
      setTeacherSuccess('SIMULATOR ACTION: Teacher deleted locally.');
      return;
    }

    const masterPass = await requestMasterPassword('🔐 Master Key Verification Required', 'Enter Master Password to delete this teacher account:');
    if (!masterPass) {
      setTeacherError('Deletion cancelled. Master key is required.');
      return;
    }
    setTeacherError('');
    setTeacherSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass
        }
      });
      const data = await res.json();
      if (res.ok) {
        setTeacherSuccess('Teacher account deleted.');
        fetchTeachers();
      } else {
        setTeacherError(data.detail || 'Failed to delete teacher.');
      }
    } catch (err) {
      setTeacherError('Connection failed.');
    }
  };

  // Bulk Delete Teachers
  const handleBulkDeleteTeachers = async () => {
    if (selectedTeacherIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedTeacherIds.size} selected teacher accounts?`)) {
      return;
    }

    if (isDemoMode) {
      const idsToDelete = Array.from(selectedTeacherIds);
      setTeachers(prev => prev.filter(t => !idsToDelete.includes(t.id)));
      setSelectedTeacherIds(new Set());
      setTeacherSuccess('SIMULATOR ACTION: Selected teachers deleted locally.');
      return;
    }

    const masterPass = await requestMasterPassword('🔐 Master Key Verification Required', `Enter Master Password to bulk delete ${selectedTeacherIds.size} teacher accounts:`);
    if (!masterPass) {
      setTeacherError('Deletion cancelled. Master key is required.');
      return;
    }
    setTeacherError('');
    setTeacherSuccess('');

    try {
      setIsLoading(true);
      const idsToDelete = Array.from(selectedTeacherIds);
      let successCount = 0;
      let failCount = 0;
      for (const id of idsToDelete) {
        const res = await fetch(`${API_BASE_URL}/users/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Master-Password': masterPass
          }
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      }
      setSelectedTeacherIds(new Set());
      setTeacherSuccess(`Bulk deletion complete: ${successCount} deleted, ${failCount} failed.`);
      fetchTeachers();
    } catch (err) {
      console.error('Error bulk deleting teachers:', err);
      setTeacherError('An error occurred during bulk deletion.');
    } finally {
      setIsLoading(false);
    }
  };


  const handleAddSubject = async (e) => {
    e.preventDefault();
    setSubjectError('');
    setSubjectSuccess('');

    if (!newSubject.name || !newSubject.code || !newSubject.department) {
      setSubjectError('Name, Code, and Department are required.');
      return;
    }

    if (isDemoMode) {
      const added = { ...newSubject, id: Date.now(), teacher_id: newSubject.teacher_id ? parseInt(newSubject.teacher_id) : null };
      setSubjects(prev => [...prev, added]);
      setSubjectSuccess('SIMULATOR ACTION: Subject registered locally.');
      setNewSubject({ name: '', code: '', department: departments[0] || '', teacher_id: '' });
      return;
    }

    try {
      const payload = {
        name: newSubject.name,
        code: newSubject.code,
        department: newSubject.department,
        teacher_id: newSubject.teacher_id ? parseInt(newSubject.teacher_id) : null
      };
      const res = await systemApi.createSubject(token, payload);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(typeof errData?.detail === 'string' ? errData.detail : 'Failed to register subject.');
      }
      setSubjectSuccess('Subject registered successfully!');
      await fetchSubjects();
      setNewSubject({ name: '', code: '', department: departments[0] || '', teacher_id: '' });
    } catch (err) {
      setSubjectError(err.message || 'Failed to register subject.');
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    setScheduleError('');
    setScheduleSuccess('');

    if (!newSchedule.subject_id || !newSchedule.day_of_week || !newSchedule.start_time || !newSchedule.end_time) {
      setScheduleError('All fields are required.');
      return;
    }

    if (isDemoMode) {
      const added = { ...newSchedule, id: Date.now(), subject_id: parseInt(newSchedule.subject_id) };
      setSchedules(prev => [...prev, added]);
      setScheduleSuccess('SIMULATOR ACTION: Timetable schedule registered locally.');
      setNewSchedule({ subject_id: '', day_of_week: 'Monday', start_time: '', end_time: '' });
      return;
    }

    try {
      const payload = {
        subject_id: parseInt(newSchedule.subject_id),
        day_of_week: newSchedule.day_of_week,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time
      };
      await systemApi.createSchedule(token, payload);
      setScheduleSuccess('Schedule registered successfully!');
      fetchSchedules();
      setNewSchedule({ subject_id: '', day_of_week: 'Monday', start_time: '', end_time: '' });
    } catch (err) {
      setScheduleError(err.message || 'Failed to register schedule.');
    }
  };

  const handleCellClick = (day, periodIndex) => {
    const periodStartTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
    const periodEndTimes = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
    setNewSchedule({
      subject_id: '',
      day_of_week: day,
      start_time: periodStartTimes[periodIndex],
      end_time: periodEndTimes[periodIndex]
    });
    playCyberSound('click');
  };

  // Export logs to CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Roll Number', 'Name', 'Department', 'Time', 'Date', 'Status'];
    const csvRows = [headers.join(',')];

    const logsToExport = selectedLogIds.size > 0
      ? filteredLogs.filter(log => selectedLogIds.has(log.id))
      : filteredLogs;

    logsToExport.forEach(log => {
      const row = [
        `"${log.id}"`,
        `"${log.roll}"`,
        `"${log.name}"`,
        `"${log.department}"`,
        `"${log.time}"`,
        `"${log.date}"`,
        `"${log.attendance}"`
      ];
      csvRows.push(row.join(','));
    });

    saveAndShareFile(csvRows.join('\n'), `Attendance_Logs_${getLocalDateString()}.csv`, 'text/csv;charset=utf-8;');
  };

  // Stable, flicker-free institution display name
  const displayInstitutionName = useMemo(() => {
    const rawUserInst = currentUser?.institution_name || currentUser?.details?.institution_name;
    if (rawUserInst && !['default', 'default institution'].includes(rawUserInst.toLowerCase().trim())) {
      return rawUserInst;
    }
    if (tenantBranding?.name && !['default institution'].includes(tenantBranding.name.toLowerCase().trim())) {
      return tenantBranding.name;
    }
    if (currentUser?.institution_slug && currentUser.institution_slug !== 'default') {
      return currentUser.institution_slug.toUpperCase();
    }
    return tenantBranding?.name || "Smart Attendance";
  }, [currentUser, tenantBranding]);

  // Filtering lists
  // Filtering lists (Memoized for high performance)
  const filteredStudents = useMemo(() => {
    if (!students || !Array.isArray(students)) return [];
    const query = (studentSearch || '').toLowerCase().trim();
    const normalizeDeptStr = (str) => (str || '').toLowerCase().replace(/[\s\(\)\_\-]/g, '');

    return students.filter(student => {
      if (!student) return false;
      // Multi-tenant check: ensure student belongs to current user's institution
      if (currentUser?.institution_id && student.institution_id && Number(student.institution_id) !== Number(currentUser.institution_id)) {
        return false;
      }
      const sName = (student.name || '').toLowerCase();
      const sRoll = (student.roll || '').toLowerCase();
      const sId = (student.id !== undefined && student.id !== null) ? String(student.id).toLowerCase() : '';

      const matchesSearch = !query || sName.includes(query) || sRoll.includes(query) || sId.includes(query);
      
      let matchesDept = true;
      const sDept = student.dep || student.department || '';
      const normSDept = normalizeDeptStr(sDept);
      
      if (userRole === 'admin') {
        const normFilter = normalizeDeptStr(studentDeptFilter);
        matchesDept = !studentDeptFilter || 
                      sDept === studentDeptFilter || 
                      normSDept === normFilter || 
                      (normFilter.length >= 3 && normSDept.includes(normFilter)) || 
                      (normSDept.length >= 3 && normFilter.includes(normSDept));
      } else if (userRole === 'teacher') {
        // If subjects haven't loaded yet, show all students (don't hide them)
        if (subjects.length === 0) {
          matchesDept = true;
        } else if (selectedTeacherSubjectId) {
          const sub = subjects.find(s => s.id === parseInt(selectedTeacherSubjectId));
          matchesDept = sub ? (!sub.department || departmentsMatch(sDept, sub.department)) : true;
        } else {
          const teacherDepts = subjects
            .filter(s => s.teacher_id === currentUser?.details?.id)
            .map(s => s.department)
            .filter(Boolean);
          // If no dept found (subjects not assigned), show all
          matchesDept = teacherDepts.length === 0 ? true : teacherDepts.some(td => departmentsMatch(sDept, td));
        }
      }
      return matchesSearch && matchesDept;
    });
  }, [students, studentSearch, userRole, studentDeptFilter, subjects, selectedTeacherSubjectId, currentUser, departmentsMatch]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        (log.name || '').toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.roll || '').toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.id || '').toLowerCase().includes(logSearch.toLowerCase());

      let matchesDept = true;
      if (userRole === 'admin') {
        matchesDept = !logDeptFilter || log.department === logDeptFilter;
      } else if (userRole === 'teacher') {
        const teacherSubjectIds = subjects
          .filter(s => s.teacher_id === currentUser?.details?.id)
          .map(s => s.id);
        if (selectedTeacherLogSubjectId) {
          // Match by selected subject, OR include logs with null subject_id from teacher's dept
          matchesDept = log.subject_id === parseInt(selectedTeacherLogSubjectId);
        } else {
          // Include logs matching any of teacher's subjects (null subject_id treated as dept match)
          if (teacherSubjectIds.length === 0) {
            matchesDept = true;
          } else {
            const teacherDepts = subjects
              .filter(s => s.teacher_id === currentUser?.details?.id)
              .map(s => s.department);
            matchesDept = teacherSubjectIds.includes(log.subject_id) ||
              (log.subject_id == null && teacherDepts.includes(log.department));
          }
        }
      }

      const matchesDate = !logDateFilter || log.date === logDateFilter.split('-').reverse().join('/'); // Converts yyyy-mm-dd to dd/mm/yyyy
      const matchesQuickFilter = 
        quickFilterStatus === 'all' || 
        (log.attendance || '').toLowerCase() === quickFilterStatus;

      return matchesSearch && matchesDept && matchesDate && matchesQuickFilter;
    });
  }, [logs, logSearch, userRole, logDeptFilter, subjects, currentUser, selectedTeacherLogSubjectId, logDateFilter, quickFilterStatus]);

  const presentToday = stats?.total_present_today ?? 0;
  const liveActivities = useMemo(() => {
    const items = [];
    logs.slice(0, 15).forEach((log, i) => {
      const isPresent = (log.attendance || '').toLowerCase() === 'present' || (log.attendance || '').toLowerCase() === 'late';
      items.push({
        id: `log-${log.id || i}`,
        type: isPresent ? 'present' : 'absent',
        text: `${log.name} — ${log.attendance} (${log.date} ${log.time || ''})`,
      });
    });
    recognizedStudents.slice(0, 5).forEach((s, i) => {
      items.push({
        id: `scan-${i}`,
        type: 'scan',
        text: `${s.name} scanned via face recognition at ${s.time}`,
      });
    });
    if (items.length === 0 && presentToday > 0) {
      items.push({ id: 'stat', type: 'present', text: `${presentToday} students present today` });
    }
    return items;
  }, [logs, recognizedStudents, presentToday]);

  // Role-scoped dashboard stats: Teachers see only their branch/subject students, Admin sees whole campus
  const scopedDashboardStats = useMemo(() => {
    if (userRole !== 'teacher' || !stats) return stats;
    
    // For teacher: use filteredStudents (which already scopes to teacher's branch/subjects)
    const teacherStudents = filteredStudents && filteredStudents.length > 0 ? filteredStudents : students;
    if (teacherStudents && teacherStudents.length > 0) {
      const studentIds = new Set(teacherStudents.map(s => String(s.id)));
      const todayDash = getLocalDateString();
      const todaySlash = todayDash.split('-').reverse().join('/');
      
      // If server stats already match teacher's student count exactly
      if (stats?.total_students > 0 && stats.total_students <= teacherStudents.length) {
        return stats;
      }
      
      // Compute accurate stats for teacher's registered branch students
      const teacherTodayLogs = (logs || []).filter(l => (l.date === todaySlash || l.date === todayDash) && studentIds.has(String(l.id)));
      const presentSet = new Set(teacherTodayLogs.filter(l => (l.attendance || '').toLowerCase() === 'present').map(l => String(l.id)));
      const presentToday = presentSet.size;
      const absentToday = Math.max(0, teacherStudents.length - presentToday);
      const avgRate = teacherStudents.length > 0 ? Math.round((presentToday / teacherStudents.length) * 100) : 0;
      
      return {
        ...stats,
        total_students: teacherStudents.length,
        total_present_today: presentToday,
        total_absent_today: absentToday,
        average_attendance_rate: avgRate
      };
    }
    return stats;
  }, [userRole, stats, filteredStudents, students, logs]);

  // Role-scoped live activity: Teachers only see logs for their branch/subjects (Today's scans only)
  const dashboardRecentLogs = useMemo(() => {
    if (!logs) return [];
    let list = userRole === 'teacher' ? filteredLogs : logs;
    const subMap = {};
    if (subjects && subjects.length > 0) {
      subjects.forEach(s => {
        if (s && s.id) {
          subMap[s.id] = s.name + (s.code ? ` (${s.code})` : '');
        }
      });
    }

    // Filter to ONLY today's scans!
    const todayList = list.filter(l => isTodayDate(l.date));

    return todayList.map(l => {
      const sName = l.subject_name || (l.subject_id ? (subMap[l.subject_id] || `Subject #${l.subject_id}`) : 'General Attendance');
      const pName = l.period || resolvePeriodName(l.time || '');
      const pLabel = l.period_label || getPeriodSlotLabel(pName);
      return {
        ...l,
        subject_name: sName,
        period: pName,
        period_label: pLabel
      };
    }).sort((a, b) => {
      const idA = parseInt(a.id, 10) || 0;
      const idB = parseInt(b.id, 10) || 0;
      if (idA && idB && idA !== idB) return idB - idA;
      const strA = `${a.date || ''} ${a.time || ''}`;
      const strB = `${b.date || ''} ${b.time || ''}`;
      return strB.localeCompare(strA);
    });
  }, [logs, userRole, filteredLogs, subjects]);



  // Login Page View
  if (token && !currentUser) {
    return (
      <div className="flex-center" style={{ 
        minHeight: '100vh', 
        background: 'radial-gradient(circle at center, #0a0f1d 0%, #04060b 100%)', 
        color: '#00f2fe', 
        flexDirection: 'column', 
        gap: '24px', 
        padding: '24px', 
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'monospace'
      }}>
        {/* Neon scanline sweeping the page */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, transparent, #00f2fe, transparent)',
          boxShadow: '0 0 12px #00f2fe',
          opacity: 0.35,
          animation: 'scanlineSweep 3s infinite ease-in-out'
        }} />

        {/* Futuristic robotic grid backdrop */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(0, 242, 254, 0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 254, 0.015) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          pointerEvents: 'none'
        }} />

        {/* Concentric spinning robotic core rings */}
        <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto' }}>
          {/* Outer fast spinning ring */}
          <div style={{
            position: 'absolute', inset: 0,
            border: '3px dashed rgba(0, 242, 254, 0.2)',
            borderTopColor: '#00f2fe',
            borderBottomColor: '#00f2fe',
            borderRadius: '50%',
            animation: 'spin 1.2s linear infinite'
          }} />
          {/* Middle counter-spinning ring */}
          <div style={{
            position: 'absolute', inset: '12px',
            border: '2px solid rgba(0, 242, 254, 0.1)',
            borderLeftColor: 'rgba(0, 242, 254, 0.6)',
            borderRightColor: 'rgba(0, 242, 254, 0.6)',
            borderRadius: '50%',
            animation: 'spin 1.8s linear infinite reverse'
          }} />
          {/* Inner pulsing diagnostic core */}
          <div style={{
            position: 'absolute', inset: '26px',
            background: 'radial-gradient(circle, rgba(0, 242, 254, 0.4) 0%, transparent 70%)',
            borderRadius: '50%',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            animation: 'pulseCore 1.5s ease-in-out infinite'
          }} />
        </div>

        {/* Animated Robotic Title */}
        <div style={{ zIndex: 10 }}>
          <h2 style={{ 
            fontFamily: '"Share Tech Mono", "Share Tech", "Outfit", monospace', 
            fontWeight: 800,
            fontSize: '1.75rem',
            letterSpacing: '0.16em', 
            margin: 0,
            textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #ffffff, #00f2fe, #ffffff)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'shineText 4s linear infinite',
            textShadow: '0 0 15px rgba(0, 242, 254, 0.4)'
          }}>
            {(displayInstitutionName || "SMART ATTENDANCE SYSTEM").toUpperCase()}
          </h2>
          <p style={{ 
            fontSize: '0.72rem', 
            letterSpacing: '0.4em', 
            color: 'rgba(0, 242, 254, 0.5)',
            textTransform: 'uppercase',
            margin: '8px 0 0 0',
            animation: 'flickerText 2.5s infinite alternate'
          }}>
            SYSTEM INITIALIZATION SEQUENCE ACTIVE
          </p>
        </div>

        {/* Small terminal readouts detailing mock subsystems booting */}
        <div style={{
          background: 'rgba(5, 8, 16, 0.65)',
          border: '1px solid rgba(0, 242, 254, 0.12)',
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '0.68rem',
          color: 'rgba(0, 242, 254, 0.75)',
          fontFamily: 'monospace',
          maxWidth: '380px',
          textAlign: 'left',
          boxShadow: 'inset 0 0 10px rgba(0, 242, 254, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          zIndex: 10
        }}>
          <div>&gt; AUTHENTICATING ACCESS CREDENTIALS...</div>
          <div style={{ color: '#10b981' }}>&gt; SECURE TOKEN LOCKED (AES-256)</div>
          <div>&gt; CONNECTING SYSTEM CORE APIS...</div>
        </div>

        {sessionFetchError && (
          <div style={{ zIndex: 10, marginTop: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '15px 25px', borderRadius: '8px', maxWidth: '450px' }}>
            <p style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '15px' }}>
              Failed to connect to the backend server. The database might be sleeping, or you are experiencing connectivity issues.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={() => fetchSessionInfo(token)} 
                className="action-btn"
                style={{ background: 'rgba(0, 242, 254, 0.1)', border: '1px solid #00f2fe', color: '#00f2fe', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Retry Connection
              </button>
              <button 
                onClick={handleLogout} 
                className="action-btn"
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                Logout / Reset
              </button>
            </div>
          </div>
        )}
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes scanlineSweep {
            0% { top: 0%; }
            50% { top: 100%; }
            100% { top: 0%; }
          }
          @keyframes pulseCore {
            0%, 100% { transform: scale(0.9); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 1; }
          }
          @keyframes shineText {
            to { background-position: 200% center; }
          }
          @keyframes flickerText {
            0%, 100% { opacity: 0.75; }
            45% { opacity: 0.8; }
            50% { opacity: 0.35; }
            55% { opacity: 0.9; }
          }
        `}</style>
      </div>
    );
  }

  if (token && lockdownActive) {
    return (
      <main className="campus-pause">
        <section className="campus-pause-card" aria-labelledby="pause-heading">
          <span className="campus-pause-seal" aria-hidden="true"><ShieldCheck size={32} /></span>
          <div role="status">
            <h1 id="pause-heading">Campus access paused</h1>
            <p>Lockdown is active. Access will resume automatically when your administrator restores it.</p>
          </div>
          {userRole === 'admin' && (
            <button type="button" disabled={savingPolicy} onClick={() => saveCampusPolicy({locked:false})}>
              {savingPolicy ? 'Restoring access…' : 'Restore campus access'}
            </button>
          )}
          {policyMessage && policyMessage !== 'Campus policy saved.' && (
            <p role="status">{policyMessage}</p>
          )}
        </section>
      </main>
    );
  }
  if (!token) {
    return (
      <LoginPortal
        loginRole={loginRole}
        setLoginRole={setLoginRole}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        loginWorkspaceSlug={loginWorkspaceSlug}
        setLoginWorkspaceSlug={setLoginWorkspaceSlug}
        authError={authError}
        onClearAuthError={() => setAuthError('')}
        onTenantSwitch={switchTenant}
        isLoading={isLoading}
        serverWarmingUp={serverWarmingUp}
        onWakeServer={async () => {
          setServerWarmingUp(true);
          const ok = await wakeBackend(API_BASE_URL);
          if (ok) setServerWarmingUp(false);
        }}
        onSubmit={handleLogin}
        onSsoLogin={handleSsoLogin}
        onExploreGuest={handleExploreGuest}
      />
    );
  }

  // Dashboard Main View
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {/* ===== VIRTUAL ID CARD MODAL ===== */}
      {showVirtualId && (
        <VirtualIdCardModal
          currentUser={currentUser}
          token={token}
          API_BASE_URL={API_BASE_URL}
          onClose={() => setShowVirtualId(false)}
        />
      )}
      {showQrScannerModal && (
        <QrScannerModal
          period={sessionPeriod}
          geofenceEnabled={settingsGeoEnabled}
          token={token}
          API_BASE_URL={API_BASE_URL}
          selectedSubjectId={selectedSubjectId}
          subjects={subjects}
          onClose={() => setShowQrScannerModal(false)}
          onStudentCheckedIn={(student) => {
            const timeStr = sessionActive ? sessionPeriod : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = sessionActive ? sessionDate.split('-').reverse().join('/') : `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
            
            setRecognizedStudents((prev) => {
              if (prev.some((s) => s.id === student.id)) return prev;
              return [{
                id: student.id,
                name: student.name,
                roll: student.roll,
                dep: student.dep,
                time: timeStr,
                date: dateStr,
                status: 'Present',
              }, ...prev];
            });
            fetchStats();
            fetchLogs();
            if (window.speechSynthesis) {
              const utterance = new SpeechSynthesisUtterance(`Attendance marked for ${student.name}`);
              window.speechSynthesis.speak(utterance);
            }
          }}
          playCyberSound={playCyberSound}
          addDiagnosticLog={addDiagnosticLog}
        />
      )}
      {showKioskModal && (
        <ClassroomKioskModal
          isOpen={showKioskModal}
          onClose={() => setShowKioskModal(false)}
          token={token}
          currentUser={currentUser}
          selectedSubjectId={selectedSubjectId}
          sessionDate={sessionDate}
          sessionPeriod={sessionPeriod}
          onStudentCheckedIn={(student) => {
            const timeStr = sessionActive ? sessionPeriod : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = sessionActive ? sessionDate.split('-').reverse().join('/') : `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
            setRecognizedStudents((prev) => {
              if (prev.some((s) => s.id === student.id || s.roll === student.roll)) return prev;
              return [{
                id: student.id,
                name: student.name,
                roll: student.roll,
                dep: student.dep || student.department,
                time: timeStr,
                date: dateStr,
                status: 'Present',
              }, ...prev];
            });
            fetchStats();
            fetchLogs();
          }}
          playCyberSound={playCyberSound}
          addDiagnosticLog={addDiagnosticLog}
        />
      )}
      {showSmartCardModal && (
        <SmartCardNfcModal
          isOpen={showSmartCardModal}
          onClose={() => setShowSmartCardModal(false)}
          token={token}
          selectedSubjectId={selectedSubjectId}
          sessionDate={sessionDate}
          sessionPeriod={sessionPeriod}
          onStudentCheckedIn={(student) => {
            const timeStr = sessionActive ? sessionPeriod : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = sessionActive ? sessionDate.split('-').reverse().join('/') : `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
            setRecognizedStudents((prev) => {
              if (prev.some((s) => s.id === student.id || s.roll === student.roll)) return prev;
              return [{
                id: student.id,
                name: student.name,
                roll: student.roll,
                dep: student.dep || student.department,
                time: timeStr,
                date: dateStr,
                status: 'Present',
              }, ...prev];
            });
            fetchStats();
            fetchLogs();
          }}
          playCyberSound={playCyberSound}
          addDiagnosticLog={addDiagnosticLog}
        />
      )}
      {isDemoMode && (
        <div style={{
          background: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
          color: '#000000',
          padding: '8px 16px',
          fontSize: '0.8rem',
          fontWeight: 800,
          textAlign: 'center',
          letterSpacing: '0.08em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(245, 158, 11, 0.25)',
          zIndex: 9999,
          position: 'relative',
          fontFamily: 'monospace'
        }}>
          <span>⚠️ SIMULATION ACCESS MATRIX ACTIVE • LOCAL GUEST SANDBOX • REAL RECORDS PRESERVED</span>
        </div>
      )}
      <div className="app-container app-with-fx">

      {/* In-App Update Banner & Download Toast */}
      <UpdateNotification
        updateAvailable={updateAvailable}
        updateDismissed={updateDismissed}
        setUpdateDismissed={setUpdateDismissed}
        setUpdateAvailable={setUpdateAvailable}
        updateDownloadedToast={updateDownloadedToast}
        setUpdateDownloadedToast={setUpdateDownloadedToast}
        serverLatestVersion={serverLatestVersion}
        isMobileView={isMobileView}
      />

      {/* Welcome & Onboarding modals permanently disabled */}

      <OfflineBanner />

      {/* ===== FULLSCREEN SCANNER MODAL ===== */}
      {showScannerModal && (
        <div id="scanner-modal-overlay" className="clean-camera-overlay">
          <div className="clean-camera-inner">
            {/* Modal Floating Header */}
            <div className="clean-camera-header">
              <button
                onClick={() => {
                  if (scannerBackRef.current) scannerBackRef.current(false);
                  else {
                    stopAttendanceCam();
                    setShowScannerModal(false);
                    setSessionActive(false);
                    setActiveTab('attendance');
                  }
                }}
                className="clean-back-btn"
                aria-label="Go back"
              >
                <ArrowLeft size={22} color="#fff" />
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h1 className="clean-scanner-title">Face Attendance</h1>
              </div>

              {/* Floating Camera Controls (Right) */}
              <div className="clean-scanner-top-controls">
                {/* Liveness / Eye Blink Security Control (Line across eye when OFF, illuminated green when ON) */}
                <button
                  type="button"
                  disabled={savingPolicy}
                  onClick={async (event) => {
                    event.stopPropagation();
                    try { playCyberSound('click'); } catch (_) {}
                    if (userRole !== 'admin' && !isDemoMode) {
                      setScannerPolicyMessage('Your institution admin manages the blink requirement.');
                      return;
                    }
                    setScannerPolicyMessage('');
                    const nextBypass = !livenessBypassRef.current;
                    if (userRole === 'admin' && !isDemoMode) {
                      const saved = await saveCampusPolicy({ strict_liveness: !nextBypass });
                      if (!saved) {
                        setScannerPolicyMessage('Blink setting could not be saved. Tap the eye button to retry.');
                        return;
                      }
                      setAttendanceError('');
                    }
                    setLivenessBypass(nextBypass);
                    livenessBypassRef.current = nextBypass;
                    livenessTokenRef.current = null;
                    eyeStateRef.current = 'open';
                    setEyeState('open');
                    if (nextBypass) {
                      livenessStatusRef.current = 'verified';
                      setLivenessStatus('verified');
                      setLivenessMessage('Instant face scan active (Liveness off)');
                      setScanStatus('Scanning...');
                      addDiagnosticLog('Liveness verification: BYPASSED (Instant scan active)');
                      if (attendanceActive && !recognitionBusyRef.current && (lastLandmarksRef.current?.length || lastFaceDetectedRef.current)) {
                        triggerFaceRecognition();
                      }
                    } else {
                      livenessStatusRef.current = 'verifying';
                      setLivenessStatus('verifying');
                      setLivenessMessage('Please blink your eyes to verify.');
                      setScanStatus('Blink to verify');
                      addDiagnosticLog('Liveness verification: ACTIVE (Blink pattern required)');
                    }

                  }}
                  className={`clean-camera-icon-btn ${!livenessBypass ? 'is-liveness-active' : 'is-liveness-off'}`}
                  title={livenessBypass ? 'Liveness blink check is OFF — click to activate' : 'Liveness blink check is ON — click to turn off'}
                  aria-label={livenessBypass ? 'Activate Eye Blink Check' : 'Deactivate Eye Blink Check'}
                  aria-pressed={!livenessBypass}
                >
                  {livenessBypass ? (
                    <EyeOff size={18} color="rgba(255, 255, 255, 0.45)" />
                  ) : (
                    <Eye size={18} color="#34d399" />
                  )}
                </button>

                {/* Flip Camera Icon Button */}
                {attendanceActive && (
                  <button
                    type="button"
                    onClick={toggleAttendanceCameraFacing}
                    className="clean-camera-icon-btn"
                    title="Switch Front/Back Camera"
                    aria-label="Switch Camera"
                  >
                    <SwitchCamera size={17} />
                  </button>
                )}

                {/* Stop / Start Camera Button */}
                <button
                  type="button"
                  onClick={() => {
                    try {
                      playCyberSound('click');
                    } catch (_) {}
                    if (attendanceActive || scannerBootActive) {
                      stopAttendanceCam();
                    } else {
                      startAttendanceCam();
                    }
                  }}
                  className="clean-camera-toggle"
                  style={{
                    borderColor: (attendanceActive || scannerBootActive) ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                    background: (attendanceActive || scannerBootActive) ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: '#ffffff',
                  }}
                  title="Toggle Camera"
                >
                  <Camera size={15} color={(attendanceActive || scannerBootActive) ? '#f87171' : '#34d399'} />
                  <span>{(attendanceActive || scannerBootActive) ? 'Stop' : 'Start'}</span>
                </button>
              </div>
            </div>

            {/* Floating State Status Bar (Directly below header) */}
            <div className={`clean-scanner-state-bar state-${scannerStateInfo.type}`}>
              {scannerStateInfo.icon}
              <span>{scannerStateInfo.text}</span>
            </div>

            {/* Camera Viewport */}
            <div className={`clean-camera-viewport ${scannedStudent ? (scannedStudent.already_marked || scannedStudent.status === 'Already Marked' ? 'scanner-already-border' : 'scanner-verified-border') : (attendanceError ? 'scanner-failed-border' : '')}`}>
              {/* Corner brackets overlay - clean HUD */}
              <CameraAttractHud
                active={attendanceActive}
                mode="attendance"
                livenessStatus={livenessStatus}
                isAlreadyMarked={Boolean(scannedStudent?.already_marked || scannedStudent?.status === 'Already Marked')}
                clean={true}
              />

              {/* Video or Image element based on cameraSource */}
              {cameraScanSettings?.cameraSource === 'external' ? (
                <img
                  ref={attendanceImageRef}
                  src={(attendanceActive || scannerBootActive) ? cameraScanSettings.externalIpUrl : ''}
                  crossOrigin="anonymous"
                  className={scannerBootActive ? 'scanner-video-booting' : ''}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transform: (attendanceFacingMode === 'user' && cameraScanSettings.mirrorPreview !== false) ? 'scaleX(-1)' : 'none',
                    display: (attendanceActive || scannerBootActive) ? 'block' : 'none',
                  }}
                  onLoad={() => {
                    if (scannerBootActive) {
                      handleScannerBootComplete();
                    }
                  }}
                  onError={() => {
                    setScannerBootActive(false);
                    setAttendanceError('Failed to load WiFi IP Camera feed. Please verify the URL and connection.');
                    setScanStatus('Camera Error');
                  }}
                />
              ) : (
                <video
                  ref={attendanceVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={scannerBootActive ? 'scanner-video-booting' : ''}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    transform: (attendanceFacingMode === 'user' && cameraScanSettings.mirrorPreview !== false) ? 'scaleX(-1)' : 'none',
                    display: (attendanceActive || scannerBootActive) ? 'block' : 'none',
                  }}
                />
              )}

              <canvas
                ref={attendanceCanvasRef}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: (attendanceFacingMode === 'user' && cameraScanSettings.mirrorPreview !== false) ? 'scaleX(-1)' : 'none',
                  pointerEvents: 'none',
                  zIndex: 6,
                  display: attendanceActive && cameraScanSettings.autoFocusBox !== false ? 'block' : 'none',
                }}
              />

              {/* ===== NAMED FACE RECOGNITION OVERLAY ===== */}
              {serverRecognizedFaces && serverRecognizedFaces.faces && serverRecognizedFaces.faces.map((face, idx) => {
                if (!face.box) return null;
                if (!face.newly_marked) return null;
                const containerWidth = 640;
                const containerHeight = 480;
                const boxLeft = `${(face.box[0] / (serverRecognizedFaces.captureWidth || containerWidth)) * 100}%`;
                const boxTop = `${(face.box[1] / (serverRecognizedFaces.captureHeight || containerHeight)) * 100}%`;
                const boxWidth = `${(face.box[2] / (serverRecognizedFaces.captureWidth || containerWidth)) * 100}%`;
                const boxHeight = `${(face.box[3] / (serverRecognizedFaces.captureHeight || containerHeight)) * 100}%`;
                const themeColor = '#10b981';

                return (
                  <div key={idx} style={{
                    position: 'absolute',
                    left: boxLeft,
                    top: boxTop,
                    width: boxWidth,
                    height: boxHeight,
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    animation: 'scaleIn 0.25s ease-out',
                    pointerEvents: 'none',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '105%',
                      whiteSpace: 'nowrap',
                      background: 'rgba(16, 185, 129, 0.92)',
                      border: `1px solid ${themeColor}`,
                      borderRadius: '6px',
                      padding: '4px 10px',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}>
                      <span style={{
                        color: '#fff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        letterSpacing: '0.05em',
                      }}>
                        {face.name ? face.name.toUpperCase() : 'IDENTIFIED'}
                      </span>
                      <span style={{
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: '0.65rem',
                        marginTop: '2px',
                      }}>
                        {face.confidence ? `${face.confidence}%` : ''} · PRESENT
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Camera Offline / Click to Start View */}
              {!attendanceActive && !scannerBootActive && (
                <div className="clean-offline-placeholder">
                  {scanStatus === 'Camera Error' || attendanceError ? (
                    <>
                      <AlertCircle size={36} color="#ef4444" />
                      <p style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, margin: '8px 0 0' }}>
                        {attendanceError || 'CAMERA CONNECTION ERROR'}
                      </p>
                      <button
                        onClick={startAttendanceCam}
                        className="btn-primary"
                        style={{ marginTop: '12px' }}
                      >
                        Retry Camera
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="clean-spinner" />
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', fontWeight: 500, margin: '8px 0 0' }}>
                        INITIALIZING CAMERA...
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Floating Card: Structured Scanner Receipt when verified, or Instruction Pill / Fallbacks */}
            {scannedStudent ? (
              <ScannerSuccessReceipt
                student={scannedStudent}
                lang={appLang}
                onDismiss={dismissScannedStudent}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
                <div className="scanner-instruction-pill">
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: attendanceError ? '#ef4444' : livenessStatus === 'verified' ? '#10b981' : '#987235',
                      flexShrink: 0
                    }}
                  />
                  <p className="scanner-instruction-text">
                    {savingPolicy ? 'Saving blink setting…' : scannerPolicyMessage ? scannerPolicyMessage : attendanceError
                      ? attendanceError
                      : livenessMessage && attendanceActive 
                        ? livenessMessage 
                        : "Position your face in the center"}
                  </p>
                </div>
                {attendanceError && (
                  <ScannerFallbackOptions
                    onManualMark={() => {
                      setShowScannerModal(false);
                      setIsManualAttendanceOpen(true);
                    }}
                    onQrScan={() => {
                      alert('QR Mode: Please present student QR identity badge.');
                    }}
                    lang={appLang}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Mobile Sidebar Backdrop */}
      {isMobileView && mobileSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setMobileSidebarOpen(false)} 
        />
      )}

      {/* Sidebar navigation (Desktop rail + Mobile slide-over drawer) */}
      <aside 
        className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => {
          if (e.target.closest('.nav-item')) {
            setMobileSidebarOpen(false);
          }
        }}
      >
        {/* User Profile Card (Promoted to Top) */}
        {currentUser && (
          <div 
            onClick={() => { setActiveTab('student-profile'); playCyberSound('click'); setMobileSidebarOpen(false); }}
            style={{
              margin: '16px 14px 4px',
              padding: '10px 12px',
              borderRadius: '12px',
              background: activeTab === 'student-profile' ? '#faf5ea' : '#faf9f6',
              border: activeTab === 'student-profile' ? '1.5px solid #916d30' : '1px solid #e4dfd5',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
            title="Open My Profile"
          >
            {currentUser.profile_pic ? (
              <img 
                src={currentUser.profile_pic} 
                alt={currentUser.name} 
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #916d30', flexShrink: 0 }} 
              />
            ) : (
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #785927, #7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.88rem', flexShrink: 0 }}>
                {(currentUser.name || currentUser.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: '#25231f', fontSize: '0.86rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.name || currentUser.email}
              </div>
              <div style={{ color: '#16a34a', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                <span style={{ textTransform: 'capitalize' }}>{currentUser.role || 'Member'}</span>
                <span style={{ color: '#94a3b8' }}>• Online</span>
              </div>
            </div>
            <ChevronRight size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
          </div>
        )}

        <div style={{ padding: '6px 16px 8px', display: 'flex', justifyContent: 'center' }}>
          <VersionBadge
            compact
            serverLatest={serverLatestVersion}
            updateActive={updateActiveFlag}
            onCheckUpdate={handleManualCheck}
          />
        </div>

        <ul className="nav-links" style={{ flex: 1, padding: '4px 8px' }}>
          {userRole === 'student' ? (
            <>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'student-attendance' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { setActiveTab('student-attendance'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <TrendingUp size={18} />
                  <span>My Attendance</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { setActiveTab('calendar'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <Calendar size={18} />
                  <span>Academic Calendar</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'broadcast' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { navigateToTab('broadcast'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <Megaphone size={18} />
                  <span>Campus Notices</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'student-profile' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { setActiveTab('student-profile'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <Users size={18} />
                  <span>My Profile</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'ai-assistant' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { setActiveTab('ai-assistant'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <Bot size={18} />
                  <span>AI Assistant</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
            </>
          ) : (
            <>
              {/* CORE SECTION */}
              <div className="nav-section-title" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '10px 14px 4px' }}>Core</div>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { setActiveTab('dashboard'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <TrendingUp size={18} />
                  <span>Dashboard</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => {
                    setActiveTab('attendance');
                    setMobileSidebarOpen(false);
                    playCyberSound('click');
                    if (sessionActive) {
                      setShowScannerModal(true);
                    }
                  }}
                >
                  <Video size={18} />
                  <span>Face Attendance</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { setActiveTab('logs'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <FileSpreadsheet size={18} />
                  <span>Attendance Logs</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { setActiveTab('students'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <Users size={18} />
                  <span>Students</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
              {userRole === 'admin' && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'teachers' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                    onClick={() => { setActiveTab('teachers'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                  >
                    <Users size={18} />
                    <span>Teachers</span>
                    <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                  </button>
                </li>
              )}

              {/* MANAGEMENT SECTION */}
              <div className="nav-section-title" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '14px 14px 4px' }}>Management</div>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { setActiveTab('calendar'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <Calendar size={18} />
                  <span>Academic Calendar</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'broadcast' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { navigateToTab('broadcast'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <Megaphone size={18} />
                  <span>Campus Notices</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { setActiveTab('reports'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <BookOpen size={18} />
                  <span>Reports & Alerts</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
              {(userRole === 'admin' || userRole === 'teacher') && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'disputes' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                    onClick={() => { setActiveTab('disputes'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                  >
                    <ShieldAlert size={18} />
                    <span>Disputes & Requests</span>
                    <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                  </button>
                </li>
              )}

              {/* SYSTEM SECTION */}
              <div className="nav-section-title" style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '14px 14px 4px' }}>System & Settings</div>
              {(userRole === 'admin' || userRole === 'teacher') && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'control' || activeTab === 'all-features' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                    onClick={() => { navigateToTab('control'); setMobileSidebarOpen(false); }}
                  >
                    <LayoutGrid size={18} />
                    <span>Control Center</span>
                    <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                  </button>
                </li>
              )}
              {(userRole === 'admin' || userRole === 'teacher' || userRole === 'student') && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                    onClick={() => { navigateToTab('settings'); setMobileSidebarOpen(false); }}
                  >
                    <ShieldCheck size={18} />
                    <span>{userRole === 'student' ? 'Settings & Status' : 'System Settings'}</span>
                    <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                  </button>
                </li>
              )}
              <li>
                <button 
                  className={`nav-item ${activeTab === 'student-profile' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { setActiveTab('student-profile'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <Users size={18} />
                  <span>My Profile</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'ai-assistant' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px' }}
                  onClick={() => { setActiveTab('ai-assistant'); setMobileSidebarOpen(false); playCyberSound('click'); }}
                >
                  <Bot size={18} />
                  <span>AI Assistant</span>
                  <ChevronRight size={15} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                </button>
              </li>
            </>
          )}
        </ul>

        {/* Footer Actions */}
        <div style={{ padding: '12px 14px calc(20px + env(safe-area-inset-bottom, 0px))', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => { playCyberSound('click'); setIsAboutModalOpen(true); setMobileSidebarOpen(false); }}
            className="nav-item" 
            style={{ 
              width: '100%', 
              border: '1px solid #e4dfd5', 
              background: '#faf9f6', 
              color: '#58534a', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              borderRadius: '12px',
              padding: '11px 14px',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            <Info size={17} style={{ color: '#785927' }} />
            <span>About System</span>
          </button>

          <button 
            onClick={() => { setMobileSidebarOpen(false); handleLogout(); }}
            className="nav-item" 
            style={{ 
              width: '100%', 
              border: '1px solid #fecaca', 
              background: '#fef2f2', 
              color: '#dc2626', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              borderRadius: '12px',
              padding: '11px 14px',
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {/* Header */}
        <header className={`flex-between header-container ${activeTab === 'ai-assistant' ? 'hide-on-mobile' : ''}`} style={{ marginBottom: activeTab === 'ai-assistant' ? '8px' : '16px' }}>
          <div className="header-title-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              {((tabHistoryRef.current.length > 0 && activeTab !== 'dashboard' && activeTab !== 'student-attendance') || (activeTab === 'settings' && activeSubSetting !== null) || (activeTab === 'dashboard' && activeDashboardSubTab !== null) || (activeTab === 'students' && (showAddModal || showEditStudentModal)) || (activeTab === 'teachers' && (teacherFormView !== 'list' || subjectFormView !== 'list' || showScheduleForm)) || ['face-review', 'disputes', 'devices', 'calendar', 'interventions', 'lms', 'payroll', 'session-history', 'broadcast'].includes(activeTab)) && (
                <button
                  type="button"
                  onClick={handleNavigateBack}
                  className="back-icon-btn active-haptic"
                  style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    borderRadius: '10px',
                    border: '1px solid #e4dfd5',
                    background: '#ffffff',
                    color: '#25231f',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                  title="Go Back"
                  aria-label="Go Back"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <div className={activeTab === 'ai-assistant' ? 'hide-on-mobile' : ''} style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, wordBreak: 'normal' }}>
                  {activeTab === 'dashboard' && (() => {
                    if (activeDashboardSubTab === 'metrics' || activeDashboardSubTab === 'telemetry') return 'Attendance Metrics';
                    if (activeDashboardSubTab === 'trends' || activeDashboardSubTab === 'radar') return 'Attendance Trends';
                    if (activeDashboardSubTab === 'diagnostics') return 'System Diagnostics';
                    if (activeDashboardSubTab === 'feedback') return 'User Feedback';
                    return userRole === 'teacher' ? 'Teacher Dashboard' : 'Admin Dashboard';
                  })()}
                  {activeTab === 'students' && (
                    showAddModal ? 'Register Student' : (showEditStudentModal && editingStudent ? editingStudent.name : 'Student Directory')
                  )}
                  {activeTab === 'teachers' && (() => {
                    if (teachersSubTab === 'directory') {
                      if (teacherFormView === 'register') return 'Register Teacher';
                      if (teacherFormView === 'detail' && editingTeacher) return editingTeacher.name;
                    } else if (teachersSubTab === 'subjects') {
                      if (subjectFormView === 'register') return 'Register Subject';
                      if (subjectFormView === 'detail' && selectedSubjectDetail) return selectedSubjectDetail.name;
                    } else if (teachersSubTab === 'planner' && showScheduleForm) {
                      return 'New Class Schedule';
                    }
                    return 'Teacher Directory';
                  })()}
                  {activeTab === 'logs' && 'Attendance Logs'}
                  {activeTab === 'attendance' && 'Take Attendance'}
                  {activeTab === 'reports' && 'Reports & Analytics'}
                  {activeTab === 'session-history' && 'Session History'}
                  {activeTab === 'disputes' && 'Attendance Disputes'}
                  {activeTab === 'face-review' && 'Face Match Review'}
                  {activeTab === 'calendar' && 'Academic Calendar'}
                  {activeTab === 'devices' && 'Kiosks & Sensors'}
                  {activeTab === 'interventions' && 'Student Interventions'}
                  {activeTab === 'lms' && 'LMS Integration'}
                  {activeTab === 'payroll' && 'Staff & Payroll'}
                  {activeTab === 'broadcast' && 'Campus Broadcast & Notices'}
                  {activeTab === 'student-attendance' && 'My Attendance'}
                  {activeTab === 'student-profile' && 'My Profile'}
                  {activeTab === 'settings' && (() => {
                    if (!activeSubSetting) return 'Settings Directory';
                    if (settingsDetailRoute && settingsDetailRoute.sub === activeSubSetting) {
                      if (activeSubSetting === 'departments') {
                        if (settingsDetailRoute.mode === 'register') return 'Register Department';
                        return settingsDetailRoute.item?.name ||
                          departmentsList.find(d => String(d.id) === String(settingsDetailRoute.id))?.name ||
                          'Department Details';
                      }
                      if (activeSubSetting === 'leave_management') {
                        return settingsDetailRoute.item?.student_name ||
                          adminLeaveRequests.find(r => String(r.id) === String(settingsDetailRoute.id))?.student_name ||
                          'Leave Request';
                      }
                      if (activeSubSetting === 'multitenant') {
                        if (settingsDetailRoute.mode === 'register') return 'Register Institution';
                        return settingsDetailRoute.item?.name || 'Institution Details';
                      }
                      if (activeSubSetting === 'admins') {
                        if (settingsDetailRoute.mode === 'register') return 'Register Admin';
                        return settingsDetailRoute.item?.name ||
                          teachers.find(u => u.role === 'admin' && String(u.id) === String(settingsDetailRoute.id))?.name ||
                          'Administrator Details';
                      }
                    }
                    const subTitles = {
                      geofencing: 'Security Perimeter & Geofence',
                      advanced: 'Face Recognition & Biometrics',
                      profile: 'My Profile & Credentials',
                      admins: 'Staff & Administrator Accounts',
                      departments: 'Departments & Branches',
                      leave_management: 'Leave Management',
                      app_version: 'System Version & Build',
                      multitenant: 'Campus & Institution Registry',
                      release_updates: 'Release Updates',
                      features_folder: 'Advanced Features',
                      enterprise: 'Enterprise Configuration',
                      extreme: 'Extreme Security Settings',
                      ideas150: 'Product Roadmap & Ideas',
                      features7: 'Enterprise 7 Suite',
                      new_features: 'Next-Gen Capabilities',
                      wellness: 'Student Wellness Portal',
                      ar_gamification: 'AR & Gamification Settings',
                      premium: 'Plan & Billing'
                    };
                    return subTitles[activeSubSetting] || 'System Settings';
                  })()}
                  {activeTab === 'ai-assistant' && 'AI Assistant'}
                  {(activeTab === 'control' || activeTab === 'all-features') && 'Control Center'}
                </h1>
                {userRole !== 'student' && userRole !== 'teacher' && !(activeTab === 'settings' && (settingsDetailRoute?.sub === activeSubSetting || ['departments', 'leave_management', 'multitenant', 'admins', 'advanced'].includes(activeSubSetting))) && (
                  <p style={{ color: '#696358', fontSize: '0.84rem', fontWeight: 500, margin: '4px 0 0', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeTab === 'dashboard' && (() => {
                      if (activeDashboardSubTab) return 'Detailed analytics and operational telemetry';
                      return 'Real-time attendance overview and telemetry';
                    })()}
                    {activeTab === 'students' && 'Registered students and face enrollments'}
                    {activeTab === 'teachers' && 'Faculty directory and subject timetables'}
                    {activeTab === 'logs' && 'Daily scan registers and export logs'}
                    {activeTab === 'attendance' && 'Face scan, manual register, ID card & kiosk check-in'}
                    {activeTab === 'reports' && 'Shortage defaulters, exports, and alerts'}
                    {activeTab === 'session-history' && 'Class-wise daily session registers'}
                    {activeTab === 'disputes' && 'Student disputes and attendance corrections'}
                    {activeTab === 'face-review' && 'Low-confidence face detection review'}
                    {activeTab === 'calendar' && 'Campus schedule, holidays, and events'}
                    {activeTab === 'devices' && 'Hardware kiosks and camera sensors'}
                    {activeTab === 'interventions' && 'Shortage alerts and counseling workflows'}
                    {activeTab === 'lms' && 'Canvas, Moodle, and ERP roster sync'}
                    {activeTab === 'payroll' && 'Staff punches, hours, and disbursements'}
                    {activeTab === 'broadcast' && 'Official circulars, announcements, and downloadable certified PDF circulars'}
                    {activeTab === 'student-attendance' && 'Attendance progress and subject breakdown'}
                    {activeTab === 'student-profile' && 'Personal profile and account credentials'}
                    {activeTab === 'settings' && (() => {
                      if (!activeSubSetting) return 'Security, biometrics, and administration';
                      const subDescs = {
                        geofencing: 'Perimeter boundaries, Wi-Fi subnet gates & emergency lockdown',
                        advanced: 'Biometrics, liveness detection, and anti-spoofing parameters',
                        profile: 'Personal profile, security credentials, and preferences',
                        admins: 'Manage administrative staff, teachers, and system access',
                        departments: 'Academic departments, faculties, and degree branches',
                        leave_management: 'Student leave applications, approvals, and history',
                        app_version: 'Application version, release telemetry, and system updates',
                        multitenant: 'Tenant registry and campus multi-institution management',
                        release_updates: 'Software release pipeline and version changelogs',
                        features_folder: 'Enterprise modules and extended system tools'
                      };
                      return subDescs[activeSubSetting] || 'Configure security, perimeter, and preferences';
                    })()}
                    {activeTab === 'ai-assistant' && 'Campus AI assistant for queries and actions'}
                    {(activeTab === 'control' || activeTab === 'all-features') && 'All campus operations, services, and system utilities'}
                  </p>
                )}
              </div>
            </div>

            {/* Notification Bell Button (Placed directly to the Left of 3-line Hamburger Menu) */}
            <NotificationBell
              unreadCount={realtimeUnreadCount}
              onClick={() => setShowNotificationDrawer(true)}
              playCyberSound={playCyberSound}
            />

            <button 
              type="button"
              className="hamburger-btn" 
              onClick={() => {
                playCyberSound('click');
                triggerHaptic();
                setMobileSidebarOpen(prev => !prev);
              }}
              aria-label="Open Navigation Menu"
              title="Open Navigation Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div className="header-actions">
            {/* Campus Broadcast & Notices Button for All Credentials */}
            <button 
              type="button"
              className="hover-elevate active-haptic"
              onClick={() => { playCyberSound('click'); navigateToTab('broadcast'); }}
              title={userRole === 'admin' ? "Campus Broadcast & Dispatch" : "Campus Notice Board & Official Circulars"}
              aria-label="Campus Notice Board"
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                background: activeTab === 'broadcast' ? '#faf5ea' : 'rgba(255, 255, 255, 0.95)',
                border: activeTab === 'broadcast' ? '1.5px solid #785927' : '1px solid #cfc8ba',
                color: activeTab === 'broadcast' ? '#684c20' : '#46423b',
                cursor: 'pointer',
                minHeight: '36px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.15s ease'
              }}
            >
              <Megaphone size={14} color="#785927" />
              <span>{userRole === 'admin' ? 'Broadcast' : 'Notices'}</span>
            </button>

            {/* Accessibility & Language Modal Trigger */}
            <button 
              className="header-action-desktop-only"
              onClick={() => { playCyberSound('click'); setShowAccessibilityModal(true); }}
              title="Language & Accessibility Settings"
              aria-label="Language & Accessibility Settings"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.8rem',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                color: 'var(--color-text-main)',
                cursor: 'pointer',
                minHeight: '38px',
                minWidth: '38px'
              }}
            >
              <Globe size={15} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{appLang === 'hi' ? 'हिन्दी' : 'EN'}</span>
            </button>
            {userRole === 'student' && (
              <button 
                onClick={() => { playCyberSound('click'); handleLogout(); }}
                style={{ 
                  padding: '8px 14px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.8rem', 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  color: '#ef4444',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginRight: '8px'
                }}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            )}
            {activeTab === 'logs' && (
              <AttendanceRegistersHeaderAction
                exportToCSV={exportToCSV}
                filteredLogs={filteredLogs}
              />
            )}
            {activeTab === 'reports' && (
              <AttendanceReportsHeaderAction
                printReport={printReport}
                exportReportToCSV={exportReportToCSV}
                downloadReportPDF={downloadReportPDF}
                handleSendAbsenteeAlerts={handleSendAbsenteeAlerts}
                reportData={reportData}
                isSendingAlerts={isSendingAlerts}
              />
            )}
          </div>
        </header>

        {serverWarmingUp && !stats && (
          <div className="glass-panel" style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#f59e0b',
            borderRadius: '16px',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 8px 30px rgba(245, 158, 11, 0.04)',
            animation: 'pulse 2s infinite',
            textAlign: 'left'
          }}>
            <AlertCircle size={28} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
              <strong style={{ display: 'block', marginBottom: '4px', color: '#fff', fontSize: '1.05rem', fontFamily: 'Outfit, sans-serif' }}>
                ⚠️ Cloud Server Is Warming Up
              </strong>
              <span>
                Our cloud server goes to sleep after 15 minutes of inactivity to save resources. We are waking it up now. Please wait (~45 seconds) for background services to initialize. Once ready, this message will disappear and your data will load automatically.
              </span>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          userRole === 'parent' ? (
            <ParentDashboardView
              token={token}
              currentUser={currentUser}
              navigateToTab={navigateToTab}
              playCyberSound={playCyberSound}
              setShowNotificationDrawer={setShowNotificationDrawer}
            />
          ) : userRole === 'hod' ? (
            <HodDashboardView
              token={token}
              currentUser={currentUser}
              navigateToTab={navigateToTab}
              playCyberSound={playCyberSound}
            />
          ) : userRole === 'student' ? (
            <StudentAttendanceDashboardView
              studentLogs={studentLogs}
              studentSubjectStats={studentSubjectStats}
              blueprintData={blueprintData}
              blueprintLoading={blueprintLoading}
              selectedBlueprintSubject={selectedBlueprintSubject}
              setSelectedBlueprintSubject={setSelectedBlueprintSubject}
              blueprintCalendarDate={blueprintCalendarDate}
              setBlueprintCalendarDate={setBlueprintCalendarDate}
              geofenceStatus={geofenceStatus}
              setGeofenceStatus={setGeofenceStatus}
              studentLeaveRequests={studentLeaveRequests}
              token={token}
              API_BASE_URL={API_BASE_URL}
              subjects={subjects}
              fetchBlueprint={fetchBlueprint}
              fetchStudentLogs={fetchStudentLogs}
              fetchStudentLeaves={fetchStudentLeaves}
              exportToCSV={exportToCSV}
              setShowVirtualId={setShowVirtualId}
              setShowDisputeModal={setShowDisputeModal}
              setDisputePrefillSession={setDisputePrefillSession}
              setShowFeedbackModal={setShowFeedbackModal}
              showBlueprintDayModal={showBlueprintDayModal}
              setShowBlueprintDayModal={setShowBlueprintDayModal}
              blueprintDayModalDate={blueprintDayModalDate}
              setBlueprintDayModalDate={setBlueprintDayModalDate}
              appLang={appLang}
              playCyberSound={playCyberSound}
              currentUser={currentUser}
              onNavigateToCalendar={() => { setActiveTab('calendar'); playCyberSound('click'); }}
              onNavigateTab={navigateToTab}
            />
          ) : (
            <AdminTeacherDashboardView
              fetchStats={fetchStats}
              fetchLogs={fetchLogs}
              activeDashboardSubTab={activeDashboardSubTab}
              setActiveDashboardSubTab={setDashboardSubTabPreservingScroll}
              subjects={subjects}
              schedules={schedules}
              dashboardRecentLogs={dashboardRecentLogs}
              filteredStudents={filteredStudents}
              attendanceActive={attendanceActive}
              scannerBootActive={scannerBootActive}
              wsConnected={wsConnected}
              selectedSubjectId={selectedSubjectId}
              sessionPeriod={sessionPeriod}
              sessionDate={sessionDate}
              setSessionDate={setSessionDate}
              manualSubjectId={manualSubjectId}
              setManualSubjectId={setManualSubjectId}
              manualPeriod={manualPeriod}
              setManualPeriod={setManualPeriod}
              manualDate={manualDate}
              setManualDate={setManualDate}
              setSelectedSubjectId={setSelectedSubjectId}
              setSessionPeriod={setSessionPeriod}
              setSessionActive={setSessionActive}
              setActiveTab={setActiveTab}
              setShowScannerModal={setShowScannerModal}
              startAttendanceCam={startAttendanceCam}
              stopAttendanceCam={stopAttendanceCam}
              setIsManualAttendanceOpen={setIsManualAttendanceOpen}
              exportToCSV={exportToCSV}
              appLang={appLang}
              stats={stats}
              scopedDashboardStats={scopedDashboardStats}
              isMobileView={isMobileView}
              setSelectedAuditLog={setSelectedAuditLog}
              setShowFeedbackModal={setShowFeedbackModal}
              liveActivities={liveActivities}
              activeTelemetry={activeTelemetry}
              chartRef1={chartRef1}
              chartWidth1={chartWidth1}
              chartRef2={chartRef2}
              chartWidth2={chartWidth2}
              hudMetrics={hudMetrics}
              neuralMeshCanvasRef={neuralMeshCanvasRef}
              systemHealth={systemHealth}
              apiLatency={apiLatency}
              serverLatencyMs={serverLatencyMs}
              healthLoading={healthLoading}
              setHealthLoading={setHealthLoading}
              fetchSystemHealth={fetchSystemHealth}
              isLoadingFeedbacks={isLoadingFeedbacks}
              feedbacks={feedbacks}
              reviewFeedback={reviewFeedback}
              fetchFeedbacks={fetchFeedbacks}
            />
          )
        )}

        {activeTab === 'students' && (
          <StudentsDirectoryView
            studentSearch={studentSearch}
            setStudentSearch={setStudentSearch}
            studentDeptFilter={studentDeptFilter}
            setStudentDeptFilter={setStudentDeptFilter}
            departments={departments}
            filteredStudents={filteredStudents}
            selectedStudentIds={selectedStudentIds}
            setSelectedStudentIds={setSelectedStudentIds}
            handleBulkDeleteStudents={handleBulkDeleteStudents}
            handleDeleteStudent={handleDeleteStudent}
            setCaptureStudent={setCaptureStudent}
            setShowWebcamModal={setShowWebcamModal}
            editingStudent={editingStudent}
            setEditingStudent={setEditingStudent}
            showEditStudentModal={showEditStudentModal}
            setShowEditStudentModal={setShowEditStudentModal}
            handleUpdateStudent={handleUpdateStudent}
            editStudentError={editStudentError}
            setEditStudentError={setEditStudentError}
            editStudentSuccess={editStudentSuccess}
            setEditStudentSuccess={setEditStudentSuccess}
            serverWarmingUp={serverWarmingUp}
            subjects={subjects}
            newStudent={newStudent}
            setNewStudent={setNewStudent}
            showAddModal={showAddModal}
            setShowAddModal={setShowAddModal}
            handleAddStudent={handleAddStudent}
            formError={formError}
            setFormError={setFormError}
            studentError={studentError}
            setStudentError={setStudentError}
            isSubmittingStudent={isSubmittingStudent}
            isMobileView={isMobileView}
            onCloseSubView={handleNavigateBack}
          />
        )}

        {activeTab === 'teachers' && userRole === 'admin' && (
          <TeachersDirectoryView
            editingTeacher={editingTeacher}
            setEditingTeacher={setEditingTeacher}
            teacherError={teacherError}
            setTeacherError={setTeacherError}
            teacherSuccess={teacherSuccess}
            setTeacherSuccess={setTeacherSuccess}
            newTeacher={newTeacher}
            setNewTeacher={setNewTeacher}
            handleUpdateTeacher={handleUpdateTeacher}
            handleAddTeacher={handleAddTeacher}
            departments={departments}
            selectedTeacherIds={selectedTeacherIds}
            setSelectedTeacherIds={setSelectedTeacherIds}
            handleBulkDeleteTeachers={handleBulkDeleteTeachers}
            teachers={teachers}
            subjects={subjects}
            schedules={schedules}
            handleCellClick={handleCellClick}
            subjectError={subjectError}
            subjectSuccess={subjectSuccess}
            handleAddSubject={handleAddSubject}
            newSubject={newSubject}
            setNewSubject={setNewSubject}
            scheduleError={scheduleError}
            scheduleSuccess={scheduleSuccess}
            handleAddSchedule={handleAddSchedule}
            newSchedule={newSchedule}
            setNewSchedule={setNewSchedule}
            handleDeleteTeacher={handleDeleteTeacher}
            isMobileView={isMobileView}
            timetableSubTab={teachersSubTab}
            setTimetableSubTab={setTeachersSubTab}
            teacherView={teacherFormView}
            setTeacherView={setTeacherFormView}
            subjectView={subjectFormView}
            setSubjectView={setSubjectFormView}
            selectedSubjectDetail={selectedSubjectDetail}
            setSelectedSubjectDetail={setSelectedSubjectDetail}
            showScheduleForm={showScheduleForm}
            setShowScheduleForm={setShowScheduleForm}
            onOpenScheduleFromSubject={() => {
              scheduleReturnTargetRef.current = 'subject-detail';
              setTeachersSubTab('planner');
              setShowScheduleForm(true);
            }}
            onCloseSubView={handleNavigateBack}
          />
        )}

        {activeTab === 'logs' && (
          <AttendanceRegistersView
            logSearch={logSearch}
            setLogSearch={setLogSearch}
            logDeptFilter={logDeptFilter}
            setLogDeptFilter={setLogDeptFilter}
            logDateFilter={logDateFilter}
            setLogDateFilter={setLogDateFilter}
            quickFilterStatus={quickFilterStatus}
            setQuickFilterStatus={setQuickFilterStatus}
            logsViewMode={logsViewMode}
            setLogsViewMode={setLogsViewMode}
            selectedLogIds={selectedLogIds}
            setSelectedLogIds={setSelectedLogIds}
            selectedAuditLog={selectedAuditLog}
            setSelectedAuditLog={setSelectedAuditLog}
            filteredLogs={filteredLogs}
            departments={departments}
            subjects={subjects}
            exportToCSV={exportToCSV}
            shiftDate={shiftDate}
            getPeriodSlotLabel={getPeriodSlotLabel}
            isMobileView={isMobileView}
          />
        )}

        {activeTab === 'attendance' && (
          <LiveScannerSessionHubView
            sessionActive={sessionActive}
            setSessionActive={setSessionActive}
            sessionDate={sessionDate}
            setSessionDate={setSessionDate}
            sessionPeriod={sessionPeriod}
            setSessionPeriod={setSessionPeriod}
            selectedSubjectId={selectedSubjectId}
            setSelectedSubjectId={setSelectedSubjectId}
            lockdownActive={lockdownActive}
            setLockdownActive={locked => saveCampusPolicy({locked})}
            attendanceActive={attendanceActive}
            scannerBootActive={scannerBootActive}
            recognizedStudents={recognizedStudents}
            setRecognizedStudents={setRecognizedStudents}
            scanStatus={scanStatus}
            livenessStatus={livenessStatus}
            subjectLoadState={subjectLoadState}
            reloadSubjects={() => fetchSubjects(token)}
            subjects={subjects}
            setShowScannerModal={setShowScannerModal}
            setShowQrScannerModal={setShowQrScannerModal}
            setShowKioskModal={setShowKioskModal}
            setShowSmartCardModal={setShowSmartCardModal}
            setIsManualAttendanceOpen={setIsManualAttendanceOpen}
            setManualSubjectId={setManualSubjectId}
            setManualDate={setManualDate}
            setManualPeriod={setManualPeriod}
            setManualAttendanceData={setManualAttendanceData}
            setManualSearchQuery={setManualSearchQuery}
            stopAttendanceCam={stopAttendanceCam}
            shiftDate={shiftDate}
          />
        )}

        {activeTab === 'session-history' && (
          <SessionHistoryView
            selectedHistoryDept={selectedHistoryDept}
            setSelectedHistoryDept={setSelectedHistoryDept}
            selectedHistorySubjectId={selectedHistorySubjectId}
            setSelectedHistorySubjectId={setSelectedHistorySubjectId}
            historyFilterDate={historyFilterDate}
            setHistoryFilterDate={setHistoryFilterDate}
            historyFilterPeriod={historyFilterPeriod}
            setHistoryFilterPeriod={setHistoryFilterPeriod}
            sessionHistory={sessionHistory}
            subjects={subjects}
            toggleStudentSessionAttendance={toggleStudentSessionAttendance}
            shiftDate={shiftDate}
            getPeriodSlotLabel={getPeriodSlotLabel}
            isMobileView={isMobileView}
          />
        )}

        {activeTab === 'reports' && (
          <AttendanceReportsView
            reportStartDate={reportStartDate}
            setReportStartDate={setReportStartDate}
            reportEndDate={reportEndDate}
            setReportEndDate={setReportEndDate}
            reportDeptFilter={reportDeptFilter}
            setReportDeptFilter={setReportDeptFilter}
            selectedReportSubjectId={selectedReportSubjectId}
            setSelectedReportSubjectId={setSelectedReportSubjectId}
            reportData={reportData}
            isLoadingReport={isLoadingReport}
            departments={departments}
            subjects={subjects}
            stats={stats}
            fetchReport={fetchReport}
            printReport={printReport}
            shiftDate={shiftDate}
            reportAlertMsg={reportAlertMsg}
            setReportAlertMsg={setReportAlertMsg}
          />
        )}

        {activeTab === 'disputes' && (
          <AttendanceDisputesQueue 
            token={token} 
            currentUser={currentUser} 
            playCyberSound={playCyberSound} 
            onDisputeUpdated={async () => {
              await fetchLogs();
              await fetchStats();
            }}
          />
        )}

        {activeTab === 'face-review' && (
          <LowConfidenceReviewQueue 
            token={token} 
            currentUser={currentUser} 
            playCyberSound={playCyberSound} 
          />
        )}

        {activeTab === 'calendar' && (
          <AcademicCalendarView 
            token={token} 
            currentUser={currentUser} 
            playCyberSound={playCyberSound} 
          />
        )}

        {activeTab === 'devices' && (
          <DeviceHealthDashboard 
            token={token} 
            currentUser={currentUser} 
            playCyberSound={playCyberSound} 
          />
        )}

        {activeTab === 'interventions' && (
          <InterventionsManagementView 
            token={token} 
            currentUser={currentUser} 
            playCyberSound={playCyberSound} 
          />
        )}

        {activeTab === 'lms' && (
          <LmsSyncIntegrationView 
            token={token} 
            currentUser={currentUser} 
            playCyberSound={playCyberSound} 
          />
        )}

        {activeTab === 'payroll' && (
          <StaffPayrollView 
            token={token} 
            currentUser={currentUser} 
            playCyberSound={playCyberSound} 
          />
        )}

        {activeTab === 'broadcast' && (
          <CampusBroadcastCenterView
            token={token}
            currentUser={currentUser}
            userRole={userRole}
            playCyberSound={playCyberSound}
            triggerHaptic={triggerHaptic}
            institutionName={currentUser?.institution_name || 'Smart Attendance System'}
            onNavigateBack={handleNavigateBack}
          />
        )}

        {activeTab === 'settings' && (
          <div className="settings-section" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box' }}>
            {activeSubSetting === null ? (
              <SettingsDirectoryHub
                openTeachers={() => navigateToTab('teachers')}
                setActiveSubSetting={setSubSettingPreservingScroll}
                playCyberSound={playCyberSound}
                userRole={userRole}
                currentUser={currentUser}
                getActiveTenantSlug={getActiveTenantSlug}
                handleManualCheck={handleManualCheck}
                fetchAdminLeaves={fetchAdminLeaves}
                adminLeaveRequests={adminLeaveRequests}
                appVersion={APP_VERSION}
              />
            ) : (
              <div>
                {/* ===== MERGED SECURITY PERIMETER, GEOFENCING & EMERGENCY LOCKDOWN CONSOLE ===== */}
                {(activeSubSetting === 'geofencing' || activeSubSetting === 'ip' || activeSubSetting === 'lockdown') && userRole === 'admin' && (
                  <GeofenceSettings
                    policyMessage={policyMessage}
                    savingPolicy={savingPolicy}
                    userRole={userRole}
                    settingsGeoEnabled={settingsGeoEnabled}
                    setSettingsGeoEnabled={setSettingsGeoEnabled}
                    settingsLat={settingsLat}
                    setSettingsLat={setSettingsLat}
                    settingsLon={settingsLon}
                    setSettingsLon={setSettingsLon}
                    settingsRadius={settingsRadius}
                    setSettingsRadius={setSettingsRadius}
                    settingsIpEnabled={settingsIpEnabled}
                    setSettingsIpEnabled={setSettingsIpEnabled}
                    settingsIpRanges={settingsIpRanges}
                    setSettingsIpRanges={setSettingsIpRanges}
                    lockdownActive={lockdownActive}
                    setLockdownActive={locked => saveCampusPolicy({locked})}
                    isSavingSettings={isSavingSettings}
                    saveSystemSettings={saveSystemSettings}
                    settingsMessage={settingsMessage}
                    setSettingsMessage={setSettingsMessage}
                    settingsError={settingsError}
                    setSettingsError={setSettingsError}
                    addDiagnosticLog={addDiagnosticLog}
                    playCyberSound={playCyberSound}
                  />
                )}

            {/* ===== MERGED SYSTEM THEME, CYBER AUDIO & SYNTH EQUALIZER STUDIO ===== */}
            {(activeSubSetting === 'themes' || activeSubSetting === 'equalizer') && (
              <ThemeEqualizerSettings
                crtOverlayEnabled={crtOverlayEnabled}
                setCrtOverlayEnabled={setCrtOverlayEnabled}
                ambientHumActive={ambientHumActive}
                setAmbientHumActive={setAmbientHumActive}
              />
            )}

            {/* ===== PRODUCTIVITY & ENTERPRISE HUB (Lazy Loaded Modules) ===== */}
            <Suspense fallback={<div style={{ padding: '32px', textAlign: 'center', color: '#696358', fontSize: '0.9rem' }}><span style={{ display: 'inline-block', width: '18px', height: '18px', border: '2px solid #cfc8ba', borderTopColor: '#785927', borderRadius: '50%', animation: 'spin 0.6s linear infinite', marginRight: '8px', verticalAlign: 'middle' }}></span>Loading module...</div>}>
            {activeSubSetting === 'productivity' && (
              <>
                <AdvancedFeaturesHub
                  apiBaseUrl={API_BASE_URL}
                  token={token}
                  userRole={userRole}
                  currentUser={currentUser}
                />
                <div style={{ marginTop: '20px' }}>
                  <CameraSettingsPanel onChange={setCameraScanSettings} />
                </div>
              </>
            )}

            {activeSubSetting === 'exploration' && (
              <ExplorationLab
                isPremium={hasPremiumAccess}
                onApply={setExplorationSettings}
              />
            )}

            {activeSubSetting === 'futuristic' && (
              <FuturisticFeaturesHub
                apiBaseUrl={API_BASE_URL}
                token={token}
                userRole={userRole}
                currentUser={currentUser}
                isOwner={currentUser?.email?.trim()?.toLowerCase() === 'rajkishorock@gmail.com'}
                geofenceSettings={{
                  center_latitude: parseFloat(localStorage.getItem('geo_lat') || '0'),
                  center_longitude: parseFloat(localStorage.getItem('geo_lng') || '0'),
                  allowed_radius_meters: parseFloat(localStorage.getItem('geo_radius') || '200'),
                }}
                releaseSettings={{
                  betaActive: false,
                  updateActive: updateActiveFlag,
                  latestVersion: serverLatestVersion,
                }}
                onNavigateSettings={(sub) => setSubSettingPreservingScroll(sub)}
              />
            )}

            {/* ── CONSOLIDATED FEATURES FOLDER VIEW ─────────────────────────── */}
            {activeSubSetting === 'features_folder' && (
              <FeaturesDirectoryHub
                setActiveSubSetting={setActiveSubSetting}
                playCyberSound={playCyberSound}
                userRole={userRole}
              />
            )}

            {activeSubSetting === 'enterprise' && userRole !== 'student' && (
              <IndustryEnterpriseHub
                apiBaseUrl={API_BASE_URL}
                token={token}
                userRole={userRole}
                offlineQueueCount={getOfflineQueue().length}
                onOpenScanner={() => { setActiveTab('attendance'); setShowScannerModal(true); }}
              />
            )}

            {activeSubSetting === 'extreme' && (
              <ExtremeLevelHub
                apiBaseUrl={API_BASE_URL}
                token={token}
                userRole={userRole}
                students={students}
                onOpenSearch={() => setUniversalSearchOpen(true)}
              />
            )}

            {activeSubSetting === 'ideas150' && (
              <Ideas150Hub
                apiBaseUrl={API_BASE_URL}
                token={token}
                userRole={userRole}
              />
            )}

            {/* ── New 40 Features Hub ───────────────────────────────────────── */}
            {activeSubSetting === 'new_features' && (
              <NewFeaturesHub
                apiBaseUrl={API_BASE_URL}
                token={token}
                userRole={userRole}
              />
            )}

            {/* ── Wellness + Counselor Panel ────────────────────────────────── */}
            {activeSubSetting === 'wellness' && (
              <WellnessCounselorPanel
                apiBaseUrl={API_BASE_URL}
                user={currentUser}
                token={token}
                userRole={userRole}
                students={students}
              />
            )}

            {/* ── AR + Gamification Portal ──────────────────────────────────── */}
            {activeSubSetting === 'ar_gamification' && (
              <ARGamificationPortal
                apiBaseUrl={API_BASE_URL}
                user={currentUser}
                token={token}
                userRole={userRole}
                institutionId={currentUser?.institution_id}
                students={students}
              />
            )}

            {(activeSubSetting === 'features7' || activeSubSetting === 'enterprise7') && (
              <Enterprise7FeaturesHub
                apiBaseUrl={API_BASE_URL}
                token={token}
                userRole={userRole}
                students={students}
                onMsg={(msg) => console.log('[EnterpriseHub Msg]', msg)}
              />
            )}

            {activeSubSetting === 'premium' && userRole === 'admin' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <PremiumUpgradeHub
                  apiBaseUrl={API_BASE_URL}
                  token={token}
                  currentUser={currentUser}
                  onPlanActivated={(plan) => setSubscriptionPlan(plan)}
                />
                <p style={{ color: '#696358', fontSize: '0.82rem', margin: 0 }}>
                  Premium grant/revoke ke liye Futuristic Hub → Premium Control tab use karein.
                </p>
              </div>
            )}
            </Suspense>

            {activeSubSetting === 'app_version' && (
              <AppVersionSettings
                currentUser={currentUser}
                userRole={userRole}
                serverLatestVersion={serverLatestVersion}
                updateActiveFlag={updateActiveFlag}
                handleManualCheck={handleManualCheck}
                setUpdateAvailable={setUpdateAvailable}
                setUpdateDismissed={setUpdateDismissed}
                playCyberSound={playCyberSound}
                setActiveSubSetting={setActiveSubSetting}
              />
            )}

            {/* ===== ADVANCED SYSTEM CONFIG & EXTREME SECURITY CONSOLE ===== */}
            {activeSubSetting === 'advanced' && (
              <AdvancedBiometricSettings
                biometricConfidenceFilterEnabled={biometricConfidenceFilterEnabled}
                setBiometricConfidenceFilterEnabled={setBiometricConfidenceFilterEnabled}
                biometricMatchThreshold={biometricMatchThreshold}
                setBiometricMatchThreshold={setBiometricMatchThreshold}
                antiSpoofingThreshold={antiSpoofingThreshold}
                setAntiSpoofingThreshold={setAntiSpoofingThreshold}
                livenessBypass={livenessBypass}
                setLivenessBypass={setLivenessBypass}
                aiCognitiveLevel={aiCognitiveLevel}
                setAiCognitiveLevel={setAiCognitiveLevel}
                diagnosticLevel={diagnosticLevel}
                setDiagnosticLevel={setDiagnosticLevel}
                userRole={userRole}
                playCyberSound={playCyberSound}
                savingPolicy={savingPolicy}
                policyMessage={policyMessage}
                onSavePolicy={() => saveCampusPolicy({
                  similarity: biometricMatchThreshold,
                  blink_ear: antiSpoofingThreshold,
                  strict_liveness: !livenessBypass,
                  confidence_filter: biometricConfidenceFilterEnabled
                })}
              />
            )}

            {/* ===== ADMIN ACCOUNT PROFILE SECTION ===== */}
            {activeSubSetting === 'profile' && (
              <AdminProfileSettings
                token={token}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                isDemoMode={isDemoMode}
                userRole={userRole}
                playCyberSound={playCyberSound}
                handleLogout={handleLogout}
                onNavigate={navigateToTab}
              />
            )}

            {/* ===== ADMIN ACCOUNT REGISTRATION SECTION ===== */}
            {activeSubSetting === 'admins' && userRole === 'admin' && (
              <AdminUserManagement
                token={token}
                currentUser={currentUser}
                isDemoMode={isDemoMode}
                playCyberSound={playCyberSound}
                teachers={teachers}
                fetchTeachers={fetchTeachers}
                requestMasterPassword={requestMasterPassword}
                routeView={settingsDetailRoute?.sub === 'admins' ? settingsDetailRoute : null}
                setRouteView={setSettingsDetailRoute}
                onCloseSubView={handleNavigateBack}
              />
            )}

            {/* DEPARTMENTS MANAGEMENT VIEW */}
            {activeSubSetting === 'departments' && userRole === 'admin' && (
              <DepartmentSettings
                token={token}
                isDemoMode={isDemoMode}
                playCyberSound={playCyberSound}
                departments={departments}
                departmentsList={departmentsList}
                students={students}
                subjects={subjects}
                fetchDepartments={async () => { clearApiClientCache(); await Promise.all([fetchDepartments(), fetchSubjects()]); }}
                requestMasterPassword={requestMasterPassword}
                routeView={settingsDetailRoute?.sub === 'departments' ? settingsDetailRoute : null}
                setRouteView={setSettingsDetailRoute}
                onCloseSubView={handleNavigateBack}
              />
            )}

            {/* MULTI-TENANT INSTITUTION MANAGEMENT (Only visible on DEFAULT tenant to system owner) */}
            {activeSubSetting === 'multitenant' && getActiveTenantSlug() === 'default' && currentUser?.institution_id === 1 && (
              <InstitutionManagement
                token={token}
                isDemoMode={isDemoMode}
                playCyberSound={playCyberSound}
                requestMasterPassword={requestMasterPassword}
                routeView={settingsDetailRoute?.sub === 'multitenant' ? settingsDetailRoute : null}
                setRouteView={setSettingsDetailRoute}
                onCloseSubView={handleNavigateBack}
              />
            )}

            {/* LEAVE MANAGEMENT SUB-VIEW */}
            {activeSubSetting === 'leave_management' && (
              <LeaveManagementSettings
                token={token}
                playCyberSound={playCyberSound}
                adminLeaveRequests={adminLeaveRequests}
                isFetchingLeaves={isFetchingLeaves}
                fetchAdminLeaves={fetchAdminLeaves}
                routeView={settingsDetailRoute?.sub === 'leave_management' ? settingsDetailRoute : null}
                setRouteView={setSettingsDetailRoute}
                onCloseSubView={handleNavigateBack}
              />
            )}

            {/* SYSTEM RELEASE UPDATES (Visible to Admins and System Owner) */}
            {activeSubSetting === 'release_updates' && (userRole === 'admin' || currentUser?.email?.trim()?.toLowerCase() === 'rajkishorock@gmail.com') && (
              <ReleaseSettings
                token={token}
                userRole={userRole}
                isDemoMode={isDemoMode}
                playCyberSound={playCyberSound}
                addDiagnosticLog={addDiagnosticLog}
              />
            )}

          </div>
        )}
      </div>
    )}

        {activeTab === 'student-attendance' && (
          <StudentAttendanceDashboardView
            studentLogs={studentLogs}
            studentSubjectStats={studentSubjectStats}
            blueprintData={blueprintData}
            blueprintLoading={blueprintLoading}
            selectedBlueprintSubject={selectedBlueprintSubject}
            setSelectedBlueprintSubject={setSelectedBlueprintSubject}
            blueprintCalendarDate={blueprintCalendarDate}
            setBlueprintCalendarDate={setBlueprintCalendarDate}
            geofenceStatus={geofenceStatus}
            setGeofenceStatus={setGeofenceStatus}
            studentLeaveRequests={studentLeaveRequests}
            token={token}
            API_BASE_URL={API_BASE_URL}
            subjects={subjects}
            fetchBlueprint={fetchBlueprint}
            fetchStudentLeaves={fetchStudentLeaves}
            exportToCSV={exportToCSV}
            setShowVirtualId={setShowVirtualId}
            setShowDisputeModal={setShowDisputeModal}
            setDisputePrefillSession={setDisputePrefillSession}
            setShowFeedbackModal={setShowFeedbackModal}
            showBlueprintDayModal={showBlueprintDayModal}
            setShowBlueprintDayModal={setShowBlueprintDayModal}
            blueprintDayModalDate={blueprintDayModalDate}
            setBlueprintDayModalDate={setBlueprintDayModalDate}
            appLang={appLang}
            onNavigateToCalendar={() => { setActiveTab('calendar'); playCyberSound('click'); }}
            onNavigateTab={navigateToTab}
          />
        )}

        {activeTab === 'student-profile' && (
          <StudentProfileView
            setEditingStudentSelf={setEditingStudentSelf}
            setEditStudentSelfError={setEditStudentSelfError}
            setEditStudentSelfSuccess={setEditStudentSelfSuccess}
            setShowEditStudentSelfModal={setShowEditStudentSelfModal}
            setEditingTeacherSelf={setEditingTeacherSelf}
            setEditTeacherSelfError={setEditTeacherSelfError}
            setEditTeacherSelfSuccess={setEditTeacherSelfSuccess}
            setShowEditTeacherSelfModal={setShowEditTeacherSelfModal}
            studentVideoRef={studentVideoRef}
            studentCanvasRef={studentCanvasRef}
            studentWebcamActive={studentWebcamActive}
            studentWebcamBootActive={studentWebcamBootActive}
            startStudentWebcam={startStudentWebcam}
            stopStudentWebcam={stopStudentWebcam}
            handleStudentWebcamCapture={handleStudentWebcamCapture}
            handleStudentFileSelect={handleStudentFileSelect}
            handleStudentWebcamBootComplete={handleStudentWebcamBootComplete}
            isUploadingSelfie={isUploadingSelfie}
            selfieError={selfieError}
            selfieSuccess={selfieSuccess}
            hudMetrics={hudMetrics}
            oldPassword={oldPassword}
            setOldPassword={setOldPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            passwordChangeError={passwordChangeError}
            passwordChangeSuccess={passwordChangeSuccess}
            isChangingPassword={isChangingPassword}
            handleChangePassword={handleChangePassword}
            token={token}
            API_BASE_URL={API_BASE_URL}
          />
        )}

        {activeTab === 'ai-assistant' && (
          <CyberBotWidget activeTab={activeTab} />
        )}

        {(activeTab === 'control' || activeTab === 'all-features') && (
          <ControlCenterView
            userRole={userRole}
            currentUser={currentUser}
            onNavigate={navigateToTab}
            onLogout={handleLogout}
            playCyberSound={playCyberSound}
            triggerHaptic={triggerHaptic}
            appVersion={APP_VERSION}
          />
        )}
      </main>

      {/* Dedicated student edit & registration pages now render inline inside StudentsDirectoryView */}

      {/* Edit Student Self Modal */}
      {showEditStudentSelfModal && editingStudentSelf && (
        <div className="modal-overlay" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 100050, overflowY: 'auto', padding: '40px 16px', display: 'block' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '32px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px', color: '#25231f' }}>Edit Profile Information</h3>
            
            {editStudentSelfError && (
              <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem', marginBottom: '20px' }}>
                <AlertCircle size={16} />
                <span>{editStudentSelfError}</span>
              </div>
            )}

            {editStudentSelfSuccess && (
              <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#10b981', fontSize: '0.875rem', marginBottom: '20px' }}>
                <CheckCircle2 size={16} />
                <span>{editStudentSelfSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStudentSelf}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editingStudentSelf.name}
                  onChange={e => setEditingStudentSelf({...editingStudentSelf, name: e.target.value})}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingStudentSelf.phone}
                    onChange={e => setEditingStudentSelf({...editingStudentSelf, phone: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select 
                    className="form-input"
                    value={editingStudentSelf.gender}
                    onChange={e => setEditingStudentSelf({...editingStudentSelf, gender: e.target.value})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 15/08/2005"
                    value={editingStudentSelf.dob}
                    onChange={e => setEditingStudentSelf({...editingStudentSelf, dob: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Home Address</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editingStudentSelf.address}
                  onChange={e => setEditingStudentSelf({...editingStudentSelf, address: e.target.value})}
                />
              </div>

              {/* Biometric Self-Enrollment Buttons for Student */}
              <div style={{ marginTop: '24px', padding: '18px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a78bfa' }}>
                    🧬 My Biometric Profile Setup (Face ID)
                  </span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(167, 139, 250, 0.2)', color: '#c4b5fd', padding: '2px 8px', borderRadius: '8px' }}>
                    SELF-SERVICE BIOMETRICS
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setShowEditStudentSelfModal(false); navigateToTab('attendance'); playCyberSound('click'); }}
                    style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    📸 Scan & Register Face
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '32px' }}>
                <button type="button" onClick={() => { setShowEditStudentSelfModal(false); }} className="btn-secondary" style={{ padding: '12px 24px', borderRadius: '8px' }}>
                  Cancel
                </button>
                <button type="submit" className="bg-gradient-btn" style={{ padding: '12px 32px', borderRadius: '8px', fontWeight: 600 }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Teacher/Admin Self Modal */}
      {showEditTeacherSelfModal && editingTeacherSelf && (
        <div className="modal-overlay" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 100050, overflowY: 'auto', padding: '40px 16px', display: 'block' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '32px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '24px', color: '#25231f' }}>Edit Profile Information</h3>
            
            {editTeacherSelfError && (
              <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem', marginBottom: '20px' }}>
                <AlertCircle size={16} />
                <span>{editTeacherSelfError}</span>
              </div>
            )}

            {editTeacherSelfSuccess && (
              <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#10b981', fontSize: '0.875rem', marginBottom: '20px' }}>
                <CheckCircle2 size={16} />
                <span>{editTeacherSelfSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateTeacherSelf}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editingTeacherSelf.name}
                  onChange={e => setEditingTeacherSelf({...editingTeacherSelf, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={editingTeacherSelf.email}
                  onChange={e => setEditingTeacherSelf({...editingTeacherSelf, email: e.target.value})}
                  required
                />
              </div>

              {userRole === 'teacher' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    <div className="form-group">
                      <label className="form-label">Assigned Subject Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editingTeacherSelf.subject_name}
                        onChange={e => setEditingTeacherSelf({...editingTeacherSelf, subject_name: e.target.value})}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Subject Code</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={editingTeacherSelf.subject_code}
                        onChange={e => setEditingTeacherSelf({...editingTeacherSelf, subject_code: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '20px' }}>
                    <label className="form-label">Subject Department</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={editingTeacherSelf.subject_department}
                      onChange={e => setEditingTeacherSelf({...editingTeacherSelf, subject_department: e.target.value})}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '32px' }}>
                <button type="button" onClick={() => { setShowEditTeacherSelfModal(false); }} className="btn-secondary" style={{ padding: '12px 24px', borderRadius: '8px' }}>
                  Cancel
                </button>
                <button type="submit" className="bg-gradient-btn" style={{ padding: '12px 32px', borderRadius: '8px', fontWeight: 600 }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Webcam Capture Modal */}
      {showWebcamModal && captureStudent && (
        <div className="enroll-overlay">
          <section className="enroll-camera" role="dialog" aria-modal="true" aria-labelledby="enroll-heading">
            <header><div><h2 id="enroll-heading">Register face</h2><p>{captureStudent.name} · {captureStudent.roll}</p></div>
              <button type="button" aria-label="Close camera" disabled={isCapturing} onClick={closeWebcamModal}><X size={20} /></button>
            </header>
            <div className="enroll-preview">
              <video ref={videoRef} autoPlay playsInline muted onPlaying={() => {
                if (videoRef.current?.srcObject && streamRef.current === videoRef.current.srcObject) {
                  setWebcamBootActive(false);
                  setWebcamActive(true);
                }
              }} />
              {webcamActive && <div className="enroll-guide" aria-hidden="true" />}
              <canvas ref={canvasRef} hidden />
            </div>
            <footer>
              <p role="status">{webcamError || (isCapturing ? 'Registering face…' : webcamBootActive ? 'Opening camera…' : webcamActive ? 'Center your face in the frame and look at the camera.' : 'Camera unavailable.')}</p>
              <button type="button" className="btn-primary" disabled={isCapturing || webcamBootActive}
                onClick={webcamActive ? startCaptureProcess : startWebcam}>
                {webcamActive ? 'Register face' : webcamBootActive ? 'Opening camera…' : 'Retry camera'}
              </button>
            </footer>
          </section>
        </div>
      )}


      {/* Training Status Overlay */}
      {isTraining && (
        <div className="flex-center modal-overlay" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 100050, flexDirection: 'column', gap: '24px' }}>
          <div style={{ width: '64px', height: '64px', border: '4px solid rgba(16,185,129,0.1)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h3 className="text-gradient" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '1.5rem', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
            {trainMessage}
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Scanning datasets, preprocessing images and retraining classifier.xml...</p>
        </div>
      )}





      {/* Attendance Dispute Modal (Phase 2) */}
      <AttendanceDisputeModal
        isOpen={showDisputeModal}
        onClose={() => {
          setShowDisputeModal(false);
          setDisputePrefillSession(null);
        }}
        token={token}
        currentUser={currentUser}
        subjects={subjects}
        prefillSession={disputePrefillSession}
        playCyberSound={playCyberSound}
        API_BASE_URL={API_BASE_URL}
      />

      {/* Multi-Sample Face Enrollment Modal (Phase 7) */}
      <FaceEnrollmentModal
        isOpen={showFaceEnrollModal}
        onClose={() => {
          setShowFaceEnrollModal(false);
          setFaceEnrollStudent(null);
        }}
        student={faceEnrollStudent}
        token={token}
        playCyberSound={playCyberSound}
        onEnrollmentSuccess={() => {
          if (typeof fetchStudents === 'function') fetchStudents();
        }}
      />

      {/* Biometric Fallback System Modal (Phase 9) */}
      <BiometricFallbackModal
        isOpen={showFallbackModal}
        onClose={() => setShowFallbackModal(false)}
        token={token}
        currentUser={currentUser}
        subjects={subjects}
        playCyberSound={playCyberSound}
      />

      {/* Feedback Submission Modal */}
      <FeedbackModal feedbackState={feedbackState} />



      {/* Floating Siri-style Dynamic Orb Voice Assistant */}
      {token && isVoiceAssistantMode && (
        <div style={{ position: 'fixed', bottom: '90px', right: '24px', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Glowing holographic soundwave circles */}
          <div style={{
            position: 'absolute',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: `1.5px solid ${isListeningSpeech ? '#ef4444' : '#00f2fe'}`,
            opacity: 0.6,
            animation: 'radarWave 1.6s infinite linear'
          }} />
          <div style={{
            position: 'absolute',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: `1px solid ${isListeningSpeech ? '#ef4444' : '#00f2fe'}`,
            opacity: 0.4,
            animation: 'radarWave 1.6s infinite linear',
            animationDelay: '0.8s'
          }} />
          {/* Wave visualizer lines */}
          <div style={{
            position: 'absolute',
            display: 'flex',
            gap: '2px',
            alignItems: 'center',
            justifyContent: 'center',
            width: '50px',
            height: '20px',
            pointerEvents: 'none'
          }}>
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                style={{
                  width: '2px',
                  height: '4px',
                  background: isListeningSpeech ? '#ef4444' : '#00f2fe',
                  borderRadius: '1px',
                  boxShadow: `0 0 6px ${isListeningSpeech ? '#ef4444' : '#00f2fe'}`,
                  animation: 'orbPulse 1.2s infinite ease-in-out',
                  animationDelay: `${i * 0.15}s`
                }} 
              />
            ))}
          </div>
          
          <div 
            onClick={stopVoiceAssistantMode}
            className={`floating-voice-orb ${isListeningSpeech ? 'listening' : 'processing'}`}
            title="Click to stop Voice Assistant"
            style={{
              position: 'relative',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              cursor: 'pointer',
              boxShadow: isListeningSpeech 
                ? '0 0 15px #ef4444, inset 0 0 5px rgba(255, 255, 255, 0.5)' 
                : '0 0 15px #00f2fe, inset 0 0 5px rgba(255, 255, 255, 0.5)',
              background: isListeningSpeech ? '#ef4444' : '#00f2fe',
              animation: 'orbPulse 1.5s infinite ease-in-out',
              transition: 'all 0.3s ease'
            }}
          />
        </div>
      )}

      <MobileControlPanel
        open={mobileControlOpen}
        onClose={() => setMobileControlOpen(false)}
        userRole={userRole}
        activeTab={activeTab}
        onNavigate={navigateToTab}
        onLogout={handleLogout}
      />

      <ConsentModal
        open={showConsentModal && !!token}
        onAccept={handleConsentAccept}
        onDecline={() => setShowConsentModal(false)}
      />
      {token && (
        <UniversalSearch
          apiBaseUrl={API_BASE_URL}
          token={token}
          open={universalSearchOpen}
          onClose={() => setUniversalSearchOpen(false)}
          onNavigate={handleUniversalSearchNavigate}
        />
      )}
      {showPrivacyPolicy && <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />}

      {token && userRole && (
        <BottomNav
          userRole={userRole}
          activeTab={activeTab}
          onNavigate={navigateToTab}
          onScanPress={handleBottomScan}
          onMorePress={() => {
            navigateToTab('control');
          }}
        />
      )}

      {/* Enterprise 'About System' Modal — Clean White UI */}
      {isAboutModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '92%',
            background: '#ffffff',
            border: '1px solid #e4dfd5',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #faf9f6 0%, #f4f1eb 100%)',
              borderBottom: '1px solid #e4dfd5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #785927, #89662e)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#25231f',
                    margin: 0,
                    letterSpacing: '-0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {displayInstitutionName}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: '#faf5ea',
                      color: '#785927',
                      border: '1px solid #dfcfaf'
                    }}>
                      v2.5 Enterprise
                    </span>
                  </h2>
                  <div style={{ fontSize: '0.78rem', color: '#696358', marginTop: '2px' }}>
                    Next-Gen AI Biometric & Geofencing Platform
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { playCyberSound('click'); setIsAboutModalOpen(false); }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e4dfd5',
                  color: '#696358',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content Body */}
            <div style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxHeight: '62vh',
              overflowY: 'auto'
            }}>
              {/* Feature Cards Grid */}
              <div style={{
                background: '#faf9f6',
                border: '1px solid #e4dfd5',
                borderRadius: '12px',
                padding: '14px 16px'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#785927', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ScanFace size={14} /> Biometric AI Architecture
                </div>
                <div style={{ fontSize: '0.85rem', color: '#46423b', lineHeight: 1.55 }}>
                  Powered by <strong>FaceNet Deep Neural Networks</strong> with 512-dimensional facial embeddings, <strong>MTCNN landmark alignment</strong>, and active <strong>Eye Aspect Ratio (EAR)</strong> anti-spoofing liveness verification.
                </div>
              </div>

              <div style={{
                background: '#faf9f6',
                border: '1px solid #e4dfd5',
                borderRadius: '12px',
                padding: '14px 16px'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Globe size={14} /> Perimeter & Security Protocols
                </div>
                <div style={{ fontSize: '0.85rem', color: '#46423b', lineHeight: 1.55 }}>
                  Enforced <strong>GPS Geofencing</strong> (100m campus boundary radius), campus Wi-Fi IP subnet whitelisting, hardware device signature binding, and tamper-proof attendance registers.
                </div>
              </div>

              <div style={{
                background: '#faf9f6',
                border: '1px solid #e4dfd5',
                borderRadius: '12px',
                padding: '14px 16px'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bot size={14} /> Neural Assistant Intelligence
                </div>
                <div style={{ fontSize: '0.85rem', color: '#46423b', lineHeight: 1.55 }}>
                  Integrated <strong>ChatGPT & Gemini Pro</strong> multi-tier intelligence providing instant assistance for academic inquiries, coding, mathematics, leave management, and automated schedule tracking.
                </div>
              </div>

              {/* Technical Specifications Spec-Sheet */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
                fontSize: '0.8rem'
              }}>
                <div style={{ padding: '10px 12px', background: '#ffffff', border: '1px solid #e4dfd5', borderRadius: '10px' }}>
                  <div style={{ color: '#696358', fontSize: '0.72rem', fontWeight: 600 }}>FRONTEND ENGINE</div>
                  <div style={{ color: '#25231f', fontWeight: 700, marginTop: '2px' }}>React 18 • WebGL • PWA / APK</div>
                </div>
                <div style={{ padding: '10px 12px', background: '#ffffff', border: '1px solid #e4dfd5', borderRadius: '10px' }}>
                  <div style={{ color: '#696358', fontSize: '0.72rem', fontWeight: 600 }}>BACKEND RUNTIME</div>
                  <div style={{ color: '#25231f', fontWeight: 700, marginTop: '2px' }}>FastAPI • SQLAlchemy • Python 3.12</div>
                </div>
                <div style={{ padding: '10px 12px', background: '#ffffff', border: '1px solid #e4dfd5', borderRadius: '10px' }}>
                  <div style={{ color: '#696358', fontSize: '0.72rem', fontWeight: 600 }}>ACTIVE DEPLOYMENT</div>
                  <div style={{ color: '#25231f', fontWeight: 700, marginTop: '2px' }}>v{APP_VERSION} Stable Build</div>
                </div>
                <div style={{ padding: '10px 12px', background: '#ffffff', border: '1px solid #e4dfd5', borderRadius: '10px' }}>
                  <div style={{ color: '#696358', fontSize: '0.72rem', fontWeight: 600 }}>DATA PERSISTENCE</div>
                  <div style={{ color: '#25231f', fontWeight: 700, marginTop: '2px' }}>SQLite / PostgreSQL DB</div>
                </div>
              </div>

              {/* Developer & Credits Banner */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #faf5ea 0%, #f5f3ff 100%)',
                border: '1px solid #f2e7d1',
                borderRadius: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#696358', fontWeight: 600, textTransform: 'uppercase' }}>ENGINEERED & DEVELOPED BY</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#61471e', letterSpacing: '0.02em', marginTop: '1px' }}>RAJKISHOR</div>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#785927', background: '#ffffff', padding: '4px 10px', borderRadius: '20px', border: '1px solid #dfcfaf' }}>
                  Lead Architect
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              background: '#faf9f6',
              borderTop: '1px solid #f4f1eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                © 2026 Smart Attendance System
              </span>
              <button
                type="button"
                onClick={() => { playCyberSound('click'); setIsAboutModalOpen(false); }}
                style={{
                  padding: '8px 22px',
                  borderRadius: '10px',
                  background: '#785927',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                  transition: 'background 0.15s'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Red Hazard Threat Lockdown HUD Overlay */}
      {lockdownActive && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(239, 68, 68, 0.07)',
          pointerEvents: 'none',
          zIndex: 9999,
          border: '4px solid #ef4444',
          boxShadow: 'inset 0 0 35px rgba(239, 68, 68, 0.4)',
          animation: 'lockdownPulseBorder 1.8s infinite ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px',
          boxSizing: 'border-box',
          fontFamily: 'monospace'
        }}>
          <style>{`
            @keyframes lockdownPulseBorder {
              0%, 100% { border-color: rgba(239, 68, 68, 0.85); box-shadow: inset 0 0 35px rgba(239, 68, 68, 0.4); }
              50% { border-color: rgba(239, 68, 68, 0.35); box-shadow: inset 0 0 15px rgba(239, 68, 68, 0.15); }
            }
          `}</style>
          
          {/* Top bracket warning overlay */}
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold' }}>
            <div>[SECURITY STATUS: CLASSIFIED_LOCKDOWN]</div>
            <div>[THREAT LEVEL: CRITICAL]</div>
          </div>

          {/* Center warning banner */}
          <div style={{
            alignSelf: 'center',
            background: '#ef4444',
            color: '#fff',
            padding: '12px 28px',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            borderRadius: '4px',
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.65)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            letterSpacing: '2px'
          }}>
            <span style={{ animation: 'pulse 1s infinite' }}>⚠️</span>
            <span>WARNING: SECURITY LOCKDOWN ENGAGED</span>
            <span style={{ animation: 'pulse 1s infinite' }}>⚠️</span>
          </div>

          {/* Bottom bracket logs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold' }}>
            <div>[SYS_STATE: GATE_LOCKS_ACTIVE]</div>
            <div>[BEACONS: TRUNCATED_OFFLINE]</div>
          </div>
        </div>
      )}



      {/* Masked Password Prompt Modal */}
      {masterKeyPrompt.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 8, 16, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '420px',
            width: '100%',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            animation: 'fadeInUp 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                color: '#ef4444', 
                width: '40px', 
                height: '40px', 
                borderRadius: '10px', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center' 
              }}>
                <Lock size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#25231f' }}>
                {masterKeyPrompt.title}
              </h3>
            </div>
            
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#58534a', lineHeight: '1.5' }}>
              {masterKeyPrompt.message}
            </p>
            
            <input 
              type="password"
              className="form-input"
              placeholder="••••••••••••"
              autoFocus
              value={masterKeyPrompt.value}
              onChange={(e) => setMasterKeyPrompt(prev => ({ ...prev, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  masterKeyPrompt.onConfirm(masterKeyPrompt.value);
                  setMasterKeyPrompt({ isOpen: false, title: '', message: '', value: '', onConfirm: null, onCancel: null });
                }
              }}
              style={{
                width: '100%',
                background: '#ffffff',
                border: '1.5px solid #e4dfd5',
                color: '#25231f',
                padding: '12px 16px',
                boxSizing: 'border-box',
                fontSize: '0.95rem',
                borderRadius: '10px'
              }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => {
                  if (masterKeyPrompt.onCancel) masterKeyPrompt.onCancel();
                  setMasterKeyPrompt({ isOpen: false, title: '', message: '', value: '', onConfirm: null, onCancel: null });
                }}
                className="btn-secondary"
                style={{ padding: '10px 20px', borderRadius: '8px' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  masterKeyPrompt.onConfirm(masterKeyPrompt.value);
                  setMasterKeyPrompt({ isOpen: false, title: '', message: '', value: '', onConfirm: null, onCancel: null });
                }}
                className="action-btn"
                style={{ padding: '10px 24px', borderRadius: '8px' }}
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MANUAL ATTENDANCE MODAL ===== */}
      {isManualAttendanceOpen && (
        <div className="register-page">
          <div className="register-sheet">
            {manualFeedback && <p role="status" className="register-feedback">{manualFeedback}</p>}
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e4dfd5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#faf9f6',
              flexShrink: 0
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#25231f', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ✋ Manual Attendance Register
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#696358', lineHeight: 1.4 }}>
                  Subject: <strong style={{ color: 'var(--color-primary)' }}>{subjects.find(s => s.id === parseInt(manualSubjectId))?.name || (subjects && subjects[0]?.name) || 'General Attendance'}</strong> • Slot: <strong>{manualPeriod}</strong> • Date: <strong>{manualDate}</strong>
                </p>
              </div>
              <button
                onClick={() => { playCyberSound('click'); setIsManualAttendanceOpen(false); }}
                style={{ background: 'transparent', border: 'none', color: '#696358', fontSize: '1.5rem', cursor: 'pointer', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#25231f'}
                onMouseLeave={e => e.currentTarget.style.color = '#696358'}
              >
                ✕
              </button>
            </div>

            {/* Quick Session Selectors: Subject, Slot, Date */}
            <div style={{
              padding: '10px 16px',
              background: '#f4f1eb',
              borderBottom: '1px solid #e4dfd5',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '8px',
              alignItems: 'center'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#696358', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Subject / Class
                </label>
                <select
                  value={manualSubjectId || (subjects && subjects.length > 0 ? String(subjects[0].id) : '')}
                  onChange={e => {
                    setManualSubjectId(e.target.value);
                    setSelectedSubjectId(e.target.value);
                    setManualFeedback('');
                  }}
                  className="form-input"
                  style={{ width: '100%', height: '36px', background: '#ffffff', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, padding: '0 8px' }}
                >
                  {subjects && subjects.length > 0 ? (
                    subjects.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.name} ({s.code || s.id})</option>
                    ))
                  ) : (
                    <option value="">No subjects configured</option>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#696358', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Timetable Slot
                </label>
                <select
                  value={manualPeriod}
                  onChange={e => {
                    setManualPeriod(e.target.value);
                    setSessionPeriod(e.target.value);
                    setManualFeedback('');
                  }}
                  className="form-input"
                  style={{ width: '100%', height: '36px', background: '#ffffff', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, padding: '0 8px' }}
                >
                  <option value="Period 1">Period 1 (09:00 - 10:00)</option>
                  <option value="Period 2">Period 2 (10:00 - 11:00)</option>
                  <option value="Period 3">Period 3 (11:15 - 12:15)</option>
                  <option value="Period 4">Period 4 (12:15 - 01:15)</option>
                  <option value="Period 5">Period 5 (02:00 - 03:00)</option>
                  <option value="Period 6">Period 6 (03:00 - 04:00)</option>
                  <option value="Period 7">Period 7 (04:00 - 05:00)</option>
                  <option value="Period 8">Period 8 (05:00 - 06:00)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#696358', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Session Date
                </label>
                <input
                  type="date"
                  max={getLocalDateString()}
                  value={manualDate}
                  onChange={e => {
                    const nextDate = e.target.value;
                    const todayStr = getLocalDateString();
                    if (nextDate && nextDate > todayStr) {
                      setManualDate(todayStr);
                      setSessionDate(todayStr);
                      setManualFeedback('Future date cannot be selected — this date has not arrived yet.');
                      playCyberSound('error');
                      return;
                    }
                    setManualDate(nextDate);
                    setSessionDate(nextDate);
                    setManualFeedback('');
                  }}
                  className="form-input"
                  style={{ width: '100%', height: '36px', background: '#ffffff', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, padding: '0 8px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Search input & Scan Virtual ID Button */}
            <div style={{ padding: '16px 28px 8px', flexShrink: 0, display: 'flex', gap: '10px', flexWrap: 'wrap', background: '#ffffff' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Search student name or roll number..."
                  value={manualSearchQuery}
                  onChange={e => setManualSearchQuery(e.target.value)}
                  style={{ background: '#ffffff', border: '1.5px solid #e4dfd5', color: '#25231f', paddingLeft: '16px', width: '100%', borderRadius: '10px' }}
                />
              </div>
              <button
                onClick={() => {
                  setIsManualAttendanceOpen(false);
                  setShowQrScannerModal(true);
                  playCyberSound('click');
                }}
                type="button"
                className="btn-secondary active-haptic"
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #dfcfaf',
                  color: '#785927',
                  background: '#faf5ea',
                  cursor: 'pointer'
                }}
              >
                🪪 Scan Virtual ID
              </button>
            </div>

            {/* Students Register List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 28px 16px', minHeight: 0, background: '#ffffff' }}>
              {(() => {
                const activeManualSubId = manualSubjectId || (subjects && subjects.length > 0 ? String(subjects[0].id) : '');
                const selectedSubject = subjects.find(sub => sub.id === parseInt(activeManualSubId, 10));
                const subjectDept = selectedSubject ? selectedSubject.department : '';
                const classStudents = students.filter(s => {
                  const matchesDept = !subjectDept || departmentsMatch(s.dep || s.department, subjectDept);
                  const matchesSearch = !manualSearchQuery ||
                    s.name.toLowerCase().includes(manualSearchQuery.toLowerCase()) ||
                    s.roll.toLowerCase().includes(manualSearchQuery.toLowerCase());
                  return matchesDept && matchesSearch;
                });

                if (classStudents.length === 0) {
                  return (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#696358' }}>
                      No students found {subjectDept ? `in department: ${subjectDept}` : ''}.
                    </div>
                  );
                }

                return classStudents.map((student, idx) => {
                  const stateData = manualAttendanceData[student.id] || { status: 'Present', remarks: '' };
                  const statusColor = stateData.status === 'Present' ? '#10b981' : stateData.status === 'Late' ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={student.id} style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      background: '#ffffff',
                      border: '1px solid #e4dfd5',
                      borderLeft: `4px solid ${statusColor}`,
                      borderRadius: '10px',
                      padding: '10px 14px',
                      animation: `fadeInUp 0.25s ease both ${idx * 20}ms`
                    }}>
                      {/* Name & Roll */}
                      <div style={{ flex: '1', minWidth: '160px' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#25231f' }}>{student.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#696358', fontFamily: 'monospace' }}>Roll: {student.roll} • {student.dep}</div>
                      </div>

                      {/* Status Toggle buttons */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['Present', 'Late', 'Absent'].map(status => {
                          const isSelected = stateData.status === status;
                          let selectedStyle = {};
                          if (isSelected) {
                            if (status === 'Present') selectedStyle = { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' };
                            else if (status === 'Late') selectedStyle = { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' };
                            else selectedStyle = { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
                          }
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => {
                                setManualAttendanceData(prev => ({
                                  ...prev,
                                  [student.id]: { ...stateData, status }
                                }));
                              }}
                              style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                background: '#faf9f6',
                                color: '#696358',
                                border: '1px solid #e4dfd5',
                                ...(isSelected ? selectedStyle : {})
                              }}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>

                      {/* Remarks Input */}
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Note (optional)"
                        value={stateData.remarks}
                        onChange={e => {
                          setManualAttendanceData(prev => ({
                            ...prev,
                            [student.id]: { ...stateData, remarks: e.target.value }
                          }));
                        }}
                        style={{
                          background: '#ffffff',
                          padding: '6px 10px',
                          fontSize: '0.75rem',
                          width: '160px',
                          minWidth: '120px',
                          border: '1px solid #cfc8ba',
                          color: '#25231f',
                          borderRadius: '6px'
                        }}
                      />
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderTop: '1px solid #e4dfd5', background: '#faf9f6', flexShrink: 0 }}>
              <span style={{ fontSize: '0.75rem', color: '#696358' }}>
                Default status is <strong style={{ color: '#10b981' }}>Present</strong> — change per student as needed.
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => { playCyberSound('click'); setIsManualAttendanceOpen(false); }}
                  className="btn-secondary active-haptic"
                  style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingManual}
                  onClick={handleSubmitManualAttendance}
                  className="bg-gradient-btn active-haptic"
                  style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '0.85rem', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', minWidth: '160px' }}
                >
                  {isSubmittingManual ? 'Submitting...' : '✅ Submit Register'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Real-time Role Notification Drawer Modal */}
      <NotificationDrawerModal
        key={token}
        isOpen={showNotificationDrawer}
        onClose={() => setShowNotificationDrawer(false)}
        token={token}
        currentUser={currentUser}
        userRole={userRole}
        playCyberSound={playCyberSound}
        onNotificationClick={handleNotificationClick}
      />

      {/* Accessibility & Display Controls Modal */}
      <AccessibilitySettingsModal
        isOpen={showAccessibilityModal}
        onClose={() => setShowAccessibilityModal(false)}
        lang={appLang}
        onLanguageChange={(newLang) => setAppLang(newLang)}
      />

      {/* Privacy & Trust Center Transparency Sheet */}
      <PrivacyTrustCenter
        isOpen={showPrivacyCenterModal}
        onClose={() => setShowPrivacyCenterModal(false)}
        currentUser={currentUser}
        lang={appLang}
      />

      {/* Institution Broadcast Announcement Modal */}
      <InstitutionBroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        token={token}
        onBroadcastSuccess={() => {
          triggerHaptic();
          if (playCyberSound) playCyberSound('success');
        }}
      />

      {/* Quick Actions Dock for Staff & Admin */}
      {token && userRole !== 'student' && activeTab !== 'control' && activeTab !== 'all-features' && (
        <QuickActionsDock
          onScan={() => { setActiveTab('attendance'); playCyberSound('click'); }}
          onManual={() => { setIsManualAttendanceOpen(true); playCyberSound('click'); }}
          onReport={() => { setActiveTab('reports'); playCyberSound('click'); }}
          onNotify={() => {
            if (userRole === 'admin') {
              navigateToTab('broadcast');
            } else {
              setShowNotificationDrawer(true);
            }
            playCyberSound('click');
          }}
        />
      )}

      {/* Edge border flash overlay */}
      {showVoicePulseFlash && <div className="voice-pulse-flash-overlay" />}
    </div>
  </div>
  );
}
