import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Clock, AlertTriangle, CheckCircle2, ChevronRight, 
  RefreshCw, BookOpen, UserX, ShieldCheck, PartyPopper, Megaphone,
  Download, FileText, Bell, Sparkles
} from 'lucide-react';
import { calendarApi } from '../../api/calendarApi';
import notificationApi from '../../api/notificationApi';
import { generateNoticePdf } from '../../utils/noticePdfGenerator';

const EVENT_TYPE_CONFIG = {
  HOLIDAY: { 
    bg: '#f0fdf4', 
    border: '#bbf7d0', 
    text: '#16a34a', 
    label: '🌴 Holiday', 
    icon: PartyPopper
  },
  EXAM: { 
    bg: '#fffbeb', 
    border: '#fde68a', 
    text: '#d97706', 
    label: '📝 Examination', 
    icon: BookOpen
  },
  CIRCULAR: {
    bg: '#f5f3ff',
    border: '#ddd6fe',
    text: '#7c3aed',
    label: '📜 Official Circular',
    icon: Megaphone
  },
  NOTICE: {
    bg: '#eff6ff',
    border: '#bfdbfe',
    text: '#2563eb',
    label: '📌 Campus Notice',
    icon: Bell
  },
  CLASS_CANCELLED: { 
    bg: '#fff1f2', 
    border: '#fecdd3', 
    text: '#e11d48', 
    label: '⛔ Cancelled', 
    icon: UserX
  },
  INSTITUTION_CLOSED: { 
    bg: '#f8fafc', 
    border: '#cbd5e1', 
    text: '#475569', 
    label: '🏛️ Campus Closed', 
    icon: ShieldCheck
  },
  EVENT: { 
    bg: '#fdf4ff', 
    border: '#f5d0fe', 
    text: '#c026d3', 
    label: '🎯 Campus Event', 
    icon: Sparkles
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
  return isNaN(parsed.getTime()) ? null : parsed;
}

export default function StudentAcademicCalendarWidget({
  token,
  currentUser,
  onNavigateToCalendar = () => {},
  playCyberSound = () => {}
}) {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [broadcastNotices, setBroadcastNotices] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Synchronize both Academic Calendar events AND Campus Broadcast notices
  const loadContent = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [calRes, notifRes] = await Promise.allSettled([
        calendarApi.fetchEvents(token),
        notificationApi.fetchBroadcastHistory(token, 50)
      ]);

      if (calRes.status === 'fulfilled' && calRes.value) {
        const raw = calRes.value;
        const list = Array.isArray(raw) ? raw : (raw?.events || []);
        setCalendarEvents(list);
      }

      if (notifRes.status === 'fulfilled' && notifRes.value) {
        const raw = notifRes.value;
        let list = [];
        if (Array.isArray(raw)) list = raw;
        else if (raw?.broadcasts) list = raw.broadcasts;
        setBroadcastNotices(list);
      }
    } catch (err) {
      console.warn('Error loading academic calendar content:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Combine and normalize items into unified academic timeline entries
  const unifiedEntries = useMemo(() => {
    const list = [];

    // 1. Calendar Events
    calendarEvents.forEach(evt => {
      const dt = parseSafeDate(evt.event_date || evt.date);
      const category = String(evt.event_type || 'EVENT').toUpperCase();
      list.push({
        id: `cal_${evt.id || Math.random()}`,
        title: evt.title || evt.name || 'Academic Event',
        description: evt.description || '',
        date: dt,
        rawDate: evt.event_date || evt.date || '',
        category: category in EVENT_TYPE_CONFIG ? category : 'EVENT',
        type: 'calendar',
        source: 'Academic Office'
      });
    });

    // 2. Broadcast Notices
    broadcastNotices.forEach(notif => {
      const dt = parseSafeDate(notif.created_at || notif.date);
      const cat = String(notif.category || 'NOTICE').toUpperCase();
      let normalizedCat = 'NOTICE';
      if (cat.includes('HOLIDAY')) normalizedCat = 'HOLIDAY';
      else if (cat.includes('EXAM')) normalizedCat = 'EXAM';
      else if (cat.includes('CIRCULAR')) normalizedCat = 'CIRCULAR';
      else if (cat.includes('EVENT')) normalizedCat = 'EVENT';

      list.push({
        id: `notice_${notif.id || Math.random()}`,
        title: notif.title || 'Official Announcement',
        description: notif.message || notif.body || '',
        date: dt,
        rawDate: notif.created_at || '',
        category: normalizedCat,
        type: 'notice',
        source: notif.sender_name || 'Principal / Admin',
        rawNotice: notif
      });
    });

    // Sort by date descending
    return list.sort((a, b) => {
      const tA = a.date ? a.date.getTime() : 0;
      const tB = b.date ? b.date.getTime() : 0;
      return tB - tA;
    });
  }, [calendarEvents, broadcastNotices]);

  // Summary counts
  const totalCount = unifiedEntries.length;
  const holidayCount = unifiedEntries.filter(e => e.category === 'HOLIDAY' || e.category === 'INSTITUTION_CLOSED').length;
  const examCount = unifiedEntries.filter(e => e.category === 'EXAM').length;
  const noticeCount = unifiedEntries.filter(e => e.category === 'NOTICE' || e.category === 'CIRCULAR').length;

  // Filtered entries
  const filteredEntries = unifiedEntries.filter(e => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'HOLIDAYS') return e.category === 'HOLIDAY' || e.category === 'INSTITUTION_CLOSED';
    if (activeFilter === 'EXAMS') return e.category === 'EXAM';
    if (activeFilter === 'NOTICES') return e.category === 'NOTICE' || e.category === 'CIRCULAR';
    if (activeFilter === 'EVENTS') return e.category === 'EVENT';
    return true;
  });

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      animation: 'fadeInUp 0.3s ease'
    }}>
      {/* ── Top Bar: Title & Action Button ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            Academic Calendar, Events & Official Notices
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => { playCyberSound('click'); loadContent(); }}
            disabled={isLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#475569',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'spin-anim' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => { playCyberSound('click'); onNavigateToCalendar(); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)'
            }}
          >
            <Calendar size={14} />
            <span>Open Interactive Full Calendar</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Horizontal Executive Summary Strip (4 Cards) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '10px'
      }}>
        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Schedule Entries</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{totalCount} Active</div>
        </div>

        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>Gazetted Holidays</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>{holidayCount} Days</div>
        </div>

        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>Exams & Audits</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>{examCount} Sessions</div>
        </div>

        <div className="surface-card" style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>Campus Circulars</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>{noticeCount} Notices</div>
        </div>
      </div>

      {/* ── Category Filter Pills ── */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
        {[
          { id: 'ALL', label: `All (${totalCount})` },
          { id: 'HOLIDAYS', label: `Holidays (${holidayCount})` },
          { id: 'EXAMS', label: `Examinations (${examCount})` },
          { id: 'NOTICES', label: `Circulars & Notices (${noticeCount})` },
          { id: 'EVENTS', label: `Events` }
        ].map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => { playCyberSound('click'); setActiveFilter(cat.id); }}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeFilter === cat.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: activeFilter === cat.id ? '#2563eb' : '#ffffff',
              color: activeFilter === cat.id ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Unified Horizontal Entry Timeline Cards ── */}
      {filteredEntries.length === 0 ? (
        <div style={{
          padding: '36px 16px',
          textAlign: 'center',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          color: '#64748b'
        }}>
          <Calendar size={30} style={{ opacity: 0.5, marginBottom: '6px' }} />
          <h4 style={{ margin: '0 0 4px', fontSize: '0.94rem', color: '#334155' }}>No Entries Under This Category</h4>
          <p style={{ margin: 0, fontSize: '0.82rem' }}>All institution activities and circulars will be displayed here as they are published.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredEntries.map(entry => {
            const config = EVENT_TYPE_CONFIG[entry.category] || EVENT_TYPE_CONFIG.EVENT;
            const Icon = config.icon || Calendar;

            // Formatted date values
            const dayNum = entry.date ? entry.date.getDate() : '--';
            const monthStr = entry.date ? entry.date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase() : 'CAL';
            const dayStr = entry.date ? entry.date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase() : '';

            // Compute relative timing badge
            let timingText = '';
            let timingColor = '#64748b';
            if (entry.date) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const target = new Date(entry.date);
              target.setHours(0, 0, 0, 0);
              const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));
              if (diffDays === 0) { timingText = 'TODAY'; timingColor = '#059669'; }
              else if (diffDays === 1) { timingText = 'TOMORROW'; timingColor = '#2563eb'; }
              else if (diffDays > 1 && diffDays <= 7) { timingText = `IN ${diffDays} DAYS`; timingColor = '#2563eb'; }
              else if (diffDays < 0) { timingText = `${Math.abs(diffDays)} DAYS AGO`; timingColor = '#94a3b8'; }
            }

            return (
              <div
                key={entry.id}
                className="surface-card"
                style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)'
                }}
              >
                {/* Left Date Block + Content Details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px', flex: 1 }}>
                  {/* Big Date Badge */}
                  <div style={{
                    width: '52px',
                    height: '56px',
                    borderRadius: '10px',
                    background: config.bg,
                    border: `1px solid ${config.border}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '0.66rem', fontWeight: 800, color: config.text, lineHeight: 1 }}>
                      {monthStr}
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: config.text, lineHeight: 1.1, marginTop: '2px' }}>
                      {dayNum}
                    </span>
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, color: config.text, lineHeight: 1 }}>
                      {dayStr}
                    </span>
                  </div>

                  {/* Title & Info */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: config.bg,
                        color: config.text,
                        border: `1px solid ${config.border}`
                      }}>
                        {config.label}
                      </span>
                      {timingText && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: timingColor }}>
                          • {timingText}
                        </span>
                      )}
                    </div>

                    <h4 style={{ margin: '4px 0 2px', fontSize: '0.96rem', fontWeight: 800, color: '#0f172a' }}>
                      {entry.title}
                    </h4>

                    {entry.description && (
                      <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4, marginTop: '2px' }}>
                        {entry.description}
                      </div>
                    )}

                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                      Issued by {entry.source}
                    </div>
                  </div>
                </div>

                {/* Right Action: Download PDF for Official Circulars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {entry.type === 'notice' && entry.rawNotice && (
                    <button
                      type="button"
                      onClick={() => {
                        if (playCyberSound) playCyberSound('click');
                        generateNoticePdf(entry.rawNotice, currentUser?.institution_name || 'Smart Attendance System');
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
                        cursor: 'pointer'
                      }}
                      title="Download Certified PDF Circular"
                    >
                      <Download size={13} />
                      <span>Official PDF</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Institutional Attendance Protection Clause */}
      <div style={{
        padding: '12px 14px',
        borderRadius: '10px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
          <strong>Statutory Attendance Safe Guard:</strong> Officially scheduled institution holidays, semester recesses, and authorized examination windows are automatically protected and are never counted as student absences.
        </span>
      </div>

    </div>
  );
}