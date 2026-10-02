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
      padding: '24px',
      maxWidth: '1280px',
      margin: '0 auto',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Header */}
      <div className="surface-card" style={{
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              borderRadius: '10px',
              padding: '8px',
              color: '#7c3aed',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Globe size={22} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
              SIS & Enterprise LMS Sync Engine
            </h2>
          </div>
          <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem', maxWidth: '750px' }}>
            Bidirectional integration with Canvas, Moodle, Blackboard, and custom ERP systems. Automatically push daily verified attendance registers and ingest student roster updates.
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { playCyberSound('click'); handleSyncRoster(); }}
            disabled={isSyncingRoster}
            className="btn-secondary"
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              cursor: isSyncingRoster ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.85rem', fontWeight: 600
            }}
          >
            <DownloadCloud size={16} className={isSyncingRoster ? 'animate-spin' : ''} />
            {isSyncingRoster ? 'Importing...' : 'Sync Roster'}
          </button>

          <button
            onClick={() => { playCyberSound('click'); handleSyncAttendance(); }}
            disabled={isSyncingAttendance}
            className="btn-primary"
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              cursor: isSyncingAttendance ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.85rem', fontWeight: 600
            }}
          >
            <UploadCloud size={16} className={isSyncingAttendance ? 'animate-spin' : ''} />
            {isSyncingAttendance ? 'Syncing...' : 'Push Attendance Now'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div style={{
          background: '#ecfdf5', border: '1px solid #a7f3d0',
          color: '#059669', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          color: '#dc2626', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 600
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left: Configuration Form */}
        <div className="surface-card" style={{
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="var(--color-primary)" />
            LMS Provider Connection
          </h3>

          <form onSubmit={handleSaveConfig}>
            {/* Provider Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '6px', fontWeight: 600 }}>
                LMS / SIS Platform
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {['CANVAS', 'MOODLE', 'BLACKBOARD', 'CUSTOM_REST'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    style={{
                      background: provider === p ? 'var(--color-primary-light)' : '#ffffff',
                      border: provider === p ? '1px solid rgba(30, 64, 175, 0.3)' : '1px solid var(--border-subtle)',
                      color: provider === p ? 'var(--color-primary)' : '#475569',
                      padding: '10px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {p.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* API Endpoint URL */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '6px', fontWeight: 600 }}>
                REST API Base URL *
              </label>
              <input
                type="url"
                required
                value={apiEndpoint}
                onChange={e => setApiEndpoint(e.target.value)}
                placeholder="https://canvas.institution.edu/api/v1"
                style={{
                  width: '100%', background: '#ffffff',
                  border: '1px solid var(--border-strong)', color: '#0f172a',
                  padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem'
                }}
              />
            </div>

            {/* API Token */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '6px', fontWeight: 600 }}>
                API Bearer Token / Secret Key
              </label>
              <input
                type="password"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                style={{
                  width: '100%', background: '#ffffff',
                  border: '1px solid var(--border-strong)', color: '#0f172a',
                  padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Sync Cron */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '6px', fontWeight: 600 }}>
                Auto-Sync Schedule (Cron Expression)
              </label>
              <input
                type="text"
                value={syncCron}
                onChange={e => setSyncCron(e.target.value)}
                placeholder="0 23 * * *"
                style={{
                  width: '100%', background: '#ffffff',
                  border: '1px solid var(--border-strong)', color: '#0f172a',
                  padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem',
                  fontFamily: 'monospace'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Default "0 23 * * *" triggers daily attendance push at 11:00 PM.
              </span>
            </div>

            {/* Toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '12px 16px',
              borderRadius: '10px', marginBottom: '20px'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>Automated Sync Worker</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Run cron jobs in the background</div>
              </div>
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={e => setAutoSyncEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '11px', borderRadius: '10px',
                fontWeight: 700, fontSize: '0.9rem', cursor: isSaving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </form>
        </div>

        {/* Right: Sync Job History */}
        <div className="surface-card" style={{
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--color-primary)" />
              Sync Telemetry History
            </h3>
            <button
              onClick={() => { playCyberSound('click'); fetchData(); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <div style={{
              background: '#f8fafc',
              border: '1px dashed var(--border-strong)',
              borderRadius: '12px', padding: '36px 16px', textAlign: 'center', color: '#64748b'
            }}>
              <CheckCircle2 size={32} color="var(--color-primary)" style={{ opacity: 0.6, marginBottom: '8px' }} />
              <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>No sync cycles recorded yet</div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569' }}>
                Click "Push Attendance Now" to trigger your first synchronization cycle.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
              {logs.map(log => (
                <div
                  key={log.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {log.job_type === 'OUTBOUND_ATTENDANCE' ? <UploadCloud size={14} color="#0284c7" /> : <DownloadCloud size={14} color="#7c3aed" />}
                      {log.job_type.replace('_', ' ')}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {log.started_at ? new Date(log.started_at).toLocaleString() : 'Recent'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      background: log.status === 'SUCCESS' ? '#ecfdf5' : '#fef2f2',
                      border: log.status === 'SUCCESS' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                      color: log.status === 'SUCCESS' ? '#059669' : '#dc2626',
                      fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px'
                    }}>
                      {log.status}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      {log.records_processed} processed • {log.records_failed} failed
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
