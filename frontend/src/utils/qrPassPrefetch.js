import QRCode from 'qrcode';

const memoryPassMap = new Map();
const inflightMap = new Map();

const cacheKeyForToken = (authToken) => {
  if (!authToken) return 'default';
  return String(authToken).slice(-20);
};

export const getCachedStudentQrPass = (authToken) => {
  if (!authToken) return null;
  const k = cacheKeyForToken(authToken);
  const mem = memoryPassMap.get(k);
  if (mem && mem.expiresAt > Date.now() + 2500 && mem.image) {
    return mem;
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(`sg_qr_pass_${k}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.expiresAt > Date.now() + 2500 && parsed.image) {
          memoryPassMap.set(k, parsed);
          return parsed;
        }
      }
    }
  } catch {
    // ignore storage access issues
  }
  return null;
};

export const prefetchStudentQrPass = async (API_BASE_URL, authToken, { force = false } = {}) => {
  if (!API_BASE_URL || !authToken) return null;
  const k = cacheKeyForToken(authToken);

  if (!force) {
    const existing = getCachedStudentQrPass(authToken);
    if (existing && existing.expiresAt > Date.now() + 18000) {
      return existing;
    }
    if (inflightMap.has(k)) {
      return inflightMap.get(k);
    }
  }

  const task = (async () => {
    const started = Date.now();
    const res = await fetch(`${API_BASE_URL}/users/students/me/qr-token`, {
      headers: { Authorization: `Bearer ${authToken}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`QR token request failed (HTTP ${res.status})`);
    }
    const data = await res.json();
    const expiresAt = started + Number(data.expires_in || 45) * 1000;
    if (!data.token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      throw new Error('Invalid check-in token payload');
    }
    const image = await QRCode.toDataURL(data.token, {
      width: 520,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1c160c',
        light: '#ffffff',
      },
    });
    const entry = {
      image,
      token: data.token,
      expiresAt,
      resultCursor: data.result_cursor ?? 0,
    };
    memoryPassMap.set(k, entry);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(`sg_qr_pass_${k}`, JSON.stringify(entry));
      }
    } catch {
      // ignore storage quota errors
    }
    return entry;
  })();

  inflightMap.set(k, task);
  try {
    return await task;
  } finally {
    if (inflightMap.get(k) === task) {
      inflightMap.delete(k);
    }
  }
};
