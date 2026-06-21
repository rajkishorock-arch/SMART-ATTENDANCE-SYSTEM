import React, { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { getActiveTenantSlug } from './utils/tenantConfig'

// Global Fetch Interceptor to inject X-Tenant-Slug header into all backend API calls
const originalFetch = window.fetch;
window.fetch = async function (url, options = {}) {
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'https://smart-attendance-system-1-mvwa.onrender.com/api/v1';
  const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.href : '');
  
  if (urlStr.includes('/api/v1') || (apiBase && urlStr.startsWith(apiBase))) {
    options.headers = {
      ...options.headers,
      'X-Tenant-Slug': getActiveTenantSlug()
    };
  }
  return originalFetch.call(this, url, options);
};

import App from './App.jsx'

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
    try {
      const now = Date.now();
      const lastCrash = sessionStorage.getItem('app_last_crash_time');
      const crashCountStr = sessionStorage.getItem('app_crash_count');
      
      const lastCrashTime = lastCrash ? parseInt(lastCrash, 10) : 0;
      const crashCount = crashCountStr ? parseInt(crashCountStr, 10) : 0;
      
      if (now - lastCrashTime < 8000) {
        const newCount = crashCount + 1;
        sessionStorage.setItem('app_crash_count', newCount.toString());
        sessionStorage.setItem('app_last_crash_time', now.toString());
        if (newCount >= 3) {
          console.warn("Frequent crashes detected. Suppressing auto-refresh to prevent loop.");
          return; // Show custom error UI, do not reload
        }
      } else {
        sessionStorage.setItem('app_crash_count', '1');
        sessionStorage.setItem('app_last_crash_time', now.toString());
      }
      
      // Auto-reload after 600ms
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (e) {
      console.error("Error boundary recovery failure:", e);
    }
  }

  handleForceReset = () => {
    sessionStorage.clear();
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // High-tech, futuristic error fallback screen
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          background: '#080c14',
          color: '#f1f5f9',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '550px',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Glowing red accent header line */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #ef4444, #b91c1c)'
            }} />
            
            <h2 style={{
              color: '#ef4444',
              fontSize: '1.4rem',
              fontWeight: 'bold',
              marginBottom: '16px',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '1.8rem' }}>⚠️</span> CORE SYSTEM CRASH
            </h2>
            
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '24px' }}>
              The application encountered a critical runtime exception. The system attempted to recover automatically, but repeated crashes were detected. This usually indicates an unexpected state or server response.
            </p>
            
            <div style={{
              background: '#020617',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'left',
              fontSize: '0.8rem',
              color: '#f87171',
              overflowX: 'auto',
              marginBottom: '28px',
              maxHeight: '120px',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace'
            }}>
              <strong>EXCEPTION:</strong> {this.state.error ? this.state.error.toString() : 'Unknown Error'}
            </div>
            
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-start' }}>
              <button 
                onClick={() => {
                  sessionStorage.setItem('app_crash_count', '0');
                  window.location.reload();
                }} 
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  transition: 'transform 0.15s, opacity 0.15s'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                REBOOT APPLICATION
              </button>
              <button 
                onClick={this.handleForceReset}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
              >
                RESET SYSTEM STATE
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
