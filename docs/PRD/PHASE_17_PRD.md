# Phase 17 PRD — Slipwise One
## SW Flow Orchestration 2.0 + SLA, Escalation, and Automation Control Center

**Version:** 1.0  
**Date:** 2026-04-13  
**Prepared by:** Codex Engineering Assistant  
**Parent Company:** Zenxvio  
**Product:** Slipwise One

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Post Phase 16](#2-current-state-post-phase-16)
3. [Phase 17 Objectives and Non-Goals](#3-phase-17-objectives-and-non-goals)
4. [Sprint 17.1 — Workflow Control Foundation](#4-sprint-171--workflow-control-foundation)
5. [Sprint 17.2 — SLA, Escalation, and Scheduling Orchestration](#5-sprint-172--sla-escalation-and-scheduling-orchestration)
6. [Sprint 17.3 — Workflow Builder, Run History, and Operational Observability](#6-sprint-173--workflow-builder-run-history-and-operational-observability)
7. [Database Schema Additions](#7-database-schema-additions)
8. [Route Map](#8-route-map)
9. [Background Jobs](#9-background-jobs)
10. [Plan Gates](#10-plan-gates)
11. [Edge Cases and Acceptance Criteria](#11-edge-cases-and-acceptance-criteria)
12. [Test Plan](#12-test-plan)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Environment Variables](#14-environment-variables)
15. [Risk Register](#15-risk-register)
16. [Branch Strategy and PR Workflow](#16-branch-strategy-and-pr-workflow)

---

## 1. Executive Summary

Phase 17 turns Slipwise One's existing workflow-related surfaces into a real operational orchestration layer.

The product now has:

- document lifecycle and receivables automation from earlier phases
- compliance, GST, marketplace, OAuth, webhook, and ecosystem surfaces from Phase 15
- SW Books accounting, reconciliation, AP, and close workflows from Phase 16
- partial SW Flow building blocks already in the repo:
  - approvals
  - tickets
  - notifications
  - jobs
  - recurring invoice rules
  - scheduled sends
  - audit and proxy history

What is still missing is a coherent control plane.

Today, Flow is spread across several isolated pages and models:

- `/app/flow` is still a placeholder
- approvals exist, but not policy-driven approval routing
- tickets exist, but not SLA timers, escalation, or queue discipline
- scheduling exists, but not as one shared execution model
- job logs exist, but not as a proper workflow observability layer

Phase 17 resolves that gap by making **SW Flow** the shared control center for timed work, human approvals, escalation, and operational visibility.

### Strategic outcome

By the end of Phase 17, Slipwise One should support this end-to-end operating model:

1. Financial and document events trigger policy-aware workflow actions.
2. Approvals route to the right role or user based on amount, module, and event type.
3. Tickets and pending approvals have SLA clocks and escalation behavior.
4. Scheduled operational actions run through a unified queue model with retries and dead-letter handling.
5. Admins and operators can inspect what is pending, what failed, what escalated, and what needs intervention from one Flow workspace.

### Business value

| Problem today | Phase 17 outcome |
| --- | --- |
| Workflow behavior is fragmented across modules | SW Flow becomes the shared control center |
| Approval logic is request-based, not policy-based | Approval routing becomes configurable and scalable |
| Tickets are visible, but not governed by service levels | Ticket work gains SLA, escalation, and ownership discipline |
| Timed work exists in multiple module-specific paths | Scheduling becomes a shared operational engine |
| Failures and retries are hard to inspect centrally | Workflow run history and dead-letter visibility become first-class |

### Why this phase now

This is the correct follow-up to Phase 16.

Phase 16 established the accounting and finance system of record. That raises the operational bar for:

- vendor bill approvals
- payment run review and failure handling
- close blockers and follow-up work
- finance notifications and action queues

Without a stronger workflow layer, the product risks having robust domain modules but weak operational control. Phase 17 solves that.

---

## 2. Current State Post Phase 16

Slipwise One now operates as a broad modular monolith with substantial coverage across Docs, Pay, Intel, Settings, and Books.

### Suites and surfaces already live

- `SW Docs`
  - invoices
  - vouchers
  - salary slips
  - templates
  - PDF Studio
- `SW Pay`
  - receivables
  - dunning
  - proofs
  - recurring invoices
  - arrangements
  - send log
  - TDS
- `SW Intel`
  - dashboard
  - reports
  - cash flow
  - GST reports
- `SW Auth & Access`
  - users
  - roles
  - audit
  - proxy access
  - security
  - SSO
  - developer settings
- `SW Books`
  - chart of accounts
  - journals
  - ledger
  - trial balance
  - bank accounts
  - reconciliation
  - vendor bills
  - payment runs
  - close
  - finance reports
- `SW Flow`
  - approvals
  - tickets
  - notifications
  - activity
  - jobs
  - but the Flow suite landing page is still a placeholder

### Existing models Phase 17 must extend, not bypass

Relevant current Prisma models already in the repo:

- `ApprovalRequest`
- `InvoiceTicket`
- `TicketReply`
- `Notification`
- `ActivityLog`
- `ScheduledSend`
- `RecurringInvoiceRule`
- `JobLog`
- `ReportSnapshot`
- `ProxyGrant`
- `AuditLog`

Relevant current cross-module domain models that Flow must integrate with:

- `Invoice`
- `InvoicePayment`
- `Voucher`
- `SalarySlip`
- `VendorBill`
- `PaymentRun`
- `CloseRun`
- `CloseTask`
- `DunningSequence`
- `DunningLog`
- `PaymentArrangement`

### Current workflow gaps

| Existing capability | Current gap |
| --- | --- |
| `ApprovalRequest` | no reusable approval policy engine, no threshold rules, no escalation timers |
| `InvoiceTicket` | no SLA policy, priority, breach tracking, or escalation routing |
| `ScheduledSend` | send scheduling exists, but not a unified scheduled action framework |
| `RecurringInvoiceRule` | recurring exists, but not under a general workflow execution model |
| `JobLog` | execution records exist, but not tied to workflow definitions, step runs, or dead-letter handling |
| `Notification` | in-app notifications exist, but not normalized by workflow severity or source module |
| `ActivityLog` + `AuditLog` | event history exists, but not a coherent run-history surface for workflow state transitions |

### Engineering constraints to respect

Phase 17 must remain consistent with the established application architecture:

- Next.js App Router
- server actions in `actions.ts`
- Prisma-backed modular monolith
- auth and org context via `requireOrgContext()`
- role gating via `hasPermission()` / permission matrix
- plan gating via `src/lib/plans/config.ts`
- cron/job authorization via `CRON_SECRET`
- result shape:
  - `{ success: true, data }`
  - `{ success: false, error }`

### Product interpretation for Phase 17

Phase 17 is not the first introduction of Flow.

It is the phase that makes Flow operationally credible by:

- consolidating existing Flow pieces
- introducing missing policy and queue primitives
- connecting Books, Pay, and Docs events into one orchestration model

---

## 3. Phase 17 Objectives and Non-Goals

### Objectives

| # | Objective | Sprint |
| --- | --- | --- |
| O1 | Turn `SW Flow` into a real control-center workspace | 17.1 |
| O2 | Add approval policy configuration by module, action, and threshold | 17.1 |
| O3 | Add queue-centric workflow views for approvals, tickets, and scheduled actions | 17.1 |
| O4 | Introduce ticket SLA policies with first-response and resolution targets | 17.2 |
| O5 | Add escalation rules for tickets, approvals, and failed operations | 17.2 |
| O6 | Unify scheduled operational actions under a shared execution model | 17.2 |
| O7 | Add retries, dead-letter state, and manual replay for workflow actions | 17.2 |
| O8 | Add bounded workflow definitions for trigger → action automation | 17.3 |
| O9 | Add workflow run history and step-level execution visibility | 17.3 |
| O10 | Add operational Flow metrics for queue health, SLA breach, and turnaround time | 17.3 |
| O11 | Connect Flow to Books-critical operations such as vendor bill approval and payment run failure handling | 17.1–17.3 |
| O12 | Keep all workflow actions audit-attributable for actor, represented actor, and system execution | 17.1–17.3 |

### Non-goals

Phase 17 intentionally does **not** include:

1. inventory, procurement, purchase ordering, or goods receipt workflows
2. budgeting, forecasting, fixed assets, or consolidation accounting
3. large SW Pixel feature expansion
4. broad PDF Studio expansion beyond workflow touchpoints
5. a full low-code or BPMN-style workflow designer
6. production infrastructure migration or AWS execution work
7. major pricing redesign
8. tax portal submission automation beyond Phase 15/16 surfaces
9. broad CRM or helpdesk productization unrelated to invoice and finance workflows

---

## 4. Sprint 17.1 — Workflow Control Foundation

**Goal:** Turn Flow from a placeholder/fragmented suite into a real operational control center, and introduce policy-based approvals that work across modules.

**Migration:** `20260413000001_phase17_sprint1_flow_foundation`

### 4.1 SW Flow suite home

Replace the current placeholder Flow landing page with a real control-center overview.

#### Required widgets

- pending approvals summary
- open tickets summary
- overdue tickets summary
- jobs requiring intervention
- dead-letter or failed action count
- recent escalations
- recent activity feed

#### UX expectation

The page should feel like an operator console, not a marketing placeholder.

It should answer:

- what needs attention now
- what is overdue
- what failed
- which queues are growing

### 4.2 Approval policy engine

Current approval requests are document-specific and manually requested. Phase 17 introduces reusable policy configuration.

#### New approval policy behavior

- orgs can define approval policies by module and action
- policies support threshold-based routing
- policies can target:
  - role
  - specific user
  - fallback role
- policies can define escalation wait times
- policies can be active/inactive
- policies can support sequential or single-step approvals

#### Initial supported approval domains

- invoices
- vouchers
- vendor bills
- payment runs
- close-critical finance actions

#### Example policy cases

- invoices above a configured amount require Finance Manager approval
- vouchers above a petty cash threshold require Admin approval
- vendor bills above a configured amount require Finance Manager and then Owner approval
- payment runs above a configured amount require Admin review before execution

### 4.3 Approval queue behavior

The approvals page should become queue-oriented rather than just list-oriented.

#### Required enhancements

- status filters
- queue counts
- due-soon grouping
- overdue grouping
- approver workload view
- escalation indicator
- policy source visibility

#### Approval detail page requirements

- show originating policy
- show requested by / requested for / represented actor
- show document summary and amount
- show current approver and fallback path
- show audit trail of reminders and escalations

### 4.4 Ticket queue foundation

The ticket system exists, but it needs stronger workflow semantics.

#### Extend ticket operations with

- priority:
  - low
  - normal
  - high
  - urgent
- severity:
  - informational
  - blocking
  - finance-critical
  - customer-escalated
- assignment ownership
- due-at timestamps
- queue filters by:
  - status
  - priority
  - assignee
  - overdue
  - source

#### Scope discipline

This phase keeps tickets tightly connected to:

- invoices
- payment issues
- proof disputes
- books-triggered customer or operator follow-up

It should not become a generic company helpdesk.

### 4.5 Activity and audit normalization

All Flow actions in this sprint must emit consistent records into:

- `ActivityLog`
- `AuditLog`
- `Notification` where relevant

This includes:

- approval request created
- approval reassigned
- approval escalated
- ticket assigned
- ticket replied
- ticket escalated
- workflow policy changed

### Sprint 17.1 acceptance gate

- Flow home is a real operational dashboard
- approval routing is policy-driven for at least invoices, vouchers, vendor bills, and payment runs
- tickets can be prioritized, assigned, and filtered as queues
- audit and activity trails reflect all new Flow actions

---

## 5. Sprint 17.2 — SLA, Escalation, and Scheduling Orchestration

**Goal:** Make workflow actions time-aware, escalation-aware, and operationally reliable.

**Migration:** `20260413000002_phase17_sprint2_sla_escalation_scheduling`

### 5.1 Ticket SLA policies

Add configurable SLA behavior at org level.

#### Required SLA dimensions

- first response target
- resolution target
- severity-based target variation
- business-hours-aware option
- calendar-day fallback option

#### Supported ticket policy mapping

- default org-wide ticket SLA
- per-category overrides
- optional priority-based overrides

#### Ticket SLA fields and behavior

- `firstResponseDueAt`
- `resolutionDueAt`
- `firstRespondedAt`
- `breachedAt`
- `breachType`
- `escalationLevel`

The system must compute deadlines when:

- ticket is created
- ticket priority changes
- ticket is reassigned
- ticket moves in or out of resolved states

### 5.2 Approval escalation timers

Approval requests should support time-based escalation.

#### Required behavior

- pending approvals can have due-at deadlines
- reminders fire before breach
- if approval remains pending past threshold:
  - notify current approver
  - escalate to fallback approver or configured role
  - record escalation history

#### Example use cases

- vendor bill approval pending more than 24 hours escalates to Finance Manager
- payment run approval pending more than 12 hours escalates to Admin
- close blocker approval pending more than configured threshold escalates to Owner

### 5.3 Shared scheduled action engine

Slipwise currently has module-specific timed operations:

- scheduled sends
- recurring invoice generation
- dunning steps
- reminders
- close-related follow-ups

Phase 17 introduces a shared scheduling model.

#### Core scheduling requirements

- one canonical scheduled action record
- typed action categories
- due timestamp
- execution state
- retry counter
- next retry timestamp
- terminal dead-letter state
- last error summary
- originating module reference

#### Initial supported action families

- send invoice email
- send reminder
- generate recurring invoice
- escalate approval
- escalate ticket
- notify finance queue
- create workflow follow-up task

### 5.4 Retry and dead-letter handling

#### Required behavior

- retry attempts for transient failures
- configurable retry schedule by action family
- dead-letter state after max retries
- manual replay from Flow jobs/workflow pages
- cancellation for obsolete pending actions

#### Operational policy

Dead-letter state is not silent failure.

When an action dead-letters:

- create an operator notification
- expose it on Flow dashboard
- persist full failure payload for troubleshooting

### 5.5 Flow jobs console

The jobs console should evolve from generic job log viewing into a queue-control view.

#### Required capabilities

- filter by:
  - module
  - action type
  - status
  - retry state
  - dead-letter state
- inspect payload and failure reason
- replay eligible action
- cancel eligible pending action
- link back to source entity and source workflow run

### Sprint 17.2 acceptance gate

- ticket SLA clocks work and breach conditions are visible
- approval requests escalate after configured timeout
- scheduled operational work uses a shared execution model
- failed actions retry correctly and dead-letter explicitly after exhaustion
- operators can inspect and replay failed actions from Flow

---

## 6. Sprint 17.3 — Workflow Builder, Run History, and Operational Observability

**Goal:** Add bounded automation definitions and a first-class run history so teams can configure and inspect operational workflows safely.

**Migration:** `20260413000003_phase17_sprint3_workflow_builder_observability`

### 6.1 Workflow definitions

Add a bounded workflow builder that supports approved trigger and action templates.

This is intentionally constrained. It is **not** a generic automation platform.

#### Supported trigger families

- invoice issued
- invoice overdue
- payment proof submitted
- ticket opened
- approval requested
- approval breached
- vendor bill submitted
- payment run failed
- close task blocked
- scheduled action dead-lettered

#### Supported action families

- assign ticket
- create approval request
- send notification
- schedule reminder
- escalate to role
- enqueue scheduled action
- create internal follow-up record
- notify org admins

#### Workflow definition rules

- org-scoped
- versioned
- active/inactive
- strict validation of supported trigger/action combinations
- dry-run validation before activation

### 6.2 Workflow run history

Every execution instance should be inspectable.

#### Required run data

- workflow definition version
- trigger type and trigger source
- actor or system source
- correlated org/module/entity reference
- step-by-step result
- started at / completed at
- failure reason where applicable

#### Step run requirements

- pending
- skipped
- succeeded
- failed
- retried
- dead-lettered

### 6.3 Operational observability

Add a dedicated workflow observability surface under Flow.

#### Required metrics

- pending approval count
- overdue approval count
- open ticket count
- SLA breach count
- dead-letter queue count
- workflow success rate
- workflow failure rate
- median approval turnaround time
- median ticket resolution time
- queue backlog growth trend

#### Reporting and snapshot behavior

Flow metrics should be snapshot-friendly so that:

- Intel can consume summary data later
- admins can export queue and SLA summaries

### 6.4 Cross-module Flow integrations

Phase 17 must prove value by integrating with existing modules, especially Books.

#### Mandatory cross-module integrations

- vendor bill submission can route through approval policy
- payment run failure can create escalation and notification flows
- close blockers can generate tracked workflow actions
- overdue invoice event can trigger a bounded Flow rule
- payment proof issue can generate or enrich a ticket/escalation path

### Sprint 17.3 acceptance gate

- orgs can activate bounded trigger/action workflows
- workflow runs are inspectable end-to-end
- dead-letter and replay behavior is visible per run
- Flow metrics accurately reflect queue health and SLA performance

---

## 7. Database Schema Additions

### 7.1 New enums

```prisma
enum ApprovalPolicyStatus {
  ACTIVE
  INACTIVE
}

enum ApprovalStepMode {
  SINGLE
  SEQUENTIAL
}

enum TicketPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum TicketSeverity {
  INFORMATIONAL
  BLOCKING
  FINANCE_CRITICAL
  CUSTOMER_ESCALATED
}

enum WorkflowStatus {
  DRAFT
  ACTIVE
  PAUSED
  ARCHIVED
}

enum WorkflowRunStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
  DEAD_LETTERED
  CANCELLED
}

enum ScheduledActionStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
  DEAD_LETTERED
  CANCELLED
}
```

### 7.2 New models

```prisma
model ApprovalPolicy {
  id              String               @id @default(cuid())
  orgId           String
  name            String
  module          String
  eventType       String
  status          ApprovalPolicyStatus @default(ACTIVE)
  stepMode        ApprovalStepMode     @default(SINGLE)
  escalateAfterMins Int?
  createdBy       String               @db.Uuid
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, module, status])
  @@map("approval_policy")
}

model ApprovalPolicyRule {
  id                 String   @id @default(cuid())
  policyId           String
  sequence           Int
  minAmount          Decimal? @db.Decimal(14, 2)
  maxAmount          Decimal? @db.Decimal(14, 2)
  approverRole       String?
  approverUserId     String?  @db.Uuid
  fallbackRole       String?
  fallbackUserId     String?  @db.Uuid
  createdAt          DateTime @default(now())

  @@index([policyId, sequence])
  @@map("approval_policy_rule")
}

model TicketSlaPolicy {
  id                     String   @id @default(cuid())
  orgId                  String
  name                   String
  category               String?
  priority               String?
  firstResponseTargetMins Int
  resolutionTargetMins   Int
  businessHoursOnly      Boolean  @default(false)
  isDefault              Boolean  @default(false)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, isDefault])
  @@map("ticket_sla_policy")
}

model TicketEscalationRule {
  id               String   @id @default(cuid())
  orgId            String
  name             String
  breachType       String
  afterMins        Int
  targetRole       String?
  targetUserId     String?  @db.Uuid
  notifyOrgAdmins  Boolean  @default(false)
  createdAt        DateTime @default(now())

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, breachType])
  @@map("ticket_escalation_rule")
}

model WorkflowDefinition {
  id          String         @id @default(cuid())
  orgId       String
  name        String
  triggerType String
  status      WorkflowStatus @default(DRAFT)
  version     Int            @default(1)
  config      Json
  createdBy   String         @db.Uuid
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, status])
  @@map("workflow_definition")
}

model WorkflowStep {
  id           String   @id @default(cuid())
  workflowId   String
  sequence     Int
  actionType   String
  config       Json
  createdAt    DateTime @default(now())

  @@index([workflowId, sequence])
  @@map("workflow_step")
}

model WorkflowRun {
  id              String            @id @default(cuid())
  workflowId      String
  orgId           String
  triggerType     String
  sourceModule    String
  sourceEntityType String?
  sourceEntityId  String?
  actorId         String?           @db.Uuid
  representedId   String?           @db.Uuid
  status          WorkflowRunStatus @default(PENDING)
  startedAt       DateTime          @default(now())
  completedAt     DateTime?
  failureReason   String?

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, status, startedAt])
  @@index([sourceModule, sourceEntityId])
  @@map("workflow_run")
}

model WorkflowStepRun {
  id               String            @id @default(cuid())
  workflowRunId    String
  workflowStepId   String
  status           WorkflowRunStatus @default(PENDING)
  attemptCount     Int               @default(0)
  startedAt        DateTime?
  completedAt      DateTime?
  failureReason    String?

  @@index([workflowRunId, status])
  @@map("workflow_step_run")
}

model ScheduledAction {
  id               String                @id @default(cuid())
  orgId            String
  actionType       String
  sourceModule     String
  sourceEntityType String?
  sourceEntityId   String?
  workflowRunId    String?
  payload          Json
  status           ScheduledActionStatus @default(PENDING)
  scheduledAt      DateTime
  attemptCount     Int                   @default(0)
  maxAttempts      Int                   @default(3)
  nextRetryAt      DateTime?
  lastError        String?
  createdAt        DateTime              @default(now())
  completedAt      DateTime?

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, status, scheduledAt])
  @@index([nextRetryAt, status])
  @@map("scheduled_action")
}

model DeadLetterAction {
  id                String   @id @default(cuid())
  scheduledActionId String   @unique
  orgId             String
  actionType        String
  sourceModule      String
  failureReason     String
  payload           Json
  deadLetteredAt    DateTime @default(now())
  resolvedAt        DateTime?
  resolvedBy        String?  @db.Uuid

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@index([orgId, deadLetteredAt])
  @@map("dead_letter_action")
}
```

### 7.3 Existing model extensions

#### `InvoiceTicket`

Add:

```prisma
priority            TicketPriority @default(NORMAL)
severity            TicketSeverity @default(INFORMATIONAL)
dueAt               DateTime?
firstResponseDueAt  DateTime?
resolutionDueAt     DateTime?
firstRespondedAt    DateTime?
breachedAt          DateTime?
breachType          String?
escalationLevel     Int @default(0)
sourceModule        String?
```

#### `ApprovalRequest`

Add:

```prisma
policyId           String?
policyRuleId       String?
dueAt              DateTime?
escalatedAt        DateTime?
escalationLevel    Int      @default(0)
lastReminderAt     DateTime?
```

#### `Notification`

Add:

```prisma
category      String?
severity      String?
sourceModule  String?
sourceRef     String?
```

#### `JobLog`

Add:

```prisma
workflowRunId     String?
scheduledActionId String?
terminalState     String?
```

#### `ReportSnapshot`

Extend supported `reportType` usage to include:

- `flow.queue_summary`
- `flow.sla_breaches`
- `flow.workflow_runs`
- `flow.approval_turnaround`

### 7.4 Migration strategy

Use three Prisma migrations aligned to the three sprints:

1. `phase17_sprint1_flow_foundation`
2. `phase17_sprint2_sla_escalation_scheduling`
3. `phase17_sprint3_workflow_builder_observability`

Avoid schema pushes. Use committed migrations only.

---

## 8. Route Map

### App routes

#### Flow suite

- `/app/flow`
- `/app/flow/approvals`
- `/app/flow/approvals/[requestId]`
- `/app/flow/policies`
- `/app/flow/policies/[policyId]`
- `/app/flow/tickets`
- `/app/flow/tickets/[ticketId]`
- `/app/flow/sla`
- `/app/flow/automations`
- `/app/flow/automations/[workflowId]`
- `/app/flow/jobs`
- `/app/flow/dead-letter`
- `/app/flow/activity`

### API routes

Suggested route family:

- `GET /api/flow/queue-summary`
- `GET /api/flow/workflow-runs`
- `GET /api/flow/workflow-runs/:id`
- `POST /api/flow/scheduled-actions/replay`
- `POST /api/flow/scheduled-actions/cancel`
- `POST /api/flow/escalations/run`
- `POST /api/flow/workflows/execute-test`

### Server action families

#### Approval policy actions

- create policy
- update policy
- archive policy
- assign policy
- preview policy match

#### SLA policy actions

- create SLA policy
- update SLA policy
- set default policy

#### Ticket queue actions

- assign ticket
- change priority
- change severity
- mark responded
- escalate ticket

#### Job/workflow actions

- replay scheduled action
- cancel scheduled action
- retry dead-letter action
- activate workflow
- pause workflow
- clone workflow version

---

## 9. Background Jobs

Phase 17 should formalize Flow-owned background jobs rather than scattering them by module.

### Required jobs

#### `flow.process-scheduled-actions`

- scans due `ScheduledAction` rows
- executes eligible actions
- writes `JobLog`
- writes `WorkflowRun` / `WorkflowStepRun` where applicable

#### `flow.process-ticket-sla`

- scans open tickets
- computes SLA breaches
- applies escalation rules
- creates notifications and activity records

#### `flow.process-approval-escalations`

- scans pending approvals
- applies reminder and escalation logic
- records escalation history

#### `flow.reconcile-dead-letter-summary`

- aggregates unresolved dead-letter items
- updates dashboard metrics / notifications

### Cron and auth requirements

- all cron routes require `CRON_SECRET`
- all jobs must be idempotent
- all jobs must tolerate retries
- all jobs must persist source module and source entity references

---

## 10. Plan Gates

Add these plan gates in `src/lib/plans/config.ts`:

| Gate | Purpose |
| --- | --- |
| `approvalPolicies` | policy-based approval routing |
| `ticketSla` | SLA policy and breach tracking |
| `workflowAutomation` | bounded trigger/action workflows |
| `workflowRunHistory` | detailed run and step execution visibility |
| `opsControlCenter` | advanced Flow dashboard, dead-letter, replay tools |

### Recommended entitlement

| Plan | Access |
| --- | --- |
| Free | basic existing tickets/notifications only |
| Starter | approval/ticket views, no advanced policy automation |
| Pro | approval policies + SLA policies |
| Enterprise | workflow automation + dead-letter/replay + advanced escalation |

---

## 11. Edge Cases and Acceptance Criteria

### Approval edge cases

- threshold boundary exactly equals policy amount
- requester and approver are the same user
- approver loses role after request creation
- fallback approver missing
- approval escalates after reassignment
- books-originated approval references deleted/archived source documents

### Ticket edge cases

- customer ticket created without assignment
- internal-only replies should not be exposed externally
- SLA recalculation after priority change
- reopening a resolved ticket must restore resolution SLA behavior correctly
- duplicate escalations must not fire for the same breach window

### Scheduling edge cases

- source entity no longer valid when scheduled action becomes due
- scheduled action becomes obsolete because ticket/approval already resolved
- repeated execution attempts on transient failures
- replay of dead-letter item after source configuration changed

### Cross-module acceptance criteria

- vendor bill submission can create and follow approval policy correctly
- payment run failure can create Flow escalation and operator notification
- overdue invoice event can create or escalate a ticket/workflow action
- close blocker actions can appear in Flow queues and logs

### Workflow acceptance criteria

- workflow definitions validate before activation
- unsupported trigger/action combinations are rejected
- workflow runs remain inspectable after partial failure
- step-level retries do not create duplicate final outcomes

---

## 12. Test Plan

### Unit tests

- approval policy selection logic
- threshold rule matching
- SLA clock computation
- escalation rule timing
- retry schedule generation
- dead-letter transition rules
- workflow trigger validation

### Integration tests

- approval request escalation flow
- ticket SLA breach escalation flow
- scheduled action retry and replay flow
- workflow run creation and step-run recording
- audit attribution for actor vs represented vs system

### App/action tests

- `/app/flow/approvals` policy-backed queue behavior
- `/app/flow/tickets` assignment and priority behavior
- `/app/flow/jobs` replay/cancel operations
- `/app/flow/automations` create/activate/pause flows

### End-to-end scenarios

1. Invoice ticket created, assigned, replied to, and resolved within SLA
2. Ticket breaches first response SLA and escalates to fallback owner
3. Vendor bill approval request escalates after timeout
4. Payment run failure creates queued operator action and dead-letter after retries
5. Workflow rule on overdue invoice creates a follow-up action and logs full run history

### Regression coverage

Ensure no regressions in:

- existing approval request behavior
- existing ticket reply flow
- scheduled sends
- recurring invoice generation
- dunning job execution
- Books approval and close-related access controls

---

## 13. Non-Functional Requirements

### Reliability

- all workflow jobs must be idempotent
- no duplicate escalation or duplicate replay side effects
- dead-letter handling must be explicit and recoverable

### Performance

- Flow overview should load core queue widgets within acceptable admin-dashboard latency
- queue pages must paginate and filter efficiently
- large workflow run histories must be queryable without blocking operational pages

### Security

- all Flow admin surfaces must respect role and module permissions
- replay and cancellation actions must be permission-gated
- represented/proxy actions must remain audit-visible
- workflow payloads must avoid leaking secrets into UI-visible logs

### Observability

- all scheduled and workflow actions must log:
  - org
  - source module
  - source entity
  - action type
  - result
  - failure reason if applicable

### Product coherence

- SW Flow must remain a bounded orchestration layer
- do not turn Flow into a second generic app inside the app

---

## 14. Environment Variables

Phase 17 should continue using the existing environment model and add only what is necessary.

### Existing expected variables

- `DATABASE_URL`
- `DIRECT_URL`
- `CRON_SECRET`
- email delivery variables
- SMS delivery variables where already configured

### Optional new variables

- `FLOW_SLA_GRACE_MINUTES`
  - optional global grace buffer for SLA jobs
- `FLOW_MAX_REPLAY_ATTEMPTS`
  - optional default replay cap for scheduled/dead-letter actions
- `FLOW_BUSINESS_HOURS_TIMEZONE_FALLBACK`
  - fallback timezone when org setting missing

These should remain optional. Prefer org settings and DB-driven config over env-driven product rules.

---

## 15. Risk Register

### Risk 1 — Workflow sprawl

If Phase 17 tries to become a full automation platform, scope will explode.

**Mitigation:** keep automation bounded to approved trigger/action templates.

### Risk 2 — Silent failure complexity

Adding retries and dead-letter logic without a proper operator console will create hidden operational debt.

**Mitigation:** make dead-letter and replay first-class in the same phase.

### Risk 3 — Policy complexity outruns usability

Approval/SLA policy depth can become too hard for SME admins to configure.

**Mitigation:** ship opinionated defaults and narrow policy surfaces first.

### Risk 4 — Cross-module coupling

Flow may become tightly entangled with Books, Pay, and Docs in brittle ways.

**Mitigation:** require source-module references and keep shared execution primitives generic.

### Risk 5 — Duplicate execution

Retries, cron overlap, and manual replay can cause duplicate side effects.

**Mitigation:** enforce idempotency keys and terminal-state checks on all scheduled actions.

---

## 16. Branch Strategy and PR Workflow

### Agile delivery model

Phase 17 should be executed in **3 agile sprints** with a focused workstream model rather than one massive branch.

### Suggested workstreams

#### WS-A — Flow foundation and policy engine

- Flow dashboard
- approval policies
- queue summaries

#### WS-B — SLA and escalation

- ticket SLA
- approval escalation
- escalation notifications

#### WS-C — Scheduling and execution engine

- `ScheduledAction`
- retries
- dead-letter
- replay/cancel

#### WS-D — Workflow builder and run history

- workflow definitions
- workflow runs
- observability dashboard

### Branch conventions

- main phase branch:
  - `feature/phase-17-flow-orchestration`
- workstream branches:
  - `feature/phase-17-ws-a-flow-foundation`
  - `feature/phase-17-ws-b-sla-escalation`
  - `feature/phase-17-ws-c-scheduled-actions`
  - `feature/phase-17-ws-d-workflow-builder`

### PR sequencing

1. schema and policy foundation
2. SLA and escalation
3. scheduled actions and dead-letter
4. workflow builder and observability
5. remediation PRs if needed

### Definition of done for the phase

Phase 17 is complete when:

- Flow home is a real control center
- approval routing is policy-backed across key modules
- ticket SLA and escalation run reliably
- scheduled operational actions use one shared execution model
- failed actions are inspectable and replayable
- bounded workflows can be configured and inspected
- cross-module auditability remains intact

---

## Final Product Interpretation

Phase 17 is the phase that makes Slipwise One operationally governable.

It does not add a new product category.

It makes the existing suite act like one coordinated system:

- Docs creates work
- Pay chases and tracks work
- Books formalizes financially important work
- Flow governs the work
- Intel later explains the work

That is the correct next step after Phase 16.
