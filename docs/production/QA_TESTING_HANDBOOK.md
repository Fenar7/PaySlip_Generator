# Slipwise One — QA & Testing Handbook
**Prepared for:** QA / Testing Team  
**Date:** April 11, 2026  
**Product:** Slipwise One by Zenxvio  
**Version:** v1.1  

---

## Overview

This handbook is the **broad regression catalog** for Slipwise One. It is useful for deep module coverage, but it is **not** the release-signoff source of truth by itself.

For current release posture and remediation-focused launch checks, use these companion docs first:

- `docs/QA_TESTING_HANDOVER_CURRENT_STATE.md`
- `docs/production/PRODUCT_STATUS_REPORT.md`
- `docs/production/RELEASE_READINESS_CHECKLIST.md`

### Test Environment Setup
1. Clone the repository and install dependencies
   ```bash
   git clone <repository-url>
   cd payslip-generator
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the required test credentials
3. Start local Supabase services: `npm run supabase:start`
4. Apply database migrations: `npm run db:migrate`
5. Start the app: `npm run dev` → `http://localhost:3001`

### Test Credentials Needed
- Supabase project (test)
- Razorpay test keys (from Razorpay Dashboard → Test Mode)
- Brevo SMTP test credentials
- `CRON_SECRET`, `PORTAL_JWT_SECRET`, and `DUNNING_OPT_OUT_SECRET`

---

## Module 1 — Authentication & Onboarding

### 1.1 User Registration
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| T1.1.1 | Register with valid email | Enter email + password → Submit | Account created, verification email sent |
| T1.1.2 | Register with invalid email | Enter "notanemail" → Submit | Validation error shown |
| T1.1.3 | Register with weak password | Enter "123" → Submit | Password strength error |
| T1.1.4 | Register with duplicate email | Use existing email → Submit | "Email already in use" error |
| T1.1.5 | Magic link sign-in | Enter email → "Send magic link" | Email received, click link, logged in |
| T1.1.6 | Email verification | Register → Check inbox | Verification email arrives within 1 minute |

### 1.2 Login / Logout
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| T1.2.1 | Login with valid credentials | Email + password → Login | Redirected to /app or onboarding |
| T1.2.2 | Login with wrong password | Correct email, wrong password | "Invalid credentials" error |
| T1.2.3 | Login with unverified email | Try to login before verifying | Appropriate warning shown |
| T1.2.4 | Logout | Click logout | Session cleared, redirected to /login |
| T1.2.5 | Session persistence | Login → close tab → reopen | Still logged in |
| T1.2.6 | Session expiry | Wait for token expiry (Supabase default: 1 hour) | Prompted to re-login |

### 1.3 Onboarding Flow
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| T1.3.1 | First-time user onboarding | New account → First login | Onboarding wizard shown |
| T1.3.2 | Create organization | Enter org name → Submit | Org created, user set as Owner |
| T1.3.3 | Profile setup | Enter full name, avatar | Profile saved, shown in dashboard |
| T1.3.4 | Skip onboarding | Click skip if available | Lands on empty dashboard |
| T1.3.5 | Existing user direct access | Login with existing account | Skips onboarding, goes to dashboard |

**Edge Cases:**
- Register → don't verify → try to login → correct error shown
- Onboarding interrupted mid-way → resume on next login
- Org name with special characters (valid), XSS attempt in org name (should be escaped)

---

## Module 2 — Organization Management

### 2.1 Organization Settings
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| T2.1.1 | Update org name | Settings → Org → Edit name → Save | Name updated, reflected everywhere |
| T2.1.2 | Upload org logo | Settings → Upload logo (PNG/JPG) | Logo stored, shown in header |
| T2.1.3 | Upload invalid file type | Upload .exe or .pdf as logo | Error: "Only image files accepted" |
| T2.1.4 | Upload oversized image | Upload image > 10MB | Error about file size |
| T2.1.5 | Set branding colors | Pick primary + secondary color | Saved, reflected in branded previews |

