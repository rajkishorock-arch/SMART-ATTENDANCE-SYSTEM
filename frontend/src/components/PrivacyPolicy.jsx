export const PRIVACY_POLICY_TEXT = `
SMART ATTENDANCE — PRIVACY POLICY

Last updated: June 2025

1. DATA WE COLLECT
- Facial biometric embeddings (mathematical representations, not raw photos stored long-term)
- Name, email, roll number, department
- Attendance records with timestamps
- GPS location (only when geofencing is enabled)
- Device camera frames (processed in real-time for recognition)

2. HOW WE USE DATA
- Mark and verify attendance
- Generate reports for teachers and administrators
- Send notifications to students and parents (if configured)

3. DATA SHARING
- Data is isolated per institution (multi-tenant)
- We do not sell biometric data to third parties
- ERP integrations use API keys scoped to your institution

4. YOUR RIGHTS
- Request access to your attendance records
- Update your face enrollment via profile
- Request account and data deletion

5. SECURITY
- JWT authentication, encrypted passwords (PBKDF2)
- Institution-scoped data isolation
- Optional IP and geofencing restrictions

6. CONTACT
For privacy requests, contact your institution administrator.
`;

export default function PrivacyPolicy({ onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      <div style={{
        maxWidth: '600px', maxHeight: '80vh', overflow: 'auto',
        background: '#0f172a', borderRadius: '12px', padding: '24px', color: '#e2e8f0',
      }}>
        <h2 style={{ color: '#00f2fe', marginBottom: '16px' }}>Privacy Policy</h2>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', lineHeight: 1.6, fontFamily: 'inherit' }}>
          {PRIVACY_POLICY_TEXT}
        </pre>
        <button type="button" onClick={onClose} style={{
          marginTop: '16px', padding: '10px 24px', background: '#4f46e5',
          color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
        }}>
          Close
        </button>
      </div>
    </div>
  );
}
