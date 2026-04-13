export const SUPPORTED_TRIGGERS = [
  "invoice.issued",
  "invoice.overdue",
  "payment_proof.submitted",
  "ticket.opened",
  "approval.requested",
  "approval.breached",
  "vendor_bill.submitted",
  "payment_run.failed",
  "close_task.blocked",
  "scheduled_action.dead_lettered",
] as const;

export const SUPPORTED_ACTIONS = [
  "assign_ticket",
  "create_approval_request",
  "send_notification",
  "schedule_reminder",
  "escalate_to_role",
  "enqueue_scheduled_action",
  "create_follow_up",
  "notify_org_admins",
] as const;

export type SupportedTrigger = (typeof SUPPORTED_TRIGGERS)[number];
export type SupportedAction = (typeof SUPPORTED_ACTIONS)[number];
