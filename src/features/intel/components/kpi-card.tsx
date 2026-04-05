interface KPICardProps {
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
}

export function KPICard({ icon, label, value, subtitle }: KPICardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--muted-foreground)]">{subtitle}</p>
          )}
        </div>
        <span className="text-2xl" aria-hidden="true">
          {icon}
        </span>
      </div>
    </div>
  );
}
