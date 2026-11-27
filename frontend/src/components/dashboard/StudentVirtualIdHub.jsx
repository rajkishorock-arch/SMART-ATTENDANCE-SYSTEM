import { useEffect, useRef, useState, useCallback } from 'react';
import {
  CreditCard,
  QrCode,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { getInitials } from '../../utils/attendanceDateUtils';
import { getCachedStudentQrPass, prefetchStudentQrPass } from '../../utils/qrPassPrefetch';

export default function StudentVirtualIdHub({
  currentUser,
  token,
  API_BASE_URL,
  playCyberSound = () => {},
}) {
  const [pass, setPass] = useState(() => getCachedStudentQrPass(token));
  const [now, setNow] = useState(Date.now);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const cursorRef = useRef(pass?.resultCursor ?? null);

  const loadFreshPass = useCallback(async ({ force = false, silent = false } = {}) => {
    if (!token || !API_BASE_URL) return;
    if (!silent) setIsRefreshing(true);
    setError('');
    try {
      const nextPass = await prefetchStudentQrPass(API_BASE_URL, token, { force });
      if (nextPass) {
        if (cursorRef.current === null) {
          cursorRef.current = nextPass.resultCursor ?? 0;
        }
        setPass(nextPass);
        setNow(Date.now());
      }
    } catch {
      setError('Unable to load check-in QR. Tap Refresh Code to retry.');
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [API_BASE_URL, token]);

  // Initial sync & smooth auto-renewal before expiration (never blanks already valid QR)
  useEffect(() => {
    let cancelled = false;
    const cached = getCachedStudentQrPass(token);
    if (cached && cached.expiresAt > Date.now() + 18000) {
      if (cursorRef.current === null) {
        cursorRef.current = cached.resultCursor ?? 0;
      }
    } else if (token && API_BASE_URL) {
      prefetchStudentQrPass(API_BASE_URL, token, { force: true })
        .then(nextPass => {
          if (cancelled || !nextPass) return;
          if (cursorRef.current === null) {
            cursorRef.current = nextPass.resultCursor ?? 0;
          }
          setError('');
          setPass(nextPass);
          setNow(Date.now());
        })
        .catch(() => {
          if (!cancelled) setError('Unable to load check-in QR. Tap Refresh Code to retry.');
        });
    }

    const tickInterval = setInterval(() => {
      if (cancelled) return;
      setNow(Date.now());
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(tickInterval);
    };
  }, [token, API_BASE_URL]);

  // Trigger silent renewal when <= 5s left so scan stays uninterrupted
  const remaining = pass ? Math.max(0, Math.ceil((pass.expiresAt - now) / 1000)) : 0;
  useEffect(() => {
    if (!token || !API_BASE_URL) return undefined;
    let cancelled = false;
    if (pass && remaining > 0 && remaining <= 5 && !isRefreshing) {
      prefetchStudentQrPass(API_BASE_URL, token, { force: true })
        .then(nextPass => {
          if (cancelled || !nextPass) return;
          if (cursorRef.current === null) {
            cursorRef.current = nextPass.resultCursor ?? 0;
          }
          setError('');
          setPass(nextPass);
          setNow(Date.now());
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [remaining, pass, isRefreshing, token, API_BASE_URL]);

  // Poll for live check-in confirmation
  useEffect(() => {
    if (!token || !API_BASE_URL) return undefined;
    const controller = new AbortController();
    let timer;
    async function poll() {
      try {
        if (cursorRef.current !== null && !document.hidden) {
          const response = await fetch(`${API_BASE_URL}/users/students/me/qr-result`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
            signal: controller.signal,
          });
          if (response.ok) {
            const next = await response.json();
            if (!controller.signal.aborted && next.id > cursorRef.current) {
              cursorRef.current = next.id;
              setResult(next);
              if (playCyberSound) playCyberSound('success');
            }
          }
        }
      } catch {
        // transient network error ignored cleanly
      }
      if (!controller.signal.aborted) {
        timer = setTimeout(poll, 2000);
      }
    }
    poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [API_BASE_URL, token, playCyberSound]);

  const details = currentUser?.details || {};
  const studentRoll = details.roll || currentUser?.roll || 'N/A';
  const studentDept = details.dep || currentUser?.dep || currentUser?.department || 'General';
  const studentCourse = [details.course, details.semester ? `Semester ${details.semester}` : ''].filter(Boolean).join(' · ');

  return (
    <div className="golden-os-page-bottom-safe" style={{ width: '100%' }}>
      <div className="golden-os-window" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Institutional Ribbon */}
        <div
          style={{
            background: 'linear-gradient(135deg, #785927 0%, #5c4218 100%)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            color: '#fffdf8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <CreditCard size={16} color="#fffdf8" style={{ flexShrink: 0 }} />
            <span style={{ color: '#fffdf8', fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.institution_name || 'Smart Campus'} · Official Digital ID Pass
            </span>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 800, color: '#fde68a', flexShrink: 0 }}>
            <ShieldCheck size={14} />
            VERIFIED
          </span>
        </div>

        {/* Responsive Dual-Column Layout (Mobile: clean stacked, Laptop: side-by-side organized grid) */}
        <div
          style={{
            padding: '18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '18px',
            alignItems: 'center',
          }}
        >
          {/* Left Panel: Organized Student Identity Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '64px',
                  height: '72px',
                  borderRadius: '14px',
                  background: 'linear-gradient(145deg, #fbf3df, #ead7aa)',
                  border: '1.5px solid #cbb179',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  fontWeight: 900,
                  color: '#5c4218',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {currentUser?.photo || currentUser?.profile_pic ? (
                  <img
                    src={currentUser.photo || currentUser.profile_pic}
                    alt={currentUser?.name || 'Student'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  getInitials(currentUser?.name, 'ST')
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#785927', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Student Holder
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#25231f', marginTop: '2px', overflowWrap: 'anywhere' }}>
                  {currentUser?.name || 'Enrolled Student'}
                </div>
              </div>
            </div>

            <div className="golden-os-form-section" style={{ gap: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f2ead9', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Roll Number</span>
                <span style={{ color: '#684c20', fontWeight: 800 }}>{studentRoll}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: studentCourse ? '1px solid #f2ead9' : 'none', fontSize: '0.84rem' }}>
                <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Branch / Dept</span>
                <span style={{ color: '#25231f', fontWeight: 700 }}>{studentDept}</span>
              </div>
              {studentCourse && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.84rem' }}>
                  <span style={{ color: '#6b5b3e', fontWeight: 600 }}>Program</span>
                  <span style={{ color: '#25231f', fontWeight: 700 }}>{studentCourse}</span>
                </div>
              )}
            </div>

            {result && (
              <div role="status" className="feedback-banner is-success">
                <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                  {result.title} {result.message ? `— ${result.message}` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Pure High-Contrast Instant QR Scanner Box */}
          <div
            className="golden-os-inset-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '20px 16px',
              gap: '12px',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                padding: '14px',
                borderRadius: '16px',
                border: '1.5px solid #d9c496',
                boxShadow: '0 6px 20px rgba(89, 64, 25, 0.08)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '220px',
                minHeight: '220px',
              }}
            >
              {pass?.image && remaining > 0 ? (
                <img
                  src={pass.image}
                  alt="Attendance QR Pass"
                  style={{
                    width: 'min(240px, 60vw)',
                    height: 'auto',
                    aspectRatio: '1',
                    display: 'block',
                    imageRendering: 'pixelated',
                  }}
                />
              ) : error ? (
                <div role="alert" style={{ padding: '16px', maxWidth: '210px', fontSize: '0.82rem', color: '#b91c1c', fontWeight: 600 }}>
                  {error}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#785927' }}>
                  <QrCode size={40} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Syncing QR Pass...</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem', fontWeight: 800, color: remaining > 0 ? '#047857' : '#6b5b3e' }}>
                <Clock size={15} />
                {remaining > 0 ? `Valid for ${remaining}s` : isRefreshing ? 'Refreshing...' : 'Tap Refresh Code'}
              </span>

              <button
                type="button"
                onClick={() => {
                  if (playCyberSound) playCyberSound('click');
                  loadFreshPass({ force: true, silent: false });
                }}
                disabled={isRefreshing}
                className="golden-os-feedback-filter-btn"
                style={{ padding: '7px 12px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} className={isRefreshing ? 'spin-icon' : ''} />
                <span>Refresh Code</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
