# Phase 22 PRD - Slipwise One
## Client Experience OS

**Version:** 1.0  
**Date:** 2026-04-15  
**Prepared by:** Codex Engineering Assistant  
**Parent Company:** Zenxvio  
**Product:** Slipwise One  
**Primary suite:** Client Experience OS  
**Supporting suites:** SW Docs, SW Pay, SW Flow, SW Intel, SW Auth and Access, Partner OS, Enterprise Settings  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Source Context](#2-source-context)
3. [Current State After Phase 21](#3-current-state-after-phase-21)
4. [Phase 22 Objectives and Non-Goals](#4-phase-22-objectives-and-non-goals)
5. [Operating Principles](#5-operating-principles)
6. [Sprint 22.1 - Client Experience Foundation and Access Governance](#6-sprint-221---client-experience-foundation-and-access-governance)
7. [Sprint 22.2 - Unified Client Portal Workspace](#7-sprint-222---unified-client-portal-workspace)
8. [Sprint 22.3 - Secure Share Center and Recipient Collaboration](#8-sprint-223---secure-share-center-and-recipient-collaboration)
9. [Sprint 22.4 - Branded Enterprise Client Experience](#9-sprint-224---branded-enterprise-client-experience)
10. [Sprint 22.5 - Portal Intelligence, Security Hardening, and Release Readiness](#10-sprint-225---portal-intelligence-security-hardening-and-release-readiness)
11. [Data Model Concepts](#11-data-model-concepts)
12. [Route Map](#12-route-map)
13. [API and Server Action Surface](#13-api-and-server-action-surface)
14. [Background Jobs and Operational Workflows](#14-background-jobs-and-operational-workflows)
15. [Permissions, Plan Gates, and Tenant Boundaries](#15-permissions-plan-gates-and-tenant-boundaries)
16. [Security and Privacy Requirements](#16-security-and-privacy-requirements)
17. [Edge Cases and Acceptance Criteria](#17-edge-cases-and-acceptance-criteria)
18. [Test Plan](#18-test-plan)
19. [Non-Functional Requirements](#19-non-functional-requirements)
20. [Environment Variables and External Dependencies](#20-environment-variables-and-external-dependencies)
21. [Risk Register](#21-risk-register)
22. [Branch Strategy and PR Workflow](#22-branch-strategy-and-pr-workflow)

---

## 1. Executive Summary

Phase 22 turns Slipwise One's external customer-facing layer into a coherent **Client Experience OS**.

By this phase, Slipwise One already has:

- saved invoices, quotes, vouchers, salary slips, and document vault behavior
- receivables, payment proof, dunning, payment links, payment arrangements, and customer statements
- portal routes for customer login, dashboard, invoices, statements, profile, tickets, and logout
- public share routes for shared documents
- customer portal token and access-log models
- enterprise settings for custom domains, white-label controls, and email/domain governance
- Partner OS and marketplace/enterprise foundations from Phase 20
- SW Intel intelligence and AI governance from Phase 21

However, external customer experience is still fragmented:

- customer portal, public invoice links, public share links, tokenized ticket links, and shared documents are not one governed product layer
- portal settings are minimal and do not yet provide enterprise-grade branding, access policy, analytics, or health controls
- share links track counts but do not provide a full recipient collaboration lifecycle
- portal access logs exist, but there is no complete admin control center for customer access, session revocation, suspicious activity, or recipient behavior
- customer-facing flows do not yet feel like a premium, branded, enterprise-ready client workspace
- external activity does not consistently feed back into SW Pay, SW Flow, SW Docs, SW Intel, and audit surfaces

Phase 22 solves that by creating a unified external experience layer that customers, clients, recipients, and tenant admins can trust.

### Strategic outcome

By the end of Phase 22, Slipwise One should support this operating model:

1. A tenant can enable a branded customer portal and confidently invite customers to self-serve.
2. Customers can access invoices, quotes, statements, tickets, payments, proof uploads, profile data, preferences, and shared documents from one secure workspace.
3. Tenants can create secure share links and bundles with expiry, revocation, recipient tracking, download controls, and branding rules.
4. Enterprise tenants can operate a white-label client experience with custom-domain readiness and support routing.
5. Client activity becomes visible to admins and SW Intel without leaking customer data or weakening token security.

### Business value

| Problem today | Phase 22 outcome |
| --- | --- |
| External links and portal flows are scattered | One governed Client Experience OS |
| Customers depend on email threads for follow-up | Self-service portal with invoices, statements, tickets, and payments |
| Share links are basic | Secure share center with lifecycle, recipient tracking, and revocation |
| Enterprise branding is partial | Branded client workspace with white-label/custom-domain readiness |
| Portal activity is hard to govern | Admin controls, access logs, health checks, and SW Intel signals |

### Why this phase now

Phase 21 makes Slipwise smarter internally. Phase 22 should make the customer-facing side of the product equally mature.

The master plan explicitly calls for customer payment interaction, public link behavior, customer tickets, statements, payment proof, and secure external collaboration. Earlier phases created pieces of this capability, but Phase 22 turns those pieces into a cohesive product system.

---

## 2. Source Context

This PRD is grounded in current repo and roadmap context.

### Required graph context

- `graphify-out/GRAPH_REPORT.md` reports 2615 nodes, 2591 edges, and 755 communities.
- `graphify-out/wiki/index.md` exists and was used as the navigation layer.
- No root `CONTEXT.md` was present during planning.

### Primary roadmap sources

- `docs/Master Plan/SLIPWISE ONE Master PRD v1.1.txt`
- `docs/PRD/PHASE_20_PRD.md`
- `docs/PRD/PHASE_21_PRD.md`
- earlier PRDs covering Phase 11 sharing, Phase 14 customer portal, Phase 18 portal collaboration, Phase 19 SW Docs, and Phase 20 enterprise/ecosystem work

### Current implementation evidence

The current repo already contains:

- `src/app/portal/[orgSlug]`
- `src/app/portal/[orgSlug]/auth/login`
- `src/app/portal/[orgSlug]/auth/verify`
- `src/app/portal/[orgSlug]/dashboard`
- `src/app/portal/[orgSlug]/invoices`
- `src/app/portal/[orgSlug]/invoices/[id]`
- `src/app/portal/[orgSlug]/statements`
- `src/app/portal/[orgSlug]/tickets`
- `src/app/portal/[orgSlug]/tickets/[ticketId]`
- `src/app/portal/[orgSlug]/profile`
- `src/app/share/[docType]/[token]`
- `src/app/app/settings/portal`
- `src/lib/portal-auth.ts`
- `src/lib/document-sharing.ts`
- `src/lib/customer-statements.ts`
- `CustomerPortalToken`
- `CustomerPortalAccessLog`
- `CustomerStatement`
- `SharedDocument`
- `OrgDomain`
- `OrgWhiteLabel`
- plan limits for customer portal and portal custom domain

### Baseline caution

At the time this PRD was created, the local worktree contained active Phase 20 remediation work. Phase 22 implementation must not start from this dirty local state. Engineering must start from a clean, verified baseline after Phase 21 is complete and merged or after an explicit baseline decision is documented.

---

## 3. Current State After Phase 21

Phase 22 assumes Phase 21 has been completed, reviewed, and merged into the selected baseline.

### Existing external experience capabilities

Slipwise One already has:

- customer magic-link login
- portal session cookie
- customer dashboard
- customer invoice list and invoice detail
- payment initiation from portal invoice detail
- customer statement generation/history
- profile update surface
- ticket list/detail/reply behavior
- portal attachment handling
- portal access logging
- portal settings for enablement, header message, support email, and support phone
- shared document token links
- shared document view/download counters
- customer portal plan gates in plan config

### Current gaps

| Existing capability | Current gap |
| --- | --- |
| Portal routes | not yet a unified client workspace with complete external action history |
| Portal settings | limited branding, access policy, and enterprise governance |
| Portal tokens | token/session lifecycle needs stronger admin visibility and revocation controls |
| Access logs | not surfaced as a complete security/analytics layer |
| SharedDocument | basic token/count model, no full share lifecycle or recipient collaboration |
| Customer statements | present, but not fully integrated into a branded external workspace and admin center |
| Tickets | portal support exists, but needs stronger customer-facing collaboration and internal routing |
| White-label/custom domain | foundations exist, but not unified into client experience readiness |
| SW Intel | Phase 22 should feed safe client-experience signals into insights without introducing new AI scope |

### Architecture rules Phase 22 must preserve

Phase 22 must stay consistent with the established architecture:

- Next.js App Router
- Prisma-backed modular monolith
- server actions in `actions.ts`
- existing auth and org context for internal users
- portal-specific session model for external customers
- token hashes rather than raw token storage
- explicit org/customer scoping on every portal query
- audit logs for sensitive tenant-side actions
- access logs for customer-side reads/actions
- plan gates for paid external experience features
- no broad rewrite of SW Pay, SW Flow, SW Docs, SW Intel, or enterprise settings

---

## 4. Phase 22 Objectives and Non-Goals

### Objectives

| ID | Objective | Sprint |
| --- | --- | --- |
| O1 | Normalize external access governance across portal sessions, public invoice tokens, and shared document links | 22.1 |
| O2 | Create a tenant admin control plane for client access, portal status, revocation, and activity visibility | 22.1 |
| O3 | Upgrade the customer portal into a complete client workspace | 22.2 |
| O4 | Support quote acceptance, invoice/payment/proof workflows, statements, tickets, profile, and preferences from the portal | 22.2 |
| O5 | Build a secure share center for document links, bundles, recipients, expiry, revocation, and download tracking | 22.3 |
| O6 | Add recipient collaboration behavior without requiring full customer portal login where appropriate | 22.3 |
| O7 | Formalize branded and white-label client experience readiness | 22.4 |
| O8 | Add custom-domain, email identity, and support-routing health checks for external experience | 22.4 |
| O9 | Add portal analytics, security hardening, release readiness, and SW Intel signal integration | 22.5 |

### Non-goals

Phase 22 does not include:

1. Replacing internal Slipwise user auth with customer portal auth.
2. Turning customers into full tenant users.
3. A broad CRM product.
4. A full helpdesk product beyond invoice/document/customer collaboration.
5. A mobile-native app.
6. New payment gateway architecture beyond existing payment link/provider boundaries.
7. Automated collections decisions without tenant approval.
8. New AI model work beyond consuming Phase 21 insight signals.
9. Replacing Partner OS.
10. Replacing OAuth/webhook/developer portal foundations.
11. Public editing access to tenant-owned source documents.
12. Cross-customer shared workspaces.

---

## 5. Operating Principles

### Product principles

1. The customer-facing experience must feel like one product, not unrelated links.
2. External users should see only what is explicitly intended for them.
3. Tenant admins must be able to revoke access quickly.
4. Every external action should feed back into the tenant's operational workflow.
5. Branded client experience should be premium but not fragile.
6. Public share links should be useful without weakening portal security.
7. Portal defaults should be safe and conservative.

### Engineering principles

1. Portal auth and tenant auth remain separate.
2. All external access must filter by org and customer or recipient scope.
3. Raw tokens must not be stored.
4. Link expiry and revocation must be enforceable server-side.
5. Portal and share access must be logged.
6. Attachment and proof uploads must be validated server-side.
7. External actions must call existing domain services rather than duplicating business logic.
8. Plan limits and feature gates must be enforced in backend code, not only in UI.

### UX principles

1. Customers should understand what action is expected from them.
2. Portal pages must be simple, responsive, and accessible.
3. Error states must avoid leaking whether an email/customer exists.
4. Shared documents must clearly show expiry, sender identity, and branding.
5. Enterprise branding must not hide trust/security cues.
6. Customer activity should be visible to tenant admins without exposing unnecessary technical detail.

---

## 6. Sprint 22.1 - Client Experience Foundation and Access Governance

**Goal:** Normalize external access across customer portal sessions, public invoice links, and shared document links, then give tenant admins a real access control center.

### Current gap

External access exists in several forms:

- portal magic-link tokens
- portal session cookies
- public invoice tokens
- shared document tokens
- ticket links and portal ticket access

These are not yet governed as one external access surface. Admins need better visibility, token/session controls, revocation paths, and policy settings.

### Roles

| Role | Needs |
| --- | --- |
| Tenant owner/admin | Enable portal, control external access, revoke sessions, review activity |
| Finance manager | Manage invoice/payment customer access |
| Operations manager | Monitor customer tickets and support activity |
| Customer | Access only their own records safely |
| Platform admin | Diagnose portal security and configuration issues |

### Required product behavior

Create a Client Experience admin center that allows tenant admins to:

- view portal status
- enable/disable portal
- view portal URL
- view active/recent customer portal sessions or token records
- revoke a single customer portal access
- revoke all portal access
- view portal access logs
- filter access logs by customer, action, date, path, and status
- view share-link activity summary
- see external access health warnings
- configure baseline portal policies

### External access policy

Phase 22 must define an org-level external access policy that covers:

- portal enabled/disabled
- allowed customer actions
- magic-link expiry
- session expiry
- token refresh behavior
- proof upload enabled/disabled
- ticket creation enabled/disabled
- statement generation enabled/disabled
- quote acceptance enabled/disabled
- share link default expiry
- download tracking
- watermark/branding policy
- support contact defaults

These settings may live in existing org defaults or a new model. The important requirement is one documented policy layer rather than scattered per-feature assumptions.

### Access lifecycle

Portal access must support explicit states:

- `REQUESTED`
- `ISSUED`
- `VERIFIED`
- `ACTIVE`
- `EXPIRED`
- `REVOKED`
- `LOCKED`

Share links must support explicit states:

- `ACTIVE`
- `EXPIRED`
- `REVOKED`
- `DISABLED_BY_POLICY`

Existing models may be extended or wrapped by service functions. The implementation must avoid loose state inference that differs between routes.

### Required admin surfaces

New or upgraded surfaces:

- `/app/settings/portal`
- `/app/settings/portal/access`
- `/app/settings/portal/activity`
- `/app/settings/portal/policies`

### Required backend behavior

The access foundation must:

- hash tokens before storage
- use timing-safe comparisons for token verification
- avoid email/customer enumeration
- enforce portal disabled state on every portal request
- enforce token revocation on every portal request
- filter all portal data by `orgId` and `customerId`
- log meaningful access events
- provide tenant-side revocation actions
- rate-limit magic-link requests with production-safe storage or a documented adapter path

The current in-memory magic-link rate limit is not sufficient as a production-grade policy for serverless deployments. Phase 22 should replace it with the existing rate-limit infrastructure or a durable rate-limit adapter.

### Acceptance criteria

- Tenant admin can enable/disable portal from one settings area.
- Tenant admin can revoke access for one customer.
- Tenant admin can revoke all active portal sessions/tokens.
- Portal disabled state blocks all customer portal access.
- Token revocation takes effect on the next request.
- Magic-link requests do not reveal whether a customer email exists.
- Portal access logs are visible and filterable.
- All portal reads filter by org and customer.
- Tests cover expired, revoked, disabled, malformed, and cross-org token cases.

---

## 7. Sprint 22.2 - Unified Client Portal Workspace

**Goal:** Upgrade the existing customer portal into a complete client workspace.

### Current gap

The portal already has pages for dashboard, invoices, statements, tickets, and profile. Phase 22 should make those flows coherent, action-oriented, branded, and connected to tenant workflows.

### Roles

| Role | Needs |
| --- | --- |
| Customer billing contact | View invoices, pay, upload proof, download statements |
| Customer operations contact | Raise and track tickets/questions |
| Customer decision-maker | Review and accept quotes |
| Tenant finance manager | See customer actions reflected in receivables |
| Tenant support operator | Respond to customer tickets from internal queues |

### Required portal modules

The unified portal must include:

1. Dashboard
   - open invoices
   - overdue invoices
   - pending proof review
   - active payment arrangements
   - recent tickets
   - recent shared documents
   - latest statements
   - required actions

2. Invoices
   - list
   - status filters
   - detail
   - PDF/download link where allowed
   - Pay Now where plan/provider/policy allows
   - proof upload where policy allows
   - payment history
   - arrangement schedule display if applicable
   - ticket/question creation from invoice

3. Quotes
   - list received quotes
   - detail
   - accept quote
   - reject quote with reason
   - ask question
   - converted invoice link when available

4. Statements
   - generate statement for allowed date range
   - download generated statement
   - view history
   - clear status if generation is queued

5. Tickets
   - create ticket
   - reply to ticket
   - upload attachments
   - view ticket status
   - distinguish internal versus customer-visible replies

6. Shared documents
   - list documents shared with the customer
   - view allowed documents
   - download where allowed
   - see expiry/revocation state

7. Profile and preferences
   - customer contact details
   - communication preferences
   - dunning/reminder preference where allowed
   - security/session information

### Required portal navigation

The portal should have a simple navigation structure:

- Dashboard
- Invoices
- Quotes
- Statements
- Support
- Shared Documents
- Profile

Navigation may hide modules disabled by policy or plan.

### Required portal action behavior

Portal actions must call existing domain logic:

- payment initiation should use existing payment link/public invoice token services
- proof upload should use existing proof validation and review flows
- ticket creation/reply should use existing ticket models and Flow/notification hooks
- statement generation should use existing customer statement logic
- quote acceptance should use existing quote conversion logic and plan limits

No portal action should create a duplicate business path with different validation.

### Required internal feedback

Customer portal actions must appear internally:

- proof uploaded -> receivables/proof review queue
- quote accepted/rejected -> quote timeline and invoice conversion flow
- ticket created/replied -> Flow/ticket queues and notifications
- statement generated -> customer statement history
- invoice viewed -> invoice timeline or access log where appropriate
- payment initiated -> invoice/payment timeline where appropriate

### Acceptance criteria

- Customer can log in and see a coherent dashboard.
- Customer can view only their own invoices.
- Customer can initiate payment only when allowed by plan, policy, and invoice state.
- Customer can upload proof with server-side validation.
- Customer can generate/download statements within policy limits.
- Customer can create and reply to support tickets.
- Customer can accept/reject quotes if quote module and policy allow.
- All actions are reflected internally with audit/access records.
- Portal pages work on mobile and desktop.
- Portal pages meet WCAG 2.1 AA expectations for core flows.

---

## 8. Sprint 22.3 - Secure Share Center and Recipient Collaboration

**Goal:** Turn basic public share links into a governed, trackable, secure sharing system.

### Current gap

The existing `SharedDocument` model has a token, expiry, view count, download count, and creator. That is useful but not enough for enterprise-grade external collaboration.

### Roles

| Role | Needs |
| --- | --- |
| Tenant user | Share documents securely with recipients |
| Tenant admin | Review and revoke shared documents |
| Recipient | View/download intended documents without full tenant access |
| Finance manager | Track whether customer saw invoice/statement documents |
| Support operator | Share ticket-related documents safely |

### Required product behavior

Create a Secure Share Center that supports:

- create share link
- set expiry
- set download allowed/disallowed
- set recipient email/name where known
- require recipient email verification when configured
- revoke share link
- view share activity
- copy link
- resend link
- show branding/watermark policy
- create document bundle
- see all active/expired/revoked shares

### Supported share targets

Phase 22 should support sharing:

- invoices
- quotes
- vouchers where tenant policy allows
- salary slips only if explicitly enabled and with stricter policy
- PDFs generated from document exports
- customer statements
- attachments where tenant policy allows
- document bundles containing multiple allowed documents

Salary slips are sensitive. They must default to disabled for generic public sharing unless a stricter recipient-auth policy is implemented.

### Share lifecycle

Share links must support:

- `ACTIVE`
- `EXPIRED`
- `REVOKED`
- `DISABLED_BY_POLICY`

Share activity must capture:

- viewed
- downloaded
- expired
- revoked
- recipient verified
- failed verification
- blocked by policy

### Recipient collaboration modes

Phase 22 should support two recipient modes:

1. Public secure link
   - token-based access
   - expiry and revocation
   - safe for low/medium sensitivity documents

2. Verified recipient link
   - token plus email verification or portal session
   - required for sensitive documents and enterprise policy
   - supports recipient-specific tracking

### Required internal surfaces

New or upgraded surfaces:

- `/app/docs/shares`
- `/app/docs/shares/[shareId]`
- share controls on document detail pages
- portal shared documents page
- admin portal activity views

### Required public surfaces

New or upgraded surfaces:

- `/share/[docType]/[token]`
- `/share/bundle/[token]`
- optional recipient verification step if policy requires it

### Required controls

Tenant admins must be able to:

- search active shares
- filter by creator, recipient, doc type, status, expiry, and activity
- revoke any share in their org
- set default expiry
- set max expiry
- disable public sharing by doc type
- require verified recipient mode for sensitive docs
- export share activity if needed

### Acceptance criteria

- Tenant user can create a secure share link for an allowed document.
- Share links enforce expiry and revocation server-side.
- Share links cannot access documents outside the intended org/doc.
- Tenant admin can revoke any active share.
- Shared document views and downloads are tracked.
- Sensitive document types require stricter policy or are blocked by default.
- Bundle share exposes only documents included in the bundle.
- Recipient verification prevents a forwarded sensitive link from exposing content when required.

---

## 9. Sprint 22.4 - Branded Enterprise Client Experience

**Goal:** Make the customer-facing experience enterprise-ready through branding, white-label controls, custom-domain readiness, support routing, and configuration health checks.

### Current gap

Enterprise settings include domain/white-label foundations, and the portal has basic support contact settings. These need to become a coherent branded external experience layer.

### Roles

| Role | Needs |
| --- | --- |
| Tenant owner/admin | Configure brand, domain, support identity, and portal policy |
| Enterprise admin | Validate external experience readiness before customer rollout |
| Customer | Trust that the portal belongs to the sender |
| Platform admin | Diagnose misconfigured domains/email/branding |

### Required branding behavior

Portal and share pages should support:

- organization logo
- brand colors
- portal header message
- support email
- support phone
- sender identity
- white-label controls by plan
- "Powered by Slipwise" behavior by plan
- consistent email templates for portal/share/quote/ticket flows
- safe fallback branding if configuration is incomplete

### Custom-domain readiness

Phase 22 should not invent a new custom-domain system if Phase 20 already provides foundations. It should connect client experience to existing domain models and define readiness checks.

Required checks:

- domain exists
- domain verification status
- SSL/HTTPS readiness if available
- portal route mapping
- email link base URL consistency
- safe fallback to canonical app URL
- conflict detection if domain is assigned elsewhere

### Email identity alignment

Portal and share emails must use verified sender settings where available.

Required behavior:

- use tenant support/reply-to email if verified and allowed
- fallback to platform sender if not verified
- avoid spoofing unverified domains
- include clear sender organization identity
- include safe support routing

### Enterprise readiness checklist

Create or update a readiness checklist for customer-facing rollout:

- portal enabled
- branding configured
- support contact configured
- share defaults configured
- revocation tested
- magic link email verified
- custom domain verified if used
- payment/proof/ticket modules tested
- access logs visible
- plan gates confirmed

### Required admin surfaces

New or upgraded surfaces:

- `/app/settings/portal/branding`
- `/app/settings/portal/domain`
- `/app/settings/portal/email`
- `/app/settings/portal/readiness`

If the repo already has enterprise settings pages that own domain/white-label behavior, Phase 22 may link to those pages rather than duplicate controls.

### Acceptance criteria

- Portal and share pages apply tenant branding consistently.
- White-label behavior follows plan gates.
- Custom-domain readiness is visible and validates known misconfiguration states.
- Portal emails use verified sender/reply-to behavior or safe fallback.
- Admin sees a clear readiness checklist before sending customers to the portal.
- Misconfigured branding/domain/email never blocks emergency portal access through canonical fallback unless admin explicitly disables portal.

---

## 10. Sprint 22.5 - Portal Intelligence, Security Hardening, and Release Readiness

**Goal:** Finish Phase 22 with analytics, security hardening, operational visibility, and release discipline.

### Required analytics

Add portal/share analytics for tenant admins:

- portal logins
- portal active customers
- invoice views
- quote views and decisions
- payment initiations
- proof uploads
- statement generation
- ticket creation/replies
- share views/downloads
- expired/revoked links
- failed/blocked access attempts

Analytics should be privacy-conscious and scoped to tenant admins with appropriate roles.

### SW Intel integration

Phase 22 should feed safe client-experience signals into Phase 21 SW Intel where appropriate:

- share link unusual access
- customer portal adoption
- repeated failed portal login
- proof upload bottleneck
- ticket response delay
- quote acceptance drop-off
- overdue customers who have not viewed invoices
- portal configuration health warnings

This is signal integration only. Do not add new AI scope in Phase 22.

### Security hardening

Security hardening must cover:

- token expiry enforcement
- token revocation enforcement
- email enumeration prevention
- durable rate limits for magic-link requests
- IDOR prevention on every portal/share route
- attachment upload validation
- proof upload validation
- safe file preview/download behavior
- secure cookies
- CSRF posture for portal actions
- custom-domain host validation
- no sensitive data in URLs beyond opaque tokens
- access logging for blocked attempts where safe

### Release readiness

Sprint 22.5 must include:

- migration verification
- backfill strategy if share/token/session models change
- portal health script or checklist
- release checklist updates
- environment variable validation
- security checklist
- accessibility checklist
- final branch verification
- rollback notes

### Acceptance criteria

- Portal/share analytics are visible to tenant admins.
- Security tests prove cross-customer and cross-org access is blocked.
- Magic-link rate limits are production-safe.
- All share links enforce expiry/revocation.
- Custom-domain fallback behavior is documented and tested.
- Release docs explain required env vars and operational checks.
- `npm run lint`, `npm run test`, and `npm run build` pass before Phase 22 merges to master.

---

## 11. Data Model Concepts

Exact Prisma model names may evolve during implementation, but Phase 22 should define these conceptual entities or safely extend existing ones.

### ExternalAccessPolicy

Represents org-level external customer access policy.

Expected fields:

- id
- orgId
- portalEnabled
- defaultSessionHours
- magicLinkExpiryHours
- shareDefaultExpiryHours
- shareMaxExpiryDays
- allowProofUpload
- allowTicketCreation
- allowStatementGeneration
- allowQuoteAcceptance
- allowPublicShares
- requireVerifiedRecipientForSensitiveDocs
- allowedShareDocTypes
- portalWatermarkMode
- createdAt
- updatedAt

### PortalSession or extended CustomerPortalToken

Represents customer portal access state.

Expected fields:

- id
- orgId
- customerId
- tokenHash
- status
- issuedAt
- verifiedAt
- expiresAt
- lastUsedAt
- revokedAt
- revokedBy
- revokeReason
- ipFingerprint or risk metadata if used

### ExternalAccessEvent

Append-only record for external access actions.

Expected event types:

- `MAGIC_LINK_REQUESTED`
- `MAGIC_LINK_VERIFIED`
- `SESSION_STARTED`
- `SESSION_REFRESHED`
- `SESSION_EXPIRED`
- `SESSION_REVOKED`
- `PORTAL_VIEWED`
- `INVOICE_VIEWED`
- `QUOTE_VIEWED`
- `STATEMENT_GENERATED`
- `PROOF_UPLOADED`
- `TICKET_CREATED`
- `TICKET_REPLIED`
- `SHARE_VIEWED`
- `SHARE_DOWNLOADED`
- `ACCESS_BLOCKED`

### ShareLink or extended SharedDocument

Represents a governed share link.

Expected fields:

- id
- orgId
- status
- docType
- docId
- bundleId
- tokenHash or shareToken if existing conventions remain
- recipientEmail
- recipientName
- accessMode
- expiresAt
- revokedAt
- revokedBy
- revokeReason
- downloadAllowed
- viewCount
- downloadCount
- createdBy
- createdAt

### ShareBundle

Represents a group of documents shared under one link.

Expected fields:

- id
- orgId
- title
- description
- status
- createdBy
- expiresAt
- revokedAt
- createdAt

### ShareBundleItem

Represents one document inside a bundle.

Expected fields:

- id
- bundleId
- docType
- docId
- displayName
- downloadAllowed
- sortOrder

### RecipientVerification

Represents recipient-specific verification for sensitive links.

Expected fields:

- id
- orgId
- shareId
- recipientEmail
- tokenHash
- status
- requestedAt
- verifiedAt
- expiresAt
- failedAttemptCount

### PortalReadinessCheck

Represents computed readiness status for external rollout.

Expected fields:

- id
- orgId
- checkKey
- status
- severity
- message
- lastCheckedAt
- metadata

### Retention and privacy

Retention must be explicit:

- portal access logs should have configurable retention
- token hashes may remain for audit until retention expiry
- raw tokens must never be stored
- recipient emails are personal data and must be protected
- IP/user-agent data should be minimized and retained only as needed for security
- share/download activity exports must respect tenant permissions

---

## 12. Route Map

### Existing routes extended in Phase 22

| Route | Expected change |
| --- | --- |
| `/portal/[orgSlug]` | Make portal entry state clearer and policy-aware |
| `/portal/[orgSlug]/auth/login` | Durable rate limit, better branding, anti-enumeration |
| `/portal/[orgSlug]/auth/verify` | Stronger session/access event recording |
| `/portal/[orgSlug]/dashboard` | Required actions, shared docs, quote/ticket/payment summaries |
| `/portal/[orgSlug]/invoices` | Better filters, payment/proof/arrangement status |
| `/portal/[orgSlug]/invoices/[id]` | Payment, proof, tickets, timeline, download policy |
| `/portal/[orgSlug]/statements` | Policy and plan-aware statement generation |
| `/portal/[orgSlug]/tickets` | Stronger collaboration and attachment handling |
| `/portal/[orgSlug]/profile` | Preferences and session/access info |
| `/share/[docType]/[token]` | Share lifecycle, expiry, revocation, branding, activity events |
| `/app/settings/portal` | Become the portal control center |

### New routes expected

| Route | Purpose |
| --- | --- |
| `/portal/[orgSlug]/quotes` | Customer quote list |
| `/portal/[orgSlug]/quotes/[quoteId]` | Quote detail, accept/reject, ask question |
| `/portal/[orgSlug]/shared` | Customer-visible shared documents |
| `/portal/[orgSlug]/activity` | Customer-visible action history if enabled |
| `/share/bundle/[token]` | Public/verified recipient document bundle |
| `/share/verify/[token]` | Recipient verification where required |
| `/app/docs/shares` | Tenant share center |
| `/app/docs/shares/[shareId]` | Share detail, activity, revoke |
| `/app/settings/portal/access` | Customer access/session control |
| `/app/settings/portal/activity` | Portal activity logs |
| `/app/settings/portal/policies` | External access policy |
| `/app/settings/portal/branding` | Portal branding controls |
| `/app/settings/portal/domain` | Portal custom-domain readiness |
| `/app/settings/portal/readiness` | Client experience readiness checklist |

---

## 13. API and Server Action Surface

Phase 22 should follow repo conventions and may use server actions where the app already does so. Exact route names may evolve, but these capabilities are required.

### Portal auth and access

Required capabilities:

- request magic link
- verify magic link
- get portal session
- refresh/extend session where policy allows
- logout
- revoke one customer access
- revoke all customer access
- list access sessions/tokens
- list access events/logs
- update external access policy

### Portal workspace

Required capabilities:

- list portal dashboard summary
- list customer invoices
- get customer invoice detail
- initiate payment
- upload payment proof
- list/generate customer statements
- list customer tickets
- create ticket
- reply to ticket
- upload ticket attachment
- list customer quotes
- get quote detail
- accept quote
- reject quote
- update profile/preferences
- list shared documents for customer

### Secure sharing

Required capabilities:

- create share link
- create share bundle
- list share links
- get share detail
- revoke share
- extend expiry if policy allows
- resend share
- verify recipient
- record view/download
- resolve shared document safely

### Enterprise client experience

Required capabilities:

- get portal branding config
- update portal branding config
- get custom-domain readiness
- get email identity readiness
- run readiness checks
- list portal/share analytics

### Required API behavior

Every capability must:

- validate org scope
- validate customer or recipient scope
- enforce plan gate
- enforce portal/share policy
- log sensitive actions
- return safe error messages
- avoid leaking customer existence
- call existing domain services instead of duplicating business rules

---

## 14. Background Jobs and Operational Workflows

Phase 22 should add or formalize jobs for:

- expired portal token cleanup
- expired share link cleanup or status refresh
- portal access log retention cleanup
- share activity rollup
- portal analytics rollup
- readiness check refresh
- suspicious access pattern detection
- customer portal adoption summary
- statement generation queue if long ranges are requested

### Job requirements

Jobs must:

- be idempotent
- be org-scoped
- avoid deleting records still needed for audit before retention expiry
- not email customers without explicit tenant configuration
- write job summaries where the repo has job logging patterns
- surface failures to admins or release health checks where appropriate

### Operational workflows

Important workflows:

1. Customer magic-link login
   - customer enters email
   - response is generic
   - token is created only for known customer in enabled org
   - token is emailed
   - verification creates session
   - access event is logged

2. Portal proof upload
   - customer opens invoice
   - uploads proof
   - server validates file
   - proof enters internal review flow
   - customer sees pending status
   - tenant sees proof in receivables/proof queue

3. Quote acceptance
   - customer opens quote
   - accepts quote
   - system validates quote state and plan limits
   - internal quote timeline records decision
   - tenant can convert or system follows existing conversion rules

4. Secure share
   - tenant creates link/bundle
   - recipient opens link
   - server checks token, status, expiry, policy, doc scope
   - view event is recorded
   - download event is recorded if allowed

5. Enterprise readiness
   - admin configures portal branding/domain/email
   - readiness check validates configuration
   - admin sees blocking and warning issues before rollout

---

## 15. Permissions, Plan Gates, and Tenant Boundaries

### Internal role access

Suggested baseline:

| Capability | Minimum internal role |
| --- | --- |
| Enable/disable portal | admin or owner |
| Update portal policy | admin or owner |
| View portal activity | admin, finance manager, operations manager, or report viewer |
| Revoke customer access | admin or owner |
| Create invoice/quote/customer statement share | user with source document share permission |
| Revoke any org share | admin or owner |
| Configure branding/domain/email | admin or owner |
| View portal analytics | admin, finance manager, operations manager, or report viewer |

### Customer/recipient boundaries

Customer portal users:

- are not tenant members
- cannot access internal app routes
- can access only records linked to their `customerId` and `orgId`
- cannot see other customers
- cannot see internal-only ticket replies
- cannot modify tenant-owned records except through explicit portal actions

Share recipients:

- are not tenant members
- can access only the specific shared document or bundle
- cannot infer other document IDs
- cannot browse tenant data
- may be required to verify email for sensitive shares

### Plan gates

Plan gates should cover:

- customer portal enablement
- Pay Now from portal
- proof upload from portal
- statement generation from portal
- support ticket creation from portal
- secure share center
- share bundles
- verified-recipient sharing
- white-label removal
- custom-domain portal
- portal analytics retention

Suggested posture:

- Free: no customer portal; limited basic share links if existing product requires it, with Slipwise branding
- Starter: customer portal view-only and basic statements
- Pro: payment/proof/ticket/quote portal workflows and secure sharing
- Enterprise: custom domain, white-label, verified recipient sharing, advanced analytics, longer retention

---

## 16. Security and Privacy Requirements

### Token security

Phase 22 must enforce:

- raw tokens are never stored
- token hashes are used for lookup
- token comparison is timing-safe where applicable
- tokens are sufficiently random
- token expiry is enforced server-side
- revocation is enforced server-side
- tokens are not logged
- URLs do not include sensitive business data beyond opaque tokens

### IDOR prevention

Every portal query must filter by:

- org ID from validated portal session
- customer ID from validated portal session
- target record ownership

Every share query must validate:

- token status
- token expiry
- document belongs to share org
- document ID/type matches share record
- recipient verification where required

### Email enumeration prevention

Portal login must:

- return the same response for known and unknown emails
- not reveal portal disabled state for a specific email
- rate-limit requests
- avoid logging sensitive email attempts unnecessarily

### Upload validation

Portal uploads must validate:

- file size
- MIME type
- extension where useful
- storage key prefix
- attachment ownership
- virus/malware scanning path if the platform introduces one
- no client-supplied metadata trusted without server validation

### Cookies and sessions

Portal session cookies must be:

- `HttpOnly`
- `Secure` in production
- `SameSite=Lax` or stricter where feasible
- scoped to appropriate path/domain
- expired on logout

### Custom-domain safety

Custom-domain portal behavior must:

- validate host mapping
- reject unknown hosts
- avoid open redirects
- use canonical fallback links when domain config is invalid
- avoid mixing one tenant's domain with another tenant's portal

### Privacy

External activity logs may include personal data. Phase 22 must:

- minimize captured data
- restrict who can view access logs
- document retention
- avoid exposing IP/user-agent to non-admins unless needed
- avoid leaking sensitive salary or HR documents through generic share flows

---

## 17. Edge Cases and Acceptance Criteria

### Portal access

| Scenario | Expected behavior |
| --- | --- |
| Customer email does not exist | generic success message, no email sent |
| Portal disabled | existing sessions are blocked on next request |
| Token expired | login fails and user can request a new link |
| Token revoked | login/session fails with safe message |
| Customer removed or archived | portal session becomes invalid |
| Customer tries URL for another customer's invoice | 403 or not found without data leak |
| Magic-link requests exceed limit | generic response, no additional email |

### Portal workspace

| Scenario | Expected behavior |
| --- | --- |
| Customer has no invoices | clear empty state |
| Invoice is already paid | Pay Now hidden or disabled |
| Payment provider unavailable | safe error, no duplicate payment state |
| Proof upload is too large | server rejects with clear error |
| Statement date range too large | queue or reject according to policy |
| Ticket has internal-only replies | customer sees only customer-visible replies |
| Quote expired | accept/reject blocked with clear status |
| Quote accepted twice | idempotent handling prevents duplicate conversion/action |

### Secure sharing

| Scenario | Expected behavior |
| --- | --- |
| Share link expired | content blocked |
| Share link revoked | content blocked |
| Share token malformed | safe not-found response |
| Share target document deleted | safe unavailable state |
| Recipient downloads disabled document | download blocked but view may remain if allowed |
| Sensitive doc shared publicly | blocked unless stricter policy enabled |
| Bundle contains revoked item | revoked item hidden/blocked without exposing data |

### Branding and domain

| Scenario | Expected behavior |
| --- | --- |
| Logo missing | fallback branding used |
| White-label not allowed by plan | Slipwise branding remains visible |
| Custom domain unverified | canonical portal URL remains available |
| Domain belongs to another org | configuration blocked |
| Email sender not verified | platform sender fallback used |

### Analytics and intelligence

| Scenario | Expected behavior |
| --- | --- |
| Portal activity high but benign | analytics show activity without security alert |
| Repeated failed token attempts | admin-visible security signal created |
| Customer has not viewed overdue invoice | SW Intel signal can be created |
| Share viewed many times from unusual context | anomaly signal created if Phase 21 supports it |

---

## 18. Test Plan

### Sprint 22.1

- portal token state tests
- revoked token tests
- expired token tests
- portal disabled tests
- email enumeration tests
- durable rate-limit tests
- access log filtering tests
- admin revoke single customer tests
- admin revoke all sessions tests

### Sprint 22.2

- portal dashboard integration tests
- customer invoice scoping tests
- portal Pay Now tests
- proof upload validation tests
- statement generation tests
- ticket create/reply tests
- quote accept/reject tests
- profile/preference update tests
- mobile viewport portal e2e tests

### Sprint 22.3

- share link creation tests
- share expiry tests
- share revocation tests
- share view/download tracking tests
- bundle share tests
- recipient verification tests
- sensitive document policy tests
- share center admin tests

### Sprint 22.4

- branding fallback tests
- white-label plan gate tests
- custom-domain readiness tests
- email sender fallback tests
- readiness checklist tests
- portal/share visual regression or screenshot checks where available
- accessibility checks for customer-facing pages

### Sprint 22.5

- portal analytics tests
- SW Intel signal integration tests
- magic-link abuse/rate-limit tests
- IDOR regression suite
- attachment/proof upload security tests
- release checklist verification
- migration/backfill tests if schema changes exist
- `npm run lint`
- `npm run test`
- `npm run build`
- targeted e2e for login, invoice view, payment/proof, statement, ticket reply, quote acceptance, share view, share revoke, and logout

---

## 19. Non-Functional Requirements

1. Customer portal dashboard should load quickly for normal customer history.
2. Share pages should not require internal app bundles beyond what is needed.
3. Portal pages must be responsive at 360px viewport width and above.
4. Customer-facing pages must meet WCAG 2.1 AA for core flows.
5. Access checks must run server-side.
6. Token verification must not depend on client state alone.
7. Portal/share activity logging must not block user flows if non-critical logging fails.
8. Statement generation for large ranges must not time out the request path.
9. Branded pages must have safe fallback if tenant configuration is incomplete.
10. Phase 22 must avoid broad rewrites of unrelated suites.

---

## 20. Environment Variables and External Dependencies

Phase 22 may depend on:

- portal JWT/session secret
- public app URL
- canonical customer portal base URL
- custom-domain host mapping infrastructure
- email sender/reply-to configuration
- rate-limit backend
- storage adapter for proof/ticket/share attachments
- payment provider configuration for Pay Now

Representative variables:

```env
PORTAL_JWT_SECRET=
CUSTOMER_PORTAL_BASE_URL=
NEXT_PUBLIC_APP_URL=
PORTAL_MAGIC_LINK_WINDOW_SECONDS=900
PORTAL_MAGIC_LINK_MAX_REQUESTS=3
PORTAL_SESSION_HOURS=24
PORTAL_SHARE_DEFAULT_EXPIRY_DAYS=30
PORTAL_ACCESS_LOG_RETENTION_DAYS=180
```

Exact names must match existing repo conventions. Phase 22 must update env validation and release docs if new variables are added.

---

## 21. Risk Register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Customer data leak through portal IDOR | Low | Critical | strict org/customer filtering, regression tests |
| Forwarded share link exposes sensitive data | Medium | High | recipient verification, expiry, doc-type policy |
| Magic-link abuse | Medium | Medium | durable rate limits, generic responses, logging |
| Custom-domain misrouting | Medium | Critical | host validation, readiness checks, canonical fallback |
| Portal action duplicates business logic | Medium | High | route actions through existing domain services |
| Branding hides trust/security cues | Low | Medium | keep sender identity and security messaging visible |
| Portal becomes broad CRM | Medium | Medium | keep scope to invoices, quotes, statements, tickets, shares, payments |
| Dirty baseline causes implementation drift | Medium | High | require clean verified baseline after Phase 21 |

---

## 22. Branch Strategy and PR Workflow

Phase 22 must not be developed directly on `master`.

### Required baseline

Start Phase 22 only after Phase 21 is complete, verified, and merged into the selected baseline.

Recommended baseline:

- latest `master` after Phase 21 is fully merged and verified

If the team chooses a different baseline, that decision must be written into the Phase 22 implementation handoff before coding starts.

### Required branch strategy

1. Create the main Phase 22 branch:
   - `feature/phase-22`
2. Create one sprint sub-branch at a time from `feature/phase-22`:
   - `feature/phase-22-sprint-22-1`
   - `feature/phase-22-sprint-22-2`
   - `feature/phase-22-sprint-22-3`
   - `feature/phase-22-sprint-22-4`
   - `feature/phase-22-sprint-22-5`
3. Each sprint branch must open a PR back into `feature/phase-22`.
4. Do not merge sprint branches into `master`.
5. Do not merge `feature/phase-22` into `master` until:
   - all sprint PRs are approved and merged into `feature/phase-22`
   - all acceptance criteria are verified
   - release readiness is complete
   - portal/share security tests pass
   - final sign-off is complete

### Review workflow

- Keep each sprint PR scoped to its sprint.
- Include screenshots for customer-facing portal/share surfaces.
- Include test output in every PR description.
- Include security notes for token/session/share changes.
- Do not silently defer unresolved external-access risks.

### Final merge rule

`feature/phase-22` must not merge into `master` until Phase 22 is complete, verified, and explicitly signed off.

---

## Final Phase 22 Acceptance Criteria

Phase 22 is complete only when:

- Customer portal is a coherent client workspace.
- Portal access policy is centralized and enforced server-side.
- Tenant admins can revoke customer portal access.
- Tenant admins can view portal access/activity.
- Customers can safely use invoices, quotes, statements, tickets, profile, and shared documents.
- Secure share center supports expiry, revocation, recipient tracking, and bundle sharing.
- Sensitive document sharing is blocked or verification-protected by default.
- Branded and white-label portal behavior follows plan gates.
- Custom-domain readiness is visible and safe.
- Portal/share activity feeds internal workflows and SW Intel signals where appropriate.
- IDOR, token, upload, and email enumeration tests pass.
- Release docs and env validation cover Phase 22 external experience operations.
- `npm run lint`, `npm run test`, and `npm run build` pass on the final Phase 22 branch.
