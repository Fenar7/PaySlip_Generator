# PDF Studio Phase 2 – Slices 6 & 7: Engineering Implementation Plan

## Overview
This document details the engineering plan for implementing Slices 6 (Watermarking) and 7 (Page Numbers) of PDF Studio Phase 2. It is designed for handoff to another AI agent or developer, with clear steps, file references, and subagent utilization for efficiency.

---

## 1. Branching Strategy
- **Branch Name:** `feature/pdf-studio-slices-6-7`
- Start from the latest `feature/pdf-studio-slice-4-5` or main phase2 branch.
- All work for Slices 6 & 7 should be committed to this branch.

---

## 2. Slice 6: Watermarking
### 2.1 UI Implementation
- **File:** `src/components/watermark-settings-panel.tsx` (new)
  - Build UI for watermark type (none/text/image), text/image options, position, rotation, opacity, scope (all/first page).
- **File:** `src/components/preview-panel.tsx`
  - Integrate live preview overlay for watermark (text/image) using CSS transforms and opacity.
- **File:** `src/state/pdfSettings.ts` (or relevant state file)
  - Add `WatermarkSettings` interface and state management.

### 2.2 PDF Generation Logic
- **File:** `src/pdf/pdf-generator.ts`
  - Implement `applyWatermark(page, watermark, pageIndex, totalPages)` as per PRD.
  - Handle text/image watermark, position, rotation, opacity, scaling, and scope.
  - Edge cases: long text, large images, 0% opacity, rotation overflow.

### 2.3 Testing & QA
- **File:** `tests/watermarking.test.ts` (new or update existing)
  - Test all watermark options, edge cases, and PDF output.
- Manual QA: Verify live preview, exported PDF, and UI responsiveness.

---

## 3. Slice 7: Page Numbers
### 3.1 UI Implementation
- **File:** `src/components/page-settings-panel.tsx`
  - Ensure page number controls (toggle, position, format, start from, skip first) are present and bind to state.
- **File:** `src/state/pdfSettings.ts`
  - Add/verify `PageNumberSettings` interface and state.

### 3.2 PDF Generation Logic
- **File:** `src/pdf/pdf-generator.ts`
  - Complete/verify page numbering logic for all formats and positions.
  - Handle skip first page, start offset, and reordering.

### 3.3 Testing & QA
- **File:** `tests/page-numbers.test.ts` (new or update existing)
  - Test all page number options, edge cases, and PDF output.
- Manual QA: Verify UI, preview, and exported PDF.

---

## 4. Subagent Utilization
- Use subagents for:
  - UI implementation (React/TSX components)
  - State management (TypeScript interfaces, Redux/Zustand/etc.)
  - PDF logic (TypeScript, pdf-lib)
  - Automated testing (Jest/Vitest)
  - Manual QA checklists
- Assign subagents to work in parallel on UI, logic, and tests for both slices.

---

## 5. Handoff & PR
- Ensure all acceptance criteria from PRD are met.
- Run all tests and QA checklists.
- Prepare a PR to merge `feature/pdf-studio-slices-6-7` into the main/phase2 branch.
- Include this plan in the PR description for reviewer context.

---

## 6. References
- PRD: `docs/pdf-studio-phase2-slices-6-9-prd.md`
- Previous handoff: `docs/pdf-studio-phase2-slice5-handoff.md`
- Design system: Refer to existing components in `src/components/`

---

## 7. Task Breakdown (for subagents)
- [ ] Create/verify UI for watermarking and page numbers
- [ ] Implement/verify state management for both features
- [ ] Implement/verify PDF generation logic for both features
- [ ] Write/verify automated tests
- [ ] Manual QA and edge case validation
- [ ] Prepare PR and documentation

---

**Dependencies:** Complete Slice 6 before finalizing Slice 7. Use subagents for parallel work where possible.
