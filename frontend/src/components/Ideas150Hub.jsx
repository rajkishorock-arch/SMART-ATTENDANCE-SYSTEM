import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IDEAS150_CATEGORIES,
  IDEAS150_FEATURES,
  TOTAL_IDEAS150,
  getIdeasByCategory,
} from '../utils/ideas150Catalog';
import {
  applyFxFromState,
  clearAllIdeaFx,
  restoreAllIdeaFx,
  runClientDemo,
} from '../utils/ideas150Effects';
import '../styles/ideas150.css';

const CAT_ORDER = ['ui', 'camera', 'attendance', 'ai', 'ecosystem', 'enterprise', 'future', 'micro'];

function FeatureCard({ feature, state, onRun, onToggle, busy }) {
  const enabled = !!state?.enabled;
  const result = state?.result;
  return (
    <article className={`ideas150-card ${enabled ? 'is-on' : ''} ${busy ? 'is-busy' : ''}`} data-slug={feature.slug}>
      <header className="ideas150-card-head">
        <span className="ideas150-id">#{feature.id}</span>
        <h4>{feature.name}</h4>
        <span className={`ideas150-kind ideas150-kind-${feature.kind}`}>{feature.kind}</span>
      </header>
      <p className="ideas150-desc">{feature.desc}</p>
      <div className="ideas150-card-actions">
        <button type="button" className="ideas150-btn primary" disabled={busy} onClick={() => onRun(feature)}>
          Run
        </button>
        {(feature.kind === 'toggle' || feature.kind === 'toggle_fx') && (
          <button type="button" className="ideas150-btn" disabled={busy} onClick={() => onToggle(feature, !enabled)}>
            {enabled ? 'Disable' : 'Enable'}
          </button>
        )}
      </div>
      <div className="ideas150-meta">
        <span className={enabled ? 'on' : 'off'}>{enabled ? 'ON' : 'OFF'}</span>
        <span>runs: {state?.run_count || 0}</span>
      </div>
      {result && (
        <pre className="ideas150-result">{JSON.stringify(result, null, 2)}</pre>
      )}
      {feature.fx === 'confidence-ring' && (
        <div className="i150-confidence-ring-demo" style={{ '--pct': result?.ui?.percent || 0 }}>
          <span>{Math.round(result?.ui?.percent || 0)}%</span>
        </div>
      )}
    </article>
  );
}

