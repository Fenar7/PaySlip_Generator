import { NextResponse } from "next/server";
import { salarySlipExportRequestSchema } from "@/features/docs/salary-slip/schema";
import { exportSalarySlipDocument } from "@/features/docs/salary-slip/server/export-salary-slip";
import { buildSalarySlipFilename } from "@/features/docs/salary-slip/utils/build-salary-slip-filename";
import { parseExportRequestBody } from "@/lib/server/parse-export-request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await parseExportRequestBody(request);
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

    const buffer = await exportSalarySlipDocument({
      salarySlipDocument: parsed.data.document,
      format: "pdf",
      origin: new URL(request.url).origin,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildSalarySlipFilename(parsed.data.document, "pdf")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Salary slip PDF export failed", error);

    return NextResponse.json(
      {
        error: "Salary slip PDF export failed.",
      },
      { status: 500 },
    );
  }
}
