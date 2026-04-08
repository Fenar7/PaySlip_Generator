"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/app/pay/dunning", label: "Overview", icon: "📋" },
  { href: "/app/pay/dunning/logs", label: "Logs", icon: "📜" },
  { href: "/app/pay/dunning/opt-outs", label: "Opt-Outs", icon: "🚫" },
];

export default function DunningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b border-[var(--border-soft)] bg-[var(--surface-soft)] lg:w-56 lg:border-b-0 lg:border-r">
        <div className="px-4 pb-2 pt-6 lg:pb-0">
          <h2 className="text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-[var(--muted-foreground)]">
            SW&gt; Dunning
          </h2>
        </div>
        <DunningNav />
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-8 lg:px-10">{children}</main>
    </div>
  );
}

function DunningNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-x-visible">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/app/pay/dunning"
            ? pathname === "/app/pay/dunning" ||
              pathname.startsWith("/app/pay/dunning/sequences")
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-white font-medium text-[var(--foreground)] shadow-sm"
                : "text-[var(--foreground-soft)] hover:bg-white/60 hover:text-[var(--foreground)]"
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
