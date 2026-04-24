"use client";

import type { WatermarkSettings, WatermarkPosition } from "@/features/docs/pdf-studio/types";

function calculatePreviewPosition(
  position: WatermarkPosition,
  containerWidth: number,
  containerHeight: number,
  contentWidth: number,
  contentHeight: number,
  rotation: number,
  margin: number = 20,
): { left: string; top: string; transform: string; transformOrigin: string } {
  let left: string, top: string, transformOrigin: string;
  const translateX: string =
    position === "top-center" || position === "center" || position === "bottom-center"
      ? "-50%"
      : position === "top-right" || position === "center-right" || position === "bottom-right"
        ? "-100%"
        : "0";
  const translateY: string =
    position === "center-left" || position === "center" || position === "center-right"
      ? "-50%"
      : position === "bottom-left" || position === "bottom-center" || position === "bottom-right"
        ? "-100%"
        : "0";

  switch (position) {
    case "top-left":
      left = `${margin}px`;
      top = `${margin}px`;
      transformOrigin = "top left";
      break;
    case "top-center":
      left = "50%";
      top = `${margin}px`;
      transformOrigin = "top center";
      break;
    case "top-right":
      left = `${containerWidth - margin}px`;
      top = `${margin}px`;
      transformOrigin = "top right";
      break;
    case "center-left":
      left = `${margin}px`;
      top = "50%";
      transformOrigin = "center left";
      break;
    case "center":
      left = "50%";
      top = "50%";
      transformOrigin = "center";
      break;
    case "center-right":
      left = `${containerWidth - margin}px`;
      top = "50%";
      transformOrigin = "center right";
      break;
    case "bottom-left":
      left = `${margin}px`;
      top = `${containerHeight - margin}px`;
      transformOrigin = "bottom left";
      break;
    case "bottom-center":
      left = "50%";
      top = `${containerHeight - margin}px`;
      transformOrigin = "bottom center";
      break;
    case "bottom-right":
      left = `${containerWidth - margin}px`;
      top = `${containerHeight - margin}px`;
      transformOrigin = "bottom right";
      break;
    default:
      left = "50%";
      top = "50%";
      transformOrigin = "center";
  }

  return {
    left,
    top,
    transform: `translate(${translateX}, ${translateY}) rotate(${rotation || 0}deg)`,
    transformOrigin,
  };
}

export function WatermarkPreviewOverlay({
  watermark,
  containerWidth,
  containerHeight,
}: {
  watermark: WatermarkSettings;
  containerWidth: number;
  containerHeight: number;
}) {
  if (!watermark.enabled || watermark.type === "none") return null;

  const margin = Math.max(containerWidth * 0.03, 12);

  if (watermark.type === "text" && watermark.text) {
    const scaleFactor = Math.min(containerWidth / 400, containerHeight / 566);
    const fontSize = Math.max((watermark.text.fontSize || 24) * scaleFactor, 8);
    const textWidth = fontSize * (watermark.text.content || "").length * 0.6;
    const textHeight = fontSize;

    const position = calculatePreviewPosition(
      watermark.position,
      containerWidth,
      containerHeight,
      textWidth,
      textHeight,
      watermark.rotation,
      margin,
    );

    return (
      <div
        className="pointer-events-none select-none"
        style={{
          position: "absolute",
          left: position.left,
          top: position.top,
          transform: position.transform,
          transformOrigin: position.transformOrigin,
          fontSize: `${fontSize}px`,
          color: watermark.text.color || "#999999",
          opacity: (watermark.text.opacity || 50) / 100,
          fontWeight: 600,
          whiteSpace: "nowrap",
          zIndex: 10,
          lineHeight: 1,
        }}
      >
        {watermark.text.content}
      </div>
    );
  }

  if (watermark.type === "image" && watermark.image && watermark.image.previewUrl) {
    const scaleFactor = Math.min(containerWidth / 400, containerHeight / 566);
    const scale = (watermark.image.scale || 30) / 100;
    const maxSize = Math.min(containerWidth, containerHeight) * 0.3 * scale * scaleFactor;

    const position = calculatePreviewPosition(
      watermark.position,
      containerWidth,
      containerHeight,
      maxSize,
      maxSize,
      watermark.rotation,
      margin,
    );

    return (
      <div
        className="pointer-events-none select-none"
        style={{
          position: "absolute",
          left: position.left,
          top: position.top,
          transform: position.transform,
          transformOrigin: position.transformOrigin,
          opacity: (watermark.image.opacity || 50) / 100,
          zIndex: 10,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={watermark.image.previewUrl}
          alt="Watermark"
          className="max-w-none"
          style={{
            maxWidth: `${maxSize}px`,
            maxHeight: `${maxSize}px`,
            width: "auto",
            height: "auto",
          }}
        />
      </div>
    );
  }

  return null;
}
