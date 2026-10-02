import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  X, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Shield, 
  Sparkles, 
  VolumeX, 
  Trash2, 
  Save 
} from 'lucide-react';
import useUI from '../hooks/useUI';

export default function NotificationSettingsModal({ isOpen, onClose, token, API_BASE_URL, onPreferencesSaved, onHistoryCleared }) {
  const { playCyberSound } = useUI();
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const fetchPreferences = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/notifications/preferences`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.preferences) {
            setPreferences(data.preferences);
          }
        }
      } catch (err) {
        console.error('Failed to load notification preferences:', err);
      }
    };

    fetchPreferences();
  }, [isOpen, token, API_BASE_URL]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    playCyberSound('click');
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleChangeTime = (key, val) => {
    setPreferences(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('');
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/preferences`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });
      if (res.ok) {
        playCyberSound('success');
        setSaveStatus('Preferences saved successfully!');
        if (onPreferencesSaved) onPreferencesSaved(preferences);
        setTimeout(() => {
          setSaveStatus('');
          onClose();
        }, 800);
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('Failed to save preferences.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to permanently clear all your notification history?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/clear-all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        playCyberSound('click');
        if (onHistoryCleared) onHistoryCleared();
        onClose();
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '520px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#e0f2fe',
              border: '1px solid #bae6fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sliders size={20} color="#0284c7" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Notification Preferences
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0' }}>
                Role alert channels & quiet hours settings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#64748b',
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
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Notification Categories
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'attendance_enabled', label: 'Attendance Alerts', desc: 'Check-in, checkout, and absent status updates', icon: CheckCircle2, color: '#059669' },
                { key: 'leave_dispute_enabled', label: 'Leave & Dispute Updates', desc: 'Status approvals and dispute resolution notifications', icon: Calendar, color: '#d97706' },
                { key: 'class_reminders_enabled', label: 'Class & Timetable Reminders', desc: 'Upcoming lectures and schedule updates', icon: Clock, color: '#7c3aed' },
                { key: 'security_enabled', label: 'Security & System Alerts', desc: 'Account login, device status, and proxy warnings', icon: Shield, color: '#dc2626' },
                { key: 'promotional_enabled', label: 'Campus News & Announcements', desc: 'General non-critical campus notifications (Opt-in)', icon: Sparkles, color: '#db2777' }
              ].map(item => (
                <div
                  key={item.key}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <item.icon size={18} color={item.color} />
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
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
                      accentColor: '#0284c7',
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
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <VolumeX size={18} color="#0284c7" />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                    Quiet Hours
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
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
                  accentColor: '#0284c7',
                  cursor: 'pointer'
                }}
              />
            </div>

            {preferences.quiet_hours_enabled && (
              <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Start Time</label>
                  <input
                    type="time"
                    value={preferences.quiet_start_time}
                    onChange={(e) => handleChangeTime('quiet_start_time', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>End Time</label>
                  <input
                    type="time"
                    value={preferences.quiet_end_time}
                    onChange={(e) => handleChangeTime('quiet_end_time', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
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
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '8px 14px',
                borderRadius: '8px',
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
              <span style={{ fontSize: '0.78rem', color: saveStatus.includes('Failed') ? '#dc2626' : '#059669', fontWeight: 600 }}>
                {saveStatus}
              </span>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
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
              borderRadius: '8px',
              background: '#0284c7',
              border: 'none',
              color: '#ffffff',
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
