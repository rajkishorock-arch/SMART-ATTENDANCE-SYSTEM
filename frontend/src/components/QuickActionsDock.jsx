import { useState } from 'react';
import { Camera, FileSpreadsheet, Bell, Plus, Zap, X } from 'lucide-react';

export default function QuickActionsDock({ onScan, onManual, onReport, onNotify, userRole }) {
  const [open, setOpen] = useState(false);

  const actions = [
    { id: 'scan', label: 'Face Scanner', icon: Camera, onClick: onScan, color: '#00f2fe', bg: 'rgba(0, 242, 254, 0.15)', border: 'rgba(0, 242, 254, 0.35)' },
    { id: 'manual', label: 'Manual Check-in', icon: Plus, onClick: onManual, color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' },
    { id: 'report', label: 'Export Analytics', icon: FileSpreadsheet, onClick: onReport, color: '#c084fc', bg: 'rgba(167, 139, 250, 0.15)', border: 'rgba(167, 139, 250, 0.35)' },
    { id: 'notify', label: 'Broadcast Alert', icon: Bell, onClick: onNotify, color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' },
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
          {actions.map((a, index) => (
            <button
              key={a.id}
              type="button"
              className="quick-action-item hover-elevate"
              onClick={() => { a.onClick?.(); setOpen(false); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 14px',
                background: 'rgba(15, 23, 42, 0.9)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${a.border}`,
                borderRadius: '30px',
                color: '#f1f5f9',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: `0 8px 20px rgba(0, 0, 0, 0.4), 0 0 12px ${a.bg}`,
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
          background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          color: '#080c14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 25px rgba(0, 242, 254, 0.45)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: open ? 'rotate(90deg)' : 'none'
        }}
      >
        {open ? <X size={22} strokeWidth={2.5} /> : <Zap size={22} strokeWidth={2.5} />}
      </button>
    </div>
  );
}

