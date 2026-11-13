import React from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  UserPlus, 
  BookOpen, 
  ArrowUpCircle,
  FileCheck2,
  Building2,
  Sliders,
  ChevronRight
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
  appVersion = '1.0.18'
}) {
  const activeTenantSlug = getActiveTenantSlug ? getActiveTenantSlug() : getTenantSlugUtil();
  const pendingLeavesCount = (adminLeaveRequests || []).filter(r => r?.status === 'Pending').length;

  const items = [
    // 1. Security Perimeter
    {
      id: 'geofencing',
      label: 'Security Perimeter & Geofence',
      icon: ShieldCheck,
      iconColor: '#1d4ed8',
      iconBg: '#eff6ff',
      iconBorder: '#bfdbfe',
      badge: 'Security',
      badgeBg: '#eff6ff',
      badgeColor: '#1e40af',
      badgeBorder: '#bfdbfe',
      visible: userRole === 'admin',
      onClick: () => {
        setActiveSubSetting('geofencing');
        if (playCyberSound) playCyberSound('click');
      }
    },
    // 2. Biometric Security
    {
      id: 'advanced',
      label: 'Face Recognition & Biometrics',
      icon: Sliders,
      iconColor: '#059669',
      iconBg: '#ecfdf5',
      iconBorder: '#a7f3d0',
      badge: 'Biometrics',
      badgeBg: '#ecfdf5',
      badgeColor: '#059669',
      badgeBorder: '#a7f3d0',
      visible: userRole !== 'student',
      onClick: () => {
        setActiveSubSetting('advanced');
        if (playCyberSound) playCyberSound('click');
      }
    },
    // 3. Admin Profile
    {
      id: 'profile',
      label: 'My Profile & Credentials',
      icon: UserCheck,
      iconColor: '#7c3aed',
      iconBg: '#f5f3ff',
      iconBorder: '#ddd6fe',
      badge: 'Account',
      badgeBg: '#f5f3ff',
      badgeColor: '#7c3aed',
      badgeBorder: '#ddd6fe',
      visible: userRole !== 'student',
      onClick: () => {
        setActiveSubSetting('profile');
        if (playCyberSound) playCyberSound('click');
      }
    },
    // 4. Staff & Admin Accounts
    {
      id: 'admins',
      label: 'Staff & Administrator Accounts',
      icon: UserPlus,
      iconColor: '#2563eb',
      iconBg: '#eff6ff',
      iconBorder: '#bfdbfe',
      badge: 'Administrators',
      badgeBg: '#eff6ff',
      badgeColor: '#2563eb',
      badgeBorder: '#bfdbfe',
      visible: userRole === 'admin',
      onClick: () => {
        setActiveSubSetting('admins');
        if (playCyberSound) playCyberSound('click');
      }
    },
    // 5. Departments & Branches
    {
      id: 'departments',
      label: 'Departments & Branches',
      icon: BookOpen,
      iconColor: '#d97706',
      iconBg: '#fffbeb',
      iconBorder: '#fde68a',
      badge: 'Academics',
      badgeBg: '#fffbeb',
      badgeColor: '#d97706',
      badgeBorder: '#fde68a',
      visible: userRole === 'admin',
      onClick: () => {
        setActiveSubSetting('departments');
        if (playCyberSound) playCyberSound('click');
      }
    },
    // 6. Leave Management
    {
      id: 'leave_management',
      label: 'Leave Management',
      icon: FileCheck2,
      iconColor: '#059669',
      iconBg: '#ecfdf5',
      iconBorder: '#a7f3d0',
      badge: pendingLeavesCount > 0 ? `${pendingLeavesCount} Pending` : 'Approvals',
      badgeBg: pendingLeavesCount > 0 ? '#fef2f2' : '#ecfdf5',
      badgeColor: pendingLeavesCount > 0 ? '#dc2626' : '#059669',
      badgeBorder: pendingLeavesCount > 0 ? '#fecaca' : '#a7f3d0',
      visible: userRole !== 'student',
      onClick: () => {
        setActiveSubSetting('leave_management');
        if (fetchAdminLeaves) fetchAdminLeaves();
        if (playCyberSound) playCyberSound('click');
      }
    },
    // 7. System Version & Updates
    {
      id: 'app_version',
      label: 'System Version & Build',
      icon: ArrowUpCircle,
      iconColor: '#1d4ed8',
      iconBg: '#eff6ff',
      iconBorder: '#bfdbfe',
      badge: `v${appVersion}`,
      badgeBg: '#eff6ff',
      badgeColor: '#1d4ed8',
      badgeBorder: '#bfdbfe',
      visible: true,
      onClick: () => {
        setActiveSubSetting('app_version');
        if (playCyberSound) playCyberSound('click');
        if (handleManualCheck) handleManualCheck();
      }
    },
    // 8. Multi-Tenant Registry
    {
      id: 'multitenant',
      label: 'Campus & Institution Registry',
      icon: Building2,
      iconColor: '#7c3aed',
      iconBg: '#f5f3ff',
      iconBorder: '#ddd6fe',
      badge: 'Multi-Tenant',
      badgeBg: '#f5f3ff',
      badgeColor: '#7c3aed',
      badgeBorder: '#ddd6fe',
      visible: userRole === 'admin' && activeTenantSlug === 'default' && Number(currentUser?.institution_id) === 1,
      onClick: () => {
        setActiveSubSetting('multitenant');
        if (playCyberSound) playCyberSound('click');
      }
    }
  ].filter(i => i.visible);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            onClick={item.onClick}
            className="surface-card hover-elevate"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.onClick();
              }
            }}
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              cursor: 'pointer',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
              overflow: 'hidden',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Left Icon Box */}
            <div
              style={{
                width: '38px',
                height: '38px',
                minWidth: '38px',
                maxWidth: '38px',
                flexShrink: 0,
                borderRadius: '10px',
                background: item.iconBg,
                border: `1px solid ${item.iconBorder}`,
                color: item.iconColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon size={18} />
            </div>

            {/* Middle Label - Clean bold heading */}
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                {item.label}
              </span>
            </div>

            {/* Right Chevron */}
            <div
              style={{
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                marginLeft: 'auto'
              }}
            >
              <ChevronRight size={17} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
