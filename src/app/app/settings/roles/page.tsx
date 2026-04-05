"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ALL_ROLES,
  ROLE_LABELS,
  PERMISSIONS,
  getRoleColor,
  type Role,
  type Module,
  type Action,
} from "@/lib/permissions";

const MODULE_LABELS: Record<Module, string> = {
  invoices: "Invoices",
  vouchers: "Vouchers",
  salary_slips: "Salary Slips",
  pay_proofs: "Payment Proofs",
  pay_recurring: "Recurring Payments",
  pay_sendlog: "Send Log",
  flow_tickets: "Tickets",
  flow_approvals: "Approvals",
  flow_notifications: "Notifications",
  intel_dashboard: "Dashboard",
  intel_reports: "Reports",
  settings_users: "User Management",
  settings_roles: "Role Management",
  settings_proxy: "Proxy Access",
  settings_audit: "Audit Log",
};

const MODULE_GROUPS: { label: string; modules: Module[] }[] = [
  {
    label: "Documents",
    modules: ["invoices", "vouchers", "salary_slips"],
  },
  {
    label: "Payments",
    modules: ["pay_proofs", "pay_recurring", "pay_sendlog"],
  },
  {
    label: "Workflow",
    modules: ["flow_tickets", "flow_approvals", "flow_notifications"],
  },
  {
    label: "Intelligence",
    modules: ["intel_dashboard", "intel_reports"],
  },
  {
    label: "Settings",
    modules: ["settings_users", "settings_roles", "settings_proxy", "settings_audit"],
  },
];

const ACTION_LABELS: Record<Action, string> = {
  read: "Read",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  send: "Send",
  approve: "Approve",
  export: "Export",
};

const ALL_ACTIONS: Action[] = [
  "read",
  "create",
  "edit",
  "delete",
  "send",
  "approve",
  "export",
];

export default function RolesPage() {
  const [activeRole, setActiveRole] = useState<Role>("owner");

  const perms = PERMISSIONS[activeRole];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">
            Roles & Permissions
          </h2>
          <p className="text-sm text-[#666] mt-1">
            View the permission matrix for each role. Roles are assigned to team
            members in the Team Members page.
          </p>
        </CardHeader>
        <CardContent>
          {/* Role tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {ALL_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeRole === role
                    ? getRoleColor(role) + " ring-2 ring-offset-1 ring-[#dc2626]"
                    : "bg-[#f5f5f5] text-[#666] hover:bg-[#e5e5e5]"
                }`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>

          {/* Permission table */}
          <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#fafafa]">
                  <th className="text-left px-4 py-2.5 font-medium text-[#666] border-b border-[#e5e5e5]">
                    Module
                  </th>
                  {ALL_ACTIONS.map((action) => (
                    <th
                      key={action}
                      className="text-center px-3 py-2.5 font-medium text-[#666] border-b border-[#e5e5e5]"
                    >
                      {ACTION_LABELS[action]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULE_GROUPS.map((group) => (
                  <>
                    <tr key={group.label}>
                      <td
                        colSpan={ALL_ACTIONS.length + 1}
                        className="px-4 py-2 bg-[#f8f8f8] text-xs font-semibold text-[#999] uppercase tracking-wider border-b border-[#e5e5e5]"
                      >
                        {group.label}
                      </td>
                    </tr>
                    {group.modules.map((mod) => {
                      const actions = perms[mod] ?? [];
                      return (
                        <tr
                          key={mod}
                          className="border-b border-[#f0f0f0] last:border-0"
                        >
                          <td className="px-4 py-2.5 text-[#1a1a1a] font-medium">
                            {MODULE_LABELS[mod]}
                          </td>
                          {ALL_ACTIONS.map((action) => (
                            <td
                              key={action}
                              className="text-center px-3 py-2.5"
                            >
                              {actions.includes(action) ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#f5f5f5] text-[#ccc] text-xs">
                                  —
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
