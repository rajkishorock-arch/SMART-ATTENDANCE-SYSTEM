import { useState } from 'react';
import { Camera, FileSpreadsheet, Bell, Plus, Zap, X } from 'lucide-react';

export default function QuickActionsDock({ onScan, onManual, onReport, onNotify }) {
  const [open, setOpen] = useState(false);

  const actions = [
    { id: 'scan', label: 'Face Scanner', icon: Camera, onClick: onScan, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { id: 'manual', label: 'Manual Check-in', icon: Plus, onClick: onManual, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
    { id: 'report', label: 'Export Analytics', icon: FileSpreadsheet, onClick: onReport, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    { id: 'notify', label: 'Broadcast Alert', icon: Bell, onClick: onNotify, color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  ];

  return (
    <div className="quick-actions-dock" style={{ position: 'fixed', bottom: '85px', right: '22px', zIndex: 9999 }}>
      {open && (
        <div className="quick-actions-menu" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '12px',
          alignItems: 'flex-end',
          animation: 'fadeInModal 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
              className="quick-action-item hover-elevate"
              onClick={() => { a.onClick?.(); setOpen(false); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 16px',
                background: '#ffffff',
                border: `1px solid ${a.border}`,
                borderRadius: '30px',
                color: '#0f172a',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: a.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: a.color
              }}>
                <a.icon size={15} />
              </span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="quick-action-fab main hover-elevate"
        onClick={() => setOpen((v) => !v)}
        aria-label="Quick actions dock"
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          border: '2px solid #ffffff',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: open ? 'rotate(90deg)' : 'none'
        }}
      >
        {open ? <X size={22} strokeWidth={2.5} /> : <Zap size={22} strokeWidth={2.5} />}
      </button>
    </div>
  );
}

