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
    <div className="golden-os-smtp-pane">
      <div>
        <h4 style={{ fontSize: '0.96rem', fontWeight: 800, color: '#2b2112', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✉️ SMTP Mailer Diagnostics
        </h4>
        <p style={{ color: '#6b5b3e', fontSize: '0.78rem', margin: '4px 0 0 0', lineHeight: '1.4' }}>
          Verify the live mail server connection by triggering a test transmission.
        </p>
      </div>

      <form onSubmit={handleSmtpTest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem', color: '#47371a', fontWeight: 700 }}>Recipient Test Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="e.g. your-email@gmail.com"
            value={smtpTestEmail}
            onChange={(e) => setSmtpTestEmail(e.target.value)}
            required
            style={{
              padding: '10px 14px',
              background: '#fffdf8',
              border: '1px solid #dfd1b1',
              borderRadius: '10px',
              color: '#2b2112',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={smtpTestStatus.loading}
          className="golden-os-primary-action"
          style={{
            padding: '11px 16px',
            justifyContent: 'center',
            fontSize: '0.84rem',
            fontWeight: 700,
            borderRadius: '12px',
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
