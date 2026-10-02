import { useEffect, useRef } from "react";

// A lightweight, Zeta-specific prism study. The glass is a local image; the
// beams are drawn on a canvas so no remote model or WebGL assets are required.
export function VPrism() {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!frame || !canvas || !ctx) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let visible = false;
    let dragging = false;
    let currentAim = 0;
    let targetAim = 0;
    let animationFrame = 0;
    let lastPaint = 0;

    const beam = (fromX: number, fromY: number, toX: number, toY: number, color: string, weight: number, glow: number) => {
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.lineWidth = weight;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const paint = (time = 0) => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      const aim = currentAim;
      const shimmer = motion.matches ? 0 : Math.sin(time * 0.0018) * 0.025;
      const entryY = height * (0.51 + aim * 0.18);
      const hitY = height * (0.53 + aim * 0.11);
      const exitY = height * (0.53 + aim * 0.06);
      const endY = height * (0.34 + aim * 0.20 + shimmer);

      // One source of credit enters the glass. A narrow spectrum emerges only
      // from its controlled side; this is an illustration, not a policy result.
      beam(-20, entryY, width * 0.37, hitY, "rgba(247,255,245,.26)", 13, 24);
      beam(-20, entryY, width * 0.37, hitY, "rgba(255,255,255,.95)", 2.1, 11);
      beam(width * 0.37, hitY, width * 0.73, exitY, "rgba(244,255,245,.60)", 2, 8);

      const colors = ["#f0f5bc", "#c7f7d2", "#93e8cb", "#b4e1e9", "#edcfe0"];
      colors.forEach((color, index) => {
        const spread = index - 2;
        beam(width * 0.73, exitY + spread * 1.2, width + 20, endY + spread * 13, color, 2.1, 9);
      });

      const flare = ctx.createRadialGradient(width * 0.73, exitY, 1, width * 0.73, exitY, 43);
      flare.addColorStop(0, "rgba(255,255,255,.72)");
      flare.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = flare;
      ctx.beginPath();
      ctx.arc(width * 0.73, exitY, 43, 0, Math.PI * 2);
      ctx.fill();
    };

    const animate = (time: number) => {
      if (!visible || motion.matches) return;
      animationFrame = window.requestAnimationFrame(animate);
      if (time - lastPaint < 30) return;
      lastPaint = time;
      currentAim += (targetAim - currentAim) * 0.11;
      paint(time);
    };

    const resize = () => {
      const bounds = frame.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint();
    };

    const updateAim = (clientY: number) => {
      const bounds = frame.getBoundingClientRect();
      targetAim = Math.max(-1, Math.min(1, ((clientY - bounds.top) / bounds.height - 0.5) * 2));
      frame.setAttribute("aria-valuenow", String(Math.round(targetAim * 45)));
      if (motion.matches) {
        currentAim = targetAim;
        paint();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      frame.setPointerCapture(event.pointerId);
      updateAim(event.clientY);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragging) updateAim(event.clientY);
    };
    const onPointerUp = () => { dragging = false; };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      targetAim = Math.max(-1, Math.min(1, targetAim + (event.key === "ArrowDown" ? 0.12 : -0.12)));
      frame.setAttribute("aria-valuenow", String(Math.round(targetAim * 45)));
      if (motion.matches) { currentAim = targetAim; paint(); }
    };
    const onMotionChange = () => {
      window.cancelAnimationFrame(animationFrame);
      currentAim = targetAim;
      paint();
      if (visible && !motion.matches) animationFrame = window.requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(frame);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      window.cancelAnimationFrame(animationFrame);
      if (visible && !motion.matches) animationFrame = window.requestAnimationFrame(animate);
      else if (visible) paint();
    }, { threshold: 0.05 });
    visibilityObserver.observe(frame);
    motion.addEventListener("change", onMotionChange);
    frame.addEventListener("pointerdown", onPointerDown);
    frame.addEventListener("pointermove", onPointerMove);
    frame.addEventListener("pointerup", onPointerUp);
    frame.addEventListener("pointercancel", onPointerUp);
    frame.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      motion.removeEventListener("change", onMotionChange);
      frame.removeEventListener("pointerdown", onPointerDown);
      frame.removeEventListener("pointermove", onPointerMove);
      frame.removeEventListener("pointerup", onPointerUp);
      frame.removeEventListener("pointercancel", onPointerUp);
      frame.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="zeta-prism" ref={frameRef} role="slider" tabIndex={0} aria-label="Aim the prism light beam" aria-valuemin={-45} aria-valuemax={45} aria-valuenow={0}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <img src="/zeta-prism-glass.png" alt="" loading="lazy" draggable={false} />
    </div>
  );
}
