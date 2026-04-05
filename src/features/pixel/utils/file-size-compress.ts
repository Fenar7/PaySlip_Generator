export async function compressToTargetSize(
  canvas: HTMLCanvasElement,
  targetKb: number,
  format: "image/jpeg" | "image/webp" = "image/jpeg",
  maxIterations = 20,
): Promise<Blob> {
  let low = 0.1,
    high = 1.0;
  let bestBlob: Blob | null = null;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), format, mid);
    });
    bestBlob = blob;
    const sizeKb = blob.size / 1024;
    if (Math.abs(sizeKb - targetKb) / targetKb < 0.1) break;
    if (sizeKb > targetKb) high = mid;
    else low = mid;
  }

  return bestBlob!;
}
