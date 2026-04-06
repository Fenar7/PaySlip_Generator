"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

interface PassportCropEditorProps {
  imageSrc: string;
  aspectRatio: number;
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void;
}

export function PassportCropEditor({
  imageSrc,
  aspectRatio,
  onCropComplete,
}: PassportCropEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const handleCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      onCropComplete(_croppedArea, croppedAreaPixels);
    },
    [onCropComplete],
  );

  return (
    <div className="space-y-3">
      <label className="text-[0.75rem] font-semibold text-[#1a1a1a]">
        Crop Photo
      </label>
      <div className="relative h-64 w-full overflow-hidden rounded-xl border border-[#e5e5e5] bg-[#f5f5f5]">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspectRatio}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>
      <div className="flex items-center gap-3">
        <label className="text-xs text-[#666] whitespace-nowrap">Zoom</label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <span className="text-xs text-[#999] whitespace-nowrap w-10 text-right">
          {zoom.toFixed(1)}×
        </span>
      </div>
    </div>
  );
}
