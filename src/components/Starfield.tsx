import { useEffect, useRef } from "react";
import { storage } from "@/lib/storage";

// Animated starfield + parallax following the cursor.
// Pure 2D canvas (lightweight, no Three.js overhead, runs behind the whole app).
export default function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const settings = storage.getSettings();
    const lowPerf = settings.lowPerf;
    const dpr = Math.min(window.devicePixelRatio || 1, lowPerf ? 1 : 1.5);
    let w = 0, h = 0;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const STAR_COUNT = lowPerf ? 90 : 220;
    const stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * 0.9 + 0.1, // depth 0.1..1
      r: Math.random() * 1.4 + 0.2,
      tw: Math.random() * Math.PI * 2,
    }));

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: MouseEvent) => {
      mouse.tx = (e.clientX / w - 0.5) * 30;
      mouse.ty = (e.clientY / h - 0.5) * 30;
    };
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    const tick = (t: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      ctx.clearRect(0, 0, w, h);

      // subtle nebula gradient
      const g = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h));
      g.addColorStop(0, "rgba(255,0,110,0.05)");
      g.addColorStop(0.5, "rgba(0,212,255,0.025)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        s.tw += 0.02;
        const px = s.x + mouse.x * s.z;
        const py = s.y + mouse.y * s.z;
        const alpha = 0.4 + Math.sin(s.tw) * 0.3 + s.z * 0.3;
        ctx.fillStyle = `rgba(${180 + s.z * 75},${220},${255},${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r * (0.5 + s.z), 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none"
    />
  );
}
