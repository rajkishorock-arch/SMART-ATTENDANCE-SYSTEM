import { useState, useEffect } from 'react';
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  UserX,
  Bell,
  ArrowRight,
  ShieldCheck,
  Clock,
  BookOpen
} from 'lucide-react';
import { apiGet } from '../api/index.js';
import AttendanceChartsWidget from './AttendanceChartsWidget';

export default function ParentDashboardView({
  token,
  currentUser,
  navigateToTab = () => {},
  playCyberSound = () => {},
  setShowNotificationDrawer = () => {}
}) {
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Extract linked child identity from token claims or currentUser context
  const childName = currentUser?.details?.student_name || currentUser?.student_name || 'Linked Student';
  const childRoll = currentUser?.details?.student_roll || currentUser?.student_roll || 'N/A';
  const parentName = currentUser?.name || 'Parent / Guardian';

  const loadParentData = async (isManualRefresh = false) => {
    if (!token) return;
    if (isManualRefresh) setIsRefreshing(true);
    setFetchError('');

    try {
      const [attnRes, notifRes] = await Promise.allSettled([
        apiGet('/parents/child-attendance', { token }),
        apiGet('/notifications/my', { token })
      ]);

      if (attnRes.status === 'fulfilled' && attnRes.value?.ok) {
        const data = await attnRes.value.json();
        setAttendanceLogs(Array.isArray(data) ? data : []);
      }

      if (notifRes.status === 'fulfilled' && notifRes.value?.ok) {
        const data = await notifRes.value.json();
        setNotifications(Array.isArray(data) ? data : (data?.notifications || []));
      }
    } catch (err) {
      setFetchError(err.message || 'Unable to connect to parent portal services.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (!token) return;

    const runFetch = async () => {
      try {
        const [attnRes, notifRes] = await Promise.allSettled([
          apiGet('/parents/child-attendance', { token }),
          apiGet('/notifications/my', { token })
        ]);

        if (!isMounted) return;

        if (attnRes.status === 'fulfilled' && attnRes.value?.ok) {
          const data = await attnRes.value.json();
          setAttendanceLogs(Array.isArray(data) ? data : []);
        }

        if (notifRes.status === 'fulfilled' && notifRes.value?.ok) {
          const data = await notifRes.value.json();
          setNotifications(Array.isArray(data) ? data : (data?.notifications || []));
        }
      } catch (err) {
        if (isMounted) setFetchError(err.message || 'Unable to connect to parent portal services.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    runFetch();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleRefresh = () => {
    playCyberSound('click');
    loadParentData(true);
  };

  // Derive real statistics from verified child attendance logs
  const totalLogs = attendanceLogs.length;
  const presentCount = attendanceLogs.filter(l => l.status === 'Present' || l.status === 'LATE').length;
  const absentCount = attendanceLogs.filter(l => l.status === 'Absent').length;
  const overallPercentage = totalLogs > 0 ? Math.round((presentCount / totalLogs) * 100) : null;
  const lastScanLog = attendanceLogs[0];

  // Helper stats shape for AttendanceChartsWidget
  const chartStats = {
    total_students: totalLogs,
    total_present_today: presentCount,
    total_absent_today: absentCount,
    average_attendance: overallPercentage,
    weekly_trends: [
      { day: 'Logs', count: presentCount }
    ]
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const unreadNotifsCount = notifications.filter(n => !n.read && !n.is_read).length;

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '24px 16px',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#f8fafc'
    }}>
      {/* HEADER SECTION */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        padding: '24px',
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(79, 70, 229, 0.3))',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserCheck size={24} color="#00f2fe" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#00f2fe',
                background: 'rgba(0, 242, 254, 0.12)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(0, 242, 254, 0.3)'
              }}>
                PARENT PORTAL
              </span>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{currentDateStr}</span>
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0 0', color: '#fff' }}>
              {childName}
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
              Roll Number: <strong style={{ color: '#cbd5e1' }}>{childRoll}</strong> | Guardian: {parentName}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              color: '#f8fafc',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isRefreshing ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              minHeight: '44px'
            }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin-anim' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {fetchError && (
        <div style={{
          padding: '14px 18px',
          marginBottom: '20px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          color: '#f87171',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={18} color="#f87171" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* METRIC CARDS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* Attendance Rate */}
        <div style={{
          padding: '20px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Attendance Percentage</span>
            <TrendingUp size={18} color={overallPercentage != null && overallPercentage >= 75 ? '#10b981' : '#f59e0b'} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: overallPercentage != null && overallPercentage >= 75 ? '#10b981' : '#f59e0b' }}>
            {overallPercentage != null ? `${overallPercentage}%` : (isLoading ? '...' : 'N/A')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Threshold: 75% minimum
          </div>
        </div>

        {/* Present Days */}
        <div style={{
          padding: '20px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Attended Days</span>
            <CheckCircle2 size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#3b82f6' }}>
            {isLoading ? '...' : presentCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Total Conducted: {totalLogs}
          </div>
        </div>

        {/* Absent Days */}
        <div style={{
          padding: '20px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Absent Days</span>
            <UserX size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444' }}>
            {isLoading ? '...' : absentCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Recorded absences
          </div>
        </div>

        {/* Last Attendance Scan */}
        <div style={{
          padding: '20px',
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '14px',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Last Attendance Log</span>
            <Clock size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lastScanLog ? `${lastScanLog.date}` : (isLoading ? '...' : 'No logs yet')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
            {lastScanLog ? `Time: ${lastScanLog.time || '--:--'} (${lastScanLog.status})` : 'Awaiting check-in'}
          </div>
        </div>
      </div>

      {/* CHARTS & RECENT LOGS SECTION */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Attendance Chart Widget */}
        <div style={{
          padding: '20px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#00f2fe" />
            Attendance Summary Chart
          </h3>
          <AttendanceChartsWidget stats={chartStats} />
        </div>

        {/* Recent Attendance Logs Table */}
        <div style={{
          padding: '20px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#3b82f6" />
              Recent Attendance Activity
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px' }}>
              {totalLogs} Records
            </span>
          </div>

          {attendanceLogs.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
              <BookOpen size={32} color="#94a3b8" style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div>No attendance records found for this student.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                    <th style={{ padding: '10px' }}>Date</th>
                    <th style={{ padding: '10px' }}>Time</th>
                    <th style={{ padding: '10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLogs.slice(0, 10).map((log, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '10px', color: '#fff', fontWeight: 600 }}>{log.date}</td>
                      <td style={{ padding: '10px', color: '#94a3b8' }}>{log.time || '--:--'}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: log.status === 'Present'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : log.status === 'LATE'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color: log.status === 'Present'
                            ? '#10b981'
                            : log.status === 'LATE'
                              ? '#f59e0b'
                              : '#f87171'
                        }}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* NOTIFICATIONS & QUICK ACTIONS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '20px'
      }}>
        {/* Notifications Shortcut Card */}
        <div style={{
          padding: '20px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="#f59e0b" />
              Notifications & Alerts
            </h3>
            {unreadNotifsCount > 0 && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#fff',
                background: '#ef4444',
                padding: '2px 8px',
                borderRadius: '10px'
              }}>
                {unreadNotifsCount} New
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0 0 16px 0' }}>
            Stay updated with real-time absence warnings, daily summary dispatches, and campus announcements.
          </p>

          <button
            onClick={() => {
              playCyberSound('click');
              setShowNotificationDrawer(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '10px',
              color: '#f59e0b',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '44px'
            }}
          >
            Open Notification Drawer <ArrowRight size={16} />
          </button>
        </div>

        {/* Quick Action Navigation Bar */}
        <div style={{
          padding: '20px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 14px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#10b981" />
            Quick Navigation Shortcuts
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => {
                playCyberSound('click');
                navigateToTab('student-attendance');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                color: '#f8fafc',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              <span>View Full Student Attendance Logs</span>
              <ArrowRight size={14} color="#94a3b8" />
            </button>

            <button
              onClick={() => {
                playCyberSound('click');
                navigateToTab('settings');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                color: '#f8fafc',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              <span>Account & Preference Settings</span>
              <ArrowRight size={14} color="#94a3b8" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
