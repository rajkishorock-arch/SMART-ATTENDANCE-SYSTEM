import { useState, useEffect, useCallback } from 'react';
import { Crown, Shield, UserCheck, XCircle } from 'lucide-react';

export default function OwnerPremiumPanel({ apiBaseUrl, token }) {
  const [users, setUsers] = useState([]);
  const [masterPassword, setMasterPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/premium/grants`, { headers: headers() });
      if (res.ok) setUsers(await res.json());
    } catch (e) {
      setError(e.message);
    }
  }, [apiBaseUrl, headers]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  const toggleGrant = async (email, grant) => {
    if (!masterPassword.trim()) {
      setError('Master password required to change premium access.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${apiBaseUrl}/premium/grant`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          master_password: masterPassword,
          user_email: email,
          grant,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      setMessage(data.message);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', marginTop: '20px' }}>
      <h3 style={{ color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Crown size={20} color="#fbbf24" /> Premium Access Control (Owner Only)
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '16px' }}>
        You always have premium free. Grant or revoke premium features for any user — master password required for each change.
      </p>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ color: '#cbd5e1', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>
          <Shield size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Master Password
        </label>
        <input
          type="password"
          className="form-input"
          placeholder="Enter master password to authorize changes..."
          value={masterPassword}
          onChange={(e) => setMasterPassword(e.target.value)}
          style={{ maxWidth: '360px' }}
        />
      </div>

      {message && (
        <div style={{ padding: '10px', marginBottom: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem' }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ padding: '10px', marginBottom: '12px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
        {users.map((u) => (
          <div
            key={u.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(15,23,42,0.5)',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>{u.name}</div>
              <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{u.email} · {u.role}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
                background: u.premium_access ? 'rgba(251,191,36,0.15)' : 'rgba(100,116,139,0.15)',
                color: u.premium_access ? '#fbbf24' : '#94a3b8',
              }}>
                {u.premium_access ? 'PREMIUM' : 'FREE'}
              </span>
              {!u.email.includes('rajkishorock@gmail.com') && (
                u.premium_granted ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => toggleGrant(u.email, false)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)',
                      background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.75rem',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    <XCircle size={14} /> Revoke
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => toggleGrant(u.email, true)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.3)',
                      background: 'rgba(251,191,36,0.1)', color: '#fde68a', cursor: 'pointer', fontSize: '0.75rem',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    <UserCheck size={14} /> Grant Premium
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
