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
    <div className="offline-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'relative' }}>
      <WifiOff size={15} style={{ flexShrink: 0 }} />
      <span>Offline Mode — Displaying cached data. Will auto-sync when network reconnects.</span>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#ffffff',
          cursor: 'pointer',
          padding: '2px 6px',
          marginLeft: '12px',
          display: 'flex',
          alignItems: 'center',
          opacity: 0.9
        }}
        title="Dismiss banner"
      >
        <X size={16} />
      </button>
    </div>
  );
}