### 2.2 Member Management
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| T2.2.1 | Invite member by email | Settings → Members → Invite → Enter email | Invitation email sent |
| T2.2.2 | Accept invitation | Click invite link in email | User added to org with assigned role |
| T2.2.3 | Invite expired link | Use invite link after 7 days | "Invitation expired" message |
| T2.2.4 | Invite already-member email | Invite existing member | "Already a member" error |
| T2.2.5 | Change member role | Settings → Members → Change role | Role updated immediately |
| T2.2.6 | Remove member | Settings → Members → Remove | Member removed, loses access |
| T2.2.7 | Remove yourself (Owner) | Owner tries to remove themselves | Blocked with error |
| T2.2.8 | Plan member limit | Free plan: try to add 2nd member | Upgrade prompt shown |

### 2.3 Role-Based Access Control
Test each role (Owner, Admin, Manager, Accountant, HR, Staff, Viewer):

| # | Test Case | Role | Expected |
|---|-----------|------|----------|
| T2.3.1 | Viewer cannot create invoices | Viewer | "Create Invoice" button hidden or blocked |
| T2.3.2 | Staff cannot access billing | Staff | /app/billing → 403 redirect |
| T2.3.3 | Accountant can view reports | Accountant | Reports accessible |
| T2.3.4 | HR can access salary slips | HR | Salary slip module accessible |
| T2.3.5 | Manager can approve workflows | Manager | Approve button visible |
| T2.3.6 | Admin can manage members | Admin | Settings → Members accessible |
| T2.3.7 | Owner has full access | Owner | All features accessible |

---

## Module 3 — Invoice Management

### 3.1 Invoice Creation
| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| T3.1.1 | Create invoice with all fields | Fill in client, items, taxes → Save | Invoice saved with all data |
| T3.1.2 | Create invoice - required fields only | Minimal data → Save | Invoice saved with defaults |
| T3.1.3 | Auto-generated invoice number | Create new invoice | INV-001 (sequential) auto-assigned |
| T3.1.4 | Add line items | Click "Add item" multiple times | Items added with correct subtotals |
| T3.1.5 | Remove line item | Click remove on a line item | Item removed, totals recalculate |
| T3.1.6 | Apply line item discount | Enter discount on one item | Discount applied to that item only |
| T3.1.7 | Apply invoice-level discount | Invoice settings → Add discount | Discount applied to invoice total |
| T3.1.8 | GST calculation | Enter item with 18% GST | CGST 9% + SGST 9% shown (or IGST 18%) |
| T3.1.9 | Zero-tax item | Enter item with 0% tax | No tax shown, subtotal only |
| T3.1.10 | Amount in words | Enter any amount | Correct words generated (Indian format) |
| T3.1.11 | Due date before invoice date | Set due date earlier | Validation warning shown |

### 3.2 Invoice CRUD
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T3.2.1 | View invoice list | All invoices shown, paginated |
| T3.2.2 | Search invoice by number | Correct invoice found |
| T3.2.3 | Filter by status | Draft/Sent/Paid/Overdue filtered correctly |
| T3.2.4 | Edit saved invoice | Changes saved, version preserved |
| T3.2.5 | Duplicate invoice | New invoice created with incremented number |
| T3.2.6 | Delete invoice | Invoice removed from list |
| T3.2.7 | Delete paid invoice | Confirm dialog shown before deletion |

### 3.3 Invoice Templates
Test all 5 templates for each:
| # | Test Case |
|---|-----------|
| T3.3.1 | Select template — all data renders correctly |
| T3.3.2 | Switch template — data preserved |
| T3.3.3 | Template renders long company names without overflow |
| T3.3.4 | Template renders 20+ line items |
| T3.3.5 | Template renders ₹ symbol and Indian number formatting |

Templates to test: Minimal, Professional, Bold Brand, Classic Bordered, Modern Edge

