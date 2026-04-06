export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function applyCrop(
  image: HTMLImageElement,
  cropArea: CropArea,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );
  return canvas;
}
