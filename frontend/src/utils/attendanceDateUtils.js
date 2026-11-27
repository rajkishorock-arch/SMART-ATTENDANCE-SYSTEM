/**
 * Shared date, period, and log normalization helpers used across
 * Attendance Logs, Session History, and App filtering/sorting.
 */

export function normalizeToIsoDate(rawDate) {
  const s = String(rawDate || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const slash = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slash) {
    const [, dd, mm, yyyy] = slash;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return s;
}

export function isoToDmyDate(isoDate) {
  const iso = normalizeToIsoDate(isoDate);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(isoDate || '').trim();
}

export function extractPeriodNumber(periodOrTime) {
  const t = String(periodOrTime || '').trim();
  const pMatch = t.match(/Period\s*(\d+)/i);
  if (pMatch) {
    const n = parseInt(pMatch[1], 10);
    return Number.isNaN(n) ? 99 : n;
  }
  const timeMatch = t.match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    let hr = parseInt(timeMatch[1], 10);
    if (t.toLowerCase().includes('pm') && hr < 12) hr += 12;
    if (t.toLowerCase().includes('am') && hr === 12) hr = 0;
    if (!Number.isNaN(hr)) {
      if (hr < 10) return 1;
      if (hr <= 15) return hr - 8;
      return 8;
    }
  }
  return 99;
}

export function shortPeriodBadge(periodOrTime) {
  const num = extractPeriodNumber(periodOrTime);
  return num >= 1 && num <= 20 ? `P${num}` : 'S';
}

export function parseTimeSeconds(periodOrTime) {
  const t = String(periodOrTime || '').trim();
  if (!t) return 0;
  if (/period/i.test(t)) {
    const p = extractPeriodNumber(t);
    return p < 99 ? (8 + p) * 3600 : 0;
  }
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return 0;
  let hr = parseInt(m[1], 10);
  const min = parseInt(m[2], 10) || 0;
  const sec = parseInt(m[3] || '0', 10) || 0;
  if (t.toLowerCase().includes('pm') && hr < 12) hr += 12;
  if (t.toLowerCase().includes('am') && hr === 12) hr = 0;
  return hr * 3600 + min * 60 + sec;
}

export function compareAttendanceLogsNewestFirst(a, b) {
  const isoA = normalizeToIsoDate(a?.date);
  const isoB = normalizeToIsoDate(b?.date);
  if (isoA !== isoB) return isoB.localeCompare(isoA);
  const timeDiff = parseTimeSeconds(b?.time || b?.period) - parseTimeSeconds(a?.time || a?.period);
  if (timeDiff !== 0) return timeDiff;
  return Number(b?.record_id || 0) - Number(a?.record_id || 0);
}

export function compareSessionsNewestFirst(a, b) {
  const isoA = normalizeToIsoDate(a?.date);
  const isoB = normalizeToIsoDate(b?.date);
  if (isoA !== isoB) return isoB.localeCompare(isoA);
  return extractPeriodNumber(a?.period) - extractPeriodNumber(b?.period);
}

export function getInitials(name, fallback = 'ST') {
  const cleaned = String(name || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  const parts = (cleaned || String(name || '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim())
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getLogUniqueKey(log, idx = 0) {
  if (!log) return `log_${idx}`;
  if (log.record_id != null) return `rec_${log.record_id}`;
  return `row_${String(log.id || 'x')}_${normalizeToIsoDate(log.date)}_${String(log.time || '')}_${String(log.subject_id || '')}_${idx}`;
}

export function getLogRouteId(log) {
  if (!log) return null;
  if (log.record_id != null) return String(log.record_id);
  return log.id != null ? String(log.id) : null;
}

export function findLogByRouteId(logsList, routeId) {
  if (!Array.isArray(logsList) || routeId == null) return null;
  const target = String(routeId);
  return (
    logsList.find(l => l.record_id != null && String(l.record_id) === target) ||
    logsList.find(l => l.id != null && String(l.id) === target) ||
    null
  );
}

export function formatFriendlyDateHeading(rawDate, todayIso) {
  const iso = normalizeToIsoDate(rawDate);
  if (!iso) return rawDate || 'Unknown Date';
  if (todayIso && iso === todayIso) return `Today · ${isoToDmyDate(iso)}`;
  if (todayIso) {
    const tDate = new Date(`${todayIso}T00:00:00`);
    const yDate = new Date(tDate.getTime() - 86400000);
    const yIso = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;
    if (iso === yIso) return `Yesterday · ${isoToDmyDate(iso)}`;
  }
  return isoToDmyDate(iso);
}

export function filterActiveStudentLogs(logsList, activeStudents) {
  if (!Array.isArray(logsList)) return [];
  if (!Array.isArray(activeStudents) || activeStudents.length === 0) return logsList;
  const activeIds = new Set(activeStudents.map(s => String(s.id)));
  const activeRolls = new Set(
    activeStudents.map(s => String(s.roll || '').trim().toLowerCase()).filter(Boolean)
  );
  return logsList.filter(log => {
    const rawId = String(log?.id || '').trim();
    const baseId = rawId.split('_')[0];
    const roll = String(log?.roll || '').trim().toLowerCase();
    return activeIds.has(rawId) || activeIds.has(baseId) || (roll && activeRolls.has(roll));
  });
}

export function applyOptimisticSessionToggle(prevHistory, studentId, nextStatus, dateVal, periodVal) {
  if (!Array.isArray(prevHistory)) return prevHistory;
  return prevHistory.map(sess => {
    if (sess.date === dateVal && sess.period === periodVal) {
      const updatedStudents = (sess.students || []).map(st =>
        st.id === studentId ? { ...st, status: nextStatus } : st
      );
      const present_count = updatedStudents.filter(st => st.status === 'Present').length;
      const absent_count = updatedStudents.filter(st => st.status === 'Absent').length;
      return { ...sess, present_count, absent_count, students: updatedStudents };
    }
    return sess;
  });
}
