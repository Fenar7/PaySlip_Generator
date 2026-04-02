# PDF Password Protection PRD

**Project:** PDF Studio  
**Repository:** `payslip-generator`  
**Status:** Proposed / Ready for engineering handoff  
**Date:** 2026-04-02  
**Audience:** Product, engineering, QA, future AI/code agents

---

## 1. Executive Summary

PDF Studio currently exposes a password protection UI, validates passwords, and collects permission preferences, but the exported PDF is **not actually encrypted**. This creates a product trust gap: the UI implies security, while the file remains unprotected.

This PRD defines the complete implementation plan for making password protection real and production-safe.

### Final recommendation

Do **not** replace the current `pdf-lib` generator with `PDFKit` as the first implementation step.

Instead:

1. Keep the existing client-side PDF generation pipeline built on `pdf-lib`
2. Add a **server-side encryption step** for password-protected exports
3. Remove **raw password persistence** from browser session storage
4. Enforce **fail-closed behavior** so protected export never falls back to downloading an unprotected file

This path solves the real feature gap with the lowest regression risk.

---

## 2. Current State

### What already exists

The repo already contains:

- Password settings UI
- Password confirmation validation
- Password strength scoring
- Permission toggles for printing/copying/modifying
- Password settings persisted in session state
- A placeholder encryption function in the PDF generator

### Current code locations

Primary files involved:

- `src/features/pdf-studio/components/password-settings-panel.tsx`
- `src/features/pdf-studio/utils/password.ts`
- `src/features/pdf-studio/utils/pdf-generator.ts`
- `src/features/pdf-studio/utils/session-storage.ts`
- `src/features/pdf-studio/components/pdf-studio-workspace.tsx`
- `src/features/pdf-studio/types.ts`

### Current product gap

In `src/features/pdf-studio/utils/pdf-generator.ts`, the current `encryptPdf(...)` path is only a placeholder. It logs intent and still returns a normal PDF via `pdfDoc.save()`.

That means:

- the file is not password-gated
- the file does not enforce permissions
- the product currently overpromises

### Current security issue

`src/features/pdf-studio/utils/session-storage.ts` currently persists:

- `password.userPassword`
- `password.confirmPassword`
- `password.ownerPassword`

That is not acceptable for a production security feature.

---

## 3. Problem Statement

PDF Studio needs real PDF password protection.

Today the feature is incomplete because:

1. the UI collects password settings but the resulting PDF is not encrypted
2. raw passwords are stored in session storage
3. export does not fail safely when encryption is unavailable

Until those issues are fixed, the feature cannot be considered production-ready.

---

## 4. Goals

### Primary goal

Generate PDFs that are actually password protected when password protection is enabled.

### Secondary goals

- Preserve the existing PDF Studio rendering behavior
- Keep current non-password export behavior unchanged
- Handle secrets safely
- Make the system easy to verify with automated tests and manual QA

### Non-goals

This work does **not** include:

- digital signatures
- certificate-based encryption
- document DRM
- collaborative access management
- replacing the entire PDF rendering engine in this phase

---

## 5. User-Facing Requirements

### Functional requirements

When a user enables password protection:

- the generated PDF must require a password to open
- the user password must be supported
- an optional owner password must be supported
- permission preferences for printing/copying/modifying must be applied where supported by the PDF standard and reader

### UX requirements

- invalid password configuration must block export
- encryption errors must be shown clearly
- no unprotected file may download if protection was requested
- UI should state that passwords are only used for the current export and are not saved

### Security requirements

- raw password values must not be persisted in browser storage
- raw password values must not be included in logs
- raw password values must not appear in query params
- raw password values must not be returned in API error payloads

---

## 6. Recommended Architecture

## 6.1 Decision

Use a **hybrid architecture**:

- generate the base PDF on the client using existing `pdf-lib` logic
- if password protection is enabled, send the generated PDF bytes to a server endpoint
- perform encryption on the server
- return encrypted PDF bytes to the client for download

## 6.2 Why this approach

This is the correct first implementation because it minimizes change to the already-working PDF Studio pipeline.

The current generator already handles:

- page sizing
- page orientation
- image placement
- JPEG/PNG embedding
- metadata application
- page numbers
- watermark rendering
- OCR hidden text overlay

Replacing all of that just to gain encryption is unnecessary risk.

## 6.3 Why not switch fully to PDFKit now

