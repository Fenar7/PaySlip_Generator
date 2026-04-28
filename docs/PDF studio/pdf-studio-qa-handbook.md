# PDF Studio QA Handbook

**Scope:** Sprint 38.1 — Full Suite QA Matrix  
**Date:** 2026-04-25  
**Branch:** `feature/pdf-studio-phase-38-sprint-38-1`  
**Target:** `feature/pdf-studio-phase-38`

---

## 1. Live Tool Catalog

PDF Studio ships **37 live tools** across three categories. Every tool has a real workspace route, a real public route, and a mapped React workspace component. No tool is hidden, deprecated, or framed as "Soon."

### 1.1 By category

| Category | Count | Tool IDs |
|---|---|---|
| Page Organization | 10 | create, jpg-to-pdf, merge, alternate-mix, split, extract-pages, delete-pages, organize, rotate, resize-pages |
| Edit & Enhance | 17 | fill-sign, editor, create-forms, page-numbers, bates, metadata, rename, protect, unlock, watermark, grayscale, header-footer, remove-annotations, bookmarks, flatten, repair, deskew |
| Convert & Export | 10 | ocr, pdf-to-image, extract-images, pdf-to-text, pdf-to-word, pdf-to-excel, pdf-to-ppt, word-to-pdf, html-to-pdf, n-up |

### 1.2 By execution mode

| Execution Mode | Count | Description |
|---|---|---|
| Browser-first | 30 | Runs entirely in the browser. Files stay on the device. |
| Processing (worker-backed) | 5 | Queues a server-side job: pdf-to-word, pdf-to-excel, pdf-to-ppt, word-to-pdf, html-to-pdf |
| Hybrid | 2 | Browser + server: protect, unlock |

### 1.3 By plan tier

| Tier | Count | Publicly Interactive |
|---|---|---|
| Free | 17 | Yes — full in-browser use on the public lane |
| Workspace | 14 | No — discovery page only; requires signed-in workspace |
| Pro | 6 | No — discovery page only; requires Pro plan |

---

## 2. Verification Matrix

### 2.1 Page Organization

| Tool ID | Title | Public Route | Workspace Route | Execution | Tier | Public Interactive | Verification Path |
|---|---|---|---|---|---|---|---|
| create | Create PDF | /pdf-studio/create | /app/docs/pdf-studio/create | browser | free | Yes | Upload images → preview → export PDF |
| jpg-to-pdf | JPG to PDF | /pdf-studio/jpg-to-pdf | /app/docs/pdf-studio/jpg-to-pdf | browser | free | Yes | Upload JPG/PNG → reorder → export PDF |
| merge | Merge PDFs | /pdf-studio/merge | /app/docs/pdf-studio/merge | browser | free | Yes | Upload multiple PDFs → reorder → export merged PDF |
| alternate-mix | Alternate & Mix PDFs | /pdf-studio/alternate-mix | /app/docs/pdf-studio/alternate-mix | browser | workspace | No | Public page shows upgrade notice; workspace allows interleave |
| split | Split PDF | /pdf-studio/split | /app/docs/pdf-studio/split | browser | free | Yes | Upload PDF → define ranges → export ZIP/PDFs |
| extract-pages | Extract Pages | /pdf-studio/extract-pages | /app/docs/pdf-studio/extract-pages | browser | free | Yes | Upload PDF → select pages → export |
| delete-pages | Delete Pages | /pdf-studio/delete-pages | /app/docs/pdf-studio/delete-pages | browser | free | Yes | Upload PDF → select pages to remove → export |
| organize | Organize Pages | /pdf-studio/organize | /app/docs/pdf-studio/organize | browser | free | Yes | Upload PDF → reorder/rotate/remove → export |
| rotate | Rotate Pages | /pdf-studio/rotate | /app/docs/pdf-studio/rotate | browser | free | Yes | Upload PDF → rotate pages → export |
| resize-pages | Resize Pages | /pdf-studio/resize-pages | /app/docs/pdf-studio/resize-pages | browser | free | Yes | Upload PDF → choose size preset → export |

### 2.2 Edit & Enhance

