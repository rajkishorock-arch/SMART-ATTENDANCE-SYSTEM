import React, { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

export default function VirtualIdCardModal({ currentUser, token, API_BASE_URL, onClose }) {
  // Lock body scroll when modal is active
  useBodyScrollLock(true);

  const [qrToken, setQrToken] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [countdown, setCountdown] = useState(45);
  const [maxTtl, setMaxTtl] = useState(45);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const isFetchingRef = useRef(false);

  // Generate QR code locally in 0ms without waiting for external server
  const generateLocalQr = useCallback(async (tokenString) => {
    try {
      const dataUrl = await QRCode.toDataURL(tokenString, {
        width: 240,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('Local QR rendering error:', err);
      setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tokenString)}&bgcolor=ffffff&color=000000&margin=10`);
    }
  }, []);

  const fetchQrToken = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/users/students/me/qr-token`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const ttl = data.expires_in || 45;
        const freshToken = data.token;
        setQrToken(freshToken);
        setMaxTtl(ttl);
        setCountdown(ttl);
        await generateLocalQr(freshToken);
      } else {
        setQrToken(null);
        setQrDataUrl(null);
        setErrorMsg('Failed to generate secure QR token');
      }
    } catch (e) {
      console.error('QR token fetch failed', e);
      setQrToken(null);
      setQrDataUrl(null);
      setErrorMsg('Network error while generating QR code');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [token, API_BASE_URL, generateLocalQr]);

  useEffect(() => {
    fetchQrToken();
  }, [fetchQrToken]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchQrToken();
          return maxTtl;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchQrToken, maxTtl]);

  const detail = currentUser?.details || {};
  const studentRoll = detail.roll || currentUser?.roll || 'N/A';
  const studentDep = detail.dep || currentUser?.dep || currentUser?.department || 'N/A';
  const studentCourse = detail.course || currentUser?.course || 'General Program';
  const studentYear = detail.year || currentUser?.year || '2026';
  const studentSemester = detail.semester || currentUser?.semester || 'Semester 1';
  const studentMentor = detail.teacher || currentUser?.teacher || 'Assigned Faculty';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.3s ease',
      touchAction: 'none'
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(13,13,26,0.98) 0%, rgba(22,22,44,0.98) 100%)',
        border: '1px solid rgba(0,242,254,0.3)',
        borderRadius: '24px', padding: '32px 28px',
        width: '100%', maxWidth: '400px',
        boxShadow: '0 0 60px rgba(0,242,254,0.15), 0 0 120px rgba(139,92,246,0.08)',
        position: 'relative', overflow: 'hidden',
        maxHeight: '92vh', overflowY: 'auto'
      }}>
        {/* Glow effect blobs */}
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(0,242,254,0.12), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(139,92,246,0.1), transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#9ca3af', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'inline-block', padding: '4px 16px', borderRadius: '20px', background: 'rgba(0,242,254,0.1)', border: '1px solid rgba(0,242,254,0.25)', color: '#00f2fe', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
            🎓 Smart Attendance System
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 4px', background: 'linear-gradient(135deg, #00f2fe, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {currentUser?.name || 'Enrolled Student'}
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.82rem', margin: 0 }}>{studentDep} · {studentCourse}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px' }}>
          {[
            { label: 'Roll No', value: studentRoll },
            { label: 'Year', value: studentYear },
            { label: 'Semester', value: studentSemester },
            { label: 'Mentor', value: studentMentor },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: '#6b7280', fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>{label}</p>
              <p style={{ color: '#f3f4f6', fontSize: '0.9rem', fontWeight: 600, margin: '2px 0 0' }}>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <p style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>Dynamic QR — Show to Scanner Kiosk or Teacher</p>
          <div style={{
            borderRadius: '16px', padding: '8px', width: '216px', height: '216px',
            background: '#ffffff', border: '2px solid rgba(0,242,254,0.4)',
            boxShadow: '0 0 30px rgba(0,242,254,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {loading && !qrDataUrl ? (
              <div style={{ color: '#0f172a', fontSize: '0.8rem', textAlign: 'center' }}>Generating QR...</div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" style={{ width: '200px', height: '200px', borderRadius: '8px', display: 'block' }} />
            ) : (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', textAlign: 'center', padding: '12px' }}>
                <p style={{ margin: '0 0 8px' }}>{errorMsg || 'Failed to load QR code'}</p>
                <button
                  onClick={fetchQrToken}
                  style={{
                    background: 'rgba(0, 242, 254, 0.15)',
                    border: '1px solid #00f2fe',
                    color: '#00f2fe',
                    borderRadius: '8px',
                    padding: '4px 12px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Retry Now
                </button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '200px' }}>
            <div style={{ width: `${Math.max(0, Math.min(100, (countdown / (maxTtl || 45)) * 100))}%`, height: '4px', borderRadius: '2px', background: countdown > 10 ? '#10b981' : '#ef4444', transition: 'width 1s linear, background 0.5s', minWidth: '20px' }} />
            <p style={{ color: countdown > 10 ? '#10b981' : '#ef4444', fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>
              {countdown > 0 ? `${countdown}s` : 'Refreshing...'}
            </p>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.72rem', textAlign: 'center', margin: 0 }}>
            QR refreshes automatically every {maxTtl || 45} seconds for security.
          </p>
        </div>
      </div>
    </div>
  );
}
