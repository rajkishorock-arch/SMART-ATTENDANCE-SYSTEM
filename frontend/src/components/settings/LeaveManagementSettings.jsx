import { useState } from 'react';
import { 
  FileDown, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Calendar, 
  RefreshCw, 
  User, 
  GraduationCap,
  MessageSquare
} from 'lucide-react';
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

  const pendingCount = adminLeaveRequests.filter(r => (r.status || '').toLowerCase() === 'pending').length;
  const approvedCount = adminLeaveRequests.filter(r => (r.status || '').toLowerCase() === 'approved').length;
  const rejectedCount = adminLeaveRequests.filter(r => (r.status || '').toLowerCase() === 'rejected').length;
  const totalCount = adminLeaveRequests.length;

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

  const filteredLeaves = adminLeaveRequests.filter(req => {
    const st = (req.status || '').toLowerCase();
    if (leaveTabFilter === 'pending') return st === 'pending';
    if (leaveTabFilter === 'approved') return st === 'approved';
    if (leaveTabFilter === 'rejected') return st === 'rejected';
    return true;
  });

  return (
    <div 
      className="leave-management-container"
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '16px', 
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Top Header Card */}
      <div 
        style={{ 
          background: '#ffffff', 
          border: '1px solid #e4dfd5', 
          borderRadius: '16px', 
          padding: '16px 20px', 
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ minWidth: '220px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#25231f', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="#785927" />
            <span>Leave Management & History</span>
          </h3>
          <p style={{ color: '#696358', fontSize: '0.8rem', margin: '4px 0 0 0', fontWeight: 500 }}>
            Review, approve, or download certified PDF slips for student leaves.
          </p>
        </div>
        <button 
          type="button"
          onClick={() => {
            if (playCyberSound) playCyberSound('click');
            if (fetchAdminLeaves) fetchAdminLeaves();
          }}
          disabled={isFetchingLeaves}
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px', 
            borderRadius: '10px', 
            fontSize: '0.8rem',
            fontWeight: 600,
            background: '#faf9f6',
            border: '1px solid #cfc8ba',
            color: '#46423b',
            cursor: isFetchingLeaves ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <RefreshCw size={14} className={isFetchingLeaves ? 'spin-animation' : ''} />
          <span>{isFetchingLeaves ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Top 4 Metric Summary Cards in Horizontal Grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', 
          gap: '10px',
          width: '100%'
        }}
      >
        {/* Total */}
        <div 
          onClick={() => setLeaveTabFilter('all')}
          style={{
            background: leaveTabFilter === 'all' ? '#faf5ea' : '#ffffff',
            border: leaveTabFilter === 'all' ? '1.5px solid #916d30' : '1px solid #e4dfd5',
            borderRadius: '12px',
            padding: '12px 10px',
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#696358', letterSpacing: '0.04em' }}>
            Total
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#61471e', marginTop: '2px' }}>
            {totalCount}
          </div>
        </div>

        {/* Pending */}
        <div 
          onClick={() => setLeaveTabFilter('pending')}
          style={{
            background: leaveTabFilter === 'pending' ? '#fffbeb' : '#ffffff',
            border: leaveTabFilter === 'pending' ? '1.5px solid #f59e0b' : '1px solid #e4dfd5',
            borderRadius: '12px',
            padding: '12px 10px',
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#d97706', letterSpacing: '0.04em' }}>
            Pending
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
            {pendingCount}
          </div>
        </div>

        {/* Approved */}
        <div 
          onClick={() => setLeaveTabFilter('approved')}
          style={{
            background: leaveTabFilter === 'approved' ? '#ecfdf5' : '#ffffff',
            border: leaveTabFilter === 'approved' ? '1.5px solid #10b981' : '1px solid #e4dfd5',
            borderRadius: '12px',
            padding: '12px 10px',
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#059669', letterSpacing: '0.04em' }}>
            Approved
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#047857', marginTop: '2px' }}>
            {approvedCount}
          </div>
        </div>

        {/* Rejected */}
        <div 
          onClick={() => setLeaveTabFilter('rejected')}
          style={{
            background: leaveTabFilter === 'rejected' ? '#fef2f2' : '#ffffff',
            border: leaveTabFilter === 'rejected' ? '1.5px solid #ef4444' : '1px solid #e4dfd5',
            borderRadius: '12px',
            padding: '12px 10px',
            cursor: 'pointer',
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#dc2626', letterSpacing: '0.04em' }}>
            Rejected
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>
            {rejectedCount}
          </div>
        </div>
      </div>

      {/* Horizontal Segmented Pill Filter Bar */}
      <div 
        className="keep-horizontal"
        style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          flexWrap: 'nowrap', 
          overflowX: 'auto', 
          WebkitOverflowScrolling: 'touch',
          gap: '8px', 
          padding: '4px 2px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {[
          { id: 'all', label: 'All Requests', count: totalCount },
          { id: 'pending', label: 'Pending Review', count: pendingCount },
          { id: 'approved', label: 'Approved', count: approvedCount },
          { id: 'rejected', label: 'Rejected', count: rejectedCount }
        ].map(tab => {
          const isActive = leaveTabFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                setLeaveTabFilter(tab.id);
              }}
              style={{
                flex: '0 0 auto',
                width: 'auto',
                padding: '6px 14px',
                borderRadius: '24px',
                fontSize: '0.78rem',
                fontWeight: isActive ? 700 : 600,
                border: isActive ? '1px solid #916d30' : '1px solid #e4dfd5',
                background: isActive ? '#faf5ea' : '#ffffff',
                color: isActive ? '#684c20' : '#696358',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 1px 3px rgba(59, 130, 246, 0.12)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span 
                style={{
                  padding: '1px 7px',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                  background: isActive ? '#785927' : '#f4f1eb',
                  color: isActive ? '#ffffff' : '#696358',
                  fontWeight: 700
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Leave Records List */}
      {isFetchingLeaves ? (
        <div style={{ textAlign: 'center', color: '#696358', padding: '36px 16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e4dfd5' }}>
          <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 8px', color: '#785927' }} />
          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>Loading leave requests & history...</p>
        </div>
      ) : adminLeaveRequests.length === 0 ? (
        <div style={{ padding: '36px 20px', textAlign: 'center', color: '#696358', background: '#ffffff', borderRadius: '16px', border: '1px solid #e4dfd5' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <CheckCircle2 size={26} />
          </div>
          <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: '#25231f' }}>No Leave Requests</h4>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#696358' }}>No student leave applications found in the records.</p>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div style={{ padding: '32px 20px', textAlign: 'center', color: '#696358', background: '#ffffff', borderRadius: '16px', border: '1px solid #e4dfd5' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>No requests found in this &quot;{leaveTabFilter}&quot; category.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredLeaves.map(req => {
            const isApproved = (req.status || '').toLowerCase() === 'approved';
            const isRejected = (req.status || '').toLowerCase() === 'rejected';
            const isPending = !isApproved && !isRejected;

            return (
              <div 
                key={req.id} 
                style={{ 
                  padding: '16px 18px', 
                  borderRadius: '14px', 
                  background: '#ffffff', 
                  border: isApproved ? '1px solid #bbf7d0' : isRejected ? '1px solid #fecaca' : '1px solid #fde68a', 
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '10px' 
                }}
              >
                {/* Header Row: Student Info & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: '#faf5ea',
                        color: '#785927',
                        border: '1px solid #dfcfaf',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        flexShrink: 0
                      }}
                    >
                      {(req.student_name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 800, color: '#25231f', margin: 0, fontSize: '0.95rem' }}>
                        {req.student_name}
                      </p>
                      <p style={{ color: '#696358', margin: '2px 0 0', fontSize: '0.78rem', fontWeight: 500 }}>
                        Roll: <strong>{req.student_roll || 'N/A'}</strong> · {req.student_dep || 'General'}
                      </p>
                    </div>
                  </div>

                  {/* Status Pill & PDF download button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                    <span 
                      style={{
                        padding: '4px 10px', 
                        borderRadius: '16px', 
                        fontSize: '0.74rem', 
                        fontWeight: 700, 
                        flexShrink: 0,
                        background: isApproved ? '#ecfdf5' : isRejected ? '#fef2f2' : '#fffbeb',
                        color: isApproved ? '#059669' : isRejected ? '#dc2626' : '#d97706',
                        border: `1px solid ${isApproved ? '#a7f3d0' : isRejected ? '#fecaca' : '#fde68a'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {isApproved && <CheckCircle2 size={12} />}
                      {isRejected && <XCircle size={12} />}
                      {isPending && <Clock size={12} />}
                      <span>{isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (playCyberSound) playCyberSound('click');
                        generateLeavePdf(req);
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '8px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        border: '1px solid #dfcfaf',
                        background: '#faf5ea',
                        color: '#684c20',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0
                      }}
                      title="Download PDF Leave Slip"
                    >
                      <FileDown size={13} /> 
                      <span className="hide-on-compact">PDF</span>
                    </button>
                  </div>
                </div>

                {/* Details Row: Dates & Leave Type */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#46423b', background: '#faf9f6', padding: '8px 12px', borderRadius: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} color="#785927" />
                    <strong>{req.start_date}</strong> → <strong>{req.end_date}</strong>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#696358' }}>
                    <GraduationCap size={13} />
                    {req.leave_type || 'Casual'} {req.subject_name ? `(${req.subject_name})` : ''}
                  </span>
                </div>

                {/* Reason Bubble */}
                {req.reason && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8rem', color: '#58534a', fontStyle: 'italic', paddingLeft: '4px' }}>
                    <MessageSquare size={13} color="#94a3b8" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span>&quot;{req.reason}&quot;</span>
                  </div>
                )}

                {/* Approval Action Buttons if Pending */}
                {isPending && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid #f4f1eb' }}>
                    <button
                      type="button"
                      style={{ 
                        flex: 1,
                        padding: '8px 14px', 
                        borderRadius: '8px', 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        background: '#10b981', 
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      onClick={() => handleReviewLeave(req.id, 'Approved')}
                    >
                      <CheckCircle2 size={14} /> Approve Leave
                    </button>
                    <button
                      type="button"
                      style={{ 
                        flex: 1,
                        padding: '8px 14px', 
                        borderRadius: '8px', 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        background: '#ffffff', 
                        color: '#dc2626', 
                        border: '1px solid #fecaca',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      onClick={() => handleReviewLeave(req.id, 'Rejected')}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
