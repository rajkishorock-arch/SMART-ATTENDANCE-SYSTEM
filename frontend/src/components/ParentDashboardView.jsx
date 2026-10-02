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
import { apiGet } from '../api/client.js';
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
      color: '#0f172a'
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
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(30, 64, 175, 0.08)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserCheck size={24} color="#1e40af" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#1e40af',
                background: '#eff6ff',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #bfdbfe'
              }}>
                PARENT PORTAL
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{currentDateStr}</span>
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0 0', color: '#0f172a' }}>
              {childName}
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
              Roll Number: <strong style={{ color: '#0f172a' }}>{childRoll}</strong> | Guardian: {parentName}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              fontSize: '0.85rem',
              fontWeight: 600,
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
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Attendance Percentage</span>
            <TrendingUp size={18} color={overallPercentage != null && overallPercentage >= 75 ? '#059669' : '#d97706'} />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: overallPercentage != null && overallPercentage >= 75 ? '#059669' : '#d97706' }}>
            {overallPercentage != null ? `${overallPercentage}%` : (isLoading ? '...' : 'N/A')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Threshold: 75% minimum
          </div>
        </div>

        {/* Present Days */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Attended Days</span>
            <CheckCircle2 size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>
            {isLoading ? '...' : presentCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Total Conducted: {totalLogs}
          </div>
        </div>

        {/* Absent Days */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Absent Days</span>
            <UserX size={18} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626' }}>
            {isLoading ? '...' : absentCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Recorded absences
          </div>
        </div>

        {/* Last Attendance Scan */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Last Attendance Log</span>
            <Clock size={18} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {lastScanLog ? `${lastScanLog.date}` : (isLoading ? '...' : 'No logs yet')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
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
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#1e40af" />
            Attendance Summary Chart
          </h3>
          <AttendanceChartsWidget stats={chartStats} />
        </div>

        {/* Recent Attendance Logs Table */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#2563eb" />
              Recent Attendance Activity
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
              {totalLogs} Records
            </span>
          </div>

          {attendanceLogs.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
              <BookOpen size={32} color="#94a3b8" style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div>No attendance records found for this student.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: '#64748b' }}>
                    <th style={{ padding: '10px' }}>Date</th>
                    <th style={{ padding: '10px' }}>Time</th>
                    <th style={{ padding: '10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLogs.slice(0, 10).map((log, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px', color: '#0f172a', fontWeight: 600 }}>{log.date}</td>
                      <td style={{ padding: '10px', color: '#475569' }}>{log.time || '--:--'}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: log.status === 'Present'
                            ? '#ecfdf5'
                            : log.status === 'LATE'
                              ? '#fffbeb'
                              : '#fef2f2',
                          color: log.status === 'Present'
                            ? '#059669'
                            : log.status === 'LATE'
                              ? '#d97706'
                              : '#dc2626',
                          border: `1px solid ${log.status === 'Present' ? '#a7f3d0' : log.status === 'LATE' ? '#fde68a' : '#fecaca'}`
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
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={18} color="#d97706" />
              Notifications & Alerts
            </h3>
            {unreadNotifsCount > 0 && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#dc2626',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '2px 8px',
                borderRadius: '10px'
              }}>
                {unreadNotifsCount} New
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 16px 0' }}>
            Stay updated with real-time absence warnings, daily summary dispatches, and campus announcements.
          </p>

          <button
            onClick={() => {
              playCyberSound('click');
              setShowNotificationDrawer(true);
            }}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px 16px',
              fontSize: '0.85rem',
              fontWeight: 600,
              minHeight: '44px'
            }}
          >
            Open Notification Drawer <ArrowRight size={16} />
          </button>
        </div>

        {/* Quick Action Navigation Bar */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 14px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#059669" />
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
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                color: '#0f172a',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              <span>View Full Student Attendance Logs</span>
              <ArrowRight size={14} color="#64748b" />
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
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                color: '#0f172a',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              <span>Account & Preference Settings</span>
              <ArrowRight size={14} color="#64748b" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
