import { NextResponse } from "next/server";
import { voucherExportRequestSchema } from "@/features/voucher/schema";
import { exportVoucherDocument } from "@/features/voucher/server/export-voucher";
import { buildVoucherFilename } from "@/features/voucher/utils/build-voucher-filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = voucherExportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid voucher export payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const buffer = await exportVoucherDocument({
      voucherDocument: parsed.data.document,
      format: "pdf",
      origin: new URL(request.url).origin,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildVoucherFilename(parsed.data.document, "pdf")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Voucher PDF export failed", error);

    return NextResponse.json(
      {
        error: "Voucher PDF export failed.",
      },
      { status: 500 },
    );
  }
}
