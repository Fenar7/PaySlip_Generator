import { db } from "@/lib/db";
import { createNotification, notifyOrgAdmins } from "@/lib/notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateApprovalParams {
  docType: string;
  docId: string;
  orgId: string;
  requestedById: string;
  requestedByName: string;
  docNumber: string;
  /** Optional: amount used to select the applicable policy rule */
  amount?: number;
}

// ─── Policy Resolution ────────────────────────────────────────────────────────

/**
 * Find the ACTIVE policy for a given docType (module) and optional amount.
 * Returns the first matching policy and its ordered rules.
 */
export async function resolveApplicablePolicy(
  orgId: string,
  docType: string,
  amount?: number,
) {
  const policies = await db.approvalPolicy.findMany({
    where: {
      orgId,
      status: "ACTIVE",
      OR: [{ module: docType }, { entityType: docType }],
    },
    include: { rules: { orderBy: { sequence: "asc" } } },
  });

  if (policies.length === 0) return null;

  if (amount == null) return policies[0];

  const amountDecimal = amount;
  const scoped = policies.find((p) => {
    if (!p.minAmount && !p.maxAmount) return false;
    const min = p.minAmount != null ? Number(p.minAmount) : null;
    const max = p.maxAmount != null ? Number(p.maxAmount) : null;
    const meetsMin = min == null || amountDecimal >= min;
    const meetsMax = max == null || amountDecimal <= max;
    return meetsMin && meetsMax;
  });

  return scoped ?? policies[0];
}

// ─── Delegation Lookup ────────────────────────────────────────────────────────

