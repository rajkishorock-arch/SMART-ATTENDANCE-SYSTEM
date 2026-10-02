import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, Plus, Trash2, AlertTriangle, UserCheck, 
  CheckCircle2, Filter, ShieldCheck, BookOpen,
  RefreshCw, X, UserX
} from 'lucide-react';
import { systemApi } from '../api/systemApi';
import { calendarApi } from '../api/calendarApi';
import { teacherApi } from '../api/teacherApi';

const EVENT_TYPE_COLORS = {
  HOLIDAY: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: 'Holiday' },
  EXAM: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', label: 'Exam Session' },
  CLASS_CANCELLED: { bg: '#fff1f2', border: '#fecdd3', text: '#e11d48', label: 'Class Cancelled' },
  SUBSTITUTE_CLASS: { bg: '#f5f3ff', border: '#ddd6fe', text: '#7c3aed', label: 'Substitute Class' },
  TEACHER_SUBSTITUTION: { bg: '#f5f3ff', border: '#ddd6fe', text: '#7c3aed', label: 'Teacher Substituted' },
  INSTITUTION_CLOSED: { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', label: 'Campus Closed' },
  SPECIAL_CLASS: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', label: 'Special Lecture' },
  EVENT: { bg: '#f0f9ff', border: '#bae6fd', text: '#0284c7', label: 'Academic Event' }
};

