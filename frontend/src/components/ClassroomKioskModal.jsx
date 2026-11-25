import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ClassroomKiosk.css';
import { Lock, Camera } from 'lucide-react';
import { enterpriseApi } from '../api/enterpriseApi';
import { addToOfflineQueue } from '../utils/offlineQueue';

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

    let cancelled = false;
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
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
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
      cancelled = true;
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
    setScanStatus(studentData.newly_marked === false ? 'Already checked in' : 'Attendance recorded');
    playCyberSound('success');
    speakGreeting(studentData.name);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    if (onStudentCheckedIn && studentData.newly_marked !== false) {
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
    if (!isOpen || showExitPinModal) return;

    const tick = (timestamp) => {
      if (
        !isProcessingRef.current &&
        !activeStudent &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        videoRef.current.videoWidth > 0
      ) {
        // Run recognition tick every 1000ms
        if (timestamp - lastCaptureTimeRef.current >= 2100) {
          lastCaptureTimeRef.current = timestamp;

          try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext('2d');
              const targetW = 640;
              const targetH = Math.round((video.videoHeight / video.videoWidth) * targetW) || 480;
              if (canvas.width !== targetW) canvas.width = targetW;
              if (canvas.height !== targetH) canvas.height = targetH;
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
                    const match = data.results.find(item => !item.staged_for_review);
                    if (!match) { setScanStatus('Match needs staff review.'); return; }
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
                  } else {
                    setScanStatus('No match yet. Face the camera in good light.');
                  }
                } catch (apiErr) {
                  setScanStatus(apiErr.message || 'Connection unavailable. Retrying…');
                  if (apiErr.status === 429) lastCaptureTimeRef.current = performance.now() + 58000;
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
  }, [isOpen, showExitPinModal, activeStudent, selectedSubjectId, sessionDate, sessionPeriod, token, handleStudentVerified]);

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
        setScanStatus('Card saved on this device. Sync pending.');
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
        setScanStatus('Card saved on this device. Sync pending.');
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
    <div className="class-kiosk" role="dialog" aria-modal="true" aria-label="Classroom check-in">
      <header><div><small>{kioskConfig?.institution_name || currentUser?.institution_name}</small><h2>Classroom check-in</h2></div>
        <button onClick={() => setShowExitPinModal(true)}><Lock size={16}/> Exit</button></header>
      <div className="class-kiosk-body">
        <div className="class-kiosk-preview"><video ref={videoRef} autoPlay playsInline muted/><i aria-hidden="true"/><canvas hidden ref={canvasRef}/></div>
        <section><small>{sessionPeriod} · {clock}</small><h3>Face the camera</h3><p>Stand inside the guide and wait for your name.</p>
          <div className="class-kiosk-result" role="status"><Camera size={19}/><div><strong>{activeStudent?.name || scanStatus}</strong>
          {activeStudent && <p>{scanStatus} · {activeStudent.roll}</p>}</div></div>
          <form onSubmit={handleRfidSubmit}><label htmlFor="kiosk-reader">Card reader</label>
          <input id="kiosk-reader" ref={rfidInputRef} value={rfidInput} onChange={e => setRfidInput(e.target.value)} placeholder="Tap a registered card" autoComplete="off"/>
          <button disabled={!rfidInput.trim() || isProcessing}>Check in card</button></form>
        </section>
      </div>
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
            border: '1px solid #e4dfd5',
            color: '#25231f'
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

            <p style={{ color: '#696358', fontSize: '0.85rem', margin: '0 0 16px', lineHeight: '1.4' }}>
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
                  border: '2px solid #cfc8ba',
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
                    border: '1px solid #cfc8ba',
                    background: '#ffffff',
                    color: '#58534a',
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

    </div>
  );
}
