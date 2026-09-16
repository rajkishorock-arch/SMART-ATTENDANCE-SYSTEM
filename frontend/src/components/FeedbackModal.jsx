import { CheckCircle2, AlertCircle } from 'lucide-react';
import useUI from '../hooks/useUI';

export default function FeedbackModal({ feedbackState }) {
  const { playCyberSound } = useUI();

  if (!feedbackState || !feedbackState.showFeedbackModal) return null;

  const {
    setShowFeedbackModal,
    feedbackType,
    setFeedbackType,
    feedbackRating,
    setFeedbackRating,
    feedbackMessage,
    setFeedbackMessage,
    feedbackSuccess,
    feedbackError,
    submittingFeedback,
    handleFeedbackSubmit,
  } = feedbackState;

  return (
    <div className="feedback-modal-overlay" onClick={() => setShowFeedbackModal(false)}>
      <div className="feedback-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h2 className="feedback-modal-title">Share Your Feedback</h2>
          <button 
            type="button"
            className="feedback-modal-close" 
            onClick={() => {
              if (playCyberSound) playCyberSound('click');
              setShowFeedbackModal(false);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleFeedbackSubmit}>
          {feedbackSuccess && (
            <div className="alert alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} />
              <span style={{ fontSize: '0.9rem' }}>{feedbackSuccess}</span>
            </div>
          )}

          {feedbackError && (
            <div className="alert alert-danger" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '0.9rem' }}>{feedbackError}</span>
            </div>
          )}

          <div className="feedback-form-group">
            <label className="feedback-form-label">Category</label>
            <div className="feedback-type-select">
              <div 
                className={`feedback-type-option ${feedbackType === 'suggestion' ? 'active' : ''}`}
                onClick={() => { if (playCyberSound) playCyberSound('click'); setFeedbackType('suggestion'); }}
              >
                Suggestion
              </div>
              <div 
                className={`feedback-type-option ${feedbackType === 'bug' ? 'active' : ''}`}
                onClick={() => { if (playCyberSound) playCyberSound('click'); setFeedbackType('bug'); }}
              >
                Report Bug
              </div>
              <div 
                className={`feedback-type-option ${feedbackType === 'general' ? 'active' : ''}`}
                onClick={() => { if (playCyberSound) playCyberSound('click'); setFeedbackType('general'); }}
              >
                General
              </div>
            </div>
          </div>

          <div className="feedback-form-group">
            <label className="feedback-form-label">Rating</label>
            <div className="feedback-rating-container">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`feedback-star-btn ${star <= feedbackRating ? 'active' : ''}`}
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    setFeedbackRating(star);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <svg 
                    width="30" 
                    height="30" 
                    viewBox="0 0 24 24" 
                    fill={star <= feedbackRating ? "#fbbf24" : "none"} 
                    stroke={star <= feedbackRating ? "#fbbf24" : "rgba(255, 255, 255, 0.2)"} 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ transition: 'transform 0.1s' }}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className="feedback-form-group">
            <label className="feedback-form-label">Message</label>
            <textarea
              className="feedback-textarea"
              placeholder="Tell us what is working well, what needs adjustment, or what features you would love to see next..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              disabled={submittingFeedback || !!feedbackSuccess}
              maxLength={1000}
            />
          </div>

          <button 
            type="submit" 
            className="feedback-submit-btn"
            disabled={submittingFeedback || !!feedbackSuccess || !feedbackMessage.trim()}
            style={{ marginTop: '8px' }}
          >
            {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}
