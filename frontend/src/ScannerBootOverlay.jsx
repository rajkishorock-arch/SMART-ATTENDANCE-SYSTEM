import { useState, useEffect } from 'react';

const DEFAULT_BOOT_LINES = [
  'INITIALIZING OPTICAL FEED...',
  'CALIBRATING BIOMETRIC SENSORS...',
  'LOADING SFACE NEURAL ENGINE...',
  'MAPPING FACIAL COORDINATES...',
  'ACTIVATING LIVENESS PROTOCOL...',
  'SEC_CAM_01 ONLINE — AWAITING SUBJECT',
];

export default function ScannerBootOverlay({
  active,
  onComplete,
  label = 'SEC_CAM_01',
  lines = DEFAULT_BOOT_LINES,
  durationMs = 2800,
}) {
  const [progress, setProgress] = useState(0);
  const [visibleLines, setVisibleLines] = useState([]);
  const [phase, setPhase] = useState('idle');

  useEffect(() => {
    if (!active) {
      setProgress(0);
      setVisibleLines([]);
      setPhase('idle');
      return undefined;
    }

    setPhase('booting');
    setVisibleLines([]);
    setProgress(0);

    const lineDelay = Math.max(280, Math.floor(durationMs / (lines.length + 2)));
    let lineIdx = 0;

    const lineInterval = setInterval(() => {
      if (lineIdx < lines.length) {
        const nextLine = lines[lineIdx];
        setVisibleLines((prev) => [...prev, nextLine]);
        lineIdx += 1;
      }
    }, lineDelay);

    const tickMs = 50;
    const step = 100 / (durationMs / tickMs);
    const progInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + step, 100));
    }, tickMs);

    const glitchTimer = setTimeout(() => {
      setPhase('glitch');
    }, durationMs - 350);

    const completeTimer = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, durationMs);

    return () => {
      clearInterval(lineInterval);
      clearInterval(progInterval);
      clearTimeout(glitchTimer);
      clearTimeout(completeTimer);
    };
  }, [active, durationMs, lines, onComplete]);

  if (!active || phase === 'done') {
    return null;
  }

  return (
    <div className={`scanner-boot-overlay ${phase === 'glitch' ? 'scanner-boot-glitch' : ''}`}>
      <div className="scanner-boot-grid" />
      <div className="scanner-boot-vignette" />

      <div className="scanner-boot-radar">
        <div className="scanner-boot-radar-ring scanner-boot-radar-ring-1" />
        <div className="scanner-boot-radar-ring scanner-boot-radar-ring-2" />
        <div className="scanner-boot-radar-ring scanner-boot-radar-ring-3" />
        <div className="scanner-boot-radar-sweep" />
        <div className="scanner-boot-radar-core" />
      </div>

      <div className="scanner-boot-reticle">
        <div className="scanner-boot-reticle-h" />
        <div className="scanner-boot-reticle-v" />
        <div className="scanner-boot-reticle-corner scanner-boot-reticle-tl" />
        <div className="scanner-boot-reticle-corner scanner-boot-reticle-tr" />
        <div className="scanner-boot-reticle-corner scanner-boot-reticle-bl" />
        <div className="scanner-boot-reticle-corner scanner-boot-reticle-br" />
      </div>

      <div className="scanner-boot-header">
        <span className="scanner-boot-label">ROBOTIC SCANNER v2.0</span>
        <span className="scanner-boot-id">{label}</span>
      </div>

      <div className="scanner-boot-log">
        {visibleLines.map((line, idx) => (
          <div
            key={`${line}-${idx}`}
            className="scanner-boot-log-line"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <span className="scanner-boot-prompt">&gt;</span>
            {line}
          </div>
        ))}
        <div className="scanner-boot-log-line scanner-boot-cursor-line">
          <span className="scanner-boot-prompt">&gt;</span>
          <span className="scanner-boot-cursor">_</span>
        </div>
      </div>

      <div className="scanner-boot-progress-wrap">
        <div className="scanner-boot-progress-label">
          <span>SYSTEM BOOT</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="scanner-boot-progress-track">
          <div
            className="scanner-boot-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="scanner-boot-scanline" />
    </div>
  );
}
