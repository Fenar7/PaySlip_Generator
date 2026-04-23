import { db } from "@/lib/db";
import { notifyOrgAdmins, notifyUsers } from "@/lib/notifications";
import { toAccountingNumber } from "@/lib/accounting/utils";

export interface CreateApprovalParams {
  docType: string;
  docId: string;
  orgId: string;
  requestedById: string;
  requestedByName: string;
  docNumber: string;
  amount?: number;
  note?: string;
  fallbackRequestedById?: string;
}

type ApprovalRule = {
  id: string;
  sequence: number;
  minAmount?: unknown;
  maxAmount?: unknown;
  approverUserId?: string | null;
  approverRole?: string | null;
  fallbackRole?: string | null;
  fallbackUserId?: string | null;
  approvalMode?: string;
  escalateAfterHours?: number | null;
  allowDelegation: boolean;
};

type ApprovalRequestContext = {
  id: string;
  orgId: string;
  policyId: string | null;
  policyRuleId: string | null;
  currentRuleOrder: number;
  docType: string;
  docId: string;
};

type ApprovalTarget = {
  userId: string;
  slotUserId: string;
  delegatedFromId?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesAmountRange(
  minAmount: unknown,
  maxAmount: unknown,
  amount?: number,
): boolean {
  if (amount == null) {
    return true;
  }

  const min = toNumberOrNull(minAmount);
  const max = toNumberOrNull(maxAmount);
  return (min == null || amount >= min) && (max == null || amount <= max);
}

function getRuleDueAt(rule: { escalateAfterHours?: number | null }): Date | undefined {
  if (!rule.escalateAfterHours || rule.escalateAfterHours <= 0) {
    return undefined;
  }

  return new Date(Date.now() + rule.escalateAfterHours * 3_600_000);
}

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

  if (!delegation) {
    return { effectiveUserId: userId };
  }

  return { effectiveUserId: delegation.toUserId, delegatedFromId: userId };
}

async function resolveTargetsForConfig(
  orgId: string,
  input: { userId?: string | null; role?: string | null; allowDelegation: boolean },
): Promise<ApprovalTarget[]> {
  const candidateUserIds = new Set<string>();

  if (input.userId) {
    candidateUserIds.add(input.userId);
  }

  if (input.role) {
    const members = await db.member.findMany({
      where: { organizationId: orgId, role: input.role },
      select: { userId: true },
    });

    for (const member of members) {
      candidateUserIds.add(member.userId);
    }
  }

  const targets: ApprovalTarget[] = [];
  for (const candidateUserId of candidateUserIds) {
    if (input.allowDelegation) {
      const delegation = await resolveDelegate(orgId, candidateUserId);
      targets.push({
        userId: delegation.effectiveUserId,
        slotUserId: delegation.delegatedFromId ?? candidateUserId,
        delegatedFromId: delegation.delegatedFromId,
      });
      continue;
    }

    targets.push({ userId: candidateUserId, slotUserId: candidateUserId });
  }

  return targets;
}

async function resolveRuleTargets(orgId: string, rule: ApprovalRule): Promise<ApprovalTarget[]> {
  const primaryTargets = await resolveTargetsForConfig(orgId, {
    userId: rule.approverUserId,
    role: rule.approverRole,
    allowDelegation: rule.allowDelegation,
  });

  if (primaryTargets.length > 0) {
    return primaryTargets;
  }

  const fallbackTargets = await resolveTargetsForConfig(orgId, {
    userId: rule.fallbackUserId,
    role: rule.fallbackRole,
    allowDelegation: rule.allowDelegation,
  });

  if (fallbackTargets.length > 0) {
    return fallbackTargets;
  }

  const admins = await db.member.findMany({
    where: { organizationId: orgId, role: { in: ["owner", "admin"] } },
    select: { userId: true },
  });

  return admins.map((admin) => ({ userId: admin.userId, slotUserId: admin.userId }));
}

