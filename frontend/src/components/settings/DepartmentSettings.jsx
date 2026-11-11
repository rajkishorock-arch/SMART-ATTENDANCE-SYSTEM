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
      className="surface-card" 
      style={{ 
        padding: 'clamp(16px, 4vw, 32px)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '24px',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}
    >
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <BookOpen size={22} style={{ color: '#ec4899', flexShrink: 0 }} /> Configure College Departments & Branches
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '6px', margin: 0, lineHeight: 1.5 }}>
            Manage the academic departments in your college. Changes will immediately update student registration, teacher mapping, and filter dropdowns.
          </p>
        </div>
      </div>

      {/* Form to Add Department */}
      <div 
        style={{ 
          padding: 'clamp(14px, 3vw, 24px)', 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>➕ Add New Department</h4>

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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <div className="form-group" style={{ margin: 0, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a' }}>Department Name</label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
              placeholder="e.g. Computer Science & Engineering"
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <label className="form-label" style={{ fontWeight: 600, color: '#0f172a' }}>Department Code (Optional)</label>
            <input
              type="text"
              className="form-input"
              style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
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
      <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>🏫 Active Departments</h4>

        {departmentsList.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            No custom departments configured. Using system default fallbacks:
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
              {departments.map(d => (
                <span key={d} style={{ padding: '4px 10px', background: '#ffffff', borderRadius: '6px', fontSize: '0.8rem', color: '#0f172a', border: '1px solid #e2e8f0' }}>{d}</span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', minWidth: 0 }}>
            {departmentsList.map(dept => (
              <div
                key={dept.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  minWidth: 0,
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dept.name}
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '1px 8px', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 700 }}>
                      {dept.code || 'NO CODE'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteDepartment(dept)}
                  className="hover-elevate active-haptic"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