| Tool ID | Title | Public Route | Workspace Route | Execution | Tier | Public Interactive | Verification Path |
|---|---|---|---|---|---|---|---|
| fill-sign | Fill & Sign | /pdf-studio/fill-sign | /app/docs/pdf-studio/fill-sign | browser | free | Yes | Upload PDF → add text/signatures → export |
| editor | PDF Editor Lite | /pdf-studio/editor | /app/docs/pdf-studio/editor | browser | workspace | No | Public page shows workspace CTA; workspace adds text/shapes/images |
| create-forms | Create Forms | /pdf-studio/create-forms | /app/docs/pdf-studio/create-forms | browser | workspace | No | Public page shows workspace CTA; workspace places form fields |
| page-numbers | Page Numbers | /pdf-studio/page-numbers | /app/docs/pdf-studio/page-numbers | browser | workspace | No | Public page shows workspace CTA; workspace adds numbering |
| bates | Bates Numbering | /pdf-studio/bates | /app/docs/pdf-studio/bates | browser | workspace | No | Public page shows workspace CTA; workspace applies Bates labels |
| metadata | Edit Metadata | /pdf-studio/metadata | /app/docs/pdf-studio/metadata | browser | workspace | No | Public page shows workspace CTA; workspace edits metadata |
| rename | Rename Outputs | /pdf-studio/rename | /app/docs/pdf-studio/rename | browser | workspace | No | Public page shows workspace CTA; workspace applies rename rules |
| protect | Protect PDF | /pdf-studio/protect | /app/docs/pdf-studio/protect | hybrid | workspace | No | Public page shows workspace CTA; workspace encrypts with AES-256 |
| unlock | Unlock PDF | /pdf-studio/unlock | /app/docs/pdf-studio/unlock | hybrid | workspace | No | Public page shows workspace CTA; workspace removes password |
| watermark | Add Watermark | /pdf-studio/watermark | /app/docs/pdf-studio/watermark | browser | free | Yes | Upload PDF → add text/image watermark → export |
| grayscale | Grayscale PDF | /pdf-studio/grayscale | /app/docs/pdf-studio/grayscale | browser | workspace | No | Public page shows workspace CTA; workspace converts to grayscale |
| header-footer | Header & Footer | /pdf-studio/header-footer | /app/docs/pdf-studio/header-footer | browser | free | Yes | Upload PDF → add headers/footers → export |
| remove-annotations | Remove Annotations | /pdf-studio/remove-annotations | /app/docs/pdf-studio/remove-annotations | browser | workspace | No | Public page shows workspace CTA; workspace strips annotations |
| bookmarks | Create Bookmarks | /pdf-studio/bookmarks | /app/docs/pdf-studio/bookmarks | browser | workspace | No | Public page shows workspace CTA; workspace builds outline |
| flatten | Flatten PDF | /pdf-studio/flatten | /app/docs/pdf-studio/flatten | browser | workspace | No | Public page shows workspace CTA; workspace flattens forms |
| repair | Repair PDF | /pdf-studio/repair | /app/docs/pdf-studio/repair | browser | pro | No | Public page shows Pro CTA; workspace repairs corrupted PDFs |
| deskew | Deskew Scan | /pdf-studio/deskew | /app/docs/pdf-studio/deskew | browser | free | Yes | Upload scanned PDF/image → auto-straighten → export |

### 2.3 Convert & Export

| Tool ID | Title | Public Route | Workspace Route | Execution | Tier | Public Interactive | Verification Path |
|---|---|---|---|---|---|---|---|
| ocr | OCR PDF & Images | /pdf-studio/ocr | /app/docs/pdf-studio/ocr | browser | free | Yes | Upload scanned file → run OCR → export searchable PDF/TXT |
| pdf-to-image | PDF to Image | /pdf-studio/pdf-to-image | /app/docs/pdf-studio/pdf-to-image | browser | free | Yes | Upload PDF → export pages as PNG/JPG |
| extract-images | Extract Images | /pdf-studio/extract-images | /app/docs/pdf-studio/extract-images | browser | free | Yes | Upload PDF → pull embedded raster images → export ZIP |
| pdf-to-text | PDF to Text | /pdf-studio/pdf-to-text | /app/docs/pdf-studio/pdf-to-text | browser | free | Yes | Upload PDF → extract text → copy/download TXT |
| pdf-to-word | PDF to Word | /pdf-studio/pdf-to-word | /app/docs/pdf-studio/pdf-to-word | processing | pro | No | Public page shows Pro CTA; workspace queues DOCX conversion |
| pdf-to-excel | PDF to Excel | /pdf-studio/pdf-to-excel | /app/docs/pdf-studio/pdf-to-excel | processing | pro | No | Public page shows Pro CTA; workspace queues XLSX conversion |
| pdf-to-ppt | PDF to PPT | /pdf-studio/pdf-to-ppt | /app/docs/pdf-studio/pdf-to-ppt | processing | pro | No | Public page shows Pro CTA; workspace queues PPTX conversion |
| word-to-pdf | Word to PDF | /pdf-studio/word-to-pdf | /app/docs/pdf-studio/word-to-pdf | processing | pro | No | Public page shows Pro CTA; workspace queues PDF conversion |
| html-to-pdf | HTML to PDF | /pdf-studio/html-to-pdf | /app/docs/pdf-studio/html-to-pdf | processing | pro | No | Public page shows Pro CTA; workspace queues PDF conversion |
| n-up | N-Up Layout | /pdf-studio/n-up | /app/docs/pdf-studio/n-up | browser | workspace | No | Public page shows workspace CTA; workspace generates 2-up/4-up sheets |

