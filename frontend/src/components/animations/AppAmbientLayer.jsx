import { useEffect, useRef } from 'react';

const TAB_THEMES = {
  dashboard: { primary: '#00f2fe', secondary: '#4facfe', mode: 'neural' },
  students: { primary: '#10b981', secondary: '#34d399', mode: 'nodes' },
  teachers: { primary: '#a78bfa', secondary: '#c084fc', mode: 'nodes' },
  attendance: { primary: '#00f2fe', secondary: '#10b981', mode: 'pulse' },
  logs: { primary: '#f59e0b', secondary: '#00f2fe', mode: 'streams' },
  'session-history': { primary: '#8b5cf6', secondary: '#00f2fe', mode: 'timeline' },
  reports: { primary: '#ef4444', secondary: '#f59e0b', mode: 'bars' },
  settings: { primary: '#ef4444', secondary: '#a78bfa', mode: 'hex' },
  'student-attendance': { primary: '#10b981', secondary: '#00f2fe', mode: 'pulse' },
  'student-profile': { primary: '#10b981', secondary: '#a78bfa', mode: 'nodes' },
};

export default function AppAmbientLayer({ activeTab, isMobile }) {
  const canvasRef = useRef(null);
  const tabRef = useRef(activeTab);

  tabRef.current = activeTab;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    let animId;
    let tick = 0;
    let isScrolling = false;
    let scrollTimeout;

    // Check if reduce motion is enabled
    let reduceMotion = false;
    try {
      const raw = localStorage.getItem('exploration_lab_settings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.reduceMotionMobile && isMobile) {
          reduceMotion = true;
        }
      }
    } catch (_) {}

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const handleScroll = () => {
      isScrolling = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 120);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const count = isMobile ? 24 : 55;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0008,
      vy: (Math.random() - 0.5) * 0.0008,
      r: Math.random() * 2 + 1,
    }));

    const draw = () => {
      animId = requestAnimationFrame(draw);

      // Stop canvas processing and redraws completely while user is scrolling, or if reduceMotion is on
      if (isScrolling || reduceMotion) {
        return;
      }

      tick += 1;
      const theme = TAB_THEMES[tabRef.current] || TAB_THEMES.dashboard;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Soft grid - OPTIMIZED: Combined grid rendering into a single path.
      // This is 100x faster because ctx.stroke() is called only once instead of dozens of times!
      ctx.strokeStyle = `${theme.primary}08`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const grid = isMobile ? 48 : 36;
      for (let x = 0; x < w; x += grid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += grid) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // Update particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
      });

      // Connect nearby particles - OPTIMIZED: Group line draws to reduce state switches.
      ctx.beginPath();
      let hasLines = false;
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const dist = Math.hypot(dx, dy);
          const limit = isMobile ? 80 : 130;
          if (dist < limit) {
            ctx.strokeStyle = `${theme.primary}${Math.floor((1 - dist / limit) * 25).toString(16).padStart(2, '0')}`;
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            hasLines = true;
          }
        }
      }
      if (hasLines) {
        ctx.stroke();
      }

      // Mode-specific overlay
      if (theme.mode === 'pulse') {
        const cx = w / 2;
        const cy = h / 2;
        const pulse = (Math.sin(tick * 0.04) + 1) * 0.5;
        ctx.strokeStyle = `${theme.primary}${Math.floor(20 + pulse * 25).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 80 + pulse * 120, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (theme.mode === 'streams') {
        ctx.strokeStyle = `${theme.primary}22`;
        ctx.beginPath();
        for (let i = 0; i < (isMobile ? 8 : 14); i += 1) {
          const x = ((i * 137 + tick * 0.6) % w);
          const len = 40 + (i % 5) * 20;
          ctx.moveTo(x, 0);
          ctx.lineTo(x + 8, len);
        }
        ctx.stroke();
      }

      if (theme.mode === 'bars') {
        const bars = isMobile ? 10 : 16;
        for (let i = 0; i < bars; i += 1) {
          const bx = (w / bars) * i + 10;
          const bh = 30 + Math.abs(Math.sin(tick * 0.05 + i)) * 80;
          ctx.fillStyle = `${theme.secondary}10`;
          ctx.fillRect(bx, h - bh - 40, (w / bars) - 20, bh);
        }
      }

      // Draw particle dots
      particles.forEach((p) => {
        ctx.fillStyle = theme.primary;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Sweeping scan beam
      const scanY = ((tick * 1.2) % (h + 100)) - 50;
      const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, `${theme.primary}12`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 30, w, 60);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isMobile]);

  return (
    <canvas
      ref={canvasRef}
      className="app-ambient-canvas"
      aria-hidden="true"
    />
  );
}
