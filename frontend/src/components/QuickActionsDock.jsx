import { useState } from 'react';
import { Camera, FileSpreadsheet, Bell, Plus, Zap } from 'lucide-react';

export default function QuickActionsDock({ onScan, onManual, onReport, onNotify, userRole }) {
  const [open, setOpen] = useState(false);
  if (userRole === 'student') return null;

  const actions = [
    { id: 'scan', label: 'Scan', icon: Camera, onClick: onScan, color: '#00f2fe' },
    { id: 'manual', label: 'Manual', icon: Plus, onClick: onManual, color: '#10b981' },
    { id: 'report', label: 'Report', icon: FileSpreadsheet, onClick: onReport, color: '#a78bfa' },
    { id: 'notify', label: 'Notify Parents', icon: Bell, onClick: onNotify, color: '#f59e0b' },
  ];

  return (
    <div className="quick-actions-dock">
      {open && (
        <div className="quick-actions-menu">
          {actions.map((a) => (
            <button key={a.id} type="button" className="quick-action-item" onClick={() => { a.onClick?.(); setOpen(false); }}>
              <a.icon size={16} color={a.color} />
              {a.label}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="quick-action-fab main" onClick={() => setOpen((v) => !v)} aria-label="Quick actions">
        {open ? '✕' : <Zap size={24} />}
      </button>
    </div>
  );
}
