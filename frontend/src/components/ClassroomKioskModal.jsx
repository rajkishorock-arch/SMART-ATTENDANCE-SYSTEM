import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, ShieldCheck, Lock, Maximize2, Minimize2, CheckCircle2, User, RefreshCw, X, Radio, Volume2 } from 'lucide-react';
import { enterpriseApi } from '../api/enterpriseApi';

export default function ClassroomKioskModal({
  isOpen,
  onClose,
  token,
  currentUser,
  selectedSubjectId,
  sessionDate,
  sessionPeriod,
  onStudentCheckedIn,
  playCyberSound = () => {},
  addDiagnosticLog = () => {}
}) {
  const [clock, setClock] = useState('');
  const [kioskConfig, setKioskConfig] = useState(null);
  const [scanStatus, setScanStatus] = useState('Looking for student faces...');
  const [activeStudent, setActiveStudent] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rfidInput, setRfidInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Security Exit PIN Lock
  const [showExitPinModal, setShowExitPinModal] = useState(false);
  const [exitPin, setExitPin] = useState('');
  const [pinError, setPinError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const rfidInputRef = useRef(null);
  const lastCaptureTimeRef = useRef(0);

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Kiosk Configuration
  useEffect(() => {
    if (isOpen) {
      enterpriseApi.getKioskConfig(token)
        .then(res => setKioskConfig(res))
        .catch(err => console.error('Kiosk config fetch error:', err));
    }
  }, [isOpen, token]);

  // Request Fullscreen on open
  useEffect(() => {
    if (isOpen) {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        }
      } catch (err) {}
    }
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isOpen]);

  // Start Camera Stream
  useEffect(() => {
    if (!isOpen) return;

    let activeStream = null;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        activeStream = stream;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Kiosk camera init error:', err);
        setScanStatus('Camera unavailable. Tap RFID / Smart Card to check-in.');
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isOpen]);

  // Voice Speech Synthesizer Greeting
  const speakGreeting = useCallback((studentName) => {
    if ('speechSynthesis' in window && studentName) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`Welcome, ${studentName}`);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('Speech synthesis error:', e);
      }
    }
  }, []);

  // Handle Successful Identification
  const handleStudentVerified = useCallback((studentData) => {
    setActiveStudent(studentData);
    setScanStatus(`Verified: ${studentData.name}`);
    playCyberSound('success');
    speakGreeting(studentData.name);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    if (onStudentCheckedIn) {
      onStudentCheckedIn(studentData);
    }
    addDiagnosticLog?.(`KIOSK RECOGNIZED: ${studentData.name} (${studentData.roll}) marked Present.`);

    // Keep splash for 2.8 seconds, then resume scanning
    setTimeout(() => {
      setActiveStudent(null);
      setScanStatus('Looking for student faces...');
      if (rfidInputRef.current) rfidInputRef.current.focus();
    }, 2800);
  }, [onStudentCheckedIn, playCyberSound, speakGreeting, addDiagnosticLog]);

  // Frame Capture / Face Recognition Tick
  useEffect(() => {
    if (!isOpen) return;

    const tick = async (timestamp) => {
      if (
        !isProcessing &&
        !activeStudent &&
        videoRef.current &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        // Run recognition every 900ms
        if (timestamp - lastCaptureTimeRef.current >= 900) {
          lastCaptureTimeRef.current = timestamp;

          try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              canvas.width = 480;
              canvas.height = 360;
              ctx.drawImage(video, 0, 0, 480, 360);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

              setIsProcessing(true);
              const res = await enterpriseApi.recognizeFrame(token, {
                image: dataUrl,
                subject_id: selectedSubjectId ? parseInt(selectedSubjectId) : null,
              });

              if (res && res.recognized && res.student) {
                handleStudentVerified({
                  name: res.student.name,
                  roll: res.student.roll,
                  department: res.student.dep || res.student.department,
                  time: res.time || new Date().toLocaleTimeString(),
                  photo: res.student.photo || res.student.profile_pic,
                  streak_days: res.student.streak_days || 0,
                  newly_marked: res.newly_marked
                });
              }
            }
          } catch (err) {
            // Silently continue scanning loop
          } finally {
            setIsProcessing(false);
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isProcessing, activeStudent, selectedSubjectId, handleStudentVerified]);

  // Process RFID / Barcode Card Tap inside Kiosk
  const handleRfidSubmit = async (e) => {
    e.preventDefault();
    const clean = rfidInput.trim();
    if (!clean) return;

    try {
      setIsProcessing(true);
      const res = await enterpriseApi.markRfidAttendance(token, {
        card_id: clean,
        roll: clean,
        subject_id: selectedSubjectId ? parseInt(selectedSubjectId) : null,
        custom_date: sessionDate || null,
      });

      setRfidInput('');
      handleStudentVerified({
        name: res.name,
        roll: res.roll,
        department: res.department,
        time: res.time,
        photo: res.photo,
        streak_days: res.streak_days || 0,
        newly_marked: res.newly_marked
      });
    } catch (err) {
      playCyberSound('error');
      setScanStatus(`Card not recognized: ${clean}`);
      setRfidInput('');
      setTimeout(() => setScanStatus('Looking for student faces...'), 2500);
    } finally {
      setIsProcessing(false);
    }
  };

  // Exit Verification
  const handleVerifyExitPin = (e) => {
    e.preventDefault();
    // Default PIN: 1234 or "admin" or institutional PIN
    if (exitPin === '1234' || exitPin.toLowerCase() === 'admin' || exitPin === '9999') {
      setShowExitPinModal(false);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      onClose();
    } else {
      setPinError('Incorrect Staff Passcode. Default PIN: 1234');
      playCyberSound('error');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0f1d',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      color: '#ffffff',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Hidden RFID Input Wedge to keep focus active */}
      <form onSubmit={handleRfidSubmit} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        <input
          ref={rfidInputRef}
          type="text"
          value={rfidInput}
          onChange={(e) => setRfidInput(e.target.value)}
          autoFocus
        />
      </form>

      {/* Top Kiosk Bar */}
      <div style={{
        padding: '16px 28px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Institution Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            fontWeight: 900
          }}>
            🏛️
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.02em', color: '#ffffff' }}>
              {kioskConfig?.institution_name || 'Academic Institution'} — Autonomous Kiosk
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#94a3b8' }}>
              <span>{sessionPeriod || 'Standard Period'}</span>
              <span>•</span>
              <span style={{ color: '#38bdf8' }}>AI Facial Recognition + NFC Ready</span>
            </div>
          </div>
        </div>

        {/* Live Digital Clock & Exit Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.06)',
            padding: '8px 18px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '1.2rem',
            fontWeight: 800,
            fontFamily: 'monospace',
            letterSpacing: '0.08em',
            color: '#38bdf8'
          }}>
            {clock}
          </div>

          <button
            onClick={() => setShowExitPinModal(true)}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Lock size={15} /> Exit Kiosk
          </button>
        </div>
      </div>

      {/* Main Kiosk Viewport */}
      <div style={{
        flex: 1,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#030712'
      }}>
        {/* Fullscreen Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)' // Mirror for intuitive alignment
          }}
        />

        {/* Holographic Face Alignment Guide (Optical Oval) */}
        {!activeStudent && (
          <div style={{
            position: 'absolute',
            width: '320px',
            height: '420px',
            borderRadius: '50%',
            border: '3px solid rgba(56, 189, 248, 0.7)',
            boxShadow: '0 0 35px rgba(56, 189, 248, 0.3), inset 0 0 25px rgba(56, 189, 248, 0.2)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Animated Laser Scan Line */}
            <div style={{
              position: 'absolute',
              top: '15%',
              width: '80%',
              height: '3px',
              background: 'linear-gradient(to right, transparent, #38bdf8, transparent)',
              boxShadow: '0 0 15px #38bdf8',
              animation: 'kioskLaser 2.2s infinite ease-in-out'
            }} />
          </div>
        )}

        {/* Status Pill on Bottom of Stream */}
        <div style={{
          position: 'absolute',
          bottom: '36px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '12px 28px',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: activeStudent ? '#10b981' : '#38bdf8',
            boxShadow: `0 0 10px ${activeStudent ? '#10b981' : '#38bdf8'}`
          }} />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.02em' }}>
            {scanStatus}
          </span>
          <span style={{ color: '#64748b' }}>|</span>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
            Hold face in guide OR tap Smart NFC / RFID card
          </span>
        </div>

        {/* Student Verified Splash Card (Pop-up on Identification) */}
        {activeStudent && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeInUp 0.3s ease'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '40px',
              maxWidth: '480px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)',
              border: '2px solid #86efac'
            }}>
              <div style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                background: '#f0fdf4',
                border: '4px solid #10b981',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {activeStudent.photo ? (
                  <img src={activeStudent.photo} alt={activeStudent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={48} color="#059669" />
                )}
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#dcfce7',
                color: '#15803d',
                padding: '4px 14px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 800,
                marginBottom: '10px'
              }}>
                <CheckCircle2 size={16} /> ATTENDANCE VERIFIED
              </div>

              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#064e3b', margin: '0 0 6px' }}>
                {activeStudent.name}
              </h2>

              <p style={{ color: '#047857', fontSize: '1rem', fontWeight: 600, margin: '0 0 16px' }}>
                Roll: {activeStudent.roll} • {activeStudent.department}
              </p>

              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-around',
                fontSize: '0.85rem',
                color: '#475569'
              }}>
                <span>Time: <strong>{activeStudent.time}</strong></span>
                <span>Streak: <strong>🔥 {activeStudent.streak_days || 1} Days</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Staff Exit Passcode PIN Modal */}
      {showExitPinModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            maxWidth: '420px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
            border: '1px solid #e2e8f0',
            color: '#0f172a'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: '#fee2e2', color: '#ef4444' }}>
                  <Lock size={22} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Exit Kiosk Mode</h3>
              </div>
              <button
                onClick={() => { setShowExitPinModal(false); setPinError(''); setExitPin(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 16px', lineHeight: '1.5' }}>
              Enter staff passcode to unlock the tablet and terminate the autonomous session.
            </p>

            <form onSubmit={handleVerifyExitPin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="password"
                value={exitPin}
                onChange={(e) => { setExitPin(e.target.value); setPinError(''); }}
                placeholder="Enter Staff Passcode (Default: 1234)..."
                autoFocus
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '2px solid #cbd5e1',
                  fontSize: '1rem',
                  outline: 'none',
                  textAlign: 'center',
                  letterSpacing: '0.1em'
                }}
              />

              {pinError && (
                <span style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center' }}>
                  {pinError}
                </span>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => { setShowExitPinModal(false); setPinError(''); setExitPin(''); }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Verify & Exit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded CSS for Kiosk Scanning Animation */}
      <style>{`
        @keyframes kioskLaser {
          0% { top: 18%; opacity: 0.3; }
          50% { top: 78%; opacity: 0.9; }
          100% { top: 18%; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
