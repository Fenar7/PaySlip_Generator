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
      yBase,
      amplitude,
      speed,
      frequency,
      thickness,
      hueShift,
      alpha,
      blur,
      time,
    }: {
      yBase: number;
      amplitude: number;
      speed: number;
      frequency: number;
      thickness: number;
      hueShift: number;
      alpha: number;
      blur: number;
      time: number;
    }) => {
      const gradient = context.createLinearGradient(width * 0.1, height * 0.72, width * 0.96, height * 0.4);
      gradient.addColorStop(0, `rgba(255,255,255,0)`);
      gradient.addColorStop(0.18, `rgba(254,226,226,${alpha * 0.38})`);
      gradient.addColorStop(0.48, `rgba(248,113,113,${alpha * 0.68})`);
      gradient.addColorStop(0.74, `rgba(220,38,38,${alpha})`);
      gradient.addColorStop(1, `rgba(${185 + hueShift},${28 + hueShift / 3},${28 + hueShift / 3},0.04)`);

      const points: { x: number; y: number }[] = [];
      const segments = 10;

      for (let index = 0; index <= segments; index += 1) {
        const progress = index / segments;
        const x = width * (0.08 + progress * 0.94);
        const waveOne = Math.sin(progress * Math.PI * 2.05 + time * speed);
        const waveTwo = Math.sin(progress * Math.PI * 4.1 - time * (speed * 0.62));
        const waveThree = Math.cos(progress * Math.PI * 3.15 + time * (speed * 0.37));
        const y =
          yBase +
          waveOne * amplitude +
          waveTwo * amplitude * 0.32 +
          waveThree * amplitude * 0.18;

        points.push({ x, y });
      }

      const lowerPoints = points
        .slice()
        .reverse()
        .map((point, index) => {
          const progress = 1 - index / segments;
          const lowerWave = Math.cos(progress * Math.PI * 2.8 + time * frequency) * amplitude * 0.18;
          return {
            x: point.x,
            y: point.y + thickness + lowerWave,
          };
        });

      context.save();
      context.filter = `blur(${blur}px)`;
      context.fillStyle = gradient;
      context.beginPath();
      context.moveTo(points[0]!.x, points[0]!.y);

      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1]!;
        const current = points[index]!;
        const midpointX = (previous.x + current.x) / 2;
        const midpointY = (previous.y + current.y) / 2;
        context.quadraticCurveTo(previous.x, previous.y, midpointX, midpointY);
      }

      const lastPoint = points[points.length - 1]!;
      context.lineTo(lastPoint.x, lastPoint.y + thickness * 0.42);

      for (let index = 0; index < lowerPoints.length; index += 1) {
        const current = lowerPoints[index]!;
        const next = lowerPoints[index + 1];
        if (!next) {
          context.lineTo(current.x, current.y);
          continue;
        }

        const midpointX = (current.x + next.x) / 2;
        const midpointY = (current.y + next.y) / 2;
        context.quadraticCurveTo(current.x, current.y, midpointX, midpointY);
      }

      context.closePath();
      context.fill();
      context.restore();
    };

    const drawBloom = (time: number) => {
      const centerX = width * (0.72 + Math.sin(time * 0.36) * 0.025);
      const centerY = height * (0.68 + Math.cos(time * 0.31) * 0.035);
      const radius = height * (0.17 + Math.sin(time * 0.48) * 0.015);
      const bloom = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      bloom.addColorStop(0, "rgba(239,68,68,0.34)");
      bloom.addColorStop(0.42, "rgba(248,113,113,0.18)");
      bloom.addColorStop(1, "rgba(255,255,255,0)");

      context.save();
      context.filter = "blur(44px)";
      context.fillStyle = bloom;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const render = (timestamp: number) => {
      const time = timestamp * 0.001;

      context.clearRect(0, 0, width, height);

      drawWaveRibbon({
        yBase: height * 0.66,
        amplitude: height * 0.072,
        speed: 0.86,
        frequency: 1.08,
        thickness: height * 0.18,
        hueShift: 0,
        alpha: 0.54,
        blur: 38,
        time,
      });

      drawWaveRibbon({
        yBase: height * 0.61,
        amplitude: height * 0.058,
        speed: 1.14,
        frequency: 1.36,
        thickness: height * 0.14,
        hueShift: 8,
        alpha: 0.36,
        blur: 28,
        time: time + 1.7,
      });

      drawWaveRibbon({
        yBase: height * 0.72,
        amplitude: height * 0.048,
        speed: 0.72,
        frequency: 0.94,
        thickness: height * 0.11,
        hueShift: -6,
        alpha: 0.28,
        blur: 22,
        time: time + 3.4,
      });

      drawBloom(time);

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
      <div className="absolute inset-y-0 right-0 w-[88%]">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>

      <div
        className="absolute inset-y-0 right-0 w-[88%]"
        style={{
          background:
            "radial-gradient(circle at 58% 58%, rgba(255,255,255,0) 0%, rgba(255,255,255,0.02) 22%, rgba(255,255,255,0.16) 56%, rgba(255,255,255,0.90) 100%)",
        }}
      />
    </div>
  );
}
