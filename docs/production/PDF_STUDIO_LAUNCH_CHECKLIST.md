# PDF Studio Launch Checklist

**Version:** Phase 38 in progress  
**Date:** 2026-04-25  
**Previous version:** Phase 34 checklist (superseded)

Use this checklist before calling PDF Studio ready for release sign-off. This checklist reflects the current state on `feature/pdf-studio-phase-38`.

---

## 1. Sprint Completion Stack

| Sprint | Current state |
|---|---|
| Sprint 38.1 | ✅ Merged into `feature/pdf-studio-phase-38` — full suite QA matrix with automated invariants and route verification |
| Sprint 38.2 | ✅ Merged into `feature/pdf-studio-phase-38` — documentation reconciled, runbook current, workflow documented |
| Sprint 38.3 | Open PR (#195) — release sign-off and production closure |

---

## 2. Operational Readiness

| Item | Current state | Evidence |
|---|---|---|
| Error capture | ✅ Ready | Worker-backed failures use `PdfStudioConversionFailureCode` with job/tool context; browser-first failures map to `PdfStudioFailureReason` with sanitized hints |
| Failure codes | ✅ Ready | 15 distinct failure codes in `src/features/docs/pdf-studio/lib/support.ts` with recovery hints |
| Diagnostics surface | ✅ Ready | `/app/docs/pdf-studio/readiness` page exists; `buildPdfStudioReadinessChecklist` and `buildPdfStudioSupportDiagnostics` implemented |
| Help content | ✅ Ready | `PDF_STUDIO_SUPPORT_GUIDE` and `PDF_STUDIO_JOB_SUPPORT_GUIDE` defined in `support-links.ts`; referenced throughout UI |
| Runbook | ✅ Ready | `docs/production/PDF_STUDIO_SUPPORT_RUNBOOK.md` updated to list all 37 tools by lane |
| QA handbook | ✅ Ready | `docs/PDF studio/pdf-studio-qa-handbook.md` delivered by Sprint 38.1 |

---

## 3. Product Readiness

| Item | Current state | Evidence |
|---|---|---|
| Live tool catalog | ✅ Ready | 37 tools in `PDF_STUDIO_TOOL_REGISTRY` with routes and components |
| Public/workspace parity | ✅ Ready | Every tool has `publicPath` and `workspacePath`; no hidden routes |
| Execution mode honesty | ✅ Ready | 30 browser, 5 processing, 2 hybrid; badges and descriptions match registry |
| Recovery paths | ✅ Ready | Browser-first → suite guide; worker-backed → job guide + diagnostics; hybrid → both |
| Job IDs | ✅ Ready | Only worker-backed tools expose job IDs; browser-first stays telemetry-based |
| Public SEO | ✅ Ready | Canonical metadata, OpenGraph, structured data in `route-metadata.ts` |
| Retention messaging | ✅ Ready | Plan-aware labels in `plan-gates.ts`: free/starter 24h, pro 72h, enterprise 168h |
| Plan gates | ✅ Ready | Free/workspace/pro tiers correctly gate public interactivity and workspace features |

---

## 4. Verification Commands

| Command | Result |
|---|---|
| `npm run test -- src/features/docs/pdf-studio/` | 354 passed, 0 failed (49 files) |
| Focused ESLint on PDF Studio files | 0 errors, 15 pre-existing warnings |
| Full build | Fails on pre-existing `Decimal` TS error in `books/reports/export` (unrelated) |

---

## 5. Release Sign-Off Gate

PDF Studio is **not ready for release** until:

- [ ] Sprint 38.3 PR #195 is merged into `feature/pdf-studio-phase-38`
- [ ] Representative heavy workflows are verified by runtime execution (not just code inspection)
- [ ] `feature/pdf-studio-phase-38` is merged into `pdf-studio-continuation`
- [ ] Phase 38 acceptance criteria are satisfied (see PRD section 8.4)
- [ ] Product, engineering, and QA agree the suite is operationally complete

---

## 6. Manual Route and Support-Path Verification

Verified on `feature/pdf-studio-phase-38-sprint-38-3` by source inspection:

| Path | Source location | Status |
|---|---|---|
| `/pdf-studio` | `src/app/pdf-studio/page.tsx` | ✅ Verified |
| `/pdf-studio/{tool}` | `src/app/pdf-studio/[tool]/page.tsx` | ✅ Verified |
| `/app/docs/pdf-studio` | `src/app/app/docs/pdf-studio/page.tsx` | ✅ Verified |
| `/app/docs/pdf-studio/readiness` | `src/app/app/docs/pdf-studio/readiness/page.tsx` | ✅ Verified |
| `/help/troubleshooting/pdf-studio-support` | `src/features/docs/pdf-studio/lib/support-links.ts` | ✅ Verified |
| `/help/troubleshooting/pdf-studio-jobs` | `src/features/docs/pdf-studio/lib/support-links.ts` | ✅ Verified |

---

*For suite state, see `docs/PDF studio/pdf-studio-engineering-handoff.md`.*  
*For support procedures, see `docs/production/PDF_STUDIO_SUPPORT_RUNBOOK.md`.*
