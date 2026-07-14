import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IDEAS150_CATEGORIES,
  IDEAS150_FEATURES,
  TOTAL_IDEAS150,
  getIdeasByCategory,
} from '../utils/ideas150Catalog';
import {
  clearAllIdeaFx,
  restoreAllIdeaFx,
  runClientDemo,
  setIdeas150HubOpen,
  syncLiveFxFromStates,
} from '../utils/ideas150Effects';

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
      });
      setStates(map);
      // Safe sync — no black-screen stack
      syncLiveFxFromStates(map);
    } catch (e) {
      notify(e.message);
    } finally {
      setLoadingStates(false);
    }
  }, [api, token]);

  useEffect(() => {
    setIdeas150HubOpen(true);
    restoreAllIdeaFx();
    refreshStates();
    return () => {
      setIdeas150HubOpen(false);
      // Keep live FX on Home — do NOT clear on unmount
      restoreAllIdeaFx();
    };
  }, [refreshStates]);

  const features = useMemo(() => getIdeasByCategory(cat), [cat]);

  const onRun = async (feature) => {
    setBusySlug(feature.slug);
    try {
      const state = await api(`/feature/${feature.slug}/run`, {
        method: 'POST',
        body: JSON.stringify({ enabled: true, payload: {} }),
      });
      setStates((prev) => {
        const next = { ...prev, [feature.slug]: state };
        syncLiveFxFromStates(next);
        return next;
      });
      runClientDemo(feature, { ...state.result, enabled: state.enabled, fx_enabled: true });
      notify(`✅ #${feature.id} ${feature.name} ON — Home pe bhi dikhega`);
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
      setStates((prev) => {
        const next = { ...prev, [feature.slug]: state };
        syncLiveFxFromStates(next);
        return next;
      });
      runClientDemo(feature, { ...state.result, enabled: state.enabled, fx_enabled: enabled });
      notify(enabled
        ? `${feature.name} ON — Settings band karke Home pe dekho`
        : `${feature.name} OFF`);
    } catch (e) {
      notify(e.message);
    } finally {
      setBusySlug(null);
    }
  };

  const runAllInCategory = async () => {
    notify(`Running ${features.length} features…`);
    for (const f of features) {
      // eslint-disable-next-line no-await-in-loop
      await onRun(f);
    }
    notify(`Category ${cat} complete — Home pe effects active`);
  };

  const verifyAll = async () => {
    setBusySlug('__verify__');
    try {
      const report = await api('/verify-all', { method: 'POST', body: '{}' });
      setVerifyReport(report);
      await refreshStates();
      notify(report.all_workable
        ? `🎉 All ${report.passed}/150 APIs OK (FX stack safe — screen clear)`
        : `Passed ${report.passed}, failed ${report.failed}`);
    } catch (e) {
      notify(e.message);
    } finally {
      setBusySlug(null);
    }
  };

  const enabledCount = Object.values(states).filter((s) => s.enabled).length;

  return (
    <div className="ideas150-hub" role="region" aria-label="Ideas Hub 150">
      <div className="ideas150-hero">
        <div>
          <h2>🚀 Ideas Hub — All {TOTAL_IDEAS150} Features</h2>
          <p>
            Enable / Run yahan karo. Effects <strong>poori app</strong> (Home) pe dikhte hain.
            {loadingStates ? ' · syncing…' : ''}
            {userRole ? ` · role: ${userRole}` : ''}
            {' · '}ON: <strong>{enabledCount}</strong>
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
          <button
            type="button"
            className="ideas150-btn danger"
            onClick={async () => {
              clearAllIdeaFx();
              try {
                await api('/ideas150/reset-all', { method: 'POST' });
                await refreshStates();
                notify('Saare UI FX band aur DB reset — Home normal');
              } catch (e) {
                notify(`FX cleared locally. DB reset error: ${e.message}`);
              }
            }}
          >
            Clear FX
          </button>
        </div>
      </div>

      <div className="ideas150-hint">
        Black screen fix active. Jo FX ON karoge woh Home pe rahega — Settings se bahar jaake dekho.
        Dark themes me se ek time pe sirf ek lagega (clash nahi hoga).
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
        Showing {features.length} — Run/Enable = API + live UI on whole app.
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
