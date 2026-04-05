# Slipwise One — Phase 6 & Phase 7
## Product Requirements Document (PRD)
### Version 1.0 | Engineering Handover Document

---

## Document Overview

| Field | Value |
|---|---|
| **Product** | Slipwise One |
| **Phases Covered** | Phase 6: SW Intel · Phase 7: Roles, Permissions, Proxy & Audit |
| **Status** | Ready for Engineering |
| **Prerequisite Phases** | Phase 0–5 completed |
| **Branch Convention** | `feature/phase-6-intel` · `feature/phase-7-roles-proxy` |
| **Sprint Model** | 2 sprints per phase (2 weeks each) |
| **Total Sprints** | 4 sprints across both phases |

---

## Table of Contents

1. [Product Context & Phase Summary](#1-product-context--phase-summary)
2. [Current State (Post Phase 5)](#2-current-state-post-phase-5)
3. [Phase 6 — SW Intel Dashboard & Reports](#3-phase-6--sw-intel-dashboard--reports)
   - 3.1 Objective
   - 3.2 Sprint 6.1 — Dashboard V1
   - 3.3 Sprint 6.2 — Reports & Filters
   - 3.4 Data Model Extensions
   - 3.5 API & Server Actions
   - 3.6 Acceptance Criteria
4. [Phase 7 — Roles, Permissions, Proxy & Audit Hardening](#4-phase-7--roles-permissions-proxy--audit-hardening)
   - 4.1 Objective
   - 4.2 Sprint 7.1 — Roles & Access Matrix
   - 4.3 Sprint 7.2 — Proxy System & Audit
   - 4.4 Permission Matrix
   - 4.5 Data Model Extensions
   - 4.6 API & Server Actions
   - 4.7 Acceptance Criteria
5. [Shared Technical Standards](#5-shared-technical-standards)
6. [Route Map](#6-route-map)
7. [Component Architecture](#7-component-architecture)
8. [Database Schema Additions](#8-database-schema-additions)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Risk Register](#10-risk-register)
11. [QA & Acceptance Gates](#11-qa--acceptance-gates)

---

## 1. Product Context & Phase Summary

Slipwise One is a modular SaaS document operations suite. The delivery roadmap:

| Phase | Name | Status |
|---|---|---|
| 0 | Stabilization | ✅ Done |
| 1 | SW Auth Foundation | ✅ Done |
| 2 | Docs Persistence | ✅ Done |
| 3 | Docs UX + Templates | ✅ Done |
| 4 | SW Pay Lifecycle | ✅ Done |
| 5 | SW Flow Orchestration | ✅ Done |
| **6** | **SW Intel Dashboard & Reports** | 🔲 This Document |
| **7** | **Roles, Permissions, Proxy, Audit** | 🔲 This Document |
| 8 | PDF Studio Expansion | Upcoming |
| 9 | SW Pixel Launch | Upcoming |
| 10 | Hardening + AWS | Upcoming |

**Why Phase 6 before 7?**
Intel dashboards surface the data already stored from Phases 2–5. They are read-heavy and low-risk. Role enforcement (Phase 7) gates access to those dashboards and all other modules, so it must follow Phase 6 to avoid building gates before the rooms exist.

---

## 2. Current State (Post Phase 5)

### What exists after Phase 0–5

**Data stored in database:**
- Invoices with full state machine events (11 states)
- Vouchers, salary slips with line items
- Payment proofs, tickets, approval requests
- Notifications, activity logs, job logs
- Recurring invoice rules, scheduled sends, send logs
- Organization branding, customers, vendors, employees

**Routes that exist:**
- `/app/docs/*` — Invoice, Voucher, Salary Slip creation + vault
- `/app/pay/*` — Receivables, proofs, recurring, send log
- `/app/flow/*` — Tickets, approvals, notifications, activity, jobs
- `/app/settings/profile`, `/app/settings/organization`, `/app/settings/security`
- `/app/intel` — **Currently "Coming Soon" stub only**

**What does NOT exist yet:**
- SW Intel dashboard with real charts and KPIs
- Role-based access control (all authenticated users have full access)
- Proxy grant system
- Audit log viewer
- `/app/settings/users` — invite/manage users
- `/app/settings/roles` — role definition UI
- `/app/settings/access` — proxy grants UI

---

## 3. Phase 6 — SW Intel Dashboard & Reports

### 3.1 Objective

SW Intel is the reporting and insights layer. It gives admins and operators a single pane of glass to understand business health at a glance, export structured reports, and track operational trends over time — without leaving the platform.

**Core promise:** A manager should open the Intel dashboard and immediately understand: money owed, money paid, team spend, salary run, and any anomalies.

---

### 3.2 Sprint 6.1 — Dashboard V1

**Goal:** Build the primary SW Intel dashboard with live KPI cards, summary blocks, trend chart, and recent activity integration.

#### Screen: `/app/intel/dashboard`

##### Layout
```
┌──────────────────────────────────────────────────────────┐
│  SW> Intel                              [Date Range ▼]   │
├──────────────────────────────────────────────────────────┤
│  [ Invoices This Month ] [ Overdue ] [ Paid ] [ Partial ]│  ← Row 1: Pay KPIs
├──────────────────────────────────────────────────────────┤
│  [ Voucher Spend ] [ Vouchers This Month ] [ Categories ]│  ← Row 2: Voucher KPIs
├──────────────────────────────────────────────────────────┤
│  [ Salary Pending ] [ Salary Released ]                  │  ← Row 3: Salary KPIs
├────────────────────────────┬─────────────────────────────┤
│  Revenue Trend Chart       │  Recent Activity Feed       │
│  (monthly line/bar chart)  │  (last 10 events)           │
└────────────────────────────┴─────────────────────────────┘
```

##### KPI Cards — Pay Section

| Card | Metric | Calculation |
|---|---|---|
| Invoices Issued This Month | Count of invoices issued in selected period | `COUNT(Invoice WHERE status != DRAFT AND issuedAt in range)` |
| Total Due | Sum of unpaid invoice totals | `SUM(total WHERE status IN [ISSUED, DUE, VIEWED, PARTIALLY_PAID])` |
| Overdue Amount | Sum of overdue invoice totals | `SUM(total WHERE status = OVERDUE)` |
| Paid This Month | Sum of paid invoice totals in period | `SUM(total WHERE status = PAID AND paidAt in range)` |
| Partially Paid Outstanding | Sum of balance remaining on partial invoices | `SUM(total - amountPaid WHERE status = PARTIALLY_PAID)` |

##### KPI Cards — Voucher Section

| Card | Metric | Calculation |
|---|---|---|
| Total Voucher Spend | Sum of all payment voucher amounts | `SUM(totalAmount WHERE type = PAYMENT AND date in range)` |
| Voucher Count | Count of vouchers in period | `COUNT(Voucher WHERE date in range)` |
| Spend by Category | Grouped totals by category | `GROUP BY category SUM(totalAmount)` |
| Receipt Vouchers | Sum of receipt vouchers in period | `SUM(totalAmount WHERE type = RECEIPT)` |

##### KPI Cards — Salary Section

| Card | Metric | Calculation |
|---|---|---|
| Salary Total Pending | Sum of unreleased salary slips | `SUM(netPay WHERE status = DRAFT or PENDING)` |
| Salary Released This Month | Sum of released salary slips | `SUM(netPay WHERE status = RELEASED and releaseDate in range)` |
| Headcount | Distinct employees with slips in period | `COUNT(DISTINCT employeeId WHERE date in range)` |

##### Revenue Trend Chart

- **Type:** Combined line + bar chart (Recharts or Tremor)
- **X-axis:** Last 12 months (or selected range in weeks)
- **Series 1 (bar):** Total invoiced per month
- **Series 2 (line):** Total paid per month
- **Series 3 (line):** Overdue balance per month (end of period)
- **Tooltip:** Hover shows exact values
- **Responsive:** Must work on tablet viewport

##### Recent Activity Feed

- Pull from existing `ActivityLog` table
- Show last 10 events with icon, description, entity link, timestamp
- Link each item to the relevant document (invoice, voucher, ticket etc.)
- "View All Activity" → `/app/flow/activity`

##### Date Range Selector

- Options: Last 7 days, Last 30 days, This Month, Last Month, This Quarter, Last Quarter, This Year, Custom Range
- Default: This Month
- Updates all KPI cards and chart on change (client-side filter with server re-fetch)
- Persist preference in localStorage

---

### 3.3 Sprint 6.2 — Reports & Filters

**Goal:** Build structured tabular reports with filtering, sorting, and CSV export for all four document types.

#### Screen Structure

```
/app/intel                → redirect to /app/intel/dashboard
/app/intel/dashboard      → Dashboard (Sprint 6.1)
/app/intel/reports        → Report selector hub
/app/intel/reports/invoices     → Invoice Report
/app/intel/reports/receivables  → Receivables Aging Report
/app/intel/reports/vouchers     → Voucher Report
/app/intel/reports/salary       → Salary Report
/app/intel/insights       → Insights hub (v1 placeholder with future charts)
```

#### Screen: `/app/intel/reports`

Report hub with 4 report cards:
- **Invoice Report** — All invoices with status, amounts, dates
- **Receivables Report** — Aging analysis of unpaid invoices
- **Voucher Report** — Spend analysis by type, category, period
- **Salary Report** — Payroll summary by employee and month

Each card shows: report name, description, last exported date, "Open Report" CTA.

---

#### Report: Invoice Report (`/app/intel/reports/invoices`)

**Purpose:** Full list of all org invoices with filtering and export.

**Columns:**
| Column | Type | Sortable |
|---|---|---|
| Invoice # | Text | Yes |
| Customer | Text | Yes |
| Status | Badge | Yes |
| Issue Date | Date | Yes |
| Due Date | Date | Yes |
| Total Amount | Currency | Yes |
| Amount Paid | Currency | No |
| Balance | Currency | Yes |
| Created By | Text | No |
| Actions | Links | No |

**Filters:**
- Status (multi-select: DRAFT, ISSUED, VIEWED, DUE, PAID, OVERDUE, DISPUTED, CANCELLED, REISSUED, PARTIALLY_PAID)
- Date range (issued date)
- Customer (searchable select from Customer table)
- Created by (user select)
- Amount range (min / max)

**Export:**
- "Export CSV" button → downloads filtered result set as `.csv`
- Filename: `invoices-report-YYYY-MM-DD.csv`
- Columns: same as table plus all line items flattened

**Pagination:** 50 per page, server-side

---

#### Report: Receivables Aging (`/app/intel/reports/receivables`)

**Purpose:** Show outstanding invoices grouped by how long they've been unpaid (aging buckets).

**Aging Buckets:**
| Bucket | Logic |
|---|---|
| Current (0–30 days) | Due date is in the future or within 30 days |
| 31–60 days | Due date was 31–60 days ago |
| 61–90 days | Due date was 61–90 days ago |
| 90+ days | Due date was more than 90 days ago |

**Display:**
- Summary row per bucket: count, total amount
- Expandable table under each bucket listing individual invoices
- Grand total row at bottom

**Filters:**
- Customer
- Assigned user

**Export:**
- CSV with aging bucket column included

---

#### Report: Voucher Report (`/app/intel/reports/vouchers`)

**Columns:**
| Column | Notes |
|---|---|
| Voucher # | — |
| Type | PAYMENT / RECEIPT |
| Date | — |
| Paid To / Received From | — |
| Category | — |
| Total Amount | — |
| Prepared By | — |
| Status | — |

**Filters:**
- Type (Payment / Receipt)
- Date range
- Category (multi-select)
- Prepared by

**Summary Strip (above table):**
- Total Payment Vouchers: count + sum
- Total Receipt Vouchers: count + sum
- Net: sum(receipts) − sum(payments)

**Export:** CSV

---

#### Report: Salary Report (`/app/intel/reports/salary`)

**Columns:**
| Column | Notes |
|---|---|
| Employee Name | — |
| Employee ID | — |
| Department | — |
| Period (Month/Year) | — |
| Gross Salary | — |
| Total Deductions | — |
| Net Pay | — |
| Status | DRAFT / RELEASED |
| Released Date | — |

**Filters:**
- Employee (searchable)
- Month / Year
- Status
- Department

**Summary Strip:**
- Total Gross: sum
- Total Deductions: sum
- Total Net Pay: sum
- Headcount: distinct employees

**Export:** CSV

---

#### Screen: `/app/intel/insights`

**V1 — Placeholder with future structure**

This screen ships in Phase 6 as a scaffold for future analytics. It should render:
- A heading: "Business Insights (Coming Soon)"
- 3 teaser cards describing planned insights:
  1. **Customer Payment Behavior** — "See which customers pay on time vs. who needs chasing"
  2. **Spending Anomaly Detection** — "Automatically flag unusual voucher entries"
  3. **Department Salary Trends** — "Track payroll growth by department over time"
- A note: "Insights will be available once 3+ months of data is collected"

This reserves the route and sets user expectation without building complex analytics prematurely.

---

### 3.4 Data Model Extensions (Phase 6)

No new Prisma models are required for Phase 6 base functionality. All data exists in the current schema.

**However, add one new model for report snapshots (optional optimization):**

```prisma
model ReportSnapshot {
  id         String   @id @default(cuid())
  orgId      String
  reportType String   // "invoices" | "receivables" | "vouchers" | "salary"
  filters    Json     // serialized filter params
  rowCount   Int
  generatedAt DateTime @default(now())
  downloadedAt DateTime?
  createdBy  String
  org        Organization @relation(fields: [orgId], references: [id])

  @@index([orgId, reportType])
}
```

Add to `Organization` model:
```prisma
reportSnapshots ReportSnapshot[]
```

---

### 3.5 API & Server Actions (Phase 6)

All actions in `src/app/app/intel/*/actions.ts`:

```typescript
// Dashboard actions
getDashboardKPIs(orgId: string, range: DateRange): Promise<DashboardKPIs>
getRevenueTrendData(orgId: string, months: number): Promise<TrendPoint[]>
getRecentActivity(orgId: string, limit: number): Promise<ActivityLog[]>

// Report actions
getInvoiceReport(orgId: string, filters: InvoiceReportFilters): Promise<PaginatedResult<InvoiceReportRow>>
getReceivablesAging(orgId: string, filters: ReceivablesFilters): Promise<AgingReport>
getVoucherReport(orgId: string, filters: VoucherReportFilters): Promise<PaginatedResult<VoucherReportRow>>
getSalaryReport(orgId: string, filters: SalaryReportFilters): Promise<PaginatedResult<SalaryReportRow>>
exportReportCSV(orgId: string, reportType: string, filters: object): Promise<string> // returns CSV string
```

**Performance requirement:** All dashboard KPI queries must complete under 500ms for orgs with up to 10,000 documents. Use `Promise.all()` for parallel queries.

---

### 3.6 Acceptance Criteria (Phase 6)

**Sprint 6.1 — Dashboard**
- [ ] All KPI cards render with correct values matching database records
- [ ] Date range selector updates all cards simultaneously
- [ ] Trend chart renders correctly with real data (not mock)
- [ ] Recent activity feed shows last 10 events with correct links
- [ ] Dashboard loads in under 2 seconds on typical data volume
- [ ] Empty state handled gracefully (new org with no data)
- [ ] Mobile/tablet viewport renders without horizontal scroll

**Sprint 6.2 — Reports**
- [ ] All 4 report pages render with correct data
- [ ] All filter combinations work correctly
- [ ] CSV export downloads with correct data matching current filters
- [ ] Pagination works correctly (page 2+ returns correct offset data)
- [ ] Receivables aging buckets calculate correctly based on due dates
- [ ] Report summary strips show correct aggregate totals
- [ ] Insights placeholder page renders correctly
- [ ] `/app/intel` redirects to `/app/intel/dashboard`

---

## 4. Phase 7 — Roles, Permissions, Proxy & Audit Hardening

### 4.1 Objective

Phase 7 transforms Slipwise One from a single-user-per-org system into a proper multi-user workspace with controlled access. It introduces:

1. **Role-based access control (RBAC)** — defined roles with module-level permissions
2. **User invite & management** — invite users, assign roles, deactivate
3. **Proxy system** — delegated acting with strict audit trails
4. **Audit log viewer** — immutable record of all sensitive actions

**Guiding principle:** No silent impersonation. Every proxy action must visibly show who acted, on whose behalf, why, and when.

---

### 4.2 Sprint 7.1 — Roles & Access Matrix

#### 4.2.1 Built-in Roles

The system ships with 7 predefined roles. Custom roles are out of scope for Phase 7.

| Role | Description |
|---|---|
| **Owner** | Full access to everything. Cannot be removed. One per org. |
| **Admin** | Full access except deleting the org or transferring ownership. |
| **Finance Manager** | Full SW> Pay + SW> Docs + SW Intel. No user/role management. |
| **HR Manager** | Full Salary Slip access. View-only invoices/vouchers. No SW> Pay send. |
| **Voucher Operator** | Create/edit vouchers only. No invoices, no salary slips, no intel. |
| **Invoice Operator** | Create/edit invoices only. No vouchers, no salary slips, no intel. |
| **Viewer** | Read-only access to all documents. Cannot create, edit, or send. |

#### 4.2.2 Permission Matrix

Each permission is one of: **Full** (read + write + delete) | **Read** | **None**

| Module / Action | Owner | Admin | Finance Mgr | HR Mgr | Voucher Op | Invoice Op | Viewer |
|---|---|---|---|---|---|---|---|
| **Invoices — Create/Edit** | Full | Full | Full | Read | None | Full | Read |
| **Invoices — Send/Share** | Full | Full | Full | None | None | Full | None |
| **Invoices — Delete/Cancel** | Full | Full | Full | None | None | None | None |
| **Vouchers — Create/Edit** | Full | Full | Full | None | Full | None | Read |
| **Vouchers — Delete** | Full | Full | Full | None | None | None | None |
| **Salary Slips — Create/Edit** | Full | Full | Read | Full | None | None | Read |
| **Salary Slips — Release** | Full | Full | None | Full | None | None | None |
| **SW> Pay — Proofs Review** | Full | Full | Full | None | None | None | None |
| **SW> Pay — Recurring Rules** | Full | Full | Full | None | None | None | None |
| **SW> Flow — Tickets** | Full | Full | Full | Full | Read | Read | Read |
| **SW> Flow — Approvals** | Full | Full | Full | Full | None | None | None |
| **SW Intel — Dashboard** | Full | Full | Full | Read | None | None | None |
| **SW Intel — Reports** | Full | Full | Full | Read | None | None | None |
| **SW Intel — Export** | Full | Full | Full | None | None | None | None |
| **Settings — Users/Roles** | Full | Full | None | None | None | None | None |
| **Settings — Organization** | Full | Full | None | None | None | None | None |
| **Settings — Proxy Grants** | Full | Full | None | None | None | None | None |
| **Settings — Audit Log** | Full | Full | None | None | None | None | None |

#### 4.2.3 User Invite System

**Screen: `/app/settings/users`**

```
┌──────────────────────────────────────────────────────────┐
│  Team Members                        [Invite Member +]   │
├──────────────────────────────────────────────────────────┤
│  Name        | Email          | Role      | Status       │
│  John Doe    | john@co.com    | Admin     | Active        │
│  Jane Smith  | jane@co.com    | HR Manager| Active        │
│  Bob Lee     | bob@co.com     | Viewer    | Invited       │
└──────────────────────────────────────────────────────────┘
```

**Invite Flow:**
1. Admin clicks "Invite Member"
2. Modal opens: Email field + Role selector (dropdown of 7 roles)
3. System sends invitation email via Resend with magic link
4. User clicks link → lands on `/auth/accept-invite?token=XXX`
5. If no account: shows name + password fields
6. If existing account: confirms joining the org
7. On accept: `Membership` record created, `Invitation` marked accepted

**Member Management Actions:**
- Change role (dropdown, immediate)
- Deactivate (sets `Membership.status = INACTIVE`, blocks login to this org)
- Re-invite (resend invitation email if pending)
- Remove (soft delete — sets `Membership.status = REMOVED`)

**Business Rules:**
- Owner cannot be deactivated or role-changed
- Minimum 1 Admin must remain active at all times
- Invitations expire after 72 hours
- Re-invite resets expiry

**Screen: `/app/settings/roles`**

Read-only view of the 7 built-in roles and their permissions matrix.

```
┌──────────────────────────────────────────────────────────┐
│  Roles & Permissions                                     │
├──────────────────────────────────────────────────────────┤
│  [Owner] [Admin] [Finance Mgr] [HR Mgr] ... (tabs)      │
├──────────────────────────────────────────────────────────┤
│  Module         | Create | Read | Send | Delete          │
│  Invoices       |   ✓    |  ✓   |  ✓   |   ✓            │
│  Vouchers       |   ✓    |  ✓   |  ✓   |   ✓            │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

Note: Phase 7 ships read-only role views. Custom role creation is out of scope.

#### 4.2.4 Access Enforcement Implementation

**UI Gating:**
- Use a `usePermission(module, action)` client hook that reads from session context
- Conditionally render action buttons based on permissions
- Hide nav sections the user has no access to (`suite-nav-items.ts` must be permission-aware)

**Server Action Gating:**
- Every server action must call `requirePermission(orgId, userId, module, action)` 
- This helper checks `Membership.role` → looks up permission matrix → throws/redirects if denied
- Centralized in `src/lib/permissions.ts`

**API Route Gating:**
- CRON routes: validate `CRON_SECRET` (existing)
- All other API routes: use `requirePermission()` same as server actions

```typescript
// src/lib/permissions.ts

export const ROLE_PERMISSIONS: RolePermissionMatrix = {
  OWNER: { invoices: { create: true, read: true, send: true, delete: true }, ... },
  ADMIN: { ... },
  FINANCE_MANAGER: { ... },
  // ...
}

export async function requirePermission(
  orgId: string,
  userId: string,
  module: Module,
  action: Action
): Promise<void>  // throws PermissionError if denied
```

---

### 4.3 Sprint 7.2 — Proxy System & Audit

#### 4.3.1 Proxy Grant System

**What is a proxy?**
A proxy grant allows User A (the actor) to perform actions on behalf of User B (the represented user) for a defined scope and time period. Every action taken under a proxy is logged with both identities.

**Real-world use case:** A founder going on holiday grants their Finance Manager proxy access to approve invoices and review proofs on their behalf for 2 weeks.

**Screen: `/app/settings/access`**

```
┌──────────────────────────────────────────────────────────┐
│  Proxy Grants                         [Grant Proxy +]    │
├──────────────────────────────────────────────────────────┤
│  Actor (Acting As)   | Representing  | Scope  | Expires  │
│  Jane Smith          | John Doe      | Pay    | Apr 20   │
└──────────────────────────────────────────────────────────┘
```

**Grant Proxy Modal:**
- **Actor (who acts):** User selector (org members)
- **Representing (on behalf of):** User selector
- **Scope:** Multi-select of modules: `Invoices`, `Vouchers`, `Salary`, `Pay`, `Flow`, `All`
- **Reason:** Required text field (min 10 chars)
- **Expires At:** Date + time picker (required, max 90 days from now)

**Proxy States:**
- `ACTIVE` — within validity window
- `EXPIRED` — past `expiresAt`
- `REVOKED` — manually revoked before expiry

**Proxy Activation:**
- When actor is logged in and a proxy is ACTIVE, a banner appears in the topbar:
  ```
  ⚠ You are acting as proxy for [Name]. All actions will be logged accordingly.
  ```
- Actor can click to see proxy details and scope

**Proxy Scope Enforcement:**
- `requirePermission()` checks for active proxy grants when resolving permissions
- Actor gets the represented user's permissions scoped to the proxy's module list
- If actor's own role has HIGHER access than represented, use represented's access level (proxy doesn't escalate)

**Proxy Revocation:**
- Admin/Owner can revoke at any time from `/app/settings/access`
- Actor can voluntarily end their own proxy session

#### 4.3.2 Audit Log System

**Purpose:** Immutable, human-readable record of all sensitive actions in the workspace.

**What gets audited (AuditLog entries):**

| Category | Events |
|---|---|
| **Identity** | Login, logout, password change, role change, user invite sent, user deactivated |
| **Document Actions** | Invoice issued, invoice cancelled, invoice reissued, proof accepted/rejected, salary released |
| **Access Control** | Proxy granted, proxy revoked, proxy used (per action), permission change |
| **Data Mutations** | Organization settings changed, branding updated, template assigned |
| **System** | CRON job executed, scheduled send fired, recurring invoice generated |

**AuditLog model:**
```prisma
model AuditLog {
  id              String   @id @default(cuid())
  orgId           String
  actorId         String           // who performed the action
  representedId   String?          // who was represented (proxy actions only)
  proxyGrantId    String?          // which proxy grant was active
  action          String           // e.g. "invoice.issued", "proxy.granted"
  entityType      String?          // e.g. "Invoice", "Member"
  entityId        String?          // the document/user ID affected
  metadata        Json?            // extra context (old value, new value, reason)
  ipAddress       String?
  userAgent       String?
  createdAt       DateTime @default(now())

  org             Organization @relation(fields: [orgId], references: [id])
  actor           Profile @relation("AuditActor", fields: [actorId], references: [id])
  represented     Profile? @relation("AuditRepresented", fields: [representedId], references: [id])

  @@index([orgId, createdAt])
  @@index([actorId])
  @@index([entityType, entityId])
}
```

**Screen: `/app/settings/audit`**

```
┌──────────────────────────────────────────────────────────┐
│  Audit Log                                               │
│  [Date Range ▼] [User ▼] [Category ▼] [Search]          │
├──────────────────────────────────────────────────────────┤
│  Apr 5 14:32 | Jane Smith (as John Doe) | invoice.issued │
│              | Invoice #INV-0042 · via Proxy             │
├──────────────────────────────────────────────────────────┤
│  Apr 5 10:11 | John Doe               | proxy.granted    │
│              | Granted Jane Smith access to Pay module   │
└──────────────────────────────────────────────────────────┘
```

**Columns:**
- Timestamp (local time)
- Actor name + "(as Represented Name)" if proxy
- Action label (human-readable)
- Entity link (if applicable)
- Proxy indicator badge
- IP address (collapsed, expand on hover)

**Filters:**
- Date range
- User (actor)
- Category (Identity, Documents, Access, System)
- Proxy actions only (toggle)

**Export:** CSV for compliance purposes

**Access:** Owner + Admin only. No export for Viewer or below.

---

### 4.4 Permission Matrix (Full Technical Reference)

```typescript
// src/lib/permissions.ts

export type Role = 
  | 'OWNER' 
  | 'ADMIN' 
  | 'FINANCE_MANAGER' 
  | 'HR_MANAGER' 
  | 'VOUCHER_OPERATOR' 
  | 'INVOICE_OPERATOR' 
  | 'VIEWER';

export type Module = 
  | 'invoices' 
  | 'vouchers' 
  | 'salary_slips' 
  | 'pay_proofs' 
  | 'pay_recurring' 
  | 'pay_sendlog'
  | 'flow_tickets' 
  | 'flow_approvals' 
  | 'flow_notifications'
  | 'intel_dashboard' 
  | 'intel_reports' 
  | 'settings_users' 
  | 'settings_roles' 
  | 'settings_proxy' 
  | 'settings_audit';

export type Action = 'read' | 'create' | 'edit' | 'delete' | 'send' | 'approve' | 'export';
```

---

### 4.5 Data Model Extensions (Phase 7)

**New Prisma models:**

```prisma
// Proxy grants
enum ProxyStatus {
  ACTIVE
  EXPIRED
  REVOKED
}

model ProxyGrant {
  id              String      @id @default(cuid())
  orgId           String
  actorId         String      // the member who acts
  representedId   String      // the member being represented
  scope           String[]    // array of module names
  reason          String
  grantedBy       String      // admin who created the grant
  expiresAt       DateTime
  status          ProxyStatus @default(ACTIVE)
  revokedAt       DateTime?
  revokedBy       String?
  createdAt       DateTime    @default(now())

  org             Organization @relation(fields: [orgId], references: [id])
  actor           Profile @relation("ProxyActor", fields: [actorId], references: [id])
  represented     Profile @relation("ProxyRepresented", fields: [representedId], references: [id])
  auditLogs       AuditLog[]

  @@index([orgId, status])
  @@index([actorId, status])
}

// Audit log (full definition above in 4.3.2)
model AuditLog {
  // (see 4.3.2)
}
```

**Extend `Member` model:**
```prisma
// Add to existing Member model
role   MemberRole @default(VIEWER)

enum MemberRole {
  OWNER
  ADMIN
  FINANCE_MANAGER
  HR_MANAGER
  VOUCHER_OPERATOR
  INVOICE_OPERATOR
  VIEWER
}
```

**Note:** The existing `Member` model likely has a `role` field as a String. This phase formalizes it with an enum and enforces it throughout the system.

---

### 4.6 API & Server Actions (Phase 7)

```typescript
// src/app/app/settings/users/actions.ts
inviteUser(orgId: string, email: string, role: MemberRole): Promise<ActionResult>
updateMemberRole(orgId: string, memberId: string, role: MemberRole): Promise<ActionResult>
deactivateMember(orgId: string, memberId: string): Promise<ActionResult>
reactivateMember(orgId: string, memberId: string): Promise<ActionResult>
removeMember(orgId: string, memberId: string): Promise<ActionResult>
resendInvitation(orgId: string, invitationId: string): Promise<ActionResult>
getOrgMembers(orgId: string): Promise<MemberWithProfile[]>
getPendingInvitations(orgId: string): Promise<Invitation[]>

// src/app/app/settings/access/actions.ts
createProxyGrant(orgId: string, data: CreateProxyInput): Promise<ActionResult>
revokeProxyGrant(orgId: string, proxyGrantId: string): Promise<ActionResult>
getActiveProxyGrants(orgId: string): Promise<ProxyGrant[]>
getMyActiveProxy(userId: string, orgId: string): Promise<ProxyGrant | null>

// src/app/app/settings/audit/actions.ts
getAuditLogs(orgId: string, filters: AuditFilters): Promise<PaginatedResult<AuditLog>>
exportAuditLogsCSV(orgId: string, filters: AuditFilters): Promise<string>

// src/lib/audit.ts (utility)
logAudit(params: AuditParams): Promise<void>

// src/lib/permissions.ts (utility)
requirePermission(orgId: string, userId: string, module: Module, action: Action): Promise<void>
getUserEffectivePermissions(userId: string, orgId: string): Promise<PermissionSet>
resolveProxyContext(userId: string, orgId: string): Promise<ProxyContext | null>
```

---

### 4.7 Acceptance Criteria (Phase 7)

**Sprint 7.1 — Roles & Access**
- [ ] All 7 roles exist in the database enum
- [ ] `/app/settings/users` renders current members with roles
- [ ] Invite flow: email sent, link works, user joins org with correct role
- [ ] Role change is immediate and reflected on next page load
- [ ] Deactivated members cannot access the org workspace
- [ ] Permission matrix is enforced in ALL server actions (not just UI)
- [ ] Navigation items hidden for modules the user has no access to
- [ ] Action buttons (Edit, Send, Delete) hidden/disabled based on permissions
- [ ] Owner cannot be deactivated or have role changed
- [ ] Invitation expiry (72h) correctly enforced

**Sprint 7.2 — Proxy & Audit**
- [ ] Proxy can be created with actor, represented, scope, reason, and expiry
- [ ] Proxy banner visible in topbar when actor has an active proxy
- [ ] All actions taken under proxy are logged with both actor + represented IDs
- [ ] Proxy scope is enforced (actor cannot exceed represented's permissions)
- [ ] Proxy expiry automatically deactivates grant (CRON or lazy check)
- [ ] Admin can revoke proxy at any time
- [ ] Audit log records all listed event categories
- [ ] Audit viewer shows proxy actions with "(as Name)" notation
- [ ] Audit filter by date, user, category, and proxy-only all work correctly
- [ ] Audit CSV export works
- [ ] Audit log is read-only (no delete, no edit)
- [ ] IP address captured for all audit events

---

## 5. Shared Technical Standards

### 5.1 Code Architecture

Following the existing patterns in this codebase:

**Server Actions Pattern:**
```typescript
"use server";
import { requireOrgContext } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function someAction(params): Promise<ActionResult<T>> {
  try {
    const { userId, orgId } = await requireOrgContext();
    await requirePermission(orgId, userId, "module", "action");
    // ... do work
    revalidatePath("/app/...");
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
```

**Prisma Import:**
```typescript
import { PrismaClient } from "@/generated/prisma/client";
// OR use the shared instance:
import { db } from "@/lib/db";
```

**Auth Pattern:**
```typescript
import { requireOrgContext } from "@/lib/auth";
// Returns { userId, orgId, role } — redirects if not authenticated
```

### 5.2 Charting Library

For Phase 6 charts, use one of:
- **Recharts** (already common in Next.js ecosystem) — preferred
- **Tremor** (if not already installed, requires `npm install @tremor/react`)
- Do NOT use Chart.js or D3 unless team has existing context with it

All charts must be client components wrapped in `"use client"` with a loading skeleton state.

### 5.3 CSV Export Implementation

```typescript
// Utility: src/lib/csv.ts
export function generateCSV(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return [
    headers.map(escape).join(","),
    ...rows.map(r => r.map(escape).join(","))
  ].join("\n");
}
```

Return as a server action → client triggers download via blob URL.

### 5.4 Email Templates

Follow the existing pattern in `src/lib/email-templates/`. New templates needed:
- `invite-email.ts` — org invitation with magic link
- `proxy-granted-email.ts` — notify actor when proxy is assigned

### 5.5 Date Handling

- All dates stored in UTC in the database
- Display in local timezone via `Intl.DateTimeFormat`
- Use `date-fns` for calculations (already in project dependencies)

---

## 6. Route Map

### Phase 6 — New Routes

| Route | Component | Auth | Description |
|---|---|---|---|
| `/app/intel` | redirect | Required | Redirects to `/app/intel/dashboard` |
| `/app/intel/dashboard` | Page (Server) | Required | Main KPI dashboard |
| `/app/intel/reports` | Page (Server) | Required | Report selector hub |
| `/app/intel/reports/invoices` | Page (Server + Client) | Required | Invoice report table |
| `/app/intel/reports/receivables` | Page (Server + Client) | Required | Aging receivables report |
| `/app/intel/reports/vouchers` | Page (Server + Client) | Required | Voucher spend report |
| `/app/intel/reports/salary` | Page (Server + Client) | Required | Salary payroll report |
| `/app/intel/insights` | Page (Server) | Required | Insights placeholder |

### Phase 7 — New Routes

| Route | Component | Auth | Description |
|---|---|---|---|
| `/app/settings/users` | Page (Server + Client) | Owner/Admin | Team members list + invite |
| `/app/settings/roles` | Page (Server) | Owner/Admin | Roles & permissions matrix |
| `/app/settings/access` | Page (Server + Client) | Owner/Admin | Proxy grants management |
| `/app/settings/audit` | Page (Server + Client) | Owner/Admin | Audit log viewer |
| `/auth/accept-invite` | Page (Server + Client) | None | Accept org invitation |

### Phase 7 — Modified Routes

| Route | Change |
|---|---|
| `/app/settings/profile` | Add password change section |
| `/app/settings/security` | Add active sessions + 2FA placeholder |
| `/app/settings/organization` | Already exists — add module preferences section |
| All `/app/*` routes | Add `requirePermission()` to all server actions |

---

## 7. Component Architecture

### Phase 6 — New Components

```
src/features/intel/
  components/
    kpi-card.tsx              ← Reusable KPI stat card with delta indicator
    revenue-trend-chart.tsx   ← Recharts line+bar combo chart
    activity-mini-feed.tsx    ← 10-item recent activity widget
    date-range-selector.tsx   ← Period picker dropdown
    report-filter-bar.tsx     ← Shared filter row for all reports
    report-data-table.tsx     ← Shared sortable/paginated table
    aging-buckets.tsx         ← Receivables aging accordion

src/app/app/intel/
  layout.tsx                  ← Intel sidebar nav
  dashboard/page.tsx
  dashboard/actions.ts
  reports/page.tsx
  reports/invoices/page.tsx
  reports/invoices/actions.ts
  reports/receivables/page.tsx
  reports/receivables/actions.ts
  reports/vouchers/page.tsx
  reports/vouchers/actions.ts
  reports/salary/page.tsx
  reports/salary/actions.ts
  insights/page.tsx
```

### Phase 7 — New Components

```
src/features/access/
  components/
    invite-member-modal.tsx   ← Invite flow modal
    member-role-select.tsx    ← Role dropdown for member row
    proxy-grant-modal.tsx     ← Create proxy form
    proxy-banner.tsx          ← Topbar proxy warning banner
    permission-matrix-table.tsx ← Roles view table
    audit-entry-row.tsx       ← Single audit log row component

src/lib/
  permissions.ts              ← Permission matrix + requirePermission()
  audit.ts                    ← logAudit() utility

src/app/app/settings/
  users/page.tsx
  users/actions.ts
  roles/page.tsx
  access/page.tsx
  access/actions.ts
  audit/page.tsx
  audit/actions.ts

src/app/auth/
  accept-invite/page.tsx
  accept-invite/actions.ts
```

---

## 8. Database Schema Additions

### Phase 6

```prisma
// Add to schema.prisma

model ReportSnapshot {
  id           String       @id @default(cuid())
  orgId        String
  reportType   String
  filters      Json
  rowCount     Int
  generatedAt  DateTime     @default(now())
  downloadedAt DateTime?
  createdBy    String

  org          Organization @relation(fields: [orgId], references: [id])

  @@index([orgId, reportType])
}
```

Add `reportSnapshots ReportSnapshot[]` to `Organization` model.

### Phase 7

```prisma
// Extend Member model
enum MemberRole {
  OWNER
  ADMIN
  FINANCE_MANAGER
  HR_MANAGER
  VOUCHER_OPERATOR
  INVOICE_OPERATOR
  VIEWER
}

// Modify existing Member.role from String to MemberRole enum

// New models
enum ProxyStatus {
  ACTIVE
  EXPIRED
  REVOKED
}

model ProxyGrant {
  id            String      @id @default(cuid())
  orgId         String
  actorId       String
  representedId String
  scope         String[]
  reason        String
  grantedBy     String
  expiresAt     DateTime
  status        ProxyStatus @default(ACTIVE)
  revokedAt     DateTime?
  revokedBy     String?
  createdAt     DateTime    @default(now())

  org           Organization @relation(fields: [orgId], references: [id])

  @@index([orgId, status])
  @@index([actorId, status])
}

model AuditLog {
  id            String   @id @default(cuid())
  orgId         String
  actorId       String
  representedId String?
  proxyGrantId  String?
  action        String
  entityType    String?
  entityId      String?
  metadata      Json?
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())

  org           Organization @relation(fields: [orgId], references: [id])

  @@index([orgId, createdAt])
  @@index([actorId])
  @@index([entityType, entityId])
}
```

Add to `Organization`:
```prisma
proxyGrants   ProxyGrant[]
auditLogs     AuditLog[]
reportSnapshots ReportSnapshot[]
```

---

## 9. Non-Functional Requirements

### Performance

| Requirement | Target |
|---|---|
| Dashboard KPI queries | < 500ms for orgs with ≤ 10,000 documents |
| Report table (page 1) | < 1 second |
| CSV export (up to 5,000 rows) | < 5 seconds |
| Permission check overhead | < 10ms (cached for request lifetime) |
| Audit log write | Non-blocking (fire-and-forget after action) |

### Security

- All audit logs are append-only — no update/delete endpoints
- Proxy scope must never exceed represented user's own permissions
- Invitation tokens must be single-use and time-limited (72h)
- Proxy grants must have explicit expiry (max 90 days)
- AuditLog IP address and userAgent must be captured from request headers
- All settings routes (users, roles, access, audit) require Owner or Admin role

### Reliability

- Permission cache (if implemented) must be invalidated on role change
- Proxy expiry check is lazy (check at request time) — no CRON required
- Report exports should stream for large datasets rather than buffering entirely in memory

### Observability

- Every `logAudit()` call is fire-and-forget with silent catch (never block user action)
- Job execution logged via existing `JobLog` model
- Failed invitations logged as audit events

---

## 10. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Permission matrix is incomplete — some actions bypass checks | High | High | Create a central `requirePermission()` utility used everywhere. Add integration tests for permission enforcement. |
| Proxy scope allows privilege escalation | Medium | High | Enforce: actor permissions = MIN(actor role, represented role, proxy scope). Add audit test cases. |
| Dashboard queries are slow on large orgs | Medium | Medium | Use `Promise.all()` for parallel queries, add DB indexes on status + orgId, consider materialized view for reports later. |
| Invite email delivery fails silently | Medium | Low | Log failed sends to AuditLog, show "Email may have failed" warning in UI, allow manual resend. |
| Role change not immediately reflected | Low | Medium | Invalidate any permission cache on role update. Use server-side session re-check. |
| Audit log grows very large | Low | Low | Add `createdAt` index. Plan retention policy (archive after 2 years) for Phase 10. |
| Custom roles requested by users | Medium | Low | Explicitly document: custom roles are Phase 8+ out of scope. Ship read-only role viewer. |

---

## 11. QA & Acceptance Gates

### Phase 6 QA Gate Checklist

**Dashboard:**
- [ ] KPI values verified against raw DB counts
- [ ] Date range filter tested with all 8 presets
- [ ] Custom date range tested (same day, cross-month, cross-year)
- [ ] Empty org (no documents) shows zero states, no crashes
- [ ] Chart renders with 1 month of data, 12 months of data, 0 months of data
- [ ] Recent activity links navigate correctly

**Reports:**
- [ ] All filter combinations tested on Invoice report
- [ ] Pagination: page 1, page 2, last page, empty result all work
- [ ] CSV export: headers correct, values correct, special characters escaped
- [ ] Receivables aging: overdue 5 days / 35 days / 65 days / 95 days placed in correct bucket
- [ ] Summary totals match sum of visible rows
- [ ] Export disabled or hidden for non-Finance roles (Phase 7 enforcement)

### Phase 7 QA Gate Checklist

**Roles & Invites:**
- [ ] Invite sent, received, and accepted end-to-end
- [ ] Invite expiry: link rejected after 72h
- [ ] Deactivated member: blocked from login to org
- [ ] Owner cannot be deactivated (UI prevents + server rejects)
- [ ] Each of 7 roles: verify correct pages accessible, correct pages blocked
- [ ] Nav items hidden for modules with no read access

**Permission Enforcement:**
- [ ] Voucher Operator: cannot access invoice actions (UI hidden + server rejects)
- [ ] Viewer: create/edit buttons hidden, server action rejects attempt
- [ ] Finance Manager: can access Intel dashboard, cannot manage users
- [ ] HR Manager: can release salary slips, cannot send invoices

**Proxy:**
- [ ] Create proxy: all fields required, expiry max 90 days enforced
- [ ] Proxy banner appears in topbar for actor
- [ ] Action taken under proxy shows in audit log with both names
- [ ] Proxy scope: actor with Finance scope cannot perform HR actions even if represented has HR access
- [ ] Proxy expiry: expired grant rejected at request time
- [ ] Revoke: immediately prevents further proxy actions

**Audit:**
- [ ] Login event logged with correct IP
- [ ] Invoice issued event logged
- [ ] Proxy grant event logged
- [ ] Proxy action event logged with representedId
- [ ] Filter by proxy-only shows only proxy events
- [ ] Audit CSV export: all columns present, proxy column populated correctly
- [ ] Non-admin cannot access `/app/settings/audit`

---

## Appendix A — Environment Variables Required

New variables needed for Phase 7:

```bash
# Invitation system
INVITE_TOKEN_SECRET=           # Secret for signing invitation tokens
INVITE_EXPIRY_HOURS=72         # Default: 72

# Proxy
PROXY_MAX_DAYS=90              # Max days for proxy grant duration
```

---

## Appendix B — Nav Updates Required

### Phase 6

Add to `suite-nav-items.ts` under SW Intel section (currently only has placeholder):

```typescript
{
  href: "/app/intel/dashboard",
  label: "Dashboard",
  suite: "intel",
},
{
  href: "/app/intel/reports",
  label: "Reports",
  suite: "intel",
},
{
  href: "/app/intel/insights",
  label: "Insights",
  suite: "intel",
  badge: "Beta",
},
```

### Phase 7

Add to Settings section:

```typescript
{
  href: "/app/settings/users",
  label: "Team Members",
  suite: "settings",
  requiredRole: ["OWNER", "ADMIN"],
},
{
  href: "/app/settings/roles",
  label: "Roles & Permissions",
  suite: "settings",
  requiredRole: ["OWNER", "ADMIN"],
},
{
  href: "/app/settings/access",
  label: "Proxy Access",
  suite: "settings",
  requiredRole: ["OWNER", "ADMIN"],
},
{
  href: "/app/settings/audit",
  label: "Audit Log",
  suite: "settings",
  requiredRole: ["OWNER", "ADMIN"],
},
```

---

## Appendix C — Existing Infrastructure to Leverage

The following are already built and should be reused without modification:

| Utility | File | Used In |
|---|---|---|
| `requireOrgContext()` | `src/lib/auth.ts` | All new server actions |
| `db` (Prisma client) | `src/lib/db.ts` | All new server actions |
| `sendEmail()` | `src/lib/email.ts` | Invite + proxy emails |
| `logActivity()` | `src/lib/activity.ts` | All document mutations |
| `createNotification()` | `src/lib/notifications.ts` | Invite, proxy, audit events |
| `ActionResult<T>` type | Existing pattern | All server actions |
| `NotificationBell` | `src/features/flow/components/notification-bell.tsx` | No changes needed |

---

*This document was prepared as a full engineering handover for Slipwise One Phase 6 and Phase 7. All feature definitions, acceptance criteria, and technical specifications are production-ready and immediately actionable by the engineering team.*
