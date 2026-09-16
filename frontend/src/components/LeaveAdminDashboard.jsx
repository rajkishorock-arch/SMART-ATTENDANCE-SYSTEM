import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Calendar, RefreshCw, Download, FileText } from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';
import { generateLeavePdf } from '../utils/leavePdfGenerator';
import { leaveApi } from '../api';

const API_BASE_URL = getApiBaseUrl();

export default function LeaveAdminDashboard({ token, currentUser }) {
  const [leaveRequests, setLeaveRequests] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_leave_admin_requests');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchLeaveRequests = useCallback(async () => {
    if (!token) return;
    if (leaveRequests.length === 0) setIsLoading(true);
    setError('');
    try {
      const res = await leaveApi.fetchAllLeaveRequests(token);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setLeaveRequests(list);
        try {
          localStorage.setItem('cached_leave_admin_requests', JSON.stringify(list));
        } catch {}
      } else {
        setError('Failed to fetch leave requests.');
      }
    } catch {
      setError('An error occurred while fetching leave requests.');
    } finally {
      setIsLoading(false);
    }
  }, [token, leaveRequests.length]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await leaveApi.reviewLeaveRequest(token, id, { status });
      if (res.ok) {
        fetchLeaveRequests();
      } else {
        setError('Failed to update leave request status.');
      }
    } catch {
      setError('An error occurred while updating status.');
    }
  };
  
  const filteredRequests = leaveRequests.filter(req => {
    if (filter === 'all') return true;
    return (req.status || 'Pending').toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className="mobile-tab-panel" style={{ animation: 'fadeInUp 0.5s ease both' }}>
      <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="#38bdf8" />
            Institutional Leave Requests Management
          </h3>
          <button 
            onClick={fetchLeaveRequests} 
            className="btn-ghost" 
            disabled={isLoading}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.82rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}
        
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'approved', 'rejected'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textTransform: 'capitalize',
                background: filter === f ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.03)',
                color: filter === f ? '#38bdf8' : '#9ca3af',
                border: `1px solid ${filter === f ? 'rgba(14,165,233,0.4)' : 'rgba(255,255,255,0.06)'}`
              }}
            >
              {f} ({f === 'all' ? leaveRequests.length : leaveRequests.filter(r => (r.status || 'Pending').toLowerCase() === f).length})
            </button>
          ))}
        </div>

        {isLoading ? (
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Loading leave requests...</p>
        ) : filteredRequests.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No leave requests found for the selected filter.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredRequests.map((req) => {
              const st = (req.status || 'Pending').toLowerCase();
              const isApproved = st === 'approved';
              const isRejected = st === 'rejected';
              const isPending = !isApproved && !isRejected;

              return (
                <div 
                  key={req.id} 
                  style={{ 
                    padding: '14px 16px', 
                    borderRadius: '12px', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '34px', height: '34px', borderRadius: '50%',
                        background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.85rem'
                      }}>
                        {req.student_name ? req.student_name.charAt(0).toUpperCase() : 'S'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
                          {req.student_name || 'Student'} <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 400 }}>(Roll: {req.student_roll || 'N/A'} · {req.student_dep || 'N/A'})</span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#9ca3af' }}>
                          {req.leave_type || 'Leave'} · 📅 {req.start_date} → {req.end_date}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: isApproved ? 'rgba(16,185,129,0.15)' : isRejected ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                      color: isApproved ? '#34d399' : isRejected ? '#f87171' : '#fbbf24',
                      border: `1px solid ${isApproved ? 'rgba(16,185,129,0.3)' : isRejected ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                    }}>
                      {(req.status || 'Pending').toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px' }}>
                    "{req.reason}"
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Subject: {req.subject_name || 'General Leave (All Subjects)'}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => generateLeavePdf(req)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(14,165,233,0.3)',
                          background: 'rgba(14,165,233,0.12)',
                          color: '#38bdf8',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Download size={12} />
                        <span>PDF Slip</span>
                      </button>

                      {isPending && (
                        <>
                          <button 
                            type="button"
                            onClick={() => handleUpdateStatus(req.id, 'Approved')}
                            style={{
                              padding: '5px 12px', borderRadius: '6px', border: 'none',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: 'white', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <CheckCircle2 size={12} /> Approve
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                            style={{
                              padding: '5px 12px', borderRadius: '6px', border: 'none',
                              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                              color: 'white', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
