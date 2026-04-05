"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  getRoleColor,
  type Role,
} from "@/lib/permissions";
import {
  getOrgMembers,
  getPendingInvitations,
  inviteUser,
  updateMemberRole,
  deactivateMember,
  reactivateMember,
  removeMember,
  resendInvitation,
  cancelInvitation,
  type MemberWithProfile,
  type InvitationRow,
} from "./actions";

function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-semibold text-[#1a1a1a] mb-2">{title}</h3>
        <p className="text-sm text-[#666] mb-6">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

function InviteModal({
  open,
  onClose,
  onInvite,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (email: string, role: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("viewer");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError("");
    try {
      await onInvite(email.trim(), role);
      setEmail("");
      setRole("viewer");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-[#1a1a1a] mb-4">
          Invite Team Member
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-[#e5e5e5] rounded-md px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send Invitation"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const label =
    ROLE_LABELS[role as Role] ??
    role
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(role)}`}
    >
      {label}
    </span>
  );
}

export default function UsersClient({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [m, inv] = await Promise.all([
        getOrgMembers(),
        getPendingInvitations(),
      ]);
      setMembers(m);
      setInvitations(inv);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load team members"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleInvite(email: string, role: string) {
    const result = await inviteUser({ email, role });
    if (!result.success) throw new Error(result.error);
    await loadData();
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    const result = await updateMemberRole(memberId, newRole);
    if (!result.success) {
      setError(result.error ?? "Failed to update role");
      return;
    }
    setError("");
    await loadData();
  }

  async function handleDeactivate(member: MemberWithProfile) {
    setConfirm({
      title: "Deactivate Member",
      message: `Deactivate ${member.user.name}? They will lose access until reactivated.`,
      action: async () => {
        const result = await deactivateMember(member.id);
        if (!result.success) setError(result.error ?? "Failed");
        else setError("");
        setConfirm(null);
        await loadData();
      },
    });
  }

  async function handleReactivate(memberId: string) {
    const result = await reactivateMember(memberId);
    if (!result.success) setError(result.error ?? "Failed");
    else setError("");
    await loadData();
  }

  async function handleRemove(member: MemberWithProfile) {
    setConfirm({
      title: "Remove Member",
      message: `Remove ${member.user.name} from the organization? This cannot be undone.`,
      action: async () => {
        const result = await removeMember(member.id);
        if (!result.success) setError(result.error ?? "Failed");
        else setError("");
        setConfirm(null);
        await loadData();
      },
    });
  }

  async function handleResendInvite(id: string) {
    const result = await resendInvitation(id);
    if (!result.success) setError(result.error ?? "Failed");
    else setError("");
    await loadData();
  }

  async function handleCancelInvite(id: string) {
    const result = await cancelInvitation(id);
    if (!result.success) setError(result.error ?? "Failed");
    else setError("");
    await loadData();
  }

  if (loading) {
    return (
      <div className="text-sm text-[#666]">Loading team members…</div>
    );
  }

  const activeMembers = members.filter((m) => m.role !== "deactivated");
  const deactivatedMembers = members.filter((m) => m.role === "deactivated");

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Active Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1a1a1a]">
              Team Members
              <span className="ml-2 text-sm font-normal text-[#999]">
                ({activeMembers.length})
              </span>
            </h2>
            <Button size="sm" onClick={() => setShowInvite(true)}>
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e5e5]">
                  <th className="text-left px-6 py-3 font-medium text-[#666]">
                    Name
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-[#666]">
                    Email
                  </th>
                  <th className="text-left px-6 py-3 font-medium text-[#666]">
                    Role
                  </th>
                  <th className="text-right px-6 py-3 font-medium text-[#666]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeMembers.map((member) => {
                  const isOwner = member.role === "owner";
                  const isSelf = member.userId === currentUserId;

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-[#f0f0f0] last:border-0"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#f0f0f0] flex items-center justify-center text-xs font-medium text-[#666]">
                            {member.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <span className="font-medium text-[#1a1a1a]">
                            {member.user.name}
                            {isSelf && (
                              <span className="ml-1.5 text-xs text-[#999]">
                                (you)
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-[#666]">
                        {member.user.email}
                      </td>
                      <td className="px-6 py-3">
                        {isOwner ? (
                          <RoleBadge role={member.role} />
                        ) : (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(member.id, e.target.value)
                            }
                            className="border border-[#e5e5e5] rounded-md px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {!isOwner && !isSelf && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeactivate(member)}
                            >
                              Deactivate
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleRemove(member)}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {activeMembers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-[#999]"
                    >
                      No team members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Deactivated Members */}
      {deactivatedMembers.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1a1a1a]">
              Deactivated Members
              <span className="ml-2 text-sm font-normal text-[#999]">
                ({deactivatedMembers.length})
              </span>
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e5e5]">
                    <th className="text-left px-6 py-3 font-medium text-[#666]">
                      Name
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-[#666]">
                      Email
                    </th>
                    <th className="text-right px-6 py-3 font-medium text-[#666]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deactivatedMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-[#f0f0f0] last:border-0 opacity-60"
                    >
                      <td className="px-6 py-3 text-[#1a1a1a]">
                        {member.user.name}
                      </td>
                      <td className="px-6 py-3 text-[#666]">
                        {member.user.email}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivate(member.id)}
                          >
                            Reactivate
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRemove(member)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#1a1a1a]">
              Pending Invitations
              <span className="ml-2 text-sm font-normal text-[#999]">
                ({invitations.length})
              </span>
            </h2>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e5e5]">
                    <th className="text-left px-6 py-3 font-medium text-[#666]">
                      Email
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-[#666]">
                      Role
                    </th>
                    <th className="text-left px-6 py-3 font-medium text-[#666]">
                      Expires
                    </th>
                    <th className="text-right px-6 py-3 font-medium text-[#666]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => {
                    const expired = new Date(inv.expiresAt) < new Date();
                    return (
                      <tr
                        key={inv.id}
                        className="border-b border-[#f0f0f0] last:border-0"
                      >
                        <td className="px-6 py-3 text-[#1a1a1a]">
                          {inv.email}
                        </td>
                        <td className="px-6 py-3">
                          <RoleBadge role={inv.role ?? "viewer"} />
                        </td>
                        <td className="px-6 py-3 text-[#666]">
                          {expired ? (
                            <span className="text-red-500 text-xs font-medium">
                              Expired
                            </span>
                          ) : (
                            new Date(inv.expiresAt).toLocaleDateString()
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendInvite(inv.id)}
                            >
                              Resend
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleCancelInvite(inv.id)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <InviteModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onInvite={handleInvite}
      />
      {confirm && (
        <ConfirmDialog
          open
          title={confirm.title}
          message={confirm.message}
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
