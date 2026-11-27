import { useState, useMemo } from 'react';
import { Download, Search, BookOpen, Calendar, ChevronLeft, ChevronRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';
import {
  normalizeToIsoDate,
  formatFriendlyDateHeading,
  getInitials,
  getLogUniqueKey,
  findLogByRouteId,
  extractPeriodNumber,
} from '../../utils/attendanceDateUtils';

export function AttendanceRegistersHeaderAction() {
  return null;
}

const getStatusBadgeColors = (rawAttendance) => {
  const s = String(rawAttendance || '').toLowerCase();
  if (s === 'present') {
    return {
      label: 'Present',
      bg: 'rgba(5, 150, 105, 0.1)',
      color: '#047857',
      border: 'rgba(5, 150, 105, 0.25)',
    };
  }
  if (s === 'late') {
    return {
      label: 'Late',
      bg: 'rgba(217, 119, 6, 0.12)',
      color: '#b45309',
      border: 'rgba(217, 119, 6, 0.28)',
    };
  }
  return {
    label: rawAttendance || 'Absent',
    bg: '#fef2f2',
    color: '#dc2626',
    border: '#fecaca',
  };
};

const formatVerificationLabel = (log, isPresentOrLate) => {
  const raw = log?.verification_method || log?.marked_by;
  if (!raw) return isPresentOrLate ? 'Face Recognition' : 'Unmarked';
  const cleaned = String(raw).trim();
  if (!cleaned) return isPresentOrLate ? 'Face Recognition' : 'Unmarked';
  return cleaned
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

const computePeakScanHour = (logs) => {
  if (!logs || logs.length === 0) return '--';
  const hours = logs
    .map(l => {
      if (!l || !l.time) return null;
      const t = String(l.time).trim();
      const pMatch = t.match(/Period\s*(\d+)/i);
      if (pMatch) {
        const pNum = parseInt(pMatch[1], 10);
        if (!Number.isNaN(pNum) && pNum >= 1 && pNum <= 8) return 8 + pNum;
      }
      const parts = t.split(':');
      if (parts.length > 0) {
        const rawHr = parseInt(parts[0], 10);
        if (!Number.isNaN(rawHr)) {
          let hr = rawHr;
          if (t.toLowerCase().includes('pm') && hr < 12) hr += 12;
          if (t.toLowerCase().includes('am') && hr === 12) hr = 0;
          return hr;
        }
      }
      return null;
    })
    .filter(h => h !== null && !Number.isNaN(h));

  if (hours.length === 0) return '--';
  const counts = hours.reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {});
  const peak = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b));
  const peakHourNum = parseInt(peak, 10);
  if (Number.isNaN(peakHourNum)) return '--';
  const ampm = peakHourNum >= 12 ? 'PM' : 'AM';
  const dispHour = peakHourNum % 12 === 0 ? 12 : peakHourNum % 12;
  return `${dispHour}:00 ${ampm}`;
};

