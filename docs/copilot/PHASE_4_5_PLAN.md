# Phase 4 & Phase 5 — Full Detailed Plan
**Written:** Sunday, April 5, 2026 at 4:40 PM IST  
**Current master:** `0f7aeab` (Phase 3 merged)  
**Next branch:** `feature/phase-4-sw-pay-lifecycle`

---

## Overview

| Phase | Name | Goal | Sprints |
|-------|------|------|---------|
| **4** | SW> Pay Lifecycle | Invoice state machine + payment proof + receivables | 2 |
| **5** | SW> Flow Orchestration | Ticketing + approvals + scheduling + recurring engine | 2 |

---

## PHASE 4: SW> Pay Lifecycle

### What It Is
SW Pay is **not** a payment gateway. It is the **payment operations layer** — tracking invoice lifecycle states, letting customers upload proof of payment via a secure tokenized link, and giving internal users a receivables dashboard to review and reconcile.

### New Prisma Models (Phase 4)
```
InvoiceStateEvent    — audit log of every state transition (who, when, from→to, reason)
InvoicePayment       — individual payment records (amount, date, partial vs full, method note)
InvoiceProof         — proof upload record (file URL, uploaded by, token, review status)
PublicInvoiceToken   — secure one-time/reusable token to share invoice externally
```

### Invoice State Machine
Full set of states (extend current Invoice.status enum):
```
draft → issued → viewed → due → partially_paid → paid → overdue → disputed → cancelled → reissued
```
- `issued` = first-time issue; sets `issuedAt`, starts due countdown
- `viewed` = customer opened tokenized link
- `partially_paid` = proof uploaded with partial amount
- `paid` = proof accepted, full amount confirmed
- `overdue` = past dueDate and not paid (cron-triggered or computed)
- `disputed` = internal dispute flag raised
- `cancelled` = voided
- `reissued` = re-sent with new details; captures reissue reason; original marked accordingly

---

### Sprint 4.1 — Invoice State Machine

**Goal:** Invoice lifecycle logic complete, auditable and queryable

#### S4.1.1 — Prisma Schema Extension
- Add `InvoiceStateEvent` model
  - `id`, `invoiceId`, `fromStatus`, `toStatus`, `actorId`, `reason?`, `metadata?`, `createdAt`
- Add `InvoicePayment` model
  - `id`, `invoiceId`, `orgId`, `amount`, `currency`, `paidAt`, `method?`, `note?`, `isPartial`, `createdAt`
- Add `InvoiceProof` model
  - `id`, `invoiceId`, `fileUrl`, `fileName`, `uploadedByToken?`, `uploadedByUserId?`, `reviewStatus` (pending/accepted/rejected), `reviewNote?`, `reviewedAt?`, `createdAt`
- Add `PublicInvoiceToken` model
  - `id`, `invoiceId`, `orgId`, `token` (UUID, unique), `expiresAt?`, `accessCount`, `lastAccessedAt?`, `createdAt`
- Extend `Invoice` model:
  - `issuedAt DateTime?`
  - `dueDate DateTime?`
  - `paidAt DateTime?`
  - `overdueAt DateTime?`
  - `reissueReason String?`
  - `originalInvoiceId String?` (self-ref for reissued)
  - `publicToken String?` (FK to PublicInvoiceToken)
  - Relations: `stateEvents`, `payments`, `proofs`
- Run `prisma migrate dev --name phase4_pay_state_machine`

#### S4.1.2 — Server Actions: Invoice State Transitions
File: `src/app/app/docs/invoices/pay-actions.ts`
- `issueInvoice(invoiceId)` — draft → issued, sets `issuedAt`, logs StateEvent, generates PublicInvoiceToken
- `markInvoiceViewed(token)` — issued → viewed, logs StateEvent (no auth required, called from public page)
- `recordPayment(invoiceId, { amount, isPartial, method, note })` — logs InvoicePayment, transitions state to partially_paid or paid, logs StateEvent
- `markOverdue(invoiceId)` — set overdue (used by scheduler in Phase 5)
- `disputeInvoice(invoiceId, reason)` — set disputed
- `cancelInvoice(invoiceId, reason)` — set cancelled
- `reissueInvoice(invoiceId, reason)` — creates copy, marks original as reissued, sets reason

#### S4.1.3 — Invoice Event Timeline Component
File: `src/features/docs/invoice/components/invoice-timeline.tsx`
- Vertical event log: icon + label + actor name + date/time
- Renders from `InvoiceStateEvent[]` records
- Shown on `/app/docs/invoices/[id]` page (right sidebar or bottom panel)

