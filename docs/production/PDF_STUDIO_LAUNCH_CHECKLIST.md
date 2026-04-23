# PDF Studio Launch Checklist

Use this checklist before calling Phase 34 ready for sign-off.

## 1. Branch and review stack

| Item | Required state |
| --- | --- |
| Sprint 34.1 | Open/merged with batch mode and job history verified |
| Sprint 34.2 | Open/merged with plan gates, activity panel, and public SEO verified |
| Sprint 34.3 | Support diagnostics, runbooks, and help content reviewed |

## 2. Operational readiness

| Item | Required state |
| --- | --- |
| Error capture | Worker-backed conversion failures are captured with job/tool context, and browser-first runtime/export failures emit sanitized support telemetry |
| Failure codes | Job status/history surfaces expose failure codes and recovery guidance for worker-backed tools |
| Diagnostics surface | `/app/docs/pdf-studio/readiness` distinguishes worker diagnostics from browser-first support coverage |
| Help content | Help Center includes suite-level PDF Studio recovery guidance plus the worker job guide |
| Runbook | Support runbook published in `docs/production/PDF_STUDIO_SUPPORT_RUNBOOK.md` |

## 3. Product readiness

| Item | Required state |
| --- | --- |
| Recovery paths | Browser-first tools expose the suite recovery path, and worker-backed failures show the job recovery guide plus diagnostics link |
| Job IDs | Support-facing surfaces preserve job IDs for worker-backed tools only; browser-first support stays telemetry-based and honest about that limit |
| Public SEO | Public hub/tool pages keep the structured-data and metadata work from Sprint 34.2 |
| Retention messaging | UI copy matches plan-aware retention behavior |

## 4. Verification

| Command | Must pass |
| --- | --- |
| Focused Vitest suite for support/diagnostics helpers and routes | Yes |
| Focused ESLint on touched PDF Studio files | Yes |
| Full build | Known unrelated Prisma-client blocker remains documented until fixed outside PDF Studio |

Phase 34 is **not ready** until browser-first recovery guidance, worker diagnostics, help content, and support handoff data are all available together.
