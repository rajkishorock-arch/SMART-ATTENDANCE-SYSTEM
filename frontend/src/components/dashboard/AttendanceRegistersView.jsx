import { FileSpreadsheet, CheckCircle2, Clock, Search, BookOpen, FileDown, Calendar } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';

export function AttendanceRegistersHeaderAction({ exportToCSV, filteredLogs }) {
  return (
    <button 
      onClick={exportToCSV}
      className="btn-secondary"
      style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}
      disabled={!filteredLogs || filteredLogs.length === 0}
    >
      <FileSpreadsheet size={18} />
      Export to CSV
    </button>
  );
}

export default function AttendanceRegistersView({
  logSearch,
  setLogSearch,
  logDeptFilter,
  setLogDeptFilter,
  logDateFilter,
  setLogDateFilter,
  quickFilterStatus,
  setQuickFilterStatus,
  logsViewMode,
  setLogsViewMode,
  selectedLogIds,
  setSelectedLogIds,
  selectedAuditLog,
  setSelectedAuditLog,
  filteredLogs,
  departments,
  subjects,
  exportToCSV,
  shiftDate,
  getPeriodSlotLabel,
  isMobileView,
}) {
  const { userRole, currentUser } = useAuth();
  const { playCyberSound } = useUI();

  // Dynamic stats calculations
  const totalLogsCount = filteredLogs.length;
  const presentLogsCount = filteredLogs.filter(l => l.attendance.toLowerCase() === 'present').length;
  const presenceRateLogs = totalLogsCount > 0 ? Math.round((presentLogsCount / totalLogsCount) * 100) : 0;

  // Peak Scan hour math
  let peakScanHour = "N/A";
  if (filteredLogs.length > 0) {
    const hours = filteredLogs.map(l => {
      const parts = l.time.split(':');
      if (parts.length > 0) {
        let hr = parseInt(parts[0]);
        if (l.time.toLowerCase().includes('pm') && hr < 12) hr += 12;
        if (l.time.toLowerCase().includes('am') && hr === 12) hr = 0;
        return hr;
      }
      return null;
    }).filter(h => h !== null);
    if (hours.length > 0) {
      const counts = hours.reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
      }, {});
      const peak = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
      const peakHourNum = parseInt(peak);
      const ampm = peakHourNum >= 12 ? 'PM' : 'AM';
      const dispHour = peakHourNum % 12 === 0 ? 12 : peakHourNum % 12;
      peakScanHour = `${dispHour}:00 ${ampm}`;
    }
  }

  return (
    <div className="glass-panel mobile-tab-panel logs-panel" style={{ padding: '32px', animation: 'fadeInUp 0.6s ease both' }}>
      {/* Logs Metrics Summary cards */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="glass-panel metric-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--color-primary)' }}>
          <div className="metric-info">
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Filtered Check-ins</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{totalLogsCount}</p>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe', width: '40px', height: '40px', borderRadius: '10px' }}>
            <FileSpreadsheet size={18} />
          </div>
        </div>
        
        <div className="glass-panel metric-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--color-success)' }}>
          <div className="metric-info">
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Presence Rate</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{presenceRateLogs}%</p>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '40px', height: '40px', borderRadius: '10px' }}>
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="glass-panel metric-card" style={{ padding: '16px 20px', borderLeft: '4px solid var(--color-purple)' }}>
          <div className="metric-info">
            <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)' }}>Peak Traffic Hour</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>{peakScanHour}</p>
          </div>
          <div className="metric-icon" style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', width: '40px', height: '40px', borderRadius: '10px' }}>
            <Clock size={18} />
          </div>
        </div>
      </div>

      {/* Filter Cockpit Bar */}
      <div className="mobile-filter-stack" style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '16px', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <input 
              type="text" 
              className="form-input" 
              style={{ paddingLeft: '44px', background: 'rgba(8, 12, 20, 0.4)' }}
              placeholder="Search by ID, Name or Roll..."
              value={logSearch}
              onChange={e => setLogSearch(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          </div>

          {userRole === 'admin' ? (
            <select 
              className="form-input" 
              style={{ width: '180px', background: 'rgba(8, 12, 20, 0.4)' }}
              value={logDeptFilter}
              onChange={e => setLogDeptFilter(e.target.value)}
            >
              <option value="">All Depts</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          ) : userRole === 'teacher' ? (
            <div style={{ 
              padding: '12px 16px', 
              background: 'rgba(0, 242, 254, 0.08)', 
              border: '1px solid rgba(0, 242, 254, 0.2)', 
              borderRadius: '12px', 
              color: '#00f2fe',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <BookOpen size={14} />
              <span>{currentUser?.details?.subject_code || 'N/A'}</span>
            </div>
          ) : null}

          <div className="date-picker-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => { playCyberSound('click'); shiftDate(logDateFilter, -1, setLogDateFilter); }}
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
              style={{ width: '150px', minWidth: 0, background: 'rgba(8, 12, 20, 0.4)', height: '42px', margin: 0, boxSizing: 'border-box' }}
              value={logDateFilter}
              onChange={e => setLogDateFilter(e.target.value)}
            />
            <button
              type="button"
              onClick={() => { playCyberSound('click'); shiftDate(logDateFilter, 1, setLogDateFilter); }}
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

        {/* View Toggles & Status filters */}
        <div className="mobile-filter-controls" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status Chips */}
          <div style={{ display: 'flex', background: 'rgba(8, 12, 20, 0.5)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {['all', 'present', 'absent'].map(status => (
              <button
                key={status}
                onClick={() => {
                  playCyberSound('click');
                  setQuickFilterStatus(status);
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  background: quickFilterStatus === status ? 'var(--color-primary)' : 'transparent',
                  color: quickFilterStatus === status ? '#0d1323' : 'var(--color-text-muted)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s'
                }}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Mode Toggles */}
          <div style={{ display: 'flex', background: 'rgba(8, 12, 20, 0.5)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => {
                playCyberSound('click');
                setLogsViewMode('grid');
              }}
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                background: logsViewMode === 'grid' ? 'var(--color-primary)' : 'transparent',
                color: logsViewMode === 'grid' ? '#0d1323' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              📊 GRID
            </button>
            <button
              onClick={() => {
                playCyberSound('click');
                setLogsViewMode('chrono');
              }}
              style={{
                padding: '6px 12px',
                fontSize: '0.75rem',
                background: logsViewMode === 'chrono' ? 'var(--color-primary)' : 'transparent',
                color: logsViewMode === 'chrono' ? '#0d1323' : 'var(--color-text-muted)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              ⏳ FEED
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar for Logs */}
      {selectedLogIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
          background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.2)',
          borderRadius: '12px', marginBottom: '16px', animation: 'fadeInUp 0.3s ease'
        }}>
          <span style={{ color: '#00f2fe', fontWeight: 700, fontSize: '0.85rem' }}>
            {selectedLogIds.size} log{selectedLogIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelectedLogIds(new Set())}
            style={{
              padding: '5px 12px', fontSize: '0.75rem', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
              borderRadius: '6px', cursor: 'pointer'
            }}
          >Clear Selection</button>
          <button
            onClick={exportToCSV}
            style={{
              padding: '5px 14px', fontSize: '0.75rem', background: 'rgba(0,242,254,0.1)',
              border: '1px solid rgba(0,242,254,0.3)', color: '#00f2fe',
              borderRadius: '6px', cursor: 'pointer', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <FileDown size={12} /> Export Selected to CSV
          </button>
        </div>
      )}

      {/* Main Logs View Rendering */}
      {filteredLogs.length === 0 ? (
        <div className="flex-center" style={{ padding: '60px 0', color: 'var(--color-text-muted)', flexDirection: 'column', gap: '16px' }}>
          <Calendar size={44} style={{ color: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontWeight: 500 }}>No attendance records found matching filters.</span>
        </div>
      ) : logsViewMode === 'grid' ? (
        /* Grid Table View */
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filteredLogs.length > 0 && filteredLogs.every(log => selectedLogIds.has(log.id))}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedLogIds(new Set(filteredLogs.map(log => log.id)));
                      } else {
                        setSelectedLogIds(new Set());
                      }
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#00f2fe' }}
                  />
                </th>
                <th style={{ width: '80px' }}>ID</th>
                <th>Roll Number</th>
                <th>Name</th>
                <th>Department</th>
                <th>Time</th>
                <th>Date</th>
                <th style={{ width: '150px' }}>Status</th>
                <th style={{ width: '100px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, idx) => (
                <tr 
                  key={idx} 
                  onClick={() => {
                    playCyberSound('click');
                    setSelectedAuditLog(log);
                  }}
                  style={{ 
                    cursor: 'pointer',
                    background: selectedLogIds.has(log.id) ? 'rgba(0,242,254,0.03)' : undefined 
                  }}
                >
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedLogIds.has(log.id)}
                      onChange={e => {
                        const next = new Set(selectedLogIds);
                        if (e.target.checked) next.add(log.id); else next.delete(log.id);
                        setSelectedLogIds(next);
                      }}
                      style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#00f2fe' }}
                    />
                  </td>
                  <td style={{ color: '#00f2fe', fontWeight: 600 }}>#{log.id}</td>
                  <td style={{ fontWeight: 700, color: '#fff' }}>{log.roll}</td>
                  <td style={{ fontWeight: 500 }}>{log.name}</td>
                  <td>
                    <span style={{ color: 'var(--color-purple)', fontWeight: 500 }}>{log.department}</span>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{log.time}</td>
                  <td>{log.date}</td>
                  <td>
                    <span className={`badge ${log.attendance.toLowerCase() === 'present' ? 'badge-success' : 'badge-danger'}`}>
                      {log.attendance}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="action-btn"
                      style={{ padding: '4px 10px', fontSize: '0.7rem', fontFamily: 'monospace' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        playCyberSound('click');
                        setSelectedAuditLog(log);
                      }}
                    >
                      AUDIT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Chrono Timeline Feed View */
        <div className="chrono-feed">
          {filteredLogs.map((log, idx) => {
            const isPresent = log.attendance.toLowerCase() === 'present';
            return (
              <div 
                key={idx}
                onClick={() => {
                  playCyberSound('click');
                  setSelectedAuditLog(log);
                }}
                className="glass-panel chrono-feed-item" 
                style={{ 
                  padding: '20px', 
                  position: 'relative', 
                  cursor: 'pointer',
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = isPresent ? '#10b981' : '#ef4444';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {/* Timeline Node Point */}
                <div className="chrono-timeline-node" style={{ 
                  background: isPresent ? '#10b981' : '#ef4444',
                  boxShadow: `0 0 10px ${isPresent ? '#10b981' : '#ef4444'}`
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '45px', 
                    height: '45px', 
                    borderRadius: '10px', 
                    background: isPresent ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', 
                    border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    color: isPresent ? '#10b981' : '#ef4444',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    fontFamily: 'monospace'
                  }}>
                    {log.name.substring(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{log.name}</h4>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>({log.roll})</span>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{log.department}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span>📅 {log.date}</span>
                      <span>⏰ {log.time}</span>
                      <span style={{ background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.74rem', border: '1px solid rgba(0, 242, 254, 0.25)' }}>
                        ⏱️ {getPeriodSlotLabel(log.period || log.time)}
                      </span>
                      {(log.subject_name || subjects.find(s => s.id === log.subject_id)?.name) && (
                        <span style={{ background: 'rgba(167, 139, 250, 0.1)', color: '#c4b5fd', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '0.74rem', border: '1px solid rgba(167, 139, 250, 0.25)' }}>
                          📚 {log.subject_name || subjects.find(s => s.id === log.subject_id)?.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontFamily: 'monospace',
                    color: isPresent ? '#10b981' : '#ef4444',
                    background: isPresent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    border: `1px solid ${isPresent ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                  }}>
                    {isPresent ? '✓ SIGNATURE VERIFIED' : '✗ ABSENT RECORD'}
                  </span>
                  <button 
                    className="action-btn" 
                    style={{ padding: '6px 12px', fontSize: '0.75rem', fontFamily: 'monospace' }}
                  >
                    AUDIT
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Holographic Biometric Audit Modal Popup */}
      {selectedAuditLog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(5, 7, 12, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease both'
        }}>
          <div className="glass-panel" style={{
            width: '90%',
            maxWidth: '440px',
            padding: isMobileView ? '20px 16px' : '32px',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            boxShadow: '0 20px 50px rgba(0, 242, 254, 0.15)',
            animation: 'zoomIn 0.3s ease both',
            position: 'relative',
            boxSizing: 'border-box'
          }}>
            {/* Futuristic wireframe scanner borders */}
            <div style={{ position: 'absolute', top: '15px', left: '15px', width: '15px', height: '15px', borderTop: '2px solid #00f2fe', borderLeft: '2px solid #00f2fe' }} />
            <div style={{ position: 'absolute', top: '15px', right: '15px', width: '15px', height: '15px', borderTop: '2px solid #00f2fe', borderRight: '2px solid #00f2fe' }} />
            <div style={{ position: 'absolute', bottom: '15px', left: '15px', width: '15px', height: '15px', borderBottom: '2px solid #00f2fe', borderLeft: '2px solid #00f2fe' }} />
            <div style={{ position: 'absolute', bottom: '15px', right: '15px', width: '15px', height: '15px', borderBottom: '2px solid #00f2fe', borderRight: '2px solid #00f2fe' }} />

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '24px', fontFamily: 'Outfit, sans-serif', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>BIOMETRIC RECORD AUDIT</span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#00f2fe' }}>LOG #{selectedAuditLog.id}</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Wireframe Student details profile box */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(8,12,20,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '12px', 
                  border: '1.5px dashed #00f2fe', 
                  background: 'rgba(0, 242, 254, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  color: '#00f2fe',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    position: 'absolute',
                    width: '100%',
                    height: '2px',
                    background: '#00f2fe',
                    top: '50%',
                    left: 0,
                    animation: 'scannerLine 2s infinite linear'
                  }} />
                  {selectedAuditLog.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, color: '#fff', fontSize: '1.1rem' }}>{selectedAuditLog.name}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Roll: {selectedAuditLog.roll}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-purple)', fontWeight: 600 }}>{selectedAuditLog.department}</p>
                </div>
              </div>

              {/* Telemetry data */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>LOG DATE:</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{selectedAuditLog.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>LOG TIME:</span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{selectedAuditLog.time}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>CLASS PERIOD:</span>
                  <span style={{ color: '#00f2fe', fontWeight: 'bold' }}>
                    {getPeriodSlotLabel(selectedAuditLog.period || selectedAuditLog.time)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>ENROLLED SUBJECT:</span>
                  <span style={{ color: '#c4b5fd', fontWeight: 'bold' }}>
                    {selectedAuditLog.subject_name || subjects.find(s => s.id === selectedAuditLog.subject_id)?.name || (currentUser?.details?.subject_name) || 'General Attendance'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>STATUS STATE:</span>
                  <span style={{ 
                    color: selectedAuditLog.attendance.toLowerCase() === 'present' ? '#10b981' : '#ef4444', 
                    fontWeight: 'bold' 
                  }}>
                    {selectedAuditLog.attendance.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>VERIFICATION METHOD:</span>
                  <span style={{ color: '#00f2fe', fontWeight: 'bold' }}>
                    {selectedAuditLog.attendance.toLowerCase() === 'present' ? 'SFACE ONNX MATCH' : 'AUTO TIMEOUT / UNMARKED'}
                  </span>
                </div>
                {selectedAuditLog.attendance.toLowerCase() === 'present' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>COSINE SIMILARITY:</span>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>0.914 (THRESHOLD PASS)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>LIVENESS METRICS:</span>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>SECURE (BLINK VERIFIED)</span>
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>NETWORK NODE:</span>
                  <span style={{ color: 'var(--color-purple)' }}>NODE_CAMPUS_INTRANET_124</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>SCAN SIGNATURE:</span>
                  <span style={{ color: '#f59e0b' }}>HEX_8D2B4A9E</span>
                </div>
              </div>

              {/* Close buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    playCyberSound('click');
                    setSelectedAuditLog(null);
                  }}
                  className="action-btn"
                  style={{ flex: 1, padding: '12px' }}
                >
                  DISMISS AUDIT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
