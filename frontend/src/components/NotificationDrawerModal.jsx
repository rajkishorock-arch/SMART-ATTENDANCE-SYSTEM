import { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  Calendar,
  CheckCheck,
  Sliders,
  Trash2,
  Megaphone,
  ChevronRight,
  ScanFace,
  X,
} from 'lucide-react';
import NotificationSettingsModal from './NotificationSettingsModal';
import { notificationApi } from '../api/notificationApi.js';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

const CATEGORY_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'UNREAD', label: 'Unread' },
  { key: 'DISPUTE', label: 'Disputes' },
  { key: 'LEAVE', label: 'Leaves' },
  { key: 'NOTICE', label: 'Notices' },
  { key: 'ATTENDANCE', label: 'Attendance' },
  { key: 'SECURITY', label: 'Alerts' },
];

export default function NotificationDrawerModal({
  isOpen = false,
  inlinePage = false,
  routeView = null,
  setRouteView = null,
  onClose = () => {},
  token,
  notifications: sharedNotifications = null,
  isLoading: sharedIsLoading = false,
  loadError: sharedLoadError = '',
  onRefresh = null,
  onMarkAllRead = null,
  onDeleteItem = null,
  onNotificationClick = () => {},
  playCyberSound = () => {},
}) {
  useBodyScrollLock(!inlinePage && isOpen);

  const [localNotifications, setLocalNotifications] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [localPrefsOpen, setLocalPrefsOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const usingShared = Array.isArray(sharedNotifications);
  const notifications = usingShared ? sharedNotifications : localNotifications;
  const isLoading = usingShared ? sharedIsLoading : localLoading;
  const loadError = usingShared ? sharedLoadError : localError;
  const active = inlinePage || isOpen;
  const showingPreferences = inlinePage ? routeView === 'preferences' : localPrefsOpen;

  useEffect(() => {
    if (!active || !token) return;
    if (usingShared && onRefresh) {
      onRefresh({ showSpinnerIfEmpty: true });
      return;
    }

    let activeReq = true;
    async function loadFallback() {
      if (localNotifications.length === 0) setLocalLoading(true);
      setLocalError('');
      try {
        const res = await notificationApi.fetchMyNotifications(token, 50);
        if (!res.ok) throw new Error();
        const entries = await res.json();
        if (activeReq) setLocalNotifications(Array.isArray(entries) ? entries : []);
      } catch {
        if (activeReq && localNotifications.length === 0) {
          setLocalError('Unable to load notifications right now.');
        }
      } finally {
        if (activeReq) setLocalLoading(false);
      }
    }
    loadFallback();
    return () => { activeReq = false; };
  }, [active, token, usingShared, onRefresh, localNotifications.length]);

  const handleMarkAllRead = async () => {
    playCyberSound('click');
    if (onMarkAllRead) {
      await onMarkAllRead();
      playCyberSound('success');
      return;
    }
    if (!token) return;
    setLocalNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    notificationApi.markAllNotificationsRead(token).catch(() => {});
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    playCyberSound('click');
    if (onDeleteItem) {
      onDeleteItem(id);
      return;
    }
    setLocalNotifications(prev => prev.filter(n => n.id !== id));
    if (token) notificationApi.deleteNotification(token, id).catch(() => {});
  };

  const handleItemClick = (notif) => {
    playCyberSound('click');
    if (!usingShared && !notif.is_read) {
      setLocalNotifications(prev => prev.map(n => (n.id === notif.id ? { ...n, is_read: true } : n)));
      if (token) notificationApi.markNotificationRead(token, notif.id).catch(() => {});
    }
    if (!inlinePage) onClose();
    if (onNotificationClick) onNotificationClick(notif);
  };

  const isFutureScheduledNotice = (n) => {
    if (!n) return false;
    const isCalendar = n.category === 'ACADEMIC_CALENDAR' || (n.action_url && n.action_url.includes('calendar'));
    const text = `${n.title || ''} ${n.message || ''}`;
    if (!isCalendar && !text.toLowerCase().includes('holiday') && !text.toLowerCase().includes('exam')) {
      return false;
    }
    const match = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/);
    if (!match) return false;
    const rawDate = match[1].replace(/\//g, '-');
    const parts = rawDate.split('-');
    const evtDate = parts[0].length === 4
      ? new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      : new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    if (isNaN(evtDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((evtDate - today) / (1000 * 60 * 60 * 24)) > 1;
  };

  const visibleNotifications = useMemo(
    () =>
      notifications
        .filter(n => !isFutureScheduledNotice(n))
        .filter(n => {
          const cat = String(n.category || '').toUpperCase();
          if (activeCategory === 'ALL') return true;
          if (activeCategory === 'UNREAD') return !n.is_read;
          if (activeCategory === 'NOTICE') {
            return ['BROADCAST', 'ANNOUNCEMENT', 'NOTICE', 'CIRCULAR', 'EXAM', 'EVENT', 'HOLIDAY', 'URGENT'].includes(cat);
          }
          if (activeCategory === 'SECURITY') return cat === 'SECURITY' || cat === 'SYSTEM';
          return cat === activeCategory;
        }),
    [notifications, activeCategory]
  );

  const unreadCount = useMemo(
    () => notifications.filter(n => !isFutureScheduledNotice(n) && !n.is_read).length,
    [notifications]
  );

  const getCategoryMeta = (cat) => {
    const key = String(cat || '').toUpperCase();
    switch (key) {
      case 'DISPUTE':
        return { icon: <ShieldAlert size={15} />, color: '#785927', bg: '#f7efe0' };
      case 'LEAVE':
        return { icon: <Calendar size={15} />, color: '#b45309', bg: '#fef3c7' };
      case 'ATTENDANCE':
        return { icon: <CheckCircle2 size={15} />, color: '#047857', bg: '#ecfdf5' };
      case 'FACE_REVIEW':
        return { icon: <ScanFace size={15} />, color: '#785927', bg: '#f5ecda' };
      case 'BROADCAST':
      case 'ANNOUNCEMENT':
      case 'NOTICE':
      case 'CIRCULAR':
      case 'EXAM':
      case 'EVENT':
      case 'HOLIDAY':
      case 'URGENT':
        return { icon: <Megaphone size={15} />, color: '#6b4e1e', bg: '#faf2df' };
      case 'SECURITY':
      case 'SYSTEM':
        return { icon: <AlertCircle size={15} />, color: '#b91c1c', bg: '#fef2f2' };
      case 'CLASS_REMINDER':
      case 'CLASSES':
        return { icon: <Clock size={15} />, color: '#5c4218', bg: '#f5ecda' };
      default:
        return { icon: <Bell size={15} />, color: '#785927', bg: '#f5ecda' };
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    try {
      let s = String(dateStr).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s = `${s}T00:00:00`;
      else if (!s.endsWith('Z') && !s.includes('+') && !s.slice(10).includes('-')) s = `${s.replace(' ', 'T')}Z`;
      const dt = new Date(s);
      if (isNaN(dt.getTime())) return '';
      const diffMs = Math.max(0, nowMs - dt.getTime());
      if (diffMs < 60000) return 'Just now';
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      return `${Math.floor(diffHours / 24)}d`;
    } catch {
      return '';
    }
  };

  const openPreferences = () => {
    playCyberSound('click');
    if (inlinePage && setRouteView) {
      setRouteView('preferences');
    } else {
      setLocalPrefsOpen(true);
    }
  };

  const closePreferences = () => {
    if (inlinePage && setRouteView) {
      setRouteView(null);
    } else {
      setLocalPrefsOpen(false);
    }
  };

  if (!active) return null;

  // Dedicated Notification Preferences Page (#/notifications/preferences)
  if (inlinePage && showingPreferences) {
    return (
      <NotificationSettingsModal
        inlinePage
        token={token}
        onClose={closePreferences}
        onHistoryCleared={() => {
          if (onRefresh) onRefresh({ showSpinnerIfEmpty: false });
        }}
      />
    );
  }

  const filterAndActionsBar = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#785927', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {unreadCount > 0 ? `${unreadCount} Unread` : `${visibleNotifications.length} Updates`}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="gg-notif-action-btn"
              title="Mark all as read"
              aria-label="Mark all as read"
            >
              <CheckCheck size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              if (!inlinePage) onClose();
              if (onNotificationClick) onNotificationClick({ targetTab: 'broadcast' });
            }}
            className="gg-notif-action-btn"
            title="Campus Notice Board"
            aria-label="Campus Notice Board"
          >
            <Megaphone size={15} />
          </button>
          <button
            type="button"
            onClick={openPreferences}
            className="gg-notif-action-btn"
            title="Notification Preferences"
            aria-label="Notification Preferences"
          >
            <Sliders size={15} />
          </button>
        </div>
      </div>

      <div
        className="gg-notif-filters"
        style={{ padding: 0, borderBottom: 'none', background: 'transparent', width: '100%' }}
      >
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              playCyberSound('click');
              setActiveCategory(tab.key);
            }}
            className={`golden-os-feedback-filter-btn ${activeCategory === tab.key ? 'active' : ''}`}
            style={{ flexShrink: 0 }}
          >
            {tab.label}
            {tab.key === 'UNREAD' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>
    </div>
  );

  const listBody = (
    <>
      {loadError && visibleNotifications.length === 0 && (
        <div className="feedback-banner is-error" role="alert">
          <AlertCircle size={15} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{loadError}</span>
        </div>
      )}

      {isLoading && visibleNotifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: '#786240', fontSize: '0.84rem', fontWeight: 600 }}>
          Syncing updates...
        </div>
      ) : visibleNotifications.length === 0 ? (
        <div className="golden-os-inset-card" style={{ padding: '36px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: '#f5ecda',
              color: '#785927',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Bell size={20} />
          </div>
          <div style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>
            You're all caught up
          </div>
          <div style={{ fontSize: '0.78rem', color: '#8f7b58' }}>
            No {activeCategory === 'ALL' ? '' : `${activeCategory.toLowerCase()} `}notifications right now.
          </div>
        </div>
      ) : (
        <div className="golden-os-list-shell">
          {visibleNotifications.map(n => {
            const meta = getCategoryMeta(n.category);
            const timeAgo = formatTimeAgo(n.created_at);
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleItemClick(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleItemClick(n);
                  }
                }}
                className={`gg-notif-row ${!n.is_read ? 'is-unread' : ''}`}
              >
                <div className="gg-notif-row-icon" style={{ background: meta.bg, color: meta.color }}>
                  {meta.icon}
                </div>

                <div style={{ minWidth: 0, flex: '1 1 0%', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    {!n.is_read && <span className="gg-notif-dot" />}
                    <span className="gg-notif-row-title">{n.title}</span>
                    {timeAgo && <span className="gg-notif-row-time">{timeAgo}</span>}
                  </div>
                  {n.message && <div className="gg-notif-row-summary">{n.message}</div>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, n.id)}
                    className="gg-notif-delete-btn"
                    title="Remove"
                    aria-label="Remove notification"
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronRight size={15} style={{ color: '#8f7b58' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (inlinePage) {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filterAndActionsBar}
            {listBody}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="gg-notif-backdrop" onClick={onClose}>
        <div
          className="gg-notif-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="gg-notif-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div className="gg-notif-header-icon">
                <Bell size={17} />
              </div>
              <h3 style={{ fontSize: '1.04rem', fontWeight: 800, color: '#2b2112', margin: 0 }}>
                Notifications
              </h3>
              {unreadCount > 0 && <span className="gg-notif-count-badge">{unreadCount}</span>}
            </div>
            <button type="button" onClick={onClose} className="gg-notif-action-btn" aria-label="Close Notifications">
              <X size={16} />
            </button>
          </div>
          <div className="gg-notif-feed" style={{ gap: '12px' }}>
            {filterAndActionsBar}
            {listBody}
          </div>
        </div>
      </div>

      <NotificationSettingsModal
        isOpen={localPrefsOpen}
        onClose={() => setLocalPrefsOpen(false)}
        token={token}
        onHistoryCleared={() => {
          if (onRefresh) onRefresh({ showSpinnerIfEmpty: false });
        }}
      />
    </>
  );
}
