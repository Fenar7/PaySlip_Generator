import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ title, subtitle, children, className }: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f8f8] px-4">
      <div className="w-full max-w-[400px]">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold text-[#1a1a1a]">
            Slip<span className="text-[#dc2626]">wise</span>
          </span>
          <span className="ml-1 text-xs font-medium bg-[#dc2626] text-white px-1.5 py-0.5 rounded">
            One
          </span>
        </div>
        <Card className={cn("shadow-sm border border-[#e5e5e5]", className)}>
          <CardContent className="p-8">
            <h1 className="text-xl font-semibold text-[#1a1a1a] mb-1">{title}</h1>
            {subtitle && <p className="text-sm text-[#666] mb-6">{subtitle}</p>}
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