export default function AcademicCalendarView({
  token,
  currentUser,
  playCyberSound = () => {}
}) {
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'cancel' | 'substitute' | 'metrics'
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Available subjects and teachers for forms
  const [subjectsList, setSubjectsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);

  // Attendance Metrics State
  const [metrics, setMetrics] = useState(null);
  const [selectedSubjectIdForMetrics, setSelectedSubjectIdForMetrics] = useState('');
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // New Event Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    title: '',
    description: '',
    event_type: 'HOLIDAY',
    start_date: new Date().toLocaleDateString('en-GB'),
    end_date: '',
    start_time: '',
    end_time: '',
    department: currentUser?.department || ''
  });

  // Cancel Class Form State
  const [cancelFormData, setCancelFormData] = useState({
    subject_id: '',
    date: new Date().toLocaleDateString('en-GB'),
    session_time: '09:00 AM',
    reason: ''
  });
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Substitute Teacher Form State
  const [substituteFormData, setSubstituteFormData] = useState({
    subject_id: '',
    substitute_teacher_id: '',
    date: new Date().toLocaleDateString('en-GB'),
    reason: ''
  });
  const [isSubmittingSubstitute, setIsSubmittingSubstitute] = useState(false);

  const isStaff = ['admin', 'teacher', 'hod'].includes(currentUser?.role?.toLowerCase());

  // ── Fetch Calendar Events ──────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await calendarApi.fetchEvents(token, eventTypeFilter);
      setEvents(data);
    } catch (err) {
      setErrorMsg(err.message || 'Error connecting to academic calendar engine.');
    } finally {
      setIsLoading(false);
    }
  }, [token, eventTypeFilter]);

  // ── Fetch Attendance Metrics ────────────────────────────────────────────────
  const fetchMetrics = useCallback(async (subjectId = '') => {
    if (!token) return;
    setIsLoadingMetrics(true);
    try {
      const data = await calendarApi.fetchAttendanceMetrics(token, subjectId);
      if (data) setMetrics(data);
    } catch (err) {
      console.warn('Metrics fetch skipped or unavailable:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, [token]);

  // ── Fetch Metadata (Subjects & Teachers) ────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    // Fetch subjects
    systemApi.fetchSubjects(token)
      .then(data => {
        if (Array.isArray(data)) {
          setSubjectsList(data);
          if (data.length > 0) {
            setCancelFormData(prev => (prev.subject_id ? prev : { ...prev, subject_id: data[0].id }));
            setSubstituteFormData(prev => (prev.subject_id ? prev : { ...prev, subject_id: data[0].id }));
          }
        }
      })
      .catch(() => {});

    // If staff, fetch teachers
    if (isStaff) {
      teacherApi.listTeachers(token, 'teacher')
        .then(data => {
          if (Array.isArray(data)) {
            setTeachersList(data);
            if (data.length > 0) {
              setSubstituteFormData(prev => (prev.substitute_teacher_id ? prev : { ...prev, substitute_teacher_id: data[0].id }));
            }
          }
        })
        .catch(() => {});
    }
  }, [token, isStaff]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        fetchEvents();
        fetchMetrics(selectedSubjectIdForMetrics);
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchEvents, fetchMetrics, selectedSubjectIdForMetrics]);

  // ── Handle Create Event ────────────────────────────────────────────────────
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventFormData.title.trim()) {
      setErrorMsg('Please specify an event title.');
      return;
    }
    setIsLoading(true);
    try {
      await calendarApi.createEvent(token, eventFormData);
      playCyberSound('success');
      setSuccessMsg(`Event "${eventFormData.title}" scheduled successfully.`);
      setShowCreateModal(false);
      setEventFormData({
        title: '',
        description: '',
        event_type: 'HOLIDAY',
        start_date: new Date().toLocaleDateString('en-GB'),
        end_date: '',
        start_time: '',
        end_time: '',
        department: currentUser?.department || ''
      });
      fetchEvents();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Handle Cancel Class ────────────────────────────────────────────────────
  const handleCancelClass = async (e) => {
    e.preventDefault();
    if (!cancelFormData.reason.trim()) {
      setErrorMsg('Cancellation reason is required for the audit trail.');
      return;
    }
    setIsSubmittingCancel(true);
    setErrorMsg('');
    try {
      const payload = {
        subject_id: parseInt(cancelFormData.subject_id),
        date: cancelFormData.date,
        session_time: cancelFormData.session_time,
        reason: cancelFormData.reason
      };
      await calendarApi.cancelClass(token, payload);
      playCyberSound('success');
      setSuccessMsg('Class marked cancelled. Student attendance percentage is protected!');
      setCancelFormData(prev => ({ ...prev, reason: '' }));
      fetchEvents();
      fetchMetrics(selectedSubjectIdForMetrics);
      setActiveTab('events');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // ── Handle Assign Substitute ───────────────────────────────────────────────
  const handleAssignSubstitute = async (e) => {
    e.preventDefault();
    if (!substituteFormData.reason.trim()) {
      setErrorMsg('Substitution reason is required.');
      return;
    }
    setIsSubmittingSubstitute(true);
    setErrorMsg('');
    try {
      const payload = {
        subject_id: parseInt(substituteFormData.subject_id),
        substitute_teacher_id: parseInt(substituteFormData.substitute_teacher_id),
        date: substituteFormData.date,
        reason: substituteFormData.reason
      };
      await calendarApi.substituteClass(token, payload);
      playCyberSound('success');
      setSuccessMsg('Substitute faculty assigned successfully.');
      setSubstituteFormData(prev => ({ ...prev, reason: '' }));
      fetchEvents();
      setActiveTab('events');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsSubmittingSubstitute(false);
    }
  };

  // ── Handle Delete Event ────────────────────────────────────────────────────
  const handleDeleteEvent = async (eventId, title) => {
    if (!window.confirm(`Are you sure you want to remove calendar event "${title}"?`)) return;
    try {
      await calendarApi.deleteEvent(token, eventId);
      playCyberSound('click');
      setSuccessMsg(`Event "${title}" removed.`);
      fetchEvents();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="academic-calendar-container" style={{
      color: 'var(--color-text-main)',
      padding: '24px',
      maxWidth: '1280px',
      margin: '0 auto',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Modern, Clean Header */}
      <div className="surface-card" style={{
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-primary)'
          }}>
            <Calendar size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>
              Academic Calendar
            </h2>
            <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
              Manage holidays, schedules, and class events across your institution.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => { playCyberSound('click'); fetchEvents(); fetchMetrics(selectedSubjectIdForMetrics); }}
            disabled={isLoading}
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              color: 'var(--color-text-main)',
              padding: '9px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.86rem',
              fontWeight: 600,
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          {isStaff && (
            <button
              onClick={() => { playCyberSound('click'); setShowCreateModal(true); }}
              className="btn-primary"
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              Add Event
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#059669',
          padding: '14px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.92rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '14px 18px',
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.92rem'
        }}>
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => { playCyberSound('click'); setActiveTab('events'); }}
          style={{
            background: activeTab === 'events' ? 'var(--color-primary)' : '#f1f5f9',
            border: activeTab === 'events' ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
            color: activeTab === 'events' ? '#ffffff' : 'var(--color-text-secondary)',
            padding: '8px 18px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Calendar size={16} />
          Institutional Schedule ({events.length})
        </button>

        <button
          onClick={() => { playCyberSound('click'); setActiveTab('metrics'); }}
          style={{
            background: activeTab === 'metrics' ? 'var(--color-primary)' : '#f1f5f9',
            border: activeTab === 'metrics' ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
            color: activeTab === 'metrics' ? '#ffffff' : 'var(--color-text-secondary)',
            padding: '8px 18px',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '0.88rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <ShieldCheck size={16} />
          Attendance Protection Analytics
        </button>

        {isStaff && (
          <>
            <button
              onClick={() => { playCyberSound('click'); setActiveTab('cancel'); }}
              style={{
                background: activeTab === 'cancel' ? '#e11d48' : '#f1f5f9',
                border: activeTab === 'cancel' ? '1px solid #e11d48' : '1px solid var(--border-subtle)',
                color: activeTab === 'cancel' ? '#ffffff' : 'var(--color-text-secondary)',
                padding: '8px 18px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <UserX size={16} />
              Cancel Class Session
            </button>

            <button
              onClick={() => { playCyberSound('click'); setActiveTab('substitute'); }}
              style={{
                background: activeTab === 'substitute' ? '#7c3aed' : '#f1f5f9',
                border: activeTab === 'substitute' ? '1px solid #7c3aed' : '1px solid var(--border-subtle)',
                color: activeTab === 'substitute' ? '#ffffff' : 'var(--color-text-secondary)',
                padding: '8px 18px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <UserCheck size={16} />
              Substitute Faculty Delegation
            </button>
          </>
        )}
      </div>

      {/* TAB 1: CALENDAR EVENTS LIST */}
      {activeTab === 'events' && (
        <div>
          {/* Filters Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            overflowX: 'auto',
            paddingBottom: '6px'
          }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} /> Filter:
            </span>
            {['ALL', 'HOLIDAY', 'EXAM', 'CLASS_CANCELLED', 'SPECIAL_CLASS', 'EVENT', 'SUBSTITUTE_CLASS'].map(type => (
              <button
                key={type}
                onClick={() => { playCyberSound('click'); setEventTypeFilter(type); }}
                style={{
                  background: eventTypeFilter === type ? 'var(--color-primary)' : '#f1f5f9',
                  border: eventTypeFilter === type ? '1px solid var(--color-primary)' : '1px solid var(--border-subtle)',
                  color: eventTypeFilter === type ? '#ffffff' : 'var(--color-text-secondary)',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {type === 'ALL' ? 'All Events' : (EVENT_TYPE_COLORS[type]?.label || type)}
              </button>
            ))}
          </div>

          {/* Events Grid */}
          {events.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '16px',
              padding: '60px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: '#f1f5f9',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-muted)',
                marginBottom: '16px'
              }}>
                <Calendar size={28} />
              </div>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-text-main)', fontSize: '1.15rem', fontWeight: 700 }}>
                No events scheduled
              </h4>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)', maxWidth: '420px', lineHeight: 1.5 }}>
                There are no calendar events or holidays matching this filter.
              </p>
              {isStaff && (
                <button
                  onClick={() => { playCyberSound('click'); setShowCreateModal(true); }}
                  className="btn-primary"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Plus size={15} />
                  Schedule an event
                </button>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '16px'
            }}>
              {events.map(event => {
                const badge = EVENT_TYPE_COLORS[event.event_type] || {
                  bg: '#f1f5f9',
                  border: 'var(--border-subtle)',
                  text: 'var(--color-text-secondary)',
                  label: event.event_type
                };

                return (
                  <div
                    key={event.id}
                    className="surface-card"
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${badge.border}`,
                      borderRadius: '14px',
                      padding: '20px',
                      boxShadow: 'var(--shadow-card)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}
                  >
                    <div>
                      {/* Card Top */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <span style={{
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.text,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase'
                        }}>
                          {badge.label}
                        </span>

                        {isStaff && (
                          <button
                            onClick={() => handleDeleteEvent(event.id, event.title)}
                            title="Remove event"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-text-muted)',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                        {event.title}
                      </h3>
                      {event.description && (
                        <p style={{ margin: '0 0 14px 0', color: 'var(--color-text-secondary)', fontSize: '0.85rem', lineHeight: 1.45 }}>
                          {event.description}
                        </p>
                      )}

                      {/* Meta Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                        {event.subject_name && (
                          <span style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: 'var(--color-primary)',
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600
                          }}>
                            <BookOpen size={12} /> {event.subject_name} ({event.subject_code})
                          </span>
                        )}

                        {event.department && (
                          <span style={{
                            background: '#f1f5f9',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--color-text-secondary)',
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            Dept: {event.department}
                          </span>
                        )}

                        {event.substitute_teacher_name && (
                          <span style={{
                            background: '#f5f3ff',
                            border: '1px solid #ddd6fe',
                            color: '#7c3aed',
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600
                          }}>
                            <UserCheck size={12} /> Substitute: {event.substitute_teacher_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Date & Time */}
                    <div style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      color: 'var(--color-text-secondary)'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                        <Calendar size={14} style={{ color: 'var(--color-primary)' }} />
                        {event.start_date}
                        {event.end_date && event.end_date !== event.start_date && ` → ${event.end_date}`}
                      </span>

                      {event.start_time && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-secondary)' }}>
                          <Clock size={13} /> {event.start_time}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ATTENDANCE PROTECTION METRICS */}
      {activeTab === 'metrics' && (
        <div className="surface-card" style={{
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: 'var(--color-text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="var(--color-primary)" />
                Calendar-Aware Attendance Safety Engine
              </h3>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.88rem' }}>
                Conducted Classes = Scheduled Classes − Cancelled Classes. Students are never penalized for approved cancellations.
              </p>
            </div>

            {/* Subject Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Subject:</label>
              <select
                value={selectedSubjectIdForMetrics}
                onChange={e => {
                  setSelectedSubjectIdForMetrics(e.target.value);
                  fetchMetrics(e.target.value);
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-text-main)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}
              >
                <option value="">All Subjects Aggregate</option>
                {subjectsList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingMetrics ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--color-primary)' }} />
              <p>Computing calendar-adjusted metrics...</p>
            </div>
          ) : metrics ? (
            <div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '18px'
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Scheduled Classes</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '6px' }}>
                    {metrics.scheduled_classes}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total sessions on timetable</span>
                </div>

                <div style={{
                  background: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '12px',
                  padding: '18px'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Cancelled / Exempted</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#e11d48', marginTop: '6px' }}>
                    {metrics.cancelled_classes}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Deducted from denominator</span>
                </div>

                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '12px',
                  padding: '18px'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Conducted Classes</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#2563eb', marginTop: '6px' }}>
                    {metrics.conducted_classes}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Effective teaching sessions</span>
                </div>

                <div style={{
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '12px',
                  padding: '18px'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Attended Classes</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#059669', marginTop: '6px' }}>
                    {metrics.attended_classes}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Present / Late / Excused</span>
                </div>
              </div>

              {/* Protection Shield Banner */}
              <div style={{
                background: metrics.is_at_risk 
                  ? '#fff1f2'
                  : '#ecfdf5',
                border: metrics.is_at_risk ? '1px solid #fecdd3' : '1px solid #a7f3d0',
                borderRadius: '14px',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    background: metrics.is_at_risk ? '#fef2f2' : '#ffffff',
                    border: metrics.is_at_risk ? '1px solid #fecaca' : '1px solid #a7f3d0',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: metrics.is_at_risk ? '#dc2626' : '#059669'
                  }}>
                    {metrics.is_at_risk ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'var(--color-text-main)', fontWeight: 700 }}>
                      Calendar-Adjusted Percentage: {metrics.attendance_percentage}%
                    </h4>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                      {metrics.is_at_risk 
                        ? 'Warning: Attendance is currently below the 75% threshold. Take corrective action.' 
                        : 'Safe & Protected: Academic standing is in good compliance (≥ 75%).'}
                    </p>
                  </div>
                </div>

                <div style={{
                  fontSize: '0.85rem',
                  background: '#ffffff',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-text-main)'
                }}>
                  Formula: ({metrics.attended_classes} ÷ {metrics.conducted_classes}) × 100 = <strong>{metrics.attendance_percentage}%</strong>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-muted)' }}>No metrics available for the selected parameters.</p>
          )}
        </div>
      )}

      {/* TAB 3: CANCEL CLASS FORM (STAFF ONLY) */}
      {activeTab === 'cancel' && isStaff && (
        <div className="surface-card" style={{
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '680px',
          margin: '0 auto',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: '10px',
              padding: '8px',
              color: '#e11d48'
            }}>
              <UserX size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-main)', fontWeight: 700 }}>Cancel Class Session</h3>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                Session will be logged in the academic calendar and student absences will be safely purged.
              </p>
            </div>
          </div>

          {/* Guarantee Warning */}
          <div style={{
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            color: 'var(--color-primary)',
            lineHeight: 1.45
          }}>
            <strong>Automatic Protection Guarantee:</strong> Existing attendance records for this subject on this date 
            will be converted to <code>CLASS_CANCELLED</code>. These cancelled hours are excluded from the total conducted count, 
            so students will not be penalized.
          </div>

          <form onSubmit={handleCancelClass}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
                Subject / Course *
              </label>
              <select
                required
                value={cancelFormData.subject_id}
                onChange={e => setCancelFormData({ ...cancelFormData, subject_id: e.target.value })}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-text-main)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.9rem'
                }}
              >
                {subjectsList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code}) — {s.department}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
                  Session Date (DD/MM/YYYY) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="DD/MM/YYYY"
                  value={cancelFormData.date}
                  onChange={e => setCancelFormData({ ...cancelFormData, date: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--color-text-main)',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
                  Session Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10:00 AM"
                  value={cancelFormData.session_time}
                  onChange={e => setCancelFormData({ ...cancelFormData, session_time: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--color-text-main)',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
                Reason for Cancellation (Audit Trail) *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Faculty attending institutional symposium; class postponed to next Tuesday"
                value={cancelFormData.reason}
                onChange={e => setCancelFormData({ ...cancelFormData, reason: e.target.value })}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-text-main)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingCancel}
              style={{
                width: '100%',
                background: '#e11d48',
                border: 'none',
                color: '#fff',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: isSubmittingCancel ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(225, 29, 72, 0.25)'
              }}
            >
              {isSubmittingCancel ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Logging Cancellation...
                </>
              ) : (
                <>
                  <UserX size={18} />
                  Confirm Cancellation & Protect Students
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: SUBSTITUTE ASSIGNMENT (STAFF ONLY) */}
      {activeTab === 'substitute' && isStaff && (
        <div className="surface-card" style={{
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '680px',
          margin: '0 auto',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              borderRadius: '10px',
              padding: '8px',
              color: '#7c3aed'
            }}>
              <UserCheck size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-main)', fontWeight: 700 }}>Assign Substitute Faculty</h3>
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                Delegate temporary teaching and attendance authority with institutional audit logs.
              </p>
            </div>
          </div>

          <form onSubmit={handleAssignSubstitute}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
                Subject / Class *
              </label>
              <select
                required
                value={substituteFormData.subject_id}
                onChange={e => setSubstituteFormData({ ...substituteFormData, subject_id: e.target.value })}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-text-main)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.9rem'
                }}
              >
                {subjectsList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
                Substitute Teacher *
              </label>
              <select
                required
                value={substituteFormData.substitute_teacher_id}
                onChange={e => setSubstituteFormData({ ...substituteFormData, substitute_teacher_id: e.target.value })}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-text-main)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.9rem'
                }}
              >
                {teachersList.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
                Date (DD/MM/YYYY) *
              </label>
              <input
                type="text"
                required
                placeholder="DD/MM/YYYY"
                value={substituteFormData.date}
                onChange={e => setSubstituteFormData({ ...substituteFormData, date: e.target.value })}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-text-main)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '6px' }}>
                Reason for Substitution *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Faculty medical leave coverage"
                value={substituteFormData.reason}
                onChange={e => setSubstituteFormData({ ...substituteFormData, reason: e.target.value })}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-text-main)',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingSubstitute}
              style={{
                width: '100%',
                background: '#7c3aed',
                border: 'none',
                color: '#fff',
                padding: '12px',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: isSubmittingSubstitute ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.25)'
              }}
            >
              {isSubmittingSubstitute ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCheck size={18} />
                  Authorize Substitute Faculty
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* MODAL: CREATE CALENDAR EVENT */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="surface-card" style={{
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowCreateModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                background: '#eff6ff',
                borderRadius: '8px',
                padding: '6px',
                color: 'var(--color-primary)',
                display: 'flex'
              }}>
                <Calendar size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--color-text-main)', fontWeight: 700 }}>Schedule Academic Event</h3>
            </div>

            <form onSubmit={handleCreateEvent}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '5px' }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mid-Term Examination / Deepavali Holiday"
                  value={eventFormData.title}
                  onChange={e => setEventFormData({ ...eventFormData, title: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--color-text-main)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '5px' }}>
                    Event Type *
                  </label>
                  <select
                    value={eventFormData.event_type}
                    onChange={e => setEventFormData({ ...eventFormData, event_type: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--color-text-main)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontSize: '0.88rem'
                    }}
                  >
                    <option value="HOLIDAY">Holiday</option>
                    <option value="EXAM">Exam Session</option>
                    <option value="SPECIAL_CLASS">Special Class</option>
                    <option value="EVENT">Academic Event</option>
                    <option value="INSTITUTION_CLOSED">Institution Closed</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '5px' }}>
                    Department (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="All Departments or e.g. CSE"
                    value={eventFormData.department}
                    onChange={e => setEventFormData({ ...eventFormData, department: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--color-text-main)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '5px' }}>
                    Start Date (DD/MM/YYYY) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="DD/MM/YYYY"
                    value={eventFormData.start_date}
                    onChange={e => setEventFormData({ ...eventFormData, start_date: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--color-text-main)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '5px' }}>
                    End Date (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={eventFormData.end_date}
                    onChange={e => setEventFormData({ ...eventFormData, end_date: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--color-text-main)',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '5px' }}>
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide context or instructions for students & staff"
                  value={eventFormData.description}
                  onChange={e => setEventFormData({ ...eventFormData, description: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--color-text-main)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--color-text-secondary)',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
