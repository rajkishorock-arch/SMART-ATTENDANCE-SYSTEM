import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CreditCard, X } from 'lucide-react';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import './VirtualIdCard.css';

export default function VirtualIdCardModal({ currentUser, token, API_BASE_URL, onClose }) {
  useBodyScrollLock(true);
  const [pass, setPass] = useState(null);
  const [now, setNow] = useState(Date.now);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const cursor = useRef(null);
  const [result, setResult] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    async function poll() {
      try {
        if (cursor.current !== null && !document.hidden) {
          const response = await fetch(API_BASE_URL + '/users/students/me/qr-result', {
            headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', signal: controller.signal
          });
          if (response.ok) {
            const next = await response.json();
            if (!controller.signal.aborted && next.id > cursor.current) {
              cursor.current = next.id;
              setResult(next);
            }
          }
        }
      } catch { /* Resume polling after transient network errors. */ }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
    }
    cursor.current = null;
    setResult(null);
    poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [API_BASE_URL, token]);
  useEffect(() => {
    const controller = new AbortController();
    let timer;
    const refresh = async () => {
      setPass(null);
      setError('');
      try {
        const started = Date.now();
        const res = await fetch(API_BASE_URL + '/users/students/me/qr-token', {
          headers: { Authorization: 'Bearer ' + token }, cache: 'no-store', signal: controller.signal
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const expires = started + Number(data.expires_in) * 1000;
        if (!data.token || !Number.isFinite(expires)) throw new Error();
        const image = await QRCode.toDataURL(data.token, { width: 480, margin: 4 });
        if (controller.signal.aborted) return;
        if (expires <= Date.now()) throw new Error();
        if (cursor.current === null) cursor.current = data.result_cursor ?? 0;
        setNow(Date.now());
        setPass({ image, expires });
        timer = setTimeout(refresh, expires - Date.now());
      } catch {
        if (!controller.signal.aborted) setError('Could not load a valid pass.');
      }
    };
    refresh();
    const tick = () => setNow(Date.now());
    const clock = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      controller.abort();
      clearInterval(clock);
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [token, API_BASE_URL, revision]);
  const details = currentUser?.details || {};
  const remaining = pass ? Math.max(0, Math.ceil((pass.expires - now) / 1000)) : 0;
  return (
    <div className="id-pass-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <section className="id-pass" role="dialog" aria-modal="true" aria-labelledby="id-pass-title">
        <header><CreditCard size={30}/><div><h2 id="id-pass-title">Student ID Card</h2><span>{currentUser?.institution_name}</span></div>
          <button onClick={onClose} aria-label="Close student ID"><X size={20}/></button></header>
        <div className="id-pass-owner"><strong>{currentUser?.name}</strong>
          <span>{[details.roll || currentUser?.roll, details.dep || currentUser?.department].filter(Boolean).join(' · ')}</span>
          <small>{[details.course, details.semester && ('Semester ' + details.semester)].filter(Boolean).join(' · ')}</small>
        </div>
        {result && <div className="id-pass-result" role="status"><strong>{result.title}</strong><span>{result.message}</span></div>}
        <div className="id-pass-code">
          {remaining > 0 ? <><img src={pass.image} alt="Attendance QR pass"/><strong>{remaining}s remaining</strong><span>Show this code to the attendance scanner.</span></>
            : error ? <><span role="alert">{error}</span><button onClick={() => setRevision(n => n + 1)}>Retry</button></>
            : <span role="status">Preparing check-in code…</span>}
        </div>
      </section>
    </div>
  );
}
