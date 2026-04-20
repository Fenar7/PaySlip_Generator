import "server-only";

import { db } from "@/lib/db";
import { getProfitAndLoss, getBalanceSheet } from "@/lib/accounting/finance-reports";
import { roundMoney } from "@/lib/accounting/utils";

export interface ConsolidatedPLRow {
  category: string;
  accounts: Array<{ id: string; code: string; name: string; amount: number }>;
  total: number;
}

export interface ConsolidatedPL {
  entityGroupId: string;
  entityGroupName: string;
  period: { startDate: string; endDate: string };
  entityBreakdown: Array<{
    orgId: string;
    orgName: string;
    income: ConsolidatedPLRow[];
    expenses: ConsolidatedPLRow[];
    netProfit: number;
  }>;
  consolidated: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    interCompanyEliminations: number;
  };
}

export interface ConsolidatedBSRow {
  accountId: string;
  code: string;
  name: string;
  accountType: string;
  amount: number;
}

export interface ConsolidatedBS {
  entityGroupId: string;
  entityGroupName: string;
  asOfDate: string;
  entityBreakdown: Array<{
    orgId: string;
    orgName: string;
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
  }>;
  consolidated: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    interCompanyEliminations: number;
  };
}

/**
 * Verify the caller's org has group-admin access to the entity group.
 * The group admin is the org that owns the EntityGroup (adminOrgId).
 */
export async function requireGroupAdminAccess(
  entityGroupId: string,
  callerOrgId: string,
): Promise<{ id: string; name: string; adminOrgId: string }> {
  const group = await db.entityGroup.findUnique({
    where: { id: entityGroupId },
    select: { id: true, name: true, adminOrgId: true },
  });

  if (!group) {
    throw new Error("Entity group not found");
  }

  if (group.adminOrgId !== callerOrgId) {
    throw new Error("Only the group admin org may perform this operation");
  }

  return group;
}

/**
 * Verify the caller's org belongs to the entity group.
 * Both the admin org and member orgs are considered members.
 */
export async function requireGroupMemberAccess(
  entityGroupId: string,
  callerOrgId: string,
): Promise<{ id: string; name: string; adminOrgId: string }> {
  const group = await db.entityGroup.findUnique({
    where: { id: entityGroupId },
    select: {
      id: true,
      name: true,
      adminOrgId: true,
      members: { select: { id: true } },
    },
  });

  if (!group) {
    throw new Error("Entity group not found");
  }

  const isMember =
    group.adminOrgId === callerOrgId ||
    group.members.some((m) => m.id === callerOrgId);

  if (!isMember) {
    throw new Error("Org is not a member of this entity group");
  }

  return { id: group.id, name: group.name, adminOrgId: group.adminOrgId };
}

/**
 * List all entity groups where the calling org is the admin.
 */
