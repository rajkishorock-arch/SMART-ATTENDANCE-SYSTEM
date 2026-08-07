import {
  TrendingUp,
  Users,
  Camera,
  LayoutGrid,
  Calendar,
  UserCircle,
  Bot,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export default function BottomNav({
  userRole,
  activeTab,
  onNavigate,
  onScanPress,
  onMorePress,
}) {
  if (userRole === 'student') {
    const studentTabs = [
      'student-attendance',
      'settings',
      'ai-assistant',
      'student-profile',
    ];
    const activeIndex = studentTabs.indexOf(activeTab);

    return (
      <nav className="bottom-nav" style={{ display: 'flex' }} aria-label="Main navigation">
        {/* Sliding Pill */}
        {activeIndex !== -1 && (
          <div
            className="bottom-nav-pill"
            style={{
              width: 'calc(25% - 16px)',
              left: `calc(${activeIndex * 25}% + 8px)`,
            }}
          />
        )}
        
        <button
          type="button"
          className={`bottom-nav-item active-haptic ${activeTab === 'student-attendance' ? 'active' : ''}`}
          onClick={() => onNavigate('student-attendance')}
          style={{ position: 'relative', zIndex: 2 }}
        >
          <Calendar size={20} style={{ transition: 'transform 0.2s' }} className={activeTab === 'student-attendance' ? 'scale-110' : ''} />
          <span>Attendance</span>
        </button>
        
        <button
          type="button"
          className={`bottom-nav-item active-haptic ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
          style={{ position: 'relative', zIndex: 2 }}
        >
          <ShieldCheck size={20} style={{ transition: 'transform 0.2s' }} className={activeTab === 'settings' ? 'scale-110' : ''} />
          <span>Settings</span>
        </button>
        
        <button
          type="button"
          className={`bottom-nav-item active-haptic ${activeTab === 'ai-assistant' ? 'active' : ''}`}
          onClick={() => onNavigate('ai-assistant')}
          style={{ position: 'relative', zIndex: 2 }}
        >
          <Bot size={20} style={{ transition: 'transform 0.2s' }} className={activeTab === 'ai-assistant' ? 'scale-110' : ''} />
          <span>Assistant</span>
        </button>
        
        <button
          type="button"
          className={`bottom-nav-item active-haptic ${activeTab === 'student-profile' ? 'active' : ''}`}
          onClick={() => onNavigate('student-profile')}
          style={{ position: 'relative', zIndex: 2 }}
        >
          <UserCircle size={20} style={{ transition: 'transform 0.2s' }} className={activeTab === 'student-profile' ? 'scale-110' : ''} />
          <span>Profile</span>
        </button>
      </nav>
    );
  }

  const isMoreActive = ['reports', 'session-history', 'teachers'].includes(activeTab);
  
  // Calculate active index for admin/teacher bottom nav (5 columns)
  // Index 0: Home, 1: Students, 2: Scan (button), 3: Settings, 4: Control
  let activeIndex = -1;
  if (activeTab === 'dashboard') activeIndex = 0;
  else if (activeTab === 'students') activeIndex = 1;
  else if (activeTab === 'settings') activeIndex = 3;
  else if (isMoreActive) activeIndex = 4;

  return (
    <nav className="bottom-nav" style={{ display: 'flex' }} aria-label="Main navigation">
      {/* Sliding Pill */}
      {activeIndex !== -1 && (
        <div
          className="bottom-nav-pill"
          style={{
            width: 'calc(20% - 16px)',
            left: `calc(${activeIndex * 20}% + 8px)`,
          }}
        />
      )}

      <button
        type="button"
        className={`bottom-nav-item active-haptic ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => onNavigate('dashboard')}
        style={{ position: 'relative', zIndex: 2 }}
      >
        <TrendingUp size={20} />
        <span>Home</span>
      </button>
      
      <button
        type="button"
        className={`bottom-nav-item active-haptic ${activeTab === 'students' ? 'active' : ''}`}
        onClick={() => onNavigate('students')}
        style={{ position: 'relative', zIndex: 2 }}
      >
        <Users size={20} />
        <span>Students</span>
      </button>
      
      <button
        type="button"
        className="bottom-nav-scan active-haptic"
        onClick={onScanPress}
        aria-label="Open face scanner"
        style={{ zIndex: 2 }}
      >
        <Camera size={26} />
      </button>
      
      <button
        type="button"
        className={`bottom-nav-item active-haptic ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onNavigate('settings')}
        style={{ position: 'relative', zIndex: 2 }}
      >
        <ShieldCheck size={20} />
        <span>Settings</span>
      </button>
      
      <button
        type="button"
        className={`bottom-nav-item active-haptic ${isMoreActive ? 'active' : ''}`}
        onClick={onMorePress}
        style={{ position: 'relative', zIndex: 2 }}
      >
        <LayoutGrid size={20} />
        <span>Control</span>
      </button>
    </nav>
  );
}
