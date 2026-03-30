import { NextResponse } from "next/server";
import { salarySlipExportRequestSchema } from "@/features/salary-slip/schema";
import { exportSalarySlipDocument } from "@/features/salary-slip/server/export-salary-slip";
import { buildSalarySlipFilename } from "@/features/salary-slip/utils/build-salary-slip-filename";
import { parseExportRequestBody } from "@/lib/server/parse-export-request-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      format: "png",
      origin: new URL(request.url).origin,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${buildSalarySlipFilename(parsed.data.document, "png")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Salary slip PNG export failed", error);

    return NextResponse.json(
      {
        error: "Salary slip PNG export failed.",
      },
      { status: 500 },
    );
  }
}
