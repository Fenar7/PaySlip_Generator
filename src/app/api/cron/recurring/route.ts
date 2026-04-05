import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret, calculateNextRunAt } from "@/lib/cron";
import { nextDocumentNumber } from "@/lib/docs";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();
  const results = { generated: 0, errors: 0 };

  try {
    const rules = await db.recurringInvoiceRule.findMany({
      where: {
        status: "ACTIVE",
        nextRunAt: { lte: new Date() },
      },
      include: {
        baseInvoice: {
          include: { lineItems: true },
        },
      },
    });

    for (const rule of rules) {
      try {
        const base = rule.baseInvoice;
        const invoiceNumber = await nextDocumentNumber(rule.orgId, "invoice");
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];

        const newInvoice = await db.invoice.create({
          data: {
            organizationId: rule.orgId,
            customerId: base.customerId,
            invoiceNumber,
            invoiceDate: todayStr,
            dueDate: base.dueDate || null,
            status: "DRAFT",
            formData: base.formData as Prisma.InputJsonValue,
            totalAmount: base.totalAmount,
            notes: base.notes,
            generatedFromRuleId: rule.id,
            lineItems: {
              create: base.lineItems.map((item, idx) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: item.taxRate,
                discount: item.discount,
                amount: item.amount,
                sortOrder: idx,
              })),
            },
          },
        });

        const nextRun = calculateNextRunAt(now, rule.frequency);
        const isCompleted = rule.endDate && nextRun > rule.endDate;

        await db.recurringInvoiceRule.update({
          where: { id: rule.id },
          data: {
            runsCount: { increment: 1 },
            lastRunAt: now,
            nextRunAt: nextRun,
            status: isCompleted ? "COMPLETED" : "ACTIVE",
          },
        });

        if (rule.autoSend && base.customerId) {
          const customer = await db.customer.findUnique({
            where: { id: base.customerId },
            select: { email: true },
          });
          if (customer?.email) {
            await db.scheduledSend.create({
              data: {
                invoiceId: newInvoice.id,
                orgId: rule.orgId,
                recipientEmail: customer.email,
                scheduledAt: now,
              },
            });
          }
        }

        await db.jobLog.create({
          data: {
            jobName: "recurring-generate",
            jobId,
            status: "completed",
            invoiceId: newInvoice.id,
            triggeredAt,
            completedAt: new Date(),
          },
        });

        results.generated++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Rule processing failed";
        await db.jobLog.create({
          data: {
            jobName: "recurring-generate",
            jobId,
            status: "failed",
            invoiceId: rule.baseInvoiceId,
            triggeredAt,
            completedAt: new Date(),
            error: message,
          },
        });
        results.errors++;
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.jobLog.create({
      data: {
        jobName: "recurring-generate",
        jobId,
        status: "failed",
        triggeredAt,
        completedAt: new Date(),
        error: message,
      },
    }).catch(() => {});

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
