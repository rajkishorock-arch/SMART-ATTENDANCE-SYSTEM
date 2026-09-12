import React, { useState, useEffect, useCallback } from 'react';
import { 
  Monitor, Wifi, WifiOff, Camera, Battery, Activity, 
  Plus, RefreshCw, AlertTriangle, CheckCircle2, XCircle, 
  Sliders, Shield, Trash2, X, Send, Clock, Layers
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

export default function DeviceHealthDashboard({
  token,
  currentUser,
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

  // Heartbeat ping state map { [deviceId]: boolean }
  const [pingingIds, setPingingIds] = useState({});

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch summary
      const sumRes = await fetch(`${API_BASE_URL}/devices/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }

      // 2. Fetch devices list
      const url = statusFilter === 'ALL'
        ? `${API_BASE_URL}/devices`
        : `${API_BASE_URL}/devices?status=${statusFilter}`;
      const devRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (devRes.ok) {
        const devData = await devRes.json();
        setDevices(devData);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load device health telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchData();
    // Auto-refresh telemetry every 30s
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Send Test Heartbeat Ping ───────────────────────────────────────────────
  const handleSendPing = async (device) => {
    setPingingIds(prev => ({ ...prev, [device.id]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/devices/heartbeat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_identifier: device.device_identifier,
          status: 'ONLINE',
          battery_level: Math.floor(Math.random() * 20) + 80,
          camera_status: 'OK',
          network_latency_ms: Math.floor(Math.random() * 30) + 12,
          pending_sync_count: 0
        })
      });
      if (!res.ok) throw new Error('Failed to send heartbeat ping.');
      playCyberSound('success');
      setSuccessMsg(`Telemetry heartbeat ping delivered to "${device.name}"!`);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setPingingIds(prev => ({ ...prev, [device.id]: false }));
    }
  };

  // ── Register New Device ────────────────────────────────────────────────────
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
      color: '#f8fafc',
      padding: '24px',
      maxWidth: '1280px',
      margin: '0 auto',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.75) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(12px)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                borderRadius: '10px',
                padding: '8px',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Monitor size={22} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
                Kiosk & Camera Device Health Telemetry
              </h2>
              <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34d399',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '16px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                Phase 6 Production
              </span>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem', maxWidth: '750px', lineHeight: 1.5 }}>
              Continuous heartbeat monitoring, automatic offline kiosk detection, camera optical health verification, 
              and edge sync backlog telemetry across your campus.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { playCyberSound('click'); fetchData(); }}
              disabled={isLoading}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                padding: '10px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.88rem',
                fontWeight: 600
              }}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              onClick={() => { playCyberSound('click'); setShowRegisterModal(true); }}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              Onboard Kiosk
            </button>
          </div>
        </div>
      </div>

      {/* Toast Messages */}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem'
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Fleet Summary KPI Cards */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '18px'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Deployed Fleet
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
              {summary.total_devices}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Scanners, kiosks, tablets</span>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '18px'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Online & Active
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', marginTop: '6px' }}>
              {summary.online_count}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Heartbeat &lt; 5m</span>
          </div>

          <div style={{
            background: summary.offline_count > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(30, 41, 59, 0.5)',
            border: summary.offline_count > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '18px'
          }}>
            <span style={{ fontSize: '0.78rem', color: summary.offline_count > 0 ? '#f87171' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Offline / Stalled
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: summary.offline_count > 0 ? '#f87171' : '#cbd5e1', marginTop: '6px' }}>
              {summary.offline_count}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Requires technician check</span>
          </div>

          <div style={{
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '12px',
            padding: '18px'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Cameras Functional
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22d3ee', marginTop: '6px' }}>
              {summary.healthy_cameras}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Clear optics & focus</span>
          </div>
        </div>
      )}

      {/* Status Filter Buttons */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '12px'
      }}>
        {['ALL', 'ONLINE', 'OFFLINE', 'DEGRADED'].map(f => (
          <button
            key={f}
            onClick={() => { playCyberSound('click'); setStatusFilter(f); }}
            style={{
              background: statusFilter === f ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              border: statusFilter === f ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid transparent',
              color: statusFilter === f ? '#34d399' : '#94a3b8',
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {f === 'ALL' ? 'All Devices' : f}
          </button>
        ))}
      </div>

      {/* Devices Fleet Grid */}
      {devices.length === 0 ? (
        <div style={{
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px dashed rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <Monitor size={40} style={{ opacity: 0.35, marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 6px 0', color: '#94a3b8', fontSize: '1.1rem' }}>No Devices Found</h4>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            Click "Onboard Kiosk" above to register your first scanning station or facial checkpoint.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '18px'
        }}>
          {devices.map(d => {
            const isOnline = d.is_online;
            const isPinging = pingingIds[d.id];

            return (
              <div
                key={d.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: isOnline ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Top: Name and Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                        {d.name}
                      </h3>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>ID: {d.device_identifier}</span>
                    </div>

                    <span style={{
                      background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: isOnline ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                      color: isOnline ? '#34d399' : '#f87171',
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
                  <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                    📍 {d.location || 'Location not specified'} • <span style={{ color: '#64748b' }}>{d.device_type}</span>
                  </p>

                  {/* Telemetry Metrics */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    background: 'rgba(30, 41, 59, 0.5)',
                    padding: '12px',
                    borderRadius: '10px',
                    marginBottom: '16px',
                    fontSize: '0.8rem'
                  }}>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Camera Sensor:</span>
                      <div style={{ fontWeight: 600, color: d.camera_status === 'OK' ? '#34d399' : '#f87171' }}>
                        {d.camera_status}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#94a3b8' }}>Latency:</span>
                      <div style={{ fontWeight: 600, color: '#22d3ee' }}>
                        {d.network_latency_ms ? `${d.network_latency_ms} ms` : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#94a3b8' }}>Battery:</span>
                      <div style={{ fontWeight: 600, color: '#fbbf24' }}>
                        {d.battery_level ? `${d.battery_level}%` : 'Mains Power'}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: '#94a3b8' }}>Sync Backlog:</span>
                      <div style={{ fontWeight: 600, color: d.pending_sync_count > 0 ? '#fbbf24' : '#34d399' }}>
                        {d.pending_sync_count} pending
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer: Heartbeat & Action */}
                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> Ping: {d.minutes_since_heartbeat}m ago
                  </span>

                  <button
                    disabled={isPinging}
                    onClick={() => handleSendPing(d)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#cbd5e1',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: isPinging ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Send size={12} />
                    {isPinging ? 'Pinging...' : 'Send Ping'}
                  </button>
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
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
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
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Monitor size={22} color="#34d399" />
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Onboard Attendance Device</h3>
            </div>

            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '5px' }}>
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
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '5px' }}>
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
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '5px' }}>
                    Device Type
                  </label>
                  <select
                    value={registerFormData.device_type}
                    onChange={e => setRegisterFormData({ ...registerFormData, device_type: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
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
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '5px' }}>
                    Campus Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Block C, Floor 2"
                    value={registerFormData.location}
                    onChange={e => setRegisterFormData({ ...registerFormData, location: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
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
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
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
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    color: '#fff',
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
