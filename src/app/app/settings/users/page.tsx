import { requireOrgContext } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import UsersClient from "./users-client";

export default async function UsersPage() {
  const ctx = await requireOrgContext();

  if (!hasPermission(ctx.role, "settings_users", "read")) {
    redirect("/app/settings/profile");
  }

  return <UsersClient currentUserId={ctx.userId} />;
}
