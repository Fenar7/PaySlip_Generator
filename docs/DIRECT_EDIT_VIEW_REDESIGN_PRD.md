# Direct Edit View — Document Editor Redesign PRD

**Status:** Ready for Engineering  
**Branch target:** `feature/direct-edit-view` (open PR #36)  
**Modules in scope:** Invoice · Voucher · Salary Slip  

---

## 1. Problem Statement

The Direct Edit View feature (Form/Document view toggle) was implemented and shipped to PR #36. However, the Document View editors look visually broken when compared to the read-only template previews in Form View.

### Root Cause
The three document editors (`invoice-document-editor.tsx`, `voucher-document-editor.tsx`, `salary-slip-document-editor.tsx`) were written using a *generic* card layout — an accent colour stripe, `--border-strong` CSS vars, and bespoke spacing — instead of mirroring the design language of the actual read-only templates. This results in:

| Issue | Detail |
|---|---|
| Different layout structure | Template: column-based sections with rounded cards. Editor: single card with top stripe |
| Wrong CSS variables | Templates use `--voucher-ink` / `--voucher-accent`. Editors use `--foreground` / `--border-strong` |
| Mismatched typography | Template: `text-[1.85rem] font-medium`, `text-[0.68rem] uppercase tracking-[0.25em]`. Editor: `text-lg font-semibold` |
| Wrong border radii & colours | Template: `rounded-[1.5rem] border-[rgba(29,23,16,0.08)]`. Editor: `rounded-2xl border-[var(--border-strong)]` |
| Date picker icon visible | `<input type="date">` renders the browser's native calendar icon inside the document |
| Accent amount box missing | Template has an accent-coloured sidebar card for key amounts. Editor shows a plain text amount |
| Signature section wrong | Template: 2-column cards with dashed underline. Editor: generic divider line |

### Visual Evidence
- **Form View (correct):** Shows `minimal-office` voucher template — beautiful rounded card layout, accent amount box, proper typography
- **Document View (broken):** Shows generic layout completely different from the template, including calendar icons on date fields

---

## 2. Goals

1. Document View should be **visually indistinguishable** from the Form View template preview — same layout, same colour language, same typography — with the static text simply replaced by editable inline inputs
2. **Date fields** must not show the browser-native calendar picker icon
3. All inline edit inputs must inherit the surrounding document's colour and typography (not override with generic theme vars)
4. The `--voucher-ink` and `--voucher-accent` CSS variables must be set on each editor's root element — exactly as `*-document-frame.tsx` does it
5. Add/remove row functionality (line items, earnings, deductions) preserved and visually integrated into the template layout
6. TypeScript: 0 errors · Tests: all 167 passing · No visual regressions in Form View

---

## 3. Non-Goals

- **Template switching in Document View** — the editor shows a fixed layout matching the default/primary template for each module; it does not switch when the user selects a different template in the Form View Setup step
- **New templates** — no new templates are being added
- **Export from Document View** — exports still go through the existing render pipeline via Form View values
- **PDF Studio** — out of scope

---

## 4. Design System Reference

All three templates share a consistent design system. Engineers must use these exact values — no generic CSS variables unless specified.

### Colour Tokens (raw values, not CSS vars)

| Role | Value |
|---|---|
| Main text | `text-[var(--voucher-ink)]` where `--voucher-ink: #1d1710` |
| Secondary text | `text-[rgba(29,23,16,0.72)]` |
| Label / caption | `text-[rgba(29,23,16,0.45)]` |
| Body text in cards | `text-[rgba(29,23,16,0.82)]` |
| Card background (primary) | `bg-[rgba(255,255,255,0.86)]` to `bg-[rgba(255,255,255,0.96)]` |
| Card background (notes/dashed) | `bg-[rgba(255,255,255,0.72)]` |
| Table row divider | `border-[rgba(29,23,16,0.07)]` |
| Section divider | `border-[rgba(29,23,16,0.08)]` |
| Dashed border (notes/signature) | `border-[rgba(29,23,16,0.12)]` to `border-[rgba(29,23,16,0.16)]` |
| Accent foreground (on accent bg) | `text-white`, `text-white/70`, `text-white/82` |

### Typography Tokens

| Role | Classes |
|---|---|
| Document title label | `text-[0.65rem] font-semibold uppercase tracking-[0.34em]` |
| Company name | `text-[1.85rem] font-medium leading-tight` |
| Section field label | `text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[rgba(29,23,16,0.45)]` |
| Field value (primary) | `text-base font-medium` |
| Field value (body) | `text-sm leading-7` |
| Accent key value | `text-3xl font-medium text-white` |
| Table header | `text-[0.68rem] uppercase tracking-[0.2em] text-[rgba(29,23,16,0.52)]` |

### Shape Tokens

| Role | Classes |
|---|---|
| Primary card | `rounded-[1.5rem] border border-[rgba(29,23,16,0.08)]` |
| Secondary card | `rounded-[1.4rem]` |
| Sub-card / table wrapper | `rounded-[1.35rem]` |
| Summary total row bg | `rounded-[1rem] bg-[rgba(29,23,16,0.04)]` |
| Signature dashed line | `h-16 border-b border-dashed border-[rgba(29,23,16,0.16)]` |

### CSS Variable Setup (editor root)

Every editor must set `--voucher-ink` and `--voucher-accent` on its root element, exactly as `VoucherDocumentFrame` does:

```tsx
<div
  className="mx-auto w-full max-w-[794px] space-y-6 bg-white p-8 text-[var(--voucher-ink)]"
  style={{
    "--voucher-ink": "#1d1710",
    "--voucher-accent": branding.accentColor || "var(--accent)",
  } as CSSProperties}
>
```

---

## 5. Inline Edit Field Primitives — Updated Spec

File: `src/components/document/inline-edit-fields.tsx`

### Problems with current implementation
- Base class uses `var(--foreground)` and `var(--surface-soft)` — not `var(--voucher-ink)` 
- `InlineDateField` shows browser-native calendar icon
- `InlineNumberField` shows browser-native spin buttons
- Hover/focus background uses `var(--surface-soft)` which is a generic theme variable and may not exist in the document frame context

### Required changes

```ts
// Updated baseClass — use voucher-ink colours, not --foreground
const baseClass =
  "bg-transparent border-0 border-b border-transparent w-full rounded-none px-0 py-0.5 transition-all outline-none " +
  "text-[var(--voucher-ink)] " +
  "placeholder:text-[rgba(29,23,16,0.3)] " +
  "hover:border-b-[rgba(29,23,16,0.25)] hover:bg-[rgba(29,23,16,0.025)] " +
  "focus:border-b-[var(--voucher-accent)] focus:bg-transparent";
```

For `InlineDateField`: add class `document-inline-date` which hides the calendar icon:

```css
/* src/app/globals.css — add before @media print */
.document-inline-date::-webkit-calendar-picker-indicator {
  display: none;
  -webkit-appearance: none;
}
.document-inline-date::-webkit-inner-spin-button {
  display: none;
}
```

For `InlineNumberField`: add class `document-inline-number`:
```css
.document-inline-number::-webkit-outer-spin-button,
.document-inline-number::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.document-inline-number { -moz-appearance: textfield; }
```

---

## 6. Slices

---

### Slice 1 — Infrastructure: CSS Fixes & Editor Frame

**Goal:** Fix inline field primitives + add CSS vars wrapper. No layout changes yet.

**Files changed:**

#### `src/app/globals.css`
Add before `@media print`:
```css
/* Document inline edit field resets */
.document-inline-date::-webkit-calendar-picker-indicator,
.document-inline-date::-webkit-inner-spin-button {
  display: none;
  -webkit-appearance: none;
}
.document-inline-number::-webkit-outer-spin-button,
.document-inline-number::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.document-inline-number {
  -moz-appearance: textfield;
}
```

#### `src/components/document/inline-edit-fields.tsx`
- Update `baseClass` to use `--voucher-ink` colours (see spec above)
- Add `document-inline-date` class to `InlineDateField`
- Add `document-inline-number` class to `InlineNumberField`
- Export a new `DocumentEditorRoot` wrapper component:

```tsx
import type { CSSProperties, ReactNode } from "react";
import type { BrandingConfig } from "@/lib/branding";

export function DocumentEditorRoot({
  branding,
  children,
}: {
  branding: BrandingConfig;
  children: ReactNode;
}) {
  return (
    <div
      className="mx-auto w-full max-w-[794px] space-y-6 bg-white p-8 text-[var(--voucher-ink)]"
      style={{
        "--voucher-ink": "#1d1710",
        "--voucher-accent": branding.accentColor || "var(--accent)",
      } as CSSProperties}
    >
      {children}
    </div>
  );
}
```

**Acceptance criteria:**
- [ ] Date fields show no calendar icon when rendered in Document View
- [ ] Number fields show no spin buttons
- [ ] `InlineTextField` placeholder text is visibly muted (rgba 29,23,16 at ~30%)
- [ ] TypeScript compiles with 0 errors
- [ ] All 167 tests pass

---

### Slice 2 — Voucher Document Editor Redesign

**Goal:** Rewrite `voucher-document-editor.tsx` to exactly match `minimal-office.tsx`'s layout and CSS, with all static text replaced by `InlineTextField` / `InlineTextArea` / `InlineDateField` / `InlineSelectField`.

**File:** `src/features/voucher/components/voucher-document-editor.tsx`

**Layout spec** (mirrors `minimal-office.tsx` section by section):

```
┌─ DocumentEditorRoot (sets --voucher-ink, --voucher-accent) ──────────────────┐
│                                                                               │
│  ── Section 1: Header Brand ─────────────────────────────────────────────   │
│  [DocumentBrandMark]  [InlineTextField: title label]                         │
│                       [InlineTextField: company name] (text-[1.85rem])       │
│                       [InlineTextField: address] · [email] · [phone]         │
│  border-b border-[rgba(29,23,16,0.08)] pb-6                                  │
│                                                                               │
│  ── Section 2: Meta grid (md:grid-cols-[1.15fr_0.85fr]) ──────────────────  │
│  Left card: rounded-[1.5rem] border bg-[rgba(255,255,255,0.86)] p-5         │
│   ┌── sm:grid-cols-2 ────────────────────────────────┐                      │
│   │ Voucher no.          │  Date                     │                      │
│   │ [InlineTextField]    │  [InlineDateField]         │                      │
│   │                      │                            │                      │
│   │ Paid To / Recv From  │  Payment Mode              │                      │
│   │ [InlineTextField]    │  [InlineSelectField]       │                      │
│   │                      │                            │                      │
│   │ Reference (col-span-2)                            │                      │
│   │ [InlineTextField]                                 │                      │
│   └────────────────────────────────────────────────-─┘                      │
│  Right card: rounded-[1.5rem] bg-[var(--voucher-accent)] p-5 text-white     │
│   AMOUNT label (text-[0.68rem] uppercase text-white/70)                     │
│   [InlineNumberField: amount] (text-3xl font-medium text-white)             │
│   {doc.amountInWords} (text-sm text-white/82) ← display only               │
│                                                                               │
│  ── Section 3: Purpose ───────────────────────────────────────────────────  │
│  rounded-[1.5rem] border bg-[rgba(255,255,255,0.9)] p-5                     │
│  Purpose / Narration label                                                   │
│  [InlineTextArea: purpose]                                                   │
│                                                                               │
│  ── Section 4: Notes (conditional — always show in editor) ───────────────  │
│  rounded-[1.5rem] border-dashed border-[rgba(29,23,16,0.12)] p-5           │
│  Notes label                                                                 │
│  [InlineTextArea: notes]                                                     │
│                                                                               │
│  ── Section 5: Approvals (grid-cols-2) ───────────────────────────────────  │
│  Left card: rounded-[1.5rem] border bg-[rgba(255,255,255,0.9)] p-5         │
│   Signature dashed line (h-16)                                               │
│   Approved by: [InlineTextField: approvedBy]                                │
│  Right card: same structure                                                  │
│   Signature dashed line (h-16)                                               │
│   Received by: [InlineTextField: receivedBy]                                │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────  ┘
```

**Key implementation notes:**
- `DocumentEditorRoot` wraps everything
- `DocumentBrandMark` renders logo/initials — no changes needed  
- `counterpartyLabel` text comes from `doc.counterpartyLabel` (reactive: "Paid to" or "Received from") — render as static label above `InlineTextField name="counterpartyName"`
- `amountInWords` is display-only; recomputed via `doc.amountInWords` from `normalizeVoucher(useWatch())`
- The `InlineTextField` for company name should have `className="mt-3 text-[1.85rem] font-medium leading-tight"` 
- Remove accent stripe at top of card (that's the old design)
- No white card wrapper around everything — the sections themselves are the cards (matching the template)

**Acceptance criteria:**
- [ ] Toggling to Document View on `/voucher` looks visually identical to the Form View preview
- [ ] Typing in company name field instantly updates the header
- [ ] Amount in words updates live as amount is typed
- [ ] Approved By / Received By fields appear inside the signature cards
- [ ] TypeScript 0 errors, tests pass

---

### Slice 3 — Invoice Document Editor Redesign

**Goal:** Rewrite `invoice-document-editor.tsx` to exactly match `minimal.tsx`'s layout and CSS.

**File:** `src/features/invoice/components/invoice-document-editor.tsx`

**Layout spec** (mirrors `minimal.tsx`):

```
┌─ DocumentEditorRoot ─────────────────────────────────────────────────────── ┐
│                                                                               │
│  ── Section 1: Header ────────────────────────────────────────────────────  │
│  border-b border-[rgba(29,23,16,0.08)] pb-6                                  │
│  Left: flex gap-4                                                             │
│   [DocumentBrandMark]                                                        │
│   [InlineTextField: title label (text-[0.68rem] uppercase)]                 │
│   [InlineTextField: company name (text-[1.95rem])]                          │
│   [InlineTextField: address, email, phone, website, GSTIN]                  │
│  Right: rounded-[1.4rem] border bg-[rgba(255,255,255,0.88)] px-5 py-4       │
│   Invoice no. label · [InlineTextField: invoiceNumber] (text-xl font-medium)│
│   Invoice date label · [InlineDateField: invoiceDate]                       │
│   Due date label · [InlineDateField: dueDate]                               │
│                                                                               │
│  ── Section 2: Bill To + Balance Due (md:grid-cols-[1.1fr_0.9fr]) ────────  │
│  Left: rounded-[1.5rem] border bg-[rgba(255,255,255,0.86)] p-5              │
│   Bill to label                                                              │
│   [InlineTextField: clientName] (font-medium)                               │
│   [InlineTextField: clientAddress, clientEmail, clientPhone, clientTaxId]   │
│  Right: rounded-[1.5rem] p-5 text-white bg=[--voucher-accent]               │
│   Balance due label (text-white/72)                                          │
│   {doc.balanceDueFormatted} (text-3xl font-medium) ← display only          │
│   {doc.amountInWords} (text-sm text-white/82) ← display only               │
│                                                                               │
│  ── Section 3: Shipping / Place of Supply (grid-cols-2, conditional) ─────  │
│  Left: rounded-[1.5rem] border bg-[rgba(255,255,255,0.86)] p-5             │
│   Ship to label · [InlineTextArea: shippingAddress]                         │
│  Right: same                                                                 │
│   Place of supply label · [InlineTextField: placeOfSupply]                 │
│                                                                               │
│  ── Section 4: Line Items Table ──────────────────────────────────────────  │
│  overflow-hidden rounded-[1.5rem] border border-[rgba(29,23,16,0.08)]       │
│  <table className="w-full border-collapse text-left text-[0.82rem]">        │
│  <thead className="document-table-head bg-[rgba(29,23,16,0.04)]            │
│          text-[0.68rem] uppercase tracking-[0.2em] text-[rgba(29,23,16,0.52)]">│
│   Description | Qty | Unit | Discount | Tax | Total | (remove col)         │
│  <tbody>                                                                     │
│   [useFieldArray rows — each cell is InlineTextField/InlineNumberField]     │
│   "Total" column cell: display-only lineTotalFormatted                       │
│   Remove (×) button: last column, visible on row hover                       │
│  + Add line item button (below table)                                        │
│                                                                               │
│  ── Section 5: Notes/Terms + Totals (md:grid-cols-[1fr_18rem]) ───────────  │
│  Left:                                                                       │
│   Notes: rounded-[1.5rem] border-dashed · [InlineTextArea: notes]          │
│   Terms: rounded-[1.5rem] border · [InlineTextArea: terms]                 │
│  Right: rounded-[1.5rem] border bg-[rgba(255,255,255,0.92)] p-5            │
│   space-y-3 text-sm rows:                                                   │
│   Subtotal: {doc.subtotalFormatted}                                         │
│   Discount: {doc.totalDiscountFormatted}                                    │
│   Tax: {doc.totalTaxFormatted}                                               │
│   Extra charges: {doc.extraChargesFormatted}                                │
│   Invoice discount: {doc.invoiceLevelDiscountFormatted}                     │
│   border-t Total: {doc.grandTotalFormatted} (font-medium)                  │
│   Paid: {doc.amountPaidFormatted}                                           │
│   Due: {doc.balanceDueFormatted} (text-[var(--voucher-accent)] font-medium) │
│   All values display-only; computed via normalizeInvoice(useWatch())        │
│   Extra charges and amount-paid editable fields sit BELOW totals block:     │
│   [InlineNumberField: extraCharges] [InlineNumberField: amountPaid]        │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────  ┘
```

**Key implementation notes:**
- Table structure: use `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` — not divs — to match template
- `thead` has `document-table-head` class (for print-repeat behaviour)
- Each `<tr>` in tbody has `document-table-row-avoid border-t border-[rgba(29,23,16,0.07)]`
- `useFieldArray("lineItems")` — append uses `{ description: "", quantity: "1", unitPrice: "", taxRate: "18", discountAmount: "0" }`
- Remove button only shown when `fields.length > 1`
- Bank details section can remain as a simple labelled group at the bottom (not in a card; just a `border-t` separator followed by fields)
- Signature: right-aligned, `h-12 border-b border-dashed border-[rgba(29,23,16,0.16)]` then `InlineTextField: authorizedBy`

**Acceptance criteria:**
- [ ] Invoice Document View looks visually identical to the Form View minimal template preview
- [ ] Line items can be added and removed inline
- [ ] Totals update live as quantities/prices/rates are changed
- [ ] Balance due accent box shows correct value
- [ ] TypeScript 0 errors, tests pass

---

### Slice 4 — Salary Slip Document Editor Redesign

**Goal:** Rewrite `salary-slip-document-editor.tsx` to exactly match `modern-premium.tsx`'s layout and CSS.

**File:** `src/features/salary-slip/components/salary-slip-document-editor.tsx`

**Layout spec** (mirrors `modern-premium.tsx`):

```
┌─ DocumentEditorRoot ─────────────────────────────────────────────────────── ┐
│                                                                               │
│  ── Section 1: Header Card ───────────────────────────────────────────────  │
│  rounded-[1.6rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.98), │
│   rgba(247,241,232,0.96))] p-6                                              │
│                                                                               │
│  Top row: justify-between                                                    │
│  Left: flex gap-4                                                            │
│   [DocumentBrandMark]                                                        │
│   Salary Slip label (text-[0.68rem] uppercase)                              │
│   [InlineTextField: employeeName] (text-[2rem] font-medium)                 │
│   {doc.payPeriodLabel} · {doc.payDate} (display text via watch)             │
│  Right: text-right text-sm                                                  │
│   [InlineTextField: branding.companyName] (font-medium)                    │
│   [InlineTextField: branding.address, email, phone]                        │
│                                                                               │
│  Bottom row: mt-6 md:grid-cols-[1.15fr_0.85fr] gap-4                       │
│  Left: rounded-[1.35rem] border bg-white/88 p-5                            │
│   Employee profile label                                                    │
│   sm:grid-cols-2 grid gap-3 text-sm:                                        │
│   [InlineTextField: employeeId] [InlineTextField: department]               │
│   [InlineTextField: designation] [InlineTextField: workLocation]            │
│   [InlineDateField: joiningDate] [InlineTextField: pan]                    │
│   [InlineTextField: uan]                                                    │
│  Right: grid gap-3 (3 stacked summary cards)                               │
│   SummaryCard "Earnings" → {doc.totalEarningsFormatted} (display)          │
│   SummaryCard "Deductions" → {doc.totalDeductionsFormatted} (display)      │
│   SummaryCard "Net salary" → {doc.netSalaryFormatted} (accent bg, display) │
│                                                                              │
│  ── Section 2: Earnings & Deductions + Side Panel ─────────────────────── │
│  lg:grid-cols-[1.05fr_0.95fr] gap-4                                        │
│                                                                              │
│  Left: rounded-[1.35rem] border bg-[rgba(255,255,255,0.95)] p-5           │
│   "Earnings and deductions" label                                           │
│   sm:grid-cols-2 grid gap-4:                                               │
│   Left column — Earnings:                                                   │
│    "Earnings" subheading (text-sm font-medium text-[rgba(29,23,16,0.72)])  │
│    divide-y list: [InlineTextField: label] [InlineTextField: amount] [×]   │
│    + Add earning button                                                      │
│   Right column — Deductions:                                                │
│    "Deductions" subheading                                                  │
│    divide-y list: [InlineTextField: label] [InlineTextField: amount] [×]   │
│    + Add deduction button                                                   │
│                                                                              │
│  Right: space-y-4                                                           │
│   Net salary in words card:                                                 │
│    rounded-[1.35rem] border bg-[rgba(255,255,255,0.95)] p-5               │
│    {doc.netSalaryInWords} (text-lg leading-8 display-only)                 │
│   Attendance card (conditional):                                            │
│    rounded-[1.35rem] border bg-[rgba(255,255,255,0.95)] p-5               │
│    sm:grid-cols-2 inline fields: workingDays / paidDays / leaveDays / LOP  │
│   Notes card (dashed):                                                      │
│    [InlineTextArea: notes]                                                  │
│                                                                              │
│  ── Section 3: Signature (md:grid-cols-2) ─────────────────────────────── │
│  Left: rounded-[1.35rem] border bg-[rgba(255,255,255,0.95)] p-5           │
│   h-16 border-b dashed signature line                                      │
│   Prepared by: [InlineTextField: preparedBy]                               │
│  Right: same card                                                           │
│   h-16 border-b dashed signature line                                      │
│   "Employee acknowledgement" (static label)                                │
│                                                                              │
│  ── Section 4: Disbursement (below signature, or merge into header) ─────  │
│  rounded-[1.35rem] border bg-[rgba(255,255,255,0.95)] p-5                 │
│  grid sm:grid-cols-4 gap-3 text-sm                                         │
│  Payment method / Bank / Account No. / IFSC                                │
│  [InlineTextField] for each                                                 │
│                                                                              │
└───────────────────────────────────────────────────────────────────────────  ┘
```

**Key implementation notes:**
- `SummaryCard` is a local helper component that renders the same card as the template (accent variant for net salary)
- Earnings/deductions rows: NOT a `<table>` — use `div.grid.grid-cols-[1fr_auto]` with `divide-y` (matching `modern-premium.tsx`)
- Remove button sits at end of each row: small `×` ghost button in the auto column
- `payPeriodLabel` and `payDate` display text is computed from `doc` (display-only line), but `month`, `year`, `payDate` are editable inline fields that generate those values
- `useFieldArray` for both `earnings` and `deductions` — append defaults: `{ label: "", amount: "" }`

**Acceptance criteria:**
- [ ] Salary Slip Document View looks visually identical to the Form View modern-premium template preview
- [ ] Earnings and deductions can be added and removed inline
- [ ] All three summary cards update live (Earnings, Deductions, Net Salary)
- [ ] Net salary in words text updates live
- [ ] TypeScript 0 errors, tests pass

---

### Slice 5 — QA, Polish & PR Update

**Goal:** Visual QA all three modules, verify all edge cases, push to PR.

#### Sub-tasks

**5.1 TypeScript check**
```bash
npx tsc --noEmit
```
Must produce 0 errors.

**5.2 Test suite**
```bash
npx vitest run
```
Must produce 167/167 (or more if new tests are added) passing.

**5.3 Visual QA checklist**

For each of the three modules:

| Check | Invoice | Voucher | Salary Slip |
|---|---|---|---|
| Document view layout matches template preview | ☐ | ☐ | ☐ |
| No calendar icon on date fields | ☐ | ☐ | ☐ |
| Toggling Form→Document→Form preserves all values | ☐ | ☐ | ☐ |
| Accent amount/balance/net-salary box correct colour | ☐ | ☐ | ☐ |
| Add row appends editable row | ☐ | N/A | ☐ |
| Remove row works (min 1 row enforced) | ☐ | N/A | ☐ |
| Totals update live on field change | ☐ | ☐ | ☐ |
| Amount in words updates live | N/A | ☐ | ☐ |
| Logo/initials renders in header | ☐ | ☐ | ☐ |
| Mobile: view mode switcher row visible | ☐ | ☐ | ☐ |
| Mobile: document view takes full width | ☐ | ☐ | ☐ |
| Form view completely unchanged | ☐ | ☐ | ☐ |

**5.4 Edge cases to verify**

- Empty state: all fields empty — document still renders cleanly with placeholder text showing
- Long text: company name > 40 chars — wraps correctly, doesn't overflow card
- Zero amount: `₹0.00` renders in accent box without breaking layout
- Single line item (remove button hidden)
- Many line items (10+): table scrolls or wraps, totals still correct
- Missing logo: `DocumentBrandMark` shows company initials correctly
- Dark accent colour: `accentColor: "#1a1a1a"` — white text on accent box still legible
- Light accent colour: `accentColor: "#fffbe6"` — verify white text is still applied (it always is by design)

**5.5 Commit & push**
```bash
git add src/ && \
git commit -m "fix: redesign document editors to match template visual language

- Rewrite voucher-document-editor to mirror minimal-office template exactly
- Rewrite invoice-document-editor to mirror minimal template exactly
- Rewrite salary-slip-document-editor to mirror modern-premium template exactly
- Fix InlineDateField: hide browser calendar picker icon (.document-inline-date CSS)
- Fix InlineNumberField: hide spin buttons (.document-inline-number CSS)
- Update InlineEditField base styles to use --voucher-ink / --voucher-accent
- Add DocumentEditorRoot wrapper component for CSS variable injection
- All editors now use --voucher-ink: #1d1710 and --voucher-accent from branding

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

git push origin feature/direct-edit-view
```

---

## 7. File Change Summary

### New files
None.

### Modified files

| File | Slice | Change |
|---|---|---|
| `src/app/globals.css` | 1 | Add `.document-inline-date`, `.document-inline-number` CSS resets |
| `src/components/document/inline-edit-fields.tsx` | 1 | Update baseClass, add class names, add `DocumentEditorRoot` export |
| `src/features/voucher/components/voucher-document-editor.tsx` | 2 | Full rewrite — mirror minimal-office layout |
| `src/features/invoice/components/invoice-document-editor.tsx` | 3 | Full rewrite — mirror minimal layout |
| `src/features/salary-slip/components/salary-slip-document-editor.tsx` | 4 | Full rewrite — mirror modern-premium layout |

### Unchanged files
- `src/components/foundation/document-workspace-layout.tsx` — view toggle logic is correct, no changes
- `src/features/*/components/*-workspace.tsx` — wiring is correct, no changes
- All template files — not modified
- All test files — not modified (tests must still pass)

---

## 8. Acceptance Criteria (Summary)

| # | Criterion |
|---|---|
| AC-1 | Document View for each module is visually indistinguishable from the Form View template preview |
| AC-2 | No browser-native calendar icon visible in any date field in Document View |
| AC-3 | No browser-native spin buttons in any number field in Document View |
| AC-4 | All inline inputs use `--voucher-ink` colour (not `--foreground`) |
| AC-5 | Accent sidebar/box for key amounts (voucher amount, invoice balance, net salary) uses `--voucher-accent` bg with white text |
| AC-6 | Toggling Form→Document→Form preserves 100% of form values |
| AC-7 | Add/remove row for line items (invoice) and earnings/deductions (salary slip) works |
| AC-8 | All computed values (totals, amount in words, net salary) update live as user types |
| AC-9 | `npx tsc --noEmit` → 0 errors |
| AC-10 | `npx vitest run` → all tests pass |
| AC-11 | Form View and all exports are completely unaffected |

---

## 9. Implementation Order Recommendation

Slices are sequential (1→2→3→4→5). Each slice is independently committable.

Slice 1 is the foundation — it must be done first as Slices 2–4 depend on `DocumentEditorRoot` and the updated `InlineEditFields` base styles.

Slices 2, 3, and 4 are independent of each other and **can be parallelised** across engineers.

---

## 10. Open Questions

None. All architectural decisions are confirmed:
- Document View always shows the fixed default template layout (not the user-selected template)
- The editor is not exported — exports still use the Form View render pipeline
- No new templates or routes needed
