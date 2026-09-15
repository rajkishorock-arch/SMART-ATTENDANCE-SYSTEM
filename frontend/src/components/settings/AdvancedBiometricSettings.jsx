export default function AdvancedBiometricSettings({
  biometricConfidenceFilterEnabled,
  setBiometricConfidenceFilterEnabled,
  biometricMatchThreshold,
  setBiometricMatchThreshold,
  antiSpoofingThreshold,
  setAntiSpoofingThreshold,
  livenessBypass,
  setLivenessBypass,
  aiCognitiveLevel,
  setAiCognitiveLevel,
  diagnosticLevel,
  setDiagnosticLevel,
  userRole,
  playCyberSound
}) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: '30px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Console Header */}
      <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, #00f2fe, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🛡️ Extreme Biometric Security & Core Engine Parameters
            </h3>
            <span style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', color: '#34d399', fontSize: '0.72rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
              SYSTEM HARDENED v1.0.16
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '6px 0 0' }}>
            Fine-tune biometric match confidence thresholds, anti-spoofing liveness sensitivity, AI cognitive models, and system telemetry logs.
          </p>
        </div>

        {/* HUD Status Counters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.3)', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', color: '#00f2fe', fontWeight: 700 }}>
            ⚡ MESH LOCK: 5ms
          </div>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', color: '#34d399', fontWeight: 700 }}>
            🛡️ EAR STRICTNESS: {antiSpoofingThreshold.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Security Controls Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* 1. Biometric Match Confidence Filter */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: `1px solid ${biometricConfidenceFilterEnabled ? 'rgba(0, 242, 254, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px',
          boxShadow: biometricConfidenceFilterEnabled ? '0 8px 25px rgba(0, 242, 254, 0.15)' : 'none'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎯</span>
                <label style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>Biometric Match Confidence Filter</label>
              </div>
              
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '22px', cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={biometricConfidenceFilterEnabled}
                  disabled={userRole !== 'admin' && userRole !== 'teacher'}
                  onChange={(e) => {
                    setBiometricConfidenceFilterEnabled(e.target.checked);
                    if (playCyberSound) playCyberSound('click');
                  }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: biometricConfidenceFilterEnabled ? '#00f2fe' : 'rgba(255,255,255,0.1)',
                  borderRadius: '22px', transition: '.3s',
                  boxShadow: biometricConfidenceFilterEnabled ? '0 0 12px #00f2fe' : 'none'
                }}>
                  <span style={{
                    position: 'absolute', height: '16px', width: '16px',
                    left: biometricConfidenceFilterEnabled ? '24px' : '3px', bottom: '3px',
                    backgroundColor: '#0f172a', borderRadius: '50%', transition: '.3s'
                  }} />
                </span>
              </label>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0, lineHeight: 1.4 }}>
              {biometricConfidenceFilterEnabled 
                ? 'Only matches students whose facial feature embedding similarity meets or exceeds this required confidence percentage.'
                : '⚡ Filter Disabled: Camera matches faces regardless of confidence score for high-speed multi-tenant check-in.'}
            </p>
          </div>

          {biometricConfidenceFilterEnabled ? (
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Strictness Level:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00f2fe' }}>
                  {Math.round(biometricMatchThreshold * 100)}% Similarity Required
                </span>
              </div>
              <input 
                type="range"
                min="0.80"
                max="0.99"
                step="0.01"
                value={biometricMatchThreshold}
                disabled={!biometricConfidenceFilterEnabled || (userRole !== 'admin' && userRole !== 'teacher')}
                onChange={(e) => setBiometricMatchThreshold(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#00f2fe', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.72rem', marginTop: '6px' }}>
                <span>80% (Permissive)</span>
                <span>90% (Recommended)</span>
                <span>99% (Strict Bank-Grade)</span>
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', color: '#fbbf24', padding: '10px 14px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}>
              ⚠️ Warning: Confidence Filter disabled. Unrecognized faces may be matched with nearest candidate.
            </div>
          )}
        </div>

        {/* 2. Anti-Spoofing Blink EAR Strictness */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>👁️</span>
              <label style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>Anti-Spoofing Blink EAR Strictness</label>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0, lineHeight: 1.4 }}>
              Measures physical eye blink aspect ratio (EAR). Higher value requires deliberate physical eye closure to defeat 2D photos, screens, and video spoofs.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Sensitivity Ratio:</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                {antiSpoofingThreshold.toFixed(2)} EAR Threshold
              </span>
            </div>
            <input 
              type="range"
              min="0.15"
              max="0.30"
              step="0.01"
              value={antiSpoofingThreshold}
              disabled={userRole !== 'admin' && userRole !== 'teacher'}
              onChange={(e) => setAntiSpoofingThreshold(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.72rem', marginTop: '6px' }}>
              <span>0.15 (Fast Blink)</span>
              <span>0.22 (Standard)</span>
              <span>0.30 (Strict Anti-Spoof)</span>
            </div>
          </div>
        </div>

        {/* 3. Liveness Verification Mode Toggle */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: `1px solid ${livenessBypass ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                <label style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>Liveness Verification Mode</label>
              </div>
              <button
                type="button"
                disabled={userRole !== 'admin' && userRole !== 'teacher'}
                onClick={() => {
                  setLivenessBypass(prev => !prev);
                  if (playCyberSound) playCyberSound('click');
                }}
                style={{
                  padding: '6px 14px',
                  background: livenessBypass ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  border: `1px solid ${livenessBypass ? '#ef4444' : '#10b981'}`,
                  borderRadius: '10px',
                  color: livenessBypass ? '#f87171' : '#34d399',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {livenessBypass ? '⚡ BYPASSED (INSTANT)' : '🛡️ ACTIVE (BLINK)'}
              </button>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0, lineHeight: 1.4 }}>
              {livenessBypass 
                ? '⚡ Bypassed Mode: Facial recognition runs immediately upon face detection in frame without waiting for eye blink.'
                : '🛡️ Active Security Mode: Requires the student to perform a physical eye blink to verify real human presence before attendance is logged.'}
            </p>
          </div>

          <div style={{ background: livenessBypass ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', border: `1px solid ${livenessBypass ? '#ef4444' : '#10b981'}`, padding: '10px 14px', borderRadius: '10px', fontSize: '0.78rem', color: livenessBypass ? '#f87171' : '#34d399', fontWeight: 600 }}>
            {livenessBypass ? '⚠️ Warning: Photos or video playback will be accepted.' : '✓ Liveness Enforced: Screen & photo spoofing actively blocked.'}
          </div>
        </div>

        {/* 4. AI Assistant Cognitive Level */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>🧠</span>
              <label style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>AI Copilot Cognitive Brain Mode</label>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0, lineHeight: 1.4 }}>
              Controls intelligence depth for AI Assistant queries, student risk predictions, and automated system reports.
            </p>
          </div>

          <div>
            <select 
              value={aiCognitiveLevel}
              disabled={userRole !== 'admin' && userRole !== 'teacher'}
              onChange={(e) => {
                setAiCognitiveLevel(e.target.value);
                if (playCyberSound) playCyberSound('click');
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="standard" style={{ background: '#0f172a', color: '#fff' }}>Standard Copilot Mode (Fast Conversations)</option>
              <option value="hyper" style={{ background: '#0f172a', color: '#fff' }}>Hyper-Processing Cognitive Mode (Deep Analytics)</option>
            </select>
            <div style={{ color: '#a78bfa', fontSize: '0.75rem', marginTop: '6px' }}>
              {aiCognitiveLevel === 'hyper' ? '⚡ Hyper Mode: Deep statistical analysis & automatic report generation active.' : '✓ Standard Mode: Balanced response speed & accuracy.'}
            </div>
          </div>
        </div>

        {/* 5. Diagnostic Logging Level & Telemetry Exporter */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justify: 'space-between',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>📑</span>
              <label style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.95rem' }}>Diagnostics Logging Verbosity</label>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0, lineHeight: 1.4 }}>
              Set internal telemetry log level and export complete system diagnostics for audit or troubleshooting.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select 
              value={diagnosticLevel}
              disabled={userRole !== 'admin' && userRole !== 'teacher'}
              onChange={(e) => {
                setDiagnosticLevel(e.target.value);
                if (playCyberSound) playCyberSound('click');
              }}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="NONE" style={{ background: '#0f172a', color: '#fff' }}>NONE (Mute Console Logs)</option>
              <option value="INFO" style={{ background: '#0f172a', color: '#fff' }}>INFO (Important Events Only)</option>
              <option value="DEBUG" style={{ background: '#0f172a', color: '#fff' }}>DEBUG (Standard Telemetry Logs)</option>
              <option value="TRACE" style={{ background: '#0f172a', color: '#fff' }}>TRACE (Full Frame Vector & Audio Diagnostics)</option>
            </select>

            <button
              type="button"
              disabled={userRole !== 'admin' && userRole !== 'teacher'}
              onClick={() => {
                if (playCyberSound) playCyberSound('success');
                const logsData = {
                  system: 'Smart Attendance System - Core Security Diagnostics',
                  timestamp: new Date().toISOString(),
                  biometricMatchThreshold,
                  biometricFilterEnabled: biometricConfidenceFilterEnabled,
                  antiSpoofingThreshold,
                  livenessBypass,
                  aiCognitiveLevel,
                  diagnosticLevel
                };
                const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `system_diagnostics_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              style={{
                background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                color: '#0f172a',
                border: 'none',
                padding: '10px',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.83rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              📥 Export Core Telemetry & Security Logs JSON
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
