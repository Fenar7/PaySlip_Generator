# PDF Studio OCR Reliability PRD

**Project:** PDF Studio  
**Repository:** `payslip-generator`  
**Status:** Proposed / Engineering handoff ready  
**Date:** 2026-04-02  
**Audience:** Engineering, QA, product, future AI/code agents

---

## 1. Executive Summary

PDF Studio currently exposes an OCR-based “searchable PDF” feature, but the feature is not reliable enough to be considered production-ready.

The OCR pipeline exists end to end:

- images are uploaded
- OCR is triggered in the browser
- OCR text is stored on each image item
- export can embed invisible OCR text into the PDF when `Enable searchable PDF (OCR)` is on

However, the implementation has multiple correctness and reliability gaps:

- OCR initialization has failed in the browser with `Failed to resolve module specifier 'tesseract.js'`
- there is no robust OCR-specific validation/test matrix
- OCR quality and failure handling are weak
- searchable PDF behavior is “wired” but not proven reliable
- the current text embedding strategy is minimal and not sufficient to claim a polished OCR experience

This PRD defines the recovery plan for making OCR reliable, testable, and product-safe.

### Recommendation

Use a **browser-first OCR architecture** for the first recovery release, but structure the implementation so a **server fallback** can be added later if browser OCR remains unreliable or too slow.

Language scope for the first stabilized release:

- **English only**

---

## 2. Current State

### Current implementation points

Relevant files in the repo today:

- `src/features/pdf-studio/utils/ocr-processor.ts`
- `src/features/pdf-studio/components/image-organizer.tsx`
- `src/features/pdf-studio/components/ocr-progress-panel.tsx`
- `src/features/pdf-studio/utils/pdf-generator.ts`
- `src/features/pdf-studio/components/page-settings-panel.tsx`
- `src/features/pdf-studio/types.ts`

### Current OCR flow

Current high-level flow:

1. user uploads an image
2. image is added to the organizer
3. OCR starts in the background
4. OCR result is stored on the image item as `ocrText`
5. if searchable PDF is enabled during export, the generator embeds invisible OCR text into the PDF

### Confirmed issues

From repo inspection and observed runtime behavior:

1. **Browser import/runtime instability**
   - OCR has failed with `Failed to resolve module specifier 'tesseract.js'`
   - OCR initialization is not robust enough

2. **Weak observability**
   - OCR status exists, but user-facing error handling is limited
   - there is no clear “OCR unavailable” state

3. **No real OCR test coverage**
   - OCR feature has effectively no end-to-end validation
   - there are no meaningful quality/reliability tests for OCR behavior

4. **Minimal searchable-PDF embedding**
   - OCR text is embedded as a single invisible text block per page
   - this is sufficient for a basic searchability path, but not enough for strong OCR fidelity claims

5. **No explicit quality standards**
   - there is no defined accuracy target
   - there is no agreed fallback behavior for poor OCR quality

---

## 3. Problem Statement

The OCR feature is currently in a partially implemented state:

- it may fail during initialization
- it may fail silently or opaquely from the user’s perspective
- it is not adequately verified
- it does not have clear quality or reliability expectations

As a result, “Enable searchable PDF (OCR)” cannot be trusted as a production feature today.

The goal is not just to “make OCR run”, but to make OCR:

- reliable
- observable
- testable
- product-safe
- accurate enough for real use

---

## 4. Product Goals

### Primary goal

Make the searchable PDF OCR feature reliably work for English-language image uploads in PDF Studio.

### Secondary goals

- make OCR failures visible and understandable
- keep OCR export behavior deterministic
- establish a testable OCR pipeline
- preserve the current PDF Studio export flow
- keep architecture open for a future server fallback

### Non-goals

This phase does **not** include:

- perfect text positioning reconstruction
- multi-language OCR in v1
- handwriting OCR optimization
- table structure extraction
- semantic document understanding
- replacing the full PDF export pipeline

---

## 5. User-Facing Requirements

### Functional requirements

When users upload images:

- OCR should run reliably in the browser for supported images
- OCR text should be stored against each processed image
- the user should be able to generate a searchable PDF when OCR is enabled

When OCR is enabled during export:

- images with valid OCR text should contribute searchable text to the PDF
- images without OCR text should not break export
- export should still succeed, but the user should have visibility into incomplete OCR coverage

### UX requirements

The product must clearly communicate:

