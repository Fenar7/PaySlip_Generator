import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthRoutingContext } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAuthRoutingContext();

  if (!context.isAuthenticated) {
    redirect(context.loginPath ?? "/auth/login");
  }

  if (!context.hasOrg) {
    redirect("/onboarding");
  }

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
