import { useState } from 'react';
import {
  ScanFace,
  Eye,
  Cpu,
  Download,
  Save,
  ChevronRight,
  CheckCircle2,
  Sliders
} from 'lucide-react';

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
  playCyberSound = () => {},
  savingPolicy,
  policyMessage,
  onSavePolicy,
  routeView = null,
  setRouteView = null
}) {
  const [localSubMode, setLocalSubMode] = useState(null);
  const [exportStatus, setExportStatus] = useState('');

  const subMode = setRouteView
    ? (routeView?.sub === 'advanced' ? routeView.id : null)
    : localSubMode;

  const openSubPage = (id) => {
    playCyberSound('click');
    if (setRouteView) {
      setRouteView({ sub: 'advanced', mode: 'detail', id });
      window.location.hash = `#/settings/advanced/${id}`;
    } else {
      setLocalSubMode(id);
    }
  };

  const handleExportDiagnostics = () => {
    playCyberSound('click');
    const payload = {
      exportedAt: new Date().toISOString(),
      userRole,
      settings: {
        biometricConfidenceFilterEnabled,
        biometricMatchThreshold,
        antiSpoofingThreshold,
        livenessBypass,
        aiCognitiveLevel,
        diagnosticLevel
      }
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biometric-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus('Diagnostics JSON downloaded.');
  };

  const renderPolicySaveFooter = () => (
    <>
      {policyMessage && (
        <div className="feedback-banner success" role="status">
          <CheckCircle2 size={16} />
          <span>{policyMessage}</span>
        </div>
      )}
      {userRole === 'admin' && typeof onSavePolicy === 'function' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="golden-os-primary-action"
            style={{ justifyContent: 'center' }}
            onClick={() => {
              playCyberSound('click');
              onSavePolicy();
            }}
            disabled={savingPolicy}
          >
            <Save size={15} />
            <span>{savingPolicy ? 'Saving...' : 'Save campus biometric settings'}</span>
          </button>
        </div>
      )}
    </>
  );

  // ── SUBPAGE 1: FACE MATCH THRESHOLD ───────────────────────────────────────
  if (subMode === 'matching') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-inset-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#25231f' }}>
                  Match Confidence Filter
                </div>
                <div style={{ fontSize: '0.76rem', color: '#696358' }}>
                  {biometricConfidenceFilterEnabled
                    ? `Reject matches below ${Math.round(biometricMatchThreshold * 100)}%`
                    : 'Disabled — uses closest match'}
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle match confidence filter"
                className={biometricConfidenceFilterEnabled ? 'golden-os-feedback-filter-btn active' : 'golden-os-feedback-filter-btn'}
                onClick={() => {
                  const val = !biometricConfidenceFilterEnabled;
                  setBiometricConfidenceFilterEnabled(val);
                  localStorage.setItem('biometric_confidence_filter', val ? 'true' : 'false');
                  playCyberSound('click');
                }}
              >
                {biometricConfidenceFilterEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            {biometricConfidenceFilterEnabled && (
              <div className="golden-os-form-section">
                <div className="golden-os-form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Similarity Cutoff</span>
                  <span style={{ color: '#059669', fontFamily: 'monospace' }}>
                    {(biometricMatchThreshold * 100).toFixed(0)}% Match
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Similarity cutoff percentage"
                  min="0.40"
                  max="0.80"
                  step="0.05"
                  value={biometricMatchThreshold}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setBiometricMatchThreshold(val);
                    localStorage.setItem('biometric_threshold', val.toString());
                  }}
                  style={{ width: '100%', accentColor: '#785927', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#787166', marginTop: '6px' }}>
                  <span>40% Relaxed</span>
                  <span>55% Balanced</span>
                  <span>80% Strict</span>
                </div>
              </div>
            )}

            {renderPolicySaveFooter()}
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 2: LIVENESS & BLINK VERIFICATION ──────────────────────────────
  if (subMode === 'liveness') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-inset-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#25231f' }}>
                  Eye-Blink Verification
                </div>
                <div style={{ fontSize: '0.76rem', color: '#696358' }}>
                  {livenessBypass
                    ? 'Instant scan without blink wait'
                    : 'Requires blink to block photo spoofs'}
                </div>
              </div>
              <button
                type="button"
                aria-label="Toggle eye-blink liveness gate"
                className={!livenessBypass ? 'golden-os-feedback-filter-btn active' : 'golden-os-feedback-filter-btn'}
                onClick={() => {
                  const next = !livenessBypass;
                  setLivenessBypass(next);
                  localStorage.setItem('liveness_bypass', next ? 'true' : 'false');
                  playCyberSound('click');
                }}
              >
                {livenessBypass ? 'Bypassed' : 'Active'}
              </button>
            </div>

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Blink EAR Sensitivity</span>
                <span style={{ color: '#059669', fontFamily: 'monospace' }}>
                  {antiSpoofingThreshold.toFixed(2)} EAR
                </span>
              </div>
              <input
                type="range"
                aria-label="Blink EAR sensitivity"
                min="0.15"
                max="0.30"
                step="0.01"
                value={antiSpoofingThreshold}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAntiSpoofingThreshold(val);
                  localStorage.setItem('antispoofing_threshold', val.toString());
                }}
                style={{ width: '100%', accentColor: '#785927', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#787166', marginTop: '6px' }}>
                <span>0.15 Fast</span>
                <span>0.22 Standard</span>
                <span>0.30 Strict</span>
              </div>
            </div>

            {renderPolicySaveFooter()}
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 3: AI COPILOT & DIAGNOSTICS ───────────────────────────────────
  if (subMode === 'diagnostics') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Assistant &amp; Telemetry Settings</div>
              <div className="golden-os-fields-2">
                <div>
                  <label className="golden-os-field-label" htmlFor="ai-cognitive-select">AI Copilot Analysis Mode</label>
                  <select
                    id="ai-cognitive-select"
                    className="golden-os-input"
                    value={aiCognitiveLevel}
                    onChange={(e) => {
                      setAiCognitiveLevel(e.target.value);
                      localStorage.setItem('ai_cognitive_level', e.target.value);
                      playCyberSound('click');
                    }}
                  >
                    <option value="Standard">Standard Mode (Fast Responses)</option>
                    <option value="Deep Analytics">Deep Analytics (Detailed Insights)</option>
                    <option value="Minimalist">Concise Mode (Summary Only)</option>
                  </select>
                </div>
                <div>
                  <label className="golden-os-field-label" htmlFor="diagnostic-level-select">Diagnostics Log Level</label>
                  <select
                    id="diagnostic-level-select"
                    className="golden-os-input"
                    value={diagnosticLevel}
                    onChange={(e) => {
                      setDiagnosticLevel(e.target.value);
                      localStorage.setItem('diagnostic_level', e.target.value);
                      playCyberSound('click');
                    }}
                  >
                    <option value="VERBOSE">VERBOSE (Full Trace)</option>
                    <option value="DEBUG">DEBUG (Standard Logs)</option>
                    <option value="PRODUCTION">PRODUCTION (Errors Only)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  className="golden-os-feedback-filter-btn"
                  onClick={handleExportDiagnostics}
                >
                  <Download size={14} />
                  <span>Export Diagnostics JSON</span>
                </button>
              </div>
            </div>

            {exportStatus && (
              <div className="feedback-banner success" role="status">
                <CheckCircle2 size={16} />
                <span>{exportStatus}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN SCREEN: CLEAN ORGANIZED FACE & BIOMETRICS DIRECTORY ──────────────
  return (
    <div className="golden-os-page-bottom-safe">
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="golden-os-inset-card" style={{ padding: '10px 14px', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            <Sliders size={15} color="#785927" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Confidence: {biometricConfidenceFilterEnabled ? `${(biometricMatchThreshold * 100).toFixed(0)}%` : 'Off'} • EAR: {antiSpoofingThreshold.toFixed(2)} • {livenessBypass ? 'Instant' : 'Strict'}
            </span>
          </div>

          <div className="golden-os-list-shell">
            <button
              type="button"
              className="golden-os-list-row"
              onClick={() => openSubPage('matching')}
            >
              <span className="golden-os-avatar" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669' }}>
                <ScanFace size={17} />
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                  Face Match Threshold
                </span>
                <span style={{ display: 'block', fontSize: '0.76rem', color: '#696358' }}>
                  Minimum cosine similarity score &amp; confidence filter
                </span>
              </span>
              <span style={{
                background: biometricConfidenceFilterEnabled ? '#ecfdf5' : '#f4f0e8',
                border: `1px solid ${biometricConfidenceFilterEnabled ? '#a7f3d0' : '#ddd6c7'}`,
                color: biometricConfidenceFilterEnabled ? '#059669' : '#696358',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: '999px'
              }}>
                {biometricConfidenceFilterEnabled ? `${(biometricMatchThreshold * 100).toFixed(0)}%` : 'Off'}
              </span>
              <ChevronRight size={16} color="#9e9689" />
            </button>

            <button
              type="button"
              className="golden-os-list-row"
              onClick={() => openSubPage('liveness')}
            >
              <span className="golden-os-avatar" style={{ background: '#faf5ea', border: '1px solid #dfcfaf', color: '#785927' }}>
                <Eye size={17} />
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                  Liveness &amp; Blink Verification
                </span>
                <span style={{ display: 'block', fontSize: '0.76rem', color: '#696358' }}>
                  Anti-spoofing eye-blink gate &amp; EAR sensitivity
                </span>
              </span>
              <span style={{
                background: livenessBypass ? '#fffbeb' : '#ecfdf5',
                border: `1px solid ${livenessBypass ? '#fde68a' : '#a7f3d0'}`,
                color: livenessBypass ? '#d97706' : '#059669',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: '999px'
              }}>
                {livenessBypass ? 'Instant' : `${antiSpoofingThreshold.toFixed(2)} EAR`}
              </span>
              <ChevronRight size={16} color="#9e9689" />
            </button>

            <button
              type="button"
              className="golden-os-list-row"
              onClick={() => openSubPage('diagnostics')}
            >
              <span className="golden-os-avatar" style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#7c3aed' }}>
                <Cpu size={17} />
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                  AI Copilot &amp; Diagnostics
                </span>
                <span style={{ display: 'block', fontSize: '0.76rem', color: '#696358' }}>
                  Analysis mode, log verbosity &amp; JSON export
                </span>
              </span>
              <span style={{
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                color: '#7c3aed',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '3px 9px',
                borderRadius: '999px'
              }}>
                {diagnosticLevel}
              </span>
              <ChevronRight size={16} color="#9e9689" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
