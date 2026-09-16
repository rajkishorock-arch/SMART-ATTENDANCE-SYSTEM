import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/platform';
import { wakeBackend } from '../../utils/cameraScanner';
import { APP_VERSION } from '../../utils/versionManager';

export default function ReleaseSettings({
  token,
  isDemoMode,
  playCyberSound
}) {
  // System Release Update States
  const [releaseVersion, setReleaseVersion] = useState('');
  const [releaseDownloadUrl, setReleaseDownloadUrl] = useState('');
  const [releaseMasterPassword, setReleaseMasterPassword] = useState('');
  const [isReleasingUpdate, setIsReleasingUpdate] = useState(false);
  const [releaseSuccessMessage, setReleaseSuccessMessage] = useState('');
  const [releaseErrorMessage, setReleaseErrorMessage] = useState('');
  const [buildStatus, setBuildStatus] = useState('idle');
  const [buildVersion, setBuildVersion] = useState('');
  const [buildError, setBuildError] = useState('');
  const [showManualReleaseForm, setShowManualReleaseForm] = useState(false);
  const [isTriggeringBuild, setIsTriggeringBuild] = useState(false);
  const [activeReleaseVersion, setActiveReleaseVersion] = useState('');
  const [activeReleaseUrl, setActiveReleaseUrl] = useState('');

  // Toggle Update States
  const [currentUpdateActive, setCurrentUpdateActive] = useState(false);
  const [currentBetaActive, setCurrentBetaActive] = useState(false);
  const [pendingToggleMode, setPendingToggleMode] = useState('public');
  const [toggleMasterPassword, setToggleMasterPassword] = useState('');
  const [isTogglingUpdate, setIsTogglingUpdate] = useState(false);
  const [toggleSuccessMessage, setToggleSuccessMessage] = useState('');
  const [toggleErrorMessage, setToggleErrorMessage] = useState('');
  const [showToggleMasterKeyModal, setShowToggleMasterKeyModal] = useState(false);
  const [pendingToggleValue, setPendingToggleValue] = useState(false);

  const fetchReleaseSettings = useCallback(async () => {
    if (isDemoMode) return;
    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/settings/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setBuildStatus(data.build_status || 'idle');
        setBuildVersion(data.build_version || '');
        setBuildError(data.build_error || '');
        setCurrentUpdateActive(data.update_active || false);
        setCurrentBetaActive(data.update_beta_active || false);
        setActiveReleaseVersion(data.latest_version || '');
        setActiveReleaseUrl(data.update_download_url || '');
      }
    } catch (err) {
      console.error('Error fetching release settings:', err);
    }
  }, [token, isDemoMode]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchReleaseSettings();
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [fetchReleaseSettings]);

  // Poll build status when a build is running
  useEffect(() => {
    let intervalId = null;
    if (buildStatus === 'building' && !isDemoMode && token) {
      intervalId = setInterval(() => {
        fetchReleaseSettings();
      }, 10000); // Poll every 10 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [buildStatus, token, isDemoMode, fetchReleaseSettings]);

  const handlePublishReleaseUpdate = async (e) => {
    e.preventDefault();
    if (isDemoMode) {
      setReleaseErrorMessage('Not supported in Simulation/Demo mode.');
      return;
    }
    setReleaseSuccessMessage('');
    setReleaseErrorMessage('');
    setIsReleasingUpdate(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/settings/release-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          master_password: releaseMasterPassword,
          latest_version: releaseVersion,
          update_download_url: releaseDownloadUrl
        })
      });
      if (res.ok) {
        const data = await res.json();
        setReleaseSuccessMessage(data.message || 'System update successfully released!');
        setReleaseVersion('');
        setReleaseDownloadUrl('');
        setReleaseMasterPassword('');
        if (typeof playCyberSound === 'function') playCyberSound('success');
      } else {
        const err = await res.json();
        setReleaseErrorMessage(err.detail || 'Failed to publish release update.');
        if (typeof playCyberSound === 'function') playCyberSound('error');
      }
    } catch (e) {
      setReleaseErrorMessage(`Network error: ${e?.message || 'Please try again.'}`);
      if (typeof playCyberSound === 'function') playCyberSound('error');
    } finally {
      setIsReleasingUpdate(false);
    }
  };

  const handleToggleUpdateActive = async () => {
    if (!toggleMasterPassword.trim()) {
      setToggleErrorMessage('Master password is required.');
      return;
    }
    setToggleErrorMessage('');
    setToggleSuccessMessage('');
    setIsTogglingUpdate(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      await wakeBackend(apiBaseUrl, 12000);
      const endpoint = pendingToggleMode === 'beta'
        ? `${apiBaseUrl}/settings/toggle-beta-active`
        : `${apiBaseUrl}/settings/toggle-update-active`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          master_password: toggleMasterPassword,
          active: pendingToggleValue
        })
      });
      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error('JSON parse error on toggle update active:', jsonErr);
        data = { detail: res.ok ? 'Unexpected server response.' : `Server error (${res.status}). Database may still be migrating — wait 30s and retry.` };
      }
      if (res.ok) {
        if (pendingToggleMode === 'beta') {
          setCurrentBetaActive(pendingToggleValue);
          setToggleSuccessMessage(data.message || (pendingToggleValue ? '🧪 Beta channel ON — only your phone sees the update.' : 'Beta channel off.'));
        } else {
          setCurrentUpdateActive(pendingToggleValue);
          setToggleSuccessMessage(data.message || (pendingToggleValue ? '✅ Update is now LIVE for all users!' : '🔕 Update banner deactivated.'));
        }
        setToggleMasterPassword('');
        setShowToggleMasterKeyModal(false);
        if (typeof playCyberSound === 'function') playCyberSound('success');
      } else {
        setToggleErrorMessage(data.detail || 'Failed to toggle update status.');
        if (typeof playCyberSound === 'function') playCyberSound('error');
      }
    } catch (e) {
      setToggleErrorMessage(e?.message?.includes('abort') ? 'Server wake-up timed out. Tap Wake Cloud Server on login, then retry.' : `Network error: ${e?.message || 'Please try again.'}`);
      if (typeof playCyberSound === 'function') playCyberSound('error');
    } finally {
      setIsTogglingUpdate(false);
    }
  };

  const handleTriggerBuild = async (e) => {
    e.preventDefault();
    if (isDemoMode) {
      setReleaseErrorMessage('Not supported in Simulation/Demo mode.');
      return;
    }
    if (!releaseVersion.trim() || !releaseMasterPassword.trim()) {
      setReleaseErrorMessage('Version and Master Password are required.');
      return;
    }
    setReleaseSuccessMessage('');
    setReleaseErrorMessage('');
    setIsTriggeringBuild(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/settings/trigger-build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          master_password: releaseMasterPassword,
          version: releaseVersion
        })
      });
      const data = await res.json();
      if (res.ok) {
        setReleaseSuccessMessage(data.message || 'Automated APK build triggered successfully!');
        setBuildStatus('building');
        setBuildVersion(releaseVersion);
        setReleaseMasterPassword('');
        if (typeof playCyberSound === 'function') playCyberSound('success');
      } else {
        setReleaseErrorMessage(data.detail || 'Failed to trigger automated build.');
        if (typeof playCyberSound === 'function') playCyberSound('error');
      }
    } catch (e) {
      setReleaseErrorMessage(`Network error: ${e?.message || 'Please check your connection and try again.'}`);
      if (typeof playCyberSound === 'function') playCyberSound('error');
    } finally {
      setIsTriggeringBuild(false);
    }
  };

  return (
    <>
      {/* ═══ SYSTEM RELEASE UPDATE CONTROL ═══ */}
      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🚀 System Release & APK Control
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
              Trigger automated GitHub Actions APK compilation or manually deploy new version releases.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href="https://github.com/rajkishorock-arch/SMART-ATTENDANCE-SYSTEM/actions/workflows/build-apk.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              GitHub Actions ↗
            </a>
            <span className="telemetry-stat-pill" style={{
              padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', letterSpacing: '0.5px'
            }}>
              APP VERSION: v{APP_VERSION}
            </span>
          </div>
        </div>

        {/* ═══ OWNER BETA CHANNEL — test on your phone first ═══ */}
        <div style={{
          background: currentBetaActive ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)',
          border: currentBetaActive ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 6px', color: currentBetaActive ? '#fbbf24' : '#f8fafc' }}>
              🧪 Step 1: Owner Beta Test (Your Phone Only)
            </h4>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.82rem' }}>
              {currentBetaActive
                ? 'Update banner shows ONLY on your device. Test the APK, then use Step 2 to release to everyone.'
                : 'Enable beta to receive the update on your phone first before all users.'}
            </p>
          </div>
          <button
            type="button"
            className="bg-gradient-btn"
            onClick={() => {
              setPendingToggleMode('beta');
              setPendingToggleValue(!currentBetaActive);
              setToggleMasterPassword('');
              setToggleErrorMessage('');
              setShowToggleMasterKeyModal(true);
            }}
            style={{ padding: '10px 16px', borderRadius: '8px', whiteSpace: 'nowrap' }}
          >
            {currentBetaActive ? 'Disable Beta' : 'Enable Owner Beta'}
          </button>
        </div>

        {/* ═══ MASTER TOGGLE — ONE CLICK RELEASE ═══ */}
        <div style={{
          background: currentUpdateActive
            ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(8,145,178,0.06))'
            : 'rgba(255,255,255,0.02)',
          border: currentUpdateActive
            ? '1px solid rgba(16,185,129,0.3)'
            : '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.4rem' }}>{currentUpdateActive ? '🟢' : '⚫'}</span>
              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: currentUpdateActive ? '#10b981' : '#f8fafc' }}>
                {currentUpdateActive ? 'Step 2: LIVE for ALL Users' : 'Step 2: Public Release (All Users)'}
              </h4>
            </div>
            <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
              {currentUpdateActive
                ? `🚀 Version update is currently active. All users will see the download banner. Turn OFF to hide it.`
                : '💤 Toggle ON to instantly release the update banner to ALL users (requires Master Key).'}
            </p>
          </div>

          {/* TOGGLE SWITCH */}
          <div
            onClick={() => {
              setPendingToggleMode('public');
              const newVal = !currentUpdateActive;
              setPendingToggleValue(newVal);
              setToggleMasterPassword('');
              setToggleErrorMessage('');
              setToggleSuccessMessage('');
              setShowToggleMasterKeyModal(true);
              if (typeof playCyberSound === 'function') playCyberSound('click');
            }}
            style={{
              width: '64px', height: '34px',
              borderRadius: '17px',
              background: currentUpdateActive
                ? 'linear-gradient(135deg, #10b981, #0891b2)'
                : 'rgba(255,255,255,0.1)',
              border: currentUpdateActive ? '2px solid rgba(16,185,129,0.5)' : '2px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.3s ease',
              flexShrink: 0,
              boxShadow: currentUpdateActive ? '0 0 16px rgba(16,185,129,0.3)' : 'none',
            }}
            title={currentUpdateActive ? 'Click to deactivate update banner' : 'Click to activate update banner for all users'}
          >
            <div style={{
              position: 'absolute',
              top: '3px',
              left: currentUpdateActive ? '32px' : '3px',
              width: '24px', height: '24px',
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'left 0.3s ease',
            }} />
          </div>
        </div>

        {/* Release / Toggle Success/Error Messages */}
        {releaseSuccessMessage && (
          <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem' }}>
            ✅ {releaseSuccessMessage}
          </div>
        )}
        {releaseErrorMessage && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
            ❌ {releaseErrorMessage}
          </div>
        )}
        {toggleSuccessMessage && (
          <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {toggleSuccessMessage}
          </div>
        )}
        {toggleErrorMessage && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
            ❌ {toggleErrorMessage}
          </div>
        )}

        {/* Current Active Release Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '20px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>CURRENT PUBLISHED VERSION</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{activeReleaseVersion ? `v${activeReleaseVersion}` : 'None'}</span>
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>APK DOWNLOAD LINK</span>
            {activeReleaseUrl ? (
              <a href={activeReleaseUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'underline', wordBreak: 'break-all', display: 'block' }}>
                {activeReleaseUrl}
              </a>
            ) : (
              <span style={{ fontSize: '0.85rem', color: '#6b7280', display: 'block' }}>Not configured</span>
            )}
          </div>
        </div>

        {/* ═══ CI/CD AUTO BUILD STATUS CARD ═══ */}
        {buildStatus !== 'idle' && (
          <div style={{
            background: buildStatus === 'building' ? 'rgba(59, 130, 246, 0.06)' : buildStatus === 'success' ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
            border: buildStatus === 'building' ? '1px solid rgba(59, 130, 246, 0.25)' : buildStatus === 'success' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {buildStatus === 'building' && (
                  <div style={{
                    width: '18px', height: '18px',
                    border: '2px solid rgba(59, 130, 246, 0.2)',
                    borderTop: '2px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s infinite linear'
                  }} />
                )}
                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: buildStatus === 'building' ? '#3b82f6' : buildStatus === 'success' ? '#10b981' : '#ef4444' }}>
                  {buildStatus === 'building' && `⚡ Automated Build in Progress (v${buildVersion})`}
                  {buildStatus === 'success' && `✅ Build Succeeded (v${buildVersion})`}
                  {buildStatus === 'failed' && `❌ Build Failed (v${buildVersion})`}
                </h4>
              </div>
              {buildStatus !== 'building' && (
                <button
                  onClick={() => {
                    setBuildStatus('idle');
                    setBuildError('');
                  }}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb', padding: '4px 10px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer' }}
                >
                  Dismiss Status
                </button>
              )}
            </div>
            <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
              {buildStatus === 'building' && `React code is compiling, assets are syncing, and Android APK v${buildVersion} is being signed and packaged on GitHub Actions. Usually takes ~3 mins. The update goes live automatically when complete.`}
              {buildStatus === 'success' && `Automated release build of APK v${buildVersion} finished successfully. The version is live and download link is set.`}
              {buildStatus === 'failed' && `Auto-build pipeline failed. Error: ${buildError}`}
            </p>
            {buildStatus === 'building' && (
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '6px', position: 'relative' }}>
                <div className="progress-bar-loading" style={{ height: '100%', background: '#3b82f6', borderRadius: '2px', width: '35%', position: 'absolute' }} />
              </div>
            )}
          </div>
        )}

        {/* ═══ AUTO BUILD / MANUAL RELEASE FORM ═══ */}
        {!showManualReleaseForm ? (
          <form onSubmit={handleTriggerBuild} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🚀 Auto-Build & Release APK via GitHub Actions
            </h4>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '0', lineHeight: 1.5 }}>
              Specify the new release version and enter your master password. The system will automatically build the signed APK and publish it without any manual Android Studio compiling.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">New Release Version (e.g., 1.0.3)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 1.0.3"
                  value={releaseVersion}
                  onChange={e => setReleaseVersion(e.target.value)}
                  disabled={buildStatus === 'building'}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Owner Master Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter master password to authorize"
                  value={releaseMasterPassword}
                  onChange={e => setReleaseMasterPassword(e.target.value)}
                  disabled={buildStatus === 'building'}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="bg-gradient-btn"
                style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '0.88rem', background: 'linear-gradient(135deg, #10b981, #0891b2)' }}
                disabled={isTriggeringBuild || buildStatus === 'building'}
              >
                {isTriggeringBuild ? 'Triggering...' : '🚀 Trigger Auto-Build'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReleaseSuccessMessage('');
                  setReleaseErrorMessage('');
                  setShowManualReleaseForm(true);
                }}
                style={{ background: 'transparent', border: 'none', color: '#00f2fe', textDecoration: 'underline', fontSize: '0.82rem', cursor: 'pointer', padding: '8px 0', fontWeight: 600 }}
              >
                💾 Configure Version & Download URL Manually
              </button>
              <a
                href="https://github.com/rajkishorock-arch/SMART-ATTENDANCE-SYSTEM/actions/workflows/build-apk.yml"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#94a3b8', textDecoration: 'underline', fontSize: '0.82rem', padding: '8px 0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                Open GitHub Actions (Manual Run) ↗
              </a>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePublishReleaseUpdate} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              💾 Configure Version & Download URL Manually
            </h4>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '0', lineHeight: 1.5 }}>
              Directly save the version number and custom .apk download link.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Release Version (e.g., 1.0.2)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 1.0.2"
                  value={releaseVersion}
                  onChange={e => setReleaseVersion(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Update Download URL (.apk Link)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="e.g. https://github.com/.../app-debug.apk"
                  value={releaseDownloadUrl}
                  onChange={e => setReleaseDownloadUrl(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Owner Master Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter master password to authorize"
                value={releaseMasterPassword}
                onChange={e => setReleaseMasterPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="submit"
                className="bg-gradient-btn"
                style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '0.88rem', background: 'linear-gradient(135deg, #10b981, #0891b2)' }}
                disabled={isReleasingUpdate}
              >
                {isReleasingUpdate ? 'Saving...' : '💾 Save Version & URL'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReleaseSuccessMessage('');
                  setReleaseErrorMessage('');
                  setShowManualReleaseForm(false);
                }}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', textDecoration: 'underline', fontSize: '0.8rem', cursor: 'pointer', padding: '8px 0' }}
              >
                Back to Auto-Build via GitHub Actions
              </button>
            </div>
          </form>
        )}

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>ℹ️ How It Works (Automated Release)</h4>
          <ul style={{ color: '#9ca3af', fontSize: '0.8rem', margin: '4px 0 0 20px', padding: 0, lineHeight: 1.8 }}>
            <li><strong style={{ color: '#e2e8f0' }}>Step 1:</strong> Enter the target release version and your master key, then click "Trigger Auto-Build".</li>
            <li><strong style={{ color: '#e2e8f0' }}>Step 2:</strong> GitHub Actions compiles, signs, uploads the APK to GitHub Releases, and calls back this backend.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Step 3:</strong> Once compiled, the download link updates automatically, and the update is made LIVE for all users.</li>
            <li><strong style={{ color: '#e2e8f0' }}>Step 4:</strong> To stop displaying the update banner, simply toggle the master active switch above to OFF.</li>
          </ul>
        </div>
      </div>

      {/* ===== TOGGLE UPDATE ACTIVE — Master Key Confirmation Modal ===== */}
      {showToggleMasterKeyModal && (
        <div
          className="flex-center modal-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 100050, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowToggleMasterKeyModal(false); }}
        >
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '420px', margin: '16px',
            padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px',
            border: pendingToggleValue ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
            animation: 'fadeInUp 0.3s ease',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: pendingToggleValue ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', flexShrink: 0,
              }}>
                {pendingToggleValue ? '🚀' : '🔕'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                  {pendingToggleValue ? 'Activate Update for All Users?' : 'Deactivate Update Banner?'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#9ca3af', lineHeight: 1.4 }}>
                  {pendingToggleValue
                    ? 'All users will see the update download banner immediately.'
                    : 'The update banner will be hidden from all users.'}
                </p>
              </div>
            </div>

            {/* Master Key Input */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔑 Master Password Required
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter system master password..."
                value={toggleMasterPassword}
                onChange={e => setToggleMasterPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleToggleUpdateActive(); }}
                autoFocus
                style={{ fontSize: '0.9rem' }}
              />
              {toggleErrorMessage && (
                <p style={{ color: '#ef4444', fontSize: '0.78rem', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ❌ {toggleErrorMessage}
                </p>
              )}
              <p style={{ color: '#64748b', fontSize: '0.72rem', margin: '8px 0 0', lineHeight: 1.4 }}>
                Use your institution master key or the global developer key configured on Render (DEVELOPER_MASTER_KEY).
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, padding: '11px 16px' }}
                onClick={() => { setShowToggleMasterKeyModal(false); setToggleMasterPassword(''); setToggleErrorMessage(''); }}
                disabled={isTogglingUpdate}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-gradient-btn"
                style={{
                  flex: 1, padding: '11px 16px', borderRadius: '8px', fontWeight: 600,
                  background: pendingToggleValue
                    ? 'linear-gradient(135deg, #10b981, #0891b2)'
                    : 'linear-gradient(135deg, #ef4444, #dc2626)',
                }}
                onClick={handleToggleUpdateActive}
                disabled={isTogglingUpdate || !toggleMasterPassword.trim()}
              >
                {isTogglingUpdate ? '⏳ Processing...' : (pendingToggleValue ? '✅ Activate Update' : '🔕 Deactivate')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
