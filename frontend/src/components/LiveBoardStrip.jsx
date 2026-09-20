import { useState, useEffect, useCallback } from 'react';
import { interactiveApi } from '../api/interactiveApi.js';

export default function LiveBoardStrip({ token, enabled = true }) {
  const [events, setEvents] = useState([]);

  const load = useCallback(async () => {
    if (!token || !enabled) return;
    try {
      const res = await interactiveApi.fetchLiveBoard(token);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch { /* silent */ }
  }, [token, enabled]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await load();
      }
    };
    run();
    const id = setInterval(load, 12000);
    return () => {
      ignore = true;
      clearInterval(id);
    };
  }, [load]);

  if (!enabled || !token) return null;

  return (
    <div className="live-board-strip" role="status" aria-label="Live attendance board">
      <span className="live-dot" />
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00f2fe', flexShrink: 0 }}>LIVE BOARD</span>
      <div className="live-board-events no-scrollbar">
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
