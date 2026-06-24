/** High-performance camera helpers for smooth millisecond-level face scanning */

export const CAMERA_PRESETS = {
  turbo: {
    label: 'Turbo (fastest)',
    video: {
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: 'user',
    },
    captureWidth: 480,
    captureHeight: 360,
    jpegQuality: 0.72,
    meshSkipFrames: 1,
    minDetectionConfidence: 0.5,
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
    minDetectionConfidence: 0.65,
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
    minDetectionConfidence: 0.7,
    refineLandmarks: true,
  },
};

export function getCameraPreset(mode = 'turbo') {
  return CAMERA_PRESETS[mode] || CAMERA_PRESETS.turbo;
}

const DEFAULT_CAMERA_SETTINGS = {
  preset: 'turbo',
  ...getCameraPreset('turbo'),
  autoFocusBox: true,
  mirrorPreview: true,
  hapticFeedback: true,
  serverFallbackScan: true,
  wakeBackendBeforeScan: true,
  fallbackScanIntervalMs: 1400,
};

export function loadCameraSettings() {
  try {
    const raw = localStorage.getItem('camera_scan_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      const presetKey = parsed.preset || DEFAULT_CAMERA_SETTINGS.preset;
      return {
        ...DEFAULT_CAMERA_SETTINGS,
        ...getCameraPreset(presetKey),
        ...parsed,
        preset: presetKey,
      };
    }
  } catch (_) { /* ignore */ }
  return DEFAULT_CAMERA_SETTINGS;
}

export function saveCameraSettings(settings) {
  localStorage.setItem('camera_scan_settings', JSON.stringify(settings));
}

export async function openCameraStream(presetKey = 'turbo') {
  const preset = getCameraPreset(presetKey);
  const attempts = [
    preset.video,
    { width: 640, height: 480, facingMode: 'user', frameRate: { ideal: 30 } },
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

export function captureFrameBlob(video, width, height, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) {
      resolve(null);
      return;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
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

export async function wakeBackend(apiBaseUrl, timeoutMs = 6000) {
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
    try {
      const res2 = await fetch(`${apiBaseUrl}/health/`, { signal: AbortSignal.timeout(timeoutMs) });
      return res2.ok;
    } catch {
      return false;
    }
  }
}
