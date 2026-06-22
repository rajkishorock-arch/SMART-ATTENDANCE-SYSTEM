export default function ConsentModal({ open, onAccept, onDecline }) {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(8,12,20,0.9)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        maxWidth: '480px', width: '100%', background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(0,242,254,0.3)', borderRadius: '16px', padding: '28px',
      }}>
        <h2 style={{ color: '#00f2fe', fontSize: '1.2rem', marginBottom: '12px' }}>Biometric Data Consent</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '16px' }}>
          This app collects facial biometric data for attendance verification. Your face embeddings are stored securely
          and used only within your institution. You may request deletion of your data at any time from your profile.
        </p>
        <ul style={{ color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '20px', paddingLeft: '20px' }}>
          <li>Camera access is required for face scanning</li>
          <li>Location may be used for geofencing (if enabled by admin)</li>
          <li>Data is processed per DPDP Act 2023 guidelines</li>
        </ul>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={onAccept} style={{
            flex: 1, padding: '12px', background: 'linear-gradient(135deg,#00f2fe,#4f46e5)',
            border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer',
          }}>
            I Agree
          </button>
          <button type="button" onClick={onDecline} style={{
            flex: 1, padding: '12px', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer',
          }}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
