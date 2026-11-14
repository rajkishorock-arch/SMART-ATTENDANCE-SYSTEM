/**
 * Production API Client Utility
 * Provides:
 * 1. Request deduplication (reuses in-flight GET promises for duplicate URLs)
 * 2. In-memory short-lived read caching (0ms instant page loads, prevents backend saturation)
 * 3. Automatic AbortController signal handling
 * 4. Client-side performance timing logs ([PERF FETCH])
 */

const activeRequestsMap = new Map();
const abortControllersMap = new Map();
const memoryCacheMap = new Map();
const isDev = Boolean(import.meta.env?.DEV) || (typeof window !== 'undefined' && Boolean(window.__DEBUG_ATTENDANCE__));

function getEndpointTtl(url, options = {}) {
  if (options.noCache || options.skipCache) return 0;
  if (url.includes('/auth/token') || url.includes('/auth/heartbeat') || url.includes('/ws')) return 0;

  // Attendance history, logs, and dashboard telemetry (0ms instant page loads)
  if (url.includes('/attendance/logs') || url.includes('/attendance/sessions-history')) {
    return 60000; // 60 seconds
  }
  if (url.includes('/attendance/stats') || url.includes('/attendance/my-report') || url.includes('/attendance/my-calendar')) {
    return 30000; // 30 seconds
  }
  if (url.includes('/students') || url.includes('/subjects') || url.includes('/teachers')) {
    return 60000; // 60 seconds
  }

  // Frequently queried setting/metadata endpoints
  if (url.includes('/departments') || url.includes('/institutions') || url.includes('/settings') || url.includes('/premium/status')) {
    return 45000; // 45 seconds
  }
  if (url.includes('/health')) {
    return 15000; // 15 seconds
  }
  return 0;
}

export function clearApiClientCache() {
  memoryCacheMap.clear();
  activeRequestsMap.clear();
}

export async function fetchWithDedupe(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const authHeader = options?.headers?.Authorization || options?.headers?.authorization || '';
  const tokenHash = authHeader ? String(authHeader).slice(-16) : 'anon';
  const requestKey = `${method}:${url}:${tokenHash}`;

  // Invalidate read cache on write mutations
  if (!isGet) {
    memoryCacheMap.clear();
  }

  // Check read cache for eligible GET requests
  const ttl = isGet ? getEndpointTtl(url, options) : 0;
  if (ttl > 0 && memoryCacheMap.has(requestKey)) {
    const cached = memoryCacheMap.get(requestKey);
    if (Date.now() - cached.timestamp < ttl) {
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: new Headers(cached.headers),
      });
    } else {
      memoryCacheMap.delete(requestKey);
    }
  }

  // For non-GET requests or explicit skipDedupe, execute directly
  if (!isGet || options.skipDedupe) {
    const startTime = performance.now();
    try {
      const response = await fetch(url, options);
      const duration = (performance.now() - startTime).toFixed(1);
      if (isDev) {
        console.log(`[PERF FETCH] ${method} ${url} took ${duration}ms (status ${response.status})`);
      }
      return response;
    } catch (err) {
      const duration = (performance.now() - startTime).toFixed(1);
      if (isDev && err.name !== 'AbortError') {
        console.warn(`[PERF FETCH ERROR] ${method} ${url} failed after ${duration}ms:`, err);
      }
      throw err;
    }
  }

  // Check if an identical GET request is currently in-flight
  if (activeRequestsMap.has(requestKey)) {
    if (isDev) {
      console.log(`[DEDUPE] Reusing in-flight request for: ${url}`);
    }
    try {
      const inFlightResponse = await activeRequestsMap.get(requestKey);
      return inFlightResponse.clone();
    } catch (err) {
      throw err;
    }
  }

  // Create AbortController for controller cancellation if needed
  if (options.abortGroupKey) {
    if (abortControllersMap.has(options.abortGroupKey)) {
      abortControllersMap.get(options.abortGroupKey).abort();
    }
    const controller = new AbortController();
    abortControllersMap.set(options.abortGroupKey, controller);
    options.signal = controller.signal;
  }

  const startTime = performance.now();
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, options);
      const duration = (performance.now() - startTime).toFixed(1);
      if (isDev) {
        console.log(`[PERF FETCH] ${method} ${url} took ${duration}ms (status ${response.status})`);
      }

      // Cache successful response in memory if eligible
      if (ttl > 0 && response.ok) {
        try {
          const bodyClone = await response.clone().text();
          const headersObj = {};
          response.headers.forEach((v, k) => { headersObj[k] = v; });
          memoryCacheMap.set(requestKey, {
            body: bodyClone,
            status: response.status,
            statusText: response.statusText,
            headers: headersObj,
            timestamp: Date.now(),
          });
        } catch { /* ignore cache cloning errors */ }
      }

      return response;
    } catch (err) {
      const duration = (performance.now() - startTime).toFixed(1);
      if (isDev && err.name !== 'AbortError') {
        console.warn(`[PERF FETCH ERROR] ${method} ${url} failed after ${duration}ms:`, err);
      }
      throw err;
    } finally {
      setTimeout(() => {
        activeRequestsMap.delete(requestKey);
      }, 60);
    }
  })();

  activeRequestsMap.set(requestKey, requestPromise);
  const finalResponse = await requestPromise;
  return finalResponse.clone();
}

export function cancelAbortGroup(groupKey) {
  if (abortControllersMap.has(groupKey)) {
    abortControllersMap.get(groupKey).abort();
    abortControllersMap.delete(groupKey);
  }
}
