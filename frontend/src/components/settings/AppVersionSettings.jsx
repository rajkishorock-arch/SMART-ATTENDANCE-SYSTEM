import {
  Smartphone,
  RefreshCw,
  CheckCircle2,
  Rocket,
  ChevronRight
} from 'lucide-react';
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
  playCyberSound = () => {},
  setActiveSubSetting,
  routeView = null,
  setRouteView = null
}) {
  const canManageReleases =
    userRole === 'admin' ||
    currentUser?.email?.trim()?.toLowerCase() === 'rajkishorock@gmail.com';

  const hasPendingManualRelease =
    Boolean(updateActiveFlag) &&
    Boolean(serverLatestVersion) &&
    serverLatestVersion !== APP_VERSION;

  const subMode = routeView?.sub === 'app_version' ? routeView.id : null;

  // ── SUBPAGE 1: VERSION & SYNC STATUS ────────────────────────────────────────
  if (subMode === 'status') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-inset-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#25231f' }}>
                  Installed Version v{APP_VERSION}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#696358' }}>
                  {hasPendingManualRelease
                    ? `Manual release v${serverLatestVersion} is ready`
                    : 'Running latest synced build'}
                </div>
              </div>

              <span style={{
                background: hasPendingManualRelease ? '#fffbeb' : '#ecfdf5',
                border: `1px solid ${hasPendingManualRelease ? '#fde68a' : '#a7f3d0'}`,
                color: hasPendingManualRelease ? '#d97706' : '#059669',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '999px'
              }}>
                {hasPendingManualRelease ? `v${serverLatestVersion} Available` : 'Up to Date'}
              </span>
            </div>

            <div className="golden-os-list-shell">
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Current Version</span>
                <strong style={{ color: '#25231f', fontSize: '0.86rem' }}>v{APP_VERSION}</strong>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Server Published Version</span>
                <strong style={{ color: '#25231f', fontSize: '0.86rem' }}>
                  {serverLatestVersion ? `v${serverLatestVersion}` : `v${APP_VERSION}`}
                </strong>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Web &amp; Mobile Live Sync</span>
                <strong style={{ color: '#059669', fontSize: '0.86rem' }}>Active on Push</strong>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Version Bump Policy</span>
                <strong style={{ color: '#785927', fontSize: '0.86rem' }}>Manual Only</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="golden-os-feedback-filter-btn"
                onClick={() => {
                  playCyberSound('click');
                  window.location.reload();
                }}
              >
                <RefreshCw size={14} />
                <span>Reload Latest Assets</span>
              </button>
              <button
                type="button"
                className="golden-os-action-pill"
                onClick={() => {
                  playCyberSound('click');
                  if (handleManualCheck) handleManualCheck();
                }}
              >
                <RefreshCw size={14} />
                <span>Check for Manual Release</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 2: CONFIRM INSTALLED VERSION ────────────────────────────────────
  if (subMode === 'confirm') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Build Confirmation</div>
              <div style={{ fontSize: '0.86rem', color: '#46423b', lineHeight: 1.5 }}>
                Confirm version <strong>v{APP_VERSION}</strong> is installed on this device and clear any pending update alert banner until the next manual release.
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="golden-os-action-pill"
                  onClick={() => {
                    markCurrentVersionInstalled();
                    if (serverLatestVersion) acknowledgeUpdateVersion(serverLatestVersion);
                    if (setUpdateAvailable) setUpdateAvailable(null);
                    if (setUpdateDismissed) setUpdateDismissed(true);
                    playCyberSound('success');
                    if (setRouteView) setRouteView(null);
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Confirm v{APP_VERSION} Installed</span>
                </button>
              </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#58534a' }}>
              Version <strong style={{ color: '#25231f' }}>v{APP_VERSION}</strong> •{' '}
              <span style={{ color: hasPendingManualRelease ? '#d97706' : '#059669' }}>
                {hasPendingManualRelease ? `Release v${serverLatestVersion} Ready` : 'Synced'}
              </span>
            </div>
          </div>

          <div className="golden-os-list-shell">
            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                if (setRouteView) setRouteView({ sub: 'app_version', mode: 'detail', id: 'status' });
              }}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ background: '#faf5ea', color: '#785927', borderColor: '#eadbc0' }}>
                  <Smartphone size={16} />
                </div>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f' }}>
                  Version &amp; Sync Status
                </span>
              </div>
              <ChevronRight size={16} color="#9c9384" />
            </button>

            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                if (setRouteView) setRouteView({ sub: 'app_version', mode: 'detail', id: 'confirm' });
              }}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                  <CheckCircle2 size={16} />
                </div>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f' }}>
                  Confirm Installed Version
                </span>
              </div>
              <ChevronRight size={16} color="#9c9384" />
            </button>

            {canManageReleases && (
              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  if (setRouteView) setRouteView(null);
                  if (setActiveSubSetting) setActiveSubSetting('release_updates');
                }}
                className="golden-os-list-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div className="golden-os-avatar" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                    <Rocket size={16} />
                  </div>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f' }}>
                    Release Console
                  </span>
                </div>
                <ChevronRight size={16} color="#9c9384" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
