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

    const drawWaveRibbon = ({
      time,
      yBase,
      amplitude,
      frequency,
      phase,
      thickness,
      alpha,
      blur = 22,
    }: {
      time: number;
      yBase: number;
      amplitude: number;
      frequency: number;
      phase: number;
      thickness: number;
      alpha: number;
      blur?: number;
    }) => {
      const gradient = context.createLinearGradient(0, yBase - amplitude - thickness, 0, yBase + amplitude + thickness);
      gradient.addColorStop(0, `rgba(255,255,255,0)`);
      gradient.addColorStop(0.25, `rgba(254,226,226,${alpha * 0.5})`);
      gradient.addColorStop(0.5, `rgba(220,38,38,${alpha})`);
      gradient.addColorStop(0.75, `rgba(254,226,226,${alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(255,255,255,0)`);

      context.save();
      context.filter = `blur(${blur}px)`;
      context.fillStyle = gradient;
      context.beginPath();

      // top edge: flowing sine with secondary harmonic for organic shape
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * width;
        const y =
          yBase +
          Math.sin(x * frequency + time + phase) * amplitude +
          Math.sin(x * frequency * 0.6 + time * 0.8 + phase * 1.3) * amplitude * 0.4;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }

      // bottom edge
      for (let i = steps; i >= 0; i--) {
        const x = (i / steps) * width;
        const y =
          yBase +
          Math.sin(x * frequency + time + phase) * amplitude +
          Math.sin(x * frequency * 0.6 + time * 0.8 + phase * 1.3) * amplitude * 0.4 +
          thickness;
        context.lineTo(x, y);
      }

      context.closePath();
      context.fill();
      context.restore();
    };

    const drawDiagonalWave = ({
      time,
      xBase,
      yBase,
      amplitude,
      frequency,
      phase,
      thickness,
      alpha,
      angle = 0.35,
      blur = 26,
    }: {
      time: number;
      xBase: number;
      yBase: number;
      amplitude: number;
      frequency: number;
      phase: number;
      thickness: number;
      alpha: number;
      angle?: number;
      blur?: number;
    }) => {
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const diagLen = Math.sqrt(width * width + height * height);
      const steps = 50;

      const gradient = context.createLinearGradient(
        xBase - diagLen * cosA * 0.3,
        yBase - diagLen * sinA * 0.3,
        xBase + diagLen * cosA * 0.3,
        yBase + diagLen * sinA * 0.3,
      );
      gradient.addColorStop(0, `rgba(255,255,255,0)`);
      gradient.addColorStop(0.3, `rgba(252,165,165,${alpha * 0.55})`);
      gradient.addColorStop(0.5, `rgba(220,38,38,${alpha})`);
      gradient.addColorStop(0.7, `rgba(252,165,165,${alpha * 0.55})`);
      gradient.addColorStop(1, `rgba(255,255,255,0)`);

      context.save();
      context.filter = `blur(${blur}px)`;
      context.fillStyle = gradient;
      context.beginPath();

      for (let i = 0; i <= steps; i++) {
        const t = (i / steps - 0.5) * diagLen;
        const wave = Math.sin(t * frequency + time + phase) * amplitude + Math.sin(t * frequency * 0.5 + time * 0.7) * amplitude * 0.35;
        const x = xBase + t * cosA - wave * sinA;
        const y = yBase + t * sinA + wave * cosA;
        if (i === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      for (let i = steps; i >= 0; i--) {
        const t = (i / steps - 0.5) * diagLen;
        const wave = Math.sin(t * frequency + time + phase) * amplitude + Math.sin(t * frequency * 0.5 + time * 0.7) * amplitude * 0.35;
        const x = xBase + t * cosA - (wave + thickness) * sinA;
        const y = yBase + t * sinA + (wave + thickness) * cosA;
        context.lineTo(x, y);
      }

      context.closePath();
      context.fill();
      context.restore();
    };

    const drawOrb = ({
      cx,
      cy,
      rx,
      ry,
      blur,
      alpha,
      time,
      phase,
    }: {
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      blur: number;
      alpha: number;
      time: number;
      phase: number;
    }) => {
      const steps = 20;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const morph =
          1 +
          Math.sin(angle * 3 + time * 0.6 + phase) * 0.18 +
          Math.cos(angle * 5 - time * 0.4 + phase * 0.8) * 0.12;
        points.push({
          x: cx + Math.cos(angle) * rx * morph + Math.sin(time * 0.3 + phase) * rx * 0.06,
          y: cy + Math.sin(angle) * ry * morph + Math.cos(time * 0.25 + phase) * ry * 0.05,
        });
      }

      const gradient = context.createRadialGradient(cx - rx * 0.1, cy - ry * 0.1, 0, cx, cy, Math.max(rx, ry));
      gradient.addColorStop(0, `rgba(255,245,245,${alpha})`);
      gradient.addColorStop(0.5, `rgba(248,113,113,${alpha * 0.8})`);
      gradient.addColorStop(1, `rgba(220,38,38,0)`);

      context.save();
      context.filter = `blur(${blur}px)`;
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 0; i < steps; i++) {
        const c = points[i]!;
        const n = points[(i + 1) % steps]!;
        context.quadraticCurveTo(c.x, c.y, (c.x + n.x) / 2, (c.y + n.y) / 2);
      }
      context.closePath();
      context.fill();
      context.restore();
    };

    const render = (timestamp: number) => {
      const time = timestamp * 0.001;
      context.clearRect(0, 0, width, height);

      // Back layer: wide soft orbs for ambient color
      drawOrb({
        cx: width * 0.45 + Math.sin(time * 0.2) * width * 0.04,
        cy: height * 0.48 + Math.cos(time * 0.18) * height * 0.03,
        rx: width * 0.28,
        ry: height * 0.22,
        blur: 50,
        alpha: 0.28,
        time,
        phase: 0,
      });

      drawOrb({
        cx: width * 0.58 + Math.cos(time * 0.24) * width * 0.05,
        cy: height * 0.52 + Math.sin(time * 0.2) * height * 0.04,
        rx: width * 0.22,
        ry: height * 0.28,
        blur: 44,
        alpha: 0.22,
        time,
        phase: 2.5,
      });

      // Mid layer: flowing horizontal wave ribbons
      drawWaveRibbon({
        time: time * 0.9,
        yBase: height * 0.32,
        amplitude: height * 0.07,
        frequency: 0.008,
        phase: 0,
        thickness: height * 0.14,
        alpha: 0.42,
        blur: 24,
      });

      drawWaveRibbon({
        time: time * 1.1,
        yBase: height * 0.48,
        amplitude: height * 0.09,
        frequency: 0.006,
        phase: 2.2,
        thickness: height * 0.18,
        alpha: 0.50,
        blur: 26,
      });

      drawWaveRibbon({
        time: time * 0.8,
        yBase: height * 0.66,
        amplitude: height * 0.06,
        frequency: 0.009,
        phase: 4.1,
        thickness: height * 0.12,
        alpha: 0.36,
        blur: 22,
      });

      // Front layer: diagonal wave accents for depth
      drawDiagonalWave({
        time: time * 0.7,
        xBase: width * 0.35,
        yBase: height * 0.4,
        amplitude: height * 0.05,
        frequency: 0.007,
        phase: 1.0,
        thickness: height * 0.10,
        alpha: 0.32,
        angle: 0.25,
        blur: 28,
      });

      drawDiagonalWave({
        time: time * 0.85,
        xBase: width * 0.65,
        yBase: height * 0.55,
        amplitude: height * 0.04,
        frequency: 0.008,
        phase: 3.5,
        thickness: height * 0.08,
        alpha: 0.26,
        angle: -0.3,
        blur: 30,
      });

      // Small sharp accent orbs for focal points
      drawOrb({
        cx: width * 0.38 + Math.sin(time * 0.45) * width * 0.03,
        cy: height * 0.35 + Math.cos(time * 0.38) * height * 0.025,
        rx: width * 0.10,
        ry: height * 0.08,
        blur: 18,
        alpha: 0.45,
        time,
        phase: 1.2,
      });

      drawOrb({
        cx: width * 0.62 + Math.cos(time * 0.5) * width * 0.035,
        cy: height * 0.60 + Math.sin(time * 0.42) * height * 0.03,
        rx: width * 0.08,
        ry: height * 0.10,
        blur: 16,
        alpha: 0.38,
        time,
        phase: 3.8,
      });

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
