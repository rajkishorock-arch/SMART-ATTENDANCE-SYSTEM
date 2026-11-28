import { useState, useEffect, useCallback } from 'react';
import {
  Rocket,
  ShieldCheck,
  Bell,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sliders
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/platform';
import { wakeBackend } from '../../utils/cameraScanner';
import { APP_VERSION } from '../../utils/versionManager';

export default function ReleaseSettings({
  token,
  isDemoMode,
  playCyberSound = () => {},
  routeView = null,
  setRouteView = null
}) {
  const [releaseVersion, setReleaseVersion] = useState('');
  const [releaseDownloadUrl, setReleaseDownloadUrl] = useState('');
  const [releaseMasterPassword, setReleaseMasterPassword] = useState('');
  const [isReleasingUpdate, setIsReleasingUpdate] = useState(false);
  const [releaseSuccessMessage, setReleaseSuccessMessage] = useState('');
  const [releaseErrorMessage, setReleaseErrorMessage] = useState('');

  const [buildStatus, setBuildStatus] = useState('idle');
  const [buildVersion, setBuildVersion] = useState('');
  const [buildError, setBuildError] = useState('');
  const [publishMode, setPublishMode] = useState('auto'); // 'auto' | 'manual'
  const [isTriggeringBuild, setIsTriggeringBuild] = useState(false);
  const [activeReleaseVersion, setActiveReleaseVersion] = useState('');
  const [activeReleaseUrl, setActiveReleaseUrl] = useState('');

  const [currentUpdateActive, setCurrentUpdateActive] = useState(false);
  const [currentBetaActive, setCurrentBetaActive] = useState(false);
  const [toggleMasterPassword, setToggleMasterPassword] = useState('');
  const [isTogglingUpdate, setIsTogglingUpdate] = useState(false);
  const [toggleSuccessMessage, setToggleSuccessMessage] = useState('');
  const [toggleErrorMessage, setToggleErrorMessage] = useState('');

  const fetchReleaseSettings = useCallback(async () => {
    if (isDemoMode || !token) return;
    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/settings/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBuildStatus(data.build_status || 'idle');
        setBuildVersion(data.build_version || '');
        setBuildError(data.build_error || '');
        setCurrentUpdateActive(Boolean(data.update_active));
        setCurrentBetaActive(Boolean(data.update_beta_active));
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
      if (!ignore) await fetchReleaseSettings();
    };
    run();
    return () => { ignore = true; };
  }, [fetchReleaseSettings]);

  useEffect(() => {
    let intervalId = null;
    if (buildStatus === 'building' && !isDemoMode && token) {
      intervalId = setInterval(fetchReleaseSettings, 10000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [buildStatus, token, isDemoMode, fetchReleaseSettings]);

  const handlePublishReleaseUpdate = async (e) => {
    e.preventDefault();
    if (isDemoMode) {
      setReleaseErrorMessage('Not supported in Guest Demo mode.');
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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          master_password: releaseMasterPassword,
          latest_version: releaseVersion,
          update_download_url: releaseDownloadUrl
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setReleaseSuccessMessage(data.message || 'Version release saved!');
        setActiveReleaseVersion(releaseVersion.replace(/^v/i, ''));
        setActiveReleaseUrl(releaseDownloadUrl);
        setReleaseVersion('');
        setReleaseDownloadUrl('');
        setReleaseMasterPassword('');
        playCyberSound('success');
      } else {
        setReleaseErrorMessage(data.detail || 'Failed to publish release update.');
        playCyberSound('error');
      }
    } catch (e) {
      setReleaseErrorMessage(`Network error: ${e?.message || 'Please try again.'}`);
      playCyberSound('error');
    } finally {
      setIsReleasingUpdate(false);
    }
  };

  const handleTriggerBuild = async (e) => {
    e.preventDefault();
    if (isDemoMode) {
      setReleaseErrorMessage('Not supported in Guest Demo mode.');
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
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          master_password: releaseMasterPassword,
          version: releaseVersion.trim()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setReleaseSuccessMessage(data.message || 'APK build triggered!');
        setBuildStatus('building');
        setBuildVersion(releaseVersion.trim());
        setReleaseMasterPassword('');
        playCyberSound('success');
      } else {
        setReleaseErrorMessage(data.detail || 'Failed to trigger build.');
        playCyberSound('error');
      }
    } catch (e) {
      setReleaseErrorMessage(`Network error: ${e?.message || 'Please try again.'}`);
      playCyberSound('error');
    } finally {
      setIsTriggeringBuild(false);
    }
  };

  const handleToggleChannel = async (mode, nextActive) => {
    if (isDemoMode) {
      setToggleErrorMessage('Not supported in Guest Demo mode.');
      return;
    }
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
      const endpoint = mode === 'beta'
        ? `${apiBaseUrl}/settings/toggle-beta-active`
        : `${apiBaseUrl}/settings/toggle-update-active`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          master_password: toggleMasterPassword,
          active: nextActive
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (mode === 'beta') {
          setCurrentBetaActive(nextActive);
          setToggleSuccessMessage(data.message || (nextActive ? 'Owner beta enabled.' : 'Owner beta disabled.'));
        } else {
          setCurrentUpdateActive(nextActive);
          setToggleSuccessMessage(data.message || (nextActive ? 'Public update banner enabled.' : 'Public update banner hidden.'));
        }
        setToggleMasterPassword('');
        playCyberSound('success');
      } else {
        setToggleErrorMessage(data.detail || 'Failed to update rollout status.');
        playCyberSound('error');
      }
    } catch (e) {
      setToggleErrorMessage(`Network error: ${e?.message || 'Please try again.'}`);
      playCyberSound('error');
    } finally {
      setIsTogglingUpdate(false);
    }
  };

  const subMode = routeView?.sub === 'release_updates' ? routeView.id : null;

  // ── SUBPAGE 1: OWNER BETA CHANNEL ───────────────────────────────────────────
  if (subMode === 'beta') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {toggleSuccessMessage && (
              <div className="feedback-banner success" role="status">
                <CheckCircle2 size={16} />
                <span>{toggleSuccessMessage}</span>
              </div>
            )}
            {toggleErrorMessage && (
              <div className="feedback-banner error" role="alert">
                <AlertTriangle size={16} />
                <span>{toggleErrorMessage}</span>
              </div>
            )}

            <div className="golden-os-inset-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#25231f' }}>Owner Beta Channel</div>
                <div style={{ fontSize: '0.78rem', color: '#696358' }}>
                  Test update banner on owner device only before public rollout
                </div>
              </div>
              <span style={{
                background: currentBetaActive ? '#fffbeb' : '#f4f1eb',
                border: `1px solid ${currentBetaActive ? '#fde68a' : '#cfc8ba'}`,
                color: currentBetaActive ? '#d97706' : '#58534a',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '999px'
              }}>
                {currentBetaActive ? 'ACTIVE' : 'OFF'}
              </span>
            </div>

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Master Key Verification</div>
              <div>
                <label className="golden-os-field-label">Master Password *</label>
                <input
                  type="password"
                  className="golden-os-input"
                  placeholder="••••••••••••"
                  value={toggleMasterPassword}
                  onChange={e => setToggleMasterPassword(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={isTogglingUpdate}
                  onClick={() => handleToggleChannel('beta', !currentBetaActive)}
                  className="golden-os-action-pill"
                >
                  <span>{isTogglingUpdate ? 'Updating...' : (currentBetaActive ? 'Disable Owner Beta' : 'Enable Owner Beta')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 2: PUBLIC RELEASE ROLLOUT ───────────────────────────────────────
  if (subMode === 'public') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {toggleSuccessMessage && (
              <div className="feedback-banner success" role="status">
                <CheckCircle2 size={16} />
                <span>{toggleSuccessMessage}</span>
              </div>
            )}
            {toggleErrorMessage && (
              <div className="feedback-banner error" role="alert">
                <AlertTriangle size={16} />
                <span>{toggleErrorMessage}</span>
              </div>
            )}

            <div className="golden-os-inset-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#25231f' }}>Public Update Banner</div>
                <div style={{ fontSize: '0.78rem', color: '#696358' }}>
                  Controls whether all users see the APK download banner
                </div>
              </div>
              <span style={{
                background: currentUpdateActive ? '#ecfdf5' : '#f4f1eb',
                border: `1px solid ${currentUpdateActive ? '#a7f3d0' : '#cfc8ba'}`,
                color: currentUpdateActive ? '#059669' : '#58534a',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '999px'
              }}>
                {currentUpdateActive ? 'LIVE' : 'HIDDEN'}
              </span>
            </div>

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Master Key Verification</div>
              <div>
                <label className="golden-os-field-label">Master Password *</label>
                <input
                  type="password"
                  className="golden-os-input"
                  placeholder="••••••••••••"
                  value={toggleMasterPassword}
                  onChange={e => setToggleMasterPassword(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={isTogglingUpdate}
                  onClick={() => handleToggleChannel('public', !currentUpdateActive)}
                  className="golden-os-action-pill"
                >
                  <span>{isTogglingUpdate ? 'Updating...' : (currentUpdateActive ? 'Hide Banner' : 'Activate for All Users')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 3: BUILD & PUBLISH VERSION ──────────────────────────────────────
  if (subMode === 'publish') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {releaseSuccessMessage && (
              <div className="feedback-banner success" role="status">
                <CheckCircle2 size={16} />
                <span>{releaseSuccessMessage}</span>
              </div>
            )}
            {releaseErrorMessage && (
              <div className="feedback-banner error" role="alert">
                <AlertTriangle size={16} />
                <span>{releaseErrorMessage}</span>
              </div>
            )}

            {buildStatus !== 'idle' && (
              <div className="golden-os-inset-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#25231f' }}>
                    {buildStatus === 'building' ? `Building v${buildVersion}...` : buildStatus === 'success' ? `Build Ready (v${buildVersion})` : `Build Failed (v${buildVersion})`}
                  </div>
                  {buildError && <div style={{ fontSize: '0.76rem', color: '#dc2626' }}>{buildError}</div>}
                </div>
                {buildStatus !== 'building' && (
                  <button type="button" className="golden-os-feedback-filter-btn" onClick={() => { setBuildStatus('idle'); setBuildError(''); }}>
                    Dismiss
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { playCyberSound('click'); setPublishMode('auto'); }}
                className={`golden-os-feedback-filter-btn ${publishMode === 'auto' ? 'active' : ''}`}
              >
                Auto-Build APK
              </button>
              <button
                type="button"
                onClick={() => { playCyberSound('click'); setPublishMode('manual'); }}
                className={`golden-os-feedback-filter-btn ${publishMode === 'manual' ? 'active' : ''}`}
              >
                Manual Version &amp; URL
              </button>
            </div>

            {publishMode === 'auto' ? (
              <form onSubmit={handleTriggerBuild} className="golden-os-form-section">
                <div className="golden-os-form-section-title">Trigger GitHub Actions APK Release</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                  <div>
                    <label className="golden-os-field-label">New Version (e.g. 1.0.125) *</label>
                    <input
                      type="text"
                      required
                      className="golden-os-input"
                      placeholder="e.g. 1.0.125"
                      value={releaseVersion}
                      onChange={e => setReleaseVersion(e.target.value)}
                      disabled={buildStatus === 'building'}
                    />
                  </div>
                  <div>
                    <label className="golden-os-field-label">Owner Master Password *</label>
                    <input
                      type="password"
                      required
                      className="golden-os-input"
                      placeholder="••••••••••••"
                      value={releaseMasterPassword}
                      onChange={e => setReleaseMasterPassword(e.target.value)}
                      disabled={buildStatus === 'building'}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={isTriggeringBuild || buildStatus === 'building'} className="golden-os-action-pill">
                    <Rocket size={15} />
                    <span>{isTriggeringBuild ? 'Triggering...' : 'Trigger Auto-Build'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handlePublishReleaseUpdate} className="golden-os-form-section">
                <div className="golden-os-form-section-title">Configure Manual Version &amp; APK Link</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                  <div>
                    <label className="golden-os-field-label">Version *</label>
                    <input
                      type="text"
                      required
                      className="golden-os-input"
                      placeholder="e.g. 1.0.125"
                      value={releaseVersion}
                      onChange={e => setReleaseVersion(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="golden-os-field-label">APK Download URL *</label>
                    <input
                      type="url"
                      required
                      className="golden-os-input"
                      placeholder="https://github.com/.../app-release.apk"
                      value={releaseDownloadUrl}
                      onChange={e => setReleaseDownloadUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="golden-os-field-label">Owner Master Password *</label>
                    <input
                      type="password"
                      required
                      className="golden-os-input"
                      placeholder="••••••••••••"
                      value={releaseMasterPassword}
                      onChange={e => setReleaseMasterPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={isReleasingUpdate} className="golden-os-action-pill">
                    <CheckCircle2 size={15} />
                    <span>{isReleasingUpdate ? 'Saving...' : 'Save Release Version'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 4: PUBLISHED RELEASE INFO & LINKS ───────────────────────────────
  if (subMode === 'info') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-list-shell">
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Current App Version</span>
                <strong style={{ color: '#25231f', fontSize: '0.86rem' }}>v{APP_VERSION}</strong>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Published Server Version</span>
                <strong style={{ color: '#059669', fontSize: '0.86rem' }}>
                  {activeReleaseVersion ? `v${activeReleaseVersion}` : 'None'}
                </strong>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Public Banner</span>
                <strong style={{ color: currentUpdateActive ? '#059669' : '#696358', fontSize: '0.86rem' }}>
                  {currentUpdateActive ? 'Live' : 'Hidden'}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href="https://github.com/rajkishorock-arch/SMART-ATTENDANCE-SYSTEM/actions/workflows/build-apk.yml"
                target="_blank"
                rel="noopener noreferrer"
                className="golden-os-feedback-filter-btn"
                style={{ textDecoration: 'none' }}
              >
                <ExternalLink size={14} />
                <span>GitHub Actions</span>
              </a>

              {activeReleaseUrl && (
                <a
                  href={activeReleaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="golden-os-action-pill"
                  style={{ textDecoration: 'none' }}
                >
                  <Download size={14} />
                  <span>Download APK</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN SCREEN: CLEAN GOLDEN GATE NAVIGATION LIST ──────────────────────────
  return (
    <div className="golden-os-page-bottom-safe">
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Compact Status Strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: 700, color: '#58534a' }}>
            <span>App: <strong style={{ color: '#25231f' }}>v{APP_VERSION}</strong></span>
            <span>• Published: <strong style={{ color: '#059669' }}>{activeReleaseVersion ? `v${activeReleaseVersion}` : `v${APP_VERSION}`}</strong></span>
            <span style={{ color: currentUpdateActive ? '#059669' : '#696358' }}>
              • {currentUpdateActive ? 'Banner Live' : 'Banner Hidden'}
            </span>
          </div>

          <div className="golden-os-list-shell">
            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                setToggleErrorMessage('');
                setToggleSuccessMessage('');
                if (setRouteView) setRouteView({ sub: 'release_updates', mode: 'detail', id: 'beta' });
              }}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ background: '#fffbeb', color: '#d97706', borderColor: '#fde68a' }}>
                  <ShieldCheck size={16} />
                </div>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f' }}>Owner Beta Rollout</span>
              </div>
              <ChevronRight size={16} color="#9c9384" />
            </button>

            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                setToggleErrorMessage('');
                setToggleSuccessMessage('');
                if (setRouteView) setRouteView({ sub: 'release_updates', mode: 'detail', id: 'public' });
              }}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                  <Bell size={16} />
                </div>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f' }}>Public Update Banner</span>
              </div>
              <ChevronRight size={16} color="#9c9384" />
            </button>

            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                setReleaseErrorMessage('');
                setReleaseSuccessMessage('');
                if (setRouteView) setRouteView({ sub: 'release_updates', mode: 'detail', id: 'publish' });
              }}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ background: '#faf5ea', color: '#785927', borderColor: '#eadbc0' }}>
                  <Rocket size={16} />
                </div>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f' }}>Build &amp; Publish Version</span>
              </div>
              <ChevronRight size={16} color="#9c9384" />
            </button>

            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                if (setRouteView) setRouteView({ sub: 'release_updates', mode: 'detail', id: 'info' });
              }}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                  <Sliders size={16} />
                </div>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f' }}>Current Release &amp; Links</span>
              </div>
              <ChevronRight size={16} color="#9c9384" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
