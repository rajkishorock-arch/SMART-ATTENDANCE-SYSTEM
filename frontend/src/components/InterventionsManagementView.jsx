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
      // 1. Fetch summary
      const sumRes = await fetch(`${API_BASE_URL}/interventions/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sumRes.ok) {
        setSummary(await sumRes.json());
      }

      // 2. Fetch list
      const url = tierFilter === 'ALL'
        ? `${API_BASE_URL}/interventions`
        : `${API_BASE_URL}/interventions?tier=${tierFilter}`;
      const listRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (listRes.ok) {
        setInterventions(await listRes.json());
      }
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
      padding: '24px',
      maxWidth: '1280px',
      margin: '0 auto',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Header */}
      <div className="surface-card" style={{
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '8px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertOctagon size={22} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
              Counselor & Parent Intervention Center
            </h2>
          </div>
          <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem', maxWidth: '750px' }}>
            Proactive multi-tier attendance escalation: Academic warnings (70-75%), automated parent communication (60-70%), and debarment prevention counseling (&lt;60%).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { playCyberSound('click'); fetchData(); }}
            disabled={isLoading}
            className="btn-secondary"
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => { playCyberSound('click'); handleRunEvaluation(); }}
            disabled={isScanning}
            className="btn-primary"
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              cursor: isScanning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: '#dc2626'
            }}
          >
            <ShieldAlert size={16} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'Scanning...' : 'Scan Campus Attendance'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem'
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tier KPI Counters */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div className="surface-card" style={{
            background: '#ffffff',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '18px',
            boxShadow: 'var(--shadow-card)'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
              Tier 3: Debarment Risk (&lt;60%)
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626', marginTop: '6px' }}>
              {summary.tier3_debarment_risk_count}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Mandatory HOD intervention</span>
          </div>

          <div className="surface-card" style={{
            background: '#ffffff',
            border: '1px solid #fed7aa',
            borderRadius: '12px',
            padding: '18px',
            boxShadow: 'var(--shadow-card)'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
              Tier 2: Parent Alert (60-70%)
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ea580c', marginTop: '6px' }}>
              {summary.tier2_parent_alert_count}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Parent notification required</span>
          </div>

          <div className="surface-card" style={{
            background: '#ffffff',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '18px',
            boxShadow: 'var(--shadow-card)'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
              Tier 1: Warning (70-75%)
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#d97706', marginTop: '6px' }}>
              {summary.tier1_warning_count}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Near cutoff boundary</span>
          </div>

          <div className="surface-card" style={{
            background: '#ffffff',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            padding: '18px',
            boxShadow: 'var(--shadow-card)'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
              Resolved Cases
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
              {summary.resolved_count}
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Recovered attendance</span>
          </div>
        </div>
      )}

      {/* Tier Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px',
        overflowX: 'auto'
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
              color: tierFilter === tab.key ? 'var(--color-primary)' : '#475569',
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
          color: '#64748b'
        }}>
          <CheckCircle2 size={40} color="#059669" style={{ opacity: 0.8, marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 6px 0', color: '#0f172a', fontSize: '1.1rem', fontWeight: 700 }}>
            No Active Interventions Found
          </h4>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
            All students are currently meeting the 75% attendance threshold. Click "Scan Campus Attendance" to re-evaluate.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '18px'
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
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                        {item.student_name}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
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
                      background: item.status === 'RESOLVED' ? '#ecfdf5' : '#f1f5f9',
                      border: item.status === 'RESOLVED' ? '1px solid #a7f3d0' : '1px solid #cbd5e1',
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      color: item.status === 'RESOLVED' ? '#059669' : '#475569',
                      fontWeight: 600
                    }}>
                      Status: {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Counselor & Meeting Details */}
                  {item.counselor_name && (
                    <div style={{
                      background: '#f8fafc',
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
                        <div style={{ color: '#475569' }}>
                          📅 Meeting: {item.meeting_date}
                        </div>
                      )}
                    </div>
                  )}

                  {item.notes && (
                    <p style={{ margin: '0 0 14px 0', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
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
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>Schedule Counseling Meeting</h3>
            <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.85rem' }}>
              Student: <strong>{meetingModalItem.student_name}</strong> ({meetingModalItem.student_roll}) • {meetingModalItem.attendance_percentage}%
            </p>

            <form onSubmit={handleScheduleMeeting}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '6px', fontWeight: 600 }}>
                  Meeting Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                  style={{
                    width: '100%', background: '#ffffff',
                    border: '1px solid var(--border-strong)', color: '#0f172a',
                    padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '6px', fontWeight: 600 }}>
                  Counselor Notes / Agenda
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Discuss medical leave, arrange remedial sessions for mechanics"
                  value={meetingNotes}
                  onChange={e => setMeetingNotes(e.target.value)}
                  style={{
                    width: '100%', background: '#ffffff',
                    border: '1px solid var(--border-strong)', color: '#0f172a',
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
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>Resolve Intervention</h3>
            <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.85rem' }}>
              Student: <strong>{resolveModalItem.student_name}</strong> ({resolveModalItem.student_roll})
            </p>

            <form onSubmit={handleResolve}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '6px', fontWeight: 600 }}>
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
                    border: '1px solid var(--border-strong)', color: '#0f172a',
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
