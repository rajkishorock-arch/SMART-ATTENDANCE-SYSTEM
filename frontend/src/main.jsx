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
            <App />
          </TenantProvider>
        </AuthProvider>
      </UIProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Register Service Worker for seamless offline PWA web access
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !window.Capacitor?.isNativePlatform?.()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => {
        console.log('[ServiceWorker] Registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[ServiceWorker] Registration failed:', err);
      });
  });
}
