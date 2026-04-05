"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";

export async function listActivity(params?: {
  docType?: string;
  days?: number;
  page?: number;
}) {
  const { orgId } = await requireOrgContext();
  const page = params?.page ?? 1;
  const limit = 30;
  const skip = (page - 1) * limit;

  const dateFilter = params?.days
    ? { createdAt: { gte: new Date(Date.now() - params.days * 86400000) } }
    : {};

  const docTypeFilter =
    params?.docType && params.docType !== "all"
      ? { docType: params.docType }
      : {};

  const where = {
    orgId,
    ...dateFilter,
    ...docTypeFilter,
  };

  const [logs, total] = await Promise.all([
    db.activityLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    db.activityLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page,
    hasMore: skip + logs.length < total,
  };
}
