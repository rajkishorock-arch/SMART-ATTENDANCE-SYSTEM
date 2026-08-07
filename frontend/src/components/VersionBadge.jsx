import React, { useState } from 'react';
import { APP_VERSION, getVersionStatusLabel } from '../utils/versionManager';
import { RefreshCw, Download, CheckCircle, ShieldCheck, Sparkles, AlertCircle, Layers, Cpu } from 'lucide-react';

export default function VersionBadge({ serverLatest, updateActive, compact = false, onCheckUpdate }) {
  const [checking, setChecking] = useState(false);
  const status = getVersionStatusLabel(serverLatest, updateActive);

  const handleCheck = async () => {
    setChecking(true);
    if (onCheckUpdate) await onCheckUpdate();
    setTimeout(() => setChecking(false), 1200);
  };

  const isNewAvailable = status.tone === 'warn' || (serverLatest && serverLatest !== APP_VERSION);

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleCheck}
        title={`App version ${APP_VERSION} — ${status.sub}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '999px',
          border: isNewAvailable ? '1px solid #fbbf24' : '1px solid #10b981',
          background: isNewAvailable ? 'rgba(251, 191, 36, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          color: isNewAvailable ? '#fbbf24' : '#10b981',
          fontSize: '0.78rem',
          fontWeight: 800,
          cursor: 'pointer',
          fontFamily: 'Inter, monospace',
          boxShadow: isNewAvailable ? '0 0 10px rgba(251, 191, 36, 0.3)' : 'none',
          transition: 'all 0.2s ease'
        }}
      >
        <span style={{ fontSize: '0.85rem' }}>{isNewAvailable ? '🔥' : '✨'}</span>
        v{APP_VERSION} {isNewAvailable ? `(Update v${serverLatest || '1.0.29'} Available)` : '• Latest'}
      </button>
    );
  }

  return (
    <div style={{
      width: '100%',
      padding: '24px',
      borderRadius: '24px',
      background: isNewAvailable
        ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)'
        : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(0, 242, 254, 0.08) 100%)',
      border: isNewAvailable ? '1.5px solid #fbbf24' : '1.5px solid #10b981',
      boxShadow: isNewAvailable ? '0 10px 30px rgba(251, 191, 36, 0.15)' : '0 10px 30px rgba(16, 185, 129, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      color: '#fff'
    }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: isNewAvailable ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            border: isNewAvailable ? '1px solid #fbbf24' : '1px solid #10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem'
          }}>
            {isNewAvailable ? '🚀' : '✅'}
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
              {isNewAvailable ? '🔥 New Feature Update Available!' : '✨ App is Fully Up to Date!'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: '2px' }}>
              Running Version: <strong style={{ color: isNewAvailable ? '#fbbf24' : '#10b981' }}>v{APP_VERSION}</strong>
              {serverLatest ? ` • Latest Server Build: v${serverLatest}` : ' • Production Channel'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCheck}
          disabled={checking}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            fontSize: '0.82rem',
            fontWeight: 800,
            cursor: checking ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          <RefreshCw size={14} style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
          {checking ? 'Checking Server...' : 'Check For Updates'}
        </button>
      </div>

      {/* Changelog Highlights */}
      <div style={{
        background: 'rgba(8, 12, 24, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ fontSize: '0.78rem', color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📦 Version v{serverLatest || APP_VERSION} Release Highlights:
        </div>
        <div style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>✨ <strong>1-Tap WhatsApp & SMTP Parent Alert Dispatcher</strong></div>
          <div>⏰ <strong>Automated 5:01 PM Daily Attendance Email Digest Engine</strong></div>
          <div>🎨 <strong>Cyberpunk Glassmorphic Exploration & Futuristic Hub UI</strong></div>
        </div>
      </div>
    </div>
  );
}