---

## 3. Route Verification

### 3.1 Verified by automated tests (this sprint)

- [x] **Public hub renders all 37 tools** — `pdf-studio-hub.test.tsx` verifies tool cards appear for every live tool
- [x] **Workspace hub renders all 37 tools** — `pdf-studio-hub.test.tsx` verifies tool cards appear for every live tool in workspace mode
- [x] **Public tool route resolves every slug** — `page.test.tsx` verifies `generateStaticParams` emits a slug for all 37 tools and `getPdfStudioToolBySlug` resolves every emitted slug back to the correct tool
- [x] **No "Soon" or placeholder state in public shell** — `pdf-studio-public-tool-shell.test.tsx` verifies non-interactive tools show upgrade/workspace CTAs and interactive tools render workspace components; no placeholder text appears

### 3.2 Verified by code inspection (this sprint)

- [x] Every tool has a dedicated workspace page under `/app/docs/pdf-studio/{tool}` — filesystem inspection confirms 37 page files
- [x] Workspace pages are marked `robots: { index: false, follow: false }` — verified in `route-metadata.ts` and workspace hub metadata
- [x] Public metadata uses canonical `/pdf-studio/{tool}` paths — verified in `route-metadata.ts`
- [x] Public hub structured data includes every tool — verified in `route-metadata.ts` via `buildPdfStudioHubStructuredData`
- [x] `PDF_STUDIO_TOOL_REGISTRY` contains 37 entries with matching `TOOL_COMPONENTS` — verified in `tool-registry.test.ts`

### 3.3 Requires browser execution (not performed in Sprint 38.1)

- [ ] Every public tool page returns HTTP 200 (not 404 or 500) — requires running dev server or build
- [ ] Interactive public pages render the actual workspace component in a real browser — requires Playwright/manual click-through
- [ ] Workspace hub shows plan panel and analytics for signed-in orgs — requires authenticated session
- [ ] `/app/docs/pdf-studio/readiness` loads real diagnostics and checklist — requires authenticated session with conversion job history

---

## 4. Plan Gate Verification

### 4.1 Tier mapping — verified by automated tests

- [x] 17 tools are `free` tier (publicly interactive) — `plan-gates.test.ts`
- [x] 14 tools are `workspace` tier (workspace-only interactivity) — `plan-gates.test.ts`
- [x] 6 tools are `pro` tier (Pro plan required) — `plan-gates.test.ts`
- [x] `getPdfStudioCapabilityTier` returns correct tier for every tool ID — `plan-gates.test.ts`
- [x] `isPdfStudioToolInteractiveOnPublicSurface` returns `true` only for free-tier tools — `plan-gates.test.ts` + `tool-registry.test.ts`

### 4.2 Plan minimums — verified by automated tests

- [x] Free-tier tools require `starter` minimum plan in workspace — `plan-gates.test.ts`
- [x] Workspace-tier tools require `starter` minimum plan in workspace — `plan-gates.test.ts`
- [x] Pro-tier tools require `pro` minimum plan in workspace — `plan-gates.test.ts`
- [x] `getPdfStudioWorkspaceMinimumPlan` returns `pro` for pro tools, `starter` for all others — `plan-gates.test.ts`

