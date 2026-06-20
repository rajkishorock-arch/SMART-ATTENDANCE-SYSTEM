import { useEffect, useRef } from 'react';

export default function RoboticLoginCanvas({ accent = '#00f2fe' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    let animId;
    let tick = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const nodeCount = window.innerWidth < 768 ? 22 : 40;
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00035,
      vy: (Math.random() - 0.5) * 0.00035,
      pulse: Math.random() * Math.PI * 2,
    }));

    const circuits = Array.from({ length: 6 }, (_, i) => ({
      y: 0.15 + i * 0.12,
      speed: 0.0004 + i * 0.0001,
      offset: Math.random(),
    }));

    const drawHex = (cx, cy, r) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const ang = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx + r * Math.cos(ang);
        const y = cy + r * Math.sin(ang);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const draw = () => {
      tick += 1;
      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = 'rgba(7, 11, 18, 0.22)';
      ctx.fillRect(0, 0, w, h);

      const hexR = 28;
      ctx.strokeStyle = `${accent}0a`;
      ctx.lineWidth = 1;
      for (let row = -1; row < h / (hexR * 1.5) + 1; row += 1) {
        for (let col = -1; col < w / (hexR * 1.732) + 1; col += 1) {
          const cx = col * hexR * 1.732 + (row % 2 ? hexR * 0.866 : 0);
          const cy = row * hexR * 1.5;
          drawHex(cx, cy, hexR * 0.92);
          ctx.stroke();
        }
      }

      circuits.forEach((c) => {
        const y = ((c.y + tick * c.speed + c.offset) % 1.2) * h - h * 0.1;
        ctx.strokeStyle = `${accent}18`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < w; x += 40) {
          ctx.lineTo(x + 20, y + (x % 80 === 0 ? -8 : 8));
          ctx.lineTo(x + 40, y);
        }
        ctx.stroke();

        const pulseX = ((tick * 2 + c.offset * 500) % w);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(pulseX, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += 0.03;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const dist = Math.hypot(dx, dy);
          if (dist < 120) {
            ctx.strokeStyle = `${accent}${Math.floor((1 - dist / 120) * 40).toString(16).padStart(2, '0')}`;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        const size = 2 + Math.sin(n.pulse) * 1;
        ctx.fillStyle = accent;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(n.x * w, n.y * h, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      [[0.12, 0.15], [0.88, 0.15], [0.12, 0.85], [0.88, 0.85]].forEach(([px, py], idx) => {
        const cx = px * w;
        const cy = py * h;
        const rot = tick * 0.02 + idx;
        ctx.strokeStyle = `${accent}30`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 36, rot, rot + Math.PI * 1.2);
        ctx.stroke();
      });

      const sweep = (tick * 0.015) % (Math.PI * 2);
      const cx = w / 2;
      const cy = h / 2;
      const grad = ctx.createConicGradient(sweep, cx, cy);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.08, `${accent}15`);
      grad.addColorStop(0.16, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) * 0.45, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [accent]);

  return <canvas ref={canvasRef} className="robotic-login-canvas" aria-hidden="true" />;
}
