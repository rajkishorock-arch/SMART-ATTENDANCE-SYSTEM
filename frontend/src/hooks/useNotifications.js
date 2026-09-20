import { useState, useEffect, useCallback } from 'react';
import { initializePushNotifications } from '../services/pushNotificationService';
import { notificationApi } from '../api/notificationApi';

export function resolveNotificationNavigation(notif) {
  if (!notif) return { targetTab: null, openScanner: false };

  const actionUrl = notif.action_url || '';
  const category = (notif.category || '').toUpperCase();

  if (actionUrl) {
    if (actionUrl.includes('disputes')) return { targetTab: 'disputes', openScanner: false };
    if (actionUrl.includes('leave')) return { targetTab: 'interventions', openScanner: false };
    if (actionUrl.includes('student-attendance')) return { targetTab: 'student-attendance', openScanner: false };
  }

  if (category === 'LEAVE' || category === 'DISPUTE') {
    return { targetTab: 'settings', openScanner: false };
  }
  if (category === 'ATTENDANCE') {
    return { targetTab: 'dashboard', openScanner: false };
  }
  if (category === 'CLASS_REMINDER' || category === 'CLASSES') {
    return { targetTab: null, openScanner: true };
  }
  if (category === 'SECURITY' || category === 'SYSTEM') {
    return { targetTab: 'security', openScanner: false };
  }

  return { targetTab: null, openScanner: false };
}

export default function useNotifications(token, currentUser, onNavigate) {
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadNotificationCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await notificationApi.fetchUnreadCount(token);
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch {
      // Ignore network errors on background poll
    }
  }, [token]);

  useEffect(() => {
    if (!token || !currentUser) return undefined;

    initializePushNotifications(token, currentUser, (data) => {
      const nav = resolveNotificationNavigation(data);
      if (onNavigate) onNavigate(nav);
    });

    let isMounted = true;
    const runInitialFetch = async () => {
      if (isMounted) {
        await fetchUnreadNotificationCount();
      }
    };
    runInitialFetch();

    const interval = setInterval(() => {
      if (isMounted) {
        fetchUnreadNotificationCount();
      }
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token, currentUser, fetchUnreadNotificationCount, onNavigate]);

  const handleNotificationClick = useCallback((notif) => {
    fetchUnreadNotificationCount();
    const nav = resolveNotificationNavigation(notif);
    if (onNavigate) onNavigate(nav);
  }, [fetchUnreadNotificationCount, onNavigate]);

  return {
    showNotificationDrawer,
    setShowNotificationDrawer,
    unreadCount,
    fetchUnreadNotificationCount,
    handleNotificationClick,
  };
}
