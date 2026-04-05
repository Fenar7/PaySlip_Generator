# Slipwise One — Current Context
**Date & Time:** Sunday, April 5, 2026 at 4:33 PM IST  
**Repository:** `/Users/mac/Fenar/Zenxvio/product-works/payslip-generator`  
**Current Branch:** `master` (all PRs merged)

---

## ✅ Completed Phases (0, 1, 2, 3)

### Phase 0-1: SaaS Foundation (Merged to master)
- Better Auth setup with Brevo SMTP email integration
- Auth pages: login, signup, verify email, OTP, forgot/reset password
- 5-step onboarding wizard with org setup, branding, financials, templates
- Middleware + route guards for org context
- Prisma 7 schema + PostgreSQL setup
- Supabase integration for auth & storage

### Phase 2: Docs Persistence Layer (Merged PR #40)
**Prisma Models:**
- Customer, Vendor, Employee (master data)
- Invoice, InvoiceLineItem, Voucher, VoucherLine, SalarySlip, SalaryComponent, SalaryPreset (documents)
- FileAttachment, OrgDefaults (supporting)

**Server Actions:**
- `src/app/app/data/actions.ts` — Customer/Vendor/Employee CRUD (create, update, delete, list, get)
- `src/app/app/docs/invoices/actions.ts` — Invoice CRUD + status transitions (issueInvoice, markInvoicePaid, archiveInvoice, duplicateInvoice)
- `src/app/app/docs/vouchers/actions.ts` — Voucher CRUD
- `src/app/app/docs/salary-slips/actions.ts` — SalarySlip CRUD + releaseSalarySlip
- `src/app/app/data/salary-preset-actions.ts` — Salary Preset CRUD

**Vault Pages:**
- `/app/docs/invoices`, `/app/docs/vouchers`, `/app/docs/salary-slips` — list with status/type filtering, pagination, search
- `/app/docs/invoices/[id]`, `/app/docs/vouchers/[id]`, `/app/docs/salary-slips/[id]` — full edit pages

**Master Data Pages:**
- `/app/data/customers`, `/app/data/vendors`, `/app/data/employees`, `/app/data/salary-presets` — list + new + edit pages
- Shared DataTable component, PageHeader, form components (CustomerForm, VendorForm, EmployeeForm)

### Phase 3: UX Redesign + Template Store (Merged PR #41)
**Template Store:**
- 11 templates across 5 categories (Minimal, Professional, Bold Brand, Corporate, Creative)
- `src/lib/docs/templates/registry.ts` — static template registry with filter helpers
- `/app/docs/templates` page with category + document type filtering
- Template cards with "Use Once" and "Set Default" actions
- `?template=` query param support on new document pages

**Dashboard:**
- `/app/home` dashboard with quick-action grid, vault panels, master-data panels
- Org defaults actions (getOrgDefaults, updateOrgDefaults)

**Invoice Editor UX:**
- CustomerPicker component — searchable dropdown, auto-fills all client fields
- Compact line-items table with Tab-key navigation; Enter adds new row
- InvoiceSaveBar — sticky save bar with unsaved indicator, Save Draft + Issue buttons
- All wired to saveInvoice/updateInvoice/issueInvoice server actions

**Voucher Editor UX:**
- VendorPicker component — searchable dropdown, pre-fills counterparty fields
- MultiLineVoucherEditor — table mode with date/time/description/category/amount rows
- Single ↔ multi-line toggle
- VoucherSaveBar — Save Draft + Approve Payment/Receipt buttons
- Category totals panel below table

**Salary Slip UX:**
- EmployeePicker component — auto-fills all employee fields from DB
- SalarySlipSaveBar — Save Draft + Release buttons
- PresetApplyButton — one-click apply salary preset to earnings/deductions
- Salary Presets CRUD pages (list/new/edit)

**Navigation:**
- Master Data section added: Customers, Vendors, Employees, Salary Presets
- Templates link added to Docs section

---

