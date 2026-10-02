/** High-performance camera helpers for smooth millisecond-level face scanning */

export const CAMERA_PRESETS = {
  turbo: {
    label: 'Turbo FaceLock (Millisecond Speed)',
    video: {
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: 'user',
    },
    captureWidth: 400,
    captureHeight: 300,
    jpegQuality: 0.68,
    meshSkipFrames: 0,
    minDetectionConfidence: 0.38,
    faceDetectionConfidence: 0.40,
    refineLandmarks: false,
  },
  balanced: {
    label: 'Balanced',
    video: {
      width: { ideal: 960, max: 1280 },
      height: { ideal: 540, max: 720 },
      frameRate: { ideal: 30, max: 30 },
      facingMode: 'user',
    },
    captureWidth: 640,
    captureHeight: 480,
    jpegQuality: 0.82,
    meshSkipFrames: 0,
    minDetectionConfidence: 0.55,
    faceDetectionConfidence: 0.5,
    refineLandmarks: true,
  },
  quality: {
    label: 'HD Quality',
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 24, max: 30 },
      facingMode: 'user',
    },
    captureWidth: 960,
    captureHeight: 720,
    jpegQuality: 0.9,
    meshSkipFrames: 0,
    minDetectionConfidence: 0.65,
    faceDetectionConfidence: 0.55,
    refineLandmarks: true,
  },
};

export function getCameraPreset(mode = 'turbo') {
  return CAMERA_PRESETS[mode] || CAMERA_PRESETS.turbo;
}

export function loadCameraSettings() {
  try {
    const raw = localStorage.getItem('camera_scan_settings');
    if (raw) return { ...CAMERA_PRESETS.balanced, ...JSON.parse(raw), preset: JSON.parse(raw).preset || 'turbo' };
  } catch { /* ignore */ }
  return { preset: 'turbo', ...getCameraPreset('turbo'), autoFocusBox: true, mirrorPreview: true, hapticFeedback: true, classroomMultiScan: true };
}

export function saveCameraSettings(settings) {
  localStorage.setItem('camera_scan_settings', JSON.stringify(settings));
}

export async function openCameraStream(presetKey = 'turbo', facingMode = 'user') {
  const preset = getCameraPreset(presetKey);
  const videoConstraints = {
    ...preset.video,
    facingMode: facingMode
  };
  const attempts = [
    videoConstraints,
    { width: 640, height: 480, facingMode: facingMode, frameRate: { ideal: 30 } },
    { video: { facingMode: facingMode } },
    { video: true },
  ];
  let lastErr;
  for (const constraints of attempts) {
    try {
      const video = constraints.video !== undefined ? constraints : { video: constraints };
      return await navigator.mediaDevices.getUserMedia(video);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Camera unavailable');
}

let _sharedCanvas = null;

export function captureFrameBlob(video, width, height, quality = 0.7) {
  return new Promise((resolve) => {
    if (!_sharedCanvas) {
      _sharedCanvas = document.createElement('canvas');
    }
    _sharedCanvas.width = width;
    _sharedCanvas.height = height;
    const ctx = _sharedCanvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) {
      resolve(null);
      return;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(video, 0, 0, width, height);
    _sharedCanvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

export function hasFaceInFrame(landmarks) {
  return landmarks && landmarks.length > 0;
}

export function estimateFaceBox(landmarks, canvasW, canvasH) {
  if (!landmarks?.length) return null;
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const pt of landmarks) {
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }
  return {
    x: minX * canvasW,
    y: minY * canvasH,
    w: (maxX - minX) * canvasW,
    h: (maxY - minY) * canvasH,
  };
}

export async function wakeBackend(apiBaseUrl, timeoutMs = 3000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBaseUrl}/health/ping`, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    clearTimeout(t);
    return false;
  }
}
