"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";

export async function listJobLogs(params?: {
  jobName?: string;
  status?: string;
  page?: number;
}) {
  await requireOrgContext();
  const page = params?.page ?? 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(params?.jobName ? { jobName: params.jobName } : {}),
    ...(params?.status ? { status: params.status } : {}),
  };

  const [logs, total] = await Promise.all([
    db.jobLog.findMany({
      where,
      orderBy: { triggeredAt: "desc" },
      skip,
      take: limit,
    }),
    db.jobLog.count({ where }),
  ]);

  return {
    logs,
    total,
    totalPages: Math.ceil(total / limit),
    page,
  };
}
