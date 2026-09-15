import { BookOpen, FileSpreadsheet, FileDown, Mail, Users, AlertCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';

export function AttendanceReportsHeaderAction({
  printReport,
  exportReportToCSV,
  downloadReportPDF,
  handleSendAbsenteeAlerts,
  reportData,
  isSendingAlerts,
}) {
  return (
    <>
      <button 
        onClick={printReport}
        className="btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
        disabled={reportData.students.length === 0}
      >
        <BookOpen size={18} />
        Print Report
      </button>
      <button 
        onClick={exportReportToCSV}
        className="bg-gradient-btn"
        style={{ padding: '10px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
        disabled={reportData.students.length === 0}
      >
        <FileSpreadsheet size={18} />
        Export CSV
      </button>
      <button 
        onClick={downloadReportPDF}
        className="bg-gradient-btn"
        style={{ padding: '10px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', borderColor: '#0284c7' }}
        disabled={reportData.students.length === 0}
      >
        <FileDown size={18} />
        Download PDF
      </button>
      <button 
        onClick={handleSendAbsenteeAlerts}
        className="btn-danger"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', padding: '10px 18px', borderRadius: '8px' }}
        disabled={isSendingAlerts}
      >
        <Mail size={18} />
        {isSendingAlerts ? 'Sending Alerts...' : 'Send Absentee Alerts'}
      </button>
    </>
  );
}

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
  departments,
  subjects,
  stats,
  fetchReport,
  printReport,
  shiftDate,
}) {
  const { userRole, currentUser } = useAuth();
  const { playCyberSound } = useUI();

  return (
    <div className="reports-section mobile-tab-panel reports-panel" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Filter Bar */}
      <div className="glass-panel hide-on-print" style={{ padding: '24px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: '#9ca3af' }}>Select Report Parameters</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px', textAlign: 'left' }}>
            <label className="form-label">Start Date</label>
            <div className="date-picker-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <button
                type="button"
                onClick={() => { playCyberSound('click'); shiftDate(reportStartDate, -1, setReportStartDate); }}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  padding: '0',
                  width: '38px',
                  minWidth: '38px',
                  maxWidth: '38px',
                  flex: '0 0 38px',
                  flexShrink: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  height: '42px',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                title="Previous Day"
              >
                ◀
              </button>
              <input 
                type="date" 
                className="form-input flex-input" 
                value={reportStartDate} 
                onChange={e => setReportStartDate(e.target.value)} 
                style={{ height: '42px', margin: 0, flex: 1, minWidth: 0, boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => { playCyberSound('click'); shiftDate(reportStartDate, 1, setReportStartDate); }}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  padding: '0',
                  width: '38px',
                  minWidth: '38px',
                  maxWidth: '38px',
                  flex: '0 0 38px',
                  flexShrink: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  height: '42px',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                title="Next Day"
              >
                ▶
              </button>
            </div>
          </div>
          <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '180px', textAlign: 'left' }}>
            <label className="form-label">End Date</label>
            <div className="date-picker-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              <button
                type="button"
                onClick={() => { playCyberSound('click'); shiftDate(reportEndDate, -1, setReportEndDate); }}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  padding: '0',
                  width: '38px',
                  minWidth: '38px',
                  maxWidth: '38px',
                  flex: '0 0 38px',
                  flexShrink: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  height: '42px',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                title="Previous Day"
              >
                ◀
              </button>
              <input 
                type="date" 
                className="form-input flex-input" 
                value={reportEndDate} 
                onChange={e => setReportEndDate(e.target.value)} 
                style={{ height: '42px', margin: 0, flex: 1, minWidth: 0, boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => { playCyberSound('click'); shiftDate(reportEndDate, 1, setReportEndDate); }}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  padding: '0',
                  width: '38px',
                  minWidth: '38px',
                  maxWidth: '38px',
                  flex: '0 0 38px',
                  flexShrink: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  height: '42px',
                  boxSizing: 'border-box'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 242, 254, 0.1)'; e.currentTarget.style.color = '#00f2fe'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                title="Next Day"
              >
                ▶
              </button>
            </div>
          </div>
          {userRole === 'admin' ? (
            <>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
                <label className="form-label">Department</label>
                <select 
                  className="form-input" 
                  value={reportDeptFilter} 
                  onChange={e => { setReportDeptFilter(e.target.value); setSelectedReportSubjectId(''); }}
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '220px' }}>
                <label className="form-label">Subject</label>
                <select 
                  className="form-input" 
                  value={selectedReportSubjectId} 
                  onChange={e => setSelectedReportSubjectId(e.target.value)}
                >
                  <option value="">All Subjects</option>
                  {(reportDeptFilter 
                    ? subjects.filter(s => s.department === reportDeptFilter) 
                    : subjects
                  ).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
            </>
          ) : userRole === 'teacher' ? (
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '220px' }}>
              <label className="form-label">Subject</label>
              <select 
                className="form-input" 
                value={selectedReportSubjectId} 
                onChange={e => setSelectedReportSubjectId(e.target.value)}
                style={{ cursor: 'default' }}
                disabled={true}
              >
                {subjects.filter(s => s.teacher_id === currentUser?.details?.id).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          ) : null}
          <button 
            onClick={fetchReport} 
            className="bg-gradient-btn" 
            style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 600, height: '46px' }}
          >
            Regenerate
          </button>
          {reportData.students.length > 0 && (
            <button 
              onClick={() => printReport()} 
              className="btn-secondary" 
              style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 600, height: '46px' }}
            >
              <FileDown size={18} /> Print Report
            </button>
          )}
        </div>
      </div>

      {/* Print Header (Visible ONLY on print) */}
      <div className="print-only-block" style={{ display: 'none', textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#000', marginBottom: '8px' }}>ACADEMIC ATTENDANCE REPORT</h1>
        <p style={{ color: '#374151', fontSize: '0.95rem' }}>
          Report Period: <strong>{new Date(reportStartDate).toLocaleDateString()}</strong> to <strong>{new Date(reportEndDate).toLocaleDateString()}</strong>
        </p>
        {reportDeptFilter && (
          <p style={{ color: '#374151', fontSize: '0.95rem', marginTop: '4px' }}>
            Department: <strong>{reportDeptFilter}</strong>
          </p>
        )}
        {selectedReportSubjectId && (
          <p style={{ color: '#374151', fontSize: '0.95rem', marginTop: '4px' }}>
            Subject: <strong>
              {subjects.find(s => s.id === parseInt(selectedReportSubjectId))?.name || ''} ({subjects.find(s => s.id === parseInt(selectedReportSubjectId))?.code || ''})
            </strong>
          </p>
        )}
        <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '8px' }}>
          Total System Academic Days: {reportData.total_working_days} | Generated on {new Date().toLocaleDateString()}
        </p>
        <hr style={{ border: 'none', borderTop: '2px solid #000', marginTop: '20px' }} />
      </div>

      {/* Summary Analytics Cards */}
      <div className="dashboard-grid hide-on-print">
        <div className="glass-panel metric-card" style={{ animationDelay: '100ms' }}>
          <div className="metric-info">
            <h3>Scanned Students</h3>
            <p>{reportData.students.length}</p>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="glass-panel metric-card" style={{ borderColor: reportData.students.filter(s => s.low_attendance).length > 0 ? 'rgba(239,68,68,0.2)' : undefined, animationDelay: '200ms' }}>
          <div className="metric-info">
            <h3>Low Attendance Alerts</h3>
            <p style={{ color: reportData.students.filter(s => s.low_attendance).length > 0 ? '#ef4444' : undefined }}>
              {reportData.students.filter(s => s.low_attendance).length}
            </p>
          </div>
          <div className="metric-icon" style={{ 
            background: reportData.students.filter(s => s.low_attendance).length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)', 
            color: reportData.students.filter(s => s.low_attendance).length > 0 ? '#ef4444' : '#9ca3af' 
          }}>
            <AlertCircle size={24} />
          </div>
        </div>

        <div className="glass-panel metric-card" style={{ animationDelay: '300ms' }}>
          <div className="metric-info">
            <h3>Avg Presence Rate</h3>
            <p>
              {reportData.students.length > 0 
                ? (reportData.students.reduce((acc, s) => acc + s.percentage, 0) / reportData.students.length).toFixed(1)
                : '0.0'
              }%
            </p>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="glass-panel print-container" style={{ padding: '28px' }}>
        {isLoadingReport ? (
          <div className="flex-center" style={{ padding: '60px 0', flexDirection: 'column', gap: '16px', color: '#9ca3af' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0,242,254,0.1)', borderTopColor: '#00f2fe', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span>Computing attendance records...</span>
          </div>
        ) : reportData.students.length === 0 ? (
          <div className="flex-center" style={{ padding: '40px 0', color: '#9ca3af', flexDirection: 'column', gap: '16px' }}>
            <BookOpen size={48} />
            <span>No student attendance logs found in this range.</span>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table print-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Roll Number</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th style={{ textAlign: 'center' }}>Attended Days</th>
                  <th style={{ textAlign: 'center' }}>Total Days</th>
                  <th style={{ textAlign: 'right' }}>Attendance Rate</th>
                  <th className="hide-on-print" style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.students.map(student => (
                  <tr key={student.id} style={{ 
                    background: student.low_attendance ? 'rgba(239,68,68,0.02)' : undefined,
                    color: student.low_attendance ? '#ef4444' : undefined 
                  }}>
                    <td>{student.id}</td>
                    <td style={{ fontWeight: 600 }}>{student.roll}</td>
                    <td style={{ fontWeight: 500 }}>{student.name}</td>
                    <td>{student.dep}</td>
                    <td style={{ textAlign: 'center' }}>{student.present_days}</td>
                    <td style={{ textAlign: 'center' }}>{student.total_days}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: student.low_attendance ? '#ef4444' : '#10b981' }}>
                      {student.percentage}%
                    </td>
                    <td className="hide-on-print" style={{ textAlign: 'center' }}>
                      {student.low_attendance ? (
                        <span className="badge badge-danger" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
                          Shortage
                        </span>
                      ) : (
                        <span className="badge badge-success" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
                          Good
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic At-Risk Leaderboard & Insights */}
      {reportData && reportData.students && reportData.students.length > 0 && (
        <div className="hide-on-print reports-insights-grid" style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '32px', marginTop: '32px' }}>
          {/* At-Risk Leaderboard */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
              <AlertCircle size={20} /> At-Risk Students Leaderboard (&lt;75% Attendance)
            </h3>
            <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto', overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Roll</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th style={{ textAlign: 'right' }}>Attendance</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.students.filter(s => s.percentage < 75).length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px' }}>
                        No students currently at risk. Good job!
                      </td>
                    </tr>
                  ) : (
                    reportData.students.filter(s => s.percentage < 75).sort((a, b) => a.percentage - b.percentage).map(student => (
                      <tr key={student.id}>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{student.roll}</td>
                        <td>{student.name}</td>
                        <td><span style={{ color: 'var(--color-purple)' }}>{student.dep}</span></td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>{student.percentage}%</td>
                        <td style={{ textAlign: 'center' }}>
                          <a 
                            href={`mailto:${student.email || 'student@college.edu'}?subject=URGENT:%20Attendance%20Shortage%20Warning%20-%20${encodeURIComponent(student.name)}&body=Dear%20${encodeURIComponent(student.name)},%0A%0AThis%20is%20to%20notify%20you%20that%20your%20current%20attendance%20in%20${encodeURIComponent(student.dep)}%20is%20at%20${student.percentage}%,%20which%20is%20below%20the%20required%2075%%20threshold.%20Please%20attend%20your%20upcoming%20classes%20regularly%20to%20avoid%20academic%20disciplinary%20action.%0A%0ABest%20regards,%0AAcademic%20Office`}
                            className="bg-gradient-btn"
                            style={{ 
                              padding: '6px 12px', 
                              borderRadius: '6px', 
                              fontSize: '0.75rem',
                              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                              color: '#fff',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600
                            }}
                          >
                            <Mail size={12} />
                            Warning Email
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Peak Attendance Days & Department Stats */}
          <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
              <TrendingUp size={20} /> Attendance Insights
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Peak Attendance Day</h4>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '6px' }}>
                  {(() => {
                    if (!stats || !stats.weekly_trends || stats.weekly_trends.length === 0) return 'Monday';
                    const maxTrend = [...stats.weekly_trends].sort((a, b) => b.present - a.present)[0];
                    return maxTrend ? `${maxTrend.day} (${maxTrend.present} presents)` : 'Monday';
                  })()}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>The day of the week with the highest attendance records.</span>
              </div>
              
              <div style={{ background: 'rgba(139, 92, 246, 0.04)', border: '1px solid rgba(139, 92, 246, 0.15)', borderRadius: '12px', padding: '16px' }}>
                <h4 style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Highest Performing Branch</h4>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a78bfa', marginTop: '6px' }}>
                  {(() => {
                    if (!stats || !stats.department_stats) return 'CSE(IOT)';
                    const keys = Object.keys(stats.department_stats);
                    if (keys.length === 0) return 'CSE(IOT)';
                    const maxDept = keys.reduce((a, b) => {
                      const valA = stats.department_stats[a];
                      const valB = stats.department_stats[b];
                      const countA = (valA && typeof valA === 'object') ? (valA.present !== undefined ? valA.present : 0) : valA;
                      const countB = (valB && typeof valB === 'object') ? (valB.present !== undefined ? valB.present : 0) : valB;
                      return countA > countB ? a : b;
                    });
                    return maxDept || 'CSE(IOT)';
                  })()}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>The department with the highest presence count today.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
