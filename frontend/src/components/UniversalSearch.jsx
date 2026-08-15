import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Calendar, Settings, User, Sparkles, ArrowRight, X, Command } from 'lucide-react';

export default function UniversalSearch({ apiBaseUrl, token, open, onClose, onNavigate }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Default quick action shortcuts when search is empty
  const defaultActions = [
    { label: 'Live Attendance Records', type: 'page', action: 'attendance', icon: Calendar, subtitle: 'View real-time student logs' },
    { label: 'Student Directory', type: 'student', action: 'students', icon: User, subtitle: 'Manage student profiles & enrollments' },
    { label: 'System & Theme Settings', type: 'settings', action: 'settings', icon: Settings, subtitle: 'Configure dark theme, camera & backups' },
    { label: 'Extreme Features Hub', type: 'feature', action: 'extreme', icon: Sparkles, subtitle: 'Access enterprise analytics & tools' },
  ];

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
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => {
      search(q);
      setSelectedIndex(0);
    }, 180);
    return () => clearTimeout(t);
  }, [q, search]);

  if (!open) return null;

  const activeList = q.trim() ? results : defaultActions;

  const pick = (item) => {
    onClose();
    if (item.action === 'attendance') onNavigate?.('attendance');
    else if (item.action === 'settings') onNavigate?.('settings');
    else if (item.action === 'extreme') onNavigate?.('extreme');
    else if (item.type === 'student' || item.action === 'students') onNavigate?.('students');
    else if (item.action) onNavigate?.(item.action);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, activeList.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + activeList.length) % Math.max(1, activeList.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeList[selectedIndex]) {
        pick(activeList[selectedIndex]);
      }
    }
  };

  const getIconForType = (item) => {
    if (item.icon) {
      const IconComponent = item.icon;
      return <IconComponent size={18} />;
    }
    if (item.type === 'student') return <User size={18} />;
    if (item.action === 'settings') return <Settings size={18} />;
    if (item.action === 'attendance') return <Calendar size={18} />;
    return <Sparkles size={18} />;
  };

  return (
    <div className="universal-search-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Universal search command palette">
      <div className="universal-search-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header with Search Input */}
        <div className="universal-search-header">
          <Search size={20} color="#00f2fe" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="universal-search-input"
            placeholder="Type command, roll number, name, or settings..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          )}
          <span className="kbd-badge">ESC</span>
        </div>

        {/* Category Label */}
        <div style={{ padding: '8px 18px 4px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {q.trim() ? `Search Results (${results.length})` : 'Quick Navigation & Shortcuts'}
        </div>

        {/* Results List */}
        <div className="universal-search-results-list no-scrollbar">
          {activeList.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              No matches found for &quot;{q}&quot;
            </div>
          ) : (
            activeList.map((r, i) => {
              const isSelected = i === selectedIndex;
              return (
                <div
                  key={`${r.type}-${r.label}-${i}`}
                  className={`search-result-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => pick(r)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <div className="search-result-icon">
                    {getIconForType(r)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? '#00f2fe' : '#f1f5f9' }}>
                        {r.label}
                      </span>
                      <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                        {r.type || 'Action'}
                      </span>
                    </div>
                    {r.subtitle && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.subtitle}
                      </div>
                    )}
                  </div>
                  <ArrowRight size={16} style={{ opacity: isSelected ? 1 : 0, transform: isSelected ? 'translateX(0)' : 'translateX(-4px)', transition: 'all 0.2s ease', color: '#00f2fe' }} />
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Keyboard Hints */}
        <div className="universal-search-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="kbd-badge">↑↓</span> to navigate
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="kbd-badge">↵</span> to select
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Command size={13} />
            <span>Universal Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
}

