import { useState, useMemo } from 'react';
import {
  Play,
  Square,
  Camera,
  UserX,
  Bell,
  Edit3,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { t } from '../utils/i18n';
import { getInitials } from '../utils/attendanceDateUtils';

export default function TodaySessionHub({
  teacherName,
  subjects = [],
  schedules = [],
  logs = [],
  students = [],
  sessionActive,
  onStartSession,
  onEndSession,
  onOpenScanner,
  onOpenManualAttendance,
  onSendAbsenteeAlerts,
  lang = 'en',
  onNavigateTab,
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('Period 1');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [lastEndedSummary, setLastEndedSummary] = useState(null);

  const safeSubjects = useMemo(() => (Array.isArray(subjects) ? subjects : []), [subjects]);
  const safeSchedules = useMemo(() => (Array.isArray(schedules) ? schedules : []), [schedules]);
  const safeLogs = useMemo(() => (Array.isArray(logs) ? logs : []), [logs]);
  const safeStudents = useMemo(() => (Array.isArray(students) ? students : []), [students]);

  const todayDayName = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }, []);

  const todayFormattedDate = useMemo(() => {
    return new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }, [lang]);

  const todaySchedule = useMemo(() => {
    return safeSchedules.filter(s => {
      const matchDay = (s.day_of_week || '').toLowerCase() === todayDayName.toLowerCase();
      const isMySubject = safeSubjects.some(sub => sub.id === s.subject_id);
      return matchDay && isMySubject;
    });
  }, [safeSchedules, todayDayName, safeSubjects]);

  const effectiveSubjectId = useMemo(() => {
    if (selectedSubjectId && safeSubjects.some(s => String(s.id) === String(selectedSubjectId))) {
      return selectedSubjectId;
    }
    return safeSubjects.length > 0 ? String(safeSubjects[0].id) : '';
  }, [selectedSubjectId, safeSubjects]);

  const activeSubject = useMemo(() => {
    return safeSubjects.find(s => String(s.id) === String(effectiveSubjectId)) || safeSubjects[0] || null;
  }, [safeSubjects, effectiveSubjectId]);

  const handlePeriodClick = (p) => {
    setSelectedPeriod(p);
    const pNum = parseInt(p.replace(/\D/g, ''), 10);
    const periodStartTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
    const targetHour = periodStartTimes[pNum - 1] ? parseInt(periodStartTimes[pNum - 1].split(':')[0], 10) : null;

    if (targetHour !== null && todaySchedule.length > 0) {
      const match = todaySchedule.find(sch => {
        const hour = parseInt((sch.start_time || '').split(':')[0], 10);
        return hour === targetHour;
      });
      if (match && match.subject_id) {
        setSelectedSubjectId(String(match.subject_id));
      }
    }
  };

  const enrolledStudents = useMemo(() => {
    if (safeStudents.length === 0) return [];
    if (!activeSubject || !activeSubject.department) return safeStudents;

    const subDept = String(activeSubject.department).trim().toLowerCase();
    const matches = safeStudents.filter(s => {
      const sDept = String(s.dep || s.department || '').trim().toLowerCase();
      return sDept && (sDept === subDept || subDept.includes(sDept) || sDept.includes(subDept));
    });

    return matches.length > 0 ? matches : safeStudents;
  }, [safeStudents, activeSubject]);

  const todayLogs = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-GB');
    const todayStrIso = new Date().toISOString().split('T')[0];
    return safeLogs.filter(l => {
      const logDate = l.date || '';
      const dateMatch = logDate === todayStr || logDate === todayStrIso;
      if (!dateMatch) return false;
      if (l.period && selectedPeriod) {
        return String(l.period).toLowerCase() === String(selectedPeriod).toLowerCase();
      }
      return true;
    });
  }, [safeLogs, selectedPeriod]);

  const presentRolls = useMemo(() => {
    const set = new Set();
    todayLogs.forEach(l => {
      if (l.roll) set.add(String(l.roll).toLowerCase());
      if (l.student_id) set.add(String(l.student_id).toLowerCase());
    });
    return set;
  }, [todayLogs]);

  const displayPresentCount = Math.min(presentRolls.size, enrolledStudents.length || presentRolls.size);
  const displayAbsentCount = Math.max(0, (enrolledStudents.length || presentRolls.size) - displayPresentCount);

  const absentStudents = useMemo(() => {
    return enrolledStudents.filter(s => !presentRolls.has(String(s.roll || '').toLowerCase()));
  }, [enrolledStudents, presentRolls]);

  const handleEndSessionClick = () => {
    setLastEndedSummary({
      subjectName: activeSubject?.name || 'Class Session',
      period: selectedPeriod,
      totalEnrolled: enrolledStudents.length,
      presentCount: displayPresentCount,
      absentList: absentStudents.slice(0, 15),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setShowSummaryModal(true);
    if (onEndSession) onEndSession();
  };

  return (
    <div className="today-session-hub" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* ===== 1. FACULTY HOME WELCOME CARD (GOLDEN GATE IDENTITY) ===== */}
      <div
        className="golden-os-window"
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'linear-gradient(155deg, #fffdf8 0%, #f6ecd5 100%)',
          border: '1.5px solid #dcc89b',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <div
            className="golden-os-avatar"
            style={{
              width: '44px',
              height: '44px',
              fontSize: '0.95rem',
              background: 'linear-gradient(135deg, #785927, #5e441b)',
              color: '#fffdf8',
              borderColor: '#785927',
            }}
          >
            {getInitials(teacherName, 'TR')}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#785927' }}>
              Faculty Home · {todayFormattedDate}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {teacherName || t('teacher_hub', lang)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#5c4b30', fontWeight: 600, marginTop: '1px' }}>
              {safeSubjects.length > 0
                ? `${safeSubjects.length} assigned subject${safeSubjects.length === 1 ? '' : 's'} · ${enrolledStudents.length} students`
                : 'Faculty workspace ready'}
            </div>
          </div>
        </div>
      </div>

      {/* ===== 2. ACTIVE SESSION CALLOUT OR QUICK SESSION LAUNCHER ===== */}
      {sessionActive ? (
        <div
          className="golden-os-window"
          style={{
            padding: '16px',
            border: '1.5px solid #10b981',
            background: 'linear-gradient(155deg, #f0fdf4 0%, #fffdf8 100%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="golden-os-avatar"
              style={{ width: '42px', height: '42px', background: '#dcfce7', borderColor: '#86efac', color: '#047857' }}
            >
              <Camera size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#065f46' }}>
                {t('session_live', lang)} · {selectedPeriod}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: '2px' }}>
                {activeSubject?.name || 'Active Class'} · {presentRolls.size} {t('marked_present', lang)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={onOpenScanner}
              style={{
                padding: '10px 12px',
                borderRadius: '11px',
                border: 'none',
                background: 'linear-gradient(135deg, #785927, #5e441b)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Camera size={15} />
              <span>{t('open_scanner', lang)}</span>
            </button>

            <button
              type="button"
              onClick={handleEndSessionClick}
              style={{
                padding: '10px 12px',
                borderRadius: '11px',
                border: 'none',
                background: '#dc2626',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Square size={14} />
              <span>{t('end_session', lang)}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span className="golden-os-field-label" style={{ marginBottom: 0 }}>Take Class Attendance</span>
              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#785927' }}>{selectedPeriod}</span>
            </div>

            {/* Clean Golden Gate Period Selector Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                width: '100%',
              }}
            >
              {['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6'].map(p => {
                const isSelected = selectedPeriod === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePeriodClick(p)}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid #785927' : '1px solid #dfd0ae',
                      background: isSelected ? 'linear-gradient(135deg, #785927, #684c20)' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#5c4b30',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      width: '100%',
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Subject / Course Dropdown or Friendly Guidance */}
            <div>
              <label className="golden-os-field-label">
                {lang === 'hi' ? 'विषय चुनें' : 'Subject / Course'}
              </label>
              {safeSubjects.length > 0 ? (
                <select
                  value={effectiveSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="golden-os-input"
                  style={{ fontWeight: 700 }}
                >
                  {safeSubjects.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name || sub.subject_name}{sub.code ? ` (${sub.code})` : ''} · {sub.department || 'All'}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  className="golden-os-inset-card"
                  style={{
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    fontSize: '0.78rem',
                    color: '#5c4b30',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    <BookOpen size={15} color="#785927" style={{ flexShrink: 0 }} />
                    <span>No subject assigned to your account yet</span>
                  </span>
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('calendar')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#785927',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      <Calendar size={13} />
                      <span>Schedule</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Compact Unified Single-Bar Class Snapshot (Zero Chunky Boxes) */}
            <div
              className="golden-os-inset-card"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                textAlign: 'center',
                padding: '10px 8px',
              }}
            >
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#25231f' }}>{enrolledStudents.length}</div>
                <div style={{ fontSize: '0.66rem', color: '#6b5b3e', fontWeight: 700 }}>{t('total_enrolled', lang)}</div>
              </div>
              <div style={{ borderLeft: '1px solid #eadfcb' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#047857' }}>{displayPresentCount}</div>
                <div style={{ fontSize: '0.66rem', color: '#6b5b3e', fontWeight: 700 }}>{t('marked_present', lang)}</div>
              </div>
              <div style={{ borderLeft: '1px solid #eadfcb' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: displayAbsentCount > 0 ? '#b91c1c' : '#25231f' }}>{displayAbsentCount}</div>
                <div style={{ fontSize: '0.66rem', color: '#6b5b3e', fontWeight: 700 }}>{t('absent_today', lang)}</div>
              </div>
            </div>

            {/* Clean Primary & Secondary Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  if (onStartSession) onStartSession(effectiveSubjectId, selectedPeriod);
                  if (onOpenScanner) onOpenScanner();
                }}
                style={{
                  width: '100%',
                  padding: '13px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #785927 0%, #5e441b 100%)',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(94, 68, 27, 0.22)',
                }}
              >
                <Play size={16} fill="currentColor" />
                <span>{t('start_session', lang)} · {selectedPeriod}</span>
              </button>

              <button
                type="button"
                onClick={onOpenManualAttendance}
                className="golden-os-feedback-filter-btn"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  fontSize: '0.82rem',
                }}
              >
                <Edit3 size={14} />
                <span>{t('manual_entry', lang)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 3. ABSENT FOLLOW-UP (ONLY WHEN STUDENTS ARE MISSING IN PERIOD) ===== */}
      {enrolledStudents.length > 0 && absentStudents.length > 0 && (
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <UserX size={16} color="#b91c1c" />
                <span className="golden-os-field-label" style={{ marginBottom: 0 }}>
                  {t('absent_students', lang)} ({absentStudents.length})
                </span>
              </div>

              <button
                type="button"
                onClick={() => onSendAbsenteeAlerts && onSendAbsenteeAlerts(absentStudents)}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '6px 11px', borderRadius: '9px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}
              >
                <Bell size={13} />
                <span>{t('notify_absentees', lang)}</span>
              </button>
            </div>

            <div className="golden-os-list-shell" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {absentStudents.slice(0, 6).map(stu => (
                <div key={stu.id || stu.roll} className="golden-os-list-row" style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0, flex: 1 }}>
                    <div className="golden-os-avatar" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
                      {getInitials(stu.name, 'ST')}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stu.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#6b5b3e', marginTop: '1px' }}>
                        Roll {stu.roll || 'N/A'}{stu.dep ? ` · ${stu.dep}` : ''} · Absent
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Post-Session Summary Sheet */}
      {showSummaryModal && lastEndedSummary && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(37, 35, 31, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div className="golden-os-window" style={{ width: '100%', maxWidth: '420px', padding: '18px' }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#25231f', marginBottom: '4px' }}>
              Session Complete · {lastEndedSummary.period}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6b5b3e', marginBottom: '12px' }}>
              {lastEndedSummary.subjectName} · Ended at {lastEndedSummary.timestamp}
            </div>

            <div className="golden-os-inset-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#047857' }}>{lastEndedSummary.presentCount}</div>
                <div style={{ fontSize: '0.68rem', color: '#6b5b3e', fontWeight: 700 }}>Marked Present</div>
              </div>
              <div style={{ borderLeft: '1px solid #eadfcb' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b91c1c' }}>{lastEndedSummary.absentList.length}</div>
                <div style={{ fontSize: '0.68rem', color: '#6b5b3e', fontWeight: 700 }}>Not Scanned</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {lastEndedSummary.absentList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (onSendAbsenteeAlerts) onSendAbsenteeAlerts(lastEndedSummary.absentList);
                    setShowSummaryModal(false);
                  }}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '9px 14px', borderRadius: '10px' }}
                >
                  Notify Absentees
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#785927',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
