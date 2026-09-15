import { Video, BookOpen, Calendar, Clock, AlertCircle, Camera, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';
import SmartEmptyState from '../SmartEmptyState';

export default function LiveScannerSessionHubView({
  sessionActive,
  setSessionActive,
  sessionDate,
  setSessionDate,
  sessionPeriod,
  setSessionPeriod,
  selectedSubjectId,
  setSelectedSubjectId,
  lockdownActive,
  setLockdownActive,
  attendanceActive,
  scannerBootActive,
  recognizedStudents,
  setRecognizedStudents,
  scanStatus,
  livenessStatus,
  subjects,
  setShowScannerModal,
  setShowQrScannerModal,
  setIsManualAttendanceOpen,
  setManualSubjectId,
  setManualDate,
  setManualPeriod,
  setManualAttendanceData,
  setManualSearchQuery,
  stopAttendanceCam,
  shiftDate,
}) {
  const { userRole, currentUser } = useAuth();
  const { playCyberSound } = useUI();

  return (
    <>
      {!sessionActive ? (
        <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%', animation: 'fadeInUp 0.6s ease both' }}>
          <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '28px', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px', textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex',
                background: 'rgba(0, 242, 254, 0.08)',
                padding: '16px',
                borderRadius: '20px',
                border: '1px solid rgba(0, 242, 254, 0.25)',
                marginBottom: '16px',
                boxShadow: '0 0 20px rgba(0, 242, 254, 0.1)'
              }}>
                <Video size={36} style={{ color: '#00f2fe' }} />
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
                Initialize Attendance Session
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '6px' }}>
                Set up class parameters and period slots to unlock the live facial recognition scanner.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Subject Selection for Admin */}
              {userRole === 'admin' && (
                <div className="form-group" style={{ textAlign: 'left', marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={14} style={{ color: '#00f2fe' }} /> Select Active Subject
                  </label>
                  <select 
                    className="form-input"
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    required
                    style={{ background: 'rgba(8, 12, 20, 0.4)' }}
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id.toString()}>
                        {s.name} ({s.code}) - {s.department}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject Details */}
              {userRole === 'admin' ? (
                selectedSubjectId && (
                  <div style={{ background: 'rgba(8, 12, 20, 0.4)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem', textAlign: 'left', animation: 'fadeInUp 0.3s ease both' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>Selected Subject</span>
                      <strong style={{ color: '#fff' }}>{subjects.find(s => s.id === parseInt(selectedSubjectId))?.name || 'None Selected'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>Subject Code</span>
                      <strong style={{ color: '#fff' }}>{subjects.find(s => s.id === parseInt(selectedSubjectId))?.code || 'N/A'}</strong>
                    </div>
                    <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>Branch / Department</span>
                      <strong style={{ color: '#00f2fe' }}>{subjects.find(s => s.id === parseInt(selectedSubjectId))?.department || 'N/A'}</strong>
                    </div>
                  </div>
                )
              ) : (
                <div style={{ background: 'rgba(8, 12, 20, 0.4)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.9rem', textAlign: 'left' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>Assigned Subject</span>
                    <strong style={{ color: '#fff' }}>{currentUser?.details?.subject_name || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>Subject Code</span>
                    <strong style={{ color: '#fff' }}>{currentUser?.details?.subject_code || 'N/A'}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                    <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.8rem', marginBottom: '4px', fontWeight: 600 }}>Branch / Department</span>
                    <strong style={{ color: '#00f2fe' }}>{currentUser?.details?.subject_department || 'N/A'}</strong>
                  </div>
                </div>
              )}

              {/* Session parameters */}
              <div className="form-group" style={{ textAlign: 'left', marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} style={{ color: '#00f2fe' }} /> Select Class Date
                </label>
                <div className="date-picker-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <button
                    type="button"
                    onClick={() => { playCyberSound('click'); shiftDate(sessionDate, -1, setSessionDate); }}
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
                    className="form-input date-input-field flex-input"
                    value={sessionDate}
                    onChange={e => setSessionDate(e.target.value)}
                    required
                    style={{ background: 'rgba(8, 12, 20, 0.4)', height: '42px', margin: 0, flex: 1, minWidth: 0, boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => { playCyberSound('click'); shiftDate(sessionDate, 1, setSessionDate); }}
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

              <div className="form-group" style={{ textAlign: 'left', marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} style={{ color: '#00f2fe' }} /> Select Period / Time Slot
                </label>
                <select 
                  className="form-input"
                  value={sessionPeriod}
                  onChange={e => setSessionPeriod(e.target.value)}
                  required
                  style={{ background: 'rgba(8, 12, 20, 0.4)' }}
                >
                  <option value="Period 1">Period 1 (09:00 - 10:00 AM)</option>
                  <option value="Period 2">Period 2 (10:00 - 11:00 AM)</option>
                  <option value="Period 3">Period 3 (11:00 - 12:00 PM)</option>
                  <option value="Period 4">Period 4 (12:00 - 01:00 PM)</option>
                  <option value="Period 5">Period 5 (01:00 - 02:00 PM)</option>
                  <option value="Period 6">Period 6 (02:00 - 03:00 PM)</option>
                  <option value="Period 7">Period 7 (03:00 - 04:00 PM)</option>
                  <option value="Period 8">Period 8 (04:00 - 05:00 PM)</option>
                </select>
              </div>

              <button 
                onClick={() => {
                  if (sessionDate && sessionPeriod) {
                    if (userRole === 'admin' && !selectedSubjectId) {
                      alert('Please select a subject first.');
                      return;
                    }
                    setSessionActive(true);
                    if (userRole === 'teacher') {
                      const teacherSub = subjects.find(s => s.teacher_id === currentUser?.details?.id);
                      if (teacherSub) {
                        setSelectedSubjectId(teacherSub.id.toString());
                      }
                    }
                    setShowScannerModal(true);
                  }
                }}
                className="bg-gradient-btn"
                style={{ 
                  padding: '14px', 
                  borderRadius: '12px', 
                  fontWeight: 700, 
                  fontSize: '1rem', 
                  marginTop: '16px',
                  letterSpacing: '0.02em'
                }}
              >
                📸 Start AI Face Check-in Session
              </button>

              {/* Manual Attendance Button */}
              <button
                onClick={() => {
                  if (userRole === 'admin' && !selectedSubjectId) {
                    alert('Please select a subject first to use Manual Register.');
                    return;
                  }
                  const subId = userRole === 'teacher'
                    ? subjects.find(s => s.teacher_id === currentUser?.details?.id)?.id?.toString() || ''
                    : selectedSubjectId;
                  setManualSubjectId(subId);
                  setManualDate(sessionDate);
                  setManualPeriod(sessionPeriod);
                  setManualAttendanceData({});
                  setManualSearchQuery('');
                  setIsManualAttendanceOpen(true);
                  playCyberSound('click');
                }}
                type="button"
                className="btn-secondary active-haptic"
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: '1px solid rgba(167, 139, 250, 0.3)',
                  color: '#a78bfa',
                  background: 'rgba(167, 139, 250, 0.06)'
                }}
              >
                ✋ Manual Register (No Face Auth)
              </button>

              {/* Scan Virtual ID Card Button (Phone & Laptop) */}
              <button
                onClick={() => {
                  if (userRole === 'admin' && !selectedSubjectId) {
                    alert('Please select a subject first to scan Virtual ID Card.');
                    return;
                  }
                  setShowQrScannerModal(true);
                  playCyberSound('click');
                }}
                type="button"
                className="btn-secondary active-haptic"
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: '1px solid rgba(0, 242, 254, 0.35)',
                  color: '#00f2fe',
                  background: 'rgba(0, 242, 254, 0.08)',
                  boxShadow: '0 4px 15px rgba(0, 242, 254, 0.08)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>🪪</span> Scan Virtual ID Card (Mobile & Laptop)
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.6s ease both' }}>
          {lockdownActive ? (
            <div className="glass-panel" style={{
              background: 'rgba(239, 68, 68, 0.04)',
              border: '2px solid #ef4444',
              borderRadius: '16px',
              padding: '50px 40px',
              textAlign: 'center',
              boxShadow: '0 0 35px rgba(239, 68, 68, 0.2)',
              animation: 'lockdownFlash 2s infinite'
            }}>
              <AlertCircle size={64} style={{ color: '#ef4444', margin: '0 auto 20px auto', display: 'block' }} />
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', fontFamily: 'monospace', letterSpacing: '0.05em', marginBottom: '12px' }}>
                !!! EMERGENCY SECURITY LOCKDOWN ENGAGED !!!
              </h2>
              <p style={{ color: '#fca5a5', fontSize: '0.95rem', maxWidth: '650px', margin: '0 auto 28px auto', lineHeight: '1.6', fontFamily: 'sans-serif' }}>
                Facial check-in stream cutoff is active. Physical access control gates have been locked. Core security servers are restricted to local admin overrides.
              </p>
              {userRole === 'admin' && (
                <button 
                  onClick={() => {
                    setLockdownActive(false);
                    playCyberSound('success');
                  }}
                  className="bg-gradient-btn"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', padding: '14px 32px', borderRadius: '12px', fontSize: '0.95rem', border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(239, 68, 68, 0.35)' }}
                >
                  🔐 Deactivate Security Cutoff
                </button>
              )}
            </div>
          ) : (
            <>
              {sessionActive && (
                <div className="glass-panel" style={{
                  background: 'rgba(0, 242, 254, 0.04)',
                  border: '1px solid rgba(0, 242, 254, 0.2)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 8px 30px rgba(0,242,254,0.05)'
                }}>
                  <div style={{ display: 'flex', gap: '20px', fontSize: '0.88rem', textAlign: 'left', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>Active Subject</span>
                      <strong style={{ color: '#fff', fontSize: '0.9rem' }}>
                        {userRole === 'teacher' ? (
                          `${currentUser?.details?.subject_name} (${currentUser?.details?.subject_code})`
                        ) : (
                          `${subjects.find(s => s.id === parseInt(selectedSubjectId))?.name || 'General'} (${subjects.find(s => s.id === parseInt(selectedSubjectId))?.code || 'N/A'})`
                        )}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>Session Date</span>
                      <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{sessionDate.split('-').reverse().join('/')}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-text-muted)', display: 'block', fontSize: '0.72rem', fontWeight: 600 }}>Period</span>
                      <strong style={{ color: '#00f2fe', fontSize: '0.9rem' }}>{sessionPeriod}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      stopAttendanceCam();
                      setSessionActive(false);
                      setRecognizedStudents([]);
                    }}
                    className="btn-danger"
                    style={{ padding: '8px 16px', fontSize: '0.85rem', flexShrink: 0 }}
                  >
                    Close Session
                  </button>
                </div>
              )}

              {/* Scanner Launch Card */}
              <div className="attendance-layout-grid">
                <div className="glass-panel" style={{
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '20px',
                  border: attendanceActive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(0,242,254,0.12)',
                  boxShadow: attendanceActive ? '0 0 30px rgba(16,185,129,0.08)' : 'none',
                  transition: 'all 0.4s ease',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    alignSelf: 'stretch', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px'
                  }}>
                    <Camera size={22} style={{ color: attendanceActive ? '#10b981' : '#00f2fe', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc', margin: 0 }}>Face Recognition Scanner</h3>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>Opens camera in a fullscreen modal for optimal scanning</p>
                    </div>
                    <span style={{
                      background: attendanceActive ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
                      border: `1px solid ${attendanceActive ? '#10b981' : '#6b7280'}`,
                      color: attendanceActive ? '#10b981' : '#9ca3af',
                      borderRadius: '8px', padding: '3px 12px',
                      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                    }}>{(attendanceActive || scannerBootActive) ? (scannerBootActive ? '◌ BOOTING' : '● LIVE') : '○ OFFLINE'}</span>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: '16px', alignSelf: 'stretch', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '80px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '4px' }}>LOGGED</p>
                      <p style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{recognizedStudents.length}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: '80px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '4px' }}>STATUS</p>
                      <p style={{ color: attendanceActive ? '#10b981' : '#6b7280', fontSize: '0.75rem', fontWeight: 700, lineHeight: 1, marginTop: '4px' }}>{scanStatus}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: '80px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '4px' }}>LIVENESS</p>
                      <p style={{ color: livenessStatus === 'verified' ? '#10b981' : '#f59e0b', fontSize: '0.75rem', fontWeight: 700, lineHeight: 1, marginTop: '4px' }}>{livenessStatus.toUpperCase()}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', width: '100%', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        playCyberSound('click');
                        setShowScannerModal(true);
                      }}
                      style={{
                        flex: 1, minWidth: '160px', padding: '16px 24px',
                        background: 'linear-gradient(135deg, #00f2fe, #0ea5e9)',
                        border: 'none', borderRadius: '12px',
                        color: '#000', fontWeight: 800, fontSize: '0.95rem',
                        cursor: 'pointer', letterSpacing: '0.04em',
                        boxShadow: '0 6px 24px rgba(0,242,254,0.25)',
                        transition: 'all 0.2s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      }}
                    >
                      <Camera size={18} /> Open Face Scanner
                    </button>

                    <button
                      onClick={() => {
                        playCyberSound('click');
                        setShowQrScannerModal(true);
                      }}
                      style={{
                        flex: 1, minWidth: '160px', padding: '16px 24px',
                        background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
                        border: 'none', borderRadius: '12px',
                        color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                        cursor: 'pointer', letterSpacing: '0.04em',
                        boxShadow: '0 6px 24px rgba(139, 92, 246, 0.3)',
                        transition: 'all 0.2s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <path d="M14 14h2v2h-2z" />
                        <path d="M18 18h3v3h-3z" />
                        <path d="M18 14h3v2h-3z" />
                        <path d="M14 18h2v3h-2z" />
                        <path d="M7 7h.01" />
                        <path d="M17 7h.01" />
                        <path d="M7 17h.01" />
                      </svg>
                      Scan Student QR
                    </button>
                  </div>
                </div>

                {/* Live Logs List */}
                <div className="glass-panel" style={{ padding: '28px', minHeight: '350px', maxHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={20} style={{ color: '#10b981' }} /> Logged Presence (This Session)
                  </h3>
                  
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {recognizedStudents.length === 0 ? (
                      <SmartEmptyState
                        title="Pehli class scan karo"
                        message="Face scanner kholo ya QR fallback use karo — students yahan dikhenge."
                        actionLabel="Open Face Scanner"
                        onAction={() => { playCyberSound('click'); setShowScannerModal(true); }}
                      />
                    ) : (
                      recognizedStudents.map((student, idx) => (
                        <div 
                          key={idx} 
                          className="flex-between" 
                          style={{ 
                            padding: '14px 18px', 
                            background: 'rgba(16, 185, 129, 0.05)', 
                            border: '1px solid rgba(16, 185, 129, 0.15)', 
                            borderRadius: '8px',
                            animation: 'fadeIn 0.3s ease-out'
                          }}
                        >
                          <div>
                            <h4 style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f3f4f6' }}>{student.name}</h4>
                            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '2px' }}>
                              Roll: {student.roll} | {student.dep}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className="badge badge-success" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                              {student.status}
                            </span>
                            <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '4px' }}>{student.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
