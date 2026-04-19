"use client";

import { useState } from "react";

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, string[]>;
  isSystem: boolean;
  memberCount: number;
}

const RESOURCES = [
  "invoices",
  "quotes",
  "bills",
  "payments",
  "payroll",
  "employees",
  "customers",
  "vendors",
  "templates",
  "reports",
  "settings",
  "billing",
  "integrations",
  "audit",
  "intel",
  "inventory",
  "procurement",
] as const;

const ACTIONS = ["create", "read", "update", "delete"] as const;

export default function CustomRolesPage() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [showCreate, setShowCreate] = useState(false);

  function togglePermission(resource: string, action: string) {
    setPermissions((prev) => {
      const current = prev[resource] || [];
      const next = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...prev, [resource]: next };
    });
  }

  function toggleAllForResource(resource: string) {
    setPermissions((prev) => {
      const current = prev[resource] || [];
      const allSelected = ACTIONS.every((a) => current.includes(a));
      return {
        ...prev,
        [resource]: allSelected ? [] : [...ACTIONS],
      };
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Roles</h1>
          <p className="text-muted-foreground mt-1">
            Define granular access levels beyond the default Owner / Admin / Member hierarchy.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
        >
          Create Role
        </button>
      </div>

      {/* Existing Roles */}
      <div className="grid gap-4">
        {roles.length === 0 && !showCreate && (
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            No custom roles defined. Create one to assign granular permissions to team members.
          </div>
        )}
        {roles.map((role) => (
          <div key={role.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{role.name}</h3>
                {role.description && (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {role.memberCount} member{role.memberCount !== 1 ? "s" : ""}
                </span>
                {!role.isSystem && (
                  <>
                    <button
                      onClick={() => {
                        setEditing(role);
                        setPermissions(role.permissions);
                      }}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button className="text-sm text-red-600 hover:underline">Delete</button>
                  </>
                )}
                {role.isSystem && (
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">System</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Form */}
      {(showCreate || editing) && (
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold">
            {editing ? `Edit: ${editing.name}` : "Create New Role"}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Role Name</label>
              <input
                type="text"
                value={editing ? editing.name : newRoleName}
                onChange={(e) =>
                  editing
                    ? setEditing({ ...editing, name: e.target.value })
                    : setNewRoleName(e.target.value)
                }
                className="mt-1 block w-full rounded-md border px-3 py-2"
                placeholder="e.g., Junior Accountant"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <input
                type="text"
                value={editing ? (editing.description || "") : newRoleDescription}
                onChange={(e) =>
                  editing
                    ? setEditing({ ...editing, description: e.target.value })
                    : setNewRoleDescription(e.target.value)
                }
                className="mt-1 block w-full rounded-md border px-3 py-2"
                placeholder="Read-only access to invoices and reports"
              />
            </div>
          </div>

          {/* Permission Matrix */}
          <div>
            <h3 className="text-sm font-medium mb-2">Permissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Resource</th>
                    {ACTIONS.map((action) => (
                      <th key={action} className="text-center py-2 px-2 capitalize">
                        {action}
                      </th>
                    ))}
                    <th className="text-center py-2 px-2">All</th>
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.map((resource) => (
                    <tr key={resource} className="border-b">
                      <td className="py-2 pr-4 capitalize">{resource}</td>
                      {ACTIONS.map((action) => (
                        <td key={action} className="text-center py-2 px-2">
                          <input
                            type="checkbox"
                            checked={(permissions[resource] || []).includes(action)}
                            onChange={() => togglePermission(resource, action)}
                            className="h-4 w-4"
                          />
                        </td>
                      ))}
                      <td className="text-center py-2 px-2">
                        <input
                          type="checkbox"
                          checked={ACTIONS.every((a) =>
                            (permissions[resource] || []).includes(a)
                          )}
                          onChange={() => toggleAllForResource(resource)}
                          className="h-4 w-4"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              {editing ? "Save Changes" : "Create Role"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setEditing(null);
                setPermissions({});
              }}
              className="px-4 py-2 border rounded-md text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
