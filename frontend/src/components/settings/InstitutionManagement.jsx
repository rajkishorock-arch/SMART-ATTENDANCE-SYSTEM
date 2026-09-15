import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../../utils/platform';
import { getActiveTenantSlug } from '../../utils/tenantConfig';

export default function InstitutionManagement({
  token,
  isDemoMode,
  playCyberSound,
  requestMasterPassword
}) {
  // Multi-Tenant Institution Management States
  const [institutionsList, setInstitutionsList] = useState([]);
  const [newInstName, setNewInstName] = useState('');
  const [newInstSlug, setNewInstSlug] = useState('');
  const [newInstPrimary, setNewInstPrimary] = useState('#4F46E5');
  const [newInstSecondary, setNewInstSecondary] = useState('#06B6D4');
  const [newInstAdminEmail, setNewInstAdminEmail] = useState('');
  const [newInstAdminName, setNewInstAdminName] = useState('');
  const [newInstAdminPassword, setNewInstAdminPassword] = useState('');
  const [isAddingInstitution, setIsAddingInstitution] = useState(false);
  const [instSuccessMessage, setInstSuccessMessage] = useState('');
  const [instErrorMessage, setInstErrorMessage] = useState('');

  // Editing Modal State
  const [editingInst, setEditingInst] = useState(null);
  const [isUpdatingInst, setIsUpdatingInst] = useState(false);

  const fetchInstitutionsList = useCallback(async () => {
    if (isDemoMode) {
      setInstitutionsList([
        { id: 1, name: 'Default Institution', slug: 'default', primary_color: '#4F46E5', secondary_color: '#06B6D4' },
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
    if (getActiveTenantSlug() === 'default') {
      fetchInstitutionsList();
    }
  }, [fetchInstitutionsList]);

  const handleCreateInstitution = async (e) => {
    e.preventDefault();
    setInstSuccessMessage('');
    setInstErrorMessage('');

    const masterPass = await requestMasterPassword(
      '🔐 Master Key Verification Required',
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
        setInstitutionsList([
          ...institutionsList,
          {
            id: newId,
            name: newInstName,
            slug: newInstSlug.toLowerCase(),
            primary_color: newInstPrimary,
            secondary_color: newInstSecondary
          }
        ]);
        setInstSuccessMessage('SIMULATOR ACTION: Institution registered successfully!');
        setIsAddingInstitution(false);
        setNewInstName('');
        setNewInstSlug('');
        setNewInstAdminEmail('');
        setNewInstAdminName('');
        setNewInstAdminPassword('');
      }, 500);
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
        setInstSuccessMessage('Institution created successfully!');
        fetchInstitutionsList();
        setNewInstName('');
        setNewInstSlug('');
        setNewInstAdminEmail('');
        setNewInstAdminName('');
        setNewInstAdminPassword('');
        setTimeout(() => setInstSuccessMessage(''), 4000);
      } else {
        let errMsg = 'Failed to create institution.';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch (jsonErr) {
          console.error('Error parsing create institution error JSON:', jsonErr);
          try {
            const textData = await res.text();
            errMsg = textData || errMsg;
          } catch (textErr) {
            console.error('Error parsing create institution error text:', textErr);
            errMsg = `Error ${res.status}: ${res.statusText}`;
          }
        }
        setInstErrorMessage(errMsg);
      }
    } catch (err) {
      console.error('Error creating institution:', err);
      setInstErrorMessage(`Connection Error: ${err.message || 'Failed to connect to backend server.'}`);
    } finally {
      setIsAddingInstitution(false);
    }
  };

  const handleDeleteInstitution = async (id, name) => {
    if (!window.confirm(`Are you absolutely sure you want to delete "${name}"?\nWarning: This will delete ALL users, students, schedules, and attendance data for this institution. This action CANNOT be undone.`)) {
      return;
    }

    setInstSuccessMessage('');
    setInstErrorMessage('');

    if (isDemoMode) {
      setInstitutionsList(institutionsList.filter(inst => inst.id !== id));
      setInstSuccessMessage('SIMULATOR ACTION: Institution deleted successfully.');
      return;
    }

    const masterPass = await requestMasterPassword(
      '🔐 Master Key Verification Required',
      `Enter Master Password to completely DELETE Institution "${name}":`
    );
    if (!masterPass) {
      setInstErrorMessage('Deletion cancelled. Master key is required.');
      return;
    }

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
        setInstSuccessMessage('Institution deleted successfully.');
        fetchInstitutionsList();
        setTimeout(() => setInstSuccessMessage(''), 4000);
      } else {
        let errMsg = 'Failed to delete institution.';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch (jsonErr) {
          console.error('Error parsing delete institution error JSON:', jsonErr);
          try {
            const textData = await res.text();
            errMsg = textData || errMsg;
          } catch (textErr) {
            console.error('Error parsing delete institution error text:', textErr);
            errMsg = `Error ${res.status}: ${res.statusText}`;
          }
        }
        setInstErrorMessage(errMsg);
      }
    } catch (err) {
      console.error('Error deleting institution:', err);
      setInstErrorMessage(`Connection Error: ${err.message || 'Failed to connect to backend server.'}`);
    }
  };

  const handleUpdateInstitution = async (e) => {
    e.preventDefault();
    if (!editingInst) return;

    setInstSuccessMessage('');
    setInstErrorMessage('');

    if (isDemoMode) {
      setInstitutionsList(prev => prev.map(inst => inst.id === editingInst.id ? editingInst : inst));
      setInstSuccessMessage('SIMULATOR ACTION: Institution updated successfully.');
      setEditingInst(null);
      return;
    }

    const masterPass = await requestMasterPassword(
      '🔐 Master Key Verification Required',
      `Enter Master Password to confirm edits for "${editingInst.name}":`
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
        setInstSuccessMessage('Institution updated successfully.');
        fetchInstitutionsList();
        setEditingInst(null);
        setTimeout(() => setInstSuccessMessage(''), 4000);
      } else {
        let errMsg = 'Failed to update institution.';
        try {
          const errData = await res.json();
          errMsg = errData.detail || errMsg;
        } catch (jsonErr) {
          console.error('Error parsing update institution error JSON:', jsonErr);
          try {
            const textData = await res.text();
            errMsg = textData || errMsg;
          } catch (textErr) {
            console.error('Error parsing update institution error text:', textErr);
            errMsg = `Error ${res.status}: ${res.statusText}`;
          }
        }
        setInstErrorMessage(errMsg);
      }
    } catch (err) {
      console.error('Error updating institution:', err);
      setInstErrorMessage(`Connection Error: ${err.message || 'Failed to connect to backend server.'}`);
    } finally {
      setIsUpdatingInst(false);
    }
  };

  return (
    <>
      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span>🏫</span> Multi-Tenant Institution Registry & Management
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
              Register, monitor, and manage institution domains, custom color palettes, and default admins.
            </p>
          </div>
          <span className="telemetry-stat-pill" style={{
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: 'rgba(0, 242, 254, 0.1)',
            color: '#00f2fe',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            letterSpacing: '0.5px'
          }}>
            TOTAL TENANTS: {institutionsList.length}
          </span>
        </div>

        {instSuccessMessage && (
          <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem' }}>
            ✅ {instSuccessMessage}
          </div>
        )}
        {instErrorMessage && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
            ❌ {instErrorMessage}
          </div>
        )}

        {/* Form to Add New Institution */}
        <form onSubmit={handleCreateInstitution} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            ➕ Register New Institution
          </h4>

          <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Institution Name</label>
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
              <label className="form-label">Unique Subdomain / Slug (lowercase)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. jnu"
                value={newInstSlug}
                onChange={e => setNewInstSlug(e.target.value.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase())}
                required
              />
            </div>
          </div>

          <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Primary Color (Hex)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={newInstPrimary}
                  onChange={e => setNewInstPrimary(e.target.value)}
                  style={{ width: '40px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={newInstPrimary}
                  onChange={e => setNewInstPrimary(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Secondary Color (Hex)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={newInstSecondary}
                  onChange={e => setNewInstSecondary(e.target.value)}
                  style={{ width: '40px', height: '36px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={newInstSecondary}
                  onChange={e => setNewInstSecondary(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
              🔐 Seed Default Administrator Account
            </h5>
            <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>
              Every institution needs a default administrator to access the settings panel. Set their initial details here.
            </p>

            <div className="responsive-form-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginTop: '4px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Admin Name</label>
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
                <label className="form-label">Admin Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. admin@jnu.edu"
                  value={newInstAdminEmail}
                  onChange={e => setNewInstAdminEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Admin Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={newInstAdminPassword}
                  onChange={e => setNewInstAdminPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="bg-gradient-btn"
            style={{ padding: '12px 24px', borderRadius: '8px', fontSize: '0.88rem', alignSelf: 'flex-start', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
            disabled={isAddingInstitution}
          >
            {isAddingInstitution ? 'Registering...' : '🚀 Register Institution & Seed Admin'}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '16px', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>
            🏫 Registered Institution Directory
          </h4>
          <span className="telemetry-stat-pill admin" style={{
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 700,
            background: 'rgba(0, 242, 254, 0.12)',
            color: '#00f2fe',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            letterSpacing: '0.5px'
          }}>
            TOTAL: {institutionsList.length}
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
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>SLUG (SUBDOMAIN)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>PRIMARY COLOR</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>SECONDARY COLOR</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {institutionsList.map((inst) => (
                  <tr key={inst.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>#{inst.id}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#f1f5f9' }}>{inst.name}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', fontSize: '0.78rem', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {inst.slug}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: inst.primary_color || '#4F46E5', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{inst.primary_color || '#4F46E5'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: inst.secondary_color || '#06B6D4', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{inst.secondary_color || '#06B6D4'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      {inst.id === 1 ? (
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', fontStyle: 'italic', paddingRight: '12px' }}>System Default</span>
                      ) : (
                        <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => { if (typeof playCyberSound === 'function') playCyberSound('click'); setEditingInst(inst); }}
                            className="action-btn"
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.75rem',
                              background: 'rgba(0, 242, 254, 0.15)',
                              border: '1px solid rgba(0, 242, 254, 0.3)',
                              color: '#00f2fe',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteInstitution(inst.id, inst.name)}
                            className="action-btn"
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.75rem',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#ef4444',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-view" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          {institutionsList.map((inst) => (
            <div
              key={inst.id}
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
              {/* Name & ID */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1rem' }}>{inst.name}</span>
                <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.78rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                  #{inst.id}
                </span>
              </div>

              {/* Slug */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Subdomain:</span>
                <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', fontSize: '0.8rem', color: '#00f2fe', border: '1px solid rgba(0, 242, 254, 0.2)', fontFamily: 'monospace' }}>
                  {inst.slug}
                </span>
              </div>

              {/* Colors */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Primary:</span>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: inst.primary_color || '#4F46E5', border: '1px solid rgba(255,255,255,0.2)' }} />
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#cbd5e1' }}>{inst.primary_color || '#4F46E5'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Secondary:</span>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: inst.secondary_color || '#06B6D4', border: '1px solid rgba(255,255,255,0.2)' }} />
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#cbd5e1' }}>{inst.secondary_color || '#06B6D4'}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '2px' }}>
                {inst.id === 1 ? (
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', fontStyle: 'italic', display: 'block', textAlign: 'center' }}>
                    🔒 System Default Institution
                  </span>
                ) : (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => { if (typeof playCyberSound === 'function') playCyberSound('click'); setEditingInst(inst); }}
                      className="action-btn"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        background: 'rgba(0, 242, 254, 0.15)',
                        border: '1px solid rgba(0, 242, 254, 0.3)',
                        color: '#00f2fe',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteInstitution(inst.id, inst.name)}
                      className="action-btn"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        fontSize: '0.82rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sleek Institution Editing Modal */}
      {editingInst && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 8, 16, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '500px',
            width: '100%',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            border: '1.5px solid var(--border-color)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)',
            animation: 'fadeInUp 0.3s ease'
          }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏫 Edit Institution Branding
              </h3>
              <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
                Modify colors, name, and access domain for this workspace tenant.
              </p>
            </div>

            <form onSubmit={handleUpdateInstitution} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Institution Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingInst.name}
                  onChange={e => setEditingInst({ ...editingInst, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Subdomain Slug</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingInst.slug}
                  onChange={e => setEditingInst({ ...editingInst, slug: e.target.value })}
                  required
                  style={{ textTransform: 'lowercase' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Primary Color</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="color"
                      value={editingInst.primary_color || '#4F46E5'}
                      onChange={e => setEditingInst({ ...editingInst, primary_color: e.target.value })}
                      style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={editingInst.primary_color || '#4F46E5'}
                      onChange={e => setEditingInst({ ...editingInst, primary_color: e.target.value })}
                      required
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Secondary Color</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="color"
                      value={editingInst.secondary_color || '#06B6D4'}
                      onChange={e => setEditingInst({ ...editingInst, secondary_color: e.target.value })}
                      style={{ width: '40px', height: '40px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'none' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      value={editingInst.secondary_color || '#06B6D4'}
                      onChange={e => setEditingInst({ ...editingInst, secondary_color: e.target.value })}
                      required
                      style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => { if (typeof playCyberSound === 'function') playCyberSound('click'); setEditingInst(null); }}
                  className="btn-secondary"
                  style={{ padding: '10px 20px', borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-btn"
                  style={{ padding: '10px 24px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                  disabled={isUpdatingInst}
                >
                  {isUpdatingInst ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
