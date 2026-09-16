/**
 * Stale-While-Revalidate Local Cache Utility
 * Provides 0ms instant cached UI loading with background freshness revalidation.
 */

const DEFAULT_CACHE_MAX_AGE_MS = 45000; // 45 seconds (30-60s range)

export function getCachedData(cacheKey) {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getCachedTimestamp(cacheKey) {
  try {
    const ts = localStorage.getItem(`${cacheKey}_timestamp`);
    return ts ? parseInt(ts, 10) : 0;
  } catch {
    return 0;
  }
}

export function setCachedData(cacheKey, data) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString());
  } catch {
    // Ignore storage quota errors
  }
}

export function isCacheStale(cacheKey, maxAgeMs = DEFAULT_CACHE_MAX_AGE_MS) {
  const ts = getCachedTimestamp(cacheKey);
  if (!ts) return true;
  return Date.now() - ts > maxAgeMs;
}

/**
 * Execute stale-while-revalidate pattern:
 * 1. If cache exists, invoke setStateFn immediately with cached data.
 * 2. If cache is stale or missing, invoke fetchFn in background and update state/cache on completion.
 */
export async function fetchWithStaleCache(cacheKey, fetchFn, setStateFn, maxAgeMs = DEFAULT_CACHE_MAX_AGE_MS) {
  const cachedData = getCachedData(cacheKey);
  let hasCachedValue = false;

  if (cachedData !== null) {
    setStateFn(cachedData);
    hasCachedValue = true;
  }

  // If we have fresh cached data and it's within freshness window, skip background fetch
  if (hasCachedValue && !isCacheStale(cacheKey, maxAgeMs)) {
    return cachedData;
  }

  // Trigger revalidation fetch in background
  try {
    const freshData = await fetchFn();
    if (freshData !== undefined && freshData !== null) {
      setCachedData(cacheKey, freshData);
      setStateFn(freshData);
    }
    return freshData;
  } catch (err) {
    // If background revalidation fails, keep serving cached data without breaking UI
    if (hasCachedValue) {
      console.warn(`[CACHE STALE REVALIDATION FAILED] Serving cached data for ${cacheKey}`, err);
      return cachedData;
    }
    throw err;
  }
}
