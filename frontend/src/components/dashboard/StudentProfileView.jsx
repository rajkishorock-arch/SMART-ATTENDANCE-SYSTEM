import { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Edit,
  LogOut,
  Sliders,
  Video,
  Volume2,
  VolumeX,
  User,
  Lock,
  Save,
  RefreshCw,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';
import { getInitials } from '../../utils/attendanceDateUtils';

const VALID_PROFILE_SECTIONS = ['details', 'edit', 'security', 'biometrics', 'preferences'];

export default function StudentProfileView({
  activeSection = null,
  onSelectSection = null,
  studentVideoRef,
  studentCanvasRef,
  studentWebcamActive,
  studentWebcamBootActive,
  startStudentWebcam,
  stopStudentWebcam,
  handleStudentWebcamCapture,
  handleStudentWebcamBootComplete,
  isUploadingSelfie,
  selfieError,
  selfieSuccess,
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
  const { currentUser, userRole, setCurrentUser, handleLogout, fetchSessionInfo } = useAuth();
  const {
    soundEnabled,
    setSoundEnabled,
    audioVolume,
    setAudioVolume,
    playCyberSound,
  } = useUI();

  const [localSection, setLocalSection] = useState(null);
  const currentSection = onSelectSection ? activeSection : localSection;

  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.details?.phone || currentUser?.phone || '');
  const [editBio, setEditBio] = useState(currentUser?.details?.bio || currentUser?.bio || '');
  const [editDepartment, setEditDepartment] = useState(currentUser?.details?.dep || currentUser?.details?.department || currentUser?.department || '');
  const [editAddress, setEditAddress] = useState(currentUser?.details?.address || '');
  const [editDob, setEditDob] = useState(currentUser?.details?.dob || '');
  const [editGender, setEditGender] = useState(currentUser?.details?.gender || 'Male');

  const goSection = (next) => {
    if (typeof playCyberSound === 'function') playCyberSound('click');
    const normalized = VALID_PROFILE_SECTIONS.includes(next) ? next : null;
    if (normalized === 'edit' && currentUser) {
      setEditName(currentUser?.name || '');
      setEditPhone(currentUser?.details?.phone || currentUser?.phone || '');
      setEditBio(currentUser?.details?.bio || currentUser?.bio || '');
      setEditDepartment(currentUser?.details?.dep || currentUser?.details?.department || currentUser?.department || '');
      setEditAddress(currentUser?.details?.address || '');
      setEditDob(currentUser?.details?.dob || '');
      setEditGender(currentUser?.details?.gender || 'Male');
    }
    if (onSelectSection) onSelectSection(normalized);
    else setLocalSection(normalized);
  };

  useEffect(() => {
    if (token && typeof fetchSessionInfo === 'function') {
      fetchSessionInfo(token);
    }
  }, [token, fetchSessionInfo]);

  const [profileSaveSuccess, setProfileSaveSuccess] = useState('');
  const [profileSaveError, setProfileSaveError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [cacheNotice, setCacheNotice] = useState('');

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadMsg, setPhotoUploadMsg] = useState('');
  const [photoUploadError, setPhotoUploadError] = useState('');
  const fileInputRef = useRef(null);

  const profilePicUrl = currentUser?.details?.profile_pic || currentUser?.profile_pic;
  const instName =
    currentUser?.institution_name ||
    currentUser?.details?.institution_name ||
    (Number(currentUser?.institution_id) === 5 ? 'RIT Mumbai' : 'Default Institution');
  const instSlug =
    currentUser?.institution_slug ||
    currentUser?.details?.institution_slug ||
    (Number(currentUser?.institution_id) === 5 ? 'rit' : 'default');
  const roleLabel =
    userRole === 'admin'
      ? 'Primary Administrator'
      : userRole === 'teacher'
        ? 'Faculty Member'
        : 'Student';

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploadError('');
    if (!file.type.startsWith('image/')) {
      setPhotoUploadError('Please upload a valid image file (JPG, PNG, WebP).');
      if (typeof playCyberSound === 'function') playCyberSound('error');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoUploadMsg('Uploading photo...');

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.onload = (event) => {
          const img = new Image();
          img.onerror = () => reject(new Error('Failed to load image preview'));
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const size = 256;
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext('2d');
              const minDim = Math.min(img.width, img.height);
              const sx = (img.width - minDim) / 2;
              const sy = (img.height - minDim) / 2;
              ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
              resolve(canvas.toDataURL('image/jpeg', 0.85));
            } catch (canvasErr) {
              reject(canvasErr);
            }
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });

      const effectiveApiUrl = API_BASE_URL || (typeof window !== 'undefined' && window.location.origin) || '';
      const res = await fetch(`${effectiveApiUrl}/users/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profile_pic: dataUrl }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to update profile picture.');
      }

      const resData = await res.json().catch(() => ({}));
      setCurrentUser(prev => ({
        ...prev,
        profile_pic: dataUrl,
        institution_name: resData.institution_name || prev?.institution_name,
        institution_slug: resData.institution_slug || prev?.institution_slug,
        details: { ...prev?.details, profile_pic: dataUrl },
      }));

      try {
        const cached = JSON.parse(localStorage.getItem('cached_user') || '{}');
        cached.profile_pic = dataUrl;
        if (resData.institution_name) cached.institution_name = resData.institution_name;
        if (resData.institution_slug) cached.institution_slug = resData.institution_slug;
        if (!cached.details) cached.details = {};
        cached.details.profile_pic = dataUrl;
        localStorage.setItem('cached_user', JSON.stringify(cached));
      } catch { /* optional */ }

      if (typeof playCyberSound === 'function') playCyberSound('success');
      setPhotoUploadMsg('Profile photo updated.');
      setTimeout(() => setPhotoUploadMsg(''), 3500);
    } catch (err) {
      if (typeof playCyberSound === 'function') playCyberSound('error');
      setPhotoUploadError(err.message || 'Error uploading photo');
      setPhotoUploadMsg('');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setProfileSaveSuccess('');
    setProfileSaveError('');
    setIsSavingProfile(true);

    try {
      const payload = {
        name: editName.trim(),
        phone: editPhone.trim(),
        bio: editBio.trim(),
        department: editDepartment.trim(),
        address: editAddress.trim(),
        dob: editDob.trim(),
        gender: editGender,
      };

      const res = await fetch(`${API_BASE_URL}/users/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update profile.');
      }

      setCurrentUser(prev => ({
        ...prev,
        name: payload.name,
        phone: payload.phone,
        bio: payload.bio,
        department: payload.department,
        details: {
          ...prev?.details,
          name: payload.name,
          phone: payload.phone,
          bio: payload.bio,
          dep: payload.department,
          department: payload.department,
          address: payload.address,
          dob: payload.dob,
          gender: payload.gender,
        },
      }));

      try {
        const cached = JSON.parse(localStorage.getItem('cached_user') || '{}');
        cached.name = payload.name;
        if (cached.details) {
          cached.details.name = payload.name;
          cached.details.phone = payload.phone;
          cached.details.dep = payload.department;
        }
        localStorage.setItem('cached_user', JSON.stringify(cached));
      } catch { /* optional */ }

      if (typeof playCyberSound === 'function') playCyberSound('success');
      setProfileSaveSuccess('Profile updated successfully.');
      setTimeout(() => {
        setProfileSaveSuccess('');
        goSection('details');
      }, 900);
    } catch (err) {
      if (typeof playCyberSound === 'function') playCyberSound('error');
      setProfileSaveError(err.message || 'Failed to save changes');
    } finally {
      setIsSavingProfile(false);
    }
  };

  /* ===== DEDICATED PAGE 1: PERSONAL & INSTITUTIONAL DETAILS ===== */
  if (currentSection === 'details') {
    const infoRows = [
      { label: 'Full Legal Name', value: currentUser?.name || 'Not set' },
      { label: 'Email Address', value: currentUser?.email || 'Not set' },
      { label: 'Phone Number', value: currentUser?.details?.phone || currentUser?.phone || 'Not set' },
      { label: 'Account Role', value: roleLabel },
      { label: 'Institution', value: instName },
      { label: 'Workspace Code', value: instSlug },
      ...(userRole === 'student'
        ? [
            { label: 'Roll Number', value: currentUser?.details?.roll || 'N/A' },
            { label: 'Department / Branch', value: currentUser?.details?.dep || 'Unassigned' },
            {
              label: 'Program & Year',
              value: currentUser?.details?.course
                ? `${currentUser.details.course}${currentUser?.details?.year ? ` (${currentUser.details.year})` : ''}`
                : 'Not set',
            },
          ]
        : [
            {
              label: 'Department / Division',
              value: currentUser?.department || currentUser?.details?.department || 'Administration',
            },
          ]),
    ];

    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={13} />
                <span>Personal &amp; Institutional Details</span>
              </div>

              {infoRows.map((row, idx) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '7px 0',
                    borderBottom: idx < infoRows.length - 1 ? '1px solid #f2ead9' : 'none',
                    fontSize: '0.84rem',
                  }}
                >
                  <span style={{ color: '#6b5b3e', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right', overflowWrap: 'anywhere' }}>
                    {row.value}
                  </span>
                </div>
              ))}

              {(currentUser?.bio || currentUser?.details?.bio) && (
                <div style={{ marginTop: '4px', padding: '10px 12px', background: '#faf8f2', borderRadius: '10px', border: '1px solid #ede4d2', fontSize: '0.82rem', color: '#3b3324', lineHeight: 1.45 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#785927', textTransform: 'uppercase', marginBottom: '3px' }}>
                    Bio / Role Note
                  </div>
                  {currentUser?.bio || currentUser?.details?.bio}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => goSection(null)}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '10px 16px', borderRadius: '11px' }}
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => goSection('edit')}
                className="golden-os-primary-action"
                style={{ width: 'auto', padding: '10px 18px', borderRadius: '11px', fontSize: '0.84rem', gap: '6px' }}
              >
                <Edit size={14} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED PAGE 2: EDIT PROFILE & CONTACT INFO ===== */
  if (currentSection === 'edit') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {profileSaveSuccess && (
              <div role="status" className="feedback-banner is-success">
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{profileSaveSuccess}</span>
              </div>
            )}
            {profileSaveError && (
              <div role="alert" className="feedback-banner is-error">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{profileSaveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="golden-os-form-section" style={{ gap: '12px' }}>
              <div className="golden-os-form-section-title">Edit Account Credentials</div>

              <div>
                <label className="golden-os-field-label">Full Name *</label>
                <input
                  type="text"
                  className="golden-os-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="golden-os-field-label">Email Address</label>
                <input
                  type="email"
                  className="golden-os-input"
                  value={currentUser?.email || ''}
                  disabled
                  style={{ background: '#f5f1e6', color: '#6b5b3e', cursor: 'not-allowed' }}
                />
              </div>

              <div>
                <label className="golden-os-field-label">Contact Phone</label>
                <input
                  type="tel"
                  className="golden-os-input"
                  placeholder="e.g. +91 9876543210"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                />
              </div>

              {userRole !== 'student' ? (
                <div>
                  <label className="golden-os-field-label">Department / Division</label>
                  <input
                    type="text"
                    className="golden-os-input"
                    placeholder="e.g. Administration"
                    value={editDepartment}
                    onChange={e => setEditDepartment(e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div className="golden-os-fields-2">
                    <div>
                      <label className="golden-os-field-label">Date of Birth</label>
                      <input
                        type="date"
                        className="golden-os-input"
                        value={editDob}
                        onChange={e => setEditDob(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="golden-os-field-label">Gender</label>
                      <select
                        className="golden-os-input"
                        value={editGender}
                        onChange={e => setEditGender(e.target.value)}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="golden-os-field-label">Residential Address</label>
                    <textarea
                      rows={2}
                      className="golden-os-input"
                      placeholder="Enter street and city address"
                      value={editAddress}
                      onChange={e => setEditAddress(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="golden-os-field-label">Bio / Role Note</label>
                <input
                  type="text"
                  className="golden-os-input"
                  placeholder="e.g. Campus Administrator"
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => goSection(null)}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '10px 16px', borderRadius: '11px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="golden-os-primary-action"
                  style={{ width: 'auto', padding: '10px 20px', borderRadius: '11px', fontSize: '0.84rem', gap: '7px' }}
                >
                  <Save size={15} />
                  <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED PAGE 3: SECURITY & CHANGE PASSWORD ===== */
  if (currentSection === 'security') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {passwordChangeError && (
              <div role="alert" className="feedback-banner is-error">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{passwordChangeError}</span>
              </div>
            )}
            {passwordChangeSuccess && (
              <div role="status" className="feedback-banner is-success">
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{passwordChangeSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="golden-os-form-section" style={{ gap: '12px' }}>
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={13} />
                <span>Change Account Password</span>
              </div>

              <div>
                <label className="golden-os-field-label">
                  {userRole === 'student' ? 'Current Password / Default Roll No *' : 'Current Password *'}
                </label>
                <input
                  type="password"
                  className="golden-os-input"
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="golden-os-field-label">New Password (min 6 characters) *</label>
                <input
                  type="password"
                  className="golden-os-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="golden-os-field-label">Confirm New Password *</label>
                <input
                  type="password"
                  className="golden-os-input"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => goSection(null)}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '10px 16px', borderRadius: '11px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="golden-os-primary-action"
                  style={{ width: 'auto', padding: '10px 20px', borderRadius: '11px', fontSize: '0.84rem' }}
                >
                  <span>{isChangingPassword ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED PAGE 4: STUDENT BIOMETRIC FACE PROFILE ===== */
  if (currentSection === 'biometrics' && userRole === 'student') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {selfieError && (
              <div role="alert" className="feedback-banner is-error">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{selfieError}</span>
              </div>
            )}
            {selfieSuccess && (
              <div role="status" className="feedback-banner is-success">
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{selfieSuccess}</span>
              </div>
            )}

            <div className="golden-os-form-section" style={{ gap: '12px' }}>
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Camera size={13} />
                <span>Biometric Face Profile</span>
              </div>

              {(studentWebcamActive || studentWebcamBootActive) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                  <div className="golden-os-camera-frame">
                    <video
                      ref={studentVideoRef}
                      autoPlay
                      playsInline
                      muted
                      onPlaying={handleStudentWebcamBootComplete}
                      style={{ transform: 'scaleX(-1)' }}
                    />
                    <div className="enroll-guide" aria-hidden="true" />
                    <canvas ref={studentCanvasRef} style={{ display: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '360px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleStudentWebcamCapture}
                      disabled={isUploadingSelfie}
                      style={{
                        flex: '2 1 160px',
                        padding: '11px 16px',
                        borderRadius: '11px',
                        background: 'linear-gradient(135deg, #059669, #047857)',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        cursor: isUploadingSelfie ? 'not-allowed' : 'pointer',
                        opacity: isUploadingSelfie ? 0.7 : 1,
                      }}
                    >
                      {isUploadingSelfie ? 'Validating Face...' : 'Capture & Save Face'}
                    </button>
                    <button
                      type="button"
                      onClick={stopStudentWebcam}
                      className="golden-os-feedback-filter-btn"
                      style={{ flex: '1 1 90px', padding: '11px 14px', borderRadius: '11px', fontSize: '0.84rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startStudentWebcam}
                  className="golden-os-primary-action"
                  style={{ width: '100%', padding: '12px', borderRadius: '11px', fontSize: '0.86rem', fontWeight: 700, gap: '7px' }}
                >
                  <Video size={16} />
                  <span>Open Live Camera</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED PAGE 5: INTERFACE & AUDIO CONTROLS ===== */
  if (currentSection === 'preferences') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {cacheNotice && (
              <div role="status" className="feedback-banner is-success">
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{cacheNotice}</span>
              </div>
            )}

            <div className="golden-os-form-section" style={{ gap: '14px' }}>
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={13} />
                <span>Interface &amp; Audio Controls</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid #f2ead9' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#25231f' }}>Sound Feedback</span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={e => {
                    setSoundEnabled(e.target.checked);
                    try { localStorage.setItem('soundEnabled', e.target.checked); } catch { /* ignore */ }
                  }}
                  style={{ width: '18px', height: '18px', accentColor: '#785927', cursor: 'pointer' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.84rem', color: '#6b5b3e', fontWeight: 600 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} Audio Volume
                  </span>
                  <span style={{ color: '#25231f', fontWeight: 800 }}>{Math.round(audioVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={audioVolume}
                  disabled={!soundEnabled}
                  onChange={e => {
                    const vol = parseFloat(e.target.value);
                    setAudioVolume(vol);
                    try { localStorage.setItem('audioVolume', vol); } catch { /* ignore */ }
                  }}
                  style={{ width: '100%', accentColor: '#785927' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', paddingTop: '8px', borderTop: '1px solid #f2ead9' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof playCyberSound === 'function') playCyberSound('click');
                    try {
                      Object.keys(localStorage).forEach(k => {
                        if (k.startsWith('cached_disputes') || k.startsWith('cached_borderline')) {
                          localStorage.removeItem(k);
                        }
                      });
                    } catch { /* ignore */ }
                    setCacheNotice('Temporary UI cache cleared.');
                    setTimeout(() => setCacheNotice(''), 3000);
                  }}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '9px 14px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} />
                  <span>Clear Temp Cache</span>
                </button>

                <button
                  type="button"
                  onClick={() => goSection(null)}
                  className="golden-os-primary-action"
                  style={{ width: 'auto', padding: '10px 18px', borderRadius: '11px', fontSize: '0.84rem' }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== MAIN MY PROFILE HUB (GOLDEN GATE CLEAN OVERVIEW + CONTROLS) ===== */
  const menuItems = [
    { key: 'details', label: 'Personal & Institutional Details', icon: User, onClick: () => goSection('details') },
    { key: 'edit', label: 'Edit Profile & Contact Info', icon: Edit, onClick: () => goSection('edit') },
    { key: 'security', label: 'Security & Change Password', icon: Lock, onClick: () => goSection('security') },
    ...(userRole === 'student'
      ? [{ key: 'biometrics', label: 'Biometric Face Profile', icon: Camera, onClick: () => goSection('biometrics') }]
      : []),
    { key: 'preferences', label: 'Interface & Audio Controls', icon: Sliders, onClick: () => goSection('preferences') },
  ];

  return (
    <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Clean Golden Gate Identity Card (No purple boxes, no floating offset camera button) */}
      <div
        className="golden-os-window"
        style={{
          background: 'linear-gradient(155deg, #fffdf8 0%, #f6ecd5 100%)',
          border: '1.5px solid #dcc89b',
        }}
      >
        <div className="golden-os-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Fixed-size avatar box anchors camera badge tightly to corner */}
            <div className="golden-os-avatar-wrap">
              <div
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '20px',
                  background: profilePicUrl ? '#ffffff' : 'linear-gradient(135deg, #785927, #5c4218)',
                  border: '2px solid #cbb179',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fffdf8',
                  fontWeight: 800,
                  fontSize: '1.55rem',
                  overflow: 'hidden',
                }}
              >
                {profilePicUrl ? (
                  <img
                    src={profilePicUrl}
                    alt={currentUser?.name || 'User Avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  getInitials(currentUser?.name, 'U')
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Change Profile Picture"
                aria-label="Change Profile Picture"
                disabled={isUploadingPhoto}
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '28px',
                  height: '28px',
                  padding: 0,
                  borderRadius: '50%',
                  background: '#785927',
                  border: '2px solid #fffdf8',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(89, 64, 25, 0.25)',
                }}
              >
                <Camera size={13} color="#ffffff" />
              </button>
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#785927' }}>
                {roleLabel} · {instName}
              </div>
              <h2 style={{ fontSize: '1.22rem', fontWeight: 800, color: '#25231f', margin: '2px 0 0', overflowWrap: 'anywhere' }}>
                {currentUser?.name || 'User Profile'}
              </h2>
              <div style={{ fontSize: '0.82rem', color: '#6b5b3e', fontWeight: 500, marginTop: '2px', overflowWrap: 'anywhere' }}>
                {currentUser?.email}
              </div>
            </div>
          </div>

          {photoUploadMsg && (
            <div role="status" className="feedback-banner is-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{photoUploadMsg}</span>
            </div>
          )}

          {photoUploadError && (
            <div role="alert" className="feedback-banner is-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{photoUploadError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Organized Single-Line Profile Controls */}
      <div>
        <div style={{ padding: '0 4px 8px' }}>
          <span className="golden-os-field-label" style={{ marginBottom: 0 }}>Account &amp; Profile Controls</span>
        </div>
        <div className="golden-os-list-shell">
          {menuItems.map((item) => {
            const RowIcon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className="golden-os-list-row"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div className="golden-os-avatar">
                    <RowIcon size={16} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1, fontSize: '0.9rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </div>
                </div>
                <ChevronRight size={17} style={{ color: '#8f7b58', flexShrink: 0 }} />
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              if (typeof playCyberSound === 'function') playCyberSound('click');
              handleLogout();
            }}
            className="golden-os-list-row"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
              <div className="golden-os-avatar" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
                <LogOut size={16} />
              </div>
              <div style={{ minWidth: 0, flex: 1, fontSize: '0.9rem', fontWeight: 700, color: '#b91c1c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Sign Out
              </div>
            </div>
            <ChevronRight size={17} style={{ color: '#b91c1c', flexShrink: 0 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
