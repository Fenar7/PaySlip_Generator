import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();
  const results = { sent: 0, failed: 0 };

  try {
    const pendingSends = await db.scheduledSend.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: new Date() },
      },
      include: {
        invoice: {
          include: {
            publicTokens: { take: 1, orderBy: { createdAt: "desc" } },
          },
        },
      },
    });

    for (const send of pendingSends) {
      try {
        const token = send.invoice.publicTokens[0]?.token;
        const viewUrl = token
          ? `${process.env.NEXT_PUBLIC_APP_URL || "https://app.slipwise.app"}/invoice/${token}`
          : `${process.env.NEXT_PUBLIC_APP_URL || "https://app.slipwise.app"}/app/docs/invoices/${send.invoice.id}`;

        await sendEmail({
          to: send.recipientEmail,
          subject: `Invoice ${send.invoice.invoiceNumber} from Slipwise`,
          html: `<p>You have received invoice <strong>${send.invoice.invoiceNumber}</strong>.</p>
                 <p><a href="${viewUrl}">View Invoice</a></p>`,
        });

        await db.scheduledSend.update({
          where: { id: send.id },
          data: { status: "SENT", sentAt: new Date() },
        });

        results.sent++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : "Send failed";
        await db.scheduledSend.update({
          where: { id: send.id },
          data: { status: "FAILED", failReason: reason },
        });
        results.failed++;
      }
    }

    await db.jobLog.create({
      data: {
        jobName: "send-scheduled",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.jobLog.create({
      data: {
        jobName: "send-scheduled",
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
