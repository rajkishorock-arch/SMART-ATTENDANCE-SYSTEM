import { useState, useMemo } from 'react';
import { 
  Play, 
  Square, 
  Camera, 
  UserX, 
  Clock, 
  Bell, 
  Edit3, 
  FileSpreadsheet, 
  Sparkles,
  X
} from 'lucide-react';
import { t } from '../utils/i18n';

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
  onExportCsv,
  lang = 'en'
}) {
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('Period 1');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [lastEndedSummary, setLastEndedSummary] = useState(null);

  // Derive today's day of week
  const todayDayName = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }, []);

  const todayFormattedDate = useMemo(() => {
    return new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [lang]);

  // Today's classes for this teacher
  const todaySchedule = useMemo(() => {
    return schedules.filter(s => {
      const matchDay = (s.day_of_week || '').toLowerCase() === todayDayName.toLowerCase();
      const isMySubject = subjects.some(sub => sub.id === s.subject_id);
      return matchDay && isMySubject;
    });
  }, [schedules, todayDayName, subjects]);

  // Derived active subject and effective subject ID
  const effectiveSubjectId = useMemo(() => {
    if (selectedSubjectId && subjects.some(s => String(s.id) === String(selectedSubjectId))) {
      return selectedSubjectId;
    }
    return subjects.length > 0 ? String(subjects[0].id) : '';
  }, [selectedSubjectId, subjects]);

  const activeSubject = useMemo(() => {
    return subjects.find(s => String(s.id) === String(effectiveSubjectId)) || subjects[0] || null;
  }, [subjects, effectiveSubjectId]);

  // Handle Period switch with auto-schedule sync
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

  // Students in this department/subject with robust fallback
  const enrolledStudents = useMemo(() => {
    if (!students || students.length === 0) return [];
    if (!activeSubject || !activeSubject.department) return students;

    const subDept = String(activeSubject.department).trim().toLowerCase();
    const matches = students.filter(s => {
      const sDept = String(s.dep || s.department || '').trim().toLowerCase();
      return sDept && (sDept === subDept || subDept.includes(sDept) || sDept.includes(subDept));
    });

    return matches.length > 0 ? matches : students;
  }, [students, activeSubject]);

  // Today's logs filtered for this class/subject/period
  const todayLogs = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
    const todayStrIso = new Date().toISOString().split('T')[0];
    return logs.filter(l => {
      const logDate = l.date || '';
      const dateMatch = logDate === todayStr || logDate === todayStrIso;
      if (!dateMatch) return false;

      // Period match if log has period metadata
      if (l.period && selectedPeriod) {
        return String(l.period).toLowerCase() === String(selectedPeriod).toLowerCase();
      }
      return true;
    });
  }, [logs, selectedPeriod]);

  const presentRolls = useMemo(() => {
    const set = new Set();
    todayLogs.forEach(l => {
      if (l.roll) set.add(String(l.roll).toLowerCase());
      if (l.student_id) set.add(String(l.student_id).toLowerCase());
    });
    return set;
  }, [todayLogs]);

  // Keep present count bounded by enrolled count for consistent UI
  const displayPresentCount = Math.min(presentRolls.size, enrolledStudents.length || presentRolls.size);
  const displayAbsentCount = Math.max(0, (enrolledStudents.length || presentRolls.size) - displayPresentCount);

  const absentStudents = useMemo(() => {
    return enrolledStudents.filter(s => !presentRolls.has(String(s.roll || '').toLowerCase()));
  }, [enrolledStudents, presentRolls]);

  // Handle End Session with summary popup
  const handleEndSessionClick = () => {
    const summary = {
      subjectName: activeSubject?.name || 'Class Session',
      period: selectedPeriod,
      totalEnrolled: enrolledStudents.length,
      presentCount: displayPresentCount,
      absentList: absentStudents.slice(0, 15),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setLastEndedSummary(summary);
    setShowSummaryModal(true);
    if (onEndSession) onEndSession();
  };

  return (
    <div className="today-session-hub" style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeInUp 0.3s ease both' }}>
      {/* ── Header Welcome Greeting ── */}
      <div className="surface-card" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>👋</span>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
              {teacherName ? `${teacherName}` : t('teacher_hub', lang)}
            </h2>
            <span className="status-pill status-pill-success" style={{ fontSize: '0.68rem' }}>
              {todayDayName}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
            {todayFormattedDate} · {todaySchedule.length > 0 ? `${todaySchedule.length} ${lang === 'hi' ? 'क्लासेज आज शेड्यूल हैं' : 'classes scheduled today'}` : t('no_classes_today', lang)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={onOpenManualAttendance}
            className="btn-secondary"
            style={{ minHeight: '40px', padding: '8px 14px', fontSize: '0.8rem' }}
          >
            <Edit3 size={14} />
            <span>{t('manual_entry', lang)}</span>
          </button>
          <button
            onClick={onExportCsv}
            className="btn-ghost"
            style={{ minHeight: '40px', padding: '8px 12px', fontSize: '0.8rem' }}
            title="Download CSV report"
          >
            <FileSpreadsheet size={16} />
          </button>
        </div>
      </div>

      {/* ── Active Session Callout (When Live) ── */}
      {sessionActive && (
        <div
          className="surface-card"
          style={{
            padding: '18px 20px',
            border: '1.5px solid #10b981',
            background: 'rgba(16, 185, 129, 0.08)',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}
            >
              <Camera size={22} className="pulse-slow" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                  {t('session_live', lang)}
                </span>
                <span className="status-pill status-pill-success" style={{ fontSize: '0.68rem' }}>
                  {selectedPeriod}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {activeSubject?.name} · {presentRolls.size} {t('marked_present', lang)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onOpenScanner}
              className="btn-primary"
              style={{ minHeight: '44px', padding: '8px 18px', fontSize: '0.85rem' }}
            >
              <Camera size={16} />
              <span>{t('open_scanner', lang)}</span>
            </button>
            <button
              onClick={handleEndSessionClick}
              className="btn-danger"
              style={{ minHeight: '44px', padding: '8px 16px', fontSize: '0.85rem' }}
            >
              <Square size={14} />
              <span>{t('end_session', lang)}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Primary "Today's Class" Card (When Session Inactive) ── */}
      {!sessionActive && (
        <div className="surface-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--color-primary)" />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                {t('current_class', lang)}
              </h3>
            </div>

            {/* Quick Period Switcher */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', 'Period 6'].map((p) => {
                const isSelected = selectedPeriod === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePeriodClick(p)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-full)',
                      border: `1.5px solid ${isSelected ? '#0ea5e9' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: isSelected ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? '#38bdf8' : 'var(--color-text-secondary)',
                      fontSize: '0.74rem',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 0 10px rgba(14, 165, 233, 0.35)' : 'none'
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Selector & Meta */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                {lang === 'hi' ? 'विषय चुनें' : 'Select Subject / Course'}
              </label>
              <span style={{ fontSize: '0.72rem', color: '#0ea5e9', fontWeight: 700 }}>
                • {selectedPeriod}
              </span>
            </div>
            <select
              value={effectiveSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.92rem', fontWeight: 600 }}
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name || sub.subject_name} ({sub.department || 'All'})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Enrolled & Present Snapshot */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{t('total_enrolled', lang)}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>{enrolledStudents.length}</div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#34d399' }}>{t('marked_present', lang)}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{displayPresentCount}</div>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#f87171' }}>{t('absent_today', lang)}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>{displayAbsentCount}</div>
            </div>
          </div>

          {/* Large Prominent Start Session Action */}
          <button
            type="button"
            onClick={() => {
              if (onStartSession) onStartSession(effectiveSubjectId, selectedPeriod);
              if (onOpenScanner) onOpenScanner();
            }}
            className="btn-primary"
            style={{
              width: '100%',
              minHeight: '52px',
              fontSize: '1rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)'
            }}
          >
            <Play size={18} fill="currentColor" />
            <span>{t('start_session', lang)} • {selectedPeriod}</span>
          </button>
        </div>
      )}

      {/* ── Absent Students Quick Follow-up Section ── */}
      {absentStudents.length > 0 && (
        <div className="surface-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserX size={18} color="#ef4444" />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                {t('absent_students', lang)} ({absentStudents.length})
              </h3>
            </div>

            <button
              onClick={onSendAbsenteeAlerts}
              className="btn-secondary"
              style={{
                minHeight: '34px',
                padding: '4px 12px',
                fontSize: '0.75rem',
                color: '#f59e0b',
                borderColor: 'rgba(245, 158, 11, 0.3)'
              }}
            >
              <Bell size={12} />
              <span>{t('notify_absentees', lang)}</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
            {absentStudents.slice(0, 8).map((stu) => (
              <div
                key={stu.id || stu.roll}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>{stu.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{stu.roll} · {stu.dep}</div>
                </div>

                <button
                  onClick={onOpenManualAttendance}
                  className="btn-ghost"
                  style={{ minHeight: '30px', padding: '3px 8px', fontSize: '0.72rem', color: '#0ea5e9' }}
                >
                  {t('mark_manual', lang)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── End of Session Wrap-up Summary Modal ── */}
      {showSummaryModal && lastEndedSummary && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 17, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 10002,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowSummaryModal(false)}
        >
          <div
            className="surface-card"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              borderRadius: 'var(--radius-xl)',
              animation: 'scaleIn 0.25s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={22} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                  {t('session_summary', lang)}
                </h3>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="clean-back-btn"
                style={{ width: '36px', height: '36px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.82rem', marginBottom: '16px' }}>
              {lastEndedSummary.subjectName} · {lastEndedSummary.period} · {lastEndedSummary.timestamp}
            </div>

            {/* Scoreboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{t('total_enrolled', lang)}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{lastEndedSummary.totalEnrolled}</div>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#34d399' }}>{t('marked_present', lang)}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{lastEndedSummary.presentCount}</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: '#f87171' }}>{t('absent_today', lang)}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{lastEndedSummary.absentList.length}</div>
              </div>
            </div>

            {/* Absent List with Action */}
            {lastEndedSummary.absentList.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  {t('absent_students', lang)}:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                  {lastEndedSummary.absentList.map(stu => (
                    <div key={stu.id || stu.roll} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '0.82rem', color: '#fff' }}>{stu.name} ({stu.roll})</span>
                      <button
                        onClick={onOpenManualAttendance}
                        style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {t('mark_manual', lang)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onSendAbsenteeAlerts}
                className="btn-secondary"
                style={{ flex: 1, minHeight: '42px', fontSize: '0.85rem' }}
              >
                <Bell size={14} />
                <span>{t('notify_absentees', lang)}</span>
              </button>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="btn-primary"
                style={{ flex: 1, minHeight: '42px', fontSize: '0.85rem' }}
              >
                <span>{t('close', lang)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
