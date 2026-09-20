import { useState, useEffect, useCallback } from 'react';
import { Calendar, Send, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { leaveApi } from '../api/leaveApi';

export default function LeaveManagement({ token, currentUser }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveRequests, setLeaveRequests] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_leave_requests');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLeaveRequests = useCallback(async (isCancelled = () => false) => {
    if (!token) return;
    if (leaveRequests.length === 0) setIsLoading(true);
    try {
      const res = await leaveApi.fetchMyLeaveRequests(token, currentUser?.details?.id);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        if (!isCancelled()) {
          setLeaveRequests(list);
          try {
            localStorage.setItem('cached_leave_requests', JSON.stringify(list));
          } catch { /* ignore fallback error */ }
        }
      } else {
        if (!isCancelled()) {
          setError('Failed to fetch leave requests.');
        }
      }
    } catch {
      if (!isCancelled()) {
        setError('An error occurred while fetching leave requests.');
      }
    } finally {
      if (!isCancelled()) {
        setIsLoading(false);
      }
    }
  }, [token, currentUser, leaveRequests.length]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        fetchLeaveRequests(() => ignore);
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchLeaveRequests]);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!startDate || !endDate || !reason) {
      setError('Please fill in all fields.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await leaveApi.createLeaveRequest(token, {
        student_id: currentUser.details.id,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        reason,
        institution_id: currentUser.institution_id,
      });
      if (res.ok) {
        setSuccess('Leave request submitted successfully!');
        setStartDate('');
        setEndDate('');
        setReason('');
        fetchLeaveRequests();
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to submit leave request.');
      }
    } catch {
      setError('An error occurred while submitting the request.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-500" />;
      case 'pending':
      default:
        return <Clock size={16} className="text-yellow-500" />;
    }
  };

  return (
    <div className="mobile-tab-panel" style={{ animation: 'fadeInUp 0.5s ease both' }}>
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={22} />
          Leave Management
        </h3>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Start Date</label>
              <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">End Date</label>
              <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Reason</label>
            <textarea className="form-input" value={reason} onChange={(e) => setReason(e.target.value)} rows="4" placeholder="Enter the reason for your leave..."></textarea>
          </div>
          <button type="submit" className="bg-gradient-btn" disabled={isLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Send size={16} />
            {isLoading ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>

        <div style={{ marginTop: '32px' }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>My Leave Requests</h4>
          {leaveRequests.length === 0 ? (
            <p>You have not submitted any leave requests yet.</p>
          ) : (
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((req) => (
                    <tr key={req.id}>
                      <td>{new Date(req.start_date).toLocaleDateString()}</td>
                      <td>{new Date(req.end_date).toLocaleDateString()}</td>
                      <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={req.reason}>{req.reason}</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getStatusIcon(req.status)}
                        <span style={{ textTransform: 'capitalize' }}>{req.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
