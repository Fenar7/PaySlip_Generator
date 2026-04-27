import Link from "next/link";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="min-h-screen bg-[#f5f6f7] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-[1.6rem] font-semibold tracking-tight text-gray-900">
              Slip<span className="text-[#dc2626]">wise</span>
            </span>
            <span className="rounded bg-[#dc2626] px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest text-white">
              One
            </span>
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-[1.4rem] font-semibold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
