import { 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  Palette, 
  Volume2, 
  UserCheck, 
  UserPlus, 
  BookOpen, 
  BarChart3, 
  ArrowUpCircle 
} from 'lucide-react';
import { getActiveTenantSlug as getTenantSlugUtil } from '../../utils/tenantConfig';

export default function SettingsDirectoryHub({
  setActiveSubSetting,
  playCyberSound,
  userRole,
  currentUser,
  getActiveTenantSlug,
  handleManualCheck,
  fetchAdminLeaves,
  adminLeaveRequests = [],
  appVersion
}) {
  const activeTenantSlug = getActiveTenantSlug ? getActiveTenantSlug() : getTenantSlugUtil();
  const pendingLeavesCount = (adminLeaveRequests || []).filter(r => r?.status === 'Pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel hide-on-mobile" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, background: 'linear-gradient(90deg, #00f2fe, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ⚙️ Institutional Settings Directory Hub
        </h2>
        <p style={{ color: '#cbd5e1', fontSize: '0.9rem', margin: 0 }}>
          Select a settings category below to configure security boundaries, user permissions, biometric thresholds, and visual theme customizations.
        </p>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px'
      }}>
        {/* Category Card 1: GPS, IP Subnet & Emergency Lockdown */}
        <div 
          onClick={() => { setActiveSubSetting('geofencing'); if (playCyberSound) playCyberSound('click'); }}
          className="glass-panel hover-card" 
          style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.4)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(0, 242, 254, 0.1))' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={26} style={{ color: '#00f2fe' }} />
              <Lock size={22} style={{ color: '#a78bfa' }} />
              <AlertCircle size={24} style={{ color: '#ef4444' }} />
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
              🛡️ MERGED PERIMETER & LOCKDOWN
            </span>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Security Perimeter, GPS Geofence & Emergency Lockdown</h3>
          <p style={{ color: '#cbd5e1', fontSize: '0.82rem', margin: 0, flexGrow: 1, lineHeight: 1.4 }}>
            Configure GPS location boundaries, authorized Wi-Fi subnet gates, and instant emergency threat lockdown disarm controls in one place.
          </p>
        </div>

        {/* Category Card 4: Themes, Cyber Audio & Synth Equalizer */}
        <div 
          onClick={() => { setActiveSubSetting('themes'); if (playCyberSound) playCyberSound('click'); }}
          className="glass-panel hover-card" 
          style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.4)', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0, 242, 254, 0.1))' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Palette size={24} style={{ color: '#a78bfa' }} />
              <Volume2 size={22} style={{ color: '#00f2fe' }} />
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc' }}>
              ✨ MERGED STUDIO
            </span>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Themes, Cyber Audio & Synth Equalizer</h3>
          <p style={{ color: '#cbd5e1', fontSize: '0.82rem', margin: 0, flexGrow: 1, lineHeight: 1.4 }}>
            Choose UI theme palettes, CRT scanlines, acoustic click feedback, base pitch registers, waveform modulators, and ambient hum drones in one place.
          </p>
        </div>

        {/* Category Card 5: Advanced Security Console */}
        {userRole !== 'student' && (
          <div 
            onClick={() => { setActiveSubSetting('advanced'); if (playCyberSound) playCyberSound('click'); }}
            className="glass-panel hover-card" 
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <ShieldCheck size={26} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>🏢 Admins & Teachers</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Extreme Biometric Security</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, flexGrow: 1, lineHeight: 1.4 }}>Biometric match confidence filter, EAR spoof strictness, AI cognitive level, and telemetry logs.</p>
          </div>
        )}

        {/* Category Card 6: Admin Profile Settings */}
        {userRole !== 'student' && (
          <div 
            onClick={() => { setActiveSubSetting('profile'); if (playCyberSound) playCyberSound('click'); }}
            className="glass-panel hover-card" 
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', borderRadius: '16px', border: '1px solid rgba(167, 139, 250, 0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <UserCheck size={26} style={{ color: '#a78bfa' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px', background: 'rgba(167, 139, 250, 0.15)', color: '#c084fc' }}>🏢 All Admins</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>My Admin Profile</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, flexGrow: 1, lineHeight: 1.4 }}>Modify administrator profile name, login email address, or update system password credentials.</p>
          </div>
        )}

        {/* Category Card 7: Admin Account Registry */}
        {userRole !== 'student' && (
          <div 
            onClick={() => { setActiveSubSetting('admins'); if (playCyberSound) playCyberSound('click'); }}
            className="glass-panel hover-card" 
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', borderRadius: '16px', border: '1px solid rgba(0, 242, 254, 0.2)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <UserPlus size={26} style={{ color: '#00f2fe' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe' }}>🏢 All Admins</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Register Administrators</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, flexGrow: 1, lineHeight: 1.4 }}>Seed and manage new auxiliary administrator credentials or activate/deactivate accounts.</p>
          </div>
        )}

        {/* Category Card 8: Manage Departments */}
        {userRole !== 'student' && (
          <div 
            onClick={() => { setActiveSubSetting('departments'); if (playCyberSound) playCyberSound('click'); }}
            className="glass-panel hover-card" 
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', borderRadius: '16px', border: '1px solid rgba(236, 72, 153, 0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <BookOpen size={26} style={{ color: '#ec4899' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>🏫 Setup</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Manage Departments</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, flexGrow: 1, lineHeight: 1.4 }}>Configure active college departments and branches for dynamic system dropdowns.</p>
          </div>
        )}

        {/* Category Card 9: Productivity Hub */}
        {userRole !== 'student' && (
          <div 
            onClick={() => { setActiveSubSetting('productivity'); if (playCyberSound) playCyberSound('click'); }}
            className="glass-panel hover-card" 
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <BarChart3 size={26} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>NEW</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Productivity Hub</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, flexGrow: 1, lineHeight: 1.4 }}>Bulk CSV import, analytics, audit trail, ERP API keys, billing, and institution FAQ.</p>
          </div>
        )}

        {/* Category Card 10: Exploration Lab */}
        {userRole !== 'student' && (
          <div
            onClick={() => { setActiveSubSetting('exploration'); if (playCyberSound) playCyberSound('click'); }}
            className="glass-panel hover-card"
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', borderRadius: '16px', border: '1px solid rgba(167, 139, 250, 0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem' }}>✨</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px', background: 'rgba(167, 139, 250, 0.15)', color: '#c084fc' }}>FUN</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Exploration Lab</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, flexGrow: 1, lineHeight: 1.4 }}>Hidden FX, scanner sound packs, confetti mode, particle density, and secret discoveries.</p>
          </div>
        )}

        {/* Category Card 11: Futuristic Features Hub */}
        <div
          onClick={() => { setActiveSubSetting('futuristic'); if (playCyberSound) playCyberSound('click'); }}
          className="glass-panel hover-card"
          style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', borderRadius: '16px', border: '1px solid rgba(0, 242, 254, 0.3)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.5rem' }}>🚀</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px', background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe' }}>NEW</span>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Futuristic Features Hub</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, flexGrow: 1, lineHeight: 1.4 }}>Theme Studio, Widget Home, Polls, Health Check, Campus Map, Premium Control, and more.</p>
        </div>

        {/* Consolidated Master Folder Card: Advanced Features & AR Suite */}
        <div
          onClick={() => { setActiveSubSetting('features_folder'); if (playCyberSound) playCyberSound('click'); }}
          className="glass-panel hover-card"
          style={{
            padding: '24px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            transition: 'all 0.3s ease',
            minHeight: '160px',
            border: '1.5px solid rgba(0, 242, 254, 0.4)',
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.08) 0%, rgba(167, 139, 250, 0.08) 100%)',
            boxShadow: '0 8px 30px rgba(0, 242, 254, 0.12)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.6rem' }}>📦</span>
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 10px', borderRadius: '20px', background: 'linear-gradient(135deg, #00f2fe, #a78bfa)', color: '#000' }}>7 HUBS IN 1</span>
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '0.01em' }}>
            Advanced Features & AR Innovation Hub
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1, lineHeight: '1.4' }}>
            Single folder containing Industry Suite, Extreme 56, Ideas 150, 7 Enterprise, 40 New Features, Wellness Center & AR Gamification Portal.
          </p>
        </div>

        {/* Category Card: Premium Subscription */}
        {userRole === 'admin' && (
          <div
            onClick={() => { setActiveSubSetting('premium'); if (playCyberSound) playCyberSound('click'); }}
            className="glass-panel hover-card"
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.4rem' }}>👑</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24' }}>PRO</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Premium & Payments</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Upgrade plans via Razorpay — unlock pro themes, higher student limits, and enterprise ERP.</p>
          </div>
        )}

        {/* Category Card: App Version */}
        <div
          onClick={() => { 
            setActiveSubSetting('app_version'); 
            if (playCyberSound) playCyberSound('click'); 
            if (handleManualCheck) handleManualCheck(); 
          }}
          className="glass-panel hover-card"
          style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <ArrowUpCircle size={24} style={{ color: '#0891b2' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(8, 145, 178, 0.12)', color: '#22d3ee' }}>v{appVersion}</span>
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>App Version & Updates</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>See if you are on the latest build, check for new releases, and confirm update installation.</p>
        </div>

        {/* Category Card 9: Multi-Tenant Registry & Management */}
        {userRole !== 'student' && activeTenantSlug === 'default' && currentUser?.institution_id === 1 && (
          <div 
            onClick={() => { setActiveSubSetting('multitenant'); if (playCyberSound) playCyberSound('click'); }}
            className="glass-panel hover-card" 
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🏫</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(167, 139, 250, 0.12)', color: '#a78bfa' }}>👑 Owner Only</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>Multi-Tenant Registry</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Register, monitor, and delete college tenants. Configure primary/secondary color schemes and seed initial admins.</p>
          </div>
        )}

        {/* Category Card 11: System Release Updates */}
        {userRole === 'admin' && (
          <div 
            onClick={() => { setActiveSubSetting('release_updates'); if (playCyberSound) playCyberSound('click'); }}
            className="glass-panel hover-card" 
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', border: '1px solid rgba(16, 185, 129, 0.25)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <ArrowUpCircle size={24} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>🚀 Release Manager</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>System Release Updates</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Publish new system-wide APK versions, trigger GitHub Actions build, and control update prompts for all users.</p>
          </div>
        )}

        {/* Category Card 12: Leave Management */}
        {userRole !== 'student' && (
          <div 
            onClick={() => { 
              setActiveSubSetting('leave_management'); 
              if (fetchAdminLeaves) fetchAdminLeaves(); 
              if (playCyberSound) playCyberSound('click'); 
            }}
            className="glass-panel hover-card" 
            style={{ padding: '24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.3s ease', minHeight: '160px', border: '1px solid rgba(251,146,60,0.2)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.4rem' }}>📋</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '4px', background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}>👩‍🏫 Teacher/Admin</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Leave Management</h3>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', margin: 0, flexGrow: 1 }}>Review, approve, or reject student leave requests with full history.</p>
            {pendingLeavesCount > 0 && (
              <span style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                {pendingLeavesCount} Pending
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
