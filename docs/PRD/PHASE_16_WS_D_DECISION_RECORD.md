# Phase 16 WS-D Decision Record
## Deferred Roadmap Stubs Ownership Resolution

**Date:** 2026-04-13  
**Branch:** `feature/phase-16-remediation-d-deferred-phase16-stubs`

## Final decisions

### 1. Marketplace payout automation via RazorpayX

**Decision:** Formally deferred out of Phase 16 remediation.

**Why this is deferred**

- The repo has `MarketplaceRevenue` tracking, but no payout orchestration boundary, beneficiary model, RazorpayX client contract, idempotency strategy, or payout reconciliation flow.
- Implementing payout automation now would require new product decisions across operations, finance posting, failure handling, and compliance/KYC that are not specified in the existing Phase 16 remediation scope.
- A narrow “stub” implementation here would create roadmap ambiguity instead of resolving it.

**Explicit ownership rule**

- Marketplace publisher payouts are **not part of active Phase 16 remediation**.
- They require a dedicated post-Phase-16 PRD/workstream covering:
  - payout state machine
  - beneficiary onboarding/KYC
  - RazorpayX transport and retries
  - Books/audit traceability and reconciliation

### 2. GST JSON / portal automation

**Decision:** Partially implemented now.

**Implemented in WS-D**

- GSTR-1 JSON export is an explicit supported output.
- The JSON export route is plan-gated and covered by route tests.
- The GST Reports UI surfaces JSON export directly for a single filing month.

**Still deferred out of Phase 16 remediation**

- GST portal/API submission automation
- credential storage and rotation
- transport retry policy
- filing audit trail and replay semantics

## Resulting roadmap ownership

- **Implemented in WS-D:** GSTR-1 JSON export surfacing
- **Deferred out of Phase 16:** marketplace payout automation, GST portal submission automation
