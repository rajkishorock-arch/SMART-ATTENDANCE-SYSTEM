import { useState, useEffect, useCallback } from 'react';
import { 
  QrCode, KeyRound, ShieldCheck, Clock, RefreshCw, 
  CheckCircle2, AlertTriangle, X, Play, StopCircle, 
  Copy, Check, Sparkles, BookOpen, AlertCircle
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/platform';

const API_BASE_URL = getApiBaseUrl();

export default function BiometricFallbackModal({
  isOpen,
  onClose,
  token,
  currentUser,
  subjects = [],
  playCyberSound = () => {}
}) {
  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin' || currentUser?.role === 'hod';

  // Teacher session states
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');
  const [activeSession, setActiveSession] = useState(null);
  const [rollingToken, setRollingToken] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);

  // Student claim states
  const [claimTab, setClaimTab] = useState('pin'); // 'pin' or 'qr'
  const [inputPin, setInputPin] = useState('');
  const [inputSessionId, setInputSessionId] = useState('');
  const [inputQrToken, setInputQrToken] = useState('');
  const [fallbackReason, setFallbackReason] = useState('Camera malfunction / facial occlusion');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null);

  const [copiedPin, setCopiedPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ── Poll Rolling Token for Teacher ─────────────────────────────────────────
  const fetchRollingToken = useCallback(async (sessionId) => {
    if (!sessionId || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/fallback/active-token/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRollingToken(data.token);
        setSecondsRemaining(data.seconds_remaining);
      }
    } catch (err) {
      console.error('Failed to poll rolling token:', err);
    }
  }, [token]);

  useEffect(() => {
    let timer;
    if (activeSession?.id && isTeacherOrAdmin) {
      fetchRollingToken(activeSession.id);
      timer = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            fetchRollingToken(activeSession.id);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeSession, isTeacherOrAdmin, fetchRollingToken]);

  if (!isOpen) return null;

  // ── Teacher: Start Fallback Session ─────────────────────────────────────────
  const handleStartSession = async () => {
    if (!selectedSubjectId) {
      setErrorMsg('Please select a subject.');
      return;
    }
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/fallback/generate-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject_id: parseInt(selectedSubjectId),
          duration_minutes: 60
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to generate fallback session.');
      }
      const data = await res.json();
      setActiveSession(data);
      playCyberSound('success');
      setSuccessMsg(`Fallback session active! PIN: ${data.session_pin}`);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Student: Claim Attendance ──────────────────────────────────────────────
  const handleStudentClaim = async (e) => {
    e.preventDefault();
    if (!fallbackReason.trim()) {
      setErrorMsg('A valid reason for biometric fallback is mandatory.');
      return;
    }
    setIsClaiming(true);
    setErrorMsg('');
    setClaimResult(null);

    try {
      let res;
      if (claimTab === 'pin') {
        if (!inputSessionId || !inputPin) {
          throw new Error('Please enter both Session ID and 6-digit PIN.');
        }
        res = await fetch(`${API_BASE_URL}/fallback/claim-pin`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            session_id: parseInt(inputSessionId),
            session_pin: inputPin.trim(),
            fallback_reason: fallbackReason.trim()
          })
        });
      } else {
        if (!inputQrToken.trim()) {
          throw new Error('Please enter or scan the rolling QR token.');
        }
        res = await fetch(`${API_BASE_URL}/fallback/claim-qr`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: inputQrToken.trim(),
            fallback_reason: fallbackReason.trim()
          })
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Biometric fallback claim rejected.');
      }

      const data = await res.json();
      setClaimResult(data);
      playCyberSound('success');
      setSuccessMsg(data.message);
    } catch (err) {
      setErrorMsg(err.message);
      playCyberSound('error');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.96)',
        border: '1px solid rgba(245, 158, 11, 0.35)',
        borderRadius: '20px',
        width: '100%', maxWidth: '580px',
        padding: '28px', position: 'relative',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
        color: '#f8fafc'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '10px',
            padding: '8px',
            color: '#fbbf24'
          }}>
            <QrCode size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>
              Biometric Fallback Authorization
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              Time-Bound Rotating QR & Emergency Session PIN (Phase 9)
            </span>
          </div>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px',
            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px',
            fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── TEACHER / ADMIN VIEW ────────────────────────────────────────── */}
        {isTeacherOrAdmin ? (
          <div>
            {!activeSession ? (
              <div>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  When camera equipment malfunctions or a student cannot be scanned due to physical bandages or optical occlusion, 
                  generate a secure time-bound session. Students can verify via rolling dynamic QR or an emergency PIN.
                </p>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '6px' }}>
                    Select Course / Lecture *
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff',
                      padding: '10px 12px', borderRadius: '8px', fontSize: '0.9rem'
                    }}
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#cbd5e1', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleStartSession}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      border: 'none', color: '#000', padding: '9px 20px', borderRadius: '8px',
                      fontWeight: 700, cursor: isGenerating ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Play size={15} style={{ display: 'inline', marginRight: '6px' }} />
                    {isGenerating ? 'Generating...' : 'Start Fallback Session'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Active Session Display Screen */}
                <div style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '14px',
                  padding: '20px',
                  textAlign: 'center',
                  marginBottom: '18px'
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Session #{activeSession.id} Emergency PIN
                  </div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    letterSpacing: '0.25em',
                    color: '#fbbf24',
                    fontFamily: 'monospace',
                    margin: '10px 0'
                  }}>
                    {activeSession.session_pin}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(activeSession.session_pin);
                      setCopiedPin(true);
                      setTimeout(() => setCopiedPin(false), 2000);
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#cbd5e1',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedPin ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                    {copiedPin ? 'Copied' : 'Copy PIN'}
                  </button>
                </div>

                {/* Rolling Dynamic QR Code Box */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px dashed rgba(0, 242, 254, 0.4)',
                  borderRadius: '14px',
                  padding: '16px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#00f2fe', fontWeight: 600 }}>
                      ⚡ 30-Second Rolling HMAC Token
                    </span>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: secondsRemaining <= 5 ? '#f87171' : '#34d399',
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: '4px' }} />
                      Rotates in {secondsRemaining}s
                    </span>
                  </div>

                  <div style={{
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    color: '#fff',
                    wordBreak: 'break-all',
                    background: 'rgba(0, 0, 0, 0.5)',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {rollingToken || 'Generating rotating hash...'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Every fallback verification logs an immutable audit trail.
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSession(null)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#f87171',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}
                  >
                    <StopCircle size={14} style={{ display: 'inline', marginRight: '5px' }} />
                    Close Session
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── STUDENT VIEW ──────────────────────────────────────────────── */
          <div>
            {claimResult ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={48} color="#34d399" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: '#fff' }}>
                  Attendance Verified!
                </h4>
                <p style={{ margin: '0 0 16px 0', color: '#cbd5e1', fontSize: '0.88rem' }}>
                  Your attendance has been recorded using method <strong>{claimResult.verification_method}</strong>.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none', color: '#fff', padding: '9px 24px', borderRadius: '8px',
                    fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleStudentClaim}>
                {/* Method selector tabs */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px'
                }}>
                  <button
                    type="button"
                    onClick={() => setClaimTab('pin')}
                    style={{
                      background: claimTab === 'pin' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: claimTab === 'pin' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: claimTab === 'pin' ? '#fbbf24' : '#94a3b8',
                      padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <KeyRound size={15} />
                    Session PIN
                  </button>

                  <button
                    type="button"
                    onClick={() => setClaimTab('qr')}
                    style={{
                      background: claimTab === 'qr' ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: claimTab === 'qr' ? '1px solid rgba(0, 242, 254, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: claimTab === 'qr' ? '#00f2fe' : '#94a3b8',
                      padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <QrCode size={15} />
                    Scan Dynamic QR
                  </button>
                </div>

                {claimTab === 'pin' ? (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>
                          Session # *
                        </label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 1"
                          value={inputSessionId}
                          onChange={e => setInputSessionId(e.target.value)}
                          style={{
                            width: '100%', background: 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff',
                            padding: '10px', borderRadius: '8px', fontSize: '0.9rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>
                          6-Digit PIN *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="Announced by Faculty"
                          value={inputPin}
                          onChange={e => setInputPin(e.target.value)}
                          style={{
                            width: '100%', background: 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fbbf24',
                            padding: '10px', borderRadius: '8px', fontSize: '1.1rem',
                            fontFamily: 'monospace', letterSpacing: '0.15em'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>
                      Dynamic QR Token *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Paste token or scan teacher screen"
                      value={inputQrToken}
                      onChange={e => setInputQrToken(e.target.value)}
                      style={{
                        width: '100%', background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff',
                        padding: '10px', borderRadius: '8px', fontSize: '0.85rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                )}

                {/* Mandatory Reason */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '4px' }}>
                    Mandatory Biometric Fallback Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Camera blurred, optical injury, severe lighting issue"
                    value={fallbackReason}
                    onChange={e => setFallbackReason(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff',
                      padding: '10px', borderRadius: '8px', fontSize: '0.88rem'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Recorded in institutional audit logs for verification compliance.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#cbd5e1', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isClaiming}
                    style={{
                      background: 'linear-gradient(135deg, #00f2fe 0%, #0099ff 100%)',
                      border: 'none', color: '#000', padding: '9px 20px', borderRadius: '8px',
                      fontWeight: 700, cursor: isClaiming ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isClaiming ? 'Verifying...' : 'Submit Fallback Claim'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
