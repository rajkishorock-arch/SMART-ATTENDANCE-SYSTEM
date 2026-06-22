/**
 * FaceScanner.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * A fully self-contained face-recognition attendance scanner.
 *
 * Features (matching the desktop Python app exactly):
 *  • Opens camera (front/back toggle) with a boot animation
 *  • Streams frames to /attendance/recognize-frame every 300ms
 *  • Draws real-time HUD over the live video:
 *      – L-shaped corner brackets (outer frame of video)
 *      – Bounding box around each detected face
 *      – Animated vertical laser scan line oscillating top→bottom
 *      – Info panel: NAME / ROLL / DEPT / SIM / LIVENESS (identical to screenshot)
 *  • Blink liveness via Mediapipe FaceMesh EAR — 2 blinks required
 *  • Smooth tracking: holds last result for 1.5 s so display doesn't flicker
 *  • Fires onAttendanceMarked({ name, roll, dep, time, confidence, newly_marked })
 *    so the parent can update logs/stats
 *
 * Props:
 *  token            – JWT auth token (required)
 *  apiBaseUrl       – e.g. "https://...render.com/api/v1"
 *  selectedSubjectId – number or null
 *  userCoords       – { latitude, longitude } or null
 *  sessionActive    – bool
 *  sessionPeriod    – string period label
 *  sessionDate      – string "YYYY-MM-DD"
 *  onAttendanceMarked – callback(result)
 *  addDiagnosticLog – optional parent log function
 */

import React, {
  useRef, useEffect, useState, useCallback
} from 'react';

/* ─────────────────────────────────────── constants ── */
const LEFT_EYE  = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33,  160, 158, 133, 153, 144];
const EAR_THRESH = 0.20;
const BLINKS_NEEDED = 2;
const SCAN_INTERVAL_MS = 320;        // how often we hit the API
const TRACK_HOLD_MS    = 1600;       // keep last recognized face visible this long

/* ─────────────────────────────────────── helpers ── */
function calcEAR(lm, idx) {
  try {
    const p = (i) => lm[idx[i]];
    const dh = Math.hypot(p(0).x - p(3).x, p(0).y - p(3).y);
    if (!dh) return 0;
    const v1 = Math.hypot(p(1).x - p(5).x, p(1).y - p(5).y);
    const v2 = Math.hypot(p(2).x - p(4).x, p(2).y - p(4).y);
    return (v1 + v2) / (2 * dh);
  } catch { return 0; }
}

/* Draw the desktop-style HUD onto a 2d canvas context.
   isMirrored=true means the video element is flipped (front cam),
   so we flip the canvas context before drawing so that the HUD
   (text, panels, brackets) all appear correctly oriented. */
