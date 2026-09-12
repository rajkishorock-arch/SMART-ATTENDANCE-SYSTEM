import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, CheckCircle2, Clock, UploadCloud, X, FileText, 
  HelpCircle, MessageSquare, Send, ShieldAlert, ChevronRight, XCircle
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

const DISPUTE_REASONS = [
  "Face recognition failure",
  "QR failure",
  "Network failure",
  "Device failure",
  "Teacher marked incorrectly",
  "Present but marked absent",
  "Absent but marked present",
  "Medical reason",
  "Official activity",
  "Technical problem",
  "Other"
];

export default function AttendanceDisputeModal({ 
  isOpen, 
  onClose, 
  token, 
  currentUser, 
  subjects = [], 
  prefillSession = null,
  playCyberSound = () => {} 
}) {
  const [activeView, setActiveView] = useState('new'); // 'new' | 'history'
  const [date, setDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [originalStatus, setOriginalStatus] = useState('Absent');
  const [requestedStatus, setRequestedStatus] = useState('Present');
  const [reason, setReason] = useState(DISPUTE_REASONS[0]);
  const [description, setDescription] = useState('');
  const [proofFile, setProofFile] = useState(null);
  
  const [myDisputes, setMyDisputes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Initialize or prefill from props
  useEffect(() => {
    if (prefillSession) {
      setDate(prefillSession.date || '');
      setSessionTime(prefillSession.time || '');
      setOriginalStatus(prefillSession.attendance || 'Absent');
      if (prefillSession.subject_id) {
        setSelectedSubjectId(String(prefillSession.subject_id));
      }
      setActiveView('new');
    } else if (!date) {
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      setDate(`${dd}/${mm}/${yyyy}`);
    }
  }, [prefillSession]);

  // Fetch student's past disputes
  const fetchMyDisputes = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/disputes/my-disputes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMyDisputes(data);
      }
    } catch (err) {
      console.error("Error fetching disputes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      fetchMyDisputes();
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, fetchMyDisputes]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Proof file must be smaller than 5MB.');
      return;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'pdf'].includes(ext)) {
      setErrorMsg('Only JPG, PNG, and PDF files are allowed.');
      return;
    }
    setErrorMsg('');
    setProofFile(file);
  };

  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    if (!date || !reason) {
      setErrorMsg('Please select a date and reason.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    playCyberSound('click');

    try {
      const formData = new FormData();
      formData.append('date', date.trim());
      if (sessionTime) formData.append('session_time', sessionTime.trim());
      if (selectedSubjectId) formData.append('subject_id', selectedSubjectId);
      formData.append('original_status', originalStatus);
      formData.append('requested_status', requestedStatus);
      formData.append('reason', reason);
      if (description) formData.append('description', description);
      if (proofFile) formData.append('proof', proofFile);

      const res = await fetch(`${API_BASE_URL}/disputes`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to submit dispute.');
      }

      setSuccessMsg(`Dispute #${data.id} submitted successfully! Your teacher will review it shortly.`);
      setDescription('');
      setProofFile(null);
      fetchMyDisputes();
      setActiveView('history');
      playCyberSound('success');
    } catch (err) {
      setErrorMsg(err.message || 'Error submitting dispute.');
      playCyberSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDispute = async (disputeId) => {
    if (!window.confirm("Are you sure you want to cancel this dispute?")) return;
    playCyberSound('click');
    try {
      const res = await fetch(`${API_BASE_URL}/disputes/${disputeId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setSuccessMsg(`Dispute #${disputeId} was cancelled.`);
        fetchMyDisputes();
      }
    } catch (err) {
      setErrorMsg('Failed to cancel dispute.');
    }
  };

  const handlePostComment = async (disputeId) => {
    if (!commentText.trim()) return;
    setIsPostingComment(true);
    try {
      const res = await fetch(`${API_BASE_URL}/disputes/${disputeId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: commentText.trim() })
      });
      if (res.ok) {
        setCommentText('');
        // Refresh dispute details
        const detRes = await fetch(`${API_BASE_URL}/disputes/${disputeId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (detRes.ok) {
          const updated = await detRes.json();
          setSelectedDispute(updated);
        }
        fetchMyDisputes();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPostingComment(false);
    }
  };

  if (!isOpen) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', icon: <CheckCircle2 size={13} />, label: 'Approved' };
      case 'REJECTED':
        return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', icon: <XCircle size={13} />, label: 'Rejected' };
      case 'UNDER_REVIEW':
        return { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', icon: <Clock size={13} />, label: 'Under Review' };
      case 'NEEDS_INFORMATION':
        return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: <HelpCircle size={13} />, label: 'Info Needed' };
      case 'CANCELLED':
        return { bg: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af', icon: <X size={13} />, label: 'Cancelled' };
      default:
        return { bg: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', icon: <Clock size={13} />, label: 'Submitted' };
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 7, 15, 0.85)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '750px',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '20px',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        background: 'linear-gradient(135deg, rgba(10, 14, 28, 0.95), rgba(15, 23, 42, 0.95))',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 242, 254, 0.15)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(139, 92, 246, 0.2))',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00f2fe'
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Attendance Correction & Disputes
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '2px 0 0 0' }}>
                Audited dispute workflow — submit corrections with supporting proof
              </p>
            </div>
          </div>
          <button
            onClick={() => { playCyberSound('click'); onClose(); }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px 0 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <button
            onClick={() => { setActiveView('new'); playCyberSound('click'); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeView === 'new' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
              color: activeView === 'new' ? '#00f2fe' : '#9ca3af',
              borderBottom: activeView === 'new' ? '2px solid #00f2fe' : 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Submit New Dispute
          </button>
          <button
            onClick={() => { setActiveView('history'); playCyberSound('click'); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeView === 'history' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
              color: activeView === 'history' ? '#00f2fe' : '#9ca3af',
              borderBottom: activeView === 'history' ? '2px solid #00f2fe' : 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            My Disputes
            {myDisputes.length > 0 && (
              <span style={{
                background: 'rgba(0, 242, 254, 0.2)',
                color: '#00f2fe',
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: '10px'
              }}>
                {myDisputes.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', flex: 1 }}>
          {errorMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.82rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '0.82rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          {activeView === 'new' ? (
            <form onSubmit={handleSubmitDispute} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Attendance Date (DD/MM/YYYY) *
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="e.g. 12/09/2026"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Session Time / Period
                  </label>
                  <input
                    type="text"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    placeholder="e.g. 10:00:00 AM"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Subject / Class
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#0d1322',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="">Select Subject (Optional)</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Current Recorded Status
                  </label>
                  <select
                    value={originalStatus}
                    onChange={(e) => setOriginalStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#0d1322',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Present">Present (Incorrect class)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Requested Correction *
                  </label>
                  <select
                    value={requestedStatus}
                    onChange={(e) => setRequestedStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#0d1322',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  >
                    <option value="Present">Mark as Present</option>
                    <option value="Late">Mark as Late (Attended)</option>
                    <option value="Excused">Mark as Excused Duty / Medical</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Dispute Reason Category *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#0d1322',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  >
                    {DISPUTE_REASONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                  Detailed Description & Evidence Notes
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain why this attendance should be corrected (e.g. camera failed to scan face, was present in classroom, medical certificate attached)..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Proof File Uploader */}
              <div>
                <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                  Supporting Proof (Optional, Max 5MB — JPG, PNG, PDF)
                </label>
                <div style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '2px dashed rgba(0, 242, 254, 0.25)',
                  background: 'rgba(0, 242, 254, 0.02)',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    id="dispute-proof-upload"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="dispute-proof-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <UploadCloud size={24} style={{ color: '#00f2fe' }} />
                    <span style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: 600 }}>
                      {proofFile ? proofFile.name : 'Click to select proof document or photo'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                      {proofFile ? `${(proofFile.size / 1024).toFixed(1)} KB` : 'Medical slip, duty slip, or classroom presence verification'}
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => { playCyberSound('click'); onClose(); }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#9ca3af',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)',
                    border: 'none',
                    color: '#090c15',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 0 20px rgba(0, 242, 254, 0.3)'
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  Loading dispute history...
                </div>
              ) : myDisputes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  No attendance disputes filed yet. You can dispute any absent class using the submission form.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {myDisputes.map(d => {
                    const badge = getStatusBadge(d.status);
                    return (
                      <div
                        key={d.id}
                        style={{
                          padding: '16px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00f2fe' }}>
                              #{d.id}
                            </span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
                              {d.date} {d.session_time ? `• ${d.session_time}` : ''}
                            </span>
                            {d.subject_name && (
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                ({d.subject_code} - {d.subject_name})
                              </span>
                            )}
                          </div>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            background: badge.bg,
                            color: badge.color,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {badge.icon} {badge.label}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#9ca3af' }}>
                          <div>
                            Reason: <strong style={{ color: '#f3f4f6' }}>{d.reason}</strong>
                          </div>
                          <div>
                            Correction: <span style={{ color: '#ef4444' }}>{d.original_status}</span> → <span style={{ color: '#10b981' }}>{d.requested_status}</span>
                          </div>
                        </div>

                        {d.description && (
                          <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0, fontStyle: 'italic' }}>
                            "{d.description}"
                          </p>
                        )}

                        {d.reviewer_comments && (
                          <div style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: 'rgba(0, 242, 254, 0.05)',
                            border: '1px solid rgba(0, 242, 254, 0.15)',
                            fontSize: '0.75rem',
                            color: '#94a3b8'
                          }}>
                            <strong style={{ color: '#00f2fe' }}>Reviewer ({d.reviewed_by}):</strong> {d.reviewer_comments}
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Submitted on {new Date(d.created_at).toLocaleDateString()}
                          </span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {d.has_proof && (
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`${API_BASE_URL}/disputes/${d.id}/proof`, {
                                      headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if (res.ok) {
                                      const blob = await res.blob();
                                      const url = window.URL.createObjectURL(blob);
                                      window.open(url, '_blank');
                                    }
                                  } catch (e) {
                                    alert('Could not download proof document.');
                                  }
                                }}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 255, 255, 0.06)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  color: '#00f2fe',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <FileText size={12} /> View Proof
                              </button>
                            )}
                            {['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION'].includes(d.status) && (
                              <button
                                onClick={() => handleCancelDispute(d.id)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.2)',
                                  color: '#ef4444',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Cancel Dispute
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
