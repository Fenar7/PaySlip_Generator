/**
 * Phase 29: Tagging Platform — Telemetry Hooks
 *
 * Lightweight event recording for tag lifecycle actions.
 * Phase 1: Console-based logging for development and initial rollout.
 * Phase 5+: Replace with proper audit log integration.
 */

export interface TagTelemetryEvent {
  event: string;
  orgId: string;
  tagId: string;
  entityType?: string;
  entityId?: string;
  timestamp: string;
}

export async function recordTagEvent(event: Omit<TagTelemetryEvent, "timestamp">): Promise<void> {
  const entry: TagTelemetryEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === "development" || process.env.TAG_TELEMETRY_ENABLED === "true") {
    console.log("[tag-telemetry]", JSON.stringify(entry));
  }
}