### 3.4 Invoice Export
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T3.4.1 | Download as PDF | PDF downloaded, matches preview |
| T3.4.2 | Download as PNG | PNG downloaded, full invoice shown |
| T3.4.3 | Print invoice | Print dialog opened, preview correct |
| T3.4.4 | Export with logo | Logo appears in exported PDF |
| T3.4.5 | Export with watermark | Watermark appears if configured |
| T3.4.6 | First-click export | Download triggers on first click (session URL) |

### 3.5 Invoice Sharing
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T3.5.1 | Generate shareable link | Unique URL generated |
| T3.5.2 | Access public link (not logged in) | Invoice readable, no auth required |
| T3.5.3 | Shared link shows correct data | All invoice fields visible |
| T3.5.4 | Download from shared link | PDF downloadable from shared view |

### 3.6 Inline Editing (Document Canvas)
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T3.6.1 | Click on company name in canvas | Text input appears in place |
| T3.6.2 | Click on invoice date | Date picker appears |
| T3.6.3 | Click on line item amount | Number input with decimal support |
| T3.6.4 | Press Tab to move between fields | Focus moves to next editable field |
| T3.6.5 | Edit reflects in real-time | Canvas updates as you type |

---

## Module 4 — Voucher Management

### 4.1 Voucher Creation
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T4.1.1 | Create payment voucher | Payee, amount, narration saved |
| T4.1.2 | Create receipt voucher | Receipt fields saved correctly |
| T4.1.3 | Add double-entry accounts | Debit + Credit entries balance to zero |
| T4.1.4 | Debit ≠ Credit warning | Imbalanced entries show warning |
| T4.1.5 | Voucher number auto-increment | VCH-001, VCH-002 sequential |

All CRUD, template, export, sharing, and inline editing tests mirror Module 3 (run T3.2–T3.6 equivalents for vouchers).

Templates to test: Compact Receipt, Formal Bordered, Minimal Office, Modern Card, Traditional Ledger

---

## Module 5 — Salary Slip Management

### 5.1 Salary Slip Creation
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T5.1.1 | Create salary slip for employee | All fields saved |
| T5.1.2 | Add earnings components | Basic, HRA, allowances |
| T5.1.3 | Add deductions | PF, TDS, loan deductions |
| T5.1.4 | Net pay auto-calculation | Gross - Deductions = Net Pay |
| T5.1.5 | Add custom earning/deduction labels | Custom labels saved |
| T5.1.6 | Pay period selection | Month/Year picker works |

All CRUD, template, export, sharing, and inline editing tests mirror Module 3 (run T3.2–T3.6 equivalents for salary slips).

Templates to test: Classic Formal, Compact Payslip, Corporate Clean, Detailed Breakdown, Modern Premium

---

## Module 6 — Client / Vendor / Employee Management

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T6.1.1 | Add new client | Client saved with all details |
| T6.1.2 | Client GSTIN validation | Invalid GSTIN rejected |
| T6.1.3 | Use client in invoice | Client auto-fills in invoice form |
| T6.1.4 | Search clients | Finds by name or email |
| T6.1.5 | Edit client details | Changes reflected in linked invoices |
| T6.1.6 | Delete client with linked invoices | Confirmation required, handled gracefully |
| T6.1.7 | Add vendor | Vendor saved |
| T6.1.8 | Add employee with PAN | PAN stored, used in salary slips |
| T6.1.9 | Employee salary history | Previous salary slips listed |

---

## Module 7 — PDF Studio (8 Tools)

### 7.1 Upload
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T7.1.1 | Upload valid PDF | File processed, preview shown |
| T7.1.2 | Upload non-PDF file | Error: "Only PDF files accepted" |
| T7.1.3 | Upload PDF > 100MB | Error about file size |
| T7.1.4 | Drag-and-drop upload | File accepted via drag-and-drop |

