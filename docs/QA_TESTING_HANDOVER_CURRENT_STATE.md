# Slipwise One — QA Testing Handover

> **Version:** 2026-04-08 | **Product:** Slipwise One by Zenxvio
> **Purpose:** Practical testing guide for the QA/testing team. Execution-oriented. No fluff.
> **Source:** Actual codebase audit — features verified against implementation, not PRD alone.

---

## 1. Testing Scope Overview

Slipwise One is a **multi-product SaaS finance and document operations platform**. This testing handover covers all currently implemented modules as of the Phase 14 completion.

**High-priority areas for this cycle (Phase 14 new code):**
- Dunning Engine (automated overdue follow-up sequences)
- Customer Self-Service Portal (magic-link auth, invoice viewing, payment)
- Quotes module (full lifecycle)
- Cash Flow Intelligence
- Payment Arrangements (installment plans)

**Regression-sensitive existing areas:**
- Invoice create/edit/send/pay flow — touched by Phase 14 additions
- Invoice reconciliation (`reconcileInvoicePayment`) — called by multiple new flows
- Document numbering — extended for quotes
- Plan enforcement — new limits added

---

## 2. Test Environment Assumptions

- App deployed locally (`npm run dev`) or against staging environment
- A Supabase project is running with migrations applied
- Razorpay test credentials configured (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`)
- At minimum 4 test organizations created — one per plan tier (free, starter, pro, enterprise)
- At minimum 2 test users per org with different roles
- `CRON_SECRET` set and cron routes callable via `curl -H "Authorization: Bearer $CRON_SECRET"`
- `DUNNING_OPT_OUT_SECRET` and `PORTAL_JWT_SECRET` set in `.env`

---

## 3. Priority Order for Testing

Execute in this order — each builds on the previous:

1. **Auth / Onboarding** — everything else requires a working session
2. **Invoice lifecycle** — foundational; used by dunning, portal, quotes
3. **Roles & permissions** — verify access controls before module-by-module testing
4. **Plan enforcement** — verify limits before deep-diving modules
5. **Dunning Engine** — new in Phase 14; high risk
6. **Customer Portal** — new in Phase 14; auth-heavy
7. **Quotes** — new in Phase 14
8. **Payment Arrangements** — new in Phase 14
9. **Cash Flow Intelligence** — new in Phase 14
10. **PDF Studio / Pixel Studio** — lower risk; regression check
11. **Integrations** — QuickBooks, Zoho, Tally export
12. **API endpoints** — contract validation
13. **Billing** — subscription flows

---

## 4. Module-by-Module Test Checklist

---

### 4.1 Auth & Onboarding

**Critical flows:**

| # | Test Case | Expected |
|---|---|---|
| A-01 | Sign up with new email | Email verification sent; redirect to verify page |
| A-02 | Verify email via OTP link | Session established; redirect to onboarding |
| A-03 | Complete onboarding (org name, branding) | Org created; redirect to dashboard |
| A-04 | Sign in with correct credentials | Session established; redirect to `/app/intel/dashboard` |
| A-05 | Sign in with wrong password | Error message shown; no session |
| A-06 | Sign in with unverified email | Resend verification prompt shown |
| A-07 | Forgot password flow | Reset email sent; password can be changed |
| A-08 | Accept invite (new user) | Account created; role assigned; redirect to dashboard |
| A-09 | Accept invite (existing user) | Org added to existing account |
| A-10 | Session expiry | Middleware clears cookie; redirect to login |
| A-11 | Direct access to `/app/*` without session | Redirect to `/auth/login?callbackUrl=...` |
| A-12 | SSO SAML login (Enterprise org) | SAML redirect; user provisioned on first login |

---

### 4.2 Roles & Permissions

**Test with these role pairs at minimum:**

| Role | Can Do | Cannot Do |
|---|---|---|
| `owner` | All operations | N/A |
| `admin` | All operations | Cannot delete org |
| `finance_manager` | Invoice/voucher/pay full access | Cannot manage users/roles |
| `hr_manager` | Salary slips + employees full access | Cannot access invoices |
| `invoice_operator` | Invoice CRUD | Cannot access vouchers, salary |
| `voucher_operator` | Voucher CRUD | Cannot access invoices, salary |
| `viewer` | Read-only on permitted modules | Cannot create/edit/delete |

**Test cases:**

| # | Test Case | Expected |
|---|---|---|
| R-01 | `invoice_operator` tries to create salary slip | 403 / access denied |
| R-02 | `viewer` tries to delete an invoice | 403 / access denied |
| R-03 | `hr_manager` tries to access `/app/docs/invoices/` | Denied or empty (no data) |
| R-04 | `finance_manager` tries to access `/app/settings/roles/` | Denied |
| R-05 | `admin` invites a user and assigns role | User receives invite email; role applied on acceptance |
| R-06 | `owner` downgrades a user from `admin` to `viewer` | User loses admin capabilities immediately |

---

### 4.3 Plan Enforcement

**Test each limit gate:**

| # | Test Case | Plan | Expected |
|---|---|---|---|
| P-01 | Create 11th invoice in a month | Free | Blocked with upgrade prompt |
| P-02 | Create 101st invoice in a month | Starter | Blocked with upgrade prompt |
| P-03 | Create 2nd dunning sequence | Free | Blocked with upgrade prompt |
| P-04 | Create 4th dunning sequence | Starter | Blocked with upgrade prompt |
| P-05 | Access cash flow intelligence | Free / Starter | Blocked with upgrade prompt |
| P-06 | Access customer health scores | Free / Starter | Blocked with upgrade prompt |
| P-07 | Create payment arrangement | Free | Blocked with upgrade prompt |
| P-08 | Create payment arrangement | Starter | Allowed |
| P-09 | Access API key settings | Free / Starter | Blocked |
| P-10 | Create 11th quote in a month | Free | Blocked with upgrade prompt |
| P-11 | Invite 6th team member | Starter | Blocked |
| P-12 | Access SSO settings | Non-enterprise | Blocked |

---

### 4.4 Invoice Lifecycle

The most critical end-to-end flow in the product.

**Happy path:**

| # | Step | Expected |
|---|---|---|
| I-01 | Create invoice (draft) | Invoice created, doc number assigned (INV-001 etc.), draft state |
| I-02 | Edit line items, apply discount, add tax | Totals update correctly |
| I-03 | Preview invoice | Template renders correctly; no layout breaks |
| I-04 | Export invoice as PDF | PDF downloads with correct content |
| I-05 | Export invoice as PNG | PNG downloads |
| I-06 | Send invoice to customer email | Email delivered; state → `sent` |
| I-07 | Customer opens public invoice link `/invoice/[token]` | Invoice renders with pay button |
| I-08 | Customer pays via Razorpay (test mode) | Payment recorded; state → `paid` |
| I-09 | Admin views invoice | Status shows `paid`; payment history visible |
| I-10 | Generate public share link | Read-only link works; no pay button |

**Edge cases:**

| # | Test Case | Expected |
|---|---|---|
| I-11 | Create invoice with no line items | Validation error |
| I-12 | Create invoice for non-existent customer | Validation error |
| I-13 | Void a paid invoice | Blocked (cannot void paid) |
| I-14 | Duplicate invoice | Creates draft copy; new invoice number assigned |
| I-15 | Pay invoice twice via Razorpay webhook replay | Idempotent — second payment ignored |
| I-16 | Partial payment via Razorpay | State → `partially_paid`; balance remaining shown |
| I-17 | Mark invoice as paid manually (full) | State → `paid`; reconciled |
| I-18 | Mark invoice with manual partial payment | State → `partially_paid` |
| I-19 | Upload payment proof | Proof attached; visible to admin |
| I-20 | Admin rejects payment proof | Invoice status reverts; rejection reason shown |
| I-21 | Create recurring rule (monthly) | Cron generates next invoice on schedule |
| I-22 | Scheduled send at future date | Invoice sent at the scheduled time |
| I-23 | Overdue cron runs on past-due invoice | Invoice state → `overdue` |
| I-24 | Access public token for wrong org | 404 / not found |

**Approval workflow (Pro+):**

| # | Test Case | Expected |
|---|---|---|
| I-25 | Submit invoice for approval | Status → pending approval; approver notified |
| I-26 | Approver approves | Invoice → approved; can now be sent |
| I-27 | Approver rejects | Invoice back to draft with rejection comment |
| I-28 | Try to send invoice pending approval | Blocked |

---

### 4.5 Vouchers

| # | Test Case | Expected |
|---|---|---|
| V-01 | Create payment voucher with debit/credit entries | Entries balance correctly |
| V-02 | Create receipt voucher | Saved; downloadable |
| V-03 | AI expense categorization | Suggested category shown; user can accept or override |
| V-04 | Export as PDF | Downloads correctly |
| V-05 | Template switching | All 5 templates render without error |

---

### 4.6 Salary Slips

| # | Test Case | Expected |
|---|---|---|
| SS-01 | Create employee | Employee saved with all fields |
| SS-02 | Create salary preset | Preset saved; reusable |
| SS-03 | Generate salary slip from preset | Earnings/deductions pre-filled |
| SS-04 | Net pay computed correctly | Gross - deductions = net pay (auto-calculated) |
| SS-05 | Bulk generate salary slips | All employees get slips for the period |
| SS-06 | PDF export | Downloads correctly |
| SS-07 | AI TDS insight | TDS suggestion shown for high earners |
| SS-08 | Template switching | All 5 templates render without error |

---

### 4.7 Dunning Engine ⚠️ High Priority (Phase 14)

**Sequence management:**

| # | Test Case | Expected |
|---|---|---|
| D-01 | Create dunning sequence with 3 steps | Saved; steps ordered |
| D-02 | Edit step (delay, channel, template) | Changes saved; next run uses new config |
| D-03 | Delete a step from sequence | Step removed; remaining steps reorder |
| D-04 | Delete a sequence | Sequence and steps removed |
| D-05 | Try to create sequence beyond plan limit | Blocked with upgrade prompt |
| D-06 | Try to add step beyond plan step limit | Blocked with upgrade prompt |

**Engine behavior:**

| # | Test Case | Expected |
|---|---|---|
| D-07 | Run dunning cron against overdue invoice | Invoice assigned to matching sequence; step 1 queued |
| D-08 | Run step 1 (email) | Email sent; `DunningLog` entry created with status `sent` |
| D-09 | Run step 1 (SMS) with MSG91 configured | SMS sent; log entry created |
| D-10 | Run dunning cron again on same invoice | Idempotent — step 1 not re-fired |
| D-11 | Step 2 fires on schedule | Correct delay respected; log created |
| D-12 | Invoice paid during dunning sequence | Next step not fired; sequence marked stopped |
| D-13 | Invoice has payment arrangement | Dunning paused; not fired while arrangement active |
| D-14 | SMS step fires with no MSG91 key configured | Fails gracefully; log entry shows `failed`; does not crash engine |
| D-15 | Step fire fails (email bounce) | Logged as `failed`; retry cron picks it up |
| D-16 | Retry cron re-attempts failed step | Retry attempted; success or final failure logged |
| D-17 | Dunning step with payment link option | Fresh Razorpay payment link included in email |
| D-18 | Payment link in step is expired | Link auto-renewed before sending |

**Opt-out:**

| # | Test Case | Expected |
|---|---|---|
| D-19 | Customer clicks opt-out link in dunning email | `DunningOptOut` record created; customer unsubscribed |
| D-20 | Further dunning steps skipped for opted-out customer | No further emails/SMS sent |
| D-21 | Opt-out link with tampered signature | Rejected (HMAC validation fails) |
| D-22 | Admin manually re-enables dunning for opted-out customer | Customer re-subscribed |

**Bulk Remind API:**

| # | Test Case | Expected |
|---|---|---|
| D-23 | `POST /api/v1/invoices/bulk-remind` with valid API key | Dunning triggered for listed invoices |
| D-24 | Same endpoint with invalid API key | 401 |
| D-25 | Same endpoint with API key scoped to wrong resource | 403 |
| D-26 | Oversized request body | 400 / validation error |

---

### 4.8 Customer Portal ⚠️ High Priority (Phase 14)

**Auth flow:**

| # | Test Case | Expected |
|---|---|---|
| CP-01 | Customer requests magic link with registered email | Email sent with login link; response identical to unregistered |
| CP-02 | Customer requests magic link with unregistered email | Same success response (anti-enumeration) |
| CP-03 | Customer clicks login link | JWT session cookie set; redirect to portal dashboard |
| CP-04 | Login link used twice | Second use fails (token consumed) |
| CP-05 | Login link expired (>15 min) | Rejected; user prompted to request new link |
| CP-06 | JWT session cookie expires | Redirect to portal login |
| CP-07 | Tampered JWT cookie | Rejected; session cleared |
| CP-08 | Customer logs out | Cookie cleared; redirect to login |
| CP-09 | Rate limit on magic link requests | After N requests in window, 429 returned |

**Portal pages:**

| # | Test Case | Expected |
|---|---|---|
| CP-10 | Dashboard shows correct open invoices | Only invoices for this customer's org are shown |
| CP-11 | Dashboard shows correct payment summary | Matches admin-side data |
| CP-12 | Invoices list shows only this customer's invoices | No cross-customer data leakage |
| CP-13 | Invoice detail loads correctly | Invoice readable; pay button visible if unpaid |
| CP-14 | Customer pays via portal (Razorpay) | Payment recorded; invoice state updates |
| CP-15 | Account statement with date filter | Shows correct entries for selected period |
| CP-16 | Customer A cannot view Customer B's invoice by changing URL token | 404 / forbidden |
| CP-17 | Profile update (email/phone) | Saved; change reflected in admin customer record |

**Admin portal settings:**

| # | Test Case | Expected |
|---|---|---|
| CP-18 | Admin disables portal | Portal login page returns "portal not enabled" |
| CP-19 | Admin revokes customer's portal sessions | Customer's existing JWT sessions invalidated |

---

### 4.9 Quotes ⚠️ High Priority (Phase 14)

| # | Test Case | Expected |
|---|---|---|
| Q-01 | Create quote with line items, validity date | Saved as draft; doc number assigned (QUO-001) |
| Q-02 | Edit quote in draft state | Changes saved |
| Q-03 | Send quote to customer | Email sent; status → `sent`; public link active |
| Q-04 | Customer opens `/quote/[token]` | Quote renders with Accept / Decline buttons |
| Q-05 | Customer accepts quote | Status → `accepted`; admin notified |
| Q-06 | Customer declines quote | Status → `declined`; admin notified |
| Q-07 | Convert accepted quote to invoice | Invoice created with same line items; quote status → `converted` |
| Q-08 | Convert same accepted quote again | Idempotent — returns existing invoice, no duplicate created |
| Q-09 | Try to convert non-accepted quote | Blocked |
| Q-10 | Quote expiry cron runs on expired quote | Status → `expired` |
| Q-11 | Edit quote after sending | Only allowed if status allows editing |
| Q-12 | Access quote token for wrong org | 404 |
| Q-13 | Quote beyond plan limit | Blocked with upgrade prompt |

---

### 4.10 Payment Arrangements ⚠️ High Priority (Phase 14)

| # | Test Case | Expected |
|---|---|---|
| PA-01 | Create arrangement for overdue invoice (3 installments) | Arrangement created; 3 installment records created with due dates |
| PA-02 | Pay first installment via Razorpay | Installment status → `paid`; invoice balance reduced |
| PA-03 | Miss second installment (run overdue cron) | Installment status → `overdue`; dunning optionally resumed |
| PA-04 | All installments paid | Parent invoice → `paid` |
| PA-05 | Create arrangement on non-overdue invoice | Allowed or blocked per business rule — verify behavior |
| PA-06 | Create arrangement for Free plan org | Blocked with upgrade prompt |
| PA-07 | Two arrangements on same invoice | Second blocked (only one active arrangement allowed) |
| PA-08 | Cancel arrangement | Installments cancelled; dunning can resume |

---

### 4.11 Cash Flow Intelligence (Phase 14)

| # | Test Case | Expected |
|---|---|---|
| CF-01 | Access cash flow page on Free plan | Blocked with upgrade prompt |
| CF-02 | Access cash flow page on Pro plan | Dashboard loads |
| CF-03 | DSO displayed | Correct 30/60/90-day rolling DSO |
| CF-04 | AR aging buckets | Correct bucketing of outstanding invoices |
| CF-05 | Cash flow forecast | Correct expected inflows by due date |
| CF-06 | High DSO alert | Alert shown when DSO exceeds threshold |
| CF-07 | Customer health score shown | 5-factor score displayed per customer |
| CF-08 | Customer health score on Starter plan | Blocked |

---

### 4.12 PDF Studio

All tools are implemented. Test each tool's core happy path and at least one error case.

| Tool | Happy Path | Error Case |
|---|---|---|
| Merge PDFs | Upload 2+ PDFs → merge → download | Corrupt PDF input → graceful error |
| Split PDF | Upload PDF → select pages → download | Invalid page range → validation error |
| Delete Pages | Upload PDF → select pages to delete → download | Deleting all pages → error |
| Organize Pages | Drag pages to reorder → export | N/A |
| Resize Pages | Upload → select A4 → download | N/A |
| Fill & Sign | Upload form PDF → fill fields → sign → download | No form fields in PDF → graceful message |
| Header & Footer | Upload → add header text → export | N/A |
| Protect | Upload → set password → download | Wrong unlock password → access denied |
| Repair | Upload damaged PDF → repair → download | Unrepairable file → error message |
| PDF to Image | Upload PDF → convert → download images | N/A |

---

### 4.13 Pixel Studio

| Tool | Happy Path |
|---|---|
| Adjust | Upload image → adjust sliders → download |
| Label | Upload → add text overlay → download |
| Passport | Upload photo → crop to spec → download |
| Resize | Upload → set dimensions → download |
| Print Layout | Upload multiple images → arrange → download |

---

### 4.14 Integrations

| # | Test Case | Expected |
|---|---|---|
| INT-01 | Connect QuickBooks (OAuth) | Auth redirect; tokens stored; connection shown |
| INT-02 | Sync invoices to QuickBooks | Invoices appear in QuickBooks |
| INT-03 | Disconnect QuickBooks | Tokens revoked; sync stops |
| INT-04 | Connect Zoho Books (OAuth) | Same as QuickBooks |
| INT-05 | Sync to Zoho Books | Data synced |
| INT-06 | Tally XML export | Downloads valid XML importable by Tally |
| INT-07 | GSTR-1 export | Downloads valid GSTR-1 JSON for selected period |

---

### 4.15 API (v1)

| # | Test Case | Expected |
|---|---|---|
| API-01 | `GET /api/v1/invoices` with valid key | Returns invoices for the org |
| API-02 | `GET /api/v1/invoices` with no key | 401 |
| API-03 | `GET /api/v1/invoices` with wrong-org key | 403 or empty result |
| API-04 | `POST /api/v1/invoices` with valid payload | Invoice created; 201 response |
| API-05 | `POST /api/v1/invoices` with invalid payload | 400 with validation message |
| API-06 | API access from Free plan org | 403 / plan gating |
| API-07 | Webhook delivery to configured endpoint | Event delivered; delivery log created |
| API-08 | Webhook endpoint down | Delivery retried; failure logged |

---

## 5. Critical End-to-End Flows

These flows cross multiple modules and are the highest-risk regression targets.

### E2E-1: Invoice → Payment via Customer Portal
1. Admin creates invoice for customer
2. Admin sends invoice
3. Customer receives email with portal link
4. Customer logs into portal via magic link
5. Customer views invoice in portal
6. Customer pays via Razorpay (test mode)
7. Admin sees invoice status as `paid`
8. Dunning (if running) stops for this invoice

### E2E-2: Overdue Invoice → Dunning → Payment
1. Admin creates invoice with due date in the past
2. Overdue cron marks invoice as `overdue`
3. Dunning cron assigns invoice to a sequence
4. Dunning step 1 fires (email with payment link)
5. Customer receives dunning email
6. Customer pays via the payment link
7. Dunning stops; no further steps fired
8. Invoice state → `paid`

### E2E-3: Quote → Invoice → Payment
1. Admin creates quote for customer
2. Admin sends quote
3. Customer receives email; opens `/quote/[token]`
4. Customer accepts quote
5. Admin sees quote status as `accepted`
6. Admin converts quote to invoice
7. Invoice created with correct line items
8. Admin sends invoice
9. Customer pays; invoice marked paid

### E2E-4: Overdue Invoice → Payment Arrangement → Installment Payments
1. Invoice is overdue
2. Admin creates 3-installment arrangement
3. Dunning is paused for this invoice
4. Customer pays installment 1 via payment link
5. Installment 1 → `paid`; invoice balance reduced
6. Installment 2 overdue cron runs; installment 2 → `overdue`
7. Admin manually records installment 2 payment
8. Admin records installment 3 payment
9. Invoice → `paid`

### E2E-5: Role-based Access Boundary
1. `finance_manager` creates and sends invoice — succeeds
2. `hr_manager` tries to access the invoice — denied
3. `invoice_operator` creates invoice — succeeds
4. `invoice_operator` tries to create salary slip — denied
5. `viewer` views invoice list — succeeds (read-only)
6. `viewer` tries to delete invoice — denied

---

## 6. Security & Access Control Checks

| # | Check | Expected |
|---|---|---|
| SEC-01 | IDOR: change customer ID in URL to another org's customer | 404 or 403 |
| SEC-02 | IDOR: change invoice ID in URL to another org's invoice | 404 or 403 |
| SEC-03 | Portal JWT: use token from Org A to access Org B's portal | Rejected |
| SEC-04 | Portal token: replay used magic link | Rejected |
| SEC-05 | Dunning opt-out: tamper with HMAC signature | Rejected |
| SEC-06 | Quote public token: guess another org's token | 404 (token is random UUID, not sequential) |
| SEC-07 | API key: use key from org A against org B routes | 403 |
| SEC-08 | Invoice public token: sequential token enumeration | Tokens are UUID — not enumerable |
| SEC-09 | Payment webhook replay (Razorpay) | Idempotent — no double-payment |
| SEC-10 | XSS: inject script into customer name | Rendered escaped; no execution |
| SEC-11 | Cron routes: call without `CRON_SECRET` | 401 |
| SEC-12 | Magic link rate limit | After N requests, 429 returned |
| SEC-13 | Portal session after customer data deleted | Session invalidated; 401 |

---

## 7. Payment & Finance-Specific Checks

| # | Check | Expected |
|---|---|---|
| FIN-01 | Invoice total with multiple tax rates | Correct per-line and summary totals |
| FIN-02 | Invoice with discount at invoice level | Discount applied to subtotal correctly |
| FIN-03 | Invoice with extra charges | Added to total correctly |
| FIN-04 | Invoice with extra charges + discount + tax | Correct order of operations |
| FIN-05 | Partial payment recorded manually | Balance due updated correctly |
| FIN-06 | Two partial payments bring balance to zero | Invoice → `paid` |
| FIN-07 | Razorpay payment amount mismatch | Not reconciled until correct amount received |
| FIN-08 | Razorpay webhook for different invoice | Applied to correct invoice only |
| FIN-09 | Amount in words (Indian number system) | Correctly formatted for INR amounts |
| FIN-10 | GSTR-1 export for period with mixed GST rates | All line items correctly categorized |

---

## 8. Regression-Sensitive Areas

These areas are most likely to break when new code is introduced:

1. **`reconcileInvoicePayment()`** — called by payment links, portal payments, manual payment recording, installment payments. Any change here affects all payment paths.
2. **Invoice state machine** — states are strictly ordered; transitions must be validated.
3. **Plan enforcement** — used across all modules; new features must not bypass the check.
4. **Document numbering** (`nextDocumentNumber`) — must be atomic/sequential; no gaps or duplicates.
5. **Portal JWT validation** — any change to token structure/signing breaks active sessions.
6. **Dunning opt-out HMAC** — any key rotation invalidates existing opt-out links.
7. **Overdue detection cron** — must not double-process or re-trigger already-processed invoices.
8. **Quote-to-invoice conversion idempotency** — must not create duplicate invoices.
9. **Recurring invoice generation** — must generate exactly once per period.
10. **Razorpay webhook handler** — must be idempotent; `RazorpayEvent` deduplication must work.

---

## 9. Edge Cases & Failure Paths

| # | Edge Case | Expected Behavior |
|---|---|---|
| EC-01 | Org reaches storage limit | Upload blocked with clear message |
| EC-02 | Resend email delivery failure | Error logged; document state not changed |
| EC-03 | Razorpay API timeout during payment link creation | Error returned; no partial state created |
| EC-04 | DB connection lost mid-transaction | Transaction rolled back; no partial state |
| EC-05 | Two concurrent dunning cron runs | Second run completes without double-firing steps |
| EC-06 | Installment amount sum ≠ invoice balance | Validation error on arrangement creation |
| EC-07 | Quote sent to invalid email | Email delivery fails; error logged |
| EC-08 | PDF export with large number of line items | PDF generates correctly (no overflow/truncation) |
| EC-09 | Duplicate invoice submission (double-click) | One invoice created (form submission idempotency) |
| EC-10 | User invited to org they already belong to | Error message; no duplicate membership |
| EC-11 | Plan downgrade with existing data above new limit | Existing data preserved; new creation blocked |
| EC-12 | Dunning email sent with missing template variables | Variable fallback or error shown; not crashing |
| EC-13 | Portal customer with no invoices | Empty state shown (not error) |
| EC-14 | Cash flow page with no invoice data | Empty state / zero values shown |

---

## 10. Loading, Empty, and Error States

For every module, verify all three UI states:

| State | Verify |
|---|---|
| **Loading** | Skeleton/spinner shows while data fetches |
| **Empty** | Helpful empty state with CTA (not blank page, not error) |
| **Error** | User-friendly error message; no raw stack traces |
| **Plan gate** | Upgrade prompt shown; feature locked |
| **Permission denied** | Access denied message; no partial data leaked |

---

## 11. Bug Report Template

Use this structure for all bug reports:

```
Title: [Module] [Short description of the bug]

Environment:
- URL:
- Plan:
- Role:
- Browser + Version:
- Date/Time:

Steps to Reproduce:
1.
2.
3.

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happens]

Screenshot/Recording:
[Attach if applicable]

Severity:
[ ] Critical (data loss / security / broken core flow)
[ ] High (core feature broken but workaround exists)
[ ] Medium (non-core feature broken or UI issue)
[ ] Low (cosmetic / minor UX issue)

Additional Notes:
[Any relevant context, console errors, network errors]
```

---

## 12. Test Execution Priority

### P0 — Must Pass Before Any Release
- Auth (A-01 through A-10)
- Invoice core lifecycle (I-01 through I-15)
- Role enforcement (R-01 through R-06)
- Plan enforcement (P-01 through P-12)
- Dunning engine (D-07 through D-18)
- Portal auth (CP-01 through CP-09)
- Payment security (SEC-01 through SEC-13)
- Finance accuracy (FIN-01 through FIN-09)

### P1 — Complete Before Shipping Phase 14 Features
- Portal pages (CP-10 through CP-19)
- Quotes (Q-01 through Q-13)
- Payment arrangements (PA-01 through PA-08)
- Cash flow (CF-01 through CF-08)
- E2E flows (E2E-1 through E2E-5)

### P2 — Complete in Current Sprint
- PDF Studio all tools (happy path + one error case each)
- Pixel Studio (happy path each)
- Integrations (INT-01 through INT-07)
- API (API-01 through API-08)

### P3 — Full Regression
- All remaining edge cases
- All loading/empty/error states
- Billing flows

---

## 13. Exit Criteria

A testing cycle is **complete and releasable** when:

- [ ] All P0 test cases pass
- [ ] All P1 test cases pass
- [ ] All Critical and High severity bugs are resolved
- [ ] All 5 E2E flows execute successfully end-to-end
- [ ] No security test case (SEC-*) is failing
- [ ] All 4 plan tiers have been verified against plan enforcement gates
- [ ] All 7 roles have been verified against access control gates
- [ ] Regression-sensitive areas (§8) have been explicitly re-tested
- [ ] P2 test cases pass or have accepted deferrals documented
- [ ] P3 test cases pass or have accepted deferrals documented
- [ ] Bug report log reviewed; no undocumented open issues
