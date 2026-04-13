# Phase 16 Remediation Implementation Plan
## Systematic Fix Execution Strategy

**Date:** 2026-04-13  
**Branch:** `feature/phase-16-complete-remediation`  
**Target:** Fix all P0 and P1 issues from audit report

---

## Implementation Strategy

### Team Structure (Sub-Agent Roles)

1. **Security Engineer** - Authorization & approval fixes
2. **Backend Engineer** - Business logic & state management
3. **Test Engineer** - Comprehensive test coverage
4. **QA Engineer** - Verification & validation

### Execution Order

**Phase 1: Critical Security Fixes (P0)**
1. SEC-003: Payment run rejection state handling
2. TEST-003: Payment run rejection flow tests

**Phase 2: Important Fixes (P1)**
3. SEC-001: Approval authority hardening
4. SEC-002: Period reopen approval workflow
5. GAP-002: Books settings completion
6. TEST-001: AR/AP aging reconciliation
7. TEST-002: Multi-currency historical rates

**Phase 3: Polish (P2)**
8. GAP-001: Journal attachments completion

---

## Detailed Implementation Plan

### Fix 1: SEC-003 - Payment Run Rejection State Handling

**Problem:** Payment runs don't roll back cleanly when approval is rejected

**Current Flow:**
```
DRAFT → request approval → PENDING_APPROVAL
PENDING_APPROVAL → approve → APPROVED → execute → COMPLETED
PENDING_APPROVAL → reject → ??? (status not rolled back)
```

**Required Flow:**
```
DRAFT → request approval → PENDING_APPROVAL
PENDING_APPROVAL → approve → APPROVED → execute → COMPLETED
PENDING_APPROVAL → reject → REJECTED (with reason)
REJECTED → resubmit → PENDING_APPROVAL (new approval request)
```

**Files to Modify:**
1. `src/lib/accounting/vendor-bills.ts`
   - Add `rejectPaymentRun()` function
   - Add `resubmitPaymentRun()` function
   - Update status validation logic

2. `src/app/app/flow/approvals/actions.ts`
   - Update `rejectApproval()` to handle payment-run rejection
   - Add rollback logic for payment run status

3. `src/app/app/books/actions.ts`
   - Add `resubmitPaymentRunAction()`
   - Update approval request creation

4. `src/app/app/books/components/payment-run-detail-actions.tsx`
   - Add "Resubmit for Approval" button for REJECTED status
   - Show rejection reason

**Implementation Steps:**
```typescript
// Step 1: Add rejection handling in vendor-bills.ts
export async function rejectPaymentRun(input: {
  orgId: string;
  paymentRunId: string;
  reason: string;
  actorId: string;
}): Promise<void> {
  return db.$transaction(async (tx) => {
    const run = await tx.paymentRun.findFirst({
      where: { id: input.paymentRunId, orgId: input.orgId },
      select: { id: true, status: true, runNumber: true },
    });

    if (!run) throw new Error("Payment run not found.");
    if (run.status !== "PENDING_APPROVAL") {
      throw new Error("Only pending approval runs can be rejected.");
    }

    await tx.paymentRun.update({
      where: { id: input.paymentRunId },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectedByUserId: input.actorId,
        rejectionReason: input.reason,
      },
    });

    await tx.auditLog.create({
      data: {
        orgId: input.orgId,
        actorId: input.actorId,
        action: "books.payment_run.rejected",
        entityType: "payment_run",
        entityId: input.paymentRunId,
        metadata: { runNumber: run.runNumber, reason: input.reason },
      },
    });
  });
}

// Step 2: Add resubmission logic
export async function resubmitPaymentRun(input: {
  orgId: string;
  paymentRunId: string;
  actorId: string;
}): Promise<void> {
  return db.$transaction(async (tx) => {
    const run = await tx.paymentRun.findFirst({
      where: { id: input.paymentRunId, orgId: input.orgId },
      select: { id: true, status: true },
    });

    if (!run) throw new Error("Payment run not found.");
    if (run.status !== "REJECTED") {
      throw new Error("Only rejected runs can be resubmitted.");
    }

    await tx.paymentRun.update({
      where: { id: input.paymentRunId },
      data: {
        status: "PENDING_APPROVAL",
        rejectedAt: null,
        rejectedByUserId: null,
        rejectionReason: null,
      },
    });
  });
}
```

