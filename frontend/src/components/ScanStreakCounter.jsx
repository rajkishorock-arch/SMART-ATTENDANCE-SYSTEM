import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { getScanStreakLocal } from '../utils/futuristicFeatures';

export default function ScanStreakCounter({ apiBaseUrl, token }) {
  const [data, setData] = useState({ scans_today: 0, message: '' });
  const local = getScanStreakLocal();

  useEffect(() => {
    if (!token || !apiBaseUrl) return;
    fetch(`${apiBaseUrl}/interactive/scan-streak`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setData(d))
      .catch(() => {});
  }, [apiBaseUrl, token]);

  const count = data.scans_today || local.count || 0;

  return (
    <div className="scan-streak-widget">
      <Flame size={32} color="#fbbf24" />
      <div>
        <div className="streak-num">{count}</div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          {data.message || `Aaj ${count} students scan`}
        </div>
      </div>
    </div>
  );
}