A full `pdf-lib` -> `PDFKit` migration is not a small enhancement. It is a rendering-engine replacement.

That would require revalidating or rebuilding:

- image placement behavior
- compression behavior
- metadata logic
- watermark behavior
- page number placement
- OCR text overlay handling
- browser/client assumptions in the current export flow

The likely outcome is a much larger QA and regression surface. It may be worth evaluating later, but it should not block delivery of real password protection now.

---

## 7. Detailed Product Behavior

## 7.1 Export behavior

### Case A: Password protection disabled

Behavior:

- generate PDF locally
- download immediately
- same behavior as today

### Case B: Password protection enabled and valid

Behavior:

1. validate password settings
2. generate base PDF locally
3. call encryption endpoint with PDF bytes and password settings
4. receive encrypted PDF bytes
5. download encrypted file

### Case C: Password protection enabled but invalid

Behavior:

- do not generate downloadable result
- show validation errors
- do not call the encryption endpoint

### Case D: Password protection enabled but encryption fails

Behavior:

- do not download any file
- show a user-facing error
- leave no false impression of success

---

## 8. Data Model and Interface Contract

## 8.1 Existing UI type

The existing `PasswordSettings` shape in `src/features/pdf-studio/types.ts` should remain the UI-facing contract for this phase:

```ts
type PasswordSettings = {
  enabled: boolean;
  userPassword: string;
  confirmPassword: string;
  ownerPassword?: string;
  permissions: {
    printing: boolean;
    copying: boolean;
    modifying: boolean;
  };
};
```

This avoids churn in the settings panel and workspace state.

## 8.2 Persistence rules

Session persistence must change so that only non-secret password configuration is stored.

Persist:

- `password.enabled`
- `password.permissions`

Do not persist:

- `password.userPassword`
- `password.confirmPassword`
- `password.ownerPassword`

On session restore:

- the password toggle may remain enabled if that was the last state
- the permission checkboxes may remain restored
- all password input fields must be empty

## 8.3 New internal API

Add a server-side API endpoint dedicated to PDF encryption.

Recommended request contents:

- base PDF bytes
- `userPassword`
- optional `ownerPassword`
- permissions object

Recommended response behavior:

- success: raw encrypted PDF bytes with `application/pdf`
- error: structured, sanitized error response without leaking secrets

## 8.4 New internal server module

Add a dedicated server-only encryption adapter that owns:

- backend-specific encryption implementation
- permission mapping
- validation normalization
- error wrapping

Recommended conceptual interface:

```ts
encryptPdf(pdfBytes: Uint8Array, passwordSettings: PasswordSettings): Promise<Uint8Array>
```

The actual implementation may define a server-specific DTO if needed, but the behavior should remain equivalent.

---

## 9. Security Requirements

### Secret-handling policy

Passwords are **transient secrets**. They should exist only in client memory during the current editing/export session.

### Required behaviors

- no password persistence in `sessionStorage`
- no password logging in browser console
- no password logging on the server
- no password in analytics or telemetry
- no password in URL/query string
- password values should be cleared after successful protected export
- password values should also be cleared after hard encryption failure, unless product explicitly prefers retry convenience

### Failure policy

This feature must be **fail-closed**.

If the user requested a protected file and encryption cannot be completed, the app must not silently fall back to downloading an unprotected PDF.

---

## 10. Engineering Plan

## Phase 0: Feasibility spike

Objective:

- prove a working server-side encryption backend inside this app/runtime

Tasks:

- identify a backend/library/tooling path that can encrypt an existing PDF
- confirm support for:
  - user password
  - owner password
  - permission flags
- confirm output opens correctly in target readers
- confirm the backend works in the deployment/runtime model used by this app

Exit criteria:

- one reproducible proof-of-concept successfully transforms unencrypted PDF bytes into a password-protected PDF

## Phase 1: Secret persistence fix

Objective:

- remove unsafe password persistence immediately

Tasks:

- update session serialization to omit raw password fields
- update restore path so password inputs always restore as blank
- keep password toggle + permissions if desired
- update password panel helper text

Exit criteria:

- refreshing the page never repopulates raw password fields

## Phase 2: Server encryption service

Objective:

- provide a stable backend encryption interface

Tasks:

- add internal API route for encryption
- add request validation
- add encryption adapter module
- map UI permissions to backend-specific options
- ensure safe errors and no secret leakage

Exit criteria:

- API returns encrypted PDF bytes for valid inputs
- API rejects invalid inputs safely

