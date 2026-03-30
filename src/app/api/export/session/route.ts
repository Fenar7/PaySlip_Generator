import { NextResponse } from "next/server";
import { voucherExportRequestSchema } from "@/features/voucher/schema";
import { createVoucherExportSession } from "@/features/voucher/server/export-session-store";

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

    return NextResponse.json({
      token,
      printUrl: `/voucher/print?token=${encodeURIComponent(token)}&mode=print&autoprint=1`,
      pdfUrl: `/api/export/download?token=${encodeURIComponent(token)}&format=pdf`,
      pngUrl: `/api/export/download?token=${encodeURIComponent(token)}&format=png`,
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
