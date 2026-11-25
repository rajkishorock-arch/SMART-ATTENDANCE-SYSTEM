import React from 'react';
import { SwitchCamera, X, ScanLine } from 'lucide-react';
import './QrScanner.css';

export default function QrScannerModal({ token, API_BASE_URL, selectedSubjectId, onClose, onStudentCheckedIn, playCyberSound, addDiagnosticLog }) {
  const [errorMsg, setErrorMsg] = React.useState('');
  const [successStudent, setSuccessStudent] = React.useState(null);
  const [errorDetails, setErrorDetails] = React.useState('');
  const [devices, setDevices] = React.useState([]);
  const [activeDeviceId, setActiveDeviceId] = React.useState('');
  const [camera, setCamera] = React.useState('');
  const [opening, setOpening] = React.useState(true);
  const decoder = React.useRef(null);

  const [statusText, setStatusText] = React.useState('Scanning...');
  
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const isProcessingRef = React.useRef(false);
  const lastScanTimeRef = React.useRef(0);
  const requestRef = React.useRef(null);
  const cooldownTimerRef = React.useRef(null);

  React.useEffect(() => {
    let active = true;
    import('jsqr').then(module => { if (active) decoder.current = module.default; })
      .catch(() => { if (active) setErrorMsg('Scanner could not load. Close and reopen it.'); });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    let active = true;
    let stream;
    async function open() {
      setOpening(true);
      setErrorMsg('');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
          ...(activeDeviceId ? { deviceId: { exact: activeDeviceId } } : { facingMode: { ideal: 'environment' } }),
          width: { ideal: 1280 }, height: { ideal: 720 }
        } });
        if (!active) { stream.getTracks().forEach(track => track.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        setCamera(stream.getVideoTracks()[0].getSettings().deviceId || activeDeviceId);
        setOpening(false);
        const inputs = await navigator.mediaDevices.enumerateDevices();
        if (active) setDevices(inputs.filter(device => device.kind === 'videoinput'));
      } catch {
        if (active) { setOpening(false); setErrorMsg('Camera unavailable. Check camera access or select another camera.'); }
      }
    }
    open();
    return () => { active = false; stream?.getTracks().forEach(track => track.stop()); };
  }, [activeDeviceId]);

  const [isProcessing, setIsProcessing] = React.useState(false);

  const startCooldown = React.useCallback((durationMs) => {
    clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      setSuccessStudent(null);
      setErrorDetails('');
      setStatusText('Ready to scan');
      isProcessingRef.current = false;
      setIsProcessing(false);
    }, durationMs);
  }, []);

  const handleQrScanned = React.useCallback(async (qrData) => {
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
  }, [token, API_BASE_URL, selectedSubjectId, playCyberSound, onStudentCheckedIn, addDiagnosticLog, startCooldown]);

  // Frame decoding loop
  React.useEffect(() => {
    const tick = (time) => {
      if (!isProcessingRef.current && decoder.current && videoRef.current?.videoWidth && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (time - lastScanTimeRef.current >= 90) {
          lastScanTimeRef.current = time;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // OPTIMIZED: Capture full viewport with correct aspect ratio instead of distorting to square crop box
            const targetWidth = Math.min(960, video.videoWidth);
            const scale = targetWidth / video.videoWidth;
            const targetHeight = Math.round(video.videoHeight * scale);

            if (canvas.width !== targetWidth) canvas.width = targetWidth;
            if (canvas.height !== targetHeight) canvas.height = targetHeight;

            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

            if (decoder.current) {
              const code = decoder.current(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
              });
              if (code && code.data && !isProcessingRef.current) {
                isProcessingRef.current = true;
                setIsProcessing(true);
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
  }, [handleQrScanned]);

  React.useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  const flip = () => {
    const index = devices.findIndex(device => device.deviceId === camera);
    setActiveDeviceId(devices[(index + 1) % devices.length].deviceId);
  };

  return (
    <div className="qr-camera-overlay">
      <section className="qr-camera" role="dialog" aria-modal="true" aria-labelledby="qr-camera-title">
        <header><ScanLine aria-hidden="true"/><h2 id="qr-camera-title">Scan student ID</h2>
          {devices.length > 1 && <button type="button" disabled={opening} onClick={flip} aria-label="Flip camera" title="Flip camera"><SwitchCamera size={21} aria-hidden="true"/></button>}
          <button onClick={onClose} aria-label="Close scanner"><X/></button></header>
        <div className="qr-camera-preview">
          <video ref={videoRef} autoPlay muted playsInline/>
          <div className="qr-camera-guide" aria-hidden="true"/>
          <canvas ref={canvasRef} hidden/>
        </div>
        <div className="qr-camera-controls">
          <div role="status"><strong>{errorMsg ? 'Camera unavailable' : opening ? 'Opening camera…' : statusText}</strong>
          <p>{errorMsg || errorDetails || (successStudent ? [successStudent.name, successStudent.roll].join(' · ') :
            isProcessing ? 'Checking attendance…' : 'Hold the student’s live QR code inside the frame.')}</p></div>
        </div>
        {devices.length > 2 && <label className="qr-camera-picker">Camera<select value={camera} onChange={e => setActiveDeviceId(e.target.value)}>
          {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || 'Camera ' + (index + 1)}</option>)}
        </select></label>}
      </section>
    </div>
  );
}