**Schema Changes Required:**
```prisma
// Add to PaymentRun model
model PaymentRun {
  // ... existing fields
  rejectedAt         DateTime?
  rejectedByUserId   String?   @db.Uuid
  rejectionReason    String?
}

// Add REJECTED status to enum
enum PaymentRunStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  REJECTED  // NEW
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

---

### Fix 2: SEC-001 - Approval Authority Hardening

**Problem:** Any finance_manager can approve anything in their org

**Solution:** Add explicit approval authority checks

**Files to Modify:**
1. `src/lib/books-permissions.ts`
   - Add `canApproveVendorBill()` with amount/assignee checks
   - Add `canApprovePaymentRun()` with amount/assignee checks

2. `src/app/app/flow/approvals/actions.ts`
   - Add authority validation in `approveApproval()`

**Implementation:**
```typescript
// In books-permissions.ts
export function canApproveVendorBill(input: {
  role: string;
  userId: string;
  billAmount: number;
  assignedApproverId?: string | null;
}): boolean {
  if (!canDecideFinanceApproval(input.role)) {
    return false;
  }

  // If explicitly assigned, only that user can approve
  if (input.assignedApproverId && input.assignedApproverId !== input.userId) {
    return false;
  }

  // Owner/Admin can approve any amount
  if (input.role === "owner" || input.role === "admin") {
    return true;
  }

  // Finance manager limited to bills under threshold
  const FINANCE_MANAGER_APPROVAL_LIMIT = 100000; // ₹1 lakh
  return input.billAmount <= FINANCE_MANAGER_APPROVAL_LIMIT;
}
```

---

### Fix 3: SEC-002 - Period Reopen Approval Workflow

**Problem:** Direct reopen without approval request

**Solution:** Add approval workflow for period reopen

**Files to Modify:**
1. `src/lib/accounting/periods.ts`
   - Modify `reopenFiscalPeriod()` to create approval request
   - Add `executeReopenFiscalPeriod()` for post-approval execution

2. `src/app/app/books/actions.ts`
   - Update reopen action to request approval
   - Add approval handler

**Implementation:**
```typescript
// In periods.ts
export async function requestReopenFiscalPeriod(input: {
  orgId: string;
  periodId: string;
  reason: string;
  actorId: string;
}): Promise<{ approvalRequestId: string }> {
  // Create approval request instead of direct reopen
  const approvalRequest = await db.approvalRequest.create({
    data: {
      orgId: input.orgId,
      docType: "period-reopen",
      docId: input.periodId,
      requestedById: input.actorId,
      status: "PENDING",
      metadata: { reason: input.reason },
    },
  });

  return { approvalRequestId: approvalRequest.id };
}

