import { AlertCircle, CheckCircle2, Edit3, QrCode, X } from 'lucide-react';
import { t } from '../utils/i18n';

export function ScannerSuccessReceipt({ student, sessionInfo, onDismiss, lang = 'en' }) {
  if (!student) return null;
  const duplicate = student.status === 'Already Marked' || student.already_marked;
  const pending = student.isOffline || student.sync_status === 'PENDING';
  const Icon = duplicate ? AlertCircle : CheckCircle2;
  const hi = lang === 'hi';
  const title = duplicate ? (hi ? 'उपस्थिति पहले दर्ज है' : 'Already recorded today')
    : (hi ? 'उपस्थिति दर्ज हुई' : 'Attendance recorded');
  const details = [student.roll, student.subject_name || sessionInfo?.subject_name,
    student.clockTime || student.time].filter(Boolean).join(' · ');

  return (
    <section className="attendance-receipt" role="status" aria-live="polite">
      <Icon className={duplicate ? 'receipt-duplicate' : 'receipt-confirmed'} size={22} />
      <div className="attendance-receipt-copy">
        <small>{title}</small>
        <strong>{student.name}</strong>
        {details && <span>{details}</span>}
        {pending && <span>{hi ? 'सिंक बाकी है' : 'Saved offline · Sync pending'}</span>}
      </div>
      {onDismiss && <button type="button" aria-label={hi ? 'बंद करें' : 'Dismiss receipt'} onClick={onDismiss}><X size={18} /></button>}
    </section>
  );
}

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
          <Edit3 size={12} color="#987235" />
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
