import { useState, useMemo } from 'react';
import {
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
  ShieldCheck,
  Check,
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/platform';

const getInitials = (name, fallback = 'A') => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const summarizePlatform = () => {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent || '';
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad/i.test(ua)
      ? 'iOS'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Device';
  const browser = /Edg/i.test(ua)
    ? 'Edge'
    : /Chrome/i.test(ua)
      ? 'Chrome'
      : /Safari/i.test(ua)
        ? 'Safari'
        : /Firefox/i.test(ua)
          ? 'Firefox'
          : 'Browser';
  return `${browser} · ${os}`;
};

export default function AdminProfileSettings({
  currentUser,
  token,
  isDemoMode,
  setCurrentUser,
  userRole = 'admin',
  playCyberSound = () => {},
  handleLogout = () => {},
}) {
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'security' | 'preferences' | 'sessions'

  // Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || currentUser?.details?.phone || '');
  const [department, setDepartment] = useState(currentUser?.department || currentUser?.dep || '');
  const [designation] = useState(
    currentUser?.details?.designation || (userRole === 'admin' ? 'System Administrator' : 'Faculty Member')
  );

  // Security Form State
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

  const passwordStrength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  }, [newPassword]);

  const strengthLabel = useMemo(() => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 2) return 'Fair';
    if (passwordStrength <= 3) return 'Good';
    return 'Strong';
  }, [passwordStrength]);

  const strengthColor = useMemo(() => {
    if (passwordStrength <= 1) return '#dc2626';
    if (passwordStrength <= 2) return '#d97706';
    if (passwordStrength <= 3) return '#916d30';
    return '#047857';
  }, [passwordStrength]);

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
        setSuccessMsg('Profile updated.');
        playCyberSound('success');
      }, 300);
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const payload = { name: name.trim() };
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
        throw new Error(d.detail || 'Failed to update profile.');
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

      setSuccessMsg('Profile saved.');
      playCyberSound('success');
    } catch (err) {
      playCyberSound('error');
      setErrorMsg(err.message || 'Connection error while updating profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePassword = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSaving(true);

    if (isDemoMode) {
      setTimeout(() => {
        setIsSaving(false);
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMsg('Password updated.');
        playCyberSound('success');
      }, 300);
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Failed to change password.');
      }

      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('Password updated.');
      playCyberSound('success');
    } catch (err) {
      playCyberSound('error');
      setErrorMsg(err.message || 'Connection error while updating password.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSound = (enabled) => {
    setSoundEnabled(enabled);
    try {
      localStorage.setItem('sound_enabled', enabled ? 'true' : 'false');
    } catch { /* storage fallback */ }
    if (enabled) playCyberSound('success');
  };

  const toggleHaptic = (enabled) => {
    setHapticEnabled(enabled);
    try {
      localStorage.setItem('haptic_enabled', enabled ? 'true' : 'false');
    } catch { /* storage fallback */ }
    if (enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }
  };

  const handleClearCache = () => {
    playCyberSound('click');
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('cached_') || k.startsWith('sg_')) {
          localStorage.removeItem(k);
        }
      });
    } catch { /* storage fallback */ }
    setSuccessMsg('Local cache cleared.');
    playCyberSound('success');
  };

  const userInitials = getInitials(currentUser?.name || userRole || 'A', 'AD');
  const instName =
    currentUser?.institution_name ||
    (currentUser?.institution_slug ? currentUser.institution_slug.toUpperCase() : 'Main Campus');

  const tabs = [
    { id: 'info', label: 'Profile', icon: User },
    { id: 'security', label: 'Password', icon: Lock },
    { id: 'preferences', label: 'Controls', icon: Sliders },
    { id: 'sessions', label: 'Session', icon: ShieldCheck },
  ];

  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div
        className="golden-os-window"
        style={{
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Alerts */}
        {successMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '12px',
              color: '#047857',
              fontSize: '0.84rem',
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              color: '#dc2626',
              fontSize: '0.84rem',
              fontWeight: 700,
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Compact Identity Header Row */}
        <div
          className="golden-os-form-section"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div className="golden-os-avatar" style={{ width: '44px', height: '44px', fontSize: '0.96rem' }}>
              {userInitials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  color: '#25231f',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentUser?.name || (userRole === 'admin' ? 'Administrator' : 'Faculty Member')}
              </div>
              <div
                style={{
                  fontSize: '0.76rem',
                  color: '#6b5b3e',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '2px',
                }}
              >
                {currentUser?.email || 'admin@campus.edu'} · {instName}
              </div>
            </div>
          </div>

          <span
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.68rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              flexShrink: 0,
              background: '#faf3e3',
              color: '#6e4e1c',
              border: '1px solid #d9be86',
            }}
          >
            {userRole === 'admin' ? 'Admin' : 'Teacher'}
          </span>
        </div>

        {/* Clean Single-Row Golden Gate Segmented Control */}
        <div className="golden-os-segmented" style={{ width: '100%', boxSizing: 'border-box', justifyContent: 'space-between', flexWrap: 'nowrap' }}>
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
                className={`golden-os-segmented-btn ${isSelected ? 'active' : ''}`}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '8px 6px',
                  fontSize: '0.76rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: PROFILE DETAILS */}
        {activeTab === 'info' && (
          <form onSubmit={handleSaveInfo} className="golden-os-form-section" style={{ gap: '12px' }}>
            <div className="golden-os-form-section-title">Account Identity</div>

            <div className="golden-os-fields-2">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '36px' }}
                    placeholder="Enter full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '36px' }}
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Phone</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
                  <input
                    type="tel"
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '36px' }}
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Department</label>
                <div style={{ position: 'relative' }}>
                  <Building size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '36px' }}
                    placeholder="e.g. CSE(IOT)"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="golden-os-primary-action"
              style={{ justifyContent: 'center', marginTop: '4px', padding: '12px 18px' }}
            >
              <Check size={16} />
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>
                {isSaving ? 'Saving...' : 'Save Profile Changes'}
              </span>
            </button>
          </form>
        )}

        {/* TAB 2: PASSWORD */}
        {activeTab === 'security' && (
          <form onSubmit={handleSavePassword} className="golden-os-form-section" style={{ gap: '12px' }}>
            <div className="golden-os-form-section-title">Update Password</div>

            <div className="golden-os-fields-2">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '36px', paddingRight: '38px' }}
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    aria-label="Toggle new password visibility"
                    onClick={() => setShowNewPassword((p) => !p)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#8c7a5b',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {newPassword && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          style={{
                            flex: 1,
                            background: passwordStrength >= step ? strengthColor : '#e4d8bd',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: strengthColor, fontWeight: 700, marginTop: '4px' }}>
                      {strengthLabel}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '36px', paddingRight: '38px' }}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    aria-label="Toggle confirm password visibility"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#8c7a5b',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, marginTop: '4px' }}>
                    Passwords do not match
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="golden-os-primary-action"
              style={{ justifyContent: 'center', marginTop: '4px', padding: '12px 18px' }}
            >
              <Key size={16} />
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>Update Password</span>
            </button>
          </form>
        )}

        {/* TAB 3: APP CONTROLS */}
        {activeTab === 'preferences' && (
          <div className="golden-os-list-shell">
            <div className="golden-os-list-row" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div className="golden-os-avatar" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>Audio Feedback</span>
              </div>
              <button
                type="button"
                aria-label="Toggle audio feedback"
                onClick={() => toggleSound(!soundEnabled)}
                style={{
                  width: '46px',
                  height: '26px',
                  borderRadius: '13px',
                  background: soundEnabled ? '#059669' : '#cfc8ba',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0,
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
                    transition: 'left 0.18s ease',
                  }}
                />
              </button>
            </div>

            <div className="golden-os-list-row" style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div className="golden-os-avatar" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                  <Smartphone size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>Haptic Touch</span>
              </div>
              <button
                type="button"
                aria-label="Toggle haptic touch"
                onClick={() => toggleHaptic(!hapticEnabled)}
                style={{
                  width: '46px',
                  height: '26px',
                  borderRadius: '13px',
                  background: hapticEnabled ? '#785927' : '#cfc8ba',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  flexShrink: 0,
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
                    transition: 'left 0.18s ease',
                  }}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={handleClearCache}
              className="golden-os-list-row"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div className="golden-os-avatar" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                  <RefreshCw size={16} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#25231f' }}>Clear Offline Cache</span>
              </div>
              <span className="golden-os-badge-muted">Reset</span>
            </button>
          </div>
        )}

        {/* TAB 4: SESSION */}
        {activeTab === 'sessions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="golden-os-form-section" style={{ gap: '8px' }}>
              <div className="golden-os-form-section-title">Session Summary</div>
              {[
                { label: 'Status', value: 'Active Session' },
                { label: 'Role', value: userRole === 'admin' ? 'Administrator' : 'Faculty' },
                { label: 'Campus', value: instName },
                { label: 'Device', value: summarizePlatform() },
              ].map((row, idx, arr) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: idx < arr.length - 1 ? '1px solid #f2ead9' : 'none',
                    fontSize: '0.84rem',
                    gap: '10px',
                  }}
                >
                  <span style={{ color: '#6b5b3e', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ color: '#25231f', fontWeight: 700, textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                playCyberSound('click');
                handleLogout();
              }}
              className="golden-os-signout-btn active-haptic"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                <span className="golden-os-signout-icon">
                  <LogOut size={16} />
                </span>
                <span>Sign Out</span>
              </span>
              <span className="golden-os-signout-pill">End Session</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
