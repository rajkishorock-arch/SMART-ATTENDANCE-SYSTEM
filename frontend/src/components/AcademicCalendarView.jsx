import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Calendar,
  ShieldCheck,
  CalendarX,
  UserCheck,
  Plus,
  RefreshCw,
  ChevronRight,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
} from 'lucide-react';
import { calendarApi, teacherApi, apiGet } from '../api/index.js';
import { normalizeToIsoDate, isoToDmyDate } from '../utils/attendanceDateUtils';

const CALENDAR_PERIOD_SLOTS = [
  'Period 1 (09:00 - 10:00 AM)',
  'Period 2 (10:00 - 11:00 AM)',
  'Period 3 (11:00 - 12:00 PM)',
  'Period 4 (12:00 - 01:00 PM)',
  'Period 5 (01:00 - 02:00 PM)',
  'Period 6 (02:00 - 03:00 PM)',
  'Period 7 (03:00 - 04:00 PM)',
  'Period 8 (04:00 - 05:00 PM)',
];

const EVENT_TYPE_META = {
  HOLIDAY: { label: 'Holiday', short: 'HOL', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  EXAM: { label: 'Exam Session', short: 'EXM', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  CLASS_CANCELLED: { label: 'Class Cancelled', short: 'CXL', bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
  TEACHER_SUBSTITUTION: { label: 'Substitute', short: 'SUB', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
  SUBSTITUTE_CLASS: { label: 'Substitute', short: 'SUB', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
  SPECIAL_CLASS: { label: 'Special Lecture', short: 'SPL', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  INSTITUTION_CLOSED: { label: 'Campus Closed', short: 'CLS', bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  WORKING_DAY: { label: 'Working Day', short: 'WRK', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  EVENT: { label: 'Academic Event', short: 'EVT', bg: '#fcf6e8', color: '#785927', border: '#e5d3a7' },
};

const SCHEDULE_FILTER_OPTIONS = [
  { id: 'ALL', label: 'All Events' },
  { id: 'HOLIDAY', label: 'Holiday' },
  { id: 'EXAM', label: 'Exam Session' },
  { id: 'CLASS_CANCELLED', label: 'Class Cancelled' },
  { id: 'TEACHER_SUBSTITUTION', label: 'Substitute' },
  { id: 'SPECIAL_CLASS', label: 'Special Lecture' },
  { id: 'EVENT', label: 'Academic Event' },
];

const CREATE_CATEGORY_OPTIONS = [
  { value: 'HOLIDAY', label: 'Institutional Holiday' },
  { value: 'EXAM', label: 'Examination Session' },
  { value: 'SPECIAL_CLASS', label: 'Special Lecture / Lab' },
  { value: 'EVENT', label: 'Campus Academic Event' },
  { value: 'INSTITUTION_CLOSED', label: 'Institution Closed' },
  { value: 'WORKING_DAY', label: 'Compensatory Working Day' },
];

const getLocalTodayIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getEventMeta = (type) => {
  const key = String(type || 'EVENT').toUpperCase();
  return EVENT_TYPE_META[key] || EVENT_TYPE_META.EVENT;
};

const formatDisplayDate = (raw) => {
  const formatted = isoToDmyDate(raw);
  return formatted || String(raw || '').trim() || 'Not specified';
};

const sortEventsNewestFirst = (list) => {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const isoA = normalizeToIsoDate(a?.start_date || a?.date || '');
    const isoB = normalizeToIsoDate(b?.start_date || b?.date || '');
    if (isoA !== isoB) return isoB.localeCompare(isoA);
    return Number(b?.id || 0) - Number(a?.id || 0);
  });
};

const isSubstitutionType = (eventType) => {
  const t = String(eventType || '').toUpperCase();
  return t === 'TEACHER_SUBSTITUTION' || t === 'SUBSTITUTE_CLASS';
};

/**
 * Academic Calendar View (Golden Gate OS Design)
 * Clean 4-item landing list leading to dedicated sub-pages with live data across Admin, Teacher, and Student credentials.
 */
export default function AcademicCalendarView({
  token,
  currentUser,
  playCyberSound = () => {},
  eventsData = null,
  hasLoadedData = false,
  onEventsChange = null,
  initialMetrics = null,
  onMetricsChange = null,
  subjects: propSubjects = [],
  students: propStudents = [],
  teachers: propTeachers = [],
  routeView = null,
  setRouteView = null,
  onCloseSubView = null,
}) {
  const userRole = String(currentUser?.role || '').toLowerCase();
  const currentUserId = currentUser?.id;
  const currentUserEmail = currentUser?.email;
  const isStaff = ['admin', 'teacher', 'hod', 'superadmin', 'super_admin'].includes(userRole);

  const [localRoute, setLocalRoute] = useState(null);
  const activeRoute = routeView !== undefined && setRouteView ? routeView : localRoute;
  const activeMode = activeRoute?.mode || null;
  const navigateRoute = useCallback(
    (next) => {
      if (playCyberSound) playCyberSound('click');
      if (setRouteView) {
        setRouteView(next);
      } else {
        setLocalRoute(next);
      }
    },
    [playCyberSound, setRouteView]
  );

  // Local fallback stores used only when parent doesn't supply/own the dataset
  const [localEvents, setLocalEvents] = useState(null);
  const [customMetrics, setCustomMetrics] = useState(null);
  const [extraSubjects, setExtraSubjects] = useState([]);
  const [extraTeachers, setExtraTeachers] = useState([]);

  const events = useMemo(() => {
    const source = Array.isArray(localEvents)
      ? localEvents
      : (Array.isArray(eventsData) ? eventsData : []);
    return sortEventsNewestFirst(source);
  }, [localEvents, eventsData]);

  const subjectsList = useMemo(
    () => (Array.isArray(propSubjects) && propSubjects.length > 0 ? propSubjects : extraSubjects),
    [propSubjects, extraSubjects]
  );

  const studentsList = useMemo(
    () => (Array.isArray(propStudents) ? propStudents : []),
    [propStudents]
  );

  const teachersList = useMemo(
    () => (Array.isArray(propTeachers) && propTeachers.length > 0 ? propTeachers : extraTeachers),
    [propTeachers, extraTeachers]
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Schedule filter state (0ms client-side)
  const [scheduleFilter, setScheduleFilter] = useState('ALL');
  const [scheduleQuery, setScheduleQuery] = useState('');

  // Analytics filter state
  const [analyticsSubjectId, setAnalyticsSubjectId] = useState('');
  const [analyticsStudentId, setAnalyticsStudentId] = useState('');
  const [metricsLoading, setMetricsLoading] = useState(false);

  const metrics = useMemo(() => {
    if (!analyticsSubjectId && !analyticsStudentId) {
      return customMetrics || initialMetrics || null;
    }
    return customMetrics || null;
  }, [analyticsSubjectId, analyticsStudentId, customMetrics, initialMetrics]);

  // Create Event state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('HOLIDAY');
  const [newStartDate, setNewStartDate] = useState(getLocalTodayIso);
  const [newEndDate, setNewEndDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Cancel Class form state
  const [cancelSubjectId, setCancelSubjectId] = useState('');
  const [cancelDate, setCancelDate] = useState(getLocalTodayIso);
  const [cancelSessionTime, setCancelSessionTime] = useState(CALENDAR_PERIOD_SLOTS[0]);
  const [cancelReason, setCancelReason] = useState('');

  // Substitute Delegation form state
  const [subSubjectId, setSubSubjectId] = useState('');
  const [subTeacherId, setSubTeacherId] = useState('');
  const [subDate, setSubDate] = useState(getLocalTodayIso);
  const [subReason, setSubReason] = useState('');

  const toastTimerRef = useRef(null);
  const showFeedback = useCallback((type, text) => {
    setToast({ type, text });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 4500);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  const commitEventsUpdate = useCallback(
    (nextEvents) => {
      const sorted = sortEventsNewestFirst(nextEvents);
      setLocalEvents(sorted);
      if (onEventsChange) onEventsChange(sorted);
      window.dispatchEvent(new Event('academic_calendar_updated'));
    },
    [onEventsChange]
  );

  const fetchEventsFromServer = useCallback(
    async (forceRefresh = false) => {
      if (!token) return;
      try {
        const list = await calendarApi.fetchEvents(token, null, forceRefresh);
        const sorted = sortEventsNewestFirst(list);
        setLocalEvents(sorted);
        if (onEventsChange) onEventsChange(sorted);
      } catch (err) {
        if (forceRefresh) {
          showFeedback('error', err.message || 'Could not refresh calendar schedule.');
        }
      }
    },
    [token, onEventsChange, showFeedback]
  );

  const fetchMetricsFromServer = useCallback(
    async (forceRefresh = false, subjOverride = undefined, studOverride = undefined) => {
      if (!token) return;
      const subjVal = subjOverride !== undefined ? subjOverride : analyticsSubjectId;
      const studVal = studOverride !== undefined ? studOverride : analyticsStudentId;
      try {
        const data = await calendarApi.fetchAttendanceMetrics(
          token,
          subjVal ? Number(subjVal) : null,
          isStaff && studVal ? Number(studVal) : null,
          forceRefresh
        );
        if (data) {
          setCustomMetrics(data);
          if (!subjVal && !studVal && onMetricsChange) {
            onMetricsChange(data);
          }
        }
      } catch {
        /* keep existing cached metrics on transient error */
      }
    },
    [token, analyticsSubjectId, analyticsStudentId, isStaff, onMetricsChange]
  );

  const fetchSupportRosters = useCallback(async () => {
    if (!token) return;
    const tasks = [];
    if (subjectsList.length === 0) {
      tasks.push(
        apiGet('/subjects', { token })
          .then(async (res) => {
            if (res && res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) setExtraSubjects(data);
            }
          })
          .catch(() => {})
      );
    }
    if (isStaff && teachersList.length === 0) {
      tasks.push(
        teacherApi
          .listTeachers(token, userRole === 'teacher' ? 'teacher' : null)
          .then(async (res) => {
            if (res && res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) setExtraTeachers(data);
            }
          })
          .catch(() => {})
      );
    }
    if (tasks.length > 0) await Promise.allSettled(tasks);
  }, [token, isStaff, userRole, subjectsList.length, teachersList.length]);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    void (async () => {
      const ops = [];
      if (!hasLoadedData || events.length === 0) ops.push(fetchEventsFromServer(false));
      if (!metrics) ops.push(fetchMetricsFromServer(false));
      ops.push(fetchSupportRosters());
      await Promise.allSettled(ops);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [token, hasLoadedData, events.length, metrics, fetchEventsFromServer, fetchMetricsFromServer, fetchSupportRosters]);

  useEffect(() => {
    if (!activeMode || !token) return undefined;
    let cancelled = false;
    void (async () => {
      if (activeMode === 'analytics') {
        await fetchMetricsFromServer(false);
      }
      if (['cancel', 'substitute', 'new', 'analytics'].includes(activeMode)) {
        await fetchSupportRosters();
      }
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [activeMode, token, fetchMetricsFromServer, fetchSupportRosters]);

  const handleRefreshAll = async () => {
    if (playCyberSound) playCyberSound('click');
    setIsRefreshing(true);
    try {
      await Promise.allSettled([
        fetchEventsFromServer(true),
        fetchMetricsFromServer(true),
        fetchSupportRosters(),
      ]);
      showFeedback('success', 'Academic calendar synced with server.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMetricsFilterChange = async (nextSubj, nextStud) => {
    setAnalyticsSubjectId(nextSubj);
    setAnalyticsStudentId(nextStud);
    setMetricsLoading(true);
    try {
      await fetchMetricsFromServer(true, nextSubj, nextStud);
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleBack = () => {
    if (onCloseSubView) {
      onCloseSubView();
      return;
    }
    if (activeMode === 'detail') {
      navigateRoute({ mode: 'schedule' });
      return;
    }
    navigateRoute(null);
  };

  const activeTeachersForDelegate = useMemo(() => {
    const active = (teachersList || []).filter(
      (t) => String(t?.role || '').toLowerCase() === 'teacher' && t?.is_active !== false
    );
    if (userRole === 'teacher' && currentUserId) {
      const peers = active.filter((t) => Number(t.id) !== Number(currentUserId));
      if (peers.length > 0) return peers;
    }
    return active;
  }, [teachersList, userRole, currentUserId]);

  const cancelledEvents = useMemo(
    () => events.filter((e) => String(e?.event_type || '').toUpperCase() === 'CLASS_CANCELLED'),
    [events]
  );

  const substituteEvents = useMemo(
    () => events.filter((e) => isSubstitutionType(e?.event_type)),
    [events]
  );

  const filteredScheduleEvents = useMemo(() => {
    const q = scheduleQuery.trim().toLowerCase();
    return events.filter((evt) => {
      const evtType = String(evt?.event_type || 'EVENT').toUpperCase();
      if (scheduleFilter !== 'ALL') {
        if (scheduleFilter === 'TEACHER_SUBSTITUTION') {
          if (!isSubstitutionType(evtType)) return false;
        } else if (evtType !== scheduleFilter) {
          return false;
        }
      }
      if (!q) return true;
      const hay = [
        evt.title,
        evt.description,
        evt.subject_name,
        evt.subject_code,
        evt.department,
        evt.teacher_name,
        evt.substitute_teacher_name,
        evt.start_date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [events, scheduleFilter, scheduleQuery]);

  const resolvedDetailEvent = useMemo(() => {
    if (activeRoute?.mode !== 'detail') return null;
    return (
      activeRoute.item ||
      events.find((e) => String(e.id) === String(activeRoute.id)) ||
      null
    );
  }, [activeRoute, events]);

  const openEventDetail = (evt) => {
    navigateRoute({ mode: 'detail', id: evt.id, item: evt });
  };

  const canDeleteEvent = (evt) => {
    if (!isStaff || !evt) return false;
    if (['admin', 'hod', 'superadmin', 'super_admin'].includes(userRole)) {
      return true;
    }
    return (
      !evt.teacher_id ||
      Number(evt.teacher_id) === Number(currentUserId) ||
      Number(evt.substitute_teacher_id) === Number(currentUserId) ||
      (evt.created_by && evt.created_by === currentUserEmail)
    );
  };

  const handleDeleteEvent = async (evt, returnToSchedule = false) => {
    if (!evt?.id) return;
    setDeletingId(evt.id);
    try {
      await calendarApi.deleteEvent(token, evt.id);
      if (playCyberSound) playCyberSound('click');
      const next = events.filter((e) => String(e.id) !== String(evt.id));
      commitEventsUpdate(next);
      showFeedback('success', `Removed "${evt.title}".`);
      await fetchMetricsFromServer(true);
      if (returnToSchedule) {
        navigateRoute({ mode: 'schedule' });
      }
    } catch (err) {
      showFeedback('error', err.message || 'Could not remove calendar event.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateEventSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newStartDate) {
      showFeedback('error', 'Please enter a title and start date.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        title: newTitle.trim(),
        event_type: newType,
        start_date: newStartDate,
        end_date: newEndDate || null,
        start_time: newStartTime || null,
        end_time: newEndTime || null,
        subject_id: newSubjectId ? Number(newSubjectId) : null,
        department: newDepartment.trim() || null,
        description: newDescription.trim() || null,
      };
      const created = await calendarApi.createEvent(token, payload);
      if (playCyberSound) playCyberSound('success');
      commitEventsUpdate([created, ...events.filter((x) => x.id !== created.id)]);
      setNewTitle('');
      setNewDescription('');
      setNewDepartment('');
      setNewSubjectId('');
      setNewEndDate('');
      setNewStartTime('');
      setNewEndTime('');
      showFeedback('success', `Scheduled "${created.title}".`);
      navigateRoute({ mode: 'schedule' });
    } catch (err) {
      showFeedback('error', err.message || 'Failed to schedule event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClassSubmit = async (e) => {
    e.preventDefault();
    if (!cancelSubjectId || !cancelDate || !cancelReason.trim()) {
      showFeedback('error', 'Select a subject, date, and reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await calendarApi.cancelClass(token, {
        subject_id: Number(cancelSubjectId),
        date: cancelDate,
        session_time: cancelSessionTime || CALENDAR_PERIOD_SLOTS[0],
        reason: cancelReason.trim(),
      });
      if (playCyberSound) playCyberSound('success');
      commitEventsUpdate([created, ...events.filter((x) => x.id !== created.id)]);
      setCancelReason('');
      showFeedback('success', 'Class cancelled and student attendance protected.');
      await fetchMetricsFromServer(true);
    } catch (err) {
      showFeedback('error', err.message || 'Failed to cancel class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubstituteSubmit = async (e) => {
    e.preventDefault();
    if (!subSubjectId || !subTeacherId || !subDate || !subReason.trim()) {
      showFeedback('error', 'Select subject, substitute teacher, date, and reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await calendarApi.substituteClass(token, {
        subject_id: Number(subSubjectId),
        substitute_teacher_id: Number(subTeacherId),
        date: subDate,
        reason: subReason.trim(),
      });
      if (playCyberSound) playCyberSound('success');
      commitEventsUpdate([created, ...events.filter((x) => x.id !== created.id)]);
      setSubReason('');
      showFeedback('success', `Substitute assigned (${created.substitute_teacher_name || 'Faculty'}).`);
    } catch (err) {
      showFeedback('error', err.message || 'Failed to assign substitute teacher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '11px',
    border: '1px solid #dfd0ae',
    background: '#fffdf9',
    color: '#25231f',
    fontSize: '0.88rem',
    fontWeight: 500,
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.73rem',
    fontWeight: 700,
    color: '#6b5b3e',
    marginBottom: '5px',
  };

  const primaryGoldButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    padding: '10px 16px',
    borderRadius: '12px',
    border: '1px solid #91671a',
    background: 'linear-gradient(135deg, #b8892c, #8a6016)',
    color: '#ffffff',
    fontSize: '0.84rem',
    fontWeight: 700,
    cursor: isSubmitting ? 'wait' : 'pointer',
    boxShadow: '0 4px 12px rgba(145, 103, 26, 0.2)',
  };

  const secondaryButtonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '11px',
    border: '1px solid #dfd0ae',
    background: '#fffcf5',
    color: '#4f3a18',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
  };

  const renderToastBanner = () => {
    if (!toast) return null;
    const isErr = toast.type === 'error';
    return (
      <div
        role="status"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '12px',
          background: isErr ? '#fef2f2' : '#ecfdf5',
          border: `1px solid ${isErr ? '#fecaca' : '#a7f3d0'}`,
          color: isErr ? '#b91c1c' : '#047857',
          fontSize: '0.82rem',
          fontWeight: 700,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {isErr ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
        <button
          type="button"
          onClick={() => setToast(null)}
          aria-label="Dismiss message"
          style={{ border: 0, background: 'transparent', color: 'inherit', fontWeight: 800, cursor: 'pointer' }}
        >
          ×
        </button>
      </div>
    );
  };

  const renderEventRow = (evt, allowQuickDelete = false) => {
    const meta = getEventMeta(evt.event_type);
    const subtitleParts = [
      formatDisplayDate(evt.start_date),
      evt.subject_name || '',
      evt.substitute_teacher_name ? `Sub: ${evt.substitute_teacher_name}` : '',
      evt.department || '',
    ].filter(Boolean);

    return (
      <div key={evt.id} className="golden-os-list-row" style={{ gap: '8px' }}>
        <button
          type="button"
          onClick={() => openEventDetail(evt)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: 0,
            flex: 1,
            background: 'transparent',
            border: 0,
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <div
            className="golden-os-avatar"
            style={{
              background: meta.bg,
              color: meta.color,
              borderColor: meta.border,
              fontSize: '0.7rem',
            }}
          >
            {meta.short}
          </div>
          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#25231f',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {evt.title}
            </span>
            <span
              style={{
                fontSize: '0.74rem',
                color: '#6b5b3e',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitleParts.join(' · ')}
            </span>
          </div>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '999px',
              fontSize: '0.66rem',
              fontWeight: 700,
              background: meta.bg,
              color: meta.color,
              border: `1px solid ${meta.border}`,
            }}
          >
            {meta.label}
          </span>
          {allowQuickDelete && canDeleteEvent(evt) && (
            <button
              type="button"
              onClick={() => handleDeleteEvent(evt, false)}
              disabled={deletingId === evt.id}
              aria-label={`Remove ${evt.title}`}
              style={{
                padding: '6px',
                borderRadius: '9px',
                border: '1px solid #fecaca',
                background: '#fff5f5',
                color: '#b91c1c',
                cursor: 'pointer',
                display: 'inline-flex',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
          <ChevronRight size={16} color="#8c734b" />
        </div>
      </div>
    );
  };

  // ── 1. CLEAN 4-ITEM LANDING VIEW (#/calendar) ────────────────────────────────
  if (!activeRoute) {
    const landingItems = [
      {
        id: 'schedule',
        title: 'Institutional Schedule',
        subtitle: 'Holidays, exams, notices & lectures',
        badge: `${events.length} ${events.length === 1 ? 'event' : 'events'}`,
        Icon: Calendar,
        bg: '#fcf6e8',
        color: '#785927',
        border: '#dfd0ae',
      },
      {
        id: 'analytics',
        title: 'Attendance Protection Analytics',
        subtitle: 'Exempt sessions & safe attendance rate',
        badge: metrics ? `${metrics.attendance_percentage}%` : 'Live',
        Icon: ShieldCheck,
        bg: '#ecfdf5',
        color: '#047857',
        border: '#a7f3d0',
      },
      ...(isStaff
        ? [
            {
              id: 'cancel',
              title: 'Cancel Class Session',
              subtitle: 'Mark cancelled & protect student attendance',
              badge: cancelledEvents.length > 0 ? `${cancelledEvents.length} active` : 'Manage',
              Icon: CalendarX,
              bg: '#fff1f2',
              color: '#be123c',
              border: '#fecdd3',
            },
            {
              id: 'substitute',
              title: 'Substitute Faculty Delegation',
              subtitle: 'Reassign class teacher & notify students',
              badge: substituteEvents.length > 0 ? `${substituteEvents.length} active` : 'Assign',
              Icon: UserCheck,
              bg: '#f0f9ff',
              color: '#0369a1',
              border: '#bae6fd',
            },
          ]
        : []),
    ];

    return (
      <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {renderToastBanner()}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={handleRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
            <span>{isRefreshing ? 'Syncing' : 'Refresh'}</span>
          </button>
          {isStaff && (
            <button
              type="button"
              style={primaryGoldButtonStyle}
              onClick={() => navigateRoute({ mode: 'new' })}
            >
              <Plus size={15} />
              <span>Add Event</span>
            </button>
          )}
        </div>

        <div className="golden-os-list-shell">
          {landingItems.map((item) => {
            const RowIcon = item.Icon;
            return (
              <button
                key={item.id}
                type="button"
                className="golden-os-list-row"
                onClick={() => navigateRoute({ mode: item.id })}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div
                    className="golden-os-avatar"
                    style={{
                      background: item.bg,
                      color: item.color,
                      borderColor: item.border,
                    }}
                  >
                    <RowIcon size={18} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        color: '#25231f',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#6b5b3e',
                        fontWeight: 500,
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span className="golden-os-badge-muted">{item.badge}</span>
                  <ChevronRight size={16} color="#8c734b" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 2. DEDICATED WINDOW SHELL FOR ALL SUB-PAGES ──────────────────────────────
  const windowTitles = {
    schedule: 'Institutional Schedule',
    analytics: 'Attendance Protection Analytics',
    cancel: 'Cancel Class Session',
    substitute: 'Substitute Faculty Delegation',
    new: 'Schedule Campus Event',
    detail: resolvedDetailEvent?.title || 'Event Details',
  };

  return (
    <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {renderToastBanner()}

      <div className="golden-os-window">
        <div className="golden-os-titlebar">
          <div className="golden-os-titlebar-left">
            <div className="golden-os-traffic" aria-hidden="true">
              <span className="golden-os-dot golden-os-dot-close" />
              <span className="golden-os-dot golden-os-dot-min" />
              <span className="golden-os-dot golden-os-dot-zoom" />
            </div>
            <span className="golden-os-title-label">{windowTitles[activeRoute.mode] || 'Academic Calendar'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="golden-os-status-pill is-ready">
              {userRole === 'student' ? 'Student View' : isStaff ? 'Live Sync' : 'Synced'}
            </span>
          </div>
        </div>

        <div className="golden-os-body">
          {activeRoute.mode === 'schedule' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 220px' }}>
                  <Search
                    size={15}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c734b' }}
                  />
                  <input
                    type="search"
                    value={scheduleQuery}
                    onChange={(e) => setScheduleQuery(e.target.value)}
                    placeholder="Search events, subjects, departments..."
                    style={{ ...inputStyle, paddingLeft: '36px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button type="button" style={secondaryButtonStyle} onClick={handleRefreshAll} disabled={isRefreshing}>
                    <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
                    <span>Refresh</span>
                  </button>
                  {isStaff && (
                    <button type="button" style={primaryGoldButtonStyle} onClick={() => navigateRoute({ mode: 'new' })}>
                      <Plus size={14} />
                      <span>Add Event</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="golden-os-pill-row" style={{ flexWrap: 'wrap' }}>
                {SCHEDULE_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`golden-os-chip ${scheduleFilter === opt.id ? 'active' : ''}`}
                    onClick={() => setScheduleFilter(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {filteredScheduleEvents.length === 0 ? (
                <div
                  className="golden-os-inset-card"
                  style={{ padding: '32px 16px', textAlign: 'center', alignItems: 'center', gap: '8px' }}
                >
                  <Calendar size={28} color="#9c8b6e" />
                  <div style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>No matching calendar events</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b5b3e' }}>
                    {scheduleFilter !== 'ALL' || scheduleQuery
                      ? 'Clear your active filter or search text to view all events.'
                      : 'Scheduled holidays, exams, cancellations, and substitutions appear here.'}
                  </div>
                </div>
              ) : (
                <div className="golden-os-list-shell">
                  {filteredScheduleEvents.map((evt) => renderEventRow(evt, false))}
                </div>
              )}
            </>
          )}

          {activeRoute.mode === 'detail' && (
            <>
              {!resolvedDetailEvent ? (
                <div className="golden-os-inset-card" style={{ padding: '28px 16px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#2b2112' }}>Calendar event not found</div>
                  <div style={{ fontSize: '0.78rem', color: '#6b5b3e', marginTop: '4px' }}>
                    It may have been deleted from the schedule.
                  </div>
                </div>
              ) : (
                <>
                  <div className="golden-os-list-shell">
                    {[
                      { label: 'Category', value: getEventMeta(resolvedDetailEvent.event_type).label },
                      { label: 'Start Date', value: formatDisplayDate(resolvedDetailEvent.start_date) },
                      ...(resolvedDetailEvent.end_date
                        ? [{ label: 'End Date', value: formatDisplayDate(resolvedDetailEvent.end_date) }]
                        : []),
                      ...(resolvedDetailEvent.start_time
                        ? [
                            {
                              label: 'Session Window',
                              value: resolvedDetailEvent.end_time
                                ? `${resolvedDetailEvent.start_time} – ${resolvedDetailEvent.end_time}`
                                : resolvedDetailEvent.start_time,
                            },
                          ]
                        : []),
                      ...(resolvedDetailEvent.subject_name
                        ? [
                            {
                              label: 'Subject',
                              value: resolvedDetailEvent.subject_code
                                ? `${resolvedDetailEvent.subject_name} (${resolvedDetailEvent.subject_code})`
                                : resolvedDetailEvent.subject_name,
                            },
                          ]
                        : []),
                      ...(resolvedDetailEvent.department
                        ? [{ label: 'Department', value: resolvedDetailEvent.department }]
                        : []),
                      ...(resolvedDetailEvent.teacher_name
                        ? [{ label: 'Faculty', value: resolvedDetailEvent.teacher_name }]
                        : []),
                      ...(resolvedDetailEvent.substitute_teacher_name
                        ? [{ label: 'Substitute Teacher', value: resolvedDetailEvent.substitute_teacher_name }]
                        : []),
                      ...(resolvedDetailEvent.substitute_reason
                        ? [{ label: 'Delegation Reason', value: resolvedDetailEvent.substitute_reason }]
                        : []),
                      ...(resolvedDetailEvent.description
                        ? [{ label: 'Details', value: resolvedDetailEvent.description }]
                        : []),
                      { label: 'Created By', value: resolvedDetailEvent.created_by || 'Campus Administration' },
                    ].map((row) => (
                      <div key={row.label} className="golden-os-list-row" style={{ cursor: 'default' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b5b3e' }}>{row.label}</span>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#25231f', textAlign: 'right' }}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    {canDeleteEvent(resolvedDetailEvent) ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(resolvedDetailEvent, true)}
                        disabled={deletingId === resolvedDetailEvent.id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '9px 14px',
                          borderRadius: '11px',
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#b91c1c',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                        <span>{deletingId === resolvedDetailEvent.id ? 'Removing...' : 'Delete Event'}</span>
                      </button>
                    ) : (
                      <span />
                    )}
                    <button type="button" style={secondaryButtonStyle} onClick={handleBack}>
                      Done
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {activeRoute.mode === 'analytics' && (
            <>
              <div className="golden-os-form-section">
                <div className="golden-os-form-section-title">Scope Filters</div>
                <div className={isStaff ? 'golden-os-fields-2' : ''}>
                  <div>
                    <label style={labelStyle} htmlFor="cal-analytics-subject">Subject</label>
                    <select
                      id="cal-analytics-subject"
                      value={analyticsSubjectId}
                      onChange={(e) => handleMetricsFilterChange(e.target.value, analyticsStudentId)}
                      style={inputStyle}
                    >
                      <option value="">All Accessible Subjects</option>
                      {subjectsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  {isStaff && (
                    <div>
                      <label style={labelStyle} htmlFor="cal-analytics-student">Student Scope</label>
                      <select
                        id="cal-analytics-student"
                        value={analyticsStudentId}
                        onChange={(e) => handleMetricsFilterChange(analyticsSubjectId, e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">All Institutional Students</option>
                        {studentsList.map((st) => (
                          <option key={st.id} value={st.id}>
                            {st.name} (Roll {st.roll})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="golden-os-kpi-strip">
                <div className="golden-os-kpi-tile is-compact">
                  <div className="golden-os-kpi-value">{metrics?.scheduled_classes ?? 0}</div>
                  <div className="golden-os-kpi-label">Scheduled</div>
                </div>
                <div className="golden-os-kpi-tile is-compact">
                  <div className="golden-os-kpi-value" style={{ color: '#0369a1' }}>
                    {metrics?.cancelled_classes ?? 0}
                  </div>
                  <div className="golden-os-kpi-label">Cancelled</div>
                </div>
                <div className="golden-os-kpi-tile is-compact">
                  <div className="golden-os-kpi-value">{metrics?.conducted_classes ?? 0}</div>
                  <div className="golden-os-kpi-label">Conducted</div>
                </div>
                <div className="golden-os-kpi-tile is-compact">
                  <div className="golden-os-kpi-value" style={{ color: '#047857' }}>
                    {metrics?.attended_classes ?? 0}
                  </div>
                  <div className="golden-os-kpi-label">Attended</div>
                </div>
              </div>

              <div className="golden-os-form-section">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b5b3e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Protected Attendance Rate {metricsLoading ? '· Refreshing...' : ''}
                    </div>
                    <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#25231f', lineHeight: 1.1, marginTop: '4px' }}>
                      {metrics ? `${metrics.attendance_percentage}%` : '100%'}
                    </div>
                  </div>
                  <span
                    className={`golden-os-status-pill ${metrics?.is_at_risk ? 'is-pending' : 'is-ready'}`}
                    style={
                      metrics?.is_at_risk
                        ? { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }
                        : undefined
                    }
                  >
                    {metrics?.is_at_risk ? 'At Risk · Below 75%' : 'Safe Standing · >= 75%'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b5b3e', fontWeight: 500 }}>
                  Formula: Attended ({metrics?.attended_classes ?? 0}) / (Scheduled ({metrics?.scheduled_classes ?? 0}) − Cancelled ({metrics?.cancelled_classes ?? 0})). Cancelled lectures never reduce percentage.
                </div>
              </div>

              <div className="golden-os-form-section">
                <div className="golden-os-form-section-title">Protected Cancelled Sessions ({cancelledEvents.length})</div>
                {cancelledEvents.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: '#6b5b3e' }}>No cancelled class exemptions recorded yet.</div>
                ) : (
                  <div className="golden-os-list-shell">
                    {cancelledEvents.slice(0, 8).map((evt) => renderEventRow(evt, false))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeRoute.mode === 'cancel' && (
            <>
              <form onSubmit={handleCancelClassSubmit} className="golden-os-form-section">
                <div className="golden-os-form-section-title">Mark Lecture Cancelled & Safeguard Attendance</div>
                <div className="golden-os-fields-2">
                  <div>
                    <label style={labelStyle} htmlFor="cal-cancel-subject">Subject *</label>
                    <select
                      id="cal-cancel-subject"
                      required
                      value={cancelSubjectId}
                      onChange={(e) => setCancelSubjectId(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select Subject</option>
                      {subjectsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="cal-cancel-date">Class Date *</label>
                    <input
                      id="cal-cancel-date"
                      type="date"
                      required
                      value={cancelDate}
                      onChange={(e) => setCancelDate(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="cal-cancel-period">Period Slot</label>
                    <select
                      id="cal-cancel-period"
                      value={cancelSessionTime}
                      onChange={(e) => setCancelSessionTime(e.target.value)}
                      style={inputStyle}
                    >
                      {CALENDAR_PERIOD_SLOTS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="cal-cancel-reason">Cancellation Reason *</label>
                    <input
                      id="cal-cancel-reason"
                      type="text"
                      required
                      placeholder="e.g., Faculty seminar / Holiday workshop"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={isSubmitting} style={primaryGoldButtonStyle}>
                    <CalendarX size={15} />
                    <span>{isSubmitting ? 'Saving...' : 'Confirm Class Cancellation'}</span>
                  </button>
                </div>
              </form>

              <div className="golden-os-form-section">
                <div className="golden-os-form-section-title">Active Cancelled Classes ({cancelledEvents.length})</div>
                {cancelledEvents.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: '#6b5b3e' }}>No active class cancellations.</div>
                ) : (
                  <div className="golden-os-list-shell">
                    {cancelledEvents.map((evt) => renderEventRow(evt, true))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeRoute.mode === 'substitute' && (
            <>
              <form onSubmit={handleSubstituteSubmit} className="golden-os-form-section">
                <div className="golden-os-form-section-title">Assign Substitute Teacher</div>
                <div className="golden-os-fields-2">
                  <div>
                    <label style={labelStyle} htmlFor="cal-sub-subject">Subject *</label>
                    <select
                      id="cal-sub-subject"
                      required
                      value={subSubjectId}
                      onChange={(e) => setSubSubjectId(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select Subject</option>
                      {subjectsList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="cal-sub-teacher">Substitute Teacher *</label>
                    <select
                      id="cal-sub-teacher"
                      required
                      value={subTeacherId}
                      onChange={(e) => setSubTeacherId(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="">Select Faculty Member</option>
                      {activeTeachersForDelegate.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="cal-sub-date">Lecture Date *</label>
                    <input
                      id="cal-sub-date"
                      type="date"
                      required
                      value={subDate}
                      onChange={(e) => setSubDate(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle} htmlFor="cal-sub-reason">Delegation Reason *</label>
                    <input
                      id="cal-sub-reason"
                      type="text"
                      required
                      placeholder="e.g., Attending academic board meeting"
                      value={subReason}
                      onChange={(e) => setSubReason(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={isSubmitting} style={primaryGoldButtonStyle}>
                    <UserCheck size={15} />
                    <span>{isSubmitting ? 'Delegating...' : 'Delegate Substitute Faculty'}</span>
                  </button>
                </div>
              </form>

              <div className="golden-os-form-section">
                <div className="golden-os-form-section-title">Active Substitutions ({substituteEvents.length})</div>
                {substituteEvents.length === 0 ? (
                  <div style={{ fontSize: '0.82rem', color: '#6b5b3e' }}>No substitute delegations assigned yet.</div>
                ) : (
                  <div className="golden-os-list-shell">
                    {substituteEvents.map((evt) => renderEventRow(evt, true))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeRoute.mode === 'new' && (
            <form onSubmit={handleCreateEventSubmit} className="golden-os-form-section">
              <div className="golden-os-form-section-title">New Institutional Calendar Entry</div>
              <div className="golden-os-fields-2">
                <div>
                  <label style={labelStyle} htmlFor="cal-new-title">Event Title *</label>
                  <input
                    id="cal-new-title"
                    type="text"
                    required
                    placeholder="e.g., Mid-Semester Examinations"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="cal-new-type">Category *</label>
                  <select
                    id="cal-new-type"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    style={inputStyle}
                  >
                    {CREATE_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="cal-new-start">Start Date *</label>
                  <input
                    id="cal-new-start"
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="cal-new-end">End Date (Optional)</label>
                  <input
                    id="cal-new-end"
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="cal-new-subject">Subject Scope (Optional)</label>
                  <select
                    id="cal-new-subject"
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Campus-Wide (All Subjects)</option>
                    {subjectsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle} htmlFor="cal-new-dept">Department Scope (Optional)</label>
                  <input
                    id="cal-new-dept"
                    type="text"
                    placeholder="e.g., CSE(IOT) or leave blank for all"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="cal-new-stime">Start Time (Optional)</label>
                  <input
                    id="cal-new-stime"
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="cal-new-etime">End Time (Optional)</label>
                  <input
                    id="cal-new-etime"
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle} htmlFor="cal-new-desc">Description / Instructions</label>
                <textarea
                  id="cal-new-desc"
                  rows={3}
                  placeholder="Schedule instructions, venue, or notice summary..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" style={secondaryButtonStyle} onClick={handleBack}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} style={primaryGoldButtonStyle}>
                  <Sparkles size={15} />
                  <span>{isSubmitting ? 'Publishing...' : 'Publish Calendar Event'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
