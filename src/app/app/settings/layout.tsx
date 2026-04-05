"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Profile", href: "/app/settings/profile" },
  { label: "Security", href: "/app/settings/security" },
  { label: "Organization", href: "/app/settings/organization" },
  { label: "Team Members", href: "/app/settings/users" },
  { label: "Roles", href: "/app/settings/roles" },
  { label: "Proxy Access", href: "/app/settings/access" },
  { label: "Audit Log", href: "/app/settings/audit" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-8">Settings</h1>
      <div className="flex gap-8">
        <nav className="w-48 shrink-0">
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block px-3 py-2 rounded-md text-sm transition-colors",
                    pathname === item.href
                      ? "bg-[#dc2626] text-white font-medium"
                      : "text-[#666] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
