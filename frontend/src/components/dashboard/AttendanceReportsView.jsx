import { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  Mail,
  RefreshCw,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';
import { getInitials, isoToDmyDate } from '../../utils/attendanceDateUtils';

const FILTER_TABS = [
  { id: 'ALL', label: 'All Students' },
  { id: 'SHORTAGE', label: 'Shortage (<75%)' },
  { id: 'SATISFACTORY', label: 'Safe (>=75%)' },
];

const formatPeriodDate = (isoOrStr) => isoToDmyDate(isoOrStr) || String(isoOrStr || '').trim() || '—';

export function AttendanceReportsHeaderAction({
  printReport,
  exportReportToCSV,
  downloadReportPDF,
  handleSendAbsenteeAlerts,
  reportData,
  isSendingAlerts,
}) {
  const students = Array.isArray(reportData?.students) ? reportData.students : [];
  const hasStudents = students.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={exportReportToCSV}
        className="bg-gradient-btn"
        style={{ padding: '9px 15px', borderRadius: '9px', display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.86rem' }}
        disabled={!hasStudents}
      >
        <FileSpreadsheet size={16} />
        CSV
      </button>
      <button
        type="button"
        onClick={downloadReportPDF}
        className="bg-gradient-btn"
        style={{ padding: '9px 15px', borderRadius: '9px', display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.86rem', background: 'linear-gradient(135deg, #80602c 0%, #61471e 100%)', borderColor: '#80602c' }}
        disabled={!hasStudents}
      >
        <FileDown size={16} />
        PDF
      </button>
      <button
        type="button"
        onClick={printReport}
        className="btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.86rem' }}
        disabled={!hasStudents}
      >
        <Printer size={16} />
        Print
      </button>
      <button
        type="button"
        onClick={handleSendAbsenteeAlerts}
        className="btn-danger"
        style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.86rem', padding: '9px 15px', borderRadius: '9px' }}
        disabled={isSendingAlerts || !hasStudents}
      >
        <Mail size={16} />
        {isSendingAlerts ? 'Sending...' : 'Send Alerts'}
      </button>
    </>
  );
}

/**
 * Attendance Reports & Analytics View (Golden Gate OS Master-Detail Design)
 * Clean main single-line student directory opening dedicated Student Detail (#/reports/<id>)
 * and Controls & Exports (#/reports/controls) pages with zero visual clutter.
 */
export default function AttendanceReportsView({
  reportStartDate,
  setReportStartDate,
  reportEndDate,
  setReportEndDate,
  reportDeptFilter,
  setReportDeptFilter,
  selectedReportSubjectId,
  setSelectedReportSubjectId,
  reportData,
  isLoadingReport,
  departments = [],
  subjects = [],
  stats = null,
  fetchReport,
  printReport,
  exportReportToCSV,
  downloadReportPDF,
  handleSendAbsenteeAlerts,
  isSendingAlerts = false,
  reportAlertMsg,
  setReportAlertMsg,
  routeView = null,
  setRouteView = null,
  onCloseSubView = null,
}) {
  const { userRole } = useAuth();
  const { playCyberSound } = useUI();

  const [localRoute, setLocalRoute] = useState(null);
  const activeRoute = routeView !== undefined && setRouteView ? routeView : localRoute;

  const navigateRoute = (next) => {
    if (playCyberSound) playCyberSound('click');
    if (setRouteView) setRouteView(next);
    else setLocalRoute(next);
  };

  const handleBack = () => {
    if (onCloseSubView) {
      onCloseSubView();
      return;
    }
    navigateRoute(null);
  };

  const students = useMemo(
    () => (Array.isArray(reportData?.students) ? reportData.students : []),
    [reportData]
  );
  const totalWorkingDays = (reportData && reportData.total_working_days) || 0;

  const [attendanceFilterPill, setAttendanceFilterPill] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const availableSubjects = useMemo(() => {
    if (userRole === 'admin') {
      return reportDeptFilter
        ? subjects.filter((s) => String(s.department || '').trim().toLowerCase() === String(reportDeptFilter).trim().toLowerCase())
        : subjects;
    }
    // Backend /subjects already scopes Teacher to owned + active substitute subjects
    return subjects;
  }, [userRole, subjects, reportDeptFilter]);

  const shortageCount = useMemo(
    () => students.filter((s) => s.low_attendance || Number(s.percentage) < 75).length,
    [students]
  );
  const safeCount = students.length - shortageCount;

  const avgPresence = useMemo(() => {
    if (students.length === 0) return '0.0';
    const sum = students.reduce((acc, s) => acc + Number(s.percentage || 0), 0);
    return (sum / students.length).toFixed(1);
  }, [students]);

  const displayedStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      const isLow = Boolean(s.low_attendance || Number(s.percentage) < 75);
      if (attendanceFilterPill === 'SHORTAGE' && !isLow) return false;
      if (attendanceFilterPill === 'SATISFACTORY' && isLow) return false;
      if (!q) return true;
      const hay = [s.name, s.roll, s.dep].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [students, attendanceFilterPill, searchQuery]);

  const selectedDetailStudent = useMemo(() => {
    if (activeRoute?.mode !== 'detail') return null;
    return (
      activeRoute.item ||
      students.find((s) => String(s.id) === String(activeRoute.id)) ||
      null
    );
  }, [activeRoute, students]);

  const peakDayLabel = useMemo(() => {
    if (!stats?.weekly_trends?.length) return 'N/A';
    const sorted = [...stats.weekly_trends].sort((a, b) => Number(b.present || 0) - Number(a.present || 0));
    const top = sorted[0];
    return top ? `${top.day} (${top.present})` : 'N/A';
  }, [stats]);

  const topBranchLabel = useMemo(() => {
    if (!stats?.department_stats) return reportDeptFilter || 'All Branches';
    const keys = Object.keys(stats.department_stats);
    if (keys.length === 0) return reportDeptFilter || 'All Branches';
    return keys.reduce((best, cur) => {
      const a = stats.department_stats[best];
      const b = stats.department_stats[cur];
      const countA = a && typeof a === 'object' ? Number(a.present || 0) : Number(a || 0);
      const countB = b && typeof b === 'object' ? Number(b.present || 0) : Number(b || 0);
      return countB > countA ? cur : best;
    });
  }, [stats, reportDeptFilter]);

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '11px',
    border: '1px solid #dfd0ae',
    background: '#fffdf9',
    color: '#25231f',
    fontSize: '0.86rem',
    fontWeight: 500,
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.73rem',
    fontWeight: 700,
    color: '#6b5b3e',
    marginBottom: '5px',
  };

  const primaryGoldBtnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    padding: '9px 15px',
    borderRadius: '11px',
    border: '1px solid #91671a',
    background: 'linear-gradient(135deg, #b8892c, #8a6016)',
    color: '#ffffff',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(145, 103, 26, 0.2)',
  };

  const secondaryBtnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '9px 13px',
    borderRadius: '11px',
    border: '1px solid #dfd0ae',
    background: '#fffcf5',
    color: '#4f3a18',
    fontSize: '0.82rem',
    fontWeight: 700,
    cursor: 'pointer',
  };

  const renderToast = () => {
    if (!reportAlertMsg) return null;
    const isErr = reportAlertMsg.type !== 'success';
    return (
      <div
        role="status"
        className="hide-on-print"
        style={{
          padding: '10px 14px',
          borderRadius: '12px',
          background: isErr ? '#fef2f2' : '#ecfdf5',
          border: `1px solid ${isErr ? '#fecaca' : '#a7f3d0'}`,
          color: isErr ? '#b91c1c' : '#047857',
          fontSize: '0.82rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {isErr ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{reportAlertMsg.text}</span>
        </div>
        {setReportAlertMsg && (
          <button
            type="button"
            onClick={() => setReportAlertMsg(null)}
            aria-label="Dismiss report alert"
            style={{ border: 0, background: 'transparent', color: 'inherit', fontWeight: 800, cursor: 'pointer' }}
          >
            ×
          </button>
        )}
      </div>
    );
  };

  const renderPrintOnlyBlock = () => (
    <div className="print-only-block" style={{ display: 'none', textAlign: 'center', marginBottom: '24px' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#000', marginBottom: '6px' }}>ACADEMIC ATTENDANCE REPORT</h1>
      <p style={{ color: '#374151', fontSize: '0.9rem' }}>
        Period: <strong>{formatPeriodDate(reportStartDate)}</strong> to <strong>{formatPeriodDate(reportEndDate)}</strong> | Working Days: {totalWorkingDays}
      </p>
      <table className="custom-table print-table" style={{ width: '100%', marginTop: '16px', textAlign: 'left' }}>
        <thead>
          <tr>
            <th>Roll</th>
            <th>Name</th>
            <th>Branch</th>
            <th>Attended</th>
            <th>Rate</th>
          </tr>
        </thead>
        <tbody>
          {displayedStudents.map((st) => (
            <tr key={st.id}>
              <td>{st.roll}</td>
              <td>{st.name}</td>
              <td>{st.dep}</td>
              <td>{st.present_days} / {st.total_days}</td>
              <td>{st.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ── 1. CLEAN MAIN REPORTS LANDING VIEW (#/reports) ───────────────────────────
  if (!activeRoute) {
    return (
      <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {renderToast()}

        {/* Minimal Search & Controls Header Bar */}
        <div className="hide-on-print" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 190px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c734b' }}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, roll, or branch..."
              aria-label="Search report students"
              style={{ ...inputStyle, paddingLeft: '36px' }}
            />
          </div>
          <button
            type="button"
            style={secondaryBtnStyle}
            onClick={() => { if (playCyberSound) playCyberSound('click'); fetchReport(true); }}
            disabled={isLoadingReport}
            title="Refresh report from server"
          >
            <RefreshCw size={14} className={isLoadingReport ? 'spin' : ''} />
            <span>{isLoadingReport ? 'Syncing' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            style={primaryGoldBtnStyle}
            onClick={() => navigateRoute({ mode: 'controls' })}
          >
            <SlidersHorizontal size={14} />
            <span>Controls & Export</span>
          </button>
        </div>

        {/* Single-Line Filter Chips */}
        <div className="golden-os-pill-row hide-on-print" style={{ flexWrap: 'wrap' }}>
          {FILTER_TABS.map((tab) => {
            const count = tab.id === 'ALL' ? students.length : tab.id === 'SHORTAGE' ? shortageCount : safeCount;
            return (
              <button
                key={tab.id}
                type="button"
                className={`golden-os-chip ${attendanceFilterPill === tab.id ? 'active' : ''}`}
                onClick={() => { if (playCyberSound) playCyberSound('click'); setAttendanceFilterPill(tab.id); }}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Single-Line Scannable Student Rows */}
        {isLoadingReport && students.length === 0 ? (
          <div className="golden-os-inset-card hide-on-print" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <Users size={28} color="#9c8b6e" />
            <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.9rem' }}>Loading student report...</span>
          </div>
        ) : displayedStudents.length === 0 ? (
          <div className="golden-os-inset-card hide-on-print" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <Users size={28} color="#9c8b6e" />
            <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>No students match this filter</span>
            <span style={{ fontSize: '0.78rem', color: '#6b5b3e' }}>
              Adjust date range or branch in Controls & Export to inspect other records.
            </span>
          </div>
        ) : (
          <div className="golden-os-list-shell hide-on-print">
            {displayedStudents.map((student) => {
              const isLow = Boolean(student.low_attendance || Number(student.percentage) < 75);
              return (
                <button
                  key={student.id}
                  type="button"
                  className="golden-os-list-row"
                  onClick={() => navigateRoute({ mode: 'detail', id: student.id, item: student })}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div
                      className="golden-os-avatar"
                      style={
                        isLow
                          ? { background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }
                          : undefined
                      }
                    >
                      {getInitials(student.name)}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: '#25231f',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {student.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: '#6b5b3e',
                          fontWeight: 500,
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        Roll {student.roll || '—'} · {student.dep || 'Unassigned'} · {student.present_days}/{student.total_days} days
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span
                      style={{
                        padding: '3px 9px',
                        borderRadius: '999px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        background: isLow ? '#fef2f2' : '#ecfdf5',
                        color: isLow ? '#b91c1c' : '#047857',
                        border: `1px solid ${isLow ? '#fecaca' : '#a7f3d0'}`,
                      }}
                    >
                      {student.percentage}%
                    </span>
                    <ChevronRight size={16} color="#8c734b" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {renderPrintOnlyBlock()}
      </div>
    );
  }

  // ── 2. DEDICATED CONTROLS, ANALYTICS & EXPORTS PAGE (#/reports/controls) ─────
  if (activeRoute.mode === 'controls') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {renderToast()}
        {renderPrintOnlyBlock()}

        <div className="golden-os-window hide-on-print">
          <div className="golden-os-titlebar">
            <div className="golden-os-titlebar-left">
              <div className="golden-os-traffic" aria-hidden="true">
                <span className="golden-os-dot golden-os-dot-close" />
                <span className="golden-os-dot golden-os-dot-min" />
                <span className="golden-os-dot golden-os-dot-zoom" />
              </div>
              <span className="golden-os-title-label">Filters, Analytics & Exports</span>
            </div>
            <span className="golden-os-status-pill is-ready">
              {isLoadingReport ? 'Syncing...' : `${students.length} Students`}
            </span>
          </div>

          <div className="golden-os-body">
            {/* Summary Metrics */}
            <div className="golden-os-kpi-strip">
              <div className="golden-os-kpi-tile is-compact">
                <div className="golden-os-kpi-value">{students.length}</div>
                <div className="golden-os-kpi-label">Students</div>
              </div>
              <div className="golden-os-kpi-tile is-compact">
                <div className="golden-os-kpi-value" style={{ color: shortageCount > 0 ? '#b91c1c' : '#25231f' }}>
                  {shortageCount}
                </div>
                <div className="golden-os-kpi-label">Shortage</div>
              </div>
              <div className="golden-os-kpi-tile is-compact">
                <div className="golden-os-kpi-value" style={{ color: '#047857' }}>{avgPresence}%</div>
                <div className="golden-os-kpi-label">Avg Rate</div>
              </div>
              <div className="golden-os-kpi-tile is-compact">
                <div className="golden-os-kpi-value">{totalWorkingDays}</div>
                <div className="golden-os-kpi-label">Days</div>
              </div>
            </div>

            {/* Organized Parameters Form */}
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Report Parameters</div>
              <div className="golden-os-fields-2">
                <div>
                  <label style={labelStyle} htmlFor="rep-start-date">Start Date</label>
                  <input
                    id="rep-start-date"
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="rep-end-date">End Date</label>
                  <input
                    id="rep-end-date"
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                {userRole === 'admin' && (
                  <div>
                    <label style={labelStyle} htmlFor="rep-dept-filter">Department / Branch</label>
                    <select
                      id="rep-dept-filter"
                      value={reportDeptFilter}
                      onChange={(e) => {
                        setReportDeptFilter(e.target.value);
                        setSelectedReportSubjectId('');
                      }}
                      style={inputStyle}
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label style={labelStyle} htmlFor="rep-subject-filter">Subject</label>
                  <select
                    id="rep-subject-filter"
                    value={selectedReportSubjectId}
                    onChange={(e) => setSelectedReportSubjectId(e.target.value)}
                    disabled={userRole === 'teacher' && availableSubjects.length <= 1}
                    style={inputStyle}
                  >
                    {userRole === 'admin' && <option value="">All Subjects</option>}
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={primaryGoldBtnStyle}
                  onClick={async () => {
                    if (playCyberSound) playCyberSound('click');
                    await fetchReport(true);
                    handleBack();
                  }}
                >
                  <RefreshCw size={14} className={isLoadingReport ? 'spin' : ''} />
                  <span>{isLoadingReport ? 'Updating...' : 'Apply & View List'}</span>
                </button>
              </div>
            </div>

            {/* Institutional Insights */}
            <div className="golden-os-list-shell">
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b5b3e' }}>Peak Attendance Day</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#047857' }}>{peakDayLabel}</span>
              </div>
              <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b5b3e' }}>Top Performing Branch</span>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#25231f' }}>{topBranchLabel}</span>
              </div>
            </div>

            {/* Export & Alert Actions */}
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Exports & Notifications</div>
              <div className="golden-os-list-shell">
                <button type="button" className="golden-os-list-row" onClick={exportReportToCSV} disabled={students.length === 0}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileSpreadsheet size={17} color="#047857" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#25231f' }}>Export Spreadsheet (CSV)</span>
                  </div>
                  <ChevronRight size={16} color="#8c734b" />
                </button>
                <button type="button" className="golden-os-list-row" onClick={downloadReportPDF} disabled={students.length === 0}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileDown size={17} color="#785927" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#25231f' }}>Download Certified PDF Report</span>
                  </div>
                  <ChevronRight size={16} color="#8c734b" />
                </button>
                <button type="button" className="golden-os-list-row" onClick={printReport} disabled={students.length === 0}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Printer size={17} color="#4f3a18" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#25231f' }}>Print Official Statement</span>
                  </div>
                  <ChevronRight size={16} color="#8c734b" />
                </button>
                <button
                  type="button"
                  className="golden-os-list-row"
                  onClick={handleSendAbsenteeAlerts}
                  disabled={isSendingAlerts || students.length === 0}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Mail size={17} color="#b91c1c" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#b91c1c' }}>
                      {isSendingAlerts ? 'Dispatching Absentee Alerts...' : 'Send Absentee Warning Alerts'}
                    </span>
                  </div>
                  <ChevronRight size={16} color="#b91c1c" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. DEDICATED STUDENT REPORT DETAIL PAGE (#/reports/<studentId>) ─────────
  const isDetailLow = Boolean(
    selectedDetailStudent &&
      (selectedDetailStudent.low_attendance || Number(selectedDetailStudent.percentage) < 75)
  );

  return (
    <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {renderToast()}
      {renderPrintOnlyBlock()}

      <div className="golden-os-window hide-on-print">
        <div className="golden-os-titlebar">
          <div className="golden-os-titlebar-left">
            <div className="golden-os-traffic" aria-hidden="true">
              <span className="golden-os-dot golden-os-dot-close" />
              <span className="golden-os-dot golden-os-dot-min" />
              <span className="golden-os-dot golden-os-dot-zoom" />
            </div>
            <span className="golden-os-title-label">
              {selectedDetailStudent?.name || 'Student Attendance Report'}
            </span>
          </div>
          {selectedDetailStudent && (
            <span
              className={`golden-os-status-pill ${isDetailLow ? 'is-pending' : 'is-ready'}`}
              style={isDetailLow ? { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' } : undefined}
            >
              {isDetailLow ? 'Shortage (<75%)' : 'Safe Standing'}
            </span>
          )}
        </div>

        <div className="golden-os-body">
          {!selectedDetailStudent ? (
            <div className="golden-os-inset-card" style={{ padding: '28px 16px', textAlign: 'center', gap: '8px' }}>
              <div style={{ fontWeight: 700, color: '#2b2112' }}>Student report record not found</div>
              <button type="button" style={secondaryBtnStyle} onClick={handleBack}>Done</button>
            </div>
          ) : (
            <>
              <div className="golden-os-hero">
                <div
                  className="golden-os-app-icon"
                  style={isDetailLow ? { background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' } : undefined}
                >
                  {getInitials(selectedDetailStudent.name)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#25231f' }}>
                    {selectedDetailStudent.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6b5b3e', fontWeight: 600 }}>
                    Roll #{selectedDetailStudent.roll || '—'} · {selectedDetailStudent.dep || 'Unassigned'}
                  </div>
                </div>
              </div>

              <div className="golden-os-kpi-strip">
                <div className="golden-os-kpi-tile is-compact">
                  <div className="golden-os-kpi-value">{selectedDetailStudent.present_days}</div>
                  <div className="golden-os-kpi-label">Attended</div>
                </div>
                <div className="golden-os-kpi-tile is-compact">
                  <div className="golden-os-kpi-value">{selectedDetailStudent.total_days}</div>
                  <div className="golden-os-kpi-label">Days</div>
                </div>
                <div className="golden-os-kpi-tile is-compact">
                  <div
                    className="golden-os-kpi-value"
                    style={{ color: isDetailLow ? '#b91c1c' : '#047857' }}
                  >
                    {selectedDetailStudent.percentage}%
                  </div>
                  <div className="golden-os-kpi-label">Rate</div>
                </div>
              </div>

              <div className="golden-os-list-shell">
                {[
                  { label: 'Student ID', value: `#${selectedDetailStudent.id}` },
                  { label: 'Roll Number', value: selectedDetailStudent.roll || '—' },
                  { label: 'Department', value: selectedDetailStudent.dep || 'Unassigned' },
                  { label: 'Report Period', value: `${formatPeriodDate(reportStartDate)} – ${formatPeriodDate(reportEndDate)}` },
                  { label: 'Compliance Status', value: isDetailLow ? 'Below 75% Mandatory Minimum' : 'Meets 75%+ Requirement' },
                  { label: 'Email', value: selectedDetailStudent.email || 'Not registered' },
                ].map((row) => (
                  <div key={row.label} className="golden-os-list-row" style={{ cursor: 'default' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b5b3e' }}>{row.label}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#25231f', textAlign: 'right' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedDetailStudent.email && (
                    <a
                      href={`mailto:${selectedDetailStudent.email}?subject=Attendance%20Report%20Notice%20-%20${encodeURIComponent(selectedDetailStudent.name)}&body=Dear%20${encodeURIComponent(selectedDetailStudent.name)},%0A%0AYour%20attendance%20rate%20for%20${encodeURIComponent(selectedDetailStudent.dep || 'your branch')}%20is%20currently%20${selectedDetailStudent.percentage}%25%20(${selectedDetailStudent.present_days}/${selectedDetailStudent.total_days}%20days).`}
                      style={{
                        ...secondaryBtnStyle,
                        borderColor: isDetailLow ? '#fecaca' : '#dfd0ae',
                        color: isDetailLow ? '#b91c1c' : '#4f3a18',
                        background: isDetailLow ? '#fef2f2' : '#fffcf5',
                        textDecoration: 'none',
                      }}
                    >
                      <Mail size={14} />
                      <span>{isDetailLow ? 'Warning Email' : 'Email Student'}</span>
                    </a>
                  )}
                  <button
                    type="button"
                    style={secondaryBtnStyle}
                    onClick={handleSendAbsenteeAlerts}
                    disabled={isSendingAlerts}
                  >
                    <AlertTriangle size={14} />
                    <span>{isSendingAlerts ? 'Sending...' : 'Queue Warning Alert'}</span>
                  </button>
                  <button type="button" style={secondaryBtnStyle} onClick={downloadReportPDF}>
                    <FileDown size={14} />
                    <span>PDF</span>
                  </button>
                </div>
                <button type="button" style={secondaryBtnStyle} onClick={handleBack}>
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
