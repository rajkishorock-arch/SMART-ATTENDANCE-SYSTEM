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
    <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <BookOpen size={22} style={{ color: '#ec4899' }} /> Configure College Departments & Branches
          </h3>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
            Manage the academic departments in your college. Changes will immediately update student registration, teacher mapping, and filter dropdowns.
          </p>
        </div>
      </div>

      {/* Form to Add Department */}
      <div className="glass-panel" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>➕ Add New Department</h4>

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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Department Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Computer Science & Engineering"
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Department Code (Optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. CSE"
              value={newDeptCode}
              onChange={e => setNewDeptCode(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleAddDepartment}
          className="bg-gradient-btn"
          style={{ alignSelf: 'flex-start', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem', marginTop: '8px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
          disabled={isSavingDept}
        >
          {isSavingDept ? 'Saving...' : '➕ Save Department'}
        </button>
      </div>

      {/* List of Departments */}
      <div>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '16px' }}>🏫 Active Departments</h4>

        {departmentsList.length === 0 ? (
          <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
            No custom departments configured. Using system default fallbacks:
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
              {departments.map(d => (
                <span key={d} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.8rem', color: '#e2e8f0' }}>{d}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="table-responsive table-container" style={{ width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'rgba(15, 23, 42, 0.3)' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af' }}>Department Name</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af' }}>Code</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 600, color: '#9ca3af', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departmentsList.map(dept => (
                  <tr key={dept.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s ease' }} className="table-row-hover">
                    <td style={{ padding: '16px 20px', color: '#f8fafc', fontSize: '0.9rem', fontWeight: 500 }}>{dept.name}</td>
                    <td style={{ padding: '16px 20px', color: '#a78bfa', fontSize: '0.85rem', fontFamily: 'monospace' }}>{dept.code || 'N/A'}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteDepartment(dept)}
                        className="action-btn"
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.75rem',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444'
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
