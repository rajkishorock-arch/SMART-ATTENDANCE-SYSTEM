import { useState } from 'react';
import { Search, BookOpen, Trash2, Camera, Plus, ChevronRight, AlertCircle, CheckCircle2, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function StudentsDirectoryHeaderAction({
  serverWarmingUp,
  subjects,
  setNewStudent,
  setShowAddModal,
}) {
  const { userRole, currentUser } = useAuth();

  return (
    <button
      type="button"
      onClick={() => {
        if (serverWarmingUp) return;
        if (userRole === 'teacher' && currentUser?.details) {
          const teacherSubject = subjects.find(s => s.teacher_id === currentUser.details.id);
          setNewStudent(prev => ({
            ...prev,
            teacher: currentUser.details.name || '',
            dep: teacherSubject?.department || prev.dep,
          }));
        }
        setShowAddModal(true);
      }}
      className="btn-primary"
      style={{
        padding: '9px 16px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        fontSize: '0.86rem',
        fontWeight: 700,
        background: 'linear-gradient(135deg, #6e4e1c 0%, #9b732f 100%)',
        border: 'none',
        color: '#ffffff',
        opacity: serverWarmingUp ? 0.6 : 1,
        cursor: serverWarmingUp ? 'not-allowed' : 'pointer'
      }}
      disabled={serverWarmingUp}
    >
      <Plus size={16} />
      {serverWarmingUp ? 'Connecting...' : 'Register Student'}
    </button>
  );
}

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function StudentsDirectoryView({
  studentSearch,
  setStudentSearch,
  studentDeptFilter,
  setStudentDeptFilter,
  departments,
  filteredStudents,
  handleDeleteStudent,
  setCaptureStudent,
  setShowWebcamModal,
  editingStudent,
  setEditingStudent,
  showEditStudentModal,
  setShowEditStudentModal,
  handleUpdateStudent,
  editStudentError,
  setEditStudentError,
  editStudentSuccess,
  setEditStudentSuccess,
  serverWarmingUp,
  subjects,
  newStudent,
  setNewStudent,
  showAddModal,
  setShowAddModal,
  handleAddStudent,
  formError,
  setFormError,
  studentError,
  setStudentError,
  isSubmittingStudent,
  onCloseSubView,
}) {
  const { userRole, currentUser } = useAuth();
  const [deletingStudentId, setDeletingStudentId] = useState(null);

  const handleOpenRegisterPage = () => {
    if (serverWarmingUp) return;
    if (setFormError) setFormError('');
    if (setStudentError) setStudentError('');
    if (userRole === 'teacher' && currentUser?.details) {
      const teacherSubject = subjects?.find(s => s.teacher_id === currentUser.details.id);
      setNewStudent?.(prev => ({
        ...prev,
        teacher: currentUser.details.name || '',
        dep: teacherSubject?.department || prev.dep,
      }));
    }
    setShowEditStudentModal?.(false);
    setEditingStudent?.(null);
    setShowAddModal?.(true);
  };

  const handleOpenStudentDetail = (student) => {
    if (setEditStudentError) setEditStudentError('');
    if (setEditStudentSuccess) setEditStudentSuccess('');
    setShowAddModal?.(false);
    setEditingStudent?.({
      ...student,
      course: student.course || 'B.Tech',
      year: student.year || '2026',
      semester: student.semester || '1st',
      gender: student.gender || 'Male',
      dob: student.dob || '',
      phone: student.phone || '',
      address: student.address || '',
      teacher: student.teacher || '',
      password: '',
    });
    setShowEditStudentModal?.(true);
  };

  const handleCloseSubView = () => {
    setEditStudentError?.('');
    setEditStudentSuccess?.('');
    setFormError?.('');
    setStudentError?.('');
    if (onCloseSubView) {
      onCloseSubView();
      return;
    }
    setShowAddModal?.(false);
    setShowEditStudentModal?.(false);
    setEditingStudent?.(null);
  };

  const handleDeleteStudentClick = async (id) => {
    try {
      setDeletingStudentId(id);
      await handleDeleteStudent(id);
      handleCloseSubView();
    } finally {
      setDeletingStudentId(null);
    }
  };

  /* ===== DEDICATED REGISTER STUDENT PAGE (Golden Gate macOS) ===== */
  if (showAddModal && newStudent) {
    return (
      <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e7dac0', paddingBottom: '14px' }}>
            <div className="golden-os-avatar">
              <UserPlus size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2b2112' }}>
                Register New Student
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#6b5b3e' }}>
                Complete profile details and capture face biometrics in the next step
              </span>
            </div>
          </div>

          {(formError || studentError) && (
            <div className="feedback-banner is-error">
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{formError || studentError}</span>
            </div>
          )}

          <form onSubmit={handleAddStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Identity &amp; Enrollment</div>
              <div className="golden-os-fields-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Student ID *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newStudent.id}
                    onChange={e => setNewStudent({ ...newStudent, id: e.target.value })}
                    placeholder="e.g. 101"
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Roll Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newStudent.roll}
                    onChange={e => setNewStudent({ ...newStudent, roll: e.target.value })}
                    placeholder="e.g. CS2026-001"
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={newStudent.name}
                  onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="e.g. Raj Kumar"
                  required
                />
              </div>
            </div>

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Academic Placement</div>
              <div className="golden-os-fields-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Department</label>
                  <select
                    className="form-input"
                    value={newStudent.dep || ''}
                    onChange={e => setNewStudent({ ...newStudent, dep: e.target.value })}
                  >
                    {newStudent.dep && !departments.includes(newStudent.dep) && (
                      <option value={newStudent.dep}>{newStudent.dep}</option>
                    )}
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Course</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newStudent.course}
                    onChange={e => setNewStudent({ ...newStudent, course: e.target.value })}
                    placeholder="e.g. B.Tech"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Academic Year</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newStudent.year}
                    onChange={e => setNewStudent({ ...newStudent, year: e.target.value })}
                    placeholder="e.g. 2026"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Semester</label>
                  <select
                    className="form-input"
                    value={newStudent.semester}
                    onChange={e => setNewStudent({ ...newStudent, semester: e.target.value })}
                  >
                    {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Personal &amp; Contact Information</div>
              <div className="golden-os-fields-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={newStudent.email}
                    onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                    placeholder="e.g. student@gmail.com"
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newStudent.phone}
                    onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Gender</label>
                  <select
                    className="form-input"
                    value={newStudent.gender}
                    onChange={e => setNewStudent({ ...newStudent, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newStudent.dob}
                    onChange={e => setNewStudent({ ...newStudent, dob: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Assigned Mentor / Teacher</label>
                <input
                  type="text"
                  className="form-input"
                  value={newStudent.teacher}
                  onChange={e => setNewStudent({ ...newStudent, teacher: e.target.value })}
                  placeholder="e.g. Dr. A.K. Sharma"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Residential Address</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={newStudent.address}
                  onChange={e => setNewStudent({ ...newStudent, address: e.target.value })}
                  placeholder="e.g. Hostel Block-A, Campus"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={handleCloseSubView}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '11px 20px', fontSize: '0.86rem', borderRadius: '11px', flex: '1 1 120px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingStudent}
                className="golden-os-primary-action"
                style={{
                  flex: '2 1 180px',
                  padding: '12px 22px',
                  borderRadius: '11px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: isSubmittingStudent ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingStudent ? 0.7 : 1,
                }}
              >
                <span>{isSubmittingStudent ? 'Registering Student...' : 'Register & Capture Face'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ===== DEDICATED STUDENT DETAIL & EDIT PAGE (Golden Gate macOS) ===== */
  if (showEditStudentModal && editingStudent) {
    const hasFace = Boolean(editingStudent.photo && editingStudent.photo !== 'no');

    return (
      <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Hero Student Card */}
          <div className="golden-os-inset-card" style={{ padding: '16px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 200px' }}>
              <div className="golden-os-avatar" style={{ width: '48px', height: '48px', fontSize: '1rem' }}>
                {getInitials(editingStudent.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#2b2112', overflowWrap: 'anywhere' }}>
                  {editingStudent.name}
                </h3>
                <div style={{ fontSize: '0.78rem', color: '#6b5b3e', fontWeight: 600, marginTop: '2px' }}>
                  Roll {editingStudent.roll} · {editingStudent.dep} · ID #{editingStudent.id}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setCaptureStudent(editingStudent);
                setShowWebcamModal(true);
              }}
              className="golden-os-primary-action"
              style={{ width: 'auto', padding: '9px 14px', borderRadius: '10px', fontSize: '0.8rem', gap: '6px' }}
            >
              <Camera size={15} />
              <span>{hasFace ? 'Rescan Face' : 'Capture Face'}</span>
            </button>
          </div>

          {editStudentError && (
            <div className="feedback-banner is-error">
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{editStudentError}</span>
            </div>
          )}

          {editStudentSuccess && (
            <div className="feedback-banner is-success">
              <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{editStudentSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Identity &amp; Academics</div>
              <div className="golden-os-fields-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Student ID</label>
                  <input type="number" className="form-input" value={editingStudent.id} disabled />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Roll Number *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingStudent.roll}
                    onChange={e => setEditingStudent({ ...editingStudent, roll: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingStudent.name}
                  onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  required
                />
              </div>

              <div className="golden-os-fields-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Department</label>
                  <select
                    className="form-input"
                    value={editingStudent.dep || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, dep: e.target.value })}
                  >
                    {editingStudent.dep && !departments.includes(editingStudent.dep) && (
                      <option value={editingStudent.dep}>{editingStudent.dep}</option>
                    )}
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Course</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingStudent.course || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, course: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Year</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingStudent.year || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, year: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Semester</label>
                  <select
                    className="form-input"
                    value={editingStudent.semester || '1st'}
                    onChange={e => setEditingStudent({ ...editingStudent, semester: e.target.value })}
                  >
                    {['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'].map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="golden-os-form-section">
              <div className="golden-os-form-section-title">Contact, Guidance &amp; Credentials</div>
              <div className="golden-os-fields-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={editingStudent.email}
                    onChange={e => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingStudent.phone || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Gender</label>
                  <select
                    className="form-input"
                    value={editingStudent.gender || 'Male'}
                    onChange={e => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 15/08/2005"
                    value={editingStudent.dob || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, dob: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Home Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingStudent.address || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, address: e.target.value })}
                />
              </div>

              <div className="golden-os-fields-2">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Assigned Teacher</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingStudent.teacher || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, teacher: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">New Password (Optional)</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Leave blank to keep current"
                    autoComplete="new-password"
                    value={editingStudent.password || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, password: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Biometric Security Card (Golden Gate macOS) */}
            <div className="golden-os-inset-card" style={{ padding: '14px 16px', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '0.86rem', fontWeight: 800, color: '#2b2112' }}>
                  <ShieldCheck size={16} color="#785927" />
                  <span>Biometric Face Recognition</span>
                </span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '3px 9px',
                  borderRadius: '999px',
                  background: hasFace ? 'rgba(5, 150, 105, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                  color: hasFace ? '#047857' : '#b45309',
                  border: `1px solid ${hasFace ? 'rgba(5, 150, 105, 0.28)' : 'rgba(217, 119, 6, 0.28)'}`,
                }}>
                  {hasFace ? 'FACE ENROLLED' : 'NOT ENROLLED'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCaptureStudent(editingStudent);
                  setShowWebcamModal(true);
                }}
                className="golden-os-feedback-filter-btn"
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  width: '100%',
                  background: '#faf5ea',
                  borderColor: '#c49a45',
                  color: '#6e4e1c',
                }}
              >
                <Camera size={15} />
                <span>{hasFace ? 'Scan & Update Face Photo' : 'Scan & Enroll Face Photo'}</span>
              </button>
            </div>

            {/* Actions Footer */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={() => handleDeleteStudentClick(editingStudent.id)}
                disabled={deletingStudentId === editingStudent.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  border: '1px solid #fecaca',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: deletingStudentId === editingStudent.id ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={14} />
                <span>{deletingStudentId === editingStudent.id ? 'Deleting...' : 'Delete Student'}</span>
              </button>

              <div style={{ display: 'flex', gap: '10px', flex: '1 1 200px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseSubView}
                  className="golden-os-feedback-filter-btn"
                  style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="golden-os-primary-action"
                  style={{ width: 'auto', padding: '10px 22px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700 }}
                >
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /* ===== MAIN GOLDEN GATE STUDENT DIRECTORY VIEW ===== */
  return (
    <div className="golden-os-window golden-os-page-bottom-safe" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
      {/* Filters & Register Action */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px', background: '#ffffff', width: '100%', boxSizing: 'border-box' }}
            placeholder="Search student by name, roll, or ID..."
            value={studentSearch}
            onChange={e => setStudentSearch(e.target.value)}
          />
          <Search size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
        </div>

        {userRole === 'admin' ? (
          <select
            className="form-input"
            style={{ width: 'auto', minWidth: '145px', flex: '0 1 auto', background: '#ffffff' }}
            value={studentDeptFilter}
            onChange={e => setStudentDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        ) : userRole === 'teacher' ? (
          <span className="golden-os-badge-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', fontSize: '0.76rem' }}>
            <BookOpen size={14} />
            <span>{currentUser?.details?.subject_name || 'My Subject'}</span>
          </span>
        ) : null}

        {(userRole === 'admin' || userRole === 'teacher') && setShowAddModal && (
          <button
            type="button"
            onClick={handleOpenRegisterPage}
            disabled={serverWarmingUp}
            className="golden-os-primary-action"
            style={{
              width: 'auto',
              padding: '10px 16px',
              borderRadius: '11px',
              fontSize: '0.84rem',
              gap: '6px',
              opacity: serverWarmingUp ? 0.6 : 1,
              cursor: serverWarmingUp ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            <Plus size={16} />
            <span>{serverWarmingUp ? 'Connecting...' : 'Register Student'}</span>
          </button>
        )}
      </div>

      {/* Clean Scannable Student Rows */}
      {filteredStudents.length === 0 ? (
        <div className="golden-os-inset-card" style={{ padding: '36px 16px', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
          <BookOpen size={30} style={{ color: '#9c8b6e' }} />
          <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>No registered students found</span>
          <span style={{ fontSize: '0.78rem', color: '#6b5b3e' }}>Tap Register Student to enroll a new student profile.</span>
        </div>
      ) : (
        <div className="golden-os-list-shell">
          {filteredStudents.map(student => {
            const hasFace = Boolean(student.photo && student.photo !== 'no');
            return (
              <button
                key={student.id}
                type="button"
                className="golden-os-list-row"
                onClick={() => handleOpenStudentDetail(student)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div className="golden-os-avatar">{getInitials(student.name)}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {student.name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#6b5b3e', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Roll {student.roll} · {student.dep || 'Unassigned'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '999px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    background: hasFace ? 'rgba(5, 150, 105, 0.1)' : '#f5ecda',
                    color: hasFace ? '#047857' : '#785927',
                    border: `1px solid ${hasFace ? 'rgba(5, 150, 105, 0.25)' : '#dec99c'}`,
                  }}>
                    {hasFace ? 'Face Ready' : 'No Face'}
                  </span>
                  <ChevronRight size={16} color="#8c734b" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
