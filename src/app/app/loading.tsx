export default function AppLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-3 w-32 rounded-full bg-[var(--surface-soft)]" />
          <div className="h-8 w-72 rounded-full bg-[var(--surface-soft)]" />
          <div className="h-4 w-96 max-w-full rounded-full bg-[var(--surface-soft)]" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="slipwise-surface-card h-32 rounded-[1.25rem] bg-white p-5"
            >
              <div className="h-full rounded-[1rem] bg-[var(--surface-soft)]" />
            </div>
          ))}
        </div>

        <div className="slipwise-surface-card rounded-[1.25rem] bg-white p-5">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-12 rounded-xl bg-[var(--surface-soft)]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
