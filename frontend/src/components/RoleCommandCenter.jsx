import LiveCommandCenter from './LiveCommandCenter';

export default function RoleCommandCenter({ stats, scannerLive, userRole, department, teacherSubjects = [] }) {
  const lateCount = stats?.total_late_today ?? 0;

  if (userRole === 'teacher') {
    return (
      <div>
        <div style={{ fontSize: '0.72rem', color: '#00f2fe', fontWeight: 700, marginBottom: 8, letterSpacing: '0.06em' }}>
          TEACHER COMMAND CENTER · {teacherSubjects.length} subjects
        </div>
        <LiveCommandCenter stats={stats} scannerLive={scannerLive} lateCount={lateCount} />
      </div>
    );
  }

  if (userRole === 'admin') {
    return (
      <div>
        <div style={{ fontSize: '0.72rem', color: '#a78bfa', fontWeight: 700, marginBottom: 8, letterSpacing: '0.06em' }}>
          CAMPUS COMMAND CENTER · All departments
        </div>
        <LiveCommandCenter stats={stats} scannerLive={scannerLive} lateCount={lateCount} />
      </div>
    );
  }

  return <LiveCommandCenter stats={stats} scannerLive={scannerLive} lateCount={lateCount} />;
}
