import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  AlertCircle,
  GraduationCap,
  UserCog,
  Crown,
} from 'lucide-react';
import RoboticLoginCanvas from './animations/RoboticLoginCanvas';
import { getApiBaseUrl } from '../utils/platform';
import { wakeBackend } from '../utils/cameraScanner';


const ROLES = [
  {
    id: 'student',
    label: 'Student',
    icon: GraduationCap,
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.35)',
    tagline: 'Track attendance & profile',
  },
  {
    id: 'teacher',
    label: 'Teacher',
    icon: UserCog,
    color: '#00f2fe',
    glow: 'rgba(0, 242, 254, 0.35)',
    tagline: 'Scanner, logs & sessions',
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Crown,
    color: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.35)',
    tagline: 'Full system control',
  },
];

export default function LoginPortal({
  loginRole,
  setLoginRole,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  authError,
  isLoading,
  onSubmit,
  crtOverlayEnabled,
  serverWarmingUp,
  onExploreGuest,
  onTenantChange,
  onWakeServer,
  serverStatus,
}) {
  const [bootLine, setBootLine] = useState('');
  const [bootIndex, setBootIndex] = useState(0);
  const bootLines = [
    'INITIALIZING NEURAL AUTH GATEWAY...',
    'LOADING BIOMETRIC ACCESS MATRIX...',
    'SYNCING ROLE-BASED SECURITY LAYERS...',
    'SECURE PORTAL ONLINE — SELECT ROLE',
  ];

  useEffect(() => {
    const line = bootLines[bootIndex];
    let charIndex = 0;
    setBootLine('');
    const typeInterval = setInterval(() => {
      charIndex += 1;
      setBootLine(line.slice(0, charIndex));
      if (charIndex >= line.length) {
        clearInterval(typeInterval);
        setTimeout(() => {
          setBootIndex((prev) => (prev + 1) % bootLines.length);
        }, 1200);
      }
    }, 28);
    return () => clearInterval(typeInterval);
  }, [bootIndex]);

  const [institutionsList, setInstitutionsList] = useState([
    { name: 'Default Institution', slug: 'default' }
  ]);
  const [selectedTenant, setSelectedTenant] = useState(localStorage.getItem('override_tenant') || 'default');

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const apiBase = getApiBaseUrl();
        const res = await fetch(`${apiBase}/institutions/`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setInstitutionsList(data);
          }
        }
      } catch (err) {
        console.error("Failed to load institutions:", err);
      }
    };
    fetchInstitutions();
  }, []);

  const handleTenantChange = (slug) => {
    setSelectedTenant(slug);
    localStorage.setItem('override_tenant', slug);
    if (onTenantChange) {
      onTenantChange(slug);
    } else {
      window.location.reload();
    }
  };

  // Registration States
  const [isRegister, setIsRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regInstitutionCode, setRegInstitutionCode] = useState('');
  const [regRoll, setRegRoll] = useState('');
  const [regDep, setRegDep] = useState('');
  const [regCourse, setRegCourse] = useState('');
  const [regYear, setRegYear] = useState('');
  const [regSemester, setRegSemester] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regParentName, setRegParentName] = useState('');
  const [regParentEmail, setRegParentEmail] = useState('');
  const [regParentPhone, setRegParentPhone] = useState('');
  const [regTeacherDep, setRegTeacherDep] = useState('');

  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    setIsSubmittingReg(true);

    const apiBase = getApiBaseUrl();
    const isStudent = loginRole === 'student';
    const endpoint = isStudent ? '/auth/register/student' : '/auth/register/teacher';

    const payload = isStudent ? {
      name: regName,
      email: regEmail,
      password: regPassword,
      institution_code: regInstitutionCode,
      roll: regRoll,
      dep: regDep,
      course: regCourse,
      year: regYear,
      semester: regSemester,
      gender: regGender,
      phone: regPhone || null,
      address: regAddress || null,
      parent_name: regParentName || null,
      parent_email: regParentEmail || null,
      parent_phone: regParentPhone || null
    } : {
      name: regName,
      email: regEmail,
      password: regPassword,
      institution_code: regInstitutionCode,
      department: regTeacherDep
    };

    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      setRegSuccess(data.message || 'Registration successful! You can now log in.');
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegInstitutionCode('');
      setRegRoll('');
      setRegDep('');
      setRegCourse('');
      setRegYear('');
      setRegSemester('');
      setRegPhone('');
      setRegAddress('');
      setRegParentName('');
      setRegParentEmail('');
      setRegParentPhone('');
      setRegTeacherDep('');

      setTimeout(() => {
        setIsRegister(false);
        setRegSuccess('');
      }, 3000);
    } catch (err) {
      setRegError(err.message);
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const activeRole = ROLES.find((r) => r.id === loginRole) || ROLES[2];

  return (
    <div className="login-portal-root">
      {crtOverlayEnabled && <div className="crt-overlay crt-active" />}
      {crtOverlayEnabled && <div className="crt-vignette" />}

      <RoboticLoginCanvas accent={activeRole.color} />

      <div className="login-portal-glow login-portal-glow-a" />
      <div className="login-portal-glow login-portal-glow-b" />

      <div className="login-portal-grid" />
      <div className="login-portal-radar">
        <div className="login-portal-radar-ring" />
        <div className="login-portal-radar-sweep" />
        <div className="login-portal-radar-core" />
      </div>

      <div className="login-portal-shell">
        <div className="login-portal-header">
          <div className="login-portal-logo">
            <ShieldCheck size={40} />
          </div>
          <div>
            <h1 className="login-portal-title">SMART ATTENDANCE</h1>
            <p className="login-portal-subtitle">Robotic Secure Access Portal</p>
          </div>
        </div>

        <div className="login-portal-boot">
          <span className="login-portal-prompt">&gt;</span>
          <span>{bootLine}</span>
          <span className="login-portal-cursor">_</span>
        </div>

        <div className="login-role-tabs" role="tablist" aria-label="Login role">
          {ROLES.map(({ id, label, icon: Icon, color, tagline }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={loginRole === id}
              className={`login-role-tab ${loginRole === id ? 'active' : ''}`}
              onClick={() => {
                setLoginRole(id);
                if (id === 'admin') setIsRegister(false);
              }}
              style={{
                '--role-color': color,
                '--role-glow': ROLES.find((r) => r.id === id)?.glow,
              }}
            >
              <Icon size={20} />
              <span className="login-role-tab-label">{label}</span>
              <span className="login-role-tab-hint">{tagline}</span>
            </button>
          ))}
        </div>

        <div
          className="login-portal-card"
          style={{ borderColor: `${activeRole.color}33`, boxShadow: `0 20px 50px -10px rgba(0,0,0,0.6), 0 0 30px ${activeRole.glow}` }}
        >
          <div className="login-portal-card-badge" style={{ color: activeRole.color, borderColor: `${activeRole.color}44` }}>
            <activeRole.icon size={16} />
            {isRegister ? `Register ${activeRole.label}` : `${activeRole.label} Portal`}
          </div>

          <p className="login-portal-card-desc">
            {isRegister 
              ? `Fill in the registration form below to enroll yourself in the system.`
              : `Please login using ${activeRole.label} credentials only. Logging into the incorrect portal will block your access.`}
          </p>

          {serverWarmingUp && !isRegister && (
            <div className="login-portal-error" style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', textAlign: 'left', lineHeight: '1.4' }}>
                  <strong>Cloud Server Warming Up:</strong> Render free tier sleeps after inactivity. Wait ~45 seconds or tap Wake Server below.
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (onWakeServer) onWakeServer();
                  else await wakeBackend(getApiBaseUrl());
                }}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '8px',
                  color: '#fbbf24',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                }}
              >
                ⚡ Wake Cloud Server
              </button>
            </div>
          )}

          {isRegister ? (
            <>
              {regError && (
                <div className="login-portal-error" style={{ marginBottom: '16px' }}>
                  <AlertCircle size={16} />
                  <span>{regError}</span>
                </div>
              )}
              {regSuccess && (
                <div className="login-portal-error" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', marginBottom: '16px' }}>
                  <ShieldCheck size={16} />
                  <span>{regSuccess}</span>
                </div>
              )}
            </>
          ) : (
            authError && (
              <div className="login-portal-error" style={{ marginBottom: '16px' }}>
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )
          )}

          {!isRegister ? (
            <>
              {/* Futuristic Institution Selector Dropdown */}
              <div className="form-group" style={{ marginBottom: '22px' }}>
                <label className="form-label" style={{ color: activeRole.color, fontWeight: '800', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                  <span>🏫</span> Select Portal Domain
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedTenant}
                    onChange={(e) => handleTenantChange(e.target.value)}
                    className="form-input login-portal-input"
                    style={{
                      width: '100%',
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      padding: '12px 36px 12px 16px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
                      transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = activeRole.color;
                      e.currentTarget.style.boxShadow = `inset 0 1px 1px rgba(255,255,255,0.05), 0 0 10px ${activeRole.color}33`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.boxShadow = 'inset 0 1px 1px rgba(255,255,255,0.05)';
                    }}
                  >
                    {institutionsList.map((inst) => (
                      <option key={inst.slug} value={inst.slug} style={{ background: '#0f172a', color: '#f8fafc' }}>
                        {inst.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <div style={{
                    position: 'absolute',
                    right: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: activeRole.color,
                    fontSize: '0.65rem',
                    opacity: 0.8
                  }}>
                    ▼
                  </div>
                </div>
              </div>

              <form onSubmit={onSubmit} className="login-portal-form">
                <div className="form-group">
                  <label className="form-label">
                    <Mail size={14} /> Email or Institute Username
                  </label>
                  <input
                    type="text"
                    className="form-input login-portal-input"
                    placeholder="Email or college slug (e.g. du)"
                    autoComplete="username"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Lock size={14} /> Password
                  </label>
                  <input
                    type="password"
                    className="form-input login-portal-input"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="login-portal-submit"
                  style={{ background: `linear-gradient(135deg, ${activeRole.color}, ${activeRole.color}aa)` }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="login-portal-spinner" />
                      Authenticating...
                    </>
                  ) : (
                    `Enter ${activeRole.label} Portal`
                  )}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="login-portal-form">
              <div 
                className="cyber-scrollbar"
                style={{ 
                  maxHeight: '280px', 
                  overflowY: 'auto', 
                  paddingRight: '8px', 
                  marginBottom: '16px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px' 
                }}
              >
                {/* Basic Fields */}
                <div className="form-group">
                  <label className="form-label">👤 Full Name</label>
                  <input
                    type="text"
                    className="form-input login-portal-input"
                    placeholder="Enter your full name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">📧 Email Address</label>
                  <input
                    type="email"
                    className="form-input login-portal-input"
                    placeholder="name@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">🔒 Password</label>
                  <input
                    type="password"
                    className="form-input login-portal-input"
                    placeholder="Create secure password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">🏫 Institution Code / Domain</label>
                  <input
                    type="text"
                    className="form-input login-portal-input"
                    placeholder="e.g. default, iitd, lpu"
                    value={regInstitutionCode}
                    onChange={(e) => setRegInstitutionCode(e.target.value)}
                    required
                  />
                </div>

                {/* Role Specific Academic Fields */}
                {loginRole === 'student' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">🆔 Roll Number / Student ID</label>
                      <input
                        type="text"
                        className="form-input login-portal-input"
                        placeholder="e.g. 2026CSE01"
                        value={regRoll}
                        onChange={(e) => setRegRoll(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">🏢 Academic Department</label>
                      <input
                        type="text"
                        className="form-input login-portal-input"
                        placeholder="e.g. Computer Science / IT"
                        value={regDep}
                        onChange={(e) => setRegDep(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">📚 Course / Program</label>
                      <input
                        type="text"
                        className="form-input login-portal-input"
                        placeholder="e.g. B.Tech / MCA"
                        value={regCourse}
                        onChange={(e) => setRegCourse(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">📅 Year</label>
                        <input
                          type="text"
                          className="form-input login-portal-input"
                          placeholder="e.g. 1st / 3rd"
                          value={regYear}
                          onChange={(e) => setRegYear(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">📖 Semester</label>
                        <input
                          type="text"
                          className="form-input login-portal-input"
                          placeholder="e.g. 5"
                          value={regSemester}
                          onChange={(e) => setRegSemester(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">🧬 Gender</label>
                      <select
                        className="form-input login-portal-input"
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value)}
                        style={{ appearance: 'none', background: 'rgba(15, 23, 42, 0.75)', color: '#f8fafc', width: '100%', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px' }}
                      >
                        <option value="Male" style={{ background: '#0f172a' }}>Male</option>
                        <option value="Female" style={{ background: '#0f172a' }}>Female</option>
                        <option value="Other" style={{ background: '#0f172a' }}>Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">📞 Phone Number</label>
                      <input
                        type="text"
                        className="form-input login-portal-input"
                        placeholder="Mobile Number"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">📍 Address</label>
                      <input
                        type="text"
                        className="form-input login-portal-input"
                        placeholder="City, State"
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                      />
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: activeRole.color, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Parent/Guardian Details</span>

                    <div className="form-group">
                      <label className="form-label">👪 Parent Name</label>
                      <input
                        type="text"
                        className="form-input login-portal-input"
                        placeholder="Parent Full Name"
                        value={regParentName}
                        onChange={(e) => setRegParentName(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">✉️ Parent Email</label>
                      <input
                        type="email"
                        className="form-input login-portal-input"
                        placeholder="parent@example.com"
                        value={regParentEmail}
                        onChange={(e) => setRegParentEmail(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">📱 Parent Phone</label>
                      <input
                        type="text"
                        className="form-input login-portal-input"
                        placeholder="Parent Contact Number"
                        value={regParentPhone}
                        onChange={(e) => setRegParentPhone(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">🏢 Teaching Department</label>
                      <input
                        type="text"
                        className="form-input login-portal-input"
                        placeholder="e.g. Computer Science"
                        value={regTeacherDep}
                        onChange={(e) => setRegTeacherDep(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
                className="login-portal-submit"
                style={{ background: `linear-gradient(135deg, ${activeRole.color}, ${activeRole.color}aa)` }}
                disabled={isSubmittingReg}
              >
                {isSubmittingReg ? (
                  <>
                    <span className="login-portal-spinner" />
                    Enrolling...
                  </>
                ) : (
                  `Register as ${activeRole.label}`
                )}
              </button>
            </form>
          )}

          {/* Futuristic Guest Mode Divider */}
          {!isRegister && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: '20px 0 16px 0',
                opacity: 0.5
              }}>
                <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, transparent, ${activeRole.color}55)` }} />
                <span style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>or bypass authentication</span>
                <div style={{ flex: 1, height: '1px', background: `linear-gradient(90deg, ${activeRole.color}55, transparent)` }} />
              </div>

              {/* Glassmorphic Guest Mode Button */}
              <button
                type="button"
                onClick={() => onExploreGuest(activeRole.id)}
                className="login-portal-guest"
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 242, 254, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.4)';
                  e.currentTarget.style.boxShadow = 'inset 0 1px 1px rgba(255,255,255,0.05), 0 0 15px rgba(0, 242, 254, 0.25)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.boxShadow = 'inset 0 1px 1px rgba(255,255,255,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span>⚡ Explore Guest Sandbox</span>
              </button>
            </>
          )}

          {/* Self Registration Toggle Link */}
          {loginRole !== 'admin' && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setRegError('');
                  setRegSuccess('');
                  setIsRegister(!isRegister);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeRole.color,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textDecoration: 'underline',
                  outline: 'none'
                }}
              >
                {isRegister ? '← Back to Login' : `Create ${activeRole.label} Account`}
              </button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes cyberPulseText {
            0%, 100% {
              opacity: 0.85;
              text-shadow: 0 0 8px var(--glow-color);
            }
            50% {
              opacity: 1;
              text-shadow: 0 0 15px var(--glow-color), 0 0 20px var(--glow-color);
            }
          }
          .cyber-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .cyber-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 4px;
          }
          .cyber-scrollbar::-webkit-scrollbar-thumb {
            background: ${activeRole.color}88;
            border-radius: 4px;
          }
          .cyber-scrollbar::-webkit-scrollbar-thumb:hover {
            background: ${activeRole.color};
          }
        `}</style>

        <p className="login-portal-footer" style={{
          fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
          fontSize: '0.78rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: 'rgba(248, 250, 252, 0.7)',
          marginTop: '3px'
        }}>
          Developed by{' '}
          <span style={{
            '--glow-color': 'rgba(248, 250, 252, 0.25)',
            color: '#f8fafc',
            fontWeight: 800,
            animation: 'cyberPulseText 2.5s infinite ease-in-out'
          }}>
            Rajkishor
          </span>
        </p>
      </div>
    </div>
  );
}
