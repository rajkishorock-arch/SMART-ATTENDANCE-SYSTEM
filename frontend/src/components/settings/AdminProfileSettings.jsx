import { useState, useMemo } from 'react';
import {
  UserCheck,
  Edit,
  Shield,
  Key,
  Mail,
  User,
  Phone,
  Building,
  Lock,
  Eye,
  EyeOff,
  Sliders,
  Volume2,
  VolumeX,
  Smartphone,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  BadgeCheck,
  Calendar,
  Layers,
  Check,
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/platform';

export default function AdminProfileSettings({
  currentUser,
  token,
  isDemoMode,
  setCurrentUser,
  userRole = 'admin',
  playCyberSound = () => {},
  handleLogout = () => {},
  onNavigate = () => {},
}) {
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'security' | 'preferences' | 'sessions'

  // Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || currentUser?.details?.phone || '');
  const [department, setDepartment] = useState(currentUser?.department || currentUser?.dep || '');
  const [designation, setDesignation] = useState(
    currentUser?.details?.designation || (userRole === 'admin' ? 'System Administrator' : 'Faculty Member')
  );

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Preferences State
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem('sound_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    try {
      return localStorage.getItem('haptic_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  // Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score; // 0 to 4
  }, [newPassword]);

  const strengthLabel = useMemo(() => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 2) return 'Fair';
    if (passwordStrength <= 3) return 'Good';
    return 'Strong & Secure';
  }, [passwordStrength]);

  const strengthColor = useMemo(() => {
    if (passwordStrength <= 1) return '#ef4444';
    if (passwordStrength <= 2) return '#f59e0b';
    if (passwordStrength <= 3) return '#3b82f6';
    return '#10b981';
  }, [passwordStrength]);

  // Handle Personal Info Update
  const handleSaveInfo = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      return;
    }

    setIsSaving(true);

    if (isDemoMode) {
      setTimeout(() => {
        const updatedUser = {
          ...currentUser,
          name: name.trim(),
          email: email.trim() || currentUser?.email,
          phone: phone.trim(),
          department: department.trim(),
          details: {
            ...currentUser?.details,
            name: name.trim(),
            email: email.trim() || currentUser?.email,
            phone: phone.trim(),
            designation: designation.trim(),
          },
        };
        if (setCurrentUser) setCurrentUser(updatedUser);
        try {
          localStorage.setItem('cached_user', JSON.stringify(updatedUser));
        } catch { /* storage fallback */ }
        setIsSaving(false);
        setSuccessMsg('Profile information updated successfully!');
        playCyberSound('success');
      }, 500);
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const payload = {
        name: name.trim(),
      };
      if (email.trim() && email.trim() !== currentUser?.email) {
        payload.email = email.trim().toLowerCase();
      }

      const res = await fetch(`${apiBaseUrl}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Failed to update profile information.');
      }

      const updated = await res.json();
      const updatedUser = {
        ...currentUser,
        ...updated,
        name: updated.name || name.trim(),
        email: updated.email || email.trim(),
        phone: phone.trim(),
        department: department.trim(),
        details: {
          ...currentUser?.details,
          name: updated.name || name.trim(),
          email: updated.email || email.trim(),
          phone: phone.trim(),
          designation: designation.trim(),
        },
      };

      if (setCurrentUser) setCurrentUser(updatedUser);
      try {
        localStorage.setItem('cached_user', JSON.stringify(updatedUser));
      } catch { /* storage fallback */ }

      setSuccessMsg('Profile details saved successfully!');
      playCyberSound('success');
    } catch (err) {
      playCyberSound('error');
      setErrorMsg(err.message || 'Connection error while updating profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Password Update
  const handleSavePassword = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    setIsSaving(true);

    if (isDemoMode) {
      setTimeout(() => {
        setIsSaving(false);
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
        setSuccessMsg('Password updated successfully! (Sandbox Simulator)');
        playCyberSound('success');
      }, 500);
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const payload = {
        password: newPassword,
      };

      const res = await fetch(`${apiBaseUrl}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Failed to change password.');
      }

      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setSuccessMsg('Password changed successfully! Keep your new password secure.');
      playCyberSound('success');
    } catch (err) {
      playCyberSound('error');
      setErrorMsg(err.message || 'Connection error while updating password.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Sound Toggle
  const toggleSound = (enabled) => {
    setSoundEnabled(enabled);
    try {
      localStorage.setItem('sound_enabled', enabled ? 'true' : 'false');
    } catch { /* storage fallback */ }
    if (enabled) {
      playCyberSound('success');
    }
  };

  // Handle Haptic Toggle
  const toggleHaptic = (enabled) => {
    setHapticEnabled(enabled);
    try {
      localStorage.setItem('haptic_enabled', enabled ? 'true' : 'false');
    } catch { /* storage fallback */ }
    if (enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }
  };

  // Handle Clear Local Cache
  const handleClearCache = () => {
    playCyberSound('click');
    try {
      localStorage.removeItem('cached_students');
      localStorage.removeItem('cached_students_timestamp');
      localStorage.removeItem('cached_stats');
      localStorage.removeItem('cached_stats_timestamp');
      localStorage.removeItem('cached_logs');
      localStorage.removeItem('cached_logs_timestamp');
      localStorage.removeItem('cached_departments');
      localStorage.removeItem('cached_departmentsList');
      localStorage.removeItem('cached_teachers');
    } catch { /* storage fallback */ }
    setSuccessMsg('Local application cache cleared and telemetry resynchronized.');
    playCyberSound('success');
  };

  const userInitials = (currentUser?.name || userRole || 'A')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const tabs = [
    { id: 'info', label: 'Personal Info', icon: User },
    { id: 'security', label: 'Security & Password', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    { id: 'sessions', label: 'Account & Sessions', icon: ShieldCheck },
  ];

  return (
    <div
      className="surface-card"
      style={{
        padding: 'clamp(16px, 4vw, 32px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* Title & Subtitle */}
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0,
          }}
        >
          <UserCheck size={22} style={{ color: '#2563eb', flexShrink: 0 }} /> My Profile & Account Settings
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px', margin: 0, lineHeight: 1.4 }}>
          Manage your personal identity, login credentials, security keys, and application preferences.
        </p>
      </div>

      {/* Global Success / Error Messages */}
      {successMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '10px',
            color: '#059669',
            fontSize: '0.86rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            color: '#dc2626',
            fontSize: '0.86rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hero Profile Identity Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          border: '1px solid #dbeafe',
          borderRadius: '14px',
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              }}
            >
              {userInitials}
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #ffffff',
              }}
              title="Session Active"
            />
          </div>

          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                {currentUser?.name || 'Administrator'}
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: userRole === 'admin' ? '#f5f3ff' : '#eff6ff',
                  color: userRole === 'admin' ? '#7c3aed' : '#2563eb',
                  border: userRole === 'admin' ? '1px solid #ddd6fe' : '1px solid #bfdbfe',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {userRole === 'admin' ? '🛡️ Administrator' : '🎓 Faculty Member'}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px', wordBreak: 'break-all' }}>
              {currentUser?.email || 'admin@campus.edu'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Building size={14} style={{ color: '#2563eb' }} />
            <span>{currentUser?.institution_name || (currentUser?.institution_slug ? currentUser.institution_slug.toUpperCase() : 'MAIN CAMPUS')}</span>
          </div>
          <div
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <BadgeCheck size={14} />
            <span>Verified</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '2px',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                playCyberSound('click');
                setActiveTab(tab.id);
                setSuccessMsg('');
                setErrorMsg('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
                borderRadius: '10px',
                border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                background: isSelected ? '#eff6ff' : '#ffffff',
                color: isSelected ? '#1d4ed8' : '#64748b',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PERSONAL INFORMATION */}
      {activeTab === 'info' && (
        <form
          onSubmit={handleSaveInfo}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: 'clamp(14px, 3vw, 24px)',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} style={{ color: '#2563eb' }} /> Personal Details & Contact
            </h4>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Changes apply immediately to your active session</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
            }}
          >
            {/* Full Name */}
            <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>
                Full Name
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', paddingLeft: '36px' }}
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>
                Primary Email Address
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', paddingLeft: '36px' }}
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>
                Contact Phone
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="tel"
                  className="form-input"
                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', paddingLeft: '36px' }}
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Department */}
            <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>
                Department / Unit
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <Building size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', paddingLeft: '36px' }}
                  placeholder="e.g. Computer Science / Central Admin"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-btn hover-elevate active-haptic"
              style={{
                padding: '11px 26px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
              }}
            >
              {isSaving ? (
                <span>Saving changes...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <form
          onSubmit={handleSavePassword}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: 'clamp(14px, 3vw, 24px)',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            minWidth: 0,
          }}
        >
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} style={{ color: '#7c3aed' }} /> Change Security Password
            </h4>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '4px 0 0' }}>
              Set a strong password containing letters, numbers, and symbols to protect your account.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
            }}
          >
            {/* New Password */}
            <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>
                New Password
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', paddingLeft: '36px', paddingRight: '38px' }}
                  placeholder="Enter strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((p) => !p)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength meter */}
              {newPassword && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '4px', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        style={{
                          flex: 1,
                          background: passwordStrength >= step ? strengthColor : '#e2e8f0',
                          transition: 'all 0.2s ease',
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: strengthColor, fontWeight: 700, marginTop: '4px' }}>
                    Strength: {strengthLabel}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group" style={{ margin: 0, minWidth: 0, width: '100%' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative', width: '100%' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', paddingLeft: '36px', paddingRight: '38px' }}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: 600, marginTop: '4px' }}>
                  Passwords do not match
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-btn hover-elevate active-haptic"
              style={{
                padding: '11px 26px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
              }}
            >
              <Key size={16} />
              <span>Update Password</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PREFERENCES & SOUND */}
      {activeTab === 'preferences' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: 'clamp(14px, 3vw, 24px)',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            minWidth: 0,
          }}
        >
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} style={{ color: '#059669' }} /> Experience & Audio Controls
            </h4>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '4px 0 0' }}>
              Fine-tune sound feedback, button vibrations, and display themes.
            </p>
          </div>

          {/* Sound Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '14px 16px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: soundEnabled ? '#ecfdf5' : '#f1f5f9',
                  color: soundEnabled ? '#059669' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>Cyber Audio Sound FX</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Play audio confirmation on scans, taps & updates</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleSound(!soundEnabled)}
              style={{
                width: '46px',
                height: '26px',
                borderRadius: '13px',
                background: soundEnabled ? '#10b981' : '#cbd5e1',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  top: '3px',
                  left: soundEnabled ? '23px' : '3px',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          {/* Haptic Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '14px 16px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: hapticEnabled ? '#eff6ff' : '#f1f5f9',
                  color: hapticEnabled ? '#2563eb' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Smartphone size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>Haptic Touch Vibration</div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Tactile vibration on button taps and card clicks</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleHaptic(!hapticEnabled)}
              style={{
                width: '46px',
                height: '26px',
                borderRadius: '13px',
                background: hapticEnabled ? '#2563eb' : '#cbd5e1',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  top: '3px',
                  left: hapticEnabled ? '23px' : '3px',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          {/* Audio Test Button */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => playCyberSound('success')}
              className="hover-elevate active-haptic"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Volume2 size={15} />
              <span>Test Audio Feedback</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: SESSIONS & ACCOUNT DANGER ZONE */}
      {activeTab === 'sessions' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: 'clamp(14px, 3vw, 24px)',
            width: '100%',
            maxWidth: '100%',
            boxSizing: 'border-box',
            minWidth: 0,
          }}
        >
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: '#2563eb' }} /> Active Sessions & Account Control
            </h4>
            <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '4px 0 0' }}>
              Review device connection status, purge local cache, or sign out.
            </p>
          </div>

          {/* Session Info Tile */}
          <div
            style={{
              padding: '14px 16px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f172a' }}>Current Client Device</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                LIVE NOW
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', wordBreak: 'break-all', fontFamily: 'monospace' }}>
              {typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser Session'}
            </div>
          </div>

          {/* Actions: Clear Cache & Sign Out */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleClearCache}
              className="hover-elevate active-haptic"
              style={{
                flex: 1,
                minWidth: '180px',
                padding: '12px 18px',
                borderRadius: '10px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <RefreshCw size={16} />
              <span>Clear Offline Cache & Resync</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                handleLogout();
              }}
              className="hover-elevate active-haptic"
              style={{
                flex: 1,
                minWidth: '180px',
                padding: '12px 18px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <LogOut size={16} />
              <span>Sign Out from Campus Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
