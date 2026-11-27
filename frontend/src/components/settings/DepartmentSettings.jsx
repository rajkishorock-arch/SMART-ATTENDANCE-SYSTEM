import { useState } from 'react';
import { BookOpen, Plus, Search, ChevronRight, Trash2, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/platform';

const getBranchBadge = (name, code) => {
  const c = String(code || '').trim();
  if (c) return c.slice(0, 4).toUpperCase();
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'BR';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const normToken = (val) => String(val || '').trim().toLowerCase().replace(/[\s()_-]/g, '');

export default function DepartmentSettings({
  token,
  isDemoMode,
  playCyberSound,
  departments = [],
  departmentsList = [],
  students = [],
  subjects = [],
  fetchDepartments,
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
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [deptError, setDeptError] = useState('');
  const [deptSuccess, setDeptSuccess] = useState('');
  const [isSavingDept, setIsSavingDept] = useState(false);
  const [isDeletingDept, setIsDeletingDept] = useState(false);

  const getMasterPassword = requestMasterPassword || onRequestMasterPassword;

  const closeSubView = () => {
    setDeptError('');
    setDeptSuccess('');
    if (onCloseSubView) {
      onCloseSubView();
    } else {
      setActiveRoute(null);
    }
  };

  const openRegisterPage = () => {
    if (playCyberSound) playCyberSound('click');
    setDeptError('');
    setDeptSuccess('');
    setNewDeptName('');
    setNewDeptCode('');
    setActiveRoute({ sub: 'departments', mode: 'register' });
  };

  const openDetailPage = (deptObj) => {
    if (playCyberSound) playCyberSound('click');
    setDeptError('');
    setDeptSuccess('');
    setActiveRoute({ sub: 'departments', mode: 'detail', id: deptObj.id, item: deptObj });
  };

  const matchesDept = (rawVal, deptObj) => {
    const target = normToken(rawVal);
    if (!target || !deptObj) return false;
    return target === normToken(deptObj.name) || (deptObj.code && target === normToken(deptObj.code));
  };

  const handleAddDepartment = async (e) => {
    if (e) e.preventDefault();
    setDeptError('');
    setDeptSuccess('');
    if (!newDeptName.trim()) {
      setDeptError('Department Name is required.');
      return;
    }

    const masterPass = await getMasterPassword(
      'Master Key Verification Required',
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
        setDeptSuccess(`Department "${name}" added successfully.`);
        setIsSavingDept(false);
        if (playCyberSound) playCyberSound('success');
        if (fetchDepartments) fetchDepartments(token);
      }, 300);
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
      setDeptSuccess(`Department "${data.name}" added successfully.`);
      setNewDeptName('');
      setNewDeptCode('');
      if (fetchDepartments) await fetchDepartments(token);
    } catch (err) {
      if (playCyberSound) playCyberSound('error');
      setDeptError(err.message || 'Failed to add department.');
    } finally {
      setIsSavingDept(false);
    }
  };

  const handleDeleteDepartment = async (dept) => {
    if (playCyberSound) playCyberSound('click');
    setDeptError('');
    setDeptSuccess('');
    const masterPass = await getMasterPassword(
      'Master Key Verification Required',
      `Enter Master Password to delete department "${dept.name}":`
    );
    if (!masterPass) return;

    setIsDeletingDept(true);

    if (isDemoMode) {
      if (playCyberSound) playCyberSound('success');
      if (fetchDepartments) await fetchDepartments(token);
      setIsDeletingDept(false);
      closeSubView();
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
        if (fetchDepartments) await fetchDepartments(token);
        closeSubView();
      } else {
        const errData = await res.json().catch(() => ({}));
        setDeptError(errData.detail || 'Failed to delete department.');
      }
    } catch {
      setDeptError('Connection failed while deleting department.');
    } finally {
      setIsDeletingDept(false);
    }
  };

  /* ===== DEDICATED REGISTER DEPARTMENT PAGE ===== */
  if (activeRoute?.mode === 'register') {
    return (
      <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {deptError && (
            <div className="feedback-banner is-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{deptError}</span>
            </div>
          )}
          {deptSuccess && (
            <div className="feedback-banner is-success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{deptSuccess}</span>
            </div>
          )}

          <form onSubmit={handleAddDepartment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Department Details</div>
              <div className="golden-os-fields-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Department Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Computer Science & Engineering"
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                    required
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
                disabled={isSavingDept}
                className="golden-os-primary-action"
                style={{ width: 'auto', padding: '10px 22px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700 }}
              >
                <span>{isSavingDept ? 'Saving...' : 'Save Department'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED DEPARTMENT DETAIL PAGE ===== */
  if (activeRoute?.mode === 'detail') {
    const selectedDept =
      departmentsList.find(d => String(d.id) === String(activeRoute.id)) ||
      activeRoute.item;

    if (!selectedDept) {
      return (
        <div className="golden-os-window golden-os-page-bottom-safe" style={{ padding: '24px', textAlign: 'center', color: '#6b5b3e' }}>
          Department record not found.
        </div>
      );
    }

    const branchStudents = students.filter(s => matchesDept(s.dep, selectedDept));
    const branchSubjects = subjects.filter(sub => matchesDept(sub.department, selectedDept));

    return (
      <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="golden-os-inset-card" style={{ padding: '16px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div className="golden-os-avatar" style={{ width: '46px', height: '46px', fontFamily: 'monospace' }}>
                {getBranchBadge(selectedDept.name, selectedDept.code)}
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2b2112', overflowWrap: 'anywhere' }}>
                  {selectedDept.name}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#6b5b3e', fontWeight: 600, marginTop: '2px' }}>
                  {selectedDept.code ? `Code ${selectedDept.code}` : 'No code'} · ID #{selectedDept.id}
                </div>
              </div>
            </div>
          </div>

          {deptError && (
            <div className="feedback-banner is-error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{deptError}</span>
            </div>
          )}

          <div className="golden-os-form-section">
            <div className="golden-os-form-section-title">Branch Summary</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.86rem' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Department Name</span>
              <span style={{ color: '#25231f', fontWeight: 700 }}>{selectedDept.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.86rem' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Department Code</span>
              <span style={{ color: '#6e4e1c', fontWeight: 700, fontFamily: 'monospace' }}>{selectedDept.code || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.86rem' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Users size={14} /> Enrolled Students
              </span>
              <span style={{ color: '#25231f', fontWeight: 700 }}>{branchStudents.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.86rem' }}>
              <span style={{ color: '#6b5b3e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <BookOpen size={14} /> Mapped Subjects
              </span>
              <span style={{ color: '#25231f', fontWeight: 700 }}>{branchSubjects.length}</span>
            </div>
          </div>

          {branchSubjects.length > 0 && (
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Branch Subjects ({branchSubjects.length})</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {branchSubjects.map(sub => (
                  <span key={sub.id} className="golden-os-badge-muted">
                    {sub.code} · {sub.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={() => handleDeleteDepartment(selectedDept)}
              disabled={isDeletingDept}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: isDeletingDept ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Trash2 size={15} />
              <span>{isDeletingDept ? 'Deleting...' : 'Delete Department'}</span>
            </button>

            <button
              type="button"
              onClick={closeSubView}
              className="golden-os-feedback-filter-btn"
              style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem' }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== MAIN GOLDEN GATE DEPARTMENTS DIRECTORY ===== */
  const query = search.trim().toLowerCase();
  const visibleDepts = departmentsList.filter(d =>
    String(d.name || '').toLowerCase().includes(query) ||
    String(d.code || '').toLowerCase().includes(query)
  );

  return (
    <div className="golden-os-window golden-os-page-bottom-safe" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
          <input
            type="search"
            className="form-input"
            aria-label="Search departments"
            placeholder="Search branch name or code..."
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
          <span>Register Department</span>
        </button>
      </div>

      {visibleDepts.length === 0 ? (
        departmentsList.length === 0 && departments.length > 0 && !query ? (
          <div className="golden-os-inset-card" style={{ padding: '20px 16px', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
            <BookOpen size={26} style={{ color: '#9c8b6e' }} />
            <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.9rem' }}>Using system fallback branches</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {departments.map(d => (
                <span key={d} className="golden-os-badge-muted">{d}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="golden-os-inset-card" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <BookOpen size={28} style={{ color: '#9c8b6e' }} />
            <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>
              {query ? 'No matching departments' : 'No departments configured yet'}
            </span>
          </div>
        )
      ) : (
        <div className="golden-os-list-shell">
          {visibleDepts.map(dept => (
            <button
              key={dept.id}
              type="button"
              className="golden-os-list-row"
              onClick={() => openDetailPage(dept)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div className="golden-os-avatar" style={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>
                  {getBranchBadge(dept.name, dept.code)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dept.name}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6b5b3e', fontWeight: 600, marginTop: '2px' }}>
                    {dept.code ? `Code: ${dept.code}` : `ID #${dept.id}`}
                  </div>
                </div>
              </div>
              <ChevronRight size={16} color="#8c734b" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
