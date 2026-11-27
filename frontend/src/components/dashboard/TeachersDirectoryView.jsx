import { useState, useRef } from 'react';
import { Trash2, Plus, Search, ArrowLeft, ChevronRight, AlertCircle, CheckCircle2, BookOpen, Calendar, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import useUI from '../../hooks/useUI';

const getInitials = (name, fallback = 'TR') => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

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
}) {
  const { userRole } = useAuth();
  const { playCyberSound } = useUI();

  const [timetableSubTab, setTimetableSubTab] = useState('directory');
  const [search, setSearch] = useState('');

  // Sub-views stay strictly collapsed until user taps "+ Register ..." or opens a specific row
  const [teacherView, setTeacherView] = useState('list'); // 'list' | 'register' | 'detail'
  const [subjectView, setSubjectView] = useState('list'); // 'list' | 'register' | 'detail'
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  const savedScrollYRef = useRef(0);

  const [deletingTeacherId, setDeletingTeacherId] = useState(null);
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  const query = search.trim().toLowerCase();
  const matches = (...fields) => fields.some(field => String(field ?? '').toLowerCase().includes(query));
  const visibleTeachers = teachers.filter(t => t.role === 'teacher' && matches(t.name, t.email));
  const visibleSubjects = subjects.filter(s => matches(s.name, s.code, s.department, s.teacher_name));

  const snapshotScroll = () => {
    try {
      savedScrollYRef.current = Math.max(window.scrollY || 0, document.documentElement?.scrollTop || 0);
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch { /* ignore */ }
  };

  const restoreScroll = () => {
    const y = savedScrollYRef.current || 0;
    requestAnimationFrame(() => {
      try {
        window.scrollTo({ top: y, behavior: 'auto' });
      } catch { /* ignore */ }
    });
  };

  const openTeacherRegister = () => {
    if (playCyberSound) playCyberSound('click');
    snapshotScroll();
    setEditingTeacher(null);
    setTeacherError('');
    setTeacherSuccess('');
    setTeacherView('register');
  };

  const openTeacherDetail = (teacherObj) => {
    if (playCyberSound) playCyberSound('click');
    snapshotScroll();
    setEditingTeacher({ ...teacherObj, password: '' });
    setTeacherError('');
    setTeacherSuccess('');
    setTeacherView('detail');
  };

  const backToTeacherDirectory = () => {
    if (playCyberSound) playCyberSound('click');
    setTeacherView('list');
    setEditingTeacher(null);
    setTeacherError('');
    restoreScroll();
  };

  const openSubjectRegister = () => {
    if (playCyberSound) playCyberSound('click');
    snapshotScroll();
    setSelectedSubjectDetail(null);
    setSubjectView('register');
  };

  const openSubjectDetail = (subjectObj) => {
    if (playCyberSound) playCyberSound('click');
    snapshotScroll();
    setSelectedSubjectDetail(subjectObj);
    setSubjectView('detail');
  };

  const backToSubjectDirectory = () => {
    if (playCyberSound) playCyberSound('click');
    setSubjectView('list');
    setSelectedSubjectDetail(null);
    restoreScroll();
  };

  const handleDeleteTeacherClick = async (id) => {
    try {
      setDeletingTeacherId(id);
      await handleDeleteTeacher(id);
      setTeacherView('list');
      setEditingTeacher(null);
    } finally {
      setDeletingTeacherId(null);
    }
  };

  const onSubmitTeacher = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingTeacher(true);
      if (teacherView === 'detail' && editingTeacher) {
        await handleUpdateTeacher(e);
      } else {
        await handleAddTeacher(e);
      }
    } finally {
      setIsSubmittingTeacher(false);
    }
  };

  const onSubmitSubject = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingSubject(true);
      await handleAddSubject(e);
    } finally {
      setIsSubmittingSubject(false);
    }
  };

  const onSubmitSchedule = async (e) => {
    e.preventDefault();
    try {
      setIsSubmittingSchedule(true);
      await handleAddSchedule(e);
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  if (userRole !== 'admin') {
    return null;
  }

  const isDetailMode = teacherView === 'detail' && Boolean(editingTeacher);
  const showTeacherFormPage = teacherView === 'register' || isDetailMode;

  return (
    <div className="golden-os-page-bottom-safe" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Clean Golden Gate Tab Switcher */}
      <nav aria-label="Teacher and subject management" className="golden-os-segmented">
        {[
          ['directory', `Teachers (${visibleTeachers.length})`],
          ['subjects', `Subjects (${visibleSubjects.length})`],
          ['planner', 'Timetable'],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={timetableSubTab === id}
            className={`golden-os-segmented-btn ${timetableSubTab === id ? 'active' : ''}`}
            onClick={() => {
              if (playCyberSound) playCyberSound('click');
              setTimetableSubTab(id);
              setSearch('');
              setTeacherView('list');
              setSubjectView('list');
              setShowScheduleForm(false);
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ==================== 1. TEACHERS DIRECTORY / REGISTER / DETAIL ==================== */}
      {timetableSubTab === 'directory' && (
        !showTeacherFormPage ? (
          <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
                <input
                  className="form-input"
                  type="search"
                  aria-label="Search teachers"
                  placeholder="Search teacher by name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: '38px', background: '#ffffff', width: '100%', boxSizing: 'border-box' }}
                />
                <Search size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
              </div>

              <button
                type="button"
                onClick={openTeacherRegister}
                className="golden-os-primary-action"
                style={{ width: 'auto', padding: '10px 16px', borderRadius: '11px', fontSize: '0.84rem', gap: '6px', flexShrink: 0 }}
              >
                <Plus size={16} />
                <span>Register Teacher</span>
              </button>
            </div>

            {teacherError && (
              <div className="feedback-banner is-error">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{teacherError}</span>
              </div>
            )}

            {teacherSuccess && (
              <div className="feedback-banner is-success">
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{teacherSuccess}</span>
              </div>
            )}

            {visibleTeachers.length === 0 ? (
              <div className="golden-os-inset-card" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
                <UserPlus size={28} style={{ color: '#9c8b6e' }} />
                <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>
                  {query ? 'No matching teachers found' : 'No teachers registered yet'}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#6b5b3e' }}>
                  Tap Register Teacher above to add faculty members.
                </span>
              </div>
            ) : (
              <div className="golden-os-list-shell">
                {visibleTeachers.map(t => {
                  const tSubjects = subjects.filter(sub => sub.teacher_id === t.id);
                  const subjectSummary = tSubjects.length > 0
                    ? tSubjects.map(sub => `${sub.code}`).join(', ')
                    : (t.subject_code ? `${t.subject_code}` : 'No subject mapped');

                  return (
                    <button
                      key={t.id}
                      type="button"
                      className="golden-os-list-row"
                      onClick={() => openTeacherDetail(t)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <div className="golden-os-avatar">{getInitials(t.name, 'TR')}</div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.name}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#6b5b3e', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.email} · {subjectSummary}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} color="#8c734b" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Dedicated Register or Edit Teacher Page */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
            <button type="button" className="golden-os-back-bar" onClick={backToTeacherDirectory}>
              <ArrowLeft size={15} />
              <span>Back to Teachers</span>
            </button>

            <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e7dac0', paddingBottom: '14px' }}>
                <div className="golden-os-avatar" style={{ width: '44px', height: '44px' }}>
                  {teacherView === 'detail' && editingTeacher ? getInitials(editingTeacher.name, 'TR') : <UserPlus size={18} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2b2112', overflowWrap: 'anywhere' }}>
                    {teacherView === 'detail' && editingTeacher ? editingTeacher.name : 'Register New Teacher'}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#6b5b3e' }}>
                    {teacherView === 'detail' && editingTeacher
                      ? `${editingTeacher.email} · ID #${editingTeacher.id}`
                      : 'Create a faculty account with assigned subject and branch'}
                  </span>
                </div>
              </div>

              {teacherView === 'detail' && editingTeacher && (() => {
                const mappedSubs = subjects.filter(s => s.teacher_id === editingTeacher.id);
                if (mappedSubs.length === 0) return null;
                return (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {mappedSubs.map(sub => (
                      <span key={sub.id} className="golden-os-badge-muted">
                        {sub.code} · {sub.name}
                      </span>
                    ))}
                  </div>
                );
              })()}

              {teacherError && (
                <div className="feedback-banner is-error">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{teacherError}</span>
                </div>
              )}

              {teacherSuccess && (
                <div className="feedback-banner is-success">
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{teacherSuccess}</span>
                </div>
              )}

              <form onSubmit={onSubmitTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="golden-os-form-section">
                  <div className="golden-os-form-section-title">Faculty Credentials</div>
                  <div className="golden-os-fields-2">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Dr. John Doe"
                        value={teacherView === 'detail' && editingTeacher ? editingTeacher.name : newTeacher.name}
                        onChange={e => {
                          if (teacherView === 'detail' && editingTeacher) {
                            setEditingTeacher({ ...editingTeacher, name: e.target.value });
                          } else {
                            setNewTeacher({ ...newTeacher, name: e.target.value });
                          }
                        }}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Email Address *</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="e.g. teacher@university.com"
                        value={teacherView === 'detail' && editingTeacher ? editingTeacher.email : newTeacher.email}
                        onChange={e => {
                          if (teacherView === 'detail' && editingTeacher) {
                            setEditingTeacher({ ...editingTeacher, email: e.target.value });
                          } else {
                            setNewTeacher({ ...newTeacher, email: e.target.value });
                          }
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">
                      {teacherView === 'detail' ? 'Update Password (Leave blank to keep same)' : 'Password *'}
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      value={teacherView === 'detail' && editingTeacher ? (editingTeacher.password || '') : newTeacher.password}
                      onChange={e => {
                        if (teacherView === 'detail' && editingTeacher) {
                          setEditingTeacher({ ...editingTeacher, password: e.target.value });
                        } else {
                          setNewTeacher({ ...newTeacher, password: e.target.value });
                        }
                      }}
                      required={teacherView !== 'detail'}
                    />
                  </div>
                </div>

                <div className="golden-os-form-section">
                  <div className="golden-os-form-section-title">Primary Subject &amp; Branch Mapping</div>
                  <div className="golden-os-fields-2">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Assigned Subject Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Mathematics"
                        value={teacherView === 'detail' && editingTeacher ? (editingTeacher.subject_name || '') : newTeacher.subject_name}
                        onChange={e => {
                          if (teacherView === 'detail' && editingTeacher) {
                            setEditingTeacher({ ...editingTeacher, subject_name: e.target.value });
                          } else {
                            setNewTeacher({ ...newTeacher, subject_name: e.target.value });
                          }
                        }}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Subject Code *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. MATH-101"
                        value={teacherView === 'detail' && editingTeacher ? (editingTeacher.subject_code || '') : newTeacher.subject_code}
                        onChange={e => {
                          if (teacherView === 'detail' && editingTeacher) {
                            setEditingTeacher({ ...editingTeacher, subject_code: e.target.value });
                          } else {
                            setNewTeacher({ ...newTeacher, subject_code: e.target.value });
                          }
                        }}
                        required
                      />
                    </div>
                  </div>
                  {(() => {
                    const activeDeptVal = teacherView === 'detail' && editingTeacher
                      ? (editingTeacher.subject_department || (departments[0] || 'Computer Science'))
                      : (newTeacher.subject_department || (departments[0] || 'Computer Science'));
                    return (
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Department / Branch</label>
                        <select
                          className="form-input"
                          value={activeDeptVal}
                          onChange={e => {
                            if (teacherView === 'detail' && editingTeacher) {
                              setEditingTeacher({ ...editingTeacher, subject_department: e.target.value });
                            } else {
                              setNewTeacher({ ...newTeacher, subject_department: e.target.value });
                            }
                          }}
                        >
                          {activeDeptVal && !departments.includes(activeDeptVal) && (
                            <option value={activeDeptVal}>{activeDeptVal}</option>
                          )}
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                  {teacherView === 'detail' && editingTeacher ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteTeacherClick(editingTeacher.id)}
                      disabled={deletingTeacherId === editingTeacher.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: deletingTeacherId === editingTeacher.id ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Trash2 size={14} />
                      <span>{deletingTeacherId === editingTeacher.id ? 'Deleting...' : 'Delete Teacher'}</span>
                    </button>
                  ) : <span />}

                  <div style={{ display: 'flex', gap: '10px', flex: '1 1 200px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={backToTeacherDirectory}
                      className="golden-os-feedback-filter-btn"
                      style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingTeacher}
                      className="golden-os-primary-action"
                      style={{
                        width: 'auto',
                        padding: '11px 20px',
                        borderRadius: '10px',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: isSubmittingTeacher ? 'not-allowed' : 'pointer',
                        opacity: isSubmittingTeacher ? 0.75 : 1,
                      }}
                    >
                      <span>
                        {isSubmittingTeacher
                          ? (teacherView === 'detail' ? 'Saving...' : 'Registering...')
                          : (teacherView === 'detail' ? 'Save Changes' : 'Register Teacher')}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )
      )}

      {/* ==================== 2. SUBJECTS DIRECTORY / REGISTER / DETAIL ==================== */}
      {timetableSubTab === 'subjects' && (
        subjectView === 'list' ? (
          <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
                <input
                  type="search"
                  className="form-input"
                  aria-label="Search subjects"
                  placeholder="Search subject, code, branch or teacher..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: '38px', background: '#ffffff', width: '100%', boxSizing: 'border-box' }}
                />
                <Search size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: '#8c7a5b' }} />
              </div>

              <button
                type="button"
                onClick={openSubjectRegister}
                className="golden-os-primary-action"
                style={{ width: 'auto', padding: '10px 16px', borderRadius: '11px', fontSize: '0.84rem', gap: '6px', flexShrink: 0 }}
              >
                <Plus size={16} />
                <span>Register Subject</span>
              </button>
            </div>

            {subjectError && (
              <div className="feedback-banner is-error">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{subjectError}</span>
              </div>
            )}

            {subjectSuccess && (
              <div className="feedback-banner is-success">
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{subjectSuccess}</span>
              </div>
            )}

            {visibleSubjects.length === 0 ? (
              <div className="golden-os-inset-card" style={{ padding: '32px 16px', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
                <BookOpen size={28} style={{ color: '#9c8b6e' }} />
                <span style={{ fontWeight: 700, color: '#2b2112', fontSize: '0.92rem' }}>
                  {query ? 'No matching subjects' : 'No registered subjects yet'}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#6b5b3e' }}>
                  Tap Register Subject to create a course and assign a teacher.
                </span>
              </div>
            ) : (
              <div className="golden-os-list-shell">
                {visibleSubjects.map(subject => {
                  const teacherName = subject.teacher_name || teachers.find(t => t.id === subject.teacher_id)?.name || 'Unassigned';
                  return (
                    <button
                      key={subject.id}
                      type="button"
                      className="golden-os-list-row"
                      onClick={() => openSubjectDetail(subject)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <div className="golden-os-avatar" style={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>
                          {String(subject.code || 'SUB').slice(0, 4).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {subject.name}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#6b5b3e', fontWeight: 600, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {subject.code} · {subject.department} · {teacherName}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} color="#8c734b" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : subjectView === 'register' ? (
          /* Dedicated Register Subject Page */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
            <button type="button" className="golden-os-back-bar" onClick={backToSubjectDirectory}>
              <ArrowLeft size={15} />
              <span>Back to Subjects</span>
            </button>

            <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e7dac0', paddingBottom: '14px' }}>
                <div className="golden-os-avatar">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2b2112' }}>
                    Register New Subject
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#6b5b3e' }}>
                    Define subject details, department branch, and faculty assignment
                  </span>
                </div>
              </div>

              {subjectError && (
                <div className="feedback-banner is-error">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{subjectError}</span>
                </div>
              )}

              {subjectSuccess && (
                <div className="feedback-banner is-success">
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{subjectSuccess}</span>
                </div>
              )}

              <form onSubmit={onSubmitSubject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="golden-os-form-section">
                  <div className="golden-os-form-section-title">Subject Details</div>
                  <div className="golden-os-fields-2">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Subject Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Mathematics"
                        value={newSubject.name}
                        onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Subject Code *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. MATH-101"
                        value={newSubject.code}
                        onChange={e => setNewSubject({ ...newSubject, code: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Department</label>
                      <select
                        className="form-input"
                        value={newSubject.department || ''}
                        onChange={e => setNewSubject({ ...newSubject, department: e.target.value })}
                      >
                        {newSubject.department && !departments.includes(newSubject.department) && (
                          <option value={newSubject.department}>{newSubject.department}</option>
                        )}
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Assigned Teacher</label>
                      <select
                        className="form-input"
                        value={newSubject.teacher_id}
                        onChange={e => setNewSubject({ ...newSubject, teacher_id: e.target.value })}
                      >
                        <option value="">-- Select Teacher --</option>
                        {teachers.filter(t => t.role === 'teacher').map(t => (
                          <option key={t.id} value={t.id.toString()}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={backToSubjectDirectory}
                    className="golden-os-feedback-filter-btn"
                    style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSubject}
                    className="golden-os-primary-action"
                    style={{ width: 'auto', padding: '11px 22px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700 }}
                  >
                    <span>{isSubmittingSubject ? 'Registering...' : 'Register Subject'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Dedicated Subject Detail Page */
          selectedSubjectDetail && (() => {
            const subTeacher = teachers.find(t => t.id === selectedSubjectDetail.teacher_id);
            const subSchedules = schedules.filter(sch => sch.subject_id === selectedSubjectDetail.id);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
                <button type="button" className="golden-os-back-bar" onClick={backToSubjectDirectory}>
                  <ArrowLeft size={15} />
                  <span>Back to Subjects</span>
                </button>

                <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="golden-os-inset-card" style={{ padding: '16px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div className="golden-os-avatar" style={{ fontFamily: 'monospace' }}>
                        {String(selectedSubjectDetail.code || 'SUB').slice(0, 4).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2b2112' }}>
                          {selectedSubjectDetail.name}
                        </h3>
                        <div style={{ fontSize: '0.78rem', color: '#6b5b3e', fontWeight: 600 }}>
                          Code {selectedSubjectDetail.code} · {selectedSubjectDetail.department}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setNewSchedule(prev => ({ ...prev, subject_id: selectedSubjectDetail.id.toString() }));
                        setTimetableSubTab('planner');
                        setShowScheduleForm(true);
                      }}
                      className="golden-os-primary-action"
                      style={{ width: 'auto', padding: '9px 14px', borderRadius: '10px', fontSize: '0.8rem', gap: '6px' }}
                    >
                      <Calendar size={14} />
                      <span>Add Class Schedule</span>
                    </button>
                  </div>

                  <div className="golden-os-form-section">
                    <div className="golden-os-form-section-title">Subject Overview</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.86rem' }}>
                      <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Assigned Faculty</span>
                      <span style={{ color: '#25231f', fontWeight: 700 }}>{selectedSubjectDetail.teacher_name || subTeacher?.name || 'Not assigned'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.86rem' }}>
                      <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Department</span>
                      <span style={{ color: '#25231f', fontWeight: 700 }}>{selectedSubjectDetail.department}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.86rem' }}>
                      <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Subject ID</span>
                      <span style={{ color: '#6e4e1c', fontWeight: 700, fontFamily: 'monospace' }}>#{selectedSubjectDetail.id}</span>
                    </div>
                  </div>

                  <div className="golden-os-form-section">
                    <div className="golden-os-form-section-title">Weekly Timetable Slots ({subSchedules.length})</div>
                    {subSchedules.length === 0 ? (
                      <span style={{ fontSize: '0.82rem', color: '#6b5b3e' }}>No weekly schedule slots assigned yet.</span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {subSchedules.map(sch => (
                          <div key={sch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: '10px', background: '#faf5ea', border: '1px solid #e4d8bd', fontSize: '0.84rem' }}>
                            <span style={{ fontWeight: 700, color: '#2b2112' }}>{sch.day_of_week}</span>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#6e4e1c' }}>{sch.start_time} – {sch.end_time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()
        )
      )}

      {/* ==================== 3. WEEKLY TIMETABLE & SCHEDULE PLANNER ==================== */}
      {timetableSubTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          {showScheduleForm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button type="button" className="golden-os-back-bar" onClick={() => setShowScheduleForm(false)}>
                <ArrowLeft size={15} />
                <span>Back to Weekly Timetable</span>
              </button>

              <div className="golden-os-window" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #e7dac0', paddingBottom: '12px' }}>
                  <Calendar size={18} color="#8b6525" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#2b2112' }}>Create Class Schedule Rule</h3>
                </div>

                {scheduleError && (
                  <div className="feedback-banner is-error">
                    <AlertCircle size={16} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{scheduleError}</span>
                  </div>
                )}
                {scheduleSuccess && (
                  <div className="feedback-banner is-success">
                    <CheckCircle2 size={16} />
                    <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>{scheduleSuccess}</span>
                  </div>
                )}

                <form onSubmit={onSubmitSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="golden-os-form-section">
                    <div className="golden-os-fields-2">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Subject *</label>
                        <select
                          className="form-input"
                          value={newSchedule.subject_id}
                          onChange={e => setNewSchedule({ ...newSchedule, subject_id: e.target.value })}
                          required
                        >
                          <option value="">-- Choose Subject --</option>
                          {subjects.map(s => (
                            <option key={s.id} value={s.id.toString()}>{s.code} - {s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Day of Week</label>
                        <select
                          className="form-input"
                          value={newSchedule.day_of_week}
                          onChange={e => setNewSchedule({ ...newSchedule, day_of_week: e.target.value })}
                        >
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Start Time</label>
                        <input
                          type="time"
                          className="form-input"
                          value={newSchedule.start_time}
                          onChange={e => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">End Time</label>
                        <input
                          type="time"
                          className="form-input"
                          value={newSchedule.end_time}
                          onChange={e => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowScheduleForm(false)}
                      className="golden-os-feedback-filter-btn"
                      style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingSchedule}
                      className="golden-os-primary-action"
                      style={{ width: 'auto', padding: '10px 20px', borderRadius: '10px', fontSize: '0.86rem', fontWeight: 700 }}
                    >
                      <span>{isSubmittingSchedule ? 'Saving Schedule...' : 'Create Schedule'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="golden-os-window" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#2b2112', margin: 0 }}>
                    Weekly Class Schedule
                  </h3>
                  <span style={{ fontSize: '0.76rem', color: '#6b5b3e' }}>
                    Tap any empty period slot or + New Schedule to add classes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScheduleForm(true)}
                  className="golden-os-primary-action"
                  style={{ width: 'auto', padding: '9px 15px', borderRadius: '10px', fontSize: '0.82rem', gap: '6px' }}
                >
                  <Plus size={15} />
                  <span>New Schedule</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                <div style={{ minWidth: '680px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(6, 1fr)', gap: '8px', textAlign: 'center', fontWeight: 800, fontSize: '0.72rem', color: '#6b5b3e' }}>
                    <div>DAY</div>
                    <div>P1<br /><span style={{ fontWeight: 600, fontSize: '0.62rem' }}>09-10 AM</span></div>
                    <div>P2<br /><span style={{ fontWeight: 600, fontSize: '0.62rem' }}>10-11 AM</span></div>
                    <div>P3<br /><span style={{ fontWeight: 600, fontSize: '0.62rem' }}>11-12 PM</span></div>
                    <div>P4<br /><span style={{ fontWeight: 600, fontSize: '0.62rem' }}>12-01 PM</span></div>
                    <div>P5<br /><span style={{ fontWeight: 600, fontSize: '0.62rem' }}>01-02 PM</span></div>
                    <div>P6<br /><span style={{ fontWeight: 600, fontSize: '0.62rem' }}>02-03 PM</span></div>
                  </div>

                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                    <div key={day} style={{ display: 'grid', gridTemplateColumns: '90px repeat(6, 1fr)', gap: '8px', alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#faf5ea', border: '1px solid #e4d8bd', borderRadius: '10px', fontWeight: 700, fontSize: '0.76rem', color: '#2b2112' }}>
                        {day.slice(0, 3).toUpperCase()}
                      </div>
                      {[1, 2, 3, 4, 5, 6].map(pNum => {
                        const periodStartTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
                        const slotSchedules = schedules.filter(sch => {
                          if (sch.day_of_week.toLowerCase() !== day.toLowerCase()) return false;
                          const hour = parseInt(sch.start_time.split(':')[0]);
                          const expectedHour = parseInt(periodStartTimes[pNum - 1].split(':')[0]);
                          return hour === expectedHour;
                        });

                        return (
                          <button
                            key={pNum}
                            type="button"
                            onClick={() => {
                              if (slotSchedules.length === 0) {
                                handleCellClick(day, pNum - 1);
                                setShowScheduleForm(true);
                              }
                            }}
                            style={{
                              minHeight: '72px',
                              background: slotSchedules.length > 0 ? '#faf5ea' : '#ffffff',
                              border: slotSchedules.length > 0 ? '1px solid #d4bc89' : '1px dashed #dcd0b8',
                              borderRadius: '10px',
                              padding: '7px',
                              cursor: slotSchedules.length > 0 ? 'default' : 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'center',
                              textAlign: 'center',
                              fontSize: '0.72rem',
                              gap: '3px',
                            }}
                          >
                            {slotSchedules.length > 0 ? (
                              slotSchedules.map(sch => {
                                const sub = subjects.find(s => s.id === sch.subject_id);
                                const teacher = teachers.find(t => t.id === sub?.teacher_id);
                                return (
                                  <div key={sch.id} style={{ width: '100%' }}>
                                    <div style={{ fontWeight: 800, color: '#6e4e1c' }}>{sub ? sub.code : 'SUB'}</div>
                                    <div style={{ fontSize: '0.64rem', color: '#25231f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {sub ? sub.name : 'Unknown'}
                                    </div>
                                    <div style={{ fontSize: '0.6rem', color: '#6b5b3e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {teacher ? teacher.name : 'Unassigned'}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <span style={{ color: '#9c8b6e', fontSize: '0.65rem', fontWeight: 600 }}>+ Slot</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
