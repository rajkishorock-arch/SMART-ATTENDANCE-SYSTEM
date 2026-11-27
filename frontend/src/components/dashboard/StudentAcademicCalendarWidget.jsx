import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  BookOpen,
  UserX,
  ShieldCheck,
  PartyPopper,
  Megaphone,
  Download,
  Bell,
  Sparkles,
} from 'lucide-react';
import { calendarApi } from '../../api/calendarApi';
import notificationApi from '../../api/notificationApi';
import { generateNoticePdf } from '../../utils/noticePdfGenerator';
import { getActiveTenantSlug } from '../../utils/tenantConfig';

const CATEGORY_META = {
  HOLIDAY: { label: 'Holiday', short: 'HOL', icon: PartyPopper },
  EXAM: { label: 'Examination', short: 'EXM', icon: BookOpen },
  CIRCULAR: { label: 'Official Circular', short: 'CIR', icon: Megaphone },
  NOTICE: { label: 'Campus Notice', short: 'NTC', icon: Bell },
  CLASS_CANCELLED: { label: 'Cancelled', short: 'CXL', icon: UserX },
  TEACHER_SUBSTITUTION: { label: 'Substitute', short: 'SUB', icon: Sparkles },
  SUBSTITUTE_CLASS: { label: 'Substitute', short: 'SUB', icon: Sparkles },
  INSTITUTION_CLOSED: { label: 'Campus Closed', short: 'CLS', icon: ShieldCheck },
  EVENT: { label: 'Campus Event', short: 'EVT', icon: Sparkles },
};

