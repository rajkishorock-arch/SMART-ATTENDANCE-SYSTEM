import { useState } from 'react';
import { generateLeavePdf } from '../utils/leavePdfGenerator';
import { leaveApi } from '../api/leaveApi';

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
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('apply')}
          style={{
            padding: '6px 14px',
            borderRadius: '10px',
            border: activeSubTab === 'apply' ? '1px solid #fdba74' : '1px solid #e2e8f0',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeSubTab === 'apply' ? '#fff7ed' : '#f8fafc',
            color: activeSubTab === 'apply' ? '#c2410c' : '#64748b',
            transition: 'all 0.15s'
          }}
        >
          📝 Apply Leave
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          style={{
            padding: '6px 14px',
            borderRadius: '10px',
            border: activeSubTab === 'history' ? '1px solid #bae6fd' : '1px solid #e2e8f0',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: activeSubTab === 'history' ? '#f0f9ff' : '#f8fafc',
            color: activeSubTab === 'history' ? '#0369a1' : '#64748b',
            transition: 'all 0.15s'
          }}
        >
          📜 My Leave History
          {studentLeaveRequests.length > 0 && (
            <span style={{ background: '#0284c7', color: '#ffffff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
              {studentLeaveRequests.length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'apply' ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>From Date</label>
              <input 
                type="date" 
                value={form.start_date} 
                onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                style={{ 
                  width: '100%', 
                  padding: '9px 12px', 
                  borderRadius: '10px', 
                  background: '#ffffff', 
                  border: '1.5px solid #e2e8f0', 
                  color: '#0f172a', 
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  boxSizing: 'border-box' 
                }} 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>To Date</label>
              <input 
                type="date" 
                value={form.end_date} 
                onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                style={{ 
                  width: '100%', 
                  padding: '9px 12px', 
                  borderRadius: '10px', 
                  background: '#ffffff', 
                  border: '1.5px solid #e2e8f0', 
                  color: '#0f172a', 
                  fontSize: '0.84rem',
                  fontWeight: 500,
                  boxSizing: 'border-box' 
                }} 
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Subject (Optional)</label>
            <select 
              value={form.subject_id} 
              onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}
              style={{ 
                width: '100%', 
                padding: '9px 12px', 
                borderRadius: '10px', 
                background: '#ffffff', 
                border: '1.5px solid #e2e8f0', 
                color: '#0f172a', 
                fontSize: '0.84rem',
                fontWeight: 500,
                boxSizing: 'border-box' 
              }}
            >
              <option value="">Personal / General Leave (All Subjects)</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Leave Type</label>
            <select 
              value={form.leave_type} 
              onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))}
              style={{ 
                width: '100%', 
                padding: '9px 12px', 
                borderRadius: '10px', 
                background: '#ffffff', 
                border: '1.5px solid #e2e8f0', 
                color: '#0f172a', 
                fontSize: '0.84rem',
                fontWeight: 500,
                boxSizing: 'border-box' 
              }}
            >
              <option>Medical</option>
              <option>Personal</option>
              <option>Official</option>
              <option>Family Emergency</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Reason</label>
            <textarea 
              value={form.reason} 
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} 
              rows={3}
              placeholder="Briefly explain your reason for leave..."
              style={{ 
                width: '100%', 
                padding: '9px 12px', 
                borderRadius: '10px', 
                background: '#ffffff', 
                border: '1.5px solid #e2e8f0', 
                color: '#0f172a', 
                fontSize: '0.84rem', 
                resize: 'vertical', 
                boxSizing: 'border-box' 
              }} 
            />
          </div>
          {msg && (
            <p style={{ fontSize: '0.82rem', fontWeight: 700, margin: 0, color: msg.type === 'success' ? '#059669' : '#dc2626' }}>{msg.text}</p>
          )}
          <button 
            type="submit" 
            disabled={submitting}
            style={{ 
              padding: '11px', 
              borderRadius: '10px', 
              border: 'none', 
              fontWeight: 700, 
              fontSize: '0.86rem', 
              cursor: submitting ? 'not-allowed' : 'pointer', 
              background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #f97316, #ea580c)', 
              color: '#ffffff', 
              boxShadow: submitting ? 'none' : '0 2px 6px rgba(249, 115, 22, 0.25)',
              transition: 'all 0.2s' 
            }}
          >
            {submitting ? '⏳ Submitting...' : '📩 Submit Leave Request'}
          </button>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
          {studentLeaveRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 10px', color: '#64748b', fontSize: '0.84rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              No leave applications submitted yet.
            </div>
          ) : (
            studentLeaveRequests.map((req) => {
              const st = (req.status || 'Pending').toLowerCase();
              const isApproved = st === 'approved';
              const isRejected = st === 'rejected';
              return (
                <div key={req.id} style={{ padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                      {req.leave_type || 'Leave Request'} #{req.id}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: isApproved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7',
                      color: isApproved ? '#15803d' : isRejected ? '#b91c1c' : '#b45309',
                      border: `1px solid ${isApproved ? '#bbf7d0' : isRejected ? '#fecaca' : '#fde68a'}`
                    }}>
                      {st.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', gap: '10px', flexWrap: 'wrap', fontWeight: 500 }}>
                    <span>📅 {req.start_date} → {req.end_date}</span>
                    <span>📚 {req.subject_name || 'General (All Subjects)'}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#334155', fontStyle: 'italic', background: '#ffffff', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '6px' }}>
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
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: '1px solid #bfdbfe',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '0.76rem',
                      fontWeight: 700,
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
