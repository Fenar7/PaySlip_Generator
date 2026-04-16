"use client";

import { useCallback, useState } from "react";
import type { Area } from "react-easy-crop";
import { PixelToolShell } from "@/features/pixel/components/pixel-tool-shell";
import { ImageUploadZone } from "@/features/pixel/components/image-upload-zone";
import { PassportPresetSelector } from "./passport-preset-selector";
import { PassportCropEditor } from "./passport-crop-editor";
import { PassportAdjustPanel } from "./passport-adjust-panel";
import { PassportNameOverlay } from "./passport-name-overlay";
import { PassportPreview } from "./passport-preview";
import { PassportPrintSheet } from "./passport-print-sheet";
import type { PassportPreset } from "@/features/pixel/data/passport-presets";
import type { AdjustmentValues } from "@/features/pixel/utils/image-adjustments";
import type { CropArea } from "@/features/pixel/utils/image-crop";

interface NameOverlayConfig {
  enabled: boolean;
  name: string;
  date: string;
}

interface PassportWorkspaceProps {
  /** When true, renders a registration CTA after the first photo download (public pages). */
  showRegistrationCTA?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PassportWorkspace({ showRegistrationCTA: _showRegistrationCTA }: PassportWorkspaceProps = {}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [preset, setPreset] = useState<PassportPreset | null>(null);
  const [cropAreaPixels, setCropAreaPixels] = useState<CropArea | null>(null);
  const [adjustments, setAdjustments] = useState<AdjustmentValues>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
  });
  const [bw, setBw] = useState(false);
  const [nameOverlay, setNameOverlay] = useState<NameOverlayConfig>({
    enabled: false,
    name: "",
    date: "",
  });
  const [printSheetCanvas, setPrintSheetCanvas] =
    useState<HTMLCanvasElement | null>(null);

  const handleImageLoaded = useCallback(
    (_file: File, previewUrl: string, img: HTMLImageElement) => {
      setImage(img);
      setImageSrc(previewUrl);
      setCropAreaPixels(null);
    },
    [],
  );

  const handleCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCropAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const aspectRatio = preset ? preset.widthPx / preset.heightPx : 1;

  return (
    <PixelToolShell
      title="🪪 Passport Photo"
      description="Make passport, visa & ID photos in seconds"
    >
      <div className="space-y-6">
        {/* Upload */}
        <ImageUploadZone onImageLoaded={handleImageLoaded} />

        {image && imageSrc && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Preset + Crop */}
            <div className="space-y-6">
              <PassportPresetSelector
                selected={preset}
                onSelect={setPreset}
              />
              {preset && (
                <PassportCropEditor
                  imageSrc={imageSrc}
                  aspectRatio={aspectRatio}
                  onCropComplete={handleCropComplete}
                />
              )}
            </div>

            {/* Right: Adjustments + Overlay */}
            <div className="space-y-6">
              <PassportAdjustPanel
                adjustments={adjustments}
                bw={bw}
                onChange={setAdjustments}
                onBwChange={setBw}
              />
              <PassportNameOverlay
                config={nameOverlay}
                onChange={setNameOverlay}
              />
            </div>
          </div>
        )}

        {/* Preview */}
        {image && preset && cropAreaPixels && (
          <PassportPreview
            image={image}
            preset={preset}
            cropArea={cropAreaPixels}
            adjustments={adjustments}
            bw={bw}
            nameOverlay={nameOverlay}
            onPrintSheet={setPrintSheetCanvas}
          />
        )}

        {/* Print Sheet */}
        {printSheetCanvas && preset && (
          <PassportPrintSheet
            photoCanvas={printSheetCanvas}
            preset={preset}
            onClose={() => {
              setPrintSheetCanvas(null);
            }}
          />
        )}
      </div>
    </PixelToolShell>
  );
}
