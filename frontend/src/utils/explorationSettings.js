const STORAGE_KEY = 'exploration_lab_settings';

export const DEFAULT_EXPLORATION = {
  confettiOnMatch: true,
  neonPulse: true,
  scanLineSpeed: 'normal',
  particleDensity: 60,
  uiGlow: 70,
  achievementPopups: true,
  matrixRain: false,
  starfield: true,
  clickRipples: true,
  smoothPageTransitions: true,
  reduceMotionMobile: true,
  scannerSoundPack: 'cyber',
  dashboardCelebration: false,
  secretDiscoveries: 0,
};

export function loadExplorationSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_EXPLORATION, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_EXPLORATION };
}

export function saveExplorationSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function bumpSecretDiscovery() {
  const next = loadExplorationSettings();
  next.secretDiscoveries = (next.secretDiscoveries || 0) + 1;
  saveExplorationSettings(next);
  return next.secretDiscoveries;
}

export function triggerConfettiBurst() {
  if (typeof document === 'undefined') return;
  const colors = ['#00f2fe', '#10b981', '#fbbf24', '#a78bfa', '#f472b6'];
  for (let i = 0; i < 28; i += 1) {
    const piece = document.createElement('div');
    const left = 40 + Math.random() * 20;
    piece.style.cssText = [
      'position:fixed',
      `left:${left}%`,
      'top:-12px',
      'width:8px',
      'height:8px',
      `background:${colors[i % colors.length]}`,
      'z-index:999999',
      'pointer-events:none',
      'border-radius:2px',
      `transform:rotate(${Math.random() * 360}deg)`,
      'transition:transform 1.2s ease-in, top 1.2s ease-in, opacity 1.2s ease-in',
    ].join(';');
    document.body.appendChild(piece);
    requestAnimationFrame(() => {
      piece.style.top = `${55 + Math.random() * 30}%`;
      piece.style.transform = `translateX(${(Math.random() - 0.5) * 120}px) rotate(${Math.random() * 720}deg)`;
      piece.style.opacity = '0';
    });
    setTimeout(() => piece.remove(), 1400);
  }
}

export const SCAN_LINE_SPEEDS = {
  slow: 4.5,
  normal: 3,
  fast: 1.8,
};

export const SOUND_PACKS = [
  { id: 'cyber', label: 'Cyber Synth' },
  { id: 'minimal', label: 'Minimal Beep' },
  { id: 'arcade', label: 'Arcade Retro' },
  { id: 'silent', label: 'Silent Pro' },
];
