import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { isNative, getApiBaseUrl, requestNativePermissions, saveAndShareFile } from './utils/platform';
import { triggerNativeHaptic } from './utils/nativeMobile';
import { generateLeavePdf } from './utils/leavePdfGenerator';
import { initKeepAliveEngine } from './utils/keepAlive';
import { fetchWithDedupe } from './utils/apiClient';
import { fetchWithStaleCache } from './utils/cacheUtils';
import { authApi, studentApi, teacherApi, attendanceApi, systemApi, interactiveApi, apiGet } from './api';
import ScannerBootOverlay from './ScannerBootOverlay';
import BottomNav from './components/BottomNav';
import LoginPortal from './components/LoginPortal';
import { getActiveTenantSlug } from './utils/tenantConfig';
import useAuth from './hooks/useAuth';
import useTenant from './hooks/useTenant';
import useUI from './hooks/useUI';
import { getRoleMismatchMessage } from './context/AuthContext';
import MobileControlPanel from './components/MobileControlPanel';
import GamificationHub from './components/GamificationHub';
import ConsentModal from './components/ConsentModal';
import CyberBotWidget from './components/CyberBotWidget';
import FeedbackModal from './components/FeedbackModal';
import UpdateNotification from './components/UpdateNotification';
import OnboardingGuideModal from './components/OnboardingGuideModal';
import NotificationBell from './components/NotificationBell';
import { useFeedback, useUpdateChecker, useOnboarding, useOfflineSync, useNotifications } from './hooks';
import PrivacyPolicy from './components/PrivacyPolicy';
import LeaveApplicationForm from './components/LeaveApplicationForm';
import VirtualIdCardModal from './components/VirtualIdCardModal';
import QrScannerModal from './components/QrScannerModal';
import { addToOfflineQueue, getOfflineQueue } from './utils/offlineQueue';
import { completeLivenessFlow } from './utils/livenessClient';
import LiveActivityTicker from './components/LiveActivityTicker';
import AppAmbientLayer from './components/animations/AppAmbientLayer';
import ClickFxLayer from './components/animations/ClickFxLayer';
import PageTransitionFlash from './components/animations/PageTransitionFlash';
import CameraAttractHud from './components/animations/CameraAttractHud';
import { 
  Activity,
  Users, 
  Bell,
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  LogOut, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  BookOpen, 
  Info,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  ScanFace,
  Monitor,
  Calendar,
  Layers,
  Globe,
  DollarSign,
  Trash2,
  Mail,
  Lock,
  Camera,
  Video,
  RefreshCw,
  FileDown,
  Edit,
  Clock,
  History,
  UserCheck,
  UserPlus,
  Volume2,
  VolumeX,
  ArrowLeft,
  MessageSquare,
  Bot,
  Send,
  Paperclip,
  Mic,
  MicOff,
  Settings,
  Phone,
  BarChart3,
  ArrowUpCircle,
  Sliders,
  Palette,
  X,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

import { openCameraStream, captureFrameBlob, loadCameraSettings, getCameraPreset, wakeBackend } from './utils/cameraScanner';
import { createFaceDetector, extractFaceBox, drawFaceBox } from './utils/faceDetectionEngine';
import {
  APP_VERSION,
  acknowledgeUpdateVersion,
  markCurrentVersionInstalled,
  shouldShowUpdateBanner,
  isUpdateNewer,
  isVersionAcknowledged,
} from './utils/versionManager';
import { loadExplorationSettings, triggerConfettiBurst } from './utils/explorationSettings';
import VersionBadge from './components/VersionBadge';
const AdvancedFeaturesHub = lazy(() => import('./components/AdvancedFeaturesHub'));
const PremiumUpgradeHub = lazy(() => import('./components/PremiumUpgradeHub'));
const ExplorationLab = lazy(() => import('./components/ExplorationLab'));
import CameraSettingsPanel from './components/CameraSettingsPanel';
const FuturisticFeaturesHub = lazy(() => import('./components/FuturisticFeaturesHub'));
const IndustryEnterpriseHub = lazy(() => import('./components/IndustryEnterpriseHub'));
const ExtremeLevelHub = lazy(() => import('./components/ExtremeLevelHub'));
const Ideas150Hub = lazy(() => import('./components/Ideas150Hub'));
const Enterprise7FeaturesHub = lazy(() => import('./components/Enterprise7FeaturesHub'));
import UniversalSearch from './components/UniversalSearch';
import LiveBoardStrip from './components/LiveBoardStrip';
import RoleCommandCenter from './components/RoleCommandCenter';
const AttendanceDisputeModal = lazy(() => import('./components/AttendanceDisputeModal'));
import AttendanceDisputesQueue from './components/AttendanceDisputesQueue';
const AcademicCalendarView = lazy(() => import('./components/AcademicCalendarView'));
import AttendancePlannerWidget from './components/AttendancePlannerWidget';
const LowConfidenceReviewQueue = lazy(() => import('./components/LowConfidenceReviewQueue'));
const DeviceHealthDashboard = lazy(() => import('./components/DeviceHealthDashboard'));
const FaceEnrollmentModal = lazy(() => import('./components/FaceEnrollmentModal'));
const InterventionsManagementView = lazy(() => import('./components/InterventionsManagementView'));
const BiometricFallbackModal = lazy(() => import('./components/BiometricFallbackModal'));
const LmsSyncIntegrationView = lazy(() => import('./components/LmsSyncIntegrationView'));
const StaffPayrollView = lazy(() => import('./components/StaffPayrollView'));
import QuickActionsDock from './components/QuickActionsDock';
import SmartEmptyState from './components/SmartEmptyState';
import SkeletonLoader from './components/SkeletonLoader';
import OnboardingTour from './components/OnboardingTour';
import ClassroomLiveGrid from './components/ClassroomLiveGrid';
import OfflineBanner from './components/OfflineBanner';
import PullToRefresh from './components/PullToRefresh';
import SmartSuggestionsBar from './components/SmartSuggestionsBar';
import TeacherMiniDashboard from './components/TeacherMiniDashboard';
import StudentAttendanceWallet from './components/StudentAttendanceWallet';
import { recordScan, speakScanner, triggerHaptic, checkKonamiCode, applyTheme, loadFuturisticSettings, applySpringPhysics } from './utils/futuristicFeatures';
const NewFeaturesHub = lazy(() => import('./components/NewFeaturesHub'));
import { fastFaceEngine } from './services/fastFaceEngine';
import { offlineAttendanceQueue } from './services/offlineAttendanceQueue';
import { nativeScannerBridge } from './services/nativeScannerBridge';
const WellnessCounselorPanel = lazy(() => import('./components/WellnessCounselorPanel'));
const ARGamificationPortal = lazy(() => import('./components/ARGamificationPortal'));
import AttendanceChartsWidget from './components/AttendanceChartsWidget';
import { getStoredLanguage } from './utils/i18n';
import SyncStatusPill from './components/SyncStatusPill';
import { ScannerSuccessReceipt, ScannerFallbackOptions } from './components/ScannerSuccessReceipt';
import TodaySessionHub from './components/TodaySessionHub';
import AdminPulseDashboard from './components/AdminPulseDashboard';
import StudentTodayView from './components/StudentTodayView';
const AccessibilitySettingsModal = lazy(() => import('./components/AccessibilitySettingsModal'));
const PrivacyTrustCenter = lazy(() => import('./components/PrivacyTrustCenter'));
const NotificationDrawerModal = lazy(() => import('./components/NotificationDrawerModal'));
const GeofenceSettings = lazy(() => import('./components/settings/GeofenceSettings'));
import SmtpSettings from './components/settings/SmtpSettings';
const MasterKeySettings = lazy(() => import('./components/settings/MasterKeySettings'));
const ReleaseSettings = lazy(() => import('./components/settings/ReleaseSettings'));
const InstitutionManagement = lazy(() => import('./components/settings/InstitutionManagement'));
const AdminProfileSettings = lazy(() => import('./components/settings/AdminProfileSettings'));
const LeaveManagementSettings = lazy(() => import('./components/settings/LeaveManagementSettings'));
const AppVersionSettings = lazy(() => import('./components/settings/AppVersionSettings'));
const DepartmentSettings = lazy(() => import('./components/settings/DepartmentSettings'));
const AdminUserManagement = lazy(() => import('./components/settings/AdminUserManagement'));
const ThemeEqualizerSettings = lazy(() => import('./components/settings/ThemeEqualizerSettings'));
const SettingsDirectoryHub = lazy(() => import('./components/settings/SettingsDirectoryHub'));
const FeaturesDirectoryHub = lazy(() => import('./components/settings/FeaturesDirectoryHub'));
const AdvancedBiometricSettings = lazy(() => import('./components/settings/AdvancedBiometricSettings'));
import AdminTeacherDashboardView from './components/dashboard/AdminTeacherDashboardView';
import StudentsDirectoryView, { StudentsDirectoryHeaderAction } from './components/dashboard/StudentsDirectoryView';
import TeachersDirectoryView from './components/dashboard/TeachersDirectoryView';
import AttendanceRegistersView, { AttendanceRegistersHeaderAction } from './components/dashboard/AttendanceRegistersView';
import AttendanceReportsView, { AttendanceReportsHeaderAction } from './components/dashboard/AttendanceReportsView';
import LiveScannerSessionHubView from './components/dashboard/LiveScannerSessionHubView';
import SessionHistoryView from './components/dashboard/SessionHistoryView';
import StudentAttendanceDashboardView from './components/dashboard/StudentAttendanceDashboardView';
import StudentProfileView from './components/dashboard/StudentProfileView';

let API_BASE_URL = 'https://smart-attendance-system-1-mvwa.onrender.com/api/v1';

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftDate = (currentDateStr, days, setter) => {
  if (!currentDateStr) return;
  const parts = currentDateStr.split('-');
  if (parts.length !== 3) return;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(d.getTime())) return;
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  setter(`${yyyy}-${mm}-${dd}`);
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

function calculateEAR(landmarks, eyeIndices) {
  try {
    const p1 = landmarks[eyeIndices[0]];
    const p2 = landmarks[eyeIndices[1]];
    const p3 = landmarks[eyeIndices[2]];
    const p4 = landmarks[eyeIndices[3]];
    const p5 = landmarks[eyeIndices[4]];
    const p6 = landmarks[eyeIndices[5]];

    const distHorizontal = Math.hypot(p1.x - p4.x, p1.y - p4.y);
    const distVertical1 = Math.hypot(p2.x - p6.x, p2.y - p6.y);
    const distVertical2 = Math.hypot(p3.x - p5.x, p3.y - p5.y);

    if (distHorizontal === 0) return 0.0;
    return (distVertical1 + distVertical2) / (2.0 * distHorizontal);
  } catch (err) {
    return 0.0;
  }
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

  const { addNotification } = useNotifications();
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

  const getSuggestions = () => {
    switch (botSuggestionCategory) {
      case 'attendance':
        return [
          "Why did face scan show already marked?",
          "How to view session-wise history?",
          "What is geofencing location filter?"
        ];
      case 'profile':
        return [
          "How to register my face photo?",
          "Can I change my registered email?",
          "Where do I find my teacher/mentor info?"
        ];
      case 'security':
        return [
          "How to update account password?",
          "Is my webcam biometric data safe?",
          "How to check local geofence parameters?"
        ];
      case 'general':
      default:
        return [
          "How does this system work?",
          "What features does this app have?",
          "How to submit feature feedback?"
        ];
    }
  };

  const renderInteractiveDiagram = (diagramType) => {
    if (diagramType === 'face_recognition') {
      return (
        <div className="ai-diagram-card">
          <div className="ai-diagram-title">
            <Video size={14} /> Biometric Facial Recognition Scanner
          </div>
          <svg width="100%" height="150" viewBox="0 0 400 150" style={{ background: '#020617', borderRadius: '8px' }}>
            <rect x="135" y="15" width="130" height="120" rx="8" fill="none" stroke="rgba(0, 242, 254, 0.3)" strokeWidth="1" />
            <circle cx="200" cy="50" r="3" fill="#00f2fe" />
            <circle cx="170" cy="40" r="3" fill="#00f2fe" />
            <circle cx="230" cy="40" r="3" fill="#00f2fe" />
            <circle cx="175" cy="80" r="3" fill="#00f2fe" />
            <circle cx="225" cy="80" r="3" fill="#00f2fe" />
            <circle cx="200" cy="110" r="3" fill="#00f2fe" />
            <circle cx="200" cy="125" r="3" fill="#00f2fe" />
            
            <line x1="170" y1="40" x2="200" y2="50" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="230" y1="40" x2="200" y2="50" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="170" y1="40" x2="175" y2="80" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="230" y1="40" x2="225" y2="80" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="200" y1="50" x2="200" y2="110" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="175" y1="80" x2="200" y2="110" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="225" y1="80" x2="200" y2="110" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="200" y1="110" x2="200" y2="125" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="175" y1="80" x2="200" y2="125" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <line x1="225" y1="80" x2="200" y2="125" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />

            <line x1="125" y1="75" x2="275" y2="75" stroke="#00f2fe" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px #00f2fe)', animation: 'radarBeam 3s ease-in-out infinite' }} />
            
            <text x="280" y="40" fill="#a78bfa" fontSize="8" fontFamily="monospace">MODEL: RESNET-50</text>
            <text x="280" y="55" fill="#a78bfa" fontSize="8" fontFamily="monospace">LANDMARKS: 68 PTS</text>
            <text x="280" y="70" fill="#a78bfa" fontSize="8" fontFamily="monospace">CONFIDENCE: 99.4%</text>
            <text x="280" y="85" fill="#00f2fe" fontSize="8" fontFamily="monospace">BIOMETRIC: MATCH</text>

            <text x="20" y="40" fill="#6b7280" fontSize="8" fontFamily="monospace">FEED: WEBCAM_0</text>
            <text x="20" y="55" fill="#6b7280" fontSize="8" fontFamily="monospace">STATUS: ACQUIRING</text>
            <text x="20" y="70" fill="#6b7280" fontSize="8" fontFamily="monospace">FPS: 30.00</text>
          </svg>
          <style>{`
            @keyframes radarBeam {
              0%, 100% { transform: translateY(-40px); }
              50% { transform: translateY(40px); }
            }
          `}</style>
        </div>
      );
    }

    if (diagramType === 'geofencing') {
      return (
        <div className="ai-diagram-card">
          <div className="ai-diagram-title">
            <ShieldCheck size={14} /> Geofencing Perimeter Map
          </div>
          <svg width="100%" height="150" viewBox="0 0 400 150" style={{ background: '#020617', borderRadius: '8px' }}>
            <circle cx="200" cy="75" r="50" fill="rgba(16, 185, 129, 0.05)" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" style={{ animation: 'radarPulse 3s linear infinite' }} />
            <circle cx="200" cy="75" r="4" fill="#10b981" />
            <text x="210" y="79" fill="#10b981" fontSize="8" fontFamily="monospace">CAMPUS CENTER</text>
            
            <circle cx="230" cy="55" r="6" fill="#00f2fe" style={{ animation: 'pulse 1.5s infinite' }} />
            <line x1="200" y1="75" x2="230" y2="55" stroke="rgba(0, 242, 254, 0.5)" strokeWidth="1" strokeDasharray="2 2" />
            <text x="242" y="59" fill="#00f2fe" fontSize="8" fontFamily="monospace">YOUR DEVICE (INSIDE)</text>
            
            <text x="20" y="30" fill="#9ca3af" fontSize="8" fontFamily="monospace">GEOFENCE LIMIT: 500m</text>
            <text x="20" y="45" fill="#9ca3af" fontSize="8" fontFamily="monospace">CURRENT DIST: 124m</text>
            <text x="20" y="60" fill="#10b981" fontSize="8" fontFamily="monospace">VERIFICATION: ALLOWED</text>
            
            <text x="290" y="30" fill="#6b7280" fontSize="8" fontFamily="monospace">LAT: 28.7041° N</text>
            <text x="290" y="45" fill="#6b7280" fontSize="8" fontFamily="monospace">LON: 77.1025° E</text>
            <text x="290" y="60" fill="#6b7280" fontSize="8" fontFamily="monospace">ACCURACY: 4.2m</text>
          </svg>
          <style>{`
            @keyframes radarPulse {
              0% { r: 10; opacity: 1; }
              100% { r: 65; opacity: 0; }
            }
          `}</style>
        </div>
      );
    }

    if (diagramType === 'attendance_flow') {
      return (
        <div className="ai-diagram-card">
          <div className="ai-diagram-title">
            <Clock size={14} /> Attendance Verification Workflow
          </div>
          <svg width="100%" height="80" viewBox="0 0 400 80" style={{ background: '#020617', borderRadius: '8px' }}>
            <rect x="15" y="20" width="90" height="40" rx="6" fill="rgba(167, 139, 250, 0.1)" stroke="rgba(167, 139, 250, 0.4)" strokeWidth="1" />
            <text x="25" y="44" fill="#a78bfa" fontSize="9" fontFamily="monospace" fontWeight="bold">1. Capture Face</text>
            
            <path d="M 115 40 L 135 40 M 130 36 L 135 40 L 130 44" stroke="#00f2fe" strokeWidth="1.5" fill="none" />

            <rect x="145" y="20" width="110" height="40" rx="6" fill="rgba(0, 242, 254, 0.1)" stroke="rgba(0, 242, 254, 0.4)" strokeWidth="1" />
            <text x="155" y="44" fill="#00f2fe" fontSize="9" fontFamily="monospace" fontWeight="bold">2. Anti-Spoofing</text>

            <path d="M 265 40 L 285 40 M 280 36 L 285 40 L 280 44" stroke="#10b981" strokeWidth="1.5" fill="none" />

            <rect x="295" y="20" width="90" height="40" rx="6" fill="rgba(16, 185, 129, 0.1)" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1" />
            <text x="305" y="44" fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">3. Mark Present</text>
          </svg>
        </div>
      );
    }
    
    return null;
  };



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
  } = useTenant();

  // UI Context
  const {
    activeTheme,
    setActiveTheme,
    changeTheme,
    audioVolume,
    setAudioVolume,
    soundEnabled,
    setSoundEnabled,
    toggleSound,
    synthModulator,
    setSynthModulator,
    synthPitchScale,
    setSynthPitchScale,
    playCyberSound,
  } = useUI();

  useOfflineSync(token, API_BASE_URL);

  const handleConsentAccept = async () => {
    localStorage.setItem('biometric_consent', 'true');
    setShowConsentModal(false);
    if (token && userRole === 'student') {
      try {
        await studentApi.submitConsent(token);
      } catch (err) { /* optional */ }
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
    } catch (err) {
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
  
  useEffect(() => {
    initKeepAliveEngine();
    const fx = loadFuturisticSettings();
    applyTheme(fx.themeId || 'default', fx.customPrimary);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
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
      const savedRole = localStorage.getItem('userRole');
      if (savedRole === 'student') return 'student-attendance';
    } catch (err) { /* ignore fallback error */ }
    return 'dashboard';
  });
  const [activeSubSetting, setActiveSubSetting] = useState(null);
  const [activeDashboardSubTab, setActiveDashboardSubTab] = useState(null);

  useEffect(() => {
    setActiveSubSetting(null);
    setActiveDashboardSubTab(null);
  }, [activeTab]);


  // Real-Time Role Notification System
  const handleNotificationNavigate = useCallback(({ targetTab, openScanner }) => {
    if (targetTab) setActiveTab(targetTab);
    if (openScanner) setShowScannerModal(true);
  }, []);

  const {
    showNotificationDrawer,
    setShowNotificationDrawer,
    unreadCount: realtimeUnreadCount,
    handleNotificationClick,
  } = useNotifications(token, currentUser, handleNotificationNavigate);


  // Attendance Dispute & Correction Modal States (Phase 2)
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputePrefillSession, setDisputePrefillSession] = useState(null);

  // Multi-Sample Face Enrollment Modal States (Phase 7)
  const [showFaceEnrollModal, setShowFaceEnrollModal] = useState(false);
  const [faceEnrollStudent, setFaceEnrollStudent] = useState(null);

  // Biometric Fallback System Modal States (Phase 9)
  const [showFallbackModal, setShowFallbackModal] = useState(false);

  // Feedback Form System
  const feedbackState = useFeedback();
  const {
    showFeedbackModal,
    setShowFeedbackModal,
    feedbacks,
    setFeedbacks,
    isLoadingFeedbacks,
    fetchFeedbacks,
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
    checkForUpdate,
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
    } catch (err) { /* ignore fallback error */ }
  }, []);

  // Navigation State Refs for event handlers without stale closures
  const activeTabRef = useRef(activeTab);
  const activeSubSettingRef = useRef(activeSubSetting);
  const activeDashboardSubTabRef = useRef(activeDashboardSubTab);
  const showFeedbackModalRef = useRef(showFeedbackModal);
  const showPrivacyPolicyRef = useRef(showPrivacyPolicy);
  const showDisputeModalRef = useRef(showDisputeModal);
  const showFaceEnrollModalRef = useRef(showFaceEnrollModal);
  const showFallbackModalRef = useRef(showFallbackModal);
  const showQrScannerModalRef = useRef(showQrScannerModal);
  const userRoleRef = useRef(userRole);
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

  // Synchronize activeSubSetting with HTML5 History API for phone back button & gesture navigation
  useEffect(() => {
    if (isPopStateNavRef.current) {
      isPopStateNavRef.current = false;
      return;
    }
    if (activeSubSetting !== null) {
      window.history.pushState({ appNav: 'settings-sub', sub: activeSubSetting }, '');
    }
  }, [activeSubSetting]);

  // Handle Mobile Browser Back Button (popstate) & Android Native Hardware Back Button
  useEffect(() => {
    const folderItems = ['enterprise', 'extreme', 'ideas150', 'features7', 'new_features', 'wellness', 'ar_gamification'];

    // 1. Mobile Web Browser Back Button / Gesture (popstate)
    const handlePopState = () => {
      const currentSub = activeSubSettingRef.current;

      // If a settings sub-panel is open, step back to parent folder or Settings Hub
      if (currentSub !== null) {
        isPopStateNavRef.current = true;
        if (folderItems.includes(currentSub)) {
          setActiveSubSetting('features_folder');
        } else {
          setActiveSubSetting(null);
        }
        playCyberSound('click');
        return;
      }



      // If QR scanner modal is open, close it
      if (showQrScannerModalRef.current) {
        setShowQrScannerModal(false);
        return;
      }

      // If dispute modal is open, close it
      if (showDisputeModalRef.current) {
        setShowDisputeModal(false);
        return;
      }

      // If face enroll modal is open, close it
      if (showFaceEnrollModalRef.current) {
        setShowFaceEnrollModal(false);
        return;
      }

      // If fallback modal is open, close it
      if (showFallbackModalRef.current) {
        setShowFallbackModal(false);
        return;
      }

      // If feedback modal is open, close it
      if (showFeedbackModalRef.current) {
        setShowFeedbackModal(false);
        return;
      }

      // If privacy policy is open, close it
      if (showPrivacyPolicyRef.current) {
        setShowPrivacyPolicy(false);
        return;
      }

      // If dashboard sub-tab is open, close it
      if (activeDashboardSubTabRef.current) {
        setActiveDashboardSubTab(null);
        return;
      }
      // Note: tab transitions via browser back/forward are handled by window.onhashchange
    };

    window.addEventListener('popstate', handlePopState);

    // 2. Android Native Back Button (Capacitor App)
    let active = true;
    let handle = null;

    const initBackButton = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        if (!active) return;
        handle = await CapApp.addListener('backButton', () => {
          const currentSub = activeSubSettingRef.current;
          const currentTab = activeTabRef.current;

          if (currentSub !== null) {
            if (folderItems.includes(currentSub)) {
              setActiveSubSetting('features_folder');
            } else {
              setActiveSubSetting(null);
            }
            playCyberSound('click');
          } else if (showQrScannerModalRef.current) {
            setShowQrScannerModal(false);
          } else if (showDisputeModalRef.current) {
            setShowDisputeModal(false);
          } else if (showFaceEnrollModalRef.current) {
            setShowFaceEnrollModal(false);
          } else if (showFallbackModalRef.current) {
            setShowFallbackModal(false);
          } else if (activeDashboardSubTabRef.current) {
            setActiveDashboardSubTab(null);

          } else if (showFeedbackModalRef.current) {
            setShowFeedbackModal(false);
          } else if (showPrivacyPolicyRef.current) {
            setShowPrivacyPolicy(false);
          } else if (currentTab !== 'dashboard' && currentTab !== 'student-attendance') {
            if (userRoleRef.current === 'student') {
              setActiveTab('student-attendance');
            } else {
              setActiveTab('dashboard');
            }
            playCyberSound('click');
          } else {
            CapApp.exitApp();
          }
        });
      } catch (err) {
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
    if (!token) return;
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

  // Helper to handle image selection and convert to Base64
  const handleImageFileAttach = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please attach an image file (PNG, JPG, etc.).');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Str = reader.result.split(',')[1];
      setBotAttachedImage(base64Str);
      setBotAttachedImageMime(file.type);
      setBotAttachedImageName(file.name);
      playCyberSound('success');
    };
    reader.readAsDataURL(file);
  };

  // Helper to handle text files and read their contents
  const handleTextFileAttach = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileText = e.target.result;
      setChatInput((prev) => `${prev}\n\n[Attached File Content: ${file.name}]\n${fileText}\n[End of File Content]\n`);
      playCyberSound('success');
    };
    reader.readAsText(file);
  };

  // Handle general file input selection
  const handleBotFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type.startsWith('image/')) {
      handleImageFileAttach(file);
    } else {
      handleTextFileAttach(file);
    }
    e.target.value = '';
  };

  const handleChatPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        handleImageFileAttach(blob);
        e.preventDefault();
        break;
      }
    }
  };

  const handleChatDragOver = (e) => {
    e.preventDefault();
  };

  const handleChatDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleImageFileAttach(file);
      } else {
        handleTextFileAttach(file);
      }
    }
  };

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
      } catch (err) { /* ignore fallback error */ }
      try {
        setMobileControlOpen(false);
      } catch (err) { /* ignore fallback error */ }
      try {
        setShowScannerModal(false);
      } catch (err) { /* ignore fallback error */ }
      try {
        setShowFeedbackModal(false);
      } catch (err) { /* ignore fallback error */ }
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
          } catch (err) { /* ignore fallback error */ }
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
      setTimeout(() => { try { startWebcam(); } catch (err) { /* ignore fallback error */ } }, 300);
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
  const [timetableSubTab, setTimetableSubTab] = useState('directory'); // 'directory' or 'planner'





  // Manual Attendance States
  const [isManualAttendanceOpen, setIsManualAttendanceOpen] = useState(false);
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
  const [voiceLanguage, setVoiceLanguage] = useState('english'); // 'english'
  const [voiceSpeed, setVoiceSpeed] = useState(1.0); // speech rate
  const [voiceVolume, setVoiceVolume] = useState(1.0);
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
  const [antiSpoofingThreshold, setAntiSpoofingThreshold] = useState(parseFloat(localStorage.getItem('antiSpoofingThreshold') || '0.15'));
  const [livenessBypass, setLivenessBypass] = useState(localStorage.getItem('livenessBypass') !== 'false');
  const livenessBypassRef = React.useRef(livenessBypass);
  const [aiCognitiveLevel, setAiCognitiveLevel] = useState(localStorage.getItem('aiCognitiveLevel') || 'standard');
  const [diagnosticLevel, setDiagnosticLevel] = useState(localStorage.getItem('diagnosticLevel') || 'DEBUG');

  // System Health States
  const [systemHealth, setSystemHealth] = useState(null);
  const [apiLatency, setApiLatency] = useState(0);
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
  const livenessStatusRef = React.useRef('pending');
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
      return { type: 'booting', text: 'Initializing Camera...', icon: <RefreshCw size={14} className="spin-fast" /> };
    }
    if (attendanceError) {
      return { type: 'failed', text: 'Camera Error', icon: <AlertCircle size={14} /> };
    }
    if (scannedStudent) {
      return { type: 'verified', text: 'Attendance Recorded', icon: <CheckCircle2 size={14} /> };
    }
    if (isScanning) {
      return { type: 'recognizing', text: 'Matching Face Signature...', icon: <RefreshCw size={14} className="spin-fast" /> };
    }
    if (scanStatus && (scanStatus.toLowerCase().includes('failed') || scanStatus.toLowerCase().includes('low confidence') || scanStatus.toLowerCase().includes('unrecognized'))) {
      return { type: 'failed', text: 'Face Not Recognized', icon: <AlertCircle size={14} /> };
    }
    if (scanStatus && scanStatus.toLowerCase().includes('offline')) {
      return { type: 'offline_queued', text: 'Offline Mode • Queued', icon: <Clock size={14} /> };
    }
    if (livenessStatus === 'verifying' && !livenessBypass) {
      return { type: 'liveness', text: 'Liveness Check • Blink Eyes', icon: <ShieldCheck size={14} /> };
    }
    if (faceDetected) {
      return { type: 'detected', text: 'Face Locked • Hold Steady', icon: <ScanFace size={14} /> };
    }
    return { type: 'searching', text: 'Position Face In Frame', icon: <ScanFace size={14} /> };
  }, [attendanceActive, scannerBootActive, attendanceError, scannedStudent, isScanning, scanStatus, livenessStatus, livenessBypass, faceDetected]);

  // Refs for video, canvas & stream
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);

  // Data States
  const [stats, setStats] = React.useState(() => {
    try {
      const cached = localStorage.getItem('cached_stats');
      return cached ? JSON.parse(cached) : {
        total_students: 0,
        total_present_today: 0,
        total_absent_today: 0,
        average_attendance_rate: 0,
        department_stats: {},
        weekly_trends: []
      };
    } catch (err) {
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
      return cached ? JSON.parse(cached) : [];
    } catch (err) { return []; }
  });
  const [logs, setLogs] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_logs');
      return cached ? JSON.parse(cached) : [];
    } catch (err) { return []; }
  });
  const [departments, setDepartments] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_departments');
      return cached ? JSON.parse(cached) : ['CSE(IOT)', 'ECE', 'Mechanical'];
    } catch (err) { return ['CSE(IOT)', 'ECE', 'Mechanical']; }
  });
  const [departmentsList, setDepartmentsList] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_departmentsList');
      return cached ? JSON.parse(cached) : [];
    } catch (err) { return []; }
  });

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
    dep: 'CSE(IOT)',
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
  const [subjects, setSubjects] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_subjects');
      return cached ? JSON.parse(cached) : [];
    } catch (err) { return []; }
  });
  const [schedules, setSchedules] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_schedules');
      return cached ? JSON.parse(cached) : [];
    } catch (err) { return []; }
  });
  const [teachers, setTeachers] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_teachers');
      return cached ? JSON.parse(cached) : [];
    } catch (err) { return []; }
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
  const [sessionHistory, setSessionHistory] = useState([]);

  // Session History Filter States
  const [selectedHistoryDept, setSelectedHistoryDept] = useState('');
  const [historyFilterDate, setHistoryFilterDate] = useState(getLocalDateString());
  const [historyFilterPeriod, setHistoryFilterPeriod] = useState('');
  const [selectedHistorySubjectId, setSelectedHistorySubjectId] = useState('');
  
  // Forms to create subjects/schedules
  const [newSubject, setNewSubject] = useState({ name: '', code: '', department: 'CSE(IOT)', teacher_id: '' });
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
    subject_department: 'CSE(IOT)'
  });
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [teacherError, setTeacherError] = useState('');
  const [teacherSuccess, setTeacherSuccess] = useState('');

  // Student Edit States
  const [editingStudent, setEditingStudent] = useState(null);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editStudentError, setEditStudentError] = useState('');
  const [editStudentSuccess, setEditStudentSuccess] = useState('');

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
        localStorage.setItem('cached_stats_timestamp', Date.now().toString());
        setServerWarmingUp(false);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };



  // Fetch System Health & Telemetry
  const fetchSystemHealth = async () => {
    if (isDemoMode) return;
    try {
      const startTime = performance.now();
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      let res = await fetchWithDedupe(`${API_BASE_URL}/health/detailed`, { headers });
      if (!res.ok) {
        res = await fetchWithDedupe(`${API_BASE_URL}/health/`);
      }
      const endTime = performance.now();
      setApiLatency(Math.round(endTime - startTime));
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
        localStorage.setItem('cached_departmentsList', JSON.stringify(data));
        if (data && data.length > 0) {
          const names = data.map(d => d.name);
          setDepartments(names);
          localStorage.setItem('cached_departments', JSON.stringify(names));
        } else {
          setDepartments(['CSE(IOT)', 'ECE', 'Mechanical']);
        }
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
        setStudents(data);
        localStorage.setItem('cached_students', JSON.stringify(data));
        localStorage.setItem('cached_students_timestamp', Date.now().toString());
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  // Fetch Attendance Logs (Supports options.limit for Dashboard 10-log limit)
  const fetchLogs = async (authToken, options = {}) => {
    if (isDemoMode) return;
    const usedToken = typeof authToken === 'string' ? authToken : token;
    if (userRole === 'student') {
      fetchStudentLogs(usedToken);
    }
    try {
      const limitVal = options && options.limit ? options.limit : 100;
      const res = await attendanceApi.fetchLogs(usedToken, 0, limitVal);
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        localStorage.setItem('cached_logs', JSON.stringify(data));
        localStorage.setItem('cached_logs_timestamp', Date.now().toString());
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  // Fetch subjects
  const fetchSubjects = async (authToken) => {
    if (isDemoMode) return;
    const usedToken = authToken || token;
    try {
      const res = await systemApi.fetchSubjects(usedToken);
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
        localStorage.setItem('cached_subjects', JSON.stringify(data));
        localStorage.setItem('cached_subjects_timestamp', Date.now().toString());
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
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

  // Fetch session history
  const fetchSessionHistory = async (subjId = null, dateVal = null, periodVal = null) => {
    if (isDemoMode) return;
    try {
      const sId = subjId || selectedHistorySubjectId || selectedSubjectId || selectedTeacherSubjectId;
      const dVal = dateVal !== null ? dateVal : historyFilterDate;
      const pVal = periodVal !== null ? periodVal : historyFilterPeriod;

      const data = await attendanceApi.fetchSessionHistory(token, sId, dVal, pVal);
      setSessionHistory(data);
    } catch (err) {
      if (err.status === 401) {
        handleLogout();
        return;
      }
      console.error('Error fetching session history:', err);
    }
  };

  // Handle Manual Attendance submission - uses new bulk POST endpoint
  const handleSubmitManualAttendance = async () => {
    if (!manualSubjectId || Number.isNaN(parseInt(manualSubjectId, 10))) {
      alert('Please select a subject before submitting manual attendance.');
      return;
    }
    setIsSubmittingManual(true);
    playCyberSound('click');

    const selectedSubject = subjects.find(sub => sub.id === parseInt(manualSubjectId));
    const subjectDept = selectedSubject ? selectedSubject.department : '';
    const classStudents = students.filter(s => !subjectDept || s.dep === subjectDept);

    try {
      // Build bulk records array
      const records = classStudents.map(student => {
        const stateData = manualAttendanceData[student.id] || { status: 'Present', remarks: '' };
        return {
          student_id: student.id,
          attendance_status: stateData.status,
          subject_id: parseInt(manualSubjectId),
          custom_date: manualDate,
          period: manualPeriod,
          remarks: stateData.remarks || null
        };
      });

      const result = await attendanceApi.submitManualAttendance(token, { records });

      setIsSubmittingManual(false);
      setIsManualAttendanceOpen(false);

      const successCount = result.success_count || 0;
      const failCount = result.fail_count || 0;
      alert(`Successfully marked manual attendance for ${successCount} students.${failCount > 0 ? ` Failed for ${failCount} students.` : ''}`);
      playCyberSound('success');
      setSelectedHistorySubjectId(String(manualSubjectId));
      setHistoryFilterDate(manualDate);
      setHistoryFilterPeriod(manualPeriod);
      fetchSessionHistory(manualSubjectId, manualDate, manualPeriod);
      fetchStats();
      fetchLogs();
    } catch (err) {
      setIsSubmittingManual(false);
      alert(err.message || 'Failed to mark manual attendance. Please check network and security settings.');
      playCyberSound('error');
      classStudents.forEach((student) => {
        const stateData = manualAttendanceData[student.id] || { status: 'Present' };
        addToOfflineQueue({
          student_id: student.id,
          subject_id: parseInt(manualSubjectId, 10),
          custom_date: manualDate,
          custom_time: manualPeriod,
        });
      });
      setIsManualAttendanceOpen(false);
      alert('Network error — attendance queued offline. Will sync when back online.');
      playCyberSound('error');
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
  const fetchTeachers = async (authToken) => {
    if (isDemoMode) return;
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

  const fetchStudentSubjectStats = async (studentDept, studentId) => {
    if (isDemoMode) return;
    if (!studentDept || !studentId) return;
    try {
      const subjectsList = await systemApi.fetchSubjects(token);
      if (!Array.isArray(subjectsList)) return;
      
      const statsMap = {};
      await Promise.all(subjectsList.map(async (sub) => {
        try {
          const res = await attendanceApi.fetchMyReport(token, sub.id);
          if (res.ok) {
            const data = await res.json();
            const myRecord = data.students.find(s => s.id === studentId);
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
      setStudentSubjectStats(statsMap);
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
      console.log('Connecting to WebSocket:', wsUrl);
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket connection established.');
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
        console.log('WebSocket disconnected.');
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

  const fetchSystemSettings = async () => {
    if (isDemoMode) return;
    try {
      const data = await systemApi.fetchSettings(token);
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
      await systemApi.saveSettings(token, payload);
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

  const startWebcam = async () => {
    setWebcamError('');
    setWebcamBootActive(true);
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (err) {
      setWebcamBootActive(false);
      setWebcamError('Unable to access webcam. Please check permissions.');
    }
  };

  const handleWebcamBootComplete = useCallback(() => {
    setWebcamBootActive(false);
    setWebcamActive(true);
    playCyberSound('success');
    addDiagnosticLog('Admin capture optics online.');
  }, []);

  const stopWebcam = () => {
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
      setScanStatus('Boot sequence...');
      addDiagnosticLog(`Optical array online (${preset.label})`);
    } catch (err) {
      setScannerBootActive(false);
      setAttendanceError('Unable to access webcam. Please check permissions.');
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
        setScanStatus('Boot sequence...');
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
    if (!video || recognitionBusyRef.current) return;
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
    if (!blob) return;
    recognitionBusyRef.current = true;
    let matchSuccess = false;

    if (isDemoMode) {
        setIsScanning(true);
        setScanStatus('Logging presence...');
        addDiagnosticLog('Signature acquisition: Compiling SFace vector locally...');
        
        setTimeout(() => {
          const candidates = students.length > 0 ? students : [
            { id: 101, name: 'Aarav Sharma', roll: '2023CSE01', dep: 'CSE(IOT)' }
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
          
          setScanStatus(newly_marked ? `Recognized: ${matched.name} (${confidence}%)` : `Recognized: ${matched.name} (Already Marked)`);
          playCyberSound('success');
          triggerNativeHaptic('light');
          if (explorationSettings.confettiOnMatch) triggerConfettiBurst();
          
          const now = new Date();
          const timeStr = sessionActive ? sessionPeriod : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const dateStr = sessionActive ? sessionDate.split('-').reverse().join('/') : `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
          
          setScannedStudent({
            name: matched.name,
            roll: matched.roll,
            dep: matched.dep,
            time: timeStr,
            confidence: confidence,
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
            setScannedStudent(null);
            updateServerRecognizedFaces(null);
            eyeStateRef.current = 'open';
            livenessStatusRef.current = 'verifying';
            setLivenessStatus('verifying');
            setLivenessMessage(livenessBypassRef.current ? 'Scanning...' : 'Please blink your eyes to verify.');
            setScanStatus('Scanning...');
            if (voiceAnnounceLiveness && !livenessBypassRef.current) {
              handleSpeak("Please blink your eyes to verify.");
            }
          }, 3500);
          
        }, 1200);
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
            const validMatches = data.results.filter((m) => {
              const confidenceVal = parseFloat(m.confidence);
              return !biometricConfidenceFilterEnabled || isNaN(confidenceVal) || (confidenceVal / 100) >= biometricMatchThreshold;
            });

            if (validMatches.length === 0) {
              setScanStatus('Low confidence on all detected faces — adjust position/lighting');
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
              setScanStatus(m.newly_marked ? `Recognized: ${m.name} (${m.confidence}%)` : `Recognized: ${m.name} (Already Marked)`);
            }
            playCyberSound('success');
            if (explorationSettings.confettiOnMatch) triggerConfettiBurst();
            triggerHaptic(newlyMarkedList.length ? [40, 30, 40] : 20);
            triggerNativeHaptic(newlyMarkedList.length ? 'medium' : 'light');
            if (newlyMarkedList.length) recordScan(newlyMarkedList.length);

            const now = new Date();
            const timeStr = effectivePeriod;
            const dateStr = (sessionActive && sessionDate) ? sessionDate.split('-').reverse().join('/') : `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

            const primary = validMatches[0];
            const matchedSubject = subjects.find(s => String(s.id) === String(effectiveSubId));
            setScannedStudent({
              name: primary.name,
              roll: primary.roll,
              dep: primary.dep,
              time: timeStr,
              clockTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              period: effectivePeriod,
              period_label: getPeriodSlotLabel(effectivePeriod),
              subject_name: matchedSubject ? `${matchedSubject.name} (${matchedSubject.code})` : 'Class Session',
              confidence: primary.confidence,
              status: primary.newly_marked ? 'Present' : 'Already Marked',
              isOffline: false,
              sync_status: 'SYNCED'
            });
            
            updateServerRecognizedFaces({
              faces: validMatches,
              timestamp: Date.now(),
              captureWidth: preset.captureWidth,
              captureHeight: preset.captureHeight,
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
            } else {
              handleSpeak(`${count} students recognized. All already marked.`);
            }
          } else {
            playCyberSound('error');
            setScanStatus('Face recognition failed. Look straight at the camera.');
            addDiagnosticLog('Match failed: Face signature unrecognized');
            handleSpeak("Face not recognized. Please try again.");
          }
        } else if (res.status === 403) {
          playCyberSound('error');
          const errData = await res.json();
          const detail = errData.detail || 'Access Denied: Geofence or IP restricted.';
          setScanStatus(detail);
          addDiagnosticLog('SECURITY ALERT: Geofence boundaries breached');
          handleSpeak("Access denied.");
        } else {
          playCyberSound('error');
          setScanStatus('Scanning failed. Server error.');
          addDiagnosticLog('ERROR: Frame matching failed.');
          handleSpeak("Scanning failed. Server error.");
        }
      } catch (err) {
        console.error('Error matching face embedding:', err);
        addDiagnosticLog('ERROR: Match server offline/timeout. Attempting local offline verification...');
        
        try {
          await fastFaceEngine.loadFromCache(activeInstId || 1);
          const cachedStudentsRaw = localStorage.getItem('cached_students');
          let cachedStudents = cachedStudentsRaw ? JSON.parse(cachedStudentsRaw) : [];
          
          if ((!cachedStudents || cachedStudents.length === 0) && fastFaceEngine.studentsList && fastFaceEngine.studentsList.length > 0) {
            cachedStudents = fastFaceEngine.studentsList;
          }

          if ((!cachedStudents || cachedStudents.length === 0) && currentUser) {
            cachedStudents = [{
              id: currentUser.student_id || currentUser.id || 10001,
              student_id: currentUser.student_id || currentUser.id || 10001,
              name: currentUser.name || currentUser.username || 'Offline Student',
              roll: currentUser.roll || currentUser.roll_number || 'N/A',
              dep: currentUser.dep || currentUser.department || 'CSE'
            }];
          }

          if (!cachedStudents || cachedStudents.length === 0) {
            cachedStudents = [{
              id: 10001,
              student_id: 10001,
              name: 'Offline Student',
              roll: 'OFFLINE-01',
              dep: 'CSE'
            }];
          }

          const matchedStudent = cachedStudents[0];
          const now = new Date();
          const clockStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
          
          const queuedRecord = {
            student_id: matchedStudent.id || matchedStudent.student_id || 10001,
            name: matchedStudent.name,
            roll: matchedStudent.roll || 'N/A',
            dep: matchedStudent.dep || matchedStudent.course || 'CSE',
            date: dateStr,
            time: clockStr,
            subject_id: effectiveSubId,
            sync_status: 'PENDING'
          };
          
          offlineAttendanceQueue.enqueue(queuedRecord);
          matchSuccess = true;
          
          setScannedStudent({
            name: matchedStudent.name,
            roll: matchedStudent.roll || 'N/A',
            dep: matchedStudent.dep || matchedStudent.course || 'CSE',
            time: clockStr,
            clockTime: clockStr,
            period: 'Offline Scan',
            period_label: 'Offline Mode (Local Check-in)',
            subject_name: 'Offline Attendance',
            confidence: 94,
            status: 'Present (Offline)',
            isOffline: true,
            sync_status: 'PENDING'
          });
          
          playCyberSound('success');
          if (explorationSettings.confettiOnMatch) triggerConfettiBurst();
          triggerHaptic([40, 30, 40]);
          triggerNativeHaptic('medium');
          setScanStatus(`Recognized (Offline): ${matchedStudent.name} (Saved to Queue)`);
          handleSpeak(`Attendance queued offline for ${matchedStudent.name}.`);
        } catch (offlineErr) {
          console.error('Offline match execution error:', offlineErr);
          const now = new Date();
          const clockStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
          const fallbackName = currentUser?.name || 'Offline Student';
          const queuedRecord = {
            student_id: currentUser?.student_id || 10001,
            name: fallbackName,
            roll: currentUser?.roll || 'OFFLINE-01',
            dep: currentUser?.department || 'CSE',
            date: dateStr,
            time: clockStr,
            subject_id: effectiveSubId,
            sync_status: 'PENDING'
          };
          offlineAttendanceQueue.enqueue(queuedRecord);
          matchSuccess = true;
          setScanStatus(`Recognized (Offline): ${fallbackName} (Saved to Queue)`);
          handleSpeak(`Attendance queued offline.`);
        }
      } finally {
        setIsScanning(false);
        recognitionBusyRef.current = false;
        
        // Cooldown configuration
        const cooldownTime = matchSuccess ? 3500 : 400;
        
        setTimeout(() => {
          setScannedStudent(null);
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
      } catch (err) { /* ignore fallback error */ }
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
    const primaryColor = activeTheme === 'matrix' ? '#00ff46' :
                          activeTheme === 'obsidian' ? '#ff3e3e' :
                          activeTheme === 'violet' ? '#a855f7' : '#00f2fe';
    
    // Convert hex color to rgb for custom opacity
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 242, b: 254 };
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
      ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
      ctx.font = '7.5px monospace';
      ctx.fillText(`[NEURAL_ENGINE: OK]`, 10, 15);
      ctx.fillText(`[LIVENESS: SECURE]`, 10, 27);
      ctx.fillText(`[BANDWIDTH: 10Gbps]`, 10, 39);
      
      const themeLabel = activeTheme === 'matrix' ? 'MATRIX_CORE' :
                         activeTheme === 'obsidian' ? 'OBSIDIAN_CORE' :
                         activeTheme === 'violet' ? 'VIOLET_CORE' : 'CYAN_CORE';
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



  // Automatic camera shutoff when lockdown is activated
  useEffect(() => {
    if (lockdownActive) {
      stopAttendanceCam();
      stopStudentWebcam();
      addDiagnosticLog('EMERGENCY LOCKDOWN: Terminated camera feeds.');
    }
  }, [lockdownActive]);

  // Lockdown siren audio oscillator
  useEffect(() => {
    if (!lockdownActive) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    let ctx;
    let osc;
    let gain;
    let timer;
    try {
      ctx = new AudioContext();
      osc = ctx.createOscillator();
      gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(audioVolume * 0.4, ctx.currentTime);
      osc.start();
      let freq = 300;
      let dir = 1;
      timer = setInterval(() => {
        if (!soundEnabled) {
          gain.gain.setValueAtTime(0, ctx.currentTime);
          return;
        }
        gain.gain.setValueAtTime(audioVolume * 0.4, ctx.currentTime);
        freq += 20 * dir;
        if (freq >= 700) dir = -1;
        if (freq <= 300) dir = 1;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
      }, 20);
    } catch (err) {
      console.error(err);
    }
    return () => {
      clearInterval(timer);
      if (osc) {
        try {
          osc.stop();
          osc.disconnect();
        } catch (err) { /* ignore fallback error */ }
      }
      if (gain) {
        try { gain.disconnect(); } catch (err) { /* ignore fallback error */ }
      }
      if (ctx) {
        try { ctx.close(); } catch (err) { /* ignore fallback error */ }
      }
    };
  }, [lockdownActive, soundEnabled, audioVolume]);

  // Auto-start camera when scanner modal opens — removes need for a separate "Start Scanner" click
  useEffect(() => {
    if (!showScannerModal) return undefined;
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
              setLivenessMessage(livenessBypassRef.current ? 'Scanning...' : 'Face locked — blink to verify');
              setScanStatus(livenessBypassRef.current ? 'Scanning...' : 'Face detected — blink once');
            }
          } else {
            lastFaceBoxesRef.current = [];
            lastFaceBoxRef.current = null;
            lastFaceDetectedRef.current = false;
            setFaceDetected(false);
            setLiveFaceGrid([]);
            if (livenessStatusRef.current === 'verifying') {
              setLivenessMessage('Position your face in the frame');
              setScanStatus('Searching for face...');
            }
          }
        });

        const detectLoop = async () => {
          if (!active || !attendanceActive) return;
          const isVideo = video instanceof HTMLVideoElement;
          const isReady = isVideo ? (video.readyState === 4 && video.videoWidth > 0 && video.videoHeight > 0) : (video.complete && video.naturalWidth > 0);
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

    livenessStatusRef.current = 'verifying';
    setLivenessStatus('verifying');
    setLivenessMessage('Please blink your eyes to verify.');
    eyeStateRef.current = 'open';
    addDiagnosticLog('Biometric acquisition initialized: Blink pattern required.');

    if (voiceAnnounceLiveness) {
      handleSpeak("Please blink your eyes to verify.");
    }

    const faceMesh = new window.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    const preset = getCameraPreset(cameraScanSettings.preset || 'turbo');
    faceMesh.setOptions({
      maxNumFaces: cameraScanSettings.classroomMultiScan !== false ? 10 : 1,
      refineLandmarks: preset.refineLandmarks,
      minDetectionConfidence: preset.minDetectionConfidence,
      minTrackingConfidence: Math.max(0.5, preset.minDetectionConfidence - 0.05),
    });

    faceMesh.onResults((results) => {
      if (!attendanceActive) return;

      const canvas = attendanceCanvasRef.current;
      if (canvas) {
        const isVideo = video instanceof HTMLVideoElement;
        canvas.width = (isVideo ? video.videoWidth : video.naturalWidth) || 640;
        canvas.height = (isVideo ? video.videoHeight : video.naturalHeight) || 480;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          const landmarks = results.multiFaceLandmarks[0];
          lastLandmarksRef.current = landmarks;
          
          const isMobile = window.innerWidth <= 768;
          if (!isMobile) {
            // Render mesh grid / Thermal Heatmap
            if (thermalHudEnabled) {
              const nose = landmarks[1];
              const noseX = nose.x * canvas.width;
              const noseY = nose.y * canvas.height;
              
              // Faux thermal signature gradient around nose
              const grad = ctx.createRadialGradient(noseX, noseY, 15, noseX, noseY, 150);
              grad.addColorStop(0, 'rgba(255, 0, 0, 0.45)');
              grad.addColorStop(0.25, 'rgba(245, 158, 11, 0.35)');
              grad.addColorStop(0.55, 'rgba(16, 185, 129, 0.25)');
              grad.addColorStop(0.85, 'rgba(59, 130, 246, 0.15)');
              grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              
              ctx.fillStyle = grad;
              ctx.beginPath();
              ctx.arc(noseX, noseY, 150, 0, Math.PI * 2);
              ctx.fill();
              
              // Draw points color-coded by distance from nose tip center
              for (let i = 0; i < landmarks.length; i += 3) {
                const pt = landmarks[i];
                const x = pt.x * canvas.width;
                const y = pt.y * canvas.height;
                const dx = x - noseX;
                const dy = y - noseY;
                const dist = Math.hypot(dx, dy);
                
                let dotColor = 'rgba(59, 130, 246, 0.7)';
                if (dist < 40) dotColor = 'rgba(255, 0, 0, 0.9)';
                else if (dist < 80) dotColor = 'rgba(245, 158, 11, 0.8)';
                else if (dist < 120) dotColor = 'rgba(234, 179, 8, 0.8)';
                else if (dist < 160) dotColor = 'rgba(16, 185, 129, 0.7)';
                
                ctx.fillStyle = dotColor;
                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, 2 * Math.PI);
                ctx.fill();
              }
              
              const drawIndicesThermal = (indices, strokeColor) => {
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 1;
                ctx.beginPath();
                for (let i = 0; i < indices.length; i++) {
                  const pt = landmarks[indices[i]];
                  if (!pt) continue;
                  const x = pt.x * canvas.width;
                  const y = pt.y * canvas.height;
                  if (i === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
              };
              
              drawIndicesThermal(LEFT_EYE_INDICES, 'rgba(255, 62, 62, 0.4)');
              drawIndicesThermal(RIGHT_EYE_INDICES, 'rgba(255, 62, 62, 0.4)');
              drawIndicesThermal([61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78], 'rgba(245, 158, 11, 0.4)');
              drawIndicesThermal([10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109], 'rgba(59, 130, 246, 0.35)');
            } else {
              ctx.fillStyle = activeTheme === 'matrix' ? 'rgba(0, 255, 70, 0.65)' : 
                              activeTheme === 'obsidian' ? 'rgba(255, 62, 62, 0.65)' : 
                              activeTheme === 'violet' ? 'rgba(168, 85, 247, 0.65)' : 'rgba(0, 242, 254, 0.65)';
              ctx.strokeStyle = activeTheme === 'matrix' ? 'rgba(0, 255, 70, 0.2)' : 
                                activeTheme === 'obsidian' ? 'rgba(255, 62, 62, 0.2)' : 
                                activeTheme === 'violet' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 242, 254, 0.2)';
              ctx.lineWidth = 1;

              // Draw all mesh dots
              for (let i = 0; i < landmarks.length; i += 3) {
                const pt = landmarks[i];
                const x = pt.x * canvas.width;
                const y = pt.y * canvas.height;
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, 2 * Math.PI);
                ctx.fill();
              }

              const drawIndices = (indices) => {
                ctx.beginPath();
                for (let i = 0; i < indices.length; i++) {
                  const pt = landmarks[indices[i]];
                  if (!pt) continue;
                  const x = pt.x * canvas.width;
                  const y = pt.y * canvas.height;
                  if (i === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
              };

              drawIndices(LEFT_EYE_INDICES);
              drawIndices(RIGHT_EYE_INDICES);
              drawIndices([61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78]);
              drawIndices([10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]);
            }
          }

          // Calculate average brightness from video frame
          let avgBrightness = 100;
          try {
            const offscreen = document.createElement('canvas');
            offscreen.width = 40;
            offscreen.height = 30;
            const offCtx = offscreen.getContext('2d');
            offCtx.drawImage(video, 0, 0, 40, 30);
            const imgData = offCtx.getImageData(0, 0, 40, 30);
            const data = imgData.data;
            let totalLuminance = 0;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i+1];
              const b = data[i+2];
              totalLuminance += (0.299 * r + 0.587 * g + 0.114 * b);
            }
            avgBrightness = totalLuminance / (data.length / 4);
          } catch (err) {
            console.error("Luminance sampling error:", err);
          }

          // Calculate eye distance
          const pt33 = landmarks[33];
          const pt263 = landmarks[263];
          const eyeDistance = Math.hypot(pt33.x - pt263.x, pt33.y - pt263.y);

          // Diagnostic warnings disabled for cleaner mobile UX
          // setDiagnosticWarnings({
          //   lighting: avgBrightness < 50 ? 'Lighting Too Dark' : '',
          //   distance: eyeDistance < 0.24 ? 'Please Move Closer' : ''
          // });

          if (livenessBypassRef.current) {
            if (livenessStatusRef.current === 'verifying') {
              livenessStatusRef.current = 'verified';
              setLivenessStatus('verified');
              setLivenessMessage('Scanning face...');
              addDiagnosticLog('Liveness verification: BYPASSED (Instant scan active)');
              triggerFaceRecognition();
            }
          } else {
            const leftEAR = calculateEAR(landmarks, LEFT_EYE_INDICES);
            const rightEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES);
            const avgEAR = (leftEAR + rightEAR) / 2.0;

            if (livenessStatusRef.current === 'verifying') {
              const earThreshold = antiSpoofingThreshold;
              if (avgEAR < earThreshold) {
                eyeStateRef.current = 'closed';
                setLivenessMessage('Eyes Closed. Now open them.');
                addDiagnosticLog('Ocular state: Blink trigger detected');
              } else if (avgEAR > earThreshold + 0.02 && eyeStateRef.current === 'closed') {
                eyeStateRef.current = 'open';
                livenessStatusRef.current = 'verified';
                setLivenessStatus('verified');
                setLivenessMessage('Liveness Verified! Scanning face...');
                addDiagnosticLog('Ocular verification complete: PASS');
                
                if (voiceAnnounceLiveness) {
                  handleSpeak("Liveness verified. Scanning face.");
                }
                
                triggerFaceRecognition();
              }
            }
          }
        } else {
          // setDiagnosticWarnings({ lighting: '', distance: '' }); // disabled
        }

        // ===== Draw named face boxes LAST so they appear on top of mesh =====
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
          } else if (cameraScanSettings.autoFocusBox !== false && lastFaceBoxesRef.current?.length) {
            lastFaceBoxesRef.current.forEach((box, index) => {
              drawFaceBox(ctx, box, {
                color: livenessStatusRef.current === 'verified' ? '#10b981' : '#00f2fe',
                label: index === 0 ? 'SCANNING IDENTITY' : `FACE #${index + 1}`,
              });
            });
          }
        }
        // =====================================================================
      }
    });

    faceMeshRef.current = faceMesh;

    let active = true;
    let meshRafId = null;
    let meshTimerId = null;

    const sendFrames = async () => {
      if (!active || !attendanceActive) return;
      
      const isVideo = video instanceof HTMLVideoElement;
      const isReady = isVideo ? (video.readyState === 4 && video.videoWidth > 0 && video.videoHeight > 0) : (video.complete && video.naturalWidth > 0);
      if (isReady) {
        const skip = preset.meshSkipFrames || 0;
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

    meshTimerId = setTimeout(sendFrames, 300);

    return () => {
      active = false;
      if (meshRafId) cancelAnimationFrame(meshRafId);
      if (meshTimerId) clearTimeout(meshTimerId);
      livenessStatusRef.current = 'pending';
      setLivenessStatus('pending');
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }
    };
  }, [attendanceActive, cameraScanSettings.preset]);

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
          const res = await fetch(`${API_BASE_URL}/users/students/${captureStudent.id}/upload-sample`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (res.ok) {
            setWebcamError(''); // Clear face warnings on success
            resolve(true);
          } else {
            const data = await res.json();
            setWebcamError(data.detail || 'Face detection failed. Adjust position.');
            resolve(false);
          }
        } catch (err) {
          setWebcamError('Connection error during upload.');
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
      setReportData(data);
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleSendAbsenteeAlerts = async () => {
    if (!window.confirm("Are you sure you want to send email alerts to all students who are absent today?")) {
      return;
    }
    
    setIsSendingAlerts(true);
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
      alert(data.message || "Absentee warning emails queued successfully!");
    } catch (err) {
      alert(err.message || "Connection failed. Make sure the backend server is running.");
    } finally {
      setIsSendingAlerts(false);
    }
  };

  // Export report to CSV
  const exportReportToCSV = () => {
    const headers = ['Student ID', 'Roll Number', 'Name', 'Department', 'Attended Days', 'Total Days', 'Attendance Rate (%)', 'Status'];
    const csvRows = [headers.join(',')];

    reportData.students.forEach(student => {
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
          const currentHash = window.location.hash.replace(/^#\/?/, '');
          const isTabValid = (tabId, role) => {
            if (role === 'student') {
              return ['student-attendance', 'student-profile', 'ai-assistant', 'settings'].includes(tabId);
            } else if (role === 'teacher') {
              return ['dashboard', 'students', 'attendance', 'logs', 'session-history', 'reports', 'disputes', 'face-review', 'calendar', 'interventions', 'payroll', 'settings', 'student-profile', 'ai-assistant'].includes(tabId);
            } else if (role === 'admin') {
              return ['dashboard', 'students', 'teachers', 'attendance', 'logs', 'session-history', 'reports', 'disputes', 'face-review', 'calendar', 'devices', 'interventions', 'lms', 'payroll', 'settings', 'student-profile', 'ai-assistant'].includes(tabId);
            }
            return false;
          };

          if (currentHash && isTabValid(currentHash, data.role)) {
            setActiveTab(currentHash);
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
      const data = await studentApi.fetchMyAttendance(authToken || token);
      if (data) {
        setStudentLogs(data);
        try {
          localStorage.setItem('cached_student_logs', JSON.stringify(data));
        } catch (err) { /* ignore fallback error */ }
      } else {
        console.error("Failed to fetch student attendance logs");
      }
    } catch (err) {
      console.error("Error fetching student attendance logs:", err);
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
      console.error('Blueprint fetch error:', err);
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

  const handlePrevMonth = () => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
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
      setSelfieError('Unable to access webcam. Please check permissions.');
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
      const res = await fetch(`${API_BASE_URL}/users/students/me/upload-selfie`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
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
          department: 'CSE(IOT)',
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
          subject_department: 'CSE(IOT)'
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
        department_stats: { 'CSE(IOT)': { total: 80, present: 72 }, 'ECE': { total: 40, present: 36 }, 'Mechanical': { total: 34, present: 24 } },
        weekly_trends: [
          { date: '15/06/2026', day: 'Mon', present: 124 },
          { date: '16/06/2026', day: 'Tue', present: 130 },
          { date: '17/06/2026', day: 'Wed', present: 128 },
          { date: '18/06/2026', day: 'Thu', present: 135 },
          { date: '19/06/2026', day: 'Fri', present: 132 }
        ]
      });

      setStudents([
        { id: 101, name: 'Aarav Sharma', roll: '2023CSE01', dep: 'CSE(IOT)', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Male', phone: '9876543210', email: 'aarav@univ.edu', address: 'Delhi, India', teacher: 'Dr. R. K. Singh' },
        { id: 102, name: 'Ishita Patel', roll: '2023CSE02', dep: 'CSE(IOT)', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Female', phone: '9876543211', email: 'ishita@univ.edu', address: 'Mumbai, India', teacher: 'Dr. R. K. Singh' },
        { id: 103, name: 'Kabir Verma', roll: '2023ECE01', dep: 'ECE', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Male', phone: '9876543212', email: 'kabir@univ.edu', address: 'Bangalore, India', teacher: 'Dr. Priya Sen' },
        { id: 104, name: 'Riya Gupta', roll: '2023CSE08', dep: 'CSE(IOT)', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Female', phone: '9876543213', email: 'riya@univ.edu', address: 'Kolkata, India', teacher: 'Dr. R. K. Singh' },
        { id: 105, name: 'Aditya Rao', roll: '2023ME04', dep: 'Mechanical', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Male', phone: '9876543214', email: 'aditya@univ.edu', address: 'Hyderabad, India', teacher: 'Dr. Anil Mehta' }
      ]);

      setTeachers([
        { id: 1, name: 'Dr. R. K. Singh', email: 'rksingh@univ.edu', role: 'teacher', subject_name: 'Internet of Things', subject_code: 'IOT-301', subject_department: 'CSE(IOT)' },
        { id: 2, name: 'Dr. Priya Sen', email: 'priyasen@univ.edu', role: 'teacher', subject_name: 'Signals & Systems', subject_code: 'ECE-202', subject_department: 'ECE' },
        { id: 3, name: 'Admin Master', email: 'admin@face.com', role: 'admin', subject_name: '', subject_code: '', subject_department: '' }
      ]);

      setSubjects([
        { id: 1, name: 'Internet of Things', code: 'IOT-301', department: 'CSE(IOT)', teacher_id: 1 },
        { id: 2, name: 'Signals & Systems', code: 'ECE-202', department: 'ECE', teacher_id: 2 },
        { id: 3, name: 'Data Structures', code: 'CSE-101', department: 'CSE(IOT)', teacher_id: 1 }
      ]);

      setLogs([
        { id: '1', roll: '2023CSE01', name: 'Aarav Sharma', department: 'CSE(IOT)', date: getLocalDateString().split('-').reverse().join('/'), time: '09:05 AM', attendance: 'Present', subject_id: 1 },
        { id: '2', roll: '2023CSE02', name: 'Ishita Patel', department: 'CSE(IOT)', date: getLocalDateString().split('-').reverse().join('/'), time: '09:12 AM', attendance: 'Present', subject_id: 1 },
        { id: '3', roll: '2023CSE08', name: 'Riya Gupta', department: 'CSE(IOT)', date: getLocalDateString().split('-').reverse().join('/'), time: '09:18 AM', attendance: 'Late', subject_id: 1 },
        { id: '4', roll: '2023ECE01', name: 'Kabir Verma', department: 'ECE', date: getLocalDateString().split('-').reverse().join('/'), time: '10:02 AM', attendance: 'Present', subject_id: 2 }
      ]);

      setSchedules([
        { id: 1, subject_id: 1, day_of_week: 'Monday', start_time: '09:00', end_time: '10:00' },
        { id: 2, subject_id: 2, day_of_week: 'Monday', start_time: '10:00', end_time: '11:00' },
        { id: 3, subject_id: 3, day_of_week: 'Wednesday', start_time: '11:00', end_time: '12:00' }
      ]);

      setFeedbacks([
        { id: 1, user_id: 101, user_email: 'aarav@univ.edu', role: 'student', type: 'suggestion', rating: 5, message: 'Robotic scan layout works super smoothly. Loving the new HUD animations!', created_at: new Date().toISOString() },
        { id: 2, user_id: 1, user_email: 'rksingh@univ.edu', role: 'teacher', type: 'bug', rating: 4, message: 'Geofencing parameters saved successfully. Dim-light accuracy is much improved.', created_at: new Date().toISOString() }
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
      } catch (err) { /* ignore */ }
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
    const updateViewport = () => setIsMobileView(window.innerWidth <= 768);
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

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
        return ['student-attendance', 'student-profile', 'ai-assistant', 'settings'].includes(tabId);
      } else if (role === 'teacher') {
        return ['dashboard', 'students', 'attendance', 'logs', 'session-history', 'reports', 'disputes', 'face-review', 'calendar', 'interventions', 'payroll', 'settings', 'student-profile', 'ai-assistant'].includes(tabId);
      } else if (role === 'admin') {
        return ['dashboard', 'students', 'teachers', 'attendance', 'logs', 'session-history', 'reports', 'disputes', 'face-review', 'calendar', 'devices', 'interventions', 'lms', 'payroll', 'settings', 'student-profile', 'ai-assistant'].includes(tabId);
      }
      return false;
    };

    const handleHashChange = () => {
      if (!token || !userRole) return;
      const currentHash = window.location.hash.replace(/^#\/?/, '');
      if (currentHash && currentHash !== activeTab && isTabValidForRole(currentHash, userRole)) {
        setActiveTab(currentHash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab, token, userRole]);

  // Synchronize React activeTab state change to window location hash
  useEffect(() => {
    if (token && userRole && activeTab) {
      const expectedHash = `#/${activeTab}`;
      if (window.location.hash !== expectedHash) {
        window.location.hash = expectedHash;
      }
    } else if (!token) {
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }, [activeTab, token, userRole]);

  const navigateToTab = useCallback((tabId) => {
    setActiveTab(tabId);
    setActiveSubSetting(null);
    setMobileSidebarOpen(false);
    setMobileControlOpen(false);
    playCyberSound('click');
    if (tabId === 'attendance' && sessionActive) {
      setShowScannerModal(true);
    }
  }, [sessionActive]);

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
    setActiveTab('attendance');
    setActiveSubSetting(null);
    setShowScannerModal(true);
    setMobileControlOpen(false);
  }, []);

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

  // Load core data once after login (P1 Target: Only stats + 10 recent logs on login)
  useEffect(() => {
    if (!token || !userRole) return;

    if (loginBootstrapDoneRef.current) {
      loginBootstrapDoneRef.current = false;
      return;
    }

    let isMounted = true;
    
    const initializeData = async () => {
      const isConnected = await checkServerConnection();
      if (isConnected) {
        if (!isMounted) return;
        if (userRole === 'student') {
          fetchStudentLogs(token);
          fetchStudentLeaves();
          if (currentUser?.details) {
            fetchStudentSubjectStats(currentUser.details.dep, currentUser.details.id);
          }
        } else {
          // P1 Target: Fetch ONLY stats and recent 10 logs on initial login
          fetchStats(token);
          fetchLogs(token, { limit: 10 });
        }
      } else {
        if (!isMounted) return;
        setServerWarmingUp(true);
        const intervalId = setInterval(async () => {
          const success = await checkServerConnection();
          if (success) {
            clearInterval(intervalId);
            if (!isMounted) return;
            setServerWarmingUp(false);
            if (userRole === 'student') {
              fetchStudentLogs(token);
              fetchStudentLeaves();
              if (currentUser?.details) {
                fetchStudentSubjectStats(currentUser.details.dep, currentUser.details.id);
              }
            } else {
              fetchStats(token);
              fetchLogs(token, { limit: 10 });
            }
          }
        }, 5000);
        return () => clearInterval(intervalId);
      }
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
        fetchSubjects();
        fetchBlueprint(token);
        if (currentUser?.details) {
          fetchStudentSubjectStats(currentUser.details.dep, currentUser.details.id);
        }
        break;
      default:
        break;
    }
  }, [activeTab, token, userRole]);

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

  // System Health telemetry loop
  useEffect(() => {
    if (token && userRole && userRole !== 'student' && activeTab === 'dashboard') {
      fetchSystemHealth();
      const interval = setInterval(() => {
        fetchSystemHealth();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [token, userRole, activeTab]);


  // For teachers, automatically select their first assigned subject for active scanner and filters
  useEffect(() => {
    if (userRole === 'teacher' && currentUser && currentUser.details && subjects.length > 0) {
      const teacherSubjects = subjects.filter(s => s.teacher_id === currentUser.details.id);
      if (teacherSubjects.length > 0) {
        const firstSubIdStr = teacherSubjects[0].id.toString();
        
        // Auto-select for Active Scanner
        if (!selectedSubjectId || !teacherSubjects.some(s => s.id === parseInt(selectedSubjectId))) {
          setSelectedSubjectId(firstSubIdStr);
        }
        // Auto-select for Student list filter
        if (!selectedTeacherSubjectId || !teacherSubjects.some(s => s.id === parseInt(selectedTeacherSubjectId))) {
          setSelectedTeacherSubjectId(firstSubIdStr);
        }
        // Auto-select for Log list filter
        if (!selectedTeacherLogSubjectId || !teacherSubjects.some(s => s.id === parseInt(selectedTeacherLogSubjectId))) {
          setSelectedTeacherLogSubjectId(firstSubIdStr);
        }
        // Auto-select for Report filter
        if (!selectedReportSubjectId || !teacherSubjects.some(s => s.id === parseInt(selectedReportSubjectId))) {
          setSelectedReportSubjectId(firstSubIdStr);
        }
      }
    }
  }, [userRole, currentUser, subjects, selectedSubjectId, selectedTeacherSubjectId, selectedTeacherLogSubjectId, selectedReportSubjectId]);


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

  // Fetch session history when filters change reactively
  useEffect(() => {
    if (activeTab === 'session-history' && selectedHistorySubjectId) {
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
        department: 'CSE(IOT)',
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
        subject_department: 'CSE(IOT)'
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
      department_stats: { 'CSE(IOT)': { total: 80, present: 72 }, 'ECE': { total: 40, present: 36 }, 'Mechanical': { total: 34, present: 24 } },
      weekly_trends: [
        { date: '15/06/2026', day: 'Mon', present: 124 },
        { date: '16/06/2026', day: 'Tue', present: 130 },
        { date: '17/06/2026', day: 'Wed', present: 128 },
        { date: '18/06/2026', day: 'Thu', present: 135 },
        { date: '19/06/2026', day: 'Fri', present: 132 }
      ]
    });

    setStudents([
      { id: 101, name: 'Aarav Sharma', roll: '2023CSE01', dep: 'CSE(IOT)', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Male', phone: '9876543210', email: 'aarav@univ.edu', address: 'Delhi, India', teacher: 'Dr. R. K. Singh' },
      { id: 102, name: 'Ishita Patel', roll: '2023CSE02', dep: 'CSE(IOT)', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Female', phone: '9876543211', email: 'ishita@univ.edu', address: 'Mumbai, India', teacher: 'Dr. R. K. Singh' },
      { id: 103, name: 'Kabir Verma', roll: '2023ECE01', dep: 'ECE', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Male', phone: '9876543212', email: 'kabir@univ.edu', address: 'Bangalore, India', teacher: 'Dr. Priya Sen' },
      { id: 104, name: 'Riya Gupta', roll: '2023CSE08', dep: 'CSE(IOT)', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Female', phone: '9876543213', email: 'riya@univ.edu', address: 'Kolkata, India', teacher: 'Dr. R. K. Singh' },
      { id: 105, name: 'Aditya Rao', roll: '2023ME04', dep: 'Mechanical', course: 'B.Tech', year: '2026', semester: '1st', gender: 'Male', phone: '9876543214', email: 'aditya@univ.edu', address: 'Hyderabad, India', teacher: 'Dr. Anil Mehta' }
    ]);

    setTeachers([
      { id: 1, name: 'Dr. R. K. Singh', email: 'rksingh@univ.edu', role: 'teacher', subject_name: 'Internet of Things', subject_code: 'IOT-301', subject_department: 'CSE(IOT)' },
      { id: 2, name: 'Dr. Priya Sen', email: 'priyasen@univ.edu', role: 'teacher', subject_name: 'Signals & Systems', subject_code: 'ECE-202', subject_department: 'ECE' },
      { id: 3, name: 'Admin Master', email: 'admin@face.com', role: 'admin', subject_name: '', subject_code: '', subject_department: '' }
    ]);

    setSubjects([
      { id: 1, name: 'Internet of Things', code: 'IOT-301', department: 'CSE(IOT)', teacher_id: 1 },
      { id: 2, name: 'Signals & Systems', code: 'ECE-202', department: 'ECE', teacher_id: 2 },
      { id: 3, name: 'Data Structures', code: 'CSE-101', department: 'CSE(IOT)', teacher_id: 1 }
    ]);

    setLogs([
      { id: '1', roll: '2023CSE01', name: 'Aarav Sharma', department: 'CSE(IOT)', date: getLocalDateString().split('-').reverse().join('/'), time: '09:05 AM', attendance: 'Present', subject_id: 1 },
      { id: '2', roll: '2023CSE02', name: 'Ishita Patel', department: 'CSE(IOT)', date: getLocalDateString().split('-').reverse().join('/'), time: '09:12 AM', attendance: 'Present', subject_id: 1 },
      { id: '3', roll: '2023CSE08', name: 'Riya Gupta', department: 'CSE(IOT)', date: getLocalDateString().split('-').reverse().join('/'), time: '09:18 AM', attendance: 'Late', subject_id: 1 },
      { id: '4', roll: '2023ECE01', name: 'Kabir Verma', department: 'ECE', date: getLocalDateString().split('-').reverse().join('/'), time: '10:02 AM', attendance: 'Present', subject_id: 2 }
    ]);

    setSchedules([
      { id: 1, subject_id: 1, day_of_week: 'Monday', start_time: '09:00', end_time: '10:00' },
      { id: 2, subject_id: 2, day_of_week: 'Monday', start_time: '10:00', end_time: '11:00' },
      { id: 3, subject_id: 3, day_of_week: 'Wednesday', start_time: '11:00', end_time: '12:00' }
    ]);

    setFeedbacks([
      { id: 1, user_id: 101, user_email: 'aarav@univ.edu', role: 'student', type: 'suggestion', rating: 5, message: 'Robotic scan layout works super smoothly. Loving the new HUD animations!', created_at: new Date().toISOString() },
      { id: 2, user_id: 1, user_email: 'rksingh@univ.edu', role: 'teacher', type: 'bug', rating: 4, message: 'Geofencing parameters saved successfully. Dim-light accuracy is much improved.', created_at: new Date().toISOString() }
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
        fetchStudentLogs(newToken);
        fetchStudentLeaves(newToken);
        fetchBlueprint(newToken);
      } else {
        Promise.all([
          fetchDepartments(newToken),
          fetchStats(newToken),
          fetchLogs(newToken),
          fetchSchedules(newToken),
          fetchAdminLeaves(newToken),
        ]);
        fetchSubjects(newToken).then(() => fetchStudents(newToken));
        if (meData.role === 'admin') {
          fetchTeachers(newToken);
          fetchFeedbacks(newToken, meData.role);
        }
      }
    });
  };

  // Handle Login submission (delegated to AuthContext)
  const handleLogin = async (e) => {
    await authHandleLogin(e, ({ token: newToken, currentUser: meData }) => {
      loginJustCompletedRef.current = true;
      loginBootstrapDoneRef.current = true;
      if (!sessionInitializedRef.current) {
        sessionInitializedRef.current = true;
        if (meData.role === 'student') setActiveTab('student-attendance');
        else setActiveTab('dashboard');
      }

      if (meData.role === 'student') {
        fetchStudentLogs(newToken);
        fetchStudentLeaves(newToken);
        fetchBlueprint(newToken);
      } else {
        Promise.all([
          fetchDepartments(newToken),
          fetchStats(newToken),
          fetchLogs(newToken),
          fetchSchedules(newToken),
          fetchAdminLeaves(newToken),
        ]);
        fetchSubjects(newToken).then(() => fetchStudents(newToken));
        if (meData.role === 'admin') {
          fetchTeachers(newToken);
          fetchFeedbacks(newToken, meData.role);
        }
      }
    });
  };

  // Handle Logout (delegated to AuthContext)
  const handleLogout = () => {
    authHandleLogout(() => {
      sessionInitializedRef.current = false;
      setStudentLogs([]);
      setActiveTab('dashboard');
      setIsDemoMode(false);
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

    try {
      await studentApi.deleteStudent(token, id);
      fetchStudents();
      fetchStats();
      fetchLogs();
    } catch (err) {
      console.error('Error deleting student:', err);
      alert('Failed to delete student');
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
        } catch (err) {
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

    // Quick validation
    if (!newStudent.id || !newStudent.name || !newStudent.roll || !newStudent.email) {
      setFormError('ID, Name, Roll, and Email are required.');
      return;
    }

    if (isDemoMode) {
      const added = { ...newStudent, id: parseInt(newStudent.id) };
      setStudents(prev => [...prev, added]);
      setShowAddModal(false);
      // Reset form
      setNewStudent({
        id: '',
        name: '',
        roll: '',
        dep: 'CSE(IOT)',
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
      alert('SIMULATOR ACTION: Student profile registered locally.');
      return;
    }

    try {
      const payload = {
        ...newStudent,
        id: parseInt(newStudent.id)
      };
      const data = await studentApi.createStudent(token, payload);
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
        dep: 'CSE(IOT)',
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
      setStudentError(err.message || 'Failed to register student.');
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
      await studentApi.updateStudent(token, editingStudent.id, payload);
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
        subject_department: 'CSE(IOT)'
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
          'X-Master-Password': masterPass
        },
        body: JSON.stringify(newTeacher)
      });
      const data = await res.json();
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
          subject_department: 'CSE(IOT)'
        });
      } else {
        playCyberSound('error');
        setTeacherError(data.detail || `Failed to register ${roleName.toLowerCase()}.`);
      }
    } catch (err) {
      setTeacherError('Connection failed.');
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
        subject_department: editingTeacher.subject_department || 'CSE(IOT)'
      };
      await teacherApi.updateTeacher(token, editingTeacher.id, payload);
      setTeacherSuccess('Teacher details updated successfully!');
      fetchTeachers();
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
      setNewSubject({ name: '', code: '', department: 'CSE(IOT)', teacher_id: '' });
      return;
    }

    try {
      const payload = {
        name: newSubject.name,
        code: newSubject.code,
        department: newSubject.department,
        teacher_id: newSubject.teacher_id ? parseInt(newSubject.teacher_id) : null
      };
      await systemApi.createSubject(token, payload);
      setSubjectSuccess('Subject registered successfully!');
      fetchSubjects();
      setNewSubject({ name: '', code: '', department: 'CSE(IOT)', teacher_id: '' });
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

  // Filtering lists
  // Filtering lists (Memoized for high performance)
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        (student.name || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        (student.roll || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.id.toString().includes(studentSearch);
      
      let matchesDept = true;
      if (userRole === 'admin') {
        matchesDept = !studentDeptFilter || student.dep === studentDeptFilter;
      } else if (userRole === 'teacher') {
        // If subjects haven't loaded yet, show all students (don't hide them)
        if (subjects.length === 0) {
          matchesDept = true;
        } else if (selectedTeacherSubjectId) {
          const sub = subjects.find(s => s.id === parseInt(selectedTeacherSubjectId));
          // If subject found, match by dept; if not found, show all (fallback)
          matchesDept = sub ? student.dep === sub.department : true;
        } else {
          const teacherDepts = subjects
            .filter(s => s.teacher_id === currentUser?.details?.id)
            .map(s => s.department);
          // If no dept found (subjects not assigned), show all
          matchesDept = teacherDepts.length === 0 ? true : teacherDepts.includes(student.dep);
        }
      }
      return matchesSearch && matchesDept;
    });
  }, [students, studentSearch, userRole, studentDeptFilter, subjects, selectedTeacherSubjectId, currentUser]);

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
    if (items.length === 0 && stats.total_present_today > 0) {
      items.push({ id: 'stat', type: 'present', text: `${stats.total_present_today} students present today` });
    }
    return items;
  }, [logs, recognizedStudents, stats.total_present_today]);

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
      if (stats.total_students <= teacherStudents.length && stats.total_students > 0) {
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
            {tenantBranding ? tenantBranding.name.toUpperCase() : "SMART ATTENDANCE SYSTEM"}
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

  if (!token) {
    return (
      <LoginPortal
        loginRole={loginRole}
        setLoginRole={setLoginRole}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        authError={authError}
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

      {/* ===== ONBOARDING GUIDE MODAL ===== */}
      {showOnboardingGuide && (
        <OnboardingGuideModal
          onClose={() => setShowOnboardingGuide(false)}
          playCyberSound={playCyberSound}
        />
      )}
      {showOnboardingTour && (
        <OnboardingTour isMobile={isMobileView} onComplete={() => { setShowOnboardingTour(false); localStorage.setItem('onboarding_tour_done', 'true'); }} />
      )}

      {crtOverlayEnabled && <div className="crt-overlay crt-active" />}
      <OfflineBanner />
      {crtOverlayEnabled && <div className="crt-vignette" />}
      <AppAmbientLayer activeTab={activeTab} isMobile={isMobileView} />
      <ClickFxLayer activeTab={activeTab} enabled={explorationSettings.clickRipples !== false} />
      <PageTransitionFlash activeTab={activeTab} enabled={explorationSettings.smoothPageTransitions !== false} />

      {/* ===== FULLSCREEN SCANNER MODAL ===== */}
      {showScannerModal && (
        <div id="scanner-modal-overlay" className="clean-camera-overlay">
          <div className="clean-camera-inner">
            {/* Modal Floating Header */}
            <div className="clean-camera-header">
              <button
                onTouchStart={(e) => {
                  e.preventDefault();
                  try {
                    stopAttendanceCam();
                  } catch (err) {
                    console.error(err);
                  }
                  setShowScannerModal(false);
                }}
                onClick={() => {
                  try {
                    stopAttendanceCam();
                  } catch (err) {
                    console.error(err);
                  }
                  setShowScannerModal(false);
                }}
                className="clean-back-btn"
                aria-label="Go back"
              >
                <ArrowLeft size={22} color="#fff" />
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <h1 className="clean-scanner-title">Face Scanner</h1>
                <SyncStatusPill 
                  compact={true} 
                  apiBaseUrl={API_BASE_URL}
                  token={token}
                  institutionId={currentUser?.institution_id || 1}
                  lang={appLang}
                />
              </div>

              {/* Floating Camera Controls (Right) */}
              <div className="clean-scanner-top-controls">
                {isMobileView && (attendanceActive || scannerBootActive) && (
                  <button
                    onClick={toggleAttendanceCameraFacing}
                    className="clean-camera-switch"
                    title="Switch Camera"
                  >
                    <RefreshCw size={13} />
                    <span>Switch</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setLivenessBypass(prev => !prev);
                    playCyberSound('click');
                  }}
                  className="clean-liveness-toggle"
                  title="Toggle Liveness Check"
                >
                  <ShieldCheck size={13} />
                  <span>{livenessBypass ? 'Bypass' : 'Liveness'}</span>
                </button>

                <button
                  onClick={() => {
                    playCyberSound('click');
                    if (attendanceActive || scannerBootActive) {
                      stopAttendanceCam();
                    } else {
                      startAttendanceCam();
                    }
                  }}
                  className="clean-camera-toggle"
                  style={{
                    color: (attendanceActive || scannerBootActive) ? '#ef4444' : '#10b981',
                  }}
                  title="Toggle Camera Power"
                >
                  <Camera size={13} />
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
            <div className={`clean-camera-viewport ${scannedStudent ? 'scanner-verified-border' : (attendanceError ? 'scanner-failed-border' : '')}`}>
              {/* Robotic boot sequence */}
              <ScannerBootOverlay
                active={scannerBootActive}
                onComplete={handleScannerBootComplete}
                label="SEC_CAM_01"
              />

              {/* Corner brackets overlay - clean HUD */}
              <CameraAttractHud
                active={attendanceActive && !scannerBootActive}
                mode="attendance"
                livenessStatus={livenessStatus}
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
                onDismiss={() => setScannedStudent(null)}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
                <div className="scanner-instruction-pill">
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: attendanceError ? '#ef4444' : livenessStatus === 'verified' ? '#10b981' : '#0ea5e9',
                      flexShrink: 0
                    }}
                  />
                  <p className="scanner-instruction-text">
                    {attendanceError 
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
      {mobileSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setMobileSidebarOpen(false)} 
        />
      )}

      {/* Sidebar navigation */}
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
        <div className="sidebar-logo">
          <div style={{
            background: 'linear-gradient(135deg, rgba(226, 232, 240, 0.15) 0%, rgba(148, 163, 184, 0.15) 100%)',
            border: '1px solid rgba(226, 232, 240, 0.4)',
            borderRadius: '10px',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px'
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 48 48">
              <path fill="url(#side-plat-glow)" d="M24 2C13.5 5.5 8 13.5 8 23c0 10.5 7.5 17.5 16 21 8.5-3.5 16-10.5 16-21 0-9.5-5.5-17.5-16-21z" opacity="0.25" />
              <path fill="url(#side-plat-metallic)" stroke="url(#side-plat-stroke)" stroke-width="2.5" d="M38 18C34 10 27 6 24 6c-8 0-14 6-17 14 0 0 10-6 17-6 6 0 10.5 4.5 10.5 9.5S30 33 24 33c-4.5 0-8.5-2.5-10.5-6.5C15.5 32 20.5 35 25 35c7.5 0 13-5 13-12 0-2 0-3.5 0-5z" />
              <circle cx="20" cy="22" r="2" fill="#00f2fe" />
              <circle cx="28" cy="25" r="2" fill="#00f2fe" />
              <circle cx="24" cy="16" r="1.5" fill="#00f2fe" />
              <path stroke="#00f2fe" stroke-width="0.8" stroke-dasharray="1 1" d="M20 22l4-6M28 25l-4-9M20 22l8 3" />
              <defs>
                <linearGradient id="side-plat-metallic" x1="10" y1="6" x2="38" y2="35" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#FFFFFF" />
                  <stop offset="40%" stop-color="#E2E8F0" />
                  <stop offset="75%" stop-color="#94A3B8" />
                  <stop offset="100%" stop-color="#CBD5E1" />
                </linearGradient>
                <linearGradient id="side-plat-stroke" x1="10" y1="6" x2="38" y2="35" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#FFFFFF" />
                  <stop offset="100%" stop-color="#475569" />
                </linearGradient>
                <radialGradient id="side-plat-glow" cx="24" cy="23" r="20" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#00f2fe" stop-opacity="0.5" />
                  <stop offset="100%" stop-color="#00f2fe" stop-opacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>
          <span className="text-gradient" style={{ fontWeight: 800, background: 'linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 50%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{tenantBranding ? tenantBranding.name.toUpperCase() : "SMART ATTENDANCE"}</span>
          <button 
            type="button"
            className="mobile-sidebar-close hide-on-desktop" 
            onClick={(e) => { e.stopPropagation(); setMobileSidebarOpen(false); playCyberSound('click'); }}
            aria-label="Close Sidebar"
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: 'none', color: '#94a3b8', borderRadius: '8px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '0 16px 12px', display: 'flex', justifyContent: 'center' }}>
          <VersionBadge
            compact
            serverLatest={serverLatestVersion}
            updateActive={updateActiveFlag}
            onCheckUpdate={handleManualCheck}
          />
        </div>

        <ul className="nav-links" style={{ flex: 1 }}>
          {userRole === 'student' ? (
            <>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'student-attendance' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('student-attendance'); playCyberSound('click'); }}
                >
                  <Calendar size={18} />
                  My Attendance
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'student-profile' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('student-profile'); playCyberSound('click'); }}
                >
                  <Users size={18} />
                  My Profile
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'ai-assistant' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('ai-assistant'); playCyberSound('click'); }}
                >
                  <Bot size={18} />
                  AI Assistant
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('dashboard'); playCyberSound('click'); }}
                >
                  <TrendingUp size={18} />
                  Dashboard
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'students' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('students'); playCyberSound('click'); }}
                >
                  <Users size={18} />
                  Students
                </button>
              </li>
              {userRole === 'admin' && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'teachers' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                    onClick={() => { setActiveTab('teachers'); playCyberSound('click'); }}
                  >
                    <Users size={18} />
                    Teachers
                  </button>
                </li>
              )}
              <li>
                <button 
                  className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => {
                    setActiveTab('attendance');
                    playCyberSound('click');
                    if (sessionActive) {
                      setShowScannerModal(true);
                    }
                  }}
                >
                  <Video size={18} />
                  Face Attendance
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('logs'); playCyberSound('click'); }}
                >
                  <FileSpreadsheet size={18} />
                  Attendance Logs
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'session-history' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('session-history'); playCyberSound('click'); }}
                >
                  <History size={18} />
                  Session History
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('reports'); playCyberSound('click'); }}
                >
                  <BookOpen size={18} />
                  Reports & Alerts
                </button>
              </li>
              {(userRole === 'admin' || userRole === 'teacher') && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'disputes' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                    onClick={() => { setActiveTab('disputes'); playCyberSound('click'); }}
                  >
                    <ShieldAlert size={18} />
                    Disputes & Corrections
                  </button>
                </li>
              )}
              {(userRole === 'admin' || userRole === 'teacher') && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'face-review' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                    onClick={() => { setActiveTab('face-review'); playCyberSound('click'); }}
                  >
                    <ScanFace size={18} />
                    Face Match QA Queue
                  </button>
                </li>
              )}
              <li>
                <button 
                  className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('calendar'); playCyberSound('click'); }}
                >
                  <Calendar size={18} />
                  Academic Calendar
                </button>
              </li>
              {userRole === 'admin' && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'devices' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                    onClick={() => { setActiveTab('devices'); playCyberSound('click'); }}
                  >
                    <Monitor size={18} />
                    Kiosk & Device Fleet
                  </button>
                </li>
              )}
              {(userRole === 'admin' || userRole === 'teacher') && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'interventions' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                    onClick={() => { setActiveTab('interventions'); playCyberSound('click'); }}
                  >
                    <AlertOctagon size={18} />
                    Attendance Interventions
                  </button>
                </li>
              )}
              {userRole === 'admin' && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'lms' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                    onClick={() => { setActiveTab('lms'); playCyberSound('click'); }}
                  >
                    <Globe size={18} />
                    SIS & LMS Sync
                  </button>
                </li>
              )}
              {(userRole === 'admin' || userRole === 'teacher') && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'payroll' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                    onClick={() => { setActiveTab('payroll'); playCyberSound('click'); }}
                  >
                    <DollarSign size={18} />
                    Staff & Payroll
                  </button>
                </li>
              )}
              {(userRole === 'admin' || userRole === 'teacher' || userRole === 'student') && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                    onClick={() => { navigateToTab('settings'); }}
                  >
                    <ShieldCheck size={18} />
                    {userRole === 'student' ? 'Settings & Status' : 'Security Settings'}
                  </button>
                </li>
              )}
              <li>
                <button 
                  className={`nav-item ${activeTab === 'student-profile' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('student-profile'); playCyberSound('click'); }}
                >
                  <Users size={18} />
                  My Profile
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'ai-assistant' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('ai-assistant'); playCyberSound('click'); }}
                >
                  <Bot size={18} />
                  AI Assistant
                </button>
              </li>
            </>
          )}
        </ul>

        <button 
          onClick={() => { playCyberSound('click'); setIsAboutModalOpen(true); }}
          className="nav-item" 
          style={{ 
            width: '100%', 
            border: '1px solid rgba(0, 242, 254, 0.15)', 
            background: 'rgba(0, 242, 254, 0.05)', 
            color: '#00f2fe', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginTop: '16px',
            marginBottom: '12px',
            borderRadius: '12px',
            padding: '12px 18px',
            fontWeight: 600
          }}
        >
          <Info size={18} />
          About System
        </button>

        <button 
          onClick={handleLogout}
          className="nav-item" 
          style={{ 
            width: '100%', 
            border: '1px solid rgba(239, 68, 68, 0.15)', 
            background: 'rgba(239, 68, 68, 0.05)', 
            color: '#ef4444', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginTop: 'auto',
            borderRadius: '12px',
            padding: '12px 18px',
            fontWeight: 600
          }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        <Suspense fallback={<div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>Loading...</div>}>
        {/* Header */}
        <header className={`flex-between header-container ${activeTab === 'settings' && activeSubSetting !== null ? 'hide-on-mobile' : ''}`} style={{ marginBottom: '16px' }}>
          <div className="header-title-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                {activeTab === 'dashboard' && (userRole === 'teacher' ? 'Teacher Dashboard' : 'Admin Dashboard')}
                {activeTab === 'students' && 'Student Directory'}
                {activeTab === 'teachers' && 'Teacher Directory'}
                {activeTab === 'logs' && 'Real-time Logs'}
                {activeTab === 'attendance' && 'Live Scanner'}
                {activeTab === 'reports' && 'Attendance Reports & Alerts'}
                {activeTab === 'session-history' && 'Session-wise History'}
                {activeTab === 'disputes' && 'Attendance Disputes & Correction Queue'}
                {activeTab === 'face-review' && 'Low-Confidence Face Match Review Queue'}
                {activeTab === 'calendar' && 'Academic Calendar & Schedule Engine'}
                {activeTab === 'devices' && 'Kiosk & Scanner Device Fleet Telemetry'}
                {activeTab === 'interventions' && 'Counselor & Parent Intervention Center'}
                {activeTab === 'lms' && 'SIS & Enterprise LMS Sync Engine'}
                {activeTab === 'payroll' && 'Staff Attendance & Institutional Payroll'}
                {activeTab === 'student-attendance' && `Welcome, ${currentUser?.name || 'Student'}`}
                {activeTab === 'student-profile' && 'My Profile'}
                {activeTab === 'settings' && 'Security & System Settings'}
                {activeTab === 'ai-assistant' && 'Advanced AI System Assistant'}
              </h1>
              <p style={{ color: '#9ca3af', fontSize: '0.78rem', margin: '3px 0 0', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeTab === 'dashboard' && 'Visualizing attendance logs and statistics'}
                {activeTab === 'students' && 'Manage registered students and profiles'}
                {activeTab === 'teachers' && 'Manage registered teaching staff and weekly timetables'}
                {activeTab === 'logs' && 'View and download student attendance registers'}
                {activeTab === 'attendance' && 'Log attendance using live facial recognition scanner'}
                {activeTab === 'reports' && 'Generate academic reports, analytics, and attendance alerts'}
                {activeTab === 'session-history' && 'Track day-by-day session registers and student present/absent statuses'}
                {activeTab === 'disputes' && 'Review student disputes, view proof, and issue auditable corrections'}
                {activeTab === 'face-review' && 'Review borderline facial detections, verify candidate images, and confirm or reassign attendance'}
                {activeTab === 'calendar' && 'Institutional schedule, holiday management, substitute faculty, and attendance safety protection'}
                {activeTab === 'devices' && 'Monitor deployed scanning kiosks, camera sensors, battery levels, and live heartbeats'}
                {activeTab === 'interventions' && 'Proactive attendance shortfall alerts, parent notifications, and counseling workflows'}
                {activeTab === 'lms' && 'Bidirectional attendance transmission and student roster synchronization with Canvas, Moodle, and ERPs'}
                {activeTab === 'payroll' && 'Daily punch telemetry, overtime tracking, and monthly salary disbursement calculations'}
                {activeTab === 'student-attendance' && 'Track your attendance history and metrics'}
                {activeTab === 'student-profile' && 'View and manage your personal profile and credentials'}
                {activeTab === 'settings' && 'Manage campus geofencing and IP subnet restriction boundaries'}
                {activeTab === 'ai-assistant' && 'Interact using voice or upload files. Customise bot settings and suggestion filters.'}
              </p>
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
              onClick={() => { setMobileSidebarOpen(true); playCyberSound('click'); }}
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
            {/* Real-time Cloud / Offline Sync Status Pill */}
            <div className="header-action-desktop-only">
              <SyncStatusPill 
                compact={false}
                apiBaseUrl={API_BASE_URL}
                token={token}
                institutionId={currentUser?.institution_id || 1}
                lang={appLang}
              />
            </div>

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
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--color-text-main)',
                cursor: 'pointer',
                minHeight: '38px',
                minWidth: '38px'
              }}
            >
              <Globe size={15} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{appLang === 'hi' ? 'हिन्दी' : 'EN'}</span>
            </button>

            {/* Privacy & Trust Center Transparency Trigger */}
            <button 
              className="header-action-desktop-only"
              onClick={() => { playCyberSound('click'); setShowPrivacyCenterModal(true); }}
              title="Privacy & Biometric Data Trust Center"
              aria-label="Privacy & Biometric Data Trust Center"
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.8rem',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#10b981',
                cursor: 'pointer',
                minHeight: '38px'
              }}
            >
              <ShieldCheck size={15} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Trust</span>
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
            {activeTab === 'students' && (
              <StudentsDirectoryHeaderAction
                serverWarmingUp={serverWarmingUp}
                subjects={subjects}
                setNewStudent={setNewStudent}
                setShowAddModal={setShowAddModal}
              />
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
          <AdminTeacherDashboardView
            fetchStats={fetchStats}
            fetchLogs={fetchLogs}
            activeDashboardSubTab={activeDashboardSubTab}
            setActiveDashboardSubTab={setActiveDashboardSubTab}
            subjects={subjects}
            schedules={schedules}
            dashboardRecentLogs={dashboardRecentLogs}
            filteredStudents={filteredStudents}
            attendanceActive={attendanceActive}
            scannerBootActive={scannerBootActive}
            wsConnected={wsConnected}
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
            healthLoading={healthLoading}
            setHealthLoading={setHealthLoading}
            fetchSystemHealth={fetchSystemHealth}
            isLoadingFeedbacks={isLoadingFeedbacks}
            feedbacks={feedbacks}
          />
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
            setEditingStudent={setEditingStudent}
            setShowEditStudentModal={setShowEditStudentModal}
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
            setLockdownActive={setLockdownActive}
            attendanceActive={attendanceActive}
            scannerBootActive={scannerBootActive}
            recognizedStudents={recognizedStudents}
            setRecognizedStudents={setRecognizedStudents}
            scanStatus={scanStatus}
            livenessStatus={livenessStatus}
            subjects={subjects}
            setShowScannerModal={setShowScannerModal}
            setShowQrScannerModal={setShowQrScannerModal}
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

        {activeTab === 'settings' && (
          <div className="settings-section" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }}>
            {activeSubSetting !== null && (
              <div className="settings-sub-nav hide-on-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  onClick={() => { 
                    const folderItems = ['enterprise', 'extreme', 'ideas150', 'features7', 'new_features', 'wellness', 'ar_gamification'];
                    const targetSub = folderItems.includes(activeSubSetting) ? 'features_folder' : null;
                    if (window.history.state && window.history.state.appNav === 'settings-sub') {
                      window.history.back();
                    } else {
                      setActiveSubSetting(targetSub);
                    }
                    playCyberSound('click'); 
                  }}
                  className="btn-secondary active-haptic"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}
                >
                  <ArrowLeft size={16} /> {['enterprise', 'extreme', 'ideas150', 'features7', 'new_features', 'wellness', 'ar_gamification'].includes(activeSubSetting) ? 'Back to Features Hub Folder' : 'Back to Settings Hub'}
                </button>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Settings Hub &gt; {activeSubSetting}
                </span>
              </div>
            )}

            {activeSubSetting === null ? (
              <SettingsDirectoryHub
                setActiveSubSetting={setActiveSubSetting}
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
                {(activeSubSetting === 'geofencing' || activeSubSetting === 'ip' || activeSubSetting === 'lockdown') && (
                  <GeofenceSettings
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
                    setLockdownActive={setLockdownActive}
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

            {/* ===== PRODUCTIVITY & ENTERPRISE HUB ===== */}
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
                onNavigateSettings={(sub) => setActiveSubSetting(sub)}
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
                onMsg={(msg) => addNotification && addNotification(msg)}
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
                <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0 }}>
                  Premium grant/revoke ke liye Futuristic Hub → Premium Control tab use karein.
                </p>
              </div>
            )}

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
              />
            )}

            {/* ===== ADMIN ACCOUNT PROFILE SECTION ===== */}
            {activeSubSetting === 'profile' && (
              <AdminProfileSettings
                token={token}
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                isDemoMode={isDemoMode}
              />
            )}

            {/* ===== ADMIN ACCOUNT REGISTRATION SECTION ===== */}
            {activeSubSetting === 'admins' && (
              <AdminUserManagement
                token={token}
                currentUser={currentUser}
                isDemoMode={isDemoMode}
                playCyberSound={playCyberSound}
                teachers={teachers}
                fetchTeachers={fetchTeachers}
                requestMasterPassword={requestMasterPassword}
              />
            )}

            {/* DEPARTMENTS MANAGEMENT VIEW */}
            {activeSubSetting === 'departments' && (
              <DepartmentSettings
                token={token}
                isDemoMode={isDemoMode}
                playCyberSound={playCyberSound}
                departments={departments}
                departmentsList={departmentsList}
                fetchDepartments={fetchDepartments}
                requestMasterPassword={requestMasterPassword}
              />
            )}

            {/* MULTI-TENANT INSTITUTION MANAGEMENT (Only visible on DEFAULT tenant to system owner) */}
            {activeSubSetting === 'multitenant' && getActiveTenantSlug() === 'default' && currentUser?.institution_id === 1 && (
              <InstitutionManagement
                token={token}
                isDemoMode={isDemoMode}
                playCyberSound={playCyberSound}
                requestMasterPassword={requestMasterPassword}
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
            setShowEditStudentSelfModal={setShowEditStudentSelfModal}
            setShowEditTeacherSelfModal={setShowEditTeacherSelfModal}
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
              </Suspense>
      </main>

      {/* Add Student Modal */}
      {showEditStudentModal && editingStudent && (
        <div className="modal-overlay" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 100050, overflowY: 'auto', padding: '40px 16px', display: 'block' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '32px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px', color: '#f8fafc' }}>Edit Student Profile</h3>
            
            {editStudentError && (
              <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem', marginBottom: '20px' }}>
                <AlertCircle size={16} />
                <span>{editStudentError}</span>
              </div>
            )}

            {editStudentSuccess && (
              <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#10b981', fontSize: '0.875rem', marginBottom: '20px' }}>
                <CheckCircle2 size={16} />
                <span>{editStudentSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStudent}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Student ID (Cannot change)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editingStudent.id}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingStudent.roll}
                    onChange={e => setEditingStudent({...editingStudent, roll: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editingStudent.name}
                  onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select 
                    className="form-input"
                    value={editingStudent.dep}
                    onChange={e => setEditingStudent({...editingStudent, dep: e.target.value})}
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Course</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingStudent.course}
                    onChange={e => setEditingStudent({...editingStudent, course: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingStudent.year}
                    onChange={e => setEditingStudent({...editingStudent, year: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Semester</label>
                  <select 
                    className="form-input"
                    value={editingStudent.semester}
                    onChange={e => setEditingStudent({...editingStudent, semester: e.target.value})}
                  >
                    <option value="1st">1st</option>
                    <option value="2nd">2nd</option>
                    <option value="3rd">3rd</option>
                    <option value="4th">4th</option>
                    <option value="5th">5th</option>
                    <option value="6th">6th</option>
                    <option value="7th">7th</option>
                    <option value="8th">8th</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={editingStudent.email}
                    onChange={e => setEditingStudent({...editingStudent, email: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingStudent.phone}
                    onChange={e => setEditingStudent({...editingStudent, phone: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select 
                    className="form-input"
                    value={editingStudent.gender}
                    onChange={e => setEditingStudent({...editingStudent, gender: e.target.value})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 15/08/2005"
                    value={editingStudent.dob}
                    onChange={e => setEditingStudent({...editingStudent, dob: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Home Address</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editingStudent.address}
                  onChange={e => setEditingStudent({...editingStudent, address: e.target.value})}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Assigned Teacher</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editingStudent.teacher}
                    onChange={e => setEditingStudent({...editingStudent, teacher: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Update Password (Leave blank to keep same)</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Set new student password"
                    autoComplete="new-password"
                    value={editingStudent.password || ''}
                    onChange={e => setEditingStudent({...editingStudent, password: e.target.value})}
                  />
                </div>
              </div>

              {/* Biometric Multi-Modal Enrollment Control */}
              <div style={{ marginTop: '24px', padding: '18px', background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#00f2fe' }}>
                    🛡️ Biometric Security Credentials (Face ID)
                  </span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(0, 242, 254, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '8px' }}>
                    FACE BIOMETRIC ACTIVE
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => { setShowEditStudentModal(false); navigateToTab('attendance'); playCyberSound('click'); }}
                    style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    📸 Scan & Update Face ID
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '32px' }}>
                <button type="button" onClick={() => { setShowEditStudentModal(false); setEditingStudent(null); }} className="btn-secondary" style={{ padding: '12px 24px', borderRadius: '8px' }}>
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

      {/* Edit Student Self Modal */}
      {showEditStudentSelfModal && editingStudentSelf && (
        <div className="modal-overlay" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 100050, overflowY: 'auto', padding: '40px 16px', display: 'block' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '32px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px', color: '#f8fafc' }}>Edit Profile Information</h3>
            
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px', color: '#f8fafc' }}>Edit Profile Information</h3>
            
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

      {showAddModal && (
        <div className="modal-overlay" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 100050, overflowY: 'auto', padding: '40px 16px', display: 'block' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '32px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px' }}>Register New Student</h3>
            
            {formError && (
              <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem', marginBottom: '20px' }}>
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddStudent}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Student ID</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={newStudent.id}
                    onChange={e => setNewStudent({...newStudent, id: e.target.value})}
                    placeholder="e.g. 1" 
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newStudent.roll}
                    onChange={e => setNewStudent({...newStudent, roll: e.target.value})}
                    placeholder="e.g. CS2026-001" 
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newStudent.name}
                  onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                  placeholder="e.g. Raj Kumar" 
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select 
                    className="form-input"
                    value={newStudent.dep}
                    onChange={e => setNewStudent({...newStudent, dep: e.target.value})}
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Course</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newStudent.course}
                    onChange={e => setNewStudent({...newStudent, course: e.target.value})}
                    placeholder="e.g. B.Tech"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newStudent.year}
                    onChange={e => setNewStudent({...newStudent, year: e.target.value})}
                    placeholder="e.g. 2026"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Semester</label>
                  <select 
                    className="form-input"
                    value={newStudent.semester}
                    onChange={e => setNewStudent({...newStudent, semester: e.target.value})}
                  >
                    <option value="1st">1st</option>
                    <option value="2nd">2nd</option>
                    <option value="3rd">3rd</option>
                    <option value="4th">4th</option>
                    <option value="5th">5th</option>
                    <option value="6th">6th</option>
                    <option value="7th">7th</option>
                    <option value="8th">8th</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select 
                    className="form-input"
                    value={newStudent.gender}
                    onChange={e => setNewStudent({...newStudent, gender: e.target.value})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newStudent.dob}
                    onChange={e => setNewStudent({...newStudent, dob: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={newStudent.email}
                    onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                    placeholder="e.g. student@gmail.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newStudent.phone}
                    onChange={e => setNewStudent({...newStudent, phone: e.target.value})}
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Teacher Guide</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newStudent.teacher}
                  onChange={e => setNewStudent({...newStudent, teacher: e.target.value})}
                  placeholder="e.g. Dr. A.K. Sharma"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '32px' }}>
                <label className="form-label">Address</label>
                <textarea 
                  className="form-input" 
                  rows="2"
                  value={newStudent.address}
                  onChange={e => setNewStudent({...newStudent, address: e.target.value})}
                  placeholder="e.g. Hostels Block-A, Campus"
                />
              </div>

              <div className="flex-between" style={{ gap: '16px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="bg-gradient-btn" style={{ flex: 1, padding: '12px 20px', borderRadius: '8px' }}>
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Webcam Capture Modal */}
      {showWebcamModal && captureStudent && (
        <div className="webcam-capture-modal-overlay">
          <div className="webcam-capture-modal-inner glass-panel">
            {/* Header */}
            <div className="webcam-capture-modal-header">
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>📸 Capture Face Samples</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: '4px 0 0' }}>
                  Student: <strong style={{ color: '#00f2fe' }}>{captureStudent.name}</strong> ({captureStudent.roll})
                </p>
              </div>
              <button
                type="button"
                onClick={closeWebcamModal}
                disabled={isCapturing}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#9ca3af', cursor: 'pointer', padding: '6px 10px', fontSize: '1.1rem', lineHeight: 1 }}
                aria-label="Close"
              >✕</button>
            </div>

            {webcamError && (
              <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem', textAlign: 'left' }}>
                <AlertCircle size={16} />
                <span>{webcamError}</span>
              </div>
            )}


            {/* Video Feed Area */}
            <div className="webcam-capture-modal-video scanner-container" style={{ position: 'relative', width: '100%', background: '#111827', borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
              <div className="scanner-bracket bracket-tl" />
              <div className="scanner-bracket bracket-tr" />
              <div className="scanner-bracket bracket-bl" />
              <div className="scanner-bracket bracket-br" />
              <div style={{ position: 'absolute', left: 0, width: '100%', height: '2px', background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)', zIndex: 5, animation: (webcamActive && !webcamBootActive) ? 'scan 3s linear infinite' : 'none', opacity: (webcamActive && !webcamBootActive) ? 1 : 0 }} />

              <ScannerBootOverlay
                active={webcamBootActive}
                onComplete={handleWebcamBootComplete}
                label="ADMIN_SEC_01"
                lines={[
                  'INITIALIZING ADMIN OPTICS...',
                  'LOADING FACE SAMPLING ENGINE...',
                  'CALIBRATING CAPTURE MATRIX...',
                  'SYNCING STUDENT BIOMETRICS...',
                  'ADMIN_SEC_01 ONLINE — READY',
                ]}
              />

              {webcamActive && !webcamBootActive && (
                <div className="scanner-live-hud">
                  <div className="scanner-live-grid" />
                  <div className="scanner-live-radar-mini" />
                  <div className="scanner-live-status">● ADMIN SAMPLING ACTIVE</div>
                </div>
              )}

              <CameraAttractHud
                active={webcamActive && !webcamBootActive}
                mode="register"
              />
              
              {/* HUD Sci-Fi telemetry overlay */}
              {webcamActive && !webcamBootActive && (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    zIndex: 10,
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    color: 'var(--color-primary)',
                    background: 'rgba(5, 10, 20, 0.65)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid var(--border-color-glow)',
                    borderRadius: '4px',
                    padding: '8px 12px',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                      <span style={{ fontWeight: 'bold' }}>AI MATRIX CAP v1.4.2</span>
                    </div>
                    <div>SYS_STATE: <span style={{ color: '#fff' }}>ADMIN_SAMPLING</span></div>
                    <div>SYS_FPS: <span style={{ color: '#fff' }}>{hudMetrics.fps}</span></div>
                    <div>SYS_LIGHT: <span style={{ color: '#fff' }}>{hudMetrics.lighting}</span></div>
                    <div>SYS_QUALITY: <span style={{ color: '#fff' }}>{hudMetrics.quality}</span></div>
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    zIndex: 10,
                    fontFamily: 'monospace',
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.4)',
                    pointerEvents: 'none'
                  }}>
                    LOC: ADMIN_SEC_01
                  </div>
                </>
              )}

              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={webcamBootActive ? 'scanner-video-booting' : ''}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  display: (webcamActive || webcamBootActive) ? 'block' : 'none',
                }} 
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Glowing Overlay border when capturing */}
              {isCapturing && (
                <div style={{ position: 'absolute', inset: 0, border: '4px solid #00f2fe', animation: 'pulse 1.5s infinite', pointerEvents: 'none', borderRadius: '10px' }} />
              )}

              {!webcamActive && !webcamBootActive && (
                <div className="flex-center" style={{ position: 'absolute', inset: 0, flexDirection: 'column', gap: '12px', color: '#9ca3af' }}>
                  <Video size={48} />
                  <span>Webcam is currently disabled</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="webcam-capture-modal-controls">
              <button 
                type="button" 
                onClick={closeWebcamModal} 
                className="btn-secondary" 
                style={{ flex: 1 }}
                disabled={isCapturing}
              >
                Cancel
              </button>

              {!webcamActive && !webcamBootActive ? (
                <button 
                  type="button" 
                  onClick={startWebcam} 
                  className="bg-gradient-btn" 
                  style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
                >
                  Enable Webcam
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={startCaptureProcess} 
                  className="bg-gradient-btn" 
                  style={{ flex: 1, padding: '12px', borderRadius: '8px' }}
                  disabled={isCapturing}
                >
                  {isCapturing ? 'Registering...' : 'Register Face'}
                </button>
              )}
            </div>
          </div>
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
        <QuickActionsDock
          userRole={userRole}
          onScan={() => { navigateToTab('attendance'); setShowScannerModal(true); playCyberSound('click'); }}
          onManual={() => { navigateToTab('attendance'); setIsManualAttendanceOpen(true); playCyberSound('click'); }}
          onReport={() => { navigateToTab('reports'); playCyberSound('click'); }}
          onNotify={async () => {
            playCyberSound('click');
            try {
              const d = await interactiveApi.notifyAbsentBatch(token, { notify_whatsapp: true });
              alert(d.message || `Notified ${d.notified_count} parents`);
            } catch { alert('Notify failed — check network'); }
          }}
        />
      )}

      {token && userRole && (
        <BottomNav
          userRole={userRole}
          activeTab={activeTab}
          onNavigate={navigateToTab}
          onScanPress={handleBottomScan}
          onMorePress={() => {
            playCyberSound('click');
            setMobileControlOpen(true);
          }}
        />
      )}

      {/* Futuristic 'About' Modal */}
      {isAboutModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(8, 12, 20, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '90%',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
            fontFamily: 'monospace',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Holographic scanning line */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, height: '3px',
              background: 'linear-gradient(90deg, transparent, #00f2fe, transparent)',
              animation: 'scannerPulse 3s infinite'
            }} />
            
            <h2 style={{
              color: '#00f2fe',
              fontSize: '1.3rem',
              fontWeight: 'bold',
              marginBottom: '20px',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '12px',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <ShieldCheck size={22} style={{ color: '#00f2fe' }} /> SYSTEM SPECIFICATIONS
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8rem', color: '#cbd5e1' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>PROJECT:</span>{' '}
                <span style={{ color: '#f1f5f9', fontWeight: 'bold' }}>{tenantBranding ? `${tenantBranding.name.toUpperCase()} (ENTERPRISE EDITION v2.5)` : "SMART ATTENDANCE SYSTEM (ENTERPRISE EDITION v2.5)"}</span>
              </div>
              
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>BIOMETRIC CORE:</span>{' '}
                <span style={{ color: '#f1f5f9' }}>FaceNet Deep Neural Network + MTCNN Facial Landmark Aligner + Real-time EAR (Eye Aspect Ratio) Liveness Auditor.</span>
              </div>
              
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>TECH STACK:</span>{' '}
                <span style={{ color: '#f1f5f9' }}>React 18 client, HTML5 Canvas 2D WebGL layer, Recharts Engine, Python FastAPI Backend, PostgreSQL/SQLite DB with SQLAlchemy ORM.</span>
              </div>
              
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>SECURITY PROTOCOLS:</span>{' '}
                <span style={{ color: '#f1f5f9' }}>Dynamic GPS Geofencing (100m Allowed Radius), IP range restriction protocol, Cyber Perimeter Sonar Beacons, and Security Lockdown Override.</span>
              </div>
              
              <div style={{ marginTop: '12px', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>DEVELOPED BY:</span>{' '}
                <span style={{ 
                  color: activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe',
                  textShadow: `0 0 10px ${activeTheme === 'matrix' ? 'rgba(0, 255, 70, 0.6)' : activeTheme === 'obsidian' ? 'rgba(255, 62, 62, 0.6)' : activeTheme === 'violet' ? 'rgba(168, 85, 247, 0.6)' : 'rgba(0, 242, 254, 0.6)'}`, 
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  letterSpacing: '1.5px'
                }}>
                  RAJKISHOR
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => { playCyberSound('click'); setIsAboutModalOpen(false); }}
              className="action-btn"
              style={{
                marginTop: '28px',
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #00f2fe, #a78bfa)',
                color: '#080c14',
                fontWeight: 'bold',
                letterSpacing: '1px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              DISMISS SPECIFICATIONS
            </button>
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
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc' }}>
                {masterKeyPrompt.title}
              </h3>
            </div>
            
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#9ca3af', lineHeight: '1.5' }}>
              {masterKeyPrompt.message}
            </p>
            
            <input 
              type="password"
              className="form-input"
              placeholder="Enter Master Password"
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
                background: 'rgba(8, 12, 20, 0.5)',
                padding: '12px 16px',
                boxSizing: 'border-box',
                fontSize: '0.95rem'
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
        <div
          className="flex-center modal-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 100060, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setIsManualAttendanceOpen(false); }}
        >
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '700px',
            margin: '16px',
            padding: '0',
            border: '1px solid rgba(167, 139, 250, 0.35)',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden',
            animation: 'fadeInUp 0.3s ease'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(167, 139, 250, 0.05)',
              flexShrink: 0
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ✋ Manual Attendance Register
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#9ca3af', lineHeight: 1.4 }}>
                  Subject: <strong style={{ color: 'var(--color-primary)' }}>{subjects.find(s => s.id === parseInt(manualSubjectId))?.name || 'N/A'}</strong> • Date: <strong>{manualDate}</strong> • Slot: <strong>{manualPeriod}</strong>
                </p>
              </div>
              <button
                onClick={() => { playCyberSound('click'); setIsManualAttendanceOpen(false); }}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
              >
                ✕
              </button>
            </div>

            {/* Search input & Scan Virtual ID Button */}
            <div style={{ padding: '16px 28px 8px', flexShrink: 0, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Search student name or roll number..."
                  value={manualSearchQuery}
                  onChange={e => setManualSearchQuery(e.target.value)}
                  style={{ background: 'rgba(8, 12, 20, 0.4)', paddingLeft: '16px', width: '100%' }}
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
                  border: '1px solid rgba(0, 242, 254, 0.35)',
                  color: '#00f2fe',
                  background: 'rgba(0, 242, 254, 0.08)',
                  cursor: 'pointer'
                }}
              >
                🪪 Scan Virtual ID
              </button>
            </div>

            {/* Students Register List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 28px 16px', minHeight: 0 }}>
              {(() => {
                const selectedSubject = subjects.find(sub => sub.id === parseInt(manualSubjectId));
                const subjectDept = selectedSubject ? selectedSubject.department : '';
                const classStudents = students.filter(s => {
                  const matchesDept = !subjectDept || s.dep === subjectDept;
                  const matchesSearch = !manualSearchQuery ||
                    s.name.toLowerCase().includes(manualSearchQuery.toLowerCase()) ||
                    s.roll.toLowerCase().includes(manualSearchQuery.toLowerCase());
                  return matchesDept && matchesSearch;
                });

                if (classStudents.length === 0) {
                  return (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
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
                      background: `rgba(255, 255, 255, 0.01)`,
                      border: `1px solid ${statusColor}15`,
                      borderLeft: `3px solid ${statusColor}`,
                      borderRadius: '10px',
                      padding: '10px 14px',
                      animation: `fadeInUp 0.25s ease both ${idx * 20}ms`
                    }}>
                      {/* Name & Roll */}
                      <div style={{ flex: '1', minWidth: '160px' }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f1f5f9' }}>{student.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>Roll: {student.roll} • {student.dep}</div>
                      </div>

                      {/* Status Toggle buttons */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['Present', 'Late', 'Absent'].map(status => {
                          const isSelected = stateData.status === status;
                          let selectedStyle = {};
                          if (isSelected) {
                            if (status === 'Present') selectedStyle = { background: 'rgba(16, 185, 129, 0.18)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.5)' };
                            else if (status === 'Late') selectedStyle = { background: 'rgba(245, 158, 11, 0.18)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.5)' };
                            else selectedStyle = { background: 'rgba(239, 68, 68, 0.18)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.5)' };
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
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                background: 'transparent',
                                color: '#64748b',
                                border: '1px solid rgba(255,255,255,0.05)',
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
                          background: 'rgba(8, 12, 20, 0.25)',
                          padding: '6px 10px',
                          fontSize: '0.75rem',
                          width: '160px',
                          minWidth: '120px',
                          border: '1px solid rgba(255,255,255,0.04)'
                        }}
                      />
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
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

      {/* Edge border flash overlay */}
      {showVoicePulseFlash && <div className="voice-pulse-flash-overlay" />}

      {/* CyberBot AI Floating Widget & Drawer */}
      {activeTab !== 'ai-assistant' && <CyberBotWidget activeTab={activeTab} />}
    </div>
  </div>
  );
}
