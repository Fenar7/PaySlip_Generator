# Business Document Generator

Phase 1 foundation for a premium document-generation product built with Next.js. The product will support vouchers, salary slips, and invoices through a shared shell, live preview, and export-ready layout system.

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

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Phase 1 Scope

This branch establishes:

- the landing and module entry experience
- the shared workspace shell used by all generators
- the visual system, fonts, tokens, and interaction baseline
- route scaffolding for Voucher, Salary Slip, and Invoice generators
- CI, unit test, and E2E test foundations

This phase intentionally does not include generator forms, calculations, templates, or export logic yet.

## Repository Notes

- default branch target: `master`
- feature branch prefix: `codex/`
- deploy target: Vercel

## Next Phases

- shared form and branding controls
- normalized document engine and preview model
- voucher, salary slip, and invoice feature delivery
- PDF, PNG, and print export pipeline

## PRD

The original PRD is stored in the repo root as `Phase 1 Product Requirements Document (PRD) v1.1.docx`.
