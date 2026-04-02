# PDF Studio Phase 2 Slices 6-9 Product Requirements Document (PRD)

**Feature Module:** PDF Studio - Advanced PDF Options  
**Module Type:** Phase 2 Extension  
**Status:** Ready for Engineering Implementation  
**Version:** 1.0  
**Date:** April 2026  

---

## Table of Contents

1. [Document Purpose](#1-document-purpose)
2. [Executive Summary](#2-executive-summary)
3. [Phase 2 Context](#3-phase-2-context)
4. [Slice 6: Watermarking](#4-slice-6-watermarking)
5. [Slice 7: Page Numbers](#5-slice-7-page-numbers)
6. [Slice 8: Password Protection](#6-slice-8-password-protection)
7. [Slice 9: Compression & Metadata](#7-slice-9-compression--metadata)
8. [Technical Architecture](#8-technical-architecture)
9. [UI/UX Specifications](#9-uiux-specifications)
10. [Implementation Order](#10-implementation-order)
11. [Testing & QA Requirements](#11-testing--qa-requirements)
12. [Acceptance Criteria](#12-acceptance-criteria)
13. [Engineering Handoff](#13-engineering-handoff)

---

## 1. Document Purpose

This PRD defines the complete product, technical, and implementation requirements for completing PDF Studio Phase 2. It covers the remaining 4 slices (6-9) that add advanced PDF options:

- Watermarking (text and image)
- Page Numbers
- Password Protection with encryption
- Compression & Metadata

This document enables the engineering team to implement these features without ambiguity.

---

## 2. Executive Summary

### Scope

| Item | Detail |
|------|--------|
| **Module** | PDF Studio - Advanced PDF Options |
| **Slices** | 4 (6, 7, 8, 9) |
| **Features** | Watermarking, Page Numbers, Password Protection, Compression & Metadata |
| **Timeline** | 3-5 days |
| **Complexity** | Moderate to High |
| **Dependencies** | Existing Phase 1 + Phase 2 Slices 1-5 |

### Success Criteria

Phase 2 is complete when users can:
- Add text or image watermarks to their PDFs
- See watermarks in live preview
- Add automatic page numbering
- Password-protect PDFs with encryption
- Set compression levels
- Embed metadata (title, author, subject, keywords)

---

## 3. Phase 2 Context

### Already Completed (Slices 1-5)

- ✅ Slice 1: Session Persistence
- ✅ Slice 2: Batch Operations & UX Enhancements
- ✅ Slice 3: Image Cropping
- ✅ Slice 4: HEIC/HEIF Support
- ✅ Slice 5: OCR Text Layer

### Current State

- Branch: `feature/pdf-studio-slice-4-5`
- Codebase: Production-ready for Slices 1-5
- UI Framework: Established with existing design system

### What's Missing

The advanced PDF generation options that professional users expect:
- Brand protection (watermarks)
- Document organization (page numbers)
- Security (password protection)
- File optimization (compression)
- Document identification (metadata)

---

## 4. Slice 6: Watermarking

### 4.1 Purpose

Allow users to add visible watermarks to their PDFs for branding, copyright protection, or document identification.

### 4.2 Requirements

#### Watermark Types

| Type | Description |
|------|-------------|
| **Text Watermark** | Custom text with font styling |
| **Image Watermark** | Logo or image overlay |
| **None** | No watermark (default) |

#### Text Watermark Options

| Option | Values | Default |
|--------|--------|---------|
| Content | Any text | "Confidential" |
| Font Size | 12px - 72px | 24px |
| Color | Hex color picker | #999999 |
| Opacity | 0% - 100% | 50% |
| Position | 9-position grid | Center |
| Rotation | 0° - 360° | 0° |

#### Image Watermark Options

| Option | Values | Default |
|--------|--------|---------|
| Image File | PNG, JPG, WEBP | None |
| Scale | 10% - 100% | 30% |
| Opacity | 0% - 100% | 50% |
| Position | 9-position grid | Bottom-right |
| Rotation | 0° - 360° | 0° |

#### Position Grid (3x3)

```
┌─────────┬─────────┬─────────┐
│ TL      │ TC      │ TR      │
├─────────┼─────────┼─────────┤
│ CL      │ CC      │ CR      │
├─────────┼─────────┼─────────┤
│ BL      │ BC      │ BR      │
└─────────┴─────────┴─────────┘
```

Legend: TL=Top-Left, TC=Top-Center, TR=Top-Right, CL=Center-Left, CC=Center, CR=Center-Right, BL=Bottom-Left, BC=Bottom-Center, BR=Bottom-Right

#### Scope Options

| Option | Description |
|--------|-------------|
| **All Pages** | Watermark appears on every page |
| **First Page Only** | Watermark only on page 1 |

### 4.3 UI Components

**New Component:** `watermark-settings-panel.tsx`

Layout:
```
┌─────────────────────────────────────┐
│ Watermark                           │
│ ○ None  ● Text  ○ Image            │
├─────────────────────────────────────┤
│ [Text Content Input    ]            │
│ Font Size: [────●────] 24px         │
│ Color: [#999999 ▼]                  │
│ Opacity: [───●─────] 50%            │
│                                     │
│ Position:                           │
│ [TL] [TC] [TR]                     │
│ [CL] [CC] [CR]                     │
│ [BL] [BC] [BR]                     │
│                                     │
│ Rotation: [────●────] 0°            │
│                                     │
│ Apply to: ● All Pages ○ First Only  │
└─────────────────────────────────────┘
```

When **Image** selected:
- Replace text/content input with file upload
- Show image preview thumbnail
- Show scale slider instead of font size

### 4.4 Live Preview Requirement

**Critical:** Watermark must appear in the live preview panel.

Preview behavior:
- Update immediately when watermark settings change
- Show watermark overlay on preview pages
- Respect opacity and rotation settings in preview
- Match final PDF appearance closely

Implementation approach:
- Render watermark as HTML overlay on preview canvas/image
- Use CSS transforms for rotation
- Use CSS opacity for transparency

### 4.5 Technical Implementation

#### State Interface

```typescript
interface WatermarkSettings {
  enabled: boolean;
  type: 'none' | 'text' | 'image';
  text?: {
    content: string;
    fontSize: number;
    color: string;
    opacity: number;
  };
  image?: {
    file?: File;
    previewUrl?: string;
    scale: number;
    opacity: number;
  };
  position: WatermarkPosition;
  rotation: number;
  scope: 'all' | 'first';
}

type WatermarkPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';
```

#### PDF Generation

```typescript
// In pdf-generator.ts
async function applyWatermark(
  page: PDFPage,
  watermark: WatermarkSettings,
  pageIndex: number,
  totalPages: number
): Promise<void> {
  if (!watermark.enabled || watermark.type === 'none') return;
  
  // Check scope
  if (watermark.scope === 'first' && pageIndex !== 0) return;
  
  const position = calculatePosition(
    page.getSize(),
    watermark.position,
    watermark.type === 'text' ? estimateTextSize() : await getImageSize()
  );
  
  if (watermark.type === 'text' && watermark.text) {
    page.drawText(watermark.text.content, {
      x: position.x,
      y: position.y,
      size: watermark.text.fontSize,
      color: hexToRgb(watermark.text.color),
      opacity: watermark.text.opacity / 100,
      rotate: degrees(watermark.rotation),
    });
  } else if (watermark.type === 'image' && watermark.image?.file) {
    const imageBytes = await watermark.image.file.arrayBuffer();
    const embeddedImage = await page.doc.embedPng(imageBytes); // or embedJpg
    const dims = embeddedImage.scale(watermark.image.scale / 100);
    
    page.drawImage(embeddedImage, {
      x: position.x,
      y: position.y,
      width: dims.width,
      height: dims.height,
      opacity: watermark.image.opacity / 100,
      rotate: degrees(watermark.rotation),
    });
  }
}
```

#### Position Calculation

```typescript
function calculatePosition(
  pageSize: { width: number; height: number },
  position: WatermarkPosition,
  elementSize: { width: number; height: number },
  margin: number = 20
): { x: number; y: number } {
  const { width: pw, height: ph } = pageSize;
  const { width: ew, height: eh } = elementSize;
  
  // Calculate base positions
  const positions: Record<WatermarkPosition, { x: number; y: number }> = {
    'top-left': { x: margin, y: ph - eh - margin },
    'top-center': { x: (pw - ew) / 2, y: ph - eh - margin },
    'top-right': { x: pw - ew - margin, y: ph - eh - margin },
    'center-left': { x: margin, y: (ph - eh) / 2 },
    'center': { x: (pw - ew) / 2, y: (ph - eh) / 2 },
    'center-right': { x: pw - ew - margin, y: (ph - eh) / 2 },
    'bottom-left': { x: margin, y: margin },
    'bottom-center': { x: (pw - ew) / 2, y: margin },
    'bottom-right': { x: pw - ew - margin, y: margin },
  };
  
  return positions[position];
}
```

### 4.6 Preview Integration

Modify `preview-panel.tsx` to show watermark overlay:

```typescript
// Pseudo-code for preview
<div className="preview-page">
  <img src={pageImageUrl} />
  {watermark.enabled && watermark.type === 'text' && (
    <div 
      className="watermark-overlay"
      style={{
        position: 'absolute',
        ...calculatePreviewPosition(watermark.position),
        fontSize: watermark.text?.fontSize,
        color: watermark.text?.color,
        opacity: watermark.text?.opacity / 100,
        transform: `rotate(${watermark.rotation}deg)`,
      }}
    >
      {watermark.text?.content}
    </div>
  )}
  {/* Similar for image watermark */}
</div>
```

### 4.7 Edge Cases

- Watermark text too long for page: Truncate with ellipsis in preview
- Image watermark larger than page: Scale down automatically
- Rotation causing overflow: Clip or adjust position
- Transparency at 0%: Still render but invisible (don't skip)
- First-page-only with 1-page document: Works normally

### 4.8 Acceptance Criteria

- [ ] User can add text watermark with custom content
- [ ] User can add image watermark by uploading file
- [ ] Font size, color, opacity controls work for text
- [ ] Scale and opacity controls work for image
- [ ] 9-position grid placement works
- [ ] Rotation control works (0-360°)
- [ ] All Pages / First Page Only scope works
- [ ] Watermark appears in live preview
- [ ] Watermark renders correctly in exported PDF
- [ ] Watermark respects page size and orientation

---

## 5. Slice 7: Page Numbers

### 5.1 Purpose

Add automatic page numbering to generated PDFs for document organization and navigation.

### 5.2 Requirements

#### Page Number Controls

| Option | Values | Default |
|--------|--------|---------|
| Enable | Toggle | Off |
| Position | Top-left, Top-right, Bottom-left, Bottom-right, Center | Bottom-center |
| Format | Number only, "Page N", "N of total", "Page N of total" | "N of total" |
| Start From | 1-999 | 1 |
| Skip First Page | Toggle | Off |

#### Format Options

| Format | Example (Page 3 of 10) |
|--------|------------------------|
| `number` | 3 |
| `page-number` | Page 3 |
| `number-of-total` | 3 of 10 |
| `page-number-of-total` | Page 3 of 10 |

### 5.3 UI Components

**Location:** Add to existing `page-settings-panel.tsx`

```
┌─────────────────────────────────────┐
│ Page Numbers                        │
│ [Toggle: Add page numbers]          │
├─────────────────────────────────────┤
│ Position: [Bottom-center ▼]         │
│ Format: [Page N of total ▼]         │
│ Start from: [1    ]                 │
│ [ ] Skip first page                 │
└─────────────────────────────────────┘
```

### 5.4 Technical Implementation

#### State Interface

```typescript
interface PageNumberSettings {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  format: 'number' | 'page-number' | 'number-of-total' | 'page-number-of-total';
  startFrom: number;
  skipFirstPage: boolean;
}
```

#### PDF Generation

```typescript
function formatPageNumber(
  current: number,
  total: number,
  format: PageNumberSettings['format']
): string {
  switch (format) {
    case 'number': return `${current}`;
    case 'page-number': return `Page ${current}`;
    case 'number-of-total': return `${current} of ${total}`;
    case 'page-number-of-total': return `Page ${current} of ${total}`;
  }
}

// In PDF generation loop
if (pageNumbers.enabled) {
  const totalPages = images.length;
  
  for (let i = 0; i < totalPages; i++) {
    // Skip first page if requested
    if (pageNumbers.skipFirstPage && i === 0) continue;
    
    const pageNum = pageNumbers.startFrom + i - (pageNumbers.skipFirstPage ? 1 : 0);
    const label = formatPageNumber(pageNum, totalPages, pageNumbers.format);
    
    const position = calculatePageNumberPosition(
      page.getSize(),
      pageNumbers.position,
      label.length
    );
    
    page.drawText(label, {
      x: position.x,
      y: position.y,
      size: 10,
      color: rgb(0.4, 0.4, 0.4),
    });
  }
}
```

### 5.5 Current State

- UI toggle: ✅ Present in `page-settings-panel.tsx`
- Logic: ⚠️ Partial implementation exists

### 5.6 Tasks

1. Verify existing UI controls bind correctly to state
2. Complete `drawText()` implementation with position calculation
3. Handle all 5 position variants
4. Implement all 4 format options
5. Handle "skip first page" edge case
6. Ensure page numbers don't overlap content (place in margin area)

### 5.7 Acceptance Criteria

- [ ] Page numbers toggle enables/disables feature
- [ ] Numbers appear in selected position
- [ ] All format options work correctly
- [ ] "Start from" offset works
- [ ] Skip first page option works
- [ ] Numbers update when pages are reordered
- [ ] Numbers appear in exported PDF

---

## 6. Slice 8: Password Protection

### 6.1 Purpose

Protect sensitive PDFs with encryption and password requirements.

### 6.2 Requirements

#### Password Fields

| Field | Required | Description |
|-------|----------|-------------|
| User Password | Yes | Required to open the PDF |
| Confirm Password | Yes | Must match user password |
| Owner Password | No | For permission management |

#### Permission Controls

| Permission | Default | Description |
|------------|---------|-------------|
| Printing | Allowed | Can print the document |
| Copying | Allowed | Can copy text/content |
| Modifying | Disallowed | Can edit the document |

#### Password Strength Indicator

| Strength | Criteria | Visual |
|----------|----------|--------|
| Weak | < 8 chars or only letters/numbers | Red |
| Fair | 8+ chars with mix | Yellow |
| Good | 10+ chars with mix | Light green |
| Strong | 12+ chars with uppercase, lowercase, numbers, symbols | Green |

Strength calculation:
- Length: +1 per character (max 10 points)
- Uppercase: +2
- Lowercase: +2
- Numbers: +2
- Symbols: +2
- Score 0-5: Weak, 6-8: Fair, 9-11: Good, 12+: Strong

### 6.3 UI Components

**New Component:** `password-settings-panel.tsx`

```
┌─────────────────────────────────────┐
│ Password Protection                 │
│ [Toggle: Enable password]           │
├─────────────────────────────────────┤
│ Password: [          ] [👁]          │
│ Confirm: [          ] [👁]          │
│                                     │
│ Strength: [████████░░] Good         │
│                                     │
│ ── Advanced ──                      │
│ Owner Password (optional):          │
│ [                    ] [👁]          │
│                                     │
│ Permissions:                        │
│ [✓] Allow printing                │
│ [✓] Allow copying                 │
│ [ ] Allow modifying               │
└─────────────────────────────────────┘
```

#### Show/Hide Toggle

- Eye icon next to each password field
- Toggle between `type="password"` and `type="text"`
- Default: Hidden (password dots)

#### Strength Bar

- Horizontal bar with 10 segments
- Color gradient: Red → Yellow → Light Green → Green
- Updates in real-time as user types
- Text label below: "Weak", "Fair", "Good", "Strong"

### 6.4 Validation Rules

| Rule | Validation | Error Message |
|------|------------|---------------|
| User password | Min 1 character required | "Password is required" |
| Confirm password | Must match user password | "Passwords do not match" |
| Owner password | Optional, no minimum | - |

### 6.5 Technical Implementation

#### State Interface

```typescript
interface PasswordSettings {
  enabled: boolean;
  userPassword: string;
  confirmPassword: string;
  ownerPassword?: string;
  permissions: {
    printing: boolean;
    copying: boolean;
    modifying: boolean;
  };
}

// Helper type for validation
interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
}
```

#### Password Strength Calculation

```typescript
function calculatePasswordStrength(password: string): PasswordValidation {
  let score = 0;
  const errors: string[] = [];
  
  // Length (up to 10 points)
  score += Math.min(password.length, 10);
  
  // Character variety
  if (/[A-Z]/.test(password)) score += 2;
  if (/[a-z]/.test(password)) score += 2;
  if (/[0-9]/.test(password)) score += 2;
  if (/[^A-Za-z0-9]/.test(password)) score += 2;
  
  // Determine strength
  let strength: PasswordValidation['strength'];
  if (score < 6) strength = 'weak';
  else if (score < 9) strength = 'fair';
  else if (score < 12) strength = 'good';
  else strength = 'strong';
  
  // Validation
  const isValid = password.length > 0;
  if (!isValid) errors.push("Password is required");
  
  return { isValid, errors, strength, score };
}
```

#### PDF Generation with Encryption

```typescript
import { PDFDocument, StandardEncryptionR4 } from 'pdf-lib';

async function encryptPDF(
  pdfDoc: PDFDocument,
  passwordSettings: PasswordSettings
): Promise<void> {
  if (!passwordSettings.enabled || !passwordSettings.userPassword) {
    return; // No encryption
  }
  
  const encryption: StandardEncryptionR4 = {
    userPassword: passwordSettings.userPassword,
    ownerPassword: passwordSettings.ownerPassword || passwordSettings.userPassword,
    permissions: {
      printing: passwordSettings.permissions.printing ? 'highResolution' : 'none',
      modifying: passwordSettings.permissions.modifying,
      copying: passwordSettings.permissions.copying,
      annotating: false,
      fillingForms: false,
    },
  };
  
  await pdfDoc.encrypt(encryption);
}
```

### 6.6 Security Considerations

- Passwords stored only in client-side state (never sent to server)
- Clear passwords from memory after PDF generation
- Don't log passwords in console or error reports
- Use pdf-lib's standard encryption (RC4 or AES depending on version)

### 6.7 Tasks

1. Create `password-settings-panel.tsx` component
2. Add password strength calculation utility
3. Implement show/hide toggle for password fields
4. Add validation logic (match confirmation)
5. Integrate encryption into `pdf-generator.ts`
6. Add permission handling
7. Test encrypted PDF opening in various readers

### 6.8 Acceptance Criteria

- [ ] Password toggle enables/disables feature
- [ ] User password field with show/hide toggle
- [ ] Confirm password field with validation
- [ ] Password strength indicator shows in real-time
- [ ] Weak/Fair/Good/Strong states render correctly
- [ ] Owner password field (optional)
- [ ] Permission checkboxes work
- [ ] Encrypted PDF requires password to open
- [ ] Permissions enforced in PDF reader
- [ ] Password validation prevents mismatch

---

## 7. Slice 9: Compression & Metadata

### 7.1 Purpose

Optimize PDF file size and embed document information.

### 7.2 Requirements

#### Compression Settings

| Setting | Range | Default |
|---------|-------|---------|
| Enable Compression | Toggle | On |
| Image Quality | 10% - 100% | 85% |

#### Metadata Fields

| Field | Required | Default |
|-------|----------|---------|
| Title | No | Empty |
| Author | No | Empty |
| Subject | No | Empty |
| Keywords | No | Empty |
| Creator | Auto-set | "PDF Studio" |
| Creation Date | Auto-set | Current timestamp |

### 7.3 UI Components

**Location:** Existing controls in `page-settings-panel.tsx`

```
┌─────────────────────────────────────┐
│ Compression                         │
│ [Toggle: Compress images]           │
│ Quality: [────●────] 85%          │
│                                     │
│ ── Metadata ──                      │
│ Title: [              ]             │
│ Author: [              ]            │
│ Subject: [              ]           │
│ Keywords: [              ]          │
│         (comma-separated)           │
└─────────────────────────────────────┘
```

### 7.4 Technical Implementation

#### State Interface

```typescript
interface CompressionSettings {
  enabled: boolean;
  quality: number; // 10-100
}

interface MetadataSettings {
  title: string;
  author: string;
  subject: string;
  keywords: string;
}
```

#### Compression Logic

```typescript
async function compressImage(
  imageBlob: Blob,
  quality: number
): Promise<Blob> {
  if (quality >= 100) return imageBlob;
  
  // Use canvas-based compression for JPEG/PNG
  const bitmap = await createImageBitmap(imageBlob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(bitmap, 0, 0);
  
  // Convert to JPEG with specified quality
  const compressed = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob || imageBlob),
      'image/jpeg',
      quality / 100
    );
  });
  
  bitmap.close();
  return compressed;
}
```

#### Metadata Embedding

```typescript
function applyMetadata(
  pdfDoc: PDFDocument,
  metadata: MetadataSettings
): void {
  pdfDoc.setTitle(metadata.title || 'PDF Studio Document');
  pdfDoc.setAuthor(metadata.author || '');
  pdfDoc.setSubject(metadata.subject || '');
  pdfDoc.setKeywords(
    metadata.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)
  );
  pdfDoc.setCreator('PDF Studio');
  pdfDoc.setCreationDate(new Date());
}
```

### 7.5 Current State

- UI: ✅ Present in `page-settings-panel.tsx`
- Logic: ⚠️ Partial implementation

### 7.6 Tasks

1. Verify compression quality applies correctly
2. Test compression with various image formats
3. Verify metadata embeds in PDF properties
4. Check metadata displays in PDF readers
5. Ensure keywords parse correctly (comma-split)

### 7.7 Acceptance Criteria

- [ ] Compression toggle works
- [ ] Quality slider 10-100% functional
- [ ] Compressed PDF smaller than original
- [ ] Metadata fields save to PDF
- [ ] Title appears in PDF properties
- [ ] Author appears in PDF properties
- [ ] Keywords parse and store correctly
- [ ] Creator auto-set to "PDF Studio"
- [ ] Creation date auto-set

---

## 8. Technical Architecture

### 8.1 Module Dependencies

```
Slices 6-9 depend on:
├── pdf-lib (already present)
├── Existing state management
├── Existing UI component library
├── Existing file upload utilities
└── Slices 1-5 (must be merged first)
```

### 8.2 State Management Updates

```typescript
// Add to existing PDFSettings interface
interface PDFSettings {
  // ... existing settings from Phase 1 & Slices 1-5
  
  // New for Slices 6-9
  watermark: WatermarkSettings;
  pageNumbers: PageNumberSettings;
  password: PasswordSettings;
  compression: CompressionSettings;
  metadata: MetadataSettings;
}
```

### 8.3 PDF Generation Pipeline (Updated)

```
1. Collect images from state
2. Apply crops if present (Slice 3)
3. Convert HEIC if needed (Slice 4)
4. Process OCR if enabled (Slice 5)
5. Apply compression if enabled (Slice 9)
6. Apply page settings (size, orientation, fit, margins)
7. Add watermarks to pages (Slice 6)
8. Add page numbers (Slice 7)
9. Apply metadata (Slice 9)
10. Encrypt if password set (Slice 8)
11. Generate final PDF
12. Trigger download
```

### 8.4 Files to Create/Modify

#### New Files

```
src/features/pdf-studio/components/
├── watermark-settings-panel.tsx    # Slice 6
└── password-settings-panel.tsx       # Slice 8
```

#### Modified Files

```
src/features/pdf-studio/
├── lib/
│   └── pdf-generator.ts            # Slices 6, 7, 8, 9
├── components/
│   ├── page-settings-panel.tsx     # Slices 7, 9
│   └── preview-panel.tsx             # Slice 6 (watermark preview)
└── types/
    └── index.ts                      # All slices
```

---

## 9. UI/UX Specifications

### 9.1 Design Principles

- Follow existing Notion-inspired design
- Use established color palette and spacing
- Maintain calm, professional appearance
- Clear visual hierarchy
- Immediate feedback on all interactions

### 9.2 Responsive Behavior

**Desktop:**
- Side-by-side layout with settings left, preview right
- Full watermark controls visible
- Password strength bar full width

**Mobile:**
- Stacked sections
- Collapsible sections for advanced options
- Touch-friendly inputs
- Simplified watermark position selector (dropdown vs grid)

### 9.3 Animation & Transitions

- Watermark preview updates: 200ms fade
- Password strength bar: smooth fill animation
- Section expand/collapse: 300ms ease
- Toggle switches: 150ms bounce

### 9.4 Accessibility

- All inputs have associated labels
- Color not sole indicator (icons + text for strength)
- Keyboard navigation for all controls
- ARIA labels for custom components
- Focus states visible

---

## 10. Implementation Order

### Recommended Sequence

1. **Slice 7: Page Numbers** (0.5-1 day)
   - UI mostly exists
   - Complete logic
   - Quick win

2. **Slice 9: Compression & Metadata** (0.5-1 day)
   - UI mostly exists
   - Verify logic
   - Quick win

3. **Slice 8: Password Protection** (1-2 days)
   - New UI needed
   - Encryption integration
   - Strength indicator

4. **Slice 6: Watermarking** (1-2 days)
   - Most complex UI
   - Preview integration
   - PDF rendering logic

**Total Timeline:** 3-5 days

### Rationale

- Complete "mostly done" slices first to reduce risk
- Build confidence with quick wins
- Tackle complex watermarking last when codebase is warmed up
- Password protection in middle to spread UI work

---

## 11. Testing & QA Requirements

### 11.1 Per-Slice Testing

After each slice:

```bash
# Build verification
npm run build

# Type checking
npm run type-check

# Unit tests
npm test -- src/features/pdf-studio

# Manual verification checklist
```

### 11.2 Slice-Specific Test Cases

**Slice 6: Watermarking**
- [ ] Text watermark with all positions
- [ ] Image watermark upload and display
- [ ] Rotation at 0°, 90°, 180°, 270°, 45°
- [ ] Opacity at 0%, 50%, 100%
- [ ] Scope: All pages vs First page
- [ ] Preview updates in real-time
- [ ] Export matches preview

**Slice 7: Page Numbers**
- [ ] All 5 positions
- [ ] All 4 format options
- [ ] Start from offset (e.g., start from 5)
- [ ] Skip first page toggle
- [ ] Works with 1, 5, 30 pages

**Slice 8: Password Protection**
- [ ] Weak password (red indicator)
- [ ] Strong password (green indicator)
- [ ] Mismatched passwords show error
- [ ] Encrypted PDF requires password
- [ ] Each permission toggle works
- [ ] PDF opens in Adobe Reader, Preview, Chrome

**Slice 9: Compression & Metadata**
- [ ] Quality 10% produces smaller file
- [ ] Quality 100% minimal compression
- [ ] All metadata fields embed
- [ ] Keywords comma-parsing
- [ ] Creator auto-set

### 11.3 Integration Testing

- All 4 features enabled together
- Maximum load: 30 images + watermarks + page numbers + encryption
- Mobile viewport testing
- Cross-browser testing (Chrome, Safari, Firefox)

### 11.4 Performance Testing

- Watermarking: < 100ms per page
- Encryption: < 500ms for 30-page PDF
- Compression: Linear with image count
- Memory: No leaks during repeated generation

---

## 12. Acceptance Criteria

### Overall Phase 2 Completion

PDF Studio Phase 2 Slices 6-9 are complete when:

#### Slice 6: Watermarking
- [ ] Text watermark functional
- [ ] Image watermark functional
- [ ] All styling controls work
- [ ] 9-position grid functional
- [ ] Rotation functional
- [ ] Scope (all/first) functional
- [ ] Watermark appears in live preview
- [ ] Watermark renders in exported PDF

#### Slice 7: Page Numbers
- [ ] Toggle enables feature
- [ ] All positions work
- [ ] All formats work
- [ ] Start from offset works
- [ ] Skip first page works
- [ ] Numbers appear in exported PDF

#### Slice 8: Password Protection
- [ ] Password toggle works
- [ ] User password with confirmation
- [ ] Strength indicator (weak → strong)
- [ ] Owner password (optional)
- [ ] Permission toggles functional
- [ ] Encryption produces valid PDF
- [ ] Password required to open

#### Slice 9: Compression & Metadata
- [ ] Compression toggle works
- [ ] Quality slider 10-100% functional
- [ ] File size reduced when compressed
- [ ] All metadata fields embed
- [ ] Keywords parse correctly
- [ ] Creator auto-set to "PDF Studio"
- [ ] Creation date auto-set

#### Cross-Cutting
- [ ] All features work together
- [ ] No regression on Slices 1-5
- [ ] Mobile responsive
- [ ] Build passes
- [ ] Tests pass
- [ ] Code review approved

---

## 13. Engineering Handoff

### 13.1 Prerequisites

Before starting:
- [ ] Slices 1-5 merged to `feature/pdf-studio-phase1`
- [ ] Branch `feature/pdf-studio-advanced-options` created
- [ ] Dependencies installed
- [ ] Development server running

### 13.2 Quick Start

```bash
# Checkout and start
git checkout feature/pdf-studio-slice-4-5
git checkout -b feature/pdf-studio-advanced-options
npm install
npm run dev

# Navigate to /pdf-studio in app
# Verify Slices 1-5 work
```

### 13.3 Implementation Checklist

```markdown
Day 1: Quick Wins
- [ ] Slice 7: Page numbers logic
- [ ] Slice 9: Verify compression/metadata

Day 2-3: Password
- [ ] Create password-settings-panel.tsx
- [ ] Add strength indicator
- [ ] Integrate pdf-lib encryption

Day 4-5: Watermarking
- [ ] Create watermark-settings-panel.tsx
- [ ] Add preview overlay logic
- [ ] Implement PDF watermark rendering
```

### 13.4 Questions?

Resources:
1. This PRD (comprehensive reference)
2. `docs/pdf-studio-phase2-slice5-handoff.md` (context)
3. `docs/PDF studio/pdf-studio-phase1-prd.md` (base requirements)
4. Existing code in `src/features/pdf-studio/`

### 13.5 Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Product | ___ | ___ | ☐ |
| Engineering Lead | ___ | ___ | ☐ |
| QA | ___ | ___ | ☐ |

---

*End of PRD*

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Status:** Ready for Implementation
