import { X, Sparkles } from 'lucide-react';
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

  return (
    <div className="smart-suggestions-bar" style={{
      display: 'flex',
      gap: '10px',
      overflowX: 'auto',
      width: '100%',
      padding: '8px 0 12px',
      WebkitOverflowScrolling: 'touch',
    }}>
      <Sparkles size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, alignSelf: 'center' }} />
      {visible.map((s) => (
        <div key={s.id} className="suggestion-chip" onClick={() => onAction?.(s.action)} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
          {s.text}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleDismiss(s.id); }}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
