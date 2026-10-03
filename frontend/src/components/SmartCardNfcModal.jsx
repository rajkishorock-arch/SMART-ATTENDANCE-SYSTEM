import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Radio, CheckCircle2, AlertCircle, RefreshCw, X, User, Sparkles, Volume2 } from 'lucide-react';
import { enterpriseApi } from '../api/enterpriseApi';

export default function SmartCardNfcModal({
  isOpen,
  onClose,
  token,
  selectedSubjectId,
  sessionDate,
  sessionPeriod,
  onStudentCheckedIn,
  playCyberSound = () => {},
  addDiagnosticLog = () => {},
}) {
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcListening, setNfcListening] = useState(false);
  const [cardInput, setCardInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [recentTaps, setRecentTaps] = useState([]);
  
  const inputRef = useRef(null);
  const ndefRef = useRef(null);
  const autoFocusTimer = useRef(null);

  // Check Web NFC support
  useEffect(() => {
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, []);

  // Auto focus input for USB RFID readers
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setLastCheckIn(null);
      autoFocusTimer.current = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 200);
    }
    return () => {
      if (autoFocusTimer.current) clearTimeout(autoFocusTimer.current);
    };
  }, [isOpen]);

  // Web NFC Reader activation
  const startNfcScanning = async () => {
    if (!('NDEFReader' in window)) {
      setErrorMsg('Web NFC is not supported on this browser or platform (supported on Android Chrome/Edge).');
      return;
    }
    try {
      const ndef = new window.NDEFReader();
      ndefRef.current = ndef;
      await ndef.scan();
      setNfcListening(true);
      setErrorMsg('');
      playCyberSound('click');
      addDiagnosticLog?.('NFC Reader antenna active. Tap card against back of device.');

      ndef.onreading = (event) => {
        const serialNumber = event.serialNumber;
        let cardId = serialNumber;
        for (const record of event.message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder(record.encoding);
            cardId = textDecoder.decode(record.data);
            break;
          }
        }
        playCyberSound('click');
        if (navigator.vibrate) navigator.vibrate(80);
        processCardScan(cardId);
      };

      ndef.onreadingerror = () => {
        setErrorMsg('NFC card read error. Please hold card steady against the device.');
        playCyberSound('error');
      };
    } catch (err) {
      console.error('NFC scanning activation error:', err);
      setErrorMsg(err.message || 'Failed to start NFC antenna. Ensure NFC is enabled in device settings.');
    }
  };

  const processCardScan = async (rawId) => {
    const cleanId = String(rawId || '').trim();
    if (!cleanId) return;

    try {
      setLoading(true);
      setErrorMsg('');

      const payload = {
        card_id: cleanId,
        roll: cleanId,
        subject_id: selectedSubjectId ? parseInt(selectedSubjectId) : null,
        custom_date: sessionDate || null,
      };

      const res = await enterpriseApi.markRfidAttendance(token, payload);

      playCyberSound('success');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

      setLastCheckIn(res);
      setRecentTaps(prev => [res, ...prev.slice(0, 4)]);
      setCardInput('');

      if (onStudentCheckedIn) {
        onStudentCheckedIn({
          name: res.name,
          roll: res.roll,
          department: res.department,
          time: res.time,
          attendance: 'Present',
          verification_method: 'RFID_NFC_CARD'
        });
      }

      addDiagnosticLog?.(`SMART CARD CHECK-IN: ${res.name} (${res.roll}) verified via RFID/NFC.`);
    } catch (err) {
      console.error('RFID mark error:', err);
      playCyberSound('error');
      setErrorMsg(err.message || `Card '${cleanId}' not recognized in this institution.`);
    } finally {
      setLoading(false);
      // Re-focus input for next tap
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (cardInput.trim()) {
      processCardScan(cardInput.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeInUp 0.3s ease'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(to right, #f8fafc, #ffffff)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(30, 64, 175, 0.08)',
              border: '1px solid rgba(30, 64, 175, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1e40af'
            }}>
              <CreditCard size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Smart NFC & RFID Card Tap
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Contactless physical student badge reader & attendance check-in
              </p>
            </div>
          </div>
          <button
            onClick={() => { playCyberSound('click'); onClose(); }}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Active Session Info Pill */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem'
          }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Active Period & Date</span>
              <strong style={{ color: '#0f172a' }}>{sessionPeriod || 'Standard Period'} — {sessionDate || 'Today'}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Mode</span>
              <span style={{ color: '#1e40af', fontWeight: 700 }}>Dual NFC / USB Wedge</span>
            </div>
          </div>

          {/* Web NFC Antenna Section (Android / Tablets) */}
          {nfcSupported && (
            <div style={{
              background: nfcListening ? '#f0fdf4' : '#eff6ff',
              border: `1px solid ${nfcListening ? '#bbf7d0' : '#bfdbfe'}`,
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Radio size={24} style={{ color: nfcListening ? '#16a34a' : '#2563eb', animation: nfcListening ? 'pulse 1.5s infinite' : 'none' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: nfcListening ? '#166534' : '#1e40af' }}>
                    {nfcListening ? 'NFC Antenna Active — Ready to Tap' : 'Hardware Web NFC Available'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: nfcListening ? '#15803d' : '#3b82f6' }}>
                    {nfcListening ? 'Hold student ID card against tablet back' : 'Enable antenna for tablet contactless tapping'}
                  </p>
                </div>
              </div>
              {!nfcListening && (
                <button
                  type="button"
                  onClick={startNfcScanning}
                  style={{
                    background: '#1e40af',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Activate Antenna
                </button>
              )}
            </div>
          )}

          {/* USB RFID Reader / Roll Input Box */}
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>USB Card Reader Tap / Manual Roll Input:</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>(Auto-listens for USB RFID swipe)</span>
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                ref={inputRef}
                type="text"
                value={cardInput}
                onChange={(e) => setCardInput(e.target.value)}
                placeholder="Tap card on USB reader or enter Roll Number..."
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '2px solid #cbd5e1',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="submit"
                disabled={loading || !cardInput.trim()}
                style={{
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0 20px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: loading || !cardInput.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !cardInput.trim() ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Mark'}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {errorMsg && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#dc2626',
              fontSize: '0.85rem'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Last Check-in Card (Holographic Verified Badge) */}
          {lastCheckIn && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '2px solid #86efac',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              animation: 'fadeInUp 0.3s ease',
              boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.1)'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#ffffff',
                border: '2px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {lastCheckIn.photo ? (
                  <img src={lastCheckIn.photo} alt={lastCheckIn.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={28} color="#059669" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={18} color="#059669" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#047857', letterSpacing: '0.05em' }}>
                    {lastCheckIn.newly_marked ? 'ATTENDANCE RECORDED' : 'ALREADY RECORDED'}
                  </span>
                </div>
                <h4 style={{ margin: '2px 0', fontSize: '1.15rem', fontWeight: 800, color: '#064e3b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lastCheckIn.name}
                </h4>
                <div style={{ display: 'flex', gap: '12px', fontSize: '0.82rem', color: '#047857' }}>
                  <span>Roll: <strong>{lastCheckIn.roll}</strong></span>
                  <span>Dept: <strong>{lastCheckIn.department}</strong></span>
                  <span>Time: <strong>{lastCheckIn.time}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Taps Log */}
          {recentTaps.length > 0 && (
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '8px' }}>
                Recent RFID/NFC Taps in this Session:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recentTaps.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.name} ({item.roll})</span>
                    <span style={{ color: '#059669', fontWeight: 600 }}>{item.time || 'Present'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'flex-end',
          background: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={() => { playCyberSound('click'); onClose(); }}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Done / Close Scanner
          </button>
        </div>

      </div>
    </div>
  );
}
