import { useState } from 'react';
import {
  MapPin,
  Wifi,
  AlertTriangle,
  Crosshair,
  Save,
  ChevronRight,
  ShieldCheck,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function GeofenceSettings({
  userRole,
  settingsGeoEnabled,
  setSettingsGeoEnabled,
  settingsLat,
  setSettingsLat,
  settingsLon,
  setSettingsLon,
  settingsRadius,
  setSettingsRadius,
  settingsIpEnabled,
  setSettingsIpEnabled,
  settingsIpRanges,
  setSettingsIpRanges,
  lockdownActive,
  policyMessage,
  savingPolicy,
  setLockdownActive,
  saveSystemSettings,
  isSavingSettings,
  settingsMessage,
  setSettingsMessage,
  settingsError,
  setSettingsError,
  addDiagnosticLog,
  playCyberSound = () => {},
  routeView = null,
  setRouteView = null
}) {
  const [localSubMode, setLocalSubMode] = useState(null);
  const subMode = setRouteView
    ? (routeView?.sub === 'geofencing' ? routeView.id : null)
    : localSubMode;

  const openSubPage = (id) => {
    playCyberSound('click');
    if (setRouteView) {
      setRouteView({ sub: 'geofencing', mode: 'detail', id });
      window.location.hash = `#/settings/geofencing/${id}`;
    } else {
      setLocalSubMode(id);
    }
  };

  const renderSaveFeedback = () => (
    <>
      {settingsMessage && (
        <div className="feedback-banner success" role="status">
          <CheckCircle2 size={16} />
          <span>{settingsMessage}</span>
        </div>
      )}
      {settingsError && (
        <div className="feedback-banner error" role="alert">
          <AlertCircle size={16} />
          <span>{settingsError}</span>
        </div>
      )}
    </>
  );

  // ── SUBPAGE 1: GPS GEOFENCE BOUNDARY ──────────────────────────────────────
  if (subMode === 'gps') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-inset-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#25231f' }}>
                  GPS Perimeter Gate
                </div>
                <div style={{ fontSize: '0.76rem', color: '#696358' }}>
                  Restrict check-in inside campus radius
                </div>
              </div>
              <button
                type="button"
                className={settingsGeoEnabled ? 'golden-os-feedback-filter-btn active' : 'golden-os-feedback-filter-btn'}
                onClick={() => {
                  playCyberSound('click');
                  setSettingsGeoEnabled(!settingsGeoEnabled);
                }}
              >
                {settingsGeoEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>Campus Coordinates</span>
                <button
                  type="button"
                  className="golden-os-feedback-filter-btn"
                  style={{ fontSize: '0.72rem', padding: '5px 10px' }}
                  onClick={() => {
                    playCyberSound('click');
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setSettingsLat(pos.coords.latitude.toFixed(6));
                          setSettingsLon(pos.coords.longitude.toFixed(6));
                          if (addDiagnosticLog) addDiagnosticLog(`Fetched GPS Coordinates: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, 'success');
                          if (setSettingsMessage) setSettingsMessage('Captured current GPS coordinates.');
                        },
                        (err) => {
                          if (setSettingsError) setSettingsError(`Location Error: ${err.message}`);
                        },
                        { enableHighAccuracy: true }
                      );
                    }
                  }}
                >
                  <Crosshair size={13} />
                  <span>Use Current GPS</span>
                </button>
              </div>

              <div className="golden-os-fields-2">
                <div>
                  <label className="golden-os-field-label" htmlFor="geo-lat-input">Center Latitude</label>
                  <input
                    id="geo-lat-input"
                    type="text"
                    className="golden-os-input"
                    value={settingsLat}
                    onChange={(e) => setSettingsLat(e.target.value)}
                    placeholder="e.g. 28.6139"
                  />
                </div>
                <div>
                  <label className="golden-os-field-label" htmlFor="geo-lon-input">Center Longitude</label>
                  <input
                    id="geo-lon-input"
                    type="text"
                    className="golden-os-input"
                    value={settingsLon}
                    onChange={(e) => setSettingsLon(e.target.value)}
                    placeholder="e.g. 77.2090"
                  />
                </div>
              </div>

              <div>
                <label className="golden-os-field-label" htmlFor="geo-radius-input">Allowed Radius (meters)</label>
                <input
                  id="geo-radius-input"
                  type="number"
                  className="golden-os-input"
                  value={settingsRadius}
                  onChange={(e) => setSettingsRadius(e.target.value)}
                  placeholder="200"
                />
              </div>
            </div>

            {renderSaveFeedback()}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="golden-os-primary-action"
                style={{ justifyContent: 'center' }}
                onClick={() => {
                  playCyberSound('click');
                  saveSystemSettings();
                }}
                disabled={isSavingSettings}
              >
                <Save size={15} />
                <span>{isSavingSettings ? 'Saving...' : 'Save GPS Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 2: WI-FI / IP SUBNET GATE ────────────────────────────────────
  if (subMode === 'ip') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-inset-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#25231f' }}>
                  Campus Wi-Fi / IP Gate
                </div>
                <div style={{ fontSize: '0.76rem', color: '#696358' }}>
                  Allow only authorized campus networks
                </div>
              </div>
              <button
                type="button"
                className={settingsIpEnabled ? 'golden-os-feedback-filter-btn active' : 'golden-os-feedback-filter-btn'}
                onClick={() => {
                  playCyberSound('click');
                  setSettingsIpEnabled(!settingsIpEnabled);
                }}
              >
                {settingsIpEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Authorized IP Subnets</div>
              <div>
                <label className="golden-os-field-label" htmlFor="geo-ip-ranges-input">Allowed IP Addresses / CIDR</label>
                <input
                  id="geo-ip-ranges-input"
                  type="text"
                  className="golden-os-input"
                  value={settingsIpRanges}
                  onChange={(e) => setSettingsIpRanges(e.target.value)}
                  placeholder="127.0.0.1, 192.168.1.0/24"
                />
                <div style={{ fontSize: '0.74rem', color: '#787166', marginTop: '6px' }}>
                  Comma-separated IPv4 addresses or CIDR subnets.
                </div>
              </div>
            </div>

            {renderSaveFeedback()}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="golden-os-primary-action"
                style={{ justifyContent: 'center' }}
                onClick={() => {
                  playCyberSound('click');
                  saveSystemSettings();
                }}
                disabled={isSavingSettings}
              >
                <Save size={15} />
                <span>{isSavingSettings ? 'Saving...' : 'Save IP Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 3: EMERGENCY CAMPUS LOCKDOWN ──────────────────────────────────
  if (subMode === 'lockdown') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-inset-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: lockdownActive ? '#dc2626' : '#25231f' }}>
                  {lockdownActive ? 'Campus Lockdown Active' : 'Normal Campus Operations'}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#696358' }}>
                  {lockdownActive
                    ? 'All live cameras & check-ins paused'
                    : 'All attendance scanners permitted'}
                </div>
              </div>
              <span style={{
                background: lockdownActive ? '#fef2f2' : '#ecfdf5',
                border: `1px solid ${lockdownActive ? '#fecaca' : '#a7f3d0'}`,
                color: lockdownActive ? '#dc2626' : '#059669',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '999px'
              }}>
                {lockdownActive ? 'LOCKED' : 'Normal'}
              </span>
            </div>

            {policyMessage && (
              <div className="feedback-banner success" role="status">
                <CheckCircle2 size={16} />
                <span>{policyMessage}</span>
              </div>
            )}

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Master Override Control</div>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.82rem', color: '#696358', lineHeight: 1.5 }}>
                Instantly suspends every classroom camera stream and student self check-in endpoint until disarmed by an administrator.
              </p>
              <button
                type="button"
                disabled={savingPolicy || userRole !== 'admin'}
                onClick={() => {
                  playCyberSound('click');
                  if (setLockdownActive) setLockdownActive(!lockdownActive);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: savingPolicy || userRole !== 'admin' ? 'not-allowed' : 'pointer',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: lockdownActive ? '#059669' : '#dc2626',
                  color: '#fff',
                  opacity: savingPolicy ? 0.65 : 1
                }}
              >
                {lockdownActive ? <Unlock size={16} /> : <Lock size={16} />}
                <span>
                  {savingPolicy
                    ? 'Applying...'
                    : lockdownActive
                      ? 'Disarm Campus Lockdown'
                      : 'Engage Emergency Lockdown'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN SCREEN: CLEAN ORGANIZED CAMPUS SECURITY DIRECTORY ────────────────
  return (
    <div className="golden-os-page-bottom-safe">
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="golden-os-inset-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: '#25231f' }}>
              <ShieldCheck size={16} color={lockdownActive ? '#dc2626' : '#785927'} />
              <span>
                {lockdownActive ? 'Lockdown Active' : 'Perimeter Normal'} • GPS {settingsGeoEnabled ? `${settingsRadius || 200}m` : 'Off'} • IP {settingsIpEnabled ? 'Active' : 'Off'}
              </span>
            </div>
          </div>

          <div className="golden-os-list-shell">
            <button
              type="button"
              className="golden-os-list-row"
              onClick={() => openSubPage('gps')}
            >
              <span className="golden-os-avatar" style={{ background: '#faf5ea', border: '1px solid #dfcfaf', color: '#785927' }}>
                <MapPin size={17} />
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                  GPS Geofence Boundary
                </span>
                <span style={{ display: 'block', fontSize: '0.76rem', color: '#696358' }}>
                  Restrict check-in within campus coordinates &amp; radius
                </span>
              </span>
              <span style={{
                background: settingsGeoEnabled ? '#ecfdf5' : '#f4f0e8',
                border: `1px solid ${settingsGeoEnabled ? '#a7f3d0' : '#ddd6c7'}`,
                color: settingsGeoEnabled ? '#059669' : '#696358',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: '999px'
              }}>
                {settingsGeoEnabled ? `${settingsRadius || 200}m` : 'Off'}
              </span>
              <ChevronRight size={16} color="#9e9689" />
            </button>

            <button
              type="button"
              className="golden-os-list-row"
              onClick={() => openSubPage('ip')}
            >
              <span className="golden-os-avatar" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb' }}>
                <Wifi size={17} />
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                  Wi-Fi / IP Subnet Gate
                </span>
                <span style={{ display: 'block', fontSize: '0.76rem', color: '#696358' }}>
                  Allow check-in only from authorized campus networks
                </span>
              </span>
              <span style={{
                background: settingsIpEnabled ? '#ecfdf5' : '#f4f0e8',
                border: `1px solid ${settingsIpEnabled ? '#a7f3d0' : '#ddd6c7'}`,
                color: settingsIpEnabled ? '#059669' : '#696358',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: '999px'
              }}>
                {settingsIpEnabled ? 'Active' : 'Off'}
              </span>
              <ChevronRight size={16} color="#9e9689" />
            </button>

            <button
              type="button"
              className="golden-os-list-row"
              onClick={() => openSubPage('lockdown')}
            >
              <span className="golden-os-avatar" style={{ background: lockdownActive ? '#fef2f2' : '#fffbeb', border: `1px solid ${lockdownActive ? '#fecaca' : '#fde68a'}`, color: lockdownActive ? '#dc2626' : '#d97706' }}>
                <AlertTriangle size={17} />
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                  Emergency Campus Lockdown
                </span>
                <span style={{ display: 'block', fontSize: '0.76rem', color: '#696358' }}>
                  Suspend all live attendance scanners campus-wide
                </span>
              </span>
              <span style={{
                background: lockdownActive ? '#fef2f2' : '#ecfdf5',
                border: `1px solid ${lockdownActive ? '#fecaca' : '#a7f3d0'}`,
                color: lockdownActive ? '#dc2626' : '#059669',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: '999px'
              }}>
                {lockdownActive ? 'LOCKED' : 'Normal'}
              </span>
              <ChevronRight size={16} color="#9e9689" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
