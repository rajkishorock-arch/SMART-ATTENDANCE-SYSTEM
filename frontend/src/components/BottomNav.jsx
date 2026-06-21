import {
  TrendingUp,
  Users,
  Camera,
  FileSpreadsheet,
  LayoutGrid,
  Calendar,
  UserCircle,
  Bot,
} from 'lucide-react';

export default function BottomNav({
  userRole,
  activeTab,
  onNavigate,
  onScanPress,
  onMorePress,
}) {
  if (userRole === 'student') {
    return (
      <nav className="bottom-nav" aria-label="Main navigation">
        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'student-attendance' ? 'active' : ''}`}
          onClick={() => onNavigate('student-attendance')}
        >
          <Calendar size={22} />
          <span>Attendance</span>
        </button>
        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'ai-assistant' ? 'active' : ''}`}
          onClick={() => onNavigate('ai-assistant')}
        >
          <Bot size={22} />
          <span>AI Assistant</span>
        </button>
        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'student-profile' ? 'active' : ''}`}
          onClick={() => onNavigate('student-profile')}
        >
          <UserCircle size={22} />
          <span>Profile</span>
        </button>
      </nav>
    );
  }

  const isMoreActive = ['reports', 'session-history', 'teachers', 'settings'].includes(activeTab);

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => onNavigate('dashboard')}
      >
        <TrendingUp size={22} />
        <span>Home</span>
      </button>
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'students' ? 'active' : ''}`}
        onClick={() => onNavigate('students')}
      >
        <Users size={22} />
        <span>Students</span>
      </button>
      <button
        type="button"
        className="bottom-nav-scan"
        onClick={onScanPress}
        aria-label="Open face scanner"
      >
        <Camera size={26} />
      </button>
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
        onClick={() => onNavigate('logs')}
      >
        <FileSpreadsheet size={22} />
        <span>Logs</span>
      </button>
      <button
        type="button"
        className={`bottom-nav-item ${isMoreActive ? 'active' : ''}`}
        onClick={onMorePress}
      >
        <LayoutGrid size={22} />
        <span>Control</span>
      </button>
    </nav>
  );
}
