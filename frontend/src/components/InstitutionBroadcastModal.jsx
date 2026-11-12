import { useState } from 'react';
import { 
  Megaphone, 
  X, 
  Send, 
  Users, 
  GraduationCap, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  ShieldAlert
} from 'lucide-react';
import { notificationApi } from '../api/notificationApi.js';
import useUI from '../hooks/useUI';

export default function InstitutionBroadcastModal({
  isOpen,
  onClose,
  token,
  onBroadcastSuccess = () => {}
}) {
  const { playCyberSound } = useUI();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('ANNOUNCEMENT');
  const [targetRoles, setTargetRoles] = useState(['student', 'teacher', 'parent']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  if (!isOpen) return null;

  const toggleRole = (role) => {
    if (playCyberSound) playCyberSound('click');
    setTargetRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role) 
        : [...prev, role]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFeedback({ type: 'error', text: 'Please enter both an announcement title and message.' });
      return;
    }
    if (targetRoles.length === 0) {
      setFeedback({ type: 'error', text: 'Please select at least one recipient audience role.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    if (playCyberSound) playCyberSound('click');

    try {
      const res = await notificationApi.broadcastAnnouncement(token, {
        title: title.trim(),
        message: message.trim(),
        category,
        target_roles: targetRoles
      });

      let data = res;
      let isOk = res && (res.ok || res.status === 200);

      if (res && typeof res.json === 'function') {
        try {
          data = await res.json();
          isOk = res.ok;
        } catch {
          data = {};
        }
      }

      if (isOk) {
        setFeedback({ 
          type: 'success', 
          text: data?.detail || data?.message || 'Broadcast announcement dispatched to all selected channels!' 
        });
        if (playCyberSound) playCyberSound('success');
        if (onBroadcastSuccess) {
          try {
            onBroadcastSuccess(data);
          } catch (cbErr) {
            console.warn('onBroadcastSuccess callback error:', cbErr);
          }
        }
        setTimeout(() => {
          setTitle('');
          setMessage('');
          setFeedback(null);
          onClose();
        }, 1200);
      } else {
        const errorText = data?.detail || data?.message || (res?.status === 401 ? 'Session expired or invalid. Please sign in again.' : 'Failed to dispatch broadcast announcement.');
        setFeedback({ type: 'error', text: errorText });
        if (playCyberSound) playCyberSound('error');
      }
    } catch (err) {
      console.warn('Broadcast dispatch error:', err);
      const errMsg = err?.message || 'Broadcast service temporarily unavailable. Saved offline.';
      setFeedback({ type: 'error', text: errMsg });
      if (playCyberSound) playCyberSound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-in-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1d4ed8'
            }}>
              <Megaphone size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Campus Broadcast
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>
                Instant notice across selected roles
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#64748b',
              padding: '6px',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {feedback && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
              color: feedback.type === 'success' ? '#065f46' : '#dc2626',
              fontSize: '0.84rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Announcement Category */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Announcement Type:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'ANNOUNCEMENT', label: '📢 Notice', color: '#2563eb', bg: '#eff6ff' },
                { id: 'HOLIDAY', label: '🏖️ Holiday', color: '#d97706', bg: '#fffbeb' },
                { id: 'EMERGENCY', label: '🚨 Urgent Alert', color: '#dc2626', bg: '#fef2f2' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => { setCategory(cat.id); if (playCyberSound) playCyberSound('click'); }}
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: category === cat.id ? `1.5px solid ${cat.color}` : '1px solid #e2e8f0',
                    background: category === cat.id ? cat.bg : '#ffffff',
                    color: category === cat.id ? cat.color : '#64748b',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              Recipient Audience:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { role: 'student', label: 'Students', icon: GraduationCap },
                { role: 'teacher', label: 'Teachers & Staff', icon: Users },
                { role: 'parent', label: 'Parents / Guardians', icon: UserCheck },
              ].map(t => {
                const isSelected = targetRoles.includes(t.role);
                const Icon = t.icon;
                return (
                  <button
                    key={t.role}
                    type="button"
                    onClick={() => toggleRole(t.role)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '20px',
                      border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                      background: isSelected ? '#eff6ff' : '#f8fafc',
                      color: isSelected ? '#1d4ed8' : '#64748b',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <Icon size={14} />
                    <span>{t.label}</span>
                    <span style={{ fontSize: '0.75rem', marginLeft: '2px' }}>{isSelected ? '✓' : '+'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Announcement Title:
            </label>
            <input 
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Tomorrow is a Holiday due to Rain / Timetable Change"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid #e2e8f0',
                background: '#ffffff',
                fontSize: '0.88rem',
                color: '#0f172a',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Message */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
              Detailed Message:
            </label>
            <textarea
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write the complete notice or emergency instructions here..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid #e2e8f0',
                background: '#ffffff',
                fontSize: '0.88rem',
                color: '#0f172a',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                padding: '10px 22px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Sending...' : 'Send Broadcast'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
