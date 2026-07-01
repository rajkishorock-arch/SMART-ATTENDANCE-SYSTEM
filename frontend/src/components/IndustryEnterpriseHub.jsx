import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Shield, FileText, Bell, UserCheck, GraduationCap, Layers,
  Map, Brain, Mic, Monitor, Building2, Key, Link, Activity, Palette, CreditCard,
  RefreshCw, Download, Radio, Wifi,
} from 'lucide-react';

const TABS = [
  { id: 'rules', label: 'Rules Engine', icon: Shield },
  { id: 'exam', label: 'Exam Mode', icon: GraduationCap },
  { id: 'reports', label: 'Report Builder', icon: FileText },
  { id: 'escalation', label: 'Parent Escalation', icon: Bell },
  { id: 'substitute', label: 'Substitute Teacher', icon: UserCheck },
  { id: 'bulk', label: 'Bulk Ops', icon: Layers },
  { id: 'copilot', label: 'Timetable Copilot', icon: Brain },
  { id: 'heatmap', label: 'Heatmap', icon: Map },
  { id: 'dropout', label: 'Dropout Risk', icon: Activity },
  { id: 'voice', label: 'Voice Mark', icon: Mic },
  { id: 'rfid', label: 'RFID/NFC', icon: Radio },
  { id: 'kiosk', label: 'AR Kiosk', icon: Monitor },
  { id: 'sla', label: 'SLA Monitor', icon: Activity },
  { id: 'campus', label: 'Multi-Campus', icon: Building2 },
  { id: 'sso', label: 'SSO', icon: Key },
  { id: 'erp', label: 'ERP Sync', icon: Link },
  { id: 'billing', label: 'Billing Auto', icon: CreditCard },
  { id: 'whitelabel', label: 'White-label', icon: Palette },
  { id: 'compliance', label: 'Compliance', icon: Download },
  { id: 'offline', label: 'Offline Sync', icon: Wifi },
  { id: 'liveness', label: 'Liveness 2.0', icon: Shield },
  { id: 'edge', label: 'Edge AI', icon: Zap },
];

