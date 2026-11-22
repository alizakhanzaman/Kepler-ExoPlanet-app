import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';

interface Star { x: number; y: number; r: number; base: number; phase: number; speed: number; hue: string }
interface Meteor { x: number; y: number; vx: number; vy: number; life: number; max: number }

const LAYERS = [
  { share: 0.55, size: [0.35, 0.9], drift: 0.004, parallax: 6 },
  { share: 0.32, size: [0.7, 1.35], drift: 0.009, parallax: 14 },
  { share: 0.13, size: [1.1, 1.9], drift: 0.016, parallax: 26 },
];
const HUES = ['255,255,255', '219,234,254', '253,230,138', '251,207,232', '221,214,254'];
const MAX_STARS = 520;          // hard cap for performance
const STARS_PER_PIXEL = 1 / 3200;

/**
 * Fixed full-screen animated galaxy background: multi-layer parallax starfield with
 * twinkle, slowly drifting nebula gradients and occasional shooting stars.
 * - devicePixelRatio aware (capped at 2), star count capped,
 * - pauses while the tab is hidden,
 * - draws a single static frame when prefers-reduced-motion is set,
 * - pointer-events: none, sits behind all content.
 */
@Component({
  selector: 'app-starfield',
  template: '<canvas #c aria-hidden="true"></canvas>',
  styles: [`
    :host { position: fixed; inset: 0; z-index: -1; pointer-events: none; background: #05030f; }
    canvas { display: block; width: 100%; height: 100%; }
  `],
})
export class Starfield {
  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('c');
  private destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.start());
  }

  private start() {
    const canvas = this.canvas().nativeElement;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = motionQuery.matches;
    let w = 0, h = 0, dpr = 1;
    let layers: Star[][] = [];
    let meteors: Meteor[] = [];
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let scrollY = window.scrollY;
    let nextMeteor = 3 + Math.random() * 6;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const total = Math.min(MAX_STARS, Math.round(w * h * STARS_PER_PIXEL) + 80);
      layers = LAYERS.map((L) => Array.from({ length: Math.round(total * L.share) }, () => ({
        x: Math.random() * w,
        y: Math.random() * (h + L.parallax * 4),
        r: rand(L.size[0], L.size[1]),
        base: rand(0.45, 1),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.6, 1.8),
        hue: HUES[Math.floor(Math.random() * HUES.length)],
      })));
    };

    const nebula = () => {
      // Elliptical clouds matching the original look: violet top-left, magenta right,
      // blue rising from the bottom. rx/ry are fractions of the viewport (like CSS
      // "ellipse 60% 45%"); colour fades to transparent at 70% of the radius.
      const clouds = [
        { c: '124,58,237', a: 0.5, x: 0.12, y: 0.08, rx: 0.6, ry: 0.45, fx: 0.011, fy: 0.008 },
        { c: '219,39,119', a: 0.3, x: 0.92, y: 0.28, rx: 0.5, ry: 0.4, fx: 0.009, fy: 0.012 },
        { c: '37,99,235', a: 0.45, x: 0.5, y: 1.12, rx: 0.8, ry: 0.5, fx: 0.007, fy: 0.006 },
      ];
      for (const cl of clouds) {
        const cx = (cl.x + Math.sin(t * cl.fx) * 0.035) * w;
        const cy = (cl.y + Math.cos(t * cl.fy) * 0.03) * h;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, `rgba(${cl.c},${cl.a})`);
        g.addColorStop(0.35, `rgba(${cl.c},${cl.a * 0.55})`);
        g.addColorStop(0.7, `rgba(${cl.c},0)`);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(cl.rx * w, cl.ry * h);
        ctx.fillStyle = g;
        ctx.fillRect(-1.5, -1.5, 3, 3);
        ctx.restore();
      }
    };

    const draw = (dt: number) => {
      ctx.fillStyle = '#05030f';
      ctx.fillRect(0, 0, w, h);
      nebula();
      layers.forEach((stars, li) => {
        const L = LAYERS[li];
        const offset = (scrollY * L.parallax) / 600;
        for (const s of stars) {
          if (!reduced) s.x -= L.drift * dt * 60 * 0.05;
          if (s.x < -2) s.x += w + 4;
          let y = (s.y - offset) % (h + L.parallax * 4);
          if (y < 0) y += h + L.parallax * 4;
          const tw = reduced ? 1 : 0.65 + 0.35 * Math.sin(t * s.speed + s.phase);
          ctx.globalAlpha = s.base * tw;
          ctx.fillStyle = `rgb(${s.hue})`;
          ctx.beginPath();
          ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
          ctx.fill();
          if (s.r > 1.5) {
            ctx.globalAlpha = s.base * tw * 0.18;
            ctx.beginPath();
            ctx.arc(s.x, y, s.r * 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
      ctx.globalAlpha = 1;

      if (reduced) return;
      nextMeteor -= dt;
      if (nextMeteor <= 0 && meteors.length < 2) {
        const angle = rand(0.35, 0.6);
        const speed = rand(520, 820);
        meteors.push({ x: rand(w * 0.1, w * 0.9), y: rand(-20, h * 0.35),
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, max: rand(0.7, 1.2) });
        nextMeteor = rand(6, 14);
      }
      meteors = meteors.filter((m) => m.life < m.max);
      for (const m of meteors) {
        m.life += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const fade = Math.sin((m.life / m.max) * Math.PI);
        const tail = 0.12;
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail);
        g.addColorStop(0, `rgba(255,236,190,${0.9 * fade})`);
        g.addColorStop(1, 'rgba(255,236,190,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail);
        ctx.stroke();
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      draw(dt);
      raf = requestAnimationFrame(frame);
    };

    const run = () => {
      cancelAnimationFrame(raf);
      if (reduced || document.hidden) { draw(0); return; }
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onResize = () => { build(); run(); };
    const onScroll = () => { scrollY = window.scrollY; if (reduced) draw(0); };
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : run());
    const onMotion = () => { reduced = motionQuery.matches; run(); };

    build();
    run();
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    motionQuery.addEventListener('change', onMotion);

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener('change', onMotion);
    });
  }
}
