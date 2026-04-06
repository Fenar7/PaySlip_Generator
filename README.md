# Slipwise

Phase 1 implementation of a premium document-generation product built with Next.js. The app supports vouchers, salary slips, and invoices through a shared shell, live preview, and export-ready layout system.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Motion for interaction polish
- Vitest + Testing Library
- Playwright

## Available Scripts

```bash
npm run dev
npm run lint
npm run test
npm run test:e2e
npm run build
```

## Getting Started

### Prerequisites
- Node.js 22+
- PostgreSQL database (local or [Neon](https://neon.tech) for cloud)

### Setup

1. **Clone and install**
   ```bash
   git clone <repo>
   cd payslip-generator
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your values:
   - `DATABASE_URL` — PostgreSQL connection string
   - `BETTER_AUTH_SECRET` — Random secret (generate with `openssl rand -base64 32`)
   - `BETTER_AUTH_URL` — Your app URL (http://localhost:3000 for dev)
   - `RESEND_API_KEY` — Optional (emails logged to console if absent)
   - `GOOGLE_CLIENT_ID/SECRET` — Optional (disables Google OAuth if absent)

3. **Set up the database**
   ```bash
   npm run supabase:start # if you use the local Supabase stack in this repo
   npx prisma generate    # generate the Prisma client
   npx prisma migrate dev # run migrations (requires running PostgreSQL)
   ```
   App workflows such as invoice save/export, approvals, and notifications depend on the migrated schema.
   If those features fail with `P2021` or "table does not exist" errors, run the Prisma migrations before debugging the UI.
   If your local database has drifted from the committed migration history, reset it with:
   ```bash
   ./node_modules/.bin/prisma migrate reset --force
   ```

4. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

### Development without a database

PDF Studio and the marketing homepage work without any database. For authenticated app features such as saved invoices, approvals, notifications, and workflow pages, you need a running PostgreSQL instance with the committed Prisma migrations applied.

## Phase 1 Scope

This phase includes:

- landing and module entry experience
- shared form primitives, preview shell, and export infrastructure
- Voucher Generator with payment/receipt modes and 2 templates
- Salary Slip Generator with dynamic earnings/deductions and 2 templates
- Invoice Generator with line-item tax math and 3 templates
- session-scoped branding controls with logo upload and accent color
- PDF export, PNG export, and browser print flows
- unit and E2E coverage for preview, print, and export paths

## Deployment

The app is designed to stay stateless and deploy cleanly on Vercel.

- deploy target: Vercel
- runtime expectation for export routes: Node.js serverless functions
- export rendering uses local Chromium in development and `@sparticuz/chromium` on Vercel/Linux
- no database, auth provider, object storage, or background jobs are required for Phase 1

Recommended deployment checks after creating a Vercel preview:

1. Open `/voucher`, `/salary-slip`, and `/invoice`.
2. Confirm each workspace renders and template switching still works.
3. Export one PDF and one PNG from each module.
4. Confirm browser print opens the correct print surface for each module.
5. Verify exported PDFs keep selectable text and PNG downloads complete without server errors.

## Release Verification

Use this sequence before merging release-facing changes:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

If `npm run test:e2e` is rerun multiple times locally in the same shell session, make sure the previous Playwright web server has exited before starting another run.

## Repository Notes

- default branch target: `master`
- feature branch prefix: `codex/`
- deploy target: Vercel

## Excluded From Phase 1

- authentication and user accounts
- saved drafts or document history
- persistent branding/company profiles
- database-backed storage
- recurring invoices or billing automation
- payroll automation and compliance workflows
- team collaboration or approval flows

## PRD

The original PRD is stored in the repo root as `Phase 1 Product Requirements Document (PRD) v1.1.docx`.

The implementation status and acceptance checklist are documented in `docs/phase1-checklist.md`.
