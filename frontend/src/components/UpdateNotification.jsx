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
  return (
    <>
      {/* In-App Update Banner */}
      {updateAvailable && !updateDismissed && (
        <div style={{
          position: 'fixed',
          top: isMobileView ? '16px' : 0,
          right: isMobileView ? '16px' : 0,
          left: isMobileView ? 'auto' : 0,
          width: isMobileView ? '290px' : '100%',
          borderRadius: isMobileView ? '16px' : 0,
          zIndex: 99999,
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          border: isMobileView ? '1px solid rgba(0, 242, 254, 0.3)' : 'none',
          color: '#fff',
          display: 'flex',
          flexDirection: isMobileView ? 'column' : 'row',
          alignItems: isMobileView ? 'stretch' : 'center',
          justifyContent: isMobileView ? 'flex-start' : 'center',
          gap: isMobileView ? '10px' : '12px',
          padding: isMobileView ? '14px 16px' : 'calc(env(safe-area-inset-top, 8px) + 10px) 16px 10px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '0.82rem',
          fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          animation: isMobileView ? 'fadeInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'slideDown 0.4s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {updateAvailable.isOwnerBeta ? '🧪' : '🚀'} New update v{updateAvailable.version} is ready!
            </span>
            {isMobileView && (
              <button
                onClick={() => {
                  acknowledgeUpdateVersion(updateAvailable?.version);
                  setUpdateDismissed(true);
                  setUpdateAvailable(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: 1,
                }}
                aria-label="Dismiss update"
              >
                ×
              </button>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', justifyContent: isMobileView ? 'space-between' : 'center' }}>
            <button
              type="button"
              onClick={() => {
                if (updateAvailable?.downloadUrl) {
                  window.open(updateAvailable.downloadUrl, '_blank', 'noopener,noreferrer');
                }
                acknowledgeUpdateVersion(updateAvailable.version);
                setUpdateAvailable(null);
                setUpdateDismissed(true);
                setUpdateDownloadedToast(true);
                markCurrentVersionInstalled();
                setTimeout(() => setUpdateDownloadedToast(false), 6000);
              }}
              style={{
                background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                color: '#0f172a',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.78rem',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexGrow: 1,
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0, 242, 254, 0.2)',
              }}
            >
              ⬇️ Download APK
            </button>
            <button
              type="button"
              onClick={() => {
                acknowledgeUpdateVersion(updateAvailable.version);
                setUpdateAvailable(null);
                setUpdateDismissed(true);
              }}
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#cbd5e1',
                padding: '6px 12px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.75rem',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                flexGrow: isMobileView ? 0 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              Dismiss
            </button>
          </div>
          
          {!isMobileView && (
            <button
              onClick={() => {
                acknowledgeUpdateVersion(updateAvailable?.version);
                setUpdateDismissed(true);
                setUpdateAvailable(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '1.2rem',
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1,
              }}
              aria-label="Dismiss update"
            >
              ×
            </button>
          )}
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
