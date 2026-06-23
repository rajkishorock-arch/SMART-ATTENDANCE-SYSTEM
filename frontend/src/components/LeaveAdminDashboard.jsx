
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Calendar, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://smart-attendance-system-1-mvwa.onrender.com/api/v1';

export default function LeaveAdminDashboard({ token, currentUser }) {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');

  const fetchLeaveRequests = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      // Teachers and admins see all requests for their institution
      const res = await fetch(`${API_BASE_URL}/leaves/teacher/${currentUser.details.id}?institution_id=${currentUser.institution_id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data);
      } else {
        setError('Failed to fetch leave requests.');
      }
    } catch (err) {
      setError('An error occurred while fetching leave requests.');
    } finally {
      setIsLoading(false);
    }
  }, [token, currentUser]);

  useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE_URL}/leaves/${id}?status=${status}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        fetchLeaveRequests(); // Re-fetch to show the updated status
      } else {
        setError('Failed to update leave request status.');
      }
    } catch (err) {
      setError('An error occurred while updating status.');
    }
  };
  
  const filteredRequests = leaveRequests.filter(req => filter === 'all' || req.status === filter);

  return (
    <div className="mobile-tab-panel" style={{ animation: 'fadeInUp 0.5s ease both' }}>
      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={22} />
            Leave Request Management
          </h3>
          <button onClick={fetchLeaveRequests} className="icon-button" disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
            <button className={`filter-btn ${filter === 'approved' ? 'active' : ''}`} onClick={() => setFilter('approved')}>Approved</button>
            <button className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`} onClick={() => setFilter('rejected')}>Rejected</button>
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
        </div>

        {isLoading ? (
          <p>Loading requests...</p>
        ) : filteredRequests.length === 0 ? (
          <p>No leave requests found for the selected filter.</p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => (
                  <tr key={req.id}>
                    <td>{req.student_name || `Student ID: ${req.student_id}`}</td>
                    <td>{new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}</td>
                    <td title={req.reason} style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.reason}</td>
                    <td><span className={`status-badge status-${req.status}`}>{req.status}</span></td>
                    <td>
                      {req.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="bg-gradient-btn success-btn" onClick={() => handleUpdateStatus(req.id, 'approved')}><CheckCircle2 size={16}/> Approve</button>
                          <button className="bg-gradient-btn danger-btn" onClick={() => handleUpdateStatus(req.id, 'rejected')}><XCircle size={16}/> Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
