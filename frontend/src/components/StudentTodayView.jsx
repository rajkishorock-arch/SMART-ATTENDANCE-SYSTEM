import { useMemo } from 'react';
import { 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  Clock, 
  FileText, 
  Download 
} from 'lucide-react';
import { t } from '../utils/i18n';

export default function StudentTodayView({
  studentLogs = [],
  onRequestDispute,
  onExportSummary,
  lang = 'en'
}) {
  const todayStr = useMemo(() => new Date().toLocaleDateString('en-GB'), []);
  const todayStrIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's check-in log
  const todayCheckIn = useMemo(() => {
    return studentLogs.find(l => {
      const d = l.date || '';
      return (d === todayStr || d === todayStrIso) && (l.attendance === 'Present' || l.attendance === 'Late');
    }) || null;
  }, [studentLogs, todayStr, todayStrIso]);

  // Today's student logs list
  const todayStudentLogs = useMemo(() => {
    return studentLogs.filter(l => {
      const d = l.date || '';
      return d === todayStr || d === todayStrIso;
    });
  }, [studentLogs, todayStr, todayStrIso]);

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
      // Safe skips formula: floor((attended - 0.75 * total) / 0.75)
      const skips = Math.floor((attendedClasses - 0.75 * totalClasses) / 0.75);
      return {
        safe: true,
        text: skips > 0
          ? (lang === 'hi' ? `आप 75% से ऊपर हैं। आप अभी सुरक्षित रूप से ${skips} क्लास मिस कर सकते हैं।` : `You are above 75%. You can safely miss up to ${skips} more class(es).`)
          : (lang === 'hi' ? 'आप ठीक 75% सीमा पर हैं। आगामी क्लास मिस न करें।' : 'You are right at the 75% threshold. Maintain regular attendance.')
      };
    } else {
      // Classes needed: ceil((0.75 * total - attended) / 0.25)
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
    <div className="student-today-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeInUp 0.3s ease both' }}>
      {/* ── Today's Check-in Status Banner ── */}
      <div
        className="surface-card"
        style={{
          padding: '12px 14px',
          border: `1px solid ${todayCheckIn ? '#a7f3d0' : '#fde68a'}`,
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
              background: todayCheckIn ? '#d1fae5' : '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {todayCheckIn ? (
              <CheckCircle2 size={18} color="#10b981" />
            ) : (
              <Clock size={18} color="#d97706" />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
                {todayCheckIn ? (lang === 'hi' ? 'आज की उपस्थिति दर्ज है' : "Today's Attendance Recorded") : (lang === 'hi' ? 'आज अभी तक चेक-इन नहीं हुआ' : 'Not Checked In Yet Today')}
              </h3>
              <span className={`status-pill ${todayCheckIn ? 'status-pill-success' : 'status-pill-warning'}`} style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
                {todayCheckIn ? 'Present' : 'Pending'}
              </span>
            </div>
            {todayCheckIn && (
              <div style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#16a34a', fontWeight: 600 }}>
                {t('checked_in_at', lang, { time: todayCheckIn.time || 'Morning' })} · {todayCheckIn.department || 'Campus'}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onRequestDispute}
          className="btn-secondary"
          style={{ minHeight: '32px', padding: '5px 12px', fontSize: '0.76rem', borderRadius: '8px' }}
        >
          <FileText size={13} color="#0ea5e9" />
          <span>{t('request_correction', lang)}</span>
        </button>
      </div>

      {/* ── Desktop 2-Column Responsive Grid (My Attendance Rate + Today's Recent Check-in History) ── */}
      <div className="student-today-cards-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        alignItems: 'stretch'
      }}>
        {/* ── Attendance Gauge Card ── */}
        <div className="surface-card" style={{
          padding: '22px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color={isSafe ? '#10b981' : '#ef4444'} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                {t('my_attendance_rate', lang)}
              </h3>
            </div>

            <span
              className={`status-pill ${isSafe ? 'status-pill-success' : 'status-pill-danger'}`}
              style={{ fontSize: '0.72rem', padding: '4px 10px' }}
            >
              {isSafe ? t('safe_zone', lang) : t('deficit_warning', lang)}
            </span>
          </div>

          {/* Big percentage & progress bar */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 900, color: isSafe ? '#10b981' : '#ef4444' }}>
              {attendanceRate}%
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              ({attendedClasses} / {totalClasses} {lang === 'hi' ? 'क्लासेज' : 'classes'})
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
            <div
              style={{
                width: `${Math.min(100, attendanceRate)}%`,
                height: '100%',
                background: isSafe ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                borderRadius: '4px',
                transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />
          </div>

          {/* Actionable Advice Pill */}
          {statusAdvice && (
            <div style={{
              background: statusAdvice.safe ? '#eff6ff' : '#fef2f2',
              border: `1px solid ${statusAdvice.safe ? '#bfdbfe' : '#fecaca'}`,
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.8rem',
              color: statusAdvice.safe ? '#1d4ed8' : '#dc2626',
              lineHeight: 1.4,
              marginTop: 'auto'
            }}>
              {statusAdvice.text}
            </div>
          )}
        </div>

        {/* ── Today's Attendance History (Last 5 scans today) ── */}
        <div className="surface-card" style={{
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                {lang === 'hi' ? 'आज की उपस्थिति रिकॉर्ड' : "Today's Recent Check-in History"}
              </h3>
            </div>

            {onExportSummary && (
              <button
                onClick={onExportSummary}
                className="btn-ghost"
                style={{ minHeight: '30px', padding: '4px 10px', fontSize: '0.74rem', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', color: '#334155' }}
              >
                <Download size={12} />
                <span>{lang === 'hi' ? 'डाउनलोड' : 'Download'}</span>
              </button>
            )}
          </div>

          {todayStudentLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748b', fontSize: '0.84rem', margin: 'auto' }}>
              {lang === 'hi' ? 'आज का कोई उपस्थिति रिकॉर्ड उपलब्ध नहीं है।' : 'No attendance recorded for today yet.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
              {todayStudentLogs.slice(0, 5).map((log, idx) => {
                const isPresent = log.attendance === 'Present' || log.attendance === 'Late';
                return (
                  <div
                    key={log.id || idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>📅 {log.date || 'Today'}</span>
                        {log.period_label && (
                          <span style={{ fontSize: '0.7rem', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            ⏰ {log.period_label}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ color: '#334155', fontWeight: 600 }}>
                          📚 {log.subject_name ? log.subject_name : (log.subject_code ? `${log.subject_code}` : (log.department || 'General Attendance'))}
                        </span>
                        {log.time && <span style={{ color: '#64748b' }}>· 🕒 {log.time}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`status-pill ${isPresent ? 'status-pill-success' : 'status-pill-danger'}`} style={{ fontSize: '0.7rem' }}>
                        {log.attendance || 'Present'}
                      </span>
                      {!isPresent && onRequestDispute && (
                        <button
                          onClick={() => onRequestDispute(log)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0ea5e9',
                            fontSize: '0.72rem',
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
