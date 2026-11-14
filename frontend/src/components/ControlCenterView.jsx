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
  Sparkles,
  TrendingUp,
  ArrowLeft,
  Building2,
  Megaphone,
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
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');

  const rawSections = useMemo(() => [
    {
      id: 'academic',
      title: 'Academic & Attendance Operations',
      items: [
        {
          id: 'dashboard',
          label: 'Home Dashboard',
          icon: TrendingUp,
          iconColor: '#2563eb',
          iconBg: '#eff6ff',
          iconBorder: '#bfdbfe',
          badge: 'Main',
          badgeBg: '#eff6ff',
          badgeColor: '#1d4ed8',
          badgeBorder: '#bfdbfe',
          desc: 'Real-time attendance overview, live telemetry & charts',
          roles: ['admin', 'teacher'],
        },
        {
          id: 'student-attendance',
          label: 'My Attendance & Logs',
          icon: TrendingUp,
          iconColor: '#2563eb',
          iconBg: '#eff6ff',
          iconBorder: '#bfdbfe',
          badge: 'Live Status',
          badgeBg: '#eff6ff',
          badgeColor: '#1d4ed8',
          badgeBorder: '#bfdbfe',
          desc: 'Personal attendance rate, subject breakdown & leave status',
          roles: ['student'],
        },
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
          label: 'Face Match Verification Queue',
          icon: ScanFace,
          iconColor: '#7c3aed',
          iconBg: '#f5f3ff',
          iconBorder: '#ddd6fe',
          badge: 'Verification',
          badgeBg: '#f5f3ff',
          badgeColor: '#7c3aed',
          badgeBorder: '#ddd6fe',
          desc: 'Review borderline face detections & verify attendance',
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
          id: 'broadcast',
          label: 'Campus Broadcast & Notices',
          icon: Megaphone,
          iconColor: '#2563eb',
          iconBg: '#eff6ff',
          iconBorder: '#bfdbfe',
          badge: 'Notices',
          badgeBg: '#eff6ff',
          badgeColor: '#1d4ed8',
          badgeBorder: '#bfdbfe',
          desc: 'Official circulars, announcements & downloadable certified PDFs',
          roles: ['admin', 'teacher', 'student', 'parent'],
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
          label: 'Campus Help Assistant',
          icon: Bot,
          iconColor: '#2563eb',
          iconBg: '#eff6ff',
          iconBorder: '#bfdbfe',
          badge: 'Support',
          badgeBg: '#eff6ff',
          badgeColor: '#1d4ed8',
          badgeBorder: '#bfdbfe',
          desc: 'Interactive help assistant, campus guide & questions',
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
  ], []);

  // Filter sections by role, category filter, and search query
  const filteredSections = useMemo(() => {
    let sections = rawSections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter((item) => item.roles.includes(userRole)),
      }))
      .filter((sec) => sec.items.length > 0);

    // Apply category pill filter
    if (activeCategoryFilter !== 'ALL') {
      sections = sections.filter((sec) => sec.id === activeCategoryFilter);
    }

    // Apply search query filter
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase().trim();

    return sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.desc.toLowerCase().includes(q) ||
            (item.badge && item.badge.toLowerCase().includes(q))
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [rawSections, userRole, activeCategoryFilter, searchQuery]);

  const handleItemClick = (id) => {
    playCyberSound('click');
    triggerHaptic();
    onNavigate(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const categories = [
    { id: 'ALL', label: 'All Modules' },
    { id: 'academic', label: 'Academic' },
    { id: 'fleet', label: 'Hardware' },
    { id: 'directories', label: 'People' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div
      className="control-center-dedicated-view"
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '0 0 12px 0',
        boxSizing: 'border-box',
        minWidth: 0,
        overflowX: 'hidden',
        animation: 'fadeInUp 0.25s ease both',
      }}
    >
      {/* Category Filter Pills (Horizontal Scroll on Mobile) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '2px',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          }}
        >
          {categories.map((cat) => {
            const isSelected = activeCategoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  playCyberSound('click');
                  setActiveCategoryFilter(cat.id);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  color: isSelected ? '#1d4ed8' : '#64748b',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 1px 3px rgba(37, 99, 235, 0.1)' : 'none',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

      {/* Sections List */}
      {filteredSections.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px dashed #cbd5e1',
            padding: '36px 16px',
            textAlign: 'center',
            color: '#64748b',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 600 }}>
            No modules match &quot;{searchQuery}&quot;
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategoryFilter('ALL');
            }}
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        filteredSections.map((section) => (
          <div
            key={section.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
            }}
          >
            {/* Section Header */}
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                paddingLeft: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{section.title}</span>
            </div>

            {/* Section Cards */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                minWidth: 0,
              }}
            >
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className="control-center-card-item surface-card hover-elevate"
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
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    {/* Left Icon */}
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
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={18} />
                    </div>

                    {/* Middle Info - Clean bold heading */}
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
                        marginLeft: 'auto',
                      }}
                    >
                      <ChevronRight size={17} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Footer Sign Out Action */}
      <div
        style={{
          marginTop: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'center',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          minWidth: 0,
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
            maxWidth: '100%',
            boxSizing: 'border-box',
            padding: '12px 18px',
            borderRadius: '12px',
            background: '#ffffff',
            border: '1.5px solid #fecaca',
            color: '#dc2626',
            fontSize: '0.86rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(220, 38, 38, 0.05)',
            transition: 'all 0.18s ease',
          }}
        >
          <LogOut size={16} />
          <span>Sign Out from Campus Session</span>
        </button>

        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
          SMART ATTENDANCE SYSTEM • v{appVersion} • Cloud Synchronized
        </div>
      </div>
    </div>
  );
}
