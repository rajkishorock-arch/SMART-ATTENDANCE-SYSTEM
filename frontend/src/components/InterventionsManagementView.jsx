import './campusAdmin.css';
import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Bell, Calendar,
  CheckCircle2, RefreshCw, ShieldAlert, ChevronRight, UserCheck
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

const DEMO_INTERVENTIONS = [
  {
    id: 1,
    student_name: 'Aditya Rao',
    student_roll: '2023ME04',
    department: 'Mechanical Engineering',
    attendance_percentage: 54.5,
    tier: 'DEBARMENT_RISK',
    status: 'PENDING',
    counselor_name: 'Dr. Anil Mehta',
    meeting_date: '2026-12-02 10:30',
    notes: 'Missed 6 consecutive morning labs.'
  },
  {
    id: 2,
    student_name: 'Riya Gupta',
    student_roll: '2023CSE08',
    department: 'Computer Science',
    attendance_percentage: 63.6,
    tier: 'PARENT_ALERT',
    status: 'PARENT_NOTIFIED',
    counselor_name: null,
    meeting_date: null,
    notes: ''
  },
  {
    id: 3,
    student_name: 'Kabir Verma',
    student_roll: '2023ECE01',
    department: 'ECE',
    attendance_percentage: 73.2,
    tier: 'WARNING',
    status: 'PENDING',
    counselor_name: null,
    meeting_date: null,
    notes: ''
  }
];

