"use client";

import { useEffect, useRef } from "react";

type Metaball = {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  phase: number;
};

export function AuthBlobBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const offscreen = document.createElement("canvas");
    const offscreenContext = offscreen.getContext("2d", { willReadFrequently: true });
    if (!offscreenContext) return;

    let frameId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const metaballs: Metaball[] = [
      { x: 0.36, y: 0.54, radius: 0.28, speedX: 0.42, speedY: 0.31, phase: 0.0 },
      { x: 0.64, y: 0.48, radius: 0.26, speedX: -0.37, speedY: 0.34, phase: 1.7 },
      { x: 0.56, y: 0.72, radius: 0.24, speedX: 0.29, speedY: -0.28, phase: 3.1 },
      { x: 0.28, y: 0.34, radius: 0.19, speedX: -0.22, speedY: 0.25, phase: 4.4 },
      { x: 0.78, y: 0.64, radius: 0.18, speedX: 0.25, speedY: -0.2, phase: 5.3 },
    ];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      offscreen.width = 220;
      offscreen.height = 180;
    };

    const smoothstep = (edge0: number, edge1: number, value: number) => {
      const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    const drawField = (time: number) => {
      const fieldWidth = offscreen.width;
      const fieldHeight = offscreen.height;
      const image = offscreenContext.createImageData(fieldWidth, fieldHeight);
      const data = image.data;

      for (let y = 0; y < fieldHeight; y += 1) {
        for (let x = 0; x < fieldWidth; x += 1) {
          const nx = x / fieldWidth;
          const ny = y / fieldHeight;
          let field = 0;

          for (const blob of metaballs) {
            const cx = blob.x + Math.sin(time * blob.speedX + blob.phase) * 0.1;
            const cy = blob.y + Math.cos(time * blob.speedY + blob.phase * 1.1) * 0.1;
            const rx = blob.radius * (1 + Math.sin(time * 0.47 + blob.phase) * 0.18);
            const ry = blob.radius * (0.8 + Math.cos(time * 0.41 + blob.phase * 0.7) * 0.16);
            const dx = (nx - cx) / rx;
            const dy = (ny - cy) / ry;
            const distance = dx * dx + dy * dy;
            field += 1 / (distance * 7 + 0.18);
          }

          const swirl =
            Math.sin((nx * 6.5 - ny * 4.4) + time * 0.55) * 0.08 +
            Math.cos((nx * 3.8 + ny * 5.2) - time * 0.48) * 0.06;
          field += swirl;

          const alpha = smoothstep(0.9, 1.36, field);
          const glow = smoothstep(1.12, 1.75, field);

          const index = (y * fieldWidth + x) * 4;
          data[index] = Math.round(255 - glow * 8);
          data[index + 1] = Math.round(228 - glow * 96);
          data[index + 2] = Math.round(228 - glow * 110);
          data[index + 3] = Math.round(alpha * 255);
        }
      }

      offscreenContext.putImageData(image, 0, 0);
    };

    const drawSweep = (time: number, anchorX: number, anchorY: number, fieldW: number, fieldH: number) => {
      const gradient = context.createLinearGradient(
        anchorX - fieldW * 0.42,
        anchorY - fieldH * 0.34,
        anchorX + fieldW * 0.46,
        anchorY + fieldH * 0.28,
      );
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(0.22, "rgba(255,255,255,0.12)");
      gradient.addColorStop(0.44, "rgba(254,226,226,0.16)");
      gradient.addColorStop(0.68, "rgba(248,113,113,0.22)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");

      const topY = anchorY - fieldH * (0.34 + Math.sin(time * 0.26) * 0.03);
      const midY = anchorY - fieldH * (0.02 + Math.cos(time * 0.33) * 0.04);
      const bottomY = anchorY + fieldH * (0.28 + Math.sin(time * 0.23) * 0.03);

      context.save();
      context.filter = "blur(22px)";
      context.strokeStyle = gradient;
      context.lineWidth = Math.max(22, fieldW * 0.052);
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(anchorX - fieldW * 0.42, topY);
      context.bezierCurveTo(
        anchorX - fieldW * 0.18,
        topY + fieldH * 0.22,
        anchorX + fieldW * 0.02,
        midY - fieldH * 0.22,
        anchorX + fieldW * 0.16,
        midY,
      );
      context.bezierCurveTo(
        anchorX + fieldW * 0.34,
        midY + fieldH * 0.26,
        anchorX + fieldW * 0.46,
        bottomY - fieldH * 0.18,
        anchorX + fieldW * 0.52,
        bottomY,
      );
      context.stroke();
      context.restore();
    };

    const render = (timestamp: number) => {
      const time = timestamp * 0.001;
      const anchorX = width * 0.52;
      const anchorY = height * 0.54;
      const fieldW = Math.min(width * 0.86, 980);
      const fieldH = Math.min(height * 0.84, 820);

      drawField(time);
      context.clearRect(0, 0, width, height);

      context.save();
      context.globalCompositeOperation = "source-over";
      context.filter = "blur(58px)";
      context.globalAlpha = 0.92;
      context.drawImage(
        offscreen,
        anchorX - fieldW / 2,
        anchorY - fieldH / 2,
        fieldW,
        fieldH,
      );
      context.restore();

      context.save();
      context.filter = "blur(84px)";
      context.globalAlpha = 0.22;
      context.drawImage(
        offscreen,
        anchorX - fieldW / 2,
        anchorY - fieldH / 2,
        fieldW,
        fieldH,
      );
      context.restore();

      drawSweep(time, anchorX, anchorY, fieldW, fieldH);

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
            "radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.02) 26%, rgba(255,255,255,0.16) 60%, rgba(255,255,255,0.92) 100%)",
        }}
      />
    </div>
  );
}
