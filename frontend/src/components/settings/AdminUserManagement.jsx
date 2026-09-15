import { useState } from 'react';
import { UserPlus, ShieldCheck } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/platform';
import MasterKeySettings from './MasterKeySettings';

export default function AdminUserManagement({
  token,
  currentUser,
  isDemoMode,
  playCyberSound,
  teachers = [],
  fetchTeachers,
  requestMasterPassword,
  onRequestMasterPassword
}) {
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [createAdminMsg, setCreateAdminMsg] = useState('');
  const [createAdminErr, setCreateAdminErr] = useState('');

  const getMasterPassword = requestMasterPassword || onRequestMasterPassword;

  const handleCreateAdmin = async () => {
    setCreateAdminMsg('');
    setCreateAdminErr('');
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      setCreateAdminErr('Name, Email, and Password are all required!');
      return;
    }

    const masterPass = await getMasterPassword(
      '🔐 Master Key Verification Required',
      `Enter Master Password to register new Admin "${newAdminName}":`
    );
    if (!masterPass) {
      setCreateAdminErr('Registration cancelled. Master key is required.');
      return;
    }

    setIsCreatingAdmin(true);

    if (isDemoMode) {
      setTimeout(() => {
        setCreateAdminMsg(`SIMULATOR ACTION: Admin account created successfully! Log in using ${newAdminEmail}.`);
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminPassword('');
        setIsCreatingAdmin(false);
        if (playCyberSound) playCyberSound('success');
        if (fetchTeachers) fetchTeachers(token);
      }, 1000);
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass
        },
        body: JSON.stringify({
          name: newAdminName,
          email: newAdminEmail,
          password: newAdminPassword,
          role: 'admin'
        })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to create admin.');
      }
      setCreateAdminMsg(`Admin account created successfully! Log in using ${newAdminEmail}.`);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      if (playCyberSound) playCyberSound('success');
      if (fetchTeachers) fetchTeachers(token);
    } catch (err) {
      if (playCyberSound) playCyberSound('error');
      setCreateAdminErr(err.message);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleToggleAdminStatus = async (adminUser) => {
    if (playCyberSound) playCyberSound('click');
    const masterPass = await getMasterPassword(
      '🔐 Master Key Verification Required',
      `Enter Master Password to ${adminUser.is_active ? 'DEACTIVATE' : 'ACTIVATE'} admin "${adminUser.email}":`
    );
    if (!masterPass) return;

    if (isDemoMode) {
      alert('SIMULATOR ACTION: Status updated successfully.');
      if (playCyberSound) playCyberSound('success');
      if (fetchTeachers) fetchTeachers(token);
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/users/${adminUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass
        },
        body: JSON.stringify({
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          is_active: !adminUser.is_active
        })
      });
      if (res.ok) {
        alert('Status updated successfully.');
        if (playCyberSound) playCyberSound('success');
        if (fetchTeachers) fetchTeachers(token);
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Failed to update admin.');
      }
    } catch {
      alert('Connection failed.');
    }
  };

  const handleDeleteAdminUser = async (adminUser) => {
    if (playCyberSound) playCyberSound('click');
    if (adminUser.email === 'rajkishorock@gmail.com' || adminUser.email === 'admin@face.com') {
      alert('Cannot delete primary system admin!');
      if (playCyberSound) playCyberSound('error');
      return;
    }

    const masterPass = await getMasterPassword(
      '🔐 Master Key Verification Required',
      `Enter Master Password to completely DELETE admin "${adminUser.email}":`
    );
    if (!masterPass) return;

    if (isDemoMode) {
      alert('SIMULATOR ACTION: Admin deleted successfully.');
      if (playCyberSound) playCyberSound('success');
      if (fetchTeachers) fetchTeachers(token);
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/users/${adminUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass
        }
      });
      if (res.ok) {
        alert('Admin deleted successfully.');
        if (playCyberSound) playCyberSound('success');
        if (fetchTeachers) fetchTeachers(token);
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Failed to delete admin.');
      }
    } catch {
      alert('Connection failed.');
    }
  };

  const adminList = (teachers || []).filter(u => u.role === 'admin');

  return (
    <>
      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={22} style={{ color: '#00f2fe' }} /> Register Administrators
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px' }}>
            Seed and manage new auxiliary administrator credentials.
          </p>
        </div>

        {/* CREATE NEW ADMIN */}
        <div style={{ background: 'rgba(0,242,254,0.01)', border: '1px solid rgba(0,242,254,0.08)', borderRadius: '12px', padding: '20px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={16} style={{ color: '#00f2fe' }} /> Create New Admin Account
          </h4>
          <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginBottom: '16px' }}>Multiple admins can be added. Create a new admin and give them separate login credentials.</p>

          {createAdminMsg && (
            <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem', marginBottom: '14px' }}>
              ✅ {createAdminMsg}
            </div>
          )}
          {createAdminErr && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '14px' }}>
              ❌ {createAdminErr}
            </div>
          )}

          <div className="responsive-form-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Admin Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Example: Rajkishore"
                value={newAdminName}
                onChange={e => setNewAdminName(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Admin Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="Example: raj@college.com"
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Set Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter strong password"
                value={newAdminPassword}
                onChange={e => setNewAdminPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            onClick={handleCreateAdmin}
            className="bg-gradient-btn"
            style={{ marginTop: '16px', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #00f2fe, #4facfe)' }}
            disabled={isCreatingAdmin}
          >
            {isCreatingAdmin ? 'Creating...' : '➕ Create New Admin'}
          </button>
        </div>
      </div>

      {/* CHANGE COLLEGE MASTER PASSWORD */}
      {currentUser?.institution_id !== 1 && (
        <MasterKeySettings token={token} playCyberSound={playCyberSound} />
      )}

      {/* Registered Admins Directory */}
      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <ShieldCheck size={22} style={{ color: '#a78bfa' }} /> Registered Administrators
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
              List of all system administrators with their login and active status details.
            </p>
          </div>
          <span className="telemetry-stat-pill admin" style={{
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: 'rgba(167, 139, 250, 0.12)',
            color: '#a78bfa',
            border: '1px solid rgba(167, 139, 250, 0.25)',
            letterSpacing: '0.5px'
          }}>
            TOTAL ADMINS: {adminList.length}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
            📋 Admin User Directory
          </h4>
          <span className="mobile-scroll-hint" style={{ fontSize: '0.72rem', color: '#00f2fe', background: 'rgba(0, 242, 254, 0.1)', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(0, 242, 254, 0.25)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            👉 Swipe horizontally for full table
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-view" style={{ width: '100%' }}>
          <div className="table-responsive table-container" style={{ width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>NAME</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>EMAIL (USERNAME)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>ROLE</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>CREATED DATE</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {adminList.map((adminUser) => (
                  <tr key={adminUser.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>#{adminUser.id}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#f1f5f9' }}>{adminUser.name}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)' }}>{adminUser.email}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        background: 'rgba(0, 242, 254, 0.12)',
                        color: '#00f2fe'
                      }}>
                        SYSTEM ADMIN
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        background: adminUser.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: adminUser.is_active ? '#10b981' : '#ef4444'
                      }}>
                        {adminUser.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)' }}>
                      {new Date(adminUser.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleToggleAdminStatus(adminUser)}
                          className="action-btn"
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.75rem',
                            background: adminUser.is_active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            border: `1px solid ${adminUser.is_active ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                            color: adminUser.is_active ? '#ef4444' : '#10b981'
                          }}
                        >
                          {adminUser.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteAdminUser(adminUser)}
                          className="action-btn"
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.75rem',
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-view" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          {adminList.map((adminUser) => (
            <div
              key={adminUser.id}
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              {/* Header: Name + ID */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.96rem' }}>{adminUser.name}</span>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.78rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                  #{adminUser.id}
                </span>
              </div>

              {/* Email */}
              <div style={{ color: '#94a3b8', fontSize: '0.82rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {adminUser.email}
              </div>

              {/* Badges: Role, Status, and Date */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  background: 'rgba(0, 242, 254, 0.12)',
                  color: '#00f2fe',
                  border: '1px solid rgba(0, 242, 254, 0.25)'
                }}>
                  SYSTEM ADMIN
                </span>

                <span style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  background: adminUser.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  color: adminUser.is_active ? '#10b981' : '#ef4444',
                  border: `1px solid ${adminUser.is_active ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                }}>
                  {adminUser.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                </span>

                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginLeft: 'auto' }}>
                  {new Date(adminUser.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                <button
                  onClick={() => handleToggleAdminStatus(adminUser)}
                  className="action-btn"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    background: adminUser.is_active ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    border: `1px solid ${adminUser.is_active ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                    color: adminUser.is_active ? '#ef4444' : '#10b981',
                    cursor: 'pointer'
                  }}
                >
                  {adminUser.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDeleteAdminUser(adminUser)}
                  className="action-btn"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
