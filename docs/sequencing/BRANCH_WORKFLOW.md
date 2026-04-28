# Slipwise Document Sequencing Platform — Branch Workflow

> **Scope:** All branches, pull requests, and merges for the `feature/sequence-platform` initiative.  
> **Authority:** Workstream B (Core Sequence Engine) owns this document. Changes require Workstream B approval.

---

## 1. Branch Naming Convention

### 1.1 Hierarchy

```
master
└── feature/sequence-platform                    [root feature branch]
    ├── feature/sequence-platform-phase-0-delivery
    │   └── feature/sequence-platform-phase-0-sprint-0-1-delivery-setup
    ├── feature/sequence-platform-phase-1-foundation
    │   ├── feature/sequence-platform-phase-1-sprint-1-1-schema-foundation
    │   ├── feature/sequence-platform-phase-1-sprint-1-2-format-engine
    │   └── feature/sequence-platform-phase-1-sprint-1-3-migration-scaffolding
    ├── feature/sequence-platform-phase-2-governance
    │   ├── feature/sequence-platform-phase-2-sprint-2-1-owner-governance
    │   ├── feature/sequence-platform-phase-2-sprint-2-2-settings-console
    │   └── feature/sequence-platform-phase-2-sprint-2-3-continuity-history
    ├── feature/sequence-platform-phase-3-onboarding
    │   ├── feature/sequence-platform-phase-3-sprint-3-1-onboarding-step
    │   ├── feature/sequence-platform-phase-3-sprint-3-2-custom-format-setup
    │   └── feature/sequence-platform-phase-3-sprint-3-3-recovery-fallback
    ├── feature/sequence-platform-phase-4-draft-stop-consuming
    │   ├── feature/sequence-platform-phase-4-sprint-4-1-drafts-stop-consuming
    │   ├── feature/sequence-platform-phase-4-sprint-4-2-issue-time-numbering
    │   └── feature/sequence-platform-phase-4-sprint-4-3-invoice-compat
    ├── feature/sequence-platform-phase-5-approval-numbering
    │   ├── feature/sequence-platform-phase-5-sprint-5-1-drafts-stop-consuming
    │   ├── feature/sequence-platform-phase-5-sprint-5-2-approval-time-numbering
    │   └── feature/sequence-platform-phase-5-sprint-5-3-voucher-compat
    ├── feature/sequence-platform-phase-6-resequence
    │   ├── feature/sequence-platform-phase-6-sprint-6-1-resequence-preview
    │   ├── feature/sequence-platform-phase-6-sprint-6-2-open-period-apply
    │   └── feature/sequence-platform-phase-6-sprint-6-3-gap-detection
    └── feature/sequence-platform-phase-7-hardening
        ├── feature/sequence-platform-phase-7-sprint-7-1-concurrency-hardening
        ├── feature/sequence-platform-phase-7-sprint-7-2-diagnostics
        └── feature/sequence-platform-phase-7-sprint-7-3-final-regression-rollout
```

### 1.2 Pattern Reference

| Level | Pattern | Example |
|-------|---------|---------|
| Root feature | `feature/sequence-platform` | `feature/sequence-platform` |
| Phase | `feature/sequence-platform-phase-N-{theme}` | `feature/sequence-platform-phase-1-foundation` |
| Sprint | `feature/sequence-platform-phase-N-sprint-M-K-{theme}` | `feature/sequence-platform-phase-1-sprint-1-2-format-engine` |
| Emergency | `feature/sequence-platform-phase-N-{theme}-hotfix-{YYYYMMDD}-{slug}` | `feature/sequence-platform-phase-4-draft-stop-consuming-hotfix-20260428-race-condition` |

**Rules:**
- Use lowercase kebab-case only.
- `N` = phase number (0–7).
- `M-K` = sprint number (`M` = phase prefix, `K` = sprint within phase).
- `{theme}` = 2–4 word kebab-case summary of sprint/phase purpose.
- No underscores, no dots. Use hyphens only.

---

## 2. Branch Lifecycle

### 2.1 Creation

