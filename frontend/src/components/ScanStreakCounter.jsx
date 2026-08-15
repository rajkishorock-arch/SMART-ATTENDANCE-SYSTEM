import { useEffect, useState } from 'react';
import { Flame, Award, Zap } from 'lucide-react';
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
  const streakLevel = count >= 50 ? 'Master' : count >= 20 ? 'Pro' : count >= 5 ? 'Active' : 'Starter';

  return (
    <div className="scan-streak-widget hover-elevate" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '12px 18px',
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      borderRadius: '20px',
      boxShadow: '0 8px 24px rgba(245, 158, 11, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(239, 68, 68, 0.2))',
        border: '1px solid rgba(245, 158, 11, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 0 16px rgba(245, 158, 11, 0.3)'
      }}>
        <Flame size={24} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 8px #f59e0b)' }} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
            {count}
          </span>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.2)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            textTransform: 'uppercase'
          }}>
            🔥 {streakLevel} Streak
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px', fontWeight: 500 }}>
          {data.message || `Aaj ${count} verification stream records active`}
        </div>
      </div>
    </div>
  );
}

