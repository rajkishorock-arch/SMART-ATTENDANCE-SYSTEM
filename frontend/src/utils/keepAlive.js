/**
 * Render Cold-Start Eliminator & Server Heartbeat Engine
 * Keeps Render backend awake 24/7 with 4-minute heartbeat pings.
 */
import { getApiBaseUrl } from './platform';

const API_BASE_URL = getApiBaseUrl();
const PING_INTERVAL_MS = 90 * 1000; // 90 seconds keep-alive while active
const VISIBILITY_PING_THRESHOLD_MS = 60 * 1000; // Re-warm if hidden >= 60s

let isInitialized = false;

export function initKeepAliveEngine() {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  const pingServer = async () => {
    try {
      await fetch(`${API_BASE_URL}/health/ping`, {
        method: 'GET',
        cache: 'no-store'
      });
    } catch {
      // Ignore network failures
    }
  };

  let lastPingTime = Date.now();

  // 1. Immediate pre-warm ping on app load
  pingServer();

  // 2. Heartbeat interval every 4 minutes while app tab is active
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      pingServer();
      lastPingTime = Date.now();
    }
  }, PING_INTERVAL_MS);

  // 3. Throttle ping on tab visibility change (only if hidden >= threshold)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (Date.now() - lastPingTime > VISIBILITY_PING_THRESHOLD_MS)) {
      pingServer();
      lastPingTime = Date.now();
    }
  });
}
