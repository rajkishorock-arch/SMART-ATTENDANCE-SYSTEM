import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, AlertTriangle, CheckCircle2, ChevronRight, 
  RefreshCw, Sparkles, BookOpen, UserX, ShieldCheck, Tag, PartyPopper
} from 'lucide-react';
import { calendarApi } from '../../api/calendarApi';

const EVENT_TYPE_CONFIG = {
  HOLIDAY: { 
    bg: '#fef2f2', 
    border: '#fecaca', 
    text: '#dc2626', 
    label: 'Holiday', 
    icon: PartyPopper,
    badgeBg: '#fee2e2'
  },
  EXAM: { 
    bg: '#fffbeb', 
    border: '#fde68a', 
    text: '#d97706', 
    label: 'Exam Session', 
    icon: BookOpen,
    badgeBg: '#fef3c7'
  },
  CLASS_CANCELLED: { 
    bg: '#fff1f2', 
    border: '#fecdd3', 
    text: '#e11d48', 
    label: 'Class Cancelled', 
    icon: UserX,
    badgeBg: '#ffe4e6'
  },
  SUBSTITUTE_CLASS: { 
    bg: '#f5f3ff', 
    border: '#ddd6fe', 
    text: '#7c3aed', 
    label: 'Substitute Class', 
    icon: RefreshCw,
    badgeBg: '#ede9fe'
  },
  TEACHER_SUBSTITUTION: { 
    bg: '#f5f3ff', 
    border: '#ddd6fe', 
    text: '#7c3aed', 
    label: 'Substitute Teacher', 
    icon: RefreshCw,
    badgeBg: '#ede9fe'
  },
  INSTITUTION_CLOSED: { 
    bg: '#f8fafc', 
    border: '#e2e8f0', 
    text: '#64748b', 
    label: 'Campus Closed', 
    icon: ShieldCheck,
    badgeBg: '#f1f5f9'
  },
  SPECIAL_CLASS: { 
    bg: '#eff6ff', 
    border: '#bfdbfe', 
    text: '#2563eb', 
    label: 'Special Lecture', 
    icon: BookOpen,
    badgeBg: '#dbeafe'
  },
  EVENT: { 
    bg: '#f0f9ff', 
    border: '#bae6fd', 
    text: '#0284c7', 
    label: 'Academic Event', 
    icon: Sparkles,
    badgeBg: '#e0f2fe'
  }
};

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  let target;
  if (dateStr.includes('/')) {
    const [d, m, y] = dateStr.split('/');
    target = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  } else if (dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-');
    target = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  } else {
    return null;
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { label: '🔥 TODAY', isToday: true, isFuture: false };
  if (diffDays === 1) return { label: 'TOMORROW', isTomorrow: true, isFuture: true };
  if (diffDays > 1 && diffDays <= 7) return { label: `IN ${diffDays} DAYS`, isFuture: true };
  if (diffDays > 7) return { label: `IN ${diffDays} DAYS`, isFuture: true };
  if (diffDays < 0) return { label: `${Math.abs(diffDays)} DAYS AGO`, isPast: true };
  return null;
}

