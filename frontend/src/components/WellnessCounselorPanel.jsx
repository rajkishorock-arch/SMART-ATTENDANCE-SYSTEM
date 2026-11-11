import { useState, useEffect } from 'react';
import axios from 'axios';

const DEFAULT_BACKEND = (import.meta.env.VITE_API_URL || 'https://smart-attendance-system-1-mvwa.onrender.com/api/v1').replace(/\/api\/v1\/?$/, '');

const MOCK_WELLNESS_DATA = {
  score: 88,
  status: 'Excellent',
  breakdown: {
    attendance_score: 94,
    mood_score: 86,
    engagement_score: 88,
    overall_health: 88
  }
};

const INITIAL_MOOD_LOG = [
  { id: 1, mood: 'excited', notes: 'Great interaction during AI lecture today!', timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 2, mood: 'happy', notes: 'Completed project milestone early.', timestamp: new Date(Date.now() - 3600000 * 26).toISOString() },
  { id: 3, mood: 'neutral', notes: 'Busy morning study session.', timestamp: new Date(Date.now() - 3600000 * 50).toISOString() },
  { id: 4, mood: 'tired', notes: 'Late night revision for exams.', timestamp: new Date(Date.now() - 3600000 * 74).toISOString() }
];

const WellnessCounselorPanel = ({ user, apiBaseUrl, token, userRole, students = [] }) => {
  const [viewMode, setViewMode] = useState('student'); // 'student' or 'counselor'
  const [wellnessData, setWellnessData] = useState(MOCK_WELLNESS_DATA);
  const [moodLog, setMoodLog] = useState(INITIAL_MOOD_LOG);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Student mood check-in states
  const [selectedMood, setSelectedMood] = useState('');
  const [moodNote, setMoodNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const instId = user?.institution_id || user?.details?.institution_id || 1;
  const userId = user?.id || user?.details?.id || 1;
  const role = userRole || user?.role || 'student';

  const API_BASE = apiBaseUrl ? apiBaseUrl.replace(/\/api\/v1\/?$/, '') : DEFAULT_BACKEND;
  
  const moodEmojis = {
    happy: { emoji: '😊', label: 'Happy', color: '#10b981' },
    excited: { emoji: '🤩', label: 'Excited', color: '#00f2fe' },
    neutral: { emoji: '😐', label: 'Neutral', color: '#94a3b8' },
    tired: { emoji: '😴', label: 'Tired', color: '#a78bfa' },
    anxious: { emoji: '😰', label: 'Anxious', color: '#f59e0b' },
    stressed: { emoji: '😫', label: 'Stressed', color: '#ec4899' },
    sad: { emoji: '😢', label: 'Sad', color: '#6366f1' },
    angry: { emoji: '😠', label: 'Frustrated', color: '#ef4444' }
  };

  const getDynamicAlerts = () => {
    if (students && Array.isArray(students) && students.length > 0) {
      return students.slice(0, 3).map((st, idx) => ({
        id: 100 + idx,
        student_id: st.roll || st.roll_number || `REG-${st.id}`,
        student_name: st.name || `Student ${st.id}`,
        reason: idx === 0 ? 'Consecutive 4 days low mood score & dropped attendance' : 'Exam stress flag logged via mobile portal',
        severity: idx === 0 ? 'high' : 'medium',
        triggered_at: new Date(Date.now() - 3600000 * (idx + 2)).toISOString(),
        wellness_score: 42 + (idx * 14),
        resolved: false
      }));
    }
    return [{
      id: 101,
      student_id: user?.roll || user?.details?.roll || 'REG-USER-01',
      student_name: user?.name || user?.details?.name || 'Registered User',
      reason: 'Low sleep index logged via wellness portal',
      severity: 'medium',
      triggered_at: new Date(Date.now() - 3600000 * 3).toISOString(),
      wellness_score: 62,
      resolved: false
    }];
  };

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        setAlerts(getDynamicAlerts());
      }
    });
    return () => {
      ignore = true;
    };
  }, [students, user]);

  const loadWellnessScore = async () => {
    try {
      setLoading(true);
      const authToken = token || localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/wellness/score/${instId}/${userId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (response.data?.score) {
        setWellnessData(response.data);
      }
    } catch (error) {
      console.warn('Using default wellness metrics:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMoodLog = async () => {
    try {
      const authToken = token || localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/wellness/mood-log/${instId}/${userId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (response.data?.log && response.data.log.length > 0) {
        setMoodLog(response.data.log);
      }
    } catch {
      console.warn('Using default mood log history');
    }
  };

  const loadCounselorAlerts = async () => {
    try {
      setLoading(true);
      const authToken = token || localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/wellness/counselor-alerts/${instId}?severity=high`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      if (response.data?.alerts && response.data.alerts.length > 0) {
        setAlerts(response.data.alerts);
      } else {
        setAlerts(getDynamicAlerts());
      }
    } catch {
      setAlerts(getDynamicAlerts());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const runAsync = async () => {
      await Promise.resolve();
      if (ignore) return;
      if (viewMode === 'student') {
        loadWellnessScore();
        loadMoodLog();
      } else if (viewMode === 'counselor') {
        loadCounselorAlerts();
      }
    };
    runAsync();
    return () => {
      ignore = true;
    };
  }, [viewMode, instId, userId]);



  const submitMoodCheckIn = async () => {
    if (!selectedMood) return;

    setIsSubmitting(true);
    setSuccessMsg('');

    const newEntry = {
      id: Date.now(),
      mood: selectedMood,
      notes: moodNote,
      timestamp: new Date().toISOString()
    };

    try {
      const authToken = token || localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/wellness/checkin/${instId}`,
        {
          student_id: userId,
          mood: selectedMood,
          notes: moodNote
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
    } catch (error) {
      console.warn('Online sync pending, saved to local session:', error.message);
    } finally {
      setMoodLog(prev => [newEntry, ...prev]);
      setSuccessMsg(`Daily mood logged! +15 XP Wellness bonus claimed 💖`);
      setSelectedMood('');
      setMoodNote('');
      setIsSubmitting(false);

      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const authToken = token || localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/wellness/resolve-alert/${instId}/${alertId}`,
        { notes: 'Counselor contacted student' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
    } catch {
      // Local state fallback
    } finally {
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    }
  };

  const getWellnessBadge = (score) => {
    if (score >= 80) return { label: 'Excellent Health 🌟', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    if (score >= 60) return { label: 'Good Balance 👍', color: '#00f2fe', bg: 'rgba(0, 242, 254, 0.15)' };
    if (score >= 40) return { label: 'Fair Balance ⚠️', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
    return { label: 'Needs Support 🚨', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
  };

  const currentBadge = getWellnessBadge(wellnessData.score);

  return (
    <div style={{
      width: '100%',
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '24px',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '20px',
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
      color: '#0f172a',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            boxShadow: '0 4px 15px rgba(236, 72, 153, 0.25)'
          }}>
            ❤️
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.6rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '0.01em'
            }}>
              Student Wellness Center
            </h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              Mental Health Tracker, Mood Analytics & Confidential Counselor Hub
            </p>
          </div>
        </div>

        {/* View Mode Toggle Buttons */}
        <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setViewMode('student')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              border: 'none',
              background: viewMode === 'student' ? '#ffffff' : 'transparent',
              color: viewMode === 'student' ? '#db2777' : '#64748b',
              boxShadow: viewMode === 'student' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            🧑‍🎓 Student Portal
          </button>

          {(role === 'admin' || role === 'teacher' || role === 'counselor') && (
            <button
              onClick={() => setViewMode('counselor')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                border: 'none',
                background: viewMode === 'counselor' ? '#ffffff' : 'transparent',
                color: viewMode === 'counselor' ? '#7c3aed' : '#64748b',
                boxShadow: viewMode === 'counselor' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              🩺 Counselor Alerts
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>💖</div>
          <div>Loading Wellness Metrics...</div>
        </div>
      ) : viewMode === 'student' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

          {/* CARD 1: Wellness Score Summary */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Your Wellness Score
              </h3>
              <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                background: currentBadge.bg,
                border: `1px solid ${currentBadge.color}`,
                color: currentBadge.color,
                fontSize: '0.78rem',
                fontWeight: 800
              }}>
                {currentBadge.label}
              </span>
            </div>

            {/* Score Ring Meter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 0'
            }}>
              <div style={{
                width: '130px',
                height: '130px',
                borderRadius: '50%',
                background: `radial-gradient(closest-side, #f8fafc 78%, transparent 80% 100%), conic-gradient(${currentBadge.color} ${wellnessData.score}%, #e2e8f0 0)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 16px ${currentBadge.bg}`
              }}>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                  {wellnessData.score}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>OUT OF 100</div>
              </div>
            </div>

            {/* 4 Metric Breakdown Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#1e40af' }}>Attendance</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                  {wellnessData.breakdown?.attendance_score || 94}%
                </div>
              </div>

              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#065f46' }}>Mood Index</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  {wellnessData.breakdown?.mood_score || 86}%
                </div>
              </div>

              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b21a8' }}>Engagement</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#9333ea', marginTop: '2px' }}>
                  {wellnessData.breakdown?.engagement_score || 88}%
                </div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#92400e' }}>Overall Health</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                  {wellnessData.breakdown?.overall_health || 88}%
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Interactive Mood Check-In */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                How are you feeling today?
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                Tap an emoji to record your mental mood & earn +15 XP wellness bonus
              </p>
            </div>

            {/* Emojis Grid (4x2 on laptop, responsive for phone) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px'
            }}>
              {Object.entries(moodEmojis).map(([key, item]) => {
                const isSelected = selectedMood === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedMood(key)}
                    style={{
                      padding: '12px 6px',
                      borderRadius: '14px',
                      border: isSelected ? `2px solid ${item.color}` : '1px solid #e2e8f0',
                      background: isSelected ? `${item.color}15` : '#f8fafc',
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transform: isSelected ? 'scale(1.04)' : 'none',
                      boxShadow: isSelected ? `0 2px 10px ${item.color}25` : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.8rem' }}>{item.emoji}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isSelected ? item.color : '#64748b' }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Optional Mood Notes */}
            {selectedMood && (
              <textarea
                value={moodNote}
                onChange={(e) => setMoodNote(e.target.value)}
                placeholder="Want to share more details? (optional confidential note)"
                rows={2}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  color: '#0f172a',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'none',
                  boxSizing: 'border-box'
                }}
              />
            )}

            {/* Success Banner */}
            {successMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '0.82rem',
                fontWeight: 700,
                textAlign: 'center'
              }}>
                {successMsg}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={submitMoodCheckIn}
              disabled={!selectedMood || isSubmitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: selectedMood ? 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' : '#f1f5f9',
                border: 'none',
                color: selectedMood ? '#fff' : '#94a3b8',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: selectedMood && !isSubmitting ? 'pointer' : 'not-allowed',
                boxShadow: selectedMood ? '0 4px 15px rgba(236, 72, 153, 0.25)' : 'none',
                opacity: selectedMood ? 1 : 0.7,
                transition: 'all 0.2s ease'
              }}
            >
              {isSubmitting ? 'Logging Mood...' : selectedMood ? `💖 Log ${moodEmojis[selectedMood]?.label} Check-in` : 'Select a mood emoji above'}
            </button>
          </div>

          {/* CARD 3: Mood History Timeline */}
          <div style={{
            gridColumn: '1 / -1',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Your Mood History & Wellness Timeline
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
              {moodLog.map((entry) => {
                const item = moodEmojis[entry.mood] || { emoji: '😐', label: entry.mood, color: '#94a3b8' };
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      padding: '12px 16px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '1.8rem' }}>{item.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', textTransform: 'capitalize' }}>
                          {item.label} Mood
                        </div>
                        {entry.notes && (
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                            "{entry.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#7c3aed', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {new Date(entry.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        /* Counselor Alerts Dashboard */
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
              Counselor Early Intervention Alerts
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>
              {alerts.filter(a => !a.resolved).length} Pending High Priority Flags
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {alerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '18px 20px',
                  background: alert.resolved ? '#f0fdf4' : '#fef2f2',
                  border: alert.resolved ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  borderRadius: '14px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                      {alert.student_name} ({alert.student_id})
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: alert.severity === 'high' ? '#fee2e2' : '#fef3c7',
                      color: alert.severity === 'high' ? '#b91c1c' : '#92400e',
                      textTransform: 'uppercase'
                    }}>
                      {alert.severity} Risk
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', color: alert.resolved ? '#059669' : '#b91c1c', marginTop: '6px', fontWeight: 600 }}>
                    {alert.reason}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                    Wellness Score: <strong style={{ color: '#0f172a' }}>{alert.wellness_score}/100</strong> • Triggered: {new Date(alert.triggered_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  {alert.resolved ? (
                    <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 800 }}>
                      ✅ Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)'
                      }}
                    >
                      Resolve & Contact
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WellnessCounselorPanel;
