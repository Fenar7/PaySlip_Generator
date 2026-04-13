const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// 1. Add Enums
const enumsToAdd = `
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
`;

if (!schema.includes('enum ApprovalPolicyStatus')) {
  schema = schema.replace('// ─── Phase 5: SW Flow — Ticketing ─────────────────────────────────────────────', enumsToAdd + '\n// ─── Phase 5: SW Flow — Ticketing ─────────────────────────────────────────────');
}

// 2. Add Models
const modelsToAdd = `
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
`;

if (!schema.includes('model ApprovalPolicy {')) {
  schema = schema.replace('// ─── Phase 5: SW Flow — Ticketing ─────────────────────────────────────────────', modelsToAdd + '\n// ─── Phase 5: SW Flow — Ticketing ─────────────────────────────────────────────');
}

// 3. Update InvoiceTicket
const invoiceTicketRegex = /(model InvoiceTicket \{[\s\S]*?)(createdAt\s+DateTime\s+@default\(now\(\)\))/;
if (!schema.includes('priority            TicketPriority')) {
  schema = schema.replace(invoiceTicketRegex, `$1priority            TicketPriority @default(NORMAL)\n  severity            TicketSeverity @default(INFORMATIONAL)\n  dueAt               DateTime?\n  firstResponseDueAt  DateTime?\n  resolutionDueAt     DateTime?\n  firstRespondedAt    DateTime?\n  breachedAt          DateTime?\n  breachType          String?\n  escalationLevel     Int @default(0)\n  sourceModule        String?\n  $2`);
}

// 4. Update ApprovalRequest
const approvalRequestRegex = /(model ApprovalRequest \{[\s\S]*?)(createdAt\s+DateTime\s+@default\(now\(\)\))/;
if (!schema.includes('policyId           String?')) {
  schema = schema.replace(approvalRequestRegex, `$1policyId           String?\n  policyRuleId       String?\n  dueAt              DateTime?\n  escalatedAt        DateTime?\n  escalationLevel    Int      @default(0)\n  lastReminderAt     DateTime?\n  $2`);
}

// 5. Update Notification
const notificationRegex = /(model Notification \{[\s\S]*?)(createdAt\s+DateTime\s+@default\(now\(\)\))/;
if (!schema.includes('category      String?')) {
  schema = schema.replace(notificationRegex, `$1category      String?\n  severity      String?\n  sourceModule  String?\n  sourceRef     String?\n  $2`);
}

// 6. Update JobLog
const jobLogRegex = /(model JobLog \{[\s\S]*?)(@@index)/;
if (!schema.includes('workflowRunId     String?')) {
  schema = schema.replace(jobLogRegex, `$1workflowRunId     String?\n  scheduledActionId String?\n  terminalState     String?\n\n  $2`);
}

fs.writeFileSync('prisma/schema.prisma', schema);
console.log('Schema patched successfully.');
