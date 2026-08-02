import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WellnessCounselorPanel = ({ user }) => {
  const [viewMode, setViewMode] = useState('student'); // 'student' or 'counselor'
  const [wellnessData, setWellnessData] = useState(null);
  const [moodLog, setMoodLog] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Student mood check-in
  const [selectedMood, setSelectedMood] = useState('');
  const [moodNote, setMoodNote] = useState('');
  
  const API_BASE = 'http://localhost:8000';
  
  const moodEmojis = {
    happy: '😊',
    neutral: '😐',
    sad: '😢',
    anxious: '😰',
    stressed: '😫',
    angry: '😠',
    tired: '😴',
    excited: '🤩'
  };

  useEffect(() => {
    if (viewMode === 'student' && user?.id) {
      loadWellnessScore();
      loadMoodLog();
    } else if (viewMode === 'counselor') {
      loadCounselorAlerts();
    }
  }, [viewMode, user]);

  const loadWellnessScore = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/wellness/score/${user.institution_id}/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWellnessData(response.data);
    } catch (error) {
      console.error('Failed to load wellness score:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoodLog = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/wellness/mood-log/${user.institution_id}/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMoodLog(response.data.log || []);
    } catch (error) {
      console.error('Failed to load mood log:', error);
    }
  };

  const loadCounselorAlerts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/wellness/counselor-alerts/${user.institution_id}?severity=high`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitMoodCheckIn = async () => {
    if (!selectedMood) {
      alert('Please select a mood');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/wellness/checkin/${user.institution_id}`,
        {
          student_id: user.id,
          mood: selectedMood,
          notes: moodNote
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Mood logged successfully! 💚');
      setSelectedMood('');
      setMoodNote('');
      loadWellnessScore();
      loadMoodLog();
    } catch (error) {
      alert('Failed to log mood: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resolveAlert = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/wellness/resolve-alert/${user.institution_id}/${alertId}`,
        { notes: 'Counselor contacted student' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Alert resolved');
      loadCounselorAlerts();
    } catch (error) {
      alert('Failed to resolve alert');
    }
  };

  const getWellnessColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getWellnessLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <div className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-purple-800">
          ❤️ Student Wellness Center
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('student')}
            className={`px-4 py-2 rounded-lg transition ${
              viewMode === 'student'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-purple-600 border border-purple-300'
            }`}
          >
            Student View
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setViewMode('counselor')}
              className={`px-4 py-2 rounded-lg transition ${
                viewMode === 'counselor'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-purple-600 border border-purple-300'
              }`}
            >
              Counselor Dashboard
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      ) : viewMode === 'student' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Wellness Score Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Your Wellness Score</h3>
            {wellnessData ? (
              <div className="text-center">
                <div className={`text-6xl font-bold ${getWellnessColor(wellnessData.score)}`}>
                  {wellnessData.score}
                </div>
                <div className="text-2xl mt-2 text-gray-600">
                  {getWellnessLabel(wellnessData.score)}
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-gray-600">Attendance</div>
                    <div className="text-xl font-bold text-blue-600">
                      {wellnessData.breakdown?.attendance_score || 0}
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-gray-600">Mood</div>
                    <div className="text-xl font-bold text-green-600">
                      {wellnessData.breakdown?.mood_score || 0}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded">
                    <div className="text-gray-600">Engagement</div>
                    <div className="text-xl font-bold text-purple-600">
                      {wellnessData.breakdown?.engagement_score || 0}
                    </div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded">
                    <div className="text-gray-600">Overall</div>
                    <div className="text-xl font-bold text-orange-600">
                      {wellnessData.breakdown?.overall_health || 0}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500">No wellness data available</p>
            )}
          </div>

          {/* Mood Check-in Card */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">How are you feeling today?</h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {Object.entries(moodEmojis).map(([mood, emoji]) => (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`p-4 text-4xl rounded-lg transition transform hover:scale-110 ${
                    selectedMood === mood
                      ? 'bg-purple-100 ring-4 ring-purple-400'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  title={mood}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {selectedMood && (
              <div className="mb-4">
                <textarea
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="Want to share more? (optional)"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400"
                  rows="3"
                />
              </div>
            )}
            <button
              onClick={submitMoodCheckIn}
              disabled={!selectedMood}
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              Submit Check-in
            </button>
          </div>

          {/* Mood Log History */}
          <div className="md:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Your Mood History</h3>
            {moodLog.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {moodLog.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-3xl">{moodEmojis[entry.mood] || '😐'}</div>
                    <div className="flex-1">
                      <div className="font-medium capitalize">{entry.mood}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                      {entry.notes && (
                        <div className="text-sm text-gray-600 mt-1">{entry.notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">No mood entries yet. Start logging!</p>
            )}
          </div>
        </div>
      ) : (
        /* Counselor Dashboard */
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-800">
            High Priority Wellness Alerts
          </h3>
          {alerts.length > 0 ? (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="border-l-4 border-red-500 bg-red-50 p-4 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-lg text-gray-800">
                        Student ID: {alert.student_id}
                      </div>
                      <div className="text-red-700 font-medium mt-1">
                        {alert.reason || 'Wellness concern detected'}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        Severity: <span className="font-medium uppercase">{alert.severity}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Triggered: {new Date(alert.triggered_at).toLocaleString()}
                      </div>
                      {alert.wellness_score && (
                        <div className="text-sm text-gray-600 mt-1">
                          Wellness Score: <span className="font-bold">{alert.wellness_score}</span>
                        </div>
                      )}
                    </div>
                    {!alert.resolved && (
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">✅</div>
              <div className="text-xl">No high-priority alerts at this time</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WellnessCounselorPanel;
