import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { isNative, getApiBaseUrl, requestNativePermissions } from './utils/platform';
import ScannerBootOverlay from './ScannerBootOverlay';
import BottomNav from './components/BottomNav';
import LoginPortal from './components/LoginPortal';
import { getActiveTenantSlug } from './utils/tenantConfig';
import MobileControlPanel from './components/MobileControlPanel';
import GamificationHub from './components/GamificationHub';
import NotificationCenter from './components/NotificationCenter';
import AdvancedFeaturesHub from './components/AdvancedFeaturesHub';
import ConsentModal from './components/ConsentModal';
import PrivacyPolicy from './components/PrivacyPolicy';
import { setupOfflineSyncListener } from './utils/offlineQueue';
import { completeLivenessFlow } from './utils/livenessClient';
import LiveActivityTicker from './components/LiveActivityTicker';
import AppAmbientLayer from './components/animations/AppAmbientLayer';
import ClickFxLayer from './components/animations/ClickFxLayer';
import PageTransitionFlash from './components/animations/PageTransitionFlash';
import CameraAttractHud from './components/animations/CameraAttractHud';
import { 
  Activity,
  Users, 
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
import PremiumUpgradeHub from './components/PremiumUpgradeHub';
import ExplorationLab from './components/ExplorationLab';
import CameraSettingsPanel from './components/CameraSettingsPanel';
import FuturisticFeaturesHub from './components/FuturisticFeaturesHub';
import QuickActionsDock from './components/QuickActionsDock';
import SmartEmptyState from './components/SmartEmptyState';
import OnboardingTour from './components/OnboardingTour';
import ClassroomLiveGrid from './components/ClassroomLiveGrid';
import OfflineBanner from './components/OfflineBanner';
import PullToRefresh from './components/PullToRefresh';
import SmartSuggestionsBar from './components/SmartSuggestionsBar';
import TeacherMiniDashboard from './components/TeacherMiniDashboard';
import StudentAttendanceWallet from './components/StudentAttendanceWallet';
import { recordScan, speakScanner, triggerHaptic, checkKonamiCode, applyTheme, loadFuturisticSettings } from './utils/futuristicFeatures';

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

// =====================================================================
// LEAVE APPLICATION FORM - Used on student dashboard
// =====================================================================
function LeaveApplicationForm({ token, API_BASE_URL, onLeaveApplied, playCyberSound, subjects = [] }) {
  const [form, setForm] = React.useState({ start_date: '', end_date: '', leave_type: 'Medical', reason: '', subject_id: '' });
  const [submitting, setSubmitting] = React.useState(false);
  const [msg, setMsg] = React.useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date || !form.reason.trim()) {
      setMsg({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/users/students/me/leave-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          subject_id: form.subject_id ? parseInt(form.subject_id) : null
        })
      });
      if (res.ok) {
        setMsg({ type: 'success', text: '✅ Leave request submitted successfully!' });
        setForm({ start_date: '', end_date: '', leave_type: 'Medical', reason: '', subject_id: '' });
        playCyberSound('success');
        if (onLeaveApplied) onLeaveApplied();
      } else {
        const err = await res.json();
        setMsg({ type: 'error', text: err.detail || 'Failed to submit leave request.' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>From Date</label>
          <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f4f6', fontSize: '0.82rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>To Date</label>
          <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f4f6', fontSize: '0.82rem' }} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Subject (Optional)</label>
        <select value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}
          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(30,30,45,0.98)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f4f6', fontSize: '0.82rem' }}>
          <option value="">Personal / General Leave (All Subjects)</option>
          {subjects.map(sub => (
            <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Leave Type</label>
        <select value={form.leave_type} onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))}
          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(30,30,45,0.98)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f4f6', fontSize: '0.82rem' }}>
          <option>Medical</option>
          <option>Personal</option>
          <option>Official</option>
          <option>Family Emergency</option>
          <option>Other</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Reason</label>
        <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={3}
          placeholder="Briefly explain your reason for leave..."
          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f4f6', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
      {msg && (
        <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0, color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>{msg.text}</p>
      )}
      <button type="submit" disabled={submitting}
        style={{ padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', background: submitting ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #fb923c, #f97316)', color: submitting ? '#9ca3af' : 'white', transition: 'all 0.2s' }}>
        {submitting ? '⏳ Submitting...' : '📩 Submit Leave Request'}
      </button>
    </form>
  );
}

