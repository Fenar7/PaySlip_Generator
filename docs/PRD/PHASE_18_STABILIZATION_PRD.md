# Phase 18 Stabilization PRD — Slipwise One
## Release Hardening for SW Flow Completion + Customer Collaboration + Operational Analytics

**Version:** 1.0  
**Date:** 2026-04-13  
**Prepared by:** Codex Engineering Assistant  
**Parent Company:** Zenxvio  
**Product:** Slipwise One

---

## 1. Summary

Phase 18 functionality is substantially implemented, but the aggregate branch is not yet safe to merge into `master`.

This stabilization PRD exists to close the gap between:

- "feature-complete on paper"
- and "release-ready in build, test, security, and governance terms"

The stabilization effort is intentionally narrow:

- fix confirmed build blockers
- correct Phase 18 schema/query mismatches
- enforce admin-only mutations on new Flow operator/configuration surfaces
- harden portal reply and attachment handling
- reconcile delivery tracking behavior with the promised Phase 18 model
- restore green verification for the Phase 18 aggregate branch

This is not a new feature phase and not Sprint 18.6.

It is a release-hardening pass for the completed Phase 18 scope.

---

## 2. Confirmed Problems

### 2.1 Build blockers

- broken relative imports in portal ticket reply UI
- client components importing server-only workflow modules
- missing shared date formatting dependency in the current build path

### 2.2 Logic and schema mismatches

- Intel operational analytics query non-existent or invalid fields/relations
- some Phase 18 reporting code does not match the current Prisma schema

### 2.3 Security and governance gaps

- new Flow configuration/operator actions rely on org membership but do not consistently enforce admin role
- portal attachment registration trusts client-supplied metadata too directly

### 2.4 Verification failures

- targeted portal ticket tests are red
- Phase 18 aggregate branch does not currently complete a production build

### 2.5 Product contract inconsistency

- some admin notification fan-out paths bypass the delivery-aware notification flow, reducing analytics and delivery trace completeness

---

## 3. Stabilization Objectives

| # | Objective |
| --- | --- |
| S1 | Restore a green production build for the full Phase 18 aggregate |
| S2 | Align new analytics/reporting code with the actual schema and runtime contracts |
| S3 | Enforce admin-only mutation boundaries across Flow config/operator surfaces |
| S4 | Harden portal collaboration actions for validation, attachment handling, and access control |
| S5 | Make delivery tracking consistent enough for Phase 18 operational reporting |
| S6 | Produce merge-ready verification evidence for the parent `feature/phase-18` branch |

---

## 4. Implementation Changes

### 4.1 Release blockers

- fix portal ticket reply import paths
- move shared workflow trigger/action constants into a client-safe Flow catalog module
- replace `date-fns` usage in touched Phase 18/Flow surfaces with an internal relative-time formatter

### 4.2 Analytics correctness

- correct Sprint 18.4 operations actions to use only valid Prisma fields and relations
- use `dueAt` instead of non-existent approval timeout fields
- filter deliveries by `orgId`
- use valid workflow and notification projection fields
- use valid time fields for delivery filtering and reporting

### 4.3 Auth and permission hardening

- require admin role for:
  - workflow management
  - approval policy management
  - SLA policy management
  - escalation rule management
  - delivery operator actions

### 4.4 Portal hardening

- validate attachment file name, mime type, size, and storage key server-side
- limit accepted attachment classes and size
- ensure temporary attachment linking remains org-scoped
- restore portal reply tests and add idempotency-aware expectations

### 4.5 Delivery consistency

- route admin fan-out notifications through delivery-aware notification creation rather than raw bulk insert when delivery tracking is expected
- preserve backward compatibility for in-app notifications

---

## 5. Acceptance Criteria

The stabilization pass is complete only if:

1. `npm run build` passes on the stabilization branch
2. targeted Phase 18 tests pass, including portal collaboration and delivery/analytics tests
3. Flow admin/operator mutations are admin-protected on the server side
4. Intel operational reporting code uses valid schema contracts
5. portal attachment registration has meaningful server-side validation
6. delivery-aware reporting is not undermined by bypass paths for admin notifications
7. the branch is safe to PR back into `feature/phase-18`

---

## 6. Verification Plan

- run `npm run build`
- run targeted Vitest suites for:
  - flow validation
  - delivery engine
  - Intel operational analytics
  - portal ticket actions
- run lint/type checks on touched files if needed
- record remaining known baseline issues only if they are outside the stabilization scope and do not block merge readiness
