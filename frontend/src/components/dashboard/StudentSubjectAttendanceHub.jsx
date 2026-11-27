import { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Sliders,
  FileText,
} from 'lucide-react';
import { getInitials } from '../../utils/attendanceDateUtils';

const formatStatusLabel = (raw) => {
  const s = String(raw || 'Present').trim();
  if (s.toUpperCase() === 'CLASS_CANCELLED') return 'Cancelled (Exempt)';
  return s;
};

export default function StudentSubjectAttendanceHub({
  statsList = [],
  subjects = [],
  studentLogs = [],
  blueprintData = [],
  routeView = null,
  onNavigateRoute = null,
  onOpenDispute = () => {},
  playCyberSound = () => {},
}) {
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'ELIGIBLE' | 'SHORTAGE'

  const safeSubjects = useMemo(() => (Array.isArray(subjects) ? subjects : []), [subjects]);
  const allowedSubjectIds = useMemo(
    () => new Set(safeSubjects.map(s => String(s.id))),
    [safeSubjects]
  );
  const allowedSubjectCodes = useMemo(
    () => new Set(safeSubjects.map(s => String(s.code || '').trim().toUpperCase()).filter(Boolean)),
    [safeSubjects]
  );

  // Strictly scope subjects, stats, logs, and blueprint to student's enrolled branch subjects
  const enrichedSubjects = useMemo(() => {
    const rawStats = Array.isArray(statsList) ? statsList : [];
    const scopedStats = safeSubjects.length > 0
      ? rawStats.filter(stat => {
          const sid = String(stat?.subject_id || stat?.id || '');
          const scode = String(stat?.subjectCode || stat?.subject_code || '').trim().toUpperCase();
          return (sid && allowedSubjectIds.has(sid)) || (scode && allowedSubjectCodes.has(scode));
        })
      : rawStats;

    // Seed any enrolled branch subject missing from statsList
    const mergedMap = new Map();
    safeSubjects.forEach(s => {
      mergedMap.set(String(s.id), {
        subject_id: s.id,
        subjectCode: s.code || `SUB-${s.id}`,
        subjectName: s.name || `Subject #${s.id}`,
        presentDays: 0,
        totalDays: 0,
      });
    });
    scopedStats.forEach(stat => {
      const subId = stat.subject_id || stat.id;
      const byCode = !subId && stat.subjectCode
        ? safeSubjects.find(s => String(s.code || '').toUpperCase() === String(stat.subjectCode).toUpperCase())
        : null;
      const resolvedId = subId || byCode?.id;
      if (resolvedId != null) {
        mergedMap.set(String(resolvedId), stat);
      }
    });

    const sourceList = mergedMap.size > 0 ? Array.from(mergedMap.values()) : scopedStats;

    return sourceList.map(stat => {
      const subId = stat.subject_id || stat.id;
      const subCodeRaw = stat.subjectCode || stat.subject_code || '';
      const matchedSubject = safeSubjects.find(
        s => String(s.id) === String(subId) || (s.code && s.code === subCodeRaw)
      ) || {};

      const matchedLogs = (Array.isArray(studentLogs) ? studentLogs : []).filter(log => {
        if (!log) return false;
        if (log.subject_id != null && String(log.subject_id) === String(subId)) return true;
        if (log.subject_code && (matchedSubject.code || subCodeRaw) && log.subject_code === (subCodeRaw || matchedSubject.code)) {
          return true;
        }
        return false;
      });

      const blueprintSubject = (Array.isArray(blueprintData) ? blueprintData : []).find(
        b => String(b.subject_id) === String(subId) || (b.subject_code && b.subject_code === (subCodeRaw || matchedSubject.code))
      );

      const combinedMap = new Map();
      if (blueprintSubject?.calendar) {
        Object.entries(blueprintSubject.calendar).forEach(([dateStr, status]) => {
          combinedMap.set(`${dateStr}::cal`, {
            date: dateStr,
            attendance: status,
            time: 'Scheduled Lecture',
            period: 'Period Slot',
          });
        });
      }
      matchedLogs.forEach((l, idx) => {
        // Prefer richer attendance log for the date if present
        combinedMap.delete(`${l.date}::cal`);
        combinedMap.set(l.record_id || l.id || `${l.date}::${l.time || idx}`, l);
      });

      const sessions = Array.from(combinedMap.values()).sort((a, b) =>
        String(b.date || '').localeCompare(String(a.date || ''))
      );

      const conductedSessions = sessions.filter(s => String(s.attendance || '').toUpperCase() !== 'CLASS_CANCELLED');
      const attendedSessions = conductedSessions.filter(s => ['Present', 'Late', 'Excused'].includes(s.attendance));

      const tDays = stat.totalDays !== undefined ? Number(stat.totalDays) || 0 : conductedSessions.length;
      const pDays = stat.presentDays !== undefined ? Number(stat.presentDays) || 0 : attendedSessions.length;
      const rawPct = stat.percentage !== undefined
        ? Number(stat.percentage)
        : (tDays > 0 ? (pDays / tDays) * 100 : 100);
      const percentage = Math.min(100, Math.max(0, Number(rawPct) || 0));
      const isEligible = tDays === 0 || percentage >= 75.0;

      const safeBuffer = isEligible && tDays > 0 ? Math.max(0, Math.floor((pDays - 0.75 * tDays) / 0.75)) : 0;
      const neededClasses = !isEligible && tDays > 0 ? Math.max(0, Math.ceil((0.75 * tDays - pDays) / 0.25)) : 0;

      return {
        id: subId,
        code: subCodeRaw || matchedSubject.code || 'SUB',
        name: stat.subjectName || stat.subject_name || matchedSubject.name || 'Enrolled Subject',
        department: matchedSubject.department || 'Academic Department',
        teacher: matchedSubject.teacher_name || matchedSubject.teacher || 'Assigned Faculty',
        presentDays: pDays,
        totalDays: tDays,
        percentage,
        isEligible,
        safeBuffer,
        neededClasses,
        sessions,
      };
    });
  }, [statsList, safeSubjects, allowedSubjectIds, allowedSubjectCodes, studentLogs, blueprintData]);

  const navigateTo = (next) => {
    if (playCyberSound) playCyberSound('click');
    if (onNavigateRoute) onNavigateRoute(next);
  };

  /* ===== DEDICATED DETAIL PAGE FOR SELECTED SUBJECT ===== */
  if (routeView?.mode === 'detail' && routeView?.id != null) {
    const selectedSubject = enrichedSubjects.find(s => String(s.id) === String(routeView.id)) || routeView.item || null;

    if (!selectedSubject) {
      return (
        <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>Subject record not found</div>
              <div style={{ fontSize: '0.78rem', color: '#6b5b3e', marginTop: '4px' }}>
                This subject may not belong to your currently registered branch.
              </div>
            </div>
          </div>
        </div>
      );
    }

    const isOk = selectedSubject.isEligible;
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Structured Course Standing Card */}
            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <div className="golden-os-avatar" style={{ width: '44px', height: '44px' }}>
                  {getInitials(selectedSubject.code || selectedSubject.name, 'SB')}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#25231f' }}>
                    {selectedSubject.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6b5b3e', fontWeight: 600 }}>
                    {selectedSubject.code} · {selectedSubject.teacher} · {selectedSubject.department}
                  </div>
                </div>
              </div>

              <div style={{ width: '100%', height: '8px', background: '#eadfcb', borderRadius: '999px', overflow: 'hidden', margin: '4px 0' }}>
                <div
                  style={{
                    width: `${Math.min(100, selectedSubject.percentage)}%`,
                    height: '100%',
                    background: isOk ? 'linear-gradient(90deg, #10b981, #047857)' : 'linear-gradient(90deg, #ef4444, #b91c1c)',
                    borderRadius: '999px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Attendance Rate</span>
                <span style={{ color: isOk ? '#047857' : '#b91c1c', fontWeight: 800 }}>
                  {selectedSubject.percentage.toFixed(1)}% ({selectedSubject.presentDays}/{selectedSubject.totalDays})
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Eligibility Standing</span>
                <span style={{ color: isOk ? '#047857' : '#b91c1c', fontWeight: 700 }}>
                  {selectedSubject.totalDays === 0 ? 'New Term' : isOk ? 'Exam Eligible (>= 75%)' : 'Below 75% Shortage'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>
                  {isOk ? 'Safe Bunk Buffer' : 'Recovery Requirement'}
                </span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>
                  {selectedSubject.totalDays === 0
                    ? 'Awaiting first lecture'
                    : isOk
                      ? `Can miss ${selectedSubject.safeBuffer} lecture(s)`
                      : `Attend +${selectedSubject.neededClasses} consecutive lecture(s)`}
                </span>
              </div>
            </div>

            {/* Control System Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                onClick={() => navigateTo({ section: 'planner', mode: 'simulator', subjectId: selectedSubject.id })}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '10px 14px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
              >
                <Sliders size={14} />
                <span>Simulate in Planner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  onOpenDispute({
                    subject_id: selectedSubject.id,
                    subject_name: selectedSubject.name,
                    subject_code: selectedSubject.code,
                  });
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '11px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #785927, #684c20)',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                }}
              >
                <FileText size={14} />
                <span>Request Correction</span>
              </button>
            </div>

            {/* Complete Lecture Sessions Registry */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 8px' }}>
                <span className="golden-os-field-label" style={{ marginBottom: 0 }}>Lecture Session Registry</span>
                <span style={{ fontSize: '0.73rem', color: '#6b5b3e', fontWeight: 700 }}>
                  {selectedSubject.sessions.length} {selectedSubject.sessions.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {selectedSubject.sessions.length === 0 ? (
                <div className="golden-os-inset-card" style={{ textAlign: 'center', padding: '20px 14px', fontSize: '0.82rem', color: '#6b5b3e' }}>
                  No lecture sessions recorded for this course yet.
                </div>
              ) : (
                <div className="golden-os-list-shell">
                  {selectedSubject.sessions.map((sess, idx) => {
                    const st = String(sess.attendance || 'Present');
                    const isPres = ['Present', 'Late', 'Excused'].includes(st);
                    const isExempt = st.toUpperCase() === 'CLASS_CANCELLED';
                    return (
                      <div
                        key={sess.record_id || sess.id || `${sess.date}-${idx}`}
                        className="golden-os-list-row"
                        style={{ cursor: 'default' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                          <div
                            className="golden-os-avatar"
                            style={!isPres && !isExempt ? { background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' } : undefined}
                          >
                            <Calendar size={15} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: isPres || isExempt ? '#25231f' : '#b91c1c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {sess.date || 'Recorded Session'} · {formatStatusLabel(st)}
                            </div>
                          </div>
                        </div>

                        {!isPres && !isExempt && (
                          <button
                            type="button"
                            onClick={() => {
                              if (playCyberSound) playCyberSound('click');
                              onOpenDispute({
                                date: sess.date,
                                subject_id: selectedSubject.id,
                                subject_name: selectedSubject.name,
                                subject_code: selectedSubject.code,
                              });
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#785927',
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              padding: '4px 6px',
                              flexShrink: 0,
                            }}
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
          </div>
        </div>
      </div>
    );
  }

  /* ===== CLEAN DIRECTORY VIEW (ONLY ENROLLED BRANCH SUBJECTS) ===== */
  const displayedSubjects = enrichedSubjects.filter(s => {
    if (filterType === 'ELIGIBLE') return s.isEligible;
    if (filterType === 'SHORTAGE') return !s.isEligible;
    return true;
  });

  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {enrichedSubjects.length > 1 && (
            <div className="golden-os-segmented" style={{ width: '100%', flexWrap: 'nowrap' }}>
              {[
                { id: 'ALL', label: `All (${enrichedSubjects.length})` },
                { id: 'ELIGIBLE', label: 'Eligible' },
                { id: 'SHORTAGE', label: 'Shortage' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    setFilterType(tab.id);
                  }}
                  className={`golden-os-segmented-btn ${filterType === tab.id ? 'active' : ''}`}
                  style={{ flex: 1, padding: '8px 6px', whiteSpace: 'nowrap', textAlign: 'center' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 8px' }}>
              <span className="golden-os-field-label" style={{ marginBottom: 0 }}>Enrolled Branch Subjects</span>
              <span style={{ fontSize: '0.73rem', color: '#6b5b3e', fontWeight: 700 }}>
                {displayedSubjects.length} {displayedSubjects.length === 1 ? 'subject' : 'subjects'}
              </span>
            </div>

            {displayedSubjects.length === 0 ? (
              <div className="golden-os-inset-card" style={{ textAlign: 'center', padding: '26px 14px', color: '#6b5b3e', fontSize: '0.84rem' }}>
                <BookOpen size={24} style={{ opacity: 0.6, marginBottom: '6px', display: 'block', marginInline: 'auto' }} />
                No enrolled subjects found under this view.
              </div>
            ) : (
              <div className="golden-os-list-shell">
                {displayedSubjects.map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => navigateTo({ section: 'subjects', mode: 'detail', id: sub.id, item: sub })}
                    className="golden-os-list-row"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div className="golden-os-avatar">
                        {getInitials(sub.code || sub.name, 'SB')}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.name} ({sub.code})
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
