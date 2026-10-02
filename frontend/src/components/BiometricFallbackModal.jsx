import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  QrCode, KeyRound, Clock,
  CheckCircle2, AlertTriangle, X, Play, StopCircle, 
  Copy, Check
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
  const secondsRemainingRef = useRef(30);
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
  const fetchRollingToken = useCallback(async (sessionId, isCancelled = () => false) => {
    if (!sessionId || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/fallback/active-token/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (!isCancelled()) {
          setRollingToken(data.token);
          secondsRemainingRef.current = data.seconds_remaining;
          setSecondsRemaining(data.seconds_remaining);
        }
      }
    } catch (err) {
      console.error('Failed to poll rolling token:', err);
    }
  }, [token]);

  useEffect(() => {
    let ignore = false;
    let timer;
    if (activeSession?.id && isTeacherOrAdmin) {
      Promise.resolve().then(() => {
        if (!ignore) {
          fetchRollingToken(activeSession.id, () => ignore);
        }
      });
      timer = setInterval(() => {
        if (secondsRemainingRef.current <= 1) {
          secondsRemainingRef.current = 30;
          setSecondsRemaining(30);
          if (!ignore) {
            fetchRollingToken(activeSession.id, () => ignore);
          }
        } else {
          secondsRemainingRef.current -= 1;
          setSecondsRemaining(secondsRemainingRef.current);
        }
      }, 1000);
    }
    return () => {
      ignore = true;
      clearInterval(timer);
    };
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
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        width: '100%', maxWidth: '580px',
        padding: '28px', position: 'relative',
        boxShadow: '0 20px 48px rgba(15, 23, 42, 0.15)',
        color: '#0f172a'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            padding: '8px',
            color: '#b45309'
          }}>
            <QrCode size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              Biometric Fallback Authorization
            </h3>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
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
                <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                  When camera equipment malfunctions or a student cannot be scanned due to physical bandages or optical occlusion, 
                  generate a secure time-bound session. Students can verify via rolling dynamic QR or an emergency PIN.
                </p>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', fontWeight: 600, marginBottom: '6px' }}>
                    Select Course / Lecture *
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    style={{
                      width: '100%', background: '#f8fafc',
                      border: '1px solid #cbd5e1', color: '#0f172a',
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
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleStartSession}
                    style={{
                      background: '#0284c7',
                      border: 'none', color: '#fff', padding: '9px 20px', borderRadius: '8px',
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
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '20px',
                  textAlign: 'center',
                  marginBottom: '18px'
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                    Session #{activeSession.id} Emergency PIN
                  </div>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    letterSpacing: '0.25em',
                    color: '#0284c7',
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
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600
                    }}
                  >
                    {copiedPin ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    {copiedPin ? 'Copied' : 'Copy PIN'}
                  </button>
                </div>

                {/* Rolling Dynamic QR Code Box */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '14px',
                  padding: '16px',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 600 }}>
                      ⚡ 30-Second Rolling Token
                    </span>
                    <span style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: secondsRemaining <= 5 ? '#dc2626' : '#059669',
                      background: '#f1f5f9',
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
                    color: '#0f172a',
                    wordBreak: 'break-all',
                    background: '#ffffff',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
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
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
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
                <CheckCircle2 size={48} color="#059669" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>
                  Attendance Verified!
                </h4>
                <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.88rem' }}>
                  Your attendance has been recorded using method <strong>{claimResult.verification_method}</strong>.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: '#059669',
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
                      background: claimTab === 'pin' ? '#eff6ff' : '#f8fafc',
                      border: claimTab === 'pin' ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                      color: claimTab === 'pin' ? '#1d4ed8' : '#64748b',
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
                      background: claimTab === 'qr' ? '#eff6ff' : '#f8fafc',
                      border: claimTab === 'qr' ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                      color: claimTab === 'qr' ? '#1d4ed8' : '#64748b',
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
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
                          Session # *
                        </label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 1"
                          value={inputSessionId}
                          onChange={e => setInputSessionId(e.target.value)}
                          style={{
                            width: '100%', background: '#f8fafc',
                            border: '1px solid #cbd5e1', color: '#0f172a',
                            padding: '10px', borderRadius: '8px', fontSize: '0.9rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
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
                            width: '100%', background: '#f8fafc',
                            border: '1px solid #cbd5e1', color: '#0284c7',
                            padding: '10px', borderRadius: '8px', fontSize: '1.1rem',
                            fontFamily: 'monospace', letterSpacing: '0.15em', fontWeight: 700
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
                      Dynamic QR Token *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Paste token or scan teacher screen"
                      value={inputQrToken}
                      onChange={e => setInputQrToken(e.target.value)}
                      style={{
                        width: '100%', background: '#f8fafc',
                        border: '1px solid #cbd5e1', color: '#0f172a',
                        padding: '10px', borderRadius: '8px', fontSize: '0.85rem',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                )}

                {/* Mandatory Reason */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', fontWeight: 600, marginBottom: '4px' }}>
                    Mandatory Biometric Fallback Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Camera blurred, optical injury, severe lighting issue"
                    value={fallbackReason}
                    onChange={e => setFallbackReason(e.target.value)}
                    style={{
                      width: '100%', background: '#f8fafc',
                      border: '1px solid #cbd5e1', color: '#0f172a',
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
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isClaiming}
                    style={{
                      background: '#0284c7',
                      border: 'none', color: '#fff', padding: '9px 20px', borderRadius: '8px',
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
