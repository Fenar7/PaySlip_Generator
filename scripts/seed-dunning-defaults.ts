/**
 * Seed script: Create default dunning sequences for all organizations
 *
 * Run with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-dunning-defaults.ts
 *        or: node --import=tsx scripts/seed-dunning-defaults.ts
 *        or: npx tsx scripts/seed-dunning-defaults.ts  (if tsx is installed)
 *
 * This creates a 5-step default dunning sequence per org:
 * Step 1: Day 0 (due date) — Friendly email reminder
 * Step 2: Day 3 — Polite email + optional SMS
 * Step 3: Day 7 — Firm email + SMS
 * Step 4: Day 14 — Urgent final notice email
 * Step 5: Day 30 — Escalation email + create ticket
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// ── Default email templates (inlined to avoid "server-only" import) ──────────

const DEFAULT_DUNNING_TEMPLATES = {
  step1: {
    subject:
      "Your invoice {{invoice_number}} from {{org_name}} is due today",
    body: `Hi {{customer_name}},

A friendly reminder that invoice {{invoice_number}} for {{invoice_amount}} is due today.

Pay now to avoid late reminders:
<a href="{{pay_now_link}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Pay Now — {{invoice_amount}}</a>

Thank you,
{{org_name}}
{{org_email}} · {{org_phone}}`,
  },
  step2: {
    subject: "Invoice {{invoice_number}} from {{org_name}} is now overdue",
    body: `Hi {{customer_name}},

Your invoice {{invoice_number}} for {{invoice_amount}} was due on {{due_date}} and is now {{days_overdue}} days overdue.

Outstanding balance: {{amount_due}}

<a href="{{pay_now_link}}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Pay Now</a>

If you have any questions, reply to this email or contact us at {{org_email}}.

{{org_name}}`,
  },
  step3: {
    subject:
      "Action needed: Invoice {{invoice_number}} — {{days_overdue}} days overdue",
    body: `Hi {{customer_name}},

This is a firm reminder that invoice {{invoice_number}} remains unpaid. The outstanding balance is {{amount_due}}, now {{days_overdue}} days past due.

Please make payment immediately to avoid further escalation:
<a href="{{pay_now_link}}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Pay {{amount_due}} Now</a>

{{org_name}} | {{org_email}}`,
  },
  step4: {
    subject:
      "FINAL NOTICE: Invoice {{invoice_number}} — Immediate payment required",
    body: `Hi {{customer_name}},

This is a final notice. Invoice {{invoice_number}} ({{amount_due}} outstanding) is {{days_overdue}} days overdue.

Failure to pay may result in service suspension and/or escalation.

<a href="{{pay_now_link}}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Pay Now — {{amount_due}}</a>

{{org_name}} | {{org_email}} | {{org_phone}}`,
  },
  step5: {
    subject:
      "Urgent escalation: Invoice {{invoice_number}} — 30 days overdue",
    body: `Hi {{customer_name}},

Your invoice {{invoice_number}} for {{amount_due}} has been outstanding for {{days_overdue}} days and has been escalated to our accounts team.

A support ticket has been created. Our team will contact you shortly.

<a href="{{pay_now_link}}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Pay Now — {{amount_due}}</a>

{{org_name}} | {{org_email}} | {{org_phone}}`,
  },
} as const;

const DEFAULT_SMS_TEMPLATES = {
  step2:
    "Invoice {{invoice_number}} ({{amount_due}}) from {{org_name}} is overdue. Pay: {{pay_now_link}}",
  step3:
    "Urgent: Invoice {{invoice_number}} ({{amount_due}}) is {{days_overdue}} days past due. Pay now: {{pay_now_link}}",
} as const;

// ── Step definitions ─────────────────────────────────────────────────────────

interface StepDef {
  stepNumber: number;
  daysOffset: number;
  channels: string[];
  tone: "FRIENDLY" | "POLITE" | "FIRM" | "URGENT" | "ESCALATE";
  emailSubject: string;
  emailBody: string;
  smsBody: string | null;
  createTicket: boolean;
}

const DEFAULT_STEPS: StepDef[] = [
  {
    stepNumber: 1,
    daysOffset: 0,
    channels: ["email"],
    tone: "FRIENDLY",
    emailSubject: DEFAULT_DUNNING_TEMPLATES.step1.subject,
    emailBody: DEFAULT_DUNNING_TEMPLATES.step1.body,
    smsBody: null,
    createTicket: false,
  },
  {
    stepNumber: 2,
    daysOffset: 3,
    channels: ["email", "sms"],
    tone: "POLITE",
    emailSubject: DEFAULT_DUNNING_TEMPLATES.step2.subject,
    emailBody: DEFAULT_DUNNING_TEMPLATES.step2.body,
    smsBody: DEFAULT_SMS_TEMPLATES.step2,
    createTicket: false,
  },
  {
    stepNumber: 3,
    daysOffset: 7,
    channels: ["email", "sms"],
    tone: "FIRM",
    emailSubject: DEFAULT_DUNNING_TEMPLATES.step3.subject,
    emailBody: DEFAULT_DUNNING_TEMPLATES.step3.body,
    smsBody: DEFAULT_SMS_TEMPLATES.step3,
    createTicket: false,
  },
  {
    stepNumber: 4,
    daysOffset: 14,
    channels: ["email"],
    tone: "URGENT",
    emailSubject: DEFAULT_DUNNING_TEMPLATES.step4.subject,
    emailBody: DEFAULT_DUNNING_TEMPLATES.step4.body,
    smsBody: null,
    createTicket: false,
  },
  {
    stepNumber: 5,
    daysOffset: 30,
    channels: ["email"],
    tone: "ESCALATE",
    emailSubject: DEFAULT_DUNNING_TEMPLATES.step5.subject,
    emailBody: DEFAULT_DUNNING_TEMPLATES.step5.body,
    smsBody: null,
    createTicket: true,
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not set");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // Find orgs that already have a default dunning sequence
    const existingDefaults = await prisma.dunningSequence.findMany({
      where: { isDefault: true },
      select: { orgId: true },
    });
    const orgsWithDefault = new Set(existingDefaults.map((d) => d.orgId));

    // All orgs
    const allOrgs = await prisma.organization.findMany({
      select: { id: true, name: true },
    });

    const orgsNeedingDefault = allOrgs.filter(
      (org) => !orgsWithDefault.has(org.id)
    );

    if (orgsNeedingDefault.length === 0) {
      console.log("✅ All organizations already have a default dunning sequence.");
      return;
    }

    console.log(
      `🔧 Creating default dunning sequences for ${orgsNeedingDefault.length} org(s)...\n`
    );

    let created = 0;

    for (const org of orgsNeedingDefault) {
      await prisma.$transaction(async (tx) => {
        // 1. Create the DunningSequence
        const sequence = await tx.dunningSequence.create({
          data: {
            orgId: org.id,
            name: "Default Dunning Sequence",
            isDefault: true,
            isActive: true,
          },
        });

        // 2. Create all 5 DunningSteps
        await tx.dunningStep.createMany({
          data: DEFAULT_STEPS.map((step) => ({
            sequenceId: sequence.id,
            stepNumber: step.stepNumber,
            daysOffset: step.daysOffset,
            channels: step.channels,
            tone: step.tone,
            emailSubject: step.emailSubject,
            emailBody: step.emailBody,
            smsBody: step.smsBody,
            createTicket: step.createTicket,
          })),
        });

        // 3. Update OrgDefaults.defaultDunningSeqId (upsert in case row doesn't exist)
        await tx.orgDefaults.upsert({
          where: { organizationId: org.id },
          update: { defaultDunningSeqId: sequence.id },
          create: {
            organizationId: org.id,
            defaultDunningSeqId: sequence.id,
          },
        });

        console.log(`  ✅ ${org.name} (${org.id}) → sequence ${sequence.id}`);
      });

      created++;
    }

    console.log(
      `\n🎉 Done. Created default dunning sequences for ${created} organization(s).`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Seed script failed:", err);
  process.exit(1);
});
