/** Apply / remove Ideas150 UI effect classes on document body */
const PREFIX = 'i150-';
const STORAGE_KEY = 'ideas150_enabled_fx_v1';

function readEnabled() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeEnabled(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

export function applyIdeaFx(fx, enabled = true) {
  if (!fx || typeof document === 'undefined') return;
  const cls = fx.startsWith(PREFIX) ? fx : `${PREFIX}${fx}`;
  document.body.classList.toggle(cls, !!enabled);
  const list = new Set(readEnabled());
  if (enabled) list.add(cls);
  else list.delete(cls);
  writeEnabled([...list]);
}

export function applyFxFromState(state) {
  if (!state) return;
  const fx = state.fx || state.result?.fx_class?.replace(PREFIX, '');
  if (!fx) return;
  applyIdeaFx(fx, state.enabled !== false && state.result?.fx_enabled !== false);
}

export function restoreAllIdeaFx() {
  if (typeof document === 'undefined') return;
  readEnabled().forEach((cls) => document.body.classList.add(cls));
}

export function clearAllIdeaFx() {
  if (typeof document === 'undefined') return;
  readEnabled().forEach((cls) => document.body.classList.remove(cls));
  writeEnabled([]);
}

export function playToastTheater(message, durationMs = 3200) {
  const el = document.createElement('div');
  el.className = 'i150-toast-theater';
  el.textContent = message || 'Done';
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 400);
  }, durationMs);
}

export function playConfettiBurst(count = 40) {
  const layer = document.createElement('div');
  layer.className = 'i150-confetti-layer';
  for (let i = 0; i < count; i += 1) {
    const p = document.createElement('span');
    p.style.left = `${Math.random() * 100}%`;
    p.style.animationDelay = `${Math.random() * 0.4}s`;
    p.style.background = `hsl(${Math.floor(Math.random() * 360)}, 85%, 60%)`;
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1800);
}

export function playShakeRecover(target) {
  const el = target || document.querySelector('.ideas150-hub') || document.body;
  el.classList.add('i150-shaking');
  setTimeout(() => {
    el.classList.remove('i150-shaking');
    el.classList.add('i150-recovered');
    setTimeout(() => el.classList.remove('i150-recovered'), 600);
  }, 450);
}

export function triggerHapticPattern(name = 'success') {
  const patterns = {
    success: [40, 30, 40],
    error: [80],
    scan: [20],
    streak: [30, 30, 30, 30],
  };
  const p = patterns[name] || patterns.success;
  if (navigator.vibrate) navigator.vibrate(p);
}

export function animateConfidenceRing(percent = 94) {
  const ring = document.querySelector('.i150-confidence-ring-demo');
  if (!ring) return;
  ring.style.setProperty('--pct', String(percent));
  ring.classList.add('animate');
}

export function applyThemeStudioColor(color) {
  if (!color) return;
  document.documentElement.style.setProperty('--ideas150-accent', color);
  document.documentElement.style.setProperty('--color-primary', color);
}

export function applySeasonalSkin(skin) {
  document.body.setAttribute('data-ideas150-skin', skin || '');
}

export function runClientDemo(feature, result) {
  const fx = feature?.fx || feature?.slug;
  if (!fx) return;
  applyIdeaFx(fx, result?.fx_enabled !== false && result?.enabled !== false);

  if (fx === 'toast-theater') playToastTheater(result?.ui?.sample || feature.name);
  if (fx === 'success-scan-morph' || fx === 'first-scan-fireworks' || fx === 'stadium-cheer' || fx === 'gesture-confetti') {
    playConfettiBurst(result?.ui?.confetti || 48);
  }
  if (fx === 'haptic-storyboard') triggerHapticPattern('success');
  if (fx === 'error-shake-recover') playShakeRecover();
  if (fx === 'confidence-ring') animateConfidenceRing(result?.ui?.percent || 94.5);
  if (fx === 'theme-studio') applyThemeStudioColor(result?.ui?.primary);
  if (fx === 'seasonal-skins') applySeasonalSkin(result?.ui?.skin || 'diwali');
  if (fx === 'achievement-cinema') playToastTheater(`🏆 ${result?.ui?.badge || 'Unlocked'}!`, 2800);
}
