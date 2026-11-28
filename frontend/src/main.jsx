import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { getActiveTenantSlug } from './utils/tenantConfig'

import { clearApiClientCache } from './utils/apiClient';
import { getApiBaseUrl } from './utils/platform';

// Global Fetch Interceptor to inject X-Tenant-Slug header into all backend API calls
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const apiBase = getApiBaseUrl();
  const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.href : '');
  
  if (urlStr.includes('/api/v1') || (apiBase && urlStr.startsWith(apiBase))) {
    const rawHeaders = options.headers;
    if (typeof Headers !== 'undefined' && rawHeaders instanceof Headers) {
      if (!rawHeaders.has('X-Tenant-Slug')) {
        rawHeaders.set('X-Tenant-Slug', getActiveTenantSlug());
      }
    } else {
      const headerMap = { ...(rawHeaders || {}) };
      const hasTenantHeader = Object.keys(headerMap).some((k) => k.toLowerCase() === 'x-tenant-slug');
      if (!hasTenantHeader) {
        headerMap['X-Tenant-Slug'] = getActiveTenantSlug();
      }
      options.headers = headerMap;
    }
  }
  const response = await originalFetch.call(this, url, options);
  if (response.ok && apiBase && urlStr.startsWith(apiBase + '/') &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase()) &&
      !urlStr.includes('/auth/heartbeat')) {
    clearApiClientCache();
  }
  return response;
};

import './styles/futuristicFeatures.css';
import './styles/extremeFeatures.css';
import './styles/ideas150.css';
import App from './App.jsx'
import ApplePointerMotionLayer from './components/animations/ApplePointerMotionLayer'
import { UIProvider } from './context/UIContext';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { initIdeas150FxOnBoot } from './utils/ideas150Effects'

try {
  initIdeas150FxOnBoot();
} catch { /* ignore */ }

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an uncaught crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert" style={{ padding: 'clamp(24px, 8vw, 80px)', maxWidth: 520, margin: 'auto' }}>
          <h1>This screen couldn’t load</h1>
          <p>Try opening Smart Attendance again.</p>
          <button type="button" onClick={() => window.location.reload()}>Reload app</button>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <UIProvider>
        <AuthProvider>
          <TenantProvider>
            <ApplePointerMotionLayer />
            <App />
          </TenantProvider>
        </AuthProvider>
      </UIProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Register Service Worker & auto-sync live production deployments silently without version popups
if (typeof window !== 'undefined' && !window.Capacitor?.isNativePlatform?.()) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js', { updateViaCache: 'none' })
        .then((reg) => {
          reg.update().catch(() => {});
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              reg.update().catch(() => {});
            }
          });
        })
        .catch(() => {});
    });
  }

  // Silently detect new deployed JS bundle hash on resume/focus and apply immediately
  let lastLiveSyncCheck = 0;
  const syncLiveWebBundle = async () => {
    const now = Date.now();
    if (now - lastLiveSyncCheck < 25000 || !navigator.onLine) return;
    lastLiveSyncCheck = now;
    try {
      const activeScript = document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute('src');
      if (!activeScript) return;
      const res = await originalFetch(`/index.html?t=${now}`, { cache: 'no-store' });
      if (!res.ok) return;
      const html = await res.text();
      const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
      if (match && match[1] && match[1] !== activeScript && !sessionStorage.getItem(`ota_reloaded_${match[1]}`)) {
        sessionStorage.setItem(`ota_reloaded_${match[1]}`, '1');
        window.location.reload();
      }
    } catch { /* offline or preview server */ }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncLiveWebBundle();
  });
}
