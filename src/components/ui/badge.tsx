import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "soon" | "success" | "warning" | "danger";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.15em]",
        {
          "bg-[var(--surface-soft)] text-[var(--muted-foreground)]": variant === "default",
          "bg-[rgba(156,163,175,0.12)] text-[var(--muted-foreground)]": variant === "soon",
          "bg-green-50 text-green-700": variant === "success",
          "bg-amber-50 text-amber-700": variant === "warning",
          "bg-red-50 text-[var(--accent)]": variant === "danger",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
