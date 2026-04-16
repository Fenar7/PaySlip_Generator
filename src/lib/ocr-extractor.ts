import "server-only";

import { db } from "@/lib/db";

/** Per-field confidence score, 0.0–1.0. */
export interface FieldConfidence {
  vendorName: number;
  vendorGST: number;
  amount: number;
  taxAmount: number;
  invoiceDate: number;
  invoiceNumber: number;
}

export interface ExtractedDocument {
  type: "invoice" | "receipt" | "unknown";
  /** Overall document-level confidence. */
  confidence: number;
  /** Per-field confidence scores returned by the model. */
  fieldConfidence: FieldConfidence;
  extracted: {
    vendorName: string | null;
    vendorGST: string | null;
    amount: number | null;
    taxAmount: number | null;
    invoiceDate: string | null;
    invoiceNumber: string | null;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
  };
  ocrJobId: string;
  /** Set to true when the extraction timed out after 30 seconds. */
  timedOut?: boolean;
}

const EXTRACTION_TIMEOUT_MS = 30_000;

const EXTRACTION_PROMPT = `Extract invoice/receipt data from this image. Return JSON with:
{
  "type": "invoice" or "receipt",
  "confidence": 0.0-1.0 (overall confidence in extraction),
  "fieldConfidence": {
    "vendorName": 0.0-1.0,
    "vendorGST": 0.0-1.0,
    "amount": 0.0-1.0,
    "taxAmount": 0.0-1.0,
    "invoiceDate": 0.0-1.0,
    "invoiceNumber": 0.0-1.0
  },
  "vendorName": "string or null",
  "vendorGST": "string or null (15-char GSTIN if visible)",
  "amount": number or null (total amount before tax, in rupees),
  "taxAmount": number or null (total tax amount in rupees),
  "invoiceDate": "YYYY-MM-DD or null",
  "invoiceNumber": "string or null",
  "lineItems": [{"description": "string", "quantity": number, "unitPrice": number}]
}
For each field in fieldConfidence: 1.0 = clearly visible and high confidence, 0.5 = partially visible, 0.0 = not found.
If a value field is not found, set it to null and set its fieldConfidence to 0.0.
Return ONLY the JSON object, no markdown or explanation.`;

const NULL_FIELD_CONFIDENCE: FieldConfidence = {
  vendorName: 0,
  vendorGST: 0,
  amount: 0,
  taxAmount: 0,
  invoiceDate: 0,
  invoiceNumber: 0,
};

function parseFieldConfidence(raw: unknown): FieldConfidence {
  if (!raw || typeof raw !== "object") return NULL_FIELD_CONFIDENCE;
  const r = raw as Record<string, unknown>;
  const clamp = (v: unknown) => Math.min(1, Math.max(0, Number(v ?? 0)));
  return {
    vendorName: clamp(r.vendorName),
    vendorGST: clamp(r.vendorGST),
    amount: clamp(r.amount),
    taxAmount: clamp(r.taxAmount),
    invoiceDate: clamp(r.invoiceDate),
    invoiceNumber: clamp(r.invoiceNumber),
  };
}

/**
 * Extract structured data from a document image using OpenAI GPT-4o vision.
 * Falls back to an empty extraction if OPENAI_API_KEY is not set.
 */
export async function extractDocument(
  imageBase64: string,
  mimeType: string,
  orgId: string,
): Promise<ExtractedDocument> {
  const ocrJob = await db.ocrJob.create({
    data: {
      orgId,
      status: "processing",
      inputS3Key: `inline-upload-${Date.now()}`,
    },
  });

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    await db.ocrJob.update({
      where: { id: ocrJob.id },
      data: {
        status: "failed",
        errorMessage: "OPENAI_API_KEY not configured",
        completedAt: new Date(),
      },
    });

    return {
      type: "unknown",
      confidence: 0,
      fieldConfidence: NULL_FIELD_CONFIDENCE,
      extracted: {
        vendorName: null,
        vendorGST: null,
        amount: null,
        taxAmount: null,
        invoiceDate: null,
        invoiceNumber: null,
        lineItems: [],
      },
      ocrJobId: ocrJob.id,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EXTRACTION_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACTION_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    clearTimeout(timeoutId);
    const content: string = data.choices?.[0]?.message?.content ?? "";

    // Strip markdown code fences if present
    const jsonStr = content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    const extracted = {
      vendorName: parsed.vendorName ?? null,
      vendorGST: parsed.vendorGST ?? null,
      amount: parsed.amount != null ? Number(parsed.amount) : null,
      taxAmount: parsed.taxAmount != null ? Number(parsed.taxAmount) : null,
      invoiceDate: parsed.invoiceDate ?? null,
      invoiceNumber: parsed.invoiceNumber ?? null,
      lineItems: Array.isArray(parsed.lineItems)
        ? parsed.lineItems.map(
            (li: { description?: string; quantity?: number; unitPrice?: number }) => ({
              description: li.description ?? "",
              quantity: Number(li.quantity ?? 0),
              unitPrice: Number(li.unitPrice ?? 0),
            }),
          )
        : [],
    };

    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.5)));
    const fieldConfidence = parseFieldConfidence(parsed.fieldConfidence);

    await db.ocrJob.update({
      where: { id: ocrJob.id },
      data: {
        status: "completed",
        extractedData: extracted,
        confidence,
        completedAt: new Date(),
      },
    });

    return {
      type: parsed.type === "receipt" ? "receipt" : "invoice",
      confidence,
      fieldConfidence,
      extracted,
      ocrJobId: ocrJob.id,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || error.message.includes("aborted"));

    const message = isTimeout
      ? "OCR extraction timed out after 30 seconds"
      : error instanceof Error
        ? error.message
        : "Unknown extraction error";

    await db.ocrJob.update({
      where: { id: ocrJob.id },
      data: {
        status: "failed",
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    return {
      type: "unknown",
      confidence: 0,
      fieldConfidence: NULL_FIELD_CONFIDENCE,
      extracted: {
        vendorName: null,
        vendorGST: null,
        amount: null,
        taxAmount: null,
        invoiceDate: null,
        invoiceNumber: null,
        lineItems: [],
      },
      ocrJobId: ocrJob.id,
      timedOut: isTimeout,
    };
  }
}
