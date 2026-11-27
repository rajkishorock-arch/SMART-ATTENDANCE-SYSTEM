import { useState, useEffect, useCallback, useRef } from 'react';
import { initializePushNotifications } from '../services/pushNotificationService';
import { notificationApi } from '../api/notificationApi.js';

function getCacheKey(userKey) {
  const slug =
    (typeof localStorage !== 'undefined' && localStorage.getItem('activeTenantSlug')) || 'default';
  return `notif_list_cache_${slug}_${userKey}`;
}

function readCachedNotifications(userKey) {
  if (!userKey || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getCacheKey(userKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedNotifications(userKey, items) {
  if (!userKey || typeof localStorage === 'undefined' || !Array.isArray(items)) return;
  try {
    localStorage.setItem(getCacheKey(userKey), JSON.stringify(items.slice(0, 50)));
  } catch {
    // ignore storage quota failures
  }
}

export function resolveNotificationNavigation(notif, userRole = null) {
  if (!notif) {
    return { targetTab: null, targetSubSetting: null, openScanner: false, studentSubRoute: null };
  }

  if (notif.targetTab) {
    return {
      targetTab: notif.targetTab,
      targetSubSetting: notif.targetSubSetting || null,
      openScanner: !!notif.openScanner,
      studentSubRoute: notif.studentSubRoute || null,
    };
  }

  const actionUrl = (notif.action_url || '').toLowerCase();
  const category = (notif.category || '').toUpperCase();
  const title = (notif.title || '').toLowerCase();
  const message = (notif.message || '').toLowerCase();
  const role = (userRole || '').toLowerCase();

  const isFaceReview =
    category === 'FACE_REVIEW' ||
    actionUrl.includes('face-review') ||
    title.includes('low-confidence') ||
    title.includes('borderline') ||
    title.includes('face match');

  if (isFaceReview && role !== 'student') {
    return { targetTab: 'face-review', targetSubSetting: null, openScanner: false, studentSubRoute: null };
  }

  const isLeave =
    category === 'LEAVE' ||
    actionUrl.includes('leave') ||
    title.includes('leave') ||
    message.includes('leave application');

  if (isLeave) {
    if (role === 'student') {
      return {
        targetTab: 'student-attendance',
        targetSubSetting: null,
        openScanner: false,
        studentSubRoute: { section: 'disputes' },
      };
    }
    return {
      targetTab: 'settings',
      targetSubSetting: 'leave_management',
      openScanner: false,
      studentSubRoute: null,
    };
  }

  const isDispute =
    category === 'DISPUTE' ||
    actionUrl.includes('dispute') ||
    title.includes('dispute') ||
    message.includes('dispute');

  if (isDispute) {
    if (role === 'student') {
      return {
        targetTab: 'student-attendance',
        targetSubSetting: null,
        openScanner: false,
        studentSubRoute: { section: 'disputes' },
      };
    }
    return {
      targetTab: 'disputes',
      targetSubSetting: null,
      openScanner: false,
      studentSubRoute: null,
    };
  }

  const isNoticeOrBroadcast =
    ['BROADCAST', 'ANNOUNCEMENT', 'NOTICE', 'CIRCULAR', 'EXAM', 'EVENT', 'HOLIDAY', 'URGENT'].includes(category) ||
    actionUrl.includes('broadcast') ||
    actionUrl.includes('notice') ||
    title.includes('notice') ||
    title.includes('broadcast') ||
    title.includes('circular') ||
    title.includes('workshop') ||
    title.includes('holiday');

  if (isNoticeOrBroadcast) {
    return { targetTab: 'broadcast', targetSubSetting: null, openScanner: false, studentSubRoute: null };
  }

  const isCalendar =
    category === 'CALENDAR' ||
    category === 'ACADEMIC_CALENDAR' ||
    actionUrl.includes('calendar') ||
    title.includes('calendar') ||
    message.includes('calendar');

  if (isCalendar) {
    return { targetTab: 'calendar', targetSubSetting: null, openScanner: false, studentSubRoute: null };
  }

  const isAttendance =
    category === 'ATTENDANCE' ||
    actionUrl.includes('attendance') ||
    title.includes('attendance') ||
    title.includes('check-in');

  if (isAttendance) {
    if (role === 'student') {
      return { targetTab: 'student-attendance', targetSubSetting: null, openScanner: false, studentSubRoute: null };
    }
    return { targetTab: 'logs', targetSubSetting: null, openScanner: false, studentSubRoute: null };
  }

  const isClasses =
    category === 'CLASS_REMINDER' ||
    category === 'CLASSES' ||
    actionUrl.includes('classes') ||
    actionUrl.includes('schedule');

  if (isClasses) {
    if (role === 'student') {
      return { targetTab: 'student-attendance', targetSubSetting: null, openScanner: false, studentSubRoute: null };
    }
    return { targetTab: 'attendance', targetSubSetting: null, openScanner: true, studentSubRoute: null };
  }

  const isSecurity =
    category === 'SECURITY' ||
    category === 'SYSTEM' ||
    actionUrl.includes('security') ||
    title.includes('security') ||
    title.includes('password');

  if (isSecurity) {
    return { targetTab: 'settings', targetSubSetting: null, openScanner: false, studentSubRoute: null };
  }

  return {
    targetTab: role === 'student' ? 'student-attendance' : 'dashboard',
    targetSubSetting: null,
    openScanner: false,
    studentSubRoute: null,
  };
}

export default function useNotifications(token, currentUser, userRole, onNavigate) {
  const actualOnNavigate = typeof userRole === 'function' ? userRole : onNavigate;
  const effectiveRole = typeof userRole === 'string' ? userRole : (currentUser?.role || null);
  const userKey = currentUser ? String(currentUser.id || currentUser.email || 'user') : null;

  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [notifStore, setNotifStore] = useState(() => {
    const cached = readCachedNotifications(userKey);
    return {
      key: userKey,
      items: cached,
      unreadCount: cached.filter(n => !n.is_read).length,
    };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const inFlightCountRef = useRef(false);
  const inFlightListRef = useRef(false);
  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const isCurrentUserStore = userKey && notifStore.key === userKey;
  const cachedFallback = userKey ? readCachedNotifications(userKey) : [];
  const notifications = !userKey ? [] : isCurrentUserStore ? notifStore.items : cachedFallback;
  const unreadCount = !userKey
    ? 0
    : isCurrentUserStore
      ? notifStore.unreadCount
      : cachedFallback.filter(n => !n.is_read).length;

  const setNotifications = useCallback(
    (itemsOrUpdater) => {
      setNotifStore(prev => {
        const baseItems = prev.key === userKey ? prev.items : readCachedNotifications(userKey);
        const nextItems = typeof itemsOrUpdater === 'function' ? itemsOrUpdater(baseItems) : itemsOrUpdater;
        return {
          key: userKey,
          items: nextItems,
          unreadCount: nextItems.filter(n => !n.is_read).length,
        };
      });
    },
    [userKey]
  );

  const setUnreadCount = useCallback(
    (count) => {
      setNotifStore(prev => ({
        key: userKey,
        items: prev.key === userKey ? prev.items : readCachedNotifications(userKey),
        unreadCount: count,
      }));
    },
    [userKey]
  );

  const fetchUnreadNotificationCount = useCallback(async () => {
    if (!token || inFlightCountRef.current) return;
    inFlightCountRef.current = true;
    try {
      const res = await notificationApi.fetchUnreadCount(token);
      if (res && res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch {
      // ignore transient poll errors
    } finally {
      inFlightCountRef.current = false;
    }
  }, [token]);

  const refreshNotifications = useCallback(async ({ showSpinnerIfEmpty = false } = {}) => {
    if (!token || inFlightListRef.current) return;
    inFlightListRef.current = true;
    if (showSpinnerIfEmpty && notifications.length === 0) {
      setIsLoading(true);
    }
    setLoadError('');
    try {
      const response = await notificationApi.fetchMyNotifications(token, 50);
      if (!response.ok) throw new Error();
      const entries = await response.json();
      const list = Array.isArray(entries) ? entries : [];
      setNotifications(list);
      setUnreadCount(list.filter(n => !n.is_read).length);
      writeCachedNotifications(userKey, list);
    } catch {
      if (notifications.length === 0) {
        setLoadError('Notifications could not load right now.');
      }
    } finally {
      inFlightListRef.current = false;
      setIsLoading(false);
    }
  }, [token, userKey, notifications.length]);

  useEffect(() => {
    if (!token || !userKey) return undefined;

    initializePushNotifications(token, currentUserRef.current, (data) => {
      const nav = resolveNotificationNavigation(data, effectiveRole || currentUserRef.current?.role);
      if (actualOnNavigate) actualOnNavigate(nav);
    });

    let isMounted = true;
    const warmStart = async () => {
      if (isMounted) {
        await Promise.allSettled([
          fetchUnreadNotificationCount(),
          refreshNotifications({ showSpinnerIfEmpty: false }),
        ]);
      }
    };
    warmStart();

    const interval = setInterval(() => {
      if (isMounted && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchUnreadNotificationCount();
        refreshNotifications({ showSpinnerIfEmpty: false });
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token, userKey, effectiveRole, fetchUnreadNotificationCount, refreshNotifications, actualOnNavigate]);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => {
      const next = prev.map(n => (n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(next.filter(n => !n.is_read).length);
      writeCachedNotifications(userKey, next);
      return next;
    });
    if (token && id != null) {
      notificationApi.markNotificationRead(token, id).catch(() => {});
    }
  }, [token, userKey]);

  const markAllRead = useCallback(async () => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, is_read: true }));
      setUnreadCount(0);
      writeCachedNotifications(userKey, next);
      return next;
    });
    if (!token) return;
    try {
      await notificationApi.markAllNotificationsRead(token);
    } catch {
      // ignore error; next poll reconciles
    }
  }, [token, userKey]);

  const deleteNotification = useCallback(async (id) => {
    setNotifications(prev => {
      const next = prev.filter(n => n.id !== id);
      setUnreadCount(next.filter(n => !n.is_read).length);
      writeCachedNotifications(userKey, next);
      return next;
    });
    if (!token) return;
    try {
      await notificationApi.deleteNotification(token, id);
    } catch {
      // ignore error; next poll reconciles
    }
  }, [token, userKey]);

  const handleNotificationClick = useCallback((notif) => {
    if (notif?.id != null && !notif.is_read) {
      markAsRead(notif.id);
    }
    const nav = resolveNotificationNavigation(notif, effectiveRole || currentUser?.role);
    if (actualOnNavigate) actualOnNavigate(nav);
  }, [markAsRead, actualOnNavigate, effectiveRole, currentUser]);

  return {
    showNotificationDrawer,
    setShowNotificationDrawer,
    notifications,
    unreadCount,
    isLoading,
    loadError,
    refreshNotifications,
    markAsRead,
    markAllRead,
    deleteNotification,
    fetchUnreadNotificationCount,
    handleNotificationClick,
  };
}
