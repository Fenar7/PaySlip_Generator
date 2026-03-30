import { NextResponse } from "next/server";
import { getInvoiceExportSession } from "@/features/invoice/server/export-session-store";
import { exportInvoiceDocument } from "@/features/invoice/server/export-invoice";
import { buildInvoiceFilename } from "@/features/invoice/utils/build-invoice-filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const token = searchParams.get("token") ?? "";
    const format = searchParams.get("format");

    if (format !== "pdf" && format !== "png") {
      return NextResponse.json({ error: "Invalid invoice export format." }, { status: 400 });
    }

    const document = getInvoiceExportSession(token);

    if (!document) {
      return NextResponse.json({ error: "Invoice export session expired." }, { status: 404 });
    }

    const buffer = await exportInvoiceDocument({
      invoiceDocument: document,
      format,
      origin,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : "image/png",
        "Content-Disposition": `attachment; filename="${buildInvoiceFilename(document, format)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Invoice direct download failed", error);

    return NextResponse.json({ error: "Invoice direct download failed." }, { status: 500 });
  }
}
