import Link from "next/link";
import {
  FileText,
  Receipt,
  Wallet,
  Paintbrush,
  RefreshCcw,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Invoices",
    description:
      "Create professional GST-compliant invoices in seconds with auto-numbering and templates.",
  },
  {
    icon: Receipt,
    title: "Vouchers",
    description:
      "Generate payment, receipt, and journal vouchers with proper accounting formats.",
  },
  {
    icon: Wallet,
    title: "Salary Slips",
    description:
      "Produce detailed salary slips with earnings, deductions, and compliance fields.",
  },
  {
    icon: Paintbrush,
    title: "PDF Studio",
    description:
      "Full-featured PDF editor with watermarks, branding, and bulk export capabilities.",
  },
  {
    icon: RefreshCcw,
    title: "Automation",
    description:
      "Set up recurring invoices and auto-send documents on a schedule.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Track document generation, revenue insights, and team activity at a glance.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-20 text-center sm:pt-32">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Document Operations,{" "}
            <span className="text-red-600">Simplified.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            Create professional invoices, vouchers, and salary slips in seconds.
            Export pixel-perfect PDFs, automate recurring documents, and
            collaborate with your team — all from one platform.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              Start Free
            </Link>
            <Link
              href="/pricing"
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              View Pricing <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Everything you need to manage documents
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-600">
            From creation to delivery, Slipwise handles the entire document
            lifecycle for your business.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                    <Icon className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-600">
            Trusted by businesses
          </p>
          <h2 className="mt-2 text-3xl font-bold text-gray-900">
            Join hundreds of teams using Slipwise
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { stat: "500+", label: "Businesses" },
              { stat: "50,000+", label: "Documents Created" },
              { stat: "99.9%", label: "Uptime" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-4xl font-bold text-gray-900">{item.stat}</p>
                <p className="mt-1 text-sm text-gray-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-gray-600">
            Start free. Upgrade as you grow. No hidden fees.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {["Free forever", "No credit card required", "Cancel anytime"].map(
              (item) => (
                <span
                  key={item}
                  className="flex items-center gap-1 text-sm text-gray-600"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> {item}
                </span>
              ),
            )}
          </div>
          <Link
            href="/pricing"
            className="mt-8 inline-flex items-center gap-1 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-white"
          >
            See all plans <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-red-600 py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-red-100">
            Create your free account and start generating professional documents
            in under 2 minutes.
          </p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-block rounded-lg bg-white px-8 py-3 text-sm font-semibold text-red-600 shadow transition-colors hover:bg-red-50"
          >
            Sign Up Free
          </Link>
        </div>
      </section>
    </>
  );
}
