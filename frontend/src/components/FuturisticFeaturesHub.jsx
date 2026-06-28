import { useState, useEffect, useCallback } from 'react';
import {
  Palette, LayoutGrid, Award, History, MapPin, HeartPulse, Rocket,
  BarChart2, MessageCircle, Bell, Calendar, Users, RefreshCw, GripVertical,
} from 'lucide-react';
import {
  THEME_PRESETS, ACHIEVEMENTS, loadFuturisticSettings, saveFuturisticSettings,
  applyTheme, loadAchievements, loadWidgetLayout, saveWidgetLayout, DEFAULT_WIDGETS,
  bumpEasterEgg,
} from '../utils/futuristicFeatures';
import OwnerPremiumPanel from './OwnerPremiumPanel';

const TABS = [
  { id: 'theme', label: 'Theme Studio', icon: Palette },
  { id: 'widgets', label: 'Widget Home', icon: LayoutGrid },
  { id: 'achievements', label: 'Achievements', icon: Award },
  { id: 'audit', label: 'Audit Timeline', icon: History },
  { id: 'campus', label: 'Campus Map', icon: MapPin },
  { id: 'health', label: 'Health Check', icon: HeartPulse },
  { id: 'release', label: 'Release Control', icon: Rocket },
  { id: 'polls', label: 'Polls & Quiz', icon: BarChart2 },
  { id: 'parent', label: 'Parent Digest', icon: MessageCircle },
  { id: 'push', label: 'Push Setup', icon: Bell },
  { id: 'session', label: 'Auto Session', icon: Calendar },
  { id: 'absent', label: 'Batch Absent', icon: Users },
  { id: 'premium', label: 'Premium Control', icon: Award },
];

