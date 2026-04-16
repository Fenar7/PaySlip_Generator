import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free Photo Tools",
};

const TOOLS = [
  {
    href: "/pixel/passport",
    icon: "🪪",
    title: "Passport Photo",
    description:
      "Crop, adjust, and print-ready passport & visa photos for 13+ countries.",
    badge: "Free",
  },
];

export default function PixelHubPage() {
  return (
    <div className="space-y-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[#1a1a1a]">
          Free Photo Tools
        </h1>
        <p className="mt-2 text-[#666]">
          Professional-quality photo tools, no account required.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group relative flex flex-col gap-3 rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            {tool.badge && (
              <span className="absolute right-3 top-3 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-emerald-600">
                {tool.badge}
              </span>
            )}
            <span className="text-3xl">{tool.icon}</span>
            <div>
              <p className="font-semibold text-[#1a1a1a] group-hover:text-[#0066cc]">
                {tool.title}
              </p>
              <p className="mt-1 text-sm text-[#666]">{tool.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 text-center">
        <p className="text-sm text-[#666]">
          Need more features like batch processing, team storage, and advanced
          print layouts?
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Link
            href="/auth/signup"
            className="rounded-lg bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white hover:bg-[#333]"
          >
            Sign up free
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-sm font-medium text-[#1a1a1a] hover:bg-[#f5f5f5]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
