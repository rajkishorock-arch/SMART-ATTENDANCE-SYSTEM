import { useState } from 'react';
import { UserPlus, ShieldCheck, Search, Plus, ChevronRight, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/platform';
import MasterKeySettings from './MasterKeySettings';

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

export default function AdminUserManagement({
  token,
  currentUser,
  isDemoMode,
  playCyberSound,
  teachers = [],
  fetchTeachers,
  requestMasterPassword,
  onRequestMasterPassword,
  routeView = null,
  setRouteView,
  onCloseSubView,
}) {
  const [localRouteView, setLocalRouteView] = useState(null);
  const activeRoute = setRouteView ? routeView : localRouteView;
  const setActiveRoute = setRouteView || setLocalRouteView;

  const [search, setSearch] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionErr, setActionErr] = useState('');

  const getMasterPassword = requestMasterPassword || onRequestMasterPassword;
  const adminList = (teachers || []).filter(u => u.role === 'admin');

  const closeSubView = () => {
    setActionMsg('');
    setActionErr('');
    if (onCloseSubView) {
      onCloseSubView();
    } else {
      setActiveRoute(null);
    }
  };

  const openRegisterPage = () => {
    if (playCyberSound) playCyberSound('click');
    setActionMsg('');
    setActionErr('');
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminPassword('');
    setActiveRoute({ sub: 'admins', mode: 'register' });
  };

  const openDetailPage = (adminUser) => {
    if (playCyberSound) playCyberSound('click');
    setActionMsg('');
    setActionErr('');
    setActiveRoute({ sub: 'admins', mode: 'detail', id: adminUser.id, item: adminUser });
  };

  const handleCreateAdmin = async (e) => {
    if (e) e.preventDefault();
    setActionMsg('');
    setActionErr('');
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      setActionErr('Name, Email, and Password are required.');
      return;
    }

    const masterPass = await getMasterPassword(
      'Master Key Verification Required',
      `Enter Master Password to register new Admin "${newAdminName}":`
    );
    if (!masterPass) {
      setActionErr('Registration cancelled. Master key verification is required.');
      return;
    }

    setIsCreatingAdmin(true);

    if (isDemoMode) {
      setTimeout(() => {
        setActionMsg(`Admin account created successfully for ${newAdminEmail}.`);
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminPassword('');
        setIsCreatingAdmin(false);
        if (playCyberSound) playCyberSound('success');
        if (fetchTeachers) fetchTeachers(token);
      }, 300);
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
          name: newAdminName.trim(),
          email: newAdminEmail.trim(),
          password: newAdminPassword,
          role: 'admin'
        })
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Failed to create admin.');
      }
      setActionMsg(`Admin account created for ${newAdminEmail}.`);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      if (playCyberSound) playCyberSound('success');
      if (fetchTeachers) await fetchTeachers(token);
    } catch (err) {
      if (playCyberSound) playCyberSound('error');
      setActionErr(err.message || 'Failed to create admin.');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleToggleAdminStatus = async (adminUser) => {
    if (playCyberSound) playCyberSound('click');
    setActionMsg('');
    setActionErr('');
    const masterPass = await getMasterPassword(
      'Master Key Verification Required',
      `Enter Master Password to ${adminUser.is_active ? 'DEACTIVATE' : 'ACTIVATE'} admin "${adminUser.email}":`
    );
    if (!masterPass) return;

    const nextActive = !adminUser.is_active;
    setIsUpdatingStatus(true);

    if (isDemoMode) {
      setActionMsg(`Admin account marked as ${nextActive ? 'Active' : 'Deactivated'}.`);
      setActiveRoute(prev => (prev && prev.item ? { ...prev, item: { ...prev.item, is_active: nextActive } } : prev));
      if (playCyberSound) playCyberSound('success');
      if (fetchTeachers) fetchTeachers(token);
      setIsUpdatingStatus(false);
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
          is_active: nextActive
        })
      });
      if (res.ok) {
        if (playCyberSound) playCyberSound('success');
        setActionMsg(`Admin account ${nextActive ? 'activated' : 'deactivated'} successfully.`);
        setActiveRoute(prev => (prev && prev.item ? { ...prev, item: { ...prev.item, is_active: nextActive } } : prev));
        if (fetchTeachers) await fetchTeachers(token);
      } else {
        const errData = await res.json().catch(() => ({}));
        setActionErr(errData.detail || 'Failed to update admin status.');
      }
    } catch {
      setActionErr('Connection failed while updating admin.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteAdminUser = async (adminUser) => {
    if (playCyberSound) playCyberSound('click');
    setActionMsg('');
    setActionErr('');
    if (adminUser.email === 'rajkishorock@gmail.com' || adminUser.email === 'admin@face.com') {
      setActionErr('Primary system administrator account cannot be removed.');
      if (playCyberSound) playCyberSound('error');
      return;
    }

    const masterPass = await getMasterPassword(
      'Master Key Verification Required',
      `Enter Master Password to remove admin "${adminUser.email}":`
    );
    if (!masterPass) return;

    setIsDeletingAdmin(true);

    if (isDemoMode) {
      if (playCyberSound) playCyberSound('success');
      if (fetchTeachers) fetchTeachers(token);
      setIsDeletingAdmin(false);
      closeSubView();
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
        if (playCyberSound) playCyberSound('success');
        if (fetchTeachers) await fetchTeachers(token);
        closeSubView();
      } else {
        const errData = await res.json().catch(() => ({}));
        setActionErr(errData.detail || 'Failed to delete admin.');
      }
    } catch {
      setActionErr('Connection failed while deleting admin.');
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  /* ===== DEDICATED REGISTER ADMIN PAGE ===== */
  if (activeRoute?.mode === 'register') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {actionMsg && (
            <div className="feedback-banner is-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{actionMsg}</span>
            </div>
          )}
          {actionErr && (
            <div className="feedback-banner is-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{actionErr}</span>
            </div>
          )}

          <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserPlus size={13} />
                <span>Administrator Credentials</span>
              </div>

              <div className="golden-os-fields-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Admin Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Rajkishore"
                    value={newAdminName}
                    onChange={e => setNewAdminName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Admin Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. raj@college.com"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter strong password"
                  value={newAdminPassword}
                  onChange={e => setNewAdminPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={closeSubView}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingAdmin}
                className="golden-os-primary-action"
                style={{ width: 'auto', padding: '10px 22px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700 }}
              >
                <span>{isCreatingAdmin ? 'Creating...' : 'Create Admin Account'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED ADMIN DETAIL & CONTROL PAGE ===== */
  if (activeRoute?.mode === 'detail') {
    const selectedAdmin =
      adminList.find(u => String(u.id) === String(activeRoute.id)) ||
      activeRoute.item;

    if (!selectedAdmin) {
      return (
        <div className="golden-os-window golden-os-page-bottom-safe" style={{ padding: '24px', textAlign: 'center', color: '#6b5b3e' }}>
          Administrator account not found.
        </div>
      );
    }

    const isActive = Boolean(selectedAdmin.is_active);

    return (
      <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Hero Admin Card */}
          <div className="golden-os-inset-card" style={{ padding: '16px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 200px' }}>
              <div className="golden-os-avatar" style={{ width: '46px', height: '46px', fontSize: '0.96rem' }}>
                {getInitials(selectedAdmin.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2b2112', overflowWrap: 'anywhere' }}>
                  {selectedAdmin.name}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#6b5b3e', fontWeight: 600, marginTop: '2px', overflowWrap: 'anywhere' }}>
                  {selectedAdmin.email}
                </div>
              </div>
            </div>

            <span style={{
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '0.72rem',
              fontWeight: 700,
              background: isActive ? 'rgba(5, 150, 105, 0.1)' : '#fef2f2',
              color: isActive ? '#047857' : '#dc2626',
              border: `1px solid ${isActive ? 'rgba(5, 150, 105, 0.28)' : '#fecaca'}`,
            }}>
              {isActive ? 'Active' : 'Deactivated'}
            </span>
          </div>

          {actionMsg && (
            <div className="feedback-banner is-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{actionMsg}</span>
            </div>
          )}
          {actionErr && (
            <div className="feedback-banner is-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{actionErr}</span>
            </div>
          )}

          {/* Account Summary */}
          <div className="golden-os-form-section">
            <div className="golden-os-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={13} />
              <span>Account Details</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.86rem', gap: '10px' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Full Name</span>
              <span style={{ color: '#25231f', fontWeight: 700 }}>{selectedAdmin.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.86rem', gap: '10px' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Email</span>
              <span style={{ color: '#25231f', fontWeight: 700, wordBreak: 'break-all', textAlign: 'right' }}>{selectedAdmin.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.86rem' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Role</span>
              <span style={{ color: '#6e4e1c', fontWeight: 700 }}>System Admin</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.86rem' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Created Date</span>
              <span style={{ color: '#25231f', fontWeight: 700 }}>{formatDate(selectedAdmin.created_at)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.86rem' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>User ID</span>
              <span style={{ color: '#6e4e1c', fontWeight: 700, fontFamily: 'monospace' }}>#{selectedAdmin.id}</span>
            </div>
          </div>

          {/* Account Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '4px' }}>
            <button
              type="button"
              disabled={isDeletingAdmin}
              onClick={() => handleDeleteAdminUser(selectedAdmin)}
              style={{
                padding: '10px 15px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: isDeletingAdmin ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Trash2 size={15} />
              <span>{isDeletingAdmin ? 'Removing...' : 'Remove Admin'}</span>
            </button>

            <div style={{ display: 'flex', gap: '8px', flex: '1 1 200px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => handleToggleAdminStatus(selectedAdmin)}
                className="golden-os-primary-action"
                style={{
                  width: 'auto',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: isActive
                    ? 'linear-gradient(135deg, #b45309, #92400e)'
                    : 'linear-gradient(135deg, #059669, #047857)',
                }}
              >
                <span>{isUpdatingStatus ? 'Updating...' : (isActive ? 'Deactivate' : 'Activate')}</span>
              </button>
              <button
                type="button"
                onClick={closeSubView}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '10px 16px', borderRadius: '10px', fontSize: '0.85rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ===== MAIN GOLDEN GATE ADMINISTRATOR DIRECTORY (Clean 1-Line Rows, Form Hidden) ===== */
  const query = search.trim().toLowerCase();
  const visibleAdmins = adminList.filter(u =>
    String(u.name || '').toLowerCase().includes(query) ||
    String(u.email || '').toLowerCase().includes(query)
  );

  return (
    <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
            <input
              type="search"
              className="form-input"
              aria-label="Search administrators"
              placeholder="Search admin..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '38px', background: '#ffffff', width: '100%', boxSizing: 'border-box' }}
            />
            <Search size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
          </div>

          <button
            type="button"
            onClick={openRegisterPage}
            className="golden-os-primary-action"
            style={{ width: 'auto', padding: '10px 16px', borderRadius: '11px', fontSize: '0.84rem', gap: '6px', flexShrink: 0 }}
          >
            <Plus size={16} />
            <span>Register Admin</span>
          </button>
        </div>

        {visibleAdmins.length === 0 ? (
          <div className="golden-os-inset-card" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <ShieldCheck size={28} style={{ color: '#9c8b6e' }} />
            <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>
              {query ? 'No matching administrators found' : 'No administrators registered'}
            </span>
          </div>
        ) : (
          <div className="golden-os-list-shell">
            {visibleAdmins.map(adminUser => {
              const isActive = Boolean(adminUser.is_active);
              return (
                <button
                  key={adminUser.id}
                  type="button"
                  className="golden-os-list-row"
                  onClick={() => openDetailPage(adminUser)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div className="golden-os-avatar">{getInitials(adminUser.name)}</div>
                    <span style={{ fontSize: '0.94rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {adminUser.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '999px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: isActive ? 'rgba(5, 150, 105, 0.1)' : '#fef2f2',
                      color: isActive ? '#047857' : '#dc2626',
                      border: `1px solid ${isActive ? 'rgba(5, 150, 105, 0.25)' : '#fecaca'}`,
                    }}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                    <ChevronRight size={16} color="#8c734b" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Workspace Master Key panel for non-default institution tenants */}
      {currentUser?.institution_id !== 1 && (
        <MasterKeySettings token={token} playCyberSound={playCyberSound} />
      )}
    </div>
  );
}
