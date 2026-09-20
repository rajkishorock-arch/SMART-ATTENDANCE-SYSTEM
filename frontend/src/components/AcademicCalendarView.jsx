import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, Plus, Trash2, AlertTriangle, UserCheck, 
  CheckCircle2, Filter, ShieldCheck, BookOpen,
  RefreshCw, X, UserX
} from 'lucide-react';
import { systemApi, calendarApi, teacherApi } from '../api/index.js';

const EVENT_TYPE_COLORS = {
  HOLIDAY: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#f87171', label: 'Holiday' },
  EXAM: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24', label: 'Exam Session' },
  CLASS_CANCELLED: { bg: 'rgba(225, 29, 72, 0.2)', border: 'rgba(225, 29, 72, 0.5)', text: '#fb7185', label: 'Class Cancelled' },
  SUBSTITUTE_CLASS: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)', text: '#c084fc', label: 'Substitute Class' },
  TEACHER_SUBSTITUTION: { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)', text: '#c084fc', label: 'Teacher Substituted' },
  INSTITUTION_CLOSED: { bg: 'rgba(156, 163, 175, 0.15)', border: 'rgba(156, 163, 175, 0.4)', text: '#9ca3af', label: 'Campus Closed' },
  SPECIAL_CLASS: { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.4)', text: '#22d3ee', label: 'Special Lecture' },
  EVENT: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', text: '#60a5fa', label: 'Academic Event' }
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
      color: '#f8fafc',
      padding: '24px',
      maxWidth: '1280px',
      margin: '0 auto',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.7) 100%)',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(12px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(0, 242, 254, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                background: 'rgba(0, 242, 254, 0.15)',
                border: '1px solid rgba(0, 242, 254, 0.4)',
                borderRadius: '10px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00f2fe'
              }}>
                <Calendar size={22} />
              </div>
              <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
                Academic Calendar & Schedule Engine
              </h2>
              <span style={{
                background: 'rgba(0, 242, 254, 0.1)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                color: '#00f2fe',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '20px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                Phase 3 Production
              </span>
            </div>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.92rem', maxWidth: '780px', lineHeight: 1.5 }}>
              Institutional schedule synchronization, holiday tracking, substitute faculty delegation, and 
              safe class cancellation protection that automatically safeguards student attendance percentages.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => { playCyberSound('click'); fetchEvents(); fetchMetrics(selectedSubjectIdForMetrics); }}
              disabled={isLoading}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1',
                padding: '10px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Sync
            </button>

            {isStaff && (
              <button
                onClick={() => { playCyberSound('click'); setShowCreateModal(true); }}
                style={{
                  background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                  border: 'none',
                  color: '#031726',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(0, 242, 254, 0.35)',
                  transition: 'transform 0.2s'
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
                Add Event
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
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
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#f87171',
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
        gap: '12px',
        marginBottom: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => { playCyberSound('click'); setActiveTab('events'); }}
          style={{
            background: activeTab === 'events' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            border: activeTab === 'events' ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
            color: activeTab === 'events' ? '#00f2fe' : '#94a3b8',
            padding: '8px 18px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Calendar size={16} />
          Institutional Schedule ({events.length})
        </button>

        <button
          onClick={() => { playCyberSound('click'); setActiveTab('metrics'); }}
          style={{
            background: activeTab === 'metrics' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            border: activeTab === 'metrics' ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
            color: activeTab === 'metrics' ? '#00f2fe' : '#94a3b8',
            padding: '8px 18px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
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
                background: activeTab === 'cancel' ? 'rgba(225, 29, 72, 0.15)' : 'transparent',
                border: activeTab === 'cancel' ? '1px solid rgba(225, 29, 72, 0.4)' : '1px solid transparent',
                color: activeTab === 'cancel' ? '#fb7185' : '#94a3b8',
                padding: '8px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <UserX size={16} />
              Cancel Class Session
            </button>

            <button
              onClick={() => { playCyberSound('click'); setActiveTab('substitute'); }}
              style={{
                background: activeTab === 'substitute' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                border: activeTab === 'substitute' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
                color: activeTab === 'substitute' ? '#c084fc' : '#94a3b8',
                padding: '8px 18px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
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
            gap: '10px',
            marginBottom: '20px',
            overflowX: 'auto',
            paddingBottom: '6px'
          }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} /> Filter:
            </span>
            {['ALL', 'HOLIDAY', 'EXAM', 'CLASS_CANCELLED', 'SPECIAL_CLASS', 'EVENT', 'SUBSTITUTE_CLASS'].map(type => (
              <button
                key={type}
                onClick={() => { playCyberSound('click'); setEventTypeFilter(type); }}
                style={{
                  background: eventTypeFilter === type ? 'rgba(0, 242, 254, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                  border: eventTypeFilter === type ? '1px solid rgba(0, 242, 254, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: eventTypeFilter === type ? '#00f2fe' : '#94a3b8',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {type === 'ALL' ? 'All Events' : (EVENT_TYPE_COLORS[type]?.label || type)}
              </button>
            ))}
          </div>

          {/* Events Grid */}
          {events.length === 0 ? (
            <div style={{
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '48px 24px',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Calendar size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 6px 0', color: '#94a3b8', fontSize: '1.1rem' }}>No Scheduled Events Found</h4>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>
                There are currently no events matching the selected filter in your institution calendar.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '16px'
            }}>
              {events.map(event => {
                const badge = EVENT_TYPE_COLORS[event.event_type] || {
                  bg: 'rgba(148, 163, 184, 0.15)',
                  border: 'rgba(148, 163, 184, 0.3)',
                  text: '#cbd5e1',
                  label: event.event_type
                };

                return (
                  <div
                    key={event.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      border: `1px solid ${badge.border}`,
                      borderRadius: '14px',
                      padding: '20px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
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
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'color 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
                        {event.title}
                      </h3>
                      {event.description && (
                        <p style={{ margin: '0 0 14px 0', color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.45 }}>
                          {event.description}
                        </p>
                      )}

                      {/* Meta Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                        {event.subject_name && (
                          <span style={{
                            background: 'rgba(0, 242, 254, 0.08)',
                            border: '1px solid rgba(0, 242, 254, 0.2)',
                            color: '#22d3ee',
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <BookOpen size={12} /> {event.subject_name} ({event.subject_code})
                          </span>
                        )}

                        {event.department && (
                          <span style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#cbd5e1',
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            Dept: {event.department}
                          </span>
                        )}

                        {event.substitute_teacher_name && (
                          <span style={{
                            background: 'rgba(168, 85, 247, 0.12)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            color: '#c084fc',
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <UserCheck size={12} /> Substitute: {event.substitute_teacher_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Date & Time */}
                    <div style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      paddingTop: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.8rem',
                      color: '#64748b'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8' }}>
                        <Calendar size={14} />
                        {event.start_date}
                        {event.end_date && event.end_date !== event.start_date && ` → ${event.end_date}`}
                      </span>

                      {event.start_time && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(0, 242, 254, 0.2)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#00f2fe" />
                Calendar-Aware Attendance Safety Engine
              </h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>
                Conducted Classes = Scheduled Classes − Cancelled Classes. Students are never penalized for approved cancellations.
              </p>
            </div>

            {/* Subject Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Subject:</label>
              <select
                value={selectedSubjectIdForMetrics}
                onChange={e => {
                  setSelectedSubjectIdForMetrics(e.target.value);
                  fetchMetrics(e.target.value);
                }}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
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
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
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
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '18px'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Scheduled Classes</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginTop: '6px' }}>
                    {metrics.scheduled_classes}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Total sessions on timetable</span>
                </div>

                <div style={{
                  background: 'rgba(225, 29, 72, 0.1)',
                  border: '1px solid rgba(225, 29, 72, 0.3)',
                  borderRadius: '12px',
                  padding: '18px'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#fb7185', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cancelled / Exempted</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fb7185', marginTop: '6px' }}>
                    {metrics.cancelled_classes}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Deducted from denominator</span>
                </div>

                <div style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '12px',
                  padding: '18px'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Conducted Classes</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#22d3ee', marginTop: '6px' }}>
                    {metrics.conducted_classes}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Effective teaching sessions</span>
                </div>

                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '12px',
                  padding: '18px'
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Attended Classes</span>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#34d399', marginTop: '6px' }}>
                    {metrics.attended_classes}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Present / Late / Excused</span>
                </div>
              </div>

              {/* Protection Shield Banner */}
              <div style={{
                background: metrics.is_at_risk 
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)'
                  : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%)',
                border: metrics.is_at_risk ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
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
                    background: metrics.is_at_risk ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    border: metrics.is_at_risk ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: metrics.is_at_risk ? '#f87171' : '#34d399'
                  }}>
                    {metrics.is_at_risk ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: '#fff' }}>
                      Calendar-Adjusted Percentage: {metrics.attendance_percentage}%
                    </h4>
                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                      {metrics.is_at_risk 
                        ? 'Warning: Attendance is currently below the 75% threshold. Take corrective action.' 
                        : 'Safe & Protected: Academic standing is in good compliance (≥ 75%).'}
                    </p>
                  </div>
                </div>

                <div style={{
                  fontSize: '0.85rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1'
                }}>
                  Formula: ({metrics.attended_classes} ÷ {metrics.conducted_classes}) × 100 = <strong>{metrics.attendance_percentage}%</strong>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>No metrics available for the selected parameters.</p>
          )}
        </div>
      )}

      {/* TAB 3: CANCEL CLASS FORM (STAFF ONLY) */}
      {activeTab === 'cancel' && isStaff && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(225, 29, 72, 0.3)',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '680px',
          margin: '0 auto',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{
              background: 'rgba(225, 29, 72, 0.15)',
              border: '1px solid rgba(225, 29, 72, 0.4)',
              borderRadius: '10px',
              padding: '8px',
              color: '#fb7185'
            }}>
              <UserX size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Cancel Class Session</h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                Session will be logged in the academic calendar and student absences will be safely purged.
              </p>
            </div>
          </div>

          {/* Guarantee Warning */}
          <div style={{
            background: 'rgba(0, 242, 254, 0.08)',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '20px',
            fontSize: '0.85rem',
            color: '#a5f3fc',
            lineHeight: 1.45
          }}>
            <strong>Automatic Protection Guarantee:</strong> Existing attendance records for this subject on this date 
            will be converted to <code>CLASS_CANCELLED</code>. These cancelled hours are excluded from the total conducted count, 
            so students will not be penalized.
          </div>

          <form onSubmit={handleCancelClass}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                Subject / Course *
              </label>
              <select
                required
                value={cancelFormData.subject_id}
                onChange={e => setCancelFormData({ ...cancelFormData, subject_id: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
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
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
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
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                  Session Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10:00 AM"
                  value={cancelFormData.session_time}
                  onChange={e => setCancelFormData({ ...cancelFormData, session_time: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
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
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
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
                background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
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
                boxShadow: '0 4px 16px rgba(225, 29, 72, 0.35)'
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
        <div style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '680px',
          margin: '0 auto',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '10px',
              padding: '8px',
              color: '#c084fc'
            }}>
              <UserCheck size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Assign Substitute Faculty</h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                Delegate temporary teaching and attendance authority with institutional audit logs.
              </p>
            </div>
          </div>

          <form onSubmit={handleAssignSubstitute}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                Subject / Class *
              </label>
              <select
                required
                value={substituteFormData.subject_id}
                onChange={e => setSubstituteFormData({ ...substituteFormData, subject_id: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
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
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                Substitute Teacher *
              </label>
              <select
                required
                value={substituteFormData.substitute_teacher_id}
                onChange={e => setSubstituteFormData({ ...substituteFormData, substitute_teacher_id: e.target.value })}
                style={{
                  width: '100%',
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
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
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
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
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
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
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
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
                background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
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
                boxShadow: '0 4px 16px rgba(168, 85, 247, 0.35)'
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
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            padding: '28px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
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
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Calendar size={22} color="#00f2fe" />
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#fff' }}>Schedule Academic Event</h3>
            </div>

            <form onSubmit={handleCreateEvent}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '5px' }}>
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
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '5px' }}>
                    Event Type *
                  </label>
                  <select
                    value={eventFormData.event_type}
                    onChange={e => setEventFormData({ ...eventFormData, event_type: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
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
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '5px' }}>
                    Department (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="All Departments or e.g. CSE"
                    value={eventFormData.department}
                    onChange={e => setEventFormData({ ...eventFormData, department: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '5px' }}>
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
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '5px' }}>
                    End Date (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="DD/MM/YYYY"
                    value={eventFormData.end_date}
                    onChange={e => setEventFormData({ ...eventFormData, end_date: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '5px' }}>
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide context or instructions for students & staff"
                  value={eventFormData.description}
                  onChange={e => setEventFormData({ ...eventFormData, description: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#fff',
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
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#cbd5e1',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                    border: 'none',
                    color: '#031726',
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
