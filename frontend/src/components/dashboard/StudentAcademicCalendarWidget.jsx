import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, AlertTriangle, CheckCircle2, ChevronRight, 
  RefreshCw, BookOpen, UserX, ShieldCheck, PartyPopper
} from 'lucide-react';
import { calendarApi } from '../../api/calendarApi';

const EVENT_TYPE_CONFIG = {
  HOLIDAY: { 
    bg: '#fef2f2', 
    border: '#fecaca', 
    text: '#dc2626', 
    label: 'Holiday', 
    icon: PartyPopper,
    badgeBg: '#fef2f2'
  },
  EXAM: { 
    bg: '#fffbeb', 
    border: '#fde68a', 
    text: '#d97706', 
    label: 'Exam Session', 
    icon: BookOpen,
    badgeBg: '#fffbeb'
  },
  CLASS_CANCELLED: { 
    bg: '#fff1f2', 
    border: '#fecdd3', 
    text: '#e11d48', 
    label: 'Class Cancelled', 
    icon: UserX,
    badgeBg: '#fff1f2'
  },
  SUBSTITUTE_CLASS: { 
    bg: '#f5f3ff', 
    border: '#ddd6fe', 
    text: '#7c3aed', 
    label: 'Substitute Class', 
    icon: RefreshCw,
    badgeBg: '#f5f3ff'
  },
  TEACHER_SUBSTITUTION: { 
    bg: '#f5f3ff', 
    border: '#ddd6fe', 
    text: '#7c3aed', 
    label: 'Substitute Teacher', 
    icon: RefreshCw,
    badgeBg: '#f5f3ff'
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
    badgeBg: '#eff6ff'
  },
  EVENT: { 
    bg: '#f0fdf4', 
    border: '#bbf7d0', 
    text: '#16a34a', 
    label: 'Academic Event', 
    icon: Calendar,
    badgeBg: '#f0fdf4'
  }
};

