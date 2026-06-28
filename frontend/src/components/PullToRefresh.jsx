import { useRef, useState, useCallback } from 'react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current && e.touches[0].clientY - startY.current > 80 && window.scrollY <= 0) {
      setPulling(true);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pulling && onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(false);
    startY.current = 0;
  }, [pulling, onRefresh]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pulling || refreshing) && (
        <div className="pull-to-refresh-indicator">
          {refreshing ? '↻ Refreshing...' : '↓ Release to refresh'}
        </div>
      )}
      {children}
    </div>
  );
}
