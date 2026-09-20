import { useState, useEffect, useCallback } from 'react';
import useAuth from './useAuth';
import useUI from './useUI';
import { getApiBaseUrl } from '../utils/platform';
import { systemApi } from '../api/systemApi.js';

export default function useFeedback() {
  const { currentUser, userRole, token } = useAuth();
  const { playCyberSound } = useUI();

  const API_BASE_URL = getApiBaseUrl();

  // Feedback Form States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState('suggestion'); // 'bug', 'suggestion', 'general'
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);

  // Fetch Feedbacks (Admins Only)
  const fetchFeedbacks = useCallback(async (authToken, role) => {
    const isDemoMode = localStorage.getItem('isDemoMode') === 'true';
    if (isDemoMode) return;
    const usedToken = authToken || token;
    const usedRole = role || userRole;
    if (!usedToken || usedRole !== 'admin') return;
    setIsLoadingFeedbacks(true);
    try {
      const res = await systemApi.fetchFeedbacks(usedToken);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data);
      }
    } catch (err) {
      console.error('Error fetching feedbacks:', err);
    } finally {
      setIsLoadingFeedbacks(false);
    }
  }, [token, userRole]);

  // Load feedbacks for admin on login/token change
  useEffect(() => {
    let isMounted = true;
    if (token && userRole === 'admin') {
      const load = async () => {
        const isDemo = localStorage.getItem('isDemoMode') === 'true';
        if (isDemo) return;
        try {
          const res = await systemApi.fetchFeedbacks(token);
          if (res.ok && isMounted) {
            const data = await res.json();
            setFeedbacks(data);
          }
        } catch (err) {
          console.error('Error loading feedbacks:', err);
        }
      };
      load();
    }
    return () => { isMounted = false; };
  }, [token, userRole]);

  // Submit Feedback Form
  const handleFeedbackSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!feedbackMessage.trim()) {
      setFeedbackError('Please enter your feedback message.');
      return;
    }
    setSubmittingFeedback(true);
    setFeedbackError('');
    setFeedbackSuccess('');

    const isDemoMode = localStorage.getItem('isDemoMode') === 'true';
    if (isDemoMode) {
      setTimeout(() => {
        setFeedbackSuccess('SIMULATOR ACTION: Feedback submitted successfully (Read-Only Demo Mode).');
        setFeedbackMessage('');
        setSubmittingFeedback(false);
        const newFb = {
          id: Date.now(),
          user_id: 999,
          user_email: currentUser?.email || 'guest@smartattendance.io',
          role: userRole || 'admin',
          type: feedbackType,
          rating: feedbackRating,
          message: feedbackMessage,
          created_at: new Date().toISOString()
        };
        setFeedbacks((prev) => [newFb, ...prev]);
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackSuccess('');
        }, 1500);
      }, 600);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/feedbacks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: feedbackType,
          rating: feedbackRating,
          message: feedbackMessage
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (playCyberSound) playCyberSound('success');
        setFeedbackSuccess('Thank you! Your feedback has been submitted successfully.');
        setFeedbackMessage('');
        setFeedbackRating(5);
        setFeedbackType('suggestion');
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackSuccess('');
        }, 2200);
      } else {
        if (playCyberSound) playCyberSound('error');
        setFeedbackError(data.detail || 'Failed to submit feedback.');
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
      if (playCyberSound) playCyberSound('error');
      setFeedbackError('Network error. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  }, [feedbackMessage, feedbackType, feedbackRating, token, currentUser, userRole, playCyberSound, API_BASE_URL]);

  return {
    showFeedbackModal,
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
    setFeedbackError,
    submittingFeedback,
    setSubmittingFeedback,
    feedbacks,
    setFeedbacks,
    isLoadingFeedbacks,
    setIsLoadingFeedbacks,
    fetchFeedbacks,
    handleFeedbackSubmit,
  };
}