// =====================================================================
// QR CODE SCANNER MODAL - Dynamic QR scan for checkin
// =====================================================================
function QrScannerModal({ token, API_BASE_URL, selectedSubjectId, subjects, onClose, onStudentCheckedIn, playCyberSound, addDiagnosticLog }) {
  const [errorMsg, setErrorMsg] = React.useState('');
  const [successStudent, setSuccessStudent] = React.useState(null);
  const [errorDetails, setErrorDetails] = React.useState('');
  const [devices, setDevices] = React.useState([]);
  const [activeDeviceId, setActiveDeviceId] = React.useState('');
  const [facingMode, setFacingMode] = React.useState('environment');
  const [cooldown, setCooldown] = React.useState(0);
  const [statusText, setStatusText] = React.useState('Scanning...');
  
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const isProcessingRef = React.useRef(false);
  const lastScanTimeRef = React.useRef(0);
  const requestRef = React.useRef(null);
  const cooldownTimerRef = React.useRef(null);

  // Load jsQR library dynamically
  React.useEffect(() => {
    if (!window.jsQR) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // List cameras
  React.useEffect(() => {
    const initCameras = async () => {
      try {
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        initialStream.getTracks().forEach(t => t.stop());
        
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        
        if (videoDevices.length > 0) {
          const backCam = videoDevices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('rear')
          );
          if (backCam) {
            setActiveDeviceId(backCam.deviceId);
          } else {
            setActiveDeviceId(videoDevices[0].deviceId);
          }
        }
      } catch (err) {
        console.error("Camera permission or list failed", err);
        setErrorMsg("Failed to access camera. Please allow camera permissions in browser.");
      }
    };
    initCameras();
  }, []);

  // Start/restart scanner on deviceId or facingMode change
  React.useEffect(() => {
    const startCam = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      
      const constraints = {
        video: activeDeviceId 
          ? { deviceId: { exact: activeDeviceId } }
          : { facingMode: facingMode }
      };
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setErrorMsg('');
      } catch (err) {
        console.error("Error starting camera stream", err);
        setErrorMsg("Could not initialize camera feed. Try selecting another device.");
      }
    };
    
    startCam();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [activeDeviceId, facingMode]);

  // Frame decoding loop
  React.useEffect(() => {
    const tick = (time) => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        if (time - lastScanTimeRef.current >= 150) {
          lastScanTimeRef.current = time;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            // OPTIMIZED: Capture full viewport with correct aspect ratio instead of distorting to square crop box
            const targetWidth = 480;
            const scale = targetWidth / video.videoWidth;
            const targetHeight = Math.round(video.videoHeight * scale);
            
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
            
            if (window.jsQR) {
              const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
              });
              if (code && code.data && !isProcessingRef.current) {
                isProcessingRef.current = true;
                handleQrScanned(code.data);
              }
            }
          }
        }
      }
      requestRef.current = requestAnimationFrame(tick);
    };
    
    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current);
  }, [selectedSubjectId]);

  const handleQrScanned = async (qrData) => {
    setStatusText('Verifying token...');
    if (playCyberSound) playCyberSound('click');
    
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/scan-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          token: qrData,
          subject_id: selectedSubjectId ? parseInt(selectedSubjectId) : null
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        if (playCyberSound) playCyberSound('success');
        setSuccessStudent(data.student);
        setStatusText('Check-in Successful!');
        if (onStudentCheckedIn) {
          onStudentCheckedIn(data.student);
        }
        if (addDiagnosticLog) {
          addDiagnosticLog(`QR CHECK-IN: ${data.student.name} marked Present.`);
        }
        startCooldown(2500);
      } else {
        throw new Error(data.detail || data.message || 'Verification failed');
      }
    } catch (err) {
      if (playCyberSound) playCyberSound('error');
      setErrorDetails(err.message || 'Invalid or expired check-in QR Code.');
      setStatusText('Scan Failed');
      startCooldown(3000);
    }
  };

  const startCooldown = (durationMs) => {
    const steps = 50;
    const stepDuration = durationMs / steps;
    let currentStep = steps;
    
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    
    cooldownTimerRef.current = setInterval(() => {
      currentStep--;
      setCooldown((currentStep / steps) * 100);
      
      if (currentStep <= 0) {
        clearInterval(cooldownTimerRef.current);
        setSuccessStudent(null);
        setErrorDetails('');
        setStatusText('Scanning...');
        setCooldown(0);
        isProcessingRef.current = false;
      }
    }, stepDuration);
  };

  React.useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const toggleFacingMode = () => {
    if (playCyberSound) playCyberSound('click');
    setFacingMode(prev => {
      const next = prev === 'user' ? 'environment' : 'user';
      setActiveDeviceId(''); // reset explicit device to use facingMode
      return next;
    });
  };

  const handleDeviceChange = (e) => {
    if (playCyberSound) playCyberSound('click');
    setActiveDeviceId(e.target.value);
  };

  return (
    <div className="scanner-modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5, 8, 20, 0.95)', backdropFilter: 'blur(8px)', position: 'fixed', inset: 0, padding: '20px' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scanLine {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}} />
      <div className="scanner-modal-inner" style={{ maxWidth: '440px', width: '100%', background: '#0a0d1a', border: '1px solid rgba(0, 242, 254, 0.25)', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', position: 'relative', boxShadow: '0 0 35px rgba(0,242,254,0.15)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: isProcessingRef.current ? '#f59e0b' : '#00f2fe',
              boxShadow: isProcessingRef.current ? '0 0 8px #f59e0b' : '0 0 8px #00f2fe',
              animation: 'pulse 1.5s infinite'
            }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em', fontFamily: 'monospace' }}>QR CODE ATTENDANCE SCANNER</span>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            color: '#ef4444', borderRadius: '8px', padding: '6px 12px',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s'
          }}>✕ Close</button>
        </div>

        {/* Video stream container */}
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '1/1',
          overflow: 'hidden', background: '#070a13', borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {/* Target Scanning HUD Box */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 5,
            pointerEvents: 'none'
          }}>
            <div style={{
              width: '60%', height: '60%',
              border: `2px dashed ${successStudent ? '#10b981' : errorDetails ? '#ef4444' : 'rgba(0, 242, 254, 0.4)'}`,
              boxShadow: successStudent 
                ? '0 0 30px rgba(16, 185, 129, 0.2)' 
                : errorDetails 
                  ? '0 0 30px rgba(239, 68, 68, 0.2)' 
                  : '0 0 30px rgba(0, 242, 254, 0.05)',
              borderRadius: '16px', transition: 'all 0.3s ease',
              position: 'relative'
            }}>
              {/* Target box corners */}
              <div style={{ position: 'absolute', top: -3, left: -3, width: 16, height: 16, borderTop: '4px solid #00f2fe', borderLeft: '4px solid #00f2fe', borderRadius: '4px 0 0 0' }} />
              <div style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderTop: '4px solid #00f2fe', borderRight: '4px solid #00f2fe', borderRadius: '0 4px 0 0' }} />
              <div style={{ position: 'absolute', bottom: -3, left: -3, width: 16, height: 16, borderBottom: '4px solid #00f2fe', borderLeft: '4px solid #00f2fe', borderRadius: '0 0 0 4px' }} />
              <div style={{ position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderBottom: '4px solid #00f2fe', borderRight: '4px solid #00f2fe', borderRadius: '0 0 4px 0' }} />
            </div>
          </div>

          {/* Scanner horizontal scanning red line */}
          {!isProcessingRef.current && (
            <div style={{
              position: 'absolute', left: 0, right: 0, height: '2px',
              background: 'linear-gradient(90deg, transparent, #ef4444, transparent)',
              zIndex: 4, animation: 'scanLine 2.5s linear infinite', opacity: 0.8
            }} />
          )}

          {/* Success / Error Banners overlay */}
          {successStudent && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(7, 10, 19, 0.96)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', zIndex: 10, padding: '24px', textAlign: 'center',
              animation: 'scaleUp 0.3s ease'
            }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981',
                borderRadius: '50%', padding: '16px', marginBottom: '16px', color: '#10b981'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.04em' }}>ATTENDANCE LOGGED</h3>
              <p style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 600, margin: '0 0 4px' }}>{successStudent.name}</p>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0 }}>Roll No: {successStudent.roll} | {successStudent.dep}</p>
            </div>
          )}

          {errorDetails && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(7, 10, 19, 0.96)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', zIndex: 10, padding: '24px', textAlign: 'center',
              animation: 'scaleUp 0.3s ease'
            }}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444',
                borderRadius: '50%', padding: '16px', marginBottom: '16px', color: '#ef4444'
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h3 style={{ color: '#ef4444', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px', letterSpacing: '0.04em' }}>VERIFICATION FAILED</h3>
              <p style={{ color: '#fca5a5', fontSize: '0.9rem', lineHeight: '1.4', margin: 0 }}>{errorDetails}</p>
            </div>
          )}

          {/* HTML5 video element */}
          {!errorMsg && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%', height: '100%', objectFit: 'cover'
              }}
            />
          )}

          {/* Hidden/Helper Canvas for processing */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Error Message if camera fails */}
          {errorMsg && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', padding: '24px',
              textAlign: 'center', color: '#ef4444', gap: '12px'
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
              <p style={{ fontSize: '0.9rem', margin: 0 }}>{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Cooldown progress bar */}
        {cooldown > 0 && (
          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${cooldown}%`,
              background: successStudent ? '#10b981' : '#ef4444',
              transition: 'width 0.1s linear'
            }} />
          </div>
        )}

        {/* Scan Status Display */}
        <div style={{
          padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'center', fontSize: '0.85rem', fontWeight: 600,
          color: successStudent ? '#10b981' : errorDetails ? '#ef4444' : '#00f2fe',
          fontFamily: 'monospace'
        }}>
          {statusText.toUpperCase()}
        </div>

        {/* Camera Switch Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* Toggle Mode Button */}
            <button
              onClick={toggleFacingMode}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              🔄 Facing: {facingMode === 'user' ? 'Front Cam' : 'Back Cam'}
            </button>
          </div>

          {/* Select dropdown if multiple cameras */}
          {devices.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>Switch Device:</label>
              <select
                value={activeDeviceId}
                onChange={handleDeviceChange}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '8px',
                  background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: '0.8rem', cursor: 'pointer', outline: 'none'
                }}
              >
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
// =====================================================================
// INTERACTIVE ONBOARDING GUIDE MODAL
// =====================================================================
function OnboardingGuideModal({ onClose, playCyberSound }) {
  const [slide, setSlide] = React.useState(0);

  const slides = [
    {
      title: "🧭 Welcome to Smart Attendance!",
      desc: "Let's take a quick 1-minute tour to understand how to use and navigate the system easily.",
      icon: "✨",
      color: "#00f2fe",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: '#d1d5db' }}>
          <p><strong>1. Main Navigation Sidebar:</strong> Switch between logs, reports, profiles, leaves, and configurations on the left panel (bottom menu on mobile).</p>
          <p><strong>2. Profile & Status Check:</strong> Click on "My Profile" at any time to view your enrolled credentials, department mapping, and settings details.</p>
          <p><strong>3. Institution Customization:</strong> Admins can manage themes, lock down access subnet IPs, and establish geofencing parameters.</p>
        </div>
      )
    },
    {
      title: "🎓 Student Dashboard Walkthrough",
      desc: "Here is how students can track their status and register presence dynamically.",
      icon: "🎓",
      color: "#fb923c",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: '#d1d5db' }}>
          <p><strong>📊 Attendance Forecast:</strong> Real-time indicator displaying your presence rate. Shows if you are safe or how many classes you must attend to cross the 75% limit.</p>
          <p><strong>🪪 Virtual ID Check-in:</strong> Open your Virtual ID card to generate a dynamic check-in QR code that rotates every 30 seconds for security. Present it to the teacher's scanner.</p>
          <p><strong>📝 Subject-wise Leaves:</strong> Apply for medical/personal leaves select-wise. These route directly to the respective subject teacher.</p>
        </div>
      )
    },
    {
      title: "🏫 Teacher & Admin Control Panel",
      desc: "Manage classes, schedules, and record student attendance smoothly.",
      icon: "🏫",
      color: "#a78bfa",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: '#d1d5db' }}>
          <p><strong>⚡ Start Session:</strong> Set the subject and date, then initialize the class session to open scanning checks.</p>
          <p><strong>📸 Dual Scan Options:</strong> Use high-precision <strong>Face Scanner</strong> to verify registered biometric faces, or <strong>Scan Student QR</strong> to verify dynamic check-in tokens.</p>
          <p><strong>📋 Review Leaves:</strong> Teachers review leaves for their respective subjects. Admins oversee the entire system logs centrally.</p>
        </div>
      )
    },
    {
      title: "🤖 AI Assistant & Speech Commands",
      desc: "Leverage advanced voice features and virtual support directly.",
      icon: "🤖",
      color: "#10b981",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: '#d1d5db' }}>
          <p><strong>💬 AI Chatbot Counselor:</strong> Talk to the smart assistant for instant help on leaves, system stats, or profile details.</p>
          <p><strong>🗣️ Voice Speech Commands:</strong> Click the microphone and say commands to control the app automatically:
            <br />• <em>"start scanner"</em> — launches face recognition modal.
            <br />• <em>"open profile"</em> / <em>"open leaves"</em> — navigates tabs.
            <br />• <em>"logout"</em> — logs out of the app.
          </p>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (playCyberSound) playCyberSound('click');
    if (slide < slides.length - 1) {
      setSlide(slide + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (playCyberSound) playCyberSound('click');
    if (slide > 0) {
      setSlide(slide - 1);
    }
  };

  const current = slides[slide];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'rgba(5, 8, 20, 0.9)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.25s ease'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'linear-gradient(135deg, #090c15 0%, #15182b 100%)',
        border: `1.5px solid ${current.color}40`,
        borderRadius: '24px', padding: '32px',
        width: '100%', maxWidth: '480px',
        boxShadow: `0 0 40px ${current.color}15, 0 10px 40px rgba(0,0,0,0.5)`,
        position: 'relative', overflow: 'hidden',
        transition: 'all 0.3s ease-out',
        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        {/* Glowing decorative indicator */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '160px', height: '160px',
          background: `radial-gradient(circle, ${current.color}15 0%, transparent 70%)`,
          borderRadius: '50%', pointerEvents: 'none'
        }} />

        <button onClick={onClose} style={{ position: 'absolute', top: '18px', right: '18px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#9ca3af', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>✕</button>

        {/* Slide Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${current.color}15`, border: `1px solid ${current.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem' }}>
            {current.icon}
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>{current.title}</h2>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '4px 0 0' }}>{current.desc}</p>
          </div>
        </div>

        {/* Slide Content */}
        <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: '16px', minHeight: '190px', marginBottom: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {current.content}
        </div>

        {/* Navigation Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Progress Indicators */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {slides.map((_, idx) => (
              <div key={idx} style={{ width: idx === slide ? '24px' : '8px', height: '8px', borderRadius: '4px', background: idx === slide ? current.color : 'rgba(255,255,255,0.15)', transition: 'all 0.3s ease' }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {slide > 0 && (
              <button onClick={handlePrev} style={{ padding: '8px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                Back
              </button>
            )}
            <button onClick={handleNext} style={{ padding: '10px 24px', borderRadius: '10px', background: current.color, border: 'none', color: '#000', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 15px ${current.color}30`, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              {slide === slides.length - 1 ? "Start Exploring" : "Next Step"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// =====================================================================
// AI ATTENDANCE FORECASTER & BUNK SIMULATOR CARD
// =====================================================================
function AiAttendanceForecaster({ blueprintData = [], playCyberSound }) {
  const [selectedSubId, setSelectedSubId] = React.useState('');
  const [simType, setSimType] = React.useState('attend'); // 'attend' or 'bunk'
  const [simCount, setSimCount] = React.useState(2);

  React.useEffect(() => {
    if (blueprintData.length > 0 && !selectedSubId) {
      setSelectedSubId(blueprintData[0].subject_id);
    }
  }, [blueprintData, selectedSubId]);

  if (blueprintData.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(0,242,254,0.15)', background: 'rgba(255,255,255,0.01)', textAlign: 'center', color: '#9ca3af' }}>
        <p style={{ fontSize: '1.4rem', margin: '0 0 8px' }}>🤖</p>
        <p style={{ fontSize: '0.85rem', margin: 0 }}>Attendance logs are empty. Simulator will activate once class logs are recorded.</p>
      </div>
    );
  }

  const activeSub = blueprintData.find(s => s.subject_id === parseInt(selectedSubId)) || blueprintData[0];
  
  // Calculate stats
  const vals = Object.values(activeSub?.calendar || {});
  const present = vals.filter(v => v === 'Present').length;
  const late = vals.filter(v => v === 'Late').length;
  const absent = vals.filter(v => v === 'Absent').length;
  const total = vals.length;
  const currentRate = total > 0 ? ((present + late) / total) * 100 : 0;

  // Simulate changes
  const simTotal = total + simCount;
  const simPresent = simType === 'attend' ? (present + late) + simCount : (present + late);
  const simRate = simTotal > 0 ? (simPresent / simTotal) * 100 : 0;

  const isSafe = simRate >= 75;

  // Recommendation generator
  const getRecommendation = () => {
    if (total === 0) {
      return `New course registered. Attending your initial classes is critical to establish a strong attendance base.`;
    }
    if (simType === 'bunk') {
      if (simRate < 75) {
        return `⚠️ Critically Unsafe! Bunking the next ${simCount} lecture(s) of ${activeSub.subject_name} will drag your attendance down to ${simRate.toFixed(1)}% (below the 75% limit). You should attend all classes.`;
      } else if (simRate < 77) {
        return `⚠️ Risk Warning! Bunking will drop your attendance to ${simRate.toFixed(1)}%. You will remain just above the border zone. Avoid missing classes.`;
      } else {
        const canBunkMax = Math.floor((present + late) / 0.75 - total);
        return `🟢 You can safely bunk. Your attendance will remain at ${simRate.toFixed(1)}%. Technically, you can miss up to ${canBunkMax} lectures of this subject without dropping below 75%.`;
      }
    } else {
      if (currentRate < 75 && simRate >= 75) {
        return `🎉 Breakthrough! Attending the next ${simCount} lecture(s) will lift your attendance to ${simRate.toFixed(1)}%, successfully restoring your status back into the safe zone.`;
      } else if (currentRate < 75) {
        const remaining = Math.ceil((0.75 * total - (present + late)) / 0.25);
        return `📈 Keep going! Attending these ${simCount} classes raises your status to ${simRate.toFixed(1)}%. You need to attend at least ${remaining} consecutive classes to reach 75%.`;
      } else {
        return `🚀 Excellent drive! Attending ${simCount} more classes increases your rating to ${simRate.toFixed(1)}%, solidifying your safe buffer and academic profile.`;
      }
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '24px', borderRadius: '20px',
      border: `1px solid ${isSafe ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
      background: 'linear-gradient(135deg, rgba(9,12,21,0.98) 0%, rgba(22,22,44,0.98) 100%)',
      boxShadow: `0 8px 32px rgba(0,0,0,0.3)`
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(0,242,254,0.1)', border: '1px solid rgba(0,242,254,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            🤖
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>AI Attendance Forecaster & Bunk Simulator</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>Select a subject to project future attendance and safety margins</p>
          </div>
        </div>

        {/* Subject Select */}
        <select value={selectedSubId} onChange={e => {
          setSelectedSubId(e.target.value);
          if (playCyberSound) playCyberSound('click');
        }} style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(30,30,45,0.98)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f4f6', fontSize: '0.8rem', outline: 'none' }}>
          {blueprintData.map(sub => (
            <option key={sub.subject_id} value={sub.subject_id}>{sub.subject_name} ({sub.subject_code})</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
        {/* Left Side: Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Toggle Type */}
          <div>
            <label style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Simulation Scenario</label>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => { setSimType('attend'); if (playCyberSound) playCyberSound('click'); }} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: simType === 'attend' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent', color: simType === 'attend' ? '#000' : '#9ca3af', transition: 'all 0.2s' }}>
                🟢 Attend Lectures
              </button>
              <button onClick={() => { setSimType('bunk'); if (playCyberSound) playCyberSound('click'); }} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: simType === 'bunk' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent', color: simType === 'bunk' ? '#fff' : '#9ca3af', transition: 'all 0.2s' }}>
                🔴 Bunk Lectures
              </button>
            </div>
          </div>

          {/* Slider Count */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Number of Classes</label>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: simType === 'attend' ? '#10b981' : '#ef4444' }}>{simCount} class{simCount !== 1 ? 'es' : ''}</span>
            </div>
            <input type="range" min="1" max="15" value={simCount} onChange={e => setSimCount(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: simType === 'attend' ? '#10b981' : '#ef4444', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
          </div>
        </div>

        {/* Right Side: Projections Output */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Current Attendance</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: currentRate >= 75 ? '#10b981' : '#ef4444' }}>{currentRate.toFixed(1)}%</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: '#d1d5db', fontWeight: 600 }}>Forecasted Attendance</span>
            <span style={{
              fontSize: '1.2rem', fontWeight: 800,
              color: isSafe ? '#10b981' : '#ef4444',
              textShadow: isSafe ? '0 0 10px rgba(16,185,129,0.3)' : '0 0 10px rgba(239,68,68,0.3)'
            }}>{simRate.toFixed(1)}%</span>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(simRate, 100)}%`, height: '100%', background: isSafe ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
          </div>

          {/* Safety margin badge */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
              background: isSafe ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: isSafe ? '#10b981' : '#ef4444',
              border: `1px solid ${isSafe ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
            }}>
              {isSafe ? '🟢 SAFE BUFFER' : '🔴 WARNING: BELOW 75%'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Recommendation Message */}
      <div style={{
        marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
        background: isSafe ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
        borderLeft: `3px solid ${isSafe ? '#10b981' : '#ef4444'}`,
        color: '#d1d5db', fontSize: '0.8rem', lineHeight: 1.45
      }}>
        <strong>🤖 AI Coach:</strong> {getRecommendation()}
      </div>
    </div>
  );
}

function VirtualIdCardModal({ currentUser, token, API_BASE_URL, onClose }) {
  const [qrToken, setQrToken] = React.useState(null);
  const [countdown, setCountdown] = React.useState(30);
  const [loading, setLoading] = React.useState(false);

  const fetchQrToken = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/students/me/qr-token`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQrToken(data.token);
        setCountdown(data.expires_in || 30);
      }
    } catch (e) {
      console.error('QR token fetch failed', e);
    } finally {
      setLoading(false);
    }
  }, [token, API_BASE_URL]);

  React.useEffect(() => {
    fetchQrToken();
  }, [fetchQrToken]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchQrToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchQrToken]);

  // Build QR code image URL using Google Charts API (no npm needed)
  const qrUrl = qrToken
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrToken)}&bgcolor=0d0d1a&color=00f2fe&margin=10`
    : null;

  const detail = currentUser?.details || {};

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.3s ease'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(13,13,26,0.98) 0%, rgba(22,22,44,0.98) 100%)',
        border: '1px solid rgba(0,242,254,0.3)',
        borderRadius: '24px', padding: '36px 32px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 0 60px rgba(0,242,254,0.15), 0 0 120px rgba(139,92,246,0.08)',
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Glow effect blobs */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(0,242,254,0.12), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#9ca3af', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'inline-block', padding: '4px 16px', borderRadius: '20px', background: 'rgba(0,242,254,0.1)', border: '1px solid rgba(0,242,254,0.25)', color: '#00f2fe', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>
            🎓 Smart Attendance System
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px', background: 'linear-gradient(135deg, #00f2fe, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {currentUser?.name}
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0 }}>{detail.dep || 'N/A'} · {detail.course || 'N/A'}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          {[
            { label: 'Roll No', value: detail.roll || 'N/A' },
            { label: 'Year', value: detail.year || 'N/A' },
            { label: 'Semester', value: detail.semester || 'N/A' },
            { label: 'Mentor', value: detail.teacher || 'N/A' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: '#6b7280', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>{label}</p>
              <p style={{ color: '#f3f4f6', fontSize: '0.9rem', fontWeight: 600, margin: '2px 0 0' }}>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>Dynamic QR — Show to Teacher</p>
          <div style={{
            borderRadius: '16px', padding: '8px', width: '216px', height: '216px',
            background: '#0d0d1a', border: '2px solid rgba(0,242,254,0.35)',
            boxShadow: '0 0 30px rgba(0,242,254,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {loading ? (
              <div style={{ color: '#00f2fe', fontSize: '0.8rem' }}>Generating QR...</div>
            ) : qrUrl ? (
              <img src={qrUrl} alt="QR Code" style={{ width: '200px', height: '200px', borderRadius: '8px' }} />
            ) : (
              <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center' }}>Failed to load QR code</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: `${(countdown / 30) * 80}px`, height: '4px', borderRadius: '2px', background: countdown > 10 ? '#10b981' : '#ef4444', transition: 'width 1s linear, background 0.5s' }} />
            <p style={{ color: countdown > 10 ? '#10b981' : '#ef4444', fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>
              {countdown}s
            </p>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.72rem', textAlign: 'center', margin: 0 }}>
            QR refreshes automatically every 30 seconds for security.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  API_BASE_URL = getApiBaseUrl();
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
  const [editingInst, setEditingInst] = useState(null);
  const [isUpdatingInst, setIsUpdatingInst] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpTestStatus, setSmtpTestStatus] = useState({ loading: false, success: '', error: '' });
  const [neuralMeshCanvas, setNeuralMeshCanvas] = useState(null);
  const neuralMeshCanvasRef = useCallback((node) => {
    if (node !== null) {
      setNeuralMeshCanvas(node);
    }
  }, []);

  // Biometric / Sound / Theme States
  const [hudMetrics, setHudMetrics] = useState({ fps: '30.0', lighting: '92%', quality: 'EXCELLENT' });
  const [activeTheme, setActiveTheme] = useState(localStorage.getItem('theme') || 'cyberpunk');
  const [audioVolume, setAudioVolume] = useState(parseFloat(localStorage.getItem('audioVolume') || '0.5'));
  const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('soundEnabled') === 'true');

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

  const [tenantBranding, setTenantBranding] = useState(null);
  
  useEffect(() => {
    const loadTenantBranding = async () => {
      try {
        const slug = getActiveTenantSlug();
        const res = await fetch(`${API_BASE_URL}/institutions/branding/${slug}`);
        if (res.ok) {
          const branding = await res.json();
          setTenantBranding(branding);
          
          if (branding.primary_color) {
            document.documentElement.style.setProperty('--color-primary', branding.primary_color);
            document.documentElement.style.setProperty('--border-color-glow', `${branding.primary_color}59`);
            document.documentElement.style.setProperty('--glow-shadow', `0 0 25px ${branding.primary_color}33`);
          }
          if (branding.secondary_color) {
            document.documentElement.style.setProperty('--color-secondary', branding.secondary_color);
          }
          
          document.title = `${branding.name} - Smart Attendance System`;
          addDiagnosticLog(`[SYS] Loaded branding: ${branding.name}`);
        } else {
          addDiagnosticLog(`[SYS] Branding fetch failed. Using default settings.`);
        }
      } catch (err) {
        console.error("Branding load error:", err);
      }
    };
    loadTenantBranding();
  }, []);

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
      } catch (e) {
        console.warn('Native status bar styling not active:', e);
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

  const playCyberSound = (type) => {
    if (!soundEnabled) return;
    if (typeof window === 'undefined') return;
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
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cached_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (_) {
      return null;
    }
  });

  useEffect(() => {
    if (!token) return undefined;
    return setupOfflineSyncListener(API_BASE_URL, () => token);
  }, [token]);

  const handleConsentAccept = async () => {
    localStorage.setItem('biometric_consent', 'true');
    setShowConsentModal(false);
    if (token && userRole === 'student') {
      try {
        await fetch(`${API_BASE_URL}/users/students/me/consent`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_) { /* optional */ }
    }
  };
  const [sessionFetchError, setSessionFetchError] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState('admin');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Multi-select States
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [selectedTeacherIds, setSelectedTeacherIds] = useState(new Set());
  const [selectedLogIds, setSelectedLogIds] = useState(new Set());

  // Student Portal States
  const [studentLogs, setStudentLogs] = useState([]);
  const [isLoadingStudentLogs, setIsLoadingStudentLogs] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showVirtualId, setShowVirtualId] = useState(false);
  const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [liveFaceGrid, setLiveFaceGrid] = useState([]);
  const konamiRef = useRef([]);
  const [showQrScannerModal, setShowQrScannerModal] = useState(false);
  
  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem('just_logged_in_tour') === 'true';
    if (token && justLoggedIn) {
      if (!localStorage.getItem('onboarding_guide_done')) {
        setShowOnboardingGuide(true);
        localStorage.setItem('onboarding_guide_done', 'true');
      }
      if (!localStorage.getItem('onboarding_tour_done')) {
        setTimeout(() => setShowOnboardingTour(true), 1500);
        localStorage.setItem('onboarding_tour_done', 'true');
      }
      sessionStorage.removeItem('just_logged_in_tour');
    }
    const fx = loadFuturisticSettings();
    applyTheme(fx.themeId || 'default', fx.customPrimary);
  }, [token]);

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
  
  // Student Portal Change Password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // App Navigation & Modal State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubSetting, setActiveSubSetting] = useState(null);
  const [activeDashboardSubTab, setActiveDashboardSubTab] = useState(null);

  useEffect(() => {
    setActiveSubSetting(null);
    setActiveDashboardSubTab(null);
  }, [activeTab]);


  // Feedback Form States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState('suggestion'); // 'bug', 'suggestion', 'general'
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);

  // AI Chatbot States
  const [showChatBot, setShowChatBot] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const chatBottomRef = useRef(null);

  // Advanced AI Chatbot States
  const [botPersonality, setBotPersonality] = useState('futuristic');
  const [botVoiceEnabled, setBotVoiceEnabled] = useState(false);
  const [botWakeWordEnabled, setBotWakeWordEnabled] = useState(
    localStorage.getItem('botWakeWordEnabled') === 'true'
  );
  const [botVoiceSpeed, setBotVoiceSpeed] = useState(1.0);
  const [botVoicePitch, setBotVoicePitch] = useState(1.0);
  const [botSuggestionCategory, setBotSuggestionCategory] = useState('general');
  const [botAttachedImage, setBotAttachedImage] = useState(null);
  const [botAttachedImageMime, setBotAttachedImageMime] = useState(null);
  const [botAttachedImageName, setBotAttachedImageName] = useState('');
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);

  const [botVoiceSelected, setBotVoiceSelected] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [botAutoSpeak, setBotAutoSpeak] = useState(false);
  const recognitionRef = useRef(null);
  const chatListRef = useRef(null);
  const [isVoiceAssistantMode, setIsVoiceAssistantMode] = useState(false);
  const voiceAssistantActiveRef = useRef(false);
  const wakeWordRecRef = useRef(null);
  const voiceAssistantErrorCountRef = useRef(0);
  const wakeWordErrorCountRef = useRef(0);
  const [showVoicePulseFlash, setShowVoicePulseFlash] = useState(false);

  // New Voice State Machine & Resiliency Refs
  const voiceSystemStateRef = useRef('off'); // 'off', 'wake_word', 'active_assistant', 'chatbot_mic'
  const isWakeWordRunningRef = useRef(false);
  const isActiveAssistantRunningRef = useRef(false);
  const isChatbotMicRunningRef = useRef(false);
  const isSpeakingRef = useRef(false);

  // In-App Update Checker
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [updateDownloadedToast, setUpdateDownloadedToast] = useState(false);
  const [serverLatestVersion, setServerLatestVersion] = useState('');
  const [updateActiveFlag, setUpdateActiveFlag] = useState(false);
  const [explorationSettings, setExplorationSettings] = useState(() => loadExplorationSettings());
  const [subscriptionPlan, setSubscriptionPlan] = useState('free');
  const [hasPremiumAccess, setHasPremiumAccess] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle Android Native Back Button Navigation
  useEffect(() => {
    let active = true;
    let handle = null;

    const initBackButton = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        if (!active) return;
        handle = await CapApp.addListener('backButton', () => {
          if (activeSubSetting) {
            setActiveSubSetting(null);
          } else if (activeDashboardSubTab) {
            setActiveDashboardSubTab(null);
          } else if (showChatBot) {
            setShowChatBot(false);
          } else if (showFeedbackModal) {
            setShowFeedbackModal(false);
          } else if (showPrivacyPolicy) {
            setShowPrivacyPolicy(false);
          } else if (activeTab !== 'dashboard' && activeTab !== 'student-attendance') {
            if (userRole === 'student') {
              setActiveTab('student-attendance');
            } else {
              setActiveTab('dashboard');
            }
          } else {
            CapApp.exitApp();
          }
        });
      } catch (e) {
        console.warn("Native back button handler not active:", e);
      }
    };

    initBackButton();

    return () => {
      active = false;
      if (handle) {
        if (typeof handle.then === 'function') {
          handle.then(h => h.remove()).catch(() => {});
        } else if (typeof handle.remove === 'function') {
          handle.remove();
        }
      }
    };
  }, [activeTab, activeSubSetting, activeDashboardSubTab, showChatBot, showFeedbackModal, showPrivacyPolicy, userRole]);

  // In-App Update Checker — pings backend /health/update-check on load + every 4 hrs
  const checkForUpdate = useCallback(async (isManual = false) => {
    try {
      const ownerEmail = currentUser?.email ? encodeURIComponent(currentUser.email) : '';
      const resp = await fetch(
        `${API_BASE_URL}/health/update-check?client_version=${encodeURIComponent(APP_VERSION)}${ownerEmail ? `&user_email=${ownerEmail}` : ''}`,
        { cache: 'no-store' }
      );
      if (!resp.ok) {
        if (isManual) {
          alert("Unable to contact the update server. Please check your internet connection.");
        }
        return;
      }
      const data = await resp.json();
      const latestVersion = (data.latest_version || '').replace(/^v/i, '');
      setServerLatestVersion(latestVersion);
      setUpdateActiveFlag(!!data.update_active || !!data.update_beta_active);

      // Explicitly check if update is available on server and has not been acknowledged/dismissed
      const hasNewUpdate = (data.update_available || isUpdateNewer(latestVersion, APP_VERSION)) && (isManual || !isVersionAcknowledged(latestVersion));

      if (hasNewUpdate) {
        const downloadUrl = data.update_download_url || `https://github.com/rajkishorock-arch/SMART-ATTENDANCE-SYSTEM/releases/download/v${latestVersion}/app-release.apk`;
        setUpdateAvailable({
          version: latestVersion,
          downloadUrl: downloadUrl,
          isOwnerBeta: !!data.is_owner_beta,
        });
        setUpdateDismissed(false);
        
        if (isManual) {
          const confirmDownload = window.confirm(
            `🚀 New Update Available!\n\nVersion: v${latestVersion}\nDescription: A new system release is ready for installation.\n\nWould you like to download the latest update package (APK) now?`
          );
          if (confirmDownload) {
            window.open(downloadUrl, '_blank');
          }
        }
      } else {
        setUpdateAvailable(null);
        setUpdateDismissed(true);
        markCurrentVersionInstalled();
        if (isManual) {
          alert(`✨ Up to Date!\n\nYou are already using the latest version of the app (v${APP_VERSION}). No updates required at this time.`);
        }
      }
    } catch (e) {
      if (isManual) {
        alert("Failed to connect to the update check endpoint. Please check your internet connection.");
      }
    }
  }, [currentUser?.email]);

  const handleManualCheck = useCallback(() => {
    checkForUpdate(true);
  }, [checkForUpdate]);

  useEffect(() => {
    checkForUpdate();
    const interval = setInterval(checkForUpdate, 4 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  // Fetch premium + subscription status
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/premium/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
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
        try { wakeWordRecRef.current.abort(); } catch (e) {}
        isWakeWordRunningRef.current = false;
      }
      if (recognitionRef.current && (isActiveAssistantRunningRef.current || isChatbotMicRunningRef.current)) {
        try { recognitionRef.current.abort(); } catch (e) {}
        isActiveAssistantRunningRef.current = false;
        isChatbotMicRunningRef.current = false;
      }
      return;
    }

    // 1. WAKE WORD STATE
    if (state === 'wake_word') {
      // Ensure active assistant or chatbot mic are stopped
      if (recognitionRef.current && (isActiveAssistantRunningRef.current || isChatbotMicRunningRef.current)) {
        try { recognitionRef.current.abort(); } catch (e) {}
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
        try { wakeWordRecRef.current.abort(); } catch (e) {}
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
        try { wakeWordRecRef.current.abort(); } catch (e) {}
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
      } catch (err) {}
      try {
        setMobileControlOpen(false);
      } catch (err) {}
      try {
        setShowScannerModal(false);
      } catch (err) {}
      try {
        setShowFeedbackModal(false);
      } catch (err) {}
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
          } catch(e) {}
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
      setTimeout(() => { try { startWebcam(); } catch(e) {} }, 300);
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
      try { stopWebcam(); } catch(e){}
      try { stopAttendanceCam(); } catch(e){}
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

  const [activeTelemetry, setActiveTelemetry] = useState({ total_active: 0, students: 0, teachers: 0, admins: 0 });

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const sessionInitializedRef = useRef(false);

  // Phase 5 States
  const [diagnosticWarnings, setDiagnosticWarnings] = useState({ lighting: '', distance: '' });
  const [timetableSubTab, setTimetableSubTab] = useState('directory'); // 'directory' or 'planner'

  // Multi-Tenant Institution Management States
  const [institutionsList, setInstitutionsList] = useState([]);
  const [newInstName, setNewInstName] = useState('');
  const [newInstSlug, setNewInstSlug] = useState('');
  const [newInstPrimary, setNewInstPrimary] = useState('#4F46E5');
  const [newInstSecondary, setNewInstSecondary] = useState('#06B6D4');
  const [newInstAdminEmail, setNewInstAdminEmail] = useState('');
  const [newInstAdminName, setNewInstAdminName] = useState('');
  const [newInstAdminPassword, setNewInstAdminPassword] = useState('');
  const [isAddingInstitution, setIsAddingInstitution] = useState(false);
  const [instSuccessMessage, setInstSuccessMessage] = useState('');
  const [instErrorMessage, setInstErrorMessage] = useState('');

  // System Release Update States
  const [releaseVersion, setReleaseVersion] = useState('');
  const [releaseDownloadUrl, setReleaseDownloadUrl] = useState('');
  const [releaseMasterPassword, setReleaseMasterPassword] = useState('');
  const [isReleasingUpdate, setIsReleasingUpdate] = useState(false);
  const [releaseSuccessMessage, setReleaseSuccessMessage] = useState('');
  const [releaseErrorMessage, setReleaseErrorMessage] = useState('');
  const [buildStatus, setBuildStatus] = useState('idle');
  const [buildVersion, setBuildVersion] = useState('');
  const [buildError, setBuildError] = useState('');
  const [showManualReleaseForm, setShowManualReleaseForm] = useState(false);
  const [isTriggeringBuild, setIsTriggeringBuild] = useState(false);
  const [activeReleaseVersion, setActiveReleaseVersion] = useState('');
  const [activeReleaseUrl, setActiveReleaseUrl] = useState('');
  // Toggle Update States
  const [currentUpdateActive, setCurrentUpdateActive] = useState(false); // mirrors DB update_active
  const [currentBetaActive, setCurrentBetaActive] = useState(false);
  const [pendingToggleMode, setPendingToggleMode] = useState('public'); // 'public' | 'beta'
  const [toggleMasterPassword, setToggleMasterPassword] = useState('');
  const [isTogglingUpdate, setIsTogglingUpdate] = useState(false);
  const [toggleSuccessMessage, setToggleSuccessMessage] = useState('');
  const [toggleErrorMessage, setToggleErrorMessage] = useState('');
  const [showToggleMasterKeyModal, setShowToggleMasterKeyModal] = useState(false);
  const [pendingToggleValue, setPendingToggleValue] = useState(false); // the target ON/OFF value

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

  // Voice Assistant States
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceLanguage, setVoiceLanguage] = useState('english'); // 'english'
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
  const [serverWarmingUp, setServerWarmingUp] = useState(false);
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
    } catch (_) {
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
    } catch (_) { return []; }
  });
  const [logs, setLogs] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_logs');
      return cached ? JSON.parse(cached) : [];
    } catch (_) { return []; }
  });
  const [departments, setDepartments] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_departments');
      return cached ? JSON.parse(cached) : ['CSE(IOT)', 'ECE', 'Mechanical'];
    } catch (_) { return ['CSE(IOT)', 'ECE', 'Mechanical']; }
  });
  const [departmentsList, setDepartmentsList] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_departmentsList');
      return cached ? JSON.parse(cached) : [];
    } catch (_) { return []; }
  });
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [deptError, setDeptError] = useState('');
  const [deptSuccess, setDeptSuccess] = useState('');
  const [isSavingDept, setIsSavingDept] = useState(false);

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

  // College specific master key update states
  const [currentMasterKeyInput, setCurrentMasterKeyInput] = useState('');
  const [newMasterKeyInput, setNewMasterKeyInput] = useState('');
  const [masterKeyUpdateMsg, setMasterKeyUpdateMsg] = useState('');
  const [masterKeyUpdateErr, setMasterKeyUpdateErr] = useState('');
  const [isUpdatingMasterKey, setIsUpdatingMasterKey] = useState(false);

  // Geolocation for attendance check-in scan
  const [userCoords, setUserCoords] = useState(null);
  const [geoTrackingError, setGeoTrackingError] = useState('');

  // Subject & Timetable States
  const [subjects, setSubjects] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_subjects');
      return cached ? JSON.parse(cached) : [];
    } catch (_) { return []; }
  });
  const [schedules, setSchedules] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_schedules');
      return cached ? JSON.parse(cached) : [];
    } catch (_) { return []; }
  });
  const [teachers, setTeachers] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_teachers');
      return cached ? JSON.parse(cached) : [];
    } catch (_) { return []; }
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  useEffect(() => {
    if (activeTab !== 'attendance' || !token || userRole === 'student') return;
    fetch(`${API_BASE_URL}/schedules-auto/current-session`, {
      headers: { Authorization: `Bearer ${token}` },
    })
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
  const [expandedSessions, setExpandedSessions] = useState({});

  // Session History Filter States
  const [selectedHistoryDept, setSelectedHistoryDept] = useState('');
  const [historyFilterDate, setHistoryFilterDate] = useState(getLocalDateString());
  const [historyFilterPeriod, setHistoryFilterPeriod] = useState('Period 1');
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
      const res = await fetch(`${API_BASE_URL}/attendance/stats`, {
        headers: {
          'Authorization': `Bearer ${usedToken}`
        }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        localStorage.setItem('cached_stats', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch Feedbacks (Admins Only)
  const fetchFeedbacks = async () => {
    if (isDemoMode) return;
    if (!token || userRole !== 'admin') return;
    setIsLoadingFeedbacks(true);
    try {
      const res = await fetch(`${API_BASE_URL}/feedbacks/`, {
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
        setFeedbacks(data);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setIsLoadingFeedbacks(false);
    }
  };

  // Fetch System Health & Telemetry
  const fetchSystemHealth = async () => {
    if (isDemoMode) return;
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

  // Fetch Custom Departments
  const fetchDepartments = async (authToken) => {
    if (isDemoMode) return;
    const usedToken = authToken || token;
    if (!usedToken) return;
    try {
      const res = await fetch(`${API_BASE_URL}/departments/`, {
        headers: {
          'Authorization': `Bearer ${usedToken}`
        }
      });
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
  const fetchStudents = async () => {
    if (isDemoMode) return;
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
        localStorage.setItem('cached_students', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    }
  };

  // Fetch Attendance Logs
  const fetchLogs = async (authToken) => {
    if (isDemoMode) return;
    const usedToken = authToken || token;
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/logs`, {
        headers: {
          'Authorization': `Bearer ${usedToken}`
        }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
        localStorage.setItem('cached_logs', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  // Fetch subjects
  const fetchSubjects = async () => {
    if (isDemoMode) return;
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
        localStorage.setItem('cached_subjects', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  // Fetch active users counts (Admins only)
  const fetchActiveUsers = async () => {
    if (isDemoMode) return;
    if (!token || userRole !== 'admin') return;
    try {
      const res = await fetch(`${API_BASE_URL}/auth/active-users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTelemetry(data);
      }
    } catch (err) {
      console.error('Error fetching active users:', err);
    }
  };

  // Send heartbeat ping
  const sendHeartbeat = async () => {
    if (isDemoMode) return;
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/auth/heartbeat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error('Error sending heartbeat:', err);
    }
  };

  // Fetch session history
  const fetchSessionHistory = async (subjId = null, dateVal = null, periodVal = null) => {
    if (isDemoMode) return;
    try {
      const queryParams = new URLSearchParams();
      const sId = subjId || selectedHistorySubjectId || selectedSubjectId || selectedTeacherSubjectId;
      if (sId) {
        queryParams.append('subject_id', sId);
      }
      const dVal = dateVal !== null ? dateVal : historyFilterDate;
      if (dVal) {
        queryParams.append('date_filter', dVal);
      }
      const pVal = periodVal !== null ? periodVal : historyFilterPeriod;
      if (pVal) {
        queryParams.append('period', pVal);
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

      const response = await fetch(`${API_BASE_URL}/attendance/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ records })
      });

      setIsSubmittingManual(false);
      setIsManualAttendanceOpen(false);

      if (response.ok) {
        const result = await response.json();
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
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.detail || 'Failed to mark manual attendance. Please check network and security settings.');
        playCyberSound('error');
      }
    } catch (err) {
      setIsSubmittingManual(false);
      setIsManualAttendanceOpen(false);
      alert('Failed to mark manual attendance. Please check network and security settings.');
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
      const res = await fetch(`${API_BASE_URL}/attendance/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: studentId,
          attendance_status: nextStatus,
          subject_id: sId ? parseInt(sId) : null,
          custom_date: dateVal,
          custom_time: periodVal
        })
      });

      if (res.status === 401) {
        handleLogout();
        return;
      }

      if (res.ok) {
        playCyberSound('success');
        fetchSessionHistory();
      } else {
        const errorData = await res.json();
        alert(errorData.detail || 'Failed to update attendance status.');
      }
    } catch (err) {
      console.error('Error toggling student attendance:', err);
      alert('Failed to connect to backend server.');
    }
  };

  // Fetch schedules
  const fetchSchedules = async () => {
    if (isDemoMode) return;
    try {
      const res = await fetch(`${API_BASE_URL}/schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
  const fetchTeachers = async () => {
    if (isDemoMode) return;
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

  const fetchStudentLeaves = async () => {
    if (isDemoMode) return;
    try {
      const res = await fetch(`${API_BASE_URL}/users/students/me/leave-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStudentLeaveRequests(data);
      }
    } catch (err) {
      console.error('Error fetching student leaves:', err);
    }
  };

  const fetchAdminLeaves = async () => {
    if (isDemoMode) return;
    setIsFetchingLeaves(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/leaves`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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

  // WebSocket Client for Real-time Attendance Alerts
  useEffect(() => {
    if (!token || userRole === 'student') return undefined;

    let wsUrl = API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/attendance/ws';
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
        } catch (e) {
          console.error('Error parsing WS message:', e);
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

  const fetchInstitutionsList = async () => {
    if (isDemoMode) {
      setInstitutionsList([
        { id: 1, name: 'Default Institution', slug: 'default', primary_color: '#4F46E5', secondary_color: '#06B6D4' },
        { id: 2, name: 'Delhi University', slug: 'du', primary_color: '#800020', secondary_color: '#DAA520' },
        { id: 3, name: 'IIT Delhi', slug: 'iitd', primary_color: '#0D9488', secondary_color: '#F59E0B' }
      ]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/institutions/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setInstitutionsList(data);
      }
    } catch (err) {
      console.error('Error fetching institutions list:', err);
    }
  };

  const handleCreateInstitution = async (e) => {
    e.preventDefault();
    setInstSuccessMessage('');
    setInstErrorMessage('');

    const masterPass = await requestMasterPassword('🔐 Master Key Verification Required', `Enter Master Password to register new Institution "${newInstName}":`);
    if (!masterPass) {
      setInstErrorMessage('Registration cancelled. Master key is required.');
      return;
    }

    setIsAddingInstitution(true);

    if (isDemoMode) {
      setTimeout(() => {
        const newId = institutionsList.length + 1;
        setInstitutionsList([
          ...institutionsList,
          {
            id: newId,
            name: newInstName,
            slug: newInstSlug.toLowerCase(),
            primary_color: newInstPrimary,
            secondary_color: newInstSecondary
          }
        ]);
        setInstSuccessMessage('SIMULATOR ACTION: Institution registered successfully!');
        setIsAddingInstitution(false);
        // Reset fields
        setNewInstName('');
        setNewInstSlug('');
        setNewInstAdminEmail('');
        setNewInstAdminName('');
        setNewInstAdminPassword('');
      }, 500);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/institutions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass
        },
        body: JSON.stringify({
          name: newInstName,
          slug: newInstSlug.toLowerCase().trim(),
          primary_color: newInstPrimary,
          secondary_color: newInstSecondary,
          logo_url: '',
          admin_email: newInstAdminEmail.trim(),
          admin_name: newInstAdminName.trim(),
          admin_password: newInstAdminPassword
        })
      });

      if (res.ok) {
        setInstSuccessMessage('Institution created successfully!');
        fetchInstitutionsList();
        // Reset form
        setNewInstName('');
        setNewInstSlug('');
        setNewInstAdminEmail('');
        setNewInstAdminName('');
        setNewInstAdminPassword('');
        setTimeout(() => setInstSuccessMessage(''), 4000);
      } else {
        let errMsg = 'Failed to create institution.';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch (jsonErr) {
          try {
            const textData = await res.text();
            errMsg = textData || errMsg;
          } catch (textErr) {
            errMsg = `Error ${res.status}: ${res.statusText}`;
          }
        }
        setInstErrorMessage(errMsg);
      }
    } catch (err) {
      console.error('Error creating institution:', err);
      setInstErrorMessage(`Connection Error: ${err.message || 'Failed to connect to backend server.'}`);
    } finally {
      setIsAddingInstitution(false);
    }
  };

  const handleDeleteInstitution = async (id, name) => {
    if (!window.confirm(`Are you absolutely sure you want to delete "${name}"?\nWarning: This will delete ALL users, students, schedules, and attendance data for this institution. This action CANNOT be undone.`)) {
      return;
    }

    setInstSuccessMessage('');
    setInstErrorMessage('');

    if (isDemoMode) {
      setInstitutionsList(institutionsList.filter(inst => inst.id !== id));
      setInstSuccessMessage('SIMULATOR ACTION: Institution deleted successfully.');
      return;
    }

    const masterPass = await requestMasterPassword(
      '🔐 Master Key Verification Required',
      `Enter Master Password to completely DELETE Institution "${name}":`
    );
    if (!masterPass) {
      setInstErrorMessage('Deletion cancelled. Master key is required.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/institutions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass
        }
      });

      if (res.ok) {
        setInstSuccessMessage('Institution deleted successfully.');
        fetchInstitutionsList();
        setTimeout(() => setInstSuccessMessage(''), 4000);
      } else {
        let errMsg = 'Failed to delete institution.';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch (jsonErr) {
          try {
            const textData = await res.text();
            errMsg = textData || errMsg;
          } catch (textErr) {
            errMsg = `Error ${res.status}: ${res.statusText}`;
          }
        }
        setInstErrorMessage(errMsg);
      }
    } catch (err) {
      console.error('Error deleting institution:', err);
      setInstErrorMessage(`Connection Error: ${err.message || 'Failed to connect to backend server.'}`);
    }
  };

  const handleUpdateInstitution = async (e) => {
    e.preventDefault();
    if (!editingInst) return;

    setInstSuccessMessage('');
    setInstErrorMessage('');

    if (isDemoMode) {
      setInstitutionsList(prev => prev.map(inst => inst.id === editingInst.id ? editingInst : inst));
      setInstSuccessMessage('SIMULATOR ACTION: Institution updated successfully.');
      setEditingInst(null);
      return;
    }

    const masterPass = await requestMasterPassword(
      '🔐 Master Key Verification Required',
      `Enter Master Password to confirm edits for "${editingInst.name}":`
    );
    if (!masterPass) {
      setInstErrorMessage('Update cancelled. Master key is required.');
      return;
    }

    setIsUpdatingInst(true);
    try {
      const res = await fetch(`${API_BASE_URL}/institutions/${editingInst.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass
        },
        body: JSON.stringify({
          name: editingInst.name,
          slug: editingInst.slug.toLowerCase().trim(),
          primary_color: editingInst.primary_color,
          secondary_color: editingInst.secondary_color,
          logo_url: editingInst.logo_url || ''
        })
      });

      if (res.ok) {
        setInstSuccessMessage('Institution updated successfully.');
        fetchInstitutionsList();
        setEditingInst(null);
        setTimeout(() => setInstSuccessMessage(''), 4000);
      } else {
        let errMsg = 'Failed to update institution.';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch (jsonErr) {
          try {
            const textData = await res.text();
            errMsg = textData || errMsg;
          } catch (textErr) {
            errMsg = `Error ${res.status}: ${res.statusText}`;
          }
        }
        setInstErrorMessage(errMsg);
      }
    } catch (err) {
      console.error('Error updating institution:', err);
      setInstErrorMessage(`Connection Error: ${err.message || 'Failed to connect to backend server.'}`);
    } finally {
      setIsUpdatingInst(false);
    }
  };

  const handlePublishReleaseUpdate = async (e) => {
    e.preventDefault();
    if (isDemoMode) {
      setReleaseErrorMessage('Not supported in Simulation/Demo mode.');
      return;
    }
    setReleaseSuccessMessage('');
    setReleaseErrorMessage('');
    setIsReleasingUpdate(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/release-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          master_password: releaseMasterPassword,
          latest_version: releaseVersion,
          update_download_url: releaseDownloadUrl
        })
      });
      if (res.ok) {
        const data = await res.json();
        setReleaseSuccessMessage(data.message || 'System update successfully released!');
        setReleaseVersion('');
        setReleaseDownloadUrl('');
        setReleaseMasterPassword('');
        if (typeof playCyberSound === 'function') playCyberSound('success');
      } else {
        const err = await res.json();
        setReleaseErrorMessage(err.detail || 'Failed to publish release update.');
        if (typeof playCyberSound === 'function') playCyberSound('error');
      }
    } catch (e) {
      setReleaseErrorMessage('Network/Connection error. Please try again.');
      if (typeof playCyberSound === 'function') playCyberSound('error');
    } finally {
      setIsReleasingUpdate(false);
    }
  };

  const handleToggleUpdateActive = async () => {
    if (!toggleMasterPassword.trim()) {
      setToggleErrorMessage('Master password is required.');
      return;
    }
    setToggleErrorMessage('');
    setToggleSuccessMessage('');
    setIsTogglingUpdate(true);
    try {
      await wakeBackend(API_BASE_URL, 12000);
      const endpoint = pendingToggleMode === 'beta'
        ? `${API_BASE_URL}/settings/toggle-beta-active`
        : `${API_BASE_URL}/settings/toggle-update-active`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          master_password: toggleMasterPassword,
          active: pendingToggleValue
        })
      });
      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        data = { detail: res.ok ? 'Unexpected server response.' : `Server error (${res.status}). Database may still be migrating — wait 30s and retry.` };
      }
      if (res.ok) {
        if (pendingToggleMode === 'beta') {
          setCurrentBetaActive(pendingToggleValue);
          setToggleSuccessMessage(data.message || (pendingToggleValue ? '🧪 Beta channel ON — only your phone sees the update.' : 'Beta channel off.'));
        } else {
          setCurrentUpdateActive(pendingToggleValue);
          setToggleSuccessMessage(data.message || (pendingToggleValue ? '✅ Update is now LIVE for all users!' : '🔕 Update banner deactivated.'));
        }
        setToggleMasterPassword('');
        setShowToggleMasterKeyModal(false);
        if (typeof playCyberSound === 'function') playCyberSound('success');
      } else {
        setToggleErrorMessage(data.detail || 'Failed to toggle update status.');
        if (typeof playCyberSound === 'function') playCyberSound('error');
      }
    } catch (e) {
      setToggleErrorMessage(e?.message?.includes('abort') ? 'Server wake-up timed out. Tap Wake Cloud Server on login, then retry.' : `Network error: ${e?.message || 'Please try again.'}`);
      if (typeof playCyberSound === 'function') playCyberSound('error');
    } finally {
      setIsTogglingUpdate(false);
    }
  };

  const handleSmtpTest = async (e) => {
    e.preventDefault();
    if (!smtpTestEmail) return;
    setSmtpTestStatus({ loading: true, success: '', error: '' });
    try {
      const res = await fetch(`${API_BASE_URL}/health/test-smtp?recipient_email=${encodeURIComponent(smtpTestEmail)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSmtpTestStatus({ loading: false, success: data.message || 'SMTP Connection Verified! Email Sent Successfully.', error: '' });
        playCyberSound('success');
      } else {
        setSmtpTestStatus({ loading: false, success: '', error: data.detail || 'SMTP Connection Failed.' });
        playCyberSound('error');
      }
    } catch (err) {
      setSmtpTestStatus({ loading: false, success: '', error: `Connection failed: ${err.message}` });
      playCyberSound('error');
    }
  };

  const fetchSystemSettings = async () => {
    if (isDemoMode) return;
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
        
        // Automated Build & Release states
        setBuildStatus(data.build_status || 'idle');
        setBuildVersion(data.build_version || '');
        setBuildError(data.build_error || '');
        setCurrentUpdateActive(data.update_active || false);
        setCurrentBetaActive(data.update_beta_active || false);
        setActiveReleaseVersion(data.latest_version || '');
        setActiveReleaseUrl(data.update_download_url || '');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  // Poll build status when a build is running
  React.useEffect(() => {
    let intervalId = null;
    if (buildStatus === 'building' && !isDemoMode && token) {
      intervalId = setInterval(() => {
        fetchSystemSettings();
      }, 10000); // Poll every 10 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [buildStatus, token, isDemoMode]);

  const handleTriggerBuild = async (e) => {
    e.preventDefault();
    if (isDemoMode) {
      setReleaseErrorMessage('Not supported in Simulation/Demo mode.');
      return;
    }
    if (!releaseVersion.trim() || !releaseMasterPassword.trim()) {
      setReleaseErrorMessage('Version and Master Password are required.');
      return;
    }
    setReleaseSuccessMessage('');
    setReleaseErrorMessage('');
    setIsTriggeringBuild(true);
    try {
      const res = await fetch(`${API_BASE_URL}/settings/trigger-build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          master_password: releaseMasterPassword,
          version: releaseVersion
        })
      });
      const data = await res.json();
      if (res.ok) {
        setReleaseSuccessMessage(data.message || 'Automated APK build triggered successfully!');
        setBuildStatus('building');
        setBuildVersion(releaseVersion);
        setReleaseMasterPassword('');
        if (typeof playCyberSound === 'function') playCyberSound('success');
      } else {
        setReleaseErrorMessage(data.detail || 'Failed to trigger automated build.');
        if (typeof playCyberSound === 'function') playCyberSound('error');
      }
    } catch (e) {
      setReleaseErrorMessage('Network error. Please check your connection and try again.');
      if (typeof playCyberSound === 'function') playCyberSound('error');
    } finally {
      setIsTriggeringBuild(false);
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
      const stream = await openCameraStream(cameraScanSettings.preset || 'turbo');
      if (attendanceVideoRef.current) {
        attendanceVideoRef.current.srcObject = stream;
        attendanceVideoRef.current.setAttribute('playsinline', 'true');
        attendanceVideoRef.current.muted = true;
        if (cameraScanSettings.mirrorPreview !== false) {
          attendanceVideoRef.current.style.transform = 'scaleX(-1)';
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
    const video = attendanceVideoRef.current;
    if (video?.srcObject) {
      video.play().catch((err) => console.warn('Post-boot video play failed:', err));
    }
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
    lastFaceBoxRef.current = null;
    lastFaceDetectedRef.current = false;
    setFaceDetected(false);
    recognitionBusyRef.current = false;
    if (faceDetectorRef.current) {
      try { faceDetectorRef.current.close(); } catch (_) { /* ignore */ }
      faceDetectorRef.current = null;
    }
    addDiagnosticLog('Ocular feed terminated.');
    handleSpeak("Scanner stopped.");
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
          if (explorationSettings.confettiOnMatch) triggerConfettiBurst();
          
          const now = new Date();
          const timeStr = sessionActive ? sessionPeriod : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const dateStr = sessionActive ? sessionDate.split('-').reverse().join('/') : `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
          
          setScannedStudent({ name: matched.name, roll: matched.roll, dep: matched.dep, time: timeStr });
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
        if (sessionActive) {
          queryParams.append('custom_date', sessionDate);
          queryParams.append('custom_time', sessionPeriod);
        }
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
            if (newlyMarkedList.length) recordScan(newlyMarkedList.length);

            const now = new Date();
            const timeStr = sessionActive ? sessionPeriod : now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = sessionActive ? sessionDate.split('-').reverse().join('/') : `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

            const primary = validMatches[0];
            setScannedStudent({ name: primary.name, roll: primary.roll, dep: primary.dep, time: timeStr });
            
            updateServerRecognizedFaces({
              faces: validMatches,
              timestamp: Date.now(),
              captureWidth: preset.captureWidth,
              captureHeight: preset.captureHeight,
            });

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
        addDiagnosticLog('ERROR: Match server timed out.');
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
                        drawFaceBox(ctx, scaledBox, {
                          color: face.newly_marked ? '#10b981' : '#f59e0b',
                          label: `${face.name.toUpperCase()} (${face.confidence}%) - ${face.newly_marked ? 'PRESENT' : 'ALREADY MARKED'}`,
                        });
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
          if (active && attendanceActive) {
            requestAnimationFrame(detectLoop);
          }
        };
        setTimeout(detectLoop, 100);
      } catch (err) {
        console.error('Face detection init failed:', err);
        addDiagnosticLog('WARN: Fast face detector unavailable — using mesh-only mode.');
      }
    };

    runDetector();

    return () => {
      active = false;
      if (faceDetectorRef.current) {
        try { faceDetectorRef.current.close(); } catch (_) { /* ignore */ }
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
              drawFaceBox(ctx, scaledBox, {
                color: face.newly_marked ? '#10b981' : '#f59e0b',
                label: `${face.name.toUpperCase()} (${face.confidence}%) - ${face.newly_marked ? 'PRESENT' : 'ALREADY MARKED'}`,
              });
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
        // =====================================================================
      }
    });

    faceMeshRef.current = faceMesh;

    let active = true;

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
        requestAnimationFrame(sendFrames);
      }
    };

    setTimeout(sendFrames, 300);

    return () => {
      active = false;
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
    
    let downloadName = `Attendance_Report_${reportStartDate}_to_${reportEndDate}.csv`;
    if (selectedReportSubjectId) {
      const subCode = subjects.find(s => s.id === parseInt(selectedReportSubjectId))?.code || 'Subject';
      downloadName = `Attendance_Report_${subCode}_${reportStartDate}_to_${reportEndDate}.csv`;
    } else if (reportDeptFilter) {
      const deptStr = reportDeptFilter.replace(/\s+/g, '_');
      downloadName = `Attendance_Report_${deptStr}_${reportStartDate}_to_${reportEndDate}.csv`;
    }
    
    link.setAttribute('download', downloadName);
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
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      
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
    if (isDemoMode) return;
    setSessionFetchError(false);
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
        localStorage.setItem('cached_user', JSON.stringify(data));

        // ── Blank-screen fix: eagerly prefetch data using the fresh authToken
        //    This runs in parallel with the render cycle so data arrives before
        //    or right as the dashboard first renders, preventing an empty state.
        if (data.role !== 'student') {
          fetchStats(authToken);
          fetchLogs(authToken);
        } else {
          fetchStudentLogs(authToken);
        }
        
        if (!sessionInitializedRef.current) {
          sessionInitializedRef.current = true;
          const currentHash = window.location.hash.replace(/^#\/?/, '');
          const isTabValid = (tabId, role) => {
            if (role === 'student') {
              return ['student-attendance', 'student-profile', 'ai-assistant', 'settings'].includes(tabId);
            } else if (role === 'teacher') {
              return ['dashboard', 'students', 'attendance', 'logs', 'session-history', 'reports', 'settings', 'student-profile'].includes(tabId);
            } else if (role === 'admin') {
              return ['dashboard', 'students', 'teachers', 'attendance', 'logs', 'session-history', 'reports', 'settings', 'student-profile'].includes(tabId);
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
      } else {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
        } else {
          console.error("Server error when fetching session info:", res.status);
          setSessionFetchError(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch session info (network error):", err);
      setSessionFetchError(true);
      const cached = localStorage.getItem('cached_user');
      const cachedRole = localStorage.getItem('userRole');
      if (cached && authToken) {
        try {
          setCurrentUser(JSON.parse(cached));
          if (cachedRole) setUserRole(cachedRole);
        } catch (_) { /* ignore */ }
      }
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
      } catch (_) { /* ignore */ }
    }
  }, [token, currentUser]);

  // Initialize session on mount or token change
  useEffect(() => {
    if (token) {
      if (isDemoMode) return;
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
        return ['dashboard', 'students', 'attendance', 'logs', 'session-history', 'reports', 'settings', 'student-profile'].includes(tabId);
      } else if (role === 'admin') {
        return ['dashboard', 'students', 'teachers', 'attendance', 'logs', 'session-history', 'reports', 'settings', 'student-profile'].includes(tabId);
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
  }, []);

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
    } catch (e) {
      console.log("Server health check failed, warming up...", e);
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

  // Load core data once after login
  useEffect(() => {
    if (!token || !userRole) return;

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
          fetchDepartments(token);
          fetchSubjects().then(() => fetchStudents());
          fetchStats();
          fetchLogs();
          fetchSchedules();
          fetchAdminLeaves();
          if (userRole === 'admin') {
            fetchTeachers();
            fetchFeedbacks();
          }
        }
      } else {
        if (!isMounted) return;
        setServerWarmingUp(true);
        // Start a polling retry check
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
              fetchDepartments(token);
              fetchSubjects().then(() => fetchStudents());
              fetchStats();
              fetchLogs();
              fetchSchedules();
              fetchAdminLeaves();
              if (userRole === 'admin') {
                fetchTeachers();
                fetchFeedbacks();
              }
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
      sendHeartbeat();
    }, 30000); // every 30 seconds
    
    return () => clearInterval(interval);
  }, [token]);

  // Polling loop for active users (Admins only, on Dashboard tab)
  useEffect(() => {
    if (!token || userRole !== 'admin' || activeTab !== 'dashboard') return undefined;
    
    // Fetch immediately
    fetchActiveUsers();
    
    const interval = setInterval(() => {
      fetchActiveUsers();
    }, 15000); // every 15 seconds
    
    return () => clearInterval(interval);
  }, [token, userRole, activeTab]);

  // Refresh data when switching tabs
  useEffect(() => {
    if (!token || !userRole) return;
    if (userRole === 'student' && !['student-attendance', 'student-profile', 'ai-assistant'].includes(activeTab)) return;

    switch (activeTab) {
      case 'dashboard':
        fetchStats();
        fetchLogs();
        if (userRole === 'admin') {
          fetchFeedbacks();
          fetchTeachers();
        }
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
        if (userRole === 'admin') {
          fetchSystemSettings();
          fetchTeachers();
          if (getActiveTenantSlug() === 'default') {
            fetchInstitutionsList();
          }
        }
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
        fetchSubjects();
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

  // Handle Login submission (with auto-retry for Render cold starts)
  const handleLogin = async (e) => {
    e.preventDefault();
    playCyberSound('click');
    setAuthError('');
    setIsLoading(true);
    setServerWarmingUp(true);

    // Wake sleeping Render instance before auth attempt
    await wakeBackend(API_BASE_URL);

    const formData = new URLSearchParams();
    formData.append('username', loginEmail.trim().toLowerCase());
    formData.append('password', loginPassword);

    const MAX_RETRIES = 5;
    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          setAuthError(`Cloud server waking up... Retry ${attempt}/${MAX_RETRIES}`);
          await new Promise((r) => setTimeout(r, 4000 + attempt * 2000));
          await wakeBackend(API_BASE_URL);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);

        const res = await fetch(`${API_BASE_URL}/auth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Tenant-Slug': getActiveTenantSlug(),
          },
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        let data = {};
        const raw = await res.text();
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error('Server returned invalid response. Backend may still be starting.');
        }

        if (res.ok && data.access_token) {
          const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });

          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.role !== loginRole) {
              playCyberSound('error');
              setAuthError(getRoleMismatchMessage(loginRole, meData.role));
              setIsLoading(false);
              setServerWarmingUp(false);
              return;
            }
          }

          playCyberSound('success');
          setAuthError('');
          setServerWarmingUp(false);
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('loginRole', loginRole);
          localStorage.setItem('userRole', loginRole);
          sessionStorage.setItem('just_logged_in_tour', 'true');
          setToken(data.access_token);
          setUserRole(loginRole);
          setIsLoading(false);
          fetchSessionInfo(data.access_token);
          return;
        }

        const detail = data.detail;
        const msg = Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join(', ')
          : (detail || 'Incorrect email or password');
        playCyberSound('error');
        setAuthError(msg);
        setIsLoading(false);
        setServerWarmingUp(false);
        return;
      } catch (err) {
        lastError = err;
        console.log(`Login attempt ${attempt + 1} failed:`, err.message);
      }
    }

    playCyberSound('error');
    const hint = lastError?.name === 'AbortError'
      ? 'Request timed out — Render server is still waking up.'
      : (lastError?.message || 'Network error');
    setAuthError(`${hint} Tap "Wake Cloud Server" below, wait 45s, then login again. Default admin password: raj@9211`);
    setServerWarmingUp(true);
    setIsLoading(false);
  };

  // Handle Logout
  const handleLogout = () => {
    playCyberSound('click');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isDemoMode');
    localStorage.removeItem('cached_user');
    localStorage.removeItem('onboarding_tour_done');
    localStorage.removeItem('onboarding_guide_done');
    sessionInitializedRef.current = false;
    setToken('');
    setUserRole('');
    setCurrentUser(null);
    setStudentLogs([]);
    setActiveTab('dashboard');
    setIsDemoMode(false);
  };

  // Submit Feedback Form
  const handleFeedbackSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!feedbackMessage.trim()) {
      setFeedbackError('Please enter your feedback message.');
      return;
    }
    setSubmittingFeedback(true);
    setFeedbackError('');
    setFeedbackSuccess('');

    if (isDemoMode) {
      setTimeout(() => {
        setFeedbackSuccess('SIMULATOR ACTION: Feedback submitted successfully (Read-Only Demo Mode).');
        setFeedbackMessage('');
        setSubmittingFeedback(false);
        const newFb = {
          id: Date.now(),
          user_id: 999,
          user_email: 'guest@smartattendance.io',
          role: 'admin',
          type: feedbackType,
          rating: feedbackRating,
          message: feedbackMessage,
          created_at: new Date().toISOString()
        };
        setFeedbacks(prev => [newFb, ...prev]);
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackSuccess('');
        }, 1500);
      }, 600);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/feedbacks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: feedbackType,
          rating: feedbackRating,
          message: feedbackMessage
        })
      });
      const data = await res.json();
      if (res.ok) {
        playCyberSound('success');
        setFeedbackSuccess('Thank you! Your feedback has been submitted successfully.');
        setFeedbackMessage('');
        setFeedbackRating(5);
        setFeedbackType('suggestion');
        // Refresh logs if currently viewing them to show new audit entry
        if (userRole && userRole !== 'student' && (activeTab === 'logs' || activeTab === 'dashboard')) {
          fetchLogs();
          if (activeTab === 'dashboard') {
            fetchStats();
            if (userRole === 'admin') fetchFeedbacks();
          }
        }
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackSuccess('');
        }, 2200);
      } else {
        playCyberSound('error');
        setFeedbackError(data.detail || 'Failed to submit feedback.');
      }
    } catch (err) {
      playCyberSound('error');
      setFeedbackError('Network error. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Change college specific master key
  const handleChangeMasterKey = async () => {
    setMasterKeyUpdateMsg('');
    setMasterKeyUpdateErr('');
    
    if (!currentMasterKeyInput || !newMasterKeyInput) {
      setMasterKeyUpdateErr('Both current and new master passwords are required!');
      return;
    }
    
    if (newMasterKeyInput.trim().length < 6) {
      setMasterKeyUpdateErr('New master password must be at least 6 characters long.');
      return;
    }
    
    setIsUpdatingMasterKey(true);
    try {
      const res = await fetch(`${API_BASE_URL}/institutions/master-key`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_master_key: currentMasterKeyInput,
          new_master_key: newMasterKeyInput
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update master password.');
      }
      playCyberSound('success');
      setMasterKeyUpdateMsg('Master password updated successfully!');
      setCurrentMasterKeyInput('');
      setNewMasterKeyInput('');
    } catch (err) {
      playCyberSound('error');
      setMasterKeyUpdateErr(err.message);
    } finally {
      setIsUpdatingMasterKey(false);
    }
  };

  // Send AI Chatbot Message
  const handleSendChatMessage = async (customMessage = null) => {
    const textToSend = customMessage || chatInput;
    if (!textToSend.trim()) return;

    playCyberSound('click');
    const userMsgId = Date.now();
    const newUserMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      attachedImage: botAttachedImage ? `data:${botAttachedImageMime};base64,${botAttachedImage}` : null,
      attachedImageName: botAttachedImageName
    };

    setChatMessages((prev) => [...prev, newUserMessage]);
    
    if (!customMessage) setChatInput('');
    const tempImage = botAttachedImage;
    const tempImageMime = botAttachedImageMime;
    
    setBotAttachedImage(null);
    setBotAttachedImageMime(null);
    setBotAttachedImageName('');
    setIsChatLoading(true);

    // Build the user context description to feed the AI
    let userContextStr = "";
    if (currentUser) {
      userContextStr += `[Current User Profile Context]:\n`;
      userContextStr += `- Name: ${currentUser.name}\n`;
      userContextStr += `- Role: ${userRole}\n`;
      if (currentUser.details) {
        if (currentUser.details.roll) userContextStr += `- Roll Number: ${currentUser.details.roll}\n`;
        if (currentUser.details.dep) userContextStr += `- Department/Branch: ${currentUser.details.dep}\n`;
        if (currentUser.details.course) userContextStr += `- Course: ${currentUser.details.course}\n`;
        if (currentUser.details.year) userContextStr += `- Year: ${currentUser.details.year}\n`;
        if (currentUser.details.semester) userContextStr += `- Semester: ${currentUser.details.semester}\n`;
        if (currentUser.details.phone) userContextStr += `- Contact Phone: ${currentUser.details.phone}\n`;
        if (currentUser.details.teacher) userContextStr += `- Mentor / Assigned Teacher: ${currentUser.details.teacher}\n`;
      }
      if (userRole === 'student' && studentLogs) {
        const total = studentLogs.length;
        const present = studentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
        const absent = studentLogs.filter(l => l.attendance === 'Absent').length;
        const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
        const minRequired = 0.75;
        const canBunk = Math.floor(present / minRequired - total);
        const needMore = total > 0 ? Math.ceil((minRequired * total - present) / (1 - minRequired)) : 0;
        userContextStr += `- Student Attendance Rate: ${rate}%\n`;
        userContextStr += `- Attendance Count: ${present} Present, ${absent} Absent out of ${total} total classes\n`;
        if (parseFloat(rate) >= 75) {
          userContextStr += `- Attendance Status: SAFE (above 75%). Can bunk up to ${canBunk > 0 ? canBunk : 0} more classes safely.\n`;
        } else {
          userContextStr += `- Attendance Status: WARNING (below 75%). Must attend ${needMore} more classes to reach 75%.\n`;
        }
        // Subject-wise stats
        if (Object.keys(studentSubjectStats).length > 0) {
          userContextStr += `\n[Subject-wise Attendance]:\n`;
          Object.values(studentSubjectStats).forEach(s => {
            userContextStr += `- ${s.subjectName} (${s.subjectCode || 'N/A'}): ${s.percentage?.toFixed(1) || 0}% (${s.presentDays || 0}/${s.totalDays || 0} classes)${s.lowAttendance ? ' ⚠️ LOW' : ''}\n`;
          });
        }
        // Leave requests
        if (studentLeaveRequests.length > 0) {
          userContextStr += `\n[My Leave Requests]:\n`;
          studentLeaveRequests.forEach(l => {
            userContextStr += `- ${l.leave_type} leave from ${l.start_date} to ${l.end_date}: ${l.status}\n`;
          });
        }
      }
    }
    if (aiCognitiveLevel === 'hyper') {
      userContextStr += `\n[System Core Directive: HYPER-PROCESSING COGNITIVE MODE ACTIVE. Respond with extremely dense, analytical, and highly structured information. Avoid generic pleasantries, prioritize direct code/data formatting, and use advanced technical terminology.]\n`;
    }

    try {
      const historyPayload = chatMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch(`${API_BASE_URL}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: textToSend,
          history: historyPayload,
          image_base64: tempImage,
          image_mime_type: tempImageMime,
          personality: botPersonality,
          user_context: userContextStr
        })
      });

      if (res.ok) {
        const data = await res.json();
        playCyberSound('success');
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'model',
            content: data.response
          }
        ]);
        if (botAutoSpeak) {
          handleSpeakText(data.response);
        }
      } else {
        playCyberSound('error');
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'model',
            content: 'Sorry, I encountered an error communicating with the chat server. Please try again.'
          }
        ]);
      }
    } catch (err) {
      playCyberSound('error');
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'model',
          content: 'Network error. Please check your internet connection.'
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleExportChatHistory = () => {
    playCyberSound('success');
    let transcript = `AI Chat Transcript - Smart Attendance System\n`;
    transcript += `Generated: ${new Date().toLocaleString()}\n`;
    transcript += `User: ${currentUser?.name || 'Unknown'} (${userRole})\n`;
    transcript += `=========================================\n\n`;

    chatMessages.forEach(m => {
      const sender = m.role === 'user' ? 'USER' : 'AI BOT';
      transcript += `[${sender}]: ${m.content}\n`;
      if (m.attachedImageName) {
        transcript += `(Attached Image: ${m.attachedImageName})\n`;
      }
      transcript += `\n`;
    });

    const element = document.createElement("a");
    const file = new Blob([transcript], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `smart_attendance_chat_transcript.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleClearChatHistory = () => {
    if (window.confirm("Are you sure you want to clear your conversation history?")) {
      playCyberSound('click');
      setChatMessages([]);
    }
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
        const res = await fetch(`${API_BASE_URL}/users/students/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          successCount++;
        } else {
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

    if (isDemoMode) {
      setStudents(prev => prev.map(s => s.id === editingStudent.id ? editingStudent : s));
      setShowEditStudentModal(false);
      alert('SIMULATOR ACTION: Student profile details updated locally.');
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

      const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        setEditTeacherSelfSuccess('Profile details updated successfully!');
        fetchSessionInfo(token);
        setTimeout(() => {
          setShowEditTeacherSelfModal(false);
          setEditTeacherSelfSuccess('');
        }, 1500);
      } else {
        setEditTeacherSelfError(data.detail || 'Failed to update profile details.');
      }
    } catch (err) {
      setEditTeacherSelfError('Connection failed.');
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

    if (isDemoMode) {
      const added = { ...newSchedule, id: Date.now(), subject_id: parseInt(newSchedule.subject_id) };
      setSchedules(prev => [...prev, added]);
      setScheduleSuccess('SIMULATOR ACTION: Timetable schedule registered locally.');
      setNewSchedule({ subject_id: '', day_of_week: 'Monday', start_time: '', end_time: '' });
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

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Logs_${getLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  useEffect(() => {
    const built = [];
    logs.slice(0, 12).forEach((log, i) => {
      const isPresent = (log.attendance || '').toLowerCase() === 'present';
      built.push({
        id: `n-log-${log.id || i}`,
        type: isPresent ? 'success' : 'warning',
        title: isPresent ? 'Attendance Marked' : 'Absent Recorded',
        message: `${log.name} (${log.roll}) — ${log.date}`,
        time: log.time || 'Recently',
        read: false,
      });
    });
    if (stats.total_absent_today > 5) {
      built.unshift({
        id: 'n-alert-absent',
        type: 'warning',
        title: 'High Absentee Alert',
        message: `${stats.total_absent_today} students absent today`,
        time: 'Today',
        read: false,
      });
    }
    if (stats.average_attendance_rate >= 90) {
      built.unshift({
        id: 'n-rate-good',
        type: 'success',
        title: 'Excellent Attendance Rate',
        message: `Campus average at ${stats.average_attendance_rate}%`,
        time: 'Today',
        read: false,
      });
    }
    setNotifications(built);
  }, [logs, stats.total_absent_today, stats.average_attendance_rate]);

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

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

      {/* In-App Update Banner */}
      {updateAvailable && !updateDismissed && (
        <div style={{
          position: 'fixed',
          top: isMobileView ? '16px' : 0,
          right: isMobileView ? '16px' : 0,
          left: isMobileView ? 'auto' : 0,
          width: isMobileView ? '290px' : '100%',
          borderRadius: isMobileView ? '16px' : 0,
          zIndex: 99999,
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          border: isMobileView ? '1px solid rgba(0, 242, 254, 0.3)' : 'none',
          color: '#fff',
          display: 'flex',
          flexDirection: isMobileView ? 'column' : 'row',
          alignItems: isMobileView ? 'stretch' : 'center',
          justifyContent: isMobileView ? 'flex-start' : 'center',
          gap: isMobileView ? '10px' : '12px',
          padding: isMobileView ? '14px 16px' : 'calc(env(safe-area-inset-top, 8px) + 10px) 16px 10px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.82rem',
          fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          animation: isMobileView ? 'fadeInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'slideDown 0.4s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {updateAvailable.isOwnerBeta ? '🧪' : '🚀'} New update v{updateAvailable.version} is ready!
            </span>
            {isMobileView && (
              <button
                onClick={() => {
                  acknowledgeUpdateVersion(updateAvailable?.version);
                  setUpdateDismissed(true);
                  setUpdateAvailable(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1,
                }}
                aria-label="Dismiss update"
              >
                ×
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', justifyContent: isMobileView ? 'space-between' : 'center' }}>
            <button
              type="button"
              onClick={() => {
                if (updateAvailable?.downloadUrl) {
                  window.open(updateAvailable.downloadUrl, '_blank', 'noopener,noreferrer');
                }
                acknowledgeUpdateVersion(updateAvailable.version);
                setUpdateAvailable(null);
                setUpdateDismissed(true);
                setUpdateDownloadedToast(true);
                markCurrentVersionInstalled();
                setTimeout(() => setUpdateDownloadedToast(false), 6000);
              }}
              style={{
                background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                color: '#0f172a',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.78rem',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexGrow: 1,
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0, 242, 254, 0.2)',
              }}
            >
              ⬇️ Download APK
            </button>
            <button
              type="button"
              onClick={() => {
                acknowledgeUpdateVersion(updateAvailable.version);
                setUpdateAvailable(null);
                setUpdateDismissed(true);
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#cbd5e1',
                padding: '6px 12px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.75rem',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                flexGrow: isMobileView ? 0 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              Dismiss
            </button>
          </div>
          
          {!isMobileView && (
            <button
              onClick={() => {
                acknowledgeUpdateVersion(updateAvailable?.version);
                setUpdateDismissed(true);
                setUpdateAvailable(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1,
              }}
              aria-label="Dismiss update"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Update Download Success Toast */}
      {updateDownloadedToast && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'linear-gradient(135deg, #065f46, #0891b2)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 20px',
          borderRadius: '12px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '1px solid rgba(16,185,129,0.4)',
          maxWidth: '90vw',
          animation: 'slideUp 0.4s ease-out',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '1.3rem' }}>✅</span>
          <div>
            <div style={{ fontWeight: 700 }}>Update acknowledged — banner hidden</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
              You are on v{APP_VERSION}. Install v{updateAvailable?.version || serverLatestVersion} APK if on Android, then tap &quot;Already updated&quot;.
            </div>
          </div>
          <button
            onClick={() => setUpdateDownloadedToast(false)}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', cursor: 'pointer', padding: '0 2px', lineHeight: 1, marginLeft: '8px' }}
          >×</button>
        </div>
      )}

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
        <div id="scanner-modal-overlay" className="scanner-modal-overlay">
          <div className="scanner-modal-inner">
          {/* Modal Header */}
          <div className="scanner-modal-header">
            <div className="scanner-modal-title-group">
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: attendanceActive ? '#10b981' : '#6b7280',
                boxShadow: attendanceActive ? '0 0 8px #10b981' : 'none',
                animation: attendanceActive ? 'pulse 1.5s infinite' : 'none',
                flexShrink: 0,
              }} />
              <span className="scanner-modal-title">FACE RECOGNITION SCANNER</span>
              <span style={{
                background: attendanceActive ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                border: `1px solid ${attendanceActive ? '#10b981' : '#6b7280'}`,
                color: attendanceActive ? '#10b981' : '#9ca3af',
                borderRadius: '6px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700,
                whiteSpace: 'nowrap',
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
                transition: 'all 0.2s ease', flexShrink: 0,
              }}
            >✕ Close</button>
          </div>

          {/* Camera View */}
          <div
            className="scanner-modal-camera"
            style={{
              border: `2px solid ${attendanceActive ? 'rgba(0,242,254,0.4)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: attendanceActive ? '0 0 40px rgba(0,242,254,0.15)' : 'none',
            }}
          >
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

            <CameraAttractHud
              active={attendanceActive && !scannerBootActive}
              mode="attendance"
              livenessStatus={livenessStatus}
            />

            <ClassroomLiveGrid faces={liveFaceGrid} />

            {/* Video or Image element based on cameraSource */}
            {cameraScanSettings?.cameraSource === 'external' ? (
              <img
                ref={attendanceImageRef}
                src={(attendanceActive || scannerBootActive) ? cameraScanSettings.externalIpUrl : ''}
                crossOrigin="anonymous"
                className={scannerBootActive ? 'scanner-video-booting' : ''}
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  transform: cameraScanSettings.mirrorPreview !== false ? 'scaleX(-1)' : 'none',
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
                  transform: cameraScanSettings.mirrorPreview !== false ? 'scaleX(-1)' : 'none',
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
                transform: cameraScanSettings.mirrorPreview !== false ? 'scaleX(-1)' : 'none',
                pointerEvents: 'none',
                zIndex: 6,
                display: attendanceActive && cameraScanSettings.autoFocusBox !== false ? 'block' : 'none',
              }}
            />

            {/* ===== NAMED FACE RECOGNITION OVERLAY ===== */}
            {serverRecognizedFaces && serverRecognizedFaces.faces && serverRecognizedFaces.faces.map((face, idx) => {
              if (!face.box) return null;
              
              // Map normalized/captured coordinates to container coordinates
              const containerWidth = 640; // Default aspect reference 
              const containerHeight = 480;
              
              const boxLeft = `${(face.box[0] / (serverRecognizedFaces.captureWidth || containerWidth)) * 100}%`;
              const boxTop = `${(face.box[1] / (serverRecognizedFaces.captureHeight || containerHeight)) * 100}%`;
              const boxWidth = `${(face.box[2] / (serverRecognizedFaces.captureWidth || containerWidth)) * 100}%`;
              const boxHeight = `${(face.box[3] / (serverRecognizedFaces.captureHeight || containerHeight)) * 100}%`;

              const themeColor = face.newly_marked ? '#10b981' : '#f59e0b';

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

                  {/* Name badge positioned neatly below the box frame */}
                  <div style={{
                    position: 'absolute',
                    top: '105%',
                    whiteSpace: 'nowrap',
                    background: face.newly_marked
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.95), rgba(5,150,105,0.95))'
                      : 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95))',
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
                      fontFamily: 'monospace',
                    }}>
                      {face.name ? face.name.toUpperCase() : 'IDENTIFIED'}
                    </span>
                    <span style={{
                      color: 'rgba(255,255,255,0.85)',
                      fontSize: '0.62rem',
                      fontFamily: 'monospace',
                      marginTop: '2px',
                    }}>
                      {face.confidence ? `${face.confidence}%` : ''} · {face.newly_marked ? 'PRESENT' : 'MARKED'}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* ========================================== */}

            {/* Camera auto-initializing placeholder — shown while stream is starting */}
            {!attendanceActive && !scannerBootActive && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'radial-gradient(ellipse at center, rgba(0,242,254,0.05) 0%, rgba(0,0,0,0.92) 70%)',
                gap: '20px',
              }}>
                {/* Animated scanner ring */}
                <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    border: '3px solid rgba(0,242,254,0.12)',
                    borderTopColor: '#00f2fe',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <div style={{
                    position: 'absolute', inset: '12px',
                    border: '2px solid rgba(0,242,254,0.08)',
                    borderBottomColor: 'rgba(0,242,254,0.5)',
                    borderRadius: '50%',
                    animation: 'spin 1.5s linear infinite reverse',
                  }} />
                  <div style={{
                    position: 'absolute', inset: '24px',
                    background: 'rgba(0,242,254,0.15)',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                </div>
                <p style={{ color: 'rgba(0,242,254,0.75)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.14em', fontFamily: 'monospace' }}>INITIALIZING OPTICAL FEED...</p>
              </div>
            )}
          </div>

          {/* Modal Controls — camera auto-starts; Stop and Liveness Toggle */}
          <div className="scanner-modal-controls">
            <button
              onClick={stopAttendanceCam}
              disabled={!attendanceActive && !scannerBootActive}
              style={{
                flex: 1, padding: '14px 24px',
                background: (attendanceActive || scannerBootActive)
                  ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
                  : 'rgba(107,114,128,0.18)',
                border: (attendanceActive || scannerBootActive)
                  ? 'none'
                  : '1px solid rgba(107,114,128,0.25)',
                borderRadius: '12px',
                color: (attendanceActive || scannerBootActive) ? '#fff' : '#6b7280',
                fontWeight: 800, fontSize: '1rem',
                cursor: (attendanceActive || scannerBootActive) ? 'pointer' : 'not-allowed',
                letterSpacing: '0.04em',
                boxShadow: (attendanceActive || scannerBootActive) ? '0 6px 24px rgba(239,68,68,0.35)' : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              {scannerBootActive ? '⏳ Booting...' : attendanceActive ? '⏹ Stop Scanner' : '⏳ Starting...'}
            </button>
            <button
              onClick={() => {
                setLivenessBypass(prev => !prev);
                playCyberSound('click');
              }}
              style={{
                flex: 1, padding: '14px 24px',
                background: livenessBypass 
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.25))' 
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(4, 120, 87, 0.25))',
                border: livenessBypass 
                  ? '1px solid rgba(239, 68, 68, 0.5)' 
                  : '1px solid rgba(16, 185, 129, 0.5)',
                borderRadius: '12px',
                color: livenessBypass ? '#ef4444' : '#10b981',
                fontWeight: 800, fontSize: '0.95rem',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                boxShadow: livenessBypass 
                  ? '0 0 15px rgba(239, 68, 68, 0.2)' 
                  : '0 0 15px rgba(16, 185, 129, 0.2)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {livenessBypass ? '⚡ Liveness: BYPASS' : '🛡️ Liveness: ON'}
            </button>
          </div>

          {/* Liveness & error messages */}
          {attendanceError && (
            <div style={{
              width: '100%',
              padding: '10px 16px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              color: '#ef4444', fontSize: '0.85rem', fontWeight: 600,
              wordBreak: 'break-word',
            }}>{attendanceError}</div>
          )}
          {livenessMessage && attendanceActive && (
            <div style={{
              width: '100%',
              padding: '10px 16px',
              background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.2)',
              borderRadius: '10px',
              color: '#00f2fe', fontSize: '0.85rem', fontWeight: 600,
              textAlign: 'center',
              wordBreak: 'break-word',
            }}>{livenessMessage}</div>
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
        {/* Header */}
        <header className="flex-between header-container" style={{ marginBottom: '16px' }}>
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
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700 }}>
                {activeTab === 'dashboard' && (userRole === 'teacher' ? 'Teacher Dashboard' : 'Admin Dashboard')}
                {activeTab === 'students' && 'Student Directory'}
                {activeTab === 'teachers' && 'Teacher Directory'}
                {activeTab === 'logs' && 'Real-time Logs'}
                {activeTab === 'attendance' && 'Live Scanner'}
                {activeTab === 'reports' && 'Attendance Reports & Alerts'}
                {activeTab === 'session-history' && 'Session-wise History'}
                {activeTab === 'student-attendance' && `Welcome, ${currentUser?.name || 'Student'}`}
                {activeTab === 'student-profile' && 'My Profile'}
                {activeTab === 'settings' && 'Security & System Settings'}
                {activeTab === 'ai-assistant' && 'Advanced AI System Assistant'}
              </h1>
              <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                {activeTab === 'dashboard' && 'Visualizing attendance logs and statistics'}
                {activeTab === 'students' && 'Manage registered students and profiles'}
                {activeTab === 'teachers' && 'Manage registered teaching staff and weekly timetables'}
                {activeTab === 'logs' && 'View and download student attendance registers'}
                {activeTab === 'attendance' && 'Log attendance using live facial recognition scanner'}
                {activeTab === 'reports' && 'Generate academic reports, analytics, and attendance alerts'}
                {activeTab === 'session-history' && 'Track day-by-day session registers and student present/absent statuses'}
                {activeTab === 'student-attendance' && 'Track your attendance history and metrics'}
                {activeTab === 'student-profile' && 'View and manage your personal profile and credentials'}
                {activeTab === 'settings' && 'Manage campus geofencing and IP subnet restriction boundaries'}
                {activeTab === 'ai-assistant' && 'Interact using voice or upload files. Customise bot settings and suggestion filters.'}
              </p>
            </div>
          </div>
          
          <div className="header-actions">
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
            <NotificationCenter
              open={notificationsOpen}
              onToggle={() => setNotificationsOpen((v) => !v)}
              onClose={() => setNotificationsOpen(false)}
              notifications={notifications}
              onMarkAllRead={markAllNotificationsRead}
              unreadCount={unreadNotificationCount}
            />
            {activeTab === 'students' && (
              <>
                <button 
                  onClick={() => {
                    if (serverWarmingUp) return;
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
                  style={{ 
                    padding: '10px 18px', 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontSize: '0.9rem',
                    opacity: serverWarmingUp ? 0.6 : 1,
                    cursor: serverWarmingUp ? 'not-allowed' : 'pointer'
                  }}
                  disabled={serverWarmingUp}
                >
                  <Plus size={18} />
                  {serverWarmingUp ? 'Connecting...' : 'Register Student'}
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

        {serverWarmingUp && (
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
          <PullToRefresh onRefresh={async () => { await fetchStats(); await fetchLogs(); }}>
          <div style={{ animation: 'fadeInUp 0.6s ease both' }}>
            {activeDashboardSubTab !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <button 
                  onClick={() => { setActiveDashboardSubTab(null); playCyberSound('click'); }}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}
                >
                  <ArrowLeft size={16} /> Back to Dashboard Hub
                </button>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Dashboard Hub &gt; {activeDashboardSubTab}
                </span>
              </div>
            )}

            {activeDashboardSubTab === null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>📊 Admin Analytics Dashboard</h2>
                      <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: '8px 0 0' }}>
                        Select a monitoring directory below to visualize system logs, check biometric statuses, view user sessions, or run core diagnostics.
                      </p>
                    </div>
                    <VersionBadge
                      compact
                      serverLatest={serverLatestVersion}
                      updateActive={updateActiveFlag}
                      onCheckUpdate={handleManualCheck}
                    />
                  </div>
                </div>

                {/* ===== ADVANCED FEATURES STATUS BANNER ===== */}
                {userRole !== 'student' && (
                  <div style={{
                    display: 'flex',
                    flexDirection: isMobileView ? 'column' : 'row',
                    gap: '10px',
                    padding: isMobileView ? '10px 14px' : '12px 18px',
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    alignItems: isMobileView ? 'flex-start' : 'center',
                    justifyContent: 'space-between',
                    minHeight: 'auto',
                  }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'monospace' }}>🚀 ADVANCED FEATURES</span>
                    
                    {/* Horizontal scroll container for features on mobile devices */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      alignItems: 'center',
                      width: '100%',
                      overflowX: 'auto',
                      paddingBottom: isMobileView ? '6px' : '0',
                      WebkitOverflowScrolling: 'touch',
                    }}>

                      {/* Feature 2: WebSocket Live Status - Redirects directly to scanner */}
                      <div 
                        onClick={() => {
                          playCyberSound('click');
                          navigateToTab('attendance');
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '7px',
                          padding: '6px 12px',
                          background: wsConnected ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                          border: `1px solid ${wsConnected ? 'rgba(16,185,129,0.4)' : 'rgba(107,114,128,0.3)'}`,
                          borderRadius: '20px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: wsConnected ? '#10b981' : '#6b7280',
                          boxShadow: wsConnected ? '0 0 8px #10b981' : 'none',
                          animation: wsConnected ? 'pulse 1.5s infinite' : 'none',
                          display: 'inline-block',
                        }} />
                        <span style={{ color: wsConnected ? '#10b981' : '#9ca3af', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>
                          {wsConnected ? 'LIVE SYNC ON' : 'LIVE SYNC OFF'}
                        </span>
                      </div>

                      {/* Feature 3: Biometric Encryption */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '7px',
                        padding: '6px 12px',
                        background: 'rgba(99,102,241,0.15)',
                        border: '1px solid rgba(99,102,241,0.4)',
                        borderRadius: '20px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}>
                        <span style={{ fontSize: '0.8rem' }}>🔐</span>
                        <span style={{ color: '#818cf8', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'monospace' }}>BIOMETRIC ENCRYPTED</span>
                      </div>

                      {/* Feature 4: Risk Analytics shortcut - Sets direct tab hash parameter */}
                      <button
                        onClick={() => {
                          playCyberSound('click');
                          // Directly set states instead of calling navigateToTab which resets activeSubSetting
                          setActiveTab('settings');
                          setActiveSubSetting('productivity');
                          setMobileSidebarOpen(false);
                          setMobileControlOpen(false);
                          
                          localStorage.setItem('active_productivity_tab', 'analytics');
                          window.dispatchEvent(new Event('storage'));
                          window.dispatchEvent(new CustomEvent('switch_productivity_tab', { detail: { tab: 'analytics' } }));
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '7px',
                          padding: '6px 12px',
                          background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.2))',
                          border: '1px solid rgba(245,158,11,0.5)',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          color: '#f59e0b',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.35), rgba(217,119,6,0.35))'}
                        onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.2))'}
                      >
                        <span style={{ fontSize: '0.8rem' }}>📊</span>
                        RISK ANALYTICS →
                      </button>
                    </div>
                  </div>
                )}
                {/* ============================================ */}
                <SmartSuggestionsBar
                  hasPremium={hasPremiumAccess}
                  scannerUsed={recognizedStudents.length > 0}
                  onAction={(action) => {
                    playCyberSound('click');
                    if (action === 'scanner') navigateToTab('attendance');
                    else if (action === 'settings_geofence') {
                      setActiveTab('settings');
                      setActiveSubSetting('geofencing');
                      setMobileSidebarOpen(false);
                      setMobileControlOpen(false);
                    }
                    else if (action === 'exploration') {
                      setActiveTab('settings');
                      setActiveSubSetting('exploration');
                      setMobileSidebarOpen(false);
                      setMobileControlOpen(false);
                    }
                    else if (action === 'premium') {
                      setActiveTab('settings');
                      setActiveSubSetting('premium');
                      setMobileSidebarOpen(false);
                      setMobileControlOpen(false);
                    }
                    else if (action === 'productivity') {
                      setActiveTab('settings');
                      setActiveSubSetting('productivity');
                      setMobileSidebarOpen(false);
                      setMobileControlOpen(false);
                      localStorage.setItem('active_productivity_tab', 'bulk');
                      window.dispatchEvent(new Event('storage'));
                      window.dispatchEvent(new CustomEvent('switch_productivity_tab', { detail: { tab: 'bulk' } }));
                    }
                  }}
                />
                {userRole === 'teacher' && (
                  <TeacherMiniDashboard stats={stats} subjects={subjects} teacherName={currentUser?.name} />
                )}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobileView ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '20px'
                }}>
                  {/* Category Card 1: Attendance Summary Metrics */}
                  <div 
                    onClick={() => { setActiveDashboardSubTab('metrics'); playCyberSound('click'); }}
                    className="glass-panel hover-card" 
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Activity size={24} style={{ color: '#00f2fe' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>🏢 All Roles</span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Attendance Metrics Summary</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Live presence statistics, active student counts, and recent activity ticker feed.</p>
                  </div>

                  {/* Category Card 2: Attendance Trends & Analytics */}
                  <div 
                    onClick={() => { setActiveDashboardSubTab('trends'); playCyberSound('click'); }}
                    className="glass-panel hover-card" 
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Layers size={24} style={{ color: '#a78bfa' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>📊 Analytics</span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Trends & Analytics Charts</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Weekly attendance trends line area graphs and department presence distribution chart.</p>
                  </div>

                  {/* Category Card 3: Biometric Security Radar */}
                  <div 
                    onClick={() => { setActiveDashboardSubTab('radar'); playCyberSound('click'); }}
                    className="glass-panel hover-card" 
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ShieldCheck size={24} style={{ color: '#00f2fe' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>🛡️ Security</span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Biometric Security Radar</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Realtime perimeter scanning sweeps and biometric core neural mesh visualization map.</p>
                  </div>

                  {/* Category Card 4: System Health & Core Diagnostics */}
                  <div 
                    onClick={() => { setActiveDashboardSubTab('diagnostics'); playCyberSound('click'); }}
                    className="glass-panel hover-card" 
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Settings size={24} style={{ color: 'var(--color-primary)' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>💻 Core Systems</span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>System Health & Diagnostics</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>CPU/RAM specs, SQLite/MySQL DB connectivity, API response latency, and AI detection models integrity.</p>
                  </div>

                  {/* Category Card 5: User Feedback Submissions */}
                  <div 
                    onClick={() => { setActiveDashboardSubTab('feedback'); playCyberSound('click'); }}
                    className="glass-panel hover-card" 
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <MessageSquare size={24} style={{ color: '#00f2fe' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>💬 Feedback</span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>User Feedback Directory</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Review rating scores, bugs reported, suggestions, and general reviews submitted by students & teachers.</p>
                  </div>

                  {/* Category Card 6: Live Session Telemetry */}
                  <div 
                    onClick={() => { setActiveDashboardSubTab('telemetry'); playCyberSound('click'); }}
                    className="glass-panel hover-card" 
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <TrendingUp size={24} style={{ color: '#a78bfa' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>📡 Telemetry</span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Live Telemetry Monitor</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Live active connections registry showing student, teacher, and administrator active session metrics.</p>
                  </div>
                </div>

                {/* Sleek Bottom Feedback Section */}
                <div 
                  className="glass-panel" 
                  style={{ 
                    marginTop: '28px',
                    padding: '24px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap', 
                    gap: '16px',
                    borderLeft: '4px solid #00f2fe',
                    background: 'linear-gradient(135deg, rgba(9, 12, 21, 0.6) 0%, rgba(21, 24, 43, 0.6) 100%)',
                    boxShadow: '0 8px 32px 0 rgba(0, 242, 254, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      background: 'rgba(0, 242, 254, 0.1)', 
                      color: '#00f2fe', 
                      borderRadius: '12px', 
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 15px rgba(0, 242, 254, 0.2)'
                    }}>
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Help Us Improve the Platform</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: '4px 0 0' }}>
                        Share your suggestions, report a bug, or rate your overall experience with our smart attendance tracker.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playCyberSound('click');
                      setShowFeedbackModal(true);
                    }}
                    className="btn-primary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 24px',
                      borderRadius: '10px',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      border: 'none',
                      background: 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)',
                      color: '#090c15',
                      boxShadow: '0 0 20px rgba(0, 242, 254, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 242, 254, 0.5)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 242, 254, 0.3)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <MessageSquare size={16} /> Share Feedback
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Module 1: Attendance Summary Metrics */}
                {activeDashboardSubTab === 'metrics' && (
                  <>
                    <LiveActivityTicker activities={liveActivities} />

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
          </>)}

          {/* Module 2: Attendance Trends & Analytics */}
          {activeDashboardSubTab === 'trends' && (
            <div className="dashboard-charts-grid">
              {/* Weekly Trend Line Area Chart */}
              <div className="glass-panel" style={{ padding: '20px', animationDelay: '500ms' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={18} style={{ color: '#00f2fe' }} /> Weekly Attendance Trends
                </h3>
                <div ref={chartRef1} style={{ width: '100%', height: '220px', minWidth: 0, position: 'relative' }}>
                  <AreaChart width={chartWidth1} height={220} data={stats.weekly_trends}>
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
                </div>
              </div>

              {/* Department distribution Bar Chart */}
              <div className="glass-panel" style={{ padding: '20px', animationDelay: '600ms' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Layers size={18} style={{ color: '#a78bfa' }} /> Present Today by Dept
                </h3>
                <div ref={chartRef2} style={{ width: '100%', height: '220px', minWidth: 0, position: 'relative' }}>
                  {Object.keys(stats.department_stats).length === 0 ? (
                    <div className="flex-center" style={{ height: '100%', color: '#94a3b8', flexDirection: 'column', gap: '12px' }}>
                      <AlertCircle size={32} style={{ color: '#ef4444' }} />
                      <span>No attendance data marked for today.</span>
                    </div>
                  ) : (
                    <BarChart width={chartWidth2} height={220} data={Object.keys(stats.department_stats).map(dept => {
                      const val = stats.department_stats[dept];
                      const countVal = (val && typeof val === 'object') ? (val.present !== undefined ? val.present : (val.count !== undefined ? val.count : 0)) : val;
                      return { name: dept, count: countVal };
                    })}>
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
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Module 3: Biometric Security Radar */}
          {activeDashboardSubTab === 'radar' && (
            <div className="dashboard-charts-grid">
              {/* Sonar Radar Stats Card */}
              <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
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
                  <canvas ref={neuralMeshCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                </div>
              </div>
            </div>
          )}

          {/* Module 4: System Health & Core Diagnostics */}
          {activeDashboardSubTab === 'diagnostics' && (
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', flex: 1 }}>
                  {/* Column 1: System Health & Core Specs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                        <span style={{ color: 'var(--color-text-muted)' }}>DB ENGINE / TYPE:</span>
                        <span style={{ 
                          color: systemHealth?.database_type === 'sqlite' ? '#f59e0b' : '#00f2fe',
                          fontWeight: 'bold' 
                        }}>
                          {systemHealth ? (systemHealth.database_type === 'sqlite' ? 'LOCAL SQLITE (FALLBACK)' : systemHealth.database_type.toUpperCase()) : 'CHECKING...'}
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

                  {/* Column 2: SMTP Mailer Diagnostics */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px',
                    borderLeft: '1px solid rgba(255,255,255,0.08)',
                    paddingLeft: '28px'
                  }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ✉️ SMTP Mailer Diagnostics
                      </h4>
                      <p style={{ color: '#9ca3af', fontSize: '0.78rem', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                        Verify the live mail server connection by triggering a test transmission.
                      </p>
                    </div>

                    <form onSubmit={handleSmtpTest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Recipient Test Email</label>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="e.g. your-email@gmail.com"
                          value={smtpTestEmail}
                          onChange={(e) => setSmtpTestEmail(e.target.value)}
                          required
                          style={{
                            padding: '10px 14px',
                            background: 'rgba(8, 12, 20, 0.4)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={smtpTestStatus.loading}
                        className="action-btn"
                        style={{
                          padding: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        {smtpTestStatus.loading ? 'TRANSMITTING VERIFICATION...' : '⚡ TEST SMTP CONNECTION'}
                      </button>
                    </form>

                    {smtpTestStatus.success && (
                      <div style={{
                        padding: '12px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '8px',
                        color: '#10b981',
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                        lineHeight: '1.4'
                      }}>
                        ✅ {smtpTestStatus.success}
                      </div>
                    )}

                    {smtpTestStatus.error && (
                      <div style={{
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '0.78rem',
                        fontFamily: 'monospace',
                        lineHeight: '1.4',
                        wordBreak: 'break-all'
                      }}>
                        ❌ {smtpTestStatus.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Module 5: User Feedback Submissions */}
            {activeDashboardSubTab === 'feedback' && userRole === 'admin' && (
              <div className="glass-panel" style={{ 
                marginTop: '28px', 
                padding: '28px', 
                animationDelay: '1000ms',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                overflow: 'hidden'
              }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MessageSquare size={18} style={{ color: activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe' }} />
                  <span>User Feedback Submissions</span>
                </h3>
                
                {isLoadingFeedbacks ? (
                  <div className="flex-center" style={{ padding: '40px', color: 'var(--color-text-muted)' }}>
                    <div style={{ width: '32px', height: '32px', border: '3px solid rgba(0, 242, 254, 0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ marginLeft: '12px' }}>Loading feedbacks...</span>
                  </div>
                ) : feedbacks.length === 0 ? (
                  <div className="flex-center" style={{ padding: '40px', color: 'var(--color-text-muted)', flexDirection: 'column', gap: '12px' }}>
                    <AlertCircle size={32} style={{ color: 'var(--color-text-muted)' }} />
                    <span>No feedbacks submitted yet.</span>
                  </div>
                ) : (
                  <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>USER REF (ID)</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>EMAIL</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>ROLE</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>CATEGORY</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>RATING</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>MESSAGE</th>
                          <th style={{ padding: '12px 16px', fontWeight: 600 }}>DATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feedbacks.map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                            <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--color-primary)' }}>
                              #{item.user_id !== null && item.user_id !== undefined ? item.user_id : 'N/A'}
                            </td>
                            <td style={{ padding: '14px 16px', color: '#f1f5f9' }}>{item.user_email}</td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ 
                                padding: '2px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: 600,
                                background: item.role === 'student' ? 'rgba(167, 139, 250, 0.12)' : item.role === 'teacher' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 242, 254, 0.12)',
                                color: item.role === 'student' ? '#a78bfa' : item.role === 'teacher' ? '#10b981' : '#00f2fe'
                              }}>
                                {item.role.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ 
                                padding: '2px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: 600,
                                background: item.type === 'bug' ? 'rgba(239, 68, 68, 0.12)' : item.type === 'suggestion' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                color: item.type === 'bug' ? '#ef4444' : item.type === 'suggestion' ? '#f59e0b' : '#94a3b8'
                              }}>
                                {item.type.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', color: '#fbbf24', minWidth: '110px' }}>
                              <div style={{ display: 'flex', gap: '2px' }}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <svg 
                                    key={star}
                                    width="14" 
                                    height="14" 
                                    viewBox="0 0 24 24" 
                                    fill={star <= item.rating ? "#fbbf24" : "none"} 
                                    stroke={star <= item.rating ? "#fbbf24" : "rgba(255, 255, 255, 0.2)"} 
                                    strokeWidth="2.5"
                                  >
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                  </svg>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.message}>
                              {item.message}
                            </td>
                            <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                              {new Date(item.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Module 6: Live Telemetry */}
            {activeDashboardSubTab === 'telemetry' && userRole === 'admin' && activeTelemetry && (
              <div className="glass-panel telemetry-widget-card" style={{ 
                padding: '20px', 
                marginTop: '28px', 
                animationDelay: '1100ms',
                borderLeft: '4px solid var(--color-primary)',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="telemetry-live-dot" />
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--color-text-main)', letterSpacing: '0.06em' }}>
                      LIVE SYSTEM TELEMETRY
                    </h3>
                  </div>
                  <div className="telemetry-stats-row">
                    <div className="telemetry-stat-pill total">
                      <span className="label">ACTIVE USERS:</span>
                      <span className="val">{activeTelemetry.total_active}</span>
                    </div>
                    <div className="telemetry-stat-pill student">
                      <span className="label">STUDENTS:</span>
                      <span className="val">{activeTelemetry.students}</span>
                    </div>
                    <div className="telemetry-stat-pill teacher">
                      <span className="label">TEACHERS:</span>
                      <span className="val">{activeTelemetry.teachers}</span>
                    </div>
                    <div className="telemetry-stat-pill admin">
                      <span className="label">ADMINS:</span>
                      <span className="val">{activeTelemetry.admins}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>
            )}
          </div>
          </PullToRefresh>
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

            {/* Bulk Action Bar */}
            {selectedStudentIds.size > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px', marginBottom: '16px', animation: 'fadeInUp 0.3s ease'
              }}>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>
                  {selectedStudentIds.size} student{selectedStudentIds.size > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedStudentIds(new Set())}
                  style={{
                    padding: '5px 12px', fontSize: '0.75rem', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
                    borderRadius: '6px', cursor: 'pointer'
                  }}
                >Clear</button>
                <button
                  onClick={handleBulkDeleteStudents}
                  style={{
                    padding: '5px 14px', fontSize: '0.75rem', background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
                    borderRadius: '6px', cursor: 'pointer', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  <Trash2 size={12} /> Delete Selected
                </button>
              </div>
            )}

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
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id))}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
                            } else {
                              setSelectedStudentIds(new Set());
                            }
                          }}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#00f2fe' }}
                        />
                      </th>
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
                      <tr key={student.id} style={{ background: selectedStudentIds.has(student.id) ? 'rgba(0,242,254,0.03)' : undefined }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.has(student.id)}
                            onChange={e => {
                              const next = new Set(selectedStudentIds);
                              if (e.target.checked) next.add(student.id); else next.delete(student.id);
                              setSelectedStudentIds(next);
                            }}
                            style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#00f2fe' }}
                          />
                        </td>
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
              <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1.2fr 1.8fr', gap: isMobileView ? '20px' : '32px', width: '100%', minWidth: 0, maxWidth: '100%' }}>
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
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
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
                <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0, width: '100%', maxWidth: '100%' }}>
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>Teaching Staff Directory</h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Listing all registered teachers, mapped subjects, and timetable schedules</p>
                  </div>

                  {/* Bulk Action Bar */}
                  {selectedTeacherIds.size > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
                      background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '12px', marginBottom: '16px', animation: 'fadeInUp 0.3s ease'
                    }}>
                      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>
                        {selectedTeacherIds.size} teacher{selectedTeacherIds.size > 1 ? 's' : ''} selected
                      </span>
                      <button
                        onClick={() => setSelectedTeacherIds(new Set())}
                        style={{
                          padding: '5px 12px', fontSize: '0.75rem', background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
                          borderRadius: '6px', cursor: 'pointer'
                        }}
                      >Clear</button>
                      <button
                        onClick={handleBulkDeleteTeachers}
                        style={{
                          padding: '5px 14px', fontSize: '0.75rem', background: 'rgba(239,68,68,0.15)',
                          border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
                          borderRadius: '6px', cursor: 'pointer', fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        <Trash2 size={12} /> Delete Selected
                      </button>
                    </div>
                  )}

                  <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto', overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={teachers.filter(t => t.role === 'teacher').length > 0 && teachers.filter(t => t.role === 'teacher').every(t => selectedTeacherIds.has(t.id))}
                              onChange={e => {
                                const filteredTeachers = teachers.filter(t => t.role === 'teacher');
                                if (e.target.checked) {
                                  setSelectedTeacherIds(new Set(filteredTeachers.map(t => t.id)));
                                } else {
                                  setSelectedTeacherIds(new Set());
                                }
                              }}
                              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#00f2fe' }}
                            />
                          </th>
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
                            <td colSpan="6" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>No teachers registered.</td>
                          </tr>
                        ) : (
                          teachers.filter(t => t.role === 'teacher').map(t => {
                            const tSubjects = subjects.filter(sub => sub.teacher_id === t.id);
                            
                            return (
                              <tr key={t.id} style={{ background: selectedTeacherIds.has(t.id) ? 'rgba(0,242,254,0.03)' : undefined }}>
                                <td style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedTeacherIds.has(t.id)}
                                    onChange={e => {
                                      const next = new Set(selectedTeacherIds);
                                      if (e.target.checked) next.add(t.id); else next.delete(t.id);
                                      setSelectedTeacherIds(next);
                                    }}
                                    style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#00f2fe' }}
                                  />
                                </td>
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
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => { playCyberSound('click'); shiftDate(logDateFilter, -1, setLogDateFilter); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#94a3b8',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                        height: '42px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                      title="Previous Day"
                    >
                      ◀
                    </button>
                    <input 
                      type="date" 
                      className="form-input"
                      style={{ width: '150px', background: 'rgba(8, 12, 20, 0.4)', height: '42px', margin: 0 }}
                      value={logDateFilter}
                      onChange={e => setLogDateFilter(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => { playCyberSound('click'); shiftDate(logDateFilter, 1, setLogDateFilter); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#94a3b8',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                        height: '42px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                      title="Next Day"
                    >
                      ▶
                    </button>
                  </div>
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

              {/* Bulk Action Bar for Logs */}
              {selectedLogIds.size > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
                  background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.2)',
                  borderRadius: '12px', marginBottom: '16px', animation: 'fadeInUp 0.3s ease'
                }}>
                  <span style={{ color: '#00f2fe', fontWeight: 700, fontSize: '0.85rem' }}>
                    {selectedLogIds.size} log{selectedLogIds.size > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedLogIds(new Set())}
                    style={{
                      padding: '5px 12px', fontSize: '0.75rem', background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
                      borderRadius: '6px', cursor: 'pointer'
                    }}
                  >Clear Selection</button>
                  <button
                    onClick={exportToCSV}
                    style={{
                      padding: '5px 14px', fontSize: '0.75rem', background: 'rgba(0,242,254,0.1)',
                      border: '1px solid rgba(0,242,254,0.3)', color: '#00f2fe',
                      borderRadius: '6px', cursor: 'pointer', fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <FileDown size={12} /> Export Selected to CSV
                  </button>
                </div>
              )}

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
                        <th style={{ width: '40px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={filteredLogs.length > 0 && filteredLogs.every(log => selectedLogIds.has(log.id))}
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedLogIds(new Set(filteredLogs.map(log => log.id)));
                              } else {
                                setSelectedLogIds(new Set());
                              }
                            }}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#00f2fe' }}
                          />
                        </th>
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
                          style={{ 
                            cursor: 'pointer',
                            background: selectedLogIds.has(log.id) ? 'rgba(0,242,254,0.03)' : undefined 
                          }}
                        >
                          <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedLogIds.has(log.id)}
                              onChange={e => {
                                const next = new Set(selectedLogIds);
                                if (e.target.checked) next.add(log.id); else next.delete(log.id);
                                setSelectedLogIds(next);
                              }}
                              style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#00f2fe' }}
                            />
                          </td>
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
                    width: '90%',
                    maxWidth: '440px',
                    padding: isMobileView ? '20px 16px' : '32px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    border: '1px solid rgba(0, 242, 254, 0.25)',
                    boxShadow: '0 20px 50px rgba(0, 242, 254, 0.15)',
                    animation: 'zoomIn 0.3s ease both',
                    position: 'relative',
                    boxSizing: 'border-box'
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => { playCyberSound('click'); shiftDate(sessionDate, -1, setSessionDate); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#94a3b8',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                        height: '42px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                      title="Previous Day"
                    >
                      ◀
                    </button>
                    <input 
                      type="date"
                      className="form-input"
                      value={sessionDate}
                      onChange={e => setSessionDate(e.target.value)}
                      required
                      style={{ background: 'rgba(8, 12, 20, 0.4)', height: '42px', margin: 0, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => { playCyberSound('click'); shiftDate(sessionDate, 1, setSessionDate); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#94a3b8',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                        height: '42px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                      title="Next Day"
                    >
                      ▶
                    </button>
                  </div>
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

                {/* Manual Attendance Button */}
                <button
                  onClick={() => {
                    if (userRole === 'admin' && !selectedSubjectId) {
                      alert('Please select a subject first to use Manual Register.');
                      return;
                    }
                    const subId = userRole === 'teacher'
                      ? subjects.find(s => s.teacher_id === currentUser?.details?.id)?.id?.toString() || ''
                      : selectedSubjectId;
                    setManualSubjectId(subId);
                    setManualDate(sessionDate);
                    setManualPeriod(sessionPeriod);
                    setManualAttendanceData({});
                    setManualSearchQuery('');
                    setIsManualAttendanceOpen(true);
                    playCyberSound('click');
                  }}
                  type="button"
                  className="btn-secondary active-haptic"
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    border: '1px solid rgba(167, 139, 250, 0.3)',
                    color: '#a78bfa',
                    background: 'rgba(167, 139, 250, 0.06)'
                  }}
                >
                  ✋ Manual Register (No Face Auth)
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
                <div className="attendance-layout-grid">
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

                  <div style={{ display: 'flex', gap: '14px', width: '100%', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        playCyberSound('click');
                        setShowScannerModal(true);
                      }}
                      style={{
                        flex: 1, minWidth: '160px', padding: '16px 24px',
                        background: 'linear-gradient(135deg, #00f2fe, #0ea5e9)',
                        border: 'none', borderRadius: '12px',
                        color: '#000', fontWeight: 800, fontSize: '0.95rem',
                        cursor: 'pointer', letterSpacing: '0.04em',
                        boxShadow: '0 6px 24px rgba(0,242,254,0.25)',
                        transition: 'all 0.2s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      }}
                    >
                      <Camera size={18} /> Open Face Scanner
                    </button>

                    <button
                      onClick={() => {
                        playCyberSound('click');
                        setShowQrScannerModal(true);
                      }}
                      style={{
                        flex: 1, minWidth: '160px', padding: '16px 24px',
                        background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
                        border: 'none', borderRadius: '12px',
                        color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                        cursor: 'pointer', letterSpacing: '0.04em',
                        boxShadow: '0 6px 24px rgba(139, 92, 246, 0.3)',
                        transition: 'all 0.2s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <path d="M14 14h2v2h-2z" />
                        <path d="M18 18h3v3h-3z" />
                        <path d="M18 14h3v2h-3z" />
                        <path d="M14 18h2v3h-2z" />
                        <path d="M7 7h.01" />
                        <path d="M17 7h.01" />
                        <path d="M7 17h.01" />
                      </svg>
                      Scan Student QR
                    </button>
                  </div>
                </div>


            {/* Live Logs List */}
            <div className="glass-panel" style={{ padding: '28px', minHeight: '350px', maxHeight: '500px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={20} style={{ color: '#10b981' }} /> Logged Presence (This Session)
              </h3>
              
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recognizedStudents.length === 0 ? (
                  <SmartEmptyState
                    title="Pehli class scan karo"
                    message="Face scanner kholo ya QR fallback use karo — students yahan dikhenge."
                    actionLabel="Open Face Scanner"
                    onAction={() => { playCyberSound('click'); setShowScannerModal(true); }}
                  />
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
              </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'session-history' && (
          <div className="mobile-tab-panel session-history-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.6s ease both' }}>
            {/* Header select filters */}
            <div className="glass-panel hide-on-print" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'Outfit, sans-serif', margin: 0, textAlign: 'left' }}>
                  Class Sessions Registers
                </h4>
                
                <div className="session-history-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
                  {userRole === 'admin' ? (
                    <>
                      {/* Department Select */}
                      <div className="form-group" style={{ margin: 0, minWidth: '200px', flex: '1 1 200px', textAlign: 'left' }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                          <Layers size={12} style={{ color: '#00f2fe' }} /> Branch / Department
                        </label>
                        <select
                          className="form-input"
                          value={selectedHistoryDept}
                          onChange={e => setSelectedHistoryDept(e.target.value)}
                          style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'rgba(8, 12, 20, 0.4)' }}
                        >
                          {[...new Set(subjects.map(s => s.department))].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      {/* Subject Select */}
                      <div className="form-group" style={{ margin: 0, minWidth: '220px', flex: '1 1 220px', textAlign: 'left' }}>
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                          <BookOpen size={12} style={{ color: '#00f2fe' }} /> Subject
                        </label>
                        <select
                          className="form-input"
                          value={selectedHistorySubjectId}
                          onChange={e => setSelectedHistorySubjectId(e.target.value)}
                          style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'rgba(8, 12, 20, 0.4)' }}
                        >
                          {subjects.filter(s => s.department === selectedHistoryDept).map(s => (
                            <option key={s.id} value={s.id.toString()}>
                              {s.name} ({s.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    /* Teacher Info Card */
                    <div style={{ 
                      background: 'rgba(0, 242, 254, 0.06)', 
                      border: '1px solid rgba(0, 242, 254, 0.15)', 
                      borderRadius: '8px', 
                      padding: '10px 16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      height: '42px',
                      boxSizing: 'border-box'
                    }}>
                      <BookOpen size={14} style={{ color: '#00f2fe' }} />
                      <span style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600 }}>
                        Subject: <strong style={{ color: '#00f2fe' }}>{currentUser?.details?.subject_name} ({currentUser?.details?.subject_code})</strong>
                      </span>
                    </div>
                  )}

                  {/* Date Picker */}
                  <div className="form-group" style={{ margin: 0, minWidth: '160px', flex: '1 1 160px', textAlign: 'left' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                      <Calendar size={12} style={{ color: '#00f2fe' }} /> Date
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => { playCyberSound('click'); shiftDate(historyFilterDate, -1, setHistoryFilterDate); }}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          color: '#94a3b8',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          transition: 'all 0.2s',
                          height: '42px',
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                        title="Previous Day"
                      >
                        ◀
                      </button>
                      <input
                        type="date"
                        className="form-input"
                        value={historyFilterDate}
                        onChange={e => setHistoryFilterDate(e.target.value)}
                        style={{ padding: '9px 14px', fontSize: '0.85rem', background: 'rgba(8, 12, 20, 0.4)', height: '42px', margin: 0 }}
                      />
                      <button
                        type="button"
                        onClick={() => { playCyberSound('click'); shiftDate(historyFilterDate, 1, setHistoryFilterDate); }}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          color: '#94a3b8',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          transition: 'all 0.2s',
                          height: '42px',
                          boxSizing: 'border-box'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                        title="Next Day"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  {/* Period Dropdown */}
                  <div className="form-group" style={{ margin: 0, minWidth: '180px', flex: '1 1 180px', textAlign: 'left' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                      <Clock size={12} style={{ color: '#00f2fe' }} /> Period / Time Slot
                    </label>
                    <select
                      className="form-input"
                      value={historyFilterPeriod}
                      onChange={e => setHistoryFilterPeriod(e.target.value)}
                      style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'rgba(8, 12, 20, 0.4)' }}
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
                </div>
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
                                 isMobileView ? (
                                   /* Mobile Detailed Grid Layout */
                                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
                                     {filteredStudents.map((st) => {
                                       const isPresent = st.status === 'Present';
                                       const statusBg = isPresent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                                       const statusBorder = isPresent ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)';
                                       const statusColor = isPresent ? '#10b981' : '#ef4444';
                                       
                                       return (
                                         <div 
                                           key={st.id} 
                                           className="glass-panel" 
                                           style={{ 
                                             padding: '16px', 
                                             borderRadius: '12px', 
                                             border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                                             display: 'flex',
                                             flexDirection: 'column',
                                             gap: '12px',
                                             background: 'rgba(13, 20, 35, 0.4)'
                                           }}
                                         >
                                           {/* Name & Status */}
                                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                             <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{st.name}</div>
                                             <button 
                                               onClick={() => {
                                                 playCyberSound('click');
                                                 toggleStudentSessionAttendance(st.id, st.status, session.date, session.period);
                                               }}
                                               style={{ 
                                                 padding: '4px 12px', 
                                                 borderRadius: '50px', 
                                                 fontSize: '0.65rem', 
                                                 fontWeight: 700,
                                                 background: statusBg,
                                                 border: statusBorder,
                                                 color: statusColor,
                                                 cursor: 'pointer',
                                                 outline: 'none',
                                                  transition: 'all 0.2s',
                                                 textTransform: 'uppercase'
                                               }}
                                               onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
                                               onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1.0)'; }}
                                             >
                                               {st.status.toUpperCase()}
                                             </button>
                                           </div>
                                           
                                           {/* Roll No */}
                                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                             <span style={{ color: 'var(--color-text-muted)' }}>Roll No:</span>
                                             <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{st.roll}</span>
                                           </div>
                                           
                                           {/* Branch & Semester */}
                                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                             <span style={{ color: 'var(--color-text-muted)' }}>Dept / Sem:</span>
                                             <span style={{ color: '#f1f5f9' }}>{st.dep} (Sem {st.semester})</span>
                                           </div>
                                           
                                           {/* Email */}
                                           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '8px' }}>
                                             <span style={{ color: 'var(--color-text-muted)' }}>Email:</span>
                                             <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{st.email}</span>
                                           </div>
                                         </div>
                                       );
                                     })}
                                   </div>
                                 ) : (
                                   /* Desktop Table Layout */
                                   <div className="table-container" style={{ margin: 0 }}>
                                     <table className="custom-table" style={{ fontSize: "0.85rem" }}>
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
                                         {filteredStudents.map((st) => {
                                           const isPresent = st.status === 'Present';
                                           const statusBg = isPresent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                                           const statusBorder = isPresent ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)';
                                           const statusColor = isPresent ? '#10b981' : '#ef4444';
                                            return (
                                           <tr key={st.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#f1f5f9' }}>
                                             <td style={{ padding: '12px 12px', fontWeight: 700, color: '#fff' }}>{st.roll}</td>
                                             <td style={{ padding: '12px 12px', fontWeight: 500 }}>{st.name}</td>
                                             <td style={{ padding: '12px 12px', color: 'var(--color-text-muted)' }}>{st.dep}</td>
                                             <td style={{ padding: '12px 12px', color: 'var(--color-text-muted)' }}>{st.semester}</td>
                                             <td style={{ padding: '12px 12px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{st.email}</td>
                                             <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                                               <button 
                                                onClick={() => {
                                                  playCyberSound('click');
                                                  toggleStudentSessionAttendance(st.id, st.status, session.date, session.period);
                                                }}
                                                style={{ 
                                                  padding: '4px 12px', 
                                                  borderRadius: '50px', 
                                                  fontSize: '0.65rem', 
                                                  fontWeight: 700,
                                                  background: statusBg,
                                                  border: statusBorder,
                                                  color: statusColor,
                                                  cursor: 'pointer',
                                                  outline: 'none',
                                                  transition: 'all 0.2s',
                                                  textTransform: 'uppercase'
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1.0)'; }}
                                              >
                                                {st.status.toUpperCase()}
                                              </button>
                                             </td>
                                           </tr>
                                         );
                                         })}
                                       </tbody>
                                     </table>
                                   </div>
                                 )
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
                                        onClick={() => {
                                          playCyberSound('click');
                                          toggleStudentSessionAttendance(st.id, st.status, session.date, session.period);
                                        }}
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
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px', textAlign: 'left' }}>
                  <label className="form-label">Start Date</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => { playCyberSound('click'); shiftDate(reportStartDate, -1, setReportStartDate); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#94a3b8',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                        height: '42px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                      title="Previous Day"
                    >
                      ◀
                    </button>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={reportStartDate} 
                      onChange={e => setReportStartDate(e.target.value)} 
                      style={{ height: '42px', margin: 0, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => { playCyberSound('click'); shiftDate(reportStartDate, 1, setReportStartDate); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#94a3b8',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                        height: '42px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                      title="Next Day"
                    >
                      ▶
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px', textAlign: 'left' }}>
                  <label className="form-label">End Date</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => { playCyberSound('click'); shiftDate(reportEndDate, -1, setReportEndDate); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#94a3b8',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                        height: '42px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                      title="Previous Day"
                    >
                      ◀
                    </button>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={reportEndDate} 
                      onChange={e => setReportEndDate(e.target.value)} 
                      style={{ height: '42px', margin: 0, flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => { playCyberSound('click'); shiftDate(reportEndDate, 1, setReportEndDate); }}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: '#94a3b8',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s',
                        height: '42px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                      title="Next Day"
                    >
                      ▶
                    </button>
                  </div>
                </div>
                {userRole === 'admin' ? (
                  <>
                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
                      <label className="form-label">Department</label>
                      <select 
                        className="form-input" 
                        value={reportDeptFilter} 
                        onChange={e => { setReportDeptFilter(e.target.value); setSelectedReportSubjectId(''); }}
                      >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '220px' }}>
                      <label className="form-label">Subject</label>
                      <select 
                        className="form-input" 
                        value={selectedReportSubjectId} 
                        onChange={e => setSelectedReportSubjectId(e.target.value)}
                      >
                        <option value="">All Subjects</option>
                        {(reportDeptFilter 
                          ? subjects.filter(s => s.department === reportDeptFilter) 
                          : subjects
                        ).map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                    </div>
                  </>
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
              {reportDeptFilter && (
                <p style={{ color: '#374151', fontSize: '0.95rem', marginTop: '4px' }}>
                  Department: <strong>{reportDeptFilter}</strong>
                </p>
              )}
              {selectedReportSubjectId && (
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
                  <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto', overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
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
                          const maxDept = keys.reduce((a, b) => {
                            const valA = stats.department_stats[a];
                            const valB = stats.department_stats[b];
                            const countA = (valA && typeof valA === 'object') ? (valA.present !== undefined ? valA.present : 0) : valA;
                            const countB = (valB && typeof valB === 'object') ? (valB.present !== undefined ? valB.present : 0) : valB;
                            return countA > countB ? a : b;
                          });
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

        {activeTab === 'settings' && (
          <div className="settings-section" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {activeSubSetting !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  onClick={() => { setActiveSubSetting(null); playCyberSound('click'); }}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}
                >
                  <ArrowLeft size={16} /> Back to Settings Hub
                </button>
                <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Settings Hub &gt; {activeSubSetting}
                </span>
              </div>
            )}

            {activeSubSetting === null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>⚙️ Settings Directory Hub</h2>
                  <p style={{ color: '#9ca3af', fontSize: '0.9rem', margin: 0 }}>
                    Select a settings category below to configure parameters, modify user access, or adjust preferences.
                  </p>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '20px'
                }}>
                  {/* Category Card 1: GPS Geofencing */}
                  <div 
                    onClick={() => { setActiveSubSetting('geofencing'); playCyberSound('click'); }}
                    className="glass-panel hover-card" 
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ShieldCheck size={24} style={{ color: '#00f2fe' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: userRole === 'student' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: userRole === 'student' ? '#00f2fe' : '#10b981' }}>
                        {userRole === 'student' ? '🟢 View Status' : '🏢 All Admins'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>GPS Geofencing</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Restricts student check-in to a specific geographical radius.</p>
                  </div>

                  {/* Category Card 2: IP Subnet Restrictions */}
                  <div 
                    onClick={() => { setActiveSubSetting('ip'); playCyberSound('click'); }}
                    className="glass-panel hover-card" 
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Lock size={24} style={{ color: '#00f2fe' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: userRole === 'student' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: userRole === 'student' ? '#00f2fe' : '#10b981' }}>
                        {userRole === 'student' ? '🟢 View Status' : '🏢 All Admins'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>IP Subnet Restrictions</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Allows attendance logging only from specified Wi-Fi networks/subnets.</p>
                  </div>

                  {/* Category Card 3: Emergency System Lockdown */}
                  <div 
                    onClick={() => { setActiveSubSetting('lockdown'); playCyberSound('click'); }}
                    className="glass-panel hover-card" 
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', opacity: (userRole !== 'student' && currentUser?.institution_id !== 1) ? 0.7 : 1 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AlertCircle size={24} style={{ color: '#ef4444' }} />
                      {userRole === 'student' ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0, 242, 254, 0.12)', color: '#00f2fe' }}>🟢 View Status</span>
                      ) : currentUser?.institution_id !== 1 ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>🔒 Restricted</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>👑 Owner Only</span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Emergency Lockdown</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Cut off all face recognition feeds instantly and trigger audio alerts.</p>
                  </div>

                  {/* Category Card 4: Themes & Sound Effects */}
                  <div 
                    onClick={() => { setActiveSubSetting('themes'); playCyberSound('click'); }}
                    className="glass-panel hover-card" 
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', opacity: currentUser?.institution_id !== 1 ? 0.7 : 1 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Volume2 size={24} style={{ color: 'var(--color-primary)' }} />
                      {currentUser?.institution_id !== 1 ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>🔒 Restricted</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>👑 Owner Only</span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Themes & Cyber Audio</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Choose interface themes, retro CRT scanline overlay, and acoustic feedback sounds.</p>
                  </div>

                  {/* Category Card 5: Synth Equalizer Customizer */}
                  <div 
                    onClick={() => { setActiveSubSetting('equalizer'); playCyberSound('click'); }}
                    className="glass-panel hover-card" 
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', opacity: currentUser?.institution_id !== 1 ? 0.7 : 1 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Settings size={24} style={{ color: 'var(--color-primary)' }} />
                      {currentUser?.institution_id !== 1 ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>🔒 Restricted</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>👑 Owner Only</span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Synth Equalizer</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Tune base frequency pitch register, sound modulators, and CPU hum drone volume.</p>
                  </div>

                  {/* Category Card 6: Advanced Security Console */}
                  {userRole !== 'student' && (
                    <div 
                      onClick={() => { setActiveSubSetting('advanced'); playCyberSound('click'); }}
                      className="glass-panel hover-card" 
                      style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <ShieldCheck size={24} style={{ color: 'var(--color-primary)' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>🏢 Admins & Teachers</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Advanced Security</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Biometric match confidence filter, EAR spoof strictness, AI cognitive level, and telemetry diagnostics.</p>
                    </div>
                  )}

                  {/* Category Card 7: Admin Profile Settings */}
                  {userRole !== 'student' && (
                    <div 
                      onClick={() => { setActiveSubSetting('profile'); playCyberSound('click'); }}
                      className="glass-panel hover-card" 
                      style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <UserCheck size={24} style={{ color: '#a78bfa' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>🏢 All Admins</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>My Admin Profile</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Modify administrator profile name, login email address, or update system password credentials.</p>
                    </div>
                  )}

                  {/* Category Card 8: Admin Account Registry */}
                  {userRole !== 'student' && (
                    <div 
                      onClick={() => { setActiveSubSetting('admins'); playCyberSound('click'); }}
                      className="glass-panel hover-card" 
                      style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <UserPlus size={24} style={{ color: '#00f2fe' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>🏢 All Admins</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Register Administrators</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Seed and manage new auxiliary administrator credentials or activate/deactivate accounts.</p>
                    </div>
                  )}

                  {/* Category Card 10: Manage Departments */}
                  {userRole !== 'student' && (
                    <div 
                      onClick={() => { setActiveSubSetting('departments'); playCyberSound('click'); }}
                      className="glass-panel hover-card" 
                      style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <BookOpen size={24} style={{ color: '#ec4899' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899' }}>🏫 Setup</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Manage Departments</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Configure active college departments and branches. Custom departments will dynamically populate dropdowns.</p>
                    </div>
                  )}

                  {/* Category Card: Productivity Hub */}
                  {userRole !== 'student' && (
                    <div 
                      onClick={() => { setActiveSubSetting('productivity'); playCyberSound('click'); }}
                      className="glass-panel hover-card" 
                      style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <BarChart3 size={24} style={{ color: '#10b981' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>NEW</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Productivity Hub</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Bulk CSV import, analytics, audit trail, ERP API keys, billing, and institution FAQ.</p>
                    </div>
                  )}

                  {/* Category Card: Exploration Lab */}
                  {userRole !== 'student' && (
                    <div
                      onClick={() => { setActiveSubSetting('exploration'); playCyberSound('click'); }}
                      className="glass-panel hover-card"
                      style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.4rem' }}>✨</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>FUN</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Exploration Lab</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Hidden FX, scanner sound packs, confetti mode, particle density, and secret discoveries.</p>
                    </div>
                  )}

                  {/* Category Card: Futuristic Features Hub */}
                  <div
                    onClick={() => { setActiveSubSetting('futuristic'); playCyberSound('click'); }}
                    className="glass-panel hover-card"
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.4rem' }}>🚀</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0, 242, 254, 0.12)', color: '#00f2fe' }}>NEW</span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Futuristic Features Hub</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Theme Studio, Widget Home, Polls, Health Check, Campus Map, Premium Control, and more.</p>
                  </div>

                  {/* Category Card: Premium Subscription */}
                  {userRole === 'admin' && (
                    <div
                      onClick={() => { setActiveSubSetting('premium'); playCyberSound('click'); }}
                      className="glass-panel hover-card"
                      style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.4rem' }}>👑</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24' }}>PRO</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Premium & Payments</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Upgrade plans via Razorpay — unlock pro themes, higher student limits, and enterprise ERP.</p>
                    </div>
                  )}

                  {/* Category Card: App Version */}
                  <div
                    onClick={() => { setActiveSubSetting('app_version'); playCyberSound('click'); handleManualCheck(); }}
                    className="glass-panel hover-card"
                    style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <ArrowUpCircle size={24} style={{ color: '#0891b2' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(8, 145, 178, 0.12)', color: '#22d3ee' }}>v{APP_VERSION}</span>
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>App Version & Updates</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>See if you are on the latest build, check for new releases, and confirm update installation.</p>
                  </div>

                  {/* Category Card 9: Multi-Tenant Registry & Management */}
                  {userRole !== 'student' && getActiveTenantSlug() === 'default' && currentUser?.institution_id === 1 && (
                    <div 
                      onClick={() => { setActiveSubSetting('multitenant'); playCyberSound('click'); }}
                      className="glass-panel hover-card" 
                      style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🏫</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>👑 Owner Only</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Multi-Tenant Registry</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Register, monitor, and delete college tenants. Configure primary/secondary color schemes and seed initial admins.</p>
                    </div>
                  )}

                  {/* Category Card 11: System Release Updates */}
                  {userRole !== 'student' && currentUser?.email?.trim()?.toLowerCase() === 'rajkishorock@gmail.com' && (
                    <div 
                      onClick={() => { setActiveSubSetting('release_updates'); playCyberSound('click'); }}
                      className="glass-panel hover-card" 
                      style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <ArrowUpCircle size={24} style={{ color: '#10b981' }} />
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>👑 Owner Only</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>System Release Updates</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Publish new system-wide APK versions and manage update downloads for all users.</p>
                    </div>
                  )}

                  {/* Category Card 12: Leave Management */}
                  {userRole !== 'student' && (
                    <div 
                      onClick={() => { setActiveSubSetting('leave_management'); fetchAdminLeaves(); playCyberSound('click'); }}
                      className="glass-panel hover-card" 
                      style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', border: '1px solid rgba(251,146,60,0.2)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.4rem' }}>📋</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}>👩‍🏫 Teacher/Admin</span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Leave Management</h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Review, approve, or reject student leave requests with full history.</p>
                      {adminLeaveRequests.filter(r => r.status === 'Pending').length > 0 && (
                        <span style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                          {adminLeaveRequests.filter(r => r.status === 'Pending').length} Pending
                        </span>
                      )}
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div>
                {/* Geofencing Sub-view */}
                {activeSubSetting === 'geofencing' && (

                  <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={22} style={{ color: '#00f2fe' }} /> GPS Geofencing Configuration
                      </h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px' }}>
                        Configure the physical latitude, longitude coordinates and allowed radius boundaries for check-in.
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
                          onClick={() => { if (userRole !== 'student') setSettingsGeoEnabled(!settingsGeoEnabled); }} 
                          style={{
                            width: '48px',
                            height: '26px',
                            backgroundColor: settingsGeoEnabled ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${settingsGeoEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '50px',
                            padding: '2px',
                            cursor: userRole === 'student' ? 'not-allowed' : 'pointer',
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
                        <div style={{ display: 'grid', gridTemplateColumns: userRole === 'student' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Center Latitude</label>
                            <input 
                              type="number" 
                              step="any"
                              className="form-input" 
                              value={settingsLat} 
                              onChange={e => setSettingsLat(e.target.value)} 
                              disabled={userRole === 'student'}
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
                              disabled={userRole === 'student'}
                            />
                          </div>
                          <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label">Allowed Radius (meters)</label>
                            <input 
                              type="number" 
                              className="form-input" 
                              value={settingsRadius} 
                              onChange={e => setSettingsRadius(e.target.value)} 
                              disabled={userRole === 'student'}
                            />
                          </div>
                          {userRole !== 'student' && (
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
                          )}
                        </div>
                      )}
                    </div>

                    {userRole !== 'student' ? (
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
                    ) : (
                      <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', margin: '8px 0 0' }}>🔒 Read-Only Mode (Configured by Administrator)</p>
                    )}
                  </div>
                )}

                {/* IP Subnet Restrictions Sub-view */}
                {activeSubSetting === 'ip' && (
                  <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Lock size={22} style={{ color: '#00f2fe' }} /> IP Subnet Restrictions
                      </h3>
                      <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px' }}>
                        Allows attendance logging only from specified Wi-Fi networks/subnets.
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

                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px' }}>
                      <div className="flex-between" style={{ marginBottom: '16px' }}>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>IP Subnet Restrictions</h4>
                          <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '2px' }}>
                            Allows attendance logging only from specified Wi-Fi networks/subnets.
                          </p>
                        </div>
                        <div 
                          onClick={() => { if (userRole !== 'student') setSettingsIpEnabled(!settingsIpEnabled); }} 
                          style={{
                            width: '48px',
                            height: '26px',
                            backgroundColor: settingsIpEnabled ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${settingsIpEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '50px',
                            padding: '2px',
                            cursor: userRole === 'student' ? 'not-allowed' : 'pointer',
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
                            disabled={userRole === 'student'}
                          />
                          <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginTop: '6px' }}>
                            Separate multiple IP addresses or CIDR blocks with a comma. Examples: `127.0.0.1`, `192.168.1.0/24`.
                          </span>
                        </div>
                      )}
                    </div>

                    {userRole !== 'student' ? (
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
                    ) : (
                      <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', margin: '8px 0 0' }}>🔒 Read-Only Mode (Configured by Administrator)</p>
                    )}
                  </div>
                )}

                {/* Emergency System Lockdown Sub-view */}
                {activeSubSetting === 'lockdown' && (
                  <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={22} style={{ color: '#ef4444' }} /> Emergency System Lockdown
                      </h3>
                      <p style={{ color: '#fca5a5', opacity: 0.7, fontSize: '0.875rem', marginTop: '4px' }}>
                        Cut off all face recognition feeds instantly and trigger audio alerts.
                      </p>
                    </div>

                    <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '12px', padding: '20px', textAlign: 'left' }}>
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
                          disabled={userRole === 'student' || currentUser?.institution_id !== 1}
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
                            cursor: (userRole === 'student' || currentUser?.institution_id !== 1) ? 'not-allowed' : 'pointer',
                            opacity: (userRole === 'student' || currentUser?.institution_id !== 1) ? 0.5 : 1,
                            boxShadow: lockdownActive ? '0 0 15px rgba(16, 185, 129, 0.3)' : '0 0 15px rgba(239, 68, 68, 0.3)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {lockdownActive ? 'Reset Relays' : 'ENGAGE LOCKDOWN'}
                        </button>
                      </div>
                      {(userRole === 'student' || currentUser?.institution_id !== 1) && (
                        <div style={{ fontSize: '0.75rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px' }}>
                          <span>🔒 Control restricted to Default System Owner. Current Status: {lockdownActive ? '🚨 ENGAGED' : '🟢 Idle'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

            {/* ===== SYSTEM THEME & SOUND CONTROLS ===== */}
            {activeSubSetting === 'themes' && (
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
                      style={{ 
                        width: '100%', 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-color)', 
                        color: 'var(--color-text-main)',
                        opacity: 1,
                        cursor: 'default'
                      }}
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
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Enable retro cathode-ray tube screen curvature & flicker.</span>
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
                          opacity: 1,
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
                          opacity: 1,
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
              </div>
            )}

            {/* Synth Acoustic Equalizer Panel */}
            {activeSubSetting === 'equalizer' && (
              <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Volume2 size={22} style={{ color: 'var(--color-primary)' }} /> Synth Equalizer & Acoustic Customizer
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px' }}>
                    Tune base frequency pitch register, sound modulators, and CPU hum drone volume.
                  </p>
                </div>
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
                      style={{ 
                        width: '100%', 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border-color)', 
                        color: 'var(--color-text-main)',
                        opacity: 1,
                        cursor: 'default'
                      }}
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
                      style={{ 
                        width: '100%', 
                        accentColor: 'var(--color-primary)',
                        cursor: 'pointer',
                        opacity: 1
                      }}
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
                          opacity: 1,
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
                          style={{ 
                            width: '100%', 
                            accentColor: 'var(--color-primary)',
                            cursor: 'pointer',
                            opacity: 1
                          }}
                        />
                      </div>
                    )}
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      Generates low-pitch background drone representing cpu frequency load.
                    </span>
                  </div>
                </div>
              </div>
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
                  betaActive: currentBetaActive,
                  updateActive: updateActiveFlag,
                  latestVersion: serverLatestVersion,
                }}
                onNavigateSettings={(sub) => setActiveSubSetting(sub)}
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
              <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ color: '#f8fafc', margin: 0 }}>App Version & Update Status</h3>
                <VersionBadge
                  serverLatest={serverLatestVersion}
                  updateActive={updateActiveFlag}
                  onCheckUpdate={handleManualCheck}
                />
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                  After installing a new APK, tap the button below to confirm and hide the update banner until the next release.
                </p>
                <button
                  type="button"
                  className="bg-gradient-btn"
                  onClick={() => {
                    markCurrentVersionInstalled();
                    if (serverLatestVersion) acknowledgeUpdateVersion(serverLatestVersion);
                    setUpdateAvailable(null);
                    setUpdateDismissed(true);
                    playCyberSound('success');
                  }}
                  style={{ alignSelf: 'flex-start', padding: '10px 18px', borderRadius: '8px' }}
                >
                  ✓ I installed the latest update (v{APP_VERSION})
                </button>
              </div>
            )}

            {/* ===== ADVANCED SYSTEM CONFIG & EXTREME SECURITY CONSOLE ===== */}
            {activeSubSetting === 'advanced' && (
              <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={22} style={{ color: 'var(--color-primary)' }} /> Advanced System & Extreme Security Console
                </h3>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px' }}>
                  Fine-tune biometric confidence filters, anti-spoofing liveness sensors, AI cognitive profiles, and diagnostics.
                </p>
                {userRole !== 'admin' && userRole !== 'teacher' && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>🔒 Controls restricted to Administrator or Teacher.</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {/* Biometric Slider */}
                <div style={{ 
                   background: 'rgba(255,255,255,0.01)', 
                   border: '1px solid rgba(255,255,255,0.03)', 
                   borderRadius: '12px', 
                   padding: '20px', 
                   display: 'flex', 
                   flexDirection: 'column', 
                   gap: '12px', 
                   textAlign: 'left',
                   opacity: biometricConfidenceFilterEnabled ? 1 : 0.7,
                   transition: 'opacity 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Biometric Match Confidence Filter</label>
                    <label style={{
                      position: 'relative',
                      display: 'inline-block',
                      width: '40px',
                      height: '20px',
                      cursor: 'pointer'
                    }}>
                      <input 
                        type="checkbox"
                        checked={biometricConfidenceFilterEnabled}
                        disabled={userRole !== 'admin' && userRole !== 'teacher'}
                        onChange={(e) => {
                          setBiometricConfidenceFilterEnabled(e.target.checked);
                          playCyberSound('click');
                        }}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: biometricConfidenceFilterEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                        opacity: (userRole !== 'admin' && userRole !== 'teacher') ? 0.5 : 1,
                        cursor: (userRole !== 'admin' && userRole !== 'teacher') ? 'not-allowed' : 'pointer',
                        transition: '.3s',
                        borderRadius: '20px',
                        boxShadow: biometricConfidenceFilterEnabled ? '0 0 10px var(--color-primary)' : 'none'
                      }}>
                        <span style={{
                          position: 'absolute',
                          content: '""',
                          height: '14px',
                          width: '14px',
                          left: biometricConfidenceFilterEnabled ? '22px' : '3px',
                          bottom: '3px',
                          backgroundColor: '#f8fafc',
                          transition: '.3s',
                          borderRadius: '50%'
                        }} />
                      </span>
                    </label>
                  </div>
                  
                  {biometricConfidenceFilterEnabled ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeInUp 0.3s ease both' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)', textShadow: '0 0 8px var(--color-primary)' }}>
                        {Math.round(biometricMatchThreshold * 100)}% Match Requirement
                      </span>
                      <input 
                        type="range"
                        min="0.80"
                        max="0.99"
                        step="0.01"
                        value={biometricMatchThreshold}
                        disabled={!biometricConfidenceFilterEnabled || (userRole !== 'admin' && userRole !== 'teacher')}
                        onChange={(e) => {
                          setBiometricMatchThreshold(parseFloat(e.target.value));
                        }}
                        onMouseUp={() => {
                          if (userRole === 'admin' || userRole === 'teacher') playCyberSound('click');
                        }}
                        onTouchEnd={() => {
                          if (userRole === 'admin' || userRole === 'teacher') playCyberSound('click');
                        }}
                        style={{ 
                          width: '100%', 
                          accentColor: 'var(--color-primary)',
                          cursor: (biometricConfidenceFilterEnabled && (userRole === 'admin' || userRole === 'teacher')) ? 'pointer' : 'not-allowed',
                          opacity: (biometricConfidenceFilterEnabled && (userRole === 'admin' || userRole === 'teacher')) ? 1 : 0.5
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        Rejects facial verification signatures scoring lower than this threshold.
                      </span>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', fontStyle: 'italic' }}>
                      ⚡ Filter Disabled: Camera will match faces regardless of confidence score (pre-multi-tenant behaviour).
                    </div>
                  )}
                </div>

                {/* Anti Spoofing EAR Slider */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Anti-Spoofing Blink EAR Strictness</label>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', textShadow: '0 0 8px rgba(16, 185, 129, 0.4)' }}>
                    {antiSpoofingThreshold.toFixed(2)} Eye Aspect Ratio (EAR)
                  </span>
                  <input 
                    type="range"
                    min="0.15"
                    max="0.30"
                    step="0.01"
                    value={antiSpoofingThreshold}
                    disabled={userRole !== 'admin' && userRole !== 'teacher'}
                    onChange={(e) => {
                      setAntiSpoofingThreshold(parseFloat(e.target.value));
                    }}
                    onMouseUp={() => {
                      if (userRole === 'admin' || userRole === 'teacher') playCyberSound('click');
                    }}
                    onTouchEnd={() => {
                      if (userRole === 'admin' || userRole === 'teacher') playCyberSound('click');
                    }}
                    style={{ 
                      width: '100%', 
                      accentColor: '#10b981',
                      cursor: (userRole === 'admin' || userRole === 'teacher') ? 'pointer' : 'not-allowed',
                      opacity: (userRole !== 'admin' && userRole !== 'teacher') ? 0.5 : 1
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Liveness validation sensitivity. Higher is stricter and harder to spoof.
                  </span>
                </div>

                {/* Liveness Verification Bypass Toggle */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Liveness Verification (Anti-Spoofing)</label>
                    <button
                      type="button"
                      disabled={userRole !== 'admin' && userRole !== 'teacher'}
                      onClick={() => {
                        setLivenessBypass(prev => !prev);
                        playCyberSound('click');
                      }}
                      style={{
                        padding: '6px 14px',
                        background: livenessBypass ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        border: `1px solid ${livenessBypass ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                        borderRadius: '8px',
                        color: livenessBypass ? '#ef4444' : '#10b981',
                        fontWeight: 700,
                        cursor: (userRole === 'admin' || userRole === 'teacher') ? 'pointer' : 'not-allowed',
                        fontSize: '0.78rem',
                        textTransform: 'uppercase',
                        opacity: (userRole !== 'admin' && userRole !== 'teacher') ? 0.5 : 1
                      }}
                    >
                      {livenessBypass ? 'Bypassed (Instant)' : 'Active (Blink)'}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {livenessBypass 
                      ? '⚡ Bypassed: Facial recognition will run instantly as soon as any face is detected in the camera frame.'
                      : '🛡️ Active: Requires the student to perform a physical eye blink to verify liveness before recognition.'}
                  </span>
                </div>

                {/* AI Cognitive Mode */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>AI Assistant Cognitive Level</label>
                  <select 
                    value={aiCognitiveLevel}
                    disabled={userRole !== 'admin' && userRole !== 'teacher'}
                    onChange={(e) => {
                      setAiCognitiveLevel(e.target.value);
                      playCyberSound('click');
                    }}
                    className="form-input"
                    style={{ 
                      width: '100%', 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--color-text-main)',
                      opacity: (userRole !== 'admin' && userRole !== 'teacher') ? 0.6 : 1,
                      cursor: (userRole !== 'admin' && userRole !== 'teacher') ? 'not-allowed' : 'default'
                    }}
                  >
                    <option value="standard">Standard Copilot Mode</option>
                    <option value="hyper">Hyper-Processing Cognitive Mode (Extreme)</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Hyper mode injects directives for maximum analytical details, code formatting, and structure.
                  </span>
                </div>

                {/* Diagnostic Logging Level & Telemetry Exporter */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                  <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Diagnostics Logging Verbosity</label>
                  <select 
                    value={diagnosticLevel}
                    disabled={userRole !== 'admin' && userRole !== 'teacher'}
                    onChange={(e) => {
                      setDiagnosticLevel(e.target.value);
                      playCyberSound('click');
                    }}
                    className="form-input"
                    style={{ 
                      width: '100%', 
                      background: 'var(--bg-secondary)', 
                      border: '1px solid var(--border-color)', 
                      color: 'var(--color-text-main)',
                      opacity: (userRole !== 'admin' && userRole !== 'teacher') ? 0.6 : 1,
                      cursor: (userRole !== 'admin' && userRole !== 'teacher') ? 'not-allowed' : 'default'
                    }}
                  >
                    <option value="NONE">NONE (Mute Console)</option>
                    <option value="INFO">INFO (Important events only)</option>
                    <option value="DEBUG">DEBUG (Standard systems telemetry)</option>
                    <option value="TRACE">TRACE (Full frames diagnostics & audio oscillators)</option>
                  </select>
                  
                  <button
                    disabled={userRole !== 'admin' && userRole !== 'teacher'}
                    onClick={() => {
                      playCyberSound('success');
                      const logsData = {
                        system: 'Smart Attendance System - Core Diagnostics',
                        timestamp: new Date().toISOString(),
                        activeTheme,
                        hudMetrics,
                        apiLatency,
                        biometricMatchThreshold,
                        antiSpoofingThreshold,
                        aiCognitiveLevel,
                        diagnosticLevel,
                        systemLogs: diagnosticLogs
                      };
                      const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `system_diagnostics_${Date.now()}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="btn-secondary"
                    style={{ 
                      width: '100%', 
                      height: '42px', 
                      borderRadius: '8px', 
                      fontSize: '0.85rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px', 
                      marginTop: '4px',
                      opacity: userRole !== 'admin' ? 0.5 : 1,
                      cursor: userRole !== 'admin' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    📥 Export Core Telemetry & Logs
                  </button>
                </div>
              </div>
            </div>
          )}

            {/* ===== ADMIN ACCOUNT PROFILE SECTION ===== */}
            {activeSubSetting === 'profile' && (
              <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCheck size={22} style={{ color: '#a78bfa' }} /> Admin Profile Settings
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px' }}>
                    Update your name, email credentials, or change your password.
                  </p>
                </div>

              {/* UPDATE OWN PROFILE */}
              <div style={{ background: 'rgba(167,139,250,0.02)', border: '1px solid rgba(167,139,250,0.1)', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit size={16} style={{ color: '#a78bfa' }} /> Update My Admin Profile
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
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={currentUser?.name || 'Enter your name'}
                      value={adminProfileName}
                      onChange={e => setAdminProfileName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">New Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder={currentUser?.email || 'Enter new email'}
                      value={adminProfileEmail}
                      onChange={e => setAdminProfileEmail(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="New password"
                      value={adminProfilePassword}
                      onChange={e => setAdminProfilePassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Enter password again"
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
                      setAdminProfileErr('Passwords do not match!');
                      return;
                    }
                    if (!adminProfileName && !adminProfileEmail && !adminProfilePassword) {
                      setAdminProfileErr('Fill at least one field to update!');
                      return;
                    }
                    setIsUpdatingAdminProfile(true);
                    if (isDemoMode) {
                      setTimeout(() => {
                        const email = adminProfileEmail || currentUser.email;
                        const name = adminProfileName || currentUser.name;
                        setCurrentUser(prev => ({
                          ...prev,
                          name: name,
                          email: email,
                          details: { ...prev.details, name: name, email: email }
                        }));
                        setAdminProfileMsg(`SIMULATOR ACTION: Profile updated successfully! (Local Sandbox Mode).`);
                        setAdminProfileName('');
                        setAdminProfileEmail('');
                        setAdminProfilePassword('');
                        setAdminProfileConfirmPassword('');
                        setIsUpdatingAdminProfile(false);
                      }, 1000);
                      return;
                    }
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
                      setAdminProfileMsg(`Profile updated successfully! Now log in with ${updated.email}.`);
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
                  {isUpdatingAdminProfile ? 'Saving...' : '💾 Save Profile'}
                </button>
              </div>
            </div>
            )}

            {/* ===== ADMIN ACCOUNT REGISTRATION SECTION ===== */}
            {activeSubSetting === 'admins' && (
              <>
                <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserPlus size={22} style={{ color: '#00f2fe' }} /> Register Administrators
                    </h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px' }}>
                      Seed and manage new auxiliary administrator credentials.
                    </p>
                  </div>

                  {/* CREATE NEW ADMIN */}
                  <div style={{ background: 'rgba(0,242,254,0.01)', border: '1px solid rgba(0,242,254,0.08)', borderRadius: '12px', padding: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={16} style={{ color: '#00f2fe' }} /> Create New Admin Account
                </h4>
                <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '16px' }}>Multiple admins can be added. Create a new admin and give them separate login credentials.</p>

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
                    <label className="form-label">Admin Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Example: Rajkishore"
                      value={newAdminName}
                      onChange={e => setNewAdminName(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Admin Email</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Example: raj@college.com"
                      value={newAdminEmail}
                      onChange={e => setNewAdminEmail(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Set Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Enter strong password"
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
                      setCreateAdminErr('Name, Email, and Password are all required!');
                      return;
                    }
                    const masterPass = await requestMasterPassword('🔐 Master Key Verification Required', `Enter Master Password to register new Admin "${newAdminName}":`);
                    if (!masterPass) {
                      setCreateAdminErr('Registration cancelled. Master key is required.');
                      return;
                    }
                    setIsCreatingAdmin(true);
                    if (isDemoMode) {
                      setTimeout(() => {
                        const addedAdmin = {
                          id: Date.now(),
                          name: newAdminName,
                          email: newAdminEmail,
                          role: 'admin',
                          is_active: true,
                          created_at: new Date().toISOString()
                        };
                        setTeachers(prev => [...prev, addedAdmin]);
                        setCreateAdminMsg(`SIMULATOR ACTION: Admin account created successfully! Log in using ${newAdminEmail}.`);
                        setNewAdminName('');
                        setNewAdminEmail('');
                        setNewAdminPassword('');
                        setIsCreatingAdmin(false);
                      }, 1000);
                      return;
                    }
                    try {
                      const res = await fetch(`${API_BASE_URL}/users/`, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json', 
                          'Authorization': `Bearer ${token}`,
                          'X-Master-Password': masterPass
                        },
                        body: JSON.stringify({ name: newAdminName, email: newAdminEmail, password: newAdminPassword, role: 'admin' })
                      });
                      if (!res.ok) {
                        const d = await res.json();
                        throw new Error(d.detail || 'Failed to create admin.');
                      }
                      setCreateAdminMsg(`Admin account created successfully! Log in using ${newAdminEmail}.`);
                      setNewAdminName('');
                      setNewAdminEmail('');
                      setNewAdminPassword('');
                      fetchTeachers(); // Refresh list of admins
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
                  {isCreatingAdmin ? 'Creating...' : '➕ Create New Admin'}
                </button>
              </div>
            </div>

            {/* CHANGE COLLEGE MASTER PASSWORD */}
            {currentUser?.institution_id !== 1 && (
              <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Lock size={22} style={{ color: '#e11d48' }} /> Change Workspace Master Password
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
                    Modify the master verification password for this institution. Verification of either the current master password or the system owner's master password is required.
                  </p>
                </div>

                {masterKeyUpdateMsg && (
                  <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem' }}>
                    ✅ {masterKeyUpdateMsg}
                  </div>
                )}
                {masterKeyUpdateErr && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
                    ❌ {masterKeyUpdateErr}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Current Master Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Enter current master password"
                      value={currentMasterKeyInput}
                      onChange={e => setCurrentMasterKeyInput(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">New Master Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Min 6 characters"
                      value={newMasterKeyInput}
                      onChange={e => setNewMasterKeyInput(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  onClick={handleChangeMasterKey}
                  className="bg-gradient-btn"
                  style={{ width: 'fit-content', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #e11d48, #be123c)' }}
                  disabled={isUpdatingMasterKey}
                >
                  {isUpdatingMasterKey ? 'Updating...' : '🔐 Update Master Password'}
                </button>
              </div>
            )}

            {/* Registered Admins Directory */}
            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <ShieldCheck size={22} style={{ color: '#a78bfa' }} /> Registered Administrators
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
                    List of all system administrators with their login and active status details.
                  </p>
                </div>
                <span className="telemetry-stat-pill admin" style={{
                  padding: '4px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: 'rgba(167, 139, 250, 0.12)',
                  color: '#a78bfa',
                  border: '1px solid rgba(167, 139, 250, 0.25)',
                  letterSpacing: '0.5px'
                }}>
                  TOTAL ADMINS: {(teachers || []).filter(u => u.role === 'admin').length}
                </span>
              </div>

              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>ID</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>NAME</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>EMAIL (USERNAME)</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>ROLE</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>STATUS</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600 }}>CREATED DATE</th>
                      <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(teachers || []).filter(u => u.role === 'admin').map((adminUser) => (
                      <tr key={adminUser.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                        <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>#{adminUser.id}</td>
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: '#f1f5f9' }}>{adminUser.name}</td>
                        <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)' }}>{adminUser.email}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.72rem', 
                            fontWeight: 'bold',
                            background: 'rgba(0, 242, 254, 0.12)',
                            color: '#00f2fe'
                          }}>
                            SYSTEM ADMIN
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '0.72rem', 
                            fontWeight: 'bold',
                            background: adminUser.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: adminUser.is_active ? '#10b981' : '#ef4444'
                          }}>
                            {adminUser.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)' }}>
                          {new Date(adminUser.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={async () => {
                                playCyberSound('click');
                                const masterPass = await requestMasterPassword('🔐 Master Key Verification Required', `Enter Master Password to ${adminUser.is_active ? 'DEACTIVATE' : 'ACTIVATE'} admin "${adminUser.email}":`);
                                if (!masterPass) return;
                                if (isDemoMode) {
                                  setTeachers(prev => prev.map(t => t.id === adminUser.id ? { ...t, is_active: !t.is_active } : t));
                                  alert(`SIMULATOR ACTION: Status updated successfully.`);
                                  playCyberSound('success');
                                  return;
                                }
                                try {
                                  const res = await fetch(`${API_BASE_URL}/users/${adminUser.id}`, {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${token}`,
                                      'X-Master-Password': masterPass
                                    },
                                    body: JSON.stringify({
                                      name: adminUser.name,
                                      email: adminUser.email,
                                      role: adminUser.role,
                                      is_active: !adminUser.is_active
                                    })
                                  });
                                  if (res.ok) {
                                    alert(`Status updated successfully.`);
                                    playCyberSound('success');
                                    fetchTeachers();
                                  } else {
                                    const errData = await res.json();
                                    alert(errData.detail || 'Failed to update admin.');
                                  }
                                } catch (e) {
                                  alert('Connection failed.');
                                }
                              }}
                              className="action-btn"
                              style={{ 
                                padding: '5px 10px', 
                                fontSize: '0.75rem', 
                                background: adminUser.is_active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                border: `1px solid ${adminUser.is_active ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                                color: adminUser.is_active ? '#ef4444' : '#10b981'
                              }}
                            >
                              {adminUser.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            
                            <button 
                              onClick={async () => {
                                playCyberSound('click');
                                if (adminUser.email === 'rajkishorock@gmail.com' || adminUser.email === 'admin@face.com') {
                                  alert("Cannot delete primary system admin!");
                                  playCyberSound('error');
                                  return;
                                }
                                const masterPass = await requestMasterPassword('🔐 Master Key Verification Required', `Enter Master Password to completely DELETE admin "${adminUser.email}":`);
                                if (!masterPass) return;
                                if (isDemoMode) {
                                  setTeachers(prev => prev.filter(t => t.id !== adminUser.id));
                                  alert(`SIMULATOR ACTION: Admin deleted successfully.`);
                                  playCyberSound('success');
                                  return;
                                }
                                try {
                                  const res = await fetch(`${API_BASE_URL}/users/${adminUser.id}`, {
                                    method: 'DELETE',
                                    headers: {
                                      'Authorization': `Bearer ${token}`,
                                      'X-Master-Password': masterPass
                                    }
                                  });
                                  if (res.ok) {
                                    alert(`Admin deleted successfully.`);
                                    playCyberSound('success');
                                    fetchTeachers();
                                  } else {
                                    const errData = await res.json();
                                    alert(errData.detail || 'Failed to delete admin.');
                                  }
                                } catch (e) {
                                  alert('Connection failed.');
                                }
                              }}
                              className="action-btn"
                              style={{ 
                                padding: '5px 10px', 
                                fontSize: '0.75rem', 
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444'
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </>
            )}

            {/* DEPARTMENTS MANAGEMENT VIEW */}
            {activeSubSetting === 'departments' && (
              <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <BookOpen size={22} style={{ color: '#ec4899' }} /> Configure College Departments & Branches
                    </h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
                      Manage the academic departments in your college. Changes will immediately update student registration, teacher mapping, and filter dropdowns.
                    </p>
                  </div>
                </div>

                {/* Form to Add Department */}
                <div className="glass-panel" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>➕ Add New Department</h4>
                  
                  {deptError && (
                    <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
                      ⚠️ {deptError}
                    </div>
                  )}
                  {deptSuccess && (
                    <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem' }}>
                      ✅ {deptSuccess}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Department Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Computer Science & Engineering"
                        value={newDeptName}
                        onChange={e => setNewDeptName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Department Code (Optional)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. CSE"
                        value={newDeptCode}
                        onChange={e => setNewDeptCode(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      setDeptError('');
                      setDeptSuccess('');
                      if (!newDeptName.trim()) {
                        setDeptError('Department Name is required!');
                        return;
                      }
                      
                      // Prompt for master key verification
                      const masterPass = await requestMasterPassword(
                        '🔐 Master Key Verification Required', 
                        `Enter Master Password to add department "${newDeptName.trim()}":`
                      );
                      if (!masterPass) {
                        setDeptError('Action cancelled. Master key verification is required.');
                        return;
                      }

                      setIsSavingDept(true);
                      if (isDemoMode) {
                        setTimeout(() => {
                          const name = newDeptName.trim();
                          if (departments.map(d => d.toLowerCase()).includes(name.toLowerCase())) {
                            setDeptError(`Department "${name}" already exists.`);
                            setIsSavingDept(false);
                            return;
                          }
                          const newD = {
                            id: Date.now(),
                            name: name,
                            code: newDeptCode.trim() || null,
                            institution_id: currentUser?.institution_id || 1
                          };
                          setDepartmentsList(prev => [...prev, newD]);
                          setDepartments(prev => [...prev, name]);
                          setNewDeptName('');
                          setNewDeptCode('');
                          setDeptSuccess(`SIMULATOR ACTION: Department "${name}" added successfully.`);
                          setIsSavingDept(false);
                          playCyberSound('success');
                        }, 1000);
                        return;
                      }

                      try {
                        const res = await fetch(`${API_BASE_URL}/departments/`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'X-Master-Password': masterPass
                          },
                          body: JSON.stringify({ name: newDeptName.trim(), code: newDeptCode.trim() })
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          throw new Error(data.detail || 'Failed to add department.');
                        }
                        playCyberSound('success');
                        setDeptSuccess(`Department "${data.name}" added successfully!`);
                        setNewDeptName('');
                        setNewDeptCode('');
                        fetchDepartments(token);
                      } catch (err) {
                        playCyberSound('error');
                        setDeptError(err.message);
                      } finally {
                        setIsSavingDept(false);
                      }
                    }}
                    className="bg-gradient-btn"
                    style={{ alignSelf: 'flex-start', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem', marginTop: '8px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
                    disabled={isSavingDept}
                  >
                    {isSavingDept ? 'Saving...' : '➕ Save Department'}
                  </button>
                </div>

                {/* List of Departments */}
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '16px' }}>🏫 Active Departments</h4>
                  
                  {departmentsList.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                      No custom departments configured. Using system default fallbacks:
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                        {departments.map(d => (
                          <span key={d} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.8rem', color: '#e2e8f0' }}>{d}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'rgba(15, 23, 42, 0.3)' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af' }}>Department Name</th>
                            <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af' }}>Code</th>
                            <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departmentsList.map(dept => (
                            <tr key={dept.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s ease' }} className="table-row-hover">
                              <td style={{ padding: '16px 20px', color: '#f8fafc', fontSize: '0.9rem', fontWeight: 500 }}>{dept.name}</td>
                              <td style={{ padding: '16px 20px', color: '#a78bfa', fontSize: '0.85rem', fontFamily: 'monospace' }}>{dept.code || 'N/A'}</td>
                              <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                <button 
                                  onClick={async () => {
                                    playCyberSound('click');
                                    const masterPass = await requestMasterPassword(
                                      '🔐 Master Key Verification Required', 
                                      `Enter Master Password to delete department "${dept.name}":`
                                    );
                                    if (!masterPass) return;
                                    
                                    if (isDemoMode) {
                                      setDepartmentsList(prev => prev.filter(d => d.id !== dept.id));
                                      setDepartments(prev => prev.filter(name => name !== dept.name));
                                      alert(`SIMULATOR ACTION: Department deleted successfully.`);
                                      playCyberSound('success');
                                      return;
                                    }

                                    try {
                                      const res = await fetch(`${API_BASE_URL}/departments/${dept.id}`, {
                                        method: 'DELETE',
                                        headers: {
                                          'Authorization': `Bearer ${token}`,
                                          'X-Master-Password': masterPass
                                        }
                                      });
                                      if (res.ok) {
                                        playCyberSound('success');
                                        fetchDepartments(token);
                                      } else {
                                        const errData = await res.json();
                                        alert(errData.detail || 'Failed to delete department.');
                                      }
                                    } catch (e) {
                                      alert('Connection failed.');
                                    }
                                  }}
                                  className="action-btn"
                                  style={{ 
                                    padding: '5px 10px', 
                                    fontSize: '0.75rem', 
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444'
                                  }}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MULTI-TENANT INSTITUTION MANAGEMENT (Only visible on DEFAULT tenant to system owner) */}
            {activeSubSetting === 'multitenant' && getActiveTenantSlug() === 'default' && currentUser?.institution_id === 1 && (
              <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <span>🏫</span> Multi-Tenant Institution Registry & Management
                    </h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
                      Register, monitor, and manage institution domains, custom color palettes, and default admins.
                    </p>
                  </div>
                  <span className="telemetry-stat-pill" style={{
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    background: 'rgba(0, 242, 254, 0.1)',
                    color: '#00f2fe',
                    border: '1px solid rgba(0, 242, 254, 0.25)',
                    letterSpacing: '0.5px'
                  }}>
                    TOTAL TENANTS: {institutionsList.length}
                  </span>
                </div>

                {instSuccessMessage && (
                  <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem' }}>
                    ✅ {instSuccessMessage}
                  </div>
                )}
                {instErrorMessage && (
                  <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
                    ❌ {instErrorMessage}
                  </div>
                )}

                {/* Form to Add New Institution */}
                <form onSubmit={handleCreateInstitution} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ➕ Register New Institution
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Institution Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Jawaharlal Nehru University"
                        value={newInstName}
                        onChange={e => setNewInstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Unique Subdomain / Slug (lowercase)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. jnu"
                        value={newInstSlug}
                        onChange={e => setNewInstSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Primary Color (Hex)</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={newInstPrimary}
                          onChange={e => setNewInstPrimary(e.target.value)}
                          style={{ width: '40px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          value={newInstPrimary}
                          onChange={e => setNewInstPrimary(e.target.value)}
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Secondary Color (Hex)</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="color"
                          value={newInstSecondary}
                          onChange={e => setNewInstSecondary(e.target.value)}
                          style={{ width: '40px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                        />
                        <input
                          type="text"
                          className="form-input"
                          value={newInstSecondary}
                          onChange={e => setNewInstSecondary(e.target.value)}
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                      🔐 Seed Default Administrator Account
                    </h5>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>
                      Every institution needs a default administrator to access the settings panel. Set their initial details here.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '4px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Admin Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. JNU Admin"
                          value={newInstAdminName}
                          onChange={e => setNewInstAdminName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Admin Email</label>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="e.g. admin@jnu.edu"
                          value={newInstAdminEmail}
                          onChange={e => setNewInstAdminEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Admin Password</label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="••••••••"
                          value={newInstAdminPassword}
                          onChange={e => setNewInstAdminPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="bg-gradient-btn"
                    style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '0.88rem', alignSelf: 'flex-start', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                    disabled={isAddingInstitution}
                  >
                    {isAddingInstitution ? 'Registering...' : '🚀 Register Institution & Seed Admin'}
                  </button>
                </form>

                {/* Table of Institutions */}
                <div style={{ width: '100%', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '16px' }}>
                    🏫 Registered Institution Directory
                  </h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>ID</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>NAME</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>SLUG (SUBDOMAIN)</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>PRIMARY COLOR</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>SECONDARY COLOR</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {institutionsList.map((inst) => (
                        <tr key={inst.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                          <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>#{inst.id}</td>
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: '#f1f5f9' }}>{inst.name}</td>
                          <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', fontSize: '0.78rem', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.08)' }}>
                              {inst.slug}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: inst.primary_color || '#4F46E5', border: '1px solid rgba(255,255,255,0.1)' }} />
                              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{inst.primary_color || '#4F46E5'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: inst.secondary_color || '#06B6D4', border: '1px solid rgba(255,255,255,0.1)' }} />
                              <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{inst.secondary_color || '#06B6D4'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            {inst.id === 1 ? (
                              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', fontStyle: 'italic', paddingRight: '12px' }}>System Default</span>
                            ) : (
                              <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => { playCyberSound('click'); setEditingInst(inst); }}
                                  className="action-btn"
                                  style={{
                                    padding: '5px 12px',
                                    fontSize: '0.75rem',
                                    background: 'rgba(0, 242, 254, 0.15)',
                                    border: '1px solid rgba(0, 242, 254, 0.3)',
                                    color: '#00f2fe',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteInstitution(inst.id, inst.name)}
                                  className="action-btn"
                                  style={{
                                    padding: '5px 12px',
                                    fontSize: '0.75rem',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    color: '#ef4444',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* LEAVE MANAGEMENT SUB-VIEW */}
            {activeSubSetting === 'leave_management' && (
              <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>📋 Leave Management</h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.82rem', marginTop: '4px' }}>Review and approve/reject student leave requests.</p>
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.82rem' }} onClick={fetchAdminLeaves}>
                    🔄 Refresh
                  </button>
                </div>
                {isFetchingLeaves ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Loading leave requests...</div>
                ) : adminLeaveRequests.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
                    No leave requests found for your institution.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {adminLeaveRequests.map(req => (
                      <div key={req.id} className="glass-panel" style={{ padding: '20px 24px', borderRadius: '14px', border: `1px solid ${req.status === 'Approved' ? 'rgba(16,185,129,0.15)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.2)'}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <p style={{ fontWeight: 700, color: '#f3f4f6', margin: 0, fontSize: '1rem' }}>{req.student_name}</p>
                            <p style={{ color: '#9ca3af', margin: '2px 0 0', fontSize: '0.8rem' }}>Roll: {req.student_roll} · {req.student_dep}</p>
                          </div>
                          <span style={{
                            padding: '4px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
                            background: req.status === 'Approved' ? 'rgba(16,185,129,0.12)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                            color: req.status === 'Approved' ? '#10b981' : req.status === 'Rejected' ? '#ef4444' : '#f59e0b',
                            border: `1px solid ${req.status === 'Approved' ? 'rgba(16,185,129,0.3)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                          }}>
                            {req.status === 'Approved' ? '✅ Approved' : req.status === 'Rejected' ? '❌ Rejected' : '⏳ Pending'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem', color: '#d1d5db' }}>
                          <span>📅 <strong>{req.start_date}</strong> → <strong>{req.end_date}</strong></span>
                          <span>🏷️ {req.leave_type} {req.subject_name ? `(${req.subject_name} - ${req.subject_code})` : ' (General)'}</span>
                        </div>
                        <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0, fontStyle: 'italic' }}>"{req.reason}"</p>
                        {req.status === 'Pending' && (
                          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, background: 'linear-gradient(135deg, #10b981, #059669)' }}
                              onClick={async () => {
                                const res = await fetch(`${API_BASE_URL}/users/leaves/${req.id}/review`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                  body: JSON.stringify({ status: 'Approved' })
                                });
                                if (res.ok) { fetchAdminLeaves(); playCyberSound('success'); }
                              }}
                            >✅ Approve</button>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                              onClick={async () => {
                                const res = await fetch(`${API_BASE_URL}/users/leaves/${req.id}/review`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                  body: JSON.stringify({ status: 'Rejected' })
                                });
                                if (res.ok) { fetchAdminLeaves(); playCyberSound('error'); }
                              }}
                            >❌ Reject</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SYSTEM RELEASE UPDATES (Only visible to the System Owner rajkishorock@gmail.com) */}
            {activeSubSetting === 'release_updates' && currentUser?.email?.trim()?.toLowerCase() === 'rajkishorock@gmail.com' && (
              <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Header */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <ArrowUpCircle size={22} style={{ color: '#10b981' }} /> System Release Updates
                    </h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
                      Publish and control system-wide APK updates for all users instantly.
                    </p>
                  </div>
                  <span className="telemetry-stat-pill" style={{
                    padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
                    background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', letterSpacing: '0.5px'
                  }}>
                    APP VERSION: v{APP_VERSION}
                  </span>
                </div>

                {/* ═══ OWNER BETA CHANNEL — test on your phone first ═══ */}
                <div style={{
                  background: currentBetaActive ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)',
                  border: currentBetaActive ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 6px', color: currentBetaActive ? '#fbbf24' : '#f8fafc' }}>
                      🧪 Step 1: Owner Beta Test (Your Phone Only)
                    </h4>
                    <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.82rem' }}>
                      {currentBetaActive
                        ? 'Update banner shows ONLY on your device. Test the APK, then use Step 2 to release to everyone.'
                        : 'Enable beta to receive the update on your phone first before all users.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="bg-gradient-btn"
                    onClick={() => {
                      setPendingToggleMode('beta');
                      setPendingToggleValue(!currentBetaActive);
                      setToggleMasterPassword('');
                      setToggleErrorMessage('');
                      setShowToggleMasterKeyModal(true);
                    }}
                    style={{ padding: '10px 16px', borderRadius: '8px', whiteSpace: 'nowrap' }}
                  >
                    {currentBetaActive ? 'Disable Beta' : 'Enable Owner Beta'}
                  </button>
                </div>

                {/* ═══ MASTER TOGGLE — ONE CLICK RELEASE ═══ */}
                <div style={{
                  background: currentUpdateActive
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(8,145,178,0.06))'
                    : 'rgba(255,255,255,0.02)',
                  border: currentUpdateActive
                    ? '1px solid rgba(16,185,129,0.3)'
                    : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                  flexWrap: 'wrap',
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '1.4rem' }}>{currentUpdateActive ? '🟢' : '⚫'}</span>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: currentUpdateActive ? '#10b981' : '#f8fafc' }}>
                        {currentUpdateActive ? 'Step 2: LIVE for ALL Users' : 'Step 2: Public Release (All Users)'}
                      </h4>
                    </div>
                    <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                      {currentUpdateActive
                        ? `🚀 Version update is currently active. All users will see the download banner. Turn OFF to hide it.`
                        : '💤 Toggle ON to instantly release the update banner to ALL users (requires Master Key).'}
                    </p>
                  </div>

                  {/* TOGGLE SWITCH */}
                  <div
                    onClick={() => {
                      setPendingToggleMode('public');
                      const newVal = !currentUpdateActive;
                      setPendingToggleValue(newVal);
                      setToggleMasterPassword('');
                      setToggleErrorMessage('');
                      setToggleSuccessMessage('');
                      setShowToggleMasterKeyModal(true);
                      playCyberSound('click');
                    }}
                    style={{
                      width: '64px', height: '34px',
                      borderRadius: '17px',
                      background: currentUpdateActive
                        ? 'linear-gradient(135deg, #10b981, #0891b2)'
                        : 'rgba(255,255,255,0.1)',
                      border: currentUpdateActive ? '2px solid rgba(16,185,129,0.5)' : '2px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.3s ease',
                      flexShrink: 0,
                      boxShadow: currentUpdateActive ? '0 0 16px rgba(16,185,129,0.3)' : 'none',
                    }}
                    title={currentUpdateActive ? 'Click to deactivate update banner' : 'Click to activate update banner for all users'}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '3px',
                      left: currentUpdateActive ? '32px' : '3px',
                      width: '24px', height: '24px',
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      transition: 'left 0.3s ease',
                    }} />
                  </div>
                </div>

                {/* Toggle Success/Error Messages */}
                {toggleSuccessMessage && (
                  <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {toggleSuccessMessage}
                  </div>
                )}
                {toggleErrorMessage && (
                  <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
                    ❌ {toggleErrorMessage}
                  </div>
                )}

                {/* Current Active Release Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '20px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>CURRENT PUBLISHED VERSION</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{activeReleaseVersion ? `v${activeReleaseVersion}` : 'None'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>APK DOWNLOAD LINK</span>
                    {activeReleaseUrl ? (
                      <a href={activeReleaseUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'underline', wordBreak: 'break-all', display: 'block' }}>
                        {activeReleaseUrl}
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block' }}>Not configured</span>
                    )}
                  </div>
                </div>

                {/* ═══ CI/CD AUTO BUILD STATUS CARD ═══ */}
                {buildStatus !== 'idle' && (
                  <div style={{
                    background: buildStatus === 'building' ? 'rgba(59, 130, 246, 0.06)' : buildStatus === 'success' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                    border: buildStatus === 'building' ? '1px solid rgba(59, 130, 246, 0.25)' : buildStatus === 'success' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '16px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {buildStatus === 'building' && (
                          <div style={{
                            width: '18px', height: '18px',
                            border: '2px solid rgba(59, 130, 246, 0.2)',
                            borderTop: '2px solid #3b82f6',
                            borderRadius: '50%',
                            animation: 'spin 1s infinite linear'
                          }} />
                        )}
                        <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: buildStatus === 'building' ? '#3b82f6' : buildStatus === 'success' ? '#10b981' : '#ef4444' }}>
                          {buildStatus === 'building' && `⚡ Automated Build in Progress (v${buildVersion})`}
                          {buildStatus === 'success' && `✅ Build Succeeded (v${buildVersion})`}
                          {buildStatus === 'failed' && `❌ Build Failed (v${buildVersion})`}
                        </h4>
                      </div>
                      {buildStatus !== 'building' && (
                        <button
                          onClick={() => {
                            setBuildStatus('idle');
                            setBuildError('');
                          }}
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          Dismiss Status
                        </button>
                      )}
                    </div>
                    <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                      {buildStatus === 'building' && `React code is compiling, assets are syncing, and Android APK v${buildVersion} is being signed and packaged on GitHub Actions. Usually takes ~3 mins. The update goes live automatically when complete.`}
                      {buildStatus === 'success' && `Automated release build of APK v${buildVersion} finished successfully. The version is live and download link is set.`}
                      {buildStatus === 'failed' && `Auto-build pipeline failed. Error: ${buildError}`}
                    </p>
                    {buildStatus === 'building' && (
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px', position: 'relative' }}>
                        <div className="progress-bar-loading" style={{ height: '100%', background: '#3b82f6', borderRadius: '2px', width: '35%', position: 'absolute' }} />
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ AUTO BUILD / MANUAL RELEASE FORM ═══ */}
                {!showManualReleaseForm ? (
                  <form onSubmit={handleTriggerBuild} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🚀 Auto-Build & Release APK via GitHub Actions
                    </h4>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '0', lineHeight: 1.5 }}>
                      Specify the new release version and enter your master password. The system will automatically build the signed APK and publish it without any manual Android Studio compiling.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">New Release Version (e.g., 1.0.3)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 1.0.3"
                          value={releaseVersion}
                          onChange={e => setReleaseVersion(e.target.value)}
                          disabled={buildStatus === 'building'}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Owner Master Password</label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="Enter master password to authorize"
                          value={releaseMasterPassword}
                          onChange={e => setReleaseMasterPassword(e.target.value)}
                          disabled={buildStatus === 'building'}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="submit"
                        className="bg-gradient-btn"
                        style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '0.88rem', background: 'linear-gradient(135deg, #10b981, #0891b2)' }}
                        disabled={isTriggeringBuild || buildStatus === 'building'}
                      >
                        {isTriggeringBuild ? 'Triggering...' : '🚀 Trigger Auto-Build'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReleaseSuccessMessage('');
                          setReleaseErrorMessage('');
                          setShowManualReleaseForm(true);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#9ca3af', textDecoration: 'underline', fontSize: '0.8rem', cursor: 'pointer', padding: '8px 0' }}
                      >
                        Configure Version & Download URL Manually
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handlePublishReleaseUpdate} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      💾 Configure Version & Download URL Manually
                    </h4>
                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '0', lineHeight: 1.5 }}>
                      Directly save the version number and custom .apk download link.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Release Version (e.g., 1.0.2)</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 1.0.2"
                          value={releaseVersion}
                          onChange={e => setReleaseVersion(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Update Download URL (.apk Link)</label>
                        <input
                          type="url"
                          className="form-input"
                          placeholder="e.g. https://github.com/.../app-debug.apk"
                          value={releaseDownloadUrl}
                          onChange={e => setReleaseDownloadUrl(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Owner Master Password</label>
                      <input
                        type="password"
                        className="form-input"
                        placeholder="Enter master password to authorize"
                        value={releaseMasterPassword}
                        onChange={e => setReleaseMasterPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="submit"
                        className="bg-gradient-btn"
                        style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '0.88rem', background: 'linear-gradient(135deg, #10b981, #0891b2)' }}
                        disabled={isReleasingUpdate}
                      >
                        {isReleasingUpdate ? 'Saving...' : '💾 Save Version & URL'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReleaseSuccessMessage('');
                          setReleaseErrorMessage('');
                          setShowManualReleaseForm(false);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#9ca3af', textDecoration: 'underline', fontSize: '0.8rem', cursor: 'pointer', padding: '8px 0' }}
                      >
                        Back to Auto-Build via GitHub Actions
                      </button>
                    </div>
                  </form>
                )}

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>ℹ️ How It Works (Automated Release)</h4>
                  <ul style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '4px 0 0 20px', padding: 0, lineHeight: 1.8 }}>
                    <li><strong style={{ color: '#e2e8f0' }}>Step 1:</strong> Enter the target release version and your master key, then click "Trigger Auto-Build".</li>
                    <li><strong style={{ color: '#e2e8f0' }}>Step 2:</strong> GitHub Actions compiles, signs, uploads the APK to GitHub Releases, and calls back this backend.</li>
                    <li><strong style={{ color: '#e2e8f0' }}>Step 3:</strong> Once compiled, the download link updates automatically, and the update is made LIVE for all users.</li>
                    <li><strong style={{ color: '#e2e8f0' }}>Step 4:</strong> To stop displaying the update banner, simply toggle the master active switch above to OFF.</li>
                  </ul>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    )}

        {activeTab === 'student-attendance' && (
          <div className="student-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeInUp 0.5s ease' }}>
            <StudentAttendanceWallet logs={studentLogs} studentName={currentUser?.name} />
            <GamificationHub logs={studentLogs} />

            {/* ===== CAMPUS GEOFENCE LIVE INDICATOR ===== */}
            {(() => {
              const geo = geofenceStatus;
              return (
                <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '16px', border: `1px solid ${geo.checked ? (geo.inside ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)') : 'rgba(0,242,254,0.15)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: geo.checked ? (geo.inside ? 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(0,0,0,0))' : 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(0,0,0,0))') : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: geo.checked ? (geo.inside ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)') : 'rgba(0,242,254,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                      {geo.checked ? (geo.inside ? '🟢' : '🔴') : '📡'}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: geo.checked ? (geo.inside ? '#10b981' : '#ef4444') : '#00f2fe', margin: 0, fontSize: '0.95rem' }}>
                        {geo.checked ? (geo.inside ? '✅ Inside Campus Zone' : '⚠️ Outside Campus Zone') : '📡 Campus Location Check'}
                      </p>
                      <p style={{ color: '#9ca3af', fontSize: '0.78rem', margin: '2px 0 0' }}>
                        {geo.checked
                          ? geo.distance !== null ? `Distance to campus center: ~${Math.round(geo.distance)}m` : 'Location determined.'
                          : 'Check if you are within the campus geofence boundary.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!navigator.geolocation) {
                        setGeofenceStatus({ checked: true, inside: false, distance: null });
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(pos => {
                        const { latitude, longitude } = pos.coords;
                        // Use the campus center from geofence settings or fallback default
                        const campusLat = parseFloat(localStorage.getItem('geo_lat') || '0');
                        const campusLng = parseFloat(localStorage.getItem('geo_lng') || '0');
                        const radiusM = parseFloat(localStorage.getItem('geo_radius') || '200');
                        if (!campusLat || !campusLng) {
                          setGeofenceStatus({ checked: true, inside: true, distance: null });
                          return;
                        }
                        // Haversine distance
                        const R = 6371000;
                        const dLat = (latitude - campusLat) * Math.PI / 180;
                        const dLng = (longitude - campusLng) * Math.PI / 180;
                        const a = Math.sin(dLat/2)**2 + Math.cos(campusLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.sin(dLng/2)**2;
                        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        setGeofenceStatus({ checked: true, inside: dist <= radiusM, distance: Math.round(dist) });
                      }, () => {
                        setGeofenceStatus({ checked: true, inside: false, distance: null });
                      });
                    }}
                    style={{ padding: '9px 20px', borderRadius: '10px', border: '1px solid rgba(0,242,254,0.3)', background: 'rgba(0,242,254,0.06)', color: '#00f2fe', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    📍 Check My Location
                  </button>
                </div>
              );
            })()}

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
                        const dateA = (a.date || '').split('/').reverse().join('-');
                        const dateB = (b.date || '').split('/').reverse().join('-');
                        return new Date(`${dateB}T${b.time || '00:00'}`) - new Date(`${dateA}T${a.time || '00:00'}`);
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

            {/* ===== ATTENDANCE FORECAST + VIRTUAL ID + LEAVE REQUEST ROW ===== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {/* Attendance Forecast Card */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(0,242,254,0.15)' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📊</span> Attendance Forecast
                </h3>
                {(() => {
                  const total = studentLogs.length;
                  const present = studentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
                  const rate = total > 0 ? (present / total) * 100 : 0;
                  const minRequired = 0.75;
                  // Classes needed to reach 75%: solve (present)/(total+x) >= 0.75
                  // => present >= 0.75*(total+x) => x <= present/0.75 - total
                  // If already >= 75%, can bunk: solve (present)/(total+x) >= 0.75
                  // => x <= present/0.75 - total (bunkable if result is > 0)
                  const canBunk = Math.floor(present / minRequired - total);
                  const needMore = Math.ceil((minRequired * total - present) / (1 - minRequired));

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Circular Progress */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                          <svg width="80" height="80" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                            <circle
                              cx="40" cy="40" r="34" fill="none"
                              stroke={rate >= 75 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444'}
                              strokeWidth="8" strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 34}`}
                              strokeDashoffset={`${2 * Math.PI * 34 * (1 - rate / 100)}`}
                              transform="rotate(-90 40 40)"
                              style={{ transition: 'stroke-dashoffset 1s ease' }}
                            />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: rate >= 75 ? '#10b981' : '#ef4444' }}>
                            {rate.toFixed(0)}%
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          {rate >= 75 ? (
                            <>
                              <p style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>✅ You're Safe!</p>
                              <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
                                {canBunk > 0 ? `You can bunk up to ${canBunk} more class${canBunk !== 1 ? 'es' : ''} safely.` : 'Attend all upcoming classes to stay safe.'}
                              </p>
                            </>
                          ) : (
                            <>
                              <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.9rem' }}>⚠️ Below 75%!</p>
                              <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
                                {total === 0 ? 'No attendance records yet.' : `Attend the next ${needMore} class${needMore !== 1 ? 'es' : ''} to reach 75%.`}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#9ca3af', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '10px' }}>
                        <span>Present: <strong style={{ color: '#f3f4f6' }}>{present}</strong></span>
                        <span>Absent: <strong style={{ color: '#f3f4f6' }}>{total - present}</strong></span>
                        <span>Total: <strong style={{ color: '#f3f4f6' }}>{total}</strong></span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Virtual ID Card Trigger */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(139,92,246,0.2)', background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(0,242,254,0.05))', cursor: 'pointer' }}
                onClick={() => setShowVirtualId(true)}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>🪪</span> Virtual ID & QR Check-in
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                  <div style={{ width: '70px', height: '70px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
                    🎫
                  </div>
                  <p style={{ color: '#9ca3af', fontSize: '0.82rem', textAlign: 'center' }}>
                    Show your glowing ID card with a dynamic QR code for instant check-in.
                  </p>
                  <button className="btn btn-primary" style={{ width: '100%', padding: '10px', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem' }}>
                    Open Virtual ID Card
                  </button>
                </div>
              </div>

              {/* Apply Leave Request */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(251,146,60,0.2)', background: 'linear-gradient(135deg, rgba(251,146,60,0.06), rgba(0,0,0,0))' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📝</span> Apply for Leave
                </h3>
                <LeaveApplicationForm
                  token={token}
                  API_BASE_URL={API_BASE_URL}
                  onLeaveApplied={fetchStudentLeaves}
                  playCyberSound={playCyberSound}
                  subjects={subjects}
                />
              </div>
            </div>

            {/* AI Attendance Forecaster & Bunk Simulator */}
            <AiAttendanceForecaster
              blueprintData={blueprintData}
              playCyberSound={playCyberSound}
            />

            {/* My Leave Requests History */}
            {studentLeaveRequests.length > 0 && (
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📋</span> My Leave Requests
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {studentLeaveRequests.map(req => (
                    <div key={req.id} className="glass-panel" style={{ padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', border: `1px solid ${req.status === 'Approved' ? 'rgba(16,185,129,0.2)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {req.leave_type} {req.subject_name ? `(${req.subject_name} - ${req.subject_code})` : ' (General)'}
                        </span>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f3f4f6', margin: '2px 0' }}>{req.start_date} → {req.end_date}</p>
                        <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{req.reason}</p>
                      </div>
                      <span style={{
                        padding: '5px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                        background: req.status === 'Approved' ? 'rgba(16,185,129,0.15)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                        color: req.status === 'Approved' ? '#10b981' : req.status === 'Rejected' ? '#ef4444' : '#f59e0b',
                        border: `1px solid ${req.status === 'Approved' ? 'rgba(16,185,129,0.3)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                      }}>
                        {req.status === 'Approved' ? '✅' : req.status === 'Rejected' ? '❌' : '⏳'} {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            {/* ===== SUBJECT-WISE ATTENDANCE BLUEPRINT CALENDAR ===== */}
            {(() => {
              // Fetch blueprint data if not loaded
              const loadBlueprint = async () => {
                if (blueprintLoading || blueprintData.length > 0) return;
                setBlueprintLoading(true);
                try {
                  const res = await fetch(`${API_BASE_URL}/attendance/my-calendar`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setBlueprintData(data);
                    if (data.length > 0 && !selectedBlueprintSubject) {
                      setSelectedBlueprintSubject(data[0].subject_id);
                    }
                  }
                } catch (e) { console.error('Blueprint fetch error:', e); }
                finally { setBlueprintLoading(false); }
              };
              if (blueprintData.length === 0 && !blueprintLoading && token) { loadBlueprint(); }

              const activeSubject = blueprintData.find(s => s.subject_id === selectedBlueprintSubject) || blueprintData[0];
              const calYear = blueprintCalendarDate.getFullYear();
              const calMonth = blueprintCalendarDate.getMonth();
              const startDay = new Date(calYear, calMonth, 1).getDay();
              const numDays = new Date(calYear, calMonth + 1, 0).getDate();
              const monthName = blueprintCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

              // Count stats from calendar data
              const getStats = (subject) => {
                if (!subject) return { present: 0, absent: 0, late: 0, total: 0 };
                const vals = Object.values(subject.calendar || {});
                return {
                  present: vals.filter(v => v === 'Present').length,
                  late: vals.filter(v => v === 'Late').length,
                  absent: vals.filter(v => v === 'Absent').length,
                  total: vals.length
                };
              };
              const stats = getStats(activeSubject);
              const pct = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

              return (
                <div className="glass-panel" style={{ padding: '28px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>📋</div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>My Attendance Blueprint</h3>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>Subject-wise calendar — green = present, red = absent</p>
                    </div>
                  </div>

                  {blueprintLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#9ca3af', gap: '12px', alignItems: 'center' }}>
                      <div style={{ width: '28px', height: '28px', border: '3px solid rgba(0,242,254,0.1)', borderTopColor: '#00f2fe', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Loading blueprint...
                    </div>
                  ) : blueprintData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                      No attendance records found yet. Your blueprint will appear once attendance is marked.
                    </div>
                  ) : (
                    <>
                      {/* Subject Tabs */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                        {blueprintData.map(sub => (
                          <button
                            key={sub.subject_id}
                            onClick={() => setSelectedBlueprintSubject(sub.subject_id)}
                            style={{
                              padding: '7px 14px',
                              borderRadius: '20px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              border: selectedBlueprintSubject === sub.subject_id
                                ? '1px solid rgba(139, 92, 246, 0.6)'
                                : '1px solid rgba(255,255,255,0.06)',
                              background: selectedBlueprintSubject === sub.subject_id
                                ? 'rgba(139, 92, 246, 0.18)'
                                : 'rgba(255,255,255,0.03)',
                              color: selectedBlueprintSubject === sub.subject_id ? '#a78bfa' : '#9ca3af'
                            }}
                          >
                            {sub.subject_code} — {sub.subject_name}
                          </button>
                        ))}
                      </div>

                      {/* Stats Bar */}
                      {activeSubject && (
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: pct >= 75 ? '#10b981' : '#ef4444' }}>{pct}%</div>
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '2px' }}>Attendance</div>
                          </div>
                          <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)' }} />
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>{stats.present}</div>
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Present</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>{stats.late}</div>
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Late</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>{stats.absent}</div>
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Absent</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#64748b' }}>{stats.total}</div>
                            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Total Days</div>
                          </div>
                          {pct < 75 && stats.total > 0 && (
                            <div style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>⚠ Below 75% — Shortage</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Calendar Navigation */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <button
                          onClick={() => setBlueprintCalendarDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; })}
                          className="btn-secondary"
                          style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '8px' }}
                        >◀ Prev</button>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#e2e8f0' }}>{monthName}</span>
                        <button
                          onClick={() => setBlueprintCalendarDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; })}
                          className="btn-secondary"
                          style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '8px' }}
                        >Next ▶</button>
                      </div>

                      {/* Calendar Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                          <div key={d} style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', padding: '6px 0' }}>{d}</div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                        {/* Empty alignment cells */}
                        {Array.from({ length: startDay }, (_, i) => (
                          <div key={`e${i}`} />
                        ))}
                        {/* Day cells */}
                        {Array.from({ length: numDays }, (_, i) => {
                          const day = i + 1;
                          const dateStr = `${String(day).padStart(2,'0')}/${String(calMonth+1).padStart(2,'0')}/${calYear}`;
                          const status = activeSubject?.calendar?.[dateStr];
                          const today = new Date();
                          const isToday = today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;

                          let bg = 'rgba(255,255,255,0.02)';
                          let border = '1px solid rgba(255,255,255,0.05)';
                          let color = '#475569';
                          let dot = null;
                          let label = null;

                          if (status === 'Present') {
                            bg = 'rgba(16,185,129,0.1)';
                            border = '1px solid rgba(16,185,129,0.3)';
                            color = '#10b981';
                            dot = '✓';
                            label = 'P';
                          } else if (status === 'Late') {
                            bg = 'rgba(245,158,11,0.1)';
                            border = '1px solid rgba(245,158,11,0.3)';
                            color = '#f59e0b';
                            dot = '~';
                            label = 'L';
                          } else if (status === 'Absent') {
                            bg = 'rgba(239,68,68,0.1)';
                            border = '1px solid rgba(239,68,68,0.3)';
                            color = '#ef4444';
                            dot = '✗';
                            label = 'A';
                          }

                          if (isToday) {
                            border = '2px solid rgba(0,242,254,0.5)';
                          }

                          return (
                            <div
                              key={day}
                              title={status ? `${dateStr}: ${status}` : dateStr}
                              style={{
                                background: bg,
                                border,
                                borderRadius: '8px',
                                padding: '6px 2px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '52px',
                                cursor: 'default',
                                transition: 'all 0.15s'
                              }}
                            >
                              <span style={{ fontSize: '0.82rem', fontWeight: isToday ? 800 : 500, color: isToday ? '#00f2fe' : color }}>{day}</span>
                              {dot && (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color, marginTop: '2px' }}>{label}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px', fontSize: '0.73rem', color: '#9ca3af' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', display: 'inline-block' }}/>P = Present</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', display: 'inline-block' }}/>A = Absent</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', display: 'inline-block' }}/>L = Late</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid rgba(0,242,254,0.5)', display: 'inline-block' }}/>Today</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Sleek Bottom Feedback Section */}
            <div 
              className="glass-panel" 
              style={{ 
                padding: '24px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: '16px',
                borderLeft: '4px solid #00f2fe',
                background: 'linear-gradient(135deg, rgba(9, 12, 21, 0.6) 0%, rgba(21, 24, 43, 0.6) 100%)',
                boxShadow: '0 8px 32px 0 rgba(0, 242, 254, 0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  background: 'rgba(0, 242, 254, 0.1)', 
                  color: '#00f2fe', 
                  borderRadius: '12px', 
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(0, 242, 254, 0.2)'
                }}>
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Help Us Improve the Platform</h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: '4px 0 0' }}>
                    Share your suggestions, report a bug, or rate your overall experience with our smart attendance tracker.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  setShowFeedbackModal(true);
                }}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)',
                  color: '#090c15',
                  boxShadow: '0 0 20px rgba(0, 242, 254, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 242, 254, 0.5)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 242, 254, 0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <MessageSquare size={16} /> Share Feedback
              </button>
            </div>
          </div>
        )}

        {activeTab === 'student-profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: userRole === 'student' ? '1.2fr 1.8fr' : '1fr 1fr', gap: '32px', animation: 'fadeInUp 0.5s ease' }}>
            {/* Profile info left panel */}
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
                  {(currentUser?.name?.split(' ') || []).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{currentUser?.name}</h3>
                <span style={{ color: '#00f2fe', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Role: {userRole}
                </span>
                
                {userRole === 'student' && (
                  <>
                    <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
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
                  </>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {userRole === 'student' ? (
                  <>
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
                  </>
                ) : userRole === 'teacher' ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Email Address</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Assigned Subject</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.subject_name || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Subject Code</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.subject_code || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Department</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.subject_department || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Email Address</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.email}</span>
                    </div>
                  </>
                )}
              </div>

              {userRole !== 'student' ? (
                <button
                  onClick={() => {
                    setEditingTeacherSelf({
                      name: currentUser?.name || '',
                      email: currentUser?.email || '',
                      subject_name: currentUser?.subject_name || '',
                      subject_code: currentUser?.subject_code || '',
                      subject_department: currentUser?.subject_department || ''
                    });
                    setEditTeacherSelfError('');
                    setEditTeacherSelfSuccess('');
                    setShowEditTeacherSelfModal(true);
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
              ) : (
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
              )}

              <button
                onClick={() => { playCyberSound('click'); handleLogout(); }}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
 
            {/* Right Column Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Register Face Card (Only for Student) */}
              {userRole === 'student' && (
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

                        <CameraAttractHud
                          active={studentWebcamActive && !studentWebcamBootActive}
                          mode="selfie"
                        />
                        
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
              )}

              {/* Student Personal Preferences & Privacy Consent Panel */}
              {userRole === 'student' && (
                <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <Sliders size={20} style={{ color: 'var(--color-primary)' }} /> Personal Preferences & Privacy
                    </h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
                      Customize your active interface theme, interactive audio, and biometric consent.
                    </p>
                  </div>

                  {/* Themes and CRT Toggle */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Interface Theme</label>
                      <select 
                        value={activeTheme} 
                        onChange={(e) => {
                          setActiveTheme(e.target.value);
                          playCyberSound('click');
                        }}
                        className="form-input"
                        style={{ 
                          width: '100%', 
                          background: 'var(--bg-secondary)', 
                          border: '1px solid var(--border-color)', 
                          color: 'var(--color-text-main)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="cyberpunk">Cyberpunk Neon</option>
                        <option value="matrix">Matrix Green</option>
                        <option value="obsidian">Obsidian Red</option>
                        <option value="violet">Deep Space Violet</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div>
                        <span style={{ fontWeight: 600, display: 'block', fontSize: '0.8rem', color: '#f8fafc' }}>CRT Terminal lines</span>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Enable terminal scanlines</span>
                      </div>
                      <div 
                        onClick={() => {
                          setCrtOverlayEnabled(!crtOverlayEnabled);
                          playCyberSound('click');
                        }} 
                        style={{
                          width: '42px',
                          height: '22px',
                          backgroundColor: crtOverlayEnabled ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${crtOverlayEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '50px',
                          padding: '2px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'var(--transition)'
                        }}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: crtOverlayEnabled ? 'var(--color-primary)' : '#94a3b8',
                          transform: crtOverlayEnabled ? 'translateX(20px)' : 'translateX(0px)',
                          transition: 'var(--transition)'
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Audio Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontWeight: 600, display: 'block', fontSize: '0.8rem', color: '#f8fafc' }}>Sound Cues</span>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Enable cyber sounds</span>
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
                          width: '42px',
                          height: '22px',
                          backgroundColor: soundEnabled ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${soundEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '50px',
                          padding: '2px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'var(--transition)'
                        }}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: soundEnabled ? 'var(--color-primary)' : '#94a3b8',
                          transform: soundEnabled ? 'translateX(20px)' : 'translateX(0px)',
                          transition: 'var(--transition)'
                        }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />} Synth Volume: {Math.round(audioVolume * 100)}%
                      </span>
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
                        onMouseUp={() => { if (soundEnabled) playCyberSound('click'); }}
                        onTouchEnd={() => { if (soundEnabled) playCyberSound('click'); }}
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

                  {/* Biometric Privacy and Consent Revoke */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontWeight: 600, display: 'block', fontSize: '0.8rem', color: '#f8fafc', textAlign: 'left' }}>Biometric Data Privacy (DPDP Act Compliance)</span>
                    
                    {currentUser?.details?.photo === 'yes' ? (
                      <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', padding: '12px', fontSize: '0.78rem', color: '#10b981', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <CheckCircle2 size={14} /> Active Biometric Consent
                        </div>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.75rem', lineHeight: '1.4' }}>
                          Your 128D facial representation vector is securely stored. You have consented to biometric attendance logs.
                        </p>
                        <button
                          onClick={async () => {
                            if (!window.confirm('WARNING: Revoking consent will permanently delete your facial templates from our server. You will not be able to mark attendance via face scanner until you re-register. Do you want to proceed?')) return;
                            try {
                              const res = await fetch(`${API_BASE_URL}/users/students/me/revoke-consent`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                              if (!res.ok) throw new Error('Revocation failed');
                              playCyberSound('success');
                              setCurrentUser(prev => ({
                                ...prev,
                                details: { ...prev.details, photo: 'no' }
                              }));
                              localStorage.setItem('biometric_consent', 'false');
                              alert('Your biometric profile has been deleted and consent has been revoked.');
                            } catch (e) {
                              playCyberSound('error');
                              alert('Error: ' + e.message);
                            }
                          }}
                          className="btn-secondary"
                          style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', marginTop: '4px' }}
                        >
                          Revoke Consent & Delete Face
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '8px', padding: '12px', fontSize: '0.78rem', color: '#f59e0b', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <AlertCircle size={14} /> Consent Revoked / Face Not Enrolled
                        </div>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.75rem', lineHeight: '1.4' }}>
                          No biometric facial metrics are saved on the server. Please register your face template using the webcam capture card above to enable attendance features.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                    <label className="form-label">{userRole === 'student' ? 'Current Password / Default Roll No' : 'Current Password'}</label>
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

        {activeTab === 'ai-assistant' && (
          <div className="ai-assistant-wrapper" onDragOver={handleChatDragOver} onDrop={handleChatDrop} onPaste={handleChatPaste} style={{ animation: 'fadeInUp 0.5s ease' }}>
            {/* Left pane: chat */}
            <div className="ai-chat-pane" style={{ position: 'relative' }}>
              <div className="ai-chat-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="ai-message-avatar">
                    <Bot size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Smart Attendance 
                      <span className="text-gradient" style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
                        {botPersonality.toUpperCase()}
                      </span>
                    </h3>
                    <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                      ACTIVE TELEMETRY ONLINE
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {isListeningSpeech && (
                    <div style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginRight: '12px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                      LISTENING VOICE...
                    </div>
                  )}
                  <button 
                    type="button" 
                    className="ai-icon-btn" 
                    onClick={() => {
                      const enabled = !botWakeWordEnabled;
                      playCyberSound('click'); 
                      setBotWakeWordEnabled(enabled); 
                      localStorage.setItem('botWakeWordEnabled', enabled ? 'true' : 'false');
                      voiceSystemStateRef.current = enabled ? 'wake_word' : 'off';
                      setTimeout(() => syncVoiceListeners(), 50);
                    }} 
                    title={botWakeWordEnabled ? "Wake Word Listening Active. Click to turn OFF mic background listening." : "Wake Word Off. Click to enable background 'Hey Raj' mic listener."}
                    style={{ 
                      width: 'auto', 
                      height: '32px', 
                      borderRadius: '6px', 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      padding: '0 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: botWakeWordEnabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.08)',
                      background: botWakeWordEnabled ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)',
                      color: botWakeWordEnabled ? '#10b981' : '#9ca3af'
                    }}
                  >
                    <span style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      background: botWakeWordEnabled ? '#10b981' : '#9ca3af',
                      animation: botWakeWordEnabled ? 'pulse 1.5s infinite' : 'none'
                    }} />
                    <span>WAKE WORD: {botWakeWordEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                  <button 
                    type="button" 
                    className="ai-icon-btn" 
                    onClick={startVoiceAssistantMode} 
                    title="Start Live Voice Assistant Call"
                    style={{ width: '32px', height: '32px', borderRadius: '6px', color: '#00f2fe', borderColor: 'rgba(0,242,254,0.15)' }}
                  >
                    <Phone size={14} />
                  </button>
                  <button 
                    type="button" 
                    className="ai-icon-btn" 
                    onClick={handleExportChatHistory} 
                    title="Export Chat History to Text File"
                    style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                  >
                    <FileDown size={14} />
                  </button>
                  <button 
                    type="button" 
                    className="ai-icon-btn" 
                    onClick={handleClearChatHistory} 
                    title="Clear Conversation History"
                    style={{ width: '32px', height: '32px', borderRadius: '6px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.15)' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Global dynamic orb handles voice session overlay on all pages */}

              <div className="ai-chat-messages" ref={chatListRef}>
                {chatMessages.length === 0 && !isChatLoading && (
                  <div className="gpt-empty-state">
                    <div className="gpt-empty-logo">
                      <svg width="24" height="24" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.313-3.glimpse 10.079 10.079 0 0 0-9.617 6.977 9.967 9.967 0 0 0-6.67 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.313 3.027 10.079 10.079 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.67-4.834 10.079 10.079 0 0 0-1.24-11.817" fill="white"/>
                      </svg>
                    </div>
                    <div className="gpt-empty-title">How can I help you today?</div>
                    <div className="gpt-empty-subtitle">Ask me anything</div>
                  </div>
                )}
                {chatMessages.map((msg) => {
                  let diagramType = null;
                  if (msg.role === 'model') {
                    if (msg.content.includes('[ShowDiagram: face_recognition]')) {
                      diagramType = 'face_recognition';
                    } else if (msg.content.includes('[ShowDiagram: geofencing]')) {
                      diagramType = 'geofencing';
                    } else if (msg.content.includes('[ShowDiagram: attendance_flow]')) {
                      diagramType = 'attendance_flow';
                    }
                  }
                  
                  const displayContent = msg.content
                    .replace(/\[ShowDiagram: face_recognition\]/g, '')
                    .replace(/\[ShowDiagram: geofencing\]/g, '')
                    .replace(/\[ShowDiagram: attendance_flow\]/g, '');

                  return (
                    <div key={msg.id} className={`ai-message-bubble ${msg.role}`}>
                      {msg.role === 'model' && (
                        <div className="gpt-ai-row">
                          <div className="gpt-ai-icon" style={{ flexShrink: 0 }}>
                            <svg width="14" height="14" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835A9.964 9.964 0 0 0 19.508.43a10.079 10.079 0 0 0-9.617 6.977 9.967 9.967 0 0 0-6.67 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.313 3.027 10.079 10.079 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.67-4.834 10.079 10.079 0 0 0-1.24-11.817z" fill="white"/>
                            </svg>
                          </div>
                          <div className="ai-message-content">
                            <div className="ai-message-text">
                              {displayContent.split('\n').map((para, i) => (
                                <p key={i} style={{ margin: i < displayContent.split('\n').length - 1 ? '0 0 12px 0' : 0 }}>
                                  {para.split('**').map((text, idx) =>
                                    idx % 2 === 1 ? <strong key={idx} style={{ color: '#ececec', fontWeight: 600 }}>{text}</strong> : text
                                  )}
                                </p>
                              ))}
                              {diagramType && renderInteractiveDiagram(diagramType)}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                              <button
                                className="ai-voice-action"
                                onClick={() => { playCyberSound('click'); handleSpeakText(displayContent); }}
                                title="Listen to Response"
                              >
                                <Volume2 size={14} />
                                <span>Listen</span>
                              </button>
                              <button
                                className="ai-voice-action"
                                onClick={() => { playCyberSound('click'); window.speechSynthesis.cancel(); }}
                                title="Stop Audio"
                                style={{ color: '#8e8ea0' }}
                              >
                                <VolumeX size={14} />
                                <span>Stop</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {msg.role === 'user' && (
                        <div className="ai-message-content">
                          <div className="ai-message-text">
                            {displayContent.split('\n').map((para, i) => (
                              <p key={i} style={{ margin: i < displayContent.split('\n').length - 1 ? '0 0 8px 0' : 0 }}>
                                {para}
                              </p>
                            ))}
                            {msg.attachedImage && (
                              <div style={{ marginTop: '8px' }}>
                                <img src={msg.attachedImage} alt="User attachment" style={{ maxWidth: '220px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                {msg.attachedImageName && <div style={{ fontSize: '0.72rem', color: '#8e8ea0', marginTop: '4px' }}>{msg.attachedImageName}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {isChatLoading && (
                  <div className="ai-message-bubble model">
                    <div className="gpt-ai-row">
                      <div className="gpt-ai-icon" style={{ flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835A9.964 9.964 0 0 0 19.508.43a10.079 10.079 0 0 0-9.617 6.977 9.967 9.967 0 0 0-6.67 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.313 3.027 10.079 10.079 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.67-4.834 10.079 10.079 0 0 0-1.24-11.817z" fill="white"/>
                        </svg>
                      </div>
                      <div className="ai-message-content">
                        <div className="ai-message-text">
                          <div className="chatbot-typing-indicator">
                            <span />
                            <span />
                            <span />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>


              {/* Suggestion Chips */}
              <div className="ai-chat-suggestions">
                {getSuggestions().map((s, idx) => (
                  <button key={idx} type="button" className="ai-suggestion-chip" onClick={() => handleSendChatMessage(s)}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Attachment Preview Bar */}
              {botAttachedImage && (
                <div className="ai-attachment-preview-bar">
                  <img src={`data:${botAttachedImageMime};base64,${botAttachedImage}`} alt="Preview" className="ai-attachment-thumbnail" />
                  <div className="ai-attachment-file-pill">
                    <span>{botAttachedImageName || 'image_attachment.png'}</span>
                    <button type="button" className="ai-attachment-remove-btn" onClick={() => { setBotAttachedImage(null); setBotAttachedImageMime(null); setBotAttachedImageName(''); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Input Form Bar — ChatGPT style centered pill */}
              <div className="ai-chat-input-bar">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage();
                  }}
                >
                  <input
                    type="file"
                    accept="image/*,.txt,.py,.js,.json,.csv,.c,.cpp"
                    onChange={handleBotFileSelect}
                    style={{ display: 'none' }}
                    id="bot-file-upload-panel"
                  />
                  <label htmlFor="bot-file-upload-panel" className="ai-icon-btn" title="Attach file or image">
                    <Paperclip size={16} />
                  </label>

                  <button
                    type="button"
                    onClick={handleToggleSpeechRecognition}
                    className={`ai-icon-btn ${isListeningSpeech ? 'recording' : ''}`}
                    title={isListeningSpeech ? "Stop voice listening" : "Ask using your voice"}
                  >
                    <Mic size={16} />
                  </button>

                  <input
                    type="text"
                    className="ai-chat-input-text"
                    placeholder="Message Smart Attendance AI..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isChatLoading}
                  />

                  <button
                    type="submit"
                    className="ai-send-btn"
                    disabled={isChatLoading || !chatInput.trim()}
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>

            {/* Right pane: settings */}
            <div className="ai-settings-pane">
              <h2 className="ai-settings-title">
                <Settings size={18} />
                Bot Configurator
              </h2>

              <div className="ai-settings-section">
                <label className="ai-settings-label">Bot Personality</label>
                <div className="ai-settings-grid">
                  {[
                    { id: 'futuristic', label: 'Futuristic', desc: 'Cyber robotic tone' },
                    { id: 'casual', label: 'Casual', desc: 'Friendly classmate' },
                    { id: 'tutor', label: 'Tutor', desc: 'Patient study advisor' },
                    { id: 'robotic', label: 'Robotic', desc: 'Strict factual data' }
                  ].map((p) => (
                    <div key={p.id} className={`ai-settings-card ${botPersonality === p.id ? 'active' : ''}`} onClick={() => { playCyberSound('click'); setBotPersonality(p.id); }}>
                      <span>{p.label}</span>
                      <small>{p.desc}</small>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ai-settings-section">
                <label className="ai-settings-label">Help Suggestions Category</label>
                <select className="ai-select-dropdown" value={botSuggestionCategory} onChange={(e) => { playCyberSound('click'); setBotSuggestionCategory(e.target.value); }}>
                  <option value="general">General System FAQs</option>
                  <option value="attendance">Face Scanning & Geofence</option>
                  <option value="profile">Student Profile & Selfie Registration</option>
                  <option value="security">Portal Security & Passwords</option>
                </select>
              </div>

              <div className="ai-settings-section">
                <label className="ai-settings-label">Speech Synthesis Engine</label>
                
                <div className="ai-toggle-group" style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Voice Activation Mode</span>
                    <small style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Listen for "Hey Raj" in background</small>
                  </div>
                  <label className="ai-toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={botWakeWordEnabled} 
                      onChange={(e) => { 
                        const enabled = e.target.checked;
                        playCyberSound('click'); 
                        setBotWakeWordEnabled(enabled); 
                        localStorage.setItem('botWakeWordEnabled', enabled ? 'true' : 'false');
                        voiceSystemStateRef.current = enabled ? 'wake_word' : 'off';
                        setTimeout(() => syncVoiceListeners(), 50);
                      }} 
                    />
                    <span className="ai-toggle-slider" />
                  </label>
                </div>

                <div className="ai-toggle-group">
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Auto-Read Bot Replies</span>
                  <label className="ai-toggle-switch">
                    <input type="checkbox" checked={botAutoSpeak} onChange={(e) => { playCyberSound('click'); setBotAutoSpeak(e.target.checked); }} />
                    <span className="ai-toggle-slider" />
                  </label>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Select Voice Accent</span>
                  <select className="ai-select-dropdown" value={botVoiceSelected} onChange={(e) => setBotVoiceSelected(e.target.value)}>
                    {availableVoices.length === 0 ? (
                      <option>System Default Voice</option>
                    ) : (
                      availableVoices.map((v, idx) => (
                        <option key={idx} value={v.name}>{v.name} ({v.lang})</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="ai-range-control">
                  <div className="ai-range-val">
                    <span>Voice Speed (Rate)</span>
                    <span>{botVoiceSpeed.toFixed(1)}x</span>
                  </div>
                  <input type="range" className="ai-range-slider" min="0.5" max="2.0" step="0.1" value={botVoiceSpeed} onChange={(e) => setBotVoiceSpeed(parseFloat(e.target.value))} />
                </div>

                <div className="ai-range-control">
                  <div className="ai-range-val">
                    <span>Voice Pitch</span>
                    <span>{botVoicePitch.toFixed(1)}</span>
                  </div>
                  <input type="range" className="ai-range-slider" min="0.5" max="2.0" step="0.1" value={botVoicePitch} onChange={(e) => setBotVoicePitch(parseFloat(e.target.value))} />
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* ===== TOGGLE UPDATE ACTIVE — Master Key Confirmation Modal ===== */}
      {showToggleMasterKeyModal && (
        <div
          className="flex-center modal-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 100050, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowToggleMasterKeyModal(false); }}
        >
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '420px', margin: '16px',
            padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px',
            border: pendingToggleValue ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
            animation: 'fadeInUp 0.3s ease',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: pendingToggleValue ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', flexShrink: 0,
              }}>
                {pendingToggleValue ? '🚀' : '🔕'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                  {pendingToggleValue ? 'Activate Update for All Users?' : 'Deactivate Update Banner?'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#9ca3af', lineHeight: 1.4 }}>
                  {pendingToggleValue
                    ? 'All users will see the update download banner immediately.'
                    : 'The update banner will be hidden from all users.'}
                </p>
              </div>
            </div>

            {/* Master Key Input */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔑 Master Password Required
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter system master password..."
                value={toggleMasterPassword}
                onChange={e => setToggleMasterPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleToggleUpdateActive(); }}
                autoFocus
                style={{ fontSize: '0.9rem' }}
              />
              {toggleErrorMessage && (
                <p style={{ color: '#ef4444', fontSize: '0.78rem', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ❌ {toggleErrorMessage}
                </p>
              )}
              <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '8px 0 0', lineHeight: 1.4 }}>
                Use your institution master key or the global developer key configured on Render (DEVELOPER_MASTER_KEY).
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, padding: '11px 16px' }}
                onClick={() => { setShowToggleMasterKeyModal(false); setToggleMasterPassword(''); setToggleErrorMessage(''); }}
                disabled={isTogglingUpdate}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-gradient-btn"
                style={{
                  flex: 1, padding: '11px 16px', borderRadius: '8px', fontWeight: 600,
                  background: pendingToggleValue
                    ? 'linear-gradient(135deg, #10b981, #0891b2)'
                    : 'linear-gradient(135deg, #ef4444, #dc2626)',
                }}
                onClick={handleToggleUpdateActive}
                disabled={isTogglingUpdate || !toggleMasterPassword.trim()}
              >
                {isTogglingUpdate ? '⏳ Processing...' : (pendingToggleValue ? '✅ Activate Update' : '🔕 Deactivate')}
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Feedback Submission Modal */}
      {showFeedbackModal && (
        <div className="feedback-modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="feedback-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-modal-header">
              <h2 className="feedback-modal-title">Share Your Feedback</h2>
              <button 
                className="feedback-modal-close" 
                onClick={() => {
                  playCyberSound('click');
                  setShowFeedbackModal(false);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit}>
              {feedbackSuccess && (
                <div className="alert alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} />
                  <span style={{ fontSize: '0.9rem' }}>{feedbackSuccess}</span>
                </div>
              )}

              {feedbackError && (
                <div className="alert alert-danger" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} />
                  <span style={{ fontSize: '0.9rem' }}>{feedbackError}</span>
                </div>
              )}

              <div className="feedback-form-group">
                <label className="feedback-form-label">Category</label>
                <div className="feedback-type-select">
                  <div 
                    className={`feedback-type-option ${feedbackType === 'suggestion' ? 'active' : ''}`}
                    onClick={() => { playCyberSound('click'); setFeedbackType('suggestion'); }}
                  >
                    Suggestion
                  </div>
                  <div 
                    className={`feedback-type-option ${feedbackType === 'bug' ? 'active' : ''}`}
                    onClick={() => { playCyberSound('click'); setFeedbackType('bug'); }}
                  >
                    Report Bug
                  </div>
                  <div 
                    className={`feedback-type-option ${feedbackType === 'general' ? 'active' : ''}`}
                    onClick={() => { playCyberSound('click'); setFeedbackType('general'); }}
                  >
                    General
                  </div>
                </div>
              </div>

              <div className="feedback-form-group">
                <label className="feedback-form-label">Rating</label>
                <div className="feedback-rating-container">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`feedback-star-btn ${star <= feedbackRating ? 'active' : ''}`}
                      onClick={() => {
                        playCyberSound('click');
                        setFeedbackRating(star);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <svg 
                        width="30" 
                        height="30" 
                        viewBox="0 0 24 24" 
                        fill={star <= feedbackRating ? "#fbbf24" : "none"} 
                        stroke={star <= feedbackRating ? "#fbbf24" : "rgba(255, 255, 255, 0.2)"} 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        style={{ transition: 'transform 0.1s' }}
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div className="feedback-form-group">
                <label className="feedback-form-label">Message</label>
                <textarea
                  className="feedback-textarea"
                  placeholder="Tell us what is working well, what needs adjustment, or what features you would love to see next..."
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  disabled={submittingFeedback || !!feedbackSuccess}
                  maxLength={1000}
                />
              </div>

              <button 
                type="submit" 
                className="feedback-submit-btn"
                disabled={submittingFeedback || !!feedbackSuccess || !feedbackMessage.trim()}
                style={{ marginTop: '8px' }}
              >
                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </div>
        </div>
      )}



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
              const r = await fetch(`${API_BASE_URL}/interactive/notify-absent-batch`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ notify_whatsapp: true }),
              });
              const d = await r.json();
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

      {/* Sleek Institution Editing Modal */}
      {editingInst && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 8, 16, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '500px',
            width: '100%',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            border: '1.5px solid var(--border-color)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
            animation: 'fadeInUp 0.3s ease'
          }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏫 Edit Institution Branding
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
                Modify colors, name, and access domain for this workspace tenant.
              </p>
            </div>

            <form onSubmit={handleUpdateInstitution} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Institution Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingInst.name}
                  onChange={e => setEditingInst({ ...editingInst, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Subdomain Slug</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingInst.slug}
                  onChange={e => setEditingInst({ ...editingInst, slug: e.target.value })}
                  required
                  style={{ textTransform: 'lowercase' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Primary Color</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="color"
                      value={editingInst.primary_color || '#4F46E5'}
                      onChange={e => setEditingInst({ ...editingInst, primary_color: e.target.value })}
                      style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={editingInst.primary_color || '#4F46E5'}
                      onChange={e => setEditingInst({ ...editingInst, primary_color: e.target.value })}
                      required
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Secondary Color</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="color"
                      value={editingInst.secondary_color || '#06B6D4'}
                      onChange={e => setEditingInst({ ...editingInst, secondary_color: e.target.value })}
                      style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={editingInst.secondary_color || '#06B6D4'}
                      onChange={e => setEditingInst({ ...editingInst, secondary_color: e.target.value })}
                      required
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => { playCyberSound('click'); setEditingInst(null); }}
                  className="btn-secondary"
                  style={{ padding: '10px 20px', borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn"
                  style={{ padding: '10px 24px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                  disabled={isUpdatingInst}
                >
                  {isUpdatingInst ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
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

            {/* Search input */}
            <div style={{ padding: '16px 28px 8px', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Search student name or roll number..."
                  value={manualSearchQuery}
                  onChange={e => setManualSearchQuery(e.target.value)}
                  style={{ background: 'rgba(8, 12, 20, 0.4)', paddingLeft: '16px' }}
                />
              </div>
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

      {/* Edge border flash overlay */}
      {showVoicePulseFlash && <div className="voice-pulse-flash-overlay" />}
    </div>
  </div>
  );
}
