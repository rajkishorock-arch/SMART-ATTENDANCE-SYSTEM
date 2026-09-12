import React, { useState, useEffect, useCallback } from 'react';
import { 
  ScanFace, UserCheck, UserX, AlertTriangle, CheckCircle2, 
  Filter, ArrowRightLeft, ShieldAlert, RefreshCw, Clock, 
  Calendar, Camera, X, MessageSquare, ExternalLink
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

export default function LowConfidenceReviewQueue({
  token,
  currentUser,
  playCyberSound = () => {}
}) {
  const [reviews, setReviews] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reassign Modal State
  const [reassignModalItem, setReassignModalItem] = useState(null);
  const [reassignRoll, setReassignRoll] = useState('');
  const [reassignComment, setReassignComment] = useState('');
  const [isSubmittingReassign, setIsSubmittingReassign] = useState(false);

  // Resolution loading state map { [reviewId]: boolean }
  const [resolvingIds, setResolvingIds] = useState({});

  const fetchQueue = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const url = statusFilter === 'ALL'
        ? `${API_BASE_URL}/review-queue`
        : `${API_BASE_URL}/review-queue?status=${statusFilter}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Queue fetch failed (${res.status})`);
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      setErrorMsg(err.message || 'Error loading low-confidence review queue.');
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // ── Handle Quick Action (CONFIRM / REJECT) ──────────────────────────────────
  const handleResolve = async (reviewId, action, comment = '') => {
    setResolvingIds(prev => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/review-queue/${reviewId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, comment })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Resolution failed.');
      }
      playCyberSound(action === 'CONFIRM' ? 'success' : 'click');
      setSuccessMsg(
        action === 'CONFIRM'
          ? 'Match confirmed! Student attendance marked as Present.'
          : 'Match rejected. Detection flagged as false positive.'
      );
      fetchQueue();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setResolvingIds(prev => ({ ...prev, [reviewId]: false }));
    }
  };

  // ── Handle Reassign Submit ─────────────────────────────────────────────────
  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!reassignRoll.trim()) {
      setErrorMsg('Target student roll number is required.');
      return;
    }
    setIsSubmittingReassign(true);
    try {
      const res = await fetch(`${API_BASE_URL}/review-queue/${reassignModalItem.id}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'REASSIGN',
          reassign_to_roll: reassignRoll.trim(),
          comment: reassignComment.trim()
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Reassignment failed.');
      }
      playCyberSound('success');
      setSuccessMsg(`Attendance reassigned to student roll: ${reassignRoll.trim()}`);
      setReassignModalItem(null);
      setReassignRoll('');
      setReassignComment('');
      fetchQueue();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsSubmittingReassign(false);
    }
  };

  return (
    <div className="review-queue-container" style={{
      color: '#f8fafc',
      padding: '24px',
      maxWidth: '1280px',
      margin: '0 auto',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.75) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(12px)',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '10px',
                padding: '8px',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ScanFace size={22} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
                Low-Confidence Face Match Review Queue
              </h2>
              <span style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '16px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                Phase 5 QA Staging
              </span>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem', maxWidth: '750px', lineHeight: 1.5 }}>
              Borderline facial matches (similarity 0.35 to 0.49) captured by scanning kiosks are safely held in 
              this review queue to eliminate false positives before attendance is officially committed.
            </p>
          </div>

          <button
            onClick={() => { playCyberSound('click'); fetchQueue(); }}
            disabled={isLoading}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              padding: '10px 18px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem',
              fontWeight: 600
            }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Toast Messages */}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
          padding: '12px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem'
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '12px',
        overflowX: 'auto'
      }}>
        {['PENDING', 'CONFIRMED', 'REASSIGNED', 'REJECTED', 'ALL'].map(tab => (
          <button
            key={tab}
            onClick={() => { playCyberSound('click'); setStatusFilter(tab); }}
            style={{
              background: statusFilter === tab ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              border: statusFilter === tab ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid transparent',
              color: statusFilter === tab ? '#fbbf24' : '#94a3b8',
              padding: '6px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab === 'PENDING' ? 'Pending Review' : tab}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div style={{
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px dashed rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <ScanFace size={40} style={{ opacity: 0.35, marginBottom: '12px' }} />
          <h4 style={{ margin: '0 0 6px 0', color: '#94a3b8', fontSize: '1.1rem' }}>
            No {statusFilter === 'PENDING' ? 'Pending' : ''} Staged Matches
          </h4>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            All camera scanner recognitions are currently operating above the high-confidence threshold.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '18px'
        }}>
          {reviews.map(item => {
            const isResolving = resolvingIds[item.id];
            const pct = Math.round(item.similarity_score * 100);

            return (
              <div
                key={item.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: item.status === 'PENDING' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ margin: '0 0 3px 0', fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                        {item.candidate_name}
                      </h3>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Roll: {item.candidate_roll}</span>
                    </div>

                    <span style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      color: '#fbbf24',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px'
                    }}>
                      {pct}% Match
                    </span>
                  </div>

                  {/* Metadata Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      color: '#cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Calendar size={12} /> {item.date}
                    </span>

                    {item.session_time && (
                      <span style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        color: '#cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Clock size={12} /> {item.session_time}
                      </span>
                    )}

                    {item.subject_name && (
                      <span style={{
                        background: 'rgba(0, 242, 254, 0.1)',
                        border: '1px solid rgba(0, 242, 254, 0.25)',
                        fontSize: '0.75rem',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        color: '#00f2fe'
                      }}>
                        {item.subject_name}
                      </span>
                    )}
                  </div>

                  {/* Status Indicator */}
                  {item.status !== 'PENDING' && (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      fontSize: '0.8rem',
                      background: item.status === 'CONFIRMED' 
                        ? 'rgba(16, 185, 129, 0.1)' 
                        : item.status === 'REASSIGNED' 
                        ? 'rgba(168, 85, 247, 0.1)' 
                        : 'rgba(239, 68, 68, 0.1)',
                      border: item.status === 'CONFIRMED' 
                        ? '1px solid rgba(16, 185, 129, 0.3)' 
                        : item.status === 'REASSIGNED' 
                        ? '1px solid rgba(168, 85, 247, 0.3)' 
                        : '1px solid rgba(239, 68, 68, 0.3)',
                      color: item.status === 'CONFIRMED' ? '#34d399' : item.status === 'REASSIGNED' ? '#c084fc' : '#f87171'
                    }}>
                      Status: <strong>{item.status}</strong> by {item.reviewed_by}
                      {item.reviewer_comment && <div>Note: {item.reviewer_comment}</div>}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons (Pending only) */}
                {item.status === 'PENDING' && (
                  <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '14px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px'
                  }}>
                    {/* Confirm Button */}
                    <button
                      disabled={isResolving}
                      onClick={() => handleResolve(item.id, 'CONFIRM', 'Confirmed visually by teacher')}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: '#fff',
                        padding: '8px 4px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isResolving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 10px rgba(16, 185, 129, 0.25)'
                      }}
                    >
                      <UserCheck size={14} />
                      Confirm
                    </button>

                    {/* Reassign Button */}
                    <button
                      disabled={isResolving}
                      onClick={() => {
                        playCyberSound('click');
                        setReassignModalItem(item);
                        setReassignRoll('');
                        setReassignComment('');
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                        border: 'none',
                        color: '#fff',
                        padding: '8px 4px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isResolving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 10px rgba(168, 85, 247, 0.25)'
                      }}
                    >
                      <ArrowRightLeft size={14} />
                      Reassign
                    </button>

                    {/* Reject Button */}
                    <button
                      disabled={isResolving}
                      onClick={() => handleResolve(item.id, 'REJECT', 'Rejected: false face detection')}
                      style={{
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        border: 'none',
                        color: '#fff',
                        padding: '8px 4px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isResolving ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 10px rgba(239, 68, 68, 0.25)'
                      }}
                    >
                      <UserX size={14} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: REASSIGN TO ANOTHER STUDENT */}
      {reassignModalItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
            position: 'relative'
          }}>
            <button
              onClick={() => setReassignModalItem(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <ArrowRightLeft size={22} color="#c084fc" />
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Reassign Face Detection</h3>
            </div>

            <p style={{ margin: '0 0 16px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
              Candidate detected as: <strong>{reassignModalItem.candidate_name}</strong> ({reassignModalItem.candidate_roll}).
              Specify the student to whom this attendance record should be credited.
            </p>

            <form onSubmit={handleReassignSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  Target Student Roll Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026CS042"
                  value={reassignRoll}
                  onChange={e => setReassignRoll(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  Reason / Reviewer Note
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Verified seating chart; face matches Rahul Sharma"
                  value={reassignComment}
                  onChange={e => setReassignComment(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setReassignModalItem(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingReassign}
                  style={{
                    background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: isSubmittingReassign ? 'not-allowed' : 'pointer'
                  }}
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
