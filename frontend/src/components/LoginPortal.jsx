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
  Check
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
    color: '#3b82f6',
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
  authError,
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
  const [regRoll, setRegRoll] = useState('');
  const [regDep, setRegDep] = useState('');
  const [regCourse] = useState('');
  const [regYear] = useState('1st Year');
  const [regSemester] = useState('Sem 1');
  const [regGender] = useState('Male');
  const [regPhone] = useState('');
  const [regConsent, setRegConsent] = useState(true);

  const [regError, setRegError] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [showPostRegFaceEnroll, setShowPostRegFaceEnroll] = useState(false);

  const [selectedTenant, setSelectedTenant] = useState(localStorage.getItem('override_tenant') || 'default');

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
    } else if (loginRole === 'teacher') {
      if (!regDep.trim()) {
        setRegError('Please enter your Teaching Department.');
        return false;
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
    const isStudent = loginRole === 'student';
    const endpoint = isStudent ? '/auth/register/student' : '/auth/register/teacher';

    const payload = isStudent ? {
      name: regName,
      email: regEmail,
      password: regPassword,
      institution_code: regInstitutionCode,
      roll: regRoll,
      dep: regDep,
      course: regCourse || 'General',
      year: regYear,
      semester: regSemester,
      gender: regGender,
      phone: regPhone || null
    } : {
      name: regName,
      email: regEmail,
      password: regPassword,
      institution_code: regInstitutionCode,
      department: regDep
    };

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

      setShowPostRegFaceEnroll(true);
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
      background: 'radial-gradient(circle at 50% 20%, #0f172a 0%, #070a12 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px',
      fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
      color: '#f8fafc',
      boxSizing: 'border-box'
    }}>
      <div 
        className="auth-card-motion"
        style={{
          width: '100%',
          maxWidth: isRegister ? '520px' : '960px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(16px)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: (!isRegister && window.innerWidth >= 860) ? '1fr 1fr' : '1fr',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        {/* Left Branding Showcase Column (Desktop Only for Login) */}
        {!isRegister && window.innerWidth >= 860 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(59, 130, 246, 0.04))',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '48px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(14, 165, 233, 0.3)'
                }}>
                  <ShieldCheck size={24} color="#ffffff" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
                    SMART ATTENDANCE
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0' }}>
                    Next-Gen Institutional Attendance & LMS
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '40px' }}>
                {[
                  { title: 'Sub-Millisecond Face Verification', desc: 'AI-powered instant multi-face detection & liveness check.', icon: Sparkles },
                  { title: 'Role Isolation & Data Privacy', desc: 'Secure student, teacher, and administrative workspace portals.', icon: ShieldCheck },
                  { title: 'Offline Attendance Queue & Auto-Sync', desc: 'Continuous camera check-in even without active internet.', icon: CheckCircle2 }
                ].map((feature, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(14, 165, 233, 0.12)',
                      border: '1px solid rgba(14, 165, 233, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      <feature.icon size={16} color="#38bdf8" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                        {feature.title}
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0', lineHeight: 1.4 }}>
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.75rem',
              color: '#64748b'
            }}>
              Protected by Enterprise Geofencing & AES-256 Biometric Vector Encryption.
            </div>
          </div>
        )}

        {/* Form Column */}
        <div style={{ padding: window.innerWidth < 480 ? '24px 20px' : '40px 36px', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header Mobile Brand */}
          {(isRegister || window.innerWidth < 860) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldCheck size={20} color="#ffffff" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  SMART ATTENDANCE
                </h3>
              </div>
            </div>
          )}

          {/* Login / Register Toggle Header */}
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
              {isRegister ? 'Create Your Account' : 'Welcome back'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0' }}>
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
                Wake Now
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

          {/* Registration Success / Guided Post-Signup Step */}
          {showPostRegFaceEnroll ? (
            <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
              <CheckCircle2 size={44} color="#10b981" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Account Created Successfully!</h3>
              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', margin: '8px 0 20px 0', lineHeight: 1.4 }}>
                You can now log in using your credentials. Face enrollment is recommended for biometric attendance scan.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPostRegFaceEnroll(false);
                    setIsRegister(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: 'linear-gradient(90deg, #10b981, #059669)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.85rem',
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
              {/* Role Selection Tabs */}
              <div style={{
                display: 'flex',
                gap: '6px',
                padding: '4px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: '20px'
              }}>
                {ROLES.map(role => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setLoginRole(role.id)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: loginRole === role.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      color: loginRole === role.id ? '#f8fafc' : '#94a3b8',
                      fontSize: '0.82rem',
                      fontWeight: loginRole === role.id ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <role.icon size={15} color={loginRole === role.id ? role.color : '#94a3b8'} />
                    <span>{role.label}</span>
                  </button>
                ))}
              </div>

              <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Email / Username */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Email or Username
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input-touch"
                      placeholder="e.g. student@institution.edu"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 40px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8fafc',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color 0.15s ease'
                      }}
                    />
                    <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Password with Eye Toggle */}
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input-touch"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 40px 12px 40px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8fafc',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                    <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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
                        color: '#94a3b8',
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
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ accentColor: '#3b82f6', width: '15px', height: '15px' }}
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => alert('Please contact your institution administrator to reset your password.')}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}
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
                    background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
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
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>or continue with</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
              </div>

              {/* Guest / SSO Quick Action */}
              <button
                type="button"
                onClick={() => onExploreGuest(loginRole)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Sparkles size={15} color="#3b82f6" />
                <span>Explore Guest Demo Mode</span>
              </button>

              {/* Signup Link Footer */}
              {loginRole !== 'admin' && (
                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setRegError('');
                      setIsRegister(true);
                      setRegStep(1);
                    }}
                    style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                  >
                    Sign up now
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ================= 3-STEP SIGNUP WIZARD ================= */
            <div>
              {/* Wizard Progress Bar */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, color: '#3b82f6', marginBottom: '8px' }}>
                  <span>Step {regStep} of 3</span>
                  <span>{regStep === 1 ? 'Personal Details' : regStep === 2 ? 'Academic Info' : 'Security & Consent'}</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${(regStep / 3) * 100}%`, height: '100%', background: '#3b82f6', transition: 'width 0.25s ease' }} />
                </div>
              </div>

              {/* STEP 1: Personal Details & Role */}
              {regStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                      Registering As
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {ROLES.filter(r => r.id !== 'admin').map(role => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setLoginRole(role.id)}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: loginRole === role.id ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: loginRole === role.id ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                            color: '#f8fafc',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <role.icon size={16} color={role.color} />
                          <span>{role.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      className="form-input-touch"
                      placeholder="e.g. Rajkishor Rock"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8fafc',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="form-input-touch"
                      placeholder="name@institution.edu"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8fafc',
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
                      background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
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
                    <span>Continue to Academic Info</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* STEP 2: Academic & Institution Details */}
              {regStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
                      Institution Code
                    </label>
                    <input
                      type="text"
                      className="form-input-touch"
                      placeholder="e.g. default"
                      value={regInstitutionCode}
                      onChange={(e) => setRegInstitutionCode(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8fafc',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {loginRole === 'student' ? (
                    <>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
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
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#f8fafc',
                            fontSize: '0.88rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
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
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#f8fafc',
                            fontSize: '0.88rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
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
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8fafc',
                          fontSize: '0.88rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#cbd5e1',
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
                        background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
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
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
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
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#f8fafc',
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
                          color: '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', display: 'block', marginBottom: '6px' }}>
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
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#f8fafc',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer', marginTop: '4px' }}>
                    <input
                      type="checkbox"
                      checked={regConsent}
                      onChange={(e) => setRegConsent(e.target.checked)}
                      style={{ accentColor: '#3b82f6', width: '16px', height: '16px', marginTop: '2px' }}
                    />
                    <span>I consent to biometric attendance verification and institutional data processing policies.</span>
                  </label>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setRegStep(2)}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#cbd5e1',
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
                        background: 'linear-gradient(90deg, #10b981, #059669)',
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
                      <span>{isSubmittingReg ? 'Creating Account...' : 'Complete Registration'}</span>
                      <Check size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Back to Login */}
              <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.82rem', color: '#94a3b8' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                >
                  Sign in
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
