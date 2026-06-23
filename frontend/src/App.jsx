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
import LeaveManagement from './components/LeaveManagement'; // Added Leave Management
import { 
  Activity,
  Users, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  LogOut, 
  Plus, 
  Search, 
  FileSpreadsheet, 
  BookOpen, 
  Info,
  ShieldCheck,
  Calendar,
  Layers,
  Trash2,
  Mail,
  Lock,
  Camera,
  Video,
  FileDown,
  Edit,
  Clock,
  History,
  UserCheck,
  UserPlus,
  Volume2,
  VolumeX,
  ArrowLeft,
  MessageSquare,
  Bot,
  Send,
  Paperclip,
  Mic,
  MicOff,
  Settings,
  Phone,
  BarChart3,
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://smart-attendance-system-1-mvwa.onrender.com/api/v1';

// ... (rest of the file is unchanged until the App component)

export default function App() {
  // ... (all state definitions remain the same)

  // ... (all useEffect and helper functions remain the same until the main return statement)
  const isTabValidForRole = (tabId, role) => {
    if (role === 'student') {
      return ['student-attendance', 'student-profile', 'leave-management', 'ai-assistant'].includes(tabId);
    } else if (role === 'teacher') {
      return ['dashboard', 'students', 'attendance', 'logs', 'session-history', 'reports', 'settings', 'student-profile', 'ai-assistant'].includes(tabId);
    } else if (role === 'admin') {
      return ['dashboard', 'students', 'teachers', 'attendance', 'logs', 'session-history', 'reports', 'settings', 'student-profile', 'ai-assistant'].includes(tabId);
    }
    return false;
  };


  // ... (rest of the file is unchanged until the main return statement)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {/* ... (existing JSX code) */}
      <aside 
        className={`sidebar ${mobileSidebarOpen ? 'open' : ''}`}
        onClick={(e) => {
          if (e.target.closest('.nav-item')) {
            setMobileSidebarOpen(false);
          }
        }}
      >
        {/* ... (sidebar logo) */}
        <ul className="nav-links" style={{ flex: 1 }}>
          {userRole === 'student' ? (
            <>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'student-attendance' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('student-attendance'); playCyberSound('click'); }}
                >
                  <Calendar size={18} />
                  My Attendance
                </button>
              </li>
               <li>
                <button 
                  className={`nav-item ${activeTab === 'leave-management' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('leave-management'); playCyberSound('click'); }}
                >
                  <Calendar size={18} />
                  Leave Management
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'student-profile' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('student-profile'); playCyberSound('click'); }}
                >
                  <Users size={18} />
                  My Profile
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === 'ai-assistant' ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
                  onClick={() => { setActiveTab('ai-assistant'); playCyberSound('click'); }}
                >
                  <Bot size={18} />
                  AI Assistant
                </button>
              </li>
            </>
          ) : (
            <>
              {/* ... (admin and teacher nav links) */}
            </>
          )}
        </ul>
        {/* ... (rest of sidebar) */}
      </aside>

      <main className="main-content">
        <header className="flex-between header-container" style={{ marginBottom: '16px' }}>
            {/* ... (header content) */}
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 700 }}>
                {/* ... (other titles) */}
                {activeTab === 'leave-management' && 'Leave Management'}
                 {activeTab === 'student-profile' && 'My Profile'}
                {activeTab === 'settings' && 'Security & System Settings'}
                {activeTab === 'ai-assistant' && 'Advanced AI System Assistant'}
              </h1>
              <p style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                {/* ... (other descriptions) */}
                {activeTab === 'leave-management' && 'Apply for leave and track your requests'}
                {activeTab === 'student-profile' && 'View and manage your personal profile and credentials'}
                {activeTab === 'settings' && 'Manage campus geofencing and IP subnet restriction boundaries'}
                {activeTab === 'ai-assistant' && 'Interact using voice or upload files. Customise bot settings and suggestion filters.'}
              </p>
            </div>
         {/* ... (rest of header) */}
        </header>

        {/* ... (server warming up message) */}

        {/* Tab Content */}
        {activeTab === 'dashboard' && ( /* ... */ )}
        {activeTab === 'students' && ( /* ... */ )}
        {activeTab === 'teachers' && userRole === 'admin' && ( /* ... */ )}
        {activeTab === 'logs' && ( /* ... */ )}
        {activeTab === 'attendance' && ( /* ... */ )}
        {activeTab === 'session-history' && ( /* ... */ )}
        {activeTab === 'reports' && ( /* ... */ )}
        {activeTab === 'settings' && userRole === 'admin' && ( /* ... */ )}
        {activeTab === 'student-attendance' && ( /* ... */ )}
        {activeTab === 'leave-management' && (
          <LeaveManagement token={token} currentUser={currentUser} />
        )}
        {activeTab === 'student-profile' && ( /* ... */ )}
        {activeTab === 'ai-assistant' && ( /* ... */ )}

      </main>

      {/* ... (all modals and other components) */}

      {token && userRole && (
        <BottomNav
          userRole={userRole}
          activeTab={activeTab}
          onNavigate={navigateToTab}
          onScanPress={handleBottomScan}
          onMorePress={() => {
            playCyberSound('click');
            setMobileControlOpen(true);
          }}
        />
      )}

      {/* ... (rest of the file) */}
    </div>
  );
}
