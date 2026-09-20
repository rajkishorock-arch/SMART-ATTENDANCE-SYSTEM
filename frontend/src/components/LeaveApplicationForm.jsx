import { useState } from 'react';
import { generateLeavePdf } from '../utils/leavePdfGenerator';
import { leaveApi } from '../api/leaveApi.js';

// =====================================================================
// LEAVE APPLICATION FORM - Used on student dashboard
// =====================================================================
export default function LeaveApplicationForm({
  token,
  onLeaveApplied,
  playCyberSound,
  subjects = [],
  studentLeaveRequests = []
}) {
  const [activeSubTab, setActiveSubTab] = useState('apply'); // 'apply' | 'history'
  const [form, setForm] = useState({ start_date: '', end_date: '', leave_type: 'Medical', reason: '', subject_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date || !form.reason.trim()) {
      setMsg({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await leaveApi.submitStudentLeaveRequest(token, {
        ...form,
        subject_id: form.subject_id ? parseInt(form.subject_id, 10) : null
      });
      if (res.ok) {
        setMsg({ type: 'success', text: '✅ Leave request submitted successfully!' });
        setForm({ start_date: '', end_date: '', leave_type: 'Medical', reason: '', subject_id: '' });
        if (playCyberSound) playCyberSound('success');
        if (onLeaveApplied) onLeaveApplied();
        setActiveSubTab('history');
      } else {
        let errText = 'Failed to submit leave request.';
        try {
          const err = await res.json();
          if (err.detail) {
            errText = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
          }
        } catch { /* ignore fallback error */ }
        setMsg({ type: 'error', text: errText });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network connection or server error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Sub Tabs: Apply vs History */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('apply')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeSubTab === 'apply' ? 'rgba(251,146,60,0.2)' : 'transparent',
            color: activeSubTab === 'apply' ? '#fb923c' : '#9ca3af'
          }}
        >
          📝 Apply Leave
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeSubTab === 'history' ? 'rgba(14,165,233,0.2)' : 'transparent',
            color: activeSubTab === 'history' ? '#38bdf8' : '#9ca3af'
          }}
        >
          📜 My Leave History
          {studentLeaveRequests.length > 0 && (
            <span style={{ background: '#0ea5e9', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px' }}>
              {studentLeaveRequests.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'apply' ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>From Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f4f6', fontSize: '0.82rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>To Date</label>
              <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f4f6', fontSize: '0.82rem' }} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Subject (Optional)</label>
            <select value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(30,30,45,0.98)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f4f6', fontSize: '0.82rem' }}>
              <option value="">Personal / General Leave (All Subjects)</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Leave Type</label>
            <select value={form.leave_type} onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(30,30,45,0.98)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f4f6', fontSize: '0.82rem' }}>
              <option>Medical</option>
              <option>Personal</option>
              <option>Official</option>
              <option>Family Emergency</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Reason</label>
            <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={3}
              placeholder="Briefly explain your reason for leave..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3f4f6', fontSize: '0.82rem', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
          {msg && (
            <p style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0, color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>{msg.text}</p>
          )}
          <button type="submit" disabled={submitting}
            style={{ padding: '10px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: submitting ? 'not-allowed' : 'pointer', background: submitting ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #fb923c, #f97316)', color: submitting ? '#9ca3af' : 'white', transition: 'all 0.2s' }}>
            {submitting ? '⏳ Submitting...' : '📩 Submit Leave Request'}
          </button>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
          {studentLeaveRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 10px', color: '#9ca3af', fontSize: '0.82rem' }}>
              No leave applications submitted yet.
            </div>
          ) : (
            studentLeaveRequests.map((req) => {
              const st = (req.status || 'Pending').toLowerCase();
              const isApproved = st === 'approved';
              const isRejected = st === 'rejected';
              return (
                <div key={req.id} style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f3f4f6' }}>
                      {req.leave_type || 'Leave Request'} #{req.id}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: isApproved ? 'rgba(16,185,129,0.15)' : isRejected ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: isApproved ? '#34d399' : isRejected ? '#f87171' : '#fbbf24',
                      border: `1px solid ${isApproved ? 'rgba(16,185,129,0.3)' : isRejected ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                    }}>
                      {st.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#9ca3af', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span>📅 {req.start_date} → {req.end_date}</span>
                    <span>📚 {req.subject_name || 'General (All Subjects)'}</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#cbd5e1', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '6px' }}>
                    "{req.reason}"
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (playCyberSound) playCyberSound('click');
                      generateLeavePdf(req);
                    }}
                    style={{
                      alignSelf: 'flex-end',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid rgba(14,165,233,0.3)',
                      background: 'rgba(14,165,233,0.12)',
                      color: '#38bdf8',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginTop: '4px'
                    }}
                  >
                    📄 Download Official PDF
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
