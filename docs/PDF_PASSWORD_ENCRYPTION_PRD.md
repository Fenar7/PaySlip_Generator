# PDF Password Encryption PRD

**Status:** Proposed  
**Date:** April 2, 2026  
**Owner:** PDF Studio  
**Scope:** Add real password protection to generated PDFs in PDF Studio

## 1. Problem Statement

PDF Studio currently exposes password protection controls in the UI, validates passwords, and stores permission settings, but the generated PDF is not actually encrypted. The current implementation in [src/features/pdf-studio/utils/pdf-generator.ts](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/features/pdf-studio/utils/pdf-generator.ts) logs a placeholder and saves an unprotected file.

That leaves the product in a misleading state:

- Users believe the file is protected when it is not.
- Integration coverage is blocked because the generated file has no real security.
- Passwords are currently persisted in browser session state via [src/features/pdf-studio/utils/session-storage.ts](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/features/pdf-studio/utils/session-storage.ts), which is not acceptable for a production-grade security feature.

## 2. Why This Work Is Needed

Password protection is a trust feature, not a cosmetic setting. If the UI promises protection, the resulting file must:

- Require a password when opened.
- Respect owner permissions where supported by the PDF reader.
- Avoid storing secrets longer than necessary.
- Fail safely when encryption cannot be applied.

Without that, the feature is incomplete and creates product risk.

## 3. Verified Constraints

I verified the current library situation before drafting this plan:

- `pdf-lib` does not provide a supported document-encryption feature in the current project path. Source: `pdf-lib` issue `#243` on GitHub: https://github.com/Hopding/pdf-lib/issues/243
- PDFKit officially documents PDF security support, including user password, owner password, and permissions. Source: PDFKit guide: https://pdfkit.org/docs/guide.pdf

## 4. Product Goals

### Primary Goal

Deliver real password-protected PDF exports in PDF Studio.

### Secondary Goals

- Preserve existing PDF Studio capabilities: image-based export, compression, metadata, watermark, page numbers, OCR text overlay.
- Avoid degrading export time beyond acceptable UX thresholds.
- Remove unsafe password persistence.
- Add automated verification for encrypted output.

### Non-Goals

- Digital signatures
- Certificate-based encryption
- DRM or reader-specific enforcement beyond standard PDF permissions
- Multi-user document sharing workflows

## 5. User Stories

1. As a user, I can set an open password so my PDF asks for a password before it can be viewed.
2. As a user, I can set an owner password to control permissions separately from the open password.
3. As a user, I can choose whether printing, copying, and modifying are allowed.
4. As a user, I get a clear error if PDF protection cannot be applied.
5. As a user, I am not misled by the UI into downloading an unprotected file.
6. As a security-conscious user, my password is not stored in browser session restore data after export or refresh.

## 6. Functional Requirements

### FR1. Real Encryption

When password protection is enabled and the password is valid, the exported PDF must be encrypted.

### FR2. Password Types

Support:

- `userPassword`
- optional `ownerPassword`
- fallback behavior when owner password is omitted

### FR3. Permissions

Support the current permission model already present in the UI:

- printing
- copying
- modifying

### FR4. Safe Failure

If encryption fails:

- do not download an unprotected file while password protection is enabled
- show a user-facing error
- log a diagnostic event for debugging

### FR5. UX Integrity

The export button must be blocked when password settings are invalid.

### FR6. Secret Handling

Raw passwords must not be persisted in session storage or restored from previous sessions.

### FR7. Backward Compatibility

If password protection is disabled, export behavior must remain unchanged.

## 7. Non-Functional Requirements

### Security

- No password values in `sessionStorage`
- No password values in query strings
- No password values in client logs
- No password values returned in error payloads

### Performance

- Keep single export latency within an acceptable range for current image volumes
- Target: no more than 25-35% slower than current non-encrypted export for typical jobs

### Reliability

- Export result must be deterministic
- Encrypted files must open in major PDF readers

### Maintainability

- Encryption logic should be isolated behind a dedicated adapter/service
- PDF generation pipeline should remain testable at the unit level

## 8. Current-State Gaps

### Code Gaps

