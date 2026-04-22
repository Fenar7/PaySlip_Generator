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
| Error capture | Worker-backed conversion failures are captured with job/tool context |
| Failure codes | Job status/history surfaces expose failure codes and recovery guidance |
| Diagnostics surface | `/app/docs/pdf-studio/readiness` shows queue depth, recent failures, and recovery links |
| Help content | Help Center includes PDF Studio recovery guidance and failure-code reference |
| Runbook | Support runbook published in `docs/production/PDF_STUDIO_SUPPORT_RUNBOOK.md` |

## 3. Product readiness

| Item | Required state |
| --- | --- |
| Recovery paths | Failed jobs show a recovery guide and diagnostics link |
| Job IDs | Support-facing surfaces always preserve job IDs |
| Public SEO | Public hub/tool pages keep the structured-data and metadata work from Sprint 34.2 |
| Retention messaging | UI copy matches plan-aware retention behavior |

## 4. Verification

| Command | Must pass |
| --- | --- |
| Focused Vitest suite for support/diagnostics helpers and routes | Yes |
| Focused ESLint on touched PDF Studio files | Yes |
| Full build | Known unrelated Prisma-client blocker remains documented until fixed outside PDF Studio |

Phase 34 is **not ready** until the diagnostics surface, help content, and support handoff data are all available together.