| Step | Actor | Action |
|------|-------|--------|
| 1 | Tech Lead / Workstream Lead | Create phase branch from `feature/sequence-platform` |
| 2 | Sprint Lead | Create sprint branch from its parent phase branch |
| 3 | Developer | Create personal topic branches from sprint branch (optional) |

```bash
# Phase branch
git checkout feature/sequence-platform
git pull origin feature/sequence-platform
git checkout -b feature/sequence-platform-phase-2-governance

# Sprint branch
git checkout feature/sequence-platform-phase-2-governance
git pull origin feature/sequence-platform-phase-2-governance
git checkout -b feature/sequence-platform-phase-2-sprint-2-1-owner-governance
```

### 2.2 Review & Merge

1. All sprint work lands in the sprint branch via PR.
2. Sprint branch merges into phase branch via PR.
3. Phase branch merges into root feature branch via PR.
4. Root feature branch merges into `master` via PR at initiative completion.

### 2.3 Cleanup

- Sprint branches are **deleted after merge into phase branch**.
- Phase branches are **deleted after merge into root feature branch**.
- Root feature branch is **deleted after merge into `master`**.
- Emergency/hotfix branches are **deleted 48 hours after merge** to allow audit.

---

## 3. PR Flow

### 3.1 Merge Chain

```
Sprint Branch
     │  PR #1 (sprint → phase)
     ▼
Phase Branch
     │  PR #2 (phase → root feature)
     ▼
Root Feature Branch
     │  PR #3 (root feature → master)
     ▼
   master
```

### 3.2 PR Requirements by Level

| Level | Required Reviewers | Min Approvals | CI Checks | Migration Review |
|-------|-------------------|---------------|-----------|------------------|
| Sprint → Phase | 1 workstream peer + 1 cross-workstream | 2 | Pass | If schema changed |
| Phase → Root | 2 workstream leads + Tech Lead | 3 | Pass | Mandatory |
| Root → Master | Tech Lead + QA Lead + Security | 3 | Pass + regression suite | Mandatory |

### 3.3 PR Template

All PRs must use the template at `.github/PULL_REQUEST_TEMPLATE/sequence_platform.md`.

---

## 4. Commit Discipline

### 4.1 Conventional Commits

```
<type>(<scope>): <subject>

<body>

Refs: <phase-sprint-ref>
```

| Type | Use When |
|------|----------|
| `feat` | New functionality |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes nor adds |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `docs` | Documentation only |
| `chore` | Maintenance, deps, tooling |
| `migration` | Database schema or data migration |

### 4.2 Scope Values

| Scope | Area |
|-------|------|
| `schema` | Database schema, Prisma models |
| `engine` | Sequence engine core logic |
| `lifecycle` | Document lifecycle hooks |
| `governance` | Owner governance, settings |
| `ui` | React components, settings console |
| `migration` | Migration scripts, backfills |
| `test` | Test suites, fixtures |
| `docs` | Documentation |

### 4.3 Examples

```
feat(engine): add format template resolution for invoice sequences

Implements pattern-based format resolution with fallback to default.
Adds integration tests for cross-tenant isolation.

Refs: phase-4-sprint-4-3
```

```
migration(schema): add sequence_registry table with tenant isolation

Includes index on (tenant_id, document_type, fiscal_year).
Backfill script in /scripts/backfill-sequence-registry.ts.

Refs: phase-1-sprint-1-1
```

### 4.4 Atomic Commits

- One logical change per commit.
- No “dump” commits (`wip`, `fix stuff`, `updates`).
- Squash fixups before PR submission.
- Every commit must leave the codebase buildable and tests passing.

---

## 5. Review Expectations

### 5.1 Who Reviews What

| Workstream | Primary Reviewer For | Cross-Review Duty |
|------------|---------------------|-------------------|
| A (Schema & Migration) | Schema changes, migration scripts, Prisma models | Engine interfaces |
| B (Core Sequence Engine) | Engine logic, number generation, format resolution | Lifecycle integration points |
| C (Lifecycle Integration) | Lifecycle hooks, document state transitions, draft/approval flows | Engine consumption patterns |
| D (Governance & UI) | Settings console, owner governance UI, permissions | Schema contract for settings |

### 5.2 Required Checks

