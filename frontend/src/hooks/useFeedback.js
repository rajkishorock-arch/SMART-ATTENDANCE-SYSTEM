import { useState, useEffect, useCallback } from 'react';
import useAuth from './useAuth';
import useUI from './useUI';
import { systemApi } from '../api/systemApi.js';

export default function useFeedback() {
  const { currentUser, userRole, token } = useAuth();
  const { playCyberSound } = useUI();

  // Feedback Form & Review States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState('suggestion'); // 'bug', 'suggestion', 'general'
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [isLoadingMyFeedbacks, setIsLoadingMyFeedbacks] = useState(false);

  // Fetch All Feedbacks (Admins Only)
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

  // Fetch Current User's Submitted Feedbacks & Admin Replies
  const fetchMyFeedbacks = useCallback(async (authToken) => {
    const isDemoMode = localStorage.getItem('isDemoMode') === 'true';
    if (isDemoMode) {
      setMyFeedbacks((prev) => (prev.length > 0 ? prev : [
        {
          id: 901,
          user_id: currentUser?.details?.id || 1,
          user_email: currentUser?.email || 'demo@smartattendance.io',
          role: userRole || 'student',
          type: 'suggestion',
          rating: 5,
          message: 'Golden Gate macOS layout feels clean and responsive.',
          status: 'resolved',
          admin_reply: 'Thank you! We appreciate your feedback and rolled out the streamlined layout update.',
          reviewed_by: 'System Admin',
          reviewed_at: new Date().toISOString(),
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ]));
      return;
    }
    const usedToken = authToken || token;
    if (!usedToken) return;
    setIsLoadingMyFeedbacks(true);
    try {
      const res = await systemApi.fetchMyFeedbacks(usedToken);
      if (res.ok) {
        const data = await res.json();
        setMyFeedbacks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching my feedbacks:', err);
    } finally {
      setIsLoadingMyFeedbacks(false);
    }
  }, [token, currentUser, userRole]);

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

  // Load personal feedbacks asynchronously whenever modal opens
  useEffect(() => {
    let isMounted = true;
    if (showFeedbackModal && token) {
      const loadMine = async () => {
        const isDemo = localStorage.getItem('isDemoMode') === 'true';
        if (isDemo) {
          if (isMounted) {
            setMyFeedbacks((prev) => (prev.length > 0 ? prev : [
              {
                id: 901,
                user_id: currentUser?.details?.id || 1,
                user_email: currentUser?.email || 'demo@smartattendance.io',
                role: userRole || 'student',
                type: 'suggestion',
                rating: 5,
                message: 'Golden Gate macOS layout feels clean and responsive.',
                status: 'resolved',
                admin_reply: 'Thank you! We appreciate your feedback and rolled out the streamlined layout update.',
                reviewed_by: 'System Admin',
                reviewed_at: new Date().toISOString(),
                created_at: new Date(Date.now() - 86400000).toISOString()
              }
            ]));
          }
          return;
        }
        try {
          const res = await systemApi.fetchMyFeedbacks(token);
          if (res.ok && isMounted) {
            const data = await res.json();
            setMyFeedbacks(Array.isArray(data) ? data : []);
          }
        } catch (err) {
          console.error('Error fetching my feedbacks:', err);
        }
      };
      loadMine();
    }
    return () => { isMounted = false; };
  }, [showFeedbackModal, token, currentUser, userRole]);

  // Submit Feedback Form
  const handleFeedbackSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    const cleanMsg = feedbackMessage.trim();
    if (!cleanMsg) {
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
          user_id: currentUser?.details?.id || 999,
          user_email: currentUser?.email || 'guest@smartattendance.io',
          role: userRole || 'admin',
          type: feedbackType,
          rating: feedbackRating,
          message: cleanMsg,
          status: 'pending',
          admin_reply: null,
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date().toISOString()
        };
        setFeedbacks((prev) => [newFb, ...prev]);
        setMyFeedbacks((prev) => [newFb, ...prev]);
      }, 450);
      return;
    }

    try {
      const res = await systemApi.submitFeedback(token, {
        type: feedbackType,
        rating: feedbackRating,
        message: cleanMsg
      });
      const data = await res.json();
      if (res.ok) {
        if (playCyberSound) playCyberSound('success');
        setFeedbackSuccess('Thank you! Your feedback has been submitted for review.');
        setFeedbackMessage('');
        setFeedbackRating(5);
        setFeedbackType('suggestion');
        setMyFeedbacks((prev) => [data, ...prev]);
        if (userRole === 'admin') {
          setFeedbacks((prev) => [data, ...prev]);
        }
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
  }, [feedbackMessage, feedbackType, feedbackRating, token, currentUser, userRole, playCyberSound]);

  // Admin Review & Reply Handler
  const reviewFeedback = useCallback(async (feedbackId, { status, admin_reply }) => {
    const cleanReply = (admin_reply || '').trim() || null;
    const isDemoMode = localStorage.getItem('isDemoMode') === 'true';
    if (isDemoMode) {
      const updater = (list) => list.map((item) => (
        item.id === feedbackId
          ? {
              ...item,
              status,
              admin_reply: cleanReply,
              reviewed_by: currentUser?.name || currentUser?.email || 'Demo Admin',
              reviewed_at: new Date().toISOString()
            }
          : item
      ));
      setFeedbacks(updater);
      setMyFeedbacks(updater);
      if (playCyberSound) playCyberSound('success');
      return { ok: true };
    }

    if (!token) {
      return { ok: false, detail: 'Authentication required.' };
    }

    try {
      const res = await systemApi.reviewFeedback(token, feedbackId, {
        status,
        admin_reply: cleanReply
      });
      const data = await res.json();
      if (!res.ok) {
        if (playCyberSound) playCyberSound('error');
        return { ok: false, detail: data?.detail || 'Failed to save feedback review.' };
      }
      const mergeUpdated = (list) => list.map((item) => (item.id === feedbackId ? data : item));
      setFeedbacks(mergeUpdated);
      setMyFeedbacks(mergeUpdated);
      if (playCyberSound) playCyberSound('success');
      return { ok: true, data };
    } catch (err) {
      console.error('Error reviewing feedback:', err);
      if (playCyberSound) playCyberSound('error');
      return { ok: false, detail: 'Network error while saving review.' };
    }
  }, [token, currentUser, playCyberSound]);

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
    myFeedbacks,
    setMyFeedbacks,
    isLoadingMyFeedbacks,
    fetchMyFeedbacks,
    reviewFeedback,
    handleFeedbackSubmit,
  };
}
