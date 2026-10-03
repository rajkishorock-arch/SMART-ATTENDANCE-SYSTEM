export default function ConsentModal({ open, onAccept, onDecline }) {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        maxWidth: '480px', width: '100%', background: '#ffffff',
        border: '1px solid #e2e8f0', borderRadius: '18px', padding: '28px',
        boxShadow: '0 20px 60px rgba(15, 23, 42, 0.15)'
      }}>
        <h2 style={{ color: '#0f172a', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Biometric Data Consent</h2>
        <p style={{ color: '#334155', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '16px' }}>
          This app collects facial biometric data for attendance verification. Your face embeddings are stored securely
          and used only within your institution. You may request deletion of your data at any time from your profile.
        </p>
        <ul style={{ color: '#475569', fontSize: '0.84rem', lineHeight: 1.6, marginBottom: '22px', paddingLeft: '20px' }}>
          <li>Camera access is required for face scanning</li>
          <li>Location may be used for geofencing (if enabled by admin)</li>
          <li>Data is processed per DPDP Act 2023 guidelines</li>
        </ul>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={onAccept} style={{
            flex: 1, padding: '12px', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(30, 64, 175, 0.25)', fontSize: '0.9rem'
          }}>
            I Agree
          </button>
          <button type="button" onClick={onDecline} style={{
            flex: 1, padding: '12px', background: '#f8fafc',
            border: '1px solid #cbd5e1', borderRadius: '10px', color: '#475569', fontWeight: 600, cursor: 'pointer',
            fontSize: '0.9rem'
          }}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
