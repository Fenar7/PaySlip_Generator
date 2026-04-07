# Invoice Payment Reconciliation PRD

## Summary

This PRD defines the required redesign of the invoice payment flow so that partial payments, payment links, payment proofs, manual admin payments, and API-triggered payments all produce one consistent outcome.

The current implementation has payment state drift because invoice status is updated independently in multiple places:

- Razorpay payment-link settlement can mark an invoice `PAID` immediately without checking cumulative paid amount.
- Public proof upload creates `invoice_payment` rows before admin review.
- Proof accept/reject mutates invoice status directly instead of reconciling against all payments.
- Admin manual payment recording trusts user-selected partial/full intent instead of deriving it from totals.
- Receivables and admin panels expose invoice status, but not the payment details needed to explain why a given status exists.

The target outcome is a deterministic invoice payment system where:

- invoice payment status is derived from a canonical payment ledger
- remaining amount is always visible and accurate
- payment-link settlement metadata is visible in admin
- partial payments can carry a customer-entered next payment date
- duplicate or out-of-order events do not corrupt invoice state

## Problem Statement

The current flow is fully unreliable for real-world receivables management because the same invoice can move between `PAID` and `PARTIALLY_PAID` depending on which path wrote last, rather than on the actual settled money.

Observed implementation defects:

1. `payment_link.paid` currently creates a payment row and force-updates invoice status to `PAID`.
2. Public proof upload creates both a proof and an `invoice_payment` row before that proof is reviewed.
3. Proof acceptance sets invoice status to `PAID` regardless of whether the accepted amount fully clears the invoice.
4. Proof rejection resets invoice status to `ISSUED`, even if the invoice still has other accepted payments or should remain `PARTIALLY_PAID` or `OVERDUE`.
5. Admin “Record Payment” and API `mark-paid` create payment rows and set status based on a caller-supplied “partial” choice instead of computing status from remaining balance.
6. Admin receivables and invoice detail views do not show remaining amount, last payment method, gateway settlement metadata, or planned next payment date.
7. Public invoice view only distinguishes `PAID` vs “not paid” and does not show partial-payment state clearly.

## Goals

1. Make invoice payment state deterministic and ledger-driven.
2. Ensure partial payments always show the remaining amount everywhere.
3. Surface payment-link settlement details in admin, including payment method/channel where available.
4. Support customer-provided next payment date for partial payments.
5. Prevent bad state transitions caused by duplicate webhooks, rejected proofs, or mixed payment sources.
6. Keep the system implementation-ready for Claude or another agent without leaving policy decisions open.

## Non-Goals

1. Full installment-plan productization beyond a single customer-provided “next payment date”.
2. Complex auto-allocation of overpayments across multiple invoices.
3. Full billing/subscription redesign outside invoice receivables.
4. Replacing the current reminder system; this PRD only extends it where required for promised next-payment reminders.

## Canonical Rules

### Payment truth

Invoice financial state must be derived from accepted or settled payment ledger entries only.

- `amountPaid = sum(invoice_payment.amount where status = SETTLED)`
- `remainingAmount = max(invoice.totalAmount - amountPaid, 0)`

Pending proofs must not count toward paid totals.

### Invoice status derivation

Invoice status must be computed by reconciliation rules:

- `PAID` when `remainingAmount === 0`
- `PARTIALLY_PAID` when `amountPaid > 0` and `remainingAmount > 0`
- otherwise preserve the non-payment lifecycle status:
  - `ISSUED`
  - `VIEWED`
  - `DUE`
  - `OVERDUE`
  - `DISPUTED`
  - `CANCELLED`

No flow is allowed to directly set `PAID` or `PARTIALLY_PAID` without going through the reconciliation service.

### Proofs vs payments

Proofs are evidence, not settled money.

- `invoice_proof` records customer-submitted evidence.
- `invoice_payment` records financial ledger entries.
- Proof uploads create pending-review ledger rows, not settled ones.
- Accepting a proof settles the linked ledger row.
- Rejecting a proof rejects the linked ledger row and does not count it toward paid totals.

### Overpayment policy

Overpayments must not silently distort invoice totals.

- If submitted payment amount is greater than current remaining amount, default behavior is to block it.
- If external gateway events produce an overpayment, record the event but mark the ledger entry for admin review and do not increase accepted paid total beyond invoice total.

## Required Data Model Changes

### Invoice

Add cached snapshot fields:

- `amountPaid Float @default(0)`
- `remainingAmount Float @default(0)`
- `lastPaymentAt DateTime?`
- `lastPaymentMethod String?`
- `paymentPromiseDate String?`
- `paymentLinkStatus String?`
- `paymentLinkLastEventAt DateTime?`

These are derived fields maintained by reconciliation, not source-of-truth fields.

### InvoicePayment

Add the following fields:

- `source String`
  - allowed values:
    - `admin_manual`
    - `public_proof`
    - `razorpay_payment_link`
    - `smart_collect`
    - `api`
