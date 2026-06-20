import React, { useState, useEffect, useCallback, useRef } from 'react';
import ScannerBootOverlay from './ScannerBootOverlay';
import BottomNav from './components/BottomNav';
import LoginPortal from './components/LoginPortal';
import MobileControlPanel from './components/MobileControlPanel';
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  LogOut, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  BookOpen, 
  ShieldCheck,
  Calendar,
  Layers,
  Trash2,
  Mail,
  Lock,
  Camera,
  Video,
  FileDown,
  Edit,
  Clock,
  History,
  UserCheck,
  UserPlus,
  Volume2,
  VolumeX
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://smart-attendance-system-1-mvwa.onrender.com/api/v1';

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
  } catch (e) {
    return 0.0;
  }
}

export default function App() {
  // Biometric / Sound / Theme States
  const [hudMetrics, setHudMetrics] = useState({ fps: '30.0', lighting: '92%', quality: 'EXCELLENT' });
  const [activeTheme, setActiveTheme] = useState(localStorage.getItem('theme') || 'cyberpunk');
  const [audioVolume, setAudioVolume] = useState(parseFloat(localStorage.getItem('audioVolume') || '0.5'));
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('soundEnabled') !== 'false');

  const [diagnosticLogs, setDiagnosticLogs] = useState([
    '[SYS] Bios boot sequence completed.',
    '[SYS] Quantum mesh engine idle.'
  ]);
  const [lockdownActive, setLockdownActive] = useState(false);
  const [scannedStudent, setScannedStudent] = useState(null);

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

  const playCyberSound = (type) => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(audioVolume, now);
      
      const scale = synthPitchScale || 1.0;
      
      if (type === 'click') {
        osc.type = synthModulator === 'classic' ? 'sine' : synthModulator;
        osc.frequency.setValueAtTime(1200 * scale, now);
        osc.frequency.exponentialRampToValueAtTime(800 * scale, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'success') {
        osc.type = synthModulator === 'classic' ? 'triangle' : synthModulator;
        osc.frequency.setValueAtTime(600 * scale, now);
        osc.frequency.setValueAtTime(800 * scale, now + 0.08);
        gain.gain.setValueAtTime(audioVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'error') {
        osc.type = synthModulator === 'classic' ? 'sawtooth' : synthModulator;
        osc.frequency.setValueAtTime(150 * scale, now);
        osc.frequency.linearRampToValueAtTime(100 * scale, now + 0.3);
        gain.gain.setValueAtTime(audioVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'scan') {
        osc.type = synthModulator === 'classic' ? 'sine' : synthModulator;
        osc.frequency.setValueAtTime(400 * scale, now);
        osc.frequency.exponentialRampToValueAtTime(1000 * scale, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Authentication State
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState('admin');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Student Portal States
  const [studentLogs, setStudentLogs] = useState([]);
  const [isLoadingStudentLogs, setIsLoadingStudentLogs] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // Student Portal Change Password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // App Navigation & Modal State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileControlOpen, setMobileControlOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const sessionInitializedRef = useRef(false);

  // Phase 5 States
  const [diagnosticWarnings, setDiagnosticWarnings] = useState({ lighting: '', distance: '' });
  const [timetableSubTab, setTimetableSubTab] = useState('directory'); // 'directory' or 'planner'

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
  const [attendanceError, setAttendanceError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('Camera Offline');
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerBootActive, setScannerBootActive] = useState(false);
  const [webcamBootActive, setWebcamBootActive] = useState(false);
  const [studentWebcamBootActive, setStudentWebcamBootActive] = useState(false);

  // Voice Assistant States
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceLanguage, setVoiceLanguage] = useState('hinglish'); // 'english', 'hindi', 'hinglish'
  const [voiceSpeed, setVoiceSpeed] = useState(1.0); // speech rate
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [voiceAnnounceLiveness, setVoiceAnnounceLiveness] = useState(false);

  // Phase 3 Cyber-Aesthetic States
  const [voicePitch, setVoicePitch] = useState(parseFloat(localStorage.getItem('voicePitch') || '1.0'));
  const [voiceRobotEffect, setVoiceRobotEffect] = useState(localStorage.getItem('voiceRobotEffect') === 'true');
  const [synthModulator, setSynthModulator] = useState(localStorage.getItem('synthModulator') || 'classic');
  const [synthPitchScale, setSynthPitchScale] = useState(parseFloat(localStorage.getItem('synthPitchScale') || '1.0'));

  // Phase 4 Ultra Sci-Fi States
  const [ambientHumActive, setAmbientHumActive] = useState(localStorage.getItem('ambientHumActive') === 'true');
  const [ambientHumVolume, setAmbientHumVolume] = useState(parseFloat(localStorage.getItem('ambientHumVolume') || '0.1'));
  const [thermalHudEnabled, setThermalHudEnabled] = useState(localStorage.getItem('thermalHudEnabled') === 'true');
  const [crtOverlayEnabled, setCrtOverlayEnabled] = useState(localStorage.getItem('crtOverlayEnabled') === 'true');

  // System Health States
  const [systemHealth, setSystemHealth] = useState(null);
  const [apiLatency, setApiLatency] = useState(0);
  const [healthLoading, setHealthLoading] = useState(false);

  // Logs UI Upgrade States
  const [logsViewMode, setLogsViewMode] = useState('grid'); // 'grid' | 'chrono'
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [quickFilterStatus, setQuickFilterStatus] = useState('all'); // 'all' | 'present' | 'absent'

  // Session History Upgrade States
  const [sessionViewModes, setSessionViewModes] = useState({}); // sessionKey -> 'manifest' | 'map'
  const [sessionSearches, setSessionSearches] = useState({}); // sessionKey -> searchStr
  const [sessionStatusFilters, setSessionStatusFilters] = useState({}); // sessionKey -> 'all' | 'present' | 'absent'
  const [hoveredStudentCard, setHoveredStudentCard] = useState(null); // student object or null

  useEffect(() => {
    localStorage.setItem('voicePitch', voicePitch);
  }, [voicePitch]);
  useEffect(() => {
    localStorage.setItem('voiceRobotEffect', voiceRobotEffect);
  }, [voiceRobotEffect]);
  useEffect(() => {
    localStorage.setItem('synthModulator', synthModulator);
  }, [synthModulator]);
  useEffect(() => {
    localStorage.setItem('synthPitchScale', synthPitchScale);
  }, [synthPitchScale]);
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
  
  // Liveness check states & refs
  const [livenessStatus, setLivenessStatus] = useState('pending'); // 'pending', 'verifying', 'verified'
  const [livenessMessage, setLivenessMessage] = useState('Camera Offline');
  const eyeStateRef = React.useRef('open');
  const livenessStatusRef = React.useRef('pending');
  const faceMeshRef = React.useRef(null);
  
  const attendanceVideoRef = React.useRef(null);
  const attendanceCanvasRef = React.useRef(null);
  const attendanceStreamRef = React.useRef(null);

  // Attendance Reports States
  const [reportStartDate, setReportStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [reportEndDate, setReportEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [reportDeptFilter, setReportDeptFilter] = useState('');
  const [reportData, setReportData] = useState({ total_working_days: 0, students: [] });
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isSendingAlerts, setIsSendingAlerts] = useState(false);

  // Refs for video, canvas & stream
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);

  // Data States
  const [stats, setStats] = useState({
    total_students: 0,
    total_present_today: 0,
    total_absent_today: 0,
    average_attendance_rate: 0,
    department_stats: {},
    weekly_trends: []
  });
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);

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

  // Admin Account Management States
  const [adminProfileName, setAdminProfileName] = useState('');
  const [adminProfileEmail, setAdminProfileEmail] = useState('');
  const [adminProfilePassword, setAdminProfilePassword] = useState('');
  const [adminProfileConfirmPassword, setAdminProfileConfirmPassword] = useState('');
  const [isUpdatingAdminProfile, setIsUpdatingAdminProfile] = useState(false);
  const [adminProfileMsg, setAdminProfileMsg] = useState('');
  const [adminProfileErr, setAdminProfileErr] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [createAdminMsg, setCreateAdminMsg] = useState('');
  const [createAdminErr, setCreateAdminErr] = useState('');
  const [allAdmins, setAllAdmins] = useState([]);

  // Geolocation for attendance check-in scan
  const [userCoords, setUserCoords] = useState(null);
  const [geoTrackingError, setGeoTrackingError] = useState('');

  // Subject & Timetable States
  const [subjects, setSubjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherSubjectId, setSelectedTeacherSubjectId] = useState('');
  const [selectedReportSubjectId, setSelectedReportSubjectId] = useState('');
  const [selectedTeacherLogSubjectId, setSelectedTeacherLogSubjectId] = useState('');
  
  // Attendance Session Setup States for Teachers
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionPeriod, setSessionPeriod] = useState('Period 1');
  const [sessionHistory, setSessionHistory] = useState([]);
  const [expandedSessions, setExpandedSessions] = useState({});
  
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



  // Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch System Health & Telemetry
  const fetchSystemHealth = async () => {
    try {
      const startTime = performance.now();
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      let res = await fetch(`${API_BASE_URL}/health/detailed`, { headers });
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/health/`);
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

  // Fetch Registered Students
  const fetchStudents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/students`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStudents(data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  // Fetch Attendance Logs
  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  // Fetch subjects
  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  // Fetch session history
  const fetchSessionHistory = async (subjId = null) => {
    try {
      const queryParams = new URLSearchParams();
      const sId = subjId || selectedSubjectId || selectedTeacherSubjectId;
      if (sId) {
        queryParams.append('subject_id', sId);
      }
      const res = await fetch(`${API_BASE_URL}/attendance/sessions-history?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSessionHistory(data);
      }
    } catch (err) {
      console.error('Error fetching session history:', err);
    }
  };


  // Fetch schedules
  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  // Fetch teachers
  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const teacherUsers = data.filter(u => u.role === 'teacher' || u.role === 'admin');
        setTeachers(teacherUsers);
      }
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  // Student subject stats
  const [studentSubjectStats, setStudentSubjectStats] = useState({});

  const fetchStudentSubjectStats = async (studentDept, studentId) => {
    if (!studentDept || !studentId) return;
    try {
      const subRes = await fetch(`${API_BASE_URL}/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!subRes.ok) return;
      const subjectsList = await subRes.json();
      
      const statsMap = {};
      await Promise.all(subjectsList.map(async (sub) => {
        try {
          const res = await fetch(`${API_BASE_URL}/attendance/my-report?subject_id=${sub.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            const myRecord = data.students.find(s => s.id === studentId);
            if (myRecord) {
              statsMap[sub.id] = {
                subjectName: sub.name,
                subjectCode: sub.code,
                presentDays: myRecord.present_days,
                totalDays: myRecord.total_days,
                percentage: myRecord.percentage,
                lowAttendance: myRecord.low_attendance
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

  const fetchSystemSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
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
    try {
      const res = await fetch(`${API_BASE_URL}/settings/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          geofencing_enabled: settingsGeoEnabled,
          center_latitude: parseFloat(settingsLat),
          center_longitude: parseFloat(settingsLon),
          allowed_radius_meters: parseFloat(settingsRadius),
          ip_restriction_enabled: settingsIpEnabled,
          allowed_ip_ranges: settingsIpRanges
        })
      });
      if (res.ok) {
        setSettingsMessage('Settings updated successfully!');
        setTimeout(() => setSettingsMessage(''), 3000);
      } else {
        const errData = await res.json();
        setSettingsError(errData.detail || 'Failed to update settings.');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setSettingsError('Failed to connect to backend server.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSpeak = (textEnglish, textHindi, textHinglish, forceLanguage = null) => {
    if (!voiceEnabled || !window.speechSynthesis) return;

    const lang = forceLanguage || voiceLanguage;
    let speakTxt = textEnglish;
    let locale = 'en-US';

    if (lang === 'hindi') {
      speakTxt = textHindi;
      locale = 'hi-IN';
    } else if (lang === 'hinglish') {
      speakTxt = textHinglish;
      locale = 'hi-IN'; // Using Hindi engine for mixed Hinglish text reads it best
    }

    // Cancel current speech to prevent queuing delay
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(speakTxt);
    utterance.volume = voiceVolume;
    utterance.rate = voiceSpeed;
    utterance.pitch = voicePitch;
    utterance.lang = locale;

    // Find and set system voices
    const voices = window.speechSynthesis.getVoices();
    let matchedVoice = null;

    if (locale.startsWith('hi')) {
      matchedVoice = voices.find(v => v.lang.startsWith('hi-') || v.lang.includes('Hindi'));
    }
    
    if (!matchedVoice) {
      matchedVoice = voices.find(v => v.lang.startsWith('en-') || v.lang.includes('English'));
    }

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    window.speechSynthesis.speak(utterance);

    // Robotic vocoder voice delay effect
    if (voiceRobotEffect) {
      setTimeout(() => {
        const roboUtterance = new SpeechSynthesisUtterance(speakTxt);
        roboUtterance.volume = voiceVolume * 0.45;
        roboUtterance.rate = voiceSpeed;
        roboUtterance.pitch = Math.max(0.5, voicePitch * 0.75);
        roboUtterance.lang = locale;
        if (matchedVoice) {
          roboUtterance.voice = matchedVoice;
        }
        window.speechSynthesis.speak(roboUtterance);
      }, 60);
    }
  };

  // Webcam Capture & Training handlers

  const startWebcam = async () => {
    setWebcamError('');
    setWebcamBootActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      if (attendanceVideoRef.current) {
        attendanceVideoRef.current.srcObject = stream;
      }
      attendanceStreamRef.current = stream;
      setScanStatus('Boot sequence...');
      addDiagnosticLog('Optical array initializing: SEC_CAM_01');
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
    handleSpeak(
      "Scanner started. Ready for scanning.",
      "स्कैनर शुरू हो गया है। कृपया कैमरे की तरफ देखें।",
      "Scanner start ho gaya hai. Please camera ki taraf dekhein."
    );
  }, []);

  const stopAttendanceCam = () => {
    playCyberSound('click');
    if (attendanceStreamRef.current) {
      attendanceStreamRef.current.getTracks().forEach(track => track.stop());
      attendanceStreamRef.current = null;
    }
    if (attendanceVideoRef.current) {
      attendanceVideoRef.current.srcObject = null;
    }
    if (attendanceCanvasRef.current) {
      const canvas = attendanceCanvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setScannerBootActive(false);
    setAttendanceActive(false);
    setUserCoords(null);
    setGeoTrackingError('');
    setScanStatus('Camera Offline');
    setDiagnosticWarnings({ lighting: '', distance: '' });
    addDiagnosticLog('Ocular feed terminated.');
    handleSpeak(
      "Scanner stopped.",
      "स्कैनर बंद कर दिया गया है।",
      "Scanner stop ho gaya hai."
    );
  };


  const triggerFaceRecognition = async () => {
    if (!attendanceVideoRef.current || !attendanceCanvasRef.current) return;
    const video = attendanceVideoRef.current;
    const canvas = attendanceCanvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = 640;
    canvas.height = 480;
    
    // Capture high quality frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append('file', blob, 'frame.jpg');

      try {
        setIsScanning(true);
        setScanStatus('Logging presence...');
        addDiagnosticLog('Signature acquisition: Compiling SFace vector...');
        
        const queryParams = new URLSearchParams();
        if (userCoords) {
          queryParams.append('latitude', userCoords.latitude);
          queryParams.append('longitude', userCoords.longitude);
        }
        if (selectedSubjectId) {
          queryParams.append('subject_id', selectedSubjectId);
        }
        if (userRole === 'teacher' && sessionActive) {
          queryParams.append('custom_date', sessionDate);
          queryParams.append('custom_time', sessionPeriod);
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
            const matched = data.results[0];
            const { user_id, name, roll, dep, newly_marked, confidence } = matched;

            setScanStatus(newly_marked ? `Recognized: ${name} (${confidence}%)` : `Recognized: ${name} (Already Marked)`);
            playCyberSound('success');
            
            const now = new Date();
            const timeStr = (userRole === 'teacher' && sessionActive) ? sessionPeriod : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = (userRole === 'teacher' && sessionActive) ? sessionDate.split('-').reverse().join('/') : now.toLocaleDateString();

            setScannedStudent({ name, roll, dep, time: timeStr });
            addDiagnosticLog(`MATCH FOUND: ${name} (Accuracy: ${confidence}%)`);

            setRecognizedStudents(prev => {
              if (prev.some(s => s.id === user_id)) {
                return prev;
              }
              return [
                {
                  id: user_id,
                  name,
                  roll,
                  dep,
                  time: timeStr,
                  date: dateStr,
                  status: newly_marked ? 'Present' : 'Already Marked'
                },
                ...prev
              ];
            });
            fetchStats();
            fetchLogs();

            if (newly_marked) {
              handleSpeak(
                `Attendance marked for ${name}.`,
                `${name} की उपस्थिति दर्ज कर ली गई है।`,
                `${name}, aapki attendance lag gayi hai.`
              );
            } else {
              handleSpeak(
                `${name}, your attendance is already marked.`,
                `${name}, आपकी उपस्थिति पहले ही दर्ज हो चुकी है।`,
                `${name}, aapki attendance already marked hai.`
              );
            }
          } else {
            playCyberSound('error');
            setScanStatus('Face recognition failed. Look straight at the camera.');
            addDiagnosticLog('Match failed: Face signature unrecognized');
            handleSpeak(
              "Face not recognized. Please try again.",
              "चेहरा नहीं पहचाना जा सका। कृपया पुनः प्रयास करें।",
              "Face recognize nahi hua. Please fir se try karein."
            );
          }
        } else if (res.status === 403) {
          playCyberSound('error');
          const errData = await res.json();
          const detail = errData.detail || 'Access Denied: Geofence or IP restricted.';
          setScanStatus(detail);
          addDiagnosticLog('SECURITY ALERT: Geofence boundaries breached');
          handleSpeak(
            "Access denied.",
            "प्रवेश निषेध।",
            "Access denied."
          );
        } else {
          playCyberSound('error');
          setScanStatus('Scanning failed. Server error.');
          addDiagnosticLog('ERROR: Frame matching failed.');
          handleSpeak(
            "Scanning failed. Server error.",
            "स्कैन विफल रहा। सर्वर त्रुटि।",
            "Scanning fail ho gayi. Server error."
          );
        }
      } catch (err) {
        console.error('Error matching face embedding:', err);
        addDiagnosticLog('ERROR: Match server timed out.');
      } finally {
        setIsScanning(false);
        // Reset liveness status after 4 seconds to scan next student
        setTimeout(() => {
          setScannedStudent(null);
          eyeStateRef.current = 'open';
          livenessStatusRef.current = 'verifying';
          setLivenessStatus('verifying');
          setLivenessMessage('Please blink your eyes to verify.');
          setScanStatus('Scanning...');
          if (voiceAnnounceLiveness) {
            handleSpeak(
              "Please blink your eyes to verify.",
              "सत्यापन के लिए कृपया अपनी पलकें झपकाएं।",
              "Please verify karne ke liye eyes blink karein."
            );
          }
        }, 4000);
      }
    }, 'image/jpeg', 0.9);
  };

  // Apply theme class to body and update localStorage
  useEffect(() => {
    document.body.setAttribute('data-theme', activeTheme);
    localStorage.setItem('theme', activeTheme);
    addDiagnosticLog(`Interface theme set to: ${activeTheme.toUpperCase()}`);
  }, [activeTheme]);

  // Matrix falling code rain effect for login page background
  useEffect(() => {
    if (token) return;
    const canvas = document.getElementById('login-rain-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let resizeTimer;
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    let themeColor = '#00f2fe';
    if (activeTheme === 'matrix') themeColor = '#00ff46';
    else if (activeTheme === 'obsidian') themeColor = '#ff3e3e';
    else if (activeTheme === 'violet') themeColor = '#a855f7';
    
    const fontSize = 14;
    const columns = Math.ceil(window.innerWidth / fontSize) || 80;
    const rainDrops = Array(columns).fill().map(() => Math.floor(Math.random() * -50));
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';
    
    const draw = () => {
      ctx.fillStyle = 'rgba(7, 11, 18, 0.12)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.font = `${fontSize}px monospace`;
      
      for (let i = 0; i < rainDrops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = rainDrops[i] * fontSize;
        
        if (rainDrops[i] === 0) {
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = themeColor;
        }
        
        ctx.fillText(char, x, y);
        
        if (y > canvas.height && Math.random() > 0.975) {
          rainDrops[i] = 0;
        }
        rainDrops[i]++;
      }
    };
    
    const interval = setInterval(draw, 33);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [token, activeTheme]);

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
      
    } catch (e) {
      console.error("Hum Drone error:", e);
    }
    
    return () => {
      try {
        if (osc1) osc1.stop();
        if (osc2) osc2.stop();
        if (audioCtx) audioCtx.close();
      } catch (e) {}
    };
  }, [ambientHumActive, ambientHumVolume, isScanning, attendanceActive, webcamActive, studentWebcamActive]);

  // HTML5 Canvas Neural Mesh Graph Animation
  useEffect(() => {
    if (activeTab !== 'dashboard' || !token) return;
    const canvas = document.getElementById('neural-mesh-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId;
    
    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const primaryColor = activeTheme === 'matrix' ? '#00ff46' :
                          activeTheme === 'obsidian' ? '#ff3e3e' :
                          activeTheme === 'violet' ? '#a855f7' : '#00f2fe';
    
    const particleCount = 35;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 1.5,
        pulseSpeed: 0.05 + Math.random() * 0.05,
        pulseValue: Math.random()
      });
    }
    
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
        maxRadius: 120,
        speed: 3,
        opacity: 0.6
      });
      playCyberSound('click');
    };
    canvas.addEventListener('click', handleCanvasClick);
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      ripples = ripples.filter(r => r.radius < r.maxRadius);
      ripples.forEach(r => {
        r.radius += r.speed;
        r.opacity = 1 - (r.radius / r.maxRadius);
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = r.opacity;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1.0;
      
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 100) {
            p.x -= dx * 0.02;
            p.y -= dy * 0.02;
          }
        }
        
        ripples.forEach(r => {
          const dx = p.x - r.x;
          const dy = p.y - r.y;
          const dist = Math.hypot(dx, dy);
          if (Math.abs(dist - r.radius) < 5) {
            p.x += (dx / dist) * 12;
            p.y += (dy / dist) * 12;
          }
        });
        
        p.pulseValue += p.pulseSpeed;
        const glowOpacity = 0.4 + Math.sin(p.pulseValue) * 0.3;
        ctx.fillStyle = primaryColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = primaryColor;
        ctx.globalAlpha = glowOpacity;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 85) {
            const lineOpacity = (1 - (dist / 85)) * 0.25;
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 1;
            ctx.globalAlpha = lineOpacity;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });
      
      ctx.globalAlpha = 1.0;
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
  }, [activeTab, token, activeTheme]);

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
    } catch (e) {
      console.error(e);
    }
    return () => {
      clearInterval(timer);
      if (osc) {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      }
      if (gain) {
        try { gain.disconnect(); } catch (e) {}
      }
      if (ctx) {
        try { ctx.close(); } catch (e) {}
      }
    };
  }, [lockdownActive, soundEnabled, audioVolume]);

  // Initialize and run FaceMesh liveness detection loop
  useEffect(() => {
    if (!attendanceActive || !attendanceVideoRef.current) {
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
      handleSpeak(
        "Please blink your eyes to verify.",
        "सत्यापन के लिए कृपया अपनी पलकें झपकाएं।",
        "Please verify karne ke liye eyes blink karein."
      );
    }

    const faceMesh = new window.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
      if (!attendanceActive) return;

      const canvas = attendanceCanvasRef.current;
      if (canvas) {
        const video = attendanceVideoRef.current;
        if (video) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          const landmarks = results.multiFaceLandmarks[0];
          
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
          } catch (e) {
            console.error("Luminance sampling error:", e);
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

          const leftEAR = calculateEAR(landmarks, LEFT_EYE_INDICES);
          const rightEAR = calculateEAR(landmarks, RIGHT_EYE_INDICES);
          const avgEAR = (leftEAR + rightEAR) / 2.0;

          if (livenessStatusRef.current === 'verifying') {
            if (avgEAR < 0.18) {
              eyeStateRef.current = 'closed';
              setLivenessMessage('Eyes Closed. Now open them.');
              addDiagnosticLog('Ocular state: Blink trigger detected');
            } else if (avgEAR > 0.24 && eyeStateRef.current === 'closed') {
              eyeStateRef.current = 'open';
              livenessStatusRef.current = 'verified';
              setLivenessStatus('verified');
              setLivenessMessage('Liveness Verified! Scanning face...');
              addDiagnosticLog('Ocular verification complete: PASS');
              
              if (voiceAnnounceLiveness) {
                handleSpeak(
                  "Liveness verified. Scanning face.",
                  "सत्यापन सफल रहा। चेहरा स्कैन किया जा रहा है।",
                  "Liveness verified. Face scan ho raha hai."
                );
              }
              
              triggerFaceRecognition();
            }
          }
        } else {
          // setDiagnosticWarnings({ lighting: '', distance: '' }); // disabled
        }
      }
    });

    faceMeshRef.current = faceMesh;

    const video = attendanceVideoRef.current;
    let active = true;

    const sendFrames = async () => {
      if (!active || !attendanceActive) return;
      
      if (video.readyState === 4 && video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          await faceMesh.send({ image: video });
        } catch (err) {
          console.error("FaceMesh send frame error:", err);
        }
      }
      
      if (active && attendanceActive) {
        requestAnimationFrame(sendFrames);
      }
    };

    setTimeout(sendFrames, 1000);

    return () => {
      active = false;
      livenessStatusRef.current = 'pending';
      setLivenessStatus('pending');
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
        faceMeshRef.current = null;
      }
    };
  }, [attendanceActive]);

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
      const res = await fetch(`${API_BASE_URL}/users/students/train`, {
        method: 'POST'
      });
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
      const res = await fetch(`${API_BASE_URL}/attendance/report?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
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
      if (userRole === 'teacher') {
        if (selectedReportSubjectId) {
          queryParams.append('subject_id', selectedReportSubjectId);
        } else {
          const teacherSubjects = subjects.filter(s => s.teacher_id === currentUser?.details?.id);
          if (teacherSubjects.length > 0) {
            queryParams.append('subject_id', teacherSubjects[0].id.toString());
          }
        }
      }
      const res = await fetch(`${API_BASE_URL}/attendance/send-absentee-alerts?${queryParams.toString()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Absentee warning emails queued successfully!");
      } else {
        alert(`Error: ${data.detail || "Failed to send absentee alerts."}`);
      }
    } catch (err) {
      alert("Connection failed. Make sure the backend server is running.");
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

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Report_${reportStartDate}_to_${reportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      
      let downloadName = `Attendance_Report_${reportStartDate}_to_${reportEndDate}.pdf`;
      if (userRole === 'admin') {
        const deptStr = reportDeptFilter ? reportDeptFilter.replace(/\s+/g, '_') : 'All';
        downloadName = `Attendance_Report_${deptStr}_${reportStartDate}_to_${reportEndDate}.pdf`;
      } else if (userRole === 'teacher') {
        const subjectIdToUse = selectedReportSubjectId || subjects.filter(s => s.teacher_id === currentUser?.details?.id)[0]?.id;
        const subCode = subjects.find(s => s.id === parseInt(subjectIdToUse))?.code || 'Subject';
        downloadName = `Attendance_Report_${subCode}_${reportStartDate}_to_${reportEndDate}.pdf`;
      }
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUserRole(data.role);
        setCurrentUser(data);
        localStorage.setItem('userRole', data.role);
        
        if (!sessionInitializedRef.current) {
          sessionInitializedRef.current = true;
          if (data.role === 'student') {
            setActiveTab('student-attendance');
          } else {
            setActiveTab('dashboard');
          }
        }
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error("Failed to fetch session info:", err);
      handleLogout();
    }
  };

  // Fetch student personal logs
  const fetchStudentLogs = async (authToken) => {
    setIsLoadingStudentLogs(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/students/me/attendance`, {
        headers: {
          'Authorization': `Bearer ${authToken || token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStudentLogs(data);
      } else {
        console.error("Failed to fetch student attendance logs");
      }
    } catch (err) {
      console.error("Error fetching student attendance logs:", err);
    } finally {
      setIsLoadingStudentLogs(false);
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
    try {
      const res = await fetch(`${API_BASE_URL}/users/students/me/change-password`, {
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
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

      const data = await res.json();
      if (res.ok) {
        playCyberSound('success');
        setSelfieSuccess('Face registered successfully! Embedded SFace vector updated.');
        // Refresh session details to update badge
        fetchSessionInfo(token);
        stopStudentWebcam();
      } else {
        playCyberSound('error');
        setSelfieError(data.detail || 'Quality check failed. Please ensure face is clear and well-lit.');
      }
    } catch (err) {
      playCyberSound('error');
      setSelfieError('Connection failed. Make sure the backend server is running.');
    } finally {
      setIsUploadingSelfie(false);
    }
  };

  // Initialize session on mount or token change
  useEffect(() => {
    if (token) {
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

  const navigateToTab = useCallback((tabId) => {
    setActiveTab(tabId);
    setMobileSidebarOpen(false);
    setMobileControlOpen(false);
    playCyberSound('click');
  }, []);

  const handleBottomScan = useCallback(() => {
    playCyberSound('click');
    setActiveTab('attendance');
    setShowScannerModal(true);
    setMobileControlOpen(false);
  }, []);

  // Load core data once after login
  useEffect(() => {
    if (!token || !userRole) return;

    if (userRole === 'student') {
      fetchStudentLogs(token);
      if (currentUser?.details) {
        fetchStudentSubjectStats(currentUser.details.dep, currentUser.details.id);
      }
      return;
    }

    fetchSubjects().then(() => fetchStudents());
    fetchStats();
    fetchLogs();
    fetchSchedules();
    if (userRole === 'admin') {
      fetchTeachers();
    }
  }, [token, userRole]);

  // Refresh data when switching tabs
  useEffect(() => {
    if (!token || !userRole) return;

    switch (activeTab) {
      case 'dashboard':
        fetchStats();
        fetchLogs();
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
        fetchReport();
        break;
      case 'session-history':
        fetchSessionHistory();
        break;
      case 'settings':
        if (userRole === 'admin') fetchSystemSettings();
        break;
      case 'teachers':
        if (userRole === 'admin') {
          fetchTeachers();
          fetchSchedules();
          fetchSubjects();
        }
        break;
      case 'student-attendance':
        fetchStudentLogs(token);
        if (currentUser?.details) {
          fetchStudentSubjectStats(currentUser.details.dep, currentUser.details.id);
        }
        break;
      default:
        break;
    }
  }, [activeTab, token, userRole, selectedSubjectId, selectedTeacherSubjectId, selectedReportSubjectId]);

  // Poll only on active dashboard/logs tabs (slower on mobile)
  useEffect(() => {
    if (!token || !userRole || userRole === 'student') return;
    if (activeTab !== 'dashboard' && activeTab !== 'logs') return;

    const pollMs = isMobileView ? 12000 : 8000;
    const interval = setInterval(() => {
      if (activeTab === 'dashboard') fetchStats();
      fetchLogs();
    }, pollMs);
    return () => clearInterval(interval);
  }, [token, userRole, activeTab, isMobileView]);

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


  const getRoleMismatchMessage = (expectedRole, actualRole) => {
    const portalNames = { student: 'Student', teacher: 'Teacher', admin: 'Admin' };
    const expected = portalNames[expectedRole] || expectedRole;
    const actual = portalNames[actualRole] || actualRole;
    return `Yeh ${actual} account hai. Kripya sahi portal "${expected} Portal" me jaa kar login karein.`;
  };

  // Handle Login submission
  const handleLogin = async (e) => {
    e.preventDefault();
    playCyberSound('click');
    setAuthError('');
    setIsLoading(true);

    const formData = new URLSearchParams();
    formData.append('username', loginEmail);
    formData.append('password', loginPassword);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.role !== loginRole) {
            playCyberSound('error');
            setAuthError(getRoleMismatchMessage(loginRole, meData.role));
            setIsLoading(false);
            return;
          }
        }

        playCyberSound('success');
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('loginRole', loginRole);
        setToken(data.access_token);
      } else {
        playCyberSound('error');
        setAuthError(data.detail || 'Incorrect email or password');
      }
    } catch (err) {
      playCyberSound('error');
      setAuthError('Connection refused. Is the API server running?');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    playCyberSound('click');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    sessionInitializedRef.current = false;
    setToken('');
    setUserRole('');
    setCurrentUser(null);
    setStudentLogs([]);
    setActiveTab('dashboard');
  };

  // Delete Student
  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student? All attendance records for this student will also be deleted.')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users/students/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchStudents();
        fetchStats();
        fetchLogs();
      } else {
        alert('Failed to delete student');
      }
    } catch (err) {
      console.error('Error deleting student:', err);
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

    try {
      const res = await fetch(`${API_BASE_URL}/users/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newStudent,
          id: parseInt(newStudent.id)
        })
      });

      const data = await res.json();
      if (res.ok) {
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
      } else {
        setFormError(data.detail || 'Failed to register student.');
      }
    } catch (err) {
      setFormError('Failed to connect to API.');
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

    try {
      const res = await fetch(`${API_BASE_URL}/users/students/${editingStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
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
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditStudentSuccess('Student details updated successfully!');
        fetchStudents();
        setTimeout(() => {
          setShowEditStudentModal(false);
          setEditingStudent(null);
          setEditStudentSuccess('');
        }, 1500);
      } else {
        setEditStudentError(data.detail || 'Failed to update student details.');
      }
    } catch (err) {
      setEditStudentError('Connection failed.');
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
      const res = await fetch(`${API_BASE_URL}/users/students/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingStudentSelf.name,
          phone: editingStudentSelf.phone,
          address: editingStudentSelf.address,
          gender: editingStudentSelf.gender,
          dob: editingStudentSelf.dob
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditStudentSelfSuccess('Your profile details updated successfully!');
        fetchSessionInfo(token);
        setTimeout(() => {
          setShowEditStudentSelfModal(false);
          setEditStudentSelfSuccess('');
        }, 1500);
      } else {
        setEditStudentSelfError(data.detail || 'Failed to update profile details.');
      }
    } catch (err) {
      setEditStudentSelfError('Connection failed.');
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

    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTeacher)
      });
      const data = await res.json();
      if (res.ok) {
        setTeacherSuccess('Teacher registered successfully!');
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
        setTeacherError(data.detail || 'Failed to register teacher.');
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

    try {
      const res = await fetch(`${API_BASE_URL}/users/${editingTeacher.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editingTeacher.name,
          email: editingTeacher.email,
          password: editingTeacher.password ? editingTeacher.password : undefined,
          role: editingTeacher.role,
          subject_name: editingTeacher.subject_name || '',
          subject_code: editingTeacher.subject_code || '',
          subject_department: editingTeacher.subject_department || 'CSE(IOT)'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setTeacherSuccess('Teacher details updated successfully!');
        fetchTeachers();
        setEditingTeacher(null);
      } else {
        setTeacherError(data.detail || 'Failed to update teacher.');
      }
    } catch (err) {
      setTeacherError('Connection failed.');
    }
  };

  // Delete Teaching Staff Account
  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher account?')) {
      return;
    }
    setTeacherError('');
    setTeacherSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
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

  const handleAddSubject = async (e) => {
    e.preventDefault();
    setSubjectError('');
    setSubjectSuccess('');

    if (!newSubject.name || !newSubject.code || !newSubject.department) {
      setSubjectError('Name, Code, and Department are required.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newSubject.name,
          code: newSubject.code,
          department: newSubject.department,
          teacher_id: newSubject.teacher_id ? parseInt(newSubject.teacher_id) : null
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSubjectSuccess('Subject registered successfully!');
        fetchSubjects();
        setNewSubject({ name: '', code: '', department: 'CSE(IOT)', teacher_id: '' });
      } else {
        setSubjectError(data.detail || 'Failed to register subject.');
      }
    } catch (err) {
      setSubjectError('Failed to connect to API.');
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

    try {
      const res = await fetch(`${API_BASE_URL}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject_id: parseInt(newSchedule.subject_id),
          day_of_week: newSchedule.day_of_week,
          start_time: newSchedule.start_time,
          end_time: newSchedule.end_time
        })
      });

      const data = await res.json();
      if (res.ok) {
        setScheduleSuccess('Schedule registered successfully!');
        fetchSchedules();
        setNewSchedule({ subject_id: '', day_of_week: 'Monday', start_time: '', end_time: '' });
      } else {
        setScheduleError(data.detail || 'Failed to register schedule.');
      }
    } catch (err) {
      setScheduleError('Failed to connect to API.');
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

    filteredLogs.forEach(log => {
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

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering lists
  const filteredStudents = students.filter(student => {
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

  const filteredLogs = logs.filter(log => {
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


  // Unique departments for filtering
  const departments = [...new Set(students.map(s => s.dep))];

  // Login Page View
  if (token && !currentUser) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', background: '#070b12', color: '#00f2fe', flexDirection: 'column', gap: '20px' }}>
        <div style={{ width: '50px', height: '50px', border: '3px solid rgba(0, 242, 254, 0.2)', borderTopColor: '#00f2fe', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <h3 style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>INITIALIZING NEURAL LINK...</h3>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
        onSubmit={handleLogin}
        crtOverlayEnabled={crtOverlayEnabled}
      />
    );
  }

  // Dashboard Main View
  return (
    <div className="app-container">
      {crtOverlayEnabled && <div className="crt-overlay crt-active" />}
      {crtOverlayEnabled && <div className="crt-vignette" />}

      {/* ===== FULLSCREEN SCANNER MODAL ===== */}
      {showScannerModal && (
        <div
          id="scanner-modal-overlay"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          {/* Modal Header */}
          <div style={{
            width: '100%', maxWidth: '680px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: attendanceActive ? '#10b981' : '#6b7280',
                boxShadow: attendanceActive ? '0 0 8px #10b981' : 'none',
                animation: attendanceActive ? 'pulse 1.5s infinite' : 'none',
              }} />
              <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: '1rem', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.05em' }}>
                FACE RECOGNITION SCANNER
              </span>
              <span style={{
                background: attendanceActive ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                border: `1px solid ${attendanceActive ? '#10b981' : '#6b7280'}`,
                color: attendanceActive ? '#10b981' : '#9ca3af',
                borderRadius: '6px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700
              }}>{scanStatus}</span>
            </div>
            <button
              onClick={() => {
                stopAttendanceCam();
                setShowScannerModal(false);
              }}
              style={{
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                color: '#ef4444', borderRadius: '10px', padding: '8px 18px',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                transition: 'all 0.2s ease',
              }}
            >✕ Close</button>
          </div>

          {/* Camera View */}
          <div style={{
            position: 'relative', width: '100%', maxWidth: '680px',
            aspectRatio: '4/3', background: '#000',
            borderRadius: '16px', overflow: 'hidden',
            border: `2px solid ${attendanceActive ? 'rgba(0,242,254,0.4)' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: attendanceActive ? '0 0 40px rgba(0,242,254,0.15)' : 'none',
            margin: '0 16px',
          }}>
            {/* Corner HUD decoration */}
            <div style={{ position: 'absolute', top: 12, left: 12, width: 28, height: 28, borderTop: '3px solid #00f2fe', borderLeft: '3px solid #00f2fe', borderRadius: '3px 0 0 0', zIndex: 10, opacity: 0.8 }} />
            <div style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderTop: '3px solid #00f2fe', borderRight: '3px solid #00f2fe', borderRadius: '0 3px 0 0', zIndex: 10, opacity: 0.8 }} />
            <div style={{ position: 'absolute', bottom: 12, left: 12, width: 28, height: 28, borderBottom: '3px solid #00f2fe', borderLeft: '3px solid #00f2fe', borderRadius: '0 0 0 3px', zIndex: 10, opacity: 0.8 }} />
            <div style={{ position: 'absolute', bottom: 12, right: 12, width: 28, height: 28, borderBottom: '3px solid #00f2fe', borderRight: '3px solid #00f2fe', borderRadius: '0 0 3px 0', zIndex: 10, opacity: 0.8 }} />

            {/* Scanning line animation */}
            {attendanceActive && !scannerBootActive && (
              <div style={{
                position: 'absolute', left: 0, right: 0, height: '2px',
                background: 'linear-gradient(90deg, transparent, #00f2fe, transparent)',
                zIndex: 10, animation: 'scanLine 3s linear infinite', opacity: 0.7,
              }} />
            )}

            {/* Robotic boot sequence */}
            <ScannerBootOverlay
              active={scannerBootActive}
              onComplete={handleScannerBootComplete}
              label="SEC_CAM_01"
            />

            {/* Live HUD after boot */}
            {attendanceActive && !scannerBootActive && (
              <div className="scanner-live-hud">
                <div className="scanner-live-grid" />
                <div className="scanner-live-radar-mini" />
                <div className="scanner-live-status">● BIOMETRIC SCAN ACTIVE</div>
              </div>
            )}

            {/* Video element */}
            <video
              ref={attendanceVideoRef}
              autoPlay
              playsInline
              muted
              className={scannerBootActive ? 'scanner-video-booting' : ''}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transform: 'scaleX(-1)',
                display: (attendanceActive || scannerBootActive) ? 'block' : 'none',
              }}
            />
            <canvas ref={attendanceCanvasRef} style={{ display: 'none' }} />

            {/* Offline placeholder */}
            {!attendanceActive && !scannerBootActive && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'radial-gradient(ellipse at center, rgba(0,242,254,0.04) 0%, rgba(0,0,0,0.8) 70%)',
                gap: '14px',
              }}>
                <Camera size={52} style={{ color: 'rgba(0,242,254,0.3)' }} />
                <p style={{ color: '#6b7280', fontSize: '0.95rem', fontWeight: 600 }}>Camera Offline</p>
                <p style={{ color: '#4b5563', fontSize: '0.78rem' }}>Press "Start Scanner" to begin</p>
              </div>
            )}
          </div>

          {/* Modal Controls */}
          <div style={{
            width: '100%', maxWidth: '680px',
            padding: '16px 20px',
            display: 'flex', gap: '12px', justifyContent: 'center',
          }}>
            {!attendanceActive && !scannerBootActive ? (
              <button
                onClick={startAttendanceCam}
                style={{
                  flex: 1, padding: '14px 24px',
                  background: 'linear-gradient(135deg, #00f2fe, #0ea5e9)',
                  border: 'none', borderRadius: '12px',
                  color: '#000', fontWeight: 800, fontSize: '1rem',
                  cursor: 'pointer', letterSpacing: '0.04em',
                  boxShadow: '0 6px 24px rgba(0,242,254,0.35)',
                  transition: 'all 0.2s ease',
                }}
              >▶ Start Scanner</button>
            ) : (
              <button
                onClick={stopAttendanceCam}
                style={{
                  flex: 1, padding: '14px 24px',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  border: 'none', borderRadius: '12px',
                  color: '#fff', fontWeight: 800, fontSize: '1rem',
                  cursor: 'pointer', letterSpacing: '0.04em',
                  boxShadow: '0 6px 24px rgba(239,68,68,0.35)',
                  transition: 'all 0.2s ease',
                }}
              >⏹ Stop Scanner</button>
            )}
          </div>

          {/* Liveness & error messages */}
          {attendanceError && (
            <div style={{
              width: '100%', maxWidth: '680px',
              padding: '10px 20px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px', margin: '0 16px',
              color: '#ef4444', fontSize: '0.85rem', fontWeight: 600,
            }}>{attendanceError}</div>
          )}
          {livenessMessage && attendanceActive && (
            <div style={{
              width: '100%', maxWidth: '680px',
              padding: '10px 20px',
              background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.2)',
              borderRadius: '10px', margin: '8px 16px 0',
              color: '#00f2fe', fontSize: '0.85rem', fontWeight: 600,
              textAlign: 'center',
            }}>{livenessMessage}</div>
          )}
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
        onClick={(e) => {
          if (e.target.closest('.nav-item')) {
            setMobileSidebarOpen(false);
          }
        }}
      >
        <div className="sidebar-logo">
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.15) 0%, rgba(79, 172, 254, 0.15) 100%)',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            borderRadius: '10px',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={24} style={{ color: '#00f2fe' }} />
          </div>
          <span className="text-gradient" style={{ fontWeight: 800 }}>SMART AI</span>
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
                  onClick={() => { setActiveTab('attendance'); playCyberSound('click'); }}
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
              {userRole === 'admin' && (
                <li>
                  <button 
                    className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                    onClick={() => { setActiveTab('settings'); playCyberSound('click'); }}
                  >
                    <ShieldCheck size={18} />
                    Security Settings
                  </button>
                </li>
              )}
            </>
          )}
        </ul>

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
        {/* Header */}
        <header className="flex-between header-container" style={{ marginBottom: '40px' }}>
          <div className="header-title-area" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              className="hamburger-btn" 
              onClick={() => { setMobileSidebarOpen(true); playCyberSound('click'); }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                {activeTab === 'dashboard' && (userRole === 'teacher' ? 'Teacher Dashboard' : 'Admin Dashboard')}
                {activeTab === 'students' && 'Student Directory'}
                {activeTab === 'teachers' && 'Teacher Directory'}
                {activeTab === 'logs' && 'Real-time Logs'}
                {activeTab === 'attendance' && 'Live Scanner'}
                {activeTab === 'reports' && 'Attendance Reports & Alerts'}
                {activeTab === 'session-history' && 'Session-wise History'}
                {activeTab === 'student-attendance' && `Welcome, ${currentUser?.name || 'Student'}`}
                {activeTab === 'student-profile' && 'My Academic Profile'}
                {activeTab === 'settings' && 'Security & System Settings'}
              </h1>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                {activeTab === 'dashboard' && 'Visualizing attendance logs and statistics'}
                {activeTab === 'students' && 'Manage registered students and profiles'}
                {activeTab === 'teachers' && 'Manage registered teaching staff and weekly timetables'}
                {activeTab === 'logs' && 'View and download student attendance registers'}
                {activeTab === 'attendance' && 'Log attendance using live facial recognition scanner'}
                {activeTab === 'reports' && 'Generate academic reports, analytics, and attendance alerts'}
                {activeTab === 'session-history' && 'Track day-by-day session registers and student present/absent statuses'}
                {activeTab === 'student-attendance' && 'Track your attendance history and metrics'}
                {activeTab === 'student-profile' && 'View and manage your personal credentials'}
                {activeTab === 'settings' && 'Manage campus geofencing and IP subnet restriction boundaries'}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {activeTab === 'students' && (
              <>
                <button 
                  onClick={() => {
                    // Auto-fill teacher name and department when teacher opens this form
                    if (userRole === 'teacher' && currentUser?.details) {
                      const teacherSubject = subjects.find(s => s.teacher_id === currentUser.details.id);
                      setNewStudent(prev => ({
                        ...prev,
                        teacher: currentUser.details.name || '',
                        dep: teacherSubject?.department || prev.dep,
                      }));
                    }
                    setShowAddModal(true);
                  }}
                  className="bg-gradient-btn"
                  style={{ padding: '10px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
                >
                  <Plus size={18} />
                  Register Student
                </button>
              </>
            )}
            {activeTab === 'logs' && (
              <button 
                onClick={exportToCSV}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
                disabled={filteredLogs.length === 0}
              >
                <FileSpreadsheet size={18} />
                Export to CSV
              </button>
            )}
            {activeTab === 'reports' && (
              <>
                <button 
                  onClick={printReport}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
                  disabled={reportData.students.length === 0}
                >
                  <BookOpen size={18} />
                  Print Report
                </button>
                <button 
                  onClick={exportReportToCSV}
                  className="bg-gradient-btn"
                  style={{ padding: '10px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
                  disabled={reportData.students.length === 0}
                >
                  <FileSpreadsheet size={18} />
                  Export CSV
                </button>
                <button 
                  onClick={downloadReportPDF}
                  className="bg-gradient-btn"
                  style={{ padding: '10px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', borderColor: '#0284c7' }}
                  disabled={reportData.students.length === 0}
                >
                  <FileDown size={18} />
                  Download PDF
                </button>
                <button 
                  onClick={handleSendAbsenteeAlerts}
                  className="btn-danger"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', padding: '10px 18px', borderRadius: '8px' }}
                  disabled={isSendingAlerts}
                >
                  <Mail size={18} />
                  {isSendingAlerts ? 'Sending Alerts...' : 'Send Absentee Alerts'}
                </button>
              </>
            )}
          </div>
        </header>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div style={{ animation: 'fadeInUp 0.6s ease both' }}>
            {/* Metric Summary Cards */}
            <div className="dashboard-grid">
              <div className="glass-panel metric-card" style={{ 
                animationDelay: '100ms',
                borderLeft: '4px solid var(--color-primary)'
              }}>
                <div className="metric-info">
                  <h3>Total Students</h3>
                  <p>{stats.total_students}</p>
                </div>
                <div className="metric-icon" style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe' }}>
                  <Users size={22} />
                </div>
              </div>

              <div className="glass-panel metric-card" style={{ 
                animationDelay: '200ms',
                borderLeft: '4px solid var(--color-success)'
              }}>
                <div className="metric-info">
                  <h3>Present Today</h3>
                  <p>{stats.total_present_today}</p>
                </div>
                <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  <CheckCircle2 size={22} />
                </div>
              </div>

              <div className="glass-panel metric-card" style={{ 
                animationDelay: '300ms',
                borderLeft: '4px solid var(--color-danger)'
              }}>
                <div className="metric-info">
                  <h3>Absent Today</h3>
                  <p>{stats.total_absent_today}</p>
                </div>
                <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  <AlertCircle size={22} />
                </div>
              </div>

              <div className="glass-panel metric-card" style={{ 
                animationDelay: '400ms',
                borderLeft: '4px solid var(--color-purple)'
              }}>
                <div className="metric-info">
                  <h3>Presence Rate</h3>
                  <p>{stats.average_attendance_rate}%</p>
                </div>
                <div className="metric-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}>
                  <TrendingUp size={22} />
                </div>
              </div>
            </div>

            {/* Graphs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
              {/* Weekly Trend Line Area Chart */}
              <div className="glass-panel" style={{ padding: '28px', animationDelay: '500ms' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={18} style={{ color: '#00f2fe' }} /> Weekly Attendance Trends
                </h3>
                <div style={{ width: '100%', height: '320px' }}>
                  <ResponsiveContainer>
                    <AreaChart data={stats.weekly_trends}>
                      <defs>
                        <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ 
                        background: '#0d1323', 
                        border: '1px solid rgba(0, 242, 254, 0.25)', 
                        borderRadius: '12px', 
                        color: '#f1f5f9',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                      }} />
                      <Area type="monotone" dataKey="present" stroke="#00f2fe" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department distribution Bar Chart */}
              <div className="glass-panel" style={{ padding: '28px', animationDelay: '600ms' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Layers size={18} style={{ color: '#a78bfa' }} /> Present Today by Dept
                </h3>
                <div style={{ width: '100%', height: '320px' }}>
                  {Object.keys(stats.department_stats).length === 0 ? (
                    <div className="flex-center" style={{ height: '100%', color: '#94a3b8', flexDirection: 'column', gap: '12px' }}>
                      <AlertCircle size={32} style={{ color: '#ef4444' }} />
                      <span>No attendance data marked for today.</span>
                    </div>
                  ) : (
                    <ResponsiveContainer>
                      <BarChart data={Object.keys(stats.department_stats).map(dept => ({ name: dept, count: stats.department_stats[dept] }))}>
                        <defs>
                          <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.6}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ 
                          background: '#0d1323', 
                          border: '1px solid rgba(167, 139, 250, 0.25)', 
                          borderRadius: '12px', 
                          color: '#f1f5f9',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                        }} />
                        <Bar dataKey="count" fill="url(#colorBar)" radius={[6, 6, 0, 0]} barSize={35} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Sonar Radar Stats Card */}
              <div className="glass-panel" style={{ padding: '28px', animationDelay: '700ms', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TrendingUp size={18} style={{ color: activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe' }} /> Perimeter Biometric Radar
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '20px' }}>
                  <svg width="200" height="200" viewBox="0 0 200 200" style={{ filter: `drop-shadow(0 0 8px ${activeTheme === 'matrix' ? 'rgba(0, 255, 70, 0.2)' : activeTheme === 'obsidian' ? 'rgba(255, 62, 62, 0.2)' : activeTheme === 'violet' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 242, 254, 0.2)'})` }}>
                    <defs>
                      <radialGradient id="radarSweepGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe'} stopOpacity="0" />
                        <stop offset="85%" stopColor={activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe'} stopOpacity="0.05" />
                        <stop offset="100%" stopColor={activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe'} stopOpacity="0.25" />
                      </radialGradient>
                    </defs>
                    <circle cx="100" cy="100" r="90" stroke="var(--border-color)" strokeWidth="1" fill="none" opacity="0.3" />
                    <circle cx="100" cy="100" r="70" stroke="var(--border-color)" strokeWidth="1" fill="none" opacity="0.3" strokeDasharray="3 3" />
                    <circle cx="100" cy="100" r="50" stroke="var(--border-color)" strokeWidth="1" fill="none" opacity="0.4" />
                    <circle cx="100" cy="100" r="30" stroke="var(--border-color)" strokeWidth="1" fill="none" opacity="0.4" strokeDasharray="2 2" />
                    <circle cx="100" cy="100" r="10" stroke="var(--border-color)" strokeWidth="1.5" fill="none" opacity="0.6" />
                    
                    <line x1="100" y1="5" x2="100" y2="195" stroke="var(--border-color)" strokeWidth="1" opacity="0.25" />
                    <line x1="5" y1="100" x2="195" y2="100" stroke="var(--border-color)" strokeWidth="1" opacity="0.25" />
                    <line x1="36" y1="36" x2="164" y2="164" stroke="var(--border-color)" strokeWidth="0.5" opacity="0.15" strokeDasharray="3 3" />
                    <line x1="164" y1="36" x2="36" y2="164" stroke="var(--border-color)" strokeWidth="0.5" opacity="0.15" strokeDasharray="3 3" />
                    
                    <g style={{ transformOrigin: '100px 100px', animation: 'radarSweep 4s linear infinite' }}>
                      <line x1="100" y1="100" x2="100" y2="10" stroke={activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe'} strokeWidth="1.5" opacity="0.8" />
                      <polygon points="100,100 100,10 70,18" fill="url(#radarSweepGrad)" opacity="0.5" />
                    </g>

                    <g style={{ animation: 'radarPulse 3s infinite ease-in-out' }}>
                      <circle cx="65" cy="75" r="4.5" fill="#10b981" filter="drop-shadow(0 0 4px #10b981)" />
                    </g>
                    <g style={{ animation: 'radarPulse 2.5s infinite ease-in-out', animationDelay: '0.8s' }}>
                      <circle cx="145" cy="65" r="4" fill={activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe'} filter={`drop-shadow(0 0 4px ${activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe'})`} />
                    </g>
                    <g style={{ animation: 'radarPulse 3.5s infinite ease-in-out', animationDelay: '1.5s' }}>
                      <circle cx="120" cy="135" r="3.5" fill="#f59e0b" filter="drop-shadow(0 0 4px #f59e0b)" />
                    </g>
                  </svg>
                  
                  <div style={{ width: '100%', background: 'rgba(8, 12, 20, 0.25)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>STATUS:</span>{' '}
                      <span style={{ color: '#10b981', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>SCANNING</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>BEACONS:</span>{' '}
                      <span style={{ color: '#f1f5f9', fontWeight: 'bold' }}>4 ACTIVE</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>LIVENESS:</span>{' '}
                      <span style={{ color: activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe', fontWeight: 'bold' }}>SECURE</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)' }}>FPS RATE:</span>{' '}
                      <span style={{ color: '#f1f5f9', fontWeight: 'bold' }}>{hudMetrics.fps} Hz</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Neural Mesh Connectivity Map */}
              <div className="glass-panel" style={{ padding: '28px', animationDelay: '800ms', display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={18} style={{ color: activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe' }} /> Biometric Core Neural Mesh
                </h3>
                <div style={{ position: 'relative', flex: 1, minHeight: '260px', width: '100%', overflow: 'hidden', borderRadius: '12px', background: 'rgba(8, 12, 20, 0.2)', border: '1px solid var(--border-color)' }}>
                  <canvas id="neural-mesh-canvas" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                </div>
              </div>

              {/* System Health & Diagnostics Monitor Widget */}
              <div className="glass-panel" style={{ 
                padding: '28px', 
                animationDelay: '900ms', 
                display: 'flex', 
                flexDirection: 'column', 
                minHeight: '350px' 
              }}>
                <h3 style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 600, 
                  marginBottom: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '10px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={18} style={{ color: activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe' }} />
                    <span>System Health & Diagnostics</span>
                  </div>
                  {systemHealth && (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '4px 8px', 
                      borderRadius: '6px', 
                      background: systemHealth.status === 'HEALTHY' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: systemHealth.status === 'HEALTHY' ? '#10b981' : '#ef4444',
                      fontWeight: 'bold',
                      letterSpacing: '1px'
                    }}>
                      {systemHealth.status}
                    </span>
                  )}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                  {/* Gauge bars for CPU & RAM */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px', fontFamily: 'monospace' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>CPU ENGINE:</span>
                        <span style={{ color: '#f1f5f9', fontWeight: 'bold' }}>{systemHealth ? `${systemHealth.metrics.cpu_percent}%` : '0.0%'}</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: systemHealth ? `${systemHealth.metrics.cpu_percent}%` : '0%', 
                          background: `linear-gradient(90deg, ${activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe'}, ${activeTheme === 'matrix' ? '#00cc38' : activeTheme === 'obsidian' ? '#cc3232' : activeTheme === 'violet' ? '#8b5cf6' : '#4facfe'})`,
                          borderRadius: '4px',
                          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px', fontFamily: 'monospace' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>RAM BUFFER:</span>
                        <span style={{ color: '#f1f5f9', fontWeight: 'bold' }}>{systemHealth ? `${systemHealth.metrics.memory_percent}%` : '0.0%'}</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: systemHealth ? `${systemHealth.metrics.memory_percent}%` : '0%', 
                          background: `linear-gradient(90deg, ${activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe'}, ${activeTheme === 'matrix' ? '#00cc38' : activeTheme === 'obsidian' ? '#cc3232' : activeTheme === 'violet' ? '#8b5cf6' : '#4facfe'})`,
                          borderRadius: '4px',
                          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Core checklist */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '12px 20px', 
                    background: 'rgba(8, 12, 20, 0.25)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '10px', 
                    padding: '16px', 
                    fontSize: '0.8rem',
                    fontFamily: 'monospace'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>DATABASE:</span>
                      <span style={{ 
                        color: systemHealth?.database === 'CONNECTED' ? '#10b981' : '#ef4444', 
                        fontWeight: 'bold' 
                      }}>
                        {systemHealth ? systemHealth.database : 'CHECKING...'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>API LATENCY:</span>
                      <span style={{ 
                        color: apiLatency === -1 ? '#ef4444' : apiLatency < 40 ? '#10b981' : apiLatency < 100 ? '#f59e0b' : '#ef4444',
                        fontWeight: 'bold' 
                      }}>
                        {apiLatency === -1 ? 'OFFLINE' : `${apiLatency} ms`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>DETECTION YUNET:</span>
                      <span style={{ 
                        color: systemHealth?.models?.yunet === 'READY' ? '#10b981' : '#ef4444', 
                        fontWeight: 'bold' 
                      }}>
                        {systemHealth?.models?.yunet || 'CHECKING...'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>RECOGNITION SFACE:</span>
                      <span style={{ 
                        color: systemHealth?.models?.sface === 'READY' ? '#10b981' : '#ef4444', 
                        fontWeight: 'bold' 
                      }}>
                        {systemHealth?.models?.sface || 'CHECKING...'}
                      </span>
                    </div>
                  </div>

                  {/* System details */}
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>UPTIME: <span style={{ color: '#f1f5f9' }}>{systemHealth ? (() => {
                      const sec = systemHealth.metrics.uptime_seconds;
                      const d = Math.floor(sec / (3600*24));
                      const h = Math.floor((sec % (3600*24)) / 3600);
                      const m = Math.floor((sec % 3600) / 60);
                      const s = sec % 60;
                      return `${d}d ${h}h ${m}m ${s}s`;
                    })() : '0d 0h 0m 0s'}</span></div>
                    <div>PLATFORM: <span style={{ color: '#f1f5f9' }}>{systemHealth ? `${systemHealth.platform.system} (${systemHealth.platform.release})` : 'DETECTING...'}</span></div>
                    <div>ENVIRONMENT: <span style={{ color: '#f1f5f9' }}>Python {systemHealth ? systemHealth.platform.python_version : '...'}</span></div>
                  </div>

                  {/* Manual trigger button */}
                  <button 
                    onClick={() => {
                      playCyberSound('click');
                      setHealthLoading(true);
                      fetchSystemHealth().finally(() => {
                        setTimeout(() => setHealthLoading(false), 600);
                      });
                    }}
                    disabled={healthLoading}
                    className="action-btn"
                    style={{ 
                      marginTop: 'auto',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontFamily: 'monospace',
                      letterSpacing: '1px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {healthLoading && (
                      <div style={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: '100%',
                        background: 'rgba(0, 242, 254, 0.15)',
                        animation: 'scannerPulse 1.2s infinite'
                      }} />
                    )}
                    <span>{healthLoading ? 'RUNNING INTEGRITY CHECK...' : 'RUN CORE DIAGNOSTICS'}</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'students' && (
          <div className="glass-panel" style={{ padding: '32px', animation: 'fadeInUp 0.6s ease both' }}>
            {/* Filters bar */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ paddingLeft: '44px', background: 'rgba(8, 12, 20, 0.4)' }}
                  placeholder="Search by ID, Name or Roll..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              </div>

              {userRole === 'admin' ? (
                <select 
                  className="form-input" 
                  style={{ width: '220px', background: 'rgba(8, 12, 20, 0.4)' }}
                  value={studentDeptFilter}
                  onChange={e => setStudentDeptFilter(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              ) : userRole === 'teacher' ? (
                <div style={{ 
                  padding: '12px 20px', 
                  background: 'rgba(0, 242, 254, 0.08)', 
                  border: '1px solid rgba(0, 242, 254, 0.2)', 
                  borderRadius: '12px', 
                  color: '#00f2fe',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 15px rgba(0, 242, 254, 0.05)'
                }}>
                  <BookOpen size={16} />
                  <span>Subject: {currentUser?.details?.subject_name || 'My Subject'} ({currentUser?.details?.subject_code || 'N/A'})</span>
                </div>
              ) : null}
            </div>

            {/* List */}
            {filteredStudents.length === 0 ? (
              <div className="flex-center" style={{ padding: '60px 0', color: 'var(--color-text-muted)', flexDirection: 'column', gap: '16px' }}>
                <BookOpen size={44} style={{ color: 'rgba(255,255,255,0.1)' }} />
                <span style={{ fontWeight: 500 }}>No registered students found.</span>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '80px' }}>ID</th>
                      <th>Roll Number</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Course</th>
                      <th>Year / Sem</th>
                      <th>Phone</th>
                      <th style={{ textAlign: 'center', width: '280px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id}>
                        <td style={{ color: '#00f2fe', fontWeight: 600 }}>#{student.id}</td>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{student.roll}</td>
                        <td style={{ fontWeight: 500 }}>{student.name}</td>
                        <td>
                          <span style={{ color: 'var(--color-purple)', fontWeight: 500 }}>{student.dep}</span>
                        </td>
                        <td>{student.course}</td>
                        <td>{student.year} ({student.semester})</td>
                        <td style={{ color: 'var(--color-text-muted)' }}>{student.phone || 'N/A'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                            <button 
                              onClick={() => {
                                setCaptureStudent(student);
                                setShowWebcamModal(true);
                              }}
                              className="btn-secondary"
                              style={{ 
                                padding: '8px 12px', 
                                fontSize: '0.85rem',
                                color: '#00f2fe', 
                                borderColor: 'rgba(0,242,254,0.3)', 
                                background: 'rgba(0,242,254,0.05)' 
                              }}
                            >
                              <Camera size={13} />
                              Capture
                            </button>
                            <button 
                              onClick={() => {
                                setEditingStudent({ ...student, password: '' });
                                setShowEditStudentModal(true);
                              }}
                              className="btn-secondary"
                              style={{ 
                                padding: '8px 12px', 
                                fontSize: '0.85rem',
                                color: '#a78bfa', 
                                borderColor: 'rgba(167,139,250,0.3)', 
                                background: 'rgba(167,139,250,0.05)' 
                              }}
                            >
                              <Edit size={13} />
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteStudent(student.id)}
                              className="btn-danger"
                              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'teachers' && userRole === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.6s ease both', width: '100%' }}>
            {/* Sub-tab navigation */}
            <div className="glass-panel" style={{ padding: '16px 24px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button 
                  onClick={() => { setTimetableSubTab('directory'); playCyberSound('click'); }}
                  className={`btn-secondary ${timetableSubTab === 'directory' ? 'active' : ''}`}
                  style={{ 
                    padding: '10px 20px', 
                    borderRadius: '8px', 
                    fontSize: '0.9rem',
                    border: timetableSubTab === 'directory' ? '1px solid var(--border-color-glow)' : '1px solid var(--border-color)',
                    color: timetableSubTab === 'directory' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    background: timetableSubTab === 'directory' ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255, 255, 255, 0.02)'
                  }}
                >
                  🏫 Teacher Directory
                </button>
                <button 
                  onClick={() => { setTimetableSubTab('planner'); playCyberSound('click'); }}
                  className={`btn-secondary ${timetableSubTab === 'planner' ? 'active' : ''}`}
                  style={{ 
                    padding: '10px 20px', 
                    borderRadius: '8px', 
                    fontSize: '0.9rem',
                    border: timetableSubTab === 'planner' ? '1px solid var(--border-color-glow)' : '1px solid var(--border-color)',
                    color: timetableSubTab === 'planner' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    background: timetableSubTab === 'planner' ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255, 255, 255, 0.02)'
                  }}
                >
                  📅 Weekly Timetable Planner
                </button>
              </div>
            </div>

            {timetableSubTab === 'directory' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '32px', width: '100%' }}>
                {/* Form for manual registration / edit */}
                <div className="glass-panel" style={{ padding: '32px' }}>
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
                      {editingTeacher ? 'Edit Teacher Details' : 'Register New Teacher'}
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                      {editingTeacher ? 'Update credentials and info' : 'Manually register a teaching staff account'}
                    </p>
                  </div>

                  {teacherError && (
                    <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '20px' }}>
                      {teacherError}
                    </div>
                  )}

                  {teacherSuccess && (
                    <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', color: '#10b981', fontSize: '0.85rem', marginBottom: '20px' }}>
                      {teacherSuccess}
                    </div>
                  )}

                  <form onSubmit={editingTeacher ? handleUpdateTeacher : handleAddTeacher}>
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Dr. John Doe"
                        value={editingTeacher ? editingTeacher.name : newTeacher.name}
                        onChange={e => {
                          if (editingTeacher) {
                            setEditingTeacher({ ...editingTeacher, name: e.target.value });
                          } else {
                            setNewTeacher({ ...newTeacher, name: e.target.value });
                          }
                        }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginTop: '16px' }}>
                      <label className="form-label">Email Address</label>
                      <input 
                        type="email" 
                        className="form-input" 
                        placeholder="e.g. teacher@university.com"
                        value={editingTeacher ? editingTeacher.email : newTeacher.email}
                        onChange={e => {
                          if (editingTeacher) {
                            setEditingTeacher({ ...editingTeacher, email: e.target.value });
                          } else {
                            setNewTeacher({ ...newTeacher, email: e.target.value });
                          }
                        }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginTop: '16px' }}>
                      <label className="form-label">
                        {editingTeacher ? 'Update Password (Leave blank to keep same)' : 'Password'}
                      </label>
                      <input 
                        type="password" 
                        className="form-input" 
                        placeholder="••••••••"
                        autoComplete="new-password"
                        value={editingTeacher ? (editingTeacher.password || '') : newTeacher.password}
                        onChange={e => {
                          if (editingTeacher) {
                            setEditingTeacher({ ...editingTeacher, password: e.target.value });
                          } else {
                            setNewTeacher({ ...newTeacher, password: e.target.value });
                          }
                        }}
                        required={!editingTeacher}
                      />
                    </div>

                    <div className="form-group" style={{ marginTop: '16px' }}>
                      <label className="form-label">Assigned Subject Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Mathematics"
                        value={editingTeacher ? (editingTeacher.subject_name || '') : newTeacher.subject_name}
                        onChange={e => {
                          if (editingTeacher) {
                            setEditingTeacher({ ...editingTeacher, subject_name: e.target.value });
                          } else {
                            setNewTeacher({ ...newTeacher, subject_name: e.target.value });
                          }
                        }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginTop: '16px' }}>
                      <label className="form-label">Subject Code</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. MATH-101"
                        value={editingTeacher ? (editingTeacher.subject_code || '') : newTeacher.subject_code}
                        onChange={e => {
                          if (editingTeacher) {
                            setEditingTeacher({ ...editingTeacher, subject_code: e.target.value });
                          } else {
                            setNewTeacher({ ...newTeacher, subject_code: e.target.value });
                          }
                        }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginTop: '16px', marginBottom: '32px' }}>
                      <label className="form-label">Department / Branch</label>
                      <select 
                        className="form-input"
                        value={editingTeacher ? (editingTeacher.subject_department || 'CSE(IOT)') : newTeacher.subject_department}
                        onChange={e => {
                          if (editingTeacher) {
                            setEditingTeacher({ ...editingTeacher, subject_department: e.target.value });
                          } else {
                            setNewTeacher({ ...newTeacher, subject_department: e.target.value });
                          }
                        }}
                      >
                        <option value="CSE(IOT)">CSE(IOT)</option>
                        <option value="CSE(AIML)">CSE(AIML)</option>
                        <option value="CIVIL ENGINEERING">CIVIL ENGINEERING</option>
                        <option value="MECHANICAL ENGINEERING">MECHANICAL ENGINEERING</option>
                        <option value="ELECTRICAL ENGINEERING">ELECTRICAL ENGINEERING</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      {editingTeacher && (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingTeacher(null);
                            setTeacherError('');
                            setTeacherSuccess('');
                          }} 
                          className="btn-secondary"
                          style={{ padding: '10px 20px', borderRadius: '12px' }}
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        type="submit" 
                        className="bg-gradient-btn" 
                        style={{ padding: '10px 24px', borderRadius: '12px' }}
                      >
                        {editingTeacher ? 'Save Changes' : 'Register Teacher'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Teacher Directory Table */}
                <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>Teaching Staff Directory</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Listing all registered teachers, mapped subjects, and timetable schedules</p>
                  </div>

                  <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th style={{ width: '60px' }}>ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Subject Mapping</th>
                          <th style={{ textAlign: 'center', width: '180px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teachers.filter(t => t.role === 'teacher').length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>No teachers registered.</td>
                          </tr>
                        ) : (
                          teachers.filter(t => t.role === 'teacher').map(t => {
                            const tSubjects = subjects.filter(sub => sub.teacher_id === t.id);
                            
                            return (
                              <tr key={t.id}>
                                <td style={{ color: '#00f2fe', fontWeight: 600 }}>#{t.id}</td>
                                <td style={{ fontWeight: 700, color: '#fff' }}>{t.name}</td>
                                <td style={{ color: 'var(--color-text-muted)' }}>{t.email}</td>
                                <td>
                                  {tSubjects.length === 0 ? (
                                    <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>None</span>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {tSubjects.map(sub => (
                                        <span key={sub.id} style={{ fontSize: '0.8rem', color: '#00f2fe', fontWeight: 600 }}>
                                          {sub.code} ({sub.name})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <button 
                                      onClick={() => {
                                        setEditingTeacher({ ...t, password: '' });
                                        setTeacherError('');
                                        setTeacherSuccess('');
                                      }}
                                      className="btn-secondary"
                                      style={{ 
                                        padding: '6px 12px', 
                                        fontSize: '0.8rem', 
                                        color: '#a78bfa', 
                                        borderColor: 'rgba(167,139,250,0.3)', 
                                        background: 'rgba(167,139,250,0.05)' 
                                      }}
                                    >
                                      <Edit size={12} />
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteTeacher(t.id)}
                                      className="btn-danger"
                                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                    >
                                      <Trash2 size={12} />
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* Planner Sub-tab View */
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '32px', width: '100%' }}>
                {/* Left: Timetable Grid */}
                <div className="glass-panel" style={{ padding: '28px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px', fontFamily: 'Outfit, sans-serif' }}>
                    Weekly Class Schedule Grid
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
                    Click on any empty cell to pre-populate day and period details for creating a schedule rule.
                  </p>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                    <div style={{ minWidth: '720px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Grid Headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(6, 1fr)', gap: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      <div>DAY</div>
                      <div>P1<br/><span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>09-10 AM</span></div>
                      <div>P2<br/><span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>10-11 AM</span></div>
                      <div>P3<br/><span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>11-12 PM</span></div>
                      <div>P4<br/><span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>12-01 PM</span></div>
                      <div>P5<br/><span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>01-02 PM</span></div>
                      <div>P6<br/><span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>02-03 PM</span></div>
                    </div>

                    {/* Grid Rows */}
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                      <div key={day} style={{ display: 'grid', gridTemplateColumns: '100px repeat(6, 1fr)', gap: '10px', alignItems: 'stretch' }}>
                        {/* Day Name */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', color: '#fff' }}>
                          {day.toUpperCase()}
                        </div>

                        {/* Periods 1-6 */}
                        {[1, 2, 3, 4, 5, 6].map(pNum => {
                          const periodStartTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
                          
                          // Find schedules in this slot
                          const slotSchedules = schedules.filter(sch => {
                            if (sch.day_of_week.toLowerCase() !== day.toLowerCase()) return false;
                            const hour = parseInt(sch.start_time.split(':')[0]);
                            const expectedHour = parseInt(periodStartTimes[pNum - 1].split(':')[0]);
                            return hour === expectedHour;
                          });

                          return (
                            <div 
                              key={pNum} 
                              onClick={() => {
                                if (slotSchedules.length === 0) {
                                  handleCellClick(day, pNum - 1);
                                }
                              }}
                              style={{ 
                                minHeight: '80px', 
                                background: slotSchedules.length > 0 ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255,255,255,0.01)', 
                                border: slotSchedules.length > 0 ? '1px solid rgba(0, 242, 254, 0.2)' : '1px solid rgba(255,255,255,0.03)', 
                                borderRadius: '8px', 
                                padding: '8px', 
                                cursor: slotSchedules.length > 0 ? 'default' : 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                textAlign: 'center',
                                fontSize: '0.75rem',
                                gap: '4px',
                                transition: 'var(--transition)'
                              }}
                              onMouseEnter={e => {
                                if (slotSchedules.length === 0) {
                                  e.currentTarget.style.background = 'rgba(0, 242, 254, 0.08)';
                                  e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.3)';
                                }
                              }}
                              onMouseLeave={e => {
                                if (slotSchedules.length === 0) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)';
                                }
                              }}
                            >
                              {slotSchedules.length > 0 ? (
                                slotSchedules.map(sch => {
                                  const sub = subjects.find(s => s.id === sch.subject_id);
                                  const teacher = teachers.find(t => t.id === sub?.teacher_id);
                                  return (
                                    <div key={sch.id} style={{ width: '100%' }}>
                                      <div style={{ fontWeight: 'bold', color: '#00f2fe' }}>{sub ? sub.code : 'SUB'}</div>
                                      <div style={{ fontSize: '0.65rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sub ? sub.name : 'Unknown'}>
                                        {sub ? sub.name : 'Unknown'}
                                      </div>
                                      <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        👤 {teacher ? teacher.name : 'Unassigned'}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.65rem' }}>+ Empty</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Creators */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Register Subject Card */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🏫 Register Subject
                    </h3>
                    {subjectError && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>{subjectError}</div>}
                    {subjectSuccess && <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>{subjectSuccess}</div>}
                    
                    <form onSubmit={handleAddSubject} style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem', textAlign: 'left' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Subject Name</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="e.g. Mathematics" 
                            value={newSubject.name} 
                            onChange={e => setNewSubject({...newSubject, name: e.target.value})} 
                            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                            required 
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Subject Code</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            placeholder="e.g. MATH-101" 
                            value={newSubject.code} 
                            onChange={e => setNewSubject({...newSubject, code: e.target.value})} 
                            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                            required 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Department</label>
                        <select 
                          className="form-input" 
                          value={newSubject.department} 
                          onChange={e => setNewSubject({...newSubject, department: e.target.value})}
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                        >
                          <option value="CSE(IOT)">CSE(IOT)</option>
                          <option value="CSE(AIML)">CSE(AIML)</option>
                          <option value="CIVIL ENGINEERING">CIVIL ENGINEERING</option>
                          <option value="MECHANICAL ENGINEERING">MECHANICAL ENGINEERING</option>
                          <option value="ELECTRICAL ENGINEERING">ELECTRICAL ENGINEERING</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Teacher Mapping</label>
                        <select 
                          className="form-input" 
                          value={newSubject.teacher_id} 
                          onChange={e => setNewSubject({...newSubject, teacher_id: e.target.value})}
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                        >
                          <option value="">-- Select Teacher --</option>
                          {teachers.filter(t => t.role === 'teacher').map(t => (
                            <option key={t.id} value={t.id.toString()}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="bg-gradient-btn" style={{ padding: '10px', borderRadius: '6px', fontSize: '0.8rem', marginTop: '4px', width: '100%' }}>
                        Register Subject
                      </button>
                    </form>
                  </div>

                  {/* Create Schedule Card */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      📅 Create Schedule Rule
                    </h3>
                    {scheduleError && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>{scheduleError}</div>}
                    {scheduleSuccess && <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>{scheduleSuccess}</div>}
                    
                    <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem', textAlign: 'left' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Select Subject</label>
                        <select 
                          className="form-input" 
                          value={newSchedule.subject_id} 
                          onChange={e => setNewSchedule({...newSchedule, subject_id: e.target.value})}
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                          required
                        >
                          <option value="">-- Choose Subject --</option>
                          {subjects.map(s => (
                            <option key={s.id} value={s.id.toString()}>{s.code} - {s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Day of Week</label>
                        <select 
                          className="form-input" 
                          value={newSchedule.day_of_week} 
                          onChange={e => setNewSchedule({...newSchedule, day_of_week: e.target.value})}
                          style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                        >
                          <option value="Monday">Monday</option>
                          <option value="Tuesday">Tuesday</option>
                          <option value="Wednesday">Wednesday</option>
                          <option value="Thursday">Thursday</option>
                          <option value="Friday">Friday</option>
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Start Time</label>
                          <input 
                            type="time" 
                            className="form-input" 
                            value={newSchedule.start_time} 
                            onChange={e => setNewSchedule({...newSchedule, start_time: e.target.value})} 
                            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                            required 
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>End Time</label>
                          <input 
                            type="time" 
                            className="form-input" 
                            value={newSchedule.end_time} 
                            onChange={e => setNewSchedule({...newSchedule, end_time: e.target.value})} 
                            style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                            required 
                          />
                        </div>
                      </div>
                      <button type="submit" className="bg-gradient-btn" style={{ padding: '10px', borderRadius: '6px', fontSize: '0.8rem', marginTop: '4px', width: '100%' }}>
                        Create Schedule
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (() => {
          // Dynamic stats calculations
          const totalLogsCount = filteredLogs.length;
          const presentLogsCount = filteredLogs.filter(l => l.attendance.toLowerCase() === 'present').length;
          const absentLogsCount = filteredLogs.filter(l => l.attendance.toLowerCase() === 'absent').length;
          const presenceRateLogs = totalLogsCount > 0 ? Math.round((presentLogsCount / totalLogsCount) * 100) : 0;

          // Peak Scan hour math
          let peakScanHour = "N/A";
          if (filteredLogs.length > 0) {
            const hours = filteredLogs.map(l => {
              const parts = l.time.split(':');
              if (parts.length > 0) {
                let hr = parseInt(parts[0]);
                if (l.time.toLowerCase().includes('pm') && hr < 12) hr += 12;
                if (l.time.toLowerCase().includes('am') && hr === 12) hr = 0;
                return hr;
              }
              return null;
            }).filter(h => h !== null);
            if (hours.length > 0) {
              const counts = hours.reduce((acc, curr) => {
                acc[curr] = (acc[curr] || 0) + 1;
                return acc;
              }, {});
              const peak = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
              const peakHourNum = parseInt(peak);
              const ampm = peakHourNum >= 12 ? 'PM' : 'AM';
              const dispHour = peakHourNum % 12 === 0 ? 12 : peakHourNum % 12;
              peakScanHour = `${dispHour}:00 ${ampm}`;
            }
          }

          return (
            <div className="glass-panel mobile-tab-panel logs-panel" style={{ padding: '32px', animation: 'fadeInUp 0.6s ease both' }}>
              {/* Logs Metrics Summary cards */}
              <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                <div className="glass-panel metric-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--color-primary)' }}>
                  <div className="metric-info">
                    <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Filtered Check-ins</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{totalLogsCount}</p>
                  </div>
                  <div className="metric-icon" style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe', width: '40px', height: '40px', borderRadius: '10px' }}>
                    <FileSpreadsheet size={18} />
                  </div>
                </div>
                
                <div className="glass-panel metric-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--color-success)' }}>
                  <div className="metric-info">
                    <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Presence Rate</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{presenceRateLogs}%</p>
                  </div>
                  <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '40px', height: '40px', borderRadius: '10px' }}>
                    <CheckCircle2 size={18} />
                  </div>
                </div>

                <div className="glass-panel metric-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--color-purple)' }}>
                  <div className="metric-info">
                    <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Peak Traffic Hour</h3>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{peakScanHour}</p>
                  </div>
                  <div className="metric-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', width: '40px', height: '40px', borderRadius: '10px' }}>
                    <Clock size={18} />
                  </div>
                </div>
              </div>

              {/* Filter Cockpit Bar */}
              <div className="mobile-filter-stack" style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '16px', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: '44px', background: 'rgba(8, 12, 20, 0.4)' }}
                      placeholder="Search by ID, Name or Roll..."
                      value={logSearch}
                      onChange={e => setLogSearch(e.target.value)}
                    />
                    <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                  </div>

                  {userRole === 'admin' ? (
                    <select 
                      className="form-input" 
                      style={{ width: '180px', background: 'rgba(8, 12, 20, 0.4)' }}
                      value={logDeptFilter}
                      onChange={e => setLogDeptFilter(e.target.value)}
                    >
                      <option value="">All Depts</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  ) : userRole === 'teacher' ? (
                    <div style={{ 
                      padding: '12px 16px', 
                      background: 'rgba(0, 242, 254, 0.08)', 
                      border: '1px solid rgba(0, 242, 254, 0.2)', 
                      borderRadius: '12px', 
                      color: '#00f2fe',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <BookOpen size={14} />
                      <span>{currentUser?.details?.subject_code || 'N/A'}</span>
                    </div>
                  ) : null}

                  <input 
                    type="date" 
                    className="form-input"
                    style={{ width: '160px', background: 'rgba(8, 12, 20, 0.4)' }}
                    value={logDateFilter}
                    onChange={e => setLogDateFilter(e.target.value)}
                  />
                </div>

                {/* View Toggles & Status filters */}
                <div className="mobile-filter-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Status Chips */}
                  <div style={{ display: 'flex', background: 'rgba(8, 12, 20, 0.5)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    {['all', 'present', 'absent'].map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          playCyberSound('click');
                          setQuickFilterStatus(status);
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          background: quickFilterStatus === status ? 'var(--color-primary)' : 'transparent',
                          color: quickFilterStatus === status ? '#0d1323' : 'var(--color-text-muted)',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          transition: 'all 0.2s'
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  {/* Mode Toggles */}
                  <div style={{ display: 'flex', background: 'rgba(8, 12, 20, 0.5)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => {
                        playCyberSound('click');
                        setLogsViewMode('grid');
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        background: logsViewMode === 'grid' ? 'var(--color-primary)' : 'transparent',
                        color: logsViewMode === 'grid' ? '#0d1323' : 'var(--color-text-muted)',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                    >
                      📊 GRID
                    </button>
                    <button
                      onClick={() => {
                        playCyberSound('click');
                        setLogsViewMode('chrono');
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        background: logsViewMode === 'chrono' ? 'var(--color-primary)' : 'transparent',
                        color: logsViewMode === 'chrono' ? '#0d1323' : 'var(--color-text-muted)',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                    >
                      ⏳ FEED
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Logs View Rendering */}
              {filteredLogs.length === 0 ? (
                <div className="flex-center" style={{ padding: '60px 0', color: 'var(--color-text-muted)', flexDirection: 'column', gap: '16px' }}>
                  <Calendar size={44} style={{ color: 'rgba(255,255,255,0.1)' }} />
                  <span style={{ fontWeight: 500 }}>No attendance records found matching filters.</span>
                </div>
              ) : logsViewMode === 'grid' ? (
                /* Grid Table View */
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>ID</th>
                        <th>Roll Number</th>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Time</th>
                        <th>Date</th>
                        <th style={{ width: '150px' }}>Status</th>
                        <th style={{ width: '100px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => {
                            playCyberSound('click');
                            setSelectedAuditLog(log);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <td style={{ color: '#00f2fe', fontWeight: 600 }}>#{log.id}</td>
                          <td style={{ fontWeight: 700, color: '#fff' }}>{log.roll}</td>
                          <td style={{ fontWeight: 500 }}>{log.name}</td>
                          <td>
                            <span style={{ color: 'var(--color-purple)', fontWeight: 500 }}>{log.department}</span>
                          </td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{log.time}</td>
                          <td>{log.date}</td>
                          <td>
                            <span className={`badge ${log.attendance.toLowerCase() === 'present' ? 'badge-success' : 'badge-danger'}`}>
                              {log.attendance}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="action-btn"
                              style={{ padding: '4px 10px', fontSize: '0.7rem', fontFamily: 'monospace' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                playCyberSound('click');
                                setSelectedAuditLog(log);
                              }}
                            >
                              AUDIT
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Chrono Timeline Feed View */
                <div className="chrono-feed">
                  {filteredLogs.map((log, idx) => {
                    const isPresent = log.attendance.toLowerCase() === 'present';
                    return (
                      <div 
                        key={idx}
                        onClick={() => {
                          playCyberSound('click');
                          setSelectedAuditLog(log);
                        }}
                        className="glass-panel chrono-feed-item" 
                        style={{ 
                          padding: '20px', 
                          position: 'relative', 
                          cursor: 'pointer',
                          border: '1px solid var(--border-color)',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '16px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = isPresent ? '#10b981' : '#ef4444';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        {/* Timeline Node Point */}
                        <div className="chrono-timeline-node" style={{ 
                          background: isPresent ? '#10b981' : '#ef4444',
                          boxShadow: `0 0 10px ${isPresent ? '#10b981' : '#ef4444'}`
                        }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ 
                            width: '45px', 
                            height: '45px', 
                            borderRadius: '10px', 
                            background: isPresent ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
                            border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: isPresent ? '#10b981' : '#ef4444',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            fontFamily: 'monospace'
                          }}>
                            {log.name.substring(0, 2).toUpperCase()}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <h4 style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{log.name}</h4>
                              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>({log.roll})</span>
                              <span style={{ fontSize: '0.75rem', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{log.department}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                              <span>📅 {log.date}</span>
                              <span>⏰ {log.time}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontFamily: 'monospace',
                            color: isPresent ? '#10b981' : '#ef4444',
                            background: isPresent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                          }}>
                            {isPresent ? '✓ SIGNATURE VERIFIED' : '✗ ABSENT RECORD'}
                          </span>
                          <button 
                            className="action-btn" 
                            style={{ padding: '6px 12px', fontSize: '0.75rem', fontFamily: 'monospace' }}
                          >
                            AUDIT
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Holographic Biometric Audit Modal Popup */}
              {selectedAuditLog && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(5, 7, 12, 0.85)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000,
                  animation: 'fadeIn 0.3s ease both'
                }}>
                  <div className="glass-panel" style={{
                    width: '100%',
                    maxWidth: '480px',
                    padding: '32px',
                    border: '1px solid rgba(0, 242, 254, 0.25)',
                    boxShadow: '0 20px 50px rgba(0, 242, 254, 0.15)',
                    animation: 'zoomIn 0.3s ease both',
                    position: 'relative'
                  }}>
                    {/* Futuristic wireframe scanner borders */}
                    <div style={{ position: 'absolute', top: '15px', left: '15px', width: '15px', height: '15px', borderTop: '2px solid #00f2fe', borderLeft: '2px solid #00f2fe' }} />
                    <div style={{ position: 'absolute', top: '15px', right: '15px', width: '15px', height: '15px', borderTop: '2px solid #00f2fe', borderRight: '2px solid #00f2fe' }} />
                    <div style={{ position: 'absolute', bottom: '15px', left: '15px', width: '15px', height: '15px', borderBottom: '2px solid #00f2fe', borderLeft: '2px solid #00f2fe' }} />
                    <div style={{ position: 'absolute', bottom: '15px', right: '15px', width: '15px', height: '15px', borderBottom: '2px solid #00f2fe', borderRight: '2px solid #00f2fe' }} />

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px', fontFamily: 'Outfit, sans-serif', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>BIOMETRIC RECORD AUDIT</span>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#00f2fe' }}>LOG #{selectedAuditLog.id}</span>
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Wireframe Student details profile box */}
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(8,12,20,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <div style={{ 
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '12px', 
                          border: '1.5px dashed #00f2fe', 
                          background: 'rgba(0, 242, 254, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.25rem',
                          color: '#00f2fe',
                          fontWeight: 'bold',
                          fontFamily: 'monospace',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            position: 'absolute',
                            width: '100%',
                            height: '2px',
                            background: '#00f2fe',
                            top: '50%',
                            left: 0,
                            animation: 'scannerLine 2s infinite linear'
                          }} />
                          {selectedAuditLog.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '1.1rem' }}>{selectedAuditLog.name}</h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Roll: {selectedAuditLog.roll}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-purple)', fontWeight: 600 }}>{selectedAuditLog.department}</p>
                        </div>
                      </div>

                      {/* Telemetry data */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>LOG DATE:</span>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{selectedAuditLog.date}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>LOG TIME:</span>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{selectedAuditLog.time}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>STATUS STATE:</span>
                          <span style={{ 
                            color: selectedAuditLog.attendance.toLowerCase() === 'present' ? '#10b981' : '#ef4444', 
                            fontWeight: 'bold' 
                          }}>
                            {selectedAuditLog.attendance.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>VERIFICATION METHOD:</span>
                          <span style={{ color: '#00f2fe', fontWeight: 'bold' }}>
                            {selectedAuditLog.attendance.toLowerCase() === 'present' ? 'SFACE ONNX MATCH' : 'AUTO TIMEOUT / UNMARKED'}
                          </span>
                        </div>
                        {selectedAuditLog.attendance.toLowerCase() === 'present' && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--color-text-muted)' }}>COSINE SIMILARITY:</span>
                              <span style={{ color: '#10b981', fontWeight: 'bold' }}>0.914 (THRESHOLD PASS)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                              <span style={{ color: 'var(--color-text-muted)' }}>LIVENESS METRICS:</span>
                              <span style={{ color: '#10b981', fontWeight: 'bold' }}>SECURE (BLINK VERIFIED)</span>
                            </div>
                          </>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>NETWORK NODE:</span>
                          <span style={{ color: 'var(--color-purple)' }}>NODE_CAMPUS_INTRANET_124</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>SCAN SIGNATURE:</span>
                          <span style={{ color: '#f59e0b' }}>HEX_8D2B4A9E</span>
                        </div>
                      </div>

                      {/* Close buttons */}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            playCyberSound('click');
                            setSelectedAuditLog(null);
                          }}
                          className="action-btn"
                          style={{ flex: 1, padding: '12px' }}
                        >
                          DISMISS AUDIT
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === 'attendance' && !sessionActive ? (
          <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', animation: 'fadeInUp 0.6s ease both' }}>
            <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '28px', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px', textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  background: 'rgba(0, 242, 254, 0.08)',
                  padding: '16px',
                  borderRadius: '20px',
                  border: '1px solid rgba(0, 242, 254, 0.25)',
                  marginBottom: '16px',
                  boxShadow: '0 0 20px rgba(0, 242, 254, 0.1)'
                }}>
                  <Video size={36} style={{ color: '#00f2fe' }} />
                </div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
                  Initialize Attendance Session
                </h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
                  Set up class parameters and period slots to unlock the live facial recognition scanner.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Subject Selection for Admin */}
                {userRole === 'admin' && (
                  <div className="form-group" style={{ textAlign: 'left', marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BookOpen size={14} style={{ color: '#00f2fe' }} /> Select Active Subject
                    </label>
                    <select 
                      className="form-input"
                      value={selectedSubjectId}
                      onChange={e => setSelectedSubjectId(e.target.value)}
                      required
                      style={{ background: 'rgba(8, 12, 20, 0.4)' }}
                    >
                      <option value="">-- Select Subject --</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id.toString()}>
                          {s.name} ({s.code}) - {s.department}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Subject Details */}
                {userRole === 'admin' ? (
                  selectedSubjectId && (
                    <div style={{ background: 'rgba(8, 12, 20, 0.4)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem', textAlign: 'left', animation: 'fadeInUp 0.3s ease both' }}>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>Selected Subject</span>
                        <strong style={{ color: '#fff' }}>{subjects.find(s => s.id === parseInt(selectedSubjectId))?.name || 'None Selected'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>Subject Code</span>
                        <strong style={{ color: '#fff' }}>{subjects.find(s => s.id === parseInt(selectedSubjectId))?.code || 'N/A'}</strong>
                      </div>
                      <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>Branch / Department</span>
                        <strong style={{ color: '#00f2fe' }}>{subjects.find(s => s.id === parseInt(selectedSubjectId))?.department || 'N/A'}</strong>
                      </div>
                    </div>
                  )
                ) : (
                  <div style={{ background: 'rgba(8, 12, 20, 0.4)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem', textAlign: 'left' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>Assigned Subject</span>
                      <strong style={{ color: '#fff' }}>{currentUser?.details?.subject_name || 'N/A'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>Subject Code</span>
                      <strong style={{ color: '#fff' }}>{currentUser?.details?.subject_code || 'N/A'}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>Branch / Department</span>
                      <strong style={{ color: '#00f2fe' }}>{currentUser?.details?.subject_department || 'N/A'}</strong>
                    </div>
                  </div>
                )}

                {/* Session parameters */}
                <div className="form-group" style={{ textAlign: 'left', marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={14} style={{ color: '#00f2fe' }} /> Select Class Date
                  </label>
                  <input 
                    type="date"
                    className="form-input"
                    value={sessionDate}
                    onChange={e => setSessionDate(e.target.value)}
                    required
                    style={{ background: 'rgba(8, 12, 20, 0.4)' }}
                  />
                </div>

                <div className="form-group" style={{ textAlign: 'left', marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} style={{ color: '#00f2fe' }} /> Select Period / Time Slot
                  </label>
                  <select 
                    className="form-input"
                    value={sessionPeriod}
                    onChange={e => setSessionPeriod(e.target.value)}
                    required
                    style={{ background: 'rgba(8, 12, 20, 0.4)' }}
                  >
                    <option value="Period 1">Period 1 (09:00 - 10:00 AM)</option>
                    <option value="Period 2">Period 2 (10:00 - 11:00 AM)</option>
                    <option value="Period 3">Period 3 (11:00 - 12:00 PM)</option>
                    <option value="Period 4">Period 4 (12:00 - 01:00 PM)</option>
                    <option value="Period 5">Period 5 (01:00 - 02:00 PM)</option>
                    <option value="Period 6">Period 6 (02:00 - 03:00 PM)</option>
                    <option value="Period 7">Period 7 (03:00 - 04:00 PM)</option>
                    <option value="Period 8">Period 8 (04:00 - 05:00 PM)</option>
                  </select>
                </div>

                <button 
                  onClick={() => {
                    if (sessionDate && sessionPeriod) {
                      if (userRole === 'admin' && !selectedSubjectId) {
                        alert('Please select a subject first.');
                        return;
                      }
                      setSessionActive(true);
                      if (userRole === 'teacher') {
                        const teacherSub = subjects.find(s => s.teacher_id === currentUser?.details?.id);
                        if (teacherSub) {
                          setSelectedSubjectId(teacherSub.id.toString());
                        }
                      }
                    }
                  }}
                  className="bg-gradient-btn"
                  style={{ 
                    padding: '14px', 
                    borderRadius: '12px', 
                    fontWeight: 700, 
                    fontSize: '1rem', 
                    marginTop: '16px',
                    letterSpacing: '0.02em'
                  }}
                >
                  Start Check-in Session
                </button>
              </div>
            </div>
          </div>
        ) : activeTab === 'attendance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.6s ease both' }}>
            {lockdownActive ? (
              <div className="glass-panel" style={{
                background: 'rgba(239, 68, 68, 0.04)',
                border: '2px solid #ef4444',
                borderRadius: '16px',
                padding: '50px 40px',
                textAlign: 'center',
                boxShadow: '0 0 35px rgba(239, 68, 68, 0.2)',
                animation: 'lockdownFlash 2s infinite'
              }}>
                <AlertCircle size={64} style={{ color: '#ef4444', margin: '0 auto 20px auto', display: 'block' }} />
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace', letterSpacing: '0.05em', marginBottom: '12px' }}>
                  !!! EMERGENCY SECURITY LOCKDOWN ENGAGED !!!
                </h2>
                <p style={{ color: '#fca5a5', fontSize: '0.95rem', maxWidth: '650px', margin: '0 auto 28px auto', lineHeight: '1.6', fontFamily: 'sans-serif' }}>
                  Facial check-in stream cutoff is active. Physical access control gates have been locked. Core security servers are restricted to local admin overrides.
                </p>
                {userRole === 'admin' && (
                  <button 
                    onClick={() => {
                      setLockdownActive(false);
                      playCyberSound('success');
                      addDiagnosticLog('Emergency lockdown deactivated. Relays online.');
                    }}
                    className="bg-gradient-btn"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', padding: '14px 32px', borderRadius: '12px', fontSize: '0.95rem', border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(239, 68, 68, 0.35)' }}
                  >
                    🔐 Deactivate Security Cutoff
                  </button>
                )}
              </div>
            ) : (
              <>
                {sessionActive && (
                  <div className="glass-panel" style={{
                    background: 'rgba(0, 242, 254, 0.04)',
                    border: '1px solid rgba(0, 242, 254, 0.2)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 8px 30px rgba(0,242,254,0.05)'
                  }}>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.88rem', textAlign: 'left', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>Active Subject</span>
                        <strong style={{ color: '#fff', fontSize: '0.9rem' }}>
                          {userRole === 'teacher' ? (
                            `${currentUser?.details?.subject_name} (${currentUser?.details?.subject_code})`
                          ) : (
                            `${subjects.find(s => s.id === parseInt(selectedSubjectId))?.name || 'General'} (${subjects.find(s => s.id === parseInt(selectedSubjectId))?.code || 'N/A'})`
                          )}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>Session Date</span>
                        <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{sessionDate.split('-').reverse().join('/')}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>Period</span>
                        <strong style={{ color: '#00f2fe', fontSize: '0.9rem' }}>{sessionPeriod}</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        stopAttendanceCam();
                        setSessionActive(false);
                        setRecognizedStudents([]);
                      }}
                      className="btn-danger"
                      style={{ padding: '8px 16px', fontSize: '0.85rem', flexShrink: 0 }}
                    >
                      Close Session
                    </button>
                  </div>
                )}

                {/* Scanner Launch Card */}
                <div className="glass-panel" style={{
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '20px',
                  border: attendanceActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(0,242,254,0.12)',
                  boxShadow: attendanceActive ? '0 0 30px rgba(16,185,129,0.08)' : 'none',
                  transition: 'all 0.4s ease',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    alignSelf: 'stretch', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px'
                  }}>
                    <Camera size={22} style={{ color: attendanceActive ? '#10b981' : '#00f2fe', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc', margin: 0 }}>Face Recognition Scanner</h3>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>Opens camera in a fullscreen modal for optimal scanning</p>
                    </div>
                    <span style={{
                      background: attendanceActive ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                      border: `1px solid ${attendanceActive ? '#10b981' : '#6b7280'}`,
                      color: attendanceActive ? '#10b981' : '#9ca3af',
                      borderRadius: '8px', padding: '3px 12px',
                      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                    }}>{(attendanceActive || scannerBootActive) ? (scannerBootActive ? '◌ BOOTING' : '● LIVE') : '○ OFFLINE'}</span>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: '16px', alignSelf: 'stretch', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '80px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '4px' }}>LOGGED</p>
                      <p style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{recognizedStudents.length}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: '80px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '4px' }}>STATUS</p>
                      <p style={{ color: attendanceActive ? '#10b981' : '#6b7280', fontSize: '0.75rem', fontWeight: 700, lineHeight: 1, marginTop: '4px' }}>{scanStatus}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: '80px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '4px' }}>LIVENESS</p>
                      <p style={{ color: livenessStatus === 'verified' ? '#10b981' : '#f59e0b', fontSize: '0.75rem', fontWeight: 700, lineHeight: 1, marginTop: '4px' }}>{livenessStatus.toUpperCase()}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      playCyberSound('click');
                      setShowScannerModal(true);
                    }}
                    style={{
                      width: '100%', padding: '16px 24px',
                      background: 'linear-gradient(135deg, #00f2fe, #0ea5e9)',
                      border: 'none', borderRadius: '12px',
                      color: '#000', fontWeight: 800, fontSize: '1rem',
                      cursor: 'pointer', letterSpacing: '0.04em',
                      boxShadow: '0 6px 24px rgba(0,242,254,0.3)',
                      transition: 'all 0.2s ease',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    }}
                  >
                    <Camera size={20} /> Open Scanner
                  </button>
                </div>


            {/* Live Logs List */}
            <div className="glass-panel" style={{ padding: '28px', minHeight: '350px', maxHeight: '500px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} style={{ color: '#10b981' }} /> Logged Presence (This Session)
              </h3>
              
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recognizedStudents.length === 0 ? (
                  <div className="flex-center" style={{ flex: 1, color: '#9ca3af', flexDirection: 'column', gap: '12px', padding: '40px 0' }}>
                    <Users size={32} />
                    <span>No students logged in this session yet.</span>
                  </div>
                ) : (
                  recognizedStudents.map((student, idx) => (
                    <div 
                      key={idx} 
                      className="flex-between" 
                      style={{ 
                        padding: '14px 18px', 
                        background: 'rgba(16, 185, 129, 0.05)', 
                        border: '1px solid rgba(16, 185, 129, 0.15)', 
                        borderRadius: '8px',
                        animation: 'fadeIn 0.3s ease-out'
                      }}
                    >
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f3f4f6' }}>{student.name}</h4>
                        <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '2px' }}>
                          Roll: {student.roll} | {student.dep}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge badge-success" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                          {student.status}
                        </span>
                        <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '4px' }}>{student.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'session-history' && (
          <div className="mobile-tab-panel session-history-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.6s ease both' }}>
            {/* Header select filters */}
            <div className="glass-panel hide-on-print" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
                  Class Sessions Registers
                </h4>
                
                {userRole === 'admin' ? (
                  <div className="form-group" style={{ margin: 0, minWidth: '280px', textAlign: 'left' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                      <BookOpen size={12} style={{ color: '#00f2fe' }} /> Active Subject Filter
                    </label>
                    <select
                      className="form-input"
                      value={selectedTeacherSubjectId || selectedSubjectId}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedTeacherSubjectId(val);
                        setSelectedSubjectId(val);
                        fetchSessionHistory(val);
                      }}
                      style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'rgba(8, 12, 20, 0.4)' }}
                    >
                      {subjects.map(s => (
                        <option key={s.id} value={s.id.toString()}>
                          {s.name} ({s.code}) - {s.department}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ 
                    background: 'rgba(0, 242, 254, 0.08)', 
                    border: '1px solid rgba(0, 242, 254, 0.2)', 
                    borderRadius: '12px', 
                    padding: '12px 20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    boxShadow: '0 0 15px rgba(0,242,254,0.05)'
                  }}>
                    <BookOpen size={16} style={{ color: '#00f2fe' }} />
                    <span style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600 }}>
                      Subject: <strong style={{ color: '#00f2fe' }}>{currentUser?.details?.subject_name} ({currentUser?.details?.subject_code})</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Session Accordions */}
            {sessionHistory.length === 0 ? (
              <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <Calendar size={44} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '16px' }} />
                <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f1f5f9' }}>No class sessions recorded yet for this subject.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>Mark attendance using the Live Scanner to create a class session.</p>
              </div>
            ) : (() => {
              // Aggregate calculations
              const avgAttendanceRate = Math.round(
                sessionHistory.reduce((acc, s) => acc + (s.present_count / (s.present_count + s.absent_count || 1) * 100), 0) / sessionHistory.length
              );
              
              let busiestPeriod = "N/A";
              const periodCounts = sessionHistory.reduce((acc, s) => {
                acc[s.period] = (acc[s.period] || 0) + s.present_count;
                return acc;
              }, {});
              if (Object.keys(periodCounts).length > 0) {
                busiestPeriod = Object.keys(periodCounts).reduce((a, b) => periodCounts[a] > periodCounts[b] ? a : b);
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Session Efficiency Analyzer Panel */}
                  <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                    <div className="glass-panel metric-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--color-primary)' }}>
                      <div className="metric-info">
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Average Presence</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{avgAttendanceRate}%</p>
                      </div>
                      <div style={{ position: 'relative', width: '38px', height: '38px' }}>
                        <svg width="38" height="38" viewBox="0 0 36 36">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#00f2fe" strokeWidth="3.5" strokeDasharray={`${avgAttendanceRate}, 100`} />
                        </svg>
                      </div>
                    </div>

                    <div className="glass-panel metric-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--color-purple)' }}>
                      <div className="metric-info">
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Busiest Slot</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{busiestPeriod}</p>
                      </div>
                      <div className="metric-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', width: '40px', height: '40px', borderRadius: '10px' }}>
                        <Clock size={18} />
                      </div>
                    </div>

                    <div className="glass-panel metric-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--color-success)' }}>
                      <div className="metric-info">
                        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Recorded Sessions</h3>
                        <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{sessionHistory.length}</p>
                      </div>
                      <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '40px', height: '40px', borderRadius: '10px' }}>
                        <CheckCircle2 size={18} />
                      </div>
                    </div>
                  </div>

                  {/* Sessions Accordions List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {sessionHistory.map((session) => {
                      const sessionKey = `${session.date}-${session.period}`;
                      const isExpanded = !!expandedSessions[sessionKey];
                      const totalStudentsCount = session.present_count + session.absent_count || 1;
                      const sessionFillRate = Math.round((session.present_count / totalStudentsCount) * 100);

                      // Search, filter, and view local variables
                      const sSearch = sessionSearches[sessionKey] || "";
                      const sFilter = sessionStatusFilters[sessionKey] || "all";
                      const sMode = sessionViewModes[sessionKey] || "manifest";

                      const filteredStudents = session.students.filter(st => {
                        const matchesSearch = (st.name || '').toLowerCase().includes(sSearch.toLowerCase()) || (st.roll || '').toLowerCase().includes(sSearch.toLowerCase());
                        const matchesStatus = sFilter === 'all' || 
                          (sFilter === 'present' && st.status === 'Present') || 
                          (sFilter === 'absent' && st.status === 'Absent');
                        return matchesSearch && matchesStatus;
                      });

                      return (
                        <div 
                          key={sessionKey} 
                          className="glass-panel" 
                          style={{ 
                            overflow: 'hidden', 
                            border: isExpanded ? '1px solid rgba(0, 242, 254, 0.25)' : '1px solid rgba(255,255,255,0.05)',
                            boxShadow: isExpanded ? '0 10px 30px rgba(0,242,254,0.06)' : undefined,
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {/* Accordion Header */}
                          <div 
                            onClick={() => {
                              playCyberSound('click');
                              setExpandedSessions(prev => ({ ...prev, [sessionKey]: !prev[sessionKey] }));
                            }}
                            className="session-accordion-header"
                            style={{ 
                              padding: '22px 28px', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center', 
                              cursor: 'pointer',
                              background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                              transition: 'background 0.3s'
                            }}
                          >
                            <div className="session-accordion-main">
                              {/* Circular Filling progress SVG */}
                              <div style={{ position: 'relative', width: '38px', height: '38px' }}>
                                <svg width="38" height="38" viewBox="0 0 36 36">
                                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={sessionFillRate >= 75 ? '#10b981' : sessionFillRate >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${sessionFillRate}, 100`} />
                                </svg>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#fff' }}>
                                  {sessionFillRate}%
                                </div>
                              </div>
                              <div>
                                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f9', fontFamily: 'Outfit, sans-serif' }}>
                                  Session: {session.date.split('/').join(' / ')}
                                </h4>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '2px', fontFamily: 'monospace' }}>
                                  TIME SLOT: <span style={{ color: '#00f2fe' }}>{session.period}</span> | SIGNATURES: {totalStudentsCount}
                                </p>
                              </div>
                            </div>

                            <div className="session-accordion-stats">
                              <span style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '5px 12px', borderRadius: '20px', color: '#10b981', fontWeight: 700 }}>
                                P: {session.present_count}
                              </span>
                              <span style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '5px 12px', borderRadius: '20px', color: '#ef4444', fontWeight: 700 }}>
                                A: {session.absent_count}
                              </span>
                              <span style={{ 
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
                                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 
                                color: 'var(--color-primary)',
                                fontSize: '0.8rem',
                                fontWeight: 700
                              }}>
                                ▼
                              </span>
                            </div>
                          </div>

                          {/* Accordion content */}
                          {isExpanded && (
                            <div style={{ 
                              borderTop: '1px solid rgba(255,255,255,0.05)', 
                              padding: '24px 28px', 
                              background: 'rgba(8, 12, 20, 0.3)',
                              animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                              position: 'relative'
                            }}>
                              {/* Inner filters & controls */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '220px' }}>
                                  <div style={{ position: 'relative', flex: 1 }}>
                                    <input 
                                      type="text"
                                      className="form-input"
                                      style={{ paddingLeft: '38px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', fontSize: '0.8rem', background: 'rgba(8, 12, 20, 0.4)' }}
                                      placeholder="Search student in session..."
                                      value={sSearch}
                                      onChange={(e) => setSessionSearches(prev => ({ ...prev, [sessionKey]: e.target.value }))}
                                    />
                                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  {/* Filter chips */}
                                  <div style={{ display: 'flex', background: 'rgba(8, 12, 20, 0.5)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    {['all', 'present', 'absent'].map(status => (
                                      <button
                                        key={status}
                                        onClick={() => {
                                          playCyberSound('click');
                                          setSessionStatusFilters(prev => ({ ...prev, [sessionKey]: status }));
                                        }}
                                        style={{
                                          padding: '4px 10px',
                                          fontSize: '0.7rem',
                                          background: sFilter === status ? 'var(--color-primary)' : 'transparent',
                                          color: sFilter === status ? '#0d1323' : 'var(--color-text-muted)',
                                          border: 'none',
                                          borderRadius: '5px',
                                          cursor: 'pointer',
                                          fontWeight: 'bold',
                                          textTransform: 'uppercase',
                                          transition: 'all 0.2s'
                                        }}
                                      >
                                        {status}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Mode switcher */}
                                  <div style={{ display: 'flex', background: 'rgba(8, 12, 20, 0.5)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <button
                                      onClick={() => {
                                        playCyberSound('click');
                                        setSessionViewModes(prev => ({ ...prev, [sessionKey]: 'manifest' }));
                                      }}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '0.7rem',
                                        background: sMode === 'manifest' ? 'var(--color-primary)' : 'transparent',
                                        color: sMode === 'manifest' ? '#0d1323' : 'var(--color-text-muted)',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      📋 LIST
                                    </button>
                                    <button
                                      onClick={() => {
                                        playCyberSound('click');
                                        setSessionViewModes(prev => ({ ...prev, [sessionKey]: 'map' }));
                                      }}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '0.7rem',
                                        background: sMode === 'map' ? 'var(--color-primary)' : 'transparent',
                                        color: sMode === 'map' ? '#0d1323' : 'var(--color-text-muted)',
                                        border: 'none',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      🎯 SEAT MAP
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Inner Views */}
                              {filteredStudents.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                  No students match filters in this session.
                                </div>
                              ) : sMode === 'manifest' ? (
                                /* List Manifest */
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Roll No</th>
                                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Student Name</th>
                                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Branch</th>
                                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Semester</th>
                                        <th style={{ padding: '10px 12px', fontWeight: 600 }}>Email</th>
                                        <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {filteredStudents.map((st) => (
                                        <tr key={st.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#f1f5f9' }}>
                                          <td style={{ padding: '12px 12px', fontWeight: 700, color: '#fff' }}>{st.roll}</td>
                                          <td style={{ padding: '12px 12px', fontWeight: 500 }}>{st.name}</td>
                                          <td style={{ padding: '12px 12px', color: 'var(--color-text-muted)' }}>{st.dep}</td>
                                          <td style={{ padding: '12px 12px', color: 'var(--color-text-muted)' }}>{st.semester}</td>
                                          <td style={{ padding: '12px 12px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{st.email}</td>
                                          <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                                            <span style={{ 
                                              padding: '3px 10px', 
                                              borderRadius: '50px', 
                                              fontSize: '0.7rem', 
                                              fontWeight: 700,
                                              display: 'inline-block',
                                              background: st.status === 'Present' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                              border: st.status === 'Present' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                                              color: st.status === 'Present' ? '#10b981' : '#ef4444'
                                            }}>
                                              {st.status.toUpperCase()}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                /* Tactical Seating Grid Map */
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px', marginTop: '16px' }}>
                                  {filteredStudents.map((st) => {
                                    const isPresent = st.status === 'Present';
                                    const cellColor = isPresent ? '#10b981' : '#ef4444';
                                    const bgLight = isPresent ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)';
                                    const borderLight = isPresent ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                                    
                                    return (
                                      <div
                                        key={st.id}
                                        onMouseEnter={() => setHoveredStudentCard(st)}
                                        onMouseLeave={() => setHoveredStudentCard(null)}
                                        onClick={() => playCyberSound('click')}
                                        style={{
                                          background: bgLight,
                                          border: `1px solid ${borderLight}`,
                                          borderRadius: '10px',
                                          padding: '16px 12px',
                                          textAlign: 'center',
                                          cursor: 'pointer',
                                          position: 'relative',
                                          transition: 'all 0.2s',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          gap: '8px'
                                        }}
                                        className="student-grid-tile"
                                        onMouseOver={(e) => {
                                          e.currentTarget.style.borderColor = cellColor;
                                          e.currentTarget.style.transform = 'translateY(-2px)';
                                          e.currentTarget.style.boxShadow = `0 4px 12px ${isPresent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`;
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.style.borderColor = borderLight;
                                          e.currentTarget.style.transform = 'translateY(0)';
                                          e.currentTarget.style.boxShadow = 'none';
                                        }}
                                      >
                                        <div style={{
                                          width: '34px',
                                          height: '34px',
                                          borderRadius: '50%',
                                          background: 'rgba(255, 255, 255, 0.03)',
                                          border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '0.75rem',
                                          fontWeight: 'bold',
                                          color: cellColor
                                        }}>
                                          {st.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                                          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>{st.name}</div>
                                          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>{st.roll}</div>
                                        </div>
                                        <div style={{
                                          width: '6px',
                                          height: '6px',
                                          borderRadius: '50%',
                                          background: cellColor,
                                          boxShadow: `0 0 6px ${cellColor}`
                                        }} />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Tooltip HUD inside panel */}
                              {hoveredStudentCard && (
                                <div className="glass-panel" style={{
                                  position: 'absolute',
                                  bottom: '15px',
                                  right: '20px',
                                  width: '240px',
                                  padding: '12px 16px',
                                  background: 'rgba(8, 12, 20, 0.95)',
                                  border: `1px solid ${hoveredStudentCard.status === 'Present' ? '#10b981' : '#ef4444'}`,
                                  boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
                                  borderRadius: '8px',
                                  zIndex: 10,
                                  animation: 'fadeInUp 0.15s ease',
                                  fontFamily: 'monospace',
                                  fontSize: '0.7rem',
                                  textAlign: 'left'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px', marginBottom: '6px' }}>
                                    <strong style={{ color: '#fff' }}>STUDENT INFO</strong>
                                    <span style={{ color: hoveredStudentCard.status === 'Present' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{hoveredStudentCard.status.toUpperCase()}</span>
                                  </div>
                                  <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>NAME: <span style={{ color: '#fff' }}>{hoveredStudentCard.name}</span></div>
                                  <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>ROLL: <span style={{ color: '#fff' }}>{hoveredStudentCard.roll}</span></div>
                                  <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>DEPT: <span style={{ color: '#fff' }}>{hoveredStudentCard.dep}</span></div>
                                  <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>SEMESTER: <span style={{ color: '#fff' }}>{hoveredStudentCard.semester}</span></div>
                                  <div style={{ color: 'var(--color-text-muted)' }}>EMAIL: <span style={{ color: '#fff' }}>{hoveredStudentCard.email}</span></div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="reports-section mobile-tab-panel reports-panel" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Filter Bar */}
            <div className="glass-panel hide-on-print" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: '#9ca3af' }}>Select Report Parameters</h4>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                  <label className="form-label">Start Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={reportStartDate} 
                    onChange={e => setReportStartDate(e.target.value)} 
                  />
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px' }}>
                  <label className="form-label">End Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={reportEndDate} 
                    onChange={e => setReportEndDate(e.target.value)} 
                  />
                </div>
                {userRole === 'admin' ? (
                  <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '220px' }}>
                    <label className="form-label">Department</label>
                    <select 
                      className="form-input" 
                      value={reportDeptFilter} 
                      onChange={e => setReportDeptFilter(e.target.value)}
                    >
                      <option value="">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                ) : userRole === 'teacher' ? (
                  <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '220px' }}>
                    <label className="form-label">Subject</label>
                    <select 
                      className="form-input" 
                      value={selectedReportSubjectId} 
                      onChange={e => setSelectedReportSubjectId(e.target.value)}
                      style={{ cursor: 'default' }}
                      disabled={true}
                    >
                      {subjects.filter(s => s.teacher_id === currentUser?.details?.id).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <button 
                  onClick={fetchReport} 
                  className="bg-gradient-btn" 
                  style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 600, height: '46px' }}
                >
                  Regenerate
                </button>
                {reportData.students.length > 0 && (
                  <button 
                    onClick={() => window.print()} 
                    className="btn-secondary" 
                    style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 600, height: '46px' }}
                  >
                    <FileDown size={18} /> Print Report
                  </button>
                )}
              </div>
            </div>

            {/* Print Header (Visible ONLY on print) */}
            <div className="print-only-block" style={{ display: 'none', textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#000', marginBottom: '8px' }}>ACADEMIC ATTENDANCE REPORT</h1>
              <p style={{ color: '#374151', fontSize: '0.95rem' }}>
                Report Period: <strong>{new Date(reportStartDate).toLocaleDateString()}</strong> to <strong>{new Date(reportEndDate).toLocaleDateString()}</strong>
              </p>
              {userRole === 'admin' && reportDeptFilter && (
                <p style={{ color: '#374151', fontSize: '0.95rem', marginTop: '4px' }}>
                  Department: <strong>{reportDeptFilter}</strong>
                </p>
              )}
              {userRole === 'teacher' && selectedReportSubjectId && (
                <p style={{ color: '#374151', fontSize: '0.95rem', marginTop: '4px' }}>
                  Subject: <strong>
                    {subjects.find(s => s.id === parseInt(selectedReportSubjectId))?.name || ''} ({subjects.find(s => s.id === parseInt(selectedReportSubjectId))?.code || ''})
                  </strong>
                </p>
              )}
              <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '8px' }}>
                Total System Academic Days: {reportData.total_working_days} | Generated on {new Date().toLocaleDateString()}
              </p>
              <hr style={{ border: 'none', borderTop: '2px solid #000', marginTop: '20px' }} />
            </div>

            {/* Summary Analytics Cards */}
            <div className="dashboard-grid hide-on-print">
              <div className="glass-panel metric-card" style={{ animationDelay: '100ms' }}>
                <div className="metric-info">
                  <h3>Scanned Students</h3>
                  <p>{reportData.students.length}</p>
                </div>
                <div className="metric-icon" style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe' }}>
                  <Users size={24} />
                </div>
              </div>

              <div className="glass-panel metric-card" style={{ borderColor: reportData.students.filter(s => s.low_attendance).length > 0 ? 'rgba(239,68,68,0.2)' : undefined, animationDelay: '200ms' }}>
                <div className="metric-info">
                  <h3>Low Attendance Alerts</h3>
                  <p style={{ color: reportData.students.filter(s => s.low_attendance).length > 0 ? '#ef4444' : undefined }}>
                    {reportData.students.filter(s => s.low_attendance).length}
                  </p>
                </div>
                <div className="metric-icon" style={{ 
                  background: reportData.students.filter(s => s.low_attendance).length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)', 
                  color: reportData.students.filter(s => s.low_attendance).length > 0 ? '#ef4444' : '#9ca3af' 
                }}>
                  <AlertCircle size={24} />
                </div>
              </div>

              <div className="glass-panel metric-card" style={{ animationDelay: '300ms' }}>
                <div className="metric-info">
                  <h3>Avg Presence Rate</h3>
                  <p>
                    {reportData.students.length > 0 
                      ? (reportData.students.reduce((acc, s) => acc + s.percentage, 0) / reportData.students.length).toFixed(1)
                      : '0.0'
                    }%
                  </p>
                </div>
                <div className="metric-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  <TrendingUp size={24} />
                </div>
              </div>
            </div>

            {/* Report Table */}
            <div className="glass-panel print-container" style={{ padding: '28px' }}>
              {isLoadingReport ? (
                <div className="flex-center" style={{ padding: '60px 0', flexDirection: 'column', gap: '16px', color: '#9ca3af' }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0,242,254,0.1)', borderTopColor: '#00f2fe', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span>Computing attendance records...</span>
                </div>
              ) : reportData.students.length === 0 ? (
                <div className="flex-center" style={{ padding: '40px 0', color: '#9ca3af', flexDirection: 'column', gap: '16px' }}>
                  <BookOpen size={48} />
                  <span>No student attendance logs found in this range.</span>
                </div>
              ) : (
                <div className="table-container">
                  <table className="custom-table print-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Roll Number</th>
                        <th>Name</th>
                        <th>Department</th>
                        <th style={{ textAlign: 'center' }}>Attended Days</th>
                        <th style={{ textAlign: 'center' }}>Total Days</th>
                        <th style={{ textAlign: 'right' }}>Attendance Rate</th>
                        <th className="hide-on-print" style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.students.map(student => (
                        <tr key={student.id} style={{ 
                          background: student.low_attendance ? 'rgba(239,68,68,0.02)' : undefined,
                          color: student.low_attendance ? '#ef4444' : undefined 
                        }}>
                          <td>{student.id}</td>
                          <td style={{ fontWeight: 600 }}>{student.roll}</td>
                          <td style={{ fontWeight: 500 }}>{student.name}</td>
                          <td>{student.dep}</td>
                          <td style={{ textAlign: 'center' }}>{student.present_days}</td>
                          <td style={{ textAlign: 'center' }}>{student.total_days}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: student.low_attendance ? '#ef4444' : '#10b981' }}>
                            {student.percentage}%
                          </td>
                          <td className="hide-on-print" style={{ textAlign: 'center' }}>
                            {student.low_attendance ? (
                              <span className="badge badge-danger" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
                                Shortage
                              </span>
                            ) : (
                              <span className="badge badge-success" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
                                Good
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Dynamic At-Risk Leaderboard & Insights */}
            {reportData && reportData.students && reportData.students.length > 0 && (
              <div className="hide-on-print reports-insights-grid" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '32px', marginTop: '32px' }}>
                {/* At-Risk Leaderboard */}
                <div className="glass-panel" style={{ padding: '28px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                    <AlertCircle size={20} /> At-Risk Students Leaderboard (&lt;75% Attendance)
                  </h3>
                  <div className="table-container" style={{ maxHeight: '380px' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Roll</th>
                          <th>Name</th>
                          <th>Department</th>
                          <th style={{ textAlign: 'right' }}>Attendance</th>
                          <th style={{ textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.students.filter(s => s.percentage < 75).length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px' }}>
                              No students currently at risk. Good job!
                            </td>
                          </tr>
                        ) : (
                          reportData.students.filter(s => s.percentage < 75).sort((a, b) => a.percentage - b.percentage).map(student => (
                            <tr key={student.id}>
                              <td style={{ fontWeight: 700, color: '#fff' }}>{student.roll}</td>
                              <td>{student.name}</td>
                              <td><span style={{ color: 'var(--color-purple)' }}>{student.dep}</span></td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{student.percentage}%</td>
                              <td style={{ textAlign: 'center' }}>
                                <a 
                                  href={`mailto:${student.email || 'student@college.edu'}?subject=URGENT:%20Attendance%20Shortage%20Warning%20-%20${encodeURIComponent(student.name)}&body=Dear%20${encodeURIComponent(student.name)},%0A%0AThis%20is%20to%20notify%20you%20that%20your%20current%20attendance%20in%20${encodeURIComponent(student.dep)}%20is%20at%20${student.percentage}%,%20which%20is%20below%20the%20required%2075%%20threshold.%20Please%20attend%20your%20upcoming%20classes%20regularly%20to%20avoid%20academic%20disciplinary%20action.%0A%0ABest%20regards,%0AAcademic%20Office`}
                                  className="bg-gradient-btn"
                                  style={{ 
                                    padding: '6px 12px', 
                                    borderRadius: '6px', 
                                    fontSize: '0.75rem',
                                    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                    color: '#fff',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 600
                                  }}
                                >
                                  <Mail size={12} />
                                  Warning Email
                                </a>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Peak Attendance Days & Department Stats */}
                <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                    <TrendingUp size={20} /> Attendance Insights
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Peak Attendance Day</h4>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
                        {(() => {
                          if (!stats.weekly_trends || stats.weekly_trends.length === 0) return 'Monday';
                          const maxTrend = [...stats.weekly_trends].sort((a, b) => b.present - a.present)[0];
                          return maxTrend ? `${maxTrend.day} (${maxTrend.present} presents)` : 'Monday';
                        })()}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>The day of the week with the highest attendance records.</span>
                    </div>
                    
                    <div style={{ background: 'rgba(139, 92, 246, 0.04)', border: '1px solid rgba(139, 92, 246, 0.15)', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Highest Performing Branch</h4>
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a78bfa', marginTop: '6px' }}>
                        {(() => {
                          const keys = Object.keys(stats.department_stats);
                          if (keys.length === 0) return 'CSE(IOT)';
                          const maxDept = keys.reduce((a, b) => stats.department_stats[a] > stats.department_stats[b] ? a : b);
                          return maxDept || 'CSE(IOT)';
                        })()}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>The department with the highest presence count today.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && userRole === 'admin' && (
          <div className="settings-section" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={22} style={{ color: '#00f2fe' }} /> Security & Gatekeeping
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px' }}>
                  Configure physical and network restrictions to prevent proxy or remote attendance.
                </p>
              </div>

              {settingsMessage && (
                <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#10b981', fontSize: '0.875rem' }}>
                  {settingsMessage}
                </div>
              )}

              {settingsError && (
                <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem' }}>
                  {settingsError}
                </div>
              )}

              {/* Geofencing Subsection */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px' }}>
                <div className="flex-between" style={{ marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>GPS Geofencing</h4>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '2px' }}>
                      Restricts check-in to a specific geographical radius.
                    </p>
                  </div>
                  <div 
                    onClick={() => setSettingsGeoEnabled(!settingsGeoEnabled)} 
                    style={{
                      width: '48px',
                      height: '26px',
                      backgroundColor: settingsGeoEnabled ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${settingsGeoEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '50px',
                      padding: '2px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'var(--transition)',
                      boxShadow: settingsGeoEnabled ? '0 0 15px rgba(0, 242, 254, 0.15)' : 'none'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: settingsGeoEnabled ? 'var(--color-primary)' : '#94a3b8',
                      transform: settingsGeoEnabled ? 'translateX(22px)' : 'translateX(0px)',
                      transition: 'var(--transition)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>

                {settingsGeoEnabled && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Center Latitude</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-input" 
                        value={settingsLat} 
                        onChange={e => setSettingsLat(e.target.value)} 
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Center Longitude</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-input" 
                        value={settingsLon} 
                        onChange={e => setSettingsLon(e.target.value)} 
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Allowed Radius (meters)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={settingsRadius} 
                        onChange={e => setSettingsRadius(e.target.value)} 
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              (position) => {
                                setSettingsLat(position.coords.latitude);
                                setSettingsLon(position.coords.longitude);
                                setSettingsMessage("Fetched current coordinates!");
                                setTimeout(() => setSettingsMessage(""), 2000);
                              },
                              (err) => {
                                setSettingsError("Could not fetch location permissions.");
                                setTimeout(() => setSettingsError(""), 3000);
                              }
                            );
                          }
                        }}
                        className="btn-secondary"
                        style={{ width: '100%', height: '46px', borderRadius: '8px', fontSize: '0.9rem' }}
                      >
                        Set Current Coordinates
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* IP network restrictions Subsection */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px' }}>
                <div className="flex-between" style={{ marginBottom: '16px' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>IP Subnet Restrictions</h4>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '2px' }}>
                      Allows attendance logging only from specified Wi-Fi networks/subnets.
                    </p>
                  </div>
                  <div 
                    onClick={() => setSettingsIpEnabled(!settingsIpEnabled)} 
                    style={{
                      width: '48px',
                      height: '26px',
                      backgroundColor: settingsIpEnabled ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${settingsIpEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '50px',
                      padding: '2px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'var(--transition)',
                      boxShadow: settingsIpEnabled ? '0 0 15px rgba(0, 242, 254, 0.15)' : 'none'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: settingsIpEnabled ? 'var(--color-primary)' : '#94a3b8',
                      transform: settingsIpEnabled ? 'translateX(22px)' : 'translateX(0px)',
                      transition: 'var(--transition)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </div>

                {settingsIpEnabled && (
                  <div className="form-group" style={{ margin: 0, marginTop: '16px' }}>
                    <label className="form-label">Permitted IP Addresses / Subnets (comma separated)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 127.0.0.1, 192.168.1.0/24"
                      value={settingsIpRanges} 
                      onChange={e => setSettingsIpRanges(e.target.value)} 
                    />
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginTop: '6px' }}>
                      Separate multiple IP addresses or CIDR blocks with a comma. Examples: `127.0.0.1`, `192.168.1.0/24`.
                    </span>
                  </div>
                )}

                {/* Emergency Lockdown Simulation */}
                <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', padding: '20px', marginTop: '24px', textAlign: 'left' }}>
                  <div className="flex-between">
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={18} style={{ color: '#ef4444' }} /> Emergency System Lockdown
                      </h4>
                      <p style={{ color: '#fca5a5', opacity: 0.7, fontSize: '0.8rem', marginTop: '4px' }}>
                        Cut off all face recognition feeds instantly and trigger audio alerts.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newLock = !lockdownActive;
                        setLockdownActive(newLock);
                        if (newLock) {
                          addDiagnosticLog('WARNING: Emergency lockdown protocol engaged!');
                        } else {
                          addDiagnosticLog('Emergency lockdown terminated. Relays online.');
                        }
                      }}
                      style={{
                        background: lockdownActive ? '#10b981' : '#ef4444',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: lockdownActive ? '0 0 15px rgba(16, 185, 129, 0.3)' : '0 0 15px rgba(239, 68, 68, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {lockdownActive ? 'Reset Relays' : 'ENGAGE LOCKDOWN'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={saveSystemSettings}
                className="bg-gradient-btn"
                style={{ 
                  marginTop: '16px', 
                  padding: '14px 28px', 
                  borderRadius: '12px', 
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  width: '100%',
                  boxShadow: '0 4px 20px rgba(0, 242, 254, 0.25)'
                }}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? '💾 Saving settings...' : '💾 Save Settings'}
              </button>
            </div>

            {/* ===== SYSTEM THEME & SOUND CONTROLS ===== */}
            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 size={22} style={{ color: 'var(--color-primary)' }} /> System Themes & Cyber Audio
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px' }}>
                  Choose a sci-fi system interface theme and customize acoustic synth feedback volumes.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Theme Selector */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Active Theme</label>
                  <select 
                    value={activeTheme} 
                    onChange={(e) => {
                      const newTheme = e.target.value;
                      setActiveTheme(newTheme);
                      playCyberSound('click');
                    }}
                    className="form-input"
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--color-text-main)' }}
                  >
                    <option value="cyberpunk">Cyberpunk Neon (Default)</option>
                    <option value="matrix">Matrix Green</option>
                    <option value="obsidian">Obsidian Red</option>
                    <option value="violet">Deep Space Violet</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Swaps color primary coordinates instantly across all views.
                  </span>
                  
                  {/* CRT Screen Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '6px' }}>
                    <div>
                      <span className="form-label" style={{ fontWeight: 600, display: 'block', fontSize: '0.85rem' }}>CRT Terminal Scanlines</span>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Enable retro cathode-ray tube screen curvature & flicker.</span>
                    </div>
                    <div 
                      onClick={() => {
                        setCrtOverlayEnabled(!crtOverlayEnabled);
                        playCyberSound('click');
                      }} 
                      style={{
                        width: '48px',
                        height: '26px',
                        backgroundColor: crtOverlayEnabled ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${crtOverlayEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '50px',
                        padding: '2px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'var(--transition)',
                        boxShadow: crtOverlayEnabled ? '0 0 15px rgba(0, 242, 254, 0.15)' : 'none'
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: crtOverlayEnabled ? 'var(--color-primary)' : '#94a3b8',
                        transform: crtOverlayEnabled ? 'translateX(22px)' : 'translateX(0px)',
                        transition: 'var(--transition)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Audio Settings */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                  <div className="flex-between">
                    <div>
                      <span className="form-label" style={{ fontWeight: 600, display: 'block' }}>Cyber Acoustic Feedback</span>
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Enable electronic synth sound cues on interaction.</span>
                    </div>
                    <div 
                      onClick={() => {
                        const newSound = !soundEnabled;
                        setSoundEnabled(newSound);
                        localStorage.setItem('soundEnabled', newSound);
                        if (newSound) {
                          setTimeout(() => playCyberSound('click'), 50);
                        }
                      }} 
                      style={{
                        width: '48px',
                        height: '26px',
                        backgroundColor: soundEnabled ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${soundEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '50px',
                        padding: '2px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'var(--transition)',
                        boxShadow: soundEnabled ? '0 0 15px rgba(0, 242, 254, 0.15)' : 'none'
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: soundEnabled ? 'var(--color-primary)' : '#94a3b8',
                        transform: soundEnabled ? 'translateX(22px)' : 'translateX(0px)',
                        transition: 'var(--transition)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div className="flex-between">
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} Synth Volume: {Math.round(audioVolume * 100)}%
                      </span>
                    </div>
                    <input 
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={audioVolume}
                      disabled={!soundEnabled}
                      onChange={(e) => {
                        const vol = parseFloat(e.target.value);
                        setAudioVolume(vol);
                        localStorage.setItem('audioVolume', vol);
                      }}
                      onMouseUp={() => {
                        if (soundEnabled) playCyberSound('click');
                      }}
                      onTouchEnd={() => {
                        if (soundEnabled) playCyberSound('click');
                      }}
                      style={{ 
                        width: '100%', 
                        accentColor: 'var(--color-primary)', 
                        height: '4px', 
                        borderRadius: '2px', 
                        cursor: soundEnabled ? 'pointer' : 'not-allowed',
                        opacity: soundEnabled ? 1 : 0.5
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Synth Acoustic Equalizer Panel */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 size={18} style={{ color: 'var(--color-primary)' }} /> Synth Equalizer & Acoustic Customizer
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Oscillator Modulator</label>
                    <select 
                      value={synthModulator} 
                      onChange={(e) => {
                        setSynthModulator(e.target.value);
                        setTimeout(() => playCyberSound('click'), 50);
                      }}
                      className="form-input"
                      style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--color-text-main)' }}
                    >
                      <option value="classic">Classic (Default Mix)</option>
                      <option value="sine">Sine (Soft Pure Tone)</option>
                      <option value="sawtooth">Sawtooth (Aggressive Cyber)</option>
                      <option value="triangle">Triangle (Retro Chiptune)</option>
                      <option value="square">Square (8-bit Robotic)</option>
                    </select>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      Modulates the waveform model of feedback sounds.
                    </span>
                  </div>
                  
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Base Synthesizer Pitch Scale ({synthPitchScale.toFixed(2)}x)</label>
                    <input 
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={synthPitchScale}
                      onChange={(e) => {
                        setSynthPitchScale(parseFloat(e.target.value));
                      }}
                      onMouseUp={() => {
                        playCyberSound('click');
                      }}
                      onTouchEnd={() => {
                        playCyberSound('click');
                      }}
                      style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      Scales the frequency pitch register of system sounds.
                    </span>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                    <div className="flex-between">
                      <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Ambient Hum Drone</label>
                      <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px' }}>
                        <input 
                          type="checkbox" 
                          checked={ambientHumActive} 
                          onChange={e => {
                            setAmbientHumActive(e.target.checked);
                            playCyberSound('click');
                          }} 
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: ambientHumActive ? 'var(--color-primary)' : '#334155',
                          transition: '.3s',
                          borderRadius: '22px'
                        }}>
                          <span style={{
                            position: 'absolute',
                            content: '""',
                            height: '14px', width: '14px',
                            left: ambientHumActive ? '20px' : '4px',
                            bottom: '4px',
                            backgroundColor: 'white',
                            transition: '.3s',
                            borderRadius: '50%'
                          }} />
                        </span>
                      </label>
                    </div>
                    {ambientHumActive && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', animation: 'fadeInUp 0.3s ease both' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Hum Volume: {Math.round(ambientHumVolume * 100)}%</span>
                        <input 
                          type="range"
                          min="0.02"
                          max="0.4"
                          step="0.02"
                          value={ambientHumVolume}
                          onChange={(e) => {
                            setAmbientHumVolume(parseFloat(e.target.value));
                          }}
                          style={{ width: '100%', accentColor: 'var(--color-primary)' }}
                        />
                      </div>
                    )}
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      Generates low-pitch background drone representing cpu frequency load.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== ADMIN ACCOUNT MANAGEMENT SECTION ===== */}
            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={22} style={{ color: '#a78bfa' }} /> Admin Account Management
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px' }}>
                  Apna naam, email aur password change karein. Naaya admin account bhi bana sakte hain.
                </p>
              </div>

              {/* UPDATE OWN PROFILE */}
              <div style={{ background: 'rgba(167,139,250,0.02)', border: '1px solid rgba(167,139,250,0.1)', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit size={16} style={{ color: '#a78bfa' }} /> Mera Admin Profile Update Karein
                </h4>

                {adminProfileMsg && (
                  <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem', marginBottom: '14px' }}>
                    ✅ {adminProfileMsg}
                  </div>
                )}
                {adminProfileErr && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '14px' }}>
                    ❌ {adminProfileErr}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Naam (Name)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={currentUser?.name || 'Apna naam likhein'}
                      value={adminProfileName}
                      onChange={e => setAdminProfileName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Naya Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder={currentUser?.email || 'Naya email likhein'}
                      value={adminProfileEmail}
                      onChange={e => setAdminProfileEmail(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Naya Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Naya password"
                      value={adminProfilePassword}
                      onChange={e => setAdminProfilePassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Password Confirm Karein</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Password dobara likhein"
                      value={adminProfileConfirmPassword}
                      onChange={e => setAdminProfileConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setAdminProfileMsg('');
                    setAdminProfileErr('');
                    if (adminProfilePassword && adminProfilePassword !== adminProfileConfirmPassword) {
                      setAdminProfileErr('Passwords match nahi kar rahe!');
                      return;
                    }
                    if (!adminProfileName && !adminProfileEmail && !adminProfilePassword) {
                      setAdminProfileErr('Kuch bhi likhein update karne ke liye!');
                      return;
                    }
                    setIsUpdatingAdminProfile(true);
                    try {
                      const payload = {};
                      if (adminProfileName) payload.name = adminProfileName;
                      if (adminProfileEmail) payload.email = adminProfileEmail;
                      if (adminProfilePassword) payload.password = adminProfilePassword;
                      const res = await fetch(`${API_BASE_URL}/users/${currentUser?.id || 1}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(payload)
                      });
                      if (!res.ok) {
                        const d = await res.json();
                        throw new Error(d.detail || 'Update failed');
                      }
                      const updated = await res.json();
                      setAdminProfileMsg(`Profile update ho gaya! Ab aap ${updated.email} se login karein.`);
                      setAdminProfileName('');
                      setAdminProfileEmail('');
                      setAdminProfilePassword('');
                      setAdminProfileConfirmPassword('');
                    } catch (err) {
                      setAdminProfileErr(err.message);
                    } finally {
                      setIsUpdatingAdminProfile(false);
                    }
                  }}
                  className="bg-gradient-btn"
                  style={{ marginTop: '16px', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem' }}
                  disabled={isUpdatingAdminProfile}
                >
                  {isUpdatingAdminProfile ? 'Saving...' : '💾 Profile Save Karein'}
                </button>
              </div>

              {/* CREATE NEW ADMIN */}
              <div style={{ background: 'rgba(0,242,254,0.01)', border: '1px solid rgba(0,242,254,0.08)', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={16} style={{ color: '#00f2fe' }} /> Naya Admin Account Banayein
                </h4>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '16px' }}>Ek se adhik admin ho sakte hain — Naaya admin banaiye aur use separate login dein.</p>

                {createAdminMsg && (
                  <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem', marginBottom: '14px' }}>
                    ✅ {createAdminMsg}
                  </div>
                )}
                {createAdminErr && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '14px' }}>
                    ❌ {createAdminErr}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Admin ka Naam</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Jaise: Rajkishore"
                      value={newAdminName}
                      onChange={e => setNewAdminName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Admin ka Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Jaise: raj@college.com"
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Password Set Karein</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Strong password daalein"
                      value={newAdminPassword}
                      onChange={e => setNewAdminPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setCreateAdminMsg('');
                    setCreateAdminErr('');
                    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
                      setCreateAdminErr('Naam, Email aur Password teeno zaroori hain!');
                      return;
                    }
                    setIsCreatingAdmin(true);
                    try {
                      const res = await fetch(`${API_BASE_URL}/users/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ name: newAdminName, email: newAdminEmail, password: newAdminPassword, role: 'admin' })
                      });
                      if (!res.ok) {
                        const d = await res.json();
                        throw new Error(d.detail || 'Admin create nahi hua');
                      }
                      setCreateAdminMsg(`Admin account ban gaya! ${newAdminEmail} se login ho sakta hai.`);
                      setNewAdminName('');
                      setNewAdminEmail('');
                      setNewAdminPassword('');
                    } catch (err) {
                      setCreateAdminErr(err.message);
                    } finally {
                      setIsCreatingAdmin(false);
                    }
                  }}
                  className="bg-gradient-btn"
                  style={{ marginTop: '16px', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #00f2fe, #4facfe)' }}
                  disabled={isCreatingAdmin}
                >
                  {isCreatingAdmin ? 'Bana raha hoon...' : '➕ Naya Admin Banayein'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'student-attendance' && (
          <div className="student-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeInUp 0.5s ease' }}>
            {/* Stats Row */}
            <div className="dashboard-grid">
              {/* Card 1: Attendance Percentage */}
              <div className="glass-panel metric-card" style={{ padding: '24px', animationDelay: '100ms' }}>
                <div className="metric-info">
                  <h3>My Attendance Rate</h3>
                  <p style={{
                    color: (() => {
                      const total = studentLogs.length;
                      const present = studentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
                      const rate = total > 0 ? (present / total) * 100 : 0;
                      return rate < 75 ? '#ef4444' : '#10b981';
                    })()
                  }}>
                    {(() => {
                      const total = studentLogs.length;
                      const present = studentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
                      return total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
                    })()}%
                  </p>
                </div>
                <div className="metric-icon" style={{ 
                  background: (() => {
                    const total = studentLogs.length;
                    const present = studentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
                    const rate = total > 0 ? (present / total) * 100 : 0;
                    return rate < 75 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
                  })(),
                  color: (() => {
                    const total = studentLogs.length;
                    const present = studentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
                    const rate = total > 0 ? (present / total) * 100 : 0;
                    return rate < 75 ? '#ef4444' : '#10b981';
                  })()
                }}>
                  <TrendingUp size={24} />
                </div>
              </div>

              {/* Card 2: Present Days */}
              <div className="glass-panel metric-card" style={{ padding: '24px', animationDelay: '200ms' }}>
                <div className="metric-info">
                  <h3>Presents / Total Days</h3>
                  <p>
                    {studentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length} / {studentLogs.length}
                  </p>
                </div>
                <div className="metric-icon" style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe' }}>
                  <CheckCircle2 size={24} />
                </div>
              </div>

              {/* Card 3: Last Check-In */}
              <div className="glass-panel metric-card" style={{ padding: '24px', animationDelay: '300ms' }}>
                <div className="metric-info">
                  <h3>Last Attendance Log</h3>
                  <p style={{ fontSize: '1rem', fontWeight: 600, marginTop: '8px' }}>
                    {(() => {
                      if (studentLogs.length === 0) return 'No Logs Found';
                      const sorted = [...studentLogs].sort((a, b) => {
                        const dateA = a.date.split('/').reverse().join('-');
                        const dateB = b.date.split('/').reverse().join('-');
                        return new Date(`${dateB}T${b.time}`) - new Date(`${dateA}T${a.time}`);
                      });
                      return `${sorted[0].date} ${sorted[0].time}`;
                    })()}
                  </p>
                </div>
                <div className="metric-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  <Calendar size={24} />
                </div>
              </div>
            </div>

            {/* Subject-wise Attendance Cards */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
                <BookOpen size={20} style={{ color: '#00f2fe' }} />
                Subject-wise Attendance
              </h3>
              
              {Object.keys(studentSubjectStats).length === 0 ? (
                <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                  No subject records found for your department.
                </div>
              ) : (
                <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                  {Object.values(studentSubjectStats).map((subStat, idx) => {
                    const isWarning = subStat.percentage < 75.0 && subStat.totalDays > 0;
                    return (
                      <div key={idx} className="glass-panel metric-card" style={{ padding: '20px', flexDirection: 'column', alignItems: 'stretch', gap: '12px', height: 'auto', animationDelay: `${(idx + 1) * 100}ms` }}>
                        <div className="flex-between">
                          <div>
                            <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>{subStat.subjectCode}</span>
                            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f3f4f6', margin: '2px 0 0 0' }}>{subStat.subjectName}</h4>
                          </div>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: isWarning ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: isWarning ? '#ef4444' : '#10b981',
                            border: `1px solid ${isWarning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                          }}>
                            {subStat.totalDays === 0 ? 'No Classes' : isWarning ? 'Shortage' : 'Good'}
                          </span>
                        </div>
                        
                        <div className="flex-between" style={{ marginTop: '8px' }}>
                          <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Classes: {subStat.presentDays} / {subStat.totalDays}</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: isWarning ? '#ef4444' : '#10b981' }}>
                            {subStat.percentage.toFixed(1)}%
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, subStat.percentage)}%`,
                            height: '100%',
                            background: isWarning ? 'linear-gradient(90deg, #f87171, #ef4444)' : 'linear-gradient(90deg, #34d399, #10b981)',
                            borderRadius: '3px',
                            transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Attendance Shortage Warning */}
            {(() => {
              const total = studentLogs.length;
              const present = studentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
              const rate = total > 0 ? (present / total) * 100 : 0;
              if (total > 0 && rate < 75) {
                return (
                  <div className="glass-panel" style={{
                    padding: '20px',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <AlertCircle size={28} style={{ color: '#ef4444', flexShrink: 0 }} />
                    <div>
                      <h4 style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>Attendance Shortage Warning</h4>
                      <p style={{ color: '#d1d5db', fontSize: '0.875rem' }}>
                        Your attendance rate is currently at <strong>{rate.toFixed(1)}%</strong>, which is below the minimum required <strong>75%</strong> academic limit. Please attend upcoming lectures regularly.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Calendar Widget Container */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div className="flex-between" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Attendance Tracker Calendar</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button onClick={handlePrevMonth} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Prev</button>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', minWidth: '120px', textAlign: 'center' }}>
                    {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={handleNextMonth} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Next</button>
                </div>
              </div>

              {isLoadingStudentLogs ? (
                <div className="flex-center" style={{ padding: '60px 0', flexDirection: 'column', gap: '16px', color: '#9ca3af' }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0,242,254,0.1)', borderTopColor: '#00f2fe', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span>Loading attendance records...</span>
                </div>
              ) : (
                <div className="calendar-grid-wrapper">
                  {/* Calendar Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: '#9ca3af',
                    fontSize: '0.85rem',
                    marginBottom: '12px'
                  }}>
                    <div>SUN</div>
                    <div>MON</div>
                    <div>TUE</div>
                    <div>WED</div>
                    <div>THU</div>
                    <div>FRI</div>
                    <div>SAT</div>
                  </div>

                  {/* Calendar Body */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '10px'
                  }}>
                    {(() => {
                      // Calculate helper
                      const year = calendarDate.getFullYear();
                      const month = calendarDate.getMonth();
                      const startDay = new Date(year, month, 1).getDay();
                      const numDays = new Date(year, month + 1, 0).getDate();
                      
                      const cells = [];
                      
                      // Empty cells for alignment padding
                      for (let i = 0; i < startDay; i++) {
                        cells.push(<div key={`empty-${i}`} style={{ height: '70px' }} />);
                      }
                      
                      // Days cells
                      for (let d = 1; d <= numDays; d++) {
                        const dateStr = `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
                        const dayLog = studentLogs.find(l => l.date === dateStr);
                        
                        let cellBg = 'rgba(255, 255, 255, 0.02)';
                        let cellBorder = '1px solid rgba(255, 255, 255, 0.05)';
                        let cellColor = '#9ca3af';
                        let statusIcon = null;

                        if (dayLog) {
                          if (dayLog.attendance === 'Present' || dayLog.attendance === 'Late') {
                            cellBg = 'rgba(16, 185, 129, 0.08)';
                            cellBorder = '1px solid rgba(16, 185, 129, 0.2)';
                            cellColor = '#10b981';
                            statusIcon = <CheckCircle2 size={12} style={{ color: '#10b981', marginTop: '4px' }} />;
                          } else if (dayLog.attendance === 'Absent') {
                            cellBg = 'rgba(239, 68, 68, 0.08)';
                            cellBorder = '1px solid rgba(239, 68, 68, 0.2)';
                            cellColor = '#ef4444';
                            statusIcon = <AlertCircle size={12} style={{ color: '#ef4444', marginTop: '4px' }} />;
                          }
                        }

                        cells.push(
                          <div 
                            key={`day-${d}`} 
                            className="calendar-day-tile"
                            style={{
                              height: '70px',
                              background: cellBg,
                              border: cellBorder,
                              borderRadius: '8px',
                              padding: '8px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              position: 'relative'
                            }}
                          >
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: cellColor }}>{d}</span>
                            {statusIcon && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', fontWeight: 600 }}>
                                {statusIcon}
                                <span style={{ textTransform: 'uppercase' }}>{dayLog.attendance}</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      return cells;
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'student-profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '32px', animation: 'fadeInUp 0.5s ease' }}>
            {/* Student Credentials / Profile info */}
            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0b0f19',
                  fontWeight: 700,
                  fontSize: '1.75rem',
                  boxShadow: 'var(--glow-shadow)',
                  marginBottom: '16px'
                }}>
                  {currentUser?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ST'}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{currentUser?.name}</h3>
                <span style={{ color: '#00f2fe', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Roll No: {currentUser?.details?.roll}
                </span>
                
                {currentUser?.details?.photo === 'yes' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 12px', borderRadius: '12px', color: '#10b981', fontSize: '0.75rem', fontWeight: 600, marginTop: '12px' }}>
                    <CheckCircle2 size={12} /> Face Registered
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '6px 12px', borderRadius: '12px', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600, marginTop: '12px' }}>
                    <AlertCircle size={12} /> Face Not Registered
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Department</span>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.dep}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Course</span>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.course}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Academic Year</span>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.year}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Semester</span>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.semester}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Email Address</span>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Phone Number</span>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.phone}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>DOB</span>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.dob}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Home Address</span>
                  <span style={{ fontWeight: 500, fontSize: '0.85rem', maxWidth: '180px', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={currentUser?.details?.address}>
                    {currentUser?.details?.address}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Mentor / Teacher</span>
                  <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.teacher}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditingStudentSelf({
                    name: currentUser?.name || '',
                    phone: currentUser?.details?.phone || '',
                    address: currentUser?.details?.address || '',
                    gender: currentUser?.details?.gender || 'Male',
                    dob: currentUser?.details?.dob || ''
                  });
                  setEditStudentSelfError('');
                  setEditStudentSelfSuccess('');
                  setShowEditStudentSelfModal(true);
                }}
                className="bg-gradient-btn"
                style={{
                  width: '100%',
                  marginTop: '20px',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Edit size={16} /> Edit Profile Info
              </button>
            </div>
 
            {/* Right Column Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Register Face Card */}
              <div className="glass-panel" style={{ padding: '32px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={20} style={{ color: '#00f2fe' }} /> Register My Face Profile
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '24px' }}>
                  Upload a selfie or capture live to set up secure face recognition. The system automatically validates lighting, blur, and face presence.
                </p>

                {selfieError && (
                  <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem', marginBottom: '20px' }}>
                    <AlertCircle size={16} />
                    <span>{selfieError}</span>
                  </div>
                )}

                {selfieSuccess && (
                  <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#10b981', fontSize: '0.875rem', marginBottom: '20px' }}>
                    <CheckCircle2 size={16} />
                    <span>{selfieSuccess}</span>
                  </div>
                )}

                {(studentWebcamActive || studentWebcamBootActive) ? (
                  <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div className="scanner-container" style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto', aspectRatio: '4/3', background: '#111827', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="scanner-bracket bracket-tl" />
                      <div className="scanner-bracket bracket-tr" />
                      <div className="scanner-bracket bracket-bl" />
                      <div className="scanner-bracket bracket-br" />
                      {studentWebcamActive && !studentWebcamBootActive && (
                        <div style={{ position: 'absolute', left: 0, width: '100%', height: '2px', background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)', zIndex: 5, animation: 'scan 3s linear infinite' }} />
                      )}

                      <ScannerBootOverlay
                        active={studentWebcamBootActive}
                        onComplete={handleStudentWebcamBootComplete}
                        label="STUD_REG_02"
                        lines={[
                          'INITIALIZING SELFIE OPTICS...',
                          'VALIDATING LIGHTING MATRIX...',
                          'LOADING FACE MESH ENGINE...',
                          'PREPARING BIOMETRIC CAPTURE...',
                          'STUD_REG_02 ONLINE — READY',
                        ]}
                      />

                      {studentWebcamActive && !studentWebcamBootActive && (
                        <div className="scanner-live-hud">
                          <div className="scanner-live-grid" />
                          <div className="scanner-live-radar-mini" />
                          <div className="scanner-live-status">● SELFIE CAPTURE MODE</div>
                        </div>
                      )}
                      
                      {/* HUD Sci-Fi telemetry overlay */}
                      {studentWebcamActive && !studentWebcamBootActive && (
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
                              <span style={{ fontWeight: 'bold' }}>AI MATRIX REG v1.4.2</span>
                            </div>
                            <div>SYS_STATE: <span style={{ color: '#fff' }}>SELFIE_CAPTURE</span></div>
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
                            LOC: STUD_REG_02
                          </div>
                        </>
                      )}

                      <video 
                        ref={studentVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className={studentWebcamBootActive ? 'scanner-video-booting' : ''}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transform: 'scaleX(-1)',
                          display: (studentWebcamActive || studentWebcamBootActive) ? 'block' : 'none',
                        }} 
                      />
                      <canvas ref={studentCanvasRef} style={{ display: 'none' }} />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                      <button 
                        onClick={handleStudentWebcamCapture} 
                        className="bg-gradient-btn" 
                        style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem' }}
                        disabled={isUploadingSelfie}
                      >
                        {isUploadingSelfie ? 'Verifying...' : 'Capture & Register'}
                      </button>
                      <button 
                        onClick={stopStudentWebcam} 
                        className="btn-secondary" 
                        style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <button 
                      onClick={startStudentWebcam} 
                      className="btn-secondary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: '1px solid rgba(0,242,254,0.3)', background: 'rgba(0,242,254,0.05)', color: '#00f2fe' }}
                      disabled={isUploadingSelfie}
                    >
                      <Video size={16} />
                      Use Live Webcam
                    </button>

                    <label 
                      className="btn-secondary"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', cursor: 'pointer', borderColor: 'rgba(255,255,255,0.1)' }}
                    >
                      <Plus size={16} />
                      Upload Selfie Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleStudentFileSelect}
                        disabled={isUploadingSelfie}
                      />
                    </label>
                  </div>
                )}

                {isUploadingSelfie && (
                  <div style={{ color: '#00f2fe', fontSize: '0.85rem', textAlign: 'center', animation: 'pulse 1s infinite' }}>
                    Analyzing selfie quality (lighting, focus, face count)... Please wait...
                  </div>
                )}
              </div>

              {/* Change Password Block */}
              <div className="glass-panel" style={{ padding: '32px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px' }}>Change Account Password</h3>
                
                {passwordChangeError && (
                  <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem', marginBottom: '20px' }}>
                    <AlertCircle size={16} />
                    <span>{passwordChangeError}</span>
                  </div>
                )}

                {passwordChangeSuccess && (
                  <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#10b981', fontSize: '0.875rem', marginBottom: '20px' }}>
                    <CheckCircle2 size={16} />
                    <span>{passwordChangeSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label className="form-label">Current Password / Default Roll No</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Enter current password" 
                      value={oldPassword} 
                      onChange={e => setOldPassword(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '20px' }}>
                    <label className="form-label">New Password</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Enter new password (min 4 characters)" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '20px', marginBottom: '32px' }}>
                    <label className="form-label">Confirm New Password</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Retype new password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)}
                      required 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="bg-gradient-btn" 
                    style={{ width: '100%', padding: '14px', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem' }}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Student Modal */}
      {showEditStudentModal && editingStudent && (
        <div className="flex-center modal-overlay" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                    <option value="CSE(IOT)">CSE(IOT)</option>
                    <option value="CSE(AIML)">CSE(AIML)</option>
                    <option value="CIVIL ENGINEERING">CIVIL ENGINEERING</option>
                    <option value="MECHANICAL ENGINEERING">MECHANICAL ENGINEERING</option>
                    <option value="ELECTRICAL ENGINEERING">ELECTRICAL ENGINEERING</option>
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
        <div className="flex-center modal-overlay" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
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

      {showAddModal && (
        <div className="flex-center modal-overlay" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                    <option value="CSE(IOT)">CSE(IOT)</option>
                    <option value="CSE(AIML)">CSE(AIML)</option>
                    <option value="CIVIL ENGINEERING">CIVIL ENGINEERING</option>
                    <option value="MECHANICAL ENGINEERING">MECHANICAL ENGINEERING</option>
                    <option value="ELECTRICAL ENGINEERING">ELECTRICAL ENGINEERING</option>
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
        <div className="flex-center modal-overlay" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '32px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Capture Face Samples</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '24px' }}>
              Student: <strong style={{ color: '#00f2fe' }}>{captureStudent.name}</strong> ({captureStudent.roll})
            </p>

            {webcamError && (
              <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem', marginBottom: '20px', textAlign: 'left' }}>
                <AlertCircle size={16} />
                <span>{webcamError}</span>
              </div>
            )}

            {/* Video Feed Area */}
            <div className="scanner-container" style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#111827', borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.05)', marginBottom: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
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
            <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
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
        <div className="flex-center modal-overlay" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 200, flexDirection: 'column', gap: '24px' }}>
          <div style={{ width: '64px', height: '64px', border: '4px solid rgba(16,185,129,0.1)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <h3 className="text-gradient" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', fontSize: '1.5rem', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
            {trainMessage}
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>Scanning datasets, preprocessing images and retraining classifier.xml...</p>
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
    </div>
  );
}
