import { useState } from 'react';
import { APP_VERSION, getVersionStatusLabel } from '../utils/versionManager';
import { RefreshCw } from 'lucide-react';

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
          padding: '4px 10px',
          borderRadius: '999px',
          border: isNewAvailable ? '1px solid #fcd34d' : '1px solid #86efac',
          background: isNewAvailable ? '#fffbeb' : '#f0fdf4',
          color: isNewAvailable ? '#b45309' : '#15803d',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.2s ease',
          maxWidth: '100%',
          whiteSpace: 'nowrap'
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isNewAvailable ? '#f59e0b' : '#10b981', display: 'inline-block' }} />
        v{APP_VERSION}
      </button>
    );
  }

  return (
    <div style={{
      width: '100%',
      padding: '24px',
      borderRadius: '20px',
      background: isNewAvailable ? '#fffbeb' : '#f0fdf4',
      border: isNewAvailable ? '1.5px solid #fcd34d' : '1.5px solid #86efac',
      boxShadow: isNewAvailable ? '0 4px 16px rgba(245, 158, 11, 0.06)' : '0 4px 16px rgba(16, 185, 129, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      color: '#0f172a'
    }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: isNewAvailable ? '#fef3c7' : '#dcfce7',
            border: isNewAvailable ? '1px solid #fde68a' : '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem'
          }}>
            {isNewAvailable ? '🚀' : '✅'}
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: isNewAvailable ? '#92400e' : '#166534' }}>
              {isNewAvailable ? '🔥 New Feature Update Available!' : '✨ App is Fully Up to Date!'}
            </div>
            <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '2px' }}>
              Running Version: <strong style={{ color: isNewAvailable ? '#b45309' : '#15803d' }}>v{APP_VERSION}</strong>
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
            borderRadius: '10px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#0f172a',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: checking ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}
        >
          <RefreshCw size={14} style={{ animation: checking ? 'spin 1s linear infinite' : 'none' }} />
          {checking ? 'Checking Server...' : 'Check For Updates'}
        </button>
      </div>

      {/* Changelog Highlights */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ fontSize: '0.78rem', color: '#6d28d9', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📦 Version v{serverLatest || APP_VERSION} Release Highlights:
        </div>
        <div style={{ fontSize: '0.86rem', color: '#1e293b', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div>✨ <strong>1-Tap WhatsApp & SMTP Parent Alert Dispatcher</strong></div>
          <div>⏰ <strong>Automated 5:01 PM Daily Attendance Email Digest Engine</strong></div>
          <div>🎨 <strong>Enterprise High-Contrast Light Theme & Corporate Controls</strong></div>
        </div>
      </div>
    </div>
  );
}
