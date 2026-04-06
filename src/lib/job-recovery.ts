import "server-only";

import { db } from "@/lib/db";

export async function createJob(
  jobName: string,
  options: { orgId?: string; invoiceId?: string; payload?: unknown } = {}
) {
  return db.jobLog.create({
    data: {
      jobName,
      status: "pending",
      orgId: options.orgId,
      invoiceId: options.invoiceId,
      payload: options.payload !== undefined ? JSON.parse(JSON.stringify(options.payload)) : undefined,
    },
  });
}

export async function markJobComplete(jobId: string) {
  return db.jobLog.update({
    where: { id: jobId },
    data: {
      status: "completed",
      completedAt: new Date(),
    },
  });
}

export async function markJobFailed(jobId: string, error: string) {
  const job = await db.jobLog.findUniqueOrThrow({ where: { id: jobId } });
  const nextRetryCount = job.retryCount + 1;

  if (nextRetryCount < job.maxRetries) {
    const backoffSeconds = Math.pow(2, nextRetryCount) * 30;
    const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);

    await db.jobLog.update({
      where: { id: jobId },
      data: {
        status: "retry_pending",
        errorMessage: error,
        retryCount: nextRetryCount,
        nextRetryAt,
      },
    });
  } else {
    await db.jobLog.update({
      where: { id: jobId },
      data: {
        status: "dead_letter",
        errorMessage: error,
        retryCount: nextRetryCount,
      },
    });
  }

  console.error(`[job-recovery] Job ${jobId} (${job.jobName}) failed: ${error}`);
}

export async function getRetryableJobs() {
  return db.jobLog.findMany({
    where: {
      status: "retry_pending",
      nextRetryAt: { lte: new Date() },
    },
    orderBy: { nextRetryAt: "asc" },
  });
}

export async function getDeadLetterJobs(orgId?: string) {
  return db.jobLog.findMany({
    where: {
      status: "dead_letter",
      ...(orgId ? { orgId } : {}),
    },
    orderBy: { triggeredAt: "desc" },
  });
}

export async function retryJob(jobId: string) {
  return db.jobLog.update({
    where: { id: jobId },
    data: {
      status: "pending",
      errorMessage: null,
      nextRetryAt: null,
    },
  });
}
