"use client";

type OcrWorker = {
  recognize: (image: File | Blob) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
};

type OcrServiceStatus =
  | "idle"           // Worker not yet initialized
  | "initializing"   // Worker init in progress
  | "ready"          // Worker ready and accepting jobs
  | "unavailable";   // Worker failed to init — cannot use OCR this session

let workerPromise: Promise<OcrWorker> | null = null;
let recognitionQueue: Promise<void> = Promise.resolve();
let serviceStatus: OcrServiceStatus = "idle";

// Per-image deduplication: track images currently being processed
const activeRecognitions = new Set<string>();

export function getOcrServiceStatus(): OcrServiceStatus {
  return serviceStatus;
}

/**
 * Normalize OCR errors into product-safe user-facing messages.
 * Errors are categorized by pattern to avoid leaking internal details.
 */
export function normalizeOcrError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);

  // Already normalized
  if (message.startsWith("OCR ")) {
    return error instanceof Error ? error : new Error(message);
  }

  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return new Error(
      "OCR resources could not be loaded. Check your connection and try again.",
    );
  }

  if (
    message.includes("Failed to resolve module specifier") ||
    message.includes("Cannot find module") ||
    message.includes("importScripts")
  ) {
    return new Error(
      "OCR could not be initialized in the browser. Refresh and try again.",
    );
  }

  if (message.includes("out of memory") || message.includes("Memory")) {
    return new Error(
      "OCR ran out of memory. Try a smaller image or fewer simultaneous uploads.",
    );
  }

  return new Error(
    "OCR could not process this image. Try again with a clearer image.",
  );
}

/**
 * Normalize extracted OCR text:
 * - trim outer whitespace
 * - collapse repeated internal whitespace/newlines
 * - return null if empty after normalization (signals no meaningful text)
 */
export function normalizeOcrText(rawText: string): string | null {
  const trimmed = rawText
    .replace(/[\r\n]+/g, "\n")   // normalize line endings
    .replace(/[ \t]{2,}/g, " ")  // collapse runs of spaces/tabs
    .replace(/\n{3,}/g, "\n\n")  // collapse excessive blank lines
    .trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

async function createOcrWorker(): Promise<OcrWorker> {
  const version = "7.0.0";
  const { createWorker } = await import("tesseract.js");
  // Provide explicit CDN paths so the worker and language data resolve
  // reliably even in environments where relative resolution fails.
  return createWorker("eng", 1, {
    workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@v${version}/dist/worker.min.js`,
    langPath: `https://tessdata.projectnaptha.com/4.0.0`,
    corePath: `https://cdn.jsdelivr.net/npm/tesseract.js-core@v4.0.4/tesseract-core.wasm.js`,
    // Suppress noisy worker log output in production
    logger: () => {},
  }) as unknown as Promise<OcrWorker>;
}

async function getWorker(): Promise<OcrWorker> {
  if (serviceStatus === "unavailable") {
    throw new Error(
      "OCR is not available in this browser. Refresh the page and try again.",
    );
  }

  if (!workerPromise) {
    serviceStatus = "initializing";
    workerPromise = createOcrWorker()
      .then((worker) => {
        serviceStatus = "ready";
        return worker;
      })
      .catch((error: unknown) => {
        workerPromise = null;
        serviceStatus = "unavailable";
        throw normalizeOcrError(error);
      });
  }

  return workerPromise;
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) {
    serviceStatus = "idle";
    return;
  }

  const worker = await workerPromise.catch(() => null);
  workerPromise = null;
  serviceStatus = "idle";
  activeRecognitions.clear();

  if (worker) {
    await worker.terminate().catch(() => {
      // Ignore terminate errors — worker may already be dead
    });
  }
}

export function resetOcrProcessorForTests(): void {
  workerPromise = null;
  recognitionQueue = Promise.resolve();
  serviceStatus = "idle";
  activeRecognitions.clear();
}

/**
 * Process an image with OCR.
 *
 * Returns the normalized extracted text.
 * Throws a product-safe Error if:
 * - OCR service is unavailable
 * - Recognition fails
 * - Extracted text is empty after normalization
 *
 * Serializes concurrent calls through a queue to avoid
 * overwhelming the single-threaded tesseract worker.
 *
 * @param image - File or Blob to process
 * @param dedupeKey - Optional stable key (e.g. image id) to prevent
 *                    duplicate concurrent runs for the same image
 */
export async function processImageForOcr(
  image: File | Blob,
  dedupeKey?: string,
): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("OCR processing can only be done on the client-side.");
  }

  // Prevent duplicate concurrent runs for the same image
  if (dedupeKey && activeRecognitions.has(dedupeKey)) {
    throw new Error("OCR is already processing this image.");
  }

  if (dedupeKey) {
    activeRecognitions.add(dedupeKey);
  }

  const runRecognition = async (): Promise<string> => {
    try {
      const worker = await getWorker();
      const {
        data: { text },
      } = await worker.recognize(image);

      const normalized = normalizeOcrText(text);
      if (normalized === null) {
        throw new Error("OCR did not find any text in this image.");
      }

      return normalized;
    } catch (error) {
      throw normalizeOcrError(error);
    } finally {
      if (dedupeKey) {
        activeRecognitions.delete(dedupeKey);
      }
    }
  };

  const recognitionTask = recognitionQueue.then(runRecognition, runRecognition);
  recognitionQueue = recognitionTask.then(
    () => undefined,
    () => undefined,
  );

  return recognitionTask;
}

