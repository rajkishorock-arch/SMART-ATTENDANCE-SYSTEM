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

function spawnFx(container, x, y, tab) {
  const fx = TAB_FX[tab] || TAB_FX.dashboard;
  const el = document.createElement('div');
  el.className = `click-fx click-fx-${fx.shape}`;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.setProperty('--fx-color', fx.color);
  container.appendChild(el);
  setTimeout(() => el.remove(), 900);

  for (let i = 0; i < 6; i += 1) {
    const spark = document.createElement('div');
    spark.className = 'click-fx-spark';
    const angle = (Math.PI * 2 * i) / 6;
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.setProperty('--fx-color', fx.color);
    spark.style.setProperty('--fx-x', `${Math.cos(angle) * 36}px`);
    spark.style.setProperty('--fx-y', `${Math.sin(angle) * 36}px`);
    container.appendChild(spark);
    setTimeout(() => spark.remove(), 700);
  }
}

export default function ClickFxLayer({ activeTab, enabled = true }) {
  const layerRef = useRef(null);
  const tabRef = useRef(activeTab);
  tabRef.current = activeTab;

  useEffect(() => {
    if (!enabled) return undefined;

    const onPointerDown = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

      const layer = layerRef.current;
      if (!layer) return;
      spawnFx(layer, e.clientX, e.clientY, tabRef.current);
    };

    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [enabled]);

  return <div ref={layerRef} className="click-fx-layer" aria-hidden="true" />;
}
