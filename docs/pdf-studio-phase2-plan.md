# PDF Studio Phase 2 — Implementation Plan

> **Status:** Phase 1 Complete | **Branch:** `feature/pdf-studio-phase1` | **PR:** #28
> 
> **Context for Next AI:** Continue from Phase 1. Branch already pushed, PR open. Build, lint, and tests all passing.

---

## Phase 1 Completion Summary

### ✅ What's Live (Merged in PR #28)

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Route** | `/pdf-studio` — static page with metadata | ✅ |
| **Image Upload** | Multi-file, drag-drop zone, 30-image limit | ✅ |
| **File Formats** | JPG, JPEG, PNG, WEBP | ✅ |
| **Organizer** | DnD grid with `@dnd-kit`, rotate L/R, delete, clear all | ✅ |
| **Page Settings** | Size (A4/Letter), Orientation (Auto/Portrait/Landscape), Fit (Contain/Cover/Actual), Margins (None/Small/Medium/Large), Filename | ✅ |
| **Live Preview** | Multi-page preview with rotation + settings reflection | ✅ |
| **PDF Generation** | Client-side via `pdf-lib`, sequential processing, progress indicator | ✅ |
| **Download** | Auto-download with configured filename | ✅ |
| **Responsive** | Desktop sidebar nav + mobile tab nav | ✅ |
| **Marketing** | Homepage card, workspace dialog entry, 4-column grid | ✅ |

### Key Files (Phase 1)

```
src/features/pdf-studio/
├── types.ts                    # ImageItem, PageSettings, etc.
├── constants.ts                # Defaults, limits, dimensions
├── utils/
│   ├── image-processor.ts      # Canvas rotation, placement calc
│   └── pdf-generator.ts        # pdf-lib integration, download
└── components/
    ├── image-thumbnail.tsx     # Individual thumbnail UI
    ├── image-organizer.tsx     # DnD grid container
    ├── page-settings-panel.tsx # Settings form
    ├── pdf-preview.tsx         # Live preview pages
    └── pdf-studio-workspace.tsx # Main workspace shell

src/app/pdf-studio/page.tsx     # Route entry
src/lib/modules.ts              # Added pdf-studio to registry
src/components/foundation/module-card.tsx  # PdfStudioIcon
src/components/marketing/slipwise-home.tsx # Homepage integration
```

