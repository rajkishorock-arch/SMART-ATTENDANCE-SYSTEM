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

    // Floating neural nodes
    const nodeCount = window.innerWidth < 768 ? 35 : 65;
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00045,
      vy: (Math.random() - 0.5) * 0.00045,
      size: Math.random() * 2.2 + 1.2,
      pulse: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.03 + 0.01
    }));

    // Floating Cyber Energy Orbs
    const orbs = [
      { x: 0.2, y: 0.25, r: 280, color: accent, speedX: 0.0002, speedY: 0.00015 },
      { x: 0.8, y: 0.7, r: 340, color: '#a78bfa', speedX: -0.00015, speedY: -0.0002 },
      { x: 0.5, y: 0.85, r: 250, color: '#10b981', speedX: 0.0001, speedY: -0.0001 }
    ];

    // Data laser streams
    const laserStreams = Array.from({ length: 8 }, (_, i) => ({
      y: 0.1 + i * 0.11,
      speed: 0.0005 + i * 0.00015,
      length: 120 + i * 30,
      offset: Math.random() * Math.PI * 2
    }));

    const draw = () => {
      tick += 1;
      const w = canvas.width;
      const h = canvas.height;

      // Deep space rich background clearing
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // Render glowing volumetric nebula orbs
      orbs.forEach((orb) => {
        orb.x += orb.speedX;
        orb.y += orb.speedY;
        if (orb.x < 0.1 || orb.x > 0.9) orb.speedX *= -1;
        if (orb.y < 0.1 || orb.y > 0.9) orb.speedY *= -1;

        const cx = orb.x * w;
        const cy = orb.y * h;
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, orb.r);
        grad.addColorStop(0, `${orb.color}25`);
        grad.addColorStop(0.5, `${orb.color}0c`);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, orb.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Render Data Laser Streams
      laserStreams.forEach((stream) => {
        const streamY = stream.y * h + Math.sin(tick * 0.01 + stream.offset) * 15;
        const streamX = ((tick * 2.5 + stream.offset * w) % (w + stream.length)) - stream.length;

        const grad = ctx.createLinearGradient(streamX, streamY, streamX + stream.length, streamY);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.7, `${accent}40`);
        grad.addColorStop(1, '#ffffff');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(streamX, streamY);
        ctx.lineTo(streamX + stream.length, streamY);
        ctx.stroke();
      });

      // Update node positions
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        n.pulse += n.speed;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });

      // Draw Neural Laser Constellation Connections
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const dist = Math.hypot(dx, dy);

          if (dist < 140) {
            const alpha = ((1 - dist / 140) * 0.35).toFixed(2);
            ctx.strokeStyle = `${accent}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.stroke();
          }
        }
      }

      // Draw glowing neural nodes
      nodes.forEach((n) => {
        const glowSize = n.size + Math.sin(n.pulse) * 0.8;
        const cx = n.x * w;
        const cy = n.y * h;

        ctx.fillStyle = accent;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1, glowSize), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Floating Cyber Radar Sweep rings
      const sweep = (tick * 0.012) % (Math.PI * 2);
      const cx = w / 2;
      const cy = h / 2;
      const grad = ctx.createConicGradient(sweep, cx, cy);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.06, `${accent}20`);
      grad.addColorStop(0.12, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) * 0.4, 0, Math.PI * 2);
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
