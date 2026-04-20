import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCronSecret } from "@/lib/cron";
import { notifyOrgAdmins, notifyUsers } from "@/lib/notifications";

export const dynamic = "force-dynamic";

async function resolveEscalationTargets(orgId: string, rule: { targetUserId: string | null; targetRole: string | null }) {
  const userIds = new Set<string>();

  if (rule.targetUserId) {
    userIds.add(rule.targetUserId);
  }

  if (rule.targetRole) {
    const members = await db.member.findMany({
      where: { organizationId: orgId, role: rule.targetRole },
      select: { userId: true },
    });
    for (const member of members) {
      userIds.add(member.userId);
    }
  }

  return [...userIds];
}

/**
 * flow.process-ticket-sla
 * Scans open tickets for SLA breaches and applies escalation rules.
 */
export async function GET(request: Request) {
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobId = crypto.randomUUID();
  const triggeredAt = new Date();
  const now = new Date();

  let breachCount = 0;
  let escalationCount = 0;

  try {
    // Find open tickets with SLA deadlines that have not yet been marked breached
    const breachingTickets = await db.invoiceTicket.findMany({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        breachedAt: null,
        OR: [
          { firstResponseDueAt: { not: null, lte: now }, firstRespondedAt: null },
          { resolutionDueAt: { not: null, lte: now } },
        ],
      },
    });

    for (const ticket of breachingTickets) {
      const breachType =
        ticket.firstResponseDueAt &&
        ticket.firstResponseDueAt <= now &&
        !ticket.firstRespondedAt
          ? "first_response"
          : "resolution";

      await db.invoiceTicket.update({
        where: { id: ticket.id },
        data: {
          breachedAt: now,
          breachType,
        },
      });

      breachCount++;
    }

    // Fetch escalation rules for all affected orgs
    const affectedOrgIds = [...new Set(breachingTickets.map((t) => t.orgId))];
    for (const orgId of affectedOrgIds) {
      const rules = await db.ticketEscalationRule.findMany({
        where: { orgId },
      });

      for (const rule of rules) {
        // Find tickets that breached this rule's threshold and haven't been escalated yet
        const escalateThreshold = new Date(now.getTime() - rule.afterMins * 60 * 1000);
        const escalationCandidates = await db.invoiceTicket.findMany({
          where: {
            orgId,
            status: { in: ["OPEN", "IN_PROGRESS"] },
            breachedAt: { not: null, lte: escalateThreshold },
            breachType: rule.breachType,
            escalationLevel: 0,
          },
        });

        for (const ticket of escalationCandidates) {
          const targetUserIds = await resolveEscalationTargets(orgId, rule);

          await db.invoiceTicket.update({
            where: { id: ticket.id },
            data: {
              escalationLevel: { increment: 1 },
              ...(rule.targetUserId ? { assigneeId: rule.targetUserId } : {}),
            },
          });

          if (targetUserIds.length > 0) {
            await notifyUsers({
              orgId,
              userIds: targetUserIds,
              type: "ticket_escalated",
              title: "Ticket Escalated",
              body: `Ticket ${ticket.id.slice(-6).toUpperCase()} breached its ${rule.breachType.replace("_", " ")} SLA and requires action.`,
              link: `/app/flow/tickets/${ticket.id}`,
              sourceModule: "flow",
              sourceRef: ticket.id,
            });
          }

          if (rule.notifyOrgAdmins) {
            await notifyOrgAdmins({
              orgId,
              type: "ticket_escalated",
              title: "Ticket Escalated",
              body: `Ticket ${ticket.id.slice(-6).toUpperCase()} has been escalated due to SLA breach (${rule.breachType}).`,
              link: `/app/flow/tickets/${ticket.id}`,
            });
          }

          escalationCount++;
        }
      }
    }

    await db.jobLog.create({
      data: {
        jobName: "flow.process-ticket-sla",
        jobId,
        status: "completed",
        triggeredAt,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      breachCount,
      escalationCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db.jobLog
      .create({
        data: {
          jobName: "flow.process-ticket-sla",
          jobId,
          status: "failed",
          triggeredAt,
          completedAt: new Date(),
          error: message,
        },
      })
      .catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
