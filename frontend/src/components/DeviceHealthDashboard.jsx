import './campusAdmin.css';
import { useState, useEffect, useCallback } from 'react';
import {
  Monitor, Wifi, WifiOff,
  Plus, RefreshCw, AlertTriangle, CheckCircle2,
  X, Send, Clock
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

export default function DeviceHealthDashboard({
  token,
  playCyberSound = () => {}
}) {
  const [devices, setDevices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Register Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerFormData, setRegisterFormData] = useState({
    device_identifier: '',
    name: '',
    location: '',
    device_type: 'KIOSK',
    app_version: '1.2.0'
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
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
      setDevices(rows);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load device health telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchData();
      }
    };
    run();
    // Auto-refresh telemetry every 30s
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
    setIsRegistering(true);
    try {
      const res = await fetch(`${API_BASE_URL}/devices/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
      setShowRegisterModal(false);
      setRegisterFormData({
        device_identifier: '',
        name: '',
        location: '',
        device_type: 'KIOSK',
        app_version: '1.2.0'
      });
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="device-dashboard-container" style={{
      color: 'var(--color-text-main)',
      width: '100%',
      maxWidth: '100%',
      padding: '0',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div className="campus-actions">
          <button
            onClick={() => { playCyberSound('click'); fetchData(); }}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => { playCyberSound('click'); setShowRegisterModal(true); }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Onboard Kiosk
          </button>
      </div>

      {/* Toast Messages */}
      {successMsg && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#059669',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Fleet Summary KPI Cards in Responsive Horizontal Grid */}
      {summary && (
        <div className="campus-metrics">
          <div style={{
            background: '#ffffff',
            border: '1px solid #e4dfd5',
            borderLeft: '4px solid #916d30',
            borderRadius: '12px',
            padding: '10px 12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <span style={{ fontSize: '0.68rem', color: '#696358', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>
              Devices
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#25231f', marginTop: '2px' }}>
              {summary.total_devices}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#696358' }}>Scanners & kiosks</span>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e4dfd5',
            borderLeft: '4px solid #059669',
            borderRadius: '12px',
            padding: '10px 12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <span style={{ fontSize: '0.68rem', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>
              Online
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
              {summary.online_count}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#696358' }}>Heartbeat &lt; 5m</span>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e4dfd5',
            borderLeft: '4px solid #dc2626',
            borderRadius: '12px',
            padding: '10px 12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <span style={{ fontSize: '0.68rem', color: summary.offline_count > 0 ? '#dc2626' : '#696358', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>
              Offline
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: summary.offline_count > 0 ? '#dc2626' : '#25231f', marginTop: '2px' }}>
              {summary.offline_count}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#696358' }}>Inspection alert</span>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e4dfd5',
            borderLeft: '4px solid #80602c',
            borderRadius: '12px',
            padding: '10px 12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <span style={{ fontSize: '0.68rem', color: '#80602c', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>
              Cameras
            </span>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#80602c', marginTop: '2px' }}>
              {summary.healthy_cameras}
            </div>
            <span style={{ fontSize: '0.68rem', color: '#696358' }}>Clear optics & focus</span>
          </div>
        </div>
      )}

      {/* Status Filter Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px'
      }}>
        {['ALL', 'ONLINE', 'OFFLINE', 'DEGRADED'].map(f => (
          <button
            key={f}
            onClick={() => { playCyberSound('click'); setStatusFilter(f); }}
            style={{
              background: statusFilter === f ? 'var(--color-primary-light)' : '#ffffff',
              border: statusFilter === f ? '1px solid rgba(30, 64, 175, 0.25)' : '1px solid var(--border-subtle)',
              color: statusFilter === f ? 'var(--color-primary)' : '#58534a',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {f === 'ALL' ? 'All Devices' : f}
          </button>
        ))}
      </div>

      {/* Devices Fleet Grid */}
      {devices.length === 0 ? (
        <div className="surface-card" style={{
          background: '#ffffff',
          border: '1px dashed var(--border-strong)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          color: '#696358'
        }}>
          <Monitor size={40} style={{ opacity: 0.35, marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 6px 0', color: '#25231f', fontSize: '1.1rem', fontWeight: 700 }}>No Devices Found</h4>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#58534a' }}>
            Click "Onboard Kiosk" above to register your first scanning station or facial checkpoint.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '14px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {devices.map(d => {
            const isOnline = d.is_online;


            return (
              <div
                key={d.id}
                className="surface-card"
                style={{
                  background: '#ffffff',
                  border: isOnline ? '1px solid #a7f3d0' : '1px solid #fecaca',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Top: Name and Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: '#25231f' }}>
                        {d.name}
                      </h3>
                      <span style={{ fontSize: '0.78rem', color: '#696358' }}>ID: {d.device_identifier}</span>
                    </div>

                    <span style={{
                      background: isOnline ? '#ecfdf5' : '#fef2f2',
                      border: isOnline ? '1px solid #a7f3d0' : '1px solid #fecaca',
                      color: isOnline ? '#059669' : '#dc2626',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                      {d.status}
                    </span>
                  </div>

                  {/* Location & Type */}
                  <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#58534a' }}>
                    📍 {d.location || 'Location not specified'} • <span style={{ color: '#696358' }}>{d.device_type}</span>
                  </p>

                  {/* Telemetry Metrics */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    background: '#faf9f6',
                    border: '1px solid var(--border-subtle)',
                    padding: '12px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    fontSize: '0.8rem'
                  }}>
                    <div>
                      <span style={{ color: '#696358' }}>Camera Sensor:</span>
                      <div style={{ fontWeight: 600, color: d.camera_status === 'OK' ? '#059669' : '#dc2626' }}>
                        {d.camera_status}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#696358' }}>Latency:</span>
                      <div style={{ fontWeight: 600, color: '#80602c' }}>
                        {d.network_latency_ms ? `${d.network_latency_ms} ms` : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#696358' }}>Battery:</span>
                      <div style={{ fontWeight: 600, color: '#d97706' }}>
                        {d.battery_level ? `${d.battery_level}%` : 'Mains Power'}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#696358' }}>Sync Backlog:</span>
                      <div style={{ fontWeight: 600, color: d.pending_sync_count > 0 ? '#d97706' : '#059669' }}>
                        {d.pending_sync_count} pending
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer: Heartbeat & Action */}
                <div style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.78rem', color: '#696358', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Ping: {d.minutes_since_heartbeat}m ago
                  </span>


                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ONBOARD NEW KIOSK */}
      {showRegisterModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="surface-card" style={{
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: 'var(--shadow-modal)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowRegisterModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: '#696358',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                padding: '6px',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Monitor size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#25231f', fontWeight: 700 }}>Onboard Attendance Device</h3>
            </div>

            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#46423b', marginBottom: '5px', fontWeight: 600 }}>
                  Unique Device Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. kiosk-north-gate-1"
                  value={registerFormData.device_identifier}
                  onChange={e => setRegisterFormData({ ...registerFormData, device_identifier: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--border-strong)',
                    color: '#25231f',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#46423b', marginBottom: '5px', fontWeight: 600 }}>
                  Device Friendly Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Main Entrance Facial Kiosk A"
                  value={registerFormData.name}
                  onChange={e => setRegisterFormData({ ...registerFormData, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--border-strong)',
                    color: '#25231f',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#46423b', marginBottom: '5px', fontWeight: 600 }}>
                    Device Type
                  </label>
                  <select
                    value={registerFormData.device_type}
                    onChange={e => setRegisterFormData({ ...registerFormData, device_type: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-strong)',
                      color: '#25231f',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '0.88rem'
                    }}
                  >
                    <option value="KIOSK">Stationary Kiosk</option>
                    <option value="MOBILE">Mobile Checkpoint</option>
                    <option value="CCTV">CCTV Edge Unit</option>
                    <option value="TABLET">Classroom Tablet</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#46423b', marginBottom: '5px', fontWeight: 600 }}>
                    Campus Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Block C, Floor 2"
                    value={registerFormData.location}
                    onChange={e => setRegisterFormData({ ...registerFormData, location: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-strong)',
                      color: '#25231f',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="btn-secondary"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isRegistering}
                  className="btn-primary"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: isRegistering ? 'not-allowed' : 'pointer'
                  }}
                >
                  Register Kiosk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
