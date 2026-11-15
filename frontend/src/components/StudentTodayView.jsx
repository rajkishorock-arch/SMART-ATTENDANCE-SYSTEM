import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  Clock, 
  FileText, 
  Download,
  Check,
  History,
  Layers
} from 'lucide-react';
import { t } from '../utils/i18n';

export default function StudentTodayView({
  studentLogs = [],
  onRequestDispute,
  onExportSummary,
  lang = 'en'
}) {
  const [historyScope, setHistoryScope] = useState('all'); // 'all' | 'today'

  // Helper to check if a log is from today
  const isLogToday = (log) => {
    if (!log || !log.date) return false;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    const slash = `${d}/${m}/${y}`;
    const slashNoPad = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
    const dash = `${d}-${m}-${y}`;
    const str = String(log.date).trim();
    return str === iso || str === slash || str === slashNoPad || str === dash || str.startsWith(iso);
  };

  // Sort logs newest first
  const sortedLogs = useMemo(() => {
    return [...studentLogs].sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeB.localeCompare(timeA);
    });
  }, [studentLogs]);

  // Today's check-in log
  const todayCheckIn = useMemo(() => {
    return sortedLogs.find(l => isLogToday(l) && (l.attendance === 'Present' || l.attendance === 'Late')) || null;
  }, [sortedLogs]);

  // Today's student logs list
  const todayStudentLogs = useMemo(() => {
    return sortedLogs.filter(isLogToday);
  }, [sortedLogs]);

  // Display logs based on toggle
  const displayLogs = useMemo(() => {
    return historyScope === 'today' ? todayStudentLogs : sortedLogs;
  }, [historyScope, todayStudentLogs, sortedLogs]);

  // Overall attendance calculation
  const totalClasses = studentLogs.length;
  const attendedClasses = studentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
  const rawRate = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 0;
  const attendanceRate = Math.min(100.0, Math.max(0.0, parseFloat(rawRate.toFixed(1))));
  const isSafe = attendanceRate >= 75;

  // Deficit or Safe Skips
  const statusAdvice = useMemo(() => {
    if (totalClasses === 0) return null;
    if (isSafe) {
      const skips = Math.floor((attendedClasses - 0.75 * totalClasses) / 0.75);
      return {
        safe: true,
        text: skips > 0
          ? (lang === 'hi' ? `आप 75% से ऊपर हैं। आप अभी सुरक्षित रूप से ${skips} क्लास मिस कर सकते हैं।` : `You are above 75%. You can safely miss up to ${skips} more class(es).`)
          : (lang === 'hi' ? 'आप ठीक 75% सीमा पर हैं। आगामी क्लास मिस न करें।' : 'You are right at the 75% threshold. Maintain regular attendance.')
      };
    } else {
      const needed = Math.ceil((0.75 * totalClasses - attendedClasses) / 0.25);
      return {
        safe: false,
        text: lang === 'hi'
          ? `चेतावनी: 75% सीमा पाने के लिए आपको लगातार ${needed} क्लास अटेंड करनी होंगी।`
          : `Deficit Alert: You need to attend the next ${needed} consecutive class(es) to recover 75%.`
      };
    }
  }, [totalClasses, attendedClasses, isSafe, lang]);

  return (
    <div className="student-today-view" style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeInUp 0.3s ease both' }}>
      
      {/* ── Today's Check-in Status Banner ── */}
      <div
        className="surface-card"
        style={{
          padding: '12px 16px',
          border: `1px solid ${todayCheckIn ? '#bbf7d0' : '#fde68a'}`,
          borderRadius: '14px',
          background: todayCheckIn ? '#f0fdf4' : '#fffbeb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: todayCheckIn ? '#dcfce7' : '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {todayCheckIn ? (
              <CheckCircle2 size={18} color="#15803d" />
            ) : (
              <Clock size={18} color="#d97706" />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: todayCheckIn ? '#166534' : '#92400e' }}>
              {todayCheckIn
                ? (lang === 'hi' ? 'आज की उपस्थिति दर्ज है' : "Today's Attendance Recorded")
                : (lang === 'hi' ? 'आज अभी तक चेक-इन नहीं किया' : 'Not Checked In Yet Today')}
            </div>
            <div style={{ fontSize: '0.74rem', color: todayCheckIn ? '#15803d' : '#b45309', marginTop: '1px' }}>
              {todayCheckIn
                ? `${lang === 'hi' ? 'चेक-इन समय:' : 'Checked in at'} ${todayCheckIn.time || 'Class Session'} ${todayCheckIn.department ? `· ${todayCheckIn.department}` : ''}`
                : (lang === 'hi' ? 'कक्षा में अपना वर्चुअल QR या फेस स्कैनर से अटेंडेंस दर्ज करें।' : 'Check in using your Virtual QR ID Pass or Face Scanner.')}
            </div>
          </div>
        </div>

        {!todayCheckIn && onRequestDispute && (
          <button
            onClick={() => onRequestDispute({ attendance: 'Absent', date: new Date().toISOString().split('T')[0] })}
            className="btn-ghost"
            style={{ minHeight: '32px', padding: '4px 12px', fontSize: '0.76rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b' }}
          >
            <FileText size={13} />
            <span>{lang === 'hi' ? 'सुधार अनुरोध' : 'Request Correction'}</span>
          </button>
        )}
      </div>

      {/* ── 2-Column Responsive Grid (My Attendance Rate + Recent Attendance History) ── */}
      <div className="dashboard-grid-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
        
        {/* Attendance Rate Card */}
        <div className="surface-card" style={{
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                {lang === 'hi' ? 'मेरी उपस्थिति दर' : 'My Attendance Rate'}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 900, color: isSafe ? '#16a34a' : '#dc2626', letterSpacing: '-0.5px' }}>
              {totalClasses > 0 ? `${attendanceRate}%` : '0%'}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
              ({attendedClasses}/{totalClasses} {lang === 'hi' ? 'कक्षाएं' : 'classes'})
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ width: '100%', height: '7px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', position: 'relative', marginBottom: '12px' }}>
            <div
              style={{
                height: '100%',
                width: `${attendanceRate}%`,
                background: isSafe ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f87171, #dc2626)',
                borderRadius: '999px',
                transition: 'width 0.4s ease'
              }}
            />
          </div>

          {/* Advice Banner */}
          {statusAdvice && (
            <div style={{
              background: statusAdvice.safe ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${statusAdvice.safe ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '0.76rem',
              color: statusAdvice.safe ? '#166534' : '#991b1b',
              lineHeight: 1.45,
              marginTop: 'auto'
            }}>
              {statusAdvice.text}
            </div>
          )}
        </div>

        {/* Recent Attendance History Card */}
        <div className="surface-card" style={{
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
        }}>
          {/* Header Row with Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                {lang === 'hi' ? 'हालिया उपस्थिति रिकॉर्ड' : 'Recent Check-in History'}
              </h3>
            </div>

            {/* Quick Filter: All vs Today */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => setHistoryScope('all')}
                style={{
                  padding: '3px 9px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: historyScope === 'all' ? '#ffffff' : 'transparent',
                  color: historyScope === 'all' ? '#1d4ed8' : '#64748b',
                  boxShadow: historyScope === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                All ({sortedLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setHistoryScope('today')}
                style={{
                  padding: '3px 9px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: historyScope === 'today' ? '#ffffff' : 'transparent',
                  color: historyScope === 'today' ? '#1d4ed8' : '#64748b',
                  boxShadow: historyScope === 'today' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Today ({todayStudentLogs.length})
              </button>
            </div>
          </div>

          {/* Logs List */}
          {displayLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 10px', color: '#64748b', fontSize: '0.82rem', margin: 'auto' }}>
              {historyScope === 'today'
                ? (lang === 'hi' ? 'आज का कोई उपस्थिति रिकॉर्ड उपलब्ध नहीं है।' : 'No attendance recorded for today yet.')
                : (lang === 'hi' ? 'कोई उपस्थिति रिकॉर्ड उपलब्ध नहीं है।' : 'No attendance records logged yet.')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '230px' }}>
              {displayLogs.slice(0, 8).map((log, idx) => {
                const isPresent = log.attendance === 'Present' || log.attendance === 'Late';
                const isToday = isLogToday(log);
                return (
                  <div
                    key={log.id || `${log.date}-${log.time}-${idx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: isToday ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${isToday ? '#bbf7d0' : '#e2e8f0'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {isToday ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', border: '1px solid #86efac', padding: '1px 6px', borderRadius: '4px' }}>
                            🟢 Today
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 700 }}>
                            📅 {log.date}
                          </span>
                        )}
                        {log.period_label && (
                          <span style={{ fontSize: '0.68rem', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            {log.period_label}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#334155', fontWeight: 600 }}>
                          📚 {log.subject_name || (log.subject_code ? `${log.subject_code}` : (log.department || 'General Attendance'))}
                        </span>
                        {log.time && <span style={{ color: '#64748b' }}>· 🕒 {log.time}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span className={`status-pill ${isPresent ? 'status-pill-success' : 'status-pill-danger'}`} style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                        {log.attendance || 'Present'}
                      </span>
                      {!isPresent && onRequestDispute && (
                        <button
                          onClick={() => onRequestDispute(log)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0284c7',
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          {t('dispute', lang)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
