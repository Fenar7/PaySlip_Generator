# Codex Context Snapshot
**Date:** 2026-04-06 IST
**Repository:** `/Users/mac/Fenar/Zenxvio/product-works/payslip-generator`
**Current Branch:** `feature/phase-8-9-pdf-pixel`
**Current HEAD:** `79e35c8`

## Current Local State
- `git status` is clean on tracked files.
- There are no current tracked modifications in the working tree.
- This snapshot was created from the local repo state on `feature/phase-8-9-pdf-pixel`.

## Recent Completed Fix
- A Next.js 16 build error was diagnosed and fixed on branch `codex/fix-server-action-require-org`.
- PR opened: `#42`
- PR URL: `https://github.com/Fenar7/PaySlip_Generator/pull/42`

## Fix Summary
- File changed: `src/lib/auth/require-org.ts`
- Root cause: the file had a top-level `"use server"` directive.
- In Next.js 16, that caused the whole module to be treated as a Server Actions file.
- The same module exported `hasRole(...)` as a synchronous helper, which triggered the build error: `Server Actions must be async functions.`

## Applied Change
- Replaced the top-level `"use server"` directive with:

```ts
import "server-only";
```

- This keeps the module server-only without forcing every export in the file to be an async Server Action.

## Verification
- `npm run build` completed successfully after the change.
- The original `Server Actions must be async functions` error from `src/lib/auth/require-org.ts` was resolved.

## Important Note
- The auth fix branch and PR exist separately from the branch currently checked out in this repository snapshot.
- If resuming work on that fix specifically, switch to:

```bash
git checkout codex/fix-server-action-require-org
```

- If resuming the broader product work, continue from the current branch:

```bash
git checkout feature/phase-8-9-pdf-pixel
```