- when OCR is processing
- when OCR completed
- when OCR failed
- when OCR is unavailable in the current runtime

The OCR toggle should not mislead users into assuming full OCR coverage if OCR has failed on some or all images.

### Quality expectations

For the first stable release:

- OCR should be reliable for clean English text in common image uploads
- OCR quality should be “good enough for searchability”, even if not layout-perfect
- OCR must not degrade the main export experience into frequent failures

---

## 6. Recommended Architecture

## 6.1 Decision

Use a **browser-first OCR service** with a clear abstraction boundary that supports a future server fallback.

### Why browser-first

- it fits the current PDF Studio architecture
- it preserves the current privacy story for local processing
- it avoids introducing server OCR infrastructure immediately
- it keeps the first recovery release smaller and faster

### Why fallback-ready

Browser OCR may still be insufficient on:

- lower-memory devices
- very large images
- slower browsers
- mobile scenarios

The implementation should therefore be structured so a future fallback path can be added without rewriting the UI or export logic.

## 6.2 Required service boundary

OCR must be isolated behind a dedicated service module.

Recommended conceptual contract:

```ts
type OcrResult = {
  text: string;
  status: "complete";
};

type OcrFailure = {
  status: "error";
  code: string;
  message: string;
};

runOcr(image: File | Blob): Promise<OcrResult>
```

Internally, this service may later route to:

- browser OCR
- server OCR
- fallback mode

The UI should not care which backend produced the OCR.

---

## 7. OCR Pipeline Specification

## 7.1 Ingestion and processing

OCR should run against the original uploaded image file or converted HEIC/JPEG file, not against low-resolution preview derivatives.

Required steps:

1. user uploads image
2. image is normalized to a browser-usable file/blob if needed
3. OCR service processes the file/blob
4. OCR text is normalized and stored
5. image OCR status is updated in state

### State model

The image item should continue to carry OCR-related state, but the semantics must be tightened:

- `ocrStatus: "pending" | "processing" | "complete" | "error"`
- `ocrText?: string`
- recommended addition:
  - `ocrErrorMessage?: string`

### Processing rules

- OCR must not start multiple concurrent runs for the same image unless explicitly retried
- OCR failures must set a stable error state
- OCR completion must trim and normalize extracted text
- empty OCR text should not automatically count as successful searchable content

Recommended normalization:

- trim whitespace
- collapse repeated whitespace/newlines where appropriate
- reject outputs that are empty after normalization

---

## 8. Searchable PDF Generation Specification

Current export behavior adds OCR text invisibly to the page when:

- `settings.enableOcr === true`
- `item.ocrText` exists

That basic structure can remain in this phase, but it must be treated as a **searchability implementation**, not a layout-accurate OCR layer.

### Required export rules

- if OCR is enabled and `ocrText` exists, include invisible text in the PDF
- if OCR is enabled and `ocrText` is missing for some images, export still succeeds
- if OCR is disabled, do not embed OCR text even if it exists in memory

### Required product wording

The feature should be positioned as:

- “searchable PDF”

It should **not** be described as:

- “perfectly selectable text layer”
- “accurate layout reconstruction”

### Out of scope for this phase

Do not attempt:

- bounding-box-per-word placement
- line-level text placement matching original image geometry
- OCR text block segmentation

Those are later enhancements.

---

## 9. UX and Status Design

## 9.1 OCR progress panel

The existing OCR progress panel should remain, but behavior must be tightened.

Required display states:

- processing count
- completed count
- error count
- unavailable/runtime initialization error when OCR service cannot start

### Recommended enhancement

Show a lightweight message near the OCR toggle:

- `English OCR runs locally in your browser. Large images may take longer.`

## 9.2 Retry behavior

Recommended for this phase:

- add per-image OCR retry action if OCR failed

If per-image retry is not implemented in this phase, the team must at minimum ensure:

- OCR failure state is visible
- retry strategy is explicitly documented as follow-up work

## 9.3 Toggle semantics

The OCR toggle currently controls whether OCR text is embedded into the PDF, not whether OCR processing occurs.

This distinction must be made explicit in implementation and docs.

Recommended v1 behavior:

- keep OCR processing at upload time
- use the toggle only to control searchable-text inclusion at export

Alternative lazy OCR-on-demand processing is intentionally deferred for now.

---

## 10. Engineering Plan

## Phase 0: Audit and baseline

Objective:

- establish the real current OCR behavior and failure modes

Tasks:

