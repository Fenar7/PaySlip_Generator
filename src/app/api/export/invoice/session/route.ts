import { NextResponse } from "next/server";
import { invoiceExportRequestSchema } from "@/features/invoice/schema";
import { serializeExportPayload } from "@/lib/server/export-payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = invoiceExportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid invoice export payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const payload = encodeURIComponent(serializeExportPayload(parsed.data.document));

    return NextResponse.json({
      printUrl: `/invoice/print?payload=${payload}&mode=print&autoprint=1`,
      pdfUrl: `/api/export/invoice/download?payload=${payload}&format=pdf`,
      pngUrl: `/api/export/invoice/download?payload=${payload}&format=png`,
    });
  } catch (error) {
    console.error("Invoice export session failed", error);

    return NextResponse.json(
      {
        error: "Unable to prepare the invoice export session.",
      },
      { status: 500 },
    );
  }
}
