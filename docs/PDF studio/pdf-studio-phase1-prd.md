# PDF Studio Phase 1 Product Requirements Document (PRD)

**Feature Module:** PDF Studio  
**Module Type:** New Feature Extension for Existing Web App  
**Status:** Ready for Engineering Handover  
**Version:** Phase 1  
**Date:** April 2026  

---

## Table of Contents

1. [Purpose of This Document](#1-purpose-of-this-document)
2. [Module Overview](#2-module-overview)
3. [Product Positioning](#3-product-positioning)
4. [Why This Feature Exists](#4-why-this-feature-exists)
5. [Phase 1 Goals](#5-phase-1-goals)
6. [Product Decisions Locked for Phase 1](#6-product-decisions-locked-for-phase-1)
7. [Scope](#7-scope)
8. [Target Users](#8-target-users)
9. [Experience Principles](#9-experience-principles)
10. [UI and Visual Direction](#10-ui-and-visual-direction)
11. [High-Level Module Structure](#11-high-level-module-structure)
12. [User Flow](#12-user-flow)
13. [Desktop UX Flow](#13-desktop-ux-flow)
14. [Mobile UX Flow](#14-mobile-ux-flow)
15. [Upload Requirements](#15-upload-requirements)
16. [Image Organizer Requirements](#16-image-organizer-requirements)
17. [Rotation Requirements](#17-rotation-requirements)
18. [Removal and Reset Requirements](#18-removal-and-reset-requirements)
19. [PDF Settings Requirements](#19-pdf-settings-requirements)
20. [Combined Preview Requirements](#20-combined-preview-requirements)
21. [Conversion Requirements](#21-conversion-requirements)
22. [Download Requirements](#22-download-requirements)
23. [Data and State Model (Ephemeral)](#23-data-and-state-model-ephemeral)
24. [Technical Approach](#24-technical-approach)
25. [Recommended Engineering Components](#25-recommended-engineering-components)
26. [Detailed Functional Requirements](#26-detailed-functional-requirements)
27. [Validation Rules](#27-validation-rules)
28. [Error Handling Requirements](#28-error-handling-requirements)
29. [Empty, Loading, and Success States](#29-empty-loading-and-success-states)
30. [Edge Cases to Handle](#30-edge-cases-to-handle)
31. [Performance Considerations](#31-performance-considerations)
32. [Accessibility and Usability Requirements](#32-accessibility-and-usability-requirements)
33. [Responsive Requirements](#33-responsive-requirements)
34. [Security and Privacy Considerations](#34-security-and-privacy-considerations)
35. [Suggested Default Values](#35-suggested-default-values)
36. [Phased Delivery Recommendation](#36-phased-delivery-recommendation)
37. [QA Checklist](#37-qa-checklist)
38. [Acceptance Criteria](#38-acceptance-criteria)
39. [Final Engineering Guidance](#39-final-engineering-guidance)
40. [Final Scope Statement](#40-final-scope-statement)

---

## 1. Purpose of This Document

This document defines the complete product, UX, technical, and implementation requirements for a new module called **PDF Studio**.

PDF Studio will be added as a new feature inside the existing web application. The purpose of this document is to give the software engineering team a clear and unambiguous understanding of:

- What the module is
- Why it is being built
- How the user flow should work
- What is in scope for Phase 1
- What is out of scope for Phase 1
- How the module should behave on desktop and mobile
- What validations and limits must be enforced
- How client-side PDF generation should work conceptually
- What states, errors, and edge cases must be handled
- What acceptance criteria define completion

This PRD is written so the engineering team can develop the feature without having to infer product behavior from scattered notes.

---

## 2. Module Overview

PDF Studio is an **Image to PDF conversion module** that allows users to upload multiple image files and convert them into a single PDF document.

### Core User Capabilities

The user should be able to:
- Upload up to 30 images
- View uploaded images as thumbnails
- Rearrange image order
- Rotate images
- Remove images
- Configure PDF page settings
- Preview the combined result before final export
- Generate and download a single PDF

### Product Integration

The module should feel like a **native part of the existing web app**, not like a separate utility or embedded third-party tool.

### Design Direction

The UI should align with the broader product direction:
- Clean
- Calm
- Highly usable
- Structured
- Notion-inspired in clarity and spacing
- Restrained in visual design
- Modern but not flashy

---

## 3. Product Positioning

PDF Studio is a **document utility module** inside the existing app. It should be positioned as a clean, reliable tool for users who need to combine images into a PDF quickly without dealing with technical complexity.

### What This Is NOT (Phase 1)

- Not a full PDF suite
- Not a scanner app
- Not an OCR tool
- Not a PDF editor
- Not a cloud document manager

### What This IS (Phase 1)

- An image upload and ordering interface
- A page layout configuration interface
- A preview and PDF generation tool
- A client-side conversion experience

---

## 4. Why This Feature Exists

This module solves a very common and practical problem: users often have multiple image files that need to be combined into a single PDF for work, submission, record keeping, or sharing.

### Typical Scenarios

- Bills and receipts
- Scanned forms
- Photographed pages
- ID documents
- Supporting documents for office/admin use
- Student submissions
- Vendor paperwork

### Problems Without PDF Studio

| Problem | Current Solution |
|---------|------------------|
| Random online converters | Unreliable, often with ads |
| Image ordering struggles | Manual re-uploading |
| Poor PDF quality | Inconsistent outputs |
| Bad UI experience | Frustrating workflows |
| Lack of layout control | No page size/orientation options |

### Solution

PDF Studio solves this inside the existing product ecosystem with better design consistency and a cleaner workflow.

---

## 5. Phase 1 Goals

### Primary Goal

Allow users to convert up to 30 uploaded images into a single downloadable PDF using a guided, reliable, and visually clear workflow.

### Secondary Goals

- Provide thumbnail-based organization before export
- Allow control over page size, orientation, fit, and margins
- Provide a combined preview before conversion/download
- Ensure the module works well on both desktop and mobile
- Keep the entire process client-side for simplicity and low infrastructure dependency

---

## 6. Product Decisions Locked for Phase 1

| Decision | Value |
|----------|-------|
| Module name | PDF Studio |
| Integration | Added to existing web app, not separate product |
| Platforms | Both desktop and mobile usage are important |
| Architecture | Client-side conversion |
| Backend | No backend conversion required (Vercel/serverless compatible) |
| Max images per session | 30 |
| HEIC support | Not included |
| Supported formats | JPG, JPEG, PNG, WEBP |
| Workflow requirement | Must include thumbnail organization first |
| Preview requirement | Must include combined preview before download |
| Output | Single PDF only |

---

## 7. Scope

### In Scope for Phase 1

| Feature | Description |
|---------|-------------|
| Upload multiple image files | Core functionality |
| Support JPG/JPEG/PNG/WEBP | Input formats |
| Drag and drop upload | Desktop experience |
| File picker upload | Universal method |
| Thumbnail preview | Visual organization |
| Drag-and-drop reordering | Arrange images |
| Rotate left/right | Orientation correction |
| Remove single image | Individual deletion |
| Clear all images | Bulk reset |
| Page settings configuration | PDF layout control |
| Page size options | A4, Letter, Legal, Fit to Image |
| Orientation options | Portrait, Landscape, Auto |
| Fit mode options | Contain, Cover, Actual Size |
| Margin options | None, Small, Medium |
| Combined preview | Pre-download review |
| Generate one merged PDF | Client-side creation |
| Download PDF file | User delivery |
| Responsive UI | Desktop and mobile |
| Validation, limits, states | Error handling |

### Out of Scope for Phase 1

| Feature | Phase |
|---------|-------|
| HEIC support | Phase 2+ |
| OCR/searchable PDF | Phase 2+ |
| Crop tool | Phase 2+ |
| Brightness/contrast cleanup | Phase 2+ |
| Watermarking | Phase 2+ |
| Password-protected PDF | Phase 2+ |
| PDF compression after generation | Phase 2+ |
| Splitting PDF | Phase 2+ |
| Combining existing PDF files with images | Phase 2+ |
| Cloud storage | Phase 2+ |
| Save history | Phase 2+ |
| User accounts specific to this module | Phase 2+ |
| Saved sessions | Phase 2+ |
| Share links | Phase 2+ |
| Annotations/drawing | Phase 2+ |
| Multi-image-per-page layouts | Phase 2+ |
| Server-side conversion pipeline | N/A |

---

## 8. Target Users

### Primary Users

- Business users
- Admins
- Office staff
- Students
- Freelancers
- General users needing quick PDF creation from images

### User Needs

Users want to:
- Upload images quickly
- Avoid confusing tools
- Rearrange pages easily
- Control the layout of the final PDF
- Preview the output before download
- Get a usable PDF without broken pages or awkward scaling

---

## 9. Experience Principles

PDF Studio should follow these experience principles:

1. **Fast to start** - Upload should be immediate and easy
2. **Clear control over page order** - Users must always understand the order of images/pages
3. **Predictable layout** - Settings must produce understandable results
4. **Low visual noise** - The module should feel calm, organized, and reliable
5. **Confidence before export** - Users should be able to preview the combined result before downloading
6. **Good mobile usability** - The experience must remain practical on smaller screens
7. **No fake complexity** - Phase 1 should solve the main problem well without turning into a bloated PDF suite

---

## 10. UI and Visual Direction

### Design Direction

The module should follow the existing app's product design language and use a **Notion-inspired UI attitude**:
- Lots of whitespace
- Clear sectioning
- Quiet and readable layout
- Subtle borders and dividers
- Minimal decorative elements
- Restrained accent usage
- Content and controls emphasized over visual effects

### Visual Characteristics

- Light background
- Neutral cards/panels
- Soft borders
- Medium-weight typography hierarchy
- Clean buttons and toggles
- Calm spacing rhythm
- Thumbnail cards with simple controls
- Clear primary CTA for conversion/download

### Brand Integration

PDF Studio should visually feel like a native module under the existing brand system:
- Consistent fonts
- Consistent buttons and form elements
- Consistent spacing scale
- Consistent top-level page layout
- Consistent navigation pattern used in the rest of the app

---

## 11. High-Level Module Structure

PDF Studio should include the following functional sections:

1. **Upload Area**
2. **Image Organizer**
3. **PDF Settings**
4. **Combined Preview**
5. **Conversion and Download Actions**

These may be arranged differently on desktop and mobile, but all five areas are required.

---

## 12. User Flow

### Primary End-to-End Flow

1. User opens PDF Studio
2. User uploads one or more images
3. Uploaded images appear as thumbnails
4. User rearranges image order if needed
5. User rotates or removes images if needed
6. User selects page size, orientation, fit mode, and margins
7. User reviews the combined preview
8. User clicks Convert / Generate PDF
9. PDF is generated client-side
10. User downloads the file

This flow must be understandable without training.

---

## 13. Desktop UX Flow

### Recommended Desktop Layout

**Left Column / Panel**
- Upload area
- Thumbnail organizer
- Settings controls
- Convert/download actions

**Right Column / Panel**
- Combined preview

This layout is recommended because users need to see the result while changing layout settings.

### Desktop Interaction Expectations

- Drag and drop should work smoothly for upload and reordering
- Thumbnail controls should be clearly visible
- Preview should update with low latency when settings change
- Action controls should stay visible or easy to reach

---

## 14. Mobile UX Flow

### Recommended Mobile Structure

Use a stacked flow or segmented step layout:
1. Upload
2. Organize
3. Settings
4. Preview
5. Convert and Download

### Mobile UX Requirements

- Upload should support file picker cleanly
- Thumbnail list should remain scrollable and reorderable
- Controls should be finger-friendly
- Preview should remain readable, even if simplified
- The user should never feel lost between upload, settings, and preview

**Note:** Desktop and mobile do not need identical layouts, but they must support the same core functionality.

---

## 15. Upload Requirements

### Supported Input Formats (Phase 1)

| Format | Supported |
|--------|-----------|
| JPG | Yes |
| JPEG | Yes |
| PNG | Yes |
| WEBP | Yes |
| HEIC | No |
| GIF | No |
| SVG | No |
| PDF | No |
| DOC/DOCX | No |

### Upload Methods

The user should be able to upload images using:
- Drag and drop
- Click to open file picker
- Add more files after initial upload

### Upload Limits

| Limit | Value |
|-------|-------|
| Maximum images per session | 30 |
| Pages per image | 1 (each image = one PDF page) |

If a user attempts to exceed the limit, the system must show a clear error.

### Upload Validation Rules

The system must validate:
- File type
- File count
- Corrupted/unreadable file handling

Optional but recommended:
- File size warnings for extremely large images

### Upload UX Requirements

- Uploaded images should appear quickly as thumbnails
- Invalid files should not block valid uploads unnecessarily
- Errors should clearly indicate which file failed and why

---

## 16. Image Organizer Requirements

### Purpose

The organizer is the core area where users manage the order and state of the uploaded pages before conversion.

### Required Capabilities

For each uploaded image, the user must be able to:
- View thumbnail
- See current page number/order
- Reorder position
- Rotate image left
- Rotate image right
- Remove image

### Reordering

**Desktop**
- Drag-and-drop reordering should be supported

**Mobile**
- Drag-and-drop should be supported if practical
- If needed, engineering may provide mobile-friendly reorder handling, but reordering must remain easy

### Page Numbering

Page numbering should update automatically whenever:
- Images are reordered
- An image is removed
- New images are added

### Thumbnail Requirements

Each thumbnail card should ideally show:
- Image preview
- Page number
- Filename (may be truncated)
- Rotate actions
- Delete action

### Empty State

If there are no uploaded images, the organizer area should show a clear empty state prompt rather than blank space.

---

## 17. Rotation Requirements

### Purpose

Users often upload images with incorrect orientation. Rotation is therefore mandatory.

### Required Actions

- Rotate left 90°
- Rotate right 90°

### Behavior

- Rotation must affect preview
- Rotation must affect final PDF output
- Rotation state must persist during the current session until removed/reset

### Validation

Rotation should not break ordering, preview rendering, or conversion.

---

## 18. Removal and Reset Requirements

### Single Image Removal

The user must be able to remove an individual image.

### Clear All

The user should be able to remove all uploaded images in one action.

### Confirmation Logic

- Single remove may not require confirmation if undo is easy or interaction is safe
- Clear all may use confirmation depending on UX design decision

### Resulting Behavior

- Page numbers update immediately
- Preview updates immediately
- If all images are removed, the module returns to empty state

---

## 19. PDF Settings Requirements

The user must be able to configure how uploaded images are placed onto PDF pages.

### 19.1 Page Size Options

Phase 1 must include:

| Option | Description |
|--------|-------------|
| A4 | Standard document page |
| Letter | US letter size |
| Legal | Longer legal-style page size |
| Fit to Image | Page dimensions follow image proportions |

Engineering must implement this consistently and predictably.

### 19.2 Orientation Options

Phase 1 must include:

| Option | Description |
|--------|-------------|
| Portrait | All pages in portrait orientation |
| Landscape | All pages in landscape orientation |
| Auto | System decides based on image aspect ratio |

**Recommended Auto behavior:** Use image aspect ratio to determine page orientation per page.

### 19.3 Fit Mode Options

Phase 1 should include:

| Option | Description |
|--------|-------------|
| Contain / Fit Within Page | Image fits fully; empty space may remain |
| Cover / Fill Page | Image fills more page; may crop |
| Actual Size | Render closer to original scale |

Engineering must define safe rendering behavior so Actual Size does not produce broken or clipped output.

### 19.4 Margin Options

Phase 1 must include:
- None
- Small
- Medium

Optional exact values can be defined by design/engineering, but they must be consistent across preview and output.

### 19.5 Output File Name

The user should be able to define the output PDF file name before download. If not specified, the system should provide a sensible default.

**Example default:** `pdf-studio-document.pdf`

---

## 20. Combined Preview Requirements

### Purpose

Before converting/downloading, the user should be able to preview the combined output to confirm:
- Page order
- Page count
- Orientation
- Spacing/margins
- Overall composition

### Phase 1 Preview Requirement

The module must include:
- Thumbnail organization view
- Combined document preview after or alongside settings

This means the preview should go beyond just showing raw thumbnails. It should show a representation of how the final PDF pages will look.

### Preview Expectations

Preview should reflect:
- Page size settings
- Orientation settings
- Fit mode settings
- Rotation state
- Page order

### Preview Fidelity

The preview does not have to be pixel-perfect to the final export, but it must be close enough that the user can trust it.

### Preview Layout

**Desktop**
- Preview can live in a right-side panel with scrollable page cards

**Mobile**
- Preview can appear as a separate section below settings or as a dedicated step

---

## 21. Conversion Requirements

### Core Requirement

When the user clicks the primary conversion action, the module must generate a single merged PDF from the uploaded images according to the selected settings.

### Conversion Mode

Phase 1 conversion is **client-side only**.

### Client-Side Expectations

- No backend file processing required
- No server-side storage required
- Conversion should happen in the browser
- The resulting file should be downloadable directly by the user

### Conversion Output

- One PDF file only
- One image per page only

### Progress Feedback

During conversion, the module must provide user feedback such as:
- Loading state
- Generating status
- Disabled duplicate-click state on convert button

### Completion State

Once generation is complete:
- File should be ready for download
- User should clearly understand that conversion succeeded
- User should be able to download the PDF

---

## 22. Download Requirements

### Output File Type

- PDF only for Phase 1

### File Name Behavior

The user should be able to download the PDF with:
- Custom file name if entered
- Otherwise a system default

### Download UX

After successful generation:
- Download should be obvious and immediate
- If generation and download are one action, the product should still show clear success/progress states

---

## 23. Data and State Model (Ephemeral)

Phase 1 does not require persistence, but engineering should use a normalized state model.

### Suggested Image Item Structure

Each uploaded image item should conceptually maintain:

```typescript
interface ImageItem {
  id: string;                    // Unique local ID
  file: File;                    // Original file object
  previewUrl: string;            // Object URL for preview
  filename: string;            // Original filename
  fileType: string;              // MIME type
  width: number;                 // Image width
  height: number;              // Image height
  orderIndex: number;            // Current position
  rotation: number;              // Rotation in degrees (0, 90, 180, 270)
  isValid: boolean;              // Validation state
}
```

### Suggested Module Settings State

```typescript
interface PDFSettings {
  pageSize: 'A4' | 'Letter' | 'Legal' | 'FitToImage';
  orientation: 'Portrait' | 'Landscape' | 'Auto';
  fitMode: 'Contain' | 'Cover' | 'ActualSize';
  marginPreset: 'None' | 'Small' | 'Medium';
  outputFilename: string;
}
```

### Suggested Module State Groups

- Upload state
- Organizer state
- Settings state
- Preview state
- Conversion state
- Error state

This state should live client-side only in Phase 1.

---

## 24. Technical Approach

### 24.1 Architecture Decision

PDF Studio should be implemented as a **client-side module** inside the existing web app.

### 24.2 Reason for Client-Side Approach

Client-side processing is appropriate in Phase 1 because:
- No need for backend infrastructure for conversion
- Fits Vercel/serverless deployment reality
- Avoids temporary server file handling complexity
- Improves privacy by keeping uploads in-browser
- Reduces operational overhead

### 24.3 Suggested Technical Stack Alignment

This module should align with the current web app stack:
- Next.js
- TypeScript
- Existing CSS/design system
- Existing component patterns where applicable

### 24.4 Core Implementation Layers

Engineering should think of the module in the following layers:

1. **Input Layer** - Handles file intake and validation
2. **Organizer Layer** - Handles thumbnail display, ordering, rotation, and removal
3. **Settings Layer** - Handles page/layout configuration
4. **Preview Layer** - Builds a client-side page representation
5. **PDF Generation Layer** - Converts the configured image sequence into a PDF blob/file
6. **Download Layer** - Triggers file download and manages result state

---

## 25. Recommended Engineering Components

### Top-Level Components

- PDF Studio Page / Shell
- Upload Zone
- Thumbnail Organizer
- Image Card / Thumbnail Card
- Settings Panel
- Combined Preview Panel
- Convert / Download Action Bar

### Likely Reusable UI Components

- Button
- Input
- Dropdown/select
- Segmented control / radio group
- File uploader
- Reorder list item
- Empty state block
- Error message component
- Loading state component

### Suggested Internal Utilities

- File validation utility
- Image metadata reader
- Orientation helper
- Page layout calculator
- PDF generation helper
- Filename sanitizer

---

## 26. Detailed Functional Requirements

### 26.1 Upload Functional Requirements

- User can upload one or more valid image files
- User can upload additional files after initial upload
- System rejects unsupported file types
- System rejects uploads beyond 30 total images
- Valid files should still process even if one invalid file is included where possible
- Thumbnails should appear after successful parsing

### 26.2 Organizer Functional Requirements

- System displays uploaded images in current order
- User can reorder images
- User can rotate images
- User can remove images
- Page numbering updates automatically
- Combined preview updates after changes

### 26.3 Settings Functional Requirements

- User can change page size
- User can change orientation
- User can change fit mode
- User can change margin preset
- Settings update preview
- Settings affect final generated PDF

### 26.4 Preview Functional Requirements

- Preview shows final page sequence
- Preview reflects current settings
- Preview reflects rotation state
- Preview updates with ordering changes

### 26.5 Conversion Functional Requirements

- User can only generate PDF when at least one valid image exists
- Conversion button should be disabled or blocked when no valid input is present
- Conversion generates a single PDF
- Output respects page order and settings

### 26.6 Download Functional Requirements

- Successful generation results in downloadable PDF
- Output file name uses user-provided or default value

---

## 27. Validation Rules

### Upload Validation

| Rule | Requirement |
|------|-------------|
| File type | Supported formats only |
| File count | Maximum 30 images |
| Corrupted files | Show error |
| Zero upload state | Must not allow conversion |

### Settings Validation

| Setting | Requirement |
|---------|-------------|
| Page size | Must be selected |
| Orientation | Must be selected |
| Fit mode | Must be selected |
| Margin preset | Must be selected |

Default values may be preselected to reduce friction.

### Filename Validation

- Blank filename falls back to default
- Invalid filename characters should be sanitized

---

## 28. Error Handling Requirements

The system must handle the following gracefully:

### Upload Errors

- Unsupported file type
- Too many files
- Unreadable/corrupt file
- Image decoding failure

### Preview Errors

- Preview generation failure for one image
- Layout update failure

### Conversion Errors

- PDF generation failure
- Memory/performance failure on large images
- Partial invalid image scenario

### User-Facing Error Standards

Error messages should be:
- Short
- Clear
- Human-readable
- Specific enough to act on

**Examples:**
- "Only JPG, JPEG, PNG, and WEBP files are supported."
- "You can upload up to 30 images in one conversion."
- "One of the images could not be processed. Please remove it and try again."

---

## 29. Empty, Loading, and Success States

### Empty State

When no images are uploaded, the module should show:
- Clear feature title
- Upload prompt
- Supported file types
- Page limit note

### Loading States

Show loading feedback during:
- File parsing
- Preview preparation if needed
- PDF generation

### Success State

After successful generation/download, the module should provide a clear success response, such as:
- Download success messaging
- Option to start over
- Option to adjust settings and regenerate if the user remains on the page

---

## 30. Edge Cases to Handle

Engineering and QA must handle the following cases:

### Upload Edge Cases

- User uploads 31+ images
- User uploads mixed valid and invalid file types
- User uploads duplicate files
- User uploads extremely large images
- User uploads transparent PNGs
- User uploads landscape and portrait images mixed together

### Organizer Edge Cases

- User rotates then reorders
- User reorders then removes a middle image
- User uploads more images after initial reorder
- Numbering remains stable and correct

### Settings Edge Cases

- Portrait images on landscape page
- Landscape images on portrait page
- Fit mode creates unexpected whitespace
- Cover mode crops too much if not implemented carefully
- Actual size behavior becomes visually odd

### Conversion Edge Cases

- Browser memory strain on large batches
- Failed generation mid-process
- One invalid image among valid images
- Preview looks fine but export breaks

### Mobile Edge Cases

- Reordering on touch devices
- Upload from mobile gallery
- Long list of thumbnails on smaller screens
- Preview readability on narrow screens

---

## 31. Performance Considerations

Because conversion is client-side, performance matters significantly.

### Requirements

- Module should remain usable for realistic image batches
- Preview updates should feel reasonably responsive
- Conversion should not freeze the UI without feedback
- Object URLs or temporary resources should be cleaned up properly when no longer needed

### Engineering Considerations

Engineering should consider:
- Image decoding efficiency
- Resizing/downscaling strategy if needed for large images
- Memory cleanup
- Preventing repeated conversion spam clicks

The goal is not perfect performance under absurd load, but a stable experience for normal real-world usage within the 30-image limit.

---

## 32. Accessibility and Usability Requirements

- Buttons must be clearly labeled
- Controls should have accessible touch targets on mobile
- Keyboard usability should be reasonable on desktop
- Preview and organizer should have understandable structure
- Page order should not rely only on visual guesswork
- Text contrast should remain strong enough for readability

---

## 33. Responsive Requirements

### Desktop

- Full-featured experience
- Side-by-side layout recommended
- Preview visible during settings changes

### Mobile

- Fully usable upload, organize, settings, preview, and download flow
- Stacked sections or step flow acceptable
- Controls must be finger-friendly
- Preview may be simplified but must remain meaningful

**Note:** This module cannot be desktop-only in its logic. It must work properly across both desktop and mobile.

---

## 34. Security and Privacy Considerations

Since all processing is client-side in Phase 1:
- Uploaded files should remain in-browser
- No server-side storage is required
- No user data persistence is required

Engineering should still ensure:
- Unsupported file types are rejected safely
- Malicious file assumptions are not made
- Object URLs are cleaned up appropriately
- No unnecessary logging of file metadata occurs

---

## 35. Suggested Default Values

To reduce friction, the module should provide sensible defaults:

| Setting | Default Value |
|---------|---------------|
| Page Size | A4 |
| Orientation | Auto |
| Fit Mode | Contain / Fit Within Page |
| Margins | Small |
| Output File Name | pdf-studio-document |

These defaults can be refined by design/product during implementation, but engineering should build with a default-state-first mindset.

---

## 36. Phased Delivery Recommendation

### Phase 1 (Core Launch)

- Upload
- Thumbnail organizer
- Reorder
- Rotate
- Remove
- Page settings
- Combined preview
- Client-side PDF generation
- Download
- Desktop + mobile responsiveness

### Phase 1.1 (Polish and Stability)

- Better large-image handling
- Improved mobile reordering UX
- Stronger progress feedback
- More refined preview fidelity
- Duplicate file handling improvements

### Phase 2 (Advanced Future Options)

- HEIC support
- Crop tool
- OCR
- PDF compression
- Merge PDFs + images
- Saved sessions/history
- Cloud storage

These future ideas should not leak into the engineering scope of Phase 1.

---

## 37. QA Checklist

### Upload

- [ ] Valid files upload successfully
- [ ] Invalid files show correct errors
- [ ] 30-image limit is enforced
- [ ] Additional uploads after initial upload work correctly

### Organizer

- [ ] Drag-and-drop reorder works
- [ ] Rotate left/right works
- [ ] Delete works
- [ ] Clear all works
- [ ] Page numbering updates correctly

### Settings

- [ ] Page size changes preview and output
- [ ] Orientation changes preview and output
- [ ] Fit mode changes preview and output
- [ ] Margin changes preview and output

### Preview

- [ ] Reflects actual order
- [ ] Reflects rotation
- [ ] Reflects selected settings
- [ ] Is usable on desktop and mobile

### Conversion

- [ ] PDF generates successfully
- [ ] Conversion state prevents duplicate action spam
- [ ] Generated PDF matches order and settings

### Download

- [ ] File downloads successfully
- [ ] Filename works correctly
- [ ] Default filename works when blank

### Responsive

- [ ] Upload works on mobile
- [ ] Organizer works on mobile
- [ ] Settings work on mobile
- [ ] Preview is accessible on mobile
- [ ] Conversion/download works on mobile

---

## 38. Acceptance Criteria

PDF Studio Phase 1 is complete when:

- [ ] The user can upload up to 30 valid images
- [ ] Uploaded images appear as thumbnails
- [ ] The user can reorder, rotate, and remove images
- [ ] The user can configure page size, orientation, fit mode, and margins
- [ ] The module provides a combined preview of the resulting document
- [ ] The module generates a single merged PDF client-side
- [ ] The user can download the generated PDF
- [ ] The module works on both desktop and mobile
- [ ] Errors, empty states, and loading states are handled cleanly
- [ ] The feature feels visually and behaviorally consistent with the existing app

---

## 39. Final Engineering Guidance

1. Build PDF Studio as a clean extension of the current product, not as a bolted-on utility
2. Prioritize clarity and reliability over unnecessary advanced features
3. Keep the state model clean because image order, rotation, settings, preview, and conversion are tightly linked
4. Make preview trustworthy enough that users feel safe downloading the final PDF
5. Treat mobile support as a real requirement, not an afterthought
6. Keep the implementation flexible enough for future upgrades like HEIC, OCR, and saved sessions, but do not build those into Phase 1

---

## 40. Final Scope Statement

**PDF Studio is a new client-side Image to PDF conversion module added to the existing web application.**

In Phase 1, it enables users to upload up to 30 images in supported formats, organize them through thumbnails, configure page settings, preview the combined output, and generate a single downloadable PDF.

The feature is designed for both desktop and mobile usage and intentionally excludes OCR, HEIC, cloud storage, saved sessions, and advanced PDF tooling until later phases.

---

*End of Document*
