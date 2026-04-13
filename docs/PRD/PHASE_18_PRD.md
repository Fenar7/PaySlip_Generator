# Phase 18 PRD — Slipwise One
## SW Flow Completion + Customer Collaboration + Operational Analytics

**Version:** 1.0  
**Date:** 2026-04-13  
**Prepared by:** Codex Engineering Assistant  
**Parent Company:** Zenxvio  
**Product:** Slipwise One

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Post Phase 17](#2-current-state-post-phase-17)
3. [Phase 18 Objectives and Non-Goals](#3-phase-18-objectives-and-non-goals)
4. [Sprint 18.1 — Admin Configuration Foundation](#4-sprint-181--admin-configuration-foundation)
5. [Sprint 18.2 — Notification Delivery Operations](#5-sprint-182--notification-delivery-operations)
6. [Sprint 18.3 — Customer Portal Ticket Collaboration](#6-sprint-183--customer-portal-ticket-collaboration)
7. [Sprint 18.4 — SW Intel Operational Analytics](#7-sprint-184--sw-intel-operational-analytics)
8. [Sprint 18.5 — Hardening, Governance, and Readiness](#8-sprint-185--hardening-governance-and-readiness)
9. [Database Schema Additions and Extensions](#9-database-schema-additions-and-extensions)
10. [Route Map](#10-route-map)
11. [Background Jobs and Scheduled Execution](#11-background-jobs-and-scheduled-execution)
12. [Plan Gates](#12-plan-gates)
13. [Edge Cases and Acceptance Criteria](#13-edge-cases-and-acceptance-criteria)
14. [Test Plan](#14-test-plan)
15. [Non-Functional Requirements](#15-non-functional-requirements)
16. [Environment Variables](#16-environment-variables)
17. [Risk Register](#17-risk-register)
18. [Branch Strategy and PR Workflow](#18-branch-strategy-and-pr-workflow)

---

## 1. Executive Summary

Phase 17 established the backend foundation for Slipwise One's workflow platform:

- approval policies and threshold-aware routing
- ticket SLA deadlines and escalation rules
- shared scheduled action execution with retry and dead-letter handling
- bounded trigger to action workflow automation
- workflow run and step run tracking
- a first operational Flow dashboard

That phase solved the platform-layer problem.

Phase 18 solves the operator-layer and collaboration-layer problem.

Slipwise One already has the underlying workflow primitives, but it still lacks the product surfaces and reporting depth required for day-to-day operational use:

- workflow definitions can be listed, but not fully built and managed through guided UI
- SLA policies are visible, but not fully editable through admin workflows
- approval policy rules exist in schema, but the product still lacks complete configuration ergonomics
- notification creation exists, but outbound delivery is not modeled as a first-class operational system
- the customer portal exists, but ticket collaboration is not yet a complete customer-facing workflow
- SW Intel can snapshot operational data, but Flow-specific analytics are not yet a formal reporting layer

Phase 18 turns those partial surfaces into a coherent operations platform.

### Strategic outcome

By the end of Phase 18, Slipwise One should support this operating model:

1. Admins configure workflow rules, approval policies, SLA rules, and escalation behavior from guided product surfaces instead of backend-only setup.
2. Notifications are not just created; they are delivered, retried, traced, and audited across in-app and email channels.
3. Customers collaborate with teams on invoice-related tickets inside the portal using secure ticket inboxes, replies, attachments, and visible status updates.
4. SW Intel becomes the reporting layer for queue health, breach trends, workflow outcomes, and notification delivery health.
5. Operators can inspect failures, escalations, retries, breach risk, and customer-facing support activity from one suite architecture without leaving the platform.

### Business value

| Problem today | Phase 18 outcome |
| --- | --- |
| Flow primitives are present, but configuration still feels backend-oriented | Admin teams get guided configuration for workflow, approval, SLA, and escalation rules |
| Notifications exist as in-app records, but outbound delivery is opaque | Delivery attempts, retries, failures, and operator recovery become first-class |
| Customer portal supports invoices/statements, but not real ticket collaboration | Customers can securely participate in ticket resolution inside the portal |
| Flow observability exists inside Flow pages only | SW Intel gains operator-grade reporting for workflow, SLA, and delivery performance |
| Operational edge cases require manual investigation across disconnected surfaces | Operators get consistent queue, dead-letter, delivery, escalation, and reporting visibility |

### Why this phase now

This is the correct follow-up to Phase 17.

Phase 17 made SW Flow architecturally credible. Phase 18 makes it operationally complete.

Without Phase 18, Slipwise One risks having:

- strong orchestration internals with incomplete admin usability
- strong internal ticket handling with weak customer-facing collaboration
- workflow events without delivery accountability
- reporting snapshots without Flow-specific management value

Phase 18 addresses those gaps while preserving the bounded, audit-safe workflow model already established in Phase 17.

---

## 2. Current State Post Phase 17

Slipwise One now contains broad operational coverage across:

- `SW Docs`
- `SW Pay`
- `SW Flow`
- `SW Books`
- `SW Auth & Access`
- `SW Intel`
- customer portal

### What already exists from prior phases

- persistent document records for invoices, vouchers, salary slips, quotes, templates, and attachments
- receivables lifecycle with payment proof, dunning, arrangements, statements, and send/reminder flows
- accounting, reconciliation, vendor bills, payment runs, financial close, and finance reports
- ticketing, approvals, notifications, activity, jobs, workflow definitions, and escalation/scheduler infrastructure
- customer portal login, invoice views, statement views, profile management, and support contact settings
- reporting snapshots and Intel surfaces for operational and accounting summaries

### Existing Flow-specific capabilities from Phase 17

Relevant current Prisma models and engines already in the repo:

- `ApprovalPolicy`
- `ApprovalPolicyRule`
- `ApprovalRequest`
- `InvoiceTicket`
- `TicketReply`
- `TicketSlaPolicy`
- `TicketEscalationRule`
- `Notification`
- `ScheduledAction`
- `DeadLetterAction`
- `WorkflowDefinition`
- `WorkflowStep`
- `WorkflowRun`
- `WorkflowStepRun`
- `ReportSnapshot`
- `ActivityLog`
- `AuditLog`

Relevant current routes and surfaces already live:

- `/app/flow`
- `/app/flow/policies`
- `/app/flow/policies/[policyId]`
- `/app/flow/sla`
- `/app/flow/jobs`
- `/app/flow/dead-letter`
- `/app/flow/tickets`
- `/app/flow/notifications`
- `/app/flow/workflows`
- `/app/flow/workflows/[workflowId]/runs`
- `/portal/[orgSlug]/dashboard`
- `/portal/[orgSlug]/invoices`
- `/portal/[orgSlug]/statements`
- `/portal/[orgSlug]/profile`

Relevant current cron routes already live:

- `/api/cron/flow-scheduler`
- `/api/cron/flow-ticket-sla`
- `/api/cron/flow-approval-escalations`
- `/api/cron/flow-dead-letter-summary`

### Current gaps that Phase 18 must close

| Existing capability | Current gap |
| --- | --- |
| `WorkflowDefinition` + `WorkflowStep` | listing exists, but there is no complete guided workflow builder/editor UI |
| `ApprovalPolicy` + `ApprovalPolicyRule` | policy primitives exist, but rule authoring/maintenance UX is incomplete |
| `TicketSlaPolicy` + `TicketEscalationRule` | policies can be surfaced, but creation/editing and operational management are incomplete |
| `Notification` | supports in-app records, but does not model outbound delivery attempts, retry state, or failure diagnostics |
| `InvoiceTicket` + `TicketReply` | internal ticket handling exists, but customer portal collaboration is incomplete |
| `ReportSnapshot` | reports exist, but Flow-specific analytics are not formalized as first-class Intel datasets |
| dead-letter + scheduler | execution failures are visible, but not unified with notification delivery failure operations |

### Architecture rules Phase 18 must preserve

Phase 18 must stay consistent with the established application architecture:

- Next.js App Router
- server actions in `actions.ts`
- Prisma-backed modular monolith
- auth and org resolution via `requireOrgContext()`
- permissions via current role/permission utilities
- plan gating in `src/lib/plans/config.ts`
- cron auth via `validateCronSecret(request)`
- action result shape:
  - `{ success: true, data }`
  - `{ success: false, error }`

### Non-negotiable engineering rules carried forward from Phase 17

1. `fireWorkflowTrigger(...)` must never run inside a `db.$transaction(async tx => { ... })` callback.
2. `revalidatePath(...)` is only valid in server action files, not in pure library files under `src/lib/`.
3. Cron jobs must be idempotent and terminal-state aware.
4. Approval, ticket, workflow, delivery, and escalation actions must remain auditable.
5. Phase 18 must extend the current schema and execution model rather than introducing a parallel orchestration framework.

---

## 3. Phase 18 Objectives and Non-Goals

### Objectives

| # | Objective | Sprint |
| --- | --- | --- |
| O1 | Complete admin UX for workflow definitions, approval policies, SLA policies, and escalation rules | 18.1 |
| O2 | Make bounded workflow automation fully configurable through guided product flows | 18.1 |
| O3 | Introduce notification delivery tracking for in-app and email channels | 18.2 |
| O4 | Add delivery retry, dead-letter, and operator recovery tooling | 18.2 |
| O5 | Extend the customer portal into a full ticket collaboration surface | 18.3 |
| O6 | Support customer replies, attachments, and visible ticket status/SLA state | 18.3 |
| O7 | Promote Flow operational metrics into SW Intel datasets and reporting surfaces | 18.4 |
| O8 | Add queue, breach, workflow, and delivery analytics suitable for admins/operators | 18.4 |
| O9 | Harden permissions, audit coverage, idempotency, and concurrency behavior across the new surfaces | 18.5 |
| O10 | Deliver a rollout-ready workflow operations layer that can be used by engineering, QA, support, finance, and admins daily | 18.5 |

### Non-goals

Phase 18 intentionally does **not** include:

1. a BPMN-style visual workflow designer
2. arbitrary script execution or unbounded automation actions
3. SMS, WhatsApp, or push-notification orchestration as first-class operator channels
4. infrastructure migration or queue-provider migration
5. inventory, procurement, or CRM expansion
6. generalized public helpdesk outside invoice/payment support context
7. customer self-service workflow editing or admin-grade rule management from the portal
8. direct government or third-party escalation submission flows

### Product positioning for this phase

Phase 18 is a **broader operations platform phase**.

It is not only:

- a Flow UI completion sprint
- an Intel reporting add-on
- a portal enhancement pass

It is the phase that connects configuration, execution, collaboration, delivery, and analytics into one operational model.

---

## 4. Sprint 18.1 — Admin Configuration Foundation

**Goal:** Complete the admin/operator UX required to configure workflow, approvals, SLA policy, and escalation behavior from product surfaces.

**Epic ownership:** SW Flow + SW Auth & Access  
**Dependencies:** Phase 17 workflow, approvals, SLA, and escalation schema/model foundation

### 4.1 Workflow builder UI

Add a guided workflow authoring flow for bounded automations.

Required behavior:

- create a workflow definition from UI
- edit draft workflows
- validate trigger type against `SUPPORTED_TRIGGERS`
- validate step action types against `SUPPORTED_ACTIONS`
- define ordered steps
- preview step sequence before save
- activate only when the workflow has at least one valid step
- support pause and archive state transitions
- show definition metadata:
  - name
  - description
  - trigger
  - status
  - version
  - step count
  - run count

Guiding principle:

- this is a **guided builder**, not a low-code canvas
- only approved trigger/action families may be configured
- no free-form code execution or dynamic expressions

### 4.2 Approval policy management completion

Required admin capabilities:

- create approval policy
- edit policy metadata
- create and order approval policy rules
- define threshold ranges
- define approver role or approver user
- define fallback routing
- define escalation timing for policy-level handling
- activate/inactivate policies
- inspect policy usage context

Required product behavior:

- approval policies remain org-scoped
- historical approval requests keep their original routed identity and policy reference
- policy edits affect only new approval requests unless explicitly versioned in a future phase

### 4.3 SLA policy management completion

Required admin capabilities:

- create SLA policy
- edit SLA policy
- set default policy
- set category/priority-specific policy
- configure first-response and resolution targets
- choose calendar-time vs business-hours mode

Required product behavior:

- only one effective default policy per org at a time
- category/priority-specific policies override default when matched
- SLA deadlines must remain deterministic and inspectable

### 4.4 Escalation rule management

Add operator-grade escalation rule configuration.

Required capabilities:

- create escalation rule
- edit escalation rule
- assign breach type
- define delay threshold
- define target role and/or target user
- choose whether org admins are notified
- enable/disable rules
- view rule coverage against current breach counts

Escalation targets should support:

- approval breach handling
- ticket first-response breach
- ticket resolution breach
- notification delivery terminal failure
- workflow dead-letter summary follow-up

### 4.5 Sprint deliverables

- workflow builder create/edit/activate/pause/archive UI
- approval policy and rule management UI
- SLA policy create/edit/default-selection UI
- escalation rule management UI
- validation and safe-state guardrails for invalid configuration

### 4.6 Demo output

During sprint demo, the team should be able to:

1. create a workflow with a supported trigger and valid steps
2. create an approval policy with threshold rules
3. create an SLA policy and set it as default
4. create an escalation rule for a breach type
5. verify that invalid configurations are blocked before activation

### 4.7 Acceptance gate

Sprint 18.1 is accepted only if:

- admins can fully manage workflow/policy/SLA/escalation configuration without backend intervention
- configuration validation prevents invalid trigger/action/rule combinations
- historical records remain stable after policy changes
- audit trails exist for all admin configuration changes

---

## 5. Sprint 18.2 — Notification Delivery Operations

**Goal:** Turn notification delivery into a first-class operational system with delivery records, retry handling, and failure diagnostics for in-app and email channels.

**Epic ownership:** SW Flow + platform delivery utilities  
**Dependencies:** current `Notification` model, existing email capabilities, Phase 17 scheduler/dead-letter engine

### 5.1 Delivery model

Phase 18 introduces a distinction between:

- `Notification` as the user-facing notification record
- `NotificationDelivery` as the outbound delivery attempt record

This split is required because:

- in-app notifications represent product-visible state
- email deliveries represent channel execution and operational traceability

### 5.2 Supported delivery channels in Phase 18

Mandatory channels:

- `in_app`
- `email`

Out of scope:

- SMS
- WhatsApp
- push

### 5.3 Required delivery behavior

For notifications that require email delivery:

- queue a delivery attempt
- record provider/channel metadata
- record recipient target
- record attempt count
- record queued, sent, delivered, failed, and retry timestamps as applicable
- retry failed deliveries with bounded retry policy
- mark terminal failures for operator intervention
- support replay from operator console where safe

For in-app delivery:

- create the `Notification` record
- optionally create an `in_app` delivery record if unified analytics requires it
- never duplicate user-visible records during retry loops

### 5.4 Operator surfaces

Add notification delivery operations UI:

- delivery list
- status filtering
- failure filtering
- channel filtering
- retry/replay actions
- related source module/source ref visibility
- link-back to originating ticket/workflow/approval entity

The operator should be able to answer:

- what failed
- who was impacted
- how many times it retried
- whether it is dead-lettered
- whether it was manually replayed

### 5.5 Delivery dead-letter handling

Phase 18 should unify notification delivery terminal failures with the existing dead-letter operating model.

Required behavior:

- terminal email failures must be visible in a dedicated operator queue or integrated failure console
- operator replay must create a new attempt event without mutating historical attempts
- failure reasons must be categorized enough for reporting and triage

### 5.6 Sprint deliverables

- `NotificationDelivery` model and lifecycle
- email delivery attempt tracking
- retry and terminal failure handling
- operator delivery console
- delivery analytics-ready status normalization

### 5.7 Demo output

During sprint demo, the team should be able to:

1. generate an in-app plus email notification from a workflow or operator action
2. observe the delivery attempt lifecycle
3. simulate a delivery failure
4. show retry behavior
5. show the dead-letter or failure console and replay a failed attempt

### 5.8 Acceptance gate

Sprint 18.2 is accepted only if:

- delivery attempts are traceable end-to-end
- retry behavior is bounded and idempotent
- operator replay is safe and auditable
- delivery outcomes can be reported by org, channel, status, and source

---

## 6. Sprint 18.3 — Customer Portal Ticket Collaboration

**Goal:** Extend the customer portal into a secure ticket collaboration surface so customers can view, reply to, and contribute to invoice-related support resolution.

**Epic ownership:** customer portal + SW Flow  
**Dependencies:** current portal auth/session model, `InvoiceTicket`, `TicketReply`, invoice-customer relationships

### 6.1 Portal ticket inbox

Add portal ticket inbox surfaces:

- `/portal/[orgSlug]/tickets`
- customer-scoped ticket list
- search/filter by status
- ticket summary:
  - subject/category
  - status
  - SLA state or support status
  - last activity
  - unread indicator
  - linked invoice reference

Only tickets belonging to the authenticated portal customer should be visible.

### 6.2 Portal ticket detail

Add ticket detail surface:

- `/portal/[orgSlug]/tickets/[ticketId]`
- secure customer-scoped detail view
- chronological reply thread
- clear indication of:
  - staff reply
  - customer reply
  - internal-only entries hidden from customer
  - current ticket status
  - current SLA/support state
  - related invoice identity

### 6.3 Customer replies

Required behavior:

- customer can submit reply to open/in-progress tickets
- reply author is tracked as portal customer
- internal-only replies must never be exposed in portal
- customer reply should update ticket activity and unread state
- customer reply may trigger workflow or notification actions after commit

### 6.4 Attachments

Required first-release attachment scope:

- customer can upload attachments with replies
- file validation on:
  - type
  - size
  - count
- attachment metadata stored in structured model
- portal customer can only access their own ticket attachments
- staff can view portal-provided attachments inside internal ticket detail

### 6.5 Customer-visible status and timeline

The portal should show a curated customer-visible timeline.

Customer-visible events should include:

- ticket opened
- customer replied
- staff replied
- ticket status changed
- ticket resolved
- ticket reopened

Internal-only operational details should remain hidden:

- internal notes
- admin assignment events unless explicitly made visible
- internal escalation routing details
- workflow internals not intended for customers

### 6.6 Portal-side notification behavior

When appropriate, portal collaboration should generate:

- in-app/internal staff notification
- email update to customer where allowed by settings
- unread state updates for both sides

### 6.7 Sprint deliverables

- portal ticket inbox
- portal ticket detail view
- customer reply submission
- attachment support
- customer-visible ticket timeline and status
- secure portal enforcement for ticket visibility

### 6.8 Demo output

During sprint demo, the team should be able to:

1. log in as a portal customer
2. view only that customer's tickets
3. open a ticket detail page
4. submit a customer reply with attachment
5. verify internal staff sees the update and the customer sees only allowed timeline entries

### 6.9 Acceptance gate

Sprint 18.3 is accepted only if:

- portal ticket visibility is customer-scoped and secure
- customer replies are persisted and auditable
- attachment access control is correct
- internal-only comments/events are not leaked to the portal
- SLA/status information shown to customers is consistent and intentionally curated

---

## 7. Sprint 18.4 — SW Intel Operational Analytics

**Goal:** Make SW Intel the operational reporting layer for Flow, support, breach management, workflow outcomes, and delivery reliability.

**Epic ownership:** SW Intel + SW Flow  
**Dependencies:** Phase 17 metrics foundation, `ReportSnapshot`, new Phase 18 delivery/collaboration data

### 7.1 New operational analytics scope

Phase 18 should formalize the following report and snapshot families:

- `flow.queue_summary`
- `flow.sla_breaches`
- `flow.workflow_runs`
- `flow.notification_deliveries`
- `portal.ticket_operations`

These should be compatible with the current `ReportSnapshot` pattern and existing Intel reporting model.

### 7.2 Queue summary analytics

Required metrics include:

- pending approvals
- overdue approvals
- open tickets
- tickets awaiting customer
- tickets awaiting staff
- breached tickets
- pending scheduled actions
- dead-lettered actions
- failed notification deliveries

### 7.3 SLA breach analytics

Required reporting dimensions:

- breach type
- priority
- category
- org
- date/time window
- escalation level
- resolved vs unresolved breach population

### 7.4 Workflow run analytics

Required reporting dimensions:

- workflow definition
- trigger type
- run status
- step failure hotspot
- source module
- run volume over time
- success/failure/dead-letter trend

### 7.5 Notification delivery analytics

Required reporting dimensions:

- delivery channel
- source module
- delivery status
- retry count
- dead-letter count
- provider failure breakdown
- top failing workflow/source contexts

### 7.6 Portal ticket operations analytics

Required reporting dimensions:

- ticket volume by customer and category
- average first response time
- average resolution time
- customer reply volume
- attachment usage
- reopened ticket rate
- breach by customer/account cohort

### 7.7 Sprint deliverables

- snapshot generation for Flow-specific datasets
- SW Intel reporting surfaces for operational analytics
- queue/breach/workflow/delivery reporting filters
- consistency checks against source records

### 7.8 Demo output

During sprint demo, the team should be able to:

1. refresh or generate Flow-related report snapshots
2. open Intel surfaces for queue summary and breach analytics
3. inspect workflow run trends and delivery failure trends
4. compare snapshot totals to live source-record counts

### 7.9 Acceptance gate

Sprint 18.4 is accepted only if:

- reported metrics reconcile to source records
- Intel views are usable for admin/operator decision-making
- filters and exports are stable
- report generation remains performant enough for target org size

---

## 8. Sprint 18.5 — Hardening, Governance, and Readiness

**Goal:** Finish Phase 18 with permission completion, audit guarantees, idempotency hardening, performance verification, and release readiness.

**Epic ownership:** cross-suite hardening  
**Dependencies:** all prior Phase 18 sprint deliverables

### 8.1 Permission and role hardening

Complete access enforcement for:

- workflow configuration
- policy/SLA/escalation management
- notification delivery operations
- ticket operator actions
- portal collaboration surfaces
- Intel operational reporting

Permission logic must hold in:

- UI
- server actions
- API routes
- cron-driven follow-up actions

### 8.2 Audit completeness review

Required auditable actions:

- workflow create/edit/activate/pause/archive
- approval policy and rule changes
- SLA policy changes
- escalation rule changes
- notification delivery retries/replays
- portal replies and attachments
- ticket status changes
- operator recovery actions

### 8.3 Idempotency and concurrency review

Required hardening areas:

- repeated cron execution
- retry loops
- simultaneous ticket replies
- operator replay on already-succeeded delivery
- approval/ticket policy changes during in-flight work
- customer refresh/re-submit behavior in portal flows

### 8.4 Performance and readiness

Required validation:

- operator list pages remain usable at realistic row counts
- report snapshot generation completes in acceptable time
- portal ticket views remain responsive
- failure dashboards remain queryable under growing delivery history

### 8.5 Sprint deliverables

- permission matrix completion
- audit gap closure
- idempotency/concurrency hardening
- performance verification
- rollout checklist and release readiness package

### 8.6 Demo output

During sprint demo, the team should be able to:

1. show that permissions block unauthorized actions consistently
2. show audit trails for major new Phase 18 actions
3. show replay/idempotency safety in failure recovery cases
4. present release-readiness evidence and unresolved risks

### 8.7 Acceptance gate

Sprint 18.5 is accepted only if:

- permission enforcement is complete
- audit coverage is complete for all critical actions
- replay/retry/idempotency behavior is safe
- the engineering team is comfortable handing the phase to production rollout planning

---

## 9. Database Schema Additions and Extensions

Phase 18 must extend the current Phase 17 schema, not replace it.

### 9.1 New model: `NotificationDelivery`

Purpose:

- represent each outbound delivery attempt or tracked delivery state
- separate user-visible notification truth from operational delivery truth

Required fields:

- `id`
- `orgId`
- `notificationId?`
- `channel`
- `recipient`
- `provider?`
- `status`
- `attemptCount`
- `lastError?`
- `queuedAt`
- `sentAt?`
- `deliveredAt?`
- `failedAt?`
- `retryAt?`
- `sourceModule?`
- `sourceRef?`
- `workflowRunId?`
- `scheduledActionId?`
- `createdAt`
- `updatedAt`

Required status concepts:

- queued
- sent
- delivered
- failed
- retry_scheduled
- dead_lettered
- cancelled

Required indexes:

- `[orgId, status, channel]`
- `[retryAt, status]`
- `[sourceModule, sourceRef]`

### 9.2 New model: `PortalTicketAttachment`

Purpose:

- store structured metadata for customer-visible ticket attachments

Required fields:

- `id`
- `orgId`
- `ticketId`
- `replyId`
- `storageKey`
- `fileName`
- `mimeType`
- `fileSize`
- `uploadedByType`
- `uploadedById`
- `createdAt`

Required indexes:

- `[ticketId, createdAt]`
- `[replyId]`
- `[orgId, createdAt]`

### 9.3 New model: `TicketParticipant`

Purpose:

- track visibility and participant membership for ticket collaboration across staff and customers

Required fields:

- `id`
- `orgId`
- `ticketId`
- `participantType`
- `userId?`
- `customerId?`
- `isPrimary`
- `isWatcher`
- `createdAt`

Required behavior:

- support secure customer-scoped ticket lists
- support internal watcher/subscriber behavior if needed

### 9.4 New model: `EscalationEvent`

Purpose:

- create immutable escalation history for approvals, tickets, workflow failures, and delivery failures

Required fields:

- `id`
- `orgId`
- `sourceModule`
- `sourceEntityType`
- `sourceEntityId`
- `breachType`
- `escalationLevel`
- `targetRole?`
- `targetUserId?`
- `actionTaken`
- `status`
- `metadata?`
- `createdAt`
- `resolvedAt?`

Required indexes:

- `[orgId, breachType, createdAt]`
- `[sourceModule, sourceEntityId]`

### 9.5 Existing model extensions

#### `Notification`

Optional extensions if needed for efficient list rendering:

- `deliverySummaryStatus?`
- `lastDeliveredAt?`
- `hasFailedDelivery?`

Rule:

- `NotificationDelivery` remains the source of truth for per-attempt history

#### `TicketReply`

Required extensions:

- `authorType`
- `visibility`
- `customerId?`
- `hasAttachments`

Purpose:

- distinguish staff/customer replies
- distinguish internal-only vs customer-visible content

#### `InvoiceTicket`

Candidate extensions:

- `customerVisibleStatus?`
- `lastCustomerReplyAt?`
- `lastStaffReplyAt?`
- `portalUnreadCount?`
- `attachmentCount?`
- `customerLastViewedAt?`
- `staffLastViewedAt?`

Purpose:

- enable inbox semantics, unread behavior, and curated portal display

#### `ApprovalPolicyRule`

Potential Phase 18 extensions:

- `escalateAfterMins?`
- `notifyOnEscalation?`
- `stopOnMatch`

Purpose:

- make rule behavior more explicit for admin UX and runtime clarity

#### `TicketEscalationRule`

Potential Phase 18 extensions:

- `status`
- `appliesToPriority?`
- `actionType`
- `notifyCustomer?`

Purpose:

- improve precision and reporting for breach operations

#### `ReportSnapshot`

No structural rewrite required, but Phase 18 must standardize these additional `reportType` values:

- `flow.queue_summary`
- `flow.sla_breaches`
- `flow.workflow_runs`
- `flow.notification_deliveries`
- `portal.ticket_operations`

### 9.6 Migration strategy

Phase 18 should be split into multiple migrations aligned with sprint delivery:

1. admin configuration and rule hardening
2. notification delivery models
3. portal ticket collaboration models
4. analytics/reporting additions
5. hardening/backfill as needed

Historical records must remain readable during migration rollout.

---

## 10. Route Map

### 10.1 SW Flow routes

Add or complete the following internal app routes:

- `/app/flow`
- `/app/flow/workflows`
- `/app/flow/workflows/new`
- `/app/flow/workflows/[workflowId]`
- `/app/flow/workflows/[workflowId]/runs`
- `/app/flow/policies`
- `/app/flow/policies/new`
- `/app/flow/policies/[policyId]`
- `/app/flow/policies/[policyId]/edit`
- `/app/flow/sla`
- `/app/flow/sla/new`
- `/app/flow/sla/[policyId]/edit`
- `/app/flow/escalations`
- `/app/flow/notifications`
- `/app/flow/notifications/deliveries`
- `/app/flow/dead-letter`
- `/app/flow/tickets`
- `/app/flow/tickets/[ticketId]`

### 10.2 Customer portal routes

Add customer-facing routes:

- `/portal/[orgSlug]/tickets`
- `/portal/[orgSlug]/tickets/[ticketId]`

Existing portal routes to integrate with:

- `/portal/[orgSlug]/dashboard`
- `/portal/[orgSlug]/invoices`
- `/portal/[orgSlug]/invoices/[id]`
- `/portal/[orgSlug]/statements`
- `/portal/[orgSlug]/profile`

### 10.3 SW Intel routes and surfaces

Add or extend Intel reporting views for:

- queue summary
- SLA breaches
- workflow runs
- notification deliveries
- portal ticket operations

These should sit within the existing Intel reporting structure rather than introducing a new suite.

### 10.4 API and action patterns

Required interaction rules:

- server actions remain the default for internal CRUD/update flows
- portal interactions use secure server actions and/or internal routes with portal session checks
- cron routes remain authenticated by `CRON_SECRET`
- public/customer routes must never trust client-provided org identity without portal session validation

---

## 11. Background Jobs and Scheduled Execution

Phase 18 extends the existing Flow cron model.

### 11.1 Existing jobs to keep

- Flow scheduler
- ticket SLA scan
- approval escalation scan
- dead-letter summary

### 11.2 New or extended jobs

#### Notification delivery dispatcher

Responsibilities:

- pull queued email delivery records
- attempt delivery
- mark send/failure state
- schedule retry if recoverable

#### Notification delivery retry worker

Responsibilities:

- process retry-eligible delivery records
- enforce retry bounds
- mark terminal dead-letter state

#### Portal unread reconciliation

Responsibilities:

- maintain customer/staff unread counters or derived read state
- ensure inbox views remain accurate

#### Flow analytics snapshot refresh

Responsibilities:

- generate `ReportSnapshot` rows for Phase 18 Flow/portal datasets
- reconcile/report on aggregate metrics

#### Delivery failure summary

Responsibilities:

- notify operators/admins of terminal delivery issues
- avoid duplicate notifications for the same unresolved failure condition

### 11.3 Job design rules

All jobs must:

- call `validateCronSecret(request)`
- be idempotent
- avoid mutating terminal-state records incorrectly
- emit auditable execution context
- remain safe under repeated invocation

---

## 12. Plan Gates

Add or confirm the following plan gates in `src/lib/plans/config.ts`:

| Gate | Purpose |
| --- | --- |
| `workflowBuilderUi` | Guided workflow builder and workflow configuration UI |
| `approvalPolicyManager` | Approval policy and rule management |
| `slaPolicyManager` | SLA policy and escalation rule management |
| `notificationDeliveryOps` | Delivery tracking, retries, and failure operations |
| `portalTicketCollaboration` | Customer-facing ticket inbox, replies, and attachments |
| `flowIntelAnalytics` | Flow and portal operational analytics in SW Intel |
| `flowOpsControlCenter` | Unified operator access to delivery, escalations, and queue health |

Plan gates should follow the existing Slipwise One gating model and support safe rollout by tier.

---

## 13. Edge Cases and Acceptance Criteria

### 13.1 Workflow builder edge cases

- activation blocked when no steps exist
- activation blocked when unsupported trigger/action type is present
- archived workflows cannot be edited as active definitions
- invalid sequence or orphaned step records are not allowed

### 13.2 Policy/SLA edge cases

- overlapping approval thresholds must have deterministic validation behavior
- multiple defaults must be prevented or resolved deterministically
- policy edits must not retroactively change historical request routing
- escalations should not double-fire for already-escalated terminal records

### 13.3 Delivery edge cases

- email provider transient failure vs terminal failure must be distinguishable
- retries must not create duplicate in-app notification rows
- replay on already-delivered item must be blocked or explicitly marked as duplicate-safe
- missing recipient targets must fail clearly and audibly

### 13.4 Portal collaboration edge cases

- portal customer cannot access another customer's tickets
- internal-only ticket entries must never render in portal
- closed/resolved ticket reply policy must be explicitly enforced
- attachment uploads must reject invalid size/type/count
- deleted or expired portal session must block further ticket actions

### 13.5 Analytics edge cases

- snapshot totals must reconcile to source-of-truth data
- stale snapshot generation should not be presented as live data without clear labeling
- failed snapshot jobs must be operator-visible

### 13.6 Phase-level acceptance criteria

Phase 18 is complete only if:

1. admin configuration for workflow/policy/SLA/escalation is fully usable from product UI
2. notification delivery attempts are visible, retryable, and auditable
3. portal ticket collaboration is secure and production-credible
4. SW Intel exposes operational analytics for queue, breach, workflow, and delivery behavior
5. permissions, audit coverage, and idempotency rules hold across the whole phase

---

## 14. Test Plan

### 14.1 Unit tests

Add or extend coverage for:

- workflow builder validation
- approval policy rule matching
- SLA policy precedence and deadline computation
- escalation rule selection
- notification delivery state transitions
- retry/dead-letter classification
- portal ticket visibility checks
- attachment validation logic
- analytics aggregation utilities

### 14.2 Integration tests

Add or extend coverage for:

- workflow creation through actions/UI paths
- approval policy edits and new request routing
- SLA breach scan plus escalation emission
- notification generation plus email delivery lifecycle
- replay of failed delivery attempts
- portal customer reply submission with attachment
- customer/staff visibility separation on ticket threads
- report snapshot generation for Flow datasets

### 14.3 End-to-end tests

Required end-to-end scenarios:

1. admin creates workflow and activates it
2. workflow trigger fires from supported source entity after transaction commit
3. in-app plus email notification is generated and tracked
4. email failure leads to retry and operator visibility
5. portal customer logs in, opens ticket, replies, and sees updated status
6. staff views the reply internally and responds
7. Intel view reflects updated ticket/delivery/workflow counts

### 14.4 Regression focus

Regression testing must cover:

- Phase 17 cron jobs
- existing notifications list behavior
- internal ticket management
- portal invoice and statement flows
- approval request behavior
- Books/Docs/Pay triggers already wired into Flow

---

## 15. Non-Functional Requirements

### 15.1 Security

- portal collaboration must be customer-scoped and session-bound
- attachment access must be authorization-checked
- internal-only operational details must never leak to customers
- operator/admin actions must remain protected by current role controls

### 15.2 Performance

- ticket inbox and delivery console must remain performant on realistic org volumes
- analytics snapshot generation should complete within acceptable cron windows
- workflow and policy management pages should not degrade under moderate scale

### 15.3 Reliability

- retries must be bounded
- cron routes must be safe under repeated execution
- dead-letter handling must be operator-visible and recoverable

### 15.4 Auditability

- all critical operational changes must be attributable
- source module/source ref should be preserved where possible
- escalation and replay behavior must have immutable event history

### 15.5 Product usability

- admin configuration should be understandable to SME operators
- operator consoles should surface failure reason and next action clearly
- portal collaboration should feel calm and predictable, not like an internal admin screen

---

## 16. Environment Variables

Phase 18 should continue to use existing environment variables where possible and add only what is required for delivery operations.

Expected variables:

- `CRON_SECRET`
- existing email provider configuration
- storage-related variables for attachments

Potential Phase 18 additions if required by implementation:

- `FLOW_DELIVERY_RETRY_BASE_MINUTES`
- `FLOW_DELIVERY_MAX_ATTEMPTS`
- `FLOW_ANALYTICS_SNAPSHOT_BATCH_SIZE`

Guideline:

- avoid introducing unnecessary environment complexity when existing shared configuration is sufficient

---

## 17. Risk Register

### Risk 1

Admin configuration becomes too complex for SME operators.

**Mitigation:** use guided forms, bounded options, and explicit validation messaging.

### Risk 2

Delivery retries create duplicate user-visible notifications or duplicate email sends.

**Mitigation:** split `Notification` from `NotificationDelivery`, enforce idempotent retry semantics, and audit replay actions.

### Risk 3

Portal collaboration leaks internal-only ticket data.

**Mitigation:** explicit reply visibility model, strict customer-scoped queries, and test coverage for forbidden visibility.

### Risk 4

Operational reporting drifts from source-of-truth counts.

**Mitigation:** snapshot reconciliation checks, deterministic report definitions, and source-vs-snapshot QA.

### Risk 5

Phase 18 scope expands into a generic support platform or omnichannel messaging project.

**Mitigation:** keep the phase bounded to invoice/payment-centric collaboration and in-app + email delivery only.

---

## 18. Branch Strategy and PR Workflow

Phase 18 should be implemented as a multi-sprint branch program with isolated, reviewable increments.

Recommended strategy:

```text
master
└── feature/phase-18.1
└── feature/phase-18.2
└── feature/phase-18.3
└── feature/phase-18.4
└── feature/phase-18.5
```

### PR expectations

Each sprint PR should include:

- scope summary
- schema/migration notes
- route/action additions
- cron/job additions or changes
- plan gate changes
- test evidence
- known limitations

### Agile delivery expectation

Each sprint should produce:

- a clear objective
- epic ownership
- scoped deliverables
- explicit dependencies
- demo-ready output
- an acceptance gate

### Final delivery rule

The engineering team should treat Phase 18 as a product-operability phase.

Success is not only that the code exists.

Success is that:

- admins can configure it
- operators can run it
- customers can collaborate with it
- leadership can measure it
- QA can validate it

That is the standard required for this phase.
