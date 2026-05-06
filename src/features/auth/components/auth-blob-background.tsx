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
      const steps = 24;
      const points: { x: number; y: number }[] = [];

      for (let index = 0; index < steps; index += 1) {
        const angle = (index / steps) * Math.PI * 2;
        const morph =
          1 +
          Math.sin(angle * 2 + time * 0.72 + phase) * 0.18 +
          Math.cos(angle * 3 - time * 0.41 + phase * 0.82) * 0.13 +
          Math.sin(angle * 5 + time * 0.24 - phase * 0.55) * 0.08;

        points.push({
          x:
            centerX +
            Math.cos(angle) * radiusX * morph +
            Math.sin(time * 0.33 + phase) * radiusX * 0.07,
          y:
            centerY +
            Math.sin(angle) * radiusY * morph +
            Math.cos(time * 0.28 + phase * 0.62) * radiusY * 0.06,
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
      const topY = height * (0.22 + Math.sin(time * 0.22 + offset) * 0.045);
      const midY = height * (0.48 + Math.cos(time * 0.31 + offset * 0.7) * 0.055);
      const bottomY = height * (0.8 + Math.sin(time * 0.26 + offset * 0.5) * 0.04);
      const gradient = context.createLinearGradient(width * 0.02, topY, width * 0.98, bottomY);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(0.14, `rgba(255,255,255,${0.16 * intensity})`);
      gradient.addColorStop(0.3, `rgba(254,226,226,${0.22 * intensity})`);
      gradient.addColorStop(0.5, `rgba(248,113,113,${0.34 * intensity})`);
      gradient.addColorStop(0.74, `rgba(220,38,38,${0.24 * intensity})`);
      gradient.addColorStop(1, "rgba(255,255,255,0)");

      context.save();
      context.filter = "blur(22px)";
      context.strokeStyle = gradient;
      context.lineWidth = Math.max(28, width * 0.05);
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(width * 0.02, topY);
      context.bezierCurveTo(
        width * 0.2,
        topY + height * 0.22,
        width * 0.38,
        midY - height * 0.28,
        width * 0.56,
        midY,
      );
      context.bezierCurveTo(
        width * 0.72,
        midY + height * 0.22,
        width * 0.87,
        bottomY - height * 0.22,
        width * 1.02,
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

      drawMorphBlob({
        centerX: anchorX - width * 0.08 + Math.sin(time * 0.31) * width * 0.04,
        centerY: anchorY + height * 0.1 + Math.cos(time * 0.26) * height * 0.035,
        radiusX: width * 0.42,
        radiusY: height * 0.27,
        blur: 40,
        alpha: 0.48,
        time,
        phase: 0.2,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.18, "rgba(255,241,242,__ALPHA__)"],
          [0.46, "rgba(248,113,113,__ALPHA__)"],
          [0.76, "rgba(220,38,38,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      drawMorphBlob({
        centerX: anchorX + width * 0.18 + Math.cos(time * 0.38) * width * 0.035,
        centerY: anchorY + height * 0.02 + Math.sin(time * 0.34) * height * 0.05,
        radiusX: width * 0.28,
        radiusY: height * 0.42,
        blur: 30,
        alpha: 0.4,
        time: time + 1.4,
        phase: 1.8,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.16, "rgba(255,245,245,__ALPHA__)"],
          [0.42, "rgba(252,165,165,__ALPHA__)"],
          [0.72, "rgba(239,68,68,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      drawMorphBlob({
        centerX: anchorX - width * 0.24 + Math.sin(time * 0.24) * width * 0.024,
        centerY: anchorY - height * 0.01 + Math.cos(time * 0.29) * height * 0.034,
        radiusX: width * 0.26,
        radiusY: height * 0.2,
        blur: 28,
        alpha: 0.28,
        time: time + 2.9,
        phase: 2.6,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.2, "rgba(255,255,255,__ALPHA__)"],
          [0.46, "rgba(254,226,226,__ALPHA__)"],
          [0.78, "rgba(248,113,113,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      drawMorphBlob({
        centerX: anchorX + width * 0.03 + Math.sin(time * 0.18) * width * 0.03,
        centerY: anchorY - height * 0.16 + Math.cos(time * 0.21) * height * 0.03,
        radiusX: width * 0.36,
        radiusY: height * 0.16,
        blur: 46,
        alpha: 0.18,
        time: time + 4.4,
        phase: 4.1,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.3, "rgba(255,255,255,__ALPHA__)"],
          [0.58, "rgba(254,226,226,__ALPHA__)"],
          [0.88, "rgba(248,113,113,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      drawSweep(time, 0, 1);
      drawSweep(time + 1.8, 2.2, 0.64);

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
      <div className="absolute left-1/2 top-1/2 h-[86%] w-[90%] max-h-[860px] max-w-[980px] -translate-x-1/2 -translate-y-1/2">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>

      <div
        className="absolute left-1/2 top-1/2 h-[88%] w-[92%] max-h-[900px] max-w-[1020px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.03) 28%, rgba(255,255,255,0.18) 62%, rgba(255,255,255,0.92) 100%)",
        }}
      />
    </div>
  );
}
