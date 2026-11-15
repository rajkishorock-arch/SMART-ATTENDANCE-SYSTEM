import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { School, RefreshCw } from 'lucide-react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

export default function VirtualIdCardModal({ currentUser, token, API_BASE_URL, onClose }) {
  // Lock body scroll when modal is active
  useBodyScrollLock(true);

  // Instant fallback token to guarantee 0ms QR generation on first frame
  const initialToken = useMemo(() => {
    try {
      const cached = sessionStorage.getItem('last_student_qr_token');
      if (cached) return cached;
    } catch { /* ignore */ }
    return `STUDENT_${currentUser?.id || currentUser?.roll || 'VERIFIED'}_${currentUser?.email || 'PASS'}`;
  }, [currentUser]);

  const [qrToken, setQrToken] = useState(initialToken);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [countdown, setCountdown] = useState(45);
  const [maxTtl, setMaxTtl] = useState(45);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const isFetchingRef = useRef(false);

  // Instant local QR code generator (0ms, client-side)
  const generateLocalQr = useCallback(async (tokenString) => {
    if (!tokenString) return;
    try {
      const dataUrl = await QRCode.toDataURL(tokenString, {
        width: 260,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('Local QR rendering error:', err);
      setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(tokenString)}&bgcolor=ffffff&color=0f172a&margin=10`);
    }
  }, []);

  // Generate initial QR immediately on mount (0ms latency, eliminates "Generating QR..." delay)
  useEffect(() => {
    if (initialToken) {
      generateLocalQr(initialToken);
    }
  }, [initialToken, generateLocalQr]);

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
        try { sessionStorage.setItem('last_student_qr_token', freshToken); } catch { /* ignore */ }
        await generateLocalQr(freshToken);
      } else {
        if (!qrToken) {
          setErrorMsg('Unable to generate dynamic attendance pass');
        }
      }
    } catch (e) {
      console.error('QR token fetch failed', e);
      if (!qrToken) {
        setErrorMsg('Network error. Check connection & retry.');
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [token, API_BASE_URL, generateLocalQr, qrToken]);

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
  const studentDep = detail.dep || currentUser?.dep || currentUser?.department || 'CE';
  const studentCourse = detail.course || currentUser?.course || 'B.Tech';
  const studentSemester = detail.semester || currentUser?.semester || '1st';
  const studentMentor = detail.teacher || currentUser?.teacher || 'Assigned Faculty';
  const institutionName = currentUser?.institution_name || 'Default Institution';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
        touchAction: 'none'
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        {/* Top Institutional Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '16px 18px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <School size={20} color="#ffffff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#bfdbfe' }}>
                STUDENT DIGITAL ID PASS
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {institutionName}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            ✕
          </button>
        </div>

        {/* Student Name & Roll Callout */}
        <div style={{ padding: '16px 20px 8px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>
            {currentUser?.name || 'Enrolled Student'}
          </h2>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            Roll: <span style={{ color: '#0f172a', fontWeight: 700 }}>{studentRoll}</span> · <span>{studentDep}</span>
          </div>
        </div>

        {/* High-Contrast Large QR Container (Optimized for Optical Kiosks) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '4px 20px 14px'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '220px',
              height: '220px',
              padding: '12px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Viewfinder Target Corner Accents for instant scanning */}
            <div style={{ position: 'absolute', top: '6px', left: '6px', width: '16px', height: '16px', borderTop: '3px solid #2563eb', borderLeft: '3px solid #2563eb', borderTopLeftRadius: '6px' }} />
            <div style={{ position: 'absolute', top: '6px', right: '6px', width: '16px', height: '16px', borderTop: '3px solid #2563eb', borderRight: '3px solid #2563eb', borderTopRightRadius: '6px' }} />
            <div style={{ position: 'absolute', bottom: '6px', left: '6px', width: '16px', height: '16px', borderBottom: '3px solid #2563eb', borderLeft: '3px solid #2563eb', borderBottomLeftRadius: '6px' }} />
            <div style={{ position: 'absolute', bottom: '6px', right: '6px', width: '16px', height: '16px', borderBottom: '3px solid #2563eb', borderRight: '3px solid #2563eb', borderBottomRightRadius: '6px' }} />

            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Attendance QR Pass"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  imageRendering: 'crisp-edges',
                  display: 'block'
                }}
              />
            ) : loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#2563eb', fontSize: '0.82rem', fontWeight: 600 }}>
                <RefreshCw size={24} className="spin-anim" />
                <span>Loading QR...</span>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px', color: '#dc2626' }}>
                <p style={{ margin: '0 0 8px', fontSize: '0.78rem', fontWeight: 600 }}>{errorMsg || 'Failed to load QR'}</p>
                <button
                  type="button"
                  onClick={fetchQrToken}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Tap to Retry
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Auto-Refresh Progress Indicator */}
          <div style={{ width: '240px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                <span>Live Encrypted QR</span>
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: countdown <= 10 ? '#dc2626' : '#2563eb' }}>
                {countdown}s remaining
              </span>
            </div>
            <div style={{ width: '100%', height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.max(0, Math.min(100, (countdown / (maxTtl || 45)) * 100))}%`,
                  background: countdown <= 10 ? '#dc2626' : 'linear-gradient(90deg, #2563eb, #10b981)',
                  borderRadius: '999px',
                  transition: 'width 1s linear'
                }}
              />
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', textAlign: 'center', marginTop: '4px' }}>
              Aim at kiosk camera or show to teacher for touchless check-in
            </div>
          </div>
        </div>

        {/* Compact Bottom Details: Small & Clean ("niche me chhota sa details ho") */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            textAlign: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: '0.64rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Course</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {studentCourse}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.64rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Semester</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {studentSemester}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.64rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Mentor</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {studentMentor}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
