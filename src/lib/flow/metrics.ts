import { db } from "@/lib/db";

export type FlowMetrics = {
  pendingApprovals: number;
  overdueApprovals: number;
  openTickets: number;
  slaBreachCount: number;
  deadLetterCount: number;
  workflowSuccessCount: number;
  workflowFailureCount: number;
  medianApprovalTurnaroundMs: number | null;
  medianTicketResolutionMs: number | null;
};

export async function getFlowMetrics(orgId: string): Promise<FlowMetrics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    pendingApprovals,
    overdueApprovals,
    openTickets,
    slaBreachCount,
    deadLetterCount,
    workflowSuccessCount,
    workflowFailureCount,
    resolvedApprovals,
    resolvedTickets,
  ] = await Promise.all([
    db.approvalRequest.count({ where: { orgId, status: "PENDING" } }),
    db.approvalRequest.count({
      where: { orgId, status: "PENDING", dueAt: { lt: now } },
    }),
    db.invoiceTicket.count({ where: { orgId, status: "OPEN" } }),
    db.invoiceTicket.count({
      where: { orgId, breachedAt: { not: null }, status: { not: "RESOLVED" } },
    }),
    db.deadLetterAction.count({ where: { orgId, resolvedAt: null } }),
    db.workflowRun.count({ where: { orgId, status: "SUCCEEDED" } }),
    db.workflowRun.count({ where: { orgId, status: "FAILED" } }),
    db.approvalRequest.findMany({
      where: {
        orgId,
        status: { in: ["APPROVED", "REJECTED"] },
        decidedAt: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, decidedAt: true },
      take: 200,
    }),
    db.invoiceTicket.findMany({
      where: {
        orgId,
        status: "RESOLVED",
        resolvedAt: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, resolvedAt: true },
      take: 200,
    }),
  ]);

  const median = (values: number[]): number | null => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const approvalTurnarounds = resolvedApprovals
    .filter((a) => a.decidedAt)
    .map((a) => a.decidedAt!.getTime() - a.createdAt.getTime());

  const ticketResolutions = resolvedTickets
    .filter((t) => t.resolvedAt)
    .map((t) => t.resolvedAt!.getTime() - t.createdAt.getTime());

  return {
    pendingApprovals,
    overdueApprovals,
    openTickets,
    slaBreachCount,
    deadLetterCount,
    workflowSuccessCount,
    workflowFailureCount,
    medianApprovalTurnaroundMs: median(approvalTurnarounds),
    medianTicketResolutionMs: median(ticketResolutions),
  };
}
