import { Camera } from 'lucide-react';

export default function SmartEmptyState({ title, message, actionLabel, onAction, icon: Icon = Camera }) {
  return (
    <div className="smart-empty-state glass-panel">
      <Icon size={48} style={{ color: 'var(--color-primary)', opacity: 0.6 }} />
      <h4>{title || 'Koi data nahi hai'}</h4>
      <p style={{ fontSize: '0.85rem', maxWidth: '320px' }}>{message || 'Pehli class scan karo ya manual attendance mark karo.'}</p>
      {actionLabel && onAction && (
        <button type="button" className="bg-gradient-btn" onClick={onAction} style={{ padding: '10px 20px', borderRadius: '10px' }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