function parseDateFlexible(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  let day, month, year;

  if (str.includes('/')) {
    const parts = str.split('/').map(p => parseInt(p, 10));
    if (parts.length === 3) {
      if (parts[0] > 1000) {
        [year, month, day] = parts;
      } else {
        [day, month, year] = parts;
      }
    }
  } else if (str.includes('-')) {
    const parts = str.split('-').map(p => parseInt(p, 10));
    if (parts.length === 3) {
      if (parts[0] > 1000) {
        [year, month, day] = parts;
      } else {
        [day, month, year] = parts;
      }
    }
  }

  if (year && month && day && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
    return new Date(year, month - 1, day);
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function getDaysUntil(dateStr) {
  const target = parseDateFlexible(dateStr);
  if (!target) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { label: 'Today', isToday: true, isFuture: false };
  if (diffDays === 1) return { label: 'Tomorrow', isTomorrow: true, isFuture: true };
  if (diffDays > 1 && diffDays <= 7) return { label: `In ${diffDays} days`, isFuture: true };
  if (diffDays > 7) return { label: `In ${diffDays} days`, isFuture: true };
  if (diffDays < 0) return { label: `${Math.abs(diffDays)} days ago`, isPast: true };
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

    const handleCalendarUpdate = () => {
      loadCalendarEvents();
    };

    window.addEventListener('academic_calendar_updated', handleCalendarUpdate);
    const interval = setInterval(loadCalendarEvents, 30000);

    return () => {
      window.removeEventListener('academic_calendar_updated', handleCalendarUpdate);
      clearInterval(interval);
    };
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
  const eventCount = events.length - holidayCount - examCount - cancelledCount;

  return (
    <div 
      className="surface-card" 
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: 'clamp(14px, 3vw, 20px)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        paddingBottom: '10px',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2563eb',
            flexShrink: 0
          }}>
            <Calendar size={18} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Academic Calendar & Notices
            </h3>
            {events.length > 0 && (
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                background: '#f1f5f9',
                color: '#64748b',
                padding: '2px 7px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                {events.length} {events.length === 1 ? 'Notice' : 'Notices'}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <button
            onClick={() => {
              playCyberSound('click');
              loadCalendarEvents();
            }}
            disabled={isLoading}
            title="Refresh schedule"
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.15s'
            }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
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
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
              transition: 'all 0.15s'
            }}
          >
            <span>Full Calendar</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Quick Category Filter Bar (Smooth horizontal scroll on mobile & web) */}
      <div 
        className="calendar-filter-bar"
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          overflowX: 'auto',
          gap: '6px',
          paddingBottom: '2px',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {[
          { id: 'ALL', label: 'All', count: events.length },
          { id: 'HOLIDAYS', label: 'Holidays', count: holidayCount },
          { id: 'EXAMS', label: 'Exams', count: examCount },
          { id: 'CANCELLATIONS', label: 'Cancellations', count: cancelledCount },
          { id: 'EVENTS', label: 'Events', count: eventCount }
        ].map(cat => {
          const isSelected = activeFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                playCyberSound('click');
                setActiveFilter(cat.id);
              }}
              style={{
                flexShrink: 0,
                background: isSelected ? '#eff6ff' : '#ffffff',
                border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                color: isSelected ? '#1d4ed8' : '#64748b',
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.76rem',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 1px 2px rgba(37, 99, 235, 0.08)' : 'none'
              }}
            >
              <span>{cat.label}</span>
              {cat.count > 0 && (
                <span style={{
                  background: isSelected ? '#dbeafe' : '#f1f5f9',
                  color: isSelected ? '#1e40af' : '#64748b',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Events Display Area */}
      {isLoading ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px', color: '#2563eb' }} />
          <p style={{ margin: 0, fontSize: '0.84rem' }}>Updating schedule...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{
          padding: '28px 16px',
          textAlign: 'center',
          borderRadius: '12px',
          background: '#f8fafc',
          border: '1px dashed #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94a3b8',
            marginBottom: '8px'
          }}>
            <Calendar size={18} />
          </div>
          <h4 style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
            No {activeFilter !== 'ALL' ? activeFilter.toLowerCase() : 'notices'} scheduled
          </h4>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
            No active calendar notices in this category.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '10px'
        }}>
          {filteredEvents.map(event => {
            const config = EVENT_TYPE_CONFIG[event.event_type] || {
              bg: '#f8fafc',
              border: '#e2e8f0',
              text: '#475569',
              label: event.event_type || 'Notice',
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
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Event Top Row: Category Tag + Relative Time */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <span style={{
                    background: config.badgeBg,
                    border: `1px solid ${config.border}`,
                    color: config.text,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <IconComponent size={12} />
                    {config.label}
                  </span>

                  {daysInfo && (
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      color: daysInfo.isToday ? '#dc2626' : '#94a3b8'
                    }}>
                      {daysInfo.label}
                    </span>
                  )}
                </div>

                {/* Title & Description */}
                <div>
                  <h4 style={{
                    margin: 0,
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    lineHeight: 1.3
                  }}>
                    {event.title}
                  </h4>

                  {event.description && (
                    <p style={{
                      margin: '3px 0 0',
                      fontSize: '0.8rem',
                      color: '#64748b',
                      lineHeight: 1.4
                    }}>
                      {event.description}
                    </p>
                  )}
                </div>

                {/* Bottom Meta Bar (Date, Time, Subject) */}
                <div style={{
                  paddingTop: '8px',
                  marginTop: '2px',
                  borderTop: '1px solid #f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  fontSize: '0.74rem',
                  color: '#64748b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
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
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
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

      {/* Safeguard Notice Callout (Compact & Professional) */}
      <div style={{
        padding: '8px 12px',
        borderRadius: '8px',
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.74rem',
        color: '#166534',
        lineHeight: 1.3
      }}>
        <ShieldCheck size={14} color="#16a34a" style={{ flexShrink: 0 }} />
        <span>
          <strong>Attendance Protection:</strong> Official holidays and cancelled sessions do not count as absences.
        </span>
      </div>
    </div>
  );
}