- [ ] Code compiles (`next build` or equivalent).
- [ ] Unit tests pass (`npm test` / `vitest`).
- [ ] Lint passes (`eslint`, `prettier --check`).
- [ ] Type-check passes (`tsc --noEmit`).
- [ ] Migration dry-run succeeds (if applicable).
- [ ] No `.only` or `skip` left in tests.
- [ ] No `console.log` in production paths.

### 5.3 What Reviewers Must Check

1. **Correctness:** Logic matches sprint specification.
2. **Ownership:** Code changes stay within the authoring workstream’s boundary; cross-boundary changes are flagged.
3. **Testing:** Evidence of tests (unit, integration, or manual) is present in PR.
4. **Migration Safety:** Schema or data changes include rollback plan.
5. **Observability:** New flows include logging or metrics.
6. **Security:** Tenant isolation is enforced; no SQL injection or path traversal.

---

## 6. Multi-Agent Ownership Boundaries

### 6.1 Workstream A — Schema and Migration

**Owns:**
- `prisma/schema.prisma` — all sequence-related models
- `prisma/migrations/*sequence*` — migration files
- `src/features/sequence/schema/` — schema validation contracts
- `scripts/backfill-*-sequence*.ts` — backfill scripts
- `src/lib/db/sequence/` — DB helpers for sequence operations

**Contracts exposed to others:**
- `SequenceRegistry` model shape
- `SequenceFormat` model shape
- Migration rollback procedures

### 6.2 Workstream B — Core Sequence Engine

**Owns:**
- `src/features/sequence/engine/` — generation, reservation, format resolution
- `src/features/sequence/format/` — pattern parsing, template rendering
- `src/features/sequence/rules/` — business rules for numbering
- `src/lib/sequence/` — shared engine utilities

**Contracts exposed to others:**
- `SequenceEngine.generate(options)`
- `SequenceEngine.reserve(options)`
- `FormatResolver.resolve(tenantId, docType, context)`

### 6.3 Workstream C — Lifecycle Integration

**Owns:**
- `src/features/sequence/lifecycle/` — hooks for draft, issue, approval, void
- `src/features/documents/hooks/sequence*.ts` — document-level sequence hooks
- `src/features/invoices/sequence*.ts` — invoice-specific integration
- `src/features/vouchers/sequence*.ts` — voucher-specific integration

**Contracts exposed to others:**
- Lifecycle event payload shape
- Hook registration API

### 6.4 Workstream D — Governance and UI

**Owns:**
- `src/features/sequence/settings/` — settings API routes
- `src/app/(dashboard)/settings/sequences/` — settings pages
- `src/components/sequence/settings/` — settings UI components
- `src/features/sequence/permissions/` — RBAC for sequence management

**Contracts exposed to others:**
- Settings REST/ tRPC endpoints
- Permission check helpers

### 6.5 Touching Another Workstream’s Code

1. Open a draft PR with the proposed interface change.
2. Tag the owning workstream lead for early review.
3. Do not merge until the owning workstream approves.
4. Document the exception in the PR **Risk Register** section.

---

## 7. Merge Order Diagram

