import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Insights — SW Intel",
};

const TEASER_CARDS = [
  {
    icon: "🔮",
    title: "Cash Flow Forecast",
    description:
      "Predict upcoming cash inflows and outflows based on invoice patterns and salary cycles.",
  },
  {
    icon: "📈",
    title: "Growth Indicators",
    description:
      "Track month-over-month revenue growth, client acquisition rate, and average deal size.",
  },
  {
    icon: "🎯",
    title: "Collection Efficiency",
    description:
      "Analyze average days-to-payment, overdue rates, and identify slow-paying clients.",
  },
];

export default function InsightsPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Insights
          </h1>
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-[var(--accent)]">
            Beta
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          AI-powered intelligence for smarter financial decisions. Coming soon.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TEASER_CARDS.map((card) => (
          <div
            key={card.title}
            className="relative overflow-hidden rounded-xl border border-[var(--border-soft)] bg-white p-6 shadow-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[var(--surface-soft)] opacity-50" />
            <div className="relative space-y-3">
              <span className="text-3xl" aria-hidden="true">
                {card.icon}
              </span>
              <h3 className="text-base font-semibold text-[var(--foreground)]">
                {card.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {card.description}
              </p>
            </div>
            <div className="relative mt-4">
              <span className="inline-block rounded-md bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                Coming Soon
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
