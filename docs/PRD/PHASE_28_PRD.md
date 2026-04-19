# Phase 28 PRD — "The Grand Launch: Commercial Scale & Enterprise Governance"

**Version:** 1.0  
**Date:** April 19, 2026  
**Status:** Final — Ready for Engineering  
**Phase:** 28 of 28 (Terminal Phase)  
**Prerequisites:** Phase 27 (SW Intel Pro) merged to master @ `86673f0`  
**Branching Baseline:** `master` (post Phase 27 merge)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Strategic Context](#2-strategic-context)
3. [Sprint Roadmap Overview](#3-sprint-roadmap-overview)
4. [Sprint 28.1: Unified Billing & Subscription OS](#4-sprint-281-unified-billing--subscription-os)
5. [Sprint 28.2: AWS Enterprise Infrastructure](#5-sprint-282-aws-enterprise-infrastructure)
6. [Sprint 28.3: Advanced Governance & Identity (SSO/RBAC)](#6-sprint-283-advanced-governance--identity-ssorbac)
7. [Sprint 28.4: Platform V2 & Stable Developer Hub](#7-sprint-284-platform-v2--stable-developer-hub)
8. [Sprint 28.5: Launch Hardening & Production Polish](#8-sprint-285-launch-hardening--production-polish)
9. [Data Models (Prisma)](#9-data-models-prisma)
10. [State Machines](#10-state-machines)
11. [API Surface](#11-api-surface)
12. [Security Model](#12-security-model)
13. [Workflow Diagrams](#13-workflow-diagrams)
14. [Non-Functional Requirements](#14-non-functional-requirements)
15. [Permission Matrix](#15-permission-matrix)
16. [Business Rules & Edge Cases](#16-business-rules--edge-cases)
17. [Test Plan (80+ Test Cases)](#17-test-plan-80-test-cases)
18. [Branching & PR Strategy](#18-branching--pr-strategy)
19. [Migration Runbook](#19-migration-runbook)
20. [Risk Register](#20-risk-register)
21. [Success Metrics](#21-success-metrics)
22. [Acceptance Criteria](#22-acceptance-criteria)

---

## 1. Executive Summary

Phase 28 is the terminal phase of the Slipwise One Master Plan. It transforms the platform from a feature-complete SaaS into a commercially scalable, enterprise-governed, production-hardened product ready for public launch.

**Key Outcomes:**
- Revenue-grade billing system with metered usage (Stripe + Razorpay dual-gateway)
- AWS-native infrastructure (ECS Fargate + RDS + S3 + CloudFront)
- Enterprise identity governance (SAML 2.0, OIDC, granular RBAC)
- Stable v1.0 Public API with developer documentation
- Performance-optimized, security-audited, incident-ready product

**This phase does NOT add business features.** It commercializes, hardens, and scales what already exists.

---

## 2. Strategic Context

### 2.1 Current Platform State (Post-Phase 27)

| Suite | Status | Key Capability |
|-------|--------|----------------|
| SW Auth & Access | ✅ Complete | Supabase auth, TOTP 2FA, RBAC, proxy, audit |
| SW> Docs | ✅ Complete | Invoices, vouchers, salary slips, templates, vault |
| SW> Pay | ✅ Complete | Receivables, dunning, reconciliation, payment plans |
| SW> Flow | ✅ Complete | Approvals, tickets, workflows, notifications, scheduling |
| SW Intel | ✅ Complete | Forecasting, tax engine, forensic audit, KPIs, optimizer |
| SW Pixel | ✅ Complete | Passport, compress, resize, convert, adjust |
| PDF Studio | ✅ Complete | Merge, split, watermark, OCR, protect, compress |
| ERP (Phase 26) | ✅ Complete | Multi-entity, WMS, procurement, 3-way match |
| Intel Pro (Phase 27) | ✅ Complete | AI forecaster, global tax, hash-chain audit, optimizer, exec hub |

### 2.2 What Phase 28 Solves

| Gap | Impact | Sprint |
|-----|--------|--------|
| No production billing (Razorpay only, no metering) | Cannot monetize at scale | 28.1 |
| Vercel hosting (single region, cold starts) | Unreliable at enterprise volume | 28.2 |
| No SSO/SAML (enterprise blocker) | Cannot sell to 50+ seat organizations | 28.3 |
| API is internal-only (no developer docs) | Cannot build ecosystem/integrations | 28.4 |
| No performance budget, no BCP, no pen-test | Not launch-ready | 28.5 |

### 2.3 Relationship to Master Plan

The Master Plan (§10, §12, §16, §17) explicitly identifies:
- "Later AWS migration" (§12.9) — Sprint 28.2
- "Enterprise SSO" (§17 Out of Scope Initially) — Sprint 28.3, now in-scope for launch
- "Plan usage metrics for pricing" (§Sprint 10.1) — Sprint 28.1
- "Rate limits" (§Sprint 10.1) — Sprint 28.4
- "Production hardening and commercial readiness" (§Sprint 10.1/10.2) — Sprint 28.5

Phase 28 closes every deferred item from the Master Plan.

---

## 3. Sprint Roadmap Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 28: THE GRAND LAUNCH                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Sprint 28.1 ─── Unified Billing & Subscription OS                         │
│       │           (Stripe + Razorpay, metered billing, tax invoicing)       │
│       ▼                                                                     │
│  Sprint 28.2 ─── AWS Enterprise Infrastructure                             │
│       │           (ECS Fargate, RDS, S3, CloudFront, DR)                    │
│       ▼                                                                     │
│  Sprint 28.3 ─── Advanced Governance & Identity                            │
│       │           (SAML 2.0, OIDC, custom RBAC, data residency)            │
│       ▼                                                                     │
│  Sprint 28.4 ─── Platform V2 & Developer Hub                               │
│       │           (Public API v1.0, template marketplace, webhooks v2)      │
│       ▼                                                                     │
│  Sprint 28.5 ─── Launch Hardening & Production Polish                      │
│                   (Lighthouse 95+, pen-test, BCP, help center)             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Sprint 28.1: Unified Billing & Subscription OS

### 4.1 Objective

Replace the current Razorpay-only billing with a dual-gateway (Stripe + Razorpay) subscription engine that supports plan-based gates, metered add-ons, tax-inclusive invoicing, and automated dunning for failed payments.

### 4.2 Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BILLING ORCHESTRATION LAYER                        │
│                                                                          │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐      │
│   │  Stripe SDK  │    │ Razorpay SDK │    │  Billing Engine       │      │
│   │  (Intl)      │    │  (India)     │    │  (gateway-agnostic)   │      │
│   └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘      │
│          │                   │                       │                   │
│          └───────────────────┴───────────────────────┘                   │
│                              │                                            │
│                    ┌─────────▼──────────┐                                │
│                    │  BillingEvent Log   │                                │
│                    │  (immutable ledger) │                                │
│                    └─────────┬──────────┘                                │
│                              │                                            │
│          ┌───────────────────┼───────────────────┐                       │
│          ▼                   ▼                   ▼                       │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐            │
│   │  Usage       │    │  Plan Gates  │    │  Tax-Inclusive   │            │
│   │  Metering    │    │  Enforcement │    │  Invoicing       │            │
│   └─────────────┘    └─────────────┘    └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Features

#### A. Dual-Gateway Subscription Management

| Capability | Stripe (International) | Razorpay (India) |
|-----------|----------------------|------------------|
| Plan creation | ✅ Product + Price API | ✅ Plan API |
| Checkout | Stripe Checkout / Elements | Razorpay Checkout modal |
| Webhooks | `invoice.paid`, `customer.subscription.*` | `subscription.charged`, `payment.captured` |
| Currency | USD, EUR, GBP | INR |
| Tax | Stripe Tax | Custom GST calculation |
| Retry logic | Smart Retries (3 attempts) | Razorpay auto-retry |

**Gateway Selection Logic:**
```
IF org.billingCountry === "IN" AND org.currency === "INR"
  → Use Razorpay
ELSE
  → Use Stripe
```

#### B. Metered Billing for Utility Usage

| Resource | Unit | Free Tier | Starter | Pro | Enterprise |
|----------|------|-----------|---------|-----|------------|
| PDF Studio Jobs | per job | 50/mo | 500/mo | 5,000/mo | Unlimited |
| Pixel Passport | per photo | 10/mo | 100/mo | 1,000/mo | Unlimited |
| API Requests | per 1,000 | 1,000/mo | 10,000/mo | 100,000/mo | 1M/mo |
| Storage (S3) | per GB | 1 GB | 10 GB | 100 GB | 1 TB |
| Email Sends | per email | 100/mo | 1,000/mo | 10,000/mo | 50,000/mo |

**Overage Handling:**
- Soft limit: warn at 80% usage
- Hard limit: block at 100% for free tier; charge overage for paid tiers
- Overage rate: Plan price × 0.001 per unit over limit
- Grace period: 24 hours for paid tiers before blocking

#### C. Tax-Inclusive Subscription Invoicing

- Auto-generate `BillingInvoice` on every successful payment
- Apply org-local GST/VAT using the Phase 27 Global Tax Engine
- Include HSN/SAC codes for Indian GST compliance
- PDF generation using the existing Slipwise Docs engine (self-referential)
- Email delivery via Resend on successful payment

#### D. Billing Dunning (Failed Payments)

```
STATE MACHINE: Payment Retry
─────────────────────────────
ACTIVE → PAST_DUE (payment fails)
PAST_DUE → ACTIVE (retry succeeds within 7 days)
PAST_DUE → UNPAID (3 retries fail over 14 days)
UNPAID → CANCELLED (no payment within 30 days)
CANCELLED → ACTIVE (manual re-subscribe + payment)

Retry Schedule:
  Day 1: Automatic retry
  Day 3: Retry + email notification
  Day 7: Retry + email + in-app banner
  Day 14: Final retry + grace period warning
  Day 30: Plan downgraded to Free, data retained 90 days
```

### 4.4 Files to Create/Modify

| Path | Purpose |
|------|---------|
| `src/lib/billing/engine.ts` | Gateway-agnostic billing orchestration |
| `src/lib/billing/stripe.ts` | Stripe SDK adapter |
| `src/lib/billing/razorpay.ts` | Razorpay SDK adapter (refactor existing) |
| `src/lib/billing/metering.ts` | Usage metering service |
| `src/lib/billing/invoicing.ts` | Tax-inclusive invoice generation |
| `src/lib/billing/dunning.ts` | Failed payment retry logic |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `src/app/api/webhooks/razorpay/route.ts` | Razorpay webhook handler (refactor) |
| `src/app/app/settings/billing/page.tsx` | Billing management UI |
| `src/app/app/settings/billing/actions.ts` | Billing server actions |
| `src/app/api/cron/billing-dunning/route.ts` | Dunning cron job |
| `prisma/migrations/2026XXXX_phase28_billing/migration.sql` | Schema migration |

---

## 5. Sprint 28.2: AWS Enterprise Infrastructure

### 5.1 Objective

Migrate the Slipwise One production deployment from Vercel to AWS, achieving multi-region availability, auto-scaling, disaster recovery, and cost-predictable infrastructure suitable for enterprise SLAs.

### 5.2 Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS ARCHITECTURE                                 │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  REGION: ap-south-1 (Primary) / eu-west-1 (DR)                          │ │
│  │                                                                          │ │
│  │  Route 53 (DNS) → CloudFront (CDN + Edge) → ALB (Application LB)       │ │
│  │       │                                          │                       │ │
│  │       │              ┌───────────────────────────┤                       │ │
│  │       ▼              ▼                           ▼                       │ │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐          │ │
│  │  │ ECS      │  │ ECS          │  │ ECS                       │          │ │
│  │  │ Fargate  │  │ Fargate      │  │ Fargate                   │          │ │
│  │  │ (Web)    │  │ (Workers)    │  │ (Cron)                    │          │ │
│  │  │ Min: 2   │  │ Min: 1       │  │ Scheduled Tasks           │          │ │
│  │  │ Max: 20  │  │ Max: 10      │  │                           │          │ │
│  │  └────┬─────┘  └──────┬───────┘  └───────────┬───────────────┘          │ │
│  │       │               │                       │                          │ │
│  │       └───────────────┴───────────────────────┘                          │ │
│  │                       │                                                   │ │
│  │         ┌─────────────┼──────────────────┐                               │ │
│  │         ▼             ▼                  ▼                               │ │
│  │  ┌────────────┐ ┌──────────┐ ┌─────────────────┐                       │ │
│  │  │  RDS       │ │  S3      │ │  ElastiCache     │                       │ │
│  │  │  Postgres  │ │  (Files) │ │  (Redis)         │                       │ │
│  │  │  Multi-AZ  │ │  Versioned│ │  Cluster Mode   │                       │ │
│  │  │  db.r6g.lg │ │          │ │                   │                       │ │
│  │  └────────────┘ └──────────┘ └─────────────────┘                       │ │
│  │                                                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  Monitoring: CloudWatch + X-Ray + Sentry                                     │
│  Secrets: AWS Secrets Manager                                                │
│  CI/CD: GitHub Actions → ECR → ECS Blue/Green                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Infrastructure Components

#### A. Compute: ECS Fargate

| Service | Container Image | vCPU | Memory | Min | Max | Scaling Trigger |
|---------|----------------|------|--------|-----|-----|-----------------|
| `slipwise-web` | Next.js standalone | 1 | 2 GB | 2 | 20 | CPU > 70% for 60s |
| `slipwise-worker` | Worker process | 0.5 | 1 GB | 1 | 10 | SQS queue depth > 100 |
| `slipwise-cron` | Cron runner | 0.25 | 512 MB | 1 | 1 | Scheduled (CloudWatch Events) |

#### B. Database: RDS PostgreSQL 16

| Setting | Value |
|---------|-------|
| Instance | db.r6g.large (2 vCPU, 16 GB RAM) |
| Storage | 100 GB gp3 (auto-expand to 500 GB) |
| Multi-AZ | ✅ Synchronous standby |
| Backup | Automated daily, 30-day retention |
| Read Replicas | 1 (for analytics/reporting queries) |
| Encryption | AES-256 (AWS KMS) at rest + TLS in transit |
| Parameter Group | `max_connections=200`, `work_mem=16MB`, `shared_buffers=4GB` |

#### C. Storage: S3

| Bucket | Purpose | Versioning | Lifecycle |
|--------|---------|------------|-----------|
| `slipwise-prod-documents` | Generated PDFs, exports | ✅ | Glacier after 365 days |
| `slipwise-prod-uploads` | User uploads (proofs, logos) | ✅ | Delete after 730 days |
| `slipwise-prod-backups` | DB snapshots, audit packages | ✅ | Deep Glacier after 2555 days |
| `slipwise-prod-static` | Static assets (Next.js build) | ❌ | 30 day cache |

#### D. CDN: CloudFront

- Global edge distribution for static assets
- Origin: ALB (dynamic) + S3 (static)
- Cache TTL: Static 365d, API 0s, Pages 60s (stale-while-revalidate)
- Custom domain: `app.slipwise.com`
- SSL: ACM certificate (auto-renewal)
- WAF: AWS WAF with rate limiting rules

#### E. Disaster Recovery

| Component | RPO | RTO | Strategy |
|-----------|-----|-----|----------|
| Database | 5 min | 15 min | Multi-AZ failover + cross-region replica |
| Application | 0 | 5 min | Blue/green deployment, multi-AZ |
| Storage (S3) | 0 | 0 | Cross-region replication |
| Cache (Redis) | N/A | 2 min | Cluster mode, auto-failover |

### 5.4 Migration Runbook (High-Level)

```
Phase A: Preparation (Week 1)
  1. Provision all AWS resources via Terraform/CDK
  2. Set up VPC, subnets, security groups
  3. Configure RDS with pgloader for initial data migration
  4. Containerize Next.js app with standalone output mode
  5. Push to ECR, test ECS deployment in staging

Phase B: Parallel Run (Week 2)
  1. Enable read-replica syncing from Vercel Postgres → AWS RDS
  2. Route 10% traffic to AWS via weighted Route 53
  3. Monitor: latency, error rate, cache hit ratio
  4. Validate S3 storage integration

Phase C: Cutover (Week 3)
  1. DNS cutover: Route 53 → CloudFront → ALB (100%)
  2. Final pgdump + restore for transactional consistency
  3. Verify all cron jobs fire correctly on ECS
  4. Disable Vercel deployment
  5. 48-hour monitoring period

Phase D: Optimization (Week 4)
  1. Tune auto-scaling thresholds
  2. Enable CloudWatch dashboards + alarms
  3. Configure billing alerts
  4. Document runbook for on-call team
```

### 5.5 Files to Create/Modify

| Path | Purpose |
|------|---------|
| `infra/terraform/main.tf` | Root Terraform configuration |
| `infra/terraform/modules/ecs/` | ECS Fargate module |
| `infra/terraform/modules/rds/` | RDS PostgreSQL module |
| `infra/terraform/modules/cdn/` | CloudFront + S3 module |
| `infra/terraform/modules/vpc/` | Networking module |
| `Dockerfile` | Updated production Dockerfile (standalone Next.js) |
| `.github/workflows/deploy-aws.yml` | CI/CD pipeline (ECR + ECS) |
| `docs/runbooks/aws-migration.md` | Detailed migration runbook |
| `docs/runbooks/disaster-recovery.md` | DR procedures |

---

## 6. Sprint 28.3: Advanced Governance & Identity (SSO/RBAC)

### 6.1 Objective

Implement enterprise-grade identity federation (SAML 2.0 + OIDC), granular custom RBAC with per-resource permissions, and data residency controls for multi-region compliance.

### 6.2 SAML 2.0 / OIDC Implementation

#### A. SP-Initiated SSO Flow

```
┌──────────┐         ┌──────────────┐         ┌───────────────┐
│  Browser  │         │  Slipwise SP  │         │  Customer IdP  │
│  (User)   │         │  (Service     │         │  (Okta/Azure   │
│           │         │   Provider)   │         │   AD/Google)   │
└─────┬─────┘         └──────┬───────┘         └───────┬───────┘
      │                      │                          │
      │  1. GET /app/login   │                          │
      │─────────────────────▶│                          │
      │                      │                          │
      │  2. Detect SSO domain│                          │
      │  (check SsoConfig)   │                          │
      │                      │                          │
      │  3. Redirect to IdP  │                          │
      │◀─────────────────────│                          │
      │                      │                          │
      │  4. AuthnRequest     │                          │
      │─────────────────────────────────────────────────▶│
      │                      │                          │
      │  5. User authenticates with IdP                 │
      │                      │                          │
      │  6. SAMLResponse (POST to /api/auth/saml/acs)   │
      │◀─────────────────────────────────────────────────│
      │                      │                          │
      │  7. Validate signature, assertions              │
      │─────────────────────▶│                          │
      │                      │                          │
      │  8. Create/update user session                  │
      │                      │                          │
      │  9. Redirect to /app/home                       │
      │◀─────────────────────│                          │
```

#### B. OIDC Flow (Authorization Code + PKCE)

```
1. User hits /app/login → detect OIDC config for email domain
2. Redirect to IdP authorize endpoint with code_challenge (S256)
3. User authenticates at IdP
4. IdP redirects to /api/auth/oidc/callback with authorization code
5. Backend exchanges code for tokens (using code_verifier)
6. Validate id_token signature (JWKS)
7. Extract claims (email, name, groups)
8. Map IdP groups → Slipwise roles (via SsoGroupMapping)
9. Create/update Profile + Member, issue session
```

#### C. Configuration Model

```typescript
interface SsoConfig {
  orgId: string;
  protocol: "SAML" | "OIDC";
  // SAML fields
  idpEntityId?: string;
  idpSsoUrl?: string;
  idpCertificate?: string; // X.509 PEM
  spEntityId?: string;     // auto-generated
  spAcsUrl?: string;       // /api/auth/saml/acs
  // OIDC fields
  issuerUrl?: string;
  clientId?: string;
  clientSecret?: string;   // encrypted at rest
  jwksUrl?: string;
  // Common
  emailDomains: string[];  // e.g., ["acme.com"]
  autoProvision: boolean;  // create users on first login
  defaultRole: string;     // role for auto-provisioned users
  enforceForAll: boolean;  // block password login
  isActive: boolean;
}
```

### 6.3 Granular Custom RBAC

#### A. Permission Model

```
Permission = {resource}:{action}

Resources: invoice, voucher, salary_slip, customer, vendor, employee,
           payment, quote, report, template, workflow, approval,
           billing, settings, audit_log, api_key, webhook, user

Actions: create, read, update, delete, send, approve, export, archive

Examples:
  "invoice:create"
  "invoice:send"
  "payment:approve"
  "billing:update"
  "audit_log:export"
  "user:delete"
```

#### B. Custom Role Definition

```typescript
interface CustomRole {
  orgId: string;
  name: string;           // e.g., "Finance Manager"
  description: string;
  permissions: string[];  // ["invoice:*", "payment:read", "report:export"]
  isSystem: boolean;      // true for owner/admin/member (immutable)
  createdBy: string;
  inheritsFrom?: string;  // optional base role
}
```

**System Roles (immutable):**
| Role | Permissions |
|------|------------|
| `owner` | `*:*` (all permissions) |
| `admin` | All except `billing:*`, `settings:delete_org` |
| `member` | Read all, create docs, limited send |
| `viewer` | `*:read` only |

**Custom Role Rules:**
- Custom roles can only grant permissions the creating admin already has
- A user can have exactly one role per organization
- Role changes are audit-logged
- SSO group mappings auto-assign roles

#### C. Data Residency Controls

| Region | Data Center | Storage Bucket | DB Region |
|--------|-------------|----------------|-----------|
| India (default) | `ap-south-1` | `slipwise-prod-in-*` | Mumbai |
| EU | `eu-west-1` | `slipwise-prod-eu-*` | Ireland |
| US | `us-east-1` | `slipwise-prod-us-*` | Virginia |

**Enforcement:**
- Organization-level setting: `dataResidency: "IN" | "EU" | "US"`
- All document storage, backups, and processing stay within the chosen region
- Cross-region API calls are blocked at the middleware layer
- Audit logs record residency compliance per request

### 6.4 Files to Create/Modify

| Path | Purpose |
|------|---------|
| `src/lib/auth/saml.ts` | SAML 2.0 SP implementation |
| `src/lib/auth/oidc.ts` | OIDC client implementation |
| `src/lib/auth/sso-config.ts` | SSO configuration management |
| `src/app/api/auth/saml/acs/route.ts` | SAML Assertion Consumer Service |
| `src/app/api/auth/saml/metadata/route.ts` | SP metadata XML endpoint |
| `src/app/api/auth/oidc/callback/route.ts` | OIDC callback handler |
| `src/lib/auth/rbac.ts` | Custom RBAC engine |
| `src/lib/auth/permissions.ts` | Permission definitions and checking |
| `src/app/app/settings/sso/page.tsx` | SSO configuration UI |
| `src/app/app/settings/roles/custom/page.tsx` | Custom role management |
| `src/app/app/settings/data-residency/page.tsx` | Data residency UI |
| `prisma/migrations/2026XXXX_phase28_sso_rbac/migration.sql` | Schema |

---

## 7. Sprint 28.4: Platform V2 & Stable Developer Hub

### 7.1 Objective

Release a stable v1.0 Public REST API with versioning, comprehensive documentation, tier-based rate limiting, a user-contributed Template Marketplace, and a hardened webhook delivery system with retry and dead-letter queues.

### 7.2 Public API v1.0

#### A. Versioning Strategy

```
Base URL: https://api.slipwise.com/v1/

Versioning: URL-prefix (/v1/, /v2/)
Deprecation: 12-month sunset window
Headers:
  X-API-Version: 2026-04-01 (date-based for breaking changes within v1)
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 950
  X-RateLimit-Reset: 1714060800
```

#### B. Rate Limiting (Tier-Based)

| Tier | Requests/min | Requests/day | Burst | Concurrent |
|------|-------------|-------------|-------|------------|
| Free | 60 | 1,000 | 10 | 2 |
| Starter | 300 | 10,000 | 30 | 5 |
| Pro | 1,000 | 100,000 | 100 | 20 |
| Enterprise | 5,000 | 1,000,000 | 500 | 100 |

**Rate Limit Algorithm:** Token Bucket with sliding window (Redis-backed)

**429 Response:**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Retry after 30 seconds.",
  "retryAfter": 30,
  "limit": 1000,
  "remaining": 0,
  "resetAt": "2026-04-19T12:00:00Z"
}
```

#### C. API Endpoint Surface (v1)

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/v1/invoices` | List invoices | `invoices:read` |
| POST | `/v1/invoices` | Create invoice | `invoices:write` |
| GET | `/v1/invoices/:id` | Get invoice | `invoices:read` |
| PATCH | `/v1/invoices/:id` | Update invoice | `invoices:write` |
| POST | `/v1/invoices/:id/send` | Send invoice | `invoices:send` |
| POST | `/v1/invoices/:id/pdf` | Generate PDF | `invoices:export` |
| GET | `/v1/customers` | List customers | `customers:read` |
| POST | `/v1/customers` | Create customer | `customers:write` |
| GET | `/v1/payments` | List payments | `payments:read` |
| GET | `/v1/reports/receivables` | Receivables report | `reports:read` |
| GET | `/v1/reports/kpis` | Executive KPIs | `reports:read` |
| POST | `/v1/webhooks` | Create webhook endpoint | `webhooks:write` |
| GET | `/v1/usage` | Current usage metrics | `billing:read` |

#### D. Template Marketplace

**Concept:** Allow organizations to publish their document templates for others to install. Revenue split: 70% creator / 30% platform.

```typescript
interface MarketplaceTemplate {
  id: string;
  publisherOrgId: string;
  name: string;
  description: string;
  category: "invoice" | "voucher" | "salary_slip" | "quote";
  industry: string;          // "healthcare", "retail", "hospitality", etc.
  thumbnailUrl: string;
  previewUrl: string;
  templateData: JSON;        // serialized template config
  price: number;             // 0 for free templates
  currency: string;
  installCount: number;
  rating: number;            // 1-5 aggregate
  status: "DRAFT" | "REVIEW" | "PUBLISHED" | "SUSPENDED";
  publishedAt: Date | null;
}
```

**Marketplace Rules:**
- Templates undergo automated review (no executable code, valid schema)
- Publishers must be on Pro or Enterprise plan
- Free templates: unlimited installs
- Paid templates: one-time purchase, linked to org

### 7.3 Webhook V2 (Retry + Dead Letter)

#### A. Retry Strategy

```
Attempt 1: Immediate
Attempt 2: 5 minutes
Attempt 3: 30 minutes
Attempt 4: 2 hours
Attempt 5: 12 hours
Attempt 6: 24 hours (final)

Failure criteria: HTTP 4xx (no retry) or 5xx/timeout (retry)
Timeout: 30 seconds per attempt
```

#### B. Dead Letter Queue

After 6 failed attempts:
- Move delivery to `webhook_dead_letter` table
- Send email notification to org admins
- Retain for 30 days for manual replay
- Provide "Replay" button in webhook management UI

#### C. Webhook Signature

```
X-Slipwise-Signature: t=1714060800,v1=sha256_hmac(timestamp.payload, secret)
X-Slipwise-Webhook-Id: evt_abc123
X-Slipwise-Attempt: 3
```

### 7.4 Files to Create/Modify

| Path | Purpose |
|------|---------|
| `src/app/api/v1/[...path]/route.ts` | Versioned API router |
| `src/lib/api/rate-limiter.ts` | Token bucket rate limiter |
| `src/lib/api/versioning.ts` | API version resolution |
| `src/lib/api/docs-generator.ts` | OpenAPI 3.1 spec generator |
| `src/app/app/settings/developer/api-docs/page.tsx` | Developer docs UI |
| `src/lib/marketplace/templates.ts` | Template marketplace service |
| `src/app/app/docs/templates/marketplace/page.tsx` | Marketplace UI |
| `src/lib/webhooks/retry-engine.ts` | Webhook retry with exponential backoff |
| `src/lib/webhooks/dead-letter.ts` | Dead letter queue management |
| `docs/api/openapi.yaml` | OpenAPI specification |
| `docs/api/DEVELOPER_GUIDE.md` | Developer documentation |

---

## 8. Sprint 28.5: Launch Hardening & Production Polish

### 8.1 Objective

Achieve a Lighthouse score of 95+ across all core pages, remediate findings from a security penetration audit, establish Business Continuity procedures, and launch a public Help Center.

### 8.2 Performance Optimization

#### A. Target Metrics

| Metric | Target | Current (est.) | Strategy |
|--------|--------|----------------|----------|
| LCP (Largest Contentful Paint) | < 1.5s | ~2.5s | Streaming SSR, image optimization |
| FID (First Input Delay) | < 50ms | ~80ms | Code splitting, React lazy |
| CLS (Cumulative Layout Shift) | < 0.05 | ~0.12 | Layout reservation, font preload |
| TTI (Time to Interactive) | < 2.0s | ~3.5s | Bundle analysis, tree shaking |
| Lighthouse Score | 95+ | ~75 | All below |

#### B. Optimization Strategy

```
1. Bundle Size Reduction
   - Analyze with @next/bundle-analyzer
   - Lazy-load Recharts (only on dashboard/intel pages)
   - Replace heavy date libraries with native Intl
   - Dynamic imports for PDF generation libraries

2. Rendering Optimization
   - React Server Components for all data-fetching pages
   - Streaming with Suspense boundaries on dashboards
   - Static generation for marketing pages
   - ISR for template marketplace listings

3. Asset Optimization
   - next/image with AVIF/WebP auto-format
   - Font subsetting (only used glyphs)
   - CSS purge unused Tailwind classes
   - Preconnect to Supabase/S3 origins

4. Caching Strategy
   - Redis: session data, rate limits, KPI snapshots (TTL: 5 min)
   - S3 + CloudFront: static assets (TTL: 365 days, immutable)
   - Browser: Service Worker for offline shell
   - DB: Materialized views for heavy reports
```

### 8.3 Security Penetration Audit

#### A. Scope

| Category | Items to Test |
|----------|--------------|
| Authentication | Session fixation, token replay, CSRF |
| Authorization | IDOR across all endpoints (200+ routes) |
| Injection | SQL injection (Prisma parameterized), XSS, SSRF |
| Cryptographic | Hash chain integrity, key management, TLS config |
| Business Logic | State machine bypasses, race conditions, double-spend |
| API Security | Rate limit bypass, scope escalation, webhook SSRF |
| Infrastructure | S3 bucket policy, RDS public access, security groups |

#### B. Remediation Process

```
1. Automated scan: OWASP ZAP + Semgrep
2. Manual testing: Focus on IDOR, state machine bypass, webhook SSRF
3. Findings classified: Critical (fix in 24h), High (fix in 72h), Medium (fix in sprint)
4. All fixes must include regression test
5. Re-scan after fix to confirm remediation
```

### 8.4 Business Continuity Plan (BCP)

#### A. Incident Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| SEV-1 | Platform down, data loss risk | 15 min | CTO + On-call engineer |
| SEV-2 | Major feature broken, billing affected | 1 hour | Engineering lead |
| SEV-3 | Minor feature degraded | 4 hours | Assigned engineer |
| SEV-4 | Cosmetic issue, documentation | Next sprint | Backlog |

#### B. Runbook Structure

```
/docs/runbooks/
├── incident-response.md        # General incident playbook
├── database-failover.md        # RDS failover procedure
├── deployment-rollback.md      # ECS blue/green rollback
├── billing-incident.md         # Payment system failure
├── data-breach-response.md     # Security incident
├── ssl-certificate-renewal.md  # Certificate management
└── scaling-emergency.md        # Emergency auto-scale overrides
```

### 8.5 Public Help Center

**Platform:** In-app help center at `/help` + docs at `docs.slipwise.com`

**Content Structure:**
```
Getting Started
├── Creating your organization
├── Inviting team members
├── Setting up branding defaults
├── Your first invoice
└── Understanding plans and billing

Documents
├── Invoice Studio guide
├── Voucher Studio guide
├── Salary Slip guide
├── Template Store
└── PDF Studio tools

Payments & Collections
├── Payment tracking
├── Dunning automation
├── Payment arrangements
├── Customer portal
└── Recurring invoices

Intelligence & Reports
├── Executive Dashboard
├── Cash flow forecasting
├── Tax compliance
├── Audit trail
└── Flash reports

Administration
├── Roles and permissions
├── SSO configuration
├── API keys and webhooks
├── Data residency
└── Billing management

Developer Guide
├── API authentication
├── Rate limits
├── Webhook events
├── SDKs and libraries
└── Changelog
```

### 8.6 Files to Create/Modify

| Path | Purpose |
|------|---------|
| `next.config.ts` | Performance: bundle analyzer, image optimization |
| `src/app/(marketing)/help/` | Help center pages |
| `docs/runbooks/*.md` | Operational runbooks |
| `scripts/lighthouse-ci.ts` | Automated Lighthouse CI check |
| `.github/workflows/lighthouse.yml` | Performance CI gate |
| `.github/workflows/security-scan.yml` | OWASP ZAP + Semgrep |
| `src/middleware.ts` | CSP headers, security hardening |

---

## 9. Data Models (Prisma)

### 9.1 Sprint 28.1: Billing Models

```prisma
// ─── Phase 28.1: Unified Billing ──────────────────────────────────────────

model BillingAccount {
  id                  String    @id @default(cuid())
  orgId               String    @unique
  // Gateway references
  stripeCustomerId    String?   @unique
  razorpayCustomerId  String?   @unique
  // Settings
  gateway             String    @default("RAZORPAY") // "STRIPE" | "RAZORPAY"
  billingEmail        String?
  billingCountry      String    @default("IN")
  currency            String    @default("INR")
  taxId               String?   // GST/VAT registration number
  // Payment method
  defaultPaymentMethod String?  // pm_xxx (Stripe) or method_xxx (Razorpay)
  // State
  status              String    @default("ACTIVE") // ACTIVE | SUSPENDED | CLOSED
  suspendedAt         DateTime?
  suspendedReason     String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  organization Organization       @relation(fields: [orgId], references: [id], onDelete: Cascade)
  events       BillingEvent[]
  overageLines OverageLine[]

  @@map("billing_account")
}

model BillingEvent {
  id               String   @id @default(cuid())
  billingAccountId String
  type             String   // SUBSCRIPTION_CREATED | PAYMENT_SUCCESS | PAYMENT_FAILED |
                            // OVERAGE_CHARGED | REFUND | PLAN_CHANGED | TRIAL_ENDED
  gatewayEventId   String?  @unique // stripe event ID or razorpay event ID
  amount           BigInt?  // in smallest unit (paise/cents)
  currency         String?
  metadata         Json?
  processedAt      DateTime @default(now())

  billingAccount BillingAccount @relation(fields: [billingAccountId], references: [id], onDelete: Cascade)

  @@index([billingAccountId, processedAt])
  @@map("billing_event")
}

model OverageLine {
  id               String   @id @default(cuid())
  billingAccountId String
  resource         String   // "pdf_jobs" | "pixel_jobs" | "api_requests" | "storage_gb" | "emails"
  periodMonth      String   // "2026-04"
  includedUnits    Int
  usedUnits        Int
  overageUnits     Int      @default(0)
  overageRate      BigInt   // rate per unit in smallest currency unit
  overageAmount    BigInt   @default(0)
  chargedAt        DateTime?
  createdAt        DateTime @default(now())

  billingAccount BillingAccount @relation(fields: [billingAccountId], references: [id], onDelete: Cascade)

  @@unique([billingAccountId, resource, periodMonth])
  @@index([billingAccountId, periodMonth])
  @@map("overage_line")
}

model BillingDunningAttempt {
  id               String   @id @default(cuid())
  orgId            String
  subscriptionId   String
  attemptNumber    Int      // 1-6
  scheduledAt      DateTime
  executedAt       DateTime?
  gatewayResponse  Json?
  status           String   @default("PENDING") // PENDING | SUCCESS | FAILED | SKIPPED
  notificationSent Boolean  @default(false)
  createdAt        DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, status])
  @@index([scheduledAt, status])
  @@map("billing_dunning_attempt")
}
```

### 9.2 Sprint 28.3: SSO & RBAC Models

```prisma
// ─── Phase 28.3: SSO & Custom RBAC ────────────────────────────────────────

model SsoConfig {
  id              String    @id @default(cuid())
  orgId           String    @unique
  protocol        String    // "SAML" | "OIDC"
  // SAML
  idpEntityId     String?
  idpSsoUrl       String?
  idpCertificate  String?   @db.Text  // X.509 PEM
  spEntityId      String?
  // OIDC
  issuerUrl       String?
  clientId        String?
  clientSecret    String?   // encrypted
  jwksUrl         String?
  // Common
  emailDomains    String[]  // domains that trigger SSO
  autoProvision   Boolean   @default(true)
  defaultRoleId   String?   // role for auto-provisioned users
  enforceForAll   Boolean   @default(false) // block password login
  isActive        Boolean   @default(false)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  organization  Organization    @relation(fields: [orgId], references: [id], onDelete: Cascade)
  groupMappings SsoGroupMapping[]

  @@map("sso_config")
}

model SsoGroupMapping {
  id          String @id @default(cuid())
  ssoConfigId String
  idpGroup    String  // group name from IdP (e.g., "Finance Team")
  roleId      String  // maps to CustomRole.id

  ssoConfig SsoConfig  @relation(fields: [ssoConfigId], references: [id], onDelete: Cascade)
  role      CustomRole @relation(fields: [roleId], references: [id])

  @@unique([ssoConfigId, idpGroup])
  @@map("sso_group_mapping")
}

model SsoSession {
  id              String   @id @default(cuid())
  orgId           String
  userId          String   @db.Uuid
  idpSessionId    String?
  nameId          String?  // SAML NameID
  authenticatedAt DateTime @default(now())
  expiresAt       DateTime

  @@index([userId, expiresAt])
  @@map("sso_session")
}

model CustomRole {
  id           String   @id @default(cuid())
  orgId        String
  name         String
  description  String   @default("")
  permissions  String[] // ["invoice:create", "invoice:read", "payment:approve"]
  isSystem     Boolean  @default(false) // true for built-in roles
  inheritsFrom String?  // parent role ID for permission inheritance
  createdBy    String   @db.Uuid
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  organization  Organization      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  groupMappings SsoGroupMapping[]
  members       Member[]

  @@unique([orgId, name])
  @@index([orgId])
  @@map("custom_role")
}

model DataResidencyConfig {
  id        String   @id @default(cuid())
  orgId     String   @unique
  region    String   @default("IN") // "IN" | "EU" | "US"
  lockedAt  DateTime? // once locked, cannot change without support
  lockedBy  String?  @db.Uuid
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("data_residency_config")
}
```

### 9.3 Sprint 28.4: Marketplace & Webhooks V2

```prisma
// ─── Phase 28.4: Template Marketplace ─────────────────────────────────────

model MarketplaceTemplate {
  id            String    @id @default(cuid())
  publisherOrgId String
  name          String
  description   String    @db.Text
  category      String    // "invoice" | "voucher" | "salary_slip" | "quote"
  industry      String    @default("general")
  thumbnailUrl  String?
  previewUrl    String?
  templateData  Json      // serialized template configuration
  price         Int       @default(0) // in smallest currency unit (0 = free)
  currency      String    @default("INR")
  installCount  Int       @default(0)
  ratingSum     Int       @default(0)
  ratingCount   Int       @default(0)
  status        String    @default("DRAFT") // DRAFT | REVIEW | PUBLISHED | SUSPENDED
  publishedAt   DateTime?
  rejectedAt    DateTime?
  rejectionReason String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  publisherOrg  Organization           @relation("MarketplacePublisher", fields: [publisherOrgId], references: [id])
  installations MarketplaceInstall[]
  reviews       MarketplaceReview[]

  @@index([status, category])
  @@index([publisherOrgId])
  @@map("marketplace_template")
}

model MarketplaceInstall {
  id         String   @id @default(cuid())
  templateId String
  orgId      String
  installedBy String  @db.Uuid
  installedAt DateTime @default(now())

  template     MarketplaceTemplate @relation(fields: [templateId], references: [id])
  organization Organization        @relation(fields: [orgId], references: [id])

  @@unique([templateId, orgId])
  @@map("marketplace_install")
}

model MarketplaceReview {
  id         String   @id @default(cuid())
  templateId String
  orgId      String
  reviewerId String   @db.Uuid
  rating     Int      // 1-5
  comment    String?
  createdAt  DateTime @default(now())

  template MarketplaceTemplate @relation(fields: [templateId], references: [id])

  @@unique([templateId, orgId])
  @@map("marketplace_review")
}

// ─── Phase 28.4: Webhook V2 Enhancements ──────────────────────────────────

model WebhookDeadLetter {
  id           String   @id @default(cuid())
  endpointId   String
  orgId        String
  eventType    String
  payload      Json
  attempts     Int      @default(6)
  lastAttemptAt DateTime
  lastError    String?
  replayedAt   DateTime?
  replayedBy   String?  @db.Uuid
  expiresAt    DateTime // 30 days from creation
  createdAt    DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, createdAt])
  @@index([expiresAt])
  @@map("webhook_dead_letter")
}

// ─── Phase 28.4: Public API Token ─────────────────────────────────────────

model PublicApiToken {
  id          String    @id @default(cuid())
  orgId       String
  name        String
  tokenHash   String    @unique
  tokenPrefix String    // "sk_live_" or "sk_test_"
  version     String    @default("v1") // API version this token targets
  scopes      String[]  // ["invoices:read", "invoices:write"]
  rateLimit   Int       @default(1000) // requests per minute
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  isActive    Boolean   @default(true)
  createdBy   String    @db.Uuid
  createdAt   DateTime  @default(now())
  revokedAt   DateTime?
  revokedBy   String?   @db.Uuid

  organization Organization    @relation(fields: [orgId], references: [id], onDelete: Cascade)
  requestLogs  ApiRequestLog[]

  @@index([orgId, isActive])
  @@index([tokenHash])
  @@map("public_api_token")
}
```

---

## 10. State Machines

### 10.1 Subscription Lifecycle

```
┌───────────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION STATE MACHINE                           │
│                                                                        │
│  ┌──────────┐  subscribe   ┌──────────┐  trial ends  ┌──────────┐   │
│  │  (none)  │─────────────▶│ TRIALING │────────────▶│  ACTIVE  │   │
│  └──────────┘              └──────────┘             └─────┬─────┘   │
│                                 │                         │          │
│                   trial cancel  │          payment fail   │          │
│                                 ▼                         ▼          │
│                          ┌──────────┐              ┌──────────┐     │
│                          │CANCELLED │◀─────────────│ PAST_DUE │     │
│                          └──────────┘  30d timeout └─────┬─────┘    │
│                                ▲                         │          │
│                                │                  retry success     │
│                                │                         │          │
│                   user cancel  │                         ▼          │
│                   (at period   │                   ┌──────────┐     │
│                    end)        │◀──────────────────│  ACTIVE  │     │
│                                │                   └──────────┘     │
│                                │                                     │
│  ┌──────────┐  resume    ┌─────┴────┐                               │
│  │  ACTIVE  │◀───────────│  PAUSED  │                               │
│  └──────────┘            └──────────┘                               │
│                                                                        │
│  Transitions:                                                          │
│    TRIALING → ACTIVE (payment method added + trial ends)              │
│    TRIALING → CANCELLED (no payment method at trial end)              │
│    ACTIVE → PAST_DUE (payment attempt fails)                         │
│    PAST_DUE → ACTIVE (retry payment succeeds)                        │
│    PAST_DUE → CANCELLED (6 retries exhausted over 30 days)           │
│    ACTIVE → PAUSED (admin requests pause, max 90 days)               │
│    PAUSED → ACTIVE (auto-resume at pausedUntil or manual resume)     │
│    ACTIVE → CANCELLED (user cancels at period end)                   │
│    CANCELLED → ACTIVE (re-subscribe with new payment)                │
└───────────────────────────────────────────────────────────────────────┘
```

### 10.2 Multi-Region Data Sync

```
┌───────────────────────────────────────────────────────────────────────┐
│                    DATA RESIDENCY STATE MACHINE                         │
│                                                                        │
│  ┌──────────────┐  set region  ┌──────────────┐                      │
│  │  UNASSIGNED  │─────────────▶│  CONFIGURED  │                      │
│  └──────────────┘              └──────┬───────┘                      │
│                                       │                               │
│                            confirm    │                               │
│                            (admin)    ▼                               │
│                                ┌──────────────┐                      │
│                                │   MIGRATING  │ (if changing region)  │
│                                └──────┬───────┘                      │
│                                       │                               │
│                            complete   │                               │
│                                       ▼                               │
│                                ┌──────────────┐                      │
│                                │    LOCKED    │                       │
│                                └──────────────┘                      │
│                                                                        │
│  LOCKED means:                                                         │
│    - Region cannot be changed without support ticket                  │
│    - All new data routed to assigned region bucket                    │
│    - Cross-region API calls blocked                                   │
│    - Compliance certificate available for download                    │
└───────────────────────────────────────────────────────────────────────┘
```

### 10.3 Webhook Delivery State Machine

```
PENDING → DELIVERING (picked up by worker)
DELIVERING → DELIVERED (2xx response)
DELIVERING → RETRYING (5xx/timeout, attempt < 6)
RETRYING → DELIVERING (retry time reached)
RETRYING → DEAD_LETTER (attempt >= 6)
DEAD_LETTER → REPLAYING (manual replay triggered)
REPLAYING → DELIVERED (2xx on replay)
REPLAYING → DEAD_LETTER (replay fails)
```

---

## 11. API Surface

### 11.1 New REST Endpoints (Sprint 28.1 - Billing)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/billing/status` | Session | Current subscription + usage summary |
| POST | `/api/billing/checkout` | Session (admin) | Initiate checkout session |
| POST | `/api/billing/portal` | Session (admin) | Generate customer portal URL |
| GET | `/api/billing/invoices` | Session (admin) | List billing invoices |
| GET | `/api/billing/usage` | Session | Current period usage breakdown |
| POST | `/api/webhooks/stripe` | Stripe Sig | Stripe webhook receiver |
| POST | `/api/webhooks/razorpay` | Razorpay Sig | Razorpay webhook receiver |
| POST | `/api/cron/billing-dunning` | Cron Secret | Process dunning queue |
| POST | `/api/cron/overage-calculation` | Cron Secret | Calculate and charge overages |

### 11.2 New REST Endpoints (Sprint 28.3 - SSO)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/saml/metadata` | Public | SP metadata XML |
| POST | `/api/auth/saml/acs` | Public (SAML assertion) | Assertion Consumer Service |
| GET | `/api/auth/oidc/authorize` | Session | Initiate OIDC flow |
| GET | `/api/auth/oidc/callback` | Public (auth code) | OIDC callback |
| POST | `/api/auth/sso/test` | Session (owner) | Test SSO configuration |

### 11.3 Public API v1 Endpoints (Sprint 28.4)

See Section 7.2.C for the full endpoint table.

---

## 12. Security Model

### 12.1 Authentication Hierarchy

```
Level 1: Public (no auth)
  - Marketing pages, help center, SAML/OIDC callbacks
  
Level 2: Token-authenticated (shared links)
  - Invoice view, payment proof, ticket submission
  
Level 3: Session-authenticated (logged in users)
  - All /app/* routes, requires valid Supabase session
  
Level 4: API Key authenticated (developer API)
  - All /api/v1/* routes, requires valid PublicApiToken
  
Level 5: Role-gated (permission checks)
  - Enforced by requirePermission("resource:action")
  
Level 6: Owner-only (destructive operations)
  - Delete org, change billing, configure SSO
```

### 12.2 Forensic Integrity (Phase 27 Foundation)

Phase 28 extends the SHA-256 hash-chain audit system:
- All billing events are hash-chained (BillingEvent → AuditLog)
- SSO login/logout events are chained
- Permission changes are chained
- API key creation/revocation is chained
- Webhook deliveries reference audit chain entries

### 12.3 PII Protection

| Data Category | Storage | Encryption | Retention | Access |
|--------------|---------|------------|-----------|--------|
| Payment methods | Gateway only (never stored) | N/A | N/A | N/A |
| SSO certificates | DB (idpCertificate) | AES-256-CBC | Until revoked | Owner only |
| OIDC secrets | DB (clientSecret) | AES-256-CBC | Until rotation | Owner only |
| API tokens | DB (tokenHash) | SHA-256 one-way | Until revoked | Creator only |
| Billing email | DB | At-rest (RDS) | Until account closed | Admin+ |
| Audit logs | DB | At-rest (RDS) | 7 years (compliance) | Admin+ |

### 12.4 IDOR Prevention Matrix

| Resource | Scoping Strategy | Validation Point |
|----------|-----------------|------------------|
| BillingAccount | `orgId` unique constraint | `requireRole("admin")` |
| SsoConfig | `orgId` unique constraint | `requireRole("owner")` |
| CustomRole | `orgId` in query + relation check | `requirePermission("user:update")` |
| MarketplaceTemplate | `publisherOrgId` on writes | Separate read (public) vs write (org-scoped) |
| PublicApiToken | `orgId` filter on all queries | `requireRole("admin")` |
| WebhookDeadLetter | `orgId` filter | `requireRole("admin")` |

---

## 13. Workflow Diagrams

### 13.1 Enterprise Onboarding Flow

```
Step 1: Owner signs up (email/Google)
    ↓
Step 2: Creates organization (name, slug, country)
    ↓
Step 3: Selects plan (trial auto-starts for paid plans)
    ↓
Step 4: Configures branding (logo, colors, fonts)
    ↓
Step 5: [Optional] Configures SSO
    ↓
    ├── SAML: Upload IdP metadata → Test connection → Enable
    └── OIDC: Enter issuer URL, client ID/secret → Test → Enable
    ↓
Step 6: [Optional] Sets data residency (locks after confirmation)
    ↓
Step 7: Invites team members (email or SSO auto-provision)
    ↓
Step 8: [Optional] Creates custom roles and assigns permissions
    ↓
Step 9: Dashboard — ready to create documents
```

### 13.2 Billing Overage Handling

```
CRON: overage-calculation (runs daily at 00:00 UTC)
    ↓
FOR EACH org on paid plan:
    ↓
    1. Query UsageRecord for current period
    2. Compare against plan limits (PlanLimits config)
    3. IF usage > included:
        a. Calculate overage units
        b. Calculate overage amount (units × rate)
        c. Upsert OverageLine record
        d. IF end of billing period:
            - Create BillingEvent (OVERAGE_CHARGED)
            - Charge via gateway (Stripe/Razorpay)
            - Generate billing invoice with overage line items
            - Email receipt to billing admin
    4. IF usage > 80% of limit:
        - Send usage warning notification (once per period)
    5. IF usage >= 100% AND plan === "free":
        - Block further usage of that resource
        - Show upgrade prompt in UI
```

### 13.3 Webhook Retry Flow

```
Event occurs (e.g., invoice.paid)
    ↓
1. Create WebhookDelivery (status: PENDING)
    ↓
2. Attempt HTTP POST to endpoint URL
    ↓
    ├── 2xx → Mark DELIVERED, done
    ├── 4xx → Mark FAILED (no retry, likely bad config)
    └── 5xx/timeout → Mark RETRYING, schedule next attempt
    ↓
3. Exponential backoff schedule (5m, 30m, 2h, 12h, 24h)
    ↓
4. After 6 failures:
    a. Create WebhookDeadLetter entry
    b. Mark delivery as DEAD_LETTERED
    c. Send notification to org admins
    d. Retain for 30 days
    ↓
5. Admin can "Replay" from dead letter queue
    a. Re-attempt delivery with original payload
    b. If success → remove from dead letter
    c. If failure → update attempt count, keep in dead letter
```

---

## 14. Non-Functional Requirements

### 14.1 Performance

| Metric | Requirement | Measurement |
|--------|-------------|-------------|
| API response time (P95) | < 200ms | CloudWatch + X-Ray |
| Page load (LCP) | < 1.5s | Lighthouse CI |
| Database query (P99) | < 100ms | RDS Performance Insights |
| Webhook delivery (P95) | < 5s from event | Custom metric |
| Billing checkout | < 3s to gateway redirect | Custom metric |
| SSO login (total flow) | < 4s | Custom metric |

### 14.2 Availability

| Component | Target | Strategy |
|-----------|--------|----------|
| Application | 99.9% (8.7h downtime/year) | Multi-AZ ECS + ALB health checks |
| Database | 99.95% | Multi-AZ RDS + auto-failover |
| Storage | 99.99% | S3 standard durability |
| API | 99.9% | Rate limiting + circuit breakers |

### 14.3 Scalability

| Dimension | Current Design Limit | Scaling Path |
|-----------|---------------------|--------------|
| Organizations | 100,000 | Partition by orgId |
| Documents per org | 1,000,000 | Indexed queries + pagination |
| Concurrent users | 10,000 | ECS auto-scale to 20 containers |
| API requests | 5,000/min per org | Redis token bucket |
| Storage | 1 TB per org (enterprise) | S3 unlimited |
| Webhook deliveries | 100/second | SQS queue + worker scaling |

### 14.4 Compliance

| Standard | Requirement | Sprint |
|----------|-------------|--------|
| GDPR | Data export, right to delete, consent | 28.3 (residency), 28.5 (polish) |
| SOC 2 Type II | Audit logging, access controls, encryption | 28.3 (RBAC), 28.5 (audit) |
| PCI DSS | Never store card data (gateway-delegated) | 28.1 (billing) |
| ISO 27001 | Information security management | 28.5 (BCP, incident response) |

---

## 15. Permission Matrix

### 15.1 Feature Access by Plan

| Feature | Free | Starter | Pro | Enterprise |
|---------|------|---------|-----|------------|
| Basic documents | ✅ | ✅ | ✅ | ✅ |
| Custom branding | ❌ | ✅ | ✅ | ✅ |
| Team members | 1 | 5 | 25 | Unlimited |
| Custom roles | ❌ | ❌ | ✅ | ✅ |
| SSO (SAML/OIDC) | ❌ | ❌ | ❌ | ✅ |
| Data residency | ❌ | ❌ | ❌ | ✅ |
| API access | ❌ | ✅ (read) | ✅ (full) | ✅ (full) |
| Marketplace publish | ❌ | ❌ | ✅ | ✅ |
| Webhook endpoints | 0 | 3 | 10 | 50 |
| Forensic audit | ❌ | ❌ | ❌ | ✅ |
| Flash reports | ❌ | ❌ | ❌ | ✅ |
| Executive hub | ❌ | ❌ | ✅ | ✅ |
| Cash flow optimizer | ❌ | ❌ | ✅ | ✅ |
| Global tax engine | ❌ | ❌ | ✅ | ✅ |
| AI forecasting | ❌ | ✅ (basic) | ✅ (pro) | ✅ (pro) |
| Priority support | ❌ | ❌ | ✅ | ✅ (dedicated) |
| SLA guarantee | ❌ | ❌ | 99.5% | 99.9% |

### 15.2 Role-Permission Matrix (System Roles)

| Permission | Owner | Admin | Member | Viewer |
|-----------|-------|-------|--------|--------|
| `invoice:create` | ✅ | ✅ | ✅ | ❌ |
| `invoice:read` | ✅ | ✅ | ✅ | ✅ |
| `invoice:send` | ✅ | ✅ | ✅ | ❌ |
| `invoice:delete` | ✅ | ✅ | ❌ | ❌ |
| `payment:approve` | ✅ | ✅ | ❌ | ❌ |
| `user:invite` | ✅ | ✅ | ❌ | ❌ |
| `user:delete` | ✅ | ❌ | ❌ | ❌ |
| `billing:update` | ✅ | ❌ | ❌ | ❌ |
| `settings:sso` | ✅ | ❌ | ❌ | ❌ |
| `audit_log:export` | ✅ | ✅ | ❌ | ❌ |
| `api_key:create` | ✅ | ✅ | ❌ | ❌ |
| `webhook:create` | ✅ | ✅ | ❌ | ❌ |
| `template:publish` | ✅ | ✅ | ❌ | ❌ |
| `role:create` | ✅ | ✅ | ❌ | ❌ |
| `data_residency:set` | ✅ | ❌ | ❌ | ❌ |

---

## 16. Business Rules & Edge Cases

### 16.1 Billing Rules

| Rule | Logic |
|------|-------|
| Plan downgrade | Effective at current period end; excess data retained 90 days |
| Plan upgrade | Immediate; prorated credit for remaining current period |
| Trial expiry | Auto-downgrade to Free if no payment method |
| Overage billing | Charged at period end (not real-time) |
| Refund policy | Within 7 days of charge; prorated thereafter |
| Currency lock | Cannot change billing currency after first payment |
| Gateway switch | Cannot switch between Stripe/Razorpay post-subscription |
| Tax calculation | Uses org's TaxConfig from Phase 27 for self-billing |

### 16.2 SSO Rules

| Rule | Logic |
|------|-------|
| Domain conflict | Same email domain cannot be configured by two orgs |
| Enforce SSO | When enabled, password login blocked for matching domains |
| Owner bypass | Org owner can always use password (emergency access) |
| Auto-provision | New users from IdP get `defaultRole`; no org-invite needed |
| De-provision | IdP group removal does NOT auto-remove user (manual step) |
| Certificate rotation | Old cert valid for 24h after new cert uploaded |
| Session binding | SSO session expires when IdP session expires (SLO) |

### 16.3 API Rules

| Rule | Logic |
|------|-------|
| Token scope | Cannot exceed permissions of the creating user's role |
| Version sunset | 12-month deprecation window; `Sunset` header added |
| Rate limit shared | All tokens in an org share the org-level rate limit pool |
| Idempotency | POST endpoints accept `Idempotency-Key` header (24h window) |
| Pagination | Cursor-based (`?after=cursor`); max 100 items per page |
| Webhook payload | Max 64 KB; larger payloads send reference URL only |

### 16.4 Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Payment fails during plan upgrade | Remain on current plan; show error |
| SSO IdP is unreachable | Show "IdP unavailable" error; owner can still use password |
| Webhook endpoint returns 301 redirect | Do NOT follow redirect; mark as client error |
| API token used after org deletion | 401 Unauthorized (token lookup fails) |
| Overage calculation during plan change | Use the higher limit (favor customer) |
| Two admins configure SSO simultaneously | Last-write-wins with optimistic locking (version field) |
| Rate limit hit during webhook delivery | Webhook delivery is not rate-limited (internal service) |
| User removes self from org via API | Block; self-removal requires UI confirmation |
| Enterprise downgrades with SSO active | SSO disabled on downgrade; users revert to password |

---

## 17. Test Plan (80+ Test Cases)

### 17.1 Billing Engine Tests (Sprint 28.1)

| # | Test Case | Type | Priority |
|---|-----------|------|----------|
| B-01 | Free plan user sees upgrade prompts, no billing controls | Integration | High |
| B-02 | Stripe checkout creates valid session for USD org | Unit | Critical |
| B-03 | Razorpay checkout creates valid subscription for INR org | Unit | Critical |
| B-04 | Gateway selection: IN/INR → Razorpay; US/USD → Stripe | Unit | Critical |
| B-05 | Webhook: `invoice.paid` updates subscription to ACTIVE | Integration | Critical |
| B-06 | Webhook: `payment_failed` transitions to PAST_DUE | Integration | Critical |
| B-07 | Dunning: retry at Day 1, 3, 7, 14 with correct delays | Unit | High |
| B-08 | Dunning: 6th failure cancels subscription | Unit | High |
| B-09 | Dunning: successful retry resets to ACTIVE | Unit | High |
| B-10 | Overage: PDF jobs exceeding limit calculates correct amount | Unit | High |
| B-11 | Overage: free tier blocks at 100% (hard limit) | Integration | Critical |
| B-12 | Overage: paid tier charges overage (soft limit) | Integration | High |
| B-13 | Usage warning sent at 80% threshold (once per period) | Unit | Medium |
| B-14 | Plan upgrade prorates correctly (mid-billing-cycle) | Unit | High |
| B-15 | Plan downgrade effective at period end (not immediate) | Unit | High |
| B-16 | BillingInvoice generated with correct GST for IN orgs | Unit | High |
| B-17 | Billing webhook idempotent (same event processed only once) | Integration | Critical |
| B-18 | Concurrent checkout attempts for same org (race condition) | Integration | High |
| B-19 | Subscription pause limits to 90 days max | Unit | Medium |
| B-20 | Cancelled org data retained for 90 days then purged | Unit | Medium |

### 17.2 AWS Infrastructure Tests (Sprint 28.2)

| # | Test Case | Type | Priority |
|---|-----------|------|----------|
| A-01 | ECS task starts and passes health check within 30s | E2E | Critical |
| A-02 | Auto-scaling triggers at CPU > 70% for 60s | Load | High |
| A-03 | Auto-scaling down when CPU < 30% for 300s | Load | Medium |
| A-04 | RDS failover completes within 120s | DR | Critical |
| A-05 | S3 cross-region replication lag < 15 minutes | DR | High |
| A-06 | CloudFront cache invalidation propagates within 60s | E2E | Medium |
| A-07 | Blue/green deployment zero-downtime cutover | E2E | Critical |
| A-08 | ECS rollback on health check failure | E2E | Critical |
| A-09 | Database connection pool handles 200 concurrent connections | Load | High |
| A-10 | Worker processes SQS messages within 5s (P95) | Integration | High |
| A-11 | Cron task fires within 60s of schedule | Integration | High |
| A-12 | Secrets Manager rotation doesn't cause downtime | Integration | High |
| A-13 | WAF blocks >1000 req/min from single IP | Security | High |
| A-14 | S3 bucket denies public access (explicit block) | Security | Critical |
| A-15 | RDS not accessible from public internet | Security | Critical |

### 17.3 SSO/RBAC Tests (Sprint 28.3)

| # | Test Case | Type | Priority |
|---|-----------|------|----------|
| S-01 | SAML SP metadata XML is valid and downloadable | Unit | Critical |
| S-02 | SAML assertion with valid signature creates session | Integration | Critical |
| S-03 | SAML assertion with invalid signature is rejected | Integration | Critical |
| S-04 | SAML assertion with expired timestamp is rejected | Unit | High |
| S-05 | OIDC code exchange produces valid tokens | Integration | Critical |
| S-06 | OIDC id_token with invalid signature is rejected | Integration | Critical |
| S-07 | OIDC PKCE: code_verifier mismatch fails | Unit | High |
| S-08 | Auto-provision creates user with correct default role | Integration | High |
| S-09 | SSO enforce blocks password login for matching domains | Integration | Critical |
| S-10 | Owner can still use password when SSO is enforced | Integration | Critical |
| S-11 | IdP group → role mapping applies on login | Integration | High |
| S-12 | Custom role with "invoice:create" allows invoice creation | Integration | High |
| S-13 | Custom role without "invoice:send" blocks sending | Integration | High |
| S-14 | Permission inheritance from parent role works | Unit | Medium |
| S-15 | Cannot create role with more permissions than own role | Unit | High |
| S-16 | Role deletion reassigns members to default role | Integration | Medium |
| S-17 | Data residency lock prevents region change | Unit | High |
| S-18 | Cross-region API call blocked for locked org | Integration | High |
| S-19 | Certificate rotation: old cert valid for 24h | Unit | Medium |
| S-20 | Domain conflict: same domain in two orgs blocked | Unit | High |

### 17.4 API Platform Tests (Sprint 28.4)

| # | Test Case | Type | Priority |
|---|-----------|------|----------|
| P-01 | API key with "invoices:read" can GET /v1/invoices | Integration | Critical |
| P-02 | API key without "invoices:write" gets 403 on POST | Integration | Critical |
| P-03 | Rate limit returns 429 with correct headers | Integration | Critical |
| P-04 | Rate limit resets after window expires | Integration | High |
| P-05 | Expired API token returns 401 | Unit | High |
| P-06 | Revoked API token returns 401 | Unit | High |
| P-07 | API pagination: cursor-based, max 100 items | Integration | High |
| P-08 | Idempotency-Key prevents duplicate resource creation | Integration | High |
| P-09 | Webhook signature validates correctly | Unit | Critical |
| P-10 | Webhook retry follows exponential backoff schedule | Unit | High |
| P-11 | Webhook 4xx response: no retry (immediate failure) | Unit | High |
| P-12 | Webhook 6 failures → dead letter queue | Integration | High |
| P-13 | Dead letter replay delivers successfully | Integration | Medium |
| P-14 | Dead letter expires after 30 days | Unit | Low |
| P-15 | Template marketplace: publish requires Pro+ plan | Integration | High |
| P-16 | Template review: invalid schema rejected | Unit | High |
| P-17 | Template install increments installCount atomically | Unit | Medium |
| P-18 | Template rating: one review per org per template | Unit | Medium |
| P-19 | API version header in response matches request | Unit | Medium |
| P-20 | OpenAPI spec valid and matches actual endpoints | E2E | High |

### 17.5 Launch Hardening Tests (Sprint 28.5)

| # | Test Case | Type | Priority |
|---|-----------|------|----------|
| L-01 | Lighthouse score ≥ 95 on /app/home | Performance | Critical |
| L-02 | Lighthouse score ≥ 90 on /app/intel/executive | Performance | High |
| L-03 | LCP < 1.5s on dashboard (cold start) | Performance | Critical |
| L-04 | CLS < 0.05 on all core pages | Performance | High |
| L-05 | Bundle size < 300KB (first load JS) | Performance | High |
| L-06 | No XSS via user-controlled fields (template name, etc.) | Security | Critical |
| L-07 | No SQL injection via Prisma (parameterized) | Security | Critical |
| L-08 | SSRF blocked in webhook URL validation | Security | Critical |
| L-09 | CSP headers present and correct | Security | High |
| L-10 | Rate limit cannot be bypassed with IP rotation | Security | High |
| L-11 | Session fixation not possible | Security | High |
| L-12 | Token replay not possible (single-use for sensitive ops) | Security | High |
| L-13 | Help center content renders correctly | E2E | Medium |
| L-14 | BCP runbook: database failover test passes | DR | High |
| L-15 | BCP runbook: deployment rollback test passes | DR | High |

---

## 18. Branching & PR Strategy

### 18.1 Branch Hierarchy

```
master (production)
└── feature/phase-28 (phase integration branch)
    ├── feature/phase-28-sprint-28-1 (billing)
    ├── feature/phase-28-sprint-28-2 (AWS infrastructure)
    ├── feature/phase-28-sprint-28-3 (SSO/RBAC)
    ├── feature/phase-28-sprint-28-4 (API platform)
    └── feature/phase-28-sprint-28-5 (hardening)
```

### 18.2 Workflow Rules

| Rule | Enforcement |
|------|-------------|
| Sprint branches created from `feature/phase-28` | Manual (engineer) |
| PRs target `feature/phase-28` (NOT master) | GitHub branch protection |
| Each sprint = one PR | Code review required |
| CI must pass (lint + build + test) | GitHub Actions check |
| At least one approval required | Branch protection rule |
| No force-push to `feature/phase-28` | Branch protection |
| Final merge to master only after full audit | Manual (CTO approval) |

### 18.3 Commit Convention

```
feat(billing): implement Stripe checkout adapter
fix(sso): validate SAML assertion timestamp
test(api): add rate limiter unit tests
infra(aws): add ECS Fargate Terraform module
docs(runbook): add database failover procedure
perf(dashboard): lazy-load Recharts components
security(webhook): prevent SSRF in endpoint URL validation
```

### 18.4 CI/CD Pipeline

```yaml
# .github/workflows/phase-28-ci.yml
on:
  pull_request:
    branches: [feature/phase-28]

jobs:
  lint:     # ESLint + Prettier
  typecheck: # tsc --noEmit
  test:     # Vitest (unit + integration)
  build:    # next build (standalone)
  e2e:      # Playwright (critical paths)
  security: # Semgrep + npm audit
  lighthouse: # Lighthouse CI (Sprint 28.5 only)
```

---

## 19. Migration Runbook

### 19.1 Database Migration Strategy

```
1. Create migration files via: npx prisma migrate dev --name phase28_sprint_N
2. Review generated SQL for correctness
3. Test migration on staging database clone
4. Run on production during low-traffic window (02:00-04:00 IST)
5. Verify with: SELECT count(*) FROM new_tables
6. Rollback plan: Keep previous migration state in git; apply --down if needed
```

### 19.2 Feature Flag Strategy

All Phase 28 features should be behind feature flags during rollout:

| Flag | Default | Enables |
|------|---------|---------|
| `billing_v2` | false | Dual-gateway billing engine |
| `aws_infra` | false | AWS-routed requests (canary) |
| `sso_saml` | false | SAML SSO configuration UI |
| `sso_oidc` | false | OIDC SSO configuration UI |
| `custom_rbac` | false | Custom role creation |
| `api_v1_public` | false | Public API endpoints |
| `marketplace` | false | Template marketplace |
| `data_residency` | false | Region selection UI |

Flags managed via `src/lib/feature-flags.ts` (environment variables + DB override per org).

---

## 20. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R-01 | Stripe/Razorpay webhook delivery failure | Medium | Critical | Idempotent processing + dead letter + alerting |
| R-02 | AWS migration causes downtime | Medium | Critical | Blue/green + DNS failover + rollback plan |
| R-03 | SSO misconfiguration locks out org | Low | High | Owner password bypass + admin recovery |
| R-04 | Rate limiter Redis failure | Low | High | Graceful degradation (allow requests) |
| R-05 | Overage calculation error overcharges | Low | Critical | Daily reconciliation job + manual review |
| R-06 | Cross-region data leak (residency violation) | Very Low | Critical | Middleware enforcement + audit verification |
| R-07 | Marketplace template contains malicious content | Medium | Medium | Automated validation + manual review queue |
| R-08 | API version sunset breaks integrations | Medium | Medium | 12-month window + deprecation headers + docs |
| R-09 | Performance regression post-AWS migration | Medium | High | Parallel run + gradual traffic shift |
| R-10 | Billing dunning sends excessive emails | Low | Medium | Frequency cap + unsubscribe option per channel |

---

## 21. Success Metrics

### 21.1 Launch Readiness Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| All 80+ test cases passing | 100% | CI pipeline |
| Lighthouse score (core pages) | ≥ 95 | Lighthouse CI |
| Security audit findings (Critical/High) | 0 open | Pen-test report |
| API documentation coverage | 100% of endpoints | OpenAPI validation |
| DR test (database failover) | < 2 min RTO | Quarterly drill |
| Billing accuracy (reconciliation) | 100% | Daily cron check |
| SSO login success rate | > 99% | Monitoring dashboard |
| Webhook delivery success rate | > 99.5% | Dead letter queue depth |

### 21.2 Post-Launch KPIs (30 days)

| KPI | Target | Source |
|-----|--------|--------|
| Paid conversion rate | > 5% of active orgs | Billing events |
| Enterprise plan adoption | > 2% of paid orgs | Subscription data |
| SSO configuration success | > 90% (first attempt) | SSO events |
| API key creation | > 10% of Pro+ orgs | Token creation logs |
| Marketplace template installs | > 100 total | Install events |
| Mean payment failure resolution | < 7 days | Dunning metrics |
| Customer support tickets (billing) | < 5% of subscribers | Ticket data |
| P95 API latency | < 200ms | CloudWatch |

---

## 22. Acceptance Criteria

### 22.1 Sprint 28.1 Done When:

- [ ] Dual-gateway (Stripe + Razorpay) checkout creates subscriptions
- [ ] Webhook handlers process payments idempotently
- [ ] Metered billing tracks usage for all 5 resource types
- [ ] Overage calculation and charging works for paid tiers
- [ ] Free tier hard-blocks at 100% usage
- [ ] Dunning retries on correct schedule (Day 1, 3, 7, 14, 30)
- [ ] Tax-inclusive billing invoices generated on payment
- [ ] 20 billing test cases passing

### 22.2 Sprint 28.2 Done When:

- [ ] Terraform/CDK provisions all AWS resources
- [ ] Dockerfile builds standalone Next.js image
- [ ] ECS Fargate runs web + worker + cron services
- [ ] RDS Multi-AZ failover tested and < 2 min RTO
- [ ] S3 cross-region replication configured
- [ ] CloudFront serves static assets globally
- [ ] CI/CD deploys to ECS via GitHub Actions
- [ ] Migration runbook documented and tested
- [ ] 15 infrastructure test cases passing

### 22.3 Sprint 28.3 Done When:

- [ ] SAML 2.0 SP-initiated login works with Okta/Azure AD
- [ ] OIDC authorization code + PKCE flow works
- [ ] SSO enforce blocks password login (except owner)
- [ ] Auto-provision creates users from IdP
- [ ] IdP group → role mapping functional
- [ ] Custom roles with granular permissions enforceable
- [ ] Data residency selection and locking works
- [ ] 20 SSO/RBAC test cases passing

### 22.4 Sprint 28.4 Done When:

- [ ] Public API v1 serves 14+ endpoints with correct auth
- [ ] Rate limiting enforces tier-based limits with proper 429 responses
- [ ] API tokens scoped correctly (cannot exceed creator's permissions)
- [ ] OpenAPI 3.1 spec auto-generated and valid
- [ ] Webhook retry engine delivers with exponential backoff
- [ ] Dead letter queue captures failures after 6 attempts
- [ ] Template marketplace allows publish/install/review
- [ ] 20 API platform test cases passing

### 22.5 Sprint 28.5 Done When:

- [ ] Lighthouse ≥ 95 on /app/home, /app/docs/invoices, /pricing
- [ ] Lighthouse ≥ 90 on /app/intel/executive (data-heavy)
- [ ] First-load JS bundle < 300KB
- [ ] OWASP ZAP scan: 0 Critical/High findings
- [ ] Semgrep: 0 Critical/High findings
- [ ] All runbooks tested (DB failover, rollback, billing incident)
- [ ] Help center content covers all core user journeys
- [ ] CSP, HSTS, X-Frame-Options headers present
- [ ] 15 launch hardening test cases passing

### 22.6 Phase 28 Complete When:

- [ ] All 5 sprint acceptance criteria met
- [ ] All 80+ test cases passing in CI
- [ ] `npm run build` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] Security audit report: 0 unresolved Critical/High
- [ ] Performance: Lighthouse 95+ on core pages
- [ ] Documentation: API docs, runbooks, help center complete
- [ ] Final PR merged to master with CTO approval

---

## Appendix A: Dependency Map

```
Sprint 28.1 (Billing) ──────── No dependencies (can start immediately)
                                    │
Sprint 28.2 (AWS) ──────────── Depends on 28.1 (billing webhooks need infra)
                                    │
Sprint 28.3 (SSO/RBAC) ────── Depends on 28.2 (needs AWS Secrets Manager)
                                    │
Sprint 28.4 (API Platform) ── Depends on 28.1 (rate limits use billing tier)
                               Depends on 28.3 (API tokens need RBAC)
                                    │
Sprint 28.5 (Hardening) ───── Depends on ALL previous (final polish)
```

---

## Appendix B: External Service Dependencies

| Service | Purpose | Env Vars Required |
|---------|---------|-------------------|
| Stripe | International billing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Razorpay | India billing | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| AWS (ECS, RDS, S3, CloudFront) | Infrastructure | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` |
| Resend | Transactional email | `RESEND_API_KEY` |
| Sentry | Error monitoring | `SENTRY_DSN` |
| Upstash Redis | Rate limiting, caching | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| PostHog | Analytics | `POSTHOG_KEY` |

---

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| BCP | Business Continuity Plan |
| DR | Disaster Recovery |
| IdP | Identity Provider (e.g., Okta, Azure AD) |
| SP | Service Provider (Slipwise in SAML context) |
| OIDC | OpenID Connect |
| SAML | Security Assertion Markup Language |
| PKCE | Proof Key for Code Exchange |
| IDOR | Insecure Direct Object Reference |
| RTO | Recovery Time Objective |
| RPO | Recovery Point Objective |
| LCP | Largest Contentful Paint |
| CLS | Cumulative Layout Shift |
| SLO | Single Logout |
| WAF | Web Application Firewall |
| ALB | Application Load Balancer |
| ECS | Elastic Container Service |

---

*End of Document*

**Document Hash:** SHA-256 of content above serves as integrity reference.  
**Next Action:** Engineering team creates `feature/phase-28` from current `master` and begins Sprint 28.1.
