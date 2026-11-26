import { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  AlertCircle,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  QrCode,
  Monitor,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
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
  subjectLoadState,
  reloadSubjects,
  setShowScannerModal,
  setShowQrScannerModal,
  setShowKioskModal,
  setShowSmartCardModal,
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
  const [validationError, setValidationError] = useState('');

  // The subjects endpoint already scopes this list to the signed-in staff member.
  const selectableSubjects = subjects || [];
  const effectiveSelectedSubjectId = selectedSubjectId && selectableSubjects.some((s) => s.id.toString() === selectedSubjectId.toString())
    ? selectedSubjectId.toString()
    : (userRole === 'teacher' && selectableSubjects.length > 0 ? selectableSubjects[0].id.toString() : '');
  const selectedSubjectObj = selectableSubjects.find(
    (s) => s.id.toString() === effectiveSelectedSubjectId.toString()
  ) || null;

  const formattedSessionDate = sessionDate ? sessionDate.split('-').reverse().join('/') : 'Today';
  const subjectDisplayName = selectedSubjectObj
    ? `${selectedSubjectObj.name} (${selectedSubjectObj.code})`
    : (userRole !== 'admin' && currentUser?.details?.subject_name
      ? `${currentUser.details.subject_name} (${currentUser.details.subject_code || ''})`
      : '');
  const isClassReady = Boolean(effectiveSelectedSubjectId && sessionDate && sessionPeriod);

  const requireSubjectSelected = (missingMsg, onReady) => {
    if (!effectiveSelectedSubjectId) {
      setValidationError(missingMsg);
      if (playCyberSound) playCyberSound('error');
      return;
    }
    if (effectiveSelectedSubjectId !== selectedSubjectId) {
      setSelectedSubjectId(effectiveSelectedSubjectId);
    }
    onReady();
  };

  const secondaryAttendanceModes = [
    {
      id: 'manual',
      title: 'Manual Register',
      hint: 'Tick Present, Late or Absent one by one',
      icon: ClipboardCheck,
      onClick: () =>
        requireSubjectSelected(
          'Please select an active subject first to use Manual Register.',
          () => {
            setManualSubjectId(effectiveSelectedSubjectId);
            setManualDate(sessionDate);
            setManualPeriod(sessionPeriod);
            setManualAttendanceData({});
            setManualSearchQuery('');
            setIsManualAttendanceOpen(true);
            playCyberSound('click');
          }
        ),
    },
    {
      id: 'virtual-id',
      title: 'Scan Virtual ID Card',
      hint: 'Scan student digital QR / ID pass',
      icon: QrCode,
      onClick: () =>
        requireSubjectSelected(
          'Please select an active subject first to scan Virtual ID Card.',
          () => {
            setShowQrScannerModal(true);
            playCyberSound('click');
          }
        ),
    },
    {
      id: 'kiosk',
      title: 'Launch Kiosk Mode',
      hint: 'Hands-free classroom self check-in',
      icon: Monitor,
      onClick: () =>
        requireSubjectSelected(
          'Please select an active subject first to launch Classroom Kiosk Mode.',
          () => {
            if (setShowKioskModal) {
              setShowKioskModal(true);
              playCyberSound('click');
            }
          }
        ),
    },
  ];

  return (
    <>
      {!sessionActive ? (
        <div className="scanner-session-setup" style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
          <div className="golden-os-window">
            {/* macOS Golden Gate Window Titlebar */}
            <div className="golden-os-titlebar">
              <div className="golden-os-titlebar-left">
                <span className="golden-os-traffic" aria-hidden="true">
                  <span className="golden-os-dot golden-os-dot-close" />
                  <span className="golden-os-dot golden-os-dot-min" />
                  <span className="golden-os-dot golden-os-dot-zoom" />
                </span>
                <span className="golden-os-title-label">Attendance Studio</span>
              </div>
              <span className={`golden-os-status-pill ${isClassReady ? 'is-ready' : 'is-pending'}`}>
                <span aria-hidden="true">{isClassReady ? '●' : '○'}</span>
                {isClassReady ? 'Ready to Mark' : 'Pick Subject'}
              </span>
            </div>

            <div className="golden-os-body">
              {/* Clear Purpose Header */}
              <div className="golden-os-hero">
                <div className="golden-os-app-icon">
                  <Camera size={25} strokeWidth={2.2} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ fontSize: '1.28rem', fontWeight: 800, color: '#2b2112', margin: 0, lineHeight: 1.2 }}>
                    Take Class Attendance
                  </h3>
                  <p style={{ color: '#6b5b3e', fontSize: '0.84rem', margin: '4px 0 0', lineHeight: 1.4 }}>
                    Select your class, date and period below, then choose Face Scan or Manual Register to mark attendance.
                  </p>
                </div>
              </div>

              {/* Live Session Summary Chips */}
              <div className="golden-os-pill-row" aria-label="Selected attendance summary">
                <span className={`golden-os-chip ${!subjectDisplayName ? 'is-empty' : ''}`}>
                  <BookOpen size={13} />
                  <span>{subjectDisplayName || 'Subject: Not selected'}</span>
                </span>
                <span className="golden-os-chip">
                  <Calendar size={13} />
                  <span>{formattedSessionDate}</span>
                </span>
                <span className="golden-os-chip">
                  <Clock size={13} />
                  <span>{sessionPeriod}</span>
                </span>
              </div>

              {/* Step 1: Class & Period Setup */}
              <div>
                <div className="golden-os-section-label">
                  <span>Step 1 · Class &amp; Period Setup</span>
                  {selectedSubjectObj?.department && (
                    <span style={{ color: '#6b4c18', fontWeight: 700, textTransform: 'none', letterSpacing: 0 }}>
                      {selectedSubjectObj.department}
                    </span>
                  )}
                </div>

                <div className="golden-os-inset-card">
                  {/* Subject Selection */}
                  <div className="form-group" style={{ textAlign: 'left', marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#47371a', fontWeight: 700, fontSize: '0.82rem' }}>
                      <BookOpen size={14} style={{ color: '#8b6525' }} /> {userRole === 'admin' ? 'Select Active Subject' : 'Select Assigned Subject'}
                    </label>
                    {selectableSubjects.length > 0 ? (
                      <select
                        className="form-input"
                        value={effectiveSelectedSubjectId}
                        onChange={e => { setSelectedSubjectId(e.target.value); setValidationError(''); }}
                        required
                        style={{
                          background: '#fffdf8',
                          border: effectiveSelectedSubjectId ? '1px solid #c9ab6f' : '1px solid #d9b56c',
                          borderRadius: '11px',
                          fontWeight: 600,
                          color: '#2b2112',
                        }}
                      >
                        {userRole === 'admin' && <option value="">-- Select Subject --</option>}
                        {selectableSubjects.map(s => (
                          <option key={s.id} value={s.id.toString()}>
                            {s.name} ({s.code}) - {s.department}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ fontSize: '0.84rem', color: '#6b5b3e', padding: '10px 12px', background: '#faf6ec', border: '1px solid #e4d9be', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <span>
                          {subjectLoadState === 'loading' ? 'Loading subjects…' :
                            subjectLoadState === 'error' ? 'Could not load subjects.' :
                            userRole === 'admin' ? 'No subjects have been added.' : 'No subjects assigned to this account.'}
                        </span>
                        {subjectLoadState !== 'loading' && (
                          <button type="button" onClick={reloadSubjects} style={{ background: '#fff', border: '1px solid #ceb47c', color: '#6b4c18', borderRadius: '8px', padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                            Refresh subjects
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Date & Period Row */}
                  <div className="golden-os-grid-2">
                    <div className="form-group" style={{ textAlign: 'left', marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#47371a', fontWeight: 700, fontSize: '0.82rem' }}>
                        <Calendar size={14} style={{ color: '#8b6525' }} /> Class Date
                      </label>
                      <div className="date-picker-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                        <button
                          type="button"
                          onClick={() => { playCyberSound('click'); shiftDate(sessionDate, -1, setSessionDate); }}
                          style={{
                            background: '#faf5e8',
                            border: '1px solid #dfd1b1',
                            borderRadius: '10px',
                            color: '#5a431b',
                            width: '38px',
                            minWidth: '38px',
                            height: '42px',
                            flexShrink: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Previous Day"
                          aria-label="Previous Day"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <input
                          type="date"
                          className="form-input date-input-field flex-input"
                          value={sessionDate}
                          onChange={e => setSessionDate(e.target.value)}
                          required
                          style={{ background: '#fffdf8', border: '1px solid #dfd1b1', borderRadius: '10px', height: '42px', margin: 0, flex: 1, minWidth: 0, boxSizing: 'border-box', fontWeight: 600 }}
                        />
                        <button
                          type="button"
                          onClick={() => { playCyberSound('click'); shiftDate(sessionDate, 1, setSessionDate); }}
                          style={{
                            background: '#faf5e8',
                            border: '1px solid #dfd1b1',
                            borderRadius: '10px',
                            color: '#5a431b',
                            width: '38px',
                            minWidth: '38px',
                            height: '42px',
                            flexShrink: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Next Day"
                          aria-label="Next Day"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="form-group" style={{ textAlign: 'left', marginBottom: 0 }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#47371a', fontWeight: 700, fontSize: '0.82rem' }}>
                        <Clock size={14} style={{ color: '#8b6525' }} /> Period / Time Slot
                      </label>
                      <select
                        className="form-input"
                        value={sessionPeriod}
                        onChange={e => setSessionPeriod(e.target.value)}
                        required
                        style={{ background: '#fffdf8', border: '1px solid #dfd1b1', borderRadius: '10px', height: '42px', fontWeight: 600 }}
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
                  </div>

                  {/* Selected Subject Detail Strip */}
                  {(selectedSubjectObj || (userRole !== 'admin' && currentUser?.details?.subject_name)) && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fbf6ea, #f5ecd6)',
                      border: '1px solid #e2d1aa',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8rem',
                    }}>
                      <span style={{ color: '#4d3a19', fontWeight: 700 }}>
                        {selectedSubjectObj?.name || currentUser?.details?.subject_name} ({selectedSubjectObj?.code || currentUser?.details?.subject_code || 'N/A'})
                      </span>
                      <span style={{ color: '#785927', fontWeight: 700 }}>
                        {selectedSubjectObj?.department || currentUser?.details?.subject_department || 'N/A'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Warning Alert */}
              {validationError && (
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.83rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  animation: 'fadeInUp 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} />
                    <span>{validationError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValidationError('')}
                    style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 800, padding: '0 4px' }}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Step 2: Attendance Marking Actions */}
              <div>
                <div className="golden-os-section-label">
                  <span>Step 2 · Choose How to Mark Attendance</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#80602c', textTransform: 'none', letterSpacing: 0 }}>
                    <Sparkles size={12} /> AI Ready
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Hero Primary Action: Start Face Scanner */}
                  <button
                    type="button"
                    onClick={() => {
                      if (sessionDate && sessionPeriod) {
                        requireSubjectSelected(
                          'Please select an active subject from the dropdown above before starting.',
                          () => {
                            setSessionActive(true);
                            setShowScannerModal(true);
                          }
                        );
                      }
                    }}
                    className="golden-os-primary-action"
                  >
                    <span className="golden-os-primary-left">
                      <span className="golden-os-primary-icon">
                        <Camera size={20} />
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '1rem', fontWeight: 800, lineHeight: 1.2 }}>
                          Start Face Scanner
                        </span>
                        <span style={{ display: 'block', fontSize: '0.76rem', color: '#fff2d1', opacity: 0.92, marginTop: '2px' }}>
                          Live camera recognition · Fastest for full class
                        </span>
                      </span>
                    </span>
                    <span className="golden-os-primary-badge">
                      Recommended <ArrowRight size={13} />
                    </span>
                  </button>

                  {/* Unified Golden OS Alternative Modes */}
                  <div className="golden-os-mode-grid">
                    {secondaryAttendanceModes.map((mode) => {
                      const ModeIcon = mode.icon;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={mode.onClick}
                          className="golden-os-mode-card active-haptic"
                        >
                          <span className="golden-os-mode-icon">
                            <ModeIcon size={17} />
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2b2112', lineHeight: 1.25 }}>
                              {mode.title}
                            </div>
                            <div style={{ fontSize: '0.73rem', color: '#6b5b3e', marginTop: '2px', lineHeight: 1.35 }}>
                              {mode.hint}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeInUp 0.5s ease both' }}>
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
              <p style={{ color: '#7f1d1d', fontSize: '0.95rem', maxWidth: '650px', margin: '0 auto 28px auto', lineHeight: '1.6', fontFamily: 'sans-serif' }}>
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
                <div className="golden-os-window" style={{ borderRadius: '18px' }}>
                  <div className="golden-os-titlebar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="golden-os-traffic" aria-hidden="true">
                        <span className="golden-os-dot golden-os-dot-close" />
                        <span className="golden-os-dot golden-os-dot-min" />
                        <span className="golden-os-dot golden-os-dot-zoom" />
                      </span>
                      <span className="golden-os-title-label">Active Attendance Session</span>
                    </div>
                    <button
                      onClick={() => {
                        stopAttendanceCam();
                        setSessionActive(false);
                        setRecognizedStudents([]);
                      }}
                      className="btn-danger"
                      style={{ padding: '6px 14px', fontSize: '0.8rem', flexShrink: 0, borderRadius: '999px' }}
                    >
                      Close Session
                    </button>
                  </div>
                  <div style={{ padding: '14px 18px', display: 'flex', gap: '20px', fontSize: '0.88rem', textAlign: 'left', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ color: '#7a5c28', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>Active Subject</span>
                      <strong style={{ color: '#2b2112', fontSize: '0.92rem' }}>
                        {userRole === 'teacher' ? (
                          `${currentUser?.details?.subject_name} (${currentUser?.details?.subject_code})`
                        ) : (
                          `${subjects.find(s => s.id === parseInt(selectedSubjectId))?.name || 'General'} (${subjects.find(s => s.id === parseInt(selectedSubjectId))?.code || 'N/A'})`
                        )}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#7a5c28', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>Session Date</span>
                      <strong style={{ color: '#2b2112', fontSize: '0.92rem' }}>{formattedSessionDate}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#7a5c28', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>Period</span>
                      <strong style={{ color: '#785927', fontSize: '0.92rem' }}>{sessionPeriod}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Scanner Launch Card */}
              <div className="attendance-layout-grid">
                <div className="golden-os-window" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', borderColor: attendanceActive ? '#10b981' : '#dfd0ae' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e7dac0', paddingBottom: '14px' }}>
                    <span className="golden-os-mode-icon" style={{ width: '40px', height: '40px' }}>
                      <Camera size={20} style={{ color: attendanceActive ? '#059669' : '#6b4c18' }} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 800, fontSize: '1.02rem', color: '#2b2112', margin: 0 }}>Face Recognition Scanner</h3>
                      <p style={{ color: '#6b5b3e', fontSize: '0.8rem', margin: '2px 0 0' }}>Opens fullscreen AI camera modal for rapid attendance</p>
                    </div>
                    <span style={{
                      background: attendanceActive ? 'rgba(16,185,129,0.12)' : '#f4ecd9',
                      border: `1px solid ${attendanceActive ? '#10b981' : '#d5c194'}`,
                      color: attendanceActive ? '#047857' : '#6b5b3e',
                      borderRadius: '999px', padding: '4px 12px',
                      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                    }}>{(attendanceActive || scannerBootActive) ? (scannerBootActive ? '◌ BOOTING' : '● LIVE') : '○ OFFLINE'}</span>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '80px', background: '#ffffff', border: '1px solid #e4d9be', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ color: '#7a5c28', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px' }}>LOGGED</p>
                      <p style={{ color: '#059669', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{recognizedStudents.length}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: '80px', background: '#ffffff', border: '1px solid #e4d9be', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ color: '#7a5c28', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px' }}>STATUS</p>
                      <p style={{ color: attendanceActive ? '#059669' : '#5c4b2e', fontSize: '0.78rem', fontWeight: 700, lineHeight: 1, marginTop: '4px' }}>{scanStatus}</p>
                    </div>
                    <div style={{ flex: 1, minWidth: '80px', background: '#ffffff', border: '1px solid #e4d9be', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                      <p style={{ color: '#7a5c28', fontSize: '0.7rem', fontWeight: 700, marginBottom: '4px' }}>LIVENESS</p>
                      <p style={{ color: livenessStatus === 'verified' ? '#059669' : '#b45309', fontSize: '0.78rem', fontWeight: 700, lineHeight: 1, marginTop: '4px' }}>{livenessStatus.toUpperCase()}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        playCyberSound('click');
                        setShowScannerModal(true);
                      }}
                      className="golden-os-primary-action"
                      style={{ flex: '1 1 200px', padding: '13px 18px' }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                        <Camera size={18} /> Open Face Scanner
                      </span>
                      <ArrowRight size={15} />
                    </button>

                    <button
                      onClick={() => {
                        playCyberSound('click');
                        setShowQrScannerModal(true);
                      }}
                      className="golden-os-mode-card active-haptic"
                      style={{ flex: '1 1 150px', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '12px 14px' }}
                    >
                      <QrCode size={17} style={{ color: '#6b4c18' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Scan Student QR</span>
                    </button>

                    <button
                      onClick={() => {
                        playCyberSound('click');
                        if (setShowKioskModal) setShowKioskModal(true);
                      }}
                      className="golden-os-mode-card active-haptic"
                      style={{ flex: '1 1 150px', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '12px 14px' }}
                    >
                      <Monitor size={17} style={{ color: '#6b4c18' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Autonomous Kiosk</span>
                    </button>

                    <button
                      onClick={() => {
                        playCyberSound('click');
                        if (setShowSmartCardModal) setShowSmartCardModal(true);
                      }}
                      className="golden-os-mode-card active-haptic"
                      style={{ flex: '1 1 150px', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: '12px 14px', borderColor: '#bbf7d0', background: '#f5fdf8' }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#047857' }}>💳 Tap Smart Card</span>
                    </button>
                  </div>
                </div>

                {/* Live Logs List */}
                <div className="golden-os-window" style={{ padding: '24px', minHeight: '350px', maxHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#2b2112', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={20} style={{ color: '#059669' }} /> Logged Presence (This Session)
                  </h3>

                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                            padding: '12px 16px',
                            background: '#ffffff',
                            border: '1px solid #d5e6d8',
                            borderRadius: '12px',
                            animation: 'fadeIn 0.3s ease-out'
                          }}
                        >
                          <div>
                            <h4 style={{ fontWeight: 700, fontSize: '0.94rem', color: '#2b2112', margin: 0 }}>{student.name}</h4>
                            <p style={{ color: '#6b5b3e', fontSize: '0.78rem', margin: '2px 0 0' }}>
                              Roll: {student.roll} | {student.dep}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className="badge badge-success" style={{ padding: '4px 10px', fontSize: '0.74rem' }}>
                              {student.status}
                            </span>
                            <p style={{ color: '#6b5b3e', fontSize: '0.74rem', margin: '4px 0 0' }}>{student.time}</p>
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
