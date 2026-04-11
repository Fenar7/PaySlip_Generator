# Slipwise One — Release Readiness Checklist

Use this checklist before claiming a release candidate is ready for production.

---

## 1. Branch / review prerequisites

| Item | Required state |
| --- | --- |
| Remediation lanes | PR-01 through PR-05 reviewed and merged in the intended release stack |
| Working tree | Clean; no unreviewed local changes |
| Release docs | README, product summary, status report, QA handover, and this checklist updated |
| Accepted risks | Explicitly reviewed and signed off |

---

## 2. Environment / config readiness

| Area | Check |
| --- | --- |
| Core auth/db | Supabase + PostgreSQL values set; migrations applied |
| Secrets | `CRON_SECRET`, `PORTAL_JWT_SECRET`, `DUNNING_OPT_OUT_SECRET` set |
| Billing | Razorpay keys and webhook secret configured |
| Compliance | IRP/exchange-rate credentials configured if those features are being launched |
| Integrations | QuickBooks/Zoho credentials configured only if those integrations are enabled |
| Observability | Sentry/PostHog/Redis decisions documented for target environment |
| Feature flags | `FEATURE_SSO_ENABLED` intentionally set (default should remain `false` unless explicitly approved) |

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
