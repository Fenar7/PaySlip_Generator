import { NextResponse } from "next/server";
import { voucherExportRequestSchema } from "@/features/docs/voucher/schema";
import { createVoucherExportSession } from "@/features/docs/voucher/server/export-session-store";
import { serializeExportPayload } from "@/lib/server/export-payload";

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

    const token = createVoucherExportSession(parsed.data.document);
    const payload = encodeURIComponent(serializeExportPayload(parsed.data.document));

    return NextResponse.json({
      token,
      printUrl: `/voucher/print?payload=${payload}&mode=print&autoprint=1`,
      pdfUrl: `/api/export/download?payload=${payload}&format=pdf`,
      pngUrl: `/api/export/download?payload=${payload}&format=png`,
    });
  } catch (error) {
    console.error("Voucher export session creation failed", error);

    return NextResponse.json(
      {
        error: "Voucher export session creation failed.",
      },
      { status: 500 },
    );
  }
}
