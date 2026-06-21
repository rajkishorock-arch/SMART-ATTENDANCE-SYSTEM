import { useEffect, useRef } from 'react';
import { Bell, CheckCircle2, AlertCircle, X, UserCheck } from 'lucide-react';

export default function NotificationCenter({
  open,
  onToggle,
  onClose,
  notifications = [],
  onMarkAllRead,
  unreadCount = 0,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('.notification-bell-btn')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} style={{ color: '#10b981' }} />;
      case 'warning': return <AlertCircle size={16} style={{ color: '#f59e0b' }} />;
      case 'scan': return <UserCheck size={16} style={{ color: '#00f2fe' }} />;
      default: return <Bell size={16} style={{ color: '#94a3b8' }} />;
    }
  };

  return (
    <>
      <button
        type="button"
        className="notification-bell-btn"
        onClick={onToggle}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notification-panel" ref={panelRef}>
          <div className="notification-panel-header">
            <h4>Notifications</h4>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {notifications.length > 0 && (
                <button type="button" className="notification-mark-read" onClick={onMarkAllRead}>
                  Mark all read
                </button>
              )}
              <button type="button" className="notification-close-btn" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={28} style={{ opacity: 0.3 }} />
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div key={n.id} className={`notification-item ${n.read ? '' : 'unread'}`}>
                  <div className="notification-item-icon">{getIcon(n.type)}</div>
                  <div className="notification-item-body">
                    <p className="notification-item-title">{n.title}</p>
                    <p className="notification-item-msg">{n.message}</p>
                    <span className="notification-item-time">{n.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