- verify OCR runtime load path in the current browser build
- verify worker startup behavior
- verify OCR state transitions in UI
- verify searchable text appears in exported PDFs when OCR text exists
- collect a baseline test image set

Deliverable:

- documented baseline of what currently works and what fails

## Phase 1: OCR service stabilization

Objective:

- make browser OCR initialize and run reliably

Tasks:

- move OCR behind a dedicated service wrapper
- use a supported loading pattern for `tesseract.js`
- normalize OCR errors into stable product-safe messages
- define worker lifecycle explicitly
- prevent duplicate OCR runs for the same image

Deliverable:

- OCR starts reliably and failures are deterministic

## Phase 2: OCR state and UX hardening

Objective:

- make OCR processing visible and understandable to the user

Tasks:

- ensure consistent OCR status transitions
- store normalized OCR text only when meaningful
- expose error states clearly in the progress panel
- optionally add per-image retry

Deliverable:

- OCR status is understandable and actionable

## Phase 3: Export-path verification

Objective:

- ensure OCR results actually make the exported PDF searchable

Tasks:

- verify OCR text embedding in `pdf-generator.ts`
- prevent empty/noisy OCR payloads from being embedded
- verify exports with mixed OCR success/failure states

Deliverable:

- searchable-PDF path is reliable and deterministic

## Phase 4: Testing and QA hardening

Objective:

- make OCR safe to ship

Tasks:

- add OCR service unit tests
- add OCR state integration tests
- add export-path OCR tests
- define and run manual QA matrix

Deliverable:

- OCR is covered by meaningful automated and manual validation

## Phase 5: Fallback readiness

Objective:

- future-proof the OCR architecture

Tasks:

- keep OCR service interface backend-agnostic
- document future server-fallback insertion point

Deliverable:

- no UI rewrite needed if server OCR becomes necessary later

---

## 11. Test Plan

## 11.1 Unit tests

Add tests for:

- OCR service loads correctly
- OCR initialization errors are normalized
- OCR recognition failures are normalized
- OCR text normalization trims/cleans output
- duplicate OCR runs are prevented or serialized correctly

## 11.2 Integration tests

Add tests for:

- upload image -> OCR status becomes `processing`
- successful OCR -> `ocrText` stored and status becomes `complete`
- failed OCR -> status becomes `error`
- export with OCR enabled and available text -> text path included
- export with OCR enabled but missing text -> export still succeeds

## 11.3 Manual QA matrix

Test at minimum:

- clean English document screenshot
- mobile photo of printed text
- noisy/low-contrast image
- multiple-image batch
- HEIC-converted image

Verify:

- OCR starts
- OCR completes or fails visibly
- searchable PDF output is actually searchable in a PDF viewer
- export remains stable even when some OCR runs fail

---

## 12. Acceptance Criteria

The OCR feature is ready for release only when all of the following are true:

1. OCR initializes reliably in supported browsers
2. OCR processing no longer fails due to module loading/runtime import issues
3. OCR status transitions are visible and deterministic
4. OCR failures are user-visible and product-safe
5. Searchable PDF export actually embeds OCR text when available
6. OCR-enabled export still succeeds even if some images fail OCR
7. Automated OCR tests exist and pass
8. Manual QA confirms real searchable-PDF output for the English baseline dataset

---

## 13. Risks and Mitigations

### Risk: Browser OCR performance is inconsistent

Mitigation:

- browser-first architecture with future fallback-ready service boundary

### Risk: OCR quality is poor on low-quality images

Mitigation:

- define product scope as “searchability” rather than perfect extraction
- use QA image matrix

### Risk: OCR processing increases perceived latency

Mitigation:

- run OCR in background after upload
- surface progress clearly
- consider retry/fallback only after stabilization

### Risk: Searchable export path is technically working but still poor UX

Mitigation:

- make success/error coverage visible
- ensure users know OCR may be partial on some images

---

## 14. Final Recommendation

Treat OCR as a feature recovery project, not a small bugfix.

The team should first stabilize:

- OCR runtime loading
- worker lifecycle
- state transitions
- searchable export behavior

Only after that should the team invest in:

- OCR quality improvements
- better text-layer positioning
- multi-language support
- server fallback

---

## 15. Definition of Done

This work is done only when:

- OCR starts reliably
- OCR failures are understandable
- OCR results are stored correctly
- searchable PDF export works predictably
- automated and manual verification prove the feature is usable

