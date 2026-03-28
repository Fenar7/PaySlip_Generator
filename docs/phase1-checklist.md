# Phase 1 Acceptance Checklist

This checklist maps the current implementation to the Phase 1 PRD and provides a release-ready verification list.

## Product Scope

- Voucher Generator is implemented with payment and receipt workflows.
- Salary Slip Generator is implemented with dynamic earnings and deductions.
- Invoice Generator is implemented with line-item pricing, tax calculation, and payment summary.
- Shared branding controls support company identity, logo upload, and accent color.
- All modules provide live preview, print, PDF export, and PNG export.
- The product remains stateless and serverless-friendly.

## Voucher

- Voucher workspace loads with editable defaults.
- Payment and receipt variants are supported.
- Both voucher templates are available and switchable.
- Optional sections can be hidden without breaking layout.
- Print surface opens correctly from the workspace.
- PDF export returns a downloadable file with selectable text.
- PNG export returns a downloadable image.

## Salary Slip

- Salary slip workspace supports company branding, employee details, pay period, attendance, earnings, and deductions.
- Employee fields include employee ID, department, designation, PAN, UAN, joining date, and work location.
- Bank details include bank name, masked account number, and IFSC.
- Visibility toggles control optional employee, attendance, bank, notes, and signature sections.
- Both salary-slip templates are available and switchable.
- Hidden optional fields collapse cleanly in preview and export output.
- Print, PDF, and PNG flows render the normalized salary slip successfully.

## Invoice

- Invoice workspace supports business details, client details, shipping address, tax IDs, and place of supply.
- Line items support quantity, unit price, discount, taxable amount, tax amount, and line total.
- Invoice totals include subtotal, line discounts, tax total, extra charges, invoice-level discount, grand total, amount paid, and balance due.
- Visibility toggles control business/client metadata, notes, terms, bank details, signature, and payment summary.
- All three invoice templates are available and switchable.
- Print, PDF, and PNG flows render successfully and preserve the expected totals.

## Deployment and Runtime

- Export API routes run in Node.js runtime.
- The app does not require a database, auth, cloud storage, queues, or cron jobs.
- Development export rendering resolves a local Chromium executable.
- Vercel/Linux export rendering uses `@sparticuz/chromium`.
- Export responses are non-cacheable and generated per request.

## Release Verification

Run before release or deployment sign-off:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

Manual smoke checks:

1. Open each module route and confirm the workspace loads.
2. Switch templates in voucher, salary slip, and invoice.
3. Toggle optional sections off and confirm the preview reflows cleanly.
4. Export one PDF and one PNG from each module.
5. Open each print flow and confirm the render-ready surface appears.
6. Verify one deployed Vercel preview before calling Phase 1 complete.

## Explicit Non-Goals

- authentication and user accounts
- saved drafts or document history
- persistent company profiles
- database-backed storage
- payroll automation or compliance processing
- recurring invoices or billing automation
- team collaboration, approvals, or sharing workflows
