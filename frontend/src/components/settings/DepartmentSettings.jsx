import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/platform';

export default function DepartmentSettings({
  token,
  isDemoMode,
  playCyberSound,
  departments = [],
  departmentsList = [],
  fetchDepartments,
  requestMasterPassword,
  onRequestMasterPassword
}) {
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [deptError, setDeptError] = useState('');
  const [deptSuccess, setDeptSuccess] = useState('');
  const [isSavingDept, setIsSavingDept] = useState(false);

  const getMasterPassword = requestMasterPassword || onRequestMasterPassword;

  const handleAddDepartment = async () => {
    setDeptError('');
    setDeptSuccess('');
    if (!newDeptName.trim()) {
      setDeptError('Department Name is required!');
      return;
    }

    const masterPass = await getMasterPassword(
      '🔐 Master Key Verification Required',
      `Enter Master Password to add department "${newDeptName.trim()}":`
    );
    if (!masterPass) {
      setDeptError('Action cancelled. Master key verification is required.');
      return;
    }

    setIsSavingDept(true);

    if (isDemoMode) {
      setTimeout(() => {
        const name = newDeptName.trim();
        if (departments.map(d => d.toLowerCase()).includes(name.toLowerCase())) {
          setDeptError(`Department "${name}" already exists.`);
          setIsSavingDept(false);
          return;
        }
        setNewDeptName('');
        setNewDeptCode('');
        setDeptSuccess(`SIMULATOR ACTION: Department "${name}" added successfully.`);
        setIsSavingDept(false);
        if (playCyberSound) playCyberSound('success');
        if (fetchDepartments) fetchDepartments(token);
      }, 1000);
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/departments/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass
        },
        body: JSON.stringify({ name: newDeptName.trim(), code: newDeptCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to add department.');
      }
      if (playCyberSound) playCyberSound('success');
      setDeptSuccess(`Department "${data.name}" added successfully!`);
      setNewDeptName('');
      setNewDeptCode('');
      if (fetchDepartments) fetchDepartments(token);
    } catch (err) {
      if (playCyberSound) playCyberSound('error');
      setDeptError(err.message);
    } finally {
      setIsSavingDept(false);
    }
  };

  const handleDeleteDepartment = async (dept) => {
    if (playCyberSound) playCyberSound('click');
    const masterPass = await getMasterPassword(
      '🔐 Master Key Verification Required',
      `Enter Master Password to delete department "${dept.name}":`
    );
    if (!masterPass) return;

    if (isDemoMode) {
      alert('SIMULATOR ACTION: Department deleted successfully.');
      if (playCyberSound) playCyberSound('success');
      if (fetchDepartments) fetchDepartments(token);
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/departments/${dept.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Master-Password': masterPass
        }
      });
      if (res.ok) {
        if (playCyberSound) playCyberSound('success');
        if (fetchDepartments) fetchDepartments(token);
      } else {
        const errData = await res.json();
        alert(errData.detail || 'Failed to delete department.');
      }
    } catch {
      alert('Connection failed.');
    }
  };

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: 'clamp(16px, 4vw, 32px)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}
    >
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <BookOpen size={22} style={{ color: '#ec4899', flexShrink: 0 }} /> Configure College Departments & Branches
          </h3>
          <p style={{ color: 'var(--color-text-secondary, #475569)', fontSize: '0.85rem', marginTop: '6px', margin: 0, lineHeight: 1.5 }}>
            Manage the academic departments in your college. Changes will immediately update student registration, teacher mapping, and filter dropdowns.
          </p>
        </div>
      </div>

      {/* Form to Add Department */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: 'clamp(14px, 3vw, 24px)', 
          background: 'var(--bg-card-subtle, rgba(255,255,255,0.03))', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-main, #0f172a)', margin: 0 }}>➕ Add New Department</h4>

        {deptError && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
            ⚠️ {deptError}
          </div>
        )}
        {deptSuccess && (
          <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem' }}>
            ✅ {deptSuccess}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
          <div className="form-group" style={{ margin: 0, width: '100%' }}>
            <label className="form-label" style={{ fontWeight: 600, color: 'var(--color-text-main, #0f172a)' }}>Department Name</label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="e.g. Computer Science & Engineering"
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0, width: '100%' }}>
            <label className="form-label" style={{ fontWeight: 600, color: 'var(--color-text-main, #0f172a)' }}>Department Code (Optional)</label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="e.g. CSE"
              value={newDeptCode}
              onChange={e => setNewDeptCode(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleAddDepartment}
          className="bg-gradient-btn"
          style={{ 
            alignSelf: 'flex-start', 
            padding: '10px 24px', 
            borderRadius: '8px', 
            fontSize: '0.88rem', 
            fontWeight: 700, 
            marginTop: '8px', 
            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            maxWidth: '100%'
          }}
          disabled={isSavingDept}
        >
          {isSavingDept ? 'Saving...' : '➕ Save Department'}
        </button>
      </div>

      {/* List of Departments */}
      <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-main, #0f172a)', marginBottom: '14px' }}>🏫 Active Departments</h4>

        {departmentsList.length === 0 ? (
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary, #64748b)' }}>
            No custom departments configured. Using system default fallbacks:
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
              {departments.map(d => (
                <span key={d} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--color-text-main, #0f172a)', border: '1px solid var(--border-subtle)' }}>{d}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="table-responsive table-container" style={{ width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxSizing: 'border-box' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '320px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-header, rgba(255,255,255,0.03))', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-secondary, #64748b)' }}>Department Name</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-secondary, #64748b)' }}>Code</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-secondary, #64748b)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departmentsList.map(dept => (
                  <tr key={dept.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s ease' }} className="table-row-hover">
                    <td style={{ padding: '12px 16px', color: 'var(--color-text-main, #0f172a)', fontSize: '0.88rem', fontWeight: 600 }}>{dept.name}</td>
                    <td style={{ padding: '12px 16px', color: '#8b5cf6', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 600 }}>{dept.code || 'N/A'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteDepartment(dept)}
                        className="action-btn"
                        style={{
                          padding: '5px 12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
