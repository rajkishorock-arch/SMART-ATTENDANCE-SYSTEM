import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Send,
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Clock,
  Plus,
  ChevronRight,
  Edit3,
  Trash2,
  Megaphone,
  AlertCircle,
} from 'lucide-react';
import notificationApi from '../api/notificationApi';
import { generateNoticePdf } from '../utils/noticePdfGenerator';

const CATEGORY_OPTIONS = [
  { id: 'NOTICE', label: 'General Notice' },
  { id: 'HOLIDAY', label: 'Holiday' },
  { id: 'URGENT', label: 'Urgent Alert' },
  { id: 'EXAM', label: 'Examination' },
  { id: 'CIRCULAR', label: 'Circular' },
  { id: 'EVENT', label: 'Event' },
];

const AUDIENCE_OPTIONS = [
  { id: 'students', label: 'Students' },
  { id: 'staff', label: 'Teachers & Staff' },
  { id: 'parents', label: 'Parents & Guardians' },
];

const CATEGORY_FILTER_PILLS = ['ALL', 'NOTICE', 'HOLIDAY', 'URGENT', 'EXAM', 'CIRCULAR', 'EVENT'];

const getCategoryBadge = (cat) => {
  const c = String(cat || 'NOTICE').toUpperCase();
  switch (c) {
    case 'URGENT':
    case 'ALERT':
      return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: 'Urgent' };
    case 'HOLIDAY':
      return { bg: '#f0fdf4', border: '#bbf7d0', text: '#047857', label: 'Holiday' };
    case 'CIRCULAR':
      return { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', label: 'Circular' };
    case 'EXAM':
    case 'EXAMINATION':
      return { bg: '#fffbeb', border: '#fde68a', text: '#b45309', label: 'Exam' };
    case 'EVENT':
      return { bg: '#fdf4ff', border: '#f5d0fe', text: '#a21caf', label: 'Event' };
    default:
      return { bg: '#faf5ea', border: '#dfcfaf', text: '#6e4e1c', label: 'Notice' };
  }
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const getNoticeInitials = (cat) => {
  const c = String(cat || 'NT').toUpperCase();
  if (c === 'URGENT' || c === 'ALERT') return 'UR';
  if (c === 'HOLIDAY') return 'HL';
  if (c === 'CIRCULAR') return 'CR';
  if (c === 'EXAM' || c === 'EXAMINATION') return 'EX';
  if (c === 'EVENT') return 'EV';
  return 'NT';
};

export default function CampusBroadcastCenterView({
  token,
  currentUser,
  userRole = 'admin',
  playCyberSound = () => {},
  triggerHaptic = () => {},
  institutionName = 'SMART ATTENDANCE INSTITUTION',
  broadcastsData = null,
  hasLoadedData = false,
  onBroadcastsChange,
  routeView = null,
  setRouteView,
  onCloseSubView,
}) {
  const [localBroadcasts, setLocalBroadcasts] = useState([]);
  const [localHasLoaded, setLocalHasLoaded] = useState(false);
  const [localRouteView, setLocalRouteView] = useState(null);

  const broadcasts = broadcastsData ?? localBroadcasts;
  const hasLoaded = broadcastsData !== null ? hasLoadedData : localHasLoaded;
  const activeRoute = setRouteView ? routeView : localRouteView;
  const setActiveRoute = setRouteView || setLocalRouteView;

  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [listMessage, setListMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Create / Edit Form State
  const [editingId, setEditingId] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState(todayIsoDate);
  const [formCategory, setFormCategory] = useState('NOTICE');
  const [formTargetRoles, setFormTargetRoles] = useState(['students', 'staff', 'parents']);
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formIsUrgent, setFormIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Detail withdraw confirmation & error
  const [confirmWithdrawId, setConfirmWithdrawId] = useState(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [detailError, setDetailError] = useState('');

  const canDispatch = ['admin', 'principal'].includes(String(userRole).toLowerCase());

  const fetchBroadcastHistory = useCallback(async ({ silent = false } = {}) => {
    if (!token) return;
    if (!silent) setRefreshing(true);
    setError('');
    try {
      const res = await notificationApi.fetchBroadcastHistory(token, 100);
      const list = Array.isArray(res) ? res : [];
      setLocalBroadcasts(list);
      setLocalHasLoaded(true);
      if (onBroadcastsChange) onBroadcastsChange(list);
    } catch {
      setError('Campus notices could not be loaded. Please try refreshing.');
    } finally {
      setRefreshing(false);
    }
  }, [token, onBroadcastsChange]);

  useEffect(() => {
    let ignore = false;
    if (token && !hasLoaded) {
      Promise.resolve().then(() => {
        if (!ignore) fetchBroadcastHistory({ silent: false });
      });
    }
    return () => {
      ignore = true;
    };
  }, [token, hasLoaded, fetchBroadcastHistory]);

  const closeSubView = () => {
    setFormError('');
    setDetailError('');
    setConfirmWithdrawId(null);
    if (onCloseSubView) {
      onCloseSubView();
    } else {
      setActiveRoute(null);
    }
  };

  const openCreatePage = () => {
    playCyberSound('click');
    setEditingId(null);
    setEffectiveDate(todayIsoDate());
    setFormCategory('NOTICE');
    setFormTargetRoles(['students', 'staff', 'parents']);
    setFormTitle('');
    setFormMessage('');
    setFormIsUrgent(false);
    setFormError('');
    setListMessage('');
    setActiveRoute({ mode: 'create' });
  };

  const openDetailPage = (notice) => {
    playCyberSound('click');
    setDetailError('');
    setConfirmWithdrawId(null);
    setActiveRoute({ mode: 'detail', id: notice.id, item: notice });
  };

  const openEditPage = (notice) => {
    playCyberSound('click');
    setEditingId(notice.id);
    setFormIsUrgent(String(notice.category || '').toUpperCase() === 'URGENT');
    setFormCategory(String(notice.category || 'NOTICE').toUpperCase());
    setFormTargetRoles(
      Array.isArray(notice.target_roles) && notice.target_roles.length > 0
        ? notice.target_roles
        : ['students', 'staff', 'parents']
    );
    setFormTitle(notice.title || '');
    setFormMessage(notice.message || '');
    const fallbackDate = notice.effective_date || (notice.created_at ? String(notice.created_at).slice(0, 10) : todayIsoDate());
    setEffectiveDate(fallbackDate);
    setFormError('');
    setActiveRoute({ mode: 'edit', id: notice.id, item: notice });
  };

  const handleDispatch = async (e) => {
    if (e) e.preventDefault();
    setFormError('');
    if (!formTitle.trim() || !formMessage.trim()) {
      setFormError('Please provide both notice title and circular message.');
      return;
    }
    if (!editingId && formTargetRoles.length === 0) {
      setFormError('Please select at least one recipient audience.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        effective_date: effectiveDate || todayIsoDate(),
        title: formTitle.trim(),
        message: formMessage.trim(),
        category: formIsUrgent ? 'URGENT' : formCategory,
        target_roles: formTargetRoles,
        is_urgent: formIsUrgent,
        sender_role: userRole,
        sender_name: currentUser?.name || 'Campus Administrator',
      };

      if (editingId) {
        const response = await notificationApi.reviseNotice(token, editingId, payload);
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || 'Could not save notice changes.');
        }
      } else {
        await notificationApi.broadcastAnnouncement(token, payload);
      }

      triggerHaptic();
      playCyberSound('success');
      setListMessage(editingId ? 'Notice changes published.' : 'Campus notice published.');
      await fetchBroadcastHistory({ silent: true });
      setEditingId(null);
      setActiveRoute(null);
    } catch (err) {
      setFormError(err.message || 'Unable to publish notice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async (notice) => {
    setDetailError('');
    setIsWithdrawing(true);
    try {
      const res = await notificationApi.withdrawNotice(token, notice.id);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Unable to withdraw this notice.');
      }
      playCyberSound('success');
      triggerHaptic();
      const updated = broadcasts.filter(b => String(b.id) !== String(notice.id));
      setLocalBroadcasts(updated);
      if (onBroadcastsChange) onBroadcastsChange(updated);
      setListMessage(`Notice "${notice.title}" withdrawn.`);
      setConfirmWithdrawId(null);
      setActiveRoute(null);
    } catch (err) {
      setDetailError(err.message || 'Unable to withdraw this notice.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const toggleRole = (roleKey) => {
    if (editingId) return;
    setFormTargetRoles(prev =>
      prev.includes(roleKey)
        ? prev.filter(r => r !== roleKey)
        : [...prev, roleKey]
    );
  };

  const copyNotice = (notice) => {
    const dateTxt = notice.created_at ? new Date(notice.created_at).toLocaleDateString() : '';
    const text = `*${notice.title}*\nCategory: ${notice.category || 'NOTICE'}\nDate: ${dateTxt}\n\n${notice.message}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(notice.id);
    triggerHaptic();
    setTimeout(() => setCopiedId(null), 2400);
  };

  const exportAllAsCSV = () => {
    if (broadcasts.length === 0) return;
    const headers = ['ID', 'Date', 'Category', 'Audience', 'Title', 'Message'];
    const rows = broadcasts.map(b => [
      b.id,
      b.created_at ? new Date(b.created_at).toLocaleString() : '',
      b.category || 'NOTICE',
      Array.isArray(b.target_roles) ? b.target_roles.join(';') : 'All',
      `"${(b.title || '').replace(/"/g, '""')}"`,
      `"${(b.message || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Campus_Notices_${todayIsoDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredBroadcasts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return broadcasts.filter(item => {
      const cat = String(item.category || '').toUpperCase();
      if (selectedCategoryFilter !== 'ALL' && cat !== selectedCategoryFilter) return false;
      if (!q) return true;
      return (
        String(item.title || '').toLowerCase().includes(q) ||
        String(item.message || '').toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q) ||
        (Array.isArray(item.target_roles) && item.target_roles.some(r => String(r).toLowerCase().includes(q)))
      );
    });
  }, [broadcasts, selectedCategoryFilter, searchQuery]);

  /* ===== DEDICATED CREATE / EDIT NOTICE PAGE ===== */
  if (activeRoute && (activeRoute.mode === 'create' || activeRoute.mode === 'edit')) {
    const isEdit = activeRoute.mode === 'edit';
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
          {formError && (
            <div role="alert" className="feedback-banner is-error">
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{formError}</span>
            </div>
          )}

          <form onSubmit={handleDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Megaphone size={13} />
                <span>{isEdit ? 'Revise Notice Details' : 'Notice Content'}</span>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Announcement Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Semester Exam Timetable & Guidelines"
                  style={{ background: '#ffffff' }}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Notice Message *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={formMessage}
                  onChange={e => setFormMessage(e.target.value)}
                  placeholder="Write clear instructions, dates, or campus circular details..."
                  style={{ background: '#ffffff', minHeight: '104px', padding: '10px 12px', resize: 'vertical', lineHeight: 1.5 }}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Notice Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={effectiveDate}
                  onChange={e => setEffectiveDate(e.target.value)}
                  style={{ background: '#ffffff' }}
                  required
                />
              </div>
            </div>

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Category &amp; Audience</div>

              <div>
                <div className="form-label" style={{ marginBottom: '8px' }}>Notice Category *</div>
                <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                  {CATEGORY_OPTIONS.map(cat => {
                    const selected = !formIsUrgent ? formCategory === cat.id : cat.id === 'URGENT';
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setFormCategory(cat.id);
                          setFormIsUrgent(cat.id === 'URGENT');
                        }}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: selected ? '1.5px solid #785927' : '1px solid #dfd3ba',
                          background: selected ? '#785927' : '#ffffff',
                          color: selected ? '#ffffff' : '#4a3d28',
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="form-label" style={{ marginBottom: '8px' }}>
                  Recipient Audience {isEdit ? '(Fixed for published notice)' : '*'}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {AUDIENCE_OPTIONS.map(role => {
                    const selected = formTargetRoles.includes(role.id) || formTargetRoles.includes(role.id.replace(/s$/, ''));
                    return (
                      <button
                        key={role.id}
                        type="button"
                        disabled={isEdit}
                        onClick={() => toggleRole(role.id)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: isEdit ? 'not-allowed' : 'pointer',
                          opacity: isEdit && !selected ? 0.55 : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          border: selected ? '1.5px solid #047857' : '1px solid #dfd3ba',
                          background: selected ? 'rgba(5, 150, 105, 0.1)' : '#ffffff',
                          color: selected ? '#047857' : '#584b36',
                        }}
                      >
                        <span>{role.label}</span>
                        {selected && <Check size={13} strokeWidth={2.5} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: '#4a3d28' }}>
                <input
                  type="checkbox"
                  checked={formIsUrgent}
                  onChange={e => setFormIsUrgent(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#b91c1c' }}
                />
                <span>Mark as Priority / Urgent Alert</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={closeSubView}
                className="golden-os-feedback-filter-btn"
                style={{ flex: '1 1 110px', padding: '11px 16px', borderRadius: '10px', fontSize: '0.86rem', textAlign: 'center' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="golden-os-primary-action"
                style={{ flex: '2 1 180px', width: 'auto', justifyContent: 'center', padding: '11px 20px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700, gap: '7px' }}
              >
                <Send size={15} />
                <span style={{ color: '#ffffff' }}>{isSubmitting ? 'Publishing...' : (isEdit ? 'Republish Notice' : 'Publish Notice')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED NOTICE DETAIL PAGE ===== */
  if (activeRoute && activeRoute.mode === 'detail') {
    const selectedNotice =
      broadcasts.find(n => String(n.id) === String(activeRoute.id)) ||
      activeRoute.item ||
      null;

    if (!selectedNotice) {
      return (
        <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
          <div className="golden-os-window" style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <FileText size={32} style={{ color: '#9c8b6e' }} />
            <span style={{ fontWeight: 700, color: '#2b2112' }}>Notice not found or withdrawn.</span>
            <button type="button" onClick={closeSubView} className="golden-os-feedback-filter-btn" style={{ padding: '8px 16px', borderRadius: '10px' }}>
              Back to Notices
            </button>
          </div>
        </div>
      );
    }

    const badge = getCategoryBadge(selectedNotice.category);
    const roles = Array.isArray(selectedNotice.target_roles) && selectedNotice.target_roles.length > 0
      ? selectedNotice.target_roles
      : ['All'];
    const createdStr = selectedNotice.created_at
      ? new Date(selectedNotice.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Recent';

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
          {detailError && (
            <div role="alert" className="feedback-banner is-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{detailError}</span>
            </div>
          )}

          {/* Header Summary Card */}
          <div className="golden-os-form-section" style={{ gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 800,
                background: badge.bg,
                border: badge.border,
                color: badge.text,
              }}>
                {badge.label}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#6b5b3e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={12} />
                {createdStr}
              </span>
            </div>

            <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#25231f', lineHeight: 1.35 }}>
              {selectedNotice.title}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {roles.map(r => (
                  <span key={r} style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, background: '#faf5ea', border: '1px solid #e7dac0', color: '#6e4e1c', textTransform: 'uppercase' }}>
                    {r}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#8c7a5b', fontFamily: 'monospace', fontWeight: 700 }}>
                REF: INST-BRD-{String(selectedNotice.id).padStart(4, '0')}
              </span>
            </div>
          </div>

          {/* Full Circular Message */}
          <div className="golden-os-form-section">
            <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={13} /> Circular Message
              </span>
              {selectedNotice.effective_date && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b5b3e', textTransform: 'none', letterSpacing: 0 }}>
                  Date: {selectedNotice.effective_date}
                </span>
              )}
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: '#25231f',
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
              background: '#faf8f2',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid #ede4d2',
            }}>
              {selectedNotice.message}
            </div>
          </div>

          {/* Inline Withdraw Confirmation */}
          {canDispatch && confirmWithdrawId === selectedNotice.id && (
            <div className="golden-os-form-section" style={{ background: '#fef2f2', border: '1px solid #fecaca', gap: '10px' }}>
              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#b91c1c' }}>
                Withdraw &ldquo;{selectedNotice.title}&rdquo; from the notice board?
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setConfirmWithdrawId(null)}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '0.8rem' }}
                >
                  Keep Notice
                </button>
                <button
                  type="button"
                  disabled={isWithdrawing}
                  onClick={() => handleWithdraw(selectedNotice)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '8px',
                    background: '#dc2626',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: isWithdrawing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isWithdrawing ? 'Withdrawing...' : 'Confirm Withdraw'}
                </button>
              </div>
            </div>
          )}

          {/* Action Controls */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => copyNotice(selectedNotice)}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '9px 14px', borderRadius: '10px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {copiedId === selectedNotice.id ? <Check size={14} color="#047857" /> : <Copy size={14} />}
                <span>{copiedId === selectedNotice.id ? 'Copied' : 'Copy Text'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  triggerHaptic();
                  generateNoticePdf(selectedNotice, institutionName);
                }}
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  background: '#faf5ea',
                  border: '1px solid #dfcfaf',
                  color: '#6e4e1c',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>
            </div>

            {canDispatch && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => openEditPage(selectedNotice)}
                  className="golden-os-primary-action"
                  style={{ width: 'auto', justifyContent: 'center', padding: '9px 16px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700, gap: '6px' }}
                >
                  <Edit3 size={14} />
                  <span>Edit Notice</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmWithdrawId(selectedNotice.id)}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '10px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Trash2 size={14} />
                  <span>Withdraw</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ===== MAIN GOLDEN GATE NOTICE DIRECTORY (Compact 1-Line Rows, Form Hidden) ===== */
  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
        {error && (
          <div role="alert" className="feedback-banner is-error">
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{error}</span>
          </div>
        )}
        {listMessage && (
          <div role="status" className="feedback-banner is-success">
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{listMessage}</span>
          </div>
        )}

        {/* Top Bar: Search + New Notice + Refresh/CSV */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 170px', minWidth: '140px' }}>
            <input
              type="search"
              className="form-input"
              aria-label="Search campus notices"
              placeholder="Search notices..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', background: '#ffffff', width: '100%', boxSizing: 'border-box' }}
            />
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
          </div>

          <button
            type="button"
            title="Refresh Notices"
            onClick={() => {
              playCyberSound('click');
              fetchBroadcastHistory();
            }}
            disabled={refreshing}
            className="golden-os-feedback-filter-btn"
            style={{ padding: '10px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin-anim' : ''} />
            <span className="hide-on-compact">Refresh</span>
          </button>

          {broadcasts.length > 0 && (
            <button
              type="button"
              title="Export CSV"
              onClick={() => {
                playCyberSound('click');
                exportAllAsCSV();
              }}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '10px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}
            >
              <Download size={14} />
              <span className="hide-on-compact">CSV</span>
            </button>
          )}

          {canDispatch && (
            <button
              type="button"
              onClick={openCreatePage}
              className="golden-os-primary-action"
              style={{ width: 'auto', justifyContent: 'center', padding: '10px 16px', borderRadius: '11px', fontSize: '0.84rem', gap: '6px', flexShrink: 0 }}
            >
              <Plus size={16} />
              <span>New Notice</span>
            </button>
          )}
        </div>

        {/* Clean Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {CATEGORY_FILTER_PILLS.map(cat => {
            const isActive = selectedCategoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                style={{
                  padding: '5px 11px',
                  borderRadius: '999px',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #785927' : '1px solid #e4d8bd',
                  background: isActive ? '#785927' : '#ffffff',
                  color: isActive ? '#ffffff' : '#6b5b3e',
                }}
              >
                {cat === 'ALL' ? `All (${broadcasts.length})` : cat}
              </button>
            );
          })}
        </div>

        {/* 1-Line Scannable Notice List */}
        {!hasLoaded && broadcasts.length === 0 ? (
          <div className="golden-os-inset-card" style={{ padding: '28px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <RefreshCw size={22} className="spin-anim" style={{ color: '#8c7a5b' }} />
            <span style={{ fontSize: '0.86rem', color: '#6b5b3e', fontWeight: 600 }}>Loading notices...</span>
          </div>
        ) : filteredBroadcasts.length === 0 ? (
          <div className="golden-os-inset-card" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <FileText size={28} style={{ color: '#9c8b6e' }} />
            <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>
              {searchQuery || selectedCategoryFilter !== 'ALL' ? 'No matching notices found' : 'No notices published yet'}
            </span>
          </div>
        ) : (
          <div className="golden-os-list-shell">
            {filteredBroadcasts.map(notice => {
              const badge = getCategoryBadge(notice.category);
              return (
                <button
                  key={notice.id}
                  type="button"
                  className="golden-os-list-row"
                  onClick={() => openDetailPage(notice)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div className="golden-os-avatar" style={{ background: badge.bg, borderColor: badge.border, color: badge.text }}>
                      {getNoticeInitials(notice.category)}
                    </div>
                    <span style={{
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      color: '#25231f',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {notice.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '999px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`,
                    }}>
                      {badge.label}
                    </span>
                    <ChevronRight size={16} color="#8c734b" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
