import { Search, BookOpen, Trash2, Camera, Edit, Plus } from 'lucide-react';
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
      onClick={() => {
        if (serverWarmingUp) return;
        // Auto-fill teacher name and department when teacher opens this form
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
      className="bg-gradient-btn"
      style={{ 
        padding: '10px 18px', 
        borderRadius: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        fontSize: '0.9rem',
        opacity: serverWarmingUp ? 0.6 : 1,
        cursor: serverWarmingUp ? 'not-allowed' : 'pointer'
      }}
      disabled={serverWarmingUp}
    >
      <Plus size={18} />
      {serverWarmingUp ? 'Connecting...' : 'Register Student'}
    </button>
  );
}

export default function StudentsDirectoryView({
  studentSearch,
  setStudentSearch,
  studentDeptFilter,
  setStudentDeptFilter,
  departments,
  filteredStudents,
  selectedStudentIds,
  setSelectedStudentIds,
  handleBulkDeleteStudents,
  handleDeleteStudent,
  setCaptureStudent,
  setShowWebcamModal,
  setEditingStudent,
  setShowEditStudentModal,
}) {
  const { userRole, currentUser } = useAuth();

  return (
    <div className="glass-panel" style={{ padding: '32px', animation: 'fadeInUp 0.6s ease both' }}>
      {/* Filters bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '44px', background: 'rgba(8, 12, 20, 0.4)' }}
            placeholder="Search by ID, Name or Roll..."
            value={studentSearch}
            onChange={e => setStudentSearch(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        </div>

        {userRole === 'admin' ? (
          <select 
            className="form-input" 
            style={{ width: '220px', background: 'rgba(8, 12, 20, 0.4)' }}
            value={studentDeptFilter}
            onChange={e => setStudentDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        ) : userRole === 'teacher' ? (
          <div style={{ 
            padding: '12px 20px', 
            background: 'rgba(0, 242, 254, 0.08)', 
            border: '1px solid rgba(0, 242, 254, 0.2)', 
            borderRadius: '12px', 
            color: '#00f2fe',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 15px rgba(0, 242, 254, 0.05)'
          }}>
            <BookOpen size={16} />
            <span>Subject: {currentUser?.details?.subject_name || 'My Subject'} ({currentUser?.details?.subject_code || 'N/A'})</span>
          </div>
        ) : null}
      </div>

      {/* Bulk Action Bar */}
      {selectedStudentIds.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
          background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px', marginBottom: '16px', animation: 'fadeInUp 0.3s ease'
        }}>
          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>
            {selectedStudentIds.size} student{selectedStudentIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelectedStudentIds(new Set())}
            style={{
              padding: '5px 12px', fontSize: '0.75rem', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
              borderRadius: '6px', cursor: 'pointer'
            }}
          >Clear</button>
          <button
            onClick={handleBulkDeleteStudents}
            style={{
              padding: '5px 14px', fontSize: '0.75rem', background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444',
              borderRadius: '6px', cursor: 'pointer', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Trash2 size={12} /> Delete Selected
          </button>
        </div>
      )}

      {/* List */}
      {filteredStudents.length === 0 ? (
        <div className="flex-center" style={{ padding: '60px 0', color: 'var(--color-text-muted)', flexDirection: 'column', gap: '16px' }}>
          <BookOpen size={44} style={{ color: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontWeight: 500 }}>No registered students found.</span>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id))}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
                      } else {
                        setSelectedStudentIds(new Set());
                      }
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#00f2fe' }}
                  />
                </th>
                <th style={{ width: '80px' }}>ID</th>
                <th>Roll Number</th>
                <th>Name</th>
                <th>Department</th>
                <th>Course</th>
                <th>Year / Sem</th>
                <th>Phone</th>
                <th style={{ textAlign: 'center', width: '280px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id} style={{ background: selectedStudentIds.has(student.id) ? 'rgba(0,242,254,0.03)' : undefined }}>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.has(student.id)}
                      onChange={e => {
                        const next = new Set(selectedStudentIds);
                        if (e.target.checked) next.add(student.id); else next.delete(student.id);
                        setSelectedStudentIds(next);
                      }}
                      style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#00f2fe' }}
                    />
                  </td>
                  <td style={{ color: '#00f2fe', fontWeight: 600 }}>#{student.id}</td>
                  <td style={{ fontWeight: 700, color: '#fff' }}>{student.roll}</td>
                  <td style={{ fontWeight: 500 }}>{student.name}</td>
                  <td>
                    <span style={{ color: 'var(--color-purple)', fontWeight: 500 }}>{student.dep}</span>
                  </td>
                  <td>{student.course}</td>
                  <td>{student.year} ({student.semester})</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{student.phone || 'N/A'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      <button 
                        onClick={() => {
                          setCaptureStudent(student);
                          setShowWebcamModal(true);
                        }}
                        className="btn-secondary"
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: '0.85rem',
                          color: '#00f2fe', 
                          borderColor: 'rgba(0,242,254,0.3)', 
                          background: 'rgba(0,242,254,0.05)' 
                        }}
                      >
                        <Camera size={13} />
                        Capture
                      </button>
                      <button 
                        onClick={() => {
                          setEditingStudent({ ...student, password: '' });
                          setShowEditStudentModal(true);
                        }}
                        className="btn-secondary"
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: '0.85rem',
                          color: '#a78bfa', 
                          borderColor: 'rgba(167,139,250,0.3)', 
                          background: 'rgba(167,139,250,0.05)' 
                        }}
                      >
                        <Edit size={13} />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteStudent(student.id)}
                        className="btn-danger"
                        style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
