import { useState } from 'react';
import {
  Search,
  QrCode,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Check,
  Users
} from 'lucide-react';

export default function ManualAttendanceRegisterView({
  subjects = [],
  students = [],
  manualSubjectId,
  setManualSubjectId,
  setSelectedSubjectId,
  manualDate,
  setManualDate,
  setSessionDate,
  manualPeriod,
  setManualPeriod,
  setSessionPeriod,
  manualAttendanceData,
  setManualAttendanceData,
  manualSearchQuery,
  setManualSearchQuery,
  manualFeedback,
  setManualFeedback,
  isSubmittingManual,
  onSubmitRegister,
  onCancel,
  onOpenQrScanner,
  departmentsMatch,
  getLocalDateString,
  playCyberSound = () => {},
}) {
  const [expandedNoteIds, setExpandedNoteIds] = useState({});

  const activeManualSubId = manualSubjectId || (subjects.length > 0 ? String(subjects[0].id) : '');
  const selectedSubject = subjects.find(sub => String(sub.id) === String(activeManualSubId));
  const subjectDept = selectedSubject ? selectedSubject.department : '';

  const deptStudents = students.filter(s => !subjectDept || departmentsMatch(s.dep || s.department, subjectDept));
  const classStudents = deptStudents.filter(s => {
    if (!manualSearchQuery) return true;
    const q = manualSearchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || String(s.roll || '').toLowerCase().includes(q);
  });

  const tallies = deptStudents.reduce(
    (acc, s) => {
      const st = manualAttendanceData[s.id]?.status || 'Present';
      if (st === 'Late') acc.late += 1;
      else if (st === 'Absent') acc.absent += 1;
      else acc.present += 1;
      return acc;
    },
    { present: 0, late: 0, absent: 0 }
  );

  const toggleNoteField = (studentId) => {
    playCyberSound('click');
    setExpandedNoteIds(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const handleMarkAllPresent = () => {
    playCyberSound('click');
    setManualAttendanceData(prev => {
      const next = { ...prev };
      deptStudents.forEach(s => {
        next[s.id] = { status: 'Present', remarks: prev[s.id]?.remarks || '' };
      });
      return next;
    });
  };

  const todayStr = getLocalDateString();

  return (
    <div className="golden-os-page-bottom-safe">
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {manualFeedback && (
            <div
              role="status"
              className={`feedback-banner ${manualFeedback.toLowerCase().includes('saved') ? 'success' : 'error'}`}
            >
              {manualFeedback.toLowerCase().includes('saved') ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{manualFeedback}</span>
            </div>
          )}

          {/* Session Controls */}
          <div className="golden-os-form-section">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '12px' }}>
              <div>
                <label className="golden-os-field-label">Subject</label>
                <select
                  aria-label="Manual register subject"
                  className="golden-os-input"
                  value={activeManualSubId}
                  onChange={e => {
                    setManualSubjectId(e.target.value);
                    setSelectedSubjectId(e.target.value);
                    setManualFeedback('');
                  }}
                >
                  {subjects.length > 0 ? (
                    subjects.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.name} ({s.code || s.id})</option>
                    ))
                  ) : (
                    <option value="">No subjects configured</option>
                  )}
                </select>
              </div>

              <div>
                <label className="golden-os-field-label">Period</label>
                <select
                  aria-label="Manual register period"
                  className="golden-os-input"
                  value={manualPeriod}
                  onChange={e => {
                    setManualPeriod(e.target.value);
                    setSessionPeriod(e.target.value);
                    setManualFeedback('');
                  }}
                >
                  <option value="Period 1">Period 1 (09:00 - 10:00)</option>
                  <option value="Period 2">Period 2 (10:00 - 11:00)</option>
                  <option value="Period 3">Period 3 (11:15 - 12:15)</option>
                  <option value="Period 4">Period 4 (12:15 - 01:15)</option>
                  <option value="Period 5">Period 5 (02:00 - 03:00)</option>
                  <option value="Period 6">Period 6 (03:00 - 04:00)</option>
                  <option value="Period 7">Period 7 (04:00 - 05:00)</option>
                  <option value="Period 8">Period 8 (05:00 - 06:00)</option>
                </select>
              </div>

              <div>
                <label className="golden-os-field-label">Date</label>
                <input
                  type="date"
                  aria-label="Manual register date"
                  max={todayStr}
                  className="golden-os-input"
                  value={manualDate}
                  onChange={e => {
                    const nextDate = e.target.value;
                    if (nextDate && nextDate > todayStr) {
                      setManualDate(todayStr);
                      setSessionDate(todayStr);
                      setManualFeedback('Future date cannot be selected.');
                      playCyberSound('error');
                      return;
                    }
                    setManualDate(nextDate);
                    setSessionDate(nextDate);
                    setManualFeedback('');
                  }}
                />
              </div>
            </div>
          </div>

          {/* Search & Quick ID Scan */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
              <Search
                size={15}
                color="#8a6c35"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <input
                type="text"
                className="golden-os-input"
                placeholder="Search student name or roll..."
                value={manualSearchQuery}
                onChange={e => setManualSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                onOpenQrScanner();
              }}
              className="golden-os-feedback-filter-btn"
              style={{ height: '40px', paddingInline: '14px' }}
            >
              <QrCode size={15} />
              <span>Scan ID</span>
            </button>
          </div>

          {/* Live Highlighted Tally & Quick Reset */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem', fontWeight: 700 }}>
              <span style={{ color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '999px' }}>
                {tallies.present} Present
              </span>
              <span style={{ color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '3px 10px', borderRadius: '999px' }}>
                {tallies.late} Late
              </span>
              <span style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '3px 10px', borderRadius: '999px' }}>
                {tallies.absent} Absent
              </span>
            </div>

            {deptStudents.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8b6525',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '4px 6px'
                }}
              >
                Reset All Present
              </button>
            )}
          </div>

          {/* Clean Golden Glass Student List (Zero Bulky Cards) */}
          <div className="golden-os-list-shell">
            {classStudents.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#696358' }}>
                <Users size={34} style={{ opacity: 0.35, marginBottom: '10px' }} />
                <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#25231f' }}>
                  No students found {subjectDept ? `in ${subjectDept}` : ''}
                </div>
              </div>
            ) : (
              classStudents.map(student => {
                const stateData = manualAttendanceData[student.id] || { status: 'Present', remarks: '' };
                const hasNote = Boolean(stateData.remarks && stateData.remarks.trim());
                const showNoteInput = Boolean(expandedNoteIds[student.id]) || hasNote;

                return (
                  <div
                    key={student.id}
                    className="golden-os-list-row"
                    style={{
                      cursor: 'default',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Left: Student Name & Roll */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 160px' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {student.name}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#696358', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Roll {student.roll} • {student.dep}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleNoteField(student.id)}
                          aria-label={`Add note for ${student.name}`}
                          title="Add note (optional)"
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '8px',
                            border: hasNote || showNoteInput ? '1px solid #d5b97d' : '1px solid #e7dec9',
                            background: hasNote || showNoteInput ? '#fbf5e8' : '#ffffff',
                            color: hasNote || showNoteInput ? '#785927' : '#8b8170',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        >
                          <MessageSquare size={14} />
                        </button>
                      </div>

                      {/* Right: Highlighted 3-Pill Status Segmented Control */}
                      <div style={{
                        display: 'inline-flex',
                        gap: '4px',
                        padding: '3px',
                        borderRadius: '10px',
                        background: '#f5f0e5',
                        border: '1px solid #e4d8bd',
                        flexShrink: 0
                      }}>
                        {[
                          { value: 'Present', bg: '#059669', border: '#047857' },
                          { value: 'Late', bg: '#d97706', border: '#b45309' },
                          { value: 'Absent', bg: '#dc2626', border: '#b91c1c' }
                        ].map(opt => {
                          const isSelected = stateData.status === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => {
                                playCyberSound('click');
                                setManualAttendanceData(prev => ({
                                  ...prev,
                                  [student.id]: { ...stateData, status: opt.value }
                                }));
                              }}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '7px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                border: isSelected ? `1px solid ${opt.border}` : '1px solid transparent',
                                background: isSelected ? opt.bg : 'transparent',
                                color: isSelected ? '#ffffff' : '#696358',
                                transition: 'all 0.14s ease'
                              }}
                            >
                              {opt.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {showNoteInput && (
                      <input
                        type="text"
                        className="golden-os-input"
                        placeholder="Add optional remark..."
                        value={stateData.remarks}
                        onChange={e => {
                          setManualAttendanceData(prev => ({
                            ...prev,
                            [student.id]: { ...stateData, remarks: e.target.value }
                          }));
                        }}
                        style={{ padding: '7px 10px', fontSize: '0.78rem' }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Golden Gate Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => { playCyberSound('click'); onCancel(); }}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '10px 18px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmittingManual || deptStudents.length === 0}
              onClick={onSubmitRegister}
              className="golden-os-action-pill"
              style={{ padding: '10px 22px', fontSize: '0.86rem' }}
            >
              <Check size={16} />
              <span>{isSubmittingManual ? 'Submitting...' : 'Submit Register'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
