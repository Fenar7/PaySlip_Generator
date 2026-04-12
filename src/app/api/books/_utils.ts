import "server-only";

import { NextResponse } from "next/server";
import { getOrgContext, hasRole, type OrgContext } from "@/lib/auth";
import { checkFeature } from "@/lib/plans";

const FEATURE_MESSAGES = {
  accountingCore: "SW Books requires the Starter plan or above.",
  bankReconciliation: "Bank reconciliation requires the Pro plan or above.",
  vendorBills: "Vendor bills require the Starter plan or above.",
  financialStatements: "Financial statements require the Starter plan or above.",
  closeWorkflow: "Financial close requires the Pro plan or above.",
  auditPackExports: "Audit package exports require the Enterprise plan.",
} as const;

export const BooksApiErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PLAN_LIMIT_REACHED: "PLAN_LIMIT_REACHED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

const STATUS_MAP: Record<string, number> = {
  [BooksApiErrorCode.UNAUTHORIZED]: 401,
  [BooksApiErrorCode.FORBIDDEN]: 403,
  [BooksApiErrorCode.NOT_FOUND]: 404,
  [BooksApiErrorCode.VALIDATION_ERROR]: 422,
  [BooksApiErrorCode.PLAN_LIMIT_REACHED]: 402,
  [BooksApiErrorCode.INTERNAL_ERROR]: 500,
};

type BooksFeature = keyof typeof FEATURE_MESSAGES;

export class BooksApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function booksApiResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function booksApiCsvResponse(csv: string, filename: string): NextResponse {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function booksApiPdfResponse(pdf: Uint8Array, filename: string): NextResponse {
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function handleBooksApiError(error: unknown): NextResponse {
  if (error instanceof BooksApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  console.error("[api/books] Unhandled error:", error);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: BooksApiErrorCode.INTERNAL_ERROR,
        message: "An unexpected error occurred.",
      },
    },
    { status: 500 },
  );
}

async function requireBooksApiContext(feature: BooksFeature): Promise<OrgContext> {
  const context = await getOrgContext();

  if (!context) {
    throw new BooksApiError(
      BooksApiErrorCode.UNAUTHORIZED,
      "Unauthorized",
      STATUS_MAP[BooksApiErrorCode.UNAUTHORIZED],
    );
  }

  const allowed = await checkFeature(context.orgId, feature);
  if (!allowed) {
    throw new BooksApiError(
      BooksApiErrorCode.PLAN_LIMIT_REACHED,
      FEATURE_MESSAGES[feature],
      STATUS_MAP[BooksApiErrorCode.PLAN_LIMIT_REACHED],
    );
  }

  return context;
}

export async function requireBooksApiRead(
  feature: BooksFeature = "accountingCore",
): Promise<OrgContext> {
  return requireBooksApiContext(feature);
}

export async function requireBooksApiWrite(
  feature: BooksFeature = "accountingCore",
): Promise<OrgContext> {
  const context = await requireBooksApiContext(feature);

  if (!hasRole(context.role, "admin")) {
    throw new BooksApiError(
      BooksApiErrorCode.FORBIDDEN,
      "Insufficient permissions.",
      STATUS_MAP[BooksApiErrorCode.FORBIDDEN],
    );
  }

  return context;
}

export function parseOptionalNumber(
  rawValue: string | number | null | undefined,
  fieldName: string,
): number | undefined {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return undefined;
  }

  const value =
    typeof rawValue === "number" ? rawValue : Number.parseFloat(String(rawValue).trim());

  if (!Number.isFinite(value)) {
    throw new BooksApiError(
      BooksApiErrorCode.VALIDATION_ERROR,
      `${fieldName} must be a valid number.`,
      STATUS_MAP[BooksApiErrorCode.VALIDATION_ERROR],
    );
  }

  return value;
}

export function parseOptionalBoolean(
  rawValue: string | null | undefined,
  fieldName: string,
): boolean | undefined {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return undefined;
  }

  const value = rawValue.trim().toLowerCase();
  if (value === "true" || value === "1") {
    return true;
  }
  if (value === "false" || value === "0") {
    return false;
  }

  throw new BooksApiError(
    BooksApiErrorCode.VALIDATION_ERROR,
    `${fieldName} must be true or false.`,
    STATUS_MAP[BooksApiErrorCode.VALIDATION_ERROR],
  );
}

export function formatCsvDate(value: Date | string | null | undefined): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
}

export function formatCsvNumber(value: number): string {
  return value.toFixed(2);
}
