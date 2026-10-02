import React from 'react';
import { ShieldCheck, AlertCircle, MapPin, Globe, Lock } from 'lucide-react';

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
  setLockdownActive,
  saveSystemSettings,
  isSavingSettings,
  settingsMessage,
  setSettingsMessage,
  settingsError,
  setSettingsError,
  addDiagnosticLog,
  playCyberSound,
}) {
  return (
    <div 
      className="surface-card" 
      style={{ 
        padding: '30px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px', 
        border: '1px solid var(--border-subtle)', 
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: 'var(--shadow-card)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Security Perimeter & Geofence Configuration
            </h3>
            <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.72rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
              CAMPUS SECURITY
            </span>
          </div>
          <p style={{ color: '#475569', fontSize: '0.85rem', margin: '6px 0 0' }}>
            Manage GPS location boundaries, authorized Wi-Fi subnet gates, and high-priority emergency threat lockdown controls.
          </p>
        </div>

        {/* Realtime Status Pill Badges */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 10px', borderRadius: '8px', background: settingsGeoEnabled ? '#ecfdf5' : '#f1f5f9', color: settingsGeoEnabled ? '#059669' : '#64748b', fontSize: '0.75rem', fontWeight: 700, border: '1px solid var(--border-subtle)' }}>
            GPS: {settingsGeoEnabled ? `ACTIVE (${settingsRadius}m)` : 'OFF'}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: '8px', background: settingsIpEnabled ? '#ecfdf5' : '#f1f5f9', color: settingsIpEnabled ? '#059669' : '#64748b', fontSize: '0.75rem', fontWeight: 700, border: '1px solid var(--border-subtle)' }}>
            IP Gate: {settingsIpEnabled ? 'ACTIVE' : 'OFF'}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: '8px', background: lockdownActive ? '#fef2f2' : '#ecfdf5', color: lockdownActive ? '#dc2626' : '#059669', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${lockdownActive ? '#fecaca' : '#a7f3d0'}` }}>
            {lockdownActive ? 'LOCKDOWN ENGAGED' : 'DISARMED'}
          </span>
        </div>
      </div>

      {settingsMessage && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#059669', fontSize: '0.88rem', fontWeight: 600 }}>
          {settingsMessage}
        </div>
      )}

      {settingsError && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#dc2626', fontSize: '0.88rem', fontWeight: 600 }}>
          {settingsError}
        </div>
      )}

      {/* Section 1: Emergency Lockdown Control */}
      <div style={{ background: lockdownActive ? '#fef2f2' : '#f8fafc', border: `1px solid ${lockdownActive ? '#f87171' : 'var(--border-subtle)'}`, borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ color: lockdownActive ? '#dc2626' : '#0f172a', fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={20} style={{ color: lockdownActive ? '#dc2626' : '#d97706' }} /> Emergency Campus Lockdown Switch
            </h4>
            <p style={{ color: '#475569', fontSize: '0.82rem', margin: '4px 0 0' }}>
              Instantly suspends all live camera feeds campus-wide and stops active student attendance verification.
            </p>
          </div>

          <button
            type="button"
            disabled={userRole === 'student'}
            onClick={() => {
              const newLock = !lockdownActive;
              setLockdownActive(newLock);
              localStorage.setItem('lockdownActive', newLock);
              if (newLock) {
                if (typeof addDiagnosticLog === 'function') addDiagnosticLog('CRITICAL: Emergency system lockdown protocol engaged!');
                if (typeof playCyberSound === 'function') playCyberSound('error');
              } else {
                if (typeof addDiagnosticLog === 'function') addDiagnosticLog('INFO: Emergency lockdown disarmed. Camera relays restored.');
                if (typeof playCyberSound === 'function') playCyberSound('click');
              }
            }}
            style={{
              padding: '10px 20px',
              background: lockdownActive ? '#059669' : '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: userRole === 'student' ? 'not-allowed' : 'pointer',
              opacity: userRole === 'student' ? 0.5 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {lockdownActive ? 'Disarm & Reset Lockdown' : 'Engage Emergency Lockdown'}
          </button>
        </div>

        {lockdownActive && (
          <div style={{ padding: '12px 16px', background: '#fee2e2', border: '1px solid #f87171', borderRadius: '8px', color: '#991b1b', fontSize: '0.84rem' }}>
            <span><strong>Lockdown Active:</strong> Camera scanner sessions are currently suspended. Click 'Disarm' to resume normal operation.</span>
          </div>
        )}
      </div>

      {/* Section 2: GPS Geofencing Campus Boundary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={18} style={{ color: '#1e40af' }} /> GPS Geofence Campus Boundary
        </h4>
        <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem', display: 'block' }}>GPS Radius Enforcement</span>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Restricts student check-in strictly within allowed geographical campus radius.</span>
            </div>
            <button
              type="button"
              disabled={userRole === 'student'}
              onClick={() => setSettingsGeoEnabled(!settingsGeoEnabled)}
              style={{
                padding: '6px 14px',
                background: settingsGeoEnabled ? '#ecfdf5' : '#ffffff',
                border: `1px solid ${settingsGeoEnabled ? '#a7f3d0' : 'var(--border-subtle)'}`,
                borderRadius: '8px',
                color: settingsGeoEnabled ? '#059669' : '#64748b',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: userRole === 'student' ? 'not-allowed' : 'pointer'
              }}
            >
              {settingsGeoEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {settingsGeoEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>Center Latitude</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input"
                  value={settingsLat} 
                  onChange={e => setSettingsLat(e.target.value)} 
                  disabled={userRole === 'student'}
                  style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', color: '#0f172a', padding: '10px 12px', borderRadius: '8px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>Center Longitude</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input" 
                  value={settingsLon} 
                  onChange={e => setSettingsLon(e.target.value)} 
                  disabled={userRole === 'student'}
                  style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', color: '#0f172a', padding: '10px 12px', borderRadius: '8px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>Allowed Radius (meters)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={settingsRadius} 
                  onChange={e => setSettingsRadius(e.target.value)} 
                  disabled={userRole === 'student'}
                  style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', color: '#0f172a', padding: '10px 12px', borderRadius: '8px' }}
                />
              </div>
              {userRole !== 'student' && (
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (position) => {
                            setSettingsLat(position.coords.latitude);
                            setSettingsLon(position.coords.longitude);
                            setSettingsMessage("Fetched current GPS coordinates!");
                            setTimeout(() => setSettingsMessage(""), 2500);
                          },
                          () => {
                            setSettingsError("Could not fetch location permissions.");
                            setTimeout(() => setSettingsError(""), 3000);
                          }
                        );
                      }
                    }}
                    style={{ width: '100%', height: '42px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    📍 Set Current Location
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: IP Subnet Network Gate */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h4 style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Globe size={18} style={{ color: '#7c3aed' }} /> Wi-Fi / IP Subnet Restriction Gate
        </h4>
        <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.88rem', display: 'block' }}>IP Address Restriction</span>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Restricts attendance logging strictly to authorized Wi-Fi networks.</span>
            </div>
            <button
              type="button"
              disabled={userRole === 'student'}
              onClick={() => setSettingsIpEnabled(!settingsIpEnabled)}
              style={{
                padding: '6px 14px',
                background: settingsIpEnabled ? '#f5f3ff' : '#ffffff',
                border: `1px solid ${settingsIpEnabled ? '#ddd6fe' : 'var(--border-subtle)'}`,
                borderRadius: '8px',
                color: settingsIpEnabled ? '#7c3aed' : '#64748b',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: userRole === 'student' ? 'not-allowed' : 'pointer'
              }}
            >
              {settingsIpEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {settingsIpEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <label style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>Permitted IP Addresses / Subnets (comma separated)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. 127.0.0.1, 192.168.1.0/24"
                value={settingsIpRanges} 
                onChange={e => setSettingsIpRanges(e.target.value)} 
                disabled={userRole === 'student'}
                style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', color: '#0f172a', padding: '10px 12px', borderRadius: '8px' }}
              />
              <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                Separate multiple IP addresses or CIDR subnets with a comma. Examples: <code>127.0.0.1</code>, <code>192.168.1.0/24</code>.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      {userRole !== 'student' ? (
        <button
          type="button"
          onClick={saveSystemSettings}
          className="btn-primary"
          style={{ 
            padding: '12px 28px', 
            borderRadius: '10px', 
            fontSize: '0.92rem',
            fontWeight: 700,
            width: '100%',
            cursor: 'pointer'
          }}
          disabled={isSavingSettings}
        >
          {isSavingSettings ? 'Saving settings...' : 'Save Security & Geofence Settings'}
        </button>
      ) : (
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', margin: 0 }}>🔒 Read-Only Mode (Configured by Administrator)</p>
      )}
    </div>
  );
}
