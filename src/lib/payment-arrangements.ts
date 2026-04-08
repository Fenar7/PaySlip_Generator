import "server-only";

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { reconcileInvoicePayment } from "@/lib/invoice-reconciliation";
import { stopDunningOnArrangement, resumeDunning } from "@/lib/dunning";
import type { Prisma } from "@/generated/prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateArrangementParams {
  orgId: string;
  invoiceId: string;
  customerId: string;
  totalArranged: number;
  installmentCount: number;
  notes?: string;
  createdBy: string;
  installments: Array<{ dueDate: Date; amount: number }>;
}

export interface RecordPaymentParams {
  amount: number;
  paymentMethod: string;
  reference?: string;
}

export interface OverdueCheckResult {
  markedOverdue: number;
  defaulted: number;
}

// ─── 1. Create Arrangement ──────────────────────────────────────────────────

export async function createArrangement(
  params: CreateArrangementParams,
) {
  const {
    orgId,
    invoiceId,
    customerId,
    totalArranged,
    installmentCount,
    notes,
    createdBy,
    installments,
  } = params;

  // Validate invoice
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      organizationId: true,
      remainingAmount: true,
      status: true,
      arrangement: { select: { id: true } },
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }
  if (invoice.organizationId !== orgId) {
    throw new Error("Invoice does not belong to this organization");
  }
  if (invoice.arrangement) {
    throw new Error("Invoice already has a payment arrangement");
  }
  if (totalArranged > invoice.remainingAmount + 0.01) {
    throw new Error(
      `Total arranged (${totalArranged}) exceeds remaining balance (${invoice.remainingAmount.toFixed(2)})`,
    );
  }

  // Validate installments sum
  const installmentSum = installments.reduce((sum, i) => sum + i.amount, 0);
  if (Math.abs(installmentSum - totalArranged) > 0.01) {
    throw new Error(
      `Installment amounts (${installmentSum.toFixed(2)}) do not match total arranged (${totalArranged.toFixed(2)})`,
    );
  }

  // Validate chronological order
  for (let i = 1; i < installments.length; i++) {
    if (installments[i].dueDate <= installments[i - 1].dueDate) {
      throw new Error("Installment dates must be in chronological order");
    }
  }

  // Create arrangement + installments in a transaction
  const arrangement = await db.$transaction(async (tx) => {
    const created = await tx.paymentArrangement.create({
      data: {
        orgId,
        invoiceId,
        customerId,
        totalArranged,
        installmentCount,
        notes: notes || null,
        createdBy,
        installments: {
          create: installments.map((inst, idx) => ({
            installmentNumber: idx + 1,
            dueDate: inst.dueDate,
            amount: inst.amount,
          })),
        },
      },
      include: { installments: true },
    });

    // Update invoice status to ARRANGEMENT_MADE
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { status: "ARRANGEMENT_MADE" },
    });

    // Create state event
    await tx.invoiceStateEvent.create({
      data: {
        invoiceId,
        fromStatus: invoice.status,
        toStatus: "ARRANGEMENT_MADE",
        actorId: createdBy,
        reason: "Payment arrangement created",
        metadata: {
          arrangementId: created.id,
          totalArranged,
          installmentCount,
        } as Prisma.InputJsonValue,
      },
    });

    return created;
  });

  // Stop dunning (fire-and-forget)
  stopDunningOnArrangement(invoiceId).catch((err) =>
    console.error("[payment-arrangements] stopDunning error:", err),
  );

  // Audit log (fire-and-forget)
  logAudit({
    orgId,
    actorId: createdBy,
    action: "arrangement.created",
    entityType: "payment_arrangement",
    entityId: arrangement.id,
    metadata: {
      invoiceId,
      customerId,
      totalArranged,
      installmentCount,
    },
  }).catch(() => {});

  return arrangement;
}

// ─── 2. Record Installment Payment ──────────────────────────────────────────

