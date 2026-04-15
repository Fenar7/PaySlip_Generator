import "server-only";

import { db } from "@/lib/db";
import { runAiCompletion, safeParseAiJson } from "./provider";
import type { AiJobStatus } from "@/generated/prisma/client";

/**
 * Records a new AiJob and runs the provider call, updating job state throughout.
 * Returns the job id and result. Never throws — errors are stored on the job record.
 */
export async function runTrackedAiJob(params: {
  orgId: string;
  userId?: string;
  feature: string;
  promptTemplateKey: string;
  promptTemplateVersion: string;
  systemPrompt: string;
  userPrompt: string;
  inputRef?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}): Promise<{
  jobId: string;
  success: boolean;
  rawText: string | null;
  tokensInput: number;
  tokensOutput: number;
  costEstimatePaise: number;
  errorCode: string | null;
  errorMessage: string | null;
  provider: string | null;
  model: string | null;
}> {
  const job = await db.aiJob.create({
    data: {
      orgId: params.orgId,
      userId: params.userId ?? null,
      feature: params.feature,
      status: "QUEUED",
      promptTemplateKey: params.promptTemplateKey,
      promptTemplateVersion: params.promptTemplateVersion,
      inputRef: params.inputRef as object | undefined,
    },
    select: { id: true },
  });

  await db.aiJobEvent.create({
    data: { jobId: job.id, eventType: "QUEUED", metadata: { feature: params.feature } },
  });

  // Mark running
  await db.aiJob.update({
    where: { id: job.id },
    data: { status: "RUNNING" as AiJobStatus, startedAt: new Date() },
  });
  await db.aiJobEvent.create({ data: { jobId: job.id, eventType: "STARTED" } });

  const result = await runAiCompletion({
    promptTemplateKey: params.promptTemplateKey,
    promptTemplateVersion: params.promptTemplateVersion,
    systemPrompt: params.systemPrompt,
    userPrompt: params.userPrompt,
    maxTokens: params.maxTokens,
    temperature: params.temperature,
  });

  if (!result.success) {
    const { code, message } = result.error;
    await db.aiJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED" as AiJobStatus,
        errorCode: code,
        errorMessage: message,
        completedAt: new Date(),
      },
    });
    await db.aiJobEvent.create({
      data: { jobId: job.id, eventType: code === "timeout" ? "PROVIDER_FAILED" : "FAILED", metadata: { code, message } },
    });
    return {
      jobId: job.id, success: false, rawText: null,
      tokensInput: 0, tokensOutput: 0, costEstimatePaise: 0,
      errorCode: code, errorMessage: message, provider: null, model: null,
    };
  }

  const { data } = result;
  await db.aiJobEvent.create({ data: { jobId: job.id, eventType: "PROVIDER_REQUESTED" } });

  await db.aiJob.update({
    where: { id: job.id },
    data: {
      status: "COMPLETED" as AiJobStatus,
      provider: data.provider,
      model: data.model,
      tokensInput: data.tokensInput,
      tokensOutput: data.tokensOutput,
      costEstimatePaise: data.costEstimatePaise,
      outputRef: { rawText: data.rawText } as object,
      completedAt: new Date(),
    },
  });
  await db.aiJobEvent.create({ data: { jobId: job.id, eventType: "COMPLETED" } });

  return {
    jobId: job.id,
    success: true,
    rawText: data.rawText,
    tokensInput: data.tokensInput,
    tokensOutput: data.tokensOutput,
    costEstimatePaise: data.costEstimatePaise,
    errorCode: null,
    errorMessage: null,
    provider: data.provider,
    model: data.model,
  };
}

export { safeParseAiJson };
