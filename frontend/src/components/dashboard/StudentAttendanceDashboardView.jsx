import React from 'react';
import { BookOpen, AlertCircle, MessageSquare, Calendar, CheckCircle2, TrendingUp, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';
import StudentTodayView from '../StudentTodayView';
import StudentAttendanceWallet from '../StudentAttendanceWallet';
import AttendancePlannerWidget from '../AttendancePlannerWidget';
import GamificationHub from '../GamificationHub';
import LeaveApplicationForm from '../LeaveApplicationForm';

function BlueprintDayBreakdownModal({ 
  isOpen, 
  onClose, 
  dateStr, 
  studentLogs = [], 
  activeSubject = null,
  playCyberSound = () => {},
  onRequestDispute 
}) {
  if (!isOpen || !dateStr) return null;

  const safeLogs = Array.isArray(studentLogs) ? studentLogs : [];
  // Normalize date string for matching (both DD/MM/YYYY and YYYY-MM-DD)
  const matchingLogs = safeLogs.filter(log => {
    if (!log || !log.date) return false;
    const lDate = log.date.trim();
    if (lDate === dateStr) return true;

    // Convert DD/MM/YYYY to YYYY-MM-DD or vice-versa
    if (dateStr.includes('/') && lDate.includes('-')) {
      const [d, m, y] = dateStr.split('/');
      const iso = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
      return lDate === iso;
    }
    if (dateStr.includes('-') && lDate.includes('/')) {
      const [y, m, d] = dateStr.split('-');
      const slash = `${parseInt(d)}/${parseInt(m)}/${y}`;
      const slashPad = `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
      return lDate === slash || lDate === slashPad;
    }
    return false;
  });

  // Filter by active subject if a specific subject tab is selected
  const filteredLogs = activeSubject && activeSubject.subject_id !== 'GEN' && activeSubject.subject_id !== 'ALL'
    ? matchingLogs.filter(log => String(log.subject_id) === String(activeSubject.subject_id) || log.subject_code === activeSubject.subject_code)
    : matchingLogs;

  const presentCount = filteredLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
  const absentCount = filteredLogs.filter(l => l.attendance === 'Absent').length;

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto', borderRadius: '20px', border: '1px solid rgba(139,92,246,0.3)', padding: '28px', background: '#0b0f19' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar color="#8b5cf6" size={24} />
            <div>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.15rem', fontWeight: 800 }}>Attendance Details — {dateStr}</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                {activeSubject ? `Filter: ${activeSubject.subject_code || activeSubject.subject_name || 'General'}` : 'All Subjects'}
              </p>
            </div>
          </div>
          <button onClick={() => { playCyberSound('click'); onClose(); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        {/* Stats Pill Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Presents / Late</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{presentCount}</div>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Absents</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>{absentCount}</div>
          </div>
          <div style={{ background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.2)', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Total Classes</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00f2fe' }}>{filteredLogs.length}</div>
          </div>
        </div>

        {/* Detailed Class Cards */}
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px border-dashed rgba(255,255,255,0.08)' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 12px' }}>
              No attendance records found in real database for {dateStr}.
            </p>
            {onRequestDispute && (
              <button
                onClick={() => {
                  onClose();
                  onRequestDispute({ date: dateStr, attendance: 'Absent' });
                }}
                style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.25)', color: '#00f2fe', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
              >
                ➕ Submit Correction Request for {dateStr}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredLogs.map((log, idx) => {
              const isPresent = log.attendance === 'Present' || log.attendance === 'Late';
              return (
                <div key={log.id || idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📚 {log.subject_name ? `${log.subject_name} (${log.subject_code || ''})` : (log.department || 'General Class')}</span>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: isPresent ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: isPresent ? '#10b981' : '#ef4444' }}>
                      {log.attendance || 'Present'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#94a3b8' }}>
                    <span>⏰ Period: <strong style={{ color: '#00f2fe' }}>{log.period_label || log.session_time || 'Regular Session'}</strong></span>
                    <span>🕒 Time: <strong style={{ color: '#e2e8f0' }}>{log.time || 'N/A'}</strong></span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: '0.75rem', color: '#64748b' }}>
                    <span>Method: {log.verification_method || 'AI Face Scan'}</span>
                    {!isPresent && onRequestDispute && (
                      <button
                        onClick={() => {
                          onClose();
                          onRequestDispute(log);
                        }}
                        style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}
                      >
                        🚨 Submit Correction Request
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


function StudentStatsRowWithModals({ studentLogs = [], playCyberSound = () => {}, onRequestDispute }) {
  const [showRateModal, setShowRateModal] = React.useState(false);
  const [showPresentDaysModal, setShowPresentDaysModal] = React.useState(false);
  const [showLastLogModal, setShowLastLogModal] = React.useState(false);
  const [logFilter, setLogFilter] = React.useState('all');

  const safeLogs = Array.isArray(studentLogs) ? studentLogs : [];
  const totalLogs = safeLogs.length;
  const presentLogs = safeLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late');
  const absentLogs = safeLogs.filter(l => l.attendance === 'Absent');
  const lateLogs = safeLogs.filter(l => l.attendance === 'Late');
  const presentCount = presentLogs.length;
  const attendanceRate = totalLogs > 0 ? Math.min(100.0, Math.max(0.0, (presentCount / totalLogs) * 100)) : 0;

  // Latest log calculation strictly from real studentLogs in DB
  const latestLog = React.useMemo(() => {
    if (safeLogs.length === 0) return null;
    const sorted = [...safeLogs].sort((a, b) => {
      const dateA = (a.date || '').split('/').reverse().join('-');
      const dateB = (b.date || '').split('/').reverse().join('-');
      return (dateB + (b.time || '')) > (dateA + (a.time || '')) ? 1 : -1;
    });
    return sorted[0];
  }, [safeLogs]);

  // Subject-wise breakdown calculation strictly from real studentLogs
  const subjectBreakdown = React.useMemo(() => {
    const map = {};
    safeLogs.forEach(log => {
      const sub = log.subject_name || log.subject_code || 'General / Unclassified';
      if (!map[sub]) map[sub] = { name: sub, total: 0, present: 0, absent: 0, late: 0 };
      map[sub].total += 1;
      if (log.attendance === 'Present') map[sub].present += 1;
      else if (log.attendance === 'Late') map[sub].late += 1;
      else if (log.attendance === 'Absent') map[sub].absent += 1;
    });
    return Object.values(map);
  }, [safeLogs]);

  // Filtered logs for Presents Breakdown modal
  const filteredLogs = React.useMemo(() => {
    if (logFilter === 'present') return safeLogs.filter(l => l.attendance === 'Present');
    if (logFilter === 'absent') return safeLogs.filter(l => l.attendance === 'Absent');
    if (logFilter === 'late') return safeLogs.filter(l => l.attendance === 'Late');
    return safeLogs;
  }, [safeLogs, logFilter]);

  return (
    <>
      {/* Stats Cards Row */}
      <div className="dashboard-grid">
        {/* Card 1: Attendance Percentage */}
        <div 
          className="glass-panel metric-card" 
          style={{ padding: '24px', animationDelay: '100ms', cursor: 'pointer', transition: 'all 0.3s ease', border: '1px solid rgba(16,185,129,0.2)' }}
          onClick={() => { setShowRateModal(true); if (playCyberSound) playCyberSound('click'); }}
        >
          <div className="metric-info">
            <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span>My Attendance Rate</span>
              <span style={{ fontSize: '0.68rem', color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>🔍 Breakdown</span>
            </h3>
            <p style={{ color: attendanceRate < 75 ? '#ef4444' : '#10b981', marginTop: '6px' }}>
              {attendanceRate.toFixed(1)}%
            </p>
          </div>
          <div className="metric-icon" style={{ background: attendanceRate < 75 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: attendanceRate < 75 ? '#ef4444' : '#10b981' }}>
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Card 2: Present / Total Days */}
        <div 
          className="glass-panel metric-card" 
          style={{ padding: '24px', animationDelay: '200ms', cursor: 'pointer', transition: 'all 0.3s ease', border: '1px solid rgba(0,242,254,0.2)' }}
          onClick={() => { setShowPresentDaysModal(true); if (playCyberSound) playCyberSound('click'); }}
        >
          <div className="metric-info">
            <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span>Presents / Total Days</span>
              <span style={{ fontSize: '0.68rem', color: '#00f2fe', background: 'rgba(0,242,254,0.12)', border: '1px solid rgba(0,242,254,0.3)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>📜 View List</span>
            </h3>
            <p style={{ marginTop: '6px' }}>
              {presentCount} / {totalLogs}
            </p>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe' }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Card 3: Last Check-In */}
        <div 
          className="glass-panel metric-card" 
          style={{ padding: '24px', animationDelay: '300ms', cursor: 'pointer', transition: 'all 0.3s ease', border: '1px solid rgba(139,92,246,0.2)' }}
          onClick={() => { setShowLastLogModal(true); if (playCyberSound) playCyberSound('click'); }}
        >
          <div className="metric-info">
            <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span>Last Attendance Log</span>
              <span style={{ fontSize: '0.68rem', color: '#8b5cf6', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>⏰ Log Details</span>
            </h3>
            <p style={{ fontSize: '0.92rem', fontWeight: 600, marginTop: '8px', color: '#f8fafc' }}>
              {latestLog ? `${latestLog.date} ${latestLog.time || ''}` : 'No Logs Found'}
            </p>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Calendar size={24} />
          </div>
        </div>
      </div>

      {/* ── MODAL 1: MY ATTENDANCE RATE BREAKDOWN MODAL ── */}
      {showRateModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.3)', padding: '28px', background: '#0b0f19' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <TrendingUp color="#10b981" size={24} />
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2rem', fontWeight: 800 }}>Attendance Rate & Subject Breakdown</h3>
              </div>
              <button onClick={() => setShowRateModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Top Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Overall Rate</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: attendanceRate >= 75 ? '#10b981' : '#ef4444', marginTop: '2px' }}>{attendanceRate.toFixed(1)}%</div>
              </div>
              <div style={{ background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.2)', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Attended / Total</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#00f2fe', marginTop: '2px' }}>{presentCount} / {totalLogs}</div>
              </div>
              <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Status Zone</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: attendanceRate >= 75 ? '#10b981' : '#ef4444', marginTop: '8px' }}>
                  {attendanceRate >= 75 ? '✅ Safe Zone' : '⚠️ Deficit Alert'}
                </div>
              </div>
            </div>

            {/* Subject Breakdown Section */}
            <h4 style={{ color: '#f8fafc', margin: '0 0 12px 0', fontSize: '0.95rem' }}>📚 Subject-wise Attendance Performance (Real DB Logs)</h4>
            {subjectBreakdown.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No subject records available yet in real database.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {subjectBreakdown.map((sub, i) => {
                  const rate = sub.total > 0 ? (sub.present / sub.total) * 100 : 0;
                  return (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', padding: '14px 18px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>{sub.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                          Attended <strong style={{ color: '#e2e8f0' }}>{sub.present}</strong> out of <strong style={{ color: '#e2e8f0' }}>{sub.total}</strong> classes
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: rate >= 75 ? '#10b981' : '#ef4444' }}>{rate.toFixed(1)}%</span>
                        <div style={{ width: '80px', height: '5px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, rate)}%`, height: '100%', background: rate >= 75 ? '#10b981' : '#ef4444' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 2: PRESENTS & TOTAL DAYS BREAKDOWN MODAL ── */}
      {showPresentDaysModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto', borderRadius: '20px', border: '1px solid rgba(0,242,254,0.3)', padding: '28px', background: '#0b0f19' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 color="#00f2fe" size={24} />
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2rem', fontWeight: 800 }}>Complete Attendance Logs & Days Summary</h3>
              </div>
              <button onClick={() => setShowPresentDaysModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {[
                { key: 'all', label: `All (${totalLogs})` },
                { key: 'present', label: `Present (${presentLogs.length})` },
                { key: 'absent', label: `Absent (${absentLogs.length})` },
                { key: 'late', label: `Late (${lateLogs.length})` }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setLogFilter(f.key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: logFilter === f.key ? '1px solid rgba(0,242,254,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    background: logFilter === f.key ? 'rgba(0,242,254,0.15)' : 'rgba(255,255,255,0.03)',
                    color: logFilter === f.key ? '#00f2fe' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Log List */}
            {filteredLogs.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '30px' }}>No matching attendance records found in real database.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredLogs.map((log, idx) => {
                  const isPresent = log.attendance === 'Present' || log.attendance === 'Late';
                  return (
                    <div key={log.id || idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>📅 {log.date}</span>
                          {log.time && <span style={{ color: '#00f2fe', fontSize: '0.78rem' }}>🕒 {log.time}</span>}
                          {log.period_label && <span style={{ background: 'rgba(0,242,254,0.1)', color: '#00f2fe', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>{log.period_label}</span>}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '3px' }}>
                          📚 {log.subject_name ? `${log.subject_name} (${log.subject_code || ''})` : (log.department || 'General Class')} • Method: {log.verification_method || 'AI Face Scan'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: isPresent ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: isPresent ? '#10b981' : '#ef4444' }}>
                          {log.attendance || 'Present'}
                        </span>
                        {!isPresent && onRequestDispute && (
                          <button
                            onClick={() => {
                              setShowPresentDaysModal(false);
                              onRequestDispute(log);
                            }}
                            style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '0.72rem', textDecoration: 'underline', cursor: 'pointer' }}
                          >
                            Dispute
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 3: LAST ATTENDANCE LOG DETAILS MODAL ── */}
      {showLastLogModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '550px', borderRadius: '20px', border: '1px solid rgba(139,92,246,0.3)', padding: '28px', background: '#0b0f19' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar color="#8b5cf6" size={24} />
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2rem', fontWeight: 800 }}>Latest Check-in Log Details</h3>
              </div>
              <button onClick={() => setShowLastLogModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {!latestLog ? (
              <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No attendance log recorded yet in real database.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Check-in Timestamp</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#8b5cf6', marginTop: '2px' }}>
                    📅 {latestLog.date} 🕒 {latestLog.time || 'N/A'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Subject / Class</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', marginTop: '3px' }}>
                      {latestLog.subject_name ? `${latestLog.subject_name} (${latestLog.subject_code || ''})` : 'General Class'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Status</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: latestLog.attendance === 'Present' || latestLog.attendance === 'Late' ? '#10b981' : '#ef4444', marginTop: '3px' }}>
                      {latestLog.attendance || 'Present'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Session / Period</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#00f2fe', marginTop: '3px' }}>
                      {latestLog.period_label || latestLog.session_time || 'Regular Session'}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Verification Method</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', marginTop: '3px' }}>
                      {latestLog.verification_method || 'AI Face Scan'}
                    </div>
                  </div>
                </div>

                {latestLog.attendance !== 'Present' && onRequestDispute && (
                  <button
                    onClick={() => {
                      setShowLastLogModal(false);
                      onRequestDispute(latestLog);
                    }}
                    style={{ marginTop: '10px', padding: '12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}
                  >
                    🚨 Dispute This Check-in
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}


function AiAttendanceForecaster({ blueprintData = [], playCyberSound }) {
  const [selectedSubId, setSelectedSubId] = React.useState('');
  const [simType, setSimType] = React.useState('attend'); // 'attend' or 'bunk'
  const [simCount, setSimCount] = React.useState(2);

  const activeSubId = selectedSubId || (blueprintData[0]?.subject_id || '');

  if (blueprintData.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(0,242,254,0.15)', background: 'rgba(255,255,255,0.01)', textAlign: 'center', color: '#9ca3af' }}>
        <p style={{ fontSize: '1.4rem', margin: '0 0 8px' }}>🤖</p>
        <p style={{ fontSize: '0.85rem', margin: 0 }}>Attendance logs are empty. Simulator will activate once class logs are recorded.</p>
      </div>
    );
  }

  const activeSub = blueprintData.find(s => s.subject_id === parseInt(selectedSubId)) || blueprintData[0];
  
  // Calculate stats
  const vals = Object.values(activeSub?.calendar || {});
  const present = vals.filter(v => v === 'Present').length;
  const late = vals.filter(v => v === 'Late').length;
  // const absent = vals.filter(v => v === 'Absent').length;
  const total = vals.length;
  const currentRate = total > 0 ? ((present + late) / total) * 100 : 0;

  // Simulate changes
  const simTotal = total + simCount;
  const simPresent = simType === 'attend' ? (present + late) + simCount : (present + late);
  const simRate = simTotal > 0 ? (simPresent / simTotal) * 100 : 0;

  const isSafe = simRate >= 75;

  // Recommendation generator
  const getRecommendation = () => {
    if (total === 0) {
      return `New course registered. Attending your initial classes is critical to establish a strong attendance base.`;
    }
    if (simType === 'bunk') {
      if (simRate < 75) {
        return `⚠️ Critically Unsafe! Bunking the next ${simCount} lecture(s) of ${activeSub.subject_name} will drag your attendance down to ${simRate.toFixed(1)}% (below the 75% limit). You should attend all classes.`;
      } else if (simRate < 77) {
        return `⚠️ Risk Warning! Bunking will drop your attendance to ${simRate.toFixed(1)}%. You will remain just above the border zone. Avoid missing classes.`;
      } else {
        const canBunkMax = Math.floor((present + late) / 0.75 - total);
        return `🟢 You can safely bunk. Your attendance will remain at ${simRate.toFixed(1)}%. Technically, you can miss up to ${canBunkMax} lectures of this subject without dropping below 75%.`;
      }
    } else {
      if (currentRate < 75 && simRate >= 75) {
        return `🎉 Breakthrough! Attending the next ${simCount} lecture(s) will lift your attendance to ${simRate.toFixed(1)}%, successfully restoring your status back into the safe zone.`;
      } else if (currentRate < 75) {
        const remaining = Math.ceil((0.75 * total - (present + late)) / 0.25);
        return `📈 Keep going! Attending these ${simCount} classes raises your status to ${simRate.toFixed(1)}%. You need to attend at least ${remaining} consecutive classes to reach 75%.`;
      } else {
        return `🚀 Excellent drive! Attending ${simCount} more classes increases your rating to ${simRate.toFixed(1)}%, solidifying your safe buffer and academic profile.`;
      }
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '24px', borderRadius: '20px',
      border: `1px solid ${isSafe ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
      background: 'linear-gradient(135deg, rgba(9,12,21,0.98) 0%, rgba(22,22,44,0.98) 100%)',
      boxShadow: `0 8px 32px rgba(0,0,0,0.3)`
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(0,242,254,0.1)', border: '1px solid rgba(0,242,254,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            🤖
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>AI Attendance Forecaster & Bunk Simulator</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>Select a subject to project future attendance and safety margins</p>
          </div>
        </div>

        {/* Subject Select */}
        <select value={activeSubId} onChange={e => {
          setSelectedSubId(e.target.value);
          if (playCyberSound) playCyberSound('click');
        }} style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(30,30,45,0.98)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f4f6', fontSize: '0.8rem', outline: 'none' }}>
          {blueprintData.map(sub => (
            <option key={sub.subject_id} value={sub.subject_id}>{sub.subject_name} ({sub.subject_code})</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
        {/* Left Side: Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Toggle Type */}
          <div>
            <label style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>Simulation Scenario</label>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => { setSimType('attend'); if (playCyberSound) playCyberSound('click'); }} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: simType === 'attend' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent', color: simType === 'attend' ? '#000' : '#9ca3af', transition: 'all 0.2s' }}>
                🟢 Attend Lectures
              </button>
              <button onClick={() => { setSimType('bunk'); if (playCyberSound) playCyberSound('click'); }} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: simType === 'bunk' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent', color: simType === 'bunk' ? '#fff' : '#9ca3af', transition: 'all 0.2s' }}>
                🔴 Bunk Lectures
              </button>
            </div>
          </div>

          {/* Slider Count */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.72rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Number of Classes</label>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: simType === 'attend' ? '#10b981' : '#ef4444' }}>{simCount} class{simCount !== 1 ? 'es' : ''}</span>
            </div>
            <input type="range" min="1" max="15" value={simCount} onChange={e => setSimCount(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: simType === 'attend' ? '#10b981' : '#ef4444', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', cursor: 'pointer' }} />
          </div>
        </div>

        {/* Right Side: Projections Output */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Current Attendance</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: currentRate >= 75 ? '#10b981' : '#ef4444' }}>{currentRate.toFixed(1)}%</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: '#d1d5db', fontWeight: 600 }}>Forecasted Attendance</span>
            <span style={{
              fontSize: '1.2rem', fontWeight: 800,
              color: isSafe ? '#10b981' : '#ef4444',
              textShadow: isSafe ? '0 0 10px rgba(16,185,129,0.3)' : '0 0 10px rgba(239,68,68,0.3)'
            }}>{simRate.toFixed(1)}%</span>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(simRate, 100)}%`, height: '100%', background: isSafe ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
          </div>

          {/* Safety margin badge */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
              background: isSafe ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: isSafe ? '#10b981' : '#ef4444',
              border: `1px solid ${isSafe ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
            }}>
              {isSafe ? '🟢 SAFE BUFFER' : '🔴 WARNING: BELOW 75%'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Recommendation Message */}
      <div style={{
        marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
        background: isSafe ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
        borderLeft: `3px solid ${isSafe ? '#10b981' : '#ef4444'}`,
        color: '#d1d5db', fontSize: '0.8rem', lineHeight: 1.45
      }}>
        <strong>🤖 AI Coach:</strong> {getRecommendation()}
      </div>
    </div>
  );
}


export default function StudentAttendanceDashboardView({
  studentLogs = [],
  studentSubjectStats = [],
  blueprintData,
  blueprintLoading,
  selectedBlueprintSubject,
  setSelectedBlueprintSubject,
  blueprintCalendarDate,
  setBlueprintCalendarDate,
  geofenceStatus = { checked: false, inside: false, distance: null },
  setGeofenceStatus = () => {},
  studentLeaveRequests = [],
  token,
  API_BASE_URL,
  subjects = [],
  fetchBlueprint,
  fetchStudentLeaves,
  exportToCSV,
  setShowVirtualId,
  setShowDisputeModal,
  setDisputePrefillSession,
  setShowFeedbackModal,
  showBlueprintDayModal,
  setShowBlueprintDayModal,
  blueprintDayModalDate,
  setBlueprintDayModalDate,
  appLang,
}) {
  const { currentUser } = useAuth();
  const { playCyberSound } = useUI();

  const safeStudentLogs = Array.isArray(studentLogs) ? studentLogs : [];
  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeLeaveRequests = Array.isArray(studentLeaveRequests) ? studentLeaveRequests : [];

  return (
    <div className="student-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '32px', animation: 'fadeInUp 0.5s ease' }}>
      {/* Student Daily Driver Today Status & 75% Rule Card */}
      <StudentTodayView
        studentLogs={studentLogs}
        onRequestDispute={(log) => {
          setDisputePrefillSession(log);
          setShowDisputeModal(true);
        }}
        onExportSummary={exportToCSV}
        lang={appLang}
      />

      <StudentAttendanceWallet logs={studentLogs} studentName={currentUser?.name} />
      <AttendancePlannerWidget token={token} currentUser={currentUser} playCyberSound={playCyberSound} />
      <GamificationHub logs={studentLogs} />

      {/* ===== CAMPUS GEOFENCE LIVE INDICATOR ===== */}
      {(() => {
        const geo = geofenceStatus;
        return (
          <div className="glass-panel" style={{ padding: '20px 24px', borderRadius: '16px', border: `1px solid ${geo.checked ? (geo.inside ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)') : 'rgba(0,242,254,0.15)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: geo.checked ? (geo.inside ? 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(0,0,0,0))' : 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(0,0,0,0))') : 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: geo.checked ? (geo.inside ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)') : 'rgba(0,242,254,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>
                {geo.checked ? (geo.inside ? '🟢' : '🔴') : '📡'}
              </div>
              <div>
                <p style={{ fontWeight: 700, color: geo.checked ? (geo.inside ? '#10b981' : '#ef4444') : '#00f2fe', margin: 0, fontSize: '0.95rem' }}>
                  {geo.checked ? (geo.inside ? '✅ Inside Campus Zone' : '⚠️ Outside Campus Zone') : '📡 Campus Location Check'}
                </p>
                <p style={{ color: '#9ca3af', fontSize: '0.78rem', margin: '2px 0 0' }}>
                  {geo.checked
                    ? geo.distance !== null ? `Distance to campus center: ~${Math.round(geo.distance)}m` : 'Location determined.'
                    : 'Check if you are within the campus geofence boundary.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!navigator.geolocation) {
                  setGeofenceStatus({ checked: true, inside: false, distance: null });
                  return;
                }
                navigator.geolocation.getCurrentPosition(pos => {
                  const { latitude, longitude } = pos.coords;
                  // Use the campus center from geofence settings or fallback default
                  const campusLat = parseFloat(localStorage.getItem('geo_lat') || '0');
                  const campusLng = parseFloat(localStorage.getItem('geo_lng') || '0');
                  const radiusM = parseFloat(localStorage.getItem('geo_radius') || '200');
                  if (!campusLat || !campusLng) {
                    setGeofenceStatus({ checked: true, inside: true, distance: null });
                    return;
                  }
                  // Haversine distance
                  const R = 6371000;
                  const dLat = (latitude - campusLat) * Math.PI / 180;
                  const dLng = (longitude - campusLng) * Math.PI / 180;
                  const a = Math.sin(dLat/2)**2 + Math.cos(campusLat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) * Math.sin(dLng/2)**2;
                  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  setGeofenceStatus({ checked: true, inside: dist <= radiusM, distance: Math.round(dist) });
                }, () => {
                  setGeofenceStatus({ checked: true, inside: false, distance: null });
                });
              }}
              style={{ padding: '9px 20px', borderRadius: '10px', border: '1px solid rgba(0,242,254,0.3)', background: 'rgba(0,242,254,0.06)', color: '#00f2fe', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              📍 Check My Location
            </button>
          </div>
        );
      })()}

      {/* Stats Row with Interactive Modals & Real DB Data Sync */}
      <StudentStatsRowWithModals 
        studentLogs={studentLogs} 
        playCyberSound={playCyberSound} 
        onRequestDispute={(log) => {
          setDisputePrefillSession(log);
          setShowDisputeModal(true);
        }} 
      />

      {/* ===== ATTENDANCE FORECAST + VIRTUAL ID + LEAVE REQUEST ROW ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Attendance Forecast Card */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(0,242,254,0.15)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📊</span> Attendance Forecast
          </h3>
          {(() => {
            const total = safeStudentLogs.length;
            const present = safeStudentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
            const rate = total > 0 ? (present / total) * 100 : 0;
            const minRequired = 0.75;
            const canBunk = Math.floor(present / minRequired - total);
            const needMore = Math.ceil((minRequired * total - present) / (1 - minRequired));

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Circular Progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                      <circle
                        cx="40" cy="40" r="34" fill="none"
                        stroke={rate >= 75 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - rate / 100)}`}
                        transform="rotate(-90 40 40)"
                        style={{ transition: 'stroke-dashoffset 1s ease' }}
                      />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: rate >= 75 ? '#10b981' : '#ef4444' }}>
                      {rate.toFixed(0)}%
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {rate >= 75 ? (
                      <>
                        <p style={{ color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>✅ You're Safe!</p>
                        <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
                          {canBunk > 0 ? `You can bunk up to ${canBunk} more class${canBunk !== 1 ? 'es' : ''} safely.` : 'Attend all upcoming classes to stay safe.'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.9rem' }}>⚠️ Below 75%!</p>
                        <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
                          {total === 0 ? 'No attendance records yet.' : `Attend the next ${needMore} class${needMore !== 1 ? 'es' : ''} to reach 75%.`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#9ca3af', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '10px' }}>
                  <span>Present: <strong style={{ color: '#f3f4f6' }}>{present}</strong></span>
                  <span>Absent: <strong style={{ color: '#f3f4f6' }}>{total - present}</strong></span>
                  <span>Total: <strong style={{ color: '#f3f4f6' }}>{total}</strong></span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Virtual ID Card Trigger */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(139,92,246,0.2)', background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(0,242,254,0.05))', cursor: 'pointer' }}
          onClick={() => setShowVirtualId(true)}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🪪</span> Virtual ID & QR Check-in
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '12px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
              🎫
            </div>
            <p style={{ color: '#9ca3af', fontSize: '0.82rem', textAlign: 'center' }}>
              Show your glowing ID card with a dynamic QR code for instant check-in.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', padding: '10px', borderRadius: '10px', fontWeight: 600, fontSize: '0.85rem' }}>
              Open Virtual ID Card
            </button>
          </div>
        </div>

        {/* Apply Leave Request */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(251,146,60,0.2)', background: 'linear-gradient(135deg, rgba(251,146,60,0.06), rgba(0,0,0,0))' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>📝</span> Apply for Leave
          </h3>
          <LeaveApplicationForm
            token={token}
            API_BASE_URL={API_BASE_URL}
            onLeaveApplied={fetchStudentLeaves}
            playCyberSound={playCyberSound}
            subjects={subjects}
            studentLeaveRequests={studentLeaveRequests}
          />
        </div>

        {/* Attendance Disputes & Correction Trigger */}
        <div 
          className="glass-panel" 
          style={{ 
            padding: '24px', 
            borderRadius: '16px', 
            border: '1px solid rgba(239, 68, 68, 0.25)', 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(0, 242, 254, 0.04))', 
            cursor: 'pointer' 
          }}
          onClick={() => {
            playCyberSound('click');
            setDisputePrefillSession(null);
            setShowDisputeModal(true);
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>⚖️</span> Attendance Disputes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
            <div style={{ 
              width: '70px', 
              height: '70px', 
              borderRadius: '12px', 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '2rem', 
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' 
            }}>
              🛡️
            </div>
            <p style={{ color: '#9ca3af', fontSize: '0.82rem', textAlign: 'center' }}>
              Marked absent unfairly or face scan failed? Submit an official correction request with evidence.
            </p>
            <button className="btn" style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '10px', 
              fontWeight: 600, 
              fontSize: '0.85rem', 
              background: 'rgba(239, 68, 68, 0.15)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              color: '#ef4444' 
            }}>
              Dispute Attendance / Check Status
            </button>
          </div>
        </div>
      </div>

      {/* AI Attendance Forecaster & Bunk Simulator */}
      <AiAttendanceForecaster
        blueprintData={blueprintData}
        playCyberSound={playCyberSound}
      />

      {/* My Leave Requests History */}
      {studentLeaveRequests.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📋</span> My Leave Requests
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {studentLeaveRequests.map(req => (
              <div key={req.id} className="glass-panel" style={{ padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', border: `1px solid ${req.status === 'Approved' ? 'rgba(16,185,129,0.2)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {req.leave_type} {req.subject_name ? `(${req.subject_name} - ${req.subject_code})` : ' (General)'}
                  </span>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f3f4f6', margin: '2px 0' }}>{req.start_date} → {req.end_date}</p>
                  <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{req.reason}</p>
                </div>
                <span style={{
                  padding: '5px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                  background: req.status === 'Approved' ? 'rgba(16,185,129,0.15)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  color: req.status === 'Approved' ? '#10b981' : req.status === 'Rejected' ? '#ef4444' : '#f59e0b',
                  border: `1px solid ${req.status === 'Approved' ? 'rgba(16,185,129,0.3)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                }}>
                  {req.status === 'Approved' ? '✅' : req.status === 'Rejected' ? '❌' : '⏳'} {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject-wise Attendance Cards */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc' }}>
          <BookOpen size={20} style={{ color: '#00f2fe' }} />
          Subject-wise Attendance
        </h3>
        
        {Object.keys(studentSubjectStats).length === 0 ? (
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
            No subject records found for your department.
          </div>
        ) : (
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {Object.values(studentSubjectStats).map((subStat, idx) => {
              const pDays = subStat.presentDays || subStat.present_count || 0;
              const tDays = Math.max(subStat.totalDays || subStat.total_classes || 0, pDays);
              const rawPct = (subStat.percentage !== undefined ? subStat.percentage : (tDays > 0 ? (pDays / tDays) * 100 : 0));
              const safePct = Math.min(100.0, Math.max(0.0, Number(rawPct) || 0));
              const isWarning = safePct < 75.0 && tDays > 0;
              return (
                <div key={idx} className="glass-panel metric-card" style={{ padding: '20px', flexDirection: 'column', alignItems: 'stretch', gap: '12px', height: 'auto', animationDelay: `${(idx + 1) * 100}ms` }}>
                  <div className="flex-between">
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>{subStat.subjectCode || subStat.subject_code}</span>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f3f4f6', margin: '2px 0 0 0' }}>{subStat.subjectName || subStat.subject_name}</h4>
                    </div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: isWarning ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: isWarning ? '#ef4444' : '#10b981',
                      border: `1px solid ${isWarning ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                    }}>
                      {tDays === 0 ? 'No Classes' : isWarning ? 'Shortage' : 'Good'}
                    </span>
                  </div>
                  
                  <div className="flex-between" style={{ marginTop: '8px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Classes: {pDays} / {tDays}</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: isWarning ? '#ef4444' : '#10b981' }}>
                      {safePct.toFixed(1)}%
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, safePct)}%`,
                      height: '100%',
                      background: isWarning ? 'linear-gradient(90deg, #f87171, #ef4444)' : 'linear-gradient(90deg, #34d399, #10b981)',
                      borderRadius: '3px',
                      transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendance Shortage Warning */}
      {(() => {
        const total = safeStudentLogs.length;
        const present = safeStudentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
        const rate = total > 0 ? Math.min(100.0, (present / total) * 100) : 0;
        if (total > 0 && rate < 75) {
          return (
            <div className="glass-panel" style={{
              padding: '20px',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              background: 'rgba(239, 68, 68, 0.05)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <AlertCircle size={28} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div>
                <h4 style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>Attendance Shortage Warning</h4>
                <p style={{ color: '#d1d5db', fontSize: '0.875rem' }}>
                  Your attendance rate is currently at <strong>{rate.toFixed(1)}%</strong>, which is below the minimum required <strong>75%</strong> academic limit. Please attend upcoming lectures regularly.
                </p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* ===== SUBJECT-WISE ATTENDANCE BLUEPRINT CALENDAR ===== */}
      {(() => {
        const activeSubject = blueprintData.find(s => s.subject_id === selectedBlueprintSubject) || blueprintData[0];
        const calYear = blueprintCalendarDate.getFullYear();
        const calMonth = blueprintCalendarDate.getMonth();
        const startDay = new Date(calYear, calMonth, 1).getDay();
        const numDays = new Date(calYear, calMonth + 1, 0).getDate();
        const monthName = blueprintCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

        const getStats = (subject) => {
          if (!subject) return { present: 0, absent: 0, late: 0, total: 0 };
          const vals = Object.values(subject.calendar || {});
          return {
            present: vals.filter(v => v === 'Present').length,
            late: vals.filter(v => v === 'Late').length,
            absent: vals.filter(v => v === 'Absent').length,
            total: vals.length
          };
        };
        const stats = getStats(activeSubject);
        const pct = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;

        return (
          <div className="glass-panel" style={{ padding: '28px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>📋</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>My Attendance Blueprint</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>Subject-wise calendar — click any date cell to view real-time log details & submit disputes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fetchBlueprint(token)}
                disabled={blueprintLoading}
                className="btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', cursor: blueprintLoading ? 'not-allowed' : 'pointer', border: '1px solid rgba(0,242,254,0.25)', background: 'rgba(0,242,254,0.06)', color: '#00f2fe' }}
              >
                <span style={{ display: 'inline-block', animation: blueprintLoading ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
                {blueprintLoading ? 'Updating...' : 'Refresh'}
              </button>
            </div>

            {blueprintLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#9ca3af', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '28px', height: '28px', border: '3px solid rgba(0,242,254,0.1)', borderTopColor: '#00f2fe', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Loading blueprint...
              </div>
            ) : blueprintData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: '#9ca3af' }}>
                <p style={{ margin: '0 0 14px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                  No attendance records found yet. Your blueprint will appear once attendance is marked.
                </p>
                <button
                  type="button"
                  onClick={() => fetchBlueprint(token)}
                  className="btn-secondary"
                  style={{ padding: '7px 18px', fontSize: '0.82rem', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.1)', color: '#c4b5fd', cursor: 'pointer' }}
                >
                  🔄 Check Again
                </button>
              </div>
            ) : (
              <>
                {/* Subject Tabs */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {blueprintData.map(sub => (
                    <button
                      key={sub.subject_id}
                      onClick={() => setSelectedBlueprintSubject(sub.subject_id)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: selectedBlueprintSubject === sub.subject_id
                          ? '1px solid rgba(139, 92, 246, 0.6)'
                          : '1px solid rgba(255,255,255,0.06)',
                        background: selectedBlueprintSubject === sub.subject_id
                          ? 'rgba(139, 92, 246, 0.18)'
                          : 'rgba(255,255,255,0.03)',
                        color: selectedBlueprintSubject === sub.subject_id ? '#a78bfa' : '#9ca3af'
                      }}
                    >
                      {sub.subject_code} — {sub.subject_name}
                    </button>
                  ))}
                </div>

                {/* Stats Bar */}
                {activeSubject && (
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: pct >= 75 ? '#10b981' : '#ef4444' }}>{pct}%</div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '2px' }}>Attendance</div>
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981' }}>{stats.present}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Present</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f59e0b' }}>{stats.late}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Late</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ef4444' }}>{stats.absent}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Absent</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#64748b' }}>{stats.total}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Total Days</div>
                    </div>
                    {pct < 75 && stats.total > 0 && (
                      <div style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>⚠ Below 75% — Shortage</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Calendar Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <button
                    onClick={() => setBlueprintCalendarDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; })}
                    className="btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '8px' }}
                  >◀ Prev</button>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#e2e8f0' }}>{monthName}</span>
                  <button
                    onClick={() => setBlueprintCalendarDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; })}
                    className="btn-secondary"
                    style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '8px' }}
                  >Next ▶</button>
                </div>

                {/* Calendar Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', padding: '6px 0' }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                  {/* Empty alignment cells */}
                  {Array.from({ length: startDay }, (_, i) => (
                    <div key={`e${i}`} />
                  ))}
                  {/* Day cells */}
                  {Array.from({ length: numDays }, (_, i) => {
                    const day = i + 1;
                    const dateStr = `${String(day).padStart(2,'0')}/${String(calMonth+1).padStart(2,'0')}/${calYear}`;
                    const status = activeSubject?.calendar?.[dateStr];
                    const today = new Date();
                    const isToday = today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;

                    let bg = 'rgba(255,255,255,0.02)';
                    let border = '1px solid rgba(255,255,255,0.05)';
                    let color = '#475569';
                    let dot = null;
                    let label = null;

                    if (status === 'Present') {
                      bg = 'rgba(16,185,129,0.1)';
                      border = '1px solid rgba(16,185,129,0.3)';
                      color = '#10b981';
                      dot = '✓';
                      label = 'P';
                    } else if (status === 'Late') {
                      bg = 'rgba(245,158,11,0.1)';
                      border = '1px solid rgba(245,158,11,0.3)';
                      color = '#f59e0b';
                      dot = '~';
                      label = 'L';
                    } else if (status === 'Absent') {
                      bg = 'rgba(239,68,68,0.1)';
                      border = '1px solid rgba(239,68,68,0.3)';
                      color = '#ef4444';
                      dot = '✗';
                      label = 'A';
                    }

                    if (isToday) {
                      border = '2px solid rgba(0,242,254,0.5)';
                    }

                    return (
                      <div
                        key={day}
                        title={status ? `${dateStr}: ${status} (Click for Details)` : `${dateStr} (Click for Details)`}
                        onClick={() => {
                          setBlueprintDayModalDate(dateStr);
                          setShowBlueprintDayModal(true);
                          if (typeof playCyberSound === 'function') playCyberSound('click');
                        }}
                        style={{
                          background: bg,
                          border,
                          borderRadius: '8px',
                          padding: '6px 2px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '52px',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <span style={{ fontSize: '0.82rem', fontWeight: isToday ? 800 : 500, color: isToday ? '#00f2fe' : color }}>{day}</span>
                        {dot && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color, marginTop: '2px' }}>{label}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px', fontSize: '0.73rem', color: '#9ca3af', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', display: 'inline-block' }}/>P = Present</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', display: 'inline-block' }}/>A = Absent</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', display: 'inline-block' }}/>L = Late</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid rgba(0,242,254,0.5)', display: 'inline-block' }}/>Today</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: 'auto', color: '#00f2fe', fontWeight: 600 }}>💡 Click any date cell to view day breakdown & submit disputes</span>
                </div>

                {/* Daily Attendance Breakdown Modal */}
                <BlueprintDayBreakdownModal
                  isOpen={showBlueprintDayModal}
                  onClose={() => setShowBlueprintDayModal(false)}
                  dateStr={blueprintDayModalDate}
                  studentLogs={studentLogs}
                  activeSubject={activeSubject}
                  playCyberSound={playCyberSound}
                  onRequestDispute={(log) => {
                    setDisputePrefillSession(log);
                    setShowDisputeModal(true);
                  }}
                />
              </>
            )}
          </div>
        );
      })()}

      {/* Sleek Bottom Feedback Section */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px',
          borderLeft: '4px solid #00f2fe',
          background: 'linear-gradient(135deg, rgba(9, 12, 21, 0.6) 0%, rgba(21, 24, 43, 0.6) 100%)',
          boxShadow: '0 8px 32px 0 rgba(0, 242, 254, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            background: 'rgba(0, 242, 254, 0.1)', 
            color: '#00f2fe', 
            borderRadius: '12px', 
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0, 242, 254, 0.2)'
          }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Help Us Improve the Platform</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: '4px 0 0' }}>
              Share your suggestions, report a bug, or rate your overall experience with our smart attendance tracker.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            playCyberSound('click');
            setShowFeedbackModal(true);
          }}
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            border: 'none',
            background: 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)',
            color: '#090c15',
            boxShadow: '0 0 20px rgba(0, 242, 254, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 242, 254, 0.5)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 242, 254, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <MessageSquare size={16} /> Share Feedback
        </button>
      </div>
    </div>
  );
}
