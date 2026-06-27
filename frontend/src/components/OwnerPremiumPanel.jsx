import { useState, useEffect, useCallback } from 'react';
import { Crown, Shield, UserCheck, XCircle, Search, Building2, Users, Plus, RefreshCw } from 'lucide-react';

export default function OwnerPremiumPanel({ apiBaseUrl, token }) {
  const [users, setUsers] = useState([]);
  const [allGrants, setAllGrants] = useState([]);
  const [masterPassword, setMasterPassword] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('own'); // 'own' | 'manual' | 'all'

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const loadOwn = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/premium/grants`, { headers: headers() });
      if (res.ok) setUsers(await res.json());
    } catch (e) { /* silent */ }
  }, [apiBaseUrl, headers]);

  const loadAll = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/premium/all-grants`, { headers: headers() });
      if (res.ok) setAllGrants(await res.json());
    } catch (e) { /* silent */ }
  }, [apiBaseUrl, headers]);

  useEffect(() => {
    if (token) {
      loadOwn();
      loadAll();
    }
  }, [token, loadOwn, loadAll]);

  const showMsg = (msg, isErr = false) => {
    if (isErr) { setError(msg); setMessage(''); }
    else { setMessage(msg); setError(''); }
    setTimeout(() => { setMessage(''); setError(''); }, 4000);
  };

  // Toggle premium for own institution users
  const toggleGrant = async (email, grant) => {
    if (!masterPassword.trim()) { showMsg('Master password required to change premium access.', true); return; }
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/premium/grant`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ master_password: masterPassword, user_email: email, grant }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      showMsg(data.message);
      await loadOwn();
    } catch (e) { showMsg(e.message, true); }
    finally { setLoading(false); }
  };

  // Grant premium to any admin by email (cross-institution)
  const grantByEmail = async (grantBool) => {
    if (!masterPassword.trim()) { showMsg('Master password required.', true); return; }
    if (!manualEmail.trim()) { showMsg('Enter admin email to grant premium.', true); return; }
    setGrantLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/premium/grant-by-id`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          master_password: masterPassword,
          admin_email: manualEmail.trim(),
          grant: grantBool,
          note: manualNote.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      showMsg(`✅ ${data.message}`);
      setManualEmail('');
      setManualNote('');
      await loadAll();
    } catch (e) { showMsg(e.message, true); }
    finally { setGrantLoading(false); }
  };

  const tabStyle = (t) => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 700,
    transition: 'all 0.2s',
    background: activeTab === t ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
    color: activeTab === t ? '#fbbf24' : '#94a3b8',
    borderBottom: activeTab === t ? '2px solid #fbbf24' : '2px solid transparent',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Master Password Row */}
      <div style={{
        display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap',
        padding: '16px', background: 'rgba(251,191,36,0.05)', borderRadius: '12px',
        border: '1px solid rgba(251,191,36,0.15)',
      }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ color: '#cbd5e1', fontSize: '0.75rem', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
            <Shield size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Master Password (required for all changes)
          </label>
          <input
            type="password"
            className="form-input"
            placeholder="Enter master password..."
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            style={{ width: '100%', padding: '9px 14px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => { loadOwn(); loadAll(); }}
            style={{
              padding: '9px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)', color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Feedback messages */}
      {message && (
        <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem', border: '1px solid rgba(16,185,129,0.2)' }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '2px' }}>
        <button style={tabStyle('own')} onClick={() => setActiveTab('own')}>
          👥 My Institution Users ({users.length})
        </button>
        <button style={tabStyle('manual')} onClick={() => setActiveTab('manual')}>
          ✏️ Grant by Email (Any Institution)
        </button>
        <button style={tabStyle('all')} onClick={() => setActiveTab('all')}>
          🌐 All Premium Grants ({allGrants.length})
        </button>
      </div>

      {/* Tab: Own Institution */}
      {activeTab === 'own' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
          {users.length === 0 && (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '24px', fontSize: '0.85rem' }}>No users found in your institution.</div>
          )}
          {users.map((u) => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)',
              background: u.premium_granted ? 'rgba(251,191,36,0.04)' : 'rgba(15,23,42,0.5)',
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.88rem' }}>{u.name}</div>
                <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{u.email} · {u.role}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                  background: u.premium_access ? 'rgba(251,191,36,0.15)' : 'rgba(100,116,139,0.15)',
                  color: u.premium_access ? '#fbbf24' : '#94a3b8',
                }}>
                  {u.premium_access ? '👑 PREMIUM' : 'FREE'}
                </span>
                {!u.email.includes('rajkishorock@gmail.com') && (
                  u.premium_granted ? (
                    <button type="button" disabled={loading} onClick={() => toggleGrant(u.email, false)}
                      style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <XCircle size={13} /> Revoke
                    </button>
                  ) : (
                    <button type="button" disabled={loading} onClick={() => toggleGrant(u.email, true)}
                      style={{ padding: '5px 12px', borderRadius: '7px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)', color: '#fde68a', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UserCheck size={13} /> Grant
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
          <div style={{ padding: '10px 14px', background: 'rgba(14, 165, 233, 0.05)', borderRadius: '10px', border: '1px solid rgba(14, 165, 233, 0.15)', fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
            💡 <strong style={{ color: '#e2e8f0' }}>Note:</strong> When you grant premium to an admin in any institution, ALL users (teachers + students) in that institution automatically inherit premium access.
          </div>
        </div>
      )}

      {/* Tab: Manual Email Grant */}
      {activeTab === 'manual' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '20px', background: 'rgba(251,191,36,0.05)', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.12)' }}>
            <h4 style={{ margin: '0 0 12px', color: '#fde68a', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={16} /> Grant Premium to Any Admin (Cross-Institution)
            </h4>
            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0 0 16px' }}>
              Enter the admin's email ID. When granted, <strong style={{ color: '#e2e8f0' }}>ALL students and teachers</strong> in that admin's institution will also get premium access automatically.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.75rem', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Admin Email / ID *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="admin@college.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') grantByEmail(true); }}
                    style={{ flex: 1, padding: '9px 14px' }}
                  />
                  <Search size={16} style={{ alignSelf: 'center', color: '#64748b', flexShrink: 0 }} />
                </div>
              </div>
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.75rem', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                  Note / Reason (optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Paid via Razorpay on 27/06/2026..."
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  style={{ width: '100%', padding: '9px 14px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={grantLoading}
                  onClick={() => grantByEmail(true)}
                  style={{
                    padding: '10px 20px', borderRadius: '9px', border: 'none',
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    color: '#1a0f00', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    opacity: grantLoading ? 0.6 : 1,
                  }}
                >
                  <Crown size={15} /> {grantLoading ? 'Processing...' : 'Grant Premium'}
                </button>
                <button
                  type="button"
                  disabled={grantLoading}
                  onClick={() => grantByEmail(false)}
                  style={{
                    padding: '10px 20px', borderRadius: '9px',
                    border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.08)', color: '#fca5a5',
                    fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    opacity: grantLoading ? 0.6 : 1,
                  }}
                >
                  <XCircle size={15} /> {grantLoading ? 'Processing...' : 'Revoke Premium'}
                </button>
              </div>
            </div>
          </div>

          <div style={{ padding: '14px', background: 'rgba(14,165,233,0.05)', borderRadius: '10px', border: '1px solid rgba(14,165,233,0.12)', fontSize: '0.78rem', color: '#94a3b8' }}>
            <strong style={{ color: '#38bdf8' }}>How it works:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: '18px', lineHeight: 1.7 }}>
              <li>Enter the admin's registered email and click <strong style={{ color: '#fbbf24' }}>Grant Premium</strong></li>
              <li>The system finds the admin across all institutions automatically</li>
              <li>All teachers and students under that admin's institution get premium access</li>
              <li>You can revoke anytime using the same email</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab: All Grants Across Institutions */}
      {activeTab === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {allGrants.length === 0 && (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '32px', fontSize: '0.85rem' }}>
              <Crown size={24} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
              No cross-institution premium grants yet.
            </div>
          )}
          <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allGrants.map((g) => (
              <div key={g.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                padding: '12px 14px', borderRadius: '10px',
                border: '1px solid rgba(251,191,36,0.2)',
                background: 'rgba(251,191,36,0.04)',
                flexWrap: 'wrap',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                    background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Building2 size={18} color="#fbbf24" />
                  </div>
                  <div>
                    <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.88rem' }}>{g.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.72rem' }}>{g.email} · {g.role}</div>
                    <div style={{ color: '#fbbf24', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Building2 size={10} /> {g.institution_name}
                      <span style={{ color: '#475569', marginLeft: '6px' }}>
                        <Users size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {g.users_in_institution} users benefit
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                    👑 PREMIUM
                  </span>
                  <button
                    type="button"
                    disabled={grantLoading}
                    onClick={() => {
                      setManualEmail(g.email);
                      setActiveTab('manual');
                    }}
                    style={{ padding: '5px 10px', borderRadius: '7px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#fca5a5', cursor: 'pointer', fontSize: '0.7rem' }}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
