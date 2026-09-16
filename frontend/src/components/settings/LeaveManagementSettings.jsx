import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { generateLeavePdf } from '../../utils/leavePdfGenerator';
import { getApiBaseUrl } from '../../utils/platform';
import { leaveApi } from '../../api';

export default function LeaveManagementSettings({
  token,
  playCyberSound,
  adminLeaveRequests = [],
  isFetchingLeaves,
  fetchAdminLeaves
}) {
  const [leaveTabFilter, setLeaveTabFilter] = useState('all');

  const handleReviewLeave = async (reqId, status) => {
    try {
      const res = await leaveApi.reviewLeaveRequest(token, reqId, { status });
      if (res.ok) {
        if (fetchAdminLeaves) fetchAdminLeaves();
        if (playCyberSound) playCyberSound(status === 'Approved' ? 'success' : 'error');
      }
    } catch (err) {
      console.error('Error reviewing leave request:', err);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>📋 Leave Management & History</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.82rem', marginTop: '4px' }}>Review, approve, or download PDF certificates for student leave records.</p>
        </div>
        <button className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.82rem' }} onClick={fetchAdminLeaves}>
          🔄 Refresh
        </button>
      </div>

      {/* Filter Tabs & History Section */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'all', label: 'All Requests', count: adminLeaveRequests.length },
          { id: 'pending', label: 'Pending Requests', count: adminLeaveRequests.filter(r => (r.status || '').toLowerCase() === 'pending').length },
          { id: 'approved', label: 'Approved History', count: adminLeaveRequests.filter(r => (r.status || '').toLowerCase() === 'approved').length },
          { id: 'rejected', label: 'Rejected History', count: adminLeaveRequests.filter(r => (r.status || '').toLowerCase() === 'rejected').length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (playCyberSound) playCyberSound('click');
              setLeaveTabFilter(tab.id);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: leaveTabFilter === tab.id ? 700 : 500,
              border: leaveTabFilter === tab.id ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.1)',
              background: leaveTabFilter === tab.id ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
              color: leaveTabFilter === tab.id ? '#38bdf8' : '#9ca3af',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
            <span style={{
              padding: '1px 7px',
              borderRadius: '10px',
              fontSize: '0.72rem',
              background: leaveTabFilter === tab.id ? '#38bdf8' : 'rgba(255,255,255,0.1)',
              color: leaveTabFilter === tab.id ? '#0f172a' : '#cbd5e1',
              fontWeight: 700
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {isFetchingLeaves ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>Loading leave requests & history...</div>
      ) : adminLeaveRequests.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
          No leave requests found for your institution.
        </div>
      ) : (() => {
        const filteredLeaves = adminLeaveRequests.filter(req => {
          const st = (req.status || '').toLowerCase();
          if (leaveTabFilter === 'pending') return st === 'pending';
          if (leaveTabFilter === 'approved') return st === 'approved';
          if (leaveTabFilter === 'rejected') return st === 'rejected';
          return true;
        });

        if (filteredLeaves.length === 0) {
          return (
            <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: '#9ca3af' }}>
              No records match the selected filter category ({leaveTabFilter}).
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredLeaves.map(req => (
              <div key={req.id} className="glass-panel" style={{ padding: '20px 24px', borderRadius: '14px', border: `1px solid ${req.status === 'Approved' ? 'rgba(16,185,129,0.15)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.2)'}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <p style={{ fontWeight: 700, color: '#f3f4f6', margin: 0, fontSize: '1rem' }}>{req.student_name}</p>
                    <p style={{ color: '#9ca3af', margin: '2px 0 0', fontSize: '0.8rem' }}>Roll: {req.student_roll} · {req.student_dep}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      padding: '4px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
                      background: req.status === 'Approved' ? 'rgba(16,185,129,0.12)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                      color: req.status === 'Approved' ? '#10b981' : req.status === 'Rejected' ? '#ef4444' : '#f59e0b',
                      border: `1px solid ${req.status === 'Approved' ? 'rgba(16,185,129,0.3)' : req.status === 'Rejected' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                    }}>
                      {req.status === 'Approved' ? '✅ Approved' : req.status === 'Rejected' ? '❌ Rejected' : '⏳ Pending'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (playCyberSound) playCyberSound('click');
                        generateLeavePdf(req);
                      }}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        background: 'rgba(56, 189, 248, 0.12)',
                        color: '#38bdf8',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Download Official PDF Leave Slip"
                    >
                      <FileDown size={14} /> Download PDF
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem', color: '#d1d5db' }}>
                  <span>📅 <strong>{req.start_date}</strong> → <strong>{req.end_date}</strong></span>
                  <span>🏷️ {req.leave_type} {req.subject_name ? `(${req.subject_name} - ${req.subject_code})` : ' (General)'}</span>
                </div>
                <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0, fontStyle: 'italic' }}>"{req.reason}"</p>
                {req.status === 'Pending' && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, background: 'linear-gradient(135deg, #10b981, #059669)' }}
                      onClick={() => handleReviewLeave(req.id, 'Approved')}
                    >✅ Approve</button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                      onClick={() => handleReviewLeave(req.id, 'Rejected')}
                    >❌ Reject</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