export default function Ideas150Hub({ token, apiBaseUrl, userRole, onMsg }) {
  const [cat, setCat] = useState('ui');
  const [states, setStates] = useState({});
  const [msg, setMsg] = useState('');
  const [busySlug, setBusySlug] = useState(null);
  const [verifyReport, setVerifyReport] = useState(null);
  const [loadingStates, setLoadingStates] = useState(false);

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const api = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${apiBaseUrl}/ideas150${path}`, {
      ...opts,
      headers: { ...headers(), ...(opts.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data.detail;
      const err = Array.isArray(detail) ? detail[0]?.msg : detail;
      throw new Error(err || data.error || `HTTP ${res.status}`);
    }
    return data;
  }, [apiBaseUrl, headers]);

  const notify = (text) => {
    setMsg(text);
    if (onMsg) onMsg(text);
  };

  const refreshStates = useCallback(async () => {
    if (!token) return;
    setLoadingStates(true);
    try {
      const data = await api('/states');
      const map = {};
      (data.states || []).forEach((s) => {
        map[s.slug] = s;
        applyFxFromState(s);
      });
      setStates(map);
    } catch (e) {
      notify(e.message);
    } finally {
      setLoadingStates(false);
    }
  }, [api, token]);

  useEffect(() => {
    restoreAllIdeaFx();
    refreshStates();
  }, [refreshStates]);

  const features = useMemo(() => getIdeasByCategory(cat), [cat]);

  const onRun = async (feature) => {
    setBusySlug(feature.slug);
    try {
      const state = await api(`/feature/${feature.slug}/run`, {
        method: 'POST',
        body: JSON.stringify({ enabled: true, payload: {} }),
      });
      setStates((prev) => ({ ...prev, [feature.slug]: state }));
      runClientDemo(feature, { ...state.result, enabled: state.enabled, fx_enabled: true });
      applyFxFromState(state);
      notify(`✅ #${feature.id} ${feature.name} OK`);
    } catch (e) {
      notify(`❌ ${feature.name}: ${e.message}`);
    } finally {
      setBusySlug(null);
    }
  };

  const onToggle = async (feature, enabled) => {
    setBusySlug(feature.slug);
    try {
      const state = await api(`/feature/${feature.slug}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      setStates((prev) => ({ ...prev, [feature.slug]: state }));
      runClientDemo(feature, { ...state.result, enabled: state.enabled, fx_enabled: enabled });
      applyFxFromState(state);
      notify(`${feature.name} → ${enabled ? 'ON' : 'OFF'}`);
    } catch (e) {
      notify(e.message);
    } finally {
      setBusySlug(null);
    }
  };

  const runAllInCategory = async () => {
    notify(`Running ${features.length} features in category…`);
    for (const f of features) {
      // sequential to avoid DB write races
      // eslint-disable-next-line no-await-in-loop
      await onRun(f);
    }
    notify(`Category ${cat} complete`);
  };

  const verifyAll = async () => {
    setBusySlug('__verify__');
    try {
      const report = await api('/verify-all', { method: 'POST', body: '{}' });
      setVerifyReport(report);
      await refreshStates();
      notify(report.all_workable
        ? `🎉 All ${report.passed}/150 workable`
        : `Passed ${report.passed}, failed ${report.failed}`);
    } catch (e) {
      notify(e.message);
    } finally {
      setBusySlug(null);
    }
  };

  const enabledCount = Object.values(states).filter((s) => s.enabled).length;

  return (
    <div className="ideas150-hub glass-panel">
      <div className="ideas150-hero">
        <div>
          <h2>🚀 Ideas Hub — All {TOTAL_IDEAS150} Features</h2>
          <p>
            Functional UI + attendance + AI + enterprise features. Enabled: <strong>{enabledCount}</strong>
            {loadingStates ? ' · syncing…' : ''}
            {userRole ? ` · role: ${userRole}` : ''}
          </p>
        </div>
        <div className="ideas150-hero-actions">
          <button type="button" className="ideas150-btn primary" onClick={verifyAll} disabled={!!busySlug}>
            Verify All 150
          </button>
          <button type="button" className="ideas150-btn" onClick={runAllInCategory} disabled={!!busySlug}>
            Run Category
          </button>
          <button type="button" className="ideas150-btn" onClick={refreshStates}>Refresh</button>
          <button type="button" className="ideas150-btn danger" onClick={() => { clearAllIdeaFx(); notify('UI FX cleared'); }}>
            Clear FX
          </button>
        </div>
      </div>

      {msg && <p className="ideas150-msg">{msg}</p>}

      {verifyReport && (
        <div className={`ideas150-verify ${verifyReport.all_workable ? 'ok' : 'bad'}`}>
          Verify: {verifyReport.passed}/{verifyReport.total} passed
          {!verifyReport.all_workable && (
            <ul>
              {verifyReport.results.filter((r) => !r.ok).slice(0, 10).map((r) => (
                <li key={r.slug}>#{r.id} {r.name}: {r.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="ideas150-progress" aria-hidden>
        <div style={{ width: `${(enabledCount / TOTAL_IDEAS150) * 100}%` }} />
      </div>

      <div className="ideas150-tabs" role="tablist">
        {CAT_ORDER.map((key) => {
          const meta = IDEAS150_CATEGORIES[key];
          const count = IDEAS150_FEATURES.filter((f) => f.cat === key).length;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              className={`ideas150-tab ${cat === key ? 'active' : ''}`}
              onClick={() => setCat(key)}
            >
              {meta.emoji} {meta.letter}: {meta.title} ({count})
            </button>
          );
        })}
      </div>

      <p className="ideas150-cat-note">
        Showing {features.length} features — each Run hits live API and persists state.
      </p>

      <div className="ideas150-grid">
        {features.map((f) => (
          <FeatureCard
            key={f.slug}
            feature={f}
            state={states[f.slug]}
            onRun={onRun}
            onToggle={onToggle}
            busy={busySlug === f.slug || busySlug === '__verify__'}
          />
        ))}
      </div>
    </div>
  );
}
