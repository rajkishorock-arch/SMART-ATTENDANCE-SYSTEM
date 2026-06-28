const STORAGE_KEY = 'futuristic_features_v1';
const WIDGET_KEY = 'futuristic_widgets_v1';
const ACHIEVEMENT_KEY = 'futuristic_achievements_v1';
const SCAN_STREAK_KEY = 'futuristic_scan_streak_v1';

export const DEFAULT_WIDGETS = ['command', 'stats', 'scanner', 'logs', 'suggestions'];

export const THEME_PRESETS = [
  { id: 'default', label: 'Cyber Blue', primary: '#00f2fe', secondary: '#4facfe' },
  { id: 'matrix', label: 'Matrix Green', primary: '#00ff46', secondary: '#008f11' },
  { id: 'obsidian', label: 'Obsidian Red', primary: '#ff3e3e', secondary: '#b31b1b' },
  { id: 'violet', label: 'Violet Dream', primary: '#a855f7', secondary: '#6366f1' },
  { id: 'sunset', label: 'Sunset Gold', primary: '#fbbf24', secondary: '#f97316' },
];

export const ACHIEVEMENTS = [
  { id: 'first_scan', label: 'First Scan', desc: 'Mark your first attendance scan', icon: '🎯', threshold: 1 },
  { id: 'scan_100', label: 'Century Scanner', desc: '100 total scans completed', icon: '💯', threshold: 100 },
  { id: 'streak_7', label: '7-Day Streak', desc: 'Scan 7 days in a row', icon: '🔥', threshold: 7 },
  { id: 'zero_manual', label: 'Zero Manual Week', desc: 'No manual errors for a week', icon: '✨', threshold: 1 },
  { id: 'classroom_hero', label: 'Classroom Hero', desc: '50 multi-face scans', icon: '🦸', threshold: 50 },
];

export const SMART_SUGGESTIONS = [
  { id: 'classroom', text: 'Try Classroom Mode for multi-face scanning', action: 'scanner' },
  { id: 'geofence', text: 'Enable geofence for exam hall security', action: 'settings_geofence' },
  { id: 'exploration', text: 'Unlock confetti & sound packs in Exploration Lab', action: 'exploration' },
  { id: 'premium', text: 'Upgrade to Premium for advanced analytics', action: 'premium' },
  { id: 'offline', text: 'Enable offline queue for poor network areas', action: 'productivity' },
];

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore quota */ }
}

export function loadFuturisticSettings() {
  return read(STORAGE_KEY, {
    themeId: 'default',
    customPrimary: null,
    soundProfile: 'cyber',
    hapticEnabled: true,
    voiceGuidedScanner: false,
    widgetLayout: [...DEFAULT_WIDGETS],
    easterEggUnlocked: false,
    pushNotificationsEnabled: false,
    onboardingTooltipsDone: false,
  });
}

export function saveFuturisticSettings(settings) {
  write(STORAGE_KEY, settings);
}

export function loadWidgetLayout() {
  const s = loadFuturisticSettings();
  return s.widgetLayout?.length ? s.widgetLayout : [...DEFAULT_WIDGETS];
}

export function saveWidgetLayout(layout) {
  const s = loadFuturisticSettings();
  saveFuturisticSettings({ ...s, widgetLayout: layout });
}

export function applyTheme(themeId, customPrimary) {
  const preset = THEME_PRESETS.find((t) => t.id === themeId) || THEME_PRESETS[0];
  document.body.setAttribute('data-theme', themeId === 'default' ? '' : themeId);
  if (customPrimary) {
    document.documentElement.style.setProperty('--color-primary', customPrimary);
  } else {
    document.documentElement.style.setProperty('--color-primary', preset.primary);
    document.documentElement.style.setProperty('--color-secondary', preset.secondary);
  }
  const s = loadFuturisticSettings();
  saveFuturisticSettings({ ...s, themeId, customPrimary });
}

export function recordScan(count = 1) {
  const today = new Date().toISOString().slice(0, 10);
  const data = read(SCAN_STREAK_KEY, { today, count: 0, total: 0, days: [] });
  if (data.today === today) {
    data.count += count;
  } else {
    if (data.today) data.days = [...(data.days || []), data.today].slice(-30);
    data.today = today;
    data.count = count;
  }
  data.total = (data.total || 0) + count;
  write(SCAN_STREAK_KEY, data);
  checkAchievements(data);
  return data;
}

export function getScanStreakLocal() {
  return read(SCAN_STREAK_KEY, { today: null, count: 0, total: 0, days: [] });
}

export function loadAchievements() {
  return read(ACHIEVEMENT_KEY, {});
}

export function unlockAchievement(id) {
  const ach = read(ACHIEVEMENT_KEY, {});
  if (!ach[id]) {
    ach[id] = { unlockedAt: new Date().toISOString() };
    write(ACHIEVEMENT_KEY, ach);
    return true;
  }
  return false;
}

function checkAchievements(streakData) {
  if (streakData.total >= 1) unlockAchievement('first_scan');
  if (streakData.total >= 100) unlockAchievement('scan_100');
  const uniqueDays = new Set(streakData.days || []);
  if (streakData.today) uniqueDays.add(streakData.today);
  if (uniqueDays.size >= 7) unlockAchievement('streak_7');
}

export function bumpEasterEgg() {
  const key = 'easter_egg_taps';
  const taps = parseInt(sessionStorage.getItem(key) || '0', 10) + 1;
  sessionStorage.setItem(key, String(taps));
  if (taps >= 7) {
    const s = loadFuturisticSettings();
    saveFuturisticSettings({ ...s, easterEggUnlocked: true });
    applyTheme('violet');
    return true;
  }
  return false;
}

export function checkKonamiCode(sequence) {
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  if (sequence.length >= KONAMI.length) {
    const tail = sequence.slice(-KONAMI.length);
    if (tail.every((k, i) => k.toLowerCase() === KONAMI[i].toLowerCase())) {
      const s = loadFuturisticSettings();
      saveFuturisticSettings({ ...s, easterEggUnlocked: true });
      applyTheme('matrix');
      return true;
    }
  }
  return false;
}

export function getDismissedSuggestions() {
  return read('dismissed_suggestions', []);
}

export function dismissSuggestion(id) {
  const list = getDismissedSuggestions();
  if (!list.includes(id)) {
    write('dismissed_suggestions', [...list, id]);
  }
}

export function speakScanner(message) {
  if (!message || typeof window === 'undefined') return;
  const s = loadFuturisticSettings();
  if (!s.voiceGuidedScanner) return;
  try {
    const u = new SpeechSynthesisUtterance(message);
    u.lang = 'hi-IN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export function triggerHaptic(pattern = [30]) {
  const s = loadFuturisticSettings();
  if (!s.hapticEnabled) return;
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch { /* ignore */ }
}
