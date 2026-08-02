/**
 * WellnessCounselorPanel.jsx
 * Feature 39: Student Wellness + Counselor Alert System
 *
 * Student view  → daily mood check-in, wellness score, history
 * Staff view    → at-risk list, counselor alerts, mood distribution chart
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Heart, AlertTriangle, Smile, Frown, Meh, TrendingDown,
  Activity, Users, Bell, CheckCircle, RefreshCw
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const MOODS = [
  { key: 'great',    label: 'Great',    emoji: '😄', score: 9,  color: '#22d3ee' },
  { key: 'good',     label: 'Good',     emoji: '🙂', score: 7,  color: '#4ade80' },
  { key: 'neutral',  label: 'Neutral',  emoji: '😐', score: 5,  color: '#94a3b8' },
  { key: 'sad',      label: 'Sad',      emoji: '😢', score: 3,  color: '#f59e0b' },
  { key: 'stressed', label: 'Stressed', emoji: '😰', score: 2,  color: '#f97316' },
  { key: 'anxious',  label: 'Anxious',  emoji: '😨', score: 1,  color: '#ef4444' },
];

const LEVEL_COLORS = {
  excellent: '#22d3ee',
  good:      '#4ade80',
  fair:      '#f59e0b',
  at_risk:   '#ef4444',
};

// ── Shared helpers ────────────────────────────────────────────────────────────

function apiFetch(path, token, options = {}) {
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  }).then(r => r.json());
}

// ── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, level, size = 120 }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = LEVEL_COLORS[level] || '#94a3b8';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text
        x={size / 2} y={size / 2 + 6}
        textAnchor="middle"
        style={{ fill: color, fontSize: '22px', fontWeight: 'bold', transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {Math.round(score)}
      </text>
    </svg>
  );
}

// ── Student Wellness View ─────────────────────────────────────────────────────

function StudentWellnessView({ token }) {
  const [score, setScore] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const loadScore = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/v1/wellness/my-score', token);
      setScore(data);
    } catch (e) {
      setError('Could not load wellness score.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadScore(); }, [loadScore]);

  const submitCheckin = async () => {
    if (!selectedMood) return;
    setSubmitting(true);
    setError('');
    try {
      const mood = MOODS.find(m => m.key === selectedMood);
      const res = await apiFetch('/api/v1/wellness/checkin', token, {
        method: 'POST',
        body: JSON.stringify({
          mood: selectedMood,
          mood_score: mood?.score ?? 5,
          note,
        }),
      });
      if (res.message) {
        setSubmitted(true);
        setSelectedMood(null);
        setNote('');
        setTimeout(() => { setSubmitted(false); loadScore(); }, 2000);
      } else {
        setError(res.detail || 'Check-in failed.');
      }
    } catch (e) {
      setError('Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  const s = {
    card: { background: '#111827', borderRadius: '16px', padding: '20px', border: '1px solid #1e293b' },
    h2:   { fontSize: '18px', fontWeight: '700', color: '#f1f5f9', margin: '0 0 4px' },
    sub:  { fontSize: '13px', color: '#64748b', margin: 0 },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Score card */}
      <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: '24px' }}>
        {loading ? (
          <div style={{ color: '#64748b', fontSize: '14px' }}>Loading your score…</div>
        ) : score ? (
          <>
            <ScoreRing score={score.score} level={score.level} />
            <div>
              <h2 style={s.h2}>Wellness Score</h2>
              <div style={{ fontSize: '13px', color: LEVEL_COLORS[score.level] || '#94a3b8', fontWeight: '600', marginBottom: '8px', textTransform: 'capitalize' }}>
                {score.level?.replace('_', ' ')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
                {Object.entries(score.components || {}).map(([k, v]) => (
                  <div key={k} style={{ fontSize: '12px', color: '#94a3b8' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: '600' }}>{v}</span>{' '}
                    {k.replace(/_/g, ' ')}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#4ade80' }}>
                Attendance: <b>{score.attendance_pct}%</b>
              </div>
            </div>
          </>
        ) : (
          <div style={{ color: '#ef4444', fontSize: '13px' }}>{error || 'No data'}</div>
        )}
      </div>

      {/* Daily check-in */}
      <div style={s.card}>
        <h2 style={s.h2}>Daily Mood Check-in</h2>
        <p style={s.sub}>How are you feeling today? This helps your institution support you better.</p>

        {submitted ? (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#4ade80', fontSize: '14px', fontWeight: '600' }}>
            <CheckCircle size={20} />
            Check-in submitted! Your wellness score is being updated.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
              {MOODS.map(m => (
                <button
                  key={m.key}
                  onClick={() => setSelectedMood(m.key)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: `2px solid ${selectedMood === m.key ? m.color : '#1e293b'}`,
                    background: selectedMood === m.key ? `${m.color}22` : '#0f172a',
                    color: selectedMood === m.key ? m.color : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '20px',
                    transition: 'all 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{m.emoji}</span>
                  <span style={{ fontSize: '11px', fontWeight: '600' }}>{m.label}</span>
                </button>
              ))}
            </div>

            {selectedMood && (
              <>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Optional: Add a note (visible only to counselor if alerted)"
                  rows={2}
                  style={{
                    width: '100%', marginTop: '12px', padding: '10px', boxSizing: 'border-box',
                    background: '#0f172a', border: '1px solid #334155', borderRadius: '8px',
                    color: '#e2e8f0', fontSize: '13px', resize: 'vertical',
                  }}
                />
                {error && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{error}</div>}
                <button
                  onClick={submitCheckin}
                  disabled={submitting}
                  style={{
                    marginTop: '12px', padding: '10px 24px', borderRadius: '10px',
                    border: 'none', background: '#22d3ee', color: '#000',
                    fontWeight: '700', fontSize: '13px', cursor: submitting ? 'wait' : 'pointer',
                  }}
                >
                  {submitting ? 'Submitting…' : 'Submit Check-in'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Staff Counselor View ──────────────────────────────────────────────────────

function CounselorView({ token }) {
  const [dashboard, setDashboard]   = useState(null);
  const [atRisk, setAtRisk]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dash, risk] = await Promise.all([
        apiFetch('/api/v1/wellness/dashboard', token),
        apiFetch('/api/v1/wellness/at-risk?limit=15', token),
      ]);
      setDashboard(dash);
      setAtRisk(risk.at_risk_students || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const refresh = () => { setRefreshing(true); load(); };

  const moodColors = {
    great: '#22d3ee', good: '#4ade80', neutral: '#94a3b8',
    sad: '#f59e0b', stressed: '#f97316', anxious: '#ef4444',
  };

  const s = {
    card:    { background: '#111827', borderRadius: '16px', padding: '20px', border: '1px solid #1e293b' },
    stat:    { background: '#0f172a', borderRadius: '12px', padding: '16px', flex: 1 },
    statNum: { fontSize: '28px', fontWeight: '800', color: '#f1f5f9' },
    statLbl: { fontSize: '12px', color: '#64748b', marginTop: '2px' },
  };

  if (loading) return (
    <div style={{ color: '#64748b', fontSize: '14px', padding: '20px' }}>Loading wellness data…</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#f1f5f9' }}>
            Counselor Dashboard
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Student wellness monitoring and mental health alerts
          </p>
        </div>
        <button
          onClick={refresh}
          style={{ background: '#1e293b', border: 'none', borderRadius: '8px', padding: '8px 14px',
            color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      {dashboard && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={s.stat}>
            <div style={s.statNum}>{dashboard.recent_checkins}</div>
            <div style={s.statLbl}>Recent Check-ins</div>
          </div>
          <div style={{ ...s.stat, borderColor: dashboard.counselor_alerts > 0 ? '#ef444444' : 'transparent' }}>
            <div style={{ ...s.statNum, color: dashboard.counselor_alerts > 0 ? '#ef4444' : '#f1f5f9' }}>
              {dashboard.counselor_alerts}
            </div>
            <div style={s.statLbl}>Counselor Alerts</div>
          </div>
          <div style={s.stat}>
            <div style={s.statNum}>{atRisk.length}</div>
            <div style={s.statLbl}>At-Risk Students</div>
          </div>
        </div>
      )}

      {/* Mood Distribution */}
      {dashboard?.mood_distribution && Object.keys(dashboard.mood_distribution).length > 0 && (
        <div style={s.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: '#e2e8f0' }}>
            Mood Distribution (Recent Check-ins)
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(dashboard.mood_distribution)
              .sort((a, b) => b[1] - a[1])
              .map(([mood, count]) => {
                const m = MOODS.find(x => x.key === mood);
                return (
                  <div key={mood} style={{
                    padding: '8px 14px', borderRadius: '20px',
                    background: `${moodColors[mood] || '#94a3b8'}22`,
                    border: `1px solid ${moodColors[mood] || '#94a3b8'}44`,
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <span>{m?.emoji || '😐'}</span>
                    <span style={{ fontSize: '13px', color: moodColors[mood] || '#94a3b8', fontWeight: '600' }}>
                      {mood}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>× {count}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* At-Risk Students */}
      <div style={s.card}>
        <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: '#e2e8f0' }}>
          Students Needing Attention
        </h3>
        {atRisk.length === 0 ? (
          <div style={{ color: '#4ade80', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} /> All students are doing well!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {atRisk.map(student => {
              const color = LEVEL_COLORS[student.level] || '#94a3b8';
              return (
                <div key={student.student_id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', borderRadius: '10px',
                  background: '#0f172a', border: `1px solid ${color}33`,
                }}>
                  {/* Score circle */}
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: `${color}22`, border: `2px solid ${color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '800', color, flexShrink: 0,
                  }}>
                    {Math.round(student.score)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>
                      {student.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Roll: {student.roll} &nbsp;|&nbsp; {student.dep}
                    </div>
                    <div style={{ fontSize: '11px', color, marginTop: '2px', textTransform: 'capitalize' }}>
                      {student.level?.replace('_', ' ')} &nbsp;•&nbsp; Attendance: {student.attendance_pct}%
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px', borderRadius: '12px',
                    background: `${color}22`, color, fontSize: '11px', fontWeight: '600',
                    textTransform: 'uppercase', flexShrink: 0,
                  }}>
                    {student.level?.replace('_', ' ')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WellnessCounselorPanel({ token, userRole }) {
  const isStudent = userRole === 'student';

  return (
    <div style={{ padding: '20px', background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      {/* Panel Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: '#ef444422', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Heart size={24} color="#ef4444" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#f1f5f9' }}>
              Student Wellness Center
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
              {isStudent
                ? 'Track your mood, wellness score, and mental health'
                : 'Monitor student wellness and respond to counselor alerts'}
            </p>
          </div>
        </div>
      </div>

      {isStudent
        ? <StudentWellnessView token={token} />
        : <CounselorView token={token} />
      }
    </div>
  );
}