### 7.2 Merge
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T7.2.1 | Merge 2 PDFs | Single merged PDF downloaded |
| T7.2.2 | Merge 5 PDFs | All pages in order |
| T7.2.3 | Reorder before merge | Final order matches reordered order |
| T7.2.4 | Merge 1 file | Error: minimum 2 files required |

### 7.3 Split
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T7.3.1 | Split by page range (1-3) | Pages 1-3 extracted as PDF |
| T7.3.2 | Split all pages individually | N PDFs created for N pages |
| T7.3.3 | Invalid page range (100-200 for 5-page PDF) | Validation error |

### 7.4 Compress
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T7.4.1 | Compress a large PDF | Output file smaller than input |
| T7.4.2 | Compress already-minimal PDF | Graceful handling, file still downloadable |

### 7.5 Delete Pages
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T7.5.1 | Delete page 2 from 5-page PDF | 4-page PDF without page 2 |
| T7.5.2 | Delete all pages | Error: cannot delete all pages |
| T7.5.3 | Delete non-existent page | Validation error |

### 7.6 Organize / Reorder
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T7.6.1 | Drag page 3 to position 1 | Pages reordered in output PDF |
| T7.6.2 | Reorder, then download | Correct page order maintained |

### 7.7 Resize
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T7.7.1 | Resize to A4 | All pages converted to A4 dimensions |
| T7.7.2 | Resize to Letter | Letter-size output |
| T7.7.3 | Resize landscape PDF to A4 | Correct orientation handling |

### 7.8 Password Encryption
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T7.8.1 | Add password to PDF | Encrypted PDF requires password to open |
| T7.8.2 | Verify password required | Open in PDF viewer → password prompt shown |
| T7.8.3 | Empty password field | Validation error |

### 7.9 Watermark
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T7.9.1 | Add text watermark ("CONFIDENTIAL") | Watermark appears on all pages |
| T7.9.2 | Add image watermark | Image watermark centered on pages |
| T7.9.3 | Adjust opacity (50%) | Semi-transparent watermark |
| T7.9.4 | Watermark on multi-page PDF | All pages have watermark |

---

## Module 8 — Payroll (SW Pay)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T8.1.1 | Create payroll run for a month | Run created for org |
| T8.1.2 | Add employees to run | Employees listed with salary |
| T8.1.3 | Bulk generate salary slips | One slip per employee |
| T8.1.4 | Approve payroll run | Status changes to Approved |
| T8.1.5 | Mark all as paid | Payment status updated |
| T8.1.6 | Download all slips as ZIP | All PDFs in one ZIP file |
| T8.1.7 | Rerun generation after salary change | Updated slip generated |

---

## Module 9 — Approvals (SW Flow)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T9.1.1 | Create approval workflow | Workflow with steps saved |
| T9.1.2 | Submit document for approval | Approvers notified by email |
| T9.1.3 | Approve document (Approver 1) | Stage 1 approved, Approver 2 notified |
| T9.1.4 | Reject document | Document rejected, requester notified |
| T9.1.5 | View approval history | All approve/reject actions logged |
| T9.1.6 | Non-approver tries to approve | Action blocked with permission error |
| T9.1.7 | Multi-step approval chain | All steps must complete in order |

---

## Module 10 — Analytics & Reports (SW Intel)

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T10.1.1 | Dashboard loads with correct data | Revenue, invoice counts match DB |
| T10.1.2 | Revenue chart — monthly view | Bars/lines for each month |
| T10.1.3 | Revenue chart — quarterly view | 4 quarters shown |
| T10.1.4 | Top clients report | Ranked by revenue |
| T10.1.5 | Outstanding invoices report | Overdue invoices listed with days overdue |
| T10.1.6 | Filter by date range | Data filtered to selected range |
| T10.1.7 | Empty state (new org) | Correct "No data yet" messaging |
| T10.1.8 | Export reports to CSV | CSV downloaded with correct data |

---

## Module 11 — Billing & Subscriptions

