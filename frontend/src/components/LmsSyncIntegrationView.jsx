import { useState, useEffect, useCallback } from 'react';
import { 
  Globe, Database, UploadCloud, DownloadCloud, CheckCircle2, 
  AlertTriangle, RefreshCw, Clock, Save
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

export default function LmsSyncIntegrationView({
  token,
  playCyberSound = () => {}
}) {
  const [provider, setProvider] = useState('CANVAS');
  const [apiEndpoint, setApiEndpoint] = useState('https://canvas.institution.edu/api/v1');
  const [apiToken, setApiToken] = useState('');
  const [syncCron, setSyncCron] = useState('0 23 * * *');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingAttendance, setIsSyncingAttendance] = useState(false);
  const [isSyncingRoster, setIsSyncingRoster] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch Config
      const cfgRes = await fetch(`${API_BASE_URL}/lms/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (cfgRes.ok) {
        const cfg = await cfgRes.json();
        if (cfg) {
          setProvider(cfg.provider || 'CANVAS');
          setApiEndpoint(cfg.api_endpoint || '');
          setSyncCron(cfg.sync_schedule_cron || '0 23 * * *');
          setAutoSyncEnabled(cfg.auto_sync_enabled ?? true);
        }
      }

      // 2. Fetch Logs
      const logsRes = await fetch(`${API_BASE_URL}/lms/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch LMS configuration.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchData();
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [fetchData]);

  // ── Save LMS Settings ──────────────────────────────────────────────────────
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/lms/config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          api_endpoint: apiEndpoint,
          api_token: apiToken || undefined,
          sync_schedule_cron: syncCron,
          auto_sync_enabled: autoSyncEnabled
        })
      });
      if (!res.ok) throw new Error('Failed to update LMS integration configuration.');
      await res.json();
      playCyberSound('success');
      setSuccessMsg('LMS integration configuration saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Trigger Outbound Attendance Sync ───────────────────────────────────────
  const handleSyncAttendance = async () => {
    setIsSyncingAttendance(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/lms/sync-attendance`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Attendance sync job dispatch failed.');
      const data = await res.json();
      playCyberSound('success');
      setSuccessMsg(data.message);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsSyncingAttendance(false);
    }
  };

  // ── Trigger Inbound Roster Sync ────────────────────────────────────────────
  const handleSyncRoster = async () => {
    setIsSyncingRoster(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/lms/sync-roster`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Roster sync job failed.');
      const data = await res.json();
      playCyberSound('success');
      setSuccessMsg(data.message);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsSyncingRoster(false);
    }
  };

  return (
    <div className="lms-container" style={{
      color: 'var(--color-text-main)',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* ── Header Card & Immediate Sync Triggers ── */}
      <div className="surface-card" style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '16px 18px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ minWidth: '220px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <div style={{
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              color: '#7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Globe size={18} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              SIS & Enterprise LMS Sync Engine
            </h2>
          </div>
        </div>

        {/* Quick Horizontal Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { playCyberSound('click'); handleSyncRoster(); }}
            disabled={isSyncingRoster}
            className="btn-secondary active-haptic"
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              cursor: isSyncingRoster ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '0.82rem', fontWeight: 700,
              background: '#f8fafc', border: '1px solid #cbd5e1'
            }}
          >
            <DownloadCloud size={15} className={isSyncingRoster ? 'animate-spin' : ''} />
            <span>{isSyncingRoster ? 'Importing...' : 'Sync Roster'}</span>
          </button>

          <button
            type="button"
            onClick={() => { playCyberSound('click'); handleSyncAttendance(); }}
            disabled={isSyncingAttendance}
            className="btn-primary active-haptic"
            style={{
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: isSyncingAttendance ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '0.82rem', fontWeight: 700,
              background: '#2563eb', color: '#ffffff', border: 'none'
            }}
          >
            <UploadCloud size={15} className={isSyncingAttendance ? 'animate-spin' : ''} />
            <span>{isSyncingAttendance ? 'Syncing...' : 'Push Attendance Now'}</span>
          </button>
        </div>
      </div>

      {/* ── 3-Metric Horizontal Summary Row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '8px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #2563eb',
          padding: '10px 14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Integration Provider
          </span>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            {provider.replace('_', ' ')}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Active connector</span>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #059669',
          padding: '10px 14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Sync Logs
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
            {logs.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Outbound & inbound cycles</span>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          borderLeft: '4px solid #7c3aed',
          padding: '10px 14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Auto-Sync Schedule
          </span>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7c3aed', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {autoSyncEnabled ? syncCron : 'Disabled'}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Nightly background worker</span>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div style={{
          background: '#ecfdf5', border: '1px solid #a7f3d0',
          color: '#059669', padding: '10px 14px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600
        }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '10px 14px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600
        }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Main Dual Responsive Columns ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
        gap: '14px',
        alignItems: 'start',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Left: Configuration Form */}
        <div className="surface-card" style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={16} color="#2563eb" />
            <span>LMS Provider Credentials & Endpoint</span>
          </h3>

          <form onSubmit={handleSaveConfig} style={{ width: '100%', boxSizing: 'border-box' }}>
            {/* Horizontal Segmented Platform Selection */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', marginBottom: '6px', fontWeight: 700 }}>
                LMS / SIS Platform
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', width: '100%' }}>
                {['CANVAS', 'MOODLE', 'BLACKBOARD', 'CUSTOM_REST'].map(p => {
                  const isActive = provider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className="active-haptic"
                      style={{
                        flex: '1 1 auto',
                        background: isActive ? '#eff6ff' : '#ffffff',
                        border: isActive ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        color: isActive ? '#1d4ed8' : '#475569',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {p.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Endpoint URL */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', marginBottom: '6px', fontWeight: 700 }}>
                REST API Base URL *
              </label>
              <input
                type="url"
                required
                value={apiEndpoint}
                onChange={e => setApiEndpoint(e.target.value)}
                placeholder="https://canvas.institution.edu/api/v1"
                className="form-input"
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* API Token */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', marginBottom: '6px', fontWeight: 700 }}>
                API Bearer Token / Secret Key
              </label>
              <input
                type="password"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                className="form-input"
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Sync Cron */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#334155', marginBottom: '6px', fontWeight: 700 }}>
                Auto-Sync Schedule (Cron Expression)
              </label>
              <input
                type="text"
                value={syncCron}
                onChange={e => setSyncCron(e.target.value)}
                placeholder="0 23 * * *"
                className="form-input"
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                Default "0 23 * * *" triggers daily attendance push at 11:00 PM.
              </span>
            </div>

            {/* Toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px',
              borderRadius: '10px', marginBottom: '16px'
            }}>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>Automated Sync Worker</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Run background sync tasks on schedule</div>
              </div>
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={e => setAutoSyncEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary active-haptic"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: '#2563eb', color: '#ffffff', border: 'none'
              }}
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </form>
        </div>

        {/* Right: Sync Job History */}
        <div className="surface-card" style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#2563eb" />
              <span>Sync Telemetry History</span>
            </h3>
            <button
              type="button"
              onClick={() => { playCyberSound('click'); fetchData(); }}
              style={{ background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {logs.length === 0 ? (
            <div style={{
              background: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '12px', padding: '28px 14px', textAlign: 'center', color: '#64748b'
            }}>
              <CheckCircle2 size={28} color="#2563eb" style={{ opacity: 0.6, marginBottom: '6px' }} />
              <div style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 700 }}>No sync cycles recorded yet</div>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Click "Push Attendance Now" to trigger your first synchronization cycle.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {logs.map(log => (
                <div
                  key={log.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.job_type === 'OUTBOUND_ATTENDANCE' ? <UploadCloud size={13} color="#0284c7" /> : <DownloadCloud size={13} color="#7c3aed" />}
                      <span>{log.job_type.replace('_', ' ')}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                      {log.started_at ? new Date(log.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{
                      background: log.status === 'SUCCESS' ? '#ecfdf5' : '#fef2f2',
                      border: log.status === 'SUCCESS' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                      color: log.status === 'SUCCESS' ? '#059669' : '#dc2626',
                      fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px',
                      display: 'inline-block'
                    }}>
                      {log.status}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                      {log.records_processed} processed
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
