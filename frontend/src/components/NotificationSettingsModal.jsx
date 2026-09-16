import { useState, useEffect } from 'react';
import { 
  Shield, Clock, CheckCircle2, Calendar,
  Sparkles, X, Save, Trash2, VolumeX, Sliders
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  token,
  playCyberSound = () => {}
}) {
  const [preferences, setPreferences] = useState({
    attendance_enabled: true,
    leave_dispute_enabled: true,
    class_reminders_enabled: true,
    security_enabled: true,
    promotional_enabled: false,
    quiet_hours_enabled: false,
    quiet_start_time: '22:00',
    quiet_end_time: '07:00'
  });
  const [, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (!isOpen || !token) return;
    const fetchPrefs = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/notifications/preferences`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPreferences(data);
        }
      } catch (err) {
        console.error('Failed to fetch notification preferences:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrefs();
  }, [isOpen, token]);

  const handleToggle = (key) => {
    playCyberSound('click');
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChangeTime = (key, val) => {
    setPreferences(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if (!token) return;
    playCyberSound('click');
    setIsSaving(true);
    setSaveStatus('');
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(preferences)
      });
      if (res.ok) {
        playCyberSound('success');
        setSaveStatus('Preferences saved!');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to clear all notification history?')) return;
    playCyberSound('click');
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/clear-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        playCyberSound('success');
        alert('Notification history cleared.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(10, 15, 30, 0.98))',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sliders size={20} color="#00f2fe" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Notification Preferences
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '2px 0 0' }}>
                Role alert channels & quiet hours settings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#9ca3af',
              padding: '6px',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* Category Toggles */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00f2fe', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notification Categories
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'attendance_enabled', label: 'Attendance Alerts', desc: 'Check-in, checkout, and absent status updates', icon: CheckCircle2, color: '#10b981' },
                { key: 'leave_dispute_enabled', label: 'Leave & Dispute Updates', desc: 'Status approvals and dispute resolution notifications', icon: Calendar, color: '#f59e0b' },
                { key: 'class_reminders_enabled', label: 'Class & Timetable Reminders', desc: 'Upcoming lectures and schedule updates', icon: Clock, color: '#8b5cf6' },
                { key: 'security_enabled', label: 'Security & System Alerts', desc: 'Account login, device status, and proxy warnings', icon: Shield, color: '#ef4444' },
                { key: 'promotional_enabled', label: 'Campus News & Announcements', desc: 'General non-critical campus notifications (Opt-in)', icon: Sparkles, color: '#ec4899' }
              ].map(item => (
                <div
                  key={item.key}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <item.icon size={18} color={item.color} />
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={preferences[item.key]}
                    onChange={() => handleToggle(item.key)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#00f2fe',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quiet Hours Section */}
          <div style={{
            padding: '16px',
            borderRadius: '14px',
            background: 'rgba(0, 242, 254, 0.03)',
            border: '1px solid rgba(0, 242, 254, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <VolumeX size={18} color="#00f2fe" />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                    Quiet Hours
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Suppress push notifications during sleep hours
                  </div>
                </div>
              </div>

              <input
                type="checkbox"
                checked={preferences.quiet_hours_enabled}
                onChange={() => handleToggle('quiet_hours_enabled')}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#00f2fe',
                  cursor: 'pointer'
                }}
              />
            </div>

            {preferences.quiet_hours_enabled && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Start Time</label>
                  <input
                    type="time"
                    value={preferences.quiet_start_time}
                    onChange={(e) => handleChangeTime('quiet_start_time', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>End Time</label>
                  <input
                    type="time"
                    value={preferences.quiet_end_time}
                    onChange={(e) => handleChangeTime('quiet_end_time', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={handleClearAll}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={14} /> Clear Notification History
            </button>

            {saveStatus && (
              <span style={{ fontSize: '0.78rem', color: saveStatus.includes('Failed') ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                {saveStatus}
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#9ca3af',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              background: 'linear-gradient(90deg, #00f2fe, #4facfe)',
              border: 'none',
              color: '#0f172a',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isSaving ? 0.7 : 1
            }}
          >
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}
