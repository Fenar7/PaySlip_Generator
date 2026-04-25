# PDF Studio — Branch and Merge Workflow

**Version:** Phase 38 in progress  
**Date:** 2026-04-25  
**Applies to:** All PDF Studio work during and after Phase 38, including post-roadmap remediation

---

## 1. Integration Branch

The PDF Studio integration branch is:

```
pdf-studio-continuation
```

No sprint branch or phase branch should target `master` directly.

---

## 2. Phase Branches

Each phase is created from `pdf-studio-continuation`:

```bash
git checkout pdf-studio-continuation
git pull origin pdf-studio-continuation
git checkout -b feature/pdf-studio-phase-N
```

Examples:
- `feature/pdf-studio-phase-36`
- `feature/pdf-studio-phase-37`
- `feature/pdf-studio-phase-38`

---

## 3. Sprint Branches

Each sprint branch is created from the **current head of its phase branch**, not from `master` and not from another sprint branch:

```bash
git checkout feature/pdf-studio-phase-N
git pull origin feature/pdf-studio-phase-N
git checkout -b feature/pdf-studio-phase-N-sprint-N-M
```

Examples:
- `feature/pdf-studio-phase-38-sprint-38-1`
- `feature/pdf-studio-phase-38-sprint-38-2`
- `feature/pdf-studio-phase-38-sprint-38-3`

---

## 4. PR Target Rules

| Branch type | PR target |
|---|---|
| Sprint branch | Its phase branch |
| Phase branch (after all sprints merged) | `pdf-studio-continuation` |

Flow:
1. Sprint PR → phase branch
2. Next sprint branches from updated phase branch after earlier sprint is merged
3. Only when the full phase is complete does the phase branch merge into `pdf-studio-continuation`

---

## 5. Phase Completion Checklist

A phase is complete only when:

- [ ] All phase sprints are merged into the phase branch
- [ ] Focused lint and test coverage for the phase pass
- [ ] Phase acceptance criteria are satisfied
- [ ] Release owner and QA sign off on the phase summary
- [ ] The phase branch is merged into `pdf-studio-continuation`

---

## 6. Post-Roadmap Remediation

After Phase 38 completes and the roadmap closes, any additional PDF Studio work should be treated as:

- **post-completion enhancement work**, or
- **targeted remediation work**

Both should begin from a **new PRD** rather than extending the Phases 36–38 PRD.

### Remediation branch model

1. Create a remediation phase branch from `pdf-studio-continuation`:
   ```bash
   git checkout pdf-studio-continuation
   git pull origin pdf-studio-continuation
   git checkout -b feature/pdf-studio-remediation-YYYY-MM
   ```

2. Create sprint branches under the remediation phase branch following the same sprint rules above.

3. PR target rules remain the same: sprint → phase branch → `pdf-studio-continuation`.

---

## 7. Important Constraints

- Never work on `master` directly for PDF Studio changes
- Never work directly on `pdf-studio-continuation`
- Never branch from an unmerged sprint branch
- Never target `master` from a sprint or phase PR
- Keep branch names predictable: `feature/pdf-studio-phase-N` and `feature/pdf-studio-phase-N-sprint-N-M`

---

*For the current suite state, see `pdf-studio-engineering-handoff.md`.*
