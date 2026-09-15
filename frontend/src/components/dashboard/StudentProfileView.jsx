import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Edit,
  LogOut,
  Plus,
  Sliders,
  Video,
  Volume2,
  VolumeX
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';
import ScannerBootOverlay from '../../ScannerBootOverlay';
import CameraAttractHud from '../animations/CameraAttractHud';

export default function StudentProfileView({
  setEditingStudentSelf,
  setEditStudentSelfError,
  setEditStudentSelfSuccess,
  setShowEditStudentSelfModal,
  setEditingTeacherSelf,
  setEditTeacherSelfError,
  setEditTeacherSelfSuccess,
  setShowEditTeacherSelfModal,
  studentVideoRef,
  studentCanvasRef,
  studentWebcamActive,
  studentWebcamBootActive,
  startStudentWebcam,
  stopStudentWebcam,
  handleStudentWebcamCapture,
  handleStudentFileSelect,
  handleStudentWebcamBootComplete,
  isUploadingSelfie,
  selfieError,
  selfieSuccess,
  hudMetrics,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordChangeError,
  passwordChangeSuccess,
  isChangingPassword,
  handleChangePassword,
  token,
  API_BASE_URL,
}) {
  const { currentUser, userRole, setCurrentUser, handleLogout } = useAuth();
  const {
    activeTheme,
    setActiveTheme,
    crtOverlayEnabled,
    setCrtOverlayEnabled,
    soundEnabled,
    setSoundEnabled,
    audioVolume,
    setAudioVolume,
    playCyberSound,
  } = useUI();

  return (
          <div style={{ display: 'grid', gridTemplateColumns: userRole === 'student' ? '1.2fr 1.8fr' : '1fr 1fr', gap: '32px', animation: 'fadeInUp 0.5s ease' }}>
            {/* Profile info left panel */}
            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '24px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0b0f19',
                  fontWeight: 700,
                  fontSize: '1.75rem',
                  boxShadow: 'var(--glow-shadow)',
                  marginBottom: '16px'
                }}>
                  {(currentUser?.name?.split(' ') || []).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{currentUser?.name}</h3>
                <span style={{ color: '#00f2fe', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Role: {userRole}
                </span>
                
                {userRole === 'student' && (
                  <>
                    <span style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '4px' }}>
                      Roll No: {currentUser?.details?.roll}
                    </span>
                    {currentUser?.details?.photo === 'yes' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 12px', borderRadius: '12px', color: '#10b981', fontSize: '0.75rem', fontWeight: 600, marginTop: '12px' }}>
                        <CheckCircle2 size={12} /> Face Registered
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '6px 12px', borderRadius: '12px', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600, marginTop: '12px' }}>
                        <AlertCircle size={12} /> Face Not Registered
                      </span>
                    )}
                  </>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {userRole === 'student' ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Department</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.dep}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Course</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.course}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Academic Year</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.year}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Semester</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.semester}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Email Address</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Phone Number</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.phone}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>DOB</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.dob}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Home Address</span>
                      <span style={{ fontWeight: 500, fontSize: '0.85rem', maxWidth: '180px', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={currentUser?.details?.address}>
                        {currentUser?.details?.address}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Mentor / Teacher</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.details?.teacher}</span>
                    </div>
                  </>
                ) : userRole === 'teacher' ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Email Address</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.email}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Assigned Subject</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.subject_name || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Subject Code</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.subject_code || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Department</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.subject_department || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Email Address</span>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{currentUser?.email}</span>
                    </div>
                  </>
                )}
              </div>

              {userRole !== 'student' ? (
                <button
                  onClick={() => {
                    setEditingTeacherSelf({
                      name: currentUser?.name || '',
                      email: currentUser?.email || '',
                      subject_name: currentUser?.subject_name || '',
                      subject_code: currentUser?.subject_code || '',
                      subject_department: currentUser?.subject_department || ''
                    });
                    setEditTeacherSelfError('');
                    setEditTeacherSelfSuccess('');
                    setShowEditTeacherSelfModal(true);
                  }}
                  className="bg-gradient-btn"
                  style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Edit size={16} /> Edit Profile Info
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEditingStudentSelf({
                      name: currentUser?.name || '',
                      phone: currentUser?.details?.phone || '',
                      address: currentUser?.details?.address || '',
                      gender: currentUser?.details?.gender || 'Male',
                      dob: currentUser?.details?.dob || ''
                    });
                    setEditStudentSelfError('');
                    setEditStudentSelfSuccess('');
                    setShowEditStudentSelfModal(true);
                  }}
                  className="bg-gradient-btn"
                  style={{
                    width: '100%',
                    marginTop: '20px',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Edit size={16} /> Edit Profile Info
                </button>
              )}

              <button
                onClick={() => { playCyberSound('click'); handleLogout(); }}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
 
            {/* Right Column Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Register Face Card (Only for Student) */}
              {userRole === 'student' && (
                <div className="glass-panel" style={{ padding: '32px' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Camera size={20} style={{ color: '#00f2fe' }} /> Register My Face Profile
                  </h3>
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '24px' }}>
                    Upload a selfie or capture live to set up secure face recognition. The system automatically validates lighting, blur, and face presence.
                  </p>

                  {selfieError && (
                    <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem', marginBottom: '20px' }}>
                      <AlertCircle size={16} />
                      <span>{selfieError}</span>
                    </div>
                  )}

                  {selfieSuccess && (
                    <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#10b981', fontSize: '0.875rem', marginBottom: '20px' }}>
                      <CheckCircle2 size={16} />
                      <span>{selfieSuccess}</span>
                    </div>
                  )}

                  {(studentWebcamActive || studentWebcamBootActive) ? (
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div className="scanner-container" style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto', aspectRatio: '4/3', background: '#111827', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="scanner-bracket bracket-tl" />
                        <div className="scanner-bracket bracket-tr" />
                        <div className="scanner-bracket bracket-bl" />
                        <div className="scanner-bracket bracket-br" />
                        {studentWebcamActive && !studentWebcamBootActive && (
                          <div style={{ position: 'absolute', left: 0, width: '100%', height: '2px', background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)', zIndex: 5, animation: 'scan 3s linear infinite' }} />
                        )}

                        <ScannerBootOverlay
                          active={studentWebcamBootActive}
                          onComplete={handleStudentWebcamBootComplete}
                          label="STUD_REG_02"
                          lines={[
                            'INITIALIZING SELFIE OPTICS...',
                            'VALIDATING LIGHTING MATRIX...',
                            'LOADING FACE MESH ENGINE...',
                            'PREPARING BIOMETRIC CAPTURE...',
                            'STUD_REG_02 ONLINE — READY',
                          ]}
                        />

                        {studentWebcamActive && !studentWebcamBootActive && (
                          <div className="scanner-live-hud">
                            <div className="scanner-live-grid" />
                            <div className="scanner-live-radar-mini" />
                            <div className="scanner-live-status">● SELFIE CAPTURE MODE</div>
                          </div>
                        )}

                        <CameraAttractHud
                          active={studentWebcamActive && !studentWebcamBootActive}
                          mode="selfie"
                        />
                        
                        {/* HUD Sci-Fi telemetry overlay */}
                        {studentWebcamActive && !studentWebcamBootActive && (
                          <>
                            <div style={{
                              position: 'absolute',
                              top: '12px',
                              left: '12px',
                              zIndex: 10,
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                              color: 'var(--color-primary)',
                              background: 'rgba(5, 10, 20, 0.65)',
                              backdropFilter: 'blur(4px)',
                              border: '1px solid var(--border-color-glow)',
                              borderRadius: '4px',
                              padding: '8px 12px',
                              pointerEvents: 'none',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                              textAlign: 'left'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '6px', height: '6px', background: '#10b981', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                                <span style={{ fontWeight: 'bold' }}>AI MATRIX REG v1.4.2</span>
                              </div>
                              <div>SYS_STATE: <span style={{ color: '#fff' }}>SELFIE_CAPTURE</span></div>
                              <div>SYS_FPS: <span style={{ color: '#fff' }}>{hudMetrics.fps}</span></div>
                              <div>SYS_LIGHT: <span style={{ color: '#fff' }}>{hudMetrics.lighting}</span></div>
                              <div>SYS_QUALITY: <span style={{ color: '#fff' }}>{hudMetrics.quality}</span></div>
                            </div>
                            <div style={{
                              position: 'absolute',
                              bottom: '12px',
                              right: '12px',
                              zIndex: 10,
                              fontFamily: 'monospace',
                              fontSize: '0.65rem',
                              color: 'rgba(255,255,255,0.4)',
                              pointerEvents: 'none'
                            }}>
                              LOC: STUD_REG_02
                            </div>
                          </>
                        )}

                        <video 
                          ref={studentVideoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className={studentWebcamBootActive ? 'scanner-video-booting' : ''}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: 'scaleX(-1)',
                            display: (studentWebcamActive || studentWebcamBootActive) ? 'block' : 'none',
                          }} 
                        />
                        <canvas ref={studentCanvasRef} style={{ display: 'none' }} />
                      </div>
                      
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                        <button 
                          onClick={handleStudentWebcamCapture} 
                          className="bg-gradient-btn" 
                          style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem' }}
                          disabled={isUploadingSelfie}
                        >
                          {isUploadingSelfie ? 'Verifying...' : 'Capture & Register'}
                        </button>
                        <button 
                          onClick={stopStudentWebcam} 
                          className="btn-secondary" 
                          style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                      <button 
                        onClick={startStudentWebcam} 
                        className="btn-secondary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', border: '1px solid rgba(0,242,254,0.3)', background: 'rgba(0,242,254,0.05)', color: '#00f2fe' }}
                        disabled={isUploadingSelfie}
                      >
                        <Video size={16} />
                        Use Live Webcam
                      </button>

                      <label 
                        className="btn-secondary"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', cursor: 'pointer', borderColor: 'rgba(255,255,255,0.1)' }}
                      >
                        <Plus size={16} />
                        Upload Selfie Image
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }} 
                          onChange={handleStudentFileSelect}
                          disabled={isUploadingSelfie}
                        />
                      </label>
                    </div>
                  )}

                  {isUploadingSelfie && (
                    <div style={{ color: '#00f2fe', fontSize: '0.85rem', textAlign: 'center', animation: 'pulse 1s infinite' }}>
                      Analyzing selfie quality (lighting, focus, face count)... Please wait...
                    </div>
                  )}
                </div>
              )}

              {/* Student Personal Preferences & Privacy Consent Panel */}
              {userRole === 'student' && (
                <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                      <Sliders size={20} style={{ color: 'var(--color-primary)' }} /> Personal Preferences & Privacy
                    </h3>
                    <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
                      Customize your active interface theme, interactive audio, and biometric consent.
                    </p>
                  </div>

                  {/* Themes and CRT Toggle */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem' }}>Interface Theme</label>
                      <select 
                        value={activeTheme} 
                        onChange={(e) => {
                          setActiveTheme(e.target.value);
                          playCyberSound('click');
                        }}
                        className="form-input"
                        style={{ 
                          width: '100%', 
                          background: 'var(--bg-secondary)', 
                          border: '1px solid var(--border-color)', 
                          color: 'var(--color-text-main)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="cyberpunk">Cyberpunk Neon</option>
                        <option value="matrix">Matrix Green</option>
                        <option value="obsidian">Obsidian Red</option>
                        <option value="violet">Deep Space Violet</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div>
                        <span style={{ fontWeight: 600, display: 'block', fontSize: '0.8rem', color: '#f8fafc' }}>CRT Terminal lines</span>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Enable terminal scanlines</span>
                      </div>
                      <div 
                        onClick={() => {
                          setCrtOverlayEnabled(!crtOverlayEnabled);
                          playCyberSound('click');
                        }} 
                        style={{
                          width: '42px',
                          height: '22px',
                          backgroundColor: crtOverlayEnabled ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${crtOverlayEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '50px',
                          padding: '2px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'var(--transition)'
                        }}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: crtOverlayEnabled ? 'var(--color-primary)' : '#94a3b8',
                          transform: crtOverlayEnabled ? 'translateX(20px)' : 'translateX(0px)',
                          transition: 'var(--transition)'
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Audio Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontWeight: 600, display: 'block', fontSize: '0.8rem', color: '#f8fafc' }}>Sound Cues</span>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Enable cyber sounds</span>
                      </div>
                      <div 
                        onClick={() => {
                          const newSound = !soundEnabled;
                          setSoundEnabled(newSound);
                          localStorage.setItem('soundEnabled', newSound);
                          if (newSound) {
                            setTimeout(() => playCyberSound('click'), 50);
                          }
                        }} 
                        style={{
                          width: '42px',
                          height: '22px',
                          backgroundColor: soundEnabled ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${soundEnabled ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                          borderRadius: '50px',
                          padding: '2px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'var(--transition)'
                        }}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          backgroundColor: soundEnabled ? 'var(--color-primary)' : '#94a3b8',
                          transform: soundEnabled ? 'translateX(20px)' : 'translateX(0px)',
                          transition: 'var(--transition)'
                        }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />} Synth Volume: {Math.round(audioVolume * 100)}%
                      </span>
                      <input 
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={audioVolume}
                        disabled={!soundEnabled}
                        onChange={(e) => {
                          const vol = parseFloat(e.target.value);
                          setAudioVolume(vol);
                          localStorage.setItem('audioVolume', vol);
                        }}
                        onMouseUp={() => { if (soundEnabled) playCyberSound('click'); }}
                        onTouchEnd={() => { if (soundEnabled) playCyberSound('click'); }}
                        style={{ 
                          width: '100%', 
                          accentColor: 'var(--color-primary)', 
                          height: '4px', 
                          borderRadius: '2px', 
                          cursor: soundEnabled ? 'pointer' : 'not-allowed',
                          opacity: soundEnabled ? 1 : 0.5
                        }}
                      />
                    </div>
                  </div>

                  {/* Biometric Privacy and Consent Revoke */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontWeight: 600, display: 'block', fontSize: '0.8rem', color: '#f8fafc', textAlign: 'left' }}>Biometric Data Privacy (DPDP Act Compliance)</span>
                    
                    {currentUser?.details?.photo === 'yes' ? (
                      <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '8px', padding: '12px', fontSize: '0.78rem', color: '#10b981', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <CheckCircle2 size={14} /> Active Biometric Consent
                        </div>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.75rem', lineHeight: '1.4' }}>
                          Your 128D facial representation vector is securely stored. You have consented to biometric attendance logs.
                        </p>
                        <button
                          onClick={async () => {
                            if (!window.confirm('WARNING: Revoking consent will permanently delete your facial templates from our server. You will not be able to mark attendance via face scanner until you re-register. Do you want to proceed?')) return;
                            try {
                              const res = await fetch(`${API_BASE_URL}/users/students/me/revoke-consent`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` }
                              });
                              if (!res.ok) throw new Error('Revocation failed');
                              playCyberSound('success');
                              setCurrentUser(prev => ({
                                ...prev,
                                details: { ...prev.details, photo: 'no' }
                              }));
                              localStorage.setItem('biometric_consent', 'false');
                              alert('Your biometric profile has been deleted and consent has been revoked.');
                            } catch (e) {
                              playCyberSound('error');
                              alert('Error: ' + e.message);
                            }
                          }}
                          className="btn-secondary"
                          style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', borderRadius: '6px', cursor: 'pointer', marginTop: '4px' }}
                        >
                          Revoke Consent & Delete Face
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '8px', padding: '12px', fontSize: '0.78rem', color: '#f59e0b', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                          <AlertCircle size={14} /> Consent Revoked / Face Not Enrolled
                        </div>
                        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.75rem', lineHeight: '1.4' }}>
                          No biometric facial metrics are saved on the server. Please register your face template using the webcam capture card above to enable attendance features.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Change Password Block */}
              <div className="glass-panel" style={{ padding: '32px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px' }}>Change Account Password</h3>
                
                {passwordChangeError && (
                  <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#ef4444', fontSize: '0.875rem', marginBottom: '20px' }}>
                    <AlertCircle size={16} />
                    <span>{passwordChangeError}</span>
                  </div>
                )}

                {passwordChangeSuccess && (
                  <div className="flex-center" style={{ gap: '8px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', color: '#10b981', fontSize: '0.875rem', marginBottom: '20px' }}>
                    <CheckCircle2 size={16} />
                    <span>{passwordChangeSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label className="form-label">{userRole === 'student' ? 'Current Password / Default Roll No' : 'Current Password'}</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Enter current password" 
                      value={oldPassword} 
                      onChange={e => setOldPassword(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '20px' }}>
                    <label className="form-label">New Password</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Enter new password (min 4 characters)" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)}
                      required 
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '20px', marginBottom: '32px' }}>
                    <label className="form-label">Confirm New Password</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Retype new password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)}
                      required 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="bg-gradient-btn" 
                    style={{ width: '100%', padding: '14px', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem' }}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          </div>
  );
}
