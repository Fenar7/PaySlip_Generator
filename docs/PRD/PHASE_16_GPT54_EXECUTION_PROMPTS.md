# Phase 16 GPT-5.4 Execution Prompts

## Master Orchestration Prompt

```text
You are GPT-5.4 High acting as the lead engineer for Slipwise One Phase 16 remediation.

Repository:
- payslip-generator
- current baseline is merged master after Phase 16 PR #74

Authoritative docs to read before making decisions:
1. docs/PRD/PHASE_16_AUDIT_REPORT.md
2. docs/PRD/PHASE_16_TRACEABILITY_MATRIX.md
3. docs/PRD/PHASE_16_REMEDIATION_WS_A_ACCESS_APPROVALS_PRD.md
4. docs/PRD/PHASE_16_REMEDIATION_WS_B_BOOKS_CONTRACT_PRD.md
5. docs/PRD/PHASE_16_REMEDIATION_WS_C_RECONCILIATION_CORRECTNESS_PRD.md
6. docs/PRD/PHASE_16_REMEDIATION_WS_D_DEFERRED_STUBS_PRD.md
7. docs/PRD/PHASE_16_PRD.md

Operating rules:
- Do not widen scope beyond the assigned workstream PRD.
- Do not mix workstreams in one branch.
- Do not rewrite already-correct Finance code without evidence from the audit report or tests.
- Preserve historical accounting data semantics.
- Prefer small, reviewable commits.
- Every change must be backed by tests unless the workstream PRD explicitly says the item is documentation-only.
- If you discover a new issue outside the active workstream, record it and continue without fixing it.

Execution order:
1. WS-A
2. WS-B
3. WS-C
4. WS-D only after the first three are complete

For each workstream:
- create the branch named in the PRD
- implement only the branch scope
- commit in the sequence defined by the PRD
- run the smallest relevant test set after each meaningful slice
- finish with a PR summary that references the audit finding IDs and traceability rows it closes

Definition of success:
- P0 and P1 findings from the audit report are closed by WS-A, WS-B, and WS-C
- tests prove the fixes
- PRs are easy to review because the changes are isolated by subsystem and intent
```

## WS-A Prompt

```text
You are implementing WS-A from docs/PRD/PHASE_16_REMEDIATION_WS_A_ACCESS_APPROVALS_PRD.md.

Branch:
- feature/phase-16-remediation-a-access-approvals

Read first:
- docs/PRD/PHASE_16_AUDIT_REPORT.md
- docs/PRD/PHASE_16_TRACEABILITY_MATRIX.md
- docs/PRD/PHASE_16_REMEDIATION_WS_A_ACCESS_APPROVALS_PRD.md

Required outcomes:
- fix approval authority so org membership alone is insufficient
- align Books access with the workstream PRD role mapping
- fix reject-state behavior for vendor bills and payment runs
- add regression tests for role enforcement and reject/resubmit flows

Important constraints:
- do not implement journal attachments, settings UX, reconciliation tunables, or deferred roadmap stubs here
- do not invent a large new workflow engine
- keep current role enum unless absolutely required otherwise

Commit slices:
1. books-rbac-foundation
2. finance-approval-authz
3. approval-rejection-state-fix
4. tests-books-rbac-and-approvals
5. docs-phase16-access-approvals

Before finalizing:
- run targeted Books and approval tests
- run any additional tests needed to prove no regression in existing approval flows
- summarize which audit findings and traceability rows are now closed
```

## WS-B Prompt

```text
You are implementing WS-B from docs/PRD/PHASE_16_REMEDIATION_WS_B_BOOKS_CONTRACT_PRD.md.

Branch:
- feature/phase-16-remediation-b-books-contract

Read first:
- docs/PRD/PHASE_16_AUDIT_REPORT.md
- docs/PRD/PHASE_16_TRACEABILITY_MATRIX.md
- docs/PRD/PHASE_16_REMEDIATION_WS_B_BOOKS_CONTRACT_PRD.md

Required outcomes:
- complete the Books settings contract for mappings/defaults
- add journal attachment support
- resolve the reopen approval-hook ambiguity using the explicit decision in the PRD

Important constraints:
- do not change Books RBAC beyond what the active branch strictly needs
- do not absorb reconciliation correctness work
- do not implement deferred marketplace or GST automation here

Commit slices:
1. books-settings-read-model
2. books-settings-edit-actions
3. journal-attachments-schema-and-storage
4. journal-attachments-ui
5. books-contract-tests-and-docs

Before finalizing:
- run relevant schema, server-action, and UI tests
- verify historical postings are not rewritten by mapping edits
- summarize which audit findings and traceability rows are now closed
```

## WS-C Prompt

```text
You are implementing WS-C from docs/PRD/PHASE_16_REMEDIATION_WS_C_RECONCILIATION_CORRECTNESS_PRD.md.

Branch:
- feature/phase-16-remediation-c-reconciliation-correctness

Read first:
- docs/PRD/PHASE_16_AUDIT_REPORT.md
- docs/PRD/PHASE_16_TRACEABILITY_MATRIX.md
- docs/PRD/PHASE_16_REMEDIATION_WS_C_RECONCILIATION_CORRECTNESS_PRD.md

Required outcomes:
- replace hardcoded import/reconciliation guardrails with config-backed tunables
- harden reconciliation edge cases with tests
- confirm report and close behavior remains authoritative

Important constraints:
- do not alter Books authority or approval routing here
- do not redesign import UX unless needed for correctness
- do not implement deferred roadmap stubs here

Commit slices:
1. books-config-tunables
2. reconciliation-edge-case-hardening
3. reports-and-close-regressions
4. docs-phase16-reconciliation-hardening

Before finalizing:
- run targeted reconciliation, reporting, and close tests
- verify statements still derive from posted data
- summarize which audit findings and traceability rows are now closed
```

## WS-D Prompt

```text
You are implementing WS-D from docs/PRD/PHASE_16_REMEDIATION_WS_D_DEFERRED_STUBS_PRD.md.

Branch:
- feature/phase-16-remediation-d-deferred-phase16-stubs

Read first:
- docs/PRD/PHASE_16_AUDIT_REPORT.md
- docs/PRD/PHASE_16_TRACEABILITY_MATRIX.md
- docs/PRD/PHASE_16_REMEDIATION_WS_D_DEFERRED_STUBS_PRD.md

Required outcomes:
- decide whether each deferred Phase 16 stub is implemented now or formally deferred
- if implemented, keep scope minimal and testable
- if deferred, make the deferment explicit and remove ambiguity

Important constraints:
- do not touch WS-A, WS-B, or WS-C fixes here
- do not let this branch become a catch-all for unrelated finance work

Commit slices:
1. deferred-stub-decision-record
2. marketplace-payout-implementation-or-deferral
3. gst-json-implementation-or-deferral
4. tests-and-docs-deferred-phase16

Before finalizing:
- summarize exactly which deferred items were implemented and which were moved out
- keep the PR focused on roadmap ownership, not broad refactoring
```

Resolved outcome for WS-D:
- Marketplace payout automation is deferred out of active Phase 16 remediation.
- GST JSON export may be implemented in minimal form.
- GST portal/API submission remains deferred unless a dedicated contract is added first.
