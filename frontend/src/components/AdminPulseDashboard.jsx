import { useMemo } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Camera, 
  ShieldAlert, 
  FileText, 
  Smartphone, 
  Calendar, 
  ChevronRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { t } from '../utils/i18n';

export default function AdminPulseDashboard({
  stats,
  systemHealth,
  onOpenScanner,
  onNavigateTab,
  lang = 'en'
}) {
  const attendanceRate = useMemo(() => {
    return stats?.average_attendance_rate ?? 0;
  }, [stats]);

  const presentToday = stats?.total_present_today ?? 0;
  const absentToday = stats?.total_absent_today ?? 0;
  const totalStudents = stats?.total_students ?? (presentToday + absentToday);

  return (
    <div className="admin-pulse-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.25s ease both' }}>
      {/* ── Today's Attendance Overview ── */}
      <div
        className="surface-card"
        style={{
          padding: '20px 24px',
          background: 'var(--bg-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
              {lang === 'hi' ? 'आज की उपस्थिति' : "Today's Attendance Overview"}
            </h2>
            <span className="status-pill status-pill-success" style={{ fontSize: '0.7rem' }}>
              {lang === 'hi' ? 'सक्रिय' : 'Active Session'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
            {lang === 'hi'
              ? `कुल ${totalStudents} नामांकित छात्र • आज की उपस्थिति दर: ${attendanceRate}%`
              : `${totalStudents} Enrolled Students • Live Attendance Rate: ${attendanceRate}%`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={onOpenScanner}
            className="btn-primary"
            style={{ minHeight: '44px', padding: '10px 20px', fontSize: '0.88rem' }}
          >
            <Camera size={18} />
            <span>{lang === 'hi' ? 'स्कैनर खोलें' : 'Start Attendance Session'}</span>
          </button>
        </div>
      </div>

      {/* ── High-Impact Scorecards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {/* Card 1: Attendance Rate */}
        <div className="surface-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              {t('attendance_rate', lang)}
            </span>
            <TrendingUp size={18} color={attendanceRate >= 75 ? '#10b981' : '#f59e0b'} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: attendanceRate >= 75 ? '#10b981' : '#f59e0b' }}>
            {attendanceRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {attendanceRate >= 75 ? (lang === 'hi' ? 'सुरक्षित लक्ष्य से ऊपर' : 'Above target') : (lang === 'hi' ? 'चेतावनी स्तर' : 'Deficit below target')}
          </div>
        </div>

        {/* Card 2: Present Today */}
        <div className="surface-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              {t('present_today', lang)}
            </span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>
            {presentToday}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {lang === 'hi' ? 'बायोमेट्रिक से सत्याप‍ित' : 'Verified attendance'}
          </div>
        </div>

        {/* Card 3: Absent Today */}
        <div className="surface-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              {t('absent_today', lang)}
            </span>
            <AlertTriangle size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>
            {absentToday}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {lang === 'hi' ? 'अनुपस्थित छात्र' : 'Unmarked / Absent'}
          </div>
        </div>
      </div>

      {/* ── Action Required Attention Center ── */}
      <div className="surface-card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} color="#f59e0b" />
          <span>{lang === 'hi' ? 'त्वरित ध्यान केंद्र (Action Required)' : 'Action Required Center'}</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {/* Dispute Approvals */}
          <div
            onClick={() => onNavigateTab && onNavigateTab('disputes')}
            className="surface-card-hover"
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={20} color="#0ea5e9" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                  {lang === 'hi' ? 'छात्र उपस्थिति आपत्तियां' : 'Attendance Disputes'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                  {lang === 'hi' ? 'प्रमाण समीक्षा एवं स्वीकृति' : 'Review proof & approve'}
                </div>
              </div>
            </div>
            <ChevronRight size={16} color="var(--color-text-muted)" />
          </div>

          {/* Borderline Face Review */}
          <div
            onClick={() => onNavigateTab && onNavigateTab('face-review')}
            className="surface-card-hover"
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Camera size={20} color="#f59e0b" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                  {lang === 'hi' ? 'कम सटीकता वाले चेहरे' : 'Borderline Matches'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                  {lang === 'hi' ? '0.35 - 0.49 स्कोर समीक्षा' : 'Verify ambiguous scans'}
                </div>
              </div>
            </div>
            <ChevronRight size={16} color="var(--color-text-muted)" />
          </div>

          {/* Device Fleet Status */}
          <div
            onClick={() => onNavigateTab && onNavigateTab('devices')}
            className="surface-card-hover"
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Smartphone size={20} color="#10b981" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                  {lang === 'hi' ? 'कियोस्क एवं कैमरा फ्लीट' : 'Scanner Kiosk Fleet'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                  {lang === 'hi' ? 'हार्टबीट एवं बैटरी मॉनिटर' : 'Heartbeat & battery levels'}
                </div>
              </div>
            </div>
            <ChevronRight size={16} color="var(--color-text-muted)" />
          </div>

          {/* Academic Calendar */}
          <div
            onClick={() => onNavigateTab && onNavigateTab('calendar')}
            className="surface-card-hover"
            style={{
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={20} color="#a78bfa" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>
                  {lang === 'hi' ? 'अकादमिक कैलेंडर' : 'Academic Calendar'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                  {lang === 'hi' ? 'अवकाश एवं परीक्षा शेड्यूल' : 'Holidays & schedule lock'}
                </div>
              </div>
            </div>
            <ChevronRight size={16} color="var(--color-text-muted)" />
          </div>
        </div>
      </div>
    </div>
  );
}