export default function FuturisticFeaturesHub({
  apiBaseUrl, token, userRole, currentUser, isOwner,
  geofenceSettings, onNavigateSettings, releaseSettings,
}) {
  const [tab, setTab] = useState('theme');
  const [settings, setSettings] = useState(() => loadFuturisticSettings());
  const [achievements, setAchievements] = useState(() => loadAchievements());
  const [widgets, setWidgets] = useState(() => loadWidgetLayout());
  const [auditLogs, setAuditLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [polls, setPolls] = useState([]);
  const [pollQ, setPollQ] = useState('');
  const [pollOpts, setPollOpts] = useState(['Yes', 'No']);
  const [digest, setDigest] = useState(null);
  const [absentResult, setAbsentResult] = useState('');
  const [sessionSuggestion, setSessionSuggestion] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [msg, setMsg] = useState('');

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const loadAudit = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${apiBaseUrl}/audit/?limit=30`, { headers: headers() });
      if (r.ok) setAuditLogs(await r.json());
    } catch { /* ignore */ }
  }, [apiBaseUrl, token, headers]);

  const loadHealth = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${apiBaseUrl}/interactive/full-health-check`, { headers: headers() });
      if (r.ok) setHealth(await r.json());
    } catch { /* ignore */ }
  }, [apiBaseUrl, token, headers]);

  const loadPolls = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${apiBaseUrl}/interactive/polls`, { headers: headers() });
      if (r.ok) setPolls(await r.json());
    } catch { /* ignore */ }
  }, [apiBaseUrl, token, headers]);

  const loadDigest = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${apiBaseUrl}/interactive/parent-digest-preview`, { headers: headers() });
      if (r.ok) setDigest(await r.json());
    } catch { /* ignore */ }
  }, [apiBaseUrl, token, headers]);

  const loadAutoSession = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`${apiBaseUrl}/schedules-auto/current-session`, { headers: headers() });
      if (r.ok) setSessionSuggestion(await r.json());
    } catch {
      setSessionSuggestion({ message: 'Timetable se period auto-select — scanner tab par jao.' });
    }
  }, [apiBaseUrl, token, headers]);

  useEffect(() => {
    if (tab === 'audit') loadAudit();
    if (tab === 'health') loadHealth();
    if (tab === 'polls') loadPolls();
    if (tab === 'parent') loadDigest();
    if (tab === 'session') loadAutoSession();
  }, [tab, loadAudit, loadHealth, loadPolls, loadDigest, loadAutoSession]);

  const updateSettings = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveFuturisticSettings(next);
  };

  const createPoll = async () => {
    if (!pollQ.trim()) return;
    const r = await fetch(`${apiBaseUrl}/interactive/polls`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ question: pollQ, options: pollOpts.filter(Boolean) }),
    });
    if (r.ok) { setPollQ(''); loadPolls(); setMsg('Poll created!'); }
  };

  const votePoll = async (pollId, idx) => {
    await fetch(`${apiBaseUrl}/interactive/polls/${pollId}/vote`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ option_index: idx }),
    });
    loadPolls();
  };

  const notifyAbsentBatch = async () => {
    const r = await fetch(`${apiBaseUrl}/interactive/notify-absent-batch`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ notify_whatsapp: true }),
    });
    const d = await r.json();
    setAbsentResult(d.message || `Notified ${d.notified_count} parents`);
  };

  const moveWidget = (from, to) => {
    const next = [...widgets];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setWidgets(next);
    saveWidgetLayout(next);
  };

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'release' && !isOwner) return false;
    if (t.id === 'premium' && userRole !== 'admin') return false;
    if (['polls', 'absent', 'parent', 'session'].includes(t.id) && userRole === 'student') return false;
    return true;
  });

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h2 style={{ color: '#f8fafc', margin: '0 0 8px', fontSize: '1.3rem' }}>🚀 Futuristic Features Hub</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 20px' }}>
        Theme Studio, Widgets, Achievements, Health Check, Polls, Parent Digest — sab ek jagah.
      </p>

      <div className="futuristic-hub-tabs">
        {visibleTabs.map((t) => (
          <button key={t.id} type="button" className={`futuristic-hub-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <t.icon size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
            {t.label}
          </button>
        ))}
      </div>

      {msg && <p style={{ color: '#10b981', fontSize: '0.82rem', marginBottom: '12px' }}>{msg}</p>}

      {tab === 'theme' && (
        <div>
          <h3 style={{ color: '#f8fafc', marginBottom: '16px' }}>Theme Studio</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            {THEME_PRESETS.map((t) => (
              <button key={t.id} type="button" onClick={() => { applyTheme(t.id); updateSettings({ themeId: t.id }); bumpEasterEgg(); }}
                style={{ padding: '16px', borderRadius: '10px', border: settings.themeId === t.id ? `2px solid ${t.primary}` : '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: t.primary, cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>
                {t.label}
              </button>
            ))}
          </div>
          <label style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Custom Primary Color</label>
          <input type="color" value={settings.customPrimary || '#00f2fe'} onChange={(e) => { applyTheme(settings.themeId, e.target.value); updateSettings({ customPrimary: e.target.value }); }}
            style={{ display: 'block', marginTop: '8px', width: '100%', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer' }} />
          <p style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '12px' }}>💡 Secret: Logo par 7 baar tap karo ya Konami code try karo → hidden theme!</p>
        </div>
      )}

      {tab === 'widgets' && (
        <div>
          <h3 style={{ color: '#f8fafc', marginBottom: '16px' }}>Widget-style Home Layout</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '12px' }}>Drag to reorder dashboard widgets:</p>
          {widgets.map((w, i) => (
            <div key={w} className={`widget-drag-item ${dragIdx === i ? 'dragging' : ''}`} draggable
              onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragIdx !== null && dragIdx !== i) moveWidget(dragIdx, i); setDragIdx(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', marginBottom: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <GripVertical size={16} color="#64748b" />
              <span style={{ color: '#f8fafc', textTransform: 'capitalize', fontWeight: 600 }}>{w}</span>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={() => { setWidgets([...DEFAULT_WIDGETS]); saveWidgetLayout(DEFAULT_WIDGETS); }} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px' }}>
            Reset Default
          </button>
        </div>
      )}

      {tab === 'achievements' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {ACHIEVEMENTS.map((a) => {
            const unlocked = !!achievements[a.id];
            return (
              <div key={a.id} style={{ padding: '16px', borderRadius: '12px', background: unlocked ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.2)', border: `1px solid ${unlocked ? '#10b981' : 'rgba(255,255,255,0.06)'}`, opacity: unlocked ? 1 : 0.6 }}>
                <div style={{ fontSize: '1.5rem' }}>{a.icon}</div>
                <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.88rem' }}>{a.label}</div>
                <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{a.desc}</div>
                {unlocked && <div style={{ color: '#10b981', fontSize: '0.68rem', marginTop: '6px' }}>✓ Unlocked</div>}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'audit' && (
        <div className="audit-timeline">
          {auditLogs.length === 0 ? <p style={{ color: '#94a3b8' }}>Loading audit trail...</p> : auditLogs.map((log) => (
            <div key={log.id} className="audit-timeline-item">
              <div style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: 600 }}>{log.action}</div>
              <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{log.user_email} · {new Date(log.timestamp).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'campus' && (
        <div>
          <h3 style={{ color: '#f8fafc', marginBottom: '12px' }}>Multi-campus Geofence Map</h3>
          <div className="campus-map-view">
            {geofenceSettings?.center_latitude && (
              <div className="campus-zone-pin" style={{ left: '50%', top: '50%' }} title="Main Campus" />
            )}
            <div style={{ position: 'absolute', bottom: '12px', left: '12px', fontSize: '0.72rem', color: '#94a3b8' }}>
              📍 {geofenceSettings?.center_latitude?.toFixed(4)}, {geofenceSettings?.center_longitude?.toFixed(4)} · Radius {geofenceSettings?.allowed_radius_meters}m
            </div>
          </div>
          <button type="button" className="bg-gradient-btn" onClick={() => onNavigateSettings?.('geofencing')} style={{ marginTop: '12px', padding: '8px 16px', borderRadius: '8px' }}>
            Edit Geofence Zones
          </button>
        </div>
      )}

      {tab === 'health' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ color: '#f8fafc', margin: 0 }}>One-click Health Check</h3>
            <button type="button" onClick={loadHealth} style={{ background: 'none', border: 'none', color: '#00f2fe', cursor: 'pointer' }}><RefreshCw size={18} /></button>
          </div>
          {health ? (
            <>
              <div style={{ color: health.overall === 'HEALTHY' ? '#10b981' : '#f59e0b', fontWeight: 800, marginBottom: '12px' }}>{health.overall}</div>
              <div className="health-check-grid">
                {health.checks.map((c) => (
                  <div key={c.name} className={`health-check-item ${c.status}`}>
                    <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.85rem' }}>{c.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{c.detail}</div>
                  </div>
                ))}
              </div>
            </>
          ) : <p style={{ color: '#94a3b8' }}>Running health check...</p>}
        </div>
      )}

      {tab === 'release' && isOwner && releaseSettings && (
        <div>
          <h3 style={{ color: '#fbbf24', marginBottom: '16px' }}>Release Control Center</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', borderLeft: '3px solid #0891b2' }}>
              <strong style={{ color: '#f8fafc' }}>1. Build</strong>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '4px 0 0' }}>GitHub Actions se APK build → beta flag ON</p>
            </div>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${releaseSettings.betaActive ? '#10b981' : '#64748b'}` }}>
              <strong style={{ color: '#f8fafc' }}>2. Owner Beta Test</strong>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '4px 0 0' }}>Beta: {releaseSettings.betaActive ? 'ACTIVE ✓' : 'OFF'} · Version: {releaseSettings.latestVersion}</p>
            </div>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(0,0,0,0.25)', borderLeft: `3px solid ${releaseSettings.updateActive ? '#10b981' : '#64748b'}` }}>
              <strong style={{ color: '#f8fafc' }}>3. Public Release</strong>
              <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '4px 0 0' }}>Public update: {releaseSettings.updateActive ? 'LIVE ✓' : 'OFF'}</p>
            </div>
          </div>
          <button type="button" className="bg-gradient-btn" onClick={() => onNavigateSettings?.('release_updates')} style={{ marginTop: '16px', padding: '10px 18px', borderRadius: '8px' }}>
            Open Full Release Settings
          </button>
        </div>
      )}

      {tab === 'polls' && userRole !== 'student' && (
        <div>
          <h3 style={{ color: '#f8fafc', marginBottom: '12px' }}>In-app Polls / Quick Quiz</h3>
          <input value={pollQ} onChange={(e) => setPollQ(e.target.value)} placeholder="Question..." style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', marginBottom: '8px' }} />
          {pollOpts.map((o, i) => (
            <input key={i} value={o} onChange={(e) => { const n = [...pollOpts]; n[i] = e.target.value; setPollOpts(n); }} placeholder={`Option ${i + 1}`}
              style={{ width: '100%', padding: '8px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', marginBottom: '6px' }} />
          ))}
          <button type="button" className="bg-gradient-btn" onClick={createPoll} style={{ padding: '8px 16px', borderRadius: '8px', marginBottom: '20px' }}>Create Poll</button>
          {polls.map((p) => (
            <div key={p.id} style={{ padding: '14px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', marginBottom: '10px' }}>
              <div style={{ color: '#f8fafc', fontWeight: 600, marginBottom: '8px' }}>{p.question}</div>
              {p.options.map((opt, i) => (
                <button key={i} type="button" onClick={() => votePoll(p.id, i)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px', marginBottom: '4px', borderRadius: '6px', background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.15)', color: '#e2e8f0', cursor: 'pointer' }}>
                  {opt} ({p.votes?.[String(i)] || 0} votes)
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'parent' && userRole !== 'student' && (
        <div>
          <h3 style={{ color: '#f8fafc', marginBottom: '12px' }}>Parent WhatsApp Digest Preview</h3>
          {digest ? (
            <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '10px', color: '#e2e8f0', fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{digest.preview}</pre>
          ) : <p style={{ color: '#94a3b8' }}>Loading...</p>}
          <p style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '8px' }}>Twilio configured hone par auto WhatsApp/SMS jayega.</p>
        </div>
      )}

      {tab === 'push' && (
        <div>
          <h3 style={{ color: '#f8fafc', marginBottom: '12px' }}>Push Notifications Setup</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0', marginBottom: '12px' }}>
            <input type="checkbox" checked={settings.pushNotificationsEnabled} onChange={(e) => updateSettings({ pushNotificationsEnabled: e.target.checked })} />
            Enable in-app notification alerts
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0', marginBottom: '12px' }}>
            <input type="checkbox" checked={settings.voiceGuidedScanner} onChange={(e) => updateSettings({ voiceGuidedScanner: e.target.checked })} />
            Voice-guided scanner ("Face detect hua… marked!")
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0' }}>
            <input type="checkbox" checked={settings.hapticEnabled} onChange={(e) => updateSettings({ hapticEnabled: e.target.checked })} />
            Haptic feedback on scan success
          </label>
        </div>
      )}

      {tab === 'session' && userRole !== 'student' && (
        <div>
          <h3 style={{ color: '#f8fafc', marginBottom: '12px' }}>Auto Session Start</h3>
          {sessionSuggestion ? (
            <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.2)' }}>
              <p style={{ color: '#f8fafc', fontWeight: 600 }}>{sessionSuggestion.subject_name || sessionSuggestion.message || 'Current period detected'}</p>
              {sessionSuggestion.period && <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Period: {sessionSuggestion.period} — Scan open karein?</p>}
            </div>
          ) : <p style={{ color: '#94a3b8' }}>Checking timetable...</p>}
        </div>
      )}

      {tab === 'absent' && userRole !== 'student' && (
        <div>
          <h3 style={{ color: '#f8fafc', marginBottom: '12px' }}>Batch Re-scan Alert — Notify Absent</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '16px' }}>Aaj jo absent hain unke parents ko ek tap mein notify karo.</p>
          <button type="button" className="bg-gradient-btn" onClick={notifyAbsentBatch} style={{ padding: '10px 20px', borderRadius: '8px' }}>
            Notify All Absent Students
          </button>
          {absentResult && <p style={{ color: '#10b981', marginTop: '12px', fontSize: '0.82rem' }}>{absentResult}</p>}
        </div>
      )}

      {tab === 'premium' && userRole === 'admin' && (
        <div>
          <h3 style={{ color: '#fbbf24', marginBottom: '16px' }}>Premium Access Control</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '16px' }}>
            Admin + Owner dono master password se premium grant/revoke kar sakte hain.
          </p>
          <OwnerPremiumPanel apiBaseUrl={apiBaseUrl} token={token} isAdmin={!isOwner} />
        </div>
      )}
    </div>
  );
}