- [src/features/pdf-studio/utils/pdf-generator.ts](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/features/pdf-studio/utils/pdf-generator.ts) has a placeholder `encryptPdf()` implementation.
- [src/features/pdf-studio/utils/session-storage.ts](/Users/mac/Fenar/Zenxvio/product-works/payslip-generator/src/features/pdf-studio/utils/session-storage.ts) persists `userPassword`, `confirmPassword`, and `ownerPassword`.
- Current tests validate password UI logic, but not actual encrypted file behavior.

### Product Gaps

- The current UI implies the feature is functional.
- There is no explicit failure state for encryption backend errors.
- There is no automated file-level verification of encryption.

## 9. Architecture Options

### Option A. Replace `pdf-lib` export path with PDFKit

Generate the entire PDF with PDFKit so encryption is applied natively during creation.

**Pros**

- Officially documented support for encryption and permissions
- Single library owns generation and security
- No post-processing step

**Cons**

- Highest migration risk
- Requires reimplementing watermark, metadata, page numbers, image embedding, OCR overlay, and layout logic
- Larger regression surface

**Assessment**

Good long-term option only if we are willing to migrate most of the existing PDF generation stack.

### Option B. Keep `pdf-lib` generation and add a server-side encryption step

Continue generating the PDF with `pdf-lib`, then send bytes to a server route that applies encryption using a library or binary that supports standard PDF security.

**Pros**

- Smallest change to current generation pipeline
- Preserves existing PDF layout behavior
- Keeps encryption implementation isolated
- Easier phased delivery

**Cons**

- Introduces a server dependency for encrypted exports
- Requires careful handling of sensitive payloads
- Needs deployment compatibility checks

**Assessment**

Best fit for this repo. It minimizes rewrite risk and lets us ship real protection sooner.

### Option C. Keep all work in-browser with a different post-processing library

Generate with `pdf-lib` and then encrypt on the client using another browser-capable library.

**Pros**

- No server dependency

**Cons**

- Higher uncertainty
- Browser compatibility risk
- Harder to verify library maturity and output consistency

**Assessment**

Not recommended as the primary path until proven with a prototype.

## 10. Recommended Solution

Adopt **Option B**.

### Recommended Design

1. Keep existing PDF composition in the browser using `pdf-lib`.
2. Add a server-side encryption endpoint that accepts:
   - generated PDF bytes
   - password settings
   - permission settings
3. Return encrypted PDF bytes to the client.
4. Download only the encrypted response.
5. Strip passwords from session persistence entirely.

### Why This Is The Best Path

- It preserves the work already completed in `pdf-generator.ts`.
- It reduces regression risk across existing PDF Studio features.
- It isolates security behavior behind a dedicated boundary.
- It gives us a safe fallback path: non-password exports remain fully client-side.

## 11. Proposed Technical Design

### 11.1 Client Flow

1. User configures PDF settings.
2. Client validates password inputs.
3. Client generates base PDF bytes with existing `generatePdfFromImages()`.
4. If password protection is disabled:
   - download immediately
5. If password protection is enabled:
   - send bytes and settings to new encryption API route
   - receive encrypted bytes
   - download encrypted file

### 11.2 Server Flow

1. Receive multipart or binary payload plus JSON settings.
2. Validate request shape.
3. Apply encryption using the selected backend.
4. Return `application/pdf` bytes.
5. Return a non-sensitive structured error if encryption fails.

### 11.3 Encryption Adapter

Introduce a dedicated module, for example:

- `src/features/pdf-studio/server/pdf-encryption.ts`

This module should:

- normalize settings
- map UI permissions to backend-specific flags
- own all library-specific code
- expose a narrow API like `encryptPdf(buffer, settings): Promise<Uint8Array>`

### 11.4 Session Storage Changes

Update persistence so these values are never stored:

- `password.userPassword`
- `password.confirmPassword`
- `password.ownerPassword`

Allowed to persist:

- `password.enabled`
- permission toggles

### 11.5 UX Changes

- Add explicit export error message for encryption failure
- Disable export when password settings are invalid
- Add helper text: “Passwords are used only for this export and are not saved”

## 12. Delivery Plan