export async function recordInstallmentPayment(
  installmentId: string,
  paymentData: RecordPaymentParams,
  actorId: string,
) {
  const installment = await db.paymentInstallment.findUnique({
    where: { id: installmentId },
    include: {
      arrangement: {
        include: {
          invoice: { select: { id: true, organizationId: true } },
          installments: { select: { id: true, status: true } },
        },
      },
    },
  });

  if (!installment) {
    throw new Error("Installment not found");
  }
  if (installment.status !== "PENDING" && installment.status !== "OVERDUE") {
    throw new Error(`Cannot record payment for installment with status ${installment.status}`);
  }

  const arrangement = installment.arrangement;
  const invoice = arrangement.invoice;

  // Create payment + update installment in a transaction
  const result = await db.$transaction(async (tx) => {
    // Create InvoicePayment record
    const payment = await tx.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        orgId: invoice.organizationId,
        amount: paymentData.amount,
        method: paymentData.paymentMethod,
        paymentMethodDisplay: paymentData.paymentMethod,
        source: "arrangement_installment",
        status: "SETTLED",
        externalReferenceId: paymentData.reference || null,
        recordedByUserId: actorId,
        note: `Installment #${installment.installmentNumber} payment`,
      },
    });

    // Mark installment as PAID and link to payment
    await tx.paymentInstallment.update({
      where: { id: installmentId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        invoicePaymentId: payment.id,
      },
    });

    return payment;
  });

  // Reconcile invoice payment totals
  await reconcileInvoicePayment(invoice.id, actorId);

  // Check if all installments are now paid → complete arrangement
  const updatedInstallments = await db.paymentInstallment.findMany({
    where: { arrangementId: arrangement.id },
    select: { status: true },
  });

  const allPaid = updatedInstallments.every((i) => i.status === "PAID");
  if (allPaid) {
    await db.paymentArrangement.update({
      where: { id: arrangement.id },
      data: { status: "COMPLETED" },
    });
  }

  // Audit log (fire-and-forget)
  logAudit({
    orgId: invoice.organizationId,
    actorId,
    action: "arrangement.installment_paid",
    entityType: "payment_installment",
    entityId: installmentId,
    metadata: {
      arrangementId: arrangement.id,
      invoiceId: invoice.id,
      installmentNumber: installment.installmentNumber,
      amount: paymentData.amount,
      allCompleted: allPaid,
    },
  }).catch(() => {});

  return result;
}

// ─── 3. Check Overdue Installments ──────────────────────────────────────────

const DEFAULT_OVERDUE_THRESHOLD = 2;

export async function checkOverdueInstallments(): Promise<OverdueCheckResult> {
  const now = new Date();

  // Find PENDING installments that are past due
  const overdueInstallments = await db.paymentInstallment.findMany({
    where: {
      status: "PENDING",
      dueDate: { lt: now },
    },
    include: {
      arrangement: {
        select: { id: true, orgId: true, invoiceId: true, status: true },
      },
    },
  });

  let markedOverdue = 0;
  let defaulted = 0;

  for (const inst of overdueInstallments) {
    try {
      // Mark installment as OVERDUE
      await db.paymentInstallment.update({
        where: { id: inst.id },
        data: { status: "OVERDUE" },
      });
      markedOverdue++;

      // Check if arrangement should be defaulted
      if (inst.arrangement.status === "ACTIVE") {
        const overdueCount = await db.paymentInstallment.count({
          where: {
            arrangementId: inst.arrangement.id,
            status: "OVERDUE",
          },
        });

        if (overdueCount >= DEFAULT_OVERDUE_THRESHOLD) {
          await db.$transaction(async (tx) => {
            // Mark arrangement DEFAULTED
            await tx.paymentArrangement.update({
              where: { id: inst.arrangement.id },
              data: { status: "DEFAULTED" },
            });

            // Revert invoice status to OVERDUE
            await tx.invoice.update({
              where: { id: inst.arrangement.invoiceId },
              data: { status: "OVERDUE" },
            });

            await tx.invoiceStateEvent.create({
              data: {
                invoiceId: inst.arrangement.invoiceId,
                fromStatus: "ARRANGEMENT_MADE",
                toStatus: "OVERDUE",
                reason: "Payment arrangement defaulted",
                metadata: {
                  arrangementId: inst.arrangement.id,
                  overdueInstallments: overdueCount,
                } as Prisma.InputJsonValue,
              },
            });
          });

          // Resume dunning on the invoice
          resumeDunning(inst.arrangement.invoiceId).catch((err) =>
            console.error("[payment-arrangements] resumeDunning error:", err),
          );

          defaulted++;

          logAudit({
            orgId: inst.arrangement.orgId,
            actorId: "system",
            action: "arrangement.defaulted",
            entityType: "payment_arrangement",
            entityId: inst.arrangement.id,
            metadata: {
              invoiceId: inst.arrangement.invoiceId,
              overdueInstallments: overdueCount,
            },
          }).catch(() => {});
        }
      }
    } catch (error) {
      console.error(
        `[payment-arrangements] Error processing overdue installment ${inst.id}:`,
        error,
      );
    }
  }

  return { markedOverdue, defaulted };
}

