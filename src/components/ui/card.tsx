import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className, hover = false }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border-soft)] bg-white shadow-[var(--shadow-card)] transition-all duration-200",
        hover && "hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5 hover:border-[var(--border-brand)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("border-b border-[var(--border-soft)] px-6 py-4", className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn("px-6 py-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: CardProps) {
  return <h3 className={cn("text-base font-semibold text-[var(--text-primary)]", className)}>{children}</h3>;
}