export default function StudentAcademicCalendarWidget({
  token,
  currentUser,
  onNavigateToCalendar = () => {},
  playCyberSound = () => {}
}) {
  const [events, setEvents] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadCalendarEvents = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await calendarApi.fetchEvents(token);
      const safeList = Array.isArray(data) ? data : (data?.events || []);
      setEvents(safeList);
    } catch (err) {
      console.warn('[StudentAcademicCalendarWidget] Failed to fetch events:', err);
      setErrorMsg('Unable to synchronize academic events.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCalendarEvents();
  }, [loadCalendarEvents]);

  // Filter events based on active category
  const filteredEvents = events.filter(e => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'HOLIDAYS') {
      return e.event_type === 'HOLIDAY' || e.event_type === 'INSTITUTION_CLOSED';
    }
    if (activeFilter === 'EXAMS') {
      return e.event_type === 'EXAM';
    }
    if (activeFilter === 'CANCELLATIONS') {
      return e.event_type === 'CLASS_CANCELLED' || e.event_type === 'SUBSTITUTE_CLASS';
    }
    if (activeFilter === 'EVENTS') {
      return e.event_type === 'EVENT' || e.event_type === 'SPECIAL_CLASS';
    }
    return true;
  });

  // Calculate summary counts
  const holidayCount = events.filter(e => e.event_type === 'HOLIDAY' || e.event_type === 'INSTITUTION_CLOSED').length;
  const examCount = events.filter(e => e.event_type === 'EXAM').length;
  const cancelledCount = events.filter(e => e.event_type === 'CLASS_CANCELLED').length;

  return (
    <div 
      className="surface-card" 
      style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '20px',
        padding: '24px 28px',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Accent Gradient Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)'
      }} />

      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.12)',
            flexShrink: 0
          }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.22rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Academic Calendar & Holiday Alerts
              </h3>
              {events.length > 0 && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: '#f1f5f9',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  {events.length} Active {events.length === 1 ? 'Notice' : 'Notices'}
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Official holidays, exam sessions, and schedule changes announced by your institution.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => {
              playCyberSound('click');
              loadCalendarEvents();
            }}
            disabled={isLoading}
            title="Refresh academic schedule"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#475569',
              padding: '8px 12px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="hide-on-mobile">Sync</span>
          </button>

          <button
            onClick={() => {
              playCyberSound('click');
              onNavigateToCalendar();
            }}
            style={{
              background: '#2563eb',
              border: 'none',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            <span>Full Calendar</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Quick Category Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        {[
          { id: 'ALL', label: 'All Notices', count: events.length },
          { id: 'HOLIDAYS', label: '🏖️ Holidays', count: holidayCount },
          { id: 'EXAMS', label: '📝 Exams', count: examCount },
          { id: 'CANCELLATIONS', label: '🚫 Cancellations', count: cancelledCount },
          { id: 'EVENTS', label: '🎓 Events', count: events.length - holidayCount - examCount - cancelledCount }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              playCyberSound('click');
              setActiveFilter(cat.id);
            }}
            style={{
              background: activeFilter === cat.id ? '#0f172a' : '#f8fafc',
              border: activeFilter === cat.id ? '1px solid #0f172a' : '1px solid #e2e8f0',
              color: activeFilter === cat.id ? '#ffffff' : '#475569',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <span>{cat.label}</span>
            {cat.count > 0 && (
              <span style={{
                background: activeFilter === cat.id ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                color: activeFilter === cat.id ? '#ffffff' : '#64748b',
                fontSize: '0.72rem',
                padding: '1px 6px',
                borderRadius: '10px'
              }}>
                {cat.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Events Display Area */}
      {isLoading ? (
        <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#2563eb' }} />
          <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>Loading latest academic events from your college...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{
          padding: '40px 24px',
          textAlign: 'center',
          borderRadius: '16px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            marginBottom: '12px'
          }}>
            <Calendar size={22} />
          </div>
          <h4 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#334155' }}>
            No {activeFilter !== 'ALL' ? activeFilter.toLowerCase() : 'events'} scheduled
          </h4>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', maxWidth: '380px', lineHeight: 1.5 }}>
            {activeFilter === 'HOLIDAYS'
              ? 'No official institutional holidays are currently listed.'
              : 'There are no active calendar notices for your institution in this category.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
          gap: '14px'
        }}>
          {filteredEvents.map(event => {
            const config = EVENT_TYPE_CONFIG[event.event_type] || {
              bg: '#f8fafc',
              border: '#e2e8f0',
              text: '#475569',
              label: event.event_type || 'Event',
              icon: Calendar,
              badgeBg: '#f1f5f9'
            };
            const IconComponent = config.icon;
            const daysInfo = getDaysUntil(event.start_date);

            return (
              <div
                key={event.id}
                style={{
                  background: '#ffffff',
                  border: `1.5px solid ${config.border}`,
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
              >
                <div>
                  {/* Event Badges Bar */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    gap: '8px'
                  }}>
                    <span style={{
                      background: config.badgeBg,
                      border: `1px solid ${config.border}`,
                      color: config.text,
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      letterSpacing: '0.03em',
                      textTransform: 'uppercase'
                    }}>
                      <IconComponent size={12} strokeWidth={2.5} />
                      {config.label}
                    </span>

                    {daysInfo && (
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: daysInfo.isToday ? '#fee2e2' : '#f1f5f9',
                        color: daysInfo.isToday ? '#ef4444' : '#64748b',
                        border: daysInfo.isToday ? '1px solid #fca5a5' : '1px solid #e2e8f0'
                      }}>
                        {daysInfo.label}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h4 style={{
                    margin: '0 0 6px',
                    fontSize: '1.02rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    lineHeight: 1.3
                  }}>
                    {event.title}
                  </h4>

                  {/* Description */}
                  {event.description && (
                    <p style={{
                      margin: '0 0 10px',
                      fontSize: '0.82rem',
                      color: '#475569',
                      lineHeight: 1.45
                    }}>
                      {event.description}
                    </p>
                  )}
                </div>

                {/* Bottom Meta Bar (Date, Time, Department) */}
                <div style={{
                  paddingTop: '10px',
                  marginTop: '6px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  fontSize: '0.76rem',
                  color: '#64748b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                    <Calendar size={13} color="#2563eb" />
                    <span>{event.start_date}</span>
                    {event.end_date && event.end_date !== event.start_date && (
                      <span>→ {event.end_date}</span>
                    )}
                  </div>

                  {event.start_time && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>{event.start_time}</span>
                    </div>
                  )}

                  {event.subject_name && (
                    <span style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>
                      {event.subject_code || event.subject_name}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safeguard Notice Callout */}
      <div style={{
        marginTop: '20px',
        padding: '12px 16px',
        borderRadius: '12px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.8rem',
        color: '#166534'
      }}>
        <ShieldCheck size={18} color="#16a34a" style={{ flexShrink: 0 }} />
        <span>
          <strong>Attendance Protection Active:</strong> On official institutional holidays and cancelled sessions, 
          your attendance rate is protected by the academic calendar engine and will not count as an absence.
        </span>
      </div>
    </div>
  );
}
