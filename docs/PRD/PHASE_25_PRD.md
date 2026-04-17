# Phase 25: SW Flow Automation Intelligence, Developer Platform & Payroll Operations

**Document Version:** 1.0
**Date:** April 2026
**Phase Sequence:** Phase 25 (follows Phase 24: SW Pay — Payment Gateway & Intelligent Collections)
**Branch Strategy:** `feature/phase-25` (branched from `master` after Phase 24 merge)
**Sprint Sub-branches:** `feature/phase-25-sprint-25-1` through `feature/phase-25-sprint-25-5`
**All Sprint PRs target:** `feature/phase-25` (never `master` directly)
**Merge to master:** Only after all 5 sprint PRs are approved, merged, and the pre-master audit passes

**Prepared by:** Slipwise One Engineering
**Product:** Slipwise One
**Primary suites:** SW> Flow, Developer Platform, SW Docs (Payroll Operations)
**Supporting suites:** SW Auth & Access, SW Intel, SW> Pay

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Strategic Context — Master Plan Alignment](#2-strategic-context--master-plan-alignment)
3. [Current Baseline — What Already Exists](#3-current-baseline--what-already-exists)
4. [Phase 25 Objectives and Non-Goals](#4-phase-25-objectives-and-non-goals)
5. [Operating Principles](#5-operating-principles)
6. [Sprint 25.1 — Visual Workflow Automation Builder](#6-sprint-251--visual-workflow-automation-builder)
7. [Sprint 25.2 — Advanced Approval Chains & Escalation Engine](#7-sprint-252--advanced-approval-chains--escalation-engine)
8. [Sprint 25.3 — Developer Platform & REST API Access](#8-sprint-253--developer-platform--rest-api-access)
9. [Sprint 25.4 — Integration Hub (Zapier, Make, Tally, Webhooks)](#9-sprint-254--integration-hub-zapier-make-tally-webhooks)
10. [Sprint 25.5 — Payroll Operations Foundation](#10-sprint-255--payroll-operations-foundation)
11. [Complete Database Schema Changes](#11-complete-database-schema-changes)
12. [Route Map](#12-route-map)
13. [API and Integration Surface](#13-api-and-integration-surface)
14. [Background Jobs and Operational Workflows](#14-background-jobs-and-operational-workflows)
15. [Permissions, Plan Gates, and Access Rules](#15-permissions-plan-gates-and-access-rules)
16. [Edge Cases and Acceptance Criteria](#16-edge-cases-and-acceptance-criteria)
17. [Test Plan](#17-test-plan)
18. [Non-Functional Requirements](#18-non-functional-requirements)
19. [Environment Variables and External Dependencies](#19-environment-variables-and-external-dependencies)
20. [Risk Register](#20-risk-register)
21. [Branch Strategy and PR Workflow](#21-branch-strategy-and-pr-workflow)

---

## 1. Executive Summary

Phase 25 delivers three major strategic expansions that have been deferred across the first 24 phases:

1. **SW Flow Automation Intelligence** — Activates the existing `WorkflowDefinition`, `WorkflowStep`, `WorkflowRun`, and `WorkflowStepRun` schema models with a visual no-code automation builder. Users can define trigger-condition-action workflows (e.g., "when invoice is overdue by 3 days → send reminder + create ticket + notify manager") without writing a single line of code.

2. **Developer Platform & Integration Hub** — Activates the existing `OAuthApp` and `OAuthAuthorization` schema models to provide a full REST API with scoped API keys, OAuth 2.0 app registration, a webhook management console, and first-class connectors for Zapier, Make.com, and Tally ERP.

3. **Payroll Operations Foundation** — Builds a structured, production-ready payroll run engine on top of the existing `SalarySlip`, `SalaryComponent`, `SalaryPreset`, and `Employee` models. Delivers bulk payroll runs, CTC-to-take-home calculation, statutory deduction handling (PF, ESI, TDS), and payroll register exports — without claiming to be a full statutory filing or compliance engine.

### Why these three together?

After Phase 24's payment OS, the most significant remaining gaps in Slipwise One are:
- **Automation** — Users still manually trigger every workflow. The backbone (WorkflowDefinition/Run models) exists but is dormant.
- **Integration** — Enterprise customers demand API access and integration with tools they already use (Tally, Zoho, Zapier).
- **Payroll** — Every organization that uses Salary Slips wants to run payroll, not just create one-off slips. The schema supports it; the UI and logic don't yet.

Phase 25 completes the commercial readiness arc and positions Slipwise One for its first enterprise and mid-market sales conversations.

---

## 2. Strategic Context — Master Plan Alignment

The Slipwise One Master PRD v1.1 explicitly defines SW> Flow as:

> *"The workflow and control suite. Scope: approvals, ticketing, notifications, scheduling engine, workflow orchestration, proxy handling, operational control actions, activity flow across documents."*

**Prior phases have built:**
- Approvals (Phase 14) — basic voucher/invoice approval flows
- Ticketing (Phase 14) — invoice ticket model and UI
- Notifications (Phase 15) — notification center
- Scheduling engine (Phase 15) — ScheduledAction + Trigger.dev cron
- Proxy control (Phase 12) — ProxyGrant model + audit trail
- Activity feed (Phase 16) — ActivityLog and DocumentEvent

**What has never been built:**
- **Workflow orchestration** — The `WorkflowDefinition` / `WorkflowStep` / `WorkflowRun` models were built in Phase 16 and extended in Phase 17 but have never been exposed as a user-facing visual builder.
- **No-code automation rules** — Users cannot define "IF this happens, THEN do that" logic without developer intervention.

The Master PRD also defines SW Auth & Access as including:
> *"API access, OAuth app registration"*

This directly maps to the Developer Platform sprint.

For Payroll, the master PRD says the early goal is **salary slip storage and HR access control**, with payroll engine as a natural evolution. After 24 phases, the salary slip + employee infrastructure is mature enough to support a real payroll run engine.

---

## 3. Current Baseline — What Already Exists

### 3.1 Schema Models (built, not wired to UI)

| Model | Status | What's Missing |
|-------|--------|----------------|
| `WorkflowDefinition` | Schema exists, not user-editable | Visual builder, trigger catalog |
| `WorkflowStep` | Schema exists | Action catalog, condition evaluator |
| `WorkflowRun` | Schema exists, not triggered from UI | Execution engine wiring |
| `WorkflowStepRun` | Schema exists | Output capture, retry logic |
| `OAuthApp` | Schema exists, no UI | App registration UI, token issuance |
| `OAuthAuthorization` | Schema exists | OAuth consent flow |
| `SalaryPreset` | Schema + basic UI exists | Bulk payroll run engine |
| `Employee` | Full CRUD exists | Payroll-specific employment fields |
| `SalaryComponent` | Exists per-slip | Reusable component library, CTC structure |
| `SalarySlip` | Full creation exists | Batch generation, payroll run grouping |

### 3.2 Pages Already Built

| Route | State |
|-------|-------|
| `/app/flow/approvals` | Basic approval list + action |
| `/app/flow/tickets` | Ticket list, create, reply |
| `/app/flow/activity` | Activity feed (read-only) |
| `/app/flow/schedules` | Scheduled action viewer |
| `/app/flow/notifications` | Notification center |
| `/app/docs/salary-slips` | Salary slip CRUD, list, export |
| `/app/docs/salary-slips/new` | Salary slip creation form |
| `/app/settings/integrations` | Stub page |
| `/app/settings/developer` | Webhook management (Phase 22) |

### 3.3 Infrastructure That Enables Phase 25

- `WorkflowDefinition` / `WorkflowStep` / `WorkflowRun` / `WorkflowStepRun` — the graph execution model
- `OAuthApp` / `OAuthAuthorization` — the OAuth 2.0 model
- `AuditLog` — action logging for all workflow runs
- `ScheduledAction` + Trigger.dev — the scheduler that will execute workflows
- `ApiWebhookEndpoint` / `ApiWebhookDelivery` — existing outbound webhook models
- `Notification` + `NotificationDelivery` — notification dispatch
- `Employee` / `SalarySlip` / `SalaryComponent` / `SalaryPreset` — payroll foundations

---

## 4. Phase 25 Objectives and Non-Goals

### 4.1 Objectives

1. **Activate the workflow engine** — expose `WorkflowDefinition` CRUD with a visual trigger-step builder; let users run workflows manually and via triggers (invoice state change, payment received, due date threshold, ticket opened).
2. **Ship advanced approval chains** — multi-step approvals with escalation rules, deadline-based auto-escalation, threshold-based skip conditions.
3. **Launch the developer platform** — REST API with personal access tokens + OAuth 2.0 app registration; scoped API key management; complete webhook console.
4. **Build the Integration Hub** — native Zapier and Make.com trigger/action definitions; Tally XML import/export for invoices and vouchers; custom webhook event catalog.
5. **Deliver the payroll run engine** — CTC component structure, payroll run (bulk `SalarySlip` generation), TDS and deduction logic (calculation only, no e-filing), payroll register export (PDF + XLSX), employee self-service portal page for payslips.

### 4.2 Non-Goals (explicitly out of scope)

- **Statutory e-filing** — No PF ECR, ESI challan, TDS returns, or Form 24Q generation (that is Phase 26 or later).
- **Payroll payout disbursement** — No direct bank transfer integration for salary credits.
- **AI-powered workflow suggestions** — Intelligence layer for workflow recommendations is deferred.
- **Full ERP accounting integrations** — Busy, Zoho Books, QuickBooks deep sync is deferred.
- **Advanced OCR pipeline** — Automated document data extraction from uploaded files is deferred.
- **Multi-entity consolidated payroll** — Single-org payroll only in this phase.
- **Tally real-time sync** — Import/export only (XML batch files), not live sync.

---

## 5. Operating Principles

### 5.1 Activate the existing schema, don't reinvent it

WorkflowDefinition, WorkflowStep, OAuthApp — these models were designed and approved. Phase 25 wires them to real user interfaces and execution engines. Do not alter the schema shape unless a genuine correctness issue is found.

### 5.2 Automation must be safe by default

Every workflow action that mutates data (create document, mark paid, send email) must be:
- **Org-scoped** — cannot cross organization boundaries
- **Auditable** — logged in AuditLog with `workflowRunId` reference
- **Idempotent** — if the trigger fires twice, the action must not double-execute
- **Reversible trace** — the user can see exactly what a workflow run did and why

### 5.3 API access must be least-privilege

OAuth apps and API keys must declare scopes at creation time. The API must enforce scope on every request. There is no wildcard/superuser API key for non-admin users.

### 5.4 Payroll is a structured business record, not a spreadsheet

A payroll run is not a batch of individually created salary slips. It is a `PayrollRun` entity that groups slips, validates totals, applies run-level adjustments, and produces a single auditable register. Individual slips are immutable once the run is finalized.

### 5.5 Integration connectors must be testable in isolation

Every Zapier trigger and Make.com action must have a standalone `/api/integrations/...` route that can be tested without the Zapier/Make runtime. This makes debugging practical.

---

## 6. Sprint 25.1 — Visual Workflow Automation Builder

### 6.1 Objective

Expose the `WorkflowDefinition` / `WorkflowStep` schema to users via a visual automation builder at `/app/flow/automations`. Let users define trigger-based workflows using a step canvas and activate them so they run automatically when trigger conditions are met.

### 6.2 Scope

#### A. Workflow Automation List (`/app/flow/automations`)

- Table of all `WorkflowDefinition` records for the org
- Columns: name, trigger type, step count, status (active/inactive/draft), last run, created by
- Actions per row: Edit, Duplicate, Enable/Disable, Delete (soft), View Run History
- "Create Automation" button → opens builder

#### B. Workflow Builder (`/app/flow/automations/new` and `/app/flow/automations/[id]/edit`)

The builder is a **three-panel layout**:
- **Left panel**: Trigger selector + saved step library
- **Center canvas**: Sequential step chain (with branching in Sprint 25.2)
- **Right panel**: Step configuration panel (changes based on selected step)

**Trigger Catalog (Phase 25.1 scope):**

| Trigger ID | Display Name | Payload | Notes |
|-----------|-------------|---------|-------|
| `invoice.overdue` | Invoice becomes overdue | `{ invoiceId, orgId, daysPastDue }` | Fires on cron check |
| `invoice.paid` | Invoice marked paid | `{ invoiceId, orgId, amountPaid }` | Fires on state change |
| `invoice.created` | New invoice created | `{ invoiceId, orgId }` | Fires on create action |
| `ticket.opened` | New support ticket opened | `{ ticketId, orgId, invoiceId }` | Fires on ticket create |
| `proof.uploaded` | Payment proof uploaded | `{ proofId, orgId, invoiceId }` | Fires on proof upload |
| `payment.received` | Payment received via Razorpay | `{ paymentId, orgId, invoiceId }` | Fires on webhook |
| `schedule.cron` | Fixed schedule (daily/weekly/monthly) | `{ cronExpression, orgId }` | Manual cron trigger |
| `manual` | Manually triggered by user | `{ triggeredBy, orgId }` | Always available |

**Action Catalog (Phase 25.1 scope):**

| Action ID | Display Name | Inputs | Notes |
|-----------|-------------|--------|-------|
| `send_email` | Send Email | recipient, subject, body (template vars) | Uses Brevo |
| `create_notification` | Create In-App Notification | userId/role, title, message | Creates `Notification` |
| `create_ticket` | Create Support Ticket | subject, category, assigneeUserId | Creates `InvoiceTicket` |
| `update_invoice_status` | Update Invoice Status | status (enum), reason | Validates state machine |
| `wait` | Wait / Delay | duration (hours/days) | Deferred execution via ScheduledAction |
| `webhook_call` | Call Webhook | url, method, headers, body template | Outbound HTTP |
| `add_audit_log` | Add Audit Entry | action, description | Creates `AuditLog` entry |

**Condition Logic (Phase 25.1 scope — simple conditions only):**

Each step can have an optional condition that must be true for the step to execute:
- `invoice.amount > X`
- `invoice.daysOverdue > X`
- `customer.totalOutstanding > X`
- `invoice.status == X`

Conditions use a simple `{ field, operator, value }` JSON structure stored in `WorkflowStep.conditionJson`.

#### C. WorkflowDefinition Data Model (updates to existing schema)

The existing schema has the right structure. Phase 25.1 adds/updates:

```prisma
model WorkflowDefinition {
  id          String   @id @default(cuid())
  orgId       String
  name        String
  description String?
  status      WorkflowStatus  @default(DRAFT)  // DRAFT | ACTIVE | INACTIVE | ARCHIVED
  triggerType String          // maps to trigger catalog ID above
  triggerConfig Json           // trigger-specific configuration (e.g., daysPastDue: 3)
  steps       WorkflowStep[]
  runs        WorkflowRun[]
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  org         Organization @relation(fields: [orgId], references: [id])
  
  @@index([orgId, status])
}

model WorkflowStep {
  id             String   @id @default(cuid())
  workflowId     String
  stepOrder      Int
  actionType     String   // maps to action catalog ID above
  actionConfig   Json     // action-specific configuration
  conditionJson  Json?    // optional pre-condition for this step
  stepRuns       WorkflowStepRun[]
  
  workflow       WorkflowDefinition @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  
  @@index([workflowId, stepOrder])
}

model WorkflowRun {
  id           String      @id @default(cuid())
  workflowId   String
  orgId        String
  status       RunStatus   @default(PENDING)  // PENDING | RUNNING | COMPLETED | FAILED | CANCELLED
  triggerData  Json        // the payload that triggered this run
  startedAt    DateTime?
  completedAt  DateTime?
  errorMessage String?
  stepRuns     WorkflowStepRun[]
  
  workflow     WorkflowDefinition @relation(fields: [workflowId], references: [id])
  
  @@index([workflowId, status])
  @@index([orgId, startedAt])
}

model WorkflowStepRun {
  id          String   @id @default(cuid())
  runId       String
  stepId      String
  status      RunStatus
  output      Json?
  errorMessage String?
  executedAt  DateTime?
  
  run         WorkflowRun  @relation(fields: [runId], references: [id])
  step        WorkflowStep @relation(fields: [stepId], references: [id])
  
  @@index([runId])
}
```

#### D. Workflow Execution Engine

**Location:** `src/lib/flow/workflow-engine.ts` (extend existing file)

**Core functions:**

```typescript
// Dispatch a workflow trigger — called from business logic (invoice state changes, webhook handlers, etc.)
export async function dispatchWorkflowTrigger(
  orgId: string,
  triggerType: string,
  triggerData: Record<string, unknown>
): Promise<void>

// Execute a single WorkflowRun — called by background job
export async function executeWorkflowRun(runId: string): Promise<void>

// Execute a single step within a run
async function executeStep(
  step: WorkflowStep,
  run: WorkflowRun,
  context: WorkflowContext
): Promise<StepOutput>

// Evaluate a condition JSON against the current context
function evaluateCondition(
  conditionJson: unknown,
  context: WorkflowContext
): boolean
```

**Idempotency:** Each trigger dispatch checks if a `WorkflowRun` with `status = PENDING | RUNNING` already exists for the same `workflowId + triggerData.entityId` within a 5-minute window before creating a new run. This prevents duplicate executions from event storms.

**Error handling:** If a step fails:
1. Mark `WorkflowStepRun.status = FAILED` with the error message
2. Mark `WorkflowRun.status = FAILED`
3. Create an `AuditLog` entry: `action = "workflow_run_failed"`
4. Create a `Notification` for the workflow owner: "Automation '{name}' failed on step {N}"

#### E. Run History View (`/app/flow/automations/[id]/runs`)

- Table of `WorkflowRun` records for this workflow
- Columns: run ID (truncated), status, triggered at, completed at, trigger data summary
- Click a run → expand to show all `WorkflowStepRun` records with step name, status, output, and error
- Admin can cancel a PENDING run

#### F. Server Actions

All in `src/app/app/flow/automations/actions.ts`:

```typescript
createWorkflowDefinition(data: CreateWorkflowInput): ActionResult<WorkflowDefinition>
updateWorkflowDefinition(id: string, data: UpdateWorkflowInput): ActionResult<WorkflowDefinition>
deleteWorkflowDefinition(id: string): ActionResult<void>
duplicateWorkflowDefinition(id: string): ActionResult<WorkflowDefinition>
setWorkflowStatus(id: string, status: WorkflowStatus): ActionResult<WorkflowDefinition>
getWorkflowRuns(workflowId: string, page: number): ActionResult<PaginatedRuns>
cancelWorkflowRun(runId: string): ActionResult<void>
triggerWorkflowManually(workflowId: string): ActionResult<WorkflowRun>
```

#### G. Background Job Integration

Add a Trigger.dev job: `executeWorkflowRunJob` triggered by the workflow engine's dispatch. Also add a cron job `processScheduledWorkflowTriggers` that runs every 15 minutes to check for `schedule.cron` and `invoice.overdue` triggers.

### 6.3 Acceptance Criteria

- User can create a workflow with at least one trigger and three action steps
- Workflow activates and fires correctly when the trigger condition is met
- WorkflowRun record is created and status transitions correctly (PENDING → RUNNING → COMPLETED/FAILED)
- All step outputs and errors are visible in the Run History view
- Duplicate trigger protection works (no double execution within 5 minutes for the same entity)
- Disabling a workflow stops new runs from being triggered
- Workflow runs are org-scoped and cannot reference another org's data

---

## 7. Sprint 25.2 — Advanced Approval Chains & Escalation Engine

### 7.1 Objective

Upgrade the basic single-approver model that exists in Phase 14 to a full multi-step approval chain engine with:
- Multiple approver levels (sequential or parallel)
- Threshold-based routing (e.g., invoices over ₹1 lakh go to CFO, under go to Manager)
- Deadline-based auto-escalation
- Delegation support (approver temporarily delegates to another user)
- Approval workflow integration with the automation builder from Sprint 25.1

### 7.2 Scope

#### A. Approval Policy Engine (upgrade `ApprovalPolicy` model)

**Updated schema:**

```prisma
model ApprovalPolicy {
  id          String   @id @default(cuid())
  orgId       String
  name        String
  entityType  String   // "invoice" | "voucher" | "salary_slip" | "payment_modification"
  isActive    Boolean  @default(true)
  description String?
  rules       ApprovalPolicyRule[]
  requests    ApprovalRequest[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  org         Organization @relation(fields: [orgId], references: [id])
  @@index([orgId, entityType, isActive])
}

model ApprovalPolicyRule {
  id              String  @id @default(cuid())
  policyId        String
  ruleOrder       Int     // sequential order (1, 2, 3...)
  approverType    String  // "user" | "role" | "manager_of_creator"
  approverUserId  String? // specific user ID (if approverType = "user")
  approverRole    String? // role name (if approverType = "role")
  thresholdMin    Decimal? // minimum amount for this rule to apply (null = always)
  thresholdMax    Decimal? // maximum amount for this rule to apply (null = no ceiling)
  escalateAfterHours Int? // auto-escalate to next rule after N hours
  allowDelegation Boolean @default(true)
  approvalMode    String  @default("any_one")  // "any_one" | "all_required"
  
  policy          ApprovalPolicy @relation(fields: [policyId], references: [id], onDelete: Cascade)
  @@index([policyId, ruleOrder])
}

model ApprovalRequest {
  id              String          @id @default(cuid())
  orgId           String
  policyId        String
  entityType      String
  entityId        String          // the invoice/voucher/etc. ID
  status          ApprovalStatus  @default(PENDING)
  currentRuleOrder Int            @default(1)
  requestedBy     String          // userId
  requestedAt     DateTime        @default(now())
  completedAt     DateTime?
  decisions       ApprovalDecision[]
  
  policy          ApprovalPolicy @relation(fields: [policyId], references: [id])
  @@index([orgId, entityType, entityId])
  @@index([orgId, status])
}

model ApprovalDecision {
  id              String   @id @default(cuid())
  requestId       String
  ruleOrder       Int
  decidedBy       String   // userId
  delegatedFrom   String?  // original approver userId if delegated
  decision        String   // "approved" | "rejected" | "escalated"
  comment         String?
  decidedAt       DateTime @default(now())
  
  request         ApprovalRequest @relation(fields: [requestId], references: [id])
  @@index([requestId])
}

model ApprovalDelegation {
  id            String   @id @default(cuid())
  orgId         String
  fromUserId    String   // the approver who is delegating
  toUserId      String   // who receives the delegation
  reason        String?
  validFrom     DateTime
  validUntil    DateTime
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  
  @@index([orgId, fromUserId, isActive])
  @@index([toUserId, isActive])
}
```

#### B. Approval Policy Management UI (`/app/settings/approvals`)

- List all approval policies
- Create/edit policy:
  - Name, entity type selector
  - Rule chain builder (add/remove/reorder rules):
    - Rule level (1, 2, 3...)
    - Approver type: specific user, role, or "manager of creator"
    - Amount threshold range (optional)
    - Escalation deadline (optional, in hours)
    - Approval mode: any one / all required
- Enable/disable policy toggle
- View requests under each policy

#### C. Approval Request Flow

When an entity requires approval (based on active policy):
1. `initiateApprovalRequest(entityType, entityId)` — creates `ApprovalRequest`, notifies first-level approvers
2. Approver views pending requests at `/app/flow/approvals` — grouped by entity type
3. Approver approves/rejects with optional comment — creates `ApprovalDecision`
4. If the rule requires "all_required" and not all approvers have decided, request stays pending for that level
5. When a rule level is complete:
   - If approved and there's a next rule level → advance `currentRuleOrder`, notify next approvers
   - If approved and this is the final rule → mark `ApprovalRequest.status = APPROVED`, unlock the entity
   - If rejected → mark `ApprovalRequest.status = REJECTED`, notify requester
6. Auto-escalation: cron job checks for requests past `escalateAfterHours` → advance to next rule automatically

#### D. Delegation Management (`/app/settings/approvals/delegations`)

- Approvers can create/revoke delegations during absence
- Delegation shows in approval request UI: "Acting for {originalApprover}"
- All delegated decisions are logged with `delegatedFrom` field
- Delegation is time-bounded and auto-expires

#### E. High-Value Payment Gate Integration (extends Phase 24 audit work)

Update the "High-Value Payment Gate" from Phase 24 to use the new `ApprovalPolicy` engine:
- Any `confirmReconciliation` or `createPaymentLink` over the org's `highValueThreshold` automatically initiates an `ApprovalRequest` with `entityType = "payment_modification"`
- The payment action is blocked until the approval resolves

#### F. Workflow Builder Integration

Add `require_approval` as a new action type in the workflow builder (Sprint 25.1):
- Action: `require_approval` → `{ entityType, entityId, policyId }`
- Workflow run pauses at this step until the `ApprovalRequest` resolves
- On resolution, the run continues (approved) or terminates (rejected)

### 7.3 Acceptance Criteria

- Multi-step approval policy can be created with at least 3 rule levels
- Amount thresholds correctly route to different approver levels
- Auto-escalation fires correctly when the deadline passes
- Delegation works: delegated user can approve on behalf of original; `delegatedFrom` is logged
- Policy correctly routes "all_required" rule levels
- Entity (invoice/voucher) is correctly unlocked after final approval
- Rejection notifies the requester and halts the chain
- All decisions are in `AuditLog`

---

## 8. Sprint 25.3 — Developer Platform & REST API Access

### 8.1 Objective

Launch the Slipwise One developer platform, providing:
- REST API with scoped personal access tokens (PAT)
- OAuth 2.0 application registration for third-party integrations
- A complete API documentation page (interactive, inline)
- A webhook console upgrade (delivery logs, retry, test events)

### 8.2 Scope

#### A. Personal Access Token Management (`/app/settings/developer/tokens`)

**Schema:**

```prisma
model ApiAccessToken {
  id          String    @id @default(cuid())
  orgId       String
  userId      String
  name        String
  tokenHash   String    @unique  // SHA-256 hash of the actual token
  tokenPrefix String             // first 8 chars for display ("slw_abc1...")
  scopes      String[]           // array of scope strings
  lastUsedAt  DateTime?
  expiresAt   DateTime?          // null = never expires
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())
  
  @@index([orgId, userId])
  @@index([tokenHash])
}
```

**Token format:** `slw_<env>_<32-char-random>` (e.g., `slw_live_a8f3d2b...`)

**Available scopes:**

| Scope | Access |
|-------|--------|
| `invoices:read` | Read invoices |
| `invoices:write` | Create/update invoices |
| `customers:read` | Read customers |
| `customers:write` | Create/update customers |
| `vouchers:read` | Read vouchers |
| `vouchers:write` | Create/update vouchers |
| `salary_slips:read` | Read salary slips |
| `salary_slips:write` | Create/update salary slips |
| `employees:read` | Read employees |
| `employees:write` | Create/update employees |
| `payments:read` | Read payment records |
| `reports:read` | Read reports and exports |
| `webhooks:write` | Manage webhook endpoints |

**UI features:**
- Generate token: name + select scopes → token shown once (copy-to-clipboard) → stored as SHA-256 hash
- List tokens: name, prefix, scopes, last used, expires at, status (active/revoked)
- Revoke token: immediate invalidation

#### B. OAuth 2.0 App Registration (`/app/settings/developer/apps`)

**Activates existing `OAuthApp` and `OAuthAuthorization` models**

**OAuth App fields:**
- App name, description, website, logo URL
- Redirect URIs (one or more)
- Requested scopes (subset of PAT scopes above)
- Client ID (auto-generated) + Client Secret (shown once, stored hashed)
- App status: development / production

**OAuth 2.0 Authorization Code flow:**

1. Third-party app redirects to `/api/oauth/authorize?client_id=...&scope=...&redirect_uri=...&state=...`
2. Slipwise shows consent screen: "App X wants to access your Slipwise data: {scopes}"
3. User approves → `/api/oauth/authorize` redirects to redirect_uri with `?code=...&state=...`
4. Third-party exchanges code for access token at `POST /api/oauth/token`
5. Access token is used as Bearer token on API calls

**Routes:**
- `GET /api/oauth/authorize` — consent screen (with Suspense boundary)
- `POST /api/oauth/authorize` — user approval/rejection
- `POST /api/oauth/token` — code exchange
- `POST /api/oauth/revoke` — token revocation

#### C. REST API Layer (`/api/v1/...`)

**Route structure:**

```
GET    /api/v1/invoices
POST   /api/v1/invoices
GET    /api/v1/invoices/{id}
PATCH  /api/v1/invoices/{id}
DELETE /api/v1/invoices/{id}

GET    /api/v1/customers
POST   /api/v1/customers
GET    /api/v1/customers/{id}
PATCH  /api/v1/customers/{id}

GET    /api/v1/vouchers
POST   /api/v1/vouchers
GET    /api/v1/vouchers/{id}

GET    /api/v1/employees
POST   /api/v1/employees
GET    /api/v1/employees/{id}
PATCH  /api/v1/employees/{id}

GET    /api/v1/salary-slips
POST   /api/v1/salary-slips
GET    /api/v1/salary-slips/{id}

GET    /api/v1/payments
GET    /api/v1/payments/{id}

GET    /api/v1/reports/receivables
GET    /api/v1/reports/invoices
```

**Authentication middleware for `/api/v1/*`:**

```typescript
// src/lib/api/authenticate-api-request.ts
export async function authenticateApiRequest(
  req: NextRequest
): Promise<{ orgId: string; userId: string; scopes: string[] } | null>
```

Resolves both:
- `Authorization: Bearer slw_live_...` → PAT (hash lookup)
- `Authorization: Bearer <oauth_access_token>` → OAuth token (lookup `OAuthAuthorization`)

**Response format:**

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 143
  }
}
```

Errors:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Missing required scope: invoices:write"
  }
}
```

**Rate limiting:** 60 requests/minute per token (using existing Redis rate-limit infrastructure)

#### D. API Documentation (`/docs/api`)

A public-facing interactive API documentation page (no auth required to view):
- Built with inline MDX components + live code examples
- Sections match the resource endpoints above
- Each endpoint shows: method, path, request body schema (Zod), response schema, curl example
- Authentication section explains PAT vs OAuth
- Scope reference table

#### E. Webhook Console Upgrade (`/app/settings/developer/webhooks`)

Upgrade the existing webhook console (Phase 22) with:
- **Delivery logs**: For each `ApiWebhookDelivery`, show HTTP status code, response time, response body preview
- **Retry**: Manual retry button for failed deliveries
- **Test event**: "Send test event" button that fires a sample payload to the endpoint
- **Event filtering**: Per-endpoint event type filter (subscribe only to specific events)

**New webhook events to add to the catalog:**

```typescript
// src/lib/webhooks/event-catalog.ts — extend existing
"workflow.run.completed"
"workflow.run.failed"
"approval.request.created"
"approval.request.approved"
"approval.request.rejected"
"payroll.run.finalized"
"api.token.revoked"
```

### 8.3 Acceptance Criteria

- PAT can be generated, scopes enforced on every API call, revoked immediately
- OAuth 2.0 authorization code flow completes end-to-end with a test client
- `/api/v1/invoices` returns correct org-scoped data for the authenticated token's org
- Missing scope returns `403` with correct error code
- Rate limit returns `429` with `Retry-After` header
- Webhook delivery logs show status code and response body
- Test event fires and delivery log updates
- Retry works for failed deliveries

---

## 9. Sprint 25.4 — Integration Hub (Zapier, Make, Tally, Webhooks)

### 9.1 Objective

Build first-class native connectors for the three most-requested integrations among SME users:
- **Zapier** — so non-technical users can connect Slipwise to 6,000+ apps
- **Make.com (formerly Integromat)** — for power users building multi-step automations
- **Tally ERP** — the most-used accounting software in India; import/export for invoices and vouchers

Also deliver a generic **Custom Webhook** event builder so any integration platform can connect.

### 9.2 Scope

#### A. Zapier Native Integration

**Zapier App:** Published in the Zapier app directory (initially as "invite-only" for beta).

**Triggers (Slipwise → Zapier):**

| Trigger Name | Event | Payload |
|-------------|-------|---------|
| New Invoice Created | `invoice.created` | Full invoice object |
| Invoice Status Changed | `invoice.status_changed` | `{ invoiceId, oldStatus, newStatus }` |
| Payment Received | `payment.received` | `{ invoiceId, amountPaid, method }` |
| New Support Ticket | `ticket.opened` | Full ticket object |
| Proof Uploaded | `proof.uploaded` | `{ invoiceId, proofUrl }` |
| New Customer Created | `customer.created` | Full customer object |
| Payroll Run Finalized | `payroll.run.finalized` | `{ runId, totalAmount, slipCount }` |

**Actions (Zapier → Slipwise):**

| Action Name | API Endpoint | Description |
|-------------|-------------|-------------|
| Create Invoice | `POST /api/v1/invoices` | Create a new draft invoice |
| Create Customer | `POST /api/v1/customers` | Add a new customer |
| Update Invoice Status | `PATCH /api/v1/invoices/{id}` | Change invoice status |
| Send Invoice | Action on invoice | Trigger invoice send |

**Implementation:**

Zapier triggers are implemented as polling triggers (not webhooks) because it avoids the need for Zapier webhook subscription management:
- Polling endpoint: `GET /api/v1/zapier/triggers/{triggerName}?since={lastPollTimestamp}`
- Returns new records since the last poll in reverse chronological order
- Each record must have a unique `id` field (Zapier deduplication requirement)

**Auth:** OAuth 2.0 using the OAuth app flow from Sprint 25.3.

#### B. Make.com (Integromat) Native Integration

Similar architecture to Zapier but uses Make's webhook-based instant trigger model.

**Instant Triggers:** Make registers a webhook URL with Slipwise on module activation. Slipwise fires events to that URL via `ApiWebhookDelivery`.

**Make Modules:**
- Search Invoices
- Get Invoice by ID
- Create Invoice
- Update Invoice
- List Customers
- Create Customer
- Watch New Invoices (instant trigger)
- Watch Payment Received (instant trigger)

**Implementation:** A Make.com "custom app" JSON definition file + hosted IML functions for data transformation.

#### C. Tally ERP Import/Export

**Why Tally matters:** Tally ERP is used by ~80% of Indian SMEs for accounting. They need to move invoice and voucher data between Slipwise and Tally without re-entering.

**Import flow (`/app/settings/integrations/tally/import`):**

1. User exports Tally data as XML (standard Tally export format)
2. User uploads the XML file to Slipwise
3. Parser reads `TALLYMESSAGE` → `LEDGER`, `VOUCHER` entries
4. Preview table: shows parsed records, flags duplicates (by `voucherNumber` matching)
5. User confirms → records imported as `Voucher` or `Invoice` records with `importSource = "tally"`

**Export flow (`/app/settings/integrations/tally/export`):**

1. User selects date range + document types (invoices / vouchers / both)
2. Slipwise generates a Tally-compatible XML file:
   - Invoices → `SALES VOUCHER` entries
   - Vouchers → `PAYMENT/RECEIPT VOUCHER` entries
3. User downloads the XML and imports into Tally

**Supported Tally versions:** Tally Prime 2.x (XML format compatible with Tally 9+ as well)

**Schema addition:**

```prisma
model TallyImportLog {
  id           String   @id @default(cuid())
  orgId        String
  fileName     String
  importedAt   DateTime @default(now())
  importedBy   String
  recordCount  Int
  errorCount   Int
  status       String   // "completed" | "partial" | "failed"
  errorDetails Json?
  
  @@index([orgId, importedAt])
}
```

#### D. Custom Webhook Event Builder

Upgrade the webhook console to support event subscriptions per endpoint:

```prisma
model ApiWebhookEndpoint {
  // existing fields...
  subscribedEvents  String[]  // array of event type strings; empty = all events
}
```

UI addition: Multi-select for event types when creating/editing a webhook endpoint.

#### E. Integration Hub Dashboard (`/app/settings/integrations`)

Replace the existing stub with a real dashboard:
- Cards for each integration: Zapier, Make, Tally, Custom Webhooks
- Status: Connected / Not connected
- Last event sent/received
- Quick action buttons (Connect, Configure, Test, Disconnect)
- Link to the developer docs

### 9.3 Acceptance Criteria

- Zapier trigger "New Invoice Created" fires correctly when an invoice is created
- Zapier action "Create Customer" creates a customer record in Slipwise and returns its ID
- Tally XML import correctly parses a standard Tally Prime export file
- Tally XML export generates valid XML that can be imported into Tally Prime
- Make.com instant trigger fires within 5 seconds of the triggering event
- Integration Hub dashboard correctly reflects connected/disconnected status
- Custom webhook endpoint with filtered event subscription only receives subscribed events

---

## 10. Sprint 25.5 — Payroll Operations Foundation

### 10.1 Objective

Build a structured payroll run engine on top of the existing salary slip and employee models. Deliver:
- CTC (Cost to Company) structure per employee
- Payroll run — bulk salary slip generation for all active employees in a period
- Statutory deduction calculation (PF, ESI, TDS, Professional Tax) — calculation only, no e-filing
- Payroll register (PDF + XLSX export)
- Employee self-service payslip portal page

### 10.2 Scope

#### A. Employee CTC Structure (extends `Employee` model)

Add employment type, CTC components, and tax profile:

```prisma
model Employee {
  // existing fields...
  employmentType    String?   // "full_time" | "part_time" | "contract"
  ctcAnnual         Decimal?  // Annual CTC in INR
  effectiveFrom     DateTime? // CTC effective date
  panNumber         String?   // for TDS
  pfAccountNumber   String?   // PF UAN
  esiNumber         String?   // ESI IP Number
  bankAccountNumber String?   // for salary credit reference
  bankIfscCode      String?
  taxRegime         String    @default("new")  // "old" | "new" (Indian tax regime)
  pfOptOut          Boolean   @default(false)  // opted out of PF?
  esiOptOut         Boolean   @default(false)  // not eligible (salary > ₹21K)
  
  ctcComponents     EmployeeCtcComponent[]
  payrollSlips      PayrollRunItem[]
}

model EmployeeCtcComponent {
  id           String   @id @default(cuid())
  employeeId   String
  componentName String  // "Basic", "HRA", "Special Allowance", "PF Contribution", etc.
  componentType String  // "earning" | "deduction" | "employer_contribution"
  calculationType String // "fixed" | "percent_of_basic" | "percent_of_ctc"
  value         Decimal  // fixed amount or percentage
  isActive      Boolean  @default(true)
  
  employee      Employee @relation(fields: [employeeId], references: [id])
  @@index([employeeId, isActive])
}
```

#### B. Payroll Run Engine (`/app/pay/payroll`)

**New models:**

```prisma
model PayrollRun {
  id              String         @id @default(cuid())
  orgId           String
  period          String         // "2026-04" (YYYY-MM format)
  status          PayrollStatus  @default(DRAFT)
  // DRAFT → PROCESSING → REVIEW → FINALIZED | CANCELLED
  
  workingDays     Int            // standard working days in period
  totalGross      Decimal        @default(0)
  totalDeductions Decimal        @default(0)
  totalNetPay     Decimal        @default(0)
  totalPfEmployer Decimal        @default(0)
  totalEsiEmployer Decimal       @default(0)
  
  runItems        PayrollRunItem[]
  createdBy       String
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  finalizedAt     DateTime?
  finalizedBy     String?
  
  org             Organization @relation(fields: [orgId], references: [id])
  @@unique([orgId, period])
  @@index([orgId, status])
}

model PayrollRunItem {
  id              String   @id @default(cuid())
  runId           String
  employeeId      String
  salarySlipId    String?  // null until finalized
  
  attendedDays    Int      // actual days worked
  lossOfPayDays   Int      @default(0)
  
  grossPay        Decimal
  basicPay        Decimal
  hra             Decimal  @default(0)
  specialAllowance Decimal @default(0)
  otherEarnings   Decimal  @default(0)
  
  pfEmployee      Decimal  @default(0)   // 12% of basic, capped at ₹1800
  esiEmployee     Decimal  @default(0)   // 0.75% of gross (if gross ≤ ₹21K)
  tdsDeduction    Decimal  @default(0)   // pro-rated monthly TDS
  professionalTax Decimal  @default(0)   // state-dependent
  otherDeductions Decimal  @default(0)
  
  totalDeductions Decimal
  netPay          Decimal
  
  pfEmployer      Decimal  @default(0)   // 13% of basic (PF + admin + EDLI)
  esiEmployer     Decimal  @default(0)   // 3.25% of gross
  
  status          String   @default("draft")  // "draft" | "finalized" | "on_hold"
  holdReason      String?
  
  run             PayrollRun @relation(fields: [runId], references: [id])
  employee        Employee   @relation(fields: [employeeId], references: [id])
  salarySlip      SalarySlip? @relation(fields: [salarySlipId], references: [id])
  
  @@unique([runId, employeeId])
  @@index([runId])
}
```

#### C. Payroll Run Workflow (UI at `/app/pay/payroll`)

**Step 1: Create Run**
- Select period (month + year)
- Confirm working days
- System validates: no existing finalized run for the same period
- Draft run created

**Step 2: Process**
- System calculates each active employee's salary based on `EmployeeCtcComponent`
- Attendance adjustments: user can modify `attendedDays` / `lossOfPayDays` per employee
- Statutory deductions calculated:
  - **PF (Employee):** 12% of Basic, capped at ₹1,800/month
  - **PF (Employer):** 13% of Basic (3.67% PF + 0.5% EDLI + 8.33% Pension + 0.5% admin) capped
  - **ESI (Employee):** 0.75% of Gross Pay if Gross ≤ ₹21,000/month
  - **ESI (Employer):** 3.25% of Gross Pay if Gross ≤ ₹21,000/month
  - **Professional Tax:** State-based slab (configurable in org settings, default Maharashtra slabs)
  - **TDS:** (Monthly Gross × 12 − deductions − exemptions) × tax rate / 12, based on `taxRegime`
- Summary: total gross, total deductions, total net pay, employer contribution

**Step 3: Review**
- Table of all `PayrollRunItem` records
- Editable: `attendedDays`, `lossOfPayDays`, `otherDeductions`, `otherEarnings`, hold status
- Any edit re-triggers calculation for that employee
- Put individual employee "on hold" with reason
- Run-level variance vs previous month (if prior run exists)

**Step 4: Finalize**
- Requires `admin` role
- If `ApprovalPolicy` exists for `payroll_run` entity type → triggers approval flow (from Sprint 25.2)
- On finalize:
  1. Create `SalarySlip` records for all non-held employees
  2. Link `PayrollRunItem.salarySlipId` to created slips
  3. Mark `PayrollRun.status = FINALIZED`
  4. Fire `payroll.run.finalized` webhook event
  5. Fire notification to all employees (if email configured)
  6. Log `AuditLog` entry

#### D. Statutory Deduction Configuration (`/app/settings/payroll`)

- Professional Tax slab editor (state + salary ranges + amounts)
- PF opt-out toggle per org (for organizations below 20 employees not mandated)
- ESI threshold: currently ₹21,000 gross/month (configurable if regulation changes)
- TDS parameters: old regime / new regime default

**Schema:**

```prisma
model PayrollSettings {
  id                    String   @id @default(cuid())
  orgId                 String   @unique
  pfEnabled             Boolean  @default(true)
  esiEnabled            Boolean  @default(true)
  defaultTaxRegime      String   @default("new")  // "old" | "new"
  professionalTaxState  String?  // "MH" | "KA" | "WB" etc.
  professionalTaxSlabs  Json     // array of { minSalary, maxSalary, monthlyTax }
  
  org                   Organization @relation(fields: [orgId], references: [id])
}
```

#### E. Payroll Register Export

**PDF Export:**
- Header: org branding (logo, name, address)
- Period: "Payroll for April 2026"
- Summary table: total employees, total gross, total deductions, total net pay, employer PF, employer ESI
- Detail table: one row per employee — name, designation, gross, PF, ESI, TDS, PT, other, net pay
- Footer: authorized signatory line + generated by Slipwise One

**XLSX Export:**
- Sheet 1: Summary (same as PDF summary)
- Sheet 2: Employee detail (same as PDF detail table, plus individual CTC component breakdown)
- Sheet 3: Employer contribution summary (PF + ESI + other employer costs)

**Library:** `xlsx` (already installed from Phase 24) for XLSX; Puppeteer for PDF.

#### F. Employee Self-Service Portal Page (`/portal/[orgSlug]/payslips`)

Extends the existing customer portal (`/portal/[orgSlug]/`) — but for employees. Requires a separate portal auth mechanism:
- Employee portal uses a different JWT secret (`EMPLOYEE_PORTAL_JWT_SECRET`)
- Login: employee email + org slug → OTP verification → employee portal session
- View: list of their `SalarySlip` records from finalized `PayrollRun`s
- Download: individual payslip PDF
- View: gross/net pay, deduction breakdown per month

**Route:** `GET /portal/[orgSlug]/payslips` — employee payslip history
**Route:** `GET /portal/[orgSlug]/payslips/[slipId]` — individual payslip detail + download

**Privacy:** Employees can only see their own slips. No cross-employee visibility.

### 10.3 Acceptance Criteria

- Payroll run for a 10-employee org can be created, processed, reviewed, and finalized
- PF calculation: employee with ₹25,000 basic → employee PF = ₹1,800 (capped), employer PF = ₹3,250 (13%)
- ESI calculation: employee with ₹20,000 gross → employee ESI = ₹150 (0.75%), employer ESI = ₹650 (3.25%)
- ESI exclusion: employee with ₹22,000 gross → ESI = ₹0 for both employee and employer
- Professional Tax: Maharashtra employee with ₹25,000 gross → PT = ₹200/month
- Finalized run creates `SalarySlip` records and links them correctly
- PDF register renders with correct totals
- XLSX register has all three sheets with correct data
- Employee portal shows only the logged-in employee's slips
- Re-running a finalized payroll period is blocked (unique constraint on `orgId + period`)

---

## 11. Complete Database Schema Changes

### 11.1 New Models

| Model | Sprint | Purpose |
|-------|--------|---------|
| `ApiAccessToken` | 25.3 | Personal Access Tokens for REST API |
| `ApprovalDelegation` | 25.2 | Time-bounded approver delegation |
| `ApprovalDecision` | 25.2 | Individual approval decisions per request |
| `TallyImportLog` | 25.4 | Audit log for Tally import operations |
| `PayrollRun` | 25.5 | Payroll run entity (one per org per period) |
| `PayrollRunItem` | 25.5 | Per-employee row in a payroll run |
| `EmployeeCtcComponent` | 25.5 | CTC component definitions per employee |
| `PayrollSettings` | 25.5 | Org-level payroll configuration |

### 11.2 Modified Models

| Model | Sprint | Changes |
|-------|--------|---------|
| `WorkflowDefinition` | 25.1 | Add `triggerConfig Json`, `status WorkflowStatus` enum |
| `WorkflowStep` | 25.1 | Add `conditionJson Json?` |
| `ApprovalPolicy` | 25.2 | Add `isActive`, restructure `ApprovalPolicyRule` |
| `ApprovalPolicyRule` | 25.2 | Add threshold range, escalation hours, delegation flag |
| `ApprovalRequest` | 25.2 | Add `currentRuleOrder`, `decisions` relation |
| `Employee` | 25.5 | Add employment type, CTC, statutory, bank fields |
| `ApiWebhookEndpoint` | 25.4 | Add `subscribedEvents String[]` |

### 11.3 New Prisma Enums

```prisma
enum WorkflowStatus {
  DRAFT
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum RunStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

enum PayrollStatus {
  DRAFT
  PROCESSING
  REVIEW
  FINALIZED
  CANCELLED
}

enum ApprovalStatus {
  PENDING
  APPROVED
  REJECTED
  ESCALATED
  EXPIRED
}
```

### 11.4 Migration Safety

- All new models use `@default` values — safe for existing rows
- `WorkflowDefinition` modifications: add nullable `triggerConfig Json?` first, migrate existing rows, then make required
- `Employee` new fields are all optional (`String?`, `Decimal?`) — no breaking change
- `ApiWebhookEndpoint.subscribedEvents` defaults to `[]` — no breaking change

---

## 12. Route Map

### New Routes — Sprint 25.1 (Workflow Automation)

| Route | Type | Description |
|-------|------|-------------|
| `GET /app/flow/automations` | Page | Workflow automation list |
| `GET /app/flow/automations/new` | Page | Workflow builder (new) |
| `GET /app/flow/automations/[id]/edit` | Page | Workflow builder (edit) |
| `GET /app/flow/automations/[id]/runs` | Page | Run history |
| `POST /api/internal/workflow/dispatch` | API | Internal trigger dispatch |
| `POST /api/cron/workflow-triggers` | Cron | Schedule + overdue trigger check |

### New Routes — Sprint 25.2 (Approvals)

| Route | Type | Description |
|-------|------|-------------|
| `GET /app/settings/approvals` | Page | Approval policy management |
| `GET /app/settings/approvals/new` | Page | Create policy |
| `GET /app/settings/approvals/[id]/edit` | Page | Edit policy |
| `GET /app/settings/approvals/delegations` | Page | Manage delegations |
| `GET /app/flow/approvals` | Page | Upgrade — pending requests with chain view |

### New Routes — Sprint 25.3 (Developer Platform)

| Route | Type | Description |
|-------|------|-------------|
| `GET /app/settings/developer/tokens` | Page | PAT management |
| `GET /app/settings/developer/apps` | Page | OAuth app management |
| `GET /app/settings/developer/apps/new` | Page | Register OAuth app |
| `GET /docs/api` | Public Page | API documentation |
| `GET /api/oauth/authorize` | API | OAuth consent screen |
| `POST /api/oauth/authorize` | API | User approval |
| `POST /api/oauth/token` | API | Token exchange |
| `POST /api/oauth/revoke` | API | Token revocation |
| `GET /api/v1/*` | API | REST API endpoints |

### New Routes — Sprint 25.4 (Integrations)

| Route | Type | Description |
|-------|------|-------------|
| `GET /app/settings/integrations` | Page | Integration Hub dashboard (upgrade) |
| `GET /app/settings/integrations/tally/import` | Page | Tally import wizard |
| `GET /app/settings/integrations/tally/export` | Page | Tally export configurator |
| `GET /api/v1/zapier/triggers/[name]` | API | Zapier polling endpoint |
| `POST /api/integrations/make/[event]` | API | Make.com webhook receiver |

### New Routes — Sprint 25.5 (Payroll)

| Route | Type | Description |
|-------|------|-------------|
| `GET /app/pay/payroll` | Page | Payroll runs list |
| `GET /app/pay/payroll/new` | Page | Create payroll run |
| `GET /app/pay/payroll/[id]` | Page | Payroll run workspace (process/review/finalize) |
| `GET /app/settings/payroll` | Page | Payroll settings (PT slabs, PF/ESI config) |
| `GET /portal/[orgSlug]/payslips` | Portal Page | Employee payslip list |
| `GET /portal/[orgSlug]/payslips/[id]` | Portal Page | Individual payslip view |
| `GET /api/portal/employee/auth` | API | Employee portal OTP auth |

---

## 13. API and Integration Surface

### 13.1 Internal Service Layer

```
src/lib/flow/
  workflow-engine.ts      ← dispatch + execute (Sprint 25.1)
  action-handlers/        ← one file per action type (Sprint 25.1)
    send-email.ts
    create-notification.ts
    create-ticket.ts
    update-invoice-status.ts
    webhook-call.ts
    require-approval.ts   ← Sprint 25.2

src/lib/approvals/
  approval-engine.ts      ← initiate, decide, escalate (Sprint 25.2)
  delegation-service.ts   ← check active delegations (Sprint 25.2)

src/lib/api/
  authenticate-api-request.ts   ← PAT + OAuth auth (Sprint 25.3)
  scope-check.ts                ← scope enforcement (Sprint 25.3)
  rate-limiter.ts               ← per-token rate limit (Sprint 25.3)

src/lib/integrations/
  tally/
    parser.ts             ← XML → domain objects (Sprint 25.4)
    generator.ts          ← domain objects → Tally XML (Sprint 25.4)
  zapier/
    polling.ts            ← trigger data queries (Sprint 25.4)
  make/
    event-dispatcher.ts   ← outbound Make webhook (Sprint 25.4)

src/lib/payroll/
  calculation-engine.ts   ← CTC → gross/deductions/net (Sprint 25.5)
  statutory/
    pf.ts                 ← PF calculation rules (Sprint 25.5)
    esi.ts                ← ESI calculation rules (Sprint 25.5)
    tds.ts                ← TDS pro-rated monthly (Sprint 25.5)
    professional-tax.ts   ← state slab lookup (Sprint 25.5)
  register/
    pdf-generator.ts      ← payroll register PDF (Sprint 25.5)
    xlsx-generator.ts     ← payroll register XLSX (Sprint 25.5)
```

### 13.2 Webhook Events Added in Phase 25

All events dispatched through the existing `dispatchWebhookEvent` function:

```typescript
"workflow.run.completed"     // { runId, workflowId, status, completedAt }
"workflow.run.failed"        // { runId, workflowId, errorMessage }
"approval.request.created"   // { requestId, entityType, entityId, policyName }
"approval.request.approved"  // { requestId, entityType, entityId, finalApprover }
"approval.request.rejected"  // { requestId, entityType, entityId, rejectedBy, reason }
"payroll.run.finalized"      // { runId, period, employeeCount, totalNetPay }
"api.token.revoked"          // { tokenPrefix, revokedBy }
```

---

## 14. Background Jobs and Operational Workflows

### Sprint 25.1

| Job | Trigger | Action |
|-----|---------|--------|
| `processWorkflowTriggersJob` | Cron every 15 min | Check `invoice.overdue` + `schedule.cron` triggers |
| `executeWorkflowRunJob` | On workflow dispatch | Execute steps for a specific `WorkflowRun` |
| `retryFailedWorkflowJob` | Cron every hour | Retry `FAILED` runs that have remaining retry budget |

### Sprint 25.2

| Job | Trigger | Action |
|-----|---------|--------|
| `processApprovalEscalationsJob` | Cron every hour | Check `escalateAfterHours`, advance overdue requests |
| `expireApprovalDelegationsJob` | Cron every hour | Mark expired delegations `isActive = false` |

### Sprint 25.4

| Job | Trigger | Action |
|-----|---------|--------|
| `processIntegrationDeliveriesJob` | On event | Fire Zapier polling events + Make webhooks |
| `retryWebhookDeliveriesJob` | Cron every 10 min | Retry failed `ApiWebhookDelivery` records |

### Sprint 25.5

| Job | Trigger | Action |
|-----|---------|--------|
| `payrollFinalizeJob` | On finalize action | Create SalarySlip records, dispatch webhook |
| `employeePortalOtpJob` | On OTP request | Send OTP email to employee |

---

## 15. Permissions, Plan Gates, and Access Rules

### 15.1 Role-Based Access

| Feature | Minimum Role |
|---------|-------------|
| Create/edit workflow automations | `admin` |
| View workflow run history | `finance_manager` or above |
| Manually trigger a workflow | `admin` |
| Create approval policies | `admin` |
| Approve/reject requests | Assigned approver (any role) |
| Manage approval delegations | Self (the approver) or `admin` |
| Generate/revoke API tokens | `admin` |
| Register OAuth apps | `admin` |
| Access REST API | Requires valid PAT or OAuth token |
| Tally import | `admin` |
| Tally export | `finance_manager` or above |
| Create/run payroll | `admin` or `hr_manager` |
| Finalize payroll | `admin` only |
| Configure payroll settings | `admin` only |
| View employee portal payslips | Employee (own slips only) |

### 15.2 Plan Gates

| Feature | Free | Pro | Business | Enterprise |
|---------|------|-----|----------|------------|
| Workflow automations | 2 active | 10 active | 25 active | Unlimited |
| OAuth apps | 0 | 1 | 3 | Unlimited |
| API calls/month | 0 | 5,000 | 25,000 | Unlimited |
| Approval policy levels | 1 | 2 | 5 | Unlimited |
| Tally import/export | ✗ | ✗ | ✓ | ✓ |
| Zapier integration | ✗ | ✓ | ✓ | ✓ |
| Payroll runs | ✗ | ✗ | ✓ (10 emp) | Unlimited |
| Employee portal | ✗ | ✗ | ✓ | ✓ |

Add these to `src/lib/plans/config.ts`:
```typescript
activeWorkflowAutomations: { free: 2, pro: 10, business: 25, enterprise: Infinity }
oauthApps: { free: 0, pro: 1, business: 3, enterprise: Infinity }
apiCallsPerMonth: { free: 0, pro: 5000, business: 25000, enterprise: Infinity }
approvalPolicyLevels: { free: 1, pro: 2, business: 5, enterprise: Infinity }
payrollEmployeesPerRun: { free: 0, pro: 0, business: 10, enterprise: Infinity }
```

### 15.3 IDOR and Authorization Guards

Every server action and API route must:
- Verify `orgId` from session matches the entity's `orgId`
- For API routes: resolve `orgId` from the authenticated token, never from request body
- For workflow execution: verify workflow's `orgId` matches the triggering org
- For payroll: verify employee belongs to the same org as the payroll run
- For employee portal: verify employee's `organizationId` matches the portal's `orgSlug`-resolved org

---

## 16. Edge Cases and Acceptance Criteria

### Sprint 25.1 — Workflow Engine

| Edge Case | Expected Behavior |
|-----------|------------------|
| Workflow trigger fires while another run is already PENDING | Skip new run (idempotency window: 5 min) |
| Action step fails (e.g., email send fails) | Mark step + run as FAILED, notify owner |
| Workflow is disabled while a run is in PENDING | Run is cancelled on next execution attempt |
| `wait` step with 72h delay | Creates `ScheduledAction` for 72h later; run status = RUNNING until then |
| Workflow references a deleted user as notification recipient | Use org admin as fallback; log warning |

### Sprint 25.2 — Approvals

| Edge Case | Expected Behavior |
|-----------|------------------|
| Approver is not a member of the org | Policy rule is skipped; escalate to next level |
| Approver is also the document creator | Flag conflict; require a different approver (configurable) |
| Delegation chain (A → B → A) | Circular delegation is blocked at creation |
| All approvers on a level are on leave/delegated | Escalate to org admin after timeout |
| Approval request entity is deleted | Mark request as CANCELLED |

### Sprint 25.3 — API

| Edge Case | Expected Behavior |
|-----------|------------------|
| Token with expired `expiresAt` | Return `401 Unauthorized` |
| Request with revoked token | Return `401 Unauthorized` |
| Missing required scope | Return `403 Forbidden` with `{ error: { code: "FORBIDDEN", requiredScope: "..." } }` |
| Rate limit exceeded | Return `429` with `Retry-After: 60` |
| OAuth code used twice | Return `400 invalid_grant` |
| OAuth redirect_uri mismatch | Return `400 redirect_uri_mismatch` |

### Sprint 25.4 — Integrations

| Edge Case | Expected Behavior |
|-----------|------------------|
| Tally XML with duplicate invoice number | Flag as duplicate in preview; user must confirm or skip |
| Tally XML with unsupported ledger type | Import what's parseable; report unsupported rows in error log |
| Zapier polling returns no new records | Return empty array (not 404) |
| Make.com webhook endpoint is unreachable | Mark delivery as FAILED; add to retry queue |

### Sprint 25.5 — Payroll

| Edge Case | Expected Behavior |
|-----------|------------------|
| Employee with no CTC components | Block them from run with validation error: "CTC not configured" |
| Payroll run for a period that already exists and is finalized | Block with `409 Conflict` |
| Employee salary crosses ESI threshold mid-year | Recalculate ESI = 0 from that month |
| TDS calculation with no declared investments | Default to ₹0 deductions; minimum slab applies |
| Finalize payroll with held employees | Finalize all non-held; held employees excluded from register |
| Employee portal: employee's org account is deactivated | Block portal login; return `403` |

---

## 17. Test Plan

### Sprint 25.1 — Vitest

```
src/lib/flow/__tests__/
  workflow-engine.test.ts       — dispatchWorkflowTrigger, idempotency, step execution
  action-handlers.test.ts       — each action type mock + execution
  condition-evaluator.test.ts   — field/operator/value condition logic

src/app/app/flow/automations/__tests__/
  actions.test.ts               — CRUD server actions, auth checks
```

### Sprint 25.1 — Playwright

```
tests/e2e/
  workflow-builder.spec.ts      — create workflow, activate, trigger manually, view run history
```

### Sprint 25.2 — Vitest

```
src/lib/approvals/__tests__/
  approval-engine.test.ts       — multi-step chain, threshold routing, escalation
  delegation-service.test.ts    — active delegation lookup, circular check
```

### Sprint 25.2 — Playwright

```
tests/e2e/
  approval-chain.spec.ts        — create policy, initiate request, approve step 1, approve step 2
```

### Sprint 25.3 — Vitest

```
src/lib/api/__tests__/
  authenticate-api-request.test.ts  — valid PAT, revoked PAT, expired token, OAuth token
  scope-check.test.ts               — scope enforcement matrix

src/app/api/v1/__tests__/
  invoices.test.ts                  — CRUD operations, org scoping, missing scope
  oauth-flow.test.ts                — code grant, token exchange, revocation
```

### Sprint 25.4 — Vitest

```
src/lib/integrations/tally/__tests__/
  parser.test.ts                — valid Tally XML, unknown ledger, duplicate voucher
  generator.test.ts             — invoice to Tally XML, voucher to Tally XML

src/lib/integrations/zapier/__tests__/
  polling.test.ts               — correct since filtering, org scoping
```

### Sprint 25.5 — Vitest

```
src/lib/payroll/__tests__/
  calculation-engine.test.ts    — gross, deductions, net pay for multiple scenarios
  pf.test.ts                    — capped PF, opt-out, employer contribution
  esi.test.ts                   — eligible, ineligible (>21K), employer + employee
  tds.test.ts                   — old regime, new regime, pro-rated monthly
  professional-tax.test.ts      — Maharashtra slab, Karnataka slab

src/app/app/pay/payroll/__tests__/
  actions.test.ts               — create run, finalize, block duplicate period
```

### Sprint 25.5 — Playwright

```
tests/e2e/
  payroll-run.spec.ts           — create run, process, review, finalize, export register
  employee-portal.spec.ts       — OTP login, view payslips, download
```

---

## 18. Non-Functional Requirements

### 18.1 Performance

- Workflow trigger dispatch must complete in < 100ms (async — doesn't block the triggering action)
- Payroll run processing for 50 employees must complete in < 30 seconds
- REST API P95 response time < 300ms for list endpoints (with pagination)
- Tally XML export for 500 records must complete in < 10 seconds

### 18.2 Security

- API tokens never stored in plaintext — SHA-256 hash only
- OAuth client secrets never stored in plaintext — bcrypt hash
- Employee portal JWT secret (`EMPLOYEE_PORTAL_JWT_SECRET`) must be separate from customer portal secret
- All payroll data (CTC components, PAN, bank account) must be excluded from general `employees:read` API scope — requires `employees:sensitive:read` scope
- All PAN numbers must be masked in UI by default ("ABCDE1234F" → "ABCDE****F")

### 18.3 Reliability

- Workflow runs must be retryable — idempotent step execution
- Payroll run finalization must be atomic — either all `SalarySlip` records are created or none
- API rate limit state must survive server restarts (Redis-backed, using existing infrastructure)
- Tally import must be transactional — partial import failure rolls back all records

### 18.4 Observability

- All workflow runs logged to `AuditLog` with `workflowRunId`
- All API calls logged with token prefix, endpoint, status code, response time
- Payroll run state transitions logged to `AuditLog`
- Sentry error boundary on all new route pages
- Cron job execution logged to `JobLog` (existing model)

---

## 19. Environment Variables and External Dependencies

### New Environment Variables Required

| Variable | Used By | Notes |
|----------|---------|-------|
| `EMPLOYEE_PORTAL_JWT_SECRET` | Sprint 25.5 | 32+ byte random secret for employee portal sessions. MUST differ from `PORTAL_JWT_SECRET`. |
| `ZAPIER_APP_CLIENT_ID` | Sprint 25.4 | Zapier OAuth app client ID |
| `ZAPIER_APP_CLIENT_SECRET` | Sprint 25.4 | Zapier OAuth app client secret |
| `MAKE_WEBHOOK_SECRET` | Sprint 25.4 | HMAC secret for verifying Make.com webhook calls |
| `API_RATE_LIMIT_WINDOW_SECONDS` | Sprint 25.3 | Default: `60`. Rate limit window. |
| `API_RATE_LIMIT_MAX_REQUESTS` | Sprint 25.3 | Default: `60`. Max requests per window. |

### New npm Dependencies Required

| Package | Sprint | Purpose |
|---------|--------|---------|
| `xml2js` | 25.4 | Tally XML parsing |
| `xmlbuilder2` | 25.4 | Tally XML generation |
| `otplib` | 25.5 | Employee portal OTP (if not using existing otpauth) |

---

## 20. Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Workflow engine triggers infinite loops (action → trigger → action) | HIGH | Detect cycle: max 3 chained workflow runs per originating event |
| Payroll run with incorrect TDS calculation leading to compliance issues | HIGH | Clear disclaimer: "TDS is estimated; consult a CA for final compliance." No e-filing. |
| OAuth 2.0 implementation introduces CSRF / open redirect vulnerabilities | HIGH | Strict `state` parameter validation; `redirect_uri` exact match only |
| Tally XML format varies across Tally versions | MEDIUM | Test with Tally Prime 2.x specifically; document format assumptions clearly |
| Employee portal OTP delivery fails → employee can't access payslips | MEDIUM | Fallback: admin can generate a download link from the HR console |
| Approval chain escalation over-escalates to admin for all requests | LOW | Configurable escalation timeout; org admin receives daily digest, not per-request noise |
| Zapier app review process delays public listing | LOW | Ship as invite-only first; Zapier public review is optional for beta |

---

## 21. Branch Strategy and PR Workflow

### Main Phase Branch

```
feature/phase-25          ← created from master after Phase 24 merge
```

### Sprint Sub-branches

```
feature/phase-25-sprint-25-1   ← Workflow Automation Builder
feature/phase-25-sprint-25-2   ← Advanced Approval Chains
feature/phase-25-sprint-25-3   ← Developer Platform & REST API
feature/phase-25-sprint-25-4   ← Integration Hub
feature/phase-25-sprint-25-5   ← Payroll Operations Foundation
```

### Workflow Per Sprint

1. Cut sprint branch from `feature/phase-25`
2. Implement, test (`npm run test`), lint (`npm run lint`), build (`npm run build`)
3. Open PR targeting `feature/phase-25`
4. Owner reviews and approves PR
5. Merge sprint PR into `feature/phase-25`
6. Cut next sprint from updated `feature/phase-25`

### Final Merge

After all 5 sprint PRs are approved and merged into `feature/phase-25`:
1. Run pre-master audit (same pattern as Phase 23/24)
2. Fix all findings on a `fix/phase-25-audit` branch
3. Merge `fix/phase-25-audit` → `feature/phase-25`
4. Merge `feature/phase-25` → `master`

### PR Description Template

Each sprint PR should include:
```
## Sprint 25.N — [Sprint Name]

### What Changed
- ...

### Why
- ...

### Schema Changes
- ...

### Tests Added
- ...

### Verification
- [ ] npm run test: X/X passing
- [ ] npm run lint: 0 errors
- [ ] npm run build: clean
```

---

*End of Phase 25 PRD — Slipwise One*
*Version 1.0 | April 2026 | Slipwise Engineering*
