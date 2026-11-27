import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Star,
  Send,
  Clock,
} from 'lucide-react';

const TYPE_SHORT = {
  bug: 'BUG',
  suggestion: 'SUG',
  general: 'GEN',
};

const TYPE_LABEL = {
  bug: 'Bug Report',
  suggestion: 'Suggestion',
  general: 'General',
};

const STATUS_LABEL = {
  resolved: 'Resolved',
  reviewed: 'Reviewed',
  pending: 'Pending Review',
};

/**
 * Dedicated Golden Gate Feedback & Reviews page for Student Credentials.
 * Matches Admin Feedback layout cleanly without floating modal boxes,
 * 3-dot titlebars, or boxed row pills.
 */
export default function StudentFeedbackHub({
  feedbackState,
  routeView = null,
  onNavigateRoute = null,
  onNavigateBack = null,
  playCyberSound = () => {},
}) {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'history'
  const [statusFilter, setStatusFilter] = useState('all');

  const {
    feedbackType = 'suggestion',
    setFeedbackType = () => {},
    feedbackRating = 5,
    setFeedbackRating = () => {},
    feedbackMessage = '',
    setFeedbackMessage = () => {},
    feedbackSuccess = '',
    setFeedbackSuccess = () => {},
    feedbackError = '',
    submittingFeedback = false,
    handleFeedbackSubmit,
    myFeedbacks = [],
    isLoadingMyFeedbacks = false,
    fetchMyFeedbacks,
  } = feedbackState || {};

  useEffect(() => {
    if (fetchMyFeedbacks) fetchMyFeedbacks();
  }, [fetchMyFeedbacks]);

  const safeReviews = useMemo(() => (Array.isArray(myFeedbacks) ? myFeedbacks : []), [myFeedbacks]);
  const counts = useMemo(() => ({
    all: safeReviews.length,
    pending: safeReviews.filter(f => !f.status || f.status === 'pending').length,
    reviewed: safeReviews.filter(f => f.status === 'reviewed').length,
    resolved: safeReviews.filter(f => f.status === 'resolved').length,
  }), [safeReviews]);

  const filteredReviews = useMemo(() => {
    return safeReviews.filter(item => {
      if (statusFilter === 'all') return true;
      return String(item.status || 'pending').toLowerCase() === statusFilter;
    });
  }, [safeReviews, statusFilter]);

  /* ===== DEDICATED PAGE: FEEDBACK DETAIL VIEW ===== */
  if (routeView?.mode === 'detail') {
    const item = safeReviews.find(f => String(f.id) === String(routeView.id)) || routeView.item || null;
    if (!item) {
      return (
        <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ textAlign: 'center', padding: '24px', gap: '12px', alignItems: 'center' }}>
              <Clock size={24} style={{ color: '#8c7a5b' }} />
              <div style={{ fontWeight: 700, color: '#2b2112' }}>Feedback entry not found.</div>
              <button type="button" onClick={onNavigateBack} className="golden-os-feedback-filter-btn" style={{ padding: '8px 16px', borderRadius: '10px' }}>
                Back to Feedback
              </button>
            </div>
          </div>
        </div>
      );
    }

    const stKey = String(item.status || 'pending').toLowerCase();
    const stColor = stKey === 'resolved' ? '#047857' : stKey === 'reviewed' ? '#1d4ed8' : '#b45309';

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={13} />
                <span>Feedback #{item.id}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Status</span>
                <span style={{ color: stColor, fontWeight: 800 }}>{STATUS_LABEL[stKey] || 'Pending Review'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Category</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>{TYPE_LABEL[String(item.type || 'general').toLowerCase()] || 'General'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Rating</span>
                <span style={{ color: '#b45309', fontWeight: 800 }}>{item.rating}/5 Stars</span>
              </div>
              {item.created_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                  <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Submitted</span>
                  <span style={{ color: '#25231f', fontWeight: 600 }}>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              )}

              <div style={{ marginTop: '4px', fontSize: '0.84rem', color: '#3b3324', background: '#faf8f2', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ede4d2', lineHeight: 1.5 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#785927', marginBottom: '3px', textTransform: 'uppercase' }}>Your Message</div>
                {item.message}
              </div>

              {item.admin_reply && (
                <div style={{ fontSize: '0.82rem', color: '#61471e', background: '#faf5ea', padding: '10px 12px', borderRadius: '10px', border: '1px solid #dfcfaf' }}>
                  <strong>Admin Response{item.reviewed_by ? ` (${item.reviewed_by})` : ''}:</strong> {item.admin_reply}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  if (onNavigateBack) onNavigateBack();
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '11px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #785927, #684c20)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== FEEDBACK ROOT PAGE (SUBMIT + TRACK MY REVIEWS) ===== */
  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Top Action & Tab Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            <div className="golden-os-segmented" style={{ flex: 1, minWidth: 0, flexWrap: 'nowrap' }}>
              <button
                type="button"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  setActiveTab('submit');
                }}
                className={`golden-os-segmented-btn ${activeTab === 'submit' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 6px', whiteSpace: 'nowrap', textAlign: 'center' }}
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  setActiveTab('history');
                  if (fetchMyFeedbacks) fetchMyFeedbacks();
                }}
                className={`golden-os-segmented-btn ${activeTab === 'history' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 6px', whiteSpace: 'nowrap', textAlign: 'center' }}
              >
                My Reviews ({safeReviews.length})
              </button>
            </div>

            {fetchMyFeedbacks && (
              <button
                type="button"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  fetchMyFeedbacks();
                }}
                disabled={isLoadingMyFeedbacks}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '9px 12px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}
              >
                <RefreshCw size={14} className={isLoadingMyFeedbacks ? 'spin-icon' : ''} />
                <span>{isLoadingMyFeedbacks ? 'Syncing' : 'Refresh'}</span>
              </button>
            )}
          </div>

          {activeTab === 'submit' ? (
            <form onSubmit={handleFeedbackSubmit} className="golden-os-form-section">
              <div className="golden-os-form-section-title">Share Campus Feedback</div>

              {feedbackSuccess && (
                <div role="status" className="feedback-banner is-success">
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, flex: 1 }}>{feedbackSuccess}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (setFeedbackSuccess) setFeedbackSuccess('');
                      setActiveTab('history');
                    }}
                    className="golden-os-feedback-filter-btn"
                    style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '0.74rem' }}
                  >
                    View Reviews
                  </button>
                </div>
              )}

              {feedbackError && (
                <div role="alert" className="feedback-banner is-error">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{feedbackError}</span>
                </div>
              )}

              <div>
                <label className="golden-os-field-label">Category</label>
                <div className="golden-os-segmented">
                  {[
                    { key: 'suggestion', label: 'Suggestion' },
                    { key: 'bug', label: 'Report Bug' },
                    { key: 'general', label: 'General' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        if (playCyberSound) playCyberSound('click');
                        setFeedbackType(opt.key);
                      }}
                      className={`golden-os-segmented-btn ${feedbackType === opt.key ? 'active' : ''}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="golden-os-field-label">Experience Rating ({feedbackRating}/5)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      aria-label={`Rate ${star} stars`}
                      onClick={() => {
                        if (playCyberSound) playCyberSound('click');
                        setFeedbackRating(star);
                      }}
                      style={{
                        background: star <= feedbackRating ? '#faf5ea' : '#ffffff',
                        border: star <= feedbackRating ? '1.5px solid #d9c496' : '1px solid #e4d8bd',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Star
                        size={20}
                        fill={star <= feedbackRating ? '#d97706' : 'none'}
                        stroke={star <= feedbackRating ? '#b45309' : '#b8a98c'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="golden-os-field-label">Feedback Message *</label>
                <textarea
                  rows={4}
                  className="golden-os-input"
                  value={feedbackMessage}
                  onChange={e => setFeedbackMessage(e.target.value)}
                  placeholder="Share suggestions, issues, or feedback for your institution admin..."
                  maxLength={1000}
                  disabled={submittingFeedback}
                  style={{ resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={submittingFeedback || !feedbackMessage.trim()}
                  style={{
                    width: 'auto',
                    padding: '10px 20px',
                    borderRadius: '11px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: submittingFeedback || !feedbackMessage.trim() ? 'not-allowed' : 'pointer',
                    background: submittingFeedback || !feedbackMessage.trim() ? '#b8a98c' : 'linear-gradient(135deg, #785927, #684c20)',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    boxShadow: '0 2px 8px rgba(104, 76, 32, 0.2)',
                  }}
                >
                  <Send size={14} />
                  <span>{submittingFeedback ? 'Submitting...' : 'Submit Feedback'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Status Filter Bar */}
              <div className="golden-os-feedback-filters">
                {[
                  { key: 'all', label: `All (${counts.all})` },
                  { key: 'pending', label: `Pending (${counts.pending})` },
                  { key: 'reviewed', label: `Reviewed (${counts.reviewed})` },
                  { key: 'resolved', label: `Resolved (${counts.resolved})` },
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      if (playCyberSound) playCyberSound('click');
                      setStatusFilter(tab.key);
                    }}
                    className={`golden-os-feedback-filter-btn ${statusFilter === tab.key ? 'active' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {filteredReviews.length === 0 ? (
                <div style={{ padding: '24px 14px', textAlign: 'center', background: '#ffffff', border: '1px dashed #d6c5a3', borderRadius: '14px', color: '#6b5b3e', fontSize: '0.82rem' }}>
                  No feedback entries under this filter yet.
                </div>
              ) : (
                <div className="golden-os-list-shell">
                  {filteredReviews.map(item => {
                    const stKey = String(item.status || 'pending').toLowerCase();
                    const tKey = String(item.type || 'general').toLowerCase();
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (playCyberSound) playCyberSound('click');
                          if (onNavigateRoute) {
                            onNavigateRoute({ section: 'feedback', mode: 'detail', id: item.id, item });
                          }
                        }}
                        className="golden-os-list-row"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                          <div className="golden-os-avatar">{TYPE_SHORT[tKey] || 'FB'}</div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.message}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#6b5b3e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                              {item.rating}/5 stars · {STATUS_LABEL[stKey] || 'Pending Review'}{item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString()}` : ''}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
                      </button>
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
