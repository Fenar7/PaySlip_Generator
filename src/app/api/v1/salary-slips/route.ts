import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { incrementUsage } from "@/lib/plans/usage";
import { checkLimit } from "@/lib/plans/enforcement";
import { dispatchEvent } from "@/lib/api-webhooks";
import {
  authenticateApiRequest,
  requireScope,
  apiResponse,
  handleApiError,
  logApiRequest,
  parsePagination,
  getClientIp,
  ErrorCode,
  ApiError,
} from "../_helpers";

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "read:salary-slips");

    const { searchParams } = request.nextUrl;
    const { page, limit, skip } = parsePagination(searchParams);

    const status = searchParams.get("status") ?? undefined;
    const employeeId = searchParams.get("employeeId") ?? undefined;
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined;

    const where: Record<string, unknown> = {
      organizationId: auth.orgId,
      archivedAt: null,
    };
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (month) where.month = month;
    if (year) where.year = year;

    const [slips, total] = await Promise.all([
      db.salarySlip.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          slipNumber: true,
          month: true,
          year: true,
          status: true,
          grossPay: true,
          netPay: true,
          employeeId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.salarySlip.count({ where }),
    ]);

    const resp = apiResponse(slips, { page, limit, total, totalPages: Math.ceil(total / limit) });
    logApiRequest(auth.orgId, auth.apiKeyId, "GET", "/api/v1/salary-slips", 200, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "write:salary-slips");

    const limitCheck = await checkLimit(auth.orgId, "salarySlipsPerMonth");
    if (!limitCheck.allowed) {
      throw new ApiError(ErrorCode.PLAN_LIMIT_REACHED, `Monthly salary slip limit reached (${limitCheck.current}/${limitCheck.limit}).`, 402);
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invalid JSON body.", 422);
    }

    const { slipNumber, month, year, employeeId, formData, components } = body;

    if (!slipNumber || !month || !year) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "slipNumber, month, and year are required.", 422);
    }

    let grossPay = 0;
    let totalDeductions = 0;
    if (Array.isArray(components)) {
      for (const c of components as Array<{ type: string; amount: number }>) {
        if (c.type === "earning") grossPay += c.amount ?? 0;
        else if (c.type === "deduction") totalDeductions += c.amount ?? 0;
      }
    }

    const slip = await db.salarySlip.create({
      data: {
        organizationId: auth.orgId,
        slipNumber,
        month,
        year,
        status: "draft",
        employeeId: employeeId ?? null,
        formData: formData ?? {},
        grossPay,
        netPay: grossPay - totalDeductions,
        components: Array.isArray(components) && components.length > 0
          ? {
              create: (components as Array<{ label: string; amount: number; type: string; sortOrder?: number }>)
                .map((c, idx) => ({
                  label: c.label,
                  amount: c.amount ?? 0,
                  type: c.type,
                  sortOrder: c.sortOrder ?? idx,
                })),
            }
          : undefined,
      },
      include: { components: true },
    });

    await incrementUsage(auth.orgId, "salarySlipsPerMonth");

    dispatchEvent(auth.orgId, "salary_slip.created", {
      id: slip.id,
      slipNumber: slip.slipNumber,
      netPay: slip.netPay,
    }).catch(() => {});

    const resp = apiResponse(slip, undefined, 201);
    logApiRequest(auth.orgId, auth.apiKeyId, "POST", "/api/v1/salary-slips", 201, Date.now() - start, getClientIp(request));
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
