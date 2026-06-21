import {
  X,
  BookOpen,
  History,
  Users,
  ShieldCheck,
  LogOut,
  Settings,
  BarChart3,
  Bot,
} from 'lucide-react';

export default function MobileControlPanel({
  open,
  onClose,
  userRole,
  activeTab,
  onNavigate,
  onLogout,
  onOpenSettings,
}) {
  if (!open) return null;

  const items = [
    { id: 'reports', label: 'Reports & Alerts', icon: BarChart3, roles: ['admin', 'teacher'] },
    { id: 'session-history', label: 'Session History', icon: History, roles: ['admin', 'teacher'] },
    { id: 'teachers', label: 'Teachers & Timetable', icon: Users, roles: ['admin'] },
    { id: 'settings', label: 'Security Settings', icon: ShieldCheck, roles: ['admin'] },
    { id: 'attendance', label: 'Face Attendance', icon: BookOpen, roles: ['admin', 'teacher'] },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot, roles: ['admin', 'teacher', 'student'] },
  ].filter((item) => item.roles.includes(userRole));

  return (
    <>
      <div className="control-panel-backdrop" onClick={onClose} />
      <div className="control-panel-sheet" role="dialog" aria-label="Control panel">
        <div className="control-panel-handle" />
        <div className="control-panel-header">
          <div>
            <h3>Control Center</h3>
            <p>Settings, reports & system tools</p>
          </div>
          <button type="button" className="control-panel-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="control-panel-grid">
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`control-panel-tile ${activeTab === id ? 'active' : ''}`}
              onClick={() => {
                onNavigate(id);
                onClose();
              }}
            >
              <Icon size={22} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="control-panel-actions">
          {userRole === 'admin' && (
            <button
              type="button"
              className="control-panel-action-btn"
              onClick={() => {
                onOpenSettings?.();
                onNavigate('settings');
                onClose();
              }}
            >
              <Settings size={18} />
              Open Security Settings
            </button>
          )}
          <button type="button" className="control-panel-action-btn danger" onClick={onLogout}>
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
