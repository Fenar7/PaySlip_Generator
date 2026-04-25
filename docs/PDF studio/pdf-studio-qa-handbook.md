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

## 3. Route Verification Checklist

### 3.1 Public routes

- [ ] `/pdf-studio` renders the public hub with all 37 tools listed
- [ ] `/pdf-studio/[tool]` generates static params for all 37 tools
- [ ] Every public tool page returns 200 (not 404 or 500)
- [ ] Non-interactive public pages show the correct upgrade/workspace CTA
- [ ] Interactive public pages render the actual workspace component
- [ ] Public metadata uses canonical `/pdf-studio/{tool}` paths
- [ ] Public hub structured data includes every tool

### 3.2 Workspace routes

- [ ] `/app/docs/pdf-studio` renders the workspace hub with all 37 tools
- [ ] Every tool has a dedicated workspace page under `/app/docs/pdf-studio/{tool}`
- [ ] Workspace pages are marked `robots: { index: false, follow: false }`
- [ ] Workspace hub shows plan panel and analytics for signed-in orgs
- [ ] `/app/docs/pdf-studio/readiness` loads diagnostics and checklist

### 3.3 Registry-to-route consistency

Verified in code:
- `PDF_STUDIO_TOOL_REGISTRY` contains 37 entries
- `TOOL_COMPONENTS` contains 37 entries matching every registry tool ID
- `src/app/app/docs/pdf-studio/{tool}/page.tsx` exists for all 37 tools
- `src/app/pdf-studio/[tool]/page.tsx` dynamically handles all public routes
- No tool ID exists in the registry without a corresponding component or route

---

## 4. Plan Gate Verification Checklist

### 4.1 Tier mapping

- [ ] 17 tools are `free` tier (publicly interactive)
- [ ] 14 tools are `workspace` tier (workspace-only interactivity)
- [ ] 6 tools are `pro` tier (Pro plan required)
- [ ] Tier labels render correctly: Free / Workspace / Pro
- [ ] `getPdfStudioCapabilityTier` returns correct tier for every tool ID
- [ ] `isPdfStudioToolInteractiveOnPublicSurface` returns `true` only for free-tier tools

### 4.2 Plan minimums

- [ ] Free-tier tools require `starter` minimum plan in workspace
- [ ] Workspace-tier tools require `starter` minimum plan in workspace
- [ ] Pro-tier tools require `pro` minimum plan in workspace
- [ ] `getPdfStudioWorkspaceMinimumPlan` returns `pro` for pro tools, `starter` for all others

### 4.3 Limits and retention

- [ ] Starter plan: 10 history entries, 24-hour retention
- [ ] Pro plan: 25 history entries, 72-hour (3-day) retention
- [ ] Enterprise plan: 50 history entries, 168-hour (7-day) retention
- [ ] Free plan: 0 history entries, 24-hour retention
- [ ] OCR page limit for starter: 10 pages (`PDF_STUDIO_STARTER_OCR_PAGE_LIMIT`)
- [ ] Processing page limit for starter: 40 pages (`PDF_STUDIO_STARTER_PROCESSING_PAGE_LIMIT`)
- [ ] `requiresProForPdfStudioLargeJob` correctly gates OCR > 10 pages and pro processing > 40 pages

### 4.4 Upgrade copy honesty

- [ ] Repair tool: mentions Pro plan and workspace lane
- [ ] OCR tool: mentions 10-page starter limit
- [ ] Office conversions: mentions Pro plan and tracked batch processing
- [ ] Default copy: generic workspace/Pro upgrade message
- [ ] No tool claims public interactivity when it is tier-gated

---

## 5. Support Lane Verification Checklist

### 5.1 Browser-first lane

- [ ] 30 tools classified as browser-first
- [ ] Support copy never mentions job IDs, failure codes, or worker queues
- [ ] Recovery hints point to the suite support guide
- [ ] Examples shown in support lane match actual browser tools

### 5.2 Worker-backed lane

- [ ] 7 tools classified as worker-backed (5 processing + 2 hybrid)
- [ ] Support copy references job IDs and failure codes
- [ ] Recovery hints mention retry and queue behavior
- [ ] Diagnostics page shows queue depth, success rate, and top failure codes
- [ ] Examples shown in support lane match actual worker-backed tools

### 5.3 Readiness checks

- [ ] PDF Studio workspace access check reflects actual feature flag state
- [ ] Plan window check shows correct history limit and retention label
- [ ] Queue headroom check reflects actual active job limit
- [ ] Recovery paths check shows failed/retrying job counts
- [ ] Browser-first recovery paths check confirms suite support guide is linked

---

## 6. Execution Mode Verification Checklist

### 6.1 Browser-first

- [ ] Badge reads "Use in browser"
- [ ] Description states files stay on the device
- [ ] No server job is created
- [ ] No queue depth or history entry is generated

### 6.2 Processing

- [ ] Badge reads "Requires processing"
- [ ] Description mentions secure server-side processing
- [ ] Job is tracked with a job ID
- [ ] History entry is created on completion or failure
- [ ] Retention and retry policies apply

### 6.3 Hybrid

- [ ] Badge reads "Browser + processing"
- [ ] Description mentions mixed browser and secure processing
- [ ] Protect: browser-side validation + server-side encryption
- [ ] Unlock: browser-side validation + server-side decryption/rendering

---

## 7. Known Invariants (Test-Backed)

The following invariants are enforced by automated Vitest coverage:

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

---

## 8. Manual QA Quick Pass

For a representative sample, verify end-to-end:

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

## 9. Sprint 38.1 Sign-Off

| Criterion | Status |
|---|---|
| Every live tool has a documented verification path | ✅ |
| Public/workspace availability matches the registry | ✅ |
| Execution mode framing matches the live registry | ✅ |
| No tool behaves like hidden/soon while presented as live | ✅ |
| Plan gates, limits, and support messaging remain honest | ✅ |
| Focused Vitest coverage added for high-risk gaps | ✅ |

**Engineering sign-off:** Sprint 38.1 QA matrix is complete and backed by automated invariants.
