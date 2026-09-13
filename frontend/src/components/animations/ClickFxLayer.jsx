import { useEffect, useRef } from 'react';

const TAB_FX = {
  dashboard: { color: '#00f2fe', shape: 'ring' },
  students: { color: '#10b981', shape: 'burst' },
  teachers: { color: '#a78bfa', shape: 'burst' },
  attendance: { color: '#00f2fe', shape: 'scan' },
  logs: { color: '#f59e0b', shape: 'data' },
  'session-history': { color: '#8b5cf6', shape: 'ring' },
  reports: { color: '#ef4444', shape: 'data' },
  settings: { color: '#ef4444', shape: 'hex' },
  'student-attendance': { color: '#10b981', shape: 'ring' },
  'student-profile': { color: '#10b981', shape: 'burst' },
};

function spawnFx(container, x, y, tab, isMobile) {
  const fx = TAB_FX[tab] || TAB_FX.dashboard;
  const el = document.createElement('div');
  el.className = `click-fx click-fx-${fx.shape}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.setProperty('--fx-color', fx.color);
  container.appendChild(el);
  setTimeout(() => el.remove(), 600);

  // Skip sparks on mobile to minimize DOM thrashing
  if (!isMobile) {
    for (let i = 0; i < 4; i += 1) {
      const spark = document.createElement('div');
      spark.className = 'click-fx-spark';
      const angle = (Math.PI * 2 * i) / 4;
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty('--fx-color', fx.color);
      spark.style.setProperty('--fx-x', `${Math.cos(angle) * 24}px`);
      spark.style.setProperty('--fx-y', `${Math.sin(angle) * 24}px`);
      container.appendChild(spark);
      setTimeout(() => spark.remove(), 450);
    }
  }
}

export default function ClickFxLayer({ activeTab, enabled = true }) {
  const layerRef = useRef(null);
  const tabRef = useRef(activeTab);

  useEffect(() => {
    tabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!enabled) return undefined;

    // Check system reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    const isMobile = window.innerWidth <= 768;

    const onPointerDown = (e) => {
      // Silence click effects during scanner mode to guarantee zero dropped frames
      if (tabRef.current === 'attendance') return;

      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('input, textarea, select, [contenteditable="true"], .clean-camera-overlay')) return;

      const layer = layerRef.current;
      if (!layer) return;
      spawnFx(layer, e.clientX, e.clientY, tabRef.current, isMobile);
    };

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [enabled]);

  return <div ref={layerRef} className="click-fx-layer" aria-hidden="true" />;
}