### 11.1 Plan Management
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T11.1.1 | Free plan — create 11th invoice | Upgrade prompt shown (limit: 10) |
| T11.1.2 | View pricing page | 4 plans shown with correct prices |
| T11.1.3 | Upgrade to Starter | Razorpay checkout opens |
| T11.1.4 | Complete Razorpay payment (test mode) | Subscription active, plan updated |
| T11.1.5 | Webhook: subscription.activated | Plan gates unlocked automatically |
| T11.1.6 | Webhook: subscription.charged | Billing invoice created |
| T11.1.7 | Webhook: subscription.cancelled | Plan downgraded to Free |

### 11.2 Razorpay Test Mode Flows
Use Razorpay test cards:
- `4111 1111 1111 1111` — Visa test card (success)
- `5500 0000 0000 0004` — Mastercard test card (success)
- Use Razorpay test UPI ID: `success@razorpay`

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T11.2.1 | Pay via test card | Subscription created in Razorpay + DB |
| T11.2.2 | Pay via test UPI | Same as above |
| T11.2.3 | Payment failure | Graceful error, retry option |
| T11.2.4 | Duplicate payment attempt | Idempotency check, no double charge |

### 11.3 Pause / Resume
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T11.3.1 | Pause subscription (Pro) | Paused in Razorpay + DB, billing stops |
| T11.3.2 | Pause with future resume date | Resume date stored, auto-resume triggered |
| T11.3.3 | Resume paused subscription | Active again, billing resumes |
| T11.3.4 | Access features while paused | Features remain accessible during pause |
| T11.3.5 | Free plan tries to pause | Pause option not shown |

### 11.4 Plan Change
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T11.4.1 | Upgrade Starter → Pro | Plan upgraded, new features unlocked |
| T11.4.2 | Downgrade Pro → Starter | Degraded plan, API access removed |
| T11.4.3 | Plan change — proration | Invoice/credit note for prorated amount |
| T11.4.4 | Downgrade below current usage | Warning: "You have X invoices, plan allows Y" |

### 11.5 Payment Links
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T11.5.1 | Generate payment link for invoice | Razorpay payment link URL created |
| T11.5.2 | Share payment link with client | Client can open and pay |
| T11.5.3 | Payment link — client pays | Webhook fires, invoice status → Paid |
| T11.5.4 | Payment link expires | After expiry, link shows "expired" |
| T11.5.5 | Cancel payment link | Link deactivated in Razorpay |

### 11.6 Smart Collect (Virtual Accounts)
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T11.6.1 | Create virtual account for customer | VA created in Razorpay, stored in DB |
| T11.6.2 | Simulate NEFT payment to VA | `virtual_account.credited` webhook fires |
| T11.6.3 | Auto-match payment to invoice | Matching invoice → status → Paid |
| T11.6.4 | Unmatched payment | Stored as UnmatchedPayment, alert shown |
| T11.6.5 | Duplicate VA creation | Returns existing VA (idempotent) |

---

## Module 12 — REST API Platform

### 12.1 API Key Management
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T12.1.1 | Generate API key (Pro plan) | Key shown once, stored as hash |
| T12.1.2 | Free plan generates API key | Blocked: "Upgrade to Pro" |
| T12.1.3 | Use API key in request header | `X-API-Key: sk_...` authenticates request |
| T12.1.4 | Use bearer token | `Authorization: Bearer sk_...` authenticates |
| T12.1.5 | Invalid API key | 401 Unauthorized |
| T12.1.6 | Revoke API key | Key no longer authenticates |
| T12.1.7 | Rotate API key | Old key revoked, new key issued |
| T12.1.8 | Pro plan — 3rd API key | Blocked at 2 key limit |