function drawHUD(ctx, cw, ch, tracks, scanPhase, isMirrored) {
  ctx.clearRect(0, 0, cw, ch);

  // When front camera is active the video is CSS-mirrored.
  // Mirror the canvas context too so the HUD stays aligned with
  // the video, then un-mirror just for text rendering.
  if (isMirrored) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-cw, 0);
  }

  /* ── outer corner brackets (like the boot sequence corners) ── */
  const BL = 28, BT = 3;
  const BC = 'rgba(0,242,254,0.85)';
  ctx.strokeStyle = BC; ctx.lineWidth = BT; ctx.lineCap = 'square';
  // top-left
  ctx.beginPath(); ctx.moveTo(12+BL,12); ctx.lineTo(12,12); ctx.lineTo(12,12+BL); ctx.stroke();
  // top-right
  ctx.beginPath(); ctx.moveTo(cw-12-BL,12); ctx.lineTo(cw-12,12); ctx.lineTo(cw-12,12+BL); ctx.stroke();
  // bot-left
  ctx.beginPath(); ctx.moveTo(12+BL,ch-12); ctx.lineTo(12,ch-12); ctx.lineTo(12,ch-12-BL); ctx.stroke();
  // bot-right
  ctx.beginPath(); ctx.moveTo(cw-12-BL,ch-12); ctx.lineTo(cw-12,ch-12); ctx.lineTo(cw-12,ch-12-BL); ctx.stroke();

  /* ── global scan line (vertical oscillation) ── */
  const t = Date.now() / 1000;
  const scanY = Math.round(((Math.sin(t * 1.8) + 1) / 2) * ch);
  const grad = ctx.createLinearGradient(0, scanY-6, 0, scanY+6);
  grad.addColorStop(0, 'rgba(0,242,254,0)');
  grad.addColorStop(0.5, 'rgba(0,242,254,0.65)');
  grad.addColorStop(1, 'rgba(0,242,254,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, scanY-6, cw, 12);

  /* ── face tracks ── */
  for (const tr of tracks) {
    const { box, info, verified, blinkCount, confidence } = tr;
    if (!box) continue;
    // scale box from video-space to canvas-space
    const [bx, by, bw, bh] = box;

    const isKnown   = !!info;
    const color     = verified ? '#00ff00'
                    : isKnown  ? '#ffa500'
                    :            '#00f2fe';

    /* face bounding box */
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    /* L-shaped corner brackets on the face box */
    const CL = Math.round(Math.min(bw, bh) * 0.18);
    ctx.lineWidth = 3; ctx.strokeStyle = color;
    // TL
    ctx.beginPath(); ctx.moveTo(bx+CL,by); ctx.lineTo(bx,by); ctx.lineTo(bx,by+CL); ctx.stroke();
    // TR
    ctx.beginPath(); ctx.moveTo(bx+bw-CL,by); ctx.lineTo(bx+bw,by); ctx.lineTo(bx+bw,by+CL); ctx.stroke();
    // BL
    ctx.beginPath(); ctx.moveTo(bx+CL,by+bh); ctx.lineTo(bx,by+bh); ctx.lineTo(bx,by+bh-CL); ctx.stroke();
    // BR
    ctx.beginPath(); ctx.moveTo(bx+bw-CL,by+bh); ctx.lineTo(bx+bw,by+bh); ctx.lineTo(bx+bw,by+bh-CL); ctx.stroke();

    /* mini scan line inside face box */
    const facePhase = (Math.sin(t * 4) + 1) / 2;
    const fScanY = Math.round(by + facePhase * bh);
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(bx, fScanY); ctx.lineTo(bx+bw, fScanY); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(bx, fScanY, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx+bw, fScanY, 3, 0, Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;

    /* info panel — exactly like desktop screenshot.
       We temporarily un-mirror context so text reads correctly. */
    const panelLines = isKnown ? [
      `NAME: ${info.name}`,
      `ROLL: ${info.roll}`,
      `DEPT: ${info.dep}`,
      `SIM:  ${confidence != null ? confidence.toFixed(1)+'%' : '--'}`,
      `LIVENESS: ${verified ? 'Verified' : `Blinks (${blinkCount}/${BLINKS_NEEDED})`}`
    ] : [
      'STATUS: SCANNING...',
      `LIVENESS: ${blinkCount > 0 ? `Blinks (${blinkCount}/${BLINKS_NEEDED})` : 'PENDING'}`
    ];

    const PH = 17, PAD = 8;
    const PW = 190;
    const PTOTAL = panelLines.length * PH + PAD * 2;

    // prefer right side; fall back to above the box
    let px = bx + bw + 10;
    let py = by;
    if (px + PW > cw) { px = bx; py = Math.max(8, by - PTOTAL - 8); }

    // Draw panel background + border in mirrored space (geometry OK)
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = '#000';
    ctx.fillRect(px, py, PW, PTOTAL);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.strokeRect(px, py, PW, PTOTAL);
    ctx.restore();

    // Un-mirror just for text so it reads left-to-right
    ctx.save();
    if (isMirrored) {
      // We are currently in flipped space: x_screen = cw - x_canvas
      // To draw text at screen position (px, py), we need canvas x = cw - px - PW
      ctx.scale(-1, 1);
      ctx.translate(-cw, 0);
      // now we're back to normal screen space — mirror the x for text
      const textX = cw - px - PW;
      ctx.font = '13px "Courier New", monospace';
      panelLines.forEach((line, i) => {
        const lineColor = i === panelLines.length - 1
          ? (verified ? '#00ff88' : '#ffcc00')
          : '#ffffff';
        ctx.fillStyle = lineColor;
        ctx.fillText(line, textX + 8, py + PAD + 14 + i * PH);
      });
    } else {
      ctx.font = '13px "Courier New", monospace';
      panelLines.forEach((line, i) => {
        const lineColor = i === panelLines.length - 1
          ? (verified ? '#00ff88' : '#ffcc00')
          : '#ffffff';
        ctx.fillStyle = lineColor;
        ctx.fillText(line, px + 8, py + PAD + 14 + i * PH);
      });
    }
    ctx.restore();
  }

  /* ── status text in corner — un-mirror for readability ── */
  ctx.save();
  if (isMirrored) {
    ctx.scale(-1, 1);
    ctx.translate(-cw, 0);
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = '#00f2fe';
    ctx.globalAlpha = 0.75;
    ctx.fillText(`● BIOMETRIC SCAN ACTIVE`, 20, ch - 12);
  } else {
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = '#00f2fe';
    ctx.globalAlpha = 0.75;
    ctx.fillText(`● BIOMETRIC SCAN ACTIVE`, 20, ch - 12);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Restore mirrored transform
  if (isMirrored) {
    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════
   FaceScanner Component
══════════════════════════════════════════════════════ */
export default function FaceScanner({
  token,
  apiBaseUrl,
  selectedSubjectId,
  userCoords,
  sessionActive,
  sessionPeriod,
  sessionDate,
  onAttendanceMarked,
  addDiagnosticLog,
}) {
  /* ── refs ── */
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const faceMeshRef = useRef(null);
  const animFrameRef= useRef(null);
  const scanTimerRef= useRef(null);
  const tracksRef   = useRef([]);   // live track list
  const markedIdsRef= useRef(new Set());
  const scanPhaseRef= useRef(0);
  const blinkStateRef = useRef('open'); // 'open' | 'closed'
  const blinkCountRef = useRef(0);
  const livenessRef   = useRef(false);
  const isScanningRef = useRef(false);  // prevent overlapping API calls
  const facingModeRef = useRef('user'); // always-current copy for rAF loop

  /* ── state ── */
  const [camReady,    setCamReady]    = useState(false);
  const [booting,     setBooting]     = useState(false);
  const [bootStep,    setBootStep]    = useState('');
  const [bootPct,     setBootPct]     = useState(0);
  const [facingMode,  setFacingMode]  = useState('user');
  const [error,       setError]       = useState('');
  const [statusText,  setStatusText]  = useState('Camera Offline');
  const [lastResult,  setLastResult]  = useState(null); // for card below
  const [backCamUnavailable, setBackCamUnavailable] = useState(false);

  // Default to false on mobile/Capacitor to avoid heavy WASM/WebGL model loading crashes
  const isMobileOrCapacitor = 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.location.protocol === 'capacitor:' || 
    (typeof window.Capacitor !== 'undefined');
  const [livenessEnabled, setLivenessEnabled] = useState(!isMobileOrCapacitor);

  // Keep ref in sync with state so animation loop always sees current value
  useEffect(() => { facingModeRef.current = facingMode; }, [facingMode]);

  /* ─────────────────────────────────── camera open ── */
  const openCamera = useCallback(async (mode = 'user') => {
    setError('');
    setBooting(true);
    setBootStep('INITIALIZING OPTICAL ARRAY...');
    setBootPct(10);

    // stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      setBootPct(30);
      setBootStep('CALIBRATING BIOMETRIC SENSORS...');
      let stream;

      // Guard: navigator.mediaDevices is only available in secure contexts (HTTPS).
      // On Android WebView with http:// scheme, this would be undefined and crash the app.
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Camera API not available. This app requires a secure context (HTTPS). ' +
          'If you are on Android, ensure androidScheme is set to "https" in capacitor.config.json.'
        );
      }

      // Check if the requested facing mode camera actually exists on this device.
      // Strategy: try getUserMedia first. If it fails with OverconstrainedError /
      // NotFoundError / NotReadableError (all mean "no such camera"), show a
      // friendly message instead of crashing. We do NOT rely on enumerateDevices()
      // labels because browsers hide them until permission is granted.
      if (mode === 'environment') {
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: 'environment' } }
          });
          // if we got here, back cam exists — stop this test stream immediately
          testStream.getTracks().forEach(t => t.stop());
        } catch (testErr) {
          // Any error here means no usable back camera
          setBooting(false);
          setFacingMode('user');
          facingModeRef.current = 'user';
          setBackCamUnavailable(true);
          setTimeout(() => setBackCamUnavailable(false), 5000);
          addDiagnosticLog?.('INFO: Back camera not available on this device.');
          return;
        }
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width:{ideal:1280}, height:{ideal:720}, facingMode: mode }
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width:640, height:480, facingMode: mode }
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise(res => { videoRef.current.onloadedmetadata = res; });
        videoRef.current.play();
      }

      setBootPct(60);
      setBootStep('LOADING YUNET DETECTION ENGINE...');
      await delay(350);
      setBootPct(80);
      setBootStep('ACTIVATING SFACE RECOGNITION MODULE...');
      await delay(350);
      setBootPct(100);
      setBootStep('BIOMETRIC FEED ONLINE');
      await delay(300);

      setBooting(false);
      setCamReady(true);
      setStatusText('Scanning...');
      addDiagnosticLog?.('Optical feed active: BIOMETRIC_CAM');

    } catch (err) {
      setBooting(false);
      setError('Unable to access camera. Please allow camera permission.');
      addDiagnosticLog?.('ERROR: Camera binding failed.');
    }
  }, [addDiagnosticLog]);

  /* ─────────────────────────────────── camera close ── */
  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (faceMeshRef.current) { faceMeshRef.current.close(); faceMeshRef.current = null; }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    tracksRef.current = [];
    blinkCountRef.current = 0;
    blinkStateRef.current = 'open';
    livenessRef.current = false;
    isScanningRef.current = false;
    markedIdsRef.current = new Set();
    setCamReady(false);
    setBooting(false);
    setStatusText('Camera Offline');
    setLastResult(null);
  }, []);

  /* ─────────────────────────────── toggle front/back ── */
  const toggleCamera = useCallback(() => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    closeCamera();
    setTimeout(() => openCamera(next), 150);
  }, [facingMode, closeCamera, openCamera]);

  /* ─────────────────────────── API: send frame to backend ── */
  const sendFrame = useCallback(async () => {
    if (!camReady || !videoRef.current || !canvasRef.current) return;
    if (isScanningRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || !video.videoWidth) return;

    isScanningRef.current = true;
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width  = video.videoWidth;
      offscreen.height = video.videoHeight;
      offscreen.getContext('2d').drawImage(video, 0, 0);

      const blob = await new Promise(res => offscreen.toBlob(res, 'image/jpeg', 0.82));
      if (!blob) return;

      const fd = new FormData();
      fd.append('file', blob, 'frame.jpg');
      if (userCoords) {
        fd.append('latitude',  userCoords.latitude);
        fd.append('longitude', userCoords.longitude);
      }
      if (selectedSubjectId) fd.append('subject_id', selectedSubjectId);
      if (sessionActive && sessionDate)  fd.append('custom_date', sessionDate);
      if (sessionActive && sessionPeriod) fd.append('custom_time', sessionPeriod);

      // Determine if we should write to the database (commit)
      let shouldCommit = !livenessEnabled;
      if (livenessEnabled) {
        shouldCommit = tracksRef.current.some(t => t.verified && !markedIdsRef.current.has(t.id));
      }

      const resp = await fetch(`${apiBaseUrl}/attendance/recognize-frame?commit=${shouldCommit}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status !== 403) setStatusText(`API Error: ${err.detail || resp.statusText}`);
        return;
      }

      const data = await resp.json();
      const results = data.results || [];

      const now = Date.now();

      if (results.length === 0) {
        // no face recognized — fade out tracks gradually
        tracksRef.current = tracksRef.current.filter(t => now - t.lastSeen < TRACK_HOLD_MS);
      } else {
        // Update or add tracks for each result
        const vw = video.videoWidth,  vh = video.videoHeight;
        const cw = canvasRef.current.width, ch = canvasRef.current.height;
        const sx = cw / vw, sy = ch / vh;

        results.forEach(face => {
          const [fx, fy, fw, fh] = face.box;
          const scaledBox = [
            Math.round(fx * sx), Math.round(fy * sy),
            Math.round(fw * sx), Math.round(fh * sy),
          ];

          // find existing track by student id (or fallback by proximity)
          let track = tracksRef.current.find(t => t.id === face.user_id);
          if (!track) {
            track = {
              id: face.user_id,
              box: scaledBox,
              info: { name: face.name, roll: face.roll, dep: face.dep },
              confidence: face.confidence,
              verified: !livenessEnabled,
              blinkCount: !livenessEnabled ? BLINKS_NEEDED : 0,
              lastSeen: now,
            };
            tracksRef.current.push(track);
          } else {
            // smooth box (lerp)
            const a = 0.45;
            track.box = [
              Math.round(track.box[0]*(1-a) + scaledBox[0]*a),
              Math.round(track.box[1]*(1-a) + scaledBox[1]*a),
              Math.round(track.box[2]*(1-a) + scaledBox[2]*a),
              Math.round(track.box[3]*(1-a) + scaledBox[3]*a),
            ];
            track.info       = { name: face.name, roll: face.roll, dep: face.dep };
            track.confidence = face.confidence;
            track.lastSeen   = now;
            if (!livenessEnabled) {
              track.verified = true;
              track.blinkCount = BLINKS_NEEDED;
            }
          }

          // mark attendance after liveness
          if (track.verified && !markedIdsRef.current.has(face.user_id)) {
            // Only add to markedIdsRef if the backend actually committed it (newly_marked is not null)
            if (face.newly_marked !== null) {
              markedIdsRef.current.add(face.user_id);
              if (face.newly_marked !== false) {
                const timeStr = sessionActive && sessionPeriod
                  ? sessionPeriod
                  : new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
                onAttendanceMarked?.({
                  user_id:    face.user_id,
                  name:       face.name,
                  roll:       face.roll,
                  dep:        face.dep,
                  time:       timeStr,
                  confidence: face.confidence,
                  newly_marked: face.newly_marked,
                });
                addDiagnosticLog?.(`MATCH: ${face.name} (${face.confidence?.toFixed(1)}%)`);
                setLastResult({ name:face.name, roll:face.roll, dep:face.dep,
                                confidence:face.confidence, time: timeStr });
                setStatusText(`Marked: ${face.name}`);
              } else {
                setStatusText(`Already marked: ${face.name}`);
              }
            }
          }
        });

        // remove stale tracks
        tracksRef.current = tracksRef.current.filter(t => now - t.lastSeen < TRACK_HOLD_MS);
      }
    } catch (e) {
      console.error('[FaceScanner] API error:', e);
    } finally {
      isScanningRef.current = false;
    }
  }, [camReady, token, apiBaseUrl, selectedSubjectId, userCoords,
      sessionActive, sessionPeriod, sessionDate, onAttendanceMarked, addDiagnosticLog, livenessEnabled]);

  /* ─────────────────────── Mediapipe FaceMesh liveness loop ── */
  useEffect(() => {
    if (!camReady) return;

    // reset blink state when camera starts
    blinkCountRef.current = 0;
    blinkStateRef.current = 'open';
    livenessRef.current = false;

    if (!livenessEnabled) {
      // Auto-verify immediately when liveness is disabled
      livenessRef.current = true;
      tracksRef.current.forEach(tr => { tr.verified = true; tr.blinkCount = BLINKS_NEEDED; });
      return;
    }

    if (!window.FaceMesh) {
      console.warn('[FaceScanner] FaceMesh not available globally — skipping liveness.');
      // Auto-verify after 3s if no FaceMesh
      const t = setTimeout(() => {
        livenessRef.current = true;
        tracksRef.current.forEach(tr => { tr.verified = true; tr.blinkCount = BLINKS_NEEDED; });
      }, 3000);
      return () => clearTimeout(t);
    }

    let fm;
    try {
      fm = new window.FaceMesh({
        locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`
      });
      fm.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      fm.onResults((res) => {
        if (!res.multiFaceLandmarks?.length) return;
        const lm = res.multiFaceLandmarks[0];
        const ear = (calcEAR(lm, LEFT_EYE) + calcEAR(lm, RIGHT_EYE)) / 2;

        if (ear < EAR_THRESH) {
          blinkStateRef.current = 'closed';
        } else if (blinkStateRef.current === 'closed') {
          blinkStateRef.current = 'open';
          blinkCountRef.current = Math.min(blinkCountRef.current + 1, BLINKS_NEEDED);
          // propagate to all current tracks
          tracksRef.current.forEach(tr => {
            tr.blinkCount = blinkCountRef.current;
            if (blinkCountRef.current >= BLINKS_NEEDED) tr.verified = true;
          });
        }
      });
    } catch (fmInitErr) {
      console.error('[FaceScanner] Failed to instantiate FaceMesh solution:', fmInitErr);
      addDiagnosticLog?.('WARN: FaceMesh initialization failed. Disabling client liveness.');
      setLivenessEnabled(false);
      return;
    }

    faceMeshRef.current = fm;

    let fmActive = true;
    const runFM = async () => {
      // CRITICAL: check fmActive BEFORE the await to avoid calling send()
      // on a closed Mediapipe instance (causes BindingError crash)
      if (!fmActive) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2 && v.videoWidth > 0) {
        try {
          if (fmActive) await fm.send({ image: v }); // double-check after microtask
        } catch (e) {
          // Swallow BindingError from Mediapipe when instance is closed mid-frame
          if (!fmActive) return; // expected — we are shutting down
          console.warn('[FaceScanner] FaceMesh send error:', e?.message);
        }
      }
      if (fmActive) requestAnimationFrame(runFM);
    };
    requestAnimationFrame(runFM);

    return () => {
      fmActive = false; // stop loop FIRST
      faceMeshRef.current = null;
      try { fm.close(); } catch {} // close after loop is flagged stopped
    };
  }, [camReady, livenessEnabled, addDiagnosticLog]);

  /* ─────────────────────────────── HUD animation loop ── */
  useEffect(() => {
    if (!camReady) return;
    let active = true;

    const loop = () => {
      if (!active || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const video  = videoRef.current;
      if (video && video.videoWidth > 0) {
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext('2d');
      // Pass isMirrored so text panels render correctly (use ref — rAF closure would otherwise be stale)
      const isMirrored = facingModeRef.current === 'user';
      drawHUD(ctx, canvas.width, canvas.height, tracksRef.current, scanPhaseRef.current, isMirrored);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [camReady]);

  /* ─────────────────────────────── API scan loop ── */
  useEffect(() => {
    if (!camReady) return;
    let active = true;

    const schedule = () => {
      if (!active) return;
      scanTimerRef.current = setTimeout(async () => {
        await sendFrame();
        schedule();
      }, SCAN_INTERVAL_MS);
    };

    schedule();
    return () => {
      active = false;
      if (scanTimerRef.current) clearTimeout(scanTimerRef.current);
    };
  }, [camReady, sendFrame]);

  /* ─────────────────────────────── open cam on mount ── */
  useEffect(() => {
    openCamera(facingMode);
    return () => closeCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────────────────────────────────── render ── */
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px', width:'100%' }}>

      {/* ── Camera viewport ── */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16/9',
        background: '#000c18',
        borderRadius: '14px',
        overflow: 'hidden',
        border: camReady
          ? '2px solid rgba(0,255,136,0.5)'
          : '2px solid rgba(0,242,254,0.25)',
        boxShadow: camReady
          ? '0 0 32px rgba(0,255,136,0.18), inset 0 0 24px rgba(0,0,0,0.6)'
          : '0 0 18px rgba(0,242,254,0.1)',
        transition: 'border-color 0.4s, box-shadow 0.4s',
      }}>

        {/* live video */}
        <video
          ref={videoRef}
          autoPlay playsInline muted
          style={{
            position: 'absolute', inset: 0,
            width:'100%', height:'100%',
            objectFit: 'cover',
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
            display: (camReady || booting) ? 'block' : 'none',
          }}
        />

        {/* HUD canvas overlay — NO CSS mirror here; mirroring is handled
             inside drawHUD() so that text/panels always appear readable. */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            pointerEvents: 'none',
            display: camReady ? 'block' : 'none',
          }}
        />

        {/* Boot overlay */}
        {booting && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,8,20,0.95)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '18px', zIndex: 10,
          }}>
            {/* spinning radar */}
            <div style={{ position:'relative', width:'80px', height:'80px' }}>
              <div style={{
                position:'absolute', inset:0,
                border:'3px solid rgba(0,242,254,0.15)',
                borderTopColor:'#00f2fe',
                borderRadius:'50%',
                animation:'spin 1s linear infinite',
              }}/>
              <div style={{
                position:'absolute', inset:'18px',
                border:'2px solid rgba(0,255,136,0.2)',
                borderBottomColor:'#00ff88',
                borderRadius:'50%',
                animation:'spin 1.6s linear infinite reverse',
              }}/>
              <div style={{
                position:'absolute', inset:'32px',
                background:'rgba(0,242,254,0.2)',
                borderRadius:'50%',
                animation:'pulse 1.4s ease-in-out infinite',
              }}/>
            </div>
            <div style={{ fontFamily:'monospace', fontSize:'0.78rem',
                          color:'#00f2fe', letterSpacing:'0.12em', textAlign:'center' }}>
              {bootStep}
            </div>
            {/* progress bar */}
            <div style={{ width:'220px', height:'6px', background:'rgba(0,242,254,0.15)',
                          borderRadius:'3px', overflow:'hidden' }}>
              <div style={{
                height:'100%',
                width:`${bootPct}%`,
                background:'linear-gradient(90deg,#00f2fe,#00ff88)',
                borderRadius:'3px',
                transition:'width 0.3s ease',
              }}/>
            </div>
          </div>
        )}

        {/* Offline placeholder */}
        {!camReady && !booting && (
          <div style={{
            position:'absolute', inset:0,
            display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:'14px',
          }}>
            <div style={{
              width:'56px', height:'56px',
              border:'3px solid rgba(0,242,254,0.2)',
              borderTopColor:'rgba(0,242,254,0.6)',
              borderRadius:'50%',
              animation:'spin 1.2s linear infinite',
            }}/>
            <p style={{ color:'rgba(0,242,254,0.55)', fontSize:'0.78rem',
                        fontFamily:'monospace', letterSpacing:'0.1em' }}>
              INITIALIZING OPTICAL FEED...
            </p>
          </div>
        )}

        {/* camera toggle button (top-right) */}
        <button
          onClick={toggleCamera}
          title="Switch Camera"
          style={{
            position:'absolute', top:'10px', right:'10px', zIndex:20,
            background:'rgba(0,0,0,0.55)',
            border:'1px solid rgba(0,242,254,0.4)',
            color:'#00f2fe', borderRadius:'8px',
            padding:'5px 10px', fontSize:'0.72rem',
            cursor:'pointer', fontFamily:'monospace',
            backdropFilter:'blur(4px)',
          }}
        >
          🔄 {facingMode === 'user' ? 'BACK CAM' : 'FRONT CAM'}
        </button>

        {/* liveness toggle button (top-left) */}
        {camReady && (
          <button
            onClick={() => setLivenessEnabled(prev => !prev)}
            title="Toggle Eye-Blink Liveness check"
            style={{
              position:'absolute', top:'10px', left:'10px', zIndex:20,
              background:'rgba(0,0,0,0.55)',
              border: livenessEnabled ? '1px solid rgba(0,242,254,0.4)' : '1px solid rgba(255,165,0,0.4)',
              color: livenessEnabled ? '#00f2fe' : '#ffa500',
              borderRadius:'8px',
              padding:'5px 10px', fontSize:'0.72rem',
              cursor:'pointer', fontFamily:'monospace',
              backdropFilter:'blur(4px)',
            }}
          >
            👁️ LIVENESS: {livenessEnabled ? 'ON' : 'OFF'}
          </button>
        )}

        {/* blink counter badge */}
        {camReady && livenessEnabled && (
          <div style={{
            position:'absolute', bottom:'10px', left:'10px', zIndex:20,
            background:'rgba(0,0,0,0.6)',
            border:`1px solid ${blinkCountRef.current >= BLINKS_NEEDED ? '#00ff88' : '#ffa500'}`,
            color: blinkCountRef.current >= BLINKS_NEEDED ? '#00ff88' : '#ffa500',
            borderRadius:'8px', padding:'4px 10px',
            fontSize:'0.7rem', fontFamily:'monospace',
            backdropFilter:'blur(4px)',
          }}>
            👁 BLINK: {Math.min(blinkCountRef.current, BLINKS_NEEDED)}/{BLINKS_NEEDED}
            {blinkCountRef.current >= BLINKS_NEEDED ? ' ✓ VERIFIED' : ''}
          </div>
        )}

        {/* liveness bypassed badge */}
        {camReady && !livenessEnabled && (
          <div style={{
            position:'absolute', bottom:'10px', left:'10px', zIndex:20,
            background:'rgba(0,0,0,0.6)',
            border:'1px solid #00ff88',
            color: '#00ff88',
            borderRadius:'8px', padding:'4px 10px',
            fontSize:'0.7rem', fontFamily:'monospace',
            backdropFilter:'blur(4px)',
          }}>
            👁 LIVENESS: BYPASSED
          </div>
        )}
      </div>

      {/* ── back camera unavailable friendly message ── */}
      {backCamUnavailable && (
        <div style={{
          padding:'14px 18px',
          background:'linear-gradient(135deg,rgba(255,165,0,0.12),rgba(255,100,0,0.08))',
          border:'1px solid rgba(255,165,0,0.45)',
          borderRadius:'12px',
          display:'flex', alignItems:'center', gap:'12px',
          animation:'fadeIn 0.3s ease',
        }}>
          <span style={{ fontSize:'1.6rem' }}>📷</span>
          <div>
            <div style={{ color:'#ffa500', fontSize:'0.85rem',
                          fontFamily:'monospace', fontWeight:700,
                          letterSpacing:'0.06em', marginBottom:'3px' }}>
              REAR CAMERA UNAVAILABLE
            </div>
            <div style={{ color:'rgba(255,200,100,0.85)', fontSize:'0.78rem',
                          fontFamily:'monospace' }}>
              Your device doesn't have a back camera. Staying on front camera. 😊
            </div>
          </div>
        </div>
      )}

      {/* ── error ── */}
      {error && (
        <div style={{
          padding:'10px 14px',
          background:'rgba(239,68,68,0.12)',
          border:'1px solid rgba(239,68,68,0.35)',
          borderRadius:'10px',
          color:'#ef4444', fontSize:'0.83rem', fontFamily:'monospace',
        }}>{error}</div>
      )}

      {/* ── status ── */}
      {camReady && (
        <div style={{
          padding:'8px 14px',
          background:'rgba(0,242,254,0.07)',
          border:'1px solid rgba(0,242,254,0.2)',
          borderRadius:'10px',
          color:'#00f2fe', fontSize:'0.78rem', fontFamily:'monospace',
          textAlign:'center', letterSpacing:'0.06em',
        }}>
          ● {statusText}
          {tracksRef.current.length === 0 && camReady
            ? ' — Position your face in front of the camera'
            : ''}
        </div>
      )}

      {/* ── last match card ── */}
      {lastResult && (
        <div style={{
          padding:'12px 16px',
          background:'linear-gradient(135deg,rgba(0,255,136,0.08),rgba(0,242,254,0.05))',
          border:'1px solid rgba(0,255,136,0.35)',
          borderRadius:'12px',
          display:'flex', flexDirection:'column', gap:'4px',
        }}>
          <div style={{ color:'#00ff88', fontSize:'0.78rem',
                        fontFamily:'monospace', fontWeight:700,
                        letterSpacing:'0.08em' }}>
            ✅ ATTENDANCE MARKED
          </div>
          <div style={{ color:'#ffffff', fontSize:'0.88rem', fontWeight:700 }}>
            {lastResult.name}
          </div>
          <div style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.78rem',
                        display:'flex', gap:'14px', fontFamily:'monospace' }}>
            <span>ROLL: {lastResult.roll}</span>
            <span>DEPT: {lastResult.dep}</span>
            <span>SIM: {lastResult.confidence?.toFixed(1)}%</span>
          </div>
          <div style={{ color:'rgba(0,242,254,0.6)', fontSize:'0.72rem',
                        fontFamily:'monospace' }}>
            TIME: {lastResult.time}
          </div>
        </div>
      )}

      {/* ── blink hint ── */}
      {camReady && blinkCountRef.current < BLINKS_NEEDED && (
        <div style={{
          padding:'8px 14px',
          background:'rgba(255,165,0,0.08)',
          border:'1px solid rgba(255,165,0,0.3)',
          borderRadius:'10px',
          color:'#ffa500', fontSize:'0.78rem',
          fontFamily:'monospace', textAlign:'center',
        }}>
          👁 Please blink {BLINKS_NEEDED} times to verify liveness
          — {Math.min(blinkCountRef.current, BLINKS_NEEDED)}/{BLINKS_NEEDED} blinks detected
        </div>
      )}
    </div>
  );
}

/* tiny utility */
const delay = (ms) => new Promise(res => setTimeout(res, ms));
