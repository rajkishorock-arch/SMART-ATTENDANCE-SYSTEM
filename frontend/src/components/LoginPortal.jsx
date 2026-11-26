import { useState } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  GraduationCap,
  UserCog,
  Crown,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  Copy,
  Building2,
  X
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const ROLES = [
  {
    id: 'student',
    label: 'Student',
    icon: GraduationCap,
    color: '#10b981',
    description: 'Track attendance, view schedules & profiles'
  },
  {
    id: 'teacher',
    label: 'Teacher',
    icon: UserCog,
    color: '#916d30',
    description: 'Mark attendance, manage logs & sessions'
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Crown,
    color: '#8b5cf6',
    description: 'Full institution administration & reports'
  }
];

export default function LoginPortal({
  loginRole,
  setLoginRole,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loginWorkspaceSlug,
  setLoginWorkspaceSlug,
  authError,
  onClearAuthError,
  onTenantSwitch,
  isLoading,
  onSubmit,
  serverWarmingUp,
  onWakeServer,
  onExploreGuest,
}) {
  // UI Controls
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isRegister, setIsRegister] = useState(false);
  const [regStep, setRegStep] = useState(1); // 1, 2, 3

  // Registration Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regInstitutionCode, setRegInstitutionCode] = useState('');
  const [regInstName, setRegInstName] = useState('');
  const [regInstSlug, setRegInstSlug] = useState('');
  const [regRoll, setRegRoll] = useState('');
  const [regDep, setRegDep] = useState('');
  const [regCourse] = useState('');
  const [regYear] = useState('1st Year');
  const [regSemester] = useState('Sem 1');
  const [regGender] = useState('Male');
  const [regPhone, setRegPhone] = useState('');
  const [regConsent, setRegConsent] = useState(true);

  const [regError, setRegError] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');
  const [regSuccessData, setRegSuccessData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [showPostRegFaceEnroll, setShowPostRegFaceEnroll] = useState(false);

  // Forgot Password Recovery Modal States
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleForgotPasswordSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) return;
    setForgotSubmitted(true);
  };

  // Step 1 Validation
  const validateStep1 = () => {
    setRegError('');
    if (!regName.trim()) {
      setRegError('Please enter your full name.');
      return false;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Please enter a valid email address.');
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    setRegError('');
    if (loginRole === 'admin') {
      if (!regInstName.trim()) {
        setRegError('Please enter your Institution / Organization Name.');
        return false;
      }
      if (!regInstSlug.trim()) {
        setRegError('Please choose a short Institution Code or Identifier (e.g. dps-delhi).');
        return false;
      }
    } else {
      if (!regInstitutionCode.trim()) {
        setRegError('Please enter your institution code.');
        return false;
      }
      if (loginRole === 'student') {
        if (!regRoll.trim()) {
          setRegError('Please enter your Student Roll Number.');
          return false;
        }
        if (!regDep.trim()) {
          setRegError('Please enter your Academic Department.');
          return false;
        }
      } else if (loginRole === 'teacher' || loginRole === 'hod') {
        if (!regDep.trim()) {
          setRegError('Please enter your Teaching Department.');
          return false;
        }
      }
    }
    return true;
  };

  // Step 3 Validation & Submit
  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setRegError('');

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }
    if (!regConsent) {
      setRegError('Please accept the biometric & data processing consent.');
      return;
    }

    setIsSubmittingReg(true);
    const apiBase = getApiBaseUrl();
    const isInstitution = loginRole === 'admin';
    const isStudent = loginRole === 'student';

    let endpoint = '/auth/register/student';
    let payload = {};

    if (isInstitution) {
      endpoint = '/auth/register/institution';
      payload = {
        name: regInstName.trim(),
        slug: regInstSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, ''),
        admin_name: regName.trim(),
        admin_email: regEmail.trim().toLowerCase(),
        admin_password: regPassword,
        primary_color: '#80602c',
        secondary_color: '#987235',
        subscription_plan: 'free'
      };
    } else if (isStudent) {
      endpoint = '/auth/register/student';
      payload = {
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        institution_code: regInstitutionCode.trim(),
        roll: regRoll.trim(),
        dep: regDep.trim(),
        course: regCourse || 'General',
        year: regYear,
        semester: regSemester,
        gender: regGender,
        phone: regPhone || null
      };
    } else {
      endpoint = '/auth/register/teacher';
      payload = {
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        institution_code: regInstitutionCode.trim(),
        department: regDep.trim()
      };
    }

    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed. Please check credentials.');
      }

      const resolvedEmail = (data.admin_email || regEmail || '').trim().toLowerCase();
      setLoginEmail(resolvedEmail);
      setLoginPassword?.('');
      onClearAuthError?.();
      setRegPassword('');
      setRegConfirmPassword('');

      if (isInstitution) {
        const resolvedCode = (data.institution_code || regInstSlug || '').trim().toLowerCase();
        localStorage.setItem('override_tenant', resolvedCode);
        localStorage.setItem('active_tenant_slug', resolvedCode);
        setLoginWorkspaceSlug?.(resolvedCode);
        setLoginRole('admin');
        onTenantSwitch?.(resolvedCode);
        setRegSuccessData({
          institution_name: data.institution_name || regInstName,
          institution_code: resolvedCode,
          admin_email: resolvedEmail,
          master_key: data.master_key
        });
        setIsRegister(false);
      } else {
        const resolvedCode = regInstitutionCode.trim().toLowerCase();
        if (resolvedCode) {
          localStorage.setItem('override_tenant', resolvedCode);
          localStorage.setItem('active_tenant_slug', resolvedCode);
          setLoginWorkspaceSlug?.(resolvedCode);
          onTenantSwitch?.(resolvedCode);
        }
        setShowPostRegFaceEnroll(true);
      }
    } catch (err) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const activeRole = ROLES.find((r) => r.id === loginRole) || ROLES[0];

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'var(--bg-canvas)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px',
      fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
      color: '#25231f',
      boxSizing: 'border-box'
    }}>
      <div 
        className="auth-card-motion"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1fr'
        }}
      >
        {/* Form Column */}
        <div style={{
          padding: 'clamp(20px, 4vw, 40px) clamp(14px, 3.5vw, 36px)',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden'
        }}>
          
          {/* Header Mobile Brand */}
          {(
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(145deg, #8a6836, #554020)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldCheck size={20} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#25231f', margin: 0 }}>
                  Smart Attendance
                </h3>
              </div>
            </div>
          )}

          {/* Login / Register Toggle Header */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: 'clamp(1.65rem, 4vw, 2rem)', fontWeight: 650, color: '#25231f', margin: 0, letterSpacing: '-0.02em' }}>
              {isRegister ? 'Create Your Account' : 'Welcome back'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#696358', margin: '4px 0 0' }}>
              {isRegister 
                ? 'Join your institutional workspace in 3 quick steps'
                : 'Sign in to access your attendance workspace'}
            </p>
          </div>

          {/* Server Warming Warning */}
          {serverWarmingUp && !isRegister && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                  Server is waking up. Please try again in a moment.
                </span>
              </div>
              <button
                type="button"
                onClick={onWakeServer}
                style={{
                  padding: '4px 10px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fbbf24',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Reconnect
              </button>
            </div>
          )}

          {/* Error Message Alert */}
          {(authError || regError) && (
            <div 
              className="auth-error-shake"
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.82rem',
                fontWeight: 600
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{regError || (authError === 'Unauthorized' ? 'Email or password is incorrect.' : authError)}</span>
            </div>
          )}

          {/* Registration Success Notification Banner */}
          {regSuccessMsg && (
            <div 
              style={{
                padding: '14px 18px',
                borderRadius: '12px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.84rem',
                fontWeight: 600,
                lineHeight: 1.4
              }}
            >
              <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
              <span>{regSuccessMsg}</span>
            </div>
          )}

          {/* Registration Success / Guided Post-Signup Step */}
          {regSuccessData ? (
            <div style={{
              padding: '24px',
              borderRadius: '16px',
              background: '#faf9f6',
              border: '1.5px solid #cfc8ba',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={22} color="#059669" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#25231f' }}>
                    Institution Workspace Provisioned!
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#696358' }}>
                    Your multi-tenant workspace is live and isolated.
                  </p>
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #e4dfd5', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4f1eb', paddingBottom: '8px' }}>
                  <span style={{ color: '#696358', fontWeight: 600 }}>Institution Name:</span>
                  <span style={{ color: '#25231f', fontWeight: 700 }}>{regSuccessData.institution_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4f1eb', paddingBottom: '8px' }}>
                  <span style={{ color: '#696358', fontWeight: 600 }}>Institution code:</span>
                  <span style={{ color: '#80602c', fontWeight: 800, fontFamily: 'monospace' }}>{regSuccessData.institution_code}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f4f1eb', paddingBottom: '8px' }}>
                  <span style={{ color: '#696358', fontWeight: 600 }}>Admin Login Email:</span>
                  <span style={{ color: '#25231f', fontWeight: 600 }}>{regSuccessData.admin_email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', padding: '10px 14px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#be123c', fontWeight: 700, textTransform: 'uppercase' }}>
                      Workspace Master Key
                    </span>
                    <span style={{ fontFamily: 'Consolas, monospace', fontSize: '1.05rem', fontWeight: 800, color: '#9f1239', letterSpacing: '1px' }}>
                      {regSuccessData.master_key}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(regSuccessData.master_key);
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    style={{
                      background: copiedKey ? '#059669' : '#e11d48',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                  </button>
                </div>
              </div>

              <p style={{ margin: '12px 0 16px', fontSize: '0.75rem', color: '#58534a', lineHeight: 1.45 }}>
                🔒 <strong>Please note down this Master Key!</strong> It is required to approve critical administrative actions (reset operations, student deletions, and master password modifications). A copy has also been sent to your email.
              </p>

              <button
                type="button"
                onClick={() => {
                  const code = regSuccessData?.institution_code;
                  if (code) setLoginWorkspaceSlug?.(code);
                  if (regSuccessData?.admin_email) setLoginEmail(regSuccessData.admin_email);
                  setLoginRole('admin');
                  setRegError('');
                  onClearAuthError?.();
                  setRegSuccessData(null);
                }}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  background: 'var(--color-primary)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Proceed to Login
              </button>
            </div>
          ) : showPostRegFaceEnroll ? (
            <div style={{ padding: '28px', borderRadius: '16px', background: '#ecfdf5', border: '1px solid #a7f3d0', textAlign: 'center' }}>
              <CheckCircle2 size={44} color="#059669" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#065f46', margin: 0 }}>Account Created Successfully!</h3>
              <p style={{ fontSize: '0.84rem', color: '#46423b', margin: '8px 0 20px 0', lineHeight: 1.5 }}>
                You can now log in using your credentials. Face enrollment is recommended for biometric attendance scanning.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setRegError('');
                    onClearAuthError?.();
                    setShowPostRegFaceEnroll(false);
                    setIsRegister(false);
                  }}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    background: '#059669',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Proceed to Login
                </button>
              </div>
            </div>
          ) : !isRegister ? (
            /* ================= LOGIN FORM ================= */
            <>
              {/* Role Selection Tabs (Student, Teacher, Admin) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px',
                padding: '4px',
                borderRadius: '12px',
                background: '#f4f1eb',
                border: '1px solid #e4dfd5',
                marginBottom: '20px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {ROLES.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    aria-pressed={loginRole === role.id}
                    onClick={() => setLoginRole(role.id)}
                    style={{
                      width: '100%',
                      padding: '9px 4px',
                      borderRadius: '8px',
                      border: 'none',
                      background: loginRole === role.id ? '#ffffff' : 'transparent',
                      color: loginRole === role.id ? '#25231f' : '#696358',
                      fontSize: '0.82rem',
                      fontWeight: loginRole === role.id ? 700 : 500,
                      boxShadow: loginRole === role.id ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box',
                      minWidth: 0
                    }}
                  >
                    <role.icon size={15} color={loginRole === role.id ? 'var(--color-primary)' : '#696358'} style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role.label}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Institution / Workspace Code (Optional) */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                    Institution Code <span style={{ color: '#94a3b8', fontWeight: 400 }}>(e.g. rit — optional)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input-touch"
                      placeholder="e.g. rit"
                      value={loginWorkspaceSlug || ''}
                      onChange={(e) => {
                        const nextVal = e.target.value;
                        setLoginWorkspaceSlug?.(nextVal);
                        if (!nextVal.trim()) {
                          onTenantSwitch?.('default');
                        }
                        onClearAuthError?.();
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 40px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #cfc8ba',
                        color: '#25231f',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease'
                      }}
                    />
                    <Building2 size={16} color="#696358" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Email / Roll / Username */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                    {loginRole === 'student' ? 'Student Roll No. or Email' : 'Email or Username'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input-touch"
                      placeholder={loginRole === 'student' ? 'e.g. 7 or student@institution.edu' : 'e.g. user@institution.edu'}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      onFocus={() => { if (typeof onWakeServer === 'function') onWakeServer(); }}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 40px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #cfc8ba',
                        color: '#25231f',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease'
                      }}
                    />
                    <Mail size={16} color="#696358" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Password with Eye Toggle */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input-touch"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      onFocus={() => { if (typeof onWakeServer === 'function') onWakeServer(); }}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 40px 12px 40px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #cfc8ba',
                        color: '#25231f',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <Lock size={16} color="#696358" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#696358',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#58534a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ accentColor: '#80602c', width: '15px', height: '15px' }}
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => { setShowForgotPasswordModal(true); setForgotSubmitted(false); setForgotEmail(loginEmail || ''); }}
                    style={{ background: 'none', border: 'none', color: '#80602c', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-touch-target"
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '10px',
                    background: 'var(--color-primary)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isLoading ? 0.7 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isLoading ? 'Signing you in...' : `Sign In as ${activeRole.label}`}
                </button>
              </form>

              {/* Divider & SSO Option */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0 16px 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e4dfd5' }} />
                <span style={{ fontSize: '0.72rem', color: '#696358', fontWeight: 600, textTransform: 'uppercase' }}>or continue with</span>
                <div style={{ flex: 1, height: '1px', background: '#e4dfd5' }} />
              </div>

              {/* Guest / SSO Quick Action */}
              <button
                type="button"
                onClick={() => onExploreGuest(loginRole)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: '#faf9f6',
                  border: '1px solid #cfc8ba',
                  color: '#46423b',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Sparkles size={15} color="#80602c" />
                <span>Explore Guest Demo Mode</span>
              </button>

              {/* Signup Link Footer */}
              <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.82rem', color: '#696358' }}>
                Don't have an account or onboarding a new school?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setRegError('');
                    onClearAuthError?.();
                    setIsRegister(true);
                    setRegStep(1);
                  }}
                  style={{ background: 'none', border: 'none', color: '#80602c', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                >
                  Sign up now
                </button>
              </div>
            </>
          ) : (
            /* ================= 3-STEP SIGNUP WIZARD ================= */
            <div>
              {/* Wizard Progress Bar */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#80602c', marginBottom: '8px' }}>
                  <span>Step {regStep} of 3</span>
                  <span>{regStep === 1 ? 'Personal Details' : regStep === 2 ? (loginRole === 'admin' ? 'Institution Info' : 'Academic Info') : 'Security & Consent'}</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: '#e4dfd5', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${(regStep / 3) * 100}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.25s ease' }} />
                </div>
              </div>

              {/* STEP 1: Personal Details & Role */}
              {regStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                      Registering As
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'admin', label: 'New Institution', icon: Crown, color: '#8b5cf6' },
                        { id: 'student', label: 'Student', icon: GraduationCap, color: '#10b981' },
                        { id: 'teacher', label: 'Teacher', icon: UserCog, color: '#80602c' }
                      ].map(role => (
                        <button
                          key={role.id}
                          type="button"
                          aria-pressed={loginRole === role.id}
                    onClick={() => setLoginRole(role.id)}
                          style={{
                            padding: '10px 6px',
                            borderRadius: '10px',
                            border: loginRole === role.id ? `2px solid ${role.color}` : '1px solid #cfc8ba',
                            background: loginRole === role.id ? '#faf9f6' : '#ffffff',
                            color: loginRole === role.id ? '#25231f' : '#696358',
                            fontSize: '0.8rem',
                            fontWeight: loginRole === role.id ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease',
                            boxShadow: loginRole === role.id ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                          }}
                        >
                          <role.icon size={18} color={role.color} />
                          <span style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>{role.label}</span>
                        </button>
                      ))}
                    </div>
                    {loginRole === 'admin' && (
                      <p style={{ margin: '8px 0 0', fontSize: '0.74rem', color: '#6d28d9', background: '#f5f3ff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd6fe', lineHeight: 1.4 }}>
                        🏫 <strong>New School / College / Org:</strong> Automatically provisions an isolated multi-tenant organization database space and your primary Administrator account.
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                      {loginRole === 'admin' ? 'Administrator Full Name' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      className="form-input-touch"
                      placeholder={loginRole === 'admin' ? 'e.g. Dr. Rajesh Sharma' : 'e.g. Rajkishor Rock'}
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #cfc8ba',
                        color: '#25231f',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                      {loginRole === 'admin' ? 'Administrator Work Email' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      className="form-input-touch"
                      placeholder={loginRole === 'admin' ? 'admin@institution.edu' : 'name@institution.edu'}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #cfc8ba',
                        color: '#25231f',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep1()) setRegStep(2);
                    }}
                    style={{
                      marginTop: '8px',
                      width: '100%',
                      padding: '12px 20px',
                      borderRadius: '10px',
                      background: 'var(--color-primary)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>{loginRole === 'admin' ? 'Continue to Institution Info' : 'Continue to Academic Info'}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* STEP 2: Academic & Institution Details */}
              {regStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {loginRole === 'admin' ? (
                    <>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                          Institution / Organization Name
                        </label>
                        <input
                          type="text"
                          className="form-input-touch"
                          placeholder="e.g. Delhi Public School or Apex Engineering"
                          value={regInstName}
                          onChange={(e) => {
                            const val = e.target.value;
                            const prevAuto = regInstName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
                            setRegInstName(val);
                            if (!regInstSlug || regInstSlug === prevAuto) {
                              setRegInstSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30));
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: '#ffffff',
                            border: '1px solid #cfc8ba',
                            color: '#25231f',
                            fontSize: '0.88rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                          Unique Institution Code / Slug
                        </label>
                        <input
                          type="text"
                          className="form-input-touch"
                          placeholder="e.g. dps-delhi"
                          value={regInstSlug}
                          onChange={(e) => setRegInstSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: '#ffffff',
                            border: '1px solid #cfc8ba',
                            color: '#25231f',
                            fontSize: '0.88rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                        <span style={{ fontSize: '0.72rem', color: '#696358', display: 'block', marginTop: '4px' }}>
                          This unique identifier scopes your data and gives your staff and students a clean portal access code.
                        </span>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                          Primary Contact Phone (Optional)
                        </label>
                        <input
                          type="tel"
                          className="form-input-touch"
                          placeholder="e.g. +91 9876543210"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: '#ffffff',
                            border: '1px solid #cfc8ba',
                            color: '#25231f',
                            fontSize: '0.88rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                          Institution Code
                        </label>
                        <input
                          type="text"
                          className="form-input-touch"
                          placeholder="e.g. default or your school code"
                          value={regInstitutionCode}
                          onChange={(e) => setRegInstitutionCode(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '10px',
                            background: '#ffffff',
                            border: '1px solid #cfc8ba',
                            color: '#25231f',
                            fontSize: '0.88rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {loginRole === 'student' ? (
                        <>
                          <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                              Student Roll Number / ID
                            </label>
                            <input
                              type="text"
                              className="form-input-touch"
                              placeholder="e.g. 2026CSE01"
                              value={regRoll}
                              onChange={(e) => setRegRoll(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                background: '#ffffff',
                                border: '1px solid #cfc8ba',
                                color: '#25231f',
                                fontSize: '0.88rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                              Academic Department
                            </label>
                            <input
                              type="text"
                              className="form-input-touch"
                              placeholder="e.g. Mechanical Engineering"
                              value={regDep}
                              onChange={(e) => setRegDep(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '12px 14px',
                                borderRadius: '10px',
                                background: '#ffffff',
                                border: '1px solid #cfc8ba',
                                color: '#25231f',
                                fontSize: '0.88rem',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <div>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                            Teaching Department
                          </label>
                          <input
                            type="text"
                            className="form-input-touch"
                            placeholder="e.g. Computer Science"
                            value={regDep}
                            onChange={(e) => setRegDep(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '10px',
                              background: '#ffffff',
                              border: '1px solid #cfc8ba',
                              color: '#25231f',
                              fontSize: '0.88rem',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #cfc8ba',
                        color: '#58534a',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep2()) setRegStep(3);
                      }}
                      style={{
                        flex: 2,
                        padding: '12px 20px',
                        borderRadius: '10px',
                        background: 'var(--color-primary)',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>Continue to Security</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Password & Consent */}
              {regStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        className="form-input-touch"
                        placeholder="At least 6 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 40px 12px 14px',
                          borderRadius: '10px',
                          background: '#ffffff',
                          border: '1px solid #cfc8ba',
                          color: '#25231f',
                          fontSize: '0.88rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#696358',
                          cursor: 'pointer'
                        }}
                      >
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      className="form-input-touch"
                      placeholder="Repeat password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #cfc8ba',
                        color: '#25231f',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.78rem', color: '#58534a', cursor: 'pointer', marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      checked={regConsent}
                      onChange={(e) => setRegConsent(e.target.checked)}
                      style={{ accentColor: '#80602c', width: '16px', height: '16px', marginTop: '2px' }}
                    />
                    <span>
                      {loginRole === 'admin'
                        ? 'I agree to institutional administrative policies, secure workspace provisioning, and data governance terms.'
                        : 'I consent to biometric attendance verification and institutional data processing policies.'}
                    </span>
                  </label>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setRegStep(2)}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1px solid #cfc8ba',
                        color: '#58534a',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRegisterSubmit}
                      disabled={isSubmittingReg}
                      style={{
                        flex: 2,
                        padding: '12px 20px',
                        borderRadius: '10px',
                        background: '#059669',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: isSubmittingReg ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        opacity: isSubmittingReg ? 0.7 : 1
                      }}
                    >
                      <span>
                        {isSubmittingReg
                          ? (loginRole === 'admin' ? 'Provisioning Workspace...' : 'Creating Account...')
                          : (loginRole === 'admin' ? 'Register Institution & Admin' : 'Complete Registration')}
                      </span>
                      <Check size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Back to Login */}
              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.82rem', color: '#696358' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setRegError('');
                    onClearAuthError?.();
                    setIsRegister(false);
                  }}
                  style={{ background: 'none', border: 'none', color: '#80602c', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                >
                  Sign in
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Recovery Modal */}
      {showForgotPasswordModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            maxWidth: '440px', width: '100%', background: '#ffffff',
            borderRadius: '16px', border: '1px solid #e4dfd5', padding: '28px',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
            animation: 'fadeInUp 0.25s ease'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0f2fe', color: '#80602c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#25231f' }}>Password Recovery</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#696358' }}>Account credentials assistance</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => { setShowForgotPasswordModal(false); setForgotSubmitted(false); setForgotEmail(''); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {forgotSubmitted ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center', padding: '12px 0' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                  <CheckCircle2 size={28} />
                </div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#25231f' }}>Reset Request Dispatched</h4>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#58534a', lineHeight: 1.5 }}>
                  If an account associated with <strong>{forgotEmail}</strong> exists in this workspace, password reset instructions and institutional admin notification have been generated.
                </p>
                <div style={{ background: '#faf9f6', border: '1px solid #e4dfd5', borderRadius: '10px', padding: '12px', fontSize: '0.78rem', color: '#696358', textAlign: 'left' }}>
                  💡 <strong>Tip for Students & Teachers:</strong> You can also request a temporary access token directly from your Department HOD or College Admin office.
                </div>
                <button
                  type="button"
                  onClick={() => { setShowForgotPasswordModal(false); setForgotSubmitted(false); setForgotEmail(''); }}
                  style={{
                    padding: '10px 16px', background: 'var(--color-primary)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', marginTop: '4px'
                  }}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#58534a', lineHeight: 1.5 }}>
                  Enter your registered institutional email address. We will verify your workspace membership and assist with resetting your password.
                </p>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#25231f' }}>Registered Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. yourname@college.edu"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#faf9f6', border: '1px solid #cfc8ba', color: '#58534a', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ flex: 1.5, padding: '10px', borderRadius: '8px', background: 'var(--color-primary)', border: 'none', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Request Password Reset
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