- `status String`
  - allowed values:
    - `PENDING_REVIEW`
    - `SETTLED`
    - `REJECTED`
    - `OVERPAID_REVIEW`
    - `FAILED`
- `externalPaymentId String?`
- `externalReferenceId String?`
- `externalPayload Json?`
- `paymentMethodDisplay String?`
- `paymentChannel String?`
- `plannedNextPaymentDate String?`
- `recordedByUserId String? @db.Uuid`
- `reviewedByUserId String? @db.Uuid`
- `reviewedAt DateTime?`
- `rejectionReason String?`

Keep:

- `amount`
- `currency`
- `paidAt`
- `method`
- `note`

But interpret them as:

- `method`: normalized internal method code
- `paymentMethodDisplay`: raw user/gateway-facing label

### InvoiceProof

Add:

- `invoicePaymentId String?`

Purpose:

- link each proof to the ledger row it created
- keep review actions targeted to one ledger row

## Shared Reconciliation Service

Introduce a single reconciliation service for invoice payment state.

### Responsibilities

1. Fetch all ledger rows for one invoice.
2. Compute settled paid total from rows with `status = SETTLED`.
3. Compute remaining amount.
4. Determine derived invoice payment status.
5. Update invoice snapshot fields:
   - `amountPaid`
   - `remainingAmount`
   - `lastPaymentAt`
   - `lastPaymentMethod`
   - `paymentPromiseDate`
   - `paidAt`
6. Create an `invoice_state_event` only when the derived invoice status changes.
7. Preserve the invoice’s non-payment lifecycle state when there are zero settled payments.

### Invariants

1. Every payment-related mutation path must call reconciliation.
2. No route or action may update `invoice.status` to `PAID` or `PARTIALLY_PAID` directly.
3. Reconciliation must be idempotent.

## Flow Redesign

### 1. Admin manual payment

Replace the current “partial payment” checkbox-driven flow.

New behavior:

- Admin enters:
  - amount
  - method
  - paid date
  - note
  - optional next payment date only if amount is less than current remaining amount
- Server derives whether the payment is partial or full from the invoice’s current remaining amount.
- If amount equals remaining amount:
  - ledger row is created as `SETTLED`
  - reconciliation results in `PAID`
- If amount is less than remaining amount:
  - ledger row is created as `SETTLED`
  - optional `plannedNextPaymentDate` is stored
  - reconciliation results in `PARTIALLY_PAID`
- If amount exceeds remaining amount:
  - reject with validation error

The existing “Mark Paid” shortcut must be replaced with one of these allowed behaviors:

- prefill the record-payment modal with exact remaining amount
- or create a settled payment for exact remaining amount internally using the same shared record-payment path

Direct status-only mutation is forbidden.

### 2. Public proof upload

New behavior:

- Customer submits:
  - amount
  - payment date
  - payment method
  - note
  - proof file
  - next payment date if amount is less than current remaining amount
- Validation rules:
  - amount must be greater than 0
  - amount must be less than or equal to current remaining amount
  - next payment date is required only when amount is less than remaining amount
  - next payment date must be today or later
- Server creates:
  - `invoice_proof` with `PENDING`
  - linked `invoice_payment` with:
    - `source=public_proof`
    - `status=PENDING_REVIEW`
    - `plannedNextPaymentDate` when applicable
- Reconciliation is not allowed to count this amount yet
- Invoice should show:
  - pending-proof status
  - current settled amount paid
  - remaining amount

### 3. Proof acceptance

New behavior:

- Find the linked `invoice_payment`
- Update:
  - proof review status to `ACCEPTED`
  - payment ledger status to `SETTLED`
  - reviewer metadata
- Run reconciliation
- Derived invoice state determines whether outcome is `PARTIALLY_PAID` or `PAID`

### 4. Proof rejection

New behavior:

- Find the linked `invoice_payment`
- Update:
  - proof review status to `REJECTED`
  - payment ledger status to `REJECTED`
  - rejection reason
  - reviewer metadata
- Run reconciliation
- Do not reset invoice blindly to `ISSUED`

### 5. Razorpay payment-link creation

Payment-link creation must persist more than id/url/expiry.

Store:

- payment-link id
- short URL
- expiry
- amount requested
- reminder enabled flag
- allowed payment methods if configured
- link lifecycle status

If Razorpay payment-method restrictions are configured in the request, they must be stored in invoice or related payment-link metadata so admins can compare requested options with actual settlement method later.

### 6. Razorpay payment-link settlement

Webhook `payment_link.paid` must:

1. be idempotent on event id and external payment id
2. create or upsert a ledger row with:
   - `source=razorpay_payment_link`
   - `status=SETTLED`
   - external payment ids and payload
   - gateway method details when present
3. run reconciliation
4. update cached payment-link status metadata

It must not directly set invoice status to `PAID`.

### 7. API `POST /api/v1/invoices/:id/mark-paid`

