import "server-only";

export interface DunningTemplateVars {
  customer_name: string;
  invoice_number: string;
  invoice_amount: string;
  amount_due: string;
  amount_paid: string;
  due_date: string;
  days_overdue: number;
  pay_now_link: string;
  org_name: string;
  org_email: string;
  org_phone: string;
  invoice_date: string;
  unsubscribe_url: string;
}

/**
 * Render a dunning template by replacing {{variable}} placeholders.
 * Sanitizes HTML-unsafe characters in variable values to prevent XSS in email body.
 */
export function renderDunningTemplate(
  template: string,
  vars: DunningTemplateVars
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = vars[key as keyof DunningTemplateVars];
    if (value === undefined || value === null) return match;
    return escapeHtml(String(value));
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build the unsubscribe footer that must appear in every dunning email.
 */
export function buildUnsubscribeFooter(vars: DunningTemplateVars): string {
  return `
<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="font-size:11px;color:#999;line-height:1.5">
  You're receiving this because ${escapeHtml(vars.customer_name)} has an outstanding invoice with ${escapeHtml(vars.org_name)}.<br>
  <a href="${escapeHtml(vars.unsubscribe_url)}" style="color:#999;text-decoration:underline">Unsubscribe from payment reminders</a>
</p>`;
}

// Default email templates per dunning step
export const DEFAULT_DUNNING_TEMPLATES = {
  step1: {
    subject: "Your invoice {{invoice_number}} from {{org_name}} is due today",
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
    subject: "Action needed: Invoice {{invoice_number}} — {{days_overdue}} days overdue",
    body: `Hi {{customer_name}},

This is a firm reminder that invoice {{invoice_number}} remains unpaid. The outstanding balance is {{amount_due}}, now {{days_overdue}} days past due.

Please make payment immediately to avoid further escalation:
<a href="{{pay_now_link}}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Pay {{amount_due}} Now</a>

{{org_name}} | {{org_email}}`,
  },
  step4: {
    subject: "FINAL NOTICE: Invoice {{invoice_number}} — Immediate payment required",
    body: `Hi {{customer_name}},

This is a final notice. Invoice {{invoice_number}} ({{amount_due}} outstanding) is {{days_overdue}} days overdue.

Failure to pay may result in service suspension and/or escalation.

<a href="{{pay_now_link}}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Pay Now — {{amount_due}}</a>

{{org_name}} | {{org_email}} | {{org_phone}}`,
  },
  step5: {
    subject: "Urgent escalation: Invoice {{invoice_number}} — 30 days overdue",
    body: `Hi {{customer_name}},

Your invoice {{invoice_number}} for {{amount_due}} has been outstanding for {{days_overdue}} days and has been escalated to our accounts team.

A support ticket has been created. Our team will contact you shortly.

<a href="{{pay_now_link}}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Pay Now — {{amount_due}}</a>

{{org_name}} | {{org_email}} | {{org_phone}}`,
  },
} as const;

// Default SMS templates per step
export const DEFAULT_SMS_TEMPLATES = {
  step2: "Invoice {{invoice_number}} ({{amount_due}}) from {{org_name}} is overdue. Pay: {{pay_now_link}}",
  step3: "Urgent: Invoice {{invoice_number}} ({{amount_due}}) is {{days_overdue}} days past due. Pay now: {{pay_now_link}}",
} as const;

/**
 * Format currency in Indian format (₹1,18,000)
 */
export function formatIndianCurrency(amount: number): string {
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

/**
 * Format date in Indian format (31 Mar 2026)
 */
export function formatDateIndian(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
