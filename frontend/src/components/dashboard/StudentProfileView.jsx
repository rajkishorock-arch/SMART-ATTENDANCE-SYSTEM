import { useState, useRef } from 'react';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Edit,
  LogOut,
  Sliders,
  Video,
  Volume2,
  VolumeX,
  User,
  Mail,
  Phone,
  Building,
  ShieldCheck,
  Upload,
  Lock,
  Sparkles,
  Save,
  X
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

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.details?.phone || currentUser?.phone || '');
  const [editBio, setEditBio] = useState(currentUser?.details?.bio || currentUser?.bio || '');
  const [editDepartment, setEditDepartment] = useState(currentUser?.details?.dep || currentUser?.details?.department || currentUser?.department || '');
  const [editAddress, setEditAddress] = useState(currentUser?.details?.address || '');
  const [editDob, setEditDob] = useState(currentUser?.details?.dob || '');
  const [editGender, setEditGender] = useState(currentUser?.details?.gender || 'Male');

  const [profileSaveSuccess, setProfileSaveSuccess] = useState('');
  const [profileSaveError, setProfileSaveError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Profile Picture Upload State
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoUploadMsg, setPhotoUploadMsg] = useState('');
  const fileInputRef = useRef(null);

  const profilePicUrl = currentUser?.details?.profile_pic || currentUser?.profile_pic;

  // Handle Profile Picture File Change
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoUploadMsg('');

    try {
      // Resize with canvas to 256x256 for fast upload and storage
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');

          // Center crop to square
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

          // Upload to profile photo endpoint
          const res = await fetch(`${API_BASE_URL}/users/profile/me`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ profile_pic: dataUrl })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || 'Failed to update profile picture.');
          }

          // Update local state immediately
          setCurrentUser(prev => ({
            ...prev,
            profile_pic: dataUrl,
            details: { ...prev?.details, profile_pic: dataUrl }
          }));

          // Update cached user in localStorage
          try {
            const cached = JSON.parse(localStorage.getItem('cached_user') || '{}');
            cached.profile_pic = dataUrl;
            if (cached.details) cached.details.profile_pic = dataUrl;
            localStorage.setItem('cached_user', JSON.stringify(cached));
          } catch { /* optional */ }

          if (typeof playCyberSound === 'function') playCyberSound('success');
          setPhotoUploadMsg('Profile picture updated successfully!');
          setTimeout(() => setPhotoUploadMsg(''), 3000);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      if (typeof playCyberSound === 'function') playCyberSound('error');
      alert(err.message || 'Error uploading photo');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Save Profile Changes
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
        gender: editGender
      };

      const res = await fetch(`${API_BASE_URL}/users/profile/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update profile.');
      }

      // Update in-memory currentUser
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
          gender: payload.gender
        }
      }));

      // Update cached user in localStorage
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
      setProfileSaveSuccess('Profile details saved successfully!');
      setTimeout(() => {
        setProfileSaveSuccess('');
        setIsEditingProfile(false);
      }, 1500);
    } catch (err) {
      if (typeof playCyberSound === 'function') playCyberSound('error');
      setProfileSaveError(err.message || 'Failed to save changes');
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      
      {/* Top Hero Profile Banner */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Avatar with Camera Overlay */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: profilePicUrl ? 'transparent' : 'linear-gradient(135deg, #0284c7, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '2.2rem',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.25)',
              border: '3px solid #ffffff'
            }}>
              {profilePicUrl ? (
                <img
                  src={profilePicUrl}
                  alt={currentUser?.name || 'User Avatar'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                (currentUser?.name?.split(' ') || []).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'
              )}
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />

            {/* Camera Change Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Change Profile Picture"
              disabled={isUploadingPhoto}
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#0f172a',
                border: '2px solid #ffffff',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                transition: 'transform 0.15s ease'
              }}
            >
              <Camera size={15} />
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {currentUser?.name || 'User Profile'}
              </h2>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '4px 10px',
                borderRadius: '6px',
                background: userRole === 'admin' ? '#f5f3ff' : userRole === 'teacher' ? '#eff6ff' : '#ecfdf5',
                color: userRole === 'admin' ? '#7c3aed' : userRole === 'teacher' ? '#1d4ed8' : '#059669',
                border: userRole === 'admin' ? '1px solid #ddd6fe' : userRole === 'teacher' ? '1px solid #bfdbfe' : '1px solid #a7f3d0'
              }}>
                {userRole === 'admin' ? 'Primary Administrator' : userRole === 'teacher' ? 'Faculty Member' : 'Student'}
              </span>
            </div>

            <p style={{ margin: '6px 0 0', fontSize: '0.86rem', color: '#64748b' }}>
              {currentUser?.email}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                color: '#0284c7',
                background: '#f0f9ff',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #bae6fd',
                fontWeight: 600
              }}>
                <Building size={13} />
                {currentUser?.institution_name || 'Smart Attendance System'}
              </span>

              {currentUser?.institution_slug && (
                <span style={{
                  fontSize: '0.76rem',
                  color: '#475569',
                  background: '#f1f5f9',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontWeight: 600
                }}>
                  Code: {currentUser?.institution_slug}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button: Edit Profile Toggle */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => {
              if (isEditingProfile) {
                setIsEditingProfile(false);
              } else {
                setEditName(currentUser?.name || '');
                setEditPhone(currentUser?.details?.phone || currentUser?.phone || '');
                setEditBio(currentUser?.details?.bio || currentUser?.bio || '');
                setEditDepartment(currentUser?.details?.dep || currentUser?.details?.department || currentUser?.department || '');
                setEditAddress(currentUser?.details?.address || '');
                setEditDob(currentUser?.details?.dob || '');
                setEditGender(currentUser?.details?.gender || 'Male');
                setIsEditingProfile(true);
              }
            }}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: isEditingProfile ? '#f1f5f9' : '#0284c7',
              border: isEditingProfile ? '1px solid #cbd5e1' : 'none',
              color: isEditingProfile ? '#334155' : '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: isEditingProfile ? 'none' : '0 2px 8px rgba(2, 132, 199, 0.25)'
            }}
          >
            {isEditingProfile ? <X size={15} /> : <Edit size={15} />}
            <span>{isEditingProfile ? 'Cancel Edit' : 'Edit Profile Credentials'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof playCyberSound === 'function') playCyberSound('click');
              handleLogout();
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#be123c',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {photoUploadMsg && (
        <div style={{ padding: '12px 18px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#065f46', fontSize: '0.85rem', fontWeight: 600 }}>
          ✅ {photoUploadMsg}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
        
        {/* Left Column: Profile Information or Edit Form */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '18px',
          padding: '28px',
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} color="#0284c7" />
              <span>{isEditingProfile ? 'Edit Account Credentials' : 'Personal & Institutional Details'}</span>
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {isEditingProfile ? 'Save to update records' : 'Verified Profile'}
            </span>
          </div>

          {profileSaveSuccess && (
            <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#065f46', fontSize: '0.85rem', fontWeight: 600 }}>
              ✅ {profileSaveSuccess}
            </div>
          )}

          {profileSaveError && (
            <div style={{ padding: '12px 16px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', color: '#9f1239', fontSize: '0.85rem', fontWeight: 600 }}>
              ❌ {profileSaveError}
            </div>
          )}

          {isEditingProfile ? (
            /* ================= EDIT PROFILE FORM ================= */
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Email Address (Identity Anchor)
                </label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'not-allowed'
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                  Contact system owner to request official email address migration.
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {userRole !== 'student' && (
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Department / Division
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science & Engineering"
                    value={editDepartment}
                    onChange={e => setEditDepartment(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {userRole === 'student' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={editDob}
                        onChange={e => setEditDob(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: '0.88rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                        Gender
                      </label>
                      <select
                        value={editGender}
                        onChange={e => setEditGender(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#0f172a',
                          fontSize: '0.88rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Residential Address
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Enter street and city address"
                      value={editAddress}
                      onChange={e => setEditAddress(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'none'
                      }}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Professional Bio / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Academic Administrator & Department Head"
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  style={{
                    flex: 2,
                    padding: '12px 20px',
                    borderRadius: '10px',
                    background: '#059669',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isSavingProfile ? 0.7 : 1
                  }}
                >
                  <Save size={16} />
                  <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* ================= READ-ONLY PROFILE OVERVIEW ================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <span style={{ color: '#64748b', fontSize: '0.84rem' }}>Full Legal Name</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{currentUser?.name}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <span style={{ color: '#64748b', fontSize: '0.84rem' }}>Email Address</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{currentUser?.email}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <span style={{ color: '#64748b', fontSize: '0.84rem' }}>Phone Number</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                  {currentUser?.details?.phone || currentUser?.phone || 'Not set'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <span style={{ color: '#64748b', fontSize: '0.84rem' }}>Institution</span>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0284c7' }}>
                  {currentUser?.institution_name || 'Smart Attendance System'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                <span style={{ color: '#64748b', fontSize: '0.84rem' }}>Workspace Slug</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace', color: '#7c3aed' }}>
                  {currentUser?.institution_slug || 'default'}
                </span>
              </div>

              {userRole === 'student' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.84rem' }}>Roll Number</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{currentUser?.details?.roll}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.84rem' }}>Academic Department</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>{currentUser?.details?.dep}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.84rem' }}>Course & Year</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                      {currentUser?.details?.course} ({currentUser?.details?.year || '1st Year'})
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b', fontSize: '0.84rem' }}>Department</span>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                    {currentUser?.department || currentUser?.details?.department || 'Administration'}
                  </span>
                </div>
              )}

              {(currentUser?.bio || currentUser?.details?.bio) && (
                <div style={{ marginTop: '6px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Bio / Role Note
                  </span>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.45 }}>
                    {currentUser?.bio || currentUser?.details?.bio}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Security, Password & Camera/Preferences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Change Password Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '28px',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="#e11d48" />
              <span>Change Account Password</span>
            </h3>

            {passwordChangeError && (
              <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', color: '#9f1239', fontSize: '0.82rem', marginBottom: '16px' }}>
                ❌ {passwordChangeError}
              </div>
            )}

            {passwordChangeSuccess && (
              <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '0.82rem', marginBottom: '16px' }}>
                ✅ {passwordChangeSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '5px' }}>
                  {userRole === 'student' ? 'Current Password / Default Roll No' : 'Current Password'}
                </label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '5px' }}>
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.76rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '5px' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                style={{
                  marginTop: '6px',
                  width: '100%',
                  padding: '11px',
                  borderRadius: '10px',
                  background: '#0f172a',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: isChangingPassword ? 'not-allowed' : 'pointer',
                  opacity: isChangingPassword ? 0.7 : 1
                }}
              >
                {isChangingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Student Biometric Registration Card */}
          {userRole === 'student' && (
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '28px',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} color="#0284c7" />
                <span>Biometric Face Recognition Profile</span>
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 16px 0', lineHeight: 1.45 }}>
                Register or refresh your 128-D face embedding vector using real-time quality verification.
              </p>

              {selfieError && (
                <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', color: '#9f1239', fontSize: '0.82rem', marginBottom: '14px' }}>
                  ❌ {selfieError}
                </div>
              )}

              {selfieSuccess && (
                <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '0.82rem', marginBottom: '14px' }}>
                  ✅ {selfieSuccess}
                </div>
              )}

              {(studentWebcamActive || studentWebcamBootActive) ? (
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ position: 'relative', width: '100%', maxWidth: '360px', margin: '0 auto', aspectRatio: '4/3', background: '#0f172a', borderRadius: '12px', overflow: 'hidden' }}>
                    <video ref={studentVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <canvas ref={studentCanvasRef} style={{ display: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={handleStudentWebcamCapture}
                      disabled={isUploadingSelfie}
                      style={{ padding: '10px 20px', borderRadius: '8px', background: '#059669', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                      {isUploadingSelfie ? 'Validating...' : 'Capture & Save Face'}
                    </button>
                    <button
                      type="button"
                      onClick={stopStudentWebcam}
                      style={{ padding: '10px 16px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={startStudentWebcam}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '10px',
                      background: '#0284c7',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Video size={16} />
                    <span>Open Live Camera</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Preferences Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)'
          }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sliders size={16} color="#64748b" />
              <span>Interface & Audio Preferences</span>
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a', display: 'block' }}>Sound Feedback</span>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Interactive click and scan sound cues</span>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={e => {
                  setSoundEnabled(e.target.checked);
                  localStorage.setItem('soundEnabled', e.target.checked);
                }}
                style={{ width: '18px', height: '18px', accentColor: '#0284c7', cursor: 'pointer' }}
              />
            </div>

            <div style={{ marginTop: '12px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />} Volume: {Math.round(audioVolume * 100)}%
              </span>
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
                  localStorage.setItem('audioVolume', vol);
                }}
                style={{ width: '100%', accentColor: '#0284c7' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
