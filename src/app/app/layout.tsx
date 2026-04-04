import { AppShell } from "@/components/layout/app-shell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Session will be wired in Slice 1.1.2
  // For now render the shell without user data (Phase 1 adds auth)
  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