### 12.2 REST Endpoints
For each resource (invoices, vouchers, salary-slips, customers, employees, vendors):

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T12.2.1 | GET /api/v1/{resource} | Returns paginated list |
| T12.2.2 | POST /api/v1/{resource} | Creates resource, returns 201 |
| T12.2.3 | GET /api/v1/{resource}/:id | Returns specific resource |
| T12.2.4 | PUT /api/v1/{resource}/:id | Updates resource, returns 200 |
| T12.2.5 | DELETE /api/v1/{resource}/:id | Deletes resource, returns 204 |
| T12.2.6 | Cross-org access | Cannot access another org's resources |
| T12.2.7 | Pagination (limit/offset) | `?limit=10&offset=20` works correctly |
| T12.2.8 | Invalid JSON body | 400 with validation error |

**Invoice-specific endpoints:**
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T12.2.9 | POST /api/v1/invoices/:id/send | Email sent to client |
| T12.2.10 | POST /api/v1/invoices/:id/mark-paid | Status → Paid |
| T12.2.11 | POST /api/v1/invoices/:id/payment-link | Payment link URL returned |

### 12.3 Rate Limiting
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T12.3.1 | Free plan API request | 403: API not available on Free |
| T12.3.2 | Pro plan — 10,001st request | 429 Rate Limit exceeded |
| T12.3.3 | Rate limit resets monthly | Counter resets on billing date |
| T12.3.4 | Rate limit headers | `X-RateLimit-Remaining` in response |

### 12.4 Webhooks
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T12.4.1 | Create webhook endpoint | URL saved, secret generated |
| T12.4.2 | Webhook fires on invoice.created | POST to endpoint within 5 seconds |
| T12.4.3 | Verify HMAC signature | `X-Slipwise-Signature` header matches |
| T12.4.4 | Endpoint returns 200 | Delivery marked as succeeded |
| T12.4.5 | Endpoint returns 500 | Retry after 1, 5, 15, 30, 60 minutes |
| T12.4.6 | SSRF protection — localhost URL | Blocked: "URL not allowed" |
| T12.4.7 | SSRF protection — 192.168.x.x | Blocked |
| T12.4.8 | SSRF protection — HTTP (not HTTPS) | Blocked |
| T12.4.9 | View delivery history | Attempts, status, response shown |

---

## Module 13 — Enterprise Features

### 13.1 SSO / SAML
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T13.1.1 | Configure SAML IdP settings | Entity ID, SSO URL, certificate saved |
| T13.1.2 | Download SP metadata | XML file with correct SP entity ID |
| T13.1.3 | Initiate SSO login | Redirected to IdP login page |
| T13.1.4 | SAML callback with valid assertion | User logged in, provisioned if new |
| T13.1.5 | SAML callback with invalid assertion | 401, clear error message |
| T13.1.6 | SSO user auto-provisioning | New user created in DB on first SSO login |
| T13.1.7 | SSO settings visible only to Enterprise | Starter plan → SSO settings hidden |

### 13.2 Multi-Org Support
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T13.2.1 | User member of 2+ orgs | Org-switcher visible in nav |
| T13.2.2 | Switch org | Data changes to new org's data |
| T13.2.3 | List orgs API | Returns all orgs user belongs to |
| T13.2.4 | Per-org preferences saved | Settings per org maintained |

### 13.3 Custom Domains
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T13.3.1 | Add custom domain | DNS instructions shown |
| T13.3.2 | Verify DNS | Domain marked as verified after DNS propagation |
| T13.3.3 | Access app via custom domain | App loads on custom domain |
| T13.3.4 | Invalid domain format | Validation error |

### 13.4 White-Label Branding
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T13.4.1 | Set custom primary color | UI updates to custom color |
| T13.4.2 | Upload custom logo | Logo replaces Slipwise branding |
| T13.4.3 | Set custom footer text | Footer shows custom text |
| T13.4.4 | Reset to default | Slipwise branding restored |

---

## Module 14 — AI Features

### 14.1 GST Calculator
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T14.1.1 | HSN code 0101 (live animals) | 0% GST returned |
| T14.1.2 | HSN code 3004 (medicines) | 5% or 12% based on type |
| T14.1.3 | HSN code 8471 (computers) | 18% CGST/SGST (intra-state) |
| T14.1.4 | Inter-state transaction | IGST = full rate (no split) |
| T14.1.5 | Intra-state transaction | CGST + SGST = full rate |
| T14.1.6 | Unknown HSN code | 18% default applied |

