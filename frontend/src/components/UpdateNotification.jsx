import {
  APP_VERSION,
  acknowledgeUpdateVersion,
  markCurrentVersionInstalled,
} from '../utils/versionManager';

export default function UpdateNotification({
  updateAvailable,
  updateDismissed,
  setUpdateDismissed,
  setUpdateAvailable,
  updateDownloadedToast,
  setUpdateDownloadedToast,
  serverLatestVersion,
  isMobileView,
}) {
  const handleDismiss = () => {
    try {
      acknowledgeUpdateVersion(updateAvailable?.version);
      if (updateAvailable?.version) {
        localStorage.setItem('smart_attendance_dismissed_update_' + updateAvailable.version, 'true');
      }
      sessionStorage.setItem('update_banner_dismissed', 'true');
    } catch { /* storage fallback */ }
    setUpdateDismissed(true);
    setUpdateAvailable(null);
  };

  const handleDownload = () => {
    if (updateAvailable?.downloadUrl) {
      window.open(updateAvailable.downloadUrl, '_blank', 'noopener,noreferrer');
    }
    try {
      acknowledgeUpdateVersion(updateAvailable?.version);
      if (updateAvailable?.version) {
        localStorage.setItem('smart_attendance_dismissed_update_' + updateAvailable.version, 'true');
      }
      sessionStorage.setItem('update_banner_dismissed', 'true');
    } catch { /* storage fallback */ }
    setUpdateAvailable(null);
    setUpdateDismissed(true);
    setUpdateDownloadedToast(true);
    markCurrentVersionInstalled();
    setTimeout(() => setUpdateDownloadedToast(false), 6000);
  };

  return (
    <>
      {/* Modern Professional In-App Update Modal Card */}
      {updateAvailable && !updateDismissed && (
        <div 
          style={{
            position: 'fixed',
            zIndex: 999999,
            bottom: isMobileView ? '84px' : '24px',
            right: isMobileView ? '16px' : '24px',
            left: isMobileView ? '16px' : 'auto',
            width: isMobileView ? 'auto' : '380px',
            maxWidth: 'calc(100vw - 32px)',
            margin: isMobileView ? '0 auto' : 0,
            borderRadius: '16px',
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(0, 0, 0, 0.06)',
            padding: '16px 18px',
            boxSizing: 'border-box',
            animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Header Row: Icon, Title & Close Button */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  minWidth: '40px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0,
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.1)',
                }}
              >
                {updateAvailable.isOwnerBeta ? '🧪' : '🚀'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                    Update v{updateAvailable.version}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                    READY
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.35 }}>
                  A newer version with performance and UI upgrades is available.
                </p>
              </div>
            </div>

            {/* Clear, High-Contrast Tap-Friendly Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="hover-elevate active-haptic"
              style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                borderRadius: '50%',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 700,
                padding: 0,
                flexShrink: 0,
                lineHeight: 1,
                transition: 'all 0.15s ease',
              }}
              aria-label="Close update notification"
              title="Close update notification"
            >
              ✕
            </button>
          </div>

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px', width: '100%', boxSizing: 'border-box' }}>
            <button
              type="button"
              onClick={handleDownload}
              className="hover-elevate active-haptic"
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>⬇️ Download APK</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="hover-elevate active-haptic"
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                background: '#f8fafc',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              Later
            </button>
          </div>
        </div>
      )}

      {/* Update Download Success Toast */}
      {updateDownloadedToast && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          background: 'linear-gradient(135deg, #065f46, #0891b2)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 20px',
          borderRadius: '12px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '1px solid rgba(16,185,129,0.4)',
          maxWidth: '90vw',
          animation: 'slideUp 0.4s ease-out',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '1.3rem' }}>✅</span>
          <div>
            <div style={{ fontWeight: 700 }}>Update acknowledged — banner hidden</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '2px' }}>
              You are on v{APP_VERSION}. Install v{updateAvailable?.version || serverLatestVersion} APK if on Android, then tap &quot;Already updated&quot;.
            </div>
          </div>
          <button
            onClick={() => setUpdateDownloadedToast(false)}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', cursor: 'pointer', padding: '0 2px', lineHeight: 1, marginLeft: '8px' }}
          >×</button>
        </div>
      )}
    </>
  );
}
