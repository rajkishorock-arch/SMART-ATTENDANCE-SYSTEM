export default function ClassroomLiveGrid({ faces = [] }) {
  if (!faces.length) return null;
  return (
    <div className="classroom-live-grid">
      {faces.map((f, i) => (
        <div key={f.id || i} className="live-face-card">
          <div style={{ fontWeight: 700 }}>{f.name || `Face #${i + 1}`}</div>
          <div className="confidence">{Math.round((f.confidence || f.score || 0) * 100)}% match</div>
          {f.status && <div style={{ color: '#10b981', fontSize: '0.62rem' }}>{f.status}</div>}
        </div>
      ))}
    </div>
  );
}
