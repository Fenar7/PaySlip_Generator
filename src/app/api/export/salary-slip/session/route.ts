import { NextResponse } from "next/server";
import { salarySlipExportRequestSchema } from "@/features/salary-slip/schema";
import { createSalarySlipExportSession } from "@/features/salary-slip/server/export-session-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = salarySlipExportRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid salary slip export payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const token = createSalarySlipExportSession(parsed.data.document);

    return NextResponse.json({
      token,
      printUrl: `/salary-slip/print?token=${encodeURIComponent(token)}&mode=print&autoprint=1`,
      pdfUrl: `/salary-slip/print?token=${encodeURIComponent(token)}&mode=pdf`,
      pngUrl: `/salary-slip/print?token=${encodeURIComponent(token)}&mode=png`,
    });
  } catch (error) {
    console.error("Salary slip export session creation failed", error);

    return NextResponse.json(
      {
        error: "Salary slip export session creation failed.",
      },
      { status: 500 },
    );
  }
}
