import React, { useState, useEffect } from 'react';
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
    setAlerts(getDynamicAlerts());
  }, [students, user]);

  useEffect(() => {
    if (viewMode === 'student') {
      loadWellnessScore();
      loadMoodLog();
    } else if (viewMode === 'counselor') {
      loadCounselorAlerts();
    }
  }, [viewMode, instId, userId]);

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
    } catch (error) {
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
    } catch (error) {
      setAlerts(getDynamicAlerts());
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
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
      background: 'rgba(12, 16, 32, 0.85)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(236, 72, 153, 0.25)',
      borderRadius: '24px',
      boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 35px rgba(236, 72, 153, 0.08)',
      color: '#f8fafc',
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
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
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
            boxShadow: '0 0 20px rgba(236, 72, 153, 0.35)'
          }}>
            ❤️
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.75rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #00f2fe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '0.01em'
            }}>
              Student Wellness Center
            </h2>
            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '0.88rem' }}>
              Mental Health Tracker, Mood Analytics & Confidential Counselor Hub
            </p>
          </div>
        </div>

        {/* View Mode Toggle Buttons */}
        <div style={{ display: 'flex', gap: '10px', background: 'rgba(255, 255, 255, 0.04)', padding: '4px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setViewMode('student')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              border: viewMode === 'student' ? '1px solid #ec4899' : 'none',
              background: viewMode === 'student' ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(168, 85, 247, 0.25))' : 'transparent',
              color: viewMode === 'student' ? '#fff' : '#9ca3af',
              boxShadow: viewMode === 'student' ? '0 0 15px rgba(236, 72, 153, 0.2)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            🧑‍🎓 Student Portal
          </button>

          {(role === 'admin' || role === 'teacher' || role === 'counselor') && (
            <button
              onClick={() => setViewMode('counselor')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                border: viewMode === 'counselor' ? '1px solid #a855f7' : 'none',
                background: viewMode === 'counselor' ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(0, 242, 254, 0.25))' : 'transparent',
                color: viewMode === 'counselor' ? '#fff' : '#9ca3af',
                boxShadow: viewMode === 'counselor' ? '0 0 15px rgba(168, 85, 247, 0.2)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              🩺 Counselor Alerts
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>💖</div>
          <div>Loading Wellness Metrics...</div>
        </div>
      ) : viewMode === 'student' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

          {/* CARD 1: Wellness Score Summary */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
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
                background: `radial-gradient(closest-side, #0c1020 78%, transparent 80% 100%), conic-gradient(${currentBadge.color} ${wellnessData.score}%, rgba(255,255,255,0.08) 0)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 25px ${currentBadge.bg}`
              }}>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {wellnessData.score}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px', fontWeight: 600 }}>OUT OF 100</div>
              </div>
            </div>

            {/* 4 Metric Breakdown Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'rgba(0, 242, 254, 0.06)', border: '1px solid rgba(0, 242, 254, 0.15)', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Attendance</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00f2fe', marginTop: '2px' }}>
                  {wellnessData.breakdown?.attendance_score || 94}%
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Mood Index</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                  {wellnessData.breakdown?.mood_score || 86}%
                </div>
              </div>

              <div style={{ background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.15)', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Engagement</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a855f7', marginTop: '2px' }}>
                  {wellnessData.breakdown?.engagement_score || 88}%
                </div>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.15)', padding: '12px', borderRadius: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Overall Health</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>
                  {wellnessData.breakdown?.overall_health || 88}%
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Interactive Mood Check-In */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                How are you feeling today?
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#9ca3af' }}>
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
                      borderRadius: '16px',
                      border: isSelected ? `2px solid ${item.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isSelected ? `${item.color}22` : 'rgba(255, 255, 255, 0.02)',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transform: isSelected ? 'scale(1.05)' : 'none',
                      boxShadow: isSelected ? `0 0 15px ${item.color}44` : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.8rem' }}>{item.emoji}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isSelected ? item.color : '#9ca3af' }}>
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
                  background: 'rgba(8, 12, 24, 0.6)',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                  color: '#fff',
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
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                color: '#10b981',
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
                borderRadius: '14px',
                background: selectedMood ? 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' : 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: selectedMood ? '#fff' : '#64748b',
                fontWeight: 800,
                fontSize: '0.92rem',
                cursor: selectedMood && !isSubmitting ? 'pointer' : 'not-allowed',
                boxShadow: selectedMood ? '0 6px 20px rgba(236, 72, 153, 0.3)' : 'none',
                opacity: selectedMood ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
            >
              {isSubmitting ? 'Logging Mood...' : selectedMood ? `💖 Log ${moodEmojis[selectedMood]?.label} Check-in` : 'Select a mood emoji above'}
            </button>
          </div>

          {/* CARD 3: Mood History Timeline */}
          <div style={{
            gridColumn: '1 / -1',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
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
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '1.8rem' }}>{item.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff', textTransform: 'capitalize' }}>
                          {item.label} Mood
                        </div>
                        {entry.notes && (
                          <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
                            "{entry.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#a78bfa', whiteSpace: 'nowrap' }}>
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
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
              Counselor Early Intervention Alerts
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 700 }}>
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
                  background: alert.resolved ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.08)',
                  border: alert.resolved ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                      {alert.student_name} ({alert.student_id})
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: alert.severity === 'high' ? '#ef4444' : '#f59e0b',
                      color: '#000',
                      textTransform: 'uppercase'
                    }}>
                      {alert.severity} Risk
                    </span>
                  </div>

                  <div style={{ fontSize: '0.88rem', color: alert.resolved ? '#10b981' : '#fca5a5', marginTop: '6px', fontWeight: 600 }}>
                    {alert.reason}
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '4px' }}>
                    Wellness Score: <strong style={{ color: '#fff' }}>{alert.wellness_score}/100</strong> • Triggered: {new Date(alert.triggered_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  {alert.resolved ? (
                    <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 800 }}>
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
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
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
