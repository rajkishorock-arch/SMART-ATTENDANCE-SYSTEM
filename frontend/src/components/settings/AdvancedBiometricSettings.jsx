import React from 'react';
import { Sliders, Eye, Shield, Cpu, FileText, Download } from 'lucide-react';

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
    <div 
      className="surface-card"
      style={{
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: 'var(--shadow-card)',
        color: 'var(--color-text-main)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}
    >
      {/* Console Header */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Face Recognition & Biometric Settings
            </h3>
            <span style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', fontSize: '0.72rem', padding: '3px 10px', borderRadius: '12px', fontWeight: 700 }}>
              ACTIVE ENGINE
            </span>
          </div>
          <p style={{ color: '#475569', fontSize: '0.85rem', margin: '4px 0 0' }}>
            Configure facial recognition match threshold, anti-spoof liveness strictness, and system telemetry logging.
          </p>
        </div>

        {/* HUD Status Counters */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', color: '#1e40af', fontWeight: 700 }}>
            Similarity Threshold: {Math.round(biometricMatchThreshold * 100)}%
          </div>
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
            EAR Strictness: {antiSpoofingThreshold.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Security Controls Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* 1. Biometric Match Confidence Filter */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} style={{ color: '#1e40af' }} />
                <label style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>Match Confidence Filter</label>
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
                  backgroundColor: biometricConfidenceFilterEnabled ? '#1e40af' : '#cbd5e1',
                  borderRadius: '22px', transition: '.3s'
                }}>
                  <span style={{
                    position: 'absolute', height: '16px', width: '16px',
                    left: biometricConfidenceFilterEnabled ? '24px' : '3px', bottom: '3px',
                    backgroundColor: '#ffffff', borderRadius: '50%', transition: '.3s'
                  }} />
                </span>
              </label>
            </div>

            <p style={{ color: '#475569', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
              {biometricConfidenceFilterEnabled 
                ? 'Only marks attendance when face similarity meets or exceeds the required confidence score.'
                : 'Filter disabled: Matches faces regardless of confidence score for permissive testing.'}
            </p>
          </div>

          {biometricConfidenceFilterEnabled ? (
            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Required Similarity:</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e40af' }}>
                  {Math.round(biometricMatchThreshold * 100)}%
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
                style={{ width: '100%', accentColor: '#1e40af', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.72rem', marginTop: '6px' }}>
                <span>80% (Permissive)</span>
                <span>90% (Recommended)</span>
                <span>99% (Strict)</span>
              </div>
            </div>
          ) : (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600 }}>
              ⚠️ Confidence filter disabled. Closest candidate will be matched.
            </div>
          )}
        </div>

        {/* 2. Anti-Spoofing Blink Strictness */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Eye size={18} style={{ color: '#059669' }} />
              <label style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>Blink Liveness Strictness</label>
            </div>
            <p style={{ color: '#475569', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
              Measures eye blink aspect ratio (EAR). Requires deliberate eye blink to prevent photo and video playback spoofing.
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Sensitivity Ratio:</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#059669' }}>
                {antiSpoofingThreshold.toFixed(2)} EAR
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
              style={{ width: '100%', accentColor: '#059669', cursor: 'pointer' }}
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
          background: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} style={{ color: '#7c3aed' }} />
                <label style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>Liveness Verification</label>
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
                  background: livenessBypass ? '#fef2f2' : '#ecfdf5',
                  border: `1px solid ${livenessBypass ? '#fecaca' : '#a7f3d0'}`,
                  borderRadius: '8px',
                  color: livenessBypass ? '#dc2626' : '#059669',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                {livenessBypass ? 'Bypassed (Instant)' : 'Active (Blink Required)'}
              </button>
            </div>
            <p style={{ color: '#475569', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
              {livenessBypass 
                ? 'Bypassed mode: Marks attendance immediately upon facial detection without waiting for an eye blink.'
                : 'Active security mode: Requires the student to physically blink to verify real human presence.'}
            </p>
          </div>

          <div style={{ background: livenessBypass ? '#fffbeb' : '#ecfdf5', border: `1px solid ${livenessBypass ? '#fde68a' : '#a7f3d0'}`, padding: '10px 14px', borderRadius: '8px', fontSize: '0.78rem', color: livenessBypass ? '#b45309' : '#059669', fontWeight: 600 }}>
            {livenessBypass ? '⚡ Instant check-in mode active.' : '✓ Real human presence verified by physical blink.'}
          </div>
        </div>

        {/* 4. AI Assistant Cognitive Level */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Cpu size={18} style={{ color: '#d97706' }} />
              <label style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>AI Copilot Analysis Mode</label>
            </div>
            <p style={{ color: '#475569', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
              Controls depth of intelligence for student attendance shortfall alerts and automated report summaries.
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
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                color: '#0f172a',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="standard">Standard Mode (Fast Responses)</option>
              <option value="hyper">Deep Analytics Mode (Statistical Reports)</option>
            </select>
          </div>
        </div>

        {/* 5. Diagnostic Logging Level & Telemetry Exporter */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '14px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FileText size={18} style={{ color: '#2563eb' }} />
              <label style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>Diagnostics Logging Verbosity</label>
            </div>
            <p style={{ color: '#475569', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
              Select telemetry log level or download security diagnostics for technical auditing.
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
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                color: '#0f172a',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="NONE">NONE (Minimal Logs)</option>
              <option value="INFO">INFO (Important Events Only)</option>
              <option value="DEBUG">DEBUG (Standard Logs)</option>
              <option value="TRACE">TRACE (Full Diagnostic Telemetry)</option>
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
              className="btn-secondary"
              style={{
                padding: '10px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Download size={15} /> Export Security Diagnostics JSON
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
