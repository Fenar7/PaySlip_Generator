export function AuthDivider({ text = "or" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-[#e5e5e5]" />
      <span className="text-xs text-[#999] uppercase tracking-wide">{text}</span>
      <div className="flex-1 h-px bg-[#e5e5e5]" />
    </div>
  );
}