export async function executeReopenFiscalPeriod(input: {
  orgId: string;
  periodId: string;
  reason: string;
  actorId: string;
  approvalRequestId: string;
}): Promise<void> {
  // Original reopen logic, called after approval
  // ... existing reopenFiscalPeriod implementation
}
```

---

### Fix 4: GAP-002 - Books Settings Completion

**Problem:** Missing default account mappings UI and COA template selection

**Files to Create/Modify:**
1. `src/app/app/books/settings/page.tsx` - Add mappings section
2. `src/app/app/books/components/books-settings-form.tsx` - Expand form
3. `src/app/app/books/actions.ts` - Add settings update actions

**Implementation:**
```typescript
// Add to actions.ts
export async function updateBooksDefaultAccounts(input: {
  orgId: string;
  defaultReceivableAccountId?: string;
  defaultPayableAccountId?: string;
  defaultBankAccountId?: string;
  defaultRevenueAccountId?: string;
  defaultExpenseAccountId?: string;
}): ActionResult<void> {
  const context = await requireOrgContext();
  if (!canWriteBooks(context.role)) {
    return { success: false, error: "Insufficient permissions" };
  }

  await db.orgDefaults.update({
    where: { orgId: input.orgId },
    data: {
      defaultReceivableAccountId: input.defaultReceivableAccountId,
      defaultPayableAccountId: input.defaultPayableAccountId,
      defaultBankAccountId: input.defaultBankAccountId,
      // ... other mappings
    },
  });

  revalidatePath("/app/books/settings");
  return { success: true, data: null };
}
```

---

### Fix 5: TEST-001 - AR/AP Aging Reconciliation Test

**File:** `src/lib/accounting/__tests__/finance-reports.test.ts`

**Implementation:**
```typescript
it("proves AR aging reconciles to receivables control account", async () => {
  const orgId = "test-org";
  
  // Create invoices with known amounts
  // Post them to ledger
  // Generate AR aging report
  // Get receivables control account balance
  // Assert: aging total === control account balance
  
  const aging = await getAccountsReceivableAging({ orgId, asOfDate: new Date() });
  const trialBalance = await getTrialBalance({ orgId, endDate: new Date() });
  
  const receivablesAccount = trialBalance.accounts.find(
    a => a.systemKey === "ACCOUNTS_RECEIVABLE"
  );
  
  expect(aging.totalOutstanding).toBe(receivablesAccount.balance);
});
```

---

### Fix 6: TEST-002 - Multi-Currency Historical Rates Test

**File:** `src/lib/accounting/__tests__/journals.test.ts`

**Implementation:**
```typescript
it("preserves historical journal amounts when FX rates change", async () => {
  const orgId = "test-org";
  
  // Post journal with USD at rate 75
  const journal1 = await createAndPostJournal({
    orgId,
    currency: "USD",
    exchangeRate: 75,
    lines: [
      { accountId: "asset", debit: 100 }, // $100 = ₹7500
      { accountId: "revenue", credit: 100 },
    ],
  });
  
  // Update exchange rate to 80
  await db.exchangeRate.create({
    data: { currency: "USD", rate: 80, date: new Date() },
  });
  
  // Fetch journal again
  const refetched = await db.journalEntry.findUnique({
    where: { id: journal1.id },
    include: { lines: true },
  });
  
  // Assert: amounts unchanged despite rate change
  expect(refetched.exchangeRate).toBe(75);
  expect(refetched.lines[0].debit).toBe(7500);
});
```

---

### Fix 7: TEST-003 - Payment Run Rejection Flow Test

**File:** `src/lib/accounting/__tests__/vendor-bills.test.ts`

**Implementation:**
```typescript
describe("payment run rejection flow", () => {
  it("rolls back status cleanly when approval is rejected", async () => {
    const orgId = "test-org";
    
    // Create payment run
    const run = await createPaymentRun({
      orgId,
      actorId: "user1",
      scheduledDate: new Date(),
      items: [{ vendorBillId: "bill1", amount: 1000 }],
    });
    
    // Request approval
    await requestApproval({
      orgId,
      docType: "payment-run",
      docId: run.id,
      requestedById: "user1",
    });
    
    // Reject approval
    await rejectPaymentRun({
      orgId,
      paymentRunId: run.id,
      reason: "Insufficient documentation",
      actorId: "approver1",
    });
    
    // Verify status
    const rejected = await getPaymentRun(orgId, run.id);
    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe("Insufficient documentation");
    
    // Resubmit
    await resubmitPaymentRun({
      orgId,
      paymentRunId: run.id,
      actorId: "user1",
    });
    
    // Verify resubmitted
    const resubmitted = await getPaymentRun(orgId, run.id);
    expect(resubmitted.status).toBe("PENDING_APPROVAL");
    expect(resubmitted.rejectionReason).toBeNull();
  });
});
```

---

### Fix 8: GAP-001 - Journal Attachments Polish

**Files to Modify:**
1. `src/app/app/books/journals/[id]/page.tsx` - Show attachments list
2. `src/lib/accounting/__tests__/journals.test.ts` - Add attachment tests

---

## Migration Required

**File:** `prisma/migrations/20260413000001_phase16_remediation/migration.sql`

```sql
-- Add rejection fields to PaymentRun
ALTER TABLE "PaymentRun" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "PaymentRun" ADD COLUMN "rejectedByUserId" TEXT;
ALTER TABLE "PaymentRun" ADD COLUMN "rejectionReason" TEXT;

-- Add REJECTED status to enum
ALTER TYPE "PaymentRunStatus" ADD VALUE 'REJECTED';

-- Add period-reopen to approval doc types (if needed)
-- This may require updating ApprovalRequest constraints
```

---

## Verification Checklist

### P0 Fixes
- [ ] Payment run rejection rolls back status
- [ ] Rejection reason captured
- [ ] Resubmission workflow works
- [ ] Tests pass for rejection flow

### P1 Fixes
- [ ] Approval authority checks enforced
- [ ] Period reopen requires approval
- [ ] Books settings UI complete
- [ ] AR/AP aging reconciliation test passes
- [ ] Multi-currency historical rates test passes

### P2 Fixes
- [ ] Journal attachments fully functional
- [ ] Attachment tests pass

### Integration
- [ ] All existing tests still pass
- [ ] No regressions in Books functionality
- [ ] Build succeeds
- [ ] Lint passes

---

## Execution Timeline

**Day 1:** P0 fixes (SEC-003, TEST-003)
**Day 2:** P1 security fixes (SEC-001, SEC-002)
**Day 3:** P1 features & tests (GAP-002, TEST-001, TEST-002)
**Day 4:** P2 polish (GAP-001)
**Day 5:** Integration testing & PR preparation

---

**Plan Created:** 2026-04-13T12:39:27+05:30  
**Ready for Execution:** Yes