### Phase 0. Discovery Spike

Goal: prove the encryption backend in this codebase and deployment model.

Tasks:

- Identify the exact encryption backend to use on the server
- Build a minimal proof of concept: input PDF bytes -> encrypted PDF bytes
- Verify output in Acrobat, Chrome, macOS Preview
- Verify permission mapping behavior

Exit criteria:

- One reproducible test proves a PDF cannot be opened without the password

### Phase 1. Secure Data Model

Tasks:

- Remove raw password persistence from session storage
- Add clear transient-password behavior in client state
- Tighten validation rules before export

Exit criteria:

- Refresh/session restore never repopulates password values

### Phase 2. Backend Encryption Service

Tasks:

- Add API route for PDF encryption
- Add server-side validator for password settings
- Implement encryption adapter
- Handle errors and limits

Exit criteria:

- API returns encrypted bytes for valid requests
- API rejects invalid requests safely

### Phase 3. Client Integration

Tasks:

- Split export flow into:
  - local generation
  - conditional encryption request
  - final download
- Update action state messaging
- Prevent unprotected download on encryption failure

Exit criteria:

- Password-enabled export always goes through encryption path

### Phase 4. Automated Verification

Tasks:

- Add unit tests for permission mapping and validation
- Add integration tests for the encryption route
- Add E2E scenario for protected export
- Add a file-level verification helper to confirm encryption

Exit criteria:

- Existing blocked integration tests are converted to real assertions

### Phase 5. Documentation and Release

Tasks:

- Update user-facing feature notes
- Update QA checklist
- Document supported permission semantics and reader caveats

Exit criteria:

- Feature is documented as implemented, not aspirational

## 13. Acceptance Criteria

The feature is complete only when all of the following are true:

- Exporting with password protection enabled produces a PDF that prompts for a password when opened.
- Exporting with password protection disabled behaves exactly as before.
- Owner password and permission settings are applied when provided.
- Invalid password state prevents export.
- Encryption failure never silently falls back to an unprotected file.
- No raw passwords are persisted in session restore data.
- Automated tests validate the protected export path.
- QA verifies the file in at least three readers.

## 14. Testing Strategy

### Unit Tests

- password settings normalization
- permission mapping
- server-side request validation
- session-storage sanitization

### Integration Tests

- generate base PDF -> encrypt -> return bytes
- encryption failure path
- permission combinations

### E2E Tests

- enable password -> export succeeds
- invalid password -> export blocked
- session reload -> password fields empty

### Manual QA

- open protected file in Chrome
- open protected file in macOS Preview
- open protected file in Adobe Acrobat
- verify printing/copying/modifying behavior where readers enforce it

## 15. Risks

### Risk 1. Backend Compatibility

The selected encryption backend may not work in the current Next.js runtime or deployment target.

Mitigation:

- Prove the backend in Phase 0 before broader integration

### Risk 2. Permission Semantics Vary By Reader

PDF permissions are not enforced uniformly by every reader.

Mitigation:

- Document reader caveats
- Test across the main reader matrix

### Risk 3. Larger Payload Transfer

Encrypted exports require uploading generated PDF bytes to the server.

Mitigation:

- Set sensible file-size limits
- Preserve local-only flow for non-protected exports

### Risk 4. Secret Leakage

Passwords could leak via logs, persistence, or error serialization.

Mitigation:

- Explicitly ban password logging
- Strip password fields from persistence
- redact diagnostics

## 16. Open Decisions

These must be resolved in the discovery spike:

1. Which server-side encryption backend will we use?
2. Will deployment allow any required native binaries or only pure JS?
3. What is the maximum supported encrypted export size?
4. Do we require owner password to differ from user password, or merely allow it?

## 17. Implementation Order Recommendation

Recommended execution order:

1. Stop persisting passwords
2. Build encryption proof of concept
3. Add encryption API route
4. Integrate client export flow
5. Add verification tests
6. Update documentation and release notes

## 18. Definition of Done

This feature is done only when:

- The file is actually encrypted
- The UI does not overpromise
- Passwords are handled safely
- Tests prove the behavior end to end
- Documentation reflects the implemented behavior accurately
