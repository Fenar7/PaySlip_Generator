import Link from "next/link";
import {
  KeyRound,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthHeroPanel } from "./auth-hero-panel";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  eyebrow?: string;
  aside?: React.ReactNode;
  contentClassName?: string;
}

function DefaultAuthAside() {
  return (
    <AuthHeroPanel
      badge="Secure workspace access"
      title="One polished sign-in flow for every recurring document workflow."
      description="Slipwise keeps access clear for everyday users while still supporting stronger security and enterprise requirements behind the scenes."
      supportingPoints={[
        "Passkeys & MFA ready",
        "Google sign-in",
        "Enterprise SSO support",
      ]}
      highlights={[
        {
          icon: KeyRound,
          title: "Modern authentication, without clutter",
          description:
            "Primary sign-in stays simple while advanced options can still be reached when teams need them.",
        },
        {
          icon: ShieldCheck,
          title: "Security that scales with your team",
          description:
            "Passkeys, verification flows, and recovery paths stay available without overwhelming first-time users.",
        },
        {
          icon: Workflow,
          title: "One account across Slipwise workflows",
          description:
            "Move between payroll, finance, and document workspaces with a consistent brand and access experience.",
        },
      ]}
      footer="A cleaner auth shell makes every account step feel deliberate, trustworthy, and product-grade."
    />
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
  className,
  eyebrow,
  aside,
  contentClassName,
}: AuthCardProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fffdfb_0%,#f7f1eb_55%,#ffffff_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.08),transparent_34%)]" />
      <div className="pointer-events-none absolute left-[-10rem] top-32 -z-10 h-72 w-72 rounded-full bg-[rgba(220,38,38,0.05)] blur-[120px]" />
      <div className="pointer-events-none absolute right-[-8rem] top-20 -z-10 h-80 w-80 rounded-full bg-[rgba(34,34,34,0.04)] blur-[130px]" />

      <div className="mx-auto flex min-h-screen w-full max-w-[98rem] items-center px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,31rem)_minmax(0,1fr)] lg:items-stretch xl:gap-8">
          <div className="flex flex-col justify-center">
            <div className="mb-5 flex items-center justify-between gap-3">
              <Link href="/" className="inline-flex items-center gap-2">
                <span className="text-[1.95rem] font-bold tracking-[-0.08em] text-[var(--foreground)]">
                  Slip<span className="text-[var(--accent)]">wise</span>
                </span>
                <span className="rounded-md bg-[var(--accent)] px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white">
                  One
                </span>
              </Link>
              <span className="hidden rounded-full border border-[var(--border-soft)] bg-white/80 px-3 py-1.5 text-[0.72rem] font-medium text-[var(--foreground-soft)] shadow-[var(--shadow-soft)] sm:inline-flex">
                Thoughtful access design
              </span>
            </div>

            <div
              className={cn(
                "relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/92 shadow-[0_30px_80px_rgba(34,34,34,0.08)] backdrop-blur",
                className
              )}
            >
              <div className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,var(--accent),rgba(220,38,38,0.35),transparent)]" />
              <div className={cn("p-6 sm:p-8", contentClassName)}>
                {eyebrow && (
                  <span className="inline-flex items-center rounded-full border border-[rgba(220,38,38,0.12)] bg-[var(--accent-soft)] px-3.5 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                    {eyebrow}
                  </span>
                )}
                <h1 className="mt-4 text-[2rem] font-semibold tracking-[-0.05em] text-[var(--foreground)] sm:text-[2.15rem]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-3 max-w-xl text-[0.98rem] leading-7 text-[var(--foreground-soft)]">
                    {subtitle}
                  </p>
                )}
                <div className="mt-6">{children}</div>
              </div>
            </div>
          </div>

          {aside ?? <DefaultAuthAside />}
        </div>
      </div>
    </div>
  );
}
