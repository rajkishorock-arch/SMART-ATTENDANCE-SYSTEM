import { useState, useEffect, useCallback } from 'react';
import {
  Upload, Users, AlertTriangle, BarChart3, Key, CreditCard,
  FileText, Bell, RefreshCw, Shield, Download, Building2, Send,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function AdvancedFeaturesHub({ apiBaseUrl, token, userRole, currentUser }) {
  const [tab, setTab] = useState('bulk');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [atRisk, setAtRisk] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [billing, setBilling] = useState(null);
  const [deptStats, setDeptStats] = useState(null);
  const [faqText, setFaqText] = useState('');
  const [deptName, setDeptName] = useState('CS');

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
  }), [token]);

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, { ...options, headers: { ...headers(), ...options.headers } });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Request failed');
    return res.json();
  };

  const handleAlertParent = async (studentId, studentName) => {
    try {
      setLoading(true);
      setMessage('');
      const res = await fetch(`${apiBaseUrl}/parents/notify-absent/${studentId}`, {
        method: 'POST',
        headers: headers(),
      });
      if (res.ok) {
        setMessage(`Parent alert successfully triggered for ${studentName}!`);
      } else {
        const err = await res.json();
        setMessage(`Failed to alert parent: ${err.detail || 'Server error'}`);
      }
    } catch (e) {
      setMessage(`Error notifying parent: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (tab === 'analytics') {
      Promise.all([
        fetchJson(`${apiBaseUrl}/analytics/at-risk`).then((d) => setAtRisk(d.students || [])),
        fetchJson(`${apiBaseUrl}/analytics/predictions`).then((d) => setPredictions(d.predictions || [])),
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
    }
  }, [tab, token, apiBaseUrl, userRole, headers]);

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

  const getRiskDistributionData = () => {
    let high = 0, medium = 0, low = 0;
    atRisk.forEach(s => {
      const pct = parseFloat(s.percentage);
      if (pct < 60) high++;
      else if (pct < 75) medium++;
      else low++;
    });
    predictions.forEach(p => {
      if (p.risk_level === 'low') low++;
    });
    return [
      { name: 'High Risk (<60%)', value: high, color: '#f87171' },
      { name: 'Medium Risk (60-75%)', value: medium, color: '#fbbf24' },
      { name: 'Low Risk (75%+)', value: low, color: '#34d399' },
    ].filter(item => item.value > 0);
  };

  const getPredictionChartData = () => {
    return predictions.slice(0, 8).map(p => ({
      name: p.name.split(' ')[0],
      attendance: parseFloat(p.current_percentage),
      risk: parseFloat(p.risk_score),
    }));
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Charts Grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', minHeight: '260px' }}>
            
            {/* Chart 1: Risk Levels */}
            <div style={{ flex: '1 1 300px', minWidth: '280px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '12px', fontWeight: '600' }}>Student Risk Classification</h4>
              <div style={{ width: '100%', height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getRiskDistributionData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getRiskDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#cbd5e1' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Predictions & Attendance rates */}
            <div style={{ flex: '1 1 300px', minWidth: '280px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '12px', fontWeight: '600' }}>Attendance vs Risk Score (Top At-Risk)</h4>
              <div style={{ width: '100%', height: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getPredictionChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                    <YAxis stroke="#94a3b8" fontSize={9} />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                    <Bar dataKey="attendance" fill="#3b82f6" name="Attendance %" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="risk" fill="#ef4444" name="Risk Score %" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
          </div>

          {/* At-Risk List */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.95rem' }}>
              <AlertTriangle size={16} /> Action Required: At-Risk Students ({atRisk.length})
            </h4>
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {atRisk.length === 0 ? (
                <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '12px', textAlign: 'center' }}>
                  No students currently below the 75% threshold!
                </div>
              ) : (
                atRisk.map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', borderLeft: parseFloat(s.percentage) < 60 ? '3px solid #ef4444' : '3px solid #fbbf24' }}>
                    <div style={{ fontSize: '0.85rem', flex: '1 1 200px' }}>
                      <span style={{ color: '#fff', fontWeight: '500' }}>{s.name}</span>
                      <span style={{ color: '#64748b', marginLeft: '6px' }}>({s.roll})</span>
                      <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '2px' }}>
                        Attendance: <strong style={{ color: parseFloat(s.percentage) < 60 ? '#f87171' : '#fbbf24' }}>{s.percentage}%</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAlertParent(s.id, s.name)}
                      disabled={loading}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '6px',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                    >
                      <Send size={12} /> Alert Parent
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Predictions Detail */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ color: '#a78bfa', marginBottom: '12px', fontSize: '0.95rem' }}>Attendance Predictions & Forecasts</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {predictions.slice(0, 6).map((p) => (
                <div key={p.id} style={{ padding: '10px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ color: '#fff', fontWeight: '500', marginBottom: '4px' }}>{p.name}</div>
                  <div style={{ color: '#94a3b8' }}>Risk Level: <span style={{ color: p.risk_level === 'high' ? '#f87171' : p.risk_level === 'medium' ? '#fbbf24' : '#34d399', textTransform: 'capitalize' }}>{p.risk_level}</span></div>
                  <div style={{ color: '#94a3b8', marginTop: '2px' }}>Risk Score: <strong>{p.risk_score}%</strong></div>
                  <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '4px' }}>Est. absences next week: {p.predicted_absences_next_week}d</div>
                </div>
              ))}
            </div>
          </div>
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
          <p>Students: {billing.student_count} / {billing.student_limit}</p>
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
