# Slipwise Export Runtime Context

## Summary
This document captures the export/runtime work merged through PR `#22`.

Merged on local `master`:
- `c87daa8` `Merge pull request #22 from Fenar7/codex/fix-export-runtime-and-dialog`

Primary goals of this work:
- fix broken first-click PDF/PNG export behavior
- make export behavior work in serverless/Vercel environments
- restore accurate client-side export success/error handling
- stabilize test coverage for export routes

## What Changed

### Client export flow
PDF and PNG export no longer use the older hidden-iframe/session handoff pattern.

Current flow:
1. user clicks `Export PDF` or `Export PNG`
2. client validates the current document
3. client `POST`s directly to the binary export endpoint
4. if the response succeeds, the client downloads the blob with a temporary object URL
5. if the response fails, the client shows a real error state

Main client helper:
- [download-binary-export.ts](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/lib/browser/download-binary-export.ts)

Updated workspaces:
- [voucher-workspace.tsx](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/features/voucher/components/voucher-workspace.tsx)
- [salary-slip-workspace.tsx](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/features/salary-slip/components/salary-slip-workspace.tsx)
- [invoice-workspace.tsx](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/features/invoice/components/invoice-workspace.tsx)

### Export dialog behavior
The workspace export dialog is now aligned to real client state instead of a fake handoff state.

Supported states:
- `pending`
- `success`
- `error`

Shared dialog surface:
- [document-workspace-layout.tsx](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/components/foundation/document-workspace-layout.tsx)

### Server export runtime
The server export logic is now hybrid:

- local/non-serverless:
  - uses native Chrome CLI rendering for PDF/PNG
  - preserves the faster local path that was working reliably before the regression
- Vercel/serverless:
  - uses Puppeteer browser rendering
  - passes document payload through request headers so rendering does not depend on in-memory session state

Server export implementations:
- [export-voucher.ts](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/features/voucher/server/export-voucher.ts)
- [export-salary-slip.ts](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/features/salary-slip/server/export-salary-slip.ts)
- [export-invoice.ts](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/features/invoice/server/export-invoice.ts)

Shared browser/export utilities:
- [browser.ts](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/lib/export/browser.ts)
- [parse-export-request-body.ts](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/lib/server/parse-export-request-body.ts)
- [export-payload.ts](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/lib/server/export-payload.ts)

### Print page payload resolution
Print pages now support payload resolution in this order:
1. header payload
2. query payload
3. token/session fallback

Updated print pages:
- [voucher print page](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/app/voucher/print/page.tsx)
- [salary slip print page](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/app/salary-slip/print/page.tsx)
- [invoice print page](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/app/invoice/print/page.tsx)

## Important Decisions

### Why fetch-based client download was kept
The older handoff/iframe model could not observe export failures properly and led to confusing UI states.

The fetch-based binary path was kept because it:
- gives the client real success/error visibility
- supports retry behavior in the dialog
- avoids the old "first click prepares, second click downloads" issue

### Why local dev uses native Chrome CLI
A later experiment switched local dev to Puppeteer `page.pdf()`, but that caused:
- `TargetCloseError: Protocol error (Page.printToPDF): Target closed`
- stuck local export dialogs
- laggy local export behavior

That experiment was reverted in:
- `852b126` `Revert local dev browser export path`

Current rule:
- local uses native Chrome CLI
- Vercel/serverless uses Puppeteer

## Verification Completed

### Local verification
Completed during this export/runtime pass:
- `npm run lint`
- `npm test`
- `npm run build`

### Route-level export checks
Targeted export checks were verified against a real started production server on `127.0.0.1:3100`.

Verified:
- voucher PDF
- voucher PNG
- salary slip PDF
- salary slip PNG
- invoice PDF
- invoice PNG

### Test updates
Some unit and PDF extraction tests were updated because the UI and extracted PDF text no longer matched older assumptions.

Updated tests included:
- [module-card.test.tsx](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/components/foundation/module-card.test.tsx)
- [invoice-workspace.test.tsx](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/features/invoice/components/invoice-workspace.test.tsx)
- [salary-slip-preview.test.tsx](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/features/salary-slip/components/salary-slip-preview.test.tsx)
- [app.spec.ts](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/tests/app.spec.ts)

## Known Caveats

### Playwright webServer startup can be noisy
The default Playwright `webServer` path was flaky during this work because of:
- stale `.next` state
- leftover build workers
- sandbox/runtime differences

The app itself was validated successfully, but if export tests become flaky again, inspect:
- stale `.next/lock`
- old `next build` workers
- whether the server under test is actually listening on `3100`

### Browser print versus exported PDF
Browser print still has separate behavior from binary PDF export.
This pass focused on binary export reliability first.

## Recommended Next Steps

If export issues return, debug in this order:
1. confirm whether the failure is local only, Vercel only, or both
2. confirm whether it is PDF only, PNG only, or both
3. test the direct export route first before debugging button/modal UI
4. inspect the active runtime split:
   - local should be CLI
   - Vercel should be Puppeteer
5. only after route validation, inspect dialog state or button behavior

## Related Branch / PR
- branch: `codex/fix-export-runtime-and-dialog`
- PR: `#22`
