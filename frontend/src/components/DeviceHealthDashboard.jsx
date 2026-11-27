import './campusAdmin.css';
import { useState, useEffect, useCallback } from 'react';
import {
  Monitor, Wifi, WifiOff,
  Plus, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, ChevronRight, MapPin, Camera, Battery, Cpu
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

const DEMO_DEVICES = [
  {
    id: 1,
    device_identifier: 'kiosk-main-gate-a',
    name: 'Main Entrance Facial Kiosk A',
    location: 'Academic Block A • Lobby',
    device_type: 'KIOSK',
    app_version: '2.4.1',
    is_online: true,
    status: 'ONLINE',
    camera_status: 'OK',
    network_latency_ms: 18,
    battery_level: null,
    pending_sync_count: 0,
    minutes_since_heartbeat: 1
  },
  {
    id: 2,
    device_identifier: 'tablet-cse-lab-2',
    name: 'CSE Lab 2 Checkpoint',
    location: 'Engineering Wing • Floor 2',
    device_type: 'TABLET',
    app_version: '2.4.1',
    is_online: true,
    status: 'ONLINE',
    camera_status: 'OK',
    network_latency_ms: 26,
    battery_level: 88,
    pending_sync_count: 0,
    minutes_since_heartbeat: 2
  },
  {
    id: 3,
    device_identifier: 'cctv-auditorium-north',
    name: 'Auditorium Edge Camera',
    location: 'Central Auditorium Gate',
    device_type: 'CCTV',
    app_version: '2.3.8',
    is_online: false,
    status: 'OFFLINE',
    camera_status: 'CHECK',
    network_latency_ms: null,
    battery_level: null,
    pending_sync_count: 4,
    minutes_since_heartbeat: 19
  }
];

export default function DeviceHealthDashboard({
  token,
  isDemoMode = false,
  playCyberSound = () => {},
  routeView: propRouteView,
  setRouteView: propSetRouteView
}) {
  const [localRouteView, setLocalRouteView] = useState(null);
  const routeView = propSetRouteView !== undefined ? propRouteView : localRouteView;
  const setRouteView = propSetRouteView !== undefined ? propSetRouteView : setLocalRouteView;

  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Register Form State
  const [registerFormData, setRegisterFormData] = useState({
    device_identifier: '',
    name: '',
    location: '',
    device_type: 'KIOSK',
    app_version: '2.4.1'
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const isSandbox = isDemoMode || token === 'guest-demo-token';

  const fetchData = useCallback(async () => {
    if (!token) return;
    if (isSandbox) {
      const filtered = statusFilter === 'ALL'
        ? DEMO_DEVICES
        : DEMO_DEVICES.filter(d => d.status === statusFilter);
      setDevices(filtered);
      setSummary({
        total_devices: DEMO_DEVICES.length,
        online_count: DEMO_DEVICES.filter(d => d.is_online).length,
        offline_count: DEMO_DEVICES.filter(d => !d.is_online).length,
        healthy_cameras: DEMO_DEVICES.filter(d => d.camera_status === 'OK').length
      });
      setErrorMsg('');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const query = statusFilter === 'ALL' ? '' : `?status=${encodeURIComponent(statusFilter)}`;
      const [summaryResponse, listResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/devices/summary`, { headers }),
        fetch(`${API_BASE_URL}/devices${query}`, { headers })
      ]);
      if (!summaryResponse.ok || !listResponse.ok) throw new Error('Could not refresh devices.');
      const [totals, rows] = await Promise.all([summaryResponse.json(), listResponse.json()]);
      setSummary(totals);
      setDevices(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load device health telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, isSandbox]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchData();
      }
    };
    run();
    const interval = setInterval(fetchData, 30000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [fetchData]);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerFormData.device_identifier.trim() || !registerFormData.name.trim()) {
      setErrorMsg('Identifier and Name are required.');
      return;
    }
    if (isSandbox) {
      playCyberSound('success');
      setSuccessMsg(`Sandbox preview: Kiosk "${registerFormData.name}" onboarded locally.`);
      setRegisterFormData({ device_identifier: '', name: '', location: '', device_type: 'KIOSK', app_version: '2.4.1' });
      setRouteView(null);
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }

    setIsRegistering(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/devices/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerFormData)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Device registration failed.');
      }
      playCyberSound('success');
      setSuccessMsg(`Device "${registerFormData.name}" onboarded successfully.`);
      setRegisterFormData({
        device_identifier: '',
        name: '',
        location: '',
        device_type: 'KIOSK',
        app_version: '2.4.1'
      });
      setRouteView(null);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsRegistering(false);
    }
  };

  // ── SUBPAGE 1: ONBOARD NEW KIOSK ───────────────────────────────────────────
  if (routeView?.mode === 'register') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {errorMsg && (
              <div className="feedback-banner error" role="alert">
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="golden-os-form-section">
                <div className="golden-os-form-section-title">Kiosk Identity & Placement</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div>
                    <label className="golden-os-field-label">Unique Device Identifier *</label>
                    <input
                      type="text"
                      required
                      className="golden-os-input"
                      placeholder="e.g. kiosk-north-gate-1"
                      value={registerFormData.device_identifier}
                      onChange={e => setRegisterFormData({ ...registerFormData, device_identifier: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="golden-os-field-label">Device Friendly Name *</label>
                    <input
                      type="text"
                      required
                      className="golden-os-input"
                      placeholder="e.g. Main Entrance Facial Kiosk A"
                      value={registerFormData.name}
                      onChange={e => setRegisterFormData({ ...registerFormData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="golden-os-field-label">Device Type</label>
                    <select
                      className="golden-os-input"
                      value={registerFormData.device_type}
                      onChange={e => setRegisterFormData({ ...registerFormData, device_type: e.target.value })}
                    >
                      <option value="KIOSK">Stationary Kiosk</option>
                      <option value="MOBILE">Mobile Checkpoint</option>
                      <option value="CCTV">CCTV Edge Unit</option>
                      <option value="TABLET">Classroom Tablet</option>
                    </select>
                  </div>
                  <div>
                    <label className="golden-os-field-label">Campus Location</label>
                    <input
                      type="text"
                      className="golden-os-input"
                      placeholder="e.g. Block C, Floor 2"
                      value={registerFormData.location}
                      onChange={e => setRegisterFormData({ ...registerFormData, location: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { playCyberSound('click'); setErrorMsg(''); setRouteView(null); }}
                  className="golden-os-feedback-filter-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="golden-os-action-pill"
                >
                  <Plus size={15} />
                  <span>{isRegistering ? 'Registering...' : 'Register Kiosk'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 2: KIOSK / SENSOR DETAIL VIEW ──────────────────────────────────
  if (routeView?.mode === 'detail') {
    const activeDevice =
      devices.find(d => String(d.id) === String(routeView.id)) ||
      routeView.item ||
      DEMO_DEVICES.find(d => isSandbox && String(d.id) === String(routeView.id)) ||
      null;

    if (!activeDevice) {
      return (
        <div className="golden-os-page-bottom-safe">
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Monitor size={36} color="#916d30" style={{ opacity: 0.45, marginBottom: '10px' }} />
              <div style={{ fontWeight: 700, color: '#25231f', marginBottom: '6px' }}>Device not loaded</div>
              <button type="button" className="golden-os-action-pill" onClick={() => setRouteView(null)}>
                Back to Fleet
              </button>
            </div>
          </div>
        </div>
      );
    }

    const isOnline = Boolean(activeDevice.is_online);

    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Compact Header Card */}
            <div className="golden-os-inset-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div className="golden-os-avatar" style={{
                  background: isOnline ? '#ecfdf5' : '#fef2f2',
                  color: isOnline ? '#059669' : '#dc2626',
                  borderColor: isOnline ? '#a7f3d0' : '#fecaca'
                }}>
                  {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#25231f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeDevice.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#696358' }}>
                    ID: {activeDevice.device_identifier} • {activeDevice.device_type}
                  </div>
                </div>
              </div>

              <span style={{
                background: isOnline ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${isOnline ? '#a7f3d0' : '#fecaca'}`,
                color: isOnline ? '#059669' : '#dc2626',
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '4px 12px',
                borderRadius: '999px'
              }}>
                {activeDevice.status}
              </span>
            </div>

            {/* Hardware Telemetry Details */}
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Live Sensor Telemetry</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div className="golden-os-inset-card">
                  <div style={{ fontSize: '0.72rem', color: '#696358', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Camera size={13} color="#80602c" /> CAMERA OPTICS
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: activeDevice.camera_status === 'OK' ? '#059669' : '#dc2626', marginTop: '4px' }}>
                    {activeDevice.camera_status}
                  </div>
                </div>

                <div className="golden-os-inset-card">
                  <div style={{ fontSize: '0.72rem', color: '#696358', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Cpu size={13} color="#80602c" /> LATENCY
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#25231f', marginTop: '4px' }}>
                    {activeDevice.network_latency_ms ? `${activeDevice.network_latency_ms} ms` : 'N/A'}
                  </div>
                </div>

                <div className="golden-os-inset-card">
                  <div style={{ fontSize: '0.72rem', color: '#696358', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Battery size={13} color="#80602c" /> POWER STATE
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#25231f', marginTop: '4px' }}>
                    {activeDevice.battery_level ? `${activeDevice.battery_level}%` : 'Mains Power'}
                  </div>
                </div>

                <div className="golden-os-inset-card">
                  <div style={{ fontSize: '0.72rem', color: '#696358', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={13} color="#80602c" /> SYNC BACKLOG
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: activeDevice.pending_sync_count > 0 ? '#d97706' : '#059669', marginTop: '4px' }}>
                    {activeDevice.pending_sync_count} pending
                  </div>
                </div>
              </div>
            </div>

            {/* Deployment Info */}
            <div className="golden-os-list-shell">
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#58534a', fontSize: '0.84rem' }}>
                  <MapPin size={15} color="#916d30" />
                  <span>Campus Placement</span>
                </div>
                <strong style={{ fontSize: '0.85rem', color: '#25231f' }}>
                  {activeDevice.location || 'Not specified'}
                </strong>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#58534a', fontSize: '0.84rem' }}>
                  <Clock size={15} color="#916d30" />
                  <span>Last Heartbeat</span>
                </div>
                <strong style={{ fontSize: '0.85rem', color: '#25231f' }}>
                  {activeDevice.minutes_since_heartbeat}m ago • v{activeDevice.app_version || '2.4.1'}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '10px' }}>
              <button
                type="button"
                className="golden-os-feedback-filter-btn"
                onClick={() => { playCyberSound('click'); fetchData(); }}
                disabled={isLoading}
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span>Refresh Telemetry</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN SCREEN: CLEAN GOLDEN GATE MASTER LIST ─────────────────────────────
  return (
    <div className="golden-os-page-bottom-safe">
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Compact Top Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {summary ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: 700, color: '#58534a' }}>
                <span>{summary.total_devices} Total</span>
                <span style={{ color: '#059669' }}>• {summary.online_count} Online</span>
                <span style={{ color: summary.offline_count > 0 ? '#dc2626' : '#696358' }}>• {summary.offline_count} Offline</span>
                <span style={{ color: '#80602c' }}>• {summary.healthy_cameras} Cameras OK</span>
              </div>
            ) : <div />}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { playCyberSound('click'); fetchData(); }}
                disabled={isLoading}
                className="golden-os-feedback-filter-btn"
                aria-label="Refresh devices"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => { playCyberSound('click'); setErrorMsg(''); setRouteView({ mode: 'register' }); }}
                className="golden-os-action-pill"
              >
                <Plus size={15} />
                <span>Onboard Kiosk</span>
              </button>
            </div>
          </div>

          {successMsg && (
            <div className="feedback-banner success" role="status">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="feedback-banner error" role="alert">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {['ALL', 'ONLINE', 'OFFLINE', 'DEGRADED'].map(f => (
              <button
                key={f}
                type="button"
                onClick={() => { playCyberSound('click'); setStatusFilter(f); }}
                className={`golden-os-feedback-filter-btn ${statusFilter === f ? 'active' : ''}`}
              >
                {f === 'ALL' ? 'All Devices' : f}
              </button>
            ))}
          </div>

          {/* Clean Fleet List (No Clutter Boxes) */}
          <div className="golden-os-list-shell">
            {devices.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#696358' }}>
                <Monitor size={34} style={{ opacity: 0.35, marginBottom: '10px' }} />
                <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#25231f' }}>No Devices Registered</div>
                <button
                  type="button"
                  onClick={() => { playCyberSound('click'); setRouteView({ mode: 'register' }); }}
                  className="golden-os-action-pill"
                  style={{ marginTop: '12px' }}
                >
                  <Plus size={14} />
                  <span>Onboard First Kiosk</span>
                </button>
              </div>
            ) : (
              devices.map(d => {
                const isOnline = Boolean(d.is_online);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      playCyberSound('click');
                      setRouteView({ mode: 'detail', id: String(d.id), item: d });
                    }}
                    className="golden-os-list-row"
                    style={{ width: '100%', background: 'transparent', borderLeft: 'none', borderRight: 'none', borderTop: 'none', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div className="golden-os-avatar" style={{
                        background: isOnline ? '#ecfdf5' : '#fef2f2',
                        color: isOnline ? '#059669' : '#dc2626',
                        borderColor: isOnline ? '#a7f3d0' : '#fecaca',
                        flexShrink: 0
                      }}>
                        {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#696358', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.location || d.device_type} • {d.device_identifier}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{
                        background: isOnline ? '#ecfdf5' : '#fef2f2',
                        border: `1px solid ${isOnline ? '#a7f3d0' : '#fecaca'}`,
                        color: isOnline ? '#059669' : '#dc2626',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '999px'
                      }}>
                        {d.status}
                      </span>
                      <ChevronRight size={16} color="#9c9384" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
