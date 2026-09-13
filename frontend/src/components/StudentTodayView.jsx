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

  // Overall attendance calculation
  const totalClasses = studentLogs.length;
  const attendedClasses = studentLogs.filter(l => l.attendance === 'Present' || l.attendance === 'Late').length;
  const attendanceRate = totalClasses > 0 ? parseFloat(((attendedClasses / totalClasses) * 100).toFixed(1)) : 0;
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
          padding: '20px',
          border: `1.5px solid ${todayCheckIn ? '#10b981' : '#f59e0b'}`,
          background: todayCheckIn ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
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
              width: '46px',
              height: '46px',
              borderRadius: 'var(--radius-full)',
              background: todayCheckIn ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {todayCheckIn ? (
              <CheckCircle2 size={24} color="#10b981" />
            ) : (
              <Clock size={24} color="#f59e0b" />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                {todayCheckIn ? (lang === 'hi' ? 'आज की उपस्थिति दर्ज है' : "Today's Attendance Recorded") : (lang === 'hi' ? 'आज अभी तक चेक-इन नहीं हुआ' : 'Not Checked In Yet Today')}
              </h3>
              <span className={`status-pill ${todayCheckIn ? 'status-pill-success' : 'status-pill-warning'}`} style={{ fontSize: '0.68rem' }}>
                {todayCheckIn ? 'Present' : 'Pending'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              {todayCheckIn
                ? `${t('checked_in_at', lang, { time: todayCheckIn.time || 'Morning' })} · ${todayCheckIn.department || 'Campus'}`
                : (lang === 'hi' ? 'क्लासरूम कियोस्क या शिक्षक के स्कैनर से स्कैन कराएं।' : 'Scan your face at your classroom scanner or teacher kiosk.')}
            </p>
          </div>
        </div>

        <button
          onClick={onRequestDispute}
          className="btn-secondary"
          style={{ minHeight: '38px', padding: '6px 14px', fontSize: '0.78rem' }}
        >
          <FileText size={13} color="#0ea5e9" />
          <span>{t('request_correction', lang)}</span>
        </button>
      </div>

      {/* ── Attendance Gauge Card ── */}
      <div className="surface-card" style={{ padding: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color={isSafe ? '#10b981' : '#ef4444'} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#fff' }}>
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
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            ({attendedClasses} / {totalClasses} {lang === 'hi' ? 'क्लासेज' : 'classes'})
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
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
            background: statusAdvice.safe ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${statusAdvice.safe ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: '0.8rem',
            color: statusAdvice.safe ? '#34d399' : '#f87171',
            lineHeight: 1.4
          }}>
            {statusAdvice.text}
          </div>
        )}
      </div>

      {/* ── Recent Attendance History (Last 5 days) ── */}
      <div className="surface-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#fff' }}>
              {lang === 'hi' ? 'हाल की उपस्थिति रिकॉर्ड' : 'Recent Check-in History'}
            </h3>
          </div>

          {onExportSummary && (
            <button
              onClick={onExportSummary}
              className="btn-ghost"
              style={{ minHeight: '32px', padding: '4px 10px', fontSize: '0.74rem' }}
            >
              <Download size={12} />
              <span>{lang === 'hi' ? 'डाउनलोड' : 'Download'}</span>
            </button>
          )}
        </div>

        {studentLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--color-text-muted)', fontSize: '0.84rem' }}>
            {lang === 'hi' ? 'कोई पिछला रिकॉर्ड उपलब्ध नहीं है।' : 'No past attendance history available yet.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {studentLogs.slice(0, 6).map((log, idx) => {
              const isPresent = log.attendance === 'Present' || log.attendance === 'Late';
              return (
                <div
                  key={log.id || idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#fff' }}>
                      {log.date || 'Class Session'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      {log.time || 'Recorded'} {log.department ? `· ${log.department}` : ''}
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
                        {lang === 'hi' ? 'आपत्ति दर्ज करें' : 'Dispute'}
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
  );
}