export default function InterventionsManagementView({
  token,
  currentUser,
  isDemoMode = false,
  playCyberSound = () => {},
  routeView: propRouteView,
  setRouteView: propSetRouteView
}) {
  const [localRouteView, setLocalRouteView] = useState(null);
  const routeView = propSetRouteView !== undefined ? propRouteView : localRouteView;
  const setRouteView = propSetRouteView !== undefined ? propSetRouteView : setLocalRouteView;

  const [interventions, setInterventions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tierFilter, setTierFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Detail control states
  const [activeControlTab, setActiveControlTab] = useState(null); // null | 'meeting' | 'resolve'
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [isSubmittingMeeting, setIsSubmittingMeeting] = useState(false);

  const [resolveNotes, setResolveNotes] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  const isSandbox = isDemoMode || token === 'guest-demo-token';

  const fetchData = useCallback(async () => {
    if (!token) return;
    if (isSandbox) {
      const filtered = tierFilter === 'ALL'
        ? DEMO_INTERVENTIONS
        : DEMO_INTERVENTIONS.filter(i => i.tier === tierFilter);
      setInterventions(filtered);
      setSummary({
        tier3_debarment_risk_count: DEMO_INTERVENTIONS.filter(i => i.tier === 'DEBARMENT_RISK').length,
        tier2_parent_alert_count: DEMO_INTERVENTIONS.filter(i => i.tier === 'PARENT_ALERT').length,
        tier1_warning_count: DEMO_INTERVENTIONS.filter(i => i.tier === 'WARNING').length,
        total_interventions: DEMO_INTERVENTIONS.length
      });
      setErrorMsg('');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const query = tierFilter === 'ALL' ? '' : `?tier=${encodeURIComponent(tierFilter)}`;
      const [summaryResponse, listResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/interventions/summary`, { headers }),
        fetch(`${API_BASE_URL}/interventions${query}`, { headers })
      ]);
      if (!summaryResponse.ok || !listResponse.ok) throw new Error('Could not refresh interventions.');
      const [totals, rows] = await Promise.all([summaryResponse.json(), listResponse.json()]);
      setSummary(totals);
      setInterventions(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch interventions data.');
    } finally {
      setIsLoading(false);
    }
  }, [token, tierFilter, isSandbox]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) await fetchData();
    };
    run();
    return () => { ignore = true; };
  }, [fetchData]);

  const handleRunEvaluation = async () => {
    if (isSandbox) {
      playCyberSound('success');
      setSuccessMsg('Sandbox preview: campus shortage scan evaluated across 154 students.');
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }
    setIsScanning(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/interventions/evaluate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Evaluation scan failed.');
      const data = await res.json();
      playCyberSound('success');
      setSuccessMsg(data.message || 'Campus scan completed.');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleNotifyParent = async (item) => {
    if (isSandbox) {
      playCyberSound('success');
      setSuccessMsg(`Sandbox preview: Parent alert queued for ${item.student_name}.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }
    setIsNotifying(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/interventions/${item.id}/notify-parent`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Parent notification dispatch failed.');
      playCyberSound('success');
      setSuccessMsg(`Parent alert dispatched for ${item.student_name}!`);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsNotifying(false);
    }
  };

  const handleScheduleMeeting = async (e, item) => {
    e.preventDefault();
    if (!meetingDate) {
      setErrorMsg('Please specify a meeting date and time.');
      return;
    }
    if (isSandbox) {
      playCyberSound('success');
      setSuccessMsg(`Sandbox preview: Counseling scheduled for ${item.student_name}.`);
      setActiveControlTab(null);
      setMeetingDate('');
      setMeetingNotes('');
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }
    setIsSubmittingMeeting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/interventions/${item.id}/assign-counselor`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          counselor_id: currentUser?.id || 1,
          meeting_date: meetingDate,
          notes: meetingNotes
        })
      });
      if (!res.ok) throw new Error('Failed to schedule meeting.');
      playCyberSound('success');
      setSuccessMsg(`Counseling session scheduled for ${item.student_name}.`);
      setActiveControlTab(null);
      setMeetingDate('');
      setMeetingNotes('');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsSubmittingMeeting(false);
    }
  };

  const handleResolve = async (e, item) => {
    e.preventDefault();
    if (!resolveNotes.trim()) {
      setErrorMsg('Resolution note is required.');
      return;
    }
    if (isSandbox) {
      playCyberSound('success');
      setSuccessMsg(`Sandbox preview: Intervention resolved for ${item.student_name}.`);
      setActiveControlTab(null);
      setResolveNotes('');
      setTimeout(() => setSuccessMsg(''), 4000);
      return;
    }
    setIsSubmittingResolve(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/interventions/${item.id}/resolve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: resolveNotes.trim() })
      });
      if (!res.ok) throw new Error('Failed to resolve intervention.');
      playCyberSound('success');
      setSuccessMsg(`Intervention for ${item.student_name} marked as RESOLVED.`);
      setActiveControlTab(null);
      setResolveNotes('');
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const getTierStyle = (tier) => {
    if (tier === 'DEBARMENT_RISK') return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Debarment Risk' };
    if (tier === 'PARENT_ALERT') return { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', label: 'Parent Alert' };
    return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Warning' };
  };

  // ── DEDICATED DETAIL + CONTROL SUBPAGE ─────────────────────────────────────
  if (routeView?.mode === 'detail') {
    const activeItem =
      interventions.find(i => String(i.id) === String(routeView.id)) ||
      routeView.item ||
      (isSandbox ? DEMO_INTERVENTIONS.find(i => String(i.id) === String(routeView.id)) : null) ||
      null;

    if (!activeItem) {
      return (
        <div className="golden-os-page-bottom-safe">
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <ShieldAlert size={36} color="#916d30" style={{ opacity: 0.45, marginBottom: '10px' }} />
              <div style={{ fontWeight: 700, color: '#25231f', marginBottom: '8px' }}>Intervention case not found</div>
              <button type="button" className="golden-os-action-pill" onClick={() => setRouteView(null)}>
                Back to Interventions
              </button>
            </div>
          </div>
        </div>
      );
    }

    const tierStyle = getTierStyle(activeItem.tier);
    const isResolved = activeItem.status === 'RESOLVED';

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

            {/* Case Header Card */}
            <div className="golden-os-inset-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#25231f' }}>{activeItem.student_name}</div>
                <div style={{ fontSize: '0.8rem', color: '#696358' }}>
                  Roll: {activeItem.student_roll} • {activeItem.department}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  background: tierStyle.bg,
                  border: `1px solid ${tierStyle.border}`,
                  color: tierStyle.color,
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '999px'
                }}>
                  {activeItem.attendance_percentage}% • {tierStyle.label}
                </span>
                <span style={{
                  background: isResolved ? '#ecfdf5' : '#f4f1eb',
                  border: `1px solid ${isResolved ? '#a7f3d0' : '#cfc8ba'}`,
                  color: isResolved ? '#059669' : '#58534a',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '999px'
                }}>
                  {activeItem.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Case Details */}
            <div className="golden-os-list-shell">
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Assigned Counselor</span>
                <strong style={{ color: '#25231f', fontSize: '0.85rem' }}>
                  {activeItem.counselor_name || 'Unassigned'}
                </strong>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ color: '#58534a', fontSize: '0.84rem' }}>Scheduled Meeting</span>
                <strong style={{ color: '#25231f', fontSize: '0.85rem' }}>
                  {activeItem.meeting_date || 'Not scheduled'}
                </strong>
              </div>
              {activeItem.notes && (
                <div className="golden-os-list-row" style={{ cursor: 'default', alignItems: 'flex-start', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: '#58534a', fontSize: '0.78rem', fontWeight: 700 }}>Case Notes</span>
                  <span style={{ color: '#25231f', fontSize: '0.84rem' }}>{activeItem.notes}</span>
                </div>
              )}
            </div>

            {/* Controls System */}
            {!isResolved && (
              <div className="golden-os-form-section">
                <div className="golden-os-form-section-title">Intervention Controls</div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={isNotifying}
                    onClick={() => handleNotifyParent(activeItem)}
                    className="golden-os-feedback-filter-btn"
                  >
                    <Bell size={14} />
                    <span>{isNotifying ? 'Notifying...' : 'Notify Parent'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playCyberSound('click');
                      setActiveControlTab(prev => (prev === 'meeting' ? null : 'meeting'));
                    }}
                    className={`golden-os-feedback-filter-btn ${activeControlTab === 'meeting' ? 'active' : ''}`}
                  >
                    <Calendar size={14} />
                    <span>Schedule Counseling</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playCyberSound('click');
                      setActiveControlTab(prev => (prev === 'resolve' ? null : 'resolve'));
                    }}
                    className={`golden-os-feedback-filter-btn ${activeControlTab === 'resolve' ? 'active' : ''}`}
                  >
                    <CheckCircle2 size={14} />
                    <span>Resolve Case</span>
                  </button>
                </div>

                {activeControlTab === 'meeting' && (
                  <form onSubmit={(e) => handleScheduleMeeting(e, activeItem)} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #ece7dc' }}>
                    <div>
                      <label className="golden-os-field-label">Meeting Date & Time *</label>
                      <input
                        type="datetime-local"
                        required
                        className="golden-os-input"
                        value={meetingDate}
                        onChange={e => setMeetingDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="golden-os-field-label">Counselor Notes / Agenda</label>
                      <textarea
                        rows={3}
                        className="golden-os-input"
                        placeholder="e.g. Discuss medical leave, arrange remedial sessions"
                        value={meetingNotes}
                        onChange={e => setMeetingNotes(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button type="button" className="golden-os-feedback-filter-btn" onClick={() => setActiveControlTab(null)}>
                        Cancel
                      </button>
                      <button type="submit" disabled={isSubmittingMeeting} className="golden-os-action-pill">
                        {isSubmittingMeeting ? 'Saving...' : 'Confirm Meeting'}
                      </button>
                    </div>
                  </form>
                )}

                {activeControlTab === 'resolve' && (
                  <form onSubmit={(e) => handleResolve(e, activeItem)} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #ece7dc' }}>
                    <div>
                      <label className="golden-os-field-label">Resolution Summary *</label>
                      <textarea
                        rows={3}
                        required
                        className="golden-os-input"
                        placeholder="e.g. Approved medical leave certificates verified; makeup labs scheduled."
                        value={resolveNotes}
                        onChange={e => setResolveNotes(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button type="button" className="golden-os-feedback-filter-btn" onClick={() => setActiveControlTab(null)}>
                        Cancel
                      </button>
                      <button type="submit" disabled={isSubmittingResolve} className="golden-os-action-pill">
                        {isSubmittingResolve ? 'Resolving...' : 'Confirm Resolution'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN SCREEN: CLEAN GOLDEN GATE MASTER LIST ─────────────────────────────
  return (
    <div className="golden-os-page-bottom-safe">
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Compact Status + Primary Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {summary ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', fontWeight: 700, color: '#58534a' }}>
                <span style={{ color: '#dc2626' }}>{summary.tier3_debarment_risk_count} Critical</span>
                <span style={{ color: '#ea580c' }}>• {summary.tier2_parent_alert_count} Parent Alert</span>
                <span style={{ color: '#d97706' }}>• {summary.tier1_warning_count} Warning</span>
                <span>• {summary.total_interventions} Total</span>
              </div>
            ) : <div />}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => { playCyberSound('click'); fetchData(); }}
                disabled={isLoading}
                className="golden-os-feedback-filter-btn"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              <button
                type="button"
                onClick={() => { playCyberSound('click'); handleRunEvaluation(); }}
                disabled={isScanning}
                className="golden-os-action-pill"
              >
                <ShieldAlert size={14} className={isScanning ? 'animate-spin' : ''} />
                <span>{isScanning ? 'Scanning...' : 'Scan Campus'}</span>
              </button>
            </div>
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

          {/* Tier Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { key: 'ALL', label: 'All Cases' },
              { key: 'DEBARMENT_RISK', label: 'Critical (<60%)' },
              { key: 'PARENT_ALERT', label: 'Parent Alert (60-70%)' },
              { key: 'WARNING', label: 'Warning (70-75%)' }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { playCyberSound('click'); setTierFilter(tab.key); }}
                className={`golden-os-feedback-filter-btn ${tierFilter === tab.key ? 'active' : ''}`}
                style={{ whiteSpace: 'nowrap' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Clean Case Rows */}
          <div className="golden-os-list-shell">
            {interventions.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#696358' }}>
                <CheckCircle2 size={34} color="#059669" style={{ opacity: 0.7, marginBottom: '10px' }} />
                <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#25231f' }}>No Active Interventions</div>
              </div>
            ) : (
              interventions.map(item => {
                const tierStyle = getTierStyle(item.tier);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      playCyberSound('click');
                      setActiveControlTab(null);
                      setErrorMsg('');
                      setRouteView({ mode: 'detail', id: String(item.id), item });
                    }}
                    className="golden-os-list-row"
                    style={{ width: '100%', background: 'transparent', borderLeft: 'none', borderRight: 'none', borderTop: 'none', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div className="golden-os-avatar" style={{
                        background: tierStyle.bg,
                        color: tierStyle.color,
                        borderColor: tierStyle.border,
                        flexShrink: 0
                      }}>
                        <UserCheck size={16} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.student_name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#696358', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.student_roll} • {item.department}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{
                        background: tierStyle.bg,
                        border: `1px solid ${tierStyle.border}`,
                        color: tierStyle.color,
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '999px'
                      }}>
                        {item.attendance_percentage}%
                      </span>
                      <ChevronRight size={16} color="#9c9384" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
