import { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  RefreshCw,
  TrendingUp,
  UserCheck,
  ArrowRight,
  UserX
} from 'lucide-react';
import { apiGet } from '../api/client';
import AttendanceChartsWidget from './AttendanceChartsWidget';

export default function HodDashboardView({
  token,
  currentUser,
  navigateToTab = () => {},
  playCyberSound = () => {}
}) {
  const [deptStats, setDeptStats] = useState(null);
  const [lowAttendanceStudents, setLowAttendanceStudents] = useState([]);
  const [staffToday, setStaffToday] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [openDisputes, setOpenDisputes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const departmentName = currentUser?.department || currentUser?.subject_department || 'Computer Science';

  const fetchHodData = async (isManualRefresh = false) => {
    if (!token) return;
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const [deptRes, lowRes, staffRes, leaveRes, disputeRes] = await Promise.allSettled([
        apiGet(`/analytics/department/${encodeURIComponent(departmentName)}`, { token }),
        apiGet(`/analytics/at-risk?department=${encodeURIComponent(departmentName)}`, { token }),
        apiGet('/staff-attendance/today', { token }),
        apiGet('/leave/all', { token }),
        apiGet('/disputes/list', { token })
      ]);

      if (deptRes.status === 'fulfilled' && deptRes.value?.ok) {
        const data = await deptRes.value.json();
        setDeptStats(data);
      }
      if (lowRes.status === 'fulfilled' && lowRes.value?.ok) {
        const data = await lowRes.value.json();
        const list = Array.isArray(data?.students) ? data.students : (Array.isArray(data) ? data : []);
        setLowAttendanceStudents(list);
      }
      if (staffRes.status === 'fulfilled' && staffRes.value?.ok) {
        const data = await staffRes.value.json();
        setStaffToday(data);
      }
      if (leaveRes.status === 'fulfilled' && leaveRes.value?.ok) {
        const data = await leaveRes.value.json();
        const pending = Array.isArray(data) ? data.filter(l => l.status === 'PENDING') : [];
        setPendingLeaves(pending);
      }
      if (disputeRes.status === 'fulfilled' && disputeRes.value?.ok) {
        const data = await disputeRes.value.json();
        const pending = Array.isArray(data) ? data.filter(d => d.status === 'PENDING') : [];
        setOpenDisputes(pending);
      }
    } catch (err) {
      setFetchError(err.message || 'Unable to connect to department analytics service.');
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
        const [deptRes, lowRes, staffRes, leaveRes, disputeRes] = await Promise.allSettled([
          apiGet(`/analytics/department/${encodeURIComponent(departmentName)}`, { token }),
          apiGet(`/analytics/at-risk?department=${encodeURIComponent(departmentName)}`, { token }),
          apiGet('/staff-attendance/today', { token }),
          apiGet('/leave/all', { token }),
          apiGet('/disputes/list', { token })
        ]);

        if (!isMounted) return;

        if (deptRes.status === 'fulfilled' && deptRes.value?.ok) {
          const data = await deptRes.value.json();
          setDeptStats(data);
        }
        if (lowRes.status === 'fulfilled' && lowRes.value?.ok) {
          const data = await lowRes.value.json();
          const list = Array.isArray(data?.students) ? data.students : (Array.isArray(data) ? data : []);
          setLowAttendanceStudents(list);
        }
        if (staffRes.status === 'fulfilled' && staffRes.value?.ok) {
          const data = await staffRes.value.json();
          setStaffToday(data);
        }
        if (leaveRes.status === 'fulfilled' && leaveRes.value?.ok) {
          const data = await leaveRes.value.json();
          setPendingLeaves(Array.isArray(data) ? data.filter(l => l.status === 'PENDING') : []);
        }
        if (disputeRes.status === 'fulfilled' && disputeRes.value?.ok) {
          const data = await disputeRes.value.json();
          setOpenDisputes(Array.isArray(data) ? data.filter(d => d.status === 'PENDING') : []);
        }
      } catch (err) {
        if (isMounted) setFetchError(err.message || 'Unable to connect to department analytics service.');
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
  }, [token, departmentName]);

  const handleRefresh = () => {
    playCyberSound('click');
    fetchHodData(true);
  };

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', color: '#0f172a' }}>
      {/* HEADER SECTION */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        padding: '20px 24px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: '#fef3c7',
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Building2 size={24} color="#d97706" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#b45309',
                background: '#fef3c7',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #fde68a'
              }}>
                HOD COMMAND CENTER
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{currentDateStr}</span>
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0 0', color: '#0f172a' }}>
              {departmentName} Department
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
              Welcome back, {currentUser?.name || 'Department Head'}
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
              padding: '9px 16px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isRefreshing ? 'wait' : 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin-anim' : ''} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {fetchError && (
        <div style={{
          padding: '14px 18px',
          marginBottom: '20px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          color: '#991b1b',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={18} color="#dc2626" />
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
        {/* Dept Attendance Today */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Dept Attendance Today</span>
            <TrendingUp size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>
            {(deptStats?.average_attendance ?? deptStats?.percentage) != null
              ? `${deptStats?.average_attendance ?? deptStats?.percentage}%`
              : (isLoading ? '...' : 'N/A')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Target: 75% minimum threshold
          </div>
        </div>

        {/* Present Students */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Present Students</span>
            <CheckCircle2 size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>
            {deptStats?.present_count ?? (isLoading ? '...' : 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Total Enrolled: {deptStats?.total_students ?? 0}
          </div>
        </div>

        {/* Absent Students */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Absent Students</span>
            <UserX size={18} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626' }}>
            {deptStats?.absent_count ?? (isLoading ? '...' : 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Requires monitoring
          </div>
        </div>

        {/* Pending Actions (Leaves & Disputes) */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid #fed7aa',
          borderRadius: '14px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>Pending Actions</span>
            <AlertTriangle size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706' }}>
            {pendingLeaves.length + openDisputes.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {pendingLeaves.length} Leaves | {openDisputes.length} Disputes
          </div>
        </div>
      </div>

      {/* TREND CHART & LOW ATTENDANCE GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Attendance Trend Widget */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#2563eb" />
            Department Attendance Analytics
          </h3>
          <AttendanceChartsWidget stats={deptStats || {}} />
        </div>

        {/* Low Attendance Alerts Table */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} color="#dc2626" />
              Low Attendance Risk Alerts (&lt; 75%)
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#991b1b', background: '#fee2e2', padding: '2px 8px', borderRadius: '4px' }}>
              {lowAttendanceStudents.length} Students
            </span>
          </div>

          {lowAttendanceStudents.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
              <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '8px', opacity: 0.8 }} />
              <div>All students meet the department attendance threshold!</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '320px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}>
                    <th style={{ padding: '10px' }}>Student</th>
                    <th style={{ padding: '10px' }}>Roll</th>
                    <th style={{ padding: '10px' }}>Attendance</th>
                    <th style={{ padding: '10px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowAttendanceStudents.slice(0, 8).map(st => (
                    <tr key={st.id || st.roll} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: 600, color: '#0f172a' }}>{st.name}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{st.roll}</td>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#dc2626' }}>
                        {st.percentage != null ? `${st.percentage}%` : 'Low'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <button
                          onClick={() => {
                            playCyberSound('click');
                            navigateToTab('interventions');
                          }}
                          style={{
                            padding: '4px 10px',
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            color: '#dc2626',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Intervene
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* FACULTY ATTENDANCE & PENDING ACTIONS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Read-Only Faculty Attendance Today */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={18} color="#2563eb" />
            Faculty Attendance Today (Read-Only)
          </h3>

          {!staffToday || !Array.isArray(staffToday.staff_logs) || staffToday.staff_logs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              No faculty check-in logs recorded for today yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '280px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}>
                    <th style={{ padding: '8px' }}>Faculty Member</th>
                    <th style={{ padding: '8px' }}>Check-In</th>
                    <th style={{ padding: '8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staffToday.staff_logs.slice(0, 6).map((log, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', color: '#0f172a', fontWeight: 600 }}>
                        {log.user_name || log.user_email}
                      </td>
                      <td style={{ padding: '8px', color: '#64748b' }}>
                        {log.check_in_time || '--:--'}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: log.status === 'Present' ? '#d1fae5' : '#fef3c7',
                          color: log.status === 'Present' ? '#065f46' : '#b45309'
                        }}>
                          {log.status || 'Present'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actionable Review Shortcuts */}
        <div style={{
          padding: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 16px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#d97706" />
            Actionable Pending Reviews
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Leaves card */}
            <div style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                  Pending Leave Applications ({pendingLeaves.length})
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Student & Faculty Tier 2 approvals
                </div>
              </div>
              <button
                onClick={() => {
                  playCyberSound('click');
                  navigateToTab('leave');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  color: '#b45309',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Review <ArrowRight size={14} />
              </button>
            </div>

            {/* Disputes card */}
            <div style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>
                  Escalated Attendance Disputes ({openDisputes.length})
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Attendance claims requiring HOD sign-off
                </div>
              </div>
              <button
                onClick={() => {
                  playCyberSound('click');
                  navigateToTab('disputes');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: '#e0f2fe',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  color: '#0369a1',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Review <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <div style={{
        padding: '20px 24px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 14px 0', color: '#0f172a' }}>
          Department Navigation Shortcuts
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <button
            onClick={() => { playCyberSound('click'); navigateToTab('attendance'); }}
            style={{
              padding: '9px 16px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Mark Department Attendance
          </button>
          <button
            onClick={() => { playCyberSound('click'); navigateToTab('reports'); }}
            style={{
              padding: '9px 16px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Department Reports
          </button>
          <button
            onClick={() => { playCyberSound('click'); navigateToTab('interventions'); }}
            style={{
              padding: '9px 16px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Student Interventions
          </button>
          <button
            onClick={() => { playCyberSound('click'); navigateToTab('students'); }}
            style={{
              padding: '9px 16px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Department Students Directory
          </button>
        </div>
      </div>
    </div>
  );
}
