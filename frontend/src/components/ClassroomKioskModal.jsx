import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, ShieldCheck, Lock, CheckCircle2, User, RefreshCw, X, Radio, Volume2, WifiOff } from 'lucide-react';
import { enterpriseApi } from '../api/enterpriseApi';
import { addToOfflineQueue, syncOfflineQueue } from '../utils/offlineQueue';

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
  const isProcessingRef = useRef(false);

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
          document.documentElement.requestFullscreen().catch(() => {});
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
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        activeStream = stream;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error('Kiosk camera init error:', err);
        setScanStatus('Camera access denied. Please allow camera permissions or tap RFID card.');
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

  // Voice Greeting Synthesizer
  const speakGreeting = useCallback((studentName) => {
    if ('speechSynthesis' in window && studentName) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`Welcome, ${studentName}`);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('Speech error:', e);
      }
    }
  }, []);

  // Successful Student Recognition
  const handleStudentVerified = useCallback((studentData) => {
    setActiveStudent(studentData);
    setScanStatus(`Verified: ${studentData.name}`);
    playCyberSound('success');
    speakGreeting(studentData.name);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    if (onStudentCheckedIn) {
      onStudentCheckedIn(studentData);
    }
    addDiagnosticLog?.(`KIOSK VERIFIED: ${studentData.name} (${studentData.roll}) marked Present.`);

    // Show splash for 2.8 seconds, then resume scanning
    setTimeout(() => {
      setActiveStudent(null);
      setScanStatus('Looking for student faces...');
      if (rfidInputRef.current) rfidInputRef.current.focus();
    }, 2800);
  }, [onStudentCheckedIn, playCyberSound, speakGreeting, addDiagnosticLog]);

  // Facial Recognition Loop (Captures Blob via FormData)
  useEffect(() => {
    if (!isOpen) return;

    const tick = (timestamp) => {
      if (
        !isProcessingRef.current &&
        !activeStudent &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        videoRef.current.videoWidth > 0
      ) {
        // Run recognition tick every 1000ms
        if (timestamp - lastCaptureTimeRef.current >= 1000) {
          lastCaptureTimeRef.current = timestamp;

          try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              const targetW = 640;
              const targetH = Math.round((video.videoHeight / video.videoWidth) * targetW) || 480;
              canvas.width = targetW;
              canvas.height = targetH;
              ctx.drawImage(video, 0, 0, targetW, targetH);

              canvas.toBlob(async (blob) => {
                if (!blob || isProcessingRef.current) return;
                isProcessingRef.current = true;
                setIsProcessing(true);

                try {
                  const formData = new FormData();
                  formData.append('file', blob, 'kiosk_frame.jpg');

                  const data = await enterpriseApi.recognizeFrame(token, formData, {
                    subject_id: selectedSubjectId ? parseInt(selectedSubjectId) : undefined,
                    custom_date: sessionDate || undefined,
                    custom_time: sessionPeriod || undefined,
                  });

                  if (data && data.results && data.results.length > 0) {
                    const match = data.results[0];
                    handleStudentVerified({
                      id: match.user_id || match.student_id,
                      name: match.name,
                      roll: match.roll,
                      department: match.department || match.dep || 'Registered Student',
                      time: match.time || new Date().toLocaleTimeString(),
                      photo: match.photo || match.profile_pic || null,
                      streak_days: match.streak_days || 1,
                      newly_marked: match.newly_marked !== false,
                    });
                  }
                } catch (apiErr) {
                  // Network or frame error - continue gracefully
                } finally {
                  isProcessingRef.current = false;
                  setIsProcessing(false);
                }
              }, 'image/jpeg', 0.82);
            }
          } catch (frameErr) {
            isProcessingRef.current = false;
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
  }, [isOpen, activeStudent, selectedSubjectId, sessionDate, sessionPeriod, token, handleStudentVerified]);

  // RFID / Card Tap Handler (Supports Offline Queue)
  const handleRfidSubmit = async (e) => {
    e.preventDefault();
    const clean = rfidInput.trim();
    if (!clean) return;

    try {
      setIsProcessing(true);

      if (!navigator.onLine) {
        addToOfflineQueue({
          roll: clean,
          subject_id: selectedSubjectId ? parseInt(selectedSubjectId) : null,
          method: 'OFFLINE_KIOSK_RFID',
          timestamp: new Date().toISOString()
        });
        setRfidInput('');
        handleStudentVerified({
          name: `Roll ${clean}`,
          roll: clean,
          department: 'Queued Offline (Local)',
          time: new Date().toLocaleTimeString(),
          photo: null,
          streak_days: 1,
          newly_marked: true
        });
        addDiagnosticLog?.(`OFFLINE QUEUE: Roll ${clean} saved to local storage.`);
        return;
      }

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
      if (!navigator.onLine || err.message?.includes('network') || err.message?.includes('Failed to fetch')) {
        addToOfflineQueue({
          roll: clean,
          subject_id: selectedSubjectId ? parseInt(selectedSubjectId) : null,
          method: 'OFFLINE_KIOSK_RFID',
          timestamp: new Date().toISOString()
        });
        setRfidInput('');
        handleStudentVerified({
          name: `Roll ${clean}`,
          roll: clean,
          department: 'Queued Offline (Network Drop)',
          time: new Date().toLocaleTimeString(),
          photo: null,
          streak_days: 1,
          newly_marked: true
        });
        return;
      }
      playCyberSound('error');
      setScanStatus(`Card not mapped: ${clean}`);
      setRfidInput('');
      setTimeout(() => setScanStatus('Looking for student faces...'), 2500);
    } finally {
      setIsProcessing(false);
    }
  };

  // Staff Exit PIN Verification
  const handleVerifyExitPin = (e) => {
    e.preventDefault();
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

      {/* Hidden RFID Input Wedge */}
      <form onSubmit={handleRfidSubmit} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
        <input
          ref={rfidInputRef}
          type="text"
          value={rfidInput}
          onChange={(e) => setRfidInput(e.target.value)}
          autoFocus
        />
      </form>

      {/* Top Kiosk Bar (Responsive for Mobile & Desktop) */}
      <header style={{
        padding: '12px 16px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px 12px',
        backdropFilter: 'blur(10px)',
        zIndex: 10
      }}>
        {/* Institution Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 auto' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            fontWeight: 900,
            flexShrink: 0
          }}>
            🏛️
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{
              margin: 0,
              fontSize: '0.95rem',
              fontWeight: 800,
              letterSpacing: '0.01em',
              color: '#ffffff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '220px'
            }}>
              {kioskConfig?.institution_name || 'Academic Institution'}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
              <span>{sessionPeriod || 'Active Slot'}</span>
              <span>•</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>AI Kiosk Mode</span>
            </div>
          </div>
        </div>

        {/* Digital Clock & Exit Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontSize: '0.9rem',
            fontWeight: 800,
            fontFamily: 'monospace',
            letterSpacing: '0.04em',
            color: '#38bdf8',
            whiteSpace: 'nowrap'
          }}>
            {clock}
          </div>

          <button
            type="button"
            onClick={() => setShowExitPinModal(true)}
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              color: '#fca5a5',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Lock size={13} /> Exit
          </button>
        </div>
      </header>

      {/* Main Kiosk Viewport (Full Coverage on Mobile & Desktop) */}
      <main style={{
        flex: 1,
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: '#030712'
      }}>
        {/* Full Viewport Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)' // Mirror image for natural user interaction
          }}
        />

        {/* Holographic Face Guide (Centered & Responsively Sized) */}
        {!activeStudent && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(280px, 72vw)',
            height: 'min(380px, 50vh)',
            borderRadius: '50%',
            border: '3px solid rgba(56, 189, 248, 0.75)',
            boxShadow: '0 0 35px rgba(56, 189, 248, 0.35), inset 0 0 25px rgba(56, 189, 248, 0.2)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Animated Laser Scanning Beam */}
            <div style={{
              position: 'absolute',
              top: '20%',
              width: '80%',
              height: '3px',
              background: 'linear-gradient(to right, transparent, #38bdf8, transparent)',
              boxShadow: '0 0 15px #38bdf8',
              animation: 'kioskLaser 2.2s infinite ease-in-out'
            }} />
          </div>
        )}

        {/* Bottom Status Notification Pill */}
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'max-content',
          maxWidth: '92vw',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '10px 20px',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
          zIndex: 5,
          boxSizing: 'border-box'
        }}>
          <div style={{
            width: '10px',
            height: '100%',
            minWidth: '10px',
            minHeight: '10px',
            borderRadius: '50%',
            background: activeStudent ? '#10b981' : (isProcessing ? '#eab308' : '#38bdf8'),
            boxShadow: `0 0 10px ${activeStudent ? '#10b981' : (isProcessing ? '#eab308' : '#38bdf8')}`,
            flexShrink: 0
          }} />
          <span style={{
            fontSize: '0.88rem',
            fontWeight: 700,
            color: '#f8fafc',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {isProcessing ? 'Verifying facial signature...' : scanStatus}
          </span>
        </div>

        {/* Student Verification Splash Modal (Full Pop-up on match) */}
        {activeStudent && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            padding: '16px',
            animation: 'fadeInUp 0.3s ease'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '32px 24px',
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
              border: '2px solid #86efac'
            }}>
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: '#f0fdf4',
                border: '4px solid #10b981',
                margin: '0 auto 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {activeStudent.photo ? (
                  <img src={activeStudent.photo} alt={activeStudent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={44} color="#059669" />
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
                fontSize: '0.78rem',
                fontWeight: 800,
                marginBottom: '10px'
              }}>
                <CheckCircle2 size={15} /> ATTENDANCE RECORDED
              </div>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#064e3b', margin: '0 0 6px' }}>
                {activeStudent.name}
              </h2>

              <p style={{ color: '#047857', fontSize: '0.92rem', fontWeight: 600, margin: '0 0 16px' }}>
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
      </main>

      {/* Staff Exit Passcode PIN Modal */}
      {showExitPinModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.82)',
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
            maxWidth: '380px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
            border: '1px solid #e2e8f0',
            color: '#0f172a'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: '#fee2e2', color: '#ef4444' }}>
                  <Lock size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Exit Kiosk Mode</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowExitPinModal(false); setPinError(''); setExitPin(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 16px', lineHeight: '1.4' }}>
              Enter staff passcode to exit kiosk mode. (Default PIN: <strong>1234</strong>)
            </p>

            <form onSubmit={handleVerifyExitPin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="password"
                value={exitPin}
                onChange={(e) => { setExitPin(e.target.value); setPinError(''); }}
                placeholder="Enter Staff PIN..."
                autoFocus
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '2px solid #cbd5e1',
                  fontSize: '1.1rem',
                  outline: 'none',
                  textAlign: 'center',
                  letterSpacing: '0.2em'
                }}
              />

              {pinError && (
                <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
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

      {/* Embedded CSS for Laser Scanning Animation */}
      <style>{`
        @keyframes kioskLaser {
          0% { top: 18%; opacity: 0.3; }
          50% { top: 78%; opacity: 0.95; }
          100% { top: 18%; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