Redefine this as a payment-recording API rather than a status mutation API.

Accepted request body:

- `amount`
- `method`
- `note`
- `currency`
- `paidAt`
- `plannedNextPaymentDate` when payment is partial

Server behavior:

- create settled ledger row with `source=api`
- derive partial/full from current remaining amount
- run reconciliation

Response body must include:

- `paymentId`
- `invoiceId`
- `status`
- `amountPaid`
- `remainingAmount`
- `isPartial`

## Admin UX Requirements

### Receivables page

Add these columns:

- total amount
- amount paid
- remaining amount
- last payment method
- next payment date
- payment-link status

The status chip remains, but it must be derived from reconciled invoice state.

### Invoice detail page

Replace the minimal action sidebar with payment-aware detail sections:

1. Payment summary
   - total
   - amount paid
   - remaining amount
   - last payment date
   - last payment method
   - promised next payment date

2. Payment ledger
   - amount
   - source
   - status
   - payment method
   - payment date
   - external reference
   - note

3. Payment-link detail
   - link status
   - link expiry
   - amount requested
   - gateway settlement method
   - last gateway event time

### Proof review page

Show:

- proof amount
- invoice total
- settled amount paid
- remaining amount
- customer-entered next payment date
- resulting payment outcome if accepted

## Public Invoice UX Requirements

Public invoice page must show:

- total amount
- settled amount paid
- remaining amount
- current payment status
- partial-payment banner when applicable
- promised next payment date when applicable
- pending-proof banner when proof is awaiting review

Public invoice page must treat `PARTIALLY_PAID` as a first-class state, not lump it into generic unpaid behavior.

## Reminder Integration

Use the existing reminder infrastructure to support promise-date reminders.

Rules:

- if invoice is not fully paid and has `paymentPromiseDate`, send one reminder on that date
- if invoice becomes fully paid before that date, do not send the reminder
- do not introduce a full installment engine in this change

## Edge Cases

1. Duplicate webhook delivery
   - do not create duplicate settled ledger rows
   - do not create duplicate state events

2. Payment link settles after invoice is already fully paid
   - record as late/duplicate external event
   - do not inflate paid totals

3. Pending proof plus webhook settlement for same invoice
   - webhook settlement counts if valid
   - proof remains pending evidence until reviewed
   - admin should be able to identify likely duplicate proof/payment situations

4. Rejected proof on invoice with other settled payments
   - preserve correct remaining amount and status

5. Invoice edited after payments exist
   - reconciliation reruns
   - if settled total exceeds new invoice total, send invoice into review state rather than silently forcing `PAID`

6. Cancelled invoice
   - block new proof upload
   - block new manual/API payments
   - keep existing ledger visible

7. Disputed invoice
   - show payment ledger
   - block public proof upload by default in this change unless product explicitly overrides later

## Acceptance Criteria

1. Partial manual payment updates invoice to `PARTIALLY_PAID`, sets correct remaining amount, and preserves next payment date.
2. Full manual payment clears remaining amount and updates invoice to `PAID`.
3. Public proof upload does not affect settled totals before admin review.
4. Accepting proof updates amount paid and status correctly based on cumulative settled total.
5. Rejecting proof does not incorrectly reset invoice to `ISSUED`.
6. Razorpay payment-link settlement updates invoice based on actual cumulative paid total, not unconditional `PAID`.
7. Admin receivables page shows remaining amount and payment-method detail.
8. Public invoice page shows partial-payment state and remaining amount.
9. API `mark-paid` returns reconciled payment status and remaining amount.
10. Duplicate gateway events are idempotent.

## Test Scenarios

### Manual and API payments

- settled amount less than remaining
- settled amount exactly equal to remaining
- overpayment attempt rejected
- next payment date provided for partial payment
- next payment date rejected for full payment

### Proof lifecycle

- upload proof for full amount
- upload proof for partial amount with next payment date
- accept proof for partial amount
- accept proof for full amount
- reject proof on invoice with no other payments
- reject proof on invoice with other settled payments

### Payment-link lifecycle

- create payment link
- partial settlement through payment link
- full settlement through payment link
- duplicate `payment_link.paid`
- payment link settles after admin already recorded payment

### UI and reporting

- receivables list reflects remaining amount
- invoice detail ledger matches underlying rows
- public invoice shows paid and remaining values
- reminder job includes promise-date reminders and excludes fully paid invoices

## Implementation Notes for Claude

1. Start by extracting a shared invoice-payment reconciliation service and make every payment path call it.
2. Convert proof-upload flow so it creates pending ledger rows instead of settled ones.
3. Replace all direct `invoice.status = PAID/PARTIALLY_PAID` writes in payment flows with reconciliation calls.
4. Add snapshot fields to `invoice` only after the reconciliation service contract is defined.
5. Update admin and public UI only after ledger and reconciliation semantics are stable.
6. Preserve existing non-payment lifecycle states and state-event timeline behavior wherever possible.

