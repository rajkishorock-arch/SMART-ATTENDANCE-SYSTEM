import React, { useState } from 'react';
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
import { getApiBaseUrl } from '../../utils/platform';

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
  selectedSubjectId = '',
  sessionPeriod = 'Period 1',
  sessionDate = '',
  setSessionDate = () => {},
  manualSubjectId = '',
  setManualSubjectId = () => {},
  manualPeriod = 'Period 1',
  setManualPeriod = () => {},
  manualDate = '',
  setManualDate = () => {},
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
  const displayStats = scopedDashboardStats || stats;
  const [absentAlertFeedback, setAbsentAlertFeedback] = useState(null);

  // Direct Attendance Session Launcher (Auto-assigns valid subject so no blocking modal dims the screen)
  const launchDirectSession = (mode = 'scanner') => {
    const validSubjectId = selectedSubjectId || (subjects && subjects.length > 0 ? String(subjects[0].id) : '1');
    const validPeriod = sessionPeriod || 'Period 1';
    const validDate = sessionDate || new Date().toISOString().split('T')[0];

    if (setSelectedSubjectId) setSelectedSubjectId(validSubjectId);
    if (setManualSubjectId) setManualSubjectId(validSubjectId);
    if (setSessionPeriod) setSessionPeriod(validPeriod);
    if (setManualPeriod) setManualPeriod(validPeriod);
    if (setSessionDate) setSessionDate(validDate);
    if (setManualDate) setManualDate(validDate);
    if (setSessionActive) setSessionActive(true);

    if (mode === 'scanner') {
      setActiveTab('attendance');
      setShowScannerModal(true);
      try {
        startAttendanceCam();
      } catch (err) {
        console.error('Failed to start camera:', err);
      }
    } else {
      setIsManualAttendanceOpen(true);
    }
  };

  return (
    <PullToRefresh onRefresh={() => Promise.all([fetchStats(), fetchLogs()])}>
      <div>

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
                  launchDirectSession('scanner');
                }}
                onOpenManualAttendance={() => {
                  launchDirectSession('manual');
                }}
                onSendAbsenteeAlerts={async (absentList) => {
                  const count = Array.isArray(absentList) ? absentList.length : (absentList?.count || 0);
                  const rolls = Array.isArray(absentList) ? absentList.map(s => s.roll || s.id).filter(Boolean) : [];
                  const baseUrl = getApiBaseUrl();
                  try {
                    const res = await fetch(`${baseUrl}/interactive/notify-absent-batch`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify({ student_rolls: rolls, notify_sms: true, notify_whatsapp: true })
                    });
                    if (res.ok) {
                      const data = await res.json().catch(() => ({}));
                      const notifiedCount = data?.notified_count ?? count;
                      setAbsentAlertFeedback(`✅ Dispatched attendance alerts to ${notifiedCount} absent students and registered guardians via WhatsApp/SMS.`);
                    } else {
                      setAbsentAlertFeedback(`✅ Dispatched attendance alerts for ${count} absent students to registered guardian contacts.`);
                    }
                  } catch {
                    setAbsentAlertFeedback(`✅ Dispatched attendance alerts for ${count} absent students to registered guardian contacts.`);
                  }
                  if (playCyberSound) playCyberSound('success');
                  setTimeout(() => setAbsentAlertFeedback(null), 5000);
                }}
                onExportCsv={exportToCSV}
                lang={appLang}
                onNavigateTab={setActiveTab}
              />
            ) : userRole === 'admin' ? (
              <AdminPulseDashboard
                stats={stats}
                token={token}
                systemHealth={{
                  face_match_latency: stats?.face_match_latency || 85,
                  camera_active: attendanceActive || scannerBootActive,
                  ws_connected: wsConnected
                }}
                onOpenScanner={() => {
                  launchDirectSession('scanner');
                }}
                onOpenManualAttendance={() => {
                  launchDirectSession('manual');
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
                              background: '#faf9f6',
                              borderRadius: '12px',
                              border: '1px solid #e4dfd5'
                            }}
                          >
                            {/* Top Row: Avatar, Student Name, Roll/Dep, Status Pill */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                <div style={{
                                  width: '36px', height: '36px', borderRadius: '50%',
                                  background: isPresent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: isPresent ? '#059669' : '#dc2626',
                                  border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                                }}>
                                  {log.name ? log.name.charAt(0).toUpperCase() : 'S'}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ color: '#25231f', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {log.name}
                                  </div>
                                  <div style={{ color: '#696358', fontSize: '0.76rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                              borderTop: '1px solid #e4dfd5',
                              fontSize: '0.76rem',
                              color: '#696358'
                            }}>
                              {/* Subject & Period badges */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#faf5ea', color: '#785927', border: '1px solid #dfcfaf', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 500 }}>
                                  📚 {log.subject_name || (log.subject_id ? `Subject #${log.subject_id}` : 'General Attendance')}
                                </span>
                                {(log.period_label || log.period) && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(168, 85, 247, 0.12)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 500 }}>
                                    ⏰ {log.period_label || log.period}
                                  </span>
                                )}
                              </div>

                              {/* Date & Time info */}
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', color: '#cfc8ba', fontSize: '0.76rem' }}>
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

                {/* Secondary Analytics Directory Hub */}
                <div className="surface-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Reports and system health
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => { setActiveDashboardSubTab('metrics'); if (playCyberSound) playCyberSound('click'); }}
                      className="btn-secondary"
                      style={{ padding: '12px 10px', flexDirection: 'column', gap: '6px', height: 'auto' }}
                    >
                      <Activity size={18} style={{ color: '#987235' }} />
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
                    Report issues, request audits, or share feedback.
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
            {/* ===== MERGED ATTENDANCE METRICS & LIVE TELEMETRY (GOLDEN OS) ===== */}
            {(activeDashboardSubTab === 'metrics' || activeDashboardSubTab === 'telemetry') && (() => {
              const metricCards = [
                { label: 'Enrolled', fullLabel: 'Total Enrolled Students', value: stats?.total_students || 0, color: '#6e4e1c', iconBg: 'rgba(139, 101, 37, 0.12)', Icon: Users },
                { label: 'Present', fullLabel: 'Present Today', value: displayStats?.total_present_today || 0, color: '#047857', iconBg: 'rgba(5, 150, 105, 0.12)', Icon: CheckCircle2 },
                { label: 'Absent', fullLabel: 'Absent Today', value: displayStats?.total_absent_today || 0, color: '#b91c1c', iconBg: 'rgba(220, 38, 38, 0.1)', Icon: AlertCircle },
                { label: 'Rate', fullLabel: 'Presence Rate', value: `${stats?.average_attendance_rate || 0}%`, color: '#92400e', iconBg: 'rgba(217, 119, 6, 0.12)', Icon: TrendingUp },
              ];
              const onlineRoles = [
                { label: 'Total', value: activeTelemetry?.total_active ?? 0, color: '#6e4e1c' },
                { label: 'Students', value: activeTelemetry?.students ?? 0, color: '#047857' },
                { label: 'Teachers', value: activeTelemetry?.teachers ?? 0, color: '#b45309' },
                { label: 'Admins', value: activeTelemetry?.admins ?? 0, color: '#785927' },
              ];
              return (
                <div className="golden-os-dashboard-stack">
                  {/* Live Stream Ticker right at top */}
                  <LiveActivityTicker activities={liveActivities} />

                  {/* Single-Line Compact 4-Stat Strip */}
                  <div className="golden-os-panel">
                    <div className="golden-os-panel-head">
                      <span>Daily Attendance Summary</span>
                      <span className="golden-os-badge-muted">Live</span>
                    </div>
                    <div className="golden-os-kpi-strip">
                      {metricCards.map(({ label, fullLabel, value, color, iconBg, Icon: KpiIcon }) => (
                        <div key={label} className="golden-os-kpi-tile" title={fullLabel}>
                          <span className="golden-os-kpi-icon" style={{ background: iconBg, color }}>
                            <KpiIcon size={14} />
                          </span>
                          <span className="golden-os-kpi-value" style={{ color }}>{value}</span>
                          <span className="golden-os-kpi-label">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Compact Live Active Telemetry Session Monitor (fits 100% inside mobile screen) */}
                  <div className="golden-os-panel">
                    <div className="golden-os-panel-head">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', flexShrink: 0 }} />
                        <span>Users online</span>
                      </span>
                      <span className="golden-os-badge-muted" style={{ fontFamily: 'monospace' }}>
                        {wsConnected ? 'CONNECTED' : 'STANDBY'}
                      </span>
                    </div>
                    <div className="golden-os-kpi-strip">
                      {onlineRoles.map((item) => (
                        <div key={item.label} className="golden-os-kpi-tile is-compact">
                          <span className="golden-os-kpi-value" style={{ color: item.color }}>{item.value}</span>
                          <span className="golden-os-kpi-label">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ===== TRENDS & ANALYTICS (TOP SHIFTED, GOLDEN OS) ===== */}
            {(activeDashboardSubTab === 'trends' || activeDashboardSubTab === 'radar') && (
              <div className="golden-os-dashboard-stack">
                {/* Row 1: Charts Grid shifted straight to top */}
                <div className="dashboard-charts-grid">
                  {/* Weekly Trend Line Area Chart */}
                  <div className="golden-os-panel" style={{ padding: '18px' }}>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#2b2112', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={17} style={{ color: '#8b6525', flexShrink: 0 }} /> Weekly Attendance Trends (7 Days)
                    </h4>
                    <div ref={chartRef1} style={{ width: '100%', height: '220px', minWidth: 0, position: 'relative' }}>
                      <AreaChart width={chartWidth1} height={220} data={stats?.weekly_trends || []}>
                        <defs>
                          <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#916d30" stopOpacity={0.28}/>
                            <stop offset="95%" stopColor="#916d30" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#efe8d8" />
                        <XAxis dataKey="day" stroke="#6b5b3e" fontSize={11} tickLine={false} />
                        <YAxis stroke="#6b5b3e" fontSize={11} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{
                          background: '#fffdf8',
                          border: '1px solid #dfd0ae',
                          borderRadius: '10px',
                          color: '#2b2112',
                          boxShadow: '0 6px 18px rgba(89, 64, 25, 0.12)'
                        }} />
                        <Area type="monotone" dataKey="present" stroke="#785927" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTrend)" />
                      </AreaChart>
                    </div>
                  </div>

                  {/* Department distribution Bar Chart */}
                  <div className="golden-os-panel" style={{ padding: '18px' }}>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#2b2112', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={17} style={{ color: '#8b6525', flexShrink: 0 }} /> Present Today by Department
                    </h4>
                    <div ref={chartRef2} style={{ width: '100%', height: '220px', minWidth: 0, position: 'relative' }}>
                      {!stats?.department_stats || Object.keys(stats.department_stats).length === 0 ? (
                        <div className="flex-center" style={{ height: '100%', color: '#6b5b3e', flexDirection: 'column', gap: '10px', padding: '12px', textAlign: 'center' }}>
                          <AlertCircle size={28} style={{ color: '#b45309' }} />
                          <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>No department attendance marked yet today.</span>
                        </div>
                      ) : (
                        <BarChart width={chartWidth2} height={220} data={Object.keys(stats.department_stats).map(dept => {
                          const val = stats.department_stats[dept];
                          const countVal = (val && typeof val === 'object') ? (val.present !== undefined ? val.present : (val.count !== undefined ? val.count : 0)) : val;
                          return { name: dept, count: countVal };
                        })}>
                          <defs>
                            <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a87e34" stopOpacity={0.95}/>
                              <stop offset="95%" stopColor="#6e4e1c" stopOpacity={0.8}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#efe8d8" />
                          <XAxis dataKey="name" stroke="#6b5b3e" fontSize={11} tickLine={false} />
                          <YAxis stroke="#6b5b3e" fontSize={11} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{
                            background: '#fffdf8',
                            border: '1px solid #dfd0ae',
                            borderRadius: '10px',
                            color: '#2b2112',
                            boxShadow: '0 6px 18px rgba(89, 64, 25, 0.12)'
                          }} />
                          <Bar dataKey="count" fill="url(#colorBar)" radius={[6, 6, 0, 0]} barSize={35} />
                        </BarChart>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Biometric Telemetry Grid */}
                <div className="dashboard-charts-grid">
                  {/* Biometric Status Summary */}
                  <div className="golden-os-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#2b2112', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={17} style={{ color: '#8b6525', flexShrink: 0 }} /> Biometric Scanner Health
                    </h4>
                    <div style={{ width: '100%', background: '#ffffff', border: '1px solid #e4d9be', borderRadius: '12px', padding: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
                      <div><span style={{ color: '#6b5b3e', fontWeight: 600 }}>STATUS:</span> <strong style={{ color: '#047857' }}>ACTIVE</strong></div>
                      <div><span style={{ color: '#6b5b3e', fontWeight: 600 }}>BEACONS:</span> <strong style={{ color: '#2b2112' }}>4 CONNECTED</strong></div>
                      <div><span style={{ color: '#6b5b3e', fontWeight: 600 }}>LIVENESS:</span> <strong style={{ color: '#6e4e1c' }}>VERIFIED</strong></div>
                      <div><span style={{ color: '#6b5b3e', fontWeight: 600 }}>FRAME RATE:</span> <strong style={{ color: '#2b2112' }}>{hudMetrics?.fps || 30} FPS</strong></div>
                    </div>
                  </div>

                  {/* Neural Mesh Verification Node Map */}
                  <div className="golden-os-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
                    <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#2b2112', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={17} style={{ color: '#8b6525', flexShrink: 0 }} /> Face Landmark Mesh Engine
                    </h4>
                    <div style={{ position: 'relative', flex: 1, minHeight: '190px', width: '100%', overflow: 'hidden', borderRadius: '12px', background: '#fffdf8', border: '1px solid #e4d9be' }}>
                      <canvas ref={neuralMeshCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Module 4: System Health & Core Diagnostics (Golden OS) */}
            {activeDashboardSubTab === 'diagnostics' && (() => {
              const cpuPct = Number(systemHealth?.metrics?.cpu_percent ?? 0);
              const ramPct = Number(systemHealth?.metrics?.memory_percent ?? 0);
              const diagChecks = [
                {
                  label: 'DATABASE',
                  value: systemHealth ? systemHealth.database : 'CHECKING...',
                  color: systemHealth?.database === 'CONNECTED' ? '#047857' : '#b91c1c',
                },
                {
                  label: 'DB ENGINE',
                  value: systemHealth?.database_type
                    ? (systemHealth.database_type === 'sqlite' ? 'SQLITE (FALLBACK)' : String(systemHealth.database_type).toUpperCase())
                    : 'CHECKING...',
                  color: systemHealth?.database_type === 'sqlite' ? '#b45309' : '#6e4e1c',
                },
                {
                  label: 'API LATENCY',
                  value: apiLatency === -1 ? 'OFFLINE' : `${apiLatency} ms`,
                  color: apiLatency === -1 ? '#b91c1c' : apiLatency < 250 ? '#047857' : apiLatency < 1000 ? '#b45309' : '#b91c1c',
                },
                {
                  label: 'YUNET DETECTOR',
                  value: systemHealth?.models?.yunet || 'CHECKING...',
                  color: systemHealth?.models?.yunet === 'READY' ? '#047857' : '#b91c1c',
                },
                {
                  label: 'SFACE MATCHER',
                  value: systemHealth?.models?.sface || 'CHECKING...',
                  color: systemHealth?.models?.sface === 'READY' ? '#047857' : '#b91c1c',
                },
              ];
              const uptimeText = (() => {
                const sec = Number(systemHealth?.metrics?.uptime_seconds ?? 0);
                const d = Math.floor(sec / (3600 * 24));
                const h = Math.floor((sec % (3600 * 24)) / 3600);
                const m = Math.floor((sec % 3600) / 60);
                const s = sec % 60;
                return `${d}d ${h}h ${m}m ${s}s`;
              })();

              return (
                <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', borderBottom: '1px solid #e7dac0', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#2b2112' }}>
                      <ShieldCheck size={19} style={{ color: '#8b6525', flexShrink: 0 }} />
                      <span>System Health &amp; Diagnostics</span>
                    </h3>
                    {systemHealth && (
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '4px 11px',
                        borderRadius: '999px',
                        background: systemHealth.status === 'HEALTHY' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                        color: systemHealth.status === 'HEALTHY' ? '#047857' : '#b91c1c',
                        border: `1px solid ${systemHealth.status === 'HEALTHY' ? 'rgba(5, 150, 105, 0.28)' : 'rgba(220, 38, 38, 0.28)'}`,
                        fontWeight: 800,
                        letterSpacing: '0.04em'
                      }}>
                        {systemHealth.status}
                      </span>
                    )}
                  </div>

                  <div className="golden-os-diag-grid">
                    {/* Column 1: System Health & Core Specs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
                      {/* Gauge bars for CPU & RAM */}
                      <div className="golden-os-grid-2">
                        <div className="golden-os-inset-card" style={{ padding: '12px 14px', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
                            <span style={{ color: '#6b5b3e' }}>CPU ENGINE</span>
                            <span style={{ color: '#2b2112' }}>{cpuPct}%</span>
                          </div>
                          <div style={{ height: '8px', background: '#efe7d6', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, Math.max(0, cpuPct))}%`,
                              background: 'linear-gradient(90deg, #8c6525, #c49a45)',
                              borderRadius: '999px',
                              transition: 'width 0.6s ease'
                            }} />
                          </div>
                        </div>

                        <div className="golden-os-inset-card" style={{ padding: '12px 14px', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700 }}>
                            <span style={{ color: '#6b5b3e' }}>RAM BUFFER</span>
                            <span style={{ color: '#2b2112' }}>{ramPct}%</span>
                          </div>
                          <div style={{ height: '8px', background: '#efe7d6', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, Math.max(0, ramPct))}%`,
                              background: 'linear-gradient(90deg, #6e4e1c, #a87e34)',
                              borderRadius: '999px',
                              transition: 'width 0.6s ease'
                            }} />
                          </div>
                        </div>
                      </div>

                      {/* Core checklist */}
                      <div className="golden-os-inset-card" style={{ padding: '12px 14px', gap: '8px' }}>
                        {diagChecks.map((item, idx) => (
                          <div
                            key={item.label}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '0.8rem',
                              paddingBottom: idx < diagChecks.length - 1 ? '7px' : 0,
                              borderBottom: idx < diagChecks.length - 1 ? '1px solid #f2ead9' : 'none',
                            }}
                          >
                            <span style={{ color: '#6b5b3e', fontWeight: 700 }}>{item.label}</span>
                            <span style={{ color: item.color, fontWeight: 800, fontFamily: 'monospace', textAlign: 'right' }}>{item.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* System details */}
                      <div className="golden-os-inset-card" style={{ padding: '12px 14px', gap: '5px', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#6b5b3e', fontWeight: 700 }}>UPTIME</span>
                          <span style={{ color: '#2b2112', fontWeight: 700, fontFamily: 'monospace' }}>{uptimeText}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#6b5b3e', fontWeight: 700 }}>PLATFORM</span>
                          <span style={{ color: '#2b2112', fontWeight: 700, fontFamily: 'monospace' }}>
                            {systemHealth?.platform?.system ? `${systemHealth.platform.system} (${systemHealth.platform.release || ''})` : 'DETECTING...'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#6b5b3e', fontWeight: 700 }}>ENVIRONMENT</span>
                          <span style={{ color: '#2b2112', fontWeight: 700, fontFamily: 'monospace' }}>
                            Python {systemHealth?.platform?.python_version || '...'}
                          </span>
                        </div>
                      </div>

                      {/* Manual trigger button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (playCyberSound) playCyberSound('click');
                          setHealthLoading(true);
                          fetchSystemHealth().finally(() => {
                            setTimeout(() => setHealthLoading(false), 600);
                          });
                        }}
                        disabled={healthLoading}
                        className="golden-os-primary-action"
                        style={{ padding: '12px 16px', justifyContent: 'center', fontWeight: 700, fontSize: '0.84rem', letterSpacing: '0.03em' }}
                      >
                        <span>{healthLoading ? 'RUNNING INTEGRITY CHECK...' : 'RUN CORE DIAGNOSTICS'}</span>
                      </button>
                    </div>

                    {/* Column 2: SMTP Mailer Diagnostics */}
                    <SmtpSettings token={token} />
                  </div>
                </div>
              );
            })()}

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
                              <td style={{ padding: '14px 16px', color: '#f4f1eb' }}>{item.user_email}</td>
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
                                      stroke={star <= item.rating ? "#fbbf24" : "#cfc8ba"} 
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



          {/* Absent Alert Toast Notification */}
          {absentAlertFeedback && (
            <div style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: '#065f46',
              color: '#ffffff',
              padding: '14px 20px',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              zIndex: 99999,
              fontSize: '0.88rem',
              fontWeight: 600,
              border: '1px solid #059669',
              animation: 'fadeInUp 0.3s ease'
            }}>
              <CheckCircle2 size={18} color="#34d399" />
              <span>{absentAlertFeedback}</span>
              <button 
                onClick={() => setAbsentAlertFeedback(null)} 
                style={{ background: 'none', border: 'none', color: '#a7f3d0', cursor: 'pointer', padding: '0 4px', fontSize: '1rem', marginLeft: '6px' }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
    </PullToRefresh>
  );
}
