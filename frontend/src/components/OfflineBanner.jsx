import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner">
      <WifiOff size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
      Offline — cached data dikha rahe hain. Network aane par auto-sync hoga.
    </div>
  );
}
