export function AuthDivider({ text = "or" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-[var(--border-soft)]" />
      <span className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
        {text}
      </span>
      <div className="flex-1 h-px bg-[var(--border-soft)]" />
    </div>
  );
}
