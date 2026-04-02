export async function processImageForOcr(image: File | Blob): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("OCR processing can only be done on the client-side.");
  }

  const { createWorker } = await (eval("import('tesseract.js')") as Promise<typeof import("tesseract.js")>);

  const worker = await createWorker("eng"); // 'eng' for English language

  try {
    const {
      data: { text },
    } = await worker.recognize(image);
    return text;
  } catch (error) {
    console.error("Error during OCR processing:", error);
    throw error;
  } finally {
    await worker.terminate();
  }
}
