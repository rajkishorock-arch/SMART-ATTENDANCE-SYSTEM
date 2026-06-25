import { APP_VERSION, getVersionStatusLabel } from '../utils/versionManager';

export default function VersionBadge({ serverLatest, updateActive, compact = false, onCheckUpdate }) {
  const status = getVersionStatusLabel(serverLatest, updateActive);
  const toneColors = {
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#10b981' },
    warn: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', color: '#fbbf24' },
  };
  const colors = toneColors[status.tone] || toneColors.success;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onCheckUpdate}
        title={`App version ${APP_VERSION} — ${status.sub}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '999px',
          border: `1px solid ${colors.border}`,
          background: colors.bg,
          color: colors.color,
          fontSize: '0.72rem',
          fontWeight: 700,
          cursor: onCheckUpdate ? 'pointer' : 'default',
          fontFamily: 'monospace',
        }}
      >
        <span>{status.tone === 'success' ? '✓' : '↑'}</span>
        {status.label}
      </button>
    );
  }

  return (
    <div
      style={{
        padding: '14px 16px',
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.95rem' }}>
          {status.tone === 'success' ? '✅ You are on the latest version' : '⬆️ New update available'}
        </div>
        <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px' }}>
          Running <strong style={{ color: colors.color }}>v{APP_VERSION}</strong>
          {serverLatest && updateActive ? ` · Server release v${serverLatest}` : ''}
          {' · '}{status.sub}
        </div>
      </div>
      {onCheckUpdate && (
        <button
          type="button"
          className="btn-secondary"
          onClick={onCheckUpdate}
          style={{ padding: '8px 14px', fontSize: '0.78rem' }}
        >
          Check for updates
        </button>
      )}
    </div>
  );
}
