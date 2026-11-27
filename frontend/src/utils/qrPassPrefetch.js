import QRCode from 'qrcode';

const DEFAULT_TTL_MS = 45000;
const MIN_VALID_MS = 3000;
const FETCH_TIMEOUT_MS = 6500;
const PRE_RENDER_COUNT = 3;

const stateByKey = new Map();
const inflightMap = new Map();

const cacheKeyForToken = (authToken) => {
  if (!authToken) return 'default';
  return String(authToken).slice(-20);
};

const renderQrPng = (rawToken) => QRCode.toDataURL(rawToken, {
  width: 520,
  margin: 4,
  errorCorrectionLevel: 'M',
  color: {
    dark: '#1c160c',
    light: '#ffffff',
  },
});

const readPersistedState = (k) => {
  for (const store of [typeof sessionStorage !== 'undefined' ? sessionStorage : null, typeof localStorage !== 'undefined' ? localStorage : null]) {
    if (!store) continue;
    try {
      const raw = store.getItem(`sg_qr_queue_v2_${k}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // ignore storage errors
    }
  }
  return null;
};

const writePersistedState = (k, state) => {
  const payload = JSON.stringify({
    active: state.active || null,
    queue: Array.isArray(state.queue) ? state.queue : [],
    resultCursor: state.resultCursor ?? 0,
  });
  for (const store of [typeof sessionStorage !== 'undefined' ? sessionStorage : null, typeof localStorage !== 'undefined' ? localStorage : null]) {
    if (!store) continue;
    try {
      store.setItem(`sg_qr_queue_v2_${k}`, payload);
    } catch {
      // ignore storage quota errors
    }
  }
};

const loadState = (authToken) => {
  if (!authToken) return null;
  const k = cacheKeyForToken(authToken);
  if (stateByKey.has(k)) return stateByKey.get(k);
  const persisted = readPersistedState(k);
  if (persisted) {
    stateByKey.set(k, persisted);
    return persisted;
  }
  return null;
};

const saveState = (authToken, state) => {
  if (!authToken || !state) return;
  const k = cacheKeyForToken(authToken);
  stateByKey.set(k, state);
  writePersistedState(k, state);
};

const pruneQueue = (queue, nowMs) => {
  if (!Array.isArray(queue)) return [];
  return queue.filter(slot => slot && slot.token && slot.serverExpiresAt > nowMs + MIN_VALID_MS);
};

/**
 * Synchronous 0ms cache lookup for instant mount & expiry rollover.
 * Promotes an already pre-rendered queued slot if the active slot has expired.
 */
export const getCachedStudentQrPass = (authToken) => {
  const state = loadState(authToken);
  if (!state) return null;
  const nowMs = Date.now();

  if (state.active && state.active.image && state.active.expiresAt > nowMs + MIN_VALID_MS) {
    return state.active;
  }

  const validQueue = pruneQueue(state.queue, nowMs);
  const readyIdx = validQueue.findIndex(slot => slot.image);
  if (readyIdx !== -1) {
    const picked = validQueue[readyIdx];
    const remainingQueue = validQueue.slice(readyIdx + 1);
    const nextActive = {
      image: picked.image,
      token: picked.token,
      expiresAt: Math.min(picked.serverExpiresAt, nowMs + (picked.ttlMs || DEFAULT_TTL_MS)),
      serverExpiresAt: picked.serverExpiresAt,
      resultCursor: state.resultCursor ?? 0,
    };
    saveState(authToken, { active: nextActive, queue: remainingQueue, resultCursor: state.resultCursor ?? 0 });
    return nextActive;
  }

  return null;
};

/**
 * Promotes the next single-use pre-signed pass from the queue (rendering PNG on-the-fly in ~8ms if needed).
 * Used both for seamless 0ms auto-rotation at timer end AND instant manual Refresh Code.
 */
export const promoteQueuedStudentQrPass = async (authToken) => {
  const state = loadState(authToken);
  if (!state) return null;
  const nowMs = Date.now();
  const validQueue = pruneQueue(state.queue, nowMs);
  if (validQueue.length === 0) return null;

  const [picked, ...rest] = validQueue;
  const image = picked.image || await renderQrPng(picked.token);
  const nextActive = {
    image,
    token: picked.token,
    expiresAt: Math.min(picked.serverExpiresAt, nowMs + (picked.ttlMs || DEFAULT_TTL_MS)),
    serverExpiresAt: picked.serverExpiresAt,
    resultCursor: state.resultCursor ?? 0,
  };

  // Pre-render the next buffered slot silently so future rollover/refresh stays 0ms
  const nextState = { active: nextActive, queue: rest, resultCursor: state.resultCursor ?? 0 };
  saveState(authToken, nextState);
  prewarmQueueImages(authToken, nextState).catch(() => {});

  return { pass: nextActive, queueRemaining: rest.length };
};

const prewarmQueueImages = async (authToken, state) => {
  if (!state || !Array.isArray(state.queue)) return;
  let updated = false;
  const nextQueue = [...state.queue];
  for (let i = 0; i < Math.min(PRE_RENDER_COUNT, nextQueue.length); i += 1) {
    if (nextQueue[i] && !nextQueue[i].image) {
      nextQueue[i] = { ...nextQueue[i], image: await renderQrPng(nextQueue[i].token) };
      updated = true;
    }
  }
  if (updated) {
    const latest = loadState(authToken) || state;
    saveState(authToken, {
      ...latest,
      queue: latest.queue.map(slot => {
        const rendered = nextQueue.find(n => n.token === slot.token && n.image);
        return rendered || slot;
      }),
    });
  }
};

const fetchWithTimeout = async (url, options, timeoutMs = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

export const prefetchStudentQrPass = async (API_BASE_URL, authToken, { force = false } = {}) => {
  if (!API_BASE_URL || !authToken) return null;
  const k = cacheKeyForToken(authToken);

  if (!force) {
    const existing = getCachedStudentQrPass(authToken);
    const state = loadState(authToken);
    const qLen = pruneQueue(state?.queue, Date.now()).length;
    if (existing && existing.expiresAt > Date.now() + 18000 && qLen >= 3) {
      return existing;
    }
    if (inflightMap.has(k)) {
      return inflightMap.get(k);
    }
  }

  const task = (async () => {
    let lastError = null;
    let payload = null;
    let started = Date.now();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        started = Date.now();
        const res = await fetchWithTimeout(`${API_BASE_URL}/users/students/me/qr-token`, {
          headers: { Authorization: `Bearer ${authToken}` },
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(`QR token request failed (HTTP ${res.status})`);
        }
        payload = await res.json();
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!payload) {
      throw lastError || new Error('Unable to fetch QR token');
    }

    const ttlMs = Number(payload.expires_in || 45) * 1000;
    const activeExpiresAt = started + ttlMs;
    if (!payload.token || !Number.isFinite(activeExpiresAt) || activeExpiresAt <= Date.now()) {
      throw new Error('Invalid check-in token payload');
    }

    const upcomingRaw = Array.isArray(payload.upcoming) ? payload.upcoming : [];
    const queueEntries = upcomingRaw
      .filter(u => u && u.token)
      .map(u => ({
        token: u.token,
        ttlMs: Number(u.ttl || 45) * 1000,
        serverExpiresAt: started + Number(u.expires_in || 90) * 1000,
        image: null,
      }))
      .filter(u => u.serverExpiresAt > Date.now() + MIN_VALID_MS);

    // Render active QR + pre-render first queued slot immediately so next refresh/expiry is 0ms
    const [activeImage, firstQueuedImage] = await Promise.all([
      renderQrPng(payload.token),
      queueEntries[0] ? renderQrPng(queueEntries[0].token) : Promise.resolve(null),
    ]);
    if (queueEntries[0] && firstQueuedImage) {
      queueEntries[0].image = firstQueuedImage;
    }

    const activeEntry = {
      image: activeImage,
      token: payload.token,
      expiresAt: activeExpiresAt,
      serverExpiresAt: activeExpiresAt,
      resultCursor: payload.result_cursor ?? 0,
    };

    const nextState = {
      active: activeEntry,
      queue: queueEntries,
      resultCursor: payload.result_cursor ?? 0,
    };
    saveState(authToken, nextState);
    prewarmQueueImages(authToken, nextState).catch(() => {});

    return activeEntry;
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
