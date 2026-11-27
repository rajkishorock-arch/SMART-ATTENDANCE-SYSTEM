import { useMemo, useEffect, useState } from 'react';
import {
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Sparkles,
} from 'lucide-react';
import { calendarApi } from '../../api/calendarApi';
import { getActiveTenantSlug } from '../../utils/tenantConfig';
import { getInitials } from '../../utils/attendanceDateUtils';

const readCalEventsCache = (token) => {
  try {
    if (!token || typeof localStorage === 'undefined') return [];
    const slug = getActiveTenantSlug() || 'default';
    const raw = localStorage.getItem(`sg_st_cal_events_v1_${slug}_${String(token).slice(-16)}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCalEventsCache = (token, list) => {
  try {
    if (!token || typeof localStorage === 'undefined' || !Array.isArray(list)) return;
    const slug = getActiveTenantSlug() || 'default';
    localStorage.setItem(`sg_st_cal_events_v1_${slug}_${String(token).slice(-16)}`, JSON.stringify(list));
  } catch {
    // ignore quota errors
  }
};

const normalizeDateCandidates = (rawDate) => {
  if (!rawDate) return [];
  const s = String(rawDate).trim().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return [s, `${d}/${m}/${y}`, `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`];
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    const pd = d.padStart(2, '0');
    const pm = m.padStart(2, '0');
    return [`${y}-${pm}-${pd}`, `${pd}/${pm}/${y}`, `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`];
  }
  return [s];
};

const formatReadableDate = (isoDate) => {
  if (!isoDate) return 'Selected Date';
  const [y, m, d] = String(isoDate).split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

export default function StudentBlueprintHub({
  token,
  currentUser,
  subjects = [],
  studentLogs = [],
  blueprintData = [],
  blueprintLoading = false,
  fetchBlueprint = () => {},
  selectedBlueprintSubject = null,
  setSelectedBlueprintSubject = () => {},
  blueprintCalendarDate = null,
  setBlueprintCalendarDate = () => {},
  routeView = null,
  onNavigateRoute = null,
  onOpenDispute = () => {},
  onOpenLeave = () => {},
  playCyberSound = () => {},
}) {
  const [calendarEvents, setCalendarEvents] = useState(() => readCalEventsCache(token));

  useEffect(() => {
    let ignore = false;
    if (!token) return undefined;
    calendarApi.fetchEvents(token)
      .then(list => {
        if (!ignore && Array.isArray(list)) {
          setCalendarEvents(list);
          writeCalEventsCache(token, list);
        }
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, [token]);

  const safeSubjects = useMemo(() => (Array.isArray(subjects) ? subjects : []), [subjects]);
  const allowedSubjectIds = useMemo(
    () => new Set(safeSubjects.map(s => String(s.id))),
    [safeSubjects]
  );
  const allowedSubjectCodes = useMemo(
    () => new Set(safeSubjects.map(s => String(s.code || '').trim().toUpperCase()).filter(Boolean)),
    [safeSubjects]
  );

  // Scoped logs belonging only to student's enrolled branch subjects
  const scopedLogs = useMemo(() => {
    const raw = Array.isArray(studentLogs) ? studentLogs : [];
    if (safeSubjects.length === 0) return raw;
    return raw.filter(log => {
      if (!log) return false;
      const sid = log.subject_id != null ? String(log.subject_id) : '';
      const scode = String(log.subject_code || '').trim().toUpperCase();
      return (sid && allowedSubjectIds.has(sid)) || (scode && allowedSubjectCodes.has(scode));
    });
  }, [studentLogs, safeSubjects, allowedSubjectIds, allowedSubjectCodes]);

  // Scoped calendar events (institution-wide OR matching student's branch/subjects)
  const scopedEvents = useMemo(() => {
    const raw = Array.isArray(calendarEvents) ? calendarEvents : [];
    const userDept = String(currentUser?.details?.dep || currentUser?.dep || currentUser?.department || '').trim().toUpperCase();
    return raw.filter(evt => {
      if (!evt) return false;
      if (evt.subject_id != null && safeSubjects.length > 0 && !allowedSubjectIds.has(String(evt.subject_id))) {
        return false;
      }
      const evtDept = String(evt.department || '').trim().toUpperCase();
      if (evtDept && userDept && evtDept !== userDept && evtDept !== 'ALL') {
        return false;
      }
      return true;
    });
  }, [calendarEvents, currentUser, safeSubjects, allowedSubjectIds]);

  // Strictly build effective blueprint subjects scoped ONLY to student's branch
  const effectiveBlueprintData = useMemo(() => {
    const rawBlueprint = Array.isArray(blueprintData) ? blueprintData : [];
    const filteredBlueprint = safeSubjects.length > 0
      ? rawBlueprint.filter(b => {
          const sid = b?.subject_id != null ? String(b.subject_id) : '';
          const scode = String(b?.subject_code || '').trim().toUpperCase();
          return (sid && allowedSubjectIds.has(sid)) || (scode && allowedSubjectCodes.has(scode));
        })
      : rawBlueprint;

    const map = new Map();
    safeSubjects.forEach(s => {
      map.set(String(s.id), {
        subject_id: s.id,
        subject_name: s.name || `Subject #${s.id}`,
        subject_code: s.code || `SUB-${s.id}`,
        department: s.department || '',
        calendar: {},
      });
    });

    filteredBlueprint.forEach(entry => {
      const sid = String(entry.subject_id);
      const existing = map.get(sid);
      map.set(sid, {
        subject_id: entry.subject_id,
        subject_name: entry.subject_name || existing?.subject_name || 'Subject',
        subject_code: entry.subject_code || existing?.subject_code || 'SUB',
        department: entry.department || existing?.department || '',
        calendar: { ...(existing?.calendar || {}), ...(entry.calendar || {}) },
      });
    });

    // Overlay scoped logs into their subject calendars so logs always show immediately
    scopedLogs.forEach(log => {
      const sid = log.subject_id != null ? String(log.subject_id) : '0';
      if (!map.has(sid) && safeSubjects.length === 0) {
        map.set(sid, {
          subject_id: log.subject_id ?? 0,
          subject_name: log.subject_name || 'General Attendance',
          subject_code: log.subject_code || 'GEN',
          department: log.department || '',
          calendar: {},
        });
      }
      const target = map.get(sid);
      if (target && log.date) {
        const st = log.attendance || 'Present';
        normalizeDateCandidates(log.date).forEach(k => {
          target.calendar[k] = st;
        });
      }
    });

    return Array.from(map.values());
  }, [blueprintData, safeSubjects, allowedSubjectIds, allowedSubjectCodes, scopedLogs]);

  const activeSubject = useMemo(() => {
    return (
      effectiveBlueprintData.find(s => String(s.subject_id) === String(selectedBlueprintSubject)) ||
      effectiveBlueprintData[0] ||
      null
    );
  }, [effectiveBlueprintData, selectedBlueprintSubject]);

  // Deduplicate by ISO day inside activeSubject calendar (must run before early returns)
  const dayStatusMap = useMemo(() => {
    const out = new Map();
    if (!activeSubject) return out;
    Object.entries(activeSubject.calendar || {}).forEach(([k, val]) => {
      const iso = normalizeDateCandidates(k)[0];
      if (iso) out.set(iso, val);
    });
    return out;
  }, [activeSubject]);

  const stats = useMemo(() => {
    const vals = Array.from(dayStatusMap.values());
    const present = vals.filter(v => v === 'Present').length;
    const late = vals.filter(v => v === 'Late').length;
    const absent = vals.filter(v => v === 'Absent').length;
    const conducted = present + late + absent;
    const pct = conducted > 0 ? Math.round(((present + late) / conducted) * 100) : 0;
    return { present, late, absent, total: conducted, pct };
  }, [dayStatusMap]);

  const navigateTo = (next) => {
    if (playCyberSound) playCyberSound('click');
    if (onNavigateRoute) onNavigateRoute(next);
  };

  /* ===== DEDICATED DATE DETAIL PAGE (ZERO POPUP MODAL) ===== */
  if (routeView?.mode === 'date' && routeView?.date) {
    const isoDate = routeView.date;
    const candidates = normalizeDateCandidates(isoDate);

    const matchingLogs = scopedLogs.filter(log => {
      if (!log?.date) return false;
      const logCands = normalizeDateCandidates(log.date);
      const dateMatch = logCands.some(c => candidates.includes(c));
      if (!dateMatch) return false;
      if (activeSubject && activeSubject.subject_id !== 0 && log.subject_id != null) {
        return String(log.subject_id) === String(activeSubject.subject_id);
      }
      return true;
    });

    const calendarStatus = candidates.reduce((found, k) => found || activeSubject?.calendar?.[k] || null, null);

    const matchingEvents = scopedEvents.filter(evt => {
      const startCands = normalizeDateCandidates(evt.start_date || evt.event_date || evt.date);
      const startStr = String(evt.start_date || evt.event_date || evt.date || '').split('T')[0];
      const endStr = String(evt.end_date || startStr).split('T')[0];
      if (startStr && endStr && isoDate >= startStr && isoDate <= endStr) return true;
      return startCands.some(c => candidates.includes(c));
    });

    const displayRecords = matchingLogs.length > 0
      ? matchingLogs
      : calendarStatus
        ? [{
            id: `bp-${isoDate}`,
            date: isoDate,
            subject_id: activeSubject?.subject_id,
            subject_name: activeSubject?.subject_name,
            subject_code: activeSubject?.subject_code,
            attendance: calendarStatus,
            time: 'Scheduled Lecture',
          }]
        : [];

    const primaryStatus = displayRecords[0]?.attendance || (matchingEvents[0]?.event_type ? matchingEvents[0].event_type.replace(/_/g, ' ') : 'No Lecture Recorded');
    const isPresentDay = ['Present', 'Late', 'Excused'].includes(primaryStatus);

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Date Summary Block */}
            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                <div
                  className="golden-os-avatar"
                  style={{
                    width: '44px',
                    height: '44px',
                    ...(isPresentDay
                      ? { background: '#ecfdf5', borderColor: '#a7f3d0', color: '#047857' }
                      : primaryStatus === 'Absent'
                        ? { background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }
                        : undefined),
                  }}
                >
                  {isPresentDay ? <CheckCircle2 size={18} /> : primaryStatus === 'Absent' ? <AlertTriangle size={18} /> : <Clock size={18} />}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#25231f' }}>
                    {formatReadableDate(isoDate)}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6b5b3e', fontWeight: 600 }}>
                    {activeSubject ? `${activeSubject.subject_name} (${activeSubject.subject_code})` : 'Branch Attendance Record'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Date Status</span>
                <span style={{ color: isPresentDay ? '#047857' : primaryStatus === 'Absent' ? '#b91c1c' : '#25231f', fontWeight: 800 }}>
                  {primaryStatus}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Calendar ISO Date</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>{isoDate}</span>
              </div>
            </div>

            {/* Control System Actions for Selected Date */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  onOpenLeave({
                    fromDate: isoDate,
                    toDate: isoDate,
                    subjectId: activeSubject?.subject_id ? String(activeSubject.subject_id) : '',
                  });
                }}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '10px 14px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
              >
                <Calendar size={14} />
                <span>Apply Leave</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  onOpenDispute({
                    date: isoDate,
                    subject_id: activeSubject?.subject_id,
                    subject_name: activeSubject?.subject_name,
                    subject_code: activeSubject?.subject_code,
                  });
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '11px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #785927, #684c20)',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                }}
              >
                <FileText size={14} />
                <span>Request Correction</span>
              </button>
            </div>

            {/* Session Logs for Selected Date */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 8px' }}>
                <span className="golden-os-field-label" style={{ marginBottom: 0 }}>Session Logs</span>
                <span style={{ fontSize: '0.73rem', color: '#6b5b3e', fontWeight: 700 }}>{displayRecords.length} entry</span>
              </div>

              {displayRecords.length === 0 ? (
                <div className="golden-os-inset-card" style={{ textAlign: 'center', padding: '18px 14px', fontSize: '0.82rem', color: '#6b5b3e' }}>
                  No biometric check-in or lecture session was recorded on {isoDate}.
                </div>
              ) : (
                <div className="golden-os-list-shell">
                  {displayRecords.map((rec, idx) => (
                    <div key={rec.record_id || rec.id || idx} className="golden-os-list-row" style={{ cursor: 'default' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <div className="golden-os-avatar">
                          {getInitials(rec.subject_code || activeSubject?.subject_code || 'AT', 'AT')}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#25231f' }}>
                            {rec.subject_name || activeSubject?.subject_name || 'Class Session'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b5b3e', marginTop: '2px' }}>
                            {rec.attendance || 'Present'} · {rec.period_label ? String(rec.period_label).replace(/\s*\([^)]*\)/, '').trim() : rec.time || 'Standard Slot'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Campus Calendar Events on Selected Date */}
            {matchingEvents.length > 0 && (
              <div>
                <span className="golden-os-field-label" style={{ paddingLeft: '4px' }}>Campus Schedule & Notices</span>
                <div className="golden-os-list-shell">
                  {matchingEvents.map((evt, idx) => (
                    <div key={evt.id || idx} className="golden-os-list-row" style={{ cursor: 'default' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <div className="golden-os-avatar">
                          <Sparkles size={15} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#25231f' }}>
                            {evt.title || evt.name || 'Campus Event'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b5b3e', marginTop: '2px' }}>
                            {String(evt.event_type || 'EVENT').replace(/_/g, ' ')}{evt.description ? ` · ${evt.description}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ===== MAIN CALENDAR VIEW ===== */
  const calDate = blueprintCalendarDate || new Date();
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const startDay = new Date(calYear, calMonth, 1).getDay();
  const numDays = new Date(calYear, calMonth + 1, 0).getDate();
  const monthName = calDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Subject Selector (compact) + Refresh */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              {effectiveBlueprintData.length > 1 ? (
                <select
                  aria-label="Select branch subject"
                  className="golden-os-input"
                  value={activeSubject?.subject_id || ''}
                  onChange={e => {
                    if (playCyberSound) playCyberSound('click');
                    const matched = effectiveBlueprintData.find(s => String(s.subject_id) === e.target.value);
                    setSelectedBlueprintSubject(matched ? matched.subject_id : e.target.value);
                  }}
                >
                  {effectiveBlueprintData.map(sub => (
                    <option key={sub.subject_id} value={sub.subject_id}>
                      {sub.subject_code} — {sub.subject_name}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeSubject ? `${activeSubject.subject_code} — ${activeSubject.subject_name}` : 'Branch Attendance Calendar'}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                fetchBlueprint(token);
              }}
              disabled={blueprintLoading}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '9px 12px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              <RefreshCw size={14} className={blueprintLoading ? 'spin-icon' : ''} />
              <span>{blueprintLoading ? 'Syncing' : 'Refresh'}</span>
            </button>
          </div>

          {effectiveBlueprintData.length === 0 ? (
            <div className="golden-os-inset-card" style={{ textAlign: 'center', padding: '26px 14px', fontSize: '0.84rem', color: '#6b5b3e' }}>
              No branch subject records found yet. Attendance dates will populate automatically once recorded.
            </div>
          ) : (
            <>
              {/* Clean Single Unified Standing Bar */}
              <div
                className="golden-os-inset-card"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '6px',
                  textAlign: 'center',
                  padding: '10px 6px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: stats.pct >= 75 || stats.total === 0 ? '#047857' : '#b91c1c' }}>{stats.pct}%</div>
                  <div style={{ fontSize: '0.64rem', color: '#6b5b3e', fontWeight: 600 }}>Rate</div>
                </div>
                <div style={{ minWidth: 0, borderLeft: '1px solid #eadfcb' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>{stats.present}</div>
                  <div style={{ fontSize: '0.64rem', color: '#6b5b3e', fontWeight: 600 }}>Present</div>
                </div>
                <div style={{ minWidth: 0, borderLeft: '1px solid #eadfcb' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#b45309' }}>{stats.late}</div>
                  <div style={{ fontSize: '0.64rem', color: '#6b5b3e', fontWeight: 600 }}>Late</div>
                </div>
                <div style={{ minWidth: 0, borderLeft: '1px solid #eadfcb' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#b91c1c' }}>{stats.absent}</div>
                  <div style={{ fontSize: '0.64rem', color: '#6b5b3e', fontWeight: 600 }}>Absent</div>
                </div>
                <div style={{ minWidth: 0, borderLeft: '1px solid #eadfcb' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#25231f' }}>{stats.total}</div>
                  <div style={{ fontSize: '0.64rem', color: '#6b5b3e', fontWeight: 600 }}>Days</div>
                </div>
              </div>

              {/* Month Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    setBlueprintCalendarDate(prev => {
                      const d = new Date(prev || new Date());
                      d.setMonth(d.getMonth() - 1);
                      return d;
                    });
                  }}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '6px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#25231f' }}>{monthName}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    setBlueprintCalendarDate(prev => {
                      const d = new Date(prev || new Date());
                      d.setMonth(d.getMonth() + 1);
                      return d;
                    });
                  }}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '6px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Calendar Grid */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '6px' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6b5b3e', padding: '3px 0' }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                  {Array.from({ length: startDay }, (_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: numDays }, (_, i) => {
                    const day = i + 1;
                    const padDay = String(day).padStart(2, '0');
                    const padMonth = String(calMonth + 1).padStart(2, '0');
                    const isoDate = `${calYear}-${padMonth}-${padDay}`;
                    const status = dayStatusMap.get(isoDate) || null;

                    const now = new Date();
                    const isToday = now.getDate() === day && now.getMonth() === calMonth && now.getFullYear() === calYear;

                    let bg = '#ffffff';
                    let border = '1px solid #e4d8bd';
                    let color = '#5c4b30';
                    let mark = null;

                    if (status === 'Present') {
                      bg = '#ecfdf5';
                      border = '1px solid #a7f3d0';
                      color = '#047857';
                      mark = 'P';
                    } else if (status === 'Late') {
                      bg = '#fffbeb';
                      border = '1px solid #fde68a';
                      color = '#b45309';
                      mark = 'L';
                    } else if (status === 'Absent') {
                      bg = '#fef2f2';
                      border = '1px solid #fecaca';
                      color = '#b91c1c';
                      mark = 'A';
                    }

                    if (isToday) {
                      border = '2px solid #785927';
                    }

                    return (
                      <button
                        key={isoDate}
                        type="button"
                        data-cal-date={isoDate}
                        title={`Inspect ${isoDate}`}
                        onClick={() => navigateTo({ section: 'blueprint', mode: 'date', date: isoDate })}
                        style={{
                          background: bg,
                          border,
                          borderRadius: '10px',
                          padding: '6px 2px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: '46px',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '0.8rem', fontWeight: isToday ? 800 : 600, color: isToday ? '#785927' : color }}>
                          {day}
                        </span>
                        {mark && (
                          <span style={{ fontSize: '0.62rem', fontWeight: 800, color, marginTop: '1px' }}>{mark}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clean Minimal Legend */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '0.72rem', color: '#6b5b3e', borderTop: '1px solid #eadfcb', paddingTop: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>P Present</span>
                  <span>A Absent</span>
                  <span>L Late</span>
                </div>
                <span style={{ color: '#785927', fontWeight: 700 }}>Tap any date for details</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
