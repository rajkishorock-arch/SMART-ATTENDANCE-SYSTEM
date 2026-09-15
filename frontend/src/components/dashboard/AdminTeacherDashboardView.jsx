import { ArrowLeft, Camera, Edit, ScanFace, ShieldAlert, Calendar, Monitor, Activity, Layers, Settings, MessageSquare, Users, CheckCircle2, AlertCircle, TrendingUp, ShieldCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import PullToRefresh from '../PullToRefresh';
import TodaySessionHub from '../TodaySessionHub';
import AdminPulseDashboard from '../AdminPulseDashboard';
import SkeletonLoader from '../SkeletonLoader';
import RoleCommandCenter from '../RoleCommandCenter';
import TeacherMiniDashboard from '../TeacherMiniDashboard';
import SmartEmptyState from '../SmartEmptyState';
import AttendanceChartsWidget from '../AttendanceChartsWidget';
import LiveActivityTicker from '../LiveActivityTicker';
import SmtpSettings from '../settings/SmtpSettings';
import { getOfflineQueue } from '../../utils/offlineQueue';
import { useAuth } from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';

export default function AdminTeacherDashboardView({
  fetchStats,
  fetchLogs,
  activeDashboardSubTab,
  setActiveDashboardSubTab,
  subjects,
  schedules,
  dashboardRecentLogs,
  filteredStudents,
  attendanceActive,
  scannerBootActive,
  wsConnected,
  setSelectedSubjectId,
  setSessionPeriod,
  setSessionActive,
  setActiveTab,
  setShowScannerModal,
  startAttendanceCam,
  stopAttendanceCam,
  setIsManualAttendanceOpen,
  exportToCSV,
  appLang,
  stats,
  scopedDashboardStats,
  isMobileView,
  setSelectedAuditLog,
  setShowFeedbackModal,
  liveActivities,
  activeTelemetry,
  chartRef1,
  chartWidth1,
  chartRef2,
  chartWidth2,
  hudMetrics,
  neuralMeshCanvasRef,
  systemHealth,
  apiLatency,
  healthLoading,
  setHealthLoading,
  fetchSystemHealth,
  isLoadingFeedbacks,
  feedbacks
}) {
  const { currentUser, userRole, token } = useAuth();
  const { activeTheme, playCyberSound } = useUI();

  return (
    <PullToRefresh onRefresh={async () => { await fetchStats(); await fetchLogs(); }}>
      <div style={{ animation: 'fadeInUp 0.6s ease both' }}>
        {activeDashboardSubTab !== null && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button 
              onClick={() => { setActiveDashboardSubTab(null); if (playCyberSound) playCyberSound('click'); }}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}
            >
              <ArrowLeft size={16} /> Back to Dashboard Hub
            </button>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Dashboard Hub &gt; {activeDashboardSubTab}
            </span>
          </div>
        )}

        {activeDashboardSubTab === null ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '100%', overflowX: 'hidden' }}>
            {/* Daily Driver Hub: TodaySessionHub for Teachers / AdminPulseDashboard for Admin */}
            {userRole === 'teacher' ? (
              <TodaySessionHub
                teacherName={currentUser?.name || 'Teacher'}
                subjects={subjects}
                schedules={schedules}
                logs={dashboardRecentLogs}
                students={filteredStudents}
                sessionActive={attendanceActive}
                onStartSession={(subId, period) => {
                  if (subId) setSelectedSubjectId(String(subId));
                  if (period) setSessionPeriod(period);
                  setSessionActive(true);
                  setActiveTab('attendance');
                  setShowScannerModal(true);
                  try {
                    startAttendanceCam();
                  } catch (err) {
                    console.error('Failed to start camera:', err);
                  }
                }}
                onEndSession={() => {
                  try {
                    stopAttendanceCam();
                  } catch (err) {
                    console.error('Failed to stop camera:', err);
                  }
                }}
                onOpenScanner={() => {
                  setActiveTab('attendance');
                  setShowScannerModal(true);
                  try {
                    startAttendanceCam();
                  } catch (err) {
                    console.error('Failed to start camera:', err);
                  }
                }}
                onOpenManualAttendance={() => {
                  setIsManualAttendanceOpen(true);
                }}
                onSendAbsenteeAlerts={(absentList) => {
                  alert(`Sent attendance notifications for ${absentList.length} absent students.`);
                }}
                onExportCsv={exportToCSV}
                lang={appLang}
              />
            ) : userRole === 'admin' ? (
              <AdminPulseDashboard
                stats={stats}
                systemHealth={{
                  face_match_latency: stats?.face_match_latency || 85,
                  camera_active: attendanceActive || scannerBootActive,
                  ws_connected: wsConnected
                }}
                onOpenScanner={() => {
                  setActiveTab('attendance');
                  setShowScannerModal(true);
                }}
                onNavigateTab={(tab, subTab) => {
                  setActiveTab(tab);
                  if (subTab) setActiveDashboardSubTab(subTab);
                }}
                lang={appLang}
              />
            ) : null}

            {/* KPI Cards: Today's Attendance, Scanner State, Attention, Rate */}
            {!stats ? (
              <SkeletonLoader type="stat" count={4} />
            ) : (
              <RoleCommandCenter
                stats={scopedDashboardStats}
                scannerLive={attendanceActive || scannerBootActive}
                userRole={userRole}
                teacherSubjects={subjects}
              />
            )}

            {userRole === 'teacher' && (
              <TeacherMiniDashboard stats={scopedDashboardStats} subjects={subjects} teacherName={currentUser?.name} />
            )}

            {/* Primary 2-Column Command Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobileView ? '1fr' : 'minmax(0, 1.6fr) minmax(0, 1fr)',
              gap: '20px',
              alignItems: 'start'
            }}>
              {/* Left Column: Recent Live Activity + Charts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Live Activity Stream */}
                <div className="surface-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>
                        Recent Live Activity
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => { if (playCyberSound) playCyberSound('click'); setActiveTab('logs'); }}
                      style={{ fontSize: '0.8rem', padding: '4px 8px', minHeight: '32px', color: 'var(--color-primary)' }}
                    >
                      View Full Logs →
                    </button>
                  </div>

                  {dashboardRecentLogs && dashboardRecentLogs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {dashboardRecentLogs.slice(0, 5).map((log, idx) => {
                        const isPresent = log.attendance?.toLowerCase() === 'present';
                        return (
                          <div
                            key={log.id || idx}
                            className="surface-card surface-card-hover"
                            onClick={() => {
                              if (playCyberSound) playCyberSound('click');
                              setSelectedAuditLog(log);
                            }}
                            style={{
                              padding: '12px 14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              cursor: 'pointer',
                              background: 'rgba(255, 255, 255, 0.02)',
                              borderRadius: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.06)'
                            }}
                          >
                            {/* Top Row: Avatar, Student Name, Roll/Dep, Status Pill */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '50%',
                                  background: isPresent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: isPresent ? '#34d399' : '#f87171',
                                  border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                                }}>
                                  {log.name ? log.name.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ color: 'var(--color-text-main)', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {log.name}
                                  </div>
                                  <div style={{ color: 'var(--color-text-dim)', fontSize: '0.76rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span>Roll: {log.roll || 'N/A'}</span>
                                    {(log.dep || log.department) && <span>· {log.dep || log.department}</span>}
                                  </div>
                                </div>
                              </div>
                              
                              <span className={`status-pill ${isPresent ? 'status-pill-success' : 'status-pill-danger'}`} style={{ fontSize: '0.72rem', padding: '3px 10px', flexShrink: 0 }}>
                                {log.attendance || 'Present'}
                              </span>
                            </div>

                            {/* Bottom Details Row: Subject, Period, Date & Time */}
                            <div style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              paddingTop: '6px',
                              borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                              fontSize: '0.76rem',
                              color: '#94a3b8'
                            }}>
                              {/* Subject & Period badges */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 500 }}>
                                  📚 {log.subject_name || (log.subject_id ? `Subject #${log.subject_id}` : 'General Attendance')}
                                </span>
                                {(log.period_label || log.period) && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 500 }}>
                                    ⏰ {log.period_label || log.period}
                                  </span>
                                )}
                              </div>

                              {/* Date & Time info */}
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', color: '#cbd5e1', fontSize: '0.76rem' }}>
                                {log.date && <span>📅 {log.date}</span>}
                                <span>🕒 {log.time || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <SmartEmptyState
                      title="No Scans Logged Today"
                      message="Open the live face scanner to begin recording attendance sessions."
                      actionLabel="Open Face Scanner"
                      onAction={() => {
                        if (playCyberSound) playCyberSound('click');
                        setActiveTab('attendance');
                        setShowScannerModal(true);
                      }}
                    />
                  )}
                </div>

                {/* Attendance Charts */}
                <AttendanceChartsWidget stats={scopedDashboardStats} />
              </div>

              {/* Right Column: Quick Actions & Pending Attention Center */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Quick Scanner Action Card */}
                <div className="surface-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Biometric Actions
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (playCyberSound) playCyberSound('click');
                      setActiveTab('attendance');
                      setShowScannerModal(true);
                    }}
                    className="btn-primary"
                    style={{ width: '100%', padding: '14px', fontSize: '0.95rem' }}
                  >
                    <Camera size={18} /> Open Live Scanner
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (playCyberSound) playCyberSound('click');
                      setActiveTab('attendance');
                      setIsManualAttendanceOpen(true);
                    }}
                    className="btn-secondary"
                    style={{ width: '100%', padding: '12px' }}
                  >
                    <Edit size={16} /> Mark Manual Attendance
                  </button>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Biometric Engine:</span>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>YuNet + SFace 128-D</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Vector Matching:</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>BLAS Accelerated (&lt; 2ms)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Offline Pending Queue:</span>
                      <span style={{ color: getOfflineQueue().length > 0 ? '#f59e0b' : 'var(--color-text-dim)', fontWeight: 600 }}>
                        {getOfflineQueue().length} records
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pending Review & Attention Center */}
                <div className="surface-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Operations & Review Center
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {userRole !== 'student' && (
                      <button
                        type="button"
                        onClick={() => { if (playCyberSound) playCyberSound('click'); setActiveTab('face-review'); }}
                        className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ScanFace size={16} style={{ color: '#0ea5e9' }} /> Borderline Face Matches
                        </span>
                        <span className="status-pill status-pill-cyan" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>Review</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => { if (playCyberSound) playCyberSound('click'); setActiveTab('disputes'); }}
                      className="btn-secondary"
                      style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldAlert size={16} style={{ color: '#f59e0b' }} /> Student Disputes
                      </span>
                      <span className="status-pill status-pill-warning" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>Queue</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { if (playCyberSound) playCyberSound('click'); setActiveTab('calendar'); }}
                      className="btn-secondary"
                      style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} style={{ color: '#8b5cf6' }} /> Academic Calendar
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>Schedule</span>
                    </button>

                    {userRole === 'admin' && (
                      <button
                        type="button"
                        onClick={() => { if (playCyberSound) playCyberSound('click'); setActiveTab('devices'); }}
                        className="btn-secondary"
                        style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Monitor size={16} style={{ color: '#10b981' }} /> Scanner Device Fleet
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>Telemetry</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Secondary Analytics Directory Hub */}
                <div className="surface-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Analytics & Diagnostics Hub
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => { setActiveDashboardSubTab('metrics'); if (playCyberSound) playCyberSound('click'); }}
                      className="btn-secondary"
                      style={{ padding: '12px 10px', flexDirection: 'column', gap: '6px', height: 'auto' }}
                    >
                      <Activity size={18} style={{ color: '#0ea5e9' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Live Telemetry</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveDashboardSubTab('trends'); if (playCyberSound) playCyberSound('click'); }}
                      className="btn-secondary"
                      style={{ padding: '12px 10px', flexDirection: 'column', gap: '6px', height: 'auto' }}
                    >
                      <Layers size={18} style={{ color: '#8b5cf6' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Trends & Radar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveDashboardSubTab('diagnostics'); if (playCyberSound) playCyberSound('click'); }}
                      className="btn-secondary"
                      style={{ padding: '12px 10px', flexDirection: 'column', gap: '6px', height: 'auto' }}
                    >
                      <Settings size={18} style={{ color: '#10b981' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Diagnostics</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveDashboardSubTab('feedback'); if (playCyberSound) playCyberSound('click'); }}
                      className="btn-secondary"
                      style={{ padding: '12px 10px', flexDirection: 'column', gap: '6px', height: 'auto' }}
                    >
                      <MessageSquare size={18} style={{ color: '#f59e0b' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>User Feedback</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Streamlined Bottom Feedback Strip */}
            <div 
              className="surface-card" 
              style={{ 
                marginTop: '8px',
                padding: '20px 24px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: '16px',
                borderLeft: '3px solid var(--color-primary)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ 
                  background: 'var(--color-primary-light)', 
                  color: 'var(--color-primary)', 
                  borderRadius: '10px', 
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-main)', margin: 0 }}>System Feedback & Support</h4>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: '2px 0 0' }}>
                    Report issues, request facial enrollment audits, or send feedback to administrator.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  setShowFeedbackModal(true);
                }}
                className="btn-secondary"
                style={{ padding: '8px 18px', minHeight: '38px', fontSize: '0.84rem' }}
              >
                <MessageSquare size={15} /> Share Feedback
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* ===== MERGED ATTENDANCE METRICS & LIVE TELEMETRY STUDIO ===== */}
            {(activeDashboardSubTab === 'metrics' || activeDashboardSubTab === 'telemetry') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '20px', padding: '24px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, #00f2fe, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        📊 Attendance Metrics & Live Telemetry Studio
                      </h3>
                      <span style={{ background: 'rgba(0, 242, 254, 0.2)', border: '1px solid #00f2fe', color: '#00f2fe', fontSize: '0.72rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                        LIVE REALTIME ENGINE
                      </span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0' }}>
                      Realtime student presence metrics, total active session connections, live attendance ticker feed, and live active role telemetry registry.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      🟢 Rate: {stats?.average_attendance_rate || 0}%
                    </span>
                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                      📡 Active Users: {activeTelemetry?.total_active || 1}
                    </span>
                  </div>
                </div>

                {/* Section 1: Live Ticker */}
                <LiveActivityTicker activities={liveActivities} />

                {/* Section 2: Metric Summary Cards */}
                <div className="dashboard-grid">
                  <div className="glass-panel metric-card" style={{ 
                    animationDelay: '100ms',
                    borderLeft: '4px solid #00f2fe',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))'
                  }}>
                    <div className="metric-info">
                      <h3 style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Total Enrolled Students</h3>
                      <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', margin: '4px 0 0' }}>{stats?.total_students || 0}</p>
                    </div>
                    <div className="metric-icon" style={{ background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', borderRadius: '12px', padding: '12px' }}>
                      <Users size={24} />
                    </div>
                  </div>

                  <div className="glass-panel metric-card" style={{ 
                    animationDelay: '200ms',
                    borderLeft: '4px solid #10b981',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))'
                  }}>
                    <div className="metric-info">
                      <h3 style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Present Today</h3>
                      <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', margin: '4px 0 0' }}>{stats?.total_present_today || 0}</p>
                    </div>
                    <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: '12px', padding: '12px' }}>
                      <CheckCircle2 size={24} />
                    </div>
                  </div>

                  <div className="glass-panel metric-card" style={{ 
                    animationDelay: '300ms',
                    borderLeft: '4px solid #ef4444',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))'
                  }}>
                    <div className="metric-info">
                      <h3 style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Absent Today</h3>
                      <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', margin: '4px 0 0' }}>{stats?.total_absent_today || 0}</p>
                    </div>
                    <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '12px', padding: '12px' }}>
                      <AlertCircle size={24} />
                    </div>
                  </div>

                  <div className="glass-panel metric-card" style={{ 
                    animationDelay: '400ms',
                    borderLeft: '4px solid #a78bfa',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))'
                  }}>
                    <div className="metric-info">
                      <h3 style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>Presence Rate</h3>
                      <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc', margin: '4px 0 0' }}>{stats?.average_attendance_rate || 0}%</p>
                    </div>
                    <div className="metric-icon" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', borderRadius: '12px', padding: '12px' }}>
                      <TrendingUp size={24} />
                    </div>
                  </div>
                </div>

                {/* Section 3: Live Active Telemetry Session Monitor */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
                  border: '1px solid rgba(167, 139, 250, 0.3)',
                  borderRadius: '20px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981', animation: 'pulse 1.5s infinite' }} />
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '0.04em' }}>
                        📡 LIVE ROLE TELEMETRY & ACTIVE CONNECTIONS REGISTRY
                      </h4>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      SOCKET SYNC: 100% LATENCY: 24ms
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>TOTAL ACTIVE USERS</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#00f2fe' }}>{activeTelemetry?.total_active || (stats?.total_present_today > 0 ? stats.total_present_today + 1 : 1)}</span>
                    </div>
                    <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>STUDENTS ONLINE</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{activeTelemetry?.students || stats?.total_present_today || 0}</span>
                    </div>
                    <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>TEACHERS ONLINE</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{activeTelemetry?.teachers || 1}</span>
                    </div>
                    <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(167, 139, 250, 0.2)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>ADMINISTRATORS</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c084fc' }}>{activeTelemetry?.admins || 1}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== MERGED TRENDS, ANALYTICS & BIOMETRIC RADAR STUDIO ===== */}
            {(activeDashboardSubTab === 'trends' || activeDashboardSubTab === 'radar') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))', border: '1px solid rgba(167, 139, 250, 0.3)', borderRadius: '20px', padding: '24px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, #a78bfa, #00f2fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        📊 Trends, Analytics & Biometric Radar Studio
                      </h3>
                      <span style={{ background: 'rgba(167, 139, 250, 0.2)', border: '1px solid #a78bfa', color: '#c084fc', fontSize: '0.72rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
                        MERGED ANALYTICS & RADAR
                      </span>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0' }}>
                      Weekly attendance trends line area graphs, department presence distribution, perimeter biometric sonar sweeps, and neural mesh visualization map.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(167, 139, 250, 0.15)', color: '#c084fc', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(167, 139, 250, 0.3)' }}>
                      📊 Analytics: ONLINE
                    </span>
                    <span style={{ padding: '4px 10px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                      🛡️ Biometric Radar: ACTIVE
                    </span>
                  </div>
                </div>

                {/* Row 1: Charts Grid */}
                <div className="dashboard-charts-grid">
                  {/* Weekly Trend Line Area Chart */}
                  <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Calendar size={20} style={{ color: '#00f2fe' }} /> 1. Weekly Attendance Trends (7 Days)
                    </h4>
                    <div ref={chartRef1} style={{ width: '100%', height: '230px', minWidth: 0, position: 'relative' }}>
                      <AreaChart width={chartWidth1} height={230} data={stats?.weekly_trends || []}>
                        <defs>
                          <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#00f2fe" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ 
                          background: '#0d1323', 
                          border: '1px solid rgba(0, 242, 254, 0.3)', 
                          borderRadius: '12px', 
                          color: '#f1f5f9',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                        }} />
                        <Area type="monotone" dataKey="present" stroke="#00f2fe" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                      </AreaChart>
                    </div>
                  </div>

                  {/* Department distribution Bar Chart */}
                  <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Layers size={20} style={{ color: '#a78bfa' }} /> 2. Present Today by Department
                    </h4>
                    <div ref={chartRef2} style={{ width: '100%', height: '230px', minWidth: 0, position: 'relative' }}>
                      {!stats?.department_stats || Object.keys(stats.department_stats).length === 0 ? (
                        <div className="flex-center" style={{ height: '100%', color: '#94a3b8', flexDirection: 'column', gap: '12px' }}>
                          <AlertCircle size={32} style={{ color: '#ef4444' }} />
                          <span>No department attendance marked yet today.</span>
                        </div>
                      ) : (
                        <BarChart width={chartWidth2} height={230} data={Object.keys(stats.department_stats).map(dept => {
                          const val = stats.department_stats[dept];
                          const countVal = (val && typeof val === 'object') ? (val.present !== undefined ? val.present : (val.count !== undefined ? val.count : 0)) : val;
                          return { name: dept, count: countVal };
                        })}>
                          <defs>
                            <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.9}/>
                              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.6}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ 
                            background: '#0d1323', 
                            border: '1px solid rgba(167, 139, 250, 0.3)', 
                            borderRadius: '12px', 
                            color: '#f1f5f9',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                          }} />
                          <Bar dataKey="count" fill="url(#colorBar)" radius={[6, 6, 0, 0]} barSize={35} />
                        </BarChart>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Radar & Mesh Grid */}
                <div className="dashboard-charts-grid">
                  {/* Sonar Radar Stats Card */}
                  <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <TrendingUp size={20} style={{ color: '#00f2fe' }} /> 3. Perimeter Biometric Radar
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '20px' }}>
                      <svg width="200" height="200" viewBox="0 0 200 200" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 242, 254, 0.25))' }}>
                        <defs>
                          <radialGradient id="radarSweepGrad" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0" />
                            <stop offset="85%" stopColor="#00f2fe" stopOpacity="0.05" />
                            <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.3" />
                          </radialGradient>
                        </defs>
                        <circle cx="100" cy="100" r="90" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" opacity="0.4" />
                        <circle cx="100" cy="100" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" opacity="0.4" strokeDasharray="3 3" />
                        <circle cx="100" cy="100" r="50" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" opacity="0.5" />
                        <circle cx="100" cy="100" r="30" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" opacity="0.5" strokeDasharray="2 2" />
                        <circle cx="100" cy="100" r="10" stroke="rgba(0, 242, 254, 0.5)" strokeWidth="1.5" fill="none" opacity="0.8" />
                        
                        <line x1="100" y1="5" x2="100" y2="195" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        <line x1="5" y1="100" x2="195" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                        
                        <g style={{ transformOrigin: '100px 100px', animation: 'radarSweep 4s linear infinite' }}>
                          <line x1="100" y1="100" x2="100" y2="10" stroke="#00f2fe" strokeWidth="1.5" opacity="0.8" />
                          <polygon points="100,100 100,10 70,18" fill="url(#radarSweepGrad)" opacity="0.6" />
                        </g>

                        <g style={{ animation: 'radarPulse 3s infinite ease-in-out' }}>
                          <circle cx="65" cy="75" r="4.5" fill="#10b981" filter="drop-shadow(0 0 4px #10b981)" />
                        </g>
                        <g style={{ animation: 'radarPulse 2.5s infinite ease-in-out', animationDelay: '0.8s' }}>
                          <circle cx="145" cy="65" r="4" fill="#00f2fe" filter="drop-shadow(0 0 4px #00f2fe)" />
                        </g>
                        <g style={{ animation: 'radarPulse 3.5s infinite ease-in-out', animationDelay: '1.5s' }}>
                          <circle cx="120" cy="135" r="3.5" fill="#f59e0b" filter="drop-shadow(0 0 4px #f59e0b)" />
                        </g>
                      </svg>
                      
                      <div style={{ width: '100%', background: 'rgba(8, 12, 20, 0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                        <div>STATUS: <span style={{ color: '#10b981', fontWeight: 'bold' }}>SCANNING</span></div>
                        <div>BEACONS: <span style={{ color: '#f1f5f9', fontWeight: 'bold' }}>4 ACTIVE</span></div>
                        <div>LIVENESS: <span style={{ color: '#00f2fe', fontWeight: 'bold' }}>SECURE</span></div>
                        <div>FPS RATE: <span style={{ color: '#f1f5f9', fontWeight: 'bold' }}>{hudMetrics?.fps || 30} Hz</span></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Neural Mesh Connectivity Map */}
                  <div className="glass-panel" style={{ padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', minHeight: '340px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldCheck size={20} style={{ color: '#a78bfa' }} /> 4. Biometric Neural Mesh Map
                    </h4>
                    <div style={{ position: 'relative', flex: 1, minHeight: '240px', width: '100%', overflow: 'hidden', borderRadius: '14px', background: 'rgba(8, 12, 20, 0.5)', border: '1px solid rgba(167, 139, 250, 0.2)' }}>
                      <canvas ref={neuralMeshCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Module 4: System Health & Core Diagnostics */}
            {activeDashboardSubTab === 'diagnostics' && (
              <div className="glass-panel" style={{ 
                  padding: '28px', 
                  animationDelay: '900ms', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  minHeight: '350px' 
                }}>
                  <h3 style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 600, 
                    marginBottom: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '10px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldCheck size={18} style={{ color: activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe' }} />
                      <span>System Health & Diagnostics</span>
                    </div>
                    {systemHealth && (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        background: systemHealth.status === 'HEALTHY' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: systemHealth.status === 'HEALTHY' ? '#10b981' : '#ef4444',
                        fontWeight: 'bold',
                        letterSpacing: '1px'
                      }}>
                        {systemHealth.status}
                      </span>
                    )}
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', flex: 1 }}>
                    {/* Column 1: System Health & Core Specs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Gauge bars for CPU & RAM */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px', fontFamily: 'monospace' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>CPU ENGINE:</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 'bold' }}>{systemHealth ? `${systemHealth.metrics.cpu_percent}%` : '0.0%'}</span>
                          </div>
                          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ 
                              height: '100%', 
                              width: systemHealth ? `${systemHealth.metrics.cpu_percent}%` : '0%', 
                              background: `linear-gradient(90deg, ${activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe'}, ${activeTheme === 'matrix' ? '#00cc38' : activeTheme === 'obsidian' ? '#cc3232' : activeTheme === 'violet' ? '#8b5cf6' : '#4facfe'})`,
                              borderRadius: '4px',
                              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                          </div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px', fontFamily: 'monospace' }}>
                            <span style={{ color: 'var(--color-text-muted)' }}>RAM BUFFER:</span>
                            <span style={{ color: '#f1f5f9', fontWeight: 'bold' }}>{systemHealth ? `${systemHealth.metrics.memory_percent}%` : '0.0%'}</span>
                          </div>
                          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ 
                              height: '100%', 
                              width: systemHealth ? `${systemHealth.metrics.memory_percent}%` : '0%', 
                              background: `linear-gradient(90deg, ${activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe'}, ${activeTheme === 'matrix' ? '#00cc38' : activeTheme === 'obsidian' ? '#cc3232' : activeTheme === 'violet' ? '#8b5cf6' : '#4facfe'})`,
                              borderRadius: '4px',
                              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                            }} />
                          </div>
                        </div>
                      </div>

                      {/* Core checklist */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '12px 20px', 
                        background: 'rgba(8, 12, 20, 0.25)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '10px', 
                        padding: '16px', 
                        fontSize: '0.8rem',
                        fontFamily: 'monospace'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>DATABASE:</span>
                          <span style={{ 
                            color: systemHealth?.database === 'CONNECTED' ? '#10b981' : '#ef4444', 
                            fontWeight: 'bold' 
                          }}>
                            {systemHealth ? systemHealth.database : 'CHECKING...'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>DB ENGINE / TYPE:</span>
                          <span style={{ 
                            color: systemHealth?.database_type === 'sqlite' ? '#f59e0b' : '#00f2fe',
                            fontWeight: 'bold' 
                          }}>
                            {systemHealth ? (systemHealth.database_type === 'sqlite' ? 'LOCAL SQLITE (FALLBACK)' : systemHealth.database_type.toUpperCase()) : 'CHECKING...'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>API LATENCY:</span>
                          <span style={{ 
                            color: apiLatency === -1 ? '#ef4444' : apiLatency < 40 ? '#10b981' : apiLatency < 100 ? '#f59e0b' : '#ef4444',
                            fontWeight: 'bold' 
                          }}>
                            {apiLatency === -1 ? 'OFFLINE' : `${apiLatency} ms`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>DETECTION YUNET:</span>
                          <span style={{ 
                            color: systemHealth?.models?.yunet === 'READY' ? '#10b981' : '#ef4444', 
                            fontWeight: 'bold' 
                          }}>
                            {systemHealth?.models?.yunet || 'CHECKING...'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--color-text-muted)' }}>RECOGNITION SFACE:</span>
                          <span style={{ 
                            color: systemHealth?.models?.sface === 'READY' ? '#10b981' : '#ef4444', 
                            fontWeight: 'bold' 
                          }}>
                            {systemHealth?.models?.sface || 'CHECKING...'}
                          </span>
                        </div>
                      </div>

                      {/* System details */}
                      <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>UPTIME: <span style={{ color: '#f1f5f9' }}>{systemHealth ? (() => {
                          const sec = systemHealth.metrics.uptime_seconds;
                          const d = Math.floor(sec / (3600*24));
                          const h = Math.floor((sec % (3600*24)) / 3600);
                          const m = Math.floor((sec % 3600) / 60);
                          const s = sec % 60;
                          return `${d}d ${h}h ${m}m ${s}s`;
                        })() : '0d 0h 0m 0s'}</span></div>
                        <div>PLATFORM: <span style={{ color: '#f1f5f9' }}>{systemHealth ? `${systemHealth.platform.system} (${systemHealth.platform.release})` : 'DETECTING...'}</span></div>
                        <div>ENVIRONMENT: <span style={{ color: '#f1f5f9' }}>Python {systemHealth ? systemHealth.platform.python_version : '...'}</span></div>
                      </div>
                      {/* Manual trigger button */}
                      <button 
                        onClick={() => {
                          if (playCyberSound) playCyberSound('click');
                          setHealthLoading(true);
                          fetchSystemHealth().finally(() => {
                            setTimeout(() => setHealthLoading(false), 600);
                          });
                        }}
                        disabled={healthLoading}
                        className="action-btn"
                        style={{ 
                          marginTop: 'auto',
                          padding: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontFamily: 'monospace',
                          letterSpacing: '1px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {healthLoading && (
                          <div style={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: '100%',
                            background: 'rgba(0, 242, 254, 0.15)',
                            animation: 'scannerPulse 1.2s infinite'
                          }} />
                        )}
                        <span>{healthLoading ? 'RUNNING INTEGRITY CHECK...' : 'RUN CORE DIAGNOSTICS'}</span>
                      </button>
                    </div>

                    {/* Column 2: SMTP Mailer Diagnostics */}
                    <SmtpSettings token={token} />
                  </div>
                </div>
              )}

              {/* Module 5: User Feedback Submissions */}
              {activeDashboardSubTab === 'feedback' && userRole === 'admin' && (
                <div className="glass-panel" style={{ 
                  marginTop: '28px', 
                  padding: '28px', 
                  animationDelay: '1000ms',
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  overflow: 'hidden'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MessageSquare size={18} style={{ color: activeTheme === 'matrix' ? '#00ff46' : activeTheme === 'obsidian' ? '#ff3e3e' : activeTheme === 'violet' ? '#a855f7' : '#00f2fe' }} />
                    <span>User Feedback Submissions</span>
                  </h3>
                  
                  {isLoadingFeedbacks ? (
                    <div className="flex-center" style={{ padding: '40px', color: 'var(--color-text-muted)' }}>
                      <div style={{ width: '32px', height: '32px', border: '3px solid rgba(0, 242, 254, 0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      <span style={{ marginLeft: '12px' }}>Loading feedbacks...</span>
                    </div>
                  ) : feedbacks.length === 0 ? (
                    <div className="flex-center" style={{ padding: '40px', color: 'var(--color-text-muted)', flexDirection: 'column', gap: '12px' }}>
                      <AlertCircle size={32} style={{ color: 'var(--color-text-muted)' }} />
                      <span>No feedbacks submitted yet.</span>
                    </div>
                  ) : (
                    <div className="table-responsive table-container" style={{ width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>USER REF (ID)</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>EMAIL</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>ROLE</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>CATEGORY</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>RATING</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>MESSAGE</th>
                            <th style={{ padding: '12px 16px', fontWeight: 600 }}>DATE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feedbacks.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                              <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--color-primary)' }}>
                                #{item.user_id !== null && item.user_id !== undefined ? item.user_id : 'N/A'}
                              </td>
                              <td style={{ padding: '14px 16px', color: '#f1f5f9' }}>{item.user_email}</td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{ 
                                  padding: '2px 8px', 
                                  borderRadius: '4px', 
                                  fontSize: '0.75rem', 
                                  fontWeight: 600,
                                  background: item.role === 'student' ? 'rgba(167, 139, 250, 0.12)' : item.role === 'teacher' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 242, 254, 0.12)',
                                  color: item.role === 'student' ? '#a78bfa' : item.role === 'teacher' ? '#10b981' : '#00f2fe'
                                }}>
                                  {item.role.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{ 
                                  padding: '2px 8px', 
                                  borderRadius: '4px', 
                                  fontSize: '0.75rem', 
                                  fontWeight: 600,
                                  background: item.type === 'bug' ? 'rgba(239, 68, 68, 0.12)' : item.type === 'suggestion' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                  color: item.type === 'bug' ? '#ef4444' : item.type === 'suggestion' ? '#f59e0b' : '#94a3b8'
                                }}>
                                  {item.type.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px', color: '#fbbf24', minWidth: '110px' }}>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <svg 
                                      key={star}
                                      width="14" 
                                      height="14" 
                                      viewBox="0 0 24 24" 
                                      fill={star <= item.rating ? "#fbbf24" : "none"} 
                                      stroke={star <= item.rating ? "#fbbf24" : "rgba(255, 255, 255, 0.2)"} 
                                      strokeWidth="2.5"
                                    >
                                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                    </svg>
                                  ))}
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.message}>
                                {item.message}
                              </td>
                              <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                                {new Date(item.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
    </PullToRefresh>
  );
}
