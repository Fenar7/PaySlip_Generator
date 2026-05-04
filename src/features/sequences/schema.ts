import { z } from "zod";

export const SequenceDocumentTypeSchema = z.enum(["INVOICE", "VOUCHER"]);

export const SequencePeriodicitySchema = z.enum([
  "NONE",
  "MONTHLY",
  "YEARLY",
  "FINANCIAL_YEAR",
]);

export const SequencePeriodStatusSchema = z.enum(["OPEN", "CLOSED"]);

export const CreateSequenceSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1).max(128),
  documentType: SequenceDocumentTypeSchema,
  periodicity: SequencePeriodicitySchema.default("NONE"),
});

export const CreateSequenceFormatSchema = z.object({
  sequenceId: z.string().min(1),
  formatString: z.string().min(1).max(128),
  startCounter: z.number().int().min(1).default(1),
  counterPadding: z.number().int().min(1).max(6).default(5),
  isDefault: z.boolean().default(false),
});

export const FormatStringSchema = z
  .string()
  .min(1)
  .max(128)
  .refine(
    (val) => {
      const runningNumberMatches = val.match(/\{N+\}/g);
      return runningNumberMatches !== null && runningNumberMatches.length === 1;
    },
    {
      message: "Format string must contain exactly one running number token {NNNNN}",
    }
  )
  .refine(
    (val) => {
      const tokens = val.match(/\{[A-Z]+\}/g) ?? [];
      const validTokens = ["PREFIX", "YYYY", "MM", "DD", "NNNNN", "FY"];
      return tokens.every((t) =>
        validTokens.some((vt) => t === `{${vt}}`)
      );
    },
    {
      message: "Format string contains unknown token. Valid tokens: {PREFIX}, {YYYY}, {MM}, {DD}, {NNNNN}, {FY}",
    }
  );

export const PreviewParamsSchema = z.object({
  sequenceId: z.string().min(1),
  documentDate: z.coerce.date(),
  orgId: z.string().min(1),
});

export const ConsumeParamsSchema = z.object({
  sequenceId: z.string().min(1),
  documentDate: z.coerce.date(),
  orgId: z.string().min(1),
});

export type CreateSequenceInput = z.infer<typeof CreateSequenceSchema>;
export type CreateSequenceFormatInput = z.infer<typeof CreateSequenceFormatSchema>;
export type PreviewParams = z.infer<typeof PreviewParamsSchema>;
export type ConsumeParams = z.infer<typeof ConsumeParamsSchema>;

// ─── Resequence Preview (Phase 6 / Sprint 6.1) ────────────────────────────────

export const ResequenceOrderBySchema = z.enum([
  "document_date",
  "current_number",
]);

export const ResequencePreviewInputSchema = z.object({
  orgId: z.string().min(1),
  documentType: SequenceDocumentTypeSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  orderBy: ResequenceOrderBySchema.default("document_date"),
  lockDate: z.coerce.date().optional(),
}).refine((val) => val.startDate <= val.endDate, {
  message: "startDate must be on or before endDate",
  path: ["startDate"],
});

export type ResequencePreviewInput = z.infer<typeof ResequencePreviewInputSchema>;

// ─── Resequence Apply (Phase 6 / Sprint 6.2) ──────────────────────────────────

export const ResequenceApplyInputSchema = z.object({
  orgId: z.string().min(1),
  documentType: SequenceDocumentTypeSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  orderBy: ResequenceOrderBySchema.default("document_date"),
  lockDate: z.coerce.date().optional(),
  expectedFingerprint: z.string().min(1),
}).refine((val) => val.startDate <= val.endDate, {
  message: "startDate must be on or before endDate",
  path: ["startDate"],
});

export type ResequenceApplyInput = z.infer<typeof ResequenceApplyInputSchema>;

// ─── Diagnostics (Phase 7 / Sprint 7.2) ──────────────────────────────────────

export const SequenceDiagnosticsInputSchema = z.object({
  orgId: z.string().min(1),
  documentType: SequenceDocumentTypeSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  lockDate: z.coerce.date().optional(),
}).refine((val) => val.startDate <= val.endDate, {
  message: "startDate must be on or before endDate",
  path: ["startDate"],
});
