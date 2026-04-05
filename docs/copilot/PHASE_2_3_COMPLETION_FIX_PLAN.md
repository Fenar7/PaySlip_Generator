# Phase 2-3 Completion Audit & Fix Plan
**Date:** Sunday, April 5, 2026  
**Branch:** `fix/phase-2-3-completion`  
**Status:** Plan approved → implementation pending

---

## Summary

A full audit of Phase 2 & 3 found **20 bugs and gaps** — many features are built but not wired up, leaving users with silent failures and dead UI buttons. This must be fixed before Phase 4.

---

## Bug Inventory

### 🔴 CRITICAL (5) — Feature completely non-functional

| # | Bug | Files Affected |
|---|-----|----------------|
| C1 | Template Store "Set Default" button does nothing — `onSetDefault` not passed in `templates/page.tsx` | `docs/templates/page.tsx` |
| C2 | Registry template IDs mismatch — voucher uses `"minimal"` but workspace expects `"minimal-office"` / `"traditional-ledger"`; salary slip uses `"professional"` but workspace expects `"corporate-clean"` / `"modern-premium"` | `lib/docs/templates/registry.ts` |
| C3 | Invoice `CustomerPicker` always empty — new + edit pages never fetch customers, `BrandingWrapper` doesn't accept or thread `customers` prop | `invoices/new/page.tsx`, `invoices/new/branding-wrapper.tsx`, `invoices/[id]/page.tsx` |
| C4 | Voucher `?template=` param completely ignored — `BrandingWrapper` and `VoucherWorkspace` have no `initialTemplateId` prop | `vouchers/new/branding-wrapper.tsx`, `voucher-workspace.tsx` |
| C5 | Salary slip `?template=` param completely ignored — same as C4 | `salary-slips/new/branding-wrapper.tsx`, `salary-slip-workspace.tsx` |

---

### 🟠 HIGH (7) — Feature silently broken

| # | Bug | Files Affected |
|---|-----|----------------|
| H1 | New doc pages don't apply org default templates — `getOrgDefaults()` never called | `invoices/new/page.tsx`, `vouchers/new/page.tsx`, `salary-slips/new/page.tsx` |
| H2 | `vouchers/new/page.tsx` missing `searchParams` — can't read `?template=` param at all | `vouchers/new/page.tsx` |
| H3 | `salary-slips/new/page.tsx` missing `searchParams` — same issue | `salary-slips/new/page.tsx` |
| H4 | Invoice save handlers: no error handling, silent failures | `invoice-workspace.tsx` |
| H5 | Voucher save handlers: `updateVoucher()` called with no result check | `voucher-workspace.tsx` |
| H6 | Salary slip save handlers: form resets even on failure; `releaseSalarySlip()` no error check | `salary-slip-workspace.tsx` |
| H7 | No toast library installed — no way to show user feedback on any action | `package.json`, `app/layout.tsx` |

---

### 🟡 MEDIUM (4) — Backend ready, no frontend UI

| # | Gap | Files Affected |
|---|-----|----------------|
| M1 | Invoice vault has no search input (backend `listInvoices({search})` works) | `docs/invoices/page.tsx` |
| M2 | Voucher vault has no search input | `docs/vouchers/page.tsx` |
| M3 | Salary slip vault has no search input | `docs/salary-slips/page.tsx` |
| M4 | Salary slip vault has no month/year filter UI (backend supports it) | `docs/salary-slips/page.tsx` |

---

### 🟢 LOW (2) — UX gaps

| # | Gap | Files Affected |
|---|-----|----------------|
| L1 | Home dashboard is fully static — no real stats or recent docs | `app/home/page.tsx` |
| L2 | Salary presets list has no pagination | `data/salary-presets/page.tsx` |

---

## Fix Plan (4 parallel agents)

### Agent 1: `fix-template-system` (Fixes C1, C2, C4, C5, H1, H2, H3)

1. **`registry.ts`** — Update template IDs:
   - Voucher templates: `"minimal-office"` and `"traditional-ledger"`  
   - Salary slip templates: `"corporate-clean"` and `"modern-premium"`
   - Invoice templates: unchanged (`"minimal"`, `"professional"`, `"bold-brand"`)

