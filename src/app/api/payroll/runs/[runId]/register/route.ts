import { NextRequest, NextResponse } from "next/server";
import { requireOrgContext } from "@/lib/auth";
import { db } from "@/lib/db";
import { generatePayRegister } from "@/lib/payroll/register";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<NextResponse> {
  const { runId } = await params;

  const { orgId } = await requireOrgContext();

  const run = await db.payrollRun.findFirst({
    where: { id: runId, orgId },
    select: { id: true, period: true, orgId: true },
  });

  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await generatePayRegister(runId);

  const filename = `payroll-register-${run.period}.xlsx`;

  return new NextResponse(Uint8Array.from(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
