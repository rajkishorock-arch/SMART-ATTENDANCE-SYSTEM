/** Ideas150 FX — safe app-wide effects (no black-screen stack) */
const PREFIX = 'i150-';
const STORAGE_KEY = 'ideas150_enabled_fx_v1';
const SKIN_KEY = 'ideas150_skin_v1';
const COLOR_KEY = 'ideas150_color_v1';

/** Only one from each group may be active (prevents black / broken home) */
const EXCLUSIVE_GROUPS = [
  [
    'amoled-burn-guard',
    'voice-dark-room',
    'rainy-day-ui',
    'night-shift-blue',
    'high-contrast-exam',
    'cursor-spotlight',
    'exam-week-redline',
  ],
  ['reduced-motion'], // if on, still ok alone but we won't combine with blur gates
  ['blur-focus-gate'], // hub-onlyish — not restored app-wide
];

/** Never restore these globally — they break whole-app readability */
const HUB_ONLY_FX = new Set([
  'blur-focus-gate',
  'split-war-room',
  'kiosk-attract',
  'floating-quick-dock',
  'digital-id-flip',
  'face-mesh-overlay',
  'laser-sweep',
  'avatar-lqip',
]);

function getStorageItem(key) {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
  } catch (_) {
    return null;
  }
}

function setStorageItem(key, val) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val);
    }
  } catch (_) {}
}

function removeStorageItem(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (_) {}
}

function readEnabled() {
  try {
    const val = getStorageItem(STORAGE_KEY);
    if (!val) return [];
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeEnabled(list) {
  if (Array.isArray(list)) {
    setStorageItem(STORAGE_KEY, JSON.stringify(list));
  }
}

function toClass(fx) {
  if (!fx) return null;
  const raw = String(fx).replace(/^i150-/, '');
  return `${PREFIX}${raw}`;
}

function slugFromClass(cls) {
  return String(cls || '').replace(/^i150-/, '');
}

function enforceExclusivity(nextSlug) {
  if (typeof document === 'undefined' || !document.body) return;
  const hit = EXCLUSIVE_GROUPS.find((g) => g.includes(nextSlug));
  if (!hit) return;
  hit.forEach((slug) => {
    if (slug === nextSlug) return;
    const cls = toClass(slug);
    if (cls) document.body.classList.remove(cls);
  });
  const kept = readEnabled().filter((cls) => {
    const s = slugFromClass(cls);
    return s === nextSlug || !hit.includes(s);
  });
  writeEnabled(kept);
}

export function applyIdeaFx(fx, enabled = true) {
  if (!fx || typeof document === 'undefined' || !document.body) return;
  const slug = String(fx).replace(/^i150-/, '');
  const cls = toClass(slug);
  if (!cls) return;

  if (enabled) {
    if (HUB_ONLY_FX.has(slug) && !document.body.hasAttribute('data-ideas150-hub')) {
      // hub-only: skip while outside Ideas Hub
      return;
    }
    enforceExclusivity(slug);
    document.body.classList.add(cls);
    const list = new Set(readEnabled());
    list.add(cls);
    // drop exclusive losers already removed from DOM
    EXCLUSIVE_GROUPS.forEach((g) => {
      if (!g.includes(slug)) return;
      g.forEach((s) => {
        if (s !== slug) list.delete(toClass(s));
      });
    });
    writeEnabled([...list]);
  } else {
    document.body.classList.remove(cls);
    writeEnabled(readEnabled().filter((c) => c !== cls));
  }
}

export function applyFxFromState(state) {
  if (!state?.fx && !state?.result?.fx_class) return;
  const fx = state.fx || String(state.result.fx_class).replace(/^i150-/, '');
  const on = !!(state.enabled && state.result?.fx_enabled !== false);
  applyIdeaFx(fx, on);
}

/** Sync only toggle_fx / fx features that are ON — safe for home + hub */
export function syncLiveFxFromStates(states = {}) {
  if (typeof document === 'undefined' || !document.body) return;
  // purge current i150 classes first
  [...document.body.classList].forEach((c) => {
    if (c.startsWith(PREFIX)) document.body.classList.remove(c);
  });

  const candidates = [];
  Object.values(states).forEach((s) => {
    if (!s?.enabled) return;
    const fx = s.fx || (s.result?.fx_class ? String(s.result.fx_class).replace(/^i150-/, '') : null);
    if (!fx) return;
    if (HUB_ONLY_FX.has(fx) && !document.body.hasAttribute('data-ideas150-hub')) return;
    candidates.push(fx);
  });

  // resolve exclusivity — last candidate in each group wins
  const blocked = new Set();
  const chosen = [];
  [...candidates].reverse().forEach((fx) => {
    if (blocked.has(fx)) return;
    const group = EXCLUSIVE_GROUPS.find((g) => g.includes(fx));
    if (group) {
      group.forEach((s) => blocked.add(s));
      blocked.delete(fx);
    }
    chosen.push(fx);
  });
  chosen.reverse();

  chosen.forEach((fx) => {
    document.body.classList.add(toClass(fx));
  });
  writeEnabled(chosen.map(toClass));
  document.body.classList.toggle('ideas150-fx-active', chosen.length > 0);

  const skin = getStorageItem(SKIN_KEY);
  if (skin && document.body) document.body.setAttribute('data-ideas150-skin', skin);
  const color = getStorageItem(COLOR_KEY);
  if (color) {
    document.documentElement.style.setProperty('--ideas150-accent', color);
    document.documentElement.style.setProperty('--color-primary', color);
  }
}

export function restoreAllIdeaFx() {
  if (typeof document === 'undefined' || !document.body) return;
  // sanitize legacy black-screen stacks from Verify All
  const raw = readEnabled() || [];
  const safe = [];
  const seenExclusive = new Set();
  raw.forEach((cls) => {
    if (!cls) return;
    const slug = slugFromClass(cls);
    if (HUB_ONLY_FX.has(slug)) return;
    const group = EXCLUSIVE_GROUPS.find((g) => g.includes(slug));
    if (group) {
      const key = group.join('|');
      if (seenExclusive.has(key)) return;
      seenExclusive.add(key);
    }
    safe.push(cls);
  });
  writeEnabled(safe);
  if (document.body) {
    [...document.body.classList].forEach((c) => {
      if (c.startsWith(PREFIX)) document.body.classList.remove(c);
    });
    safe.forEach((cls) => document.body.classList.add(cls));
    document.body.classList.toggle('ideas150-fx-active', safe.length > 0);
    const skin = getStorageItem(SKIN_KEY);
    if (skin) document.body.setAttribute('data-ideas150-skin', skin);
  }
}

export function clearAllIdeaFx() {
  if (typeof document === 'undefined' || !document.body) return;
  if (document.body) {
    [...document.body.classList].forEach((c) => {
      if (c.startsWith(PREFIX)) document.body.classList.remove(c);
    });
    document.body.classList.remove('ideas150-fx-active');
    document.body.removeAttribute('data-ideas150-skin');
  }
  writeEnabled([]);
  removeStorageItem(SKIN_KEY);
  removeStorageItem(COLOR_KEY);
}

export function setIdeas150HubOpen(open) {
  if (typeof document === 'undefined' || !document.body) return;
  if (document.body) {
    if (open) document.body.setAttribute('data-ideas150-hub', '1');
    else document.body.removeAttribute('data-ideas150-hub');
  }
}

export function playToastTheater(message, durationMs = 3200) {
  if (typeof document === 'undefined' || !document.body) return;
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
  if (typeof document === 'undefined' || !document.body) return;
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
  if (typeof document === 'undefined' || !document.body) return;
  const el = target || document.querySelector('.ideas150-hub') || document.body;
  if (el) {
    el.classList.add('i150-shaking');
    setTimeout(() => {
      el.classList.remove('i150-shaking');
      el.classList.add('i150-recovered');
      setTimeout(() => el.classList.remove('i150-recovered'), 600);
    }, 450);
  }
}

export function triggerHapticPattern(name = 'success') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  const patterns = {
    success: [40, 30, 40],
    error: [80],
    scan: [20],
    streak: [30, 30, 30, 30],
  };
  const p = patterns[name] || patterns.success;
  navigator.vibrate(p);
}

export function animateConfidenceRing(percent = 94) {
  if (typeof document === 'undefined') return;
  const ring = document.querySelector('.i150-confidence-ring-demo');
  if (!ring) return;
  ring.style.setProperty('--pct', String(percent));
  ring.classList.add('animate');
}

export function applyThemeStudioColor(color) {
  if (!color) return;
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--ideas150-accent', color);
    document.documentElement.style.setProperty('--color-primary', color);
  }
  setStorageItem(COLOR_KEY, color);
}

