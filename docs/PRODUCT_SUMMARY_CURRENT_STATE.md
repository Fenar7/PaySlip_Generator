# Slipwise One — Product Summary: Current State

> **Version:** 2026-04-11  
> **Product:** Slipwise One by Zenxvio  
> **Purpose:** Internal source of truth for engineering, QA, product, and ops.  
> This document reflects the product surface implemented in code after the production-remediation branch stack (`PR-01` through `PR-04`). It separates implemented functionality from operational sign-off and accepted-risk areas.

---

## 1. Snapshot

| Area | Current reality |
| --- | --- |
| **Product shape** | Multi-module finance and document operations SaaS |
| **Core stack** | Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL |
| **Auth** | Supabase-backed auth/session model, multi-org access, portal JWT auth |
| **Billing** | Razorpay-backed subscriptions, plan changes, pause/resume/cancel |
| **Developer surface** | API v1, OAuth apps, webhook v2, OpenAPI |
| **Global/compliance** | GST, IRN/e-way bill, TDS, GSTR exports, i18n, multi-currency |
| **Release posture** | Broadly implemented in code; release claims still depend on checklist completion and accepted-risk sign-off |

---

## 2. Implemented product areas

### 2.1 Document operations

- **Invoices** — create/edit/send/share/pay flows, recurring invoices, approvals, public payment page
- **Vouchers** — payment/receipt/contra/journal flows with export support
- **Salary slips** — presets, bulk generation, export/share flows
- **Quotes** — send, accept/decline, convert-to-invoice lifecycle
- **Template system** — template browsing, defaults, custom template flows
- **PDF Studio / image utilities** — merge/split/reorder/protect/watermark/export-oriented tooling

### 2.2 Receivables and payment operations

- Receivables dashboard, recurring invoice management, send log, payment proofs
- **Dunning engine** with sequences, retries, opt-out flow, payment-link renewal support
- **Payment arrangements** for installment recovery
- **Billing workspace** with hosted subscription create/change/pause/resume/cancel flows
- **TDS** dashboard and invoice-linked tracking flows

### 2.3 Intelligence and reporting

- Operational dashboards and reporting surfaces
- Cash flow intelligence and customer health scoring
- GST report exports (`GSTR-1`, `GSTR-3B` summary/reconciliation surfaces)
- Flow/job visibility for background operations

### 2.4 Compliance and global-expansion surfaces

- GST computation engine with intra/inter-state handling
- HSN/SAC lookup/search endpoint
- IRP client and invoice IRN generation/cancel/fetch code paths
- E-way bill flow
- Multi-language document/app settings and localized labels
- Multi-currency document support plus exchange-rate refresh surfaces

### 2.5 Developer ecosystem and integrations

- **API v1** resources for core business data
- **OAuth app** registration and authorization-code-flow endpoints
- **Webhook v2** endpoint management, signed delivery, retries, replay, delivery log UI
- **Template marketplace** browse/install/publish flows
- **Partner portal** dashboard, application flow, client-management surfaces
- **Integrations** for Razorpay, QuickBooks, Zoho, Tally export, MSG91, Resend/Brevo, Sentry/PostHog, optional Redis/OpenAI

### 2.6 Customer and admin surfaces

- Customer portal with JWT cookie auth
- Customer, vendor, employee, and salary-preset data management
- Organization, members, roles, portal, API, billing, i18n, and enterprise settings

---

## 3. Commercial model

Slipwise uses Free / Starter / Pro / Enterprise plans with feature gates at the service layer. Important gated areas include:

- billing limits and member caps
- approvals, API access, cash-flow intelligence, customer health
- payment arrangements
- GST/reporting/compliance and ecosystem features where enabled

---

## 4. Release-sensitive / ops-dependent areas

These are implemented in code but should be treated as operationally sensitive:

| Area | Current note |
| --- | --- |
| **Razorpay** | Requires valid keys/webhook config for billing and payment flows |
| **IRP / GST** | Requires sandbox or production IRP credentials; default mode should remain sandbox unless explicitly switched |
| **Exchange rates** | Requires provider credentials for refresh jobs |
| **QuickBooks / Zoho** | OAuth callbacks and sync flows need provider apps and test accounts |
| **Webhook consumers** | Must verify signatures exactly as documented in `docs/production/WEBHOOKS_AND_INTEGRATIONS.md` |
| **Portal / cron flows** | Depend on `PORTAL_JWT_SECRET`, `DUNNING_OPT_OUT_SECRET`, and `CRON_SECRET` being set correctly |

---

## 5. Accepted-risk areas / gated rollout notes

| Area | Current posture |
| --- | --- |
| **SSO / SAML** | Feature-flagged off by default for production rollouts until full SAML validation is explicitly enabled |
| **QuickBooks / Zoho token storage** | Provider tokens are documented accepted risk; application-layer encryption is not yet implemented |
| **Redis-backed optional paths** | Local builds still warn if `ioredis` is absent; treat Redis as optional infrastructure rather than guaranteed local dependency |
| **Historical docs claims** | Older references to “Phase 1 only” or “all phases complete / production-ready master” are obsolete and should not be used for launch claims |

---

## 6. What is *not* claimed as shipped

Do **not** claim these without separate implementation and validation:

- any future roadmap or Phase 16 scope not present in code
- application-layer encryption for third-party integration tokens
- production rollout of SSO simply because SAML routes/config screens exist
- release readiness without the remediation checklist and QA handoff being completed

---

## 7. Authoritative companion docs

- `README.md`
- `docs/production/PRODUCT_STATUS_REPORT.md`
- `docs/QA_TESTING_HANDOVER_CURRENT_STATE.md`
- `docs/production/RELEASE_READINESS_CHECKLIST.md`
- `docs/production/WEBHOOKS_AND_INTEGRATIONS.md`
