import { useState, useEffect, useCallback } from 'react';
import {
  Upload, Users, AlertTriangle, BarChart3, Key, CreditCard,
  FileText, Bell, RefreshCw, Shield, Download, Building2,
} from 'lucide-react';
import { authHeaders, fetchJson as requestJson } from '../utils/apiClient';

export default function AdvancedFeaturesHub({ apiBaseUrl, token, userRole, currentUser }) {
  const [tab, setTab] = useState('bulk');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [atRisk, setAtRisk] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [duplicates, setDuplicates] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [billing, setBilling] = useState(null);
  const [saasSummary, setSaasSummary] = useState(null);
  const [deptStats, setDeptStats] = useState(null);
  const [faqText, setFaqText] = useState('');
  const [deptName, setDeptName] = useState('CS');

  const headers = useCallback(() => authHeaders(token), [token]);
  const fetchJson = useCallback((url, options = {}) => requestJson(url, token, options), [token]);

  useEffect(() => {
    if (!token) return;
    if (tab === 'analytics') {
      Promise.all([
        fetchJson(`${apiBaseUrl}/analytics/at-risk`).then((d) => setAtRisk(d.students || [])),
        fetchJson(`${apiBaseUrl}/analytics/predictions`).then((d) => setPredictions(d.predictions || [])),
        fetchJson(`${apiBaseUrl}/analytics/insights`).then(setInsights),
      ]).catch((e) => setMessage(e.message));
    }
    if (tab === 'enrollment') {
      Promise.all([
        fetchJson(`${apiBaseUrl}/enrollment/duplicates`).then((d) => setDuplicates(d.duplicate_pairs || [])),
        fetchJson(`${apiBaseUrl}/enrollment/re-enrollment-reminders`).then((d) => setReminders(d.students || [])),
      ]).catch((e) => setMessage(e.message));
    }
    if (tab === 'audit' && userRole === 'admin') {
      fetchJson(`${apiBaseUrl}/audit/?limit=50`).then(setAuditLogs).catch((e) => setMessage(e.message));
    }
    if (tab === 'erp' && userRole === 'admin') {
      fetchJson(`${apiBaseUrl}/erp/keys`).then(setApiKeys).catch((e) => setMessage(e.message));
    }
    if (tab === 'billing' && userRole === 'admin') {
      fetchJson(`${apiBaseUrl}/billing/status`).then(setBilling).catch((e) => setMessage(e.message));
      if (currentUser?.institution_id) {
        fetchJson(`${apiBaseUrl}/institutions/${currentUser.institution_id}/saas-summary`).then(setSaasSummary).catch((e) => setMessage(e.message));
      }
    }
  }, [tab, token, apiBaseUrl, userRole, headers, currentUser?.institution_id]);

  const handleBulkUpload = async (entity, file) => {
    if (!file) return;
    setLoading(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${apiBaseUrl}/bulk-import/${entity}`, {
        method: 'POST',
        headers: headers(),
        body: fd,
      });
      const data = await res.json();
      setMessage(`${entity}: created ${data.created || 0}, skipped ${data.skipped || 0}`);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    const name = prompt('API key name (e.g. College ERP):');
    if (!name) return;
    try {
      const data = await fetchJson(`${apiBaseUrl}/erp/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ name }),
      });
      alert(`API Key (save now): ${data.key}`);
      setApiKeys((prev) => [...prev, { id: data.id, name: data.name, key_prefix: data.key?.slice(0, 8) }]);
    } catch (e) {
      setMessage(e.message);
    }
  };

  const loadDeptDashboard = async () => {
    try {
      const data = await fetchJson(`${apiBaseUrl}/analytics/department/${encodeURIComponent(deptName)}`);
      setDeptStats(data);
    } catch (e) {
      setMessage(e.message);
    }
  };

  const saveFaq = async () => {
    try {
      await fetchJson(`${apiBaseUrl}/institutions/${currentUser?.institution_id}/faq`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers() },
        body: JSON.stringify({ faq_json: faqText }),
      });
      setMessage('Institution FAQ saved for AI chatbot');
    } catch (e) {
      setMessage(e.message);
    }
  };

  const tabs = [
    { id: 'bulk', label: 'Bulk Import', icon: Upload },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'enrollment', label: 'Face Health', icon: Users },
    { id: 'hod', label: 'HOD Dashboard', icon: Building2 },
    { id: 'audit', label: 'Audit Trail', icon: FileText, adminOnly: true },
    { id: 'erp', label: 'ERP API Keys', icon: Key, adminOnly: true },
    { id: 'billing', label: 'Billing', icon: CreditCard, adminOnly: true },
    { id: 'faq', label: 'Institution FAQ', icon: Bell, adminOnly: true },
  ].filter((t) => !t.adminOnly || userRole === 'admin');

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h3 style={{ color: '#f8fafc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Shield size={20} /> Productivity & Enterprise Hub
      </h3>
      <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '20px' }}>
        Bulk import, analytics, parent alerts, ERP integration, billing, and more.
      </p>

      {message && (
        <div style={{ padding: '10px', marginBottom: '16px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: tab === id ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)',
              background: tab === id ? 'rgba(79,70,229,0.2)' : 'transparent',
              color: '#e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'bulk' && userRole === 'admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {['students', 'subjects', 'schedules'].map((entity) => (
            <div key={entity} style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ color: '#f1f5f9', textTransform: 'capitalize' }}>Import {entity}</h4>
              <input type="file" accept=".csv" onChange={(e) => handleBulkUpload(entity, e.target.files[0])} disabled={loading} />
              <a href={`${apiBaseUrl}/bulk-import/templates/${entity}`} style={{ color: '#00f2fe', fontSize: '0.8rem', marginTop: '8px', display: 'inline-block' }}>
                <Download size={12} style={{ display: 'inline' }} /> Download CSV template
              </a>
            </div>
          ))}
        </div>
      )}

      {tab === 'analytics' && (
        <div>
          {insights && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Average</div>
                <strong style={{ color: '#f8fafc', fontSize: '1.2rem' }}>{insights.average_attendance}%</strong>
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>At Risk</div>
                <strong style={{ color: '#f87171', fontSize: '1.2rem' }}>{insights.at_risk_count}</strong>
              </div>
              <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Working Days</div>
                <strong style={{ color: '#60a5fa', fontSize: '1.2rem' }}>{insights.working_days}</strong>
              </div>
            </div>
          )}
          {insights?.recommendations?.length > 0 && (
            <div style={{ marginBottom: '16px', color: '#cbd5e1', fontSize: '0.85rem' }}>
              {insights.recommendations.map((item) => (
                <div key={item} style={{ padding: '6px 0' }}>{item}</div>
              ))}
            </div>
          )}
          <h4 style={{ color: '#f87171' }}><AlertTriangle size={16} /> At-Risk Students ({atRisk.length})</h4>
          <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '16px' }}>
            {atRisk.map((s) => (
              <div key={s.id} style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', color: '#cbd5e1' }}>
                {s.name} ({s.roll}) — {s.percentage}%
              </div>
            ))}
          </div>
          <h4 style={{ color: '#a78bfa' }}>Predictions</h4>
          {predictions.slice(0, 10).map((p) => (
            <div key={p.id} style={{ padding: '6px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              {p.name}: risk {p.risk_level} ({p.risk_score}%)
            </div>
          ))}
        </div>
      )}

      {tab === 'enrollment' && (
        <div>
          <h4 style={{ color: '#fbbf24' }}>Duplicate Face Pairs ({duplicates.length})</h4>
          {duplicates.map((d, i) => (
            <div key={i} style={{ fontSize: '0.85rem', color: '#cbd5e1', padding: '4px 0' }}>
              {d.student_a.name} ↔ {d.student_b.name} (similarity: {d.similarity})
            </div>
          ))}
          <h4 style={{ color: '#60a5fa', marginTop: '16px' }}>Re-enrollment Reminders ({reminders.length})</h4>
          {reminders.slice(0, 15).map((s) => (
            <div key={s.id} style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '4px 0' }}>
              {s.name} ({s.roll}) — {s.reasons.join(', ')}
            </div>
          ))}
        </div>
      )}

      {tab === 'hod' && (
        <div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="Department" style={{ padding: '8px', borderRadius: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff' }} />
            <button type="button" onClick={loadDeptDashboard} style={{ padding: '8px 16px', borderRadius: '6px', background: 'var(--color-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
              <RefreshCw size={14} /> Load
            </button>
          </div>
          {deptStats && (
            <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
              <p>Students: {deptStats.total_students} | Avg Attendance: {deptStats.average_attendance}%</p>
              <p>At-risk: {deptStats.at_risk_count}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          {auditLogs.map((log) => (
            <div key={log.id} style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem' }}>
              <span style={{ color: '#64748b' }}>{new Date(log.timestamp).toLocaleString()}</span>
              <span style={{ color: '#00f2fe', marginLeft: '8px' }}>{log.user_email}</span>
              <p style={{ color: '#e2e8f0', margin: '4px 0 0' }}>{log.action}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'erp' && (
        <div>
          <button type="button" onClick={createApiKey} style={{ padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '12px' }}>
            <Key size={14} /> Create API Key
          </button>
          {apiKeys.map((k) => (
            <div key={k.id} style={{ padding: '8px', color: '#cbd5e1', fontSize: '0.85rem' }}>
              {k.name} — prefix: {k.key_prefix}***
            </div>
          ))}
        </div>
      )}

      {tab === 'billing' && billing && (
        <div style={{ color: '#cbd5e1' }}>
          <p>Plan: <strong>{billing.plan}</strong> ({billing.status})</p>
          <p>Students: {billing.student_count} / {billing.student_limit} ({billing.remaining_students ?? 0} remaining)</p>
          {saasSummary && (
            <div style={{ marginTop: '16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px' }}>
              <h4 style={{ color: '#f8fafc', margin: '0 0 10px' }}>Institution Setup</h4>
              {saasSummary.setup_steps?.map((step) => (
                <div key={step.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '6px 0', fontSize: '0.85rem' }}>
                  <span>{step.label}</span>
                  <strong style={{ color: step.complete ? '#10b981' : '#f59e0b' }}>{step.complete ? 'Complete' : 'Pending'}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'faq' && (
        <div>
          <textarea
            value={faqText}
            onChange={(e) => setFaqText(e.target.value)}
            placeholder="Q: What are college timings?&#10;A: 9 AM to 5 PM..."
            rows={8}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
          <button type="button" onClick={saveFaq} style={{ marginTop: '12px', padding: '10px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Save FAQ for AI Chatbot
          </button>
        </div>
      )}
    </div>
  );
}
