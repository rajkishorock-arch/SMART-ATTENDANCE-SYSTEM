import React, { useState } from 'react';
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
      className="btn-primary"
      style={{ 
        padding: '10px 20px', 
        borderRadius: '10px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        fontSize: '0.9rem',
        fontWeight: 600,
        background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
        border: 'none',
        color: '#ffffff',
        boxShadow: '0 2px 10px rgba(30, 64, 175, 0.2)',
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
  serverWarmingUp,
  subjects,
  setNewStudent,
  setShowAddModal,
  isMobileView,
}) {
  const { userRole, currentUser } = useAuth();

  const handleOpenRegisterModal = () => {
    if (serverWarmingUp) return;
    if (userRole === 'teacher' && currentUser?.details) {
      const teacherSubject = subjects?.find(s => s.teacher_id === currentUser.details.id);
      setNewStudent?.(prev => ({
        ...prev,
        teacher: currentUser.details.name || '',
        dep: teacherSubject?.department || prev.dep,
      }));
    }
    setShowAddModal?.(true);
  };

  const [deletingStudentId, setDeletingStudentId] = useState(null);

  const handleDeleteStudentClick = async (id) => {
    try {
      setDeletingStudentId(id);
      await handleDeleteStudent(id);
    } finally {
      setDeletingStudentId(null);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: 'clamp(16px, 3.5vw, 32px)', animation: 'fadeInUp 0.6s ease both', position: 'relative' }}>
      {/* Filters bar & Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
          <input 
            type="text" 
            className="form-input" 
            style={{ paddingLeft: '44px', background: '#ffffff', border: '1px solid var(--border-subtle)', width: '100%', boxSizing: 'border-box' }}
            placeholder="Search by ID, Name or Roll..."
            value={studentSearch}
            onChange={e => setStudentSearch(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        </div>

        {userRole === 'admin' ? (
          <select 
            className="form-input" 
            style={{ width: 'auto', minWidth: '160px', flex: '0 1 auto', background: '#ffffff', border: '1px solid var(--border-subtle)' }}
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
            padding: '10px 18px', 
            background: 'rgba(30, 64, 175, 0.08)', 
            border: '1px solid rgba(30, 64, 175, 0.2)', 
            borderRadius: '10px', 
            color: 'var(--color-primary)',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <BookOpen size={16} />
            <span>Subject: {currentUser?.details?.subject_name || 'My Subject'} ({currentUser?.details?.subject_code || 'N/A'})</span>
          </div>
        ) : null}

        {/* In-View Register Student Button (Visible on mobile & desktop) */}
        {(userRole === 'admin' || userRole === 'teacher') && setShowAddModal && (
          <button 
            type="button"
            onClick={handleOpenRegisterModal}
            className="btn-primary"
            style={{ 
              padding: '10px 18px', 
              borderRadius: '10px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.88rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              border: 'none',
              color: '#ffffff',
              boxShadow: '0 4px 14px rgba(30, 64, 175, 0.25)',
              opacity: serverWarmingUp ? 0.6 : 1,
              cursor: serverWarmingUp ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            disabled={serverWarmingUp}
          >
            <Plus size={18} />
            <span>{serverWarmingUp ? 'Connecting...' : 'Register Student'}</span>
          </button>
        )}
      </div>

      {/* List */}
      {filteredStudents.length === 0 ? (
        <div className="flex-center" style={{ padding: '60px 0', color: 'var(--color-text-muted)', flexDirection: 'column', gap: '16px' }}>
          <BookOpen size={44} style={{ color: '#cbd5e1' }} />
          <span style={{ fontWeight: 500 }}>No registered students found.</span>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
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
                <tr key={student.id}>
                  <td style={{ color: 'var(--color-primary)', fontWeight: 600 }}>#{student.id}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>{student.roll}</td>
                  <td style={{ fontWeight: 500, color: 'var(--color-text-main)' }}>{student.name}</td>
                  <td>
                    <span style={{ color: 'var(--color-purple)', fontWeight: 600 }}>{student.dep}</span>
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
                        style={{ 
                          padding: '7px 12px', 
                          fontSize: '0.82rem',
                          color: '#1d4ed8', 
                          border: '1.5px solid #3b82f6', 
                          background: '#eff6ff',
                          borderRadius: '8px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                        title="Capture Photo"
                      >
                        <Camera size={14} />
                        Capture
                      </button>
                      <button 
                        onClick={() => {
                          setEditingStudent({ ...student, password: '' });
                          setShowEditStudentModal(true);
                        }}
                        style={{ 
                          padding: '7px 12px', 
                          fontSize: '0.82rem',
                          color: '#7c3aed', 
                          border: '1.5px solid #8b5cf6', 
                          background: '#f5f3ff',
                          borderRadius: '8px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                        title="Edit Student"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteStudentClick(student.id)}
                        disabled={deletingStudentId === student.id}
                        style={{ 
                          padding: '7px 14px', 
                          fontSize: '0.82rem', 
                          borderRadius: '8px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: '1.5px solid #ef4444',
                          fontWeight: 700,
                          cursor: deletingStudentId === student.id ? 'not-allowed' : 'pointer',
                          opacity: deletingStudentId === student.id ? 0.7 : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                        title="Delete Student"
                      >
                        <Trash2 size={14} />
                        {deletingStudentId === student.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Floating Action Button (FAB) for fast student registration */}
      {(userRole === 'admin' || userRole === 'teacher') && setShowAddModal && (
        <button
          type="button"
          className="mobile-student-fab"
          onClick={handleOpenRegisterModal}
          disabled={serverWarmingUp}
          aria-label="Register Student"
          title="Register Student"
        >
          <Plus size={22} color="#ffffff" />
          <span className="fab-label">Register Student</span>
        </button>
      )}
    </div>
  );
}
