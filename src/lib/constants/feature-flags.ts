/**
 * Feature flags for the Document Sequencing Platform.
 *
 * Phase 1: SEQUENCE_PHASE1 controls whether the new sequence engine
 * is active for document numbering. When false, legacy OrgDefaults
 * numbering continues to operate unchanged.
 *
 * These are compile-time constants for now. In production they may
 * be backed by an environment variable or feature-flag service.
 */

export const FEATURE_FLAGS = {
  /**
   * When true, invoice/voucher creation may use the new sequence engine.
   * When false, legacy numbering via OrgDefaults is used exclusively.
   *
   * Phase 1: Always false. The engine is built and tested in isolation.
   * Phase 4+: May be toggled per-org for invoice cutover.
   */
  SEQUENCE_PHASE1: process.env.ENABLE_SEQUENCE_PHASE1 === "true",
} as const;
