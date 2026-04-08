import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rateLimitByOrg } from "@/lib/rate-limit";
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

export async function POST(request: NextRequest) {
  const start = Date.now();
  try {
    const auth = await authenticateApiRequest(request);
    requireScope(auth.scopes, "write:invoices");

    const rl = await rateLimitByOrg(auth.orgId, { maxRequests: 10, window: "60 s" });
    if (!rl.success) {
      throw new ApiError(
        ErrorCode.RATE_LIMITED,
        `Rate limit exceeded. Retry after ${rl.retryAfter ?? 60}s.`,
        429
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Invalid JSON body.", 422);
    }

    const { invoiceIds } = body;
    if (!Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "invoiceIds must be a non-empty array.", 422);
    }
    if (invoiceIds.length > 50) {
      throw new ApiError(ErrorCode.VALIDATION_ERROR, "Maximum 50 invoices per bulk remind request.", 422);
    }

    // Find org's default sequence
    const defaultSequence = await db.dunningSequence.findFirst({
      where: { orgId: auth.orgId, isDefault: true, isActive: true },
      include: { steps: { orderBy: { stepNumber: "asc" } } },
    });

    if (!defaultSequence || defaultSequence.steps.length === 0) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        "No active default dunning sequence configured. Create one in Settings → Dunning.",
        422
      );
    }

    // Get all opted-out customer IDs for this org
    const optOuts = await db.dunningOptOut.findMany({
      where: { orgId: auth.orgId },
      select: { customerId: true },
    });
    const optedOutIds = new Set(optOuts.map((o) => o.customerId));

    let triggered = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ invoiceId: string; reason: string }> = [];

    for (const invoiceId of invoiceIds) {
      try {
        const invoice = await db.invoice.findFirst({
          where: { id: invoiceId, organizationId: auth.orgId, archivedAt: null },
          select: {
            id: true,
            status: true,
            customerId: true,
            dunningEnabled: true,
            dunningPausedUntil: true,
            dunningSequenceId: true,
          },
        });

        if (!invoice) {
          skipped++;
          errors.push({ invoiceId, reason: "Invoice not found" });
          continue;
        }

        const validStatuses = ["OVERDUE", "ISSUED", "PARTIALLY_PAID"];
        if (!validStatuses.includes(invoice.status)) {
          skipped++;
          errors.push({ invoiceId, reason: `Invalid status: ${invoice.status}` });
          continue;
        }

        if (!invoice.dunningEnabled) {
          skipped++;
          errors.push({ invoiceId, reason: "Dunning disabled" });
          continue;
        }

        if (invoice.dunningPausedUntil && new Date(invoice.dunningPausedUntil) > new Date()) {
          skipped++;
          errors.push({ invoiceId, reason: "Dunning paused" });
          continue;
        }

        if (invoice.customerId && optedOutIds.has(invoice.customerId)) {
          skipped++;
          errors.push({ invoiceId, reason: "Customer opted out" });
          continue;
        }

        // Determine sequence for this invoice
        const sequenceId = invoice.dunningSequenceId ?? defaultSequence.id;

        // Find next unfired step
        const firedSteps = await db.dunningLog.findMany({
          where: { invoiceId, sequenceId, status: "SENT" },
          select: { stepNumber: true },
        });
        const firedNumbers = new Set(firedSteps.map((l) => l.stepNumber));

        let steps = defaultSequence.steps;
        if (sequenceId !== defaultSequence.id) {
          const customSequence = await db.dunningSequence.findUnique({
            where: { id: sequenceId },
            include: { steps: { orderBy: { stepNumber: "asc" } } },
          });
          if (!customSequence) {
            skipped++;
            errors.push({ invoiceId, reason: "Assigned sequence not found" });
            continue;
          }
          steps = customSequence.steps;
        }

        const nextStep = steps.find((s) => !firedNumbers.has(s.stepNumber));
        if (!nextStep) {
          skipped++;
          errors.push({ invoiceId, reason: "All steps already sent" });
          continue;
        }

        const channel = nextStep.channels[0] ?? "email";
        await db.dunningLog.create({
          data: {
            orgId: auth.orgId,
            invoiceId,
            sequenceId,
            stepNumber: nextStep.stepNumber,
            channel,
            status: "SENT",
            sentAt: new Date(),
          },
        });

        triggered++;
      } catch (err) {
        failed++;
        errors.push({
          invoiceId,
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const resp = apiResponse(
      { triggered, skipped, failed, errors: errors.length > 0 ? errors : undefined },
      { total: invoiceIds.length }
    );
    logApiRequest(
      auth.orgId,
      auth.apiKeyId,
      "POST",
      "/api/v1/invoices/bulk-remind",
      200,
      Date.now() - start,
      getClientIp(request)
    );
    return resp;
  } catch (err) {
    return handleApiError(err);
  }
}
