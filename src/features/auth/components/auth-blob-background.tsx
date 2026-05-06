"use client";

import { useEffect, useRef } from "react";

export function AuthBlobBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frameId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawMorphBlob = ({
      centerX,
      centerY,
      radiusX,
      radiusY,
      blur,
      alpha,
      time,
      phase,
      colors,
    }: {
      centerX: number;
      centerY: number;
      radiusX: number;
      radiusY: number;
      blur: number;
      alpha: number;
      time: number;
      phase: number;
      colors: Array<[number, string]>;
    }) => {
      const steps = 28;
      const points: { x: number; y: number }[] = [];

      for (let index = 0; index < steps; index += 1) {
        const angle = (index / steps) * Math.PI * 2;
        // separate X/Y morph to break circular symmetry
        const morphX =
          1 +
          Math.sin(angle * 2 + time * 0.82 + phase) * 0.24 +
          Math.cos(angle * 3 - time * 0.47 + phase * 0.92) * 0.16 +
          Math.sin(angle * 5 + time * 0.31 - phase * 0.65) * 0.10 +
          Math.cos(angle * 7 + time * 0.19 + phase * 1.3) * 0.06;

        const morphY =
          1 +
          Math.cos(angle * 2 + time * 0.69 + phase * 1.1) * 0.22 +
          Math.sin(angle * 4 - time * 0.53 + phase * 0.74) * 0.14 +
          Math.cos(angle * 6 + time * 0.27 - phase * 0.48) * 0.09 +
          Math.sin(angle * 8 + time * 0.15 + phase * 1.6) * 0.05;

        points.push({
          x:
            centerX +
            Math.cos(angle) * radiusX * morphX +
            Math.sin(time * 0.41 + phase) * radiusX * 0.10,
          y:
            centerY +
            Math.sin(angle) * radiusY * morphY +
            Math.cos(time * 0.35 + phase * 0.72) * radiusY * 0.09,
        });
      }

      const gradient = context.createRadialGradient(
        centerX - radiusX * 0.12,
        centerY - radiusY * 0.08,
        0,
        centerX,
        centerY,
        Math.max(radiusX, radiusY) * 1.08,
      );

      for (const [stop, color] of colors) {
        gradient.addColorStop(stop, color.replace("__ALPHA__", String(alpha)));
      }

      context.save();
      context.filter = `blur(${blur}px)`;
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(points[0]!.x, points[0]!.y);

      for (let index = 0; index < steps; index += 1) {
        const current = points[index]!;
        const next = points[(index + 1) % steps]!;
        const midpointX = (current.x + next.x) / 2;
        const midpointY = (current.y + next.y) / 2;
        context.quadraticCurveTo(current.x, current.y, midpointX, midpointY);
      }

      context.closePath();
      context.fill();
      context.restore();
    };

    const drawSweep = (time: number, offset = 0, intensity = 1) => {
      const topY = height * (0.12 + Math.sin(time * 0.28 + offset) * 0.07);
      const midY = height * (0.46 + Math.cos(time * 0.37 + offset * 0.7) * 0.08);
      const bottomY = height * (0.85 + Math.sin(time * 0.31 + offset * 0.5) * 0.06);
      const gradient = context.createLinearGradient(width * -0.04, topY, width * 1.06, bottomY);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(0.12, `rgba(255,255,255,${0.18 * intensity})`);
      gradient.addColorStop(0.28, `rgba(254,226,226,${0.28 * intensity})`);
      gradient.addColorStop(0.5, `rgba(248,113,113,${0.42 * intensity})`);
      gradient.addColorStop(0.72, `rgba(220,38,38,${0.32 * intensity})`);
      gradient.addColorStop(1, "rgba(255,255,255,0)");

      context.save();
      context.filter = "blur(20px)";
      context.strokeStyle = gradient;
      context.lineWidth = Math.max(32, width * 0.06);
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(width * -0.04, topY);
      context.bezierCurveTo(
        width * 0.18,
        topY + height * 0.26,
        width * 0.36,
        midY - height * 0.32,
        width * 0.56,
        midY,
      );
      context.bezierCurveTo(
        width * 0.74,
        midY + height * 0.26,
        width * 0.90,
        bottomY - height * 0.26,
        width * 1.08,
        bottomY,
      );
      context.stroke();
      context.restore();
    };

    const render = (timestamp: number) => {
      const time = timestamp * 0.001;
      const anchorX = width * 0.52;
      const anchorY = height * 0.53;

      context.clearRect(0, 0, width, height);

      // Blob 1 — massive central anchor, widened
      drawMorphBlob({
        centerX: anchorX - width * 0.10 + Math.sin(time * 0.38) * width * 0.07,
        centerY: anchorY + height * 0.08 + Math.cos(time * 0.32) * height * 0.06,
        radiusX: width * 0.52,
        radiusY: height * 0.34,
        blur: 34,
        alpha: 0.58,
        time,
        phase: 0.2,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.16, "rgba(255,241,242,__ALPHA__)"],
          [0.44, "rgba(248,113,113,__ALPHA__)"],
          [0.74, "rgba(220,38,38,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      // Blob 2 — tall right-side mass
      drawMorphBlob({
        centerX: anchorX + width * 0.22 + Math.cos(time * 0.44) * width * 0.06,
        centerY: anchorY + height * 0.02 + Math.sin(time * 0.39) * height * 0.08,
        radiusX: width * 0.34,
        radiusY: height * 0.50,
        blur: 26,
        alpha: 0.50,
        time: time + 1.4,
        phase: 1.8,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.14, "rgba(255,245,245,__ALPHA__)"],
          [0.40, "rgba(252,165,165,__ALPHA__)"],
          [0.70, "rgba(239,68,68,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      // Blob 3 — wide left-center band
      drawMorphBlob({
        centerX: anchorX - width * 0.28 + Math.sin(time * 0.29) * width * 0.05,
        centerY: anchorY - height * 0.04 + Math.cos(time * 0.35) * height * 0.06,
        radiusX: width * 0.30,
        radiusY: height * 0.26,
        blur: 22,
        alpha: 0.38,
        time: time + 2.9,
        phase: 2.6,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.18, "rgba(255,255,255,__ALPHA__)"],
          [0.44, "rgba(254,226,226,__ALPHA__)"],
          [0.76, "rgba(248,113,113,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      // Blob 4 — top wide accent, low blur for visibility
      drawMorphBlob({
        centerX: anchorX + width * 0.04 + Math.sin(time * 0.22) * width * 0.05,
        centerY: anchorY - height * 0.22 + Math.cos(time * 0.27) * height * 0.05,
        radiusX: width * 0.44,
        radiusY: height * 0.20,
        blur: 38,
        alpha: 0.32,
        time: time + 4.4,
        phase: 4.1,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.26, "rgba(255,255,255,__ALPHA__)"],
          [0.54, "rgba(254,226,226,__ALPHA__)"],
          [0.84, "rgba(248,113,113,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      // Blob 5 — top-left spread anchor
      drawMorphBlob({
        centerX: width * 0.18 + Math.cos(time * 0.33) * width * 0.06,
        centerY: height * 0.18 + Math.sin(time * 0.28) * height * 0.07,
        radiusX: width * 0.30,
        radiusY: height * 0.24,
        blur: 30,
        alpha: 0.34,
        time: time + 3.2,
        phase: 5.5,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.20, "rgba(255,245,245,__ALPHA__)"],
          [0.48, "rgba(252,165,165,__ALPHA__)"],
          [0.78, "rgba(239,68,68,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      // Blob 6 — bottom-right sweep mass
      drawMorphBlob({
        centerX: width * 0.78 + Math.sin(time * 0.26) * width * 0.05,
        centerY: height * 0.76 + Math.cos(time * 0.31) * height * 0.06,
        radiusX: width * 0.28,
        radiusY: height * 0.22,
        blur: 28,
        alpha: 0.30,
        time: time + 5.1,
        phase: 3.3,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.22, "rgba(255,241,242,__ALPHA__)"],
          [0.50, "rgba(254,202,202,__ALPHA__)"],
          [0.80, "rgba(220,38,38,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      // Sweeps — wider, more intense
      drawSweep(time, 0, 1);
      drawSweep(time + 1.8, 2.2, 0.72);
      drawSweep(time + 3.6, 4.4, 0.48);

      frameId = window.requestAnimationFrame(render);
    };

    resize();
    frameId = window.requestAnimationFrame(render);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-[96%] w-[98%] max-h-[1000px] max-w-[1200px] -translate-x-1/2 -translate-y-1/2">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>

      <div
        className="absolute left-1/2 top-1/2 h-[98%] w-[99%] max-h-[1040px] max-w-[1240px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.02) 22%, rgba(255,255,255,0.12) 58%, rgba(255,255,255,0.82) 100%)",
        }}
      />
    </div>
  );
}
