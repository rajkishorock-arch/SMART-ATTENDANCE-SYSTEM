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
            <h1 className="login-portal-title">SMART AI SYSTEM</h1>
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
              onClick={() => setLoginRole(id)}
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
            {activeRole.label} Portal
          </div>

          <p className="login-portal-card-desc">
            Please login using <strong>{activeRole.label}</strong> credentials only. Logging into the incorrect portal will block your access.
          </p>

          {authError && (
            <div className="login-portal-error">
              <AlertCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={onSubmit} className="login-portal-form">
            <div className="form-group">
              <label className="form-label">
                <Mail size={14} /> Email Address
              </label>
              <input
                type="email"
                className="form-input login-portal-input"
                placeholder={`${activeRole.label.toLowerCase()}@email.com`}
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
        </div>

        <p className="login-portal-footer">ROLE LOCK ACTIVE • UNAUTHORIZED ACCESS DENIED</p>
      </div>
    </div>
  );
}