### Dependencies Added
```bash
npm install pdf-lib @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Phase 2 Scope (Locked)

### 🎯 Primary Goals
1. **HEIC/HEIF Support** — Handle iPhone photos directly
2. **Image Cropping** — Pre-process images before PDF inclusion
3. **OCR Layer** — Extract searchable text from images
4. **Advanced PDF Options** — Compression, metadata, encryption
5. **Session Persistence** — Save/restore work via localStorage
6. **Batch Operations** — Multi-select delete, reorder shortcuts

---

## Detailed Feature Breakdown

### 1. HEIC/HEIF Support

**Problem:** iPhone photos default to HEIC which browsers can't decode natively.

**Solution Options:**
- **Option A:** `libheif-js` — WASM-based HEIC decoder, heavy (~2MB)
- **Option B:** Server-side conversion API — Upload HEIC, get back JPEG
- **Option C:** User-side conversion dialog — "HEIC detected, convert to JPEG first?"

**Recommended:** Option A with lazy loading. Add `libheif-js` as dynamic import only when HEIC files detected.

**Files to modify:**
- `src/features/pdf-studio/utils/image-processor.ts` — Add `convertHeicToJpeg()`
- `src/features/pdf-studio/constants.ts` — Add HEIC to supported formats
- `src/features/pdf-studio/components/image-organizer.tsx` — Detect HEIC, show conversion UI

---

### 2. Image Cropping Tool

**Requirements:**
- Click thumbnail → opens crop modal
- Fixed aspect ratio (match page settings) or free crop
- Rotate + crop combination
- Preview before confirm

**Implementation:**
- Use `react-cropper` or `react-image-crop` — both are lightweight and popular
- Store crop data on `ImageItem` type: `{ x, y, width, height }`
- Apply crop during PDF generation (canvas `drawImage` with source rect)

**New Files:**
- `src/features/pdf-studio/components/image-cropper-modal.tsx`
- `src/features/pdf-studio/utils/crop-helpers.ts`

**Modify:**
- `types.ts` — Add `crop?: { x, y, width, height }` to `ImageItem`
- `image-thumbnail.tsx` — Add crop button
- `pdf-generator.ts` — Apply crop rect when embedding images

---

### 3. OCR Text Layer

**Requirements:**
- Make generated PDF searchable
- Extract text from images using Tesseract.js
- Add hidden text layer beneath images in PDF

**Implementation:**
- `tesseract.js` — Pure JS OCR, no server needed
- Process OCR after image upload (background)
- Store `ocrText?: string` on `ImageItem`
- During PDF generation: embed invisible text at calculated positions

**New Files:**
- `src/features/pdf-studio/utils/ocr-processor.ts`
- `src/features/pdf-studio/components/ocr-progress-panel.tsx`

**Modify:**
- `types.ts` — Add OCR fields to `ImageItem`
- `image-organizer.tsx` — Trigger OCR after upload
- `pdf-generator.ts` — Add text layer generation

**Note:** OCR is CPU-intensive. Add toggle "Enable searchable PDF" (default: off) and progress indicator.

---

### 4. Advanced PDF Options

**New Settings to Add:**
- **Compression:** JPEG quality (10-100), downsampling (DPI target)
- **Metadata:** Title, Author, Subject, Keywords
- **Security:** Password protection (owner + user passwords), permissions
- **Page Numbers:** Auto-add "Page X of Y" footer
- **Watermark:** Text or image watermark (optional)

**UI Location:** New "Advanced" section in `page-settings-panel.tsx` or separate `advanced-settings-panel.tsx`

**Implementation:**
- `pdf-lib` supports all of these — see `PDFDocument.setTitle()`, `encrypt()`, `embedPage()` for watermark
- Add to `PageSettings` type with optional fields

---

### 5. Session Persistence

**Requirements:**
- Save current work to localStorage
- Restore on page reload
- Optional: named sessions, session list

**Implementation:**
- Serialize `images` (as base64 data URLs) + `settings` to localStorage
- Key: `pdf-studio-session-v1`
- Debounced auto-save (every 5 seconds)
- Session size limit: ~5MB (localStorage limit awareness)

**New Files:**
- `src/features/pdf-studio/utils/session-storage.ts`
- `src/features/pdf-studio/components/session-manager.tsx` — Load/save/clear sessions

**Modify:**
- `pdf-studio-workspace.tsx` — Load session on mount, auto-save on change

**Note:** Images stored as base64 can be large. Consider IndexedDB for larger storage (`idb` package).

---

### 6. Batch Operations & UX Enhancements

**Features:**
- Multi-select mode (Shift/Cmd+click thumbnails)
- Batch delete selected
- Batch rotate selected
- Keyboard shortcuts: `Delete` (remove), `←/→` (rotate), `Cmd+A` (select all)
- Undo/Redo stack (simple command pattern)

**Implementation:**
- Add `selectedIds: string[]` to workspace state
- Add selection mode toggle
- Track history stack: `ImageItem[][]` with index pointer

**Modify:**
- `image-thumbnail.tsx` — Selection checkbox, highlight state
- `image-organizer.tsx` — Multi-select handlers, batch action bar
- `pdf-studio-workspace.tsx` — Keyboard listeners, undo/redo buttons

---

## Technical Architecture (Phase 2)

### New Dependencies to Add

```bash
# HEIC support
npm install libheif-js

# Cropping
npm install react-image-crop

# OCR
npm install tesseract.js

# Storage (optional, for large sessions)
npm install idb
```

### State Management Expansion

```typescript
// types.ts additions
export type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  rotation: ImageRotation;
  name: string;
  sizeBytes: number;
  // Phase 2 additions:
  crop?: { x: number; y: number; width: number; height: number };
  ocrText?: string;
  ocrStatus: 'pending' | 'processing' | 'complete' | 'error';
};

export type PageSettings = {
  size: PageSize;
  orientation: PageOrientation;
  fitMode: FitMode;
  margins: MarginSize;
  filename: string;
  // Phase 2 additions:
  compressionQuality: number; // 10-100
  pdfMetadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  };
  password?: string;
  watermark?: {
    type: 'text' | 'image';
    content: string;
    opacity: number;
  };
};

