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
    centerX - width * 0.5,
    centerY - height * 0.2,
    centerX + width * 0.52,
    centerY + height * 0.22,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.2, "rgba(255,255,255,0.08)");
  gradient.addColorStop(0.46, "rgba(254,226,226,0.22)");
  gradient.addColorStop(0.7, "rgba(252,165,165,0.3)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  const startX = centerX - width * 0.48;
  const endX = centerX + width * 0.53;
  const waveA = Math.sin(time * 0.34) * height * 0.05;
  const waveB = Math.cos(time * 0.29) * height * 0.06;
  const waveC = Math.sin(time * 0.22 + 1.2) * height * 0.04;

  context.save();
  context.filter = "blur(18px)";
  context.strokeStyle = gradient;
  context.lineCap = "round";
  context.lineWidth = Math.max(36, width * 0.07);
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
      const centerY = height * 0.56;
      const spanX = Math.min(width * 0.82, 920);
      const spanY = Math.min(height * 0.72, 680);

      context.clearRect(0, 0, width, height);

      drawLayer(
        time,
        centerX - spanX * 0.05 + Math.sin(time * 0.21) * spanX * 0.03,
        centerY - spanY * 0.02 + Math.cos(time * 0.18) * spanY * 0.03,
        spanX * 0.44,
        spanY * 0.4,
        0.4,
        "rgba(254, 226, 226, 0.78)",
        92,
        0.92,
        Math.PI * 0.7,
      );

      drawLayer(
        time,
        centerX + spanX * 0.1 + Math.cos(time * 0.26) * spanX * 0.03,
        centerY + spanY * 0.03 + Math.sin(time * 0.22) * spanY * 0.03,
        spanX * 0.36,
        spanY * 0.33,
        1.4,
        "rgba(252, 165, 165, 0.56)",
        72,
        0.78,
        Math.PI * 0.2,
      );

      drawLayer(
        time,
        centerX + spanX * 0.2 + Math.sin(time * 0.19) * spanX * 0.025,
        centerY + spanY * 0.08 + Math.cos(time * 0.24) * spanY * 0.025,
        spanX * 0.28,
        spanY * 0.25,
        2.8,
        "rgba(248, 113, 113, 0.44)",
        54,
        0.64,
        -Math.PI * 0.1,
      );

      drawRibbon(context, centerX, centerY, spanX, spanY, time);

      context.save();
      context.globalAlpha = 0.38;
      context.filter = "blur(110px)";
      createSmoothBlobPath(
        context,
        centerX + spanX * 0.04,
        centerY + spanY * 0.04,
        spanX * 0.46,
        spanY * 0.42,
        time,
        4.2,
        Math.PI * 0.55,
      );
      context.strokeStyle = "rgba(255,255,255,0.26)";
      context.lineWidth = Math.max(30, spanX * 0.04);
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
            "radial-gradient(circle at 50% 52%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.03) 24%, rgba(255,255,255,0.14) 56%, rgba(255,255,255,0.92) 100%)",
        }}
      />
    </div>
  );
}
