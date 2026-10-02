import { ArrowUpCircle, Smartphone, Rocket, CheckCircle2 } from 'lucide-react';
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
    <div className="surface-card" style={{
      padding: '32px',
      borderRadius: '20px',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      color: '#0f172a'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '18px' }}>
        <div style={{
          width: '46px',
          height: '46px',
          borderRadius: '12px',
          background: '#e0f2fe',
          border: '1px solid #bae6fd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0284c7'
        }}>
          <Smartphone size={24} />
        </div>
        <div>
          <h3 style={{
            color: '#0f172a',
            margin: 0,
            fontSize: '1.35rem',
            fontWeight: 800
          }}>
            App Version & Update Status Console
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0' }}>
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
          borderRadius: '16px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Rocket size={18} color="#166534" />
              <h4 style={{ margin: 0, color: '#166534', fontSize: '1.05rem', fontWeight: 700 }}>
                Admin Release Management Console
              </h4>
            </div>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem', lineHeight: 1.4 }}>
              Publish a new system version, trigger GitHub Actions automated APK builds, and control the live update download banner for all users.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (playCyberSound) playCyberSound('click');
              if (setActiveSubSetting) setActiveSubSetting('release_updates');
            }}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              background: '#059669',
              border: 'none',
              color: '#ffffff',
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
        borderRadius: '16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ color: '#334155', fontSize: '0.85rem', lineHeight: 1.5 }}>
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
            padding: '12px 22px',
            borderRadius: '10px',
            background: '#0284c7',
            border: 'none',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} /> Confirm Installed & Dismiss Banner (v{APP_VERSION})
        </button>
      </div>
    </div>
  );
}
