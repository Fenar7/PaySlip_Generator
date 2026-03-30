import { NextResponse } from "next/server";
import { getSalarySlipExportSession } from "@/features/salary-slip/server/export-session-store";
import { exportSalarySlipDocument } from "@/features/salary-slip/server/export-salary-slip";
import { buildSalarySlipFilename } from "@/features/salary-slip/utils/build-salary-slip-filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const token = searchParams.get("token") ?? "";
    const format = searchParams.get("format");

    if (format !== "pdf" && format !== "png") {
      return NextResponse.json({ error: "Invalid salary slip export format." }, { status: 400 });
    }

    const document = getSalarySlipExportSession(token);

    if (!document) {
      return NextResponse.json({ error: "Salary slip export session expired." }, { status: 404 });
    }

    const buffer = await exportSalarySlipDocument({
      salarySlipDocument: document,
      format,
      origin,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": format === "pdf" ? "application/pdf" : "image/png",
        "Content-Disposition": `attachment; filename="${buildSalarySlipFilename(document, format)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Salary slip direct download failed", error);

    return NextResponse.json({ error: "Salary slip direct download failed." }, { status: 500 });
  }
}