## 📊 Current Metrics
- **Master branch head:** `0f7aeab` (Merge PR #41)
- **Files changed in Phase 2+3:** 118 files, 8,578 insertions, 1,171 deletions
- **New models in Prisma:** 11 (Customer, Vendor, Employee, Invoice, InvoiceLineItem, Voucher, VoucherLine, SalarySlip, SalaryComponent, FileAttachment, SalaryPreset)
- **TypeScript errors:** 0
- **ESLint errors:** 0 (11 warnings, all pre-existing)
- **Prisma migration:** `20260404075559_supabase_init` (auto-created during PR merge)

---

## 🔑 Key Technical Details

### Prisma 7 Import Paths
```typescript
import { PrismaClient } from "@/generated/prisma/client";  // ✓ correct
import type { Prisma } from "@/generated/prisma/client";   // ✓ correct
```
**NOT** `@/generated/prisma` (Prisma 7 generates no index.ts)

### JSON Field Type Pattern
When passing `Record<string, unknown>` to Prisma `Json` fields:
```typescript
formData: input.formData as Prisma.InputJsonValue  // ✓ required cast
```

### Auth Pattern (All Server Actions)
```typescript
const { userId, orgId } = await requireOrgContext();
// Throws 401 if not authenticated or 403 if no org — never reaches caller
```

### ActionResult Pattern
```typescript
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }
```

### Document Numbering
- `nextDocumentNumber(orgId, "invoice")` → "INV-001", "INV-002", etc.
- Uses atomic DB transaction (OrgDefaults model)
- Never creates duplicates

### Multi-tenancy
- All doc/master-data models have `organizationId` field
- All server actions verify `organizationId` before read/write
- OrgDefaults per org (upserted, not inserted)

### Template System
- Templates are static config objects in `src/lib/docs/templates/registry.ts`
- NO database table — registry is source of truth
- `templateId` maps to existing template IDs (`"minimal"`, `"professional"`, etc.)
- `?template=xxx` on new doc pages pre-selects the template
- `defaultInvoiceTemplate`, `defaultVoucherTemplate`, `defaultSlipTemplate` stored in OrgDefaults

### Port
- Dev server: **localhost:3001** (set in `package.json` and `supabase/config.toml`)

---

## 📁 Key Files Created/Modified

### Core Auth & DB
- `src/lib/auth/require-org.ts` — `requireOrgContext()`, `getOrgContext()`, `hasRole()`, `requireRole()`
- `src/lib/db.ts` — PrismaClient with Pg adapter
- `prisma/schema.prisma` — 11 new models
- `prisma.config.ts` — DB URL from env

### Documents
- `src/lib/docs/numbering.ts` — Auto-numbering logic
- `src/lib/docs/templates/registry.ts` — 11 template definitions

### Storage
- `src/lib/storage/upload.ts` + `upload-server.ts` — Supabase Storage helpers

### Actions (Server-side)
- `src/app/app/data/actions.ts` — Customer/Vendor/Employee CRUD
- `src/app/app/docs/invoices/actions.ts` — Invoice CRUD + transitions
- `src/app/app/docs/vouchers/actions.ts` — Voucher CRUD
- `src/app/app/docs/salary-slips/actions.ts` — SalarySlip CRUD
- `src/app/app/data/salary-preset-actions.ts` — SalaryPreset CRUD
- `src/app/app/actions/org-defaults-actions.ts` — Org defaults CRUD

### Components (Invoice, Voucher, Salary)
- `src/features/docs/invoice/components/customer-picker.tsx`
- `src/features/docs/invoice/components/invoice-save-bar.tsx`
- `src/features/docs/invoice/components/invoice-workspace.tsx` (updated)
- `src/features/docs/voucher/components/vendor-picker.tsx`
- `src/features/docs/voucher/components/multi-line-voucher-editor.tsx`
- `src/features/docs/voucher/components/voucher-save-bar.tsx`
- `src/features/docs/voucher/components/voucher-workspace.tsx` (updated)
- `src/features/docs/salary-slip/components/employee-picker.tsx`
- `src/features/docs/salary-slip/components/salary-save-bar.tsx`
- `src/features/docs/salary-slip/components/salary-slip-workspace.tsx` (updated)

### Pages
- `src/app/app/home/page.tsx` — Dashboard
- `src/app/app/docs/templates/page.tsx` — Template store
- `src/app/app/docs/invoices/page.tsx` — Invoice vault
- `src/app/app/docs/vouchers/page.tsx` — Voucher vault
- `src/app/app/docs/salary-slips/page.tsx` — Salary slip vault
- `/data/customers`, `/data/vendors`, `/data/employees`, `/data/salary-presets` — Master data pages

---

## 🚀 Next Steps (Phase 4+)

Based on the master plan, the next phases are:

### Phase 4: Payment Lifecycle (SW Pay)
- Payment initiation (mass pay, one-off payments)
- Bank integration (payment gateways)
- Payment tracking + reconciliation
- Remittance advice generation

### Phase 5: Workflow Orchestration (SW Flow)
- Document routing workflows
- Approval chains
- Audit trails

### Phase 6: Intelligence (SW Intel)
- Analytics dashboards
- Data export (CSV, Excel)
- Report generation

### Phase 7-10
- Roles & proxy access (Phase 7)
- PDF Studio expansion (Phase 8)
- Pixel tracking (Phase 9)
- Hardening + AWS migration (Phase 10)

---

## 💾 Database Setup Notes
- **Migration name:** `20260404075559_supabase_init` (auto-created)
- **Database:** PostgreSQL (Supabase)
- **Adapter:** `@prisma/adapter-pg` with PrismaPg connection string
- **URL source:** `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (from `prisma.config.ts`)

---

## 🔗 Important Links
- **Repository:** https://github.com/Fenar7/PaySlip_Generator
- **Master:** https://github.com/Fenar7/PaySlip_Generator/commit/0f7aeab
- **PR #40 (Phase 2):** https://github.com/Fenar7/PaySlip_Generator/pull/40
- **PR #41 (Phase 3):** https://github.com/Fenar7/PaySlip_Generator/pull/41

---

## ✨ Ready for Next Chat
All systems operational. No blockers. Phase 2 & 3 fully tested and merged to master.

**To resume in next chat:**
1. Pull latest master: `git pull origin master`
2. Check branch: `git branch -v` (should be on master)
3. Review this context file
4. Proceed with Phase 4 planning or implementation
