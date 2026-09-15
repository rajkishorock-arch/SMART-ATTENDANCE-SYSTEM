import { useState } from 'react';
import { Trash2, Edit } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';

export default function TeachersDirectoryView({
  editingTeacher,
  setEditingTeacher,
  teacherError,
  setTeacherError,
  teacherSuccess,
  setTeacherSuccess,
  newTeacher,
  setNewTeacher,
  handleUpdateTeacher,
  handleAddTeacher,
  departments,
  selectedTeacherIds,
  setSelectedTeacherIds,
  handleBulkDeleteTeachers,
  teachers,
  subjects,
  schedules,
  handleCellClick,
  subjectError,
  subjectSuccess,
  handleAddSubject,
  newSubject,
  setNewSubject,
  scheduleError,
  scheduleSuccess,
  handleAddSchedule,
  newSchedule,
  setNewSchedule,
  handleDeleteTeacher,
  isMobileView,
}) {
  const { userRole } = useAuth();
  const { playCyberSound } = useUI();
  const [timetableSubTab, setTimetableSubTab] = useState('directory');

  if (userRole !== 'admin') {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.6s ease both', width: '100%' }}>
      {/* Sub-tab navigation */}
      <div className="glass-panel" style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            onClick={() => { setTimetableSubTab('directory'); playCyberSound('click'); }}
            className={`btn-secondary ${timetableSubTab === 'directory' ? 'active' : ''}`}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '8px', 
              fontSize: '0.9rem',
              border: timetableSubTab === 'directory' ? '1px solid var(--border-color-glow)' : '1px solid var(--border-color)',
              color: timetableSubTab === 'directory' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              background: timetableSubTab === 'directory' ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255, 255, 255, 0.02)'
            }}
          >
            🏫 Teacher Directory
          </button>
          <button 
            onClick={() => { setTimetableSubTab('planner'); playCyberSound('click'); }}
            className={`btn-secondary ${timetableSubTab === 'planner' ? 'active' : ''}`}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '8px', 
              fontSize: '0.9rem',
              border: timetableSubTab === 'planner' ? '1px solid var(--border-color-glow)' : '1px solid var(--border-color)',
              color: timetableSubTab === 'planner' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              background: timetableSubTab === 'planner' ? 'rgba(0, 242, 254, 0.08)' : 'rgba(255, 255, 255, 0.02)'
            }}
          >
            📅 Weekly Timetable Planner
          </button>
        </div>
      </div>

      {timetableSubTab === 'directory' ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1.2fr 1.8fr', gap: isMobileView ? '20px' : '32px', width: '100%', minWidth: 0, maxWidth: '100%' }}>
          {/* Form for manual registration / edit */}
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', fontFamily: 'Outfit, sans-serif', margin: 0 }}>
                  {editingTeacher ? 'Edit Teacher Details' : 'Register New Teacher'}
                </h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
                  {editingTeacher ? 'Update credentials and info' : 'Manually register a teaching staff account'}
                </p>
              </div>
              {editingTeacher && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTeacher(null);
                    setTeacherError('');
                    setTeacherSuccess('');
                  }}
                  className="btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.78rem', borderRadius: '8px', color: '#38bdf8', borderColor: 'rgba(14, 165, 233, 0.3)' }}
                >
                  + New Registration
                </button>
              )}
            </div>

            {teacherError && (
              <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#ef4444', fontSize: '0.85rem', marginBottom: '20px' }}>
                {teacherError}
              </div>
            )}

            {teacherSuccess && (
              <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', color: '#10b981', fontSize: '0.85rem', marginBottom: '20px' }}>
                {teacherSuccess}
              </div>
            )}

            <form onSubmit={editingTeacher ? handleUpdateTeacher : handleAddTeacher}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Dr. John Doe"
                  value={editingTeacher ? editingTeacher.name : newTeacher.name}
                  onChange={e => {
                    if (editingTeacher) {
                      setEditingTeacher({ ...editingTeacher, name: e.target.value });
                    } else {
                      setNewTeacher({ ...newTeacher, name: e.target.value });
                    }
                  }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="e.g. teacher@university.com"
                  value={editingTeacher ? editingTeacher.email : newTeacher.email}
                  onChange={e => {
                    if (editingTeacher) {
                      setEditingTeacher({ ...editingTeacher, email: e.target.value });
                    } else {
                      setNewTeacher({ ...newTeacher, email: e.target.value });
                    }
                  }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">
                  {editingTeacher ? 'Update Password (Leave blank to keep same)' : 'Password'}
                </label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={editingTeacher ? (editingTeacher.password || '') : newTeacher.password}
                  onChange={e => {
                    if (editingTeacher) {
                      setEditingTeacher({ ...editingTeacher, password: e.target.value });
                    } else {
                      setNewTeacher({ ...newTeacher, password: e.target.value });
                    }
                  }}
                  required={!editingTeacher}
                />
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Assigned Subject Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Mathematics"
                  value={editingTeacher ? (editingTeacher.subject_name || '') : newTeacher.subject_name}
                  onChange={e => {
                    if (editingTeacher) {
                      setEditingTeacher({ ...editingTeacher, subject_name: e.target.value });
                    } else {
                      setNewTeacher({ ...newTeacher, subject_name: e.target.value });
                    }
                  }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Subject Code</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. MATH-101"
                  value={editingTeacher ? (editingTeacher.subject_code || '') : newTeacher.subject_code}
                  onChange={e => {
                    if (editingTeacher) {
                      setEditingTeacher({ ...editingTeacher, subject_code: e.target.value });
                    } else {
                      setNewTeacher({ ...newTeacher, subject_code: e.target.value });
                    }
                  }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginTop: '16px', marginBottom: '32px' }}>
                <label className="form-label">Department / Branch</label>
                <select 
                  className="form-input"
                  value={editingTeacher ? (editingTeacher.subject_department || 'CSE(IOT)') : newTeacher.subject_department}
                  onChange={e => {
                    if (editingTeacher) {
                      setEditingTeacher({ ...editingTeacher, subject_department: e.target.value });
                    } else {
                      setNewTeacher({ ...newTeacher, subject_department: e.target.value });
                    }
                  }}
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {editingTeacher && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingTeacher(null);
                      setTeacherError('');
                      setTeacherSuccess('');
                    }} 
                    className="btn-secondary"
                    style={{ padding: '10px 20px', borderRadius: '12px' }}
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="submit" 
                  className="bg-gradient-btn" 
                  style={{ padding: '10px 24px', borderRadius: '12px' }}
                >
                  {editingTeacher ? 'Save Changes' : 'Register Teacher'}
                </button>
              </div>
            </form>
          </div>

          {/* Teacher Directory Table */}
          <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0, width: '100%', maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', fontFamily: 'Outfit, sans-serif', margin: 0 }}>Teaching Staff Directory</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>Listing all registered teachers, mapped subjects, and timetable schedules</p>
              </div>
              {editingTeacher && (
                <button
                  onClick={() => {
                    setEditingTeacher(null);
                    setTeacherError('');
                    setTeacherSuccess('');
                  }}
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.78rem', minHeight: '34px' }}
                >
                  + Add New Teacher
                </button>
              )}
            </div>

            {/* Bulk Action Bar */}
            {selectedTeacherIds.size > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px',
                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px', marginBottom: '16px', animation: 'fadeInUp 0.3s ease'
              }}>
                <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>
                  {selectedTeacherIds.size} teacher{selectedTeacherIds.size > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedTeacherIds(new Set())}
                  style={{
                    padding: '5px 12px', fontSize: '0.75rem', background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8',
                    borderRadius: '6px', cursor: 'pointer'
                  }}
                >Clear</button>
                <button
                  onClick={handleBulkDeleteTeachers}
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

            <div className="table-container" style={{ maxHeight: '550px', overflowY: 'auto', overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={teachers.filter(t => t.role === 'teacher').length > 0 && teachers.filter(t => t.role === 'teacher').every(t => selectedTeacherIds.has(t.id))}
                        onChange={e => {
                          const filteredTeachers = teachers.filter(t => t.role === 'teacher');
                          if (e.target.checked) {
                            setSelectedTeacherIds(new Set(filteredTeachers.map(t => t.id)));
                          } else {
                            setSelectedTeacherIds(new Set());
                          }
                        }}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#00f2fe' }}
                      />
                    </th>
                    <th style={{ width: '60px' }}>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Subject Mapping</th>
                    <th style={{ textAlign: 'center', width: '180px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.filter(t => t.role === 'teacher').length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>No teachers registered.</td>
                    </tr>
                  ) : (
                    teachers.filter(t => t.role === 'teacher').map(t => {
                      const tSubjects = subjects.filter(sub => sub.teacher_id === t.id);
                      
                      return (
                        <tr key={t.id} style={{ background: selectedTeacherIds.has(t.id) ? 'rgba(0,242,254,0.03)' : undefined }}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={selectedTeacherIds.has(t.id)}
                              onChange={e => {
                                const next = new Set(selectedTeacherIds);
                                if (e.target.checked) next.add(t.id); else next.delete(t.id);
                                setSelectedTeacherIds(next);
                              }}
                              style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#00f2fe' }}
                            />
                          </td>
                          <td style={{ color: '#00f2fe', fontWeight: 600 }}>#{t.id}</td>
                          <td style={{ fontWeight: 700, color: '#fff' }}>{t.name}</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{t.email}</td>
                          <td>
                            {tSubjects.length === 0 ? (
                              <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>None</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {tSubjects.map(sub => (
                                  <span key={sub.id} style={{ fontSize: '0.8rem', color: '#00f2fe', fontWeight: 600 }}>
                                    {sub.code} ({sub.name})
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => {
                                  setEditingTeacher({ ...t, password: '' });
                                  setTeacherError('');
                                  setTeacherSuccess('');
                                }}
                                className="btn-secondary"
                                style={{ 
                                  padding: '6px 12px', 
                                  fontSize: '0.8rem', 
                                  color: '#a78bfa', 
                                  borderColor: 'rgba(167,139,250,0.3)', 
                                  background: 'rgba(167,139,250,0.05)' 
                                }}
                              >
                                <Edit size={12} />
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteTeacher(t.id)}
                                className="btn-danger"
                                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              >
                                <Trash2 size={12} />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Planner Sub-tab View */
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '32px', width: '100%' }}>
          {/* Left: Timetable Grid */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px', fontFamily: 'Outfit, sans-serif' }}>
              Weekly Class Schedule Grid
            </h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Click on any empty cell to pre-populate day and period details for creating a schedule rule.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
              <div style={{ minWidth: '720px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Grid Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(6, 1fr)', gap: '10px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <div>DAY</div>
                  <div>P1<br/><span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>09-10 AM</span></div>
                  <div>P2<br/><span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>10-11 AM</span></div>
                  <div>P3<br/><span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>11-12 PM</span></div>
                  <div>P4<br/><span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>12-01 PM</span></div>
                  <div>P5<br/><span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>01-02 PM</span></div>
                  <div>P6<br/><span style={{ fontSize: '0.6rem', fontWeight: 'normal' }}>02-03 PM</span></div>
                </div>

                {/* Grid Rows */}
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                  <div key={day} style={{ display: 'grid', gridTemplateColumns: '100px repeat(6, 1fr)', gap: '10px', alignItems: 'stretch' }}>
                    {/* Day Name */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', color: '#fff' }}>
                      {day.toUpperCase()}
                    </div>

                    {/* Periods 1-6 */}
                    {[1, 2, 3, 4, 5, 6].map(pNum => {
                      const periodStartTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
                      
                      // Find schedules in this slot
                      const slotSchedules = schedules.filter(sch => {
                        if (sch.day_of_week.toLowerCase() !== day.toLowerCase()) return false;
                        const hour = parseInt(sch.start_time.split(':')[0]);
                        const expectedHour = parseInt(periodStartTimes[pNum - 1].split(':')[0]);
                        return hour === expectedHour;
                      });

                      return (
                        <div 
                          key={pNum} 
                          onClick={() => {
                            if (slotSchedules.length === 0) {
                              handleCellClick(day, pNum - 1);
                            }
                          }}
                          style={{ 
                            minHeight: '80px', 
                            background: slotSchedules.length > 0 ? 'rgba(0, 242, 254, 0.05)' : 'rgba(255,255,255,0.01)', 
                            border: slotSchedules.length > 0 ? '1px solid rgba(0, 242, 254, 0.2)' : '1px solid rgba(255,255,255,0.03)', 
                            borderRadius: '8px', 
                            padding: '8px', 
                            cursor: slotSchedules.length > 0 ? 'default' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center',
                            fontSize: '0.75rem',
                            gap: '4px',
                            transition: 'var(--transition)'
                          }}
                          onMouseEnter={e => {
                            if (slotSchedules.length === 0) {
                              e.currentTarget.style.background = 'rgba(0, 242, 254, 0.08)';
                              e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.3)';
                            }
                          }}
                          onMouseLeave={e => {
                            if (slotSchedules.length === 0) {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)';
                            }
                          }}
                        >
                          {slotSchedules.length > 0 ? (
                            slotSchedules.map(sch => {
                              const sub = subjects.find(s => s.id === sch.subject_id);
                              const teacher = teachers.find(t => t.id === sub?.teacher_id);
                              return (
                                <div key={sch.id} style={{ width: '100%' }}>
                                  <div style={{ fontWeight: 'bold', color: '#00f2fe' }}>{sub ? sub.code : 'SUB'}</div>
                                  <div style={{ fontSize: '0.65rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sub ? sub.name : 'Unknown'}>
                                    {sub ? sub.name : 'Unknown'}
                                  </div>
                                  <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    👤 {teacher ? teacher.name : 'Unassigned'}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.65rem' }}>+ Empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Creators */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Register Subject Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏫 Register Subject
              </h3>
              {subjectError && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>{subjectError}</div>}
              {subjectSuccess && <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>{subjectSuccess}</div>}
              
              <form onSubmit={handleAddSubject} style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Subject Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Mathematics" 
                      value={newSubject.name} 
                      onChange={e => setNewSubject({...newSubject, name: e.target.value})} 
                      style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Subject Code</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. MATH-101" 
                      value={newSubject.code} 
                      onChange={e => setNewSubject({...newSubject, code: e.target.value})} 
                      style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Department</label>
                  <select 
                    className="form-input" 
                    value={newSubject.department} 
                    onChange={e => setNewSubject({...newSubject, department: e.target.value})}
                    style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                  >
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Teacher Mapping</label>
                  <select 
                    className="form-input" 
                    value={newSubject.teacher_id} 
                    onChange={e => setNewSubject({...newSubject, teacher_id: e.target.value})}
                    style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachers.filter(t => t.role === 'teacher').map(t => (
                      <option key={t.id} value={t.id.toString()}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="bg-gradient-btn" style={{ padding: '10px', borderRadius: '6px', fontSize: '0.8rem', marginTop: '4px', width: '100%' }}>
                  Register Subject
                </button>
              </form>
            </div>

            {/* Create Schedule Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📅 Create Schedule Rule
              </h3>
              {scheduleError && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>{scheduleError}</div>}
              {scheduleSuccess && <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '12px' }}>{scheduleSuccess}</div>}
              
              <form onSubmit={handleAddSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem', textAlign: 'left' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Select Subject</label>
                  <select 
                    className="form-input" 
                    value={newSchedule.subject_id} 
                    onChange={e => setNewSchedule({...newSchedule, subject_id: e.target.value})}
                    style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id.toString()}>{s.code} - {s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Day of Week</label>
                  <select 
                    className="form-input" 
                    value={newSchedule.day_of_week} 
                    onChange={e => setNewSchedule({...newSchedule, day_of_week: e.target.value})}
                    style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Start Time</label>
                    <input 
                      type="time" 
                      className="form-input" 
                      value={newSchedule.start_time} 
                      onChange={e => setNewSchedule({...newSchedule, start_time: e.target.value})} 
                      style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>End Time</label>
                    <input 
                      type="time" 
                      className="form-input" 
                      value={newSchedule.end_time} 
                      onChange={e => setNewSchedule({...newSchedule, end_time: e.target.value})} 
                      style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                      required 
                    />
                  </div>
                </div>
                <button type="submit" className="bg-gradient-btn" style={{ padding: '10px', borderRadius: '6px', fontSize: '0.8rem', marginTop: '4px', width: '100%' }}>
                  Create Schedule
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
