import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { generateLeavePdf } from '../../utils/leavePdfGenerator';
import { leaveApi } from '../../api/leaveApi.js';

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
    <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>📋 Leave Management & History</h3>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '4px' }}>Review, approve, or download PDF certificates for student leave records.</p>
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
              border: leaveTabFilter === tab.id ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
              background: leaveTabFilter === tab.id ? '#eff6ff' : '#f8fafc',
              color: leaveTabFilter === tab.id ? '#1d4ed8' : '#64748b',
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
              background: leaveTabFilter === tab.id ? '#1d4ed8' : '#e2e8f0',
              color: leaveTabFilter === tab.id ? '#ffffff' : '#64748b',
              fontWeight: 700
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {isFetchingLeaves ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>Loading leave requests & history...</div>
      ) : adminLeaveRequests.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
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
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              No records match the selected filter category ({leaveTabFilter}).
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredLeaves.map(req => (
              <div key={req.id} style={{ padding: '20px 24px', borderRadius: '14px', background: '#ffffff', border: `1px solid ${req.status === 'Approved' ? '#a7f3d0' : req.status === 'Rejected' ? '#fecaca' : '#fde68a'}`, boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: '1rem' }}>{req.student_name}</p>
                    <p style={{ color: '#64748b', margin: '2px 0 0', fontSize: '0.8rem' }}>Roll: {req.student_roll} · {req.student_dep}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      padding: '4px 14px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
                      background: req.status === 'Approved' ? '#ecfdf5' : req.status === 'Rejected' ? '#fef2f2' : '#fffbeb',
                      color: req.status === 'Approved' ? '#059669' : req.status === 'Rejected' ? '#dc2626' : '#d97706',
                      border: `1px solid ${req.status === 'Approved' ? '#a7f3d0' : req.status === 'Rejected' ? '#fecaca' : '#fde68a'}`
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
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        border: '1px solid #bfdbfe',
                        background: '#eff6ff',
                        color: '#1d4ed8',
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
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem', color: '#334155' }}>
                  <span>📅 <strong>{req.start_date}</strong> → <strong>{req.end_date}</strong></span>
                  <span>🏷️ {req.leave_type} {req.subject_name ? `(${req.subject_name} - ${req.subject_code})` : ' (General)'}</span>
                </div>
                <p style={{ color: '#475569', fontSize: '0.82rem', margin: 0, fontStyle: 'italic' }}>"{req.reason}"</p>
                {req.status === 'Pending' && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, background: 'linear-gradient(135deg, #10b981, #059669)' }}
                      onClick={() => handleReviewLeave(req.id, 'Approved')}
                    >✅ Approve</button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '8px 20px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
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
