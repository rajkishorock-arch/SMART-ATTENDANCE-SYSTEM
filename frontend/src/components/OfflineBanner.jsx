import { useEffect, useState } from 'react';
import { WifiOff, X } from 'lucide-react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const on = () => {
      setOffline(false);
      setDismissed(false);
    };
    const off = () => {
      setOffline(true);
      setDismissed(false);
    };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline || dismissed) return null;

  return (
    <div
      className="offline-banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 99999,
        background: 'linear-gradient(90deg, #b45309, #d97706)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '8px 16px',
        fontSize: '0.82rem',
        fontWeight: 600,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        boxSizing: 'border-box'
      }}
    >
      <WifiOff size={16} style={{ flexShrink: 0 }} />
      <span>Offline Mode — Displaying cached data. Will auto-sync when network reconnects.</span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          borderRadius: '4px',
          color: '#ffffff',
          cursor: 'pointer',
          padding: '3px 8px',
          marginLeft: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.75rem',
          fontWeight: 700,
          opacity: 0.9,
          transition: 'all 0.2s ease'
        }}
        title="Dismiss banner"
      >
        <X size={14} /> Close
      </button>
    </div>
  );
}