async function notifyRuleTargets(params: {
  orgId: string;
  rule: ApprovalRule;
  type: string;
  title: string;
  body: string;
  link: string;
  excludeUserId?: string;
}) {
  const targets = await resolveRuleTargets(params.orgId, params.rule);
  const userIds = [...new Set(targets.map((target) => target.userId))];

  if (userIds.length > 0) {
    await notifyUsers({
      orgId: params.orgId,
      userIds,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
      excludeUserId: params.excludeUserId,
      sourceModule: "flow",
      sourceRef: params.rule.id,
    });
    return;
  }

  await notifyOrgAdmins({
    orgId: params.orgId,
    type: params.type,
    title: params.title,
    body: params.body,
    link: params.link,
    excludeUserId: params.excludeUserId,
  });
}

function filterApplicableRules<T extends ApprovalRule>(rules: T[], amount?: number): T[] {
  return rules.filter((rule) => matchesAmountRange(rule.minAmount, rule.maxAmount, amount));
}

async function getCurrentRule(request: ApprovalRequestContext): Promise<ApprovalRule | null> {
  if (request.policyRuleId) {
    const currentRule = await db.approvalPolicyRule.findUnique({
      where: { id: request.policyRuleId },
    });
    if (currentRule) {
      return currentRule;
    }
  }

  if (!request.policyId) {
    return null;
  }

  return db.approvalPolicyRule.findFirst({
    where: { policyId: request.policyId, sequence: request.currentRuleOrder },
    orderBy: { sequence: "asc" },
  });
}

async function getNextApplicableRule(
  policyId: string,
  currentRuleOrder: number,
  amount?: number,
): Promise<ApprovalRule | null> {
  const remainingRules = await db.approvalPolicyRule.findMany({
    where: {
      policyId,
      sequence: { gt: currentRuleOrder },
    },
    orderBy: { sequence: "asc" },
  });

  return filterApplicableRules(remainingRules, amount)[0] ?? null;
}

export async function getApprovalDocumentAmount(
  docType: string,
  docId: string,
  orgId: string,
): Promise<number | undefined> {
  switch (docType) {
    case "invoice": {
      const invoice = await db.invoice.findFirst({
        where: { id: docId, organizationId: orgId },
        select: { totalAmount: true },
      });
      return invoice ? toAccountingNumber(invoice.totalAmount) : undefined;
    }
    case "voucher": {
      const voucher = await db.voucher.findFirst({
        where: { id: docId, organizationId: orgId },
        select: { totalAmount: true },
      });
      return voucher ? toAccountingNumber(voucher.totalAmount) : undefined;
    }
    case "salary-slip": {
      const salarySlip = await db.salarySlip.findFirst({
        where: { id: docId, organizationId: orgId },
        select: { netPay: true },
      });
      return salarySlip ? toAccountingNumber(salarySlip.netPay) : undefined;
    }
    case "vendor-bill": {
      const vendorBill = await db.vendorBill.findFirst({
        where: { id: docId, orgId },
        select: { totalAmount: true },
      });
      return vendorBill ? toAccountingNumber(vendorBill.totalAmount) : undefined;
    }
    case "payment-run": {
      const paymentRun = await db.paymentRun.findFirst({
        where: { id: docId, orgId },
        select: { totalAmount: true },
      });
      return paymentRun ? toAccountingNumber(paymentRun.totalAmount) : undefined;
    }
    default:
      return undefined;
  }
}

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

  if (policies.length === 0) {
    return null;
  }

  if (amount == null) {
    return policies[0];
  }

  const scopedPolicy = policies.find((policy) => {
    if (matchesAmountRange(policy.minAmount, policy.maxAmount, amount)) {
      return true;
    }

    return filterApplicableRules(policy.rules, amount).length > 0;
  });

  return scopedPolicy ?? policies[0];
}

