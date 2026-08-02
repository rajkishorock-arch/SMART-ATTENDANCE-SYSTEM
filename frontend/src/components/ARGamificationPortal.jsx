/**
 * ARGamificationPortal.jsx
 * Feature 40: AR Attendance Overlay + Gamification Combined Portal
 *
 * Combines:
 *  • AR camera overlay — point phone at classroom, see floating name badges + status over each face
 *  • Live gamification feed — streaks, badge unlocks, leaderboard
 *  • Real-time WebSocket updates
 *  • Student engagement score
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera, Award, Zap, Trophy, Star, TrendingUp, Users,
  Crown, Flame, Target, Eye, RefreshCw, Play, Square
} from 'lucide-react';

const API    = import.meta.env.VITE_API_URL || '';
const WS_URL = API.replace(/^http/, 'ws');

function apiFetch(path, token, opts = {}) {
  return fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts.headers },
  }).then(r => r.json());
}

// ── AR Overlay Component ──────────────────────────────────────────────────────

function AROverlay({ token, institutionId }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const timerRef   = useRef(null);

  const [active, setActive]         = useState(false);
  const [results, setResults]       = useState([]);
  const [status, setStatus]         = useState('idle');   // idle | running | error
  const [frameCount, setFrameCount] = useState(0);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      setStatus('running');
      startRecognitionLoop();
    } catch (e) {
      setStatus('error');
      console.error('Camera access failed:', e);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(false);
    setStatus('idle');
    setResults([]);
  };

  const startRecognitionLoop = () => {
    timerRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width  = video.videoWidth  || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const form = new FormData();
        form.append('file', blob, 'frame.jpg');
        try {
          const res = await fetch(`${API}/api/v1/attendance/recognize-frame`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form,
          });
          const data = await res.json();
          if (data.results) {
            setResults(data.results);
            setFrameCount(n => n + 1);
            // Draw AR overlays on canvas
            drawAROverlays(ctx, data.results, canvas.width, canvas.height);
          }
        } catch (e) {
          // silent — network hiccup
        }
      }, 'image/jpeg', 0.85);
    }, 2000); // scan every 2 seconds
  };

  const drawAROverlays = (ctx, faces, w, h) => {
    // Re-draw video frame
    if (videoRef.current) ctx.drawImage(videoRef.current, 0, 0, w, h);

    faces.forEach(face => {
      const [x, y, fw, fh] = face.box || [0, 0, 0, 0];
      const isNew = face.newly_marked;
      const color = isNew ? '#00ff88' : '#22d3ee';

      // Bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, fw, fh);

      // Corner decorators (AR style)
      const cs = 14; // corner size
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      // TL
      ctx.beginPath(); ctx.moveTo(x, y + cs); ctx.lineTo(x, y); ctx.lineTo(x + cs, y); ctx.stroke();
      // TR
      ctx.beginPath(); ctx.moveTo(x + fw - cs, y); ctx.lineTo(x + fw, y); ctx.lineTo(x + fw, y + cs); ctx.stroke();
      // BL
      ctx.beginPath(); ctx.moveTo(x, y + fh - cs); ctx.lineTo(x, y + fh); ctx.lineTo(x + cs, y + fh); ctx.stroke();
      // BR
      ctx.beginPath(); ctx.moveTo(x + fw - cs, y + fh); ctx.lineTo(x + fw, y + fh); ctx.lineTo(x + fw, y + fh - cs); ctx.stroke();

      // Name badge
      const badgeH = 28, badgeY = y - badgeH - 4;
      const name   = face.name || 'Unknown';
      const conf   = face.confidence ? `${face.confidence.toFixed(0)}%` : '';

      ctx.fillStyle = color + 'cc';
      ctx.beginPath();
      ctx.roundRect(x, Math.max(0, badgeY), fw, badgeH, 6);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.font      = 'bold 13px sans-serif';
      ctx.fillText(name, x + 6, Math.max(18, badgeY + 18));
      ctx.font      = '11px sans-serif';
      ctx.fillStyle = '#000000aa';
      ctx.fillText(conf + (isNew ? ' ✓' : ' ↺'), x + fw - 50, Math.max(18, badgeY + 18));
    });
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <div style={{ background: '#111827', borderRadius: '16px', overflow: 'hidden', border: '1px solid #1e293b' }}>
      {/* AR Camera */}
      <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3', maxHeight: '360px' }}>
        <video
          ref={videoRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0 }}
          playsInline muted
        />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {!active && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px',
          }}>
            <Camera size={48} color="#334155" />
            <span style={{ color: '#475569', fontSize: '14px' }}>
              {status === 'error' ? 'Camera access denied' : 'AR Camera inactive'}
            </span>
          </div>
        )}

        {/* Live indicator */}
        {active && (
          <div style={{
            position: 'absolute', top: '12px', left: '12px',
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#00000088', borderRadius: '20px', padding: '4px 12px',
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
            <span style={{ color: '#fff', fontSize: '12px', fontWeight: '600' }}>LIVE AR</span>
            <span style={{ color: '#94a3b8', fontSize: '11px' }}>Frame #{frameCount}</span>
          </div>
        )}

        {/* Face count badge */}
        {active && results.length > 0 && (
          <div style={{
            position: 'absolute', top: '12px', right: '12px',
            background: '#22d3ee22', border: '1px solid #22d3ee44',
            borderRadius: '20px', padding: '4px 12px',
          }}>
            <span style={{ color: '#22d3ee', fontSize: '12px', fontWeight: '700' }}>
              {results.length} face{results.length !== 1 ? 's' : ''} detected
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ padding: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        {!active ? (
          <button
            onClick={startCamera}
            style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
              background: '#22d3ee', color: '#000', fontWeight: '700', fontSize: '14px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <Play size={16} /> Start AR Scanner
          </button>
        ) : (
          <button
            onClick={stopCamera}
            style={{
              flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
              background: '#ef4444', color: '#fff', fontWeight: '700', fontSize: '14px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <Square size={16} /> Stop Scanner
          </button>
        )}
      </div>

      {/* Recent detections */}
      {results.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>
            LAST SCAN RESULTS
          </div>
          {results.map((r, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 10px', borderRadius: '8px',
              background: r.newly_marked ? '#00ff8811' : '#1e293b',
              marginBottom: '4px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: r.newly_marked ? '#4ade80' : '#94a3b8' }}>
                {r.name}
              </span>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                <span style={{ color: '#64748b' }}>{r.roll}</span>
                <span style={{ color: r.newly_marked ? '#4ade80' : '#22d3ee', fontWeight: '600' }}>
                  {r.newly_marked ? '✓ Marked' : 'Already in'}
                </span>
                <span style={{ color: '#475569' }}>{r.confidence?.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Live Gamification Feed ────────────────────────────────────────────────────

function GamificationFeed({ token, userRole }) {
  const [leaderboard, setLeaderboard]   = useState([]);
  const [myProfile,   setMyProfile]     = useState(null);
  const [liveEvents,  setLiveEvents]    = useState([]);
  const [loading,     setLoading]       = useState(true);
  const wsRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const tasks = [apiFetch('/api/v1/gamification/leaderboard?limit=10', token)];
      if (userRole === 'student') {
        tasks.push(apiFetch('/api/v1/gamification/my-profile', token));
      }
      const [lb, profile] = await Promise.all(tasks);
      setLeaderboard(lb.leaderboard || []);
      if (profile) setMyProfile(profile);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, userRole]);

  // WebSocket for live events
  useEffect(() => {
    const wsUrl = `${WS_URL}/api/v1/live/ws?token=${token}`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.event === 'attendance_marked') {
            setLiveEvents(prev => [
              { ...data, id: Date.now() },
              ...prev.slice(0, 9),
            ]);
            // Reload leaderboard periodically
            setTimeout(loadData, 500);
          }
        } catch (_) {}
      };

      ws.onclose = () => {};
    } catch (_) {}

    return () => { wsRef.current?.close(); };
  }, [token, loadData]);

  useEffect(() => { loadData(); }, [loadData]);

  const RANK_COLORS = ['#f59e0b', '#94a3b8', '#cd7c4e'];
  const RANK_ICONS  = [Crown, Trophy, Award];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* My Profile Card (students only) */}
      {myProfile && (
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b, #111827)',
          borderRadius: '16px', padding: '20px',
          border: '1px solid #4f46e544',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: '#f59e0b22', border: '2px solid #f59e0b',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px',
            }}>
              🏆
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#f1f5f9' }}>
                {myProfile.name}
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                Roll: {myProfile.roll}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#f59e0b' }}>
                {(myProfile.points || 0).toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>points</div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            {[
              { icon: Flame,   label: 'Streak',  val: `${myProfile.streak_days}d`,    color: '#f97316' },
              { icon: Trophy,  label: 'Best',    val: `${myProfile.longest_streak}d`, color: '#f59e0b' },
              { icon: Star,    label: 'Badges',  val: myProfile.badges_count,          color: '#8b5cf6' },
            ].map(({ icon: Icon, label, val, color }) => (
              <div key={label} style={{
                flex: 1, background: '#0f172a', borderRadius: '10px', padding: '10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              }}>
                <Icon size={16} color={color} />
                <span style={{ fontSize: '16px', fontWeight: '700', color }}>{val}</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Badges */}
          {myProfile.badges?.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {myProfile.badges.map(b => (
                <span key={b.key} style={{
                  padding: '4px 10px', borderRadius: '12px',
                  background: '#f59e0b22', border: '1px solid #f59e0b44',
                  fontSize: '12px', color: '#f59e0b',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  {b.emoji} {b.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Live Event Feed */}
      {liveEvents.length > 0 && (
        <div style={{ background: '#111827', borderRadius: '16px', padding: '16px', border: '1px solid #1e293b' }}>
          <div style={{ fontSize: '13px', color: '#22d3ee', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} /> LIVE FEED
          </div>
          {liveEvents.map(ev => (
            <div key={ev.id} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '6px 0', borderBottom: '1px solid #1e293b',
              animation: 'fadeIn 0.3s ease',
            }}>
              <span style={{ fontSize: '13px', color: '#e2e8f0' }}>
                <b style={{ color: '#22d3ee' }}>{ev.name}</b> marked present
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{ev.timestamp}</span>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <div style={{ background: '#111827', borderRadius: '16px', padding: '16px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={16} color="#f59e0b" /> Leaderboard
          </h3>
          <button
            onClick={loadData}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div style={{ color: '#64748b', fontSize: '13px' }}>Loading…</div>
        ) : leaderboard.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '13px' }}>
            No leaderboard data yet. Attendance marks will populate this.
          </div>
        ) : (
          leaderboard.map((entry, i) => {
            const RankIcon = RANK_ICONS[i] || Target;
            const rankColor = RANK_COLORS[i] || '#334155';
            const isFirst = i === 0;

            return (
              <div key={entry.student_id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px', borderRadius: '10px', marginBottom: '6px',
                background: isFirst ? '#f59e0b11' : '#0f172a',
                border: `1px solid ${isFirst ? '#f59e0b33' : '#1e293b'}`,
              }}>
                {/* Rank */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: `${rankColor}22`, border: `1px solid ${rankColor}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {i < 3
                    ? <RankIcon size={16} color={rankColor} />
                    : <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>#{entry.rank}</span>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {entry.roll} &nbsp;•&nbsp; {entry.dep} &nbsp;•&nbsp;
                    <Flame size={10} style={{ display: 'inline', verticalAlign: 'middle' }} color="#f97316" /> {entry.streak}d
                  </div>
                </div>

                {/* Points */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: rankColor }}>
                    {entry.points.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569' }}>pts</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main Portal ───────────────────────────────────────────────────────────────

export default function ARGamificationPortal({ token, userRole, institutionId }) {
  const [activeTab, setActiveTab] = useState('gamification'); // ar | gamification

  const tabs = [
    { key: 'gamification', label: 'Gamification',   icon: Trophy },
    { key: 'ar',           label: 'AR Scanner',     icon: Camera },
  ];

  return (
    <div style={{ padding: '20px', background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b22, #22d3ee22)',
            border: '1px solid #f59e0b44',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Star size={22} color="#f59e0b" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#f1f5f9' }}>
              AR + Gamification Portal
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
              AR attendance overlay &amp; real-time engagement tracking
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                background: active ? '#22d3ee' : '#111827',
                color: active ? '#000' : '#64748b',
                fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'ar' && (
        <AROverlay token={token} institutionId={institutionId} />
      )}
      {activeTab === 'gamification' && (
        <GamificationFeed token={token} userRole={userRole} />
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:none} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
