/**
 * Hough-based skew angle detection and canvas correction.
 * Designed for scanned document deskewing in the browser.
 */

const MIN_DIMENSION = 50;
const ANGLE_STEP = 0.5;
const MAX_ANGLE = 15;
const EDGE_THRESHOLD_RATIO = 0.3;
const PERCEPTIBLE_ANGLE = 0.5;

/**
 * Detect the dominant skew angle of a scanned document image.
 * Uses edge detection + Hough-style line projection on canvas.
 * Returns angle in degrees (-15 to +15 range), or 0 if no skew detected.
 */
export function detectSkewAngle(canvas: HTMLCanvasElement): number {
  const { width, height } = canvas;

  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    return 0;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  // Step 1: Convert to grayscale
  const pixelCount = width * height;
  const gray = new Float32Array(pixelCount);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // Step 2: Sobel edge detection (horizontal + vertical gradient magnitude)
  const edges = new Float32Array(pixelCount);
  let maxEdge = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx =
        -gray[(y - 1) * width + (x - 1)] +
        gray[(y - 1) * width + (x + 1)] -
        2 * gray[y * width + (x - 1)] +
        2 * gray[y * width + (x + 1)] -
        gray[(y + 1) * width + (x - 1)] +
        gray[(y + 1) * width + (x + 1)];
      const gy =
        -gray[(y - 1) * width + (x - 1)] -
        2 * gray[(y - 1) * width + x] -
        gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] +
        2 * gray[(y + 1) * width + x] +
        gray[(y + 1) * width + (x + 1)];

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[idx] = magnitude;
      if (magnitude > maxEdge) maxEdge = magnitude;
    }
  }

  if (maxEdge === 0) return 0;

  // Step 3: Hough-style projection accumulator for angles near horizontal
  const numAngles = Math.floor((2 * MAX_ANGLE) / ANGLE_STEP) + 1;
  const accumulator = new Float64Array(numAngles);
  const threshold = maxEdge * EDGE_THRESHOLD_RATIO;

  // Precompute cos/sin for each angle bucket
  const cosTable = new Float64Array(numAngles);
  const sinTable = new Float64Array(numAngles);
  for (let ai = 0; ai < numAngles; ai++) {
    const angle = -MAX_ANGLE + ai * ANGLE_STEP;
    const rad = (angle * Math.PI) / 180;
    cosTable[ai] = Math.cos(rad);
    sinTable[ai] = Math.sin(rad);
  }

  // Downsample for large images to keep detection fast
  const step = Math.max(1, Math.floor(Math.min(width, height) / 500));

  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const edgeVal = edges[y * width + x];
      if (edgeVal < threshold) continue;
      for (let ai = 0; ai < numAngles; ai++) {
        // Weighted projection accumulation
        accumulator[ai] += edgeVal;
      }
    }
  }

  // Step 4: Refine — use variance-based projection to pick best angle
  // For each candidate angle, project edge points onto a line and measure
  // the variance of the projection histogram (sharper peaks = correct angle)
  const topAngles: number[] = [];
  let peakVal = 0;
  for (let ai = 0; ai < numAngles; ai++) {
    if (accumulator[ai] > peakVal) peakVal = accumulator[ai];
  }

  for (let ai = 0; ai < numAngles; ai++) {
    if (accumulator[ai] > peakVal * 0.95) {
      topAngles.push(-MAX_ANGLE + ai * ANGLE_STEP);
    }
  }

  if (topAngles.length === 0) return 0;

  let bestAngle = 0;
  let bestVariance = 0;

  for (const angle of topAngles) {
    const rad = (angle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const maxRho = width + height;
    const numBins = Math.min(maxRho, 1000);
    const bins = new Float64Array(numBins);

    for (let y = 1; y < height - 1; y += step) {
      for (let x = 1; x < width - 1; x += step) {
        const edgeVal = edges[y * width + x];
        if (edgeVal < threshold) continue;
        const rho = x * cosA + y * sinA;
        const bin = Math.floor(((rho + maxRho) / (2 * maxRho)) * (numBins - 1));
        if (bin >= 0 && bin < numBins) {
          bins[bin] += edgeVal;
        }
      }
    }

    // Compute variance of bin values
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < numBins; i++) {
      sum += bins[i];
      sumSq += bins[i] * bins[i];
    }
    const mean = sum / numBins;
    const variance = sumSq / numBins - mean * mean;

    if (variance > bestVariance) {
      bestVariance = variance;
      bestAngle = angle;
    }
  }

  // If angle is very small, return 0 (no perceptible skew)
  if (Math.abs(bestAngle) < PERCEPTIBLE_ANGLE) return 0;

  return bestAngle;
}

/**
 * Apply deskew correction to a canvas.
 * Rotates the canvas content by -angle to straighten the document.
 */
export function deskewCanvas(
  sourceCanvas: HTMLCanvasElement,
  angleDegrees: number,
): HTMLCanvasElement {
  if (angleDegrees === 0) return sourceCanvas;

  const { width, height } = sourceCanvas;
  const rad = (-angleDegrees * Math.PI) / 180;

  // Calculate new dimensions to fit rotated content
  const cosA = Math.abs(Math.cos(rad));
  const sinA = Math.abs(Math.sin(rad));
  const newWidth = Math.ceil(width * cosA + height * sinA);
  const newHeight = Math.ceil(width * sinA + height * cosA);

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = newWidth;
  outputCanvas.height = newHeight;
  const ctx = outputCanvas.getContext("2d");

  if (!ctx) return sourceCanvas;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, newWidth, newHeight);

  // Rotate around center
  ctx.translate(newWidth / 2, newHeight / 2);
  ctx.rotate(rad);
  ctx.drawImage(sourceCanvas, -width / 2, -height / 2);

  return outputCanvas;
}
