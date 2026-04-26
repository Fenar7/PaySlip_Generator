# Kimi Prompt for Production-Ready Passkey + MFA Implementation

## Summary

Use this prompt in a **fresh Kimi K2.6 chat** to implement a full production-grade passkey system for this repository without adding a paid auth vendor.

It is grounded in the current repo and current auth stack:

- current base branch is `pdf-studio-continuation`
- current baseline commit is `557d887`
- existing auth stack is **Supabase Auth + app-owned TOTP/recovery logic**
- the goal is to **support both passkeys and existing sign-in options**
- this is **not an MVP**; the quality bar is full production readiness

## Copy-Paste Prompt

```text
You are a senior software engineering team, not a casual code generator. Work like a disciplined production team: careful exploration, explicit decisions, strong testing, secure defaults, clean code, no AI slop, no placeholders, no half-finished paths.

You are starting a fresh execution chat for a production-grade passkey + MFA implementation in this repository.

Repository context:
- Repo: /Users/mac/Fenar/Zenxvio/product-works/payslip-generator
- Current integration branch: pdf-studio-continuation
- Current baseline commit: 557d887
- Product is no longer in MVP mode. This is a real production product.
- Do not treat this as a lightweight auth experiment.

Tech stack:
- Next.js App Router
- TypeScript
- React
- Prisma
- Supabase Auth
- Vitest
- ESLint
- Existing custom TOTP + recovery-code 2FA layer

Current auth architecture you must build on:
- Supabase Auth is the primary auth/session layer
- Existing primary sign-in methods already include:
  - email + password
  - Google
  - enterprise SSO / break-glass flows
- Existing second-factor support already includes:
  - TOTP
  - recovery codes
- Existing MFA enforcement and challenge flow already exists in:
  - src/app/auth/login/login-form.tsx
  - src/app/auth/2fa/actions.ts
  - src/app/auth/2fa/2fa-form.tsx
  - src/app/app/settings/security/actions.ts
  - src/app/app/settings/security/page.tsx
  - src/middleware.ts
  - src/lib/totp/challenge-session.ts
- Existing Profile model already stores:
  - totpSecret
  - totpEnabled
  - totpEnabledAt
  - recoveryCodes
  - twoFaEnforcedByOrg

Important current reality:
- Supabase Auth is staying
- Do not replace Supabase Auth
- Do not migrate to Clerk/Auth0/Stytch/WorkOS/Descope/etc.
- Do not add another paid auth vendor or subscription
- Passkeys must be implemented as an app-owned WebAuthn layer on top of the current auth/session stack

Authoritative external references:
Use only primary/official sources when making implementation decisions:
- Supabase Auth docs: https://supabase.com/docs/guides/auth
- Supabase MFA docs: https://supabase.com/docs/guides/auth/auth-mfa
- Supabase JS MFA reference: https://supabase.com/docs/reference/javascript/auth-mfa-api
- SimpleWebAuthn browser docs: https://simplewebauthn.dev/docs/packages/browser/
- SimpleWebAuthn server docs: https://simplewebauthn.dev/docs/packages/server/
- MDN passkeys / WebAuthn docs: https://developer.mozilla.org/en-US/docs/Web/Security/Authentication/Passkeys

Product requirement:
Implement a full production-grade MFA model that supports:
- Primary sign-in:
  - email + password
  - Google
  - enterprise SSO
- Second factor:
  - passkey
  - TOTP
  - recovery codes
- Policy:
  - users can enroll both passkey and TOTP
  - passkey should be the preferred MFA path in UX
  - TOTP remains a supported fallback
  - recovery codes remain supported
  - org-level MFA enforcement must continue to work
- This is not passwordless-first yet
- Passkeys are initially a step-up / MFA method, not a replacement for primary login

Desired real-world behavior:
- Password -> passkey
- Password -> TOTP
- Google -> passkey
- Google -> TOTP
- SSO -> passkey
- SSO -> TOTP
- Recovery code remains fallback when needed
- Multiple passkeys per user must be supported
- Device-native authenticators must be supported through WebAuthn:
  - Mac Touch ID
  - iPhone Face ID / Touch ID
  - Android fingerprint / device credential
  - Windows Hello
  - security keys
  - cross-device / QR-based passkey flows when browser/platform supports them

Non-negotiable branch workflow:
- Do not work on master
- Do not work directly on pdf-studio-continuation
- Create a dedicated feature branch from pdf-studio-continuation
- Open a PR back into pdf-studio-continuation

Exact branch name:
- feature/auth-passkeys-production

Required branch flow:
git checkout pdf-studio-continuation
git pull origin pdf-studio-continuation
git checkout -b feature/auth-passkeys-production

Do not touch unrelated local noise such as:
- docs/opencode/
- docs/codex/
- unrelated prompt artifacts in docs/PRD unless needed for this feature

Execution standards:

Quality bar:
- No placeholder code
- No dead code
- No fake abstractions
- No speculative rewrites
- No AI slop comments or repetitive boilerplate
- No auth shortcuts that would be unacceptable in production
- Reuse and extend existing app patterns where reasonable
- Keep naming aligned with the current auth / security / middleware architecture

Security bar:
- Passkeys must be implemented using proper WebAuthn verification
- Challenges must be signed or server-tracked and short-lived
- Origin and RP ID validation must be correct
- Counters / replay protections must be handled correctly
- Sensitive cookies must be httpOnly, secure in production, and scoped correctly
- Audit significant security actions
- Do not leak credential material, challenge state, or unsafe debugging info
- Preserve safe fallback and account recovery paths
- Do not weaken existing org-level MFA enforcement
- Do not treat passkey support as a UI-only feature

Token-efficiency bar:
- Keep progress messages short
- Do not narrate every step
- Use rg first
- Read only the smallest slices needed
- Avoid pasting large code blocks into chat unless necessary
- Summarize findings compactly

Implementation objective:
Add passkeys as a production-ready second-factor option alongside existing TOTP/recovery MFA, fully integrated into:
- enrollment
- challenge/verification
- org MFA enforcement
- security settings
- middleware gating
- auditability
- recovery/fallback UX

Implementation decisions you must follow:

1. Use app-owned WebAuthn, not a new auth platform
- Keep Supabase Auth as primary identity/session issuer
- Use:
  - @simplewebauthn/server
  - @simplewebauthn/browser
- Passkey verification happens in app-controlled server routes/actions
- Successful passkey verification should satisfy the same MFA gate currently satisfied by TOTP/recovery

2. Support both passkey and TOTP
- Do not remove existing TOTP/recovery flow
- Convert the current “2FA” concept into a more general “MFA” concept
- Keep TOTP fully functional as fallback
- Keep recovery codes fully functional
- Passkey becomes the preferred method in UX, not the only one

3. Preserve current primary auth methods
- Do not remove password login
- Do not remove Google login
- Do not remove enterprise SSO / break-glass flows
- Passkeys are step-up verification after primary sign-in succeeds

4. Generalize the current MFA session-completion cookie model
- The current sw_2fa challenge completion model should be generalized from “TOTP only” to “MFA satisfied”
- You may keep the cookie name stable if that reduces migration risk
- But the helper names and logic should no longer be TOTP-specific where they represent overall MFA completion
- Middleware should check:
  - whether MFA is required
  - whether the user has any enrolled MFA factor that satisfies policy
  - whether the current session has completed MFA
- Existing org-enforced MFA must continue to redirect users into setup when they have no enrolled factor

5. Add passkey persistence in Prisma
Create a production-ready passkey credential model linked to Profile.
At minimum store:
- id
- userId
- credentialId (base64url or equivalent stable string form)
- publicKey
- counter
- transports
- deviceName
- deviceType / backedUp metadata if available from verification result
- lastUsedAt
- createdAt
- updatedAt

Also update Profile / user security state as needed so middleware and settings can reason about:
- whether passkey MFA is enabled
- whether TOTP is enabled
- whether org policy requires MFA
- what the preferred MFA method is, if you decide to store it

Decision:
- prefer adding explicit passkey state fields on Profile rather than inferring everything from counts in middleware-sensitive logic

6. Add passkey registration flow in Security Settings
Extend the existing security settings page so users can:
- enroll a passkey
- see enrolled passkeys
- rename passkeys
- remove passkeys
- still manage TOTP
- still view or regenerate recovery codes if the current product flow supports that
- understand that passkey is preferred but TOTP remains fallback

Required UX in security settings:
- “Add passkey”
- list of existing passkeys with friendly names and timestamps
- “Authenticator app” section remains
- clear account recovery messaging
- if MFA is org-required and the user has neither passkey nor TOTP, setup must remain mandatory

7. Add passkey challenge flow to the login MFA page
Update /auth/2fa into a general MFA challenge surface.
Required behavior:
- if user has passkeys enrolled, show primary CTA:
  - Use passkey
- also show:
  - Use authenticator app
  - Use recovery code
- if user only has TOTP, preserve current behavior
- if user has both, passkey should be the default/preferred option
- on successful passkey verification, issue the MFA-complete cookie/session marker and redirect to callbackUrl
- on successful TOTP/recovery verification, behavior remains equivalent

8. Add browser capability handling
- Use browser support detection from @simplewebauthn/browser where appropriate
- Only show passkey enrollment/challenge UI when platform support exists
- If unsupported, degrade gracefully to TOTP/recovery
- Do not hardcode device-specific labels like “Use Face ID” or “Use Touch ID” as the primary action; use “Use passkey”
- Let platform-native WebAuthn UI expose the authenticator choices

9. Add audit/security events
At minimum record auditable events for:
- passkey added
- passkey renamed
- passkey removed
- passkey used successfully for MFA
- passkey challenge failure
- TOTP enrollment enabled/disabled remains covered or improved
- recovery code used
- org MFA enforcement changes if touched
Use existing audit/event patterns in the repo where possible

10. Add re-auth and destructive-action protections
- Removing a passkey should require a reasonable security check
- If it is the last enrolled MFA factor and org policy requires MFA, do not allow the account to become policy-noncompliant without an alternate factor path
- Prevent users from accidentally locking themselves out
- Do not allow removal of the last viable factor without explicit safety logic

11. Keep recovery production-grade
- TOTP stays as fallback
- Recovery codes stay supported
- Multiple passkeys should be allowed
- Users should be able to recover from device loss without support intervention when possible
- Keep break-glass / admin recovery behavior intact for enterprise-sensitive situations

Concrete implementation plan you must execute:

A. Dependency setup
- Add:
  - @simplewebauthn/server
  - @simplewebauthn/browser
- Use current stable versions supported by official docs

B. Prisma/data model
- Add a PasskeyCredential model
- Add any needed Profile fields for:
  - passkeyEnabled
  - passkeyEnabledAt
  - preferredMfaMethod
  - optional metadata if necessary
- Create migrations
- Keep schema clean and production-oriented

C. Security/session helpers
- Introduce a generalized MFA session helper layer that supersedes TOTP-only semantics
- Preserve compatibility with the existing sw_2fa cookie behavior if possible
- Add signed challenge helpers for WebAuthn registration and authentication ceremonies
- Keep expiry short and verification strict

D. Server routes / actions
Add server-side flows for:
- begin passkey registration
- finish passkey registration
- begin passkey authentication
- finish passkey authentication
- rename passkey
- remove passkey
- fetch passkey list/status
Prefer App Router route handlers or server actions consistent with the repo’s auth patterns

E. Middleware integration
- Update src/middleware.ts so MFA requirement is based on generalized MFA state, not TOTP-only state
- Continue honoring org-required MFA
- Redirect to security setup when MFA is required but no factor is enrolled
- Redirect to MFA challenge when factor exists but current session is not MFA-complete
- Do not add DB round-trips at the edge unless absolutely necessary
- If metadata is needed in Supabase user_metadata for middleware speed, keep that sync path explicit and correct

F. Security settings UI
- Extend the existing security page
- Preserve password management and session management
- Add passkey management UI
- Keep TOTP setup/disable UI functional
- Improve copy so the page clearly communicates:
  - passkey preferred
  - authenticator app fallback
  - recovery codes importance

G. MFA challenge UI
- Upgrade /auth/2fa UI into a general MFA challenge page
- Passkey preferred when enrolled and supported
- TOTP and recovery fallback remain
- Callback handling must remain safe and relative-path-only

H. Tests
Add or update high-signal tests for:
- Prisma/data model serialization assumptions if needed
- passkey registration start/finish logic
- passkey authentication start/finish logic
- challenge expiry / invalid challenge rejection
- origin / RP ID mismatch rejection
- middleware MFA gating with:
  - no factor enrolled
  - TOTP only
  - passkey only
  - both factors enrolled
  - org-enforced MFA
- security settings passkey management actions
- MFA challenge page behavior
- fallback behavior when browser support is unavailable
- safe callback / redirect handling
- destructive-action protections when removing factors
- audit/event emission where touched

I. Validation
At minimum run:
- npm run test
- npm run build
- npm run lint

If build or lint fail because of clearly pre-existing unrelated repo debt, do not hide it. Call it out explicitly and separate it from passkey work.

Files to inspect first before editing:
- src/app/auth/login/login-form.tsx
- src/app/auth/2fa/actions.ts
- src/app/auth/2fa/2fa-form.tsx
- src/app/app/settings/security/actions.ts
- src/app/app/settings/security/page.tsx
- src/middleware.ts
- src/lib/totp/challenge-session.ts
- src/lib/supabase/server.ts
- src/lib/supabase/client.ts
- prisma/schema.prisma

Implementation order:
1. Inspect current auth + MFA enforcement flow
2. Design Prisma model and MFA state model
3. Implement WebAuthn server/client ceremony helpers
4. Integrate passkey enrollment into Security Settings
5. Integrate passkey challenge into the MFA page
6. Generalize middleware/session enforcement from TOTP-only to MFA
7. Add auditability and destructive-action protections
8. Add/expand tests
9. Run validation
10. Prepare PR

Important product requirements you must preserve:
- This is production-grade, not MVP
- Support both passkey and TOTP
- Keep Google / password / SSO primary sign-ins
- No new paid auth provider
- No auth rewrite away from Supabase
- No insecure shortcuts
- No forced passwordless migration
- No user lockout footguns

Suggested PR title:
- feat(auth): add production-ready passkey MFA alongside TOTP

PR body must include:
1. Summary
2. Architecture decisions
3. Data model changes
4. MFA flow changes
5. Security protections
6. UI changes
7. Tests added/updated
8. Validation results
9. Residual risks / rollout notes

Final response format:
1. Branch / PR
- branch name
- PR target branch
- whether PR is ready

2. What you changed
- grouped by data model, server auth flow, middleware, and UI

3. Tests and validation
- exact commands run
- pass/fail outcome
- unrelated existing failures if any

4. Risks / rollout notes
- real residual risks only
- mention whether passkey rollout should initially be feature-flagged or user-opt-in only

Additional guidance:
- Fresh chat means you must not assume hidden prior context
- Build context from the repo first
- Make the implementation decision-complete
- Favor security rigor and product durability over cleverness
```