### 14.2 Document OCR
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T14.2.1 | Upload clear invoice image | Fields extracted accurately |
| T14.2.2 | Upload blurry/low-quality image | Partial extraction with confidence scores |
| T14.2.3 | Upload non-invoice image | Empty or low-confidence extraction |
| T14.2.4 | Track OCR job status | PENDING → PROCESSING → COMPLETE |
| T14.2.5 | OCR with no OpenAI key | Graceful error: "AI features unavailable" |

### 14.3 GSTR-1 Export
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T14.3.1 | Export GSTR-1 for a month | Valid JSON matching government schema |
| T14.3.2 | B2B invoices in GSTR-1 | Correct entries in B2B section |
| T14.3.3 | Export with zero invoices | Empty JSON structure (not error) |
| T14.3.4 | Download GSTR-1 JSON | File downloaded successfully |

### 14.4 Salary Insights
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T14.4.1 | Insights with 6+ months data | Trend line, anomalies shown |
| T14.4.2 | Department comparison | Avg salaries compared |
| T14.4.3 | Insights with 1 month data | Graceful: "Not enough data for trends" |

### 14.5 Payment Risk
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T14.5.1 | Risk score for new client | Medium risk as default |
| T14.5.2 | Risk score for client with late history | High risk |
| T14.5.3 | Risk score for always-on-time client | Low risk |
| T14.5.4 | Risk without payment history | "Insufficient data" returned |

---

## Module 15 — Integrations

### 15.1 QuickBooks
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T15.1.1 | Click "Connect QuickBooks" | OAuth2 redirect to QuickBooks |
| T15.1.2 | Authorize in QuickBooks sandbox | Callback received, tokens stored |
| T15.1.3 | Sync invoices to QuickBooks | Invoices appear in QB account |
| T15.1.4 | Sync customers | Customers synced bidirectionally |
| T15.1.5 | Disconnect | Tokens removed, sync stops |
| T15.1.6 | Expired token refresh | Auto-refresh using refresh token |

### 15.2 Zoho Books
(Mirror QuickBooks tests T15.1.1–T15.1.6 for Zoho)

### 15.3 Tally Export
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T15.3.1 | Export invoices as Tally XML | Valid XML file downloaded |
| T15.3.2 | Open XML in Tally Prime | Data imports without errors |
| T15.3.3 | Export vouchers | Voucher XML exported correctly |

### 15.4 UPI / QR Codes
| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T15.4.1 | Generate UPI QR for invoice | QR image shown on invoice |
| T15.4.2 | Scan QR with UPI app | Opens payment in UPI app |
| T15.4.3 | QR with correct amount | Pre-fills correct amount in UPI |
| T15.4.4 | UPI VPA not set | Prompt to configure UPI settings |

---

## Module 16 — PWA & Push Notifications

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T16.1.1 | Access app on mobile Chrome | Install prompt shown |
| T16.1.2 | Install PWA | App appears on home screen |
| T16.1.3 | Open installed PWA | Launches in standalone mode |
| T16.1.4 | Offline page | Visit any route offline → /offline page |
| T16.1.5 | Service worker caches assets | Cached pages load offline |
| T16.1.6 | Enable push notifications | Permission prompt shown |
| T16.1.7 | Receive push notification | Notification appears on mobile/desktop |
| T16.1.8 | Notification click | Opens correct page in app |
| T16.1.9 | Unsubscribe push | Subscription removed, no more notifications |

---

## Module 17 — Health & Monitoring

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| T17.1.1 | GET /api/health | Returns `{ status: "ok", db: "ok" }` |
| T17.1.2 | Health with Redis available | `{ redis: "ok" }` |
| T17.1.3 | Health with DB down | `{ status: "degraded", db: "error" }` |
| T17.1.4 | Sentry captures error | Runtime error appears in Sentry dashboard |
| T17.1.5 | PostHog tracks event | Event visible in PostHog dashboard |