// ─── 4. Cancel Arrangement ──────────────────────────────────────────────────

export async function cancelArrangement(
  arrangementId: string,
  actorId: string,
  reason?: string,
) {
  const arrangement = await db.paymentArrangement.findUnique({
    where: { id: arrangementId },
    include: {
      invoice: { select: { id: true, status: true, amountPaid: true } },
      installments: { select: { id: true, status: true } },
    },
  });

  if (!arrangement) {
    throw new Error("Arrangement not found");
  }
  if (arrangement.status === "CANCELLED") {
    throw new Error("Arrangement is already cancelled");
  }
  if (arrangement.status === "COMPLETED") {
    throw new Error("Cannot cancel a completed arrangement");
  }

  await db.$transaction(async (tx) => {
    // Mark arrangement CANCELLED
    await tx.paymentArrangement.update({
      where: { id: arrangementId },
      data: { status: "CANCELLED" },
    });

    // Mark remaining PENDING installments as WAIVED
    const pendingIds = arrangement.installments
      .filter((i) => i.status === "PENDING" || i.status === "OVERDUE")
      .map((i) => i.id);

    if (pendingIds.length > 0) {
      await tx.paymentInstallment.updateMany({
        where: { id: { in: pendingIds } },
        data: { status: "WAIVED" },
      });
    }

    // Revert invoice status based on payment state
    const newStatus =
      arrangement.invoice.amountPaid > 0 ? "PARTIALLY_PAID" : "OVERDUE";

    await tx.invoice.update({
      where: { id: arrangement.invoice.id },
      data: { status: newStatus },
    });

    await tx.invoiceStateEvent.create({
      data: {
        invoiceId: arrangement.invoice.id,
        fromStatus: arrangement.invoice.status,
        toStatus: newStatus,
        actorId,
        reason: reason || "Payment arrangement cancelled",
        metadata: {
          arrangementId,
          waivedInstallments: pendingIds.length,
        } as Prisma.InputJsonValue,
      },
    });
  });

  // Resume dunning
  resumeDunning(arrangement.invoice.id).catch((err) =>
    console.error("[payment-arrangements] resumeDunning error:", err),
  );

  // Audit log
  logAudit({
    orgId: arrangement.orgId,
    actorId,
    action: "arrangement.cancelled",
    entityType: "payment_arrangement",
    entityId: arrangementId,
    metadata: {
      invoiceId: arrangement.invoiceId,
      reason: reason || null,
    },
  }).catch(() => {});
}

// ─── 5. Get Arrangement for Invoice ─────────────────────────────────────────

export async function getArrangementForInvoice(invoiceId: string) {
  return db.paymentArrangement.findUnique({
    where: { invoiceId },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          totalAmount: true,
          remainingAmount: true,
          status: true,
        },
      },
      creator: { select: { id: true, name: true } },
      installments: {
        orderBy: { installmentNumber: "asc" },
        include: {
          invoicePayment: {
            select: {
              id: true,
              amount: true,
              method: true,
              paidAt: true,
              externalReferenceId: true,
            },
          },
        },
      },
    },
  });
}

// ─── 6. List Arrangements ───────────────────────────────────────────────────

export async function listArrangements(
  orgId: string,
  status?: string,
) {
  const where: Prisma.PaymentArrangementWhereInput = { orgId };

  if (status && status !== "ALL") {
    where.status = status as Prisma.PaymentArrangementWhereInput["status"];
  }

  return db.paymentArrangement.findMany({
    where,
    include: {
      customer: { select: { name: true } },
      invoice: { select: { invoiceNumber: true, totalAmount: true } },
      installments: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
