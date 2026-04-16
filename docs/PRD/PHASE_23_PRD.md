# Phase 23 PRD — Slipwise One
## SW Pixel: Photo Intelligence Suite & Commercial Readiness

**Version:** 1.0  
**Date:** 2026-04-16  
**Prepared by:** Codex Engineering Assistant  
**Parent Company:** Zenxvio  
**Product:** Slipwise One  
**Primary suite:** SW Pixel  
**Supporting suites:** SW Docs (PDF Studio), SW Auth & Access, SW Intel  
**Target branch:** `feature/phase-23`  
**Sprint sub-branches:** `feature/phase-23-sprint-23-N`  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Source Context](#2-source-context)
3. [Current State After Phase 22](#3-current-state-after-phase-22)
4. [Phase 23 Objectives and Non-Goals](#4-phase-23-objectives-and-non-goals)
5. [Operating Principles](#5-operating-principles)
6. [Sprint 23.1 — SW Pixel Foundation and Passport Photo Core](#6-sprint-231---sw-pixel-foundation-and-passport-photo-core)
7. [Sprint 23.2 — Passport Dimension Library, Print Layout, and Advanced Controls](#7-sprint-232---passport-dimension-library-print-layout-and-advanced-controls)
8. [Sprint 23.3 — Image Utility Suite: Resize, Compress, Format, and Batch Mode](#8-sprint-233---image-utility-suite-resize-compress-format-and-batch-mode)
9. [Sprint 23.4 — PDF Studio Wave 3 Integration](#9-sprint-234---pdf-studio-wave-3-integration)
10. [Sprint 23.5 — Commercial Readiness, Plan Enforcement, and Production Hardening](#10-sprint-235---commercial-readiness-plan-enforcement-and-production-hardening)
11. [Data Model Concepts](#11-data-model-concepts)
12. [Route Map](#12-route-map)
13. [API and Integration Surface](#13-api-and-integration-surface)
14. [Background Jobs and Operational Workflows](#14-background-jobs-and-operational-workflows)
15. [Permissions, Plan Gates, and Access Rules](#15-permissions-plan-gates-and-access-rules)
16. [Image Processing Architecture](#16-image-processing-architecture)
17. [Edge Cases and Acceptance Criteria](#17-edge-cases-and-acceptance-criteria)
18. [Test Plan](#18-test-plan)
19. [Non-Functional Requirements](#19-non-functional-requirements)
20. [Environment Variables and External Dependencies](#20-environment-variables-and-external-dependencies)
21. [Risk Register](#21-risk-register)
22. [Branch Strategy and PR Workflow](#22-branch-strategy-and-pr-workflow)

---

## 1. Executive Summary

Phase 23 delivers two strategically important capabilities that the Slipwise One master PRD explicitly deferred to this stage:

1. **SW Pixel** — the photo and image preparation suite, positioned as a traffic acquisition and growth tool that converts public utility users into registered workspace customers
2. **Commercial Readiness** — the plan enforcement framework, usage tracking, storage metering, pricing tier foundations, and production hardening required before Slipwise One can be commercially launched at scale

The product after Phase 22 is functionally mature across SW Docs, SW Pay, SW Flow, SW Books, SW Intel, and the Client Experience OS. What is missing is:

- A standalone public-facing utility suite (SW Pixel) that drives new-user discovery and demonstrates product quality
- Hard plan gates, usage metering, and per-org storage limits that make the subscription model commercially real
- Production-grade hardening: error monitoring, storage usage visibility, rate-limit audit, AWS migration documentation, and operational runbooks

Phase 23 closes all three gaps in one cohesive sprint sequence.

### Strategic outcome

By the end of Phase 23, Slipwise One should support the following:

1. Any user — authenticated or public — can open SW Pixel and process passport photos, resize images, compress files, and prepare print-ready photo sheets entirely in the browser without requiring an account.
2. Registered workspace users get additional capabilities: history, branded watermarks, bulk batch processing, and full integration with the document vault.
3. PDF Studio gains Wave 3 utilities (PDF to JPG, image extraction, advanced split, header/footer) completing the multi-wave expansion committed in the master PRD.
4. Every pricing plan now has measurable enforcement: document counts, storage limits, team size caps, API call limits, and feature gates are tracked, displayed, and enforced.
5. Engineering and operations teams have observability: Sentry error monitoring, real-time usage dashboards, rate-limit audit trails, storage cost attribution per org, and a documented AWS migration path.

### Business value

| Problem today | Phase 23 outcome |
| --- | --- |
| No public utility product to drive discovery traffic | SW Pixel passport + image tools go live as free public utilities |
| No conversion path from free utility users to paid workspace | SW Pixel prompts registration at value moments |
| Plan limits exist in config but are not metered or displayed | Usage tracking and enforcement are wired to every plan gate |
| Storage costs grow silently without attribution | Per-org storage usage is tracked and exposed in admin surfaces |
| PDF Studio Wave 3 is backlogged from Phase 17-18 | Wave 3 tools (PDF to JPG, extract images, advanced split) ship |
| No production hardening layer before commercial launch | Sentry, rate-limit audit, runbooks, and AWS path documented |

### Why this phase now

The master PRD (Section 25) specifies this delivery order:

> 1. Stabilize → 2. Suite shell → 3. Auth → 4. Docs persistence → 5. Docs UX → 6. Pay lifecycle → 7. Flow → 8. Intel → 9. Roles/proxy → 10. PDF Studio expansion → **11. SW Pixel** → **12. Hardening/Pricing** → AWS path

Phases 1–22 completed steps 1–10. Phase 23 delivers steps 11 and 12. This is the correct sequencing: product maturity first, commercial surface second, growth acquisition third.

---

## 2. Source Context

### Required pre-reading

- `docs/Master Plan/SLIPWISE ONE Master PRD v1.1.txt` — master product blueprint, sections 9–10, 18–20 (SW Pixel and Phase 9/10 delivery phases)
- `docs/codex/2026-04-15-16-43-IST.md` — Phase 22 continuity context
- `graphify-out/GRAPH_REPORT.md` — architecture dependency map
- `docs/PRD/PHASE_22_PRD.md` — predecessor phase, Client Experience OS
- `docs/PRD/PHASE_21_PRD.md` — SW Intel layer (signals, insights engine)

### Primary roadmap sources

From the master PRD (verbatim scope):

**Phase 9 (master numbering) — SW Pixel Launch:**
> Sprint 9.1: passport utility release. Work: upload flow, crop to presets, resize/compress, brightness/contrast, grayscale, name/date, print/export sheet

**Phase 10 (master numbering) — Hardening, Pricing Readiness, AWS Path:**
> Sprint 10.1: production hardening and commercial readiness. Work: performance checks, rate limits, storage usage tracking, audit completeness review, send log completeness, recurring failure recovery, plan usage metrics for pricing.
> Sprint 10.2: deployment maturity and migration readiness. Work: AWS migration plan, storage abstraction validation, queue abstraction validation, scaling checklist, DR and backup plan, technical debt closure.

**PDF Studio Wave 3 (master PRD Section 10.1.8):**
> OCR hardening, deskew, repair, extract images, remove annotations, bookmarks, advanced split modes

### Current implementation evidence

- PDF Studio is live at `/app/docs/pdf-studio` with merge, split, delete, page numbers, watermark, password, compress, OCR, metadata
- Plan config lives at `src/lib/plans/config.ts` with feature gates but limited usage metering
- Storage references exist in the schema (`FileAttachment`, `ProofFile`, `TemplateThumbnail`) but no per-org storage accounting
- Rate limiting for portal auth is in `src/lib/portal-auth.ts` using Upstash Redis (added in Phase 22)
- Sentry is not yet wired to the application layer

---

## 3. Current State After Phase 22

### What exists after Phase 22

**SW Docs / PDF Studio**
- Full PDF Studio at `/app/docs/pdf-studio`: upload images, merge, split, reorder, rotate, crop, watermark, page numbers, password protect, compress, OCR, metadata strip
- PDF Studio Wave 1 and Wave 2 complete; Wave 3 (PDF to JPG, extract images, header/footer, advanced split) not yet delivered
- Document vault with search, filters, archive, attachments
- Template store with industry presets

**SW Pay / SW Flow / SW Books / SW Intel / Partner OS**
- Complete lifecycle management through Phase 21–22

**Client Experience OS (Phase 22)**
- Customer portal at `/portal/[orgSlug]/` with auth, dashboard, invoices, quotes, tickets, statements, profile
- Share center at `/app/docs/shares` with bundle management
- Public share/bundle routes at `/share/[docType]/[token]` and `/share/bundle/[token]`
- Recipient verification, portal governance, branding engine, readiness checklist
- Portal signals feeding SW Intel insights

**Auth & Plans**
- Plan config with feature gates
- Org-level settings and defaults
- Usage enforcement for some features (dunning sequences, team members) but no universal metering layer

### Current gaps Phase 23 must close

1. **No SW Pixel route or functionality exists** — the `/app/pixel` namespace has no implementation
2. **No passport photo processing** — no crop-to-preset, dimension library, print sheet generator
3. **No image utility tools** — no standalone resize, compress, or basic-adjustments tools outside PDF Studio
4. **PDF Studio Wave 3 is undelivered** — PDF to JPG, image extraction, advanced split, header/footer improvements
5. **Plan enforcement has no metering layer** — feature gates exist but document counts, storage usage, and monthly API usage are not tracked or displayed
6. **No per-org storage accounting** — `FileAttachment` records reference S3 paths but total storage bytes are not aggregated per org
7. **No Sentry integration** — production errors are invisible to engineering unless users report them
8. **No commercial pricing surface** — no upgrade prompts, no usage-approaching-limit warnings, no plan comparison UI
9. **No AWS migration documentation** — product has grown past Vercel's comfort zone for some use cases but no migration runbook exists

---

## 4. Phase 23 Objectives and Non-Goals

### Objectives

1. Launch SW Pixel as a fully functional, publicly accessible photo and image preparation suite
2. Implement the complete passport photo workflow: upload → crop → adjust → apply preset → add text → export + print sheet
3. Deliver the Image Utility Suite: resize, compress, format conversion, basic adjustments, batch mode
4. Ship PDF Studio Wave 3: PDF to JPG, extract images from PDF, advanced split, header/footer
5. Implement universal plan metering: track and enforce document counts, storage, team size, API calls per org
6. Surface usage data to org owners via a live usage dashboard at `/app/settings/billing/usage`
7. Wire Sentry error monitoring to all server-side surfaces and client-side boundaries
8. Document the AWS migration path as an executable runbook
9. Deliver upgrade prompts, limit-approaching warnings, and plan-comparison UI

### Non-goals

- SW Pixel is NOT an advanced photo editor (no curves, no layer system, no masking, no clone/heal)
- SW Pixel passport photo does NOT communicate with any external ID authority or produce legally certified outputs
- PDF to Word/Excel conversion is NOT in scope (feasibility remains a future decision)
- Full billing/checkout integration is NOT in scope (plan tiers are defined and enforced but payment processing is external)
- Background removal for photos is NOT in scope in this phase
- Live collaborative photo editing is NOT in scope
- The AWS migration is NOT executed in this phase — a documented runbook and validated path are the deliverable
- Payroll compliance, tax filing, or statutory computation are NOT in scope

---

## 5. Operating Principles

### Product principles

1. **SW Pixel is a traffic acquisition tool first** — the primary user persona is a public utility user who does not yet have a workspace account; the product must be genuinely useful without requiring registration
2. **Convert at value moments, not at friction points** — only prompt registration when the user reaches a capability (history, branded output, bulk batch) that requires a workspace; never block the core photo flow behind auth
3. **Keep image processing client-side where practical** — canvas-based operations run in the browser with no server round-trip, which is faster and has no storage cost; only push to server when the operation requires it (e.g., generating a print-sheet PDF using pdf-lib)
4. **PDF Studio Wave 3 tools follow the same client-side principle** — new tools should not introduce unnecessary server dependencies unless the operation is too heavy for the browser
5. **Commercial readiness is about visibility and honesty** — show users exactly what they are using, how close they are to limits, and what upgrading unlocks; never silently block or silently allow beyond plan limits

### Engineering principles

1. **Preserve the client-side-first architecture** — SW Pixel uses Canvas API, FileReader, and OffscreenCanvas where available; do not introduce heavy server-side image processing unless genuinely required
2. **Reuse `pdf-lib` for print sheet generation** — it is already in the dependency tree; no new PDF library should be added
3. **Plan metering uses append-only event records and periodic snapshots** — never mutate a count field directly; use event-sourced usage records with rollup snapshots for display
4. **Sentry must be initialized once in the Next.js instrumentation file** — do not scatter error capture calls; use the standard `instrumentation.ts` pattern
5. **Storage accounting uses `fileSize` on `FileAttachment` records** — aggregate from existing data; do not re-measure files from S3
6. **All new routes follow the established app router pattern** — server components for data fetching, client components for interactivity, server actions for mutations

### UX principles

1. **SW Pixel feels like a focused, calm utility tool** — not a toy, not an ad-laden converter site; it reflects the Slipwise One premium positioning even for public users
2. **Passport photo workflow is linear and forgiving** — upload → adjust → pick preset → preview → export; undo is local browser state, not a server round-trip
3. **Image utility tools are single-purpose and fast** — one tool per route, clear input/output, immediate feedback
4. **Usage dashboard is honest and proactive** — show a usage bar for every metered resource; warn at 80% of limit; show upgrade path clearly

---

## 6. Sprint 23.1 — SW Pixel Foundation and Passport Photo Core

### Sprint goal

Establish the SW Pixel module structure and deliver the core passport photo workflow: image upload, crop, basic adjustments (brightness, contrast, grayscale), and single-image export.

This sprint creates the `/app/pixel` route namespace, the shared SW Pixel layout and navigation, and the first production-ready passport photo tool.

### Roles

| Role | Access |
| --- | --- |
| Public (unauthenticated) | Full access to passport photo upload, adjust, crop, and export |
| Authenticated workspace user | Same as public, plus access to Pixel history and branded output features |
| Admin | Same as above, plus usage visibility in settings |

### Required product behavior

**Route: `/pixel/passport`**

This is a public utility route. It must:

1. Accept image uploads: JPEG, PNG, WebP, HEIC/HEIF (reuse existing HEIC conversion from PDF Studio)
2. Display the uploaded image in a browser-native crop editor
3. Allow free-form crop OR preset-dimension crop (preset library is Sprint 23.2; in Sprint 23.1, a basic crop control is sufficient)
4. Apply basic adjustments:
   - Brightness: -100 to +100, displayed as a slider
   - Contrast: -100 to +100, displayed as a slider
   - Grayscale / Black-and-white toggle
5. Display a live preview of the adjusted image as adjustments are made
6. Export the processed image as JPEG or PNG (user selectable)
7. Allow download of the exported image directly in the browser
8. Show a non-intrusive registration CTA after export: "Save to your workspace — sign up free"

**What this sprint does NOT include:**
- Country preset dimension library (Sprint 23.2)
- Print sheet layout (Sprint 23.2)
- Name/date text overlay (Sprint 23.2)
- Batch mode (Sprint 23.3)
- History/vault integration (Sprint 23.3+)

### Image processing architecture for Sprint 23.1

Use the browser's native `<canvas>` API and `OffscreenCanvas` (where supported) for all pixel-level operations. Do not call the server for basic adjustments.

Processing pipeline:
1. `FileReader` → `Image` object → draw to `<canvas>`
2. Extract `ImageData` from canvas
3. Apply brightness/contrast/grayscale via pixel-level loop on `ImageData.data`
4. Apply crop using `ctx.drawImage` with `sx/sy/sw/sh` crop parameters
5. Export via `canvas.toBlob('image/jpeg', quality)` or `canvas.toDataURL`

For HEIC/HEIF input, reuse the existing HEIC conversion logic from `src/app/docs/pdf-studio` (Phase 17–18). If it uses a package like `heic2any`, ensure it is accessible in the new route.

### Required file structure (Sprint 23.1)

```
src/app/pixel/
  layout.tsx                     — SW Pixel shared layout, no auth required
  page.tsx                       — /pixel landing page, tool overview
  passport/
    page.tsx                     — /pixel/passport server component shell
    PassportPhotoTool.tsx         — client component, full crop/adjust/export UI
    useImageProcessor.ts          — hook: canvas operations (brightness/contrast/grayscale/crop)
    useFileUpload.ts              — hook: file input, FileReader, HEIC conversion dispatch
    CropEditor.tsx                — component: interactive crop region selector
    AdjustmentControls.tsx        — component: brightness/contrast/grayscale sliders
    ExportControls.tsx            — component: format/quality selection + download button
    RegistrationCTA.tsx           — component: non-intrusive sign-up prompt shown post-export
```

### Required metadata and SEO

`/pixel/passport` must have appropriate `<title>`, `<meta description>`, and `<link rel="canonical">` tags set via Next.js `generateMetadata`. The route should be publicly crawlable.

### Acceptance criteria

- User can upload a JPEG/PNG/WebP/HEIC image
- Crop region is adjustable by drag in the browser
- Brightness and contrast sliders update preview in real time (< 100ms per frame)
- Grayscale toggle instantly converts/reverts the preview
- User can download the exported image without an account
- HEIC input is converted and processed correctly
- Registration CTA appears post-export but does not block the download
- No server request is made during the crop/adjust/export flow (network tab is empty for those operations)
- Route is accessible without authentication
- `<title>` and meta description are correct for SEO

---

## 7. Sprint 23.2 — Passport Dimension Library, Print Layout, and Advanced Controls

### Sprint goal

Extend the passport photo tool with a country-specific dimension preset library, name/date text overlay, and a print-sheet layout generator. A user can pick a country, get the exact photo cropped to correct dimensions, add their name and date, and export a print-ready sheet with multiple copies arranged on A4 or Letter paper.

### Roles

Same as Sprint 23.1.

### Dimension preset library

Presets are hardcoded static data (no database required). Each preset defines:

```typescript
interface PassportDimensionPreset {
  country: string;          // display name e.g. "India"
  label: string;            // e.g. "Indian Passport"
  widthMm: number;
  heightMm: number;
  dpi: number;              // output resolution, typically 300
  whiteBackground: boolean; // enforce white background fill
  notes?: string;           // e.g. "must show full face, neutral expression"
}
```

Required presets (minimum for launch):

| Country | Document | Size |
| --- | --- | --- |
| India | Passport | 35 × 45 mm |
| India | Visa | 51 × 51 mm |
| USA | Passport / Visa | 2 × 2 inch (51 × 51 mm) |
| UK | Passport | 35 × 45 mm |
| EU (Schengen) | Visa | 35 × 45 mm |
| UAE | Visa / Passport | 40 × 60 mm |
| Australia | Passport | 35 × 45 mm |
| Singapore | Passport / Employment Pass | 35 × 45 mm |
| Canada | Passport | 50 × 70 mm |
| Japan | Passport | 35 × 45 mm |
| Germany | Passport | 35 × 45 mm |
| France | Passport | 35 × 45 mm |

The preset list is a simple TypeScript constant in `src/app/pixel/passport/presets.ts` and can be extended without a migration.

### Crop-to-preset behavior

When the user selects a preset:

1. The crop region aspect ratio is locked to the preset's width/height ratio
2. A DPI hint is shown: "This preset requires 300 DPI for print quality; your image resolution is [N × N px]"
3. If the source image is too small for quality output, a soft warning is shown (not a hard block)
4. On export, the canvas output is scaled to the correct pixel dimensions at the specified DPI: `widthPx = Math.round(widthMm * dpi / 25.4)`

### Name and date overlay

Optional text overlay applied to the exported image or print sheet (not to the passport photo itself — text is placed below the photo area in the print sheet layout).

Controls:
- Name text field (optional)
- Date picker (optional, defaults to today)
- Font size and color (two presets: dark on light, light on dark)
- Position: below photo only (never on the face area)

### Print sheet layout generator

The print sheet is generated server-side using `pdf-lib` (already in dependencies). The flow:

1. User finalizes the cropped/adjusted photo
2. User selects "Generate Print Sheet"
3. Client sends the processed image data (as base64 JPEG) to a server route handler
4. Server embeds the image multiple times in a PDF at specified grid layout
5. PDF is returned as a download

**Server route:** `POST /api/pixel/print-sheet`

Request body:
```typescript
interface PrintSheetRequest {
  imageBase64: string;      // the processed passport photo as JPEG base64
  presetId: string;         // which preset was used (for dimensions)
  paperSize: "A4" | "Letter";
  copies: number;           // 4, 6, 8, or 12
  addNameDate?: boolean;
  name?: string;
  date?: string;
}
```

Response: PDF binary with `Content-Type: application/pdf`

**Layout logic:**
- A4: 210 × 297 mm = 2480 × 3508 px at 300 DPI
- Letter: 216 × 279 mm = 2551 × 3295 px at 300 DPI
- Photos are arranged in a 2-column or 3-column grid with 5 mm margin between photos and 10 mm page margin
- Remaining space at the bottom can include small text: "Slipwise One — slipwiseone.com" (subject to plan/white-label config)

### Print watermark and white-label

For public (unauthenticated) users or users on the free plan:
- Print sheet includes a subtle footer: "Created with Slipwise One" in 6pt gray
- The footer is displayed but does not obscure any photo

For users on a paid plan with `removeBranding: true` in their `OrgWhiteLabel`:
- The footer is suppressed

This is enforced server-side in the `/api/pixel/print-sheet` route handler.

### Required file changes (Sprint 23.2)

```
src/app/pixel/passport/
  presets.ts                     — hardcoded country dimension presets
  PresetSelector.tsx              — component: country/document dropdown + info panel
  PrintSheetControls.tsx          — component: paper size, copies, name/date, generate button
  PrintPreview.tsx                — component: schematic preview of sheet layout
src/app/api/pixel/
  print-sheet/
    route.ts                     — POST handler: pdf-lib print sheet generation
src/lib/pixel/
  print-sheet.ts                 — server-side print sheet generation logic (pdf-lib)
  image-dimensions.ts            — mm/inch to pixel conversion utilities
```

### Acceptance criteria

- User can select a country preset from a dropdown
- Crop region locks to the correct aspect ratio on preset selection
- A DPI adequacy hint is shown when source resolution is below recommended
- Name and date text appears below the photo in the print sheet (not on the photo)
- Print sheet PDF is generated server-side with correct photo dimensions and grid layout
- PDF downloads correctly on iOS Safari, Chrome, Firefox
- Watermark/footer is present for unauthenticated users and suppressed for paid white-label orgs
- All 12+ country presets render correctly at their specified dimensions
- Print sheet correctly handles 4, 6, 8, and 12 copies on A4 and Letter

---

## 8. Sprint 23.3 — Image Utility Suite: Resize, Compress, Format, and Batch Mode

### Sprint goal

Deliver the Image Utility Suite: standalone browser-based tools for resizing, compressing, adjusting, and converting images. Add batch mode so users can process multiple images at once. These tools are public utility routes like the passport tool.

### Tools in scope

#### Tool 1: Resize (`/pixel/resize`)

- Upload one or more images
- Select output dimensions:
  - Custom width × height (with lock-aspect-ratio toggle)
  - Preset sizes: 
    - Social: Instagram Square (1080×1080), Instagram Story (1080×1920), Twitter/X Post (1200×628), LinkedIn Cover (1584×396), Facebook Cover (820×312)
    - Web: HD (1280×720), Full HD (1920×1080), 4K (3840×2160)
    - Print: A4 Portrait, A4 Landscape, Passport (delegated to `/pixel/passport`)
- Live preview showing original vs. output dimensions and estimated file size
- Download as JPEG, PNG, or WebP (user selectable)
- Batch mode: upload up to 20 images, apply the same resize config to all, download as ZIP

#### Tool 2: Compress (`/pixel/compress`)

- Upload one or more images (JPEG, PNG, WebP, HEIC)
- Quality/compression slider: 10%–100%
- Target file size input (optional): user types "under 200 KB", tool applies binary search on quality to achieve the target
- Show compression stats: original size → compressed size → saved bytes/percentage
- Download single file or batch download as ZIP
- Batch mode: upload up to 20 images

#### Tool 3: Adjustments (`/pixel/adjust`)

- Upload one image
- Controls: brightness, contrast, saturation, sharpness, hue rotation
- Before/after split view
- Export as JPEG or PNG

#### Tool 4: Format Convert (`/pixel/convert`)

- Upload one or more images
- Select output format: JPEG, PNG, WebP
- For JPEG: quality slider
- For PNG: maintain or strip alpha channel
- Batch download as ZIP for multiple files

### Batch mode architecture

Batch mode runs entirely in the browser using the Web Workers API to avoid blocking the main thread:

- Each image is processed in a `Worker` that runs the canvas operation
- Progress is tracked per file: pending → processing → done → error
- Results are collected and packaged as a ZIP using `jszip` (to be added as a dependency)
- The ZIP is constructed entirely client-side and downloaded without a server round-trip

### Required file structure (Sprint 23.3)

```
src/app/pixel/
  resize/
    page.tsx
    ResizeTool.tsx
    SocialPresets.ts
  compress/
    page.tsx
    CompressTool.tsx
  adjust/
    page.tsx
    AdjustTool.tsx
  convert/
    page.tsx
    ConvertTool.tsx
src/lib/pixel/
  batch-processor.ts            — batch orchestration logic
  image-worker.ts               — Web Worker source for off-thread canvas ops
  zip-export.ts                 — jszip wrapper for batch download
  canvas-ops.ts                 — shared canvas pixel operations (reused from Sprint 23.1)
```

### SW Pixel landing page (`/pixel`)

The landing page at `/pixel` is the tool hub. It shows:

- A hero section: "Photo & Image Tools — Fast, Free, Private"
- Tool cards for each utility: Passport Photo, Resize, Compress, Adjust, Convert
- A section for authenticated workspace users: "Your Pixel History" (links to `/app/pixel/history` added in this sprint)
- SEO-optimized static content

For authenticated users, an additional route at `/app/pixel/history` shows a list of previously processed images (stored in the `PixelJobRecord` model defined in Section 11).

### Acceptance criteria

- `/pixel/resize` works for single and batch (up to 20 images) with correct dimension output
- `/pixel/compress` achieves target file size within 15% of specified target using binary-search quality adjustment
- `/pixel/adjust` shows live before/after split view
- `/pixel/convert` batch converts and downloads ZIP correctly
- All tools accept HEIC input
- Batch ZIP download works on all major browsers (Chrome, Firefox, Safari, Edge)
- No server requests are made for single-image processing
- `/pixel` landing page has correct metadata and tool overview
- `/app/pixel/history` (authenticated) shows previous Pixel jobs (if any saved)

---

## 9. Sprint 23.4 — PDF Studio Wave 3 Integration

### Sprint goal

Deliver PDF Studio Wave 3 capabilities as specified in the master PRD: PDF to JPG conversion, image extraction from PDF, advanced split modes, and header/footer controls. These are additions to the existing PDF Studio at `/app/docs/pdf-studio`.

### Context

PDF Studio Wave 1 and Wave 2 were delivered in Phases 17–18. The master PRD specifies Wave 3 as:

> OCR hardening, deskew feasibility, repair feasibility, extract images, remove annotations, bookmarks, advanced split modes

Phase 23 delivers the production-ready subset of Wave 3. Deskew and repair remain under feasibility investigation (they are heavy operations that require server-side processing and a separate evaluation track).

### Tools in scope for Wave 3

#### 1. PDF to JPG

Convert each page of a PDF to an individual JPG image.

Architecture:
- Use `pdfjs-dist` (PDF.js, Mozilla) in the browser to render PDF pages to canvas
- Each page is rendered to a `<canvas>` and exported as a JPEG
- Output files are named `page-01.jpg`, `page-02.jpg`, etc.
- Batch output is zipped using `jszip` and downloaded
- Quality slider: 60%–100%
- Resolution: 72 DPI (screen), 150 DPI (web), 300 DPI (print)

This is a client-side operation. No server request is required for PDFs under ~50 pages.

For large PDFs (> 50 pages), display a warning: "Large PDFs may take time to process. Processing happens in your browser."

#### 2. Extract Images from PDF

Extract embedded images from a PDF document as separate files.

Architecture:
- Use `pdfjs-dist` to access each page's internal image resources
- Render each embedded image object and offer individual download or batch ZIP download
- Warn the user that some PDFs have images embedded as vectors or compressed streams that may not be directly extractable

This is a best-effort operation. Clear feedback is provided when images cannot be extracted from a page.

#### 3. Advanced Split Modes

Extend the existing PDF split functionality (which currently splits at a single page range) with:

- **Split by every N pages**: "Split into chunks of 3 pages each"
- **Split at specific pages**: input a comma-separated list of page numbers "3, 7, 12"
- **Split by bookmarks**: if the PDF has a bookmark structure, offer splitting at top-level bookmark boundaries
- **Extract page ranges**: specify multiple ranges "1-3, 5-8, 12-end"

Output: each split segment is a separate PDF file, batch downloaded as ZIP.

#### 4. Header/Footer Controls

Add persistent header and/or footer text to every page of an uploaded PDF.

Controls:
- Header: left/center/right text fields
- Footer: left/center/right text fields
- Page number token: `{page}` and `{total}` auto-substituted
- Font size: 8pt, 10pt, 12pt
- Font color: black, gray, white
- Margin: 5mm, 10mm, 15mm from edge
- Preview: first page preview updated in real time

Implementation: server-side using `pdf-lib`. This requires a route handler `POST /api/docs/pdf-studio/header-footer`.

#### 5. OCR Hardening

The existing OCR endpoint at `POST /api/ocr` (or equivalent) is hardened with:
- Timeout protection: if OCR takes > 30 seconds, return a partial result rather than timing out the connection
- Language hint: allow user to specify primary document language (English, Hindi, Arabic) to improve Tesseract accuracy
- Confidence score: expose OCR confidence per text block so users know which regions were uncertain
- Error recovery: if a page fails OCR, return results for successful pages rather than failing the entire document

### Required file changes (Sprint 23.4)

```
src/app/docs/pdf-studio/
  PdfToJpg.tsx                  — client component
  ExtractImages.tsx              — client component
  AdvancedSplit.tsx              — client component
  HeaderFooter.tsx               — client component
src/app/api/docs/pdf-studio/
  header-footer/
    route.ts                    — POST handler (pdf-lib)
src/lib/pdf-studio/
  header-footer.ts              — server-side header/footer injection (pdf-lib)
  pdf-split-advanced.ts         — extended split logic (client-side, pdf-lib in browser)
  ocr-hardening.ts              — OCR timeout, language hint, confidence passthrough
```

### Acceptance criteria

- PDF to JPG correctly renders all pages of a test PDF at 150 DPI and 300 DPI
- ZIP of JPG exports downloads and opens correctly
- Image extraction returns embedded images from a standard test PDF
- Advanced split (by N pages, by page list, by range) produces correct output files
- Header/footer is applied server-side and appears correctly on all pages of the output PDF
- `{page}` and `{total}` tokens are replaced correctly in header/footer
- OCR on a large PDF does not time out the HTTP connection; partial results are returned if a page fails
- OCR confidence scores are returned per text block
- All existing PDF Studio tools remain unaffected by Wave 3 additions

---

## 10. Sprint 23.5 — Commercial Readiness, Plan Enforcement, and Production Hardening

### Sprint goal

Deliver the commercial and operational foundation required before Slipwise One is monetized at scale: universal plan metering, usage tracking, a live usage dashboard for org owners, an upgrade prompt system, Sentry error monitoring, storage usage attribution, rate-limit audit, and a documented AWS migration runbook.

### 10.1 Universal Plan Metering

#### Metered resources

The following resources must be tracked per org per billing period:

| Resource | Unit | Free Tier Limit | Pro Tier Limit | Business Tier Limit |
| --- | --- | --- | --- | --- |
| Active invoices | count | 50 | 500 | Unlimited |
| Active quotes | count | 20 | 200 | Unlimited |
| Vouchers | count | 100 | 1,000 | Unlimited |
| Salary slips | count | 50 | 500 | Unlimited |
| File storage | bytes | 1 GB | 10 GB | 100 GB |
| Team members | count | 3 | 15 | Unlimited |
| API webhook calls (per month) | count | 100 | 5,000 | Unlimited |
| Portal sessions (active) | count | 5 | 100 | Unlimited |
| Share bundle links (active) | count | 10 | 200 | Unlimited |
| Pixel jobs saved to vault | count | 20 | 500 | Unlimited |

Limits are defined in `src/lib/plans/config.ts` and are not stored in the database. The database stores usage events; limits are looked up from config at enforcement time.

#### Usage event model

Every metered action creates an append-only event record. See Section 11 for the Prisma model.

#### Usage snapshot

A periodic (nightly) cron job aggregates usage events into a `OrgUsageSnapshot` record. The snapshot stores the current period's totals and the reset timestamp. Org settings and enforcement checks read from the snapshot for performance; the snapshot is re-derivable from events at any time.

#### Enforcement behavior

When an org reaches its plan limit for a resource:
- Server actions that would create a new record return a structured `{ success: false, error: "limit_reached", resource: "invoices", limit: 50 }` response
- The UI shows a modal: "You have reached your plan limit for invoices. Upgrade to Pro to create more."
- Existing records are never deleted or blocked — only creation of new records is gate-checked
- Admin-level actions (owner/admin role) that are within existing limits continue to work normally

#### Implementation pattern

Add a `checkUsageLimit(orgId, resource)` server-side helper that:
1. Loads `OrgUsageSnapshot` for the current period
2. Compares current count against `getOrgPlan(orgId)` limits
3. Returns `{ allowed: boolean, current: number, limit: number | null }`

This helper is called at the top of every creation server action, before the Prisma insert.

### 10.2 Usage Dashboard

Route: `/app/settings/billing/usage`

Required display elements:
- Current plan name and tier badge
- Billing period: "April 1 – April 30, 2026" (calendar month by default)
- For each metered resource:
  - Resource name
  - Usage bar: `current / limit` (or "Unlimited" if on Business tier)
  - Color coding: green (< 70%), amber (70–90%), red (> 90%)
  - Raw count label: "312 / 500 invoices"
- Storage section: shows total storage in MB/GB vs. plan limit
- A "Compare Plans" button linking to the pricing page or plan-upgrade surface
- Admin-only: link to per-user breakdown (team members count by role)

The usage dashboard reads from `OrgUsageSnapshot` (current period). If no snapshot exists yet, it triggers an on-demand aggregate and caches it in the snapshot record.

### 10.3 Upgrade Prompt System

Upgrade prompts are surfaced at three trigger points:

1. **Hard block**: user action is blocked because limit is reached → full modal with upgrade CTA
2. **Soft warning at 80%**: when a usage bar exceeds 80%, a dismissible banner appears at the top of the relevant section: "You are approaching your invoice limit. [Upgrade plan]"
3. **Passive dashboard signal**: usage bars in the billing/usage page always show current state

Implementation:
- A `useUsageWarning(resource)` client hook that fetches the usage state for a given resource
- A `UsageWarningBanner` component rendered in relevant list page layouts
- Warning dismissal is stored in `localStorage` (resets at each page load); it is not persisted server-side

### 10.4 Storage Usage Attribution

Storage is attributed per org by aggregating `FileAttachment.fileSize` (bytes) for all attachments belonging to the org.

Add a Prisma query aggregation in `src/lib/storage-usage.ts`:

```typescript
async function getOrgStorageBytes(orgId: string): Promise<number>
```

This function sums `fileSize` across all `FileAttachment` records for the org, including:
- Invoice attachments
- Proof files (via `InvoiceProof` / `ProofFile`)
- Ticket attachments
- Pixel job exports saved to vault
- Template thumbnails

The result is included in the nightly `OrgUsageSnapshot` cron job.

### 10.5 Sentry Error Monitoring

Add Sentry to Slipwise One using the official `@sentry/nextjs` package.

**Setup:**
1. `npm install @sentry/nextjs`
2. Run `npx @sentry/wizard@latest -i nextjs` or manually create:
   - `sentry.client.config.ts` — client-side Sentry initialization
   - `sentry.server.config.ts` — server-side Sentry initialization
   - `sentry.edge.config.ts` — edge runtime Sentry initialization (if edge routes exist)
   - `instrumentation.ts` — register all three configs via `registerSentryNodeInstrumentation`
3. Add `SENTRY_DSN` to `.env.local` and Vercel environment variables
4. Add `SENTRY_AUTH_TOKEN` for source map upload in CI/CD

**Sentry scope:**
- Capture unhandled exceptions in all server actions
- Capture unhandled exceptions in all route handlers
- Capture client-side errors in React component boundaries (add `Sentry.ErrorBoundary` to the root layout)
- Add org context to every Sentry event: `Sentry.setTag('orgId', orgId)` in server actions after `requireOrgContext()`
- Do NOT log sensitive data (passwords, tokens, PII) to Sentry — use `Sentry.setUser({ id: userId })` only

**Session replay:** NOT in scope for Phase 23 (privacy concerns require opt-in design).

### 10.6 Rate Limit Audit

Audit all current rate-limited surfaces and document the state:

| Surface | Current rate limit | Implementation | Status |
| --- | --- | --- | --- |
| Portal auth login | 5 attempts / 15 min per IP | Upstash Redis | ✅ Phase 22 |
| Share token validation | None | — | ⚠️ needs limit |
| Print sheet generation | None | — | ⚠️ needs limit |
| OCR endpoint | None | — | ⚠️ needs limit |
| API webhook delivery | None (outbound) | — | N/A |
| Public PDF Studio | None | — | ⚠️ needs limit |
| Pixel print-sheet API | None | — | ⚠️ add in Sprint 23.5 |

For unprotected public API routes (`/api/pixel/print-sheet`, OCR endpoint, public share token validation), add basic IP-based rate limiting using the existing Upstash Redis pattern from `src/lib/portal-auth.ts`:

```typescript
// src/lib/rate-limit.ts
export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  maxAttempts: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }>
```

Apply this to all public API routes that perform heavy computation or access external resources.

### 10.7 AWS Migration Runbook

Produce a documented migration runbook at `docs/ops/AWS_MIGRATION_RUNBOOK.md`. This is a planning document, not an implementation — no AWS infrastructure is created in Phase 23.

The runbook must cover:

1. **Current Vercel state**: which services run where, what environmental dependencies exist
2. **Target AWS architecture**: ECS Fargate for Next.js app, RDS PostgreSQL, S3, ElastiCache (Redis), SES (email), CloudFront (CDN), ALB
3. **Migration steps per service**:
   - Database: Supabase → RDS PostgreSQL (data export, schema migration, connection string update)
   - Storage: Supabase Storage / S3 → AWS S3 (bucket policy, IAM roles, CDN configuration)
   - Redis: Upstash → ElastiCache (connection string update, TLS config)
   - Email: Resend → SES (DKIM, SPF, DMARC, sending limits)
   - Auth: Supabase Auth → evaluate options (Supabase self-host, Auth.js, or Clerk)
   - Background jobs: Trigger.dev → evaluate options (Trigger.dev self-host, AWS Step Functions, or dedicated worker)
4. **Go/no-go checklist**: what must be true before migration is safe
5. **Rollback plan**: how to revert each service migration independently
6. **Cost estimate template**: RDS, ECS, S3, ElastiCache, SES at current user volumes and at 10× user volumes

### Acceptance criteria

- `checkUsageLimit` correctly gates creation actions when org is at limit
- Usage dashboard displays accurate per-resource usage bars
- Usage warning banner appears when resource > 80% of limit
- Storage usage aggregation correctly sums all `FileAttachment.fileSize` values per org
- Sentry captures and reports a test error from a server action without logging sensitive data
- Rate limiting is applied to print-sheet and OCR public routes
- `docs/ops/AWS_MIGRATION_RUNBOOK.md` covers all 5 required sections
- Nightly cron job updates `OrgUsageSnapshot` correctly
- All existing tests continue to pass after Sprint 23.5 changes

---

## 11. Data Model Concepts

### New Prisma models

#### `PixelJobRecord`

Tracks SW Pixel processing jobs for authenticated users. Used for history view at `/app/pixel/history`.

```prisma
model PixelJobRecord {
  id             String    @id @default(cuid())
  orgId          String
  userId         String
  toolType       PixelToolType
  inputFileName  String
  outputFileName String?
  presetId       String?
  storagePath    String?   // null for ephemeral jobs, set if saved to vault
  fileSizeBytes  Int?
  createdAt      DateTime  @default(now())
  expiresAt      DateTime? // null = never expires

  org  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

enum PixelToolType {
  PASSPORT_PHOTO
  RESIZE
  COMPRESS
  ADJUST
  FORMAT_CONVERT
  PRINT_SHEET
}
```

#### `OrgUsageSnapshot`

Stores the current billing period's metered usage totals per org. One record per org per billing period.

```prisma
model OrgUsageSnapshot {
  id                    String   @id @default(cuid())
  orgId                 String
  periodStart           DateTime
  periodEnd             DateTime
  activeInvoices        Int      @default(0)
  activeQuotes          Int      @default(0)
  vouchers              Int      @default(0)
  salarySlips           Int      @default(0)
  storageBytes          BigInt   @default(0)
  teamMembers           Int      @default(0)
  webhookCallsMonthly   Int      @default(0)
  activePortalSessions  Int      @default(0)
  activeShareBundles    Int      @default(0)
  pixelJobsSaved        Int      @default(0)
  lastComputedAt        DateTime @default(now())

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([orgId, periodStart])
}
```

#### `UsageEvent`

Append-only usage event log. The source of truth from which snapshots are derived.

```prisma
model UsageEvent {
  id         String    @id @default(cuid())
  orgId      String
  resource   UsageResource
  delta      Int       // +1 for creation, -1 for deletion/archive
  entityId   String?   // optional reference to the created/deleted entity
  recordedAt DateTime  @default(now())

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, resource, recordedAt])
}

enum UsageResource {
  INVOICE
  QUOTE
  VOUCHER
  SALARY_SLIP
  FILE_STORAGE_BYTES
  TEAM_MEMBER
  WEBHOOK_CALL
  PORTAL_SESSION
  SHARE_BUNDLE
  PIXEL_JOB_SAVED
}
```

### Migrations required

- `prisma/migrations/20260417000100_phase23_pixel_usage_models/migration.sql`
  - Creates `PixelJobRecord`, `OrgUsageSnapshot`, `UsageEvent`, `PixelToolType`, `UsageResource`
- Run `npx prisma format && npx prisma validate && npx prisma generate` after adding models

### No changes required to existing models

The existing `FileAttachment`, `CustomerPortalSession`, `SharedDocument`, `ShareBundle`, and plan-related tables are read-only in Phase 23. Storage usage aggregation reads `FileAttachment.fileSize` as-is.

---

## 12. Route Map

### Public utility routes (no auth required)

| Route | Description |
| --- | --- |
| `/pixel` | SW Pixel tool hub landing page |
| `/pixel/passport` | Passport photo tool: upload, crop, adjust, export |
| `/pixel/resize` | Image resize tool (single + batch) |
| `/pixel/compress` | Image compress tool (single + batch) |
| `/pixel/adjust` | Image adjustments tool |
| `/pixel/convert` | Image format conversion tool |

### Authenticated app routes

| Route | Description |
| --- | --- |
| `/app/pixel/history` | Authenticated user's Pixel job history |
| `/app/settings/billing/usage` | Plan usage dashboard for org owners |
| `/app/settings/billing/upgrade` | Plan comparison and upgrade CTA |

### API routes

| Route | Method | Description |
| --- | --- | --- |
| `/api/pixel/print-sheet` | POST | Server-side print sheet PDF generation (pdf-lib) |
| `/api/docs/pdf-studio/header-footer` | POST | Server-side header/footer injection (pdf-lib) |
| `/api/cron/usage-snapshot` | GET | Nightly cron: aggregate usage into OrgUsageSnapshot |

### Existing routes extended

| Route | Extension |
| --- | --- |
| `/app/docs/pdf-studio` | New Wave 3 tool tabs: PDF to JPG, Extract Images, Advanced Split, Header/Footer |
| `/app/docs/invoices/new` | checkUsageLimit enforcement before creation |
| `/app/docs/vouchers/new` | checkUsageLimit enforcement before creation |
| `/app/docs/salary-slips/new` | checkUsageLimit enforcement before creation |
| `/app/docs/quotes/new` | checkUsageLimit enforcement before creation |

---

## 13. API and Integration Surface

### `POST /api/pixel/print-sheet`

**Authentication:** None required (public route)  
**Rate limit:** 10 requests / minute per IP (Upstash Redis)  
**Max request body:** 5 MB  

Request:
```typescript
{
  imageBase64: string;         // JPEG base64, max 4 MB
  presetId: string;            // e.g. "india-passport"
  paperSize: "A4" | "Letter";
  copies: 4 | 6 | 8 | 12;
  addNameDate?: boolean;
  name?: string;               // max 50 chars
  date?: string;               // ISO date string YYYY-MM-DD
  orgId?: string;              // optional: if present, check white-label config for watermark
}
```

Response: `application/pdf` binary  
Error responses: 400 (invalid request), 429 (rate limited), 500 (generation error)

### `POST /api/docs/pdf-studio/header-footer`

**Authentication:** Required (Supabase session cookie)  
**Rate limit:** 20 requests / minute per org  
**Max request body:** 50 MB  

Request:
```typescript
{
  pdfBase64: string;           // PDF base64, max 45 MB
  header?: { left?: string; center?: string; right?: string; };
  footer?: { left?: string; center?: string; right?: string; };
  fontSize: 8 | 10 | 12;
  fontColor: "black" | "gray" | "white";
  marginMm: 5 | 10 | 15;
}
```

Response: `application/pdf` binary

### `GET /api/cron/usage-snapshot`

**Authentication:** Cron secret (`validateCronSecret`)  
**Schedule:** Nightly at 02:00 UTC  

Behavior:
1. For each org, aggregate current counts from live tables (invoices, quotes, vouchers, etc.)
2. Upsert `OrgUsageSnapshot` for the current billing period
3. Log `JobLog` record with `triggeredAt` / `completedAt` / error

---

## 14. Background Jobs and Operational Workflows

### Nightly usage snapshot cron

**Route:** `GET /api/cron/usage-snapshot`  
**Schedule:** Every night at 02:00 UTC (configured in `vercel.json` cron config)  
**Idempotency:** Uses `upsert` on `[orgId, periodStart]` unique constraint — safe to re-run  

Aggregation queries (per org):
- `activeInvoices`: `db.invoice.count({ where: { orgId, status: { notIn: ['CANCELLED', 'ARCHIVED'] } } })`
- `activeQuotes`: similar
- `storageBytes`: `db.fileAttachment.aggregate({ where: { orgId }, _sum: { fileSize: true } })`
- `teamMembers`: `db.membership.count({ where: { orgId, status: 'ACTIVE' } })`
- etc.

### On-demand snapshot trigger

When the usage dashboard at `/app/settings/billing/usage` is opened:
1. Server action checks `OrgUsageSnapshot.lastComputedAt`
2. If `lastComputedAt` is more than 6 hours ago, trigger an on-demand re-aggregate
3. Update `lastComputedAt` after aggregation
4. Return fresh snapshot data to the UI

This ensures the dashboard never shows stale data older than 6 hours even between nightly runs.

---

## 15. Permissions, Plan Gates, and Access Rules

### SW Pixel access

| Surface | Access rule |
| --- | --- |
| `/pixel/*` public tools | Open to all users, no auth required |
| `/app/pixel/history` | Requires active Supabase session |
| Pixel job saved to vault | Requires authenticated session + `pixelVault` feature gate |
| Print sheet watermark suppressed | Requires `OrgWhiteLabel.removeBranding = true` (checked server-side in print-sheet route) |
| Batch mode > 5 files | Requires authenticated session (free users: up to 5; registered: up to 20) |

### Plan gates (additions to `src/lib/plans/config.ts`)

```typescript
// New gates to add in Phase 23
pixelHistory: boolean;        // access to /app/pixel/history
pixelVaultSave: boolean;      // save Pixel outputs to document vault
pixelBatchFiles: number;      // max files in a batch operation
usageDashboard: boolean;      // access to billing/usage dashboard (all paid plans)
storageGb: number;            // max storage per org in GB
```

### Usage enforcement server-side

`checkUsageLimit` is called in these server actions:
- `createInvoice`, `duplicateInvoice`
- `createQuote`
- `createVoucher`
- `createSalarySlip`
- `inviteMember` (team member count)
- `createShareBundle` (active share bundle count)
- `savePixelJobToVault`

The enforcement is **never client-side only** — every creation path that goes through a server action performs the limit check before the Prisma insert.

### Security requirements for Sprint 23.5 usage system

- `OrgUsageSnapshot` records are read-only from the client; only the cron job and on-demand aggregation write to them
- `UsageEvent` records are append-only; no update or delete path should exist
- Plan limits are always read from `src/lib/plans/config.ts` (server code); never passed from the client
- Storage bytes aggregation sums only `FileAttachment` records scoped to the requesting org
- No cross-org data is ever included in usage snapshots

---

## 16. Image Processing Architecture

### Client-side processing stack

All basic image operations (crop, resize, compress, adjust, convert) run in the browser using:

- **Canvas API + OffscreenCanvas**: pixel operations, resizing, format export
- **FileReader API**: file loading
- **Web Workers**: off-thread processing for batch operations
- **jszip**: client-side ZIP construction for batch downloads

No image data is sent to the server for these operations. The server is only involved in:
- Print sheet PDF generation (`/api/pixel/print-sheet`) — requires `pdf-lib` on the server
- Header/footer injection (`/api/docs/pdf-studio/header-footer`) — requires `pdf-lib` on the server
- PDF to JPG rendering: can be done client-side using `pdfjs-dist` (rendered to canvas in browser)

### Dependency additions

| Package | Usage | Scope |
| --- | --- | --- |
| `jszip` | Client-side ZIP of batch outputs | New (client only) |
| `pdfjs-dist` | PDF page rendering to canvas for PDF-to-JPG | New (client only) |
| `@sentry/nextjs` | Error monitoring | New (client + server) |

`pdfjs-dist` requires a Web Worker for its rendering pipeline. Configure it in the Next.js config:
```typescript
// next.config.ts addition
webpack(config) {
  config.resolve.alias.canvas = false; // prevent node canvas conflict
  return config;
}
```

### HEIC/HEIF handling

Reuse the existing HEIC conversion logic from the PDF Studio module. If it is implemented as a module-local utility (e.g., `src/app/docs/pdf-studio/heic.ts`), extract it to `src/lib/pixel/heic.ts` so it can be shared by both PDF Studio and SW Pixel.

### Browser compatibility targets

- Chrome 90+
- Firefox 88+
- Safari 14+ (iOS and macOS)
- Edge 90+

`OffscreenCanvas` is not available in all Safari versions — use a fallback to regular `<canvas>` when `typeof OffscreenCanvas === 'undefined'`.

---

## 17. Edge Cases and Acceptance Criteria

### SW Pixel edge cases

| Scenario | Expected behavior |
| --- | --- |
| User uploads an image > 20 MB | Show error: "File is too large. Maximum size is 20 MB." Reject before processing. |
| HEIC file from older iPhone firmware | Attempt HEIC conversion; if conversion fails, show: "This HEIC file could not be processed. Try exporting as JPEG from your Photos app." |
| Image resolution too low for selected passport preset | Show soft warning with pixel count; do not block export |
| User tries to save print sheet before export | Button is disabled until a crop region is defined and a preset is selected |
| Print sheet API returns 429 (rate limited) | Show: "Too many requests. Please wait a moment and try again." |
| Batch compress: one file fails | Mark that file as "error" with a red badge; allow download of successfully processed files |
| `/app/pixel/history` is empty | Show an empty state: "No saved Pixel jobs yet. Process an image and save it to your workspace." |
| Unauthenticated user tries to access `/app/pixel/history` | Redirect to `/auth/login` |

### Usage metering edge cases

| Scenario | Expected behavior |
| --- | --- |
| Org is at invoice limit, user tries to create | Server action returns `{ success: false, error: "limit_reached" }`; modal shown with upgrade CTA |
| Org transitions to a higher plan mid-period | `getOrgPlan()` returns new plan; existing snapshot counts remain; new limits apply immediately |
| Org transitions to a lower plan | Hard-block new creations that would exceed lower plan limits; existing records are NOT deleted |
| OrgUsageSnapshot does not exist for current period | On-demand aggregation is triggered and snapshot is created |
| FileAttachment.fileSize is null | Treat as 0 bytes in storage aggregation; add a `NOT NULL DEFAULT 0` migration for `fileSize` if it is nullable |
| Nightly cron fails for one org | Log the error in `JobLog`; continue processing other orgs; retry on next run |

---

## 18. Test Plan

### Sprint 23.1 tests

**File:** `src/app/pixel/passport/__tests__/PassportPhotoTool.test.ts`

- [ ] JPEG upload loads and renders in canvas correctly
- [ ] PNG upload loads and renders in canvas correctly
- [ ] HEIC upload triggers HEIC conversion and renders correctly
- [ ] File > 20 MB is rejected with correct error message
- [ ] Brightness slider updates ImageData pixel values correctly (unit test on `useImageProcessor`)
- [ ] Contrast slider updates ImageData pixel values correctly
- [ ] Grayscale toggle converts pixels to gray (R === G === B)
- [ ] Export produces a valid JPEG blob
- [ ] Export produces a valid PNG blob
- [ ] Registration CTA is rendered after export (not before)
- [ ] Route is accessible without authentication (no redirect)
- [ ] `generateMetadata` returns correct title and description

### Sprint 23.2 tests

**File:** `src/app/pixel/passport/__tests__/presets.test.ts`

- [ ] All 12+ presets have valid widthMm, heightMm, and dpi values
- [ ] `widthPx` and `heightPx` calculations for each preset are correct at 300 DPI
- [ ] Crop aspect ratio locks correctly when a preset is selected
- [ ] Preset with `whiteBackground: true` results in white canvas background fill

**File:** `src/app/api/pixel/print-sheet/__tests__/route.test.ts`

- [ ] Valid request with 4 copies on A4 returns a PDF binary
- [ ] Valid request with 6 copies on Letter returns a PDF binary
- [ ] Request with oversized imageBase64 (> 4 MB) returns 400
- [ ] Request exceeding rate limit returns 429
- [ ] Watermark footer is present in PDF output when `orgId` is not provided
- [ ] Watermark footer is absent when `orgId` maps to an org with `removeBranding: true`
- [ ] `{page}` token in name/date field does not cause injection (sanitation test)

### Sprint 23.3 tests

**File:** `src/lib/pixel/__tests__/canvas-ops.test.ts`

- [ ] `resizeImage` produces correct output dimensions
- [ ] `compressToTargetSize` achieves target within 15% of specified byte limit
- [ ] `toGrayscale` is idempotent (applying twice produces same result as applying once)
- [ ] `convertFormat` from PNG with alpha to JPEG loses alpha channel without error

**File:** `src/lib/pixel/__tests__/batch-processor.test.ts`

- [ ] Batch with 3 valid images returns 3 success results
- [ ] Batch with 1 corrupted image returns 2 successes and 1 error; ZIP is still generated
- [ ] Batch with > 20 files for unauthenticated user returns a 403-equivalent error

### Sprint 23.4 tests

**File:** `src/app/api/docs/pdf-studio/header-footer/__tests__/route.test.ts`

- [ ] Valid PDF with header/footer config returns a PDF with text on all pages
- [ ] `{page}` and `{total}` tokens are correctly substituted
- [ ] Request without auth session returns 401
- [ ] PDF > 45 MB returns 413 (or equivalent size limit error)

**File:** `src/lib/pdf-studio/__tests__/advanced-split.test.ts`

- [ ] Split by every 3 pages produces correct number of output files
- [ ] Split at specific pages [3, 7] produces 3 output files with correct page counts
- [ ] Page range extraction "1-3, 5-8" produces 2 files with 3 and 4 pages respectively

### Sprint 23.5 tests

**File:** `src/lib/__tests__/usage-enforcement.test.ts`

- [ ] `checkUsageLimit` returns `{ allowed: true }` when org is under limit
- [ ] `checkUsageLimit` returns `{ allowed: false }` when org is at limit
- [ ] `checkUsageLimit` returns `{ allowed: true, limit: null }` for unlimited plan resources
- [ ] `checkUsageLimit` reads limit from plan config, not from the database
- [ ] `createInvoice` server action is blocked when invoice limit is reached
- [ ] `createInvoice` server action succeeds when under invoice limit

**File:** `src/app/api/cron/usage-snapshot/__tests__/route.test.ts`

- [ ] Cron route is rejected without valid cron secret
- [ ] Cron route processes one org and creates an OrgUsageSnapshot
- [ ] Cron route is idempotent: running twice creates one snapshot, not two
- [ ] Cron route includes storageBytes correctly from FileAttachment sum
- [ ] Cron route handles an org with no attachments (storageBytes = 0)

**File:** `src/app/app/settings/billing/usage/__tests__/page.test.ts`

- [ ] Usage dashboard renders usage bars for each metered resource
- [ ] Usage bar is "amber" when resource is between 70% and 90% of limit
- [ ] Usage bar is "red" when resource is over 90% of limit
- [ ] On-demand aggregation is triggered when lastComputedAt > 6 hours ago
- [ ] Route returns 403 for non-owner/admin roles

### Regression tests

After Sprint 23.5, run:
- `npx vitest run` — all existing 64+ tests must continue to pass
- `npm run lint` — no new lint errors from Phase 23 changes
- `npm run build` — full build must succeed
- `npx prisma validate` — schema must be valid

---

## 19. Non-Functional Requirements

### Performance

- Passport photo crop/adjust preview must update within 100ms of slider movement on a mid-range device
- Print sheet PDF generation must complete in < 10 seconds for a 12-copy A4 sheet
- PDF to JPG must render 10 pages in < 30 seconds at 150 DPI on a mid-range device
- Usage dashboard must load in < 2 seconds (reads from cached snapshot, not live aggregation)
- Batch compress of 10 images (5 MB total) must complete in < 60 seconds in the browser

### Reliability

- Print sheet generation must be retryable: if the client request fails, the user can click "Generate" again without duplicate side effects
- Nightly usage snapshot cron must be idempotent and must not duplicate records if run twice
- SW Pixel processing is entirely in the browser — there is no server state to recover if processing fails; the user simply re-uploads
- Image processing errors in batch mode must not abort the entire batch — failed files are marked individually

### Security

- Public API routes (`/api/pixel/print-sheet`) must validate input size and format before processing
- `imageBase64` input must be validated as valid base64-encoded JPEG/PNG before decoding — reject invalid data with 400
- Rate limiting must be enforced server-side; client-side enforcement alone is not sufficient
- Org ID passed to print-sheet route for white-label check must be validated against the request's session if authenticated, not trusted blindly from the request body
- Usage limits are always enforced server-side in server actions; client-side limit checks are UX hints only

### Scalability

- `OrgUsageSnapshot` with `@@unique([orgId, periodStart])` allows O(1) lookup for any org
- `UsageEvent` table has `@@index([orgId, resource, recordedAt])` for efficient period aggregation
- SW Pixel client-side processing scales to any number of concurrent browser users with zero server load

### Accessibility

- SW Pixel tools must be keyboard-navigable
- Sliders must have ARIA labels: `aria-label="Brightness"`, `aria-valuemin="-100"`, `aria-valuemax="100"`
- Crop editor must show a visible focus ring
- Export button must have an accessible name: "Download passport photo as JPEG"
- Color-coded usage bars must not rely on color alone — include text labels for screen readers

---

## 20. Environment Variables and External Dependencies

### New environment variables

| Variable | Description | Required |
| --- | --- | --- |
| `SENTRY_DSN` | Sentry Data Source Name for error reporting | Production only |
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source map upload in CI | CI/CD only |
| `SENTRY_ORG` | Sentry organization slug | CI/CD only |
| `SENTRY_PROJECT` | Sentry project slug | CI/CD only |

### Existing variables required

| Variable | Used by |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Rate limiting for `/api/pixel/print-sheet` and OCR |
| `UPSTASH_REDIS_REST_TOKEN` | Same |
| `CRON_SECRET` | Nightly usage snapshot cron authentication |
| `NEXT_PUBLIC_APP_URL` | Canonical URL in print sheet footer |

### New npm dependencies

| Package | Version | Reason |
| --- | --- | --- |
| `jszip` | ^3.10.0 | Client-side ZIP for batch image downloads |
| `pdfjs-dist` | ^4.x | PDF page rendering to canvas (PDF to JPG) |
| `@sentry/nextjs` | ^8.x | Error monitoring |

### No new backend dependencies

`pdf-lib` is already installed. `sharp` is NOT added — all image processing is client-side in this phase.

---

## 21. Risk Register

| Risk | Likelihood | Severity | Mitigation |
| --- | --- | --- | --- |
| `pdfjs-dist` bundle size increases Next.js build significantly | Medium | Medium | Use dynamic import with `next/dynamic` for PDF.js; load only on the PDF Studio route where it's used; check bundle analyzer after addition |
| HEIC conversion fails on uncommon device firmware variants | Low | Low | Add fallback error message directing users to export as JPEG; this is a known limitation of browser-based HEIC conversion |
| Print sheet API abused for high-volume automated requests | Medium | Medium | Upstash rate limiting (10 req/min per IP) is the primary defense; add a honeypot field to detect bot traffic |
| `OrgUsageSnapshot` nightly cron times out on orgs with large data volumes | Low | Medium | Add a timeout budget per org (5 seconds); skip orgs that time out and log the failure; re-attempt on the next run |
| Sentry accidentally captures sensitive data (PII, tokens) | Low | High | Code review gate: every `Sentry.captureException` and `Sentry.setUser` call must be reviewed; add Sentry scrubbing rules for known sensitive fields |
| `FileAttachment.fileSize` is null for legacy records | Medium | Low | Handle null in aggregation by treating as 0; add a non-blocking migration to backfill 0 for null fileSize values |
| Plan limit enforcement causes regression in existing tests | Medium | Medium | All existing creation server actions must be audited; add mock for `checkUsageLimit` in existing test setups that don't test limits |
| `jszip` + canvas-in-worker doesn't work on Safari 14 | Low | Medium | Test on actual Safari 14 device/simulator; provide a single-file fallback mode if Worker + jszip combination fails |
| PDF to JPG at 300 DPI on a 50-page PDF exhausts browser memory | Medium | Medium | Display a warning for PDFs > 20 pages at 300 DPI; recommend 150 DPI for large documents |

---

## 22. Branch Strategy and PR Workflow

### Branch hierarchy

```
master (protected — do not touch)
└── feature/phase-23 (Phase 23 integration branch)
    ├── feature/phase-23-sprint-23-1 (SW Pixel Foundation + Passport Photo Core)
    ├── feature/phase-23-sprint-23-2 (Dimension Library + Print Layout)
    ├── feature/phase-23-sprint-23-3 (Image Utility Suite)
    ├── feature/phase-23-sprint-23-4 (PDF Studio Wave 3)
    └── feature/phase-23-sprint-23-5 (Commercial Readiness + Hardening)
```

### Baseline

Create `feature/phase-23` from the HEAD of `feature/phase-22` after Phase 22 audit remediation has been merged into `feature/phase-22`.

```bash
git checkout feature/phase-22
git pull origin feature/phase-22
git checkout -b feature/phase-23
git push -u origin feature/phase-23
```

### Sprint branch workflow

For each sprint:

```bash
# Create sprint branch from phase branch
git checkout feature/phase-23
git checkout -b feature/phase-23-sprint-23-N

# Implement sprint work, commit as you go
git add <files>
git commit -m "feat(pixel): <description>"

# Push sprint branch
git push -u origin feature/phase-23-sprint-23-N

# Open PR: feature/phase-23-sprint-23-N → feature/phase-23
gh pr create \
  --base feature/phase-23 \
  --head feature/phase-23-sprint-23-N \
  --title "feat: Phase 23.N <title>" \
  --body "<PR body per template below>"
```

### PR body template

Each sprint PR must include:

```markdown
## Sprint 23.N — <Sprint Title>

### Summary
<2-3 sentence summary of what was implemented>

### Files changed
- <list key files changed or created>

### Migrations added
- <list migration files, or "None">

### New dependencies
- <list new npm packages, or "None">

### Security notes
- <any auth/permission/input validation notes>

### Test commands run
- `npx vitest run <path to sprint tests>`
- `npm run lint`
- `npm run build`

### Results
- Tests: X/Y passing
- Lint: clean
- Build: success / failure (explain if failure)

### Known limitations or follow-ups
- <anything deferred to a future sprint or phase>

### Dependencies
- Depends on: Sprint 23.(N-1) being merged into feature/phase-23 first (if applicable)
```

### PR dependency order

| Sprint PR | Base branch | Must be merged before |
| --- | --- | --- |
| Sprint 23.1 | `feature/phase-23` | Sprint 23.2 PR |
| Sprint 23.2 | `feature/phase-23` | Sprint 23.3 PR (uses presets from 23.2) |
| Sprint 23.3 | `feature/phase-23` | Can run in parallel with 23.4 |
| Sprint 23.4 | `feature/phase-23` | Can run in parallel with 23.3 |
| Sprint 23.5 | `feature/phase-23` | Requires 23.1–23.4 merged (metering hooks into all new creation paths) |

Sprints 23.3 and 23.4 have no hard dependency on each other and can be developed and reviewed in parallel.

### Commit message conventions

Follow the established pattern in the repo:

```
feat(pixel): add passport photo crop and export tool
feat(pixel): add country preset dimension library
feat(pixel): add print sheet generation (pdf-lib)
feat(pixel): add image resize and compress tools
feat(pdf-studio): add Wave 3 PDF to JPG and extract images tools
feat(billing): add universal plan usage metering
feat(billing): add usage dashboard and upgrade prompts
feat(ops): add Sentry error monitoring
feat(ops): add rate limiting for public pixel API routes
feat(ops): add nightly usage snapshot cron
chore(ops): add AWS migration runbook documentation
```

### No-touch rules

- `master` must not be touched at any point during Phase 23
- No Phase 23 PR should target `master`
- The engineering team must not merge any PR — PRs are submitted for review and require owner approval before merge
- All testing, linting, and build verification must pass before a PR is opened

---

*End of Phase 23 PRD*  
*Next phase: Phase 24 — to be defined based on product direction after Phase 23 delivery and commercial launch metrics*
