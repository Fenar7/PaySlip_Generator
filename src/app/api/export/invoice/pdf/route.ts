import { NextResponse } from "next/server";
import { invoiceExportRequestSchema } from "@/features/invoice/schema";
import { exportInvoiceDocument } from "@/features/invoice/server/export-invoice";
import { buildInvoiceFilename } from "@/features/invoice/utils/build-invoice-filename";
import { parseExportRequestBody } from "@/lib/server/parse-export-request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await parseExportRequestBody(request);
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

    const buffer = await exportInvoiceDocument({
      invoiceDocument: parsed.data.document,
      format: "pdf",
      origin: new URL(request.url).origin,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildInvoiceFilename(parsed.data.document, "pdf")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Invoice PDF export failed", error);

    return NextResponse.json(
      {
        error: "Invoice PDF export failed.",
      },
      { status: 500 },
    );
  }
}