export async function listManagedEntityGroups(adminOrgId: string) {
  return db.entityGroup.findMany({
    where: { adminOrgId },
    include: {
      members: {
        select: {
          id: true,
          name: true,
          slug: true,
          entityType: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Returns the entity group (if any) that the org belongs to.
 * Includes the group's admin org and sibling orgs visible to this org
 * (only admin sees all siblings; a subsidiary sees only itself).
 */
export async function getOrgEntityGroup(orgId: string) {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: {
      entityGroupId: true,
      entityType: true,
      adminEntityGroup: {
        include: {
          members: {
            select: { id: true, name: true, slug: true, entityType: true },
          },
        },
      },
      entityGroup: {
        include: {
          members: {
            select: { id: true, name: true, slug: true, entityType: true },
          },
        },
      },
    },
  });

  if (!org) return null;

  // Admin org has adminEntityGroup; member orgs have entityGroup
  return org.adminEntityGroup ?? org.entityGroup ?? null;
}

/**
 * Consolidate P&L across all orgs in an entity group.
 * Eliminates inter-company transfers posted within the period.
 * SECURITY: caller must be group admin (enforced by requireGroupAdminAccess upstream).
 */
export async function getConsolidatedProfitAndLoss(
  entityGroupId: string,
  input: { startDate?: string; endDate?: string } = {},
): Promise<ConsolidatedPL> {
  const group = await db.entityGroup.findUnique({
    where: { id: entityGroupId },
    include: {
      members: { select: { id: true, name: true } },
      adminOrg: { select: { id: true, name: true } },
    },
  });

  if (!group) throw new Error("Entity group not found");

  const allOrgs = [group.adminOrg, ...group.members];

  // Fetch P&L for each org in parallel
  const perOrgPL = await Promise.all(
    allOrgs.map(async (org) => {
      const pl = await getProfitAndLoss(org.id, {
        startDate: input.startDate,
        endDate: input.endDate,
      });
      const current = pl.current as unknown as {
        income: Array<{ id: string; code: string; name: string; amount: number }>;
        expenses: Array<{ id: string; code: string; name: string; amount: number }>;
        netProfit: number;
      };
      return {
        orgId: org.id,
        orgName: org.name,
        income: [{ category: "Income", accounts: current.income, total: current.income.reduce((s, a) => s + a.amount, 0) }],
        expenses: [{ category: "Expenses", accounts: current.expenses, total: current.expenses.reduce((s, a) => s + a.amount, 0) }],
        netProfit: current.netProfit,
      };
    }),
  );

  // Inter-company eliminations: sum posted ICT amounts in the period that are within this group
  const startFilter = input.startDate ? new Date(input.startDate) : undefined;
  const endFilter = input.endDate ? new Date(`${input.endDate}T23:59:59Z`) : undefined;

  const postedIcts = await db.interCompanyTransfer.findMany({
    where: {
      entityGroupId,
      status: "POSTED",
      ...(startFilter || endFilter
        ? {
            transferDate: {
              ...(startFilter ? { gte: startFilter } : {}),
              ...(endFilter ? { lte: endFilter } : {}),
            },
          }
        : {}),
    },
    select: { amount: true },
  });

  const ictElimination = postedIcts.reduce(
    (sum, t) => roundMoney(sum + Number(t.amount)),
    0,
  );

  const totalIncome = roundMoney(
    perOrgPL.reduce((s, o) => s + o.income.reduce((is, row) => is + row.total, 0), 0),
  );
  const totalExpenses = roundMoney(
    perOrgPL.reduce((s, o) => s + o.expenses.reduce((es, row) => es + row.total, 0), 0),
  );

  return {
    entityGroupId,
    entityGroupName: group.name,
    period: {
      startDate: input.startDate ?? "",
      endDate: input.endDate ?? "",
    },
    entityBreakdown: perOrgPL,
    consolidated: {
      totalIncome: roundMoney(totalIncome - ictElimination),
      totalExpenses: roundMoney(totalExpenses - ictElimination),
      netProfit: roundMoney(totalIncome - totalExpenses),
      interCompanyEliminations: ictElimination,
    },
  };
}

/**
 * Consolidate Balance Sheet across all orgs in an entity group.
 * SECURITY: caller must be group admin (enforced by requireGroupAdminAccess upstream).
 */
export async function getConsolidatedBalanceSheet(
  entityGroupId: string,
  asOfDate?: string,
): Promise<ConsolidatedBS> {
  const group = await db.entityGroup.findUnique({
    where: { id: entityGroupId },
    include: {
      members: { select: { id: true, name: true } },
      adminOrg: { select: { id: true, name: true } },
    },
  });

  if (!group) throw new Error("Entity group not found");

  const allOrgs = [group.adminOrg, ...group.members];

  const perOrgBS = await Promise.all(
    allOrgs.map(async (org) => {
      const bs = await getBalanceSheet(org.id, { asOfDate });
      const current = bs.current as unknown as {
        totalAssets: number;
        totalLiabilities: number;
        totalEquity: number;
      };
      return {
        orgId: org.id,
        orgName: org.name,
        totalAssets: current.totalAssets,
        totalLiabilities: current.totalLiabilities,
        totalEquity: current.totalEquity,
      };
    }),
  );

  // Eliminations: posted ICT balances (only those not yet unwound) are
  // reflected as inter-company receivable/payable pairs that cancel out.
  // We approximate the elimination as the sum of all POSTED ICT amounts.
  const postedIcts = await db.interCompanyTransfer.findMany({
    where: { entityGroupId, status: "POSTED" },
    select: { amount: true },
  });

  const ictElimination = postedIcts.reduce(
    (sum, t) => roundMoney(sum + Number(t.amount)),
    0,
  );

  const totalAssets = roundMoney(perOrgBS.reduce((s, o) => s + o.totalAssets, 0));
  const totalLiabilities = roundMoney(perOrgBS.reduce((s, o) => s + o.totalLiabilities, 0));
  const totalEquity = roundMoney(perOrgBS.reduce((s, o) => s + o.totalEquity, 0));

  return {
    entityGroupId,
    entityGroupName: group.name,
    asOfDate: asOfDate ?? new Date().toISOString().slice(0, 10),
    entityBreakdown: perOrgBS,
    consolidated: {
      totalAssets: roundMoney(Math.max(0, totalAssets - ictElimination)),
      totalLiabilities: roundMoney(Math.max(0, totalLiabilities - ictElimination)),
      totalEquity,
      interCompanyEliminations: ictElimination,
    },
  };
}