const readCalCache = (token, kind) => {
  try {
    if (!token || typeof localStorage === 'undefined') return [];
    const slug = getActiveTenantSlug() || 'default';
    const raw = localStorage.getItem(`sg_st_${kind}_v1_${slug}_${String(token).slice(-16)}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCalCache = (token, kind, list) => {
  try {
    if (!token || typeof localStorage === 'undefined' || !Array.isArray(list)) return;
    const slug = getActiveTenantSlug() || 'default';
    localStorage.setItem(`sg_st_${kind}_v1_${slug}_${String(token).slice(-16)}`, JSON.stringify(list));
  } catch {
    // ignore quota error
  }
};

function parseSafeDate(dStr) {
  if (!dStr) return null;
  const s = String(dStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.split('T')[0].split('-');
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  }
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(s)) {
    const parts = s.split(/[/-]/);
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const getRelativeTiming = (dt) => {
  if (!dt) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dt);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  return dt.toLocaleDateString('en-IN');
};

export default function StudentAcademicCalendarWidget({
  token,
  currentUser,
  subjects = [],
  routeView = null,
  onNavigateRoute = null,
  onNavigateToCalendar = () => {},
  playCyberSound = () => {},
}) {
  const [calendarEvents, setCalendarEvents] = useState(() => readCalCache(token, 'cal_events'));
  const [broadcastNotices, setBroadcastNotices] = useState(() => readCalCache(token, 'notices'));
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const loadContent = useCallback(async (forceRefresh = false) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [calRes, notifRes] = await Promise.allSettled([
        calendarApi.fetchEvents(token, null, forceRefresh),
        notificationApi.fetchBroadcastHistory(token, 50),
      ]);

      if (calRes.status === 'fulfilled' && calRes.value) {
        const raw = calRes.value;
        const list = Array.isArray(raw) ? raw : (raw?.events || []);
        setCalendarEvents(list);
        writeCalCache(token, 'cal_events', list);
      }

      if (notifRes.status === 'fulfilled' && notifRes.value) {
        const raw = notifRes.value;
        const list = Array.isArray(raw) ? raw : (raw?.broadcasts || []);
        setBroadcastNotices(list);
        writeCalCache(token, 'notices', list);
      }
    } catch (err) {
      console.warn('Error loading academic calendar content:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let ignore = false;
    if (!token) return undefined;
    Promise.allSettled([
      calendarApi.fetchEvents(token, null, false),
      notificationApi.fetchBroadcastHistory(token, 50),
    ])
      .then(([calRes, notifRes]) => {
        if (ignore) return;
        if (calRes.status === 'fulfilled' && calRes.value) {
          const raw = calRes.value;
          const list = Array.isArray(raw) ? raw : (raw?.events || []);
          setCalendarEvents(list);
          writeCalCache(token, 'cal_events', list);
        }
        if (notifRes.status === 'fulfilled' && notifRes.value) {
          const raw = notifRes.value;
          const list = Array.isArray(raw) ? raw : (raw?.broadcasts || []);
          setBroadcastNotices(list);
          writeCalCache(token, 'notices', list);
        }
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, [token]);

  const safeSubjects = useMemo(() => (Array.isArray(subjects) ? subjects : []), [subjects]);
  const allowedSubjectIds = useMemo(() => new Set(safeSubjects.map(s => String(s.id))), [safeSubjects]);
  const userDept = String(currentUser?.details?.dep || currentUser?.dep || currentUser?.department || '').trim().toUpperCase();

  // Scoped unified timeline entries
  const unifiedEntries = useMemo(() => {
    const list = [];

    calendarEvents.forEach(evt => {
      if (!evt) return;
      if (evt.subject_id != null && safeSubjects.length > 0 && !allowedSubjectIds.has(String(evt.subject_id))) {
        return;
      }
      const evtDept = String(evt.department || '').trim().toUpperCase();
      if (evtDept && userDept && evtDept !== userDept && evtDept !== 'ALL') {
        return;
      }

      const rawD = evt.start_date || evt.event_date || evt.date || '';
      const dt = parseSafeDate(rawD);
      const rawCat = String(evt.event_type || 'EVENT').toUpperCase();
      list.push({
        id: `cal_${evt.id ?? rawD}`,
        title: evt.title || evt.name || 'Academic Event',
        description: evt.description || (evt.substitute_teacher_name ? `Substitute: ${evt.substitute_teacher_name}` : ''),
        date: dt,
        rawDate: rawD,
        category: rawCat in CATEGORY_META ? rawCat : 'EVENT',
        type: 'calendar',
        source: evt.subject_name ? `${evt.subject_name} · Academic Office` : 'Academic Office',
      });
    });

    broadcastNotices.forEach((notif, idx) => {
      if (!notif) return;
      const dt = parseSafeDate(notif.created_at || notif.date);
      const cat = String(notif.category || 'NOTICE').toUpperCase();
      let normalizedCat = 'NOTICE';
      if (cat.includes('HOLIDAY')) normalizedCat = 'HOLIDAY';
      else if (cat.includes('EXAM')) normalizedCat = 'EXAM';
      else if (cat.includes('CIRCULAR')) normalizedCat = 'CIRCULAR';
      else if (cat.includes('EVENT')) normalizedCat = 'EVENT';

      list.push({
        id: `notice_${notif.id ?? idx}`,
        title: notif.title || 'Official Announcement',
        description: notif.message || notif.body || '',
        date: dt,
        rawDate: notif.created_at || '',
        category: normalizedCat,
        type: 'notice',
        source: notif.sender_name || 'Principal / Admin',
        rawNotice: notif,
      });
    });

    return list.sort((a, b) => (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0));
  }, [calendarEvents, broadcastNotices, safeSubjects.length, allowedSubjectIds, userDept]);

  const navigateTo = (next) => {
    if (playCyberSound) playCyberSound('click');
    if (onNavigateRoute) onNavigateRoute(next);
  };

  /* ===== DEDICATED DETAIL PAGE FOR SELECTED EVENT / NOTICE ===== */
  if (routeView?.mode === 'detail' && routeView?.id != null) {
    const selectedEntry = unifiedEntries.find(e => String(e.id) === String(routeView.id)) || routeView.item || null;

    if (!selectedEntry) {
      return (
        <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>Notice or schedule entry not found</div>
              <div style={{ fontSize: '0.78rem', color: '#6b5b3e', marginTop: '4px' }}>
                Tap Refresh or return to the academic schedule list.
              </div>
            </div>
          </div>
        </div>
      );
    }

    const meta = CATEGORY_META[selectedEntry.category] || CATEGORY_META.EVENT;
    const Icon = meta.icon || Calendar;
    const formattedDate = selectedEntry.date
      ? selectedEntry.date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      : (selectedEntry.rawDate || 'Scheduled');

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <div className="golden-os-avatar" style={{ width: '44px', height: '44px' }}>
                  <Icon size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#25231f' }}>
                    {selectedEntry.title}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6b5b3e', fontWeight: 600 }}>
                    {meta.label} · {selectedEntry.source}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Date</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>{formattedDate}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Timing</span>
                <span style={{ color: '#785927', fontWeight: 700 }}>{getRelativeTiming(selectedEntry.date) || 'Published'}</span>
              </div>

              {selectedEntry.description && (
                <div style={{ paddingTop: '6px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6b5b3e', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Official Details
                  </div>
                  <div style={{ fontSize: '0.86rem', color: '#25231f', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {selectedEntry.description}
                  </div>
                </div>
              )}
            </div>

            {/* Statutory Safe Guard Note */}
            <div className="golden-os-inset-card" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px' }}>
              <CheckCircle2 size={16} color="#047857" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.77rem', color: '#5c4b30', lineHeight: 1.45 }}>
                Official holidays, exam sessions, and campus notices are synchronized with institutional attendance rules.
              </div>
            </div>

            {/* Related Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  onNavigateToCalendar();
                }}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '10px 16px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', gap: '7px' }}
              >
                <Calendar size={14} />
                <span>Open Full Calendar</span>
              </button>

              {selectedEntry.type === 'notice' && selectedEntry.rawNotice && (
                <button
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    generateNoticePdf(selectedEntry.rawNotice, currentUser?.institution_name || 'Smart Attendance System');
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '11px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: 'linear-gradient(135deg, #785927, #684c20)',
                    color: '#ffffff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}
                >
                  <Download size={14} />
                  <span>Official PDF</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== CLEAN DIRECTORY VIEW (ZERO KPI BOXES / BLOATED CARDS) ===== */
  const holidayCount = unifiedEntries.filter(e => e.category === 'HOLIDAY' || e.category === 'INSTITUTION_CLOSED').length;
  const examCount = unifiedEntries.filter(e => e.category === 'EXAM').length;
  const noticeCount = unifiedEntries.filter(e => e.category === 'NOTICE' || e.category === 'CIRCULAR').length;

  const filteredEntries = unifiedEntries.filter(e => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'HOLIDAYS') return e.category === 'HOLIDAY' || e.category === 'INSTITUTION_CLOSED';
    if (activeFilter === 'EXAMS') return e.category === 'EXAM';
    if (activeFilter === 'NOTICES') return e.category === 'NOTICE' || e.category === 'CIRCULAR';
    if (activeFilter === 'EVENTS') return e.category === 'EVENT' || e.category === 'CLASS_CANCELLED' || e.category === 'TEACHER_SUBSTITUTION' || e.category === 'SUBSTITUTE_CLASS';
    return true;
  });

  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Compact Top Action & Filter Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div className="golden-os-feedback-filters" style={{ flex: 1 }}>
              {[
                { id: 'ALL', label: `All (${unifiedEntries.length})` },
                { id: 'HOLIDAYS', label: `Holidays (${holidayCount})` },
                { id: 'EXAMS', label: `Exams (${examCount})` },
                { id: 'NOTICES', label: `Notices (${noticeCount})` },
                { id: 'EVENTS', label: 'Events' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    setActiveFilter(cat.id);
                  }}
                  className={`golden-os-feedback-filter-btn ${activeFilter === cat.id ? 'active' : ''}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                loadContent(true);
              }}
              disabled={isLoading}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '7px 12px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
            >
              <RefreshCw size={13} className={isLoading ? 'spin-icon' : ''} />
              <span>{isLoading ? 'Syncing' : 'Refresh'}</span>
            </button>
          </div>

          {/* Primary Shortcut Row: Full Interactive Campus Calendar */}
          <div className="golden-os-list-shell">
            <button
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                onNavigateToCalendar();
              }}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar">
                  <Calendar size={16} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>
                    Interactive Full Calendar
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6b5b3e', marginTop: '2px' }}>
                    Open month-by-month holidays & exam schedule
                  </div>
                </div>
              </div>
              <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
            </button>
          </div>

          {/* Notices & Schedule Single-Line List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 8px' }}>
              <span className="golden-os-field-label" style={{ marginBottom: 0 }}>Official Notices & Events</span>
              <span style={{ fontSize: '0.73rem', color: '#6b5b3e', fontWeight: 700 }}>
                {filteredEntries.length} {filteredEntries.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="golden-os-inset-card" style={{ textAlign: 'center', padding: '24px 14px', fontSize: '0.82rem', color: '#6b5b3e' }}>
                No notices or schedule entries under this filter yet.
              </div>
            ) : (
              <div className="golden-os-list-shell">
                {filteredEntries.map(entry => {
                  const meta = CATEGORY_META[entry.category] || CATEGORY_META.EVENT;
                  const dateLabel = entry.date
                    ? entry.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                    : 'Notice';
                  const relLabel = getRelativeTiming(entry.date);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => navigateTo({ section: 'calendar', mode: 'detail', id: entry.id, item: entry })}
                      className="golden-os-list-row"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <div className="golden-os-avatar" style={{ fontSize: '0.68rem' }}>
                          {meta.short}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {entry.title}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#6b5b3e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                            {dateLabel} · {meta.label}{relLabel ? ` · ${relLabel}` : ''} · {entry.source}
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
        </div>
      </div>
    </div>
  );
}
