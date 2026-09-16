import { useState, useEffect, useCallback } from 'react';
import { 
  Globe, Database, UploadCloud, DownloadCloud, CheckCircle2, 
  AlertTriangle, RefreshCw, Clock, Save, ShieldCheck, 
  ExternalLink, Layers, Terminal
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

export default function LmsSyncIntegrationView({
  token,
  currentUser,
  playCyberSound = () => {}
}) {
  const [provider, setProvider] = useState('CANVAS');
  const [apiEndpoint, setApiEndpoint] = useState('https://canvas.institution.edu/api/v1');
  const [apiToken, setApiToken] = useState('');
  const [syncCron, setSyncCron] = useState('0 23 * * *');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState(null);

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
          setLastSyncAt(cfg.last_sync_at);
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
    fetchData();
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
      const data = await res.json();
      playCyberSound('success');
      setSuccessMsg('LMS integration configuration saved successfully!');
      setLastSyncAt(data.last_sync_at);
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
      color: '#f8fafc',
      padding: '24px',
      maxWidth: '1280px',
      margin: '0 auto',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Banner Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.75) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
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
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                borderRadius: '10px',
                padding: '8px',
                color: '#a78bfa',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Globe size={22} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
                SIS & Enterprise LMS Sync Engine
              </h2>
              <span style={{
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.4)',
                color: '#a78bfa',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '16px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                Phase 10 Production
              </span>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem', maxWidth: '750px', lineHeight: 1.5 }}>
              Bidirectional integration with Canvas, Moodle, Blackboard, and custom ERP systems. 
              Automatically push daily verified attendance registers and ingest student roster updates.
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { playCyberSound('click'); handleSyncRoster(); }}
              disabled={isSyncingRoster}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                padding: '10px 16px',
                borderRadius: '10px',
                cursor: isSyncingRoster ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '0.88rem', fontWeight: 600
              }}
            >
              <DownloadCloud size={16} className={isSyncingRoster ? 'animate-spin' : ''} />
              {isSyncingRoster ? 'Importing...' : 'Sync Roster'}
            </button>

            <button
              onClick={() => { playCyberSound('click'); handleSyncAttendance(); }}
              disabled={isSyncingAttendance}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                border: 'none', color: '#fff',
                padding: '10px 18px',
                borderRadius: '10px',
                cursor: isSyncingAttendance ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '0.88rem', fontWeight: 700,
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)'
              }}
            >
              <UploadCloud size={16} className={isSyncingAttendance ? 'animate-spin' : ''} />
              {isSyncingAttendance ? 'Syncing...' : 'Push Attendance Now'}
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171', padding: '12px 18px', borderRadius: '12px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem'
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Left: Configuration Form */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="#a78bfa" />
            LMS Provider Connection
          </h3>

          <form onSubmit={handleSaveConfig}>
            {/* Provider Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                LMS / SIS Platform
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {['CANVAS', 'MOODLE', 'BLACKBOARD', 'CUSTOM_REST'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    style={{
                      background: provider === p ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: provider === p ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: provider === p ? '#c4b5fd' : '#94a3b8',
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
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                REST API Base URL *
              </label>
              <input
                type="url"
                required
                value={apiEndpoint}
                onChange={e => setApiEndpoint(e.target.value)}
                placeholder="https://canvas.institution.edu/api/v1"
                style={{
                  width: '100%', background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff',
                  padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem'
                }}
              />
            </div>

            {/* API Token */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                API Bearer Token / Secret Key
              </label>
              <input
                type="password"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                placeholder="••••••••••••••••••••••••"
                style={{
                  width: '100%', background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff',
                  padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Sync Cron */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                Auto-Sync Schedule (Cron Expression)
              </label>
              <input
                type="text"
                value={syncCron}
                onChange={e => setSyncCron(e.target.value)}
                placeholder="0 23 * * *"
                style={{
                  width: '100%', background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff',
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
              background: 'rgba(255, 255, 255, 0.04)', padding: '12px 16px',
              borderRadius: '10px', marginBottom: '20px'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>Automated Sync Worker</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Run cron jobs in the background</div>
              </div>
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={e => setAutoSyncEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                border: 'none', color: '#fff', padding: '11px', borderRadius: '10px',
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
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#a78bfa" />
              Sync Telemetry History
            </h3>
            <button
              onClick={() => { playCyberSound('click'); fetchData(); }}
              style={{ background: 'transparent', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {logs.length === 0 ? (
            <div style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '12px', padding: '36px 16px', textAlign: 'center', color: '#64748b'
            }}>
              <CheckCircle2 size={32} color="#a78bfa" style={{ opacity: 0.6, marginBottom: '8px' }} />
              <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>No sync cycles recorded yet</div>
              <p style={{ margin: 0, fontSize: '0.78rem' }}>
                Click "Push Attendance Now" to trigger your first synchronization cycle.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
              {logs.map(log => (
                <div
                  key={log.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {log.job_type === 'OUTBOUND_ATTENDANCE' ? <UploadCloud size={14} color="#00f2fe" /> : <DownloadCloud size={14} color="#a78bfa" />}
                      {log.job_type.replace('_', ' ')}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {log.started_at ? new Date(log.started_at).toLocaleString() : 'Recent'}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      background: log.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: log.status === 'SUCCESS' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                      color: log.status === 'SUCCESS' ? '#34d399' : '#f87171',
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
