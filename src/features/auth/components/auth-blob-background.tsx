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

    const drawSweep = (time: number) => {
      const topY = height * (0.26 + Math.sin(time * 0.22) * 0.03);
      const midY = height * (0.48 + Math.cos(time * 0.31) * 0.04);
      const bottomY = height * (0.76 + Math.sin(time * 0.26) * 0.03);
      const gradient = context.createLinearGradient(width * 0.08, topY, width * 0.92, bottomY);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(0.18, "rgba(255,255,255,0.15)");
      gradient.addColorStop(0.34, "rgba(254,226,226,0.18)");
      gradient.addColorStop(0.58, "rgba(248,113,113,0.26)");
      gradient.addColorStop(0.86, "rgba(220,38,38,0.18)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");

      context.save();
      context.filter = "blur(24px)";
      context.strokeStyle = gradient;
      context.lineWidth = Math.max(24, width * 0.038);
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(width * 0.12, topY);
      context.bezierCurveTo(
        width * 0.28,
        topY + height * 0.18,
        width * 0.42,
        midY - height * 0.22,
        width * 0.56,
        midY,
      );
      context.bezierCurveTo(
        width * 0.7,
        midY + height * 0.18,
        width * 0.83,
        bottomY - height * 0.16,
        width * 0.94,
        bottomY,
      );
      context.stroke();
      context.restore();
    };

    const render = (timestamp: number) => {
      const time = timestamp * 0.001;
      const anchorX = width * 0.53;
      const anchorY = height * 0.53;

      context.clearRect(0, 0, width, height);

      drawMorphBlob({
        centerX: anchorX - width * 0.12 + Math.sin(time * 0.31) * width * 0.03,
        centerY: anchorY + height * 0.12 + Math.cos(time * 0.26) * height * 0.03,
        radiusX: width * 0.34,
        radiusY: height * 0.23,
        blur: 44,
        alpha: 0.38,
        time,
        phase: 0.2,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.24, "rgba(255,241,242,__ALPHA__)"],
          [0.52, "rgba(248,113,113,__ALPHA__)"],
          [0.82, "rgba(220,38,38,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      drawMorphBlob({
        centerX: anchorX + width * 0.1 + Math.cos(time * 0.38) * width * 0.025,
        centerY: anchorY + height * 0.04 + Math.sin(time * 0.34) * height * 0.04,
        radiusX: width * 0.22,
        radiusY: height * 0.34,
        blur: 36,
        alpha: 0.3,
        time: time + 1.4,
        phase: 1.8,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.2, "rgba(255,245,245,__ALPHA__)"],
          [0.48, "rgba(252,165,165,__ALPHA__)"],
          [0.78, "rgba(239,68,68,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      drawMorphBlob({
        centerX: anchorX - width * 0.18 + Math.sin(time * 0.24) * width * 0.018,
        centerY: anchorY - height * 0.02 + Math.cos(time * 0.29) * height * 0.03,
        radiusX: width * 0.2,
        radiusY: height * 0.18,
        blur: 32,
        alpha: 0.2,
        time: time + 2.9,
        phase: 2.6,
        colors: [
          [0, "rgba(255,255,255,0)"],
          [0.24, "rgba(255,255,255,__ALPHA__)"],
          [0.5, "rgba(254,226,226,__ALPHA__)"],
          [0.82, "rgba(248,113,113,__ALPHA__)"],
          [1, "rgba(255,255,255,0)"],
        ],
      });

      drawSweep(time);

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
