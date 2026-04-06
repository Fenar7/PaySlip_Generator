import { NextRequest } from "next/server";
import { db } from "@/lib/db";
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
    requireScope(auth.scopes, "read:employees");
    const { id } = await context.params;

    const employee = await db.employee.findFirst({
      where: { id, organizationId: auth.orgId },
      include: { salarySlips: { take: 10, orderBy: { createdAt: "desc" }, select: { id: true, slipNumber: true, month: true, year: true, netPay: true, status: true } } },
    });

    if (!employee) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Employee not found.", 404);
    }

    const resp = apiResponse(employee);
    logApiRequest(auth.orgId, auth.apiKeyId, "GET", `/api/v1/employees/${id}`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "write:employees");
    const { id } = await context.params;

    const existing = await db.employee.findFirst({
      where: { id, organizationId: auth.orgId },
    });

    if (!existing) {
      throw new ApiError(ErrorCode.NOT_FOUND, "Employee not found.", 404);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invalid JSON body.", 422);
    }

    const { name, email, employeeId, designation, department, bankName, bankAccount, bankIFSC, panNumber } = body;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (employeeId !== undefined) updateData.employeeId = employeeId;
    if (designation !== undefined) updateData.designation = designation;
    if (department !== undefined) updateData.department = department;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
    if (bankIFSC !== undefined) updateData.bankIFSC = bankIFSC;
    if (panNumber !== undefined) updateData.panNumber = panNumber;

    const updated = await db.employee.update({
      where: { id },
      data: updateData,
    });

    const resp = apiResponse(updated);
    logApiRequest(auth.orgId, auth.apiKeyId, "PATCH", `/api/v1/employees/${id}`, 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
