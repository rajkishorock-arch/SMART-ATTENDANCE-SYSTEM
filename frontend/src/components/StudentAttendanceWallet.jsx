import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  Share2, 
  Award, 
  Flame, 
  CheckCircle2, 
  ShieldCheck, 
  QrCode, 
  ChevronRight, 
  Layers, 
  Sparkles, 
  X, 
  Download, 
  Calendar, 
  Clock, 
  BookOpen, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

export default function StudentAttendanceWallet({ logs = [], studentName = 'Student', subjects = [] }) {
  const [selectedPass, setSelectedPass] = useState(null); // active pass modal
  const [activeCardIndex, setActiveCardIndex] = useState(0); // which card is at front

  // Lock body scrolling when pass details modal is open
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

  // Handle Share Card
  const handleSharePass = async (passTitle, extraText) => {
    const text = `🎓 ${studentName}'s ${passTitle}: ${extraText} — Verified on Smart Attendance System`;
    if (navigator.share) {
      try {
        await navigator.share({ title: passTitle, text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard?.writeText(text);
      alert('Pass details copied to clipboard!');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '100%', animation: 'fadeInUp 0.3s ease both' }}>
      
      {/* ── Apple Wallet Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#2563eb' }}>
            APPLE WALLET STYLE PASSES
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 0' }}>
            Campus Attendance Wallet
          </h2>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '0.76rem',
          fontWeight: 700,
          color: '#1d4ed8'
        }}>
          <Layers size={14} />
          <span>{subjectPasses.length + 2} Active Passes</span>
        </div>
      </div>

      {/* ── Instructions Banner ── */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.76rem',
        color: '#64748b'
      }}>
        <span>💡 Tap any pass to bring it to front & view full barcode & audit details.</span>
        <span style={{ fontWeight: 700, color: '#2563eb' }}>Interactive Stack</span>
      </div>

      {/* ── Stacked Apple Wallet Passes Deck ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
        
        {/* PASS 1: Main Institutional Attendance Credential Pass (Black/Midnight Obsidian) */}
        <div
          onClick={() => {
            setActiveCardIndex(0);
            setSelectedPass({
              type: 'institutional',
              title: 'Institutional Attendance Pass',
              subtitle: 'Official University Credential',
              rate: `${overallRate}%`,
              classes: `${attendedLogs}/${totalLogs} classes`,
              bg: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
              textColor: '#ffffff',
              tag: 'VERIFIED CREDENTIAL'
            });
          }}
          className="hover-elevate active-haptic"
          style={{
            background: 'linear-gradient(135deg, #090d16 0%, #1e293b 100%)',
            borderRadius: '20px',
            padding: '22px 24px',
            color: '#ffffff',
            boxShadow: '0 12px 28px -6px rgba(15, 23, 42, 0.4)',
            cursor: 'pointer',
            border: '1px solid #334155',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
        >
          {/* Subtle contactless wave icon watermark */}
          <div style={{ position: 'absolute', top: '18px', right: '22px', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.85 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8' }}>
              NFC READY
            </span>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#38bdf8' }} />
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#38bdf8', marginBottom: '8px' }}>
            UNIVERSITAS CREDENTIAL PASS
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                {studentName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                Academic Attendance Card · 2026
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: overallRate >= 75 ? '#34d399' : '#f87171', letterSpacing: '-0.5px', lineHeight: 1 }}>
                {overallRate}%
              </div>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '3px' }}>
                {attendedLogs}/{totalLogs} classes
              </div>
            </div>
          </div>

          {/* Simulated Apple Wallet Barcode Strip */}
          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px dashed rgba(255, 255, 255, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#94a3b8' }}>
              <QrCode size={16} color="#38bdf8" />
              <span>Tap to inspect pass details & barcode</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8' }}>
              <span>Details</span>
              <ChevronRight size={16} />
            </div>
          </div>
        </div>

        {/* PASS 2: Exam Eligibility & Hall Clearance Ticket (Emerald Green) */}
        <div
          onClick={() => {
            setActiveCardIndex(1);
            setSelectedPass({
              type: 'exam',
              title: 'Semester Exam Hall Clearance Pass',
              subtitle: 'Official Academic Syndicate Clearance',
              rate: `${overallRate}% (${isExamClear ? 'Clear to Sit' : 'Debarment Risk'})`,
              classes: isExamClear ? 'Eligible for All Term End Exams' : 'Attendance Deficit - HOD Appeal Required',
              bg: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
              textColor: '#ffffff',
              tag: isExamClear ? 'HALL TICKET CLEARED' : 'ATTENDANCE SHORTAGE'
            });
          }}
          className="hover-elevate active-haptic"
          style={{
            background: isExamClear ? 'linear-gradient(135deg, #064e3b 0%, #047857 100%)' : 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)',
            borderRadius: '20px',
            padding: '20px 24px',
            color: '#ffffff',
            boxShadow: '0 8px 24px -4px rgba(6, 78, 59, 0.3)',
            cursor: 'pointer',
            border: `1px solid ${isExamClear ? '#10b981' : '#f87171'}`,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#a7f3d0' }}>
              EXAMINATION REGULATION PASS
            </span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff'
            }}>
              {isExamClear ? '✓ CLEARED' : '⚠ SHORTAGE'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                Semester Exam Hall Clearance
              </div>
              <div style={{ fontSize: '0.78rem', color: '#d1fae5', marginTop: '2px' }}>
                {isExamClear ? '75% Threshold requirement satisfied' : 'Attendance is below 75% regulatory requirement'}
              </div>
            </div>
            <ShieldCheck size={28} color="#a7f3d0" />
          </div>
        </div>

        {/* PASSES 3+: Subject Specific Course Boarding Passes */}
        {subjectPasses.map((sub, idx) => {
          const subRate = sub.total > 0 ? Math.round((sub.attended / sub.total) * 100) : 100;
          return (
            <div
              key={sub.code || idx}
              onClick={() => {
                setActiveCardIndex(idx + 2);
                setSelectedPass({
                  type: 'subject',
                  title: sub.name,
                  subtitle: `Course Code: ${sub.code} · ${sub.mentor}`,
                  rate: `${subRate}%`,
                  classes: `${sub.attended}/${sub.total} sessions attended`,
                  bg: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                  textColor: '#ffffff',
                  tag: 'SUBJECT PASS',
                  sub
                });
              }}
              className="hover-elevate active-haptic"
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  flexShrink: 0
                }}>
                  <BookOpen size={20} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#2563eb' }}>
                    {sub.code} · Lecture Pass
                  </div>
                  <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sub.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                    Instructor: {sub.mentor}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: subRate >= 75 ? '#16a34a' : '#dc2626' }}>
                    {subRate}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {sub.attended}/{sub.total}
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Apple Wallet Interactive Pass Detail Modal (Flip-Side) ── */}
      {selectedPass && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
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
              borderRadius: '24px',
              width: '100%',
              maxWidth: '390px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              background: selectedPass.bg,
              color: '#ffffff',
              padding: '20px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.85 }}>
                  {selectedPass.tag}
                </div>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800 }}>
                  {selectedPass.title}
                </h3>
                <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '2px' }}>
                  {selectedPass.subtitle}
                </div>
              </div>

              <button
                onClick={() => setSelectedPass(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 700
                }}
              >
                ✕
              </button>
            </div>

            {/* Pass Metrics */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                background: '#f8fafc',
                padding: '14px 16px',
                borderRadius: '14px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Pass Status</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                    Active & Valid
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Attendance Level</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                    {selectedPass.rate}
                  </div>
                </div>
              </div>

              {/* Barcode & Digital Pass Token */}
              <div style={{
                background: '#ffffff',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '14px',
                padding: '16px',
                textAlign: 'center'
              }}>
                {/* Visual Barcode bars */}
                <div style={{
                  height: '48px',
                  background: 'repeating-linear-gradient(90deg, #0f172a 0px, #0f172a 3px, transparent 3px, transparent 6px, #0f172a 6px, #0f172a 10px, transparent 10px, transparent 12px, #0f172a 12px, #0f172a 13px, transparent 13px, transparent 17px, #0f172a 17px, #0f172a 20px)',
                  margin: '0 auto 8px',
                  width: '85%'
                }} />
                <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#64748b', letterSpacing: '2px' }}>
                  PASS-TOKEN-{Math.abs(studentName.split('').reduce((a, b) => a + b.charCodeAt(0), 1000))}-2026
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                  Touchless Scan Code · Auto-verified by Campus Gatekeeper
                </div>
              </div>

              {/* Action Buttons */}
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
