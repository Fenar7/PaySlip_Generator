export type Role =
  | "owner"
  | "admin"
  | "finance_manager"
  | "hr_manager"
  | "voucher_operator"
  | "invoice_operator"
  | "viewer";

export type Module =
  | "invoices"
  | "vouchers"
  | "salary_slips"
  | "pay_proofs"
  | "pay_recurring"
  | "pay_sendlog"
  | "flow_tickets"
  | "flow_approvals"
  | "flow_notifications"
  | "intel_dashboard"
  | "intel_reports"
  | "settings_users"
  | "settings_roles"
  | "settings_proxy"
  | "settings_audit";

export type Action =
  | "read"
  | "create"
  | "edit"
  | "delete"
  | "send"
  | "approve"
  | "export";

const ALL_ACTIONS: Action[] = [
  "read",
  "create",
  "edit",
  "delete",
  "send",
  "approve",
  "export",
];

const ALL_MODULES: Module[] = [
  "invoices",
  "vouchers",
  "salary_slips",
  "pay_proofs",
  "pay_recurring",
  "pay_sendlog",
  "flow_tickets",
  "flow_approvals",
  "flow_notifications",
  "intel_dashboard",
  "intel_reports",
  "settings_users",
  "settings_roles",
  "settings_proxy",
  "settings_audit",
];

function fullAccess(): Record<Module, Action[]> {
  return Object.fromEntries(
    ALL_MODULES.map((m) => [m, [...ALL_ACTIONS]])
  ) as Record<Module, Action[]>;
}

const PERMISSIONS: Record<Role, Record<Module, Action[]>> = {
  owner: fullAccess(),

  admin: {
    invoices: ["read", "create", "edit", "delete", "send", "approve", "export"],
    vouchers: ["read", "create", "edit", "delete", "approve", "export"],
    salary_slips: ["read", "create", "edit", "delete", "send", "export"],
    pay_proofs: ["read", "create", "approve"],
    pay_recurring: ["read", "create", "edit", "delete"],
    pay_sendlog: ["read", "export"],
    flow_tickets: ["read", "create", "edit", "delete", "approve"],
    flow_approvals: ["read", "approve"],
    flow_notifications: ["read"],
    intel_dashboard: ["read"],
    intel_reports: ["read", "export"],
    settings_users: ["read", "create", "edit", "delete"],
    settings_roles: ["read"],
    settings_proxy: ["read", "create", "edit", "delete"],
    settings_audit: ["read", "export"],
  },

  finance_manager: {
    invoices: ["read", "create", "edit", "delete", "send"],
    vouchers: ["read", "create", "edit", "delete"],
    salary_slips: ["read"],
    pay_proofs: ["read", "create", "approve"],
    pay_recurring: ["read", "create", "edit", "delete"],
    pay_sendlog: ["read"],
    flow_tickets: ["read", "create", "edit"],
    flow_approvals: ["read", "approve"],
    flow_notifications: ["read"],
    intel_dashboard: ["read"],
    intel_reports: ["read", "export"],
    settings_users: [],
    settings_roles: [],
    settings_proxy: [],
    settings_audit: [],
  },

  hr_manager: {
    invoices: ["read"],
    vouchers: [],
    salary_slips: ["read", "create", "edit", "delete", "send"],
    pay_proofs: [],
    pay_recurring: [],
    pay_sendlog: [],
    flow_tickets: ["read"],
    flow_approvals: ["read", "approve"],
    flow_notifications: ["read"],
    intel_dashboard: ["read"],
    intel_reports: ["read"],
    settings_users: [],
    settings_roles: [],
    settings_proxy: [],
    settings_audit: [],
  },

  voucher_operator: {
    invoices: [],
    vouchers: ["read", "create", "edit"],
    salary_slips: [],
    pay_proofs: [],
    pay_recurring: [],
    pay_sendlog: [],
    flow_tickets: ["read"],
    flow_approvals: [],
    flow_notifications: ["read"],
    intel_dashboard: [],
    intel_reports: [],
    settings_users: [],
    settings_roles: [],
    settings_proxy: [],
    settings_audit: [],
  },

  invoice_operator: {
    invoices: ["read", "create", "edit", "send"],
    vouchers: [],
    salary_slips: [],
    pay_proofs: [],
    pay_recurring: [],
    pay_sendlog: [],
    flow_tickets: ["read"],
    flow_approvals: [],
    flow_notifications: ["read"],
    intel_dashboard: [],
    intel_reports: [],
    settings_users: [],
    settings_roles: [],
    settings_proxy: [],
    settings_audit: [],
  },

  viewer: {
    invoices: ["read"],
    vouchers: ["read"],
    salary_slips: ["read"],
    pay_proofs: [],
    pay_recurring: [],
    pay_sendlog: [],
    flow_tickets: ["read"],
    flow_approvals: [],
    flow_notifications: ["read"],
    intel_dashboard: [],
    intel_reports: [],
    settings_users: [],
    settings_roles: [],
    settings_proxy: [],
    settings_audit: [],
  },
};

export function hasPermission(
  role: string,
  module: Module,
  action: Action
): boolean {
  const perms = PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms[module]?.includes(action) ?? false;
}

export function getPermittedModules(role: string): Module[] {
  const perms = PERMISSIONS[role as Role];
  if (!perms) return [];
  return ALL_MODULES.filter((m) => perms[m]?.length > 0);
}

export function getPermittedActions(role: string, module: Module): Action[] {
  const perms = PERMISSIONS[role as Role];
  if (!perms) return [];
  return perms[module] ?? [];
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  finance_manager: "Finance Manager",
  hr_manager: "HR Manager",
  voucher_operator: "Voucher Operator",
  invoice_operator: "Invoice Operator",
  viewer: "Viewer",
};

export const ALL_ROLES: Role[] = [
  "owner",
  "admin",
  "finance_manager",
  "hr_manager",
  "voucher_operator",
  "invoice_operator",
  "viewer",
];

export const ASSIGNABLE_ROLES: Role[] = ALL_ROLES.filter(
  (r) => r !== "owner"
);

export function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    owner: "bg-red-100 text-red-700",
    admin: "bg-blue-100 text-blue-700",
    finance_manager: "bg-green-100 text-green-700",
    hr_manager: "bg-purple-100 text-purple-700",
    voucher_operator: "bg-amber-100 text-amber-700",
    invoice_operator: "bg-teal-100 text-teal-700",
    viewer: "bg-gray-100 text-gray-600",
  };
  return colors[role] ?? "bg-gray-100 text-gray-600";
}

export { PERMISSIONS, ALL_MODULES, ALL_ACTIONS };
