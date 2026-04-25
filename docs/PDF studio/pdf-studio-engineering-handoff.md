# PDF Studio — Engineering Handoff Summary

**Version:** Phase 38 in progress  
**Date:** 2026-04-25  
**Status:** Sprint 38.2 open; Sprint 38.1 awaiting review/merge; Sprint 38.3 pending  
**Authoritative PRD:** `docs/PDF studio/pdf-studio-phases-36-38-prd.md`

---

## 1. What Is PDF Studio?

PDF Studio is a 37-tool PDF utility suite inside Slipwise. It runs across two surfaces:

- **Public lane** (`/pdf-studio/*`) — crawlable discovery pages for all tools; 17 tools are fully interactive without an account
- **Workspace lane** (`/app/docs/pdf-studio/*`) — signed-in document workflows with history, retention, and plan-gated advanced tools

---

## 2. Live Tool Catalog (37 Tools)

### Page Organization (10)
`create`, `jpg-to-pdf`, `merge`, `alternate-mix`, `split`, `extract-pages`, `delete-pages`, `organize`, `rotate`, `resize-pages`

### Edit & Enhance (17)
`fill-sign`, `editor`, `create-forms`, `page-numbers`, `bates`, `metadata`, `rename`, `protect`, `unlock`, `watermark`, `grayscale`, `header-footer`, `remove-annotations`, `bookmarks`, `flatten`, `repair`, `deskew`

### Convert & Export (10)
`ocr`, `pdf-to-image`, `extract-images`, `pdf-to-text`, `pdf-to-word`, `pdf-to-excel`, `pdf-to-ppt`, `word-to-pdf`, `html-to-pdf`, `n-up`

---

## 3. Execution Modes

| Mode | Count | Behavior |
|---|---|---|
| Browser-first | 30 | Runs in browser; files stay on device |
| Processing | 5 | Server-side queue: `pdf-to-word`, `pdf-to-excel`, `pdf-to-ppt`, `word-to-pdf`, `html-to-pdf` |
| Hybrid | 2 | Browser validation + server processing: `protect`, `unlock` |

---

## 4. Plan Tiers

| Tier | Count | Public Interactive | Min Plan |
|---|---|---|---|
| Free | 17 | Yes | starter |
| Workspace | 14 | No (discovery only) | starter |
| Pro | 6 | No (discovery only) | pro |

---

## 5. Key Source Locations

| Concern | Path |
|---|---|
| Tool registry | `src/features/docs/pdf-studio/lib/tool-registry.ts` |
| Plan gates | `src/features/docs/pdf-studio/lib/plan-gates.ts` |
| Support helpers | `src/features/docs/pdf-studio/lib/support.ts` |
| Route metadata | `src/features/docs/pdf-studio/lib/route-metadata.ts` |
| Public hub | `src/app/pdf-studio/page.tsx` |
| Public tool route | `src/app/pdf-studio/[tool]/page.tsx` |
| Workspace hub | `src/app/app/docs/pdf-studio/page.tsx` |
| Workspace tool routes | `src/app/app/docs/pdf-studio/{tool}/page.tsx` |
| Readiness page | `src/app/app/docs/pdf-studio/readiness/page.tsx` |
| Tool components | `src/features/docs/pdf-studio/lib/tool-components.tsx` |

---

## 6. Support Paths

| Path | Purpose |
|---|---|
| `/help/troubleshooting/pdf-studio-support` | Suite support guide (browser-first recovery) |
| `/help/troubleshooting/pdf-studio-jobs` | Worker job guide (processing-lane recovery) |
| `/app/docs/pdf-studio/readiness` | Diagnostics: queue depth, failure codes, retry state |

---

## 7. What Remains for Sprint 38.3

- Representative manual QA pass (browser-first drag-drop, export, worker queue, hybrid encryption)
- Performance verification for heavy workflows (large PDFs, batch jobs)
- Final release sign-off decision

---

## 8. Authoritative Documentation

| Doc | Purpose |
|---|---|
| `docs/PDF studio/pdf-studio-phases-36-38-prd.md` | Forward execution PRD (Phases 36–38) |
| `docs/PDF studio/pdf-studio-qa-handbook.md` | QA matrix and verification paths (Sprint 38.1, pending merge) |
| `docs/production/PDF_STUDIO_LAUNCH_CHECKLIST.md` | Launch readiness checklist |
| `docs/production/PDF_STUDIO_SUPPORT_RUNBOOK.md` | Support escalation runbook |
| `docs/PDF studio/pdf-studio-workflow.md` | Branch and merge workflow |
| This file | Engineering handoff summary |

**Superseded docs (do not use for execution):**
- `docs/status/slipwise-product-status-2026-04-03.md` — pre-Phase 36 snapshot
- `docs/PDF studio/pdf-studio-phase1-prd.md` — historical Phase 1 PRD
- `docs/PDF studio/pdf-studio-phase2-plan.md` — historical Phase 2 plan
- `docs/PDF studio/pdf-studio-phase2-slices-6-9-prd.md` — historical slice PRD
- `docs/pdf-studio-phase2-plan.md` — root-level duplicate of stale Phase 2 plan
- `docs/pdf-studio-phase2-slice5-handoff.md` — historical slice handoff

---

## 9. Manual Route and Support-Path Verification

The following paths were manually verified on `feature/pdf-studio-phase-38-sprint-38-2` by inspecting source files and confirming the routes exist in the current branch:

| Path | Verification method | Result |
|---|---|---|
| `/pdf-studio` | `src/app/pdf-studio/page.tsx` exists and imports `PdfStudioHub` | ✅ Confirmed |
| `/app/docs/pdf-studio` | `src/app/app/docs/pdf-studio/page.tsx` exists and imports `PdfStudioHub` | ✅ Confirmed |
| `/app/docs/pdf-studio/readiness` | `src/app/app/docs/pdf-studio/readiness/page.tsx` exists and loads diagnostics | ✅ Confirmed |
| `/help/troubleshooting/pdf-studio-support` | Defined in `src/features/docs/pdf-studio/lib/support-links.ts` as `PDF_STUDIO_SUPPORT_GUIDE`; referenced in 23+ source locations | ✅ Confirmed |
| `/help/troubleshooting/pdf-studio-jobs` | Defined in `src/features/docs/pdf-studio/lib/support-links.ts` as `PDF_STUDIO_JOB_SUPPORT_GUIDE`; referenced in 11+ source locations | ✅ Confirmed |
| `/pdf-studio/{tool}` | `src/app/pdf-studio/[tool]/page.tsx` exists; `generateStaticParams` resolves all 37 tool slugs | ✅ Confirmed |
| `/app/docs/pdf-studio/{tool}` | 37 individual `page.tsx` files exist under `src/app/app/docs/pdf-studio/*/` | ✅ Confirmed |

---

*End of handoff. For workflow guidance, see `pdf-studio-workflow.md`.*
