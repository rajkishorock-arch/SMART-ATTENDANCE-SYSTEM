import { useState } from 'react';
import { CheckCircle2, AlertCircle, MessageSquarePlus, History, ShieldCheck, Clock, Star, Send } from 'lucide-react';
import useUI from '../hooks/useUI';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

const STATUS_META = {
  resolved: { label: 'Resolved', bg: 'rgba(5, 150, 105, 0.12)', color: '#047857', border: 'rgba(5, 150, 105, 0.28)' },
  reviewed: { label: 'Reviewed', bg: 'rgba(30, 64, 175, 0.1)', color: '#1d4ed8', border: 'rgba(30, 64, 175, 0.25)' },
  pending: { label: 'Pending Review', bg: 'rgba(217, 119, 6, 0.12)', color: '#b45309', border: 'rgba(217, 119, 6, 0.28)' },
};

const TYPE_META = {
  bug: { label: 'Bug Report', bg: 'rgba(220, 38, 38, 0.1)', color: '#b91c1c' },
  suggestion: { label: 'Suggestion', bg: 'rgba(139, 101, 37, 0.12)', color: '#785927' },
  general: { label: 'General', bg: 'rgba(100, 116, 139, 0.12)', color: '#475569' },
};

export default function FeedbackModal({ feedbackState }) {
  useBodyScrollLock(!!feedbackState?.showFeedbackModal);

  if (!feedbackState || !feedbackState.showFeedbackModal) return null;

  return <FeedbackModalContent feedbackState={feedbackState} />;
}

