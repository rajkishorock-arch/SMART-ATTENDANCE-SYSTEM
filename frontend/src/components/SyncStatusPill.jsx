import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { offlineAttendanceQueue } from '../services/offlineAttendanceQueue';
import { t } from '../utils/i18n';

export default function SyncStatusPill({
  apiBaseUrl,
  token,
  institutionId = 1,
  lang = 'en',
  onSyncSuccess
}) {
  const [queue, setQueue] = useState(() => offlineAttendanceQueue.getQueue());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    return localStorage.getItem('last_successful_sync_time') || '';
  });
  const [showSheet, setShowSheet] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    // Subscribe to offline queue changes
    const unsubscribe = offlineAttendanceQueue.subscribe((updated) => {
      setQueue(updated);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const pendingCount = queue.filter(item => item.sync_status === 'PENDING').length;

  const handleManualSync = async (e) => {
    if (e) e.stopPropagation();
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    setSyncMessage(t('syncing', lang));
    try {
      const result = await offlineAttendanceQueue.flushQueue(apiBaseUrl, token, institutionId);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(nowStr);
      localStorage.setItem('last_successful_sync_time', nowStr);
      setSyncMessage(result.synced > 0 ? `${result.synced} records synced!` : t('all_synced', lang));
      if (onSyncSuccess) onSyncSuccess();
      setTimeout(() => setSyncMessage(''), 3000);
    } catch {
      setSyncMessage('Sync failed. Will retry automatically.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      {/* ── Persistent Status Pill ── */}
      <div
        className="sync-status-pill-container"
        onClick={() => setShowSheet(true)}
        role="button"
        tabIndex={0}
        aria-label="Attendance Sync Status"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 12px',
          borderRadius: 'var(--radius-full)',
          background: pendingCount > 0 ? 'rgba(245, 158, 11, 0.15)' : !isOnline ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${pendingCount > 0 ? 'rgba(245, 158, 11, 0.4)' : !isOnline ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.35)'}`,
          color: pendingCount > 0 ? '#fbbf24' : !isOnline ? '#f87171' : '#34d399',
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
          userSelect: 'none',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          transition: 'all var(--transition-fast)'
        }}
      >
        {!isOnline ? (
          <CloudOff size={14} color="#f87171" />
        ) : pendingCount > 0 ? (
          <Cloud size={14} color="#fbbf24" />
        ) : (
          <CheckCircle2 size={14} color="#34d399" />
        )}

        <span>
          {!isOnline
            ? `${pendingCount} ${t('saved_on_device', lang)}`
            : pendingCount > 0
              ? `${pendingCount} ${lang === 'hi' ? 'लंबित सिंक' : 'pending sync'}`
              : lastSyncTime
                ? `${t('synced_to_cloud', lang)} (${lastSyncTime})`
                : t('synced_to_cloud', lang)}
        </span>

        {isOnline && pendingCount > 0 && (
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            style={{
              background: 'rgba(245, 158, 11, 0.25)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              color: '#fff',
              padding: '2px 8px',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              minHeight: '26px'
            }}
            title="Sync records to server now"
          >
            <RefreshCw size={11} className={isSyncing ? 'spin-fast' : ''} />
            {isSyncing ? '' : t('sync_now', lang)}
          </button>
        )}
      </div>

      {/* ── Pending Queue Detail Sheet / Modal ── */}
      {showSheet && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 8, 17, 0.8)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowSheet(false)}
        >
          <div
            className="surface-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              animation: 'scaleIn 0.2s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cloud size={20} color="var(--color-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                  {lang === 'hi' ? 'ऑफलाइन डेटा और सिंक स्थिति' : 'Offline Attendance & Sync'}
                </h3>
              </div>
              <button
                onClick={() => setShowSheet(false)}
                className="clean-back-btn"
                style={{ width: '36px', height: '36px' }}
                aria-label="Close sheet"
              >
                <X size={18} />
              </button>
            </div>

            {/* Offline Guarantee Notice */}
            <div style={{
              background: 'rgba(14, 165, 233, 0.1)',
              border: '1px solid rgba(14, 165, 233, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              marginBottom: '16px',
              fontSize: '0.8rem',
              color: 'var(--color-text-main)',
              lineHeight: 1.4
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={16} color="#0ea5e9" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{t('offline_guarantee', lang)}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                {pendingCount > 0 ? `${pendingCount} ${t('pending_sync_count', lang, { count: pendingCount })}` : t('all_synced', lang)}
              </span>

              {isOnline && pendingCount > 0 && (
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="btn-primary"
                  style={{ minHeight: '38px', padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  <RefreshCw size={13} className={isSyncing ? 'spin-fast' : ''} />
                  {isSyncing ? t('syncing', lang) : t('sync_now', lang)}
                </button>
              )}
            </div>

            {syncMessage && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                marginBottom: '12px'
              }}>
                {syncMessage}
              </div>
            )}

            {/* Pending List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px' }}>
              {queue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px', display: 'block' }} />
                  {lang === 'hi' ? 'कोई लंबित रिकॉर्ड नहीं है। आपका सारा डेटा सुरक्षित है।' : 'No records waiting to sync. All attendance is safe in the cloud.'}
                </div>
              ) : (
                queue.map((item, idx) => (
                  <div
                    key={item.localId || idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{item.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        {item.roll} · {item.time} {item.date ? `· ${item.date}` : ''}
                      </div>
                    </div>
                    <span className={`status-pill ${item.sync_status === 'SYNCED' ? 'status-pill-success' : 'status-pill-warning'}`} style={{ fontSize: '0.7rem' }}>
                      {item.sync_status === 'SYNCED' ? t('synced_to_cloud', lang) : t('saved_on_device', lang)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSheet(false)}
                className="btn-secondary"
                style={{ minHeight: '38px', padding: '6px 18px', fontSize: '0.82rem' }}
              >
                {t('close', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
