# Phase 16 Remediation PRD
## WS-D — Deferred Phase 16 Roadmap Stubs

**Branch:** `feature/phase-16-remediation-d-deferred-phase16-stubs`

## Summary

This branch covers earlier roadmap commitments that were explicitly deferred into Phase 16 but are not part of the dedicated Books-core PRD. It must remain isolated from P0 and P1 Books remediation work.

## Decision resolution

- Marketplace payout automation is formally deferred out of active Phase 16 remediation.
- GST JSON automation is implemented only to the minimum explicit scope of GSTR-1 JSON export.
- GST portal/API submission remains formally deferred because credential, transport, retry, and audit semantics are not specified.

## Scope

- marketplace payout automation deferred from Phase 15
- GST JSON / portal automation deferred from Phase 15

## Goals

1. Decide whether each deferred item should be implemented now or formally moved to the next roadmap phase.
2. If implemented, define the minimum viable version that fits the current repo architecture.
3. Keep this work independent from Books-core authority and correctness remediation.

## Product decisions to make in this branch

- Marketplace payout automation:
  - if implemented now, limit scope to payout orchestration, payout status tracking, and accounting/audit traceability
  - if not implemented now, add an explicit product decision note and move it to the next phase PRD
- GST JSON / portal automation:
  - if implemented now, limit scope to JSON export generation, not portal submission automation unless credentials, transport, and retry semantics are fully specified
  - if not implemented now, formalize the deferment and remove ambiguous “Phase 16” language from execution prompts

## Implementation changes

### Marketplace payout automation

- assess current `MarketplaceRevenue` lifecycle and payout data needs
- define payout state machine
- define accounting/audit implications if payouts touch Books
- add only the minimum API/actions/UI needed for the chosen scope

### GST JSON automation

- assess existing GST export surfaces
- define exact JSON contract and supported filing shapes
- add export action and tests if proceeding

## Commit plan

1. `deferred-stub-decision-record`
   - capture final go/no-go decision in docs and code comments if needed
2. `marketplace-payout-implementation-or-deferral`
3. `gst-json-implementation-or-deferral`
4. `tests-and-docs-deferred-phase16`

## Test plan

- only include tests for the items actually implemented in this branch
- if an item is deferred, add no-op documentation tests only if the repo convention supports them

## Acceptance criteria

- No ambiguous “Phase 16” deferred stub remains unowned after this branch.
- Implemented deferred items have a clear state machine and test coverage.
- Deferred items are explicitly moved out of the active Phase 16 remediation scope.

## Assumptions

- This branch is optional until `WS-A`, `WS-B`, and `WS-C` are complete.
- No Books-core blocker may be fixed here unless the same issue is impossible to isolate elsewhere.
