import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const DEFAULT_BACKEND = (import.meta.env.VITE_API_URL || 'https://smart-attendance-system-1-mvwa.onrender.com/api/v1').replace(/\/api\/v1\/?$/, '');

const ARGamificationPortal = ({ user, apiBaseUrl }) => {
  const [activeTab, setActiveTab] = useState('leaderboard'); // 'leaderboard', 'badges', 'ar-scanner'
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // AR Scanner state
  const [arMode, setArMode] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const API_BASE = apiBaseUrl ? apiBaseUrl.replace(/\/api\/v1\/?$/, '') : DEFAULT_BACKEND;

  useEffect(() => {
    if (user?.institution_id) {
      loadLeaderboard();
      loadMyStats();
      loadBadges();
    }
  }, [user]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/gamification/leaderboard/${user.institution_id}?limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/gamification/stats/${user.institution_id}/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadBadges = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/gamification/badges/${user.institution_id}/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBadges(response.data.badges || []);
    } catch (error) {
      console.error('Failed to load badges:', error);
    }
  };

  const startARScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setArMode(true);
      }
    } catch (error) {
      alert('Camera access denied or not available: ' + error.message);
    }
  };

  const stopARScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setArMode(false);
    setScanResult(null);
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/attendance/mark`,
        {
          institution_id: user.institution_id,
          image: imageData.split(',')[1], // Remove data:image/jpeg;base64,
          location: 'AR Scanner',
          metadata: { ar_mode: true }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setScanResult({
        success: true,
        student: response.data.student_name || 'Unknown',
        message: 'Attendance marked via AR! 🎯',
        points: response.data.points_earned || 10
      });
      
      // Reload stats after successful scan
      setTimeout(() => {
        loadMyStats();
        loadLeaderboard();
      }, 1000);
      
    } catch (error) {
      setScanResult({
        success: false,
        message: error.response?.data?.detail || 'Face not recognized. Try again!'
      });
    }
  };

  const getBadgeEmoji = (badgeName) => {
    const emojiMap = {
      'perfect_week': '🌟',
      'early_bird': '🐦',
      'consistent': '💎',
      'streak_master': '🔥',
      'punctual': '⏰',
      'dedicated': '🏆',
      'champion': '👑',
      'rising_star': '⭐'
    };
    return emojiMap[badgeName] || '🎖️';
  };

  const getRankEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="p-6 bg-gradient-to-br from-yellow-50 via-purple-50 to-pink-50 rounded-lg">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
          🏆 AR + Gamification Portal
        </h2>
        <p className="text-gray-600 mt-2">Scan classroom with AR & compete on the leaderboard!</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === 'leaderboard'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white text-purple-600 border border-purple-300'
          }`}
        >
          🏆 Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === 'badges'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white text-purple-600 border border-purple-300'
          }`}
        >
          🎖️ My Badges
        </button>
        <button
          onClick={() => setActiveTab('ar-scanner')}
          className={`px-6 py-3 rounded-lg font-medium transition whitespace-nowrap ${
            activeTab === 'ar-scanner'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white text-purple-600 border border-purple-300'
          }`}
        >
          📱 AR Scanner
        </button>
      </div>

      {/* My Stats Banner */}
      {myStats && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 mb-6 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{myStats.points || 0}</div>
              <div className="text-sm opacity-90">Points</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{myStats.streak || 0}</div>
              <div className="text-sm opacity-90">Day Streak 🔥</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{myStats.rank || 'N/A'}</div>
              <div className="text-sm opacity-90">Rank</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{badges.length}</div>
              <div className="text-sm opacity-90">Badges</div>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      ) : activeTab === 'leaderboard' ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold mb-4 text-gray-800">Top Students</h3>
          {leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((entry, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-4 p-4 rounded-lg transition hover:shadow-md ${
                    entry.student_id === user.id
                      ? 'bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-400'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="text-3xl font-bold w-16 text-center">
                    {getRankEmoji(entry.rank)}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg text-gray-800">
                      {entry.student_name}
                      {entry.student_id === user.id && (
                        <span className="ml-2 text-sm text-purple-600">(You)</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Roll: {entry.roll_number}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">
                      {entry.points} pts
                    </div>
                    <div className="text-sm text-gray-600">
                      {entry.streak} 🔥 streak
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No leaderboard data yet</p>
          )}
        </div>
      ) : activeTab === 'badges' ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold mb-4 text-gray-800">Your Achievements</h3>
          {badges.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {badges.map((badge, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg p-4 text-center border-2 border-yellow-300 hover:shadow-lg transition transform hover:scale-105"
                >
                  <div className="text-5xl mb-2">{getBadgeEmoji(badge.badge_name)}</div>
                  <div className="font-bold text-gray-800 capitalize">
                    {badge.badge_name.replace(/_/g, ' ')}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Earned: {new Date(badge.earned_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🎖️</div>
              <div className="text-xl">No badges earned yet</div>
              <div className="text-sm mt-2">Keep attending to unlock achievements!</div>
            </div>
          )}
        </div>
      ) : (
        /* AR Scanner */
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold mb-4 text-gray-800">AR Attendance Scanner</h3>
          
          {!arMode ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📱</div>
              <p className="text-gray-600 mb-6">
                Use your phone camera to scan your face and mark attendance with AR overlay!
              </p>
              <button
                onClick={startARScanner}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold text-lg hover:shadow-xl transition transform hover:scale-105"
              >
                Start AR Scanner
              </button>
            </div>
          ) : (
            <div>
              <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  className="w-full h-auto"
                  autoPlay
                  playsInline
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* AR Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 right-4 bg-purple-600 bg-opacity-80 text-white p-3 rounded-lg">
                    <div className="font-bold">AR Mode Active</div>
                    <div className="text-sm">Position your face in the frame</div>
                  </div>
                  
                  {/* Face frame guide */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-4 border-purple-400 rounded-full opacity-50"></div>
                </div>
              </div>

              {scanResult && (
                <div
                  className={`p-4 rounded-lg mb-4 ${
                    scanResult.success
                      ? 'bg-green-100 border-2 border-green-400'
                      : 'bg-red-100 border-2 border-red-400'
                  }`}
                >
                  <div className={`font-bold ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {scanResult.message}
                  </div>
                  {scanResult.success && (
                    <div className="text-sm text-gray-700 mt-1">
                      Student: {scanResult.student} | +{scanResult.points} points earned!
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={captureAndScan}
                  className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                >
                  📸 Capture & Mark Attendance
                </button>
                <button
                  onClick={stopARScanner}
                  className="px-6 py-4 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
                >
                  Stop
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ARGamificationPortal;
