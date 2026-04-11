# Slipwise One

Slipwise One is Zenxvio's multi-module finance and document operations platform. This repository now contains the full application surface — document workflows, receivables, analytics, developer APIs, compliance tooling, internationalization, marketplace features, and partner/developer ecosystem work — not the old Phase 1-only product.

## Current release posture

- Treat the repo as a broad SaaS product, not a template/demo app.
- Use `docs/production/PRODUCT_STATUS_REPORT.md` and `docs/production/RELEASE_READINESS_CHECKLIST.md` for release claims and launch sign-off.
- SSO remains feature-flagged off by default for production rollouts until full SAML verification is explicitly enabled.
- QuickBooks/Zoho token storage accepted risk is documented in `docs/production/WEBHOOKS_AND_INTEGRATIONS.md`.

## Product surfaces

| Area | What is in code |
| --- | --- |
| **SW Docs** | Invoices, vouchers, salary slips, quotes, template store, template marketplace, PDF Studio |
| **SW Pay** | Billing, recurring invoices, receivables, send log, payment proofs, dunning, payment arrangements, TDS |
| **SW Intel** | Dashboards, reports, cash flow intelligence, GST reports |
| **SW Flow** | Approval workflows, activity feed, background job views |
| **Data + Portal** | Customers, vendors, employees, customer portal |
| **Developer** | API v1, OAuth apps, webhook v2, OpenAPI surface |
| **Compliance / Global** | GST compute, HSN/SAC search, IRN/e-invoicing, e-way bill, multi-language, multi-currency |
| **Partner / Ecosystem** | Partner dashboard, client management, integrations, marketplace publishing/install flows |

## Stack

- Next.js 16 App Router + React 19 + TypeScript
- Prisma 7 + PostgreSQL
- Supabase auth/session helpers
- Razorpay for billing and payment collection
- Resend/Brevo/MSG91 for outbound communication flows
- Optional Redis, Sentry, PostHog, OpenAI, QuickBooks, Zoho, IRP, and exchange-rate providers
- Vitest, Playwright, ESLint

## Local setup

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Copy environment template**
   ```bash
   cp .env.example .env
   ```
3. **Fill the minimum local values**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `CRON_SECRET`
   - `DUNNING_OPT_OUT_SECRET`
   - `PORTAL_JWT_SECRET`
4. **Start local services**
   ```bash
   npm run supabase:start
   npm run db:migrate
   ```
5. **Run the app**
   ```bash
   npm run dev
   ```
   Local development runs on `http://localhost:3001`.

## Optional providers

You only need to configure third-party services for the surfaces you want to exercise:

- **Billing / payments:** Razorpay
- **Email / SMS:** Resend, Brevo SMTP, MSG91
- **Compliance / global:** IRP sandbox credentials, Open Exchange Rates
- **Integrations:** QuickBooks, Zoho
- **Observability / caching / AI:** Sentry, PostHog, Redis, OpenAI

The authoritative variable list lives in `.env.example`.

## Validation commands

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
```

For release verification, pair those commands with the manual checks in `docs/QA_TESTING_HANDOVER_CURRENT_STATE.md` and `docs/production/RELEASE_READINESS_CHECKLIST.md`.

## Reference docs

- `docs/PRODUCT_SUMMARY_CURRENT_STATE.md` — truthful product/module summary
- `docs/production/PRODUCT_STATUS_REPORT.md` — current release posture and accepted risks
- `docs/QA_TESTING_HANDOVER_CURRENT_STATE.md` — current QA execution guide
- `docs/production/RELEASE_READINESS_CHECKLIST.md` — merge/release checklist
- `docs/production/WEBHOOKS_AND_INTEGRATIONS.md` — webhook signature verification and integration-token risk notes
