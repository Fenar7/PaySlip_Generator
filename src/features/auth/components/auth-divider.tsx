export function AuthDivider({ text = "or" }: { text?: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-[linear-gradient(90deg,transparent,var(--border-soft))]" />
      <span className="rounded-full border border-[var(--border-soft)] bg-white px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)] shadow-[var(--shadow-soft)]">
        {text}
      </span>
      <div className="h-px flex-1 bg-[linear-gradient(90deg,var(--border-soft),transparent)]" />
    </div>
  );
}