function FeedbackModalContent({ feedbackState }) {
  const { playCyberSound } = useUI();
  const [activeModalTab, setActiveModalTab] = useState('submit');

  const {
    setShowFeedbackModal,
    feedbackType,
    setFeedbackType,
    feedbackRating,
    setFeedbackRating,
    feedbackMessage,
    setFeedbackMessage,
    feedbackSuccess,
    setFeedbackSuccess,
    feedbackError,
    submittingFeedback,
    handleFeedbackSubmit,
    myFeedbacks = [],
    isLoadingMyFeedbacks = false,
    fetchMyFeedbacks,
  } = feedbackState;

  const handleClose = () => {
    if (playCyberSound) playCyberSound('click');
    if (setFeedbackSuccess) setFeedbackSuccess('');
    setShowFeedbackModal(false);
  };

  return (
    <div className="feedback-modal-overlay" onClick={handleClose}>
      <div className="feedback-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <h2 className="feedback-modal-title">Feedback &amp; Reviews</h2>
            <span style={{ fontSize: '0.76rem', color: '#6b5b3e', fontWeight: 500 }}>
              Submit feedback and track Admin responses
            </span>
          </div>
          <button
            type="button"
            className="feedback-modal-close"
            onClick={handleClose}
            aria-label="Close feedback modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Golden Gate Tab Switcher */}
        <div className="feedback-modal-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeModalTab === 'submit'}
            className={`feedback-modal-tab ${activeModalTab === 'submit' ? 'active' : ''}`}
            onClick={() => {
              if (playCyberSound) playCyberSound('click');
              setActiveModalTab('submit');
            }}
          >
            <MessageSquarePlus size={14} />
            <span>Submit Feedback</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeModalTab === 'history'}
            className={`feedback-modal-tab ${activeModalTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              if (playCyberSound) playCyberSound('click');
              setActiveModalTab('history');
              if (fetchMyFeedbacks) fetchMyFeedbacks();
            }}
          >
            <History size={14} />
            <span>My Reviews ({myFeedbacks.length})</span>
          </button>
        </div>

        {activeModalTab === 'submit' ? (
          <form onSubmit={handleFeedbackSubmit}>
            {feedbackSuccess && (
              <div className="feedback-banner is-success" style={{ marginBottom: '14px' }}>
                <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '0.84rem', fontWeight: 600 }}>{feedbackSuccess}</div>
                <button
                  type="button"
                  onClick={() => {
                    if (setFeedbackSuccess) setFeedbackSuccess('');
                    setActiveModalTab('history');
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(5, 150, 105, 0.35)',
                    color: '#047857',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Track Status
                </button>
              </div>
            )}

            {feedbackError && (
              <div className="feedback-banner is-error" style={{ marginBottom: '14px' }}>
                <AlertCircle size={17} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{feedbackError}</span>
              </div>
            )}

            <div className="feedback-form-group">
              <label className="feedback-form-label">Category</label>
              <div className="feedback-type-select">
                <button
                  type="button"
                  className={`feedback-type-option ${feedbackType === 'suggestion' ? 'active' : ''}`}
                  onClick={() => { if (playCyberSound) playCyberSound('click'); setFeedbackType('suggestion'); }}
                >
                  Suggestion
                </button>
                <button
                  type="button"
                  className={`feedback-type-option ${feedbackType === 'bug' ? 'active' : ''}`}
                  onClick={() => { if (playCyberSound) playCyberSound('click'); setFeedbackType('bug'); }}
                >
                  Report Bug
                </button>
                <button
                  type="button"
                  className={`feedback-type-option ${feedbackType === 'general' ? 'active' : ''}`}
                  onClick={() => { if (playCyberSound) playCyberSound('click'); setFeedbackType('general'); }}
                >
                  General
                </button>
              </div>
            </div>

            <div className="feedback-form-group">
              <label className="feedback-form-label">Experience Rating ({feedbackRating}/5)</label>
              <div className="feedback-rating-container">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Rate ${star} stars`}
                    className={`feedback-star-btn ${star <= feedbackRating ? 'active' : ''}`}
                    onClick={() => {
                      if (playCyberSound) playCyberSound('click');
                      setFeedbackRating(star);
                    }}
                  >
                    <Star
                      size={26}
                      fill={star <= feedbackRating ? '#d97706' : 'none'}
                      stroke={star <= feedbackRating ? '#b45309' : '#c9bfa9'}
                      strokeWidth={2}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="feedback-form-group">
              <label className="feedback-form-label">Message</label>
              <textarea
                className="feedback-textarea"
                placeholder="Tell us what works well, what needs fixing, or any improvement request..."
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                disabled={submittingFeedback}
                maxLength={1000}
              />
            </div>

            <button
              type="submit"
              className="feedback-submit-btn"
              disabled={submittingFeedback || !feedbackMessage.trim()}
            >
              <Send size={15} />
              <span>{submittingFeedback ? 'Submitting...' : 'Submit Feedback'}</span>
            </button>
          </form>
        ) : (
          <div className="feedback-history-list">
            {isLoadingMyFeedbacks ? (
              <div style={{ padding: '28px 12px', textAlign: 'center', color: '#6b5b3e', fontSize: '0.86rem' }}>
                Loading your submitted feedback...
              </div>
            ) : myFeedbacks.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: '#6b5b3e', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                <Clock size={26} style={{ color: '#9c8b6e' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2b2112' }}>No feedback submitted yet</span>
                <span style={{ fontSize: '0.78rem' }}>Share your thoughts and you can track Admin review replies right here.</span>
                <button
                  type="button"
                  className="feedback-submit-btn"
                  style={{ width: 'auto', padding: '9px 18px', fontSize: '0.82rem', marginTop: '4px' }}
                  onClick={() => setActiveModalTab('submit')}
                >
                  Write Feedback
                </button>
              </div>
            ) : (
              myFeedbacks.map((item) => {
                const stKey = (item.status || 'pending').toLowerCase();
                const stMeta = STATUS_META[stKey] || STATUS_META.pending;
                const typeKey = (item.type || 'general').toLowerCase();
                const typeMeta = TYPE_META[typeKey] || TYPE_META.general;
                return (
                  <div key={item.id} className="feedback-history-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: typeMeta.bg, color: typeMeta.color }}>
                          {typeMeta.label}
                        </span>
                        <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, background: stMeta.bg, color: stMeta.color, border: `1px solid ${stMeta.border}` }}>
                          {stMeta.label}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#6b5b3e', fontWeight: 600 }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', margin: '6px 0' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={13}
                          fill={star <= item.rating ? '#d97706' : 'none'}
                          stroke={star <= item.rating ? '#b45309' : '#c9bfa9'}
                          strokeWidth={2}
                        />
                      ))}
                    </div>

                    <p style={{ margin: 0, fontSize: '0.86rem', color: '#25231f', lineHeight: 1.45, overflowWrap: 'anywhere' }}>
                      {item.message}
                    </p>

                    {(item.admin_reply || item.reviewed_by) && (
                      <div className="feedback-admin-reply-box">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 800, color: '#6e4e1c', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            <ShieldCheck size={13} />
                            Admin Review {item.reviewed_by ? `• ${item.reviewed_by}` : ''}
                          </span>
                          {item.reviewed_at && (
                            <span style={{ fontSize: '0.68rem', color: '#7b6b4f' }}>
                              {new Date(item.reviewed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {item.admin_reply ? (
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#2b2112', lineHeight: 1.4, overflowWrap: 'anywhere' }}>
                            {item.admin_reply}
                          </p>
                        ) : (
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b5b3e', fontStyle: 'italic' }}>
                            Marked as {stMeta.label} by Admin.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
