import { useState } from 'react';
import { Layers, BookOpen, Calendar, Clock, CheckCircle2, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';

export default function SessionHistoryView({
  selectedHistoryDept,
  setSelectedHistoryDept,
  selectedHistorySubjectId,
  setSelectedHistorySubjectId,
  historyFilterDate,
  setHistoryFilterDate,
  historyFilterPeriod,
  setHistoryFilterPeriod,
  sessionHistory,
  subjects,
  toggleStudentSessionAttendance,
  shiftDate,
  getPeriodSlotLabel,
  isMobileView,
}) {
  const { userRole, currentUser } = useAuth();
  const { playCyberSound } = useUI();

  // Local UI state exclusive to Session History
  const [expandedSessions, setExpandedSessions] = useState({});
  const [sessionSearches, setSessionSearches] = useState({});
  const [sessionStatusFilters, setSessionStatusFilters] = useState({});
  const [sessionViewModes, setSessionViewModes] = useState({});
  const [hoveredStudentCard, setHoveredStudentCard] = useState(null);

  return (
    <div className="mobile-tab-panel session-history-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.6s ease both' }}>
      {/* Header select filters */}
      <div className="glass-panel hide-on-print" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'Outfit, sans-serif', margin: 0, textAlign: 'left' }}>
            Class Sessions Registers
          </h4>
          
          <div className="session-history-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
            {userRole === 'admin' ? (
              <>
                {/* Department Select */}
                <div className="form-group" style={{ margin: 0, minWidth: '200px', flex: '1 1 200px', textAlign: 'left' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                    <Layers size={12} style={{ color: '#00f2fe' }} /> Branch / Department
                  </label>
                  <select
                    className="form-input"
                    value={selectedHistoryDept}
                    onChange={e => setSelectedHistoryDept(e.target.value)}
                    style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'rgba(8, 12, 20, 0.4)' }}
                  >
                    {[...new Set(subjects.map(s => s.department))].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Subject Select */}
                <div className="form-group" style={{ margin: 0, minWidth: '220px', flex: '1 1 220px', textAlign: 'left' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                    <BookOpen size={12} style={{ color: '#00f2fe' }} /> Subject
                  </label>
                  <select
                    className="form-input"
                    value={selectedHistorySubjectId}
                    onChange={e => setSelectedHistorySubjectId(e.target.value)}
                    style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'rgba(8, 12, 20, 0.4)' }}
                  >
                    {subjects.filter(s => s.department === selectedHistoryDept).map(s => (
                      <option key={s.id} value={s.id.toString()}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              /* Teacher Info Card */
              <div style={{ 
                background: 'rgba(0, 242, 254, 0.06)', 
                border: '1px solid rgba(0, 242, 254, 0.15)', 
                borderRadius: '8px', 
                padding: '10px 16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                height: '42px',
                boxSizing: 'border-box'
              }}>
                <BookOpen size={14} style={{ color: '#00f2fe' }} />
                <span style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600 }}>
                  Subject: <strong style={{ color: '#00f2fe' }}>{currentUser?.details?.subject_name} ({currentUser?.details?.subject_code})</strong>
                </span>
              </div>
            )}

            {/* Date Picker */}
            <div className="form-group" style={{ margin: 0, minWidth: '160px', flex: '1 1 160px', textAlign: 'left' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <Calendar size={12} style={{ color: '#00f2fe' }} /> Date
              </label>
              <div className="date-picker-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                <button
                  type="button"
                  onClick={() => { playCyberSound('click'); shiftDate(historyFilterDate, -1, setHistoryFilterDate); }}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    padding: '0',
                    width: '38px',
                    minWidth: '38px',
                    maxWidth: '38px',
                    flex: '0 0 38px',
                    flexShrink: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    height: '42px',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                  title="Previous Day"
                >
                  ◀
                </button>
                <input
                  type="date"
                  className="form-input flex-input"
                  value={historyFilterDate}
                  onChange={e => setHistoryFilterDate(e.target.value)}
                  style={{ padding: '0 10px', fontSize: '0.85rem', background: 'rgba(8, 12, 20, 0.4)', height: '42px', margin: 0, flex: 1, minWidth: 0, boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => { playCyberSound('click'); shiftDate(historyFilterDate, 1, setHistoryFilterDate); }}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    padding: '0',
                    width: '38px',
                    minWidth: '38px',
                    maxWidth: '38px',
                    flex: '0 0 38px',
                    flexShrink: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    height: '42px',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                  title="Next Day"
                >
                  ▶
                </button>
              </div>
            </div>

            {/* Period Dropdown */}
            <div className="form-group" style={{ margin: 0, minWidth: '180px', flex: '1 1 180px', textAlign: 'left' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <Clock size={12} style={{ color: '#00f2fe' }} /> Period / Time Slot
              </label>
              <select
                className="form-input"
                value={historyFilterPeriod}
                onChange={e => setHistoryFilterPeriod(e.target.value)}
                style={{ padding: '10px 14px', fontSize: '0.85rem', background: 'rgba(8, 12, 20, 0.4)' }}
              >
                <option value="">All Periods (Full Day)</option>
                <option value="Period 1">Period 1 (09:00 - 10:00 AM)</option>
                <option value="Period 2">Period 2 (10:00 - 11:00 AM)</option>
                <option value="Period 3">Period 3 (11:00 - 12:00 PM)</option>
                <option value="Period 4">Period 4 (12:00 - 01:00 PM)</option>
                <option value="Period 5">Period 5 (01:00 - 02:00 PM)</option>
                <option value="Period 6">Period 6 (02:00 - 03:00 PM)</option>
                <option value="Period 7">Period 7 (03:00 - 04:00 PM)</option>
                <option value="Period 8">Period 8 (04:00 - 05:00 PM)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Session Accordions */}
      {sessionHistory.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <Calendar size={44} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: '16px' }} />
          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f1f5f9' }}>
            {historyFilterPeriod ? `No class sessions recorded yet for ${getPeriodSlotLabel(historyFilterPeriod)}.` : 'No class sessions recorded yet for this subject on this date.'}
          </p>
          <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
            {historyFilterPeriod ? 'Try selecting "All Periods" to view all sessions recorded on this day, or run the Live Scanner.' : 'Mark attendance using the Live Scanner to create a class session.'}
          </p>
          {historyFilterPeriod && (
            <button
              onClick={() => { playCyberSound('click'); setHistoryFilterPeriod(''); }}
              className="action-btn"
              style={{ marginTop: '16px', padding: '10px 20px', fontSize: '0.85rem', color: '#00f2fe', borderColor: 'rgba(0, 242, 254, 0.4)', borderRadius: '8px', cursor: 'pointer' }}
            >
              🔍 View All Periods for {historyFilterDate}
            </button>
          )}
        </div>
      ) : (() => {
        // Aggregate calculations
        const avgAttendanceRate = Math.round(
          sessionHistory.reduce((acc, s) => acc + (s.present_count / (s.present_count + s.absent_count || 1) * 100), 0) / sessionHistory.length
        );
        
        let busiestPeriod = "N/A";
        const periodCounts = sessionHistory.reduce((acc, s) => {
          acc[s.period] = (acc[s.period] || 0) + s.present_count;
          return acc;
        }, {});
        if (Object.keys(periodCounts).length > 0) {
          busiestPeriod = Object.keys(periodCounts).reduce((a, b) => periodCounts[a] > periodCounts[b] ? a : b);
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Session Efficiency Analyzer Panel */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div className="glass-panel metric-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--color-primary)' }}>
                <div className="metric-info">
                  <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Average Presence</h3>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{avgAttendanceRate}%</p>
                </div>
                <div style={{ position: 'relative', width: '38px', height: '38px' }}>
                  <svg width="38" height="38" viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#00f2fe" strokeWidth="3.5" strokeDasharray={`${avgAttendanceRate}, 100`} />
                  </svg>
                </div>
              </div>

              <div className="glass-panel metric-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--color-purple)' }}>
                <div className="metric-info">
                  <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Busiest Slot</h3>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{busiestPeriod}</p>
                </div>
                <div className="metric-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', width: '40px', height: '40px', borderRadius: '10px' }}>
                  <Clock size={18} />
                </div>
              </div>

              <div className="glass-panel metric-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--color-success)' }}>
                <div className="metric-info">
                  <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Recorded Sessions</h3>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{sessionHistory.length}</p>
                </div>
                <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '40px', height: '40px', borderRadius: '10px' }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>
            </div>

            {/* Sessions Accordions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sessionHistory.map((session) => {
                const sessionKey = `${session.date}-${session.period}`;
                const isExpanded = !!expandedSessions[sessionKey];
                const totalStudentsCount = session.present_count + session.absent_count || 1;
                const sessionFillRate = Math.round((session.present_count / totalStudentsCount) * 100);

                // Search, filter, and view local variables
                const sSearch = sessionSearches[sessionKey] || "";
                const sFilter = sessionStatusFilters[sessionKey] || "all";
                const sMode = sessionViewModes[sessionKey] || "manifest";

                const filteredStudents = session.students.filter(st => {
                  const matchesSearch = (st.name || '').toLowerCase().includes(sSearch.toLowerCase()) || (st.roll || '').toLowerCase().includes(sSearch.toLowerCase());
                  const matchesStatus = sFilter === 'all' || 
                    (sFilter === 'present' && st.status === 'Present') || 
                    (sFilter === 'absent' && st.status === 'Absent');
                  return matchesSearch && matchesStatus;
                });

                return (
                  <div 
                    key={sessionKey} 
                    className="glass-panel" 
                    style={{ 
                      overflow: 'hidden', 
                      border: isExpanded ? '1px solid rgba(0, 242, 254, 0.25)' : '1px solid rgba(255,255,255,0.05)',
                      boxShadow: isExpanded ? '0 10px 30px rgba(0,242,254,0.06)' : undefined,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {/* Accordion Header */}
                    <div 
                      onClick={() => {
                        playCyberSound('click');
                        setExpandedSessions(prev => ({ ...prev, [sessionKey]: !prev[sessionKey] }));
                      }}
                      className="session-accordion-header"
                      style={{ 
                        padding: '22px 28px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                        transition: 'background 0.3s'
                      }}
                    >
                      <div className="session-accordion-main">
                        {/* Circular Filling progress SVG */}
                        <div style={{ position: 'relative', width: '38px', height: '38px' }}>
                          <svg width="38" height="38" viewBox="0 0 36 36">
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={sessionFillRate >= 75 ? '#10b981' : sessionFillRate >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${sessionFillRate}, 100`} />
                          </svg>
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 'bold', color: '#fff' }}>
                            {sessionFillRate}%
                          </div>
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f9', fontFamily: 'Outfit, sans-serif' }}>
                            Session: {session.date.split('/').join(' / ')}
                          </h4>
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '2px', fontFamily: 'monospace' }}>
                            TIME SLOT: <span style={{ color: '#00f2fe', fontWeight: 600 }}>{session.period_label || getPeriodSlotLabel(session.period)}</span> | SUBJECT: <span style={{ color: '#c4b5fd', fontWeight: 600 }}>{session.subject_name || 'Class Subject'}</span> | ENROLLED: {totalStudentsCount}
                          </p>
                        </div>
                      </div>

                      <div className="session-accordion-stats">
                        <span style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '5px 12px', borderRadius: '20px', color: '#10b981', fontWeight: 700 }}>
                          P: {session.present_count}
                        </span>
                        <span style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '5px 12px', borderRadius: '20px', color: '#ef4444', fontWeight: 700 }}>
                          A: {session.absent_count}
                        </span>
                        <span style={{ 
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
                          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', 
                          color: 'var(--color-primary)',
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Accordion content */}
                    {isExpanded && (
                      <div style={{ 
                        borderTop: '1px solid rgba(255,255,255,0.05)', 
                        padding: '24px 28px', 
                        background: 'rgba(8, 12, 20, 0.3)',
                        animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        position: 'relative'
                      }}>
                        {/* Inner filters & controls */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '220px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                              <input 
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: '38px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', fontSize: '0.8rem', background: 'rgba(8, 12, 20, 0.4)' }}
                                placeholder="Search student in session..."
                                value={sSearch}
                                onChange={(e) => setSessionSearches(prev => ({ ...prev, [sessionKey]: e.target.value }))}
                              />
                              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Filter chips */}
                            <div style={{ display: 'flex', background: 'rgba(8, 12, 20, 0.5)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              {['all', 'present', 'absent'].map(status => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    playCyberSound('click');
                                    setSessionStatusFilters(prev => ({ ...prev, [sessionKey]: status }));
                                  }}
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '0.7rem',
                                    background: sFilter === status ? 'var(--color-primary)' : 'transparent',
                                    color: sFilter === status ? '#0d1323' : 'var(--color-text-muted)',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>

                            {/* Mode switcher */}
                            <div style={{ display: 'flex', background: 'rgba(8, 12, 20, 0.5)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                              <button
                                onClick={() => {
                                  playCyberSound('click');
                                  setSessionViewModes(prev => ({ ...prev, [sessionKey]: 'manifest' }));
                                }}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.7rem',
                                  background: sMode === 'manifest' ? 'var(--color-primary)' : 'transparent',
                                  color: sMode === 'manifest' ? '#0d1323' : 'var(--color-text-muted)',
                                  border: 'none',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  transition: 'all 0.2s'
                                }}
                              >
                                📋 LIST
                              </button>
                              <button
                                onClick={() => {
                                  playCyberSound('click');
                                  setSessionViewModes(prev => ({ ...prev, [sessionKey]: 'map' }));
                                }}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.7rem',
                                  background: sMode === 'map' ? 'var(--color-primary)' : 'transparent',
                                  color: sMode === 'map' ? '#0d1323' : 'var(--color-text-muted)',
                                  border: 'none',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  transition: 'all 0.2s'
                                }}
                              >
                                🎯 SEAT MAP
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Inner Views */}
                        {filteredStudents.length === 0 ? (
                          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                            No students match filters in this session.
                          </div>
                        ) : sMode === 'manifest' ? (
                          /* List Manifest */
                          isMobileView ? (
                            /* Mobile Detailed Grid Layout */
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
                              {filteredStudents.map((st) => {
                                const isPresent = st.status === 'Present';
                                const statusBg = isPresent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                                const statusBorder = isPresent ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)';
                                const statusColor = isPresent ? '#10b981' : '#ef4444';
                                
                                return (
                                  <div 
                                    key={st.id} 
                                    className="glass-panel" 
                                    style={{ 
                                      padding: '16px', 
                                      borderRadius: '12px', 
                                      border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '12px',
                                      background: 'rgba(13, 20, 35, 0.4)'
                                    }}
                                  >
                                    {/* Name & Status */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{st.name}</div>
                                      <button 
                                        onClick={() => {
                                          playCyberSound('click');
                                          toggleStudentSessionAttendance(st.id, st.status, session.date, session.period);
                                        }}
                                        style={{ 
                                          padding: '4px 12px', 
                                          borderRadius: '50px', 
                                          fontSize: '0.65rem', 
                                          fontWeight: 700,
                                          background: statusBg,
                                          border: statusBorder,
                                          color: statusColor,
                                          cursor: 'pointer',
                                          outline: 'none',
                                          transition: 'all 0.2s',
                                          textTransform: 'uppercase'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1.0)'; }}
                                      >
                                        {st.status.toUpperCase()}
                                      </button>
                                    </div>
                                    
                                    {/* Roll No */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                      <span style={{ color: 'var(--color-text-muted)' }}>Roll No:</span>
                                      <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{st.roll}</span>
                                    </div>
                                    
                                    {/* Branch & Semester */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                      <span style={{ color: 'var(--color-text-muted)' }}>Dept / Sem:</span>
                                      <span style={{ color: '#f1f5f9' }}>{st.dep} (Sem {st.semester})</span>
                                    </div>
                                    
                                    {/* Email */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '8px' }}>
                                      <span style={{ color: 'var(--color-text-muted)' }}>Email:</span>
                                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{st.email}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            /* Desktop Table Layout */
                            <div className="table-container" style={{ margin: 0 }}>
                              <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'var(--color-text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Roll No</th>
                                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Student Name</th>
                                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Branch</th>
                                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Semester</th>
                                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Email</th>
                                    <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredStudents.map((st) => {
                                    const isPresent = st.status === 'Present';
                                    const statusBg = isPresent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
                                    const statusBorder = isPresent ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)';
                                    const statusColor = isPresent ? '#10b981' : '#ef4444';
                                    return (
                                      <tr key={st.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#f1f5f9' }}>
                                        <td style={{ padding: '12px 12px', fontWeight: 700, color: '#fff' }}>{st.roll}</td>
                                        <td style={{ padding: '12px 12px', fontWeight: 500 }}>{st.name}</td>
                                        <td style={{ padding: '12px 12px', color: 'var(--color-text-muted)' }}>{st.dep}</td>
                                        <td style={{ padding: '12px 12px', color: 'var(--color-text-muted)' }}>{st.semester}</td>
                                        <td style={{ padding: '12px 12px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{st.email}</td>
                                        <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                                          <button 
                                            onClick={() => {
                                              playCyberSound('click');
                                              toggleStudentSessionAttendance(st.id, st.status, session.date, session.period);
                                            }}
                                            style={{ 
                                              padding: '4px 12px', 
                                              borderRadius: '50px', 
                                              fontSize: '0.65rem', 
                                              fontWeight: 700,
                                              background: statusBg,
                                              border: statusBorder,
                                              color: statusColor,
                                              cursor: 'pointer',
                                              outline: 'none',
                                              transition: 'all 0.2s',
                                              textTransform: 'uppercase'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1.0)'; }}
                                          >
                                            {st.status.toUpperCase()}
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )
                        ) : (
                          /* Tactical Seating Grid Map */
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '16px', marginTop: '16px' }}>
                            {filteredStudents.map((st) => {
                              const isPresent = st.status === 'Present';
                              const cellColor = isPresent ? '#10b981' : '#ef4444';
                              const bgLight = isPresent ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)';
                              const borderLight = isPresent ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                              
                              return (
                                <div
                                  key={st.id}
                                  onMouseEnter={() => setHoveredStudentCard(st)}
                                  onMouseLeave={() => setHoveredStudentCard(null)}
                                  onClick={() => {
                                    playCyberSound('click');
                                    toggleStudentSessionAttendance(st.id, st.status, session.date, session.period);
                                  }}
                                  style={{
                                    background: bgLight,
                                    border: `1px solid ${borderLight}`,
                                    borderRadius: '10px',
                                    padding: '16px 12px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                  className="student-grid-tile"
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor = cellColor;
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${isPresent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}`;
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor = borderLight;
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                >
                                  <div style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '50%',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    color: cellColor
                                  }}>
                                    {st.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>{st.name}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>{st.roll}</div>
                                  </div>
                                  <div style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: cellColor,
                                    boxShadow: `0 0 6px ${cellColor}`
                                  }} />
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Tooltip HUD inside panel */}
                        {hoveredStudentCard && (
                          <div className="glass-panel" style={{
                            position: 'absolute',
                            bottom: '15px',
                            right: '20px',
                            width: '240px',
                            padding: '12px 16px',
                            background: 'rgba(8, 12, 20, 0.95)',
                            border: `1px solid ${hoveredStudentCard.status === 'Present' ? '#10b981' : '#ef4444'}`,
                            boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
                            borderRadius: '8px',
                            zIndex: 10,
                            animation: 'fadeInUp 0.15s ease',
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            textAlign: 'left'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px', marginBottom: '6px' }}>
                              <strong style={{ color: '#fff' }}>STUDENT INFO</strong>
                              <span style={{ color: hoveredStudentCard.status === 'Present' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{hoveredStudentCard.status.toUpperCase()}</span>
                            </div>
                            <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>NAME: <span style={{ color: '#fff' }}>{hoveredStudentCard.name}</span></div>
                            <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>ROLL: <span style={{ color: '#fff' }}>{hoveredStudentCard.roll}</span></div>
                            <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>DEPT: <span style={{ color: '#fff' }}>{hoveredStudentCard.dep}</span></div>
                            <div style={{ color: 'var(--color-text-muted)', marginBottom: '2px' }}>SEMESTER: <span style={{ color: '#fff' }}>{hoveredStudentCard.semester}</span></div>
                            <div style={{ color: 'var(--color-text-muted)' }}>EMAIL: <span style={{ color: '#fff' }}>{hoveredStudentCard.email}</span></div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
