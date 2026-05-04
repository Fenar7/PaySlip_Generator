import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

interface AppShellProps {
  children: React.ReactNode;
  orgName?: string;
  initialUser?: {
    name?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  };
}

export function AppShell({ children, orgName, initialUser }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface-base)]">
      {/* Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <AppSidebar />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar orgName={orgName} initialUser={initialUser} />
        <main className="flex-1 overflow-y-auto bg-[var(--surface-base)]">
          {children}
        </main>
      </div>
    </div>
  );
}
