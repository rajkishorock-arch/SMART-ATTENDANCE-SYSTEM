import { useState } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  FileText,
  Sparkles,
  ChevronRight,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { APP_VERSION } from '../utils/versionManager';

/**
 * Dedicated Golden Gate 'About System' page (#/about).
 * Realistic, clean system details and design attribution.
 */
export default function AboutSystemPage({
  displayInstitutionName = 'Smart Attendance System',
  currentUser = null,
  userRole = 'student',
  serverLatestVersion = null,
  updateActiveFlag = false,
  onCheckUpdate = null,
  onOpenPrivacy = null,
  onOpenReleaseNotes = null,
  playCyberSound = () => {},
}) {
  const [checkStatus, setCheckStatus] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const roleLabel = userRole
    ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
    : 'Member';

  const platformLabel =
    typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
      ? 'Android Mobile App'
      : 'Web & Progressive App';

  const handleCheckUpdates = async () => {
    playCyberSound('click');
    if (!onCheckUpdate) return;
    setIsChecking(true);
    setCheckStatus('');
    try {
      await onCheckUpdate();
      setCheckStatus(
        updateActiveFlag && serverLatestVersion
          ? `New version v${serverLatestVersion} is available.`
          : `You are running the latest version (v${APP_VERSION}).`
      );
    } catch {
      setCheckStatus('Unable to check updates right now. Please try again shortly.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Identity Summary */}
          <div className="golden-os-form-section" style={{ flexDirection: 'row', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '13px',
                background: 'linear-gradient(135deg, #785927 0%, #5e441b 100%)',
                color: '#ffffff',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(94, 68, 27, 0.2)',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#25231f', lineHeight: 1.25 }}>
                {displayInstitutionName}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b5b3e', fontWeight: 600, marginTop: '3px' }}>
                Smart Attendance & Campus Management · v{APP_VERSION}
              </div>
            </div>
          </div>

          {/* Creator Attribution */}
          <div
            className="golden-os-form-section"
            style={{
              background: 'linear-gradient(135deg, #fffdf8 0%, #f8eed9 100%)',
              borderColor: '#dfd0ae',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '11px',
                  background: '#ffffff',
                  border: '1px solid #e2d1ab',
                  color: '#785927',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <UserCheck size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#785927', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Designed & Developed By
                </div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#2b2112', marginTop: '2px' }}>
                  Rajkishor
                </div>
              </div>
            </div>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#6b4e1e', flexShrink: 0 }}>
              Creator
            </span>
          </div>

          {/* Application Details */}
          <div className="golden-os-form-section" style={{ gap: '8px' }}>
            <div className="golden-os-form-section-title">Application Details</div>
            {[
              { label: 'Institution', value: displayInstitutionName },
              { label: 'Installed Version', value: `v${APP_VERSION}` },
              {
                label: 'Update Status',
                value:
                  updateActiveFlag && serverLatestVersion
                    ? `v${serverLatestVersion} Available`
                    : 'Up to date',
                color: updateActiveFlag && serverLatestVersion ? '#b45309' : '#15803d',
              },
              { label: 'Account', value: currentUser?.email ? `${roleLabel} · ${currentUser.email}` : roleLabel },
              { label: 'Platform', value: platformLabel },
            ].map((row, idx, arr) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '6px 0',
                  borderBottom: idx < arr.length - 1 ? '1px solid #f2ead9' : 'none',
                  fontSize: '0.84rem',
                }}
              >
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>{row.label}</span>
                <span style={{ color: row.color || '#25231f', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {checkStatus && (
            <div role="status" className="feedback-banner is-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{checkStatus}</span>
            </div>
          )}

          {/* System Actions */}
          <div className="golden-os-list-shell">
            <button
              type="button"
              onClick={handleCheckUpdates}
              disabled={isChecking}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ width: '34px', height: '34px' }}>
                  <RefreshCw size={16} className={isChecking ? 'spin-icon' : ''} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                  {isChecking ? 'Checking for Updates...' : 'Check for Updates'}
                </span>
              </div>
              <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
            </button>

            {onOpenPrivacy && (
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  onOpenPrivacy();
                }}
                className="golden-os-list-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div className="golden-os-avatar" style={{ width: '34px', height: '34px' }}>
                    <FileText size={16} />
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                    Privacy Policy & Terms
                  </span>
                </div>
                <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
              </button>
            )}

            {userRole !== 'student' && onOpenReleaseNotes && (
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  onOpenReleaseNotes();
                }}
                className="golden-os-list-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div className="golden-os-avatar" style={{ width: '34px', height: '34px' }}>
                    <Sparkles size={16} />
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                    Release Notes & Build Info
                  </span>
                </div>
                <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
