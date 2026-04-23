import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import IntegrationsClient from "./integrations-client";

export default async function IntegrationsPage() {
  try {
    await requireRole("admin");
  } catch {
    redirect("/app/settings");
  }

  return <IntegrationsClient />;
}
