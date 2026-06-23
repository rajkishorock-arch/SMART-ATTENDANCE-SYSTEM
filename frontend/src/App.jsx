import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ScannerBootOverlay from './ScannerBootOverlay';
import BottomNav from './components/BottomNav';
import LoginPortal from './components/LoginPortal';
import { getActiveTenantSlug } from './utils/tenantConfig';
import MobileControlPanel from './components/MobileControlPanel';
import GamificationHub from './components/GamificationHub';
import NotificationCenter from './components/NotificationCenter';
import AdvancedFeaturesHub from './components/AdvancedFeaturesHub';
import ConsentModal from './components/ConsentModal';
import PrivacyPolicy from './components/PrivacyPolicy';
import { setupOfflineSyncListener } from './utils/offlineQueue';
import { completeLivenessFlow } from './utils/livenessClient';
import LiveActivityTicker from './components/LiveActivityTicker';
import AppAmbientLayer from './components/animations/AppAmbientLayer';
import ClickFxLayer from './components/animations/ClickFxLayer';
import PageTransitionFlash from './components/animations/PageTransitionFlash';
import CameraAttractHud from './components/animations/CameraAttractHud';
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

  const isTabValidForRole = (tabId, role) => {
    if (role === 'student') {
      return ['student-attendance', 'student-profile', 'leave-management', 'ai-assistant'].includes(tabId);
    } else if (role === 'teacher') {
      return ['dashboard', 'students', 'attendance', 'logs', 'leave-admin', 'session-history', 'reports', 'settings', 'student-profile', 'ai-assistant'].includes(tabId);
    } else if (role === 'admin') {
      return ['dashboard', 'students', 'teachers', 'attendance', 'logs', 'leave-admin', 'session-history', 'reports', 'settings', 'student-profile', 'ai-assistant'].includes(tabId);
    }
    return false;
  };

  const navigateToTab = (tabId) => {
     setActiveTab(tabId);
  };

  const handleLogin = (userData, userToken, role) => {
    setCurrentUser(userData);
    setToken(userToken);
    setUserRole(role);
    setIsLoggedIn(true);
    setIsPortalVisible(false);
    const defaultTab = role === 'student' ? 'student-attendance' : 'dashboard';
    setActiveTab(defaultTab);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    setUserRole(null);
    setIsLoggedIn(false);
    setIsPortalVisible(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
        {!isLoggedIn && isPortalVisible && <LoginPortal onLogin={handleLogin} />}
        {isLoggedIn && (
            <div style={{ display: 'flex', height: '100vh' }}>
      <aside
        className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}
        onClick={(e) => {
          if (e.target.closest('.nav-item')) {
            setMobileSidebarOpen(false);
          }
        }}
      >
        <div className="sidebar-logo">
            <img src="/logo.png" alt="Logo" style={{height: 32, marginRight: 10}}/>
            SMART ATTENDANCE
        </div>
        <ul className="nav-links" style={{ flex: 1 }}>
          {userRole === 'student' ? (
            <>
              <li>
                <button
                  className={`nav-item ${activeTab === 'student-attendance' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { navigateToTab('student-attendance'); }}
                >
                  <Calendar size={18} />
                  My Attendance
                </button>
              </li>
               <li>
                <button
                  className={`nav-item ${activeTab === 'leave-management' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { navigateToTab('leave-management'); }}
                >
                  <Mail size={18} />
                  Leave Management
                </button>
              </li>
              <li>
                <button
                  className={`nav-item ${activeTab === 'student-profile' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { navigateToTab('student-profile'); }}
                >
                  <Users size={18} />
                  My Profile
                </button>
              </li>
              <li>
                <button
                  className={`nav-item ${activeTab === 'ai-assistant' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { navigateToTab('ai-assistant'); }}
                >
                  <Bot size={18} />
                  AI Assistant
                </button>
              </li>
            </>
          ) : (
            <>
              <li><button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => navigateToTab('dashboard')}><TrendingUp size={18}/>Dashboard</button></li>
              <li><button className={`nav-item ${activeTab === 'students' ? 'active' : ''}`} onClick={() => navigateToTab('students')}><Users size={18}/>Students</button></li>
              {userRole === 'admin' && <li><button className={`nav-item ${activeTab === 'teachers' ? 'active' : ''}`} onClick={() => navigateToTab('teachers')}><UserCheck size={18}/>Teachers</button></li>}
              <li><button className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => navigateToTab('attendance')}><CheckCircle2 size={18}/>Attendance</button></li>
              <li><button className={`nav-item ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => navigateToTab('logs')}><FileSpreadsheet size={18}/>Event Logs</button></li>
              <li><button className={`nav-item ${activeTab === 'leave-admin' ? 'active' : ''}`} onClick={() => navigateToTab('leave-admin')}><Mail size={18}/>Leave Requests</button></li>
              <li><button className={`nav-item ${activeTab === 'session-history' ? 'active' : ''}`} onClick={() => navigateToTab('session-history')}><History size={18}/>Session History</button></li>
              <li><button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => navigateToTab('reports')}><BarChart3 size={18}/>Reports</button></li>
              <li><button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => navigateToTab('settings')}><Settings size={18}/>Settings</button></li>
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

      </main>
      </div>
      )}
    </div>
  );
}