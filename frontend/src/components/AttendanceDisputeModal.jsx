import { useState, useEffect, useCallback } from 'react';
import { 
  AlertCircle, CheckCircle2, Clock, UploadCloud, X, FileText, 
  HelpCircle, ShieldAlert, XCircle
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';
import { generateDisputePdf } from '../utils/disputePdfGenerator';
import { disputeApi } from '../api';

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
  playCyberSound = () => {},
  API_BASE_URL: customApiBaseUrl
}) {
  const resolveApiUrl = () => {
    let url = customApiBaseUrl || API_BASE_URL || getApiBaseUrl();
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:')) {
      url = url.replace('http:', 'https:');
    }
    return url.replace(/\/+$/, '');
  };
  const activeApiUrl = resolveApiUrl();

  const [activeView, setActiveView] = useState('new'); // 'new' | 'history'
  const [date, setDate] = useState(''); // Stores YYYY-MM-DD for <input type="date" />
  const [sessionTime, setSessionTime] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [originalStatus, setOriginalStatus] = useState('Absent');
  const [requestedStatus, setRequestedStatus] = useState('Present');
  const [reason, setReason] = useState(DISPUTE_REASONS[0]);
  const [description, setDescription] = useState('');
  const [proofFile, setProofFile] = useState(null);
  
  const [myDisputes, setMyDisputes] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_my_disputes');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
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
      let d = prefillSession.date || '';
      if (d.includes('/')) {
        const parts = d.split('/');
        if (parts.length === 3) {
          d = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      setDate(d);
      setSessionTime(prefillSession.time || prefillSession.period_label || '');
      setOriginalStatus(prefillSession.attendance || 'Absent');
      if (prefillSession.subject_id) {
        setSelectedSubjectId(String(prefillSession.subject_id));
      }
      setActiveView('new');
    } else if (!date) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    }
  }, [prefillSession]);

  // Fetch student's past disputes
  const fetchMyDisputes = useCallback(async () => {
    if (!token) return;
    if (myDisputes.length === 0) setIsLoading(true);
    try {
      const res = await disputeApi.fetchMyDisputes(token);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setMyDisputes(list);
        try {
          localStorage.setItem('cached_my_disputes', JSON.stringify(list));
        } catch { /* ignore fallback error */ }
      }
    } catch (err) {
      console.error("Error fetching disputes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token, activeApiUrl, myDisputes.length]);

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
    if (typeof playCyberSound === 'function') playCyberSound('click');

    try {
      let formattedDate = date.trim();
      if (formattedDate.includes('-')) {
        const parts = formattedDate.split('-');
        if (parts.length === 3) {
          formattedDate = `${String(parts[2]).padStart(2, '0')}/${String(parts[1]).padStart(2, '0')}/${parts[0]}`;
        }
      }

      const formData = new FormData();
      formData.append('date', formattedDate);
      if (sessionTime) formData.append('session_time', sessionTime.trim());
      
      if (selectedSubjectId) {
        const numId = parseInt(selectedSubjectId, 10);
        if (!isNaN(numId)) {
          formData.append('subject_id', numId);
        }
      }

      formData.append('original_status', originalStatus);
      formData.append('requested_status', requestedStatus);
      formData.append('reason', reason);
      if (description) formData.append('description', description);
      if (proofFile) formData.append('proof', proofFile);

      const targetUrl = `${activeApiUrl}/disputes`;
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        let detailMsg = 'Failed to submit dispute.';
        if (typeof data.detail === 'string') {
          detailMsg = data.detail;
        } else if (Array.isArray(data.detail)) {
          detailMsg = data.detail.map(d => d.msg || d.detail || JSON.stringify(d)).join(', ');
        } else if (data.detail && typeof data.detail === 'object') {
          detailMsg = JSON.stringify(data.detail);
        }
        throw new Error(detailMsg);
      }

      setSuccessMsg(`Dispute #${data.id} submitted successfully! Your request has been recorded.`);
      setDescription('');
      setProofFile(null);
      fetchMyDisputes();
      setActiveView('history');
      if (typeof playCyberSound === 'function') playCyberSound('success');
    } catch (err) {
      console.error("Submit dispute error:", err);
      let errorText = err.message || 'Error submitting dispute.';
      if (errorText === 'Failed to fetch' || errorText.includes('fetch')) {
        errorText = 'Network connection to backend server failed. Please ensure backend server is online and CORS is allowed.';
      }
      setErrorMsg(errorText);
      if (typeof playCyberSound === 'function') playCyberSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDispute = async (disputeId) => {
    if (!window.confirm("Are you sure you want to cancel this dispute?")) return;
    playCyberSound('click');
    try {
      const res = await disputeApi.cancelDispute(token, disputeId);
      if (res.ok) {
        setSuccessMsg(`Dispute #${disputeId} was cancelled.`);
        fetchMyDisputes();
      }
    } catch {
      setErrorMsg('Failed to cancel dispute.');
    }
  };

  const handlePostComment = async (disputeId) => {
    if (!commentText.trim()) return;
    setIsPostingComment(true);
    try {
      const res = await disputeApi.addDisputeComment(token, disputeId, { message: commentText.trim() });
      if (res.ok) {
        setCommentText('');
        // Refresh dispute details
        const detRes = await disputeApi.fetchDispute(token, disputeId);
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
    <div 
      className="dispute-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playCyberSound('click');
          onClose();
        }
      }}
    >
      <div 
        className="dispute-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dispute-modal-header-wrap">
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(139, 92, 246, 0.2))',
                border: '1px solid rgba(0, 242, 254, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00f2fe',
                flexShrink: 0
              }}>
                <ShieldAlert size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Attendance Correction & Disputes
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '2px 0 0 0' }}>
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
                padding: '6px',
                flexShrink: 0
              }}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '8px 20px 0 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)'
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
        </div>

        {/* Content Body */}
        <div className="dispute-modal-body">
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
                    Attendance Date (Select from Calendar) *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#0d1322',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      colorScheme: 'dark'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '6px' }}>
                    Session Time / Period *
                  </label>
                  <select
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                    required
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
                    <option value="">Select Period / Class Slot *</option>
                    <option value="Period 1 (09:00 - 10:00 AM)">Period 1 (09:00 - 10:00 AM)</option>
                    <option value="Period 2 (10:00 - 11:00 AM)">Period 2 (10:00 - 11:00 AM)</option>
                    <option value="Period 3 (11:00 - 12:00 PM)">Period 3 (11:00 - 12:00 PM)</option>
                    <option value="Period 4 (12:00 - 01:00 PM)">Period 4 (12:00 - 01:00 PM)</option>
                    <option value="Period 5 (01:00 - 02:00 PM)">Period 5 (01:00 - 02:00 PM)</option>
                    <option value="Period 6 (02:00 - 03:00 PM)">Period 6 (02:00 - 03:00 PM)</option>
                    <option value="Period 7 (03:00 - 04:00 PM)">Period 7 (03:00 - 04:00 PM)</option>
                    <option value="Period 8 (04:00 - 05:00 PM)">Period 8 (04:00 - 05:00 PM)</option>
                  </select>
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
                    {subjects.map((s, idx) => {
                      const sid = s.id ?? s.subject_id ?? '';
                      const sname = s.name ?? s.subject_name ?? 'Subject';
                      const scode = s.code ?? s.subject_code ?? '';
                      return (
                        <option key={sid || idx} value={sid}>
                          {sname} {scode ? `(${scode})` : ''}
                        </option>
                      );
                    })}
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

              <div className="dispute-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingBottom: '12px' }}>
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
                                    const res = await fetch(`${activeApiUrl}/disputes/${d.id}/proof`, {
                                      headers: { 'Authorization': `Bearer ${token}` }
                                    });
                                    if (res.ok) {
                                      const blob = await res.blob();
                                      const url = window.URL.createObjectURL(blob);
                                      window.open(url, '_blank');
                                    }
                                  } catch {
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
                            <button
                              onClick={() => generateDisputePdf({ ...d, student_name: currentUser?.name || d.student_name, student_roll: currentUser?.details?.roll_number || d.student_roll || currentUser?.email })}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                color: '#10b981',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              📄 Download Official PDF
                            </button>
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
