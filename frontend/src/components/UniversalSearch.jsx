import { useState, useEffect, useCallback, useRef } from 'react';

export default function UniversalSearch({ apiBaseUrl, token, open, onClose, onNavigate }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  const search = useCallback(async (query) => {
    if (!token || !query.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(
        `${apiBaseUrl}/extreme/level1/search-index?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch {
      setResults([]);
    }
  }, [apiBaseUrl, token]);

  useEffect(() => {
    if (open) {
      setQ('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => search(q), 200);
    return () => clearTimeout(t);
  }, [q, search]);

  if (!open) return null;

  const pick = (item) => {
    onClose();
    if (item.action === 'attendance') onNavigate?.('attendance');
    else if (item.action === 'settings') onNavigate?.('settings');
    else if (item.action === 'extreme') onNavigate?.('extreme');
    else if (item.type === 'student') onNavigate?.('students');
  };

  return (
    <div className="universal-search-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Universal search">
      <div className="universal-search-panel" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="universal-search-input"
          placeholder="Search roll, name, scanner, settings… (Ctrl+K)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && results[0]) pick(results[0]);
          }}
        />
        <div className="universal-search-hint">Cmd+K / Ctrl+K — Level 1 Universal Search</div>
        <div className="universal-search-results">
          {results.map((r, i) => (
            <div
              key={`${r.type}-${r.label}-${i}`}
              className="universal-search-item"
              onClick={() => pick(r)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && pick(r)}
            >
              <span style={{ opacity: 0.5, marginRight: 8, fontSize: '0.72rem' }}>{r.type}</span>
              {r.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
