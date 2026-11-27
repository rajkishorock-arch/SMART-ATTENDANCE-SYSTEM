import { useState, useMemo } from 'react';
import {
  Share2,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  Award,
  CreditCard,
  CheckCircle2,
  Clock,
} from 'lucide-react';

const calculateAttendanceStreak = (logs) => {
  const conducted = (Array.isArray(logs) ? logs : [])
    .filter(l => String(l?.attendance || '').toUpperCase() !== 'CLASS_CANCELLED');
  if (conducted.length === 0) return { current: 0, best: 0 };

  let current = 0;
  let best = 0;
  let countingCurrent = true;
  for (const log of conducted) {
    const st = String(log.attendance || '').toLowerCase();
    const ok = st === 'present' || st === 'late' || st === 'excused';
    if (ok) {
      best += 1;
      if (countingCurrent) current += 1;
    } else {
      countingCurrent = false;
      best = Math.max(best, current);
    }
  }
  return { current, best: Math.max(best, current) };
};

/**
 * Golden Gate Master-Detail Student Attendance Wallet & Branch Course Passes.
 * Strictly filters courses to the student's registered branch subjects,
 * without popup modals, 3-dot titlebars, or row badge pills.
 */
export default function StudentAttendanceWallet({
  logs = [],
  studentName = 'Student',
  currentUser = null,
  subjects = [],
  routeView = null,
  onNavigateRoute = null,
  onNavigateBack = null,
  onOpenDispute = null,
  playCyberSound = () => {},
}) {
  const [localRoute, setLocalRoute] = useState(null);
  const [shareNotice, setShareNotice] = useState('');

  const activeRoute = routeView !== undefined && onNavigateRoute ? routeView : localRoute;
  const navigateTo = (next) => {
    if (playCyberSound) playCyberSound('click');
    setShareNotice('');
    if (onNavigateRoute) {
      onNavigateRoute(next);
    } else {
      setLocalRoute(next);
    }
  };
  const goBack = () => {
    if (playCyberSound) playCyberSound('click');
    setShareNotice('');
    if (onNavigateBack) {
      onNavigateBack();
    } else if (activeRoute?.mode) {
      setLocalRoute({ section: 'wallet' });
    }
  };

  const studentBranch = String(
    currentUser?.details?.dep || currentUser?.dep || currentUser?.department || ''
  ).trim();
  const studentRoll = String(currentUser?.details?.roll || currentUser?.roll || '').trim();
  const safeSubjects = useMemo(() => (Array.isArray(subjects) ? subjects : []), [subjects]);
  const safeLogs = useMemo(
    () => (Array.isArray(logs) ? logs : []).filter(l => String(l?.attendance || '').toUpperCase() !== 'CLASS_CANCELLED'),
    [logs]
  );

  // Scoped course passes strictly matching registered branch subjects
  const coursePasses = useMemo(() => {
    if (safeSubjects.length > 0) {
      return safeSubjects.map(sub => {
        const subIdStr = String(sub.id);
        const subCode = String(sub.code || '').trim();
        const matchedLogs = safeLogs.filter(log => {
          if (log.subject_id !== undefined && log.subject_id !== null) {
            return String(log.subject_id) === subIdStr;
          }
          if (subCode && log.subject_code) {
            return String(log.subject_code).trim().toLowerCase() === subCode.toLowerCase();
          }
          return false;
        });

        const attended = matchedLogs.filter(l =>
          ['present', 'late', 'excused'].includes(String(l.attendance || '').toLowerCase())
        ).length;
        const total = matchedLogs.length;
        const rate = total > 0 ? Math.round((attended / total) * 100) : 100;

        return {
          id: sub.id,
          name: sub.name || 'Academic Subject',
          code: subCode || `SUB-${sub.id}`,
          department: sub.department || studentBranch || 'Department',
          mentor: sub.teacher_name || 'Assigned Faculty',
          attended,
          total,
          rate,
          sessions: matchedLogs,
        };
      });
    }

    // Legacy fallback only when institution has zero subject registry rows
    const map = {};
    safeLogs.forEach(log => {
      const key = log.subject_id ? String(log.subject_id) : (log.subject_name || 'General');
      if (!map[key]) {
        map[key] = {
          id: log.subject_id || key,
          name: log.subject_name || 'General Academic Attendance',
          code: log.subject_code || 'GEN',
          department: studentBranch || log.department || 'General',
          mentor: log.teacher || 'Assigned Faculty',
          attended: 0,
          total: 0,
          sessions: [],
        };
      }
      map[key].total += 1;
      map[key].sessions.push(log);
      if (['present', 'late', 'excused'].includes(String(log.attendance || '').toLowerCase())) {
        map[key].attended += 1;
      }
    });
    return Object.values(map).map(item => ({
      ...item,
      rate: item.total > 0 ? Math.round((item.attended / item.total) * 100) : 100,
    }));
  }, [safeSubjects, safeLogs, studentBranch]);

  const branchSummary = useMemo(() => {
    if (safeSubjects.length > 0) {
      const total = coursePasses.reduce((sum, c) => sum + c.total, 0);
      const attended = coursePasses.reduce((sum, c) => sum + c.attended, 0);
      const rate = total > 0 ? Math.round((attended / total) * 100) : 100;
      return { total, attended, rate, isExamClear: rate >= 75 };
    }
    const total = safeLogs.length;
    const attended = safeLogs.filter(l =>
      ['present', 'late', 'excused'].includes(String(l.attendance || '').toLowerCase())
    ).length;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 100;
    return { total, attended, rate, isExamClear: rate >= 75 };
  }, [safeSubjects.length, coursePasses, safeLogs]);

  const branchScopedLogs = useMemo(() => {
    if (safeSubjects.length === 0) return safeLogs;
    const allowedIds = new Set(safeSubjects.map(s => String(s.id)));
    return safeLogs.filter(l => l.subject_id != null && allowedIds.has(String(l.subject_id)));
  }, [safeSubjects, safeLogs]);

  const streak = useMemo(() => calculateAttendanceStreak(branchScopedLogs), [branchScopedLogs]);

  const handleSharePass = async (title, summaryText) => {
    if (playCyberSound) playCyberSound('click');
    const text = `${studentName}${studentRoll ? ` (${studentRoll})` : ''} · ${title}: ${summaryText}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch { /* fallback to clipboard */ }
    }
    try {
      await navigator.clipboard?.writeText(text);
      setShareNotice('Pass summary copied to clipboard.');
    } catch {
      setShareNotice('Share unavailable on this device.');
    }
  };

  const mode = activeRoute?.mode || 'list';

  /* ===== DEDICATED PAGE: UNIVERSITY CREDENTIAL PASS ===== */
  if (mode === 'credential') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {shareNotice && (
              <div role="status" className="feedback-banner is-success">
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{shareNotice}</span>
              </div>
            )}

            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCard size={13} />
                <span>Academic Attendance Credential</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Student Name</span>
                <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>{studentName}</span>
              </div>
              {studentRoll && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                  <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Roll Number</span>
                  <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>{studentRoll}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Branch / Department</span>
                <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>{studentBranch || 'General'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Enrolled Courses</span>
                <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>{coursePasses.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Standing</span>
                <span style={{ color: branchSummary.isExamClear ? '#047857' : '#dc2626', fontWeight: 800, textAlign: 'right' }}>
                  {branchSummary.rate}% ({branchSummary.attended}/{branchSummary.total})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Exam Clearance</span>
                <span style={{ color: branchSummary.isExamClear ? '#047857' : '#dc2626', fontWeight: 700, textAlign: 'right' }}>
                  {branchSummary.isExamClear ? 'Eligible (75% Met)' : 'Review Required (< 75%)'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleSharePass('Academic Credential Pass', `${branchSummary.rate}% (${branchSummary.attended}/${branchSummary.total} classes)`)}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '10px 16px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Share2 size={14} />
                <span>Share Pass</span>
              </button>
              <button
                type="button"
                onClick={goBack}
                style={{
                  padding: '10px 20px',
                  borderRadius: '11px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #785927, #684c20)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED PAGE: SEMESTER CLEARANCE & STREAKS ===== */
  if (mode === 'streaks') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={13} />
                <span>Clearance &amp; Consistency</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Term Clearance Status</span>
                <span style={{ color: branchSummary.isExamClear ? '#047857' : '#dc2626', fontWeight: 800 }}>
                  {branchSummary.isExamClear ? 'Cleared for Exams' : 'Below 75% Requirement'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Current Present Streak</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>{streak.current} consecutive session(s)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Attended / Conducted</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>{branchSummary.attended} / {branchSummary.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Branch Subjects Cleared</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>
                  {coursePasses.filter(c => c.rate >= 75).length} / {coursePasses.length}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={goBack}
                style={{
                  padding: '10px 20px',
                  borderRadius: '11px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #785927, #684c20)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED PAGE: SUBJECT COURSE PASS DETAIL ===== */
  if (mode === 'subject') {
    const sub = coursePasses.find(c => String(c.id) === String(activeRoute?.id)) || activeRoute?.item || null;
    if (!sub) {
      return (
        <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ textAlign: 'center', padding: '24px', gap: '12px', alignItems: 'center' }}>
              <Clock size={24} style={{ color: '#8c7a5b' }} />
              <div style={{ fontWeight: 700, color: '#2b2112' }}>Course pass not found for your branch.</div>
              <button type="button" onClick={goBack} className="golden-os-feedback-filter-btn" style={{ padding: '8px 16px', borderRadius: '10px' }}>
                Back to Wallet
              </button>
            </div>
          </div>
        </div>
      );
    }

    const isEligible = sub.rate >= 75 || sub.total === 0;
    const buffer = isEligible && sub.total > 0 ? Math.floor((sub.attended - 0.75 * sub.total) / 0.75) : 0;
    const needed = !isEligible && sub.total > 0 ? Math.ceil((0.75 * sub.total - sub.attended) / 0.25) : 0;

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {shareNotice && (
              <div role="status" className="feedback-banner is-success">
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{shareNotice}</span>
              </div>
            )}

            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={13} />
                <span>{sub.name} ({sub.code})</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Branch</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>{sub.department}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Faculty</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>{sub.mentor}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Attendance Rate</span>
                <span style={{ color: isEligible ? '#047857' : '#dc2626', fontWeight: 800 }}>
                  {sub.total > 0 ? `${sub.rate}% (${sub.attended}/${sub.total})` : 'No sessions yet'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Eligibility Status</span>
                <span style={{ color: isEligible ? '#047857' : '#dc2626', fontWeight: 700 }}>
                  {sub.total === 0 ? 'New Term' : isEligible ? 'Exam Eligible (≥ 75%)' : 'Shortage (< 75%)'}
                </span>
              </div>
              {sub.total > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', gap: '10px' }}>
                  <span style={{ color: '#6b5b3e', fontWeight: 600 }}>{isEligible ? 'Safe Margin' : 'Classes Needed'}</span>
                  <span style={{ color: '#25231f', fontWeight: 700 }}>
                    {isEligible ? `Can miss ${buffer} session(s)` : `Attend ${needed} consecutive`}
                  </span>
                </div>
              )}
            </div>

            {/* Session Log Controls */}
            <div className="golden-os-form-section" style={{ gap: '10px' }}>
              <div className="golden-os-form-section-title">Recorded Sessions ({sub.sessions.length})</div>
              {sub.sessions.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: '#6b5b3e' }}>
                  No attendance logs recorded for {sub.name} yet.
                </div>
              ) : (
                <div className="golden-os-list-shell">
                  {sub.sessions.slice(0, 12).map((sess, idx) => {
                    const st = String(sess.attendance || 'Present');
                    const isAbs = st.toLowerCase() === 'absent';
                    return (
                      <div key={sess.id || idx} className="golden-os-list-row" style={{ cursor: 'default' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#25231f' }}>
                            {sess.date} · {st}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#6b5b3e', marginTop: '2px' }}>
                            {sess.period_label || sess.time || 'Scheduled Class'}
                          </div>
                        </div>
                        {isAbs && onOpenDispute && (
                          <button
                            type="button"
                            onClick={() => onOpenDispute({ ...sess, subject_id: sub.id })}
                            className="golden-os-feedback-filter-btn"
                            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '0.74rem' }}
                          >
                            Dispute
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleSharePass(`${sub.name} (${sub.code})`, `${sub.rate}% (${sub.attended}/${sub.total})`)}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '10px 16px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Share2 size={14} />
                <span>Share Pass</span>
              </button>
              <button
                type="button"
                onClick={goBack}
                style={{
                  padding: '10px 20px',
                  borderRadius: '11px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #785927, #684c20)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== WALLET ROOT DIRECTORY (CLEAN SINGLE-LINE ROWS, STRICTLY BRANCH-SCOPED) ===== */
  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {shareNotice && (
            <div role="status" className="feedback-banner is-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{shareNotice}</span>
            </div>
          )}

          {/* Top Compact Control */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6b5b3e' }}>
              Branch: {studentBranch || 'Registered'} · {coursePasses.length} {coursePasses.length === 1 ? 'course' : 'courses'}
            </span>
            <button
              type="button"
              onClick={() => handleSharePass('Attendance Wallet Summary', `${branchSummary.rate}% (${branchSummary.attended}/${branchSummary.total})`)}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '7px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Share2 size={14} />
              <span>Share Summary</span>
            </button>
          </div>

          {/* Primary Credential & Clearance Rows */}
          <div className="golden-os-list-shell">
            <button
              type="button"
              onClick={() => navigateTo({ section: 'wallet', mode: 'credential' })}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar">
                  <CreditCard size={17} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    University Credential Pass
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6b5b3e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                    {studentName} · {studentBranch || 'General'} · {branchSummary.rate}% ({branchSummary.attended}/{branchSummary.total})
                  </div>
                </div>
              </div>
              <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
            </button>

            <button
              type="button"
              onClick={() => navigateTo({ section: 'wallet', mode: 'streaks' })}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar">
                  <Award size={17} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Semester Exam Clearance &amp; Streaks
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6b5b3e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                    {branchSummary.isExamClear ? 'Eligible for Exams' : 'Shortage Warning'} · {streak.current} day streak
                  </div>
                </div>
              </div>
              <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
            </button>
          </div>

          {/* Enrolled Branch Courses */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#785927' }}>
                Enrolled Branch Courses
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8c7a5b' }}>
                {coursePasses.length} {coursePasses.length === 1 ? 'subject' : 'subjects'}
              </span>
            </div>

            {coursePasses.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', background: '#ffffff', border: '1px dashed #d6c5a3', borderRadius: '14px', color: '#6b5b3e', fontSize: '0.82rem' }}>
                No subjects registered for {studentBranch || 'your branch'} yet.
              </div>
            ) : (
              <div className="golden-os-list-shell">
                {coursePasses.map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => navigateTo({ section: 'wallet', mode: 'subject', id: sub.id, item: sub })}
                    className="golden-os-list-row"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div className="golden-os-avatar">
                        <BookOpen size={17} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.name} ({sub.code})
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#6b5b3e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                          {sub.department} · {sub.mentor} · {sub.attended}/{sub.total} classes
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
