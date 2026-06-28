import { Share2, Award, Flame } from 'lucide-react';

export default function StudentAttendanceWallet({ logs = [], studentName }) {
  const present = logs.filter((l) => (l.attendance || '').toLowerCase() === 'present').length;
  const total = logs.length || 1;
  const pct = Math.round((present / total) * 100);

  const handleShare = async () => {
    const text = `🎓 ${studentName || 'My'} Attendance: ${pct}% | ${present}/${total} classes — Smart Attendance System`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Attendance Wallet', text });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard?.writeText(text);
      alert('Wallet card copied to clipboard!');
    }
  };

  return (
    <div className="student-wallet-card glass-panel">
      <Award size={28} color="#fbbf24" style={{ marginBottom: '8px' }} />
      <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '4px' }}>Attendance Wallet</div>
      <div className="wallet-pct">{pct}%</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '12px 0' }}>
        <span style={{ fontSize: '0.78rem', color: '#10b981' }}><Flame size={14} /> {present} Present</span>
        <span style={{ fontSize: '0.78rem', color: '#ef4444' }}>{total - present} Absent</span>
      </div>
      <button type="button" className="bg-gradient-btn" onClick={handleShare} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.82rem' }}>
        <Share2 size={14} /> Share Card
      </button>
    </div>
  );
}