### 4.3 Limits and retention — verified by automated tests

- [x] Starter plan: 10 history entries, 24-hour retention — `plan-gates.test.ts`
- [x] Pro plan: 25 history entries, 72-hour (3-day) retention — `plan-gates.test.ts`
- [x] Enterprise plan: 50 history entries, 168-hour (7-day) retention — `plan-gates.test.ts`
- [x] Free plan: 0 history entries, 24-hour retention — `plan-gates.test.ts`
- [x] OCR page limit for starter: 10 pages — `plan-gates.test.ts`
- [x] Processing page limit for starter: 40 pages — `plan-gates.test.ts`
- [x] `requiresProForPdfStudioLargeJob` correctly gates OCR > 10 pages and pro processing > 40 pages — `plan-gates.test.ts`

### 4.4 Upgrade copy honesty — verified by automated tests

- [x] Repair tool: mentions Pro plan and workspace lane — `plan-gates.test.ts` (non-empty copy check)
- [x] OCR tool: mentions 10-page starter limit — `plan-gates.test.ts` (non-empty copy check)
- [x] Office conversions: mentions Pro plan and tracked batch processing — `plan-gates.test.ts` (non-empty copy check)
- [x] Default copy: generic workspace/Pro upgrade message — `plan-gates.test.ts` (non-empty copy check)
- [x] No tool claims public interactivity when it is tier-gated — `tool-registry.test.ts` + `qa-matrix.test.ts`

### 4.5 Requires visual verification (not performed in Sprint 38.1)

- [ ] Tier labels render correctly in UI: Free / Workspace / Pro — requires browser screenshot check
- [ ] Upgrade notice copy renders correctly for non-interactive tools — requires browser screenshot check

---

## 5. Support Lane Verification

### 5.1 Browser-first lane — verified by automated tests

- [x] 30 tools classified as browser-first — `support.test.ts`
- [x] Support copy never mentions job IDs, failure codes, or worker queues — `support.test.ts`
- [x] Recovery hints point to the suite support guide — `support.test.ts`
- [x] Examples shown in support lane match actual browser tools — `support.test.ts`

### 5.2 Worker-backed lane — verified by automated tests

- [x] 7 tools classified as worker-backed (5 processing + 2 hybrid) — `support.test.ts`
- [x] Support copy references job IDs and failure codes — `support.test.ts`
- [x] Recovery hints mention retry and queue behavior — `support.test.ts`
- [x] Examples shown in support lane match actual worker-backed tools — `support.test.ts`

### 5.3 Readiness checks — verified by automated tests

- [x] Plan window check shows correct history limit and retention label — `support.test.ts`
- [x] Queue headroom check reflects actual active job limit — `support.test.ts`
- [x] Recovery paths check shows failed/retrying job counts — `support.test.ts`
- [x] Browser-first recovery paths check confirms suite support guide is linked — `support.test.ts`

### 5.4 Requires runtime verification (not performed in Sprint 38.1)

- [ ] PDF Studio workspace access check reflects actual feature flag state — requires authenticated org with feature flag on/off
- [ ] Diagnostics page shows queue depth, success rate, and top failure codes with real data — requires authenticated org with conversion job history

---

## 6. Execution Mode Verification

### 6.1 Verified by automated tests and code inspection

- [x] Badge copy is correct for all execution modes — `route-metadata.test.ts` + `tool-registry.test.ts`
- [x] Description copy is correct for all execution modes — `route-metadata.test.ts` + `tool-registry.test.ts`
- [x] Execution mode counts are correct (30 browser, 5 processing, 2 hybrid) — `tool-registry.test.ts`

### 6.2 Requires runtime/browser verification (not performed in Sprint 38.1)

- [ ] Browser-first: no server job is created during actual use — requires network trace
- [ ] Processing: job is tracked with a job ID in real usage — requires server integration test
- [ ] Processing: history entry is created on completion or failure — requires server integration test
- [ ] Hybrid: protect/unlock enqueue worker jobs for encryption/decryption — requires server integration test

---

## 7. Known Invariants (Test-Backed)

The following invariants are enforced by automated Vitest coverage. They prove registry consistency, honest gating, and rendered catalog behavior — not full end-to-end browser execution.

