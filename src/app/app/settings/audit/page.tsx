import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuditClient } from "./audit-client";

export default async function AuditPage() {
  let ctx;
  try {
    ctx = await requireRole("admin");
  } catch {
    redirect("/app/settings");
  }

  return <AuditClient />;
}