#### S4.1.4 — Invoice Vault Enhancements
- Update vault list at `/app/docs/invoices/page.tsx`:
  - Add `overdue`, `disputed`, `partially_paid`, `reissued` filter chips
  - Show `dueDate` column and color-code (red = overdue, amber = due soon, green = paid)
  - Add "Copy Invoice Link" button that copies public token URL

---

### Sprint 4.2 — Payment Proof & Customer Interaction

**Goal:** Customer proof upload and internal review flow end-to-end

#### S4.2.1 — Public Tokenized Invoice Page
Route: `/invoice/[token]` (public, no auth, in `src/app/invoice/[token]/page.tsx`)
- Fetches invoice by `PublicInvoiceToken.token`
- Marks invoice as `viewed` on first open (calls `markInvoiceViewed`)
- Shows: invoice summary, line items, amounts, due date, payment instructions, bank details
- Shows payment status badge
- If not yet paid: renders "Mark as Paid" + proof upload form
- If paid: shows confirmation

#### S4.2.2 — Proof Upload Component
File: `src/features/pay/components/proof-upload-form.tsx`
- Fields: amount paid, payment date, payment method (bank transfer / cash / cheque / other), note, file upload
- File upload: image or PDF, max 5MB, uploads to Supabase Storage (`/proofs/` bucket)
- Submits via server action `uploadPaymentProof(token, data)`
- On success: shows confirmation, invoice updates to `partially_paid` or pending review

#### S4.2.3 — Server Action: Proof Upload (Public)
File: `src/app/invoice/[token]/actions.ts`
- `uploadPaymentProof(token, { amount, date, method, note, fileUrl })` — no auth, token-validated
  - Creates `InvoiceProof` record
  - Creates `InvoicePayment` record
  - Transitions invoice to `partially_paid` (pending internal review)
  - Logs `InvoiceStateEvent`

#### S4.2.4 — Internal Proof Review Page
Route: `/app/pay/proofs` and `/app/pay/proofs/[proofId]`
- Lists all pending proofs across org
- Detail page shows: invoice summary, payment claimed, proof file preview, action buttons
- Actions: "Accept Proof" (→ marks paid), "Reject Proof" (→ returns to issued with note), "Flag Discrepancy"
- Server actions: `acceptProof(proofId)`, `rejectProof(proofId, reason)`

#### S4.2.5 — Receivables Dashboard
Route: `/app/pay/receivables`
- KPI cards: Due This Month, Overdue, Partially Paid, Paid This Month
- Invoices table with current state, amount, due date, customer name
- Filterable by state, date range, customer
- "Copy Invoice Link" per row
- Upcoming due (next 7 days) section

#### S4.2.6 — Nav Update
- Add **SW Pay** section to nav: Receivables, Proofs
- File: `src/components/layout/suite-nav-items.ts`

#### S4.2.7 — Send & Share Layer (basic)
- `sendInvoiceEmail(invoiceId)` — sends invoice link via Brevo SMTP to customer email
- Email template: clean invoice summary + CTA button "View & Pay"
- Resend action on vault page

---

### Phase 4 Acceptance Gates
- [ ] All invoice state transitions are persisted as `InvoiceStateEvent` records
- [ ] Public tokenized invoice page loads without auth
- [ ] Customer can upload proof via public page
- [ ] Internal user can accept/reject proof — status updates correctly
- [ ] Receivables dashboard shows correct KPI counts
- [ ] Email send creates a send log entry
- [ ] TypeScript: 0 errors; Lint: 0 errors

---

## PHASE 5: SW> Flow Orchestration

### What It Is
SW Flow is the **control and orchestration layer** — how actions move through the system. Phase 5 adds: invoice-linked ticketing (customer raises a query), document approval chains (vouchers/salary slips need approval before release), a notification center, activity feed, and a background scheduler for recurring invoices + send reminders using **Trigger.dev**.

### New Prisma Models (Phase 5)
```
InvoiceTicket          — customer/internal query against invoice
TicketReply            — thread message in ticket
ApprovalRequest        — approval step for voucher/salary slip
Notification           — in-app notification per user
ActivityLog            — org-level activity stream (document created, sent, proof uploaded, etc.)
ScheduledSend          — scheduled one-off send job
RecurringInvoiceRule   — rule for generating recurring invoices
JobLog                 — Trigger.dev job execution log
```

---

### Sprint 5.1 — Ticketing + Notifications + Approvals + Activity Feed

**Goal:** Invoice ticketing live, approval flow live, notification center live

