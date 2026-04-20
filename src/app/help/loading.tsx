export default function HelpLoading() {
  return (
    <main className="slipwise-shell-bg min-h-screen px-4 py-12">
      <div className="mx-auto max-w-5xl animate-pulse space-y-6">
        <div className="space-y-3">
          <div className="h-3 w-28 rounded-full bg-[var(--surface-soft)]" />
          <div className="h-10 w-72 rounded-full bg-[var(--surface-soft)]" />
          <div className="h-4 w-[32rem] max-w-full rounded-full bg-[var(--surface-soft)]" />
        </div>
        <div className="slipwise-surface-card rounded-[1.5rem] bg-white p-5">
          <div className="h-12 rounded-xl bg-[var(--surface-soft)]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="slipwise-surface-card rounded-[1.25rem] bg-white p-6">
              <div className="space-y-3">
                <div className="h-5 w-40 rounded-full bg-[var(--surface-soft)]" />
                <div className="h-4 w-full rounded-full bg-[var(--surface-soft)]" />
                <div className="h-4 w-4/5 rounded-full bg-[var(--surface-soft)]" />
                <div className="space-y-2 pt-2">
                  <div className="h-4 w-3/4 rounded-full bg-[var(--surface-soft)]" />
                  <div className="h-4 w-2/3 rounded-full bg-[var(--surface-soft)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
