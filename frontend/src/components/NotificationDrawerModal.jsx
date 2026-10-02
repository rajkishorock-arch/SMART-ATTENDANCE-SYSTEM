import { useState, useEffect, useCallback } from 'react';
import { 
  Bell, CheckCircle2, AlertCircle, Clock, X, ShieldAlert,
  Calendar, CheckCheck, Sliders, Trash2
} from 'lucide-react';
import NotificationSettingsModal from './NotificationSettingsModal';
import { notificationApi } from '../api/notificationApi.js';

export default function NotificationDrawerModal({
  isOpen,
  onClose,
  token,
  onNotificationClick = () => {},
  playCyberSound = () => {}
}) {
  const [notifications, setNotifications] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_realtime_notifications');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    if (notifications.length === 0) setIsLoading(true);
    try {
      const res = await notificationApi.fetchMyNotifications(token, 50);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);
        try {
          localStorage.setItem('cached_realtime_notifications', JSON.stringify(list));
        } catch { /* ignore fallback error */ }
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token, notifications.length]);

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      const load = async () => {
        await Promise.resolve();
        if (!ignore) {
          await fetchNotifications();
        }
      };
      load();
    }
    return () => {
      ignore = true;
    };
  }, [isOpen, fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (!token) return;
    playCyberSound('click');
    try {
      const res = await notificationApi.markAllNotificationsRead(token);
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        playCyberSound('success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (e, id) => {
    e.stopPropagation();
    if (!token) return;
    playCyberSound('click');
    try {
      await notificationApi.deleteNotification(token, id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleItemClick = async (notif) => {
    playCyberSound('click');
    if (!notif.is_read) {
      try {
        await notificationApi.markNotificationRead(token, notif.id);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch { /* ignore fallback error */ }
    }
    if (onNotificationClick) {
      onNotificationClick(notif);
    }
    onClose();
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeCategory === 'ALL') return true;
    if (activeCategory === 'UNREAD') return !n.is_read;
    if (activeCategory === 'SECURITY') return n.category === 'SECURITY' || n.category === 'SYSTEM';
    if (activeCategory === 'CLASSES') return n.category === 'CLASS_REMINDER' || n.category === 'CLASSES';
    return n.category === activeCategory;
  });

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'DISPUTE':
        return <ShieldAlert size={16} color="#00f2fe" />;
      case 'LEAVE':
        return <Calendar size={16} color="#f59e0b" />;
      case 'ATTENDANCE':
        return <CheckCircle2 size={16} color="#10b981" />;
      case 'SECURITY':
      case 'SYSTEM':
        return <AlertCircle size={16} color="#ef4444" />;
      case 'CLASS_REMINDER':
      case 'CLASSES':
        return <Clock size={16} color="#8b5cf6" />;
      default:
        return <Bell size={16} color="#8b5cf6" />;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      const dt = new Date(dateStr);
      const diffMs = new Date() - dt;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.2s ease-in-out'
        }}
        onClick={onClose}
      >
        <div 
          style={{
            width: '100%',
            maxWidth: '420px',
            height: '100%',
            background: '#ffffff',
            borderLeft: '1px solid #e2e8f0',
            boxShadow: '-10px 0 30px rgba(15, 23, 42, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideLeft 0.25s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#e0f2fe',
                border: '1px solid #bae6fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Bell size={18} color="#0284c7" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>
                  Real-time role alerts & push updates
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => { setShowSettingsModal(true); playCyberSound('click'); }}
                title="Notification Settings"
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#334155',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Sliders size={16} />
              </button>

              <button
                onClick={onClose}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#64748b',
                  padding: '6px',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Category Filters & Mark Read */}
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { key: 'ALL', label: 'All' },
                { key: 'UNREAD', label: 'Unread' },
                { key: 'ATTENDANCE', label: 'Attendance' },
                { key: 'LEAVE', label: 'Leaves' },
                { key: 'DISPUTE', label: 'Disputes' },
                { key: 'CLASSES', label: 'Classes' },
                { key: 'SECURITY', label: 'Security' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveCategory(tab.key); playCyberSound('click'); }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '14px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    border: activeCategory === tab.key ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                    background: activeCategory === tab.key ? '#eff6ff' : '#f8fafc',
                    color: activeCategory === tab.key ? '#1d4ed8' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0284c7',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {isLoading && filteredNotifications.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      gap: '12px',
                      animation: 'pulse 1.5s infinite ease-in-out'
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0f2fe' }}></div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ width: '50%', height: '14px', background: '#e2e8f0', borderRadius: '4px' }}></div>
                      <div style={{ width: '80%', height: '12px', background: '#f1f5f9', borderRadius: '4px' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                <Bell size={32} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#0f172a', fontWeight: 600 }}>No Notifications</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>You're all caught up!</p>
              </div>
            ) : (
              filteredNotifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: n.is_read ? '#ffffff' : '#f0f9ff',
                    border: n.is_read ? '1px solid #e2e8f0' : '1px solid #bae6fd',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <button
                    onClick={(e) => handleDeleteItem(e, n.id)}
                    title="Delete notification"
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      opacity: 0.7,
                      padding: '2px'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>

                  {!n.is_read && (
                    <span style={{
                      position: 'absolute',
                      top: '14px',
                      right: '14px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#0284c7'
                    }}></span>
                  )}
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {getCategoryIcon(n.category)}
                    </div>
                    <div style={{ flex: 1, paddingRight: n.is_read ? '16px' : '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                          {n.title}
                        </h4>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#475569', margin: '4px 0 6px 0', lineHeight: 1.35 }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {formatTimeAgo(n.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <NotificationSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        token={token}
        playCyberSound={playCyberSound}
      />
    </>
  );
}