2. **`docs/templates/page.tsx`** — Convert to client wrapper:
   - Import `updateOrgDefaults` server action
   - Add `handleSetDefault(templateId, docType)` — calls action, shows toast
   - Pass as `onSetDefault={handleSetDefault}` to every `<TemplateCard />`

3. **`vouchers/new/page.tsx`** — Add `searchParams`, call `getOrgDefaults()`, pass `defaultVoucherTemplate` as fallback

4. **`salary-slips/new/page.tsx`** — Same for `defaultSlipTemplate`

5. **`invoices/new/page.tsx`** — Add `getOrgDefaults()` fallback for `defaultInvoiceTemplate`

6. **`vouchers/new/branding-wrapper.tsx`** — Add `initialTemplateId?: string` prop, thread to `VoucherWorkspace`

7. **`voucher-workspace.tsx`** — Add `initialTemplateId` prop; use to initialize `selectedTemplateId` state

8. **`salary-slips/new/branding-wrapper.tsx`** — Add `initialTemplateId?: string` prop

9. **`salary-slip-workspace.tsx`** — Add `initialTemplateId` prop; use to initialize `selectedTemplateId` state

---

### Agent 2: `fix-invoice-customer-picker` (Fixes C3)

1. **`invoices/new/page.tsx`** — Add `listCustomers({ limit: 200 })` fetch, pass to BrandingWrapper

2. **`invoices/new/branding-wrapper.tsx`** — Add `customers` prop to interface, thread through to `InvoiceWorkspace`

3. **`invoices/[id]/page.tsx`** — Add `listCustomers({ limit: 200 })` as parallel fetch with `getInvoice()`, pass to BrandingWrapper

---

### Agent 3: `fix-save-handlers-toast` (Fixes H4, H5, H6, H7)

1. **Install `sonner`** — `npm install sonner`

2. **`src/app/layout.tsx`** — Add `import { Toaster } from "sonner"` and `<Toaster richColors position="top-right" />`

3. **`invoice-workspace.tsx`** — Add `toast.success` / `toast.error` to `handleSaveDraft` and `handleIssue`

4. **`voucher-workspace.tsx`** — Add toast to `handleSaveDraft` and `handleApprove`; check `updateVoucher` result

5. **`salary-slip-workspace.tsx`** — Add toast to `handleSaveDraft` and `handleRelease`; guard form reset behind `result.success`

---

### Agent 4: `fix-vault-search-dashboard` (Fixes M1, M2, M3, M4, L1, L2)

1. **`docs/invoices/page.tsx`** — Add `<SearchForm>` component: `<input>` that submits `?search=` param via GET form

2. **`docs/vouchers/page.tsx`** — Same search input

3. **`docs/salary-slips/page.tsx`** — Add search input + month `<select>` + year `<select>` filters

4. **`app/home/page.tsx`** — Make `async`; fetch invoice KPIs (counts by status) + most recent 3 invoices/vouchers/salary slips; render stat pills and recent doc rows

5. **`data/salary-presets/page.tsx`** — Add `page` param, `limit`/`offset` to `listSalaryPresets()`, pagination controls

---

## Acceptance Gates

- [ ] Template Store "Set Default" persists to DB, shows success toast
- [ ] "Use Once" opens doc type with correct template pre-selected (voucher/salary ids now correct)
- [ ] New invoice/voucher/salary slip opens with org default template if no `?template=` param
- [ ] CustomerPicker on invoice new + edit pages shows real customers from DB
- [ ] Save Draft shows `"Saved successfully"` toast on all 3 doc types
- [ ] Save failure shows `"Failed to save"` toast (not silent)
- [ ] Issue Invoice shows toast on success and failure
- [ ] Release Salary Slip shows toast and does NOT reset form on failure
- [ ] Search input on invoice/voucher/salary slip vaults filters results correctly
- [ ] Month/year filter on salary slip vault filters by period
- [ ] Home dashboard shows real KPI counts and recent doc entries
- [ ] TypeScript: 0 errors | ESLint: 0 errors