#### S5.1.1 — Prisma Schema Extension
- `InvoiceTicket`: `id`, `invoiceId`, `orgId`, `submitterToken?`, `submitterName`, `submitterEmail`, `category` (billing_query/amount_dispute/missing_item/other), `description`, `status` (open/in_progress/resolved/closed), `assigneeId?`, `createdAt`, `resolvedAt?`
- `TicketReply`: `id`, `ticketId`, `authorId?`, `authorName`, `isInternal` (bool, internal-only notes), `message`, `createdAt`
- `ApprovalRequest`: `id`, `docType` (voucher/salary_slip/invoice), `docId`, `orgId`, `requestedById`, `approverId?`, `status` (pending/approved/rejected), `note?`, `createdAt`, `decidedAt?`
- `Notification`: `id`, `userId`, `orgId`, `type`, `title`, `body`, `link?`, `isRead`, `createdAt`
- `ActivityLog`: `id`, `orgId`, `actorId`, `actorName`, `event` (enum), `docType?`, `docId?`, `meta?`, `createdAt`
- Run `prisma migrate dev --name phase5_flow_orchestration`

#### S5.1.2 — Public Ticket Submission Page
Route: `/invoice/[token]/ticket` (public, no auth)
- Customer navigates from tokenized invoice page via "Raise a Query" link
- Form: submitter name, email, category dropdown, description
- Server action `submitTicket(token, data)` — creates `InvoiceTicket`
- Confirmation page with ticket ID

#### S5.1.3 — Internal Ticketing Pages
Route: `/app/flow/tickets` and `/app/flow/tickets/[ticketId]`
- List: all tickets, filterable by status / assignee / invoice
- Detail page: ticket info, reply thread, internal notes, status change, assignee
- Server actions: `assignTicket`, `replyToTicket`, `resolveTicket`, `closeTicket`
- Reply form supports `isInternal` toggle for internal-only notes

#### S5.1.4 — Approval System
Routes: `/app/flow/approvals`, `/app/flow/approvals/[requestId]`
- Vouchers: "Submit for Approval" button on voucher workspace → creates `ApprovalRequest`
- Salary slips: "Submit for Approval" button → creates `ApprovalRequest`
- Approvals list page: pending queue per user
- Detail page: doc preview, approve/reject with note
- Server actions: `requestApproval(docType, docId)`, `approveRequest(requestId, note?)`, `rejectRequest(requestId, note)`
- Nav: Update voucher save bar with "Submit for Approval" option

#### S5.1.5 — Notification Center
Route: `/app/flow/notifications` (also bell icon in topbar)
- `Notification` records created by server actions on key events:
  - New proof uploaded
  - Ticket opened
  - Ticket reply received
  - Approval requested
  - Approval decided
  - Invoice overdue
- Topbar bell icon shows unread count badge
- Notification list page with mark-as-read, mark-all-read
- Server actions: `createNotification`, `markNotificationRead`, `markAllNotificationsRead`

#### S5.1.6 — Activity Feed
Route: `/app/flow/activity`
- Global org-level activity timeline
- Events: document created/edited/issued/sent, proof uploaded, ticket opened/resolved, approval granted, proxy used
- Filterable by doc type, date range, actor
- `ActivityLog` records created in all existing server actions (invoice, voucher, salary, pay-actions)

#### S5.1.7 — Nav Update
- Add **SW Flow** section to nav: Tickets, Approvals, Notifications, Activity Feed

---

### Sprint 5.2 — Scheduling + Recurring Engine (Trigger.dev)

**Goal:** Timed workflows operational — recurring invoices generate, reminders fire

#### S5.2.1 — Trigger.dev Integration
- Install: `@trigger.dev/sdk`, `@trigger.dev/nextjs`
- Configure `TRIGGER_API_KEY`, `TRIGGER_API_URL` in `.env`
- Create `src/lib/jobs/trigger-client.ts`
- Define jobs in `src/lib/jobs/`:
  - `send-invoice-email.ts` — send invoice via Brevo, update send log
  - `send-invoice-reminder.ts` — reminder before/after due date
  - `generate-recurring-invoice.ts` — create draft from rule, optionally auto-send
  - `mark-invoices-overdue.ts` — daily cron, mark all past-due invoices as overdue
  - `retry-failed-sends.ts` — retry job for failed sends

#### S5.2.2 — Scheduled Send
Prisma model: `ScheduledSend`
- `id`, `invoiceId`, `orgId`, `scheduledAt`, `recipientEmail`, `status` (pending/sent/failed), `jobId?`, `sentAt?`, `failReason?`, `createdAt`

Route: `/app/pay/send-log`
- List of all send attempts + status + timestamps
- "Retry" button for failed sends
- Server action: `scheduleInvoiceSend(invoiceId, email, sendAt)` → triggers Trigger.dev job

