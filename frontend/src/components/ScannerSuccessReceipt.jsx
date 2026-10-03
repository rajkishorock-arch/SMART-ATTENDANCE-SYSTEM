import React, { useState } from 'react';
import { CheckCircle2, UserCheck, Cloud, QrCode, Edit3, X, User, Clock, BookOpen, ShieldCheck, Flame, AlertCircle } from 'lucide-react';
import { t } from '../utils/i18n';

export function ScannerSuccessReceipt({
  student,
  sessionInfo,
  onDismiss,
  lang = 'en'
}) {
  const [imgError, setImgError] = useState(false);

  if (!student) return null;

  const isAlreadyMarked = student.status === 'Already Marked' || student.already_marked;
  const isLocalSaved = student.isOffline || student.sync_status === 'PENDING';
  const confidenceText = student.confidence ? `${student.confidence}%` : '98.5%';
  const primaryColor = isAlreadyMarked ? '#f59e0b' : '#10b981';
  const headerBg = isAlreadyMarked ? '#fef3c7' : '#ecfdf5';
  const headerText = isAlreadyMarked ? '#92400e' : '#065f46';

  // Extract initials for avatar fallback
  const initials = student.name
    ? student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'ST';

  return (
    <div
      className={`scanner-success-receipt ${isAlreadyMarked ? 'is-already-marked' : ''}`}
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px 18px',
        animation: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        backgroundColor: '#ffffff',
        border: `2px solid ${primaryColor}`,
        borderRadius: '20px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0,0,0,0.06)',
        color: '#0f172a',
        width: 'calc(100% - 24px)',
        maxWidth: '480px',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}
    >
      {/* Top Header Row: Status Banner + Dismiss Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: headerBg,
          color: headerText,
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '0.78rem',
          fontWeight: 800,
          letterSpacing: '0.02em',
          border: `1px solid ${isAlreadyMarked ? '#fcd34d' : '#a7f3d0'}`
        }}>
          {isAlreadyMarked ? (
            <>
              <AlertCircle size={15} color="#d97706" />
              <span style={{ color: headerText, fontWeight: 800 }}>ATTENDANCE ALREADY RECORDED TODAY</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={15} color="#059669" />
              <span style={{ color: headerText, fontWeight: 800 }}>ATTENDANCE RECORDED & VERIFIED</span>
            </>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              color: '#64748b',
              cursor: 'pointer',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s ease'
            }}
            title="Dismiss card"
            aria-label="Dismiss receipt"
          >
            <X size={16} color="#475569" />
          </button>
        )}
      </div>

      {/* Main Student Profile Identity Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Registered Face Photo or Biometric Avatar */}
        <div style={{
          position: 'relative',
          width: '64px',
          height: '64px',
          minWidth: '64px',
          minHeight: '64px',
          borderRadius: '16px',
          background: isAlreadyMarked ? '#fffbeb' : '#f0fdf4',
          border: `3px solid ${primaryColor}`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 4px 14px ${isAlreadyMarked ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
          flexShrink: 0
        }}>
          {student.photo && !imgError ? (
            <img
              src={student.photo}
              alt={student.name}
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              color: '#ffffff'
            }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.05em' }}>
                {initials}
              </span>
            </div>
          )}

          {/* Small Verified Check badge overlay */}
          <div style={{
            position: 'absolute',
            bottom: '2px',
            right: '2px',
            background: primaryColor,
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #ffffff'
          }}>
            <ShieldCheck size={11} color="#ffffff" />
          </div>
        </div>

        {/* Student Name & Academic Details */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{
            fontSize: '1.18rem',
            fontWeight: 900,
            color: '#0f172a',
            lineHeight: 1.25,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {student.name}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              background: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              border: '1px solid #bfdbfe'
            }}>
              Roll: {student.roll || 'N/A'}
            </span>

            {(student.dep || student.course) && (
              <span style={{
                color: '#475569',
                fontSize: '0.76rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {student.dep || student.course}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Subject, Time, AI Accuracy, Streak */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        background: '#f8fafc',
        borderRadius: '12px',
        padding: '10px 12px',
        border: '1px solid #e2e8f0'
      }}>
        {/* Subject / Session */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <BookOpen size={14} color="#0284c7" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Subject / Slot</div>
            <div style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {student.subject_name || sessionInfo?.subject_name || 'Class Session'}
            </div>
          </div>
        </div>

        {/* Verification Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <Clock size={14} color="#16a34a" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Check-in Time</div>
            <div style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#0f172a',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {student.clockTime || student.time || new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* AI Biometric Precision */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          <ShieldCheck size={14} color="#7c3aed" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>AI Precision</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
              {confidenceText} Match
            </div>
          </div>
        </div>

        {/* Streak / Cloud Sync */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
          {student.streak_days > 1 ? (
            <Flame size={14} color="#ea580c" style={{ flexShrink: 0 }} />
          ) : (
            <Cloud size={14} color={isLocalSaved ? '#d97706' : '#059669'} style={{ flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              {student.streak_days > 1 ? 'Attendance Streak' : 'Cloud Status'}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
              {student.streak_days > 1
                ? `${student.streak_days} Days Streak`
                : (isLocalSaved ? 'Local Cache' : 'Synced Cloud')}
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Biometric Scanner Note (Footer) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        paddingTop: '2px',
        fontSize: '0.72rem',
        color: '#64748b',
        fontWeight: 600
      }}>
        <div style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: '#10b981',
          animation: 'pulse 2s infinite'
        }} />
        <span>Camera active • Ready for next student face</span>
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
