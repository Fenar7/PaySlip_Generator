export const SUPPORTED_TRIGGERS = [
  // Invoice lifecycle
  "invoice.created",
  "invoice.issued",
  "invoice.paid",
  "invoice.overdue",
  // Quote lifecycle
  "quote.accepted",
  "quote.declined",
  // Ticket lifecycle
  "ticket.opened",
  "ticket.closed",
  // Payment
  "payment.received",
  "proof.uploaded",
  "payment_proof.submitted",
  // Voucher
  "voucher.created",
  // Scheduling
  "schedule.cron",
  "manual",
  // Legacy / internal triggers kept for backward compatibility
  "approval.requested",
  "approval.finalized",
  "approval.breached",
  "vendor_bill.submitted",
  "payment_run.failed",
  "close_task.blocked",
  "scheduled_action.dead_lettered",
] as const;

export const SUPPORTED_ACTIONS = [
  // Communication
  "send_email",
  "send_notification",
  "create_notification",
  "notify_org_admins",
  // Ticketing
  "create_ticket",
  "assign_ticket",
  // Document operations
  "update_invoice_status",
  // Approvals
  "create_approval_request",
  // Auditing
  "add_audit_log",
  // Scheduling
  "wait",
  "schedule_reminder",
  // External
  "webhook_call",
  // Internal
  "enqueue_scheduled_action",
  "escalate_to_role",
  "create_follow_up",
] as const;

export type SupportedTrigger = (typeof SUPPORTED_TRIGGERS)[number];
export type SupportedAction = (typeof SUPPORTED_ACTIONS)[number];

/** Human-readable trigger labels for UI display */
export const TRIGGER_LABELS: Record<SupportedTrigger, string> = {
  "invoice.created": "Invoice Created",
  "invoice.issued": "Invoice Issued / Sent",
  "invoice.paid": "Invoice Marked Paid",
  "invoice.overdue": "Invoice Becomes Overdue",
  "quote.accepted": "Quote Accepted",
  "quote.declined": "Quote Declined",
  "ticket.opened": "Support Ticket Opened",
  "ticket.closed": "Support Ticket Closed",
  "payment.received": "Payment Received (Razorpay)",
  "proof.uploaded": "Payment Proof Uploaded",
  "payment_proof.submitted": "Payment Proof Submitted",
  "voucher.created": "Voucher Created",
  "schedule.cron": "Scheduled (Daily / Weekly / Monthly)",
  "manual": "Manually Triggered",
  "approval.requested": "Approval Requested",
  "approval.finalized": "Approval Chain Finalized",
  "approval.breached": "Approval SLA Breached",
  "vendor_bill.submitted": "Vendor Bill Submitted",
  "payment_run.failed": "Payment Run Failed",
  "close_task.blocked": "Close Task Blocked",
  "scheduled_action.dead_lettered": "Scheduled Action Dead-Lettered",
};

/** Human-readable action labels for UI display */
export const ACTION_LABELS: Record<SupportedAction, string> = {
  "send_email": "Send Email",
  "send_notification": "Send In-App Notification",
  "create_notification": "Create In-App Notification",
  "notify_org_admins": "Notify All Admins",
  "create_ticket": "Create Support Ticket",
  "assign_ticket": "Assign Ticket",
  "update_invoice_status": "Update Invoice Status",
  "create_approval_request": "Create Approval Request",
  "add_audit_log": "Add Audit Log Entry",
  "wait": "Wait / Delay",
  "schedule_reminder": "Schedule Reminder",
  "webhook_call": "Call Webhook (HTTP POST)",
  "enqueue_scheduled_action": "Enqueue Scheduled Action",
  "escalate_to_role": "Escalate to Role",
  "create_follow_up": "Create Follow-Up Task",
};
