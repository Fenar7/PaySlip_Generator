# Phase 16 Traceability Matrix

## Status Key

- `Implemented` — shipped and materially aligned
- `Partial` — shipped shape exists but important contract elements are missing
- `Missing` — PRD requirement absent
- `Deferred` — earlier PRD explicitly deferred into Phase 16 but not implemented

## Objectives

| ID | Requirement | Status | Evidence | Workstream |
| --- | --- | --- | --- | --- |
| O1 | SW Books suite | Implemented | `src/components/layout/suite-nav-items.ts`, `/app/books/*` routes present | — |
| O2 | Country-aware COA seeding | Implemented | `src/lib/accounting/accounts.ts` and org default account fields in `prisma/schema.prisma` | — |
| O3 | Canonical double-entry journal engine | Implemented | `src/lib/accounting/journals.ts` | — |
| O4 | Auto-posting from finance events | Partial | posting exists across invoices, vouchers, salary, vendor bills; approval and role paths still inconsistent | `WS-A`, `WS-C` |
| O5 | Fiscal periods, posting locks, reopening controls | Partial | audited reopen exists, but approval-hook language is not implemented | `WS-B` |
| O6 | Trial balance and general ledger | Implemented | report pages and API/export routes present | — |
| O7 | Bank account registry and cashbook surfaces | Implemented | `/app/books/banks`, `src/lib/accounting/banking.ts` | — |
| O8 | CSV statement import with saved mapping and dedupe | Partial | import, checksum, fingerprint, saved mapping exist; tunables are hardcoded not config-driven | `WS-C` |
| O9 | Reconciliation engine with suggestions, partial matching, suspense handling | Partial | core flows exist; edge-case hardening and contract validation still needed | `WS-C` |
| O10 | Invoice payment clearing to bank settlement | Implemented | clearing settlement journals in `src/lib/accounting/banking.ts` | — |
| O11 | Structured vendor bills | Implemented | `/app/books/vendor-bills/*`, `src/lib/accounting/vendor-bills.ts` | — |
| O12 | Payment runs and approval-ready payout ops | Partial | payment runs exist; approval authority and rejection state logic are broken | `WS-A` |
| O13 | Close workspace and blockers | Implemented | `/app/books/close`, `src/lib/accounting/close.ts` | — |
| O14 | P&L, balance sheet, cash flow, AP aging, AR aging | Implemented | report pages and exports present | — |
| O15 | Audit exports and tax tie-outs | Implemented | audit package export plus GST/TDS tie-out exports exist | — |

## Key Product Rules

| Rule | Status | Evidence | Workstream |
| --- | --- | --- | --- |
| Posted journals immutable | Implemented | reversal-only flow in `src/lib/accounting/journals.ts` | — |
| Draft records do not post | Implemented | posting tied to explicit events | — |
| Closed periods block posting | Implemented | `src/lib/accounting/periods.ts:146-181` | — |
| Reopen requires reason + audit trail | Implemented | `src/lib/accounting/periods.ts:226-275` | — |
| Reopen approval hook | Partial | direct reopen action, no approval routing | `WS-B` |
| Approval actions never trust client-only state | Partial | server-side object lookup exists, but no permission enforcement beyond org membership | `WS-A` |
| Finance-critical actions role-scoped | Partial | broad read access and admin-only writes do not match PRD role model | `WS-A` |

## Route and Surface Contract

| Surface | Expected | Status | Evidence | Workstream |
| --- | --- | --- | --- | --- |
| `/app/books/settings` | mappings, templates, locks, defaults | Partial | only baseline cards and period controls implemented | `WS-B` |
| Journals | draft/post/reverse/attachments | Partial | attachments missing | `WS-B` |
| Reconciliation | imports, suggestions, partial matching, manual matching | Implemented | route and UI exist | — |
| Payment runs | batch payouts and approvals | Partial | approval workflow exists, but authority and reject-state handling are wrong | `WS-A` |
| Audit package export | downloadable audit-ready package | Implemented | `exportBooksAuditPackageJson` exists | — |

## Edge Cases and Acceptance Criteria

| Scenario | Status | Notes | Workstream |
| --- | --- | --- | --- |
| Unbalanced journal blocked | Implemented | `validateJournalLines()` | — |
| Posted journal immutable | Implemented | reversal flow only | — |
| Closed period posting blocked | Implemented | audited blocking | — |
| Duplicate statement import blocked | Implemented | checksum and fingerprint checks | — |
| Same bank line overmatched blocked | Implemented | remaining amount and entity availability checks | — |
| Partial match supported | Implemented | confirmed amount override exists | — |
| Overpayment review path present | Partial | overmatch blocking exists, but explicit review flow is not clearly surfaced | `WS-C` |
| Razorpay settlement fee split supported | Implemented | bank-fee journal path exists | — |
| Vendor bill partial payment computed correctly | Implemented | remaining amount and status computation exist | — |
| Payment run approval denied cannot execute | Partial | approval request can be rejected, but run status is not rolled back cleanly | `WS-A` |
| Reopen period audited | Implemented | reason + audit event present | — |
| Financial statements derive from ledger | Implemented | report services rely on accounting layer | — |
| AR/AP aging aligns with subledger | Partial | core reports exist; needs explicit regression coverage in remediation branches | `WS-C` |
| Multi-currency uses stored rates | Partial | schema has FX fields, but explicit Phase 16 verification coverage is still thin | `WS-C` |
| Close blocked by unresolved exceptions | Implemented | close workspace includes blockers including pending approvals | — |

## Deferred Phase 16 Commitments from Earlier PRDs

| Item | Source | Status | Workstream |
| --- | --- | --- | --- |
| Marketplace payout automation via RazorpayX | `PHASE_15_PRD.md`, `PHASE_14_15_PRD.md` | Deferred | `WS-D` decision record defers this out of active Phase 16 remediation |
| GST JSON / portal automation | `PHASE_15_PRD.md` | Partial | `WS-D` surfaces GSTR-1 JSON export; portal/API submission remains deferred |
