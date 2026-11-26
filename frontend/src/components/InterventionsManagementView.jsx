import './campusAdmin.css';
import { useState, useEffect, useCallback } from 'react';
import {
  AlertOctagon, AlertTriangle, Bell, Calendar,
  CheckCircle2, RefreshCw, ShieldAlert,
  X
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

export default function InterventionsManagementView({
  token,
  currentUser,
  playCyberSound = () => {}
}) {
  const [interventions, setInterventions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tierFilter, setTierFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Meeting Schedule Modal
  const [meetingModalItem, setMeetingModalItem] = useState(null);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [isSubmittingMeeting, setIsSubmittingMeeting] = useState(false);

  // Resolve Modal
  const [resolveModalItem, setResolveModalItem] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  // Loading map for parent notify actions { [id]: boolean }
  const [notifyingIds, setNotifyingIds] = useState({});

  const fetchData = useCallback(async () => {
    if (!token) return;
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
      setInterventions(rows);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch interventions data.');
    } finally {
      setIsLoading(false);
    }
  }, [token, tierFilter]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchData();
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [fetchData]);

  // ── Run Automated Campus Evaluation Scan ──────────────────────────────────
  const handleRunEvaluation = async () => {
    setIsScanning(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/interventions/evaluate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
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

  // ── Dispatch Parent Notification ──────────────────────────────────────────
  const handleNotifyParent = async (item) => {
    setNotifyingIds(prev => ({ ...prev, [item.id]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/interventions/${item.id}/notify-parent`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
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
      setNotifyingIds(prev => ({ ...prev, [item.id]: false }));
    }
  };

  // ── Schedule Counselor Meeting ────────────────────────────────────────────
  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    if (!meetingDate) {
      setErrorMsg('Please specify a meeting date and time.');
      return;
    }
    setIsSubmittingMeeting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/interventions/${meetingModalItem.id}/assign-counselor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
      setSuccessMsg(`Counseling session scheduled for ${meetingModalItem.student_name}.`);
      setMeetingModalItem(null);
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

  // ── Resolve Intervention ───────────────────────────────────────────────────
  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolveNotes.trim()) {
      setErrorMsg('Resolution note is required.');
      return;
    }
    setIsSubmittingResolve(true);
    try {
      const res = await fetch(`${API_BASE_URL}/interventions/${resolveModalItem.id}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: resolveNotes.trim() })
      });
      if (!res.ok) throw new Error('Failed to resolve intervention.');
      playCyberSound('success');
      setSuccessMsg(`Intervention for ${resolveModalItem.student_name} marked as RESOLVED.`);
      setResolveModalItem(null);
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

  return (
    <div className="interventions-container" style={{
      color: 'var(--color-text-main)',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div className="campus-actions">
          <button
            type="button"
            onClick={() => { playCyberSound('click'); fetchData(); }}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => { playCyberSound('click'); handleRunEvaluation(); }}
            disabled={isScanning}
          >
            <ShieldAlert size={15} className={isScanning ? 'animate-spin' : ''} />
            <span>{isScanning ? 'Scanning...' : 'Scan Campus Attendance'}</span>
          </button>
      </div>

      {/* Messages */}
      {successMsg && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#059669',
          padding: '10px 14px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '10px 14px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tier KPI Counters (Horizontal Responsive 4-card Grid) */}
      {summary && (
        <div className="campus-metrics">
          <div style={{
            background: '#ffffff',
            border: '1px solid #e4dfd5',
            borderLeft: '4px solid #dc2626',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <span style={{ fontSize: '0.68rem', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>
              Debarment (&lt;60%)
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
              {summary.tier3_debarment_risk_count}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#696358' }}>HOD intervention</span>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e4dfd5',
            borderLeft: '4px solid #ea580c',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <span style={{ fontSize: '0.68rem', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>
              Parent Alert (60-70%)
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ea580c', marginTop: '2px' }}>
              {summary.tier2_parent_alert_count}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#696358' }}>Notify guardians</span>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e4dfd5',
            borderLeft: '4px solid #d97706',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <span style={{ fontSize: '0.68rem', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>
              Warning (70-75%)
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
              {summary.tier1_warning_count}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#696358' }}>Near-cutoff boundary</span>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #e4dfd5',
            borderLeft: '4px solid #785927',
            borderRadius: '12px',
            padding: '10px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}>
            <span style={{ fontSize: '0.68rem', color: '#785927', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800 }}>
              Total cases
            </span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#785927', marginTop: '2px' }}>
              {summary.total_interventions}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#696358' }}>Active student logs</span>
          </div>
        </div>
      )}

      {/* Tier Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        borderBottom: '1px solid #e4dfd5',
        paddingBottom: '8px',
        marginBottom: '16px',
        overflowX: 'auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {[
          { key: 'ALL', label: 'All Cases' },
          { key: 'DEBARMENT_RISK', label: 'Critical (<60%)' },
          { key: 'PARENT_ALERT', label: 'Parent Alert (60-70%)' },
          { key: 'WARNING', label: 'Warning (70-75%)' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { playCyberSound('click'); setTierFilter(tab.key); }}
            style={{
              background: tierFilter === tab.key ? 'var(--color-primary-light)' : '#ffffff',
              border: tierFilter === tab.key ? '1px solid rgba(30, 64, 175, 0.25)' : '1px solid var(--border-subtle)',
              color: tierFilter === tab.key ? 'var(--color-primary)' : '#58534a',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Interventions List */}
      {interventions.length === 0 ? (
        <div className="surface-card" style={{
          background: '#ffffff',
          border: '1px dashed var(--border-strong)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          color: '#696358'
        }}>
          <CheckCircle2 size={40} color="#059669" style={{ opacity: 0.8, marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 6px 0', color: '#25231f', fontSize: '1.1rem', fontWeight: 700 }}>
            No Active Interventions Found
          </h4>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#58534a' }}>
            All students are currently meeting the 75% attendance threshold. Click "Scan Campus Attendance" to re-evaluate.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '14px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {interventions.map(item => {
            const isCritical = item.tier === 'DEBARMENT_RISK';
            const isOrange = item.tier === 'PARENT_ALERT';
            const badgeColor = isCritical ? '#dc2626' : (isOrange ? '#ea580c' : '#d97706');
            const badgeBg = isCritical ? '#fef2f2' : (isOrange ? '#fff7ed' : '#fffbeb');
            const badgeBorder = isCritical ? '#fecaca' : (isOrange ? '#fed7aa' : '#fde68a');
            const isNotifying = notifyingIds[item.id];

            return (
              <div
                key={item.id}
                className="surface-card"
                style={{
                  background: '#ffffff',
                  border: `1px solid ${badgeBorder}`,
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Top */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 700, color: '#25231f' }}>
                        {item.student_name}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: '#696358' }}>
                        Roll: {item.student_roll} • {item.department}
                      </span>
                    </div>

                    <span style={{
                      background: badgeBg,
                      border: `1px solid ${badgeBorder}`,
                      color: badgeColor,
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '8px'
                    }}>
                      {item.attendance_percentage}%
                    </span>
                  </div>

                  {/* Tier & Status Badges */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <span style={{
                      background: badgeBg,
                      border: `1px solid ${badgeBorder}`,
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      color: badgeColor,
                      fontWeight: 700
                    }}>
                      {item.tier.replace('_', ' ')}
                    </span>

                    <span style={{
                      background: item.status === 'RESOLVED' ? '#ecfdf5' : '#f4f1eb',
                      border: item.status === 'RESOLVED' ? '1px solid #a7f3d0' : '1px solid #cfc8ba',
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      color: item.status === 'RESOLVED' ? '#059669' : '#58534a',
                      fontWeight: 600
                    }}>
                      Status: {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Counselor & Meeting Details */}
                  {item.counselor_name && (
                    <div style={{
                      background: '#faf9f6',
                      border: '1px solid var(--border-subtle)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      marginBottom: '14px',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ color: 'var(--color-primary)', fontWeight: 600, marginBottom: '2px' }}>
                        Counselor: {item.counselor_name}
                      </div>
                      {item.meeting_date && (
                        <div style={{ color: '#58534a' }}>
                          📅 Meeting: {item.meeting_date}
                        </div>
                      )}
                    </div>
                  )}

                  {item.notes && (
                    <p style={{ margin: '0 0 14px 0', fontSize: '0.8rem', color: '#696358', fontStyle: 'italic' }}>
                      "{item.notes}"
                    </p>
                  )}
                </div>

                {/* Card Action Buttons */}
                {item.status !== 'RESOLVED' && (
                  <div style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '14px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px'
                  }}>
                    {/* Notify Parent Button */}
                    <button
                      disabled={isNotifying}
                      onClick={() => handleNotifyParent(item)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        color: '#ea580c',
                        padding: '8px 4px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: isNotifying ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Bell size={13} />
                      Notify Parent
                    </button>

                    {/* Schedule Meeting Button */}
                    <button
                      onClick={() => {
                        playCyberSound('click');
                        setMeetingModalItem(item);
                        setMeetingDate('');
                        setMeetingNotes('');
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--color-primary)',
                        padding: '8px 4px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Calendar size={13} />
                      Counseling
                    </button>

                    {/* Resolve Button */}
                    <button
                      onClick={() => {
                        playCyberSound('click');
                        setResolveModalItem(item);
                        setResolveNotes('');
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        color: '#059669',
                        padding: '8px 4px',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCircle2 size={13} />
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: SCHEDULE COUNSELING MEETING */}
      {meetingModalItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="surface-card" style={{
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%', maxWidth: '480px',
            padding: '28px', position: 'relative',
            boxShadow: 'var(--shadow-modal)'
          }}>
            <button
              onClick={() => setMeetingModalItem(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#696358', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#25231f', fontWeight: 700 }}>Schedule Counseling Meeting</h3>
            <p style={{ margin: '0 0 16px 0', color: '#58534a', fontSize: '0.85rem' }}>
              Student: <strong>{meetingModalItem.student_name}</strong> ({meetingModalItem.student_roll}) • {meetingModalItem.attendance_percentage}%
            </p>

            <form onSubmit={handleScheduleMeeting}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#46423b', marginBottom: '6px', fontWeight: 600 }}>
                  Meeting Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                  style={{
                    width: '100%', background: '#ffffff',
                    border: '1px solid var(--border-strong)', color: '#25231f',
                    padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#46423b', marginBottom: '6px', fontWeight: 600 }}>
                  Counselor Notes / Agenda
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Discuss medical leave, arrange remedial sessions for mechanics"
                  value={meetingNotes}
                  onChange={e => setMeetingNotes(e.target.value)}
                  style={{
                    width: '100%', background: '#ffffff',
                    border: '1px solid var(--border-strong)', color: '#25231f',
                    padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMeetingModalItem(null)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMeeting}
                  className="btn-primary"
                  style={{ padding: '8px 18px', borderRadius: '8px', fontWeight: 700, cursor: isSubmittingMeeting ? 'not-allowed' : 'pointer' }}
                >
                  Confirm Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVE INTERVENTION */}
      {resolveModalItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="surface-card" style={{
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%', maxWidth: '480px',
            padding: '28px', position: 'relative',
            boxShadow: 'var(--shadow-modal)'
          }}>
            <button
              onClick={() => setResolveModalItem(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#696358', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#25231f', fontWeight: 700 }}>Resolve Intervention</h3>
            <p style={{ margin: '0 0 16px 0', color: '#58534a', fontSize: '0.85rem' }}>
              Student: <strong>{resolveModalItem.student_name}</strong> ({resolveModalItem.student_roll})
            </p>

            <form onSubmit={handleResolve}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#46423b', marginBottom: '6px', fontWeight: 600 }}>
                  Resolution Summary *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Student submitted approved medical certificates; makeup labs completed."
                  value={resolveNotes}
                  onChange={e => setResolveNotes(e.target.value)}
                  style={{
                    width: '100%', background: '#ffffff',
                    border: '1px solid var(--border-strong)', color: '#25231f',
                    padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem', resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setResolveModalItem(null)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolve}
                  className="btn-primary"
                  style={{ padding: '8px 18px', borderRadius: '8px', fontWeight: 700, cursor: isSubmittingResolve ? 'not-allowed' : 'pointer' }}
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
