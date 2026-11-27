import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  HelpCircle,
  ShieldCheck,
  ArrowUpRight,
  MessageSquare,
  Search,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Download,
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';
import { generateDisputePdf } from '../utils/disputePdfGenerator';
import { disputeApi } from '../api/disputeApi';

const API_BASE_URL = getApiBaseUrl();

const STATUS_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'NEEDS_INFORMATION', label: 'Needs Info' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'APPROVED':
      return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: 'Approved' };
    case 'REJECTED':
      return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Rejected' };
    case 'UNDER_REVIEW':
      return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', label: 'Under Review' };
    case 'NEEDS_INFORMATION':
      return { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Info Needed' };
    default:
      return { bg: '#faf5ea', color: '#6e4e1c', border: '#dfcfaf', label: 'Submitted' };
  }
};

export default function AttendanceDisputesQueue({
  token,
  playCyberSound = () => {},
  onDisputeUpdated,
  disputesData = null,
  hasLoadedData = false,
  onDisputesChange,
  routeView = null,
  setRouteView,
  onCloseSubView,
}) {
  const [localDisputes, setLocalDisputes] = useState([]);
  const [localHasLoaded, setLocalHasLoaded] = useState(false);
  const [localRouteView, setLocalRouteView] = useState(null);

  const disputes = disputesData ?? localDisputes;
  const hasLoaded = disputesData !== null ? hasLoadedData : localHasLoaded;
  const activeRoute = setRouteView ? routeView : localRouteView;
  const setActiveRoute = setRouteView || setLocalRouteView;

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Inline Review / Escalate Form State inside Detail page
  const [reviewAction, setReviewAction] = useState(null); // 'APPROVE' | 'REJECT' | 'ESCALATE' | null
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Comment Thread State inside Detail page
  const [commentInput, setCommentInput] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Direct deep-link fallback dispute state
  const [fetchedDetailDispute, setFetchedDetailDispute] = useState(null);

  const fetchQueue = useCallback(async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setIsRefreshing(true);
    try {
      const res = await disputeApi.fetchDisputeQueue(token, 'ALL');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setLocalDisputes(list);
        setLocalHasLoaded(true);
        if (onDisputesChange) onDisputesChange(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  }, [token, onDisputesChange]);

  useEffect(() => {
    let ignore = false;
    if (token && !hasLoaded) {
      Promise.resolve().then(() => {
        if (!ignore) fetchQueue({ silent: false });
      });
    }
    return () => {
      ignore = true;
    };
  }, [token, hasLoaded, fetchQueue]);

  // Direct URL fallback fetch if a user opens #/disputes/<id> before queue list contains it
  const detailTargetId = activeRoute?.mode === 'detail' ? activeRoute.id : null;
  const matchedInQueue = useMemo(
    () => (detailTargetId ? disputes.find(d => String(d.id) === String(detailTargetId)) : null),
    [disputes, detailTargetId]
  );

  useEffect(() => {
    let ignore = false;
    if (token && detailTargetId && !matchedInQueue && !activeRoute?.item) {
      disputeApi.fetchDispute(token, detailTargetId)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (!ignore && data) setFetchedDetailDispute(data);
        })
        .catch(() => {});
    }
    return () => {
      ignore = true;
    };
  }, [token, detailTargetId, matchedInQueue, activeRoute?.item]);

  const openDetailPage = (dispute) => {
    playCyberSound('click');
    setActionSuccessMsg('');
    setActionErrorMsg('');
    setReviewAction(null);
    setReviewComment('');
    setCommentInput('');
    setActiveRoute({ mode: 'detail', id: dispute.id, item: dispute });
  };

  const closeSubView = () => {
    setActionErrorMsg('');
    setActionSuccessMsg('');
    setReviewAction(null);
    if (onCloseSubView) {
      onCloseSubView();
    } else {
      setActiveRoute(null);
    }
  };

  const applyDisputeUpdate = (updatedDispute) => {
    const nextList = disputes.some(item => String(item.id) === String(updatedDispute.id))
      ? disputes.map(item => (String(item.id) === String(updatedDispute.id) ? updatedDispute : item))
      : [updatedDispute, ...disputes];
    setLocalDisputes(nextList);
    if (onDisputesChange) onDisputesChange(nextList);
    if (activeRoute?.mode === 'detail' && String(activeRoute.id) === String(updatedDispute.id)) {
      setActiveRoute({ ...activeRoute, item: updatedDispute });
    }
  };

  const handleExecuteReview = async (disputeId) => {
    if (!token || !reviewAction) return;
    setActionErrorMsg('');
    setActionSuccessMsg('');
    setIsSubmittingReview(true);
    playCyberSound('click');
    try {
      if (reviewAction === 'ESCALATE') {
        const res = await disputeApi.escalateDispute(token, disputeId, { reason: reviewComment.trim() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to escalate dispute.');
        applyDisputeUpdate(data);
        setActionSuccessMsg(`Dispute #${disputeId} escalated to Department Head.`);
      } else {
        const res = await disputeApi.reviewDispute(token, disputeId, {
          action: reviewAction,
          comment: reviewComment.trim(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Review failed.');
        applyDisputeUpdate(data);
        setActionSuccessMsg(`Dispute #${disputeId} marked as ${data.status}.`);
      }
      setReviewAction(null);
      setReviewComment('');
      if (onDisputeUpdated) onDisputeUpdated();
      playCyberSound('success');
    } catch (err) {
      setActionErrorMsg(err.message || 'Unable to process dispute action.');
      playCyberSound('error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleAddComment = async (dispute) => {
    if (!commentInput.trim()) return;
    setActionErrorMsg('');
    setIsPostingComment(true);
    try {
      const res = await disputeApi.addDisputeComment(token, dispute.id, { message: commentInput.trim() });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to post message.');
      }
      const savedComment = await res.json();
      setCommentInput('');
      applyDisputeUpdate({
        ...dispute,
        comments: [...(dispute.comments || []), savedComment],
      });
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to send comment.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleOpenProof = async (disputeId) => {
    setActionErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/disputes/${disputeId}/proof`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Proof file unavailable.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      setActionErrorMsg('Could not open attached student proof document.');
    }
  };

  // Instant 0ms client-side status + search filtering
  const filteredDisputes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return disputes.filter(d => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (!q) return true;
      return (
        String(d.student_name || '').toLowerCase().includes(q) ||
        String(d.student_roll || '').toLowerCase().includes(q) ||
        String(d.subject_name || '').toLowerCase().includes(q) ||
        String(d.reason || '').toLowerCase().includes(q) ||
        String(d.status || '').toLowerCase().includes(q)
      );
    });
  }, [disputes, statusFilter, searchQuery]);

  /* ===== DEDICATED DISPUTE DETAIL & CONTROL PAGE ===== */
  if (activeRoute?.mode === 'detail') {
    const d =
      matchedInQueue ||
      (String(fetchedDetailDispute?.id) === String(activeRoute.id) ? fetchedDetailDispute : null) ||
      activeRoute.item ||
      null;

    if (!d) {
      return (
        <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
          <div className="golden-os-window" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <Clock size={26} style={{ color: '#8c7a5b' }} />
            <span style={{ fontWeight: 700, color: '#2b2112' }}>Loading dispute details...</span>
            <button type="button" onClick={closeSubView} className="golden-os-feedback-filter-btn" style={{ padding: '8px 16px', borderRadius: '10px' }}>
              Back to Disputes
            </button>
          </div>
        </div>
      );
    }

    const badge = getStatusBadge(d.status);
    const isOpen = ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION'].includes(d.status);

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
          {actionSuccessMsg && (
            <div role="status" className="feedback-banner is-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{actionSuccessMsg}</span>
            </div>
          )}
          {actionErrorMsg && (
            <div role="alert" className="feedback-banner is-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{actionErrorMsg}</span>
            </div>
          )}

          {/* Student & Status Header Card */}
          <div className="golden-os-form-section" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 200px' }}>
              <div className="golden-os-avatar" style={{ width: '44px', height: '44px', fontSize: '0.96rem' }}>
                {getInitials(d.student_name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#25231f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.student_name || 'Student'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b5b3e', fontWeight: 600 }}>
                  Roll: {d.student_roll || 'N/A'} · #{d.id}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {d.escalated_to_hod && (
                <span style={{ padding: '4px 9px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}>
                  HOD Escalated
                </span>
              )}
              <span style={{ padding: '5px 11px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 700, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                {badge.label}
              </span>
            </div>
          </div>

          {/* Dispute Details Card */}
          <div className="golden-os-form-section" style={{ gap: '8px' }}>
            <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={13} />
              <span>Correction Details</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Subject</span>
              <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>
                {d.subject_name ? `${d.subject_name} (${d.subject_code})` : 'General Class'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Date &amp; Slot</span>
              <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>
                {d.date}{d.session_time ? ` · ${d.session_time}` : ''}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Adjustment</span>
              <span style={{ fontWeight: 800 }}>
                <span style={{ color: '#dc2626' }}>{d.original_status}</span>
                {' -> '}
                <span style={{ color: '#047857' }}>{d.requested_status}</span>
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Reason</span>
              <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>{d.reason}</span>
            </div>
            {d.description && (
              <div style={{ paddingTop: '4px', fontSize: '0.84rem', color: '#3b3324', background: '#faf8f2', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ede4d2', lineHeight: 1.5 }}>
                {d.description}
              </div>
            )}
            {d.reviewer_comments && (
              <div style={{ fontSize: '0.8rem', color: '#6e4e1c', paddingTop: '6px', fontWeight: 600 }}>
                Review Note ({d.reviewed_by || 'Staff'}): {d.reviewer_comments}
              </div>
            )}
          </div>

          {/* Proof, PDF & Decision Controls */}
          <div className="golden-os-form-section">
            <div className="golden-os-form-section-title">Documents &amp; Decision</div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {d.has_proof && (
                <button
                  type="button"
                  onClick={() => handleOpenProof(d.id)}
                  style={{
                    padding: '8px 13px',
                    borderRadius: '10px',
                    background: '#faf5ea',
                    border: '1px solid #dfcfaf',
                    color: '#6e4e1c',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FileText size={14} />
                  <span>View Student Proof</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => generateDisputePdf(d)}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '8px 13px', borderRadius: '10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={14} />
                <span>Download Official PDF</span>
              </button>
            </div>

            {isOpen && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setReviewAction('APPROVE');
                    setReviewComment('Attendance verified and marked present.');
                  }}
                  style={{
                    flex: '1 1 100px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#047857',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                  }}
                >
                  <CheckCircle2 size={14} color="#047857" />
                  <span style={{ color: '#047857' }}>Approve</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewAction('REJECT');
                    setReviewComment('');
                  }}
                  style={{
                    flex: '1 1 100px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                  }}
                >
                  <XCircle size={14} color="#dc2626" />
                  <span style={{ color: '#dc2626' }}>Reject</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReviewAction('ESCALATE');
                    setReviewComment('');
                  }}
                  style={{
                    flex: '1 1 100px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    color: '#6d28d9',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                  }}
                >
                  <ArrowUpRight size={14} color="#6d28d9" />
                  <span style={{ color: '#6d28d9' }}>Escalate</span>
                </button>
              </div>
            )}

            {reviewAction && (
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                background: reviewAction === 'APPROVE' ? '#ecfdf5' : (reviewAction === 'ESCALATE' ? '#f5f3ff' : '#fef2f2'),
                border: `1px solid ${reviewAction === 'APPROVE' ? '#a7f3d0' : (reviewAction === 'ESCALATE' ? '#ddd6fe' : '#fecaca')}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: reviewAction === 'APPROVE' ? '#047857' : (reviewAction === 'ESCALATE' ? '#6d28d9' : '#dc2626') }}>
                  {reviewAction === 'APPROVE' && `Approve & Correct Attendance (${d.original_status} -> ${d.requested_status})`}
                  {reviewAction === 'REJECT' && 'Reject Dispute Request'}
                  {reviewAction === 'ESCALATE' && 'Escalate to HOD / Admin'}
                </div>
                <input
                  type="text"
                  className="form-input"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder={reviewAction === 'ESCALATE' ? 'Enter escalation note for HOD...' : 'Add verification note or reason...'}
                  style={{ background: '#ffffff' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setReviewAction(null)}
                    className="golden-os-feedback-filter-btn"
                    style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '0.8rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingReview}
                    onClick={() => handleExecuteReview(d.id)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: '8px',
                      background: reviewAction === 'APPROVE' ? '#047857' : (reviewAction === 'ESCALATE' ? '#6d28d9' : '#dc2626'),
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: isSubmittingReview ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmittingReview ? 'Processing...' : `Confirm ${reviewAction}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Comment Discussion Card */}
          <div className="golden-os-form-section">
            <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={13} />
              <span>Discussion ({d.comments?.length || 0})</span>
            </div>

            {d.comments && d.comments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {d.comments.map(c => (
                  <div key={c.id} style={{
                    padding: '9px 12px',
                    borderRadius: '10px',
                    background: c.author_role === 'student' ? '#faf5ea' : '#f5f3ff',
                    border: `1px solid ${c.author_role === 'student' ? '#e7dac0' : '#ddd6fe'}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#6b5b3e', gap: '8px' }}>
                      <strong style={{ color: c.author_role === 'student' ? '#6e4e1c' : '#6d28d9' }}>
                        {c.author_name || c.author_email} ({c.author_role})
                      </strong>
                      <span>{c.created_at ? new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '0.84rem', color: '#25231f' }}>{c.message}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#78674b' }}>
                No comments yet. Send a message below to request clarification.
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddComment(d);
                }}
                placeholder="Write a message..."
                style={{ flex: 1, background: '#ffffff' }}
              />
              <button
                type="button"
                disabled={isPostingComment || !commentInput.trim()}
                onClick={() => handleAddComment(d)}
                className="golden-os-primary-action"
                style={{ width: 'auto', justifyContent: 'center', padding: '10px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700 }}
              >
                {isPostingComment ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== MAIN GOLDEN GATE DISPUTES QUEUE (1-Line Scannable Rows, Instant Filter) ===== */
  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
        {/* Search + Compact Refresh */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '150px' }}>
            <input
              type="search"
              className="form-input"
              aria-label="Search disputes"
              placeholder="Search student or subject..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', background: '#ffffff', width: '100%', boxSizing: 'border-box' }}
            />
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
          </div>

          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              fetchQueue();
            }}
            disabled={isRefreshing}
            className="golden-os-feedback-filter-btn"
            style={{ padding: '10px 14px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Status Filter Pills (Instant 0ms Client-Side Filtering) */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {STATUS_TABS.map(tab => {
            const active = statusFilter === tab.key;
            const count = tab.key === 'ALL'
              ? disputes.length
              : disputes.filter(d => d.status === tab.key).length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.key);
                  playCyberSound('click');
                }}
                style={{
                  padding: '5px 11px',
                  borderRadius: '999px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: active ? '1px solid #785927' : '1px solid #e4d8bd',
                  background: active ? '#785927' : '#ffffff',
                  color: active ? '#ffffff' : '#6b5b3e',
                }}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Scannable 1-Line Dispute Rows */}
        {!hasLoaded && disputes.length === 0 ? (
          <div className="golden-os-inset-card" style={{ padding: '28px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <RefreshCw size={22} className="spin-anim" style={{ color: '#8c7a5b' }} />
            <span style={{ fontSize: '0.86rem', color: '#6b5b3e', fontWeight: 600 }}>Loading dispute queue...</span>
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="golden-os-inset-card" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <HelpCircle size={28} style={{ color: '#047857' }} />
            <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>
              {searchQuery || statusFilter !== 'ALL' ? 'No matching disputes found' : 'No disputes in queue'}
            </span>
          </div>
        ) : (
          <div className="golden-os-list-shell">
            {filteredDisputes.map(d => (
                <button
                  key={d.id}
                  type="button"
                  className="golden-os-list-row"
                  onClick={() => openDetailPage(d)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div className="golden-os-avatar">{getInitials(d.student_name)}</div>
                    <span style={{
                      fontSize: '0.94rem',
                      fontWeight: 700,
                      color: '#25231f',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {d.student_name || `Student #${d.student_id}`}
                    </span>
                  </div>
                  <ChevronRight size={16} color="#8c734b" style={{ flexShrink: 0 }} />
                </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
