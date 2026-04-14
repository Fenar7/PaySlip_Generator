# Slipwise One — Release Readiness Checklist

Use this checklist before claiming a release candidate is ready for production.

---

## 1. Branch / review prerequisites

| Item | Required state |
| --- | --- |
| Remediation lanes | PR-01 through PR-05 reviewed and merged in the intended release stack |
| Phase 19 branch baseline | Verification is run on `feature/phase-19` or its remediation PR branch; explicit diff to `master` reviewed before merge |
| Working tree | Clean; no unreviewed local changes |
| Release docs | README, product summary, status report, QA handover, and this checklist updated |
| Accepted risks | Explicitly reviewed and signed off |

---

## 2. Environment / config readiness

| Area | Check |
| --- | --- |
| Core auth/db | Supabase + PostgreSQL values set; migrations applied |
| Secrets | `CRON_SECRET`, `PORTAL_JWT_SECRET`, `DUNNING_OPT_OUT_SECRET`, and `MARKETPLACE_MODERATOR_USER_IDS` set intentionally |
| Billing | Razorpay keys and webhook secret configured |
| Compliance | IRP/exchange-rate credentials configured if those features are being launched |
| Integrations | QuickBooks/Zoho credentials configured only if those integrations are enabled |
| Observability | Sentry/PostHog/Redis decisions documented for target environment |
| Feature flags | `FEATURE_SSO_ENABLED` intentionally set (default should remain `false` unless explicitly approved) |
| Phase 19 Backfills | Run `scripts/backfill-document-index.ts` and `scripts/backfill-template-revisions.ts` post-migration, then capture zero-count verification for completed purchases with `revisionId IS NULL`, templates without revisions, and duplicate published revisions |

---

## 3. Automated verification

| Command | Must pass |
| --- | --- |
| `npm run test` | Yes |
| `npm run lint` | Yes |
| `npm run build` | Yes |
| `npm run test:e2e` | Recommended for release sign-off / required where supported |

---

## 4. Manual release smoke checks

| Area | Must verify |
| --- | --- |
| Auth / tenant isolation | No cross-org access, sanitized redirects, safe callback handling |
| Billing | Create/change/pause/resume/cancel flows behave correctly |
| Webhooks | Signed delivery, retry scheduling, replay behavior, endpoint rotation flow |
| OAuth/API | App creation, authorization-code flow, token refresh/revoke, `/api/v1/me` |
| Core documents | Invoice, voucher, salary slip, quote critical flows |
| Phase 19 SW Docs Vault | Unified index `/app/docs/vault` accurately lists all doc types, applies text search and archive toggles |
| Phase 19 Timeline | `DocumentEvent` timeline correctly tracks append-only lifecycle events across all documents |
| Phase 19 Templates | Marketplace moderation is limited to configured moderators, public detail reads expose only `PUBLISHED` templates, installed-template reads are revision-bound, and `scripts/backfill-template-revisions.ts` verification passes without degradations |
| Pay flows | Dunning, payment arrangements, portal payment path |
| Global/compliance | GST/IRP/TDS/GSTR/i18n/multi-currency smoke coverage as applicable |

---

## 5. Accepted-risk sign-off

| Risk | Owner decision required |
| --- | --- |
| QuickBooks/Zoho tokens not encrypted at app layer | Accept / reject |
| SSO disabled by default pending full validation | Accept / reject |
| Optional Redis/ioredis warning posture | Accept / reject |

---

## 6. Final go / no-go

| Role | Sign-off |
| --- | --- |
| Engineering |  |
| QA |  |
| Product |  |
| Operations / Security |  |

Release is **no-go** until the above sections are complete.
