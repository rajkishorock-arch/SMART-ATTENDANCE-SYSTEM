import React from 'react';
import { 
  BookOpen, AlertCircle, MessageSquare, Calendar, CheckCircle2, TrendingUp, 
  X, MapPin, ArrowLeft, ChevronRight, Target, Award, ShieldCheck, FileText, Bell, Megaphone,
  CreditCard, QrCode
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';
import StudentTodayView from '../StudentTodayView';
import StudentAttendanceWallet from '../StudentAttendanceWallet';
import AttendancePlannerWidget from '../AttendancePlannerWidget';
import StudentLeaveDisputesHub from './StudentLeaveDisputesHub';
import StudentFeedbackHub from './StudentFeedbackHub';
import StudentAcademicCalendarWidget from './StudentAcademicCalendarWidget';
import StudentAttendanceRecoveryWidget from './StudentAttendanceRecoveryWidget';
import StudentSubjectAttendanceHub from './StudentSubjectAttendanceHub';
import StudentBlueprintHub from './StudentBlueprintHub';
import StudentVirtualIdHub from './StudentVirtualIdHub';
import StudentCampusGeofenceHub from './StudentCampusGeofenceHub';
import { getInitials } from '../../utils/attendanceDateUtils';
import { prefetchStudentQrPass } from '../../utils/qrPassPrefetch';
import { disputeApi } from '../../api/disputeApi';

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
              <span style={{ fontSize: '0.68rem', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>⏰ Log Details</span>
            </h3>
            <p style={{ fontSize: '0.92rem', fontWeight: 700, marginTop: '8px', color: '#25231f' }}>
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
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto', borderRadius: '18px', border: '1px solid #e4dfd5', padding: '28px', background: '#ffffff', boxShadow: '0 20px 45px -10px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e4dfd5', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <TrendingUp color="#059669" size={24} />
                <h3 style={{ margin: 0, color: '#25231f', fontSize: '1.2rem', fontWeight: 800 }}>Attendance Rate & Subject Breakdown</h3>
              </div>
              <button onClick={() => setShowRateModal(false)} style={{ background: 'none', border: 'none', color: '#696358', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Top Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#065f46', fontWeight: 600 }}>Overall Rate</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: attendanceRate >= 75 ? '#059669' : '#dc2626', marginTop: '2px' }}>{attendanceRate.toFixed(1)}%</div>
              </div>
              <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#115e59', fontWeight: 600 }}>Attended / Total</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0d9488', marginTop: '2px' }}>{presentCount} / {totalLogs}</div>
              </div>
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '14px', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#5b21b6', fontWeight: 600 }}>Status Zone</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: attendanceRate >= 75 ? '#059669' : '#dc2626', marginTop: '8px' }}>
                  {attendanceRate >= 75 ? '✅ Safe Zone' : '⚠️ Deficit Alert'}
                </div>
              </div>
            </div>

            {/* Subject Breakdown Section */}
            <h4 style={{ color: '#25231f', margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700 }}>📚 Subject-wise Attendance Performance (Real DB Logs)</h4>
            {subjectBreakdown.length === 0 ? (
              <p style={{ color: '#696358', fontSize: '0.85rem' }}>No subject records available yet in real database.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {subjectBreakdown.map((sub, i) => {
                  const rate = sub.total > 0 ? (sub.present / sub.total) * 100 : 0;
                  return (
                    <div key={i} style={{ background: '#faf9f6', border: '1px solid #e4dfd5', padding: '14px 18px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#25231f', fontSize: '0.9rem' }}>{sub.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#696358', marginTop: '2px' }}>
                          Attended <strong style={{ color: '#25231f' }}>{sub.present}</strong> out of <strong style={{ color: '#25231f' }}>{sub.total}</strong> classes
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: rate >= 75 ? '#059669' : '#dc2626' }}>{rate.toFixed(1)}%</span>
                        <div style={{ width: '80px', height: '6px', background: '#e4dfd5', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, rate)}%`, height: '100%', background: rate >= 75 ? '#059669' : '#dc2626' }} />
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
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto', borderRadius: '18px', border: '1px solid #e4dfd5', padding: '28px', background: '#ffffff', boxShadow: '0 20px 45px -10px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e4dfd5', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 color="#80602c" size={24} />
                <h3 style={{ margin: 0, color: '#25231f', fontSize: '1.2rem', fontWeight: 800 }}>Complete Attendance Logs & Days Summary</h3>
              </div>
              <button onClick={() => setShowPresentDaysModal(false)} style={{ background: 'none', border: 'none', color: '#696358', cursor: 'pointer' }}><X size={20} /></button>
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
                    border: logFilter === f.key ? '1px solid #93c5fd' : '1px solid #e4dfd5',
                    background: logFilter === f.key ? '#faf5ea' : '#faf9f6',
                    color: logFilter === f.key ? '#684c20' : '#696358',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Log List */}
            {filteredLogs.length === 0 ? (
              <p style={{ color: '#696358', fontSize: '0.85rem', textAlign: 'center', padding: '30px' }}>No matching attendance records found in real database.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredLogs.map((log, idx) => {
                  const isPresent = log.attendance === 'Present' || log.attendance === 'Late';
                  return (
                    <div key={log.id || idx} style={{ background: '#faf9f6', border: '1px solid #e4dfd5', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#25231f', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>📅 {log.date}</span>
                          {log.time && <span style={{ color: '#80602c', fontSize: '0.78rem', fontWeight: 600 }}>🕒 {log.time}</span>}
                          {log.period_label && <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600 }}>{log.period_label}</span>}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#696358', marginTop: '3px' }}>
                          📚 {log.subject_name ? `${log.subject_name} (${log.subject_code || ''})` : (log.department || 'General Class')} • Method: {log.verification_method || 'AI Face Scan'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 700, background: isPresent ? '#ecfdf5' : '#fef2f2', color: isPresent ? '#059669' : '#dc2626', border: isPresent ? '1px solid #a7f3d0' : '1px solid #fecaca' }}>
                          {log.attendance || 'Present'}
                        </span>
                        {!isPresent && onRequestDispute && (
                          <button
                            onClick={() => {
                              setShowPresentDaysModal(false);
                              onRequestDispute(log);
                            }}
                            style={{ background: 'none', border: 'none', color: '#785927', fontSize: '0.72rem', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
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
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '550px', borderRadius: '18px', border: '1px solid #e4dfd5', padding: '28px', background: '#ffffff', boxShadow: '0 20px 45px -10px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e4dfd5', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar color="#7c3aed" size={24} />
                <h3 style={{ margin: 0, color: '#25231f', fontSize: '1.2rem', fontWeight: 800 }}>Latest Check-in Log Details</h3>
              </div>
              <button onClick={() => setShowLastLogModal(false)} style={{ background: 'none', border: 'none', color: '#696358', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {!latestLog ? (
              <p style={{ color: '#696358', fontSize: '0.85rem' }}>No attendance log recorded yet in real database.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '16px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#5b21b6', fontWeight: 600 }}>Check-in Timestamp</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#6d28d9', marginTop: '2px' }}>
                    📅 {latestLog.date} 🕒 {latestLog.time || 'N/A'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#faf9f6', border: '1px solid #e4dfd5', padding: '12px 14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#696358', fontWeight: 600 }}>Subject / Class</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#25231f', marginTop: '3px' }}>
                      {latestLog.subject_name ? `${latestLog.subject_name} (${latestLog.subject_code || ''})` : 'General Class'}
                    </div>
                  </div>

                  <div style={{ background: '#faf9f6', border: '1px solid #e4dfd5', padding: '12px 14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#696358', fontWeight: 600 }}>Status</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: latestLog.attendance === 'Present' || latestLog.attendance === 'Late' ? '#059669' : '#dc2626', marginTop: '3px' }}>
                      {latestLog.attendance || 'Present'}
                    </div>
                  </div>

                  <div style={{ background: '#faf9f6', border: '1px solid #e4dfd5', padding: '12px 14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#696358', fontWeight: 600 }}>Session / Period</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#80602c', marginTop: '3px' }}>
                      {latestLog.period_label || latestLog.session_time || 'Regular Session'}
                    </div>
                  </div>

                  <div style={{ background: '#faf9f6', border: '1px solid #e4dfd5', padding: '12px 14px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#696358', fontWeight: 600 }}>Verification Method</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#25231f', marginTop: '3px' }}>
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
                    style={{ marginTop: '10px', padding: '12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}
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
    <div style={{
      padding: '24px', borderRadius: '16px',
      border: `1px solid ${isSafe ? '#a7f3d0' : '#fecaca'}`,
      background: '#ffffff',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#faf5ea', border: '1px solid #dfcfaf', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
            🤖
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#25231f' }}>AI Attendance Forecaster & Bunk Simulator</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#696358' }}>Select a subject to project future attendance and safety margins</p>
          </div>
        </div>

        {/* Subject Select */}
        <select value={activeSubId} onChange={e => {
          setSelectedSubId(e.target.value);
          if (playCyberSound) playCyberSound('click');
        }} style={{ padding: '8px 14px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cfc8ba', color: '#25231f', fontSize: '0.8rem', outline: 'none' }}>
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
            <label style={{ fontSize: '0.72rem', color: '#696358', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>Simulation Scenario</label>
            <div style={{ display: 'flex', background: '#f4f1eb', borderRadius: '10px', padding: '4px', border: '1px solid #cfc8ba' }}>
              <button onClick={() => { setSimType('attend'); if (playCyberSound) playCyberSound('click'); }} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: simType === 'attend' ? '#10b981' : 'transparent', color: simType === 'attend' ? '#fff' : '#58534a', transition: 'all 0.2s' }}>
                🟢 Attend Lectures
              </button>
              <button onClick={() => { setSimType('bunk'); if (playCyberSound) playCyberSound('click'); }} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', background: simType === 'bunk' ? '#ef4444' : 'transparent', color: simType === 'bunk' ? '#fff' : '#58534a', transition: 'all 0.2s' }}>
                🔴 Bunk Lectures
              </button>
            </div>
          </div>

          {/* Slider Count */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.72rem', color: '#696358', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Number of Classes</label>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: simType === 'attend' ? '#059669' : '#dc2626' }}>{simCount} class{simCount !== 1 ? 'es' : ''}</span>
            </div>
            <input type="range" min="1" max="15" value={simCount} onChange={e => setSimCount(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: simType === 'attend' ? '#10b981' : '#ef4444', height: '6px', borderRadius: '3px', background: '#e4dfd5', cursor: 'pointer' }} />
          </div>
        </div>

        {/* Right Side: Projections Output */}
        <div style={{ background: '#faf9f6', border: '1px solid #e4dfd5', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#696358', fontWeight: 500 }}>Current Attendance</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: currentRate >= 75 ? '#059669' : '#dc2626' }}>{currentRate.toFixed(1)}%</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #cfc8ba', paddingTop: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: '#25231f', fontWeight: 600 }}>Forecasted Attendance</span>
            <span style={{
              fontSize: '1.2rem', fontWeight: 800,
              color: isSafe ? '#059669' : '#dc2626'
            }}>{simRate.toFixed(1)}%</span>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '8px', background: '#e4dfd5', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(simRate, 100)}%`, height: '100%', background: isSafe ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
          </div>

          {/* Safety margin badge */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase',
              background: isSafe ? '#d1fae5' : '#fee2e2',
              color: isSafe ? '#065f46' : '#991b1b',
              border: `1px solid ${isSafe ? '#a7f3d0' : '#fecaca'}`
            }}>
              {isSafe ? '🟢 SAFE BUFFER' : '🔴 WARNING: BELOW 75%'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Recommendation Message */}
      <div style={{
        marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
        background: isSafe ? '#f0fdf4' : '#fef2f2',
        borderLeft: `3px solid ${isSafe ? '#10b981' : '#ef4444'}`,
        color: '#46423b', fontSize: '0.8rem', lineHeight: 1.45
      }}>
        <strong style={{ color: '#25231f' }}>🤖 AI Coach:</strong> {getRecommendation()}
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
  setStudentLeaveRequests,
  studentDisputes: propStudentDisputes = null,
  setStudentDisputes: propSetStudentDisputes,
  fetchStudentDisputes,
  token,
  API_BASE_URL,
  subjects = [],
  fetchBlueprint,
  fetchStudentLeaves,
  exportToCSV,
  setShowVirtualId,
  setShowFeedbackModal,
  feedbackState = null,
  showBlueprintDayModal,
  setShowBlueprintDayModal,
  blueprintDayModalDate,
  setBlueprintDayModalDate,
  appLang,
  onNavigateToCalendar = () => {},
  onNavigateTab = () => {},
  routeView = undefined,
  setRouteView = null,
}) {
  const { currentUser } = useAuth();
  const { playCyberSound } = useUI();

  const safeStudentLogs = Array.isArray(studentLogs) ? studentLogs : [];
  const safeSubjects = Array.isArray(subjects) ? subjects : [];
  const safeLeaveRequests = Array.isArray(studentLeaveRequests) ? studentLeaveRequests : [];

  const [localDisputes, setLocalDisputes] = React.useState([]);
  const [localRouteView, setLocalRouteView] = React.useState(null);

  const myDisputes = propStudentDisputes ?? localDisputes;
  const updateDisputesState = propSetStudentDisputes || setLocalDisputes;

  const isControlledRoute = Boolean(setRouteView);
  const activeRoute = routeView !== undefined && setRouteView ? routeView : localRouteView;
  const navigateStudentRoute = React.useCallback(
    (nextRoute) => {
      if (setRouteView) {
        setRouteView(nextRoute);
      } else {
        setLocalRouteView(nextRoute);
      }
    },
    [setRouteView]
  );

  const activeSection = activeRoute?.section || null;

  const refreshDisputesNow = React.useCallback(async (authToken) => {
    const usedToken = authToken || token;
    if (!usedToken) return;
    if (fetchStudentDisputes) {
      await fetchStudentDisputes(usedToken);
      return;
    }
    try {
      const res = await disputeApi.fetchMyDisputes(usedToken);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setLocalDisputes(data);
      }
    } catch { /* ignore fallback error */ }
  }, [fetchStudentDisputes, token]);

  React.useEffect(() => {
    let ignore = false;
    if (token && API_BASE_URL) {
      prefetchStudentQrPass(API_BASE_URL, token).catch(() => {});
    }
    if (!token || propStudentDisputes !== null) return undefined;
    disputeApi.fetchMyDisputes(token)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!ignore && Array.isArray(data)) setLocalDisputes(data);
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, [token, API_BASE_URL, propStudentDisputes]);

  const openDisputeForm = React.useCallback(
    (prefillLog = null, { fromRoot = false } = {}) => {
      if (playCyberSound) playCyberSound('click');
      navigateStudentRoute({
        section: 'disputes',
        mode: 'apply-dispute',
        prefill: prefillLog || null,
        fromRoot,
      });
    },
    [playCyberSound, navigateStudentRoute]
  );

  const openLeaveForm = React.useCallback(
    (prefillLeave = null) => {
      if (playCyberSound) playCyberSound('click');
      navigateStudentRoute({
        section: 'disputes',
        mode: 'apply-leave',
        prefill: prefillLeave || null,
      });
    },
    [playCyberSound, navigateStudentRoute]
  );

  const handleSubRouteBack = React.useCallback(() => {
    if (playCyberSound) playCyberSound('click');
    if (activeRoute?.mode === 'apply-dispute' && activeRoute?.fromRoot) {
      navigateStudentRoute(null);
      return;
    }
    if (activeRoute?.mode) {
      navigateStudentRoute({ section: activeRoute.section });
      return;
    }
    navigateStudentRoute(null);
  }, [activeRoute, navigateStudentRoute, playCyberSound]);

  // Compute subject-wise attendance stats (strictly scoped to registered branch subjects when configured)
  const allowedSubjectIds = React.useMemo(
    () => new Set(safeSubjects.map(s => String(s.id))),
    [safeSubjects]
  );
  const allowedSubjectCodes = React.useMemo(
    () => new Set(safeSubjects.map(s => String(s.code || '').trim().toUpperCase()).filter(Boolean)),
    [safeSubjects]
  );

  const scopedStudentLogs = React.useMemo(() => {
    if (safeSubjects.length === 0) return safeStudentLogs;
    return safeStudentLogs.filter(log => {
      if (!log) return false;
      const sid = log.subject_id != null ? String(log.subject_id) : '';
      const scode = String(log.subject_code || '').trim().toUpperCase();
      return (sid && allowedSubjectIds.has(sid)) || (scode && allowedSubjectCodes.has(scode));
    });
  }, [safeStudentLogs, safeSubjects.length, allowedSubjectIds, allowedSubjectCodes]);

  const scopedBlueprintData = React.useMemo(() => {
    const raw = Array.isArray(blueprintData) ? blueprintData : [];
    if (safeSubjects.length === 0) return raw;
    return raw.filter(b => {
      if (!b) return false;
      const sid = b.subject_id != null ? String(b.subject_id) : '';
      const scode = String(b.subject_code || '').trim().toUpperCase();
      return (sid && allowedSubjectIds.has(sid)) || (scode && allowedSubjectCodes.has(scode));
    });
  }, [blueprintData, safeSubjects.length, allowedSubjectIds, allowedSubjectCodes]);

  const hasDirectStats = studentSubjectStats && (Array.isArray(studentSubjectStats) ? studentSubjectStats.length > 0 : Object.keys(studentSubjectStats).length > 0);
  let displayStats = null;
  if (hasDirectStats) {
    const rawList = Array.isArray(studentSubjectStats) ? studentSubjectStats : Object.values(studentSubjectStats);
    const filtered = safeSubjects.length > 0
      ? rawList.filter(s => s && (allowedSubjectIds.has(String(s.subject_id || s.id)) || safeSubjects.some(sub => sub.code && sub.code === s.subjectCode)))
      : rawList;
    if (filtered.length > 0) displayStats = filtered;
  }

  if (!displayStats && (safeSubjects.length > 0 || scopedStudentLogs.length > 0)) {
    const derived = {};
    if (safeSubjects.length > 0) {
      safeSubjects.forEach(s => {
        derived[String(s.id)] = {
          subject_id: s.id,
          subjectCode: s.code || `SUB-${s.id}`,
          subjectName: s.name || `Subject #${s.id}`,
          presentDays: 0,
          totalDays: 0,
          percentage: 0,
        };
      });
    }
    scopedStudentLogs.forEach(log => {
      if (String(log.attendance || '').toUpperCase() === 'CLASS_CANCELLED') return;
      const subKey = log.subject_id ? String(log.subject_id) : (log.subject_name || 'General');
      if (!derived[subKey]) {
        derived[subKey] = {
          subject_id: log.subject_id || 0,
          subjectCode: log.subject_code || (log.subject_id ? `SUB-${log.subject_id}` : 'GEN'),
          subjectName: log.subject_name || (log.subject_id ? `Subject #${log.subject_id}` : 'General Attendance'),
          presentDays: 0,
          totalDays: 0,
          percentage: 0
        };
      }
      derived[subKey].totalDays += 1;
      if (['Present', 'Late', 'Excused'].includes(log.attendance)) {
        derived[subKey].presentDays += 1;
      }
    });
    Object.values(derived).forEach(s => {
      s.percentage = s.totalDays > 0 ? (s.presentDays / s.totalDays) * 100 : 0;
    });
    displayStats = derived;
  }
  const statsList = displayStats ? (Array.isArray(displayStats) ? displayStats : Object.values(displayStats)) : [];

  const conductedStudentLogs = scopedStudentLogs.filter(l => String(l.attendance || '').toUpperCase() !== 'CLASS_CANCELLED');
  const totalClasses = conductedStudentLogs.length;
  const presentClasses = conductedStudentLogs.filter(l => ['Present', 'Late', 'Excused'].includes(l.attendance)).length;
  const overallRate = totalClasses > 0 ? ((presentClasses / totalClasses) * 100).toFixed(1) : (scopedStudentLogs.length > 0 ? '100.0' : '0.0');
  const hasShortage = Number(overallRate) < 75.0 && totalClasses > 0;

  // Navigation Hub items
  const hubSections = [
    {
      id: 'broadcast',
      title: 'Campus notices',
      subtitle: 'Official academic circulars, emergency announcements & PDF notices',
      icon: Megaphone,
      iconColor: '#785927',
      iconBg: '#faf5ea',
      isDirectTab: 'broadcast',
    },
    {
      id: 'subjects',
      title: 'Subject-wise Attendance',
      subtitle: `${statsList.length} subjects registered • ${overallRate}% average`,
      icon: BookOpen,
      iconColor: '#785927',
      iconBg: '#faf5ea',
    },
    {
      id: 'blueprint',
      title: 'Attendance calendar',
      subtitle: 'Select a day to see your attendance.',
      icon: Calendar,
      iconColor: '#7c3aed',
      iconBg: '#f5f3ff',
    },
    {
      id: 'calendar',
      title: 'Academic Calendar & Notices',
      subtitle: 'Official holidays, exam sessions, and schedule alerts',
      icon: Bell,
      iconColor: '#80602c',
      iconBg: '#f0f9ff',
    },
    {
      id: 'compliance',
      title: 'Attendance Compliance & Grievance Complaints Desk',
      subtitle: 'Regulatory safety buffer & mentor guidance',
      icon: ShieldCheck,
      iconColor: '#10b981',
      iconBg: '#ecfdf5',
    },
    {
      id: 'planner',
      title: 'Attendance Planner & Target 75%',
      subtitle: 'Calculate upcoming classes needed to hit 75%',
      icon: Target,
      iconColor: '#f59e0b',
      iconBg: '#fffbeb',
    },
    {
      id: 'wallet',
      title: 'Attendance Wallet & Streaks',
      subtitle: 'Track your attendance records and course passes',
      icon: Award,
      iconColor: '#ec4899',
      iconBg: '#fdf2f8',
    },
    {
      id: 'geofence',
      title: 'Campus Geofence Location',
      subtitle: geofenceStatus.checked ? (geofenceStatus.inside ? 'Inside authorized zone' : 'Outside authorized zone') : 'Tap to check location',
      icon: MapPin,
      iconColor: geofenceStatus.checked ? (geofenceStatus.inside ? '#059669' : '#dc2626') : '#696358',
      iconBg: geofenceStatus.checked ? (geofenceStatus.inside ? '#ecfdf5' : '#fef2f2') : '#f4f1eb',
    },
    {
      id: 'disputes',
      title: 'Leave Applications & Disputes',
      subtitle: `${safeLeaveRequests.length} leave requests • ${myDisputes.length} disputes`,
      icon: FileText,
      iconColor: '#89662e',
      iconBg: '#f8f3e8',
    },
  ];

  return (
    <div className="student-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeInUp 0.3s ease' }}>
      {/* Back Button and Section Title only when rendered standalone outside App header */}
      {!isControlledRoute && activeSection !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={handleSubRouteBack}
            className="back-icon-btn active-haptic"
            aria-label="Go Back"
            title="Go Back"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#ffffff',
              border: '1px solid #cfc8ba',
              color: '#25231f',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              padding: 0,
              flexShrink: 0
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#25231f' }}>
            {activeRoute?.mode === 'apply-leave'
              ? 'Apply for Leave'
              : activeRoute?.mode === 'leave-detail'
                ? 'Leave Application'
                : activeRoute?.mode === 'apply-dispute'
                  ? 'Request Correction'
                  : activeRoute?.mode === 'dispute-detail'
                    ? 'Attendance Dispute'
                    : (hubSections.find(s => s.id === activeSection)?.title || 'Portal Details')}
          </h2>
        </div>
      )}

      {/* ===== 1. ROOT HUB VIEW (Organized Directory) ===== */}
      {activeSection === null && (
        <>
          {/* Student Daily Driver Today Status & 75% Rule Card */}
          <StudentTodayView
            studentLogs={scopedStudentLogs}
            onRequestDispute={(log) => openDisputeForm(log, { fromRoot: true })}
            onExportSummary={exportToCSV}
            lang={appLang}
          />

          {/* Interactive Golden Gate Smart Campus ID Card */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Open Student Virtual ID and QR Check-in Pass"
            onClick={() => {
              if (playCyberSound) playCyberSound('click');
              navigateStudentRoute({ section: 'virtual-id' });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (playCyberSound) playCyberSound('click');
                navigateStudentRoute({ section: 'virtual-id' });
              }
            }}
            className="hover-elevate active-haptic"
            style={{
              borderRadius: '18px',
              border: '1.5px solid #d9c496',
              background: 'linear-gradient(155deg, #fffdf8 0%, #f5ebcf 100%)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 10px 26px rgba(89, 64, 25, 0.12)',
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Card Lanyard Header Ribbon */}
            <div
              style={{
                background: 'linear-gradient(135deg, #785927 0%, #5e441b 100%)',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                color: '#fffdf8',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <CreditCard size={15} />
                <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.9px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.institution_name || 'Smart Campus'} · Student ID Pass
                </span>
              </div>
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#fde68a', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                ACTIVE PASS
              </span>
            </div>

            {/* Authentic ID Card Body: Photo/Monogram + Identity Fields + Live QR Preview */}
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              {/* Photo / Initials Frame */}
              <div
                style={{
                  width: '54px',
                  height: '62px',
                  borderRadius: '12px',
                  background: 'linear-gradient(145deg, #fbf3df, #ead7aa)',
                  border: '1.5px solid #cbb179',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5c4218',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  flexShrink: 0,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
                }}
              >
                {currentUser?.photo || currentUser?.profile_pic ? (
                  <img
                    src={currentUser.photo || currentUser.profile_pic}
                    alt={currentUser?.name || 'Student'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }}
                  />
                ) : (
                  getInitials(currentUser?.name, 'ST')
                )}
              </div>

              {/* Identity Metadata */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser?.name || 'Enrolled Student'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '5px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.6rem', color: '#7b6844', fontWeight: 700, textTransform: 'uppercase' }}>Roll No</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#684c20' }}>
                      {currentUser?.details?.roll || currentUser?.roll || 'N/A'}
                    </div>
                  </div>
                  <div style={{ width: '1px', height: '24px', background: '#dfd0ae' }} />
                  <div>
                    <div style={{ fontSize: '0.6rem', color: '#7b6844', fontWeight: 700, textTransform: 'uppercase' }}>Branch</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#25231f' }}>
                      {currentUser?.details?.dep || currentUser?.dep || currentUser?.department || 'General'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scannable QR Preview Trigger */}
              <div
                style={{
                  padding: '8px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1px solid #d9c496',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                  flexShrink: 0,
                  color: '#5c4218',
                  boxShadow: '0 2px 8px rgba(89, 64, 25, 0.08)',
                }}
              >
                <QrCode size={28} strokeWidth={2.1} />
                <span style={{ fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  Scan QR
                </span>
              </div>
            </div>

            {/* Footer Tap Guidance Bar */}
            <div
              style={{
                padding: '9px 16px',
                background: 'rgba(255, 253, 248, 0.72)',
                borderTop: '1px solid #e7dac0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '0.73rem', fontWeight: 600, color: '#5c4b30' }}>
                Present live QR at kiosk or classroom scanner
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.76rem', fontWeight: 800, color: '#785927', flexShrink: 0 }}>
                <span>Open Pass</span>
                <ChevronRight size={15} />
              </span>
            </div>
          </div>

          {/* Clean Portal Hub Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#25231f', margin: '4px 0 2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📑</span> Student Services & Portals
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '8px'
            }}>
              {hubSections.map(sec => {
                const Icon = sec.icon;
                return (
                  <div
                    key={sec.id}
                    onClick={() => {
                      if (playCyberSound) playCyberSound('click');
                      if (sec.isDirectTab && onNavigateTab) {
                        onNavigateTab(sec.isDirectTab);
                        return;
                      }
                      navigateStudentRoute({ section: sec.id });
                    }}
                    className="hover-elevate active-haptic"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e4dfd5',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: sec.iconBg,
                        color: sec.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={18} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#25231f' }}>{sec.title}</h4>
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ===== 2. DEDICATED SECTION: SUBJECT-WISE ATTENDANCE ===== */}
      {activeSection === 'subjects' && (
        <StudentSubjectAttendanceHub
          statsList={statsList}
          subjects={safeSubjects}
          studentLogs={scopedStudentLogs}
          blueprintData={scopedBlueprintData}
          routeView={activeRoute}
          onNavigateRoute={navigateStudentRoute}
          onOpenDispute={(log) => openDisputeForm(log)}
          playCyberSound={playCyberSound}
        />
      )}

      {/* ===== 3. DEDICATED SECTION: ATTENDANCE BLUEPRINT CALENDAR ===== */}
      {activeSection === 'blueprint' && (
        <StudentBlueprintHub
          token={token}
          currentUser={currentUser}
          subjects={safeSubjects}
          studentLogs={scopedStudentLogs}
          blueprintData={scopedBlueprintData}
          blueprintLoading={blueprintLoading}
          fetchBlueprint={fetchBlueprint}
          selectedBlueprintSubject={selectedBlueprintSubject}
          setSelectedBlueprintSubject={setSelectedBlueprintSubject}
          blueprintCalendarDate={blueprintCalendarDate}
          setBlueprintCalendarDate={setBlueprintCalendarDate}
          routeView={activeRoute}
          onNavigateRoute={navigateStudentRoute}
          onOpenDispute={(log) => openDisputeForm(log)}
          onOpenLeave={(leaveData) => openLeaveForm(leaveData)}
          playCyberSound={playCyberSound}
        />
      )}

      {/* ===== 4. DEDICATED SECTION: ACADEMIC CALENDAR & NOTICES ===== */}
      {activeSection === 'calendar' && (
        <StudentAcademicCalendarWidget
          token={token}
          currentUser={currentUser}
          subjects={safeSubjects}
          routeView={activeRoute}
          onNavigateRoute={navigateStudentRoute}
          onNavigateToCalendar={onNavigateToCalendar}
          playCyberSound={playCyberSound}
        />
      )}

      {/* ===== 5. DEDICATED SECTION: ATTENDANCE COMPLIANCE & STATUS ===== */}
      {activeSection === 'compliance' && (
        <StudentAttendanceRecoveryWidget
          token={token}
          API_BASE_URL={API_BASE_URL}
          currentUser={currentUser}
          playCyberSound={playCyberSound}
          studentLogs={scopedStudentLogs}
          subjects={safeSubjects}
          myDisputes={myDisputes}
          onUpdateDisputes={updateDisputesState}
          routeView={activeRoute}
          onNavigateRoute={navigateStudentRoute}
        />
      )}

      {/* ===== 6. DEDICATED SECTION: ATTENDANCE PLANNER & SIMULATOR ===== */}
      {activeSection === 'planner' && (
        <AttendancePlannerWidget
          token={token}
          subjects={safeSubjects}
          studentLogs={scopedStudentLogs}
          routeView={activeRoute}
          onNavigateRoute={navigateStudentRoute}
          onNavigateBack={handleSubRouteBack}
          playCyberSound={playCyberSound}
        />
      )}

      {/* ===== 7. DEDICATED SECTION: WALLET ===== */}
      {activeSection === 'wallet' && (
        <StudentAttendanceWallet
          logs={scopedStudentLogs}
          studentName={currentUser?.name}
          currentUser={currentUser}
          subjects={safeSubjects}
          routeView={activeRoute}
          onNavigateRoute={navigateStudentRoute}
          onNavigateBack={handleSubRouteBack}
          onOpenDispute={(log) => openDisputeForm(log)}
          playCyberSound={playCyberSound}
        />
      )}

      {/* ===== 8. DEDICATED SECTION: CAMPUS GEOFENCE LOCATION ===== */}
      {activeSection === 'geofence' && (
        <StudentCampusGeofenceHub
          token={token}
          API_BASE_URL={API_BASE_URL}
          geofenceStatus={geofenceStatus}
          setGeofenceStatus={setGeofenceStatus}
          routeView={activeRoute}
          onNavigateRoute={navigateStudentRoute}
          onNavigateBack={handleSubRouteBack}
          playCyberSound={playCyberSound}
        />
      )}

      {/* ===== 9. DEDICATED SECTION: LEAVE APPLICATIONS & DISPUTES ===== */}
      {activeSection === 'disputes' && (
        <StudentLeaveDisputesHub
          token={token}
          API_BASE_URL={API_BASE_URL}
          currentUser={currentUser}
          subjects={safeSubjects}
          studentLeaveRequests={safeLeaveRequests}
          onUpdateLeaveRequests={setStudentLeaveRequests}
          myDisputes={myDisputes}
          onUpdateDisputes={updateDisputesState}
          onRefreshLeaves={fetchStudentLeaves}
          onRefreshDisputes={refreshDisputesNow}
          routeView={activeRoute}
          onNavigateRoute={navigateStudentRoute}
          onNavigateBack={handleSubRouteBack}
          playCyberSound={playCyberSound}
        />
      )}

      {/* ===== 10. DEDICATED SECTION: FEEDBACK & REVIEWS ===== */}
      {activeSection === 'feedback' && (
        <StudentFeedbackHub
          feedbackState={feedbackState}
          routeView={activeRoute}
          onNavigateRoute={navigateStudentRoute}
          onNavigateBack={handleSubRouteBack}
          playCyberSound={playCyberSound}
        />
      )}

      {/* ===== 11. DEDICATED SECTION: VIRTUAL ID & QR PASS ===== */}
      {activeSection === 'virtual-id' && (
        <StudentVirtualIdHub
          currentUser={currentUser}
          token={token}
          API_BASE_URL={API_BASE_URL}
          playCyberSound={playCyberSound}
        />
      )}

      {/* Sleek Feedback Section (Root Home only) */}
      {activeSection === null && (
      <div 
        style={{ 
          padding: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px',
          borderLeft: '4px solid #785927',
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e4dfd5',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          marginTop: '6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            background: '#faf5ea', 
            color: '#785927', 
            borderRadius: '10px', 
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <MessageSquare size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f', margin: 0 }}>Help Us Improve the Platform</h4>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (playCyberSound) playCyberSound('click');
            if (feedbackState) {
              navigateStudentRoute({ section: 'feedback' });
            } else if (typeof setShowFeedbackModal === 'function') {
              setShowFeedbackModal(true);
            }
          }}
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer'
          }}
        >
          <MessageSquare size={14} /> Share Feedback
        </button>
      </div>
      )}
    </div>
  );
}
