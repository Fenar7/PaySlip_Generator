"use client";

import type { PdfStudioOcrMode } from "@/features/docs/pdf-studio/types";

type OcrRecognitionPayload = {
  data: {
    text: string;
    confidence?: number;
  };
};

type OcrWorker = {
  recognize: (image: File | Blob) => Promise<OcrRecognitionPayload>;
  terminate: () => Promise<void>;
};

type OcrServiceStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "unavailable";

export type ProcessImageForOcrOptions = {
  dedupeKey?: string;
  language?: string;
  mode?: PdfStudioOcrMode;
};

export type OcrRecognitionResult = {
  text: string;
  confidence: number;
  language: string;
  mode: PdfStudioOcrMode;
};

let workerPromise: Promise<OcrWorker> | null = null;
let recognitionQueue: Promise<void> = Promise.resolve();
let serviceStatus: OcrServiceStatus = "idle";
let workerLanguage = "eng";

const activeRecognitions = new Set<string>();

export function getOcrServiceStatus(): OcrServiceStatus {
  return serviceStatus;
}

export function normalizeOcrError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);

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

export function normalizeOcrText(rawText: string): string | null {
  const trimmed = rawText
    .replace(/[\r\n]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

async function createOcrWorker(language: string): Promise<OcrWorker> {
  const version = "7.0.0";
  const { createWorker } = await import("tesseract.js");
  return createWorker(language, 1, {
    workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@v${version}/dist/worker.min.js`,
    langPath: `https://tessdata.projectnaptha.com/4.0.0`,
    corePath: `https://cdn.jsdelivr.net/npm/tesseract.js-core@v4.0.4/tesseract-core.wasm.js`,
    logger: () => {},
  }) as unknown as Promise<OcrWorker>;
}

async function getWorker(language: string): Promise<OcrWorker> {
  if (serviceStatus === "unavailable" && workerLanguage === language) {
    throw new Error(
      "OCR is not available in this browser. Refresh the page and try again.",
    );
  }

  if (workerPromise && workerLanguage !== language) {
    await terminateOcrWorker();
  }

  if (!workerPromise) {
    serviceStatus = "initializing";
    workerLanguage = language;
    workerPromise = createOcrWorker(language)
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

async function prepareImageForOcr(
  image: File | Blob,
  mode: PdfStudioOcrMode,
): Promise<File | Blob> {
  if (
    mode !== "fast" ||
    typeof window === "undefined" ||
    !image.type.startsWith("image/")
  ) {
    return image;
  }

  const url = URL.createObjectURL(image);

  try {
    const prepared = await new Promise<Blob | null>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 1600;
        const longestSide = Math.max(img.naturalWidth, img.naturalHeight);
        if (longestSide <= maxDimension) {
          resolve(image);
          return;
        }

        const scale = maxDimension / longestSide;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not prepare the image for OCR."));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => resolve(blob ?? image),
          image.type || "image/png",
          image.type.includes("jpeg") || image.type.includes("jpg") ? 0.82 : undefined,
        );
      };
      img.onerror = () => reject(new Error("Could not prepare the image for OCR."));
      img.src = url;
    });

    return prepared ?? image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function parseProcessImageOptions(
  options?: string | ProcessImageForOcrOptions,
): Required<ProcessImageForOcrOptions> {
  if (typeof options === "string") {
    return {
      dedupeKey: options,
      language: "eng",
      mode: "accurate",
    };
  }

  return {
    dedupeKey: options?.dedupeKey,
    language: options?.language ?? "eng",
    mode: options?.mode ?? "accurate",
  };
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) {
    serviceStatus = "idle";
    workerLanguage = "eng";
    return;
  }

  const worker = await workerPromise.catch(() => null);
  workerPromise = null;
  serviceStatus = "idle";
  workerLanguage = "eng";
  activeRecognitions.clear();

  if (worker) {
    await worker.terminate().catch(() => {
      // Ignore terminate errors — worker may already be dead.
    });
  }
}

export async function cancelAllOcr(): Promise<void> {
  await terminateOcrWorker();
}

export function resetOcrProcessorForTests(): void {
  workerPromise = null;
  recognitionQueue = Promise.resolve();
  serviceStatus = "idle";
  workerLanguage = "eng";
  activeRecognitions.clear();
}

export async function processImageForOcrDetailed(
  image: File | Blob,
  options?: string | ProcessImageForOcrOptions,
): Promise<OcrRecognitionResult> {
  if (typeof window === "undefined") {
    throw new Error("OCR processing can only be done on the client-side.");
  }

  const { dedupeKey, language, mode } = parseProcessImageOptions(options);

  if (dedupeKey && activeRecognitions.has(dedupeKey)) {
    throw new Error("OCR is already processing this image.");
  }

  if (dedupeKey) {
    activeRecognitions.add(dedupeKey);
  }

  const runRecognition = async (): Promise<OcrRecognitionResult> => {
    try {
      const preparedImage = await prepareImageForOcr(image, mode);
      const worker = await getWorker(language);
      const {
        data: { text, confidence },
      } = await worker.recognize(preparedImage);

      const normalized = normalizeOcrText(text);
      if (normalized === null) {
        throw new Error("OCR did not find any text in this image.");
      }

      return {
        text: normalized,
        confidence:
          typeof confidence === "number"
            ? Math.max(0, Math.min(100, confidence))
            : 0,
        language,
        mode,
      };
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

export async function processImageForOcr(
  image: File | Blob,
  options?: string | ProcessImageForOcrOptions,
): Promise<string> {
  const result = await processImageForOcrDetailed(image, options);
  return result.text;
}
