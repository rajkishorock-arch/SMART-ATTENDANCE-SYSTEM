import { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, XCircle, Clock, FileText,
  HelpCircle, ChevronDown, ChevronUp, ShieldCheck, ArrowUpRight, MessageSquare
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';
import { generateDisputePdf } from '../utils/disputePdfGenerator';
import { disputeApi } from '../api/disputeApi';

const API_BASE_URL = getApiBaseUrl();

export default function AttendanceDisputesQueue({ 
  token, 
  playCyberSound = () => {},
  onDisputeUpdated
}) {
  const [disputes, setDisputes] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_disputes_queue');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Review Action State
  const [activeReviewId, setActiveReviewId] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVE');
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Comment Thread State
  const [expandedDisputeId, setExpandedDisputeId] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const fetchQueue = useCallback(async (isCancelled = () => false) => {
    if (!token) return;
    if (disputes.length === 0) setIsLoading(true);
    try {
      const res = await disputeApi.fetchDisputeQueue(token, statusFilter);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        if (!isCancelled()) {
          setDisputes(list);
          try {
            localStorage.setItem('cached_disputes_queue', JSON.stringify(list));
          } catch { /* ignore fallback error */ }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isCancelled()) {
        setIsLoading(false);
      }
    }
  }, [token, statusFilter, disputes.length]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        fetchQueue(() => ignore);
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchQueue]);

  const handleExecuteReview = async (disputeId) => {
    if (!token) return;
    setIsSubmittingReview(true);
    playCyberSound('click');
    try {
      const res = await disputeApi.reviewDispute(token, disputeId, {
        action: reviewAction,
        comment: reviewComment.trim()
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Review failed.');
      }
      setActionSuccessMsg(`Dispute #${disputeId} was marked as ${data.status}. Official attendance record updated!`);
      setActiveReviewId(null);
      setReviewComment('');
      fetchQueue();
      if (onDisputeUpdated) onDisputeUpdated();
      playCyberSound('success');
    } catch (err) {
      alert(err.message);
      playCyberSound('error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleEscalate = async (disputeId) => {
    const reason = window.prompt("Enter reason for escalating to HOD / Admin:");
    if (reason === null) return;
    playCyberSound('click');
    try {
      const res = await disputeApi.escalateDispute(token, disputeId, { reason });
      if (res.ok) {
        setActionSuccessMsg(`Dispute #${disputeId} escalated to Department Head.`);
        fetchQueue();
      }
    } catch {
      alert("Failed to escalate.");
    }
  };

  const handleAddComment = async (disputeId) => {
    if (!commentInput.trim()) return;
    setIsPostingComment(true);
    try {
      const res = await disputeApi.addDisputeComment(token, disputeId, { message: commentInput.trim() });
      if (res.ok) {
        setCommentInput('');
        fetchQueue();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPostingComment(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', icon: <CheckCircle2 size={13} />, label: 'Approved' };
      case 'REJECTED':
        return { bg: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', icon: <XCircle size={13} />, label: 'Rejected' };
      case 'UNDER_REVIEW':
        return { bg: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', icon: <Clock size={13} />, label: 'Under Review' };
      case 'NEEDS_INFORMATION':
        return { bg: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', icon: <HelpCircle size={13} />, label: 'Info Needed' };
      default:
        return { bg: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', icon: <Clock size={13} />, label: 'Submitted' };
    }
  };

  const pendingCount = disputes.filter(d => ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION'].includes(d.status)).length;

  return (
    <div className="surface-card" style={{ padding: '28px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0 }}>
              Attendance Correction Requests & Disputes
            </h2>
            {pendingCount > 0 && (
              <span style={{
                background: '#fffbeb',
                color: '#d97706',
                border: '1px solid #fde68a',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
            Official dispute queue — approve or correct student attendance with complete immutable audit logs
          </p>
        </div>

        <button
          onClick={() => { playCyberSound('click'); fetchQueue(); }}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            color: 'var(--color-text-main)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
          onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
        >
          Refresh Queue
        </button>
      </div>

      {actionSuccessMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '10px',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#059669',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} /> {actionSuccessMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: 'All Disputes' },
          { key: 'SUBMITTED', label: 'New / Submitted' },
          { key: 'UNDER_REVIEW', label: 'Under Review / Escalated' },
          { key: 'NEEDS_INFORMATION', label: 'Needs Info' },
          { key: 'APPROVED', label: 'Approved' },
          { key: 'REJECTED', label: 'Rejected' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              if (statusFilter !== tab.key) {
                setIsLoading(true);
                setStatusFilter(tab.key);
                playCyberSound('click');
              }
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: statusFilter === tab.key ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
              background: statusFilter === tab.key ? 'var(--color-primary)' : '#f1f5f9',
              color: statusFilter === tab.key ? '#ffffff' : 'var(--color-text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0' }}>
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              style={{
                padding: '24px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                animation: 'pulse 1.5s infinite ease-in-out'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '40%', height: '18px', background: '#f1f5f9', borderRadius: '4px' }}></div>
                <div style={{ width: '80px', height: '18px', background: '#eff6ff', borderRadius: '12px' }}></div>
              </div>
              <div style={{ width: '70%', height: '14px', background: '#f1f5f9', borderRadius: '4px' }}></div>
              <div style={{ width: '30%', height: '12px', background: '#f8fafc', borderRadius: '4px' }}></div>
            </div>
          ))}
        </div>
      ) : disputes.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: 'var(--color-text-secondary)',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px dashed var(--border-subtle)'
        }}>
          <ShieldCheck size={36} style={{ color: '#10b981', margin: '0 auto 12px auto' }} />
          <h4 style={{ color: 'var(--color-text-main)', margin: 0, fontSize: '1rem' }}>No Disputes in Queue</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            All attendance correction requests for your assigned classes have been processed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {disputes.map(d => {
            const badge = getStatusBadge(d.status);
            const isExpanded = expandedDisputeId === d.id;
            const isReviewing = activeReviewId === d.id;

            return (
              <div
                key={d.id}
                className="surface-card"
                style={{
                  padding: '18px 22px',
                  borderRadius: '14px',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'border-color 0.2s'
                }}
              >
                {/* Dispute Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-primary)',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}>
                      {d.student_name ? d.student_name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                          {d.student_name || 'Student'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontFamily: 'monospace', fontWeight: 600 }}>
                          [{d.student_roll || 'No Roll'}]
                        </span>
                        {d.escalated_to_hod && (
                          <span style={{
                            padding: '1px 6px',
                            borderRadius: '6px',
                            background: '#f5f3ff',
                            border: '1px solid #ddd6fe',
                            color: '#7c3aed',
                            fontSize: '0.68rem',
                            fontWeight: 700
                          }}>
                            🔺 HOD Escalated
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>
                        {d.subject_name ? `${d.subject_name} (${d.subject_code})` : 'General Class'} • Date: <strong style={{ color: 'var(--color-text-main)' }}>{d.date}</strong> {d.session_time ? `at ${d.session_time}` : ''}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      background: badge.bg,
                      color: badge.color,
                      border: badge.border,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      {badge.icon} {badge.label}
                    </span>
                  </div>
                </div>

                {/* Dispute Reason & Details */}
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      Reason: <strong style={{ color: 'var(--color-text-main)' }}>{d.reason}</strong>
                    </span>
                    <span>
                      Adjustment: <span style={{ color: '#dc2626', fontWeight: 700 }}>{d.original_status}</span> → <span style={{ color: '#059669', fontWeight: 700 }}>{d.requested_status}</span>
                    </span>
                  </div>
                  {d.description && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-main)', margin: 0 }}>
                      {d.description}
                    </p>
                  )}
                  {d.reviewer_comments && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', paddingTop: '4px', borderTop: '1px solid var(--border-subtle)' }}>
                      <strong>Review Note ({d.reviewed_by}):</strong> {d.reviewer_comments}
                    </div>
                  )}
                </div>

                {/* Action Controls & Proof */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                          } catch {
                            alert('Could not download proof document.');
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: 'var(--color-primary)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FileText size={14} /> View Student Proof
                      </button>
                    )}

                    <button
                      onClick={() => generateDisputePdf(d)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        color: '#059669',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      📄 Download Official PDF
                    </button>

                    <button
                      onClick={() => setExpandedDisputeId(isExpanded ? null : d.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--color-text-secondary)',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <MessageSquare size={14} />
                      Comments ({d.comments?.length || 0})
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {/* Review Buttons (Only for unresolved disputes) */}
                  {['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION'].includes(d.status) && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setActiveReviewId(d.id);
                          setReviewAction('APPROVE');
                          setReviewComment('Attendance verified and marked present.');
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#059669',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>

                      <button
                        onClick={() => {
                          setActiveReviewId(d.id);
                          setReviewAction('REJECT');
                          setReviewComment('');
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <XCircle size={14} /> Reject
                      </button>

                      <button
                        onClick={() => handleEscalate(d.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: '#f5f3ff',
                          border: '1px solid #ddd6fe',
                          color: '#7c3aed',
                          fontWeight: 600,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <ArrowUpRight size={14} /> Escalate
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline Review Action Form */}
                {isReviewing && (
                  <div style={{
                    marginTop: '8px',
                    padding: '14px',
                    borderRadius: '10px',
                    background: reviewAction === 'APPROVE' ? '#ecfdf5' : '#fef2f2',
                    border: `1px solid ${reviewAction === 'APPROVE' ? '#a7f3d0' : '#fecaca'}`
                  }}>
                    <h5 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: reviewAction === 'APPROVE' ? '#059669' : '#dc2626' }}>
                      {reviewAction === 'APPROVE' ? 'Approve & Correct Attendance to Present' : 'Reject Correction Request'}
                    </h5>
                    <input
                      type="text"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder={reviewAction === 'APPROVE' ? 'Approval note / verification summary' : 'Mandatory rejection reason (e.g. proof invalid, student was absent)'}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--color-text-main)',
                        fontSize: '0.82rem',
                        marginBottom: '10px'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => setActiveReviewId(null)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: '#ffffff',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--color-text-secondary)',
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleExecuteReview(d.id)}
                        disabled={isSubmittingReview}
                        style={{
                          padding: '6px 16px',
                          borderRadius: '6px',
                          background: reviewAction === 'APPROVE' ? '#059669' : '#dc2626',
                          border: 'none',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: isSubmittingReview ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isSubmittingReview ? 'Processing...' : `Confirm ${reviewAction}`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Comment Thread */}
                {isExpanded && (
                  <div style={{
                    marginTop: '8px',
                    padding: '14px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <h5 style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      Dispute Discussion & Audit History
                    </h5>
                    {d.comments && d.comments.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                        {d.comments.map(c => (
                          <div key={c.id} style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: c.author_role === 'student' ? '#eff6ff' : '#f5f3ff',
                            border: `1px solid ${c.author_role === 'student' ? '#bfdbfe' : '#ddd6fe'}`
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>
                              <strong style={{ color: c.author_role === 'student' ? 'var(--color-primary)' : '#7c3aed' }}>
                                {c.author_name || c.author_email} ({c.author_role})
                              </strong>
                              <span>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-main)' }}>
                              {c.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
                        No comments yet. Send a message to communicate with the student.
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Write a message or request clarification..."
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: '#ffffff',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--color-text-main)',
                          fontSize: '0.8rem'
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(d.id);
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(d.id)}
                        disabled={isPostingComment}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '6px',
                          background: 'var(--color-primary)',
                          border: 'none',
                          color: '#ffffff',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: isPostingComment ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Send
                      </button>
                    </div>
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