## Important Changes / Interfaces

- New Prisma model for passkey credentials linked to `Profile`
- Existing `Profile` security state expanded from TOTP-only to generalized MFA state
- Existing `/auth/2fa` challenge flow upgraded into a multi-method MFA challenge flow
- Existing security settings upgraded into full MFA management with passkeys + TOTP
- Existing middleware generalized from `totpEnabled` semantics to overall MFA requirement/completion semantics

## Test Cases / Scenarios

- Password login + passkey MFA
- Password login + TOTP MFA
- Google login + passkey MFA
- Google login + TOTP MFA
- SSO login + passkey MFA
- SSO login + TOTP MFA
- Org-enforced MFA with no factor enrolled
- Org-enforced MFA with passkey only
- Org-enforced MFA with TOTP only
- Removing last passkey while TOTP absent
- Recovery-code fallback after primary auth
- Invalid WebAuthn challenge / origin / RP ID rejection
- Unsupported browser fallback to TOTP/recovery

## Assumptions

- Base branch should be `pdf-studio-continuation`
- New feature branch should be `feature/auth-passkeys-production`
- Passkeys are phase 1 as **MFA / step-up**, not primary passwordless auth
- `@simplewebauthn/server` and `@simplewebauthn/browser` are the intended implementation libraries
- Kimi should ignore the local untracked `docs/PRD/*` prompt artifacts unless explicitly needed
