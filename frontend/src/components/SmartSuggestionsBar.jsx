import { X, Sparkles, Zap, Shield, BookOpen } from 'lucide-react';
import { SMART_SUGGESTIONS, getDismissedSuggestions, dismissSuggestion } from '../utils/futuristicFeatures';
import { useState } from 'react';

export default function SmartSuggestionsBar({ onAction, hasPremium, scannerUsed }) {
  const [dismissed, setDismissed] = useState(() => getDismissedSuggestions());

  const visible = SMART_SUGGESTIONS.filter((s) => {
    if (dismissed.includes(s.id)) return false;
    if (s.id === 'premium' && hasPremium) return false;
    if (s.id === 'classroom' && scannerUsed) return false;
    return true;
  });

  if (!visible.length) return null;

  const handleDismiss = (id) => {
    dismissSuggestion(id);
    setDismissed((d) => [...d, id]);
  };

  const getSuggestionIcon = (id) => {
    if (id === 'premium') return <Zap size={13} color="#ffd700" />;
    if (id === 'classroom') return <BookOpen size={13} color="#00f2fe" />;
    return <Sparkles size={13} color="#a855f7" />;
  };

  return (
    <div className="smart-suggestions-bar no-scrollbar" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      overflowX: 'auto',
      width: '100%',
      padding: '8px 4px 14px',
      WebkitOverflowScrolling: 'touch',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(0, 242, 254, 0.1)',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        padding: '5px 10px',
        borderRadius: '20px',
        color: '#00f2fe',
        fontSize: '0.72rem',
        fontWeight: 800,
        flexShrink: 0,
        letterSpacing: '0.04em'
      }}>
        <Sparkles size={13} />
        <span>AI HINTS</span>
      </div>

      {visible.map((s) => (
        <div
          key={s.id}
          className="suggestion-chip hover-elevate"
          onClick={() => onAction?.(s.action)}
          style={{
            flexShrink: 0,
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#e2e8f0',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          {getSuggestionIcon(s.id)}
          <span>{s.text}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDismiss(s.id); }}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: '4px',
              transition: 'background 0.2s ease'
            }}
            aria-label="Dismiss hint"
          >
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}