export async function getApprovalDecisionContext(
  approval: ApprovalRequestContext,
  userId: string,
): Promise<{ allowed: boolean; delegatedFromId?: string }> {
  const currentRule = await getCurrentRule(approval);

  if (!currentRule) {
    return { allowed: true };
  }

  const targets = await resolveRuleTargets(approval.orgId, currentRule);
  const target = targets.find((candidate) => candidate.userId === userId);

  if (!target) {
    return { allowed: false };
  }

  return { allowed: true, delegatedFromId: target.delegatedFromId };
}

export async function createApprovalRequest(params: CreateApprovalParams) {
  const resolvedAmount =
    params.amount ?? (await getApprovalDocumentAmount(params.docType, params.docId, params.orgId));
  const policy = await resolveApplicablePolicy(params.orgId, params.docType, resolvedAmount);
  const firstRule = policy ? filterApplicableRules(policy.rules, resolvedAmount)[0] : null;

  const requestedById = isUuid(params.requestedById)
    ? params.requestedById
    : isUuid(params.fallbackRequestedById)
      ? params.fallbackRequestedById
      : null;

  if (!requestedById) {
    throw new Error("Approval request requires a valid requester user ID.");
  }

  const approval = await db.approvalRequest.create({
    data: {
      docType: params.docType,
      docId: params.docId,
      orgId: params.orgId,
      requestedById,
      requestedByName: params.requestedByName,
      status: "PENDING",
      note: params.note?.trim() || null,
      policyId: policy?.id,
      policyRuleId: firstRule?.id,
      currentRuleOrder: firstRule?.sequence ?? 1,
      dueAt: getRuleDueAt(firstRule ?? {}),
    },
  });

  const link = `/app/flow/approvals/${approval.id}`;
  const body = `${params.requestedByName} requested approval for ${params.docType} ${params.docNumber}`;

  if (firstRule) {
    await notifyRuleTargets({
      orgId: params.orgId,
      rule: firstRule,
      type: "approval_requested",
      title: "Approval Required",
      body,
      link,
      excludeUserId: requestedById,
    });
  } else {
    await notifyOrgAdmins({
      orgId: params.orgId,
      type: "approval_requested",
      title: "Approval Requested",
      body,
      link,
      excludeUserId: requestedById,
    });
  }

  return approval;
}

