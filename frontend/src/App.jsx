import React, { useState, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import LoginPortal from './components/LoginPortal';
import LeaveManagement from './components/LeaveManagement';
import LeaveAdminDashboard from './components/LeaveAdminDashboard';
import { 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  LogOut, 
  FileSpreadsheet, 
  Mail, 
  History, 
  UserCheck, 
  Settings, 
  BarChart3,
  Bot,
  Calendar
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://smart-attendance-system-1-mvwa.onrender.com/api/v1';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isPortalVisible, setIsPortalVisible] = useState(true);

  // State for LoginPortal
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState('admin');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverWarmingUp, setServerWarmingUp] = useState(false);

  const onLogin = (userData, userToken, role) => {
    setCurrentUser(userData);
    setToken(userToken);
    setUserRole(role);
    setIsLoggedIn(true);
    setIsPortalVisible(false);
    const defaultTab = role === 'student' ? 'student-attendance' : 'dashboard';
    setActiveTab(defaultTab);
    // Reset login form state
    setLoginEmail('');
    setLoginPassword('');
    setAuthError('');
    setIsLoading(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    setUserRole(null);
    setIsLoggedIn(false);
    setIsPortalVisible(true);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');
    setServerWarmingUp(false);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, role: loginRole, password: loginPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 503 || (data.message && data.message.toLowerCase().includes('cold start'))) {
          setServerWarmingUp(true);
          setAuthError('Server is waking up. Please wait ~45 seconds and try again.');
        } else {
          throw new Error(data.message || 'Login failed. Please check your credentials.');
        }
      } else {
        const { user, token } = data;
        onLogin(user, token, user.role);
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {!isLoggedIn && isPortalVisible && (
        <LoginPortal
          loginRole={loginRole}
          setLoginRole={setLoginRole}
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          authError={authError}
          isLoading={isLoading}
          onSubmit={handleLoginSubmit}
          serverWarmingUp={serverWarmingUp}
          onExploreGuest={() => onLogin({ name: 'Guest', role: 'teacher' }, 'guest_token', 'teacher')}
        />
      )}

      {isLoggedIn && (
        <div style={{ display: 'flex', height: '100vh' }}>
          <aside className={`sidebar ${mobileSidebarOpen ? 'open' : ''}
          onClick={(e) => { if (e.target.closest('.nav-item')) { setMobileSidebarOpen(false); } }}
        >
            <div className="sidebar-logo">
              <img src="/logo.png" alt="Logo" style={{height: 32, marginRight: 10}}/>
              SMART ATTENDANCE
            </div>
            <ul className="nav-links" style={{ flex: 1 }}>
              {userRole === 'student' ? (
                <>
                  <li key="my-attendance"><button className={`nav-item ${activeTab === 'student-attendance' ? 'active' : ''}`} onClick={() => setActiveTab('student-attendance')}><Calendar size={18}/>My Attendance</button></li>
                  <li key="leave-management"><button className={`nav-item ${activeTab === 'leave-management' ? 'active' : ''}`} onClick={() => setActiveTab('leave-management')}><Mail size={18}/>Leave Management</button></li>
                  <li key="my-profile"><button className={`nav-item ${activeTab === 'student-profile' ? 'active' : ''}`} onClick={() => setActiveTab('student-profile')}><Users size={18}/>My Profile</button></li>
                  <li key="ai-assistant"><button className={`nav-item ${activeTab === 'ai-assistant' ? 'active' : ''}`} onClick={() => setActiveTab('ai-assistant')}><Bot size={18}/>AI Assistant</button></li>
                </>
              ) : (
                <>
                  <li key="dashboard"><button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}><TrendingUp size={18}/>Dashboard</button></li>
                  <li key="students"><button className={`nav-item ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}><Users size={18}/>Students</button></li>
                  {userRole === 'admin' && <li key="teachers"><button className={`nav-item ${activeTab === 'teachers' ? 'active' : ''}`} onClick={() => setActiveTab('teachers')}><UserCheck size={18}/>Teachers</button></li>}
                  <li key="attendance"><button className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}><CheckCircle2 size={18}/>Attendance</button></li>
                  <li key="logs"><button className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}><FileSpreadsheet size={18}/>Event Logs</button></li>
                  <li key="leave-admin"><button className={`nav-item ${activeTab === 'leave-admin' ? 'active' : ''}`} onClick={() => setActiveTab('leave-admin')}><Mail size={18}/>Leave Requests</button></li>
                  <li key="session-history"><button className={`nav-item ${activeTab === 'session-history' ? 'active' : ''}`} onClick={() => setActiveTab('session-history')}><History size={18}/>Session History</button></li>
                  <li key="reports"><button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}><BarChart3 size={18}/>Reports</button></li>
                  <li key="settings"><button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><Settings size={18}/>Settings</button></li>
                </>
              )}
            </ul>
            <div className="sidebar-footer">
              <button className="nav-item" onClick={handleLogout}><LogOut size={18}/>Logout</button>
            </div>
          </aside>

          <main className="main-content">
             <header className="flex-between header-container" style={{ marginBottom: '16px' }}>
                 <div>
                   <h1 style={{ fontSize: '1.45rem', fontWeight: 700 }}>
                     {activeTab === 'dashboard' && 'Dashboard'}
                     {activeTab === 'leave-management' && 'Leave Management'}
                     {activeTab === 'leave-admin' && 'Leave Request Management'}
                   </h1>
                   <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                     {activeTab === 'dashboard' && 'Welcome to your dashboard.'}
                     {activeTab === 'leave-management' && 'Apply for leave and track your requests'}
                     {activeTab === 'leave-admin' && 'Review and manage leave requests from students'}
                   </p>
                 </div>
             </header>

            {activeTab === 'leave-management' && userRole === 'student' && (
              <LeaveManagement token={token} currentUser={currentUser} />
            )}
            {activeTab === 'leave-admin' && (userRole === 'teacher' || userRole === 'admin') && (
              <LeaveAdminDashboard token={token} currentUser={currentUser} />
            )}
            {/* Other tabs can be conditionally rendered here */}
            {activeTab !== 'leave-management' && activeTab !== 'leave-admin' &&
              <div><p>Content for {activeTab}.</p></div>
            }
          </main>
        </div>
      )}
    </div>
  );
}
