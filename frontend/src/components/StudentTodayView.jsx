import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  TrendingUp,
  Calendar,
  Clock,
  FileText,
} from 'lucide-react';
import { t } from '../utils/i18n';
import { getInitials } from '../utils/attendanceDateUtils';

const formatStudentStatusLabel = (raw) => {
  const s = String(raw || 'Present').trim();
  if (s.toUpperCase() === 'CLASS_CANCELLED') return 'Cancelled (Exempt)';
  return s;
};

export default function StudentTodayView({
  studentLogs = [],
  onRequestDispute,
  lang = 'en',
}) {
  const [historyScope, setHistoryScope] = useState('all'); // 'all' | 'today'

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

  const todayCheckIn = useMemo(() => {
    return (
      sortedLogs.find(
        (l) => isLogToday(l) && ['Present', 'Late', 'Excused'].includes(l.attendance)
      ) || null
    );
  }, [sortedLogs]);

  const todayStudentLogs = useMemo(() => sortedLogs.filter(isLogToday), [sortedLogs]);

  const displayLogs = useMemo(
    () => (historyScope === 'today' ? todayStudentLogs : sortedLogs),
    [historyScope, todayStudentLogs, sortedLogs]
  );

  // Exclude cancelled classes so students are never penalized when faculty cancels class
  const conductedLogs = useMemo(
    () => studentLogs.filter((l) => String(l?.attendance || '').toUpperCase() !== 'CLASS_CANCELLED'),
    [studentLogs]
  );
  const totalClasses = conductedLogs.length;
  const attendedClasses = conductedLogs.filter((l) =>
    ['Present', 'Late', 'Excused'].includes(l.attendance)
  ).length;
  const rawRate = totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 100.0;
  const attendanceRate =
    totalClasses > 0
      ? Math.min(100.0, Math.max(0.0, parseFloat(rawRate.toFixed(1))))
      : (studentLogs.length > 0 ? 100.0 : 0);
  const isSafe = attendanceRate >= 75 || (studentLogs.length > 0 && totalClasses === 0);

  const statusAdvice = useMemo(() => {
    if (studentLogs.length === 0) return null;
    if (totalClasses === 0) {
      return {
        safe: true,
        text: lang === 'hi'
          ? 'रद्द की गई कक्षाएं आपकी उपस्थिति दर को प्रभावित नहीं करतीं'
          : 'Cancelled classes are exempt from attendance penalty',
      };
    }
    if (isSafe) {
      const skips = Math.floor((attendedClasses - 0.75 * totalClasses) / 0.75);
      return {
        safe: true,
        text:
          skips > 0
            ? lang === 'hi'
              ? `आप 75% से ऊपर हैं · अभी सुरक्षित रूप से ${skips} क्लास छोड़ सकते हैं`
              : `Above 75% · You can safely miss up to ${skips} more class(es)`
            : lang === 'hi'
              ? 'आप 75% सीमा पर हैं · नियमित उपस्थिति बनाए रखें'
              : 'At 75% threshold · Maintain regular attendance',
      };
    }
    const needed = Math.ceil((0.75 * totalClasses - attendedClasses) / 0.25);
    return {
      safe: false,
      text:
        lang === 'hi'
          ? `75% के लिए लगातार ${needed} क्लास अटेंड करनी होंगी`
          : `Attend next ${needed} consecutive class(es) to reach 75%`,
    };
  }, [studentLogs.length, totalClasses, attendedClasses, isSafe, lang]);

  const goldenCardStyle = {
    background: 'linear-gradient(160deg, rgba(255, 253, 248, 0.98) 0%, rgba(248, 242, 228, 0.95) 100%)',
    border: '1px solid #dfd0ae',
    borderRadius: '18px',
    padding: '16px',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.92), 0 8px 24px rgba(89, 64, 25, 0.08)',
    boxSizing: 'border-box',
    width: '100%',
    minWidth: 0,
  };

  return (
    <div
      className="student-today-view"
      style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', minWidth: 0 }}
    >
      {/* ── Unified Top Pair 1 & 2 (Golden Gate Cards) ── */}
      <div className="golden-os-fields-2" style={{ width: '100%', minWidth: 0 }}>
        {/* Card 1: Today's Check-in Status */}
        <div style={{ ...goldenCardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              className="golden-os-avatar"
              style={
                todayCheckIn
                  ? { background: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }
                  : undefined
              }
            >
              {todayCheckIn ? <CheckCircle2 size={18} /> : <Clock size={18} />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#25231f' }}>
                {todayCheckIn
                  ? lang === 'hi'
                    ? 'आज की उपस्थिति दर्ज है'
                    : "Today's Attendance Recorded"
                  : lang === 'hi'
                    ? 'आज अभी तक चेक-इन नहीं किया'
                    : 'Not Checked In Yet Today'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b5b3e', fontWeight: 500, marginTop: '2px' }}>
                {todayCheckIn
                  ? `${lang === 'hi' ? 'चेक-इन:' : 'Checked in at'} ${todayCheckIn.time || 'Class Session'}${todayCheckIn.department ? ` · ${todayCheckIn.department}` : ''}`
                  : lang === 'hi'
                    ? 'वर्चुअल QR पास या फेस स्कैनर से चेक-इन करें'
                    : 'Use Virtual QR Pass or Face Scanner to check in'}
              </div>
            </div>
          </div>

          {!todayCheckIn && onRequestDispute && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eadfcb', paddingTop: '10px' }}>
              <button
                type="button"
                onClick={() => onRequestDispute({ attendance: 'Absent', date: new Date().toISOString().split('T')[0] })}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 13px',
                  fontSize: '0.77rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: '1px solid #d4be8e',
                  background: '#fffdf8',
                  color: '#5c4218',
                  cursor: 'pointer',
                }}
              >
                <FileText size={13} />
                <span>{lang === 'hi' ? 'सुधार अनुरोध' : 'Request Correction'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Card 2: Attendance Standing (Golden Gate Unified) */}
        <div style={{ ...goldenCardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div className="golden-os-avatar" style={{ width: '36px', height: '36px' }}>
                <TrendingUp size={17} />
              </div>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#25231f' }}>
                {lang === 'hi' ? 'मेरी उपस्थिति दर' : 'My Attendance Rate'}
              </h3>
            </div>
            <span style={{ fontSize: '0.76rem', color: '#6b5b3e', fontWeight: 700, flexShrink: 0 }}>
              {attendedClasses}/{totalClasses} {lang === 'hi' ? 'कक्षाएं' : 'classes'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: isSafe ? '#047857' : '#b91c1c', letterSpacing: '-0.5px', lineHeight: 1, flexShrink: 0 }}>
              {studentLogs.length > 0 ? `${attendanceRate}%` : '0%'}
            </span>
            <div style={{ flex: 1, minWidth: 0, height: '8px', background: '#e7dac0', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${attendanceRate}%`,
                  background: isSafe ? 'linear-gradient(90deg, #10b981, #047857)' : 'linear-gradient(90deg, #ef4444, #b91c1c)',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>

          {statusAdvice && (
            <div
              style={{
                borderTop: '1px solid #eadfcb',
                paddingTop: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: statusAdvice.safe ? '#047857' : '#b91c1c',
                lineHeight: 1.35,
              }}
            >
              {statusAdvice.text}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Check-in History (Clean Single-Line Golden Gate List, Zero Status Pill Boxes) ── */}
      <div style={goldenCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <Calendar size={17} color="#785927" />
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#25231f' }}>
              {lang === 'hi' ? 'हालिया उपस्थिति रिकॉर्ड' : 'Recent Check-in History'}
            </h3>
          </div>

          <div className="golden-os-segmented">
            <button
              type="button"
              className={`golden-os-segmented-btn ${historyScope === 'all' ? 'active' : ''}`}
              onClick={() => setHistoryScope('all')}
              style={{ padding: '4px 10px', fontSize: '0.73rem' }}
            >
              All ({sortedLogs.length})
            </button>
            <button
              type="button"
              className={`golden-os-segmented-btn ${historyScope === 'today' ? 'active' : ''}`}
              onClick={() => setHistoryScope('today')}
              style={{ padding: '4px 10px', fontSize: '0.73rem' }}
            >
              Today ({todayStudentLogs.length})
            </button>
          </div>
        </div>

        {displayLogs.length === 0 ? (
          <div className="golden-os-inset-card" style={{ textAlign: 'center', padding: '22px 12px', fontSize: '0.8rem', color: '#6b5b3e' }}>
            {historyScope === 'today'
              ? lang === 'hi'
                ? 'आज का कोई उपस्थिति रिकॉर्ड उपलब्ध नहीं है।'
                : 'No attendance recorded for today yet.'
              : lang === 'hi'
                ? 'कोई उपस्थिति रिकॉर्ड उपलब्ध नहीं है।'
                : 'No attendance records logged yet.'}
          </div>
        ) : (
          <div className="golden-os-list-shell" style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {displayLogs.slice(0, 8).map((log, idx) => {
              const rawStatus = String(log.attendance || 'Present');
              const isExempt = rawStatus.toUpperCase() === 'CLASS_CANCELLED';
              const isPresent = ['Present', 'Late', 'Excused'].includes(rawStatus);
              const isToday = isLogToday(log);
              const subjectLabel = log.subject_name || (log.subject_code ? `${log.subject_code}` : log.department || 'General Attendance');
              const compactPeriod = log.period_label
                ? String(log.period_label).replace(/\s*\([^)]*\)/, '').trim()
                : '';
              const metaParts = [
                isToday ? 'Today' : log.date,
                formatStudentStatusLabel(rawStatus),
                compactPeriod || log.time || '',
              ].filter(Boolean);

              return (
                <div key={log.record_id || log.id || `${log.date}-${log.time}-${idx}`} className="golden-os-list-row" style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0, flex: 1 }}>
                    <div
                      className="golden-os-avatar"
                      style={{
                        width: '36px',
                        height: '36px',
                        fontSize: '0.72rem',
                        ...(!isPresent && !isExempt ? { background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' } : undefined),
                      }}
                    >
                      {getInitials(subjectLabel, 'AT')}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: '#25231f',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {subjectLabel}
                      </div>
                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: isPresent || isExempt ? '#6b5b3e' : '#b91c1c',
                          fontWeight: 500,
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {metaParts.join(' · ')}
                      </div>
                    </div>
                  </div>
                  {!isPresent && !isExempt && onRequestDispute && (
                    <button
                      type="button"
                      onClick={() => onRequestDispute(log)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#80602c',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        flexShrink: 0,
                      }}
                    >
                      {t('dispute', lang)}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
