/**
 * Render Cold-Start Eliminator & Server Heartbeat Engine
 * Keeps Render backend awake 24/7 with 4-minute heartbeat pings.
 */
import { getApiBaseUrl } from './platform';

const API_BASE_URL = getApiBaseUrl();
const PING_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

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
    } catch (e) {
      // Ignore network failures
    }
  };

  // 1. Immediate pre-warm ping on app load
  pingServer();

  // 2. Heartbeat interval every 4 minutes while app tab is active
  setInterval(pingServer, PING_INTERVAL_MS);

  // 3. Ping on tab visibility change (when user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pingServer();
    }
  });
}
