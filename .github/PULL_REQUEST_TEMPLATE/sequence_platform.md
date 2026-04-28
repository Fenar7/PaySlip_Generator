<!--
  Slipwise Document Sequencing Platform — Pull Request Template
  Mandatory for ALL PRs within the feature/sequence-platform initiative.
  Delete any section that does not apply, but do not remove section headers.
-->

## Title Format

```
<type>(<scope>): <short summary>

Example:
feat(engine): add concurrency-safe sequence reservation with retry loop
```

**PR Title:** <!-- paste exact PR title here -->

---

## Phase / Sprint Reference

| Field | Value |
|-------|-------|
| **Phase** | <!-- e.g., Phase 4 --> |
| **Sprint** | <!-- e.g., Sprint 4.2 --> |
| **Branch** | `<!-- source branch name -->` |
| **Target** | `<!-- target branch name -->` |
| **Workstream** | <!-- A / B / C / D --> |

---

## Implementation Summary

### What changed
<!-- 2–4 sentences describing the functional change. Be specific. -->

### Why it changed
<!-- Link to requirement, spec, or ticket. Reference the decision driver. -->

### Key design decisions
<!-- Any non-obvious choices, trade-offs, or algorithm selection. -->

### Files touched
<!-- Bulleted list of the most important files. Group by concern if > 10 files. -->

- `src/...`
- `prisma/...`
- `scripts/...`

---

## Test Evidence

### Automated tests

| Suite | Result | Evidence |
|-------|--------|----------|
| Unit tests | <!-- pass / fail / n/a --> | <!-- command + output or CI link --> |
| Integration tests | <!-- pass / fail / n/a --> | <!-- command + output or CI link --> |
| Type check (`tsc --noEmit`) | <!-- pass / fail --> | <!-- CI link --> |
| Lint (`eslint`, `prettier`) | <!-- pass / fail --> | <!-- CI link --> |
| Build (`next build`) | <!-- pass / fail --> | <!-- CI link --> |

### Manual / visual tests

<!-- For UI changes: paste screenshots, GIFs, or Loom links. For logic changes: describe manual verification steps. -->

- [ ] Tested on staging
- [ ] Tested with production-like data volume
- [ ] Cross-browser / cross-device verified (if UI)

### New test coverage

| File | What it covers |
|------|---------------|
| `src/...` | <!-- description --> |

---

## Migration Notes

### Schema changes

- [ ] No schema changes
- [ ] Schema changes present

<!-- If checked, fill out below: -->

| Migration file | `prisma/migrations/...` |
| Rollback plan | <!-- describe or link rollback script --> |
| Backfill required? | <!-- yes / no --> |
| Backfill script | `scripts/...` or N/A |
| Staging validation | <!-- yes / no / pending --> |

### Breaking changes

- [ ] No breaking changes
- [ ] Breaking changes present

<!-- If checked, describe the breakage and the migration path for consumers. -->

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| <!-- e.g., Race condition under high concurrency --> | <!-- low / med / high --> | <!-- low / med / high --> | <!-- e.g., Row-level locking + retry loop --> | <!-- open / mitigated / accepted --> |
| <!-- add rows as needed --> | | | | |

### Cross-workstream impact

- [ ] No cross-workstream changes
- [ ] Touches another workstream’s code

<!-- If checked, specify which workstream and how coordination was handled. -->

| Workstream | Area touched | Approval obtained? |
|------------|-------------|-------------------|
| <!-- e.g., A (Schema) --> | <!-- e.g., `prisma/schema.prisma` --> | <!-- yes / pending --> |

---

## Reviewer Checklist

### For all reviewers

- [ ] I understand the change and its motivation.
- [ ] The code follows project conventions and naming standards.
- [ ] Tests are present and adequate for the change.
- [ ] No `console.log`, `.only`, `.skip`, or `debugger` left behind.
- [ ] Tenant isolation is enforced where applicable.
- [ ] Error handling covers edge cases and logs appropriately.

### For workstream peer reviewer

- [ ] Change stays within the authoring workstream’s ownership boundary.
- [ ] Contracts exposed to other workstreams are stable and documented.

### For cross-workstream reviewer (if applicable)

- [ ] Interface changes are compatible with consuming workstreams.
- [ ] No implicit assumptions that break another workstream’s invariants.

### For Tech Lead (phase → root and root → master only)

- [ ] Initiative-wide consistency is maintained.
- [ ] Migration safety is confirmed.
- [ ] Rollback plan is viable within the SLO.
- [ ] Observability (logs, metrics, alerts) is in place.

---

## Workstream Owner Tag

<!--
  Select ONE and delete the others.
  This determines the primary owner accountable for the change.
-->

- [ ] **Workstream A** — Schema and Migration (`@workstream-a-lead`)
- [ ] **Workstream B** — Core Sequence Engine (`@workstream-b-lead`)
- [ ] **Workstream C** — Lifecycle Integration (`@workstream-c-lead`)
- [ ] **Workstream D** — Governance and UI (`@workstream-d-lead`)

---

## Post-Merge Actions

<!-- To be filled by merger after merge. -->

- [ ] Branch deleted
- [ ] Merge announced in `#sequence-platform-dev`
- [ ] Follow-up ticket created (if any open risks or TODOs)
- [ ] Metrics / dashboards updated (if applicable)

---

<!--
  Additional notes (optional):
  - Link to spec: ...
  - Link to design: ...
  - Link to ticket: ...
-->
