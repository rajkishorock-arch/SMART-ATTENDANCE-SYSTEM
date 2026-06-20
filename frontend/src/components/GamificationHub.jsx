import { Flame, Trophy, Star, Target, Zap } from 'lucide-react';
import {
  calculateStreak,
  calculateXP,
  getAttendanceRate,
  getBadges,
  getWeeklyChallenge,
} from '../utils/gamification';

const TIER_COLORS = {
  bronze: '#cd7f32',
  silver: '#94a3b8',
  gold: '#f59e0b',
  platinum: '#a78bfa',
};

export default function GamificationHub({ logs = [] }) {
  const streak = calculateStreak(logs);
  const rate = getAttendanceRate(logs);
  const { xp, level, progress } = calculateXP(logs, streak);
  const badges = getBadges(logs, streak, rate);
  const challenge = getWeeklyChallenge(logs);

  return (
    <div className="gamification-hub">
      <div className="gamification-header">
        <h3>
          <Trophy size={20} style={{ color: '#f59e0b' }} />
          Achievement Hub
        </h3>
        <span className="gamification-level-badge">LVL {level}</span>
      </div>

      <div className="gamification-stats-row">
        <div className="gamification-stat-card">
          <Flame size={22} style={{ color: streak > 0 ? '#f59e0b' : '#6b7280' }} />
          <div>
            <p className="gamification-stat-value">{streak}</p>
            <p className="gamification-stat-label">Day Streak</p>
          </div>
        </div>
        <div className="gamification-stat-card">
          <Zap size={22} style={{ color: '#00f2fe' }} />
          <div>
            <p className="gamification-stat-value">{xp}</p>
            <p className="gamification-stat-label">Total XP</p>
          </div>
        </div>
        <div className="gamification-stat-card">
          <Star size={22} style={{ color: '#a78bfa' }} />
          <div>
            <p className="gamification-stat-value">{badges.length}</p>
            <p className="gamification-stat-label">Badges</p>
          </div>
        </div>
      </div>

      <div className="gamification-xp-bar">
        <div className="gamification-xp-label">
          <span>Level Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="gamification-xp-track">
          <div className="gamification-xp-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="gamification-challenge">
        <div className="gamification-challenge-header">
          <Target size={16} style={{ color: challenge.complete ? '#10b981' : '#00f2fe' }} />
          <span>{challenge.title}</span>
          {challenge.complete && <span className="gamification-challenge-done">✓ DONE</span>}
        </div>
        <div className="gamification-challenge-bar">
          <div
            className="gamification-challenge-fill"
            style={{ width: `${Math.min(100, (challenge.current / challenge.target) * 100)}%` }}
          />
        </div>
        <p className="gamification-challenge-meta">
          {challenge.current}/{challenge.target} classes this week · {challenge.reward}
        </p>
      </div>

      <div className="gamification-badges-section">
        <h4>Unlocked Badges ({badges.length})</h4>
        {badges.length === 0 ? (
          <p className="gamification-empty">Attendance mark karo aur badges unlock karo!</p>
        ) : (
          <div className="gamification-badges-grid">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="gamification-badge"
                style={{ borderColor: `${TIER_COLORS[badge.tier]}40` }}
                title={badge.desc}
              >
                <span className="gamification-badge-icon">{badge.icon}</span>
                <span className="gamification-badge-name">{badge.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
