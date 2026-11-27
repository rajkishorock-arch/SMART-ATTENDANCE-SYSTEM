import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Search, ChevronRight, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/platform';
import { getActiveTenantSlug } from '../../utils/tenantConfig';

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'IN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function InstitutionManagement({
  token,
  isDemoMode,
  playCyberSound,
  requestMasterPassword,
  routeView = null,
  setRouteView,
  onCloseSubView,
}) {
  const [localRouteView, setLocalRouteView] = useState(null);
  const activeRoute = setRouteView ? routeView : localRouteView;
  const setActiveRoute = setRouteView || setLocalRouteView;

  const [institutionsList, setInstitutionsList] = useState([]);
  const [search, setSearch] = useState('');

  const [newInstName, setNewInstName] = useState('');
  const [newInstSlug, setNewInstSlug] = useState('');
  const [newInstPrimary, setNewInstPrimary] = useState('#765729');
  const [newInstSecondary, setNewInstSecondary] = useState('#06B6D4');
  const [newInstAdminEmail, setNewInstAdminEmail] = useState('');
  const [newInstAdminName, setNewInstAdminName] = useState('');
  const [newInstAdminPassword, setNewInstAdminPassword] = useState('');
  const [isAddingInstitution, setIsAddingInstitution] = useState(false);

  const [instSuccessMessage, setInstSuccessMessage] = useState('');
  const [instErrorMessage, setInstErrorMessage] = useState('');

  const [editingInst, setEditingInst] = useState(null);
  const [isUpdatingInst, setIsUpdatingInst] = useState(false);
  const [isDeletingInst, setIsDeletingInst] = useState(false);

  const fetchInstitutionsList = useCallback(async () => {
    if (isDemoMode) {
      setInstitutionsList([
        { id: 1, name: 'Default Institution', slug: 'default', primary_color: '#765729', secondary_color: '#06B6D4' },
        { id: 2, name: 'Delhi University', slug: 'du', primary_color: '#800020', secondary_color: '#DAA520' },
        { id: 3, name: 'IIT Delhi', slug: 'iitd', primary_color: '#0D9488', secondary_color: '#F59E0B' }
      ]);
      return;
    }
    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/institutions/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setInstitutionsList(data);
      }
    } catch (err) {
      console.error('Error fetching institutions list:', err);
    }
  }, [token, isDemoMode]);

  useEffect(() => {
    if (getActiveTenantSlug() !== 'default') return;
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchInstitutionsList();
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [fetchInstitutionsList]);

  const closeSubView = () => {
    setInstSuccessMessage('');
    setInstErrorMessage('');
    setEditingInst(null);
    if (onCloseSubView) {
      onCloseSubView();
    } else {
      setActiveRoute(null);
    }
  };

  const openRegisterPage = () => {
    if (playCyberSound) playCyberSound('click');
    setInstSuccessMessage('');
    setInstErrorMessage('');
    setNewInstName('');
    setNewInstSlug('');
    setNewInstPrimary('#765729');
    setNewInstSecondary('#06B6D4');
    setNewInstAdminName('');
    setNewInstAdminEmail('');
    setNewInstAdminPassword('');
    setActiveRoute({ sub: 'multitenant', mode: 'register' });
  };

  const openDetailPage = (inst) => {
    if (playCyberSound) playCyberSound('click');
    setInstSuccessMessage('');
    setInstErrorMessage('');
    setEditingInst({ ...inst });
    setActiveRoute({ sub: 'multitenant', mode: 'detail', id: inst.id, item: inst });
  };

  const handleCreateInstitution = async (e) => {
    e.preventDefault();
    setInstSuccessMessage('');
    setInstErrorMessage('');

    const masterPass = await requestMasterPassword(
      'Master Key Verification Required',
      `Enter Master Password to register new Institution "${newInstName}":`
    );
    if (!masterPass) {
      setInstErrorMessage('Registration cancelled. Master key is required.');
      return;
    }

    setIsAddingInstitution(true);

    if (isDemoMode) {
      setTimeout(() => {
        const newId = institutionsList.length + 1;
        setInstitutionsList(prev => [
          ...prev,
          {
            id: newId,
            name: newInstName,
            slug: newInstSlug.toLowerCase(),
            primary_color: newInstPrimary,
            secondary_color: newInstSecondary
          }
        ]);
        setInstSuccessMessage('Institution registered successfully.');
        setIsAddingInstitution(false);
        setNewInstName('');
        setNewInstSlug('');
        setNewInstAdminEmail('');
        setNewInstAdminName('');
        setNewInstAdminPassword('');
      }, 300);
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/institutions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass
        },
        body: JSON.stringify({
          name: newInstName,
          slug: newInstSlug.toLowerCase().trim(),
          primary_color: newInstPrimary,
          secondary_color: newInstSecondary,
          logo_url: '',
          admin_email: newInstAdminEmail.trim(),
          admin_name: newInstAdminName.trim(),
          admin_password: newInstAdminPassword
        })
      });

      if (res.ok) {
        if (playCyberSound) playCyberSound('success');
        setInstSuccessMessage('Institution created successfully.');
        fetchInstitutionsList();
        setNewInstName('');
        setNewInstSlug('');
        setNewInstAdminEmail('');
        setNewInstAdminName('');
        setNewInstAdminPassword('');
      } else {
        let errMsg = 'Failed to create institution.';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch {
          errMsg = `Error ${res.status}: ${res.statusText}`;
        }
        setInstErrorMessage(errMsg);
      }
    } catch (err) {
      setInstErrorMessage(`Connection Error: ${err.message || 'Failed to connect to backend server.'}`);
    } finally {
      setIsAddingInstitution(false);
    }
  };

  const handleDeleteInstitution = async (id, name) => {
    if (!window.confirm(`Delete "${name}" and all its users, students, schedules, and attendance data? This cannot be undone.`)) {
      return;
    }

    setInstSuccessMessage('');
    setInstErrorMessage('');

    if (isDemoMode) {
      setInstitutionsList(prev => prev.filter(inst => inst.id !== id));
      closeSubView();
      return;
    }

    const masterPass = await requestMasterPassword(
      'Master Key Verification Required',
      `Enter Master Password to DELETE Institution "${name}":`
    );
    if (!masterPass) {
      setInstErrorMessage('Deletion cancelled. Master key is required.');
      return;
    }

    setIsDeletingInst(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/institutions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass
        }
      });

      if (res.ok) {
        if (playCyberSound) playCyberSound('success');
        await fetchInstitutionsList();
        closeSubView();
      } else {
        let errMsg = 'Failed to delete institution.';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch {
          errMsg = `Error ${res.status}: ${res.statusText}`;
        }
        setInstErrorMessage(errMsg);
      }
    } catch (err) {
      setInstErrorMessage(`Connection Error: ${err.message || 'Failed to connect to backend server.'}`);
    } finally {
      setIsDeletingInst(false);
    }
  };

  const handleUpdateInstitution = async (e) => {
    e.preventDefault();
    if (!editingInst) return;

    setInstSuccessMessage('');
    setInstErrorMessage('');

    if (isDemoMode) {
      setInstitutionsList(prev => prev.map(inst => inst.id === editingInst.id ? editingInst : inst));
      setInstSuccessMessage('Institution updated successfully.');
      setActiveRoute(prev => (prev ? { ...prev, item: editingInst } : prev));
      return;
    }

    const masterPass = await requestMasterPassword(
      'Master Key Verification Required',
      `Enter Master Password to save changes for "${editingInst.name}":`
    );
    if (!masterPass) {
      setInstErrorMessage('Update cancelled. Master key is required.');
      return;
    }

    setIsUpdatingInst(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/institutions/${editingInst.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass
        },
        body: JSON.stringify({
          name: editingInst.name,
          slug: editingInst.slug.toLowerCase().trim(),
          primary_color: editingInst.primary_color,
          secondary_color: editingInst.secondary_color,
          logo_url: editingInst.logo_url || ''
        })
      });

      if (res.ok) {
        const updated = await res.json().catch(() => editingInst);
        if (playCyberSound) playCyberSound('success');
        setInstSuccessMessage('Institution updated successfully.');
        setEditingInst({ ...updated });
        setActiveRoute(prev => (prev ? { ...prev, item: updated } : prev));
        fetchInstitutionsList();
      } else {
        let errMsg = 'Failed to update institution.';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch {
          errMsg = `Error ${res.status}: ${res.statusText}`;
        }
        setInstErrorMessage(errMsg);
      }
    } catch (err) {
      setInstErrorMessage(`Connection Error: ${err.message || 'Failed to connect to backend server.'}`);
    } finally {
      setIsUpdatingInst(false);
    }
  };

  /* ===== DEDICATED REGISTER INSTITUTION PAGE ===== */
  if (activeRoute?.mode === 'register') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {instSuccessMessage && (
            <div className="feedback-banner is-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{instSuccessMessage}</span>
            </div>
          )}
          {instErrorMessage && (
            <div className="feedback-banner is-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{instErrorMessage}</span>
            </div>
          )}

          <form onSubmit={handleCreateInstitution} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Institution Details</div>
              <div className="golden-os-fields-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Institution Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Jawaharlal Nehru University"
                    value={newInstName}
                    onChange={e => setNewInstName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Subdomain / Slug *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. jnu"
                    value={newInstSlug}
                    onChange={e => setNewInstSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Primary Color</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={newInstPrimary}
                      onChange={e => setNewInstPrimary(e.target.value)}
                      style={{ width: '40px', height: '38px', border: '1px solid #d9c8aa', borderRadius: '8px', cursor: 'pointer', background: 'transparent', padding: '2px' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={newInstPrimary}
                      onChange={e => setNewInstPrimary(e.target.value)}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Secondary Color</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={newInstSecondary}
                      onChange={e => setNewInstSecondary(e.target.value)}
                      style={{ width: '40px', height: '38px', border: '1px solid #d9c8aa', borderRadius: '8px', cursor: 'pointer', background: 'transparent', padding: '2px' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={newInstSecondary}
                      onChange={e => setNewInstSecondary(e.target.value)}
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Default Administrator</div>
              <div className="golden-os-fields-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Admin Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. JNU Admin"
                    value={newInstAdminName}
                    onChange={e => setNewInstAdminName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Admin Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. admin@jnu.edu"
                    value={newInstAdminEmail}
                    onChange={e => setNewInstAdminEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Admin Password *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter admin password"
                  value={newInstAdminPassword}
                  onChange={e => setNewInstAdminPassword(e.target.value)}
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
                disabled={isAddingInstitution}
                className="golden-os-primary-action"
                style={{ width: 'auto', padding: '10px 22px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700 }}
              >
                <span>{isAddingInstitution ? 'Registering...' : 'Register Institution'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED INSTITUTION DETAIL & EDIT PAGE ===== */
  if (activeRoute?.mode === 'detail') {
    const selectedInst =
      (editingInst && String(editingInst.id) === String(activeRoute.id) ? editingInst : null) ||
      institutionsList.find(inst => String(inst.id) === String(activeRoute.id)) ||
      activeRoute.item;

    if (!selectedInst) {
      return (
        <div className="golden-os-window golden-os-page-bottom-safe" style={{ padding: '24px', textAlign: 'center', color: '#6b5b3e' }}>
          Institution record not found.
        </div>
      );
    }

    const isDefaultInst = selectedInst.id === 1;

    return (
      <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Hero Card */}
          <div className="golden-os-inset-card" style={{ padding: '16px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div
                className="golden-os-avatar"
                style={{
                  width: '46px',
                  height: '46px',
                  background: selectedInst.primary_color || '#765729',
                  color: '#ffffff',
                  borderColor: 'rgba(255,255,255,0.4)',
                }}
              >
                {getInitials(selectedInst.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2b2112', overflowWrap: 'anywhere' }}>
                  {selectedInst.name}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#6b5b3e', fontWeight: 600, marginTop: '2px' }}>
                  Slug: {selectedInst.slug} · ID #{selectedInst.id}
                </div>
              </div>
            </div>

            {isDefaultInst && (
              <span className="golden-os-badge-muted">System Default</span>
            )}
          </div>

          {instSuccessMessage && (
            <div className="feedback-banner is-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{instSuccessMessage}</span>
            </div>
          )}
          {instErrorMessage && (
            <div className="feedback-banner is-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{instErrorMessage}</span>
            </div>
          )}

          <form onSubmit={handleUpdateInstitution} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Institution Settings & Branding</div>
              <div className="golden-os-fields-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Institution Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={selectedInst.name || ''}
                    onChange={e => setEditingInst({ ...selectedInst, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Subdomain Slug *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={selectedInst.slug || ''}
                    disabled={isDefaultInst}
                    onChange={e => setEditingInst({ ...selectedInst, slug: e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase() })}
                    style={{ textTransform: 'lowercase', opacity: isDefaultInst ? 0.65 : 1 }}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Primary Color</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={selectedInst.primary_color || '#765729'}
                      onChange={e => setEditingInst({ ...selectedInst, primary_color: e.target.value })}
                      style={{ width: '40px', height: '38px', border: '1px solid #d9c8aa', borderRadius: '8px', cursor: 'pointer', background: 'transparent', padding: '2px' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={selectedInst.primary_color || '#765729'}
                      onChange={e => setEditingInst({ ...selectedInst, primary_color: e.target.value })}
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                      required
                    />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Secondary Color</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={selectedInst.secondary_color || '#06B6D4'}
                      onChange={e => setEditingInst({ ...selectedInst, secondary_color: e.target.value })}
                      style={{ width: '40px', height: '38px', border: '1px solid #d9c8aa', borderRadius: '8px', cursor: 'pointer', background: 'transparent', padding: '2px' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={selectedInst.secondary_color || '#06B6D4'}
                      onChange={e => setEditingInst({ ...selectedInst, secondary_color: e.target.value })}
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Logo URL (Optional)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={selectedInst.logo_url || ''}
                  onChange={e => setEditingInst({ ...selectedInst, logo_url: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '4px' }}>
              {!isDefaultInst ? (
                <button
                  type="button"
                  disabled={isDeletingInst}
                  onClick={() => handleDeleteInstitution(selectedInst.id, selectedInst.name)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: isDeletingInst ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={15} />
                  <span>{isDeletingInst ? 'Deleting...' : 'Delete Institution'}</span>
                </button>
              ) : (
                <span />
              )}

              <div style={{ display: 'flex', gap: '10px', flex: '1 1 200px', justifyContent: 'flex-end' }}>
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
                  disabled={isUpdatingInst}
                  className="golden-os-primary-action"
                  style={{ width: 'auto', padding: '10px 22px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700 }}
                >
                  <span>{isUpdatingInst ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ===== MAIN GOLDEN GATE INSTITUTION DIRECTORY (Clean 1-Line Rows, Form Hidden) ===== */
  const query = search.trim().toLowerCase();
  const visibleInstitutions = institutionsList.filter(inst =>
    String(inst.name || '').toLowerCase().includes(query) ||
    String(inst.slug || '').toLowerCase().includes(query)
  );

  return (
    <div className="golden-os-window golden-os-page-bottom-safe" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
          <input
            type="search"
            className="form-input"
            aria-label="Search institutions"
            placeholder="Search college or institution..."
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
          <span>Register Institution</span>
        </button>
      </div>

      {visibleInstitutions.length === 0 ? (
        <div className="golden-os-inset-card" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
          <Building2 size={28} style={{ color: '#9c8b6e' }} />
          <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>
            {query ? 'No matching institutions found' : 'No institutions registered yet'}
          </span>
        </div>
      ) : (
        <div className="golden-os-list-shell">
          {visibleInstitutions.map(inst => (
            <button
              key={inst.id}
              type="button"
              className="golden-os-list-row"
              onClick={() => openDetailPage(inst)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div
                  className="golden-os-avatar"
                  style={{
                    background: inst.primary_color || '#765729',
                    color: '#ffffff',
                    borderColor: 'rgba(255,255,255,0.35)',
                  }}
                >
                  {getInitials(inst.name)}
                </div>
                <span style={{ fontSize: '0.94rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {inst.name}
                </span>
              </div>
              <ChevronRight size={16} color="#8c734b" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
