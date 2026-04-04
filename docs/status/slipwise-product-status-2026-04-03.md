# Slipwise — Product Status Report

**Date:** April 3, 2026  
**Product:** Slipwise  
**Repository:** `Fenar7/PaySlip_Generator`  
**Current Branch:** `feature/pdf-studio-missing-features`  
**Deploy Target:** Vercel (stateless, serverless)

---

## 1. What Is Slipwise?

Slipwise is a **browser-based, premium document generation SaaS product** built with Next.js. It lets users create professional business documents entirely in the browser — no accounts, no databases, no cloud storage required.

Users pick a module, fill in a form, see a live preview, and export a finished PDF or PNG.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, pdf-lib, Motion, Vitest, Playwright

**URL Structure:**
- `/` — Marketing homepage
- `/voucher` — Voucher Generator workspace
- `/salary-slip` — Salary Slip Generator workspace
- `/invoice` — Invoice Generator workspace
- `/pdf-studio` — PDF Studio workspace

---

## 2. Product Modules

### Module 1: Voucher Generator

**Route:** `/voucher` | **Category:** Operations

Generates payment and receipt vouchers with company branding.

**Features:**
- Payment and receipt voucher types
- 2 templates: Minimal Office, Traditional Ledger
- Company branding: logo upload, accent color, name, address, email, phone
- Fields: voucher number, date, counterparty, amount, payment mode, reference, purpose, notes
- Visibility toggles for optional sections (address, email, phone, payment mode, reference, notes, signatures)
- Amount in words (auto-generated)
- Live preview with template switching
- Export: PDF, PNG, browser print

**Templates:** `minimal-office.tsx`, `traditional-ledger.tsx`

---

### Module 2: Salary Slip Generator

**Route:** `/salary-slip` | **Category:** People Ops

Generates salary slips with structured earnings, deductions, and employee data.

**Features:**
- Company branding with logo and accent color
- Employee details: name, ID, department, designation, PAN, UAN, joining date, work location
- Pay period: month, year, pay date
- Attendance: working days, paid days, leave days, loss-of-pay days
- Dynamic earnings rows (repeatable)
- Dynamic deductions rows (repeatable)
- Auto-calculated totals: total earnings, total deductions, net salary
- Net salary in words (auto-generated)
- Bank details: name, masked account number, IFSC
- Visibility toggles for all optional sections
- 2 templates: Corporate Clean, Modern Premium
- Export: PDF, PNG, browser print

**Templates:** `corporate-clean.tsx`, `modern-premium.tsx`

---

### Module 3: Invoice Generator

**Route:** `/invoice` | **Category:** Finance

Generates branded invoices with line-item tax math and payment summary.

**Features:**
- Business and client identity blocks
- Shipping address support
- Tax IDs (business and client)
- Place of supply
- Dynamic line items with: description, quantity, unit price, discount, tax rate
- Auto-calculated per line: base amount, taxable amount, tax amount, line total
- Invoice totals: subtotal, total discount, total tax, extra charges, invoice-level discount, grand total, amount paid, balance due
- Amount in words (auto-generated)
- Bank details, notes, terms, signature, payment summary sections
- Visibility toggles for 17 optional sections
- 3 templates: Minimal, Professional, Bold Brand
- Export: PDF, PNG, browser print

**Templates:** `minimal.tsx`, `professional.tsx`, `bold-brand.tsx`

---

### Module 4: PDF Studio

**Route:** `/pdf-studio` | **Category:** Utilities

Client-side image-to-PDF converter. No server rendering needed — uses `pdf-lib` directly in the browser.

**Phase 1 Features (Complete):**
- Upload up to 30 images (JPG, PNG, WEBP)
- Drag-and-drop reordering via `@dnd-kit`
- Rotate left/right, delete, clear all
- Page settings: size (A4/Letter), orientation (auto/portrait/landscape), fit mode (contain/cover/actual), margins (none/small/medium/large)
- Custom filename
- Live multi-page preview
- Client-side PDF generation with progress indicator
- Auto-download

**Phase 2 Features (Complete — Slices 1-9):**

