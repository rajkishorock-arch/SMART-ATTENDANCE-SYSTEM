const PRESENT_STATUSES = ['Present', 'Late'];

function parseLogDate(log) {
  const parts = (log.date || '').split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T${log.time || '00:00'}`);
  }
  return new Date(`${log.date}T${log.time || '00:00'}`);
}

function isPresent(log) {
  return PRESENT_STATUSES.includes(log.attendance);
}

export function calculateStreak(logs) {
  if (!logs?.length) return 0;

  const presentDates = new Set(
    logs
      .filter(isPresent)
      .map((l) => l.date)
  );

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    if (presentDates.has(key)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function calculateXP(logs, streak) {
  const presentCount = logs.filter(isPresent).length;
  const level = Math.floor(presentCount / 5) + 1;
  const xp = presentCount * 10 + streak * 15 + level * 25;
  const nextLevelXp = level * 50;
  const progress = Math.min(100, ((xp % nextLevelXp) / nextLevelXp) * 100);
  return { xp, level, progress, nextLevelXp };
}

export function getAttendanceRate(logs) {
  if (!logs?.length) return 0;
  return (logs.filter(isPresent).length / logs.length) * 100;
}

export function getBadges(logs, streak, rate) {
  const presentCount = logs.filter(isPresent).length;
  const badges = [];

  if (presentCount >= 1) {
    badges.push({ id: 'first', name: 'First Check-In', desc: 'First attendance marked', icon: '🎯', tier: 'bronze' });
  }
  if (streak >= 3) {
    badges.push({ id: 'streak3', name: '3-Day Flame', desc: 'Present 3 days in a row', icon: '🔥', tier: 'bronze' });
  }
  if (streak >= 7) {
    badges.push({ id: 'streak7', name: 'Week Warrior', desc: '7-day attendance streak', icon: '⚡', tier: 'silver' });
  }
  if (streak >= 14) {
    badges.push({ id: 'streak14', name: 'Fortnight Hero', desc: '14 days unstoppable streak', icon: '💎', tier: 'gold' });
  }
  if (rate >= 75) {
    badges.push({ id: 'safe', name: 'Safe Zone', desc: '75%+ attendance', icon: '🛡️', tier: 'silver' });
  }
  if (rate >= 90) {
    badges.push({ id: 'elite', name: 'Neural Elite', desc: '90%+ attendance', icon: '🧠', tier: 'gold' });
  }
  if (rate >= 95) {
    badges.push({ id: 'legend', name: 'Campus Legend', desc: '95%+ attendance', icon: '👑', tier: 'platinum' });
  }
  if (presentCount >= 30) {
    badges.push({ id: 'veteran', name: 'Veteran', desc: '30+ classes attended', icon: '🏆', tier: 'gold' });
  }

  const earlyBird = logs.some((l) => {
    if (!isPresent(l) || !l.time) return false;
    const [h] = l.time.split(':').map(Number);
    return h < 9;
  });
  if (earlyBird) {
    badges.push({ id: 'early', name: 'Early Bird', desc: 'Check-in before 9 AM', icon: '🌅', tier: 'silver' });
  }

  return badges;
}

export function getWeeklyChallenge(logs) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const recentLogs = logs.filter((l) => parseLogDate(l) >= weekAgo);
  const presentThisWeek = recentLogs.filter(isPresent).length;
  const target = 5;
  return {
    title: 'Weekly Presence Challenge',
    current: presentThisWeek,
    target,
    complete: presentThisWeek >= target,
    reward: '+50 XP bonus',
  };
}
