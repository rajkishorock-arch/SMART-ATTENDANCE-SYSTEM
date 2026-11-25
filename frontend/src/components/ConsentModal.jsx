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
        border: '1px solid #e4dfd5', borderRadius: '18px', padding: '28px',
        boxShadow: '0 20px 60px rgba(15, 23, 42, 0.15)'
      }}>
        <h2 style={{ color: '#25231f', fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px' }}>Biometric Data Consent</h2>
        <p style={{ color: '#46423b', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '16px' }}>
          This app collects facial biometric data for attendance verification. Your face embeddings are stored securely
          and used only within your institution. You may request deletion of your data at any time from your profile.
        </p>
        <ul style={{ color: '#58534a', fontSize: '0.84rem', lineHeight: 1.6, marginBottom: '22px', paddingLeft: '20px' }}>
          <li>Camera access is required for face scanning</li>
          <li>Location may be used for geofencing (if enabled by admin)</li>
          <li>Data is processed per DPDP Act 2023 guidelines</li>
        </ul>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={onAccept} style={{
            flex: 1, padding: '12px', background: 'linear-gradient(135deg, #61471e 0%, #916d30 100%)',
            border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(30, 64, 175, 0.25)', fontSize: '0.9rem'
          }}>
            I Agree
          </button>
          <button type="button" onClick={onDecline} style={{
            flex: 1, padding: '12px', background: '#faf9f6',
            border: '1px solid #cfc8ba', borderRadius: '10px', color: '#58534a', fontWeight: 600, cursor: 'pointer',
            fontSize: '0.9rem'
          }}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
