import React, { useState, useEffect, useCallback, useRef } from 'react';
import { School, RefreshCw, CheckCircle2, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

export default function VirtualIdCardModal({ currentUser, token, API_BASE_URL, onClose }) {
  // Prevent background scrolling while modal is open
  useBodyScrollLock(true);

  const [qrToken, setQrToken] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [countdown, setCountdown] = useState(45);
  const [maxTtl, setMaxTtl] = useState(45);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const isFetchingRef = useRef(false);

  // Generate QR Code locally in 0ms using client-side library
  const generateLocalQr = useCallback(async (tokenString) => {
    try {
      const dataUrl = await QRCode.toDataURL(tokenString, {
        width: 320,
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
      // Safe fallback
      setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(tokenString)}&bgcolor=ffffff&color=0f172a&margin=10`);
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
        // Instantly generate QR locally
        await generateLocalQr(freshToken);
      } else {
        setQrToken(null);
        setQrDataUrl(null);
        setErrorMsg('Unable to generate dynamic attendance pass');
      }
    } catch (e) {
      console.error('QR token fetch failed', e);
      setQrToken(null);
      setQrDataUrl(null);
      setErrorMsg('Network error. Check connection & retry.');
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
  const studentDep = detail.dep || currentUser?.dep || currentUser?.department || 'General Academic';
  const studentCourse = detail.course || currentUser?.course || 'B.Tech';
  const studentSemester = detail.semester || currentUser?.semester || '1st Sem';
  const studentMentor = detail.teacher || currentUser?.teacher || 'Assigned Faculty';
  const institutionName = currentUser?.institution_name || 'Smart Attendance System';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
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
          borderRadius: '24px',
          width: '100%',
          maxWidth: '390px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          maxHeight: '92vh'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Institutional Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '16px 20px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0
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
            onClick={onClose}
            aria-label="Close Virtual ID Card"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 700,
              flexShrink: 0,
              transition: 'background 0.15s ease'
            }}
          >
            ✕
          </button>
        </div>

        {/* Student Name & Roll Ribbon */}
        <div style={{ padding: '14px 20px 8px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            {currentUser?.name || 'Student Name'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
              Roll: {studentRoll}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              {studentDep}
            </span>
          </div>
        </div>

        {/* Hero Section: Prominent, High-Contrast QR Code for Easy Kiosk / Teacher Scanning */}
        <div style={{ padding: '14px 20px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <div
            style={{
              width: '230px',
              height: '230px',
              background: '#ffffff',
              borderRadius: '16px',
              border: '2px solid #2563eb',
              padding: '8px',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {/* Viewfinder Target Corners */}
            <div style={{ position: 'absolute', top: '5px', left: '5px', width: '16px', height: '16px', borderTop: '3px solid #2563eb', borderLeft: '3px solid #2563eb', borderTopLeftRadius: '6px' }} />
            <div style={{ position: 'absolute', top: '5px', right: '5px', width: '16px', height: '16px', borderTop: '3px solid #2563eb', borderRight: '3px solid #2563eb', borderTopRightRadius: '6px' }} />
            <div style={{ position: 'absolute', bottom: '5px', left: '5px', width: '16px', height: '16px', borderBottom: '3px solid #2563eb', borderLeft: '3px solid #2563eb', borderBottomLeftRadius: '6px' }} />
            <div style={{ position: 'absolute', bottom: '5px', right: '5px', width: '16px', height: '16px', borderBottom: '3px solid #2563eb', borderRight: '3px solid #2563eb', borderBottomRightRadius: '6px' }} />

            {loading && !qrDataUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#2563eb', fontSize: '0.82rem', fontWeight: 600 }}>
                <RefreshCw size={24} className="spin-anim" />
                <span>Generating Instant QR...</span>
              </div>
            ) : qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Attendance QR Pass"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  display: 'block'
                }}
              />
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
          <div style={{ width: '230px', marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
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
          </div>

          {/* Clean Instruction Text with No Overlap */}
          <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', marginTop: '8px', lineHeight: 1.3 }}>
            Aim at kiosk camera or show to teacher for touchless check-in
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
            textAlign: 'center',
            marginTop: 'auto',
            flexShrink: 0
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
