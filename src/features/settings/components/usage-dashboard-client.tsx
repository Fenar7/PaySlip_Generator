"use client";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface UsageRow {
  label: string;
  current: number;
  limit: number | null;
  unit?: string;
  isBytes?: boolean;
}

interface Props {
  rows: UsageRow[];
  planName: string;
  periodLabel: string;
}

function pct(current: number, limit: number | null): number {
  if (limit === null || limit === 0) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
}

function barColor(p: number): string {
  if (p >= 90) return "bg-red-500";
  if (p >= 70) return "bg-amber-400";
  return "bg-emerald-500";
}

function displayValue(value: number, isBytes?: boolean): string {
  if (isBytes) return formatBytes(value);
  return value.toLocaleString("en-IN");
}

function displayLimit(limit: number | null, isBytes?: boolean): string {
  if (limit === null) return "Unlimited";
  if (isBytes) return formatBytes(limit);
  return limit.toLocaleString("en-IN");
}

export function UsageDashboardClient({ rows, planName, periodLabel }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Billing Period</p>
          <p className="font-medium">{periodLabel}</p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary capitalize">
          {planName} Plan
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const p = pct(row.current, row.limit);
          const isUnlimited = row.limit === null;
          return (
            <div key={row.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{row.label}</span>
                <span className="text-muted-foreground">
                  {displayValue(row.current, row.isBytes)}
                  {" / "}
                  {displayLimit(row.limit, row.isBytes)}
                  {row.unit && !row.isBytes ? ` ${row.unit}` : ""}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                {isUnlimited ? (
                  <div className="h-full w-full bg-emerald-500/20" />
                ) : (
                  <div
                    className={`h-full rounded-full transition-all ${barColor(p)}`}
                    style={{ width: `${p}%` }}
                  />
                )}
              </div>
              {!isUnlimited && p >= 90 && (
                <p className="text-xs text-red-600">
                  You&apos;re at {p}% of your limit.{" "}
                  <a href="/app/settings/billing" className="underline hover:text-red-700">
                    Upgrade your plan
                  </a>{" "}
                  to avoid disruptions.
                </p>
              )}
              {!isUnlimited && p >= 70 && p < 90 && (
                <p className="text-xs text-amber-600">Approaching limit ({p}% used).</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t pt-4 text-center">
        <a
          href="/app/settings/billing"
          className="text-sm text-primary underline hover:text-primary/80"
        >
          Manage Subscription &amp; Compare Plans →
        </a>
      </div>
    </div>
  );
}
