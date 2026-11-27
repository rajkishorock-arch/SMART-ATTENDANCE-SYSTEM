import './campusAdmin.css';
import { useState, useEffect, useCallback } from 'react';
import {
  Database, UploadCloud, DownloadCloud, CheckCircle2,
  AlertTriangle, RefreshCw, Clock, Save, ChevronRight, Sliders
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

const DEMO_LMS_LOGS = [
  {
    id: 1,
    job_type: 'OUTBOUND_ATTENDANCE',
    status: 'SUCCESS',
    records_processed: 132,
    started_at: new Date().toISOString()
  },
  {
    id: 2,
    job_type: 'INBOUND_ROSTER',
    status: 'SUCCESS',
    records_processed: 154,
    started_at: new Date(Date.now() - 86400000).toISOString()
  }
];

export default function LmsSyncIntegrationView({
  token,
  isDemoMode = false,
  playCyberSound = () => {},
  routeView: propRouteView,
  setRouteView: propSetRouteView
}) {
  const [localRouteView, setLocalRouteView] = useState(null);
  const routeView = propSetRouteView !== undefined ? propRouteView : localRouteView;
  const setRouteView = propSetRouteView !== undefined ? propSetRouteView : setLocalRouteView;

  const [provider, setProvider] = useState('CANVAS');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [syncCron, setSyncCron] = useState('0 23 * * *');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingAttendance, setIsSyncingAttendance] = useState(false);
  const [isSyncingRoster, setIsSyncingRoster] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isSandbox = isDemoMode || token === 'guest-demo-token';

  const fetchData = useCallback(async () => {
    if (!token) return;
    if (isSandbox) {
      setProvider('CANVAS');
      setApiEndpoint('https://canvas.goldengate.edu/api/v1');
      setSyncCron('0 23 * * *');
      setAutoSyncEnabled(true);
      setLogs(DEMO_LMS_LOGS);
      setErrorMsg('');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [cfgRes, logsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/lms/config`, { headers }),
        fetch(`${API_BASE_URL}/lms/logs`, { headers })
      ]);
      if (!cfgRes.ok || !logsRes.ok) throw new Error('Could not refresh LMS settings and sync history.');
      const cfg = await cfgRes.json();
      if (cfg) {
        setProvider(cfg.provider || 'CANVAS');
        setApiEndpoint(cfg.api_endpoint || '');
        setSyncCron(cfg.sync_schedule_cron || '0 23 * * *');
        setAutoSyncEnabled(cfg.auto_sync_enabled ?? true);
      }
      const logRows = await logsRes.json();
      setLogs(Array.isArray(logRows) ? logRows : []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch LMS configuration.');
    } finally {
      setIsLoading(false);
    }
  }, [token, isSandbox]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) await fetchData();
    };
    run();
    return () => { ignore = true; };
  }, [fetchData]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (isSandbox) {
      playCyberSound('success');
      setSuccessMsg('Sandbox preview: LMS integration configuration saved.');
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }
    setIsSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/lms/config`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
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

  const handleSyncAttendance = async () => {
    if (isSandbox) {
      playCyberSound('success');
      setSuccessMsg('Sandbox preview: Outbound attendance push queued for 132 records.');
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }
    setIsSyncingAttendance(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/lms/sync-attendance`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Attendance sync job dispatch failed.');
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

  const handleSyncRoster = async () => {
    if (isSandbox) {
      playCyberSound('success');
      setSuccessMsg('Sandbox preview: Inbound roster sync imported 154 student records.');
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }
    setIsSyncingRoster(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/lms/sync-roster`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Roster sync job failed.');
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

  // ── SUBPAGE 1: LMS PROVIDER & CREDENTIALS FORM ─────────────────────────────
  if (routeView === 'config') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {successMsg && (
              <div className="feedback-banner success" role="status">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="feedback-banner error" role="alert">
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="golden-os-form-section">
                <div className="golden-os-form-section-title">LMS / SIS Platform Connector</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {['CANVAS', 'MOODLE', 'BLACKBOARD', 'CUSTOM_REST'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { playCyberSound('click'); setProvider(p); }}
                      className={`golden-os-feedback-filter-btn ${provider === p ? 'active' : ''}`}
                    >
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div>
                    <label className="golden-os-field-label">Integration Gateway URL *</label>
                    <input
                      type="url"
                      required
                      className="golden-os-input"
                      value={apiEndpoint}
                      onChange={e => setApiEndpoint(e.target.value)}
                      placeholder="https://gateway.example.edu/lms"
                    />
                  </div>
                  <div>
                    <label className="golden-os-field-label">API Bearer Token / Secret Key</label>
                    <input
                      type="password"
                      className="golden-os-input"
                      value={apiToken}
                      onChange={e => setApiToken(e.target.value)}
                      placeholder="••••••••••••••••••••"
                    />
                  </div>
                  <div>
                    <label className="golden-os-field-label">Sync Schedule (Cron)</label>
                    <input
                      type="text"
                      className="golden-os-input"
                      value={syncCron}
                      onChange={e => setSyncCron(e.target.value)}
                      placeholder="0 23 * * *"
                    />
                  </div>
                </div>

                <div className="golden-os-inset-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#25231f' }}>Automated Nightly Sync Worker</div>
                    <div style={{ fontSize: '0.74rem', color: '#696358' }}>Run POST /attendance and GET /roster automatically on schedule</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={e => setAutoSyncEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#785927', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="golden-os-feedback-filter-btn" onClick={() => setRouteView(null)}>
                  Done
                </button>
                <button type="submit" disabled={isSaving} className="golden-os-action-pill">
                  <Save size={15} />
                  <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 2: SYNC CONTROLS ───────────────────────────────────────────────
  if (routeView === 'sync') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {successMsg && (
              <div className="feedback-banner success" role="status">
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}
            {errorMsg && (
              <div className="feedback-banner error" role="alert">
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="golden-os-inset-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#25231f' }}>Active Connector: {provider.replace('_', ' ')}</div>
                <div style={{ fontSize: '0.78rem', color: '#696358' }}>{apiEndpoint || 'No endpoint configured yet'}</div>
              </div>
              <span style={{
                background: autoSyncEnabled ? '#ecfdf5' : '#f4f1eb',
                border: `1px solid ${autoSyncEnabled ? '#a7f3d0' : '#cfc8ba'}`,
                color: autoSyncEnabled ? '#059669' : '#58534a',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '999px'
              }}>
                {autoSyncEnabled ? `Cron: ${syncCron}` : 'Manual Only'}
              </span>
            </div>

            <div className="golden-os-list-shell">
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div className="golden-os-avatar" style={{ background: '#fff7ed', color: '#916d30', borderColor: '#eadbc0' }}>
                    <UploadCloud size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>Push Attendance to LMS</div>
                    <div style={{ fontSize: '0.76rem', color: '#696358' }}>Export verified daily attendance logs to {provider.replace('_', ' ')}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { playCyberSound('click'); handleSyncAttendance(); }}
                  disabled={isSyncingAttendance}
                  className="golden-os-action-pill"
                >
                  <UploadCloud size={14} className={isSyncingAttendance ? 'animate-spin' : ''} />
                  <span>{isSyncingAttendance ? 'Syncing...' : 'Push Now'}</span>
                </button>
              </div>

              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div className="golden-os-avatar" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                    <DownloadCloud size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>Import Student Roster</div>
                    <div style={{ fontSize: '0.76rem', color: '#696358' }}>Fetch enrolled students & section mappings from remote SIS</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { playCyberSound('click'); handleSyncRoster(); }}
                  disabled={isSyncingRoster}
                  className="golden-os-feedback-filter-btn"
                >
                  <DownloadCloud size={14} className={isSyncingRoster ? 'animate-spin' : ''} />
                  <span>{isSyncingRoster ? 'Importing...' : 'Sync Roster'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBPAGE 3: SYNC TELEMETRY HISTORY ──────────────────────────────────────
  if (routeView === 'history') {
    return (
      <div className="golden-os-page-bottom-safe">
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#696358' }}>{logs.length} sync cycles recorded</span>
              <button type="button" className="golden-os-feedback-filter-btn" onClick={fetchData} disabled={isLoading}>
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="golden-os-list-shell">
              {logs.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: '#696358' }}>
                  <Clock size={34} style={{ opacity: 0.4, marginBottom: '10px' }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#25231f' }}>No sync cycles recorded yet</div>
                </div>
              ) : (
                logs.map(log => {
                  const isOk = log.status === 'SUCCESS';
                  return (
                    <div key={log.id} className="golden-os-list-row" style={{ cursor: 'default' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div className="golden-os-avatar" style={{
                          background: isOk ? '#ecfdf5' : '#fef2f2',
                          color: isOk ? '#059669' : '#dc2626',
                          borderColor: isOk ? '#a7f3d0' : '#fecaca'
                        }}>
                          {log.job_type === 'OUTBOUND_ATTENDANCE' ? <UploadCloud size={15} /> : <DownloadCloud size={15} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#25231f' }}>
                            {log.job_type.replace('_', ' ')}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#696358' }}>
                            {log.started_at ? new Date(log.started_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Recent'} • {log.records_processed} records
                          </div>
                        </div>
                      </div>
                      <span style={{
                        background: isOk ? '#ecfdf5' : '#fef2f2',
                        border: `1px solid ${isOk ? '#a7f3d0' : '#fecaca'}`,
                        color: isOk ? '#059669' : '#dc2626',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '999px'
                      }}>
                        {log.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN SCREEN: CLEAN GOLDEN GATE NAVIGATION HUB ──────────────────────────
  return (
    <div className="golden-os-page-bottom-safe">
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Concise Status Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: 700, color: '#58534a' }}>
              <span style={{ color: '#25231f' }}>Connector: {provider.replace('_', ' ')}</span>
              <span style={{ color: autoSyncEnabled ? '#059669' : '#696358' }}>
                • {autoSyncEnabled ? `Auto-Sync (${syncCron})` : 'Auto-Sync Off'}
              </span>
              <span>• {logs.length} Cycles</span>
            </div>
            <button
              type="button"
              onClick={() => { playCyberSound('click'); fetchData(); }}
              disabled={isLoading}
              className="golden-os-feedback-filter-btn"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {successMsg && (
            <div className="feedback-banner success" role="status">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="feedback-banner error" role="alert">
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Clean Organized Sections */}
          <div className="golden-os-list-shell">
            <button
              type="button"
              onClick={() => { playCyberSound('click'); setErrorMsg(''); setRouteView('config'); }}
              className="golden-os-list-row"
              style={{ width: '100%', background: 'transparent', borderLeft: 'none', borderRight: 'none', borderTop: 'none', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ background: '#faf5ea', color: '#785927', borderColor: '#eadbc0' }}>
                  <Database size={16} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f' }}>LMS Provider & Credentials</div>
                  <div style={{ fontSize: '0.76rem', color: '#696358', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {provider.replace('_', ' ')} • {apiEndpoint ? 'Gateway configured' : 'Endpoint not set'}
                  </div>
                </div>
              </div>
              <ChevronRight size={16} color="#9c9384" />
            </button>

            <button
              type="button"
              onClick={() => { playCyberSound('click'); setErrorMsg(''); setRouteView('sync'); }}
              className="golden-os-list-row"
              style={{ width: '100%', background: 'transparent', borderLeft: 'none', borderRight: 'none', borderTop: 'none', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                  <Sliders size={16} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f' }}>Run Attendance & Roster Sync</div>
                  <div style={{ fontSize: '0.76rem', color: '#696358' }}>
                    Push daily logs outbound or import remote SIS roster
                  </div>
                </div>
              </div>
              <ChevronRight size={16} color="#9c9384" />
            </button>

            <button
              type="button"
              onClick={() => { playCyberSound('click'); setErrorMsg(''); setRouteView('history'); }}
              className="golden-os-list-row"
              style={{ width: '100%', background: 'transparent', borderLeft: 'none', borderRight: 'none', borderTop: 'none', textAlign: 'left', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                  <Clock size={16} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f' }}>Sync Telemetry History</div>
                  <div style={{ fontSize: '0.76rem', color: '#696358' }}>
                    {logs.length} synchronization cycles recorded
                  </div>
                </div>
              </div>
              <ChevronRight size={16} color="#9c9384" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