export default function IndustryEnterpriseHub({ apiBaseUrl, token, userRole, onOpenScanner, offlineQueueCount = 0 }) {
  const [tab, setTab] = useState('rules');
  const [msg, setMsg] = useState('');
  const [data, setData] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const api = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${apiBaseUrl}/enterprise${path}`, { ...opts, headers: { ...headers(), ...opts.headers } });
    const json = res.ok ? await res.json() : null;
    if (!res.ok) throw new Error(json?.detail || 'Request failed');
    return json;
  }, [apiBaseUrl, headers]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      if (tab === 'rules') setData({ rules: await api('/rules') });
      if (tab === 'exam') setData({ exams: await api('/exam/sessions') });
      if (tab === 'reports') setData({ saved: await api('/reports/saved') });
      if (tab === 'escalation') setData({ cases: await api('/escalation/cases') });
      if (tab === 'substitute') setData({ subs: await api('/substitute/active') });
      if (tab === 'heatmap') setData({ heatmap: await api('/heatmap') });
      if (tab === 'dropout') setData({ scores: await api('/dropout-scores') });
      if (tab === 'sla') setData({ sla: await api('/sla/status') });
      if (tab === 'campus') setData({ campuses: await api('/campuses') });
      if (tab === 'billing') setData({ billing: await api('/billing/automation-status') });
      if (tab === 'whitelabel') setData({ wl: await api('/white-label/config') });
      if (tab === 'kiosk') setData({ kiosk: await api('/kiosk/config') });
    } catch (e) { setMsg(e.message); }
  }, [tab, token, api]);

  useEffect(() => { load(); }, [load]);

  const [ruleName, setRuleName] = useState('75% Minimum Attendance');
  const [examName, setExamName] = useState('Mid-Term Exam Hall A');
  const [copilotQ, setCopilotQ] = useState('Aaj kaun absent hai?');
  const [voiceRoll, setVoiceRoll] = useState('');
  const [rfidCard, setRfidCard] = useState('');
  const [subOrig, setSubOrig] = useState('');
  const [subReplace, setSubReplace] = useState('');
  const [customReportName, setCustomReportName] = useState('Custom Attendance Report');
  const [selectedColumns, setSelectedColumns] = useState(['name', 'roll', 'attendance', 'date', 'department']);
  const [filterDept, setFilterDept] = useState('');
  const [wlAppName, setWlAppName] = useState('');
  const [wlLogoUrl, setWlLogoUrl] = useState('');
  const [wlPrimaryColor, setWlPrimaryColor] = useState('');
  const [wlSecondaryColor, setWlSecondaryColor] = useState('');
  const [wlCustomDomain, setWlCustomDomain] = useState('');

  useEffect(() => {
    if (data.wl) {
      setWlAppName(data.wl.app_name || '');
      setWlLogoUrl(data.wl.logo_url || '');
      setWlPrimaryColor(data.wl.primary_color || '');
      setWlSecondaryColor(data.wl.secondary_color || '');
      setWlCustomDomain(data.wl.custom_domain || '');
    }
  }, [data.wl]);

  if (userRole === 'student') {
    return <p style={{ color: '#94a3b8' }}>Enterprise tools are for staff only.</p>;
  }

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h2 style={{ color: '#f8fafc', margin: '0 0 8px' }}>🏭 Industry Enterprise Suite</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 16px' }}>
        Rules, exam mode, escalation, SLA, multi-campus, ERP, billing — industry-grade tools.
      </p>

      <div className="futuristic-hub-tabs" style={{ maxHeight: '120px', overflowY: 'auto' }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`futuristic-hub-tab ${tab === t.id ? 'active' : ''}`} onClick={() => { setTab(t.id); setMsg(''); setSelectedReport(null); }}>
            <t.icon size={12} style={{ marginRight: 4 }} />{t.label}
          </button>
        ))}
      </div>

      {msg && <p style={{ color: '#10b981', fontSize: '0.82rem' }}>{msg}</p>}

      {tab === 'rules' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Smart Attendance Rules Engine</h3>
          <input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Rule name" style={inputStyle} />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            <button type="button" className="bg-gradient-btn" style={btnStyle} onClick={async () => {
              await api('/rules', { method: 'POST', body: JSON.stringify({ name: ruleName, rule_type: 'min_percent', threshold: 75, action: 'alert' }) });
              setMsg('Rule created'); load();
            }}>Add 75% Rule</button>
            <button type="button" className="btn-secondary" style={btnStyle} onClick={async () => {
              const r = await api('/rules/evaluate', { method: 'POST' });
              setMsg(`${r.count} alerts triggered`);
              load();
            }}>Run Evaluate</button>
          </div>
          <ul style={{ marginTop: '12px', color: '#cbd5e1', fontSize: '0.82rem' }}>
            {(data.rules || []).map((r) => <li key={r.id}>{r.name} — {r.rule_type} @ {r.threshold}% → {r.action}</li>)}
          </ul>
        </div>
      )}

      {tab === 'exam' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Exam Mode</h3>
          <input value={examName} onChange={(e) => setExamName(e.target.value)} style={inputStyle} />
          <button type="button" className="bg-gradient-btn" style={{ ...btnStyle, marginTop: 8 }} onClick={async () => {
            const r = await api('/exam/sessions', { method: 'POST', body: JSON.stringify({ name: examName, geofence_strict: true }) });
            setMsg(`Exam created #${r.id}`); load();
          }}>Create Exam Session</button>
          {(data.exams || []).map((e) => (
            <div key={e.id} style={cardStyle}>
              <strong style={{ color: '#f8fafc' }}>{e.name}</strong>
              <span style={{ color: e.is_active ? '#10b981' : '#64748b', marginLeft: 8 }}>{e.is_active ? 'ACTIVE' : 'inactive'}</span>
              {!e.is_active && userRole === 'admin' && (
                <button type="button" style={{ ...btnStyle, marginLeft: 8 }} onClick={async () => {
                  await api(`/exam/sessions/${e.id}/activate`, { method: 'POST' });
                  setMsg('Exam mode activated — strict geofence ON'); load();
                }}>Activate</button>
              )}
              {e.is_active && userRole === 'admin' && (
                <button type="button" className="btn-secondary" style={{ ...btnStyle, marginLeft: 8 }} onClick={async () => {
                  try {
                    await api(`/exam/sessions/${e.id}/deactivate`, { method: 'POST' });
                    setMsg('Exam session deactivated'); load();
                  } catch (e) {
                    setMsg(`Error: ${e.message}`);
                  }
                }}>Deactivate</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'reports' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Custom Report Builder</h3>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', marginBottom: '4px' }}>Report Name</label>
              <input 
                value={customReportName} 
                onChange={(e) => setCustomReportName(e.target.value)} 
                placeholder="Enter report name" 
                style={inputStyle} 
              />
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', marginBottom: '4px' }}>Filter by Department (Optional)</label>
              <input 
                value={filterDept} 
                onChange={(e) => setFilterDept(e.target.value)} 
                placeholder="e.g. CSE(IOT) or leave empty for all" 
                style={inputStyle} 
              />
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem', marginBottom: '6px' }}>Columns to Include</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#cbd5e1' }}>
                {['name', 'roll', 'attendance', 'date', 'department'].map((col) => {
                  const isChecked = selectedColumns.includes(col);
                  return (
                    <label key={col} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '4px' }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => {
                          if (isChecked) {
                            setSelectedColumns(selectedColumns.filter(c => c !== col));
                          } else {
                            setSelectedColumns([...selectedColumns, col]);
                          }
                        }}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{col === 'name' ? 'Student Name' : col}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button type="button" className="bg-gradient-btn" style={{ ...btnStyle, width: '100%' }} onClick={async () => {
              try {
                if (!customReportName.trim()) {
                  setMsg('Please enter a report name first');
                  return;
                }
                if (selectedColumns.length === 0) {
                  setMsg('Please select at least one column');
                  return;
                }
                const config = {
                  name: customReportName.trim(),
                  columns: selectedColumns,
                  department: filterDept.trim() || null,
                  save: true,
                };
                const r = await api('/reports/build', { method: 'POST', body: JSON.stringify(config) });
                setMsg(`Report built — ${r.total} rows, saved #${r.saved_id || 'N/A'}`);
                setSelectedReport(r);
                load();
              } catch (e) {
                setMsg(`Error: ${e.message}`);
              }
            }}>Build & Save Report</button>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 12, marginBottom: 4 }}>Saved Reports (Click to load):</p>
          <ul style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: 0, paddingLeft: 0, listStyle: 'none' }}>
            {(data.saved || []).map((r) => (
              <li key={r.id} style={{ marginBottom: 6 }}>
                <button type="button" style={{
                  background: 'none', border: 'none', color: '#00f2fe', cursor: 'pointer', padding: 0, textAlign: 'left', textDecoration: 'underline', fontSize: '0.82rem'
                }} onClick={async () => {
                  try {
                    const config = r.config || { name: r.name, columns: ['name', 'roll', 'attendance', 'date', 'department'], save: false };
                    const res = await api('/reports/build', { method: 'POST', body: JSON.stringify({ ...config, save: false }) });
                    setSelectedReport(res);
                    setMsg(`Loaded report: ${r.name}`);
                  } catch (e) {
                    setMsg(`Error: ${e.message}`);
                  }
                }}>
                  📄 {r.name} (ID: #{r.id})
                </button>
              </li>
            ))}
          </ul>

          {selectedReport && (
            <div style={{ marginTop: 16, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ color: '#f8fafc', margin: 0 }}>{selectedReport.name} ({selectedReport.total} rows)</h4>
                <button type="button" className="bg-gradient-btn" style={{ padding: '4px 8px', fontSize: '0.75rem', marginTop: 0 }} onClick={() => {
                  const rows = selectedReport.rows || [];
                  const cols = Object.keys(rows[0] || {});
                  const csvRows = [
                    cols.join(','),
                    ...rows.map(row => cols.map(c => `"${row[c] || ''}"`).join(','))
                  ];
                  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedReport.name.toLowerCase().replace(/\s+/g, '_')}.csv`;
                  a.click();
                }}>Download CSV</button>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '200px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: '#cbd5e1' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                      {Object.keys(selectedReport.rows[0] || {}).map((col) => (
                        <th key={col} style={{ padding: '6px', textTransform: 'capitalize', color: '#00f2fe' }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.rows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        {Object.values(row).map((val, i) => (
                          <td key={i} style={{ padding: '6px' }}>{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'escalation' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Auto Parent Escalation</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Tier 1 → Teacher notify | Tier 2 → HOD | Tier 3 → Principal + WhatsApp</p>
          <button type="button" className="bg-gradient-btn" style={btnStyle} onClick={async () => {
            const r = await api('/escalation/run', { method: 'POST' });
            setMsg(r.message); load();
          }}>Run Escalation Now</button>
          {(data.cases || []).map((c) => (
            <div key={c.id} style={cardStyle}>
              <span style={{ color: '#f8fafc' }}>{c.student_name} ({c.student_roll})</span>
              <span style={{ color: '#f59e0b', marginLeft: 8 }}>Tier {c.tier}</span>
              <span style={{ color: '#64748b', marginLeft: 8 }}>{c.status}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'substitute' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Substitute Teacher Flow</h3>
          <input value={subOrig} onChange={(e) => setSubOrig(e.target.value)} placeholder="Original teacher email" style={inputStyle} />
          <input value={subReplace} onChange={(e) => setSubReplace(e.target.value)} placeholder="Substitute email" style={{ ...inputStyle, marginTop: 8 }} />
          <button type="button" className="bg-gradient-btn" style={{ ...btnStyle, marginTop: 8 }} onClick={async () => {
            await api('/substitute/assign', { method: 'POST', body: JSON.stringify({ original_teacher_email: subOrig, substitute_email: subReplace }) });
            setMsg('Substitute assigned for today'); load();
          }}>Assign Substitute</button>
          {(data.subs || []).map((s) => <div key={s.id} style={cardStyle}>{s.original} → {s.substitute}</div>)}
        </div>
      )}

      {tab === 'bulk' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Bulk Operations Center</h3>
          <button type="button" className="bg-gradient-btn" style={btnStyle} onClick={async () => {
            const r = await api('/bulk/notify-absent', { method: 'POST' });
            setMsg(`Notified ${r.notified} parents`);
          }}>Bulk Notify All Absent Today</button>
        </div>
      )}

      {tab === 'copilot' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Timetable AI Copilot</h3>
          <input value={copilotQ} onChange={(e) => setCopilotQ(e.target.value)} style={inputStyle} />
          <button type="button" className="bg-gradient-btn" style={{ ...btnStyle, marginTop: 8 }} onClick={async () => {
            const r = await api('/copilot/timetable', { method: 'POST', body: JSON.stringify({ question: copilotQ }) });
            setMsg(r.answer);
          }}>Ask Copilot</button>
        </div>
      )}

      {tab === 'heatmap' && data.heatmap && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Attendance Heatmap — {data.heatmap.date}</h3>
          <div className="campus-map-view" style={{ height: 200 }}>
            {(data.heatmap.zones || []).map((z, i) => (
              <div key={z.zone} className="campus-zone-pin" style={{
                left: `${20 + (i * 25) % 70}%`, top: `${30 + (i * 20) % 50}%`,
                opacity: 0.4 + z.intensity * 0.6,
                transform: 'translate(-50%,-50%) scale(' + (0.8 + z.intensity) + ')',
              }} title={`${z.zone}: ${z.present_count}`} />
            ))}
          </div>
          <ul style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: 12 }}>
            {(data.heatmap.zones || []).map((z) => <li key={z.zone}>{z.zone}: {z.present_count} present</li>)}
          </ul>
        </div>
      )}

      {tab === 'dropout' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Predictive Dropout Risk</h3>
          {data.scores && data.scores.length === 0 && (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '8px' }}>
              ✓ No students currently identified at high risk of dropout (attendance ≥ 60% and no long absent streaks).
            </p>
          )}
          {(data.scores || []).map((s) => (
            <div key={s.student_id} style={cardStyle}>
              <span style={{ color: '#f8fafc' }}>{s.name} ({s.roll})</span>
              <span style={{ color: s.risk_score > 70 ? '#ef4444' : '#f59e0b', marginLeft: 8 }}>Risk {s.risk_score}%</span>
              <span style={{ color: '#64748b', marginLeft: 8 }}>{s.absent_streak}d absent streak</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'voice' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Voice Attendance in Classroom</h3>
          <input value={voiceRoll} onChange={(e) => setVoiceRoll(e.target.value)} placeholder="Roll number" style={inputStyle} />
          <button type="button" className="bg-gradient-btn" style={{ ...btnStyle, marginTop: 8 }} onClick={async () => {
            try {
              if (!voiceRoll.trim()) {
                setMsg('Please enter a Roll number first');
                return;
              }
              const r = await api('/voice-mark', { method: 'POST', body: JSON.stringify({ roll: voiceRoll.trim() }) });
              setMsg(`Marked: ${r.name}`);
            } catch (e) {
              setMsg(`Error: ${e.message}`);
            }
          }}>Mark by Roll (Voice/Quick)</button>
        </div>
      )}

      {tab === 'rfid' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Face + RFID/NFC Hybrid Fallback</h3>
          <input value={rfidCard} onChange={(e) => setRfidCard(e.target.value)} placeholder="Card ID or Roll" style={inputStyle} />
          <button type="button" className="bg-gradient-btn" style={{ ...btnStyle, marginTop: 8 }} onClick={async () => {
            try {
              if (!rfidCard.trim()) {
                setMsg('Please enter a Card ID or Roll number first');
                return;
              }
              const r = await api('/rfid/mark', { method: 'POST', body: JSON.stringify({ card_id: rfidCard.trim(), roll: rfidCard.trim() }) });
              setMsg(`RFID marked: ${r.name}`);
            } catch (e) {
              setMsg(`Error: ${e.message}`);
            }
          }}>Mark via RFID/NFC</button>
        </div>
      )}

      {tab === 'kiosk' && data.kiosk && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>AR Attendance Kiosk Mode</h3>
          <p style={{ color: '#94a3b8' }}>{data.kiosk.instructions}</p>
          <button type="button" className="bg-gradient-btn" style={btnStyle} onClick={() => onOpenScanner?.()}>Launch Fullscreen Kiosk Scanner</button>
        </div>
      )}

      {tab === 'sla' && data.sla && (
        <div className="health-check-grid">
          <div className={`health-check-item ${data.sla.status === 'HEALTHY' ? 'green' : 'yellow'}`}>
            <div style={{ color: '#f8fafc', fontWeight: 600 }}>System Status</div>
            <div style={{ color: '#94a3b8' }}>{data.sla.status} — Uptime SLA {data.sla.uptime_sla}</div>
          </div>
          <div className="health-check-item green">
            <div style={{ color: '#f8fafc' }}>API Latency</div>
            <div style={{ color: '#94a3b8' }}>{data.sla.api_latency_ms}ms {data.sla.api_sla_met ? '✓' : '⚠'}</div>
          </div>
          <div className={`health-check-item ${data.sla.database === 'UP' ? 'green' : 'red'}`}>
            <div style={{ color: '#f8fafc' }}>Database</div>
            <div style={{ color: '#94a3b8' }}>{data.sla.database}</div>
          </div>
        </div>
      )}

      {tab === 'campus' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Multi-Campus SaaS View</h3>
          {(data.campuses || []).map((c) => (
            <div key={c.id} style={cardStyle}>
              <strong style={{ color: '#f8fafc' }}>{c.name}</strong>
              <span style={{ color: '#64748b', marginLeft: 8 }}>{c.slug} · {c.plan} · {c.students} students</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'sso' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>SSO — Google / Microsoft</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Login screen par Google SSO button add ho chuka hai. Microsoft ke liye Azure AD client ID configure karo.</p>
          <p style={{ color: '#64748b', fontSize: '0.75rem' }}>API: GET /sso/providers · POST /sso/login</p>
        </div>
      )}

      {tab === 'erp' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>ERP Inbound Sync</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Webhook: POST /enterprise/erp/webhook/sync</p>
          <button type="button" className="bg-gradient-btn" style={btnStyle} onClick={async () => {
            try {
              const r = await api('/erp/webhook/sync', { method: 'POST', body: JSON.stringify({ event: 'student_sync', payload: { students: [] } }) });
              setMsg(`ERP event processed: ${r.event}`);
            } catch (e) {
              setMsg(`Error: ${e.message}`);
            }
          }}>Test ERP Webhook</button>
          <p style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 8 }}>Export: Advanced Hub → ERP API Keys</p>
        </div>
      )}

      {tab === 'billing' && data.billing && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Subscription Billing Automation</h3>
          <p style={{ color: '#94a3b8' }}>Plan: <strong>{data.billing.subscription_plan}</strong> · {data.billing.message}</p>
          <p style={{ color: '#64748b' }}>Razorpay: {data.billing.razorpay_configured ? '✓ Configured' : 'Demo mode'} · Limit: {data.billing.student_limit} students</p>
        </div>
      )}

      {tab === 'whitelabel' && data.wl && (
        <div>
          <h3 style={{ color: '#f8fafc', marginBottom: 12 }}>White-label Customization</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: 16 }}>
            Customize your institution's mobile app branding, theme colors, and custom web domain.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', marginBottom: 4 }}>App / College Name</label>
              <input value={wlAppName} onChange={(e) => setWlAppName(e.target.value)} placeholder="e.g. ABC Institute" style={inputStyle} />
            </div>

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', marginBottom: 4 }}>Logo Image URL</label>
              <input value={wlLogoUrl} onChange={(e) => setWlLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" style={inputStyle} />
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', marginBottom: 4 }}>Primary Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="color" value={wlPrimaryColor.startsWith('#') && wlPrimaryColor.length === 7 ? wlPrimaryColor : '#00f2fe'} onChange={(e) => setWlPrimaryColor(e.target.value)} style={{ width: 40, height: 38, border: 'none', borderRadius: 4, background: 'none', cursor: 'pointer' }} />
                  <input value={wlPrimaryColor} onChange={(e) => setWlPrimaryColor(e.target.value)} placeholder="#00f2fe" style={inputStyle} />
                </div>
              </div>
              
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', marginBottom: 4 }}>Secondary Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="color" value={wlSecondaryColor.startsWith('#') && wlSecondaryColor.length === 7 ? wlSecondaryColor : '#4facfe'} onChange={(e) => setWlSecondaryColor(e.target.value)} style={{ width: 40, height: 38, border: 'none', borderRadius: 4, background: 'none', cursor: 'pointer' }} />
                  <input value={wlSecondaryColor} onChange={(e) => setWlSecondaryColor(e.target.value)} placeholder="#4facfe" style={inputStyle} />
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', marginBottom: 4 }}>Custom Web Domain</label>
              <input value={wlCustomDomain} onChange={(e) => setWlCustomDomain(e.target.value)} placeholder="e.g. attendance.mycollege.edu" style={inputStyle} />
            </div>

            <button type="button" className="bg-gradient-btn" style={{ ...btnStyle, marginTop: 8 }} onClick={async () => {
              try {
                await api('/white-label/config', {
                  method: 'POST',
                  body: JSON.stringify({
                    app_name: wlAppName,
                    logo_url: wlLogoUrl,
                    primary_color: wlPrimaryColor,
                    secondary_color: wlSecondaryColor,
                    custom_domain: wlCustomDomain
                  })
                });
                setMsg('Branding and customization settings updated successfully!');
                load();
              } catch (e) {
                setMsg(`Error: ${e.message}`);
              }
            }}>Save Customization</button>
          </div>
        </div>
      )}

      {tab === 'compliance' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Audit + Compliance Export</h3>
          <a href={`${apiBaseUrl}/enterprise/compliance/export`} download style={{ color: '#00f2fe' }}
            onClick={(e) => { e.preventDefault(); fetch(`${apiBaseUrl}/enterprise/compliance/export`, { headers: headers() }).then(r => r.blob()).then(b => {
              const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'compliance_audit.csv'; a.click();
            }); }}>
            <Download size={14} style={{ verticalAlign: 'middle' }} /> Download Tamper-proof CSV
          </a>
        </div>
      )}

      {tab === 'offline' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Offline-First Sync (Production)</h3>
          <p style={{ color: '#94a3b8' }}>Queued marks: <strong>{offlineQueueCount}</strong> — auto-sync when online.</p>
          <p style={{ color: '#64748b', fontSize: '0.75rem' }}>Manual attendance network fail par auto-queue hota hai.</p>
        </div>
      )}

      {tab === 'liveness' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Biometric Liveness 2.0</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Server-side blink challenge + anti-spoof validation on mark.</p>
          <button type="button" className="bg-gradient-btn" style={btnStyle} onClick={() => {
            localStorage.setItem('livenessBypass', 'false');
            setMsg('Liveness 2.0 enabled — blink required on next scan');
          }}>Enable Strict Liveness</button>
        </div>
      )}

      {tab === 'edge' && (
        <div>
          <h3 style={{ color: '#f8fafc' }}>Edge AI on Device</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>MediaPipe BlazeFace runs on phone — instant face lock box without server round-trip. Recognition still uses server SFace for accuracy.</p>
          <button type="button" className="bg-gradient-btn" style={btnStyle} onClick={() => onOpenScanner?.()}>Open Edge-Enhanced Scanner</button>
        </div>
      )}

      <button type="button" onClick={load} style={{ marginTop: 16, background: 'none', border: 'none', color: '#00f2fe', cursor: 'pointer' }}>
        <RefreshCw size={14} /> Refresh
      </button>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };
const btnStyle = { padding: '8px 16px', borderRadius: '8px', marginTop: 4 };
const cardStyle = { padding: '10px', marginTop: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.82rem' };
