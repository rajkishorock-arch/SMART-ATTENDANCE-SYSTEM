import { useState } from 'react';
import { BookOpen, FileSpreadsheet, FileDown, Mail, Users, AlertCircle, TrendingUp, RefreshCw } from 'lucide-react';
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
  const students = Array.isArray(reportData?.students) ? reportData.students : [];
  const hasStudents = students.length > 0;

  return (
    <>
      <button 
        onClick={printReport}
        className="btn-secondary"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
        disabled={!hasStudents}
      >
        <BookOpen size={18} />
        Print Report
      </button>
      <button 
        onClick={exportReportToCSV}
        className="bg-gradient-btn"
        style={{ padding: '10px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
        disabled={!hasStudents}
      >
        <FileSpreadsheet size={18} />
        Export CSV
      </button>
      <button 
        onClick={downloadReportPDF}
        className="bg-gradient-btn"
        style={{ padding: '10px 18px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', borderColor: '#0284c7' }}
        disabled={!hasStudents}
      >
        <FileDown size={18} />
        Download PDF
      </button>
      <button 
        onClick={handleSendAbsenteeAlerts}
        className="btn-danger"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', padding: '10px 18px', borderRadius: '8px' }}
        disabled={isSendingAlerts || !hasStudents}
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
  reportAlertMsg,
  setReportAlertMsg,
}) {
  const { userRole, currentUser } = useAuth();
  const { playCyberSound } = useUI();

  const students = Array.isArray(reportData?.students) ? reportData.students : [];
  const totalWorkingDays = (reportData && reportData.total_working_days) || 0;

  const [attendanceFilterPill, setAttendanceFilterPill] = useState('ALL'); // 'ALL' | 'SHORTAGE' | 'SATISFACTORY'

  const displayedStudents = students.filter(s => {
    if (attendanceFilterPill === 'SHORTAGE') return s.percentage < 75 || s.low_attendance;
    if (attendanceFilterPill === 'SATISFACTORY') return s.percentage >= 75 && !s.low_attendance;
    return true;
  });

  return (
    <div className="reports-section mobile-tab-panel reports-panel" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Alert Notification Toast / Banner */}
      {reportAlertMsg && (
        <div style={{
          padding: '14px 20px',
          borderRadius: '12px',
          background: reportAlertMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${reportAlertMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: reportAlertMsg.type === 'success' ? '#065f46' : '#dc2626',
          fontSize: '0.88rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          animation: 'fadeInUp 0.3s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{reportAlertMsg.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{reportAlertMsg.text}</span>
          </div>
          {setReportAlertMsg && (
            <button
              onClick={() => setReportAlertMsg(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 800, padding: '0 4px' }}
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel hide-on-print" style={{ padding: '20px 18px', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Report Parameters & Filters
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
              Select timeframe, academic branch, and course
            </p>
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
            Official Records
          </span>
        </div>

        {/* 2x2 Responsive Parameter Grid */}
        <div className="reports-filter-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Start Date */}
          <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%' }}>
            <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '5px', display: 'block' }}>
              Start Date
            </label>
            <div className="date-picker-row" style={{ display: 'flex', alignItems: 'center', gap: '5px', width: '100%', boxSizing: 'border-box' }}>
              <button
                type="button"
                onClick={() => { playCyberSound('click'); shiftDate(reportStartDate, -1, setReportStartDate); }}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#475569',
                  padding: '0',
                  width: '36px',
                  minWidth: '36px',
                  maxWidth: '36px',
                  flex: '0 0 36px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  height: '40px',
                  boxSizing: 'border-box'
                }}
                title="Previous Day"
              >
                ◀
              </button>
              <input 
                type="date" 
                className="form-input flex-input" 
                value={reportStartDate} 
                onChange={e => setReportStartDate(e.target.value)} 
                style={{ height: '40px', margin: 0, flex: 1, minWidth: 0, boxSizing: 'border-box', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.84rem' }}
              />
              <button
                type="button"
                onClick={() => { playCyberSound('click'); shiftDate(reportStartDate, 1, setReportStartDate); }}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#475569',
                  padding: '0',
                  width: '36px',
                  minWidth: '36px',
                  maxWidth: '36px',
                  flex: '0 0 36px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  height: '40px',
                  boxSizing: 'border-box'
                }}
                title="Next Day"
              >
                ▶
              </button>
            </div>
          </div>

          {/* End Date */}
          <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%' }}>
            <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '5px', display: 'block' }}>
              End Date
            </label>
            <div className="date-picker-row" style={{ display: 'flex', alignItems: 'center', gap: '5px', width: '100%', boxSizing: 'border-box' }}>
              <button
                type="button"
                onClick={() => { playCyberSound('click'); shiftDate(reportEndDate, -1, setReportEndDate); }}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#475569',
                  padding: '0',
                  width: '36px',
                  minWidth: '36px',
                  maxWidth: '36px',
                  flex: '0 0 36px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  height: '40px',
                  boxSizing: 'border-box'
                }}
                title="Previous Day"
              >
                ◀
              </button>
              <input 
                type="date" 
                className="form-input flex-input" 
                value={reportEndDate} 
                onChange={e => setReportEndDate(e.target.value)} 
                style={{ height: '40px', margin: 0, flex: 1, minWidth: 0, boxSizing: 'border-box', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 8px', fontSize: '0.84rem' }}
              />
              <button
                type="button"
                onClick={() => { playCyberSound('click'); shiftDate(reportEndDate, 1, setReportEndDate); }}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  color: '#475569',
                  padding: '0',
                  width: '36px',
                  minWidth: '36px',
                  maxWidth: '36px',
                  flex: '0 0 36px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  height: '40px',
                  boxSizing: 'border-box'
                }}
                title="Next Day"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Department */}
          {userRole === 'admin' ? (
            <>
              <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%' }}>
                <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '5px', display: 'block' }}>Department</label>
                <select 
                  className="form-input" 
                  value={reportDeptFilter} 
                  onChange={e => { setReportDeptFilter(e.target.value); setSelectedReportSubjectId(''); }}
                  style={{ height: '40px', width: '100%', boxSizing: 'border-box', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%' }}>
                <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '5px', display: 'block' }}>Subject</label>
                <select 
                  className="form-input" 
                  value={selectedReportSubjectId} 
                  onChange={e => setSelectedReportSubjectId(e.target.value)}
                  style={{ height: '40px', width: '100%', boxSizing: 'border-box', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem' }}
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
            <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%' }}>
              <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '5px', display: 'block' }}>Subject</label>
              <select 
                className="form-input" 
                value={selectedReportSubjectId} 
                onChange={e => setSelectedReportSubjectId(e.target.value)}
                style={{ height: '40px', width: '100%', boxSizing: 'border-box', background: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '0.84rem', cursor: 'default' }}
                disabled={true}
              >
                {subjects.filter(s => s.teacher_id === currentUser?.details?.id).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Action Buttons Row */}
          <div style={{
            display: 'flex',
            gap: '10px',
            width: '100%',
            gridColumn: '1 / -1',
            marginTop: '4px',
            flexWrap: 'wrap'
          }}>
            <button 
              onClick={fetchReport} 
              className="btn-primary"
              style={{
                flex: 1,
                minWidth: '160px',
                padding: '10px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                height: '42px',
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                border: 'none',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
              }}
            >
              <RefreshCw size={16} /> Regenerate Report
            </button>
            {students.length > 0 && (
              <button 
                onClick={() => printReport()} 
                className="btn-secondary" 
                style={{
                  flex: 1,
                  minWidth: '140px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  height: '42px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#1e293b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <FileDown size={16} /> Print Report
              </button>
            )}
          </div>
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
          Total System Academic Days: {totalWorkingDays} | Generated on {new Date().toLocaleDateString()}
        </p>
        <hr style={{ border: 'none', borderTop: '2px solid #000', marginTop: '20px' }} />
      </div>

      {/* Summary Analytics Cards — Sleek 3-Card Strip */}
      <div className="reports-metric-strip hide-on-print" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          gap: '4px'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={17} />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {students.length}
          </div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Scanned Students
          </div>
        </div>

        <div style={{
          background: students.filter(s => s.low_attendance).length > 0 ? '#fef2f2' : '#ffffff',
          border: students.filter(s => s.low_attendance).length > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          gap: '4px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: students.filter(s => s.low_attendance).length > 0 ? '#fee2e2' : '#f1f5f9',
            color: students.filter(s => s.low_attendance).length > 0 ? '#dc2626' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertCircle size={17} />
          </div>
          <div style={{
            fontSize: '1.35rem',
            fontWeight: 800,
            color: students.filter(s => s.low_attendance).length > 0 ? '#dc2626' : '#0f172a',
            lineHeight: 1.1
          }}>
            {students.filter(s => s.low_attendance).length}
          </div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Low Attendance
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          gap: '4px'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={17} />
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
            {students.length > 0 
              ? (students.reduce((acc, s) => acc + s.percentage, 0) / students.length).toFixed(1)
              : '0.0'}%
          </div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Avg Presence
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="glass-panel print-container" style={{ padding: '28px' }}>
        {isLoadingReport ? (
          <div className="flex-center" style={{ padding: '60px 0', flexDirection: 'column', gap: '16px', color: 'var(--color-text-muted)' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(30, 64, 175, 0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span>Computing attendance records...</span>
          </div>
        ) : students.length === 0 ? (
          <div className="flex-center" style={{ padding: '40px 0', color: 'var(--color-text-muted)', flexDirection: 'column', gap: '16px' }}>
            <BookOpen size={48} />
            <span>No student attendance logs found in this range.</span>
          </div>
        ) : (
          <div>
            {/* Quick Shortage Defaulters & Status Filter Bar */}
            <div className="hide-on-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => { if (playCyberSound) playCyberSound('click'); setAttendanceFilterPill('ALL'); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: attendanceFilterPill === 'ALL' ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                    background: attendanceFilterPill === 'ALL' ? '#eff6ff' : '#ffffff',
                    color: attendanceFilterPill === 'ALL' ? '#1d4ed8' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  All Students ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => { if (playCyberSound) playCyberSound('click'); setAttendanceFilterPill('SHORTAGE'); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: attendanceFilterPill === 'SHORTAGE' ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                    background: attendanceFilterPill === 'SHORTAGE' ? '#fef2f2' : '#ffffff',
                    color: attendanceFilterPill === 'SHORTAGE' ? '#dc2626' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ⚠️ Shortage Defaulters (&lt;75%) ({students.filter(s => s.percentage < 75 || s.low_attendance).length})
                </button>
                <button
                  type="button"
                  onClick={() => { if (playCyberSound) playCyberSound('click'); setAttendanceFilterPill('SATISFACTORY'); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: attendanceFilterPill === 'SATISFACTORY' ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                    background: attendanceFilterPill === 'SATISFACTORY' ? '#ecfdf5' : '#ffffff',
                    color: attendanceFilterPill === 'SATISFACTORY' ? '#059669' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ✅ Satisfactory (≥75%) ({students.filter(s => s.percentage >= 75 && !s.low_attendance).length})
                </button>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                Showing <strong>{displayedStudents.length}</strong> of {students.length} students
              </span>
            </div>

            {/* Mobile-Friendly Student Cards View */}
            <div className="reports-mobile-cards hide-on-desktop" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
              {displayedStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '0.85rem' }}>
                  No students match the selected filter.
                </div>
              ) : (
                displayedStudents.map(student => (
                  <div 
                    key={student.id}
                    style={{
                      background: '#ffffff',
                      border: student.low_attendance ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {student.name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Roll #{student.roll} • <span style={{ color: '#7c3aed', fontWeight: 600 }}>{student.dep}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '0.9rem',
                          fontWeight: 800,
                          color: student.low_attendance ? '#ef4444' : '#10b981'
                        }}>
                          {student.percentage}%
                        </span>
                        <div>
                          {student.low_attendance ? (
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626' }}>
                              Shortage
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#16a34a' }}>
                              Good
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                      <span>Attended: <strong>{student.present_days} / {student.total_days}</strong> days</span>
                      <div style={{ width: '80px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(student.percentage, 100)}%`,
                          height: '100%',
                          background: student.low_attendance ? '#ef4444' : '#10b981',
                          borderRadius: '3px'
                        }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="table-container reports-table-desktop">
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
                  {displayedStudents.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '28px', color: '#64748b' }}>
                        No students match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    displayedStudents.map(student => (
                      <tr key={student.id} style={{ 
                        background: student.low_attendance ? 'rgba(239,68,68,0.02)' : undefined,
                        color: student.low_attendance ? '#ef4444' : undefined 
                      }}>
                        <td>{student.id}</td>
                        <td style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{student.roll}</td>
                        <td style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{student.name}</td>
                        <td><span style={{ color: 'var(--color-purple)', fontWeight: 600 }}>{student.dep}</span></td>
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic At-Risk Leaderboard & Insights */}
      {students.length > 0 && (
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
                  {students.filter(s => s.percentage < 75).length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px' }}>
                        No students currently at risk. Good job!
                      </td>
                    </tr>
                  ) : (
                    students.filter(s => s.percentage < 75).sort((a, b) => a.percentage - b.percentage).map(student => (
                      <tr key={student.id}>
                        <td style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{student.roll}</td>
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
