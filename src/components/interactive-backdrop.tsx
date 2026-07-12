import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/use-theme";

/**
 * A full-viewport, pointer-events-none canvas that renders a grid of dots which
 * scale up and lift toward the cursor (a faux-3D depth effect), plus a soft
 * radial glow that trails the mouse. Purely decorative.
 */
export function InteractiveBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    if (!canvas || !glow) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cv = canvas;
    const g = glow;
    const c = ctx;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const spacing = 34;
    const radius = 170; // influence radius of the cursor

    // Target + smoothed mouse position.
    const mouse = { x: -9999, y: -9999 };
    const smooth = { x: -9999, y: -9999 };

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = width * dpr;
      cv.height = height * dpr;
      cv.style.width = `${width}px`;
      cv.style.height = `${height}px`;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      g.style.opacity = "1";
      g.style.transform = `translate3d(${e.clientX - 250}px, ${e.clientY - 250}px, 0)`;
    }
    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
      g.style.opacity = "0";
    }

    const isDark = resolved === "dark";
    const baseDot = isDark ? "148,163,255" : "70,70,120";
    const hotDot = isDark ? "120,140,255" : "44,43,224";

    let raf = 0;
    function draw() {
      smooth.x += (mouse.x - smooth.x) * 0.12;
      smooth.y += (mouse.y - smooth.y) * 0.12;
      c.clearRect(0, 0, width, height);

      for (let x = spacing / 2; x < width; x += spacing) {
        for (let y = spacing / 2; y < height; y += spacing) {
          const dx = x - smooth.x;
          const dy = y - smooth.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const t = Math.max(0, 1 - dist / radius); // 0..1 closeness
          const size = 0.9 + t * t * 3.4; // grow near cursor (depth pop)
          const alpha = (isDark ? 0.16 : 0.1) + t * 0.7;
          c.beginPath();
          c.fillStyle = `rgba(${t > 0.35 ? hotDot : baseDot},${alpha})`;
          c.arc(x, y, size, 0, Math.PI * 2);
          c.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    if (!reduce) raf = requestAnimationFrame(draw);
    else draw(); // one static frame

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [resolved]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        ref={glowRef}
        className="absolute h-[500px] w-[500px] rounded-full opacity-0 blur-[80px] transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 42%, transparent), transparent 62%)",
          willChange: "transform",
        }}
      />
    </div>
  );
}
