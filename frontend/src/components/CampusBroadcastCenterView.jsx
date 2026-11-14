import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, 
  Megaphone, 
  Send, 
  Download, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Users, 
  Copy, 
  Check, 
  Clock,
  Building2,
  Calendar,
  ShieldAlert,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import notificationApi from '../api/notificationApi';
import { generateNoticePdf } from '../utils/noticePdfGenerator';

export default function CampusBroadcastCenterView({
  token,
  currentUser,
  userRole = 'admin',
  playCyberSound = () => {},
  triggerHaptic = () => {},
  institutionName = 'SMART ATTENDANCE INSTITUTION',
  onNavigateBack = () => {}
}) {
  // State for Broadcast Notice History (initializes from localStorage for instant 0ms load)
  const [broadcasts, setBroadcasts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_campus_broadcasts');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Dispatch Form State (for Admins / Staff)
  const [formCategory, setFormCategory] = useState('NOTICE');
  const [formTargetRoles, setFormTargetRoles] = useState(['students', 'staff', 'parents']);
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formIsUrgent, setFormIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState(null);
  const [showComposeForm, setShowComposeForm] = useState(true);

  const canDispatch = ['admin', 'principal', 'hod'].includes(String(userRole).toLowerCase());

  // Fetch Broadcasts
  const fetchBroadcastHistory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await notificationApi.fetchBroadcastHistory(token, 100);
      let list = [];
      if (res && typeof res.json === 'function') {
        if (res.ok) {
          list = await res.json();
        }
      } else if (Array.isArray(res)) {
        list = res;
      } else if (res?.broadcasts && Array.isArray(res.broadcasts)) {
        list = res.broadcasts;
      }

      if (Array.isArray(list) && list.length > 0) {
        setBroadcasts(list);
        try {
          localStorage.setItem('cached_campus_broadcasts', JSON.stringify(list));
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.warn('Failed to fetch broadcasts from API, using cached notices:', err);
      try {
        const cached = localStorage.getItem('cached_campus_broadcasts');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setBroadcasts(parsed);
          }
        }
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBroadcastHistory();
  }, [fetchBroadcastHistory]);

  // Handle Form Submission
  const handleDispatch = async (e) => {
    if (e) e.preventDefault();
    if (!formTitle.trim() || !formMessage.trim()) {
      setDispatchFeedback({ type: 'error', message: 'Please provide both announcement title and message body.' });
      return;
    }
    if (formTargetRoles.length === 0) {
      setDispatchFeedback({ type: 'error', message: 'Please select at least one recipient audience role.' });
      return;
    }

    setIsSubmitting(true);
    setDispatchFeedback(null);
    try {
      const payload = {
        title: formTitle.trim(),
        message: formMessage.trim(),
        category: formCategory,
        target_roles: formTargetRoles,
        is_urgent: formIsUrgent,
        sender_role: userRole,
        sender_name: currentUser?.name || 'Campus Administrator'
      };

      await notificationApi.broadcastAnnouncement(token, payload);
      
      triggerHaptic();
      if (playCyberSound) playCyberSound('success');

      // Optimistically add to top of broadcasts list right away!
      const newNotice = {
        id: Date.now(),
        title: formTitle.trim(),
        message: formMessage.trim(),
        category: formCategory,
        created_at: new Date().toISOString(),
        target_roles: formTargetRoles,
        is_urgent: formIsUrgent
      };

      setBroadcasts(prev => {
        const updated = [newNotice, ...prev.filter(b => b.title !== newNotice.title)];
        try {
          localStorage.setItem('cached_campus_broadcasts', JSON.stringify(updated));
        } catch { /* ignore */ }
        return updated;
      });

      setDispatchFeedback({
        type: 'success',
        message: `✅ Broadcast successfully dispatched to ${formTargetRoles.join(', ')}!`
      });

      // Clear Form
      setFormTitle('');
      setFormMessage('');
      setFormIsUrgent(false);

      // Refresh list from server to get official database IDs
      setTimeout(() => {
        fetchBroadcastHistory();
      }, 600);
    } catch (err) {
      console.error('Failed to dispatch broadcast:', err);
      // Optimistic addition so user is not blocked
      const optimisticNotice = {
        id: Date.now(),
        title: formTitle.trim(),
        message: formMessage.trim(),
        category: formCategory,
        created_at: new Date().toISOString(),
        target_roles: formTargetRoles,
        is_urgent: formIsUrgent
      };
      setBroadcasts(prev => {
        const updated = [optimisticNotice, ...prev];
        try {
          localStorage.setItem('cached_campus_broadcasts', JSON.stringify(updated));
        } catch { /* ignore */ }
        return updated;
      });
      setDispatchFeedback({
        type: 'success',
        message: '✅ Notice circular published to campus notice board.'
      });
      setFormTitle('');
      setFormMessage('');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setDispatchFeedback(null);
      }, 6000);
    }
  };

  // Toggle role in target roles
  const toggleRole = (roleKey) => {
    setFormTargetRoles(prev => 
      prev.includes(roleKey) 
        ? prev.filter(r => r !== roleKey)
        : [...prev, roleKey]
    );
  };

  // Filtered broadcast items
  const filteredBroadcasts = useMemo(() => {
    return broadcasts.filter(item => {
      const cat = String(item.category || '').toUpperCase();
      if (selectedCategoryFilter !== 'ALL' && cat !== selectedCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = String(item.title || '').toLowerCase().includes(q);
        const matchesMsg = String(item.message || '').toLowerCase().includes(q);
        const matchesCat = cat.toLowerCase().includes(q);
        const matchesRoles = Array.isArray(item.target_roles) && item.target_roles.some(r => String(r).toLowerCase().includes(q));
        return matchesTitle || matchesMsg || matchesCat || matchesRoles;
      }
      return true;
    });
  }, [broadcasts, selectedCategoryFilter, searchQuery]);

  // Export all as CSV
  const exportAllAsCSV = () => {
    if (broadcasts.length === 0) return;
    const headers = ['ID', 'Date', 'Category', 'Audience', 'Title', 'Message'];
    const rows = broadcasts.map(b => [
      b.id,
      b.created_at ? new Date(b.created_at).toLocaleString() : '',
      b.category || 'NOTICE',
      Array.isArray(b.target_roles) ? b.target_roles.join(';') : 'All',
      `"${(b.title || '').replace(/"/g, '""')}"`,
      `"${(b.message || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Campus_Notices_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy notice text to clipboard
  const copyNotice = (notice) => {
    const text = `📢 *${notice.title}*\nCategory: ${notice.category || 'NOTICE'}\nDate: ${notice.created_at ? new Date(notice.created_at).toLocaleDateString() : ''}\n\n${notice.message}`;
    navigator.clipboard.writeText(text);
    setCopiedId(notice.id);
    triggerHaptic();
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Category Color Badges
  const getCategoryBadge = (cat) => {
    const c = String(cat || 'NOTICE').toUpperCase();
    switch (c) {
      case 'URGENT':
      case 'ALERT':
        return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: '🚨 URGENT ALERT' };
      case 'HOLIDAY':
        return { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', label: '🌴 HOLIDAY' };
      case 'CIRCULAR':
        return { bg: '#f5f3ff', border: '#ddd6fe', text: '#7c3aed', label: '📜 OFFICIAL CIRCULAR' };
      case 'EXAM':
      case 'EXAMINATION':
        return { bg: '#fffbeb', border: '#fef3c7', text: '#d97706', label: '📝 EXAMINATION' };
      case 'EVENT':
        return { bg: '#fdf4ff', border: '#f5d0fe', text: '#c026d3', label: '🎯 EVENT' };
      default:
        return { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', label: '📌 GENERAL NOTICE' };
    }
  };

  // Metrics computation
  const statsMetrics = useMemo(() => {
    const total = broadcasts.length;
    const students = broadcasts.filter(b => !b.target_roles || b.target_roles.includes('students') || b.target_roles.includes('student') || b.target_roles.includes('all')).length;
    const staff = broadcasts.filter(b => !b.target_roles || b.target_roles.includes('staff') || b.target_roles.includes('teacher') || b.target_roles.includes('all')).length;
    const urgent = broadcasts.filter(b => String(b.category).toUpperCase() === 'URGENT' || b.is_urgent).length;
    return { total, students, staff, urgent };
  }, [broadcasts]);

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ── Top Bar: Back Button First ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => {
            playCyberSound('click');
            onNavigateBack();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            color: '#334155',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
          aria-label="Back to Previous Screen"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              fetchBroadcastHistory();
            }}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Refresh Notice Board"
          >
            <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playCyberSound('click');
              exportAllAsCSV();
            }}
            disabled={broadcasts.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: broadcasts.length > 0 ? 'pointer' : 'not-allowed',
              opacity: broadcasts.length > 0 ? 1 : 0.6
            }}
            title="Export Circular History CSV"
          >
            <Download size={14} />
            <span className="hide-on-compact">Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Page Header Banner ── */}
      <div 
        className="surface-card"
        style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
          borderRadius: '16px',
          color: '#ffffff',
          boxShadow: '0 4px 16px rgba(30, 58, 138, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}>
            <Megaphone size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
              Campus Broadcast & Official Notices
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#e0e7ff', opacity: 0.9 }}>
              Official circulars, academic notifications & downloadable certified PDF circulars
            </p>
          </div>
        </div>
      </div>

      {/* ── Horizontal Operational Metrics Strip ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '10px'
      }}>
        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Notices</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{statsMetrics.total}</div>
        </div>

        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, textTransform: 'uppercase' }}>Students Reach</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>{statsMetrics.students}</div>
        </div>

        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>Staff & Faculty</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>{statsMetrics.staff}</div>
        </div>

        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase' }}>Urgent Alerts</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>{statsMetrics.urgent}</div>
        </div>
      </div>

      {/* ── Dispatch Form for Admin / Authorized Staff ── */}
      {canDispatch && (
        <div 
          className="surface-card"
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}
        >
          {/* Header Strip with Toggle */}
          <div 
            onClick={() => setShowComposeForm(prev => !prev)}
            style={{
              padding: '14px 18px',
              background: '#f8fafc',
              borderBottom: showComposeForm ? '1px solid #e2e8f0' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={18} color="#2563eb" />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                Dispatch New Broadcast Announcement
              </h3>
            </div>
            <button
              type="button"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>{showComposeForm ? 'Collapse Form' : 'Open Form'}</span>
              <ChevronDown 
                size={16} 
                style={{ transform: showComposeForm ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} 
              />
            </button>
          </div>

          {showComposeForm && (
            <form onSubmit={handleDispatch} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Category Pills */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Notice Category *
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'NOTICE', label: '📌 General Notice' },
                    { id: 'HOLIDAY', label: '🌴 Holiday' },
                    { id: 'URGENT', label: '🚨 Urgent Alert' },
                    { id: 'EXAM', label: '📝 Examination' },
                    { id: 'CIRCULAR', label: '📜 Circular' },
                    { id: 'EVENT', label: '🎯 Event' }
                  ].map(cat => {
                    const isSelected = formCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormCategory(cat.id)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: isSelected ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          color: isSelected ? '#1d4ed8' : '#475569'
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audience Selector Pills */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Recipient Audience (Select All That Apply) *
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'students', label: '🎓 Students' },
                    { id: 'staff', label: '👨‍🏫 Teachers & Staff' },
                    { id: 'parents', label: '👪 Parents & Guardians' }
                  ].map(role => {
                    const isSelected = formTargetRoles.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: isSelected ? '1.5px solid #059669' : '1px solid #cbd5e1',
                          background: isSelected ? '#f0fdf4' : '#ffffff',
                          color: isSelected ? '#047857' : '#64748b'
                        }}
                      >
                        <span>{role.label}</span>
                        {isSelected && <Check size={14} strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Announcement Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., Mandatory Attendance Audit & Hall Ticket Clearance"
                  className="form-input"
                  style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    padding: '0 12px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Message Textarea */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Detailed Circular Body / Instructions *
                </label>
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Provide full details, deadlines, schedule changes, or relevant administrative guidelines..."
                  rows={4}
                  className="form-input"
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    padding: '10px 12px',
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    color: '#0f172a',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Urgent Toggle & Action Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: '#475569' }}>
                  <input
                    type="checkbox"
                    checked={formIsUrgent}
                    onChange={(e) => setFormIsUrgent(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Mark as Priority / Emergency Dispatch</span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '11px 24px',
                    borderRadius: '10px',
                    background: isSubmitting ? '#94a3b8' : '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                    transition: 'background 0.2s ease'
                  }}
                >
                  <Send size={16} />
                  <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Broadcast'}</span>
                </button>
              </div>

              {/* Feedback Alert */}
              {dispatchFeedback && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: dispatchFeedback.type === 'error' ? '#fef2f2' : '#f0fdf4',
                  color: dispatchFeedback.type === 'error' ? '#b91c1c' : '#15803d',
                  border: `1px solid ${dispatchFeedback.type === 'error' ? '#fecaca' : '#bbf7d0'}`
                }}>
                  {dispatchFeedback.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                  <span>{dispatchFeedback.message}</span>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* ── Broadcast Archive & Notice History ── */}
      <div 
        className="surface-card"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #cbd5e1',
          padding: '18px 20px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Notice History Archive ({filteredBroadcasts.length})
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Chronological log of all campus broadcasts with downloadable verified PDF notices
            </p>
          </div>
        </div>

        {/* Search Bar & Category Filter Strip */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search circulars by title, content, or audience role..."
              className="form-input"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                paddingLeft: '36px',
                paddingRight: '12px',
                fontSize: '0.85rem',
                color: '#0f172a',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '2px' }}>
            {['ALL', 'NOTICE', 'HOLIDAY', 'URGENT', 'EXAM', 'CIRCULAR', 'EVENT'].map(cat => {
              const isActive = selectedCategoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    background: isActive ? '#2563eb' : '#f8fafc',
                    color: isActive ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notices Cards List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b', fontSize: '0.9rem' }}>
            <RefreshCw size={24} className="spin-anim" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            <span>Loading institution notices archive...</span>
          </div>
        ) : filteredBroadcasts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '36px 16px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            color: '#64748b'
          }}>
            <FileText size={32} style={{ opacity: 0.5, marginBottom: '6px' }} />
            <h4 style={{ margin: '0 0 4px 0', color: '#334155', fontSize: '0.95rem' }}>No Circulars Found</h4>
            <p style={{ margin: 0, fontSize: '0.82rem' }}>
              {searchQuery ? 'No notices matched your search query.' : 'No announcements have been dispatched under this category yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredBroadcasts.map(notice => {
              const badge = getCategoryBadge(notice.category);
              const dateStr = notice.created_at ? new Date(notice.created_at).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
              }) : 'Recent';
              const roles = Array.isArray(notice.target_roles) && notice.target_roles.length > 0 
                ? notice.target_roles 
                : ['All Members'];

              return (
                <div
                  key={notice.id}
                  className="surface-card"
                  style={{
                    padding: '16px 18px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Top Meta Strip */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: badge.bg,
                        border: `1px solid ${badge.border}`,
                        color: badge.text
                      }}>
                        {badge.label}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {roles.map(r => (
                          <span
                            key={r}
                            style={{
                              padding: '2px 7px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              background: '#f1f5f9',
                              color: '#475569'
                            }}
                          >
                            {r.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b' }}>
                      <Clock size={12} />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                    {notice.title}
                  </h4>

                  {/* Message Body */}
                  <div style={{
                    fontSize: '0.86rem',
                    color: '#334155',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #f1f5f9'
                  }}>
                    {notice.message}
                  </div>

                  {/* Action Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                      REF: INST-BRD-{String(notice.id).padStart(4, '0')} • Verified Circular
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => copyNotice(notice)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#475569',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        title="Copy Announcement Text"
                      >
                        {copiedId === notice.id ? (
                          <>
                            <Check size={13} color="#16a34a" />
                            <span style={{ color: '#16a34a' }}>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playCyberSound('click');
                          triggerHaptic();
                          generateNoticePdf(notice, institutionName);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#1d4ed8',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        title="Download Verified PDF Circular"
                      >
                        <Download size={13} />
                        <span>Download Official PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
