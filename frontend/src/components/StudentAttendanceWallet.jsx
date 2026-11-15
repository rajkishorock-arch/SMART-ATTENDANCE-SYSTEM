import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Share2, 
  CheckCircle2, 
  ShieldCheck, 
  QrCode, 
  ChevronRight, 
  BookOpen, 
  Clock,
  Calendar
} from 'lucide-react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

export default function StudentAttendanceWallet({ logs = [], studentName = 'Student', subjects = [] }) {
  const [selectedPass, setSelectedPass] = useState(null);

  // Lock body scrolling when pass modal is open
  useBodyScrollLock(!!selectedPass);

  // Overall attendance stats
  const totalLogs = logs.length;
  const attendedLogs = logs.filter(l => (l.attendance || '').toLowerCase() === 'present' || (l.attendance || '').toLowerCase() === 'late').length;
  const overallRate = totalLogs > 0 ? Math.round((attendedLogs / totalLogs) * 100) : 100;
  const isExamClear = overallRate >= 75;

  // Group logs by subject
  const subjectPasses = useMemo(() => {
    const map = {};
    logs.forEach(log => {
      const key = log.subject_name || log.subject_code || 'General Attendance';
      if (!map[key]) {
        map[key] = {
          name: key,
          code: log.subject_code || 'GEN',
          attended: 0,
          total: 0,
          lastDate: log.date,
          mentor: log.teacher || 'Assigned Faculty'
        };
      }
      map[key].total += 1;
      if ((log.attendance || '').toLowerCase() === 'present' || (log.attendance || '').toLowerCase() === 'late') {
        map[key].attended += 1;
      }
    });

    const list = Object.values(map);
    if (list.length === 0) {
      list.push({
        name: 'General Academic Attendance',
        code: 'GEN-101',
        attended: attendedLogs,
        total: totalLogs || 1,
        lastDate: new Date().toISOString().split('T')[0],
        mentor: 'Faculty Coordinator'
      });
    }
    return list;
  }, [logs, attendedLogs, totalLogs]);

  const handleSharePass = async (passTitle, extraText) => {
    const text = `${studentName}'s ${passTitle}: ${extraText} — Smart Attendance System`;
    if (navigator.share) {
      try {
        await navigator.share({ title: passTitle, text });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard?.writeText(text);
      alert('Pass details copied to clipboard!');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', animation: 'fadeInUp 0.3s ease both' }}>
      
      {/* ── Main Attendance Credential Card (High Contrast & Clear) ── */}
      <div
        onClick={() => {
          setSelectedPass({
            title: 'Attendance Credential Pass',
            subtitle: 'University Academic Record',
            rate: `${overallRate}%`,
            classes: `${attendedLogs} of ${totalLogs} classes attended`,
            bg: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            textColor: '#ffffff'
          });
        }}
        className="hover-elevate active-haptic"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          borderRadius: '16px',
          padding: '20px 22px',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(30, 58, 138, 0.2)',
          cursor: 'pointer',
          border: '1px solid #3b82f6',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#bfdbfe' }}>
              University Credential Pass
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
              {studentName}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#e0e7ff', marginTop: '2px' }}>
              Academic Attendance Session 2026
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
              {overallRate}%
            </div>
            <div style={{ fontSize: '0.78rem', color: '#bfdbfe', marginTop: '4px' }}>
              {attendedLogs}/{totalLogs} classes
            </div>
          </div>
        </div>

        {/* Barcode & Tap row */}
        <div style={{
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: '#e0e7ff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <QrCode size={16} />
            <span>Tap to inspect pass details</span>
          </div>
          <ChevronRight size={18} color="#ffffff" />
        </div>
      </div>

      {/* ── Exam Clearance Card (Clean White & High Contrast) ── */}
      <div
        onClick={() => {
          setSelectedPass({
            title: 'Semester Exam Clearance',
            subtitle: isExamClear ? 'Eligible for Term End Exams' : 'Attendance Shortage - Dean Review Required',
            rate: `${overallRate}%`,
            classes: isExamClear ? '75% threshold satisfied' : 'Deficit below 75%',
            bg: isExamClear ? '#166534' : '#991b1b',
            textColor: '#ffffff'
          });
        }}
        className="hover-elevate active-haptic"
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '16px 18px',
          border: `1.5px solid ${isExamClear ? '#bbf7d0' : '#fecaca'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: isExamClear ? '#dcfce7' : '#fee2e2',
            color: isExamClear ? '#15803d' : '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0f172a' }}>
              Semester Exam Clearance Status
            </div>
            <div style={{ fontSize: '0.78rem', color: isExamClear ? '#15803d' : '#dc2626', marginTop: '1px', fontWeight: 600 }}>
              {isExamClear ? 'Eligible for Term End Exams (75% cleared)' : 'Attendance Shortage (Below 75%)'}
            </div>
          </div>
        </div>
        <ChevronRight size={18} color="#94a3b8" />
      </div>

      {/* ── Subject Course Passes (Clean White Cards) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ margin: '6px 0 2px', fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
          Course Passes
        </h3>

        {subjectPasses.map((sub, idx) => {
          const subRate = sub.total > 0 ? Math.round((sub.attended / sub.total) * 100) : 100;
          return (
            <div
              key={sub.code || idx}
              onClick={() => {
                setSelectedPass({
                  title: sub.name,
                  subtitle: `Course Code: ${sub.code} · ${sub.mentor}`,
                  rate: `${subRate}%`,
                  classes: `${sub.attended} of ${sub.total} classes attended`,
                  bg: '#1e3a8a',
                  textColor: '#ffffff'
                });
              }}
              className="hover-elevate active-haptic"
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                  fontWeight: 800,
                  flexShrink: 0
                }}>
                  <BookOpen size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sub.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                    {sub.code} · {sub.mentor}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: subRate >= 75 ? '#16a34a' : '#dc2626' }}>
                    {subRate}%
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {sub.attended}/{sub.total}
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Pass Detail Modal (Flip-Side) ── */}
      {selectedPass && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease',
            touchAction: 'none'
          }}
          onClick={() => setSelectedPass(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: selectedPass.bg,
              color: '#ffffff',
              padding: '18px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  {selectedPass.title}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#e0e7ff', marginTop: '2px' }}>
                  {selectedPass.subtitle}
                </div>
              </div>

              <button
                onClick={() => setSelectedPass(null)}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>

            {/* Metrics */}
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                background: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <div style={{ fontSize: '0.64rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Attendance</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                    {selectedPass.rate}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.64rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Records</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                    {selectedPass.classes}
                  </div>
                </div>
              </div>

              {/* Barcode Strip */}
              <div style={{
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '14px',
                textAlign: 'center'
              }}>
                <div style={{
                  height: '40px',
                  background: 'repeating-linear-gradient(90deg, #0f172a 0px, #0f172a 3px, transparent 3px, transparent 6px, #0f172a 6px, #0f172a 10px, transparent 10px, transparent 12px, #0f172a 12px, #0f172a 13px, transparent 13px, transparent 17px, #0f172a 17px, #0f172a 20px)',
                  margin: '0 auto 6px',
                  width: '80%'
                }} />
                <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#64748b', letterSpacing: '1.5px' }}>
                  PASS-AUTH-2026-OK
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleSharePass(selectedPass.title, selectedPass.rate)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Share2 size={15} />
                  <span>Share Pass</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPass(null)}
                  style={{
                    padding: '10px 16px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
