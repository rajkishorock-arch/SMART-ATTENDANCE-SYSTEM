import React, { useState, useMemo } from 'react';
import { 
  BookOpen, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, 
  Calendar, Clock, User, ShieldAlert, Award, ArrowRight, FileText, Check, X
} from 'lucide-react';

export default function StudentSubjectAttendanceHub({
  statsList = [],
  subjects = [],
  studentLogs = [],
  blueprintData = [],
  onOpenDispute = () => {},
  playCyberSound = () => {}
}) {
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'ELIGIBLE' | 'SHORTAGE'

  // Map subjects with real schedule and enriched details
  const enrichedSubjects = useMemo(() => {
    return statsList.map(stat => {
      const subId = stat.subject_id || stat.id;
      const matchedSubject = subjects.find(s => String(s.id) === String(subId) || s.code === (stat.subjectCode || stat.subject_code)) || {};
      
      // Look up lectures for this subject in studentLogs
      const matchedLogs = studentLogs.filter(log => {
        if (!log) return false;
        if (log.subject_id && String(log.subject_id) === String(subId)) return true;
        if (log.subject_code && log.subject_code === (stat.subjectCode || stat.subject_code || matchedSubject.code)) return true;
        if (log.subject_name && log.subject_name.toLowerCase().includes(String(stat.subjectName || matchedSubject.name || '').toLowerCase())) return true;
        return false;
      });

      // Also check blueprint calendar records if available
      const blueprintSubject = blueprintData.find(b => String(b.subject_id) === String(subId) || b.subject_code === (stat.subjectCode || stat.subject_code));
      let blueprintSessions = [];
      if (blueprintSubject && blueprintSubject.calendar) {
        blueprintSessions = Object.entries(blueprintSubject.calendar).map(([dateStr, status]) => ({
          date: dateStr,
          attendance: status,
          time: 'Standard Scheduled Lecture',
          period: 'Period Slot',
          marked_by: 'INSTITUTIONAL_REGISTRY'
        }));
      }

      // Merge logs prioritizing detailed studentLogs
      const combinedSessionsMap = new Map();
      blueprintSessions.forEach(s => combinedSessionsMap.set(s.date, s));
      matchedLogs.forEach(l => combinedSessionsMap.set(l.date, l));
      const sessions = Array.from(combinedSessionsMap.values()).sort((a, b) => (b.date > a.date ? 1 : -1));

      const pDays = stat.presentDays !== undefined ? stat.presentDays : sessions.filter(s => s.attendance === 'Present' || s.attendance === 'Late').length;
      const tDays = Math.max(stat.totalDays || sessions.length || 0, pDays);
      const rawPct = stat.percentage !== undefined ? stat.percentage : (tDays > 0 ? (pDays / tDays) * 100 : 100.0);
      const percentage = Math.min(100.0, Math.max(0.0, Number(rawPct) || 0));
      const isEligible = percentage >= 75.0 || tDays === 0;

      // Safe buffer or recovery
      const safeBuffer = isEligible && tDays > 0 ? Math.floor((pDays - 0.75 * tDays) / 0.75) : 0;
      const neededClasses = !isEligible ? Math.ceil((0.75 * tDays - pDays) / 0.25) : 0;

      return {
        id: subId,
        code: stat.subjectCode || stat.subject_code || matchedSubject.code || 'SUB',
        name: stat.subjectName || stat.subject_name || matchedSubject.name || 'Academic Subject',
        department: matchedSubject.department || 'Academic Department',
        teacher: matchedSubject.teacher_name || matchedSubject.teacher || 'Assigned Faculty',
        presentDays: pDays,
        totalDays: tDays,
        percentage,
        isEligible,
        safeBuffer,
        neededClasses,
        sessions
      };
    });
  }, [statsList, subjects, studentLogs, blueprintData]);

  // Overall KPI Metrics
  const totalSubjects = enrichedSubjects.length;
  const eligibleCount = enrichedSubjects.filter(s => s.isEligible).length;
  const shortageCount = totalSubjects - eligibleCount;

  // Filtered view
  const displayedSubjects = enrichedSubjects.filter(s => {
    if (filterType === 'ELIGIBLE') return s.isEligible;
    if (filterType === 'SHORTAGE') return !s.isEligible;
    return true;
  });

  const toggleExpand = (id) => {
    if (playCyberSound) playCyberSound('click');
    setExpandedSubjectId(prev => prev === id ? null : id);
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeInUp 0.3s ease' }}>
      
      {/* ── Top Bar: Title & Filter Pills ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            Subject-wise Academic Attendance & Lecture Registry
          </h3>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'ALL', label: `All (${totalSubjects})` },
            { id: 'ELIGIBLE', label: `Eligible (≥75%)` },
            { id: 'SHORTAGE', label: `Shortage (<75%)` }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => { playCyberSound('click'); setFilterType(f.id); }}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterType === f.id ? '1px solid #2563eb' : '1px solid #cbd5e1',
                background: filterType === f.id ? '#eff6ff' : '#ffffff',
                color: filterType === f.id ? '#1d4ed8' : '#64748b'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Horizontal Executive Summary Strip ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px'
      }}>
        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Enrolled Courses</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{totalSubjects} Subjects</div>
        </div>

        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>Exam Eligible</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>{eligibleCount} Cleared</div>
        </div>

        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: shortageCount > 0 ? '#dc2626' : '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Shortage Warning</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: shortageCount > 0 ? '#dc2626' : '#64748b', marginTop: '2px' }}>{shortageCount} Alerts</div>
        </div>
      </div>

      {/* ── Interactive Course Cards List ── */}
      {displayedSubjects.length === 0 ? (
        <div style={{
          padding: '32px 16px',
          textAlign: 'center',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          color: '#64748b'
        }}>
          <BookOpen size={28} style={{ opacity: 0.5, marginBottom: '6px' }} />
          <h4 style={{ margin: '0 0 4px', fontSize: '0.92rem', color: '#334155' }}>No Subjects Under This Category</h4>
          <p style={{ margin: 0, fontSize: '0.8rem' }}>Check back once department course allocation is published.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {displayedSubjects.map(sub => {
            const isExpanded = expandedSubjectId === sub.id;
            const statusColor = sub.isEligible ? '#059669' : '#dc2626';
            const statusBg = sub.isEligible ? '#f0fdf4' : '#fef2f2';
            const statusBorder = sub.isEligible ? '#bbf7d0' : '#fecaca';

            return (
              <div
                key={sub.id}
                className="surface-card"
                style={{
                  background: '#ffffff',
                  border: `1px solid ${sub.isEligible ? '#e2e8f0' : '#fca5a5'}`,
                  borderRadius: '14px',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {/* Main Horizontal Card Header */}
                <div style={{
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  {/* Subject Title & Faculty Info */}
                  <div style={{ minWidth: '220px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        border: '1px solid #bfdbfe'
                      }}>
                        {sub.code}
                      </span>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                        {sub.name}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.78rem', color: '#64748b', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <User size={13} /> {sub.teacher}
                      </span>
                      <span>•</span>
                      <span>Department of {sub.department}</span>
                    </div>
                  </div>

                  {/* Percentage & Standing Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 900, color: statusColor, lineHeight: 1 }}>
                        {sub.percentage.toFixed(1)}%
                      </div>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        {sub.presentDays} / {sub.totalDays} lectures attended
                      </span>
                    </div>

                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: statusBg,
                      border: `1px solid ${statusBorder}`,
                      color: statusColor
                    }}>
                      {sub.totalDays === 0 ? 'NEW TERM' : (sub.isEligible ? 'EXAM ELIGIBLE' : 'SHORTAGE ALERT')}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleExpand(sub.id)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#475569'
                      }}
                      title="Expand Lecture Sessions Log"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Horizontal Progress Bar & Action Guidance */}
                <div style={{ padding: '0 18px 14px' }}>
                  <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: `${Math.min(100, sub.percentage)}%`,
                        height: '100%',
                        background: sub.isEligible ? 'linear-gradient(90deg, #10b981, #059669)' : '#ef4444',
                        borderRadius: '3px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: '#64748b' }}>
                    <span>
                      {sub.isEligible 
                        ? (sub.safeBuffer > 0 ? `🟢 Safe to miss up to ${sub.safeBuffer} lecture(s) without falling below 75%` : `Threshold border zone (maintain attendance)`)
                        : `⚠️ Need +${sub.neededClasses} consecutive lecture(s) to restore exam eligibility (75%)`
                      }
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleExpand(sub.id)}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      {isExpanded ? 'Hide Lecture Log' : `View ${sub.sessions.length} Lecture Log(s) ↓`}
                    </button>
                  </div>
                </div>

                {/* Expandable Lecture Sessions Log Accordion */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid #f1f5f9',
                    background: '#f8fafc',
                    padding: '14px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    animation: 'fadeIn 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>
                        Lecture Session Attendance Records ({sub.sessions.length})
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Direct verification from institutional biometric registry
                      </span>
                    </div>

                    {sub.sessions.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                        No lecture sessions have been logged yet for this subject.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {sub.sessions.map((sess, idx) => {
                          const isPresent = sess.attendance === 'Present' || sess.attendance === 'Late';
                          return (
                            <div
                              key={idx}
                              style={{
                                padding: '8px 12px',
                                background: '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '8px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Calendar size={14} color="#64748b" />
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                                  {sess.date}
                                </span>
                                <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                  {sess.time || sess.period || 'Scheduled Slot'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  background: isPresent ? '#f0fdf4' : '#fef2f2',
                                  color: isPresent ? '#15803d' : '#b91c1c',
                                  border: `1px solid ${isPresent ? '#bbf7d0' : '#fecaca'}`
                                }}>
                                  {sess.attendance || 'Present'}
                                </span>

                                {!isPresent && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenDispute({
                                      date: sess.date,
                                      subject_id: sub.id,
                                      subject_name: sub.name,
                                      subject_code: sub.code
                                    })}
                                    style={{
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      background: '#eff6ff',
                                      border: '1px solid #bfdbfe',
                                      color: '#1d4ed8',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Lodge Dispute
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}