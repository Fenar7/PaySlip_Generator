# Slipwise One — QA Testing Handover (Current State)

> **Version:** 2026-04-11  
> **Purpose:** Practical release-oriented QA guide for the current remediation branch stack.  
> **Scope:** Focus on the highest-risk business and security paths after PR-01 through PR-04.

---

## 1. What this test cycle is validating

This cycle is not a generic “test everything from scratch” pass. It is a release-focused verification of:

1. schema/config/auth remediation still holding
2. billing lifecycle correctness
3. canonical webhook/integration behavior
4. regression safety across the core document/pay/intel flows
5. docs and release claims matching actual product behavior

---

## 2. Environment assumptions

Minimum setup before QA starts:

- local or staging app running via `npm run dev` or equivalent deployed preview
- `.env` populated from `.env.example`
- Supabase/PostgreSQL available and migrations applied
- `CRON_SECRET`, `PORTAL_JWT_SECRET`, and `DUNNING_OPT_OUT_SECRET` configured
- Razorpay test credentials available
- test orgs available across Free / Starter / Pro / Enterprise
- at least two users per org for permission and tenant-boundary checks

Optional but needed for feature-specific checks:

- IRP sandbox credentials (`IRP_MODE=sandbox`)
- Open Exchange Rates credentials
- QuickBooks and Zoho sandbox apps
- Resend/Brevo/MSG91 test credentials

---

## 3. Automated verification

Run these before manual sign-off:

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
```

Treat `test`, `lint`, and `build` as mandatory. Run `test:e2e` wherever the environment supports Playwright.

---

## 4. Priority order

Execute in this order:

1. **Auth and tenant boundaries**
2. **Billing lifecycle**
3. **Webhook/OAuth/API correctness**
4. **Core invoice/document regressions**
5. **Compliance/global-expansion surfaces**
6. **Portal, dunning, quotes, payment arrangements**
7. **Integrations and optional-provider flows**

---

## 5. Critical manual checks

### 5.1 Auth / tenant boundary

| ID | Scenario | Expected result |
| --- | --- | --- |
| A-01 | Unsafe auth callback `next` value | Redirect is sanitized; no open redirect |
| A-02 | Cross-org access using forged `orgId` | Request denied; no data leakage |
| A-03 | API/user actions under wrong org membership | Blocked cleanly |
| A-04 | Portal magic-link/session flow | Only intended customer gains access |
| A-05 | SSO production rollout flag | Feature remains off unless explicitly enabled |

### 5.2 Billing / commercial readiness

| ID | Scenario | Expected result |
| --- | --- | --- |
| B-01 | New paid subscription checkout | Hosted subscription session created correctly |
| B-02 | Upgrade/downgrade existing plan | Uses correct provider plan mapping |
| B-03 | Pause/resume subscription | Provider + app state stay in sync |
| B-04 | Cancel subscription | Provider and local state reflect cancellation |
| B-05 | Forged org parameter on billing route | Rejected |
| B-06 | Missing Razorpay plan/env mapping | Fails clearly, without silent success |

### 5.3 Webhooks / OAuth / developer platform

| ID | Scenario | Expected result |
| --- | --- | --- |
| D-01 | Create webhook endpoint | Secret shown once; endpoint listed |
| D-02 | Legacy endpoint without signing secret | UI requires secret rotation before safe re-enable |
| D-03 | Webhook signature verification | Signature matches documented `sha256=` format |
| D-04 | Failed delivery | Retry scheduled and visible in delivery log |
| D-05 | Exhaust retry budget | Delivery stops retrying and remains replayable |
| D-06 | Replay failed delivery | Manual replay succeeds without duplicating queued retries |
| D-07 | OAuth app create/rotate secret | Secret shown once; stored secret is not exposed again |
| D-08 | Authorization-code flow | Consent, token issue, refresh, revoke, and `/api/v1/me` all work |

### 5.4 Core document regressions

| ID | Scenario | Expected result |
| --- | --- | --- |
| C-01 | Invoice create/edit/send/pay flow | Still works end-to-end |
| C-02 | Voucher CRUD/export | Still works |
| C-03 | Salary slip CRUD/export | Still works |
| C-04 | Quote accept/convert | Still works |
| C-05 | PDF Studio basic operations | Still work on representative files |

### 5.5 Compliance / global-expansion smoke checks

| ID | Scenario | Expected result |
| --- | --- | --- |
| G-01 | GST calculation | Intra/inter-state tax split behaves correctly |
| G-02 | HSN/SAC search | Returns relevant matches |
| G-03 | IRN sandbox flow | Generates/fetches/cancels IRN with sandbox config |
| G-04 | E-way bill eligibility | Services invoices do not show goods-only flow |
| G-05 | TDS tracking | TDS data persists and dashboard loads |
| G-06 | GSTR export | Export/report page loads and returns data |
| G-07 | Language switcher + document locale | Labels change as expected |
| G-08 | Currency/exchange-rate display | Display totals/footnotes are rendered correctly |

### 5.6 Portal / dunning / arrangements

| ID | Scenario | Expected result |
| --- | --- | --- |
| P-01 | Dunning sequence execution | Correct step fires; opt-out/payment stop conditions hold |
| P-02 | Payment arrangement lifecycle | Installments track and reconcile correctly |
| P-03 | Portal invoice/payment path | Customer can view/pay/download as expected |
| P-04 | Cash-flow views | Loads without org/session leakage |

---

## 6. Release blockers

Any of the following is a release blocker:

- cross-tenant data exposure
- billing lifecycle mutating local state without provider confirmation
- webhook signatures not matching documentation
- retries replaying incorrectly or silently dropping failed deliveries
- docs claiming production-ready or “all complete” without evidence
- SSO enabled in production without explicit validation/sign-off

---

## 7. Companion documents

- `README.md`
- `docs/PRODUCT_SUMMARY_CURRENT_STATE.md`
- `docs/production/PRODUCT_STATUS_REPORT.md`
- `docs/production/RELEASE_READINESS_CHECKLIST.md`
- `docs/production/WEBHOOKS_AND_INTEGRATIONS.md`