### Registry and gating invariants
1. **Registry completeness:** `PDF_STUDIO_TOOL_ORDER` length equals `PDF_STUDIO_TOOL_REGISTRY` key count.
2. **Component mapping:** Every `PdfStudioToolId` has a matching entry in `TOOL_COMPONENTS`.
3. **Route mapping:** Every tool has a non-empty `workspacePath` and `publicPath`.
4. **No hidden tools:** `listPdfStudioTools("public")` and `listPdfStudioTools("workspace")` both return all 37 tools.
5. **Public interactivity honesty:** `isPdfStudioToolInteractiveOnPublicSurface` returns `true` only for free-tier tools.
6. **Support lane counts:** `buildPdfStudioSupportCoverageLanes` reports 30 browser-first and 7 worker-backed tools.
7. **Tier coverage:** Every tool maps to exactly one of `free`, `workspace`, or `pro`.
8. **Execution mode coverage:** Every tool maps to exactly one of `browser`, `processing`, or `hybrid`.
9. **Upgrade copy presence:** `getPdfStudioToolUpgradeCopy` returns non-empty strings for all tier-gated tools.
10. **Retention messaging:** `getPdfStudioRetentionMessaging` produces honest, plan-specific labels.

### Rendered catalog invariants (new in Sprint 38.1 remediation)
11. **Public hub renders every tool:** `PdfStudioHub` in public mode renders a card with the correct title for all 37 tools.
12. **Workspace hub renders every tool:** `PdfStudioHub` in workspace mode renders a card with the correct title for all 37 tools.
13. **Public slug resolution:** `generateStaticParams` emits a slug for every public tool, and `getPdfStudioToolBySlug` resolves every slug back to the correct tool.
14. **No placeholder state in public shell:** `PdfStudioPublicToolShell` renders an upgrade/workspace CTA for non-interactive tools and never renders "Soon" or placeholder text.

---

## 8. Manual QA Quick Pass — Documented for Sprint 38.3

The following representative sample is documented for execution during Sprint 38.3 (release sign-off). It was **not executed in Sprint 38.1**.

### Browser-first (sample)
- [ ] **merge** — public page interactive, drag-drop works, export succeeds
- [ ] **watermark** — public page interactive, text watermark applies, export succeeds
- [ ] **ocr** — public page interactive, OCR runs, confidence shown, export succeeds
- [ ] **repair** — public page shows Pro CTA; workspace runs repair and shows log

### Worker-backed (sample)
- [ ] **pdf-to-word** — public page shows Pro CTA; workspace queues job, shows status, download retained
- [ ] **word-to-pdf** — public page shows Pro CTA; workspace queues job, handles DOCX validation
- [ ] **html-to-pdf** — public page shows Pro CTA; workspace queues job, handles render timeout

### Hybrid (sample)
- [ ] **protect** — public page shows workspace CTA; workspace encrypts with password policy checks
- [ ] **unlock** — public page shows workspace CTA; workspace decrypts or shows lossy fallback

---

## 9. Sprint 38.1 Completion Status

### Completed in Sprint 38.1

| Criterion | Evidence |
|---|---|
| Every live tool has a documented verification path | QA handbook sections 1–8 |
| Public/workspace availability matches the registry | `tool-registry.test.ts` (surface parity + category alignment) |
| Execution mode framing matches the live registry | `tool-registry.test.ts` (execution count invariants) |
| No tool behaves like hidden/soon while presented as live | `qa-matrix.test.ts` (no hidden tools) + `pdf-studio-public-tool-shell.test.tsx` (no placeholder state) |
| Plan gates, limits, and support messaging remain honest | `plan-gates.test.ts` + `support.test.ts` |
| Focused Vitest coverage added for high-risk gaps | 24 new tests across 4 test files; 380 PDF Studio tests pass |

### Deferred to Sprint 38.3

| Criterion | Reason |
|---|---|
| Representative browser-first manual QA | Requires real browser drag-drop, file upload, and export verification |
| Representative worker-backed manual QA | Requires server-side conversion queue and authenticated download verification |
| Live HTTP 200 verification for all public routes | Requires running dev server or production build |
| Authenticated workspace hub with real plan panel | Requires signed-in org context |

**Engineering sign-off:** Sprint 38.1 delivered the full QA matrix, automated route/catalog verification, and honest documentation of what remains for final sign-off in Sprint 38.3. No unchecked claim of manual QA execution is made.
