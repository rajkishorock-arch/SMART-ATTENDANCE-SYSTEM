/**
 * Production API Client Utility
 * Provides:
 * 1. Request deduplication (reuses in-flight GET promises for duplicate URLs)
 * 2. Automatic AbortController signal handling
 * 3. Client-side performance timing logs ([PERF FETCH])
 */

const activeRequestsMap = new Map();
const abortControllersMap = new Map();

export async function fetchWithDedupe(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const requestKey = `${method}:${url}`;

  // For non-GET requests or explicit skipDedupe, execute directly
  if (!isGet || options.skipDedupe) {
    const startTime = performance.now();
    try {
      const response = await fetch(url, options);
      const duration = (performance.now() - startTime).toFixed(1);
      console.log(`[PERF FETCH] ${method} ${url} took ${duration}ms (status ${response.status})`);
      return response;
    } catch (err) {
      const duration = (performance.now() - startTime).toFixed(1);
      if (err.name !== 'AbortError') {
        console.warn(`[PERF FETCH ERROR] ${method} ${url} failed after ${duration}ms:`, err);
      }
      throw err;
    }
  }

  // Check if an identical GET request is currently in-flight
  if (activeRequestsMap.has(requestKey)) {
    console.log(`[DEDUPE] Reusing in-flight request for: ${url}`);
    return activeRequestsMap.get(requestKey);
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
      console.log(`[PERF FETCH] ${method} ${url} took ${duration}ms (status ${response.status})`);
      return response;
    } catch (err) {
      const duration = (performance.now() - startTime).toFixed(1);
      if (err.name !== 'AbortError') {
        console.warn(`[PERF FETCH ERROR] ${method} ${url} failed after ${duration}ms:`, err);
      }
      throw err;
    } finally {
      activeRequestsMap.delete(requestKey);
    }
  })();

  activeRequestsMap.set(requestKey, requestPromise);
  return requestPromise;
}

export function cancelAbortGroup(groupKey) {
  if (abortControllersMap.has(groupKey)) {
    abortControllersMap.get(groupKey).abort();
    abortControllersMap.delete(groupKey);
  }
}