| Slice | Feature | Status |
|-------|---------|--------|
| 1 | Session Persistence (localStorage + IndexedDB) | ✅ Merged |
| 2 | Batch Operations (multi-select, bulk delete/rotate) | ✅ Merged |
| 3 | Image Cropping (drag-to-crop, aspect ratio presets) | ✅ Merged |
| 4 | HEIC/HEIF Support (via `libheif-js`) | ✅ Merged |
| 5 | OCR Text Layer (via `tesseract.js`, English) | ✅ Merged |
| 6 | Watermarking (text + image, 9-position grid, rotation, opacity, live preview) | ✅ Merged |
| 7 | Page Numbers (5 positions, 4 formats, skip first page) | ✅ Merged |
| 8 | Password Protection (AES-256 encryption via `@pdfsmaller/pdf-encrypt`, strength indicator) | ✅ Merged |
| 9 | Compression & Metadata (quality slider, title/author/subject/keywords, estimated size) | ✅ Merged |

**Supported Image Formats:** JPG, JPEG, PNG, WEBP, HEIC, HEIF

---

## 3. Shared Infrastructure

### Homepage
- Premium marketing landing page with animated hero
- Module cards linking to each workspace
- GSAP/Motion animations
- Responsive design

### Workspace Shell
- Shared `document-workspace-layout.tsx` chrome for voucher, salary-slip, invoice
- Form on left, live preview on right (desktop) / tabbed (mobile)
- Template switcher, export controls, print button
- Export dialog with pending/success/error states

### Form System
- Shared primitives: `input-primitives.tsx`, `field-shell.tsx`, `form-section.tsx`, `repeater-section.tsx`
- `react-hook-form` + `zod` validation
- Schema-driven forms per module

### Branding System
- Per-session branding: company name, address, email, phone, logo (data URL), accent color
- Applied across all document modules (voucher, salary-slip, invoice)

### Export Pipeline
- **Client flow:** POST to binary API endpoint → download blob
- **Server rendering:** Local Chrome CLI (dev) / Puppeteer + `@sparticuz/chromium` (Vercel)
- **Print flow:** Session-backed handoff to print page
- PDF and PNG export for voucher, salary-slip, invoice
- PDF Studio exports client-side only (no server rendering)

### Brand Identity
- Product name: **Slipwise**
- Font: Lato (Google Fonts)
- Style: Premium, calm, editorially refined
- Visual direction: Warm, mature, restrained (not blue SaaS)

---

## 4. Current Phase & Branch Status

### What's Merged to `master`

| Work | PR | Status |
|------|----|--------|
| Foundation shell | - | ✅ |
| Voucher module (Phase 1) | - | ✅ |
| Salary Slip module (Phase 1) | - | ✅ |
| Invoice module (Phase 1) | - | ✅ |
| Export runtime fix | #22 | ✅ |
| Homepage redesign (Phase 2) | #24 | ✅ |
| Workspace shell redesign (Phase 3) | #25 | ✅ |
| Component polish (Phase 4) | #26 | ✅ |
| Production readiness (Phase 5) | #27 | ✅ |
| PDF Studio Phase 1 | #28 | ✅ |
| PDF Studio Slices 4-5 (HEIC + OCR) | - | ✅ |
| PDF Studio Slices 6-7 (Watermark + Page Numbers) | - | ✅ |
| PDF Studio Slices 8-9 (Password + Compression) | #32 | ✅ |
| OCR reliability improvements | #33 | ✅ |
| PDF password encryption (AES-256) | - | ✅ |

### Active Feature Branch

**`feature/pdf-studio-missing-features`** (2 commits ahead of master)

Contains:
- Session persistence for OCR results and image watermark restore
- PDF Studio missing features implementation (P2-P5 from missing features PRD)
- CI fix for Gemini workflow auth

**Not yet merged to master.**

---

## 5. Known Gaps & Remaining Work

### PDF Studio Production Gaps (from Missing Features PRD)

