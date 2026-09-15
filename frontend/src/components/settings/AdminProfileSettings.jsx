import { useState } from 'react';
import { UserCheck, Edit } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/platform';

export default function AdminProfileSettings({
  currentUser,
  token,
  isDemoMode,
  setCurrentUser
}) {
  const [adminProfileName, setAdminProfileName] = useState('');
  const [adminProfileEmail, setAdminProfileEmail] = useState('');
  const [adminProfilePassword, setAdminProfilePassword] = useState('');
  const [adminProfileConfirmPassword, setAdminProfileConfirmPassword] = useState('');
  const [isUpdatingAdminProfile, setIsUpdatingAdminProfile] = useState(false);
  const [adminProfileMsg, setAdminProfileMsg] = useState('');
  const [adminProfileErr, setAdminProfileErr] = useState('');

  const handleUpdateProfile = async () => {
    setAdminProfileMsg('');
    setAdminProfileErr('');

    if (adminProfilePassword && adminProfilePassword !== adminProfileConfirmPassword) {
      setAdminProfileErr('Passwords do not match!');
      return;
    }
    if (!adminProfileName && !adminProfileEmail && !adminProfilePassword) {
      setAdminProfileErr('Fill at least one field to update!');
      return;
    }

    setIsUpdatingAdminProfile(true);

    if (isDemoMode) {
      setTimeout(() => {
        const email = adminProfileEmail || currentUser?.email;
        const name = adminProfileName || currentUser?.name;
        if (setCurrentUser) {
          setCurrentUser(prev => ({
            ...prev,
            name: name,
            email: email,
            details: { ...prev.details, name: name, email: email }
          }));
        }
        setAdminProfileMsg('SIMULATOR ACTION: Profile updated successfully! (Local Sandbox Mode).');
        setAdminProfileName('');
        setAdminProfileEmail('');
        setAdminProfilePassword('');
        setAdminProfileConfirmPassword('');
        setIsUpdatingAdminProfile(false);
      }, 1000);
      return;
    }

    try {
      const payload = {};
      if (adminProfileName) payload.name = adminProfileName;
      if (adminProfileEmail) payload.email = adminProfileEmail;
      if (adminProfilePassword) payload.password = adminProfilePassword;

      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/users/${currentUser?.id || 1}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Update failed');
      }

      const updated = await res.json();
      setAdminProfileMsg(`Profile updated successfully! Now log in with ${updated.email}.`);
      setAdminProfileName('');
      setAdminProfileEmail('');
      setAdminProfilePassword('');
      setAdminProfileConfirmPassword('');
    } catch (err) {
      setAdminProfileErr(err.message);
    } finally {
      setIsUpdatingAdminProfile(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={22} style={{ color: '#a78bfa' }} /> Admin Profile Settings
        </h3>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px' }}>
          Update your name, email credentials, or change your password.
        </p>
      </div>

      {/* UPDATE OWN PROFILE */}
      <div style={{ background: 'rgba(167,139,250,0.02)', border: '1px solid rgba(167,139,250,0.1)', borderRadius: '12px', padding: '20px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Edit size={16} style={{ color: '#a78bfa' }} /> Update My Admin Profile
        </h4>

        {adminProfileMsg && (
          <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem', marginBottom: '14px' }}>
            ✅ {adminProfileMsg}
          </div>
        )}
        {adminProfileErr && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '14px' }}>
            ❌ {adminProfileErr}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              placeholder={currentUser?.name || 'Enter your name'}
              value={adminProfileName}
              onChange={e => setAdminProfileName(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">New Email</label>
            <input
              type="email"
              className="form-input"
              placeholder={currentUser?.email || 'Enter new email'}
              value={adminProfileEmail}
              onChange={e => setAdminProfileEmail(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="New password"
              value={adminProfilePassword}
              onChange={e => setAdminProfilePassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter password again"
              value={adminProfileConfirmPassword}
              onChange={e => setAdminProfileConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <button
          onClick={handleUpdateProfile}
          className="bg-gradient-btn"
          style={{ marginTop: '16px', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem' }}
          disabled={isUpdatingAdminProfile}
        >
          {isUpdatingAdminProfile ? 'Saving...' : '💾 Save Profile'}
        </button>
      </div>
    </div>
  );
}
