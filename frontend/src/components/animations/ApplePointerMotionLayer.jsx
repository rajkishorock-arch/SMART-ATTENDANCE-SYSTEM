import { useEffect, useRef } from 'react';

const MAX_RIPPLES = 6;
const INTERACTIVE_SELECTOR = [
  'button:not(:disabled)',
  'a[href]',
  '.golden-os-list-row',
  '.golden-os-mode-card',
  '.golden-os-feedback-filter-btn',
  '.golden-os-segmented-btn',
  '.golden-os-primary-action',
  '.nav-item',
  '.bottom-nav-item',
  '.surface-card-hover',
].join(', ');

/**
 * Global macOS / Apple-inspired smooth pointer glide & tactile tap feedback layer.
 * Runs exclusively on GPU-composited properties (transform, opacity) and sleeps at 0% CPU when idle.
 */
export default function ApplePointerMotionLayer() {
  const layerRef = useRef(null);
  const haloRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return undefined;

    const layer = layerRef.current;
    const halo = haloRef.current;
    if (!layer) return undefined;

    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

    let targetX = -200;
    let targetY = -200;
    let curX = -200;
    let curY = -200;
    let rafId = 0;
    let fadeTimer = 0;
    let activeTarget = null;

    const stopLoop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const tick = () => {
      const dx = targetX - curX;
      const dy = targetY - curY;
      curX += dx * 0.22;
      curY += dy * 0.22;

      if (halo) {
        halo.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate(-50%, -50%)`;
      }

      if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) {
        curX = targetX;
        curY = targetY;
        if (halo) {
          halo.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate(-50%, -50%)`;
        }
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    const onPointerMove = (e) => {
      if (!hasFinePointer || e.pointerType !== 'mouse') return;
      if (e.target instanceof Element && e.target.closest('.clean-camera-overlay')) {
        if (halo) halo.style.opacity = '0';
        return;
      }

      targetX = e.clientX;
      targetY = e.clientY;
      if (curX < -100) {
        curX = targetX;
        curY = targetY;
      }

      if (halo) {
        halo.style.opacity = '1';
      }
      if (!rafId) {
        rafId = requestAnimationFrame(tick);
      }

      clearTimeout(fadeTimer);
      fadeTimer = setTimeout(() => {
        if (halo) halo.style.opacity = '0';
      }, 1800);

      // Update local spotlight coordinates on hovered interactive controls
      if (e.target instanceof Element) {
        const interactive = e.target.closest(INTERACTIVE_SELECTOR);
        if (activeTarget && activeTarget !== interactive) {
          activeTarget.style.removeProperty('--apple-mx');
          activeTarget.style.removeProperty('--apple-my');
        }
        activeTarget = interactive;
        if (interactive) {
          const rect = interactive.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const pctX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const pctY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
            interactive.style.setProperty('--apple-mx', `${pctX.toFixed(1)}%`);
            interactive.style.setProperty('--apple-my', `${pctY.toFixed(1)}%`);
          }
        }
      }
    };

    const onPointerLeave = () => {
      if (halo) halo.style.opacity = '0';
      if (activeTarget) {
        activeTarget.style.removeProperty('--apple-mx');
        activeTarget.style.removeProperty('--apple-my');
        activeTarget = null;
      }
    };

    const onPointerDown = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.clean-camera-overlay')) return;

      // Clean excess stale ripples if user taps rapidly
      while (layer.childElementCount > MAX_RIPPLES) {
        const firstDynamic = layer.querySelector('.apple-tap-ripple');
        if (firstDynamic) firstDynamic.remove();
        else break;
      }

      const ripple = document.createElement('span');
      const isControl = Boolean(target.closest(INTERACTIVE_SELECTOR));
      ripple.className = isControl ? 'apple-tap-ripple is-control' : 'apple-tap-ripple';
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      layer.appendChild(ripple);

      const cleanup = () => ripple.remove();
      ripple.addEventListener('animationend', cleanup, { once: true });
      setTimeout(cleanup, 560);

      if (halo && hasFinePointer && e.pointerType === 'mouse') {
        halo.classList.remove('is-pressed');
        // Force concise single frame pulse reset
        void halo.offsetWidth;
        halo.classList.add('is-pressed');
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, { passive: true });

    return () => {
      stopLoop();
      clearTimeout(fadeTimer);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onPointerLeave);
      document.removeEventListener('pointerdown', onPointerDown);
      if (activeTarget) {
        activeTarget.style.removeProperty('--apple-mx');
        activeTarget.style.removeProperty('--apple-my');
      }
    };
  }, []);

  return (
    <div ref={layerRef} className="apple-motion-layer" aria-hidden="true">
      <div ref={haloRef} className="apple-pointer-halo" />
    </div>
  );
}
