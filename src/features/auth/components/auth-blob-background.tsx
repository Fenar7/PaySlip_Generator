"use client";

import { useEffect, useRef } from "react";

type Point = {
  x: number;
  y: number;
};

function createSmoothBlobPath(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  time: number,
  seed: number,
  tilt: number,
) {
  const points: Point[] = [];
  const steps = 26;

  for (let index = 0; index < steps; index += 1) {
    const angle = (Math.PI * 2 * index) / steps;
    const asymmetry =
      1 +
      Math.cos(angle - tilt) * 0.22 +
      Math.sin((angle - tilt) * 2) * 0.08 +
      Math.sin(angle * 3 + time * 0.36 + seed) * 0.14 +
      Math.cos(angle * 5 - time * 0.28 + seed * 1.7) * 0.09 +
      Math.sin(angle * 7 + time * 0.21 + seed * 0.8) * 0.04;
    const driftX = Math.sin(time * 0.27 + seed + angle * 1.4) * radiusX * 0.035;
    const driftY = Math.cos(time * 0.31 + seed * 1.3 - angle * 1.1) * radiusY * 0.03;

    points.push({
      x: centerX + Math.cos(angle) * radiusX * asymmetry + driftX,
      y: centerY + Math.sin(angle) * radiusY * (asymmetry * 0.92) + driftY,
    });
  }

  context.beginPath();
  context.moveTo((points[0].x + points[1].x) / 2, (points[0].y + points[1].y) / 2);

  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    context.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
  }

  context.closePath();
}

function drawRibbon(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  time: number,
) {
  const gradient = context.createLinearGradient(
    centerX - width * 0.54,
    centerY - height * 0.28,
    centerX + width * 0.56,
    centerY + height * 0.26,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.1)");
  gradient.addColorStop(0.44, "rgba(254,226,226,0.28)");
  gradient.addColorStop(0.66, "rgba(252,165,165,0.34)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  const startX = centerX - width * 0.48;
  const endX = centerX + width * 0.53;
  const waveA = Math.sin(time * 0.34) * height * 0.05;
  const waveB = Math.cos(time * 0.29) * height * 0.06;
  const waveC = Math.sin(time * 0.22 + 1.2) * height * 0.04;

  context.save();
  context.filter = "blur(14px)";
  context.strokeStyle = gradient;
  context.lineCap = "round";
  context.lineWidth = Math.max(40, width * 0.08);
  context.beginPath();
  context.moveTo(startX, centerY - height * 0.1 + waveA);
  context.bezierCurveTo(
    centerX - width * 0.2,
    centerY + height * 0.18 + waveB,
    centerX + width * 0.08,
    centerY - height * 0.24 + waveC,
    centerX + width * 0.18,
    centerY - height * 0.03,
  );
  context.bezierCurveTo(
    centerX + width * 0.29,
    centerY + height * 0.18 + waveA,
    centerX + width * 0.42,
    centerY - height * 0.08 + waveB,
    endX,
    centerY + height * 0.08 + waveC,
  );
  context.stroke();
  context.restore();
}

function drawCoreGlow(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  time: number,
) {
  const gradient = context.createRadialGradient(
    centerX + Math.cos(time * 0.18) * width * 0.08,
    centerY + Math.sin(time * 0.16) * height * 0.04,
    width * 0.04,
    centerX,
    centerY,
    width * 0.42,
  );
  gradient.addColorStop(0, "rgba(252, 165, 165, 0.34)");
  gradient.addColorStop(0.24, "rgba(248, 113, 113, 0.24)");
  gradient.addColorStop(0.58, "rgba(254, 226, 226, 0.12)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  context.save();
  context.filter = "blur(36px)";
  context.globalAlpha = 0.92;
  context.fillStyle = gradient;
  context.beginPath();
  context.ellipse(centerX, centerY, width * 0.38, height * 0.26, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

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

    const drawLayer = (
      time: number,
      offsetX: number,
      offsetY: number,
      radiusX: number,
      radiusY: number,
      seed: number,
      tint: string,
      blur: number,
      alpha: number,
      tilt: number,
    ) => {
      context.save();
      context.globalAlpha = alpha;
      context.filter = `blur(${blur}px)`;
      createSmoothBlobPath(context, offsetX, offsetY, radiusX, radiusY, time, seed, tilt);
      context.fillStyle = tint;
      context.fill();
      context.restore();
    };

    const render = (timestamp: number) => {
      const time = timestamp * 0.001;
      const centerX = width * 0.5;
      const centerY = height * 0.55;
      const spanX = Math.min(width * 0.92, 1020);
      const spanY = Math.min(height * 0.8, 760);

      context.clearRect(0, 0, width, height);

      drawLayer(
        time,
        centerX - spanX * 0.04 + Math.sin(time * 0.17) * spanX * 0.035,
        centerY - spanY * 0.03 + Math.cos(time * 0.16) * spanY * 0.03,
        spanX * 0.48,
        spanY * 0.42,
        0.4,
        "rgba(254, 226, 226, 0.88)",
        74,
        0.98,
        Math.PI * 0.62,
      );

      drawLayer(
        time,
        centerX + spanX * 0.08 + Math.cos(time * 0.21) * spanX * 0.03,
        centerY + spanY * 0.02 + Math.sin(time * 0.19) * spanY * 0.03,
        spanX * 0.4,
        spanY * 0.35,
        1.4,
        "rgba(248, 113, 113, 0.56)",
        58,
        0.78,
        Math.PI * 0.14,
      );

      drawLayer(
        time,
        centerX + spanX * 0.18 + Math.sin(time * 0.15) * spanX * 0.026,
        centerY + spanY * 0.07 + Math.cos(time * 0.18) * spanY * 0.02,
        spanX * 0.31,
        spanY * 0.28,
        2.8,
        "rgba(239, 68, 68, 0.48)",
        46,
        0.72,
        -Math.PI * 0.08,
      );

      drawCoreGlow(context, centerX, centerY + spanY * 0.02, spanX, spanY, time);
      drawRibbon(context, centerX, centerY, spanX, spanY, time);

      context.save();
      context.globalAlpha = 0.5;
      context.filter = "blur(92px)";
      createSmoothBlobPath(
        context,
        centerX + spanX * 0.03,
        centerY + spanY * 0.03,
        spanX * 0.5,
        spanY * 0.44,
        time,
        4.2,
        Math.PI * 0.48,
      );
      context.strokeStyle = "rgba(255,255,255,0.34)";
      context.lineWidth = Math.max(34, spanX * 0.045);
      context.stroke();
      context.restore();

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
      <div className="absolute left-1/2 top-1/2 h-[88%] w-[92%] max-h-[900px] max-w-[1040px] -translate-x-1/2 -translate-y-1/2">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>

      <div
        className="absolute left-1/2 top-1/2 h-[90%] w-[94%] max-h-[920px] max-w-[1060px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(circle at 50% 52%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.01) 20%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.7) 100%)",
        }}
      />
    </div>
  );
}
