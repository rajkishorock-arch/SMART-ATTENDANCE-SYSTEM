import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
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
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Dispatch Form State (for Admins / Staff)
  const [editing, setEditing] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [formCategory, setFormCategory] = useState('NOTICE');
  const [formTargetRoles, setFormTargetRoles] = useState(['students', 'staff', 'parents']);
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formIsUrgent, setFormIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState(null);
  const [showComposeForm, setShowComposeForm] = useState(true);

  const canDispatch = ['admin', 'principal'].includes(String(userRole).toLowerCase());

  // Fetch Broadcasts
  const fetchBroadcastHistory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await notificationApi.fetchBroadcastHistory(token, 100);
      setBroadcasts(res);
    } catch {
      setError('Campus notices could not be loaded. Please refresh.');
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
        effective_date: effectiveDate || null,
        title: formTitle.trim(),
        message: formMessage.trim(),
        category: formIsUrgent ? 'URGENT' : formCategory,
        target_roles: formTargetRoles,
        is_urgent: formIsUrgent,
        sender_role: userRole,
        sender_name: currentUser?.name || 'Campus Administrator'
      };

      if (editing) {
        const response = await notificationApi.reviseNotice(token, editing, payload);
        if (!response.ok) throw new Error('Could not publish the changes.');
      } else {
        await notificationApi.broadcastAnnouncement(token, payload);
      }
      setEditing(null);
      setEffectiveDate('');
      setDispatchFeedback({ type: 'success', message: 'Campus notice published.' });
      setFormTitle('');
      setFormMessage('');
      setFormIsUrgent(false);
      triggerHaptic();
      await fetchBroadcastHistory();
    } catch (err) {
      setDispatchFeedback({ type: 'error', message: err.message || 'Unable to publish. Your draft is still here.' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setDispatchFeedback(null);
      }, 6000);
    }
  };

  // Toggle role in target roles
  const toggleRole = (roleKey) => {
    if (editing) return;
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
        return { bg: '#faf5ea', border: '#dfcfaf', text: '#785927', label: '📌 GENERAL NOTICE' };
    }
  };

  // Role-aware metrics computation
  const statsMetrics = useMemo(() => {
    const total = broadcasts.length;
    const isStudent = String(userRole).toLowerCase() === 'student';
    const isTeacher = String(userRole).toLowerCase() === 'teacher';

    if (isStudent) {
      const exams = broadcasts.filter(b => ['EXAM', 'EXAMINATION', 'CIRCULAR', 'ACADEMIC'].includes(String(b.category).toUpperCase())).length;
      const holidays = broadcasts.filter(b => String(b.category).toUpperCase() === 'HOLIDAY').length;
      const urgent = broadcasts.filter(b => String(b.category).toUpperCase() === 'URGENT' || b.is_urgent).length;
      return [
        { label: 'Total Circulars', val: total, color: '#25231f' },
        { label: 'Academic & Exams', val: exams, color: '#785927' },
        { label: 'Gazetted Holidays', val: holidays, color: '#059669' },
        { label: 'Urgent Alerts', val: urgent, color: '#dc2626' }
      ];
    }

    if (isTeacher) {
      const staffCount = broadcasts.filter(b => !b.target_roles || b.target_roles.includes('staff') || b.target_roles.includes('teacher') || b.target_roles.includes('all')).length;
      const exams = broadcasts.filter(b => ['EXAM', 'EXAMINATION', 'CIRCULAR'].includes(String(b.category).toUpperCase())).length;
      const urgent = broadcasts.filter(b => String(b.category).toUpperCase() === 'URGENT' || b.is_urgent).length;
      return [
        { label: 'Total Notices', val: total, color: '#25231f' },
        { label: 'Staff notices', val: staffCount, color: '#059669' },
        { label: 'Academic & Exams', val: exams, color: '#785927' },
        { label: 'Urgent Notices', val: urgent, color: '#dc2626' }
      ];
    }

    // Admin default
    const students = broadcasts.filter(b => !b.target_roles || b.target_roles.includes('students') || b.target_roles.includes('student') || b.target_roles.includes('all')).length;
    const staff = broadcasts.filter(b => !b.target_roles || b.target_roles.includes('staff') || b.target_roles.includes('teacher') || b.target_roles.includes('all')).length;
    const urgent = broadcasts.filter(b => String(b.category).toUpperCase() === 'URGENT' || b.is_urgent).length;
    return [
      { label: 'Total Notices', val: total, color: '#25231f' },
      { label: 'Student notices', val: students, color: '#785927' },
      { label: 'Staff notices', val: staff, color: '#059669' },
      { label: 'Urgent Alerts', val: urgent, color: '#dc2626' }
    ];
  }, [broadcasts, userRole]);

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* ── Top Bar: Quick Action Controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
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
              border: '1px solid #cfc8ba',
              borderRadius: '10px',
              color: '#58534a',
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
              background: '#faf9f6',
              border: '1px solid #cfc8ba',
              borderRadius: '10px',
              color: '#46423b',
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

      {error && <p role="alert">{error}</p>}
      {/* ── Horizontal Operational Metrics Strip ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '10px'
      }}>
        {statsMetrics.map((stat, idx) => (
          <div key={idx} style={{ padding: '8px', minWidth: 0, overflowWrap: 'anywhere', background: '#ffffff', borderRadius: '12px', border: '1px solid #e4dfd5' }}>
            <span style={{ fontSize: '0.72rem', color: stat.color, fontWeight: 600, textTransform: 'uppercase' }}>{stat.label}</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stat.color, marginTop: '2px' }}>{stat.val}</div>
          </div>
        ))}
      </div>

      {/* ── Dispatch Form for Admin / Authorized Staff ── */}
      {canDispatch && (
        <div 
          className="surface-card"
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #cfc8ba',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}
        >
          {/* Header Strip with Toggle */}
          <div 
            onClick={() => setShowComposeForm(prev => !prev)}
            style={{
              padding: '14px 18px',
              background: '#faf9f6',
              borderBottom: showComposeForm ? '1px solid #e4dfd5' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Send size={18} color="#785927" />
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#25231f' }}>
                Dispatch New Broadcast Announcement
              </h3>
            </div>
            <button
              type="button"
              style={{
                border: 'none',
                background: 'transparent',
                color: '#696358',
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
              
              <label>Notice date<input className="form-input" type="date" required value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} /></label>

              {/* Category Pills */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#46423b', marginBottom: '8px' }}>
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
                        onClick={() => !editing && setFormCategory(cat.id)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          border: isSelected ? '1.5px solid #785927' : '1px solid #cfc8ba',
                          background: isSelected ? '#faf5ea' : '#ffffff',
                          color: isSelected ? '#684c20' : '#58534a'
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
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#46423b', marginBottom: '8px' }}>
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
                          border: isSelected ? '1.5px solid #059669' : '1px solid #cfc8ba',
                          background: isSelected ? '#f0fdf4' : '#ffffff',
                          color: isSelected ? '#047857' : '#696358'
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
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#46423b', marginBottom: '6px' }}>
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
                    border: '1.5px solid #cfc8ba',
                    background: '#ffffff',
                    padding: '0 12px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#25231f',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Message Textarea */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#46423b', marginBottom: '6px' }}>
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
                    border: '1.5px solid #cfc8ba',
                    background: '#ffffff',
                    padding: '10px 12px',
                    fontSize: '0.88rem',
                    fontWeight: 500,
                    color: '#25231f',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Urgent Toggle & Action Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', paddingTop: '4px' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: '#58534a' }}>
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
                    background: isSubmitting ? '#94a3b8' : '#785927',
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
                  <span>{isSubmitting ? 'Dispatching...' : editing ? 'Republish notice' : 'Publish notice'}</span>
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
          border: '1px solid #cfc8ba',
          padding: '18px 20px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#25231f' }}>
              Notice History Archive ({filteredBroadcasts.length})
            </h3>
            {userRole !== 'student' && userRole !== 'teacher' && (
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#696358' }}>
                Chronological log of all campus broadcasts with downloadable verified PDF notices
              </p>
            )}
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
                border: '1px solid #cfc8ba',
                paddingLeft: '36px',
                paddingRight: '12px',
                fontSize: '0.85rem',
                color: '#25231f',
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
                    border: isActive ? '1px solid #785927' : '1px solid #e4dfd5',
                    background: isActive ? '#785927' : '#faf9f6',
                    color: isActive ? '#ffffff' : '#696358',
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
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#696358', fontSize: '0.9rem' }}>
            <RefreshCw size={24} className="spin-anim" style={{ margin: '0 auto 8px auto', display: 'block' }} />
            <span>Loading institution notices archive...</span>
          </div>
        ) : filteredBroadcasts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '36px 16px',
            background: '#faf9f6',
            borderRadius: '12px',
            border: '1px dashed #cfc8ba',
            color: '#696358'
          }}>
            <FileText size={32} style={{ opacity: 0.5, marginBottom: '6px' }} />
            <h4 style={{ margin: '0 0 4px 0', color: '#46423b', fontSize: '0.95rem' }}>No Circulars Found</h4>
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
                    border: '1px solid #e4dfd5',
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
                              background: '#f4f1eb',
                              color: '#58534a'
                            }}
                          >
                            {r.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#696358' }}>
                      <Clock size={12} />
                      <span>{dateStr}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#25231f', lineHeight: 1.35 }}>
                    {notice.title}
                  </h4>

                  <details><summary>Read notice</summary>
                  <div style={{
                    fontSize: '0.86rem',
                    color: '#46423b',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    background: '#faf9f6',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #f4f1eb'
                  }}>
                    {notice.message}
                  </div></details>

                  {notice.effective_date && <span>Notice date · {notice.effective_date}</span>}
                  {canDispatch && <div>
                    <button type="button" onClick={() => {
                      setFormIsUrgent(notice.category === 'URGENT'); setEditing(notice.id); setFormTitle(notice.title); setFormMessage(notice.message);
                      setEffectiveDate(notice.effective_date || notice.created_at.slice(0, 10));
                      setFormTargetRoles(notice.target_roles); setFormCategory(notice.category);
                      setShowComposeForm(true);
                      requestAnimationFrame(() => document.querySelector('form input[type=date]')?.focus());
                    }}>Edit notice</button>
                    <button type="button" onClick={async () => {
                      if (!window.confirm(`Withdraw “${notice.title}” from the notice board?`)) return;
                      try {
                        const res = await notificationApi.withdrawNotice(token, notice.id);
                        if (!res.ok) throw new Error();
                        await fetchBroadcastHistory();
                      } catch { setError('Unable to withdraw the notice.'); }
                    }}>Withdraw</button>
                  </div>}
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
                          border: '1px solid #cfc8ba',
                          color: '#58534a',
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
                          background: '#faf5ea',
                          border: '1px solid #dfcfaf',
                          color: '#684c20',
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
