import { AlertCircle } from 'lucide-react';

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
  isSavingSettings,
  saveSystemSettings,
  settingsMessage,
  setSettingsMessage,
  settingsError,
  setSettingsError,
  addDiagnosticLog,
  playCyberSound,
}) {
  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: '30px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px', 
        border: '1px solid rgba(239, 68, 68, 0.3)', 
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
        borderRadius: '20px',
        color: '#f8fafc'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              🛡️ Cyber Security Perimeter & Emergency Lockdown
            </h3>
            <span style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#f87171', fontSize: '0.72rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
              MERGED PERIMETER CONTROL
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '6px 0 0' }}>
            Manage GPS location boundaries, authorized Wi-Fi subnet gates, and high-priority emergency threat lockdown protocols.
          </p>
        </div>

        {/* Realtime Status Pill Badges */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 10px', borderRadius: '8px', background: settingsGeoEnabled ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255,255,255,0.05)', color: settingsGeoEnabled ? '#00f2fe' : '#94a3b8', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>
            🛰️ GPS: {settingsGeoEnabled ? `ACTIVE (${settingsRadius}m)` : 'OFF'}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: '8px', background: settingsIpEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', color: settingsIpEnabled ? '#34d399' : '#94a3b8', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)' }}>
            🔒 IP Gate: {settingsIpEnabled ? 'ACTIVE' : 'OFF'}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: '8px', background: lockdownActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.15)', color: lockdownActive ? '#f87171' : '#34d399', fontSize: '0.75rem', fontWeight: 800, border: `1px solid ${lockdownActive ? '#ef4444' : '#10b981'}` }}>
            {lockdownActive ? '🚨 LOCKDOWN ENGAGED' : '🟢 DISARMED'}
          </span>
        </div>
      </div>

      {settingsMessage && (
        <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', color: '#34d399', fontSize: '0.88rem', fontWeight: 600 }}>
          {settingsMessage}
        </div>
      )}

      {settingsError && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#f87171', fontSize: '0.88rem', fontWeight: 600 }}>
          {settingsError}
        </div>
      )}

      {/* Section 1: 🚨 High-Priority Emergency Threat Lockdown Control */}
      <div style={{ background: lockdownActive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0, 0, 0, 0.3)', border: `1px solid ${lockdownActive ? '#ef4444' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: lockdownActive ? '0 0 25px rgba(239, 68, 68, 0.25)' : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ color: '#f87171', fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={22} style={{ color: '#ef4444' }} /> 1. Emergency System Threat Lockdown
            </h4>
            <p style={{ color: '#cbd5e1', fontSize: '0.8rem', margin: '4px 0 0' }}>
              Instantly severs all face recognition camera feeds campus-wide, blocks student check-ins, and triggers audio hazard alerts.
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
              padding: '12px 24px',
              background: lockdownActive ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #ef4444, #dc2626)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: userRole === 'student' ? 'not-allowed' : 'pointer',
              opacity: userRole === 'student' ? 0.5 : 1,
              boxShadow: lockdownActive ? '0 0 20px rgba(16, 185, 129, 0.4)' : '0 0 20px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {lockdownActive ? '🟢 DISARM & RESET RELAYS' : '🚨 ENGAGE LOCKDOWN'}
          </button>
        </div>

        {lockdownActive && (
          <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '10px', color: '#fca5a5', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', animation: 'pulse 1.5s infinite' }}>
            <span>🚨 <strong>HAZARD STATE ACTIVE:</strong> Camera streams are severed. Attendance scanner is locked. Click 'DISARM & RESET RELAYS' to restore normal operation.</span>
          </div>
        )}
      </div>

      {/* Section 2: 🛰️ GPS Geofencing Campus Boundary */}
      <div>
        <h4 style={{ color: '#00f2fe', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🛰️ 2. GPS Geofencing Campus Radius Control
        </h4>
        <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem', display: 'block' }}>GPS Radius Enforcement</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Restricts student check-in strictly within allowed geographical radius.</span>
            </div>
            <button
              type="button"
              disabled={userRole === 'student'}
              onClick={() => setSettingsGeoEnabled(!settingsGeoEnabled)}
              style={{
                padding: '6px 14px',
                background: settingsGeoEnabled ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${settingsGeoEnabled ? '#00f2fe' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px',
                color: settingsGeoEnabled ? '#00f2fe' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: userRole === 'student' ? 'not-allowed' : 'pointer'
              }}
            >
              {settingsGeoEnabled ? '🟢 ENABLED' : '⚪ DISABLED'}
            </button>
          </div>

          {settingsGeoEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Center Latitude</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input"
                  value={settingsLat} 
                  onChange={e => setSettingsLat(e.target.value)} 
                  disabled={userRole === 'student'}
                  style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(0, 242, 254, 0.3)', color: '#fff' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Center Longitude</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input" 
                  value={settingsLon} 
                  onChange={e => setSettingsLon(e.target.value)} 
                  disabled={userRole === 'student'}
                  style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(0, 242, 254, 0.3)', color: '#fff' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Allowed Radius (meters)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={settingsRadius} 
                  onChange={e => setSettingsRadius(e.target.value)} 
                  disabled={userRole === 'student'}
                  style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(0, 242, 254, 0.3)', color: '#fff' }}
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
                    style={{ width: '100%', height: '42px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.15)', border: '1px solid #00f2fe', color: '#00f2fe', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    📍 Set Current Location
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: 🔒 IP Subnet Network Gate */}
      <div>
        <h4 style={{ color: '#a78bfa', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          🔒 3. IP Subnet Network Access Gate
        </h4>
        <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(167, 139, 250, 0.2)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem', display: 'block' }}>IP Address Restriction</span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Restricts attendance logging strictly to authorized Wi-Fi IP networks.</span>
            </div>
            <button
              type="button"
              disabled={userRole === 'student'}
              onClick={() => setSettingsIpEnabled(!settingsIpEnabled)}
              style={{
                padding: '6px 14px',
                background: settingsIpEnabled ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${settingsIpEnabled ? '#a78bfa' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '8px',
                color: settingsIpEnabled ? '#c084fc' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: userRole === 'student' ? 'not-allowed' : 'pointer'
              }}
            >
              {settingsIpEnabled ? '🟢 ENABLED' : '⚪ DISABLED'}
            </button>
          </div>

          {settingsIpEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600 }}>Permitted IP Addresses / Subnets (comma separated)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. 127.0.0.1, 192.168.1.0/24"
                value={settingsIpRanges} 
                onChange={e => setSettingsIpRanges(e.target.value)} 
                disabled={userRole === 'student'}
                style={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(167, 139, 250, 0.3)', color: '#fff' }}
              />
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Separate multiple IP addresses or CIDR subnets with a comma. Examples: <code>127.0.0.1</code>, <code>192.168.1.0/24</code>.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Unified Save Button */}
      {userRole !== 'student' ? (
        <button
          type="button"
          onClick={saveSystemSettings}
          style={{ 
            padding: '14px 28px', 
            borderRadius: '12px', 
            fontSize: '0.95rem',
            fontWeight: 800,
            width: '100%',
            background: 'linear-gradient(90deg, #00f2fe, #4facfe)',
            color: '#0f172a',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0, 242, 254, 0.3)'
          }}
          disabled={isSavingSettings}
        >
          {isSavingSettings ? '💾 Saving settings...' : '💾 Save All Security & Geofence Settings'}
        </button>
      ) : (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>🔒 Read-Only Mode (Configured by Administrator)</p>
      )}
    </div>
  );
}
