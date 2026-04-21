export type ScanCleanupPreset = "none" | "contrast" | "monochrome";

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function transformScanPixels(
  input: Uint8ClampedArray,
  preset: ScanCleanupPreset,
  threshold = 128,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(input);

  if (preset === "none") {
    return data;
  }

  let min = 255;
  let max = 0;

  for (let index = 0; index < data.length; index += 4) {
    const luminance =
      0.299 * data[index] +
      0.587 * data[index + 1] +
      0.114 * data[index + 2];
    if (luminance < min) {
      min = luminance;
    }
    if (luminance > max) {
      max = luminance;
    }
  }
  const range = Math.max(1, max - min);

  for (let index = 0; index < data.length; index += 4) {
    const luminance =
      0.299 * data[index] +
      0.587 * data[index + 1] +
      0.114 * data[index + 2];
    const normalized = ((luminance - min) / range) * 255;

    if (preset === "contrast") {
      const adjusted = clampChannel((normalized - 128) * 1.08 + 128);
      data[index] = adjusted;
      data[index + 1] = adjusted;
      data[index + 2] = adjusted;
      continue;
    }

    const monochrome = normalized >= threshold ? 255 : 0;
    data[index] = monochrome;
    data[index + 1] = monochrome;
    data[index + 2] = monochrome;
  }

  return data;
}

export function applyScanCleanup(
  canvas: HTMLCanvasElement,
  preset: ScanCleanupPreset,
  threshold = 128,
): HTMLCanvasElement {
  if (preset === "none") {
    return canvas;
  }

  const output = document.createElement("canvas");
  output.width = canvas.width;
  output.height = canvas.height;
  const ctx = output.getContext("2d");
  const sourceCtx = canvas.getContext("2d");

  if (!ctx || !sourceCtx) {
    return canvas;
  }

  const imageData = sourceCtx.getImageData(0, 0, canvas.width, canvas.height);
  const transformed = transformScanPixels(imageData.data, preset, threshold);
  const outputData = new ImageData(transformed, canvas.width, canvas.height);
  ctx.putImageData(outputData, 0, 0);
  return output;
}

export async function loadImageUrlToCanvas(url: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (url.startsWith("http")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}
