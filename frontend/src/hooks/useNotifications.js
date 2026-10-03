import { useState, useEffect, useCallback } from 'react';
import { initializePushNotifications } from '../services/pushNotificationService';
import { notificationApi } from '../api/notificationApi.js';

export function resolveNotificationNavigation(notif, userRole = null) {
  if (!notif) return { targetTab: null, targetSubSetting: null, openScanner: false };

  const actionUrl = (notif.action_url || '').toLowerCase();
  const category = (notif.category || '').toUpperCase();
  const title = (notif.title || '').toLowerCase();
  const message = (notif.message || '').toLowerCase();

  const isLeave = category === 'LEAVE' || actionUrl.includes('leave') || title.includes('leave') || message.includes('leave');
  const isDispute = category === 'DISPUTE' || actionUrl.includes('dispute') || title.includes('dispute') || message.includes('dispute');
  const isAttendance = category === 'ATTENDANCE' || actionUrl.includes('attendance') || title.includes('attendance') || title.includes('check-in');
  const isCalendar = category === 'CALENDAR' || actionUrl.includes('calendar') || title.includes('holiday') || title.includes('calendar') || message.includes('calendar');
  const isSecurity = category === 'SECURITY' || category === 'SYSTEM' || actionUrl.includes('security') || title.includes('security');
  const isClasses = category === 'CLASS_REMINDER' || category === 'CLASSES' || actionUrl.includes('classes') || actionUrl.includes('schedule');

  const role = (userRole || '').toLowerCase();

  // 1. Leave Requests -> Direct to Leave Management (Admin/Teacher) or Student Dashboard (Student)
  if (isLeave) {
    if (role === 'student') {
      return { targetTab: 'student-attendance', targetSubSetting: null, openScanner: false };
    }
    return { targetTab: 'settings', targetSubSetting: 'leave_management', openScanner: false };
  }

  // 2. Disputes -> Direct to Disputes Queue (Admin/Teacher) or Student Attendance (Student)
  if (isDispute) {
    if (role === 'student') {
      return { targetTab: 'student-attendance', targetSubSetting: null, openScanner: false };
    }
    return { targetTab: 'disputes', targetSubSetting: null, openScanner: false };
  }

  // 3. Calendar & Holiday Events
  if (isCalendar) {
    return { targetTab: 'calendar', targetSubSetting: null, openScanner: false };
  }

  // 4. Attendance Updates & Logs
  if (isAttendance) {
    if (role === 'student') {
      return { targetTab: 'student-attendance', targetSubSetting: null, openScanner: false };
    }
    return { targetTab: 'logs', targetSubSetting: null, openScanner: false };
  }

  // 5. Classes & Live Scanner
  if (isClasses) {
    if (role === 'student') {
      return { targetTab: 'student-attendance', targetSubSetting: null, openScanner: true };
    }
    return { targetTab: 'attendance', targetSubSetting: null, openScanner: true };
  }

  // 6. Security & System Alerts
  if (isSecurity) {
    return { targetTab: 'settings', targetSubSetting: null, openScanner: false };
  }

  // Fallback defaults by role
  return { 
    targetTab: role === 'student' ? 'student-attendance' : 'dashboard', 
    targetSubSetting: null, 
    openScanner: false 
  };
}

export default function useNotifications(token, currentUser, userRole, onNavigate) {
  // Support both 3-arg useNotifications(token, currentUser, onNavigate) and 4-arg (token, currentUser, userRole, onNavigate)
  const actualOnNavigate = typeof userRole === 'function' ? userRole : onNavigate;
  const effectiveRole = typeof userRole === 'string' ? userRole : (currentUser?.role || null);

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
      const nav = resolveNotificationNavigation(data, effectiveRole || currentUser?.role);
      if (actualOnNavigate) actualOnNavigate(nav);
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
  }, [token, currentUser, effectiveRole, fetchUnreadNotificationCount, actualOnNavigate]);

  const handleNotificationClick = useCallback((notif) => {
    fetchUnreadNotificationCount();
    const nav = resolveNotificationNavigation(notif, effectiveRole || currentUser?.role);
    if (actualOnNavigate) actualOnNavigate(nav);
  }, [fetchUnreadNotificationCount, actualOnNavigate, effectiveRole, currentUser]);

  return {
    showNotificationDrawer,
    setShowNotificationDrawer,
    unreadCount,
    fetchUnreadNotificationCount,
    handleNotificationClick,
  };
}