```
feature/sequence-platform-phase-0-delivery
└── feature/sequence-platform-phase-0-sprint-0-1-delivery-setup ─────────────────┐
                                                                                 │
feature/sequence-platform-phase-1-foundation                                         │
├── feature/sequence-platform-phase-1-sprint-1-1-schema-foundation ────────────┐ │
├── feature/sequence-platform-phase-1-sprint-1-2-format-engine ────────────────┤ │
└── feature/sequence-platform-phase-1-sprint-1-3-migration-scaffolding ────────┤ │
                                                                               │ │
feature/sequence-platform-phase-2-governance                                   │ │
├── feature/sequence-platform-phase-2-sprint-2-1-owner-governance ─────────────┤ │
├── feature/sequence-platform-phase-2-sprint-2-2-settings-console ─────────────┤ │
└── feature/sequence-platform-phase-2-sprint-2-3-continuity-history ───────────┤ │
                                                                               │ │
feature/sequence-platform-phase-3-onboarding                                   │ │
├── feature/sequence-platform-phase-3-sprint-3-1-onboarding-step ──────────────┤ │
├── feature/sequence-platform-phase-3-sprint-3-2-custom-format-setup ──────────┤ │
└── feature/sequence-platform-phase-3-sprint-3-3-recovery-fallback ────────────┤ │
                                                                               │ │
feature/sequence-platform-phase-4-draft-stop-consuming                         │ │
├── feature/sequence-platform-phase-4-sprint-4-1-drafts-stop-consuming ────────┤ │
├── feature/sequence-platform-phase-4-sprint-4-2-issue-time-numbering ─────────┤ │
└── feature/sequence-platform-phase-4-sprint-4-3-invoice-compat ───────────────┤ │
                                                                               │ │
feature/sequence-platform-phase-5-approval-numbering                           │ │
├── feature/sequence-platform-phase-5-sprint-5-1-drafts-stop-consuming ────────┤ │
├── feature/sequence-platform-phase-5-sprint-5-2-approval-time-numbering ──────┤ │
└── feature/sequence-platform-phase-5-sprint-5-3-voucher-compat ───────────────┤ │
                                                                               │ │
feature/sequence-platform-phase-6-resequence                                   │ │
├── feature/sequence-platform-phase-6-sprint-6-1-resequence-preview ───────────┤ │
├── feature/sequence-platform-phase-6-sprint-6-2-open-period-apply ────────────┤ │
└── feature/sequence-platform-phase-6-sprint-6-3-gap-detection ────────────────┤ │
                                                                               │ │
feature/sequence-platform-phase-7-hardening                                    │ │
├── feature/sequence-platform-phase-7-sprint-7-1-concurrency-hardening ────────┤ │
├── feature/sequence-platform-phase-7-sprint-7-2-diagnostics ──────────────────┤ │
└── feature/sequence-platform-phase-7-sprint-7-3-final-regression-rollout ─────┘ │
                                                                                 │
                              feature/sequence-platform ◄────────────────────────┘
                                         │
                                         │  PR: Root Feature → master
                                         ▼
                                       master
```

**Merge order rules:**
1. Sprint branches merge **up** into their phase branch.
2. Phase branches merge **up** into `feature/sequence-platform`.
3. `feature/sequence-platform` merges **up** into `master` **once** at initiative completion.
4. No phase branch may merge into `master` directly.
5. No sprint branch may merge into another phase branch.

---

## 8. Phase 0 Specific Workflow

Phase 0 is unique: it contains **only one sprint** (Sprint 0-1 — delivery setup).

### 8.1 Branch Structure

```
feature/sequence-platform
└── feature/sequence-platform-phase-0-delivery
    └── feature/sequence-platform-phase-0-sprint-0-1-delivery-setup
```

### 8.2 Workflow

| Step | Action | Owner |
|------|--------|-------|
| 1 | Create `feature/sequence-platform-phase-0-delivery` from `feature/sequence-platform` | Tech Lead |
| 2 | Create `feature/sequence-platform-phase-0-sprint-0-1-delivery-setup` from phase-0-delivery | Sprint Lead |
| 3 | Deliver CI pipeline, lint rules, base test harness, branch protections, this document | All workstreams |
| 4 | Open PR: sprint branch → phase branch | Sprint Lead |
| 5 | Review and merge sprint branch into phase branch | Tech Lead |
| 6 | Open PR: phase branch → root feature branch | Tech Lead |
| 7 | Review and merge phase branch into `feature/sequence-platform` | Tech Lead |
| 8 | Delete sprint and phase branches | Tech Lead |

### 8.3 Phase 0 Gate Criteria

Before any Phase 1 sprint branch may be created, the following must be true:

- [ ] `feature/sequence-platform` has the latest CI workflow.
- [ ] All workstream leads have verified their branch creation permissions.
- [ ] This `BRANCH_WORKFLOW.md` is committed and frozen.
- [ ] The PR template at `.github/PULL_REQUEST_TEMPLATE/sequence_platform.md` is active.
- [ ] A successful test PR has been opened and merged through the full chain.

---

## 9. Emergency / Remediation Branches

### 9.1 Naming