export default function AttendanceRegistersView({
  logSearch,
  setLogSearch,
  logDeptFilter,
  setLogDeptFilter,
  logDateFilter,
  setLogDateFilter,
  quickFilterStatus,
  setQuickFilterStatus,
  selectedAuditLog,
  setSelectedAuditLog,
  routeLogId = null,
  onCloseSubView,
  filteredLogs = [],
  departments = [],
  subjects = [],
  exportToCSV,
  shiftDate,
  getPeriodSlotLabel,
  onRefresh,
}) {
  const { userRole, currentUser } = useAuth();
  const { playCyberSound } = useUI();
  const [periodFilter, setPeriodFilter] = useState('');

  const resolvedDetailLog =
    selectedAuditLog ||
    (routeLogId != null ? findLogByRouteId(filteredLogs, routeLogId) : null) ||
    null;

  const visibleLogs = useMemo(() => {
    if (!periodFilter) return filteredLogs;
    const targetNum = extractPeriodNumber(periodFilter);
    return filteredLogs.filter(l => {
      const slot = l.period || l.time || '';
      return slot === periodFilter || (targetNum < 99 && extractPeriodNumber(slot) === targetNum);
    });
  }, [filteredLogs, periodFilter]);

  const dateGroups = useMemo(() => {
    const groups = [];
    const byIso = new Map();
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    visibleLogs.forEach((log, idx) => {
      const iso = normalizeToIsoDate(log?.date) || 'unknown';
      if (!byIso.has(iso)) {
        const entry = {
          iso,
          heading: formatFriendlyDateHeading(log?.date, todayIso),
          items: [],
        };
        byIso.set(iso, entry);
        groups.push(entry);
      }
      byIso.get(iso).items.push({ log, idx });
    });
    return groups;
  }, [visibleLogs]);

  const totalLogsCount = visibleLogs.length;
  const presentLogsCount = visibleLogs.filter(l => {
    const st = String(l.attendance || '').toLowerCase();
    return st === 'present' || st === 'late';
  }).length;
  const presenceRateLogs = totalLogsCount > 0 ? Math.round((presentLogsCount / totalLogsCount) * 100) : 0;
  const peakScanHour = computePeakScanHour(visibleLogs);

  const openLogDetail = (log) => {
    if (playCyberSound) playCyberSound('click');
    setSelectedAuditLog(log);
  };

  const closeDetail = () => {
    if (onCloseSubView) {
      onCloseSubView();
    } else {
      setSelectedAuditLog(null);
    }
  };

  /* ===== DEDICATED ATTENDANCE RECORD DETAIL PAGE ===== */
  if (resolvedDetailLog) {
    const statusLower = String(resolvedDetailLog.attendance || '').toLowerCase();
    const isPresentOrLate = statusLower === 'present' || statusLower === 'late';
    const badge = getStatusBadgeColors(resolvedDetailLog.attendance);
    const subjectName =
      resolvedDetailLog.subject_name ||
      subjects.find(s => s.id === resolvedDetailLog.subject_id)?.name ||
      currentUser?.details?.subject_name ||
      'General Attendance';
    const methodLabel = formatVerificationLabel(resolvedDetailLog, isPresentOrLate);
    const displayRecordId = resolvedDetailLog.record_id != null
      ? `#${resolvedDetailLog.record_id}`
      : `#${resolvedDetailLog.id}`;

    return (
      <div key="logs-detail-view" className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
          {/* Student Identity Card */}
          <div className="golden-os-form-section" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 200px' }}>
              <div className="golden-os-avatar" style={{ width: '44px', height: '44px', fontSize: '0.96rem' }}>
                {getInitials(resolvedDetailLog.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#25231f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {resolvedDetailLog.name || 'Student'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b5b3e', fontWeight: 600 }}>
                  Roll: {resolvedDetailLog.roll || 'N/A'}{resolvedDetailLog.department ? ` · ${resolvedDetailLog.department}` : ''}
                </div>
              </div>
            </div>

            <span style={{
              padding: '5px 11px',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: 700,
              background: badge.bg,
              color: badge.color,
              border: `1px solid ${badge.border}`,
            }}>
              {badge.label}
            </span>
          </div>

          {/* Structured Record Details */}
          <div className="golden-os-form-section" style={{ gap: '8px' }}>
            <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={13} />
              <span>Attendance Record Details</span>
            </div>

            {[
              { label: 'Record ID', value: displayRecordId, mono: true },
              { label: 'Roll Number', value: resolvedDetailLog.roll || '—' },
              { label: 'Department', value: resolvedDetailLog.department || '—' },
              { label: 'Subject', value: subjectName },
              { label: 'Date', value: resolvedDetailLog.date || '—' },
              { label: 'Time', value: resolvedDetailLog.time || '—' },
              { label: 'Period', value: getPeriodSlotLabel ? getPeriodSlotLabel(resolvedDetailLog.period || resolvedDetailLog.time) : (resolvedDetailLog.period || '—') },
              { label: 'Verification', value: methodLabel },
            ].map((row, idx, arr) => (
              <div
                key={row.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: idx < arr.length - 1 ? '1px solid #f2ead9' : 'none',
                  fontSize: '0.85rem',
                  gap: '10px',
                }}
              >
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>{row.label}</span>
                <span style={{
                  color: '#25231f',
                  fontWeight: 700,
                  textAlign: 'right',
                  fontFamily: row.mono ? 'monospace' : 'inherit',
                  wordBreak: 'break-word',
                }}>
                  {row.value}
                </span>
              </div>
            ))}

            {(resolvedDetailLog.fallback_reason || resolvedDetailLog.remarks) && (
              <div style={{ marginTop: '4px', padding: '10px 12px', borderRadius: '10px', background: '#faf8f2', border: '1px solid #ede4d2', fontSize: '0.82rem', color: '#4a3d28' }}>
                <strong>Note:</strong> {resolvedDetailLog.fallback_reason || resolvedDetailLog.remarks}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={closeDetail}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== MAIN GOLDEN GATE ATTENDANCE LOGS LIST (Date-Wise Newest First + Clean 1-Line Rows) ===== */
  return (
    <div key="logs-list-view" className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
        {/* Compact KPI Strip */}
        <div className="golden-os-kpi-strip">
          <div className="golden-os-kpi-tile">
            <span className="golden-os-kpi-value" style={{ color: '#6e4e1c' }}>{totalLogsCount}</span>
            <span className="golden-os-kpi-label">Records</span>
          </div>
          <div className="golden-os-kpi-tile">
            <span className="golden-os-kpi-value" style={{ color: '#047857' }}>{presenceRateLogs}%</span>
            <span className="golden-os-kpi-label">Presence</span>
          </div>
          <div className="golden-os-kpi-tile">
            <span className="golden-os-kpi-value" style={{ color: '#4a3d28', fontSize: '0.96rem' }}>{peakScanHour}</span>
            <span className="golden-os-kpi-label">Peak Hour</span>
          </div>
        </div>

        {/* Organized Instant Client-Side Filter Controls */}
        <div className="golden-os-form-section" style={{ gap: '10px' }}>
          {/* Row 1: Search + Refresh + Export CSV */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 160px', minWidth: '140px' }}>
              <input
                type="search"
                className="form-input"
                aria-label="Search attendance logs"
                placeholder="Search name, roll, or subject..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                style={{ paddingLeft: '36px', background: '#ffffff', width: '100%', boxSizing: 'border-box' }}
              />
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
            </div>

            {onRefresh && (
              <button
                type="button"
                aria-label="Refresh attendance logs"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  onRefresh();
                }}
                className="golden-os-feedback-filter-btn"
                style={{ width: '40px', height: '40px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
                title="Refresh logs"
              >
                <RefreshCw size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (playCyberSound) playCyberSound('click');
                exportToCSV();
              }}
              disabled={!visibleLogs || visibleLogs.length === 0}
              className="golden-os-feedback-filter-btn"
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                opacity: visibleLogs.length > 0 ? 1 : 0.55,
              }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Row 2: Department + Period */}
          <div className="golden-os-fields-2" style={{ gap: '8px' }}>
            {userRole === 'admin' ? (
              <select
                className="form-input"
                aria-label="Filter by department"
                value={logDeptFilter}
                onChange={e => setLogDeptFilter(e.target.value)}
                style={{ background: '#ffffff', height: '40px' }}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            ) : (
              <div style={{
                padding: '8px 12px',
                background: '#faf5ea',
                border: '1px solid #e7dac0',
                borderRadius: '10px',
                color: '#6e4e1c',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                height: '40px',
                boxSizing: 'border-box',
              }}>
                <BookOpen size={14} />
                <span>{currentUser?.details?.subject_code || 'Assigned Subject'}</span>
              </div>
            )}

            <select
              className="form-input"
              aria-label="Filter logs by period"
              value={periodFilter}
              onChange={e => setPeriodFilter(e.target.value)}
              style={{ background: '#ffffff', height: '40px' }}
            >
              <option value="">All Periods</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <option key={n} value={`Period ${n}`}>Period {n}</option>
              ))}
            </select>
          </div>

          {/* Row 3: Date Picker + Quick All Dates Reset */}
          <div className="date-picker-row" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => { if (playCyberSound) playCyberSound('click'); shiftDate(logDateFilter, -1, setLogDateFilter); }}
              className="golden-os-feedback-filter-btn"
              style={{ width: '36px', minWidth: '36px', height: '40px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              className="form-input flex-input"
              aria-label="Filter by date"
              value={logDateFilter}
              onChange={e => setLogDateFilter(e.target.value)}
              style={{ flex: 1, minWidth: 0, background: '#ffffff', height: '40px', padding: '0 8px', fontSize: '0.82rem', margin: 0 }}
            />
            <button
              type="button"
              aria-label="Next day"
              onClick={() => { if (playCyberSound) playCyberSound('click'); shiftDate(logDateFilter, 1, setLogDateFilter); }}
              className="golden-os-feedback-filter-btn"
              style={{ width: '36px', minWidth: '36px', height: '40px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}
            >
              <ChevronRight size={16} />
            </button>
            {logDateFilter && (
              <button
                type="button"
                onClick={() => { if (playCyberSound) playCyberSound('click'); setLogDateFilter(''); }}
                className="golden-os-feedback-filter-btn"
                style={{ height: '40px', padding: '0 10px', borderRadius: '10px', fontSize: '0.74rem', whiteSpace: 'nowrap' }}
              >
                All Dates
              </button>
            )}
          </div>

          {/* Row 4: Concise Status Pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'present', label: 'Present' },
              { key: 'late', label: 'Late' },
              { key: 'absent', label: 'Absent' },
            ].map(st => {
              const active = quickFilterStatus === st.key;
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => {
                    if (playCyberSound) playCyberSound('click');
                    setQuickFilterStatus(st.key);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '999px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: active ? '1px solid #785927' : '1px solid #e4d8bd',
                    background: active ? '#785927' : '#ffffff',
                    color: active ? '#ffffff' : '#6b5b3e',
                  }}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date-Wise Grouped Logs (Newest Date on Top, Older Dates Below) */}
        {visibleLogs.length === 0 ? (
          <div className="golden-os-inset-card" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <Calendar size={28} style={{ color: '#9c8b6e' }} />
            <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>No attendance logs found</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dateGroups.map(group => (
              <div key={group.iso} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="golden-os-section-label" style={{ marginBottom: 0, padding: '0 4px' }}>
                  <span>{group.heading}</span>
                </div>
                <div className="golden-os-list-shell">
                  {group.items.map(({ log, idx }) => {
                    const statusText = String(log.attendance || 'Present');
                    const isPresent = statusText.toLowerCase() === 'present';
                    const isLate = statusText.toLowerCase() === 'late';
                    const statusColor = isPresent ? '#047857' : isLate ? '#b45309' : '#dc2626';
                    const periodInfo = log.period || log.time || '';
                    const subMetaParts = [
                      log.roll ? `Roll ${log.roll}` : '',
                      periodInfo,
                      log.subject_name || '',
                    ].filter(Boolean);
                    return (
                      <button
                        key={getLogUniqueKey(log, idx)}
                        type="button"
                        className="golden-os-list-row"
                        onClick={() => openLogDetail(log)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                          <div className="golden-os-avatar">{getInitials(log.name)}</div>
                          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{
                              fontSize: '0.92rem',
                              fontWeight: 700,
                              color: '#25231f',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {log.name || 'Student'}{' '}
                              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: statusColor }}>
                                · {statusText}
                              </span>
                            </span>
                            {subMetaParts.length > 0 && (
                              <span style={{
                                fontSize: '0.74rem',
                                color: '#6b5b3e',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}>
                                {subMetaParts.join(' · ')}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} color="#8c734b" style={{ flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
