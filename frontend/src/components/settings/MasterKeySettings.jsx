import { useState, useEffect, useCallback } from 'react';
import { Lock, Key, Eye, EyeOff, Copy, Check, ShieldCheck } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/platform';

export default function MasterKeySettings({ token, playCyberSound }) {
  const [currentMasterKey, setCurrentMasterKey] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [institutionSlug, setInstitutionSlug] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isLoadingKey, setIsLoadingKey] = useState(true);

  // Form inputs for updating master key
  const [currentMasterKeyInput, setCurrentMasterKeyInput] = useState('');
  const [newMasterKeyInput, setNewMasterKeyInput] = useState('');
  const [masterKeyUpdateMsg, setMasterKeyUpdateMsg] = useState('');
  const [masterKeyUpdateErr, setMasterKeyUpdateErr] = useState('');
  const [isUpdatingMasterKey, setIsUpdatingMasterKey] = useState(false);

  // Fetch current master key on mount
  const fetchMyMasterKey = useCallback(async () => {
    if (!token) return;
    setIsLoadingKey(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/institutions/my-master-key`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentMasterKey(data.master_key || '');
        setInstitutionName(data.institution_name || '');
        setInstitutionSlug(data.institution_slug || '');
      }
    } catch (err) {
      console.warn('Could not load current master key:', err);
    } finally {
      setIsLoadingKey(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMyMasterKey();
  }, [fetchMyMasterKey]);

  const handleChangeMasterKey = async () => {
    setMasterKeyUpdateMsg('');
    setMasterKeyUpdateErr('');

    if (!currentMasterKeyInput || !newMasterKeyInput) {
      setMasterKeyUpdateErr('Both current and new master passwords are required!');
      return;
    }

    if (newMasterKeyInput.trim().length < 6) {
      setMasterKeyUpdateErr('New master password must be at least 6 characters long.');
      return;
    }

    setIsUpdatingMasterKey(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/institutions/master-key`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_master_key: currentMasterKeyInput,
          new_master_key: newMasterKeyInput
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update master password.');
      }
      if (typeof playCyberSound === 'function') playCyberSound('success');
      setMasterKeyUpdateMsg('Master password updated successfully!');
      setCurrentMasterKeyInput('');
      setNewMasterKeyInput('');
      // Refresh current key display
      fetchMyMasterKey();
    } catch (err) {
      if (typeof playCyberSound === 'function') playCyberSound('error');
      setMasterKeyUpdateErr(err.message);
    } finally {
      setIsUpdatingMasterKey(false);
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '28px',
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      color: '#0f172a'
    }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Key size={22} color="#8b5cf6" />
          <span>Workspace Master Security Key</span>
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '6px', margin: 0, lineHeight: 1.5 }}>
          Your Institution Master Key authorizes critical administrative privileges, emergency database actions, and security override operations.
        </p>
      </div>

      {/* Current Master Key Display Card */}
      <div style={{
        background: '#f8fafc',
        border: '1.5px solid #e2e8f0',
        borderRadius: '12px',
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Current Master Key
            </span>
            {institutionSlug && (
              <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '2px 6px', fontWeight: 600 }}>
                {institutionName || institutionSlug}
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <span style={{
              fontFamily: 'Consolas, monospace',
              fontSize: '1.15rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: showKey ? '1px' : '3px'
            }}>
              {isLoadingKey
                ? 'Loading...'
                : showKey
                ? (currentMasterKey || 'Not Set')
                : '••••••••••••'}
            </span>
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? 'Hide Master Key' : 'Reveal Master Key'}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '5px 8px',
                cursor: 'pointer',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.74rem',
                fontWeight: 600
              }}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showKey ? 'Hide' : 'Reveal'}</span>
            </button>
          </div>
        </div>

        {currentMasterKey && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(currentMasterKey);
              setCopiedKey(true);
              setTimeout(() => setCopiedKey(false), 2000);
            }}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              background: copiedKey ? '#059669' : '#0284c7',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.2)'
            }}
          >
            {copiedKey ? <Check size={15} /> : <Copy size={15} />}
            <span>{copiedKey ? 'Copied to Clipboard!' : 'Copy Master Key'}</span>
          </button>
        )}
      </div>

      {/* Informational Guidance */}
      <div style={{
        background: '#f5f3ff',
        border: '1px solid #ddd6fe',
        borderRadius: '10px',
        padding: '12px 16px',
        fontSize: '0.8rem',
        color: '#5b21b6',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        lineHeight: 1.45
      }}>
        <ShieldCheck size={18} color="#7c3aed" style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          <strong>How is this key used?</strong> This key was generated automatically upon your school's registration. Whenever you trigger sensitive operations (such as resetting attendance archives, bulk deleting student biometric records, or changing institutional identity), the system requires you to enter this Master Key to prevent unauthorized actions.
        </span>
      </div>

      {/* Messages */}
      {masterKeyUpdateMsg && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#065f46', fontSize: '0.85rem', fontWeight: 600 }}>
          ✅ {masterKeyUpdateMsg}
        </div>
      )}
      {masterKeyUpdateErr && (
        <div style={{ padding: '12px 16px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '10px', color: '#9f1239', fontSize: '0.85rem', fontWeight: 600 }}>
          ❌ {masterKeyUpdateErr}
        </div>
      )}

      {/* Change Key Form */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Lock size={16} color="#64748b" />
          <span>Change / Rotate Master Key</span>
        </h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
              Current Master Key
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={currentMasterKeyInput}
              onChange={e => setCurrentMasterKeyInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
              New Master Key
            </label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={newMasterKeyInput}
              onChange={e => setNewMasterKeyInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <button
          onClick={handleChangeMasterKey}
          style={{
            padding: '11px 24px',
            borderRadius: '10px',
            fontSize: '0.88rem',
            fontWeight: 700,
            background: '#0f172a',
            border: 'none',
            color: '#ffffff',
            cursor: isUpdatingMasterKey ? 'not-allowed' : 'pointer',
            opacity: isUpdatingMasterKey ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          disabled={isUpdatingMasterKey}
        >
          <Lock size={15} />
          <span>{isUpdatingMasterKey ? 'Updating...' : 'Update Master Key'}</span>
        </button>
      </div>
    </div>
  );
}
