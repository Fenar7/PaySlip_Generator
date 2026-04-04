import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
  userImage?: string;
  orgName?: string;
}

export function AppShell({ children, userName, userImage, orgName }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <AppSidebar />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopbar userName={userName} userImage={userImage} orgName={orgName} />
        <main className="flex-1 overflow-y-auto bg-[var(--background)]">
          {children}
        </main>
      </div>
    </div>
  );
}
