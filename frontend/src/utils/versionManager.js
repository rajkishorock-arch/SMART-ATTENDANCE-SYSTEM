import pkg from '../../package.json';

export const APP_VERSION = (pkg.version || '1.0.2').replace(/^v/i, '');

const ACK_KEY = 'smart_attendance_acknowledged_versions';
const INSTALLED_KEY = 'smart_attendance_installed_version';

export function parseVersion(version) {
  return (version || '0.0.0')
    .replace(/^v/i, '')
    .split('.')
    .map((part) => parseInt(part, 10) || 0);
}

/** Returns 1 if a > b, -1 if a < b, 0 if equal */
export function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i += 1) {
    const av = pa[i] || 0;
    const bv = pb[i] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

export function isUpdateNewer(serverVersion, clientVersion = APP_VERSION) {
  if (!serverVersion || serverVersion === '0.0.0') return false;
  return compareVersions(serverVersion, clientVersion) > 0;
}

export function getAcknowledgedVersions() {
  try {
    const raw = localStorage.getItem(ACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function acknowledgeUpdateVersion(version) {
  const normalized = (version || '').replace(/^v/i, '');
  if (!normalized) return;
  const list = getAcknowledgedVersions();
  if (!list.includes(normalized)) {
    list.push(normalized);
    localStorage.setItem(ACK_KEY, JSON.stringify(list));
  }
  localStorage.setItem(INSTALLED_KEY, normalized);
}

export function isVersionAcknowledged(version) {
  const normalized = (version || '').replace(/^v/i, '');
  return getAcknowledgedVersions().includes(normalized);
}

export function getInstalledVersion() {
  return localStorage.getItem(INSTALLED_KEY) || APP_VERSION;
}

export function markCurrentVersionInstalled() {
  localStorage.setItem(INSTALLED_KEY, APP_VERSION);
}

export function shouldShowUpdateBanner(serverVersion, updateActive = true) {
  if (!updateActive) return false;
  if (!isUpdateNewer(serverVersion, APP_VERSION)) return false;
  if (isVersionAcknowledged(serverVersion)) return false;
  return true;
}

export function getVersionStatusLabel(serverLatest, updateActive = true) {
  if (!updateActive) {
    return { label: `v${APP_VERSION}`, sub: 'Up to date', tone: 'success' };
  }
  if (isUpdateNewer(serverLatest, APP_VERSION)) {
    return { label: `v${APP_VERSION}`, sub: `Update v${serverLatest} available`, tone: 'warn' };
  }
  if (compareVersions(APP_VERSION, serverLatest || APP_VERSION) >= 0) {
    return { label: `v${APP_VERSION}`, sub: 'Latest version', tone: 'success' };
  }
  return { label: `v${APP_VERSION}`, sub: 'Current release', tone: 'success' };
}
