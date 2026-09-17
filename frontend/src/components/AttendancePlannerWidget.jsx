import { useState, useEffect, useCallback } from 'react';
import { 
  Target, ShieldCheck, AlertTriangle, AlertCircle,
  Sparkles, Sliders, CheckCircle2, RefreshCw
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

export default function AttendancePlannerWidget({
  token,
  playCyberSound = () => {}
}) {
  const [plannerData, setPlannerData] = useState(null);
  const [targetPct, setTargetPct] = useState(75.0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // What-If Simulation State
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [simSubjectId, setSimSubjectId] = useState('');
  const [simUpcoming, setSimUpcoming] = useState(10);
  const [simPlanned, setSimPlanned] = useState(8);
  const [simResult, setSimResult] = useState(null);

  // ── Fetch Planner Summary ──────────────────────────────────────────────────
  const fetchPlanner = useCallback(async (target = targetPct, isCancelled = () => false) => {
    if (!token) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/planner/summary?target_percentage=${target}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Planner unavailable (${res.status})`);
      const data = await res.json();
      if (!isCancelled()) {
        setPlannerData(data);
      }
    } catch (err) {
      if (!isCancelled()) {
        setErrorMsg(err.message || 'Failed to load attendance planner.');
      }
    } finally {
      if (!isCancelled()) {
        setIsLoading(false);
      }
    }
  }, [token, targetPct]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        fetchPlanner(targetPct, () => ignore);
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchPlanner, targetPct]);

  // ── Run What-If Simulation ─────────────────────────────────────────────────
  const runSimulation = useCallback(async (isCancelled = () => false) => {
    if (!token) return;
    try {
      const payload = {
        subject_id: simSubjectId ? parseInt(simSubjectId) : null,
        target_percentage: targetPct,
        upcoming_classes: parseInt(simUpcoming) || 0,
        planned_attend: parseInt(simPlanned) || 0
      };
      const res = await fetch(`${API_BASE_URL}/planner/what-if`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (!isCancelled()) {
          setSimResult(data);
        }
      }
    } catch (err) {
      console.warn('Simulation failed:', err);
    }
  }, [token, simSubjectId, targetPct, simUpcoming, simPlanned]);

  useEffect(() => {
    let ignore = false;
    if (showWhatIf) {
      Promise.resolve().then(() => {
        if (!ignore) {
          runSimulation(() => ignore);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [showWhatIf, runSimulation]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SAFE':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.4)',
          text: '#34d399',
          label: 'Safe (≥ 75%)',
          icon: <ShieldCheck size={14} />
        };
      case 'WARNING':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.4)',
          text: '#fbbf24',
          label: 'Warning (70-75%)',
          icon: <AlertTriangle size={14} />
        };
      default:
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.4)',
          text: '#f87171',
          label: 'Critical (< 70%)',
          icon: <AlertCircle size={14} />
        };
    }
  };

  return (
    <div className="attendance-planner-wrapper" style={{
      color: '#f8fafc',
      fontFamily: 'inherit',
      margin: '0 0 24px 0'
    }}>
      {/* Planner Card Container */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.7) 100%)',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(12px)',
        position: 'relative'
      }}>
        {/* Card Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(0, 242, 254, 0.15)',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              borderRadius: '10px',
              padding: '8px',
              color: '#00f2fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Target size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 700 }}>
                  Smart 75% Attendance Planner
                </h3>
                <span style={{
                  background: 'rgba(0, 242, 254, 0.1)',
                  border: '1px solid rgba(0, 242, 254, 0.3)',
                  color: '#00f2fe',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  letterSpacing: '0.05em'
                }}>
                  Phase 4 AI Forecast
                </span>
              </div>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                Mathematical attendance recovery solver, surplus bunk allowance calculator, and what-if projection engine.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Target Threshold Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Target:</span>
              {[75, 80, 85].map(t => (
                <button
                  key={t}
                  onClick={() => {
                    playCyberSound('click');
                    setTargetPct(t);
                    fetchPlanner(t);
                  }}
                  style={{
                    background: targetPct === t ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: targetPct === t ? '1px solid rgba(0, 242, 254, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: targetPct === t ? '#00f2fe' : '#94a3b8',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t}%
                </button>
              ))}
            </div>

            {/* What-If Simulator Toggle */}
            <button
              onClick={() => {
                playCyberSound('click');
                setShowWhatIf(!showWhatIf);
              }}
              style={{
                background: showWhatIf ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: showWhatIf ? '1px solid rgba(168, 85, 247, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                color: showWhatIf ? '#c084fc' : '#cbd5e1',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sliders size={14} />
              {showWhatIf ? 'Hide Simulator' : 'What-If Simulator'}
            </button>

            {/* Refresh */}
            <button
              onClick={() => { playCyberSound('click'); fetchPlanner(targetPct); }}
              disabled={isLoading}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px'
              }}
              title="Refresh Planner"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '18px',
            fontSize: '0.88rem'
          }}>
            {errorMsg}
          </div>
        )}

        {isLoading && !plannerData ? (
          <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Calculating attendance recovery curves...</p>
          </div>
        ) : plannerData ? (
          <div>
            {/* Overall Summary Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '20px'
            }}>
              {/* Overall Percentage Card */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: getStatusBadge(plannerData.overall_status).bg,
                  border: `2px solid ${getStatusBadge(plannerData.overall_status).border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: getStatusBadge(plannerData.overall_status).text,
                  fontWeight: 800,
                  fontSize: '1.05rem'
                }}>
                  {plannerData.overall_percentage}%
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Overall Standing
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {getStatusBadge(plannerData.overall_status).icon}
                    {getStatusBadge(plannerData.overall_status).label}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {plannerData.overall_attended} / {plannerData.overall_conducted} classes
                  </span>
                </div>
              </div>

              {/* Recovery / Bunk Stat Card */}
              <div style={{
                background: plannerData.overall_percentage < targetPct 
                  ? 'rgba(239, 68, 68, 0.1)' 
                  : 'rgba(16, 185, 129, 0.1)',
                border: plannerData.overall_percentage < targetPct 
                  ? '1px solid rgba(239, 68, 68, 0.3)' 
                  : '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '12px',
                  background: plannerData.overall_percentage < targetPct ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: plannerData.overall_percentage < targetPct ? '#f87171' : '#34d399'
                }}>
                  {plannerData.overall_percentage < targetPct ? plannerData.overall_classes_needed : plannerData.overall_bunk_allowance}
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {plannerData.overall_percentage < targetPct ? 'Consecutive Classes Needed' : 'Safe Bunk Allowance'}
                  </span>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                    {plannerData.overall_percentage < targetPct 
                      ? `Attend ${plannerData.overall_classes_needed} to reach ${targetPct}%` 
                      : `Can miss up to ${plannerData.overall_bunk_allowance} session(s)`}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {plannerData.overall_percentage < targetPct ? 'Zero absences allowed' : `Stays ≥ ${targetPct}%`}
                  </span>
                </div>
              </div>

              {/* Advice Box */}
              <div style={{
                background: 'rgba(0, 242, 254, 0.06)',
                border: '1px solid rgba(0, 242, 254, 0.2)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                gridColumn: 'span 1'
              }}>
                <Sparkles size={22} color="#00f2fe" style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                  {plannerData.advice_message}
                </p>
              </div>
            </div>

            {/* WHAT-IF SIMULATOR DRAWER */}
            {showWhatIf && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                borderRadius: '14px',
                padding: '20px',
                marginBottom: '24px',
                boxShadow: '0 8px 30px rgba(168, 85, 247, 0.15)',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Sliders size={18} color="#c084fc" />
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff' }}>
                    Multi-Session What-If Projection Simulator
                  </h4>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  alignItems: 'flex-end',
                  marginBottom: '16px'
                }}>
                  {/* Subject Scope */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px' }}>
                      Simulation Scope:
                    </label>
                    <select
                      value={simSubjectId}
                      onChange={e => setSimSubjectId(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem'
                      }}
                    >
                      <option value="">All Subjects Combined (Overall)</option>
                      {plannerData.subjects.map(s => (
                        <option key={s.subject_id} value={s.subject_id}>
                          {s.subject_name} ({s.current_percentage}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Upcoming Classes Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Upcoming Classes:</label>
                      <span style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 700 }}>{simUpcoming}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={simUpcoming}
                      onChange={e => {
                        const val = parseInt(e.target.value);
                        setSimUpcoming(val);
                        if (simPlanned > val) setSimPlanned(val);
                      }}
                      style={{ width: '100%', accentColor: '#a855f7' }}
                    />
                  </div>

                  {/* Planned Attendance Slider */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Planned to Attend:</label>
                      <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700 }}>{simPlanned} / {simUpcoming}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={simUpcoming}
                      value={simPlanned}
                      onChange={e => setSimPlanned(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: '#10b981' }}
                    />
                  </div>
                </div>

                {/* Simulation Output Card */}
                {simResult && (
                  <div style={{
                    background: simResult.target_achieved 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)',
                    border: simResult.target_achieved 
                      ? '1px solid rgba(16, 185, 129, 0.3)' 
                      : '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {simResult.target_achieved ? (
                        <CheckCircle2 size={24} color="#34d399" />
                      ) : (
                        <AlertTriangle size={24} color="#f87171" />
                      )}
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                          Projected Standing: {simResult.simulated_percentage}% 
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            marginLeft: '8px',
                            color: simResult.difference_percentage >= 0 ? '#34d399' : '#f87171'
                          }}>
                            ({simResult.difference_percentage >= 0 ? `+${simResult.difference_percentage}%` : `${simResult.difference_percentage}%`})
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          Current: {simResult.current_percentage}% → After {simPlanned} / {simUpcoming} sessions: {simResult.simulated_percentage}%
                        </span>
                      </div>
                    </div>

                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      padding: '4px 12px',
                      borderRadius: '6px',
                      background: simResult.target_achieved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: simResult.target_achieved ? '#34d399' : '#f87171'
                    }}>
                      {simResult.target_achieved ? `Target ${targetPct}% Achieved` : `Target ${targetPct}% Missed`}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Subject-by-Subject Recovery Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px'
            }}>
              {plannerData.subjects.map(sub => {
                const badge = getStatusBadge(sub.status);
                const isUnder = sub.current_percentage < targetPct;

                return (
                  <div
                    key={sub.subject_id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.4)',
                      border: `1px solid ${isUnder ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      {/* Top row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: '#f8fafc' }}>
                            {sub.subject_name}
                          </h4>
                          {sub.subject_code && (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{sub.subject_code}</span>
                          )}
                        </div>

                        <span style={{
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                          color: badge.text,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {badge.icon} {sub.current_percentage}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div style={{
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, sub.current_percentage)}%`,
                          background: isUnder ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'linear-gradient(90deg, #10b981, #06b6d4)',
                          borderRadius: '3px'
                        }} />
                      </div>

                      {/* Classes Needed or Bunk Allowance */}
                      <div style={{
                        background: isUnder ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                        border: isUnder ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        marginBottom: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                          {isUnder ? 'Classes Needed to reach 75%:' : 'Safe Bunk Allowance:'}
                        </span>
                        <strong style={{
                          fontSize: '1rem',
                          color: isUnder ? '#f87171' : '#34d399'
                        }}>
                          {isUnder ? `${sub.classes_needed} consecutive` : `${sub.bunk_allowance} class(es)`}
                        </strong>
                      </div>
                    </div>

                    {/* Footer Forecasts */}
                    <div style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      paddingTop: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: '#64748b'
                    }}>
                      <span>If attend next 3: <strong style={{ color: '#22d3ee' }}>{sub.projection_attend_next_3}%</strong></span>
                      <span>If miss next 3: <strong style={{ color: '#f87171' }}>{sub.projection_miss_next_3}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
