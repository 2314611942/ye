import { useEffect, useRef } from 'react';
export default function Particles({ paused }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas.getContext('2d');
    if (!ctx || paused) { ctx?.clearRect(0, 0, canvas.width, canvas.height); return; }
    const smallScreen = window.matchMedia('(max-width: 640px)');
    const map = document.querySelector('.map-canvas');
    let frame, timer, last = 0;
    const particles = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), r: .4 + Math.random(), speed: .00003 + Math.random() * .00002 }));
    const stop = () => { cancelAnimationFrame(frame); clearTimeout(timer); last = 0; };
    const canDraw = () => !document.hidden && !smallScreen.matches && !map?.classList.contains('map-moving');
    const draw = time => {
      if (!canDraw()) return;
      const dt = Math.min(time - (last || time), 65); last = time;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255,213,141,.32)';
      for (const p of particles) { p.y -= p.speed * dt; if (p.y < 0) p.y = 1; ctx.beginPath(); ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r, 0, Math.PI * 2); ctx.fill(); }
      timer = setTimeout(() => { frame = requestAnimationFrame(draw); }, 1000 / 24);
    };
    const refresh = () => { stop(); if (canDraw()) frame = requestAnimationFrame(draw); else ctx.clearRect(0, 0, canvas.width, canvas.height); };
    const resize = () => { canvas.width = Math.min(canvas.clientWidth, 1280); canvas.height = Math.min(canvas.clientHeight, 800); refresh(); };
    const observer = new MutationObserver(refresh);
    if (map) observer.observe(map, { attributes: true, attributeFilter: ['class'] });
    resize();
    window.addEventListener('resize', resize); document.addEventListener('visibilitychange', refresh); smallScreen.addEventListener('change', refresh);
    return () => { stop(); observer.disconnect(); ctx.clearRect(0, 0, canvas.width, canvas.height); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', refresh); smallScreen.removeEventListener('change', refresh); };
  }, [paused]);
  return <canvas ref={ref} className="particles" aria-hidden="true"/>;
}
