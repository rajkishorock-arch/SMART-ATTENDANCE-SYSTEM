import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ScanFace,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';
import { getInitials } from '../utils/attendanceDateUtils';

const API_BASE_URL = getApiBaseUrl();

const STATUS_TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'REASSIGNED', label: 'Reassigned' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
];

export default function LowConfidenceReviewQueue({
  token,
  playCyberSound = () => {},
  routeView = null,
  setRouteView = null,
  onCloseSubView = null,
}) {
  const [reviews, setReviews] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Inline Reassign Panel State (inside dedicated detail page)
  const [showReassignForm, setShowReassignForm] = useState(false);
  const [reassignRoll, setReassignRoll] = useState('');
  const [reassignComment, setReassignComment] = useState('');
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);

  const [resolvingId, setResolvingId] = useState(null);

  const fetchQueue = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const url = statusFilter === 'ALL'
        ? `${API_BASE_URL}/review-queue`
        : `${API_BASE_URL}/review-queue?status=${statusFilter}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Queue fetch failed (${res.status})`);
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMsg(err.message || 'Error loading face match review queue.');
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) await fetchQueue();
    };
    run();
    return () => { ignore = true; };
  }, [fetchQueue]);

  const selectedItem = useMemo(() => {
    if (!routeView || routeView.mode !== 'detail' || routeView.id == null) return null;
    const found = reviews.find(r => String(r.id) === String(routeView.id));
    return found || routeView.item || null;
  }, [routeView, reviews]);

  const closeDetail = () => {
    setShowReassignForm(false);
    setReassignRoll('');
    setReassignComment('');
    if (onCloseSubView) onCloseSubView();
    else if (setRouteView) setRouteView(null);
  };

  const handleResolve = async (reviewId, action, comment = '') => {
    setResolvingId(reviewId);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/review-queue/${reviewId}/resolve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, comment }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Resolution failed.');
      }
      playCyberSound(action === 'CONFIRM' ? 'success' : 'click');
      setSuccessMsg(
        action === 'CONFIRM'
          ? 'Match confirmed and attendance marked.'
          : 'Detection rejected as false match.'
      );
      await fetchQueue();
      setTimeout(() => setSuccessMsg(''), 3500);
      closeDetail();
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setResolvingId(null);
    }
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem || !reassignRoll.trim()) {
      setErrorMsg('Target student roll number is required.');
      return;
    }
    setIsSubmittingReassign(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/review-queue/${selectedItem.id}/resolve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'REASSIGN',
          reassign_to_roll: reassignRoll.trim(),
          comment: reassignComment.trim(),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Reassignment failed.');
      }
      playCyberSound('success');
      setSuccessMsg(`Attendance reassigned to roll ${reassignRoll.trim()}.`);
      await fetchQueue();
      setTimeout(() => setSuccessMsg(''), 3500);
      closeDetail();
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  /* ===== DEDICATED PAGE: FACE MATCH DETAIL & CONTROLS ===== */
  if (routeView?.mode === 'detail') {
    if (!selectedItem) {
      return (
        <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ alignItems: 'center', textAlign: 'center', padding: '26px', gap: '12px' }}>
              <ScanFace size={26} style={{ color: '#8c7a5b' }} />
              <div style={{ fontWeight: 700, color: '#2b2112' }}>Match record not found or already cleared.</div>
              <button type="button" onClick={closeDetail} className="golden-os-feedback-filter-btn" style={{ padding: '8px 16px', borderRadius: '10px' }}>
                Back to Review Queue
              </button>
            </div>
          </div>
        </div>
      );
    }

    const pct = Math.round((selectedItem.similarity_score || 0) * 100);
    const st = String(selectedItem.status || 'PENDING').toUpperCase();
    const stColor = st === 'CONFIRMED' ? '#047857' : st === 'REASSIGNED' ? '#6d28d9' : st === 'REJECTED' ? '#b91c1c' : '#b45309';
    const isResolving = resolvingId === selectedItem.id;

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {errorMsg && (
              <div role="alert" className="feedback-banner is-error">
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{errorMsg}</span>
              </div>
            )}

            {/* Candidate Header Summary */}
            <div className="golden-os-form-section" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ width: '46px', height: '46px', fontSize: '0.96rem' }}>
                  {getInitials(selectedItem.candidate_name, 'FM')}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#785927', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {pct}% Similarity Match · {st}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#25231f', marginTop: '2px', overflowWrap: 'anywhere' }}>
                    {selectedItem.candidate_name}
                  </div>
                </div>
              </div>
            </div>

            {/* Organized Inspection Details */}
            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title">Detection Metadata</div>
              {[
                { label: 'Roll Number', value: selectedItem.candidate_roll || 'N/A' },
                { label: 'Date', value: selectedItem.date || 'N/A' },
                ...(selectedItem.session_time ? [{ label: 'Session / Period', value: selectedItem.session_time }] : []),
                ...(selectedItem.subject_name ? [{ label: 'Subject', value: selectedItem.subject_name }] : []),
                { label: 'Confidence Score', value: `${pct}%` },
                { label: 'Queue Status', value: st, color: stColor },
                ...(selectedItem.reviewed_by ? [{ label: 'Reviewed By', value: selectedItem.reviewed_by }] : []),
              ].map((row, idx, arr) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 0',
                    borderBottom: idx < arr.length - 1 ? '1px solid #f2ead9' : 'none',
                    fontSize: '0.84rem',
                  }}
                >
                  <span style={{ color: '#6b5b3e', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ color: row.color || '#25231f', fontWeight: 700, textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}

              {selectedItem.reviewer_comment && (
                <div style={{ marginTop: '4px', padding: '10px 12px', background: '#faf8f2', borderRadius: '10px', border: '1px solid #ede4d2', fontSize: '0.82rem', color: '#3b3324' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#785927', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Reviewer Note
                  </div>
                  {selectedItem.reviewer_comment}
                </div>
              )}
            </div>

            {/* Organized Controls for Pending Items */}
            {st === 'PENDING' && (
              <div className="golden-os-form-section" style={{ gap: '12px' }}>
                <div className="golden-os-form-section-title">Review Controls</div>

                {!showReassignForm ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        disabled={isResolving}
                        onClick={() => handleResolve(selectedItem.id, 'CONFIRM', 'Confirmed visually by staff')}
                        style={{
                          padding: '11px 12px',
                          borderRadius: '11px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #059669, #047857)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          cursor: isResolving ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <UserCheck size={15} />
                        <span>{isResolving ? 'Saving...' : 'Confirm'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isResolving}
                        onClick={() => handleResolve(selectedItem.id, 'REJECT', 'Rejected: false face detection')}
                        style={{
                          padding: '11px 12px',
                          borderRadius: '11px',
                          border: 'none',
                          background: '#dc2626',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          cursor: isResolving ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <UserX size={15} />
                        <span>Reject</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={() => {
                        playCyberSound('click');
                        setReassignRoll('');
                        setReassignComment('');
                        setShowReassignForm(true);
                      }}
                      className="golden-os-primary-action"
                      style={{ justifyContent: 'center', padding: '11px 16px', fontSize: '0.84rem', borderRadius: '11px' }}
                    >
                      <ArrowRightLeft size={15} />
                      <span>Reassign to Another Student</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReassignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="golden-os-field-label">Target Student Roll Number *</label>
                      <input
                        type="text"
                        required
                        className="golden-os-input"
                        placeholder="e.g. 2365"
                        value={reassignRoll}
                        onChange={e => setReassignRoll(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="golden-os-field-label">Reason / Note</label>
                      <textarea
                        rows={2}
                        className="golden-os-input"
                        placeholder="Optional verification note..."
                        value={reassignComment}
                        onChange={e => setReassignComment(e.target.value)}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowReassignForm(false)}
                        className="golden-os-feedback-filter-btn"
                        style={{ padding: '9px 14px', borderRadius: '10px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingReassign}
                        className="golden-os-primary-action"
                        style={{ width: 'auto', padding: '9px 16px', borderRadius: '10px', fontSize: '0.82rem' }}
                      >
                        <span>{isSubmittingReassign ? 'Saving...' : 'Confirm Reassignment'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={closeDetail}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '9px 18px', borderRadius: '10px' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== MAIN PAGE: CLEAN SINGLE-LINE FACE REVIEW DIRECTORY ===== */
  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Clean Filter Strip & Refresh */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div className="golden-os-feedback-filters" style={{ flex: 1, minWidth: 0 }}>
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    playCyberSound('click');
                    setStatusFilter(tab.key);
                  }}
                  className={`golden-os-feedback-filter-btn ${statusFilter === tab.key ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                fetchQueue();
              }}
              disabled={isLoading}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '8px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
            >
              <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
              <span>{isLoading ? 'Syncing' : 'Refresh'}</span>
            </button>
          </div>

          {successMsg && (
            <div role="status" className="feedback-banner is-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="feedback-banner is-error">
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{errorMsg}</span>
            </div>
          )}

          {/* Crisp Single-Line Match List */}
          {reviews.length === 0 ? (
            <div className="golden-os-inset-card" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
              <ScanFace size={30} style={{ color: '#9c8b6e' }} />
              <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>
                {statusFilter === 'PENDING' ? 'No pending face reviews' : 'No matching records'}
              </span>
            </div>
          ) : (
            <div className="golden-os-list-shell">
              {reviews.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playCyberSound('click');
                    if (setRouteView) {
                      setRouteView({ mode: 'detail', id: item.id, item });
                    }
                  }}
                  className="golden-os-list-row"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div className="golden-os-avatar">{getInitials(item.candidate_name, 'FM')}</div>
                    <div style={{ minWidth: 0, flex: 1, fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.candidate_name}{item.date ? ` · ${item.date}` : ''}
                    </div>
                  </div>
                  <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
