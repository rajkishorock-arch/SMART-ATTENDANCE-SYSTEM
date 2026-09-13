import { CheckCircle2, UserCheck, Cloud, QrCode, Edit3, X } from 'lucide-react';
import { t } from '../utils/i18n';

export function ScannerSuccessReceipt({
  student,
  sessionInfo,
  onDismiss,
  lang = 'en'
}) {
  if (!student) return null;

  const isLocalSaved = student.isOffline || student.sync_status === 'PENDING';

  return (
    <div
      className="scanner-student-card scanner-success-receipt"
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '14px 16px',
        animation: 'slideUpFade 0.25s cubic-bezier(0.16, 1, 0.3, 1) both'
      }}
    >
      {/* Top Header Row: Verified Icon, Name, Close Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(16, 185, 129, 0.18)',
              border: '1.5px solid rgba(16, 185, 129, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <CheckCircle2 size={22} color="#10b981" />
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.98rem',
                fontWeight: 800,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {student.name}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{student.roll || 'VERIFIED'}</span>
              {student.dep && <span>• {student.dep}</span>}
            </div>
          </div>
        </div>

        {/* Status Pill & Dismiss */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span
            className={`status-pill ${student.status === 'Already Marked' ? 'status-pill-warning' : 'status-pill-success'}`}
            style={{ fontSize: '0.7rem', padding: '3px 8px' }}
          >
            {student.status === 'Already Marked' ? t('already_marked', lang) : t('attendance_recorded', lang)}
          </span>
          {onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Dismiss receipt"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Metadata Detail Row: Subject, Time, Sync Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          fontSize: '0.73rem',
          color: 'var(--color-text-secondary)',
          flexWrap: 'wrap',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <UserCheck size={12} color="#0ea5e9" />
          <span>{sessionInfo?.subject_name || sessionInfo?.name || student.time || 'Class Session'}</span>
          {student.time && <span>• {student.time}</span>}
        </div>

        {/* Sync Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Cloud size={12} color={isLocalSaved ? '#f59e0b' : '#10b981'} />
          <span style={{ color: isLocalSaved ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
            {isLocalSaved ? t('saved_on_device', lang) : t('synced_to_cloud', lang)}
          </span>
          {student.confidence && (
            <span style={{ color: 'var(--color-text-muted)', marginLeft: '4px' }}>
              ({student.confidence}%)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Clean contextual fallback buttons shown when camera has difficulty recognizing
 */
export function ScannerFallbackOptions({ onManual, onQr, lang = 'en' }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(80px + env(safe-area-inset-bottom, 16px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 25,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: 'min(92vw, 380px)',
        justifyContent: 'center',
        animation: 'fadeInUp 0.3s ease both'
      }}
    >
      {onManual && (
        <button
          onClick={onManual}
          className="btn-secondary"
          style={{
            minHeight: '36px',
            padding: '6px 12px',
            fontSize: '0.74rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(14, 22, 38, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <Edit3 size={12} color="#0ea5e9" />
          <span>{t('manual_entry', lang)}</span>
        </button>
      )}

      {onQr && (
        <button
          onClick={onQr}
          className="btn-secondary"
          style={{
            minHeight: '36px',
            padding: '6px 12px',
            fontSize: '0.74rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(14, 22, 38, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--border-subtle)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <QrCode size={12} color="#10b981" />
          <span>QR Code</span>
        </button>
      )}
    </div>
  );
}

export default ScannerSuccessReceipt;
