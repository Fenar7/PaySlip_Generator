import { NextResponse } from "next/server";
import { voucherExportRequestSchema } from "@/features/voucher/schema";
import { exportVoucherDocument } from "@/features/voucher/server/export-voucher";
import { buildVoucherFilename } from "@/features/voucher/utils/build-voucher-filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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
    format: "png",
    origin: new URL(request.url).origin,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${buildVoucherFilename(parsed.data.document, "png")}"`,
      "Cache-Control": "no-store",
    },
  });
}
