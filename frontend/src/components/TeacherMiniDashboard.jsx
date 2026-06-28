import { BookOpen, Users, CheckCircle2, Clock } from 'lucide-react';

export default function TeacherMiniDashboard({ stats, subjects = [], teacherName }) {
  const mySubjects = subjects.slice(0, 4);
  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h3 style={{ color: '#f8fafc', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BookOpen size={20} color="#00f2fe" /> Teacher Mini Dashboard
      </h3>
      {teacherName && (
        <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: '0 0 16px' }}>Welcome, {teacherName}</p>
      )}
      <div className="teacher-mini-dashboard">
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
          <Users size={20} color="#00f2fe" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>{stats?.total_present_today ?? 0}</div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Present Today</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
          <CheckCircle2 size={20} color="#10b981" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>{stats?.average_attendance_rate ?? 0}%</div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Class Rate</div>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
          <Clock size={20} color="#f59e0b" style={{ marginBottom: '6px' }} />
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>{mySubjects.length}</div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>My Subjects</div>
        </div>
      </div>
      {mySubjects.length > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {mySubjects.map((s) => (
            <span key={s.id} style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', background: 'rgba(0,242,254,0.1)', color: '#00f2fe' }}>
              {s.name || s.subject_name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