---

## Cross-Cutting Edge Cases

### Security Tests
| # | Test Case | Expected |
|---|-----------|----------|
| E1 | XSS attempt in org name | Escaped in all renders |
| E2 | SQL injection in search | Prisma parameterized — no effect |
| E3 | IDOR: access another org's invoice by ID | 403 Forbidden |
| E4 | CSRF on mutation endpoint | CSRF token required |
| E5 | JWT tampering | 401 Unauthorized |
| E6 | API key brute force | Rate limited after 20 attempts |
| E7 | Upload malicious PDF with embedded JS | No execution, stored as-is |

### Performance Tests
| # | Test Case | Expected |
|---|-----------|----------|
| P1 | Load invoice list with 1000 invoices | < 2 second response |
| P2 | Export 50-page PDF | < 10 seconds |
| P3 | Dashboard with 5000 records | < 3 seconds with caching |
| P4 | API: 100 concurrent requests | All handled, none dropped |

### Mobile Responsiveness
| # | Test Case |
|---|-----------|
| M1 | Dashboard renders on 375px (iPhone SE) |
| M2 | Invoice list scrollable on mobile |
| M3 | Form inputs usable on mobile keyboard |
| M4 | Template preview visible on mobile |

---

## Automated Test Infrastructure

### Existing Tests
```bash
# Unit tests (Vitest)
npm run test

# E2E tests (Playwright)
npx playwright test

# TypeScript check
npx tsc --noEmit
```

### Test Files Location
- Unit tests: `src/**/*.test.ts`, `src/**/*.test.tsx`
- E2E tests: `tests/` directory
- Playwright config: `playwright.config.ts`
- Vitest config: `vitest.config.ts`

### Known Test Issues (Pre-existing)
- Vitest test files missing `/// <reference types="vitest/globals" />` — causes `describe/it/expect` type errors
- These do NOT affect test execution — just TypeScript IDE warnings
- Fix: add `"types": ["vitest/globals"]` to `tsconfig.json` if needed

---

## Test Data Setup Scripts

```bash
# Seed test organizations, users, documents
npx prisma db seed

# Or use scripts/ directory
node scripts/seed-test-data.js
```

### Razorpay Test Mode
- Test key format: `rzp_test_*`
- Test card: `4111111111111111` (any expiry, any CVV)
- Test UPI: `success@razorpay`
- Test UPI (failure): `failure@razorpay`
- Webhook test: Use Razorpay Dashboard → Webhooks → Test

---

## Acceptance Criteria Summary

| Module | Pass Criteria |
|--------|--------------|
| Auth | All login/register flows work, no sessions leak |
| Documents | Create, edit, delete, export all work for all 3 types |
| Templates | All 15 templates render without overflow/truncation |
| PDF Studio | All 8 tools produce correct output |
| Billing | Subscription lifecycle complete, plan gates enforced |
| Payment Links | Link created, paid, webhook processed |
| API Platform | All 17 endpoints CRUD with correct auth and rate limits |
| Webhooks | Delivery, retry, HMAC verification all working |
| Enterprise | SSO roundtrip, multi-org switch, white-label apply |
| AI Features | GST calc accurate, OCR extracts data, GSTR-1 valid JSON |
| Integrations | QuickBooks/Zoho OAuth2 connects and syncs |
| PWA | Installable, offline page loads, push notification received |

---

## Bug Reporting Template

When filing a bug, include:
```
**Summary:** One-line description
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3
**Expected:** What should happen
**Actual:** What actually happened
**Environment:** Browser, OS, plan tier
**Screenshot/Video:** (if applicable)
**Severity:** Critical / High / Medium / Low
```

---

*QA Handbook — Slipwise One v1.0 | April 6, 2026 | Testing Team Handover*