async function resolveDelegate(
  orgId: string,
  userId: string,
): Promise<{ effectiveUserId: string; delegatedFromId?: string }> {
  const now = new Date();
  const delegation = await db.approvalDelegation.findFirst({
    where: {
      orgId,
      fromUserId: userId,
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (delegation) {
    return { effectiveUserId: delegation.toUserId, delegatedFromId: userId };
  }
  return { effectiveUserId: userId };
}

// ─── Notify Rule Approvers ────────────────────────────────────────────────────

async function notifyRuleApprovers(
  _requestId: string,
  orgId: string,
  rule: {
    approverUserId?: string | null;
    approverRole?: string | null;
    allowDelegation: boolean;
  },
  body: string,
  link: string,
) {
  if (rule.approverUserId) {
    const { effectiveUserId } = rule.allowDelegation
      ? await resolveDelegate(orgId, rule.approverUserId)
      : { effectiveUserId: rule.approverUserId };

    await createNotification({
      orgId,
      userId: effectiveUserId,
      type: "approval_requested",
      title: "Approval Required",
      body,
      link,
    });
    return;
  }

  await notifyOrgAdmins({ orgId, type: "approval_requested", title: "Approval Required", body, link });
}

// ─── Create Approval Request ──────────────────────────────────────────────────

export async function createApprovalRequest(params: CreateApprovalParams) {
  const policy = await resolveApplicablePolicy(params.orgId, params.docType, params.amount);
  const firstRule = policy?.rules?.[0];

  const dueAt = firstRule?.escalateAfterHours
    ? new Date(Date.now() + firstRule.escalateAfterHours * 3_600_000)
    : undefined;

  const approval = await db.approvalRequest.create({
    data: {
      docType: params.docType,
      docId: params.docId,
      orgId: params.orgId,
      requestedById: params.requestedById,
      requestedByName: params.requestedByName,
      status: "PENDING",
      policyId: policy?.id,
      policyRuleId: firstRule?.id,
      currentRuleOrder: firstRule?.sequence ?? 1,
      dueAt,
    },
  });

  const link = `/app/flow/approvals/${approval.id}`;
  const body = `${params.requestedByName} requested approval for ${params.docType} ${params.docNumber}`;

  if (firstRule) {
    await notifyRuleApprovers(approval.id, params.orgId, firstRule, body, link);
  } else {
    await notifyOrgAdmins({
      orgId: params.orgId,
      type: "approval_requested",
      title: "Approval Requested",
      body,
      link,
      excludeUserId: params.requestedById === "system" ? undefined : params.requestedById,
    });
  }

  return approval;
}

// ─── Chain Advancement ────────────────────────────────────────────────────────

/**
 * Record a decision for the current rule and advance the chain to the next step,
 * or report back the final status ("APPROVED" | "REJECTED" | "PENDING").
 */
export async function advanceApprovalChain(
  requestId: string,
  decidedById: string,
  decidedByName: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string,
): Promise<{ status: "APPROVED" | "REJECTED" | "PENDING" }> {
  const request = await db.approvalRequest.findUnique({
    where: { id: requestId },
    select: {
      orgId: true,
      policyId: true,
      currentRuleOrder: true,
      docType: true,
    },
  });
  if (!request) throw new Error(`ApprovalRequest ${requestId} not found`);

  await db.approvalDecision.create({
    data: {
      requestId,
      ruleOrder: request.currentRuleOrder,
      decidedById,
      decidedByName,
      decision,
      comment,
    },
  });

  if (decision === "REJECTED") {
    return { status: "REJECTED" };
  }

  if (request.policyId) {
    const nextRule = await db.approvalPolicyRule.findFirst({
      where: {
        policyId: request.policyId,
        sequence: { gt: request.currentRuleOrder },
      },
      orderBy: { sequence: "asc" },
    });

    if (nextRule) {
      const dueAt = nextRule.escalateAfterHours
        ? new Date(Date.now() + nextRule.escalateAfterHours * 3_600_000)
        : null;

      await db.approvalRequest.update({
        where: { id: requestId },
        data: {
          currentRuleOrder: nextRule.sequence,
          policyRuleId: nextRule.id,
          dueAt,
          escalatedAt: null,
          escalationLevel: 0,
          lastReminderAt: null,
        },
      });

      await notifyRuleApprovers(
        requestId,
        request.orgId,
        nextRule,
        `Approval for ${request.docType} is now at step ${nextRule.sequence} and requires your decision.`,
        `/app/flow/approvals/${requestId}`,
      );

      return { status: "PENDING" };
    }
  }

  return { status: "APPROVED" };
}

// ─── Escalation Processing ────────────────────────────────────────────────────

/**
 * Advance or notify overdue approval requests. Called by the escalation cron job.
 */
export async function processApprovalEscalations(): Promise<{
  escalated: number;
  reminded: number;
}> {
  const now = new Date();
  let escalated = 0;
  let reminded = 0;

  const overdueApprovals = await db.approvalRequest.findMany({
    where: {
      status: { in: ["PENDING", "ESCALATED"] },
      dueAt: { not: null, lte: now },
      escalatedAt: null,
    },
    select: {
      id: true,
      orgId: true,
      docType: true,
      policyId: true,
      currentRuleOrder: true,
    },
  });

  for (const approval of overdueApprovals) {
    const nextRule = approval.policyId
      ? await db.approvalPolicyRule.findFirst({
          where: { policyId: approval.policyId, sequence: { gt: approval.currentRuleOrder } },
          orderBy: { sequence: "asc" },
        })
      : null;

    if (nextRule) {
      const dueAt = nextRule.escalateAfterHours
        ? new Date(Date.now() + nextRule.escalateAfterHours * 3_600_000)
        : null;

      await db.approvalRequest.update({
        where: { id: approval.id },
        data: {
          currentRuleOrder: nextRule.sequence,
          policyRuleId: nextRule.id,
          status: "ESCALATED",
          escalatedAt: now,
          escalationLevel: { increment: 1 },
          dueAt,
          lastReminderAt: null,
        },
      });

      await notifyRuleApprovers(
        approval.id,
        approval.orgId,
        nextRule,
        `An overdue approval for ${approval.docType} has been escalated to you.`,
        `/app/flow/approvals/${approval.id}`,
      );
    } else {
      await db.approvalRequest.update({
        where: { id: approval.id },
        data: { status: "ESCALATED", escalatedAt: now, escalationLevel: { increment: 1 } },
      });

      await notifyOrgAdmins({
        orgId: approval.orgId,
        type: "approval_escalated",
        title: "Approval Escalated",
        body: `An approval for ${approval.docType} is overdue with no remaining escalation levels.`,
        link: `/app/flow/approvals/${approval.id}`,
      });
    }

    escalated++;
  }

  const reminderThreshold = new Date(now.getTime() + 2 * 3_600_000);
  const approachingApprovals = await db.approvalRequest.findMany({
    where: {
      status: "PENDING",
      dueAt: { not: null, gte: now, lte: reminderThreshold },
      lastReminderAt: null,
    },
    select: { id: true, orgId: true, docType: true },
  });

  for (const approval of approachingApprovals) {
    await db.approvalRequest.update({
      where: { id: approval.id },
      data: { lastReminderAt: now },
    });

    await notifyOrgAdmins({
      orgId: approval.orgId,
      type: "approval_reminder",
      title: "Approval Reminder",
      body: `An approval for ${approval.docType} is approaching its deadline.`,
      link: `/app/flow/approvals/${approval.id}`,
    });

    reminded++;
  }

  return { escalated, reminded };
}
