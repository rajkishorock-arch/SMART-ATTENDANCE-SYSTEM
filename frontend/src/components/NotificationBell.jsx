import React from 'react';
import { Bell } from 'lucide-react';

export default function NotificationBell({ unreadCount = 0, onClick, playCyberSound }) {
  const handleClick = (e) => {
    if (playCyberSound) playCyberSound('click');
    if (onClick) onClick(e);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Notifications"
      title="Notifications"
      style={{
        background: 'rgba(0, 242, 254, 0.08)',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        borderRadius: '10px',
        color: '#00f2fe',
        width: '38px',
        height: '38px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        marginRight: '8px',
        transition: 'all 0.2s ease',
        flexShrink: 0
      }}
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          background: '#ef4444',
          color: '#ffffff',
          fontSize: '0.65rem',
          fontWeight: 800,
          minWidth: '18px',
          height: '18px',
          borderRadius: '10px',
          padding: '0 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 8px #ef4444'
        }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
