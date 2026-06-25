/** Lightweight client-side face detection (MediaPipe BlazeFace) for instant feedback */

const FACE_DETECTION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_detection';

let scriptLoadPromise = null;

export function loadFaceDetectionScript() {
  if (typeof window !== 'undefined' && window.FaceDetection) {
    return Promise.resolve();
  }
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${FACE_DETECTION_CDN}/face_detection.js`;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Face detection script failed to load'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export async function createFaceDetector(options = {}) {
  await loadFaceDetectionScript();
  const detector = new window.FaceDetection({
    locateFile: (file) => `${FACE_DETECTION_CDN}/${file}`,
  });
  detector.setOptions({
    model: options.model || 'short',
    minDetectionConfidence: options.minDetectionConfidence ?? 0.45,
  });
  return detector;
}

export function extractFaceBox(detection, canvasW, canvasH) {
  if (!detection || !canvasW || !canvasH) return null;

  const rel = detection.locationData?.relativeBoundingBox;
  if (rel) {
    const w = rel.width * canvasW;
    const h = rel.height * canvasH;
    const x = rel.xCenter * canvasW - w / 2;
    const y = rel.yCenter * canvasH - h / 2;
    return {
      x: Math.max(0, x),
      y: Math.max(0, y),
      w,
      h,
      score: Array.isArray(detection.score) ? detection.score[0] : detection.score || 0,
    };
  }

  const bb = detection.boundingBox;
  if (bb) {
    return {
      x: (bb.xMin ?? bb.xCenter - bb.width / 2) * canvasW,
      y: (bb.yMin ?? bb.yCenter - bb.height / 2) * canvasH,
      w: bb.width * canvasW,
      h: bb.height * canvasH,
      score: Array.isArray(detection.score) ? detection.score[0] : detection.score || 0,
    };
  }
  return null;
}

export function drawFaceBox(ctx, box, options = {}) {
  if (!ctx || !box) return;
  const color = options.color || '#00f2fe';
  const label = options.label || 'FACE DETECTED';
  const pad = options.padding ?? 8;

  ctx.strokeStyle = color;
  ctx.lineWidth = options.lineWidth ?? 3;
  ctx.strokeRect(box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2);

  const corner = Math.min(24, box.w * 0.15);
  ctx.lineWidth = 4;
  const corners = [
    [box.x - pad, box.y - pad, 1, 1],
    [box.x + box.w + pad, box.y - pad, -1, 1],
    [box.x - pad, box.y + box.h + pad, 1, -1],
    [box.x + box.w + pad, box.y + box.h + pad, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * corner);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * corner, cy);
    ctx.stroke();
  }

  if (label) {
    ctx.fillStyle = color;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(label, box.x, Math.max(18, box.y - 12));
  }
}
