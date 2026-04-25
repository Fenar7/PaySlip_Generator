# PDF Studio Launch Checklist

**Version:** Phase 38 baseline  
**Date:** 2026-04-25  
**Previous version:** Phase 34 checklist (superseded)

Use this checklist before calling PDF Studio ready for release sign-off.

---

## 1. Sprint Completion Stack

| Sprint | Required state |
|---|---|
| Sprint 38.1 | Merged — full suite QA matrix with automated invariants and route verification |
| Sprint 38.2 | Merged — documentation reconciled, runbook current, workflow documented |
| Sprint 38.3 | Merged — representative manual QA executed, performance verified, release sign-off documented |

---

## 2. Operational Readiness

| Item | Required state |
|---|---|
| Error capture | Worker-backed conversion failures captured with job/tool context; browser-first runtime/export failures emit sanitized support telemetry |
| Failure codes | Job status/history surfaces expose failure codes and recovery guidance for worker-backed tools (see `src/features/docs/pdf-studio/lib/support.ts`) |
| Diagnostics surface | `/app/docs/pdf-studio/readiness` distinguishes worker diagnostics from browser-first support coverage |
| Help content | Suite-level PDF Studio recovery guidance at `/help/troubleshooting/pdf-studio-support`; worker job guide at `/help/troubleshooting/pdf-studio-jobs` |
| Runbook | Support runbook published in `docs/production/PDF_STUDIO_SUPPORT_RUNBOOK.md` |
| QA handbook | QA verification matrix published in `docs/PDF studio/pdf-studio-qa-handbook.md` |

---

## 3. Product Readiness

| Item | Required state |
|---|---|
| Live tool catalog | 37 tools registered with real routes and workspace components |
| Public/workspace parity | Every tool appears on both public and workspace hubs; no hidden routes |
| Execution mode honesty | Browser-first, processing, and hybrid badges match actual behavior |
| Recovery paths | Browser-first tools expose suite recovery path; worker-backed failures show job recovery guide plus diagnostics link |
| Job IDs | Support-facing surfaces preserve job IDs for worker-backed tools only; browser-first support stays telemetry-based |
| Public SEO | Public hub/tool pages have structured data, canonical metadata, and correct OpenGraph |
| Retention messaging | UI copy matches plan-aware retention behavior (24h starter, 72h pro, 168h enterprise) |
| Plan gates | Free/workspace/pro tiers correctly gate public interactivity and workspace features |

---

## 4. Documentation Readiness

| Item | Required state |
|---|---|
| Authoritative PRD | `docs/PDF studio/pdf-studio-phases-36-38-prd.md` is current and forward-looking |
| Engineering handoff | `docs/PDF studio/pdf-studio-engineering-handoff.md` reflects current suite state |
| Workflow docs | `docs/PDF studio/pdf-studio-workflow.md` documents branch model for future remediation |
| No stale conflicting docs | Old Phase 1/2 PRDs and pre-Phase 36 status docs are marked superseded |

---

## 5. Verification Commands

| Command | Must pass |
|---|---|
| `npm run test -- src/features/docs/pdf-studio/` | All PDF Studio tests pass |
| Focused ESLint on touched PDF Studio files | No errors in touched files |
| Full build | Known unrelated `Decimal` TypeScript error in `books/reports/export` is documented separately; no new PDF Studio build errors introduced |

---

## 6. Release Sign-Off Gate

PDF Studio is **not ready for release** until:

- [ ] All three Sprint 38 PRs are merged into `feature/pdf-studio-phase-38`
- [ ] `feature/pdf-studio-phase-38` is merged into `pdf-studio-continuation`
- [ ] Phase 38 acceptance criteria are satisfied (see PRD section 8.4)
- [ ] Product, engineering, and QA agree the suite is operationally complete

---

*For suite state, see `docs/PDF studio/pdf-studio-engineering-handoff.md`.*  
*For support procedures, see `docs/production/PDF_STUDIO_SUPPORT_RUNBOOK.md`.*
