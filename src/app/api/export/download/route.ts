import { NextResponse } from "next/server";
import { getVoucherExportSession } from "@/features/docs/voucher/server/export-session-store";
import type { VoucherDocument } from "@/features/docs/voucher/types";
import { exportVoucherDocument } from "@/features/docs/voucher/server/export-voucher";
import { buildVoucherFilename } from "@/features/docs/voucher/utils/build-voucher-filename";
import { deserializeExportPayload } from "@/lib/server/export-payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const token = searchParams.get("token") ?? "";
    const payload = searchParams.get("payload") ?? "";
    const format = searchParams.get("format");

    if (format !== "pdf" && format !== "png") {
      return NextResponse.json({ error: "Invalid voucher export format." }, { status: 400 });
    }

    const document =
      (payload
        ? deserializeExportPayload<VoucherDocument>(payload)
        : null) ?? getVoucherExportSession(token);

    if (!document) {
      return NextResponse.json({ error: "Voucher export session expired." }, { status: 404 });
    }

    const buffer = await exportVoucherDocument({
      voucherDocument: document,
      format,
      origin,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : "image/png",
        "Content-Disposition": `attachment; filename="${buildVoucherFilename(document, format)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Voucher direct download failed", error);

    return NextResponse.json({ error: "Voucher direct download failed." }, { status: 500 });
  }
}
