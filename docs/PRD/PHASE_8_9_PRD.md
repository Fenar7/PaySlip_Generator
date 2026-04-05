# Slipwise One — Phase 8 & Phase 9
## Product Requirements Document (PRD)
### Version 1.0 | Engineering Handover Document

---

## Document Overview

| Field | Value |
|---|---|
| **Product** | Slipwise One |
| **Phases Covered** | Phase 8: PDF Studio Expansion · Phase 9: SW Pixel Launch |
| **Status** | Ready for Engineering |
| **Prerequisite Phases** | Phase 0–7 completed |
| **Branch Convention** | `feature/phase-8-pdf-studio` · `feature/phase-9-pixel` |
| **Sprint Model** | 3 sprints (Phase 8) + 1 sprint (Phase 9) |
| **Total Sprints** | 4 sprints across both phases |

---

## Table of Contents

1. [Product Context & Phase Summary](#1-product-context--phase-summary)
2. [Current State (Post Phase 7)](#2-current-state-post-phase-7)
3. [Phase 8 — PDF Studio Expansion](#3-phase-8--pdf-studio-expansion)
   - 3.1 Objective
   - 3.2 Sprint 8.1 — Page Organization Tools
   - 3.3 Sprint 8.2 — Document Utility Enhancements
   - 3.4 Sprint 8.3 — Advanced Hardening
   - 3.5 Architecture & Component Design
   - 3.6 Data Model Extensions
   - 3.7 Library Strategy
   - 3.8 Acceptance Criteria
4. [Phase 9 — SW Pixel Launch](#4-phase-9--sw-pixel-launch)
   - 4.1 Objective
   - 4.2 Sprint 9.1 — Passport Photo & Image Suite
   - 4.3 SW Pixel Module Specs
   - 4.4 Architecture & Component Design
   - 4.5 Library Strategy
   - 4.6 Acceptance Criteria
5. [Shared Technical Standards](#5-shared-technical-standards)
6. [Route Map](#6-route-map)
7. [Component Architecture](#7-component-architecture)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Risk Register](#9-risk-register)
10. [QA & Acceptance Gates](#10-qa--acceptance-gates)

---

## 1. Product Context & Phase Summary

Slipwise One is a modular SaaS document operations suite. The delivery roadmap:

| Phase | Name | Status |
|---|---|---|
| 0 | Stabilization | ✅ Done |
| 1 | SW Auth Foundation | ✅ Done |
| 2 | Docs Persistence | ✅ Done |
| 3 | Docs UX + Templates | ✅ Done |
| 4 | SW Pay Lifecycle | ✅ Done |
| 5 | SW Flow Orchestration | ✅ Done |
| 6 | SW Intel Dashboard & Reports | ✅ Done |
| 7 | Roles, Permissions, Proxy & Audit | ✅ Done |
| **8** | **PDF Studio Expansion** | 🔲 This Phase |
| **9** | **SW Pixel Launch** | 🔲 This Phase |
| 10 | Hardening + Pricing + AWS | 🔲 Future |

### What These Phases Deliver

**Phase 8** transforms PDF Studio from an image-to-PDF tool into a full-featured PDF manipulation suite. This covers three expansion waves: page organization, document utilities (fill & sign, protect/unlock, header/footer, PDF-to-image), and advanced hardening (OCR quality, deskew, repair). PDF Studio is a traffic acquisition and freemium conversion lever — every new tool increases organic discovery.

**Phase 9** launches SW Pixel, the photo and image-prep utility suite. The flagship feature is the Passport Photo module (crop, preset dimensions, brightness/contrast, B&W, name/date overlay, print sheet). Additional modules: Resize & Compress, Basic Adjustments, Print Layout, and Name/Date Labelling. SW Pixel follows the same philosophy as PDF Studio: keep it client-side where practical, keep it simple and genuinely useful.

---

## 2. Current State (Post Phase 7)

### PDF Studio Baseline (already built)

The existing `src/features/docs/pdf-studio/` implementation supports:

| Feature | Status |
|---|---|
| Upload up to 30 images (JPEG, PNG, WebP, HEIC/HEIF) | ✅ |
| Reorder images via drag-and-drop | ✅ |
| Rotate images (0°, 90°, 180°, 270°) | ✅ |
| Crop images (free-form editor dialog) | ✅ |
| Session persistence (localStorage) | ✅ |
| Batch operations | ✅ |
| HEIC/HEIF conversion via `libheif-js` | ✅ |
| OCR via `tesseract.js` (basic) | ✅ |
| Text watermark + image watermark | ✅ |
| Page numbers (5 formats, 5 positions) | ✅ |
| AES-256 password protection + permissions | ✅ |
| Compression quality control | ✅ |
| Metadata embedding (title, author, subject, keywords) | ✅ |
| Client-side multi-page preview | ✅ |
| PDF generation via `pdf-lib` | ✅ |
| Size estimator | ✅ |

**What is NOT yet in PDF Studio:**
- Uploading and manipulating existing PDF files (current tool only accepts images)
- Merge multiple PDFs
- Split a PDF into parts
- Delete / extract specific pages
- Fill & sign (form fields, digital signature)
- Unlock a password-protected PDF
- Header/footer text injection
- PDF-to-image export
- Deskew, repair, advanced OCR modes

**SW Pixel:**
- Currently a "Coming Soon" placeholder at `/app/pixel`
- Empty feature barrel at `src/features/pixel/index.ts`

---

## 3. Phase 8 — PDF Studio Expansion

### 3.1 Objective

Evolve PDF Studio from an image-to-PDF builder into a comprehensive PDF manipulation suite. Maintain the core UX principle: operations must be fast, client-side where feasible, and intuitive for non-technical users. Server-side assistance is only justified for computationally heavy operations (OCR, repair) that would block the browser.

**Strategic value:**
- More tools = more SEO keyword surface area
- Each tool is a direct landing page funnel
- Free utility tools drive free-tier sign-ups (conversion entry point)

---

### 3.2 Sprint 8.1 — Page Organization Tools

**Goal:** Enable users to upload, inspect, and reorganize existing PDF files at the page level.

#### Feature: PDF Upload & Reader

**Overview:**  
Extend the current PDF Studio workspace to accept PDF file uploads in addition to images. When a PDF is uploaded, render its pages as canvas thumbnails using `pdfjs-dist` so users can work with individual pages.

**Behaviour:**
- Accept `.pdf` files in the upload drop zone alongside existing image formats
- Parse uploaded PDFs client-side using `pdfjs-dist`
- Render each PDF page to a canvas at 72 DPI for thumbnail display
- Each page becomes an `ImageItem`-like entry in the organizer with its source type marked as `pdf-page`
- Show a PDF icon badge on page thumbnails to distinguish them from raw images
- Cap PDF upload at 50 pages per file (with clear error messaging beyond this limit)
- Support uploading multiple PDFs — pages are appended and interleaved with any image items
- Display file origin indicator per page (e.g. "From: filename.pdf · Page 3")

**New Type Extension:**
```typescript
// Extend ImageItem in types.ts
export type PageSourceType = 'image' | 'pdf-page';

export type ImageItem = {
  // ...existing fields...
  sourceType: PageSourceType;           // NEW
  sourcePdfName?: string;               // NEW — original PDF filename
  sourcePdfPageIndex?: number;          // NEW — 0-based original page index
  pdfPageCanvasData?: string;           // NEW — base64 canvas snapshot for re-rendering
};
```

**Components:**
- Extend `ImageOrganizer` to display PDF page badges
- Extend upload handler in `PdfStudioWorkspace` to detect PDF MIME type and invoke `pdfjs-dist` reader
- New utility: `src/features/docs/pdf-studio/utils/pdf-reader.ts` — `readPdfPages(file: File): Promise<PdfPageItem[]>`

---

#### Feature: Merge PDFs

**Overview:**  
Allow users to upload two or more PDFs and merge them into a single output PDF, with full page-level control over ordering.

**Behaviour:**
- Users can upload multiple PDFs (up to 10 files, max 50 pages each, max 200 combined pages)
- Pages from all PDFs appear in the organizer as individual draggable items
- User can freely reorder pages across source files
- Generate button produces the merged PDF
- Preserves page dimensions per source page (doesn't force uniform A4)
- Option: "Normalize to A4" checkbox forces all pages to A4

**Entry Point:**
- New tool card on the PDF Studio landing/tools hub: "Merge PDFs"
- Route: `/app/docs/pdf-studio/merge`
- Dedicated `MergePdfWorkspace` component

**Output:**
- Single downloadable PDF
- Filename: `merged-document.pdf` (user-editable)

**Acceptance Criteria:**
- Can merge 2 PDFs of different page sizes
- Page order in output matches user-arranged order
- Max 200 pages total enforced with clear error
- Merge completes client-side within 10 seconds for ≤ 50 pages

---

#### Feature: Split PDF

**Overview:**  
Allow users to upload a PDF and split it into multiple output files.

**Split Modes:**
1. **Split by range** — user defines page ranges (e.g. "1-3", "4-7", "8-end")
2. **Split every N pages** — generates files of N pages each (e.g. split every 2 pages)
3. **Extract specific pages** — user picks individual pages to extract into a new file

**Behaviour:**
- Upload a single PDF
- Preview all pages as thumbnails
- Select split mode from a segmented control
- For range mode: text input with "1-3, 4-6, 7-end" syntax, with live validation
- For every-N mode: numeric input; shows preview of how many output files will result
- For extract mode: checkbox-select individual pages; builds one output file from selection
- Generate button produces a `.zip` download containing all split PDF files
- For single-file extractions, offer direct download (no zip)

**Route:** `/app/docs/pdf-studio/split`

**Components:**
- `SplitPdfWorkspace` — main container
- `SplitModeSelector` — segmented control
- `PageRangeInput` — text input with range parser and validator
- `PageSelectionGrid` — checkbox grid of page thumbnails

**Utilities:**
- `src/features/docs/pdf-studio/utils/pdf-splitter.ts`
  - `splitByRanges(pdfBytes: Uint8Array, ranges: PageRange[]): Promise<Uint8Array[]>`
  - `splitEveryN(pdfBytes: Uint8Array, n: number): Promise<Uint8Array[]>`
  - `extractPages(pdfBytes: Uint8Array, pageIndices: number[]): Promise<Uint8Array>`
- `src/features/docs/pdf-studio/utils/zip-builder.ts`
  - `buildZip(files: { name: string; data: Uint8Array }[]): Promise<Blob>` — uses `fflate` or `jszip`

---

#### Feature: Delete Pages

**Overview:**  
Upload a PDF, select pages to delete, download the cleaned-up PDF.

**Behaviour:**
- Upload single PDF; pages shown as thumbnail grid
- Click thumbnails to toggle "marked for deletion" state (red overlay, strikethrough badge)
- Undo/redo support for page deletions
- Minimum 1 page must remain (disable generate button if all pages marked)
- Output: PDF with selected pages removed

**Route:** `/app/docs/pdf-studio/delete-pages`

---

#### Feature: Reorder / Organize Pages

**Overview:**  
Upload a PDF and reorder its pages via drag-and-drop, then re-export.

**Behaviour:**
- Upload single PDF; pages rendered as draggable thumbnail grid
- Drag to reorder (same UI pattern as existing image organizer)
- Rotate individual pages (0°/90°/180°/270°)
- Delete individual pages inline
- Output: reorganized PDF preserving original page dimensions

**Route:** `/app/docs/pdf-studio/organize`

---

#### Feature: Resize Pages

**Overview:**  
Upload a PDF and resize all pages to a target dimension.

**Resize Options:**
- A4 Portrait / A4 Landscape
- US Letter Portrait / US Letter Landscape
- Custom width × height (in mm or inches)
- Fit mode: contain (letterbox), cover (crop), stretch

**Behaviour:**
- Applies uniformly to all pages
- Preview shows before/after size comparison
- Preserves content using pdf-lib page scaling

**Route:** `/app/docs/pdf-studio/resize-pages`

---

#### Sprint 8.1 Deliverables Summary

| Feature | Route | Type |
|---|---|---|
| PDF Upload & Reader | (integrated in all tools) | Shared utility |
| Merge PDFs | `/app/docs/pdf-studio/merge` | Tool page |
| Split PDF | `/app/docs/pdf-studio/split` | Tool page |
| Delete Pages | `/app/docs/pdf-studio/delete-pages` | Tool page |
| Organize / Reorder | `/app/docs/pdf-studio/organize` | Tool page |
| Resize Pages | `/app/docs/pdf-studio/resize-pages` | Tool page |
| PDF Studio Tools Hub | `/app/docs/pdf-studio` | Landing page |

#### Sprint 8.1 Acceptance Gate
- All tools work purely client-side (no server round-trip for core operations)
- PDF upload, parsing, and thumbnail rendering work on files ≤ 50 pages in under 5 seconds
- Merge of 3 PDFs (10 pages each) completes in under 8 seconds
- Split and zip download work on Firefox, Chrome, Safari (desktop + mobile)

---

### 3.3 Sprint 8.2 — Document Utility Enhancements

**Goal:** Add editing capabilities that go beyond page organization — annotations, forms, headers, and format conversion.

---

#### Feature: Fill & Sign

**Overview:**  
Allow users to fill PDF form fields and apply a drawn signature to any PDF.

**Sub-features:**

**A — Signature Canvas:**
- Freehand draw signature on a canvas pad (touch + mouse)
- Clear / redo
- Choose pen color: black, dark blue, dark red
- Save signature to browser (localStorage) for reuse
- Export as transparent PNG
- Place signature anywhere on a PDF page by drag-to-position

**B — Text Annotations:**
- Click any position on a PDF page to add a text box
- Movable/resizable text boxes
- Font size control (8–24 pt)
- Font family: Helvetica (default), Times New Roman
- Color: black, dark blue, dark red
- Delete annotation

**C — PDF Form Fields (read & fill):**
- Detect if uploaded PDF contains AcroForm fields
- If yes, display a form panel listing all fields
- User fills fields; values written to PDF via `pdf-lib`
- Flatten fields on export (non-editable output)

**Implementation notes:**
- Signature drawing: `signature_pad` library (MIT) — battle-tested, touch/pointer events
- PDF overlay rendering: `pdfjs-dist` for visual render + `pdf-lib` for embedding
- Canvas overlay approach: render PDF page to canvas → overlay SVG/canvas for annotations → embed into pdf-lib output

**Route:** `/app/docs/pdf-studio/fill-sign`

**Components:**
- `FillSignWorkspace` — outer container
- `SignatureCanvas` — freehand draw pad (`signature_pad` wrapper)
- `PdfPageOverlay` — canvas layer over PDF page thumbnail for click-to-add
- `TextAnnotationLayer` — managed list of text annotations with drag handles
- `SavedSignatureSelector` — shows previously saved signatures from localStorage

**Utilities:**
- `src/features/docs/pdf-studio/utils/signature.ts` — serialize/deserialize signature data, write to PDF
- `src/features/docs/pdf-studio/utils/annotation-writer.ts` — embed text annotations into PDF bytes

---

#### Feature: Protect & Unlock

**Protect (already exists — enhance):**
- Current: AES-256 password protection via `pdf-encryptor.ts` using `/api/pdf/encrypt` server route
- Enhancement: Add visual permission toggles for print quality (low/high), form fill permissions, annotation permissions
- Add "owner password" explanation tooltip
- Improve error UX for incorrect password confirmation

**Unlock (new):**
- Upload a password-protected PDF
- Prompt for password
- Attempt to decrypt with `pdf-lib` (`PDFDocument.load(bytes, { password })`)
- If successful, re-export PDF without encryption
- Handle wrong password gracefully (show error, allow retry)
- Important note: Can only unlock PDFs the user has the user password for (no cracking/bypassing)

**Route:** `/app/docs/pdf-studio/protect` (merged protect + unlock tool)

---

#### Feature: Header & Footer

**Overview:**  
Inject a header and/or footer into every page of an existing PDF.

**Header Options:**
- Left / Center / Right text positions (each independently configurable)
- Support for dynamic tokens: `{page}`, `{total}`, `{date}`, `{filename}`
- Font: Helvetica or Times New Roman
- Font size: 8–14 pt
- Color picker (hex input + preset swatches)
- Top margin offset (how far from page edge, 5–50 mm)

**Footer Options:**
- Same as header, with bottom margin offset

**Preview:**
- Live preview shows first page of uploaded PDF with injected header/footer overlaid

**Route:** `/app/docs/pdf-studio/header-footer`

**Components:**
- `HeaderFooterWorkspace`
- `HeaderFooterPanel` — configures header and footer settings
- `HeaderFooterPreview` — renders first page with overlay

**Utilities:**
- `src/features/docs/pdf-studio/utils/header-footer-writer.ts`
  - `injectHeaderFooter(pdfBytes: Uint8Array, settings: HeaderFooterSettings): Promise<Uint8Array>`

---

#### Feature: PDF to Image (PDF-to-JPG / PDF-to-PNG)

**Overview:**  
Convert each page of a PDF into high-quality images.

**Behaviour:**
- Upload a PDF (up to 20 pages)
- Select output format: JPEG or PNG
- Select resolution: 72 DPI (screen), 150 DPI (standard), 300 DPI (print)
- For JPEG: quality slider (60–100)
- Preview grid of converted pages before download
- Download options:
  - Download all as ZIP
  - Download individual pages by clicking

**Implementation:**
- Render each page via `pdfjs-dist` with the target resolution scale (`scale = targetDPI / 72`)
- Export canvas to Blob (JPEG or PNG)
- ZIP via `fflate`

**Route:** `/app/docs/pdf-studio/pdf-to-image`

**Components:**
- `PdfToImageWorkspace`
- `ResolutionSelector` — segmented: Screen / Standard / Print
- `PageImageGrid` — shows preview tiles with individual download buttons
- `BatchDownloadButton` — triggers zip generation

**Utilities:**
- `src/features/docs/pdf-studio/utils/pdf-to-image.ts`
  - `renderPdfPagesToImages(pdfBytes: Uint8Array, options: RenderOptions): Promise<RenderedPage[]>`

---

#### Feature: Page Numbers Improvements

**(Enhancement to existing page number feature)**

New additions:
- **Custom text prefix/suffix** — e.g. "Page {n} of {total}" with user-editable prefix/suffix text
- **Roman numeral mode** — i, ii, iii... or I, II, III...
- **Skip range** — skip page numbers on pages N through M (e.g. skip first 3 pages)
- **Font selection** — Helvetica (default), Times New Roman, Courier
- **Bold / Italic toggles**
- **Background box option** — add a white/light box behind the number for readability on dark pages

---

#### Sprint 8.2 Deliverables Summary

| Feature | Route | Type |
|---|---|---|
| Fill & Sign | `/app/docs/pdf-studio/fill-sign` | Tool page |
| Protect & Unlock | `/app/docs/pdf-studio/protect` | Tool page |
| Header & Footer | `/app/docs/pdf-studio/header-footer` | Tool page |
| PDF to Image | `/app/docs/pdf-studio/pdf-to-image` | Tool page |
| Page Numbers (enhanced) | Integrated in settings panel | Enhancement |

#### Sprint 8.2 Acceptance Gate
- Signature drawn on canvas is correctly placed on PDF output
- PDF form detection and filling works for a standard AcroForm PDF
- Unlock works for PDFs protected with user password
- Header/footer tokens render correctly: `{page}`, `{total}`, `{date}`
- PDF-to-JPG at 150 DPI produces readable output in under 15 seconds for a 10-page PDF
- UX consistency: all new tools follow the same layout pattern as existing PDF Studio tools

---

### 3.4 Sprint 8.3 — Advanced Hardening

**Goal:** Harden OCR quality, determine feasibility of deskew and repair, define the server-assisted tool strategy, and instrument usage analytics.

---

#### Feature: OCR Hardening

**Overview:**  
Improve the existing OCR integration (tesseract.js) with better language support, quality controls, and output handling.

**Enhancements:**
- **Language selector** — currently English-only; add: Arabic, French, Spanish, German, Hindi, Urdu (with lazy-loaded language packs)
- **OCR mode selector:**
  - Fast (tesseract "fast" model) — lower accuracy, quicker
  - Accurate (tesseract "best" model) — higher accuracy, slower
- **Preprocessing toggle** — apply auto-threshold (binarize) before OCR to improve accuracy on low-contrast images
- **Output panel improvements:**
  - Show OCR confidence score per image (0–100%)
  - Color-code confidence: green (>85%), amber (60–85%), red (<60%)
  - Expandable full-text view per image
  - "Copy all text" button
  - "Export OCR text as .txt" button
- **Embedded text layer** — when OCR is enabled, embed the extracted text as an invisible text layer in the output PDF (for searchability and accessibility)

**Technical Notes:**
- Tesseract.js `createWorker()` with language packs loaded on demand
- Language packs are loaded from the Tesseract.js CDN (or self-hosted)
- Text layer embedding: `pdf-lib` does not natively support searchable text overlays — use `pdfjs-dist` annotation layer or a custom text-embed utility

**Components:**
- Extend `OcrProgressPanel` with language selector and mode selector
- New `OcrOutputPanel` — shows per-image OCR results with confidence scores

---

#### Feature: Deskew (Feasibility Assessment + MVP)

**Overview:**  
Straighten scanned documents that are slightly tilted.

**Feasibility:**
- Browser-native deskew via canvas pixel analysis is achievable for modest skew (±5°)
- Algorithm: Hough transform line detection to find dominant angle, then rotate canvas to compensate
- Third-party: `opencv.js` WASM (heavy, ~8MB) provides robust deskew — consider lazy loading

**MVP Approach (Phase 8):**
- Implement a simple auto-deskew toggle using canvas-based angle detection
- If angle detected is < 0.5°, skip (no perceptible skew)
- Maximum correction: ±15° (beyond this, flag for manual review)
- Manual fine-tune slider: -10° to +10° with 0.5° increments
- Apply deskew as a pre-processing step before PDF generation

**Components:**
- Add `DeskewControl` to `PageSettingsPanel` as a new collapsible section
- Utility: `src/features/docs/pdf-studio/utils/deskew.ts`
  - `detectSkewAngle(imageData: ImageData): number` — Hough-based angle detection
  - `deskewCanvas(canvas: HTMLCanvasElement, angleDegrees: number): HTMLCanvasElement`

---

#### Feature: PDF Repair (Feasibility Assessment)

**Overview:**  
Attempt to repair/recover malformed or partially corrupt PDF files.

**Scope for Phase 8:**
- Use `pdfjs-dist`'s tolerance mode (`{ stopAtErrors: false }`) to attempt loading corrupt PDFs
- If successful, re-save via `pdf-lib` (clean copy)
- If `pdfjs-dist` cannot load: show a clear error with suggestions (try Acrobat's repair, etc.)
- Do NOT implement deep binary-level repair in Phase 8 — that requires server-side tooling
- Document server-side repair strategy for Phase 10 (using `ghostscript` or `qpdf` on AWS Lambda)

**Route:** `/app/docs/pdf-studio/repair`

---

#### Feature: Usage Analytics Integration

**Overview:**  
Instrument all PDF Studio tool usage for traffic analysis and conversion funnel insights.

**Events to track (PostHog):**
- `pdf_studio_tool_opened` — `{ tool: string, is_authenticated: boolean }`
- `pdf_studio_generate_started` — `{ tool, page_count, file_size_kb }`
- `pdf_studio_generate_completed` — `{ tool, duration_ms, output_size_kb }`
- `pdf_studio_generate_failed` — `{ tool, error_type }`
- `pdf_studio_download` — `{ tool, format }`
- `pdf_studio_ocr_run` — `{ language, mode, page_count }`

**Implementation:**
- Add PostHog tracking hooks (check if PostHog is already integrated; if not, add `posthog-js` as optional analytics module)
- All tracking must be opt-out / GDPR safe (no PII)
- Wrap in a `useAnalytics()` hook that noops if PostHog not initialized

---

#### Sprint 8.3 Deliverables Summary

| Feature | Status |
|---|---|
| OCR with language selector (7 languages) | Shipped |
| OCR confidence scores + export .txt | Shipped |
| Embedded text layer in PDF output | Shipped |
| Deskew (auto-detect + manual slider) | Shipped |
| PDF Repair (tolerance mode + clean copy) | Shipped |
| Usage analytics instrumentation | Shipped |
| Server-side heavy-tool strategy doc | Documented in `docs/decisions/phase-8-server-tools.md` |

#### Sprint 8.3 Acceptance Gate
- OCR produces Arabic text for an Arabic-language image with confidence > 70%
- Deskew corrects a 3° skew to within 0.5° of horizontal on a standard scanned document
- PDF Repair successfully loads and re-exports a mildly corrupt PDF (test with truncated file)
- All PostHog events fire correctly and appear in the PostHog dashboard

---

### 3.5 Architecture & Component Design

#### PDF Studio Tools Hub

The current `/app/docs/pdf-studio` route renders the full workspace. In Phase 8, this becomes a tools hub landing page with cards for each tool category.

```
/app/docs/pdf-studio
└── layout.tsx                    ← Shared PDF Studio shell (sidebar nav)
    ├── page.tsx                  ← Tools hub (grid of tool cards)
    ├── organize/page.tsx
    ├── merge/page.tsx
    ├── split/page.tsx
    ├── delete-pages/page.tsx
    ├── resize-pages/page.tsx
    ├── fill-sign/page.tsx
    ├── protect/page.tsx
    ├── header-footer/page.tsx
    ├── pdf-to-image/page.tsx
    └── repair/page.tsx
```

The original "images to PDF" workspace (currently the only tool) moves to:
```
/app/docs/pdf-studio/create        ← renamed from the root workspace
```

#### Shared Tool Shell Pattern

Every PDF Studio tool follows this layout pattern:

```
<PdfToolShell title="Merge PDFs" description="Combine multiple PDFs into one">
  <PdfToolUploadZone accept={['.pdf']} maxFiles={10} />
  <PdfToolOptions>
    {/* Tool-specific controls */}
  </PdfToolOptions>
  <PdfToolPreview>
    {/* Thumbnails / live preview */}
  </PdfToolPreview>
  <PdfToolActions>
    <GenerateButton />
    <DownloadButton />
  </PdfToolActions>
</PdfToolShell>
```

All tools share:
- File drop zone with drag-over state
- Upload progress indicator
- Error display pattern (toast + inline)
- Generate button with loading state
- Download button (triggers browser download)
- Session restore prompt (if applicable)

#### New Shared Utilities

```
src/features/docs/pdf-studio/utils/
├── pdf-reader.ts           NEW  — pdfjs-dist page extraction
├── pdf-splitter.ts         NEW  — split/extract pages
├── zip-builder.ts          NEW  — fflate zip creation
├── pdf-to-image.ts         NEW  — pdfjs-dist page render to image
├── header-footer-writer.ts NEW  — header/footer embedding
├── signature.ts            NEW  — signature serialization + PDF embedding
├── annotation-writer.ts    NEW  — text annotation embedding
├── deskew.ts               NEW  — Hough-based angle detection + correction
└── [existing utils]
```

---

### 3.6 Data Model Extensions

Phase 8 is predominantly client-side and requires minimal database schema changes.

**New Prisma model: `PdfStudioUsageLog`** *(optional — for authenticated users only)*

```prisma
model PdfStudioUsageLog {
  id         String   @id @default(cuid())
  orgId      String
  userId     String
  tool       String   // "merge" | "split" | "fill-sign" | ...
  pageCount  Int
  fileSizeKb Int
  durationMs Int
  createdAt  DateTime @default(now())

  org  Organization @relation(fields: [orgId], references: [id])
}
```

> Note: Only log for authenticated users. Unauthenticated (free tool) usage goes to PostHog only.

---

### 3.7 Library Strategy

| Library | Purpose | Already in use? |
|---|---|---|
| `pdf-lib` | PDF creation, manipulation, merge, split | ✅ Yes |
| `pdfjs-dist` | PDF reading, page rendering to canvas | ❌ Add |
| `tesseract.js` | OCR | ✅ Yes |
| `signature_pad` | Freehand signature drawing | ❌ Add |
| `fflate` | Fast ZIP creation/extraction (lighter than JSZip) | ❌ Add |
| `libheif-js` | HEIC/HEIF decoding | ✅ Yes |

**Add to `package.json`:**
```json
"pdfjs-dist": "^4.x",
"signature_pad": "^5.x",
"fflate": "^0.8.x"
```

**Bundle size considerations:**
- `pdfjs-dist` is large (~2MB WASM worker). Always lazy-load: `const pdfjsLib = await import('pdfjs-dist')`
- Set `pdfjs.GlobalWorkerOptions.workerSrc` to a CDN URL or `/public/pdf.worker.min.js` (copy via postinstall)
- `signature_pad`: ~15KB — safe to include eagerly

---

### 3.8 Phase 8 Acceptance Criteria

| # | Criterion |
|---|---|
| P8-1 | All 9 new PDF tools render correctly on Chrome, Firefox, Safari (latest) |
| P8-2 | All tools work on mobile (iOS Safari, Android Chrome) — responsive layout |
| P8-3 | PDF files up to 50 pages process without browser tab crash |
| P8-4 | Merge completes for 3 × 15-page PDFs in under 10 seconds |
| P8-5 | Split ZIP download contains correct page ranges |
| P8-6 | Signature is correctly positioned and visible in PDF output |
| P8-7 | Fill & Sign correctly populates AcroForm text fields |
| P8-8 | Header/footer `{page}` and `{total}` tokens render correctly |
| P8-9 | PDF-to-JPEG at 150 DPI produces clearly readable output |
| P8-10 | OCR confidence scores display per-image; Arabic OCR functional |
| P8-11 | Deskew corrects ≤ 10° skew without visible artifacts |
| P8-12 | All PostHog tool events fire on generate and download |
| P8-13 | Zero TypeScript errors; zero ESLint errors |
| P8-14 | All new utilities have unit tests covering happy path + 3 edge cases |

---

## 4. Phase 9 — SW Pixel Launch

### 4.1 Objective

Launch SW Pixel as the photo and image-preparation utility suite. The target user is anyone who needs to prepare photos for official use (ID applications, visa submissions), standardize image dimensions for web, or prepare print sheets. Keep every tool client-side, fast, and operable by users with no design background.

**Strategic positioning:**
- High SEO traffic potential ("passport photo maker", "photo resize online", "compress image free")
- Viral loop: users share the tool with friends preparing similar documents
- Freemium conversion: users who find value in Pixel are likely to explore SW Docs

---

### 4.2 Sprint 9.1 — Passport Photo & Image Suite

**One focused sprint.** Deliver all five SW Pixel modules as a cohesive, polished product.

---

### 4.3 SW Pixel Module Specs

#### Module 1: Passport Photo

**Overview:**  
The flagship SW Pixel tool. Helps users crop, adjust, and export a photo to meet official passport/visa size requirements for any country.

**Step-by-step UX Flow:**
1. **Upload** — drag-drop or file picker; accept JPEG, PNG, WebP, HEIC/HEIF (auto-convert HEIC); max 20MB
2. **Select preset** — choose country/document type from the passport preset library
3. **Crop** — interactive crop tool constrained to the preset's aspect ratio
4. **Adjust** — brightness, contrast, saturation, B&W toggle
5. **Overlay** — optionally add name and/or date text overlaid on the photo
6. **Preview** — shows the cropped result in the correct dimensions
7. **Export** — download single photo or a print sheet (multiple photos on A4/letter)

**Passport Preset Library (`src/features/pixel/data/passport-presets.ts`):**

```typescript
export interface PassportPreset {
  id: string;
  country: string;
  documentType: string;  // "Passport" | "Visa" | "ID Card" | "Driving Licence"
  widthMm: number;
  heightMm: number;
  widthPx: number;       // at 300 DPI: widthMm * 300 / 25.4
  heightPx: number;
  maxFileSizeKb?: number;
  notes?: string;
}
```

**Minimum preset library (must ship with these):**

| ID | Country | Document | Size |
|---|---|---|---|
| `uk-passport` | United Kingdom | Passport | 35 × 45 mm |
| `us-passport` | United States | Passport | 51 × 51 mm (2 × 2 in) |
| `eu-passport` | European Union | Passport (standard) | 35 × 45 mm |
| `india-passport` | India | Passport | 35 × 45 mm |
| `uae-passport` | UAE | Passport | 40 × 60 mm |
| `saudi-passport` | Saudi Arabia | Passport | 40 × 60 mm |
| `pakistan-passport` | Pakistan | Passport | 35 × 45 mm |
| `china-passport` | China | Passport | 33 × 48 mm |
| `us-visa` | United States | Visa | 51 × 51 mm |
| `uk-driving` | United Kingdom | Driving Licence | 45 × 35 mm |
| `india-id` | India | ID Card (Aadhaar) | 35 × 35 mm |
| `generic-35x45` | Generic | 35×45 (most passports) | 35 × 45 mm |
| `generic-2x2` | Generic | 2×2 inch (US standard) | 51 × 51 mm |
| `custom` | Custom | Custom dimensions | User-defined |

**Crop UI:**
- Use a constrained crop box with the preset's aspect ratio
- Canvas-based implementation (avoid heavy libraries; or use `react-easy-crop` MIT)
- Blue/white crop handles; dark semi-transparent overlay outside crop area
- Zoom slider: 50% to 200%
- Pan the photo within the crop box
- "Reset crop" button

**Adjustments Panel:**
- **Brightness** — slider -100 to +100 (0 = no change); applied via canvas `getImageData` + luminance shift
- **Contrast** — slider -100 to +100; canvas pixel contrast algorithm
- **Saturation** — slider -100 to +100; 0 = no change, -100 = grayscale (B&W)
- **B&W toggle** — sets saturation to -100 instantly
- **Reset all adjustments** button
- All adjustments are live (preview updates in real-time as slider moves)

**Name/Date Overlay:**
- Text 1: Name field (typically full name)
- Text 2: Date field (date picker, formatted as DD/MM/YYYY or MM/DD/YYYY based on locale)
- Text position: bottom of photo (fixed, below crop area, not overlapping face)
- Font: system sans-serif (simple, official-looking)
- Font size: auto-scaled to photo width
- Text color: black

**Print Sheet:**
- Layout: standard print sheet (A4 or US Letter) with multiple copies of the passport photo
- Auto-calculate grid: how many photos fit given the preset's mm dimensions and a 2mm gutter
- Show estimated print count (e.g. "6 photos per A4 sheet")
- Print sheet preview with crop marks
- Download as high-resolution PNG (300 DPI equivalent) or PDF

**Export Options:**
- Format: JPEG (default) or PNG
- Resolution: 300 DPI (print quality) — default
- File size target: if the preset specifies max KB, apply compression to meet it
- Filename: `passport-photo-{country}-{date}.jpg`

**Route:** `/app/pixel/passport`

**Components:**
```
src/features/pixel/components/passport/
├── PassportPhotoWorkspace.tsx    ← main container
├── PassportPresetSelector.tsx    ← country dropdown + preset grid
├── PassportCropEditor.tsx        ← constrained crop with zoom/pan
├── PassportAdjustPanel.tsx       ← brightness/contrast/saturation/B&W
├── PassportNameDateOverlay.tsx   ← text overlay controls
├── PassportPreview.tsx           ← final result preview
├── PassportPrintSheet.tsx        ← print sheet generator + preview
└── PassportExportOptions.tsx     ← format/resolution download controls
```

**Utilities:**
```
src/features/pixel/utils/
├── image-crop.ts         ← canvas-based crop with zoom/pan
├── image-adjustments.ts  ← brightness/contrast/saturation via ImageData
├── print-sheet.ts        ← layout multiple photos on A4/letter canvas
└── file-size-compress.ts ← binary search compression to meet target KB
```

---

#### Module 2: Resize & Compress

**Overview:**  
Resize and/or compress any image to a target dimension or file size.

**Resize Options:**
- By pixel dimensions: width × height with aspect-ratio lock/unlock
- By percentage: 10% to 200% scale
- By preset: "Web thumbnail" (150×150), "Web banner" (1200×630), "Icon" (512×512), "WhatsApp DP" (500×500), etc.
- By long edge: set the longest dimension; shorter dimension auto-computed

**Compression:**
- JPEG quality slider: 10–100
- WebP quality slider: 10–100
- PNG: lossless (size reduced by removing metadata) or quantized (lossy via palettized)
- Target file size mode: enter KB target; system iterates compression to meet it

**Output formats:** JPEG, PNG, WebP

**Batch mode:** Accept up to 10 images; apply same settings to all; download as ZIP

**Route:** `/app/pixel/resize`

**Components:**
- `ResizeCompressWorkspace`
- `ResizeDimensionPanel`
- `CompressionPanel`
- `BatchImageGrid` — shows before/after sizes and dimensions per file
- `DownloadAllButton`

---

#### Module 3: Basic Adjustments

**Overview:**  
A simple image editor for quick visual corrections.

**Tools:**
- **Brightness** — slider -100 to +100
- **Contrast** — slider -100 to +100
- **Saturation** — slider -100 to +100 (0 = full color, -100 = grayscale)
- **Sharpness** — slider 0 to +100 (unsharp mask)
- **Blur** — slider 0 to +20 (Gaussian)
- **Hue rotation** — 0 to 360°
- **Exposure** — slider -100 to +100 (gamma-based)
- **Black & White toggle** — instant desaturate
- **Sepia toggle** — warm B&W effect
- **Flip Horizontal / Flip Vertical**
- **Rotate 90° CW / 90° CCW / 180°**
- **Reset all** button

**History:**
- Undo/redo stack (up to 20 steps) using stored `ImageData` snapshots

**Output:**
- JPEG or PNG
- Download single image

**Route:** `/app/pixel/adjust`

**Components:**
- `BasicAdjustWorkspace`
- `AdjustmentSidebar` — sliders + toggles
- `ImageCanvas` — live-preview canvas
- `UndoRedoControls`

---

#### Module 4: Print Layout

**Overview:**  
Arrange one or more photos on a standard print size sheet for printing at a pharmacy/print shop.

**Sheet sizes:** A4, A5, US Letter, 4×6 (10×15 cm), 5×7 (13×18 cm)

**Photo sizes per sheet:** User selects target photo print size; system calculates grid

**Standard presets:**
- Wallet (6×9 cm) — 4 per A4
- 5×7 print (13×18 cm) — 2 per A4
- 4×6 print (10×15 cm) — 2 per A4
- Passport strip (3 photos horizontal)

**Features:**
- Upload 1–4 photos; each appears in its cell
- Rotate individual photos within cell
- Uniform background color option (white/off-white)
- Gutter / border control
- Crop marks for each cell (for cutting guide)
- Download as PDF or high-resolution PNG

**Route:** `/app/pixel/print-layout`

---

#### Module 5: Name/Date Labelling

**Overview:**  
Add name, date, ID number, or custom text labels to a photo. Useful for labelling printed photos, creating ID-card style outputs, or tagging evidence photos.

**Features:**
- Upload any image
- Add up to 4 text fields (each independently positioned)
- Text field properties:
  - Content (free text input)
  - Font family: 5 choices (Helvetica, Times, Courier, Georgia, Arial)
  - Font size: 8–72 pt
  - Color: color picker
  - Background: none / white box / black box
  - Position: drag to any position on the image
- Alignment guides (snap to center/thirds)
- Date field special mode: auto-insert today's date in format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- Text rotation: 0° or 90°
- Download as JPEG or PNG

**Route:** `/app/pixel/label`

---

### 4.4 Architecture & Component Design

#### Route Structure

```
/app/pixel
├── layout.tsx                ← SW Pixel sidebar nav shell
├── page.tsx                  ← SW Pixel hub (tool cards)
├── passport/page.tsx         ← Passport Photo module
├── resize/page.tsx           ← Resize & Compress
├── adjust/page.tsx           ← Basic Adjustments
├── print-layout/page.tsx     ← Print Layout
└── label/page.tsx            ← Name/Date Labelling
```

#### Feature Directory Structure

```
src/features/pixel/
├── index.ts                        ← barrel export
├── components/
│   ├── pixel-hub.tsx               ← tool cards landing
│   ├── pixel-tool-shell.tsx        ← shared tool wrapper (upload zone, actions bar)
│   ├── passport/
│   │   ├── PassportPhotoWorkspace.tsx
│   │   ├── PassportPresetSelector.tsx
│   │   ├── PassportCropEditor.tsx
│   │   ├── PassportAdjustPanel.tsx
│   │   ├── PassportNameDateOverlay.tsx
│   │   ├── PassportPreview.tsx
│   │   ├── PassportPrintSheet.tsx
│   │   └── PassportExportOptions.tsx
│   ├── resize/
│   │   ├── ResizeCompressWorkspace.tsx
│   │   ├── ResizeDimensionPanel.tsx
│   │   ├── CompressionPanel.tsx
│   │   └── BatchImageGrid.tsx
│   ├── adjust/
│   │   ├── BasicAdjustWorkspace.tsx
│   │   ├── AdjustmentSidebar.tsx
│   │   └── ImageCanvas.tsx
│   ├── print-layout/
│   │   └── PrintLayoutWorkspace.tsx
│   └── label/
│       ├── LabelWorkspace.tsx
│       └── TextLayerEditor.tsx
├── data/
│   └── passport-presets.ts         ← 14+ preset definitions
├── hooks/
│   ├── use-image-adjustments.ts    ← adjustments state + canvas apply
│   ├── use-crop.ts                 ← crop state + zoom/pan
│   ├── use-image-history.ts        ← undo/redo stack
│   └── use-pixel-session.ts        ← session persistence
└── utils/
    ├── image-crop.ts
    ├── image-adjustments.ts
    ├── print-sheet.ts
    ├── file-size-compress.ts
    └── heic-converter.ts           ← reuse from pdf-studio (or shared lib)
```

#### Shared Hook: `useImageAdjustments`

```typescript
interface AdjustmentState {
  brightness: number;   // -100 to +100
  contrast: number;     // -100 to +100
  saturation: number;   // -100 to +100
  sharpness: number;    // 0 to +100
  blur: number;         // 0 to +20
  hue: number;          // 0 to 360
  exposure: number;     // -100 to +100
  isBlackWhite: boolean;
  isSepia: boolean;
  flipH: boolean;
  flipV: boolean;
  rotation: 0 | 90 | 180 | 270;
}

function useImageAdjustments(sourceImage: HTMLImageElement | null): {
  state: AdjustmentState;
  update: (partial: Partial<AdjustmentState>) => void;
  reset: () => void;
  apply: (canvas: HTMLCanvasElement) => void;  // renders adjusted image to canvas
}
```

#### Canvas Adjustment Algorithm

All adjustments are applied client-side via `canvas.getImageData()` / `putImageData()`:

```
brightness: clamp(pixel + (value * 2.55), 0, 255)
contrast:   ((pixel - 128) * factor) + 128  where factor = (259 * (value + 255)) / (255 * (259 - value))
saturation: convert to HSL, multiply S by factor, convert back to RGB
b&w:        avg = (R + G + B) / 3; R = G = B = avg
sepia:      standard sepia matrix
sharpness:  convolution with unsharp mask kernel
blur:       convolution with Gaussian kernel
```

---

### 4.5 Library Strategy

| Library | Purpose | Add? |
|---|---|---|
| `react-easy-crop` | Crop UI with zoom/pan for passport module | ❌ Evaluate — may use custom canvas |
| `browser-image-compression` | JPEG/WebP compression with quality control | ✅ Add |
| `fflate` | ZIP for batch download (shared with Phase 8) | ✅ Add (Phase 8 adds it) |
| `libheif-js` | HEIC/HEIF support | ✅ Already in pdf-studio — share module |

**Custom canvas crop vs. `react-easy-crop`:**
- `react-easy-crop`: 34KB gzipped, well-tested, MIT license — **recommended**
- Custom canvas: more control, no external dep, ~100 lines of code — viable alternative
- Decision: Use `react-easy-crop` for the passport crop and print-layout crop; custom canvas for the simpler resize module

**Add to `package.json`:**
```json
"react-easy-crop": "^5.x",
"browser-image-compression": "^2.x"
```

---

### 4.6 Phase 9 Acceptance Criteria

| # | Criterion |
|---|---|
| P9-1 | Passport photo workflow: upload → select preset → crop → adjust → download completes on mobile Safari |
| P9-2 | All 14 passport presets produce correctly dimensioned output (±1px tolerance) |
| P9-3 | HEIC/HEIF photos from iPhone process correctly |
| P9-4 | Print sheet for UK passport (35×45 mm) on A4 at 300 DPI is print-ready |
| P9-5 | Name/date overlay renders in correct position and is not cut off |
| P9-6 | Resize module: output dimensions match user input exactly (no rounding errors) |
| P9-7 | File-size target compression achieves target KB ±10% for JPEG |
| P9-8 | Batch resize of 5 images downloads as a valid ZIP in under 5 seconds |
| P9-9 | Basic adjustments undo/redo stack works for 20 operations |
| P9-10 | B&W toggle and sepia produce visually correct output |
| P9-11 | All SW Pixel tools work on viewport widths 360px and above |
| P9-12 | Zero TypeScript errors; zero ESLint errors |
| P9-13 | All image utilities have unit tests covering: crop math, adjustment bounds, print sheet layout |

---

## 5. Shared Technical Standards

### 5.1 Code Conventions

All Phase 8 and Phase 9 code must follow these conventions (consistent with the existing codebase):

**File structure:**
- App routes: `src/app/app/{module}/{tool}/page.tsx` (server component, minimal)
- Feature logic: `src/features/{module}/components/` and `src/features/{module}/utils/`
- Shared utilities: `src/lib/`

**Component pattern:**
```typescript
// All new components:
"use client";   // for interactive components

// Server components for page.tsx (minimal wrapper):
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Tool Name | PDF Studio" };
export default function ToolPage() {
  return <ToolWorkspace />;
}
```

**Server actions** (if any — Phase 8 minimize server actions):
```typescript
"use server";
// Return type: { success: true; data: T } | { success: false; error: string }
// Always call requireOrgContext() first if auth-gated
// Always call revalidatePath() after mutations
```

**TypeScript:**
- No `any` without `// eslint-disable-next-line @typescript-eslint/no-explicit-any` and a comment explaining why
- Prefer explicit return types on utility functions
- Use `Uint8Array` for binary PDF/image data throughout

### 5.2 Client-Side Performance Rules

1. **Lazy-load heavy libraries** — `pdfjs-dist`, `tesseract.js`, `libheif-js` must always use dynamic `import()` inside an async function, never at the module top level
2. **Web Workers** — PDF.js operations must run in a worker thread (`pdfjs-dist` has built-in worker support)
3. **Canvas cleanup** — always call `URL.revokeObjectURL()` and `canvas.remove()` after use to prevent memory leaks
4. **Max file size gates** — enforce before processing: PDFs ≤ 100MB, images ≤ 20MB; show user-friendly error for violations
5. **Progress indicators** — any operation >500ms must show a progress indicator (spinner or progress bar)

### 5.3 Error Handling Patterns

```typescript
// Utility function error pattern
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function readPdfPages(file: File): Promise<Result<PdfPageItem[]>> {
  try {
    // ...
    return { ok: true, data: pages };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: `Failed to read PDF: ${msg}` };
  }
}
```

All utilities return `Result<T>` (never throw to the caller).  
UI components display errors via the existing toast system or inline `<ErrorBanner>`.

### 5.4 Accessibility (a11y)

- All interactive canvas elements must have `aria-label` and keyboard alternatives
- Crop editors: arrow keys to nudge crop box; `+`/`-` to zoom
- Sliders: `<input type="range">` with `aria-valuemin/max/now`
- Generated images: all `<img>` elements have descriptive `alt` text
- Color contrast: all UI text ≥ 4.5:1 contrast ratio

### 5.5 Testing Requirements

Each new utility must have a test file at `{utilPath}.test.ts`:

**Minimum test coverage per utility:**
- Happy path: expected input → expected output
- Edge case 1: boundary values (min/max inputs)
- Edge case 2: empty/null inputs
- Edge case 3: oversized input (should return error, not throw)

**Test command:** `npm run test` (Vitest — existing test runner)

---

## 6. Route Map

### Phase 8 — PDF Studio Routes

| Route | Component | Description |
|---|---|---|
| `/app/docs/pdf-studio` | `PdfStudioHub` | Tool landing page (grid of tool cards) |
| `/app/docs/pdf-studio/create` | `PdfStudioWorkspace` | Original image-to-PDF tool (moved) |
| `/app/docs/pdf-studio/merge` | `MergePdfWorkspace` | Merge multiple PDFs |
| `/app/docs/pdf-studio/split` | `SplitPdfWorkspace` | Split PDF by range/page/every-N |
| `/app/docs/pdf-studio/delete-pages` | `DeletePagesWorkspace` | Delete selected pages |
| `/app/docs/pdf-studio/organize` | `OrganizePagesWorkspace` | Reorder pages drag-and-drop |
| `/app/docs/pdf-studio/resize-pages` | `ResizePagesWorkspace` | Resize all pages to target size |
| `/app/docs/pdf-studio/fill-sign` | `FillSignWorkspace` | Fill forms + digital signature |
| `/app/docs/pdf-studio/protect` | `ProtectUnlockWorkspace` | Password protect / unlock |
| `/app/docs/pdf-studio/header-footer` | `HeaderFooterWorkspace` | Add header/footer text |
| `/app/docs/pdf-studio/pdf-to-image` | `PdfToImageWorkspace` | Export pages as JPEG/PNG |
| `/app/docs/pdf-studio/repair` | `RepairPdfWorkspace` | Attempt PDF repair |

### Phase 9 — SW Pixel Routes

| Route | Component | Description |
|---|---|---|
| `/app/pixel` | `PixelHub` | SW Pixel tool landing (replaces "Coming Soon") |
| `/app/pixel/passport` | `PassportPhotoWorkspace` | Passport photo maker |
| `/app/pixel/resize` | `ResizeCompressWorkspace` | Resize & compress images |
| `/app/pixel/adjust` | `BasicAdjustWorkspace` | Basic image adjustments |
| `/app/pixel/print-layout` | `PrintLayoutWorkspace` | Print sheet composer |
| `/app/pixel/label` | `LabelWorkspace` | Name/date text labelling |

---

## 7. Component Architecture

### 7.1 PDF Studio New Components Tree

```
src/features/docs/pdf-studio/
├── components/
│   ├── [existing components]
│   │
│   ├── pdf-studio-hub.tsx            NEW — tool cards landing
│   ├── pdf-tool-shell.tsx            NEW — shared tool wrapper
│   ├── pdf-page-thumbnail.tsx        NEW — shared page preview tile
│   ├── pdf-upload-zone.tsx           NEW — PDF-specific drop zone
│   ├── pdf-page-selection-grid.tsx   NEW — checkbox selection grid
│   │
│   ├── merge/
│   │   └── merge-pdf-workspace.tsx
│   ├── split/
│   │   ├── split-pdf-workspace.tsx
│   │   ├── split-mode-selector.tsx
│   │   └── page-range-input.tsx
│   ├── delete-pages/
│   │   └── delete-pages-workspace.tsx
│   ├── organize/
│   │   └── organize-pages-workspace.tsx
│   ├── resize-pages/
│   │   └── resize-pages-workspace.tsx
│   ├── fill-sign/
│   │   ├── fill-sign-workspace.tsx
│   │   ├── signature-canvas.tsx
│   │   ├── pdf-page-overlay.tsx
│   │   ├── text-annotation-layer.tsx
│   │   └── saved-signature-selector.tsx
│   ├── protect/
│   │   └── protect-unlock-workspace.tsx
│   ├── header-footer/
│   │   ├── header-footer-workspace.tsx
│   │   └── header-footer-panel.tsx
│   ├── pdf-to-image/
│   │   ├── pdf-to-image-workspace.tsx
│   │   └── page-image-grid.tsx
│   └── repair/
│       └── repair-pdf-workspace.tsx
│
└── utils/
    ├── [existing utils]
    ├── pdf-reader.ts         NEW
    ├── pdf-splitter.ts       NEW
    ├── zip-builder.ts        NEW
    ├── pdf-to-image.ts       NEW
    ├── header-footer-writer.ts NEW
    ├── signature.ts          NEW
    ├── annotation-writer.ts  NEW
    └── deskew.ts             NEW
```

### 7.2 SW Pixel Components Tree

```
src/features/pixel/
├── index.ts
├── data/
│   └── passport-presets.ts
├── hooks/
│   ├── use-image-adjustments.ts
│   ├── use-crop.ts
│   ├── use-image-history.ts
│   └── use-pixel-session.ts
├── components/
│   ├── pixel-hub.tsx
│   ├── pixel-tool-shell.tsx
│   ├── passport/
│   │   ├── PassportPhotoWorkspace.tsx
│   │   ├── PassportPresetSelector.tsx
│   │   ├── PassportCropEditor.tsx
│   │   ├── PassportAdjustPanel.tsx
│   │   ├── PassportNameDateOverlay.tsx
│   │   ├── PassportPreview.tsx
│   │   ├── PassportPrintSheet.tsx
│   │   └── PassportExportOptions.tsx
│   ├── resize/
│   │   ├── ResizeCompressWorkspace.tsx
│   │   ├── ResizeDimensionPanel.tsx
│   │   ├── CompressionPanel.tsx
│   │   └── BatchImageGrid.tsx
│   ├── adjust/
│   │   ├── BasicAdjustWorkspace.tsx
│   │   ├── AdjustmentSidebar.tsx
│   │   └── ImageCanvas.tsx
│   ├── print-layout/
│   │   └── PrintLayoutWorkspace.tsx
│   └── label/
│       ├── LabelWorkspace.tsx
│       └── TextLayerEditor.tsx
└── utils/
    ├── image-crop.ts
    ├── image-adjustments.ts
    ├── print-sheet.ts
    └── file-size-compress.ts
```

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target |
|---|---|
| PDF tool initial render | < 1 second (tools hub) |
| PDF page thumbnail generation | < 200ms per page |
| Merge 3 PDFs (10 pages each) | < 10 seconds |
| PDF-to-image (10 pages at 150 DPI) | < 15 seconds |
| Passport photo crop + adjust + export | < 3 seconds |
| Image resize (1 image, ≤ 20MP) | < 2 seconds |
| Batch resize (5 images) | < 10 seconds |
| JS bundle size increase | < 100KB gzipped total (Phase 8 + 9, excluding lazy-loaded WASM) |

### 8.2 Browser Support

| Browser | Minimum Version |
|---|---|
| Chrome | 110+ |
| Firefox | 115+ |
| Safari | 16+ |
| Edge | 110+ |
| iOS Safari | 16+ |
| Android Chrome | 110+ |

### 8.3 Security

- All PDF and image processing is client-side — no file bytes are sent to any server except: `/api/pdf/encrypt` (AES-256 encryption, already exists) and future server-assisted OCR
- Files are never stored on the server for these tools
- HEIC/HEIF conversion happens entirely in-browser via `libheif-js` WASM
- No user data (file contents, photos) is transmitted to analytics — only event metadata (tool name, page count, file size KB)

### 8.4 Accessibility

- All controls are keyboard-navigable
- Canvas-based tools have equivalent keyboard controls (arrow keys for nudge, Enter to confirm)
- Screen reader labels on all interactive elements
- Color is never the sole indicator of state (always paired with text/icon)

### 8.5 Internationalisation

- All UI strings use English for Phase 8/9
- No hardcoded measurement units — dimensions always shown in both mm and pixels
- Date field in SW Pixel respects the `navigator.language` locale for default format

---

## 9. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | `pdfjs-dist` WASM bundle too large for initial load | High | Medium | Always lazy-load; ship worker file as static asset; show "loading PDF tools..." indicator |
| R2 | Password-protected PDF unlock not possible with `pdf-lib` | Medium | Low | `pdf-lib` supports password-protected load; test against standard AES-128 and AES-256 PDFs early |
| R3 | Safari Canvas API limitations for complex pixel operations | Medium | Medium | Test on real iOS Safari early; use standard `getImageData` / `putImageData` (well-supported) |
| R4 | File size target compression loops too slowly for large images | Medium | Low | Cap iterations at 20; use binary search (not linear) for compression level; show live size estimate |
| R5 | HEIC from recent iOS (HEIC-Ultra) not decoded by `libheif-js` | Low | Medium | Test against HEIC-Ultra samples; fallback to `createImageBitmap()` (Safari 15+ native HEIC support) |
| R6 | `signature_pad` touch events conflict with scroll on mobile | Low | Low | Wrap pad in a scroll-locked container; prevent default on touch events within pad bounds |
| R7 | Print sheet PDF dimensions off by 1–2 pixels at 300 DPI | Medium | Medium | Use floating point mm-to-px math with 4 decimal places; add ±1px tolerance in acceptance tests |
| R8 | OCR language packs increase storage/bandwidth costs | Low | Low | Language packs are loaded from CDN on demand; never bundled |
| R9 | Deskew Hough algorithm false-detects angle on low-res scans | Medium | Low | Add confidence threshold; only apply if detected lines have >80% consensus; allow manual override always |
| R10 | AcroForm PDF fill: some PDFs use JavaScript actions incompatible with pdf-lib | Medium | Low | Detect presence of PDF JS actions; warn user; flatten output regardless |

---

## 10. QA & Acceptance Gates

### Phase 8 Gates

**Gate 8.1 (Sprint 8.1 complete):**
- [ ] PDF upload + thumbnail rendering works for PDFs with 1, 5, 25, and 50 pages
- [ ] Merge: test with 2 PDFs of different page sizes (A4 + Letter) → output has correct pages in order
- [ ] Split: range "1-3, 4-end" on a 7-page PDF → 2 output files of 3 and 4 pages
- [ ] Split every 2 pages on an 11-page PDF → 5 files of 2 pages + 1 file of 1 page
- [ ] Delete pages 2, 4 from a 5-page PDF → output has pages 1, 3, 5
- [ ] Organize: drag page 3 to position 1 → output starts with original page 3
- [ ] Resize: A4 PDF → US Letter output has correct dimensions (±0.5mm)
- [ ] All Sprint 8.1 tools return correct output as downloadable PDFs (manual QA)

**Gate 8.2 (Sprint 8.2 complete):**
- [ ] Fill & Sign: draw signature → place on page 1 → download → signature visible in Acrobat
- [ ] Fill & Sign: AcroForm text fields filled → downloaded PDF shows filled values
- [ ] Protect: set user password → downloaded PDF requires password in Acrobat
- [ ] Unlock: upload protected PDF with correct password → downloaded PDF opens without password
- [ ] Unlock: wrong password → clear error message, no crash
- [ ] Header/Footer: `{page}` / `{total}` tokens → correct values on all pages
- [ ] PDF-to-JPEG at 300 DPI → readable output, ≤ 3MB per page
- [ ] All tools tested on Chrome, Firefox, Safari (desktop)

**Gate 8.3 (Sprint 8.3 complete):**
- [ ] OCR: Arabic language pack loads on demand; correct Arabic text extracted from test image
- [ ] OCR confidence score displayed; confidence ≥ 85% shown in green
- [ ] Embedded text layer: output PDF searchable in browser PDF viewer (Ctrl+F finds extracted text)
- [ ] Deskew: 3° skew image corrected to ≤ 0.5° offset (measured with ruler tool in Preview/Acrobat)
- [ ] Repair: mildly corrupt PDF (truncated byte stream) repaired and downloadable
- [ ] PostHog events visible in dashboard for: tool_opened, generate_completed, download

### Phase 9 Gates

**Gate 9.1 (Sprint 9.1 complete):**
- [ ] Passport: UK preset (35×45 mm) → 300 DPI output = 413 × 531 px (±1px)
- [ ] Passport: US preset (51×51 mm / 2×2 in) → 300 DPI output = 600 × 600 px (±1px)
- [ ] Passport: HEIC photo from iPhone 14 processes without error
- [ ] Passport: print sheet A4 with 6 UK passport photos → downloadable high-res PDF
- [ ] Passport: name overlay text renders at bottom of photo without clipping
- [ ] Passport: B&W toggle → output is genuinely grayscale (R=G=B for all pixels)
- [ ] Resize: input 4000×3000 → output 800×600 → exact match
- [ ] Resize: file-size target 200KB → output ≤ 220KB (±10%)
- [ ] Batch resize 5 images → ZIP downloads with all 5 correctly sized files
- [ ] Adjust: undo/redo 10 operations in sequence without visual glitch
- [ ] Print layout: 5×7 photos on A4 → 2 photos with gutter, correct dimensions
- [ ] Label: drag text box to corner position → exports at correct position
- [ ] All tools tested on iPhone 13 (iOS 16), Pixel 7 (Android 14), MacBook Chrome

---

## Appendix A: PDF Studio Tools Hub Card Design

The tools hub (`/app/docs/pdf-studio`) should present all tools in a categorized card grid:

**Category: Page Organization**
- Create PDF (images to PDF) — icon: 📄 stack
- Merge PDFs — icon: ⊕ combine
- Split PDF — icon: ✂️ scissors
- Delete Pages — icon: 🗑 trash
- Organize Pages — icon: ⠿ grid
- Resize Pages — icon: ↔ scale

**Category: Edit & Enhance**
- Fill & Sign — icon: ✒️ pen
- Protect / Unlock — icon: 🔒 lock
- Header & Footer — icon: ≡ lines
- Watermark — icon: © stamp (existing, surfaced as a standalone card)
- Page Numbers — icon: # hash (existing, surfaced as a standalone card)

**Category: Convert & Export**
- PDF to Image — icon: 🖼 image
- Add OCR Text Layer — icon: T scan

**Category: Repair**
- Repair PDF — icon: 🔧 wrench

Each card shows: icon, title, 1-line description, and an arrow button.

---

## Appendix B: SW Pixel Hub Card Design

The SW Pixel hub (`/app/pixel`) presents 5 module cards:

1. **Passport Photo** — "Make passport, visa & ID photos in seconds" — 🪪
2. **Resize & Compress** — "Resize to exact dimensions or target file size" — 📐
3. **Basic Adjustments** — "Brightness, contrast, B&W and more" — 🎨
4. **Print Layout** — "Arrange photos for printing on A4 or Letter" — 🖨
5. **Name & Date Labels** — "Add text labels to any photo" — 🏷

---

## Appendix C: Navigation Updates

**Docs sidebar (`suite-nav-items.ts`) — add PDF Studio sub-navigation:**
```typescript
{
  label: "PDF Studio",
  href: "/app/docs/pdf-studio",
  icon: FileText,
  children: [
    { label: "Create PDF", href: "/app/docs/pdf-studio/create" },
    { label: "Merge", href: "/app/docs/pdf-studio/merge" },
    { label: "Split", href: "/app/docs/pdf-studio/split" },
    { label: "Organize", href: "/app/docs/pdf-studio/organize" },
    { label: "Fill & Sign", href: "/app/docs/pdf-studio/fill-sign" },
    { label: "Protect", href: "/app/docs/pdf-studio/protect" },
    { label: "PDF to Image", href: "/app/docs/pdf-studio/pdf-to-image" },
  ]
}
```

**SW Pixel nav — replace "Coming Soon" with sub-navigation:**
```typescript
{
  label: "SW> Pixel",
  href: "/app/pixel",
  icon: Camera,
  children: [
    { label: "Passport Photo", href: "/app/pixel/passport" },
    { label: "Resize & Compress", href: "/app/pixel/resize" },
    { label: "Basic Adjustments", href: "/app/pixel/adjust" },
    { label: "Print Layout", href: "/app/pixel/print-layout" },
    { label: "Name & Date Labels", href: "/app/pixel/label" },
  ]
}
```

---

*End of Phase 8 & Phase 9 PRD — Slipwise One*  
*Version 1.0 — Engineering Handover*
