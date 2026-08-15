import React from 'react';

/**
 * Reusable Skeleton loader for smooth loading states
 * type: 'card' | 'stat' | 'row' | 'chart' | 'avatar' | 'text'
 */
export default function SkeletonLoader({ type = 'card', count = 1, className = '', height, width, style = {} }) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (type === 'stat') {
    return (
      <div className={`skeleton-stat-grid ${className}`}>
        {items.map((i) => (
          <div key={i} className="skeleton-stat-card" style={style}>
            <div className="skeleton-shimmer skeleton-title" style={{ width: '40%', height: '12px', marginBottom: '8px' }} />
            <div className="skeleton-shimmer skeleton-number" style={{ width: '60%', height: '32px', marginBottom: '10px' }} />
            <div className="skeleton-shimmer skeleton-badge" style={{ width: '50%', height: '18px', borderRadius: '10px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'row') {
    return (
      <div className={`skeleton-row-container ${className}`}>
        {items.map((i) => (
          <div key={i} className="skeleton-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', ...style }}>
            <div className="skeleton-shimmer" style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="skeleton-shimmer" style={{ width: '65%', height: '14px', borderRadius: '4px' }} />
              <div className="skeleton-shimmer" style={{ width: '35%', height: '10px', borderRadius: '4px' }} />
            </div>
            <div className="skeleton-shimmer" style={{ width: '60px', height: '22px', borderRadius: '8px' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className={`skeleton-chart-card skeleton-shimmer ${className}`} style={{ height: height || '280px', width: width || '100%', borderRadius: '16px', ...style }}>
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between' }}>
          <div className="skeleton-shimmer" style={{ width: '140px', height: '16px', borderRadius: '4px' }} />
          <div className="skeleton-shimmer" style={{ width: '100px', height: '24px', borderRadius: '12px' }} />
        </div>
      </div>
    );
  }

  if (type === 'avatar') {
    return (
      <div
        className={`skeleton-shimmer ${className}`}
        style={{
          width: width || '44px',
          height: height || '44px',
          borderRadius: '50%',
          ...style,
        }}
      />
    );
  }

  return (
    <div className={`skeleton-container ${className}`}>
      {items.map((i) => (
        <div
          key={i}
          className="skeleton-shimmer skeleton-generic-card"
          style={{
            height: height || '120px',
            width: width || '100%',
            borderRadius: '14px',
            marginBottom: count > 1 ? '12px' : '0',
            ...style,
          }}
        />
      ))}
    </div>
  );
}
