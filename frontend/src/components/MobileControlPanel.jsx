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
  UserCircle,
  ShieldAlert,
  ScanFace,
  Calendar,
  Monitor,
  AlertOctagon,
  Globe,
  DollarSign,
  FileSpreadsheet,
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
    { id: 'disputes', label: 'Disputes & Corrections', icon: ShieldAlert, roles: ['admin', 'teacher'], badge: 'Review' },
    { id: 'face-review', label: 'Face Match QA Queue', icon: ScanFace, roles: ['admin', 'teacher'], badge: 'AI QA' },
    { id: 'calendar', label: 'Academic Calendar', icon: Calendar, roles: ['admin', 'teacher'] },
    { id: 'devices', label: 'Kiosk & Device Fleet', icon: Monitor, roles: ['admin'], badge: 'Hardware' },
    { id: 'interventions', label: 'Attendance Interventions', icon: AlertOctagon, roles: ['admin', 'teacher'], badge: 'Alerts' },
    { id: 'lms', label: 'SIS & LMS Sync', icon: Globe, roles: ['admin'], badge: 'Sync' },
    { id: 'payroll', label: 'Staff & Payroll', icon: DollarSign, roles: ['admin', 'teacher'], badge: 'Finance' },
    { id: 'reports', label: 'Reports & Alerts', icon: BarChart3, roles: ['admin', 'teacher'] },
    { id: 'session-history', label: 'Session History', icon: History, roles: ['admin', 'teacher'] },
    { id: 'logs', label: 'Attendance Logs', icon: FileSpreadsheet, roles: ['admin', 'teacher'] },
    { id: 'teachers', label: 'Teachers & Timetable', icon: Users, roles: ['admin'] },
    { id: 'students', label: 'Student Directory', icon: Users, roles: ['admin', 'teacher'] },
    { id: 'attendance', label: 'Face Attendance', icon: BookOpen, roles: ['admin', 'teacher'] },
    { id: 'settings', label: 'Security Settings', icon: ShieldCheck, roles: ['admin', 'teacher', 'student'] },
    { id: 'student-profile', label: 'My Profile', icon: UserCircle, roles: ['admin', 'teacher', 'student'] },
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
            <p>Full Institutional System Features & Navigation</p>
          </div>
          <button type="button" className="control-panel-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="control-panel-grid" style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
          {items.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              type="button"
              className={`control-panel-tile ${activeTab === id ? 'active' : ''}`}
              onClick={() => {
                onNavigate(id);
                onClose();
              }}
              style={{ position: 'relative' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <Icon size={22} style={{ color: activeTab === id ? '#00f2fe' : '#38bdf8' }} />
                {badge && (
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: 'rgba(0, 242, 254, 0.12)',
                    color: '#00f2fe',
                    border: '1px solid rgba(0, 242, 254, 0.25)'
                  }}>
                    {badge}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.78rem', lineHeight: '1.25', fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </div>

        <div className="control-panel-actions" style={{ marginTop: '12px' }}>
          {(userRole === 'admin' || userRole === 'teacher') && (
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
              Open Security Settings Hub
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