```
feature/sequence-platform-phase-N-{theme}-hotfix-{YYYYMMDD}-{slug}
```

**Examples:**
- `feature/sequence-platform-phase-4-draft-stop-consuming-hotfix-20260428-race-condition`
- `feature/sequence-platform-phase-6-resequence-hotfix-20260515-gap-calculation`

### 9.2 Workflow

1. Branch from the **affected phase branch** (not from root or master).
2. Prefix commits with `hotfix:` instead of `feat:` or `fix:`.
3. PR targets the phase branch directly.
4. After merge, the phase branch must immediately open a sync PR into `feature/sequence-platform`.
5. Delete hotfix branch 48 hours post-merge.

### 9.3 Criteria for Hotfix

- [ ] Production-impacting bug discovered in a merged phase branch.
- [ ] Bug blocks a subsequent sprint or phase.
- [ ] Tech Lead approves bypassing normal sprint cycle.

### 9.4 Emergency Merge Exception

If CI is red due to infrastructure (not code), the Tech Lead may approve merge with:
- Explicit override comment on PR.
- Ticket filed to fix CI within 24 hours.
- Post-merge validation run within 4 hours.

---

## 10. Pre-Merge Checklist

Every PR at every level must satisfy the following before merge:

### 10.1 Code Quality

- [ ] Title follows conventional commit format.
- [ ] All commits are atomic; no dump commits present.
- [ ] Branch is up to date with its target (rebased or merged).
- [ ] No merge conflicts.
- [ ] Lint passes (`eslint`, `prettier`).
- [ ] Type-check passes (`tsc --noEmit`).
- [ ] Build passes (`next build`).

### 10.2 Testing

- [ ] Unit tests added/updated for new logic.
- [ ] Unit tests pass.
- [ ] Integration tests pass (if sprint touches DB or external service).
- [ ] Manual test evidence attached for UI changes (screenshot or Loom).
- [ ] No `.only`, `.skip`, or `debugger` left in code.

### 10.3 Schema / Migration

- [ ] Migration file is present if schema changed.
- [ ] Migration has been tested against a fresh database.
- [ ] Migration has been tested against a production-like dataset (staging).
- [ ] Rollback script or backward-compatible path is documented.
- [ ] Backfill script is present if required, with dry-run mode.

### 10.4 Ownership & Review

- [ ] PR uses the `sequence_platform.md` template.
- [ ] Workstream owner tag is present.
- [ ] At least one reviewer from the same workstream has approved.
- [ ] At least one cross-workstream reviewer has approved (for boundary changes).
- [ ] Tech Lead approval is present (phase → root and root → master).

### 10.5 Observability & Risk

- [ ] Risk register is filled out in PR description.
- [ ] New code paths include structured logging.
- [ ] No hardcoded secrets or PII in logs.
- [ ] Tenant isolation is verified for multi-tenant changes.

### 10.6 Final Merge Action

- [ ] Merge strategy: **Create a merge commit** (do not squash phase/root merges; squash allowed for sprint → phase if sprint had many WIP commits).
- [ ] Branch is deleted after merge (per Section 2.3).
- [ ] Merge is announced in `#sequence-platform-dev`.

---

## Appendix A: Quick Reference Card

| Action | Command |
|--------|---------|
| Start phase branch | `git checkout feature/sequence-platform && git pull && git checkout -b feature/sequence-platform-phase-N-theme` |
| Start sprint branch | `git checkout feature/sequence-platform-phase-N-theme && git pull && git checkout -b feature/sequence-platform-phase-N-sprint-M-K-theme` |
| Update sprint branch from phase | `git fetch origin && git rebase origin/feature/sequence-platform-phase-N-theme` |
| Open PR | Use GitHub CLI: `gh pr create --template sequence_platform.md` |

| Who to tag | When |
|------------|------|
| `@workstream-a-lead` | Schema or migration changes |
| `@workstream-b-lead` | Engine or format logic changes |
| `@workstream-c-lead` | Lifecycle hook or document flow changes |
| `@workstream-d-lead` | UI, settings, or permission changes |
| `@tech-lead` | Phase → root or root → master PRs |
