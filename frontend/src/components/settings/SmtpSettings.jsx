import React, { useState } from 'react';
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
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      paddingLeft: '28px'
    }}>
      <div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          ✉️ SMTP Mailer Diagnostics
        </h4>
        <p style={{ color: '#9ca3af', fontSize: '0.78rem', margin: '4px 0 0 0', lineHeight: '1.4' }}>
          Verify the live mail server connection by triggering a test transmission.
        </p>
      </div>

      <form onSubmit={handleSmtpTest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: '0.75rem' }}>Recipient Test Email</label>
          <input
            type="email"
            className="form-input"
            placeholder="e.g. your-email@gmail.com"
            value={smtpTestEmail}
            onChange={(e) => setSmtpTestEmail(e.target.value)}
            required
            style={{
              padding: '10px 14px',
              background: 'rgba(8, 12, 20, 0.4)',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={smtpTestStatus.loading}
          className="action-btn"
          style={{
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
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
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '8px',
          color: '#10b981',
          fontSize: '0.78rem',
          fontFamily: 'monospace',
          lineHeight: '1.4'
        }}>
          ✅ {smtpTestStatus.success}
        </div>
      )}

      {smtpTestStatus.error && (
        <div style={{
          padding: '12px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '0.78rem',
          fontFamily: 'monospace',
          lineHeight: '1.4',
          wordBreak: 'break-all'
        }}>
          ❌ {smtpTestStatus.error}
        </div>
      )}
    </div>
  );
}