export async function advanceApprovalChain(
  requestId: string,
  decidedById: string,
  decidedByName: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string,
  delegatedFromId?: string,
): Promise<{ status: "APPROVED" | "REJECTED" | "PENDING" }> {
  const request = await db.approvalRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      orgId: true,
      policyId: true,
      policyRuleId: true,
      currentRuleOrder: true,
      docType: true,
      docId: true,
    },
  });

  if (!request) {
    throw new Error(`ApprovalRequest ${requestId} not found`);
  }

  const existingDecision = await db.approvalDecision.findFirst({
    where: {
      requestId,
      ruleOrder: request.currentRuleOrder,
      decidedById,
    },
    select: { id: true },
  });

  if (existingDecision) {
    throw new Error("You have already decided this approval step.");
  }

  await db.approvalDecision.create({
    data: {
      requestId,
      ruleOrder: request.currentRuleOrder,
      decidedById,
      decidedByName,
      delegatedFromId,
      decision,
      comment,
    },
  });

  if (decision === "REJECTED") {
    return { status: "REJECTED" };
  }

  const currentRule = await getCurrentRule(request);
  if (currentRule?.approvalMode === "all_required") {
    const targets = await resolveRuleTargets(request.orgId, currentRule);
    const requiredSlots = [...new Set(targets.map((target) => target.slotUserId))];

    if (requiredSlots.length > 0) {
      const approvedDecisions = await db.approvalDecision.findMany({
        where: {
          requestId,
          ruleOrder: request.currentRuleOrder,
          decision: "APPROVED",
        },
        select: { decidedById: true, delegatedFromId: true },
      });

      const approvedSlots = new Set(
        approvedDecisions.map((approvedDecision) => approvedDecision.delegatedFromId ?? approvedDecision.decidedById),
      );

      if (!requiredSlots.every((slotUserId) => approvedSlots.has(slotUserId))) {
        return { status: "PENDING" };
      }
    }
  }

  const amount = await getApprovalDocumentAmount(request.docType, request.docId, request.orgId);
  const nextRule = request.policyId
    ? await getNextApplicableRule(request.policyId, request.currentRuleOrder, amount)
    : null;

  if (nextRule) {
    await db.approvalRequest.update({
      where: { id: requestId },
      data: {
        currentRuleOrder: nextRule.sequence,
        policyRuleId: nextRule.id,
        status: "PENDING",
        dueAt: getRuleDueAt(nextRule) ?? null,
        escalatedAt: null,
        escalationLevel: 0,
        lastReminderAt: null,
      },
    });

    await notifyRuleTargets({
      orgId: request.orgId,
      rule: nextRule,
      type: "approval_requested",
      title: "Approval Required",
      body: `Approval for ${request.docType} is now at step ${nextRule.sequence} and requires your decision.`,
      link: `/app/flow/approvals/${requestId}`,
      excludeUserId: decidedById,
    });

    return { status: "PENDING" };
  }

  return { status: "APPROVED" };
}

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
    },
    select: {
      id: true,
      orgId: true,
      docType: true,
      docId: true,
      policyId: true,
      policyRuleId: true,
      currentRuleOrder: true,
    },
  });

  for (const approval of overdueApprovals) {
    const amount = await getApprovalDocumentAmount(approval.docType, approval.docId, approval.orgId);
    const nextRule = approval.policyId
      ? await getNextApplicableRule(approval.policyId, approval.currentRuleOrder, amount)
      : null;

    if (nextRule) {
      await db.approvalRequest.update({
        where: { id: approval.id },
        data: {
          currentRuleOrder: nextRule.sequence,
          policyRuleId: nextRule.id,
          status: "ESCALATED",
          escalatedAt: now,
          escalationLevel: { increment: 1 },
          dueAt: getRuleDueAt(nextRule) ?? null,
          lastReminderAt: null,
        },
      });

      await notifyRuleTargets({
        orgId: approval.orgId,
        rule: nextRule,
        type: "approval_escalated",
        title: "Approval Escalated",
        body: `An overdue approval for ${approval.docType} has been escalated to you.`,
        link: `/app/flow/approvals/${approval.id}`,
      });
    } else {
      await db.approvalRequest.update({
        where: { id: approval.id },
        data: {
          status: "ESCALATED",
          escalatedAt: now,
          escalationLevel: { increment: 1 },
          dueAt: null,
          lastReminderAt: now,
        },
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
      status: { in: ["PENDING", "ESCALATED"] },
      dueAt: { not: null, gte: now, lte: reminderThreshold },
      lastReminderAt: null,
    },
    select: {
      id: true,
      orgId: true,
      docType: true,
      policyId: true,
      policyRuleId: true,
      currentRuleOrder: true,
      docId: true,
    },
  });

  for (const approval of approachingApprovals) {
    await db.approvalRequest.update({
      where: { id: approval.id },
      data: { lastReminderAt: now },
    });

    const currentRule = await getCurrentRule(approval);
    if (currentRule) {
      await notifyRuleTargets({
        orgId: approval.orgId,
        rule: currentRule,
        type: "approval_reminder",
        title: "Approval Reminder",
        body: `An approval for ${approval.docType} is approaching its deadline.`,
        link: `/app/flow/approvals/${approval.id}`,
      });
    } else {
      await notifyOrgAdmins({
        orgId: approval.orgId,
        type: "approval_reminder",
        title: "Approval Reminder",
        body: `An approval for ${approval.docType} is approaching its deadline.`,
        link: `/app/flow/approvals/${approval.id}`,
      });
    }

    reminded++;
  }

  return { escalated, reminded };
}
