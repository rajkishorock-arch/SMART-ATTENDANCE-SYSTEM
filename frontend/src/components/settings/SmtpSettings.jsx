import { useState } from 'react';
import { getApiBaseUrl } from '../../utils/platform';

export default function SmtpSettings({ token }) {
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpTestStatus, setSmtpTestStatus] = useState({ loading: false, success: '', error: '' });

  const handleSmtpTest = async (e) => {
    e.preventDefault();
    if (!smtpTestEmail) return;
    setSmtpTestStatus({ loading: true, success: '', error: '' });
    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/health/test-smtp?recipient_email=${encodeURIComponent(smtpTestEmail)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSmtpTestStatus({ loading: false, success: data.message || 'SMTP Connection Verified! Email Sent Successfully.', error: '' });
      } else {
        setSmtpTestStatus({ loading: false, success: '', error: data.detail || 'SMTP Connection Failed.' });
      }
    } catch (err) {
      setSmtpTestStatus({ loading: false, success: '', error: `Connection failed: ${err.message}` });
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '16px',
      borderLeft: '1px solid var(--border-subtle)',
      paddingLeft: '28px'
    }}>
      <div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✉️ SMTP Mailer Diagnostics
        </h4>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.78rem', margin: '4px 0 0 0', lineHeight: '1.4' }}>
          Verify the live mail server connection by triggering a test transmission.
        </p>
      </div>

      <form onSubmit={handleSmtpTest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Recipient Test Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="e.g. your-email@gmail.com"
            value={smtpTestEmail}
            onChange={(e) => setSmtpTestEmail(e.target.value)}
            required
            style={{
              padding: '10px 14px',
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              color: 'var(--color-text-main)',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={smtpTestStatus.loading}
          className="btn-primary"
          style={{
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {smtpTestStatus.loading ? 'TRANSMITTING VERIFICATION...' : '⚡ TEST SMTP CONNECTION'}
        </button>
      </form>

      {smtpTestStatus.success && (
        <div style={{
          padding: '12px',
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '8px',
          color: '#059669',
          fontSize: '0.78rem',
          lineHeight: '1.4'
        }}>
          ✅ {smtpTestStatus.success}
        </div>
      )}

      {smtpTestStatus.error && (
        <div style={{
          padding: '12px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '0.78rem',
          lineHeight: '1.4',
          wordBreak: 'break-all'
        }}>
          ❌ {smtpTestStatus.error}
        </div>
      )}
    </div>
  );
}
