import { Sliders, Eye, Shield, Cpu, Download, CheckCircle2, AlertCircle, Save } from 'lucide-react';

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
  playCyberSound,
  savingPolicy = false,
  policyMessage = '',
  onSavePolicy,
}) {
  const canEdit = userRole === 'admin' || userRole === 'teacher';
  const isErrorMsg = /fail|error|timeout|sign in|could not/i.test(policyMessage || '');

  const handleExportDiagnostics = () => {
    if (playCyberSound) playCyberSound('success');
    const logsData = {
      system: 'Smart Attendance System - Core Security Diagnostics',
      timestamp: new Date().toISOString(),
      biometricMatchThreshold,
      biometricFilterEnabled: biometricConfidenceFilterEnabled,
      antiSpoofingThreshold,
      livenessBypass,
      aiCognitiveLevel,
      diagnosticLevel,
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
  };

  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
      {/* Live Policy KPI Summary Strip */}
      <div className="golden-os-kpi-strip">
        <div className="golden-os-kpi-tile">
          <span className="golden-os-kpi-value" style={{ color: '#6e4e1c' }}>
            {biometricConfidenceFilterEnabled ? `${Math.round(biometricMatchThreshold * 100)}%` : 'Off'}
          </span>
          <span className="golden-os-kpi-label">Confidence</span>
        </div>
        <div className="golden-os-kpi-tile">
          <span className="golden-os-kpi-value" style={{ color: '#047857' }}>
            {antiSpoofingThreshold.toFixed(2)}
          </span>
          <span className="golden-os-kpi-label">Blink EAR</span>
        </div>
        <div className="golden-os-kpi-tile">
          <span className="golden-os-kpi-value" style={{ color: livenessBypass ? '#b45309' : '#047857', fontSize: '0.96rem' }}>
            {livenessBypass ? 'Bypassed' : 'Active'}
          </span>
          <span className="golden-os-kpi-label">Liveness</span>
        </div>
      </div>

      {/* 1. Face Matching & Confidence */}
      <div className="golden-os-form-section">
        <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sliders size={13} />
          <span>Face Matching &amp; Threshold</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', columnGap: '12px' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2b2112' }}>Match Confidence Filter</div>
            <div style={{ fontSize: '0.76rem', color: '#6b5b3e', marginTop: '2px' }}>
              {biometricConfidenceFilterEnabled
                ? 'Requires minimum cosine similarity score to mark present'
                : 'Disabled: accepts closest face match for testing'}
            </div>
          </div>

          <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', flexShrink: 0, cursor: canEdit ? 'pointer' : 'not-allowed' }}>
            <input
              type="checkbox"
              checked={biometricConfidenceFilterEnabled}
              disabled={!canEdit}
              onChange={(e) => {
                setBiometricConfidenceFilterEnabled(e.target.checked);
                if (playCyberSound) playCyberSound('click');
              }}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: biometricConfidenceFilterEnabled ? '#80602c' : '#d6ccb8',
              borderRadius: '999px',
              transition: 'background-color 0.2s ease',
            }}>
              <span style={{
                position: 'absolute',
                height: '18px',
                width: '18px',
                left: biometricConfidenceFilterEnabled ? '25px' : '3px',
                bottom: '3px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transition: 'left 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }} />
            </span>
          </label>
        </div>

        {biometricConfidenceFilterEnabled && (
          <div style={{ background: '#faf6ec', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e7dac0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ color: '#5c4b30', fontSize: '0.78rem', fontWeight: 600 }}>Required Similarity</span>
              <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#6e4e1c', fontFamily: 'monospace' }}>
                {Math.round(biometricMatchThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.80"
              max="0.99"
              step="0.01"
              value={biometricMatchThreshold}
              disabled={!canEdit}
              onChange={(e) => setBiometricMatchThreshold(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#80602c', cursor: canEdit ? 'pointer' : 'not-allowed' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78674b', fontSize: '0.7rem', fontWeight: 600, marginTop: '4px' }}>
              <span>80% Permissive</span>
              <span>90% Balanced</span>
              <span>99% Strict</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Anti-Spoofing & Liveness */}
      <div className="golden-os-form-section">
        <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Shield size={13} />
          <span>Liveness &amp; Anti-Spoofing</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '180px', flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2b2112' }}>Eye-Blink Verification</div>
            <div style={{ fontSize: '0.76rem', color: '#6b5b3e', marginTop: '2px' }}>
              {livenessBypass
                ? 'Instant detection active without waiting for blink'
                : 'Requires live blink to block photos and screen replays'}
            </div>
          </div>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => {
              setLivenessBypass(prev => !prev);
              if (playCyberSound) playCyberSound('click');
            }}
            style={{
              padding: '7px 13px',
              borderRadius: '999px',
              fontSize: '0.76rem',
              fontWeight: 700,
              cursor: canEdit ? 'pointer' : 'not-allowed',
              background: livenessBypass ? '#fffbeb' : 'rgba(5, 150, 105, 0.1)',
              color: livenessBypass ? '#b45309' : '#047857',
              border: `1px solid ${livenessBypass ? '#fde68a' : 'rgba(5, 150, 105, 0.3)'}`,
              flexShrink: 0,
            }}
          >
            {livenessBypass ? 'Bypassed (Instant)' : 'Active (Blink Required)'}
          </button>
        </div>

        <div style={{ background: '#faf6ec', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e7dac0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ color: '#5c4b30', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Eye size={13} /> Blink EAR Sensitivity
            </span>
            <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#047857', fontFamily: 'monospace' }}>
              {antiSpoofingThreshold.toFixed(2)} EAR
            </span>
          </div>
          <input
            type="range"
            min="0.15"
            max="0.30"
            step="0.01"
            value={antiSpoofingThreshold}
            disabled={!canEdit}
            onChange={(e) => setAntiSpoofingThreshold(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#047857', cursor: canEdit ? 'pointer' : 'not-allowed' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78674b', fontSize: '0.7rem', fontWeight: 600, marginTop: '4px' }}>
            <span>0.15 Fast</span>
            <span>0.22 Standard</span>
            <span>0.30 Strict</span>
          </div>
        </div>
      </div>

      {/* 3. AI Copilot & Telemetry Logging */}
      <div className="golden-os-form-section">
        <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={13} />
          <span>AI Copilot &amp; Diagnostics</span>
        </div>

        <div className="golden-os-fields-2">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">AI Copilot Analysis Mode</label>
            <select
              className="form-input"
              value={aiCognitiveLevel}
              disabled={!canEdit}
              onChange={(e) => {
                setAiCognitiveLevel(e.target.value);
                if (playCyberSound) playCyberSound('click');
              }}
            >
              <option value="standard">Standard Mode (Fast Responses)</option>
              <option value="hyper">Deep Analytics Mode</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Diagnostics Log Level</label>
            <select
              className="form-input"
              value={diagnosticLevel}
              disabled={!canEdit}
              onChange={(e) => {
                setDiagnosticLevel(e.target.value);
                if (playCyberSound) playCyberSound('click');
              }}
            >
              <option value="NONE">NONE (Minimal Logs)</option>
              <option value="INFO">INFO (Important Events)</option>
              <option value="DEBUG">DEBUG (Standard Logs)</option>
              <option value="TRACE">TRACE (Full Telemetry)</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          disabled={!canEdit}
          onClick={handleExportDiagnostics}
          className="golden-os-feedback-filter-btn"
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '0.82rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            alignSelf: 'flex-start',
          }}
        >
          <Download size={14} />
          <span>Export Diagnostics JSON</span>
        </button>
      </div>

      {policyMessage && (
        <div role="status" className={`feedback-banner ${isErrorMsg ? 'is-error' : 'is-success'}`}>
          {isErrorMsg ? <AlertCircle size={16} style={{ flexShrink: 0 }} /> : <CheckCircle2 size={16} style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{policyMessage}</span>
        </div>
      )}

      {userRole === 'admin' && onSavePolicy && (
        <button
          type="button"
          onClick={onSavePolicy}
          disabled={savingPolicy}
          className="golden-os-primary-action"
          style={{ width: '100%', justifyContent: 'center', padding: '12px 18px', borderRadius: '12px', fontSize: '0.84rem', fontWeight: 700, gap: '8px' }}
        >
          <Save size={15} />
          <span>{savingPolicy ? 'Saving...' : 'Save campus biometric settings'}</span>
        </button>
      )}
      </div>
    </div>
  );
}
