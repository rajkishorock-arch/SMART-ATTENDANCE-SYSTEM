import { useState, useEffect } from 'react';
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
  RefreshCw,
  X
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const ROLES = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'teacher', label: 'Teacher', icon: UserCog },
  { id: 'admin', label: 'Admin', icon: Crown }
];

const SIGNUP_ROLES = [
  { id: 'admin', label: 'New Institution', icon: Crown },
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'teacher', label: 'Teacher', icon: UserCog }
];

const inputStyleBase = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: '11px',
  background: '#ffffff',
  border: '1px solid #d9d0be',
  color: '#25231f',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.16s ease, box-shadow 0.16s ease'
};

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
  isWakingOnSubmit = false,
  onSubmit,
  serverWarmingUp,
  onWakeServer,
  onExploreGuest,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isRegister, setIsRegister] = useState(false);
  const [regStep, setRegStep] = useState(1);

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
  const [regPhone, setRegPhone] = useState('');
  const [regConsent, setRegConsent] = useState(true);

  const [regError, setRegError] = useState('');
  const [regSuccessData, setRegSuccessData] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [showPostRegFaceEnroll, setShowPostRegFaceEnroll] = useState(false);
  const [publicDeptState, setPublicDeptState] = useState({
    status: 'idle',
    slug: '',
    institutionName: '',
    departments: []
  });

  useEffect(() => {
    if (!isRegister || loginRole === 'admin') return undefined;
    const rawSlug = regInstitutionCode.trim().toLowerCase();
    if (!rawSlug) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPublicDeptState(prev => ({ ...prev, status: 'loading', slug: rawSlug }));
      try {
        const API_BASE_URL = getApiBaseUrl();
        const res = await fetch(`${API_BASE_URL}/departments/public?slug=${encodeURIComponent(rawSlug)}`, {
          signal: controller.signal
        });
        if (!res.ok) throw new Error('Could not verify institution code');
        const data = await res.json();
        if (controller.signal.aborted) return;

        if (data && data.found) {
          const depts = Array.isArray(data.departments) ? data.departments : [];
          setPublicDeptState({
            status: 'found',
            slug: data.slug || rawSlug,
            institutionName: data.institution_name || rawSlug,
            departments: depts
          });
          if (depts.length > 0) {
            setRegDep(prev => {
              const trimmed = prev.trim().toLowerCase();
              const matched = depts.find(
                d => d.name.toLowerCase() === trimmed || (d.code && d.code.toLowerCase() === trimmed)
              );
              return matched ? matched.name : '';
            });
          }
        } else {
          setPublicDeptState({ status: 'not-found', slug: rawSlug, institutionName: '', departments: [] });
        }
      } catch {
        if (controller.signal.aborted) return;
        setPublicDeptState({ status: 'error', slug: rawSlug, institutionName: '', departments: [] });
      }
    }, 260);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isRegister, loginRole, regInstitutionCode]);

  const effectivePublicDeptState = !regInstitutionCode.trim()
    ? { status: 'idle', slug: '', institutionName: '', departments: [] }
    : publicDeptState;

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleForgotPasswordSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) return;
    setForgotSubmitted(true);
  };

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

  const validateStep2 = () => {
    setRegError('');
    if (loginRole === 'admin') {
      if (!regInstName.trim()) {
        setRegError('Please enter your Institution Name.');
        return false;
      }
      if (!regInstSlug.trim()) {
        setRegError('Please choose a short Institution Code (e.g. dps-delhi).');
        return false;
      }
    } else {
      if (!regInstitutionCode.trim()) {
        setRegError('Please enter your institution code.');
        return false;
      }
      if (effectivePublicDeptState.status === 'loading') {
        setRegError('Verifying institution branches… please wait.');
        return false;
      }
      if (effectivePublicDeptState.status === 'not-found') {
        setRegError(`No active institution found for "${regInstitutionCode.trim()}".`);
        return false;
      }
      const hasRegisteredBranches = effectivePublicDeptState.status === 'found' && effectivePublicDeptState.departments.length > 0;
      if (loginRole === 'student') {
        if (!regRoll.trim()) {
          setRegError('Please enter your Student Roll Number.');
          return false;
        }
        if (!regDep.trim()) {
          setRegError(hasRegisteredBranches ? 'Please select your registered Academic Department.' : 'Please enter your Academic Department.');
          return false;
        }
      } else if (loginRole === 'teacher' || loginRole === 'hod') {
        if (!regDep.trim()) {
          setRegError(hasRegisteredBranches ? 'Please select your registered Teaching Department.' : 'Please enter your Teaching Department.');
          return false;
        }
      }
    }
    return true;
  };

  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setRegError('');

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match.');
      return;
    }
    if (!regConsent) {
      setRegError('Please accept consent to continue.');
      return;
    }

    setIsSubmittingReg(true);
    const apiBase = getApiBaseUrl();
    const isInstitution = loginRole === 'admin';
    const isStudent = loginRole === 'student';

    let endpoint;
    let payload;

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
        course: 'General',
        year: '1st Year',
        semester: 'Sem 1',
        gender: 'Male',
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
  const activeErrorMessage = regError || (authError === 'Unauthorized' ? 'Email or password is incorrect.' : authError);

  return (
    <div style={{
      minHeight: '100dvh',
      width: '100%',
      background: 'linear-gradient(155deg, #fbf8f1 0%, #f3ecdc 55%, #f9f6ef 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 14px',
      fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
      color: '#25231f',
      boxSizing: 'border-box',
      overflowY: 'auto'
    }}>
      <div
        className="golden-os-window auth-card-motion"
        style={{
          width: '100%',
          maxWidth: '430px',
          borderRadius: '22px',
          border: '1px solid #dfd4be',
          boxShadow: '0 22px 48px rgba(72, 56, 26, 0.10)',
          overflow: 'hidden',
          margin: 'auto 0'
        }}
      >
        <div style={{
          padding: 'clamp(18px, 4vw, 28px) clamp(16px, 4vw, 28px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Top Brand Bar + Mode Switch */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '9px',
                background: 'linear-gradient(145deg, #8a6836, #554020)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShieldCheck size={17} color="#ffffff" />
              </div>
              <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#25231f', letterSpacing: '-0.01em' }}>
                Smart Attendance
              </span>
            </div>

            {!regSuccessData && !showPostRegFaceEnroll && (
              <button
                type="button"
                onClick={() => {
                  setRegError('');
                  onClearAuthError?.();
                  setIsRegister(!isRegister);
                  setRegStep(1);
                }}
                style={{
                  padding: '5px 11px',
                  borderRadius: '999px',
                  background: '#faf5ea',
                  border: '1px solid #dfd3b8',
                  color: '#6e5225',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isRegister ? 'Sign In' : 'Sign Up'}
              </button>
            )}
          </div>

          {/* Crisp Single-Line Title */}
          <div>
            <h1 style={{
              fontSize: 'clamp(1.45rem, 3.8vw, 1.75rem)',
              fontWeight: 800,
              color: '#25231f',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              {isRegister ? 'Create Account' : 'Welcome back'}
            </h1>
          </div>

          {/* Single Unified Error / Connection Notice (Never Dual Stacked Boxes) */}
          {activeErrorMessage ? (
            <div
              className="auth-error-shake"
              role="alert"
              style={{
                padding: '10px 12px',
                borderRadius: '11px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                fontSize: '0.8rem',
                fontWeight: 600,
                lineHeight: 1.35
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{activeErrorMessage}</span>
            </div>
          ) : serverWarmingUp && !isRegister && !isLoading ? (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '11px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                fontSize: '0.78rem',
                fontWeight: 600
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <RefreshCw size={14} style={{ flexShrink: 0 }} />
                <span>Connecting to server...</span>
              </span>
              {typeof onWakeServer === 'function' && (
                <button
                  type="button"
                  onClick={onWakeServer}
                  style={{
                    padding: '4px 10px',
                    background: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '7px',
                    color: '#78350f',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          ) : null}

          {/* Registration Success Views */}
          {regSuccessData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="golden-os-inset-card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={20} color="#059669" />
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#25231f' }}>
                    Workspace Created
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#696358' }}>
                    Save your master recovery key below
                  </div>
                </div>
              </div>

              <div className="golden-os-list-shell">
                <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                  <span style={{ color: '#696358', fontSize: '0.82rem' }}>Institution</span>
                  <strong style={{ color: '#25231f', fontSize: '0.84rem' }}>{regSuccessData.institution_name}</strong>
                </div>
                <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                  <span style={{ color: '#696358', fontSize: '0.82rem' }}>Code</span>
                  <strong style={{ color: '#785927', fontFamily: 'monospace', fontSize: '0.86rem' }}>{regSuccessData.institution_code}</strong>
                </div>
                <div className="golden-os-list-row" style={{ cursor: 'default' }}>
                  <span style={{ color: '#696358', fontSize: '0.82rem' }}>Admin Email</span>
                  <strong style={{ color: '#25231f', fontSize: '0.82rem' }}>{regSuccessData.admin_email}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '10px 12px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#be123c', fontWeight: 700, textTransform: 'uppercase' }}>
                    Master Key
                  </span>
                  <span style={{ fontFamily: 'Consolas, monospace', fontSize: '0.98rem', fontWeight: 800, color: '#9f1239' }}>
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
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <button
                type="button"
                className="golden-os-primary-action"
                style={{ justifyContent: 'center' }}
                onClick={() => {
                  const code = regSuccessData?.institution_code;
                  if (code) setLoginWorkspaceSlug?.(code);
                  if (regSuccessData?.admin_email) setLoginEmail(regSuccessData.admin_email);
                  setLoginRole('admin');
                  setRegError('');
                  onClearAuthError?.();
                  setRegSuccessData(null);
                }}
              >
                Proceed to Login
              </button>
            </div>
          ) : showPostRegFaceEnroll ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center', padding: '8px 0' }}>
              <CheckCircle2 size={42} color="#059669" style={{ margin: '0 auto' }} />
              <div style={{ fontSize: '1.08rem', fontWeight: 800, color: '#065f46' }}>Account Created</div>
              <p style={{ fontSize: '0.82rem', color: '#58534a', margin: 0, lineHeight: 1.45 }}>
                Your account is ready. Sign in now to complete face enrollment.
              </p>
              <button
                type="button"
                className="golden-os-primary-action"
                style={{ justifyContent: 'center' }}
                onClick={() => {
                  setRegError('');
                  onClearAuthError?.();
                  setShowPostRegFaceEnroll(false);
                  setIsRegister(false);
                }}
              >
                Proceed to Login
              </button>
            </div>
          ) : !isRegister ? (
            /* ================= ORGANIZED GOLDEN GATE LOGIN ================= */
            <>
              {/* Segmented Role Tabs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '5px',
                padding: '4px',
                borderRadius: '12px',
                background: '#f1ebe0',
                border: '1px solid #e2d8c5',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {ROLES.map(role => {
                  const selected = loginRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setLoginRole(role.id)}
                      style={{
                        width: '100%',
                        padding: '8px 4px',
                        borderRadius: '9px',
                        border: 'none',
                        background: selected ? '#ffffff' : 'transparent',
                        color: selected ? '#25231f' : '#696358',
                        fontSize: '0.8rem',
                        fontWeight: selected ? 700 : 600,
                        boxShadow: selected ? '0 1px 4px rgba(72, 56, 26, 0.09)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        minWidth: 0
                      }}
                    >
                      <role.icon size={15} color={selected ? '#785927' : '#696358'} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role.label}</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Institution Code (Optional) */}
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span>Institution Code</span>
                    <span style={{ color: '#8c8374', fontWeight: 500 }}>Optional</span>
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
                      style={{ ...inputStyleBase, paddingLeft: '38px' }}
                    />
                    <Building2 size={15} color="#787166" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Email / Roll / Username */}
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>
                    {loginRole === 'student' ? 'Roll No. or Email' : 'Email or Username'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input-touch"
                      placeholder={loginRole === 'student' ? 'e.g. 7 or student@institution.edu' : 'e.g. user@institution.edu'}
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        if (authError) onClearAuthError?.();
                      }}
                      onFocus={() => { if (typeof onWakeServer === 'function') onWakeServer(); }}
                      required
                      style={{ ...inputStyleBase, paddingLeft: '38px' }}
                    />
                    <Mail size={15} color="#787166" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input-touch"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        if (authError) onClearAuthError?.();
                      }}
                      onFocus={() => { if (typeof onWakeServer === 'function') onWakeServer(); }}
                      required
                      style={{ ...inputStyleBase, paddingLeft: '38px', paddingRight: '38px' }}
                    />
                    <Lock size={15} color="#787166" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
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

                {/* Remember Me & Forgot Password */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#58534a', cursor: 'pointer' }}>
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
                    style={{ background: 'none', border: 'none', color: '#785927', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Primary Sign In CTA */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="golden-os-primary-action btn-touch-target"
                  style={{
                    marginTop: '4px',
                    width: '100%',
                    minHeight: '44px',
                    justifyContent: 'center',
                    opacity: isLoading ? 0.8 : 1
                  }}
                >
                  <span>
                    {isLoading
                      ? (isWakingOnSubmit ? 'Waking server...' : 'Signing in...')
                      : `Sign In as ${activeRole.label}`}
                  </span>
                </button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e6dfd0' }} />
                <span style={{ fontSize: '0.68rem', color: '#8c8374', fontWeight: 700, textTransform: 'uppercase' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: '#e6dfd0' }} />
              </div>

              <button
                type="button"
                className="golden-os-feedback-filter-btn"
                onClick={() => onExploreGuest(loginRole)}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}
              >
                <Sparkles size={14} color="#785927" />
                <span>Explore Guest Demo Mode</span>
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#696358' }}>
                New user or institution?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setRegError('');
                    onClearAuthError?.();
                    setIsRegister(true);
                    setRegStep(1);
                  }}
                  style={{ background: 'none', border: 'none', color: '#785927', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                >
                  Sign up now
                </button>
              </div>
            </>
          ) : (
            /* ================= ORGANIZED 3-STEP SIGNUP WIZARD ================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Compact Stepper Header */}
              <div style={{ background: '#f5f0e4', border: '1px solid #e4dccb', borderRadius: '12px', padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', fontWeight: 700, color: '#785927', marginBottom: '7px' }}>
                  <span>Step {regStep} of 3</span>
                  <span style={{ color: '#46423b' }}>
                    {regStep === 1 ? 'Account Details' : regStep === 2 ? (loginRole === 'admin' ? 'Institution Setup' : 'Campus & Branch') : 'Password & Consent'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                  {[1, 2, 3].map(step => (
                    <div
                      key={step}
                      style={{
                        height: '4px',
                        borderRadius: '999px',
                        background: step <= regStep ? '#785927' : '#dfd6c5',
                        transition: 'background 0.2s ease'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* STEP 1: Role + Identity */}
              {regStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '6px' }}>
                      Account Type
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '5px',
                      padding: '4px',
                      borderRadius: '12px',
                      background: '#f1ebe0',
                      border: '1px solid #e2d8c5'
                    }}>
                      {SIGNUP_ROLES.map(role => {
                        const selected = loginRole === role.id;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setLoginRole(role.id)}
                            style={{
                              padding: '8px 4px',
                              borderRadius: '9px',
                              border: 'none',
                              background: selected ? '#ffffff' : 'transparent',
                              color: selected ? '#25231f' : '#696358',
                              fontSize: '0.76rem',
                              fontWeight: selected ? 700 : 600,
                              boxShadow: selected ? '0 1px 4px rgba(72, 56, 26, 0.09)' : 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <role.icon size={15} color={selected ? '#785927' : '#696358'} />
                            <span style={{ textAlign: 'center', lineHeight: 1.15 }}>{role.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>
                      {loginRole === 'admin' ? 'Administrator Name' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      className="form-input-touch"
                      placeholder={loginRole === 'admin' ? 'e.g. Dr. Rajesh Sharma' : 'e.g. Rajkishor Rock'}
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      style={inputStyleBase}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>
                      {loginRole === 'admin' ? 'Work Email' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      className="form-input-touch"
                      placeholder={loginRole === 'admin' ? 'admin@institution.edu' : 'name@institution.edu'}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      style={inputStyleBase}
                    />
                  </div>

                  <button
                    type="button"
                    className="golden-os-primary-action"
                    style={{ width: '100%', justifyContent: 'center', marginTop: '2px' }}
                    onClick={() => {
                      if (validateStep1()) setRegStep(2);
                    }}
                  >
                    <span>{loginRole === 'admin' ? 'Continue to Institution Info' : 'Continue to Academic Info'}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* STEP 2: Campus & Academic Info */}
              {regStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {loginRole === 'admin' ? (
                    <>
                      <div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>
                          Institution Name
                        </label>
                        <input
                          type="text"
                          className="form-input-touch"
                          placeholder="e.g. Apex Engineering College"
                          value={regInstName}
                          onChange={(e) => {
                            const val = e.target.value;
                            const prevAuto = regInstName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
                            setRegInstName(val);
                            if (!regInstSlug || regInstSlug === prevAuto) {
                              setRegInstSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30));
                            }
                          }}
                          style={inputStyleBase}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>
                          Unique Institution Code
                        </label>
                        <input
                          type="text"
                          className="form-input-touch"
                          placeholder="e.g. apex-eng"
                          value={regInstSlug}
                          onChange={(e) => setRegInstSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                          style={inputStyleBase}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span>Contact Phone</span>
                          <span style={{ color: '#8c8374', fontWeight: 500 }}>Optional</span>
                        </label>
                        <input
                          type="tel"
                          className="form-input-touch"
                          placeholder="e.g. +91 9876543210"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          style={inputStyleBase}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>
                          Institution Code
                        </label>
                        <input
                          type="text"
                          className="form-input-touch"
                          placeholder="e.g. default or your school code"
                          value={regInstitutionCode}
                          onChange={(e) => setRegInstitutionCode(e.target.value)}
                          style={inputStyleBase}
                        />
                        {regInstitutionCode.trim() && (
                          <div style={{
                            marginTop: '5px',
                            fontSize: '0.73rem',
                            fontWeight: 600,
                            color: effectivePublicDeptState.status === 'found'
                              ? '#059669'
                              : effectivePublicDeptState.status === 'not-found'
                                ? '#dc2626'
                                : '#696358'
                          }}>
                            {effectivePublicDeptState.status === 'loading' && 'Checking institution & branches…'}
                            {effectivePublicDeptState.status === 'found' && `✓ ${effectivePublicDeptState.institutionName} (${effectivePublicDeptState.departments.length} branch${effectivePublicDeptState.departments.length === 1 ? '' : 'es'})`}
                            {effectivePublicDeptState.status === 'not-found' && `No active institution matches "${regInstitutionCode.trim()}".`}
                            {effectivePublicDeptState.status === 'error' && 'Could not fetch branches — enter department below.'}
                          </div>
                        )}
                      </div>

                      {(() => {
                        const fieldLabel = loginRole === 'student' ? 'Academic Department' : 'Teaching Department';
                        const hasBranches = effectivePublicDeptState.status === 'found' && effectivePublicDeptState.departments.length > 0;
                        const mustEnterValidCodeFirst = !regInstitutionCode.trim() || effectivePublicDeptState.status === 'not-found';
                        const deptControl = hasBranches ? (
                          <select
                            className="form-input-touch"
                            aria-label={fieldLabel}
                            value={regDep}
                            onChange={(e) => setRegDep(e.target.value)}
                            style={{ ...inputStyleBase, cursor: 'pointer', color: regDep ? '#25231f' : '#696358' }}
                          >
                            <option value="">Select registered branch ({effectivePublicDeptState.departments.length})</option>
                            {effectivePublicDeptState.departments.map(dept => (
                              <option key={dept.id || dept.name} value={dept.name}>
                                {dept.code ? `${dept.name} (${dept.code})` : dept.name}
                              </option>
                            ))}
                          </select>
                        ) : mustEnterValidCodeFirst ? (
                          <select
                            className="form-input-touch"
                            aria-label={fieldLabel}
                            disabled
                            value=""
                            style={{ ...inputStyleBase, background: '#f4f0e6', color: '#696358', cursor: 'not-allowed' }}
                          >
                            <option value="">
                              {!regInstitutionCode.trim()
                                ? 'Enter Institution Code first'
                                : 'Enter a valid Institution Code'}
                            </option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            className="form-input-touch"
                            placeholder={loginRole === 'student' ? 'e.g. Mechanical Engineering' : 'e.g. Computer Science'}
                            value={regDep}
                            onChange={(e) => setRegDep(e.target.value)}
                            style={inputStyleBase}
                          />
                        );

                        if (loginRole === 'student') {
                          return (
                            <>
                              <div>
                                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>
                                  Roll Number
                                </label>
                                <input
                                  type="text"
                                  className="form-input-touch"
                                  placeholder="e.g. 2026CSE01"
                                  value={regRoll}
                                  onChange={(e) => setRegRoll(e.target.value)}
                                  style={inputStyleBase}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>
                                  {fieldLabel}
                                </label>
                                {deptControl}
                              </div>
                            </>
                          );
                        }

                        return (
                          <div>
                            <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>
                              {fieldLabel}
                            </label>
                            {deptControl}
                          </div>
                        );
                      })()}
                    </>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="golden-os-feedback-filter-btn"
                      onClick={() => setRegStep(1)}
                      style={{ flex: 1, justifyContent: 'center', padding: '11px 14px' }}
                    >
                      <ArrowLeft size={15} />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      className="golden-os-primary-action"
                      onClick={() => {
                        if (validateStep2()) setRegStep(3);
                      }}
                      style={{ flex: 2, justifyContent: 'center' }}
                    >
                      <span>Continue</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Password & Consent */}
              {regStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        className="form-input-touch"
                        placeholder="At least 6 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        style={{ ...inputStyleBase, paddingRight: '38px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
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
                    <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      className="form-input-touch"
                      placeholder="Repeat password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      style={inputStyleBase}
                    />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '0.76rem', color: '#58534a', cursor: 'pointer', lineHeight: 1.4 }}>
                    <input
                      type="checkbox"
                      checked={regConsent}
                      onChange={(e) => setRegConsent(e.target.checked)}
                      style={{ accentColor: '#80602c', width: '15px', height: '15px', marginTop: '2px' }}
                    />
                    <span>
                      I agree to biometric verification and institutional data policies.
                    </span>
                  </label>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="golden-os-feedback-filter-btn"
                      onClick={() => setRegStep(2)}
                      style={{ flex: 1, justifyContent: 'center', padding: '11px 14px' }}
                    >
                      <ArrowLeft size={15} />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      className="golden-os-primary-action"
                      onClick={handleRegisterSubmit}
                      disabled={isSubmittingReg}
                      style={{ flex: 2, justifyContent: 'center', background: '#059669' }}
                    >
                      <span>
                        {isSubmittingReg
                          ? 'Creating...'
                          : (loginRole === 'admin' ? 'Register Institution' : 'Complete Registration')}
                      </span>
                      <Check size={15} />
                    </button>
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#696358' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setRegError('');
                    onClearAuthError?.();
                    setIsRegister(false);
                  }}
                  style={{ background: 'none', border: 'none', color: '#785927', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                >
                  Sign in
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPasswordModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div
            className="golden-os-window"
            style={{
              maxWidth: '410px',
              width: '100%',
              borderRadius: '18px',
              border: '1px solid #dfd4be',
              padding: '22px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#faf5ea', border: '1px solid #dfcfaf', color: '#785927', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={17} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#25231f' }}>Password Recovery</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowForgotPasswordModal(false); setForgotSubmitted(false); setForgotEmail(''); }}
                style={{ background: 'none', border: 'none', color: '#696358', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {forgotSubmitted ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center', padding: '6px 0' }}>
                <CheckCircle2 size={38} color="#059669" style={{ margin: '0 auto' }} />
                <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#25231f' }}>Reset Request Generated</div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#58534a', lineHeight: 1.45 }}>
                  If <strong>{forgotEmail}</strong> is registered, contact your institution administrator if you do not receive instructions.
                </p>
                <button
                  type="button"
                  className="golden-os-primary-action"
                  style={{ justifyContent: 'center' }}
                  onClick={() => { setShowForgotPasswordModal(false); setForgotSubmitted(false); setForgotEmail(''); }}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#58534a', lineHeight: 1.45 }}>
                  Enter your registered email address to request credential assistance.
                </p>
                <div>
                  <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#46423b', display: 'block', marginBottom: '5px' }}>Email Address</label>
                  <input
                    type="email"
                    placeholder="name@institution.edu"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    style={inputStyleBase}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    className="golden-os-feedback-filter-btn"
                    onClick={() => setShowForgotPasswordModal(false)}
                    style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="golden-os-primary-action"
                    style={{ flex: 1.5, justifyContent: 'center' }}
                  >
                    Request Reset
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
