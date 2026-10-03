import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, UserCheck, Calendar, Clock, AlertTriangle, ArrowRight, MessageSquare, Send, CheckCircle2, RefreshCw } from 'lucide-react';
import { interventionApi } from '../../api/interventionApi';

export default function StudentAttendanceRecoveryWidget({ token, currentUser, playCyberSound = () => {} }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Counselor request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await interventionApi.getMyStatus(token);
      setData(res);
    } catch (err) {
      console.error('Error fetching intervention status:', err);
      setError('Unable to load intervention analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [currentUser, token]);

  const handleRequestCounselor = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await interventionApi.requestCounselor(token, {
        reason: requestReason.trim() || 'Student requested attendance recovery counseling.',
        preferred_date: preferredDate || null,
      });
      playCyberSound('success');
      setRequestSuccess(res.message || 'Counselor meeting requested successfully.');
      setTimeout(() => {
        setShowRequestModal(false);
        setRequestSuccess('');
        setRequestReason('');
        setPreferredDate('');
        fetchStatus();
      }, 2000);
    } catch (err) {
      console.error('Error requesting counselor:', err);
      alert(err.message || 'Failed to submit counselor request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748b' }}>
          <RefreshCw size={18} className="animate-spin" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Syncing attendance compliance & recovery plan...</span>
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  const isLowAttendance = data.has_intervention || data.attendance_percentage < 75;
  const isCritical = data.tier === 'DEBARMENT_RISK' || data.attendance_percentage < 60;

  const badgeColor = isCritical ? '#ef4444' : isLowAttendance ? '#f59e0b' : '#10b981';
  const badgeBg = isCritical ? '#fef2f2' : isLowAttendance ? '#fffbeb' : '#f0fdf4';
  const badgeBorder = isCritical ? '#fecaca' : isLowAttendance ? '#fde68a' : '#bbf7d0';

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: `1px solid ${isLowAttendance ? badgeBorder : '#e2e8f0'}`,
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      animation: 'fadeInUp 0.4s ease'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: badgeBg,
            border: `1px solid ${badgeBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: badgeColor,
            flexShrink: 0
          }}>
            {isLowAttendance ? <ShieldAlert size={26} /> : <ShieldCheck size={26} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {isLowAttendance ? 'Attendance Intervention & Recovery Plan' : 'Academic Attendance Compliance & Status'}
              </h3>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
                background: badgeBg,
                color: badgeColor,
                border: `1px solid ${badgeBorder}`,
                letterSpacing: '0.04em'
              }}>
                {data.tier.replace('_', ' ')}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0' }}>
              University 75% regulatory compliance tracker & institutional intervention workflow
            </p>
          </div>
        </div>

        <button
          onClick={() => { playCyberSound('click'); fetchStatus(); }}
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.8rem',
            color: '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600
          }}
          title="Refresh intervention status"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
      }}>
        {/* Attendance Rate */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Current Attendance</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: badgeColor }}>{data.attendance_percentage}%</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>({data.attended_classes} / {data.total_classes} lectures)</span>
          </div>
        </div>

        {/* Required Consecutive Classes OR Safe Buffer */}
        {isLowAttendance ? (
          <div style={{ background: isCritical ? '#fef2f2' : '#fffbeb', padding: '16px', borderRadius: '12px', border: `1px solid ${badgeBorder}` }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: badgeColor, display: 'block', marginBottom: '6px' }}>Recovery Requirement</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: badgeColor }}>+{data.needed_classes_to_75}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>consecutive classes to reach 75%</span>
            </div>
          </div>
        ) : (
          <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', display: 'block', marginBottom: '6px' }}>Safe Leave Buffer</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981' }}>{data.buffer_classes_above_75}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>classes can be missed safely</span>
            </div>
          </div>
        )}

        {/* Assigned Counselor / Mentor */}
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Department Mentor</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={18} style={{ color: '#3b82f6' }} />
            <div>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', display: 'block' }}>
                {data.counselor_name || 'Academic Counselor Desk'}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {data.counselor_email || 'Assigned per department'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Plan & Bylaws Advice */}
      {data.action_plan && data.action_plan.length > 0 && (
        <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '18px 20px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '10px' }}>
            📋 Institutional Guidance & Recovery Directives:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.action_plan.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.86rem', color: '#334155', lineHeight: '1.45' }}>
                <span style={{ color: badgeColor, fontWeight: 800, marginTop: '2px' }}>•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Counselor Meeting Scheduled / Request Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
        {data.meeting_date ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', fontSize: '0.88rem', fontWeight: 600 }}>
            <Calendar size={18} />
            <span>Scheduled Meeting: <strong>{data.meeting_date}</strong></span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85rem' }}>
            <Clock size={16} />
            <span>Status: <strong style={{ color: '#0f172a' }}>{data.status.replace(/_/g, ' ')}</strong></span>
          </div>
        )}

        <button
          onClick={() => { playCyberSound('click'); setShowRequestModal(true); }}
          style={{
            background: isLowAttendance ? 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' : '#ffffff',
            border: isLowAttendance ? 'none' : '1px solid #cbd5e1',
            color: isLowAttendance ? '#ffffff' : '#334155',
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: isLowAttendance ? '0 4px 12px rgba(30, 64, 175, 0.2)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <MessageSquare size={16} />
          <span>{data.status === 'COUNSELOR_REQUESTED' ? 'Update Counselor Request' : 'Request Counselor Guidance'}</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Counselor Request Modal */}
      {showRequestModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '18px',
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            animation: 'fadeInUp 0.3s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '10px', background: '#eff6ff', color: '#1e40af' }}>
                  <UserCheck size={22} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Request Academic Counseling
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    Direct notification to your department faculty mentor
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {requestSuccess ? (
              <div style={{ padding: '24px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', textAlign: 'center' }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px' }} />
                <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#065f46' }}>Request Sent!</h5>
                <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#047857' }}>{requestSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleRequestCounselor} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Reason / Academic Concerns:
                  </label>
                  <textarea
                    rows={4}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="e.g. Discuss medical leave certificate makeup, assignment backlog, or recovery timetable..."
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Preferred Meeting Date / Slot (Optional):
                  </label>
                  <input
                    type="text"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    placeholder="e.g. Tomorrow afternoon (2-4 PM) or During free period"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Send Request'}
                    <Send size={15} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
