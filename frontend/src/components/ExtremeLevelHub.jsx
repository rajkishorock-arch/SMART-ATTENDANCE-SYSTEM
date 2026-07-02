import { useState, useCallback, useEffect } from 'react';
import { EXTREME_LEVELS, TOTAL_EXTREME_FEATURES } from '../utils/extremeFeatureCatalog';
import { applyTheme, triggerHaptic } from '../utils/futuristicFeatures';

function FeatureCard({ feature, api, userRole, students, onMsg }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [nfcCard, setNfcCard] = useState('CARD-001');
  const [nfcRoll, setNfcRoll] = useState('1');
  const [bleRoom, setBleRoom] = useState('Room 101');
  const [copilotQ, setCopilotQ] = useState('Is semester ka trend kya hai?');
  const [nlRule, setNlRule] = useState('3 din absent ho to parent ko WhatsApp');
  const [mood, setMood] = useState('okay');
  const [studentId, setStudentId] = useState('1');
  const [rolePick, setRolePick] = useState('teacher');
  const [themeMode, setThemeMode] = useState('dark');
  const [dyslexia, setDyslexia] = useState(false);
  const [seatData, setSeatData] = useState(null);
  const [principalData, setPrincipalData] = useState(null);
  const [hodData, setHodData] = useState(null);

  if (feature.adminOnly && userRole !== 'admin') {
    return (
      <div className="extreme-feature-card">
        <h4>{feature.name}</h4>
        <p>{feature.desc}</p>
        <span className="extreme-badge">Admin only</span>
      </div>
    );
  }

  const runGet = async (path) => {
    setLoading(true);
    setResult(null);
    try {
      const data = await api(path);
      setResult(data);
      if (feature.id === 'seat-map') setSeatData(data);
      if (feature.id === 'principal-cc') setPrincipalData(data);
      if (feature.id === 'hod-war-room') setHodData(data);
      if (feature.id === 'theme-mode') {
        setThemeMode(data.mode || 'dark');
        setDyslexia(!!data.dyslexia_font);
      }
      triggerHaptic('success');
      onMsg(`${feature.name} loaded`);
    } catch (e) {
      setResult({ error: e.message });
      onMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const runPost = async (path, body) => {
    setLoading(true);
    setResult(null);
    try {
      const data = await api(path, { method: 'POST', body: JSON.stringify(body) });
      setResult(data);
      triggerHaptic('success');
      onMsg(`${feature.name} OK`);
    } catch (e) {
      setResult({ error: e.message });
      onMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const runDownload = async (path, filename) => {
    setLoading(true);
    try {
      const res = await fetch(`${api.baseUrl}${path}`, { headers: api.headers() });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      onMsg(`${feature.name} downloaded`);
    } catch (e) {
      onMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrimary = () => {
    if (feature.method === 'GET') {
      let path = feature.path;
      if (feature.pathVar === 'role') path = `/level1/role-home/${rolePick}`;
      if (feature.query) path = `${feature.path}?q=${encodeURIComponent(inputVal || 'scan')}`;
      if (feature.needsStudentId) path = `/level4/scholarship-eligibility/${studentId}`;
      return runGet(path);
    }
    if (feature.method === 'POST') {
      let body = { ...feature.body };
      if (feature.queryField) body[feature.queryField] = feature.id === 'copilot-pro' ? copilotQ : nlRule;
      if (feature.id === 'nfc') body = { card_id: nfcCard, roll: nfcRoll };
      if (feature.id === 'ble-beacon') body = { uuid: `beacon-${Date.now()}`, room: bleRoom };
      if (feature.moodPicker) body = { mood, note: inputVal };
      if (feature.needsStudentIds && students?.length) {
        body.student_ids = students.slice(0, 3).map((s) => s.id);
      }
      return runPost(feature.path, body);
    }
    if (feature.method === 'DOWNLOAD') return runDownload(feature.path, feature.id === 'naac-export' ? 'naac_attendance.txt' : 'siem_logs.ndjson');
    if (feature.method === 'UPLOAD') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.txt,.jpg,.png';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        setLoading(true);
        try {
          const fd = new FormData();
          fd.append('file', file);
          const res = await fetch(`${api.baseUrl}${feature.path}`, {
            method: 'POST',
            headers: { Authorization: api.headers().Authorization },
            body: fd,
          });
          const data = res.ok ? await res.json() : { error: 'Upload failed' };
          setResult(data);
          onMsg('Document AI analyzed');
        } catch (e) {
          onMsg(e.message);
        } finally {
          setLoading(false);
        }
      };
      input.click();
    }
  };

  const saveTheme = async () => {
    await runPost('/level1/theme-mode', { mode: themeMode, dyslexia_font: dyslexia });
    applyTheme(themeMode);
    document.body.style.fontFamily = dyslexia ? 'OpenDyslexic, sans-serif' : '';
  };

  return (
    <div className="extreme-feature-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <h4>{feature.name}</h4>
        <span className="extreme-badge">✓</span>
      </div>
      <p>{feature.desc}</p>

      <div className="extreme-feature-actions">
        {feature.pathVar === 'role' && (
          <select value={rolePick} onChange={(e) => setRolePick(e.target.value)}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        )}
        {feature.query && (
          <input placeholder="Search query…" value={inputVal} onChange={(e) => setInputVal(e.target.value)} />
        )}
        {feature.id === 'copilot-pro' && (
          <input value={copilotQ} onChange={(e) => setCopilotQ(e.target.value)} placeholder="Ask copilot…" />
        )}
        {feature.id === 'nl-rule' && (
          <input value={nlRule} onChange={(e) => setNlRule(e.target.value)} placeholder="Type rule…" />
        )}
        {feature.id === 'nfc' && (
          <>
            <input value={nfcCard} onChange={(e) => setNfcCard(e.target.value)} placeholder="Card ID" />
            <input value={nfcRoll} onChange={(e) => setNfcRoll(e.target.value)} placeholder="Roll" />
          </>
        )}
        {feature.id === 'ble-beacon' && (
          <input value={bleRoom} onChange={(e) => setBleRoom(e.target.value)} placeholder="Room name" />
        )}
        {feature.needsStudentId && (
          <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Student ID" />
        )}
        {feature.moodPicker && (
          <select value={mood} onChange={(e) => setMood(e.target.value)}>
            <option value="great">Great</option>
            <option value="okay">Okay</option>
            <option value="stressed">Stressed</option>
            <option value="sad">Sad</option>
            <option value="anxious">Anxious</option>
          </select>
        )}
        {feature.id === 'theme-mode' ? (
          <>
            <select value={themeMode} onChange={(e) => setThemeMode(e.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="amoled">AMOLED</option>
            </select>
            <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={dyslexia} onChange={(e) => setDyslexia(e.target.checked)} />
              Dyslexia font
            </label>
            <button type="button" className="extreme-btn" disabled={loading} onClick={saveTheme}>Save theme</button>
            <button type="button" className="extreme-btn" disabled={loading} onClick={() => runGet(feature.path)}>Load</button>
          </>
        ) : (
          <button type="button" className="extreme-btn" disabled={loading} onClick={handlePrimary}>
            {loading ? '…' : feature.method === 'UPLOAD' ? 'Upload doc' : feature.method === 'DOWNLOAD' ? 'Download' : 'Run'}
          </button>
        )}
        {feature.postPath && feature.id === 'blockchain' && (
          <button type="button" className="extreme-btn" disabled={loading} onClick={() => runPost(feature.postPath, { action: 'mark', ts: Date.now() })}>
            Append block
          </button>
        )}
        {feature.postPath && feature.id === 'peer-groups' && (
          <button type="button" className="extreme-btn" disabled={loading} onClick={() => runPost(feature.postPath, feature.postBody)}>
            Create group
          </button>
        )}
        {feature.postPath && feature.id === 'gdpr-consent' && (
          <button type="button" className="extreme-btn" disabled={loading} onClick={() => runPost(feature.postPath, { biometric_consent: true, version: '1.1' })}>
            Record consent
          </button>
        )}
      </div>

      {feature.id === 'seat-map' && seatData?.seats && (
        <div className="seat-map-grid">
          {seatData.seats.map((s) => (
            <div key={`${s.row}-${s.col}`} className={`seat-cell ${s.occupied ? 'occupied' : 'empty'}`}>
              {s.occupied ? '✓' : '—'}
            </div>
          ))}
        </div>
      )}

      {feature.id === 'principal-cc' && principalData && (
        <div className="principal-tv-panel">
          <div className="principal-tv-stat"><strong>{principalData.campus_present}</strong><span>Present today</span></div>
          <div className="principal-tv-stat"><strong>{principalData.total_students}</strong><span>Total students</span></div>
          <div className="principal-tv-stat"><strong>{principalData.rate}%</strong><span>Campus rate</span></div>
        </div>
      )}

      {feature.id === 'hod-war-room' && hodData && (
        <div className="principal-tv-panel">
          <div className="principal-tv-stat"><strong>{hodData.department}</strong><span>Department</span></div>
          <div className="principal-tv-stat"><strong>{hodData.present}/{hodData.total}</strong><span>Present</span></div>
          <div className="principal-tv-stat"><strong>{hodData.rate}%</strong><span>Rate</span></div>
        </div>
      )}

      {result && (
        <pre className="extreme-result">{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}

export default function ExtremeLevelHub({
  apiBaseUrl,
  token,
  userRole,
  students = [],
  onOpenSearch,
}) {
  const [level, setLevel] = useState(1);
  const [msg, setMsg] = useState('');

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const api = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${apiBaseUrl}/extreme${path}`, {
      ...opts,
      headers: { ...headers(), ...opts.headers },
    });
    const json = res.ok ? await res.json().catch(() => ({})) : null;
    if (!res.ok) throw new Error(json?.detail || 'Request failed');
    return json;
  }, [apiBaseUrl, headers]);

  api.baseUrl = `${apiBaseUrl}/extreme`;
  api.headers = headers;

  const currentLevel = EXTREME_LEVELS.find((l) => l.id === level) || EXTREME_LEVELS[0];

  useEffect(() => {
    if (token) api('/level1/theme-mode').then((d) => {
      if (d?.mode) applyTheme(d.mode);
    }).catch(() => {});
  }, [token, api]);

  return (
    <div className="extreme-hub glass-panel" style={{ padding: '20px' }}>
      <h2 style={{ color: '#f8fafc', margin: '0 0 6px' }}>🌌 Extreme Level Hub (1–8)</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 12px' }}>
        All {TOTAL_EXTREME_FEATURES} table features — Level 1 Pro App through Level 8 Monetization.
        {onOpenSearch && (
          <>
            {' '}
            <button type="button" className="extreme-btn" style={{ padding: '4px 10px', fontSize: '0.7rem' }} onClick={onOpenSearch}>
              Open Cmd+K Search
            </button>
          </>
        )}
      </p>
      {msg && <p style={{ color: '#10b981', fontSize: '0.78rem', margin: '0 0 8px' }}>{msg}</p>}

      <div className="extreme-level-tabs">
        {EXTREME_LEVELS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={`extreme-level-tab ${level === l.id ? 'active' : ''}`}
            onClick={() => setLevel(l.id)}
          >
            {l.emoji} L{l.id}: {l.title} ({l.features.length})
          </button>
        ))}
      </div>

      <p style={{ color: '#64748b', fontSize: '0.75rem', margin: '8px 0' }}>
        Level {currentLevel.id} — {currentLevel.features.length} features
      </p>

      <div className="extreme-feature-grid">
        {currentLevel.features.map((f) => (
          <FeatureCard
            key={f.id}
            feature={f}
            api={api}
            userRole={userRole}
            students={students}
            onMsg={setMsg}
          />
        ))}
      </div>
    </div>
  );
}
