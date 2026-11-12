
import { 
  Camera, 
  ShieldAlert, 
  FileText, 
  Smartphone, 
  Calendar, 
  ChevronRight,
  TrendingUp,
  Edit,
  UserCheck,
  UserX,
  PieChart
} from 'lucide-react';

export default function AdminPulseDashboard({
  stats,
  onOpenScanner,
  onOpenManualAttendance,
  onNavigateTab,
  lang = 'en'
}) {

  const presentToday = stats?.total_present_today ?? 0;
  const absentToday = stats?.total_absent_today ?? 0;
  const totalStudents = stats?.total_students ?? (presentToday + absentToday);
  const attendanceRate = stats?.average_attendance_rate ?? (totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0);

  return (
    <div className="admin-pulse-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeInUp 0.25s ease both' }}>
      {/* ── Today's Attendance Real-Time Snapshot (Promoted to Top) ── */}
      <div
        className="surface-card"
        style={{
          padding: '20px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                {lang === 'hi' ? 'आज की उपस्थिति' : "Today's Attendance"}
              </h2>
              <span className="status-pill status-pill-success" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                ● {lang === 'hi' ? 'सक्रिय सत्र' : 'Live Session'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              {lang === 'hi'
                ? `कुल ${totalStudents} नामांकित छात्र`
                : `${totalStudents} Enrolled Campus Students`}
            </p>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* 3 Quick Highlight Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          padding: '12px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#16a34a', marginBottom: '2px' }}>
              <UserCheck size={14} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Present</span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#16a34a', lineHeight: 1.1 }}>
              {presentToday}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>students</span>
          </div>

          <div style={{ textAlign: 'center', padding: '4px 0', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: absentToday > 0 ? '#ef4444' : '#64748b', marginBottom: '2px' }}>
              <UserX size={14} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Absent</span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: absentToday > 0 ? '#ef4444' : '#64748b', lineHeight: 1.1 }}>
              {absentToday}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>pending</span>
          </div>

          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#2563eb', marginBottom: '2px' }}>
              <TrendingUp size={14} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>Rate</span>
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#2563eb', lineHeight: 1.1 }}>
              {attendanceRate}%
            </div>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>average</span>
          </div>
        </div>

        {/* Action Buttons: 1-Tap Big Primary Action + Quick Manual Option */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={onOpenScanner}
            className="btn-primary hover-elevate"
            style={{
              flex: 1,
              minHeight: '44px',
              padding: '11px 18px',
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
            }}
          >
            <Camera size={18} />
            <span>{lang === 'hi' ? 'कैमरा स्कैनर खोलें' : 'Start Attendance Session'}</span>
          </button>

          {onOpenManualAttendance && (
            <button
              onClick={onOpenManualAttendance}
              className="btn-ghost hover-elevate"
              style={{
                minHeight: '44px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              title="Manual Attendance Register"
            >
              <Edit size={16} />
              <span className="hide-on-compact">Manual</span>
            </button>
          )}
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
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
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
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
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
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
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
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
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
