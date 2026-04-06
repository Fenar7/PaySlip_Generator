import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dispatchEvent } from "@/lib/api-webhooks";
import {
  authenticateApiRequest,
  requireScope,
  apiResponse,
  handleApiError,
  logApiRequest,
  getClientIp,
  ErrorCode,
  ApiError,
} from "../../_helpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "read:salary-slips");
    const { id } = await context.params;

    const slip = await db.salarySlip.findFirst({
      where: { id, organizationId: auth.orgId, archivedAt: null },
      include: { components: true, employee: true },
    });

    if (!slip) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Salary slip not found.", 404);
    }

    const resp = apiResponse(slip);
    logApiRequest(auth.orgId, auth.apiKeyId, "GET", `/api/v1/salary-slips/${id}`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "write:salary-slips");
    const { id } = await context.params;

    const slip = await db.salarySlip.findFirst({
      where: { id, organizationId: auth.orgId, archivedAt: null },
    });

    if (!slip) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Salary slip not found.", 404);
    }

    if (slip.status !== "draft") {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Only draft salary slips can be updated.", 422);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invalid JSON body.", 422);
    }

    const { month, year, employeeId, formData, components, status } = body;

    const updateData: Record<string, unknown> = {};
    if (month !== undefined) updateData.month = month;
    if (year !== undefined) updateData.year = year;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (formData !== undefined) updateData.formData = formData;
    if (status !== undefined) updateData.status = status;

    if (Array.isArray(components)) {
      await db.salaryComponent.deleteMany({ where: { salarySlipId: id } });
      await db.salaryComponent.createMany({
        data: components.map((c: { label: string; amount: number; type: string; sortOrder?: number }, idx: number) => ({
          salarySlipId: id,
          label: c.label,
          amount: c.amount ?? 0,
          type: c.type,
          sortOrder: c.sortOrder ?? idx,
        })),
      });

      let grossPay = 0;
      let totalDeductions = 0;
      for (const c of components as Array<{ type: string; amount: number }>) {
        if (c.type === "earning") grossPay += c.amount ?? 0;
        else if (c.type === "deduction") totalDeductions += c.amount ?? 0;
      }
      updateData.grossPay = grossPay;
      updateData.netPay = grossPay - totalDeductions;
    }

    const updated = await db.salarySlip.update({
      where: { id },
      data: updateData,
      include: { components: true },
    });

    dispatchEvent(auth.orgId, "salary_slip.updated", {
      id: updated.id,
      slipNumber: updated.slipNumber,
    }).catch(() => {});

    const resp = apiResponse(updated);
    logApiRequest(auth.orgId, auth.apiKeyId, "PATCH", `/api/v1/salary-slips/${id}`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "delete:salary-slips");
    const { id } = await context.params;

    const slip = await db.salarySlip.findFirst({
      where: { id, organizationId: auth.orgId, archivedAt: null },
    });

    if (!slip) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Salary slip not found.", 404);
    }

    await db.salarySlip.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    dispatchEvent(auth.orgId, "salary_slip.deleted", {
      id: slip.id,
      slipNumber: slip.slipNumber,
    }).catch(() => {});

    const resp = apiResponse({ id, deleted: true });
    logApiRequest(auth.orgId, auth.apiKeyId, "DELETE", `/api/v1/salary-slips/${id}`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