#### S5.2.3 — Recurring Invoice Rules
Prisma model: `RecurringInvoiceRule`
- `id`, `orgId`, `baseInvoiceId` (template invoice), `frequency` (weekly/monthly/quarterly/custom), `nextRunAt`, `endDate?`, `autoSend` (bool), `status` (active/paused/completed), `runsCount`, `lastRunAt?`, `createdAt`

Routes: `/app/pay/recurring` and `/app/pay/recurring/new`
- List of recurring rules with status badges (active/paused)
- Form to create rule from existing invoice
- Controls: pause, resume, delete
- Server actions: `createRecurringRule`, `pauseRecurringRule`, `resumeRecurringRule`, `deleteRecurringRule`

#### S5.2.4 — Reminder Scheduling
- On `issueInvoice()`: auto-schedule 3 reminder jobs via Trigger.dev:
  - 3 days before due → reminder email
  - 1 day before due → reminder email
  - 1 day after due (overdue) → overdue email + mark invoice overdue
- Reminder email template: clean "Invoice Due Soon" / "Invoice Overdue" via Brevo

#### S5.2.5 — Job Activity Log
- `JobLog` model: `id`, `jobName`, `jobId`, `status`, `invoiceId?`, `triggeredAt`, `completedAt?`, `error?`
- Route: `/app/flow/jobs` — internal job execution log
- Visibility into all Trigger.dev executions for debugging

---

### Phase 5 Acceptance Gates
- [ ] Customer can submit a ticket via tokenized link
- [ ] Internal user can assign, reply to, and resolve ticket
- [ ] Voucher "Submit for Approval" creates approval request
- [ ] Approver can approve/reject — doc status updates correctly
- [ ] Notification center shows unread count in topbar
- [ ] Activity feed shows real-time org events
- [ ] Trigger.dev integration verified with a test job
- [ ] Scheduled send fires at correct time
- [ ] Recurring invoice generates a new draft on schedule
- [ ] Reminder emails fire before/after due date
- [ ] TypeScript: 0 errors; Lint: 0 errors

---

## Summary: What Needs to Be Built

### New Prisma Models (Total: 11)
**Phase 4:** InvoiceStateEvent, InvoicePayment, InvoiceProof, PublicInvoiceToken  
**Phase 5:** InvoiceTicket, TicketReply, ApprovalRequest, Notification, ActivityLog, ScheduledSend, RecurringInvoiceRule, JobLog

### New Routes
**Phase 4:**
- `/invoice/[token]` — public tokenized invoice (no auth)
- `/app/pay/receivables` — receivables dashboard
- `/app/pay/proofs` — internal proof review list
- `/app/pay/proofs/[proofId]` — proof review detail

**Phase 5:**
- `/invoice/[token]/ticket` — public ticket submission (no auth)
- `/app/flow/tickets` + `/[ticketId]` — internal ticketing
- `/app/flow/approvals` + `/[requestId]` — approvals queue
- `/app/flow/notifications` — notification center
- `/app/flow/activity` — activity feed
- `/app/pay/send-log` — email send log
- `/app/pay/recurring` + `/new` — recurring invoice rules
- `/app/flow/jobs` — Trigger.dev job log

### New Components
**Phase 4:**
- `invoice-timeline.tsx` — state event timeline
- `proof-upload-form.tsx` — proof upload for public page
- `receivables-kpi-cards.tsx` — dashboard metric cards
- `invoice-public-view.tsx` — public invoice layout (no nav)

**Phase 5:**
- `ticket-thread.tsx` — reply thread component
- `approval-card.tsx` — approval decision card
- `notification-bell.tsx` + `notification-list.tsx`
- `activity-feed.tsx` — activity timeline
- `recurring-rule-form.tsx` — create/edit recurring rule

### External Dependencies to Add
- `@trigger.dev/sdk` + `@trigger.dev/nextjs` — background job system
- `react-dropzone` or native file input — proof upload
- `date-fns` (likely already installed) — date formatting

---

## Branching Strategy
```
master
  └── feature/phase-4-sw-pay-lifecycle      (Sprint 4.1 + 4.2)
        └── feature/phase-5-sw-flow          (Sprint 5.1 + 5.2)
```
Each phase merges to master via PR before starting the next.

---

## What We Are NOT Building (Explicit Exclusions)
- No actual payment gateway (Stripe, Razorpay, etc.)
- No full accounting ledger
- No multi-step workflow builder (Phase 7+)
- No approval chains / threshold approvals (Phase 7+)
- No proxy control (Phase 7)
- No SMS sends (WhatsApp link only, no API)
