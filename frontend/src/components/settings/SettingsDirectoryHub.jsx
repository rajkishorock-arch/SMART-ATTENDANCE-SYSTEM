import { 
  ShieldCheck, 
  Lock, 
  UserCheck, 
  UserPlus, 
  BookOpen, 
  ArrowUpCircle,
  FileCheck2,
  Building2,
  Sliders
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {/* Category Card 1: GPS & Security Perimeter */}
        {userRole === 'admin' && (
          <div 
            onClick={() => { setActiveSubSetting('geofencing'); if (playCyberSound) playCyberSound('click'); }}
            className="surface-card hover-card" 
            style={{ 
              padding: '24px', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              minHeight: '150px', 
              borderRadius: '14px', 
              border: '1px solid var(--border-subtle)',
              background: '#ffffff',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: 'rgba(30, 64, 175, 0.08)', 
                color: 'var(--color-primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <ShieldCheck size={22} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: '#eff6ff', color: '#1e40af' }}>
                Security
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Security Perimeter & Geofence
            </h3>
            <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, flexGrow: 1, lineHeight: 1.5 }}>
              Configure GPS campus boundaries, authorized Wi-Fi subnet gates, and security disarm controls.
            </p>
          </div>
        )}

        {/* Category Card 2: Biometric Security */}
        {userRole !== 'student' && (
          <div 
            onClick={() => { setActiveSubSetting('advanced'); if (playCyberSound) playCyberSound('click'); }}
            className="surface-card hover-card" 
            style={{ 
              padding: '24px', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              minHeight: '150px', 
              borderRadius: '14px', 
              border: '1px solid var(--border-subtle)',
              background: '#ffffff',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: 'rgba(5, 150, 105, 0.08)', 
                color: '#059669', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Sliders size={22} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: '#ecfdf5', color: '#059669' }}>
                Biometrics
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Face Recognition & Biometrics
            </h3>
            <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, flexGrow: 1, lineHeight: 1.5 }}>
              Biometric match confidence threshold, anti-spoof strictness, and face recognition model diagnostics.
            </p>
          </div>
        )}

        {/* Category Card 3: Admin Profile Settings */}
        {userRole !== 'student' && (
          <div 
            onClick={() => { setActiveSubSetting('profile'); if (playCyberSound) playCyberSound('click'); }}
            className="surface-card hover-card" 
            style={{ 
              padding: '24px', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              minHeight: '150px', 
              borderRadius: '14px', 
              border: '1px solid var(--border-subtle)',
              background: '#ffffff',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: 'rgba(124, 58, 237, 0.08)', 
                color: '#7c3aed', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <UserCheck size={22} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: '#f5f3ff', color: '#7c3aed' }}>
                Account
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              My Profile & Credentials
            </h3>
            <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, flexGrow: 1, lineHeight: 1.5 }}>
              Modify profile name, login email address, or update account security credentials.
            </p>
          </div>
        )}

        {/* Category Card 4: Admin Account Registry */}
        {userRole === 'admin' && (
          <div 
            onClick={() => { setActiveSubSetting('admins'); if (playCyberSound) playCyberSound('click'); }}
            className="surface-card hover-card" 
            style={{ 
              padding: '24px', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              minHeight: '150px', 
              borderRadius: '14px', 
              border: '1px solid var(--border-subtle)',
              background: '#ffffff',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: 'rgba(37, 99, 235, 0.08)', 
                color: '#2563eb', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <UserPlus size={22} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: '#eff6ff', color: '#2563eb' }}>
                Administrators
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Staff & Administrator Accounts
            </h3>
            <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, flexGrow: 1, lineHeight: 1.5 }}>
              Create, configure roles, and manage institutional staff or auxiliary administrator access accounts.
            </p>
          </div>
        )}

        {/* Category Card 5: Manage Departments */}
        {userRole === 'admin' && (
          <div 
            onClick={() => { setActiveSubSetting('departments'); if (playCyberSound) playCyberSound('click'); }}
            className="surface-card hover-card" 
            style={{ 
              padding: '24px', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              minHeight: '150px', 
              borderRadius: '14px', 
              border: '1px solid var(--border-subtle)',
              background: '#ffffff',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: 'rgba(217, 119, 6, 0.08)', 
                color: '#d97706', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <BookOpen size={22} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: '#fffbeb', color: '#d97706' }}>
                Academics
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Departments & Branches
            </h3>
            <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, flexGrow: 1, lineHeight: 1.5 }}>
              Configure active college departments, branches, and class sections for dynamic dropdowns.
            </p>
          </div>
        )}

        {/* Category Card 6: Leave Management */}
        {userRole !== 'student' && (
          <div 
            onClick={() => { 
              setActiveSubSetting('leave_management'); 
              if (fetchAdminLeaves) fetchAdminLeaves(); 
              if (playCyberSound) playCyberSound('click'); 
            }}
            className="surface-card hover-card" 
            style={{ 
              padding: '24px', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              minHeight: '150px', 
              borderRadius: '14px', 
              border: '1px solid var(--border-subtle)',
              background: '#ffffff',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: 'rgba(5, 150, 105, 0.08)', 
                color: '#059669', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <FileCheck2 size={22} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: '#ecfdf5', color: '#059669' }}>
                Approvals
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Leave Management
            </h3>
            <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, flexGrow: 1, lineHeight: 1.5 }}>
              Review, approve, or reject student leave requests with complete historical records.
            </p>
            {pendingLeavesCount > 0 && (
              <span style={{ alignSelf: 'flex-start', padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {pendingLeavesCount} Pending
              </span>
            )}
          </div>
        )}

        {/* Category Card 7: App Version & Updates */}
        <div
          onClick={() => { 
            setActiveSubSetting('app_version'); 
            if (playCyberSound) playCyberSound('click'); 
            if (handleManualCheck) handleManualCheck(); 
          }}
          className="surface-card hover-card"
          style={{ 
            padding: '24px', 
            cursor: 'pointer', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px', 
            minHeight: '150px', 
            borderRadius: '14px', 
            border: '1px solid var(--border-subtle)',
            background: '#ffffff',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '10px', 
              background: 'rgba(30, 64, 175, 0.08)', 
              color: 'var(--color-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <ArrowUpCircle size={22} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: '#eff6ff', color: 'var(--color-primary)' }}>
              v{appVersion}
            </span>
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            System Version & Build
          </h3>
          <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, flexGrow: 1, lineHeight: 1.5 }}>
            Verify deployed application build status, cloud connectivity, and check for software updates.
          </p>
        </div>

        {/* Category Card 8: Multi-Tenant Registry & Management */}
        {userRole === 'admin' && activeTenantSlug === 'default' && Number(currentUser?.institution_id) === 1 && (
          <div 
            onClick={() => { setActiveSubSetting('multitenant'); if (playCyberSound) playCyberSound('click'); }}
            className="surface-card hover-card" 
            style={{ 
              padding: '24px', 
              cursor: 'pointer', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px', 
              minHeight: '150px', 
              borderRadius: '14px', 
              border: '1px solid var(--border-subtle)',
              background: '#ffffff',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: 'rgba(124, 58, 237, 0.08)', 
                color: '#7c3aed', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Building2 size={22} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: '#f5f3ff', color: '#7c3aed' }}>
                Multi-Tenant
              </span>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Campus & Institution Registry
            </h3>
            <p style={{ color: '#475569', fontSize: '0.84rem', margin: 0, flexGrow: 1, lineHeight: 1.5 }}>
              Register and manage college tenants, institution color schemes, and root administrator credentials.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