export function applySeasonalSkin(skin) {
  if (typeof document !== 'undefined' && document.body) {
    document.body.setAttribute('data-ideas150-skin', skin || '');
  }
  setStorageItem(SKIN_KEY, skin || '');
}

export function runClientDemo(feature, result) {
  if (typeof document === 'undefined' || !document.body) return;
  const fx = feature?.fx || feature?.slug;
  if (!fx) return;
  const on = result?.fx_enabled !== false && result?.enabled !== false;
  applyIdeaFx(fx, on);
  if (on) document.body.classList.add('ideas150-fx-active');

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

/** Call once on app boot so Home shows enabled FX without opening hub */
export function initIdeas150FxOnBoot() {
  if (typeof window !== 'undefined') {
    const url = window.location.href;
    if (url.includes('clear_fx') || url.includes('clear-fx') || url.includes('reset_fx')) {
      clearAllIdeaFx();

      // Attempt backend database reset if authenticated
      const token = getStorageItem('token');
      if (token) {
        const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          ? 'http://localhost:8000/api/v1'
          : 'https://smart-attendance-system-1-mvwa.onrender.com/api/v1';

        fetch(`${apiBase}/ideas150/reset-all`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Tenant-Slug': getStorageItem('active_tenant_slug') || 'default'
          }
        }).then(r => r.json())
          .then(data => console.log('Live DB states reset on boot:', data))
          .catch(err => console.error('Failed to reset DB on boot:', err));
      }
      return;
    }
  }
  restoreAllIdeaFx();
}
