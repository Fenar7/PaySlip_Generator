import { NextResponse } from "next/server";
import { voucherExportRequestSchema } from "@/features/docs/voucher/schema";
import { exportVoucherDocument } from "@/features/docs/voucher/server/export-voucher";
import { buildVoucherFilename } from "@/features/docs/voucher/utils/build-voucher-filename";
import { parseExportRequestBody } from "@/lib/server/parse-export-request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await parseExportRequestBody(request);
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
  } catch (error) {
    console.error("Voucher PNG export failed", error);

    return NextResponse.json(
      {
        error: "Voucher PNG export failed.",
      },
      { status: 500 },
    );
  }
}