// New type for session management
export type PdfStudioSession = {
  id: string;
  name: string;
  images: ImageItem[];
  settings: PageSettings;
  createdAt: Date;
  updatedAt: Date;
};
```

---

## Implementation Roadmap (Suggested Order)

### Sprint 1: Foundation
1. **Session Persistence** — Quick win, immediate user value
2. **Batch Operations** — Multi-select, keyboard shortcuts, undo/redo
3. **Advanced PDF Settings** — Compression, metadata UI (no backend needed)

### Sprint 2: Processing
4. **Image Cropping** — Modal, crop helpers, PDF integration
5. **HEIC Support** — libheif-js integration, conversion UI
6. **OCR** — Tesseract.js, text layer in PDF

### Sprint 3: Polish
7. **Watermarking** — Text/image overlay in PDF
8. **Page Numbers** — Auto footer generation
9. **Password Protection** — PDF encryption UI
10. **Session Manager** — Named sessions, import/export

---

## Testing Strategy

### Unit Tests
- `image-processor.test.ts` — Crop application, HEIC conversion
- `pdf-generator.test.ts` — Metadata embedding, encryption
- `session-storage.test.ts` — Save/load roundtrip
- `ocr-processor.test.ts` — Text extraction accuracy

### E2E Tests (Playwright)
- Crop flow: open cropper, adjust, apply, verify preview
- Session persistence: reload page, verify restoration
- OCR flow: upload image, enable OCR, generate, verify text layer
- HEIC flow: upload .heic, convert, add to PDF

### Manual QA
- 50+ images with cropping
- iPhone HEIC files
- Large images (10MB+ each)
- OCR on handwritten vs printed text

---

## File Structure (Phase 2 Target)

```
src/features/pdf-studio/
├── types.ts
├── constants.ts
├── schema.ts                    # NEW: Zod schemas for validation
├── utils/
│   ├── image-processor.ts
│   ├── pdf-generator.ts
│   ├── crop-helpers.ts          # NEW
│   ├── ocr-processor.ts         # NEW
│   ├── heic-converter.ts        # NEW
│   ├── session-storage.ts       # NEW
│   └── watermark-helpers.ts     # NEW
├── hooks/
│   ├── use-session.ts           # NEW
│   ├── use-undo-redo.ts         # NEW
│   └── use-ocr.ts               # NEW
└── components/
    ├── image-thumbnail.tsx
    ├── image-organizer.tsx
    ├── page-settings-panel.tsx
    ├── pdf-preview.tsx
    ├── pdf-studio-workspace.tsx
    ├── image-cropper-modal.tsx  # NEW
    ├── session-manager.tsx      # NEW
    ├── advanced-settings.tsx    # NEW
    ├── ocr-progress-panel.tsx   # NEW
    └── batch-action-bar.tsx     # NEW
```

---

## Edge Cases & Considerations

| Scenario | Mitigation |
|----------|------------|
| HEIC lib 2MB+ bundle | Dynamic import, load only when needed |
| OCR on 30 large images | Process in background, queue per image |
| localStorage 5MB limit | Use IndexedDB, warn on large sessions |
| Crop then rotate | Apply crop first, then rotate final image |
| Password-protected PDF | Ensure `pdf-lib` encryption options, test unlock |
| iOS Safari HEIC | May need user education + manual conversion fallback |

---

## Success Criteria (Phase 2)

- [ ] HEIC files convert and include in PDF
- [ ] Users can crop images before PDF inclusion
- [ ] Generated PDFs have searchable OCR text layer (optional toggle)
- [ ] PDF compression controls work (file size reduction visible)
- [ ] Sessions persist across browser restarts
- [ ] Batch multi-select operations work
- [ ] Undo/redo available for all destructive actions
- [ ] All existing Phase 1 tests still pass
- [ ] New features have E2E coverage

---

## Quick Start for Next AI

1. **Checkout branch:**
   ```bash
   git checkout feature/pdf-studio-phase1
   git pull origin feature/pdf-studio-phase1
   ```

2. **Install new dependencies:**
   ```bash
   npm install libheif-js react-image-crop tesseract.js
   ```

3. **Start with Session Persistence** — lowest complexity, highest user value

4. **Run verification after each feature:**
   ```bash
   npm run lint
   npm run test
   npm run build
   ```

5. **Commit incrementally:** One feature per commit

---

## References

- **PRD Document:** `/docs/PDF studio/Slipwise Phase 1 Product Requirements Document (PRD).docx`
- **Phase 1 PR:** https://github.com/Fenar7/PaySlip_Generator/pull/28
- **pdf-lib docs:** https://pdf-lib.js.org/docs/api/
- **tesseract.js:** https://github.com/naptha/tesseract.js
- **react-image-crop:** https://github.com/securingsincity/react-image-crop
- **libheif-js:** https://github.com/catdad-experiments/libheif-js

---

**Created:** March 31, 2026  
**Phase 1 Status:** ✅ Complete, PR #28 open  
**Next Action:** Begin Phase 2 Sprint 1 (Session Persistence)
