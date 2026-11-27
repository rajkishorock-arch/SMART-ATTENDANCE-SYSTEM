import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Shield,
  Sparkles,
  VolumeX,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';
import useUI from '../hooks/useUI';

const PREFERENCE_CATEGORIES = [
  {
    key: 'attendance_enabled',
    label: 'Attendance Alerts',
    desc: 'Check-in confirmations and absent status alerts',
    icon: CheckCircle2,
    color: '#047857',
    bg: '#ecfdf5',
  },
  {
    key: 'leave_dispute_enabled',
    label: 'Leaves & Disputes',
    desc: 'Leave approvals and correction review updates',
    icon: Calendar,
    color: '#b45309',
    bg: '#fef3c7',
  },
  {
    key: 'class_reminders_enabled',
    label: 'Class Reminders',
    desc: 'Upcoming classes and timetable changes',
    icon: Clock,
    color: '#785927',
    bg: '#f5ecda',
  },
  {
    key: 'security_enabled',
    label: 'Security & Account',
    desc: 'Sign-in alerts, device checks, and security notices',
    icon: Shield,
    color: '#b91c1c',
    bg: '#fef2f2',
  },
  {
    key: 'promotional_enabled',
    label: 'Campus Announcements',
    desc: 'Events, workshops, and general campus notices',
    icon: Sparkles,
    color: '#6b4e1e',
    bg: '#faf2df',
  },
];

export default function NotificationSettingsModal({
  isOpen = false,
  inlinePage = false,
  onClose = () => {},
  token,
  API_BASE_URL = getApiBaseUrl(),
  onPreferencesSaved,
  onHistoryCleared,
}) {
  const { playCyberSound } = useUI();
  const [preferences, setPreferences] = useState({
    attendance_enabled: true,
    leave_dispute_enabled: true,
    class_reminders_enabled: true,
    security_enabled: true,
    promotional_enabled: false,
    quiet_hours_enabled: false,
    quiet_start_time: '22:00',
    quiet_end_time: '07:00',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const active = inlinePage || isOpen;

  useEffect(() => {
    if (!active || !token) return;
    let cancelled = false;
    const fetchPreferences = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/notifications/preferences`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data && data.preferences) {
            setPreferences(prev => ({ ...prev, ...data.preferences }));
          }
        }
      } catch {
        // retain defaults on transient failure
      }
    };
    fetchPreferences();
    return () => { cancelled = true; };
  }, [active, token, API_BASE_URL]);

  if (!active) return null;

  const handleToggle = (key) => {
    playCyberSound('click');
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleChangeTime = (key, val) => {
    setPreferences(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('');
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/preferences`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });
      if (!res.ok) throw new Error('Failed to save preferences');
      playCyberSound('success');
      setSaveStatus('Preferences saved successfully.');
      if (onPreferencesSaved) onPreferencesSaved(preferences);
    } catch {
      setSaveStatus('Could not save preferences right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirmClear) {
      playCyberSound('click');
      setConfirmClear(true);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/clear-all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        playCyberSound('click');
        setConfirmClear(false);
        setSaveStatus('Notification history cleared.');
        if (onHistoryCleared) onHistoryCleared();
      }
    } catch {
      setSaveStatus('Could not clear notification history.');
    }
  };

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {saveStatus && (
        <div
          role="status"
          className={`feedback-banner ${saveStatus.includes('Could not') ? 'is-error' : 'is-success'}`}
        >
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{saveStatus}</span>
        </div>
      )}

      {/* Alert Channels */}
      <div className="golden-os-form-section" style={{ gap: '2px' }}>
        <div className="golden-os-form-section-title" style={{ marginBottom: '4px' }}>
          Alert Channels
        </div>

        {PREFERENCE_CATEGORIES.map((item, idx) => {
          const IconComp = item.icon;
          const isLast = idx === PREFERENCE_CATEGORIES.length - 1;
          return (
            <div
              key={item.key}
              className="gg-pref-row"
              style={{ borderBottom: isLast ? 'none' : '1px solid #f2ead9' }}
            >
              <div className="gg-pref-info">
                <div
                  className="gg-notif-row-icon"
                  style={{ background: item.bg, color: item.color }}
                >
                  <IconComp size={15} />
                </div>
                <div className="gg-pref-text">
                  <div className="gg-pref-title">{item.label}</div>
                  <div className="gg-pref-desc">{item.desc}</div>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={!!preferences[item.key]}
                aria-label={item.label}
                onClick={() => handleToggle(item.key)}
                className={`gg-switch ${preferences[item.key] ? 'is-on' : ''}`}
              >
                <span className="gg-switch-thumb" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Quiet Hours */}
      <div className="golden-os-form-section" style={{ gap: '12px' }}>
        <div className="golden-os-form-section-title">Delivery Schedule</div>
        <div className="gg-pref-row" style={{ borderBottom: 'none', padding: 0 }}>
          <div className="gg-pref-info">
            <div
              className="gg-notif-row-icon"
              style={{ background: '#f5ecda', color: '#785927' }}
            >
              <VolumeX size={15} />
            </div>
            <div className="gg-pref-text">
              <div className="gg-pref-title">Quiet Hours</div>
              <div className="gg-pref-desc">Pause push alerts during rest hours</div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={!!preferences.quiet_hours_enabled}
            aria-label="Quiet Hours"
            onClick={() => handleToggle('quiet_hours_enabled')}
            className={`gg-switch ${preferences.quiet_hours_enabled ? 'is-on' : ''}`}
          >
            <span className="gg-switch-thumb" />
          </button>
        </div>

        {preferences.quiet_hours_enabled && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '6px', borderTop: '1px solid #f2ead9' }}>
            <div>
              <label className="golden-os-field-label">Start Time</label>
              <input
                type="time"
                className="golden-os-input"
                value={preferences.quiet_start_time}
                onChange={(e) => handleChangeTime('quiet_start_time', e.target.value)}
              />
            </div>
            <div>
              <label className="golden-os-field-label">End Time</label>
              <input
                type="time"
                className="golden-os-input"
                value={preferences.quiet_end_time}
                onChange={(e) => handleChangeTime('quiet_end_time', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="golden-os-primary-action"
        style={{ justifyContent: 'center', padding: '12px 18px', borderRadius: '12px', fontSize: '0.88rem' }}
      >
        <Save size={16} />
        <span>{isSaving ? 'Saving Preferences...' : 'Save Preferences'}</span>
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {!confirmClear ? (
          <button
            type="button"
            onClick={handleClearAll}
            className="golden-os-feedback-filter-btn"
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              color: '#b91c1c',
              borderColor: '#fecaca',
              background: '#fff5f5',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleClearAll}
              className="golden-os-feedback-filter-btn"
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: '#dc2626',
                borderColor: '#dc2626',
                color: '#ffffff',
              }}
            >
              Confirm Clear All
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '8px 12px', borderRadius: '10px' }}
            >
              Cancel
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="golden-os-feedback-filter-btn"
          style={{ padding: '8px 16px', borderRadius: '10px' }}
        >
          Done
        </button>
      </div>
    </div>
  );

  if (inlinePage) {
    return (
      <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
        <div className="golden-os-window">
          <div className="golden-os-body">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="gg-notif-backdrop" onClick={onClose}>
      <div
        className="gg-notif-panel"
        style={{ maxWidth: '480px', padding: '16px', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#2b2112' }}>
            Notification Preferences
          </h3>
          <button type="button" onClick={onClose} className="gg-notif-action-btn" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {content}
      </div>
    </div>
  );
}
