import "server-only";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import {
  renderDunningTemplate,
  buildUnsubscribeFooter,
  formatIndianCurrency,
  formatDateIndian,
  type DunningTemplateVars,
} from "@/lib/dunning-templates";
import { buildOptOutUrl } from "@/lib/dunning-opt-out";
import { createInvoicePaymentLink } from "@/lib/payment-links";
import { createNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface DunningSummary {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}

type InvoiceWithRelations = Awaited<
  ReturnType<typeof findDunnableInvoices>
>[number];

interface FireStepParams {
  invoice: InvoiceWithRelations;
  step: {
    id: string;
    stepNumber: number;
    daysOffset: number;
    channels: string[];
    emailSubject: string;
    emailBody: string;
    smsBody: string | null;
    smsTemplateId: string | null;
    tone: string;
    createTicket: boolean;
  };
  sequence: { id: string; name: string };
  daysOverdue: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RETRIES = 3;
const SYSTEM_ACTOR_ID = "system:dunning-engine";

// ─── Main Entry Point ───────────────────────────────────────────────────────────

/**
 * Main scheduler entry point. Called every 15 minutes by the cron job.
 * Finds overdue invoices and fires the appropriate dunning steps.
 */
export async function processOverdueInvoices(): Promise<DunningSummary> {
  const summary: DunningSummary = { processed: 0, sent: 0, skipped: 0, failed: 0 };

  let invoices: InvoiceWithRelations[];
  try {
    invoices = await findDunnableInvoices();
  } catch (err) {
    console.error("[Dunning] Failed to query dunnable invoices:", err);
    return summary;
  }

  for (const invoice of invoices) {
    summary.processed++;
    try {
      const result = await processInvoice(invoice);
      summary.sent += result.sent;
      summary.skipped += result.skipped;
      summary.failed += result.failed;
    } catch (err) {
      console.error(`[Dunning] Error processing invoice ${invoice.id}:`, err);
      summary.failed++;
    }
  }

  return summary;
}

// ─── Invoice Query ──────────────────────────────────────────────────────────────

async function findDunnableInvoices() {
  const now = new Date();

  // Get all opted-out org+customer pairs
  const optOuts = await db.dunningOptOut.findMany({
    select: { orgId: true, customerId: true },
  });
  const optOutSet = new Set(
    optOuts.map((o) => `${o.orgId}:${o.customerId}`)
  );

  const invoices = await db.invoice.findMany({
    where: {
      status: { in: ["OVERDUE", "DUE", "PARTIALLY_PAID"] },
      dunningEnabled: true,
      dueDate: { not: null },
      customerId: { not: null },
      OR: [
        { dunningPausedUntil: null },
        { dunningPausedUntil: { lt: now } },
      ],
    },
    include: {
      customer: true,
      organization: {
        include: {
          defaults: true,
        },
      },
    },
  });

  // Filter out invoices whose customer has opted out, or whose dueDate is invalid
  return invoices.filter((inv) => {
    if (!inv.customer || !inv.dueDate) return false;
    // Validate dueDate is a parseable date
    const parsed = new Date(inv.dueDate);
    if (isNaN(parsed.getTime())) return false;
    // Filter out opted-out customers
    if (optOutSet.has(`${inv.organizationId}:${inv.customerId}`)) return false;
    return true;
  });
}

// ─── Per-Invoice Processing ─────────────────────────────────────────────────────

async function processInvoice(
  invoice: InvoiceWithRelations
): Promise<{ sent: number; skipped: number; failed: number }> {
  const result = { sent: 0, skipped: 0, failed: 0 };

  // Determine dunning sequence
  const sequenceId =
    invoice.dunningSequenceId ??
    invoice.organization.defaults?.defaultDunningSeqId ??
    null;

  if (!sequenceId) {
    result.skipped++;
    return result;
  }

  const sequence = await db.dunningSequence.findFirst({
    where: { id: sequenceId, isActive: true },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });

  if (!sequence || sequence.steps.length === 0) {
    result.skipped++;
    return result;
  }

  // Calculate days overdue
  const dueDate = new Date(invoice.dueDate!);
  const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / MS_PER_DAY);

  // Find the highest step whose daysOffset <= daysOverdue
  const eligibleSteps = sequence.steps.filter((s) => s.daysOffset <= daysOverdue);
  if (eligibleSteps.length === 0) {
    result.skipped++;
    return result;
  }

  const targetStep = eligibleSteps[eligibleSteps.length - 1];

  // Idempotency: check if this step has already been sent for this invoice+sequence
  const alreadySent = await db.dunningLog.findFirst({
    where: {
      invoiceId: invoice.id,
      sequenceId: sequence.id,
      stepNumber: targetStep.stepNumber,
      status: "SENT",
    },
  });

  if (alreadySent) {
    result.skipped++;
    return result;
  }

  // Fire the step
  try {
    await fireDunningStep({
      invoice,
      step: targetStep,
      sequence: { id: sequence.id, name: sequence.name },
      daysOverdue,
    });
    result.sent++;
  } catch (err) {
    console.error(
      `[Dunning] Failed to fire step ${targetStep.stepNumber} for invoice ${invoice.id}:`,
      err
    );
    result.failed++;
  }

  return result;
}

// ─── Fire Dunning Step ──────────────────────────────────────────────────────────

/**
 * Fires a single dunning step for an invoice:
 * sends email/SMS per the step's channels, optionally creates a ticket,
 * and logs an audit event.
 */
export async function fireDunningStep(params: FireStepParams): Promise<void> {
  const { invoice, step, sequence, daysOverdue } = params;

  // Resolve payment link
  const payNowLink = await resolvePaymentLink(invoice);

  const orgDefaults = invoice.organization.defaults;
  const templateVars: DunningTemplateVars = {
    customer_name: invoice.customer!.name,
    invoice_number: invoice.invoiceNumber,
    invoice_amount: formatIndianCurrency(invoice.totalAmount),
    amount_due: formatIndianCurrency(invoice.remainingAmount),
    amount_paid: formatIndianCurrency(invoice.amountPaid),
    due_date: formatDateIndian(invoice.dueDate!),
    days_overdue: daysOverdue,
    pay_now_link: payNowLink,
    org_name: invoice.organization.name,
    org_email: orgDefaults?.portalSupportEmail ?? "",
    org_phone: orgDefaults?.portalSupportPhone ?? "",
    invoice_date: formatDateIndian(invoice.invoiceDate),
    unsubscribe_url: buildOptOutUrl(invoice.organizationId, invoice.customerId!),
  };

  // Process each channel
  for (const channel of step.channels) {
    try {
      if (channel === "email") {
        await sendDunningEmail(invoice, step, sequence, templateVars);
      } else if (channel === "sms") {
        await sendDunningSms(invoice, step, sequence, templateVars);
      }
    } catch (err) {
      // Per-channel errors are logged inside the helpers; continue with next channel
      console.error(
        `[Dunning] Channel ${channel} failed for invoice ${invoice.id}, step ${step.stepNumber}:`,
        err
      );
    }
  }

  // Create in-app notification/ticket if configured
  if (step.createTicket) {
    try {
      // Notify the org owner/admin
      const orgOwner = await db.member.findFirst({
        where: { organizationId: invoice.organizationId, role: { in: ["owner", "admin"] } },
        select: { userId: true },
      });
      if (orgOwner) {
        await createNotification({
          userId: orgOwner.userId,
          orgId: invoice.organizationId,
          type: "dunning.escalation",
          title: `Dunning escalation: ${invoice.invoiceNumber}`,
          body: `Invoice ${invoice.invoiceNumber} (${formatIndianCurrency(invoice.remainingAmount)} outstanding) is ${daysOverdue} days overdue. Step ${step.stepNumber} of "${sequence.name}" has been sent.`,
          link: `/invoices/${invoice.id}`,
        });
      }
    } catch (err) {
      console.error(`[Dunning] Failed to create ticket for invoice ${invoice.id}:`, err);
    }
  }

  // Audit log (fire-and-forget; logAudit swallows errors internally)
  try {
    await logAudit({
      orgId: invoice.organizationId,
      actorId: SYSTEM_ACTOR_ID,
      action: "dunning.step_fired",
      entityType: "invoice",
      entityId: invoice.id,
      metadata: {
        sequenceId: sequence.id,
        sequenceName: sequence.name,
        stepNumber: step.stepNumber,
        channels: step.channels,
        daysOverdue,
      },
    });
  } catch {
    // logAudit already handles errors; this catch is a safety net
  }
}

// ─── Channel Handlers ───────────────────────────────────────────────────────────

async function sendDunningEmail(
  invoice: InvoiceWithRelations,
  step: FireStepParams["step"],
  sequence: FireStepParams["sequence"],
  vars: DunningTemplateVars
): Promise<void> {
  const customerEmail = invoice.customer?.email;
  if (!customerEmail) {
    await db.dunningLog.create({
      data: {
        orgId: invoice.organizationId,
        invoiceId: invoice.id,
        sequenceId: sequence.id,
        stepNumber: step.stepNumber,
        channel: "email",
        status: "SKIPPED",
        errorMessage: "Customer has no email address on file",
        createdAt: new Date(),
      },
    });
    return;
  }

  const subject = renderDunningTemplate(step.emailSubject, vars);
  const body = renderDunningTemplate(step.emailBody, vars) + buildUnsubscribeFooter(vars);

  try {
    await sendEmail({ to: customerEmail, subject, html: body });
    await db.dunningLog.create({
      data: {
        orgId: invoice.organizationId,
        invoiceId: invoice.id,
        sequenceId: sequence.id,
        stepNumber: step.stepNumber,
        channel: "email",
        status: "SENT",
        sentAt: new Date(),
        createdAt: new Date(),
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Dunning] Email send failed for invoice ${invoice.id}:`, errorMsg);
    await db.dunningLog.create({
      data: {
        orgId: invoice.organizationId,
        invoiceId: invoice.id,
        sequenceId: sequence.id,
        stepNumber: step.stepNumber,
        channel: "email",
        status: "FAILED",
        errorMessage: errorMsg.slice(0, 500),
        createdAt: new Date(),
      },
    });
  }
}

async function sendDunningSms(
  invoice: InvoiceWithRelations,
  step: FireStepParams["step"],
  sequence: FireStepParams["sequence"],
  vars: DunningTemplateVars
): Promise<void> {
  const customerPhone = invoice.customer?.phone;
  if (!customerPhone) {
    await db.dunningLog.create({
      data: {
        orgId: invoice.organizationId,
        invoiceId: invoice.id,
        sequenceId: sequence.id,
        stepNumber: step.stepNumber,
        channel: "sms",
        status: "SKIPPED",
        errorMessage: "Customer has no phone number on file",
        createdAt: new Date(),
      },
    });
    return;
  }

  const smsText = step.smsBody
    ? renderDunningTemplate(step.smsBody, vars)
    : `Invoice ${invoice.invoiceNumber} (${formatIndianCurrency(invoice.remainingAmount)}) from ${invoice.organization.name} is overdue. Pay: ${vars.pay_now_link}`;

  const smsResult = await sendSms({
    phone: customerPhone,
    message: smsText,
    flowId: step.smsTemplateId ?? undefined,
    templateVars: step.smsTemplateId
      ? {
          invoice_number: invoice.invoiceNumber,
          amount_due: formatIndianCurrency(invoice.remainingAmount),
          pay_now_link: vars.pay_now_link,
          org_name: invoice.organization.name,
        }
      : undefined,
  });

  if (smsResult.success) {
    await db.dunningLog.create({
      data: {
        orgId: invoice.organizationId,
        invoiceId: invoice.id,
        sequenceId: sequence.id,
        stepNumber: step.stepNumber,
        channel: "sms",
        status: "SENT",
        sentAt: new Date(),
        createdAt: new Date(),
      },
    });
  } else {
    console.error(
      `[Dunning] SMS send failed for invoice ${invoice.id}:`,
      smsResult.error
    );
    await db.dunningLog.create({
      data: {
        orgId: invoice.organizationId,
        invoiceId: invoice.id,
        sequenceId: sequence.id,
        stepNumber: step.stepNumber,
        channel: "sms",
        status: smsResult.error === "no_phone_on_file" ? "SKIPPED" : "FAILED",
        errorMessage: smsResult.error?.slice(0, 500) ?? null,
        createdAt: new Date(),
      },
    });
  }
}

// ─── Payment Link Resolution ────────────────────────────────────────────────────

async function resolvePaymentLink(invoice: InvoiceWithRelations): Promise<string> {
  // Use existing payment link if not expired
  if (invoice.razorpayPaymentLinkUrl) {
    const expiresAt = invoice.paymentLinkExpiresAt;
    if (!expiresAt || expiresAt.getTime() > Date.now()) {
      return invoice.razorpayPaymentLinkUrl;
    }
  }

  // No existing link or expired — try to create one
  if (!invoice.razorpayPaymentLinkId) {
    try {
      const result = await createInvoicePaymentLink(
        invoice.organizationId,
        invoice.id
      );
      if (result.success) {
        return result.data.shortUrl;
      }
    } catch (err) {
      console.error(`[Dunning] Failed to create payment link for invoice ${invoice.id}:`, err);
    }
  }

  // Fallback: link to invoice detail page
  const baseUrl =
    process.env.CUSTOMER_PORTAL_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://app.slipwise.com";
  return `${baseUrl}/invoices/${invoice.id}`;
}

// ─── Retry Failed Steps ─────────────────────────────────────────────────────────

/**
 * Called every 5 minutes. Retries DunningLog entries with status=FAILED
 * that were created within the last 24 hours, up to 3 retries per log entry.
 */
export async function retryFailedSteps(): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  const result = { retried: 0, succeeded: 0, failed: 0 };

  const cutoff = new Date(Date.now() - RETRY_WINDOW_MS);

  const failedLogs = await db.dunningLog.findMany({
    where: {
      status: "FAILED",
      createdAt: { gt: cutoff },
    },
    include: {
      invoice: {
        include: {
          customer: true,
          organization: { include: { defaults: true } },
        },
      },
      sequence: { include: { steps: true } },
    },
  });

  for (const log of failedLogs) {
    try {
      // Count prior attempts for this invoice+step+channel
      const retryCount = await db.dunningLog.count({
        where: {
          invoiceId: log.invoiceId,
          sequenceId: log.sequenceId,
          stepNumber: log.stepNumber,
          channel: log.channel,
        },
      });

      if (retryCount >= MAX_RETRIES) {
        continue;
      }

      // Ensure the invoice still qualifies
      if (
        !log.invoice ||
        !log.invoice.customer ||
        !log.invoice.dunningEnabled ||
        log.invoice.status === "PAID" ||
        log.invoice.status === "CANCELLED"
      ) {
        continue;
      }

      const step = log.sequence.steps.find(
        (s) => s.stepNumber === log.stepNumber
      );
      if (!step) continue;

      result.retried++;

      const dueDate = log.invoice.dueDate
        ? new Date(log.invoice.dueDate)
        : null;
      const daysOverdue = dueDate
        ? Math.floor((Date.now() - dueDate.getTime()) / MS_PER_DAY)
        : 0;

      const payNowLink = await resolvePaymentLink(log.invoice);
      const orgDefaults = log.invoice.organization.defaults;

      const vars: DunningTemplateVars = {
        customer_name: log.invoice.customer.name,
        invoice_number: log.invoice.invoiceNumber,
        invoice_amount: formatIndianCurrency(log.invoice.totalAmount),
        amount_due: formatIndianCurrency(log.invoice.remainingAmount),
        amount_paid: formatIndianCurrency(log.invoice.amountPaid),
        due_date: log.invoice.dueDate
          ? formatDateIndian(log.invoice.dueDate)
          : "",
        days_overdue: daysOverdue,
        pay_now_link: payNowLink,
        org_name: log.invoice.organization.name,
        org_email: orgDefaults?.portalSupportEmail ?? "",
        org_phone: orgDefaults?.portalSupportPhone ?? "",
        invoice_date: formatDateIndian(log.invoice.invoiceDate),
        unsubscribe_url: buildOptOutUrl(
          log.invoice.organizationId,
          log.invoice.customerId!
        ),
      };

      let retrySuccess = false;

      if (log.channel === "email") {
        const customerEmail = log.invoice.customer.email;
        if (customerEmail) {
          const subject = renderDunningTemplate(step.emailSubject, vars);
          const body =
            renderDunningTemplate(step.emailBody, vars) +
            buildUnsubscribeFooter(vars);
          try {
            await sendEmail({ to: customerEmail, subject, html: body });
            retrySuccess = true;
          } catch {
            // Will be logged below
          }
        }
      } else if (log.channel === "sms") {
        const customerPhone = log.invoice.customer.phone;
        if (customerPhone) {
          const smsText = step.smsBody
            ? renderDunningTemplate(step.smsBody, vars)
            : `Invoice ${log.invoice.invoiceNumber} (${formatIndianCurrency(log.invoice.remainingAmount)}) from ${log.invoice.organization.name} is overdue. Pay: ${vars.pay_now_link}`;
          const smsResult = await sendSms({
            phone: customerPhone,
            message: smsText,
            flowId: step.smsTemplateId ?? undefined,
          });
          retrySuccess = smsResult.success;
        }
      }

      if (retrySuccess) {
        // Mark original as superseded and create a new SENT log
        await db.$transaction([
          db.dunningLog.create({
            data: {
              orgId: log.orgId,
              invoiceId: log.invoiceId,
              sequenceId: log.sequenceId,
              stepNumber: log.stepNumber,
              channel: log.channel,
              status: "SENT",
              sentAt: new Date(),
              createdAt: new Date(),
            },
          }),
        ]);
        result.succeeded++;
      } else {
        await db.dunningLog.create({
          data: {
            orgId: log.orgId,
            invoiceId: log.invoiceId,
            sequenceId: log.sequenceId,
            stepNumber: log.stepNumber,
            channel: log.channel,
            status: "FAILED",
            errorMessage: "Retry failed",
            createdAt: new Date(),
          },
        });
        result.failed++;
      }
    } catch (err) {
      console.error(`[Dunning] Retry error for log ${log.id}:`, err);
      result.failed++;
    }
  }

  return result;
}

// ─── Dunning Controls ───────────────────────────────────────────────────────────

/**
 * Pauses dunning for an invoice. If `until` is provided, pause until that date.
 * If not, pause indefinitely (far future).
 */
export async function pauseDunning(
  invoiceId: string,
  until?: Date
): Promise<void> {
  const pauseUntil = until ?? new Date("2099-12-31T23:59:59.999Z");
  await db.invoice.update({
    where: { id: invoiceId },
    data: { dunningPausedUntil: pauseUntil },
  });
}

/**
 * Clears dunningPausedUntil to resume dunning.
 */
export async function resumeDunning(invoiceId: string): Promise<void> {
  await db.invoice.update({
    where: { id: invoiceId },
    data: { dunningPausedUntil: null },
  });
}

/**
 * Called when an invoice is paid. Disables dunning on the invoice.
 */
export async function stopDunningOnPaid(invoiceId: string): Promise<void> {
  await db.invoice.update({
    where: { id: invoiceId },
    data: { dunningEnabled: false },
  });
}

/**
 * Called when a payment arrangement is created. Disables dunning on the invoice.
 */
export async function stopDunningOnArrangement(
  invoiceId: string
): Promise<void> {
  await db.invoice.update({
    where: { id: invoiceId },
    data: { dunningEnabled: false },
  });
}
