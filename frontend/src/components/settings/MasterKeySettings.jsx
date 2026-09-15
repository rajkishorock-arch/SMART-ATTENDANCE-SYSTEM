import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { getApiBaseUrl } from '../../utils/platform';

export default function MasterKeySettings({ token, playCyberSound }) {
  const [currentMasterKeyInput, setCurrentMasterKeyInput] = useState('');
  const [newMasterKeyInput, setNewMasterKeyInput] = useState('');
  const [masterKeyUpdateMsg, setMasterKeyUpdateMsg] = useState('');
  const [masterKeyUpdateErr, setMasterKeyUpdateErr] = useState('');
  const [isUpdatingMasterKey, setIsUpdatingMasterKey] = useState(false);

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
    } catch (err) {
      if (typeof playCyberSound === 'function') playCyberSound('error');
      setMasterKeyUpdateErr(err.message);
    } finally {
      setIsUpdatingMasterKey(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <Lock size={22} style={{ color: '#e11d48' }} /> Change Workspace Master Password
        </h3>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '4px', margin: 0 }}>
          Modify the master verification password for this institution. Verification of either the current master password or the system owner's master password is required.
        </p>
      </div>

      {masterKeyUpdateMsg && (
        <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', color: '#10b981', fontSize: '0.85rem' }}>
          ✅ {masterKeyUpdateMsg}
        </div>
      )}
      {masterKeyUpdateErr && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
          ❌ {masterKeyUpdateErr}
        </div>
      )}

      <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Current Master Password</label>
          <input
            type="password"
            className="form-input"
            placeholder="Enter current master password"
            value={currentMasterKeyInput}
            onChange={e => setCurrentMasterKeyInput(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">New Master Password</label>
          <input
            type="password"
            className="form-input"
            placeholder="Min 6 characters"
            value={newMasterKeyInput}
            onChange={e => setNewMasterKeyInput(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={handleChangeMasterKey}
        className="bg-gradient-btn"
        style={{ width: 'fit-content', padding: '10px 28px', borderRadius: '8px', fontSize: '0.9rem', background: 'linear-gradient(135deg, #e11d48, #be123c)' }}
        disabled={isUpdatingMasterKey}
      >
        {isUpdatingMasterKey ? 'Updating...' : '🔐 Update Master Password'}
      </button>
    </div>
  );
}
