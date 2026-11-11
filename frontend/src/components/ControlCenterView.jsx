import { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ScanFace,
  Calendar,
  Monitor,
  AlertOctagon,
  Globe,
  DollarSign,
  BarChart3,
  History,
  FileSpreadsheet,
  Users,
  Camera,
  ShieldCheck,
  UserCircle,
  Bot,
  Search,
  ChevronRight,
  LogOut,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';

export default function ControlCenterView({
  userRole,
  currentUser,
  onNavigate,
  onLogout,
  playCyberSound = () => {},
  triggerHaptic = () => {},
  appVersion = '1.0.18',
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const sections = useMemo(() => {
    const rawSections = [
      {
        id: 'academic',
        title: 'Academic & Attendance Operations',
        items: [
          {
            id: 'disputes',
            label: 'Disputes & Corrections',
            icon: ShieldAlert,
            iconColor: '#dc2626',
            iconBg: '#fef2f2',
            iconBorder: '#fecaca',
            badge: 'Review',
            badgeBg: '#fffbeb',
            badgeColor: '#b45309',
            badgeBorder: '#fde68a',
            desc: 'Review student dispute proof & attendance corrections',
            roles: ['admin', 'teacher'],
          },
          {
            id: 'face-review',
            label: 'Face Match QA Queue',
            icon: ScanFace,
            iconColor: '#7c3aed',
            iconBg: '#f5f3ff',
            iconBorder: '#ddd6fe',
            badge: 'AI QA',
            badgeBg: '#f5f3ff',
            badgeColor: '#7c3aed',
            badgeBorder: '#ddd6fe',
            desc: 'Review borderline face detections & reassign attendance',
            roles: ['admin', 'teacher'],
          },
          {
            id: 'calendar',
            label: 'Academic Calendar & Schedules',
            icon: Calendar,
            iconColor: '#2563eb',
            iconBg: '#eff6ff',
            iconBorder: '#bfdbfe',
            desc: 'Campus timetable, holiday list & exam schedules',
            roles: ['admin', 'teacher', 'student'],
          },
          {
            id: 'session-history',
            label: 'Class Session History',
            icon: History,
            iconColor: '#059669',
            iconBg: '#ecfdf5',
            iconBorder: '#a7f3d0',
            desc: 'Class-wise daily session registers & student presence',
            roles: ['admin', 'teacher'],
          },
          {
            id: 'logs',
            label: 'Attendance Logs & Registers',
            icon: FileSpreadsheet,
            iconColor: '#16a34a',
            iconBg: '#f0fdf4',
            iconBorder: '#bbf7d0',
            desc: 'Live scan records, daily registers & CSV export',
            roles: ['admin', 'teacher'],
          },
          {
            id: 'reports',
            label: 'Reports & Shortage Analytics',
            icon: BarChart3,
            iconColor: '#0284c7',
            iconBg: '#f0f9ff',
            iconBorder: '#bae6fd',
            badge: '<75% Alert',
            badgeBg: '#fef2f2',
            badgeColor: '#dc2626',
            badgeBorder: '#fecaca',
            desc: 'Defaulter student lists (<75%), reports & notices',
            roles: ['admin', 'teacher'],
          },
        ],
      },
      {
        id: 'fleet',
        title: 'Hardware & Campus Integrations',
        items: [
          {
            id: 'devices',
            label: 'Kiosk & Sensor Fleet',
            icon: Monitor,
            iconColor: '#0284c7',
            iconBg: '#f0f9ff',
            iconBorder: '#bae6fd',
            badge: 'Hardware',
            badgeBg: '#eff6ff',
            badgeColor: '#1d4ed8',
            badgeBorder: '#bfdbfe',
            desc: 'Monitor scanning kiosks, sensors & battery telemetry',
            roles: ['admin'],
          },
          {
            id: 'interventions',
            label: 'Attendance Interventions',
            icon: AlertOctagon,
            iconColor: '#d97706',
            iconBg: '#fffbeb',
            iconBorder: '#fde68a',
            badge: 'Alerts',
            badgeBg: '#fffbeb',
            badgeColor: '#b45309',
            badgeBorder: '#fde68a',
            desc: 'Shortfall attendance warnings & counseling workflows',
            roles: ['admin', 'teacher'],
          },
          {
            id: 'lms',
            label: 'SIS & Enterprise LMS Sync',
            icon: Globe,
            iconColor: '#8b5cf6',
            iconBg: '#f5f3ff',
            iconBorder: '#ddd6fe',
            badge: 'Sync',
            badgeBg: '#f5f3ff',
            badgeColor: '#7c3aed',
            badgeBorder: '#ddd6fe',
            desc: 'Canvas, Moodle, and ERP roster synchronization',
            roles: ['admin'],
          },
          {
            id: 'payroll',
            label: 'Staff Attendance & Payroll',
            icon: DollarSign,
            iconColor: '#059669',
            iconBg: '#ecfdf5',
            iconBorder: '#a7f3d0',
            badge: 'Finance',
            badgeBg: '#ecfdf5',
            badgeColor: '#059669',
            badgeBorder: '#a7f3d0',
            desc: 'Daily punch telemetry, work hours & salary calculations',
            roles: ['admin', 'teacher'],
          },
        ],
      },
      {
        id: 'directories',
        title: 'Directories & Campus People',
        items: [
          {
            id: 'students',
            label: 'Students Directory',
            icon: Users,
            iconColor: '#2563eb',
            iconBg: '#eff6ff',
            iconBorder: '#bfdbfe',
            desc: 'Registered student profiles & biometric face models',
            roles: ['admin', 'teacher'],
          },
          {
            id: 'teachers',
            label: 'Teachers & Faculty Directory',
            icon: Users,
            iconColor: '#db2777',
            iconBg: '#fdf2f8',
            iconBorder: '#fbcfe8',
            desc: 'Teaching staff directory & assigned weekly timetables',
            roles: ['admin'],
          },
          {
            id: 'attendance',
            label: 'Face Attendance Scanner',
            icon: Camera,
            iconColor: '#2563eb',
            iconBg: '#eff6ff',
            iconBorder: '#bfdbfe',
            badge: 'Live',
            badgeBg: '#eff6ff',
            badgeColor: '#1e40af',
            badgeBorder: '#bfdbfe',
            desc: 'Launch real-time AI face scanner or manual register',
            roles: ['admin', 'teacher'],
          },
          {
            id: 'student-profile',
            label: 'My Profile & Account',
            icon: UserCircle,
            iconColor: '#7c3aed',
            iconBg: '#f5f3ff',
            iconBorder: '#ddd6fe',
            desc: 'Personal account details, login email & credentials',
            roles: ['admin', 'teacher', 'student'],
          },
          {
            id: 'ai-assistant',
            label: 'Campus AI Assistant',
            icon: Bot,
            iconColor: '#2563eb',
            iconBg: '#eff6ff',
            iconBorder: '#bfdbfe',
            badge: 'Smart AI',
            badgeBg: '#eff6ff',
            badgeColor: '#1d4ed8',
            badgeBorder: '#bfdbfe',
            desc: 'Interactive voice assistant, file analysis & questions',
            roles: ['admin', 'teacher', 'student'],
          },
        ],
      },
      {
        id: 'system',
        title: 'System & Security Settings',
        items: [
          {
            id: 'settings',
            label: 'Security & System Settings Hub',
            icon: ShieldCheck,
            iconColor: '#1d4ed8',
            iconBg: '#eff6ff',
            iconBorder: '#bfdbfe',
            badge: 'Settings',
            badgeBg: '#eff6ff',
            badgeColor: '#1d4ed8',
            badgeBorder: '#bfdbfe',
            desc: 'GPS perimeter, Wi-Fi zones, biometrics & permissions',
            roles: ['admin', 'teacher', 'student'],
          },
        ],
      },
    ];

    // Filter by role
    const filtered = rawSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.roles.includes(userRole)),
      }))
      .filter((section) => section.items.length > 0);

    // Apply search query filter
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.toLowerCase().trim();

    return filtered
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.desc.toLowerCase().includes(q) ||
            (item.badge && item.badge.toLowerCase().includes(q))
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [userRole, searchQuery]);

  const handleItemClick = (id) => {
    playCyberSound('click');
    triggerHaptic();
    onNavigate(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className="control-center-dedicated-view"
      style={{
        width: '100%',
        maxWidth: '720px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        padding: '8px 12px 90px 12px',
        animation: 'fadeInUp 0.3s ease both',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Hero Card (Inspired by Chhath Vibes Clean UI) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #e2e8f0',
          padding: '20px 22px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1d4ed8',
              }}
            >
              <LayoutGrid size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                Control Center
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0', fontWeight: 500 }}>
                All campus modules, operations, and system utilities
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '20px',
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {userRole}
          </span>
        </div>

        {/* Live Search Filter Input */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search modules, registers, or settings..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: '0.86rem',
              color: '#0f172a',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.target.style.background = '#ffffff';
              e.target.style.borderColor = '#2563eb';
              e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.background = '#f8fafc';
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.boxShadow = 'none';
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sections List (Chhath Vibes Inspired Clean Card Deck) */}
      {sections.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px dashed #cbd5e1',
            padding: '40px 20px',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 600 }}>
            No modules match &quot;{searchQuery}&quot;
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear Search
          </button>
        </div>
      ) : (
        sections.map((section) => (
          <div key={section.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Section Header */}
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                paddingLeft: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={12} style={{ color: '#94a3b8' }} />
              <span>{section.title}</span>
            </div>

            {/* Section Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className="surface-card hover-card hover-elevate"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleItemClick(item.id);
                      }
                    }}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    {/* Left Icon */}
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        minWidth: '42px',
                        borderRadius: '12px',
                        background: item.iconBg,
                        border: `1px solid ${item.iconBorder}`,
                        color: item.iconColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={20} />
                    </div>

                    {/* Middle Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '8px',
                              background: item.badgeBg || '#eff6ff',
                              color: item.badgeColor || '#1d4ed8',
                              border: `1px solid ${item.badgeBorder || '#bfdbfe'}`,
                              lineHeight: 1.2,
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: '0.78rem',
                          color: '#64748b',
                          margin: '3px 0 0',
                          lineHeight: 1.35,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.desc}
                      </p>
                    </div>

                    {/* Right Chevron */}
                    <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                      <ChevronRight size={18} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Footer Sign Out Action (Inspired by Clean Account Utilities) */}
      <div
        style={{
          marginTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => {
            playCyberSound('click');
            triggerHaptic();
            onLogout();
          }}
          className="hover-elevate active-haptic"
          style={{
            width: '100%',
            padding: '13px 20px',
            borderRadius: '14px',
            background: '#ffffff',
            border: '1.5px solid #fecaca',
            color: '#dc2626',
            fontSize: '0.88rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.06)',
            transition: 'all 0.18s ease',
          }}
        >
          <LogOut size={16} />
          <span>Sign Out from Campus Session</span>
        </button>

        <div style={{ textAlign: 'center', fontSize: '0.74rem', color: '#94a3b8', fontWeight: 500 }}>
          SMART ATTENDANCE SYSTEM • v{appVersion} • Cloud Synchronized
        </div>
      </div>
    </div>
  );
}
