import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Target,
  Sliders,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Clock,
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';
import { getActiveTenantSlug } from '../utils/tenantConfig';

const getPlannerCacheKey = (token, targetPct) => {
  if (!token) return null;
  const slug = getActiveTenantSlug() || 'default';
  return `sg_planner_v1_${slug}_${String(token).slice(-16)}_${targetPct}`;
};

const readPlannerCache = (token, targetPct) => {
  try {
    const key = getPlannerCacheKey(token, targetPct);
    if (!key) return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writePlannerCache = (token, targetPct, data) => {
  try {
    const key = getPlannerCacheKey(token, targetPct);
    if (!key || !data) return;
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
};

const computeLocalPlanMetric = (attended, conducted, targetPct) => {
  if (conducted <= 0) {
    return {
      percentage: 100.0,
      status: 'SAFE',
      classes_needed: 0,
      bunk_allowance: 0,
      projection_attend_next_3: 100.0,
      projection_miss_next_3: 100.0,
    };
  }
  const pct = Math.round((attended / conducted) * 10000) / 100;
  const t = targetPct / 100;
  const status = pct >= targetPct ? 'SAFE' : pct >= 70 ? 'WARNING' : 'CRITICAL';
  let classesNeeded = 0;
  let bunkAllowance = 0;
  if (pct < targetPct && 1 - t > 0) {
    classesNeeded = Math.ceil(Math.max(0, (t * conducted - attended) / (1 - t)));
  } else if (t > 0) {
    bunkAllowance = Math.floor(Math.max(0, (attended - t * conducted) / t));
  }
  return {
    percentage: pct,
    status,
    classes_needed: classesNeeded,
    bunk_allowance: bunkAllowance,
    projection_attend_next_3: Math.round(((attended + 3) / (conducted + 3)) * 10000) / 100,
    projection_miss_next_3: Math.round((attended / (conducted + 3)) * 10000) / 100,
  };
};

/**
 * Golden Gate Master-Detail Smart 75% Attendance Planner & Simulator.
 * Instant 0ms cached load, strictly branch-scoped, clean single-line list rows,
 * dedicated sub-pages for Overall Standing, What-If Simulator, and Subject Controls.
 */
export default function AttendancePlannerWidget({
  token,
  subjects = [],
  studentLogs = [],
  routeView = null,
  onNavigateRoute = null,
  onNavigateBack = null,
  playCyberSound = () => {},
}) {
  const activeApiUrl = useMemo(() => {
    let url = getApiBaseUrl();
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:')) {
      url = url.replace('http:', 'https:');
    }
    return url.replace(/\/+$/, '');
  }, []);

  const [targetPct, setTargetPct] = useState(75);
  const [plannerData, setPlannerData] = useState(() => readPlannerCache(token, 75));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [localRoute, setLocalRoute] = useState(null);
  const activeRoute = routeView !== undefined && onNavigateRoute ? routeView : localRoute;
  const mode = activeRoute?.mode || 'list';

  // Interactive Simulator Controls
  const [simSubjectId, setSimSubjectId] = useState('');
  const [simUpcoming, setSimUpcoming] = useState(10);
  const [simPlanned, setSimPlanned] = useState(8);
  const [simServerResult, setSimServerResult] = useState(null);

  const navigateTo = (next) => {
    if (playCyberSound) playCyberSound('click');
    if (onNavigateRoute) {
      onNavigateRoute(next);
    } else {
      setLocalRoute(next);
    }
  };

  const goBack = () => {
    if (playCyberSound) playCyberSound('click');
    if (onNavigateBack) {
      onNavigateBack();
    } else if (activeRoute?.mode) {
      setLocalRoute({ section: 'planner' });
    }
  };

  // Instant 0ms fallback model derived from branch-scoped subjects & logs if server hasn't responded yet
  const safeSubjects = useMemo(() => (Array.isArray(subjects) ? subjects : []), [subjects]);
  const fallbackPlannerData = useMemo(() => {
    const safeLogs = (Array.isArray(studentLogs) ? studentLogs : [])
      .filter(l => String(l?.attendance || '').toUpperCase() !== 'CLASS_CANCELLED');

    const branchMap = {};
    if (safeSubjects.length > 0) {
      safeSubjects.forEach(s => {
        branchMap[s.id] = {
          subject_id: s.id,
          subject_name: s.name || 'Subject',
          subject_code: s.code || `SUB-${s.id}`,
          attended: 0,
          conducted: 0,
        };
      });
    }

    let overallAtt = 0;
    let overallCond = 0;
    safeLogs.forEach(log => {
      const subId = log.subject_id;
      if (safeSubjects.length > 0 && (subId == null || !branchMap[subId])) return;
      const key = subId || 0;
      if (!branchMap[key]) {
        branchMap[key] = {
          subject_id: key,
          subject_name: log.subject_name || 'General Sessions',
          subject_code: log.subject_code || 'GEN',
          attended: 0,
          conducted: 0,
        };
      }
      branchMap[key].conducted += 1;
      overallCond += 1;
      if (['present', 'late', 'excused'].includes(String(log.attendance || '').toLowerCase())) {
        branchMap[key].attended += 1;
        overallAtt += 1;
      }
    });

    const overallMetric = computeLocalPlanMetric(overallAtt, overallCond, targetPct);
    const subjectPlans = Object.values(branchMap).map(item => {
      const m = computeLocalPlanMetric(item.attended, item.conducted, targetPct);
      return {
        subject_id: item.subject_id,
        subject_name: item.subject_name,
        subject_code: item.subject_code,
        total_conducted: item.conducted,
        total_attended: item.attended,
        current_percentage: m.percentage,
        status: m.status,
        target_percentage: targetPct,
        classes_needed: m.classes_needed,
        bunk_allowance: m.bunk_allowance,
        projection_attend_next_3: m.projection_attend_next_3,
        projection_miss_next_3: m.projection_miss_next_3,
      };
    });

    return {
      overall_conducted: overallCond,
      overall_attended: overallAtt,
      overall_percentage: overallMetric.percentage,
      overall_status: overallMetric.status,
      target_percentage: targetPct,
      overall_classes_needed: overallMetric.classes_needed,
      overall_bunk_allowance: overallMetric.bunk_allowance,
      subjects: subjectPlans,
      advice_message:
        overallMetric.status === 'SAFE'
          ? `Attendance is ${overallMetric.percentage}%. You can miss up to ${overallMetric.bunk_allowance} class(es) while staying >= ${targetPct}%.`
          : `Attend the next ${overallMetric.classes_needed} consecutive class(es) to reach ${targetPct}%.`,
    };
  }, [safeSubjects, studentLogs, targetPct]);

  const fetchPlanner = useCallback(async (target = targetPct, isCancelled = () => false) => {
    if (!token) return;
    const cached = readPlannerCache(token, target);
    if (cached && !isCancelled()) {
      setPlannerData(cached);
    } else {
      setIsLoading(true);
    }
    setErrorMsg('');
    try {
      const res = await fetch(`${activeApiUrl}/planner/summary?target_percentage=${target}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Planner unavailable (${res.status})`);
      const data = await res.json();
      if (!isCancelled() && data) {
        setPlannerData(data);
        writePlannerCache(token, target, data);
      }
    } catch (err) {
      if (!isCancelled() && !cached) {
        setErrorMsg(err.message || 'Could not sync attendance planner.');
      }
    } finally {
      if (!isCancelled()) setIsLoading(false);
    }
  }, [activeApiUrl, token, targetPct]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) fetchPlanner(targetPct, () => ignore);
    });
    return () => {
      ignore = true;
    };
  }, [fetchPlanner, targetPct]);

  // Effective branch-scoped planner model
  const effectivePlanner = useMemo(() => {
    const raw = plannerData || fallbackPlannerData;
    if (!raw) return fallbackPlannerData;
    if (safeSubjects.length === 0) return raw;
    const allowedIds = new Set(safeSubjects.map(s => String(s.id)));
    const filteredSubjects = (Array.isArray(raw.subjects) ? raw.subjects : []).filter(
      s => allowedIds.has(String(s.subject_id))
    );
    return {
      ...raw,
      subjects: filteredSubjects.length > 0 ? filteredSubjects : fallbackPlannerData.subjects,
    };
  }, [plannerData, fallbackPlannerData, safeSubjects]);

  // Preselect subject when opening simulator with a specific subject route
  const simDefaultSubId = activeRoute?.mode === 'simulator' && activeRoute?.subjectId
    ? String(activeRoute.subjectId)
    : simSubjectId;

  // Instant 0ms local What-If calculation + background server confirmation
  const localSimResult = useMemo(() => {
    const targetSub = simDefaultSubId
      ? effectivePlanner.subjects.find(s => String(s.subject_id) === String(simDefaultSubId))
      : null;
    const attBefore = targetSub ? targetSub.total_attended : effectivePlanner.overall_attended;
    const condBefore = targetSub ? targetSub.total_conducted : effectivePlanner.overall_conducted;
    const currPct = condBefore > 0 ? Math.round((attBefore / condBefore) * 10000) / 100 : 100;
    const up = Math.max(0, Number(simUpcoming) || 0);
    const pl = Math.min(up, Math.max(0, Number(simPlanned) || 0));
    const condAfter = condBefore + up;
    const attAfter = attBefore + pl;
    const simPct = condAfter > 0 ? Math.round((attAfter / condAfter) * 10000) / 100 : 100;
    return {
      current_percentage: currPct,
      simulated_percentage: simPct,
      target_achieved: simPct >= targetPct,
      conducted_before: condBefore,
      conducted_after: condAfter,
      attended_before: attBefore,
      attended_after: attAfter,
      difference_percentage: Math.round((simPct - currPct) * 100) / 100,
    };
  }, [simDefaultSubId, effectivePlanner, simUpcoming, simPlanned, targetPct]);

  useEffect(() => {
    if (mode !== 'simulator' || !token) return undefined;
    let ignore = false;
    fetch(`${activeApiUrl}/planner/what-if`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject_id: simDefaultSubId ? parseInt(simDefaultSubId, 10) : null,
        target_percentage: targetPct,
        upcoming_classes: parseInt(simUpcoming, 10) || 0,
        planned_attend: parseInt(simPlanned, 10) || 0,
      }),
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!ignore && data) setSimServerResult(data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [mode, token, activeApiUrl, simDefaultSubId, targetPct, simUpcoming, simPlanned]);

  const activeSim = simServerResult &&
    Number(simServerResult.upcoming_classes ?? simUpcoming) === Number(simUpcoming) &&
    Number(simServerResult.attended_after) === localSimResult.attended_after &&
    Number(simServerResult.conducted_after) === localSimResult.conducted_after
    ? simServerResult
    : localSimResult;

  /* ===== DEDICATED PAGE 1: OVERALL TARGET PLAN DETAIL ===== */
  if (mode === 'overall') {
    const isSafe = effectivePlanner.overall_percentage >= targetPct;
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Target size={13} />
                <span>Overall Attendance Target ({targetPct}%)</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Current Standing</span>
                <span style={{ color: isSafe ? '#047857' : '#dc2626', fontWeight: 800 }}>
                  {effectivePlanner.overall_percentage}% ({effectivePlanner.overall_attended}/{effectivePlanner.overall_conducted})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Status</span>
                <span style={{ color: isSafe ? '#047857' : '#dc2626', fontWeight: 700 }}>
                  {isSafe ? `On Track (>= ${targetPct}%)` : `Action Needed (< ${targetPct}%)`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>
                  {isSafe ? 'Safe Bunk Allowance' : 'Consecutive Classes Needed'}
                </span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>
                  {isSafe
                    ? `${effectivePlanner.overall_bunk_allowance} session(s)`
                    : `${effectivePlanner.overall_classes_needed} session(s)`}
                </span>
              </div>

              {effectivePlanner.advice_message && (
                <div style={{ marginTop: '4px', fontSize: '0.84rem', color: '#3b3324', background: '#faf8f2', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ede4d2', lineHeight: 1.5 }}>
                  {effectivePlanner.advice_message}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigateTo({ section: 'planner', mode: 'simulator' })}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '10px 16px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Sliders size={14} />
                <span>Open What-If Simulator</span>
              </button>
              <button
                type="button"
                onClick={goBack}
                style={{
                  padding: '10px 20px',
                  borderRadius: '11px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #785927, #684c20)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED PAGE 2: INTERACTIVE WHAT-IF SIMULATOR ===== */
  if (mode === 'simulator') {
    const achieved = activeSim.target_achieved;
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={13} />
                <span>Interactive What-If Simulator</span>
              </div>

              <div className="golden-os-fields-2">
                <div>
                  <label className="golden-os-field-label">Simulation Scope</label>
                  <select
                    className="golden-os-input"
                    value={simDefaultSubId}
                    onChange={e => {
                      setSimSubjectId(e.target.value);
                      if (activeRoute?.subjectId) {
                        navigateTo({ section: 'planner', mode: 'simulator', subjectId: e.target.value || null });
                      }
                    }}
                  >
                    <option value="">All Branch Subjects Combined</option>
                    {effectivePlanner.subjects.map(s => (
                      <option key={s.subject_id} value={s.subject_id}>
                        {s.subject_name} ({s.current_percentage}%)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="golden-os-field-label">Target Threshold</label>
                  <div className="golden-os-segmented">
                    {[75, 80, 85].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          if (playCyberSound) playCyberSound('click');
                          setTargetPct(t);
                        }}
                        className={`golden-os-segmented-btn ${targetPct === t ? 'active' : ''}`}
                      >
                        {t}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="golden-os-fields-2">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="golden-os-field-label" style={{ marginBottom: 0 }}>Upcoming Classes</label>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#6e4e1c' }}>{simUpcoming}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={simUpcoming}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setSimUpcoming(val);
                      if (simPlanned > val) setSimPlanned(val);
                    }}
                    style={{ width: '100%', accentColor: '#785927', cursor: 'pointer' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="golden-os-field-label" style={{ marginBottom: 0 }}>Planned to Attend</label>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#047857' }}>{simPlanned} / {simUpcoming}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={simUpcoming}
                    value={simPlanned}
                    onChange={e => setSimPlanned(parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: '#059669', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>

            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title">Projection Result</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Current Standing</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>
                  {activeSim.current_percentage}% ({activeSim.attended_before}/{activeSim.conducted_before})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Projected Standing</span>
                <span style={{ color: achieved ? '#047857' : '#dc2626', fontWeight: 800 }}>
                  {activeSim.simulated_percentage}% ({activeSim.attended_after}/{activeSim.conducted_after})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Outcome</span>
                <span style={{ color: achieved ? '#047857' : '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  {achieved ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {achieved ? `Target ${targetPct}% Achieved` : `Target ${targetPct}% Missed`}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={goBack}
                style={{
                  padding: '10px 20px',
                  borderRadius: '11px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #785927, #684c20)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED PAGE 3: SUBJECT PLANNER DETAIL ===== */
  if (mode === 'subject') {
    const sub =
      effectivePlanner.subjects.find(s => String(s.subject_id) === String(activeRoute?.id)) ||
      activeRoute?.item ||
      null;

    if (!sub) {
      return (
        <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
          <div className="golden-os-window">
            <div className="golden-os-body" style={{ textAlign: 'center', padding: '24px', gap: '12px', alignItems: 'center' }}>
              <Clock size={24} style={{ color: '#8c7a5b' }} />
              <div style={{ fontWeight: 700, color: '#2b2112' }}>Subject planner entry unavailable.</div>
              <button type="button" onClick={goBack} className="golden-os-feedback-filter-btn" style={{ padding: '8px 16px', borderRadius: '10px' }}>
                Back to Planner
              </button>
            </div>
          </div>
        </div>
      );
    }

    const isUnder = sub.current_percentage < targetPct;

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={13} />
                <span>{sub.subject_name}{sub.subject_code ? ` (${sub.subject_code})` : ''}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Current Standing</span>
                <span style={{ color: isUnder ? '#dc2626' : '#047857', fontWeight: 800 }}>
                  {sub.current_percentage}% ({sub.total_attended}/{sub.total_conducted})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>{isUnder ? `Classes Needed (${targetPct}%)` : 'Safe Bunk Allowance'}</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>
                  {isUnder ? `${sub.classes_needed} consecutive` : `${sub.bunk_allowance} session(s)`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>If Attend Next 3</span>
                <span style={{ color: '#047857', fontWeight: 700 }}>{sub.projection_attend_next_3}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', gap: '10px' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>If Miss Next 3</span>
                <span style={{ color: '#dc2626', fontWeight: 700 }}>{sub.projection_miss_next_3}%</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigateTo({ section: 'planner', mode: 'simulator', subjectId: sub.subject_id })}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '10px 16px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Sliders size={14} />
                <span>Simulate This Subject</span>
              </button>
              <button
                type="button"
                onClick={goBack}
                style={{
                  padding: '10px 20px',
                  borderRadius: '11px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #785927, #684c20)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== PLANNER ROOT DIRECTORY (CLEAN SINGLE-LINE ROWS, NO GIANT STACKED BOXES) ===== */
  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window">
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Compact Target Selector & Refresh Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
            <div className="golden-os-segmented" style={{ flex: 1, minWidth: 0, flexWrap: 'nowrap' }}>
              {[75, 80, 85].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    setTargetPct(t);
                  }}
                  className={`golden-os-segmented-btn ${targetPct === t ? 'active' : ''}`}
                  style={{ flex: 1, padding: '8px 6px', whiteSpace: 'nowrap', textAlign: 'center' }}
                >
                  {t}%
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                fetchPlanner(targetPct);
              }}
              disabled={isLoading}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '9px 12px', borderRadius: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              <RefreshCw size={14} className={isLoading ? 'spin-icon' : ''} />
              <span>{isLoading ? 'Syncing' : 'Refresh'}</span>
            </button>
          </div>

          {errorMsg && (
            <div role="alert" className="feedback-banner is-error">
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{errorMsg}</span>
            </div>
          )}

          {/* Overview & Simulator Entry Rows */}
          <div className="golden-os-list-shell">
            <button
              type="button"
              onClick={() => navigateTo({ section: 'planner', mode: 'overall' })}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar">
                  <Target size={17} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Overall Target Standing ({targetPct}%)
                  </div>
                </div>
              </div>
              <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
            </button>

            <button
              type="button"
              onClick={() => navigateTo({ section: 'planner', mode: 'simulator' })}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar">
                  <Sliders size={17} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    What-If Lecture Simulator
                  </div>
                </div>
              </div>
              <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
            </button>
          </div>

          {/* Branch Subjects List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#785927' }}>
                Branch Subjects Plan
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8c7a5b' }}>
                {effectivePlanner.subjects.length} {effectivePlanner.subjects.length === 1 ? 'subject' : 'subjects'}
              </span>
            </div>

            {effectivePlanner.subjects.length === 0 ? (
              <div style={{ padding: '20px 14px', textAlign: 'center', background: '#ffffff', border: '1px dashed #d6c5a3', borderRadius: '14px', color: '#6b5b3e', fontSize: '0.82rem' }}>
                No branch subjects recorded yet.
              </div>
            ) : (
              <div className="golden-os-list-shell">
                {effectivePlanner.subjects.map(sub => (
                  <button
                    key={sub.subject_id}
                    type="button"
                    onClick={() => navigateTo({ section: 'planner', mode: 'subject', id: sub.subject_id, item: sub })}
                    className="golden-os-list-row"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div className="golden-os-avatar">
                        <BookOpen size={17} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.subject_name}{sub.subject_code ? ` (${sub.subject_code})` : ''}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