## Phase 3: Client integration

Objective:

- wire protected export into the existing workspace flow

Tasks:

- preserve current local-only flow for non-protected exports
- add protected-export branch that calls the encryption API
- block export on invalid password settings
- hard-fail on encryption failure
- ensure success state only appears after encrypted bytes are returned

Exit criteria:

- protected export works end-to-end from UI to encrypted download

## Phase 4: Verification and hardening

Objective:

- make the feature release-ready

Tasks:

- add unit tests
- add integration tests
- add E2E coverage
- update manual QA checklist
- document reader-specific caveats for permissions

Exit criteria:

- all required automated and manual checks pass

---

## 11. Test Plan

## 11.1 Unit tests

Add or update tests for:

- password validation rules
- session storage sanitization
- permission mapping logic
- export-blocking behavior for invalid password states

## 11.2 Integration tests

Add or update tests for:

- local base PDF generation followed by server encryption
- encryption API happy path
- encryption API invalid payload handling
- encryption failure path
- no unprotected download result when protection was requested

## 11.3 E2E tests

Add or update flows for:

- enable password protection and export successfully
- mismatched password blocks export
- missing confirmation blocks export
- page refresh does not restore password values
- non-protected export still downloads normally

## 11.4 Manual QA matrix

Manually verify protected output in:

- Chrome PDF viewer
- macOS Preview
- Adobe Acrobat

Confirm:

- password prompt appears
- wrong password fails
- correct password opens the file
- permissions behave as expected where enforced

---

## 12. Acceptance Criteria

The feature is complete only when all of the following are true:

1. Exporting with password protection enabled produces a genuinely encrypted PDF
2. The exported file prompts for a password before opening
3. Owner password and permissions are applied where supported
4. Invalid password settings prevent export
5. Encryption failure does not download an unprotected PDF
6. Raw passwords are not stored in session storage
7. No password values appear in logs or user-facing errors
8. Non-password export behavior remains unchanged
9. Automated tests cover the protected export flow
10. Manual QA passes in the target reader matrix

---

## 13. Risks and Mitigations

### Risk: encryption backend may not fit runtime/deployment

Mitigation:

- complete feasibility spike before broader integration

### Risk: PDF permissions are reader-dependent

Mitigation:

- document that password-to-open is the guaranteed control
- test across target readers

### Risk: latency increases due to server roundtrip

Mitigation:

- keep non-protected exports client-side
- only route protected exports through the server

### Risk: password leakage through persistence/logging

Mitigation:

- explicit secret handling rules
- persistence removal
- sanitized error handling

---

## 14. Implementation Notes for Future Engineers / AI Agents

### Current flow summary

Today the export flow in `src/features/pdf-studio/components/pdf-studio-workspace.tsx` is roughly:

1. collect `images` + `settings`
2. call `generatePdfFromImages(images, settings, onProgress)`
3. call `downloadPdfBlob(pdfBytes, settings.filename)`

The change required is **not** a full rewrite. The intended new flow is:

1. generate base PDF locally
2. if password disabled:
   - download immediately
3. if password enabled:
   - call encryption API
   - download returned encrypted bytes

### Existing placeholder to replace

The placeholder encryption logic currently lives in:

- `src/features/pdf-studio/utils/pdf-generator.ts`

That placeholder should either be removed from the client-side save path or replaced with orchestration that defers real encryption to the server path.

### Existing persistence issue to fix

The password persistence logic currently lives in:

- `src/features/pdf-studio/utils/session-storage.ts`

That file must be updated so secrets are stripped from persisted session state.

### Existing password UI to preserve

The user-facing password panel already exists in:

- `src/features/pdf-studio/components/password-settings-panel.tsx`

The goal is to preserve the UI investment while making the underlying behavior real and safe.

---

## 15. Final Recommendation

Ship this feature in two practical tracks:

### Track 1: Security correctness

- stop persisting passwords
- harden export validation
- ensure protected export fails closed

### Track 2: Real encryption

- keep current generator
- add server-side encryption
- verify actual password-gated files

This is the fastest path to a production-quality password protection feature without destabilizing the rest of PDF Studio.

---

## 16. Definition of Done

This work is done only when:

- a protected PDF is actually encrypted
- password UI no longer overpromises
- raw passwords are not persisted
- protected export does not silently degrade to unprotected export
- automated and manual verification pass
- another engineer can read the code and clearly see where generation ends and encryption begins

