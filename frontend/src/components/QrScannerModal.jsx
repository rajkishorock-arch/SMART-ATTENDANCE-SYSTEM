import React from 'react';

export default function QrScannerModal({ token, API_BASE_URL, selectedSubjectId, subjects, onClose, onStudentCheckedIn, playCyberSound, addDiagnosticLog }) {
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
                inversionAttempts: "attemptBoth",
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
