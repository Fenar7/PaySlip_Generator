import { NextResponse } from "next/server";
import { invoiceExportRequestSchema } from "@/features/invoice/schema";
import { createInvoiceExportSession } from "@/features/invoice/server/export-session-store";

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

    const token = createInvoiceExportSession(parsed.data.document);

    return NextResponse.json({
      printUrl: `/invoice/print?token=${encodeURIComponent(token)}&mode=print&autoprint=1`,
      pdfUrl: `/api/export/invoice/download?token=${encodeURIComponent(token)}&format=pdf`,
      pngUrl: `/api/export/invoice/download?token=${encodeURIComponent(token)}&format=png`,
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