| Priority | Gap | Status |
|----------|-----|--------|
| P1 | OCR reliability and searchable PDF quality | ⚠️ Improved, not fully production-ready |
| P2 | Session restore for OCR + image watermark | ✅ Fixed on feature branch |
| P3 | Password encryption production hardening | ⚠️ Working, needs edge-case hardening |
| P4 | Cancellation of long-running OCR/export jobs | 🚧 Not implemented |
| P5 | OCR workflow controls (language, scope) | 🚧 Limited (English-only) |

### Product-Wide Exclusions (by design)

These are intentionally **not in scope** for the current product:
- Authentication and user accounts
- Saved drafts or document history
- Persistent company profiles
- Database-backed storage
- Recurring invoices or billing automation
- Payroll automation and compliance
- Team collaboration or approval flows

---

## 6. Technical Summary

### Dependencies

| Package | Purpose |
|---------|---------|
| `next` 16.2.1 | App framework |
| `react` 19.2.4 | UI library |
| `tailwindcss` 4 | Styling |
| `pdf-lib` 1.17.1 | Client-side PDF generation |
| `@dnd-kit/*` | Drag-and-drop (PDF Studio) |
| `libheif-js` 1.19.8 | HEIC/HEIF image decoding |
| `tesseract.js` 7.0.0 | Browser-side OCR |
| `@pdfsmaller/pdf-encrypt` 1.0.2 | PDF password encryption |
| `pdfjs-dist` 5.5.207 | PDF rendering/preview |
| `react-hook-form` 7.72.0 | Form management |
| `zod` 4.3.6 | Schema validation |
| `motion` 12.23.24 | Animations |
| `gsap` 3.14.2 | Homepage animations |
| `@sparticuz/chromium` 143.0.4 | Serverless PDF/PNG rendering |
| `puppeteer` 24.40.0 | Server-side browser rendering |

### Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Homepage
│   ├── voucher/                  # Voucher route
│   ├── salary-slip/              # Salary Slip route
│   ├── invoice/                  # Invoice route
│   ├── pdf-studio/               # PDF Studio route
│   └── api/export/               # Server export endpoints
├── features/
│   ├── voucher/                  # Voucher module (21 files)
│   ├── salary-slip/              # Salary Slip module (20 files)
│   ├── invoice/                  # Invoice module (21 files)
│   └── pdf-studio/               # PDF Studio module (33 files)
├── components/
│   ├── foundation/               # Shared workspace shell, brand, preview
│   ├── marketing/                # Homepage components
│   ├── forms/                    # Shared form primitives
│   └── document/                 # Shared document components
└── lib/
    ├── modules.ts                # Module registry
    ├── branding.ts               # Branding types
    ├── browser/                  # Client export helpers
    ├── export/                   # Server export utilities
    └── server/                   # Server-side helpers
```

### Testing

- **Unit tests:** Vitest + Testing Library
- **E2E tests:** Playwright
- **Test commands:** `npm test`, `npm run test:e2e`
- **Coverage areas:** Schema validation, workspace rendering, export routes, PDF generation

---

## 7. How It Works (User Flow)

### Document Modules (Voucher, Salary Slip, Invoice)

1. User visits homepage → clicks a module card
2. Workspace loads with editable form defaults
3. User fills in the form (left panel)
4. Live preview updates in real-time (right panel)
5. User can switch templates, toggle optional sections
6. User clicks Export PDF/PNG → client POSTs to server → downloads file
7. User clicks Print → opens print-ready surface

### PDF Studio

1. User visits `/pdf-studio`
2. Uploads images (drag-drop or file picker, up to 30)
3. Organizes: reorder, rotate, crop, batch select/delete
4. Configures: page size, orientation, margins, fit mode
5. Optional: enables watermark, page numbers, OCR, password, metadata
6. Previews combined PDF with live watermark overlay
7. Clicks Generate → client-side PDF built with pdf-lib → auto-download
8. Session auto-saved to localStorage/IndexedDB for recovery

---

## 8. Deployment

| Setting | Value |
|---------|-------|
| Platform | Vercel |
| Runtime | Node.js serverless functions |
| Database | None |
| Auth | None |
| Storage | None (stateless) |
| Dev export | Local Chrome CLI |
| Prod export | Puppeteer + @sparticuz/chromium |

---

*End of Status Report*
