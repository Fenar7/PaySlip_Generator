import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProxyClient } from "./proxy-client";

export default async function AccessPage() {
  try {
    await requireRole("admin");
  } catch {
    redirect("/app/settings");
  }

  return <ProxyClient />;
}
