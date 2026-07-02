import { useState, useEffect, useCallback } from 'react';

export default function LiveBoardStrip({ apiBaseUrl, token, enabled = true }) {
  const [events, setEvents] = useState([]);

  const load = useCallback(async () => {
    if (!token || !enabled) return;
    try {
      const res = await fetch(`${apiBaseUrl}/extreme/level1/live-board`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch { /* silent */ }
  }, [apiBaseUrl, token, enabled]);

  useEffect(() => {
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [load]);

  if (!enabled || !token) return null;

  return (
    <div className="live-board-strip" role="status" aria-label="Live attendance board">
      <span className="live-dot" />
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00f2fe', flexShrink: 0 }}>LIVE BOARD</span>
      <div className="live-board-events">
        {events.length === 0 ? (
          <span className="live-board-event" style={{ color: '#64748b' }}>Waiting for marks…</span>
        ) : (
          events.map((e, i) => (
            <span key={`${e.roll}-${i}`} className="live-board-event">
              {e.name} · {e.status} · {e.time}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
