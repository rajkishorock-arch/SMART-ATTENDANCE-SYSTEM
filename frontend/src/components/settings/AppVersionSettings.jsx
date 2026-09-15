import { ArrowUpCircle } from 'lucide-react';
import VersionBadge from '../VersionBadge';
import {
  APP_VERSION,
  acknowledgeUpdateVersion,
  markCurrentVersionInstalled
} from '../../utils/versionManager';

export default function AppVersionSettings({
  currentUser,
  userRole,
  serverLatestVersion,
  updateActiveFlag,
  handleManualCheck,
  setUpdateAvailable,
  setUpdateDismissed,
  playCyberSound,
  setActiveSubSetting
}) {
  return (
    <div style={{
      padding: '32px',
      borderRadius: '28px',
      background: 'rgba(12, 16, 32, 0.92)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(0, 242, 254, 0.25)',
      boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 242, 254, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      color: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '18px' }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #00f2fe 0%, #a855f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
          boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)'
        }}>
          📱
        </div>
        <div>
          <h3 style={{
            color: '#f8fafc',
            margin: 0,
            fontSize: '1.4rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00f2fe 0%, #a78bfa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            App Version & Update Status Console
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.85rem', margin: '4px 0 0' }}>
            Monitor production releases, mobile APK updates, and server synchronization
          </p>
        </div>
      </div>

      <VersionBadge
        serverLatest={serverLatestVersion}
        updateActive={updateActiveFlag}
        onCheckUpdate={handleManualCheck}
      />

      {(userRole === 'admin' || currentUser?.email?.trim()?.toLowerCase() === 'rajkishorock@gmail.com') && (
        <div style={{
          padding: '20px 24px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(8, 145, 178, 0.08) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.2rem' }}>🚀</span>
              <h4 style={{ margin: 0, color: '#10b981', fontSize: '1.05rem', fontWeight: 700 }}>
                Admin Release Management Console
              </h4>
            </div>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.82rem', lineHeight: 1.4 }}>
              Publish a new system version, trigger GitHub Actions automated APK builds, and control the live update download banner for all users.
            </p>
          </div>
          <button
            type="button"
            className="bg-gradient-btn"
            onClick={() => {
              if (playCyberSound) playCyberSound('click');
              if (setActiveSubSetting) setActiveSubSetting('release_updates');
            }}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              background: 'linear-gradient(135deg, #10b981, #0891b2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <ArrowUpCircle size={16} /> Open Release Console →
          </button>
        </div>
      )}

      <div style={{
        padding: '20px',
        borderRadius: '18px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: 1.5 }}>
          💡 <strong>Installation Confirmation:</strong> After installing a new APK or deploying an update, tap the button below to confirm installation and dismiss update alerts until the next release.
        </div>

        <button
          type="button"
          onClick={() => {
            markCurrentVersionInstalled();
            if (serverLatestVersion) acknowledgeUpdateVersion(serverLatestVersion);
            if (setUpdateAvailable) setUpdateAvailable(null);
            if (setUpdateDismissed) setUpdateDismissed(true);
            if (playCyberSound) playCyberSound('success');
            alert(`✅ Version v${APP_VERSION} confirmed installed!`);
          }}
          style={{
            alignSelf: 'flex-start',
            padding: '14px 24px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            color: '#fff',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ✓ Confirm Installed & Dismiss Banner (v{APP_VERSION})
        </button>
      </div>
    </div>
  );
}
