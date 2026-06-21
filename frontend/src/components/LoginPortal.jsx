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
  serverWarmingUp,
  onExploreGuest,
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

          {serverWarmingUp && (
            <div className="login-portal-error" style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#f59e0b',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
              <span style={{ fontSize: '0.8rem', textAlign: 'left', lineHeight: '1.4' }}>
                <strong>Cloud Server Warming Up:</strong> Waking up sleeping server instance. Please wait (~45 seconds) for portal database connection.
              </span>
            </div>
          )}

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

          {/* Futuristic Guest Mode Divider */}
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
