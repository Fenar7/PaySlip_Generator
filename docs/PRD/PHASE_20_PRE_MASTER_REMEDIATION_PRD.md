# Phase 20 Pre-Master Remediation PRD
## Partner Access Hardening, Release Readiness, and Build Gate Fixes

**Version:** 1.0  
**Date:** 2026-04-15  
**Prepared by:** Codex Engineering Assistant  
**Baseline branch:** `feature/phase-20`  
**Target branch for remediation PR:** `feature/phase-20`  
**Master merge status:** Blocked until this PRD is remediated and verified

---

## 1. Executive Summary

Phase 20 has all five sprint PRs integrated into `feature/phase-20`, but the branch is not ready to merge into `master`.

The pre-master audit found that the branch is substantially healthier than earlier sprint reports:

- `npx prisma validate` passes.
- `npm run lint` passes with warnings only.
- `npm run test` passes `117` test files and `995` tests.

However, Phase 20 still has merge-blocking issues:

1. `npm run build` fails in the Sprint 20.4 partner admin detail page.
2. Partner cross-org assignment allows an approved partner admin to self-add a client organization by raw organization ID, without client consent or platform-admin approval.
3. Partner scope semantics are inconsistent across UI, direct action code, and the reusable partner access guard.
4. Client organizations can view partner access, but cannot revoke it directly.
5. Partner suspension/revocation blocks access indirectly through partner status, but active client assignments are not reconciled or represented accurately.
6. Phase 20 release docs and health checks are stale after Sprint 20.4 was merged.
7. Critical operator allowlists and secrets are not fully reflected in env validation and release readiness checks.

This PRD defines the remediation required before `feature/phase-20` can be considered master-merge-ready.

---

## 2. Current Verified State

### Branch state

| Item | State |
| --- | --- |
| Working branch | `feature/phase-20` |
| Sprint PRs merged | `#98`, `#99`, `#100`, `#101`, `#102` |
| `master` touched | No |
| Master merge allowed now | No |

### Verification observed during audit

| Command | Result |
| --- | --- |
| `npx prisma validate` | Pass |
| `npm run lint` | Pass with warnings |
| `npm run test` | Pass: `117` files, `995` tests |
| `npm run build` | Fail |

### Build failure evidence

Build fails in:

`src/app/app/admin/partners/[partnerId]/page.tsx:29`

Current problematic type:

```ts
type PartnerDetail = NonNullable<
  Awaited<ReturnType<typeof adminGetPartnerDetail>>["data" & { success: true }]
>;
```

Observed error:

```text
Type '"data" & { success: true; }' cannot be used as an index type.
```

This is a hard release blocker.

---

## 3. Remediation Objectives

| ID | Objective |
| --- | --- |
| O1 | Make `feature/phase-20` build cleanly. |
| O2 | Prevent unauthorized or unilateral partner access to client organizations. |
| O3 | Make partner scope behavior consistent across all partner access paths. |
| O4 | Give client org admins direct revocation/control over partner access. |
| O5 | Keep partner lifecycle state, assignment state, and client visibility coherent. |
| O6 | Update release docs and health checks so they reflect all five merged Phase 20 sprints. |
| O7 | Ensure critical Phase 20 operator allowlists/secrets are surfaced before release. |

---

## 4. Remediation Lanes

## BUILD-01 — Fix Partner Admin Detail Build Failure

**Severity:** Critical  
**Area:** Sprint 20.4 Partner OS  
**Location:** `src/app/app/admin/partners/[partnerId]/page.tsx`

### Problem

The partner admin detail page uses an invalid type extraction expression for `PartnerDetail`, causing `npm run build` to fail.

### Required fix

Replace the invalid type expression with a valid discriminated-union extraction.

The implementation must preserve the action result shape:

```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

Acceptable approach:

```ts
type AdminPartnerDetailResult = Awaited<ReturnType<typeof adminGetPartnerDetail>>;
type PartnerDetail = Extract<AdminPartnerDetailResult, { success: true }>["data"];
```

If the implementer chooses a local explicit type instead, it must be equivalent to `getPartnerAdminDetail()` output and must not use `any`.

### Acceptance criteria

- `npm run build` no longer fails on this file.
- The page still handles success and failure action results correctly.
- No `as any` workaround is introduced.

---

## SEC-01 — Replace Raw Partner Self-Assignment With Approved Client Access Workflow

**Severity:** Critical  
**Area:** Partner cross-org security  
**Location:** `src/app/app/partner/actions.ts`

### Problem

`inviteClientOrg(clientOrgId, scope)` currently allows an approved partner admin to create a `PartnerManagedOrg` assignment directly by raw `clientOrgId`.

Current risk:

- any approved partner can attempt to attach any known organization ID
- client consent is not required
- platform approval is not required
- the client only sees access after it already exists

This violates the Phase 20 PRD requirement that client-org assignment be explicit, scoped, governed, and reversible.

### Required fix

Introduce an approved assignment workflow. The implementation must choose one of these safe patterns and apply it consistently:

1. **Client-approved invitation flow**
   - Partner creates a pending access request.
   - Client org admin reviews and approves/rejects.
   - Active `PartnerManagedOrg` access is created only after client approval.

2. **Platform-admin mediated assignment**
   - Partner requests access.
   - Platform admin creates or activates the assignment after verifying client authorization.
   - Partner cannot directly create active access.

3. **Signed client invitation token**
   - Client org admin generates or approves an invitation.
   - Partner redeems token to establish scoped access.
   - Token must be single-use, expiring, and tied to intended partner/client/scope.

The preferred implementation is **client-approved invitation flow** because it gives client org admins direct control and scales better than platform-only operations.

### Required behavior

- A partner may request access to a client, but not create active access unilaterally.
- Client approval or platform-admin approval is required before any cross-org reads/writes become possible.
- Requests must have explicit states, for example:
  - `REQUESTED`
  - `APPROVED`
  - `REJECTED`
  - `CANCELLED`
  - `EXPIRED`
- Active access must remain represented by `PartnerManagedOrg` or a clearly equivalent assignment model.
- Duplicate active or pending requests for the same partner/client pair must be blocked.
- Audit logs must record request, approval, rejection, activation, and revocation.

### Acceptance criteria

- An approved partner cannot gain access to an arbitrary client org by entering an org ID alone.
- Client org admin or platform admin approval is required before access exists.
- Existing tests prove unauthorized self-assignment is blocked.
- Existing `PartnerManagedOrg` active access still works after approval.

---

## SEC-02 — Normalize Partner Scope Semantics

**Severity:** High  
**Area:** Partner authorization model  
**Locations:**

- `src/app/app/settings/partners/page.tsx`
- `src/app/app/partner/actions.ts`
- `src/lib/partners/access.ts`

### Problem

Partner assignment scope semantics are inconsistent:

- `src/app/app/settings/partners/page.tsx` treats empty `scope` as `"Full access"`.
- `src/app/app/partner/actions.ts` allows invoice viewing when `scope.length === 0`.
- `src/lib/partners/access.ts` denies empty scope because `assignment.scope.includes(requiredScope)` returns false.

This creates an authorization drift risk.

### Required fix

Define one canonical scope interpretation and apply it everywhere.

Required decision:

- Empty scope must **not** mean full access.
- Empty scope must mean **no explicit permissions**.
- Full access, if needed, must be represented by an explicit scope such as `all` or by a full set of concrete scopes.

Recommended canonical scopes:

- `view_invoices`
- `manage_documents`
- `view_payments`
- `create_payslips`
- `view_gst_filings`
- `manage_gst_filings`

The exact list may reuse existing labels, but access checks must be explicit.

### Required behavior

- `requirePartnerClientAccess()` becomes the single source of truth for scope enforcement.
- Empty scope blocks sensitive client data access.
- UI must not label empty scope as full access.
- Partner/client/admin screens must display explicit scopes consistently.

### Acceptance criteria

- Tests cover empty scope denial.
- Tests cover explicit allowed scope success.
- Tests cover missing required scope denial.
- UI no longer renders empty scope as full access.

---

## SEC-03 — Route Partner Cross-Org Reads/Writes Through One Guard

**Severity:** High  
**Area:** Tenant isolation / cross-org access  
**Locations:**

- `src/lib/partners/access.ts`
- `src/app/app/partner/actions.ts`

### Problem

The reusable guard `requirePartnerClientAccess()` exists, but at least one partner cross-org action manually reimplements partner status, assignment, revocation, and scope checks:

`getManagedClientInvoices()` in `src/app/app/partner/actions.ts`

Manual reimplementation risks future drift.

### Required fix

All partner cross-org reads/writes must route through `requirePartnerClientAccess()` or `withPartnerClientAccess()`.

### Required behavior

- `getManagedClientInvoices()` must call `withPartnerClientAccess()` or an equivalent centralized helper.
- Any future partner cross-org operation must use the same guard.
- Activity logging should be reliable enough for audit-sensitive reads. If logging remains best-effort, the PRD requires a deliberate decision and documentation of why read access is allowed to proceed if logging fails.

### Acceptance criteria

- Tests prove invoice reads call or exercise the centralized partner access guard.
- Suspended, revoked, unassigned, and insufficient-scope partners are denied through one code path.
- No ad hoc partner-client authorization logic remains in server actions.

---

## SEC-04 — Add Client-Admin Revocation and Control

**Severity:** High  
**Area:** Client governance  
**Location:** `src/app/app/settings/partners/page.tsx`

### Problem

Client org admins can view active partner access, but they cannot revoke it. The UI says:

```text
To remove partner access, ask the partner to remove your organization, or contact platform support.
```

This does not satisfy the Phase 20 requirement that partner-client assignment be reversible and governed.

### Required fix

Add client-admin revocation capability.

### Required behavior

- Client org admins can revoke partner access from `/app/settings/partners`.
- Revocation soft-revokes the assignment and immediately blocks partner access.
- Revocation records:
  - `revokedAt`
  - `revokedBy`
  - audit entry under the client org
  - partner activity or review event where appropriate
- Partner dashboards must no longer count revoked assignments as active.

### Acceptance criteria

- Client admin can revoke partner access.
- Non-admin client members cannot revoke partner access.
- Revoked assignment is removed from active client display.
- Revoked assignment blocks partner reads immediately.

---

## SEC-05 — Reconcile Partner Lifecycle Transitions With Assignment Visibility

**Severity:** High  
**Area:** Partner lifecycle consistency  
**Location:** `src/lib/partners/lifecycle.ts`

### Problem

Suspending or revoking a partner changes `PartnerProfile.status`, and `requirePartnerClientAccess()` denies non-approved partners. That blocks access indirectly.

But active assignments remain unrevoked and client settings can still show access as active because assignment state is unchanged.

### Required fix

Lifecycle transitions must keep assignment visibility and operational state coherent.

### Required behavior

- On `suspend`:
  - partner access is blocked immediately
  - client UI must show suspended status or no longer label access as active
  - assignments may remain attached but must be inactive for access decisions
- On `revoke` or `reject`:
  - active assignments should be soft-revoked or marked inactive
  - client UI must no longer show them as active
  - activity/audit trail must explain why access ended
- On `reinstate`:
  - access must not silently restore revoked client assignments unless product explicitly decides that suspended assignments are restorable and revoked assignments are terminal

### Acceptance criteria

- Tests cover suspend blocks access and updates client-facing visibility.
- Tests cover revoke blocks access and removes active assignment visibility.
- Tests cover reinstate behavior explicitly.
- No client-facing screen labels a suspended/revoked partner assignment as active.

---

## OPS-01 — Update Phase 20 Release Checklist After Sprint 20.4 Merge

**Severity:** High  
**Area:** Release readiness  
**Location:** `docs/PHASE_20_RELEASE_CHECKLIST.md`

### Problem

The Phase 20 release checklist is stale. It still says:

- branch baseline includes only Sprints 20.1, 20.2, and 20.3
- Sprint 20.4 is an open PR and not merged
- Sprint 20.4 migration is not part of the release

This conflicts with the current integrated `feature/phase-20` state.

### Required fix

Update the checklist so it reflects all five merged Phase 20 sprints.

### Required checklist additions

- Sprint 20.4 status: merged.
- Migration `20260415000004_phase20_sprint4_partner_os`: active Phase 20 migration.
- Partner OS smoke tests:
  - platform admin partner list/detail
  - approval/rejection/suspension/revocation
  - client assignment approval flow
  - client-admin revocation
  - partner access denial after suspend/revoke
  - scope enforcement
- Partner OS health checks.
- Explicit `PLATFORM_ADMIN_USER_IDS` env requirement.

### Acceptance criteria

- Checklist no longer claims Sprint 20.4 is pending.
- Checklist includes all Phase 20 migrations.
- Checklist has partner OS manual smoke coverage.

---

## OPS-02 — Update Global Release Readiness Checklist For Phase 20

**Severity:** Medium  
**Area:** Release docs  
**Location:** `docs/production/RELEASE_READINESS_CHECKLIST.md`

### Problem

The global release checklist still contains Phase 19-specific language and conflicting SSO guidance:

- Phase 19 baseline language remains in branch prerequisites.
- SSO accepted-risk text says SSO is disabled by default pending validation.
- Phase 20 environment and smoke checks are incomplete.

### Required fix

Update the production checklist so it can be used for a Phase 20 release candidate.

### Required behavior

- Add `feature/phase-20` branch baseline and diff-to-master verification.
- Add all Phase 20 migrations and backfills.
- Add partner OS, payout, GST filing, and SSO runtime smoke checks.
- Clarify SSO feature-flag posture:
  - if `FEATURE_SSO_ENABLED` defaults true in code, release docs must require explicit operator sign-off before enabling in production
  - if product wants default-off SSO for production, code/env defaults must be adjusted consistently

### Acceptance criteria

- Release docs do not conflict with code defaults.
- Phase 20 can be evaluated from one coherent checklist.

---

## OPS-03 — Add Partner OS Checks To Phase 20 Health Script

**Severity:** Medium  
**Area:** Operational readiness  
**Location:** `scripts/check-phase20-health.ts`

### Problem

The health script checks payout, GST, SSO, and payment run state, but not partner OS.

### Required fix

Add read-only partner OS health checks.

### Required checks

- partners with status `APPROVED` but no active org or inconsistent profile data
- suspended/revoked partners with active assignments shown as active
- active assignments whose partner is not approved
- active assignments with empty scope
- assignments with missing `addedByUserId`
- activity logs missing actor attribution
- absence of configured `PLATFORM_ADMIN_USER_IDS` in release-target environments

### Acceptance criteria

- Health script remains read-only.
- Health script returns critical for access-leak conditions.
- Health script returns warnings for data-hygiene conditions.
- Health output explicitly includes partner OS section.

---

## CFG-01 — Strengthen Phase 20 Operator Env Validation

**Severity:** Medium  
**Area:** Config safety  
**Locations:**

- `.env.example`
- `src/lib/env.ts`
- `docs/PHASE_20_RELEASE_CHECKLIST.md`
- `scripts/check-phase20-health.ts`

### Problem

Several critical operator/security controls are optional strings in `env.ts` and can be empty without an obvious release-blocking signal:

- `PLATFORM_ADMIN_USER_IDS`
- `MARKETPLACE_MODERATOR_USER_IDS`
- `MARKETPLACE_FINANCE_USER_IDS`
- `PAYOUT_DETAILS_ENCRYPTION_KEY`
- `SSO_SESSION_SECRET`

Some should remain optional for local dev, but release checks must fail or warn loudly when they are missing in production/release mode.

### Required fix

Implement release-target validation without breaking local development.

### Required behavior

- Local development may continue with unset optional env vars where features are inactive.
- Production/release health check must report:
  - critical if platform admin list is empty while partner admin surfaces are enabled
  - critical if marketplace finance list is empty while payout operations are enabled
  - critical if payout encryption key is missing while beneficiary onboarding is enabled
  - critical if SSO is enabled and no strong `SSO_SESSION_SECRET` is configured
- `.env.example` must document secure values and minimum lengths where relevant.

### Acceptance criteria

- Missing critical operator env vars are visible before release.
- Local development remains usable.
- Documentation and code agree on defaults.

---

## 5. Test Plan

The remediation PR must run and report:

```bash
npx prisma validate
npm run lint
npm run test
npm run build
```

`npm run test:e2e` should be run if the local Playwright server can start. If it cannot, the PR must report the exact blocker.

### Required targeted tests

#### Build and type tests

- Partner admin detail page type extraction compiles.

#### Partner security tests

- Partner cannot create active client access by raw org ID without approval.
- Pending access request does not grant data access.
- Client approval or platform approval creates active access.
- Empty assignment scope denies sensitive access.
- Explicit `view_invoices` scope allows invoice read.
- Missing `view_invoices` scope denies invoice read.
- Suspended partner cannot access managed client data.
- Revoked partner cannot access managed client data.
- Client-admin revocation immediately blocks partner access.

#### Partner lifecycle tests

- Suspend changes partner visibility/access state coherently.
- Revoke soft-revokes or marks active assignments inactive.
- Reinstate does not silently restore terminally revoked assignments.
- Lifecycle transitions remain auditable.

#### Release readiness tests

- `scripts/check-phase20-health.ts` reports partner OS checks.
- Empty `PLATFORM_ADMIN_USER_IDS` is surfaced.
- Phase 20 checklist includes Sprint 20.4 and 20.5 accurately.

---

## 6. Branch and PR Workflow

Claude Sonnet must use this workflow:

1. Start from latest `feature/phase-20`.
2. Do not work on `master`.
3. Create a remediation branch:
   - `feature/phase-20-pre-master-remediation`
4. Implement this PRD fully.
5. Commit with a clear message, for example:
   - `fix: harden phase 20 pre-master readiness`
6. Push the branch.
7. Open a PR:
   - base: `feature/phase-20`
   - head: `feature/phase-20-pre-master-remediation`
8. Do not merge the PR.
9. Do not merge anything into `master`.

---

## 7. Final PR Acceptance Criteria

The remediation PR is acceptable only when:

- `npm run build` passes.
- Partner assignment can no longer create active client access without approval/consent.
- Partner scope semantics are consistent.
- Client admins can revoke partner access.
- Suspended/revoked partner access cannot appear active to client admins.
- Release docs reflect all five merged Phase 20 sprints.
- Health checks cover partner OS.
- Critical Phase 20 operator env/config gaps are surfaced.
- No new unrelated product scope is introduced.
- `master` remains untouched.

---

## 8. Out of Scope

This remediation does not include:

- Phase 21 planning.
- New payout provider integration beyond existing manual/provider boundary.
- New GST portal provider integration beyond existing manual filing model.
- Broad UI redesign.
- Replacing the existing modular monolith architecture.
- Merging `feature/phase-20` to `master`.

