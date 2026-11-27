import { useState, useMemo } from 'react';
import { BookOpen, Calendar, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';
import {
  normalizeToIsoDate,
  isoToDmyDate,
  extractPeriodNumber,
  shortPeriodBadge,
  compareSessionsNewestFirst,
  getInitials,
} from '../../utils/attendanceDateUtils';

const PERIOD_OPTIONS = [
  { value: 'Period 1', label: 'Period 1 (09:00 - 10:00 AM)' },
  { value: 'Period 2', label: 'Period 2 (10:00 - 11:00 AM)' },
  { value: 'Period 3', label: 'Period 3 (11:00 - 12:00 PM)' },
  { value: 'Period 4', label: 'Period 4 (12:00 - 01:00 PM)' },
  { value: 'Period 5', label: 'Period 5 (01:00 - 02:00 PM)' },
  { value: 'Period 6', label: 'Period 6 (02:00 - 03:00 PM)' },
  { value: 'Period 7', label: 'Period 7 (03:00 - 04:00 PM)' },
  { value: 'Period 8', label: 'Period 8 (04:00 - 05:00 PM)' },
];

const buildSessionKey = (session) =>
  session?.subject_id != null
    ? `${session.date}|${session.period}|${session.subject_id}`
    : `${session?.date}|${session?.period}`;

export default function SessionHistoryView({
  selectedHistoryDept,
  setSelectedHistoryDept,
  selectedHistorySubjectId,
  setSelectedHistorySubjectId,
  historyFilterDate,
  setHistoryFilterDate,
  historyFilterPeriod,
  setHistoryFilterPeriod,
  sessionHistory = [],
  subjects = [],
  toggleStudentSessionAttendance,
  shiftDate,
  getPeriodSlotLabel,
  routeSessionKey = null,
  setRouteSessionKey,
  onCloseSubView,
  onRefresh,
}) {
  const { userRole, currentUser } = useAuth();
  const { playCyberSound } = useUI();

  const [localSessionKey, setLocalSessionKey] = useState(null);
  const activeSessionKey = setRouteSessionKey ? routeSessionKey : localSessionKey;
  const setActiveSessionKey = setRouteSessionKey || setLocalSessionKey;

  const [detailSearch, setDetailSearch] = useState('');
  const [detailStatusFilter, setDetailStatusFilter] = useState('all');
  const [detailMode, setDetailMode] = useState('list');
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  const departmentsList = useMemo(
    () => [...new Set(subjects.map(s => s.department).filter(Boolean))],
    [subjects]
  );

  const filteredSubjectsForDept = useMemo(
    () => subjects.filter(s => !selectedHistoryDept || s.department === selectedHistoryDept),
    [subjects, selectedHistoryDept]
  );

  // Instant 0ms client-side filtering across dates and periods (newest date first, P1..P8 within date)
  const filteredSessions = useMemo(() => {
    const targetIso = normalizeToIsoDate(historyFilterDate);
    const targetPeriodNum = historyFilterPeriod ? extractPeriodNumber(historyFilterPeriod) : null;

    return [...sessionHistory]
      .filter(sess => {
        const matchesDate = !targetIso || normalizeToIsoDate(sess.date) === targetIso;
        const matchesPeriod =
          !historyFilterPeriod ||
          sess.period === historyFilterPeriod ||
          (targetPeriodNum != null && targetPeriodNum < 99 && extractPeriodNumber(sess.period) === targetPeriodNum);
        return matchesDate && matchesPeriod;
      })
      .sort(compareSessionsNewestFirst);
  }, [sessionHistory, historyFilterDate, historyFilterPeriod]);

  // Distinct periods recorded on the currently selected date (so quick period pills highlight active slots)
  const sessionsOnSelectedDate = useMemo(() => {
    const targetIso = normalizeToIsoDate(historyFilterDate);
    return sessionHistory.filter(sess => !targetIso || normalizeToIsoDate(sess.date) === targetIso);
  }, [sessionHistory, historyFilterDate]);

  const recordedPeriodSet = useMemo(
    () => new Set(sessionsOnSelectedDate.map(s => extractPeriodNumber(s.period)).filter(n => n < 99)),
    [sessionsOnSelectedDate]
  );

  const selectedSession = useMemo(() => {
    if (!activeSessionKey) return null;
    return (
      sessionHistory.find(
        s => buildSessionKey(s) === activeSessionKey || `${s.date}|${s.period}` === activeSessionKey
      ) || null
    );
  }, [sessionHistory, activeSessionKey]);

  const openSessionDetail = (session) => {
    if (playCyberSound) playCyberSound('click');
    setDetailSearch('');
    setDetailStatusFilter('all');
    setExpandedStudentId(null);
    setActiveSessionKey(buildSessionKey(session));
  };

  const closeDetail = () => {
    if (onCloseSubView) {
      onCloseSubView();
    } else {
      setActiveSessionKey(null);
    }
  };

  /* ===== DEDICATED SESSION DETAIL PAGE ===== */
  if (activeSessionKey) {
    if (!selectedSession) {
      return (
        <div key="sh-detail-empty" className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
          <div className="golden-os-window" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <Calendar size={28} style={{ color: '#9c8b6e' }} />
            <span style={{ fontWeight: 700, color: '#2b2112' }}>No session details found for this slot.</span>
            <button type="button" onClick={closeDetail} className="golden-os-feedback-filter-btn" style={{ padding: '8px 16px', borderRadius: '10px' }}>
              Back to Sessions
            </button>
          </div>
        </div>
      );
    }

    const totalCount = (selectedSession.present_count || 0) + (selectedSession.absent_count || 0);
    const fillRate = totalCount > 0 ? Math.round((selectedSession.present_count / totalCount) * 100) : 0;
    const studentsList = Array.isArray(selectedSession.students) ? selectedSession.students : [];
    const q = detailSearch.trim().toLowerCase();
    const visibleStudents = studentsList.filter(st => {
      const matchQuery = !q ||
        String(st.name || '').toLowerCase().includes(q) ||
        String(st.roll || '').toLowerCase().includes(q);
      const matchStatus = detailStatusFilter === 'all' ||
        (detailStatusFilter === 'present' && st.status === 'Present') ||
        (detailStatusFilter === 'absent' && st.status === 'Absent');
      return matchQuery && matchStatus;
    });

    return (
      <div key="sh-detail-view" className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
          {/* KPI Strip */}
          <div className="golden-os-kpi-strip">
            <div className="golden-os-kpi-tile">
              <span className="golden-os-kpi-value" style={{ color: '#047857' }}>{selectedSession.present_count || 0}</span>
              <span className="golden-os-kpi-label">Present</span>
            </div>
            <div className="golden-os-kpi-tile">
              <span className="golden-os-kpi-value" style={{ color: '#dc2626' }}>{selectedSession.absent_count || 0}</span>
              <span className="golden-os-kpi-label">Absent</span>
            </div>
            <div className="golden-os-kpi-tile">
              <span className="golden-os-kpi-value" style={{ color: '#6e4e1c' }}>{fillRate}%</span>
              <span className="golden-os-kpi-label">Presence</span>
            </div>
          </div>

          {/* Session Metadata Card */}
          <div className="golden-os-form-section" style={{ gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', gap: '10px' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Subject</span>
              <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>
                {selectedSession.subject_name || 'Class Session'}{selectedSession.subject_code ? ` (${selectedSession.subject_code})` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', gap: '10px' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Date &amp; Slot</span>
              <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>
                {selectedSession.date} · {selectedSession.period_label || (getPeriodSlotLabel ? getPeriodSlotLabel(selectedSession.period) : selectedSession.period)}
              </span>
            </div>
          </div>

          {/* Search & Mode Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="search"
                className="form-input"
                aria-label="Search student in session"
                placeholder="Search student name or roll..."
                value={detailSearch}
                onChange={e => setDetailSearch(e.target.value)}
                style={{ paddingLeft: '36px', background: '#ffffff', width: '100%', boxSizing: 'border-box' }}
              />
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: 'All' },
                  { key: 'present', label: 'Present' },
                  { key: 'absent', label: 'Absent' },
                ].map(st => {
                  const active = detailStatusFilter === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => setDetailStatusFilter(st.key)}
                      style={{
                        padding: '5px 11px',
                        borderRadius: '999px',
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: active ? '1px solid #785927' : '1px solid #e4d8bd',
                        background: active ? '#785927' : '#ffffff',
                        color: active ? '#ffffff' : '#6b5b3e',
                      }}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '4px', background: '#f2ead9', padding: '3px', borderRadius: '10px' }}>
                {[
                  { key: 'list', label: 'List' },
                  { key: 'map', label: 'Grid' },
                ].map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setDetailMode(m.key)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '7px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      background: detailMode === m.key ? '#785927' : 'transparent',
                      color: detailMode === m.key ? '#ffffff' : '#6b5b3e',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Student List / Grid */}
          {visibleStudents.length === 0 ? (
            <div className="golden-os-inset-card" style={{ padding: '28px 16px', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: '0.86rem', color: '#6b5b3e', fontWeight: 600 }}>No matching students in this session.</span>
            </div>
          ) : detailMode === 'list' ? (
            <div className="golden-os-list-shell">
              {visibleStudents.map(st => {
                const isPresent = st.status === 'Present';
                const isOpen = expandedStudentId === st.id;
                return (
                  <div key={st.id} style={{ borderBottom: '1px solid #efe5d1' }}>
                    <div
                      className="golden-os-list-row"
                      style={{ borderBottom: 'none', cursor: 'pointer' }}
                      onClick={() => setExpandedStudentId(isOpen ? null : st.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <div className="golden-os-avatar">{getInitials(st.name)}</div>
                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {st.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (playCyberSound) playCyberSound('click');
                          toggleStudentSessionAttendance(st.id, st.status, selectedSession.date, selectedSession.period, selectedSession.subject_id);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0,
                          background: isPresent ? 'rgba(5, 150, 105, 0.1)' : '#fef2f2',
                          color: isPresent ? '#047857' : '#dc2626',
                          border: `1px solid ${isPresent ? 'rgba(5, 150, 105, 0.25)' : '#fecaca'}`,
                        }}
                        title="Tap to toggle attendance"
                      >
                        {st.status}
                      </button>
                    </div>
                    {isOpen && (
                      <div style={{ padding: '0 16px 12px 66px', fontSize: '0.78rem', color: '#6b5b3e', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        <span>Roll: <strong style={{ color: '#25231f' }}>{st.roll || '—'}</strong></span>
                        <span>Dept: <strong style={{ color: '#25231f' }}>{st.dep || '—'}</strong></span>
                        {st.semester && <span>Sem: <strong style={{ color: '#25231f' }}>{st.semester}</strong></span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
              {visibleStudents.map(st => {
                const isPresent = st.status === 'Present';
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      if (playCyberSound) playCyberSound('click');
                      toggleStudentSessionAttendance(st.id, st.status, selectedSession.date, selectedSession.period, selectedSession.subject_id);
                    }}
                    className="golden-os-inset-card"
                    style={{
                      padding: '12px 8px',
                      alignItems: 'center',
                      textAlign: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      borderColor: isPresent ? '#a7f3d0' : '#fecaca',
                      background: '#ffffff',
                    }}
                  >
                    <div
                      className="golden-os-avatar"
                      style={{
                        width: '32px',
                        height: '32px',
                        fontSize: '0.74rem',
                        background: isPresent ? '#ecfdf5' : '#fef2f2',
                        borderColor: isPresent ? '#a7f3d0' : '#fecaca',
                        color: isPresent ? '#047857' : '#dc2626',
                      }}
                    >
                      {getInitials(st.name)}
                    </div>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#25231f', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {st.name}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#6b5b3e', fontFamily: 'monospace' }}>{st.roll}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ===== MAIN GOLDEN GATE SESSION HISTORY VIEW (Instant 0ms Filters + All Periods + Date Selector) ===== */
  const avgPresence = filteredSessions.length > 0
    ? Math.round(filteredSessions.reduce((acc, s) => acc + ((s.present_count / ((s.present_count + s.absent_count) || 1)) * 100), 0) / filteredSessions.length)
    : 0;
  let busiestSlot = '--';
  if (filteredSessions.length > 0) {
    const slotCounts = filteredSessions.reduce((acc, s) => {
      acc[s.period] = (acc[s.period] || 0) + (s.present_count || 0);
      return acc;
    }, {});
    const bestKey = Object.keys(slotCounts).reduce((a, b) => (slotCounts[a] > slotCounts[b] ? a : b));
    busiestSlot = shortPeriodBadge(bestKey);
  }

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div key="sh-list-view" className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
        {/* Organized Date & Class Filter Section */}
        <div className="golden-os-form-section" style={{ gap: '10px' }}>
          {/* Row 1: Date Picker Bar + All Dates Toggle + Refresh */}
          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: 0 }}>
                <Calendar size={12} color="#785927" />
                <span>Date</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    setHistoryFilterDate(historyFilterDate ? '' : todayIso);
                  }}
                  style={{
                    padding: '3px 9px',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: !historyFilterDate ? '1px solid #785927' : '1px solid #e4d8bd',
                    background: !historyFilterDate ? '#785927' : '#ffffff',
                    color: !historyFilterDate ? '#ffffff' : '#6b5b3e',
                  }}
                >
                  {historyFilterDate ? 'All Dates' : 'Today'}
                </button>
                {onRefresh && (
                  <button
                    type="button"
                    aria-label="Refresh session history"
                    onClick={() => {
                      if (playCyberSound) playCyberSound('click');
                      onRefresh();
                    }}
                    className="golden-os-feedback-filter-btn"
                    style={{ width: '28px', height: '26px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}
                    title="Refresh sessions"
                  >
                    <RefreshCw size={13} />
                  </button>
                )}
              </div>
            </div>
            <div className="date-picker-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
              <button
                type="button"
                aria-label="Previous day"
                onClick={() => { if (playCyberSound) playCyberSound('click'); shiftDate(historyFilterDate, -1, setHistoryFilterDate); }}
                className="golden-os-feedback-filter-btn"
                style={{ width: '36px', minWidth: '36px', height: '40px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
              >
                <ChevronLeft size={16} />
              </button>
              <input
                type="date"
                className="form-input flex-input"
                aria-label="Session date"
                value={historyFilterDate}
                onChange={e => setHistoryFilterDate(e.target.value)}
                style={{ flex: 1, minWidth: 0, background: '#ffffff', height: '40px', padding: '0 8px', fontSize: '0.84rem', margin: 0 }}
              />
              <button
                type="button"
                aria-label="Next day"
                onClick={() => { if (playCyberSound) playCyberSound('click'); shiftDate(historyFilterDate, 1, setHistoryFilterDate); }}
                className="golden-os-feedback-filter-btn"
                style={{ width: '36px', minWidth: '36px', height: '40px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Row 2: Branch & Subject (2-col responsive) */}
          {userRole === 'admin' ? (
            <div className="golden-os-fields-2" style={{ gap: '8px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Branch</label>
                <select
                  className="form-input"
                  value={selectedHistoryDept}
                  onChange={e => setSelectedHistoryDept(e.target.value)}
                  style={{ background: '#ffffff', height: '40px' }}
                >
                  {departmentsList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Subject</label>
                <select
                  className="form-input"
                  value={selectedHistorySubjectId}
                  onChange={e => setSelectedHistorySubjectId(e.target.value)}
                  style={{ background: '#ffffff', height: '40px' }}
                >
                  {filteredSubjectsForDept.map(s => (
                    <option key={s.id} value={s.id.toString()}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                  {filteredSubjectsForDept.length > 1 && (
                    <option value="all">All Subjects ({selectedHistoryDept || 'Branch'})</option>
                  )}
                </select>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '9px 12px',
              background: '#faf5ea',
              border: '1px solid #e7dac0',
              borderRadius: '10px',
              color: '#6e4e1c',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <BookOpen size={14} />
              <span>{currentUser?.details?.subject_name || 'Assigned Subject'} ({currentUser?.details?.subject_code || 'N/A'})</span>
            </div>
          )}

          {/* Row 3: Instant 0ms Period Slot Selector + Quick Pills */}
          <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="form-label" style={{ margin: 0 }}>Period</label>
            <select
              className="form-input"
              aria-label="Filter by period"
              value={historyFilterPeriod}
              onChange={e => setHistoryFilterPeriod(e.target.value)}
              style={{ background: '#ffffff', height: '40px' }}
            >
              <option value="">All Periods (Full Day)</option>
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  setHistoryFilterPeriod('');
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: !historyFilterPeriod ? '1px solid #785927' : '1px solid #e4d8bd',
                  background: !historyFilterPeriod ? '#785927' : '#ffffff',
                  color: !historyFilterPeriod ? '#ffffff' : '#6b5b3e',
                }}
              >
                All Periods
              </button>
              {PERIOD_OPTIONS.map((opt, i) => {
                const pNum = i + 1;
                const active = historyFilterPeriod === opt.value || extractPeriodNumber(historyFilterPeriod) === pNum;
                const hasData = recordedPeriodSet.has(pNum);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (playCyberSound) playCyberSound('click');
                      setHistoryFilterPeriod(active ? '' : opt.value);
                    }}
                    style={{
                      padding: '4px 9px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: active ? '1px solid #785927' : hasData ? '1px solid #cfa963' : '1px solid #e4d8bd',
                      background: active ? '#785927' : hasData ? '#faf3e3' : '#ffffff',
                      color: active ? '#ffffff' : hasData ? '#6e4e1c' : '#8a7b63',
                    }}
                  >
                    P{pNum}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="golden-os-inset-card" style={{ padding: '28px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <Calendar size={28} style={{ color: '#9c8b6e' }} />
            <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.9rem' }}>
              {historyFilterPeriod
                ? `No sessions for ${getPeriodSlotLabel ? getPeriodSlotLabel(historyFilterPeriod) : historyFilterPeriod}`
                : (historyFilterDate
                  ? `No class sessions recorded on ${isoToDmyDate(historyFilterDate)}`
                  : 'No class sessions recorded yet')}
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '4px' }}>
              {historyFilterPeriod && (
                <button
                  type="button"
                  onClick={() => { if (playCyberSound) playCyberSound('click'); setHistoryFilterPeriod(''); }}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '0.8rem' }}
                >
                  Show All Periods
                </button>
              )}
              {historyFilterDate && sessionHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => { if (playCyberSound) playCyberSound('click'); setHistoryFilterDate(''); }}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '0.8rem' }}
                >
                  View All Dates ({sessionHistory.length})
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="golden-os-kpi-strip">
              <div className="golden-os-kpi-tile">
                <span className="golden-os-kpi-value" style={{ color: '#6e4e1c' }}>{filteredSessions.length}</span>
                <span className="golden-os-kpi-label">Sessions</span>
              </div>
              <div className="golden-os-kpi-tile">
                <span className="golden-os-kpi-value" style={{ color: '#047857' }}>{avgPresence}%</span>
                <span className="golden-os-kpi-label">Avg Presence</span>
              </div>
              <div className="golden-os-kpi-tile">
                <span className="golden-os-kpi-value" style={{ color: '#4a3d28' }}>{busiestSlot}</span>
                <span className="golden-os-kpi-label">Peak Slot</span>
              </div>
            </div>

            <div className="golden-os-list-shell">
              {filteredSessions.map(session => {
                const sessionKey = buildSessionKey(session);
                const totalSt = (session.present_count || 0) + (session.absent_count || 0) || 1;
                const pct = Math.round(((session.present_count || 0) / totalSt) * 100);
                const showSubLine = !historyFilterDate || selectedHistorySubjectId === 'all';
                const subMeta = [
                  !historyFilterDate ? session.date : '',
                  session.subject_name ? `${session.subject_name}${session.subject_code ? ` (${session.subject_code})` : ''}` : '',
                ].filter(Boolean).join(' · ');

                return (
                  <button
                    key={sessionKey}
                    type="button"
                    className="golden-os-list-row"
                    onClick={() => openSessionDetail(session)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div className="golden-os-avatar">{shortPeriodBadge(session.period)}</div>
                      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: '#25231f',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {session.period_label || (getPeriodSlotLabel ? getPeriodSlotLabel(session.period) : session.period)}
                        </span>
                        {showSubLine && subMeta && (
                          <span style={{
                            fontSize: '0.73rem',
                            color: '#6b5b3e',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {subMeta}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '999px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        background: pct >= 75 ? 'rgba(5, 150, 105, 0.1)' : '#faf5ea',
                        color: pct >= 75 ? '#047857' : '#6e4e1c',
                        border: `1px solid ${pct >= 75 ? 'rgba(5, 150, 105, 0.25)' : '#dfcfaf'}`,
                      }}>
                        {session.present_count}P · {session.absent_count}A
                      </span>
                      <ChevronRight size={16} color="#8c734b" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
